/**
 * CSV import (spec §49–§50): a mapping layer over flexible column names
 * (never assumes exact headers), a preview/validate pass that never
 * writes to the database, and a commit pass that imports only valid,
 * non-duplicate rows — invalid and duplicate rows are always excluded,
 * never silently discarded (each is reported with a reason).
 */
import Decimal from "decimal.js";
import { parseCsvToObjects } from "@/lib/csvParse";
import { prisma } from "@/lib/prisma";
import { recordContribution, recordFundPrice } from "@/lib/data/investments";
import { recordMarketIndexObservation } from "@/lib/data/benchmark";
import { recordSavingsTransaction } from "@/lib/data/savings";
import { createStudySession } from "@/lib/data/career";
import { contributionSchema, fundPriceSchema } from "@/lib/validation/investments";
import { marketIndexSchema } from "@/lib/validation/benchmark";
import { savingsTransactionSchema } from "@/lib/validation/savings";
import { studySessionSchema } from "@/lib/validation/career";

export type ImportType =
  | "investment_contributions"
  | "fund_prices"
  | "lasi_observations"
  | "savings_transactions"
  | "study_sessions";

export type RowStatus = "valid" | "duplicate" | "invalid";

export interface PreviewRow {
  rowNumber: number; // 1-indexed, matching the CSV's data rows (header excluded)
  raw: Record<string, string>;
  status: RowStatus;
  reason?: string;
  parsed?: Record<string, unknown>;
}

export interface ImportPreview {
  headers: string[];
  rows: PreviewRow[];
  validCount: number;
  duplicateCount: number;
  invalidCount: number;
}

export interface ImportSummary {
  rowsDetected: number;
  rowsImported: number;
  rowsSkippedDuplicate: number;
  rowsSkippedInvalid: number;
}

/** Column-name aliases so a real-world export doesn't have to match our
 *  exact field names (spec §50 — "a mapping layer rather than assuming
 *  exact column names"). Matching is case-insensitive and ignores
 *  spaces/underscores. */
const COLUMN_ALIASES: Record<string, string[]> = {
  date: ["date", "transaction date", "purchase date", "contribution date"],
  amount: ["amount", "contribution", "contribution amount", "deposit"],
  unitPrice: ["unitprice", "unit price", "price", "price per unit"],
  fees: ["fees", "fee"],
  source: ["source"],
  notes: ["notes", "note"],
  level: ["level", "index level", "lasi", "lasi level"],
  type: ["type", "transaction type"],
  hours: ["hours", "study hours"],
  questionsCompleted: ["questionscompleted", "questions completed", "questions"],
  topic: ["topic"],
  mockScorePercent: ["mockscorepercent", "mock score", "mock score %", "mock score percent"],
  examName: ["exam", "exam name"],
};

export function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[\s_]+/g, "");
}

export function resolveColumns(headers: string[]): Map<string, string> {
  const normalized = headers.map((h) => [h, normalizeHeader(h)] as const);
  const resolved = new Map<string, string>();
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    const normalizedAliases = aliases.map(normalizeHeader);
    const match = normalized.find(([, n]) => normalizedAliases.includes(n));
    if (match) resolved.set(field, match[0]);
  }
  return resolved;
}

function getField(row: Record<string, string>, columns: Map<string, string>, field: string): string {
  const header = columns.get(field);
  return header ? (row[header] ?? "").trim() : "";
}

// ---------------------------------------------------------------------------
// Investment contributions
// ---------------------------------------------------------------------------

async function previewContributions(rows: Record<string, string>[], columns: Map<string, string>, fundId: string): Promise<PreviewRow[]> {
  const existing = await prisma.contribution.findMany({
    where: { fundId },
    select: { date: true, amount: true, unitPriceAtPurchase: true },
  });
  const existingKeys = new Set(
    existing.map((e) => `${e.date.toISOString().slice(0, 10)}|${e.amount.toString()}|${e.unitPriceAtPurchase.toString()}`)
  );
  const seenInBatch = new Set<string>();

  return rows.map((raw, idx) => {
    const date = getField(raw, columns, "date");
    const amount = getField(raw, columns, "amount");
    const unitPrice = getField(raw, columns, "unitPrice");
    const fees = getField(raw, columns, "fees") || "0";
    const source = getField(raw, columns, "source") || undefined;
    const notes = getField(raw, columns, "notes") || undefined;

    const parsed = contributionSchema.safeParse({ fundId, date, amount, unitPriceAtPurchase: unitPrice, fees, source, notes });
    if (!parsed.success) {
      return { rowNumber: idx + 1, raw, status: "invalid", reason: parsed.error.issues.map((i) => i.message).join("; ") };
    }
    if (isNaN(parsed.data.date.getTime())) {
      return { rowNumber: idx + 1, raw, status: "invalid", reason: "Invalid date." };
    }

    const key = `${parsed.data.date.toISOString().slice(0, 10)}|${new Decimal(parsed.data.amount).toString()}|${new Decimal(parsed.data.unitPriceAtPurchase).toString()}`;
    if (existingKeys.has(key) || seenInBatch.has(key)) {
      return { rowNumber: idx + 1, raw, status: "duplicate", reason: "A contribution with this fund, date, amount and price already exists." };
    }
    seenInBatch.add(key);

    return { rowNumber: idx + 1, raw, status: "valid", parsed: parsed.data };
  });
}

// ---------------------------------------------------------------------------
// Fund unit prices
// ---------------------------------------------------------------------------

async function previewFundPrices(rows: Record<string, string>[], columns: Map<string, string>, fundId: string): Promise<PreviewRow[]> {
  const existing = await prisma.fundPrice.findMany({ where: { fundId }, select: { date: true, unitPrice: true } });
  const existingKeys = new Set(existing.map((e) => `${e.date.toISOString().slice(0, 10)}|${e.unitPrice.toString()}`));
  const seenInBatch = new Set<string>();

  return rows.map((raw, idx) => {
    const date = getField(raw, columns, "date");
    const unitPrice = getField(raw, columns, "unitPrice");
    const source = getField(raw, columns, "source") || "CSV import";
    const notes = getField(raw, columns, "notes") || undefined;

    const parsed = fundPriceSchema.safeParse({
      fundId,
      date,
      unitPrice,
      source,
      sourceType: "MANUAL",
      verificationStatus: "UNVERIFIED",
      notes,
    });
    if (!parsed.success) {
      return { rowNumber: idx + 1, raw, status: "invalid", reason: parsed.error.issues.map((i) => i.message).join("; ") };
    }
    if (isNaN(parsed.data.date.getTime())) {
      return { rowNumber: idx + 1, raw, status: "invalid", reason: "Invalid date." };
    }

    const key = `${parsed.data.date.toISOString().slice(0, 10)}|${new Decimal(parsed.data.unitPrice).toString()}`;
    if (existingKeys.has(key) || seenInBatch.has(key)) {
      return { rowNumber: idx + 1, raw, status: "duplicate", reason: "A price observation with this fund, date and price already exists." };
    }
    seenInBatch.add(key);

    return { rowNumber: idx + 1, raw, status: "valid", parsed: parsed.data };
  });
}

// ---------------------------------------------------------------------------
// LASI (market index) observations
// ---------------------------------------------------------------------------

async function previewLasiObservations(rows: Record<string, string>[], columns: Map<string, string>): Promise<PreviewRow[]> {
  const existing = await prisma.marketIndex.findMany({ where: { code: "LASI" }, select: { date: true, level: true } });
  const existingKeys = new Set(existing.map((e) => `${e.date.toISOString().slice(0, 10)}|${e.level.toString()}`));
  const seenInBatch = new Set<string>();

  return rows.map((raw, idx) => {
    const date = getField(raw, columns, "date");
    const level = getField(raw, columns, "level");
    const source = getField(raw, columns, "source") || "CSV import";

    const parsed = marketIndexSchema.safeParse({ code: "LASI", name: "LuSE All Share Index", date, level, source });
    if (!parsed.success) {
      return { rowNumber: idx + 1, raw, status: "invalid", reason: parsed.error.issues.map((i) => i.message).join("; ") };
    }
    if (isNaN(parsed.data.date.getTime())) {
      return { rowNumber: idx + 1, raw, status: "invalid", reason: "Invalid date." };
    }

    const key = `${parsed.data.date.toISOString().slice(0, 10)}|${new Decimal(parsed.data.level).toString()}`;
    if (existingKeys.has(key) || seenInBatch.has(key)) {
      return { rowNumber: idx + 1, raw, status: "duplicate", reason: "A LASI observation with this date and level already exists." };
    }
    seenInBatch.add(key);

    return { rowNumber: idx + 1, raw, status: "valid", parsed: parsed.data };
  });
}

// ---------------------------------------------------------------------------
// Savings transactions
// ---------------------------------------------------------------------------

async function previewSavingsTransactions(rows: Record<string, string>[], columns: Map<string, string>, accountId: string): Promise<PreviewRow[]> {
  const existing = await prisma.savingsTransaction.findMany({
    where: { accountId },
    select: { date: true, type: true, amount: true },
  });
  const existingKeys = new Set(existing.map((e) => `${e.date.toISOString().slice(0, 10)}|${e.type}|${e.amount.toString()}`));
  const seenInBatch = new Set<string>();

  return rows.map((raw, idx) => {
    const date = getField(raw, columns, "date");
    const type = (getField(raw, columns, "type") || "deposit").toLowerCase();
    const amount = getField(raw, columns, "amount");
    const source = getField(raw, columns, "source") || undefined;
    const notes = getField(raw, columns, "notes") || undefined;

    const parsed = savingsTransactionSchema.safeParse({ accountId, date, type, amount, source, notes });
    if (!parsed.success) {
      return { rowNumber: idx + 1, raw, status: "invalid", reason: parsed.error.issues.map((i) => i.message).join("; ") };
    }
    if (isNaN(parsed.data.date.getTime())) {
      return { rowNumber: idx + 1, raw, status: "invalid", reason: "Invalid date." };
    }

    const key = `${parsed.data.date.toISOString().slice(0, 10)}|${parsed.data.type}|${new Decimal(parsed.data.amount).toString()}`;
    if (existingKeys.has(key) || seenInBatch.has(key)) {
      return { rowNumber: idx + 1, raw, status: "duplicate", reason: "A transaction with this account, date, type and amount already exists." };
    }
    seenInBatch.add(key);

    return { rowNumber: idx + 1, raw, status: "valid", parsed: parsed.data };
  });
}

// ---------------------------------------------------------------------------
// Study sessions
// ---------------------------------------------------------------------------

async function previewStudySessions(rows: Record<string, string>[], columns: Map<string, string>, userId: string): Promise<PreviewRow[]> {
  const exams = await prisma.exam.findMany({ where: { userId }, select: { id: true, name: true } });
  const examByName = new Map(exams.map((e) => [e.name.toLowerCase(), e.id]));

  const existing = await prisma.studySession.findMany({
    where: { userId },
    select: { date: true, hours: true, topic: true },
  });
  const existingKeys = new Set(existing.map((e) => `${e.date.toISOString().slice(0, 10)}|${e.hours.toString()}|${(e.topic ?? "").toLowerCase()}`));
  const seenInBatch = new Set<string>();

  return rows.map((raw, idx) => {
    const date = getField(raw, columns, "date");
    const hours = getField(raw, columns, "hours");
    const questionsCompleted = getField(raw, columns, "questionsCompleted") || "0";
    const topic = getField(raw, columns, "topic") || undefined;
    const mockScorePercent = getField(raw, columns, "mockScorePercent") || undefined;
    const examName = getField(raw, columns, "examName");
    const examId = examName ? examByName.get(examName.toLowerCase()) : undefined;

    const parsed = studySessionSchema.safeParse({ examId, date, hours, questionsCompleted, topic, mockScorePercent });
    if (!parsed.success) {
      return { rowNumber: idx + 1, raw, status: "invalid", reason: parsed.error.issues.map((i) => i.message).join("; ") };
    }
    if (isNaN(parsed.data.date.getTime())) {
      return { rowNumber: idx + 1, raw, status: "invalid", reason: "Invalid date." };
    }
    if (examName && !examId) {
      return { rowNumber: idx + 1, raw, status: "invalid", reason: `No exam named "${examName}" found — add it first or leave the column blank.` };
    }

    const key = `${parsed.data.date.toISOString().slice(0, 10)}|${new Decimal(parsed.data.hours).toString()}|${(parsed.data.topic ?? "").toLowerCase()}`;
    if (existingKeys.has(key) || seenInBatch.has(key)) {
      return { rowNumber: idx + 1, raw, status: "duplicate", reason: "A study session with this date, hours and topic already exists." };
    }
    seenInBatch.add(key);

    return { rowNumber: idx + 1, raw, status: "valid", parsed: parsed.data };
  });
}

// ---------------------------------------------------------------------------
// Public entry points
// ---------------------------------------------------------------------------

export interface ImportContext {
  userId: string;
  fundId?: string;
  accountId?: string;
}

export async function previewImport(type: ImportType, csvText: string, ctx: ImportContext): Promise<ImportPreview> {
  const { headers, rows } = parseCsvToObjects(csvText);
  const columns = resolveColumns(headers);

  let previewRows: PreviewRow[];
  switch (type) {
    case "investment_contributions":
      if (!ctx.fundId) throw new Error("A fund must be selected for this import type.");
      previewRows = await previewContributions(rows, columns, ctx.fundId);
      break;
    case "fund_prices":
      if (!ctx.fundId) throw new Error("A fund must be selected for this import type.");
      previewRows = await previewFundPrices(rows, columns, ctx.fundId);
      break;
    case "lasi_observations":
      previewRows = await previewLasiObservations(rows, columns);
      break;
    case "savings_transactions":
      if (!ctx.accountId) throw new Error("A savings account must be selected for this import type.");
      previewRows = await previewSavingsTransactions(rows, columns, ctx.accountId);
      break;
    case "study_sessions":
      previewRows = await previewStudySessions(rows, columns, ctx.userId);
      break;
  }

  return {
    headers,
    rows: previewRows,
    validCount: previewRows.filter((r) => r.status === "valid").length,
    duplicateCount: previewRows.filter((r) => r.status === "duplicate").length,
    invalidCount: previewRows.filter((r) => r.status === "invalid").length,
  };
}

export async function commitImport(type: ImportType, csvText: string, ctx: ImportContext): Promise<ImportSummary> {
  const preview = await previewImport(type, csvText, ctx);
  const validRows = preview.rows.filter((r) => r.status === "valid");

  let imported = 0;
  for (const row of validRows) {
    const data = row.parsed!;
    switch (type) {
      case "investment_contributions":
        await recordContribution(ctx.userId, data as Parameters<typeof recordContribution>[1]);
        break;
      case "fund_prices":
        await recordFundPrice(ctx.userId, data as Parameters<typeof recordFundPrice>[1]);
        break;
      case "lasi_observations":
        await recordMarketIndexObservation(ctx.userId, data as Parameters<typeof recordMarketIndexObservation>[1]);
        break;
      case "savings_transactions":
        await recordSavingsTransaction(ctx.userId, data as Parameters<typeof recordSavingsTransaction>[1]);
        break;
      case "study_sessions":
        await createStudySession(ctx.userId, data as Parameters<typeof createStudySession>[1]);
        break;
    }
    imported += 1;
  }

  return {
    rowsDetected: preview.rows.length,
    rowsImported: imported,
    rowsSkippedDuplicate: preview.duplicateCount,
    rowsSkippedInvalid: preview.invalidCount,
  };
}

import Decimal from "decimal.js";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/data/auditLog";
import {
  calculateBenchmarkIndex,
  calculateDividendAdjustedIndex,
  calculateBenchmarkGap,
  classifyBenchmarkGap,
  type BenchmarkVerdict,
} from "@/lib/calculations/benchmark";
import type { MarketIndexInput } from "@/lib/validation/benchmark";

export async function recordMarketIndexObservation(userId: string, input: MarketIndexInput) {
  const row = await prisma.marketIndex.create({
    data: {
      code: input.code,
      name: input.name,
      date: input.date,
      level: input.level,
      source: input.source,
      sourceType: "THIRD_PARTY",
    },
  });
  await writeAuditLog({
    userId,
    action: "marketIndex.recorded",
    entityType: "MarketIndex",
    entityId: row.id,
    newValue: { code: input.code, date: input.date.toISOString(), level: input.level, source: input.source },
  });
  return row;
}

export interface BenchmarkRow {
  date: Date;
  fundPrice: Decimal;
  indexLevel: Decimal;
  fundIndex: Decimal;
  indexIndexPriceOnly: Decimal;
  rawGap: Decimal;
  dividendAdjustedIndex: Decimal;
  fairGap: Decimal;
  verdict: BenchmarkVerdict;
}

/**
 * Builds the rebased comparison table (spec §21–§26). Fund price
 * observations are the timeline's backbone; each is paired with the most
 * recent LASI observation on or before that date (forward-filled — the
 * two series are rarely recorded on identical dates in practice). Rows
 * before the first available paired index observation are dropped rather
 * than guessed.
 */
export async function buildBenchmarkSeries(params: {
  fundId: string;
  indexCode: string;
  dividendYieldPercent: Decimal.Value;
  startDate?: Date;
}): Promise<BenchmarkRow[]> {
  const { fundId, indexCode, dividendYieldPercent, startDate } = params;

  const fundPrices = await prisma.fundPrice.findMany({
    where: { fundId, ...(startDate ? { date: { gte: startDate } } : {}) },
    orderBy: { date: "asc" },
  });
  const indexLevels = await prisma.marketIndex.findMany({
    where: { code: indexCode },
    orderBy: { date: "asc" },
  });

  if (fundPrices.length === 0 || indexLevels.length === 0) return [];

  const paired: { date: Date; fundPrice: Decimal; indexLevel: Decimal }[] = [];
  for (const fp of fundPrices) {
    // Most recent index observation at or before this fund price's date.
    let candidate: (typeof indexLevels)[number] | null = null;
    for (const idx of indexLevels) {
      if (idx.date <= fp.date) candidate = idx;
      else break;
    }
    if (!candidate) continue;
    paired.push({ date: fp.date, fundPrice: new Decimal(fp.unitPrice), indexLevel: new Decimal(candidate.level) });
  }

  if (paired.length === 0) return [];

  const base = paired[0];
  const rows: BenchmarkRow[] = paired.map((p) => {
    const fundIndex = calculateBenchmarkIndex(p.fundPrice, base.fundPrice);
    const indexIndexPriceOnly = calculateBenchmarkIndex(p.indexLevel, base.indexLevel);
    const rawGap = calculateBenchmarkGap(fundIndex, indexIndexPriceOnly);
    const daysElapsed = (p.date.getTime() - base.date.getTime()) / (24 * 60 * 60 * 1000);
    const dividendAdjustedIndex = calculateDividendAdjustedIndex({
      priceRebasedIndex: indexIndexPriceOnly,
      estimatedAnnualYieldPercent: dividendYieldPercent,
      daysElapsedSinceStart: daysElapsed,
    });
    const fairGap = calculateBenchmarkGap(fundIndex, dividendAdjustedIndex);
    return {
      date: p.date,
      fundPrice: p.fundPrice,
      indexLevel: p.indexLevel,
      fundIndex,
      indexIndexPriceOnly,
      rawGap,
      dividendAdjustedIndex,
      fairGap,
      verdict: classifyBenchmarkGap(fairGap),
    };
  });

  return rows;
}

/**
 * Turns a DataConflict/AuditLog's raw entityType/field pair (e.g.
 * "InvestmentFund" / "twelveMonthReturnPercent") into user-facing text.
 * These fields are internal schema identifiers used for the generic
 * DataObservation/DataConflict model (spec §16-17) — never meant to be
 * read by a user directly, but the UI was rendering them raw.
 */
import { prisma } from "@/lib/prisma";

const FIELD_LABELS: Record<string, string> = {
  twelveMonthReturnPercent: "12-month return",
  unitPrice: "unit price",
  annualFeePercent: "annual fee",
  earlyWithdrawalPenaltyPercent: "early withdrawal penalty",
  minimumHoldingMonths: "minimum holding period",
};

export function humanizeField(field: string): string {
  if (FIELD_LABELS[field]) return FIELD_LABELS[field];
  // Fallback: camelCase -> "camel case" for any field not in the table
  // above, so a future field never renders as raw camelCase either.
  return field.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase();
}

/** Resolves entityType + entityId to a human-readable name (e.g. the
 *  fund's actual name), falling back to a de-camelCased entity type. */
export async function describeConflictEntity(entityType: string, entityId: string): Promise<string> {
  if (entityType === "InvestmentFund") {
    const fund = await prisma.investmentFund.findUnique({
      where: { id: entityId },
      select: { name: true },
    });
    if (fund) return fund.name;
  }
  return entityType.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
}

export async function describeConflictField(entityType: string, entityId: string, field: string): Promise<string> {
  const entity = await describeConflictEntity(entityType, entityId);
  return `${entity} — ${humanizeField(field)}`;
}

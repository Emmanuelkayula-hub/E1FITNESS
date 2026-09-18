/**
 * Longhorn-style lock-in engine (spec §12–§14).
 *
 * The number of months a contribution is locked for is a *planning
 * assumption*, not a verified fact — see LockMethodology in the Prisma
 * schema and /docs/ASSUMPTIONS.md, "Question 1: does the 12-month lock
 * restart per deposit?". Default is PER_CONTRIBUTION; every unlock date
 * this module produces should be displayed with a
 * "confirm with Longhorn" caveat until the user marks it resolved.
 */
import Decimal from "decimal.js";
import type { Numeric } from "./finance";

export type LockMethodology =
  | "PER_CONTRIBUTION"
  | "FROM_FIRST_INVESTMENT"
  | "CUSTOM"
  | "UNKNOWN";

/**
 * Adds `months` calendar months to `date`, clamping to the last day of the
 * target month when the source day doesn't exist there (e.g. 31 Jan + 1mo
 * -> 28/29 Feb, not 3 Mar). Handles leap years via native Date arithmetic.
 */
export function addMonthsClamped(date: Date, months: number): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const day = date.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + months);
  const daysInTargetMonth = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)
  ).getUTCDate();
  d.setUTCDate(Math.min(day, daysInTargetMonth));
  return d;
}

export interface UnlockDateParams {
  contributionDate: Date;
  firstInvestmentDate: Date;
  minimumHoldingMonths: number;
  methodology: LockMethodology;
}

/**
 * Per spec §12:
 *  - PER_CONTRIBUTION: each lot unlocks `minimumHoldingMonths` after its
 *    own contribution date (the default planning assumption).
 *  - FROM_FIRST_INVESTMENT: every lot unlocks `minimumHoldingMonths` after
 *    the very first contribution to the fund.
 *  - CUSTOM / UNKNOWN: caller must supply their own date; this function
 *    returns null so the UI can render "awaiting confirmation" rather than
 *    a fabricated date.
 */
export function calculateUnlockDate(params: UnlockDateParams): Date | null {
  const { contributionDate, firstInvestmentDate, minimumHoldingMonths, methodology } =
    params;
  switch (methodology) {
    case "PER_CONTRIBUTION":
      return addMonthsClamped(contributionDate, minimumHoldingMonths);
    case "FROM_FIRST_INVESTMENT":
      return addMonthsClamped(firstInvestmentDate, minimumHoldingMonths);
    case "CUSTOM":
    case "UNKNOWN":
    default:
      return null;
  }
}

export type LotLiquidityState =
  | "LOCKED"
  | "UNLOCKING_SOON"
  | "UNLOCKED"
  | "UNKNOWN";

/** "Unlocking soon" = within the next 30 days, matching the calendar's default filter (spec §13). */
export function classifyLotLiquidity(
  unlockDate: Date | null,
  asOf: Date,
  soonWindowDays = 30
): LotLiquidityState {
  if (!unlockDate) return "UNKNOWN";
  const msRemaining = unlockDate.getTime() - asOf.getTime();
  if (msRemaining <= 0) return "UNLOCKED";
  const daysRemaining = msRemaining / (24 * 60 * 60 * 1000);
  return daysRemaining <= soonWindowDays ? "UNLOCKING_SOON" : "LOCKED";
}

export interface EarlyWithdrawalEstimate {
  grossValue: Decimal;
  penaltyAmount: Decimal;
  amountAfterPenalty: Decimal;
  gainLossBeforePenalty: Decimal;
  gainLossAfterPenalty: Decimal;
}

/**
 * Early withdrawal estimate (spec §14). Penalty is applied to the gross
 * current value, matching the fact-sheet description of a 5% early
 * withdrawal penalty (not a penalty on gains only) — flagged as an
 * assumption in /docs/ASSUMPTIONS.md since Longhorn has not confirmed the
 * penalty base in writing.
 */
export function calculateEarlyWithdrawalEstimate(params: {
  units: Numeric;
  currentUnitPrice: Numeric;
  totalContributed: Numeric;
  penaltyPercent: Numeric;
}): EarlyWithdrawalEstimate {
  const { units, currentUnitPrice, totalContributed, penaltyPercent } = params;
  const grossValue = new Decimal(units).times(currentUnitPrice);
  const penaltyRate = new Decimal(penaltyPercent).dividedBy(100);
  const penaltyAmount = grossValue.times(penaltyRate);
  const amountAfterPenalty = grossValue.minus(penaltyAmount);
  const contributed = new Decimal(totalContributed);
  return {
    grossValue,
    penaltyAmount,
    amountAfterPenalty,
    gainLossBeforePenalty: grossValue.minus(contributed),
    gainLossAfterPenalty: amountAfterPenalty.minus(contributed),
  };
}

/**
 * Internship contribution-allocation engine (spec §30–§31, §42).
 *
 * `runMonthByMonthProjection` reproduces the exact recursion in
 * `Month by Month!D5:G16` of internship-12-month-plan.xlsx: equity grows
 * annuity-due style (calculateFutureValue's convention — see
 * ASSUMPTIONS.md for the annuity-due vs ordinary-annuity discrepancy
 * discovered between workbook tabs), and savings grows via the tiered
 * monthly interest in lib/calculations/savings.ts.
 */
import Decimal from "decimal.js";
import type { Numeric } from "./finance";
import { findSavingsTier, type SavingsTierBand } from "./savings";

export interface ContributionPhase {
  monthStart: number; // 1-indexed, inclusive
  monthEnd: number; // inclusive
  equityAmount: Numeric;
  savingsAmount: Numeric;
}

export interface MonthProjection {
  month: number;
  equityIn: Decimal;
  savingsIn: Decimal;
  equityValue: Decimal;
  savingsTierPercent: Decimal | null;
  savingsValue: Decimal;
  total: Decimal;
  contributedToDate: Decimal;
}

function phaseForMonth(phases: ContributionPhase[], month: number): ContributionPhase | null {
  return phases.find((p) => month >= p.monthStart && month <= p.monthEnd) ?? null;
}

export function runMonthByMonthProjection(params: {
  phases: ContributionPhase[];
  totalMonths: number;
  annualEquityReturnPercent: Numeric;
  savingsBands: SavingsTierBand[];
}): MonthProjection[] {
  const { phases, totalMonths, annualEquityReturnPercent, savingsBands } = params;
  const equityMonthlyRate = new Decimal(annualEquityReturnPercent).dividedBy(100).dividedBy(12);

  const rows: MonthProjection[] = [];
  let equityValue = new Decimal(0);
  let savingsValue = new Decimal(0);
  let contributedToDate = new Decimal(0);

  for (let month = 1; month <= totalMonths; month++) {
    const phase = phaseForMonth(phases, month);
    const equityIn = new Decimal(phase?.equityAmount ?? 0);
    const savingsIn = new Decimal(phase?.savingsAmount ?? 0);

    equityValue = equityValue.plus(equityIn).times(new Decimal(1).plus(equityMonthlyRate));

    const tier = findSavingsTier(savingsValue.plus(savingsIn), savingsBands);
    const tierRate = tier ? new Decimal(tier.annualRatePercent).dividedBy(100).dividedBy(12) : null;
    savingsValue = savingsValue.plus(savingsIn).times(new Decimal(1).plus(tierRate ?? 0));

    contributedToDate = contributedToDate.plus(equityIn).plus(savingsIn);

    rows.push({
      month,
      equityIn,
      savingsIn,
      equityValue,
      savingsTierPercent: tier ? new Decimal(tier.annualRatePercent) : null,
      savingsValue,
      total: equityValue.plus(savingsValue),
      contributedToDate,
    });
  }

  return rows;
}

export type IncomeAllocationRule = "OK" | "SURVIVAL_FIRST";

export interface IncomeAllocationResult {
  equity: Decimal;
  savings: Decimal;
  equityShare: Decimal;
  rule: IncomeAllocationRule;
}

/**
 * Income-change engine (spec §31). The source workbook's "If Income
 * Changes" tab is hand-picked scenario data, not a derived formula — its
 * own rows deliberately break their usual 70/30-ish ratio once the total
 * gets small (row 11: K300 allocable -> K100 equity / K200 savings, NOT
 * a proportional 70/30 split), and label that "RULE SUSPENDED - survival
 * first". This function makes that explicit and configurable instead of
 * an implicit result of proportional math:
 *
 *  - At/above `survivalThreshold`, split proportionally to
 *    `referenceEquityShare` (the ratio from the user's own plan).
 *  - Below it, floor equity at `minimumEquityFloor` ("never drop below
 *    the K100 equity minimum — the habit is worth more than the
 *    kwacha", `If Income Changes!A20`) and route the remainder to
 *    savings ("cut equity before savings... liquidity beats growth
 *    during a squeeze", `A21`).
 *
 * `rule` reports which branch fired, and is also true to the workbook's
 * own OK/SUSPENDED check (equity share vs. savings share) for display.
 */
export function allocateIncome(params: {
  monthlyAllocable: Numeric;
  referenceEquityShare: Numeric; // e.g. 0.7 for a 700/300 plan
  survivalThreshold?: Numeric; // below this, apply the floor instead of proportional split
  minimumEquityFloor?: Numeric;
}): IncomeAllocationResult {
  const {
    monthlyAllocable,
    referenceEquityShare,
    survivalThreshold = 400,
    minimumEquityFloor = 100,
  } = params;
  const allocable = new Decimal(monthlyAllocable);
  const share = new Decimal(referenceEquityShare);

  if (allocable.lte(0)) {
    return { equity: new Decimal(0), savings: new Decimal(0), equityShare: new Decimal(0), rule: "SURVIVAL_FIRST" };
  }

  let equity: Decimal;
  let savings: Decimal;

  if (allocable.gte(survivalThreshold)) {
    equity = allocable.times(share);
    savings = allocable.minus(equity);
  } else {
    equity = Decimal.min(new Decimal(minimumEquityFloor), allocable);
    savings = allocable.minus(equity);
  }

  const rule: IncomeAllocationRule = equity.gt(savings) ? "OK" : "SURVIVAL_FIRST";

  return {
    equity,
    savings,
    equityShare: equity.dividedBy(allocable),
    rule,
  };
}

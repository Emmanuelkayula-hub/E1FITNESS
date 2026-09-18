/**
 * FNB Savings Pocket tier logic and emergency-fund coverage (spec §27–§29).
 *
 * Tier boundaries match the "Savings" sheet in the user's starter tracker
 * workbook exactly:
 *   K100–K249: 3%   K250–K499: 3.5%   K500–K999: 4%   K1,000+: 5%
 * These are USER-entered assumptions, not a bank rate feed — store them
 * via SavingsRate rows (with source + verificationStatus) rather than
 * hardcoding, so the user can correct them without a code change.
 */
import Decimal from "decimal.js";
import type { Numeric } from "./finance";

export interface SavingsTierBand {
  min: Numeric;
  max: Numeric | null; // null = open-ended top tier
  annualRatePercent: Numeric;
}

/** Returns the matching band for a balance, or null if below every band's minimum. */
export function findSavingsTier(
  balance: Numeric,
  bands: SavingsTierBand[]
): SavingsTierBand | null {
  const bal = new Decimal(balance);
  // Sort descending by min so the highest qualifying tier wins ties.
  const sorted = [...bands].sort((a, b) =>
    new Decimal(b.min).minus(new Decimal(a.min)).toNumber()
  );
  for (const band of sorted) {
    const min = new Decimal(band.min);
    const max = band.max === null ? null : new Decimal(band.max);
    if (bal.gte(min) && (max === null || bal.lte(max))) {
      return band;
    }
  }
  return null;
}

/**
 * Opening balance + deposits + interest = closing balance (spec §28).
 * Interest is compounded monthly on the running balance using whatever
 * tier the balance falls into at that point in time — matching the
 * workbook's IF-ladder in `Month by Month!E5`.
 */
export function calculateMonthlySavingsInterest(
  balance: Numeric,
  bands: SavingsTierBand[]
): Decimal {
  const tier = findSavingsTier(balance, bands);
  if (!tier) return new Decimal(0);
  const monthlyRate = new Decimal(tier.annualRatePercent).dividedBy(100).dividedBy(12);
  return new Decimal(balance).times(monthlyRate);
}

export interface EmergencyFundCoverage {
  target: Decimal;
  currentSavings: Decimal;
  percentageFunded: Decimal; // 0-100+, uncapped so "150% funded" is meaningful
  monthsCovered: Decimal;
}

/** Emergency fund target = Monthly essential expenses × target months (spec §29). */
export function calculateEmergencyFundCoverage(params: {
  currentSavings: Numeric;
  monthlyEssentialExpenses: Numeric;
  targetMonths: Numeric;
}): EmergencyFundCoverage {
  const { currentSavings, monthlyEssentialExpenses, targetMonths } = params;
  const essentials = new Decimal(monthlyEssentialExpenses);
  const target = essentials.times(targetMonths);
  const savings = new Decimal(currentSavings);
  const percentageFunded = target.eq(0)
    ? new Decimal(0)
    : savings.dividedBy(target).times(100);
  const monthsCovered = essentials.eq(0) ? new Decimal(0) : savings.dividedBy(essentials);
  return { target, currentSavings: savings, percentageFunded, monthsCovered };
}

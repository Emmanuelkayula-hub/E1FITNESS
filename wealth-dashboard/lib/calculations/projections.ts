/**
 * Deterministic scenario engine (spec §32–§34). Formulas mirror the "Fee
 * Comparison" and "Projections" sheets: a fee is modelled as a straight
 * annual drag on the gross return (i.e. netRate = grossRate - feeRate),
 * which is how a Total Expense Ratio behaves in practice, and is the
 * explicit assumption documented on `Fee Comparison!A28` in the source
 * workbook. It is not a claim about how Longhorn actually charges the fee
 * (annual vs. embedded in the unit price) — see /docs/ASSUMPTIONS.md.
 */
import Decimal from "decimal.js";
import type { Numeric } from "./finance";
import { calculateFutureValue, calculateRealValue } from "./finance";

export interface ScenarioInputs {
  monthlyContribution: Numeric;
  initialInvestment: Numeric;
  annualNominalReturnPercent: Numeric;
  annualFeePercent: Numeric;
  inflationPercent: Numeric;
  contributionGrowthPercent: Numeric; // annual % growth applied to the monthly contribution each year
  horizonYears: number;
  /** Flat average annual rate for the savings side of the scenario — a
   *  planning simplification distinct from the tiered ledger used by the
   *  Savings module (lib/calculations/savings.ts), which tracks the
   *  user's real FNB balance against its actual tier boundaries. */
  savingsRatePercent: Numeric;
  startingSavings: Numeric;
  monthlySavingsContribution: Numeric;
}

export interface ScenarioOutputs {
  totalContributions: Decimal;
  nominalPortfolioValue: Decimal;
  investmentGrowth: Decimal;
  feesPaid: Decimal;
  realPortfolioValue: Decimal;
  savingsBalance: Decimal;
}

/**
 * Runs the scenario month-by-month rather than with a single closed-form
 * annuity, because contribution growth (applied once per anniversary
 * year) makes the contribution stream non-level. Fees are modelled by
 * running the FV annuity for the fee-adjusted rate over the whole period
 * (matching the workbook), applied cumulatively year over year so
 * contribution growth still compounds correctly.
 */
export function runScenario(inputs: ScenarioInputs): ScenarioOutputs {
  const {
    monthlyContribution,
    initialInvestment,
    annualNominalReturnPercent,
    annualFeePercent,
    inflationPercent,
    contributionGrowthPercent,
    horizonYears,
    savingsRatePercent,
    startingSavings,
    monthlySavingsContribution,
  } = inputs;

  const grossRate = new Decimal(annualNominalReturnPercent).dividedBy(100);
  const feeRate = new Decimal(annualFeePercent).dividedBy(100);
  const netRate = grossRate.minus(feeRate);
  const growthRate = new Decimal(contributionGrowthPercent).dividedBy(100);

  let portfolioGross = new Decimal(initialInvestment); // no-fee comparator, for feesPaid
  let portfolioNet = new Decimal(initialInvestment);
  let totalContributions = new Decimal(initialInvestment);
  let contribution = new Decimal(monthlyContribution);
  let savingsBalance = new Decimal(startingSavings);
  const savingsMonthlyRate = new Decimal(savingsRatePercent).dividedBy(100).dividedBy(12);

  for (let year = 0; year < horizonYears; year++) {
    const grossFvThisYear = calculateFutureValue({
      monthlyContribution: contribution,
      annualNominalRate: grossRate,
      months: 12,
    });
    const netFvThisYear = calculateFutureValue({
      monthlyContribution: contribution,
      annualNominalRate: netRate,
      months: 12,
    });

    portfolioGross = portfolioGross.times(new Decimal(1).plus(grossRate)).plus(grossFvThisYear);
    portfolioNet = portfolioNet.times(new Decimal(1).plus(netRate)).plus(netFvThisYear);
    totalContributions = totalContributions.plus(contribution.times(12));

    for (let m = 0; m < 12; m++) {
      savingsBalance = savingsBalance
        .plus(monthlySavingsContribution)
        .times(new Decimal(1).plus(savingsMonthlyRate));
    }

    contribution = contribution.times(new Decimal(1).plus(growthRate));
  }

  const feesPaid = portfolioGross.minus(portfolioNet);
  const realPortfolioValue = calculateRealValue(portfolioNet, inflationPercent, horizonYears);

  return {
    totalContributions,
    nominalPortfolioValue: portfolioNet,
    investmentGrowth: portfolioNet.minus(totalContributions),
    feesPaid,
    realPortfolioValue,
    savingsBalance,
  };
}

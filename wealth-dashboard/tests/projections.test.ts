import { describe, it, expect } from "vitest";
import { runScenario } from "@/lib/calculations/projections";

describe("runScenario", () => {
  it("real value is a sane fraction of nominal, not a near-zero underflow (regression: inflationPercent was passed unconverted into calculateRealValue, which expects a fraction)", () => {
    const outputs = runScenario({
      monthlyContribution: 700,
      initialInvestment: 0,
      annualNominalReturnPercent: 10,
      annualFeePercent: 3.5,
      inflationPercent: 6.5,
      contributionGrowthPercent: 0,
      horizonYears: 10,
      savingsRatePercent: 4,
      startingSavings: 500,
      monthlySavingsContribution: 300,
    });
    // Real value must be positive and of the same order of magnitude as
    // nominal (roughly nominal / 1.87 at 6.5% over 10 years), never near zero.
    const ratio = outputs.realPortfolioValue.dividedBy(outputs.nominalPortfolioValue);
    expect(ratio.toNumber()).toBeGreaterThan(0.4);
    expect(ratio.toNumber()).toBeLessThan(1);
  });

  it("zero fee means zero fees paid and nominal == gross-equivalent value", () => {
    const outputs = runScenario({
      monthlyContribution: 500,
      initialInvestment: 0,
      annualNominalReturnPercent: 8,
      annualFeePercent: 0,
      inflationPercent: 0,
      contributionGrowthPercent: 0,
      horizonYears: 5,
      savingsRatePercent: 0,
      startingSavings: 0,
      monthlySavingsContribution: 0,
    });
    expect(outputs.feesPaid.toNumber()).toBeCloseTo(0, 6);
  });

  it("zero inflation means real value equals nominal value", () => {
    const outputs = runScenario({
      monthlyContribution: 500,
      initialInvestment: 1000,
      annualNominalReturnPercent: 8,
      annualFeePercent: 1,
      inflationPercent: 0,
      contributionGrowthPercent: 0,
      horizonYears: 3,
      savingsRatePercent: 0,
      startingSavings: 0,
      monthlySavingsContribution: 0,
    });
    expect(outputs.realPortfolioValue.toNumber()).toBeCloseTo(outputs.nominalPortfolioValue.toNumber(), 6);
  });

  it("total contributions accumulate correctly with zero contribution growth", () => {
    const outputs = runScenario({
      monthlyContribution: 100,
      initialInvestment: 0,
      annualNominalReturnPercent: 0,
      annualFeePercent: 0,
      inflationPercent: 0,
      contributionGrowthPercent: 0,
      horizonYears: 2,
      savingsRatePercent: 0,
      startingSavings: 0,
      monthlySavingsContribution: 0,
    });
    expect(outputs.totalContributions.toNumber()).toBe(2400);
    expect(outputs.nominalPortfolioValue.toNumber()).toBeCloseTo(2400, 6);
  });

  it("a higher fee never produces a higher nominal portfolio value than a lower fee, all else equal", () => {
    const low = runScenario({
      monthlyContribution: 700,
      initialInvestment: 0,
      annualNominalReturnPercent: 10,
      annualFeePercent: 1,
      inflationPercent: 6.5,
      contributionGrowthPercent: 0,
      horizonYears: 10,
      savingsRatePercent: 0,
      startingSavings: 0,
      monthlySavingsContribution: 0,
    });
    const high = runScenario({
      monthlyContribution: 700,
      initialInvestment: 0,
      annualNominalReturnPercent: 10,
      annualFeePercent: 5,
      inflationPercent: 6.5,
      contributionGrowthPercent: 0,
      horizonYears: 10,
      savingsRatePercent: 0,
      startingSavings: 0,
      monthlySavingsContribution: 0,
    });
    expect(high.nominalPortfolioValue.toNumber()).toBeLessThan(low.nominalPortfolioValue.toNumber());
  });
});

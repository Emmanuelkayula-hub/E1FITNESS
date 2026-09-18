import { describe, it, expect } from "vitest";
import { runMonteCarlo, calculatePercentiles } from "@/lib/calculations/montecarlo";

// Deterministic seeded PRNG (mulberry32) so simulation tests are reproducible.
function seededRandom(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("calculatePercentiles", () => {
  it("orders percentiles correctly for a known sorted set", () => {
    const values = Array.from({ length: 101 }, (_, i) => i); // 0..100
    const p = calculatePercentiles(values);
    expect(p.p5).toBeCloseTo(5, 0);
    expect(p.p25).toBeCloseTo(25, 0);
    expect(p.p50).toBeCloseTo(50, 0);
    expect(p.p75).toBeCloseTo(75, 0);
    expect(p.p95).toBeCloseTo(95, 0);
    expect(p.p5).toBeLessThanOrEqual(p.p25);
    expect(p.p25).toBeLessThanOrEqual(p.p50);
    expect(p.p50).toBeLessThanOrEqual(p.p75);
    expect(p.p75).toBeLessThanOrEqual(p.p95);
  });

  it("handles unsorted input", () => {
    const p = calculatePercentiles([50, 10, 90, 30, 70, 20, 80, 40, 60, 0, 100]);
    expect(p.p50).toBeCloseTo(50, 0);
  });
});

describe("runMonteCarlo", () => {
  it("produces percentiles in non-decreasing order across 2,000 simulated paths", () => {
    const result = runMonteCarlo({
      numSimulations: 2000,
      expectedAnnualReturnPercent: 10,
      annualVolatilityPercent: 20,
      annualFeePercent: 3.5,
      inflationPercent: 6.5,
      contributionGrowthPercent: 0,
      monthlyContribution: 700,
      initialInvestment: 0,
      horizonYears: 10,
      random: seededRandom(42),
    });
    expect(result.nominal.p5).toBeLessThanOrEqual(result.nominal.p25);
    expect(result.nominal.p25).toBeLessThanOrEqual(result.nominal.p50);
    expect(result.nominal.p50).toBeLessThanOrEqual(result.nominal.p75);
    expect(result.nominal.p75).toBeLessThanOrEqual(result.nominal.p95);
    expect(result.real.p5).toBeLessThanOrEqual(result.real.p95);
  });

  it("real (inflation-adjusted) values are never above nominal for positive inflation", () => {
    const result = runMonteCarlo({
      numSimulations: 500,
      expectedAnnualReturnPercent: 10,
      annualVolatilityPercent: 15,
      annualFeePercent: 0,
      inflationPercent: 6.5,
      contributionGrowthPercent: 0,
      monthlyContribution: 500,
      initialInvestment: 1000,
      horizonYears: 5,
      random: seededRandom(7),
    });
    expect(result.real.p50).toBeLessThan(result.nominal.p50);
  });

  it("total contributions is deterministic regardless of random path", () => {
    const a = runMonteCarlo({
      numSimulations: 100,
      expectedAnnualReturnPercent: 10,
      annualVolatilityPercent: 15,
      annualFeePercent: 0,
      inflationPercent: 0,
      contributionGrowthPercent: 0,
      monthlyContribution: 100,
      initialInvestment: 0,
      horizonYears: 2,
      random: seededRandom(1),
    });
    expect(a.totalContributions).toBeCloseTo(2400, 6);
  });

  it("throws for zero simulations", () => {
    expect(() =>
      runMonteCarlo({
        numSimulations: 0,
        expectedAnnualReturnPercent: 10,
        annualVolatilityPercent: 15,
        annualFeePercent: 0,
        inflationPercent: 0,
        contributionGrowthPercent: 0,
        monthlyContribution: 100,
        initialInvestment: 0,
        horizonYears: 1,
      })
    ).toThrow();
  });
});

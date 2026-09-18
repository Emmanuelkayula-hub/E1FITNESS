import { describe, it, expect } from "vitest";
import {
  findSavingsTier,
  calculateMonthlySavingsInterest,
  calculateEmergencyFundCoverage,
} from "@/lib/calculations/savings";

const bands = [
  { min: 100, max: 249, annualRatePercent: 3 },
  { min: 250, max: 499, annualRatePercent: 3.5 },
  { min: 500, max: 999, annualRatePercent: 4 },
  { min: 1000, max: null, annualRatePercent: 5 },
];

describe("findSavingsTier boundary values (spec §62)", () => {
  it("K99 is below every tier", () => {
    expect(findSavingsTier(99, bands)).toBeNull();
  });
  it("K100 is the 3% tier's lower boundary", () => {
    expect(findSavingsTier(100, bands)?.annualRatePercent).toBe(3);
  });
  it("K249 is still the 3% tier", () => {
    expect(findSavingsTier(249, bands)?.annualRatePercent).toBe(3);
  });
  it("K250 crosses into the 3.5% tier", () => {
    expect(findSavingsTier(250, bands)?.annualRatePercent).toBe(3.5);
  });
  it("K499 is still the 3.5% tier", () => {
    expect(findSavingsTier(499, bands)?.annualRatePercent).toBe(3.5);
  });
  it("K500 crosses into the 4% tier", () => {
    expect(findSavingsTier(500, bands)?.annualRatePercent).toBe(4);
  });
  it("K999 is still the 4% tier", () => {
    expect(findSavingsTier(999, bands)?.annualRatePercent).toBe(4);
  });
  it("K1,000 crosses into the top 5% tier", () => {
    expect(findSavingsTier(1000, bands)?.annualRatePercent).toBe(5);
  });
  it("an arbitrarily large balance stays in the open-ended top tier", () => {
    expect(findSavingsTier(1_000_000, bands)?.annualRatePercent).toBe(5);
  });
});

describe("calculateMonthlySavingsInterest", () => {
  it("computes 1/12 of the annual rate on the current balance", () => {
    const interest = calculateMonthlySavingsInterest(1200, bands);
    expect(interest.toNumber()).toBeCloseTo((1200 * 0.05) / 12, 6);
  });

  it("returns zero when the balance is below every tier", () => {
    expect(calculateMonthlySavingsInterest(50, bands).toNumber()).toBe(0);
  });
});

describe("calculateEmergencyFundCoverage", () => {
  it("matches the starter tracker's worked example: K1,500 x 6 = K9,000 target", () => {
    const coverage = calculateEmergencyFundCoverage({
      currentSavings: 500,
      monthlyEssentialExpenses: 1500,
      targetMonths: 6,
    });
    expect(coverage.target.toNumber()).toBe(9000);
    expect(coverage.monthsCovered.toNumber()).toBeCloseTo(0.3333, 3);
    expect(coverage.percentageFunded.toNumber()).toBeCloseTo(5.5556, 3);
  });

  it("handles zero essential expenses without dividing by zero", () => {
    const coverage = calculateEmergencyFundCoverage({
      currentSavings: 1000,
      monthlyEssentialExpenses: 0,
      targetMonths: 6,
    });
    expect(coverage.monthsCovered.toNumber()).toBe(0);
    expect(coverage.target.toNumber()).toBe(0);
  });

  it("reports over 100% funded when savings exceed target", () => {
    const coverage = calculateEmergencyFundCoverage({
      currentSavings: 12000,
      monthlyEssentialExpenses: 1500,
      targetMonths: 6,
    });
    expect(coverage.percentageFunded.toNumber()).toBeCloseTo(133.33, 1);
  });
});

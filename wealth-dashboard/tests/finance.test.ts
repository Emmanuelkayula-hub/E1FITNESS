import { describe, it, expect } from "vitest";
import Decimal from "decimal.js";
import {
  calculateUnits,
  calculatePortfolioValue,
  calculateSimpleReturn,
  calculateXIRR,
  calculateRealValue,
  calculateFutureValue,
} from "@/lib/calculations/finance";

describe("calculateUnits", () => {
  it("K700 / K8.03 matches the spec's worked example", () => {
    const units = calculateUnits(700, 8.03);
    expect(units.toNumber()).toBeCloseTo(87.17309, 4);
  });

  it("throws on zero unit price rather than dividing by zero", () => {
    expect(() => calculateUnits(700, 0)).toThrow();
  });

  it("throws on negative unit price", () => {
    expect(() => calculateUnits(700, -1)).toThrow();
  });

  it("handles a zero contribution (returns zero units, not an error)", () => {
    expect(calculateUnits(0, 8.03).toNumber()).toBe(0);
  });
});

describe("calculatePortfolioValue", () => {
  it("sums units across multiple lots at the current price", () => {
    const lots = [{ units: "87.17309" }, { units: "100" }];
    const value = calculatePortfolioValue(lots, 10);
    expect(value.toNumber()).toBeCloseTo(1871.7309, 3);
  });

  it("returns zero for an empty lot list", () => {
    expect(calculatePortfolioValue([], 10).toNumber()).toBe(0);
  });
});

describe("calculateSimpleReturn", () => {
  it("computes a known positive return", () => {
    const r = calculateSimpleReturn(1200, 1000);
    expect(r.toNumber()).toBeCloseTo(0.2, 6);
  });

  it("computes a known negative return", () => {
    const r = calculateSimpleReturn(800, 1000);
    expect(r.toNumber()).toBeCloseTo(-0.2, 6);
  });

  it("returns zero (not NaN/Infinity) when contributions are zero", () => {
    expect(calculateSimpleReturn(500, 0).toNumber()).toBe(0);
  });
});

describe("calculateXIRR", () => {
  it("recovers a known 10% annual rate for a single-year single contribution", () => {
    const cashFlows = [
      { date: new Date("2025-01-01"), amount: -1000 },
      { date: new Date("2026-01-01"), amount: 1100 },
    ];
    const rate = calculateXIRR(cashFlows);
    expect(rate).toBeCloseTo(0.1, 2);
  });

  it("handles multiple contributions with a positive terminal value", () => {
    const cashFlows = [
      { date: new Date("2026-09-01"), amount: -700 },
      { date: new Date("2026-10-01"), amount: -700 },
      { date: new Date("2026-11-01"), amount: -700 },
      { date: new Date("2027-01-01"), amount: 2300 },
    ];
    const rate = calculateXIRR(cashFlows);
    expect(Number.isFinite(rate)).toBe(true);
  });

  it("throws when given fewer than two cash flows", () => {
    expect(() => calculateXIRR([{ date: new Date(), amount: -100 }])).toThrow();
  });

  it("throws when all cash flows are the same sign (degenerate case)", () => {
    const cashFlows = [
      { date: new Date("2026-01-01"), amount: -100 },
      { date: new Date("2026-06-01"), amount: -100 },
    ];
    expect(() => calculateXIRR(cashFlows)).toThrow();
  });
});

describe("calculateRealValue", () => {
  it("1 year at 6.5% inflation", () => {
    const real = calculateRealValue(10650, 0.065, 1);
    expect(real.toNumber()).toBeCloseTo(10000, 2);
  });

  it("5 years at 6.5% inflation", () => {
    const nominal = new Decimal(1).plus(0.065).pow(5).times(10000);
    const real = calculateRealValue(nominal, 0.065, 5);
    expect(real.toNumber()).toBeCloseTo(10000, 2);
  });

  it("10 years at 6.5% inflation", () => {
    const nominal = new Decimal(1).plus(0.065).pow(10).times(10000);
    const real = calculateRealValue(nominal, 0.065, 10);
    expect(real.toNumber()).toBeCloseTo(10000, 2);
  });

  it("zero years returns the nominal value unchanged", () => {
    expect(calculateRealValue(10000, 0.065, 0).toNumber()).toBeCloseTo(10000, 6);
  });
});

describe("calculateFutureValue", () => {
  it("matches the workbook's zero-return case: FV = contribution * months", () => {
    const fv = calculateFutureValue({
      monthlyContribution: 1000,
      annualNominalRate: 0,
      months: 12,
    });
    expect(fv.toNumber()).toBe(12000);
  });

  it("matches the recursive month-by-month convention used in the source workbook's Plan tab (annuity-due: each deposit grows from the start of its own month)", () => {
    // Cross-checked against a month-by-month recursive simulation of
    // D_n = (D_{n-1} + C) * (1 + i), the exact recursion in
    // `Month by Month!D5:D16` of internship-12-month-plan.xlsx.
    const fv = calculateFutureValue({
      monthlyContribution: 1000,
      annualNominalRate: 0.1,
      months: 12,
    });
    expect(fv.toNumber()).toBeCloseTo(12670.28, 1);
  });

  it("60 months at 12% matches the recursive convention (NOT the Fee Comparison sheet's ordinary-annuity formula — see ASSUMPTIONS.md)", () => {
    const fv = calculateFutureValue({
      monthlyContribution: 1000,
      annualNominalRate: 0.12,
      months: 60,
    });
    expect(fv.toNumber()).toBeCloseTo(82486.37, 1);
  });
});

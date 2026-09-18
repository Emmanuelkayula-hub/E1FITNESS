import { describe, it, expect } from "vitest";
import {
  calculateBenchmarkIndex,
  calculateDividendAdjustedIndex,
  calculateBenchmarkGap,
  classifyBenchmarkGap,
} from "@/lib/calculations/benchmark";

describe("calculateBenchmarkIndex", () => {
  it("start date always indexes to exactly 100", () => {
    expect(calculateBenchmarkIndex(8.03, 8.03).toNumber()).toBe(100);
    expect(calculateBenchmarkIndex(26423.95, 26423.95).toNumber()).toBe(100);
  });

  it("matches the workbook's worked example for a price rise", () => {
    // Benchmark!D19 baseline; a later price of 10 against start 8.03
    const idx = calculateBenchmarkIndex(10, 8.03);
    expect(idx.toNumber()).toBeCloseTo(124.5330012, 4);
  });

  it("throws rather than dividing by a zero starting value", () => {
    expect(() => calculateBenchmarkIndex(10, 0)).toThrow();
  });

  it("indexes a negative return correctly", () => {
    const idx = calculateBenchmarkIndex(6, 8.03);
    expect(idx.toNumber()).toBeLessThan(100);
  });
});

describe("calculateDividendAdjustedIndex", () => {
  it("at zero days elapsed, equals the price-only index (matches Benchmark!G19 baseline)", () => {
    const adj = calculateDividendAdjustedIndex({
      priceRebasedIndex: 100,
      estimatedAnnualYieldPercent: 4,
      daysElapsedSinceStart: 0,
    });
    expect(adj.toNumber()).toBe(100);
  });

  it("compounds the estimated yield over one full year", () => {
    const adj = calculateDividendAdjustedIndex({
      priceRebasedIndex: 100,
      estimatedAnnualYieldPercent: 4,
      daysElapsedSinceStart: 365.25,
    });
    expect(adj.toNumber()).toBeCloseTo(104, 6);
  });
});

describe("calculateBenchmarkGap / classifyBenchmarkGap", () => {
  it("gap of zero at the baseline is About level", () => {
    expect(calculateBenchmarkGap(100, 100).toNumber()).toBe(0);
    expect(classifyBenchmarkGap(0)).toBe("ABOUT_LEVEL");
  });

  it("fund clearly ahead above the +2 point threshold", () => {
    expect(classifyBenchmarkGap(2.01)).toBe("FUND_CLEARLY_AHEAD");
  });

  it("fund clearly behind below the -2 point threshold", () => {
    expect(classifyBenchmarkGap(-2.01)).toBe("FUND_CLEARLY_BEHIND");
  });

  it("is about level exactly at the +/-2 boundary (inclusive)", () => {
    expect(classifyBenchmarkGap(2)).toBe("ABOUT_LEVEL");
    expect(classifyBenchmarkGap(-2)).toBe("ABOUT_LEVEL");
  });
});

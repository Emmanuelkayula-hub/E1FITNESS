/**
 * Benchmark / rebasing engine (spec §21–§26).
 *
 * Methodology transcribed exactly from the "Benchmark" sheet of the user's
 * starter tracker workbook: both series are rebased to 100 at a chosen
 * start date so a K8 unit price and a 26,000-point index become
 * comparable, and a dividend-adjusted LASI approximation is added back
 * using a configurable estimated yield compounded over elapsed time —
 * NOT a real total-return index, and labelled as an approximation
 * wherever it's displayed (spec §23).
 */
import Decimal from "decimal.js";
import type { Numeric } from "./finance";

/** Indexed Value = (value at date t / value at start date) × 100. */
export function calculateBenchmarkIndex(valueAtT: Numeric, valueAtStart: Numeric): Decimal {
  const start = new Decimal(valueAtStart);
  if (start.eq(0)) {
    throw new Error("calculateBenchmarkIndex: starting value cannot be zero");
  }
  return new Decimal(valueAtT).dividedBy(start).times(100);
}

/**
 * Dividend-adjusted approximation of a price-only rebased index:
 *   adjusted = priceRebased * (1 + estimatedAnnualYield) ^ (daysElapsed / 365.25)
 * This mirrors `Benchmark!G19` in the workbook exactly. It is an
 * approximation of total return, not a real dividend-reinvestment
 * calculation — see /docs/CALCULATIONS.md.
 */
export function calculateDividendAdjustedIndex(params: {
  priceRebasedIndex: Numeric;
  estimatedAnnualYieldPercent: Numeric;
  daysElapsedSinceStart: number;
}): Decimal {
  const { priceRebasedIndex, estimatedAnnualYieldPercent, daysElapsedSinceStart } = params;
  const yieldRate = new Decimal(estimatedAnnualYieldPercent).dividedBy(100);
  const growth = new Decimal(1)
    .plus(yieldRate)
    .pow(new Decimal(daysElapsedSinceStart).dividedBy(365.25));
  return new Decimal(priceRebasedIndex).times(growth);
}

/** Raw gap or fair gap = Fund Index - Benchmark Index (points, not %). */
export function calculateBenchmarkGap(fundIndex: Numeric, benchmarkIndex: Numeric): Decimal {
  return new Decimal(fundIndex).minus(benchmarkIndex);
}

export type BenchmarkVerdict = "FUND_CLEARLY_AHEAD" | "FUND_CLEARLY_BEHIND" | "ABOUT_LEVEL";

/** Verdict thresholds (+/-2 index points) match `Benchmark!I19` exactly. */
export function classifyBenchmarkGap(gapPoints: Numeric, thresholdPoints: Numeric = 2): BenchmarkVerdict {
  const gap = new Decimal(gapPoints);
  const threshold = new Decimal(thresholdPoints);
  if (gap.gt(threshold)) return "FUND_CLEARLY_AHEAD";
  if (gap.lt(threshold.negated())) return "FUND_CLEARLY_BEHIND";
  return "ABOUT_LEVEL";
}

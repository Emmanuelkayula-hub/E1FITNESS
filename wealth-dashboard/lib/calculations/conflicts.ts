/**
 * Data conflict detection (spec §16–§17). Pure comparison logic; the
 * actual DataConflict rows are created by server actions in
 * lib/data/conflicts.ts, which call this to decide whether two
 * observations of the same field materially disagree.
 */
import Decimal from "decimal.js";

export interface ComparableObservation {
  id: string;
  value: string; // numeric observations are stored as strings; parsed here
  observedAt: Date;
}

export interface ConflictCheckResult {
  isConflicting: boolean;
  difference: Decimal | null;
  percentDifference: Decimal | null;
}

/**
 * Two observations conflict when their numeric values differ by more than
 * `toleranceFraction` (default 1% relative difference) of the larger
 * absolute value. A non-numeric value is compared for exact string
 * equality instead.
 */
export function checkConflict(
  a: ComparableObservation,
  b: ComparableObservation,
  toleranceFraction: Decimal.Value = 0.01
): ConflictCheckResult {
  const numA = tryParseDecimal(a.value);
  const numB = tryParseDecimal(b.value);

  if (!numA || !numB) {
    return {
      isConflicting: a.value.trim() !== b.value.trim(),
      difference: null,
      percentDifference: null,
    };
  }

  const difference = numA.minus(numB);
  const base = Decimal.max(numA.abs(), numB.abs());
  const percentDifference = base.eq(0) ? new Decimal(0) : difference.abs().dividedBy(base);

  return {
    isConflicting: percentDifference.gt(toleranceFraction),
    difference,
    percentDifference: percentDifference.times(100),
  };
}

function tryParseDecimal(value: string): Decimal | null {
  try {
    const d = new Decimal(value.trim());
    return d.isNaN() ? null : d;
  } catch {
    return null;
  }
}

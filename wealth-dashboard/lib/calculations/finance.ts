/**
 * Core investment-ledger calculations. See /docs/CALCULATIONS.md for the
 * documented formula behind every export here — this file is the single
 * source of truth; nothing here should be re-derived inline in a component.
 *
 * Money and unit quantities use Decimal (decimal.js) rather than native
 * numbers, per the "no silent rounding" rule (spec §64/§65): JS floating
 * point cannot exactly represent values like 700 / 8.03.
 */
import Decimal from "decimal.js";

Decimal.set({ precision: 34, rounding: Decimal.ROUND_HALF_UP });

export type Numeric = Decimal.Value;

/** Units Purchased = Contribution Amount / Purchase Unit Price. */
export function calculateUnits(contributionAmount: Numeric, unitPrice: Numeric): Decimal {
  const price = new Decimal(unitPrice);
  if (price.lte(0)) {
    throw new Error("calculateUnits: unit price must be > 0");
  }
  return new Decimal(contributionAmount).dividedBy(price);
}

/** Portfolio Value = SUM(units_i * currentUnitPrice) across all lots. */
export function calculatePortfolioValue(
  lots: { units: Numeric }[],
  currentUnitPrice: Numeric
): Decimal {
  const price = new Decimal(currentUnitPrice);
  return lots.reduce(
    (sum, lot) => sum.plus(new Decimal(lot.units).times(price)),
    new Decimal(0)
  );
}

/** Simple contribution return = (Current Value - Total Contributions) / Total Contributions. */
export function calculateSimpleReturn(
  currentValue: Numeric,
  totalContributions: Numeric
): Decimal {
  const contributions = new Decimal(totalContributions);
  if (contributions.eq(0)) return new Decimal(0);
  return new Decimal(currentValue).minus(contributions).dividedBy(contributions);
}

/**
 * Money-weighted return (XIRR) via Newton-Raphson on the standard XIRR
 * equation: sum(CF_i / (1+r)^(days_i/365)) = 0, cash flows negative for
 * contributions and one positive terminal cash flow for current value.
 *
 * Falls back to bisection if Newton-Raphson does not converge, and throws
 * a descriptive error (never a silently wrong number) if neither converges —
 * callers should catch this and show "insufficient transaction history"
 * rather than a number, per spec §11.
 */
export interface CashFlow {
  date: Date;
  amount: number; // negative = money out (contribution), positive = money in (value/withdrawal)
}

function xirrResidual(cashFlows: CashFlow[], rate: number): number {
  const t0 = cashFlows[0].date.getTime();
  return cashFlows.reduce((acc, cf) => {
    const years = (cf.date.getTime() - t0) / (365 * 24 * 60 * 60 * 1000);
    return acc + cf.amount / Math.pow(1 + rate, years);
  }, 0);
}

export function calculateXIRR(cashFlows: CashFlow[]): number {
  if (cashFlows.length < 2) {
    throw new Error("calculateXIRR: at least two cash flows are required");
  }
  const hasPositive = cashFlows.some((cf) => cf.amount > 0);
  const hasNegative = cashFlows.some((cf) => cf.amount < 0);
  if (!hasPositive || !hasNegative) {
    throw new Error(
      "calculateXIRR: cash flows must include both an outflow and an inflow"
    );
  }

  const sorted = [...cashFlows].sort((a, b) => a.date.getTime() - b.date.getTime());

  let rate = 0.1;
  for (let i = 0; i < 100; i++) {
    const f = xirrResidual(sorted, rate);
    const h = 1e-6;
    const fPrime =
      (xirrResidual(sorted, rate + h) - xirrResidual(sorted, rate - h)) / (2 * h);
    if (Math.abs(fPrime) < 1e-12) break;
    const next = rate - f / fPrime;
    if (!isFinite(next) || next <= -0.9999) break;
    if (Math.abs(next - rate) < 1e-9) return next;
    rate = next;
  }

  // Bisection fallback over a wide, sane range.
  let lo = -0.9999;
  let hi = 10;
  let fLo = xirrResidual(sorted, lo);
  let fHi = xirrResidual(sorted, hi);
  if (fLo * fHi > 0) {
    throw new Error(
      "calculateXIRR: no sign change found in [-99.99%, 1000%] — insufficient or degenerate transaction history"
    );
  }
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fMid = xirrResidual(sorted, mid);
    if (Math.abs(fMid) < 1e-7) return mid;
    if (fLo * fMid < 0) {
      hi = mid;
      fHi = fMid;
    } else {
      lo = mid;
      fLo = fMid;
    }
  }
  return (lo + hi) / 2;
}

/** Real Value = Nominal Value / (1 + Inflation)^Years. */
export function calculateRealValue(
  nominalValue: Numeric,
  annualInflationRate: Numeric,
  years: Numeric
): Decimal {
  const inflation = new Decimal(annualInflationRate);
  const base = new Decimal(1).plus(inflation);
  const exponent = new Decimal(years);
  return new Decimal(nominalValue).dividedBy(decimalPow(base, exponent));
}

/**
 * Future value of a stream of level monthly contributions at a fixed
 * monthly rate, contributions applied at the START of each month
 * (matches the workbooks' convention: "deposits at month start").
 *
 * FV = C * (((1+i)^n - 1) / i) * (1+i)   [annuity-due]
 * When i == 0: FV = C * n
 */
export function calculateFutureValue(params: {
  monthlyContribution: Numeric;
  annualNominalRate: Numeric;
  months: number;
}): Decimal {
  const { monthlyContribution, annualNominalRate, months } = params;
  const c = new Decimal(monthlyContribution);
  const i = new Decimal(annualNominalRate).dividedBy(12);
  if (i.eq(0)) {
    return c.times(months);
  }
  const growth = decimalPow(new Decimal(1).plus(i), new Decimal(months));
  return c
    .times(growth.minus(1).dividedBy(i))
    .times(new Decimal(1).plus(i));
}

function decimalPow(base: Decimal, exponent: Decimal): Decimal {
  // decimal.js supports Decimal.pow with non-integer exponents natively.
  return base.pow(exponent);
}

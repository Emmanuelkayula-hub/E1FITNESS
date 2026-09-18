/**
 * Monte Carlo engine (spec §35–§37).
 *
 * Illustrative stochastic scenario — not a forecast. Uses plain `number`
 * arithmetic rather than Decimal: with 10,000+ simulated paths this runs
 * in a hot loop where Decimal's overhead is prohibitive, and monetary
 * precision at the individual-path level is not meaningful for a
 * probability distribution (only the aggregated percentiles are
 * reported, already rounded for display).
 *
 * Model: monthly log-normal-ish returns via
 *   r_month ~ Normal(mu/12, sigma/sqrt(12))
 * applied multiplicatively to the running portfolio value, with a level
 * monthly contribution (optionally growing) added at the start of each
 * month. This is the simplest defensible baseline named in the spec
 * (§36) — it does not model fat tails, mean reversion, or serial
 * correlation. Document this limitation wherever results are shown.
 */

export interface MonteCarloInputs {
  numSimulations: number;
  expectedAnnualReturnPercent: number;
  annualVolatilityPercent: number;
  annualFeePercent: number;
  inflationPercent: number;
  contributionGrowthPercent: number;
  monthlyContribution: number;
  initialInvestment: number;
  horizonYears: number;
  /** Injectable PRNG for deterministic tests; defaults to Math.random. */
  random?: () => number;
}

export interface MonteCarloPercentiles {
  p5: number;
  p25: number;
  p50: number;
  p75: number;
  p95: number;
}

export interface MonteCarloOutputs {
  nominal: MonteCarloPercentiles;
  real: MonteCarloPercentiles;
  totalContributions: number;
  worstOutcome: number;
  bestOutcome: number;
}

/** Box-Muller transform for standard-normal draws from a uniform PRNG. */
function nextGaussian(random: () => number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = random();
  while (v === 0) v = random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function simulateOnePath(inputs: MonteCarloInputs): number {
  const {
    expectedAnnualReturnPercent,
    annualVolatilityPercent,
    annualFeePercent,
    contributionGrowthPercent,
    monthlyContribution,
    initialInvestment,
    horizonYears,
    random = Math.random,
  } = inputs;

  const netAnnualReturn = (expectedAnnualReturnPercent - annualFeePercent) / 100;
  const monthlyMu = netAnnualReturn / 12;
  const monthlySigma = annualVolatilityPercent / 100 / Math.sqrt(12);
  const monthlyGrowth = contributionGrowthPercent / 100 / 12;

  let value = initialInvestment;
  let contribution = monthlyContribution;
  const totalMonths = horizonYears * 12;

  for (let m = 0; m < totalMonths; m++) {
    value += contribution;
    const shock = nextGaussian(random);
    const monthReturn = monthlyMu + monthlySigma * shock;
    value *= 1 + monthReturn;
    if (value < 0) value = 0;
    contribution *= 1 + monthlyGrowth;
  }
  return value;
}

function percentile(sortedValues: number[], p: number): number {
  const idx = (p / 100) * (sortedValues.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sortedValues[lo];
  const frac = idx - lo;
  return sortedValues[lo] * (1 - frac) + sortedValues[hi] * frac;
}

export function calculatePercentiles(values: number[]): MonteCarloPercentiles {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    p5: percentile(sorted, 5),
    p25: percentile(sorted, 25),
    p50: percentile(sorted, 50),
    p75: percentile(sorted, 75),
    p95: percentile(sorted, 95),
  };
}

export function runMonteCarlo(inputs: MonteCarloInputs): MonteCarloOutputs {
  const { numSimulations, monthlyContribution, contributionGrowthPercent, horizonYears, inflationPercent, initialInvestment } =
    inputs;
  if (numSimulations < 1) {
    throw new Error("runMonteCarlo: numSimulations must be >= 1");
  }

  const nominalResults: number[] = new Array(numSimulations);
  for (let i = 0; i < numSimulations; i++) {
    nominalResults[i] = simulateOnePath(inputs);
  }

  const realResults = nominalResults.map(
    (v) => v / Math.pow(1 + inflationPercent / 100, horizonYears)
  );

  // Total contributions is deterministic (same contribution schedule on every path).
  let totalContributions = initialInvestment;
  let contribution = monthlyContribution;
  const monthlyGrowth = contributionGrowthPercent / 100 / 12;
  for (let m = 0; m < horizonYears * 12; m++) {
    totalContributions += contribution;
    contribution *= 1 + monthlyGrowth;
  }

  return {
    nominal: calculatePercentiles(nominalResults),
    real: calculatePercentiles(realResults),
    totalContributions,
    worstOutcome: Math.min(...nominalResults),
    bestOutcome: Math.max(...nominalResults),
  };
}

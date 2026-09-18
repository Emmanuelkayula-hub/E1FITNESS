"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/currentUser";
import { runMonteCarlo, type MonteCarloOutputs } from "@/lib/calculations/montecarlo";
import { monteCarloSchema } from "@/lib/validation/montecarlo";

export type MonteCarloActionState = {
  ok: boolean;
  error?: string;
  result?: MonteCarloOutputs;
};

/**
 * Runs server-side rather than in the browser: 10,000+ simulated paths in
 * a tight loop would otherwise block the main thread on the client (spec
 * §79 — "Monte Carlo should not freeze the UI. Run simulations
 * asynchronously if necessary"). A server action naturally keeps the
 * client responsive while this runs.
 */
export async function runMonteCarloAction(
  _prevState: MonteCarloActionState,
  formData: FormData
): Promise<MonteCarloActionState> {
  const parsed = monteCarloSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }

  const user = await getCurrentUser();
  const input = parsed.data;

  let result: MonteCarloOutputs;
  try {
    result = runMonteCarlo(input);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Simulation failed." };
  }

  const scenario = await prisma.scenario.create({
    data: {
      userId: user.id,
      name: `Monte Carlo (${input.numSimulations.toLocaleString()} runs)`,
      monthlyContribution: input.monthlyContribution,
      initialInvestment: input.initialInvestment,
      annualNominalReturnPercent: input.expectedAnnualReturnPercent,
      annualFeePercent: input.annualFeePercent,
      inflationPercent: input.inflationPercent,
      contributionGrowthPercent: input.contributionGrowthPercent,
      horizonYears: input.horizonYears,
      savingsRatePercent: 0,
      startingSavings: 0,
    },
  });

  await prisma.scenarioResult.create({
    data: {
      scenarioId: scenario.id,
      simType: "monte_carlo",
      totalContributions: result.totalContributions.toString(),
      nominalPortfolioValue: result.nominal.p50.toString(),
      realPortfolioValue: result.real.p50.toString(),
      investmentGrowth: (result.nominal.p50 - result.totalContributions).toString(),
      feesPaid: 0,
      savingsBalance: 0,
      percentiles: JSON.parse(JSON.stringify({ nominal: result.nominal, real: result.real })),
      assumptions: JSON.parse(JSON.stringify(input)),
    },
  });

  return { ok: true, result };
}

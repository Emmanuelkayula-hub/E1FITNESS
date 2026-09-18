"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/currentUser";
import { runScenario } from "@/lib/calculations/projections";
import { scenarioSchema } from "@/lib/validation/scenario";

export type ScenarioActionState = { ok: boolean; error?: string };

export async function saveScenario(
  _prevState: ScenarioActionState,
  formData: FormData
): Promise<ScenarioActionState> {
  const parsed = scenarioSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }

  const user = await getCurrentUser();
  const input = parsed.data;

  const outputs = runScenario(input);

  const scenario = await prisma.scenario.create({
    data: {
      userId: user.id,
      name: input.name,
      monthlyContribution: input.monthlyContribution,
      initialInvestment: input.initialInvestment,
      annualNominalReturnPercent: input.annualNominalReturnPercent,
      annualFeePercent: input.annualFeePercent,
      inflationPercent: input.inflationPercent,
      contributionGrowthPercent: input.contributionGrowthPercent,
      horizonYears: input.horizonYears,
      savingsRatePercent: input.savingsRatePercent,
      startingSavings: input.startingSavings,
    },
  });

  await prisma.scenarioResult.create({
    data: {
      scenarioId: scenario.id,
      simType: "deterministic",
      totalContributions: outputs.totalContributions.toString(),
      nominalPortfolioValue: outputs.nominalPortfolioValue.toString(),
      realPortfolioValue: outputs.realPortfolioValue.toString(),
      investmentGrowth: outputs.investmentGrowth.toString(),
      feesPaid: outputs.feesPaid.toString(),
      savingsBalance: outputs.savingsBalance.toString(),
      assumptions: input,
    },
  });

  revalidatePath("/projections");
  return { ok: true };
}

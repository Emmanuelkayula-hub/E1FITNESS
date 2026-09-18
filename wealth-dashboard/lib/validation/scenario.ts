import { z } from "zod";

export const scenarioSchema = z.object({
  name: z.string().min(1).max(200),
  monthlyContribution: z.coerce.number().min(0),
  initialInvestment: z.coerce.number().min(0),
  annualNominalReturnPercent: z.coerce.number(),
  annualFeePercent: z.coerce.number().min(0).max(100),
  inflationPercent: z.coerce.number(),
  contributionGrowthPercent: z.coerce.number(),
  horizonYears: z.coerce.number().int().min(1).max(80),
  savingsRatePercent: z.coerce.number().min(0),
  startingSavings: z.coerce.number().min(0),
  monthlySavingsContribution: z.coerce.number().min(0),
});

export type ScenarioFormInput = z.infer<typeof scenarioSchema>;

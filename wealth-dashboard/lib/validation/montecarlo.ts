import { z } from "zod";

export const monteCarloSchema = z.object({
  numSimulations: z.coerce.number().int().min(100).max(50000),
  expectedAnnualReturnPercent: z.coerce.number(),
  annualVolatilityPercent: z.coerce.number().min(0).max(200),
  annualFeePercent: z.coerce.number().min(0).max(100),
  inflationPercent: z.coerce.number(),
  contributionGrowthPercent: z.coerce.number(),
  monthlyContribution: z.coerce.number().min(0),
  initialInvestment: z.coerce.number().min(0),
  horizonYears: z.coerce.number().int().min(1).max(80),
});

export type MonteCarloFormInput = z.infer<typeof monteCarloSchema>;

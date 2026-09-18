import { z } from "zod";

export const profileSettingsSchema = z.object({
  currency: z.string().min(1).max(8),
  monthlyEssentials: z.coerce.number().min(0),
  emergencyFundMonthsTarget: z.coerce.number().min(0).max(60),
  inflationAssumption: z.coerce.number().min(-1).max(2), // fraction, e.g. 0.065
});

export const fundSettingsSchema = z.object({
  fundId: z.string().min(1),
  annualFeePercent: z.coerce.number().min(0).max(100),
  earlyWithdrawalPenaltyPercent: z.coerce.number().min(0).max(100),
  minimumHoldingMonths: z.coerce.number().int().min(0).max(120),
  lockMethodology: z.enum(["PER_CONTRIBUTION", "FROM_FIRST_INVESTMENT", "CUSTOM", "UNKNOWN"]),
});

export type ProfileSettingsInput = z.infer<typeof profileSettingsSchema>;
export type FundSettingsInput = z.infer<typeof fundSettingsSchema>;

"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/currentUser";
import { writeAuditLog } from "@/lib/data/auditLog";
import { profileSettingsSchema, fundSettingsSchema } from "@/lib/validation/settings";

export type SettingsActionState = { ok: boolean; error?: string };

export async function updateProfileSettings(
  _prevState: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  const user = await getCurrentUser();
  const parsed = profileSettingsSchema.safeParse({
    currency: formData.get("currency"),
    monthlyEssentials: formData.get("monthlyEssentials"),
    emergencyFundMonthsTarget: formData.get("emergencyFundMonthsTarget"),
    inflationAssumption: formData.get("inflationAssumption"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }

  const previous = user.profile;
  const updated = await prisma.profile.update({
    where: { userId: user.id },
    data: parsed.data,
  });

  await writeAuditLog({
    userId: user.id,
    action: "profile.settings.updated",
    entityType: "Profile",
    entityId: updated.id,
    previousValue: previous
      ? {
          currency: previous.currency,
          monthlyEssentials: previous.monthlyEssentials.toString(),
          emergencyFundMonthsTarget: previous.emergencyFundMonthsTarget.toString(),
          inflationAssumption: previous.inflationAssumption.toString(),
        }
      : null,
    newValue: parsed.data,
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateFundSettings(
  _prevState: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  const user = await getCurrentUser();
  const parsed = fundSettingsSchema.safeParse({
    fundId: formData.get("fundId"),
    annualFeePercent: formData.get("annualFeePercent"),
    earlyWithdrawalPenaltyPercent: formData.get("earlyWithdrawalPenaltyPercent"),
    minimumHoldingMonths: formData.get("minimumHoldingMonths"),
    lockMethodology: formData.get("lockMethodology"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }

  const { fundId, ...data } = parsed.data;
  const fund = await prisma.investmentFund.findFirst({
    where: { id: fundId, userId: user.id },
  });
  if (!fund) {
    return { ok: false, error: "Fund not found." };
  }

  const updated = await prisma.investmentFund.update({
    where: { id: fundId },
    data,
  });

  const lockMethodologyChanged = fund.lockMethodology !== updated.lockMethodology;

  await writeAuditLog({
    userId: user.id,
    action: lockMethodologyChanged ? "fund.lockMethodology.changed" : "fund.settings.updated",
    entityType: "InvestmentFund",
    entityId: fundId,
    previousValue: {
      annualFeePercent: fund.annualFeePercent.toString(),
      earlyWithdrawalPenaltyPercent: fund.earlyWithdrawalPenaltyPercent.toString(),
      minimumHoldingMonths: fund.minimumHoldingMonths,
      lockMethodology: fund.lockMethodology,
    },
    newValue: data,
  });

  revalidatePath("/settings");
  revalidatePath("/investments");
  revalidatePath("/dashboard");
  return { ok: true };
}

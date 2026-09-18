"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/currentUser";
import { recordContribution, recordFundPrice } from "@/lib/data/investments";
import { contributionSchema, fundPriceSchema } from "@/lib/validation/investments";

export type InvestmentActionState = { ok: boolean; error?: string };

export async function addContribution(
  _prevState: InvestmentActionState,
  formData: FormData
): Promise<InvestmentActionState> {
  const parsed = contributionSchema.safeParse({
    fundId: formData.get("fundId"),
    date: formData.get("date"),
    amount: formData.get("amount"),
    unitPriceAtPurchase: formData.get("unitPriceAtPurchase"),
    fees: formData.get("fees") || 0,
    source: formData.get("source") || undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }

  try {
    const user = await getCurrentUser();
    await recordContribution(user.id, parsed.data);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to save contribution." };
  }

  revalidatePath("/investments");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function addFundPrice(
  _prevState: InvestmentActionState,
  formData: FormData
): Promise<InvestmentActionState> {
  const parsed = fundPriceSchema.safeParse({
    fundId: formData.get("fundId"),
    date: formData.get("date"),
    unitPrice: formData.get("unitPrice"),
    source: formData.get("source"),
    sourceType: formData.get("sourceType"),
    verificationStatus: formData.get("verificationStatus"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }

  try {
    const user = await getCurrentUser();
    await recordFundPrice(user.id, parsed.data);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to save price." };
  }

  revalidatePath("/investments");
  revalidatePath("/dashboard");
  revalidatePath("/benchmark");
  return { ok: true };
}

"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/currentUser";
import { recordSavingsTransaction } from "@/lib/data/savings";
import { savingsTransactionSchema } from "@/lib/validation/savings";

export type SavingsActionState = { ok: boolean; error?: string };

export async function addSavingsTransaction(
  _prevState: SavingsActionState,
  formData: FormData
): Promise<SavingsActionState> {
  const parsed = savingsTransactionSchema.safeParse({
    accountId: formData.get("accountId"),
    date: formData.get("date"),
    type: formData.get("type"),
    amount: formData.get("amount"),
    source: formData.get("source") || undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }

  try {
    const user = await getCurrentUser();
    await recordSavingsTransaction(user.id, parsed.data);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to save transaction." };
  }

  revalidatePath("/savings");
  revalidatePath("/dashboard");
  return { ok: true };
}

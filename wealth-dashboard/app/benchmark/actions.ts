"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/currentUser";
import { recordMarketIndexObservation } from "@/lib/data/benchmark";
import { marketIndexSchema } from "@/lib/validation/benchmark";

export type BenchmarkActionState = { ok: boolean; error?: string };

export async function addMarketIndexObservation(
  _prevState: BenchmarkActionState,
  formData: FormData
): Promise<BenchmarkActionState> {
  const parsed = marketIndexSchema.safeParse({
    code: formData.get("code") || "LASI",
    name: formData.get("name") || "LuSE All Share Index",
    date: formData.get("date"),
    level: formData.get("level"),
    source: formData.get("source"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }

  try {
    const user = await getCurrentUser();
    await recordMarketIndexObservation(user.id, parsed.data);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to save observation." };
  }

  revalidatePath("/benchmark");
  revalidatePath("/dashboard");
  return { ok: true };
}

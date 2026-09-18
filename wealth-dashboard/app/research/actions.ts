"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/currentUser";
import { resolveConflict } from "@/lib/data/research";
import { resolveConflictSchema } from "@/lib/validation/research";

export type ResearchActionState = { ok: boolean; error?: string };

export async function resolveConflictAction(
  _prevState: ResearchActionState,
  formData: FormData
): Promise<ResearchActionState> {
  const parsed = resolveConflictSchema.safeParse({
    conflictId: formData.get("conflictId"),
    resolution: formData.get("resolution"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }

  const user = await getCurrentUser();
  await resolveConflict({ userId: user.id, ...parsed.data });

  revalidatePath("/research");
  revalidatePath("/dashboard");
  revalidatePath("/investments");
  return { ok: true };
}

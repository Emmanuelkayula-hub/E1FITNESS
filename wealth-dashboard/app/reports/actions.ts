"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/currentUser";
import { generateReport } from "@/lib/data/reports";

export type ReportActionState = { ok: boolean; error?: string };

export async function generateMonthlyReport(): Promise<ReportActionState> {
  try {
    const user = await getCurrentUser();
    await generateReport(user.id, "monthly");
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to generate report." };
  }
  revalidatePath("/reports");
  return { ok: true };
}

export async function generateQuarterlyReport(): Promise<ReportActionState> {
  try {
    const user = await getCurrentUser();
    await generateReport(user.id, "quarterly");
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to generate report." };
  }
  revalidatePath("/reports");
  return { ok: true };
}

"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/currentUser";
import { createExam, createStudySession, createCareerExpense } from "@/lib/data/career";
import { examSchema, studySessionSchema, careerExpenseSchema } from "@/lib/validation/career";

export type CareerActionState = { ok: boolean; error?: string };

function emptyToUndefined(v: FormDataEntryValue | null) {
  return v && v.toString().length > 0 ? v : undefined;
}

export async function addExam(
  _prevState: CareerActionState,
  formData: FormData
): Promise<CareerActionState> {
  const parsed = examSchema.safeParse({
    name: formData.get("name"),
    sitting: emptyToUndefined(formData.get("sitting")),
    examDate: emptyToUndefined(formData.get("examDate")),
    registrationDeadline: emptyToUndefined(formData.get("registrationDeadline")),
    studyStartDate: emptyToUndefined(formData.get("studyStartDate")),
    targetStudyHours: emptyToUndefined(formData.get("targetStudyHours")),
    status: formData.get("status"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  const user = await getCurrentUser();
  await createExam(user.id, parsed.data);
  revalidatePath("/career");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function addStudySession(
  _prevState: CareerActionState,
  formData: FormData
): Promise<CareerActionState> {
  const parsed = studySessionSchema.safeParse({
    examId: emptyToUndefined(formData.get("examId")),
    date: formData.get("date"),
    hours: formData.get("hours"),
    questionsCompleted: formData.get("questionsCompleted") || 0,
    topic: emptyToUndefined(formData.get("topic")),
    mockScorePercent: emptyToUndefined(formData.get("mockScorePercent")),
    notes: emptyToUndefined(formData.get("notes")),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  const user = await getCurrentUser();
  await createStudySession(user.id, parsed.data);
  revalidatePath("/career");
  return { ok: true };
}

export async function addCareerExpense(
  _prevState: CareerActionState,
  formData: FormData
): Promise<CareerActionState> {
  const parsed = careerExpenseSchema.safeParse({
    date: formData.get("date"),
    category: formData.get("category"),
    amount: formData.get("amount"),
    description: emptyToUndefined(formData.get("description")),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  const user = await getCurrentUser();
  await createCareerExpense(user.id, parsed.data);
  revalidatePath("/career");
  return { ok: true };
}

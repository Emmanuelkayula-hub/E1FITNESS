"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/currentUser";
import { previewImport, commitImport, type ImportType, type ImportPreview, type ImportSummary } from "@/lib/data/csvImport";

export type ImportActionState = {
  ok: boolean;
  error?: string;
  preview?: ImportPreview;
  summary?: ImportSummary;
  csvText?: string; // carried through from preview -> commit so the file doesn't need re-uploading
  importType?: ImportType;
  fundId?: string;
  accountId?: string;
};

async function readCsvFile(formData: FormData): Promise<string | null> {
  const file = formData.get("file");
  if (file instanceof File && file.size > 0) {
    return file.text();
  }
  // Commit step carries the already-read text through a hidden field
  // instead of requiring the file to be re-selected.
  const carried = formData.get("csvText");
  return typeof carried === "string" && carried.length > 0 ? carried : null;
}

export async function previewImportAction(
  _prevState: ImportActionState,
  formData: FormData
): Promise<ImportActionState> {
  const importType = formData.get("importType") as ImportType | null;
  const fundId = (formData.get("fundId") as string) || undefined;
  const accountId = (formData.get("accountId") as string) || undefined;

  if (!importType) return { ok: false, error: "Choose what kind of data you're importing." };

  const csvText = await readCsvFile(formData);
  if (!csvText) return { ok: false, error: "Choose a CSV file first." };

  try {
    const user = await getCurrentUser();
    const preview = await previewImport(importType, csvText, { userId: user.id, fundId, accountId });
    return { ok: true, preview, csvText, importType, fundId, accountId };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not read that file." };
  }
}

export async function commitImportAction(
  _prevState: ImportActionState,
  formData: FormData
): Promise<ImportActionState> {
  const importType = formData.get("importType") as ImportType | null;
  const fundId = (formData.get("fundId") as string) || undefined;
  const accountId = (formData.get("accountId") as string) || undefined;

  if (!importType) return { ok: false, error: "Choose what kind of data you're importing." };

  const csvText = await readCsvFile(formData);
  if (!csvText) return { ok: false, error: "No file to import — preview it again first." };

  try {
    const user = await getCurrentUser();
    const summary = await commitImport(importType, csvText, { userId: user.id, fundId, accountId });
    revalidatePath("/investments");
    revalidatePath("/savings");
    revalidatePath("/benchmark");
    revalidatePath("/career");
    revalidatePath("/dashboard");
    return { ok: true, summary };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Import failed." };
  }
}

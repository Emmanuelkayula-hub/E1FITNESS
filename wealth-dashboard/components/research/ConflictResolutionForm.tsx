"use client";

import { ActionForm } from "@/components/forms/ActionForm";
import { resolveConflictAction } from "@/app/research/actions";

export function ConflictResolutionForm({ conflictId }: { conflictId: string }) {
  return (
    <ActionForm action={resolveConflictAction} submitLabel="Apply resolution" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <input type="hidden" name="conflictId" value={conflictId} />
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs font-medium text-muted">Resolution</span>
        <select name="resolution" className="input" defaultValue="keep_both">
          <option value="keep_both">Keep both (default — no data is discarded)</option>
          <option value="accept_a">Accept source A</option>
          <option value="accept_b">Accept source B</option>
          <option value="mark_stale">Mark one as stale</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs font-medium text-muted">Note (why)</span>
        <input type="text" name="note" className="input" placeholder="e.g. confirmed with Longhorn via WhatsApp" />
      </label>
    </ActionForm>
  );
}

"use client";

import { useActionState } from "react";
import type { SettingsActionState } from "@/app/settings/actions";

type Action = (state: SettingsActionState, formData: FormData) => Promise<SettingsActionState>;

export function SettingsForm({
  action,
  children,
  submitLabel,
}: {
  action: Action;
  children: React.ReactNode;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<SettingsActionState, FormData>(action, {
    ok: false,
  });

  return (
    <form action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {children}
      <div className="sm:col-span-2 flex items-center gap-3">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </button>
        {state.error && <span className="text-xs text-negative">{state.error}</span>}
        {state.ok && !pending && <span className="text-xs text-positive">Saved.</span>}
      </div>
    </form>
  );
}

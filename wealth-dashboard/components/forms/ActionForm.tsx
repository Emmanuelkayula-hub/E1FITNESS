"use client";

import { useActionState } from "react";

export type ActionState = { ok: boolean; error?: string };

type Action = (state: ActionState, formData: FormData) => Promise<ActionState>;

export function ActionForm({
  action,
  children,
  submitLabel,
  className,
}: {
  action: Action;
  children: React.ReactNode;
  submitLabel: string;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, { ok: false });

  return (
    <form action={formAction} className={className ?? "grid grid-cols-1 gap-4 sm:grid-cols-2"}>
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

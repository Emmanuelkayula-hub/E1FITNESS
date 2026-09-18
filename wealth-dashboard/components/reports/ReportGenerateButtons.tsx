"use client";

import { useState, useTransition } from "react";
import { generateMonthlyReport, generateQuarterlyReport } from "@/app/reports/actions";

export function ReportGenerateButtons() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.error ?? "Failed to generate report.");
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button className="btn-primary" disabled={pending} onClick={() => run(generateMonthlyReport)}>
        {pending ? "Generating…" : "Generate monthly report"}
      </button>
      <button className="btn-secondary" disabled={pending} onClick={() => run(generateQuarterlyReport)}>
        {pending ? "Generating…" : "Generate quarterly report"}
      </button>
      {error && <span className="text-xs text-negative">{error}</span>}
    </div>
  );
}

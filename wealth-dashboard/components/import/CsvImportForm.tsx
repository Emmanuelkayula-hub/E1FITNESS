"use client";

import { useActionState, useState } from "react";
import { previewImportAction, commitImportAction, type ImportActionState } from "@/app/reports/importActions";
import { Badge } from "@/components/ui/Badge";

const IMPORT_TYPE_LABEL: Record<string, string> = {
  investment_contributions: "Investment contributions",
  fund_prices: "Fund unit prices",
  lasi_observations: "LASI observations",
  savings_transactions: "Savings transactions",
  study_sessions: "Study sessions",
};

export function CsvImportForm({
  funds,
  savingsAccounts,
}: {
  funds: { id: string; name: string }[];
  savingsAccounts: { id: string; name: string }[];
}) {
  const [importType, setImportType] = useState("investment_contributions");
  const [previewState, previewAction, previewPending] = useActionState<ImportActionState, FormData>(
    previewImportAction,
    { ok: false }
  );
  const [commitState, commitAction, commitPending] = useActionState<ImportActionState, FormData>(
    commitImportAction,
    { ok: false }
  );

  const needsFund = importType === "investment_contributions" || importType === "fund_prices";
  const needsAccount = importType === "savings_transactions";
  const preview = previewState.ok ? previewState.preview : undefined;

  return (
    <div className="space-y-4">
      <form action={previewAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs font-medium text-muted">What are you importing?</span>
          <select
            name="importType"
            className="input"
            value={importType}
            onChange={(e) => setImportType(e.target.value)}
          >
            {Object.entries(IMPORT_TYPE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        {needsFund && (
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-muted">Fund</span>
            <select name="fundId" className="input">
              {funds.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>
        )}

        {needsAccount && (
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-muted">Savings account</span>
            <select name="accountId" className="input">
              {savingsAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          <span className="text-xs font-medium text-muted">CSV file</span>
          <input type="file" name="file" accept=".csv,text/csv" className="input" required />
        </label>

        <div className="sm:col-span-2 flex items-center gap-3">
          <button type="submit" className="btn-secondary" disabled={previewPending}>
            {previewPending ? "Reading…" : "Preview"}
          </button>
          {previewState.error && <span className="text-xs text-negative">{previewState.error}</span>}
        </div>
      </form>

      {preview && (
        <div className="space-y-3 border-t border-border pt-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span>
              {preview.rows.length} row(s) detected for{" "}
              <strong>{IMPORT_TYPE_LABEL[previewState.importType ?? ""]}</strong>:
            </span>
            <Badge tone="verified">{preview.validCount} valid</Badge>
            <Badge tone="conflicting">{preview.duplicateCount} duplicate</Badge>
            <Badge tone="stale">{preview.invalidCount} invalid</Badge>
          </div>

          <div className="max-h-96 overflow-auto rounded-md border border-border">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Status</th>
                  <th>Reason</th>
                  {preview.headers.map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row) => (
                  <tr key={row.rowNumber}>
                    <td className="mono">{row.rowNumber}</td>
                    <td>
                      <Badge
                        tone={row.status === "valid" ? "verified" : row.status === "duplicate" ? "conflicting" : "stale"}
                      >
                        {row.status}
                      </Badge>
                    </td>
                    <td className="text-muted">{row.reason ?? "—"}</td>
                    {preview.headers.map((h) => (
                      <td key={h} className="mono">
                        {row.raw[h]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <form action={commitAction} className="flex items-center gap-3">
            <input type="hidden" name="importType" value={previewState.importType} />
            {previewState.fundId && <input type="hidden" name="fundId" value={previewState.fundId} />}
            {previewState.accountId && <input type="hidden" name="accountId" value={previewState.accountId} />}
            <input type="hidden" name="csvText" value={previewState.csvText ?? ""} />
            <button type="submit" className="btn-primary" disabled={commitPending || preview.validCount === 0}>
              {commitPending ? "Importing…" : `Import ${preview.validCount} valid row(s)`}
            </button>
            <span className="text-xs text-muted-2">
              Duplicate and invalid rows are never imported — they&apos;re listed above so you can fix and
              re-upload if needed.
            </span>
          </form>
        </div>
      )}

      {commitState.ok && commitState.summary && (
        <div className="rounded-md bg-positive-soft p-3 text-sm text-positive">
          Imported {commitState.summary.rowsImported} of {commitState.summary.rowsDetected} row(s).{" "}
          {commitState.summary.rowsSkippedDuplicate} skipped as duplicates,{" "}
          {commitState.summary.rowsSkippedInvalid} skipped as invalid.
        </div>
      )}
      {commitState.error && <p className="text-xs text-negative">{commitState.error}</p>}
    </div>
  );
}

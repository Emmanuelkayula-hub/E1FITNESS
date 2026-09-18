"use client";

import { ActionForm } from "@/components/forms/ActionForm";
import { Field } from "@/components/forms/Field";
import { addContribution } from "@/app/investments/actions";

export function ContributionForm({ fundId }: { fundId: string }) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <ActionForm action={addContribution} submitLabel="Record contribution">
      <input type="hidden" name="fundId" value={fundId} />
      <Field label="Date">
        <input type="date" name="date" defaultValue={today} className="input" required />
      </Field>
      <Field label="Contribution amount (K)">
        <input type="number" name="amount" step="0.01" min="0" className="input" required />
      </Field>
      <Field label="Unit price at purchase (K)">
        <input
          type="number"
          name="unitPriceAtPurchase"
          step="0.000001"
          min="0"
          className="input"
          required
        />
      </Field>
      <Field label="Fees (K, optional)">
        <input type="number" name="fees" step="0.01" min="0" defaultValue="0" className="input" />
      </Field>
      <Field label="Source (optional)">
        <input type="text" name="source" className="input" placeholder="e.g. bank statement" />
      </Field>
      <Field label="Notes (optional)">
        <input type="text" name="notes" className="input" />
      </Field>
    </ActionForm>
  );
}

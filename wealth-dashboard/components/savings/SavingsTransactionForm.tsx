"use client";

import { ActionForm } from "@/components/forms/ActionForm";
import { Field } from "@/components/forms/Field";
import { addSavingsTransaction } from "@/app/savings/actions";

export function SavingsTransactionForm({ accountId }: { accountId: string }) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <ActionForm action={addSavingsTransaction} submitLabel="Record transaction">
      <input type="hidden" name="accountId" value={accountId} />
      <Field label="Date">
        <input type="date" name="date" defaultValue={today} className="input" required />
      </Field>
      <Field label="Type">
        <select name="type" className="input" defaultValue="deposit">
          <option value="deposit">Deposit</option>
          <option value="withdrawal">Withdrawal</option>
          <option value="interest">Interest paid</option>
        </select>
      </Field>
      <Field label="Amount (K)">
        <input type="number" name="amount" step="0.01" min="0" className="input" required />
      </Field>
      <Field label="Source (optional)">
        <input type="text" name="source" className="input" />
      </Field>
      <Field label="Notes (optional)">
        <input type="text" name="notes" className="input" />
      </Field>
    </ActionForm>
  );
}

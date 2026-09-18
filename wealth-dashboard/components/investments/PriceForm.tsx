"use client";

import { ActionForm } from "@/components/forms/ActionForm";
import { Field } from "@/components/forms/Field";
import { addFundPrice } from "@/app/investments/actions";

export function PriceForm({ fundId }: { fundId: string }) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <ActionForm action={addFundPrice} submitLabel="Record price observation">
      <input type="hidden" name="fundId" value={fundId} />
      <Field label="Date observed">
        <input type="date" name="date" defaultValue={today} className="input" required />
      </Field>
      <Field label="Unit price (K)">
        <input type="number" name="unitPrice" step="0.000001" min="0" className="input" required />
      </Field>
      <Field label="Source">
        <input type="text" name="source" className="input" placeholder="e.g. fact sheet, website" required />
      </Field>
      <Field label="Source type">
        <select name="sourceType" className="input" defaultValue="MANUAL">
          <option value="OFFICIAL">Official</option>
          <option value="USER_DOCUMENT">User document</option>
          <option value="MANUAL">Manual</option>
          <option value="THIRD_PARTY">Third party</option>
        </select>
      </Field>
      <Field label="Verification status">
        <select name="verificationStatus" className="input" defaultValue="UNVERIFIED">
          <option value="VERIFIED">Verified</option>
          <option value="OFFICIAL">Official</option>
          <option value="USER_INPUT">User input</option>
          <option value="ASSUMPTION">Assumption</option>
          <option value="UNVERIFIED">Unverified</option>
          <option value="ESTIMATED">Estimated</option>
        </select>
      </Field>
      <Field label="Notes (optional)">
        <input type="text" name="notes" className="input" />
      </Field>
    </ActionForm>
  );
}

"use client";

import { ActionForm } from "@/components/forms/ActionForm";
import { Field } from "@/components/forms/Field";
import { addMarketIndexObservation } from "@/app/benchmark/actions";

export function MarketIndexForm() {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <ActionForm action={addMarketIndexObservation} submitLabel="Record LASI observation">
      <input type="hidden" name="code" value="LASI" />
      <input type="hidden" name="name" value="LuSE All Share Index" />
      <Field label="Date observed">
        <input type="date" name="date" defaultValue={today} className="input" required />
      </Field>
      <Field label="LASI level">
        <input type="number" name="level" step="0.01" min="0" className="input" required />
      </Field>
      <Field label="Source">
        <input
          type="text"
          name="source"
          className="input"
          placeholder="luse.co.zm/trading/market-data"
          required
        />
      </Field>
    </ActionForm>
  );
}

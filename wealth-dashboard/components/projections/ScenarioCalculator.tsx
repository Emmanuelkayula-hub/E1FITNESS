"use client";

import { useMemo, useState } from "react";
import { runScenario } from "@/lib/calculations/projections";
import { formatMoney } from "@/lib/format";
import { ActionForm } from "@/components/forms/ActionForm";
import { saveScenario } from "@/app/projections/actions";

const DEFAULTS = {
  name: "My scenario",
  monthlyContribution: 700,
  initialInvestment: 0,
  annualNominalReturnPercent: 10,
  annualFeePercent: 3.5,
  inflationPercent: 6.5,
  contributionGrowthPercent: 0,
  horizonYears: 10,
  savingsRatePercent: 4,
  startingSavings: 500,
  monthlySavingsContribution: 300,
};

export function ScenarioCalculator() {
  const [inputs, setInputs] = useState(DEFAULTS);

  const outputs = useMemo(() => {
    try {
      return runScenario(inputs);
    } catch {
      return null;
    }
  }, [inputs]);

  function update<K extends keyof typeof DEFAULTS>(key: K, value: string) {
    setInputs((prev) => ({ ...prev, [key]: key === "name" ? value : Number(value) || 0 }));
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <NumberField label="Monthly contribution (K)" value={inputs.monthlyContribution} onChange={(v) => update("monthlyContribution", v)} />
        <NumberField label="Initial investment (K)" value={inputs.initialInvestment} onChange={(v) => update("initialInvestment", v)} />
        <NumberField label="Annual nominal return (%)" value={inputs.annualNominalReturnPercent} onChange={(v) => update("annualNominalReturnPercent", v)} />
        <NumberField label="Annual fee (%)" value={inputs.annualFeePercent} onChange={(v) => update("annualFeePercent", v)} />
        <NumberField label="Inflation (%)" value={inputs.inflationPercent} onChange={(v) => update("inflationPercent", v)} />
        <NumberField label="Contribution growth / yr (%)" value={inputs.contributionGrowthPercent} onChange={(v) => update("contributionGrowthPercent", v)} />
        <NumberField label="Horizon (years)" value={inputs.horizonYears} onChange={(v) => update("horizonYears", v)} />
        <NumberField label="Savings rate (%)" value={inputs.savingsRatePercent} onChange={(v) => update("savingsRatePercent", v)} />
        <NumberField label="Starting savings (K)" value={inputs.startingSavings} onChange={(v) => update("startingSavings", v)} />
        <NumberField label="Monthly savings contribution (K)" value={inputs.monthlySavingsContribution} onChange={(v) => update("monthlySavingsContribution", v)} />
      </div>

      {outputs && (
        <div className="grid grid-cols-2 gap-4 rounded-md bg-surface-muted p-4 sm:grid-cols-3">
          <Stat label="Total contributions" value={formatMoney(outputs.totalContributions.toString())} />
          <Stat label="Nominal portfolio value" value={formatMoney(outputs.nominalPortfolioValue.toString())} />
          <Stat label="Investment growth" value={formatMoney(outputs.investmentGrowth.toString())} />
          <Stat label="Fees paid" value={formatMoney(outputs.feesPaid.toString())} tone="negative" />
          <Stat label="Real portfolio value" value={formatMoney(outputs.realPortfolioValue.toString())} sub="Today's purchasing power" />
          <Stat label="Savings balance" value={formatMoney(outputs.savingsBalance.toString())} />
        </div>
      )}

      <ActionForm action={saveScenario} submitLabel="Save this scenario">
        <div className="sm:col-span-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-muted">Scenario name</span>
            <input
              name="name"
              className="input"
              value={inputs.name}
              onChange={(e) => update("name", e.target.value)}
            />
          </label>
        </div>
        {Object.entries(inputs).map(([key, value]) =>
          key === "name" ? null : <input key={key} type="hidden" name={key} value={value} />
        )}
      </ActionForm>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-xs font-medium text-muted">{label}</span>
      <input
        type="number"
        className="input"
        value={value}
        step="0.1"
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "negative" }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] uppercase tracking-wide text-muted">{label}</span>
      <span className={`mono font-semibold ${tone === "negative" ? "text-negative" : "text-foreground"}`}>{value}</span>
      {sub && <span className="text-[11px] text-muted-2">{sub}</span>}
    </div>
  );
}

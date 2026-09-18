"use client";

import { useActionState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { runMonteCarloAction, type MonteCarloActionState } from "@/app/projections/monteCarloActions";
import { Field } from "@/components/forms/Field";
import { formatMoney } from "@/lib/format";

const DEFAULTS = {
  numSimulations: 10000,
  expectedAnnualReturnPercent: 10,
  annualVolatilityPercent: 20,
  annualFeePercent: 3.5,
  inflationPercent: 6.5,
  contributionGrowthPercent: 0,
  monthlyContribution: 700,
  initialInvestment: 0,
  horizonYears: 10,
};

export function MonteCarloCalculator() {
  const [state, formAction, pending] = useActionState<MonteCarloActionState, FormData>(
    runMonteCarloAction,
    { ok: false }
  );

  return (
    <div className="space-y-6">
      <p className="rounded-md bg-warning-soft px-3 py-2 text-xs text-warning">
        Illustrative stochastic scenario — not a forecast. Monthly returns are drawn from
        a Normal distribution; the model has no fat tails, mean reversion, or serial
        correlation. See /docs/ASSUMPTIONS.md.
      </p>

      <form action={formAction} className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Field label="Simulations">
          <input type="number" name="numSimulations" defaultValue={DEFAULTS.numSimulations} className="input" min={100} max={50000} />
        </Field>
        <Field label="Expected annual return (%)">
          <input type="number" name="expectedAnnualReturnPercent" defaultValue={DEFAULTS.expectedAnnualReturnPercent} step="0.1" className="input" />
        </Field>
        <Field label="Annual volatility (%)">
          <input type="number" name="annualVolatilityPercent" defaultValue={DEFAULTS.annualVolatilityPercent} step="0.1" className="input" />
        </Field>
        <Field label="Annual fee (%)">
          <input type="number" name="annualFeePercent" defaultValue={DEFAULTS.annualFeePercent} step="0.1" className="input" />
        </Field>
        <Field label="Inflation (%)">
          <input type="number" name="inflationPercent" defaultValue={DEFAULTS.inflationPercent} step="0.1" className="input" />
        </Field>
        <Field label="Contribution growth / yr (%)">
          <input type="number" name="contributionGrowthPercent" defaultValue={DEFAULTS.contributionGrowthPercent} step="0.1" className="input" />
        </Field>
        <Field label="Monthly contribution (K)">
          <input type="number" name="monthlyContribution" defaultValue={DEFAULTS.monthlyContribution} step="1" className="input" />
        </Field>
        <Field label="Initial investment (K)">
          <input type="number" name="initialInvestment" defaultValue={DEFAULTS.initialInvestment} step="1" className="input" />
        </Field>
        <Field label="Horizon (years)">
          <input type="number" name="horizonYears" defaultValue={DEFAULTS.horizonYears} step="1" className="input" />
        </Field>
        <div className="sm:col-span-3 flex items-center gap-3">
          <button type="submit" className="btn-primary" disabled={pending}>
            {pending ? "Running simulation…" : "Run simulation"}
          </button>
          {state.error && <span className="text-xs text-negative">{state.error}</span>}
        </div>
      </form>

      {state.ok && state.result && <MonteCarloResults result={state.result} />}
    </div>
  );
}

function MonteCarloResults({ result }: { result: NonNullable<MonteCarloActionState["result"]> }) {
  const chartData = [
    { label: "5th", nominal: result.nominal.p5 },
    { label: "25th", nominal: result.nominal.p25 },
    { label: "50th", nominal: result.nominal.p50 },
    { label: "75th", nominal: result.nominal.p75 },
    { label: "95th", nominal: result.nominal.p95 },
  ];

  return (
    <div className="space-y-4 border-t border-border pt-4">
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted)" }} />
            <YAxis tick={{ fontSize: 11, fill: "var(--muted)" }} />
            <Tooltip
              formatter={(v) => formatMoney(typeof v === "number" ? v : Number(v))}
              contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
            />
            <Bar dataKey="nominal" radius={[4, 4, 0, 0]}>
              {chartData.map((d, i) => (
                <Cell key={i} fill={d.label === "50th" ? "var(--accent)" : "var(--muted-2)"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Percentile</th>
              <th>Nominal portfolio value</th>
              <th>Real (inflation-adjusted) value</th>
            </tr>
          </thead>
          <tbody>
            {(["p5", "p25", "p50", "p75", "p95"] as const).map((p) => (
              <tr key={p}>
                <td>{p.replace("p", "")}th</td>
                <td className="mono">{formatMoney(result.nominal[p])}</td>
                <td className="mono">{formatMoney(result.real[p])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Total contributions" value={formatMoney(result.totalContributions)} />
        <Stat label="Worst simulated outcome" value={formatMoney(result.worstOutcome)} tone="negative" />
        <Stat label="Best simulated outcome" value={formatMoney(result.bestOutcome)} tone="positive" />
        <Stat label="Median growth" value={formatMoney(result.nominal.p50 - result.totalContributions)} />
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "positive" | "negative" }) {
  const toneClass = tone === "positive" ? "text-positive" : tone === "negative" ? "text-negative" : "text-foreground";
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] uppercase tracking-wide text-muted">{label}</span>
      <span className={`mono font-semibold ${toneClass}`}>{value}</span>
    </div>
  );
}

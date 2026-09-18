"use client";

import { useMemo, useState } from "react";
import { allocateIncome } from "@/lib/calculations/internshipPlan";
import { formatMoney, formatPercent } from "@/lib/format";

export function IncomeAllocationCalculator({
  defaultReferenceShare,
}: {
  defaultReferenceShare: number; // e.g. 0.7
}) {
  const [allocable, setAllocable] = useState(1000);

  const result = useMemo(
    () =>
      allocateIncome({
        monthlyAllocable: allocable,
        referenceEquityShare: defaultReferenceShare,
      }),
    [allocable, defaultReferenceShare]
  );

  return (
    <div className="space-y-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs font-medium text-muted">Monthly allocable amount (K)</span>
        <input
          type="number"
          className="input max-w-xs"
          value={allocable}
          min={0}
          step={50}
          onChange={(e) => setAllocable(Number(e.target.value) || 0)}
        />
      </label>
      <div className="grid grid-cols-3 gap-4 rounded-md bg-surface-muted p-4 text-sm">
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] uppercase tracking-wide text-muted">Equity</span>
          <span className="mono font-semibold">{formatMoney(result.equity.toString())}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] uppercase tracking-wide text-muted">Savings</span>
          <span className="mono font-semibold">{formatMoney(result.savings.toString())}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] uppercase tracking-wide text-muted">Equity share</span>
          <span className="mono font-semibold">
            {formatPercent(result.equityShare.toString(), { showSign: false })}
          </span>
        </div>
      </div>
      <p className={`text-xs ${result.rule === "SURVIVAL_FIRST" ? "text-warning" : "text-muted-2"}`}>
        {result.rule === "SURVIVAL_FIRST"
          ? "Survival-first: equity floored at the K100 minimum, remainder to savings. This is a descriptive split, not an instruction to invest less."
          : "Split proportionally to your reference plan's equity share."}
      </p>
    </div>
  );
}

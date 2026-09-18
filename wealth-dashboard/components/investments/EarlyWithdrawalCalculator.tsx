"use client";

import { useMemo, useState } from "react";
import { calculateEarlyWithdrawalEstimate } from "@/lib/calculations/lockIn";
import { formatDate, formatMoney } from "@/lib/format";

export interface WithdrawableLot {
  id: string;
  label: string; // e.g. "01/09/2026 — K700"
  units: string;
  totalContributed: string;
  unlockDate: string; // ISO
  isLocked: boolean;
}

export function EarlyWithdrawalCalculator({
  lots,
  currentUnitPrice,
  penaltyPercent,
}: {
  lots: WithdrawableLot[];
  currentUnitPrice: string | null;
  penaltyPercent: string;
}) {
  const lockedLots = lots.filter((l) => l.isLocked);
  const [selectedId, setSelectedId] = useState(lockedLots[0]?.id ?? "");
  const selected = lockedLots.find((l) => l.id === selectedId);

  const estimate = useMemo(() => {
    if (!selected || !currentUnitPrice) return null;
    return calculateEarlyWithdrawalEstimate({
      units: selected.units,
      currentUnitPrice,
      totalContributed: selected.totalContributed,
      penaltyPercent,
    });
  }, [selected, currentUnitPrice, penaltyPercent]);

  if (lockedLots.length === 0) {
    return (
      <p className="text-sm text-muted">No locked lots to estimate — everything is unlocked.</p>
    );
  }

  if (!currentUnitPrice) {
    return (
      <p className="text-sm text-muted">
        Record a current unit price first — an estimate needs today&apos;s value.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs font-medium text-muted">Locked lot</span>
        <select
          className="input"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
        >
          {lockedLots.map((lot) => (
            <option key={lot.id} value={lot.id}>
              {lot.label} — unlocks {formatDate(new Date(lot.unlockDate))}
            </option>
          ))}
        </select>
      </label>

      {estimate && (
        <div className="grid grid-cols-2 gap-4 rounded-md bg-surface-muted p-4 text-sm sm:grid-cols-3">
          <Stat label="Gross value" value={formatMoney(estimate.grossValue.toString())} />
          <Stat
            label={`Penalty (${penaltyPercent}%)`}
            value={`-${formatMoney(estimate.penaltyAmount.toString())}`}
            tone="negative"
          />
          <Stat
            label="Amount after penalty"
            value={formatMoney(estimate.amountAfterPenalty.toString())}
          />
          <Stat
            label="Gain/loss before penalty"
            value={formatMoney(estimate.gainLossBeforePenalty.toString())}
            tone={estimate.gainLossBeforePenalty.gte(0) ? "positive" : "negative"}
          />
          <Stat
            label="Gain/loss after penalty"
            value={formatMoney(estimate.gainLossAfterPenalty.toString())}
            tone={estimate.gainLossAfterPenalty.gte(0) ? "positive" : "negative"}
          />
        </div>
      )}
      <p className="text-xs text-muted-2">
        Estimate only — assumes the penalty applies to the full gross value. This is not
        a recommendation to withdraw.
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative";
}) {
  const toneClass = tone === "positive" ? "text-positive" : tone === "negative" ? "text-negative" : "text-foreground";
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] uppercase tracking-wide text-muted">{label}</span>
      <span className={`mono font-semibold ${toneClass}`}>{value}</span>
    </div>
  );
}

import { formatDate, formatMoney, formatUnits } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import type { LotLiquidityState } from "@/lib/calculations/lockIn";

const LIQUIDITY_LABEL: Record<LotLiquidityState, string> = {
  LOCKED: "Locked",
  UNLOCKING_SOON: "Unlocking soon",
  UNLOCKED: "Unlocked",
  UNKNOWN: "Unlock date unconfirmed",
};

const LIQUIDITY_TONE: Record<LotLiquidityState, "assumption" | "verified" | "estimated" | "unverified"> = {
  LOCKED: "assumption",
  UNLOCKING_SOON: "estimated",
  UNLOCKED: "verified",
  UNKNOWN: "unverified",
};

export interface LotRow {
  id: string;
  purchaseDate: Date;
  amount: string;
  purchasePrice: string;
  units: string;
  unlockDate: Date;
  liquidity: LotLiquidityState;
  currentValue: string | null;
}

export function LotTable({ lots }: { lots: LotRow[] }) {
  if (lots.length === 0) {
    return <p className="text-sm text-muted">No contributions recorded yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="table-base">
        <thead>
          <tr>
            <th>Date</th>
            <th>Contribution</th>
            <th>Purchase price</th>
            <th>Units</th>
            <th>Unlock date</th>
            <th>Status</th>
            <th>Current value</th>
          </tr>
        </thead>
        <tbody>
          {lots.map((lot) => (
            <tr key={lot.id}>
              <td className="mono">{formatDate(lot.purchaseDate)}</td>
              <td className="mono">{formatMoney(lot.amount)}</td>
              <td className="mono">{formatMoney(lot.purchasePrice)}</td>
              <td className="mono">{formatUnits(lot.units)}</td>
              <td className="mono">{formatDate(lot.unlockDate)}</td>
              <td>
                <Badge tone={LIQUIDITY_TONE[lot.liquidity]}>{LIQUIDITY_LABEL[lot.liquidity]}</Badge>
              </td>
              <td className="mono">{lot.currentValue ? formatMoney(lot.currentValue) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

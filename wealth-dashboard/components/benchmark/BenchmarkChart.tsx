"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { formatDate } from "@/lib/format";

export interface ChartPoint {
  date: string; // ISO
  fundIndex: number;
  indexOnly: number;
  dividendAdjusted: number;
}

export function BenchmarkChart({ points }: { points: ChartPoint[] }) {
  const data = points.map((p) => ({
    ...p,
    label: formatDate(new Date(p.date)),
  }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted)" }} />
          <YAxis tick={{ fontSize: 11, fill: "var(--muted)" }} domain={["auto", "auto"]} />
          <Tooltip
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="fundIndex" name="Fund (rebased)" stroke="var(--accent)" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="indexOnly" name="LASI, price-only (rebased)" stroke="var(--muted-2)" strokeWidth={2} dot={false} />
          <Line
            type="monotone"
            dataKey="dividendAdjusted"
            name="LASI, dividend-adjusted (approx.)"
            stroke="var(--warning)"
            strokeWidth={2}
            strokeDasharray="4 3"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

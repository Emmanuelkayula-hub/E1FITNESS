import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/currentUser";
import { getFundsForUser } from "@/lib/data/investments";
import { buildBenchmarkSeries } from "@/lib/data/benchmark";
import { Card, CardHeader, StatTile } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { MarketIndexForm } from "@/components/benchmark/MarketIndexForm";
import { BenchmarkChart, type ChartPoint } from "@/components/benchmark/BenchmarkChart";
import { formatDate, formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

const VERDICT_LABEL: Record<string, string> = {
  FUND_CLEARLY_AHEAD: "Fund clearly ahead",
  FUND_CLEARLY_BEHIND: "Fund clearly behind",
  ABOUT_LEVEL: "About level",
};

const VERDICT_TONE: Record<string, "verified" | "conflicting" | "neutral"> = {
  FUND_CLEARLY_AHEAD: "verified",
  FUND_CLEARLY_BEHIND: "conflicting",
  ABOUT_LEVEL: "neutral",
};

export default async function BenchmarkPage() {
  const user = await getCurrentUser();
  const funds = await getFundsForUser(user.id);
  const dividendObservation = await prisma.dividend.findFirst({
    where: { instrumentCode: "LASI" },
    orderBy: { exDate: "desc" },
  });
  const dividendYieldPercent = dividendObservation?.yieldPercent?.toString() ?? "4";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Benchmark</h1>
        <p className="text-sm text-muted">
          Both series are rebased to 100 at the first shared date — a K8 unit price and a
          26,000-point index cannot be compared directly. This is a performance
          comparison, not a trading recommendation.
        </p>
      </div>

      <Card>
        <CardHeader
          title="Dividend-adjusted approximation"
          subtitle="LASI is price-only. This estimated yield is compounded over elapsed time to approximate total return."
        />
        <StatTile label="Estimated LuSE dividend yield" value={`${dividendYieldPercent}%`} />
      </Card>

      <Card>
        <CardHeader title="Record a LASI observation" subtitle="luse.co.zm/trading/market-data" />
        <MarketIndexForm />
      </Card>

      {await Promise.all(
        funds.map(async (fund) => {
          const rows = await buildBenchmarkSeries({
            fundId: fund.id,
            indexCode: "LASI",
            dividendYieldPercent,
          });

          if (rows.length === 0) {
            return (
              <Card key={fund.id}>
                <CardHeader title={fund.name} />
                <p className="text-sm text-muted">
                  Not enough paired fund-price and LASI observations yet to build a
                  rebased comparison. Record at least one price for {fund.name} and one
                  LASI observation on or after it.
                </p>
              </Card>
            );
          }

          const chartPoints: ChartPoint[] = rows.map((r) => ({
            date: r.date.toISOString(),
            fundIndex: r.fundIndex.toNumber(),
            indexOnly: r.indexIndexPriceOnly.toNumber(),
            dividendAdjusted: r.dividendAdjustedIndex.toNumber(),
          }));

          const latest = rows[rows.length - 1];

          return (
            <div key={fund.id} className="space-y-4">
              <h2 className="text-lg font-semibold">{fund.name} vs LuSE All Share Index</h2>

              <Card>
                <CardHeader title="Rebased performance" subtitle={`Baseline: ${formatDate(rows[0].date)} = 100`} />
                <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <StatTile label="Fund index" value={latest.fundIndex.toFixed(2)} />
                  <StatTile label="LASI, price-only" value={latest.indexIndexPriceOnly.toFixed(2)} />
                  <StatTile label="Raw gap (points)" value={latest.rawGap.toFixed(2)} />
                  <StatTile
                    label="Fair gap (dividend-adjusted)"
                    value={latest.fairGap.toFixed(2)}
                    tone={latest.fairGap.gte(0) ? "positive" : "negative"}
                  />
                </div>
                <div className="mb-4">
                  <Badge tone={VERDICT_TONE[latest.verdict]}>{VERDICT_LABEL[latest.verdict]}</Badge>
                </div>
                <BenchmarkChart points={chartPoints} />
              </Card>

              <Card>
                <CardHeader title="Detail table" />
                <div className="overflow-x-auto">
                  <table className="table-base">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Fund price</th>
                        <th>LASI</th>
                        <th>Fund rebased</th>
                        <th>LASI rebased</th>
                        <th>Raw gap</th>
                        <th>LASI + dividends</th>
                        <th>Fair gap</th>
                        <th>Verdict</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.date.toISOString()}>
                          <td className="mono">{formatDate(r.date)}</td>
                          <td className="mono">{formatMoney(r.fundPrice.toString())}</td>
                          <td className="mono">{r.indexLevel.toFixed(2)}</td>
                          <td className="mono">{r.fundIndex.toFixed(2)}</td>
                          <td className="mono">{r.indexIndexPriceOnly.toFixed(2)}</td>
                          <td className="mono">{r.rawGap.toFixed(2)}</td>
                          <td className="mono">{r.dividendAdjustedIndex.toFixed(2)}</td>
                          <td className="mono">{r.fairGap.toFixed(2)}</td>
                          <td>
                            <Badge tone={VERDICT_TONE[r.verdict]}>{VERDICT_LABEL[r.verdict]}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          );
        })
      )}
    </div>
  );
}

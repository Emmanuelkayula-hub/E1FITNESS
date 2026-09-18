import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/currentUser";
import { Card, CardHeader } from "@/components/ui/Card";
import { ScenarioCalculator } from "@/components/projections/ScenarioCalculator";
import { MonteCarloCalculator } from "@/components/projections/MonteCarloCalculator";
import { formatDate, formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ProjectionsPage() {
  const user = await getCurrentUser();
  const scenarios = await prisma.scenario.findMany({
    where: { userId: user.id },
    include: { results: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Projections</h1>
        <p className="text-sm text-muted">
          Interactive scenario engine. Fee is modelled as a straight annual drag on
          return; see /docs/ASSUMPTIONS.md for the fee-treatment and contribution-timing
          conventions used here.
        </p>
      </div>

      <Card>
        <CardHeader title="Scenario calculator" />
        <ScenarioCalculator />
      </Card>

      <Card>
        <CardHeader
          title="Monte Carlo simulation"
          subtitle="Default 10,000 simulations. Runs server-side so the browser never freezes."
        />
        <MonteCarloCalculator />
      </Card>

      {scenarios.length > 0 && (
        <Card>
          <CardHeader title="Saved scenarios" />
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Saved</th>
                  <th>Monthly</th>
                  <th>Return</th>
                  <th>Horizon</th>
                  <th>Nominal value</th>
                  <th>Real value</th>
                </tr>
              </thead>
              <tbody>
                {scenarios.map((s) => {
                  const result = s.results[0];
                  return (
                    <tr key={s.id}>
                      <td>{s.name}</td>
                      <td className="mono">{formatDate(s.createdAt)}</td>
                      <td className="mono">{formatMoney(s.monthlyContribution.toString())}</td>
                      <td className="mono">{s.annualNominalReturnPercent.toString()}%</td>
                      <td className="mono">{s.horizonYears}y</td>
                      <td className="mono">{result ? formatMoney(result.nominalPortfolioValue.toString()) : "—"}</td>
                      <td className="mono">{result ? formatMoney(result.realPortfolioValue.toString()) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

import { getCurrentUser } from "@/lib/currentUser";
import { getDataSourcesForUser, getConflictsForUser, getFundResearchProfiles } from "@/lib/data/research";
import { Card, CardHeader, StatTile } from "@/components/ui/Card";
import { Badge, VerificationBadge } from "@/components/ui/Badge";
import { ConflictResolutionForm } from "@/components/research/ConflictResolutionForm";
import { formatDate, formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Open",
  REVIEWED: "Reviewed",
  ACCEPTED_A: "Resolved — accepted source A",
  ACCEPTED_B: "Resolved — accepted source B",
  KEPT_BOTH: "Resolved — kept both",
  MARKED_STALE: "Resolved — marked stale",
};

export default async function ResearchPage() {
  const user = await getCurrentUser();
  const funds = await getFundResearchProfiles(user.id);
  const openConflicts = await getConflictsForUser(user.id, "OPEN");
  const resolvedConflicts = (await getConflictsForUser(user.id)).filter(
    (c) => c.conflict.status !== "OPEN"
  );
  const sources = await getDataSourcesForUser(user.id);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Research</h1>
        <p className="text-sm text-muted">
          Fund research profiles, source provenance, and open data conflicts. Nothing here
          is silently overwritten.
        </p>
      </div>

      <Card>
        <CardHeader title="Data conflicts" subtitle={`${openConflicts.length} open`} />
        {openConflicts.length === 0 ? (
          <p className="text-sm text-muted">No open conflicts.</p>
        ) : (
          <div className="space-y-6">
            {openConflicts.map(({ conflict, obsA, obsB }) => (
              <div key={conflict.id} className="rounded-md border border-negative/30 bg-negative-soft p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Badge tone="conflicting">DATA CONFLICT</Badge>
                  <span className="text-sm font-semibold">
                    {conflict.entityType} — {conflict.field}
                  </span>
                </div>
                <div className="mb-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <ObservationCard label="Source A" obs={obsA} />
                  <ObservationCard label="Source B" obs={obsB} />
                </div>
                {conflict.difference && (
                  <p className="mb-3 text-sm text-muted">
                    Difference: <span className="mono font-semibold">{conflict.difference.toString()}</span>
                  </p>
                )}
                {conflict.resolutionNote && (
                  <p className="mb-3 text-xs italic text-muted-2">{conflict.resolutionNote}</p>
                )}
                <ConflictResolutionForm conflictId={conflict.id} />
              </div>
            ))}
          </div>
        )}
      </Card>

      {resolvedConflicts.length > 0 && (
        <Card>
          <CardHeader title="Resolved conflicts" subtitle="Audit trail — every resolution is logged." />
          <table className="table-base">
            <thead>
              <tr>
                <th>Field</th>
                <th>Status</th>
                <th>Resolved</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {resolvedConflicts.map(({ conflict }) => (
                <tr key={conflict.id}>
                  <td>
                    {conflict.entityType} — {conflict.field}
                  </td>
                  <td>{STATUS_LABEL[conflict.status]}</td>
                  <td className="mono">{conflict.resolvedAt ? formatDate(conflict.resolvedAt) : "—"}</td>
                  <td className="text-muted">{conflict.resolutionNote ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Card>
        <CardHeader title="Fund research profiles" subtitle="Historical, sourced snapshots — never treated as today's live value." />
        {funds.map((fund) => (
          <div key={fund.id} className="mb-4 border-b border-border pb-4 last:border-none last:pb-0">
            <h3 className="mb-2 text-sm font-semibold">{fund.name}</h3>
            {fund.researchProfile ? (
              <>
                <div className="mb-2 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <StatTile
                    label="Unit price"
                    value={fund.researchProfile.unitPrice ? formatMoney(fund.researchProfile.unitPrice.toString()) : "—"}
                  />
                  <StatTile
                    label="12-month return"
                    value={
                      fund.researchProfile.twelveMonthReturnPercent
                        ? `${fund.researchProfile.twelveMonthReturnPercent.toString()}%`
                        : "—"
                    }
                  />
                  <StatTile
                    label="Annual fee"
                    value={
                      fund.researchProfile.annualFeePercent
                        ? `${fund.researchProfile.annualFeePercent.toString()}%`
                        : "—"
                    }
                  />
                  <StatTile label="Observed" value={formatDate(fund.researchProfile.observationDate)} />
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                  <VerificationBadge status={fund.researchProfile.verificationStatus} />
                  <span>{fund.researchProfile.source}</span>
                </div>
                {fund.researchProfile.notes && (
                  <p className="mt-2 text-xs text-muted-2">{fund.researchProfile.notes}</p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted">No research profile recorded.</p>
            )}
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted sm:grid-cols-4">
              <div>
                <dt className="text-muted-2">Custodian</dt>
                <dd>{fund.custodian ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-2">Trustee</dt>
                <dd>{fund.trustee ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-2">Regulator</dt>
                <dd>{fund.regulator ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-2">Minimum investment</dt>
                <dd>{formatMoney(fund.minimumInvestment.toString())}</dd>
              </div>
            </dl>
          </div>
        ))}
      </Card>

      <Card>
        <CardHeader title="Sources" subtitle="Every important number should trace back to one of these." />
        <table className="table-base">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Reliability</th>
              <th>Last checked</th>
              <th>Observations</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((source) => (
              <tr key={source.id}>
                <td>{source.name}</td>
                <td className="capitalize">{source.sourceType.replace(/_/g, " ").toLowerCase()}</td>
                <td className="text-muted">{source.reliability ?? "—"}</td>
                <td className="mono">{source.lastChecked ? formatDate(source.lastChecked) : "—"}</td>
                <td className="mono">{source.observations.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function ObservationCard({
  label,
  obs,
}: {
  label: string;
  obs: { value: string; unit: string | null; observedAt: Date; verificationStatus: string; source: { name: string } } | null;
}) {
  if (!obs) return <div className="text-sm text-muted">{label}: not found</div>;
  return (
    <div className="rounded-md bg-surface p-3">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mono text-lg font-semibold">
        {obs.value}
        {obs.unit}
      </p>
      <p className="text-xs text-muted">{obs.source.name}</p>
      <p className="text-xs text-muted-2">{formatDate(obs.observedAt)}</p>
      <VerificationBadge status={obs.verificationStatus} />
    </div>
  );
}

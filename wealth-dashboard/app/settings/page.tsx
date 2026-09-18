import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/currentUser";
import { Card, CardHeader } from "@/components/ui/Card";
import { ActionForm } from "@/components/forms/ActionForm";
import { Field } from "@/components/forms/Field";
import { updateProfileSettings, updateFundSettings } from "./actions";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const funds = await prisma.investmentFund.findMany({ where: { userId: user.id } });
  const profile = user.profile;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-muted">
          Currency, assumptions and lock methodology. Changing these is recorded to the
          audit log.
        </p>
      </div>

      <Card>
        <CardHeader
          title="Profile & assumptions"
          subtitle="Timezone Africa/Lusaka. Date format DD/MM/YYYY."
        />
        <ActionForm action={updateProfileSettings} submitLabel="Save profile settings">
          <Field label="Currency">
            <input
              name="currency"
              defaultValue={profile?.currency ?? "ZMW"}
              className="input"
            />
          </Field>
          <Field label="Monthly essential expenses (K)">
            <input
              name="monthlyEssentials"
              type="number"
              step="0.01"
              defaultValue={profile?.monthlyEssentials.toString() ?? "0"}
              className="input"
            />
          </Field>
          <Field label="Emergency fund target (months)">
            <input
              name="emergencyFundMonthsTarget"
              type="number"
              step="0.5"
              defaultValue={profile?.emergencyFundMonthsTarget.toString() ?? "6"}
              className="input"
            />
          </Field>
          <Field label="Inflation assumption (fraction, e.g. 0.065 = 6.5%)">
            <input
              name="inflationAssumption"
              type="number"
              step="0.001"
              defaultValue={profile?.inflationAssumption.toString() ?? "0.065"}
              className="input"
            />
          </Field>
        </ActionForm>
      </Card>

      {funds.map((fund) => (
        <Card key={fund.id}>
          <CardHeader
            title={`${fund.name} — fund settings`}
            subtitle="Lock-in methodology is a planning assumption. Confirm with the fund manager."
          />
          <ActionForm action={updateFundSettings} submitLabel="Save fund settings">
            <input type="hidden" name="fundId" value={fund.id} />
            <Field label="Annual management fee (%)">
              <input
                name="annualFeePercent"
                type="number"
                step="0.01"
                defaultValue={fund.annualFeePercent.toString()}
                className="input"
              />
            </Field>
            <Field label="Early withdrawal penalty (%)">
              <input
                name="earlyWithdrawalPenaltyPercent"
                type="number"
                step="0.01"
                defaultValue={fund.earlyWithdrawalPenaltyPercent.toString()}
                className="input"
              />
            </Field>
            <Field label="Minimum holding period (months)">
              <input
                name="minimumHoldingMonths"
                type="number"
                step="1"
                defaultValue={fund.minimumHoldingMonths}
                className="input"
              />
            </Field>
            <Field label="Lock-in methodology">
              <select
                name="lockMethodology"
                defaultValue={fund.lockMethodology}
                className="input"
              >
                <option value="PER_CONTRIBUTION">Per contribution (default assumption)</option>
                <option value="FROM_FIRST_INVESTMENT">From first investment</option>
                <option value="CUSTOM">Custom</option>
                <option value="UNKNOWN">Unknown / awaiting confirmation</option>
              </select>
            </Field>
            <div className="sm:col-span-2 rounded-md bg-warning-soft px-3 py-2 text-xs text-warning">
              Planning assumption — confirm the actual lock-in mechanics with Longhorn
              (WhatsApp 0770668766) before relying on unlock dates.
            </div>
          </ActionForm>
        </Card>
      ))}
    </div>
  );
}

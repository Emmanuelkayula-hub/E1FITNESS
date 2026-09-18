import { getCurrentUser } from "@/lib/currentUser";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  return (
    <div className="space-y-2">
      <h1 className="text-xl font-semibold">Welcome, {user.name ?? user.email}</h1>
      <p className="text-sm text-muted">
        Full net-worth, liquidity and career aggregation is built in a later phase of this
        session. See the task list / final report for status.
      </p>
    </div>
  );
}

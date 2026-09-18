import { getCurrentUser } from "@/lib/currentUser";
import { getSavingsAccountsForUser } from "@/lib/data/savings";
import { toCsv } from "@/lib/csv";
import { formatDate } from "@/lib/format";

export async function GET() {
  const user = await getCurrentUser();
  const accounts = await getSavingsAccountsForUser(user.id);

  const rows = accounts.flatMap((account) =>
    account.transactions.map((tx) => ({
      account: account.name,
      date: formatDate(tx.date),
      type: tx.type,
      amount: tx.amount.toString(),
      balanceAfter: tx.balanceAfter?.toString() ?? "",
      source: tx.source ?? "",
      notes: tx.notes ?? "",
    }))
  );

  const csv = toCsv(rows);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="savings-transactions.csv"',
    },
  });
}

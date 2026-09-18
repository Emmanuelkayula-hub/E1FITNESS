import { getCurrentUser } from "@/lib/currentUser";
import { prisma } from "@/lib/prisma";
import { toCsv } from "@/lib/csv";
import { formatDate } from "@/lib/format";

export async function GET() {
  const user = await getCurrentUser();
  const contributions = await prisma.contribution.findMany({
    where: { userId: user.id },
    include: { fund: true },
    orderBy: { date: "asc" },
  });

  const csv = toCsv(
    contributions.map((c) => ({
      date: formatDate(c.date),
      fund: c.fund.name,
      amount: c.amount.toString(),
      unitPriceAtPurchase: c.unitPriceAtPurchase.toString(),
      fees: c.fees.toString(),
      netInvested: c.netInvested.toString(),
      source: c.source ?? "",
      notes: c.notes ?? "",
    }))
  );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="investment-transactions.csv"',
    },
  });
}

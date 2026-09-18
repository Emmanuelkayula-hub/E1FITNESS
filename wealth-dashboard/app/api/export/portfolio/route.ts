import { getCurrentUser } from "@/lib/currentUser";
import { getFundsForUser } from "@/lib/data/investments";
import { toCsv } from "@/lib/csv";
import { formatDate } from "@/lib/format";

export async function GET() {
  const user = await getCurrentUser();
  const funds = await getFundsForUser(user.id);

  const rows = funds.flatMap((fund) =>
    fund.lots.map((lot) => ({
      fund: fund.name,
      purchaseDate: formatDate(lot.purchaseDate),
      contribution: lot.contribution.amount.toString(),
      purchasePrice: lot.purchasePrice.toString(),
      units: lot.units.toString(),
      unlockDate: formatDate(lot.unlockDate),
      lockMethodology: fund.lockMethodology,
    }))
  );

  const csv = toCsv(rows);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="portfolio-lots.csv"',
    },
  });
}

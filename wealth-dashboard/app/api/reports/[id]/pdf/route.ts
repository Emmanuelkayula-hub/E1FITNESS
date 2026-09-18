import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/currentUser";
import { renderReportPdf } from "@/lib/pdf/reportPdf";
import type { ReportSnapshot } from "@/lib/data/reports";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();

  const report = await prisma.report.findFirst({ where: { id, userId: user.id } });
  if (!report) {
    return new Response("Report not found.", { status: 404 });
  }

  const snapshot = report.snapshot as unknown as ReportSnapshot;
  const pdfBuffer = await renderReportPdf(snapshot, report.type as "monthly" | "quarterly");

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="ek-wealth-${report.type}-report-${formatDateForFilename(
        report.generatedAt
      )}.pdf"`,
    },
  });
}

function formatDateForFilename(d: Date): string {
  return d.toISOString().slice(0, 10);
}

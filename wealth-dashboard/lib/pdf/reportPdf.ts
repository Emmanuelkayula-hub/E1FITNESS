/**
 * Server-side PDF rendering for a generated report (spec §87). Uses
 * pdfkit directly (a streaming PDF writer) rather than rendering HTML
 * and printing it, so this runs the same way in any Node environment
 * (including serverless) without a headless browser dependency.
 */
import PDFDocument from "pdfkit";
import type { ReportSnapshot } from "@/lib/data/reports";
import { formatDate, formatMoney, formatPercent } from "@/lib/format";

const INK = "#14171f";
const MUTED = "#5b6472";
const ACCENT = "#1e4ed8";
const LINE = "#d8dce3";

function money(v: string | number | null) {
  if (v === null) return "—";
  return formatMoney(v);
}

export function renderReportPdf(snapshot: ReportSnapshot, reportType: "monthly" | "quarterly"): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 48, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    // Header
    doc.fillColor(ACCENT).font("Helvetica-Bold").fontSize(18).text("EK Wealth & Career Dashboard");
    doc.fillColor(MUTED).font("Helvetica").fontSize(10);
    doc.text(
      `${reportType === "monthly" ? "Monthly" : "Quarterly"} report — ${formatDate(
        snapshot.periodStart
      )} to ${formatDate(snapshot.periodEnd)}`
    );
    doc.moveDown(1);
    rule(doc, pageWidth);

    sectionTitle(doc, "Financial summary");
    statRow(doc, pageWidth, [
      ["Net worth", money(snapshot.financial.netWorth)],
      ["Investment value", money(snapshot.financial.investmentValue)],
      ["Savings", money(snapshot.financial.savingsBalance)],
      ["Unrealised gain/loss", money(snapshot.financial.unrealizedGainLoss)],
    ]);

    sectionTitle(doc, "Investment");
    if (snapshot.investments.length === 0) {
      bodyText(doc, "No investments recorded this period.");
    } else {
      table(
        doc,
        pageWidth,
        ["Fund", "Contributions", "Current value", "Simple return", "XIRR"],
        snapshot.investments.map((inv) => [
          inv.fundName,
          money(inv.contributions),
          inv.currentValue ? money(inv.currentValue) : "—",
          inv.simpleReturn ? formatPercent(inv.simpleReturn) : "—",
          inv.xirr !== null ? formatPercent(inv.xirr) : "—",
        ])
      );
    }

    sectionTitle(doc, "Liquidity");
    statRow(doc, pageWidth, [
      ["Accessible now", money(snapshot.liquidity.accessibleNow)],
      ["Locked", money(snapshot.liquidity.locked)],
      [
        "Next unlock",
        snapshot.liquidity.nextUnlock
          ? `${money(snapshot.liquidity.nextUnlock.amount)} on ${formatDate(snapshot.liquidity.nextUnlock.date)}`
          : "None pending",
      ],
    ]);

    sectionTitle(doc, "Savings");
    statRow(doc, pageWidth, [
      ...snapshot.savings.map((s): [string, string] => [s.accountName, money(s.balance)]),
      [
        "Emergency fund coverage",
        `${formatPercent(snapshot.emergencyFund.percentageFunded, { alreadyPercent: true })} of ${money(
          snapshot.emergencyFund.target
        )}`,
      ],
    ]);

    sectionTitle(doc, "Career");
    if (snapshot.career.length === 0) {
      bodyText(doc, "No exams tracked this period.");
    } else {
      table(
        doc,
        pageWidth,
        ["Exam", "Study hours", "Questions/hour", "Mock average"],
        snapshot.career.map((c) => [
          c.examName,
          Number(c.studyHours).toFixed(1),
          Number(c.questionsPerHour).toFixed(2),
          c.mockAverage ? `${Number(c.mockAverage).toFixed(1)}%` : "—",
        ])
      );
    }

    sectionTitle(doc, "Data quality");
    statRow(doc, pageWidth, [
      ["Open data conflicts", String(snapshot.dataQuality.openConflicts)],
      ["Unverified/stale prices", String(snapshot.dataQuality.unverifiedPrices)],
      ["Funds missing a price", String(snapshot.dataQuality.fundsWithoutPrice)],
    ]);

    sectionTitle(doc, "Assumptions");
    bodyText(
      doc,
      "Fee drag is modelled as a straight subtraction from the annual return. Inflation, " +
        "expected return, and volatility are user-set planning inputs, not guarantees. " +
        "Lock-in methodology and the fund's true fee structure are unconfirmed with the " +
        "fund manager — see /docs/ASSUMPTIONS.md in the application for the full list."
    );

    doc.moveDown(1);
    rule(doc, pageWidth);
    doc.moveDown(0.5);
    doc
      .fillColor(MUTED)
      .font("Helvetica-Oblique")
      .fontSize(9)
      .text(
        "This report is a personal tracking and analytical report. It is not investment advice.",
        { width: pageWidth }
      );
    doc.text(`Generated ${formatDate(snapshot.generatedAt)}.`, { width: pageWidth });

    doc.end();
  });
}

function rule(doc: PDFKit.PDFDocument, width: number) {
  const y = doc.y;
  doc.strokeColor(LINE).lineWidth(0.5).moveTo(doc.x, y).lineTo(doc.x + width, y).stroke();
  doc.moveDown(0.5);
}

function sectionTitle(doc: PDFKit.PDFDocument, title: string) {
  doc.moveDown(0.75);
  doc.fillColor(INK).font("Helvetica-Bold").fontSize(12).text(title.toUpperCase(), { characterSpacing: 0.5 });
  doc.moveDown(0.25);
}

function bodyText(doc: PDFKit.PDFDocument, text: string) {
  doc.fillColor(INK).font("Helvetica").fontSize(9.5).text(text, { width: doc.page.width - doc.page.margins.left - doc.page.margins.right });
}

function statRow(doc: PDFKit.PDFDocument, width: number, stats: [string, string][]) {
  const colWidth = width / Math.min(stats.length, 3);
  const startX = doc.x;
  let x = startX;
  let rowY = doc.y;
  stats.forEach(([label, value], i) => {
    if (i > 0 && i % 3 === 0) {
      x = startX;
      rowY = doc.y;
    }
    doc.fillColor(MUTED).font("Helvetica").fontSize(8).text(label.toUpperCase(), x, rowY, { width: colWidth - 10 });
    doc
      .fillColor(INK)
      .font("Helvetica-Bold")
      .fontSize(11)
      .text(value, x, rowY + 12, { width: colWidth - 10 });
    x += colWidth;
  });
  doc.y = rowY + 34;
  doc.x = startX;
}

function table(doc: PDFKit.PDFDocument, width: number, headers: string[], rows: string[][]) {
  const colWidth = width / headers.length;
  const startX = doc.x;
  let y = doc.y;

  doc.font("Helvetica-Bold").fontSize(8).fillColor(MUTED);
  headers.forEach((h, i) => doc.text(h.toUpperCase(), startX + i * colWidth, y, { width: colWidth - 6 }));
  y += 14;
  doc.strokeColor(LINE).lineWidth(0.5).moveTo(startX, y).lineTo(startX + width, y).stroke();
  y += 4;

  doc.font("Helvetica").fontSize(9).fillColor(INK);
  for (const row of rows) {
    row.forEach((cell, i) => doc.text(cell, startX + i * colWidth, y, { width: colWidth - 6 }));
    y += 16;
  }

  doc.y = y + 4;
  doc.x = startX;
}

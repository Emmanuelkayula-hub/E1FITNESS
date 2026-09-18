import { test, expect } from "@playwright/test";

test.describe("Reports", () => {
  test("generating a monthly report adds it to history with a working PDF link", async ({ page }) => {
    await page.goto("/reports");
    await page.getByRole("button", { name: "Generate monthly report" }).click();
    await expect(page.getByRole("heading", { name: "Report history" })).toBeVisible({ timeout: 10_000 });

    const firstRow = page.locator("table tbody tr").first();
    await expect(firstRow).toContainText("monthly");
    const pdfLink = firstRow.getByRole("link", { name: "Download" });
    await expect(pdfLink).toBeVisible();

    const href = await pdfLink.getAttribute("href");
    expect(href).toMatch(/^\/api\/reports\/.+\/pdf$/);

    const response = await page.request.get(href!);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("application/pdf");
    const body = await response.body();
    expect(body.slice(0, 4).toString()).toBe("%PDF");
  });

  test("the latest report's snapshot figures match the dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    // The "Net worth" card's StatTile is labelled "Total" — walk up from the
    // "Net worth" heading to its Card container (the nearest ancestor div
    // that also has a value span), then read that value directly.
    const netWorthHeading = page.getByRole("heading", { name: "Net worth", exact: true });
    const netWorthCard = netWorthHeading.locator('xpath=ancestor::div[.//span[contains(@class,"mono")]][1]');
    const netWorthValue = await netWorthCard.locator("span.mono").first().innerText();
    expect(netWorthValue).toMatch(/^K[\d,]+\.\d{2}$/);

    await page.goto("/reports");
    const reportBody = await page.locator("body").innerText();
    expect(reportBody).toContain(netWorthValue);
  });

  test("CSV export endpoints return real CSV content", async ({ page }) => {
    for (const path of ["/api/export/transactions", "/api/export/portfolio", "/api/export/savings", "/api/export/career"]) {
      const response = await page.request.get(path);
      expect(response.status()).toBe(200);
      expect(response.headers()["content-type"]).toContain("text/csv");
    }
  });
});

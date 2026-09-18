import { test, expect } from "@playwright/test";

test.describe("Investments", () => {
  test("recording a contribution creates a new lot in the ledger", async ({ page }) => {
    await page.goto("/investments");
    await expect(page.getByRole("heading", { name: "Longhorn Associates Equity Fund" })).toBeVisible();

    // A unique amount per run (rather than a fixed value) so re-running
    // this test against the same real dev database never collides with a
    // row a previous run already inserted.
    const marker = `e2e-${Date.now()}`;
    // Kept under 1000 so formatMoney never adds a thousands separator,
    // which would break the plain-string table-cell match below.
    const amount = (100 + (Date.now() % 89900) / 100).toFixed(2);
    const form = page.locator("form", { has: page.getByRole("button", { name: "Record contribution" }) });
    await form.locator('input[name="date"]').fill("2030-01-15");
    await form.locator('input[name="amount"]').fill(amount);
    await form.locator('input[name="unitPriceAtPurchase"]').fill("9.50");
    await form.locator('input[name="source"]').fill(marker);
    await form.getByRole("button", { name: "Record contribution" }).click();

    await expect(page.getByText("Saved.").first()).toBeVisible({ timeout: 10_000 });
    await page.reload();

    const lotRow = page.locator("tr", { hasText: `K${amount}` });
    await expect(lotRow).toBeVisible();
    await expect(lotRow).toContainText("15/01/2030");
    const expectedUnits = (parseFloat(amount) / 9.5).toFixed(2);
    await expect(lotRow).toContainText(expectedUnits.slice(0, expectedUnits.length - 1)); // tolerate final-digit rounding
  });

  test("early withdrawal calculator shows a penalty for a locked lot", async ({ page }) => {
    await page.goto("/investments");
    await expect(page.getByRole("heading", { name: "Early withdrawal calculator" })).toBeVisible();
    await expect(page.getByText(/Penalty \(\d/).first()).toBeVisible();
    await expect(page.getByText("Amount after penalty")).toBeVisible();
  });
});

import { test, expect } from "@playwright/test";

test.describe("Savings", () => {
  test("recording a deposit updates the running balance", async ({ page }) => {
    await page.goto("/savings");
    await expect(page.getByRole("heading", { name: "FNB Savings Pocket" })).toBeVisible();

    const balanceText = await page.getByText("Balance", { exact: true }).first().locator("..").innerText();
    const before = parseFloat(balanceText.replace(/[^\d.]/g, ""));

    const form = page.locator("form", { has: page.getByRole("button", { name: "Record transaction" }) });
    await form.locator('select[name="type"]').selectOption("deposit");
    await form.locator('input[name="amount"]').fill("42.00");
    await form.getByRole("button", { name: "Record transaction" }).click();

    await expect(page.getByText("Saved.").first()).toBeVisible({ timeout: 10_000 });
    await page.reload();

    await expect(page.locator("body")).toContainText(`K${(before + 42).toFixed(2)}`);
  });

  test("income allocation calculator applies the survival-first floor for a small amount", async ({ page }) => {
    await page.goto("/savings");
    // The allocable-amount input is the only number input on this page
    // without a `name` attribute (every form field elsewhere has one).
    const calculatorInput = page.locator('input[type="number"]:not([name])');
    await calculatorInput.fill("150");
    await expect(page.getByText(/Survival-first/i)).toBeVisible();
  });
});

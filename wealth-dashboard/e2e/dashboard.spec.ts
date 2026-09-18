import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test("loads and shows net worth built from real aggregated data", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /welcome/i })).toBeVisible();
    await expect(page.getByText("Net worth")).toBeVisible();
    // The stat tile renders a K-prefixed money figure, not a placeholder.
    await expect(page.locator("body")).toContainText(/K[\d,]+\.\d{2}/);
  });

  test("nav shell links to every module", async ({ page }) => {
    await page.goto("/dashboard");
    for (const [label, path] of [
      ["Investments", "/investments"],
      ["Savings", "/savings"],
      ["Benchmark", "/benchmark"],
      ["Projections", "/projections"],
      ["Research", "/research"],
      ["Career", "/career"],
      ["Reports", "/reports"],
      ["Settings", "/settings"],
    ] as const) {
      await page.getByRole("link", { name: label, exact: true }).first().click();
      await expect(page).toHaveURL(new RegExp(path.replace("/", "\\/")));
    }
  });
});

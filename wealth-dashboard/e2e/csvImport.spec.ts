import { test, expect } from "@playwright/test";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

test.describe("CSV import", () => {
  test("previews a LASI observations CSV and classifies rows correctly", async ({ page }) => {
    const dir = mkdtempSync(path.join(tmpdir(), "e2e-csv-"));
    const filePath = path.join(dir, "lasi.csv");
    const stamp = Date.now(); // unique level so this row is never a duplicate across runs
    writeFileSync(
      filePath,
      ["Date,LASI Level,Source", `2031-06-01,${stamp}.5,e2e-test`, "2031-06-02,not-a-number,e2e-test"].join("\n")
    );

    await page.goto("/reports");
    await page.locator('select[name="importType"]').selectOption("lasi_observations");
    await page.locator('input[name="file"]').setInputFiles(filePath);
    await page.getByRole("button", { name: "Preview" }).click();

    await expect(page.getByText(/row\(s\) detected/)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("1 valid", { exact: true })).toBeVisible();
    await expect(page.getByText("1 invalid", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: /Import 1 valid row/ }).click();
    await expect(page.getByText(/Imported 1 of 2 row/)).toBeVisible({ timeout: 10_000 });
  });
});

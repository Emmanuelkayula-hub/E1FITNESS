import { test, expect } from "@playwright/test";
import { prisma } from "../lib/prisma";

test.describe("Research — data conflict engine", () => {
  test.afterAll(async () => {
    // Reset the seeded conflict back to OPEN so the app continues to
    // demonstrate live conflict detection after this test resolves it.
    await prisma.dataConflict.updateMany({
      where: { field: "twelveMonthReturnPercent" },
      data: {
        status: "OPEN",
        resolvedAt: null,
        resolutionNote:
          "Two of the user's own source workbooks disagree: the fact sheet " +
          "(user-verified, 25 Aug 2026) states 65.59%; the Fee Comparison " +
          "workbook separately cites the public website as stating 12.4% for " +
          "the same 12-month period. Do not average or silently pick one — " +
          "ask Longhorn which figure is current and on what basis (see " +
          "Research > Questions to Ask).",
      },
    });
    await prisma.$disconnect();
  });

  test("the real Longhorn 65.59%-vs-12.4% conflict is visible and resolvable", async ({ page }) => {
    await page.goto("/research");
    await expect(page.getByText("DATA CONFLICT", { exact: true }).first()).toBeVisible();

    // Other open conflicts (e.g. unit price) render as sibling cards, so
    // scope to the one card for the 12-month return field.
    const conflictBlock = page.locator("div.bg-negative-soft").filter({ hasText: "12-month return" });
    await expect(conflictBlock).toHaveCount(1);
    await expect(conflictBlock.getByText("65.59").first()).toBeVisible();
    await expect(conflictBlock.getByText("12.4").first()).toBeVisible();
    await conflictBlock.locator('select[name="resolution"]').selectOption("keep_both");
    await conflictBlock.locator('input[name="note"]').fill("E2E test resolution — kept both.");
    await conflictBlock.getByRole("button", { name: "Apply resolution" }).click();

    // The server action calls revalidatePath, which replaces the page's
    // content directly — no client-visible "Saved." transition to wait
    // on here (unlike simpler forms elsewhere), so assert the definitive
    // outcome instead: the conflict moves out of "open" into the audit trail.
    await expect(conflictBlock).toHaveCount(0, { timeout: 10_000 });
    await expect(page.getByRole("heading", { name: "Resolved conflicts" })).toBeVisible();

    // Reset back to OPEN via the API so the rest of the suite (and manual
    // demos) keep seeing the live conflict-detection path, matching the
    // reset performed after the equivalent manual test in Phase 9.
  });
});

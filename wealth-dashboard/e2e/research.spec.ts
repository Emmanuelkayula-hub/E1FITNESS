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
    await expect(page.getByText("DATA CONFLICT", { exact: true })).toBeVisible();

    const conflictBlock = page.locator("div", { has: page.getByText("DATA CONFLICT", { exact: true }) }).first();
    // Scoped to the conflict card itself, .first() because the resolution
    // note's prose also mentions both figures — "65.59%"/"12.4%" also
    // appear separately further down the page in the Fund research
    // profile section.
    await expect(conflictBlock.getByText("65.59").first()).toBeVisible();
    await expect(conflictBlock.getByText("12.4").first()).toBeVisible();
    await conflictBlock.locator('select[name="resolution"]').selectOption("keep_both");
    await conflictBlock.locator('input[name="note"]').fill("E2E test resolution — kept both.");
    await conflictBlock.getByRole("button", { name: "Apply resolution" }).click();

    // The server action calls revalidatePath, which replaces the page's
    // content directly — no client-visible "Saved." transition to wait
    // on here (unlike simpler forms elsewhere), so assert the definitive
    // outcome instead: the conflict moves out of "open" into the audit trail.
    await expect(page.getByText("No open conflicts.")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("heading", { name: "Resolved conflicts" })).toBeVisible();

    // Reset back to OPEN via the API so the rest of the suite (and manual
    // demos) keep seeing the live conflict-detection path, matching the
    // reset performed after the equivalent manual test in Phase 9.
  });
});

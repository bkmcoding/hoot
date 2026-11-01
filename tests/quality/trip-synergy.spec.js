import { expect, test } from "@playwright/test";

async function loadBusyHousehold(page) {
  await page.goto("/");
  await page.locator("#sample-select").selectOption("busy");
  await page
    .locator("#confirm-dialog")
    .getByRole("button", { name: "Switch sample" })
    .click();
  await expect(page.locator("body")).toHaveAttribute("data-sample", "busy");
  await expect(page.locator("#stat-tracked")).toHaveText("38");
}

test.describe("Trip Synergy and Overlap Buffer", () => {
  test("surfaces trip synergy in calendar day panel, supports horizon switching and sweeping early restocks", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await loadBusyHousehold(page);

    // Switch to Calendar Month view
    await page.locator('[data-dashboard-view-option="calendar"]').click();
    await page.getByRole("button", { name: "Month", exact: true }).click();
    await expect(page.locator("#restock-calendar")).toHaveClass(/is-month/);

    // Month cells with synergy have .has-synergy
    const synergyCells = page.locator(".calendar-day--month.has-synergy");
    await expect(synergyCells.first()).toBeVisible();
    await expect(synergyCells.first().locator(".calendar-synergy-indicator")).toBeVisible();

    // Open Today's day panel
    const todayCell = page.locator(".calendar-day.is-today");
    await todayCell.locator("[data-action='toggle-calendar-day']").click();

    const panel = page.locator("#calendar-day-panel");
    await expect(panel).toBeVisible();

    // Check synergy section
    const synergySection = page.locator("#calendar-day-synergy");
    await expect(synergySection).toBeVisible();
    await expect(page.locator("#calendar-synergy-heading")).toHaveText("Trip synergy");

    // Test horizon switching (+2d, +3d, +5d)
    const plus2Btn = synergySection.locator('button[data-days="2"]');
    const plus5Btn = synergySection.locator('button[data-days="5"]');
    await plus2Btn.click();
    await expect(plus2Btn).toHaveClass(/is-active/);
    await plus5Btn.click();
    await expect(plus5Btn).toHaveClass(/is-active/);

    // Reset to +3d
    await synergySection.locator('button[data-days="3"]').click();

    // Sweep single synergy item
    const firstSynergyRow = synergySection.locator(".calendar-synergy-row").first();
    const sweptItemName = await firstSynergyRow.locator("strong").textContent();
    const sweepBtn = firstSynergyRow.getByRole("button", { name: "Sweep into trip" });
    await sweepBtn.click();

    await expect(page.locator(".toast", { hasText: "swept into trip as early restock" })).toBeVisible();

    // Start trip
    await page.getByRole("button", { name: /^Start (this shopping run|trip with \d+ items?)/ }).click();
    await expect(page.locator("#view-store-run")).toHaveClass(/is-active/);

    // The swept item is in the store run roster
    const sweptRunRow = page.locator(".store-run-row", { hasText: sweptItemName });
    await expect(sweptRunRow).toBeVisible();

    // Log the swept early restock item
    await sweptRunRow.getByRole("button", { name: new RegExp(`^Log ${sweptItemName}`) }).click();
    await expect(page.locator(".store-run-row.is-in-cart", { hasText: sweptItemName })).toBeVisible();

    // Finish the shopping run
    await page.getByRole("button", { name: "Finish shopping run" }).click();
    const finishDialog = page.locator("#finish-run-dialog");
    await expect(finishDialog).toBeVisible();

    // Verify early buffer badge and suppression of drift review
    const receiptEntry = finishDialog.locator(".finish-run-entry", { hasText: sweptItemName });
    await expect(receiptEntry).toBeVisible();
    await expect(receiptEntry.locator(".status-chip.status-buffer")).toHaveText("Early buffer");
    await expect(receiptEntry.locator(".finish-run-buffer-note")).toContainText("Restocked early to save a trip");
    await expect(receiptEntry.locator(".prediction-check")).toHaveCount(0);

    // Finish receipt and return to dashboard
    await page.getByRole("button", { name: "Done" }).click();
    await expect(page.getByRole("heading", { name: "Upcoming restocks" })).toBeVisible();

    // Switch to List view and filter to find swept item
    await page.locator('[data-dashboard-view-option="list"]').click();
    await page.locator("#queue-search").fill(sweptItemName);

    // Open item detail for the swept item and verify early buffer in rhythm ledger
    const itemCard = page.locator(".item-row, .item-card", { hasText: sweptItemName }).first();
    await itemCard.getByRole("button", { name: new RegExp(`^Details for ${sweptItemName}`) }).click();
    await expect(page.locator("#item-analysis-title")).toHaveText(sweptItemName);

    const bufferBadge = page.locator(".rhythm-entry .status-chip.status-buffer");
    await expect(bufferBadge).toBeVisible();
    await expect(bufferBadge).toContainText("Early buffer");
  });
});

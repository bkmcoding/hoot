import { expect, test } from "@playwright/test";

test("displays rhythm health stat on dashboard and opens rhythm audit dialog", async ({ page }) => {
  await page.goto("/");

  const statButton = page.locator("#stat-card-rhythm");
  await expect(statButton).toBeVisible();
  await expect(page.locator("#stat-rhythm-health")).toHaveText("2 clockwork");
  await expect(page.locator("#stat-rhythm-sub")).toContainText("drifting");

  const auditDialog = page.locator("#rhythm-audit-dialog");
  await expect(auditDialog).toBeHidden();

  // Click the stat card button to open the audit dialog
  await statButton.click();
  await expect(auditDialog).toBeVisible();
  await expect(auditDialog.getByRole("heading", { name: "Rhythm health & cadence audit" })).toBeVisible();

  // Summary chips
  const summary = page.locator("#rhythm-audit-summary");
  await expect(summary.locator(".status-clockwork")).toContainText("Clockwork");
  await expect(summary.locator(".status-stretching")).toContainText("Drifting");
  await expect(summary.locator(".status-learning")).toContainText("Learning");

  // Cadence drift section shows Paper towels
  const driftingSection = auditDialog.locator('[aria-labelledby="rhythm-audit-drifting-title"]');
  await expect(driftingSection).toBeVisible();
  await expect(driftingSection).toContainText("Paper towels");
  await expect(driftingSection.locator(".rhythm-recalibrate-btn")).toBeVisible();

  // Close with Done button
  await auditDialog.getByRole("button", { name: "Done" }).click();
  await expect(auditDialog).toBeHidden();
});

test("recalibrates drifting cadence directly from audit dialog with undo", async ({ page }) => {
  await page.goto("/");

  // Open audit dialog
  await page.locator("#stat-card-rhythm").click();
  const auditDialog = page.locator("#rhythm-audit-dialog");
  await expect(auditDialog).toBeVisible();

  const paperTowelsRow = auditDialog.locator('.rhythm-audit-row[data-item-id="item-paper-towels"]');
  await expect(paperTowelsRow).toBeVisible();
  await expect(paperTowelsRow).toContainText("Paper towels");

  const recalibrateBtn = paperTowelsRow.locator(".rhythm-recalibrate-btn");
  await expect(recalibrateBtn).toBeVisible();
  await recalibrateBtn.click();

  // Toast confirms recalibration with Undo
  const toast = page.locator(".toast", { hasText: "Recalibrated Paper towels baseline to 18 days." });
  await expect(toast).toBeVisible();
  const undoBtn = toast.locator(".toast-action");
  await expect(undoBtn).toBeVisible();

  // In the dialog, Paper towels is no longer in drifting group
  await expect(auditDialog.locator('[aria-labelledby="rhythm-audit-drifting-title"]')).toBeHidden();

  // Close dialog so toast action is clickable outside modal top layer
  await auditDialog.getByRole("button", { name: "Done" }).click();
  await expect(auditDialog).toBeHidden();

  // Undo reverts the baseline back
  await undoBtn.click();
  await expect(page.locator(".toast", { hasText: "Paper towels baseline restored." })).toBeVisible();

  // Reopening audit dialog shows Paper towels in drifting group again
  await page.locator("#stat-card-rhythm").click();
  await expect(auditDialog.locator('[aria-labelledby="rhythm-audit-drifting-title"]')).toBeVisible();
  await auditDialog.getByRole("button", { name: "Done" }).click();
});

test("item detail displays rhythm drift diagnostics and handles 1-tap recalibration", async ({ page }) => {
  await page.goto("/");

  // Navigate to Paper towels detail page
  await page.goto("/#/item/item-paper-towels");

  const driftCard = page.locator("#item-drift-card");
  await expect(driftCard).toBeVisible();
  await expect(driftCard.locator(".status-chip")).toContainText("Accelerating");
  await expect(driftCard).toContainText("Rhythm health & drift");
  await expect(driftCard).toContainText("Mean absolute drift");

  // Recalibration callout
  const callout = driftCard.locator(".drift-recalibration-callout");
  await expect(callout).toBeVisible();
  await expect(callout).toContainText("Buying rhythm has shifted: recent restocks average 18 days");

  const recalibrateBtn = callout.locator('[data-action="recalibrate-item-cadence"]');
  await expect(recalibrateBtn).toBeVisible();
  await recalibrateBtn.click();

  // Toast confirmation
  await expect(page.locator(".toast", { hasText: "Recalibrated Paper towels baseline to 18 days." })).toBeVisible();

  // Callout is replaced by recalibration note
  await expect(callout).toBeHidden();
  await expect(driftCard).toContainText("Baseline recalibrated to 18 days");

  // In buying rhythm ledger, post-pivot purchase is marked
  const recalibratedBadge = page.locator(".rhythm-ledger .status-recalibrated");
  await expect(recalibratedBadge).toBeVisible();
  await expect(recalibratedBadge).toHaveText("Recalibrated baseline");
});

test("rhythm audit and item drift cards fit viewports without overflow", async ({ page }) => {
  await page.goto("/");

  // Test dashboard with audit dialog open across viewports
  await page.locator("#stat-card-rhythm").click();
  const auditDialog = page.locator("#rhythm-audit-dialog");
  await expect(auditDialog).toBeVisible();

  for (const width of [1440, 980, 390, 320]) {
    await page.setViewportSize({ width, height: 800 });
    const dialogOverflow = await auditDialog.evaluate(
      (el) => el.scrollWidth - el.clientWidth,
    );
    expect(dialogOverflow, `audit dialog overflow at ${width}px`).toBeLessThanOrEqual(0);
  }

  await auditDialog.getByRole("button", { name: "Done" }).click();
  await expect(auditDialog).toBeHidden();

  // Test item page across viewports
  await page.goto("/#/item/item-paper-towels");
  for (const width of [1440, 980, 390, 320]) {
    await page.setViewportSize({ width, height: 800 });
    const overflowReport = await page.evaluate(() => {
      const sw = document.documentElement.scrollWidth;
      const cw = document.documentElement.clientWidth;
      const diff = sw - cw;
      if (diff <= 0) return { diff: 0, offenders: [] };
      const offenders = [];
      for (const el of document.querySelectorAll("*")) {
        const r = el.getBoundingClientRect();
        if (r.right > cw + 0.5) {
          offenders.push({
            tag: el.tagName,
            id: el.id,
            cls: el.className,
            right: r.right,
          });
        }
      }
      return { diff, offenders };
    });
    expect(overflowReport.diff, `item detail page overflow at ${width}px: ${JSON.stringify(overflowReport.offenders)}`).toBeLessThanOrEqual(0);
  }
});

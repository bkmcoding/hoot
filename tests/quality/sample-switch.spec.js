import { expect, test } from "@playwright/test";

test("switches between demo samples and resets the active sample", async ({ page }) => {
  await page.goto("/");

  const sampleSelect = page.locator("#sample-select");
  const confirmDialog = page.locator("#confirm-dialog");

  await expect(page.locator("body")).toHaveAttribute("data-sample", "starter");
  await expect(sampleSelect).toHaveValue("starter");
  await expect(page.locator("#stat-tracked")).toHaveText("6");

  await sampleSelect.selectOption("busy");
  await expect(confirmDialog).toBeVisible();
  await expect(confirmDialog).toContainText("44 sample items");
  await confirmDialog.getByRole("button", { name: "Cancel" }).click();
  await expect(confirmDialog).toBeHidden();
  await expect(sampleSelect).toHaveValue("starter");
  await expect(page.locator("body")).toHaveAttribute("data-sample", "starter");

  await sampleSelect.selectOption("busy");
  await confirmDialog.getByRole("button", { name: "Switch sample" }).click();

  await expect(page.locator("body")).toHaveAttribute("data-sample", "busy");
  await expect(page.locator("#stat-tracked")).toHaveText("38");
  await expect(page.locator("#stat-attention")).toHaveText("14");
  await expect(page.locator("#stat-one-time")).toHaveText("6");
  await expect(page.locator("#dashboard-list .item-card")).toContainText("Dish soap");
  await expect(page.locator("#dashboard-list .item-row")).toHaveCount(37);
  await expect(page.locator(".toast", { hasText: "Busy household loaded." })).toBeVisible();

  for (const width of [1440, 980, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `busy dashboard overflow at ${width}px`).toBeLessThanOrEqual(0);
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator("#reset-demo").click();
  await expect(confirmDialog).toContainText("busy household");
  await confirmDialog.getByRole("button", { name: "Reset demo" }).click();

  await expect(page.locator("body")).toHaveAttribute("data-sample", "busy");
  await expect(page.locator("#stat-tracked")).toHaveText("38");

  await sampleSelect.selectOption("starter");
  await confirmDialog.getByRole("button", { name: "Switch sample" }).click();

  await expect(page.locator("body")).toHaveAttribute("data-sample", "starter");
  await expect(page.locator("#stat-tracked")).toHaveText("6");
  await expect(page.locator("#stat-one-time")).toHaveText("2");
});

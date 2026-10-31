import { expect, test } from "@playwright/test";

test("switches the main area between the list and the calendar", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");

  const listButton = page.locator('[data-dashboard-view-option="list"]');
  const calendarButton = page.locator('[data-dashboard-view-option="calendar"]');

  const switcher = await page.locator(".dashboard-viewbar").boundingBox();
  const list = await page.locator("#dashboard-list").boundingBox();
  expect(switcher.y, "the switcher sits above the queue in List view").toBeLessThan(list.y);

  await expect(listButton).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#dashboard-list")).toBeVisible();
  await expect(page.locator(".calendar-panel")).toBeHidden();

  await calendarButton.click();

  await expect(calendarButton).toHaveAttribute("aria-pressed", "true");
  await expect(listButton).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator("#dashboard-list")).toBeHidden();
  await expect(page.locator("#restock-calendar")).toBeVisible();
  await expect(page.locator("body")).toHaveAttribute("data-dashboard-view", "calendar");
  await expect(page.locator("#calendar-caption")).toContainText("thirty days");
  await expect(page.locator("#restock-calendar")).toHaveClass(/is-month/);

  const calendarTop = await page
    .locator("#restock-calendar")
    .evaluate((element) => element.getBoundingClientRect().top);
  expect(calendarTop, "calendar sits above the fold").toBeLessThan(420);

  await page.reload();
  await expect(calendarButton).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#restock-calendar")).toBeVisible();

  await listButton.click();
  await expect(page.locator("#dashboard-list")).toBeVisible();
  await expect(page.locator(".calendar-panel")).toBeHidden();
  await expect(page.locator("body")).toHaveAttribute("data-dashboard-view", "list");
});

test("keeps both views inside the phone viewport", async ({ page }) => {
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();

    const listOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(listOverflow, `list overflow at ${width}px`).toBeLessThanOrEqual(0);

    const calendarButton = page.locator('[data-dashboard-view-option="calendar"]');
    const buttonBox = await calendarButton.boundingBox();
    expect(buttonBox.height, `view control height at ${width}px`).toBeGreaterThanOrEqual(38);

    await calendarButton.click();
    await expect(page.locator(".calendar-controls")).toBeVisible();

    const calendarOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(calendarOverflow, `calendar overflow at ${width}px`).toBeLessThanOrEqual(0);
  }
});

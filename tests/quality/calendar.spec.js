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

async function showCalendar(page) {
  await page.locator('[data-dashboard-view-option="calendar"]').click();
}

test("month range renders week rows and opens a day in place", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await loadBusyHousehold(page);
  await showCalendar(page);

  await page.getByRole("button", { name: "Month", exact: true }).click();
  await expect(page.locator("#restock-calendar")).toHaveClass(/is-month/);

  const weekCount = await page.locator(".calendar-week").count();
  expect(weekCount).toBeGreaterThanOrEqual(5);
  expect(weekCount).toBeLessThanOrEqual(6);
  await expect(page.locator(".calendar-day--month")).toHaveCount(weekCount * 7);

  const brief = page.locator("#calendar-brief");
  await expect(brief).toBeVisible();
  await expect(brief).toContainText(/\d+ restocks? across \d+ days?/);
  await expect(page.locator(".calendar-legend li")).toHaveCount(4);

  const todayToggle = page.locator(
    ".calendar-day.is-today [data-action='toggle-calendar-day']",
  );
  await todayToggle.click();

  const panel = page.locator("#calendar-day-panel");
  await expect(panel).toBeVisible();
  await expect(page.locator("#calendar-day-panel-title")).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(panel).toHaveCount(0);
  await expect(todayToggle).toBeFocused();

  for (const width of [1440, 980, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `month calendar overflow at ${width}px`).toBeLessThanOrEqual(0);
  }
});

test("a day can be saved as a plan and started as a run", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await loadBusyHousehold(page);
  await showCalendar(page);
  await page.getByRole("button", { name: "Month", exact: true }).click();

  const todayCell = page.locator(".calendar-day.is-today");
  await todayCell.locator("[data-action='toggle-calendar-day']").click();

  await page.getByRole("button", { name: "Save as a plan for this date" }).click();
  await expect(todayCell.locator(".calendar-plan-chip")).toHaveText("Planned");
  await expect(page.locator("#calendar-plans")).toBeVisible();
  await expect(page.locator(".calendar-day-plan-items")).not.toHaveText(
    "No items yet. Resume the plan and add what you need.",
  );

  await page.getByRole("button", { name: "Close day" }).click();
  await expect(page.locator("#calendar-day-panel")).toHaveCount(0);

  await todayCell.locator("[data-action='toggle-calendar-day']").click();
  await expect(page.getByRole("button", { name: "Resume plan" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Update plan for this date" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Start this shopping run" }).click();
  await expect(page.locator("#view-store-run")).toHaveClass(/is-active/);
  await expect(page.locator("#store-run-subtitle")).toContainText("Shopping for");
  await expect(page.locator("#store-run-groups .store-run-row").first()).toBeVisible();
});

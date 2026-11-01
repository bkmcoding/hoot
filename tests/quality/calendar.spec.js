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

  await page.getByRole("button", { name: "Save plan" }).click();
  await expect(todayCell.locator(".calendar-plan-chip")).toHaveText("Planned");
  await expect(page.locator("#calendar-plans")).toBeVisible();
  await expect(page.locator(".calendar-day-plan-items")).not.toHaveText(
    "No items yet. Resume the plan and add what you need.",
  );

  await page.getByRole("button", { name: "Close day" }).click();
  await expect(page.locator("#calendar-day-panel")).toHaveCount(0);

  await todayCell.locator("[data-action='toggle-calendar-day']").click();
  await expect(page.locator(".calendar-day-plan")).toContainText("Saved plan");
  await expect(page.getByRole("button", { name: "Update plan" })).toBeVisible();
  const startButton = page.getByRole("button", { name: /^Start trip with \d+ items?$/ });
  await expect(startButton).toBeVisible();

  await startButton.click();
  await expect(page.locator("#view-store-run")).toHaveClass(/is-active/);
  await expect(page.locator("#store-run-subtitle")).toContainText("Shopping for");
  await expect(page.locator("#store-run-groups .store-run-row").first()).toBeVisible();
});

test("a plan selects its own items and can include earlier restocks", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await loadBusyHousehold(page);
  await showCalendar(page);
  await page.getByRole("button", { name: "Month", exact: true }).click();

  const todayCell = page.locator(".calendar-day.is-today");
  await todayCell.locator("[data-action='toggle-calendar-day']").click();

  const checks = page.locator('[data-action="toggle-plan-item"]');
  const planCount = await checks.count();
  expect(planCount).toBeGreaterThan(1);

  const excludedId = await checks.first().getAttribute("data-id");
  await checks.first().uncheck();
  await page.getByRole("button", { name: "Save plan" }).click();
  await page.getByRole("button", { name: "Close day" }).click();
  await todayCell.locator("[data-action='toggle-calendar-day']").click();
  await page.getByRole("button", { name: /^Start trip with \d+ items?$/ }).click();

  await expect(page.locator(".store-run-row")).toHaveCount(planCount - 1);
  await expect(
    page.locator(`.store-run-row[data-item-id="${excludedId}"]`),
  ).toHaveCount(0);

  await page.getByRole("button", { name: "Exit run", exact: true }).click();
  await page.locator(".current-trip").getByRole("button", { name: "Discard trip" }).click();
  await page.locator("#confirm-dialog").getByRole("button", { name: "Discard trip" }).click();
  await page.locator(".calendar-day-toggle:not(.is-static)").nth(4).click();

  const earlier = page.getByRole("button", { name: /Add \d+ due earlier/ });
  await expect(earlier).toBeVisible();
  await earlier.click();
  await page.getByRole("button", { name: /Save plan|Update plan/ }).click();
  await page.getByRole("button", { name: /^Start trip with \d+ items?$/ }).click();
  await expect(page.locator(".store-run-row").first()).toBeVisible();
});

test("starts from the checked roster without a separate plan save", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await loadBusyHousehold(page);
  await showCalendar(page);
  await page.getByRole("button", { name: "Month", exact: true }).click();

  const todayCell = page.locator(".calendar-day.is-today");
  await todayCell.locator("[data-action='toggle-calendar-day']").click();

  const checks = page.locator('[data-action="toggle-plan-item"]');
  const planCount = await checks.count();
  expect(planCount).toBeGreaterThan(1);

  const excludedId = await checks.first().getAttribute("data-id");
  await checks.first().uncheck();

  await page
    .getByRole("button", { name: new RegExp(`^Start trip with ${planCount - 1} items?$`) })
    .click();

  await expect(page.locator("#view-store-run")).toHaveClass(/is-active/);
  await expect(page.locator("#store-run-groups .store-run-row")).toHaveCount(planCount - 1);
  await expect(
    page.locator(`.store-run-row[data-item-id="${excludedId}"]`),
  ).toHaveCount(0);

  const plans = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("hoot-demo-plans-v1") || "[]"),
  );
  expect(plans).toHaveLength(1);
  expect(plans[0].itemIds).not.toContain(excludedId);
});

test("deleting a saved plan asks first and keeps the day open", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await loadBusyHousehold(page);
  await showCalendar(page);
  await page.getByRole("button", { name: "Month", exact: true }).click();

  const todayCell = page.locator(".calendar-day.is-today");
  await todayCell.locator("[data-action='toggle-calendar-day']").click();
  await page.getByRole("button", { name: "Save plan" }).click();

  const dialog = page.locator("#confirm-dialog");
  await page.getByRole("button", { name: "Delete plan" }).click();
  await expect(dialog).toContainText("removes the saved plan");
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(todayCell.locator(".calendar-plan-chip")).toHaveText("Planned");

  await page.getByRole("button", { name: "Delete plan" }).click();
  await dialog.getByRole("button", { name: "Delete plan", exact: true }).click();

  await expect(todayCell.locator(".calendar-plan-chip")).toHaveCount(0);
  await expect(page.locator(".calendar-day-plan")).toHaveCount(0);
  await expect(page.locator("#calendar-day-panel-title")).toBeFocused();
});

test("asks before replacing an active trip from another day", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await loadBusyHousehold(page);
  await showCalendar(page);
  await page.getByRole("button", { name: "Month", exact: true }).click();

  const todayCell = page.locator(".calendar-day.is-today");
  await todayCell.locator("[data-action='toggle-calendar-day']").click();
  await page.getByRole("button", { name: /^Start trip with \d+ items?$/ }).click();
  await page.getByRole("button", { name: "Exit run", exact: true }).click();

  await page.locator(".calendar-day--month:not(.is-today) .calendar-day-toggle:not(.is-static)").nth(3).click();
  const start = page.getByRole("button", { name: /^Start trip with \d+ items?$/ });
  await expect(start).toBeVisible();
  await start.click();

  const dialog = page.locator("#confirm-dialog");
  await expect(dialog).toContainText("Replace the active trip?");
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(page.locator(".current-trip")).toBeVisible();
  await expect(page.locator("#view-store-run")).not.toHaveClass(/is-active/);

  await start.click();
  await dialog.getByRole("button", { name: "Start new trip" }).click();
  await expect(page.locator("#view-store-run")).toHaveClass(/is-active/);
});

test("opens the phone calendar on the next seven days", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await showCalendar(page);

  await expect(page.locator('[data-calendar-range="7"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator("#restock-calendar")).not.toHaveClass(/is-month/);
});

test("reset demo clears the active trip and saved plans", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await loadBusyHousehold(page);
  await showCalendar(page);
  await page.getByRole("button", { name: "Month", exact: true }).click();

  const todayCell = page.locator(".calendar-day.is-today");
  await todayCell.locator("[data-action='toggle-calendar-day']").click();
  await page.getByRole("button", { name: /^Start trip with \d+ items?$/ }).click();
  await page.getByRole("button", { name: "Exit run", exact: true }).click();

  await page.locator("#reset-demo").click();
  await page.locator("#confirm-dialog").getByRole("button", { name: "Reset demo" }).click();

  await expect(page.locator(".current-trip")).toHaveCount(0);
  expect(
    await page.evaluate(() => localStorage.getItem("hoot-demo-plans-v1")),
  ).toBeNull();
});

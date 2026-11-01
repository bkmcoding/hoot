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

test("keeps a saved plan discoverable beyond the phone seven-day range", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await loadBusyHousehold(page);
  await showCalendar(page);
  await page.getByRole("button", { name: "Month", exact: true }).click();

  const planDate = await page.evaluate(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cutoff = new Date(today);
    cutoff.setDate(cutoff.getDate() + 8);
    const iso = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, "0")}-${String(
      cutoff.getDate(),
    ).padStart(2, "0")}`;
    return [...document.querySelectorAll(
      '.calendar-day--month:not(.is-past):not(.is-empty) [data-action="toggle-calendar-day"]',
    )]
      .map((button) => button.dataset.date)
      .find((date) => date >= iso);
  });
  expect(planDate, "busy household needs a future day to plan").toBeTruthy();

  await page
    .locator(`[data-action="toggle-calendar-day"][data-date="${planDate}"]`)
    .click();
  await page.getByRole("button", { name: "Save plan", exact: true }).click();
  await page.getByRole("button", { name: "Close day", exact: true }).click();

  await page.setViewportSize({ width: 390, height: 900 });
  await page.getByRole("button", { name: "Next 7 days", exact: true }).click();

  const plans = page.locator("#calendar-plans");
  await expect(plans).toBeVisible();
  await expect(plans).toContainText("Saved plans");

  const planLink = plans.locator(`[data-date="${planDate}"]`);
  await expect(planLink).toBeVisible();
  await planLink.click();

  await expect(page.locator('[data-calendar-range="30"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator("#calendar-day-panel-title")).toBeFocused();
});

test("keeps the day decision above a long roster at phone width", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await loadBusyHousehold(page);
  await showCalendar(page);
  await page.getByRole("button", { name: "Month", exact: true }).click();
  await page
    .locator(".calendar-day.is-today [data-action='toggle-calendar-day']")
    .click();

  const start = page.getByRole("button", {
    name: /^Start trip with \d+ items?$/,
  });
  await expect(start).toBeInViewport();
  await expect(page.locator(".calendar-day-panel-selection")).toContainText("of");

  const startBox = await start.boundingBox();
  const firstCheckBox = await page
    .locator('[data-action="toggle-plan-item"]')
    .first()
    .boundingBox();
  expect(startBox, "missing start action").not.toBeNull();
  expect(firstCheckBox, "missing roster").not.toBeNull();
  expect(startBox.y, "day action should precede the roster").toBeLessThan(
    firstCheckBox.y,
  );
});

test("says when the calendar trip also saved its plan", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await loadBusyHousehold(page);
  await showCalendar(page);
  await page.getByRole("button", { name: "Month", exact: true }).click();
  await page
    .locator(".calendar-day.is-today [data-action='toggle-calendar-day']")
    .click();

  await page.getByRole("button", { name: /^Start trip with \d+ items?$/ }).click();
  await expect(
    page.locator(".toast", { hasText: "Plan saved." }),
  ).toBeVisible();
});

test("finishes a wholly logged trip from the dashboard", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Shopping", exact: true }).click();

  while (
    (await page.locator('.store-run-row [data-action="toggle-run-item"]').count()) > 0
  ) {
    await page
      .locator('.store-run-row [data-action="toggle-run-item"]')
      .first()
      .click();
  }

  await page.getByRole("button", { name: "Exit run", exact: true }).click();
  const strip = page.locator(".current-trip");
  await expect(strip).toContainText("0 left");

  const finish = strip.getByRole("button", { name: "Finish trip" });
  await expect(finish).toBeVisible();
  await finish.click();
  await expect(page.locator("#finish-run-dialog")).toBeVisible();
});

test("keeps one-time actions contextual", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.getByRole("button", { name: "One-time", exact: true }).click();

  const logPurchase = page.locator(
    '.header-actions [data-dialog="log-purchase"]',
  );
  await expect(logPurchase).toBeHidden();
  await expect(
    page.locator('.header-actions [data-dialog="add-item"]'),
  ).toBeVisible();

  await page.getByRole("button", { name: "Dashboard", exact: true }).click();
  await expect(logPurchase).toBeVisible();
});

test("keeps phone evidence and the short search label", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/");
  await page.getByRole("button", { name: /^Details for / }).first().click();

  const evidence = page.locator(".item-evidence-line");
  await expect(evidence).toBeVisible();
  await expect(evidence).toContainText("Confidence");

  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(evidence).toBeHidden();

  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/");
  await expect(page.locator("#queue-search")).toHaveAttribute(
    "placeholder",
    "Search items",
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator("#queue-search")).toHaveAttribute(
    "placeholder",
    "Search name, category, or unit",
  );
});

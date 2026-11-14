import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("3-way view switcher toggles between list, shelves, and calendar, persisting selection", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();

  const listButton = page.locator('[data-dashboard-view-option="list"]');
  const shelvesButton = page.locator('[data-dashboard-view-option="shelves"]');
  const calendarButton = page.locator('[data-dashboard-view-option="calendar"]');

  await expect(listButton).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#dashboard-list")).toBeVisible();
  await expect(page.locator("#dashboard-shelves")).toBeHidden();
  await expect(page.locator(".calendar-panel")).toBeHidden();

  // Switch to Shelves
  await shelvesButton.click();
  await expect(shelvesButton).toHaveAttribute("aria-pressed", "true");
  await expect(listButton).toHaveAttribute("aria-pressed", "false");
  await expect(calendarButton).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator("#dashboard-shelves")).toBeVisible();
  await expect(page.locator("#dashboard-list")).toBeHidden();
  await expect(page.locator(".calendar-panel")).toBeHidden();
  await expect(page.locator("body")).toHaveAttribute("data-dashboard-view", "shelves");
  await expect(page.locator("#dashboard-copy")).toContainText("Staples organized by household area.");

  // Persistence across reload
  await page.reload();
  await expect(shelvesButton).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#dashboard-shelves")).toBeVisible();
  await expect(page.locator("body")).toHaveAttribute("data-dashboard-view", "shelves");

  // Switch to Calendar
  await calendarButton.click();
  await expect(calendarButton).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#restock-calendar")).toBeVisible();
  await expect(page.locator("#dashboard-shelves")).toBeHidden();

  // Switch back to List
  await listButton.click();
  await expect(listButton).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#dashboard-list")).toBeVisible();
  await expect(page.locator("#dashboard-shelves")).toBeHidden();
});

test("shelves view renders category ledgers and item cards for starter and busy households", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");

  const shelvesButton = page.locator('[data-dashboard-view-option="shelves"]');
  await shelvesButton.click();

  // Starter household has categories: Pantry, Household, Cleaning, Personal care
  const ledgers = page.locator("#dashboard-shelves .shelf-ledge");
  await expect(ledgers).toHaveCount(4);
  await expect(page.locator("#dashboard-shelves")).toContainText("Pantry");
  await expect(page.locator("#dashboard-shelves")).toContainText("Cleaning");

  const cards = page.locator("#dashboard-shelves .shelf-card");
  await expect(cards).toHaveCount(6);

  // Switch to Busy household
  await page.locator("#sample-select").selectOption("busy");
  await page
    .locator("#confirm-dialog")
    .getByRole("button", { name: "Switch sample" })
    .click();
  await expect(page.locator("body")).toHaveAttribute("data-sample", "busy");
  await expect(page.locator("#stat-tracked")).toHaveText("38");

  // Re-verify shelves in busy household
  await expect(page.locator("#dashboard-shelves .shelf-card")).toHaveCount(38);
});

test("depletion gauge renders across Next up, list rows, shelves, and item detail", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");

  // 1. Next Up Hero Card has depletion gauge
  const nextUpGauge = page.locator("#dashboard-list .item-card .depletion-gauge");
  await expect(nextUpGauge).toBeVisible();
  await expect(nextUpGauge).toHaveAttribute("role", "meter");
  await expect(nextUpGauge.locator(".depletion-fill")).toBeVisible();

  // 2. List queue rows have depletion gauge
  const listGauge = page.locator("#dashboard-list .item-row .depletion-gauge").first();
  await expect(listGauge).toBeVisible();
  await expect(listGauge).toHaveClass(/is-compact/);

  // 3. Shelves cards have depletion gauge
  await page.locator('[data-dashboard-view-option="shelves"]').click();
  const shelfGauge = page.locator("#dashboard-shelves .shelf-card .depletion-gauge").first();
  await expect(shelfGauge).toBeVisible();

  // 4. Item Detail page has depletion gauge
  await page.locator("#dashboard-shelves .shelf-card .item-title-button").first().click();
  await expect(page.locator("#view-item")).toHaveClass(/is-active/);
  const detailGauge = page.locator("#item-analysis-content .restock-answer .depletion-gauge");
  await expect(detailGauge).toBeVisible();
});

test("logging purchase from a shelf card records purchase and updates state", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");

  await page.locator('[data-dashboard-view-option="shelves"]').click();

  // Click Log purchase on first card
  const firstCard = page.locator("#dashboard-shelves .shelf-card").first();
  const itemName = await firstCard.locator(".shelf-card-title").textContent();
  await firstCard.getByRole("button", { name: "Log purchase" }).click();

  const dialog = page.locator("#log-purchase-dialog");
  await expect(dialog).toBeVisible();

  // Submit purchase
  await dialog.locator('button[type="submit"]').click();
  await expect(dialog).toBeHidden();

  // Toast confirms purchase logged
  await expect(page.locator(".toast")).toBeVisible();
});

test("search filters items and collapses empty shelves on shelves view", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");

  await page.locator('[data-dashboard-view-option="shelves"]').click();
  await expect(page.locator("#dashboard-shelves .shelf-card")).toHaveCount(6);

  const searchInput = page.locator("#queue-search");
  await searchInput.fill("Milk");

  // Only the shelf containing Milk remains visible
  await expect(page.locator("#dashboard-shelves .shelf-ledge")).toHaveCount(1);
  await expect(page.locator("#dashboard-shelves .shelf-card")).toHaveCount(1);
  await expect(page.locator("#dashboard-shelves")).toContainText("Milk");

  // Nonexistent query
  await searchInput.fill("NonExistentStaple1234");
  await expect(page.locator("#dashboard-shelves")).toContainText("No matching staples");
  const clearBtn = page.locator('#dashboard-shelves [data-action="clear-search"]');
  await expect(clearBtn).toBeVisible();

  await clearBtn.click();
  await expect(searchInput).toHaveValue("");
  await expect(page.locator("#dashboard-shelves .shelf-card")).toHaveCount(6);
});

test("dense mode compacts shelves cards into dense ledgers", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");

  await page.locator('[data-dashboard-view-option="shelves"]').click();
  await page.getByRole("button", { name: "Dense", exact: true }).click();

  await expect(page.locator("body")).toHaveAttribute("data-density", "dense");
  await expect(page.locator("#dashboard-shelves .shelf-card").first()).toBeVisible();

  // Switch back to spacious
  await page.getByRole("button", { name: "Spacious", exact: true }).click();
  await expect(page.locator("body")).toHaveAttribute("data-density", "spacious");
});

test("responsive viewport floor without horizontal overflow on shelves view", async ({
  page,
}) => {
  for (const width of [1440, 980, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.locator('[data-dashboard-view-option="shelves"]').click();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `shelves view overflow at ${width}px`).toBeLessThanOrEqual(0);

    const firstCard = page.locator("#dashboard-shelves .shelf-card").first();
    await expect(firstCard).toBeVisible();
  }
});

test("has no critical accessibility violations on shelves view", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page.locator('[data-dashboard-view-option="shelves"]').click();

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();

  expect(results.violations).toEqual([]);
});

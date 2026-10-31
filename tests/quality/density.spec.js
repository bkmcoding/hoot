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

test("dense view compacts the busy queue and folds steady items explicitly", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");

  await expect(page.locator("body")).toHaveAttribute("data-density", "spacious");
  await expect(
    page.getByRole("button", { name: "Spacious", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");

  await loadBusyHousehold(page);
  await expect(page.locator("#dashboard-list .item-row")).toHaveCount(37);
  await expect(page.locator(".steady-fold")).toHaveCount(0);
  const spaciousHeight = await page
    .locator("#dashboard-list")
    .evaluate((element) => element.getBoundingClientRect().height);

  await page.getByRole("button", { name: "Dense", exact: true }).click();

  await expect(page.locator("body")).toHaveAttribute("data-density", "dense");
  await expect(
    page.getByRole("button", { name: "Dense", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("button", { name: "Spacious", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator("#dashboard-list .item-card")).toContainText("Dish soap");
  await expect(page.locator("#dashboard-list .item-row")).toHaveCount(23);

  const fold = page.locator(".steady-fold");
  await expect(fold).toBeVisible();
  await expect(fold).toContainText("14 steady items folded away");
  await expect(fold).toContainText("Not due for at least a week. Still tracked.");
  const toggle = fold.getByRole("button", { name: "Show steady items", exact: true });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");

  const denseHeight = await page
    .locator("#dashboard-list")
    .evaluate((element) => element.getBoundingClientRect().height);
  expect(denseHeight).toBeLessThan(spaciousHeight - 400);

  for (const width of [1440, 980, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `dense dashboard overflow at ${width}px`).toBeLessThanOrEqual(0);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });

  await page.reload();
  await expect(page.locator("body")).toHaveAttribute("data-density", "dense");
  await expect(page.locator("#dashboard-list .item-row")).toHaveCount(23);
  await expect(page.locator(".steady-fold")).toContainText("14 steady items folded away");

  await page.getByRole("button", { name: "Show steady items", exact: true }).click();
  await expect(page.locator("#dashboard-list .item-row")).toHaveCount(37);
  await expect(page.locator(".steady-fold")).toContainText("14 steady items shown");
  await expect(
    page.getByRole("button", { name: "Hide steady items", exact: true }),
  ).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#steady-fold-items .item-row").first()).toBeVisible();

  const steadyName = (
    await page.locator("#steady-fold-items .item-row .item-title-button").first().textContent()
  ).trim();
  expect(steadyName, "busy sample should expose steady rows when expanded").not.toBe("");

  await page.setViewportSize({ width: 320, height: 640 });
  const expandedOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(expandedOverflow, "expanded dense dashboard overflow at 320px").toBeLessThanOrEqual(0);
  const mobileTargets = await page
    .locator("#dashboard-list .item-row-actions .btn")
    .evaluateAll((buttons) => buttons.map((button) => button.getBoundingClientRect().height));
  expect(mobileTargets.length).toBeGreaterThan(0);
  expect(Math.min(...mobileTargets)).toBeGreaterThanOrEqual(44);

  await page.getByRole("button", { name: "Hide steady items", exact: true }).click();
  await expect(page.locator("#dashboard-list .item-row")).toHaveCount(23);
  await expect(
    page.getByRole("button", { name: "Show steady items", exact: true }),
  ).toBeFocused();

  await page.locator("#queue-search").fill(steadyName);
  await expect(page.locator(".steady-fold")).toHaveCount(0);
  await expect(page.locator("#search-result-count")).toContainText("1 match");
  await expect(page.locator("#dashboard-list .item-row")).toContainText(steadyName);
});

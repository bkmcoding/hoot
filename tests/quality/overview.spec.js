import { expect, test } from "@playwright/test";

test.describe("Overview Command Center Scaffold", () => {
  test("navigates to overview via nav button and url hash", async ({ page }) => {
    await page.goto("/#/overview");

    const overviewSection = page.locator("#view-overview");
    await expect(overviewSection).toBeVisible();
    await expect(overviewSection).toHaveClass(/is-active/);

    const title = page.locator("#overview-title");
    await expect(title).toHaveText("Household overview");

    const navOverview = page.locator('.nav-button[data-view="overview"]');
    await expect(navOverview).toBeVisible();
    await expect(navOverview).toHaveClass(/is-active/);

    // Verify brand link points to overview
    const brand = page.locator("a.brand");
    await expect(brand).toHaveAttribute("href", "#/overview");
  });

  test("navigates to overview by clicking overview nav button from restocks dashboard", async ({ page }) => {
    await page.goto("/#/dashboard");

    const dashboardSection = page.locator("#view-dashboard");
    await expect(dashboardSection).toBeVisible();
    await expect(dashboardSection).toHaveClass(/is-active/);

    const navOverview = page.locator('.nav-button[data-view="overview"]');
    await navOverview.click();

    await expect(page).toHaveURL(/#\/overview$/);
    const overviewSection = page.locator("#view-overview");
    await expect(overviewSection).toBeVisible();
    await expect(overviewSection).toHaveClass(/is-active/);
    await expect(navOverview).toHaveClass(/is-active/);
  });

  test("contains all six bento card slots", async ({ page }) => {
    await page.goto("/#/overview");

    await expect(page.locator("#bento-spotlight")).toBeVisible();
    await expect(page.locator("#bento-trip")).toBeVisible();
    await expect(page.locator("#bento-horizon")).toBeVisible();
    await expect(page.locator("#bento-rhythm")).toBeVisible();
    await expect(page.locator("#bento-shelves")).toBeVisible();
    await expect(page.locator("#bento-onetime")).toBeVisible();
  });

  test("maintains zero horizontal overflow at desktop, tablet, and mobile widths", async ({ page }) => {
    for (const width of [1440, 980, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/#/overview");

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      expect(overflow, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(0);
    }
  });

  test("applies 12px border radius and paper card surface styling", async ({ page }) => {
    await page.goto("/#/overview");
    const spotlight = page.locator("#bento-spotlight");
    await expect(spotlight).toHaveCSS("border-radius", "12px");
    await expect(spotlight).toHaveCSS("background-color", "rgb(255, 250, 241)"); // #fffaf1
  });

  test("renders spotlight hero with urgent item details and counts on starter household", async ({ page }) => {
    await page.goto("/#/overview");

    const spotlight = page.locator("#bento-spotlight");
    await expect(spotlight.locator(".bento-card-title")).toBeVisible();
    await expect(spotlight.locator(".bento-spotlight-status")).toBeVisible();
    await expect(spotlight.locator(".bento-pill-strip")).toBeVisible();
  });

  test("renders 7-day horizon with daily calendar cells and restock indicators", async ({ page }) => {
    await page.goto("/#/overview");

    const horizonCells = page.locator("#bento-horizon .horizon-cell");
    await expect(horizonCells).toHaveCount(7);
  });

  test("renders rhythm health breakdown bars", async ({ page }) => {
    await page.goto("/#/overview");

    const rhythmBar = page.locator("#bento-rhythm .rhythm-meter-bar");
    await expect(rhythmBar).toBeVisible();
  });

  test("renders shelf health categories and pending one-time items", async ({ page }) => {
    await page.goto("/#/overview");

    const shelves = page.locator("#bento-shelves .shelf-health-row");
    await expect(shelves.first()).toBeVisible();
    await expect(shelves.first()).toHaveAttribute("type", "button");

    const oneTimeItems = page.locator("#bento-onetime .bento-onetime-item");
    await expect(oneTimeItems.first()).toBeVisible();
  });

  test("navigates to shelves dashboard when clicking a shelf health category", async ({ page }) => {
    await page.goto("/#/overview");

    const firstShelf = page.locator("#bento-shelves .shelf-health-row").first();
    const catName = await firstShelf.locator("span").first().innerText();
    await firstShelf.click();

    await expect(page.locator("#view-dashboard")).toBeVisible();
    await expect(page.locator("#dashboard-shelves")).toBeVisible();
    const searchInput = page.locator("#queue-search");
    await expect(searchInput).toHaveValue(catName.trim());
  });

  test("renders spotlight and bento cards on busy household", async ({ page }) => {
    await page.goto("/");
    await page.locator("#sample-select").selectOption("busy");
    await page
      .locator("#confirm-dialog")
      .getByRole("button", { name: "Switch sample" })
      .click();
    await expect(page.locator("body")).toHaveAttribute("data-sample", "busy");

    await page.goto("/#/overview");

    const spotlight = page.locator("#bento-spotlight");
    await expect(spotlight.locator(".bento-card-title")).toBeVisible();
    await expect(spotlight.locator(".bento-spotlight-status")).toBeVisible();

    const shelves = page.locator("#bento-shelves .shelf-health-row");
    await expect(shelves).toHaveCount(4);
  });

  test("executes Log purchase directly from the spotlight card", async ({ page }) => {
    await page.goto("/#/overview");

    const spotlight = page.locator("#bento-spotlight");
    const logBtn = spotlight.locator('button[data-bento-action="log-purchase"]');
    await expect(logBtn).toBeVisible();

    const titleBefore = await spotlight.locator("#bento-spotlight-title").innerText();

    // Click Log purchase
    await logBtn.click();

    // Verify confirmation and overview updates
    await expect(spotlight.locator("#bento-spotlight-title")).not.toHaveText(titleBefore);
  });

  test("adds a new one-time item via the quick-add scratchpad", async ({ page }) => {
    await page.goto("/#/overview");

    const form = page.locator('form[data-bento-action="quick-add-onetime"]');
    await form.locator('input[name="name"]').fill("Light bulbs");
    await form.locator('button[type="submit"]').click();

    await expect(page.locator("#bento-onetime")).toContainText("Light bulbs");
  });

  test("checks off a one-time item via the bento scratchpad checkbox", async ({ page }) => {
    await page.goto("/#/overview");

    const onetimeSection = page.locator("#bento-onetime");
    const firstCheckbox = onetimeSection.locator('input[type="checkbox"][data-bento-action="check-onetime"]').first();
    await expect(firstCheckbox).toBeVisible();

    const label = firstCheckbox.locator("..");
    const itemName = await label.innerText();
    await firstCheckbox.click();

    // The checked item should no longer appear in the pending list
    await expect(onetimeSection).not.toContainText(itemName.trim());
  });

  test("executes Still have some prediction check directly from spotlight card", async ({ page }) => {
    await page.goto("/#/overview");

    const spotlight = page.locator("#bento-spotlight");
    const stillHaveSomeBtn = spotlight.locator('button[data-bento-action="still-have-some"]');
    await expect(stillHaveSomeBtn).toBeVisible();

    const chip = spotlight.locator(".bento-card-header .bento-pill-chip");
    await expect(chip).toHaveAttribute("data-zone", "overdue");

    await stillHaveSomeBtn.click();

    // After marking still have some, item moves from overdue to buy-now
    await expect(chip).toHaveAttribute("data-zone", "buy-now");
    // Still have some button only renders for overdue items
    await expect(spotlight.locator('button[data-bento-action="still-have-some"]')).toHaveCount(0);
  });

  test("opens rhythm audit dialog via audit button on rhythm health card", async ({ page }) => {
    await page.goto("/#/overview");

    const auditBtn = page.locator('#bento-rhythm button[data-bento-action="open-rhythm-audit"]');
    await expect(auditBtn).toBeVisible();

    await auditBtn.click();
    const auditDialog = page.locator("#rhythm-audit-dialog");
    await expect(auditDialog).toBeVisible();
  });

  test("transitions smoothly from Overview to Restocks and Shopping Run", async ({ page }) => {
    await page.goto("/#/overview");

    // Click Restocks nav button
    const restocksBtn = page.locator('.nav-button[data-view="dashboard"]');
    await restocksBtn.click();

    await expect(page.locator("#view-dashboard")).toBeVisible();
    await expect(page.locator("#view-overview")).not.toHaveClass(/is-active/);

    // Return to overview
    const overviewBtn = page.locator('.nav-button[data-view="overview"]');
    await overviewBtn.click();
    await expect(page.locator("#view-overview")).toBeVisible();
    await expect(page.locator("#overview-title")).toBeFocused();

    // Navigate to Shopping Run and return to Overview
    const startRunBtn = page.locator('#bento-trip a[href="#/shopping"]');
    await startRunBtn.click();

    await expect(page.locator("#view-store-run")).toBeVisible();
    await expect(page.locator("#view-overview")).not.toHaveClass(/is-active/);

    const exitRunBtn = page.getByRole("button", { name: "Exit run", exact: true });
    await exitRunBtn.click();
    await expect(page.locator("#view-dashboard")).toBeVisible();

    await overviewBtn.click();
    await expect(page.locator("#view-overview")).toBeVisible();
    await expect(page.locator("#overview-title")).toBeFocused();
  });

  test("filters dashboard shelves view when clicking a pantry shelf health row", async ({ page }) => {
    await page.goto("/#/overview");

    const shelfRow = page.locator("#bento-shelves .shelf-health-row").first();
    await expect(shelfRow).toBeVisible();
    const category = await shelfRow.getAttribute("data-category");
    expect(category).toBeTruthy();

    await shelfRow.click();
    await expect(page.locator("#view-dashboard")).toBeVisible();
    await expect(page.locator("#dashboard-shelves")).toBeVisible();
    await expect(page.locator("#queue-search")).toHaveValue(category);
  });

  test("navigates to dashboard calendar when clicking a 7-day horizon cell", async ({ page }) => {
    await page.goto("/#/overview");

    const horizonCell = page.locator("#bento-horizon .horizon-cell").first();
    await expect(horizonCell).toBeVisible();

    await horizonCell.click();
    await expect(page.locator("#view-dashboard")).toBeVisible();
  });
});

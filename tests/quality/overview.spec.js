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
});

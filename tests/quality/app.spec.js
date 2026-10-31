import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("loads the dashboard with the expected primary surfaces", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/Hoot/);
  await expect(page.getByRole("link", { name: /Hoot home/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Upcoming restocks" })).toBeVisible();
});

test("has no critical accessibility violations", async ({ page }) => {
  await page.goto("/");
  await page.locator("#view-dashboard").evaluate((view) => {
    for (const animation of view.getAnimations()) animation.finish();
  });

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "best-practice"])
    .analyze();

  expect(results.violations).toEqual([]);
});

test("counts overdue staples in the needs-attention summary", async ({ page }) => {
  await page.addInitScript(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isoDate = (offset) => {
      const date = new Date(today);
      date.setDate(date.getDate() + offset);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    localStorage.setItem(
      "hoot-demo-state-v1",
      JSON.stringify({
        items: [
          {
            id: "overdue",
            name: "Overdue Milk",
            category: "Pantry",
            unit: "half-gallon",
            reorderThresholdDays: 7,
            isOneTime: false,
            completed: false,
            createdAt: isoDate(-10),
            purchases: [{ id: "p1", date: isoDate(-10), quantity: 1, price: 4 }],
          },
          {
            id: "steady",
            name: "Steady Eggs",
            category: "Pantry",
            unit: "dozen",
            reorderThresholdDays: 30,
            isOneTime: false,
            completed: false,
            createdAt: isoDate(-2),
            purchases: [{ id: "p2", date: isoDate(-2), quantity: 1, price: 3 }],
          },
        ],
      })
    );
  });

  await page.goto("/");

  await expect(page.locator("#stat-attention")).toHaveText("1");
  await expect(page.locator("#stat-tracked")).toHaveText("2");
});

test("fits every dock label on phone widths", async ({ page }) => {
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 700 });
    await page.goto("/");
    await page.getByRole("button", { name: "One-time", exact: true }).click();
    await expect(page.locator(".header-actions")).toBeVisible();

    const clipped = await page.evaluate(() =>
      [...document.querySelectorAll(".header-actions .btn")]
        .filter((button) => button.scrollWidth > button.clientWidth)
        .map((button) => button.textContent.trim())
    );

    expect(clipped, `clipped dock labels at ${width}px`).toEqual([]);
  }
});

test("hides the phone dock while Next up is visible and restores it after", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/");

  const dock = page.locator(".header-actions");
  const nextUp = page.locator("#dashboard-list .item-card").first();
  const logPurchase = nextUp.getByRole("button", { name: "Log purchase", exact: true });

  await expect(dock).toBeHidden();
  await expect(nextUp).toBeVisible();
  await expect(logPurchase).toBeVisible();

  await page.evaluate(() => {
    const card = document.querySelector("#dashboard-list .item-card");
    const bottom = card.getBoundingClientRect().bottom + window.scrollY;
    window.scrollTo(0, bottom + 24);
  });
  await expect(dock).toBeVisible();

  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(dock).toBeHidden();
});

test("fits all three navigation tabs at 320px without scrolling", async ({ page }) => {
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 700 });
    await page.goto("/");

    const nav = page.locator(".app-nav");
    const overflow = await nav.evaluate((element) => element.scrollWidth - element.clientWidth);
    expect(overflow, `navigation overflow at ${width}px`).toBeLessThanOrEqual(0);

    for (const name of ["Dashboard", "One-time", "Shopping"]) {
      const tab = page.getByRole("button", { name, exact: true });
      await expect(tab).toBeVisible();
      const box = await tab.boundingBox();
      expect(box.x, `left clipping of ${name} at ${width}px`).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width, `right clipping of ${name} at ${width}px`).toBeLessThanOrEqual(
        width + 1
      );
      expect(
        await tab.evaluate((element) => element.scrollWidth > element.clientWidth),
        `clipped ${name} label at ${width}px`
      ).toBe(false);
    }
  }
});

test("keeps one door into the shopping run and the reset control in the footer", async ({ page }) => {
  await page.setViewportSize({ width: 980, height: 800 });
  await page.goto("/");

  const header = page.locator(".app-header");
  await expect(header.getByRole("button", { name: /shopping run/i })).toHaveCount(0);
  await expect(header.getByRole("button", { name: "Shopping", exact: true })).toHaveCount(1);
  await expect(header.getByRole("button", { name: /reset/i })).toHaveCount(0);
  await expect(page.locator(".app-footer").getByRole("button", { name: "Reset demo" })).toBeVisible();

  const brand = await page.locator(".brand").boundingBox();
  expect(brand.width, "brand link spans the header row").toBeLessThan(280);
});

test("states each calendar date once", async ({ page }) => {
  await page.goto("/");

  const headers = page.locator(".calendar-day:not(.calendar-overdue) header");
  await expect(headers.first().locator("small")).toHaveText(/^[A-Z][a-z]{2}$/);

  for (let index = 0; index < 7; index += 1) {
    await expect(headers.nth(index).locator("small")).not.toHaveText(/\d/);
  }
});

test("uses checklist wording on one-time item details", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "One-time" }).click();
  await page.getByRole("button", { name: "Details", exact: true }).first().click();

  await expect(
    page.getByRole("heading", { name: "How this item is tracked" })
  ).toBeVisible();
  await expect(page.getByText("Not tracked by date")).toBeVisible();
  await expect(page.getByText("Building rhythm")).toHaveCount(0);
});

test("opens item detail at the top with focus on the item heading", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const queueTitle = page.locator(".item-row .item-title-button").first();
  const itemName = (await queueTitle.textContent()).trim();
  await queueTitle.evaluate((button) => button.scrollIntoView({ block: "center" }));

  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await queueTitle.click();

  await expect(page.locator("#item-analysis-title")).toHaveText(itemName);
  await expect(page.locator("#item-analysis-title")).toBeFocused();
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});

test("keeps purchase-history actions inside the phone viewport", async ({ page }) => {
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    await page.getByRole("button", { name: "Milk", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Milk", exact: true })).toBeVisible();

    for (const button of [
      page.getByRole("button", { name: /^Edit purchase on/ }).first(),
      page.getByRole("button", { name: /^Delete purchase on/ }).first(),
    ]) {
      await expect(button).toBeVisible();
      await button.evaluate((element) => element.scrollIntoView({ block: "center", inline: "center" }));
      const box = await button.boundingBox();
      expect(box, `missing action at ${width}px`).not.toBeNull();
      expect(box.x, `left clipping at ${width}px`).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width, `right clipping at ${width}px`).toBeLessThanOrEqual(width + 1);
    }

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(0);
  }
});

test("keeps the mobile viewport within the horizontal bounds", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/");

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

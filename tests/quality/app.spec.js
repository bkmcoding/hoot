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

    const clipped = await page.evaluate(() =>
      [...document.querySelectorAll(".header-actions .btn")]
        .filter((button) => button.scrollWidth > button.clientWidth)
        .map((button) => button.textContent.trim())
    );

    expect(clipped, `clipped dock labels at ${width}px`).toEqual([]);
  }
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
    page.getByRole("heading", { name: "How Hoot handles one-time items" })
  ).toBeVisible();
  await expect(page.getByText("Kept off the rhythm model")).toBeVisible();
  await expect(page.getByText("Building rhythm")).toHaveCount(0);
});

test("keeps the mobile viewport within the horizontal bounds", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/");

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

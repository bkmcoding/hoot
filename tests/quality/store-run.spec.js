import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function seedShoppingRun(page) {
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

    const trackedItem = (id, name, category, unit, threshold, daysAgo) => ({
      id,
      name,
      category,
      unit,
      reorderThresholdDays: threshold,
      isOneTime: false,
      completed: false,
      createdAt: isoDate(daysAgo),
      purchases: [
        {
          id: `${id}-purchase-1`,
          date: isoDate(daysAgo),
          quantity: 2,
          price: 4.5,
        },
      ],
    });

    const oneTimeItem = (id, name, category, unit, completed) => ({
      id,
      name,
      category,
      unit,
      reorderThresholdDays: 0,
      isOneTime: true,
      completed,
      createdAt: isoDate(-3),
      purchases: [],
    });

    const state = {
      items: [
        trackedItem("item-overdue", "Overdue Milk", "Pantry", "half-gallon", 7, -10),
        trackedItem("item-buy-now", "Buy-now Eggs", "Pantry", "dozen", 4, -2),
        trackedItem("item-watch", "Watch Apples", "Pantry", "bag", 8, -2),
        oneTimeItem("item-one-time", "One-time Candles", "Household", "pack", false),
        oneTimeItem("item-completed", "Completed Tape", "Household", "roll", true),
      ],
    };

    localStorage.setItem("hoot-demo-state-v1", JSON.stringify(state));
    localStorage.setItem(
      "hoot-demo-store-run-v1",
      JSON.stringify({ includeWatch: false, selected: [] })
    );
  });
}

async function openShoppingRun(page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Shopping", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Shopping run" })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await seedShoppingRun(page);
});

test("opens Shopping Run from the header", async ({ page }) => {
  await openShoppingRun(page);

  await expect(page.getByRole("region", { name: "Items logged this trip" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Finish shopping run" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Exit run" })).toBeVisible();
  await expect(page.locator(".app-header")).toBeHidden();
  await expect(page.locator(".app-footer")).toBeHidden();
  await expect(page.locator(".store-run-cart-empty")).toContainText(
    "Hoot saves the change now; Undo here reverses it."
  );
});

test("uses immediate logging language instead of cart language", async ({ page }) => {
  await openShoppingRun(page);

  const run = page.locator("#view-store-run");
  await expect(run.getByText(/cart/i)).toHaveCount(0);
  await expect(page.locator("#store-run-summary")).toContainText("Logged");
  await expect(
    page.getByRole("button", { name: "Log Overdue Milk", exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Items logged this trip" })
  ).toBeVisible();
});

test("moves focus into the run and back to the dashboard", async ({ page }) => {
  await page.goto("/");
  const start = page.getByRole("button", { name: "Shopping", exact: true });
  await start.focus();
  await page.keyboard.press("Enter");

  await expect(page.getByRole("heading", { name: "Shopping run" })).toBeFocused();

  await page.getByRole("button", { name: "Exit run" }).focus();
  await page.keyboard.press("Enter");

  await expect(page.locator('.nav-button[data-view="dashboard"]')).toBeFocused();
  await expect(page.getByRole("heading", { name: "Upcoming restocks" })).toBeVisible();
});

test("resets the run to the top when entered from a scrolled dashboard", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/");
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);

  await page.getByRole("button", { name: "Shopping", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Shopping run" })).toBeFocused();
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await expect(page.locator("#store-run-summary")).toBeInViewport({ ratio: 1 });
});

test("groups aisles and sorts urgency inside each aisle", async ({ page }) => {
  await openShoppingRun(page);

  const groups = page.locator("#store-run-groups .store-run-group");
  await expect(groups).toHaveCount(2);
  await expect(groups.nth(0)).toContainText("Household");
  await expect(groups.nth(1)).toContainText("Pantry");
  await expect(page.locator("#view-store-run").getByText("Completed Tape")).toHaveCount(0);

  const pantryRows = groups.nth(1).locator(".store-run-row");
  await expect(pantryRows).toHaveCount(2);
  await expect(pantryRows.nth(0).locator("strong")).toHaveText("Overdue Milk");
  await expect(pantryRows.nth(1).locator("strong")).toHaveText("Buy-now Eggs");
});

test("puts the trip beside the aisles on desktop and stacks it on tablet", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openShoppingRun(page);

  const aisles = page.locator(".store-run-aisles");
  const trip = page.locator(".store-run-trip");
  const [aislesBox, tripBox] = await Promise.all([
    aisles.boundingBox(),
    trip.boundingBox(),
  ]);

  expect(tripBox.x).toBeGreaterThanOrEqual(aislesBox.x + aislesBox.width + 16);
  expect(Math.abs(tripBox.y - aislesBox.y)).toBeLessThanOrEqual(1);
  await expect(trip).toHaveCSS("position", "sticky");
  await expect(trip.getByRole("button", { name: "Finish shopping run" })).toBeVisible();

  const desktopOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(desktopOverflow, "desktop overflow").toBeLessThanOrEqual(0);

  await page.setViewportSize({ width: 980, height: 900 });
  await page.goto("/");
  await page.getByRole("button", { name: "Shopping", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Shopping run" })).toBeVisible();

  const [tabletAisles, tabletTrip] = await Promise.all([
    aisles.boundingBox(),
    trip.boundingBox(),
  ]);

  expect(tabletTrip.y).toBeGreaterThanOrEqual(tabletAisles.y + tabletAisles.height);
  await expect(trip).toHaveCSS("position", "static");
  await expect(trip.getByRole("button", { name: "Finish shopping run" })).toBeVisible();

  const tabletOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(tabletOverflow, "tablet overflow").toBeLessThanOrEqual(0);
});

test("logs a purchase and marks a tracked item as logged", async ({ page }) => {
  await openShoppingRun(page);

  await page
    .locator(".store-run-row", { hasText: "Overdue Milk" })
    .getByRole("button", { name: /^Log / })
    .click();

  await expect(
    page.locator("#store-run-cart").getByText("Overdue Milk")
  ).toBeVisible();
  const checkedRow = page.locator(".store-run-row.is-in-cart", { hasText: "Overdue Milk" });
  await expect(checkedRow).toContainText("Logged");
  await expect(checkedRow.locator(".status-chip")).toHaveCount(0);
  await expect(checkedRow.getByRole("button")).toHaveCount(0);
  await expect(page.locator("#store-run-announcer")).toHaveText(
    "Overdue Milk logged. 1 logged this trip."
  );

  const purchase = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("hoot-demo-state-v1"));
    const item = state.items.find((entry) => entry.id === "item-overdue");
    return item.purchases[item.purchases.length - 1];
  });

  const today = await page.evaluate(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });

  expect(purchase.date).toBe(today);
  expect(purchase.quantity).toBe(2);
  expect(purchase.price).toBe(4.5);
});

test("keeps a checked row in its aisle position", async ({ page }) => {
  await openShoppingRun(page);

  const pantryRows = page
    .locator("#store-run-groups .store-run-group", { hasText: "Pantry" })
    .locator(".store-run-row");
  const orderBefore = await pantryRows.locator("strong").allInnerTexts();

  await pantryRows
    .first()
    .getByRole("button", { name: "Log Overdue Milk", exact: true })
    .click();

  await expect(pantryRows.locator("strong")).toHaveText(orderBefore);
  await expect(pantryRows.first()).toHaveClass(/is-in-cart/);
  await expect(pantryRows.first()).toContainText("Logged");
});

test("keeps keyboard focus moving through the aisle", async ({ page }) => {
  await openShoppingRun(page);

  await page.getByRole("button", { name: "Log Overdue Milk", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Log Buy-now Eggs", exact: true })
  ).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Log One-time Candles", exact: true })
  ).toBeFocused();
});

test("names each Log action for its item", async ({ page }) => {
  await openShoppingRun(page);

  await expect(
    page.getByRole("button", { name: "Log Overdue Milk", exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Log One-time Candles", exact: true })
  ).toBeVisible();
});

test("completes a one-time item on checkoff", async ({ page }) => {
  await openShoppingRun(page);

  await page
    .locator(".store-run-row", { hasText: "One-time Candles" })
    .getByRole("button", { name: /^Log / })
    .click();

  await expect(
    page.locator("#store-run-cart").getByText("One-time Candles")
  ).toBeVisible();

  const completed = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("hoot-demo-state-v1"));
    const item = state.items.find((entry) => entry.id === "item-one-time");
    return item.completed;
  });

  expect(completed).toBe(true);
});

test("undo restores a tracked purchase", async ({ page }) => {
  await openShoppingRun(page);

  await page
    .locator(".store-run-row", { hasText: "Overdue Milk" })
    .getByRole("button", { name: /^Log / })
    .click();

  await page
    .locator("#store-run-cart")
    .getByRole("button", { name: "Undo Overdue Milk" })
    .click();

  await expect(page.locator("#store-run-cart").getByText("Overdue Milk")).toHaveCount(0);

  const purchaseCount = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("hoot-demo-state-v1"));
    const item = state.items.find((entry) => entry.id === "item-overdue");
    return item.purchases.length;
  });

  expect(purchaseCount).toBe(1);
});

test("undo restores a one-time item", async ({ page }) => {
  await openShoppingRun(page);

  await page
    .locator(".store-run-row", { hasText: "One-time Candles" })
    .getByRole("button", { name: /^Log / })
    .click();

  await page
    .locator("#store-run-cart")
    .getByRole("button", { name: "Undo One-time Candles" })
    .click();

  await expect(page.locator("#store-run-cart").getByText("One-time Candles")).toHaveCount(0);

  const completed = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("hoot-demo-state-v1"));
    const item = state.items.find((entry) => entry.id === "item-one-time");
    return item.completed;
  });

  expect(completed).toBe(false);
});

test("opens the existing purchase editor from a tracked logged row", async ({ page }) => {
  await openShoppingRun(page);

  await page
    .locator(".store-run-row", { hasText: "Overdue Milk" })
    .getByRole("button", { name: /^Log / })
    .click();

  await page
    .locator("#store-run-cart")
    .getByRole("button", { name: "Adjust Overdue Milk" })
    .click();

  await expect(page.getByRole("heading", { name: "Edit purchase" })).toBeVisible();
});

test("opens the existing item editor from a one-time logged row", async ({ page }) => {
  await openShoppingRun(page);

  await page
    .locator(".store-run-row", { hasText: "One-time Candles" })
    .getByRole("button", { name: /^Log / })
    .click();

  await page
    .locator("#store-run-cart")
    .getByRole("button", { name: "Adjust One-time Candles" })
    .click();

  await expect(page.getByRole("heading", { name: "Edit item" })).toBeVisible();
});

test("finishes the run, clears the trip, and returns to Dashboard", async ({ page }) => {
  await openShoppingRun(page);

  await page
    .locator(".store-run-row", { hasText: "Overdue Milk" })
    .getByRole("button", { name: /^Log / })
    .click();
  await page
    .locator(".store-run-row", { hasText: "One-time Candles" })
    .getByRole("button", { name: /^Log / })
    .click();

  await page.getByRole("button", { name: "Finish shopping run" }).click();
  await expect(page.getByRole("heading", { name: "Shopping run finished" })).toBeVisible();
  await expect(page.locator("#finish-run-message")).toHaveText(
    "2 items logged. 1 prediction updated."
  );
  await expect(page.locator("#finish-run-summary")).toContainText("2 items");
  await expect(page.locator("#finish-run-summary")).toContainText("$4.50 known spend");
  await page.getByRole("button", { name: "Done" }).click();

  await expect(page.locator('.nav-button[data-view="dashboard"]')).toBeFocused();
  await expect(page.getByRole("heading", { name: "Upcoming restocks" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Shopping run" })).toBeHidden();
  await expect(page.getByRole("heading", { name: "Shopping run finished" })).toBeHidden();

  const session = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("hoot-demo-store-run-v1"))
  );

  expect(session.includeWatch).toBe(false);
  expect(session.selected).toEqual([]);
});

test("records a prediction check and applies a still-had-some shift", async ({ page }) => {
  await openShoppingRun(page);

  await page
    .locator(".store-run-row", { hasText: "Overdue Milk" })
    .getByRole("button", { name: /^Log / })
    .click();
  await page
    .locator(".store-run-row", { hasText: "One-time Candles" })
    .getByRole("button", { name: /^Log / })
    .click();
  await page.getByRole("button", { name: "Finish shopping run" }).click();

  const milkEntry = page.locator("#finish-run-list li", { hasText: "Overdue Milk" });
  const candleEntry = page.locator("#finish-run-list li", { hasText: "One-time Candles" });
  const check = milkEntry.locator(".prediction-check");

  await expect(page.locator("#finish-run-hint")).toBeVisible();
  await expect(check).toContainText("was Hoot right?");
  await expect(candleEntry.locator(".prediction-check")).toHaveCount(0);

  const early = check.getByRole("button", { name: "Still had some" });
  await early.click();

  await expect(early).toHaveAttribute("aria-pressed", "true");
  await expect(check.locator("[data-check-result]")).toHaveText(
    /Still had some · next estimate moved to/
  );
  await expect(page.locator("#prediction-check-status")).toContainText(
    "Overdue Milk marked still had some."
  );

  const afterEarly = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("hoot-demo-state-v1"));
    const item = state.items.find((entry) => entry.id === "item-overdue");
    return item.purchases[item.purchases.length - 1].feedback;
  });
  expect(afterEarly.verdict).toBe("early");
  expect(afterEarly.predictedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);

  const right = check.getByRole("button", { name: "Yes, I was out" });
  await right.click();

  await expect(right).toHaveAttribute("aria-pressed", "true");
  await expect(early).toHaveAttribute("aria-pressed", "false");
  await expect(check.locator("[data-check-result]")).toHaveText(/Right · next estimate/);

  await page.getByRole("button", { name: "View purchase history" }).click();
  await expect(
    page.locator(".rail-card", { hasText: "Your checks" })
  ).toContainText("1 right");
});

test("opens purchase history from the finish receipt", async ({ page }) => {
  await openShoppingRun(page);

  await page
    .locator(".store-run-row", { hasText: "Overdue Milk" })
    .getByRole("button", { name: /^Log / })
    .click();
  await page.getByRole("button", { name: "Finish shopping run" }).click();
  await page.getByRole("button", { name: "View purchase history" }).click();

  await expect(
    page.getByRole("heading", { name: "Overdue Milk", level: 1 })
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Back to dashboard" })).toBeFocused();
  await page.getByRole("button", { name: "Back to dashboard" }).click();
  await expect(page.getByRole("heading", { name: "Upcoming restocks" })).toBeVisible();
});

test("includes Watch when the dashboard Next up is in Watch", async ({ page }) => {
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
            id: "item-only-watch",
            name: "Watch Pears",
            category: "Pantry",
            unit: "bag",
            reorderThresholdDays: 8,
            isOneTime: false,
            completed: false,
            createdAt: isoDate(-8),
            purchases: [
              { id: "watch-pears-1", date: isoDate(-2), quantity: 1, price: 3.25 },
            ],
          },
        ],
      })
    );
    localStorage.setItem(
      "hoot-demo-store-run-v1",
      JSON.stringify({ includeWatch: false, selected: [] })
    );
  });

  await openShoppingRun(page);

  await expect(
    page.locator("#store-run-groups .store-run-row", { hasText: "Watch Pears" })
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Hide Watch items" })).toHaveAttribute(
    "aria-pressed",
    "true"
  );
});

test("dismissing the receipt keeps the run active", async ({ page }) => {
  await openShoppingRun(page);

  await page
    .locator(".store-run-row", { hasText: "Overdue Milk" })
    .getByRole("button", { name: /^Log / })
    .click();
  await page.getByRole("button", { name: "Finish shopping run" }).click();
  await page.keyboard.press("Escape");

  await expect(page.getByRole("heading", { name: "Shopping run" })).toBeVisible();
  await expect(page.locator("#store-run-cart").getByText("Overdue Milk")).toBeVisible();
  await expect(page.getByRole("button", { name: "Finish shopping run" })).toBeEnabled();
});

test("toggles Watch items without disturbing the rest of the run", async ({ page }) => {
  await openShoppingRun(page);

  const watchToggle = page.getByRole("button", { name: "Show Watch items" });
  await expect(watchToggle).toHaveAttribute("aria-pressed", "false");

  await watchToggle.click();

  await expect(
    page.locator("#store-run-groups .store-run-row", { hasText: "Watch Apples" })
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Hide Watch items" })).toHaveAttribute(
    "aria-pressed",
    "true"
  );

  await page.getByRole("button", { name: "Hide Watch items" }).click();

  await expect(page.locator(".store-run-row", { hasText: "Watch Apples" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Show Watch items" })).toHaveAttribute(
    "aria-pressed",
    "false"
  );
});

test("keeps the Shopping Run view within the mobile horizontal bounds", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await openShoppingRun(page);

  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth
  );

  expect(overflow).toBeLessThanOrEqual(0);
});

test("has no critical accessibility violations on the Shopping Run view", async ({ page }) => {
  await openShoppingRun(page);

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "best-practice"])
    .analyze();

  expect(results.violations).toEqual([]);
});

test("has no critical accessibility violations on the finish receipt", async ({ page }) => {
  await openShoppingRun(page);

  await page
    .locator(".store-run-row", { hasText: "Overdue Milk" })
    .getByRole("button", { name: /^Log / })
    .click();
  await page.getByRole("button", { name: "Finish shopping run" }).click();

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "best-practice"])
    .analyze();

  expect(results.violations).toEqual([]);
});

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

async function seedMinimalRun(page, { lastPurchaseDaysAgo, threshold }) {
  await page.addInitScript(
    ({ lastPurchaseDaysAgo, threshold }) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const iso = (offset) => {
        const date = new Date(today);
        date.setDate(date.getDate() + offset);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      };
      const item = {
        id: "item-minimal",
        name: "Test Flour",
        category: "Pantry",
        unit: "bag",
        reorderThresholdDays: threshold,
        isOneTime: false,
        completed: false,
        createdAt: iso(-(lastPurchaseDaysAgo + 5)),
        purchases: [
          {
            id: "purchase-minimal",
            date: iso(-lastPurchaseDaysAgo),
            quantity: 1,
            price: 3.5,
          },
        ],
      };
      localStorage.setItem("hoot-demo-state-v1", JSON.stringify({ items: [item] }));
      localStorage.setItem(
        "hoot-demo-store-run-v1",
        JSON.stringify({ includeWatch: false, selected: [] })
      );
    },
    { lastPurchaseDaysAgo, threshold }
  );
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
    "Log saves the change now; Undo reverses it."
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

test("skips an item for this trip without logging and restores it", async ({ page }) => {
  await openShoppingRun(page);

  await page
    .getByRole("button", { name: "Not this trip for Overdue Milk" })
    .click();

  await expect(page.locator(".store-run-row", { hasText: "Overdue Milk" })).toHaveCount(0);
  await expect(page.locator("#store-run-skipped")).toBeVisible();
  await expect(page.locator("#store-run-skipped")).toContainText("Overdue Milk");
  await expect(page.locator("#store-run-announcer")).toHaveText(
    "Overdue Milk skipped this trip. 1 skipped."
  );
  await expect(page.locator("#store-run-summary article").first()).toContainText("2");

  const purchaseCount = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("hoot-demo-state-v1"));
    return state.items.find((entry) => entry.id === "item-overdue").purchases.length;
  });
  expect(purchaseCount).toBe(1);

  const session = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("hoot-demo-store-run-v1"))
  );
  expect(session.skippedIds).toEqual(["item-overdue"]);

  await page.getByRole("button", { name: "Undo skipping Overdue Milk" }).click();

  await expect(page.locator("#store-run-skipped")).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Not this trip for Overdue Milk" })
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Log Overdue Milk", exact: true })
  ).toBeFocused();
});

test("keeps the skipped Undo below the sticky header when every row is skipped", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await openShoppingRun(page);

  for (const name of ["Overdue Milk", "Buy-now Eggs", "One-time Candles"]) {
    await page.getByRole("button", { name: `Not this trip for ${name}` }).click();
  }

  const undo = page.getByRole("button", { name: "Undo skipping One-time Candles" });
  await expect(undo).toBeFocused();
  await expect(page.locator("#store-run-empty")).toContainText(
    "Everything left is skipped"
  );

  const [undoBox, headerBox] = await Promise.all([
    undo.boundingBox(),
    page.locator(".store-run-header").boundingBox(),
  ]);
  expect(undoBox.y).toBeGreaterThanOrEqual(headerBox.y + headerBox.height - 1);
});

test("adds a not-due item to this trip without logging it", async ({ page }) => {
  await openShoppingRun(page);

  await page.getByRole("button", { name: "Add to this trip", exact: true }).click();

  const dialog = page.getByRole("dialog", { name: "Add to this trip" });
  const search = dialog.getByRole("searchbox", { name: "Find an item" });
  await expect(dialog).toBeVisible();
  await expect(search).toBeFocused();
  await expect(
    dialog.getByRole("button", { name: /Add Watch Apples to this trip/ })
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: /Add Overdue Milk to this trip/ })
  ).toHaveCount(0);

  await search.fill("no such thing");
  await expect(dialog.getByText(/No items match/)).toBeVisible();

  await search.fill("Watch Apples");
  await dialog.getByRole("button", { name: /Add Watch Apples to this trip/ }).click();

  const row = page.locator(".store-run-row", { hasText: "Watch Apples" });
  await expect(dialog).toBeHidden();
  await expect(row).toBeVisible();
  await expect(row.locator(".status-chip")).toHaveText("Watch");
  await expect(page.locator("#store-run-announcer")).toHaveText(
    "Watch Apples added to this trip. Not logged."
  );
  await expect(
    page.getByRole("button", { name: "Log Watch Apples", exact: true })
  ).toBeFocused();

  const purchaseCount = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("hoot-demo-state-v1"));
    return state.items.find((entry) => entry.id === "item-watch").purchases.length;
  });
  expect(purchaseCount).toBe(1);

  const session = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("hoot-demo-store-run-v1"))
  );
  expect(session.selected).toEqual([]);
  expect(session.extraIds).toContain("item-watch");
});

test("adds a not-due item to an empty run", async ({ page }) => {
  await seedMinimalRun(page, { lastPurchaseDaysAgo: 0, threshold: 30 });
  await openShoppingRun(page);

  const empty = page.locator("#store-run-empty");
  await expect(empty).toBeVisible();
  await empty.getByRole("button", { name: "Add to this trip" }).click();

  const dialog = page.getByRole("dialog", { name: "Add to this trip" });
  await dialog.getByRole("button", { name: /Add Test Flour to this trip/ }).click();

  await expect(empty).toBeHidden();
  await expect(page.locator(".store-run-row", { hasText: "Test Flour" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Log Test Flour", exact: true })
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Finish shopping run" })).toBeDisabled();
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
    "2 items logged. 1 restock check ready."
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
  const checkGroup = page.getByRole("group", {
    name: /Overdue Milk.*was Hoot right\?/,
  });

  await expect(page.locator("#finish-run-hint")).toBeVisible();
  await expect(check).toContainText("was Hoot right?");
  await expect(candleEntry.locator(".prediction-check")).toHaveCount(0);
  await expect(checkGroup).toBeVisible();
  await expect(checkGroup.getByRole("radio")).toHaveCount(2);

  const early = checkGroup.getByRole("radio", { name: "Still had some" });
  const right = checkGroup.getByRole("radio", { name: "Yes, I was out" });
  await expect(early).not.toBeChecked();
  await expect(right).not.toBeChecked();

  await early.click();

  await expect(early).toBeChecked();
  await expect(right).not.toBeChecked();
  await expect(checkGroup.getByRole("radio", { checked: true })).toHaveCount(1);
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

  await early.focus();
  await page.keyboard.press("ArrowRight");

  await expect(right).toBeChecked();
  await expect(early).not.toBeChecked();
  await expect(checkGroup.getByRole("radio", { checked: true })).toHaveCount(1);
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

test("collapses the ordering sentence after the phone run starts scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await openShoppingRun(page);

  const view = page.locator("#view-store-run");
  const header = page.locator(".store-run-header");
  const subtitle = header.locator("p");
  const initialHeight = (await header.boundingBox()).height;
  expect(initialHeight).toBeGreaterThan(130);
  await expect(subtitle).toBeVisible();

  await page.evaluate(() => window.scrollTo(0, 180));

  await expect(view).toHaveClass(/is-header-condensed/);
  await expect.poll(async () => (await header.boundingBox()).height).toBeLessThan(120);
  await expect.poll(async () => (await subtitle.boundingBox()).height).toBeLessThan(1);

  await page.evaluate(() => window.scrollTo(0, 0));

  await expect(view).not.toHaveClass(/is-header-condensed/);
  await expect.poll(async () => (await header.boundingBox()).height).toBeGreaterThan(
    initialHeight - 2
  );
});

test("keeps phone Log actions compact and trailing", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await openShoppingRun(page);

  const row = page.locator(".store-run-row", { hasText: "Buy-now Eggs" });
  const button = row.getByRole("button", { name: "Log Buy-now Eggs", exact: true });
  const rowBox = await row.boundingBox();
  const buttonBox = await button.boundingBox();

  expect(rowBox.height).toBeLessThan(110);
  expect(buttonBox.height).toBeGreaterThanOrEqual(44);
  expect(buttonBox.width).toBeLessThanOrEqual(100);
  expect(buttonBox.x).toBeGreaterThan(rowBox.x + rowBox.width * 0.55);
});

test("offers Undo last in the phone footer for the latest log", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await openShoppingRun(page);

  const undoLast = page.locator(
    '.store-run-footer [data-action="undo-last-run-item"]'
  );
  await expect(undoLast).toBeHidden();

  await page
    .locator(".store-run-row", { hasText: "Overdue Milk" })
    .getByRole("button", { name: "Log Overdue Milk", exact: true })
    .click();
  await expect(undoLast).toBeVisible();
  await expect(undoLast).toBeInViewport();
  await expect(
    page
      .locator(".store-run-footer")
      .getByRole("button", { name: "Undo Overdue Milk", exact: true })
  ).toBeVisible();

  const footerPosition = await page
    .locator(".store-run-footer")
    .evaluate((element) => getComputedStyle(element).position);
  expect(footerPosition).toBe("fixed");

  await page
    .locator(".store-run-row", { hasText: "Buy-now Eggs" })
    .getByRole("button", { name: "Log Buy-now Eggs", exact: true })
    .click();
  await expect(
    page
      .locator(".store-run-footer")
      .getByRole("button", { name: "Undo Buy-now Eggs", exact: true })
  ).toBeVisible();

  await undoLast.click();

  await expect(page.locator(".store-run-row", { hasText: "Buy-now Eggs" })).toBeVisible();
  await expect(page.locator(".store-run-row", { hasText: "Overdue Milk" })).toHaveClass(
    /is-in-cart/
  );
  await expect(
    page
      .locator(".store-run-footer")
      .getByRole("button", { name: "Undo Overdue Milk", exact: true })
  ).toBeVisible();
  await expect(page.locator("#store-run-cart")).toContainText("Overdue Milk");
  await expect(page.locator("#store-run-cart")).not.toContainText("Buy-now Eggs");
  await expect(page.locator("#store-run-cart")).toContainText("1 item");
});

test("keeps Undo last out of the desktop footer", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openShoppingRun(page);

  await page
    .locator(".store-run-row", { hasText: "Overdue Milk" })
    .getByRole("button", { name: /^Log / })
    .click();

  await expect(
    page.locator('.store-run-footer [data-action="undo-last-run-item"]')
  ).toBeHidden();
});

test("explains an empty run and keeps the finish footer out of the way", async ({ page }) => {
  await seedMinimalRun(page, { lastPurchaseDaysAgo: 0, threshold: 30 });
  await page.setViewportSize({ width: 320, height: 640 });
  await openShoppingRun(page);

  const empty = page.locator("#store-run-empty");
  await expect(empty).toBeVisible();
  await expect(
    empty.getByRole("heading", { name: "Nothing is due right now" })
  ).toBeVisible();
  await expect(page.locator("#store-run-groups .store-run-row")).toHaveCount(0);
  await expect(page.locator("#store-run-cart")).toContainText("Nothing to log yet");
  await expect(page.locator("#store-run-cart")).not.toContainText("Tap Log");
  await expect(page.getByRole("button", { name: "Finish shopping run" })).toBeDisabled();
  await expect(
    page.locator('.store-run-footer [data-action="undo-last-run-item"]')
  ).toBeHidden();

  const footerPosition = await page
    .locator(".store-run-footer")
    .evaluate((element) => getComputedStyle(element).position);
  expect(footerPosition).toBe("static");

  await expect(
    empty.getByRole("button", { name: "Show Watch items" })
  ).toHaveCount(0);
  await expect(empty.getByRole("button", { name: "Back to dashboard" })).toBeVisible();
});

test("recovers an empty run from Show Watch", async ({ page }) => {
  await seedMinimalRun(page, { lastPurchaseDaysAgo: 0, threshold: 5 });
  await openShoppingRun(page);

  await expect(page.locator(".store-run-row", { hasText: "Test Flour" })).toBeVisible();
  await page.getByRole("button", { name: "Hide Watch items" }).click();

  const empty = page.locator("#store-run-empty");
  await expect(empty).toBeVisible();

  await empty.getByRole("button", { name: "Show Watch items" }).click();

  await expect(page.locator("#store-run-groups .store-run-row", { hasText: "Test Flour" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Log Test Flour", exact: true })).toBeFocused();
});

test("renders urgency as text and color on run rows", async ({ page }) => {
  await openShoppingRun(page);

  const milk = page.locator(".store-run-row", { hasText: "Overdue Milk" });
  await expect(milk).toHaveClass(/horizon-overdue/);
  await expect(milk.locator(".status-chip")).toHaveText("Overdue");
  await expect(milk.locator(".status-chip")).toHaveClass(/status-overdue/);
  await expect(milk.locator(".store-run-row-main small")).not.toContainText("Pantry");
  await expect(milk.locator(".store-run-row-main small")).toContainText("half-gallon");
});

test("does not paint a focus ring around the run heading on keyboard entry", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Shopping", exact: true }).focus();
  await page.keyboard.press("Enter");

  const heading = page.getByRole("heading", { name: "Shopping run" });
  await expect(heading).toBeFocused();
  const outlineStyle = await heading.evaluate(
    (element) => getComputedStyle(element).outlineStyle
  );
  expect(outlineStyle).toBe("none");
});

test("keeps the 320 receipt to one scroll region and 44px prediction answers", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openShoppingRun(page);

  for (const name of ["Overdue Milk", "Buy-now Eggs", "One-time Candles"]) {
    await page
      .locator(".store-run-row", { hasText: name })
      .getByRole("button", { name: /^Log / })
      .click();
  }

  await page.getByRole("button", { name: "Finish shopping run" }).click();

  const answerHeights = await page
    .locator(".prediction-check-actions .btn")
    .evaluateAll((buttons) =>
      buttons.map((button) => button.getBoundingClientRect().height)
    );
  expect(answerHeights.length).toBeGreaterThan(0);
  for (const height of answerHeights) {
    expect(height).toBeGreaterThanOrEqual(44);
  }

  const list = await page.locator("#finish-run-list").evaluate((element) => ({
    overflowY: getComputedStyle(element).overflowY,
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
  }));
  expect(list.overflowY).toBe("visible");
  expect(list.scrollHeight).toBeLessThanOrEqual(list.clientHeight + 1);

  const dialogOverflow = await page
    .locator("#finish-run-dialog")
    .evaluate((element) => getComputedStyle(element).overflowY);
  expect(dialogOverflow).toBe("auto");

  const lastEntry = page.locator("#finish-run-list li").last();
  await lastEntry.scrollIntoViewIfNeeded();
  await expect(lastEntry).toBeInViewport();
});

test("sizes the finish receipt at 520px on desktop", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "desktop sheet width");
  await page.setViewportSize({ width: 1440, height: 900 });
  await openShoppingRun(page);

  await page
    .locator(".store-run-row", { hasText: "Overdue Milk" })
    .getByRole("button", { name: /^Log / })
    .click();
  await page.getByRole("button", { name: "Finish shopping run" }).click();

  await expect(page.locator("#finish-run-dialog")).toHaveCSS("width", "520px");
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

test("keeps the add and skip controls usable at 320", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await openShoppingRun(page);

  const skipHeights = await page
    .locator(".store-run-skip")
    .evaluateAll((buttons) =>
      buttons.map((button) => button.getBoundingClientRect().height)
    );
  expect(skipHeights.length).toBeGreaterThan(0);
  for (const height of skipHeights) expect(height).toBeGreaterThanOrEqual(44);

  await page.getByRole("button", { name: "Add to this trip", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Add to this trip" });
  await expect(dialog).toBeVisible();

  const dialogOverflow = await dialog.evaluate(
    (element) => element.scrollWidth - element.clientWidth
  );
  expect(dialogOverflow).toBeLessThanOrEqual(0);

  const optionHeights = await dialog
    .locator(".add-to-trip-option")
    .evaluateAll((buttons) =>
      buttons.map((button) => button.getBoundingClientRect().height)
    );
  expect(optionHeights.length).toBeGreaterThan(0);
  for (const height of optionHeights) expect(height).toBeGreaterThanOrEqual(44);
});

test("has no critical accessibility violations in the add sheet", async ({ page }) => {
  await openShoppingRun(page);
  await page.getByRole("button", { name: "Add to this trip", exact: true }).click();

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "best-practice"])
    .analyze();

  expect(results.violations).toEqual([]);
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

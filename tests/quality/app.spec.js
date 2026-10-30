import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("loads the dashboard with the expected primary surfaces", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/Hoot/);
  await expect(page.getByRole("link", { name: /Hoot home/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Upcoming restocks" })).toBeVisible();
});

test("labels the first-run Next up as a learning estimate", async ({ page }) => {
  await page.goto("/");

  const nextUp = page.locator("#dashboard-list .item-card").first();
  await expect(nextUp).toContainText("Trash bags");
  await expect(nextUp).toContainText("Learning");
  await expect(nextUp).toContainText("1 of 3 purchases");
  await expect(nextUp).toContainText("Manual 35-day estimate");
  await expect(nextUp).toContainText("Estimated restock");
  await expect(nextUp).not.toContainText("Next predicted restock");
});

test("keeps the learning cue inside the Next up card at desktop and tablet widths", async ({ page }) => {
  for (const width of [1440, 980]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");

    const nextUp = page.locator("#dashboard-list .item-card").first();
    await expect(nextUp).toContainText("Learning");

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow, `page overflow at ${width}px`).toBeLessThanOrEqual(0);

    const cueBox = await nextUp.locator(".next-up-estimate").boundingBox();
    const cardBox = await nextUp.boundingBox();
    expect(cueBox, `missing cue at ${width}px`).not.toBeNull();
    expect(cardBox, `missing card at ${width}px`).not.toBeNull();
    expect(cueBox.x, `cue left clipping at ${width}px`).toBeGreaterThanOrEqual(cardBox.x);
    expect(cueBox.x + cueBox.width, `cue right clipping at ${width}px`).toBeLessThanOrEqual(
      cardBox.x + cardBox.width + 1
    );
  }
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

test("shows the full week in a two-column phone calendar", async ({ page }) => {
  for (const width of [320, 390, 440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");

    const strip = page.locator("#restock-calendar");
    const columns = await strip.evaluate(
      (element) => getComputedStyle(element).gridTemplateColumns.split(" ").length
    );
    expect(columns, `calendar columns at ${width}px`).toBe(2);

    const stripOverflow = await strip.evaluate(
      (element) => element.scrollWidth - element.clientWidth
    );
    expect(stripOverflow, `calendar overflow at ${width}px`).toBeLessThanOrEqual(0);

    const pageOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(pageOverflow, `page overflow at ${width}px`).toBeLessThanOrEqual(0);

    const dayBoxes = await page.locator(".calendar-day").evaluateAll((elements) =>
      elements.map((element) => {
        const rect = element.getBoundingClientRect();
        return { left: rect.left, right: rect.right };
      })
    );
    expect(dayBoxes, `day count at ${width}px`).toHaveLength(8);
    for (const box of dayBoxes) {
      expect(box.left, `left clipping at ${width}px`).toBeGreaterThanOrEqual(0);
      expect(box.right, `right clipping at ${width}px`).toBeLessThanOrEqual(width + 1);
    }

    if (width === 320) {
      await page.getByRole("button", { name: "All 14 days" }).click();
      await expect(page.locator(".calendar-day")).toHaveCount(15);
      const columnsAfterExpand = await strip.evaluate(
        (element) => getComputedStyle(element).gridTemplateColumns.split(" ").length
      );
      expect(columnsAfterExpand, "calendar columns after expanding").toBe(2);
      const overflowAfterExpand = await strip.evaluate(
        (element) => element.scrollWidth - element.clientWidth
      );
      expect(overflowAfterExpand, "calendar overflow after expanding").toBeLessThanOrEqual(0);
    }
  }
});

test("fits the full seven- and fourteen-day calendar at tablet and desktop widths", async ({ page }) => {
  const cases = [
    { width: 660, columns7: 2, columns14: 2 },
    { width: 980, columns7: 4, columns14: 4 },
    { width: 1120, columns7: 4, columns14: 4 },
    { width: 1121, columns7: 8, columns14: 8 },
    { width: 1440, columns7: 8, columns14: 8 },
  ];

  for (const { width, columns7, columns14 } of cases) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");

    const strip = page.locator("#restock-calendar");
    await expect(page.locator(".calendar-day")).toHaveCount(8);

    const columns = await strip.evaluate(
      (element) => getComputedStyle(element).gridTemplateColumns.split(" ").length
    );
    expect(columns, `seven-day columns at ${width}px`).toBe(columns7);

    const stripOverflow = await strip.evaluate(
      (element) => element.scrollWidth - element.clientWidth
    );
    expect(stripOverflow, `seven-day strip overflow at ${width}px`).toBeLessThanOrEqual(0);

    const pageOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(pageOverflow, `seven-day page overflow at ${width}px`).toBeLessThanOrEqual(0);

    const sevenDayBoxes = await page.locator(".calendar-day").evaluateAll((elements) =>
      elements.map((element) => {
        const rect = element.getBoundingClientRect();
        return { left: rect.left, right: rect.right };
      })
    );
    for (const box of sevenDayBoxes) {
      expect(box.left, `seven-day left clipping at ${width}px`).toBeGreaterThanOrEqual(0);
      expect(box.right, `seven-day right clipping at ${width}px`).toBeLessThanOrEqual(width + 1);
    }

    await page.getByRole("button", { name: "All 14 days" }).click();
    await expect(page.locator(".calendar-day")).toHaveCount(15);

    const expandedColumns = await strip.evaluate(
      (element) => getComputedStyle(element).gridTemplateColumns.split(" ").length
    );
    expect(expandedColumns, `fourteen-day columns at ${width}px`).toBe(columns14);

    const expandedOverflow = await strip.evaluate(
      (element) => element.scrollWidth - element.clientWidth
    );
    expect(expandedOverflow, `fourteen-day strip overflow at ${width}px`).toBeLessThanOrEqual(0);

    const expandedPageOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(expandedPageOverflow, `fourteen-day page overflow at ${width}px`).toBeLessThanOrEqual(0);

    const fourteenDayBoxes = await page.locator(".calendar-day").evaluateAll((elements) =>
      elements.map((element) => {
        const rect = element.getBoundingClientRect();
        return { left: rect.left, right: rect.right };
      })
    );
    for (const box of fourteenDayBoxes) {
      expect(box.left, `fourteen-day left clipping at ${width}px`).toBeGreaterThanOrEqual(0);
      expect(box.right, `fourteen-day right clipping at ${width}px`).toBeLessThanOrEqual(width + 1);
    }
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
    page.getByRole("heading", { name: "On your checklist" })
  ).toBeVisible();
  await expect(page.getByText(/Hoot does not predict a restock/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Buying rhythm" })).toHaveCount(0);
});

test("focuses the checked item-type path when Add opens", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "One-time", exact: true }).click();
  await page.getByRole("button", { name: "Add one-time item", exact: true }).first().click();

  const oneTimePath = page.getByRole("radio", { name: /One-time need/ });
  await expect(oneTimePath).toBeChecked();
  await expect(oneTimePath).toBeFocused();

  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Add one-time item", exact: true }).first()
  ).toBeFocused();

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole("button", { name: "Dashboard", exact: true }).click();
  await page.getByRole("button", { name: "Add item", exact: true }).click();

  const trackedPath = page.getByRole("radio", { name: /Tracked staple/ });
  await expect(trackedPath).toBeChecked();
  await expect(trackedPath).toBeFocused();
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

test("writes an item URL and keeps browser Back inside Hoot", async ({ page }) => {
  await page.goto("/");

  const queueTitle = page.locator(".item-row .item-title-button").first();
  await queueTitle.click();

  await expect(page).toHaveURL(/#\/item\/item-/);
  await expect(page.locator("#item-analysis-title")).toBeVisible();

  await page.goBack();

  await expect(page).toHaveURL(/#\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Upcoming restocks" })).toBeVisible();

  await page.goForward();
  await expect(page).toHaveURL(/#\/item\/item-/);
  await expect(page.locator("#item-analysis-title")).toBeVisible();

  await page.getByRole("button", { name: "Back to dashboard" }).click();
  await expect(page).toHaveURL(/#\/dashboard$/);
  await expect(
    page.getByRole("button", { name: "Dashboard", exact: true })
  ).toBeFocused();
});

test("shows a rhythm ledger with unit prices, confidence, and spending", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Milk", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Buying rhythm" })).toBeVisible();
  await expect(page.locator(".rhythm-entry:not(.is-estimate)")).toHaveCount(3);
  await expect(page.locator(".rhythm-entry.is-estimate")).toHaveCount(1);
  await expect(page.locator(".rhythm-entry").nth(2)).toContainText("$4.49 / half-gallon");
  await expect(page.locator(".rhythm-gap-row").first()).toContainText("longer than typical");
  await expect(page.locator(".restock-answer-range")).toContainText(/Likely between/);

  const rail = page.locator(".item-rail");
  await expect(rail.locator(".rail-card", { hasText: "Pattern" })).toContainText("Typical gap");
  await expect(rail.locator(".rail-card", { hasText: "Confidence" })).toContainText("Based on");
  await expect(rail.locator(".rail-card", { hasText: "Spending" })).toContainText("Known spend");
  await expect(rail.locator(".rail-card", { hasText: "Your checks" })).toBeVisible();
});

test("shows a known price change and learning confidence", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Dish soap", exact: true }).click();

  const spending = page.locator(".rail-card", { hasText: "Spending" });
  await expect(spending).toContainText("Known spend");
  await expect(spending).toContainText("Up $0.30");
  await expect(page.locator(".rail-card", { hasText: "Confidence" })).toContainText("Learning");
});

test("draws a compact unit-price history when two prices exist", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Milk", exact: true }).click();

  const spark = page.locator(".rail-card", { hasText: "Spending" }).locator(".price-spark");
  const points = spark.locator("[data-price-spark-point]");
  await expect(spark).toBeVisible();
  await expect(spark.locator("svg")).toHaveAttribute("aria-hidden", "true");
  await expect(
    spark.getByRole("group", { name: "Unit price history for Milk" })
  ).toBeVisible();
  await expect(points).toHaveCount(3);
  await expect(points.first()).toHaveAccessibleName(/\$4\.29 per half-gallon/);
  await expect(points.last()).toHaveAccessibleName(/\$4\.49 per half-gallon/);
  await expect(spark.locator("[data-price-spark-readout]"))
    .toContainText("Select a point for its date and price.");
  await expect(spark.locator(".price-spark-foot")).toContainText(/\w{3} \d{1,2}/);
});

test("inspects a unit-price point by tap and keyboard", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Milk", exact: true }).click();

  const spark = page.locator(".rail-card", { hasText: "Spending" }).locator(".price-spark");
  const points = spark.locator("[data-price-spark-point]");
  const readout = spark.locator("[data-price-spark-readout]");

  await points.first().focus();
  await expect(points.first()).toBeFocused();
  await expect(points.first()).toHaveClass(/is-active/);
  await expect(readout).toContainText("$4.29 / half-gallon");

  await page.keyboard.press("Tab");
  await expect(points.nth(1)).toBeFocused();
  const secondDate = await points.nth(1).getAttribute("data-date");
  expect(secondDate).not.toBeNull();
  await expect(readout).toContainText(secondDate);
  await expect(readout).toContainText("$4.49 / half-gallon");

  const lastPoint = points.nth(2);
  await lastPoint.scrollIntoViewIfNeeded();
  const lastBox = await lastPoint.boundingBox();
  expect(lastBox).not.toBeNull();
  await page.mouse.click(lastBox.x + lastBox.width / 2, lastBox.y + lastBox.height / 2);

  const lastDate = await lastPoint.getAttribute("data-date");
  expect(lastDate).not.toBeNull();
  await expect(lastPoint).toBeFocused();
  await expect(lastPoint).toHaveClass(/is-active/);
  await expect(readout).toContainText(lastDate);
  await expect(readout).toContainText("$4.49 / half-gallon");
});

test("omits the unit-price sparkline when only one price is known", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Trash bags", exact: true }).click();

  const spending = page.locator(".rail-card", { hasText: "Spending" });
  await expect(spending).toBeVisible();
  await expect(spending.locator(".price-spark")).toHaveCount(0);
});

test("keeps the price sparkline compact at tablet width", async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 900 });
  await page.goto("/");
  await page.getByRole("button", { name: "Milk", exact: true }).click();

  const columns = await page
    .locator(".item-rail")
    .evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").length);
  expect(columns).toBe(2);

  const box = await page.locator(".price-spark-svg").boundingBox();
  expect(box).not.toBeNull();
  expect(box.height).toBeLessThan(80);
});

test("separates the observed gap from the interval used while learning", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Dish soap", exact: true }).click();

  const pattern = page.locator(".rail-card", { hasText: "Pattern" });
  await expect(pattern).toContainText("Gap so far");
  await expect(pattern).toContainText("Estimate uses");
  await expect(pattern).not.toContainText("Typical gap");
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

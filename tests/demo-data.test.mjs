import assert from "node:assert/strict";
import test from "node:test";

import {
  DEMO_SAMPLES,
  createBusyDemoState,
  createDemoStateFor,
  createStarterDemoState,
} from "../frontend/demo-data.js";
import { parseDate, predictionFor } from "../frontend/prediction.js";

const REFERENCE_DATE = new Date("2026-10-31T00:00:00");

const trackedOf = (state) => state.items.filter((item) => !item.isOneTime);
const oneTimeOf = (state) => state.items.filter((item) => item.isOneTime);

test("starter keeps the original eight items and their exact history", () => {
  const state = createStarterDemoState(REFERENCE_DATE);

  assert.equal(state.sample, "starter");
  assert.equal(state.items.length, 8);

  const milk = state.items.find((item) => item.id === "item-milk");
  assert.deepEqual(
    milk.purchases.map((purchase) => [purchase.date, purchase.quantity, purchase.price]),
    [
      ["2026-10-06", 1, 4.29],
      ["2026-10-17", 1, 4.49],
      ["2026-10-26", 2, 8.98],
    ],
  );
  assert.equal(state.items.find((item) => item.id === "item-trash-bags").purchases.length, 1);
  assert.equal(state.items.find((item) => item.id === "item-packing-tape").completed, true);
});

test("busy household delivers the promised scale and shape", () => {
  const state = createBusyDemoState(REFERENCE_DATE);
  const tracked = trackedOf(state);
  const oneTime = oneTimeOf(state);

  assert.equal(state.sample, "busy");
  assert.equal(tracked.length, 38);
  assert.equal(oneTime.length, 6);
  assert.equal(
    tracked.reduce((sum, item) => sum + item.purchases.length, 0),
    195,
  );

  const categories = new Map();
  for (const item of tracked) {
    categories.set(item.category, (categories.get(item.category) ?? 0) + 1);
  }
  assert.deepEqual(Object.fromEntries([...categories].sort()), {
    Bakery: 3,
    Beverages: 3,
    Cleaning: 4,
    "Dairy & eggs": 4,
    Frozen: 3,
    Household: 4,
    Pantry: 8,
    "Personal care": 3,
    Pet: 1,
    Produce: 5,
  });

  assert.equal(oneTime.filter((item) => !item.completed).length, 4);
  assert.equal(oneTime.filter((item) => item.completed).length, 2);
});

test("busy histories are well formed", () => {
  const state = createBusyDemoState(REFERENCE_DATE);
  const ids = new Set();
  const names = new Set();

  for (const item of state.items) {
    assert.equal(ids.has(item.id), false, `duplicate item id ${item.id}`);
    assert.equal(names.has(item.name), false, `duplicate item name ${item.name}`);
    ids.add(item.id);
    names.add(item.name);

    const createdAt = parseDate(item.createdAt);
    assert.ok(createdAt <= REFERENCE_DATE, `${item.name} created in the future`);

    let previousDate = null;
    for (const purchase of item.purchases) {
      assert.equal(typeof purchase.id, "string");
      assert.equal(ids.has(purchase.id), false, `duplicate purchase id ${purchase.id}`);
      ids.add(purchase.id);

      const purchaseDate = parseDate(purchase.date);
      assert.ok(purchaseDate <= REFERENCE_DATE, `${item.name} purchased in the future`);
      assert.ok(
        !previousDate || purchaseDate > previousDate,
        `${item.name} purchases are not sorted oldest first`,
      );
      previousDate = purchaseDate;

      assert.ok(Number.isInteger(purchase.quantity) && purchase.quantity > 0);
      assert.ok(
        purchase.price === null || (Number.isFinite(purchase.price) && purchase.price > 0),
        `${item.name} has an invalid price`,
      );
    }

    const firstPurchase = item.purchases[0];
    if (firstPurchase) {
      assert.ok(
        createdAt < parseDate(firstPurchase.date),
        `${item.name} was created after its first purchase`,
      );
    }
  }
});

test("busy household spreads across every urgency zone and maturity", () => {
  const state = createBusyDemoState(REFERENCE_DATE);
  const tracked = trackedOf(state);
  const zones = {};
  const depth = {};

  for (const item of tracked) {
    const prediction = predictionFor(item, REFERENCE_DATE);
    zones[prediction.zone] = (zones[prediction.zone] ?? 0) + 1;
    depth[item.purchases.length] = (depth[item.purchases.length] ?? 0) + 1;
    assert.equal(
      prediction.maturity,
      item.purchases.length < 3 ? "learning" : "learned",
      `${item.name} maturity`,
    );
  }

  assert.deepEqual(zones, {
    overdue: 6,
    "buy-now": 8,
    watch: 10,
    steady: 14,
  });
  assert.equal(depth["0"], 2);
  assert.equal(depth["1"], 1);
  assert.equal(depth["2"], 2);
  assert.ok(
    Object.entries(depth)
      .filter(([purchaseCount]) => Number(purchaseCount) >= 6)
      .reduce((sum, [, count]) => sum + count, 0) >= 10,
    "expected at least ten items with six or more purchases",
  );
});

test("sample metadata points at the right states", () => {
  assert.deepEqual(
    DEMO_SAMPLES.map(({ id, itemCount }) => ({ id, itemCount })),
    [
      { id: "starter", itemCount: 8 },
      { id: "busy", itemCount: 44 },
    ],
  );
  assert.equal(createDemoStateFor("busy", REFERENCE_DATE).items.length, 44);
  assert.equal(createDemoStateFor("starter", REFERENCE_DATE).items.length, 8);
  assert.equal(createDemoStateFor("unknown", REFERENCE_DATE).sample, "starter");
});

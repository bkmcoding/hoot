import test from "node:test";
import assert from "node:assert/strict";

import {
  buildShoppingRun,
  groupShoppingRun,
  isShoppingRunEligible,
  shoppingRunSummary,
} from "../frontend/store-run.js";

const referenceDate = new Date("2026-10-27T00:00:00");

function trackedItem(id, category, dates) {
  return {
    id,
    name: id,
    category,
    isOneTime: false,
    completed: false,
    createdAt: dates[0],
    purchases: dates.map((date, index) => ({
      id: `${id}-purchase-${index + 1}`,
      date,
      quantity: 1,
      price: 4,
    })),
  };
}

test("builds a run from overdue and buy-now staples by default", () => {
  const items = [
    trackedItem("overdue", "Pantry", ["2026-10-03", "2026-10-10", "2026-10-17"]),
    trackedItem("buy-now", "Dairy", ["2026-10-06", "2026-10-13", "2026-10-20"]),
    trackedItem("watch", "Pantry", ["2026-10-10", "2026-10-17", "2026-10-24"]),
    trackedItem("steady", "Personal care", ["2026-09-20", "2026-10-20"]),
    {
      id: "one-time",
      name: "Birthday candles",
      category: "Household",
      isOneTime: true,
      completed: false,
      createdAt: "2026-10-25",
      purchases: [],
    },
  ];

  const run = buildShoppingRun(items, { referenceDate });

  assert.deepEqual(
    run.map((entry) => entry.item.id),
    ["overdue", "buy-now", "one-time"],
  );
  assert.equal(run[0].type, "tracked");
  assert.equal(run[2].type, "one-time");
});

test("includes watch items only when requested", () => {
  const item = trackedItem("watch", "Pantry", [
    "2026-10-10",
    "2026-10-17",
    "2026-10-24",
  ]);

  assert.equal(isShoppingRunEligible(item, false, referenceDate), false);
  assert.equal(isShoppingRunEligible(item, true, referenceDate), true);
});

test("excludes completed one-time items", () => {
  const item = {
    id: "completed",
    name: "Packing tape",
    category: "Household",
    isOneTime: true,
    completed: true,
    createdAt: "2026-10-20",
    purchases: [],
  };

  assert.equal(isShoppingRunEligible(item, true, referenceDate), false);
});

test("groups entries by category and sorts each group by urgency", () => {
  const entries = [
    {
      item: { id: "one-time", name: "Candles", category: "Household", isOneTime: true },
      type: "one-time",
      priority: 3,
    },
    {
      item: { id: "overdue", name: "Milk", category: "Pantry", isOneTime: false },
      type: "tracked",
      priority: 0,
    },
    {
      item: { id: "buy-now", name: "Eggs", category: "Pantry", isOneTime: false },
      type: "tracked",
      priority: 1,
    },
  ];

  const groups = groupShoppingRun(entries);

  assert.deepEqual(
    groups.map((group) => group.category),
    ["Household", "Pantry"],
  );
  assert.deepEqual(
    groups[1].entries.map((entry) => entry.item.id),
    ["overdue", "buy-now"],
  );
});

test("summarizes total, in-cart, and remaining counts", () => {
  const entries = [
    { item: { id: "one" } },
    { item: { id: "two" } },
    { item: { id: "three" } },
  ];
  const selectedIds = new Set(["one", "three"]);

  assert.deepEqual(shoppingRunSummary(entries, selectedIds), {
    total: 3,
    inCart: 2,
    remaining: 1,
  });
});

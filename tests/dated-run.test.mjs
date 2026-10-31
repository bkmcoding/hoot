import test from "node:test";
import assert from "node:assert/strict";

import { buildShoppingRun } from "../frontend/store-run.js";

const referenceDate = new Date("2026-10-27T00:00:00");
const futureDate = new Date("2026-11-17T00:00:00");

function trackedItem(id, dates) {
  return {
    id,
    name: id,
    category: "Pantry",
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

const oneTime = {
  id: "candles",
  name: "Birthday candles",
  category: "Household",
  isOneTime: true,
  completed: false,
  createdAt: "2026-10-25",
  purchases: [],
};

test("a run built for today carries one-time needs", () => {
  const items = [trackedItem("milk", ["2026-10-06", "2026-10-13", "2026-10-20"]), oneTime];

  const run = buildShoppingRun(items, { referenceDate, includeWatch: true });

  assert.ok(run.some((entry) => entry.item.id === "candles"));
});

test("a future-dated run can leave one-time needs behind", () => {
  const items = [trackedItem("milk", ["2026-10-06", "2026-10-13", "2026-10-20"]), oneTime];

  const run = buildShoppingRun(items, {
    referenceDate: futureDate,
    includeWatch: true,
    includeOneTime: false,
  });

  assert.ok(run.every((entry) => entry.item.id !== "candles"));
  assert.ok(run.some((entry) => entry.item.id === "milk"));
});

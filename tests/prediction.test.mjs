import test from "node:test";
import assert from "node:assert/strict";

import {
  DAY_MS,
  EARLY_RESTOCK_SHIFT_DAYS,
  addDays,
  likelyWindowFor,
  parseDate,
  predictionFor,
  startOfDay,
  toISODate,
} from "../frontend/prediction.js";

test("date helpers normalize to local midnight and format ISO dates", () => {
  const source = new Date(2026, 9, 26, 13, 42, 19);
  const day = startOfDay(source);

  assert.equal(day.getHours(), 0);
  assert.equal(day.getMinutes(), 0);
  assert.equal(day.getSeconds(), 0);
  assert.equal(toISODate(day), "2026-10-26");
  assert.equal(toISODate(addDays(day, 7)), "2026-11-02");
  assert.equal(toISODate(parseDate("2026-10-26")), "2026-10-26");
  assert.equal(DAY_MS, 24 * 60 * 60 * 1000);
});

test("predictionFor returns null for one-time items", () => {
  const item = {
    isOneTime: true,
    createdAt: "2026-10-01",
    purchases: [],
    reorderThresholdDays: 7,
  };

  assert.equal(predictionFor(item, parseDate("2026-10-26")), null);
});

test("predictionFor uses the manual estimate while learning", () => {
  const today = parseDate("2026-10-26");
  const item = {
    isOneTime: false,
    createdAt: "2026-10-01",
    reorderThresholdDays: 7,
    purchases: [
      { date: "2026-10-01" },
      { date: "2026-10-15" },
    ],
  };

  const prediction = predictionFor(item, today);

  assert.equal(prediction.maturity, "learning");
  assert.equal(prediction.method, "Manual 7-day estimate");
  assert.equal(toISODate(prediction.date), "2026-10-22");
  assert.equal(prediction.daysUntil, -4);
  assert.equal(prediction.zone, "overdue");
  assert.equal(prediction.statusLabel, "Overdue");
});

test("predictionFor learns a stable recurring rhythm", () => {
  const today = parseDate("2026-10-19");
  const item = {
    isOneTime: false,
    createdAt: "2026-09-28",
    reorderThresholdDays: 7,
    purchases: [
      { date: "2026-09-28" },
      { date: "2026-10-05" },
      { date: "2026-10-12" },
    ],
  };

  const prediction = predictionFor(item, today);

  assert.equal(prediction.maturity, "learned");
  assert.equal(prediction.projectionMode, "regression");
  assert.equal(prediction.confidence, "Strong rhythm");
  assert.equal(toISODate(prediction.date), "2026-10-19");
  assert.equal(prediction.daysUntil, 0);
  assert.equal(prediction.zone, "buy-now");
  assert.equal(prediction.statusLabel, "Buy now");
});

test("predictionFor moves the next estimate later after a still-had-some check", () => {
  const today = parseDate("2026-10-19");
  const purchases = [
    { id: "one", date: "2026-09-28" },
    { id: "two", date: "2026-10-05" },
    { id: "three", date: "2026-10-12" },
  ];
  const item = {
    isOneTime: false,
    createdAt: "2026-09-28",
    reorderThresholdDays: 7,
    purchases,
  };
  const base = predictionFor(item, today);
  const corrected = predictionFor(
    {
      ...item,
      purchases: [
        ...purchases.slice(0, 2),
        {
          ...purchases[2],
          feedback: { verdict: "early", predictedDate: "2026-10-19" },
        },
      ],
    },
    today,
  );

  assert.equal(base.feedbackShiftDays, 0);
  assert.equal(corrected.feedbackShiftDays, EARLY_RESTOCK_SHIFT_DAYS);
  assert.equal(
    toISODate(corrected.date),
    toISODate(addDays(base.date, EARLY_RESTOCK_SHIFT_DAYS)),
  );
  assert.equal(corrected.daysUntil, base.daysUntil + EARLY_RESTOCK_SHIFT_DAYS);
});

test("predictionFor uses a recorded Next up correction to clear an overdue date", () => {
  const today = parseDate("2026-10-19");
  const item = {
    isOneTime: false,
    createdAt: "2026-09-09",
    reorderThresholdDays: 35,
    purchases: [{ id: "one", date: "2026-09-09" }],
  };
  const overdue = predictionFor(item, today);
  const corrected = predictionFor(
    {
      ...item,
      purchases: [
        {
          ...item.purchases[0],
          feedback: {
            verdict: "early",
            predictedDate: "2026-10-14",
            source: "next-up",
            shiftDays: 8,
          },
        },
      ],
    },
    today,
  );

  assert.equal(overdue.zone, "overdue");
  assert.equal(corrected.feedbackShiftDays, 8);
  assert.equal(toISODate(corrected.date), "2026-10-22");
  assert.equal(corrected.zone, "buy-now");
});

test("predictionFor ignores right checks and checks on older purchases", () => {
  const today = parseDate("2026-10-19");
  const purchases = [
    { id: "one", date: "2026-09-28" },
    { id: "two", date: "2026-10-05" },
    { id: "three", date: "2026-10-12" },
  ];
  const item = {
    isOneTime: false,
    createdAt: "2026-09-28",
    reorderThresholdDays: 7,
    purchases,
  };
  const base = predictionFor(item, today);
  const right = predictionFor(
    {
      ...item,
      purchases: [
        ...purchases.slice(0, 2),
        { ...purchases[2], feedback: { verdict: "right" } },
      ],
    },
    today,
  );
  const older = predictionFor(
    {
      ...item,
      purchases: [
        purchases[0],
        { ...purchases[1], feedback: { verdict: "early" } },
        purchases[2],
      ],
    },
    today,
  );

  assert.equal(toISODate(right.date), toISODate(base.date));
  assert.equal(right.feedbackShiftDays, 0);
  assert.equal(toISODate(older.date), toISODate(base.date));
  assert.equal(older.feedbackShiftDays, 0);
});

test("likelyWindowFor spans the shortest and longest gaps", () => {
  const prediction = {
    intervals: [35, 5, 15],
    latest: parseDate("2026-10-25"),
    date: parseDate("2026-11-14"),
  };

  const window = likelyWindowFor(prediction);

  assert.ok(window);
  assert.equal(toISODate(window.start), "2026-10-30");
  assert.equal(toISODate(window.end), "2026-11-29");
  assert.equal(window.shortestGap, 5);
  assert.equal(window.longestGap, 35);
  assert.equal(window.wide, true);
});

test("likelyWindowFor needs at least two gaps", () => {
  assert.equal(likelyWindowFor(null), null);
  assert.equal(
    likelyWindowFor({
      intervals: [30],
      latest: parseDate("2026-10-16"),
      date: parseDate("2026-11-15"),
    }),
    null,
  );
});

test("likelyWindowFor keeps the model date inside the window", () => {
  const window = likelyWindowFor({
    intervals: [9, 11],
    latest: parseDate("2026-10-25"),
    date: parseDate("2026-11-01"),
  });

  assert.ok(window);
  assert.equal(toISODate(window.start), "2026-11-01");
  assert.equal(toISODate(window.end), "2026-11-05");
  assert.equal(window.wide, false);
});

test("predictionFor classifies watch and steady zones", () => {
  const today = parseDate("2026-10-17");
  const item = {
    isOneTime: false,
    createdAt: "2026-09-26",
    reorderThresholdDays: 7,
    purchases: [
      { date: "2026-09-26" },
      { date: "2026-10-03" },
      { date: "2026-10-10" },
    ],
  };

  const watch = predictionFor(item, addDays(today, -4));
  const steady = predictionFor(item, addDays(today, -8));

  assert.equal(watch.zone, "watch");
  assert.equal(watch.statusLabel, "Watch");
  assert.equal(steady.zone, "steady");
  assert.equal(steady.statusLabel, "Steady");
});

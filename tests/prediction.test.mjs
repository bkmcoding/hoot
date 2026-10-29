import test from "node:test";
import assert from "node:assert/strict";

import {
  DAY_MS,
  addDays,
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

  assert.equal(prediction.technicalMethod, "Manual estimate");
  assert.equal(prediction.maturity, "learning");
  assert.equal(prediction.modelVersion, "demo-manual-v1");
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

  assert.equal(prediction.technicalMethod, "Linear regression");
  assert.equal(prediction.maturity, "learned");
  assert.equal(prediction.modelVersion, "demo-ols-v1");
  assert.equal(prediction.projectionMode, "regression");
  assert.equal(prediction.confidence, "Strong rhythm");
  assert.equal(toISODate(prediction.date), "2026-10-19");
  assert.equal(prediction.daysUntil, 0);
  assert.equal(prediction.zone, "buy-now");
  assert.equal(prediction.statusLabel, "Buy now");
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

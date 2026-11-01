import { predictionFor } from "./prediction.js";

const PRIORITY_BY_ZONE = {
  overdue: 0,
  "buy-now": 1,
  watch: 2,
};

function shoppingRunEntry(item, referenceDate) {
  if (item.isOneTime) {
    return item.completed
      ? null
      : { item, type: "one-time", priority: 3 };
  }

  const prediction = predictionFor(item, referenceDate);
  const priority = prediction && PRIORITY_BY_ZONE[prediction.zone];
  return priority === undefined ? null : { item, type: "tracked", priority };
}

function compareEntries(left, right) {
  return (
    left.priority - right.priority ||
    left.item.name.localeCompare(right.item.name)
  );
}

export function isShoppingRunEligible(
  item,
  includeWatch = false,
  referenceDate = new Date(),
) {
  const entry = shoppingRunEntry(item, referenceDate);
  return Boolean(entry && (entry.priority !== 2 || includeWatch));
}

export function buildShoppingRun(
  items,
  { includeWatch = false, referenceDate = new Date(), includeOneTime = true } = {},
) {
  return [...items]
    .map((item) => {
      if (item.isOneTime && !includeOneTime) return null;
      return shoppingRunEntry(item, referenceDate);
    })
    .filter((entry) => entry && (entry.priority !== 2 || includeWatch))
    .sort(compareEntries);
}

export function groupShoppingRun(entries, customOrder = []) {
  const groupsByCategory = new Map();

  for (const entry of entries) {
    const category = entry.item.category || "Uncategorized";
    if (!groupsByCategory.has(category)) {
      groupsByCategory.set(category, []);
    }
    groupsByCategory.get(category).push(entry);
  }

  return [...groupsByCategory]
    .sort(([leftCategory], [rightCategory]) => {
      if (customOrder && customOrder.length) {
        const leftIndex = customOrder.indexOf(leftCategory);
        const rightIndex = customOrder.indexOf(rightCategory);
        if (leftIndex !== -1 && rightIndex !== -1) return leftIndex - rightIndex;
        if (leftIndex !== -1) return -1;
        if (rightIndex !== -1) return 1;
      }
      return leftCategory.localeCompare(rightCategory);
    })
    .map(([category, categoryEntries]) => ({
      category,
      entries: [...categoryEntries].sort(compareEntries),
    }));
}

const DUE_BUCKETS = [
  { key: "overdue", label: "Overdue" },
  { key: "today", label: "Today" },
  { key: "tomorrow", label: "Tomorrow" },
  { key: "week", label: "Next 7 days" },
  { key: "later", label: "Later" },
  { key: "one-time", label: "One-time" },
];

function dueBucketFor(entry, referenceDate) {
  if (entry.type === "one-time" || entry.item.isOneTime) return "one-time";

  const prediction = predictionFor(entry.item, referenceDate);
  if (!prediction) return "later";

  const days = prediction.daysUntil;
  if (days < 0) return "overdue";
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days <= 7) return "week";
  return "later";
}

function daysUntilFor(entry, referenceDate) {
  return entry.item.isOneTime
    ? Number.POSITIVE_INFINITY
    : (predictionFor(entry.item, referenceDate)?.daysUntil ?? Number.POSITIVE_INFINITY);
}

export function groupShoppingRunByDue(entries, referenceDate = new Date()) {
  const buckets = new Map(
    DUE_BUCKETS.map(({ key, label }) => [key, { category: label, entries: [] }]),
  );

  for (const entry of entries) {
    buckets.get(dueBucketFor(entry, referenceDate))?.entries.push(entry);
  }

  for (const bucket of buckets.values()) {
    bucket.entries.sort((left, right) => {
      const dayOrder =
        daysUntilFor(left, referenceDate) - daysUntilFor(right, referenceDate);
      return dayOrder || left.item.name.localeCompare(right.item.name);
    });
  }

  return [...buckets.values()].filter((bucket) => bucket.entries.length);
}

export function shoppingRunSummary(entries, selectedIds) {
  const selected = new Set(selectedIds);
  let total = 0;
  let inCart = 0;

  for (const entry of entries) {
    total += 1;
    if (selected.has(entry.item.id)) {
      inCart += 1;
    }
  }

  return { total, inCart, remaining: total - inCart };
}

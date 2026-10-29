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
  { includeWatch = false, referenceDate = new Date() } = {},
) {
  return [...items]
    .map((item) => shoppingRunEntry(item, referenceDate))
    .filter((entry) => entry && (entry.priority !== 2 || includeWatch))
    .sort(compareEntries);
}

export function groupShoppingRun(entries) {
  const groupsByCategory = new Map();

  for (const entry of entries) {
    const category = entry.item.category || "Uncategorized";
    if (!groupsByCategory.has(category)) {
      groupsByCategory.set(category, []);
    }
    groupsByCategory.get(category).push(entry);
  }

  return [...groupsByCategory]
    .sort(([leftCategory], [rightCategory]) =>
      leftCategory.localeCompare(rightCategory),
    )
    .map(([category, categoryEntries]) => ({
      category,
      entries: [...categoryEntries].sort(compareEntries),
    }));
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

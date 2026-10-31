import { addDays, startOfDay, toISODate } from "./prediction.js";

export const DEMO_SAMPLES = Object.freeze([
  {
    id: "starter",
    label: "Starter household",
    description: "Six staples and two one-time needs.",
    itemCount: 8,
  },
  {
    id: "busy",
    label: "Busy household",
    description: "38 staples and six one-time needs.",
    itemCount: 44,
  },
]);

const isoDaysAgo = (referenceDate, days) => toISODate(addDays(referenceDate, -days));

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const roundMoney = (value) => Math.round(value * 100) / 100;

// A fixed, small sequence keeps price histories deterministic without making
// every purchase look like it was bought on the same day at the same price.
const PRICE_WOBBLE = [0.004, -0.006, 0.009, -0.003, 0.006, -0.008, 0.002, 0.007, -0.005, 0.001];

export function createStarterDemoState(referenceDate = startOfDay()) {
  const today = startOfDay(referenceDate);
  const daysAgo = (days) => isoDaysAgo(today, days);

  return {
    sample: "starter",
    items: [
      {
        id: "item-milk",
        name: "Milk",
        category: "Pantry",
        unit: "half-gallon",
        reorderThresholdDays: 10,
        isOneTime: false,
        completed: false,
        createdAt: daysAgo(25),
        purchases: [
          { id: "purchase-milk-1", date: daysAgo(25), quantity: 1, price: 4.29 },
          { id: "purchase-milk-2", date: daysAgo(14), quantity: 1, price: 4.49 },
          { id: "purchase-milk-3", date: daysAgo(5), quantity: 2, price: 8.98 },
        ],
      },
      {
        id: "item-eggs",
        name: "Eggs",
        category: "Pantry",
        unit: "dozen",
        reorderThresholdDays: 14,
        isOneTime: false,
        completed: false,
        createdAt: daysAgo(32),
        purchases: [
          { id: "purchase-eggs-1", date: daysAgo(32), quantity: 1, price: 3.99 },
          { id: "purchase-eggs-2", date: daysAgo(18), quantity: 1, price: 4.19 },
          { id: "purchase-eggs-3", date: daysAgo(6), quantity: 1, price: 4.69 },
        ],
      },
      {
        id: "item-paper-towels",
        name: "Paper towels",
        category: "Household",
        unit: "6-roll pack",
        reorderThresholdDays: 21,
        isOneTime: false,
        completed: false,
        createdAt: daysAgo(45),
        purchases: [
          { id: "purchase-towels-1", date: daysAgo(45), quantity: 1, price: 9.99 },
          { id: "purchase-towels-2", date: daysAgo(25), quantity: 1, price: 10.49 },
          { id: "purchase-towels-3", date: daysAgo(9), quantity: 1, price: 10.99 },
        ],
      },
      {
        id: "item-dish-soap",
        name: "Dish soap",
        category: "Cleaning",
        unit: "bottle",
        reorderThresholdDays: 30,
        isOneTime: false,
        completed: false,
        createdAt: daysAgo(30),
        purchases: [
          { id: "purchase-dish-1", date: daysAgo(30), quantity: 1, price: 3.79 },
          { id: "purchase-dish-2", date: daysAgo(14), quantity: 1, price: 4.09 },
        ],
      },
      {
        id: "item-toothpaste",
        name: "Toothpaste",
        category: "Personal care",
        unit: "tube",
        reorderThresholdDays: 60,
        isOneTime: false,
        completed: false,
        createdAt: daysAgo(75),
        purchases: [
          { id: "purchase-toothpaste-1", date: daysAgo(75), quantity: 1, price: 4.99 },
          { id: "purchase-toothpaste-2", date: daysAgo(35), quantity: 1, price: 5.49 },
        ],
      },
      {
        id: "item-trash-bags",
        name: "Trash bags",
        category: "Household",
        unit: "40-count box",
        reorderThresholdDays: 35,
        isOneTime: false,
        completed: false,
        createdAt: daysAgo(40),
        purchases: [
          { id: "purchase-trash-1", date: daysAgo(40), quantity: 1, price: 12.49 },
        ],
      },
      {
        id: "item-birthday-candles",
        name: "Birthday candles",
        category: "Household",
        unit: "pack",
        reorderThresholdDays: 0,
        isOneTime: true,
        completed: false,
        createdAt: daysAgo(2),
        purchases: [],
      },
      {
        id: "item-packing-tape",
        name: "Packing tape",
        category: "Household",
        unit: "roll",
        reorderThresholdDays: 0,
        isOneTime: true,
        completed: true,
        createdAt: daysAgo(9),
        purchases: [],
      },
    ],
  };
}

const BUSY_TRACKED = [
  // Pantry
  {
    name: "Olive oil",
    category: "Pantry",
    unit: "bottle",
    threshold: 45,
    last: 50,
    gaps: [42, 44, 43, 45, 42, 44],
    price: 14.99,
  },
  {
    name: "Jasmine rice",
    category: "Pantry",
    unit: "5-lb bag",
    threshold: 75,
    last: 60,
    gaps: [78, 74, 76, 80, 72],
    price: 11.49,
  },
  {
    name: "Pasta",
    category: "Pantry",
    unit: "1-lb box",
    threshold: 30,
    last: 20,
    gaps: [28, 30, 29, 31, 27, 30],
    price: 1.99,
    drift: 0.04,
  },
  {
    name: "Canned tomatoes",
    category: "Pantry",
    unit: "28-oz can",
    threshold: 45,
    last: 40,
    gaps: [44, 46, 43, 45],
    price: 1.79,
    quantities: [1, 2, 1, 2, 1],
  },
  {
    name: "Peanut butter",
    category: "Pantry",
    unit: "16-oz jar",
    threshold: 45,
    last: 30,
    gaps: [42, 44, 45, 43],
    price: 4.49,
  },
  {
    name: "Coffee beans",
    category: "Pantry",
    unit: "12-oz bag",
    threshold: 18,
    last: 20,
    gaps: [15, 16, 14, 15, 16, 14, 15, 16, 15],
    price: 13.99,
    drift: 0.12,
  },
  {
    name: "Rolled oats",
    category: "Pantry",
    unit: "42-oz canister",
    threshold: 35,
    last: 25,
    gaps: [34, 33, 36, 35],
    price: 5.99,
  },
  {
    name: "Flour",
    category: "Pantry",
    unit: "5-lb bag",
    threshold: 120,
    last: 100,
    gaps: [118],
    price: 4.99,
  },

  // Dairy & eggs
  {
    name: "Milk",
    category: "Dairy & eggs",
    unit: "half-gallon",
    threshold: 7,
    last: 6,
    gaps: [6, 7, 6, 7, 7, 6, 7, 6, 7],
    price: 8.98,
    quantities: [1, 1, 1, 2, 1, 1, 2, 1, 1, 2],
    drift: 0.08,
  },
  {
    name: "Eggs",
    category: "Dairy & eggs",
    unit: "dozen",
    threshold: 12,
    last: 10,
    gaps: [12, 13, 11, 12, 12, 13, 12],
    price: 4.49,
    drift: 0.1,
  },
  {
    name: "Greek yogurt",
    category: "Dairy & eggs",
    unit: "32-oz tub",
    threshold: 10,
    last: 8,
    gaps: [9, 10, 10, 9, 11, 10],
    price: 5.49,
  },
  {
    name: "Butter",
    category: "Dairy & eggs",
    unit: "1-lb block",
    threshold: 21,
    last: 16,
    gaps: [20, 22, 21, 20, 19],
    price: 4.99,
  },

  // Produce
  {
    name: "Bananas",
    category: "Produce",
    unit: "bunch",
    threshold: 5,
    last: 5,
    gaps: [4, 5, 4, 6, 4, 5, 4],
    price: 1.89,
    drift: 0.03,
  },
  {
    name: "Apples",
    category: "Produce",
    unit: "3-lb bag",
    threshold: 12,
    last: 6,
    gaps: [11, 12, 10, 11],
    price: 4.99,
  },
  {
    name: "Baby spinach",
    category: "Produce",
    unit: "5-oz box",
    threshold: 6,
    purchases: 0,
    createdDaysAgo: 4,
  },
  {
    name: "Yellow onions",
    category: "Produce",
    unit: "3-lb bag",
    threshold: 14,
    last: 7,
    gaps: [13, 14, 15, 13, 14],
    price: 3.99,
  },
  {
    name: "Avocados",
    category: "Produce",
    unit: "each",
    threshold: 7,
    purchases: 0,
    createdDaysAgo: 3,
  },

  // Bakery
  {
    name: "Sandwich bread",
    category: "Bakery",
    unit: "loaf",
    threshold: 6,
    last: 4,
    gaps: [5, 6, 5, 5, 6, 5],
    price: 3.49,
  },
  {
    name: "Bagels",
    category: "Bakery",
    unit: "6-pack",
    threshold: 14,
    last: 8,
    gaps: [12, 13, 14, 13],
    price: 4.49,
  },
  {
    name: "Flour tortillas",
    category: "Bakery",
    unit: "10-count",
    threshold: 18,
    last: 9,
    gaps: [16, 17, 18, 17],
    price: 3.29,
  },

  // Frozen
  {
    name: "Frozen peas",
    category: "Frozen",
    unit: "16-oz bag",
    threshold: 40,
    last: 30,
    gaps: [36, 38, 37, 35],
    price: 2.29,
  },
  {
    name: "Frozen berries",
    category: "Frozen",
    unit: "16-oz bag",
    threshold: 45,
    last: 45,
    gaps: [38, 40, 39],
    price: 4.99,
    unknownAt: [0],
  },
  {
    name: "Frozen pizza",
    category: "Frozen",
    unit: "each",
    threshold: 21,
    last: 12,
    gaps: [20, 21, 19],
    price: 7.99,
  },

  // Beverages
  {
    name: "Sparkling water",
    category: "Beverages",
    unit: "12-pack",
    threshold: 14,
    last: 12,
    gaps: [13, 14, 13, 14, 13],
    price: 11.98,
    quantities: [1, 1, 2, 1, 1, 2],
  },
  {
    name: "Orange juice",
    category: "Beverages",
    unit: "half-gallon",
    threshold: 11,
    last: 5,
    gaps: [10, 11, 10, 11],
    price: 4.29,
  },
  {
    name: "Kombucha",
    category: "Beverages",
    unit: "4-pack",
    threshold: 14,
    last: 8,
    gaps: [15],
    price: 9.99,
  },

  // Household
  {
    name: "Paper towels",
    category: "Household",
    unit: "6-roll pack",
    threshold: 24,
    last: 27,
    gaps: [24, 25, 23, 24, 26, 24, 25, 23, 24],
    price: 10.99,
  },
  {
    name: "Toilet paper",
    category: "Household",
    unit: "12-roll pack",
    threshold: 30,
    last: 20,
    gaps: [29, 31, 30, 28],
    price: 12.99,
  },
  {
    name: "Trash bags",
    category: "Household",
    unit: "40-count box",
    threshold: 35,
    last: 15,
    gaps: [28, 30, 27, 29],
    price: 12.49,
  },
  {
    name: "Aluminum foil",
    category: "Household",
    unit: "75-sq-ft roll",
    threshold: 120,
    last: 120,
    gaps: [],
    price: 4.99,
  },

  // Cleaning
  {
    name: "Dish soap",
    category: "Cleaning",
    unit: "bottle",
    threshold: 30,
    last: 40,
    gaps: [28, 30, 29, 31],
    price: 4.09,
  },
  {
    name: "Laundry detergent",
    category: "Cleaning",
    unit: "92-oz bottle",
    threshold: 40,
    last: 35,
    gaps: [38, 39, 37],
    price: 13.99,
  },
  {
    name: "All-purpose cleaner",
    category: "Cleaning",
    unit: "spray bottle",
    threshold: 60,
    last: 60,
    gaps: [55, 58, 56],
    price: 5.49,
  },
  {
    name: "Dishwasher tablets",
    category: "Cleaning",
    unit: "40-count",
    threshold: 45,
    last: 30,
    gaps: [44, 46],
    price: 15.99,
  },

  // Personal care
  {
    name: "Toothpaste",
    category: "Personal care",
    unit: "tube",
    threshold: 60,
    last: 50,
    gaps: [56, 58, 54],
    price: 5.49,
  },
  {
    name: "Shampoo",
    category: "Personal care",
    unit: "bottle",
    threshold: 60,
    last: 40,
    gaps: [58, 60, 59, 57],
    price: 8.99,
  },
  {
    name: "Deodorant",
    category: "Personal care",
    unit: "stick",
    threshold: 120,
    last: 90,
    gaps: [115, 118],
    price: 6.99,
  },

  // Pet
  {
    name: "Dog food",
    category: "Pet",
    unit: "24-lb bag",
    threshold: 42,
    last: 18,
    gaps: [40, 42, 41, 39, 40],
    price: 32.99,
  },
];

const BUSY_ONE_TIME = [
  {
    name: "Birthday candles",
    category: "Household",
    unit: "pack",
    completed: false,
    createdDaysAgo: 5,
  },
  {
    name: "AA batteries",
    category: "Household",
    unit: "8-pack",
    completed: false,
    createdDaysAgo: 12,
  },
  {
    name: "Picture hooks",
    category: "Household",
    unit: "pack",
    completed: false,
    createdDaysAgo: 20,
  },
  {
    name: "Printer paper",
    category: "Household",
    unit: "ream",
    completed: false,
    createdDaysAgo: 8,
  },
  {
    name: "Cake mix",
    category: "Pantry",
    unit: "box",
    completed: true,
    createdDaysAgo: 30,
  },
  {
    name: "Gift bag",
    category: "Household",
    unit: "each",
    completed: true,
    createdDaysAgo: 16,
  },
];

function purchasePricesFor(spec, quantities) {
  const count = quantities.length;
  const latestUnit = spec.price / quantities[count - 1];
  const unknownAt = new Set(spec.unknownAt ?? []);
  const drift = spec.drift ?? 0.06;

  return quantities.map((quantity, index) => {
    if (unknownAt.has(index)) return null;
    if (index === count - 1) return roundMoney(spec.price);

    const ageRatio = (count - 1 - index) / Math.max(1, count - 1);
    const wobble = PRICE_WOBBLE[index % PRICE_WOBBLE.length];
    const unitPrice = latestUnit * (1 - drift * ageRatio) * (1 + wobble);
    return roundMoney(unitPrice * quantity);
  });
}

function buildTrackedItem(spec, referenceDate) {
  const id = `item-busy-${slugify(spec.name)}`;
  const gaps = spec.gaps ?? [];
  const purchaseCount = spec.purchases === 0 ? 0 : gaps.length + 1;
  const quantities = Array.from(
    { length: purchaseCount },
    (_, index) => spec.quantities?.[index] ?? 1,
  );
  const prices = purchaseCount ? purchasePricesFor(spec, quantities) : [];
  const gapsTotal = gaps.reduce((sum, gap) => sum + gap, 0);
  const createdAtDaysAgo =
    spec.createdDaysAgo ??
    (purchaseCount ? spec.last + gapsTotal + 3 : 30);

  const purchases = Array.from({ length: purchaseCount }, (_, index) => {
    const daysBeforeLatest = gaps.slice(index).reduce((sum, gap) => sum + gap, 0);
    return {
      id: `purchase-${id}-${index + 1}`,
      date: isoDaysAgo(referenceDate, spec.last + daysBeforeLatest),
      quantity: quantities[index],
      price: prices[index],
    };
  });

  return {
    id,
    name: spec.name,
    category: spec.category,
    unit: spec.unit,
    reorderThresholdDays: spec.threshold,
    isOneTime: false,
    completed: false,
    createdAt: isoDaysAgo(referenceDate, createdAtDaysAgo),
    purchases,
  };
}

function buildOneTimeItem(spec, referenceDate) {
  const id = `item-busy-${slugify(spec.name)}`;
  return {
    id,
    name: spec.name,
    category: spec.category,
    unit: spec.unit,
    reorderThresholdDays: 0,
    isOneTime: true,
    completed: Boolean(spec.completed),
    createdAt: isoDaysAgo(referenceDate, spec.createdDaysAgo),
    purchases: [],
  };
}

export function createBusyDemoState(referenceDate = startOfDay()) {
  const today = startOfDay(referenceDate);
  return {
    sample: "busy",
    items: [
      ...BUSY_TRACKED.map((spec) => buildTrackedItem(spec, today)),
      ...BUSY_ONE_TIME.map((spec) => buildOneTimeItem(spec, today)),
    ],
  };
}

export function createDemoStateFor(sampleId = "starter", referenceDate = startOfDay()) {
  return sampleId === "busy"
    ? createBusyDemoState(referenceDate)
    : createStarterDemoState(referenceDate);
}

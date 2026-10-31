import {
  DAY_MS,
  addDays,
  parseDate,
  predictionFor,
  startOfDay,
  toISODate,
} from "./prediction.js";
import {
  buildShoppingRun,
  groupShoppingRun,
  shoppingRunSummary,
} from "./store-run.js";

(() => {
  "use strict";

  const STORAGE_KEY = "hoot-demo-state-v1";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const htmlEntities = {
    "&": "&" + "amp;",
    "<": "&" + "lt;",
    ">": "&" + "gt;",
    '"': "&" + "quot;",
    "'": "&" + "#39;",
  };
  const escapeHtml = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (character) => htmlEntities[character]);

  const today = startOfDay();
  const daysAgoISO = (days) => toISODate(addDays(today, -days));

  const shortDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
  const longDate = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const weekdayDate = new Intl.DateTimeFormat("en-US", { weekday: "short" });
  const monthDate = new Intl.DateTimeFormat("en-US", { month: "short" });
  const formatDate = (date) => shortDate.format(date);
  const formatFullDate = (date) => longDate.format(date);
  const formatWeekday = (date) => weekdayDate.format(date);
  const formatMonth = (date) => monthDate.format(date);

  function formatMoney(value) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: value % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  function isUnknownPurchasePrice(value) {
    return value === null || value === undefined || value === "" || Number(value) === 0;
  }

  function formatPurchasePrice(value) {
    return isUnknownPurchasePrice(value) ? "Price unknown" : formatMoney(value);
  }

  function purchasePricePhrase(value) {
    return isUnknownPurchasePrice(value) ? "price unknown" : formatMoney(value);
  }

  function formatQuantity(value, unit) {
    const amount = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
    return unit ? `${amount} ${unit}` : amount;
  }

  function createDemoState() {
    return {
      items: [
        {
          id: "item-milk",
          name: "Milk",
          category: "Pantry",
          unit: "half-gallon",
          reorderThresholdDays: 10,
          isOneTime: false,
          completed: false,
          createdAt: daysAgoISO(25),
          purchases: [
            { id: "purchase-milk-1", date: daysAgoISO(25), quantity: 1, price: 4.29 },
            { id: "purchase-milk-2", date: daysAgoISO(14), quantity: 1, price: 4.49 },
            { id: "purchase-milk-3", date: daysAgoISO(5), quantity: 2, price: 8.98 },
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
          createdAt: daysAgoISO(32),
          purchases: [
            { id: "purchase-eggs-1", date: daysAgoISO(32), quantity: 1, price: 3.99 },
            { id: "purchase-eggs-2", date: daysAgoISO(18), quantity: 1, price: 4.19 },
            { id: "purchase-eggs-3", date: daysAgoISO(6), quantity: 1, price: 4.69 },
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
          createdAt: daysAgoISO(45),
          purchases: [
            { id: "purchase-towels-1", date: daysAgoISO(45), quantity: 1, price: 9.99 },
            { id: "purchase-towels-2", date: daysAgoISO(25), quantity: 1, price: 10.49 },
            { id: "purchase-towels-3", date: daysAgoISO(9), quantity: 1, price: 10.99 },
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
          createdAt: daysAgoISO(30),
          purchases: [
            { id: "purchase-dish-1", date: daysAgoISO(30), quantity: 1, price: 3.79 },
            { id: "purchase-dish-2", date: daysAgoISO(14), quantity: 1, price: 4.09 },
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
          createdAt: daysAgoISO(75),
          purchases: [
            { id: "purchase-toothpaste-1", date: daysAgoISO(75), quantity: 1, price: 4.99 },
            { id: "purchase-toothpaste-2", date: daysAgoISO(35), quantity: 1, price: 5.49 },
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
          createdAt: daysAgoISO(40),
          purchases: [{ id: "purchase-trash-1", date: daysAgoISO(40), quantity: 1, price: 12.49 }],
        },
        {
          id: "item-birthday-candles",
          name: "Birthday candles",
          category: "Household",
          unit: "pack",
          reorderThresholdDays: 0,
          isOneTime: true,
          completed: false,
          createdAt: daysAgoISO(2),
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
          createdAt: daysAgoISO(9),
          purchases: [],
        },
      ],
    };
  }

  function loadState() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && Array.isArray(parsed.items) ? parsed : null;
    } catch {
      return null;
    }
  }

  function saveState() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Local storage can be unavailable in embedded browsers. The in-memory demo still works.
    }
  }

  const STORE_RUN_KEY = "hoot-demo-store-run-v1";

  function loadStoreRun() {
    try {
      const raw = window.localStorage.getItem(STORE_RUN_KEY);
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;

      return {
        includeWatch: Boolean(parsed.includeWatch),
        selected: new Map(parsed.selected ?? []),
      };
    } catch {
      return null;
    }
  }

  function saveStoreRun() {
    try {
      window.localStorage.setItem(
        STORE_RUN_KEY,
        JSON.stringify({
          includeWatch: storeRun.includeWatch,
          selected: Array.from(storeRun.selected.entries()),
        }),
      );
    } catch {
      // Ignore storage failures; the in-memory run still works.
    }
  }

  let state = loadState() ?? createDemoState();
  let storeRun = loadStoreRun() ?? {
    includeWatch: false,
    selected: new Map(),
  };
  let currentView = "dashboard";
  let currentItemId = null;
  let itemReturnView = "dashboard";
  let editingItemId = null;
  let lastDialogTrigger = null;
  let pendingConfirm = null;
  let queueSearch = "";
  let calendarRange = 7;
  let pendingRunReceipt = null;
  let nextUpObserver = null;
  let observedNextUpCard = null;
  let nextUpCardVisible = false;

  function makeId(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  const hootApi = {
    // API-ready seam: replace these local implementations with REST calls when the backend exists.
    async getItems() {
      return clone(state.items);
    },
    async getItem(id) {
      const item = state.items.find((entry) => entry.id === id);
      if (!item) throw new Error("Item not found");
      return clone(item);
    },
    async addItem(input) {
      const duplicate = findDuplicateItem(input.name);
      if (duplicate) throw createDuplicateItemError(duplicate);

      const item = {
        id: makeId("item"),
        name: input.name,
        category: input.category,
        unit: input.unit || "",
        reorderThresholdDays: input.isOneTime ? 0 : input.reorderThresholdDays,
        isOneTime: Boolean(input.isOneTime),
        completed: false,
        createdAt: toISODate(today),
        purchases: [],
      };
      state.items.push(item);
      saveState();
      return clone(item);
    },
    async updateItem(id, input) {
      const index = state.items.findIndex((item) => item.id === id);
      if (index === -1) throw new Error("Item not found");
      state.items[index] = { ...state.items[index], ...input };
      saveState();
      return clone(state.items[index]);
    },
    async deleteItem(id) {
      state.items = state.items.filter((item) => item.id !== id);
      saveState();
      return true;
    },
    async restoreItem(item, index) {
      const insertionIndex = clamp(index, 0, state.items.length);
      state.items.splice(insertionIndex, 0, item);
      saveState();
      return clone(state.items[insertionIndex]);
    },
    async logPurchase(id, purchase) {
      const item = state.items.find((entry) => entry.id === id);
      if (!item) throw new Error("Item not found");
      item.purchases.push({
        id: makeId("purchase"),
        date: purchase.date,
        quantity: purchase.quantity,
        price: purchase.price,
      });
      item.purchases.sort((left, right) => parseDate(left.date) - parseDate(right.date));
      saveState();
      return clone(item);
    },
    async updatePurchase(itemId, purchaseId, input) {
      const item = state.items.find((entry) => entry.id === itemId);
      if (!item) throw new Error("Item not found");
      const purchase = item.purchases.find((entry) => entry.id === purchaseId);
      if (!purchase) throw new Error("Purchase not found");
      purchase.date = input.date;
      purchase.quantity = input.quantity;
      purchase.price = input.price;
      item.purchases.sort((left, right) => parseDate(left.date) - parseDate(right.date));
      saveState();
      return clone(item);
    },
    async deletePurchase(itemId, purchaseId) {
      const item = state.items.find((entry) => entry.id === itemId);
      if (!item) throw new Error("Item not found");
      const index = item.purchases.findIndex((entry) => entry.id === purchaseId);
      if (index === -1) throw new Error("Purchase not found");
      const [deletedPurchase] = item.purchases.splice(index, 1);
      saveState();
      return { item: clone(item), deletedPurchase: clone(deletedPurchase), index };
    },
    async restorePurchase(itemId, purchase, index) {
      const item = state.items.find((entry) => entry.id === itemId);
      if (!item) throw new Error("Item not found");
      const insertionIndex = clamp(index ?? item.purchases.length, 0, item.purchases.length);
      item.purchases.splice(insertionIndex, 0, {
        id: purchase.id || makeId("purchase"),
        date: purchase.date,
        quantity: purchase.quantity,
        price: purchase.price,
      });
      item.purchases.sort((left, right) => parseDate(left.date) - parseDate(right.date));
      saveState();
      return clone(item);
    },
    async toggleOneTime(id, completed) {
      const item = state.items.find((entry) => entry.id === id);
      if (!item) throw new Error("Item not found");
      item.completed = Boolean(completed);
      saveState();
      return clone(item);
    },
    async resetDemo() {
      state = createDemoState();
      saveState();
      return clone(state.items);
    },
  };

  function formatDue(daysUntil) {
    if (daysUntil < 0) {
      const days = Math.abs(daysUntil);
      return `${days} day${days === 1 ? "" : "s"} overdue`;
    }
    if (daysUntil === 0) return "Due today";
    if (daysUntil === 1) return "Tomorrow";
    return `In ${daysUntil} days`;
  }

  function latestPurchaseFor(item) {
    return (
      [...item.purchases].sort(
        (left, right) => parseDate(right.date) - parseDate(left.date),
      )[0] ?? null
    );
  }

  function matchesQueueSearch(item, searchTerm) {
    if (!searchTerm) return true;
    return [item.name, item.category, item.unit].some((value) =>
      String(value ?? "").toLowerCase().includes(searchTerm),
    );
  }

  function findDuplicateItem(name) {
    const normalizedName = String(name ?? "").trim().toLowerCase();
    if (!normalizedName) return null;
    return state.items.find((item) => item.name.trim().toLowerCase() === normalizedName) ?? null;
  }

  function duplicateItemMessage(item) {
    return item.isOneTime
      ? `${item.name} already exists.`
      : `${item.name} already exists. Log a purchase instead.`;
  }

  function createDuplicateItemError(item) {
    const error = new Error(duplicateItemMessage(item));
    error.name = "DuplicateItemError";
    return error;
  }

  function rankedTrackedEntries() {
    return state.items
      .filter((item) => !item.isOneTime)
      .map((item) => ({ item, prediction: predictionFor(item) }))
      .sort((left, right) => left.prediction.date - right.prediction.date);
  }

  function rankedTrackedItems() {
    return rankedTrackedEntries().map(({ item }) => item);
  }

  function nextUpIsVisible(card) {
    if (!card) return false;
    const rect = card.getBoundingClientRect();
    return rect.bottom > 0 && rect.top < window.innerHeight;
  }

  function updateMobileDock() {
    const shouldHide = currentView === "dashboard" && nextUpCardVisible;
    $(".header-actions")?.classList.toggle("is-hidden", shouldHide);
    document.body.classList.toggle("mobile-dock-hidden", shouldHide);
  }

  function initNextUpObserver() {
    if (!("IntersectionObserver" in window)) return;
    nextUpObserver = new IntersectionObserver(
      ([entry]) => {
        nextUpCardVisible = entry.isIntersecting;
        updateMobileDock();
      },
      { threshold: 0 },
    );
  }

  function syncNextUpDock() {
    const nextCard = $("#dashboard-list .item-card:first-child");
    if (observedNextUpCard && observedNextUpCard !== nextCard && nextUpObserver) {
      nextUpObserver.unobserve(observedNextUpCard);
    }
    observedNextUpCard = nextCard;
    if (nextCard && nextUpObserver) nextUpObserver.observe(nextCard);
    nextUpCardVisible = nextUpIsVisible(nextCard);
    updateMobileDock();
  }

  function renderStats() {
    const tracked = state.items.filter((item) => !item.isOneTime);
    const oneTime = state.items.filter((item) => item.isOneTime);
    const predictions = tracked.map((item) => predictionFor(item));
    const attention = predictions.filter((prediction) => prediction.daysUntil <= 3).length;
    const established = tracked.filter((item) => item.purchases.length >= 3).length;

    $("#stat-tracked").textContent = String(tracked.length);
    $("#stat-attention").textContent = String(attention);
    $("#stat-established").textContent = String(established);
    $("#stat-one-time").textContent = String(oneTime.length);
  }

  function horizonPositionFor(daysUntil) {
    if (daysUntil < 0) {
      const progress = Math.max(0, (daysUntil + 7) / 7);
      return 4 + progress * (33.333 - 4);
    }
    if (daysUntil <= 3) {
      const progress = daysUntil / 3;
      return 33.333 + progress * (50.0 - 33.333);
    }
    if (daysUntil <= 7) {
      const progress = (daysUntil - 3) / 4;
      return 50.0 + progress * (69.048 - 50.0);
    }
    const progress = Math.min(1, (daysUntil - 7) / 7);
    return 69.048 + progress * (96.0 - 69.048);
  }

  function formatHorizonPointerLabel(daysUntil) {
    if (daysUntil < 0) {
      const days = Math.abs(daysUntil);
      return `${days}d overdue`;
    }
    if (daysUntil === 0) return "Today";
    if (daysUntil === 1) return "Tomorrow";
    return `In ${daysUntil}d`;
  }

  function restockHorizonLane(item, prediction) {
    const position = horizonPositionFor(prediction.daysUntil);
    const label = formatHorizonPointerLabel(prediction.daysUntil);
    const align = position < 12 ? "left" : position > 88 ? "right" : "center";

    return `
      <div
        class="restock-horizon horizon-${escapeHtml(prediction.zone)}"
        role="group"
        aria-label="${escapeHtml(item.name)} is in the ${escapeHtml(prediction.statusLabel)} zone. Predicted restock ${formatFullDate(prediction.date)}, ${formatDue(prediction.daysUntil)}."
      >
        <div class="horizon-summary">
          <div>
            <span>Next predicted restock</span>
            <strong>${formatFullDate(prediction.date)}</strong>
          </div>
          <span class="horizon-due">${formatDue(prediction.daysUntil)}</span>
        </div>
        <div class="horizon-rail" aria-hidden="true">
          <span class="horizon-segment segment-overdue"></span>
          <span class="horizon-segment segment-buy-now"></span>
          <span class="horizon-segment segment-watch"></span>
          <span class="horizon-segment segment-steady"></span>
          <span class="horizon-today-line" title="Today reference"></span>
          <span class="horizon-pointer" data-align="${align}" style="left:${position.toFixed(2)}%">
            <span>${escapeHtml(label)}</span>
          </span>
        </div>
        <div class="horizon-labels" aria-hidden="true">
          <span>Overdue</span>
          <span>Buy now</span>
          <span>Watch</span>
          <span>Steady</span>
        </div>
      </div>
    `;
  }

  function nextUpCard(item, prediction) {
    const unitText = item.unit ? ` · ${escapeHtml(item.unit)}` : "";
    const logLastButton = item.purchases.length
      ? `<button class="btn btn-secondary" type="button" data-action="log-last" data-id="${escapeHtml(item.id)}">Log last</button>`
      : "";

    return `
      <article class="item-card horizon-${escapeHtml(prediction.zone)}" data-item-id="${escapeHtml(item.id)}">
        <div class="item-card-header">
          <div class="next-up-meta">
            <span class="next-up-label">Next up</span>
            <span class="status-chip status-${escapeHtml(prediction.zone)}">${escapeHtml(prediction.statusLabel)}</span>
          </div>
          <div>
            <h2>
              <button
                class="item-title-button"
                type="button"
                data-action="detail"
                data-id="${escapeHtml(item.id)}"
              >${escapeHtml(item.name)}</button>
            </h2>
            <p>${escapeHtml(item.category)}${unitText}</p>
          </div>
        </div>
        ${restockHorizonLane(item, prediction)}
        <div class="item-card-footer">
          <div class="item-actions">
            <button class="btn btn-primary" type="button" data-action="log" data-id="${escapeHtml(item.id)}">Log purchase</button>
            ${logLastButton}
            <button class="btn btn-secondary" type="button" data-action="detail" data-id="${escapeHtml(item.id)}">Details</button>
          </div>
        </div>
      </article>
    `;
  }

  function itemRow(item, prediction) {
    const unitText = item.unit ? ` · ${escapeHtml(item.unit)}` : "";
    return `
      <article class="item-row horizon-${escapeHtml(prediction.zone)}" data-item-id="${escapeHtml(item.id)}">
        <div class="item-row-main">
          <h3>
            <button
              class="item-title-button"
              type="button"
              data-action="detail"
              data-id="${escapeHtml(item.id)}"
            >${escapeHtml(item.name)}</button>
          </h3>
          <span class="status-chip status-${escapeHtml(prediction.zone)}">${escapeHtml(prediction.statusLabel)}</span>
        </div>
        <strong class="item-row-due">${formatFullDate(prediction.date)}</strong>
        <div class="item-row-actions">
          <button class="btn btn-secondary" type="button" data-action="log" data-id="${escapeHtml(item.id)}">Log purchase</button>
          <button class="btn btn-ghost" type="button" data-action="detail" data-id="${escapeHtml(item.id)}">Details</button>
        </div>
      </article>
    `;
  }

  function renderDashboard() {
    const rawSearchTerm = queueSearch.trim();
    const searchTerm = rawSearchTerm.toLowerCase();
    const tracked = rankedTrackedEntries();

    const container = $("#dashboard-list");
    const searchField = $("#queue-search-field");
    const hasTrackedItems = state.items.some((item) => !item.isOneTime);
    searchField.hidden = !hasTrackedItems;

    if (!hasTrackedItems) {
      container.innerHTML = `
          <div class="empty-state">
            <h2>No tracked items yet</h2>
            <p>Add a household staple and its restock date will appear here.</p>
            <button class="btn btn-primary" type="button" data-action="add-item">Add your first item</button>
          </div>
        `;
      syncNextUpDock();
      return;
    }

    const [nextUp, ...remainingItems] = tracked;
    const focusedCard = nextUpCard(nextUp.item, nextUp.prediction);

    if (!searchTerm) {
      container.innerHTML = `
        ${focusedCard}
        ${
          remainingItems.length
            ? `<div class="item-list">${remainingItems
                .map(({ item, prediction }) => itemRow(item, prediction))
                .join("")}</div>`
            : ""
        }
      `;
      syncNextUpDock();
      return;
    }

    const matches = tracked.filter(({ item }) => matchesQueueSearch(item, searchTerm));
    const matchCount = matches.length;
    const matchWord = matchCount === 1 ? "match" : "matches";
    const resultCount = matchCount
      ? `${matchCount} ${matchWord} for \u201C${escapeHtml(rawSearchTerm)}\u201D.`
      : `No matches for \u201C${escapeHtml(rawSearchTerm)}\u201D.`;
    const compactMatches = matches.filter(({ item }) => item.id !== nextUp.item.id);
    const focusedMatchNote =
      matchCount && !compactMatches.length
        ? `<p class="search-results-note">The match is the focused Next up item above.</p>`
        : "";

    container.innerHTML = `
      ${focusedCard}
      <section class="search-results" id="search-results" aria-labelledby="search-results-heading">
        <div class="search-results-heading">
          <h2 id="search-results-heading">Search results</h2>
          <p id="search-result-count" role="status" aria-live="polite">${resultCount}</p>
        </div>
        ${
          matchCount
            ? `${focusedMatchNote}${
                compactMatches.length
                  ? `<div class="item-list">${compactMatches
                      .map(({ item, prediction }) => itemRow(item, prediction))
                      .join("")}</div>`
                  : ""
              }`
            : `
              <div class="empty-state">
                <h2>No matches</h2>
                <p>Try another name, category, or unit.</p>
                <button class="btn btn-secondary" type="button" data-action="clear-search">Clear search</button>
              </div>
            `
        }
      </section>
    `;
    syncNextUpDock();
  }

  function calendarItemButton(item, prediction) {
    return `
      <li>
        <button
          class="calendar-item horizon-${escapeHtml(prediction.zone)}"
          type="button"
          data-action="detail"
          data-id="${escapeHtml(item.id)}"
        >
          <span>${escapeHtml(item.name)}</span>
          <small>${formatDue(prediction.daysUntil)}</small>
        </button>
      </li>
    `;
  }

  function calendarRangeWord(range) {
    return range === 7 ? "seven" : "fourteen";
  }

  function syncCalendarRangeControls() {
    $$("[data-calendar-range]").forEach((button) => {
      const isSelected = Number(button.dataset.calendarRange) === calendarRange;
      button.classList.toggle("is-active", isSelected);
      button.setAttribute("aria-pressed", String(isSelected));
    });
  }

  function renderRestockCalendar() {
    const tracked = state.items
      .filter((item) => !item.isOneTime)
      .map((item) => ({ item, prediction: predictionFor(item) }));
    const container = $("#restock-calendar");
    const rangeWord = calendarRangeWord(calendarRange);
    const rangeLabel = `Expected restocks for the next ${rangeWord} days`;

    $("#calendar-caption").textContent = `${rangeLabel}.`;
    container.setAttribute("aria-label", rangeLabel);
    syncCalendarRangeControls();

    if (!tracked.length) {
      container.innerHTML = `<p class="calendar-empty">Add a tracked item to build its restock calendar.</p>`;
      return;
    }

    const overdue = tracked.filter(({ prediction }) => prediction.daysUntil < 0);
    const dayCards = Array.from({ length: calendarRange }, (_, index) => {
      const date = addDays(today, index);
      const dueItems = tracked.filter(
        ({ prediction }) => toISODate(prediction.date) === toISODate(date),
      );
      const items = dueItems.length
        ? dueItems.map(({ item, prediction }) => calendarItemButton(item, prediction)).join("")
        : `<li><span class="calendar-clear">Clear</span></li>`;
      const monthLabel = index === 0 || date.getDate() === 1 ? formatMonth(date) : "";

      return `
        <li class="calendar-day ${index === 0 ? "is-today" : ""}">
          <header>
            <span>${formatWeekday(date)}</span>
            <strong>${date.getDate()}</strong>
            <small>${monthLabel}</small>
          </header>
          <ul class="calendar-items">${items}</ul>
        </li>
      `;
    });

    const overdueCard = overdue.length
      ? `
        <li class="calendar-day calendar-overdue">
          <header>
            <span>Past due</span>
            <strong>${overdue.length}</strong>
            <small>Needs restock</small>
          </header>
          <ul class="calendar-items">
            ${overdue.map(({ item, prediction }) => calendarItemButton(item, prediction)).join("")}
          </ul>
        </li>
      `
      : "";

    container.innerHTML = `${overdueCard}${dayCards.join("")}`;
  }

  function renderOneTime() {
    const oneTimeItems = state.items
      .filter((item) => item.isOneTime)
      .sort((left, right) => {
        const complete = Number(left.completed) - Number(right.completed);
        return complete || left.name.localeCompare(right.name);
      });
    const container = $("#one-time-list");

    if (!oneTimeItems.length) {
      container.innerHTML = `
        <div class="empty-state">
          <h2>No one-time items</h2>
          <p>Birthday candles, packing tape, anything you buy once. Nothing here affects restock dates.</p>
          <button class="btn btn-primary" type="button" data-action="add-one-time">Add a one-time item</button>
        </div>
      `;
      return;
    }

    container.innerHTML = oneTimeItems
      .map(
        (item) => `
        <article class="one-time-card ${item.completed ? "is-complete" : ""}" data-item-id="${escapeHtml(item.id)}">
          <label class="one-time-choice">
            <input
              class="one-time-check"
              type="checkbox"
              data-action="toggle-one-time"
              data-id="${escapeHtml(item.id)}"
              ${item.completed ? "checked" : ""}
              aria-label="Mark ${escapeHtml(item.name)} as purchased"
            />
            <span class="one-time-label">
              <strong>${escapeHtml(item.name)}</strong>
              <small>${escapeHtml(item.category)}${item.unit ? ` · ${escapeHtml(item.unit)}` : ""}</small>
            </span>
          </label>
          <button class="btn btn-ghost" type="button" data-action="detail" data-id="${escapeHtml(item.id)}">Details</button>
        </article>
      `,
      )
      .join("");
  }

  function renderStoreRunRow(entry) {
    const { item } = entry;
    const isInCart = storeRun.selected.has(item.id);

    if (isInCart) {
      return `
        <article class="store-run-row is-in-cart" data-item-id="${escapeHtml(item.id)}" aria-label="${escapeHtml(item.name)} in cart">
          <span class="run-check" aria-hidden="true">
            <svg viewBox="0 0 16 16" focusable="false"><path d="M3.5 8.4l2.9 2.9 6.1-6.6" /></svg>
          </span>
          <div class="store-run-row-main">
            <strong>${escapeHtml(item.name)}</strong>
            <small>In cart</small>
          </div>
        </article>
      `;
    }

    const prediction = item.isOneTime ? null : predictionFor(item, today);
    const urgency = prediction ? prediction.statusLabel : "Checklist";
    const timing = prediction ? formatDue(prediction.daysUntil) : "One-time need";
    const unitText = item.unit ? ` · ${escapeHtml(item.unit)}` : "";

    return `
      <article class="store-run-row" data-item-id="${escapeHtml(item.id)}">
        <div class="store-run-row-main">
          <strong>${escapeHtml(item.name)}</strong>
          <small>${escapeHtml(item.category)}${unitText} · ${escapeHtml(urgency)} · ${escapeHtml(timing)}</small>
        </div>
        <button
          class="btn btn-primary"
          type="button"
          data-action="toggle-run-item"
          data-id="${escapeHtml(item.id)}"
          aria-label="Add ${escapeHtml(item.name)} to cart"
          aria-pressed="false"
        >Add</button>
      </article>
    `;
  }

  function storeRunCartDetail(item, selection) {
    const purchase = selection?.purchaseId
      ? item.purchases.find((entry) => entry.id === selection.purchaseId)
      : null;
    const details = [];

    if (purchase) {
      details.push(
        `${formatQuantity(purchase.quantity, item.unit)} · ${formatPurchasePrice(purchase.price)}`,
      );
    } else if (item.isOneTime) {
      details.push("One-time checklist");
    }

    if (!item.isOneTime) {
      const prediction = predictionFor(item, today);
      if (prediction) details.push(`Next restock ${formatDate(prediction.date)}`);
    }

    return details.join(" · ");
  }

  function renderStoreRunCart(entries) {
    const cart = $("#store-run-cart");
    const selectedEntries = entries
      .filter((entry) => storeRun.selected.has(entry.item.id))
      .map((entry) => ({ ...entry, selection: storeRun.selected.get(entry.item.id) }));

    const countLabel = `${selectedEntries.length} ${
      selectedEntries.length === 1 ? "item" : "items"
    }`;

    if (!selectedEntries.length) {
      cart.innerHTML = `
        <header class="store-run-cart-header">
          <h2>In cart</h2>
          <span>0 items</span>
        </header>
        <div class="store-run-cart-empty">
          <strong>Cart is empty</strong>
          <p>Add an item and it’s saved now; Undo in the cart reverses it.</p>
        </div>
      `;
      return;
    }

    cart.innerHTML = `
      <header class="store-run-cart-header">
        <h2>In cart</h2>
        <span>${countLabel}</span>
      </header>
      <ul class="store-run-cart-list">
        ${selectedEntries
          .map(
            ({ item, selection }) => `
          <li>
            <div class="store-run-cart-item">
              <strong>${escapeHtml(item.name)}</strong>
              <small>${escapeHtml(storeRunCartDetail(item, selection))}</small>
            </div>
            <div class="store-run-cart-actions">
              <button
                class="btn btn-secondary btn-sm"
                type="button"
                data-action="adjust-run-item"
                data-id="${escapeHtml(item.id)}"
                aria-label="Adjust ${escapeHtml(item.name)}"
              >Adjust</button>
              <button
                class="btn btn-ghost btn-sm"
                type="button"
                data-action="undo-run-item"
                data-id="${escapeHtml(item.id)}"
                aria-label="Undo ${escapeHtml(item.name)}"
              >Undo</button>
            </div>
          </li>
        `,
          )
          .join("")}
      </ul>
    `;
  }

  function renderStoreRun() {
    const view = $("#view-store-run");
    if (!view) return;

    updateWatchToggle();

    const currentEntries = buildShoppingRun(state.items, {
      includeWatch: storeRun.includeWatch,
      referenceDate: today,
    });
    const roster = new Map(currentEntries.map((entry) => [entry.item.id, entry]));

    for (const selectedId of storeRun.selected.keys()) {
      if (roster.has(selectedId)) continue;

      const item = state.items.find((candidate) => candidate.id === selectedId);
      if (!item) continue;

      roster.set(selectedId, {
        item,
        type: item.isOneTime ? "one-time" : "tracked",
        priority: storeRun.selected.get(selectedId)?.priority ?? 4,
      });
    }

    const entries = [...roster.values()];
    const groups = groupShoppingRun(entries);
    const summary = shoppingRunSummary(entries, new Set(storeRun.selected.keys()));

    $("#store-run-summary").innerHTML = `
      <article><span>Items</span><strong>${summary.total}</strong></article>
      <article><span>In cart</span><strong>${summary.inCart}</strong></article>
      <article><span>Left</span><strong>${summary.remaining}</strong></article>
    `;

    $("#store-run-groups").innerHTML = groups
      .map(
        (group) => `
        <section class="store-run-group" aria-label="${escapeHtml(group.category)} aisle">
          <h2>${escapeHtml(group.category)}</h2>
          <div class="store-run-group-items">
            ${group.entries.map(renderStoreRunRow).join("")}
          </div>
        </section>
      `,
      )
      .join("");

    renderStoreRunCart(entries);

    const finishButton = $('.store-run-footer [data-action="finish-run"]');
    if (finishButton) finishButton.disabled = summary.inCart === 0;
  }

  function updateWatchToggle() {
    const button = $('[data-action="toggle-watch-items"]');
    if (!button) return;

    button.textContent = storeRun.includeWatch ? "Hide Watch" : "Show Watch";
    button.setAttribute(
      "aria-label",
      storeRun.includeWatch ? "Hide Watch items" : "Show Watch items",
    );
    button.setAttribute("aria-pressed", String(storeRun.includeWatch));
  }

  function announceRun(message) {
    const announcer = $("#store-run-announcer");
    if (announcer) announcer.textContent = message;
  }

  function focusNextRunRow(itemId) {
    const rows = [...document.querySelectorAll("#store-run-groups .store-run-row")];
    const currentIndex = rows.findIndex((row) => row.dataset.itemId === itemId);
    const orderedRows =
      currentIndex < 0
        ? rows
        : [...rows.slice(currentIndex + 1), ...rows.slice(0, currentIndex)];
    const nextButton = orderedRows
      .map((row) => row.querySelector('[data-action="toggle-run-item"]'))
      .find((button) => button && !button.disabled);

    if (nextButton) {
      nextButton.focus();
      return;
    }

    document
      .querySelector(
        `#store-run-cart [data-action="undo-run-item"][data-id="${CSS.escape(itemId)}"]`,
      )
      ?.focus();
  }

  async function toggleShoppingRunItem(itemId, trigger) {
  const item = state.items.find((entry) => entry.id === itemId);
  if (!item || storeRun.selected.has(itemId)) return;

  const currentEntry = buildShoppingRun(state.items, {
    includeWatch: storeRun.includeWatch,
    referenceDate: today,
  }).find((candidate) => candidate.item.id === itemId);
  const priority = currentEntry?.priority ?? 4;

  try {
    if (item.isOneTime) {
      await hootApi.toggleOneTime(itemId, true);
      storeRun.selected.set(itemId, { type: "one-time", priority });
      } else {
        const latest = latestPurchaseFor(item);
        const updatedItem = await hootApi.logPurchase(itemId, {
          date: toISODate(today),
          quantity: latest?.quantity ?? 1,
          price: latest?.price ?? null,
        });
        const createdPurchase = updatedItem.purchases[updatedItem.purchases.length - 1];
        if (!createdPurchase) throw new Error("Purchase not created");

        storeRun.selected.set(itemId, {
          type: "tracked",
          purchaseId: createdPurchase.id,
          priority,
        });
      }

      saveStoreRun();
      render();
      announceRun(
        `${item.name} added to cart. ${storeRun.selected.size} in cart.`,
      );
      focusNextRunRow(itemId);
    } catch {
      toast(`Could not add ${item.name}. Try again.`, "error");
    }
  }

  function adjustShoppingRunItem(itemId, trigger) {
    const item = state.items.find((entry) => entry.id === itemId);
    const selection = storeRun.selected.get(itemId);
    if (!item || !selection) return;

    if (selection.type === "tracked" && selection.purchaseId) {
      if (prepareEditPurchaseDialog(itemId, selection.purchaseId)) {
        showDialog($("#edit-purchase-dialog"), trigger);
      }
      return;
    }

    prepareEditItemDialog(itemId);
    showDialog($("#edit-item-dialog"), trigger);
  }

  async function undoShoppingRunItem(itemId, trigger) {
    const item = state.items.find((entry) => entry.id === itemId);
    const selection = storeRun.selected.get(itemId);
    if (!item || !selection) return;

    try {
      if (selection.type === "tracked" && selection.purchaseId) {
        const purchaseExists = item.purchases.some((purchase) => purchase.id === selection.purchaseId);
        if (purchaseExists) await hootApi.deletePurchase(itemId, selection.purchaseId);
      } else if (item.isOneTime) {
        await hootApi.toggleOneTime(itemId, false);
      }

      storeRun.selected.delete(itemId);
      saveStoreRun();
      render();
      document
        .querySelector(
          `.store-run-row[data-item-id="${CSS.escape(itemId)}"] [data-action="toggle-run-item"]`,
        )
        ?.focus();
      announceRun(
        `${item.name} ${selection.type === "one-time" ? "restored" : "removed from cart"}. ${
          storeRun.selected.size
        } in cart.`,
      );
    } catch {
      toast(`Could not undo ${item.name}. Try again.`, "error");
    }
  }

  function buildRunReceipt() {
    const entries = [];

    for (const [itemId, selection] of storeRun.selected) {
      const item = state.items.find((candidate) => candidate.id === itemId);
      if (!item) continue;
      const purchase = selection.purchaseId
        ? item.purchases.find((entry) => entry.id === selection.purchaseId)
        : null;
      entries.push({ item, selection, purchase });
    }

    const trackedEntries = entries.filter(({ item }) => !item.isOneTime);
    const knownPrices = trackedEntries
      .map(({ purchase }) => purchase?.price)
      .filter((price) => typeof price === "number" && price > 0);
    const totalSpent = knownPrices.reduce((sum, price) => sum + price, 0);
    const historyEntry = trackedEntries.find(({ purchase }) => purchase) ?? null;

    return {
      entries,
      trackedEntries,
      totalSpent,
      hasKnownPrice: knownPrices.length > 0,
      historyItemId: historyEntry?.item.id ?? null,
    };
  }

  function finishShoppingRun(trigger) {
    const receipt = buildRunReceipt();
    if (!receipt.entries.length) return;

    const count = receipt.entries.length;
    const trackedCount = receipt.trackedEntries.length;
    const itemWord = count === 1 ? "item" : "items";
    pendingRunReceipt = receipt;

    $("#finish-run-title").textContent = "Shopping run finished";
    $("#finish-run-message").textContent = `${count} ${itemWord} checked off.${
      trackedCount
        ? ` ${trackedCount} restock date${trackedCount === 1 ? "" : "s"} updated.`
        : " No restock dates changed."
    }`;
    $("#finish-run-summary").innerHTML = `
      <strong>${count} ${itemWord}</strong>
      ${
        receipt.hasKnownPrice
          ? `<span>${formatMoney(receipt.totalSpent)} known spend</span>`
          : `<span>Spending not recorded</span>`
      }
    `;
    $("#finish-run-list").innerHTML = receipt.entries
      .map(({ item, purchase }) => {
        const detail = purchase
          ? `${formatQuantity(purchase.quantity, item.unit)} · ${formatPurchasePrice(purchase.price)}`
          : "One-time checklist";
        return `<li><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(detail)}</span></li>`;
      })
      .join("");
    $("#finish-run-history").hidden = !receipt.historyItemId;
    $("#toast-region").replaceChildren();
    showDialog($("#finish-run-dialog"), trigger);
  }

  function completeShoppingRun({ openHistory = false } = {}) {
    const receipt = pendingRunReceipt;
    pendingRunReceipt = null;
    lastDialogTrigger = null;
    closeDialog($("#finish-run-dialog"));
    storeRun = {
      includeWatch: false,
      selected: new Map(),
    };
    saveStoreRun();

    setView("dashboard");

    if (openHistory && receipt?.historyItemId) {
      openDetail(receipt.historyItemId);
      $(".item-page .back-button")?.focus({ preventScroll: true });
      return;
    }

    $('.nav-button[data-view="dashboard"]')?.focus({ preventScroll: true });
  }

  function toggleWatchItems(trigger) {
    storeRun.includeWatch = !storeRun.includeWatch;
    saveStoreRun();
    renderStoreRun();
    announceRun(
      storeRun.includeWatch ? "Watch items included." : "Watch items hidden.",
    );
  }

  function predictionChart(item, prediction) {
    if (!prediction) {
      return `
        <div class="chart-empty">
          <strong>No restock date</strong>
          <p>Restock dates come from purchases logged on tracked staples.</p>
        </div>
      `;
    }
    if (!prediction.purchaseDates.length) {
      return `
        <div class="chart-empty">
          <strong>No purchases yet</strong>
          <p>Log a purchase to start this item’s timeline.</p>
        </div>
      `;
    }

    const width = 760;
    const height = 330;
    const margin = { top: 28, right: 34, bottom: 56, left: 76 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const xMin = prediction.origin;
    const xMaxCandidate = new Date(Math.max(prediction.latest, prediction.date));
    const xMax = xMaxCandidate > xMin ? xMaxCandidate : addDays(xMin, 1);
    const yMax = Math.max(prediction.purchaseCount + 1, 2);
    const x = (date) => margin.left + ((date - xMin) / (xMax - xMin)) * plotWidth;
    const y = (sequence) =>
      height - margin.bottom - ((sequence - 1) / (yMax - 1)) * plotHeight;

    const observedPoints = prediction.purchaseDates.map((date, index) => ({
      x: x(date),
      y: y(index + 1),
      date,
      sequence: index + 1,
    }));
    const fittedPoints = prediction.fittedDates
      ? prediction.fittedDates.map((date, index) => ({
          x: x(date),
          y: y(index + 1),
        }))
      : null;
    const projectionStart = fittedPoints
      ? fittedPoints[fittedPoints.length - 1]
      : observedPoints[observedPoints.length - 1];
    const projectionEnd = {
      x: x(prediction.date),
      y: y(prediction.purchaseCount + 1),
    };
    const xTicks = [prediction.origin, prediction.latest, prediction.date]
      .filter((date, index, dates) => dates.findIndex((entry) => toISODate(entry) === toISODate(date)) === index)
      .sort((left, right) => left - right);
    const yTicks = Array.from({ length: yMax }, (_, index) => index + 1);
    const observedCircles = observedPoints
      .map(
        (point) => `
          <circle class="chart-point" cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="6">
            <title>Observed purchase ${formatFullDate(point.date)}</title>
          </circle>
        `,
      )
      .join("");
    const fittedPath = fittedPoints
      ? `M${fittedPoints.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" L")}`
      : "";
    const xTickElements = xTicks
      .map(
        (date) => `
          <g class="chart-grid">
            <line x1="${x(date).toFixed(1)}" y1="${margin.top}" x2="${x(date).toFixed(1)}" y2="${height - margin.bottom}" />
            <text x="${x(date).toFixed(1)}" y="${height - 26}" text-anchor="middle">${formatDate(date)}</text>
          </g>
        `,
      )
      .join("");
    const yTickElements = yTicks
      .map(
        (sequence) => `
          <g class="chart-grid">
            <line x1="${margin.left}" y1="${y(sequence).toFixed(1)}" x2="${width - margin.right}" y2="${y(sequence).toFixed(1)}" />
            <text x="${margin.left - 12}" y="${(y(sequence) + 4).toFixed(1)}" text-anchor="end">${sequence === prediction.purchaseCount + 1 ? "Next" : `#${sequence}`}</text>
          </g>
        `,
      )
      .join("");

    return `
      <figure class="prediction-figure">
        <svg
          viewBox="0 0 ${width} ${height}"
          role="img"
          aria-labelledby="prediction-chart-title-${escapeHtml(item.id)} prediction-chart-desc-${escapeHtml(item.id)}"
        >
          <title id="prediction-chart-title-${escapeHtml(item.id)}">Purchase rhythm and projected restock for ${escapeHtml(item.name)}</title>
          <desc id="prediction-chart-desc-${escapeHtml(item.id)}">
            Observed purchases are plotted by date and purchase sequence. ${escapeHtml(prediction.method)}. The projected next restock is ${formatFullDate(prediction.date)}.
          </desc>
          ${xTickElements}
          ${yTickElements}
          ${fittedPath ? `<path class="chart-fitted" d="${fittedPath}" />` : ""}
          <path
            class="chart-projection"
            d="M${projectionStart.x.toFixed(1)},${projectionStart.y.toFixed(1)} L${projectionEnd.x.toFixed(1)},${projectionEnd.y.toFixed(1)}"
          />
          ${observedCircles}
          <circle class="chart-point chart-prediction" cx="${projectionEnd.x.toFixed(1)}" cy="${projectionEnd.y.toFixed(1)}" r="7">
            <title>Projected restock ${formatFullDate(prediction.date)}</title>
          </circle>
        </svg>
        <figcaption>
          Purchase dates set the pattern; the dashed line projects the next restock.
        </figcaption>
      </figure>
    `;
  }

  function modelExplanation(item, prediction) {
    if (!prediction) {
      return "One-time items stay on a checklist, so they don’t get a restock date.";
    }
    if (!prediction.purchaseDates.length) {
      return `No purchases yet, so the date comes from the ${item.reorderThresholdDays}-day interval you set.`;
    }
    if (prediction.maturity === "learning") {
      return `The date comes from the ${item.reorderThresholdDays}-day interval you set. Once you’ve logged three purchases, it switches to the gaps between them.`;
    }
    const gapDays = prediction.slope ?? prediction.averageInterval;
    return `Your purchases have been about ${gapDays.toFixed(1)} days apart. Carried forward from the last one, that points to ${formatFullDate(prediction.date)}.`;
  }

  function consistencyLabel(prediction) {
    if (!prediction || prediction.rSquared === null || prediction.rSquared === undefined) {
      return "No steady pattern";
    }
    if (prediction.rSquared >= 0.7) {
      return "Gaps are close to even";
    }
    if (prediction.rSquared >= 0.4) {
      return "Gaps vary a little";
    }
    return "Gaps vary a lot";
  }

  function renderItemPage(item) {
    const content = $("#item-analysis-content");
    const prediction = predictionFor(item);
    const purchases = [...item.purchases].sort(
      (left, right) => parseDate(left.date) - parseDate(right.date),
    );
    const historyRows = purchases
      .map(
        (purchase) => `
          <tr>
            <td data-label="Date">${formatFullDate(parseDate(purchase.date))}</td>
            <td data-label="Quantity">${purchase.quantity} ${escapeHtml(item.unit || "unit")}</td>
            <td data-label="Total price" class="history-price-cell">${formatPurchasePrice(purchase.price)}</td>
            <td data-label="Actions" class="history-actions-cell">
              <div class="history-actions-group">
                <button
                  class="btn btn-secondary btn-sm"
                  type="button"
                  data-action="edit-purchase"
                  data-id="${escapeHtml(item.id)}"
                  data-purchase-id="${escapeHtml(purchase.id)}"
                  aria-label="Edit purchase on ${formatFullDate(parseDate(purchase.date))}"
                >Edit</button>
                <button
                  class="btn btn-ghost btn-sm history-delete-btn"
                  type="button"
                  data-action="delete-purchase"
                  data-id="${escapeHtml(item.id)}"
                  data-purchase-id="${escapeHtml(purchase.id)}"
                  aria-label="Delete purchase on ${formatFullDate(parseDate(purchase.date))}"
                >Delete</button>
              </div>
            </td>
          </tr>
        `,
      )
      .join("");
    const history = `
      <table class="history-table">
        <caption>Purchase history for ${escapeHtml(item.name)}</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Quantity</th>
            <th scope="col" class="history-price-col">Total price</th>
            <th scope="col" class="history-actions-header">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${
            historyRows ||
            `<tr><td colspan="4" class="history-empty">No purchase history yet.</td></tr>`
          }
        </tbody>
      </table>
    `;
    const averageInterval = prediction?.averageInterval;
    const learningProgress = prediction
      ? prediction.purchaseCount === 0
        ? "No purchases yet"
        : prediction.purchaseCount < 3
          ? `${prediction.purchaseCount} of 3 purchases`
          : "Learned"
      : "Checklist";
    const intervalRange = prediction?.intervals.length
      ? `${Math.min(...prediction.intervals)}–${Math.max(...prediction.intervals)} days`
      : "Not enough purchases";
    const backLabel =
      itemReturnView === "one-time"
        ? "Back to one-time items"
        : "Back to dashboard";

    content.innerHTML = `
      <div class="item-page">
        <button class="btn btn-secondary back-button" type="button" data-view="${escapeHtml(itemReturnView)}">
          ← ${backLabel}
        </button>
        <header class="item-page-header">
          <div>
            <h1 id="item-analysis-title" tabindex="-1">${escapeHtml(item.name)}</h1>
            <p>${escapeHtml(item.category)} · ${escapeHtml(item.unit || "No unit specified")} · ${purchases.length} logged purchase${purchases.length === 1 ? "" : "s"}</p>
          </div>
          <span class="status-chip ${prediction ? `status-${escapeHtml(prediction.zone)}` : "status-learning"}">
            ${prediction ? escapeHtml(prediction.statusLabel) : "Checklist"}
          </span>
        </header>

        ${prediction ? restockHorizonLane(item, prediction) : ""}

        <div class="analysis-grid">
        <article class="analysis-card">
          ${
            item.isOneTime
              ? `<span>One-time item</span><strong>No restock date</strong><p>This item stays on the checklist and doesn’t affect restock dates.</p>`
              : `<span>Next predicted restock</span><strong>${formatFullDate(prediction.date)} · ${formatDue(prediction.daysUntil)}</strong>
                <p>${escapeHtml(prediction.confidence)}</p>
                <details class="estimate-disclosure">
                  <summary>How this estimate works</summary>
                  <p>${escapeHtml(modelExplanation(item, prediction))}</p>
                  <dl class="analysis-facts">
                    <div><dt>Purchases used</dt><dd>${prediction.purchaseCount}</dd></div>
                    <div><dt>Consistency</dt><dd>${escapeHtml(consistencyLabel(prediction))}</dd></div>
                    <div><dt>What changes it</dt><dd>Your next purchase</dd></div>
                  </dl>
                </details>`
          }
        </article>

        ${
          item.isOneTime
            ? `<article class="analysis-card">
          <span>Checklist</span>
          <strong>Not tracked by date</strong>
          <dl class="analysis-facts">
            <div><dt>Tracking mode</dt><dd>Checklist only</dd></div>
            <div><dt>Restock date</dt><dd>Not tracked</dd></div>
            <div><dt>Purchase history</dt><dd>Not used</dd></div>
          </dl>
        </article>`
            : `<article class="analysis-card">
          <span>Rhythm</span>
          <strong>${averageInterval ? `${averageInterval.toFixed(1)} days average` : "Building rhythm"}</strong>
          <dl class="analysis-facts">
            <div><dt>Interval range</dt><dd>${intervalRange}</dd></div>
            <div><dt>Learning progress</dt><dd>${learningProgress}</dd></div>
            <div><dt>Estimate source</dt><dd>${prediction ? escapeHtml(prediction.method) : "Checklist"}</dd></div>
          </dl>
        </article>`
        }
        </div>

        <section class="chart-panel">
          <div class="section-heading">
            <div>
              <h2>${item.isOneTime ? "How this item is tracked" : "How this date is estimated"}</h2>
            </div>
          </div>
          ${predictionChart(item, prediction)}
        </section>

        <section>
          <h2>Purchase history</h2>
          ${history}
        </section>

        <footer class="detail-actions">
          ${!item.isOneTime ? `<button class="btn btn-secondary" type="button" data-action="log" data-id="${escapeHtml(item.id)}">Log purchase</button>` : ""}
          <button class="btn btn-secondary" type="button" data-action="edit" data-id="${escapeHtml(item.id)}">Edit</button>
          <button class="btn btn-danger" type="button" data-action="delete" data-id="${escapeHtml(item.id)}">Delete</button>
        </footer>
      </div>
    `;
  }

  function updatePurchaseSelect(selectedId = null) {
    const select = $("#purchase-item");
    const tracked = rankedTrackedItems();
    if (!tracked.length) {
      select.innerHTML = `<option value="">No tracked items yet</option>`;
      select.disabled = true;
      return;
    }

    select.disabled = false;
    select.innerHTML = tracked
      .map(
        (item) =>
          `<option value="${escapeHtml(item.id)}" ${item.id === selectedId ? "selected" : ""}>${escapeHtml(item.name)}</option>`,
      )
      .join("");
  }

  function render() {
    renderStats();
    renderDashboard();
    renderRestockCalendar();
    renderOneTime();
    if (currentView === "store-run") {
      renderStoreRun();
    }
    if (currentView === "item" && currentItemId) {
      const item = state.items.find((entry) => entry.id === currentItemId);
      if (item) renderItemPage(item);
    }
  }

  function setView(view) {
    const previousView = currentView;
    let nextView = view;
    if (nextView === "item") {
      const item = state.items.find((entry) => entry.id === currentItemId);
      if (item) renderItemPage(item);
      else nextView = itemReturnView || "dashboard";
    }
    currentView = nextView;
    document.body.classList.toggle("is-store-run", nextView === "store-run");
    $$(".app-view").forEach((section) => {
      section.classList.toggle("is-active", section.id === `view-${nextView}`);
    });
    $$(".nav-button").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.view === nextView);
      if (button.dataset.view === nextView) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
    if (nextView === "dashboard") syncNextUpDock();
    else updateMobileDock();
    if (nextView === "store-run") {
      if (!storeRun.selected.size) {
        const [nextUp] = rankedTrackedEntries();
        if (nextUp?.prediction.zone === "watch" && !storeRun.includeWatch) {
          storeRun.includeWatch = true;
          saveStoreRun();
        }
      }
      renderStoreRun();
      if (previousView !== "store-run") {
        $("#store-run-title")?.focus();
      }
    } else if (previousView === "store-run" && nextView === "dashboard") {
      $('.nav-button[data-view="dashboard"]')?.focus();
    }
  }

  function clearFieldErrors(form) {
    $$(".field-error", form).forEach((error) => {
      error.textContent = "";
    });
    $$("[aria-invalid]", form).forEach((input) => {
      input.removeAttribute("aria-invalid");
    });
  }

  function setFieldError(input, message) {
    input.setAttribute("aria-invalid", "true");
    const field = input.closest(".field");
    const error = field?.querySelector(".field-error");
    if (error) {
      error.textContent = message;
      const describedBy = input.getAttribute("aria-describedby");
      if (error.id && !describedBy?.includes(error.id)) {
        input.setAttribute("aria-describedby", [describedBy, error.id].filter(Boolean).join(" "));
      }
    }
  }

  function setFormStatus(form, message, tone = "neutral") {
    const status = $("[data-form-status]", form);
    if (!status) return;
    status.textContent = message;
    if (tone === "error") status.dataset.tone = "error";
    else delete status.dataset.tone;
  }

  function setFormBusy(form, isBusy) {
    const submitButton = form.querySelector('[type="submit"]');
    if (!submitButton) return;

    if (!submitButton.dataset.label) submitButton.dataset.label = submitButton.textContent;
    submitButton.textContent = isBusy
      ? submitButton.dataset.loadingLabel || "Saving…"
      : submitButton.dataset.label;

    if (isBusy) submitButton.setAttribute("aria-disabled", "true");
    else submitButton.removeAttribute("aria-disabled");

    form.setAttribute("aria-busy", String(isBusy));
  }

  function resetDialogFormState(form) {
    clearFieldErrors(form);
    setFormBusy(form, false);
    setFormStatus(form, "");
  }

  function updateAddItemTypeState(isOneTime) {
    const thresholdField = $("#add-threshold-field");
    const thresholdInput = $("#add-threshold");
    thresholdField.hidden = isOneTime;
    thresholdInput.disabled = isOneTime;
    thresholdInput.value = isOneTime ? "" : "14";
  }

  function readAddItemForm() {
    const form = $("#add-item-form");
    const nameInput = $("#add-name");
    const thresholdInput = $("#add-threshold");
    const itemType = form.elements.itemType.value;
    const isOneTime = itemType === "one-time";
    const threshold = Number(thresholdInput.value);

    clearFieldErrors(form);
    if (!nameInput.value.trim()) {
      setFieldError(nameInput, "Give the item a name.");
      nameInput.focus();
      return null;
    }
    const duplicate = findDuplicateItem(nameInput.value);
    if (duplicate) {
      setFieldError(nameInput, duplicateItemMessage(duplicate));
      nameInput.focus();
      return null;
    }
    if (!isOneTime && (!Number.isFinite(threshold) || threshold < 1 || threshold > 365)) {
      setFieldError(thresholdInput, "Enter a typical restock interval between 1 and 365 days.");
      thresholdInput.focus();
      return null;
    }

    return {
      name: nameInput.value.trim(),
      category: $("#add-category").value,
      unit: $("#add-unit").value.trim(),
      isOneTime,
      reorderThresholdDays: isOneTime ? 0 : Math.round(threshold),
    };
  }

  function prepareAddItemDialog(isOneTime = false) {
    const form = $("#add-item-form");
    form.reset();
    resetDialogFormState(form);
    form.elements.itemType.value = isOneTime ? "one-time" : "tracked";
    updateAddItemTypeState(isOneTime);
  }

  async function submitAddItem(event) {
    event.preventDefault();
    const form = $("#add-item-form");
    if (form.getAttribute("aria-busy") === "true") return;

    setFormStatus(form, "");
    const input = readAddItemForm();
    if (!input) {
      setFormStatus(form, "Fix the highlighted field.", "error");
      return;
    }

    setFormBusy(form, true);
    try {
      const item = await hootApi.addItem(input);
      render();
      setFormStatus(form, "Saved.");
      window.setTimeout(() => closeDialog($("#add-item-dialog")), 240);
      toast(input.isOneTime ? "One-time item added." : `${item.name} is now tracked.`);
      if (input.isOneTime) setView("one-time");
    } catch {
      setFormBusy(form, false);
      setFormStatus(form, "Could not add the item. Try again.", "error");
    }
  }

  function prepareLogPurchaseDialog(itemId = null, { repeatLast = false } = {}) {
    const tracked = rankedTrackedItems();
    const form = $("#log-purchase-form");
    const fields = $("#purchase-fields");
    const emptyState = $("#purchase-empty-state");
    const submitButton = form.querySelector('[type="submit"]');

    form.reset();
    resetDialogFormState(form);
    const selectedItemId = tracked.length ? itemId || tracked[0].id : null;
    updatePurchaseSelect(selectedItemId);

    if (!tracked.length) {
      fields.hidden = true;
      emptyState.hidden = false;
      submitButton.disabled = true;
      setFormStatus(form, "Add a tracked item to enable purchase logging.");
      return true;
    }

    fields.hidden = false;
    emptyState.hidden = true;
    submitButton.disabled = false;
    const selectedItem = state.items.find((item) => item.id === selectedItemId);
    const latestPurchase = repeatLast ? latestPurchaseFor(selectedItem) : null;
    $("#purchase-date").max = toISODate(startOfDay());
    $("#purchase-date").value = toISODate(startOfDay());
    $("#purchase-quantity").value = String(latestPurchase?.quantity ?? 1);
    $("#purchase-price").value =
      repeatLast && latestPurchase && !isUnknownPurchasePrice(latestPurchase.price)
        ? String(latestPurchase.price)
        : "";
    return true;
  }

  async function submitLogPurchase(event) {
    event.preventDefault();
    const form = $("#log-purchase-form");
    if (form.getAttribute("aria-busy") === "true") return;

    const itemSelect = $("#purchase-item");
    const dateInput = $("#purchase-date");
    const quantityInput = $("#purchase-quantity");
    const priceInput = $("#purchase-price");

    clearFieldErrors(form);
    setFormStatus(form, "");
    const quantity = Number(quantityInput.value);
    const rawPrice = priceInput.value.trim();
    const price = isUnknownPurchasePrice(rawPrice) ? null : Number(rawPrice);
    const purchaseDate = dateInput.value ? parseDate(dateInput.value) : null;

    if (!itemSelect.value) {
      setFieldError(itemSelect, "Select a tracked item.");
      itemSelect.focus();
      setFormStatus(form, "Fix the highlighted field.", "error");
      return;
    }
    if (!purchaseDate) {
      setFieldError(dateInput, "Choose the purchase date.");
      dateInput.focus();
      setFormStatus(form, "Fix the highlighted field.", "error");
      return;
    }
    if (purchaseDate > startOfDay()) {
      setFieldError(dateInput, "Purchase date cannot be in the future.");
      dateInput.focus();
      setFormStatus(form, "Fix the highlighted field.", "error");
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setFieldError(quantityInput, "Enter a quantity greater than zero.");
      quantityInput.focus();
      setFormStatus(form, "Fix the highlighted field.", "error");
      return;
    }
    if (price !== null && (!Number.isFinite(price) || price < 0)) {
      setFieldError(priceInput, "Enter a valid price, or leave it blank if unknown.");
      priceInput.focus();
      setFormStatus(form, "Fix the highlighted field.", "error");
      return;
    }

    setFormBusy(form, true);
    try {
      const updatedItem = await hootApi.logPurchase(itemSelect.value, {
        date: toISODate(purchaseDate),
        quantity,
        price,
      });
      const prediction = predictionFor(updatedItem);
      render();
      setFormStatus(form, "Saved.");
      window.setTimeout(() => closeDialog($("#log-purchase-dialog")), 240);
      toast(
        `${updatedItem.name} logged — ${formatQuantity(quantity, updatedItem.unit)} for ${purchasePricePhrase(price)}. ` +
          `Next restock ${formatFullDate(prediction.date)}.`,
      );
    } catch {
      setFormBusy(form, false);
      setFormStatus(form, "Could not log the purchase. Try again.", "error");
    }
  }

  function prepareEditItemDialog(itemId) {
    const item = state.items.find((entry) => entry.id === itemId);
    if (!item) return;
    editingItemId = item.id;
    const form = $("#edit-item-form");
    form.reset();
    clearFieldErrors(form);
    $("#edit-name").value = item.name;
    $("#edit-category").value = item.category;
    $("#edit-unit").value = item.unit || "";
    $("#edit-threshold").disabled = item.isOneTime;
    $("#edit-threshold").value = item.isOneTime ? "" : String(item.reorderThresholdDays);
    $("#edit-name").focus();
  }

  async function submitEditItem(event) {
    event.preventDefault();
    if (!editingItemId) return;
    const item = state.items.find((entry) => entry.id === editingItemId);
    if (!item) return;

    const form = $("#edit-item-form");
    const nameInput = $("#edit-name");
    const thresholdInput = $("#edit-threshold");
    const threshold = Number(thresholdInput.value);
    clearFieldErrors(form);

    const trimmedName = nameInput.value.trim();
    if (!trimmedName) {
      setFieldError(nameInput, "Give the item a name.");
      nameInput.focus();
      return;
    }
    const duplicate = state.items.find(
      (entry) => entry.id !== item.id && entry.name.trim().toLowerCase() === trimmedName.toLowerCase(),
    );
    if (duplicate) {
      setFieldError(nameInput, duplicateItemMessage(duplicate));
      nameInput.focus();
      return;
    }
    if (!item.isOneTime && (!Number.isFinite(threshold) || threshold < 1 || threshold > 365)) {
      setFieldError(thresholdInput, "Enter a typical restock interval between 1 and 365 days.");
      thresholdInput.focus();
      return;
    }

    setFormBusy(form, true);
    try {
      const updatedItem = await hootApi.updateItem(item.id, {
        name: trimmedName,
        category: $("#edit-category").value,
        unit: $("#edit-unit").value.trim(),
        reorderThresholdDays: item.isOneTime ? 0 : Math.round(threshold),
      });

      render();
      setFormStatus(form, "Saved.");
      window.setTimeout(() => closeDialog($("#edit-item-dialog")), 240);
      toast("Item updated.");
    } catch {
      setFormBusy(form, false);
      setFormStatus(form, "Could not update the item. Try again.", "error");
    }
  }

  function prepareEditPurchaseDialog(itemId, purchaseId) {
    const item = state.items.find((entry) => entry.id === itemId);
    if (!item) return false;
    const purchase = item.purchases.find((entry) => entry.id === purchaseId);
    if (!purchase) return false;

    const form = $("#edit-purchase-form");
    form.reset();
    resetDialogFormState(form);

    $("#edit-purchase-item-id").value = item.id;
    $("#edit-purchase-id").value = purchase.id;

    const dateInput = $("#edit-purchase-date");
    dateInput.max = toISODate(startOfDay());
    dateInput.value = purchase.date;

    const qtyInput = $("#edit-purchase-quantity");
    qtyInput.value = String(purchase.quantity ?? 1);

    const priceInput = $("#edit-purchase-price");
    priceInput.value = purchase.price !== null && purchase.price !== undefined ? String(purchase.price) : "";

    return true;
  }

  async function submitEditPurchase(event) {
    event.preventDefault();
    const form = $("#edit-purchase-form");
    const itemId = $("#edit-purchase-item-id").value;
    const purchaseId = $("#edit-purchase-id").value;
    const dateInput = $("#edit-purchase-date");
    const quantityInput = $("#edit-purchase-quantity");
    const priceInput = $("#edit-purchase-price");

    clearFieldErrors(form);

    const dateVal = dateInput.value;
    const purchaseDate = dateVal ? parseDate(dateVal) : null;
    const quantity = Number(quantityInput.value);
    const rawPrice = priceInput.value.trim();
    const price = rawPrice === "" ? null : Number(rawPrice);

    if (!purchaseDate) {
      setFieldError(dateInput, "Choose the purchase date.");
      dateInput.focus();
      setFormStatus(form, "Fix the highlighted field.", "error");
      return;
    }
    if (purchaseDate > startOfDay()) {
      setFieldError(dateInput, "Purchase date cannot be in the future.");
      dateInput.focus();
      setFormStatus(form, "Fix the highlighted field.", "error");
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setFieldError(quantityInput, "Enter a quantity greater than zero.");
      quantityInput.focus();
      setFormStatus(form, "Fix the highlighted field.", "error");
      return;
    }
    if (price !== null && (!Number.isFinite(price) || price < 0)) {
      setFieldError(priceInput, "Enter a valid price, or leave it blank if unknown.");
      priceInput.focus();
      setFormStatus(form, "Fix the highlighted field.", "error");
      return;
    }

    setFormBusy(form, true);
    try {
      const updatedItem = await hootApi.updatePurchase(itemId, purchaseId, {
        date: toISODate(purchaseDate),
        quantity,
        price,
      });
      const prediction = predictionFor(updatedItem);
      render();
      setFormStatus(form, "Saved.");
      window.setTimeout(() => closeDialog($("#edit-purchase-dialog")), 240);
      toast(
        prediction
          ? `Purchase updated. Next restock ${formatFullDate(prediction.date)}.`
          : "Purchase updated.",
      );
    } catch {
      setFormBusy(form, false);
      setFormStatus(form, "Could not update the purchase. Try again.", "error");
    }
  }

  function openConfirm({ title, message, confirmLabel, onConfirm }) {
    $("#confirm-title").textContent = title;
    $("#confirm-message").textContent = message;
    $("#confirm-action").textContent = confirmLabel;
    pendingConfirm = onConfirm;
    showDialog($("#confirm-dialog"));
  }

  function toast(message, kind = "success", action = null) {
    const toastElement = document.createElement("div");
    toastElement.className = `toast toast-${kind}`;
    toastElement.textContent = message;

    if (action) {
      const actionButton = document.createElement("button");
      actionButton.className = "toast-action";
      actionButton.type = "button";
      actionButton.textContent = action.label;
      actionButton.addEventListener("click", async () => {
        window.clearTimeout(removeTimer);
        toastElement.remove();
        await action.onAction();
      });
      toastElement.append(actionButton);
    }

    $("#toast-region").append(toastElement);
    const lifetime = action ? 6400 : 3400;
    toastElement.style.animationDuration = `${lifetime}ms`;
    const removeTimer = window.setTimeout(() => toastElement.remove(), lifetime);
  }

  function showDialog(dialog, trigger = null) {
    lastDialogTrigger = trigger instanceof HTMLElement ? trigger : document.activeElement;
    if (!dialog.open) dialog.showModal();

    const autofocusTarget = dialog.querySelector("[data-autofocus]");
    if (autofocusTarget) {
      autofocusTarget.focus();
      return;
    }

    const firstControl = Array.from(
      dialog.querySelectorAll(
        "input:not([type='hidden']):not(:disabled), select:not(:disabled), textarea:not(:disabled)",
      ),
    ).find((control) => control.getClientRects().length > 0);
    const primaryAction = dialog.querySelector("button:not([data-close]):not(:disabled)");
    const fallbackAction = dialog.querySelector(".btn-secondary:not(:disabled)");
    const focusTarget = firstControl || primaryAction || fallbackAction;
    if (focusTarget) focusTarget.focus();
  }

  function closeDialog(dialog) {
    if (dialog.open) dialog.close();
  }

  function openDetail(itemId) {
    const item = state.items.find((entry) => entry.id === itemId);
    if (!item) return;
    itemReturnView = currentView === "item" ? itemReturnView : currentView || "dashboard";
    currentItemId = item.id;
    currentView = "item";
    render();
    setView("item");
    window.scrollTo(0, 0);
    $("#item-analysis-title")?.focus({ preventScroll: true });
  }

  function requestDelete(itemId, trigger) {
    const itemIndex = state.items.findIndex((entry) => entry.id === itemId);
    if (itemIndex === -1) return;
    const item = state.items[itemIndex];
    const deletedItem = clone(item);

    openConfirm({
      title: "Delete this item?",
      message: `This removes “${item.name}” and its local demo history. You can undo it from the message for a few seconds after deleting.`,
      confirmLabel: "Delete item",
      onConfirm: async () => {
        await hootApi.deleteItem(deletedItem.id);
        const returnView = itemReturnView || "dashboard";
        currentItemId = null;
        itemReturnView = "dashboard";
        render();
        setView(returnView);
        toast(`${deletedItem.name} deleted.`, "success", {
          label: "Undo",
          onAction: async () => {
            await hootApi.restoreItem(deletedItem, itemIndex);
            render();
            toast(`${deletedItem.name} restored.`);
          },
        });
      },
    });
    if (trigger instanceof HTMLElement) lastDialogTrigger = trigger;
  }

  function requestDeletePurchase(itemId, purchaseId, trigger) {
    const item = state.items.find((entry) => entry.id === itemId);
    if (!item) return;
    const purchaseIndex = item.purchases.findIndex((entry) => entry.id === purchaseId);
    if (purchaseIndex === -1) return;
    const targetPurchase = item.purchases[purchaseIndex];
    const purchaseDateLabel = formatFullDate(parseDate(targetPurchase.date));

    openConfirm({
      title: "Delete this purchase?",
      message: `Remove the purchase of ${targetPurchase.quantity} ${escapeHtml(item.unit || "unit")} on ${purchaseDateLabel}? The next restock date updates immediately.`,
      confirmLabel: "Delete purchase",
      onConfirm: async () => {
        const { item: updatedItem, deletedPurchase, index } = await hootApi.deletePurchase(item.id, targetPurchase.id);
        render();
        const prediction = predictionFor(updatedItem);
        const nextRestockMsg = prediction
          ? ` Next restock ${formatFullDate(prediction.date)}.`
          : "";
        toast(`Purchase on ${purchaseDateLabel} removed.${nextRestockMsg}`, "success", {
          label: "Undo",
          onAction: async () => {
            const restoredItem = await hootApi.restorePurchase(updatedItem.id, deletedPurchase, index);
            render();
            const restoredPrediction = predictionFor(restoredItem);
            const restoredMsg = restoredPrediction
              ? ` Next restock ${formatFullDate(restoredPrediction.date)}.`
              : "";
            toast(`Purchase restored.${restoredMsg}`);
          },
        });
      },
    });
    if (trigger instanceof HTMLElement) lastDialogTrigger = trigger;
  }

  function requestReset(trigger) {
    openConfirm({
      title: "Reset the demo?",
      message: "This restores the built-in sample items and clears local changes.",
      confirmLabel: "Reset demo",
      onConfirm: async () => {
        await hootApi.resetDemo();
        currentItemId = null;
        itemReturnView = "dashboard";
        queueSearch = "";
        $("#queue-search").value = "";
        render();
        setView("dashboard");
        toast("Demo data restored.");
      },
    });
    if (trigger instanceof HTMLElement) lastDialogTrigger = trigger;
  }

  function bindEvents() {
    $$(".nav-button").forEach((button) => {
      button.addEventListener("click", () => setView(button.dataset.view));
    });

    document.addEventListener("click", (event) => {
      const target = event.target;
      const viewButton = target.closest("[data-view]");
      if (viewButton) {
        setView(viewButton.dataset.view);
        return;
      }

      const dialogTrigger = target.closest("[data-dialog]");
      if (dialogTrigger) {
        const name = dialogTrigger.dataset.dialog;
        if (name === "add-item") {
          prepareAddItemDialog(currentView === "one-time");
          showDialog($("#add-item-dialog"), dialogTrigger);
        } else if (name === "log-purchase") {
          if (prepareLogPurchaseDialog()) showDialog($("#log-purchase-dialog"), dialogTrigger);
        }
        return;
      }

      const closeButton = target.closest("[data-close]");
      if (closeButton) {
        const dialog = closeButton.closest("dialog");
        const form = dialog?.querySelector("form");
        if (form?.getAttribute("aria-busy") !== "true") closeDialog(dialog);
        return;
      }

      const actionButton = target.closest("[data-action]");
      if (!actionButton) return;
      const action = actionButton.dataset.action;
      const itemId = actionButton.dataset.id;

      if (action === "clear-search") {
        queueSearch = "";
        const searchInput = $("#queue-search");
        searchInput.value = "";
        renderDashboard();
        searchInput.focus();
      } else if (action === "add-item") {
        prepareAddItemDialog(false);
        showDialog($("#add-item-dialog"), actionButton);
      } else if (action === "add-one-time") {
        prepareAddItemDialog(true);
        showDialog($("#add-item-dialog"), actionButton);
      } else if (action === "detail") {
        openDetail(itemId, actionButton);
      } else if (action === "log") {
        if (prepareLogPurchaseDialog(itemId)) {
          showDialog($("#log-purchase-dialog"), actionButton);
        }
      } else if (action === "log-last") {
        if (prepareLogPurchaseDialog(itemId, { repeatLast: true })) {
          showDialog($("#log-purchase-dialog"), actionButton);
        }
      } else if (action === "edit") {
        prepareEditItemDialog(itemId);
        showDialog($("#edit-item-dialog"), actionButton);
      } else if (action === "delete") {
        requestDelete(itemId, actionButton);
      } else if (action === "edit-purchase") {
        const purchaseId = actionButton.dataset.purchaseId;
        if (prepareEditPurchaseDialog(itemId, purchaseId)) {
          showDialog($("#edit-purchase-dialog"), actionButton);
        }
      } else if (action === "delete-purchase") {
        const purchaseId = actionButton.dataset.purchaseId;
        requestDeletePurchase(itemId, purchaseId, actionButton);
      } else if (action === "toggle-run-item") {
        toggleShoppingRunItem(itemId, actionButton);
      } else if (action === "adjust-run-item") {
        adjustShoppingRunItem(itemId, actionButton);
      } else if (action === "undo-run-item") {
        undoShoppingRunItem(itemId, actionButton);
      } else if (action === "finish-run") {
        finishShoppingRun(actionButton);
      } else if (action === "finish-run-done") {
        completeShoppingRun();
      } else if (action === "finish-run-history") {
        completeShoppingRun({ openHistory: true });
      } else if (action === "toggle-watch-items") {
        toggleWatchItems(actionButton);
      }
    });

    document.addEventListener("change", async (event) => {
      const input = event.target.closest('[data-action="toggle-one-time"]');
      if (!input) return;
      const item = await hootApi.toggleOneTime(input.dataset.id, input.checked);
      render();
      toast(item.completed ? `${item.name} checked off.` : `${item.name} restored.`);
    });

    $$('input[name="itemType"]').forEach((input) => {
      input.addEventListener("change", () => {
        const isOneTime = input.value === "one-time";
        updateAddItemTypeState(isOneTime);
        setFormStatus($("#add-item-form"), "");
        const thresholdInput = $("#add-threshold");
        thresholdInput.removeAttribute("aria-invalid");
        $("#add-threshold-error").textContent = "";
      });
    });

    $("#queue-search").addEventListener("input", (event) => {
      queueSearch = event.currentTarget.value;
      renderDashboard();
    });

    $$("[data-calendar-range]").forEach((button) => {
      button.addEventListener("click", () => {
        const range = Number(button.dataset.calendarRange);
        if (range === calendarRange) return;
        calendarRange = range;
        renderRestockCalendar();
      });
    });

    $("#add-item-form").addEventListener("submit", submitAddItem);
    $("#log-purchase-form").addEventListener("submit", submitLogPurchase);
    $("#edit-item-form").addEventListener("submit", submitEditItem);
    $("#edit-purchase-form").addEventListener("submit", submitEditPurchase);
    $("#reset-demo").addEventListener("click", (event) => requestReset(event.currentTarget));

    $("#finish-run-dialog").addEventListener("close", () => {
      pendingRunReceipt = null;
    });

    $("#confirm-action").addEventListener("click", async () => {
      const action = pendingConfirm;
      pendingConfirm = null;
      closeDialog($("#confirm-dialog"));
      if (action) await action();
    });

    $$("dialog").forEach((dialog) => {
      dialog.addEventListener("cancel", (event) => {
        const form = dialog.querySelector("form");
        if (form?.getAttribute("aria-busy") === "true") event.preventDefault();
      });

      dialog.addEventListener("close", () => {
        const form = dialog.querySelector("form");
        if (form) {
          setFormBusy(form, false);
          setFormStatus(form, "");
        }

        if (lastDialogTrigger instanceof HTMLElement) {
          lastDialogTrigger.focus({ preventScroll: true });
        }
        lastDialogTrigger = null;
      });
    });
  }

  function init() {
    if (!state.items.length) state = createDemoState();
    bindEvents();
    initNextUpObserver();
    render();
    setView(currentView);
  }

  init();
})();

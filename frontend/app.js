import {
  DAY_MS,
  EARLY_RESTOCK_SHIFT_DAYS,
  addDays,
  depletionFor,
  likelyWindowFor,
  parseDate,
  predictionFor,
  rhythmDriftFor,
  startOfDay,
  toISODate,
} from "./prediction.js";
import { DEMO_SAMPLES, createDemoStateFor } from "./demo-data.js";
import {
  buildShoppingRun,
  groupShoppingRun,
  groupShoppingRunByDue,
  shoppingRunSummary,
} from "./store-run.js";

(() => {
  "use strict";

  const STORAGE_KEY = "hoot-demo-state-v1";
  const DEFAULT_TITLE = "Hoot — Predictive Household Inventory Tracker";

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

  const SAMPLE_IDS = new Set(DEMO_SAMPLES.map((sample) => sample.id));
  const normalizeSampleId = (value) => (SAMPLE_IDS.has(value) ? value : "starter");
  const sampleFor = (value) =>
    DEMO_SAMPLES.find((sample) => sample.id === normalizeSampleId(value)) ?? DEMO_SAMPLES[0];

  const today = startOfDay();

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

  function formatMoneyExact(value) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
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

  function purchaseUnitPrice(purchase) {
    if (isUnknownPurchasePrice(purchase.price)) return null;
    const quantity = Number(purchase.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) return null;
    return Number(purchase.price) / quantity;
  }

  function formatUnitPrice(purchase, item) {
    const unitPrice = purchaseUnitPrice(purchase);
    if (unitPrice === null) return "Price unknown";
    return `${formatMoney(unitPrice)} / ${item.unit || "unit"}`;
  }

  function spendingFor(item) {
    const purchases = [...item.purchases].sort(
      (left, right) => parseDate(left.date) - parseDate(right.date),
    );
    const priced = purchases.filter((purchase) => purchaseUnitPrice(purchase) !== null);
    const total = priced.reduce((sum, purchase) => sum + Number(purchase.price), 0);
    const latest = priced[priced.length - 1] ?? null;
    const previous = priced[priced.length - 2] ?? null;
    const latestUnit = latest ? purchaseUnitPrice(latest) : null;
    const previousUnit = previous ? purchaseUnitPrice(previous) : null;
    const history = priced.map((purchase) => ({
      date: parseDate(purchase.date),
      unitPrice: purchaseUnitPrice(purchase),
    }));

    return {
      purchases: purchases.length,
      pricedCount: priced.length,
      total,
      average: priced.length ? total / priced.length : null,
      latest,
      previous,
      latestUnit,
      previousUnit,
      history,
      change:
        latestUnit !== null && previousUnit !== null ? latestUnit - previousUnit : null,
    };
  }

  function priceSparkline(item, history) {
    const width = 240;
    const height = 44;
    const padX = 4;
    const padY = 6;
    const prices = history.map((entry) => entry.unitPrice);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min;
    const start = history[0].date.getTime();
    const end = history[history.length - 1].date.getTime();
    const span = end - start;
    const unit = item.unit || "unit";
    const points = history.map((entry, index) => {
      const x =
        span > 0
          ? padX + ((entry.date.getTime() - start) / span) * (width - padX * 2)
          : padX + (index / Math.max(1, history.length - 1)) * (width - padX * 2);
      const y =
        range === 0
          ? height / 2
          : padY + (1 - (entry.unitPrice - min) / range) * (height - padY * 2);
      return {
        x: Number(x.toFixed(1)),
        y: Number(y.toFixed(1)),
        date: entry.date,
        unitPrice: entry.unitPrice,
      };
    });
    const line = points.map((point) => `${point.x},${point.y}`).join(" ");
    const buttons = points
      .map((point, index) => {
        const dateLabel = formatFullDate(point.date);
        const priceLabel = `${formatMoney(point.unitPrice)} / ${unit}`;
        const ariaLabel = `${dateLabel}: ${formatMoney(point.unitPrice)} per ${unit}`;
        return `
          <button
            class="price-spark-point${index === points.length - 1 ? " is-latest" : ""}"
            type="button"
            data-price-spark-point
            data-date="${escapeHtml(dateLabel)}"
            data-price="${escapeHtml(priceLabel)}"
            tabindex="${index === points.length - 1 ? "0" : "-1"}"
            aria-label="${escapeHtml(ariaLabel)}"
            style="left: ${((point.x / width) * 100).toFixed(2)}%; top: ${(
              (point.y / height) *
              100
            ).toFixed(2)}%"
          ><span class="price-spark-dot" aria-hidden="true"></span></button>`;
      })
      .join("");
    const rangeLabel =
      min === max ? formatMoney(min) : `${formatMoney(min)}–${formatMoney(max)}`;

    return `
      <div class="price-spark" data-price-spark>
        <div class="price-spark-head">
          <span class="price-spark-title">Unit price history</span>
          <span class="price-spark-range">${rangeLabel}</span>
        </div>
        <div class="price-spark-plot" data-price-spark-plot>
          <svg class="price-spark-svg" viewBox="0 0 ${width} ${height}" aria-hidden="true" focusable="false">
            <polyline class="price-spark-line" points="${line}"></polyline>
          </svg>
          <div
            class="price-spark-points"
            role="group"
            aria-label="Unit price history for ${escapeHtml(item.name)}"
          >
            ${buttons}
          </div>
        </div>
        <p class="price-spark-readout" data-price-spark-readout>Select a point for its date and price.</p>
        <div class="price-spark-foot">
          <span>${formatDate(history[0].date)}</span>
          <span>${formatDate(history[history.length - 1].date)}</span>
        </div>
      </div>
    `;
  }

  function selectPricePoint(point) {
    const spark = point.closest("[data-price-spark]");
    if (!spark) return;

    $$("[data-price-spark-point]", spark).forEach((candidate) => {
      const selected = candidate === point;
      candidate.classList.toggle("is-active", selected);
      candidate.tabIndex = selected ? 0 : -1;
    });

    const readout = $("[data-price-spark-readout]", spark);
    if (!readout) return;
    readout.textContent = `${point.dataset.date} · ${point.dataset.price}`;
    readout.classList.add("is-active");
  }

  function selectNearestPricePoint(plot, event) {
    const points = $$("[data-price-spark-point]", plot);
    if (!points.length) return;

    const plotRect = plot.getBoundingClientRect();
    const pointerX = event.clientX - plotRect.left;
    const pointerY = event.clientY - plotRect.top;
    let nearest = null;
    let nearestDistance = Infinity;

    points.forEach((point) => {
      const pointRect = point.getBoundingClientRect();
      const pointX = pointRect.left + pointRect.width / 2 - plotRect.left;
      const pointY = pointRect.top + pointRect.height / 2 - plotRect.top;
      const distance = Math.hypot(pointX - pointerX, pointY - pointerY);
      if (distance < nearestDistance) {
        nearest = point;
        nearestDistance = distance;
      }
    });

    if (!nearest) return;
    selectPricePoint(nearest);
    nearest.focus({ preventScroll: true });
  }

  function gapComparison(gap, prediction) {
    if (prediction.maturity === "learning") return "Only gap so far";
    const typical = prediction.averageInterval;
    if (!typical) return "Measured gap";
    const difference = Math.round(gap - typical);
    if (difference === 0) return "Matches your typical gap";
    const days = Math.abs(difference);
    return `${days} ${days === 1 ? "day" : "days"} ${
      difference > 0 ? "longer" : "shorter"
    } than typical`;
  }

  function gapSpace(days) {
    return Math.max(24, Math.min(72, Math.round(days * 3)));
  }

  function purchaseActionButtons(item, purchase) {
    const labelDate = formatFullDate(parseDate(purchase.date));
    return `
      <div class="rhythm-actions">
        <button
          class="btn btn-secondary btn-sm"
          type="button"
          data-action="edit-purchase"
          data-id="${escapeHtml(item.id)}"
          data-purchase-id="${escapeHtml(purchase.id)}"
          aria-label="Edit purchase on ${escapeHtml(labelDate)}"
        >Edit</button>
        <button
          class="btn btn-ghost btn-sm rhythm-delete-btn"
          type="button"
          data-action="delete-purchase"
          data-id="${escapeHtml(item.id)}"
          data-purchase-id="${escapeHtml(purchase.id)}"
          aria-label="Delete purchase on ${escapeHtml(labelDate)}"
        >Delete</button>
      </div>
    `;
  }

  function createDemoState(sampleId = "starter") {
    return createDemoStateFor(sampleId);
  }

  function loadState() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.items)) return null;
      parsed.sample = normalizeSampleId(parsed.sample);
      return parsed;
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
  const AISLE_ORDER_KEY = "hoot-demo-aisle-order-v1";

  function loadAisleOrder() {
    try {
      const raw = window.localStorage.getItem(AISLE_ORDER_KEY);
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((c) => typeof c === "string") : [];
    } catch {
      return [];
    }
  }

  function saveAisleOrder(order) {
    try {
      if (order && order.length) {
        window.localStorage.setItem(AISLE_ORDER_KEY, JSON.stringify(order));
      } else {
        window.localStorage.removeItem(AISLE_ORDER_KEY);
      }
    } catch {
      // Storage unavailable
    }
  }

  let aisleOrder = loadAisleOrder();
  const DENSITY_KEY = "hoot-demo-density-v1";
  const PLANS_KEY = "hoot-demo-plans-v1";
  const MONTH_DAYS = 30;
  const WEEK_DAYS = 7;

  function loadDensity() {
    try {
      return window.localStorage.getItem(DENSITY_KEY) === "dense" ? "dense" : "spacious";
    } catch {
      return "spacious";
    }
  }

  function loadStoreRun() {
    try {
      const raw = window.localStorage.getItem(STORE_RUN_KEY);
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;

      const selected = new Map(Array.isArray(parsed.selected) ? parsed.selected : []);
      const skippedIds = Array.isArray(parsed.skippedIds)
        ? [...new Set(parsed.skippedIds.filter((id) => typeof id === "string"))].filter(
            (id) => !selected.has(id),
          )
        : [];
      const outOfStockIds = Array.isArray(parsed.outOfStockIds)
        ? [...new Set(parsed.outOfStockIds.filter((id) => typeof id === "string"))].filter(
            (id) => !selected.has(id),
          )
        : [];
      const lastSkippedId = typeof parsed.lastSkippedId === "string" ? parsed.lastSkippedId : null;

      return {
        runDate: typeof parsed.runDate === "string" ? parsed.runDate : null,
        includeWatch: Boolean(parsed.includeWatch),
        selected,
        extraIds: new Set(
          Array.isArray(parsed.extraIds)
            ? parsed.extraIds.filter((id) => typeof id === "string")
            : [],
        ),
        skippedIds,
        outOfStockIds,
        lastSkippedId,
        earlyRestocks:
          parsed.earlyRestocks && typeof parsed.earlyRestocks === "object"
            ? parsed.earlyRestocks
            : {},
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
          runDate: storeRun.runDate,
          includeWatch: storeRun.includeWatch,
          selected: Array.from(storeRun.selected.entries()),
          extraIds: Array.from(storeRun.extraIds),
          skippedIds: storeRun.skippedIds,
          outOfStockIds: storeRun.outOfStockIds || [],
          lastSkippedId: storeRun.lastSkippedId ?? null,
          earlyRestocks: storeRun.earlyRestocks || {},
        }),
      );
    } catch {
      // Ignore storage failures; the in-memory run still works.
    }
  }

  function loadPlans() {
    try {
      const raw = window.localStorage.getItem(PLANS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter(
          (plan) => plan && typeof plan.date === "string" && Array.isArray(plan.itemIds),
        )
        .map((plan) => ({
          id: typeof plan.id === "string" ? plan.id : makeId("plan"),
          date: plan.date,
          itemIds: plan.itemIds.filter((id) => typeof id === "string"),
          includeWatch: Boolean(plan.includeWatch),
          createdAt: typeof plan.createdAt === "string" ? plan.createdAt : plan.date,
          earlyRestocks:
            plan.earlyRestocks && typeof plan.earlyRestocks === "object"
              ? plan.earlyRestocks
              : {},
        }));
    } catch {
      return [];
    }
  }

  function savePlans() {
    try {
      window.localStorage.setItem(PLANS_KEY, JSON.stringify(plans));
    } catch {
      // Ignore storage failures; plans still work in memory.
    }
  }

  function clearPlans() {
    plans = [];
    openCalendarDay = null;
    try {
      window.localStorage.removeItem(PLANS_KEY);
    } catch {
      // Ignore storage failures; the in-memory plans still clear.
    }
  }

  const OUT_OF_STOCK_TODAY_KEY = "hoot-demo-oos-today-v1";

  function loadOutOfStockToday() {
    try {
      const raw = window.localStorage.getItem(OUT_OF_STOCK_TODAY_KEY);
      const parsed = JSON.parse(raw);
      return new Set(Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : []);
    } catch {
      return new Set();
    }
  }

  function saveOutOfStockToday() {
    try {
      if (outOfStockTodayIds.size) {
        window.localStorage.setItem(OUT_OF_STOCK_TODAY_KEY, JSON.stringify([...outOfStockTodayIds]));
      } else {
        window.localStorage.removeItem(OUT_OF_STOCK_TODAY_KEY);
      }
    } catch {}
  }

  let outOfStockTodayIds = loadOutOfStockToday();

  function markOutOfStockToday(itemId) {
    outOfStockTodayIds.add(itemId);
    saveOutOfStockToday();
  }

  function clearOutOfStockToday(itemId) {
    if (outOfStockTodayIds.delete(itemId)) {
      saveOutOfStockToday();
    }
  }

  function isOutOfStockToday(itemId) {
    if (storeRun && storeRun.outOfStockIds && storeRun.outOfStockIds.includes(itemId)) return true;
    return outOfStockTodayIds.has(itemId);
  }

  let state = loadState() ?? createDemoState();
  let storeRun = loadStoreRun() ?? {
    runDate: null,
    includeWatch: false,
    selected: new Map(),
    extraIds: new Set(),
    skippedIds: [],
    outOfStockIds: [],
    lastSkippedId: null,
    earlyRestocks: {},
  };
  let plans = loadPlans();
  let runOrder = "due";
  let currentView = "dashboard";
  let currentItemId = null;
  let itemReturnView = "dashboard";
  let editingItemId = null;
  let lastDialogTrigger = null;
  let pendingConfirm = null;
  let pendingConfirmDismiss = null;
  let queueSearch = "";
  const DASHBOARD_VIEW_KEY = "hoot-demo-dashboard-view-v1";
  let density = loadDensity();
  let dashboardView = loadDashboardView();
  let steadyFoldExpanded = false;
  let calendarRange = typeof window !== "undefined" && window.innerWidth <= 660 ? 7 : MONTH_DAYS;
  let openCalendarDay = null;
  let gravityHorizon = 3;
  let dayPanelDate = null;
  let dayPanelExtraIds = new Set();
  let dayPanelSelection = new Set();
  let pendingRunReceipt = null;
  let addToTripSearch = "";
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
        ...(purchase.earlyRestock ? { earlyRestock: true } : {}),
        ...(purchase.effectiveStartDate ? { effectiveStartDate: purchase.effectiveStartDate } : {}),
      });
      item.purchases.sort((left, right) => parseDate(left.date) - parseDate(right.date));
      clearOutOfStockToday(id);
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
      if (input.earlyRestock !== undefined) purchase.earlyRestock = input.earlyRestock;
      if (input.effectiveStartDate !== undefined) purchase.effectiveStartDate = input.effectiveStartDate;
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
      if (completed) clearOutOfStockToday(id);
      saveState();
      return clone(item);
    },
    async resetDemo() {
      state = createDemoState(normalizeSampleId(state.sample));
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
    const shouldHide =
      currentView === "item" || (currentView === "dashboard" && nextUpCardVisible);
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

  function syncRunHeaderState() {
    const view = $("#view-store-run");
    if (!view) return;

    // A single threshold can fight scroll anchoring: the header collapse shifts the
    // focused row just enough to cross the threshold again. Separate the directions.
    const condensed = view.classList.contains("is-header-condensed");
    if (!condensed && window.scrollY > 48) {
      view.classList.add("is-header-condensed");
    } else if (condensed && window.scrollY < 16) {
      view.classList.remove("is-header-condensed");
    }
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

  function syncDensityControls() {
    $$(".density-toggle [data-density]").forEach((button) => {
      const isActive = button.dataset.density === density;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
  }

  function loadDashboardView() {
    try {
      const stored = window.localStorage.getItem(DASHBOARD_VIEW_KEY);
      return stored === "calendar" || stored === "shelves" ? stored : "list";
    } catch {
      return "list";
    }
  }

  function syncDashboardViewControls() {
    $$("[data-dashboard-view-option]").forEach((button) => {
      const isActive = button.dataset.dashboardViewOption === dashboardView;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
    const dashboard = $("#view-dashboard");
    if (dashboard) dashboard.dataset.dashboardView = dashboardView;
    document.body.dataset.dashboardView = dashboardView;

    const copy = $("#dashboard-copy");
    if (copy) {
      copy.textContent =
        dashboardView === "shelves"
          ? "Staples organized by household area."
          : "The next item to decide, then the rest of your staples.";
    }
  }

  function setDashboardView(value) {
    const next = value === "calendar" || value === "shelves" ? value : "list";
    if (next === dashboardView) return;
    dashboardView = next;
    try {
      window.localStorage.setItem(DASHBOARD_VIEW_KEY, dashboardView);
    } catch {
      // The in-memory preference still applies when storage is unavailable.
    }
    syncDashboardViewControls();
    if (dashboardView === "calendar") {
      renderRestockCalendar();
    } else if (dashboardView === "shelves") {
      renderShelves();
    }
  }

  function setDensity(value) {
    const next = value === "dense" ? "dense" : "spacious";
    if (next === density) return;
    density = next;
    steadyFoldExpanded = false;
    document.body.dataset.density = density;
    try {
      window.localStorage.setItem(DENSITY_KEY, density);
    } catch {
      // The in-memory preference still applies when storage is unavailable.
    }
    syncDensityControls();
    renderDashboard();
  }

  function renderStats() {
    const tracked = state.items.filter((item) => !item.isOneTime);
    const oneTime = state.items.filter((item) => item.isOneTime);
    const predictions = tracked.map((item) => predictionFor(item));
    const attention = predictions.filter((prediction) => prediction.daysUntil <= 3).length;
    const established = tracked.filter((item) => item.purchases.length >= 3).length;
    const itemDrifts = tracked.map(rhythmDriftFor).filter(Boolean);
    const clockworkCount = itemDrifts.filter((d) => d.trend === "clockwork").length;
    const driftingCount = itemDrifts.filter((d) => d.isDrifting).length;
    const learningCount = itemDrifts.filter((d) => d.trend === "learning").length;

    $("#stat-tracked").textContent = String(tracked.length);
    $("#stat-attention").textContent = String(attention);
    $("#stat-established").textContent = String(established);
    $("#stat-one-time").textContent = String(oneTime.length);

    const rhythmHealthEl = $("#stat-rhythm-health");
    const rhythmSubEl = $("#stat-rhythm-sub");
    if (rhythmHealthEl) {
      rhythmHealthEl.textContent = `${clockworkCount} clockwork`;
    }
    if (rhythmSubEl) {
      rhythmSubEl.textContent = driftingCount > 0 ? `${driftingCount} drifting · Audit` : `${learningCount} learning · Audit`;
    }
  }

  function horizonPositionFor(daysUntil, compact = false) {
    const buyNowEnd = compact ? 53.571 : 50.0;
    const watchEnd = compact ? 71.429 : 69.048;

    if (daysUntil < 0) {
      const progress = Math.max(0, (daysUntil + 7) / 7);
      return 4 + progress * (33.333 - 4);
    }
    if (daysUntil <= 3) {
      const progress = daysUntil / 3;
      return 33.333 + progress * (buyNowEnd - 33.333);
    }
    if (daysUntil <= 7) {
      const progress = (daysUntil - 3) / 4;
      return buyNowEnd + progress * (watchEnd - buyNowEnd);
    }
    const progress = Math.min(1, (daysUntil - 7) / 7);
    return watchEnd + progress * (96.0 - watchEnd);
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

  function restockHeading(prediction) {
    return prediction.maturity === "learning" ? "Estimated restock" : "Next predicted restock";
  }

  function learningCue(prediction) {
    if (!prediction || prediction.maturity !== "learning") return "";
    const progress =
      prediction.purchaseCount === 0
        ? "No purchases yet"
        : `${prediction.purchaseCount} of 3 purchases`;
    // At 320px the full phrase wraps the chip onto its own row and pushes the primary action below the fold.
    // Keep the compact form to progress and source; the horizon group already carries the full sentence.
    const compactProgress = `${prediction.purchaseCount} of 3`;
    const compactSource = prediction.method.replace(/\s+estimate$/i, "");
    return `<p class="next-up-estimate"><span class="status-chip status-learning">Learning</span><span class="next-up-cue-full">${escapeHtml(progress)} · ${escapeHtml(prediction.method)}</span><span class="next-up-cue-compact">${escapeHtml(compactProgress)} · ${escapeHtml(compactSource)}</span></p>`;
  }

  function restockHorizonLane(item, prediction) {
    const position = horizonPositionFor(prediction.daysUntil);
    const compactPosition = horizonPositionFor(prediction.daysUntil, true);
    const label = formatHorizonPointerLabel(prediction.daysUntil);
    const align = position < 12 ? "left" : position > 88 ? "right" : "center";
    const heading = restockHeading(prediction);
    const confidence =
      prediction.maturity === "learning"
        ? `${prediction.confidence}. ${prediction.method}.`
        : prediction.confidence;

    return `
      <div
        class="restock-horizon horizon-${escapeHtml(prediction.zone)}"
        role="group"
        aria-label="${escapeHtml(item.name)} is in the ${escapeHtml(prediction.statusLabel)} zone. ${escapeHtml(heading)} ${formatFullDate(prediction.date)}, ${formatDue(prediction.daysUntil)}. ${escapeHtml(confidence)}"
      >
        <div class="horizon-summary">
          <div>
            <span>${escapeHtml(heading)}</span>
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
          <span
            class="horizon-pointer"
            data-align="${align}"
            style="--zone-pointer-position:${position.toFixed(2)}%; --zone-pointer-position-compact:${compactPosition.toFixed(2)}%"
          >
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

  function renderDepletionGaugeHtml(depletion, compact = false) {
    if (!depletion) return "";
    const fillWidth = depletion.status === "overdue" ? 100 : depletion.percentRemaining;
    return `
      <div class="depletion-gauge${compact ? " is-compact" : ""}" role="meter" aria-valuenow="${depletion.percentRemaining}" aria-valuemin="0" aria-valuemax="100" aria-label="${escapeHtml(depletion.phrase)}">
        <div class="depletion-track">
          <div class="depletion-fill is-${escapeHtml(depletion.status)}" style="width: ${fillWidth}%;"></div>
        </div>
        <span class="depletion-label">${escapeHtml(depletion.phrase)}</span>
      </div>
    `;
  }

  function nextUpCard(item, prediction) {
    const unitText = item.unit ? ` · ${escapeHtml(item.unit)}` : "";
    const logLastButton = item.purchases.length
      ? `<button class="btn btn-secondary" type="button" data-action="log-last" data-id="${escapeHtml(item.id)}">Log last</button>`
      : "";
    const stillHaveSomeButton =
      prediction.zone === "overdue" && item.purchases.length
        ? `<button class="btn btn-secondary" type="button" data-action="still-have-some" data-id="${escapeHtml(item.id)}">Still have some</button>`
        : "";

    return `
      <article class="item-card horizon-${escapeHtml(prediction.zone)}" data-item-id="${escapeHtml(item.id)}">
        <div class="item-card-header">
          <div class="next-up-meta">
            <span class="next-up-label">Next up</span>
            <span class="status-chip status-${escapeHtml(prediction.zone)}">${escapeHtml(prediction.statusLabel)}</span>
            ${isOutOfStockToday(item.id) ? '<span class="status-chip status-oos">Out of stock</span>' : ""}
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
            ${learningCue(prediction)}
          </div>
        </div>
        ${restockHorizonLane(item, prediction)}
        ${renderDepletionGaugeHtml(depletionFor(item))}
        <div class="item-card-footer">
          <div class="item-actions">
            <button class="btn btn-primary" type="button" data-action="log" data-id="${escapeHtml(item.id)}">Log purchase</button>
            ${stillHaveSomeButton}
            ${logLastButton}
            <button class="btn btn-secondary" type="button" data-action="detail" data-id="${escapeHtml(item.id)}" aria-label="Details for ${escapeHtml(item.name)}">Details</button>
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
          ${isOutOfStockToday(item.id) ? '<span class="status-chip status-oos">Out of stock</span>' : ""}
          ${renderDepletionGaugeHtml(depletionFor(item), true)}
        </div>
        <strong class="item-row-due">${formatFullDate(prediction.date)}</strong>
        <div class="item-row-actions">
          <button class="btn btn-secondary" type="button" data-action="log" data-id="${escapeHtml(item.id)}">Log purchase</button>
          <button class="btn btn-ghost" type="button" data-action="detail" data-id="${escapeHtml(item.id)}" aria-label="Details for ${escapeHtml(item.name)}">Details</button>
        </div>
      </article>
    `;
  }

  function steadyFold(entries) {
    const count = entries.length;
    const itemWord = count === 1 ? "item" : "items";
    const heading = steadyFoldExpanded
      ? `${count} steady ${itemWord} shown`
      : `${count} steady ${itemWord} folded away`;

    return `
      <div class="steady-fold">
        <div class="steady-fold-summary">
          <div class="steady-fold-copy">
            <span class="status-chip status-steady">Steady</span>
            <strong>${heading}</strong>
            <span>Not due for at least a week. Still tracked.</span>
          </div>
          <button
            class="steady-fold-button"
            type="button"
            data-action="toggle-steady-fold"
            aria-expanded="${steadyFoldExpanded}"
            aria-controls="steady-fold-items"
          >
            <span>${steadyFoldExpanded ? "Hide steady items" : "Show steady items"}</span>
            <span class="steady-fold-chevron" aria-hidden="true"></span>
          </button>
        </div>
        <div
          class="steady-fold-items"
          id="steady-fold-items"
          ${steadyFoldExpanded ? "" : "hidden"}
        >
          ${
            steadyFoldExpanded
              ? entries.map(({ item, prediction }) => itemRow(item, prediction)).join("")
              : ""
          }
        </div>
      </div>
    `;
  }

  function renderDashboard() {
    const rawSearchTerm = queueSearch.trim();
    const searchTerm = rawSearchTerm.toLowerCase();
    const tracked = rankedTrackedEntries();

    const container = $("#dashboard-list");
    const queueTools = $("#queue-tools");
    const searchField = $("#queue-search-field");
    const hasTrackedItems = state.items.some((item) => !item.isOneTime);
    if (queueTools) queueTools.hidden = !hasTrackedItems;
    searchField.hidden = !hasTrackedItems;

    if (!hasTrackedItems) {
      container.innerHTML = `
          <div class="empty-state">
            <h2>No tracked items yet</h2>
            <p>Add a household staple and Hoot will start learning its restock rhythm.</p>
            <button class="btn btn-primary" type="button" data-action="add-item">Add your first item</button>
          </div>
        `;
      syncNextUpDock();
      return;
    }

    const [nextUp, ...remainingItems] = tracked;
    const focusedCard = nextUpCard(nextUp.item, nextUp.prediction);

    if (!searchTerm) {
      const dense = density === "dense";
      const steadyEntries = dense
        ? remainingItems.filter(({ prediction }) => prediction.zone === "steady")
        : [];
      const queueEntries = dense
        ? remainingItems.filter(({ prediction }) => prediction.zone !== "steady")
        : remainingItems;
      const queueRows = queueEntries
        .map(({ item, prediction }) => itemRow(item, prediction))
        .join("");

      container.innerHTML = `
        ${focusedCard}
        ${
          queueEntries.length || steadyEntries.length
            ? `<div class="item-list">${queueRows}${
                steadyEntries.length ? steadyFold(steadyEntries) : ""
              }</div>`
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
    if (range === MONTH_DAYS) return "thirty";
    return range === 7 ? "seven" : "fourteen";
  }

  function syncCalendarRangeControls() {
    $$("[data-calendar-range]").forEach((button) => {
      const isSelected = Number(button.dataset.calendarRange) === calendarRange;
      button.classList.toggle("is-active", isSelected);
      button.setAttribute("aria-pressed", String(isSelected));
    });
  }

  function startOfWeek(date) {
    const copy = startOfDay(date);
    copy.setDate(copy.getDate() - copy.getDay());
    return copy;
  }

  function planForDate(date) {
    const iso = toISODate(date);
    return plans.find((plan) => plan.date === iso) ?? null;
  }

  function monthDayEntries(date) {
    const iso = toISODate(date);
    const tracked = state.items
      .filter((item) => !item.isOneTime)
      .map((item) => ({ item, prediction: predictionFor(item) }))
      .filter(({ prediction }) => prediction);

    const due = tracked
      .filter(({ prediction }) => toISODate(prediction.date) === iso)
      .sort((left, right) => left.item.name.localeCompare(right.item.name));

    if (iso !== toISODate(today)) return due;

    const overdue = tracked
      .filter(({ prediction }) => prediction.daysUntil < 0)
      .sort((left, right) => left.prediction.daysUntil - right.prediction.daysUntil);
    return [...overdue, ...due.filter(({ prediction }) => prediction.daysUntil >= 0)];
  }

  
  function monthDaySynergyEntries(date, horizonDays = gravityHorizon) {
    if (date < today) return [];
    const dayEntries = monthDayEntries(date);
    const dayItemIds = new Set(dayEntries.map(({ item }) => item.id));

    const startDate = addDays(date, 1);
    const endDate = addDays(date, horizonDays);

    const tracked = state.items
      .filter((item) => !item.isOneTime)
      .map((item) => ({ item, prediction: predictionFor(item) }))
      .filter(({ prediction }) => prediction && prediction.daysUntil >= 0);

    return tracked
      .filter(({ item, prediction }) => {
        if (dayItemIds.has(item.id)) return false;
        const predDate = parseDate(prediction.date);
        return predDate >= startDate && predDate <= endDate;
      })
      .map(({ item, prediction }) => {
        const predDate = parseDate(prediction.date);
        const daysAfter = Math.round((predDate - date) / DAY_MS);
        return { item, prediction, daysAfter };
      })
      .sort((a, b) => a.daysAfter - b.daysAfter || a.item.name.localeCompare(b.item.name));
  }

  function calendarDayZone(entries) {
    for (const zone of ["overdue", "buy-now", "watch", "steady"]) {
      if (entries.some(({ prediction }) => prediction.zone === zone)) return zone;
    }
    return "";
  }

  function monthDayCell(date, { namesLimit, isOpen }) {
    const iso = toISODate(date);
    const entries = monthDayEntries(date);
    const plan = planForDate(date);
    const zone = calendarDayZone(entries);
    const isToday = iso === toISODate(today);
    const isPast = date < today;
    const synergy = !isPast ? monthDaySynergyEntries(date, 3) : [];
    const hasSynergy = synergy.length > 0;
    const isInteractive = !isPast && Boolean(entries.length || plan || hasSynergy);
    const visible = entries.slice(0, namesLimit);
    const more = entries.length - visible.length;
    const countLabel = entries.length
      ? `, ${entries.length} item${entries.length === 1 ? "" : "s"}`
      : "";
    const label = `${formatFullDate(date)}${countLabel}${plan ? ", planned trip" : ""}`;
    const classes = [
      "calendar-day",
      "calendar-day--month",
      isToday ? "is-today" : "",
      isPast ? "is-past" : "",
      entries.length || plan || hasSynergy ? "" : "is-empty",
      hasSynergy ? "has-synergy" : "",
      zone ? `horizon-${zone}` : "",
    ]
      .filter(Boolean)
      .join(" ");

    const body = `
      <span class="calendar-day-today">${formatWeekday(date)}</span>
      <span class="calendar-day-number">${date.getDate()}</span>
      ${
        visible.length
          ? `<span class="calendar-day-names">${visible
              .map(
                ({ item, prediction }) =>
                  `<span class="calendar-day-name horizon-${escapeHtml(prediction.zone)}"><span class="calendar-day-dot" aria-hidden="true"></span><span class="calendar-day-text">${escapeHtml(item.name)}</span></span>`,
              )
              .join("")}</span>`
          : ""
      }
      ${more > 0 ? `<span class="calendar-day-more">+${more} more</span>` : ""}
      ${plan ? `<span class="calendar-plan-chip">Planned</span>` : ""}
      ${hasSynergy && !plan ? `<span class="calendar-synergy-indicator" title="${synergy.length} nearby restocks align with this day" aria-label="${synergy.length} synergy restocks"></span>` : ""}
    `;

    const toggle = isInteractive
      ? `<button class="calendar-day-toggle" type="button" data-action="toggle-calendar-day" data-date="${iso}" aria-expanded="${isOpen ? "true" : "false"}"${isOpen ? ' aria-controls="calendar-day-panel"' : ""} aria-label="${escapeHtml(label)}">${body}</button>`
      : `<div class="calendar-day-toggle is-static"${isPast ? ' aria-hidden="true"' : ""}>${body}</div>`;

    return `<div class="${classes}">${toggle}</div>`;
  }

  function initDayPanel(iso) {
    dayPanelDate = iso;
    dayPanelExtraIds.clear();
    const date = parseDate(iso);
    const plan = planForDate(date);
    const entries = monthDayEntries(date);
    if (plan && plan.itemIds) {
      dayPanelSelection = new Set(plan.itemIds);
    } else {
      dayPanelSelection = new Set(entries.map(({ item }) => item.id));
    }
  }

  function getDayPanelRoster(date) {
    const iso = toISODate(date);
    const plan = planForDate(date);
    const entries = monthDayEntries(date);
    const rosterMap = new Map();

    for (const entry of entries) {
      rosterMap.set(entry.item.id, entry);
    }

    if (plan) {
      for (const id of plan.itemIds) {
        if (!rosterMap.has(id)) {
          const item = state.items.find((entry) => entry.id === id);
          if (item && !item.isOneTime) {
            rosterMap.set(id, { item, prediction: predictionFor(item) });
          }
        }
      }
    }

    if (dayPanelDate === iso) {
      for (const id of dayPanelExtraIds) {
        if (!rosterMap.has(id)) {
          const item = state.items.find((entry) => entry.id === id);
          if (item && !item.isOneTime) {
            rosterMap.set(id, { item, prediction: predictionFor(item) });
          }
        }
      }
    }

    return Array.from(rosterMap.values()).filter(({ prediction }) => prediction);
  }

  function calendarDayPanel(date) {
    const iso = toISODate(date);
    if (dayPanelDate !== iso) {
      initDayPanel(iso);
    }
    const roster = getDayPanelRoster(date);
    const plan = planForDate(date);
    const zone = calendarDayZone(monthDayEntries(date));
    const zoneClass = zone ? ` horizon-${zone}` : "";
    const isPast = date < today;
    const count = dayPanelSelection.size;
    const totalCount = roster.length;
    const startText = `Start trip with ${count} ${count === 1 ? "item" : "items"}`;

    const rosterIds = new Set(roster.map(({ item }) => item.id));
    const earlierItems = state.items
      .filter((item) => !item.isOneTime && !rosterIds.has(item.id))
      .map((item) => ({ item, prediction: predictionFor(item) }))
      .filter(({ prediction }) => prediction && toISODate(prediction.date) < iso);

    const planNames = plan
      ? plan.itemIds
          .map((itemId) => state.items.find((item) => item.id === itemId))
          .filter(Boolean)
      : [];
    const planItemsText = plan
      ? planNames.length
        ? `${planNames
            .slice(0, 4)
            .map((item) => item.name)
            .join(", ")}${planNames.length > 4 ? ` and ${planNames.length - 4} more` : ""}`
        : "No items yet. Resume the plan and add what you need."
      : "";

    return `
      <section class="calendar-day-panel${zoneClass}" id="calendar-day-panel" role="region" aria-labelledby="calendar-day-panel-title">
        <header class="calendar-day-panel-head">
          <div>
            <h3 id="calendar-day-panel-title" tabindex="-1">${formatFullDate(date)}</h3>
            <p class="calendar-day-panel-selection">${count} of ${totalCount} ${totalCount === 1 ? "item" : "items"} selected${plan ? " · planned trip" : ""}</p>
          </div>
          <button class="btn btn-ghost btn-sm" type="button" data-action="close-calendar-day">Close day</button>
        </header>
        ${
          isPast
            ? ""
            : `<div class="calendar-day-panel-actions">
                <button class="btn btn-primary" type="button" data-action="start-run-date" data-date="${iso}">${startText}</button>
                <button class="btn btn-secondary" type="button" data-action="save-plan-date" data-date="${iso}">${plan ? "Update plan" : "Save plan"}</button>
              </div>`
        }
        ${
          !isPast && earlierItems.length
            ? `<div class="calendar-day-panel-earlier">
                <button class="btn btn-secondary btn-sm" type="button" data-action="add-earlier-due" data-date="${iso}">Add ${earlierItems.length} due earlier</button>
              </div>`
            : ""
        }
        ${
          roster.length
            ? `<ul class="calendar-day-panel-list">${roster
                .map(
                  ({ item, prediction }) => `
              <li class="calendar-plan-row">
                <label class="calendar-plan-choice">
                  <input type="checkbox" data-action="toggle-plan-item" data-id="${escapeHtml(item.id)}" ${dayPanelSelection.has(item.id) ? "checked" : ""}>
                  <span class="calendar-plan-choice-text">
                    <strong>${escapeHtml(item.name)}</strong>
                    <span class="calendar-day-panel-meta">
                      <span class="status-chip status-${escapeHtml(prediction.zone)}">${escapeHtml(prediction.statusLabel)}</span>
                      <small>${escapeHtml(formatDue(prediction.daysUntil))}</small>
                    </span>
                  </span>
                </label>
                <button class="btn btn-ghost btn-sm calendar-plan-detail" type="button" data-action="detail" data-id="${escapeHtml(item.id)}">Details</button>
              </li>`,
                )
                .join("")}</ul>`
            : `<p class="calendar-day-panel-empty">No restocks land on this date.</p>`
        }
        ${
          !isPast && monthDaySynergyEntries(date, gravityHorizon).length
            ? (() => {
                const synergyItems = monthDaySynergyEntries(date, gravityHorizon);
                const count = synergyItems.length;
                return `
                  <div class="calendar-day-synergy" id="calendar-day-synergy">
                    <div class="calendar-synergy-header">
                      <div>
                        <h4 id="calendar-synergy-heading">Trip synergy</h4>
                        <p>${count} ${count === 1 ? "restock" : "restocks"} due in the next ${gravityHorizon} days</p>
                      </div>
                      <div class="calendar-synergy-horizon" role="group" aria-label="Synergy look-ahead">
                        <button type="button" class="btn btn-ghost btn-sm ${gravityHorizon === 2 ? "is-active" : ""}" data-action="set-gravity-horizon" data-days="2">+2d</button>
                        <button type="button" class="btn btn-ghost btn-sm ${gravityHorizon === 3 ? "is-active" : ""}" data-action="set-gravity-horizon" data-days="3">+3d</button>
                        <button type="button" class="btn btn-ghost btn-sm ${gravityHorizon === 5 ? "is-active" : ""}" data-action="set-gravity-horizon" data-days="5">+5d</button>
                      </div>
                    </div>
                    <ul class="calendar-synergy-list" aria-labelledby="calendar-synergy-heading">
                      ${synergyItems
                        .map(
                          ({ item, prediction, daysAfter }) => `
                        <li class="calendar-synergy-row">
                          <div class="calendar-synergy-info">
                            <strong>${escapeHtml(item.name)}</strong>
                            <span class="status-chip status-${escapeHtml(prediction.zone)}">${escapeHtml(prediction.statusLabel)}</span>
                            <small>Due ${formatWeekday(prediction.date)} (+${daysAfter}d)</small>
                          </div>
                          <button class="btn btn-secondary btn-sm" type="button" data-action="add-synergy-item" data-id="${escapeHtml(item.id)}" data-due="${escapeHtml(toISODate(prediction.date))}">
                            Sweep into trip
                          </button>
                        </li>
                      `,
                        )
                        .join("")}
                    </ul>
                    <div class="calendar-synergy-actions">
                      <button class="btn btn-secondary btn-sm" type="button" data-action="sweep-all-synergy" data-date="${iso}">
                        Sweep all ${count} into trip
                      </button>
                    </div>
                  </div>
                `;
              })()
            : ""
        }
        ${
          plan
            ? `<div class="calendar-day-plan">
                <div class="calendar-day-plan-copy">
                  <p><strong>Saved plan</strong> · ${planNames.length} ${planNames.length === 1 ? "item" : "items"}</p>
                  <p class="calendar-day-plan-items">${escapeHtml(planItemsText)}</p>
                </div>
                <div class="calendar-day-plan-actions">
                  <button class="btn btn-secondary btn-sm" type="button" data-action="resume-plan" data-plan-id="${escapeHtml(plan.id)}">Resume plan</button>
                  <button class="btn btn-ghost btn-sm" type="button" data-action="delete-plan" data-plan-id="${escapeHtml(plan.id)}">Delete plan</button>
                </div>
              </div>`
            : ""
        }
      </section>
    `;
  }

  function hideCalendarBrief() {
    for (const selector of ["#calendar-brief", "#calendar-plans"]) {
      const element = $(selector);
      if (!element) continue;
      element.hidden = true;
      element.replaceChildren();
    }
  }

  function renderCalendarPlansOnly() {
    const brief = $("#calendar-brief");
    if (brief) {
      brief.hidden = true;
      brief.replaceChildren();
    }
    const plansBlock = $("#calendar-plans");
    if (!plansBlock) return;
    const upcomingPlans = plans
      .filter((plan) => parseDate(plan.date) >= today)
      .sort((left, right) => left.date.localeCompare(right.date));
    plansBlock.hidden = upcomingPlans.length === 0;
    plansBlock.innerHTML = upcomingPlans.length
      ? `<span class="calendar-plans-label">Saved plans</span>
        <ul class="calendar-plans-list">
          ${upcomingPlans
            .map((plan) => {
              const count = plan.itemIds.filter((itemId) =>
                state.items.some((item) => item.id === itemId),
              ).length;
              return `<li><button class="calendar-plan-link" type="button" data-action="open-calendar-day" data-date="${escapeHtml(plan.date)}">
                <strong>${escapeHtml(formatDate(parseDate(plan.date)))}</strong>
                <small>${count ? `${count} ${count === 1 ? "item" : "items"}` : "No items yet"}</small>
              </button></li>`;
            })
            .join("")}
        </ul>`
      : "";
  }

  function renderCalendarBrief() {
    const brief = $("#calendar-brief");
    const plansBlock = $("#calendar-plans");
    if (!brief || !plansBlock) return;

    const tracked = state.items
      .filter((item) => !item.isOneTime)
      .map((item) => ({ item, prediction: predictionFor(item) }))
      .filter(({ prediction }) => prediction);
    const overdue = tracked.filter(({ prediction }) => prediction.daysUntil < 0);
    const inMonth = tracked.filter(
      ({ prediction }) => prediction.daysUntil >= 0 && prediction.daysUntil < MONTH_DAYS,
    );
    const monthEntries = [...overdue, ...inMonth];
    const dueDays = new Set(
      monthEntries.map(({ prediction }) =>
        prediction.daysUntil < 0 ? toISODate(today) : toISODate(prediction.date),
      ),
    );
    const upcomingPlans = plans
      .filter((plan) => parseDate(plan.date) >= today)
      .sort((left, right) => left.date.localeCompare(right.date));
    const zoneCounts = { overdue: 0, "buy-now": 0, watch: 0, steady: 0 };
    for (const { prediction } of monthEntries) {
      if (prediction.zone in zoneCounts) zoneCounts[prediction.zone] += 1;
    }

    brief.hidden = false;
    brief.innerHTML = `
      <p class="calendar-brief-summary">
        ${
          monthEntries.length
            ? `<strong>${monthEntries.length}</strong> ${monthEntries.length === 1 ? "restock" : "restocks"} across <strong>${dueDays.size}</strong> ${dueDays.size === 1 ? "day" : "days"}`
            : "Nothing is due in the next thirty days"
        }
        ${
          upcomingPlans.length
            ? `<span aria-hidden="true">·</span> <strong>${upcomingPlans.length}</strong> ${upcomingPlans.length === 1 ? "planned trip" : "planned trips"}`
            : ""
        }
      </p>
      ${
        monthEntries.length
          ? `<ul class="calendar-legend" aria-label="Status counts for these thirty days">${[
              ["overdue", "Overdue"],
              ["buy-now", "Buy now"],
              ["watch", "Watch"],
              ["steady", "Steady"],
            ]
              .map(
                ([zone, label]) =>
                  `<li><span class="calendar-legend-dot horizon-${zone}" aria-hidden="true"></span>${label} <strong>${zoneCounts[zone]}</strong></li>`,
              )
              .join("")}</ul>`
          : ""
      }
    `;

    plansBlock.hidden = upcomingPlans.length === 0;
    plansBlock.innerHTML = upcomingPlans.length
      ? `<span class="calendar-plans-label">Saved plans</span>
        <ul class="calendar-plans-list">
          ${upcomingPlans
            .map((plan) => {
              const count = plan.itemIds.filter((itemId) =>
                state.items.some((item) => item.id === itemId),
              ).length;
              return `<li><button class="calendar-plan-link" type="button" data-action="open-calendar-day" data-date="${escapeHtml(plan.date)}">
                <strong>${escapeHtml(formatDate(parseDate(plan.date)))}</strong>
                <small>${count ? `${count} ${count === 1 ? "item" : "items"}` : "No items yet"}</small>
              </button></li>`;
            })
            .join("")}
        </ul>`
      : "";
  }

  function renderMonthCalendar() {
    const container = $("#restock-calendar");
    const weekStart = startOfWeek(today);
    const lastDate = addDays(today, MONTH_DAYS - 1);
    const weeks =
      Math.round((startOfWeek(lastDate) - weekStart) / (DAY_MS * WEEK_DAYS)) + 1;
    const namesLimit = window.matchMedia("(min-width: 1121px)").matches ? 2 : 1;
    const rows = [];

    for (let week = 0; week < weeks; week += 1) {
      const cells = [];
      let openHere = false;

      for (let day = 0; day < WEEK_DAYS; day += 1) {
        const date = addDays(weekStart, week * WEEK_DAYS + day);
        const isOpen = openCalendarDay === toISODate(date);
        if (isOpen) openHere = true;
        cells.push(monthDayCell(date, { namesLimit, isOpen }));
      }

      rows.push(`<div class="calendar-week">${cells.join("")}</div>`);
      if (openHere) rows.push(calendarDayPanel(parseDate(openCalendarDay)));
    }

    container.innerHTML = rows.join("");
  }

  const WEEK_ITEM_LIMIT = 4;

  function renderRestockCalendar() {
    const tracked = state.items
      .filter((item) => !item.isOneTime)
      .map((item) => ({ item, prediction: predictionFor(item) }));
    const container = $("#restock-calendar");
    const rangeWord = calendarRangeWord(calendarRange);
    const rangeLabel = `Expected restocks for the next ${rangeWord} days`;

    $("#calendar-caption").textContent = `${rangeLabel}.`;
    container.setAttribute("aria-label", rangeLabel);
    container.removeAttribute("data-card-count");
    syncCalendarRangeControls();

    if (!tracked.length) {
      hideCalendarBrief();
      container.innerHTML = `<p class="calendar-empty">Add a tracked item to build its restock calendar.</p>`;
      return;
    }

    if (calendarRange === MONTH_DAYS) {
      container.classList.add("is-month");
      container.removeAttribute("role");
      renderCalendarBrief();
      renderMonthCalendar();
      return;
    }

    renderCalendarPlansOnly();
    container.classList.remove("is-month");
    container.setAttribute("role", "list");

    const overdue = tracked.filter(({ prediction }) => prediction.daysUntil < 0);
    const dayCards = Array.from({ length: calendarRange }, (_, index) => {
      const date = addDays(today, index);
      const dueItems = tracked.filter(
        ({ prediction }) => toISODate(prediction.date) === toISODate(date),
      );
      const visibleItems = dueItems.slice(0, WEEK_ITEM_LIMIT);
      const hiddenCount = dueItems.length - visibleItems.length;
      const items = visibleItems.length
        ? visibleItems.map(({ item, prediction }) => calendarItemButton(item, prediction)).join("")
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
          ${hiddenCount ? `<p class="calendar-more">+${hiddenCount} more due</p>` : ""}
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
            ${overdue.slice(0, WEEK_ITEM_LIMIT).map(({ item, prediction }) => calendarItemButton(item, prediction)).join("")}
          </ul>
          ${overdue.length > WEEK_ITEM_LIMIT ? `<p class="calendar-more">+${overdue.length - WEEK_ITEM_LIMIT} more due</p>` : ""}
        </li>
      `
      : "";

    container.dataset.cardCount = String(dayCards.length + (overdue.length ? 1 : 0));
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
          <p>Use this list for birthday candles, packing tape, or anything that should not enter the prediction model.</p>
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
          <button class="btn btn-ghost" type="button" data-action="detail" data-id="${escapeHtml(item.id)}" aria-label="Details for ${escapeHtml(item.name)}">Details</button>
        </article>
      `,
      )
      .join("");
  }

  function isRunItemSkipped(itemId) {
    return storeRun.skippedIds.includes(itemId) || Boolean(storeRun.outOfStockIds && storeRun.outOfStockIds.includes(itemId));
  }

  function runRosterEntries() {
    const roster = new Map();

    const runReferenceDate = storeRun.runDate ? parseDate(storeRun.runDate) : today;
    const isFutureRun = runReferenceDate.getTime() > today.getTime();

    if (storeRun.runDate) {
      for (const id of storeRun.extraIds) {
        const item = state.items.find((candidate) => candidate.id === id);
        if (!item) continue;
        if (item.isOneTime && item.completed && !storeRun.selected.has(id)) continue;
        const prediction = item.isOneTime ? null : predictionFor(item, runReferenceDate);
        roster.set(id, {
          item,
          type: item.isOneTime ? "one-time" : "tracked",
          priority: item.isOneTime ? 4 : (prediction?.daysUntil < 0 ? 1 : (prediction?.zone === "buy-now" ? 2 : 3)),
          prediction,
        });
      }
    } else {
      for (const entry of buildShoppingRun(state.items, {
        includeWatch: storeRun.includeWatch,
        referenceDate: runReferenceDate,
        includeOneTime: !isFutureRun,
      })) {
        roster.set(entry.item.id, entry);
      }

      for (const extraId of storeRun.extraIds) {
        if (roster.has(extraId)) continue;
        const item = state.items.find((candidate) => candidate.id === extraId);
        if (!item) continue;
        if (item.isOneTime && item.completed && !storeRun.selected.has(extraId)) continue;

        roster.set(extraId, {
          item,
          type: item.isOneTime ? "one-time" : "tracked",
          priority: 4,
        });
      }
    }

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

    return [...roster.values()];
  }

  function runItemStatus(item) {
    if (item.isOneTime) return "Checklist";
    return predictionFor(item, today)?.statusLabel ?? "Steady";
  }

  function addToTripCandidates() {
    const shownIds = new Set(
      runRosterEntries()
        .filter((entry) => !isRunItemSkipped(entry.item.id))
        .map((entry) => entry.item.id),
    );

    return state.items
      .filter((item) => {
        if (item.isOneTime && item.completed) return false;
        if (storeRun.selected.has(item.id)) return false;
        return !shownIds.has(item.id);
      })
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  function renderStoreRunRow(entry, { showCategory = false } = {}) {
    const { item } = entry;
    const isLogged = storeRun.selected.has(item.id);

    if (isLogged) {
      const selection = storeRun.selected.get(item.id);
      const purchase = selection?.purchaseId
        ? item.purchases.find((entry) => entry.id === selection.purchaseId)
        : null;
      let logDetail = "";
      if (purchase) {
        logDetail = ` · ${formatQuantity(purchase.quantity, item.unit)} · ${formatPurchasePrice(purchase.price)}`;
      } else if (item.isOneTime) {
        logDetail = " · Checklist";
      }

      return `
        <article class="store-run-row is-in-cart" data-item-id="${escapeHtml(item.id)}" aria-label="${escapeHtml(item.name)} logged this trip">
          <span class="run-check" aria-hidden="true">
            <svg viewBox="0 0 16 16" focusable="false"><path d="M3.5 8.4l2.9 2.9 6.1-6.6" /></svg>
          </span>
          <div class="store-run-row-main">
            <strong>${escapeHtml(item.name)}</strong>
            <small>Logged${escapeHtml(logDetail)}</small>
          </div>
          <div class="store-run-row-cart-actions">
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
        </article>
      `;
    }

    const prediction = item.isOneTime ? null : predictionFor(item, today);
    const zone = prediction ? prediction.zone : "learning";
    const statusLabel = prediction ? prediction.statusLabel : "Checklist";
    const timing = prediction ? formatDue(prediction.daysUntil) : "One-time need";
    const unitText = item.unit ? `${escapeHtml(item.unit)} · ` : "";
    const categoryText =
      showCategory && item.category
        ? `<span class="store-run-category">${escapeHtml(item.category)} · </span>`
        : "";

    return `
      <article class="store-run-row horizon-${escapeHtml(zone)}" data-item-id="${escapeHtml(item.id)}">
        <div class="store-run-row-main">
          <div class="store-run-row-heading">
            <strong>${escapeHtml(item.name)}</strong>
            <span class="status-chip status-${escapeHtml(zone)}">${escapeHtml(statusLabel)}</span>
          </div>
          <div class="store-run-row-meta">
            <small>${categoryText}<span class="store-run-unit">${unitText}</span>${escapeHtml(timing)}</small>
            <div class="store-run-row-skips">
              <button
                class="btn btn-ghost btn-sm store-run-oos"
                type="button"
                data-action="oos-run-item"
                data-id="${escapeHtml(item.id)}"
                aria-label="Out of stock for ${escapeHtml(item.name)}"
              >Out of stock</button>
              <button
                class="btn btn-ghost btn-sm store-run-skip"
                type="button"
                data-action="skip-run-item"
                data-id="${escapeHtml(item.id)}"
                aria-label="Not this trip for ${escapeHtml(item.name)}"
              >Not this trip</button>
            </div>
          </div>
        </div>
        <button
          class="btn btn-primary"
          type="button"
          data-action="toggle-run-item"
          data-id="${escapeHtml(item.id)}"
          aria-label="Log ${escapeHtml(item.name)}"
        >Log</button>
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
      if (prediction) details.push(`${prediction.maturity === "learning" ? "Estimated restock" : "Next restock"} ${formatDate(prediction.date)}`);
    }

    return details.join(" · ");
  }

  function renderStoreRunSkipped() {
    const container = $("#store-run-skipped");
    if (!container) return [];

    const skipped = (storeRun.skippedIds || [])
      .map((itemId) => state.items.find((item) => item.id === itemId))
      .filter(Boolean);
    const outOfStock = (storeRun.outOfStockIds || [])
      .map((itemId) => state.items.find((item) => item.id === itemId))
      .filter(Boolean);

    const allSkipped = [...skipped, ...outOfStock];

    if (!allSkipped.length) {
      container.hidden = true;
      container.replaceChildren();
      return [];
    }

    const formatNames = (items) => {
      const names = items.map((item) => item.name);
      const visibleNames = names.slice(0, 3);
      let label = visibleNames.join(", ");
      if (names.length > 3) {
        label += ` and ${names.length - 3} more`;
      } else if (names.length > 1) {
        label = `${visibleNames.slice(0, -1).join(", ")} and ${visibleNames[visibleNames.length - 1]}`;
      }
      return label;
    };

    let summaryHtml = "";
    if (outOfStock.length && skipped.length) {
      summaryHtml = `<span>Unavailable</span> <strong>${escapeHtml(formatNames(outOfStock))} (out of stock)</strong> · <span>Skipped</span> <strong>${escapeHtml(formatNames(skipped))}</strong>`;
    } else if (outOfStock.length) {
      summaryHtml = `<span>Out of stock</span> <strong>${escapeHtml(formatNames(outOfStock))}</strong>`;
    } else {
      summaryHtml = `<span>Skipped this trip</span> <strong>${escapeHtml(formatNames(skipped))}</strong>`;
    }

    const last =
      (storeRun.lastSkippedId && allSkipped.find((item) => item.id === storeRun.lastSkippedId)) ||
      allSkipped[allSkipped.length - 1];

    container.hidden = false;
    container.innerHTML = `
      <p>${summaryHtml}</p>
      <button
        class="btn btn-ghost btn-sm"
        type="button"
        data-action="undo-skip-run-item"
        data-id="${escapeHtml(last.id)}"
        aria-label="Undo skipping ${escapeHtml(last.name)}"
      >${allSkipped.length > 1 ? "Undo last" : "Undo"}</button>
    `;

    return allSkipped;
  }

  function renderStoreRunCart(entries) {
    const cart = $("#store-run-cart");
    const selectedEntries = entries
      .filter((entry) => storeRun.selected.has(entry.item.id))
      .map((entry) => ({ ...entry, selection: storeRun.selected.get(entry.item.id) }));

    const countLabel = `${selectedEntries.length} of ${entries.length} picked`;

    const cartActions = `
      <div class="store-run-cart-heading-actions">
        <button
          class="btn btn-secondary btn-sm"
          type="button"
          data-action="save-trip-plan"
          aria-label="Save the items left as a plan"
        >Save the items left</button>
        <button
          class="btn btn-ghost btn-sm"
          type="button"
          data-action="discard-trip"
          aria-label="Discard this trip"
        >Discard this trip</button>
      </div>
    `;

    if (!selectedEntries.length) {
      const hasDraft = entries.length > 0;
      cart.innerHTML = `
        <header class="store-run-cart-header">
          <div class="store-run-cart-heading">
            <h2>This trip</h2>
            <span>${countLabel}</span>
          </div>
          ${cartActions}
        </header>
        <div class="store-run-cart-empty">
          <strong>${hasDraft ? "Nothing logged yet" : "Nothing to pick yet"}</strong>
          <p>${hasDraft
            ? "The list is the trip. Tap Log on each item as you pick it up."
            : "Logged items will appear here when the run has something to pick."}</p>
        </div>
      `;
      return;
    }

    cart.innerHTML = `
      <header class="store-run-cart-header">
        <div class="store-run-cart-heading">
          <h2>This trip</h2>
          <span>${countLabel}</span>
        </div>
        ${cartActions}
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
    syncRunOrderControls();

    const runReferenceDate = storeRun.runDate ? parseDate(storeRun.runDate) : today;
    const subtitle = $("#store-run-subtitle");
    if (subtitle) {
      subtitle.textContent = storeRun.runDate
        ? `Shopping for ${formatFullDate(parseDate(storeRun.runDate))}. Log each item as you pick it up.`
        : runOrder === "aisle"
          ? "Log each item as you pick it up. Aisles first, urgency second."
          : "Log each item as you pick it up. Sorted by what's due next.";
    }

    const entries = runRosterEntries().filter((entry) => !isRunItemSkipped(entry.item.id));
    const groups =
      runOrder === "aisle"
        ? groupShoppingRun(entries, aisleOrder)
        : groupShoppingRunByDue(entries, runReferenceDate);

    const aisleBtn = $("#store-run-aisle-order-btn");
    if (aisleBtn) aisleBtn.hidden = runOrder !== "aisle" || groups.length === 0;
    const summary = shoppingRunSummary(entries, new Set(storeRun.selected.keys()));

    $("#store-run-summary").innerHTML = `
      <article><span>Items</span><strong>${summary.total}</strong></article>
      <article><span>Logged</span><strong>${summary.inCart}</strong></article>
      <article><span>Left</span><strong>${summary.remaining}</strong></article>
    `;

    const toolbar = $(".store-run-toolbar");
    if (toolbar) toolbar.hidden = groups.length === 0;

    const skippedItems = renderStoreRunSkipped();
    const emptyPanel = $("#store-run-empty");
    if (emptyPanel) {
      const isEmpty = groups.length === 0;
      emptyPanel.hidden = !isEmpty;
      if (!isEmpty) {
        emptyPanel.replaceChildren();
      }
      if (isEmpty) {
        const watchEntries = storeRun.includeWatch
          ? []
          : buildShoppingRun(state.items, {
              includeWatch: true,
              referenceDate: today,
            });
        const hasWatchRecovery = !storeRun.includeWatch && watchEntries.length > 0;
        const hasSkipped = skippedItems.length > 0;
        const message = hasSkipped
          ? "Undo a skip above, add something else, or leave the run for later."
          : storeRun.includeWatch
            ? "Nothing is due or on Watch right now."
            : hasWatchRecovery
              ? "The run drafts overdue and buy-now staples, plus one-time needs. Watch items stay hidden until you show them."
              : "The run drafts overdue and buy-now staples, plus one-time needs. Nothing on Watch is due either.";
        emptyPanel.innerHTML = `
          <h2>${hasSkipped ? "Everything left is skipped" : "Nothing is due right now"}</h2>
          <p>${message}</p>
          <div class="store-run-empty-actions">
            ${hasWatchRecovery ? `<button class="btn btn-secondary" type="button" data-action="toggle-watch-items" data-watch-style="long">Include Watch items</button>` : ""}
            <button class="btn btn-secondary" type="button" data-action="open-add-to-trip">Add to this trip</button>
            <button class="btn btn-ghost" type="button" data-view="dashboard">Back to dashboard</button>
          </div>
        `;
      }
    }

    view.classList.toggle("is-trip-empty", summary.inCart === 0);

    $("#store-run-groups").innerHTML = groups
      .map(
        (group) => `
        <section class="store-run-group" aria-label="${escapeHtml(group.category)} ${runOrder === "aisle" ? "aisle" : "group"}">
          <h2>${escapeHtml(group.category)}</h2>
          <div class="store-run-group-items">
            ${group.entries.map((entry) => renderStoreRunRow(entry, { showCategory: runOrder === "due" })).join("")}
          </div>
        </section>
      `,
      )
      .join("");

    renderStoreRunCart(entries);

    const selectedIds = [...storeRun.selected.keys()];
    const lastSelectedId = selectedIds[selectedIds.length - 1] ?? "";
    const lastSelectedItem = state.items.find((item) => item.id === lastSelectedId);
    const undoLastButton = $(
      '.store-run-footer [data-action="undo-last-run-item"]',
    );
    if (undoLastButton) {
      undoLastButton.hidden = !lastSelectedId;
      if (lastSelectedId) {
        undoLastButton.dataset.id = lastSelectedId;
        undoLastButton.setAttribute(
          "aria-label",
          `Undo ${lastSelectedItem?.name ?? "last log"}`,
        );
      } else {
        delete undoLastButton.dataset.id;
        undoLastButton.setAttribute("aria-label", "Undo last log");
      }
    }

    const finishButton = $('.store-run-footer [data-action="finish-run"]');
    if (finishButton) finishButton.disabled = summary.inCart === 0;
  }

  function renderAddToTripOptions() {
    const list = $("#add-to-trip-list");
    if (!list) return;

    const term = addToTripSearch.trim().toLowerCase();
    const candidates = addToTripCandidates();
    const matches = term
      ? candidates.filter((item) => matchesQueueSearch(item, term))
      : candidates;

    if (!matches.length) {
      const message = candidates.length
        ? `No items match \u201C${addToTripSearch.trim()}\u201D.`
        : "Every item is already in this trip.";
      list.innerHTML = `
        <li class="add-to-trip-empty">
          <strong>${escapeHtml(message)}</strong>
          <span>${candidates.length ? "Try another name, category, or unit." : "Nothing else is available to add."}</span>
        </li>
      `;
      return;
    }

    list.innerHTML = matches
      .map((item) => {
        const meta = [item.category, item.unit, runItemStatus(item)]
          .filter(Boolean)
          .join(" · ");
        const accessibleLabel = `Add ${item.name} to this trip${meta ? `. ${meta}` : ""}`;
        return `
          <li>
            <button
              class="add-to-trip-option"
              type="button"
              data-action="add-run-extra"
              data-id="${escapeHtml(item.id)}"
              aria-label="${escapeHtml(accessibleLabel)}"
            >
              <span class="add-to-trip-option-text">
                <strong>${escapeHtml(item.name)}</strong>
                <small>${escapeHtml(meta)}</small>
              </span>
              <span class="add-to-trip-option-action" aria-hidden="true">Add</span>
            </button>
          </li>
        `;
      })
      .join("");
  }

  function openAddToTripDialog(trigger) {
    addToTripSearch = "";
    const search = $("#add-to-trip-search");
    if (search) search.value = "";
    renderAddToTripOptions();
    const list = $("#add-to-trip-list");
    if (list) list.scrollTop = 0;
    showDialog($("#add-to-trip-dialog"), trigger);
  }

  function focusRunRowItem(itemId) {
    if (!itemId) return false;
    const button = document.querySelector(
      `#store-run-groups .store-run-row[data-item-id="${CSS.escape(itemId)}"] [data-action="toggle-run-item"]`,
    );
    if (!button) return false;
    button.focus();
    return true;
  }

  function updateWatchToggle() {
    for (const button of $$('[data-action="toggle-watch-items"]')) {
      const longLabel = button.dataset.watchStyle === "long";
      button.textContent = storeRun.includeWatch
        ? longLabel
          ? "Remove Watch items"
          : "Remove Watch"
        : longLabel
          ? "Include Watch items"
          : "Include Watch";
      button.setAttribute(
        "aria-label",
        storeRun.includeWatch ? "Remove Watch items" : "Include Watch items",
      );
      button.setAttribute("aria-pressed", String(storeRun.includeWatch));
    }
  }

  function syncRunOrderControls() {
    for (const button of $$("[data-run-order]")) {
      const selected = button.dataset.runOrder === runOrder;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-pressed", String(selected));
    }
    const aisleBtn = $("#store-run-aisle-order-btn");
    if (aisleBtn) aisleBtn.hidden = runOrder !== "aisle";
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

  function nextRunRowItemId(itemId) {
    const rows = [...document.querySelectorAll("#store-run-groups .store-run-row")];
    const currentIndex = rows.findIndex((row) => row.dataset.itemId === itemId);
    if (currentIndex < 0) return null;

    const orderedRows = [
      ...rows.slice(currentIndex + 1),
      ...rows.slice(0, currentIndex),
    ];
    const nextRow = orderedRows.find((row) =>
      row.querySelector('[data-action="toggle-run-item"]'),
    );
    return nextRow?.dataset.itemId ?? null;
  }

  async function toggleShoppingRunItem(itemId, trigger) {
    const item = state.items.find((entry) => entry.id === itemId);
    if (!item || storeRun.selected.has(itemId)) return;

    const currentEntry = buildShoppingRun(state.items, {
      includeWatch: storeRun.includeWatch,
      referenceDate: today,
    }).find((candidate) => candidate.item.id === itemId);
    const priority = currentEntry?.priority ?? 4;
    const prediction = item.isOneTime ? null : predictionFor(item, today);

    try {
      if (item.isOneTime) {
        await hootApi.toggleOneTime(itemId, true);
        storeRun.selected.set(itemId, { type: "one-time", priority });
      } else {
        const latest = latestPurchaseFor(item);
        const isEarly = Boolean(storeRun.earlyRestocks?.[itemId]);
        const effectiveStartDate = isEarly ? storeRun.earlyRestocks[itemId] : null;

        const updatedItem = await hootApi.logPurchase(itemId, {
          date: toISODate(today),
          quantity: latest?.quantity ?? 1,
          price: latest?.price ?? null,
          earlyRestock: isEarly,
          effectiveStartDate: effectiveStartDate,
        });
        const createdPurchase = updatedItem.purchases[updatedItem.purchases.length - 1];
        if (!createdPurchase) throw new Error("Purchase not created");

        storeRun.selected.set(itemId, {
          type: "tracked",
          purchaseId: createdPurchase.id,
          priority,
          predictedDate: prediction ? toISODate(prediction.date) : null,
          earlyRestock: isEarly,
          effectiveStartDate: effectiveStartDate,
        });
      }

      const nextItemId = nextRunRowItemId(itemId);
      saveStoreRun();
      render();
      announceRun(
        `${item.name} logged. ${storeRun.selected.size} logged this trip.`,
      );
      if (!focusRunRowItem(nextItemId)) {
        focusNextRunRow(itemId);
      }
    } catch {
      toast(`Could not log ${item.name}. Try again.`, "error");
    }
  }

  function markStoreRunItemOutOfStock(itemId) {
    const item = state.items.find((entry) => entry.id === itemId);
    if (!item || storeRun.selected.has(itemId) || isRunItemSkipped(itemId)) return;

    const rowIds = [
      ...document.querySelectorAll("#store-run-groups .store-run-row:not(.is-in-cart)"),
    ].map((row) => row.dataset.itemId);
    const currentIndex = rowIds.indexOf(itemId);
    const nextId = currentIndex < 0 ? null : (rowIds[currentIndex + 1] ?? rowIds[currentIndex - 1]);

    if (!storeRun.outOfStockIds) storeRun.outOfStockIds = [];
    storeRun.outOfStockIds.push(itemId);
    storeRun.lastSkippedId = itemId;
    saveStoreRun();
    render();
    const count = storeRun.outOfStockIds.length;
    announceRun(
      `${item.name} marked out of stock. ${count} out of stock.`,
    );

    if (!focusRunRowItem(nextId)) {
      $('.store-run-skipped [data-action="undo-skip-run-item"]')?.focus();
    }
  }

  function skipShoppingRunItem(itemId) {
    const item = state.items.find((entry) => entry.id === itemId);
    if (!item || storeRun.selected.has(itemId) || isRunItemSkipped(itemId)) return;

    const rowIds = [
      ...document.querySelectorAll("#store-run-groups .store-run-row:not(.is-in-cart)"),
    ].map((row) => row.dataset.itemId);
    const currentIndex = rowIds.indexOf(itemId);
    const nextId = currentIndex < 0 ? null : (rowIds[currentIndex + 1] ?? rowIds[currentIndex - 1]);

    storeRun.skippedIds.push(itemId);
    storeRun.lastSkippedId = itemId;
    saveStoreRun();
    render();
    announceRun(
      `${item.name} skipped this trip. ${storeRun.skippedIds.length} skipped.`,
    );

    if (!focusRunRowItem(nextId)) {
      $('.store-run-skipped [data-action="undo-skip-run-item"]')?.focus();
    }
  }

  function undoSkipRunItem(itemId) {
    const skipIndex = storeRun.skippedIds.indexOf(itemId);
    const oosIndex = storeRun.outOfStockIds ? storeRun.outOfStockIds.indexOf(itemId) : -1;
    if (skipIndex === -1 && oosIndex === -1) return;
    const item = state.items.find((entry) => entry.id === itemId);

    if (skipIndex !== -1) {
      storeRun.skippedIds.splice(skipIndex, 1);
    } else if (oosIndex !== -1) {
      storeRun.outOfStockIds.splice(oosIndex, 1);
    }
    if (storeRun.lastSkippedId === itemId) {
      const allLeft = [...(storeRun.skippedIds || []), ...(storeRun.outOfStockIds || [])];
      storeRun.lastSkippedId = allLeft[allLeft.length - 1] ?? null;
    }
    saveStoreRun();
    render();
    const totalUnavailable = storeRun.skippedIds.length + (storeRun.outOfStockIds?.length ?? 0);
    announceRun(
      `${item?.name ?? "Item"} restored to this trip. ${totalUnavailable} skipped.`,
    );

    if (!focusRunRowItem(itemId)) {
      (
        $('.store-run-skipped [data-action="undo-skip-run-item"]') ??
        $('.store-run-actions [data-action="open-add-to-trip"]')
      )?.focus();
    }
  }

  function saveTripAsPlan() {
    const unloggedIds = runRosterEntries()
      .filter((entry) => !isRunItemSkipped(entry.item.id) && !storeRun.selected.has(entry.item.id))
      .map((entry) => entry.item.id);
    const planDate = storeRun.runDate || toISODate(today);
    const existing = plans.find((p) => p.date === planDate);
    const plan = {
      id: existing?.id ?? makeId("plan"),
      date: planDate,
      itemIds: unloggedIds,
      includeWatch: storeRun.includeWatch,
      createdAt: existing?.createdAt ?? toISODate(today),
    };
    plans = [...plans.filter((p) => p.date !== planDate), plan];
    savePlans();
    toast(`Saved ${unloggedIds.length} items left as a plan.`);
  }

  function requestDiscardTrip(trigger) {
    openConfirm({
      title: "Discard trip?",
      message: "This clears the active trip. Its plan stays on the calendar. Logged purchases stays in purchase history.",
      confirmLabel: "Discard trip",
      trigger,
      onConfirm: () => {
        storeRun = {
          runDate: null,
          includeWatch: false,
          selected: new Map(),
          extraIds: new Set(),
          skippedIds: [],
          outOfStockIds: [],
          lastSkippedId: null,
          earlyRestocks: {},
        };
        saveStoreRun();
        setView("dashboard");
        render();
        $("#dashboard-title")?.focus({ preventScroll: true });
        toast("Trip discarded.");
      },
    });
  }

  function renderCurrentTrip() {
    const slot = $("#current-trip-slot");
    if (!slot) return;

    const hasTrip = storeRun.selected.size > 0 || Boolean(storeRun.runDate) || (storeRun.extraIds && storeRun.extraIds.size > 0);
    if (!hasTrip) {
      slot.innerHTML = "";
      return;
    }

    const entries = runRosterEntries().filter((e) => !isRunItemSkipped(e.item.id));
    const total = entries.length;
    const inCart = storeRun.selected.size;
    const remaining = Math.max(0, total - inCart);
    const dateLabel = storeRun.runDate ? formatFullDate(parseDate(storeRun.runDate)) : "Today";

    slot.innerHTML = `
      <aside class="current-trip" aria-label="Trip in progress">
        <div class="current-trip-copy">
          <span class="current-trip-kicker">Trip in progress</span>
          <h2>Trip · ${escapeHtml(dateLabel)}</h2>
          <p>${inCart} of ${total} picked · ${remaining} left</p>
        </div>
        <div class="current-trip-actions">
          ${
            remaining === 0 && inCart > 0
              ? '<button class="btn btn-primary" type="button" data-action="finish-trip">Finish trip</button>'
              : '<button class="btn btn-primary" type="button" data-action="resume-trip">Resume trip</button>'
          }
          <button class="btn btn-secondary" type="button" data-action="discard-trip">Discard trip</button>
        </div>
      </aside>
    `;
  }

  function addRunExtra(itemId) {
    const item = state.items.find((entry) => entry.id === itemId);
    if (!item || storeRun.selected.has(itemId) || (item.isOneTime && item.completed)) return;

    const alreadyShown = runRosterEntries().some(
      (entry) => entry.item.id === itemId && !isRunItemSkipped(itemId),
    );
    if (alreadyShown) return;

    storeRun.extraIds.add(itemId);
    storeRun.skippedIds = storeRun.skippedIds.filter((id) => id !== itemId);
    if (storeRun.outOfStockIds) {
      storeRun.outOfStockIds = storeRun.outOfStockIds.filter((id) => id !== itemId);
    }
    if (storeRun.lastSkippedId === itemId) {
      const allLeft = [...(storeRun.skippedIds || []), ...(storeRun.outOfStockIds || [])];
      storeRun.lastSkippedId = allLeft[allLeft.length - 1] ?? null;
    }
    addItemToPlannedRun(itemId);
    saveStoreRun();

    lastDialogTrigger = null;
    closeDialog($("#add-to-trip-dialog"));
    render();
    announceRun(`${item.name} added to this trip. Not logged.`);

    if (!focusRunRowItem(itemId)) {
      $('.store-run-actions [data-action="open-add-to-trip"]')?.focus();
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
        `${item.name} ${selection.type === "one-time" ? "restored" : "removed from this trip"}. ${
          storeRun.selected.size
        } logged this trip.`,
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
      skippedCount: storeRun.skippedIds.length,
      outOfStockCount: (storeRun.outOfStockIds || []).length,
      outOfStockItems: (storeRun.outOfStockIds || [])
        .map((id) => state.items.find((item) => item.id === id))
        .filter(Boolean),
    };
  }

  function purchaseCheckEntries(item) {
    const purchases = [...item.purchases].sort(
      (left, right) => parseDate(left.date) - parseDate(right.date),
    );
    const latestPurchaseId = purchases[purchases.length - 1]?.id ?? null;
    const current = [];
    const superseded = [];

    for (const purchase of purchases) {
      let feedback = purchase.feedback;
      if (!feedback) continue;

      if (purchase.id === latestPurchaseId) current.push({ purchase, feedback });
      else superseded.push({ purchase, feedback });

      while (feedback.previousFeedback) {
        feedback = feedback.previousFeedback;
        superseded.push({ purchase, feedback });
      }
    }

    return { current, superseded };
  }

  function checkRecordedDate(entry) {
    const value = entry.feedback.recordedAt || entry.purchase.date;
    if (!value) return null;
    const date = parseDate(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function predictionCheckSummary(item) {
    const { current, superseded } = purchaseCheckEntries(item);
    const checks = [...current, ...superseded]
      .map((entry) => entry.feedback)
      .filter((feedback) => feedback?.verdict === "right" || feedback?.verdict === "early");
    if (!checks.length) return "None yet";

    const right = checks.filter((feedback) => feedback.verdict === "right").length;
    const early = checks.length - right;
    return early ? `${right} right · ${early} still had some` : `${right} right`;
  }

  function activeNextUpCorrection(item) {
    const purchase = latestPurchaseFor(item);
    const feedback = purchase?.feedback;
    if (
      !purchase ||
      feedback?.source !== "next-up" ||
      feedback?.verdict !== "early"
    ) {
      return null;
    }
    return { purchase, feedback };
  }

  function restoreNextUpCorrection(itemId, purchaseId) {
    const item = state.items.find((entry) => entry.id === itemId);
    const latestPurchase = item ? latestPurchaseFor(item) : null;
    const purchase = item?.purchases.find((entry) => entry.id === purchaseId);
    if (!item || !purchase || latestPurchase?.id !== purchase.id) return null;
    if (purchase.feedback?.source !== "next-up") return null;

    if (purchase.feedback.previousFeedback) {
      purchase.feedback = clone(purchase.feedback.previousFeedback);
    } else {
      delete purchase.feedback;
    }
    saveState();
    return item;
  }

  function predictionCheckMarkup(item, purchase, predictedDate) {
    const verdict = purchase?.feedback?.verdict;
    const next = predictionFor(item, today);
    const result =
      verdict === "early"
        ? `Still had some · next estimate moved to ${formatDate(next.date)}`
        : verdict === "right"
          ? `Right · next estimate ${formatDate(next.date)}`
          : "";

    return `
      <div class="prediction-check" data-check-item="${escapeHtml(item.id)}">
        <fieldset class="prediction-check-group">
          <legend class="prediction-check-prompt"><span class="sr-only">${escapeHtml(item.name)}: </span>Due ${formatDate(parseDate(predictedDate))} · was Hoot right?</legend>
          <div class="prediction-check-actions">
            <label class="btn btn-secondary btn-sm prediction-check-option">
              <input
                class="prediction-check-input"
                type="radio"
                name="run-feedback-${escapeHtml(item.id)}"
                value="right"
                data-action="run-feedback"
                data-id="${escapeHtml(item.id)}"
                ${verdict === "right" ? "checked" : ""}
              />
              <span>Yes, I was out</span>
            </label>
            <label class="btn btn-secondary btn-sm prediction-check-option">
              <input
                class="prediction-check-input"
                type="radio"
                name="run-feedback-${escapeHtml(item.id)}"
                value="early"
                data-action="run-feedback"
                data-id="${escapeHtml(item.id)}"
                ${verdict === "early" ? "checked" : ""}
              />
              <span>Still had some</span>
            </label>
          </div>
        </fieldset>
        <p class="prediction-check-result" data-check-result${result ? "" : " hidden"}>${escapeHtml(result)}</p>
      </div>
    `;
  }

  function markAllPredictionsRight(trigger) {
    if (!pendingRunReceipt) return;

    let markedCount = 0;
    for (const entry of pendingRunReceipt.entries) {
      if (entry.selection?.type === "tracked" && entry.selection.predictedDate && entry.purchase) {
        entry.purchase.feedback = {
          verdict: "right",
          predictedDate: entry.selection.predictedDate,
          recordedAt: toISODate(today),
          source: "receipt",
        };
        markedCount += 1;
      }
    }

    if (markedCount > 0) {
      saveState();

      $$("#finish-run-list .prediction-check").forEach((check) => {
        const itemId = check.dataset.checkItem;
        const entry = pendingRunReceipt.entries.find(({ item }) => item.id === itemId);
        if (!entry) return;

        $$('[data-action="run-feedback"]', check).forEach((input) => {
          input.checked = input.value === "right";
        });

        const next = predictionFor(entry.item, today);
        const result = check.querySelector("[data-check-result]");
        if (result) {
          result.hidden = false;
          result.textContent = `Right · next estimate ${formatDate(next.date)}`;
        }
      });

      render();

      const status = $("#prediction-check-status");
      if (status) {
        status.textContent = `Marked ${markedCount} ${markedCount === 1 ? "prediction" : "predictions"} as right.`;
      }
    }
  }

  function getActiveCategories() {
    const categories = new Set();
    for (const item of state.items) {
      if (item.category && item.category !== "Uncategorized") {
        categories.add(item.category);
      }
    }
    return [...categories].sort((left, right) => {
      if (aisleOrder.length) {
        const leftIdx = aisleOrder.indexOf(left);
        const rightIdx = aisleOrder.indexOf(right);
        if (leftIdx !== -1 && rightIdx !== -1) return leftIdx - rightIdx;
        if (leftIdx !== -1) return -1;
        if (rightIdx !== -1) return 1;
      }
      return left.localeCompare(right);
    });
  }

  function renderAisleOrderList() {
    const list = $("#aisle-order-list");
    if (!list) return;

    const categories = getActiveCategories();
    const entries = runRosterEntries().filter((entry) => !isRunItemSkipped(entry.item.id));
    const counts = {};
    for (const entry of entries) {
      const cat = entry.item.category;
      if (cat) counts[cat] = (counts[cat] || 0) + 1;
    }

    list.innerHTML = categories
      .map((cat, index) => {
        const isFirst = index === 0;
        const isLast = index === categories.length - 1;
        const count = counts[cat] || 0;
        const countLabel = count ? `${count} ${count === 1 ? "item" : "items"}` : "0 items";

        return `
          <li class="aisle-order-row" data-category="${escapeHtml(cat)}">
            <div>
              <span class="aisle-order-name">${escapeHtml(cat)}</span>
              <span class="aisle-order-meta">${countLabel}</span>
            </div>
            <div class="aisle-order-steppers">
              <button
                class="aisle-order-stepper"
                type="button"
                data-action="move-aisle-up"
                data-category="${escapeHtml(cat)}"
                aria-label="Move ${escapeHtml(cat)} earlier in trip"
                ${isFirst ? "disabled" : ""}
              >↑</button>
              <button
                class="aisle-order-stepper"
                type="button"
                data-action="move-aisle-down"
                data-category="${escapeHtml(cat)}"
                aria-label="Move ${escapeHtml(cat)} later in trip"
                ${isLast ? "disabled" : ""}
              >↓</button>
            </div>
          </li>
        `;
      })
      .join("");
  }

  function renderRhythmAuditContent() {
    const summaryEl = $("#rhythm-audit-summary");
    const groupsEl = $("#rhythm-audit-groups");
    if (!summaryEl || !groupsEl) return;

    const staples = state.items.filter((item) => !item.isOneTime);
    const itemDrifts = staples
      .map((item) => ({ item, drift: rhythmDriftFor(item) }))
      .filter((entry) => Boolean(entry.drift));

    const clockworkItems = itemDrifts.filter((entry) => entry.drift.trend === "clockwork");
    const steadyItems = itemDrifts.filter((entry) => entry.drift.trend === "steady");
    const driftingItems = itemDrifts.filter((entry) => entry.drift.isDrifting);
    const learningItems = itemDrifts.filter((entry) => entry.drift.trend === "learning");

    summaryEl.innerHTML = `
      <span class="status-chip status-clockwork">${clockworkItems.length} Clockwork</span>
      <span class="status-chip status-steady">${steadyItems.length} Steady</span>
      ${driftingItems.length > 0 ? `<span class="status-chip status-stretching">${driftingItems.length} Drifting</span>` : ""}
      <span class="status-chip status-learning">${learningItems.length} Learning</span>
    `;

    const renderRows = (entries, isDriftingGroup = false) =>
      entries
        .map(
          ({ item, drift }) => `
          <tr class="rhythm-audit-row" data-item-id="${escapeHtml(item.id)}">
            <td class="rhythm-audit-cell rhythm-audit-cell-name">
              <a href="#/item/${escapeHtml(item.id)}" class="rhythm-audit-link" data-close>${escapeHtml(item.name)}</a>
            </td>
            <td class="rhythm-audit-cell">
              <span class="status-chip status-${drift.trend}">${escapeHtml(drift.label)}</span>
            </td>
            <td class="rhythm-audit-cell rhythm-audit-metrics">
              ${
                isDriftingGroup
                  ? `${drift.baselineInterval}d → ${drift.recentInterval}d (diff: ${drift.diffDays > 0 ? `+${drift.diffDays}` : drift.diffDays}d)`
                  : drift.trend === "learning"
                    ? `${drift.cycleCount} of 3 purchases`
                    : `${drift.baselineInterval}d cadence · MAD ±${drift.mad ?? 0}d`
              }
            </td>
            <td class="rhythm-audit-cell rhythm-audit-action-cell">
              ${
                isDriftingGroup && (drift.trend === "stretching" || drift.trend === "accelerating")
                  ? `<button
                      type="button"
                      class="btn btn-secondary btn-sm rhythm-recalibrate-btn"
                      data-action="recalibrate-item-cadence"
                      data-item-id="${escapeHtml(item.id)}"
                      data-target-cadence="${drift.recentInterval}"
                    >
                      Recalibrate (${drift.recentInterval}d)
                    </button>`
                  : ""
              }
            </td>
          </tr>
        `,
        )
        .join("");

    let groupsHtml = "";

    if (driftingItems.length > 0) {
      groupsHtml += `
        <section class="rhythm-audit-section" aria-labelledby="rhythm-audit-drifting-title">
          <h3 class="rhythm-audit-section-title" id="rhythm-audit-drifting-title">Cadence drift & shifted baselines (${driftingItems.length})</h3>
          <table class="rhythm-audit-table">
            <tbody>${renderRows(driftingItems, true)}</tbody>
          </table>
        </section>
      `;
    }

    const stableItems = [...clockworkItems, ...steadyItems];
    if (stableItems.length > 0) {
      groupsHtml += `
        <section class="rhythm-audit-section" aria-labelledby="rhythm-audit-stable-title">
          <h3 class="rhythm-audit-section-title" id="rhythm-audit-stable-title">Stable rhythms (${stableItems.length})</h3>
          <table class="rhythm-audit-table">
            <tbody>${renderRows(stableItems, false)}</tbody>
          </table>
        </section>
      `;
    }

    if (learningItems.length > 0) {
      groupsHtml += `
        <section class="rhythm-audit-section" aria-labelledby="rhythm-audit-learning-title">
          <h3 class="rhythm-audit-section-title" id="rhythm-audit-learning-title">Learning rhythms (${learningItems.length})</h3>
          <table class="rhythm-audit-table">
            <tbody>${renderRows(learningItems, false)}</tbody>
          </table>
        </section>
      `;
    }

    groupsEl.innerHTML = groupsHtml;
  }

  function openRhythmAuditDialog(trigger = null) {
    renderRhythmAuditContent();
    showDialog($("#rhythm-audit-dialog"), trigger);
  }

  function recalibrateItemCadence(button) {
    const itemId = button.dataset.itemId;
    const targetCadence = Number(button.dataset.targetCadence);
    const item = state.items.find((entry) => entry.id === itemId);
    if (!item || !Number.isFinite(targetCadence) || targetCadence <= 0) return;

    const previousPivot = item.cadencePivotDate;
    const previousCadence = item.reorderThresholdDays;

    const sortedPurchases = [...item.purchases].sort(
      (left, right) => parseDate(left.date) - parseDate(right.date),
    );
    const latestPurchase = sortedPurchases.length ? sortedPurchases[sortedPurchases.length - 1] : null;

    item.cadencePivotDate = latestPurchase ? latestPurchase.date : toISODate(today);
    item.reorderThresholdDays = Math.round(targetCadence);
    saveState();
    render();

    if (currentView === "item" && currentItemId === item.id) {
      renderItemPage(item);
    }
    const auditDialog = $("#rhythm-audit-dialog");
    if (auditDialog && auditDialog.open) {
      renderRhythmAuditContent();
    }

    toast(`Recalibrated ${item.name} baseline to ${item.reorderThresholdDays} days.`, "success", {
      label: "Undo",
      onAction: async () => {
        item.cadencePivotDate = previousPivot;
        item.reorderThresholdDays = previousCadence;
        saveState();
        render();
        if (currentView === "item" && currentItemId === item.id) {
          renderItemPage(item);
        }
        if (auditDialog && auditDialog.open) {
          renderRhythmAuditContent();
        }
        toast(`${item.name} baseline restored.`);
      },
    });
  }

  function openAisleOrderDialog(trigger) {
    renderAisleOrderList();
    showDialog($("#aisle-order-dialog"), trigger);
  }

  function moveAisleCategory(category, direction, trigger) {
    const categories = getActiveCategories();
    const index = categories.indexOf(category);
    if (index === -1) return;

    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const temp = categories[index];
    categories[index] = categories[targetIndex];
    categories[targetIndex] = temp;

    aisleOrder = categories;
    saveAisleOrder(aisleOrder);
    renderAisleOrderList();
    renderStoreRun();

    const status = $("#aisle-order-status");
    if (status) {
      status.textContent = `Moved ${category} ${direction < 0 ? "earlier" : "later"} in trip.`;
    }

    const action = direction < 0 ? "move-aisle-up" : "move-aisle-down";
    $(`[data-action="${action}"][data-category="${CSS.escape(category)}"]`)?.focus();
  }

  function resetAisleOrder() {
    aisleOrder = [];
    saveAisleOrder([]);
    renderAisleOrderList();
    renderStoreRun();

    const status = $("#aisle-order-status");
    if (status) {
      status.textContent = "Reset aisle order to alphabetical.";
    }
  }

  function finishShoppingRun(trigger) {
    const receipt = buildRunReceipt();
    if (!receipt.entries.length) return;

    const count = receipt.entries.length;
    const checkCount = receipt.entries.filter(
      ({ selection }) => selection?.type === "tracked" && selection.predictedDate && !selection.earlyRestock,
    ).length;
    const itemWord = count === 1 ? "item" : "items";
    pendingRunReceipt = receipt;

    const oosText = receipt.outOfStockCount
      ? ` ${receipt.outOfStockCount} out of stock.`
      : "";
    const skippedText = receipt.skippedCount
      ? ` ${receipt.skippedCount} skipped.`
      : "";

    $("#finish-run-title").textContent = "Shopping run finished";
    $("#finish-run-message").textContent = `${count} ${itemWord} logged.${oosText}${skippedText}${
      checkCount
        ? ` ${checkCount} ${
            checkCount === 1 ? "restock check" : "restock checks"
          } ready.`
        : " No restock checks for this trip."
    }`;
    $("#finish-run-summary").innerHTML = `
      <strong>${count} ${itemWord}</strong>
      ${
        receipt.hasKnownPrice
          ? `<span>${formatMoney(receipt.totalSpent)} known spend</span>`
          : `<span>Spending not recorded</span>`
      }
    `;
    const hasChecks = checkCount > 0;
    const checksBar = $("#finish-run-checks-bar");
    if (checksBar) checksBar.hidden = !hasChecks;
    const hint = $("#finish-run-hint");
    if (hint) hint.hidden = !hasChecks;
    $("#prediction-check-status").textContent = "";
    $("#finish-run-list").innerHTML = receipt.entries
      .map(({ item, purchase, selection }) => {
        const detail = purchase
          ? `${formatQuantity(purchase.quantity, item.unit)} · ${formatPurchasePrice(purchase.price)}`
          : "One-time checklist";
        let check = "";
        if (selection?.earlyRestock && selection?.effectiveStartDate) {
          check = `
            <div class="finish-run-early-buffer">
              <span class="status-chip status-buffer">Early buffer</span>
              <p class="finish-run-buffer-note">Restocked early to save a trip · countdown continues from ${formatDate(parseDate(selection.effectiveStartDate))}.</p>
            </div>
          `;
        } else if (selection?.type === "tracked" && selection.predictedDate) {
          check = predictionCheckMarkup(item, purchase, selection.predictedDate);
        }
        return `
          <li class="finish-run-entry">
            <div class="finish-run-entry-line">
              <strong>${escapeHtml(item.name)}</strong>
              <span>${escapeHtml(detail)}</span>
            </div>
            ${check}
          </li>
        `;
      })
      .join("");
    $("#finish-run-history").hidden = !receipt.historyItemId;
    $("#toast-region").replaceChildren();
    showDialog($("#finish-run-dialog"), trigger);
  }

  
  function addSynergyItem(itemId, date, originalDueDate) {
    const iso = toISODate(date);
    let plan = plans.find((p) => p.date === iso);
    if (!plan) {
      const currentDueIds = monthDayEntries(date).map(({ item }) => item.id);
      plan = {
        id: makeId("plan"),
        date: iso,
        itemIds: currentDueIds,
        includeWatch: true,
        createdAt: toISODate(today),
        earlyRestocks: {},
      };
      plans.push(plan);
    }
    if (!plan.earlyRestocks) plan.earlyRestocks = {};
    if (!plan.itemIds.includes(itemId)) {
      plan.itemIds.push(itemId);
    }
    plan.earlyRestocks[itemId] = originalDueDate;
    if (dayPanelDate === iso) {
      dayPanelExtraIds.add(itemId);
      dayPanelSelection.add(itemId);
    }
    savePlans();
    renderRestockCalendar();
    const item = state.items.find((i) => i.id === itemId);
    toast(`${item ? item.name : "Item"} swept into trip as early restock.`);
  }

  function sweepAllSynergy(date) {
    const iso = toISODate(date);
    const synergy = monthDaySynergyEntries(date, gravityHorizon);
    if (!synergy.length) return;

    let plan = plans.find((p) => p.date === iso);
    if (!plan) {
      const currentDueIds = monthDayEntries(date).map(({ item }) => item.id);
      plan = {
        id: makeId("plan"),
        date: iso,
        itemIds: currentDueIds,
        includeWatch: true,
        createdAt: toISODate(today),
        earlyRestocks: {},
      };
      plans.push(plan);
    }
    if (!plan.earlyRestocks) plan.earlyRestocks = {};

    for (const { item, prediction } of synergy) {
      if (!plan.itemIds.includes(item.id)) {
        plan.itemIds.push(item.id);
      }
      plan.earlyRestocks[item.id] = toISODate(prediction.date);
      if (dayPanelDate === iso) {
        dayPanelExtraIds.add(item.id);
        dayPanelSelection.add(item.id);
      }
    }

    savePlans();
    renderRestockCalendar();
    toast(`Swept ${synergy.length} early restocks into trip.`);
  }

  function startRunFromDate(date) {
    const iso = toISODate(date);
    let plan = planForDate(date);
    const itemIds =
      dayPanelSelection && dayPanelDate === iso
        ? Array.from(dayPanelSelection)
        : (plan ? plan.itemIds : monthDayEntries(date).map(({ item }) => item.id));

    const wasExisting = Boolean(plan);
    if (!plan) {
      plan = {
        id: makeId("plan"),
        date: iso,
        itemIds,
        includeWatch: true,
        createdAt: toISODate(today),
        earlyRestocks: {},
      };
      plans.push(plan);
    } else {
      plan.itemIds = itemIds;
    }
    savePlans();

    storeRun.runDate = iso;
    storeRun.selected = new Map();
    storeRun.extraIds = new Set(itemIds);
    storeRun.skippedIds = [];
    storeRun.outOfStockIds = [];
    storeRun.lastSkippedId = null;
    storeRun.includeWatch = true;
    storeRun.earlyRestocks = plan && plan.earlyRestocks ? { ...plan.earlyRestocks } : {};
    saveStoreRun();
    openCalendarDay = null;
    renderRestockCalendar();
    setView("store-run");
    toast(wasExisting ? "Plan updated." : "Plan saved.");
  }

  function savePlanForDate(date) {
    const iso = toISODate(date);
    const existing = plans.find((plan) => plan.date === iso);
    const itemIds =
      dayPanelSelection && dayPanelDate === iso
        ? Array.from(dayPanelSelection)
        : (existing ? existing.itemIds : monthDayEntries(date).map(({ item }) => item.id));

    plans = [
      ...plans.filter((plan) => plan.date !== iso),
      {
        id: existing?.id ?? makeId("plan"),
        date: iso,
        itemIds,
        includeWatch: existing?.includeWatch ?? true,
        createdAt: existing?.createdAt ?? toISODate(today),
        earlyRestocks: existing?.earlyRestocks ?? {},
      },
    ];
    savePlans();
    renderRestockCalendar();
    toast(existing ? "Plan updated." : "Plan saved.");
    $(
      `[data-action="save-plan-date"][data-date="${CSS.escape(iso)}"]`,
    )?.focus({ preventScroll: true });
  }

  function addItemToPlannedRun(itemId) {
    if (!storeRun.runDate) return;
    const plan = plans.find((entry) => entry.date === storeRun.runDate);
    if (!plan || plan.itemIds.includes(itemId)) return;
    plan.itemIds.push(itemId);
    savePlans();
  }

  function resumePlan(planId) {
    const plan = plans.find((entry) => entry.id === planId);
    if (!plan) return;
    storeRun.runDate = plan.date;
    storeRun.selected = new Map();
    storeRun.extraIds = new Set(plan.itemIds);
    storeRun.skippedIds = [];
    storeRun.outOfStockIds = [];
    storeRun.lastSkippedId = null;
    storeRun.includeWatch = plan.includeWatch;
    storeRun.earlyRestocks = plan.earlyRestocks ? { ...plan.earlyRestocks } : {};
    saveStoreRun();
    openCalendarDay = null;
    renderRestockCalendar();
    setView("store-run");
    toast(`Resumed the plan for ${formatFullDate(parseDate(plan.date))}.`);
  }

  function deletePlan(planId) {
    plans = plans.filter((plan) => plan.id !== planId);
    savePlans();
    renderRestockCalendar();
    toast("Plan deleted.");
  }

  function completeShoppingRun({ openHistory = false } = {}) {
    const receipt = pendingRunReceipt;
    const completedRunDate = storeRun.runDate;
    pendingRunReceipt = null;
    lastDialogTrigger = null;
    closeDialog($("#finish-run-dialog"));
    if (completedRunDate && plans.some((plan) => plan.date === completedRunDate)) {
      plans = plans.filter((plan) => plan.date !== completedRunDate);
      savePlans();
    }
    if (receipt?.outOfStockItems?.length) {
      for (const item of receipt.outOfStockItems) {
        markOutOfStockToday(item.id);
      }
    }
    storeRun = {
      runDate: null,
      includeWatch: false,
      selected: new Map(),
      extraIds: new Set(),
      skippedIds: [],
      outOfStockIds: [],
      lastSkippedId: null,
      earlyRestocks: {},
    };
    saveStoreRun();

    render();
    setView("dashboard", { replace: true });

    if (openHistory && receipt?.historyItemId) {
      openDetail(receipt.historyItemId);
      $(".item-page .back-button")?.focus({ preventScroll: true });
      return;
    }

    $('.nav-button[data-view="dashboard"]')?.focus({ preventScroll: true });
  }

  function recordRunPredictionFeedback(itemId, verdict, trigger) {
    const entry = pendingRunReceipt?.entries.find(({ item }) => item.id === itemId);
    if (!entry?.purchase || !entry.selection?.predictedDate) return;

    entry.purchase.feedback = {
      verdict,
      predictedDate: entry.selection.predictedDate,
      recordedAt: toISODate(today),
      source: "receipt",
    };
    saveState();

    const next = predictionFor(entry.item, today);
    const check = trigger.closest(".prediction-check");
    $$('[data-action="run-feedback"]', check).forEach((input) => {
      input.checked = input.value === verdict;
    });

    const result = check?.querySelector("[data-check-result]");
    if (result) {
      result.hidden = false;
      result.textContent =
        verdict === "early"
          ? `Still had some · next estimate moved to ${formatDate(next.date)}`
          : `Right · next estimate ${formatDate(next.date)}`;
    }

    render();

    const status = $("#prediction-check-status");
    if (status) {
      status.textContent =
        verdict === "early"
          ? `${entry.item.name} marked still had some. Next estimate moved to ${formatFullDate(next.date)}.`
          : `${entry.item.name} marked right. Next estimate ${formatFullDate(next.date)}.`;
    }
  }

  function applyNextUpStillHasSome(itemId) {
    const item = state.items.find((entry) => entry.id === itemId);
    if (!item || item.isOneTime) return;

    const latestPurchase = latestPurchaseFor(item);
    if (!latestPurchase) return;

    const prediction = predictionFor(item, today);
    if (prediction.zone !== "overdue") return;

    const previousFeedback = latestPurchase.feedback
      ? clone(latestPurchase.feedback)
      : null;
    const purchaseId = latestPurchase.id;
    const shiftDays = EARLY_RESTOCK_SHIFT_DAYS - prediction.daysUntil;

    latestPurchase.feedback = {
      verdict: "early",
      predictedDate: toISODate(prediction.date),
      recordedAt: toISODate(today),
      source: "next-up",
      shiftDays,
      ...(previousFeedback ? { previousFeedback } : {}),
    };
    saveState();
    render();

    const next = predictionFor(item);
    $("#dashboard-list .item-card [data-action=\"log\"]")?.focus({ preventScroll: true });
    toast(
      `${item.name} marked still have some. Next estimate ${formatFullDate(next.date)}.`,
      "success",
      {
        label: "Undo",
        onAction: () => {
          const currentItem = restoreNextUpCorrection(item.id, purchaseId);
          if (!currentItem) {
            toast(`${item.name} correction is no longer active.`, "error");
            return;
          }

          render();
          $(
            `#dashboard-list [data-item-id="${CSS.escape(item.id)}"] .item-title-button`,
          )?.focus({ preventScroll: true });
          toast(`${item.name} check removed.`);
        },
      },
    );
  }

  function undoNextUpCorrection(itemId, purchaseId) {
    const item = restoreNextUpCorrection(itemId, purchaseId);
    if (!item) {
      toast("That correction is no longer active.", "error");
      return;
    }

    render();
    const next = predictionFor(item);
    $("#item-analysis-content .restock-answer [data-action=\"log\"]")?.focus({
      preventScroll: true,
    });
    toast(
      `${item.name} correction undone.${
        next ? ` Next estimate ${formatFullDate(next.date)}.` : ""
      }`,
    );
  }

  function toggleWatchItems(trigger) {
    storeRun.includeWatch = !storeRun.includeWatch;
    saveStoreRun();
    renderStoreRun();
    announceRun(
      storeRun.includeWatch ? "Watch items included." : "Watch items hidden.",
    );

    const triggerIsUsable =
      trigger instanceof HTMLElement &&
      document.contains(trigger) &&
      trigger.getClientRects().length > 0;

    if (!triggerIsUsable) {
      const nextFocus =
        document.querySelector('#store-run-groups [data-action="toggle-run-item"]') ??
        document.querySelector('.store-run-actions [data-action="toggle-watch-items"]');
      nextFocus?.focus({ preventScroll: true });
    }
  }

  function purchaseCountLabel(count) {
    if (!count) return "No purchases yet";
    if (count === 1) return "Bought once";
    return `Bought ${count} times`;
  }

  function rhythmSentence(item, prediction) {
    const correction = prediction.feedbackShiftDays
      ? ` Your last check said you still had some, so Hoot added ${prediction.feedbackShiftDays} days.`
      : "";

    if (prediction.maturity === "learning") {
      if (!prediction.purchaseCount) {
        return `Hoot has no purchases to learn from yet, so this date is your ${item.reorderThresholdDays}-day interval after the day you added the item. Log the first purchase to start a real rhythm.${correction}`;
      }
      const remaining = Math.max(0, 3 - prediction.purchaseCount);
      return `Hoot is still learning this item, so this date uses your ${item.reorderThresholdDays}-day interval. ${remaining} more ${remaining === 1 ? "purchase" : "purchases"} will let it use your real gaps.${correction}`;
    }

    const average = Math.round(prediction.averageInterval ?? item.reorderThresholdDays);
    return `You buy this about every ${average} days. Hoot puts the next restock at the end of that rhythm.${correction}`;
  }

  function methodExplanation(item, prediction) {
    const correction = prediction.feedbackShiftDays
      ? ` Your last “still had some” answer adds ${prediction.feedbackShiftDays} days to the result.`
      : "";

    if (prediction.maturity === "learning") {
      const basis = prediction.purchaseCount
        ? `It has ${prediction.purchaseCount} purchase${prediction.purchaseCount === 1 ? "" : "s"} so far; after three it stops using your setting and starts using the gaps between purchases.`
        : "It has no purchases yet; the first one gives it a real date to work from.";
      return `Hoot adds your ${item.reorderThresholdDays}-day interval to the most recent date. ${basis}${correction}`;
    }

    return `Hoot measures the days between each logged purchase and places the next restock one typical gap after the last one. Editing or logging a purchase recalculates it.${correction}`;
  }

  function answerWindowLine(prediction) {
    const window = likelyWindowFor(prediction);
    if (!window) return "";

    const sameDay = window.start.getTime() === window.end.getTime();
    if (window.shortestGap === window.longestGap) {
      const range = sameDay
        ? formatDate(window.start)
        : `${formatDate(window.start)}–${formatDate(window.end)}`;
      return `<p class="restock-answer-range"><strong>Likely ${range}.</strong> Your gaps have all been ${window.shortestGap} days.</p>`;
    }
    if (window.wide) {
      return `<p class="restock-answer-range"><strong>Could be anywhere from ${formatDate(window.start)} to ${formatDate(window.end)}.</strong> Your gaps have ranged from ${window.shortestGap} to ${window.longestGap} days.</p>`;
    }
    return `<p class="restock-answer-range"><strong>Likely between ${formatDate(window.start)} and ${formatDate(window.end)}.</strong> Your gaps have ranged from ${window.shortestGap} to ${window.longestGap} days.</p>`;
  }

  function restockAnswer(item, prediction) {
    return `
      <section class="restock-answer horizon-${escapeHtml(prediction.zone)}" aria-labelledby="restock-answer-label">
        <div class="restock-answer-body">
          <div class="restock-answer-heading">
            <span class="item-eyebrow" id="restock-answer-label">Next restock</span>
            <span class="status-chip status-${escapeHtml(prediction.zone)}">${escapeHtml(prediction.statusLabel)}</span>
          </div>
          <p class="restock-answer-date">${formatFullDate(prediction.date)}</p>
          <p class="restock-answer-due">${escapeHtml(formatDue(prediction.daysUntil))}</p>
          ${renderDepletionGaugeHtml(depletionFor(item))}
          <p class="restock-answer-why">${escapeHtml(rhythmSentence(item, prediction))}</p>
          ${answerWindowLine(prediction)}
        </div>
        <div class="restock-answer-action">
          <button class="btn btn-primary" type="button" data-action="log" data-id="${escapeHtml(item.id)}">Log purchase</button>
        </div>
      </section>
    `;
  }

  function rhythmLedger(item, prediction) {
    if (!prediction.purchaseDates.length) {
      return `
        <section class="rhythm-ledger" aria-labelledby="rhythm-title">
          <div class="section-heading">
            <div>
              <h2 id="rhythm-title">Buying rhythm</h2>
              <p class="section-copy">Each purchase sits on one timeline; the space between is the gap Hoot measured.</p>
            </div>
          </div>
          <div class="rhythm-empty">
            <strong>No purchases yet</strong>
            <p>Log the first purchase and Hoot will start the ledger.</p>
          </div>
        </section>
      `;
    }

    const purchases = [...item.purchases].sort(
      (left, right) => parseDate(left.date) - parseDate(right.date),
    );
    const entries = [];

    purchases.forEach((purchase, index) => {
      const unitPrice =
        Number(purchase.quantity) > 1 && purchaseUnitPrice(purchase) !== null
          ? ` · ${formatUnitPrice(purchase, item)}`
          : "";
      entries.push(`
        <li class="rhythm-entry">
          <span class="rhythm-marker" aria-hidden="true"></span>
          <div class="rhythm-content">
            <div class="rhythm-head">
              <time class="rhythm-date" datetime="${escapeHtml(purchase.date)}">${formatFullDate(parseDate(purchase.date))}</time>
              ${purchase.earlyRestock && purchase.effectiveStartDate ? `<span class="status-chip status-buffer">Early buffer (${formatDate(parseDate(purchase.effectiveStartDate))})</span>` : ""}
              ${item.cadencePivotDate && purchase.date >= item.cadencePivotDate ? `<span class="status-chip status-recalibrated">Recalibrated baseline</span>` : ""}
            </div>
            <p class="rhythm-purchase">${escapeHtml(formatQuantity(purchase.quantity, item.unit))} · ${formatPurchasePrice(purchase.price)}${escapeHtml(unitPrice)}</p>
            ${purchaseActionButtons(item, purchase)}
          </div>
        </li>
      `);

      const next = purchases[index + 1];
      if (!next) return;
      const days = Math.max(
        1,
        Math.round((parseDate(next.date) - parseDate(purchase.date)) / DAY_MS),
      );
      entries.push(`
        <li class="rhythm-gap-row" style="min-height:${gapSpace(days)}px">
          <div class="rhythm-gap">
            <span class="rhythm-gap-days">${days} ${days === 1 ? "day" : "days"}</span>
            <span class="rhythm-gap-note">${escapeHtml(gapComparison(days, prediction))}</span>
          </div>
        </li>
      `);
    });

    const projectedDays = Math.max(
      1,
      Math.round((prediction.date - prediction.latest) / DAY_MS),
    );
    const estimateBasis =
      prediction.maturity === "learning"
        ? `your ${item.reorderThresholdDays}-day interval`
        : "one typical gap";
    const correction = prediction.feedbackShiftDays
      ? ` · +${prediction.feedbackShiftDays} days from your check`
      : "";
    entries.push(`
      <li class="rhythm-gap-row is-estimate" style="min-height:${gapSpace(projectedDays)}px">
        <div class="rhythm-gap">
          <span class="rhythm-gap-days">${projectedDays} ${projectedDays === 1 ? "day" : "days"}</span>
          <span class="rhythm-gap-note">Estimate · ${escapeHtml(estimateBasis)}${escapeHtml(correction)}</span>
        </div>
      </li>
    `);

    entries.push(`
      <li class="rhythm-entry is-estimate">
        <span class="rhythm-marker" aria-hidden="true"></span>
        <div class="rhythm-content">
          <div class="rhythm-head">
            <span class="rhythm-date">${formatFullDate(prediction.date)}</span>
            <span class="rhythm-badge is-estimate">Estimate</span>
          </div>
          <p class="rhythm-purchase">Expected, not yet purchased</p>
        </div>
      </li>
    `);

    return `
      <section class="rhythm-ledger" aria-labelledby="rhythm-title">
        <div class="section-heading">
          <div>
            <h2 id="rhythm-title">Buying rhythm</h2>
            <p class="section-copy">Each purchase sits on one timeline; the space between is the gap Hoot measured.</p>
          </div>
        </div>
        <ol class="rhythm-list">${entries.join("")}</ol>
      </section>
    `;
  }

  function confidenceCard(item, prediction) {
    const gapCount = prediction.intervals.length;
    const spread =
      gapCount > 1
        ? Math.max(...prediction.intervals) - Math.min(...prediction.intervals)
        : null;
    let label = "No purchases yet";
    if (prediction.purchaseCount) {
      if (prediction.purchaseCount < 3) {
        label = `Learning · ${prediction.purchaseCount} of 3 purchases`;
      } else {
        const ratio = spread / (prediction.averageInterval || 1);
        label =
          spread <= 2
            ? "Very consistent gaps"
            : ratio <= 0.35
              ? "Fairly consistent gaps"
              : ratio <= 0.7
                ? "Somewhat irregular gaps"
                : "Gaps vary widely";
      }
    }
    const basis =
      prediction.maturity === "learning"
        ? `Your ${item.reorderThresholdDays}-day interval`
        : "Your measured gaps";
    const note =
      prediction.purchaseCount === 0
        ? "Log the first purchase to start measuring gaps."
        : prediction.maturity === "learning"
          ? gapCount
            ? "One more purchase switches the estimate to your real gaps."
            : "Log a second purchase to measure your first gap."
          : "The likely window spans your shortest and longest gap.";

    return `
      <article class="rail-card" aria-labelledby="confidence-title">
        <h2 id="confidence-title">Confidence</h2>
        <p class="rail-detail">${escapeHtml(label)}</p>
        <dl class="pattern-list">
          <div><dt>Based on</dt><dd>${prediction.purchaseCount} purchase${prediction.purchaseCount === 1 ? "" : "s"}</dd></div>
          <div><dt>Gaps measured</dt><dd>${gapCount}</dd></div>
          <div><dt>Gap range</dt><dd>${spread === null ? "Not enough gaps" : `${spread} ${spread === 1 ? "day" : "days"}`}</dd></div>
          <div><dt>Basis</dt><dd>${escapeHtml(basis)}</dd></div>
        </dl>
        <p class="rail-note">${note}</p>
      </article>
    `;
  }

  function spendingCard(item) {
    const stats = spendingFor(item);
    if (!stats.pricedCount) {
      return `
        <article class="rail-card" aria-labelledby="spending-title">
          <h2 id="spending-title">Spending</h2>
          <p class="rail-detail">No prices logged</p>
          <p class="rail-note">Total price is optional. Add one when you log a purchase to see known spend and unit price.</p>
        </article>
      `;
    }

    let priceChange = "Not enough prices";
    if (stats.change !== null) {
      if (Math.abs(stats.change) < 0.005) {
        priceChange = `Same as ${formatDate(parseDate(stats.previous.date))}`;
      } else {
        priceChange = `${stats.change > 0 ? "Up" : "Down"} ${formatMoneyExact(
          Math.abs(stats.change),
        )} since ${formatDate(parseDate(stats.previous.date))}`;
      }
    }
    const sparkline = stats.history.length >= 2 ? priceSparkline(item, stats.history) : "";

    return `
      <article class="rail-card" aria-labelledby="spending-title">
        <h2 id="spending-title">Spending</h2>
        <dl class="pattern-list">
          <div><dt>Known spend</dt><dd>${formatMoney(stats.total)}</dd></div>
          <div><dt>Average purchase</dt><dd>${formatMoney(stats.average)}</dd></div>
          <div><dt>Latest unit price</dt><dd>${formatMoney(stats.latestUnit)} / ${escapeHtml(item.unit || "unit")}</dd></div>
          <div><dt>Price change</dt><dd>${escapeHtml(priceChange)}</dd></div>
        </dl>
        ${sparkline}
        <p class="rail-note">Prices on ${stats.pricedCount} of ${stats.purchases} purchase${stats.purchases === 1 ? "" : "s"}. Unit price is total divided by quantity.</p>
      </article>
    `;
  }

  function patternCard(item, prediction) {
    const hasGaps = prediction.intervals.length > 0;
    const learning = prediction.maturity === "learning";
    const averageGap = prediction.averageInterval ?? item.reorderThresholdDays;
    const shortest = hasGaps ? Math.min(...prediction.intervals) : null;
    const longest = hasGaps ? Math.max(...prediction.intervals) : null;
    const lastGap = hasGaps ? prediction.intervals[prediction.intervals.length - 1] : null;
    const rows = learning
      ? `<div><dt>Gap so far</dt><dd>${hasGaps ? `${Math.round(averageGap)} days` : "Not yet"}</dd></div>
        <div><dt>Estimate uses</dt><dd>${item.reorderThresholdDays} days</dd></div>`
      : `<div><dt>Typical gap</dt><dd>${Math.round(averageGap)} days</dd></div>
        <div><dt>Shortest gap</dt><dd>${shortest} days</dd></div>
        <div><dt>Longest gap</dt><dd>${longest} days</dd></div>
        <div><dt>Last gap</dt><dd>${lastGap} days</dd></div>`;

    return `
      <article class="rail-card" aria-labelledby="pattern-title">
        <h2 id="pattern-title">Pattern</h2>
        <dl class="pattern-list">
          ${rows}
        </dl>
        <details class="explain-disclosure">
          <summary>How Hoot got this date</summary>
          <p>${escapeHtml(methodExplanation(item, prediction))}</p>
        </details>
      </article>
    `;
  }

  function checksCard(item) {
    const summary = predictionCheckSummary(item);
    const hasChecks = summary !== "None yet";
    const correction = activeNextUpCorrection(item);
    const next = correction ? predictionFor(item) : null;
    const { superseded } = purchaseCheckEntries(item);
    const history = [...superseded].sort((left, right) => {
      const leftDate = checkRecordedDate(left);
      const rightDate = checkRecordedDate(right);
      return (rightDate?.getTime() ?? 0) - (leftDate?.getTime() ?? 0);
    });
    const recordedDate = correction?.feedback.recordedAt
      ? parseDate(correction.feedback.recordedAt)
      : null;
    const previousDate = correction?.feedback.predictedDate
      ? parseDate(correction.feedback.predictedDate)
      : null;
    const recordedCopy =
      recordedDate && !Number.isNaN(recordedDate.getTime())
        ? ` · recorded ${formatDate(recordedDate)}`
        : "";
    const moveCopy =
      previousDate &&
      !Number.isNaN(previousDate.getTime()) &&
      next
        ? `Estimate moved from ${formatDate(previousDate)} to ${formatDate(next.date)}.`
        : next
          ? `Current estimate ${formatDate(next.date)}.`
          : "";
    const historyRows = history
      .map((entry) => {
        const verdict =
          entry.feedback.verdict === "early" ? "Still had some" : "Right";
        const source = entry.feedback.source === "next-up" ? "Next up" : "Receipt";
        const date = checkRecordedDate(entry);
        return `
          <li class="rail-check-history-item">
            <span class="rail-check-history-verdict">${escapeHtml(verdict)}</span>
            <span class="rail-check-history-meta">${escapeHtml(source)}${
              date
                ? ` · <time datetime="${toISODate(date)}">${formatDate(date)}</time>`
                : ""
            }</span>
          </li>
        `;
      })
      .join("");

    return `
      <article class="rail-card">
        <h2>Your checks</h2>
        <p class="rail-detail">${escapeHtml(summary)}</p>
        ${
          correction
            ? `<div class="rail-correction" data-next-up-correction>
          <span class="rail-correction-label">Next up correction</span>
          <p class="rail-correction-summary"><strong>Still have some</strong>${escapeHtml(recordedCopy)}</p>
          <p class="rail-note">${escapeHtml(moveCopy)}</p>
          <button
            class="btn btn-secondary btn-sm rail-correction-undo"
            type="button"
            data-action="undo-next-up-correction"
            data-id="${escapeHtml(item.id)}"
            data-purchase-id="${escapeHtml(correction.purchase.id)}"
            aria-label="Undo Still have some correction for ${escapeHtml(item.name)}"
          >Undo correction</button>
        </div>`
            : ""
        }
        ${
          historyRows
            ? `<div class="rail-check-history">
          <h3 class="rail-check-history-title">Earlier checks</h3>
          <ul class="rail-check-history-list">${historyRows}</ul>
        </div>`
            : ""
        }
        <p class="rail-note">${
          correction
            ? "Recorded without a purchase. This stays here after the toast so you can undo it later."
            : hasChecks
              ? "Answers from the finish receipt or an overdue Next up card. “Still have some” moves an overdue estimate three days out."
              : "Answer “Was Hoot right?” after a shopping run, or “Still have some” on an overdue Next up card. The correction moves the estimate out without logging a purchase."
        }</p>
      </article>
    `;
  }

  function rhythmDriftCard(item, prediction) {
    const drift = rhythmDriftFor(item);
    if (!drift) return "";

    const trendLabels = {
      clockwork: "Clockwork",
      steady: "Steady",
      stretching: "Stretching",
      accelerating: "Accelerating",
      erratic: "Erratic",
      learning: "Learning",
    };
    const trendTitle = trendLabels[drift.trend] || "Steady";

    const accuracyNote =
      drift.mad !== null
        ? `Accurate within ±${drift.mad} day${drift.mad === 1 ? "" : "s"} across ${drift.cycleCount} restock${drift.cycleCount === 1 ? "" : "s"}.`
        : drift.cycleCount > 0
          ? `Learning cadence across ${drift.cycleCount} restock${drift.cycleCount === 1 ? "" : "s"}.`
          : "Not enough purchases yet to measure drift.";

    const recalibrationCallout =
      drift.isDrifting && (drift.trend === "stretching" || drift.trend === "accelerating")
        ? `
        <div class="drift-recalibration-callout" role="region" aria-label="Cadence recalibration callout">
          <p class="drift-callout-copy">
            Buying rhythm has shifted: recent restocks average ${drift.recentInterval} days (baseline was ${drift.baselineInterval} days).
          </p>
          <button
            class="btn btn-secondary btn-sm"
            type="button"
            data-action="recalibrate-item-cadence"
            data-item-id="${escapeHtml(item.id)}"
            data-target-cadence="${drift.recentInterval}"
          >
            Recalibrate baseline to ${drift.recentInterval} days
          </button>
        </div>
      `
        : "";

    const pivotNote = item.cadencePivotDate
      ? `<p class="rail-note">Baseline recalibrated to ${item.reorderThresholdDays} days on ${formatDate(parseDate(item.cadencePivotDate))}.</p>`
      : "";

    return `
      <article class="rail-card rhythm-drift-card" id="item-drift-card" aria-labelledby="rhythm-drift-title">
        <div class="rail-card-header">
          <h2 id="rhythm-drift-title">Rhythm health & drift</h2>
          <span class="status-chip status-${drift.trend}">${trendTitle}</span>
        </div>
        <p class="rail-detail">${escapeHtml(accuracyNote)}</p>
        <dl class="pattern-list">
          <div><dt>Status</dt><dd>${escapeHtml(drift.label)}</dd></div>
          <div><dt>Baseline cadence</dt><dd>${drift.baselineInterval} days</dd></div>
          <div><dt>Recent cadence</dt><dd>${drift.recentInterval} days</dd></div>
          <div><dt>Mean absolute drift</dt><dd>${drift.mad !== null ? `±${drift.mad}d` : "None"}</dd></div>
          <div><dt>Net drift bias</dt><dd>${drift.netBias !== null ? `${drift.netBias > 0 ? `+${drift.netBias}` : drift.netBias}d` : "None"}</dd></div>
        </dl>
        ${recalibrationCallout}
        ${pivotNote}
        <p class="rail-note">Measures how closely purchases follow the expected cadence over time. Recalibrating updates future restock baselines while preserving complete purchase and buying rhythm history.</p>
      </article>
    `;
  }

  function renderItemPage(item) {
    const content = $("#item-analysis-content");
    const prediction = predictionFor(item);
    const purchases = [...item.purchases].sort(
      (left, right) => parseDate(left.date) - parseDate(right.date),
    );
    const backLabel =
      itemReturnView === "one-time" ? "Back to one-time items" : "Back to dashboard";
    const meta = [
      item.category,
      item.unit,
      item.isOneTime ? null : purchaseCountLabel(purchases.length),
    ]
      .filter(Boolean)
      .map((part) => escapeHtml(part))
      .join(" · ");

    document.title = `${item.name} · Hoot`;
    content.innerHTML = `
      <div class="item-page">
        <button
          class="btn btn-ghost back-button"
          type="button"
          data-view="${escapeHtml(itemReturnView)}"
          data-history="replace"
        >← ${backLabel}</button>

        <header class="item-page-header">
          <div>
            <h1 id="item-analysis-title" tabindex="-1">${escapeHtml(item.name)}</h1>
            <p>${meta}</p>
          </div>
        </header>

        ${
          item.isOneTime
            ? `<section class="one-time-answer" aria-labelledby="one-time-answer-title">
          <span class="item-eyebrow">One-time item</span>
          <h2 id="one-time-answer-title">On your checklist</h2>
          <p>Hoot does not predict a restock for this item. It stays on the One-time list until you check it off, so it never changes your staples’ dates.</p>
        </section>`
            : `<div class="item-layout">
          <div class="item-main">
            ${restockAnswer(item, prediction)}
            <p class="item-evidence-line"><strong>Confidence</strong> · ${escapeHtml(prediction.confidencePhrase || "Learning your rhythm")}</p>
            ${rhythmLedger(item, prediction)}
          </div>
          <aside class="item-rail" aria-label="Pattern, confidence, and spending details">
            ${patternCard(item, prediction)}
            ${rhythmDriftCard(item, prediction)}
            ${confidenceCard(item, prediction)}
            ${prediction.purchaseCount ? spendingCard(item) : ""}
            ${checksCard(item)}
          </aside>
        </div>`
        }

        <footer class="detail-actions">
          <button class="btn btn-secondary" type="button" data-action="edit" data-id="${escapeHtml(item.id)}">Edit item</button>
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
    document.body.dataset.sample = normalizeSampleId(state.sample);
    document.body.dataset.density = density;
    syncDensityControls();
    syncDashboardViewControls();
    const sampleSelect = $("#sample-select");
    if (sampleSelect) sampleSelect.value = document.body.dataset.sample;
    renderStats();
    renderDashboard();
    renderCurrentTrip();
    renderRestockCalendar();
    renderOneTime();
    const headerLog = document.querySelector('.header-actions [data-dialog="log-purchase"]');
    if (headerLog) headerLog.hidden = currentView === "one-time";
    const queueSearchInput = $("#queue-search");
    if (queueSearchInput) {
      queueSearchInput.placeholder = window.innerWidth <= 340 ? "Search items" : "Search name, category, or unit";
    }
    if (currentView === "store-run") {
      renderStoreRun();
    }
    if (currentView === "item" && currentItemId) {
      const item = state.items.find((entry) => entry.id === currentItemId);
      if (item) renderItemPage(item);
    }
  }

  function viewRoute(view, itemId = currentItemId) {
    if (view === "item" && itemId) return `#/item/${encodeURIComponent(itemId)}`;
    if (view === "store-run") return "#/shopping";
    if (view === "one-time") return "#/one-time";
    return "#/dashboard";
  }

  function readRoute() {
    const hash = window.location.hash.replace(/^#\/?/, "");
    if (!hash) return { view: "dashboard", hasRoute: false };

    const [name, ...rest] = hash.split("/");
    if (name === "item" && rest.length) {
      return { view: "item", itemId: decodeURIComponent(rest.join("/")), hasRoute: true };
    }
    if (name === "shopping") return { view: "store-run", hasRoute: true };
    if (name === "one-time") return { view: "one-time", hasRoute: true };
    if (name === "dashboard") return { view: "dashboard", hasRoute: true };
    return { view: "dashboard", hasRoute: false };
  }

  function syncRoute(view, { replace = false } = {}) {
    const nextHash = viewRoute(view);
    if (window.location.hash === nextHash) return;
    const method = replace ? "replaceState" : "pushState";
    window.history[method]({ hoot: true }, "", nextHash);
  }

  function applyRoute() {
    const route = readRoute();
    const previousView = currentView;

    if (route.view === "item") {
      const item = state.items.find((entry) => entry.id === route.itemId);
      if (!item) {
        currentItemId = null;
        setView("dashboard", { replace: true });
        return;
      }

      if (previousView !== "item") {
        itemReturnView =
          previousView === "one-time" || item.isOneTime ? "one-time" : "dashboard";
      }
      currentItemId = item.id;
      setView("item", { updateUrl: false });
      return;
    }

    setView(route.view, { updateUrl: false });
  }

  function setView(view, { replace = false, updateUrl = true } = {}) {
    const previousView = currentView;
    let nextView = view;
    let activeItem = null;
    if (nextView === "item") {
      activeItem = state.items.find((entry) => entry.id === currentItemId) ?? null;
      if (activeItem) renderItemPage(activeItem);
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
    const headerLog = document.querySelector('.header-actions [data-dialog="log-purchase"]');
    if (headerLog) headerLog.hidden = nextView === "one-time";
    if (nextView === "dashboard") {
      renderCurrentTrip();
      syncNextUpDock();
    } else {
      updateMobileDock();
    }
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
        window.scrollTo(0, 0);
        syncRunHeaderState();
        $("#store-run-title")?.focus({ preventScroll: true });
      }
    } else if (previousView === "store-run" && nextView === "dashboard") {
      $('.nav-button[data-view="dashboard"]')?.focus();
    }
    if (updateUrl) syncRoute(nextView, { replace });
    document.title = activeItem ? `${activeItem.name} · Hoot` : DEFAULT_TITLE;
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
          `Next estimate ${formatFullDate(prediction.date)}.`,
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
          ? `Purchase updated. Next restock estimate ${formatFullDate(prediction.date)}.`
          : "Purchase updated.",
      );
    } catch {
      setFormBusy(form, false);
      setFormStatus(form, "Could not update the purchase. Try again.", "error");
    }
  }

  function openConfirm({ title, message, confirmLabel, onConfirm, onDismiss = null }) {
    $("#confirm-title").textContent = title;
    $("#confirm-message").textContent = message;
    $("#confirm-action").textContent = confirmLabel;
    pendingConfirm = onConfirm;
    pendingConfirmDismiss = onDismiss;
    showDialog($("#confirm-dialog"));
  }

  function toast(message, kind = "success", action = null) {
    const toastElement = document.createElement("div");
    toastElement.className = `toast toast-${kind}`;
    toastElement.textContent = message;

    let removeTimer = null;
    const dismiss = () => {
      if (removeTimer) {
        window.clearTimeout(removeTimer);
        removeTimer = null;
      }
      toastElement.remove();
    };

    if (action) {
      const actionButton = document.createElement("button");
      actionButton.className = "toast-action";
      actionButton.type = "button";
      actionButton.textContent = action.label;
      actionButton.addEventListener("click", async (event) => {
        event.stopPropagation();
        dismiss();
        await action.onAction();
      });
      toastElement.append(actionButton);
    }

    toastElement.addEventListener("click", () => {
      dismiss();
    });

    $("#toast-region").append(toastElement);
    const lifetime = action ? 6400 : 3400;
    toastElement.style.animationDuration = `${lifetime}ms`;
    removeTimer = window.setTimeout(dismiss, lifetime);
  }

  function showDialog(dialog, trigger = null) {
    lastDialogTrigger = trigger instanceof HTMLElement ? trigger : document.activeElement;
    if (!dialog.open) dialog.showModal();

    const autofocusTarget = dialog.querySelector("[data-autofocus]");
    if (autofocusTarget) {
      autofocusTarget.focus();
      return;
    }

    const isVisible = (control) => control.getClientRects().length > 0;
    // The checked path in a choice group is the first useful control; an unchecked sibling would misstate it.
    const checkedChoice = Array.from(
      dialog.querySelectorAll("input[type='radio']:checked:not(:disabled)"),
    ).find(isVisible);
    const firstControl = checkedChoice || Array.from(
      dialog.querySelectorAll(
        "input:not([type='hidden']):not(:disabled), select:not(:disabled), textarea:not(:disabled)",
      ),
    ).find(isVisible);
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
        setView(returnView, { replace: true });
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
      message: `Remove the purchase of ${targetPurchase.quantity} ${escapeHtml(item.unit || "unit")} on ${purchaseDateLabel}? Rhythm calculations and prediction dates will update immediately.`,
      confirmLabel: "Delete purchase",
      onConfirm: async () => {
        const { item: updatedItem, deletedPurchase, index } = await hootApi.deletePurchase(item.id, targetPurchase.id);
        render();
        const prediction = predictionFor(updatedItem);
        const nextRestockMsg = prediction
          ? ` Next restock recalculated to ${formatFullDate(prediction.date)}.`
          : "";
        toast(`Purchase on ${purchaseDateLabel} removed.${nextRestockMsg}`, "success", {
          label: "Undo",
          onAction: async () => {
            const restoredItem = await hootApi.restorePurchase(updatedItem.id, deletedPurchase, index);
            render();
            const restoredPrediction = predictionFor(restoredItem);
            const restoredMsg = restoredPrediction
              ? ` Restock estimate ${formatFullDate(restoredPrediction.date)}.`
              : "";
            toast(`Purchase restored.${restoredMsg}`);
          },
        });
      },
    });
    if (trigger instanceof HTMLElement) lastDialogTrigger = trigger;
  }

  function clearStoreRunSession() {
    try {
      window.localStorage.removeItem(STORE_RUN_KEY);
    } catch {
      // Ignore storage failures; the in-memory session still resets.
    }
    aisleOrder = [];
    saveAisleOrder([]);
    storeRun = {
      runDate: null,
      includeWatch: false,
      selected: new Map(),
      extraIds: new Set(),
      skippedIds: [],
      outOfStockIds: [],
      lastSkippedId: null,
      earlyRestocks: {},
    };
    outOfStockTodayIds.clear();
    saveOutOfStockToday();
    clearPlans();
  }

  function requestSampleSwitch(sampleId, trigger) {
    const nextSampleId = normalizeSampleId(sampleId);
    const activeSampleId = normalizeSampleId(state.sample);
    const select = $("#sample-select");

    if (nextSampleId === activeSampleId) {
      if (select) select.value = activeSampleId;
      return;
    }

    const sample = sampleFor(nextSampleId);
    openConfirm({
      title: `Load the ${sample.label.toLowerCase()}?`,
      message: `This replaces the current demo items with ${sample.itemCount} sample items and clears local changes.`,
      confirmLabel: "Switch sample",
      onConfirm: async () => {
        state = createDemoState(nextSampleId);
        saveState();
        clearStoreRunSession();
        currentItemId = null;
        itemReturnView = "dashboard";
        queueSearch = "";
        $("#queue-search").value = "";
        render();
        setView("dashboard", { replace: true });
        toast(`${sample.label} loaded.`);
      },
      onDismiss: () => {
        if (select) select.value = normalizeSampleId(state.sample);
      },
    });
    if (trigger instanceof HTMLElement) lastDialogTrigger = trigger;
  }

  function requestReset(trigger) {
    const sample = sampleFor(state.sample);
    openConfirm({
      title: "Reset the demo?",
      message: `This restores the ${sample.label.toLowerCase()} sample and clears local changes.`,
      confirmLabel: "Reset demo",
      onConfirm: async () => {
        await hootApi.resetDemo();
        clearStoreRunSession();
        currentItemId = null;
        itemReturnView = "dashboard";
        queueSearch = "";
        $("#queue-search").value = "";
        render();
        setView("dashboard", { replace: true });
        toast("Demo data restored.");
      },
    });
    if (trigger instanceof HTMLElement) lastDialogTrigger = trigger;
  }

  function bindEvents() {
    $$(".nav-button").forEach((button) => {
      button.addEventListener("click", () => setView(button.dataset.view));
    });

    window.addEventListener("popstate", applyRoute);
    window.addEventListener("hashchange", () => {
      const route = readRoute();
      const alreadyHere =
        route.view === "item"
          ? currentView === "item" && route.itemId === currentItemId
          : route.view === currentView;
      if (!route.hasRoute || !alreadyHere) applyRoute();
    });

    document.addEventListener("focusin", (event) => {
      const point = event.target.closest?.("[data-price-spark-point]");
      if (point) selectPricePoint(point);
    });

    document.addEventListener("keydown", (event) => {
      const point = event.target.closest?.("[data-price-spark-point]");
      if (!point) return;

      const spark = point.closest("[data-price-spark]");
      if (!spark) return;
      const points = $$("[data-price-spark-point]", spark);
      const index = points.indexOf(point);
      let nextIndex = index;

      if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        nextIndex = Math.max(0, index - 1);
      } else if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        nextIndex = Math.min(points.length - 1, index + 1);
      } else if (event.key === "Home") {
        nextIndex = 0;
      } else if (event.key === "End") {
        nextIndex = points.length - 1;
      } else {
        return;
      }

      event.preventDefault();
      points[nextIndex]?.focus();
    });

    document.addEventListener("click", (event) => {
      const target = event.target;
      const pricePoint = target.closest("[data-price-spark-point]");
      if (pricePoint) {
        selectPricePoint(pricePoint);
        return;
      }

      const pricePlot = target.closest("[data-price-spark-plot]");
      if (pricePlot) {
        selectNearestPricePoint(pricePlot, event);
        return;
      }

      const viewButton = target.closest("[data-view]");
      if (viewButton) {
        if (viewButton.tagName === "A") event.preventDefault();
        const nextView = viewButton.dataset.view;
        const replace = viewButton.dataset.history === "replace";
        setView(nextView, { replace });
        if (replace) $(`.nav-button[data-view="${nextView}"]`)?.focus();
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

      const orderButton = target.closest("[data-run-order]");
      if (orderButton) {
        const nextOrder = orderButton.dataset.runOrder === "aisle" ? "aisle" : "due";
        if (nextOrder !== runOrder) {
          runOrder = nextOrder;
          renderStoreRun();
          announceRun(nextOrder === "aisle" ? "Ordered by aisle." : "Ordered by due date.");
          document
            .querySelector(`[data-run-order="${nextOrder}"]`)
            ?.focus({ preventScroll: true });
        }
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
      } else if (action === "open-calendar-day") {
        calendarRange = MONTH_DAYS;
        openCalendarDay = actionButton.dataset.date;
        renderRestockCalendar();
        const panelTitle = $("#calendar-day-panel-title");
        if (panelTitle) {
          panelTitle.focus();
          panelTitle.scrollIntoView({ block: "nearest" });
        }
      } else if (action === "toggle-calendar-day") {
        const iso = actionButton.dataset.date;
        const wasOpen = openCalendarDay === iso;
        openCalendarDay = wasOpen ? null : iso;
        renderRestockCalendar();
        if (wasOpen) {
          $(`[data-action="toggle-calendar-day"][data-date="${iso}"]`)?.focus({
            preventScroll: true,
          });
        } else {
          const panelTitle = $("#calendar-day-panel-title");
          if (panelTitle) {
            panelTitle.focus();
            panelTitle.scrollIntoView({ block: "nearest" });
          }
        }
      } else if (action === "close-calendar-day") {
        const iso = openCalendarDay;
        openCalendarDay = null;
        renderRestockCalendar();
        if (iso) {
          $(`[data-action="toggle-calendar-day"][data-date="${iso}"]`)?.focus({
            preventScroll: true,
          });
        }
      } else if (action === "set-gravity-horizon") {
        gravityHorizon = Number(actionButton.dataset.days);
        renderRestockCalendar();
      } else if (action === "add-synergy-item") {
        if (openCalendarDay) {
          addSynergyItem(actionButton.dataset.id, parseDate(openCalendarDay), actionButton.dataset.due);
        }
      } else if (action === "sweep-all-synergy") {
        sweepAllSynergy(parseDate(actionButton.dataset.date));
      } else if (action === "toggle-plan-item" || (event.target && event.target.matches('[data-action="toggle-plan-item"]'))) {
        const checkbox = event.target;
        const itemId = checkbox.dataset.id;
        if (checkbox.checked) {
          dayPanelSelection.add(itemId);
        } else {
          dayPanelSelection.delete(itemId);
        }
        const roster = getDayPanelRoster(parseDate(openCalendarDay));
        const count = dayPanelSelection.size;
        const selectionEl = document.querySelector(".calendar-day-panel-selection");
        if (selectionEl) {
          selectionEl.textContent = `${count} of ${roster.length} ${roster.length === 1 ? "item" : "items"} selected`;
        }
        const startBtn = document.querySelector('[data-action="start-run-date"]');
        if (startBtn) {
          startBtn.textContent = `Start trip with ${count} ${count === 1 ? "item" : "items"}`;
        }
      } else if (action === "add-earlier-due") {
        const date = parseDate(actionButton.dataset.date);
        const iso = toISODate(date);
        const roster = getDayPanelRoster(date);
        const rosterIds = new Set(roster.map(({ item }) => item.id));
        const earlier = state.items
          .filter((item) => !item.isOneTime && !rosterIds.has(item.id))
          .map((item) => ({ item, prediction: predictionFor(item) }))
          .filter(({ prediction }) => prediction && toISODate(prediction.date) < iso);
        for (const { item } of earlier) {
          dayPanelExtraIds.add(item.id);
          dayPanelSelection.add(item.id);
        }
        renderRestockCalendar();
        toast(`Added ${earlier.length} earlier restocks.`);
      } else if (action === "start-run-date") {
        const date = parseDate(actionButton.dataset.date);
        const iso = toISODate(date);
        if (
          storeRun.runDate &&
          storeRun.runDate !== iso &&
          (storeRun.selected.size > 0 || (storeRun.extraIds && storeRun.extraIds.size > 0))
        ) {
          openConfirm({
            title: "Replace the active trip?",
            message: "Replace the active trip from another date with this new trip?",
            confirmLabel: "Start new trip",
            trigger: actionButton,
            onConfirm: () => {
              startRunFromDate(date);
            },
          });
        } else {
          startRunFromDate(date);
        }
      } else if (action === "save-plan-date") {
        savePlanForDate(parseDate(actionButton.dataset.date));
      } else if (action === "resume-plan") {
        resumePlan(actionButton.dataset.planId);
      } else if (action === "delete-plan") {
        const planId = actionButton.dataset.planId;
        openConfirm({
          title: "Delete plan?",
          message: "This removes the saved plan for this date.",
          confirmLabel: "Delete plan",
          trigger: actionButton,
          onConfirm: () => {
            plans = plans.filter((plan) => plan.id !== planId);
            savePlans();
            renderRestockCalendar();
            $("#calendar-day-panel-title")?.focus({ preventScroll: true });
            toast("Plan deleted.");
          },
        });
      } else if (action === "toggle-steady-fold") {
        steadyFoldExpanded = !steadyFoldExpanded;
        renderDashboard();
        $("#dashboard-list [data-action=\"toggle-steady-fold\"]")?.focus({ preventScroll: true });
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
      } else if (action === "still-have-some") {
        applyNextUpStillHasSome(itemId);
      } else if (action === "undo-next-up-correction") {
        undoNextUpCorrection(itemId, actionButton.dataset.purchaseId);
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
      } else if (action === "undo-last-run-item") {
        undoShoppingRunItem(itemId, actionButton);
      } else if (action === "resume-trip") {
        setView("store-run");
      } else if (action === "finish-trip") {
        finishShoppingRun(actionButton);
      } else if (action === "discard-trip") {
        requestDiscardTrip(actionButton);
      } else if (action === "save-trip-plan") {
        saveTripAsPlan();
      } else if (action === "open-aisle-order") {
        openAisleOrderDialog(actionButton);
      } else if (action === "open-rhythm-audit") {
        openRhythmAuditDialog(actionButton);
      } else if (action === "recalibrate-item-cadence") {
        recalibrateItemCadence(actionButton);
      } else if (action === "move-aisle-up") {
        moveAisleCategory(actionButton.dataset.category, -1, actionButton);
      } else if (action === "move-aisle-down") {
        moveAisleCategory(actionButton.dataset.category, 1, actionButton);
      } else if (action === "reset-aisle-order") {
        resetAisleOrder();
      } else if (action === "all-predictions-right") {
        markAllPredictionsRight(actionButton);
      } else if (action === "finish-run") {
        finishShoppingRun(actionButton);
      } else if (action === "finish-run-done") {
        completeShoppingRun();
      } else if (action === "finish-run-history") {
        completeShoppingRun({ openHistory: true });
      } else if (action === "toggle-watch-items") {
        toggleWatchItems(actionButton);
      } else if (action === "open-add-to-trip") {
        openAddToTripDialog(actionButton);
      } else if (action === "add-run-extra") {
        addRunExtra(itemId);
      } else if (action === "skip-run-item") {
        skipShoppingRunItem(itemId);
      } else if (action === "oos-run-item") {
        markStoreRunItemOutOfStock(itemId);
      } else if (action === "undo-skip-run-item") {
        undoSkipRunItem(itemId);
      }
    });

    document.addEventListener("change", async (event) => {
      const feedback = event.target.closest('[data-action="run-feedback"]');
      if (feedback) {
        recordRunPredictionFeedback(feedback.dataset.id, feedback.value, feedback);
        return;
      }

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

    $("#add-to-trip-search").addEventListener("input", (event) => {
      addToTripSearch = event.currentTarget.value;
      renderAddToTripOptions();
    });

    $$("[data-calendar-range]").forEach((button) => {
      button.addEventListener("click", () => {
        const range = Number(button.dataset.calendarRange);
        if (range === calendarRange) return;
        calendarRange = range;
        openCalendarDay = null;
        renderRestockCalendar();
      });
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || !openCalendarDay) return;
      if (document.querySelector("dialog[open]")) return;
      const iso = openCalendarDay;
      openCalendarDay = null;
      renderRestockCalendar();
      $(`[data-action="toggle-calendar-day"][data-date="${iso}"]`)?.focus({
        preventScroll: true,
      });
    });

    $$(".density-toggle [data-density]").forEach((button) => {
      button.addEventListener("click", () => setDensity(button.dataset.density));
    });

    $$("[data-dashboard-view-option]").forEach((button) => {
      button.addEventListener("click", () =>
        setDashboardView(button.dataset.dashboardViewOption),
      );
    });

    $("#add-item-form").addEventListener("submit", submitAddItem);
    $("#log-purchase-form").addEventListener("submit", submitLogPurchase);
    $("#edit-item-form").addEventListener("submit", submitEditItem);
    $("#edit-purchase-form").addEventListener("submit", submitEditPurchase);
    $("#reset-demo").addEventListener("click", (event) => requestReset(event.currentTarget));

    const sampleSelect = $("#sample-select");
    if (sampleSelect) {
      sampleSelect.innerHTML = DEMO_SAMPLES.map(
        (sample) =>
          `<option value="${escapeHtml(sample.id)}">${escapeHtml(sample.label)} (${sample.itemCount} items)</option>`,
      ).join("");
      sampleSelect.value = normalizeSampleId(state.sample);
      sampleSelect.addEventListener("change", (event) => {
        requestSampleSwitch(event.currentTarget.value, event.currentTarget);
      });
    }

    $("#finish-run-dialog").addEventListener("close", () => {
      pendingRunReceipt = null;
      $("#prediction-check-status").textContent = "";
    });

    $("#confirm-action").addEventListener("click", async () => {
      const action = pendingConfirm;
      pendingConfirm = null;
      pendingConfirmDismiss = null;
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

        if (dialog.id === "confirm-dialog") {
          const dismiss = pendingConfirmDismiss;
          pendingConfirm = null;
          pendingConfirmDismiss = null;
          if (dismiss) dismiss();
        }

        if (lastDialogTrigger instanceof HTMLElement) {
          lastDialogTrigger.focus({ preventScroll: true });
        }
        lastDialogTrigger = null;
      });
    });
  }

  function init() {
    if (!state.items.length) state = createDemoState(normalizeSampleId(state.sample));
    bindEvents();
    initNextUpObserver();
    window.addEventListener("scroll", syncRunHeaderState, { passive: true });
    syncRunHeaderState();
    render();

    const route = readRoute();
    if (!route.hasRoute || !window.history.state?.hoot) {
      window.history.replaceState(
        { hoot: true },
        "",
        route.hasRoute ? window.location.hash : "#/dashboard",
      );
    }
    applyRoute();
  }

  init();
})();

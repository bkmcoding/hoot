import {
  DAY_MS,
  EARLY_RESTOCK_SHIFT_DAYS,
  addDays,
  likelyWindowFor,
  parseDate,
  predictionFor,
  startOfDay,
  toISODate,
} from "./prediction.js";
import { DEMO_SAMPLES, createDemoStateFor } from "./demo-data.js";
import {
  buildShoppingRun,
  groupShoppingRun,
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

      return {
        includeWatch: Boolean(parsed.includeWatch),
        selected,
        extraIds: new Set(
          Array.isArray(parsed.extraIds)
            ? parsed.extraIds.filter((id) => typeof id === "string")
            : [],
        ),
        skippedIds,
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
          extraIds: Array.from(storeRun.extraIds),
          skippedIds: storeRun.skippedIds,
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
    extraIds: new Set(),
    skippedIds: [],
  };
  let currentView = "dashboard";
  let currentItemId = null;
  let itemReturnView = "dashboard";
  let editingItemId = null;
  let lastDialogTrigger = null;
  let pendingConfirm = null;
  let pendingConfirmDismiss = null;
  let queueSearch = "";
  let calendarRange = 7;
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
        </div>
        <strong class="item-row-due">${formatFullDate(prediction.date)}</strong>
        <div class="item-row-actions">
          <button class="btn btn-secondary" type="button" data-action="log" data-id="${escapeHtml(item.id)}">Log purchase</button>
          <button class="btn btn-ghost" type="button" data-action="detail" data-id="${escapeHtml(item.id)}" aria-label="Details for ${escapeHtml(item.name)}">Details</button>
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
    container.removeAttribute("data-card-count");
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
    return storeRun.skippedIds.includes(itemId);
  }

  function runRosterEntries() {
    const roster = new Map();

    for (const entry of buildShoppingRun(state.items, {
      includeWatch: storeRun.includeWatch,
      referenceDate: today,
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

  function renderStoreRunRow(entry) {
    const { item } = entry;
    const isLogged = storeRun.selected.has(item.id);

    if (isLogged) {
      return `
        <article class="store-run-row is-in-cart" data-item-id="${escapeHtml(item.id)}" aria-label="${escapeHtml(item.name)} logged this trip">
          <span class="run-check" aria-hidden="true">
            <svg viewBox="0 0 16 16" focusable="false"><path d="M3.5 8.4l2.9 2.9 6.1-6.6" /></svg>
          </span>
          <div class="store-run-row-main">
            <strong>${escapeHtml(item.name)}</strong>
            <small>Logged</small>
          </div>
        </article>
      `;
    }

    const prediction = item.isOneTime ? null : predictionFor(item, today);
    const zone = prediction ? prediction.zone : "learning";
    const statusLabel = prediction ? prediction.statusLabel : "Checklist";
    const timing = prediction ? formatDue(prediction.daysUntil) : "One-time need";
    const unitText = item.unit ? `${escapeHtml(item.unit)} · ` : "";

    return `
      <article class="store-run-row horizon-${escapeHtml(zone)}" data-item-id="${escapeHtml(item.id)}">
        <div class="store-run-row-main">
          <div class="store-run-row-heading">
            <strong>${escapeHtml(item.name)}</strong>
            <span class="status-chip status-${escapeHtml(zone)}">${escapeHtml(statusLabel)}</span>
          </div>
          <div class="store-run-row-meta">
            <small><span class="store-run-unit">${unitText}</span>${escapeHtml(timing)}</small>
            <button
              class="btn btn-ghost btn-sm store-run-skip"
              type="button"
              data-action="skip-run-item"
              data-id="${escapeHtml(item.id)}"
              aria-label="Not this trip for ${escapeHtml(item.name)}"
            >Not this trip</button>
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

    const skipped = storeRun.skippedIds
      .map((itemId) => state.items.find((item) => item.id === itemId))
      .filter(Boolean);

    if (!skipped.length) {
      container.hidden = true;
      container.replaceChildren();
      return [];
    }

    const names = skipped.map((item) => item.name);
    const visibleNames = names.slice(0, 3);
    let label = visibleNames.join(", ");
    if (names.length > 3) {
      label += ` and ${names.length - 3} more`;
    } else if (names.length > 1) {
      label = `${visibleNames.slice(0, -1).join(", ")} and ${visibleNames[visibleNames.length - 1]}`;
    }
    const last = skipped[skipped.length - 1];

    container.hidden = false;
    container.innerHTML = `
      <p><span>Skipped this trip</span> <strong>${escapeHtml(label)}</strong></p>
      <button
        class="btn btn-ghost btn-sm"
        type="button"
        data-action="undo-skip-run-item"
        data-id="${escapeHtml(last.id)}"
        aria-label="Undo skipping ${escapeHtml(last.name)}"
      >${skipped.length > 1 ? "Undo last" : "Undo"}</button>
    `;

    return skipped;
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
      const hasDraft = entries.length > 0;
      cart.innerHTML = `
        <header class="store-run-cart-header">
          <h2>This trip</h2>
          <span>0 items</span>
        </header>
        <div class="store-run-cart-empty">
          <strong>${hasDraft ? "Nothing logged yet" : "Nothing to log yet"}</strong>
          <p>${hasDraft
            ? "Log saves the change now; Undo reverses it."
            : "Logged items will appear here when the run has something to pick."}</p>
        </div>
      `;
      return;
    }

    cart.innerHTML = `
      <header class="store-run-cart-header">
        <h2>This trip</h2>
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

    const entries = runRosterEntries().filter((entry) => !isRunItemSkipped(entry.item.id));
    const groups = groupShoppingRun(entries);
    const summary = shoppingRunSummary(entries, new Set(storeRun.selected.keys()));

    $("#store-run-summary").innerHTML = `
      <article><span>Items</span><strong>${summary.total}</strong></article>
      <article><span>Logged</span><strong>${summary.inCart}</strong></article>
      <article><span>Left</span><strong>${summary.remaining}</strong></article>
    `;

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
            ${hasWatchRecovery ? `<button class="btn btn-secondary" type="button" data-action="toggle-watch-items" data-watch-style="long">Show Watch items</button>` : ""}
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
          ? "Hide Watch items"
          : "Hide Watch"
        : longLabel
          ? "Show Watch items"
          : "Show Watch";
      button.setAttribute(
        "aria-label",
        storeRun.includeWatch ? "Hide Watch items" : "Show Watch items",
      );
      button.setAttribute("aria-pressed", String(storeRun.includeWatch));
    }
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
    const prediction = item.isOneTime ? null : predictionFor(item, today);

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
          predictedDate: prediction ? toISODate(prediction.date) : null,
        });
      }

      saveStoreRun();
      render();
      announceRun(
        `${item.name} logged. ${storeRun.selected.size} logged this trip.`,
      );
      focusNextRunRow(itemId);
    } catch {
      toast(`Could not log ${item.name}. Try again.`, "error");
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
    if (skipIndex === -1) return;
    const item = state.items.find((entry) => entry.id === itemId);

    storeRun.skippedIds.splice(skipIndex, 1);
    saveStoreRun();
    render();
    announceRun(
      `${item?.name ?? "Item"} restored to this trip. ${storeRun.skippedIds.length} skipped.`,
    );

    if (!focusRunRowItem(itemId)) {
      (
        $('.store-run-skipped [data-action="undo-skip-run-item"]') ??
        $('.store-run-actions [data-action="open-add-to-trip"]')
      )?.focus();
    }
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

  function finishShoppingRun(trigger) {
    const receipt = buildRunReceipt();
    if (!receipt.entries.length) return;

    const count = receipt.entries.length;
    const checkCount = receipt.entries.filter(
      ({ selection }) => selection?.type === "tracked" && selection.predictedDate,
    ).length;
    const itemWord = count === 1 ? "item" : "items";
    pendingRunReceipt = receipt;

    const skippedText = receipt.skippedCount
      ? ` ${receipt.skippedCount} skipped.`
      : "";

    $("#finish-run-title").textContent = "Shopping run finished";
    $("#finish-run-message").textContent = `${count} ${itemWord} logged.${skippedText}${
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
    $("#finish-run-hint").hidden = checkCount === 0;
    $("#prediction-check-status").textContent = "";
    $("#finish-run-list").innerHTML = receipt.entries
      .map(({ item, purchase, selection }) => {
        const detail = purchase
          ? `${formatQuantity(purchase.quantity, item.unit)} · ${formatPurchasePrice(purchase.price)}`
          : "One-time checklist";
        const check =
          selection?.type === "tracked" && selection.predictedDate
            ? predictionCheckMarkup(item, purchase, selection.predictedDate)
            : "";
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

  function completeShoppingRun({ openHistory = false } = {}) {
    const receipt = pendingRunReceipt;
    pendingRunReceipt = null;
    lastDialogTrigger = null;
    closeDialog($("#finish-run-dialog"));
    storeRun = {
      includeWatch: false,
      selected: new Map(),
      extraIds: new Set(),
      skippedIds: [],
    };
    saveStoreRun();

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
            ${rhythmLedger(item, prediction)}
          </div>
          <aside class="item-rail" aria-label="Pattern, confidence, and spending details">
            ${patternCard(item, prediction)}
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
    const sampleSelect = $("#sample-select");
    if (sampleSelect) sampleSelect.value = document.body.dataset.sample;
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
    storeRun = {
      includeWatch: false,
      selected: new Map(),
      extraIds: new Set(),
      skippedIds: [],
    };
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
      message: `This restores the ${sample.label.toLowerCase()} sample items and clears local changes.`,
      confirmLabel: "Reset demo",
      onConfirm: async () => {
        await hootApi.resetDemo();
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
        renderRestockCalendar();
      });
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

(() => {
  "use strict";

  const STORAGE_KEY = "hoot-demo-state-v1";
  const DAY_MS = 24 * 60 * 60 * 1000;

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

  function startOfDay(date = new Date()) {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);
    return copy;
  }

  function addDays(date, days) {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + days);
    return copy;
  }

  function toISODate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function parseDate(value) {
    if (value instanceof Date) return startOfDay(value);
    return startOfDay(new Date(`${value}T00:00:00`));
  }

  const today = startOfDay();
  const daysAgoISO = (days) => toISODate(addDays(today, -days));

  const shortDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
  const longDate = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const weekdayDate = new Intl.DateTimeFormat("en-US", { weekday: "short" });
  const formatDate = (date) => shortDate.format(date);
  const formatFullDate = (date) => longDate.format(date);
  const formatWeekday = (date) => weekdayDate.format(date);

  function formatMoney(value) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: value % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(value);
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

  let state = loadState() ?? createDemoState();
  let currentView = "dashboard";
  let currentItemId = null;
  let itemReturnView = "dashboard";
  let editingItemId = null;
  let lastDialogTrigger = null;
  let pendingConfirm = null;

  function makeId(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  function productInfoFor(item) {
    return (
      item.productInfo ?? {
        barcode: null,
        source: null,
        status: "not-connected",
        brand: null,
        size: null,
        imageUrl: null,
        nutrition: null,
      }
    );
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
    async getProductInfo(id) {
      const item = state.items.find((entry) => entry.id === id);
      if (!item) throw new Error("Item not found");
      return clone(productInfoFor(item));
    },
    async addItem(input) {
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
        productInfo: productInfoFor({}),
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

  function predictionFor(item) {
    if (item.isOneTime) return null;

    const purchaseDates = item.purchases
      .map((purchase) => parseDate(purchase.date))
      .sort((left, right) => left - right);
    const origin = purchaseDates.length ? purchaseDates[0] : parseDate(item.createdAt);
    const latest = purchaseDates.length ? purchaseDates[purchaseDates.length - 1] : origin;
    const purchaseCount = purchaseDates.length;
    const intervals = purchaseDates.slice(1).map((date, index) => {
      const previous = purchaseDates[index];
      return Math.max(1, Math.round((date - previous) / DAY_MS));
    });
    const averageInterval = intervals.length
      ? intervals.reduce((sum, value) => sum + value, 0) / intervals.length
      : null;

    let predictedDate;
    let method;
    let technicalMethod;
    let modelVersion;
    let slope = null;
    let intercept = null;
    let rSquared = null;
    let fittedDates = null;
    let projectionMode = "manual";

    if (purchaseCount < 3) {
      predictedDate = addDays(latest, item.reorderThresholdDays);
      method = `Manual ${item.reorderThresholdDays}-day estimate`;
      technicalMethod = "Manual estimate";
      modelVersion = "demo-manual-v1";
    } else {
      const yValues = purchaseDates.map((date) => Math.round((date - origin) / DAY_MS));
      const xValues = yValues.map((_, index) => index);
      const xMean = xValues.reduce((sum, value) => sum + value, 0) / xValues.length;
      const yMean = yValues.reduce((sum, value) => sum + value, 0) / yValues.length;
      const numerator = xValues.reduce(
        (sum, value, index) => sum + (value - xMean) * (yValues[index] - yMean),
        0,
      );
      const denominator = xValues.reduce((sum, value) => sum + (value - xMean) ** 2, 0);
      const fittedSlope = denominator === 0 ? 0 : numerator / denominator;
      const fittedIntercept = yMean - fittedSlope * xMean;
      const nextY = fittedIntercept + fittedSlope * yValues.length;
      const lastY = yValues[yValues.length - 1];
      const fittedYValues = xValues.map((value) => fittedIntercept + fittedSlope * value);
      const residualSum = yValues.reduce(
        (sum, value, index) => sum + (value - fittedYValues[index]) ** 2,
        0,
      );
      const totalSum = yValues.reduce((sum, value) => sum + (value - yMean) ** 2, 0);
      const fittedR = totalSum > 0 ? 1 - residualSum / totalSum : null;

      if (
        !Number.isFinite(fittedSlope) ||
        fittedSlope <= 0 ||
        !Number.isFinite(nextY) ||
        nextY <= lastY
      ) {
        const averageGap = Math.max(
          1,
          Math.round((latest - origin) / (purchaseCount - 1)),
        );
        predictedDate = addDays(latest, averageGap);
        method = `Average interval from ${purchaseCount} purchases`;
        technicalMethod = "Average interval fallback";
      } else {
        predictedDate = addDays(origin, Math.round(nextY));
        method = `Learned from ${purchaseCount} purchases`;
        technicalMethod = "Linear regression";
        slope = fittedSlope;
        intercept = fittedIntercept;
        rSquared = Number.isFinite(fittedR) ? fittedR : null;
        fittedDates = fittedYValues.map((value) => addDays(origin, Math.round(value)));
        projectionMode = "regression";
      }
      modelVersion = "demo-ols-v1";
    }

    const daysUntil = Math.ceil((predictedDate - today) / DAY_MS);

    const zone =
      daysUntil < 0
        ? "overdue"
        : daysUntil <= 3
          ? "buy-now"
          : daysUntil <= 7
            ? "watch"
            : "steady";
    const status = zone;
    const statusLabel =
      zone === "overdue"
        ? "Overdue"
        : zone === "buy-now"
          ? "Buy now"
          : zone === "watch"
            ? "Watch"
            : "Steady";
    const maturity = purchaseCount < 3 ? "learning" : "learned";
    const fitStrength =
      rSquared === null
        ? null
        : rSquared >= 0.7
          ? "strong"
          : rSquared >= 0.4
            ? "moderate"
            : "loose";
    const confidence =
      purchaseCount === 0
        ? "No purchases yet"
        : purchaseCount < 3
        ? `Learning · ${purchaseCount} of 3 purchases`
        : rSquared === null
          ? "Moderate rhythm"
          : `${fitStrength.charAt(0).toUpperCase()}${fitStrength.slice(1)} rhythm`;

    return {
      date: predictedDate,
      daysUntil,
      zone,
      status,
      statusLabel,
      maturity,
      confidence,
      technicalMethod,
      modelVersion,
      method,
      purchaseCount,
      origin,
      latest,
      purchaseDates,
      intervals,
      averageInterval,
      slope,
      intercept,
      rSquared,
      fittedDates,
      projectionMode,
    };
  }

  function formatDue(daysUntil) {
    if (daysUntil < 0) {
      const days = Math.abs(daysUntil);
      return `${days} day${days === 1 ? "" : "s"} overdue`;
    }
    if (daysUntil === 0) return "Due today";
    if (daysUntil === 1) return "Tomorrow";
    return `In ${daysUntil} days`;
  }

  function renderStats() {
    const tracked = state.items.filter((item) => !item.isOneTime);
    const oneTime = state.items.filter((item) => item.isOneTime);
    const predictions = tracked.map(predictionFor);
    const attention = predictions.filter((prediction) => prediction.daysUntil <= 3).length;
    const established = tracked.filter((item) => item.purchases.length >= 3).length;

    $("#stat-tracked").textContent = String(tracked.length);
    $("#stat-attention").textContent = String(attention);
    $("#stat-established").textContent = String(established);
    $("#stat-one-time").textContent = String(oneTime.length);
  }

  function dashboardCard(item, prediction) {
    const todayPosition = clamp((7 + prediction.daysUntil) / 21, 0, 1) * 100;
    const unitText = item.unit ? ` · ${escapeHtml(item.unit)}` : "";
    return `
      <article class="item-card horizon-${escapeHtml(prediction.zone)}" data-item-id="${escapeHtml(item.id)}">
        <div class="item-card-header">
          <div>
            <h3>
              <button
                class="item-title-button"
                type="button"
                data-action="detail"
                data-id="${escapeHtml(item.id)}"
              >${escapeHtml(item.name)}</button>
            </h3>
            <p>${escapeHtml(item.category)}${unitText}</p>
          </div>
          <div class="status-stack">
            <span class="status-chip status-${escapeHtml(prediction.zone)}">${escapeHtml(prediction.statusLabel)}</span>
          </div>
        </div>
        <div
          class="restock-horizon"
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
            <span class="horizon-today" style="left:${todayPosition.toFixed(2)}%">
              <span>Today</span>
            </span>
          </div>
          <div class="horizon-labels" aria-hidden="true">
            <span>Overdue</span>
            <span>Buy now</span>
            <span>Watch</span>
            <span>Steady</span>
          </div>
        </div>
        <div class="item-card-footer">
          <div class="item-actions">
            <button class="btn btn-secondary" type="button" data-action="log" data-id="${escapeHtml(item.id)}">Log purchase</button>
            <button class="btn btn-ghost" type="button" data-action="detail" data-id="${escapeHtml(item.id)}">Details</button>
          </div>
        </div>
      </article>
    `;
  }

  function renderDashboard() {
    const tracked = state.items
      .filter((item) => !item.isOneTime)
      .map((item) => ({ item, prediction: predictionFor(item) }))
      .sort((left, right) => left.prediction.date - right.prediction.date);

    const container = $("#dashboard-list");
    if (!tracked.length) {
      container.innerHTML = `
        <div class="empty-state">
          <h3>No tracked items yet</h3>
          <p>Add a household staple and Hoot will start learning its restock rhythm.</p>
          <button class="btn btn-primary" type="button" data-action="add-item">Add your first item</button>
        </div>
      `;
      return;
    }

    container.innerHTML = tracked
      .map(({ item, prediction }) => dashboardCard(item, prediction))
      .join("");
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

  function renderRestockCalendar() {
    const tracked = state.items
      .filter((item) => !item.isOneTime)
      .map((item) => ({ item, prediction: predictionFor(item) }));
    const container = $("#restock-calendar");

    if (!tracked.length) {
      container.innerHTML = `<p class="calendar-empty">Add a tracked item to build its restock calendar.</p>`;
      return;
    }

    const overdue = tracked.filter(({ prediction }) => prediction.daysUntil < 0);
    const dayCards = Array.from({ length: 14 }, (_, index) => {
      const date = addDays(today, index);
      const dueItems = tracked.filter(
        ({ prediction }) => toISODate(prediction.date) === toISODate(date),
      );
      const items = dueItems.length
        ? dueItems.map(({ item, prediction }) => calendarItemButton(item, prediction)).join("")
        : `<li><span class="calendar-clear">Clear</span></li>`;

      return `
        <article class="calendar-day ${index === 0 ? "is-today" : ""}" role="listitem">
          <header>
            <span>${formatWeekday(date)}</span>
            <strong>${date.getDate()}</strong>
            <small>${formatDate(date)}</small>
          </header>
          <ul class="calendar-items">${items}</ul>
        </article>
      `;
    });

    const overdueCard = overdue.length
      ? `
        <article class="calendar-day calendar-overdue" role="listitem">
          <header>
            <span>Past due</span>
            <strong>${overdue.length}</strong>
            <small>Needs restock</small>
          </header>
          <ul class="calendar-items">
            ${overdue.map(({ item, prediction }) => calendarItemButton(item, prediction)).join("")}
          </ul>
        </article>
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
          <h3>No one-time items</h3>
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
          <button class="btn btn-ghost" type="button" data-action="detail" data-id="${escapeHtml(item.id)}">Details</button>
        </article>
      `,
      )
      .join("");
  }

  function predictionChart(item, prediction) {
    if (!prediction) {
      return `
        <div class="chart-empty">
          <strong>Prediction is intentionally off</strong>
          <p>One-time items stay on a simple checklist so they cannot distort recurring-item estimates.</p>
        </div>
      `;
    }
    if (!prediction.purchaseDates.length) {
      return `
        <div class="chart-empty">
          <strong>Waiting for the first purchase</strong>
          <p>Log a purchase and Hoot will begin placing this item on its restock timeline.</p>
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
          Purchase dates shape Hoot’s rhythm; the dashed segment projects that rhythm to the next likely restock.
        </figcaption>
      </figure>
    `;
  }

  function modelExplanation(item, prediction) {
    if (!prediction) {
      return "One-time items stay on a simple checklist, so Hoot never tries to learn a rhythm from them.";
    }
    if (!prediction.purchaseDates.length) {
      return `No purchase has been logged yet. Hoot starts from your ${item.reorderThresholdDays}-day typical interval, and a logged purchase gives it a real date to work from.`;
    }
    if (prediction.maturity === "learning") {
      return `Hoot is using your ${item.reorderThresholdDays}-day typical interval until this item has three purchases. Each logged purchase gives Hoot another date to learn from.`;
    }
    if (prediction.slope !== null) {
      return `Hoot has learned from ${prediction.purchaseCount} purchases and estimates the next restock for ${formatFullDate(prediction.date)}. The current rhythm moves about ${prediction.slope.toFixed(1)} days between purchases, and a new purchase can change that date.`;
    }
    return `Hoot averaged the gaps between ${prediction.purchaseCount} purchases and estimates the next restock for ${formatFullDate(prediction.date)}. A new purchase can change that date.`;
  }

  function fitQualityLabel(prediction) {
    if (!prediction || prediction.rSquared === null || prediction.rSquared === undefined) {
      return "Not available";
    }

    const strength = prediction.rSquared >= 0.7 ? "Strong" : prediction.rSquared >= 0.4 ? "Moderate" : "Loose";
    return `${strength} fit · ${Math.round(prediction.rSquared * 100)}% R²`;
  }

  function renderItemPage(item) {
    const content = $("#item-analysis-content");
    const prediction = predictionFor(item);
    const productInfo = productInfoFor(item);
    const purchases = [...item.purchases].sort(
      (left, right) => parseDate(left.date) - parseDate(right.date),
    );
    const historyRows = purchases
      .map(
        (purchase) => `
          <tr>
            <td data-label="Date">${formatFullDate(parseDate(purchase.date))}</td>
            <td data-label="Quantity">${purchase.quantity} ${escapeHtml(item.unit || "unit")}</td>
            <td data-label="Total price">${formatMoney(purchase.price)}</td>
          </tr>
        `,
      )
      .join("");
    const history = `
      <table class="history-table">
        <caption> Purchase history for ${escapeHtml(item.name)}</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Quantity</th>
            <th scope="col">Total price</th>
          </tr>
        </thead>
        <tbody>
          ${
            historyRows ||
            `<tr><td colspan="3" class="history-empty">No purchase history yet.</td></tr>`
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
    const productStatusLabel =
      productInfo.status === "not-connected" ? "Not connected" : productInfo.status;

    content.innerHTML = `
      <div class="item-page">
        <button class="btn btn-secondary back-button" type="button" data-view="${escapeHtml(itemReturnView)}">
          ← ${backLabel}
        </button>
        <header class="item-page-header">
          <div>
            <h1 id="item-analysis-title">${escapeHtml(item.name)}</h1>
            <p>${escapeHtml(item.category)} · ${escapeHtml(item.unit || "No unit specified")} · ${purchases.length} logged purchase${purchases.length === 1 ? "" : "s"}</p>
          </div>
          <span class="status-chip ${prediction ? `status-${escapeHtml(prediction.zone)}` : "status-learning"}">
            ${prediction ? escapeHtml(prediction.statusLabel) : "Checklist"}
          </span>
        </header>

        <div class="analysis-grid">
        <article class="analysis-card">
          ${
            item.isOneTime
              ? `<span>One-time item</span><strong>Excluded from prediction</strong><p>Hoot keeps this on a simple checklist so it never distorts recurring-item estimates.</p>`
              : `<span>Next predicted restock</span><strong>${formatFullDate(prediction.date)} · ${formatDue(prediction.daysUntil)}</strong>
                <p>${escapeHtml(prediction.confidence)}</p>
                <details class="estimate-disclosure">
                  <summary>How this estimate works</summary>
                  <p>${escapeHtml(modelExplanation(item, prediction))}</p>
                  <dl class="analysis-facts">
                    <div><dt>Method</dt><dd>${escapeHtml(prediction.technicalMethod)}</dd></div>
                    <div><dt>Model</dt><dd>${escapeHtml(prediction.modelVersion)}</dd></div>
                    <div><dt>Fit quality</dt><dd>${escapeHtml(fitQualityLabel(prediction))}</dd></div>
                  </dl>
                </details>`
          }
        </article>

        <article class="analysis-card">
          <span>Rhythm</span>
          <strong>${averageInterval ? `${averageInterval.toFixed(1)} days average` : "Building rhythm"}</strong>
          <dl class="analysis-facts">
            <div><dt>Interval range</dt><dd>${intervalRange}</dd></div>
            <div><dt>Learning progress</dt><dd>${learningProgress}</dd></div>
            <div><dt>Estimate source</dt><dd>${escapeHtml(prediction.method)}</dd></div>
          </dl>
        </article>

        <article class="analysis-card product-card">
          <span>Product intelligence</span>
          <strong>Barcode lookup not connected</strong>
          <p>Future barcode enrichment can attach brand, size, image, and nutrition details to this item.</p>
          <dl class="analysis-facts">
            <div><dt>Barcode</dt><dd>${productInfo.barcode ? escapeHtml(productInfo.barcode) : "Awaiting scan"}</dd></div>
            <div><dt>Source</dt><dd>${productInfo.source ? escapeHtml(productInfo.source) : "Future API"}</dd></div>
            <div><dt>Status</dt><dd>${escapeHtml(productStatusLabel)}</dd></div>
          </dl>
        </article>
        </div>

        <section class="chart-panel">
          <div class="section-heading">
            <div>
              <h2>How Hoot reads this rhythm</h2>
            </div>
          </div>
          ${predictionChart(item, prediction)}
        </section>

        <section>
          <h3>Purchase history</h3>
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
    const tracked = state.items.filter((item) => !item.isOneTime);
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
    if (currentView === "item" && currentItemId) {
      const item = state.items.find((entry) => entry.id === currentItemId);
      if (item) renderItemPage(item);
    }
  }

  function setView(view) {
    let nextView = view;
    if (nextView === "item") {
      const item = state.items.find((entry) => entry.id === currentItemId);
      if (item) renderItemPage(item);
      else nextView = itemReturnView || "dashboard";
    }
    currentView = nextView;
    $$(".app-view").forEach((section) => {
      section.classList.toggle("is-active", section.id === `view-${nextView}`);
    });
    $$(".nav-button").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.view === nextView);
      if (button.dataset.view === nextView) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
  }

  function clearFieldErrors(form) {
    $$(".field-error", form).forEach((error) => {
      error.textContent = "";
    });
    $$("input[aria-invalid]", form).forEach((input) => {
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

  function updateAddThresholdState(isOneTime) {
    const thresholdInput = $("#add-threshold");
    const hint = $("#add-threshold-hint");
    thresholdInput.disabled = isOneTime;
    thresholdInput.value = isOneTime ? "" : "14";
    hint.textContent = isOneTime
      ? "Not used for one-time items."
      : "Days between typical purchases.";
  }

  function readAddItemForm() {
    const form = $("#add-item-form");
    const nameInput = $("#add-name");
    const thresholdInput = $("#add-threshold");
    const isOneTime = $("#add-one-time").checked;
    const threshold = Number(thresholdInput.value);

    clearFieldErrors(form);
    if (!nameInput.value.trim()) {
      setFieldError(nameInput, "Give the item a name.");
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
    $("#add-one-time").checked = isOneTime;
    updateAddThresholdState(isOneTime);
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

  function prepareLogPurchaseDialog(itemId = null) {
    const tracked = state.items.filter((item) => !item.isOneTime);
    const form = $("#log-purchase-form");
    const fields = $("#purchase-fields");
    const emptyState = $("#purchase-empty-state");
    const submitButton = form.querySelector('[type="submit"]');

    form.reset();
    resetDialogFormState(form);
    updatePurchaseSelect(tracked.length ? itemId || tracked[0].id : null);

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
    $("#purchase-date").max = toISODate(startOfDay());
    $("#purchase-date").value = toISODate(startOfDay());
    $("#purchase-quantity").value = "1";
    $("#purchase-price").value = "0";
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
    const price = Number(priceInput.value);
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
    if (!Number.isFinite(price) || price < 0) {
      setFieldError(priceInput, "Enter a price of zero or more.");
      priceInput.focus();
      setFormStatus(form, "Fix the highlighted field.", "error");
      return;
    }

    setFormBusy(form, true);
    try {
      await hootApi.logPurchase(itemSelect.value, {
        date: toISODate(purchaseDate),
        quantity,
        price,
      });
      render();
      setFormStatus(form, "Saved.");
      window.setTimeout(() => closeDialog($("#log-purchase-dialog")), 240);
      toast("Purchase logged. Prediction updated.");
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

    if (!nameInput.value.trim()) {
      setFieldError(nameInput, "Give the item a name.");
      nameInput.focus();
      return;
    }
    if (!item.isOneTime && (!Number.isFinite(threshold) || threshold < 1 || threshold > 365)) {
      setFieldError(thresholdInput, "Enter a typical restock interval between 1 and 365 days.");
      thresholdInput.focus();
      return;
    }

    const updatedItem = await hootApi.updateItem(item.id, {
      name: nameInput.value.trim(),
      category: $("#edit-category").value,
      unit: $("#edit-unit").value.trim(),
      reorderThresholdDays: item.isOneTime ? 0 : Math.round(threshold),
    });

    render();
    closeDialog($("#edit-item-dialog"));
    toast("Item updated.");
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

  function requestReset(trigger) {
    openConfirm({
      title: "Reset the demo?",
      message: "This restores the built-in sample items and clears local changes.",
      confirmLabel: "Reset demo",
      onConfirm: async () => {
        await hootApi.resetDemo();
        currentItemId = null;
        itemReturnView = "dashboard";
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
          prepareAddItemDialog(false);
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

      if (action === "add-item") {
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
      } else if (action === "edit") {
        prepareEditItemDialog(itemId);
        showDialog($("#edit-item-dialog"), actionButton);
      } else if (action === "delete") {
        requestDelete(itemId, actionButton);
      }
    });

    document.addEventListener("change", async (event) => {
      const input = event.target.closest('[data-action="toggle-one-time"]');
      if (!input) return;
      const item = await hootApi.toggleOneTime(input.dataset.id, input.checked);
      render();
      toast(item.completed ? `${item.name} checked off.` : `${item.name} restored.`);
    });

    $("#add-one-time").addEventListener("change", (event) => {
      const isOneTime = event.target.checked;
      updateAddThresholdState(isOneTime);
      setFormStatus($("#add-item-form"), "");
      if (isOneTime) {
        const thresholdInput = $("#add-threshold");
        thresholdInput.removeAttribute("aria-invalid");
        $("#add-threshold-error").textContent = "";
      }
    });

    $("#add-item-form").addEventListener("submit", submitAddItem);
    $("#log-purchase-form").addEventListener("submit", submitLogPurchase);
    $("#edit-item-form").addEventListener("submit", submitEditItem);

    $("#reset-demo").addEventListener("click", (event) => requestReset(event.currentTarget));

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
    render();
    setView(currentView);
  }

  init();
})();

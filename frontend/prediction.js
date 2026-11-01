export const DAY_MS = 24 * 60 * 60 * 1000;
export const EARLY_RESTOCK_SHIFT_DAYS = 3;

export function startOfDay(date = new Date()) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDate(value) {
  if (value instanceof Date) return startOfDay(value);
  return startOfDay(new Date(`${value}T00:00:00`));
}

export function predictionFor(item, referenceDate = startOfDay()) {
  if (item.isOneTime) return null;

  const today = startOfDay(referenceDate);
  const sortedPurchases = [...item.purchases].sort(
    (left, right) => parseDate(left.date) - parseDate(right.date),
  );
  const purchaseDates = sortedPurchases.map((purchase) => parseDate(purchase.date));
  const effectiveDates = sortedPurchases.map((purchase) =>
    parseDate(purchase.effectiveStartDate ?? purchase.date),
  );
  const latestPurchase = sortedPurchases[sortedPurchases.length - 1] ?? null;
  const recordedShiftDays = Number(latestPurchase?.feedback?.shiftDays);
  const feedbackShiftDays =
    latestPurchase?.feedback?.verdict === "early"
      ? Number.isFinite(recordedShiftDays) && recordedShiftDays > 0
        ? Math.round(recordedShiftDays)
        : EARLY_RESTOCK_SHIFT_DAYS
      : 0;
  const origin = effectiveDates.length ? effectiveDates[0] : parseDate(item.createdAt);
  const latest = effectiveDates.length ? effectiveDates[effectiveDates.length - 1] : origin;
  const purchaseCount = effectiveDates.length;
  const intervals = effectiveDates.slice(1).map((date, index) => {
    const previous = effectiveDates[index];
    return Math.max(1, Math.round((date - previous) / DAY_MS));
  });
  const averageInterval = intervals.length
    ? intervals.reduce((sum, value) => sum + value, 0) / intervals.length
    : null;

  const pivotDate = item.cadencePivotDate ? parseDate(item.cadencePivotDate) : null;
  const isRecalibrated = Boolean(pivotDate);
  const activeEffectiveDates = pivotDate
    ? sortedPurchases
        .filter((p) => parseDate(p.date) >= pivotDate)
        .map((p) => parseDate(p.effectiveStartDate ?? p.date))
    : effectiveDates;
  const activeCount = activeEffectiveDates.length;

  let predictedDate;
  let method;
  let slope = null;
  let intercept = null;
  let rSquared = null;
  let fittedDates = null;
  let projectionMode = "manual";

  if (isRecalibrated ? activeCount < 3 : purchaseCount < 3) {
    predictedDate = addDays(latest, item.reorderThresholdDays);
    method = isRecalibrated
      ? `Recalibrated baseline (${item.reorderThresholdDays}-day estimate)`
      : `Manual ${item.reorderThresholdDays}-day estimate`;
  } else {
    const yOrigin = activeEffectiveDates.length ? activeEffectiveDates[0] : origin;
    const yValues = activeEffectiveDates.map((date) => Math.round((date - yOrigin) / DAY_MS));
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
    } else {
      predictedDate = addDays(yOrigin, Math.round(nextY));
      method = isRecalibrated ? `Recalibrated from ${activeCount} purchases` : `Learned from ${purchaseCount} purchases`;
      slope = fittedSlope;
      intercept = fittedIntercept;
      rSquared = Number.isFinite(fittedR) ? fittedR : null;
      fittedDates = fittedYValues.map((value) => addDays(yOrigin, Math.round(value)));
      projectionMode = "regression";
    }
  }

  if (feedbackShiftDays) predictedDate = addDays(predictedDate, feedbackShiftDays);

  // Local midnights can be 23 or 25 hours apart across a DST change; round the
  // calendar-day distance so a three-day move never reads as four.
  const daysUntil = Math.round((predictedDate - today) / DAY_MS);
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
  const maturity = (isRecalibrated ? activeCount < 3 : purchaseCount < 3) ? "learning" : "learned";
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
      : isRecalibrated && activeCount < 3
        ? `Recalibrated · ${activeCount} of 3 purchases`
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
    feedbackShiftDays,
    cadencePivotDate: item.cadencePivotDate ?? null,
  };
}

export function likelyWindowFor(prediction) {
  if (!prediction || prediction.intervals.length < 2) return null;

  const shortestGap = Math.min(...prediction.intervals);
  const longestGap = Math.max(...prediction.intervals);
  const earliest = addDays(prediction.latest, shortestGap);
  const latest = addDays(prediction.latest, longestGap);
  const start = new Date(Math.min(earliest.getTime(), prediction.date.getTime()));
  const end = new Date(Math.max(latest.getTime(), prediction.date.getTime()));

  return {
    start,
    end,
    shortestGap,
    longestGap,
    wide: (end - start) / DAY_MS > 7,
  };
}

export function rhythmDriftFor(item) {
  if (!item || item.isOneTime) return null;

  const sortedPurchases = [...item.purchases].sort(
    (left, right) => parseDate(left.date) - parseDate(right.date),
  );
  if (sortedPurchases.length < 2) {
    return {
      mad: null,
      netBias: null,
      trend: "learning",
      label: "Learning rhythm",
      baselineInterval: item.reorderThresholdDays ?? 7,
      recentInterval: item.reorderThresholdDays ?? 7,
      diffDays: 0,
      isDrifting: false,
      cycleCount: 0,
      stdDev: null,
    };
  }

  const effectiveDates = sortedPurchases.map((purchase) =>
    parseDate(purchase.effectiveStartDate ?? purchase.date),
  );

  const intervals = effectiveDates.slice(1).map((date, index) => {
    const previous = effectiveDates[index];
    return Math.max(1, Math.round((date - previous) / DAY_MS));
  });

  const cycleCount = intervals.length;
  const baselineInterval =
    item.reorderThresholdDays ??
    Math.round(intervals.reduce((sum, val) => sum + val, 0) / intervals.length);

  const deltas = [];
  let runningSum = 0;
  for (let k = 0; k < intervals.length; k += 1) {
    const expected =
      k === 0
        ? (item.reorderThresholdDays ?? intervals[0])
        : Math.round(runningSum / k);
    deltas.push(intervals[k] - expected);
    runningSum += intervals[k];
  }

  const mad = Math.round(
    (deltas.reduce((sum, d) => sum + Math.abs(d), 0) / deltas.length) * 10,
  ) / 10;
  const netBias = Math.round(
    (deltas.reduce((sum, d) => sum + d, 0) / deltas.length) * 10,
  ) / 10;

  const recentWindowSize = Math.min(3, Math.max(2, Math.floor(intervals.length / 2)));
  const recentSlice = intervals.slice(-recentWindowSize);
  const recentInterval = Math.round(
    recentSlice.reduce((sum, val) => sum + val, 0) / recentSlice.length,
  );
  const diffDays = recentInterval - baselineInterval;

  const variance =
    intervals.reduce((sum, val) => sum + (val - baselineInterval) ** 2, 0) /
    intervals.length;
  const stdDev = Math.round(Math.sqrt(variance) * 10) / 10;

  let trend;
  let label;
  let isDrifting = false;

  if (sortedPurchases.length < 3) {
    trend = "learning";
    label = "Learning rhythm";
  } else if (stdDev > 6 && Math.abs(diffDays) < 3) {
    trend = "erratic";
    label = "Erratic rhythm";
    isDrifting = true;
  } else if (diffDays >= 3) {
    trend = "stretching";
    label = `Cadence stretching (+${diffDays}d)`;
    isDrifting = true;
  } else if (diffDays <= -3) {
    trend = "accelerating";
    label = `Cadence accelerating (${diffDays}d)`;
    isDrifting = true;
  } else if (mad <= 2) {
    trend = "clockwork";
    label = "Clockwork rhythm";
  } else {
    trend = "steady";
    label = "Steady rhythm";
  }

  return {
    mad,
    netBias,
    trend,
    label,
    baselineInterval,
    recentInterval,
    diffDays,
    isDrifting,
    cycleCount,
    stdDev,
  };
}

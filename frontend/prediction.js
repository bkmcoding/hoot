export const DAY_MS = 24 * 60 * 60 * 1000;

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

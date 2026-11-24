/**
 * Holt's Linear Exponential Smoothing Engine
 * Reference: Holt (1957), Brown & Winters.
 * Extrapolates temporal trends with dynamic level & slope smoothing,
 * coupled with empirical 95% confidence intervals (prediction intervals).
 */

export interface ForecastPoint {
  date: string;
  historical?: number | null;
  forecast?: number | null;
  upperBound?: number | null;
  lowerBound?: number | null;
  isForecast: boolean;
}

export interface ForecastResult {
  combined: Record<string, any>[];
  slope: number;
  direction: 'upward' | 'downward' | 'stable';
  rmse: number;
  horizonDays: number;
}

/**
 * Adds N days to a YYYY-MM-DD date string.
 */
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    return dateStr;
  }
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Computes Holt's linear trend forecast with confidence intervals.
 * @param historicalData Array of historical datapoints sorted by date
 * @param dateKey Key for date string
 * @param metricKey Key for numerical value
 * @param horizon Number of periods to project forward (default: 7)
 * @param alpha Level smoothing parameter (0 < alpha < 1)
 * @param beta Trend smoothing parameter (0 < beta < 1)
 */
export function generateHoltForecast(
  historicalData: Record<string, any>[],
  dateKey: string,
  metricKey: string,
  horizon = 7,
  alpha = 0.3,
  beta = 0.1
): ForecastResult {
  if (!historicalData || historicalData.length < 3) {
    return {
      combined: historicalData,
      slope: 0,
      direction: 'stable',
      rmse: 0,
      horizonDays: 0,
    };
  }

  const n = historicalData.length;
  const values = historicalData.map((d) => Number(d[metricKey]) || 0);

  // Initialize level (l0) and trend (b0) from first two observations
  let level = values[0];
  let trend = (values[n - 1] - values[0]) / (n - 1);

  const errors: number[] = [];

  // In-sample recursive smoothing
  for (let t = 1; t < n; t++) {
    const y = values[t];
    const prevLevel = level;
    const prevTrend = trend;

    // One-step prediction error
    const oneStepPred = prevLevel + prevTrend;
    errors.push(y - oneStepPred);

    // Level equation: l_t = alpha * y_t + (1 - alpha) * (l_{t-1} + b_{t-1})
    level = alpha * y + (1 - alpha) * (prevLevel + prevTrend);

    // Trend equation: b_t = beta * (l_t - l_{t-1}) + (1 - beta) * b_{t-1}
    trend = beta * (level - prevLevel) + (1 - beta) * prevTrend;
  }

  // Calculate Root Mean Squared Error (RMSE) for prediction intervals
  const sse = errors.reduce((acc, err) => acc + err * err, 0);
  const rmse = Math.sqrt(sse / errors.length);

  // Prepare combined series
  const combined: Record<string, any>[] = historicalData.map((d) => ({
    [dateKey]: d[dateKey],
    [metricKey]: d[metricKey],
    forecast: null,
    upperBound: null,
    lowerBound: null,
  }));

  // Bridge point: Anchor the forecast start at the final historical point
  const lastHistorical = historicalData[n - 1];
  const lastDate = String(lastHistorical[dateKey]);
  const lastVal = Number(lastHistorical[metricKey]) || 0;

  combined[n - 1] = {
    ...combined[n - 1],
    forecast: lastVal,
    upperBound: lastVal,
    lowerBound: lastVal,
  };

  // Generate out-of-sample forecast horizon (h = 1 ... horizon)
  for (let h = 1; h <= horizon; h++) {
    const projectedDate = addDays(lastDate, h);
    const pointForecast = Math.max(0, level + h * trend);

    // Dynamic 95% Confidence Interval Expansion
    const margin = 1.96 * rmse * Math.sqrt(1 + (h - 1) * alpha * alpha);
    const upperBound = Math.round((pointForecast + margin) * 100) / 100;
    const lowerBound = Math.max(0, Math.round((pointForecast - margin) * 100) / 100);

    combined.push({
      [dateKey]: projectedDate,
      [metricKey]: null,
      forecast: Math.round(pointForecast * 100) / 100,
      upperBound,
      lowerBound,
    });
  }

  return {
    combined,
    slope: Math.round(trend * 100) / 100,
    direction: trend > 0.05 ? 'upward' : trend < -0.05 ? 'downward' : 'stable',
    rmse: Math.round(rmse * 100) / 100,
    horizonDays: horizon,
  };
}

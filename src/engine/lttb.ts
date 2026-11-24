/**
 * Largest-Triangle-Three-Buckets (LTTB) Downsampling Algorithm
 * Reference: Sveinn Steinarsson (2013), University of Iceland.
 * Downsamples high-frequency time-series datasets from N points to M target points
 * in O(N) linear time while preserving visual peaks, valleys, and perceived variance.
 */

export interface DataPoint {
  x: number | string;
  y: number;
  [key: string]: any;
}

/**
 * Downsamples an array of numeric or date-based datapoints using LTTB.
 * @param data Source array of data objects
 * @param xKey Key for the X-axis dimension
 * @param yKey Key for the numeric Y-axis metric
 * @param threshold Target number of points (typically 100-250 for screen display)
 */
export function lttbDownsample<T extends Record<string, any>>(
  data: T[],
  _xKey: string,
  yKey: string,
  threshold: number
): T[] {
  if (!data || data.length <= threshold || threshold <= 2) {
    return data;
  }

  const sampled: T[] = [];
  const dataLength = data.length;

  // Bucket size: leave room for first and last points
  const every = (dataLength - 2) / (threshold - 2);

  // Always retain the very first point
  let a = 0;
  sampled.push(data[a]);

  for (let i = 0; i < threshold - 2; i++) {
    // 1. Calculate average point for the next bucket (bucket C)
    const avgRangeStart = Math.floor((i + 1) * every) + 1;
    const avgRangeEnd = Math.min(Math.floor((i + 2) * every) + 1, dataLength);
    const avgRangeLength = avgRangeEnd - avgRangeStart;

    let avgX = 0;
    let avgY = 0;

    for (let j = avgRangeStart; j < avgRangeEnd; j++) {
      avgX += j; // use index as continuous x proxy
      avgY += Number(data[j][yKey]) || 0;
    }

    if (avgRangeLength > 0) {
      avgX /= avgRangeLength;
      avgY /= avgRangeLength;
    }

    // 2. Get range for current bucket (bucket B)
    const rangeBStart = Math.floor(i * every) + 1;
    const rangeBEnd = Math.min(Math.floor((i + 1) * every) + 1, dataLength);

    // Point A coordinates
    const pointAX = a;
    const pointAY = Number(data[a][yKey]) || 0;

    let maxArea = -1;
    let maxAreaIndex = rangeBStart;

    // 3. Find point in bucket B that maximizes triangle area with A and average C
    for (let j = rangeBStart; j < rangeBEnd; j++) {
      const currentY = Number(data[j][yKey]) || 0;
      // Area = 0.5 * | xA(yB - yC) + xB(yC - yA) + xC(yA - yB) |
      const area = Math.abs(
        0.5 *
          (pointAX * (currentY - avgY) +
            j * (avgY - pointAY) +
            avgX * (pointAY - currentY))
      );

      if (area > maxArea) {
        maxArea = area;
        maxAreaIndex = j;
      }
    }

    // Next point A is the chosen point
    a = maxAreaIndex;
    sampled.push(data[a]);
  }

  // Always retain the very last point
  sampled.push(data[dataLength - 1]);

  return sampled;
}

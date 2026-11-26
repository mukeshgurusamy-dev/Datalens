/**
 * Cooperative main-thread yielding and idle-time prefetching utilities
 * grounded in Chrome's Interaction to Next Paint (INP) & PRPL best practices.
 */

type SchedulerWithYield = {
  yield?: () => Promise<void>;
};

/**
 * Yields control back to the browser event loop so pending user inputs
 * and frame paints are processed before continuing long-running work.
 */
export function yieldToMain(): Promise<void> {
  const win = typeof window !== 'undefined' ? (window as Window & { scheduler?: SchedulerWithYield }) : undefined;
  if (win?.scheduler && typeof win.scheduler.yield === 'function') {
    return win.scheduler.yield();
  }
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Schedules a non-critical module prefetch during browser idle time
 * after First Contentful Paint / Largest Contentful Paint.
 */
export function scheduleIdlePrefetch(task: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const win = window as Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  };

  if (typeof win.requestIdleCallback === 'function') {
    const id = win.requestIdleCallback(task, { timeout: 2500 });
    return () => win.cancelIdleCallback?.(id);
  }

  const timerId = window.setTimeout(task, 1200);
  return () => window.clearTimeout(timerId);
}

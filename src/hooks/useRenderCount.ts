import { useRef } from 'react';

/**
 * Tracks the exact number of times a React component or sub-tree has committed.
 * Invaluable for detecting and preventing unnecessary re-render cascades in React 19.
 */
export function useRenderCount(componentName?: string): number {
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;

  if (process.env.NODE_ENV === 'development' && componentName && renderCountRef.current > 15) {
    console.debug(`[DataLens Profiler] High re-render count on <${componentName}>: ${renderCountRef.current}`);
  }

  return renderCountRef.current;
}

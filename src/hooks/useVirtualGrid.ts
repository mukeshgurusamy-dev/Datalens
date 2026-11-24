import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

export interface UseVirtualGridOptions {
  itemCount: number;
  itemHeight: number;
  overscan?: number;
  initialContainerHeight?: number;
}

export interface VirtualItem {
  index: number;
  offsetTop: number;
}

export interface VirtualGridResult {
  containerRef: React.RefObject<HTMLDivElement | null>;
  virtualItems: VirtualItem[];
  totalHeight: number;
  startIndex: number;
  endIndex: number;
  isScrolling: boolean;
  activeMountedCount: number;
  scrollToIndex: (index: number) => void;
}

/**
 * Zero-dependency, 60 FPS Virtual Windowing Hook.
 * Calculates exact slice ranges, dynamic scroll offsets, and overscan buffers,
 * ensuring thousands of records render within ~20 active DOM nodes.
 */
export function useVirtualGrid({
  itemCount,
  itemHeight,
  overscan = 5,
  initialContainerHeight = 400,
}: UseVirtualGridOptions): VirtualGridResult {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(initialContainerHeight);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<number | null>(null);

  // ResizeObserver to track container height changes dynamically
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Set initial measured client height
    if (el.clientHeight > 0) {
      setContainerHeight(el.clientHeight);
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.height > 0) {
          setContainerHeight(entry.contentRect.height);
        }
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Passive scroll listener for maximum 60/120 FPS performance
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleScroll = () => {
      setScrollTop(el.scrollTop);
      setIsScrolling(true);

      if (scrollTimeoutRef.current) {
        window.clearTimeout(scrollTimeoutRef.current);
      }
      scrollTimeoutRef.current = window.setTimeout(() => {
        setIsScrolling(false);
      }, 150);
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        window.clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  const totalHeight = itemCount * itemHeight;

  // Windowing math: calculate start and end indices with overscan clamping
  const { startIndex, endIndex, virtualItems } = useMemo(() => {
    if (itemCount === 0 || containerHeight <= 0) {
      return { startIndex: 0, endIndex: 0, virtualItems: [] };
    }

    const rawStart = Math.floor(scrollTop / itemHeight);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const rawEnd = rawStart + visibleCount;

    const start = Math.max(0, rawStart - overscan);
    const end = Math.min(itemCount - 1, rawEnd + overscan);

    const items: VirtualItem[] = [];
    for (let i = start; i <= end; i++) {
      items.push({
        index: i,
        offsetTop: i * itemHeight,
      });
    }

    return {
      startIndex: start,
      endIndex: end,
      virtualItems: items,
    };
  }, [scrollTop, containerHeight, itemCount, itemHeight, overscan]);

  const scrollToIndex = useCallback(
    (index: number) => {
      const el = containerRef.current;
      if (!el) return;
      const targetOffset = Math.max(0, Math.min(index * itemHeight, totalHeight - containerHeight));
      el.scrollTo({ top: targetOffset, behavior: 'smooth' });
    },
    [itemHeight, totalHeight, containerHeight]
  );

  return {
    containerRef,
    virtualItems,
    totalHeight,
    startIndex,
    endIndex,
    isScrolling,
    activeMountedCount: virtualItems.length,
    scrollToIndex,
  };
}

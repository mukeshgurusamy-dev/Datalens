// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { renderHook, fireEvent } from '@testing-library/react';
import { useVirtualGrid } from '../useVirtualGrid';
import { useModalAccessibility } from '../useModalAccessibility';

describe('useVirtualGrid Hook', () => {
  it('computes visible window slice and total height for large datasets', () => {
    const { result } = renderHook(() =>
      useVirtualGrid({
        itemCount: 10000,
        itemHeight: 40,
        overscan: 5,
        initialContainerHeight: 400,
      })
    );

    expect(result.current.totalHeight).toBe(400000);
    expect(result.current.startIndex).toBe(0);
    // 400px / 40px = 10 visible + 5 overscan * 2 = ~15-16 mounted nodes, never 10,000
    expect(result.current.activeMountedCount).toBeLessThan(25);
    expect(result.current.activeMountedCount).toBeGreaterThan(0);
    expect(result.current.virtualItems[0].index).toBe(0);
    expect(result.current.virtualItems[0].offsetTop).toBe(0);
  });

  it('handles empty itemCount gracefully with zero virtual items', () => {
    const { result } = renderHook(() =>
      useVirtualGrid({
        itemCount: 0,
        itemHeight: 38,
        overscan: 6,
        initialContainerHeight: 420,
      })
    );

    expect(result.current.totalHeight).toBe(0);
    expect(result.current.virtualItems).toEqual([]);
    expect(result.current.activeMountedCount).toBe(0);
  });
});

describe('useModalAccessibility Hook', () => {
  it('invokes onClose when Escape is pressed while modal is open', () => {
    const onClose = vi.fn();
    renderHook(() => useModalAccessibility(true, onClose));

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not invoke onClose on Escape when modal is closed', () => {
    const onClose = vi.fn();
    renderHook(() => useModalAccessibility(false, onClose));

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });
});

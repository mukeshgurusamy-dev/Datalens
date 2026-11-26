// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, afterEach, beforeAll } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { KpiRow } from '../KpiRow';
import { FilterBar } from '../FilterBar';
import { DataTable } from '../DataTable';
import { ShareModal } from '../ShareModal';
import type { DatasetSchema, KpiCard, DataFilterState } from '../../types/dataset';

beforeAll(() => {
  if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
});

afterEach(() => {
  cleanup();
});

const MOCK_DATASET: DatasetSchema = {
  id: 'ds-test',
  name: 'Q4 Revenue Report',
  slug: 'q4-revenue-report',
  rowCount: 3,
  columnCount: 3,
  parsedAt: Date.now(),
  columns: [
    {
      name: 'region',
      type: 'category',
      nullableCount: 0,
      uniqueCount: 2,
      topValues: [
        { value: 'North America', count: 2 },
        { value: 'Europe', count: 1 },
      ],
    },
    {
      name: 'revenue',
      type: 'number',
      nullableCount: 0,
      uniqueCount: 3,
      min: 1200,
      max: 4800,
      mean: 3000,
      sum: 9000,
    },
    {
      name: 'status',
      type: 'category',
      nullableCount: 0,
      uniqueCount: 2,
      topValues: [
        { value: 'Settled', count: 2 },
        { value: 'Pending', count: 1 },
      ],
    },
  ],
  rows: [
    { region: 'North America', revenue: 4800, status: 'Settled' },
    { region: 'Europe', revenue: 1200, status: 'Pending' },
    { region: 'North America', revenue: 3000, status: 'Settled' },
  ],
};

describe('React Dashboard Components', () => {
  it('KpiRow renders metric cards, formatted values, and trend badges', () => {
    const cards: KpiCard[] = [
      {
        id: 'rev',
        title: 'Total Revenue',
        value: '$9,000',
        change: 14.2,
        trend: 'up',
        subtitle: 'vs prior period',
      },
      {
        id: 'orders',
        title: 'Active Orders',
        value: '3',
        change: -2.1,
        trend: 'down',
      },
    ];

    render(<KpiRow cards={cards} />);

    expect(screen.getByText('Total Revenue')).toBeInTheDocument();
    expect(screen.getByText('$9,000')).toBeInTheDocument();
    expect(screen.getByText('+14.2%')).toBeInTheDocument();
    expect(screen.getByText('Active Orders')).toBeInTheDocument();
    expect(screen.getByText('-2.1%')).toBeInTheDocument();
  });

  it('FilterBar opens category dropdown, dispatches selection, and shows filtered row counts', () => {
    const onFilterChange = vi.fn();
    const filters: DataFilterState = {
      searchQuery: '',
      selectedCategories: {},
    };

    render(
      <FilterBar
        columns={MOCK_DATASET.columns}
        filters={filters}
        onFilterChange={onFilterChange}
        totalRowCount={100}
        filteredRowCount={42}
      />
    );

    expect(screen.getByText('42')).toBeInTheDocument();

    // Open 'region' category dropdown and select 'Europe'
    fireEvent.click(screen.getByRole('button', { name: /region/i }));
    fireEvent.click(screen.getByText('Europe'));

    expect(onFilterChange).toHaveBeenCalledWith({
      searchQuery: '',
      selectedCategories: { region: ['Europe'] },
    });
  });

  it('DataTable filters rows via search input and toggles view modes', () => {
    render(<DataTable dataset={MOCK_DATASET} />);

    expect(screen.getByText('Raw Records Explorer')).toBeInTheDocument();
    expect(screen.getByText('Europe')).toBeInTheDocument();

    const tableSearch = screen.getByPlaceholderText(/search/i);
    fireEvent.change(tableSearch, { target: { value: 'Europe' } });

    expect(screen.getByText('Europe')).toBeInTheDocument();
    expect(screen.queryByText('Settled')).not.toBeInTheDocument();

    // Switch to paginated mode
    fireEvent.click(screen.getByRole('button', { name: /paginated/i }));
    expect(screen.getByText(/Page 1 of 1/i)).toBeInTheDocument();
  });

  it('ShareModal renders accessible dialog semantics and closes on Escape', () => {
    const onClose = vi.fn();
    render(
      <ShareModal
        isOpen={true}
        onClose={onClose}
        dataset={MOCK_DATASET}
        filters={{ searchQuery: '', selectedCategories: {} }}
        customCharts={{}}
      />
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('Share Executive Dashboard')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /close modal/i }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

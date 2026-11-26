import React, { useState, useMemo, useDeferredValue } from 'react';
import { Search, ChevronLeft, ChevronRight, Hash, Calendar, Tag, Type, Key, Cpu, ListFilter } from 'lucide-react';
import type { DatasetSchema, ColumnType } from '../types/dataset';
import { useVirtualGrid } from '../hooks/useVirtualGrid';

interface DataTableProps {
  dataset: DatasetSchema;
}

const TypeIcon: React.FC<{ type: ColumnType }> = ({ type }) => {
  switch (type) {
    case 'number':
      return <Hash className="w-3 h-3 text-blue-400" />;
    case 'date':
      return <Calendar className="w-3 h-3 text-emerald-400" />;
    case 'category':
      return <Tag className="w-3 h-3 text-purple-400" />;
    case 'id':
      return <Key className="w-3 h-3 text-amber-400" />;
    default:
      return <Type className="w-3 h-3 text-zinc-400" />;
  }
};

export const DataTable: React.FC<DataTableProps> = React.memo(({ dataset }) => {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'virtual' | 'paginated'>('virtual');
  const rowsPerPage = 10;
  const rowHeight = 38;

  // Filter rows across all columns based on deferred search query (keeps typing at 60 FPS)
  const filteredRows = useMemo(() => {
    if (!deferredSearch.trim()) return dataset.rows;
    const query = deferredSearch.toLowerCase();
    return dataset.rows.filter((row) =>
      Object.values(row).some((val) =>
        String(val ?? '').toLowerCase().includes(query)
      )
    );
  }, [dataset.rows, deferredSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / rowsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedRows = useMemo(() => {
    const start = (safeCurrentPage - 1) * rowsPerPage;
    return filteredRows.slice(start, start + rowsPerPage);
  }, [filteredRows, safeCurrentPage]);

  // Zero-dependency Virtual Windowing Hook (60 FPS scrolling for 100k+ rows)
  const {
    containerRef,
    virtualItems,
    totalHeight,
    startIndex,
    activeMountedCount,
  } = useVirtualGrid({
    itemCount: filteredRows.length,
    itemHeight: rowHeight,
    overscan: 6,
    initialContainerHeight: 420,
  });

  return (
    <div className="spotlight-card rounded-xl p-5 mb-10">
      {/* Table Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] tracking-tight">
              Raw Records Explorer
            </h3>
            {viewMode === 'virtual' && (
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-muted)] font-mono tabular-nums">
                <Cpu className="w-3 h-3" />
                {activeMountedCount} DOM nodes
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--text-muted)] font-mono tabular-nums">
            Showing {filteredRows.length.toLocaleString()} of {dataset.rowCount.toLocaleString()} records ({dataset.columnCount} columns)
          </p>
        </div>

        {/* View Mode Toggle & Search Input */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {/* Segmented Control */}
          <div className="inline-flex items-center p-0.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-xs">
            <button
              onClick={() => setViewMode('virtual')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors ${
                viewMode === 'virtual'
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] font-medium border border-[var(--border-hairline)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-transparent'
              }`}
            >
              <Cpu className="w-3 h-3" />
              <span>Virtual Grid</span>
            </button>
            <button
              onClick={() => setViewMode('paginated')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors ${
                viewMode === 'paginated'
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] font-medium border border-[var(--border-hairline)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-transparent'
              }`}
            >
              <ListFilter className="w-3 h-3" />
              <span>Paginated</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search records..."
              className="w-full bg-[var(--bg-elevated)] border border-[var(--border-hairline)] rounded-lg pl-8.5 pr-3 py-1.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>
      </div>

      {viewMode === 'virtual' ? (
        /* Virtualized Grid View */
        <div
          ref={containerRef}
          className="relative overflow-auto rounded-lg border border-[var(--border-hairline)] max-h-[480px] bg-[var(--bg-canvas)]"
        >
          {/* Sticky Table Header */}
          <div className="sticky top-0 z-20 bg-[var(--bg-elevated)] border-b border-[var(--border-hairline)] text-[var(--text-muted)] uppercase tracking-wider text-[11px] font-medium flex">
            {dataset.columns.map((col) => (
              <div
                key={col.name}
                className="px-4 py-2.5 flex-1 min-w-[140px] truncate flex items-center gap-1.5"
              >
                <TypeIcon type={col.type} />
                <span className="truncate">{col.name}</span>
              </div>
            ))}
          </div>

          {/* Spacer div establishing total virtual height */}
          <div style={{ height: `${Math.max(120, totalHeight)}px`, position: 'relative' }}>
            {filteredRows.length === 0 ? (
              <div className="p-8 text-center text-xs text-[var(--text-muted)]">
                No matching records found for "{search}".
              </div>
            ) : (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  transform: `translateY(${startIndex * rowHeight}px)`,
                }}
              >
                {virtualItems.map(({ index }) => {
                  const row = filteredRows[index];
                  if (!row) return null;
                  return (
                    <div
                      key={index}
                      className="flex items-center border-b border-[var(--border-hairline)] hover:bg-[var(--bg-elevated)]/60 transition-colors text-xs"
                      style={{ height: `${rowHeight}px` }}
                    >
                      {dataset.columns.map((col) => {
                        const val = row[col.name];
                        const isNum = col.type === 'number';
                        const isDate = col.type === 'date';
                        return (
                          <div
                            key={col.name}
                            className={`px-4 flex-1 min-w-[140px] truncate text-zinc-300 ${
                              isNum || isDate ? 'font-mono tabular-nums text-zinc-200' : ''
                            }`}
                          >
                            {val === null || val === undefined ? (
                              <span className="text-zinc-600 italic">null</span>
                            ) : typeof val === 'object' && (val as unknown) instanceof Date ? (
                              (val as Date).toISOString().replace('T', ' ').slice(0, 19)
                            ) : (
                              String(val)
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Classic Paginated Table View */
        <div>
          <div className="overflow-x-auto rounded-lg border border-zinc-800/80">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#141418] border-b border-zinc-800/80 text-zinc-400 uppercase tracking-wider text-[11px]">
                <tr>
                  {dataset.columns.map((col) => (
                    <th key={col.name} className="px-4 py-3 font-medium whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <TypeIcon type={col.type} />
                        <span>{col.name}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850">
                {paginatedRows.length > 0 ? (
                  paginatedRows.map((row, rowIdx) => (
                    <tr key={rowIdx} className="hover:bg-zinc-900/50 transition-colors">
                      {dataset.columns.map((col) => {
                        const val = row[col.name];
                        const isNum = col.type === 'number';
                        const isDate = col.type === 'date';
                        return (
                          <td
                            key={col.name}
                            className={`px-4 py-2.5 whitespace-nowrap text-zinc-300 ${
                              isNum || isDate ? 'font-mono tabular-nums text-zinc-200' : ''
                            }`}
                          >
                            {val === null || val === undefined ? (
                              <span className="text-zinc-600 italic">null</span>
                            ) : typeof val === 'object' && (val as unknown) instanceof Date ? (
                              (val as Date).toISOString().replace('T', ' ').slice(0, 19)
                            ) : (
                              String(val)
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={dataset.columns.length}
                      className="px-4 py-8 text-center text-zinc-400"
                    >
                      No matching records found for "{search}".
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="flex items-center justify-between pt-4 text-xs text-zinc-400">
            <span>
              Page {safeCurrentPage} of {totalPages}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, Math.max(1, p - 1)))}
                disabled={safeCurrentPage <= 1}
                className="p-1.5 rounded-lg border border-zinc-800 hover:bg-zinc-800 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-zinc-300" />
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, Math.max(1, p + 1)))}
                disabled={safeCurrentPage >= totalPages}
                className="p-1.5 rounded-lg border border-zinc-800 hover:bg-zinc-800 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-zinc-300" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

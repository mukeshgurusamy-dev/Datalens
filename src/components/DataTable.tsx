import React, { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, Hash, Calendar, Tag, Type, Key } from 'lucide-react';
import type { DatasetSchema, ColumnType } from '../types/dataset';

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

export const DataTable: React.FC<DataTableProps> = ({ dataset }) => {
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  // Filter rows across all columns based on search query
  const filteredRows = useMemo(() => {
    if (!search.trim()) return dataset.rows;
    const query = search.toLowerCase();
    return dataset.rows.filter((row) =>
      Object.values(row).some((val) =>
        String(val ?? '').toLowerCase().includes(query)
      )
    );
  }, [dataset.rows, search]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / rowsPerPage));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredRows.slice(start, start + rowsPerPage);
  }, [filteredRows, currentPage]);



  return (
    <div className="spotlight-card rounded-2xl p-6 mb-12">
      {/* Table Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-base font-semibold text-white tracking-tight">
            Raw Records Explorer
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Showing {filteredRows.length} of {dataset.rowCount} rows ({dataset.columnCount} columns)
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1); // Reset to page 1 on search
            }}
            placeholder="Search records..."
            className="w-full bg-[#18181b] border border-zinc-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-400 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* Table Container */}
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
                        ) : typeof val === 'object' && (val as any) instanceof Date ? (
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
          Page {currentPage} of {totalPages}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg border border-zinc-800 hover:bg-zinc-800 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-zinc-300" />
          </button>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg border border-zinc-800 hover:bg-zinc-800 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-zinc-300" />
          </button>
        </div>
      </div>
    </div>
  );
};

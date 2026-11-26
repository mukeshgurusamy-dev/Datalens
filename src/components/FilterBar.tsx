import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Filter, X, ChevronDown, Check, RotateCcw } from 'lucide-react';
import type { ColumnProfile, DataFilterState } from '../types/dataset';

interface FilterBarProps {
  columns: ColumnProfile[];
  filters: DataFilterState;
  onFilterChange: (newFilters: DataFilterState) => void;
  totalRowCount: number;
  filteredRowCount: number;
}

export const FilterBar: React.FC<FilterBarProps> = React.memo(({
  columns,
  filters,
  onFilterChange,
  totalRowCount,
  filteredRowCount,
}) => {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [dropdownSearch, setDropdownSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
        setDropdownSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Extract all categorical columns with their unique options
  const categoryColumns = columns.filter(
    (c) => c.type === 'category' && c.topValues && c.topValues.length > 0
  );

  const activeFiltersCount = Object.values(filters.selectedCategories).reduce(
    (sum, arr) => sum + arr.length,
    0
  );

  const toggleCategoryValue = (colName: string, value: string) => {
    const current = filters.selectedCategories[colName] || [];
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];

    onFilterChange({
      ...filters,
      selectedCategories: {
        ...filters.selectedCategories,
        [colName]: updated,
      },
    });
  };

  const selectAllCategoryValues = (colName: string, allValues: string[]) => {
    onFilterChange({
      ...filters,
      selectedCategories: {
        ...filters.selectedCategories,
        [colName]: allValues,
      },
    });
  };

  const clearCategoryValues = (colName: string) => {
    const updated = { ...filters.selectedCategories };
    delete updated[colName];
    onFilterChange({
      ...filters,
      selectedCategories: updated,
    });
  };

  const clearAllFilters = () => {
    onFilterChange({
      ...filters,
      searchQuery: '',
      selectedCategories: {},
      dateRange: undefined,
    });
  };

  if (categoryColumns.length === 0) return null;

  return (
    <div className="w-full bg-[#121215] border border-zinc-800/80 rounded-2xl p-4 mb-6 shadow-sm" ref={dropdownRef}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Filter Label & Category Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-300 pr-2 border-r border-zinc-800">
            <Filter className="w-3.5 h-3.5 text-blue-400" />
            <span>Filters</span>
            {activeFiltersCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-blue-500 text-white font-mono text-[10px] flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </div>

          {/* Category Filter Buttons */}
          {categoryColumns.map((col) => {
            const selectedVals = filters.selectedCategories[col.name] || [];
            const isOpen = openDropdown === col.name;
            const items = col.topValues || [];
            const filteredItems = dropdownSearch.trim()
              ? items.filter((item) =>
                  item.value.toLowerCase().includes(dropdownSearch.trim().toLowerCase())
                )
              : items;

            return (
              <div key={col.name} className="relative">
                <button
                  onClick={() => {
                    setOpenDropdown(isOpen ? null : col.name);
                    setDropdownSearch('');
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    selectedVals.length > 0
                      ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                      : 'bg-[#18181b] border-zinc-800 text-zinc-300 hover:border-zinc-700'
                  }`}
                >
                  <span>{col.name}</span>
                  {selectedVals.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-mono text-[10px]">
                      {selectedVals.length}
                    </span>
                  )}
                  <ChevronDown className={`w-3 h-3 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.95 }}
                      transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                      className="absolute left-0 top-full mt-2 w-60 bg-[#18181b] border border-zinc-700/80 rounded-xl shadow-2xl p-2.5 z-40"
                    >
                      <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-zinc-800">
                        <span className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider">
                          {col.name}
                        </span>
                        <div className="flex items-center gap-2 text-[10px]">
                          <button
                            onClick={() =>
                              selectAllCategoryValues(
                                col.name,
                                items.map((i) => i.value)
                              )
                            }
                            className="text-blue-400 hover:text-blue-300 font-medium"
                          >
                            All
                          </button>
                          <span className="text-zinc-600">|</span>
                          <button
                            onClick={() => clearCategoryValues(col.name)}
                            className="text-zinc-400 hover:text-zinc-200"
                          >
                            Clear
                          </button>
                        </div>
                      </div>

                      {/* Search inside dropdown for high option counts */}
                      {items.length > 6 && (
                        <div className="mb-2">
                          <input
                            type="text"
                            placeholder={`Search ${col.name}...`}
                            value={dropdownSearch}
                            onChange={(e) => setDropdownSearch(e.target.value)}
                            className="w-full px-2 py-1 bg-zinc-900 border border-zinc-800 rounded-md text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                            autoFocus
                          />
                        </div>
                      )}

                      <div className="mt-1 space-y-0.5 max-h-52 overflow-y-auto pr-1">
                        {filteredItems.length > 0 ? (
                          filteredItems.map((item) => {
                            const isSelected = selectedVals.includes(item.value);
                            return (
                              <button
                                key={item.value}
                                onClick={() => toggleCategoryValue(col.name, item.value)}
                                className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs text-left text-zinc-200 hover:bg-zinc-800/80 transition-colors"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <div
                                    className={`w-3.5 h-3.5 rounded border shrink-0 flex items-center justify-center transition-colors ${
                                      isSelected
                                        ? 'bg-blue-600 border-blue-500 text-white'
                                        : 'border-zinc-700 bg-zinc-900'
                                    }`}
                                  >
                                    {isSelected && <Check className="w-2.5 h-2.5" />}
                                  </div>
                                  <span className="truncate">{item.value}</span>
                                </div>
                                <span className="text-[10px] font-mono text-zinc-500 shrink-0 ml-2">
                                  {item.count}
                                </span>
                              </button>
                            );
                          })
                        ) : (
                          <div className="py-3 text-center text-xs text-zinc-500">
                            No options matching "{dropdownSearch}"
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Right: Active Filter Indicators & Reset Button */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-400 font-mono">
            Showing <strong className="text-white font-semibold">{filteredRowCount}</strong> of{' '}
            {totalRowCount} rows
          </span>

          {activeFiltersCount > 0 && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={clearAllFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-zinc-400 hover:text-white bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/60 transition-colors"
            >
              <RotateCcw className="w-3 h-3 text-zinc-400" />
              <span>Reset</span>
            </motion.button>
          )}
        </div>
      </div>

      {/* Selected Filters Pill Row */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-3 mt-3 border-t border-zinc-850">
          <span className="text-[11px] text-zinc-500 mr-1">Active:</span>
          {Object.entries(filters.selectedCategories).map(([colName, vals]) =>
            vals.map((val) => (
              <span
                key={`${colName}-${val}`}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[11px]"
              >
                <span className="text-zinc-500">{colName}:</span>
                <span className="font-medium text-white">{val}</span>
                <button
                  onClick={() => toggleCategoryValue(colName, val)}
                  className="hover:text-red-400 text-zinc-400 ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))
          )}
        </div>
      )}
    </div>
  );
});

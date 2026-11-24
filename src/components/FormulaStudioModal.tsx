/**
 * FormulaStudioModal.tsx
 *
 * Custom Formula Studio — Calculated Column Builder
 *
 * React Concepts Demonstrated:
 * ─ useRef + imperative DOM: Focusing textarea on open, cursor management
 * ─ useDeferredValue: Defers the preview computation so typing stays snappy
 * ─ Controlled form pattern: Every input bound to React state
 * ─ Lifting state up: Computed column results are lifted to parent via callback
 * ─ Conditional rendering with guard clauses for progressive disclosure
 * ─ Portal-free modal pattern with backdrop + stopPropagation
 */

import { useState, useMemo, useRef, useEffect, useDeferredValue } from 'react';
import { X, Plus, Calculator, AlertTriangle, CheckCircle2, Zap } from 'lucide-react';
import type { DatasetSchema, ColumnProfile } from '../types/dataset';
import { computeColumn } from '../engine/formula-engine';

// ── Props ──────────────────────────────────────────────────────────────

interface FormulaStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataset: DatasetSchema;
  onAddColumn: (columnName: string, values: (number | string)[]) => void;
}

// ── Quick Templates ────────────────────────────────────────────────────

interface FormulaTemplate {
  label: string;
  formula: string;
  description: string;
}

function buildTemplates(columns: ColumnProfile[]): FormulaTemplate[] {
  const numCols = columns.filter((c) => c.type === 'number');
  const templates: FormulaTemplate[] = [];

  if (numCols.length >= 2) {
    templates.push({
      label: 'Ratio',
      formula: `[${numCols[0].name}] / [${numCols[1].name}]`,
      description: `${numCols[0].name} ÷ ${numCols[1].name}`,
    });
    templates.push({
      label: 'Sum',
      formula: `[${numCols[0].name}] + [${numCols[1].name}]`,
      description: `${numCols[0].name} + ${numCols[1].name}`,
    });
    templates.push({
      label: 'Percentage',
      formula: `ROUND([${numCols[0].name}] / [${numCols[1].name}] * 100, 2)`,
      description: `${numCols[0].name} as % of ${numCols[1].name}`,
    });
  }

  if (numCols.length >= 1) {
    templates.push({
      label: 'Tiered Label',
      formula: `IF([${numCols[0].name}] > ${numCols[0].mean?.toFixed(0) ?? 50}, "High", "Low")`,
      description: `Classify ${numCols[0].name} above/below mean`,
    });
    templates.push({
      label: 'Log Transform',
      formula: `ROUND(LOG([${numCols[0].name}] + 1), 3)`,
      description: `Natural log of ${numCols[0].name}`,
    });
  }

  return templates;
}

// ── Component ──────────────────────────────────────────────────────────

export const FormulaStudioModal: React.FC<FormulaStudioModalProps> = ({
  isOpen,
  onClose,
  dataset,
  onAddColumn,
}) => {
  const [formula, setFormula] = useState('');
  const [columnName, setColumnName] = useState('calculated_column');
  const [isAdded, setIsAdded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // useDeferredValue: defers the formula string so the preview doesn't block typing
  const deferredFormula = useDeferredValue(formula);

  // Auto-focus textarea on open
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
    setIsAdded(false);
  }, [isOpen]);

  // Templates based on dataset columns
  const templates = useMemo(() => buildTemplates(dataset.columns), [dataset.columns]);

  // Live preview — computed from the deferred formula to keep typing responsive
  const preview = useMemo(() => {
    if (!deferredFormula.trim()) return null;
    const result = computeColumn(deferredFormula, dataset.rows.slice(0, 100));
    return result;
  }, [deferredFormula, dataset.rows]);

  const isStale = formula !== deferredFormula;

  const handleInsertColumn = (colName: string) => {
    const insertion = `[${colName}]`;
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const before = formula.slice(0, start);
      const after = formula.slice(end);
      const newFormula = before + insertion + after;
      setFormula(newFormula);
      // Restore cursor position after React re-render
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          const pos = start + insertion.length;
          textareaRef.current.selectionStart = pos;
          textareaRef.current.selectionEnd = pos;
          textareaRef.current.focus();
        }
      });
    } else {
      setFormula((prev) => prev + insertion);
    }
  };

  const handleApply = () => {
    if (!preview || preview.error || preview.values.length === 0) return;
    // Compute for ALL rows, not just preview
    const full = computeColumn(formula, dataset.rows);
    if (full.error) return;
    onAddColumn(columnName.trim() || 'calculated_column', full.values);
    setIsAdded(true);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <Calculator className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Formula Studio</h2>
              <p className="text-[11px] text-zinc-500">Build calculated columns with safe expressions</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-zinc-800 rounded-lg transition-colors">
            <X className="w-4 h-4 text-zinc-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Column Name Input */}
          <div>
            <label className="text-[11px] text-zinc-500 uppercase font-mono mb-1 block">
              New Column Name
            </label>
            <input
              type="text"
              value={columnName}
              onChange={(e) => setColumnName(e.target.value)}
              className="w-full text-sm bg-zinc-900 border border-zinc-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
              placeholder="e.g. profit_margin"
            />
          </div>

          {/* Column Chips */}
          <div>
            <label className="text-[11px] text-zinc-500 uppercase font-mono mb-2 block">
              Available Columns — Click to insert
            </label>
            <div className="flex flex-wrap gap-1.5">
              {dataset.columns.map((col) => (
                <button
                  key={col.name}
                  onClick={() => handleInsertColumn(col.name)}
                  className={`text-[11px] px-2 py-1 rounded-md border transition-colors ${
                    col.type === 'number'
                      ? 'border-blue-500/30 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20'
                      : col.type === 'category'
                      ? 'border-purple-500/30 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20'
                      : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  [{col.name}]
                  <span className="ml-1 text-[9px] opacity-60">{col.type}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Templates */}
          {templates.length > 0 && (
            <div>
              <label className="text-[11px] text-zinc-500 uppercase font-mono mb-2 block">
                Quick Templates
              </label>
              <div className="flex flex-wrap gap-1.5">
                {templates.map((tpl) => (
                  <button
                    key={tpl.label}
                    onClick={() => setFormula(tpl.formula)}
                    title={tpl.description}
                    className="text-[11px] px-2.5 py-1 rounded-lg border border-cyan-500/20 bg-cyan-500/5 text-cyan-300 hover:bg-cyan-500/15 transition-colors"
                  >
                    <Zap className="w-3 h-3 inline mr-1" />
                    {tpl.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Formula Editor */}
          <div>
            <label className="text-[11px] text-zinc-500 uppercase font-mono mb-1 block">
              Formula Expression
            </label>
            <textarea
              ref={textareaRef}
              value={formula}
              onChange={(e) => setFormula(e.target.value)}
              rows={3}
              className="w-full text-sm font-mono bg-zinc-900 border border-zinc-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 resize-none"
              placeholder="e.g. [Revenue] / [Quantity] * 100"
              spellCheck={false}
            />
            <p className="text-[10px] text-zinc-600 mt-1">
              Operators: + - * / % ** | Functions: ABS, ROUND, CEIL, FLOOR, SQRT, LOG, MIN, MAX, IF, LEN, UPPER, LOWER, CONCAT
            </p>
          </div>

          {/* Live Preview */}
          {preview && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="text-[11px] text-zinc-500 uppercase font-mono">
                  Live Preview {isStale && '(computing...)'}
                </label>
                {preview.error ? (
                  <span className="inline-flex items-center gap-1 text-[10px] text-red-400">
                    <AlertTriangle className="w-3 h-3" /> Error
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400">
                    <CheckCircle2 className="w-3 h-3" /> Valid — {preview.values.length} rows
                  </span>
                )}
              </div>

              {preview.error ? (
                <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 font-mono">
                  {preview.error}
                </div>
              ) : (
                <div className="max-h-40 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-900/50">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-zinc-800">
                        <th className="text-left px-3 py-1.5 text-zinc-500 font-mono">Row</th>
                        <th className="text-left px-3 py-1.5 text-cyan-400 font-mono font-semibold">
                          {columnName || 'result'}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.values.slice(0, 10).map((val, i) => (
                        <tr key={i} className="border-b border-zinc-800/50">
                          <td className="px-3 py-1 text-zinc-600 font-mono">{i + 1}</td>
                          <td className="px-3 py-1 text-zinc-300 font-mono">{String(val)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {preview.values.length > 10 && (
                    <p className="text-[10px] text-zinc-600 px-3 py-1">
                      ... and {preview.values.length - 10} more rows
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-800/80 bg-zinc-950">
          {isAdded ? (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Column "{columnName}" added to dataset!
            </span>
          ) : (
            <span className="text-[11px] text-zinc-600">
              Formula is evaluated per-row against your dataset
            </span>
          )}
          <button
            onClick={handleApply}
            disabled={!preview || !!preview.error || preview.values.length === 0}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Column to Dataset
          </button>
        </div>
      </div>
    </div>
  );
};

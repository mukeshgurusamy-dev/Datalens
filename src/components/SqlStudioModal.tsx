import React, { useState, useEffect } from 'react';
import { executeSqlQuery, convertSqlResultToChart, type SqlQueryResult } from '../engine/sql-engine';
import type { DatasetSchema, ChartRecommendation } from '../types/dataset';
import { Terminal, Play, BarChart2, X, Clock, AlertCircle, CheckCircle2, Sparkles, Copy, Check } from 'lucide-react';
import { useModalAccessibility } from '../hooks/useModalAccessibility';

interface SqlStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataset: DatasetSchema;
  onAddChartToDashboard: (chart: ChartRecommendation) => void;
}

export const SqlStudioModal: React.FC<SqlStudioModalProps> = ({
  isOpen,
  onClose,
  dataset,
  onAddChartToDashboard,
}) => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<SqlQueryResult | null>(null);
  const [addedSuccess, setAddedSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const dialogRef = useModalAccessibility(isOpen, onClose);

  // Generate initial query based on dataset columns
  useEffect(() => {
    if (!isOpen) return;

    const catCol = dataset.columns.find((c) => c.type === 'category' || c.type === 'text')?.name;
    const numCol = dataset.columns.find((c) => c.type === 'number')?.name;

    if (catCol && numCol) {
      setQuery(`SELECT ${catCol}, SUM(${numCol}) AS total_${numCol}\nGROUP BY ${catCol}\nORDER BY total_${numCol} DESC\nLIMIT 10;`);
    } else {
      setQuery(`SELECT *\nLIMIT 20;`);
    }
    setAddedSuccess(false);
  }, [isOpen, dataset]);

  if (!isOpen) return null;

  const handleRunQuery = () => {
    const res = executeSqlQuery(query, dataset.rows);
    setResult(res);
    setAddedSuccess(false);
  };

  const handlePlotChart = () => {
    if (!result || result.rows.length === 0) return;
    const chart = convertSqlResultToChart(result, 'SQL Studio');
    if (chart) {
      onAddChartToDashboard(chart);
      setAddedSuccess(true);
      setTimeout(() => setAddedSuccess(false), 3000);
    }
  };

  const handleApplyTemplate = (templateQuery: string) => {
    setQuery(templateQuery);
    const res = executeSqlQuery(templateQuery, dataset.rows);
    setResult(res);
    setAddedSuccess(false);
  };

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(query);
    } catch {
      // Fallback: use legacy execCommand approach
      try {
        const textarea = document.createElement('textarea');
        textarea.value = query;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      } catch { /* ignore */ }
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const catCol = dataset.columns.find((c) => c.type === 'category')?.name || dataset.columns[0]?.name;
  const numCol = dataset.columns.find((c) => c.type === 'number')?.name || dataset.columns[1]?.name;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md font-sans"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sql-studio-title"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-[#0f0f13] border border-zinc-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 focus:outline-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-[#14141a]/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600/15 border border-blue-500/25 flex items-center justify-center text-blue-400">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="sql-studio-title" className="text-sm font-semibold text-white tracking-tight">
                  In-Memory SQL Studio
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium">
                  Zero-Latency Engine
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Execute client-side SQL queries directly against {dataset.rowCount.toLocaleString()} rows
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close modal"
            className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Template Quick Pills */}
        <div className="px-6 py-2.5 border-b border-zinc-850 bg-zinc-950/40 flex items-center gap-2 overflow-x-auto text-[11px]">
          <span className="text-zinc-500 font-medium flex-shrink-0">Quick Queries:</span>
          {catCol && numCol && (
            <button
              onClick={() =>
                handleApplyTemplate(
                  `SELECT ${catCol}, SUM(${numCol}) AS total_${numCol}\nGROUP BY ${catCol}\nORDER BY total_${numCol} DESC\nLIMIT 8;`
                )
              }
              className="px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white transition-colors flex-shrink-0"
            >
              Group By {catCol} & Sum
            </button>
          )}
          {catCol && numCol && (
            <button
              onClick={() =>
                handleApplyTemplate(
                  `SELECT ${catCol}, AVG(${numCol}) AS avg_${numCol}\nGROUP BY ${catCol}\nORDER BY avg_${numCol} DESC;`
                )
              }
              className="px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white transition-colors flex-shrink-0"
            >
              Average by {catCol}
            </button>
          )}
          <button
            onClick={() => handleApplyTemplate(`SELECT *\nLIMIT 15;`)}
            className="px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white transition-colors flex-shrink-0"
          >
            Raw Sample (Top 15)
          </button>
        </div>

        {/* SQL Editor Area */}
        <div className="p-6 border-b border-zinc-800 bg-[#0c0c0f] flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="font-mono text-[11px] text-zinc-400">SQL EDITOR (Ctrl+Enter to Run)</span>
            <button
              onClick={handleCopySql}
              className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white transition-colors"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy SQL'}</span>
            </button>
          </div>

          <div className="relative rounded-xl border border-zinc-800 bg-[#121217] p-3 font-mono text-xs focus-within:border-blue-500/80 transition-colors">
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  e.preventDefault();
                  handleRunQuery();
                }
              }}
              rows={4}
              placeholder="SELECT ... GROUP BY ..."
              className="w-full bg-transparent text-emerald-300 placeholder-zinc-600 focus:outline-none resize-none leading-relaxed font-mono"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-3 text-xs">
              <button
                onClick={handleRunQuery}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-sm transition-all text-xs"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Execute Query</span>
              </button>

              {result && (
                <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-400">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-emerald-400" />
                    <span>{result.executionTimeMs} ms</span>
                  </div>
                  <span>•</span>
                  <span>{result.rowCount} rows</span>
                </div>
              )}
            </div>

            {/* Plot to Dashboard Button */}
            {result && result.rows.length > 0 && result.columns.length >= 2 && (
              <button
                onClick={handlePlotChart}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border font-semibold text-xs transition-all ${
                  addedSuccess
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-zinc-850 hover:bg-zinc-800 text-white border-zinc-750 hover:border-zinc-700 shadow-sm'
                }`}
              >
                {addedSuccess ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Added to Dashboard!</span>
                  </>
                ) : (
                  <>
                    <BarChart2 className="w-3.5 h-3.5 text-blue-400" />
                    <span>Plot as Dashboard Chart</span>
                  </>
                )}
              </button>
            )}
          </div>

          {result?.error && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs mt-1">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{result.error}</span>
            </div>
          )}
        </div>

        {/* Results Data Table */}
        <div className="flex-1 overflow-auto p-6 max-h-[340px]">
          {result && result.rows.length > 0 ? (
            <div className="rounded-xl border border-zinc-800/80 overflow-hidden bg-[#0c0c0f]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#14141a] border-b border-zinc-800 text-zinc-400 uppercase tracking-wider text-[11px] font-mono sticky top-0">
                  <tr>
                    {result.columns.map((col) => (
                      <th key={col} className="px-4 py-2.5 font-medium whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850 font-mono text-zinc-300 text-[11px]">
                  {result.rows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-zinc-900/50 transition-colors">
                      {result.columns.map((col) => {
                        const val = row[col];
                        const isNum = typeof val === 'number';
                        return (
                          <td
                            key={col}
                            className={`px-4 py-2 whitespace-nowrap ${
                              isNum ? 'text-zinc-100 tabular-nums' : 'text-zinc-300'
                            }`}
                          >
                            {val === null || val === undefined ? (
                              <span className="text-zinc-600 italic">null</span>
                            ) : (
                              String(val)
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : result && !result.error ? (
            <div className="p-8 text-center text-xs text-zinc-400">
              Query returned 0 rows.
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-zinc-500 flex flex-col items-center justify-center">
              <Sparkles className="w-6 h-6 text-zinc-700 mb-2" />
              <span>Write a SQL query above and click Execute Query (or Ctrl+Enter)</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-850 bg-zinc-950/80 text-[11px] text-zinc-400 flex items-center justify-between">
          <span>Engine: Pure Client-Side AST Tokenizer (Zero Server Latency)</span>
          <span className="font-mono text-zinc-400">SELECT • WHERE • GROUP BY • ORDER BY • LIMIT</span>
        </div>
      </div>
    </div>
  );
};

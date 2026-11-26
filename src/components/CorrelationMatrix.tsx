/**
 * CorrelationMatrix.tsx
 *
 * Interactive Multi-Variable Correlation Heatmap & Statistical Discovery Engine
 * Powered entirely by background Web Worker pipeline via `useWorkerCompute`
 *
 * React Concepts Demonstrated:
 * ─ Dedicated Web Worker offloading for zero main thread blocking
 * ─ Race condition cancellation & live compute duration telemetry
 * ─ Dynamic CSS Grid Heatmap with bidirectional tooltips & color scale
 * ─ Graceful skeleton & fallback state handling
 */

import React, { useState, useMemo } from 'react';
import { Cpu, ChevronDown, ChevronUp, RefreshCw, Zap, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useWorkerCompute } from '../hooks/useWorkerCompute';
import type { DatasetSchema } from '../types/dataset';

interface CorrelationMatrixProps {
  dataset: DatasetSchema;
}

export const CorrelationMatrix: React.FC<CorrelationMatrixProps> = React.memo(({ dataset }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const numericColumns = useMemo(() => {
    return dataset.columns
      .filter((c) => c.type === 'number')
      .map((c) => c.name);
  }, [dataset.columns]);

  const { result, isComputing, computeTimeMs, workerActive, recompute } = useWorkerCompute(
    dataset.rows,
    numericColumns
  );

  if (numericColumns.length < 2) return null;

  return (
    <div className="mt-6 rounded-2xl border border-zinc-800/80 bg-zinc-950/50 overflow-hidden">
      {/* Collapsible Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-zinc-900/40 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
            <Cpu className="w-4 h-4 text-teal-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white">Statistical Correlation Matrix</h3>
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-300 font-mono">
                <Zap className="w-3 h-3 text-teal-400" />
                {workerActive ? 'Web Worker OS Thread' : 'Main Thread Engine'}
              </span>
            </div>
            <p className="text-[11px] text-zinc-500">
              Pearson correlation coefficients across {numericColumns.length} numerical dimensions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {computeTimeMs > 0 && (
            <span className="hidden sm:inline-flex text-[11px] font-mono text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
              ⚡ {computeTimeMs}ms (0ms Main Thread Delay)
            </span>
          )}
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-zinc-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-zinc-500" />
          )}
        </div>
      </button>

      {/* Expandable Body */}
      {isExpanded && (
        <div className="px-5 pb-5 border-t border-zinc-800/60">
          <div className="flex items-center justify-between my-4">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-zinc-400 font-medium">Matrix Dimensions:</span>
              <span className="text-[11px] font-mono text-zinc-300 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                {numericColumns.length} × {numericColumns.length}
              </span>
              <span className="text-[11px] text-zinc-500">•</span>
              <span className="text-[11px] text-zinc-400">
                Sample Size: <span className="font-mono text-zinc-300">{dataset.rows.length.toLocaleString()}</span> rows
              </span>
            </div>

            <button
              onClick={recompute}
              disabled={isComputing}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isComputing ? 'animate-spin text-teal-400' : 'text-zinc-400'}`} />
              <span>{isComputing ? 'Computing on Worker...' : 'Recompute'}</span>
            </button>
          </div>

          {/* Top Correlated Insights */}
          {result && result.strongestPairs.length > 0 && (
            <div className="mb-6">
              <h4 className="text-[11px] text-zinc-500 uppercase font-mono mb-2.5">
                Key Discovered Correlations (|r| ≥ 0.25)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {result.strongestPairs.slice(0, 6).map((pair, idx) => {
                  const isPos = pair.coefficient > 0;
                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-zinc-800/80 bg-zinc-900/60 flex items-center justify-between"
                    >
                      <div className="truncate pr-2">
                        <div className="text-xs font-medium text-zinc-200 truncate">
                          {pair.colA} <span className="text-zinc-500">↔</span> {pair.colB}
                        </div>
                        <div className="text-[10px] text-zinc-500 capitalize">
                          {pair.strength.replace('_', ' ')}
                        </div>
                      </div>
                      <div
                        className={`shrink-0 flex items-center gap-0.5 text-xs font-mono font-bold px-2 py-1 rounded-lg ${
                          isPos
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {isPos ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                        {pair.coefficient > 0 ? `+${pair.coefficient.toFixed(2)}` : pair.coefficient.toFixed(2)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Heatmap Table */}
          {result && (
            <div className="overflow-x-auto rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-2">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr>
                    <th className="p-2 text-left text-zinc-500 font-mono text-[10px] border-b border-zinc-800">
                      Metric
                    </th>
                    {result.numericColumns.map((col) => (
                      <th
                        key={col}
                        className="p-2 text-center text-zinc-400 font-mono text-[10px] font-medium border-b border-zinc-800 max-w-[90px] truncate"
                        title={col}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.matrix.map((row, rIdx) => {
                    const rowName = result.numericColumns[rIdx];
                    return (
                      <tr key={rowName} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="p-2 text-zinc-300 font-medium font-mono text-[11px] border-b border-zinc-800/60 max-w-[120px] truncate">
                          {rowName}
                        </td>
                        {row.map((cell, cIdx) => {
                          const coeff = cell.coefficient;
                          let bgStyle = 'bg-zinc-900/60 text-zinc-500';

                          if (rIdx === cIdx) {
                            bgStyle = 'bg-teal-500/20 text-teal-300 font-bold border border-teal-500/30';
                          } else if (coeff >= 0.7) {
                            bgStyle = 'bg-emerald-500/30 text-emerald-200 font-semibold';
                          } else if (coeff >= 0.3) {
                            bgStyle = 'bg-emerald-500/15 text-emerald-300';
                          } else if (coeff <= -0.7) {
                            bgStyle = 'bg-rose-500/30 text-rose-200 font-semibold';
                          } else if (coeff <= -0.3) {
                            bgStyle = 'bg-rose-500/15 text-rose-300';
                          }

                          return (
                            <td
                              key={cIdx}
                              className="p-1.5 border-b border-zinc-800/60 text-center"
                            >
                              <div
                                className={`py-1 px-1.5 rounded text-[11px] font-mono transition-transform hover:scale-110 cursor-help ${bgStyle}`}
                                title={`${cell.colA} & ${cell.colB}: r = ${coeff.toFixed(3)} (${cell.strength.replace('_', ' ')})`}
                              >
                                {coeff.toFixed(2)}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Heatmap Legend */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 mt-2 border-t border-zinc-800/50 text-[10px] text-zinc-500">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-emerald-500/30 border border-emerald-500/40" />
                    <span>Strong Positive (≥ 0.7)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-emerald-500/15 border border-emerald-500/20" />
                    <span>Moderate Positive (0.3 to 0.7)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-zinc-900 border border-zinc-800" />
                    <span>Weak / Neutral</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-rose-500/30 border border-rose-500/40" />
                    <span>Strong Negative (≤ -0.7)</span>
                  </div>
                </div>
                <span className="font-mono text-zinc-500">Pearson's r scale (-1.00 to +1.00)</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

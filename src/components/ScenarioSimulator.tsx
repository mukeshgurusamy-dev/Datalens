/**
 * ScenarioSimulator.tsx
 *
 * Executive "What-If" Sensitivity Simulator Panel
 *
 * React Concepts Demonstrated:
 * ─ useReducer: Complex multi-slider state managed via a pure reducer function
 *   instead of multiple useState calls — mirrors Redux-style immutable state machine
 * ─ useMemo: Heavy simulation computation cached until parameters actually change
 * ─ useCallback: Stable dispatch callbacks prevent child slider re-renders
 * ─ Controlled Inputs: Range sliders are fully controlled React components
 * ─ Compound Component Pattern: Collapsible panel → slider group → result chart
 * ─ CSS-in-JSX animations: Inline bar width transitions via style objects
 */

import { useReducer, useMemo, useCallback, useState } from 'react';
import { Sliders, TrendingUp, TrendingDown, RotateCcw, ChevronDown, ChevronUp, Minus } from 'lucide-react';
import type { DatasetSchema } from '../types/dataset';
import {
  createDefaultParameters,
  pickScenarioColumns,
  runScenario,
  type ScenarioParameter,
} from '../engine/scenario-simulator';

// ── Reducer ────────────────────────────────────────────────────────────

interface SimulatorState {
  parameters: ScenarioParameter[];
  targetCol: string;
  groupCol: string;
}

type SimulatorAction =
  | { type: 'SET_PARAM'; id: string; percentChange: number }
  | { type: 'RESET_ALL' }
  | { type: 'SET_COLUMNS'; targetCol: string; groupCol: string };

function simulatorReducer(state: SimulatorState, action: SimulatorAction): SimulatorState {
  switch (action.type) {
    case 'SET_PARAM':
      return {
        ...state,
        parameters: state.parameters.map((p) =>
          p.id === action.id ? { ...p, percentChange: action.percentChange } : p
        ),
      };
    case 'RESET_ALL':
      return {
        ...state,
        parameters: state.parameters.map((p) => ({ ...p, percentChange: 0 })),
      };
    case 'SET_COLUMNS':
      return { ...state, targetCol: action.targetCol, groupCol: action.groupCol };
    default:
      return state;
  }
}

// ── Props ──────────────────────────────────────────────────────────────

interface ScenarioSimulatorProps {
  dataset: DatasetSchema;
}

// ── Component ──────────────────────────────────────────────────────────

export const ScenarioSimulator: React.FC<ScenarioSimulatorProps> = ({ dataset }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Pick best columns
  const columnsChoice = useMemo(() => pickScenarioColumns(dataset.columns), [dataset.columns]);

  const [state, dispatch] = useReducer(simulatorReducer, {
    parameters: createDefaultParameters(),
    targetCol: columnsChoice?.numericCol ?? '',
    groupCol: columnsChoice?.categoryCol ?? '',
  });

  // Available columns for dropdowns
  const numericCols = useMemo(
    () => dataset.columns.filter((c) => c.type === 'number').map((c) => c.name),
    [dataset.columns]
  );
  const categoryCols = useMemo(
    () => dataset.columns.filter((c) => c.type === 'category' || c.type === 'date').map((c) => c.name),
    [dataset.columns]
  );

  // Run simulation — memoized until parameters or data change
  const result = useMemo(() => {
    if (!state.targetCol || !state.groupCol) return null;
    return runScenario(dataset, state.targetCol, state.groupCol, state.parameters);
  }, [dataset, state.targetCol, state.groupCol, state.parameters]);

  // Stable callbacks to prevent child re-renders
  const handleParamChange = useCallback((id: string, percentChange: number) => {
    dispatch({ type: 'SET_PARAM', id, percentChange });
  }, []);

  const handleReset = useCallback(() => {
    dispatch({ type: 'RESET_ALL' });
  }, []);

  if (!columnsChoice) return null;

  const hasChanges = state.parameters.some((p) => p.percentChange !== 0);
  const maxBar = result
    ? Math.max(...result.dataPoints.map((d) => Math.max(d.baseline, d.projected)))
    : 1;

  return (
    <div className="mt-6 rounded-2xl border border-zinc-800/80 bg-zinc-950/50 overflow-hidden">
      {/* Collapsible Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-zinc-900/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
            <Sliders className="w-4 h-4 text-orange-400" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-white">What-If Sensitivity Simulator</h3>
            <p className="text-[11px] text-zinc-500">
              Parametric scenario analysis — adjust sliders to project impact
            </p>
          </div>
          {hasChanges && result && (
            <span
              className={`ml-2 text-[11px] px-2 py-0.5 rounded-full font-mono font-semibold ${
                result.netImpact >= 0
                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                  : 'bg-red-500/15 border border-red-500/30 text-red-400'
              }`}
            >
              {result.netImpact >= 0 ? '+' : ''}
              {result.netImpactPercent.toFixed(1)}% Net Impact
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-zinc-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-zinc-500" />
        )}
      </button>

      {/* Expandable Body */}
      {isExpanded && (
        <div className="px-5 pb-5 border-t border-zinc-800/60">
          {/* Column Selectors */}
          <div className="flex flex-wrap gap-3 mt-4 mb-5">
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-zinc-500 uppercase font-mono">Target Metric</label>
              <select
                value={state.targetCol}
                onChange={(e) =>
                  dispatch({ type: 'SET_COLUMNS', targetCol: e.target.value, groupCol: state.groupCol })
                }
                className="text-xs bg-zinc-900 border border-zinc-700 text-white rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-orange-500/50"
              >
                {numericCols.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-zinc-500 uppercase font-mono">Group By</label>
              <select
                value={state.groupCol}
                onChange={(e) =>
                  dispatch({ type: 'SET_COLUMNS', targetCol: state.targetCol, groupCol: e.target.value })
                }
                className="text-xs bg-zinc-900 border border-zinc-700 text-white rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-orange-500/50"
              >
                {categoryCols.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleReset}
              disabled={!hasChanges}
              className="ml-auto inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Reset All
            </button>
          </div>

          {/* Parameter Sliders */}
          <div className="grid gap-4 mb-6">
            {state.parameters.map((param) => (
              <SliderRow key={param.id} param={param} onChange={handleParamChange} />
            ))}
          </div>

          {/* Results Visualization */}
          {result && result.dataPoints.length > 0 && (
            <div>
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                <SummaryCard
                  label="Baseline Total"
                  value={formatCompact(result.totalBaselineSum)}
                  color="zinc"
                />
                <SummaryCard
                  label="Projected Total"
                  value={formatCompact(result.totalProjectedSum)}
                  color={result.netImpact >= 0 ? 'emerald' : 'red'}
                />
                <SummaryCard
                  label="Net Impact"
                  value={`${result.netImpact >= 0 ? '+' : ''}${formatCompact(result.netImpact)}`}
                  subtext={`${result.netImpact >= 0 ? '+' : ''}${result.netImpactPercent.toFixed(1)}%`}
                  color={result.netImpact >= 0 ? 'emerald' : 'red'}
                />
              </div>

              {/* Dual-Bar Comparison Chart */}
              <div className="space-y-2">
                <h4 className="text-[11px] text-zinc-500 uppercase font-mono mb-3">
                  Baseline vs Projected — {result.targetColumn} by {result.groupColumn}
                </h4>
                {result.dataPoints.slice(0, 12).map((dp) => (
                  <div key={dp.label} className="group">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] text-zinc-400 truncate max-w-[140px]">{dp.label}</span>
                      <div className="flex items-center gap-2 text-[10px] font-mono">
                        <span className="text-zinc-500">{formatCompact(dp.baseline)}</span>
                        <span className="text-zinc-600">→</span>
                        <span className={dp.delta >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                          {formatCompact(dp.projected)}
                        </span>
                        {dp.delta !== 0 && (
                          <span
                            className={`text-[9px] px-1 py-0.5 rounded ${
                              dp.delta >= 0
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : 'bg-red-500/10 text-red-400'
                            }`}
                          >
                            {dp.delta >= 0 ? '+' : ''}
                            {dp.deltaPercent.toFixed(1)}%
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Baseline bar */}
                    <div className="h-2 bg-zinc-800/60 rounded-full overflow-hidden mb-0.5">
                      <div
                        className="h-full bg-zinc-600 rounded-full transition-all duration-500"
                        style={{ width: `${maxBar > 0 ? (dp.baseline / maxBar) * 100 : 0}%` }}
                      />
                    </div>
                    {/* Projected bar */}
                    <div className="h-2 bg-zinc-800/60 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          dp.delta >= 0 ? 'bg-emerald-500/70' : 'bg-red-500/70'
                        }`}
                        style={{ width: `${maxBar > 0 ? (dp.projected / maxBar) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 mt-4 pt-3 border-t border-zinc-800/50">
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                  <div className="w-3 h-1.5 rounded-full bg-zinc-600" />
                  Baseline
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                  <div className="w-3 h-1.5 rounded-full bg-emerald-500/70" />
                  Projected (increase)
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                  <div className="w-3 h-1.5 rounded-full bg-red-500/70" />
                  Projected (decrease)
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Slider Sub-Component ───────────────────────────────────────────────

interface SliderRowProps {
  param: ScenarioParameter;
  onChange: (id: string, percentChange: number) => void;
}

const SliderRow: React.FC<SliderRowProps> = ({ param, onChange }) => {
  const isPositive = param.percentChange > 0;
  const isNegative = param.percentChange < 0;

  return (
    <div className="flex items-center gap-4">
      <div className="w-48 shrink-0">
        <span className="text-xs text-zinc-300 font-medium">{param.label}</span>
      </div>
      <input
        type="range"
        min={param.min}
        max={param.max}
        step={param.step}
        value={param.percentChange}
        onChange={(e) => onChange(param.id, Number(e.target.value))}
        className="flex-1 h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-orange-500"
      />
      <div className="w-20 flex items-center justify-end gap-1">
        {isPositive && <TrendingUp className="w-3 h-3 text-emerald-400" />}
        {isNegative && <TrendingDown className="w-3 h-3 text-red-400" />}
        {!isPositive && !isNegative && <Minus className="w-3 h-3 text-zinc-600" />}
        <span
          className={`text-xs font-mono font-semibold w-12 text-right ${
            isPositive ? 'text-emerald-400' : isNegative ? 'text-red-400' : 'text-zinc-500'
          }`}
        >
          {param.percentChange > 0 ? '+' : ''}
          {param.percentChange}%
        </span>
      </div>
    </div>
  );
};

// ── Summary Card Sub-Component ─────────────────────────────────────────

interface SummaryCardProps {
  label: string;
  value: string;
  subtext?: string;
  color: 'zinc' | 'emerald' | 'red';
}

const SummaryCard: React.FC<SummaryCardProps> = ({ label, value, subtext, color }) => {
  const colorMap = {
    zinc: 'border-zinc-800 text-zinc-300',
    emerald: 'border-emerald-500/30 text-emerald-400',
    red: 'border-red-500/30 text-red-400',
  };

  return (
    <div className={`rounded-xl border bg-zinc-900/50 p-3 ${colorMap[color]}`}>
      <p className="text-[10px] text-zinc-500 uppercase font-mono mb-1">{label}</p>
      <p className="text-lg font-bold font-mono">{value}</p>
      {subtext && <p className="text-[11px] font-mono mt-0.5 opacity-80">{subtext}</p>}
    </div>
  );
};

// ── Helpers ─────────────────────────────────────────────────────────────

function formatCompact(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1)}K`;
  return `${sign}${abs.toFixed(abs % 1 === 0 ? 0 : 1)}`;
}

import React from 'react';
import { BarChart3, RefreshCw, Database, Download, Share2, Activity, Terminal, Calculator } from 'lucide-react';
import type { DatasetSchema } from '../types/dataset';
import type { ExecutiveLens } from '../engine/personas';

interface HeaderProps {
  dataset: DatasetSchema | null;
  onReset: () => void;
  onExport?: () => void;
  onShare?: () => void;
  activePersona?: ExecutiveLens;
  onPersonaChange?: (persona: ExecutiveLens) => void;
  isTelemetryOpen?: boolean;
  onToggleTelemetry?: () => void;
  onOpenSqlStudio?: () => void;
  onOpenFormulaStudio?: () => void;
  onOpenShortcuts?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  dataset,
  onReset,
  onExport,
  onShare,
  activePersona,
  onPersonaChange,
  isTelemetryOpen = false,
  onToggleTelemetry,
  onOpenSqlStudio,
  onOpenFormulaStudio,
  onOpenShortcuts,
}) => {
  return (
    <header className="w-full border-b border-zinc-800/80 bg-[#0c0c0e]/80 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white tracking-tight">
                DataLens
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-semibold">
                Engine
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-none">
              Client-Side Analytics Engine
            </p>
          </div>
        </div>

        {/* Dataset Meta & Actions */}
        {dataset && (
          <div className="flex items-center gap-2.5">
            <div className="hidden sm:flex items-center gap-2 text-xs bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg">
              <Database className="w-3.5 h-3.5 text-blue-400" />
              <span className="font-semibold text-white truncate max-w-xs">
                {dataset.name}
              </span>
              <span className="text-zinc-500">•</span>
              <span className="text-zinc-400 font-mono">
                {dataset.rowCount.toLocaleString()} rows
              </span>
            </div>

            {onPersonaChange && (
              <div className="hidden lg:flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 text-[11px] font-medium mr-1">
                {(['cfo', 'coo', 'cmo'] as ExecutiveLens[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => onPersonaChange(p)}
                    className={`px-2.5 py-1 rounded-md transition-all uppercase font-mono text-[10px] ${
                      activePersona === p
                        ? 'bg-blue-600 text-white font-semibold shadow-xs'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {p.toUpperCase()} Lens
                  </button>
                ))}
              </div>
            )}

            {/* In-Memory SQL Studio Trigger */}
            {onOpenSqlStudio && (
              <button
                onClick={onOpenSqlStudio}
                title="Open In-Memory SQL Query Studio"
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white transition-all shadow-xs"
              >
                <Terminal className="w-3.5 h-3.5 text-purple-400" />
                <span className="hidden sm:inline">SQL Studio</span>
              </button>
            )}

            {/* Formula Studio Trigger */}
            {onOpenFormulaStudio && (
              <button
                onClick={onOpenFormulaStudio}
                title="Open Formula Studio — Build Calculated Columns"
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white transition-all shadow-xs"
              >
                <Calculator className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Formulas</span>
              </button>
            )}

            {/* React 19 Telemetry HUD Trigger */}
            {onToggleTelemetry && (
              <button
                onClick={onToggleTelemetry}
                title="Toggle React 19 Profiler & Telemetry HUD"
                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-all ${
                  isTelemetryOpen
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-xs'
                    : 'text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-850 border-zinc-800'
                }`}
              >
                <div className="relative">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="absolute -top-0.5 -right-0.5 w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <span className="hidden sm:inline">Telemetry</span>
              </button>
            )}

            {onShare && (
              <button
                onClick={onShare}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-200 hover:text-white bg-zinc-850 hover:bg-zinc-800 border border-zinc-750 px-3 py-1.5 rounded-lg transition-colors shadow-sm"
              >
                <Share2 className="w-3.5 h-3.5 text-blue-400" />
                <span>Share</span>
              </button>
            )}

            {onExport && (
              <button
                onClick={onExport}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-lg transition-colors shadow-sm shadow-blue-500/20"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Report</span>
              </button>
            )}

            <button
              onClick={onReset}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-3 py-1.5 rounded-lg transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5 text-zinc-400" />
              <span>Change Data</span>
            </button>

            {onOpenShortcuts && (
              <button
                onClick={onOpenShortcuts}
                title="Keyboard Shortcuts (?)"
                className="hidden sm:inline-flex items-center justify-center w-8 h-8 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-white transition-all text-xs font-mono font-bold"
              >
                ?
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

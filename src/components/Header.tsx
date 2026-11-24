import React from 'react';
import { BarChart3, RefreshCw, Database, Download, Share2 } from 'lucide-react';
import type { DatasetSchema } from '../types/dataset';
import type { ExecutiveLens } from '../engine/personas';

interface HeaderProps {
  dataset: DatasetSchema | null;
  onReset: () => void;
  onExport?: () => void;
  onShare?: () => void;
  activePersona?: ExecutiveLens;
  onPersonaChange?: (persona: ExecutiveLens) => void;
}

export const Header: React.FC<HeaderProps> = ({
  dataset,
  onReset,
  onExport,
  onShare,
  activePersona,
  onPersonaChange,
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
          </div>
        )}
      </div>
    </header>
  );
};

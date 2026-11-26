import React from 'react';
import {
  BarChart3,
  RefreshCw,
  Download,
  Share2,
  Activity,
  Terminal,
  Calculator,
  Sun,
  Moon,
} from 'lucide-react';
import type { DatasetSchema } from '../types/dataset';
import type { ExecutiveLens } from '../engine/personas';
import type { AppTheme } from '../hooks/useTheme';

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
  theme?: AppTheme;
  onToggleTheme?: () => void;
}

export const Header: React.FC<HeaderProps> = React.memo(({
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
  theme = 'dark',
  onToggleTheme,
}) => {
  return (
    <header className="w-full border-b border-[var(--border-hairline)] bg-[var(--bg-canvas)]/85 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Left: Brand & Dataset Breadcrumb */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-hairline)] flex items-center justify-center text-[var(--text-primary)]">
              <BarChart3 className="w-4 h-4" />
            </div>
            <span className="text-sm font-semibold text-[var(--text-primary)] tracking-tight">
              DataLens
            </span>
          </div>

          {dataset && (
            <div className="hidden md:flex items-center gap-2 text-xs min-w-0">
              <span className="text-[var(--text-muted)]">/</span>
              <span className="font-medium text-[var(--text-primary)] truncate max-w-[200px]">
                {dataset.name}
              </span>
              <span className="text-[11px] font-mono text-[var(--text-muted)] bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-2 py-0.5 rounded-md tabular-nums">
                {dataset.rowCount.toLocaleString()} rows
              </span>
            </div>
          )}
        </div>

        {/* Right: Workspace Controls */}
        <div className="flex items-center gap-2">
          {dataset && (
            <>
              {/* Segmented Executive Lens */}
              {onPersonaChange && (
                <div className="hidden lg:flex items-center bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-lg p-0.5 text-[11px] font-mono">
                  {(['cfo', 'coo', 'cmo'] as ExecutiveLens[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => onPersonaChange(p)}
                      className={`px-2.5 py-1 rounded-md transition-colors uppercase ${
                        activePersona === p
                          ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] font-semibold border border-[var(--border-hairline)]'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-transparent'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}

              {/* Unified Studio Tools Group */}
              <div className="flex items-center bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-lg divide-x divide-[var(--border-hairline)] overflow-hidden">
                {onOpenSqlStudio && (
                  <button
                    onClick={onOpenSqlStudio}
                    title="SQL Studio"
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">SQL</span>
                  </button>
                )}

                {onOpenFormulaStudio && (
                  <button
                    onClick={onOpenFormulaStudio}
                    title="Formula Studio"
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
                  >
                    <Calculator className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Formulas</span>
                  </button>
                )}

                {onToggleTelemetry && (
                  <button
                    onClick={onToggleTelemetry}
                    title="React Profiler HUD"
                    className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 transition-colors ${
                      isTelemetryOpen
                        ? 'bg-[var(--bg-elevated)] text-blue-500'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Profiler</span>
                  </button>
                )}
              </div>

              {onShare && (
                <button
                  onClick={onShare}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Share</span>
                </button>
              )}

              {onExport && (
                <button
                  onClick={onExport}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export</span>
                </button>
              )}

              <button
                onClick={onReset}
                title="Load another dataset"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-2.5 py-1.5 rounded-lg transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">New Data</span>
              </button>
            </>
          )}

          {/* Theme Toggle */}
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
          )}

          {dataset && onOpenShortcuts && (
            <button
              onClick={onOpenShortcuts}
              aria-label="Keyboard shortcuts"
              title="Keyboard Shortcuts (?)"
              className="hidden sm:inline-flex items-center justify-center w-8 h-8 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors text-xs font-mono font-semibold"
            >
              ?
            </button>
          )}
        </div>
      </div>
    </header>
  );
});

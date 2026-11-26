import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BarChart3,
  RefreshCw,
  Download,
  Share2,
  Activity,
  Terminal,
  Calculator,
  Menu,
  X,
} from 'lucide-react';
import { FLUID_SPRING, ScrollProgressBar } from './MotionPrimitives';
import type { DatasetSchema } from '../types/dataset';
import { EXECUTIVE_PERSONAS, type ExecutiveLens } from '../engine/personas';

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
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const runAndCloseMobile = (fn?: () => void) => {
    setMobileMenuOpen(false);
    fn?.();
  };

  return (
    <header className="w-full border-b border-[var(--border-hairline)] bg-[var(--bg-canvas)]/85 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-[1800px] mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Brand & Dataset Breadcrumb */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
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
              <span className="font-medium text-[var(--text-primary)] truncate max-w-[180px] xl:max-w-[260px]">
                {dataset.name}
              </span>
              <span className="text-[11px] font-mono text-[var(--text-muted)] bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-2 py-0.5 rounded-md tabular-nums shrink-0">
                {dataset.rowCount.toLocaleString()} rows
              </span>
            </div>
          )}
        </div>

        {/* Right: Workspace Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {dataset && (
            <>
              {/* Segmented Executive Lens (Tablet md+ and Desktop) */}
              {onPersonaChange && (
                <div
                  role="group"
                  aria-label="Executive leadership lens"
                  className="hidden md:flex items-center bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-lg p-0.5 text-[11px] font-mono"
                >
                  {(['cfo', 'coo', 'cmo'] as ExecutiveLens[]).map((p) => {
                    const isActive = activePersona === p;
                    const info = EXECUTIVE_PERSONAS[p];
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => onPersonaChange(p)}
                        title={`${info.fullName} (${info.role})`}
                        aria-pressed={isActive}
                        className={`group relative flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all ${
                          isActive
                            ? 'text-[var(--text-primary)] font-semibold'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {isActive && (
                          <motion.span
                            layoutId="persona-lens-pill"
                            transition={FLUID_SPRING}
                            className="absolute inset-0 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)]"
                          />
                        )}
                        <span className="relative z-10 font-mono uppercase">{info.abbreviation}</span>
                        {/* Smooth fluid expansion on active or hover */}
                        <span
                          className={`relative z-10 text-[10px] tracking-normal font-sans font-normal transition-all duration-200 overflow-hidden whitespace-nowrap ${
                            isActive
                              ? 'inline-block max-w-[140px] opacity-100 text-[var(--text-secondary)]'
                              : 'hidden group-hover:inline-block max-w-[140px] opacity-80 text-[var(--text-muted)]'
                          }`}
                        >
                          • {info.fullName}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Desktop / Tablet Studio Tools Group */}
              <div className="hidden sm:flex items-center bg-[var(--bg-surface)] border border-[var(--border-hairline)] rounded-lg divide-x divide-[var(--border-hairline)] overflow-hidden">
                {onOpenSqlStudio && (
                  <button
                    onClick={onOpenSqlStudio}
                    title="SQL Studio"
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    <span className="hidden lg:inline">SQL</span>
                  </button>
                )}

                {onOpenFormulaStudio && (
                  <button
                    onClick={onOpenFormulaStudio}
                    title="Formula Studio"
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
                  >
                    <Calculator className="w-3.5 h-3.5" />
                    <span className="hidden lg:inline">Formulas</span>
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
                    <span className="hidden lg:inline">Profiler</span>
                  </button>
                )}
              </div>

              {onShare && (
                <button
                  onClick={onShare}
                  title="Share link"
                  className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span className="hidden lg:inline">Share</span>
                </button>
              )}

              {onExport && (
                <button
                  onClick={onExport}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 px-3 min-h-[36px] sm:min-h-0 sm:py-1.5 rounded-lg transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export</span>
                </button>
              )}

              <button
                onClick={onReset}
                title="Load another dataset"
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-[var(--border-hairline)] px-2.5 py-1.5 rounded-lg transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">New Data</span>
              </button>

              {onOpenShortcuts && (
                <button
                  onClick={onOpenShortcuts}
                  aria-label="Keyboard shortcuts"
                  title="Keyboard Shortcuts (?)"
                  className="hidden sm:inline-flex items-center justify-center w-8 h-8 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors text-xs font-mono font-semibold"
                >
                  ?
                </button>
              )}

              {/* Mobile Tools Menu Button (40x40 touch target) */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                aria-label={mobileMenuOpen ? 'Close tools menu' : 'Open tools menu'}
                aria-expanded={mobileMenuOpen}
                className="sm:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-primary)]"
              >
                {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Mobile Slide-Down Tools Drawer */}
      <AnimatePresence>
        {dataset && mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="sm:hidden border-t border-[var(--border-hairline)] bg-[var(--bg-surface)] overflow-hidden"
          >
            <div className="p-3 space-y-3">
              {/* Mobile Persona Selector */}
              {onPersonaChange && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono text-[var(--text-muted)] uppercase">
                      Executive Lens
                    </span>
                    {activePersona && (
                      <span className="text-[10px] text-[var(--text-secondary)] font-medium">
                        {EXECUTIVE_PERSONAS[activePersona].fullName}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-1 bg-[var(--bg-elevated)] border border-[var(--border-hairline)] rounded-lg p-1 text-xs">
                    {(['cfo', 'coo', 'cmo'] as ExecutiveLens[]).map((p) => {
                      const isActive = activePersona === p;
                      const info = EXECUTIVE_PERSONAS[p];
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => runAndCloseMobile(() => onPersonaChange(p))}
                          className={`flex flex-col items-center justify-center py-2 px-1 rounded-md transition-colors ${
                            isActive
                              ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] font-semibold border border-[var(--border-hairline)] shadow-sm'
                              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          <span className="font-mono font-bold uppercase">{info.abbreviation}</span>
                          <span className="text-[9px] text-[var(--text-muted)] leading-tight text-center truncate max-w-full">
                            {info.fullName.replace('Chief ', '')}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Mobile Tool Grid (44px touch-friendly rows) */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {onOpenSqlStudio && (
                  <button
                    onClick={() => runAndCloseMobile(onOpenSqlStudio)}
                    className="flex items-center gap-2 px-3 min-h-[44px] rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
                  >
                    <Terminal className="w-4 h-4" />
                    <span>SQL Studio</span>
                  </button>
                )}
                {onOpenFormulaStudio && (
                  <button
                    onClick={() => runAndCloseMobile(onOpenFormulaStudio)}
                    className="flex items-center gap-2 px-3 min-h-[44px] rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
                  >
                    <Calculator className="w-4 h-4" />
                    <span>Formulas</span>
                  </button>
                )}
                {onToggleTelemetry && (
                  <button
                    onClick={() => runAndCloseMobile(onToggleTelemetry)}
                    className="flex items-center gap-2 px-3 min-h-[44px] rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
                  >
                    <Activity className="w-4 h-4" />
                    <span>Profiler HUD</span>
                  </button>
                )}
                {onShare && (
                  <button
                    onClick={() => runAndCloseMobile(onShare)}
                    className="flex items-center gap-2 px-3 min-h-[44px] rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Share Link</span>
                  </button>
                )}
                <button
                  onClick={() => runAndCloseMobile(onReset)}
                  className="col-span-2 flex items-center justify-center gap-2 px-3 min-h-[44px] rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-muted)]"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Load New Dataset</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {dataset && <ScrollProgressBar />}
    </header>
  );
});

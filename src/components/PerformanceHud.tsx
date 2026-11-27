import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useTelemetry } from '../engine/telemetry-store';
import { Activity, X, Gauge, Zap, Layers, RefreshCw } from 'lucide-react';

interface PerformanceHudProps {
  isOpen: boolean;
  onClose: () => void;
  isPendingTransition?: boolean;
}

const PerformanceHudContent: React.FC<{
  onClose: () => void;
  isPendingTransition: boolean;
}> = ({ onClose, isPendingTransition }) => {
  const { latestCommit, commits, avgDurationMs, totalCommitCount, maxDurationMs } = useTelemetry();
  const [activeTab, setActiveTab] = useState<'overview' | 'commits'>('overview');

  const actualMs = latestCommit ? Math.round(latestCommit.actualDuration * 100) / 100 : 0;
  const isOptimal = actualMs < 4;
  const statusColor = isOptimal
    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
    : actualMs < 16
    ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
    : 'text-rose-400 bg-rose-500/10 border-rose-500/20';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
      className="fixed bottom-3 right-3 sm:bottom-6 sm:right-6 z-50 w-[calc(100vw-1.5rem)] sm:w-96 max-h-[75dvh] flex flex-col rounded-xl bg-[#101014]/95 border border-zinc-800 shadow-2xl backdrop-blur-xl overflow-hidden font-sans text-xs"
      style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-[#14141a]/60">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <span className="font-semibold text-white tracking-tight">React 19 Telemetry HUD</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono ${statusColor}`}>
            {actualMs}ms
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800/60 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800/80 bg-zinc-950/40 text-[11px]">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 py-1.5 px-3 text-center transition-colors border-b-2 font-medium ${
            activeTab === 'overview'
              ? 'border-emerald-400 text-white bg-zinc-900/40'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Vitals Overview
        </button>
        <button
          onClick={() => setActiveTab('commits')}
          className={`flex-1 py-1.5 px-3 text-center transition-colors border-b-2 font-medium ${
            activeTab === 'commits'
              ? 'border-emerald-400 text-white bg-zinc-900/40'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Commit Log ({commits.length})
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4 max-h-80 overflow-y-auto">
        {activeTab === 'overview' ? (
          <>
            {/* Metric Grid */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-xl bg-zinc-900/70 border border-zinc-800/80">
                <div className="flex items-center gap-1.5 text-zinc-400 mb-1">
                  <Gauge className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-[11px]">Latest Commit</span>
                </div>
                <div className="text-lg font-bold text-white font-mono">{actualMs} ms</div>
                <div className="text-[10px] text-zinc-400">
                  Base: {latestCommit ? Math.round(latestCommit.baseDuration * 10) / 10 : 0}ms
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-zinc-900/70 border border-zinc-800/80">
                <div className="flex items-center gap-1.5 text-zinc-400 mb-1">
                  <Zap className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[11px]">Avg Commit</span>
                </div>
                <div className="text-lg font-bold text-white font-mono">{avgDurationMs} ms</div>
                <div className="text-[10px] text-zinc-400">Peak: {maxDurationMs}ms</div>
              </div>
            </div>

            {/* Architecture Indicators */}
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-900/40 border border-zinc-800/60">
                <div className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-zinc-300">Concurrent Scheduling:</span>
                </div>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                    isPendingTransition
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                      : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  }`}
                >
                  {isPendingTransition ? 'Transitioning (Non-blocking)' : 'Idle (Ready)'}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-900/40 border border-zinc-800/60">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-zinc-300">Total Tree Commits:</span>
                </div>
                <span className="font-mono text-white font-semibold">{totalCommitCount}</span>
              </div>
            </div>

            {/* Mini Commit Bar Graph */}
            <div>
              <div className="text-[10px] text-zinc-400 uppercase tracking-wider mb-1.5 flex justify-between">
                <span>Recent Commit Stream</span>
                <span>Sub-4ms Target</span>
              </div>
              <div className="flex items-end gap-1 h-12 p-1.5 rounded-xl bg-zinc-950/80 border border-zinc-850">
                {commits.slice(0, 20).reverse().map((c, i) => {
                  const h = Math.min(100, Math.max(15, (c.actualDuration / 10) * 100));
                  const bg =
                    c.actualDuration < 4
                      ? 'bg-emerald-400/80 hover:bg-emerald-300'
                      : c.actualDuration < 16
                      ? 'bg-amber-400/80 hover:bg-amber-300'
                      : 'bg-rose-400/80 hover:bg-rose-300';
                  return (
                    <motion.div
                      key={c.commitTime ?? i}
                      initial={{ scaleY: 0, opacity: 0.4 }}
                      animate={{ scaleY: 1, opacity: 1 }}
                      transition={{ duration: 0.3, delay: i * 0.015, ease: 'easeOut' }}
                      title={`${c.id}: ${Math.round(c.actualDuration * 100) / 100}ms (${c.phase})`}
                      className={`flex-1 rounded-sm transition-colors cursor-pointer ${bg}`}
                      style={{ height: `${h}%`, transformOrigin: 'bottom' }}
                    />
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-1.5">
            {commits.map((c, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-1.5 rounded-lg bg-zinc-900/50 border border-zinc-800/50 text-[11px]"
              >
                <div className="flex items-center gap-2">
                  <span className="text-zinc-300 font-medium">{c.id}</span>
                  <span className="text-[9px] px-1 rounded bg-zinc-800 text-zinc-400 font-mono">
                    {c.phase}
                  </span>
                </div>
                <div className="font-mono text-white font-semibold">
                  {Math.round(c.actualDuration * 100) / 100} ms
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="px-4 py-2 border-t border-zinc-850 bg-zinc-950/60 text-[10px] text-zinc-400 flex items-center justify-between">
        <span>Instrumented via native React &lt;Profiler&gt;</span>
        <span className="text-emerald-400 font-mono">60 FPS Target</span>
      </div>
    </motion.div>
  );
};

export const PerformanceHud: React.FC<PerformanceHudProps> = ({
  isOpen,
  onClose,
  isPendingTransition = false,
}) => {
  if (!isOpen) return null;

  return (
    <PerformanceHudContent
      onClose={onClose}
      isPendingTransition={isPendingTransition}
    />
  );
};

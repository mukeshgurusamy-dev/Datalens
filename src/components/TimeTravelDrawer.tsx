import React, { useEffect, useState } from 'react';
import { useHistory, historyStore, type DashboardSnapshot } from '../engine/history-store';
import { History, Undo2, Redo2, Clock, ChevronUp, ChevronDown, CheckCircle2 } from 'lucide-react';

interface TimeTravelDrawerProps {
  onRestoreSnapshot: (snapshot: DashboardSnapshot) => void;
}

export const TimeTravelDrawer: React.FC<TimeTravelDrawerProps> = ({ onRestoreSnapshot }) => {
  const { past, present, future } = useHistory();
  const [isExpanded, setIsExpanded] = useState(false);

  // Keyboard shortcut listener for Ctrl+Z and Ctrl+Y / Ctrl+Shift+Z
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input or textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      if (modifier && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          // Redo
          const next = historyStore.redo();
          if (next) onRestoreSnapshot(next);
        } else {
          // Undo
          const prev = historyStore.undo();
          if (prev) onRestoreSnapshot(prev);
        }
      } else if (modifier && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        const next = historyStore.redo();
        if (next) onRestoreSnapshot(next);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onRestoreSnapshot]);

  if (!present && past.length === 0 && future.length === 0) {
    return null;
  }

  const handleUndo = () => {
    const prev = historyStore.undo();
    if (prev) onRestoreSnapshot(prev);
  };

  const handleRedo = () => {
    const next = historyStore.redo();
    if (next) onRestoreSnapshot(next);
  };

  const handleJump = (index: number) => {
    const target = historyStore.jumpTo(index);
    if (target) onRestoreSnapshot(target);
  };

  const canUndo = past.length > 0;
  const canRedo = future.length > 0;
  const allSnapshots = [...past, ...(present ? [present] : []), ...future];
  const presentIndex = past.length;

  return (
    <div
      data-export-ignore="true"
      className="fixed bottom-3 left-3 sm:bottom-6 sm:left-6 z-40 max-w-[calc(100vw-1.5rem)] sm:max-w-sm rounded-xl bg-[#101014]/95 border border-zinc-800 shadow-2xl backdrop-blur-xl font-sans text-xs transition-all overflow-hidden"
      style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Primary Toolbar Bar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-[#14141a]/80">
        <div className="flex items-center gap-1.5 text-zinc-400 pl-1">
          <History className="w-3.5 h-3.5 text-blue-400" />
          <span className="font-semibold text-white tracking-tight text-[11px]">Time-Travel</span>
        </div>

        <div className="h-3 w-[1px] bg-zinc-800 mx-1" />

        {/* Undo Button */}
        <button
          onClick={handleUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-medium transition-colors ${
            canUndo
              ? 'bg-zinc-900 border-zinc-750 text-white hover:bg-zinc-800'
              : 'bg-zinc-950/40 border-zinc-850 text-zinc-600 cursor-not-allowed'
          }`}
        >
          <Undo2 className="w-3 h-3" />
          <span>Undo</span>
        </button>

        {/* Redo Button */}
        <button
          onClick={handleRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
          className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-medium transition-colors ${
            canRedo
              ? 'bg-zinc-900 border-zinc-750 text-white hover:bg-zinc-800'
              : 'bg-zinc-950/40 border-zinc-850 text-zinc-600 cursor-not-allowed'
          }`}
        >
          <Redo2 className="w-3 h-3" />
          <span>Redo</span>
        </button>

        <div className="h-3 w-[1px] bg-zinc-800 mx-1" />

        {/* Toggle Expand */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          title="View Timeline Stack"
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-900/50 hover:bg-zinc-800/80 text-zinc-400 hover:text-white transition-colors text-[11px]"
        >
          <Clock className="w-3 h-3 text-emerald-400" />
          <span>{allSnapshots.length}</span>
          {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
        </button>
      </div>

      {/* Expanded History Stack Drawer */}
      {isExpanded && (
        <div className="p-3 border-t border-zinc-800 bg-[#0d0d11]/90 max-h-60 overflow-y-auto space-y-1.5">
          <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold mb-2">
            Session State Timeline
          </div>
          {allSnapshots.map((snap, idx) => {
            const isCurrent = idx === presentIndex;
            const isPast = idx < presentIndex;
            return (
              <button
                key={snap.timestamp + '-' + idx}
                onClick={() => handleJump(idx)}
                className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all text-[11px] ${
                  isCurrent
                    ? 'bg-blue-500/10 border border-blue-500/30 text-blue-200'
                    : isPast
                    ? 'bg-zinc-900/40 border border-zinc-800/40 text-zinc-300 hover:bg-zinc-850'
                    : 'bg-zinc-950/40 border border-zinc-900 text-zinc-400 hover:text-zinc-400'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  {isCurrent ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                  ) : (
                    <div
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        isPast ? 'bg-zinc-600' : 'bg-zinc-800'
                      }`}
                    />
                  )}
                  <span className="truncate font-medium">{snap.label}</span>
                </div>
                <span className="text-[9px] font-mono text-zinc-400 pl-2">
                  {new Date(snap.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

/**
 * ShortcutsModal.tsx
 *
 * Power-User Keyboard Shortcuts Cheat Sheet
 */

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Keyboard } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
  category: 'Navigation' | 'Editing' | 'Data';
}

const SHORTCUTS: ShortcutItem[] = [
  { keys: ['Ctrl', 'V'], description: 'Paste spreadsheet cells from Excel or Google Sheets', category: 'Data' },
  { keys: ['Ctrl', 'Z'], description: 'Time-Travel Undo (Restore previous dashboard state)', category: 'Editing' },
  { keys: ['Ctrl', 'Y'], description: 'Time-Travel Redo (Move forward in history)', category: 'Editing' },
  { keys: ['Ctrl', 'Enter'], description: 'Execute query in SQL Studio', category: 'Editing' },
  { keys: ['?'], description: 'Toggle Keyboard Shortcuts cheat sheet', category: 'Navigation' },
  { keys: ['Esc'], description: 'Close any active modal or slide-over drawer', category: 'Navigation' },
];

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  // Listen for '?' key to toggle shortcuts modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        if (isOpen) {
          onClose();
        }
      }
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
          className="w-full max-w-lg bg-[#0f0f13] border border-zinc-800 rounded-2xl p-6 shadow-2xl relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600/15 border border-blue-500/25 flex items-center justify-center text-blue-400">
                <Keyboard className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white tracking-tight">
                  Keyboard Shortcuts
                </h3>
                <p className="text-[11px] text-zinc-400">Power-user accelerators for DataLens Engine</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Shortcuts List */}
          <div className="mt-5 space-y-3">
            {SHORTCUTS.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between py-2 px-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 text-xs"
              >
                <span className="text-zinc-300 font-medium">{item.description}</span>
                <div className="flex items-center gap-1.5 shrink-0 ml-4">
                  {item.keys.map((k, kIdx) => (
                    <kbd
                      key={kIdx}
                      className="px-2 py-1 text-[11px] font-mono font-semibold bg-zinc-800 text-zinc-200 border border-zinc-700 rounded-md shadow-xs"
                    >
                      {k}
                    </kbd>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-zinc-800/60 text-center">
            <p className="text-[11px] text-zinc-500">
              Press <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-400 font-mono">?</kbd> anywhere to open this menu
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

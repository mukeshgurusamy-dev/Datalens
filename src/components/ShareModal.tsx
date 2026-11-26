import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Copy, Check, Share2, Globe, ExternalLink, ShieldCheck } from 'lucide-react';
import type { DatasetSchema, DataFilterState } from '../types/dataset';
import { encodeDashboardState } from '../engine/permalink';
import { useModalAccessibility } from '../hooks/useModalAccessibility';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataset: DatasetSchema;
  filters: DataFilterState;
  customCharts: Record<string, any>;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  dataset,
  filters,
  customCharts,
}) => {
  const [copied, setCopied] = useState(false);
  const [includeFilters, setIncludeFilters] = useState(true);
  const [includeCustomCharts, setIncludeCustomCharts] = useState(true);
  const dialogRef = useModalAccessibility(isOpen, onClose);

  if (!isOpen) return null;

  // Generate URL-safe client-side permalink hash
  const encodedHash = encodeDashboardState(
    dataset,
    includeFilters ? filters : undefined,
    includeCustomCharts ? customCharts : undefined
  );

  const shareUrl = `${window.location.origin}${window.location.pathname}#share=${encodedHash}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
    } catch {
      // Fallback: use legacy execCommand approach
      try {
        const textarea = document.createElement('textarea');
        textarea.value = shareUrl;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      } catch { /* ignore */ }
      setCopied(true);
    }
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs" onClick={onClose}>
        <motion.div
          ref={dialogRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby="share-modal-title"
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg bg-[#121215] border border-zinc-800 rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl focus:outline-none max-h-[92dvh] overflow-y-auto pb-safe sm:pb-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-zinc-850">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Share2 className="w-4 h-4" />
              </div>
              <div>
                <h3 id="share-modal-title" className="text-base font-semibold text-white tracking-tight">
                  Share Executive Dashboard
                </h3>
                <p className="text-xs text-zinc-400">
                  Instant, zero-server permalink encoded with live schema and visual state.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close modal"
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Configuration Options */}
          <div className="my-5 space-y-3">
            <label className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-300 cursor-pointer hover:border-zinc-700 transition-colors">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <div>
                  <span className="font-medium text-white block">Include Active Filters</span>
                  <span className="text-[11px] text-zinc-500">
                    Recipients see your exact filtered subset of records
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={includeFilters}
                onChange={(e) => setIncludeFilters(e.target.checked)}
                className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-300 cursor-pointer hover:border-zinc-700 transition-colors">
              <div className="flex items-center gap-2.5">
                <Globe className="w-4 h-4 text-blue-400" />
                <div>
                  <span className="font-medium text-white block">Include Customized Charts</span>
                  <span className="text-[11px] text-zinc-500">
                    Preserves customized X/Y axes and visualization types
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={includeCustomCharts}
                onChange={(e) => setIncludeCustomCharts(e.target.checked)}
                className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
              />
            </label>
          </div>

          {/* Generated Link Input */}
          <div className="relative flex items-center mb-4">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="w-full bg-[#18181b] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-400 font-mono pr-24 focus:outline-none select-all"
            />
            <button
              onClick={handleCopy}
              className="absolute right-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                  <span className="text-emerald-300">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          {/* Test in New Tab Link */}
          <div className="flex items-center justify-between pt-3 border-t border-zinc-850 text-xs">
            <span className="text-zinc-500">
              Anyone with this link can view this interactive dashboard.
            </span>
            <a
              href={shareUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 font-medium"
            >
              <span>Test Link</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

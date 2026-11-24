import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, FileText, Image, Download, CheckCircle2, AlertCircle } from 'lucide-react';
import { exportDashboardAsPdf, exportDashboardAsPng } from '../engine/exporter';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  datasetName: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  datasetName,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExport = async (format: 'pdf' | 'png') => {
    const printableArea = document.getElementById('dashboard-printable-area');
    if (!printableArea) {
      setError('Could not locate dashboard printable container.');
      return;
    }

    setIsExporting(true);
    setError(null);
    setExportSuccess(null);

    try {
      if (format === 'pdf') {
        await exportDashboardAsPdf(printableArea, datasetName);
        setExportSuccess('Executive PDF Report downloaded successfully!');
      } else {
        await exportDashboardAsPng(printableArea, datasetName);
        setExportSuccess('High-Resolution PNG Snapshot downloaded successfully!');
      }

      setTimeout(() => {
        setIsExporting(false);
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Export failed. Please try again.');
      setIsExporting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="w-full max-w-md bg-[#121215] border border-zinc-800 rounded-2xl p-6 shadow-2xl relative"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <Download className="w-5 h-5 text-blue-400" />
              <h3 className="text-base font-semibold text-white tracking-tight">
                Export Dashboard Report
              </h3>
            </div>
            <button
              onClick={onClose}
              disabled={isExporting}
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-zinc-400 mt-3 mb-6">
            Export the live state of <strong className="text-white">{datasetName}</strong>, including all active filters, KPI metrics, and visualizations.
          </p>

          {/* Export Choices */}
          <div className="space-y-3">
            <button
              onClick={() => handleExport('pdf')}
              disabled={isExporting}
              className="w-full p-4 rounded-xl bg-[#18181b] border border-zinc-800 hover:border-blue-500/50 hover:bg-blue-500/5 text-left transition-all group flex items-start justify-between disabled:opacity-50"
            >
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 mt-0.5">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors">
                    Executive PDF Report
                  </h4>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Boardroom-ready A4 document with headers, metadata, and auto-pagination.
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => handleExport('png')}
              disabled={isExporting}
              className="w-full p-4 rounded-xl bg-[#18181b] border border-zinc-800 hover:border-emerald-500/50 hover:bg-emerald-500/5 text-left transition-all group flex items-start justify-between disabled:opacity-50"
            >
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mt-0.5">
                  <Image className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">
                    High-Resolution PNG Snapshot
                  </h4>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Ultra-crisp 2x Retina image ideal for Slack, emails, or slides.
                  </p>
                </div>
              </div>
            </button>
          </div>

          {/* Status Indicators */}
          {isExporting && (
            <div className="mt-5 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs flex items-center gap-2.5">
              <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
              <span>Generating executive report and vectorizing charts...</span>
            </div>
          )}

          {exportSuccess && (
            <div className="mt-5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{exportSuccess}</span>
            </div>
          )}

          {error && (
            <div className="mt-5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

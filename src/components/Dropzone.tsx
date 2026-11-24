import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UploadCloud, Sparkles, AlertCircle, ArrowRight, Clipboard, Link2, Download } from 'lucide-react';
import { SAMPLES } from '../data/samples';
import { parseCSV, parseExcel, parseJSON, parseClipboardSpreadsheet } from '../engine/parser';
import { profileDataset } from '../engine/profiler';
import { fetchExternalCsv } from '../engine/permalink';
import type { DatasetSchema } from '../types/dataset';

interface DropzoneProps {
  onDatasetLoaded: (dataset: DatasetSchema) => void;
}

export const Dropzone: React.FC<DropzoneProps> = ({ onDatasetLoaded }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFetchUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = urlInput.trim();
    if (!target) return;

    setIsFetchingUrl(true);
    setError(null);
    try {
      const rows = await fetchExternalCsv(target);
      if (!rows || rows.length === 0) {
        throw new Error('No records returned from external URL.');
      }
      const inferredName = target.split('/').pop()?.split('?')[0] || 'Remote Dataset';
      const schema = profileDataset(inferredName, rows);
      onDatasetLoaded(schema);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data from URL.');
    } finally {
      setIsFetchingUrl(false);
    }
  };

  // Global paste listener for instant Excel/Google Sheets copy-paste
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData('text');
      if (text && text.trim().length > 10) {
        try {
          setIsLoading(true);
          setError(null);
          const rows = parseClipboardSpreadsheet(text);
          if (rows.length > 0) {
            const schema = profileDataset('Clipboard Spreadsheet', rows);
            onDatasetLoaded(schema);
          }
        } catch (err: any) {
          setError(err.message || 'Failed to parse clipboard data.');
        } finally {
          setIsLoading(false);
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [onDatasetLoaded]);

  const processFile = async (file: File) => {
    setIsLoading(true);
    setError(null);
    try {
      let rows: Record<string, any>[] = [];
      const extension = file.name.split('.').pop()?.toLowerCase();

      if (extension === 'csv' || extension === 'tsv' || extension === 'txt') {
        rows = await parseCSV(file);
      } else if (extension === 'xlsx' || extension === 'xls') {
        rows = await parseExcel(file);
      } else if (extension === 'json') {
        const text = await file.text();
        rows = parseJSON(text);
      } else {
        throw new Error('Unsupported format. Please upload a CSV, Excel (.xlsx/.xls), or JSON file.');
      }

      if (!rows || rows.length === 0) {
        throw new Error('The uploaded file contains no data rows.');
      }

      const schema = profileDataset(file.name, rows);
      onDatasetLoaded(schema);
    } catch (err: any) {
      setError(err.message || 'Failed to parse file.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

  const loadSample = (sampleId: string) => {
    const sample = SAMPLES.find((s) => s.id === sampleId);
    if (!sample) return;
    setIsLoading(true);
    setTimeout(() => {
      const schema = profileDataset(sample.name, sample.rows);
      onDatasetLoaded(schema);
      setIsLoading(false);
    }, 150);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-12 flex flex-col items-center">
      {/* Hero Title */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="text-center mb-10"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 border border-blue-500/20 text-blue-400 mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Zero-Server Instant Analytics</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white mb-3">
          Drop in data. Get a dashboard.
        </h1>
        <p className="text-sm sm:text-base text-zinc-400 max-w-xl mx-auto">
          Upload any CSV, Excel, or JSON file. DataLens automatically profiles columns, detects trends, and builds an executive dashboard in milliseconds.
        </p>
      </motion.div>

      {/* Main Drag-and-Drop Card */}
      <motion.div
        layout
        whileHover={{ scale: 1.008 }}
        whileTap={{ scale: 0.995 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`w-full cursor-pointer rounded-2xl p-8 sm:p-12 text-center transition-all duration-200 border-2 border-dashed ${
          isDragging
            ? 'border-blue-500 bg-blue-500/5 shadow-2xl shadow-blue-500/10'
            : 'border-zinc-800 bg-[#121215] hover:border-zinc-700 hover:bg-[#16161a]'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls,.json,.tsv,.txt"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              processFile(e.target.files[0]);
            }
          }}
        />

        <div className="flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-5 text-blue-400">
            {isLoading ? (
              <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <UploadCloud className="w-8 h-8" />
            )}
          </div>

          <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">
            {isLoading ? 'Profiling Dataset...' : 'Drag and drop your file here'}
          </h3>
          <p className="text-xs sm:text-sm text-zinc-400 mb-4">
            Supports <span className="text-zinc-200 font-medium">.csv</span>, <span className="text-zinc-200 font-medium">.xlsx</span>, <span className="text-zinc-200 font-medium">.xls</span>, and <span className="text-zinc-200 font-medium">.json</span> files.
          </p>

          <div className="inline-flex items-center gap-2 text-xs text-zinc-500 bg-zinc-900/80 px-3 py-1.5 rounded-lg border border-zinc-800">
            <Clipboard className="w-3.5 h-3.5 text-zinc-400" />
            <span>Pro tip: Press <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 font-mono text-[10px]">Ctrl+V</kbd> to paste directly from Excel or Google Sheets</span>
          </div>
        </div>
      </motion.div>

      {/* Error Banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="w-full mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* URL & Google Sheets Ingestion Bar */}
      <div className="w-full mt-4 p-3 rounded-2xl bg-[#121215] border border-zinc-800">
        <form onSubmit={handleFetchUrl} className="flex flex-col sm:flex-row items-center gap-2">
          <div className="relative flex-1 w-full">
            <Link2 className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="url"
              placeholder="Or paste a public Google Sheets or raw CSV link..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="w-full bg-[#18181b] border border-zinc-800 focus:border-blue-500 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={!urlInput.trim() || isFetchingUrl}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shrink-0 shadow-sm"
          >
            {isFetchingUrl ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>Fetch & Profile</span>
          </button>
        </form>
      </div>

      {/* Sample Datasets Section */}
      <div className="w-full mt-10">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Or try with pre-loaded datasets
          </span>
          <span className="text-xs text-zinc-500">1-click demo</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {SAMPLES.map((sample) => (
            <motion.button
              key={sample.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => loadSample(sample.id)}
              className="p-4 rounded-xl bg-[#121215] border border-zinc-800/80 hover:border-zinc-700 hover:bg-[#16161b] text-left transition-all group flex flex-col justify-between"
            >
              <div>
                <span className="inline-block text-[11px] font-medium text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md mb-2">
                  {sample.badge}
                </span>
                <h4 className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors">
                  {sample.name}
                </h4>
                <p className="text-xs text-zinc-400 line-clamp-2 mt-1">
                  {sample.description}
                </p>
              </div>

              <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 group-hover:text-blue-400 mt-4">
                <span>Load dataset</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
};

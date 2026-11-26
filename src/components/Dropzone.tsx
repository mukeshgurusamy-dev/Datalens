import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  UploadCloud,
  AlertCircle,
  ArrowUpRight,
  Clipboard,
  Link2,
  Download,
  FileSpreadsheet,
  Shield,
  Cpu,
  Terminal,
} from 'lucide-react';
import { SAMPLES } from '../data/samples';
import { ScrollReveal } from './MotionPrimitives';
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
    }, 120);
  };

  return (
    <div className="w-full max-w-6xl mx-auto py-8 sm:py-12">
      {/* Architectural 2-Column Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Editorial Intro + Ingestion Surface */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="lg:col-span-7 space-y-6"
        >
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 text-xs font-mono text-[var(--text-muted)]">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <span>CLIENT-SIDE ANALYTICS WORKSPACE</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[var(--text-primary)] leading-[1.15]">
              Drop in raw data. Explore it at 60 FPS.
            </h1>
            <p className="text-sm text-[var(--text-muted)] max-w-xl leading-relaxed">
              Ingest CSV, Excel, JSON, or Google Sheets directly in browser memory. Automatic schema profiling, cross-filtering, in-memory SQL, and PDF reporting with zero server uploads.
            </p>
          </div>

          {/* Primary Dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`studio-grid-bg relative cursor-pointer rounded-xl p-8 sm:p-10 text-center transition-colors border border-dashed ${
              isDragging
                ? 'border-blue-500 bg-blue-500/5'
                : 'border-[var(--border-strong)] bg-[var(--bg-surface)] hover:border-blue-500/60'
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

            <div className="flex flex-col items-center">
              <div className="w-11 h-11 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-hairline)] flex items-center justify-center mb-4 text-[var(--text-primary)]">
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <UploadCloud className="w-5 h-5" />
                )}
              </div>

              <p className="text-sm font-medium text-[var(--text-primary)] mb-1">
                {isLoading ? 'Profiling dataset...' : 'Drop a file here, or click to browse'}
              </p>
              <p className="text-xs text-[var(--text-muted)] mb-4">
                Supports <span className="font-mono text-[var(--text-secondary)]">.csv</span>,{' '}
                <span className="font-mono text-[var(--text-secondary)]">.xlsx</span>,{' '}
                <span className="font-mono text-[var(--text-secondary)]">.xls</span>, and{' '}
                <span className="font-mono text-[var(--text-secondary)]">.json</span>
              </p>

              <div className="inline-flex items-center gap-2 text-xs text-[var(--text-muted)] bg-[var(--bg-elevated)] px-3 py-1.5 rounded-md border border-[var(--border-hairline)]">
                <Clipboard className="w-3.5 h-3.5" />
                <span>
                  Press{' '}
                  <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-[var(--text-primary)] font-mono text-[10px]">
                    Ctrl+V
                  </kbd>{' '}
                  to paste cells from Excel or Sheets
                </span>
              </div>
            </div>
          </div>

          {/* Remote CSV / Google Sheets Input */}
          <form
            onSubmit={handleFetchUrl}
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)]"
          >
            <div className="relative flex-1">
              <Link2 className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="url"
                placeholder="Paste a public Google Sheets or raw CSV URL..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="w-full bg-[var(--bg-elevated)] border border-[var(--border-hairline)] focus:border-blue-500 rounded-lg pl-9 pr-3 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={!urlInput.trim() || isFetchingUrl}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors shrink-0"
            >
              {isFetchingUrl ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>Fetch URL</span>
            </button>
          </form>

          {/* Error Banner */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs flex items-center gap-2.5"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Architectural Trust Strip */}
          <ScrollReveal delay={0.08}>
            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <Shield className="w-3.5 h-3.5 text-[var(--text-secondary)] shrink-0" />
                <span>100% Local Memory</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <Cpu className="w-3.5 h-3.5 text-[var(--text-secondary)] shrink-0" />
                <span>Web Worker Compute</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <Terminal className="w-3.5 h-3.5 text-[var(--text-secondary)] shrink-0" />
                <span>In-Memory SQL AST</span>
              </div>
            </div>
          </ScrollReveal>
        </motion.div>

        {/* Right: Structured Sample Datasets Rail */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, delay: 0.05, ease: 'easeOut' }}
          className="lg:col-span-5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-[var(--border-hairline)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-[var(--text-muted)]" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Sample Datasets
              </h2>
            </div>
            <span className="text-[11px] font-mono text-[var(--text-muted)]">1-click load</span>
          </div>

          <div className="divide-y divide-[var(--border-hairline)]">
            {SAMPLES.map((sample) => {
              const colCount = sample.rows[0] ? Object.keys(sample.rows[0]).length : 0;
              return (
                <button
                  key={sample.id}
                  onClick={() => loadSample(sample.id)}
                  className="w-full p-5 text-left hover:bg-[var(--bg-elevated)] transition-colors group flex items-start justify-between gap-4"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-blue-500 font-medium">
                        {sample.badge}
                      </span>
                      <span className="text-[11px] font-mono text-[var(--text-muted)]">
                        • {sample.rows.length} rows × {colCount} cols
                      </span>
                    </div>
                    <h3 className="text-sm font-medium text-[var(--text-primary)] group-hover:text-blue-500 transition-colors">
                      {sample.name}
                    </h3>
                    <p className="text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                      {sample.description}
                    </p>
                  </div>

                  <ArrowUpRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-blue-500 shrink-0 mt-1 transition-colors" />
                </button>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

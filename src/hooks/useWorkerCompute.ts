/**
 * useWorkerCompute.ts
 *
 * Elite React 19 Custom Hook: Background Web Worker Compute Pipeline
 *
 * React Concepts Demonstrated:
 * ─ Web Worker lifecycle managed natively via useRef and useEffect
 * ─ Zero-bundler cross-origin safe inline Worker using Blob & URL.createObjectURL
 * ─ Race condition cancellation: auto-increments request ID so obsolete calculations
 *   never override fresh state when rapid re-renders or filter transitions occur
 * ─ Main thread non-blocking: heavy matrix operations run on dedicated OS thread
 * ─ Graceful fallback to main thread if Worker or Blob is unavailable
 * ─ Automatic resource teardown: worker.terminate() and URL.revokeObjectURL on unmount
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  computeCorrelationMatrix,
  type CorrelationMatrixResult,
} from '../engine/worker-tasks';

// ── Inlined Worker Script Source ───────────────────────────────────────
const WORKER_SCRIPT = `
self.onmessage = function(e) {
  var data = e.data;
  var requestId = data.requestId;
  var rows = data.rows;
  var numericColumns = data.numericColumns;

  var startTime = performance.now();

  function calcPearson(x, y) {
    var n = Math.min(x.length, y.length);
    if (n < 2) return 0;
    var sumX = 0, sumY = 0;
    for (var i = 0; i < n; i++) {
      sumX += x[i];
      sumY += y[i];
    }
    var meanX = sumX / n;
    var meanY = sumY / n;
    var num = 0, denX = 0, denY = 0;
    for (var i = 0; i < n; i++) {
      var dx = x[i] - meanX;
      var dy = y[i] - meanY;
      num += dx * dy;
      denX += dx * dx;
      denY += dy * dy;
    }
    var den = Math.sqrt(denX * denY);
    if (den === 0) return 0;
    var r = num / den;
    return Math.max(-1, Math.min(1, Math.round(r * 1000) / 1000));
  }

  function classify(r) {
    if (r >= 0.7) return 'strong_positive';
    if (r >= 0.3) return 'moderate_positive';
    if (r <= -0.7) return 'strong_negative';
    if (r <= -0.3) return 'moderate_negative';
    return 'weak';
  }

  var vectors = {};
  for (var c = 0; c < numericColumns.length; c++) {
    vectors[numericColumns[c]] = [];
  }
  for (var r = 0; r < rows.length; r++) {
    for (var c = 0; c < numericColumns.length; c++) {
      var col = numericColumns[c];
      var v = Number(rows[r][col]);
      vectors[col].push(!isNaN(v) && rows[r][col] !== null && rows[r][col] !== '' ? v : 0);
    }
  }

  var matrix = [];
  var strongestPairs = [];

  for (var i = 0; i < numericColumns.length; i++) {
    var rowCells = [];
    var colA = numericColumns[i];
    var vecA = vectors[colA];

    for (var j = 0; j < numericColumns.length; j++) {
      var colB = numericColumns[j];
      var vecB = vectors[colB];

      if (i === j) {
        rowCells.push({
          colA: colA,
          colB: colB,
          coefficient: 1.0,
          strength: 'strong_positive',
          sampleSize: vecA.length
        });
      } else {
        var rVal = calcPearson(vecA, vecB);
        var cell = {
          colA: colA,
          colB: colB,
          coefficient: rVal,
          strength: classify(rVal),
          sampleSize: vecA.length
        };
        rowCells.push(cell);
        if (i < j && Math.abs(rVal) >= 0.25) {
          strongestPairs.push(cell);
        }
      }
    }
    matrix.push(rowCells);
  }

  strongestPairs.sort(function(a, b) {
    return Math.abs(b.coefficient) - Math.abs(a.coefficient);
  });

  var endTime = performance.now();

  self.postMessage({
    requestId: requestId,
    result: {
      numericColumns: numericColumns,
      matrix: matrix,
      strongestPairs: strongestPairs,
      computedAt: Date.now(),
      computeTimeMs: Math.round((endTime - startTime) * 100) / 100
    }
  });
};
`;

export interface UseWorkerComputeReturn {
  result: CorrelationMatrixResult | null;
  isComputing: boolean;
  computeTimeMs: number;
  workerActive: boolean;
  recompute: () => void;
}

export function useWorkerCompute(
  rows: Record<string, any>[],
  numericColumns: string[]
): UseWorkerComputeReturn {
  const [result, setResult] = useState<CorrelationMatrixResult | null>(null);
  const [isComputing, setIsComputing] = useState(false);
  const [computeTimeMs, setComputeTimeMs] = useState(0);
  const [workerActive, setWorkerActive] = useState(false);

  const workerRef = useRef<Worker | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const activeRequestIdRef = useRef<number>(0);

  // Initialize or re-create Web Worker safely
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && typeof Worker !== 'undefined') {
        const blob = new Blob([WORKER_SCRIPT], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        const worker = new Worker(url);
        workerRef.current = worker;
        setWorkerActive(true);

        worker.onmessage = (e: MessageEvent) => {
          const { requestId, result: calcResult } = e.data;
          // Discard results from cancelled or older requests (race condition guard)
          if (requestId === activeRequestIdRef.current) {
            setResult(calcResult);
            setComputeTimeMs(calcResult.computeTimeMs);
            setIsComputing(false);
          }
        };

        worker.onerror = () => {
          setWorkerActive(false);
          setIsComputing(false);
        };
      }
    } catch {
      setWorkerActive(false);
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
      setWorkerActive(false);
    };
  }, []);

  const dispatchCompute = useCallback(() => {
    if (numericColumns.length < 2 || rows.length === 0) {
      setResult(null);
      setIsComputing(false);
      return;
    }

    const currentReqId = ++activeRequestIdRef.current;
    setIsComputing(true);

    if (workerRef.current && workerActive) {
      // Offload to background Web Worker thread
      workerRef.current.postMessage({
        requestId: currentReqId,
        rows,
        numericColumns,
      });
    } else {
      // Fallback to synchronous calculation on main thread if Worker is inactive
      try {
        const directResult = computeCorrelationMatrix(rows, numericColumns);
        setResult(directResult);
        setComputeTimeMs(directResult.computeTimeMs);
      } catch (err) {
        console.error('Worker compute fallback error:', err);
      } finally {
        setIsComputing(false);
      }
    }
  }, [rows, numericColumns, workerActive]);

  useEffect(() => {
    dispatchCompute();
  }, [dispatchCompute]);

  return {
    result,
    isComputing,
    computeTimeMs,
    workerActive,
    recompute: dispatchCompute,
  };
}

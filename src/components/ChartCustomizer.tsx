import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sliders, Check } from 'lucide-react';
import type { ChartRecommendation, ChartType, ColumnProfile } from '../types/dataset';
import { useModalAccessibility } from '../hooks/useModalAccessibility';

interface ChartCustomizerProps {
  chart: ChartRecommendation | null;
  columns: ColumnProfile[];
  onClose: () => void;
  onUpdateChart: (updated: ChartRecommendation) => void;
}

const AVAILABLE_TYPES: { type: ChartType; label: string }[] = [
  { type: 'area', label: 'Area Trend' },
  { type: 'bar', label: 'Bar Chart' },
  { type: 'donut', label: 'Donut Share' },
  { type: 'scatter', label: 'Scatter Plot' },
];

export const ChartCustomizer: React.FC<ChartCustomizerProps> = ({
  chart,
  columns,
  onClose,
  onUpdateChart,
}) => {
  const dialogRef = useModalAccessibility(Boolean(chart), onClose);
  if (!chart) return null;

  const isSqlChart = chart.id.startsWith('sql-chart-');
  const visibleTypes = isSqlChart
    ? AVAILABLE_TYPES.filter((t) => t.type !== 'scatter')
    : AVAILABLE_TYPES;

  const numericCols = columns.filter((c) => c.type === 'number');
  const axisCols =
    chart.type === 'scatter'
      ? numericCols
      : columns.filter((c) => c.type === 'category' || c.type === 'date' || c.type === 'number');

  const handleTypeChange = (newType: ChartType) => {
    let nextX = chart.xAxis;
    if (newType === 'scatter') {
      const isXNumeric = numericCols.some((c) => c.name === chart.xAxis);
      if (!isXNumeric && numericCols.length > 0) {
        nextX = numericCols[0].name;
      }
    }
    onUpdateChart({
      ...chart,
      type: newType,
      xAxis: nextX,
      title: isSqlChart ? chart.title : `${chart.yAxis} by ${nextX}`,
    });
  };

  const handleXAxisChange = (newX: string) => {
    onUpdateChart({
      ...chart,
      xAxis: newX,
      title: `${chart.yAxis} by ${newX}`,
    });
  };

  const handleYAxisChange = (newY: string) => {
    onUpdateChart({
      ...chart,
      yAxis: newY,
      title: `${newY} by ${chart.xAxis}`,
    });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs" onClick={onClose}>
        <motion.div
          ref={dialogRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby="chart-customizer-title"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md bg-[#121215] border-l border-zinc-800 p-6 flex flex-col justify-between shadow-2xl h-full overflow-y-auto focus:outline-none"
        >
          {/* Header */}
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-400" />
                <h3 id="chart-customizer-title" className="text-base font-semibold text-white tracking-tight">
                  Customize Visualization
                </h3>
              </div>
              <button
                onClick={onClose}
                aria-label="Close modal"
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chart Type Selector */}
            <div className="mt-6">
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                Visualization Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {visibleTypes.map((t) => {
                  const isSelected = chart.type === t.type;
                  return (
                    <button
                      key={t.type}
                      onClick={() => handleTypeChange(t.type)}
                      className={`flex items-center justify-between p-3 rounded-xl border text-xs font-medium transition-all ${
                        isSelected
                          ? 'bg-blue-600/10 border-blue-500 text-blue-400 shadow-sm'
                          : 'bg-[#18181b] border-zinc-800 text-zinc-300 hover:border-zinc-700'
                      }`}
                    >
                      <span>{t.label}</span>
                      {isSelected && <Check className="w-4 h-4 text-blue-400" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {isSqlChart ? (
              <div className="mt-6 p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-400 leading-relaxed">
                Axes (<span className="font-mono text-zinc-200">{chart.xAxis}</span> &amp;{' '}
                <span className="font-mono text-zinc-200">{chart.yAxis}</span>) are locked to your SQL Studio query.
                To change columns or aggregations, run a new query in SQL Studio.
              </div>
            ) : (
              <>
                {/* X-Axis Selector */}
                <div className="mt-6">
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                    X-Axis Dimension
                  </label>
                  <select
                    value={chart.xAxis}
                    onChange={(e) => handleXAxisChange(e.target.value)}
                    className="w-full bg-[#18181b] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    {axisCols.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name} ({c.type})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Y-Axis Metric Selector */}
                <div className="mt-6">
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                    Y-Axis Metric
                  </label>
                  <select
                    value={chart.yAxis}
                    onChange={(e) => handleYAxisChange(e.target.value)}
                    className="w-full bg-[#18181b] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    {numericCols.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name} (Numeric)
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>

          {/* Footer Action */}
          <div className="pt-6 border-t border-zinc-800">
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors"
            >
              Done Customizing
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

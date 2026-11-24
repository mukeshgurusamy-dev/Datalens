import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { Sliders, TrendingUp, Sparkles, BarChart3 } from 'lucide-react';
import type { ChartRecommendation } from '../types/dataset';
import { lttbDownsample } from '../engine/lttb';
import { generateHoltForecast } from '../engine/forecasting';

interface ChartGridProps {
  charts: ChartRecommendation[];
  onCustomizeChart?: (chart: ChartRecommendation) => void;
  onCrossFilter?: (columnName: string, value: string) => void;
  activeFilters?: Record<string, string[]>;
}

const COLORS = ['#3b82f6', '#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#18181b] border border-zinc-700 p-3 rounded-lg shadow-xl text-xs">
        {label && <p className="font-semibold text-zinc-300 mb-1">{label}</p>}
        {payload.map((item: any, idx: number) => (
          <p key={idx} className="text-zinc-400 flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: item.color || item.fill || '#3b82f6' }}
            />
            <span className="capitalize">{item.name || item.dataKey}:</span>
            <span className="font-mono font-semibold text-white">
              {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
            </span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

interface ChartCardItemProps {
  chart: ChartRecommendation;
  idx: number;
  onCustomize?: (chart: ChartRecommendation) => void;
  onCrossFilter?: (columnName: string, value: string) => void;
  activeFilters?: Record<string, string[]>;
}

const ChartCardItem: React.FC<ChartCardItemProps> = ({
  chart,
  idx,
  onCustomize,
  onCrossFilter,
  activeFilters,
}) => {
  const [showForecast, setShowForecast] = useState(false);

  // 1. LTTB Downsampling: Maintains visual fidelity while preventing DOM bloat
  const displayData = React.useMemo(() => {
    if (!chart.data || chart.data.length <= 80) return chart.data;
    return lttbDownsample(chart.data, chart.xAxis, chart.yAxis, 80);
  }, [chart.data, chart.xAxis, chart.yAxis]);

  // 2. Holt's Double Exponential Smoothing Forecast
  const forecastResult = React.useMemo(() => {
    if (chart.type !== 'area' || !showForecast || !displayData || displayData.length < 3) {
      return null;
    }
    return generateHoltForecast(displayData, chart.xAxis, chart.yAxis, 7);
  }, [chart.type, showForecast, displayData, chart.xAxis, chart.yAxis]);

  const activeData = forecastResult ? forecastResult.combined : displayData;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25, delay: idx * 0.08 }}
      className="spotlight-card rounded-2xl p-6 flex flex-col justify-between group min-w-0 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-semibold text-white tracking-tight">
              {chart.title}
            </h3>
            {forecastResult && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                <span>{forecastResult.direction.toUpperCase()} (+7D)</span>
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400">
            {chart.description}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          {chart.type === 'area' && displayData && displayData.length >= 3 && (
            <button
              onClick={() => setShowForecast(!showForecast)}
              title="Toggle Holt Linear Trend Forecast"
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                showForecast
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>{showForecast ? 'Hide Forecast' : 'Forecast +7D'}</span>
            </button>
          )}

          {onCustomize && (
            <button
              onClick={() => onCustomize(chart)}
              title="Customize visualization"
              className="opacity-60 group-hover:opacity-100 p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-all"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="w-full h-72 sm:h-80 pt-2 min-h-[300px]" style={{ minHeight: 300 }}>
        {!activeData || activeData.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 border border-dashed border-zinc-800 rounded-xl p-4">
            <p className="text-xs font-medium text-zinc-400">No records match the active filters</p>
            <p className="text-[11px] text-zinc-600 mt-1">Try clearing or adjusting filter values</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300} minWidth={100} minHeight={250}>
            {chart.type === 'area' ? (
              <AreaChart data={activeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id={`gradient-${chart.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id={`gradient-forecast-${chart.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis
                  dataKey={chart.xAxis}
                  stroke="#71717a"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#71717a"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
                />
                <Tooltip content={<CustomTooltip />} />
                
                {/* Historical Area */}
                <Area
                  type="monotone"
                  dataKey={chart.yAxis}
                  name="Historical"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill={`url(#gradient-${chart.id})`}
                />

                {/* 95% Confidence Upper Band */}
                {forecastResult && (
                  <Area
                    type="monotone"
                    dataKey="upperBound"
                    name="95% Upper Band"
                    stroke="#10b981"
                    strokeOpacity={0.4}
                    strokeDasharray="2 2"
                    fillOpacity={1}
                    fill={`url(#gradient-forecast-${chart.id})`}
                  />
                )}

                {/* Projected Trend Line */}
                {forecastResult && (
                  <Area
                    type="monotone"
                    dataKey="forecast"
                    name="Holt Forecast"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    strokeDasharray="4 4"
                    fillOpacity={0}
                  />
                )}
              </AreaChart>
            ) : chart.type === 'bar' ? (
              <BarChart data={activeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis
                  dataKey={chart.xAxis}
                  stroke="#71717a"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#71717a"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey={chart.yAxis}
                  fill="#3b82f6"
                  radius={[6, 6, 0, 0]}
                  className="cursor-pointer transition-opacity"
                  onClick={(entry: any) => {
                    const rawVal = entry && (entry[chart.xAxis] || entry.payload?.[chart.xAxis]);
                    if (onCrossFilter && rawVal) {
                      onCrossFilter(chart.xAxis, String(rawVal));
                    }
                  }}
                >
                  {activeData.map((entry, i) => {
                    const val = String(entry[chart.xAxis]);
                    const isSelected = activeFilters?.[chart.xAxis]?.includes(val);
                    const hasActiveFilterForCol = (activeFilters?.[chart.xAxis]?.length || 0) > 0;
                    return (
                      <Cell
                        key={`cell-${i}`}
                        fill={isSelected ? '#60a5fa' : '#3b82f6'}
                        opacity={hasActiveFilterForCol ? (isSelected ? 1 : 0.35) : 1}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            ) : chart.type === 'donut' ? (
              <PieChart>
                <Tooltip content={<CustomTooltip />} />
                <Pie
                  data={activeData}
                  dataKey={chart.yAxis}
                  nameKey={chart.xAxis}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={3}
                  className="cursor-pointer"
                  onClick={(entry: any) => {
                    const rawVal = entry && (entry[chart.xAxis] || entry.payload?.[chart.xAxis] || entry.name);
                    if (onCrossFilter && rawVal) {
                      onCrossFilter(chart.xAxis, String(rawVal));
                    }
                  }}
                >
                  {activeData.map((entry, i) => {
                    const val = String(entry[chart.xAxis]);
                    const isSelected = activeFilters?.[chart.xAxis]?.includes(val);
                    const hasActiveFilterForCol = (activeFilters?.[chart.xAxis]?.length || 0) > 0;
                    return (
                      <Cell
                        key={`cell-${i}`}
                        fill={COLORS[i % COLORS.length]}
                        opacity={hasActiveFilterForCol ? (isSelected ? 1 : 0.3) : 1}
                        stroke={isSelected ? '#ffffff' : 'none'}
                        strokeWidth={isSelected ? 2 : 0}
                      />
                    );
                  })}
                </Pie>
              </PieChart>
            ) : (
              <ScatterChart margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  type="number"
                  dataKey={chart.xAxis}
                  name={chart.xAxis}
                  stroke="#71717a"
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis
                  type="number"
                  dataKey={chart.yAxis}
                  name={chart.yAxis}
                  stroke="#71717a"
                  fontSize={11}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Scatter
                  name={`${chart.xAxis} vs ${chart.yAxis}`}
                  data={activeData}
                  fill="#3b82f6"
                />
              </ScatterChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </motion.div>
  );
};

export const ChartGrid: React.FC<ChartGridProps> = ({
  charts,
  onCustomizeChart,
  onCrossFilter,
  activeFilters,
}) => {
  if (!charts || charts.length === 0) {
    return (
      <div className="spotlight-card rounded-2xl p-8 mb-8 text-center border border-dashed border-zinc-800">
        <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mx-auto mb-3">
          <BarChart3 className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-white mb-1">Visualizations Ready to Generate</h3>
        <p className="text-xs text-zinc-400 max-w-md mx-auto mb-4">
          DataLens automatically charts your numeric and categorical dimensions. Use SQL Studio to plot custom queries or add calculated metrics in Formula Studio.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {charts.map((chart, idx) => (
        <ChartCardItem
          key={chart.id}
          chart={chart}
          idx={idx}
          onCustomize={onCustomizeChart}
          onCrossFilter={onCrossFilter}
          activeFilters={activeFilters}
        />
      ))}
    </div>
  );
};

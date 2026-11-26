import React from 'react';
import { motion } from 'motion/react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { KpiCard } from '../types/dataset';

interface KpiRowProps {
  cards: KpiCard[];
}

export const KpiRow: React.FC<KpiRowProps> = React.memo(({ cards }) => {
  return (
    <div data-export-kpis="true" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card, idx) => (
        <motion.div
          key={card.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.16, delay: idx * 0.03, ease: 'easeOut' }}
          className="spotlight-card rounded-xl p-5 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <span className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider truncate">
              {card.title}
            </span>
            {card.change !== undefined && (
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-mono font-medium px-1.5 py-0.5 rounded-md tabular-nums shrink-0 ${
                  card.trend === 'up'
                    ? 'text-emerald-500 bg-emerald-500/10'
                    : card.trend === 'down'
                    ? 'text-rose-500 bg-rose-500/10'
                    : 'text-[var(--text-muted)] bg-[var(--bg-elevated)]'
                }`}
              >
                {card.trend === 'up' ? (
                  <TrendingUp className="w-3 h-3" />
                ) : card.trend === 'down' ? (
                  <TrendingDown className="w-3 h-3" />
                ) : (
                  <Minus className="w-3 h-3" />
                )}
                <span>{card.change > 0 ? `+${card.change}%` : `${card.change}%`}</span>
              </span>
            )}
          </div>

          <div className="my-0.5">
            <span className="text-2xl sm:text-[28px] font-semibold text-[var(--text-primary)] tracking-tight font-mono tabular-nums">
              {card.value}
            </span>
          </div>

          {card.subtitle && (
            <p className="text-xs text-[var(--text-muted)] mt-2 truncate">
              {card.subtitle}
            </p>
          )}
        </motion.div>
      ))}
    </div>
  );
});

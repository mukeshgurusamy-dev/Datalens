import React from 'react';
import { motion } from 'motion/react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { KpiCard } from '../types/dataset';

interface KpiRowProps {
  cards: KpiCard[];
}

export const KpiRow: React.FC<KpiRowProps> = React.memo(({ cards }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {cards.map((card, idx) => (
        <motion.div
          key={card.id}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 350, damping: 25, delay: idx * 0.05 }}
          className="spotlight-card rounded-xl p-5 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              {card.title}
            </span>
            {card.change !== undefined && (
              <span
                className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                  card.trend === 'up'
                    ? 'text-emerald-400 bg-emerald-500/10'
                    : card.trend === 'down'
                    ? 'text-rose-400 bg-rose-500/10'
                    : 'text-zinc-400 bg-zinc-800'
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

          <div className="my-1">
            <span className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-mono tabular-nums">
              {card.value}
            </span>
          </div>

          {card.subtitle && (
            <p className="text-xs text-zinc-400 mt-2 truncate">
              {card.subtitle}
            </p>
          )}
        </motion.div>
      ))}
    </div>
  );
});

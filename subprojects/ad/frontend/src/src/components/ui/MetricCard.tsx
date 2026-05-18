'use client';

import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: number;
  unit?: string;
  status?: 'normal' | 'warning' | 'critical';
  trend?: 'up' | 'down' | 'stable';
  variant?: 'small' | 'medium' | 'large';
  showTrend?: boolean;
  className?: string;
}

export function MetricCard({
  label,
  value,
  unit,
  status = 'normal',
  trend,
  variant = 'medium',
  showTrend = true,
  className,
}: MetricCardProps) {
  const statusStyles: Record<string, string> = {
    normal: 'border-[var(--aifs-border)]',
    warning: 'border-[var(--aifs-warning)] shadow-[0_0_15px_rgba(255,184,0,0.15)]',
    critical: 'border-[var(--aifs-danger)] shadow-[0_0_15px_rgba(255,51,102,0.15)] animate-pulse',
  };

  const variantStyles = {
    small: 'p-3',
    medium: 'p-4',
    large: 'p-6',
  };

  const valueStyles = {
    small: 'text-lg',
    medium: 'text-2xl',
    large: 'text-3xl',
  };

  const formatValue = (val: number) => {
    if (val >= 1000000) {
      return (val / 1000000).toFixed(1) + 'M';
    }
    if (val >= 1000) {
      return (val / 1000).toFixed(1) + 'K';
    }
    return val.toFixed(variant === 'small' ? 0 : 2);
  };

  return (
    <div
      className={cn(
        'glass rounded-xl transition-all duration-300',
        variantStyles[variant],
        statusStyles[status] || statusStyles.normal,
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className={cn(
            'text-[var(--aifs-text-secondary)] mb-1',
            variant === 'small' ? 'text-xs' : 'text-sm'
          )}>
            {label}
          </p>
          <p className={cn(
            'font-mono font-semibold text-[var(--aifs-text-primary)]',
            valueStyles[variant]
          )}>
            {formatValue(value)}
            {unit && (
              <span className="text-sm text-[var(--aifs-text-secondary)] ml-1">
                {unit}
              </span>
            )}
          </p>
        </div>
        {showTrend && trend && (
          <div
            className={cn(
              'flex items-center gap-1 text-xs',
              trend === 'up'
                ? 'text-[var(--aifs-success)]'
                : trend === 'down'
                ? 'text-[var(--aifs-danger)]'
                : 'text-[var(--aifs-text-secondary)]'
            )}
          >
            {trend === 'up' ? (
              <TrendingUp className="w-3 h-3" />
            ) : trend === 'down' ? (
              <TrendingDown className="w-3 h-3" />
            ) : (
              <Minus className="w-3 h-3" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

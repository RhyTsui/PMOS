'use client';

import { cn } from '@/lib/utils';

type AgentStatus = 'online' | 'idle' | 'warning' | 'error' | 'active' | 'info' | 'success' | 'pending' | 'danger' | 'running' | 'completed' | 'failed' | 'created' | 'clarifying' | 'normal' | 'critical';

interface StatusBadgeProps {
  status: AgentStatus;
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
  showLabel?: boolean;
  label?: string;
  className?: string;
}

const statusConfig: Record<AgentStatus, { color: string; label: string; glow: boolean }> = {
  online: {
    color: 'bg-[var(--aifs-success)]',
    label: '运行中',
    glow: true,
  },
  active: {
    color: 'bg-[var(--aifs-accent)]',
    label: '活跃',
    glow: true,
  },
  idle: {
    color: 'bg-[var(--aifs-text-muted)]',
    label: '空闲',
    glow: false,
  },
  warning: {
    color: 'bg-[var(--aifs-warning)]',
    label: '告警',
    glow: true,
  },
  error: {
    color: 'bg-[var(--aifs-danger)]',
    label: '异常',
    glow: true,
  },
  danger: {
    color: 'bg-[var(--aifs-danger)]',
    label: '危险',
    glow: true,
  },
  info: {
    color: 'bg-[var(--aifs-info)]',
    label: '信息',
    glow: false,
  },
  success: {
    color: 'bg-[var(--aifs-success)]',
    label: '成功',
    glow: true,
  },
  pending: {
    color: 'bg-[var(--aifs-warning)]',
    label: '待处理',
    glow: true,
  },
  running: {
    color: 'bg-[var(--aifs-accent)]',
    label: '执行中',
    glow: true,
  },
  completed: {
    color: 'bg-[var(--aifs-success)]',
    label: '已完成',
    glow: false,
  },
  failed: {
    color: 'bg-[var(--aifs-danger)]',
    label: '失败',
    glow: true,
  },
  created: {
    color: 'bg-[var(--aifs-info)]',
    label: '已创建',
    glow: false,
  },
  clarifying: {
    color: 'bg-[var(--aifs-warning)]',
    label: '追问中',
    glow: true,
  },
  normal: {
    color: 'bg-[var(--aifs-success)]',
    label: '正常',
    glow: false,
  },
  critical: {
    color: 'bg-[var(--aifs-danger)]',
    label: '严重',
    glow: true,
  },
};

const sizeConfig = {
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
};

export function StatusBadge({
  status,
  size = 'md',
  pulse = true,
  showLabel = false,
  label,
  className,
}: StatusBadgeProps) {
  const config = statusConfig[status] ?? statusConfig.idle;
  const displayLabel = label ?? config.label;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span
        className={cn(
          'rounded-full',
          config.color,
          sizeConfig[size],
          config.glow && pulse && 'animate-pulse',
          config.glow && 'shadow-[0_0_8px_currentColor]'
        )}
      />
      {(showLabel || label) && (
        <span className="text-xs text-[var(--aifs-text-secondary)]">
          {displayLabel}
        </span>
      )}
    </div>
  );
}

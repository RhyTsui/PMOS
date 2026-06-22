'use client';

import { useThemeColors } from '@/hooks/useTheme';

export interface ConversationHighlightBadgeProps {
  unreadAutomation?: {
    count: number;
    latest_run_id: string;
    latest_message_id: string;
    severity: 'info' | 'success' | 'warning' | 'error';
    label: string;
  } | null;
}

export function ConversationHighlightBadge({ unreadAutomation }: ConversationHighlightBadgeProps) {
  const c = useThemeColors();

  if (!unreadAutomation || unreadAutomation.count === 0) return null;

  const severityColors: Record<string, { dot: string; bg: string; text: string }> = {
    success: { dot: '#16a34a', bg: '#dcfce7', text: '#15803d' },
    info: { dot: '#2563eb', bg: '#dbeafe', text: '#1d4ed8' },
    warning: { dot: '#b45309', bg: '#fef3c7', text: '#92400e' },
    error: { dot: '#dc2626', bg: '#fee2e2', text: '#991b1b' },
  };

  const colors = severityColors[unreadAutomation.severity] || severityColors.info;

  if (unreadAutomation.count === 1) {
    return (
      <span
        className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full"
        style={{ backgroundColor: colors.bg, color: colors.text }}
        title={unreadAutomation.label}
      >
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: colors.dot }}
        />
        {unreadAutomation.severity === 'error' ? '待处理' : unreadAutomation.severity === 'warning' ? '需确认' : '新结果'}
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full font-medium"
      style={{ backgroundColor: colors.bg, color: colors.text }}
      title={unreadAutomation.label}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: colors.dot }}
      />
      {unreadAutomation.count}
      {unreadAutomation.severity === 'error' ? ' 条待处理' : ' 条新结果'}
    </span>
  );
}

export interface TaskBadgeProps {
  taskBadge?: {
    task_id: string;
    status: 'active' | 'paused' | 'failed' | 'needs_action';
    label: string;
    next_run_at?: string;
  } | null;
}

export function TaskBadge({ taskBadge }: TaskBadgeProps) {
  if (!taskBadge) return null;

  const statusColors: Record<string, { bg: string; text: string; label: string }> = {
    active: { bg: '#eff6ff', text: '#1d4ed8', label: '自动化' },
    paused: { bg: '#fef3c7', text: '#92400e', label: '已暂停' },
    failed: { bg: '#fee2e2', text: '#991b1b', label: '失败' },
    needs_action: { bg: '#fef3c7', text: '#92400e', label: '需处理' },
  };

  const colors = statusColors[taskBadge.status] || statusColors.active;

  return (
    <span
      className="inline-flex items-center text-xs px-1.5 py-0.5 rounded"
      style={{ backgroundColor: colors.bg, color: colors.text }}
      title={taskBadge.label}
    >
      ⚙ {colors.label}
    </span>
  );
}

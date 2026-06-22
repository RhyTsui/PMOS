'use client';

import { useState } from 'react';
import { Clock3, Pause, Play, Trash2, MessageSquare, CalendarClock, ChevronDown } from 'lucide-react';
import { useThemeColors } from '@/hooks/useTheme';
import type { ScheduledTask } from '@/types';

interface LightweightTaskListProps {
  tasks: ScheduledTask[];
  onOpenConversation: (conversationId: string) => void;
  onPauseTask: (taskId: string) => void;
  onResumeTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
}

type TemplateFilter = 'all' | 'scheduled_join_table' | 'scheduled_aggregate_table' | 'gi_keyword_daily_digest' | 'scheduled_metric_monitor';

const TEMPLATE_FILTERS: Array<{ key: TemplateFilter; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'scheduled_join_table', label: '拼表' },
  { key: 'scheduled_aggregate_table', label: '聚合表' },
  { key: 'gi_keyword_daily_digest', label: 'GI 日报' },
  { key: 'scheduled_metric_monitor', label: '指标监控' },
];

export function LightweightTaskList({
  tasks,
  onOpenConversation,
  onPauseTask,
  onResumeTask,
  onDeleteTask,
}: LightweightTaskListProps) {
  const c = useThemeColors();
  const [filter, setFilter] = useState<TemplateFilter>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const filteredTasks = filter === 'all'
    ? tasks
    : tasks.filter((t) => t.template_id === filter);

  const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    active: { label: '运行中', color: '#16a34a', bg: '#f0fdf4' },
    paused: { label: '已暂停', color: '#b45309', bg: '#fffbeb' },
    failed: { label: '失败', color: '#dc2626', bg: '#fef2f2' },
    running: { label: '执行中', color: '#2563eb', bg: '#eff6ff' },
    completed: { label: '已完成', color: '#047857', bg: '#f0fdf4' },
    disabled: { label: '已停用', color: '#6b7280', bg: '#f3f4f6' },
  };

  const lastRunStatusConfig: Record<string, { label: string; color: string }> = {
    completed: { label: '成功', color: '#16a34a' },
    failed: { label: '失败', color: '#dc2626' },
    partial: { label: '部分完成', color: '#b45309' },
    needs_action: { label: '需处理', color: '#b45309' },
    skipped: { label: '跳过', color: '#6b7280' },
  };

  return (
    <div>
      {/* Template Filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {TEMPLATE_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
            style={{
              backgroundColor: filter === f.key ? '#2563eb' : '#f3f4f6',
              color: filter === f.key ? '#fff' : c.textSecondary,
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-8" style={{ color: c.textMuted }}>
          <CalendarClock size={32} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">暂无自动化任务</p>
          <p className="text-xs mt-1">在对话中描述你的需求，即可创建自动化任务</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTasks.map((task) => {
            const status = statusConfig[task.status] || statusConfig.active;
            const lastRunStatus = task.last_run_status ? lastRunStatusConfig[task.last_run_status] : null;

            return (
              <div
                key={task.id}
                className="rounded-xl border border-gray-100 bg-white p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Title + Status */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm truncate" style={{ color: c.textPrimary }}>
                        {task.name}
                      </span>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: status.bg, color: status.color }}
                      >
                        {status.label}
                      </span>
                      {lastRunStatus && (
                        <span className="text-xs" style={{ color: lastRunStatus.color }}>
                          最近：{lastRunStatus.label}
                        </span>
                      )}
                    </div>

                    {/* Last Result Summary */}
                    {task.last_result_summary && (
                      <p className="text-xs truncate mb-1" style={{ color: c.textSecondary }}>
                        {task.last_result_summary}
                      </p>
                    )}

                    {/* Meta */}
                    <div className="flex items-center gap-3 text-xs" style={{ color: c.textMuted }}>
                      {task.next_run_at && (
                        <span className="flex items-center gap-1">
                          <Clock3 size={10} />
                          下次：{new Date(task.next_run_at).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                      {task.template_id && task.template_id !== 'custom' && (
                        <span className="px-1.5 py-0.5 rounded bg-gray-100" style={{ color: c.textMuted }}>
                          {TEMPLATE_FILTERS.find((f) => f.key === task.template_id)?.label || task.template_id}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {task.source_conversation_id && (
                      <button
                        onClick={() => onOpenConversation(task.source_conversation_id!)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                        title="打开原会话"
                        style={{ color: c.textMuted }}
                      >
                        <MessageSquare size={14} />
                      </button>
                    )}
                    {task.status === 'active' ? (
                      <button
                        onClick={() => onPauseTask(task.id)}
                        className="p-1.5 rounded-lg hover:bg-amber-50 transition-colors text-amber-600"
                        title="暂停"
                      >
                        <Pause size={14} />
                      </button>
                    ) : task.status === 'paused' ? (
                      <button
                        onClick={() => onResumeTask(task.id)}
                        className="p-1.5 rounded-lg hover:bg-green-50 transition-colors text-green-600"
                        title="恢复"
                      >
                        <Play size={14} />
                      </button>
                    ) : null}
                    {deleteConfirm === task.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { onDeleteTask(task.id); setDeleteConfirm(null); }}
                          className="px-2 py-1 rounded text-xs bg-red-600 text-white"
                        >
                          确认删除
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="px-2 py-1 rounded text-xs border border-gray-300"
                          style={{ color: c.textMuted }}
                        >
                          取消
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(task.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-red-400"
                        title="删除"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

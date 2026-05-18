'use client';

import { useAgent } from '@/hooks/useAgent';
import { Task, IntentType } from '@/types';
import {
  HelpCircle, FileText, Stethoscope, Wrench, Activity, Image, TrendingUp,
  PanelRightClose, Clock, CheckCircle2, AlertCircle,
  Loader2, MessageCircle
} from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';

const intentIcon: Record<IntentType, React.ElementType> = {
  help: HelpCircle,
  demand: FileText,
  diagnosis: Stethoscope,
  debugging: Wrench,
  monitor: Activity,
  'material-analysis': Image,
  forecast: TrendingUp,
  general: MessageCircle,
};

const intentLabel: Record<IntentType, string> = {
  help: '使用帮助',
  demand: '需求沟通',
  diagnosis: '问题排查',
  debugging: '广告联调',
  monitor: '监控',
  'material-analysis': '素材分析',
  forecast: '预测',
  general: '通用',
};

const statusIcon: Record<string, React.ElementType> = {
  created: Clock,
  clarifying: AlertCircle,
  running: Loader2,
  waiting: Clock,
  completed: CheckCircle2,
  archived: CheckCircle2,
  downgraded: AlertCircle,
};

const statusBadgeMap: Record<string, 'info' | 'warning' | 'active' | 'danger'> = {
  created: 'info',
  clarifying: 'warning',
  running: 'warning',
  waiting: 'info',
  completed: 'active',
  archived: 'info',
  downgraded: 'danger',
};

const statusLabelMap: Record<string, string> = {
  created: '已创建',
  clarifying: '追问中',
  running: '执行中',
  waiting: '等待中',
  completed: '已完成',
  archived: '已归档',
  downgraded: '已降级',
};

function TaskItem({ task, isActive, onClick }: { task: Task; isActive: boolean; onClick: () => void }) {
  const Icon = intentIcon[task.task_type] ?? MessageCircle;
  const StatusIcon = statusIcon[task.status] ?? Clock;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-3 rounded-lg transition-all duration-150 group ${
        isActive
          ? 'bg-[var(--aifs-accent)] bg-opacity-10 border border-[var(--aifs-accent)] border-opacity-30'
          : 'hover:bg-[var(--aifs-primary-light)] border border-transparent'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 ${isActive ? 'text-[var(--aifs-accent)]' : 'text-[var(--aifs-text-secondary)]'}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-[var(--aifs-text-primary)] truncate font-medium">{task.title}</div>
          {task.summary && (
            <div className="text-xs text-[var(--aifs-text-secondary)] mt-1 line-clamp-2">{task.summary}</div>
          )}
          <div className="flex items-center gap-2 mt-2">
            <StatusBadge
              status={statusBadgeMap[task.status] ?? 'info'}
              label={statusLabelMap[task.status] ?? task.status}
            />
            <span className="text-xs text-[var(--aifs-text-secondary)]">
              {intentLabel[task.task_type]}
            </span>
          </div>
        </div>
        <StatusIcon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
          task.status === 'running' ? 'text-[var(--aifs-warning)] animate-spin' :
          task.status === 'completed' ? 'text-[var(--aifs-success)]' :
          task.status === 'downgraded' ? 'text-[var(--aifs-danger)]' :
          'text-[var(--aifs-text-secondary)]'
        }`} />
      </div>
    </button>
  );
}

export function TaskSidebar() {
  const { tasks, uiState, setActiveTask, toggleTaskSidebar } = useAgent();
  const activeTaskId = uiState.activeTaskId;

  const sortedTasks = [...tasks].sort((a, b) =>
    new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );

  return (
    <div className="h-full flex flex-col bg-[var(--aifs-primary)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--aifs-border)]">
        <h3 className="text-sm font-medium text-[var(--aifs-text-primary)]">
          历史任务
          <span className="ml-2 text-xs text-[var(--aifs-text-secondary)]">({tasks.length})</span>
        </h3>
        <button
          onClick={toggleTaskSidebar}
          className="p-1 rounded hover:bg-[var(--aifs-primary-light)] text-[var(--aifs-text-secondary)] transition-colors"
        >
          <PanelRightClose className="w-4 h-4" />
        </button>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {sortedTasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            isActive={activeTaskId === task.task_id}
            onClick={() => setActiveTask(activeTaskId === task.task_id ? null : task)}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-[var(--aifs-border)] text-xs text-[var(--aifs-text-secondary)]">
        任务按更新时间排序
      </div>
    </div>
  );
}

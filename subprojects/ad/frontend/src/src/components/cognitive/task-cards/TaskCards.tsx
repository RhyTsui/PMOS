'use client';

import { CheckCircle2, Clock3, AlertTriangle, XCircle, Pause, Play, Trash2, RefreshCw, Copy, Eye, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import type { TaskResultMessagePayload, TaskProposalPayload } from '@/types';
import { useThemeColors } from '@/hooks/useTheme';

// ─── TaskProposalCard ─────────────────────────────────────

export interface TaskProposalCardProps {
  proposal: TaskProposalPayload;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export function TaskProposalCard({ proposal, onConfirm, onCancel }: TaskProposalCardProps) {
  const c = useThemeColors();
  const isHighRisk = proposal.risk_level === 'L4' || proposal.risk_level === 'L5';

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 my-2">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-blue-600">
          <Settings size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base mb-1" style={{ color: c.textPrimary }}>
            📋 任务确认：{proposal.task_title}
          </h3>
          <p className="text-sm mb-3" style={{ color: c.textSecondary }}>
            {proposal.description}
          </p>

          <div className="space-y-1.5 text-sm">
            <div className="flex gap-2">
              <span className="font-medium" style={{ color: c.textSecondary }}>执行频率：</span>
              <span style={{ color: c.textPrimary }}>{proposal.schedule_label}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-medium" style={{ color: c.textSecondary }}>数据范围：</span>
              <span style={{ color: c.textPrimary }}>{proposal.scope_summary}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-medium" style={{ color: c.textSecondary }}>输出内容：</span>
              <span style={{ color: c.textPrimary }}>{proposal.output_summary}</span>
            </div>
          </div>

          {proposal.risk_description && (
            <div className="mt-3 p-2 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
              ⚠️ {proposal.risk_description}
            </div>
          )}

          {isHighRisk && (
            <div className="mt-3 p-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
              🔒 该任务涉及高风险操作，需要您明确确认后才能执行。
            </div>
          )}

          {proposal.clarifying_question && (
            <div className="mt-3 p-2 rounded-lg bg-gray-50 text-sm" style={{ color: c.textSecondary }}>
              💬 {proposal.clarifying_question}
            </div>
          )}

          {(onConfirm || onCancel) && !proposal.clarifying_question && (
            <div className="flex gap-2 mt-4">
              {onConfirm && (
                <button
                  onClick={onConfirm}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  确认创建
                </button>
              )}
              {onCancel && (
                <button
                  onClick={onCancel}
                  className="px-4 py-1.5 rounded-lg border border-gray-300 text-sm font-medium hover:bg-gray-50 transition-colors"
                  style={{ color: c.textSecondary }}
                >
                  取消
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── TaskStatusCard ─────────────────────────────────────

export interface TaskStatusCardProps {
  action: 'created' | 'updated' | 'paused' | 'resumed' | 'deleted';
  taskTitle: string;
  changes?: string[];
  effectiveAt?: string;
  onUndo?: () => void;
}

export function TaskStatusCard({ action, taskTitle, changes, effectiveAt, onUndo }: TaskStatusCardProps) {
  const c = useThemeColors();
  const config: Record<string, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
    created: { icon: <CheckCircle2 size={16} />, color: '#16a34a', bg: '#f0fdf4', label: '已创建' },
    updated: { icon: <Settings size={16} />, color: '#2563eb', bg: '#eff6ff', label: '已更新' },
    paused: { icon: <Pause size={16} />, color: '#b45309', bg: '#fffbeb', label: '已暂停' },
    resumed: { icon: <Play size={16} />, color: '#16a34a', bg: '#f0fdf4', label: '已恢复' },
    deleted: { icon: <Trash2 size={16} />, color: '#dc2626', bg: '#fef2f2', label: '已删除' },
  };

  const { icon, color, bg, label } = config[action] || config.created;

  return (
    <div className="rounded-xl border p-3 my-2" style={{ borderColor: color + '30', backgroundColor: bg }}>
      <div className="flex items-center gap-2">
        <span style={{ color }}>{icon}</span>
        <span className="text-sm font-medium" style={{ color }}>
          任务「{taskTitle}」{label}
        </span>
        {effectiveAt && (
          <span className="text-xs ml-auto" style={{ color: c.textMuted }}>
            <Clock3 size={12} className="inline mr-1" />
            {effectiveAt}
          </span>
        )}
      </div>
      {changes && changes.length > 0 && (
        <div className="mt-2 text-xs space-y-0.5" style={{ color: c.textSecondary }}>
          {changes.map((change, i) => (
            <div key={i}>• {change}</div>
          ))}
        </div>
      )}
      {onUndo && action !== 'deleted' && (
        <button
          onClick={onUndo}
          className="mt-2 text-xs underline"
          style={{ color: c.textMuted }}
        >
          撤销
        </button>
      )}
    </div>
  );
}

// ─── TaskResultCard ─────────────────────────────────────

export interface TaskResultCardProps {
  payload: TaskResultMessagePayload;
  onViewDetail?: () => void;
  onOpenSourcePanel?: () => void;
  onCopy?: () => void;
  onRerun?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  children?: React.ReactNode;
}

export function TaskResultCard({ payload, onViewDetail, onOpenSourcePanel, onCopy, onRerun, onPause, onResume, children }: TaskResultCardProps) {
  const c = useThemeColors();
  const [expanded, setExpanded] = useState(payload.display_mode === 'expanded');

  const isSuccess = payload.run_status === 'completed';
  const isPartial = payload.run_status === 'partial';
  const statusConfig = isSuccess
    ? { icon: '✅', label: '已完成', color: '#16a34a' }
    : isPartial
      ? { icon: '⚠️', label: '部分完成', color: '#b45309' }
      : { icon: '❌', label: '执行失败', color: '#dc2626' };

  return (
    <div className="rounded-xl border p-4 my-2" style={{ borderColor: statusConfig.color + '30' }}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{statusConfig.icon}</span>
        <span className="font-semibold text-sm" style={{ color: c.textPrimary }}>
          {payload.task_title}
        </span>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ backgroundColor: statusConfig.color + '15', color: statusConfig.color }}
        >
          {statusConfig.label}
        </span>
        {payload.completed_at && (
          <span className="text-xs ml-auto" style={{ color: c.textMuted }}>
            {new Date(payload.completed_at).toLocaleString('zh-CN')}
          </span>
        )}
      </div>

      {/* Summary */}
      <p className="text-sm mb-2" style={{ color: c.textSecondary }}>
        {payload.summary}
      </p>

      {/* Key Findings */}
      {expanded && payload.key_findings && payload.key_findings.length > 0 && (
        <div className="mb-3">
          <h4 className="text-xs font-medium mb-1" style={{ color: c.textSecondary }}>关键发现</h4>
          <ul className="text-sm space-y-0.5" style={{ color: c.textPrimary }}>
            {payload.key_findings.map((finding, i) => (
              <li key={i}>• {finding}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Artifacts */}
      {expanded && payload.artifacts && payload.artifacts.length > 0 && (
        <div className="mb-3">
          <h4 className="text-xs font-medium mb-1" style={{ color: c.textSecondary }}>生成文件</h4>
          <div className="flex flex-wrap gap-2">
            {payload.artifacts.map((artifact, i) => (
              <a
                key={i}
                href={artifact.uri}
                className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                📎 {artifact.name || `文件${i + 1}`}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Template-specific children renderers */}
      {expanded && children}

      {/* Expand / Collapse */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs mb-2"
        style={{ color: c.textMuted }}
      >
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {expanded ? '收起' : '展开详情'}
      </button>

      {/* Actions */}
      <TaskInlineActions
        onViewDetail={onViewDetail}
        onOpenSourcePanel={onOpenSourcePanel}
        onCopy={onCopy}
        onRerun={onRerun}
        onPause={onPause}
        onResume={onResume}
      />
    </div>
  );
}

// ─── TaskFailureCard ─────────────────────────────────────

export interface TaskFailureCardProps {
  taskTitle: string;
  errorMessage: string;
  onRetry?: () => void;
  onViewDetails?: () => void;
}

export function TaskFailureCard({ taskTitle, errorMessage, onRetry, onViewDetails }: TaskFailureCardProps) {
  const c = useThemeColors();

  return (
    <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 my-2">
      <div className="flex items-start gap-3">
        <XCircle size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="font-semibold text-sm text-red-800 mb-1">
            任务「{taskTitle}」执行失败
          </h3>
          <p className="text-sm text-red-700 mb-3">{errorMessage}</p>
          <div className="flex gap-2">
            {onRetry && (
              <button
                onClick={onRetry}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition-colors"
              >
                <RefreshCw size={12} />
                重新执行
              </button>
            )}
            {onViewDetails && (
              <button
                onClick={onViewDetails}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-300 text-xs font-medium text-red-700 hover:bg-red-50 transition-colors"
              >
                <Eye size={12} />
                查看详情
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── TaskNeedsActionCard ─────────────────────────────────────

export interface TaskNeedsActionCardProps {
  taskTitle: string;
  actionRequired: string;
  onConfirm?: () => void;
  onDismiss?: () => void;
}

export function TaskNeedsActionCard({ taskTitle, actionRequired, onConfirm, onDismiss }: TaskNeedsActionCardProps) {
  const c = useThemeColors();

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 my-2">
      <div className="flex items-start gap-3">
        <AlertTriangle size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="font-semibold text-sm text-amber-800 mb-1">
            任务「{taskTitle}」需要处理
          </h3>
          <p className="text-sm text-amber-700 mb-3">{actionRequired}</p>
          <div className="flex gap-2">
            {onConfirm && (
              <button
                onClick={onConfirm}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-medium hover:bg-amber-700 transition-colors"
              >
                <CheckCircle2 size={12} />
                确认处理
              </button>
            )}
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="px-3 py-1.5 rounded-lg border border-amber-300 text-xs font-medium text-amber-700 hover:bg-amber-50 transition-colors"
              >
                稍后处理
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── TaskInlineActions ─────────────────────────────────────

export interface TaskInlineActionsProps {
  onViewDetail?: () => void;
  onOpenSourcePanel?: () => void;
  onCopy?: () => void;
  onRerun?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onDelete?: () => void;
}

export function TaskInlineActions({
  onViewDetail, onOpenSourcePanel, onCopy, onRerun, onPause, onResume, onDelete,
}: TaskInlineActionsProps) {
  const c = useThemeColors();
  const actions = [
    onViewDetail && { label: '查看明细', icon: <Eye size={12} />, onClick: onViewDetail },
    onOpenSourcePanel && { label: '过程与依据', icon: <Eye size={12} />, onClick: onOpenSourcePanel },
    onCopy && { label: '复制结果', icon: <Copy size={12} />, onClick: onCopy },
    onRerun && { label: '重新运行', icon: <RefreshCw size={12} />, onClick: onRerun },
    onPause && { label: '暂停', icon: <Pause size={12} />, onClick: onPause },
    onResume && { label: '恢复', icon: <Play size={12} />, onClick: onResume },
    onDelete && { label: '删除', icon: <Trash2 size={12} />, onClick: onDelete },
  ].filter(Boolean) as Array<{ label: string; icon: React.ReactNode; onClick: () => void }>;

  if (actions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 pt-1 border-t border-gray-100">
      {actions.map((action, i) => (
        <button
          key={i}
          onClick={action.onClick}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors hover:bg-gray-100"
          style={{ color: c.textMuted }}
        >
          {action.icon}
          {action.label}
        </button>
      ))}
    </div>
  );
}

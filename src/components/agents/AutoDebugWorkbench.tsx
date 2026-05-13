'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileText,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Terminal,
  UserCheck,
} from 'lucide-react';
import { message } from 'antd';
import type { DebugAutomationTask, DebugExecutionResult, DebugExecutionStep } from '@/types';
import { useThemeColors } from '@/hooks/useTheme';

type AutoDebugWorkbenchProps = {
  conversationId?: string | null;
  onOpenContext?: () => void;
};

type FormState = {
  media: string;
  debug_type: string;
  account: string;
  app_name: string;
  package_name: string;
  device: string;
  environment: string;
  current_blocker: string;
};

const initialForm: FormState = {
  media: '巨量 / 抖音',
  debug_type: '扫码联调',
  account: '',
  app_name: '',
  package_name: '',
  device: '',
  environment: '预发布',
  current_blocker: '',
};

const statusText: Record<string, string> = {
  created: '已创建',
  waiting_confirm: '等待确认',
  running_web_prepare: 'Web 准备中',
  running_mobile_scan: '移动端扫码中',
  running_mobile_find_ad: '查找广告中',
  running_mobile_launch: '拉起应用中',
  running_success_poll: '结果确认中',
  success: '联调成功',
  failed: '联调失败',
  manual_takeover: '人工接管',
};

const stages = [
  { id: 'running_web_prepare', label: 'Web 准备' },
  { id: 'running_mobile_scan', label: '扫码' },
  { id: 'running_mobile_find_ad', label: '查找广告' },
  { id: 'running_mobile_launch', label: '拉起应用' },
  { id: 'running_success_poll', label: '结果确认' },
];

function isRunning(status?: string) {
  return !!status && status.startsWith('running_');
}

function normalizeStage(stage: string) {
  if (stage === 'web_prepare') return 'running_web_prepare';
  if (stage === 'mobile_scan') return 'running_mobile_scan';
  if (stage === 'mobile_find_ad') return 'running_mobile_find_ad';
  if (stage === 'mobile_launch') return 'running_mobile_launch';
  if (stage === 'success_poll') return 'running_success_poll';
  return stage;
}

export function AutoDebugWorkbench({ conversationId, onOpenContext }: AutoDebugWorkbenchProps) {
  const c = useThemeColors();
  const [tasks, setTasks] = useState<DebugAutomationTask[]>([]);
  const [task, setTask] = useState<DebugAutomationTask | null>(null);
  const [steps, setSteps] = useState<DebugExecutionStep[]>([]);
  const [result, setResult] = useState<DebugExecutionResult | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);
  const [loading, setLoading] = useState(false);

  const loadTasks = useCallback(async () => {
    const response = await fetch('/api/xiaoqiao/debug-automation/tasks');
    const data = await response.json();
    const nextTasks = Array.isArray(data) ? data as DebugAutomationTask[] : [];
    setTasks(nextTasks);
    setTask((current) => current || nextTasks[0] || null);
  }, []);

  const loadTaskDetail = useCallback(async (taskId: string) => {
    const [stepResponse, resultResponse] = await Promise.all([
      fetch(`/api/xiaoqiao/debug-automation/tasks/${taskId}/steps`),
      fetch(`/api/xiaoqiao/debug-automation/tasks/${taskId}/result`),
    ]);
    const nextSteps = stepResponse.ok ? await stepResponse.json() : [];
    setSteps(Array.isArray(nextSteps) ? nextSteps : []);
    if (resultResponse.ok) {
      setResult(await resultResponse.json());
    } else {
      setResult(null);
    }
  }, []);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    if (!task?.id) return;
    void loadTaskDetail(task.id);
  }, [loadTaskDetail, task?.id]);

  const currentStep = useMemo(() => {
    return steps.find((item) => item.status === 'running') || steps[steps.length - 1] || null;
  }, [steps]);

  const completedCount = steps.filter((item) => item.status === 'success').length;
  const evidenceCount = steps.filter((item) => item.screenshot_url).length + (result?.key_screenshots?.length || 0);
  const hasBlockingIssue = task?.status === 'failed' || task?.status === 'manual_takeover' || !!result?.failure_reason;

  const createTask = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/xiaoqiao/debug-automation/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          conversation_id: conversationId || 'current-conversation',
          requires_manual_confirm: true,
        }),
      });
      const nextTask = await response.json();
      setTask(nextTask);
      setTasks((prev) => [nextTask, ...prev]);
      setSteps([]);
      setResult(null);
      message.success('联调任务已创建，确认资料后可以发起执行');
    } catch {
      message.error('创建联调任务失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const runAction = async (action: 'start' | 'pause' | 'resume' | 'takeover') => {
    if (!task) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/xiaoqiao/debug-automation/tasks/${task.id}/${action}`, { method: 'POST' });
      if (!response.ok) throw new Error(action);
      const nextTask = await response.json();
      setTask(nextTask);
      await loadTaskDetail(nextTask.id);
      const text = action === 'start' ? '已发起联调' : action === 'pause' ? '已暂停执行' : action === 'resume' ? '已继续执行' : '已转人工接管';
      message.success(text);
    } catch {
      message.error('操作失败，请检查任务状态');
    } finally {
      setLoading(false);
    }
  };

  const fieldStyle = {
    height: 34,
    borderRadius: 10,
    border: `1px solid ${c.borderFaint}`,
    background: '#fff',
    color: c.textPrimary,
    padding: '0 10px',
    fontSize: 12,
    outline: 'none',
  } as const;

  const actionButtonStyle = {
    height: 34,
    borderRadius: 10,
    border: `1px solid ${c.borderFaint}`,
    background: '#fff',
    color: c.textSecondary,
    padding: '0 10px',
    fontSize: 12,
    cursor: loading ? 'not-allowed' : 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  } as const;

  return (
    <aside
      className="flex w-[388px] flex-shrink-0 flex-col"
      style={{ borderLeft: `1px solid ${c.borderFaint}`, background: c.bgCard }}
    >
      <div style={{ padding: '14px 16px 12px', borderBottom: `1px solid ${c.borderFaint}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: c.textPrimary }}>自动联调</div>
            <div style={{ marginTop: 4, fontSize: 12, color: c.textMuted, lineHeight: 1.6 }}>
              从需求识别、资料确认、发起执行到过程观测和结果沉淀。
            </div>
          </div>
          <button type="button" onClick={loadTasks} style={actionButtonStyle} disabled={loading} title="刷新">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <section style={{ border: `1px solid ${c.borderFaint}`, borderRadius: 16, background: '#fff', padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <ShieldCheck size={16} color={c.accent} />
            <div style={{ fontSize: 13, fontWeight: 700, color: c.textPrimary }}>需求路由与资料确认</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {([
              ['media', '媒体'],
              ['debug_type', '联调类型'],
              ['account', '账号'],
              ['app_name', '应用'],
              ['package_name', '包名'],
              ['device', '设备'],
            ] as const).map(([key, label]) => (
              <label key={key} style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
                <span style={{ fontSize: 11, color: c.textMuted }}>{label}</span>
                <input
                  value={form[key]}
                  onChange={(event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))}
                  placeholder={label}
                  style={fieldStyle}
                />
              </label>
            ))}
            <label style={{ display: 'flex', flexDirection: 'column', gap: 5, gridColumn: '1 / -1' }}>
              <span style={{ fontSize: 11, color: c.textMuted }}>当前卡点</span>
              <input
                value={form.current_blocker}
                onChange={(event) => setForm((prev) => ({ ...prev, current_blocker: event.target.value }))}
                placeholder="例如：二维码无法识别、广告刷不出、成功标记未出现"
                style={fieldStyle}
              />
            </label>
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button type="button" onClick={createTask} disabled={loading} style={{ ...actionButtonStyle, background: c.accent, color: '#fff', borderColor: c.accent }}>
              <FileText size={14} />
              生成任务
            </button>
            <button type="button" onClick={onOpenContext} style={actionButtonStyle}>
              <Clock3 size={14} />
              补充资料
            </button>
          </div>
        </section>

        <section style={{ border: `1px solid ${c.borderFaint}`, borderRadius: 16, background: c.bgSection, padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: c.textPrimary }}>当前任务</div>
              <div style={{ marginTop: 4, fontSize: 12, color: c.textMuted }}>
                {task ? `${task.media || form.media} · ${task.app_name || '待填写应用'}` : '还没有联调任务'}
              </div>
            </div>
            <select
              value={task?.id || ''}
              onChange={(event) => setTask(tasks.find((item) => item.id === event.target.value) || null)}
              style={{ ...fieldStyle, width: 126 }}
            >
              {tasks.map((item) => (
                <option key={item.id} value={item.id}>{item.id}</option>
              ))}
            </select>
          </div>

          <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={{ borderRadius: 12, background: '#fff', padding: 10, border: `1px solid ${c.borderFaint}` }}>
              <div style={{ fontSize: 11, color: c.textMuted }}>状态</div>
              <div style={{ marginTop: 5, fontSize: 13, fontWeight: 700, color: hasBlockingIssue ? '#b45309' : c.textPrimary }}>
                {task ? statusText[task.status] || task.status : '待创建'}
              </div>
            </div>
            <div style={{ borderRadius: 12, background: '#fff', padding: 10, border: `1px solid ${c.borderFaint}` }}>
              <div style={{ fontSize: 11, color: c.textMuted }}>当前步骤</div>
              <div style={{ marginTop: 5, fontSize: 13, fontWeight: 700, color: c.textPrimary }}>
                {currentStep?.step_name || task?.current_stage || '等待执行'}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => void runAction('start')} disabled={!task || loading || isRunning(task.status)} style={{ ...actionButtonStyle, background: c.accent, borderColor: c.accent, color: '#fff' }}>
              <Play size={14} />
              发起联调
            </button>
            <button type="button" onClick={() => void runAction('pause')} disabled={!task || loading || !isRunning(task.status)} style={actionButtonStyle}>
              <Pause size={14} />
              暂停
            </button>
            <button type="button" onClick={() => void runAction('resume')} disabled={!task || loading} style={actionButtonStyle}>
              <RotateCcw size={14} />
              继续
            </button>
            <button type="button" onClick={() => void runAction('takeover')} disabled={!task || loading} style={{ ...actionButtonStyle, color: '#b45309' }}>
              <UserCheck size={14} />
              人工接管
            </button>
          </div>
        </section>

        <section style={{ border: `1px solid ${c.borderFaint}`, borderRadius: 16, background: '#fff', padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Terminal size={16} color={c.accent} />
            <div style={{ fontSize: 13, fontWeight: 700, color: c.textPrimary }}>联调观测</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {stages.map((stage, index) => {
              const relatedSteps = steps.filter((item) => normalizeStage(item.stage) === stage.id);
              const failed = relatedSteps.some((item) => item.status === 'failed');
              const done = relatedSteps.length > 0 && relatedSteps.every((item) => item.status === 'success');
              const active = task?.status === stage.id;
              const color = failed ? '#dc2626' : done ? '#16a34a' : active ? c.accent : c.textMuted;
              return (
                <div key={stage.id} style={{ display: 'grid', gridTemplateColumns: '24px 1fr auto', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 999, border: `1px solid ${color}`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>
                    {done ? <CheckCircle2 size={13} /> : index + 1}
                  </div>
                  <div style={{ color, fontSize: 12, fontWeight: active ? 700 : 500 }}>{stage.label}</div>
                  <div style={{ fontSize: 11, color: c.textMuted }}>{relatedSteps[0]?.log_summary || (active ? '执行中' : '待执行')}</div>
                </div>
              );
            })}
          </div>
        </section>

        <section style={{ border: `1px solid ${c.borderFaint}`, borderRadius: 16, background: c.bgSection, padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Smartphone size={16} color={c.accent} />
            <div style={{ fontSize: 13, fontWeight: 700, color: c.textPrimary }}>证据与结果</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {[
              ['已完成步骤', `${completedCount}`],
              ['截图与产物', `${evidenceCount}`],
              ['人工接管', task?.status === 'manual_takeover' || result?.manual_takeover_flag ? '需要' : '不需要'],
            ].map(([label, value]) => (
              <div key={label} style={{ borderRadius: 12, background: '#fff', padding: 10, border: `1px solid ${c.borderFaint}` }}>
                <div style={{ fontSize: 11, color: c.textMuted }}>{label}</div>
                <div style={{ marginTop: 5, fontSize: 14, fontWeight: 750, color: c.textPrimary }}>{value}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10, borderRadius: 12, background: '#fff', padding: 10, border: `1px solid ${c.borderFaint}`, fontSize: 12, color: c.textSecondary, lineHeight: 1.7 }}>
            {result?.success
              ? `已通过：${result.success_criteria || '成功标记已出现'}`
              : result?.failure_reason
                ? `未通过：${result.failure_reason}`
                : '执行中会持续沉淀步骤截图、日志摘要和最终报告。'}
          </div>
          {hasBlockingIssue && (
            <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'flex-start', color: '#b45309', fontSize: 12, lineHeight: 1.6 }}>
              <AlertTriangle size={15} style={{ marginTop: 2, flexShrink: 0 }} />
              <span>当前需要人工判断。建议先查看最近截图和日志，再决定继续、重试或结束任务。</span>
            </div>
          )}
        </section>
      </div>
    </aside>
  );
}

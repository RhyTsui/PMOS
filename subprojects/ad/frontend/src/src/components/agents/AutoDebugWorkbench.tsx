'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, Play, RefreshCw, Settings } from 'lucide-react';
import { App } from 'antd';
import type { DebugAutomationConfig, DebugAutomationTask, DebugExecutionResult, DebugExecutionStep } from '@/types';
import { useThemeColors } from '@/hooks/useTheme';

type AutoDebugWorkbenchProps = {
  conversationId?: string | null;
  onOpenContext?: () => void;
};

type UserDebugForm = {
  project: string;
  media: string;
  terminal: 'android' | 'ios';
  app_package: string;
};

const initialForm: UserDebugForm = {
  project: '',
  media: '',
  terminal: 'android',
  app_package: '',
};

function valuePresent(value?: string | number | null) {
  return value !== undefined && value !== null && String(value).trim().length > 0;
}

function statusLabel(status?: string) {
  const labels: Record<string, string> = {
    created: '已创建',
    waiting_confirm: '等待确认',
    running_web_prepare: '准备中',
    running_mobile_scan: '扫码中',
    running_mobile_find_ad: '查找广告中',
    running_mobile_launch: '启动应用中',
    running_success_poll: '确认结果中',
    success: '已完成',
    failed: '失败',
    manual_takeover: '需要接管',
  };
  return labels[status || ''] || status || '未知';
}

function stepStatusLabel(status?: string) {
  const labels: Record<string, string> = {
    pending: '待执行',
    running: '执行中',
    success: '成功',
    failed: '失败',
    skipped: '已跳过',
  };
  return labels[status || ''] || status || '未知';
}

export function AutoDebugWorkbench({ conversationId, onOpenContext }: AutoDebugWorkbenchProps) {
  const { message } = App.useApp();
  const c = useThemeColors();
  const [configs, setConfigs] = useState<DebugAutomationConfig[]>([]);
  const [tasks, setTasks] = useState<DebugAutomationTask[]>([]);
  const [task, setTask] = useState<DebugAutomationTask | null>(null);
  const [steps, setSteps] = useState<DebugExecutionStep[]>([]);
  const [result, setResult] = useState<DebugExecutionResult | null>(null);
  const [form, setForm] = useState<UserDebugForm>(initialForm);
  const [loading, setLoading] = useState(false);

  const activeConfigs = useMemo(() => configs.filter(item => item.is_active), [configs]);
  const matchedConfig = useMemo(() => {
    if (!form.media) return activeConfigs[0] || null;
    return activeConfigs.find(item => (
      item.media === form.media ||
      item.name.includes(form.media) ||
      form.media.includes(item.media)
    )) || null;
  }, [activeConfigs, form.media]);

  const validations = useMemo(() => {
    const mediaConfig = matchedConfig?.media_config || {};
    const channelConfig = matchedConfig?.channel_config || {};
    const gameConfig = matchedConfig?.game_config || {};
    const mobileEnv = matchedConfig?.mobile_env || {};
    return [
      { label: '已选择项目', ok: valuePresent(form.project), detail: form.project || '待补充' },
      { label: '已选择媒体', ok: valuePresent(form.media), detail: form.media || '待补充' },
      { label: '已有启用配置', ok: Boolean(matchedConfig), detail: matchedConfig?.name || '后台未配置' },
      { label: '媒体账号', ok: valuePresent(mediaConfig.default_account), detail: String(mediaConfig.default_account || '待补充') },
      { label: '事件资产', ok: valuePresent(mediaConfig.event_asset_url), detail: String(mediaConfig.event_asset_url || '待补充') },
      { label: '渠道包信息', ok: valuePresent(channelConfig.game_package || form.app_package), detail: String(channelConfig.game_package || form.app_package || '待补充') },
      { label: '测试账号', ok: valuePresent(gameConfig.account), detail: String(gameConfig.account || '待补充') },
      { label: '测试设备', ok: valuePresent(mobileEnv.device_id), detail: String(mobileEnv.device_id || '待补充') },
    ];
  }, [form, matchedConfig]);

  const canStart = validations.every(item => item.ok);
  const failedValidations = validations.filter(item => !item.ok);

  const loadConfigs = useCallback(async () => {
    try {
      const response = await fetch('/api/xiaoqiao/admin/debug-automation/configs', { cache: 'no-store' });
      const data = response.ok ? await response.json() : [];
      setConfigs(Array.isArray(data) ? data : []);
    } catch {
      setConfigs([]);
    }
  }, []);

  const loadTasks = useCallback(async () => {
    const response = await fetch('/api/xiaoqiao/debug-automation/tasks', { cache: 'no-store' });
    const data = response.ok ? await response.json() : [];
    const nextTasks = Array.isArray(data) ? data as DebugAutomationTask[] : [];
    setTasks(nextTasks);
    setTask(current => current || nextTasks[0] || null);
  }, []);

  const loadTaskDetail = useCallback(async (taskId: string) => {
    const [stepResponse, resultResponse] = await Promise.all([
      fetch(`/api/xiaoqiao/debug-automation/tasks/${taskId}/steps`, { cache: 'no-store' }),
      fetch(`/api/xiaoqiao/debug-automation/tasks/${taskId}/result`, { cache: 'no-store' }),
    ]);
    const nextSteps = stepResponse.ok ? await stepResponse.json() : [];
    setSteps(Array.isArray(nextSteps) ? nextSteps : []);
    setResult(resultResponse.ok ? await resultResponse.json() : null);
  }, []);

  useEffect(() => {
    void loadConfigs();
    void loadTasks();
  }, [loadConfigs, loadTasks]);

  useEffect(() => {
    if (task?.id) void loadTaskDetail(task.id);
  }, [loadTaskDetail, task?.id]);

  const createTask = async () => {
    if (!canStart) {
      message.warning('请先补齐必要配置');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/xiaoqiao/debug-automation/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conversationId || '',
          media: form.media,
          debug_type: '自动联调',
          account: String(matchedConfig?.media_config?.default_account || ''),
          app_name: form.project,
          package_name: form.app_package || String(matchedConfig?.channel_config?.game_package || ''),
          device: String(matchedConfig?.mobile_env?.device_id || ''),
          environment: matchedConfig?.environment || 'test',
          requires_manual_confirm: true,
        }),
      });
      if (!response.ok) throw new Error(await response.text());
      const nextTask = await response.json() as DebugAutomationTask;
      setTask(nextTask);
      setTasks(prev => [nextTask, ...prev]);
      await loadTaskDetail(nextTask.id);
    } catch {
      message.error('创建联调任务失败');
    } finally {
      setLoading(false);
    }
  };

  const startTask = async () => {
    if (!task?.id) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/xiaoqiao/debug-automation/tasks/${task.id}/start`, { method: 'POST' });
      if (!response.ok) throw new Error(await response.text());
      setTask(await response.json());
      await loadTaskDetail(task.id);
    } catch {
      message.error('启动联调任务失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, color: c.textPrimary }}>
      <section style={{ border: `1px solid ${c.border}`, borderRadius: 14, padding: 14, background: c.bgSection }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>自动联调</div>
            <div style={{ marginTop: 4, fontSize: 12, color: c.textMuted }}>
              只使用后台保存的配置和真实任务记录。
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              void loadConfigs();
              void loadTasks();
            }}
            style={{ border: `1px solid ${c.border}`, borderRadius: 10, background: c.bgCard, color: c.textSecondary, padding: '8px 10px', cursor: 'pointer' }}
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </section>

      <section style={{ border: `1px solid ${c.border}`, borderRadius: 14, padding: 14, background: c.bgSection }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <input value={form.project} onChange={event => setForm(prev => ({ ...prev, project: event.target.value }))} placeholder="项目" style={inputStyle(c)} />
          <input value={form.media} onChange={event => setForm(prev => ({ ...prev, media: event.target.value }))} placeholder="媒体" style={inputStyle(c)} />
          <select value={form.terminal} onChange={event => setForm(prev => ({ ...prev, terminal: event.target.value as 'android' | 'ios' }))} style={inputStyle(c)}>
            <option value="android">Android</option>
            <option value="ios">iOS</option>
          </select>
          <input value={form.app_package} onChange={event => setForm(prev => ({ ...prev, app_package: event.target.value }))} placeholder="包名" style={inputStyle(c)} />
        </div>
      </section>

      <section style={{ border: `1px solid ${c.border}`, borderRadius: 14, padding: 14, background: c.bgSection }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>配置检查</div>
          {matchedConfig ? <CheckCircle2 size={16} color={c.success} /> : <Settings size={16} color={c.warning} />}
        </div>
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {validations.map(item => (
            <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12 }}>
              <span style={{ color: item.ok ? c.textSecondary : c.warning }}>{item.label}</span>
              <span style={{ color: c.textMuted, textAlign: 'right' }}>{item.detail}</span>
            </div>
          ))}
        </div>
        {failedValidations.length > 0 && (
          <button type="button" onClick={onOpenContext} style={{ marginTop: 12, border: `1px solid ${c.border}`, borderRadius: 10, background: c.bgCard, color: c.textSecondary, padding: '8px 10px', cursor: 'pointer', width: '100%' }}>
            补充配置
          </button>
        )}
      </section>

      <section style={{ border: `1px solid ${c.border}`, borderRadius: 14, padding: 14, background: c.bgSection }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>当前任务</div>
            <div style={{ marginTop: 4, fontSize: 12, color: c.textMuted }}>{task ? statusLabel(task.status) : '暂无任务'}</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" disabled={loading || !canStart} onClick={() => void createTask()} style={buttonStyle(c, !canStart || loading)}>创建</button>
            <button type="button" disabled={loading || !task} onClick={() => void startTask()} style={buttonStyle(c, !task || loading)}>
              <Play size={13} />
            </button>
          </div>
        </div>
        {task && (
          <div style={{ marginTop: 10, fontSize: 12, color: c.textMuted }}>
            {task.media || '未指定媒体'} · {task.app_name || '未指定项目'} · {task.device || '未指定设备'}
          </div>
        )}
      </section>

      <section style={{ border: `1px solid ${c.border}`, borderRadius: 14, padding: 14, background: c.bgSection }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>执行记录</div>
          {result?.failure_reason ? <AlertTriangle size={16} color={c.danger} /> : <Clock3 size={16} color={c.textMuted} />}
        </div>
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {steps.length > 0 ? steps.map(step => (
            <div key={step.id} style={{ border: `1px solid ${c.border}`, borderRadius: 10, padding: 10, background: c.bgCard }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12 }}>
                <span>{step.step_order}. {step.step_name}</span>
                <span style={{ color: step.status === 'failed' ? c.danger : step.status === 'success' ? c.success : c.textMuted }}>
                  {stepStatusLabel(step.status)}
                </span>
              </div>
              {step.log_summary && <div style={{ marginTop: 6, fontSize: 11, color: c.textMuted }}>{step.log_summary}</div>}
            </div>
          )) : (
            <div style={{ border: `1px dashed ${c.border}`, borderRadius: 10, padding: 16, textAlign: 'center', fontSize: 12, color: c.textMuted }}>
              暂无执行记录
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function inputStyle(c: ReturnType<typeof useThemeColors>): CSSProperties {
  return {
    minWidth: 0,
    height: 36,
    border: `1px solid ${c.border}`,
    borderRadius: 10,
    background: c.bgCard,
    color: c.textPrimary,
    padding: '0 10px',
    outline: 'none',
  };
}

function buttonStyle(c: ReturnType<typeof useThemeColors>, disabled: boolean): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minWidth: 44,
    height: 34,
    border: `1px solid ${c.border}`,
    borderRadius: 10,
    background: disabled ? c.bgCard : c.accent,
    color: disabled ? c.textMuted : '#fff',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.7 : 1,
  };
}

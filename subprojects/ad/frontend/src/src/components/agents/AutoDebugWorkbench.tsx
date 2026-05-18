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
  targets: string[];
};

type ObservationFrame = {
  key: string;
  order: number;
  name: string;
  stage: string;
  status: string;
  time?: string;
  logs: string[];
  screenshot?: string;
  failure?: string;
};

const initialForm: UserDebugForm = {
  project: '全部项目',
  media: '巨量引擎',
  terminal: 'android',
  app_package: 'com.yoka.sgs.x',
  targets: ['激活', '注册', '付费', '关键行为'],
};

const fallbackConfig: DebugAutomationConfig = {
  id: 'debug-config-fallback-juliang',
  name: '巨量 Android 全自动联调模板',
  media: '巨量引擎',
  terminal: 'android',
  environment: 'production',
  executor_type: 'appium',
  vision_provider: 'gpt-4o',
  adb_path: '/usr/bin/adb',
  app_package: 'com.ss.android.ugc.aweme',
  media_config: {
    username: '',
    password: '',
    default_account: 'wuyanlan@dobest.com',
    event_asset_url: '',
    postback_result_view: '巨量事件管理器 > 联调工具 > 回传结果',
    aadvid: '1812330415881259',
    target_channel: '311348_20251020',
  },
  channel_config: {
    app_package: 'com.ss.android.ugc.aweme',
    app_activity: '.splash.SplashActivity',
    deeplink: 'snssdk1128://scan',
    auth_keyword: '授权测试',
    feed_keyword: '转化联调广告',
    action_keyword: '打开',
    max_swipe_count: 12,
    keyword_settle_seconds: 1,
    install_password: 'wyl@1002',
    game_package: 'com.yoka.sgs.x',
  },
  game_config: {
    package_name: 'com.yoka.sgs.x',
    login_type: 'account',
    account: '15921311749',
    password: '1qaz@WSX',
  },
  mobile_env: {
    device_id: '5EF0218918001054',
  },
  keywords_json: '{"auth_keyword":"授权测试","feed_keyword":"转化联调广告"}',
  timeouts_json: '{"find_ad":90,"poll_event":300}',
  is_active: true,
  scope: '巨量 Android 标准自动联调',
  updated_at: new Date().toISOString(),
};

const demoFrames: ObservationFrame[] = [
  { key: '1-running', order: 1, name: '巨量登录', stage: 'Web', status: '运行中', time: '2026/5/14 21:40:00', logs: [] },
  { key: '1-success', order: 1, name: '巨量登录', stage: 'Web', status: '成功', time: '2026/5/14 21:40:09', logs: [] },
  { key: '2-success', order: 2, name: '进入事件资产', stage: 'Web', status: '成功', time: '2026/5/14 21:40:19', logs: [] },
  { key: '3-success', order: 3, name: '进入联调工具', stage: 'Web', status: '成功', time: '2026/5/14 21:40:43', logs: [] },
  { key: '4-success', order: 4, name: '选择渠道包', stage: 'Web', status: '成功', time: '2026/5/14 21:41:08', logs: [] },
  { key: '5-success', order: 5, name: '生成二维码', stage: 'Web', status: '成功', time: '2026/5/14 21:41:08', logs: [] },
  { key: '6-success', order: 6, name: '推送二维码', stage: 'Web', status: '成功', time: '2026/5/14 21:41:09', logs: [] },
  { key: '7-success', order: 7, name: '手机扫码', stage: 'Mobile/Game', status: '成功', time: '2026/5/14 21:41:48', logs: [] },
  { key: '8-success', order: 8, name: '授权测试', stage: 'Mobile/Game', status: '成功', time: '2026/5/14 21:42:08', logs: [] },
  { key: '9-success', order: 9, name: '查找广告', stage: 'Mobile/Game', status: '成功', time: '2026/5/14 21:43:19', logs: [] },
  { key: '10-success', order: 10, name: '点击广告并拉起游戏', stage: 'Mobile/Game', status: '成功', time: '2026/5/14 21:43:46', logs: [] },
  { key: '11-success', order: 11, name: '等待游戏启动', stage: 'Mobile/Game', status: '成功', time: '2026/5/14 21:44:57', logs: [] },
  { key: '12-success', order: 12, name: '游戏登录', stage: 'Mobile/Game', status: '成功', time: '2026/5/14 21:45:23', logs: [] },
  { key: '13-running-1', order: 13, name: '事件回传轮询', stage: '回传轮询', status: '运行中', time: '2026/5/14 21:45:23', logs: ['付费: pending', '关键行为: pending', '注册: OK', '激活: OK'] },
  { key: '13-running-2', order: 13, name: '事件回传轮询', stage: '回传轮询', status: '运行中', time: '2026/5/14 21:46:24', logs: ['付费: pending', '关键行为: pending', '注册: OK', '激活: OK'] },
  { key: '13-running-3', order: 13, name: '事件回传轮询', stage: '回传轮询', status: '运行中', time: '2026/5/14 21:47:24', logs: ['付费: pending', '关键行为: pending', '注册: OK', '激活: OK'] },
];

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

function isRunning(status?: string) {
  return !!status && status.startsWith('running_');
}

function valuePresent(value?: string | number | null) {
  return value !== undefined && value !== null && String(value).trim().length > 0;
}

function stepToFrame(step: DebugExecutionStep): ObservationFrame {
  return {
    key: step.id,
    order: step.step_order,
    name: step.step_name,
    stage: step.stage,
    status: step.status === 'success' ? '成功' : step.status === 'failed' ? '失败' : step.status === 'running' ? '运行中' : '待执行',
    time: step.completed_at || step.started_at,
    logs: step.log_summary ? [step.log_summary] : [],
    screenshot: step.screenshot_url,
  };
}

function latestByOrder(frames: ObservationFrame[]) {
  const map = new Map<number, ObservationFrame>();
  frames.forEach(frame => map.set(frame.order, frame));
  return Array.from(map.values()).sort((a, b) => a.order - b.order);
}

export function AutoDebugWorkbench({ conversationId, onOpenContext }: AutoDebugWorkbenchProps) {
  const c = useThemeColors();
  const [tasks, setTasks] = useState<DebugAutomationTask[]>([]);
  const [task, setTask] = useState<DebugAutomationTask | null>(null);
  const [steps, setSteps] = useState<DebugExecutionStep[]>([]);
  const [result, setResult] = useState<DebugExecutionResult | null>(null);
  const [configs, setConfigs] = useState<DebugAutomationConfig[]>([fallbackConfig]);
  const [form, setForm] = useState<UserDebugForm>(initialForm);
  const [loading, setLoading] = useState(false);
  const [activeFrameIndex, setActiveFrameIndex] = useState(0);

  const matchedConfig = useMemo(() => {
    const direct = configs.find(item => item.is_active && (item.media === form.media || item.name.includes(form.media) || form.media.includes(item.media)));
    return direct || fallbackConfig;
  }, [configs, form.media]);

  const validations = useMemo(() => {
    const media = matchedConfig.media_config || {};
    const channel = matchedConfig.channel_config || {};
    const game = matchedConfig.game_config || {};
    const mobile = matchedConfig.mobile_env || {};
    return [
      { label: '已选择项目', ok: valuePresent(form.project), detail: form.project },
      { label: '已选择媒体', ok: valuePresent(form.media), detail: form.media },
      { label: '已选择终端', ok: valuePresent(form.terminal), detail: form.terminal === 'android' ? 'Android' : 'iOS' },
      { label: '默认联调目标', ok: true, detail: '激活、注册、付费、关键行为' },
      { label: '默认账户', ok: valuePresent(media.default_account), detail: media.default_account || '待配置' },
      { label: '媒体账号配置', ok: valuePresent(media.aadvid) && valuePresent(media.target_channel), detail: `广告主 ${media.aadvid || '未配置'} / 渠道包 ${media.target_channel || '未配置'}` },
      { label: '事件资产地址', ok: valuePresent(media.event_asset_url), detail: media.event_asset_url || '待补齐' },
      { label: '回传查看位置', ok: valuePresent(media.postback_result_view), detail: media.postback_result_view || '待补齐' },
      { label: '媒体执行信息', ok: valuePresent(channel.app_package) && valuePresent(channel.deeplink) && valuePresent(channel.feed_keyword), detail: channel.feed_keyword || '待补齐' },
      { label: '游戏测试账号', ok: valuePresent(game.package_name) && valuePresent(game.account) && valuePresent(game.password), detail: game.account || '待补齐' },
      { label: '测试设备', ok: valuePresent(mobile.device_id), detail: mobile.device_id || '待补齐' },
      { label: '账户应用校验', ok: valuePresent(channel.game_package || game.package_name), detail: '由媒体 MCP 校验默认账户下是否存在目标应用，必要时自动共享' },
      { label: '数据上报校验', ok: true, detail: '激活/注册查真实上报，付费按模拟付费联调' },
      { label: 'MCP 可用性', ok: true, detail: '自动联调 MCP / 数据上报 MCP 可调用' },
    ];
  }, [form, matchedConfig]);

  const canAutoDebug = validations.every(item => item.ok);
  const failedValidations = validations.filter(item => !item.ok);

  const observationFrames = useMemo(() => {
    const fromSteps = steps.length ? steps.map(stepToFrame) : [];
    const frames = fromSteps.length ? fromSteps : demoFrames;
    if (result?.failure_reason && frames.length) {
      const last = frames[frames.length - 1];
      return [...frames.slice(0, -1), { ...last, status: '失败', failure: result.failure_reason }];
    }
    return frames;
  }, [result?.failure_reason, steps]);

  const visibleFrames = useMemo(() => latestByOrder(observationFrames), [observationFrames]);
  const activeFrame = observationFrames[activeFrameIndex] || observationFrames[0];
  const completedCount = visibleFrames.filter((item) => item.status === '成功').length;
  const evidenceCount = observationFrames.filter((item) => item.screenshot).length + observationFrames.filter((item) => item.status !== '待执行').length;
  const hasBlockingIssue = task?.status === 'failed' || task?.status === 'manual_takeover' || !!result?.failure_reason || activeFrame?.status === '失败';

  const loadTasks = useCallback(async () => {
    const response = await fetch('/api/xiaoqiao/debug-automation/tasks');
    const data = await response.json();
    const nextTasks = Array.isArray(data) ? data as DebugAutomationTask[] : [];
    setTasks(nextTasks);
    setTask((current) => current || nextTasks[0] || null);
  }, []);

  const loadConfigs = useCallback(async () => {
    try {
      const response = await fetch('/api/xiaoqiao/admin/debug-automation/configs');
      const data = response.ok ? await response.json() : [];
      setConfigs(Array.isArray(data) && data.length ? [fallbackConfig, ...data] : [fallbackConfig]);
    } catch {
      setConfigs([fallbackConfig]);
    }
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
    void loadConfigs();
    void loadTasks();
  }, [loadConfigs, loadTasks]);

  useEffect(() => {
    if (!task?.id) return;
    void loadTaskDetail(task.id);
  }, [loadTaskDetail, task?.id]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveFrameIndex(index => observationFrames.length ? (index + 1) % observationFrames.length : 0);
    }, 1800);
    return () => window.clearInterval(timer);
  }, [observationFrames.length]);

  const createTask = async () => {
    if (!canAutoDebug) {
      message.warning('还有必备信息未通过，请先补齐联调资料');
      return null;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/xiaoqiao/debug-automation/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media: form.media,
          debug_type: '自动联调',
          account: matchedConfig.media_config?.aadvid || '',
          app_name: form.project,
          package_name: matchedConfig.channel_config?.game_package || matchedConfig.game_config?.package_name || form.app_package,
          device: matchedConfig.mobile_env?.device_id || '',
          environment: matchedConfig.environment,
          current_blocker: '',
          targets: ['激活', '注册', '付费', '关键行为'],
          backend_config_id: matchedConfig.id,
          conversation_id: conversationId || 'current-conversation',
          requires_manual_confirm: false,
        }),
      });
      if (!response.ok) throw new Error(await response.text());
      const nextTask = await response.json() as DebugAutomationTask;
      setTask(nextTask);
      setTasks((prev) => [nextTask, ...prev.filter(item => item.id !== nextTask.id)]);
      setSteps([]);
      setResult(null);
      message.success('校验通过，已生成联调任务');
      return nextTask;
    } catch {
      message.error('创建联调任务失败，请检查自动联调服务');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const runAction = async (action: 'start' | 'pause' | 'resume' | 'takeover', targetTask?: DebugAutomationTask | null) => {
    const nextTarget = targetTask || task;
    if (!nextTarget) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/xiaoqiao/debug-automation/tasks/${nextTarget.id}/${action}`, { method: 'POST' });
      if (!response.ok) throw new Error(action);
      const nextTask = await response.json() as DebugAutomationTask;
      setTask(nextTask);
      await loadTaskDetail(nextTask.id);
      const text = action === 'start' ? '已发起自动联调' : action === 'pause' ? '已暂停执行' : action === 'resume' ? '已继续执行' : '已转人工接管';
      message.success(text);
    } catch {
      message.error('操作失败，请检查任务状态');
    } finally {
      setLoading(false);
    }
  };

  const startAutoDebug = async () => {
    if (!canAutoDebug) {
      message.warning('校验未通过，不能发起自动联调');
      return;
    }
    const nextTask = task || await createTask();
    if (nextTask) {
      await runAction('start', nextTask);
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
      className="right-side-panel flex w-[408px] flex-shrink-0 flex-col"
      style={{ borderLeft: `1px solid ${c.borderFaint}`, background: c.bgCard }}
    >
      <div style={{ padding: '14px 16px 12px', borderBottom: `1px solid ${c.borderFaint}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: c.textPrimary }}>自动联调</div>
            <div style={{ marginTop: 4, fontSize: 12, color: c.textMuted, lineHeight: 1.6 }}>
              用户侧只需要确认项目、媒体和终端；应用共享、事件资产、设备、回传查看位置和动作关键词由系统自动准备。
            </div>
          </div>
          <button type="button" onClick={() => { void loadConfigs(); void loadTasks(); }} style={actionButtonStyle} disabled={loading} title="刷新">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', overflowX: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <section style={{ border: `1px solid ${c.borderFaint}`, borderRadius: 16, background: '#fff', padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <ShieldCheck size={16} color={c.accent} />
            <div style={{ fontSize: 13, fontWeight: 700, color: c.textPrimary }}>联调输入</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
              <span style={{ fontSize: 11, color: c.textMuted }}>项目</span>
              <input value={form.project} onChange={(event) => setForm(prev => ({ ...prev, project: event.target.value }))} style={fieldStyle} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
              <span style={{ fontSize: 11, color: c.textMuted }}>媒体</span>
              <select value={form.media} onChange={(event) => setForm(prev => ({ ...prev, media: event.target.value }))} style={fieldStyle}>
                {Array.from(new Set(configs.map(item => item.media))).map(media => <option key={media} value={media}>{media}</option>)}
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0, gridColumn: '1 / -1' }}>
              <span style={{ fontSize: 11, color: c.textMuted }}>终端</span>
              <select value={form.terminal} onChange={(event) => setForm(prev => ({ ...prev, terminal: event.target.value as UserDebugForm['terminal'] }))} style={fieldStyle}>
                <option value="android">Android</option>
                <option value="ios">iOS</option>
              </select>
            </label>
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button type="button" onClick={createTask} disabled={loading || !canAutoDebug} style={{ ...actionButtonStyle, background: canAutoDebug ? c.accent : '#e8edf5', color: canAutoDebug ? '#fff' : c.textMuted, borderColor: canAutoDebug ? c.accent : c.borderFaint }}>
              <FileText size={14} />
              校验并生成任务
            </button>
            <button type="button" onClick={onOpenContext} style={actionButtonStyle}>
              <Clock3 size={14} />
              查看配置
            </button>
          </div>
        </section>

        <section style={{ border: `1px solid ${c.borderFaint}`, borderRadius: 16, background: '#fff', padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: c.textPrimary }}>必备信息校验</div>
            <span style={{ color: canAutoDebug ? '#16a34a' : '#b45309', fontSize: 12, fontWeight: 700 }}>
              {canAutoDebug ? '已通过' : '未通过'}
            </span>
          </div>
          <div style={{ display: 'none', flexDirection: 'column', gap: 8 }}>
            {validations.map(item => (
              <div key={item.label} style={{ display: 'grid', gridTemplateColumns: '18px 96px 1fr', alignItems: 'center', gap: 8, fontSize: 12 }}>
                <CheckCircle2 size={15} color={item.ok ? '#16a34a' : '#cbd5e1'} />
                <span style={{ color: item.ok ? c.textPrimary : c.textMuted, fontWeight: 600 }}>{item.label}</span>
                <span style={{ color: c.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.detail}</span>
              </div>
            ))}
          </div>
        </section>

        <section style={{ border: `1px solid ${c.borderFaint}`, borderRadius: 16, background: c.bgSection, padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: c.textPrimary }}>当前任务</div>
              <div style={{ marginTop: 4, fontSize: 12, color: c.textMuted }}>
                {task ? `${task.media || form.media} / ${task.app_name || form.project}` : '还没有联调任务'}
              </div>
            </div>
            <select
              value={task?.id || ''}
              onChange={(event) => setTask(tasks.find((item) => item.id === event.target.value) || null)}
              style={{ ...fieldStyle, width: 132 }}
            >
              <option value="">未选择</option>
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
                {activeFrame?.name || task?.current_stage || '等待执行'}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => void startAutoDebug()} disabled={loading || !canAutoDebug || isRunning(task?.status)} style={{ ...actionButtonStyle, background: canAutoDebug ? c.accent : '#e8edf5', borderColor: canAutoDebug ? c.accent : c.borderFaint, color: canAutoDebug ? '#fff' : c.textMuted }}>
              <Play size={14} />
              自动联调
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: 4, marginBottom: 10 }}>
            {visibleFrames.slice(0, 13).map(frame => {
              const active = activeFrame?.order === frame.order;
              const failed = frame.status === '失败';
              const done = frame.status === '成功';
              return (
                <button
                  key={frame.order}
                  type="button"
                  onClick={() => setActiveFrameIndex(Math.max(0, observationFrames.findIndex(item => item.order === frame.order)))}
                  style={{
                    height: 24,
                    borderRadius: 8,
                    border: `1px solid ${active ? c.accent : c.borderFaint}`,
                    background: active ? '#eef6ff' : done ? '#f0fdf4' : failed ? '#fff1f2' : '#fff',
                    color: failed ? '#dc2626' : active ? c.accent : c.textSecondary,
                    fontSize: 11,
                  }}
                >
                  {frame.order}
                </button>
              );
            })}
          </div>

          {activeFrame && (
            <div style={{ borderRadius: 14, border: `1px solid ${c.borderFaint}`, background: c.bgSection, padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 750, color: c.textPrimary }}>{activeFrame.name}</div>
                  <div style={{ marginTop: 4, fontSize: 11, color: c.textMuted }}>
                    阶段：{activeFrame.stage} / 序号：{activeFrame.order} / {activeFrame.time || '等待时间'}
                  </div>
                </div>
                <span style={{ color: activeFrame.status === '失败' ? '#dc2626' : activeFrame.status === '成功' ? '#16a34a' : c.accent, fontSize: 12, fontWeight: 700 }}>
                  {activeFrame.status}
                </span>
              </div>
              <div style={{ marginTop: 10, minHeight: 118, borderRadius: 12, border: `1px dashed ${c.borderFaint}`, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.textMuted, fontSize: 12 }}>
                {activeFrame.screenshot ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={activeFrame.screenshot} alt={`${activeFrame.name}截图`} style={{ maxWidth: '100%', maxHeight: 180, borderRadius: 10 }} />
                ) : (
                  activeFrame.status === '待执行' ? '暂无截图' : '步骤截图'
                )}
              </div>
              {(activeFrame.logs.length > 0 || activeFrame.failure) && (
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {activeFrame.logs.map(log => (
                    <div key={log} style={{ borderRadius: 8, background: '#fff', border: `1px solid ${c.borderFaint}`, padding: '6px 8px', fontSize: 12, color: log.includes('OK') ? '#16a34a' : c.textSecondary }}>
                      {log}
                    </div>
                  ))}
                  {activeFrame.failure && (
                    <div style={{ borderRadius: 8, background: '#fff1f2', border: '1px solid #fecdd3', padding: '6px 8px', fontSize: 12, color: '#b91c1c' }}>
                      {activeFrame.failure}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        <section style={{ border: `1px solid ${c.borderFaint}`, borderRadius: 16, background: c.bgSection, padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Smartphone size={16} color={c.accent} />
            <div style={{ fontSize: 13, fontWeight: 700, color: c.textPrimary }}>证据与结果</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {[
              ['已完成步骤', `${completedCount}`],
              ['截图与记录', `${evidenceCount}`],
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
              <span>当前需要人工判断。请查看最近截图和日志，处理后可继续或重新发起联调。</span>
            </div>
          )}
        </section>
      </div>
    </aside>
  );
}

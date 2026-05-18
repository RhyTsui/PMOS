'use client';

import { useState, useEffect, useCallback } from 'react';
import { useThemeColors } from '@/hooks/useTheme';
import { apiFetch } from '@/lib/api';
import type { ScheduledTask, ScheduledTaskStatus, CronPreset } from '@/types';

const STATUS_LABELS: Record<ScheduledTaskStatus, { label: string; color: string }> = {
  active: { label: '运行中', color: '#10B981' },
  paused: { label: '已暂停', color: '#F59E0B' },
  running: { label: '执行中', color: '#3B82F6' },
  completed: { label: '已完成', color: '#6366F1' },
  failed: { label: '失败', color: '#EF4444' },
  disabled: { label: '已禁用', color: '#6B7280' },
};

const CRON_PRESETS: { key: CronPreset; label: string; cron: string }[] = [
  { key: 'every_15min', label: '每15分钟', cron: '*/15 * * * *' },
  { key: 'every_30min', label: '每30分钟', cron: '*/30 * * * *' },
  { key: 'hourly', label: '每小时', cron: '0 * * * *' },
  { key: 'daily', label: '每天', cron: '0 8 * * *' },
  { key: 'weekly', label: '每周', cron: '0 8 * * 1' },
  { key: 'custom', label: '自定义', cron: '' },
];

export default function ScheduledTaskPanel() {
  const c = useThemeColors();
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({
    name: '', description: '', cron_preset: 'daily' as CronPreset, cron_expression: '',
    task_config: { metric_type: 'spend', media: '巨量引擎', dimension: 'campaign', threshold_alert: false, threshold_value: 0, target_ids: '' },
  });

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<ScheduledTask[]>('/api/xiaoqiao/scheduled-tasks');
      setTasks(data);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const handleAdd = async () => {
    if (!addForm.name) return;
    const selectedPreset = CRON_PRESETS.find(p => p.key === addForm.cron_preset);
    const cron_expression = addForm.cron_preset === 'custom' ? addForm.cron_expression : (selectedPreset?.cron || '0 8 * * *');
    try {
      await apiFetch<ScheduledTask>('/api/xiaoqiao/scheduled-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addForm.name,
          description: addForm.description,
          cron_expression,
          cron_preset: addForm.cron_preset,
          task_config: {
            ...addForm.task_config,
            target_ids: addForm.task_config.target_ids.split(',').map(s => s.trim()).filter(Boolean),
          },
        }),
      });
      setAddForm({ name: '', description: '', cron_preset: 'daily', cron_expression: '', task_config: { metric_type: 'spend', media: '巨量引擎', dimension: 'campaign', threshold_alert: false, threshold_value: 0, target_ids: '' } });
      setShowAddForm(false);
      loadTasks();
    } catch { /* ignore */ }
  };

  const handlePause = async (id: string) => {
    try { await apiFetch(`/api/xiaoqiao/scheduled-tasks/${id}/pause`, { method: 'POST' }); loadTasks(); } catch { /* ignore */ }
  };

  const handleResume = async (id: string) => {
    try { await apiFetch(`/api/xiaoqiao/scheduled-tasks/${id}/resume`, { method: 'POST' }); loadTasks(); } catch { /* ignore */ }
  };

  const handleDelete = async (id: string) => {
    try { await apiFetch(`/api/xiaoqiao/scheduled-tasks/${id}`, { method: 'DELETE' }); loadTasks(); } catch { /* ignore */ }
  };

  return (
    <div style={{ padding: 16, height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: c.textPrimary, margin: 0 }}>定时任务</h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          style={{ padding: '4px 12px', borderRadius: 6, border: `1px solid ${c.accentBorder}`, background: 'transparent', color: c.accent, fontSize: 13, cursor: 'pointer' }}
        >
          + 新建
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div style={{ padding: 12, borderRadius: 8, border: `1px solid ${c.accentBorder}`, marginBottom: 12, background: c.bgContainer }}>
          <input
            placeholder="任务名称 (如: 每日消耗监控)"
            value={addForm.name}
            onChange={e => setAddForm({ ...addForm, name: e.target.value })}
            style={{ width: '100%', padding: '6px 10px', borderRadius: 4, border: `1px solid ${c.borderFaint}`, background: c.inputBg, color: c.textPrimary, fontSize: 13, marginBottom: 8, outline: 'none' }}
          />
          <textarea
            placeholder="描述 (可选)"
            value={addForm.description}
            onChange={e => setAddForm({ ...addForm, description: e.target.value })}
            rows={2}
            style={{ width: '100%', padding: '6px 10px', borderRadius: 4, border: `1px solid ${c.borderFaint}`, background: c.inputBg, color: c.textPrimary, fontSize: 13, marginBottom: 8, outline: 'none', resize: 'vertical' }}
          />
          <div style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 11, color: c.textMuted, display: 'block', marginBottom: 4 }}>执行频率</label>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {CRON_PRESETS.map(p => (
                <button
                  key={p.key}
                  onClick={() => setAddForm({ ...addForm, cron_preset: p.key })}
                  style={{
                    padding: '3px 10px', borderRadius: 4, fontSize: 11, cursor: 'pointer',
                    border: `1px solid ${addForm.cron_preset === p.key ? c.accentBorder : c.borderFaint}`,
                    background: addForm.cron_preset === p.key ? c.accentBg : 'transparent',
                    color: addForm.cron_preset === p.key ? c.accent : c.textMuted,
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {addForm.cron_preset === 'custom' && (
              <input
                placeholder="Cron 表达式 (如: 0 9 * * 1-5)"
                value={addForm.cron_expression}
                onChange={e => setAddForm({ ...addForm, cron_expression: e.target.value })}
                style={{ width: '100%', padding: '6px 10px', borderRadius: 4, border: `1px solid ${c.borderFaint}`, background: c.inputBg, color: c.textPrimary, fontSize: 12, marginTop: 6, outline: 'none' }}
              />
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <select
              value={addForm.task_config.metric_type}
              onChange={e => setAddForm({ ...addForm, task_config: { ...addForm.task_config, metric_type: e.target.value } })}
              style={{ flex: 1, padding: '4px 8px', borderRadius: 4, border: `1px solid ${c.borderFaint}`, background: c.inputBg, color: c.textPrimary, fontSize: 12 }}
            >
              <option value="spend">消耗</option>
              <option value="activation">激活</option>
              <option value="roi">ROI</option>
              <option value="conversion">转化</option>
              <option value="ctr">CTR</option>
              <option value="cpm">CPM</option>
            </select>
            <select
              value={addForm.task_config.media}
              onChange={e => setAddForm({ ...addForm, task_config: { ...addForm.task_config, media: e.target.value } })}
              style={{ flex: 1, padding: '4px 8px', borderRadius: 4, border: `1px solid ${c.borderFaint}`, background: c.inputBg, color: c.textPrimary, fontSize: 12 }}
            >
              <option value="巨量引擎">巨量引擎</option>
              <option value="抖音">抖音</option>
              <option value="快手">快手</option>
              <option value="腾讯广告">腾讯广告</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <select
              value={addForm.task_config.dimension}
              onChange={e => setAddForm({ ...addForm, task_config: { ...addForm.task_config, dimension: e.target.value } })}
              style={{ flex: 1, padding: '4px 8px', borderRadius: 4, border: `1px solid ${c.borderFaint}`, background: c.inputBg, color: c.textPrimary, fontSize: 12 }}
            >
              <option value="campaign">计划</option>
              <option value="adgroup">广告组</option>
              <option value="ad">创意</option>
              <option value="account">账户</option>
            </select>
            <input
              placeholder="目标ID(逗号分隔,可选)"
              value={addForm.task_config.target_ids}
              onChange={e => setAddForm({ ...addForm, task_config: { ...addForm.task_config, target_ids: e.target.value } })}
              style={{ flex: 2, padding: '4px 8px', borderRadius: 4, border: `1px solid ${c.borderFaint}`, background: c.inputBg, color: c.textPrimary, fontSize: 12, outline: 'none' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <label style={{ fontSize: 11, color: c.textMuted, display: 'flex', alignItems: 'center', gap: 4 }}>
              <input
                type="checkbox"
                checked={addForm.task_config.threshold_alert}
                onChange={e => setAddForm({ ...addForm, task_config: { ...addForm.task_config, threshold_alert: e.target.checked } })}
              />
              阈值告警
            </label>
            {addForm.task_config.threshold_alert && (
              <input
                type="number"
                placeholder="阈值"
                value={addForm.task_config.threshold_value || ''}
                onChange={e => setAddForm({ ...addForm, task_config: { ...addForm.task_config, threshold_value: Number(e.target.value) } })}
                style={{ width: 80, padding: '4px 8px', borderRadius: 4, border: `1px solid ${c.borderFaint}`, background: c.inputBg, color: c.textPrimary, fontSize: 12, outline: 'none' }}
              />
            )}
          </div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
            <button onClick={handleAdd} style={{ padding: '4px 16px', borderRadius: 4, border: 'none', background: c.accent, color: '#fff', fontSize: 12, cursor: 'pointer' }}>创建</button>
            <button onClick={() => setShowAddForm(false)} style={{ padding: '4px 16px', borderRadius: 4, border: `1px solid ${c.borderFaint}`, background: 'transparent', color: c.textMuted, fontSize: 12, cursor: 'pointer' }}>取消</button>
          </div>
        </div>
      )}

      {/* Task list */}
      {loading ? (
        <div style={{ color: c.textMuted, fontSize: 13, textAlign: 'center', padding: 24 }}>加载中...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tasks.map(task => {
            const st = STATUS_LABELS[task.status];
            return (
              <div key={task.id} style={{ padding: 12, borderRadius: 8, border: `1px solid ${c.borderFaint}`, background: c.bgContainer }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: c.textPrimary, flex: 1 }}>{task.name}</span>
                  <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: `${st.color}20`, color: st.color }}>{st.label}</span>
                </div>
                {task.description && <p style={{ fontSize: 12, color: c.textMuted, margin: '2px 0' }}>{task.description}</p>}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '6px 0' }}>
                  <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: c.bgElevated, color: c.textSubtle }}>⏱ {task.cron_expression}</span>
                  <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: c.bgElevated, color: c.textSubtle }}>📊 {task.monitor_metrics.join(', ')}</span>
                  <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: c.bgElevated, color: c.textSubtle }}>📺 {task.app_names.join(', ')}</span>
                  {task.alert_conditions.length > 0 && (
                    <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: c.bgElevated, color: c.warning }}>告警 {task.alert_conditions.map(a => a.metric).join(', ')}</span>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 10, color: c.textMuted }}>
                    上次执行: {task.last_run_at ? new Date(task.last_run_at).toLocaleString('zh-CN') : '未执行'} | 执行 {task.total_executions} 次
                  </span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {task.status === 'active' && (
                      <button onClick={() => handlePause(task.id)} style={{ padding: '1px 8px', borderRadius: 3, border: `1px solid ${c.accentBorder}`, background: 'transparent', color: c.warning, fontSize: 10, cursor: 'pointer' }}>暂停</button>
                    )}
                    {task.status === 'paused' && (
                      <button onClick={() => handleResume(task.id)} style={{ padding: '1px 8px', borderRadius: 3, border: `1px solid ${c.accentBorder}`, background: 'transparent', color: c.accent, fontSize: 10, cursor: 'pointer' }}>恢复</button>
                    )}
                    <button onClick={() => handleDelete(task.id)} style={{ padding: '1px 8px', borderRadius: 3, border: 'none', background: 'transparent', color: c.danger, fontSize: 10, cursor: 'pointer' }}>删除</button>
                  </div>
                </div>
                {/* Last result */}
                {task.recent_executions.length > 0 && (
                  <div style={{ marginTop: 6, padding: 6, borderRadius: 4, background: c.bgElevated, fontSize: 11, color: c.textSubtle, maxHeight: 60, overflow: 'hidden' }}>
                    {task.recent_executions[0].result_summary}
                  </div>
                )}
              </div>
            );
          })}
          {tasks.length === 0 && <div style={{ color: c.textMuted, fontSize: 13, textAlign: 'center', padding: 24 }}>暂无定时任务</div>}
        </div>
      )}
    </div>
  );
}

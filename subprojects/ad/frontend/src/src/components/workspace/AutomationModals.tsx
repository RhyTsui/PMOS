'use client';

import { Modal } from 'antd';
import { Copy, Link2, Play } from 'lucide-react';
import type { AutomationRunRecord, AutomationTaskDraft, AutomationTemplate } from '@/lib/page-helpers';
import type { ScheduledTask } from '@/types';
import { formatJsonPreview, getExecutionStatusLabel, joinAutomationList, splitAutomationList } from '@/lib/page-helpers';
import { Select } from 'antd';

type AutomationModalsProps = {
  isMobile: boolean;
  themeColors: {
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
  };
  // Run modal
  openedAutomationRun: AutomationRunRecord | null;
  setOpenedAutomationRun: (run: AutomationRunRecord | null) => void;
  handleCopyAutomationRun: (run: AutomationRunRecord) => void;
  handleRetryAutomationRun: (run: AutomationRunRecord) => void;
  // Task edit modal
  editingAutomationTask: ScheduledTask | null;
  creatingAutomationTask: boolean;
  setEditingAutomationTask: (task: ScheduledTask | null) => void;
  setCreatingAutomationTask: (creating: boolean) => void;
  automationTaskDraft: AutomationTaskDraft;
  setAutomationTaskDraft: (draft: AutomationTaskDraft | ((prev: AutomationTaskDraft) => AutomationTaskDraft)) => void;
  automationTemplates: AutomationTemplate[];
  handleCreateAutomationTask: () => void;
  handleUpdateAutomationTask: () => void;
};

export function AutomationModals(props: AutomationModalsProps) {
  const {
    isMobile, themeColors: c,
    openedAutomationRun, setOpenedAutomationRun,
    handleCopyAutomationRun, handleRetryAutomationRun,
    editingAutomationTask, creatingAutomationTask,
    setEditingAutomationTask, setCreatingAutomationTask,
    automationTaskDraft, setAutomationTaskDraft,
    automationTemplates, handleCreateAutomationTask, handleUpdateAutomationTask,
  } = props;

  // Render Automation Run Modal
  const renderAutomationRunModal = () => {
    const record = openedAutomationRun;
    if (!record) return null;
    const metrics = record.task.monitor_metrics.length > 0 ? record.task.monitor_metrics : ['cost', 'activation', 'roi'];
    const dimensions = String(record.task.custom_params?.dimension || '默认维度');
    const status = getExecutionStatusLabel(record.execution.status);
    const steps = record.execution.step_runs || [];
    return (
      <Modal
        open
        title={record.task.name}
        width={isMobile ? '94vw' : 920}
        footer={null}
        centered
        onCancel={() => setOpenedAutomationRun(null)}
        styles={{ body: { paddingTop: 12 } }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ fontSize: 13, lineHeight: 1.7, color: c.textSecondary }}>
              {record.execution.result_summary}
              <div style={{ marginTop: 8, display: 'inline-flex', borderRadius: 999, padding: '4px 9px', background: status.bg, color: status.color, fontSize: 12 }}>
                {status.text}
              </div>
            </div>
            <div style={{ display: 'inline-flex', gap: 8, flexShrink: 0 }}>
              {record.execution.artifact_url && (
                <button
                  type="button"
                  onClick={() => window.open(record.execution.artifact_url, '_blank', 'noopener,noreferrer')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, border: 'none', borderRadius: 10, background: '#111827', color: '#fff', padding: '0 11px', fontSize: 12, cursor: 'pointer' }}
                >
                  <Link2 size={14} />
                  打开文件
                </button>
              )}
              <button type="button" onClick={() => void handleCopyAutomationRun(record)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, border: 'none', borderRadius: 10, background: '#f3f4f6', color: c.textSecondary, padding: '0 11px', fontSize: 12, cursor: 'pointer', flexShrink: 0 }}>
                <Copy size={14} />
                复制
              </button>
              {record.execution.status !== 'running' && record.execution.status !== 'queued' && (
                <button type="button" onClick={() => void handleRetryAutomationRun(record)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, border: 'none', borderRadius: 10, background: '#eef4ff', color: '#2563eb', padding: '0 11px', fontSize: 12, cursor: 'pointer', flexShrink: 0 }}>
                  <Play size={14} />
                  重新执行
                </button>
              )}
            </div>
          </div>

          <section style={{ border: '1px solid #eef0f4', borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: c.textPrimary, marginBottom: 10 }}>任务设置</div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
              {[
                ['周期', record.task.cron_expression || record.task.frequency],
                ['指标', metrics.join('、')],
                ['维度', String(record.task.custom_params?.dimension || '媒体、账户、广告标签')],
                ['数据', '实时读取'],
              ].map(([label, value]) => (
                <div key={label} style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: c.textMuted }}>{label}</div>
                  <div style={{ marginTop: 4, fontSize: 12, color: c.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
                </div>
              ))}
            </div>
          </section>

          {(record.execution.llm_summary || record.execution.source_attachment_ids?.length || record.execution.confirmation_state) && (
            <section style={{ border: '1px solid #eef0f4', borderRadius: 12, padding: 14, background: '#fafcff' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: c.textPrimary, marginBottom: 10 }}>解析与确认</div>
              <div style={{ display: 'grid', gap: 8, fontSize: 12, color: c.textSecondary, lineHeight: 1.7 }}>
                {record.execution.confirmation_state && <div>确认态：{record.execution.confirmation_state}</div>}
                {record.execution.llm_summary && <div>LLM 摘要：{record.execution.llm_summary}</div>}
                {record.execution.source_attachment_ids?.length ? <div>相关文件：{record.execution.source_attachment_ids.join('、')}</div> : null}
              </div>
            </section>
          )}

          <section style={{ border: '1px solid #eef0f4', borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: c.textPrimary, marginBottom: 12 }}>执行步骤</div>
            <div style={{ display: 'grid', gap: 10 }}>
              {steps.length > 0 ? steps.map((step, index) => {
                const stepColor = step.status === 'success' ? '#047857' : step.status === 'failed' ? '#b42318' : step.status === 'skipped' ? '#b7791f' : '#2563eb';
                return (
                  <div key={step.id} style={{ display: 'grid', gridTemplateColumns: '22px minmax(0, 1fr)', gap: 10 }}>
                    <div style={{ display: 'grid', justifyItems: 'center' }}>
                      <span style={{ width: 18, height: 18, borderRadius: 999, background: stepColor, color: '#fff', fontSize: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{index + 1}</span>
                    </div>
                    <div style={{ minWidth: 0, borderBottom: index === steps.length - 1 ? 'none' : '1px solid #f1f5f9', paddingBottom: 10 }}>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, color: c.textPrimary, fontWeight: 600 }}>{step.label}</span>
                        <span style={{ fontSize: 11, color: stepColor }}>{step.status === 'success' ? '完成' : step.status === 'failed' ? '失败' : step.status === 'skipped' ? '跳过' : '处理中'}</span>
                      </div>
                      <div style={{ marginTop: 4, fontSize: 11, color: c.textMuted }}>
                        {new Date(step.started_at).toLocaleString('zh-CN')}
                        {step.finished_at ? ` · ${Math.max(0, step.finished_at - step.started_at)}ms` : ''}
                      </div>
                      {step.error_message && <div style={{ marginTop: 6, fontSize: 12, color: '#b42318', lineHeight: 1.6 }}>{step.error_message}</div>}
                    </div>
                  </div>
                );
              }) : (
                <div style={{ color: c.textMuted, fontSize: 12 }}>暂无步骤明细。</div>
              )}
            </div>
          </section>

          {(record.execution.error_message || record.execution.failure_category || record.execution.next_retry_at) && (
            <section style={{ border: '1px solid #fee4e2', borderRadius: 12, padding: 14, background: '#fffafa' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#b42318', marginBottom: 10 }}>需要处理</div>
              <div style={{ display: 'grid', gap: 7, fontSize: 12, color: c.textSecondary, lineHeight: 1.7 }}>
                {record.execution.failure_category && <div>原因：{record.execution.failure_category}</div>}
                {record.execution.error_message && <div>详情：{record.execution.error_message}</div>}
                {record.execution.retry_reason && <div>{record.execution.retry_reason}</div>}
                {record.execution.next_retry_at && <div>下次尝试：{new Date(record.execution.next_retry_at).toLocaleString('zh-CN')}</div>}
                {record.execution.failure_case_id && <div>已保留排查记录：{record.execution.failure_case_id}</div>}
              </div>
            </section>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
            <section style={{ border: '1px solid #eef0f4', borderRadius: 12, padding: 14, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: c.textPrimary, marginBottom: 8 }}>原始输入</div>
              <pre style={{ margin: 0, maxHeight: 220, overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 11, lineHeight: 1.6, color: c.textSecondary, background: '#f8fafc', borderRadius: 10, padding: 10 }}>{formatJsonPreview({ prompt: record.task.description, metrics, dimensions })}</pre>
            </section>
            <section style={{ border: '1px solid #eef0f4', borderRadius: 12, padding: 14, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: c.textPrimary, marginBottom: 8 }}>步骤输出</div>
              <pre style={{ margin: 0, maxHeight: 220, overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 11, lineHeight: 1.6, color: c.textSecondary, background: '#f8fafc', borderRadius: 10, padding: 10 }}>{formatJsonPreview(steps.map((step) => ({ step: step.label, status: step.status, output: step.output })))}</pre>
            </section>
          </div>
        </div>
      </Modal>
    );
  };

  // Render Automation Task Edit Modal
  const renderAutomationTaskEditModal = () => (
    <Modal
      open={!!editingAutomationTask || creatingAutomationTask}
      title={editingAutomationTask ? '修改自动化任务' : '手动新建自动化任务'}
      width={isMobile ? '94vw' : 720}
      okText={editingAutomationTask ? '保存' : '创建'}
      onCancel={() => {
        setEditingAutomationTask(null);
        setCreatingAutomationTask(false);
        setAutomationTaskDraft({
          name: '',
          description: '',
          frequency: 'daily',
          run_time: '09:00',
          cron_expression: '0 9 * * *',
          monitor_metrics: '',
          dimension: '',
          notify_on_failure: true,
          notify_on_success: false,
          alert_targets: '',
        });
      }}
      onOk={() => {
        if (editingAutomationTask) {
          handleUpdateAutomationTask();
        } else {
          handleCreateAutomationTask();
        }
      }}
      centered
      destroyOnHidden
    >
      <div style={{ paddingTop: 8, display: 'grid', gap: 14 }}>
        <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
          <span style={{ color: '#374151', fontWeight: 600 }}>任务名称</span>
          <input
            value={automationTaskDraft.name}
            onChange={(event) => setAutomationTaskDraft((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="例如：每日投放日报"
            style={{ width: '100%', height: 38, borderRadius: 10, border: '1px solid #dbe4f0', padding: '0 12px', fontSize: 13 }}
          />
        </label>
        <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
          <span style={{ color: '#374151', fontWeight: 600 }}>任务描述</span>
          <textarea
            value={automationTaskDraft.description}
            onChange={(event) => setAutomationTaskDraft((prev) => ({ ...prev, description: event.target.value }))}
            placeholder="说明这个任务的目的和范围"
            rows={3}
            style={{ width: '100%', borderRadius: 10, border: '1px solid #dbe4f0', padding: '8px 12px', fontSize: 13, resize: 'vertical' }}
          />
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
          <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
            <span style={{ color: '#374151', fontWeight: 600 }}>执行频率</span>
            <select
              value={automationTaskDraft.frequency}
              onChange={(event) => {
                const frequency = event.target.value as AutomationTaskDraft['frequency'];
                const cron = frequency === 'daily' ? '0 9 * * *' : frequency === 'weekly' ? '0 9 * * 1' : automationTaskDraft.cron_expression;
                setAutomationTaskDraft((prev) => ({ ...prev, frequency, cron_expression: cron }));
              }}
              style={{ width: '100%', height: 38, borderRadius: 10, border: '1px solid #dbe4f0', padding: '0 12px', fontSize: 13 }}
            >
              <option value="daily">每天</option>
              <option value="weekly">每周</option>
              <option value="monthly">每月</option>
              <option value="custom_cron">自定义</option>
            </select>
          </label>
          <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
            <span style={{ color: '#374151', fontWeight: 600 }}>执行时间</span>
            <input
              type="time"
              value={automationTaskDraft.run_time}
              onChange={(event) => {
                const [hour, minute] = event.target.value.split(':');
                const cron = automationTaskDraft.frequency === 'daily' ? `${minute} ${hour} * * *` : automationTaskDraft.frequency === 'weekly' ? `${minute} ${hour} * * 1` : automationTaskDraft.cron_expression;
                setAutomationTaskDraft((prev) => ({ ...prev, run_time: event.target.value, cron_expression: cron }));
              }}
              style={{ width: '100%', height: 38, borderRadius: 10, border: '1px solid #dbe4f0', padding: '0 12px', fontSize: 13 }}
            />
          </label>
        </div>
        <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
          <span style={{ color: '#374151', fontWeight: 600 }}>监控指标</span>
          <Select
            mode="tags"
            value={splitAutomationList(automationTaskDraft.monitor_metrics)}
            onChange={(values) => setAutomationTaskDraft((prev) => ({ ...prev, monitor_metrics: joinAutomationList(values as string[]) }))}
            tokenSeparators={[',', '，', '、', '\n']}
            placeholder="例如：消耗、激活、ROI"
            style={{ width: '100%' }}
          />
        </label>
        <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
          <span style={{ color: '#374151', fontWeight: 600 }}>分析维度</span>
          <Select
            mode="tags"
            value={splitAutomationList(automationTaskDraft.dimension)}
            onChange={(values) => setAutomationTaskDraft((prev) => ({ ...prev, dimension: joinAutomationList(values as string[]) }))}
            tokenSeparators={[',', '，', '、', '\n']}
            placeholder="例如：媒体、账户"
            style={{ width: '100%' }}
          />
        </label>
        <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
          <span style={{ color: '#374151', fontWeight: 600 }}>提醒对象（邮箱/姓名）</span>
          <Select
            mode="tags"
            value={splitAutomationList(automationTaskDraft.alert_targets)}
            onChange={(values) => setAutomationTaskDraft((prev) => ({ ...prev, alert_targets: joinAutomationList(values as string[]) }))}
            tokenSeparators={[',', '，', '、', '\n']}
            placeholder="默认提醒我，也可以输入同事姓名或邮箱"
            style={{ width: '100%' }}
          />
        </label>
      </div>
    </Modal>
  );

  return (
    <>
      {renderAutomationRunModal()}
      {renderAutomationTaskEditModal()}
    </>
  );
}

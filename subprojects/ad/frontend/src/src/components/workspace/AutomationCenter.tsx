'use client';

import { BarChart3, CalendarClock, Clock3, FileSpreadsheet, Play } from 'lucide-react';
import type { AutomationRunRecord, AutomationTemplate, AutomationTab } from '@/lib/page-helpers';
import type { ScheduledTask } from '@/types';
import { AUTOMATION_TABS, LoadingSkeletonRows } from '@/lib/page-helpers';

type ThemeColors = {
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
};

type AutomationCenterProps = {
  isMobile: boolean;
  pageSidePadding: number;
  themeColors: ThemeColors;
  automationTab: AutomationTab;
  setAutomationTab: (tab: AutomationTab) => void;
  automationLoading: boolean;
  automationReportTasks: ScheduledTask[];
  automationRunRecords: AutomationRunRecord[];
  availableAutomationTemplates: AutomationTemplate[];
  setOpenedAutomationRun: (run: AutomationRunRecord | null) => void;
  handleRunAutomationTask: (task: ScheduledTask) => void;
  handleResumeAutomationTask: (task: ScheduledTask) => void;
  handlePauseAutomationTask: (task: ScheduledTask) => void;
  handleEditAutomationTask: (task: ScheduledTask) => void;
  handleOpenAutomationCreateFromResult: () => void;
  handleCreateAutomationInChat: () => void;
  handleOpenManualAutomationCreate: () => void;
  handleOpenAutomationTemplate: (template: AutomationTemplate) => void;
};

export function AutomationCenter(props: AutomationCenterProps) {
  const {
    isMobile,
    pageSidePadding,
    themeColors: c,
    automationTab,
    setAutomationTab,
    automationLoading,
    automationReportTasks,
    automationRunRecords,
    availableAutomationTemplates,
    setOpenedAutomationRun,
    handleRunAutomationTask,
    handleResumeAutomationTask,
    handlePauseAutomationTask,
    handleEditAutomationTask,
    handleOpenAutomationCreateFromResult,
    handleCreateAutomationInChat,
    handleOpenManualAutomationCreate,
    handleOpenAutomationTemplate,
  } = props;

  const renderStatus = (status: ScheduledTask['status']) => {
    const map: Record<ScheduledTask['status'], { text: string; color: string; bg: string }> = {
      active: { text: '运行中', color: '#1677ff', bg: '#eaf2ff' },
      paused: { text: '已暂停', color: '#b7791f', bg: '#fff7e6' },
      running: { text: '执行中', color: '#2563eb', bg: '#dbeafe' },
      completed: { text: '已完成', color: '#047857', bg: '#d1fae5' },
      failed: { text: '失败', color: '#b42318', bg: '#fee4e2' },
      disabled: { text: '已停用', color: '#667085', bg: '#f2f4f7' },
    };
    return map[status] || map.active;
  };

  const renderTaskCard = (task: ScheduledTask) => {
    const status = renderStatus(task.status);
    return (
      <div
        key={task.id}
        role="button"
        tabIndex={0}
        onClick={() => {
          const firstRun = task.recent_executions[0];
          if (firstRun) setOpenedAutomationRun({ id: `${task.id}-${firstRun.id}`, task, execution: firstRun });
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            const firstRun = task.recent_executions[0];
            if (firstRun) setOpenedAutomationRun({ id: `${task.id}-${firstRun.id}`, task, execution: firstRun });
          }
        }}
        style={{
          width: '100%',
          border: 'none',
          borderRadius: 12,
          background: '#fff',
          padding: '14px 16px',
          textAlign: 'left',
          cursor: 'pointer',
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'minmax(0,1fr) 104px 120px 92px 178px',
          gap: 10,
          alignItems: 'center',
          boxShadow: '0 1px 0 rgba(15,23,42,0.04)',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <FileSpreadsheet size={16} color="#3f6fff" />
            <span style={{ fontSize: 14, fontWeight: 600, color: c.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.name}</span>
          </div>
          <div style={{ marginTop: 5, fontSize: 12, color: c.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {task.description || '自动生成报表并保留运行记录。'}
          </div>
        </div>
        <span style={{ justifySelf: isMobile ? 'start' : 'end', fontSize: 12, color: c.textMuted }}>{task.cron_expression || task.frequency}</span>
        <span style={{ justifySelf: isMobile ? 'start' : 'end', fontSize: 12, color: c.textMuted }}>{task.last_run_at ? new Date(task.last_run_at).toLocaleDateString('zh-CN') : '未运行'}</span>
        <span style={{ justifySelf: isMobile ? 'start' : 'end', borderRadius: 999, padding: '4px 9px', background: status.bg, color: status.color, fontSize: 12 }}>{status.text}</span>
        <span style={{ justifySelf: isMobile ? 'start' : 'end', display: 'inline-flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              void handleRunAutomationTask(task);
            }}
            style={{ height: 28, border: 'none', borderRadius: 9, background: '#111827', color: '#fff', padding: '0 10px', fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
          >
            <Play size={13} />
            运行
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              void (['paused', 'disabled', 'failed', 'completed'].includes(task.status) ? handleResumeAutomationTask(task) : handlePauseAutomationTask(task));
            }}
            style={{ height: 28, border: 'none', borderRadius: 9, background: '#eef4ff', color: '#2563eb', padding: '0 9px', fontSize: 12, cursor: 'pointer' }}
          >
            {['paused', 'disabled', 'failed', 'completed'].includes(task.status) ? '开启' : '暂停'}
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              handleEditAutomationTask(task);
            }}
            style={{ height: 28, border: 'none', borderRadius: 9, background: '#f3f4f6', color: c.textSecondary, padding: '0 9px', fontSize: 12, cursor: 'pointer' }}
          >
            修改
          </button>
        </span>
      </div>
    );
  };

  const renderRunRecord = (record: AutomationRunRecord) => (
    <button
      key={record.id}
      type="button"
      onClick={() => setOpenedAutomationRun(record)}
      style={{
        width: '100%',
        border: 'none',
        borderRadius: 12,
        background: '#fff',
        padding: '13px 16px',
        textAlign: 'left',
        cursor: 'pointer',
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'minmax(0,1fr) 150px 80px',
        gap: 10,
        alignItems: 'center',
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: c.textPrimary }}>{record.task.name}</div>
        <div style={{ marginTop: 5, fontSize: 12, color: c.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{record.execution.result_summary}</div>
      </div>
      <span style={{ fontSize: 12, color: c.textMuted }}>{new Date(record.execution.started_at).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
      <span style={{ justifySelf: isMobile ? 'start' : 'end', color: ['success', 'succeeded'].includes(record.execution.status) ? '#047857' : record.execution.status === 'partial_succeeded' ? '#b7791f' : '#b42318', fontSize: 12 }}>
        {['success', 'succeeded'].includes(record.execution.status) ? '成功' : record.execution.status === 'partial_succeeded' ? '部分完成' : '失败'}
      </span>
    </button>
  );

  return (
    <div style={{ width: '100%', maxWidth: 1120, margin: '0 auto', padding: `0 ${pageSidePadding}px ${isMobile ? 12 : 18}px`, minHeight: 0 }}>
      <section style={{ display: 'flex', minHeight: 0, height: '100%', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, paddingBottom: 18 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: isMobile ? 22 : 26, lineHeight: 1.2, color: c.textPrimary }}>自动任务</h1>
            <p style={{ margin: '8px 0 0', color: c.textSecondary, fontSize: 13 }}>管理定时报表、拼表和分析任务。</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button type="button" onClick={handleOpenAutomationCreateFromResult} style={{ height: 34, border: 'none', borderRadius: 10, background: '#eef4ff', color: '#2563eb', padding: '0 12px', fontSize: 12, cursor: 'pointer' }}>用本次结果创建</button>
            <button type="button" onClick={handleCreateAutomationInChat} style={{ height: 34, border: 'none', borderRadius: 10, background: '#111827', color: '#fff', padding: '0 12px', fontSize: 12, cursor: 'pointer' }}>在对话中创建</button>
            <button type="button" onClick={handleOpenManualAutomationCreate} style={{ height: 34, border: 'none', borderRadius: 10, background: '#fff', color: c.textSecondary, padding: '0 12px', fontSize: 12, cursor: 'pointer' }}>手动新建</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, borderBottom: '1px solid #e5e7eb', marginBottom: 16 }}>
          {AUTOMATION_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setAutomationTab(tab.key)}
              style={{
                height: 36,
                border: 'none',
                borderBottom: automationTab === tab.key ? '2px solid #111827' : '2px solid transparent',
                background: 'transparent',
                color: automationTab === tab.key ? c.textPrimary : c.textSecondary,
                fontSize: 13,
                fontWeight: automationTab === tab.key ? 650 : 500,
                padding: '0 10px',
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: 2 }}>
          {automationTab === 'configured' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {automationLoading ? (
                <div data-automation-loading style={{ display: 'grid', gap: 12 }}>
                  <div style={{ fontSize: 12, color: c.textMuted }}>正在读取自动任务...</div>
                  <LoadingSkeletonRows rows={4} minHeight={300} />
                </div>
              ) : automationReportTasks.length > 0 ? (
                automationReportTasks.map(renderTaskCard)
              ) : (
                <div style={{ minHeight: 360, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: c.textMuted, fontSize: 13 }}>
                  <Clock3 size={22} color="#9ca3af" />
                  <div style={{ marginTop: 12 }}>尚未配置自动任务。</div>
                  <button type="button" onClick={() => setAutomationTab('templates')} style={{ marginTop: 18, height: 34, borderRadius: 10, border: 'none', background: '#111827', color: '#fff', padding: '0 14px', fontSize: 13, cursor: 'pointer' }}>从模板创建</button>
                </div>
              )}
            </div>
          )}

          {automationTab === 'runs' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {automationRunRecords.length > 0 ? automationRunRecords.map(renderRunRecord) : (
                <div style={{ padding: 40, textAlign: 'center', color: c.textMuted, fontSize: 13 }}>暂无运行记录。</div>
              )}
            </div>
          )}

          {automationTab === 'templates' && (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 14 }}>
              {availableAutomationTemplates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => handleOpenAutomationTemplate(template)}
                  style={{ border: 'none', borderRadius: 14, background: '#fff', padding: 18, textAlign: 'left', cursor: 'pointer', minHeight: 156 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#eef4ff', color: '#3f6fff' }}>
                      {template.id === 'traffic-classification' ? <BarChart3 size={19} /> : <CalendarClock size={19} />}
                    </div>
                    <span style={{ borderRadius: 999, background: '#f3f4f6', color: c.textSecondary, padding: '4px 9px', fontSize: 11 }}>{template.typeLabel}</span>
                  </div>
                  <div style={{ marginTop: 16, fontSize: 15, fontWeight: 700, color: c.textPrimary }}>{template.title}</div>
                  <div style={{ marginTop: 7, fontSize: 12, lineHeight: 1.6, color: c.textSecondary }}>{template.description}</div>
                  <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {[template.cadence, ...template.dimensions.slice(0, 2)].map((item) => (
                      <span key={item} style={{ borderRadius: 999, background: '#f8fafc', color: c.textMuted, padding: '3px 8px', fontSize: 11 }}>{item}</span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

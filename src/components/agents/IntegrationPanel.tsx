'use client';

import { useState, useCallback } from 'react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Button } from '@/components/ui/button';
import type { DebugAutomationTask, DebugExecutionStep, DebugExecutionResult } from '@/types';
import {
  MOCK_DEBUG_TASK, MOCK_DEBUG_STEPS, MOCK_DEBUG_RESULT, MOCK_DEBUG_LOGS,
  DEBUG_STAGE_DEFINITIONS, DEBUG_CAPABILITY_BOUNDARIES, DEBUG_COMMON_EXCEPTIONS,
} from '@/lib/constants';
import {
  Play, Pause, RotateCcw, AlertTriangle, ChevronRight, ChevronDown,
  Smartphone, Globe, Monitor, Zap, Shield, Eye, Terminal,
  CheckCircle2, Clock, Loader2, FileText, Camera, Image as ImageIcon,
  Send, Info, XCircle, RefreshCw, MoreHorizontal, ExternalLink,
} from 'lucide-react';

// ==========================================
// Local Types
// ==========================================

type StageStatus = 'completed' | 'running' | 'pending' | 'failed';
type ViewMode = 'initiation' | 'workspace';

interface TaskInitFormData {
  media: string;
  debug_type: string;
  account: string;
  app_name: string;
  package_name: string;
  device_id: string;
  environment: string;
  current_blocker: string;
}

// ==========================================
// Stage Metadata
// ==========================================

const stageStatusMap: Record<string, DebugAutomationTask['status']> = {
  web_prepare: 'running_web_prepare',
  mobile_scan: 'running_mobile_scan',
  mobile_find_ad: 'running_mobile_find_ad',
  mobile_launch: 'running_mobile_launch',
  success_poll: 'running_success_poll',
};

const statusLabelMap: Record<string, string> = {
  created: '已创建',
  waiting_confirm: '等待确认',
  running_web_prepare: 'Web准备中',
  running_mobile_scan: '移动端扫码中',
  running_mobile_find_ad: '查找广告中',
  running_mobile_launch: '启动应用中',
  running_success_poll: '成功轮询中',
  success: '联调成功',
  failed: '联调失败',
  manual_takeover: '人工接管',
};

// ==========================================
// Sub-Components
// ==========================================

/** Task Initiation Form (设计图 §1) */
function TaskInitiationForm({ onSubmit }: { onSubmit: (data: TaskInitFormData) => void }) {
  const [form, setForm] = useState<TaskInitFormData>({
    media: '巨量/抖音',
    debug_type: '扫码联调',
    account: '',
    app_name: '',
    package_name: '',
    device_id: '',
    environment: '预发布',
    current_blocker: '',
  });

  const handleChange = (field: keyof TaskInitFormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const fields: { key: keyof TaskInitFormData; label: string; placeholder: string; required?: boolean; type?: string }[] = [
    { key: 'media', label: '媒体', placeholder: '如：巨量/抖音', required: true },
    { key: 'debug_type', label: '联调类型', placeholder: '如：扫码联调', required: true },
    { key: 'account', label: '账号', placeholder: '投放账号' },
    { key: 'app_name', label: '应用/包体', placeholder: '包名/版本' },
    { key: 'package_name', label: '包名', placeholder: 'com.xx.game' },
    { key: 'device_id', label: '测试设备', placeholder: '设备编号' },
    { key: 'environment', label: '环境', placeholder: '如：预发布' },
    { key: 'current_blocker', label: '当前卡点', placeholder: '描述问题卡点', type: 'textarea' },
  ];

  return (
    <div className="space-y-6">
      {/* Steps */}
      <GlassPanel className="p-5">
        <h3 className="text-sm font-semibold text-[var(--aifs-text-primary)] mb-4">专项任务入口</h3>
        <div className="space-y-3">
          {[
            { step: 1, text: '用户提交联调问题' },
            { step: 2, text: '小乔识别为"自动联调专项"' },
            { step: 3, text: '创建联调任务' },
            { step: 4, text: '确认关键输入' },
            { step: 5, text: '启动执行' },
          ].map(item => (
            <div key={item.step} className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-[var(--aifs-success)]/20 text-[var(--aifs-success)] flex items-center justify-center text-xs font-bold shrink-0">
                {item.step}
              </div>
              <span className="text-sm text-[var(--aifs-text-secondary)]">{item.text}</span>
            </div>
          ))}
        </div>
      </GlassPanel>

      {/* Form */}
      <GlassPanel className="p-5">
        <h3 className="text-sm font-semibold text-[var(--aifs-text-primary)] mb-4">关键输入</h3>
        <div className="grid grid-cols-2 gap-4">
          {fields.map(field => (
            <div key={field.key} className={field.type === 'textarea' ? 'col-span-2' : ''}>
              <label className="block text-xs text-[var(--aifs-text-muted)] mb-1.5">
                {field.label}
                {field.required && <span className="text-[var(--aifs-danger)] ml-0.5">*</span>}
              </label>
              {field.type === 'textarea' ? (
                <textarea
                  value={form[field.key]}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-[rgba(255,255,255,0.08)] text-sm text-[var(--aifs-text-primary)] placeholder:text-[var(--aifs-text-muted)] focus:outline-none focus:border-[var(--aifs-accent)]/40 transition-colors resize-none"
                />
              ) : (
                <input
                  type="text"
                  value={form[field.key]}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-[rgba(255,255,255,0.08)] text-sm text-[var(--aifs-text-primary)] placeholder:text-[var(--aifs-text-muted)] focus:outline-none focus:border-[var(--aifs-accent)]/40 transition-colors"
                />
              )}
            </div>
          ))}
        </div>
        <div className="mt-5 flex justify-end">
          <Button
            onClick={() => onSubmit(form)}
            className="gap-2 bg-[var(--aifs-accent)] hover:bg-[var(--aifs-accent)]/80 text-white"
          >
            <Send className="w-4 h-4" />
            提交联调任务
          </Button>
        </div>
      </GlassPanel>
    </div>
  );
}

/** Task Status Bar (设计图 §2 - 状态条) */
function TaskStatusBar({ task }: { task: DebugAutomationTask }) {
  const statusColor = task.status.startsWith('running') ? 'text-[var(--aifs-success)] bg-[var(--aifs-success)]/10'
    : task.status === 'success' ? 'text-[var(--aifs-success)] bg-[var(--aifs-success)]/10'
    : task.status === 'failed' ? 'text-[var(--aifs-danger)] bg-[var(--aifs-danger)]/10'
    : task.status === 'manual_takeover' ? 'text-[var(--aifs-warning,#FFB800)] bg-[var(--aifs-warning,#FFB800)]/10'
    : 'text-[var(--aifs-text-muted)] bg-white/5';

  return (
    <GlassPanel className="p-4">
      <div className="flex items-center flex-wrap gap-x-6 gap-y-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-[var(--aifs-text-muted)]">任务编号</span>
          <span className="text-[var(--aifs-text-primary)] font-mono font-medium">{task.id}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[var(--aifs-text-muted)]">媒体</span>
          <span className="text-[var(--aifs-text-primary)]">{task.media}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[var(--aifs-text-muted)]">应用</span>
          <span className="text-[var(--aifs-text-primary)] font-mono">{task.app_name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[var(--aifs-text-muted)]">环境</span>
          <span className="text-[var(--aifs-text-primary)]">{task.environment}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[var(--aifs-text-muted)]">当前状态</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
            {statusLabelMap[task.status] || task.status}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[var(--aifs-text-muted)]">需人工接管</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
            task.status === 'manual_takeover'
              ? 'text-[var(--aifs-warning,#FFB800)] bg-[var(--aifs-warning,#FFB800)]/10'
              : 'text-[var(--aifs-success)] bg-[var(--aifs-success)]/10'
          }`}>
            {task.status === 'manual_takeover' ? '是' : '否'}
          </span>
        </div>
      </div>
    </GlassPanel>
  );
}

/** Stage Timeline (设计图 §2 - 阶段时间线) */
function StageTimeline({ task, steps }: { task: DebugAutomationTask; steps: DebugExecutionStep[] }) {
  const getStageStatus = (stageId: string): StageStatus => {
    const statusValue = stageStatusMap[stageId];
    if (!statusValue) return 'pending';
    const stageSteps = steps.filter(s => s.stage === stageId);
    if (stageSteps.length === 0) return 'pending';
    if (stageSteps.every(s => s.status === 'success')) return 'completed';
    if (stageSteps.some(s => s.status === 'failed')) return 'failed';
    if (task.status === statusValue) return 'running';
    if (task.status === 'success') return 'completed';
    // Check if this stage comes before the current running stage
    const currentIdx = DEBUG_STAGE_DEFINITIONS.findIndex(d => d.id === Object.keys(stageStatusMap).find(k => stageStatusMap[k] === task.status));
    const thisIdx = DEBUG_STAGE_DEFINITIONS.findIndex(d => d.id === stageId);
    if (thisIdx < currentIdx) return 'completed';
    return 'pending';
  };

  const getStageTimestamp = (stageId: string): string | null => {
    const stageSteps = steps.filter(s => s.stage === stageId);
    const firstStep = stageSteps.find(s => s.started_at);
    if (firstStep?.started_at) {
      return new Date(firstStep.started_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
    return null;
  };

  const stageStatusIcon = (status: StageStatus) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-[var(--aifs-success)]" />;
      case 'running': return <Loader2 className="w-4 h-4 text-[var(--aifs-accent)] animate-spin" />;
      case 'failed': return <AlertTriangle className="w-4 h-4 text-[var(--aifs-danger)]" />;
      default: return <div className="w-4 h-4 rounded-full border border-[var(--aifs-text-muted)]/30" />;
    }
  };

  return (
    <GlassPanel className="p-4">
      <h4 className="text-xs text-[var(--aifs-text-muted)] mb-3 uppercase tracking-wider">联调标准流程</h4>
      <div className="flex items-center gap-1">
        {DEBUG_STAGE_DEFINITIONS.map((stage, idx) => {
          const status = getStageStatus(stage.id);
          const timestamp = getStageTimestamp(stage.id);
          return (
            <div key={stage.id} className="flex items-center gap-1 flex-1">
              <div className={`flex flex-col items-center gap-1.5 px-2 py-2 rounded-lg transition-all min-w-0 flex-1 ${
                status === 'completed' ? 'bg-[var(--aifs-success)]/5' :
                status === 'running' ? 'bg-[var(--aifs-accent)]/10 animate-pulse' :
                status === 'failed' ? 'bg-[var(--aifs-danger)]/5' :
                'bg-white/3'
              }`}>
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs font-bold ${
                    status === 'completed' ? 'text-[var(--aifs-success)]' :
                    status === 'running' ? 'text-[var(--aifs-accent)]' :
                    status === 'failed' ? 'text-[var(--aifs-danger)]' :
                    'text-[var(--aifs-text-muted)]'
                  }`}>{stage.order}</span>
                  {stageStatusIcon(status)}
                </div>
                <span className={`text-[11px] font-medium truncate ${
                  status === 'completed' ? 'text-[var(--aifs-success)]' :
                  status === 'running' ? 'text-[var(--aifs-accent)]' :
                  status === 'failed' ? 'text-[var(--aifs-danger)]' :
                  'text-[var(--aifs-text-muted)]'
                }`}>
                  {stage.label}
                </span>
                {timestamp && (
                  <span className="text-[10px] text-[var(--aifs-text-muted)]">{timestamp}</span>
                )}
              </div>
              {idx < DEBUG_STAGE_DEFINITIONS.length - 1 && (
                <ChevronRight className="w-3.5 h-3.5 text-[var(--aifs-text-muted)]/30 shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </GlassPanel>
  );
}

/** Execution Details (设计图 §2 - 执行详情) */
function ExecutionDetails({ task, steps, logs }: { task: DebugAutomationTask; steps: DebugExecutionStep[]; logs: typeof MOCK_DEBUG_LOGS }) {
  const currentStep = steps.find(s => s.status === 'running') || steps[steps.length - 1];

  return (
    <GlassPanel className="p-4">
      <h4 className="text-xs text-[var(--aifs-text-muted)] mb-3 uppercase tracking-wider">执行详情</h4>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-[10px] text-[var(--aifs-text-muted)] mb-1">当前阶段</div>
            <div className="text-sm text-[var(--aifs-text-primary)] font-medium">{task.current_stage}</div>
          </div>
          <div>
            <div className="text-[10px] text-[var(--aifs-text-muted)] mb-1">当前步骤</div>
            <div className="text-sm text-[var(--aifs-accent)] font-medium">{task.current_step}</div>
          </div>
        </div>

        {currentStep && (
          <div className="p-3 rounded-lg bg-[var(--aifs-accent)]/5 border border-[var(--aifs-accent)]/10">
            <div className="text-[10px] text-[var(--aifs-accent)] mb-1">步骤说明</div>
            <div className="text-xs text-[var(--aifs-text-secondary)] leading-relaxed">
              {currentStep.log_summary || '等待执行...'}
            </div>
          </div>
        )}

        {/* Recent Logs */}
        <div>
          <div className="text-[10px] text-[var(--aifs-text-muted)] mb-2">最近日志摘要</div>
          <div className="bg-black/20 rounded-lg p-3 font-mono text-[11px] space-y-1.5 max-h-32 overflow-y-auto">
            {logs.map((log, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-[var(--aifs-text-muted)]">[{log.timestamp}]</span>
                <span className="text-[var(--aifs-text-secondary)]">{log.action}</span>
                <span className={`text-xs ${
                  log.status === 'success' ? 'text-[var(--aifs-success)]' :
                  log.status === 'running' ? 'text-[var(--aifs-accent)]' :
                  'text-[var(--aifs-danger)]'
                }`}>
                  {log.status === 'success' ? '成功' : log.status === 'running' ? '...' : '失败'}
                </span>
              </div>
            ))}
          </div>
          <button className="text-[11px] text-[var(--aifs-accent)] hover:underline mt-1.5">
            查看完整日志
          </button>
        </div>
      </div>
    </GlassPanel>
  );
}

/** Evidence Area (设计图 §2 - 证报区) */
function EvidenceArea({ steps }: { steps: DebugExecutionStep[] }) {
  const screenshots = steps.filter(s => s.screenshot_url);
  const qrcodeStep = steps.find(s => s.step_name === '生成二维码');

  return (
    <GlassPanel className="p-4">
      <h4 className="text-xs text-[var(--aifs-text-muted)] mb-3 uppercase tracking-wider">最近证据</h4>
      <div className="grid grid-cols-3 gap-3">
        {/* Web Page Screenshot */}
        <div className="rounded-lg bg-white/3 border border-[rgba(255,255,255,0.06)] overflow-hidden">
          <div className="px-2.5 py-1.5 border-b border-[rgba(255,255,255,0.06)] flex items-center gap-1.5">
            <Globe className="w-3 h-3 text-[var(--aifs-accent)]" />
            <span className="text-[10px] text-[var(--aifs-text-muted)]">Web页面截图</span>
          </div>
          <div className="aspect-video bg-black/20 flex items-center justify-center">
            {screenshots.length > 0 ? (
              <div className="text-center">
                <Camera className="w-6 h-6 text-[var(--aifs-text-muted)]/40 mx-auto mb-1" />
                <span className="text-[10px] text-[var(--aifs-text-muted)]">Web截图</span>
              </div>
            ) : (
              <span className="text-[10px] text-[var(--aifs-text-muted)]">暂无截图</span>
            )}
          </div>
        </div>

        {/* QR Code Artifact */}
        <div className="rounded-lg bg-white/3 border border-[rgba(255,255,255,0.06)] overflow-hidden">
          <div className="px-2.5 py-1.5 border-b border-[rgba(255,255,255,0.06)] flex items-center gap-1.5">
            <ImageIcon className="w-3 h-3 text-[var(--aifs-success)]" />
            <span className="text-[10px] text-[var(--aifs-text-muted)]">二维码产物</span>
          </div>
          <div className="aspect-video bg-black/20 flex items-center justify-center">
            {qrcodeStep ? (
              <div className="text-center">
                <div className="w-12 h-12 border-2 border-dashed border-[var(--aifs-success)]/30 rounded-lg flex items-center justify-center mx-auto mb-1">
                  <ImageIcon className="w-5 h-5 text-[var(--aifs-success)]/40" />
                </div>
                <span className="text-[10px] text-[var(--aifs-success)]">已生成</span>
              </div>
            ) : (
              <span className="text-[10px] text-[var(--aifs-text-muted)]">暂未生成</span>
            )}
          </div>
        </div>

        {/* Device Screenshot */}
        <div className="rounded-lg bg-white/3 border border-[rgba(255,255,255,0.06)] overflow-hidden">
          <div className="px-2.5 py-1.5 border-b border-[rgba(255,255,255,0.06)] flex items-center gap-1.5">
            <Smartphone className="w-3 h-3 text-[var(--aifs-warning,#FFB800)]" />
            <span className="text-[10px] text-[var(--aifs-text-muted)]">设备截图(实时)</span>
          </div>
          <div className="aspect-video bg-black/20 flex items-center justify-center">
            <div className="text-center">
              <Monitor className="w-6 h-6 text-[var(--aifs-text-muted)]/40 mx-auto mb-1" />
              <span className="text-[10px] text-[var(--aifs-text-muted)]">设备实时画面</span>
            </div>
          </div>
        </div>
      </div>
    </GlassPanel>
  );
}

/** Result Area (设计图 §2 - 结果区) */
function ResultArea({ result }: { result: DebugExecutionResult }) {
  const isComplete = result.success || !!result.failure_code;

  return (
    <GlassPanel className="p-4">
      <h4 className="text-xs text-[var(--aifs-text-muted)] mb-3 uppercase tracking-wider">
        {isComplete ? '最终结果' : '当前结果'}
      </h4>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-[10px] text-[var(--aifs-text-muted)] mb-1">成功判断</div>
            {result.success ? (
              <span className="flex items-center gap-1.5 text-sm text-[var(--aifs-success)] font-medium">
                <CheckCircle2 className="w-4 h-4" /> 联调成功
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-sm text-[var(--aifs-text-muted)]">
                <Clock className="w-4 h-4" /> 执行中
              </span>
            )}
          </div>
          <div>
            <div className="text-[10px] text-[var(--aifs-text-muted)] mb-1">失败原因</div>
            {result.failure_reason ? (
              <span className="text-sm text-[var(--aifs-danger)]">{result.failure_reason}</span>
            ) : (
              <span className="text-sm text-[var(--aifs-text-muted)]">-</span>
            )}
          </div>
        </div>

        {result.final_report_markdown && (
          <div className="p-3 rounded-lg bg-white/3 border border-[rgba(255,255,255,0.06)]">
            <div className="text-[10px] text-[var(--aifs-text-muted)] mb-1">最终报告</div>
            <div className="text-xs text-[var(--aifs-text-secondary)] whitespace-pre-wrap line-clamp-4">
              {result.final_report_markdown}
            </div>
          </div>
        )}

        {result.final_report_url && (
          <Button variant="outline" size="sm" className="gap-2 text-xs">
            <ExternalLink className="w-3.5 h-3.5" />
            查看联调报告 (PDF/HTML)
          </Button>
        )}
      </div>
    </GlassPanel>
  );
}

/** Operation Buttons (设计图 §2 - 操作区) */
function OperationButtons({
  task, onTakeover, onRetry, onReset, onPause, onResume,
}: {
  task: DebugAutomationTask;
  onTakeover: () => void;
  onRetry: () => void;
  onReset: () => void;
  onPause: () => void;
  onResume: () => void;
}) {
  const isRunning = task.status.startsWith('running');
  const isTerminal = task.status === 'success' || task.status === 'failed' || task.status === 'manual_takeover';

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {!isRunning && !isTerminal && (
        <Button size="sm" className="gap-1.5 bg-[var(--aifs-accent)] hover:bg-[var(--aifs-accent)]/80 text-white">
          <Play className="w-3.5 h-3.5" /> 启动
        </Button>
      )}
      {isRunning && (
        <Button size="sm" variant="outline" onClick={onPause} className="gap-1.5 border-[var(--aifs-warning,#FFB800)]/30 text-[var(--aifs-warning,#FFB800)]">
          <Pause className="w-3.5 h-3.5" /> 暂停
        </Button>
      )}
      {task.status === 'waiting_confirm' && (
        <Button size="sm" onClick={onResume} className="gap-1.5 bg-[var(--aifs-success)]/80 hover:bg-[var(--aifs-success)]/60 text-white">
          <Play className="w-3.5 h-3.5" /> 恢复
        </Button>
      )}
      {(isTerminal || task.status === 'failed') && (
        <Button size="sm" variant="outline" onClick={onRetry} className="gap-1.5">
          <RotateCcw className="w-3.5 h-3.5" /> 重试当前阶段
        </Button>
      )}
      {isRunning && (
        <Button size="sm" variant="outline" onClick={onTakeover} className="gap-1.5 border-[var(--aifs-danger)]/30 text-[var(--aifs-danger)]">
          <AlertTriangle className="w-3.5 h-3.5" /> 人工接管
        </Button>
      )}
      <Button size="sm" variant="ghost" onClick={onReset} className="gap-1.5 text-[var(--aifs-text-muted)]">
        <RotateCcw className="w-3.5 h-3.5" /> 重置
      </Button>
      <Button size="sm" variant="ghost" className="gap-1.5 text-[var(--aifs-text-muted)]">
        <MoreHorizontal className="w-3.5 h-3.5" /> 更多操作
      </Button>
    </div>
  );
}

/** Capability Boundaries (设计图 §4) */
function CapabilityBoundaries() {
  const [expanded, setExpanded] = useState(false);

  const iconMap: Record<string, React.ReactNode> = {
    globe: <Globe className="w-5 h-5 text-[var(--aifs-accent)]" />,
    smartphone: <Smartphone className="w-5 h-5 text-[var(--aifs-success)]" />,
    eye: <Eye className="w-5 h-5 text-[var(--aifs-warning,#FFB800)]" />,
    terminal: <Terminal className="w-5 h-5 text-[#A78BFA]" />,
    refresh: <RefreshCw className="w-5 h-5 text-[#F472B6]" />,
  };

  return (
    <GlassPanel className="p-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-[var(--aifs-accent)]" />
          <h4 className="text-xs text-[var(--aifs-text-muted)] uppercase tracking-wider">执行能力边界</h4>
        </div>
        {expanded ? <ChevronDown className="w-4 h-4 text-[var(--aifs-text-muted)]" /> : <ChevronRight className="w-4 h-4 text-[var(--aifs-text-muted)]" />}
      </button>
      {expanded && (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {DEBUG_CAPABILITY_BOUNDARIES.map(cap => (
            <div key={cap.id} className="p-3 rounded-lg bg-white/3 border border-[rgba(255,255,255,0.06)] text-center">
              <div className="flex justify-center mb-2">{iconMap[cap.icon]}</div>
              <div className="text-[11px] font-medium text-[var(--aifs-text-primary)] mb-1">{cap.name}</div>
              <div className="text-[10px] text-[var(--aifs-text-muted)] leading-snug">{cap.description}</div>
            </div>
          ))}
        </div>
      )}
      {expanded && (
        <div className="mt-2 text-[10px] text-[var(--aifs-text-muted)] italic text-center">
          以上为专项能力位, 不限定唯一技术实现方案, 可替换、可扩展
        </div>
      )}
    </GlassPanel>
  );
}

/** Exception Handling (设计图 §5) */
function ExceptionHandling({ onTakeover }: { onTakeover: () => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <GlassPanel className="p-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-[var(--aifs-warning,#FFB800)]" />
          <h4 className="text-xs text-[var(--aifs-text-muted)] uppercase tracking-wider">人工接管与异常处理</h4>
        </div>
        {expanded ? <ChevronDown className="w-4 h-4 text-[var(--aifs-text-muted)]" /> : <ChevronRight className="w-4 h-4 text-[var(--aifs-text-muted)]" />}
      </button>
      {expanded && (
        <div className="mt-3 space-y-4">
          {/* Takeover Flow */}
          <div>
            <div className="text-[10px] text-[var(--aifs-text-muted)] mb-2">接管后流程</div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {['人工接管', '查看当前证据与日志', '手动完成修复步骤', '继续执行后续阶段', '生成最终报告'].map((step, idx) => (
                <div key={idx} className="flex items-center gap-1.5">
                  <span className="px-2 py-1 rounded bg-[var(--aifs-warning,#FFB800)]/10 text-[10px] text-[var(--aifs-warning,#FFB800)]">{step}</span>
                  {idx < 4 && <ChevronRight className="w-3 h-3 text-[var(--aifs-text-muted)]/30" />}
                </div>
              ))}
            </div>
          </div>

          {/* Common Exceptions */}
          <div>
            <div className="text-[10px] text-[var(--aifs-text-muted)] mb-2">常见异常类型</div>
            <div className="grid grid-cols-3 gap-2">
              {DEBUG_COMMON_EXCEPTIONS.map(ex => (
                <div key={ex.id} className="p-2 rounded-lg bg-[var(--aifs-danger)]/5 border border-[var(--aifs-danger)]/10">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <XCircle className="w-3 h-3 text-[var(--aifs-danger)]" />
                    <span className="text-[11px] font-medium text-[var(--aifs-text-primary)]">{ex.name}</span>
                  </div>
                  <div className="text-[10px] text-[var(--aifs-text-muted)]">{ex.description}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Exception Strategy */}
          <div className="p-3 rounded-lg bg-white/3 border border-[rgba(255,255,255,0.06)]">
            <div className="text-[10px] text-[var(--aifs-text-muted)] mb-1">异常提示与回退策略</div>
            <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
              <span className="px-2 py-1 rounded bg-[var(--aifs-accent)]/10 text-[var(--aifs-accent)]">清晰提示失败原因与建议</span>
              <ChevronRight className="w-3 h-3 text-[var(--aifs-text-muted)]/30" />
              <span className="px-2 py-1 rounded bg-[var(--aifs-warning,#FFB800)]/10 text-[var(--aifs-warning,#FFB800)]">支持重试当前阶段/回退到上一步</span>
              <ChevronRight className="w-3 h-3 text-[var(--aifs-text-muted)]/30" />
              <span className="px-2 py-1 rounded bg-[var(--aifs-danger)]/10 text-[var(--aifs-danger)]">必要时建议人工接管</span>
            </div>
          </div>

          <Button size="sm" variant="outline" onClick={onTakeover} className="gap-1.5 border-[var(--aifs-warning,#FFB800)]/30 text-[var(--aifs-warning,#FFB800)]">
            <AlertTriangle className="w-3.5 h-3.5" /> 发起人工接管
          </Button>
        </div>
      )}
    </GlassPanel>
  );
}

/** Evidence & Results (设计图 §6 - 留痕与结果) */
function EvidenceAndResults({ steps, result }: { steps: DebugExecutionStep[]; result: DebugExecutionResult }) {
  const [expanded, setExpanded] = useState(false);

  const items = [
    { icon: <Camera className="w-4 h-4" />, label: '步骤截图', desc: `${steps.filter(s => s.screenshot_url).length} 张` },
    { icon: <AlertTriangle className="w-4 h-4" />, label: '错误截图', desc: `${steps.filter(s => s.status === 'failed' && s.screenshot_url).length} 张` },
    { icon: <ImageIcon className="w-4 h-4" />, label: '二维码等产物', desc: steps.some(s => s.step_name === '生成二维码') ? '1 项' : '0 项' },
    { icon: <FileText className="w-4 h-4" />, label: '执行日志摘要', desc: '可查看' },
    { icon: <XCircle className="w-4 h-4" />, label: '失败原因', desc: result.failure_reason || '无' },
    { icon: <FileText className="w-4 h-4" />, label: '最终联调报告', desc: result.final_report_url ? '可下载' : '待生成' },
  ];

  return (
    <GlassPanel className="p-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-[var(--aifs-accent)]" />
          <h4 className="text-xs text-[var(--aifs-text-muted)] uppercase tracking-wider">留痕与结果</h4>
        </div>
        {expanded ? <ChevronDown className="w-4 h-4 text-[var(--aifs-text-muted)]" /> : <ChevronRight className="w-4 h-4 text-[var(--aifs-text-muted)]" />}
      </button>
      {expanded && (
        <div className="mt-3">
          <div className="grid grid-cols-3 gap-2">
            {items.map((item, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-white/3 border border-[rgba(255,255,255,0.06)] flex items-center gap-2.5">
                <div className="text-[var(--aifs-accent)]">{item.icon}</div>
                <div>
                  <div className="text-[11px] font-medium text-[var(--aifs-text-primary)]">{item.label}</div>
                  <div className="text-[10px] text-[var(--aifs-text-muted)]">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 text-[10px] text-[var(--aifs-text-muted)] italic text-center">
            所有结果物统一关联任务, 支持查看、下载、分享与归档
          </div>
        </div>
      )}
    </GlassPanel>
  );
}

/** State Machine Diagram (设计图 §3 - 状态机) */
function StateMachineDiagram({ currentStatus }: { currentStatus: string }) {
  const states = [
    { id: 'created', label: '已创建', type: 'initial' as const },
    { id: 'waiting_confirm', label: '等待确认', type: 'intermediate' as const },
    { id: 'running_web_prepare', label: 'Web准备', type: 'running' as const },
    { id: 'running_mobile_scan', label: '扫码', type: 'running' as const },
    { id: 'running_mobile_find_ad', label: '找广告', type: 'running' as const },
    { id: 'running_mobile_launch', label: '启动应用', type: 'running' as const },
    { id: 'running_success_poll', label: '成功轮询', type: 'running' as const },
    { id: 'success', label: '成功', type: 'success' as const },
    { id: 'failed', label: '失败', type: 'failed' as const },
    { id: 'manual_takeover', label: '人工接管', type: 'takeover' as const },
  ];

  const getColor = (state: typeof states[0]) => {
    if (state.id === currentStatus) {
      if (state.type === 'success') return 'border-[var(--aifs-success)] bg-[var(--aifs-success)]/10 text-[var(--aifs-success)]';
      if (state.type === 'failed') return 'border-[var(--aifs-danger)] bg-[var(--aifs-danger)]/10 text-[var(--aifs-danger)]';
      if (state.type === 'takeover') return 'border-[var(--aifs-warning,#FFB800)] bg-[var(--aifs-warning,#FFB800)]/10 text-[var(--aifs-warning,#FFB800)]';
      return 'border-[var(--aifs-accent)] bg-[var(--aifs-accent)]/10 text-[var(--aifs-accent)]';
    }
    return 'border-[rgba(255,255,255,0.08)] bg-white/3 text-[var(--aifs-text-muted)]';
  };

  return (
    <GlassPanel className="p-4">
      <h4 className="text-xs text-[var(--aifs-text-muted)] mb-3 uppercase tracking-wider">状态机设计</h4>
      <div className="space-y-2">
        {/* Row 1: created → waiting_confirm → running_* */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {states.slice(0, 7).map((state, idx) => (
            <div key={state.id} className="flex items-center gap-1.5">
              <div className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-medium ${getColor(state)} ${
                state.id === currentStatus ? 'ring-1 ring-offset-1 ring-offset-[var(--aifs-primary,#0A0E1A)]' : ''
              }${state.type === 'running' && state.id === currentStatus ? ' animate-pulse' : ''}`}>
                {state.label}
              </div>
              {idx < 6 && <ChevronRight className="w-3 h-3 text-[var(--aifs-text-muted)]/30 shrink-0" />}
            </div>
          ))}
        </div>
        {/* Row 2: terminal states */}
        <div className="flex items-center gap-3 mt-2 pl-4">
          {states.slice(7).map(state => (
            <div key={state.id} className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-medium ${getColor(state)} ${
              state.id === currentStatus ? 'ring-1 ring-offset-1 ring-offset-[var(--aifs-primary,#0A0E1A)]' : ''
            }`}>
              {state.label}
            </div>
          ))}
          <span className="text-[10px] text-[var(--aifs-text-muted)] italic">← 任意执行中状态均可跳转至人工接管</span>
        </div>
      </div>
    </GlassPanel>
  );
}

// ==========================================
// Main Component
// ==========================================

export function IntegrationPanel() {
  const [viewMode, setViewMode] = useState<ViewMode>('initiation');
  const [task, setTask] = useState<DebugAutomationTask>(MOCK_DEBUG_TASK);
  const [steps, setSteps] = useState<DebugExecutionStep[]>(MOCK_DEBUG_STEPS);
  const [result, setResult] = useState<DebugExecutionResult>(MOCK_DEBUG_RESULT);
  const [logs, setLogs] = useState(MOCK_DEBUG_LOGS);
  const [activeSection, setActiveSection] = useState<'workspace' | 'stateMachine' | 'capabilities'>('workspace');

  const handleInitSubmit = useCallback((_data: TaskInitFormData) => {
    setTask({
      ...MOCK_DEBUG_TASK,
      status: 'waiting_confirm',
      current_stage: '等待确认',
      current_step: '等待用户确认',
    });
    setViewMode('workspace');
  }, []);

  const handleTakeover = useCallback(() => {
    setTask(prev => ({ ...prev, status: 'manual_takeover' as const, current_stage: '人工接管', current_step: '已转为人工处理' }));
    setResult(prev => ({ ...prev, manual_takeover_flag: true }));
  }, []);

  const handleRetry = useCallback(() => {
    setTask(MOCK_DEBUG_TASK);
    setSteps(MOCK_DEBUG_STEPS);
    setResult(MOCK_DEBUG_RESULT);
    setLogs(MOCK_DEBUG_LOGS);
  }, []);

  const handleReset = useCallback(() => {
    setViewMode('initiation');
    setTask(MOCK_DEBUG_TASK);
    setSteps(MOCK_DEBUG_STEPS);
    setResult(MOCK_DEBUG_RESULT);
    setLogs(MOCK_DEBUG_LOGS);
  }, []);

  const handlePause = useCallback(() => {
    setTask(prev => ({ ...prev, status: 'waiting_confirm' as const, current_stage: '已暂停', current_step: '等待恢复' }));
  }, []);

  const handleResume = useCallback(() => {
    setTask(MOCK_DEBUG_TASK);
    setSteps(MOCK_DEBUG_STEPS);
    setResult(MOCK_DEBUG_RESULT);
    setLogs(MOCK_DEBUG_LOGS);
  }, []);

  return (
    <div className="h-full overflow-y-auto p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[var(--aifs-text-primary)]">
            广告联调
          </h2>
          <p className="text-sm text-[var(--aifs-text-secondary)]">
            自动联调专项任务 · 执行状态 · 结果留痕 · 人工接管
          </p>
        </div>
        {viewMode === 'workspace' && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            新建任务
          </Button>
        )}
      </div>

      {/* View Mode Tabs (only in workspace mode) */}
      {viewMode === 'workspace' && (
        <div className="flex gap-1 bg-white/5 rounded-lg p-1">
          {[
            { key: 'workspace' as const, label: '任务工作台', icon: <Zap className="w-4 h-4" /> },
            { key: 'stateMachine' as const, label: '状态机', icon: <Shield className="w-4 h-4" /> },
            { key: 'capabilities' as const, label: '能力边界', icon: <Info className="w-4 h-4" /> },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveSection(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-all flex-1 justify-center ${
                activeSection === tab.key
                  ? 'bg-[var(--aifs-accent)]/20 text-[var(--aifs-accent)]'
                  : 'text-[var(--aifs-text-secondary)] hover:text-[var(--aifs-text-primary)]'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Initiation Form View */}
      {viewMode === 'initiation' && (
        <TaskInitiationForm onSubmit={handleInitSubmit} />
      )}

      {/* Workspace View */}
      {viewMode === 'workspace' && activeSection === 'workspace' && (
        <div className="space-y-4">
          <TaskStatusBar task={task} />
          <StageTimeline task={task} steps={steps} />
          <ExecutionDetails task={task} steps={steps} logs={logs} />
          <EvidenceArea steps={steps} />
          <ResultArea result={result} />
          <OperationButtons
            task={task}
            onTakeover={handleTakeover}
            onRetry={handleRetry}
            onReset={handleReset}
            onPause={handlePause}
            onResume={handleResume}
          />
          <CapabilityBoundaries />
          <ExceptionHandling onTakeover={handleTakeover} />
          <EvidenceAndResults steps={steps} result={result} />
        </div>
      )}

      {/* State Machine View */}
      {viewMode === 'workspace' && activeSection === 'stateMachine' && (
        <div className="space-y-4">
          <StateMachineDiagram currentStatus={task.status} />
          <CapabilityBoundaries />
          <ExceptionHandling onTakeover={handleTakeover} />
        </div>
      )}

      {/* Capabilities View */}
      {viewMode === 'workspace' && activeSection === 'capabilities' && (
        <div className="space-y-4">
          <CapabilityBoundaries />
          <GlassPanel className="p-4">
            <h4 className="text-xs text-[var(--aifs-text-muted)] mb-3 uppercase tracking-wider">可接管阶段</h4>
            <div className="grid grid-cols-5 gap-2">
              {['扫码阶段', '授权阶段', '刷广告阶段', '点击广告阶段', '成功轮询阶段'].map((stage, idx) => (
                <div key={idx} className="p-2 rounded-lg bg-[var(--aifs-warning,#FFB800)]/5 border border-[var(--aifs-warning,#FFB800)]/10 text-center">
                  <span className="text-[11px] text-[var(--aifs-warning,#FFB800)]">{stage}</span>
                </div>
              ))}
            </div>
          </GlassPanel>
          <ExceptionHandling onTakeover={handleTakeover} />
        </div>
      )}
    </div>
  );
}

'use client';

import type { ReactNode } from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  FileText,
  Layers,
  Link2,
  MessageSquarePlus,
  Search,
  Wrench,
} from 'lucide-react';
import type {
  WorkflowResult,
  HelpResult,
  DemandResult,
  DiagnosisResult,
  DebuggingResult,
  EvidenceItem,
  AttachmentRecord,
  MissingField,
  ConfidenceLevel,
} from '@/types';
import { EvidenceCardGroup } from '@/components/cognitive/EvidenceCard';
import { MissingFieldsCard } from '@/components/cognitive/MissingFieldsCard';
import { useThemeColors } from '@/hooks/useTheme';

interface ResultPanelProps {
  result: WorkflowResult | null;
  missingFields?: MissingField[];
  attachments?: AttachmentRecord[];
  onMissingFieldClick?: (field: MissingField) => void;
  onFollowUpClick?: (question: string) => void;
  onUpgradeWorkflow?: (target: string) => void;
  isCollapsed?: boolean;
}

function SectionCard({
  title,
  icon,
  children,
  extra,
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  extra?: ReactNode;
}) {
  const c = useThemeColors();

  return (
    <section
      style={{
        borderRadius: 14,
        border: `1px solid ${c.border}`,
        background: c.bgCard,
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <div style={{ color: c.accent, display: 'flex', alignItems: 'center' }}>{icon}</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: c.textPrimary }}>{title}</div>
        </div>
        {extra}
      </div>
      {children}
    </section>
  );
}

function MetaPill({ label, tone = 'default' }: { label: string; tone?: 'default' | 'success' | 'warning' | 'danger' }) {
  const c = useThemeColors();
  const tones = {
    default: { bg: c.accentBg, color: c.accent },
    success: { bg: `${c.success}14`, color: c.success },
    warning: { bg: `${c.warning}14`, color: c.warning },
    danger: { bg: `${c.danger}14`, color: c.danger },
  } as const;
  const current = tones[tone];

  return (
    <span
      style={{
        padding: '4px 10px',
        borderRadius: 999,
        background: current.bg,
        color: current.color,
        fontSize: 11,
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
}

export function ResultPanel({
  result,
  missingFields = [],
  attachments = [],
  onMissingFieldClick,
  onFollowUpClick,
  onUpgradeWorkflow,
  isCollapsed = false,
}: ResultPanelProps) {
  const c = useThemeColors();

  if (isCollapsed) return null;

  if (!result) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 28,
          textAlign: 'center',
        }}
      >
        <Layers className="w-10 h-10 mb-3" style={{ color: c.textMuted }} />
        <div style={{ fontSize: 15, fontWeight: 600, color: c.textSecondary, marginBottom: 6 }}>结果检查器</div>
        <div style={{ fontSize: 12, color: c.textMuted, lineHeight: 1.7 }}>
          发起对话后，这里会展示结论、证据、待补信息和下一步建议。
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: c.bgMain }}>
      <div
        style={{
          padding: '14px 16px',
          borderBottom: `1px solid ${c.border}`,
          background: c.bgCard,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ResultTypeIcon kind={result.kind} />
          <div style={{ fontSize: 15, fontWeight: 700, color: c.textPrimary, minWidth: 0 }}>{result.summary}</div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <ResultTypeBadge kind={result.kind} />
          {result.confidence && <ConfidenceBadge confidence={result.confidence} />}
          {attachments.length > 0 && <MetaPill label={`附件 ${attachments.length}`} />}
        </div>
      </div>

      <div
        className="custom-scrollbar"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        {missingFields.length > 0 && (
          <MissingFieldsCard fields={missingFields} onFieldClick={onMissingFieldClick} />
        )}

        <SummarySection
          result={result}
          onFollowUpClick={onFollowUpClick}
          onUpgradeWorkflow={onUpgradeWorkflow}
        />

        {hasEvidence(result) && (
          <SectionCard title="证据与来源" icon={<Link2 className="w-4 h-4" />}>
            <EvidenceCardGroup
              evidences={getEvidenceItems(result)}
              attachments={attachments}
              title="证据列表"
            />
          </SectionCard>
        )}

        {result.next_actions.length > 0 && (
          <SectionCard title="下一步建议" icon={<ArrowRight className="w-4 h-4" />}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {result.next_actions.map((action, idx) => (
                <div
                  key={`${action}-${idx}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    borderRadius: 12,
                    padding: '10px 12px',
                    background: c.accentBgFaint,
                    border: `1px solid ${c.borderFaint}`,
                  }}
                >
                  <ChevronRight className="w-4 h-4" style={{ color: c.accent }} />
                  <span style={{ color: c.textBody, fontSize: 13, lineHeight: 1.6 }}>{action}</span>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {result.pending_checks.length > 0 && (
          <SectionCard title="待确认" icon={<Clock className="w-4 h-4" />}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {result.pending_checks.map((check, idx) => (
                <div
                  key={`${check}-${idx}`}
                  style={{
                    display: 'flex',
                    gap: 8,
                    alignItems: 'flex-start',
                    color: c.warning,
                    fontSize: 13,
                    lineHeight: 1.6,
                  }}
                >
                  <Clock className="w-4 h-4" style={{ marginTop: 2 }} />
                  <span>{check}</span>
                </div>
              ))}
            </div>
          </SectionCard>
        )}
      </div>
    </div>
  );
}

function SummarySection({
  result,
  onFollowUpClick,
  onUpgradeWorkflow,
}: {
  result: WorkflowResult;
  onFollowUpClick?: (question: string) => void;
  onUpgradeWorkflow?: (target: string) => void;
}) {
  if (result.result_type === 'help_answer') {
    return (
      <HelpSummary
        result={result.structured_payload as HelpResult}
        onFollowUpClick={onFollowUpClick}
        onUpgradeWorkflow={onUpgradeWorkflow}
      />
    );
  }

  if (result.result_type === 'diagnosis_report') {
    return <DiagnosisSummary result={result.structured_payload as DiagnosisResult} />;
  }

  if (result.result_type === 'demand_form') {
    return <DemandSummary result={result.structured_payload as DemandResult} />;
  }

  if (result.result_type === 'debugging_report') {
    return <DebuggingSummary result={result.structured_payload as DebuggingResult} />;
  }

  return null;
}

function HelpSummary({
  result,
  onFollowUpClick,
  onUpgradeWorkflow,
}: {
  result: HelpResult;
  onFollowUpClick?: (question: string) => void;
  onUpgradeWorkflow?: (target: string) => void;
}) {
  const c = useThemeColors();

  return (
    <>
      <SectionCard title="当前结论" icon={<BookOpen className="w-4 h-4" />}>
        <div style={{ color: c.textPrimary, fontSize: 14, fontWeight: 600 }}>{result.subject}</div>
        <div style={{ color: c.textBody, fontSize: 13, lineHeight: 1.75 }}>{result.definition_text || result.definition}</div>
      </SectionCard>

      {result.system_path && (
        <SectionCard title="可前往的位置" icon={<ExternalLink className="w-4 h-4" />}>
          <div
            style={{
              borderRadius: 12,
              padding: '10px 12px',
              background: c.accentBgFaint,
              border: `1px solid ${c.borderFaint}`,
              color: c.accent,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {result.system_path}
          </div>
        </SectionCard>
      )}

      {result.source_refs.length > 0 && (
        <SectionCard title="参考来源" icon={<Link2 className="w-4 h-4" />}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {result.source_refs.map((ref, idx) => (
              <div
                key={`${ref.title}-${idx}`}
                style={{
                  display: 'flex',
                  gap: 8,
                  alignItems: 'center',
                  padding: '10px 12px',
                  borderRadius: 12,
                  background: c.bgMain,
                  border: `1px solid ${c.borderFaint}`,
                }}
              >
                <FileText className="w-4 h-4" style={{ color: c.textSecondary }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: c.textBody }}>{ref.title}</div>
                </div>
                <MetaPill label={ref.relevance === 'primary' ? '主要' : '补充'} tone={ref.relevance === 'primary' ? 'success' : 'default'} />
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {result.next_actions?.length > 0 && (
        <SectionCard title="建议动作" icon={<ArrowRight className="w-4 h-4" />}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {result.next_actions.map((action, idx) => (
              <button
                key={`${action.label}-${idx}`}
                onClick={() => {
                  if (action.action_type === 'ask_followup' && onFollowUpClick) {
                    onFollowUpClick(action.label);
                  } else if (action.action_type === 'upgrade_workflow' && onUpgradeWorkflow) {
                    onUpgradeWorkflow(action.target || 'diagnosis');
                  }
                }}
                style={{
                  padding: '8px 12px',
                  borderRadius: 12,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                  background: action.action_type === 'upgrade_workflow' ? `${c.danger}14` : c.accentBg,
                  color: action.action_type === 'upgrade_workflow' ? c.danger : c.accent,
                }}
              >
                {action.label}
              </button>
            ))}
          </div>
        </SectionCard>
      )}
    </>
  );
}

function DiagnosisSummary({ result }: { result: DiagnosisResult }) {
  const c = useThemeColors();

  return (
    <>
      <SectionCard title="排查结论" icon={<Search className="w-4 h-4" />}>
        <div style={{ color: c.textPrimary, fontSize: 14, fontWeight: 600 }}>{result.summary_conclusion}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
          <MetricCard label="风险等级" value={riskLevelLabel(result.risk_level)} tone={riskTone(result.risk_level)} />
          <MetricCard label="置信度" value={result.confidence_score !== undefined ? `${(result.confidence_score * 100).toFixed(0)}%` : '待评估'} />
        </div>
      </SectionCard>

      <SectionCard title="影响范围" icon={<Layers className="w-4 h-4" />}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <MetaPill label={result.anomaly_type || '异常类型待确认'} tone="danger" />
          <MetaPill label={result.affected_scope || '影响范围待确认'} />
        </div>
      </SectionCard>
    </>
  );
}

function DemandSummary({ result }: { result: DemandResult }) {
  const c = useThemeColors();

  return (
    <>
      <SectionCard title="需求单概览" icon={<MessageSquarePlus className="w-4 h-4" />}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
          <MetricCard label="需求类型" value={demandTypeLabel(result.demand_type)} />
          <MetricCard label="当前状态" value={demandStatusLabel(result.status)} tone={result.status === 'submitted' ? 'success' : 'warning'} />
        </div>
        {result.demand_summary && (
          <div style={{ color: c.textBody, fontSize: 13, lineHeight: 1.7 }}>{result.demand_summary}</div>
        )}
      </SectionCard>

      <SectionCard title="已补关键信息" icon={<CheckCircle2 className="w-4 h-4" />}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
          <InfoRow label="媒体平台" value={result.form.media} />
          <InfoRow label="应用名称" value={result.form.app_name} />
          <InfoRow label="包名" value={result.form.package_name} />
          <InfoRow label="目标对象" value={result.form.target_object} />
          <InfoRow label="目标时间" value={result.form.target_timeline} />
          <InfoRow label="验收方式" value={result.form.acceptance_method} />
        </div>
      </SectionCard>
    </>
  );
}

function DebuggingSummary({ result }: { result: DebuggingResult }) {
  return (
    <>
      <SectionCard title="当前进展" icon={<Wrench className="w-4 h-4" />}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
          <MetricCard label="当前结果" value={debugStatusLabel(result.result_status)} tone={result.result_status === 'pass' ? 'success' : result.result_status === 'fail' ? 'danger' : 'warning'} />
          <MetricCard label="当前阶段" value={debugStageLabel(result.current_stage)} />
        </div>
      </SectionCard>

      {result.readiness_items.length > 0 && (
        <SectionCard title="准备项检查" icon={<CheckCircle2 className="w-4 h-4" />}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {result.readiness_items.map((item, idx) => (
              <div
                key={`${item.item}-${idx}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  borderRadius: 12,
                  padding: '10px 12px',
                  background: 'rgba(255,255,255,0.6)',
                }}
              >
                <MetaPill
                  label={item.status === 'ready' ? '已准备' : item.status === 'not_ready' ? '未准备' : '待确认'}
                  tone={item.status === 'ready' ? 'success' : item.status === 'not_ready' ? 'danger' : 'warning'}
                />
                <div style={{ fontSize: 13, color: 'var(--aifs-text-primary)' }}>{item.item}</div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </>
  );
}

function MetricCard({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'success' | 'warning' | 'danger';
}) {
  const c = useThemeColors();
  const colorMap = {
    default: c.textPrimary,
    success: c.success,
    warning: c.warning,
    danger: c.danger,
  } as const;

  return (
    <div
      style={{
        borderRadius: 12,
        border: `1px solid ${c.borderFaint}`,
        background: c.bgMain,
        padding: '10px 12px',
      }}
    >
      <div style={{ fontSize: 11, color: c.textMuted, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: colorMap[tone] }}>{value || '待补充'}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  const c = useThemeColors();
  return (
    <div
      style={{
        borderRadius: 12,
        border: `1px solid ${c.borderFaint}`,
        background: c.bgMain,
        padding: '10px 12px',
      }}
    >
      <div style={{ fontSize: 11, color: c.textMuted, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 13, color: c.textBody, lineHeight: 1.6 }}>{value || '待补充'}</div>
    </div>
  );
}

function ResultTypeIcon({ kind }: { kind: string }) {
  const c = useThemeColors();
  const iconMap: Record<string, { Icon: typeof BookOpen; color: string }> = {
    help: { Icon: BookOpen, color: c.accent },
    demand: { Icon: MessageSquarePlus, color: c.info },
    diagnosis: { Icon: Search, color: c.danger },
    debugging: { Icon: Wrench, color: c.warning },
  };
  const { Icon, color } = iconMap[kind] || { Icon: BookOpen, color: c.accent };
  return <Icon className="w-4 h-4" style={{ color }} />;
}

function ResultTypeBadge({ kind }: { kind: string }) {
  const labelMap: Record<string, string> = {
    help: '帮助说明',
    demand: '需求单',
    diagnosis: '问题排查',
    debugging: '广告联调',
  };
  return <MetaPill label={labelMap[kind] || kind} />;
}

function ConfidenceBadge({ confidence }: { confidence: ConfidenceLevel }) {
  const config: Record<string, { label: string; tone: 'success' | 'warning' | 'danger' }> = {
    high: { label: '高置信', tone: 'success' },
    medium: { label: '中置信', tone: 'warning' },
    low: { label: '低置信', tone: 'danger' },
  };
  const current = config[confidence] || config.medium;
  return <MetaPill label={current.label} tone={current.tone} />;
}

function hasEvidence(result: WorkflowResult): boolean {
  const record = result as unknown as Record<string, unknown>;
  return Array.isArray(record.evidence_ids) && record.evidence_ids.length > 0;
}

function getEvidenceItems(result: WorkflowResult): EvidenceItem[] {
  const record = result as unknown as Record<string, unknown>;
  const ids = (Array.isArray(record.evidence_ids) ? record.evidence_ids : []) as string[];
  return ids.map((id, index) => ({
    evidence_id: id,
    title: `证据 ${index + 1}`,
    summary: '证据详情',
    evidence_type: 'knowledge' as const,
    confidence: 'medium' as const,
    source_attachment_id: '',
    step: index + 1,
    detail: '证据详情',
    status: 'pending' as const,
    source: '系统',
  }));
}

function riskLevelLabel(level?: string) {
  if (level === 'high') return '高风险';
  if (level === 'medium') return '中风险';
  if (level === 'low') return '低风险';
  return '待评估';
}

function riskTone(level?: string): 'default' | 'success' | 'warning' | 'danger' {
  if (level === 'high') return 'danger';
  if (level === 'medium') return 'warning';
  if (level === 'low') return 'success';
  return 'default';
}

function demandTypeLabel(type?: string) {
  const labelMap: Record<string, string> = {
    media_postback: '媒体回传',
    event_mapping: '事件映射',
    buried_point: '埋点配置',
    attribution_config: '归因配置',
    whitelist: '白名单申请',
    other: '其他需求',
  };
  return labelMap[type || 'other'] || type || '其他需求';
}

function demandStatusLabel(status?: string) {
  const statusMap: Record<string, string> = {
    draft: '待完善',
    structured: '已结构化',
    submitted: '已提交',
  };
  return statusMap[status || 'draft'] || status || '待完善';
}

function debugStatusLabel(status?: string) {
  const statusMap: Record<string, string> = {
    pass: '联调通过',
    fail: '联调失败',
    partial: '部分通过',
  };
  return statusMap[status || 'partial'] || status || '处理中';
}

function debugStageLabel(stage?: string) {
  const stageMap: Record<string, string> = {
    created: '任务创建',
    waiting_confirm: '等待确认',
    running_web_prepare: 'Web 侧准备',
    running_mobile_scan: '扫码联调',
    running_mobile_find_ad: '查找广告',
    running_mobile_launch: '拉起应用',
    running_success_poll: '轮询结果',
    success: '联调成功',
    failed: '联调失败',
    manual_takeover: '转人工处理',
  };
  return stageMap[stage || 'created'] || stage || '处理中';
}

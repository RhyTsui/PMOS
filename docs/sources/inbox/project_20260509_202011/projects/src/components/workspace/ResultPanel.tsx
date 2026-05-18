'use client';

import {
  BookOpen, MessageSquarePlus, Search, Wrench,
  ChevronRight, ExternalLink, FileText,
  AlertCircle, AlertTriangle, CheckCircle2, Clock, ArrowRight,
  Layers, Tag, Link2,
} from 'lucide-react';
import type {
  WorkflowResult, HelpResult, DemandResult, DiagnosisResult, DebuggingResult,
  EvidenceItem, AttachmentRecord, MissingField, IntentType, ConfidenceLevel,
} from '@/types';
import { EvidenceCardGroup } from '@/components/cognitive/EvidenceCard';
import { MissingFieldsCard } from '@/components/cognitive/MissingFieldsCard';

// ==========================================
// ResultPanel Main Component
// ==========================================

interface ResultPanelProps {
  result: WorkflowResult | null;
  missingFields?: MissingField[];
  attachments?: AttachmentRecord[];
  onMissingFieldClick?: (field: MissingField) => void;
  onFollowUpClick?: (question: string) => void;
  onUpgradeWorkflow?: (target: string) => void;
  isCollapsed?: boolean;
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
  if (isCollapsed) return null;

  if (!result) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <Layers className="w-10 h-10 text-[#5a6a8a] mb-3" />
        <div className="text-sm text-[#8B9DC3] mb-1">结构化结果区</div>
        <div className="text-xs text-[#5a6a8a]">
          发起对话后，结果将在这里展示
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Result Header */}
      <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.06)] flex items-center gap-2">
        <ResultTypeIcon kind={result.kind} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-[#c8d6e5] truncate">{result.summary}</div>
          <div className="flex items-center gap-2 mt-0.5">
            <ResultTypeBadge kind={result.kind} />
            {result.confidence && <ConfidenceBadge confidence={result.confidence} />}
          </div>
        </div>
      </div>

      {/* Result Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
        {/* Missing Fields Card */}
        {missingFields.length > 0 && (
          <MissingFieldsCard
            fields={missingFields}
            onFieldClick={onMissingFieldClick}
          />
        )}

        {/* Result by type */}
        {result.result_type === 'help_answer' && (
          <HelpResultView
            result={result.structured_payload as HelpResult}
            onFollowUpClick={onFollowUpClick}
            onUpgradeWorkflow={onUpgradeWorkflow}
          />
        )}
        {result.result_type === 'diagnosis_report' && (
          <DiagnosisResultView
            result={result.structured_payload as DiagnosisResult}
            attachments={attachments}
          />
        )}
        {result.result_type === 'demand_form' && (
          <DemandResultView result={result.structured_payload as DemandResult} />
        )}
        {result.result_type === 'debugging_report' && (
          <DebuggingResultView result={result.structured_payload as DebuggingResult} />
        )}

        {/* Evidence Cards */}
        {hasEvidence(result) && (
          <EvidenceCardGroup
            evidences={getEvidenceItems(result)}
            attachments={attachments}
            title="证据链"
          />
        )}

        {/* Next Actions */}
        {(result.next_actions.length > 0 || result.next_action) && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-[#8B9DC3] flex items-center gap-1.5">
              <ArrowRight className="w-3.5 h-3.5" />
              下一步
            </div>
            <div className="space-y-1">
              {result.next_actions.map((action, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-[rgba(0,217,255,0.04)] hover:bg-[rgba(0,217,255,0.08)] transition-colors cursor-pointer">
                  <ChevronRight className="w-3 h-3 text-[#00D9FF]" />
                  <span className="text-xs text-[#c8d6e5]">{action}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending Checks */}
        {result.pending_checks.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-[#8B9DC3] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              待确认
            </div>
            {result.pending_checks.map((check, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs text-[#FFB800]">
                <AlertCircle className="w-3 h-3" />
                {check}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// Help Result View (使用帮助设计 §4)
// ==========================================

function HelpResultView({
  result,
  onFollowUpClick,
  onUpgradeWorkflow,
}: {
  result: HelpResult;
  onFollowUpClick?: (q: string) => void;
  onUpgradeWorkflow?: (target: string) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Question Type & Subject */}
      <div className="flex items-center gap-2">
        <Tag className="w-3.5 h-3.5 text-[#00D9FF]" />
        <span className="px-2 py-0.5 rounded bg-[rgba(0,217,255,0.1)] text-[#00D9FF] text-xs">{result.question_type}</span>
        <span className="text-sm font-medium text-[#c8d6e5]">{result.subject}</span>
      </div>

      {/* Definition */}
      <div className="p-3 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
        <div className="text-xs text-[#5a6a8a] mb-1.5">定义说明</div>
        <div className="text-sm text-[#c8d6e5] leading-relaxed">
          {result.definition_text || result.definition}
        </div>
      </div>

      {/* System Path */}
      {result.system_path && (
        <div className="p-3 rounded-lg bg-[rgba(0,217,255,0.04)] border border-[rgba(0,217,255,0.1)]">
          <div className="text-xs text-[#5a6a8a] mb-1.5">系统入口</div>
          <div className="flex items-center gap-2">
            <ExternalLink className="w-3.5 h-3.5 text-[#00D9FF]" />
            <span className="text-sm text-[#00D9FF]">{result.system_path}</span>
          </div>
        </div>
      )}

      {/* Source References */}
      {result.source_refs.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-[#8B9DC3] flex items-center gap-1.5">
            <Link2 className="w-3.5 h-3.5" />
            引用来源
          </div>
          {result.source_refs.map((ref, idx) => (
            <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-[rgba(255,255,255,0.02)]">
              <FileText className="w-3.5 h-3.5 text-[#8B9DC3]" />
              <span className="text-xs text-[#c8d6e5] flex-1">{ref.title}</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-[rgba(0,217,255,0.08)] text-[#00D9FF]">
                {ref.source_type}
              </span>
              {ref.relevance && (
                <span className={`text-[10px] ${ref.relevance === 'primary' ? 'text-[#00FF88]' : 'text-[#8B9DC3]'}`}>
                  {ref.relevance === 'primary' ? '主要' : '补充'}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Next Actions (Help-specific) */}
      {result.next_actions && result.next_actions.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-[#8B9DC3]">推荐操作</div>
          <div className="flex flex-wrap gap-2">
            {result.next_actions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => {
                  if (action.action_type === 'ask_followup' && onFollowUpClick) {
                    onFollowUpClick(action.label);
                  } else if (action.action_type === 'upgrade_workflow' && onUpgradeWorkflow) {
                    onUpgradeWorkflow(action.target || 'diagnosis');
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                  action.action_type === 'upgrade_workflow'
                    ? 'bg-[rgba(255,51,102,0.1)] text-[#FF3366] hover:bg-[rgba(255,51,102,0.15)]'
                    : 'bg-[rgba(0,217,255,0.08)] text-[#00D9FF] hover:bg-[rgba(0,217,255,0.12)]'
                }`}
              >
                {action.action_type === 'upgrade_workflow' ? <ArrowRight className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// Diagnosis Result View (问题排查设计)
// ==========================================

function DiagnosisResultView({
  result,
  attachments,
}: {
  result: DiagnosisResult;
  attachments: AttachmentRecord[];
}) {
  return (
    <div className="space-y-4">
      {/* Conclusion */}
      <div className="p-3 rounded-lg bg-[rgba(255,51,102,0.06)] border border-[rgba(255,51,102,0.15)]">
        <div className="text-xs text-[#FF3366] mb-1.5 font-medium">排查结论</div>
        <div className="text-sm text-[#c8d6e5]">{result.summary_conclusion}</div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-2">
        {result.confidence_score !== undefined && (
          <div className="p-2.5 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
            <div className="text-[10px] text-[#5a6a8a]">置信度</div>
            <div className="text-lg font-semibold text-[#c8d6e5]">{(result.confidence_score * 100).toFixed(0)}%</div>
          </div>
        )}
        {result.risk_level && (
          <div className="p-2.5 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
            <div className="text-[10px] text-[#5a6a8a]">风险等级</div>
            <div className={`text-lg font-semibold ${
              result.risk_level === 'high' ? 'text-[#FF3366]' :
              result.risk_level === 'medium' ? 'text-[#FFB800]' : 'text-[#00FF88]'
            }`}>
              {result.risk_level === 'high' ? '高' : result.risk_level === 'medium' ? '中' : '低'}
            </div>
          </div>
        )}
      </div>

      {/* Anomaly Type & Scope */}
      <div className="flex flex-wrap gap-2">
        <span className="px-2 py-1 rounded bg-[rgba(255,51,102,0.1)] text-[#FF3366] text-xs">{result.anomaly_type}</span>
        <span className="px-2 py-1 rounded bg-[rgba(255,255,255,0.05)] text-[#8B9DC3] text-xs">{result.affected_scope}</span>
      </div>

      {/* Evidence Chain */}
      {/* Evidence Chain */}
      {result.evidence_items.length > 0 && (
        <EvidenceCardGroup
          evidences={result.evidence_items.map(ei => ({
            title: ei.title,
            detail: ei.summary,
            status: ei.relevance === 'high' ? 'confirmed' : ei.relevance === 'medium' ? 'suspected' : 'pending',
            source: ei.evidence_type,
            step: 0,
            evidence_type: ei.evidence_type === 'log' ? 'callback-log' : ei.evidence_type === 'upload' ? 'upload' : 'knowledge',
            summary: ei.summary,
            confidence: ei.relevance === 'high' ? 'high' : ei.relevance === 'medium' ? 'medium' : 'low',
          }))}
          attachments={attachments}
          title="证据链"
        />
      )}

      {/* Next Steps */}
      {result.next_actions && result.next_actions.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-[#8B9DC3]">建议操作</div>
          {result.next_actions.map((action, idx) => (
            <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-[rgba(0,217,255,0.04)]">
              <span className="w-5 h-5 rounded-full bg-[rgba(0,217,255,0.15)] text-[#00D9FF] text-[10px] flex items-center justify-center">{idx + 1}</span>
              <span className="text-xs text-[#c8d6e5]">{action.action}</span>
              <span className={`ml-auto px-1.5 py-0.5 rounded text-[10px] ${
                action.status === 'completed' ? 'bg-[rgba(0,255,136,0.1)] text-[#00FF88]' :
                action.status === 'in_progress' ? 'bg-[rgba(0,217,255,0.1)] text-[#00D9FF]' :
                'bg-[rgba(255,184,0,0.1)] text-[#FFB800]'
              }`}>{action.status === 'completed' ? '已完成' : action.status === 'in_progress' ? '进行中' : '待处理'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==========================================
// Demand Result View (需求沟通设计)
// ==========================================

function DemandResultView({ result }: { result: DemandResult }) {
  return (
    <div className="space-y-4">
      {/* Demand Type Tabs */}
      <div className="flex flex-wrap gap-1.5">
        {(['media_postback', 'event_mapping', 'buried_point', 'attribution_config', 'whitelist', 'other'] as const).map((t) => (
          <span key={t} className={`px-2 py-1 rounded text-[10px] ${
            result.demand_type === t ? 'bg-[rgba(123,97,255,0.2)] text-[#7B61FF] border border-[rgba(123,97,255,0.3)]' : 'bg-[rgba(255,255,255,0.03)] text-[#5a6a8a]'
          }`}>
            {t === 'media_postback' ? '媒体回传' : t === 'event_mapping' ? '事件映射' : t === 'buried_point' ? '埋点' : t === 'attribution_config' ? '归因配置' : t === 'whitelist' ? '白名单' : '其他'}
          </span>
        ))}
      </div>

      {/* Structured Demand Form */}
      <div className="p-3 rounded-lg bg-[rgba(123,97,255,0.06)] border border-[rgba(123,97,255,0.15)]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-[#7B61FF]" />
            <span className="text-xs font-medium text-[#7B61FF]">结构化需求单</span>
          </div>
          <span className={`px-2 py-0.5 rounded text-[10px] ${
            result.status === 'draft' ? 'bg-[rgba(255,184,0,0.1)] text-[#FFB800]' :
            result.status === 'structured' ? 'bg-[rgba(0,217,255,0.1)] text-[#00D9FF]' :
            'bg-[rgba(0,255,136,0.1)] text-[#00FF88]'
          }`}>
            {result.status === 'draft' ? '草稿' : result.status === 'structured' ? '已结构化' : '已提交'}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
          {result.form.media && <div><span className="text-[#5a6a8a]">媒体平台:</span> <span className="text-[#c8d6e5]">{result.form.media}</span></div>}
          {result.form.app_name && <div><span className="text-[#5a6a8a]">应用名称:</span> <span className="text-[#c8d6e5]">{result.form.app_name}</span></div>}
          {result.form.package_name && <div><span className="text-[#5a6a8a]">包名:</span> <span className="text-[#c8d6e5]">{result.form.package_name}</span></div>}
          {result.form.target_object && <div><span className="text-[#5a6a8a]">目标对象:</span> <span className="text-[#c8d6e5]">{result.form.target_object}</span></div>}
          {result.form.target_timeline && <div><span className="text-[#5a6a8a]">目标日期:</span> <span className="text-[#c8d6e5]">{result.form.target_timeline}</span></div>}
          {result.form.acceptance_method && <div><span className="text-[#5a6a8a]">验收方式:</span> <span className="text-[#c8d6e5]">{result.form.acceptance_method}</span></div>}
        </div>
        {result.demand_summary && (
          <div className="mt-2 pt-2 border-t border-[rgba(123,97,255,0.1)]">
            <span className="text-[10px] text-[#5a6a8a]">需求摘要:</span>
            <p className="text-xs text-[#c8d6e5] mt-0.5">{result.demand_summary}</p>
          </div>
        )}
      </div>

      {/* Event Mapping */}
      {result.form.event_mapping && result.form.event_mapping.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-[#8B9DC3]">事件映射</div>
          {result.form.event_mapping.map((em, idx) => (
            <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-[rgba(255,255,255,0.03)]">
              <span className="text-xs text-[#c8d6e5]">{em.client_event}</span>
              <ArrowRight className="w-3 h-3 text-[#5a6a8a]" />
              <span className="text-xs text-[#c8d6e5]">{em.media_event}</span>
              <span className={`ml-auto px-1.5 py-0.5 rounded text-[10px] ${
                em.mapping_status === 'mapped' ? 'bg-[rgba(0,255,136,0.1)] text-[#00FF88]' :
                em.mapping_status === 'unmapped' ? 'bg-[rgba(255,51,102,0.1)] text-[#FF3366]' :
                'bg-[rgba(255,184,0,0.1)] text-[#FFB800]'
              }`}>
                {em.mapping_status === 'mapped' ? '已映射' : em.mapping_status === 'unmapped' ? '未映射' : '冲突'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Missing Fields with Priority */}
      {result.missing_fields.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-[#FFB800]" />
            <span className="text-xs font-medium text-[#FFB800]">缺失字段（待补录）</span>
          </div>
          <div className="p-2 rounded-lg bg-[rgba(255,184,0,0.06)] border border-[rgba(255,184,0,0.15)]">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[#5a6a8a]">
                  <th className="text-left py-1">字段</th>
                  <th className="text-left py-1">优先级</th>
                  <th className="text-left py-1">补录原因</th>
                </tr>
              </thead>
              <tbody>
                {result.missing_fields.map((f, idx) => (
                  <tr key={idx} className="border-t border-[rgba(255,184,0,0.08)]">
                    <td className="py-1.5 text-[#c8d6e5]">{f.field_label}</td>
                    <td className="py-1.5">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                        f.priority === 'high' ? 'bg-[rgba(255,51,102,0.1)] text-[#FF3366]' :
                        f.priority === 'medium' ? 'bg-[rgba(255,184,0,0.1)] text-[#FFB800]' :
                        'bg-[rgba(0,217,255,0.1)] text-[#00D9FF]'
                      }`}>
                        {f.priority === 'high' ? '高' : f.priority === 'medium' ? '中' : '低'}
                      </span>
                    </td>
                    <td className="py-1.5 text-[#8B9DC3]">{f.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dependency Items */}
      {result.dependencies.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Link2 className="w-3.5 h-3.5 text-[#00D9FF]" />
            <span className="text-xs font-medium text-[#8B9DC3]">依赖项清单</span>
          </div>
          <div className="p-2 rounded-lg bg-[rgba(0,217,255,0.04)] border border-[rgba(0,217,255,0.1)]">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[#5a6a8a]">
                  <th className="text-left py-1">依赖方</th>
                  <th className="text-left py-1">系统</th>
                  <th className="text-left py-1">动作</th>
                  <th className="text-left py-1">状态</th>
                </tr>
              </thead>
              <tbody>
                {result.dependencies.map((dep, idx) => (
                  <tr key={idx} className="border-t border-[rgba(0,217,255,0.06)]">
                    <td className="py-1.5 text-[#c8d6e5]">{dep.dep_role}</td>
                    <td className="py-1.5 text-[#8B9DC3]">{dep.dep_system}</td>
                    <td className="py-1.5 text-[#8B9DC3]">{dep.dep_action}</td>
                    <td className="py-1.5">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                        dep.status === 'completed' ? 'bg-[rgba(0,255,136,0.1)] text-[#00FF88]' :
                        dep.status === 'in_progress' ? 'bg-[rgba(0,217,255,0.1)] text-[#00D9FF]' :
                        'bg-[rgba(255,184,0,0.1)] text-[#FFB800]'
                      }`}>
                        {dep.status === 'completed' ? '已完成' : dep.status === 'in_progress' ? '进行中' : '待处理'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Owner Candidates */}
      {result.owner_roles.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-[#8B9DC3]">协作人</div>
          <div className="flex flex-wrap gap-1.5">
            {result.owner_roles.map((owner, idx) => (
              <span key={idx} className="px-2 py-1 rounded bg-[rgba(255,255,255,0.05)] text-xs text-[#8B9DC3]">{owner}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// Debugging Result View (广告联调设计)
// ==========================================

function DebuggingResultView({ result }: { result: DebuggingResult }) {
  const stageLabels: Record<string, string> = {
    'created': '任务创建',
    'waiting_confirm': '等待确认',
    'running_web_prepare': 'Web 侧准备',
    'running_mobile_scan': '扫码联调',
    'running_mobile_find_ad': '查找广告',
    'running_mobile_launch': '拉起应用',
    'running_success_poll': '轮询结果',
    'success': '联调成功',
    'failed': '联调失败',
    'manual_takeover': '人工接管',
  };

  const stageOrder = ['created', 'waiting_confirm', 'running_web_prepare', 'running_mobile_scan',
    'running_mobile_find_ad', 'running_mobile_launch', 'running_success_poll'];

  return (
    <div className="space-y-4">
      {/* Result Status */}
      <div className={`p-3 rounded-lg border ${
        result.result_status === 'pass' ? 'bg-[rgba(0,255,136,0.06)] border-[rgba(0,255,136,0.15)]' :
        result.result_status === 'fail' ? 'bg-[rgba(255,51,102,0.06)] border-[rgba(255,51,102,0.15)]' :
        'bg-[rgba(255,184,0,0.06)] border-[rgba(255,184,0,0.15)]'
      }`}>
        <div className="flex items-center gap-2">
          {result.result_status === 'pass' && <CheckCircle2 className="w-4 h-4 text-[#00FF88]" />}
          {result.result_status === 'fail' && <AlertCircle className="w-4 h-4 text-[#FF3366]" />}
          {result.result_status === 'partial' && <Clock className="w-4 h-4 text-[#FFB800]" />}
          <span className={`text-sm font-medium ${
            result.result_status === 'pass' ? 'text-[#00FF88]' :
            result.result_status === 'fail' ? 'text-[#FF3366]' : 'text-[#FFB800]'
          }`}>
            {result.result_status === 'pass' ? '联调通过' : result.result_status === 'fail' ? '联调失败' : '部分通过'}
          </span>
          {result.current_stage && (
            <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-[rgba(0,217,255,0.15)] text-[#00D9FF]">
              {stageLabels[result.current_stage] || result.current_stage}
            </span>
          )}
        </div>
      </div>

      {/* Stage Progress Bar (Auto-debugging state machine) */}
      {result.stages.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-[#8B9DC3]">执行进度</div>
          <div className="flex items-center gap-1">
            {stageOrder.map((stage, idx) => {
              const stageData = result.stages.find(s => s.stage === stage);
              const isCompleted = stageData?.status === 'completed';
              const isRunning = stageData?.status === 'running';
              const isFailed = stageData?.status === 'failed';
              const isPending = !stageData || stageData.status === 'pending';
              return (
                <div key={stage} className="flex items-center gap-1 flex-1">
                  <div className={`h-2 flex-1 rounded-full transition-all ${
                    isCompleted ? 'bg-[#00FF88]' :
                    isRunning ? 'bg-[#00D9FF] animate-pulse' :
                    isFailed ? 'bg-[#FF3366]' :
                    'bg-[rgba(255,255,255,0.06)]'
                  }`} title={stageLabels[stage] || stage} />
                  {idx < stageOrder.length - 1 && (
                    <div className={`w-1 h-0.5 ${isCompleted ? 'bg-[#00FF88]' : 'bg-[rgba(255,255,255,0.06)]'}`} />
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] text-[#5a6a8a]">
            <span>准备</span>
            <span>扫码</span>
            <span>找广告</span>
            <span>拉起</span>
            <span>轮询</span>
          </div>
        </div>
      )}

      {/* Readiness Summary */}
      {result.readiness_items.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-[#8B9DC3]">准备项</div>
          {result.readiness_items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-[rgba(255,255,255,0.03)]">
              {item.status === 'ready' && <CheckCircle2 className="w-3.5 h-3.5 text-[#00FF88]" />}
              {item.status === 'not_ready' && <AlertCircle className="w-3.5 h-3.5 text-[#FF3366]" />}
              {item.status === 'unknown' && <Clock className="w-3.5 h-3.5 text-[#8B9DC3]" />}
              <span className="text-xs text-[#c8d6e5] flex-1">{item.item}</span>
              {item.detail && <span className="text-[10px] text-[#5a6a8a]">{item.detail}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Execution Steps */}
      {result.execution_logs.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-[#8B9DC3]">执行步骤</div>
          <div className="space-y-1">
            {result.execution_logs.map((step) => (
              <div key={step.step} className="flex items-center gap-2 p-2 rounded-lg bg-[rgba(255,255,255,0.02)]">
                <span className="w-5 h-5 rounded-full bg-[rgba(0,217,255,0.15)] text-[#00D9FF] text-[10px] flex items-center justify-center font-medium">{step.step}</span>
                <span className="text-xs text-[#c8d6e5] flex-1">{step.action}</span>
                {step.status === 'success' && <CheckCircle2 className="w-3.5 h-3.5 text-[#00FF88]" />}
                {step.status === 'failed' && <AlertCircle className="w-3.5 h-3.5 text-[#FF3366]" />}
                {step.status === 'running' && <Clock className="w-3.5 h-3.5 text-[#00D9FF] animate-pulse" />}
                {step.status === 'pending' && <Clock className="w-3.5 h-3.5 text-[#5a6a8a]" />}
                {step.duration && <span className="text-[10px] text-[#5a6a8a]">{step.duration}ms</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Issues */}
      {result.issues_found.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-[#FF3366]">发现的问题</div>
          {result.issues_found.map((issue, idx) => (
            <div key={idx} className="flex items-center gap-2 text-xs text-[#FF3366]">
              <AlertCircle className="w-3 h-3" />
              {issue}
            </div>
          ))}
        </div>
      )}

      {/* Manual Takeover Button */}
      {result.result_status === 'fail' && (
        <button className="w-full py-2 px-3 rounded-lg bg-[rgba(255,184,0,0.1)] border border-[rgba(255,184,0,0.2)] text-[#FFB800] text-xs font-medium hover:bg-[rgba(255,184,0,0.15)] transition-colors">
          人工接管
        </button>
      )}
    </div>
  );
}

// ==========================================
// Helper Components
// ==========================================

function ResultTypeIcon({ kind }: { kind: IntentType }) {
  const iconMap: Record<string, typeof BookOpen> = {
    help: BookOpen,
    demand: MessageSquarePlus,
    diagnosis: Search,
    debugging: Wrench,
  };
  const colorMap: Record<string, string> = {
    help: '#00D9FF',
    demand: '#7B61FF',
    diagnosis: '#FF3366',
    debugging: '#FFB800',
  };
  const Icon = iconMap[kind] || BookOpen;
  return <Icon className="w-4 h-4 flex-shrink-0" style={{ color: colorMap[kind] || '#8B9DC3' }} />;
}

function ResultTypeBadge({ kind }: { kind: IntentType }) {
  const labelMap: Record<string, string> = {
    help: '帮助',
    demand: '需求',
    diagnosis: '排查',
    debugging: '联调',
    monitor: '监控',
    'material-analysis': '素材',
    forecast: '预测',
    general: '通用',
  };
  const colorMap: Record<string, string> = {
    help: 'bg-[rgba(0,217,255,0.1)] text-[#00D9FF]',
    demand: 'bg-[rgba(123,97,255,0.1)] text-[#7B61FF]',
    diagnosis: 'bg-[rgba(255,51,102,0.1)] text-[#FF3366]',
    debugging: 'bg-[rgba(255,184,0,0.1)] text-[#FFB800]',
  };
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${colorMap[kind] || 'bg-[rgba(139,157,195,0.1)] text-[#8B9DC3]'}`}>
      {labelMap[kind] || kind}
    </span>
  );
}

function ConfidenceBadge({ confidence }: { confidence: ConfidenceLevel }) {
  const config: Record<ConfidenceLevel, { color: string; label: string }> = {
    high: { color: 'bg-[rgba(0,255,136,0.1)] text-[#00FF88]', label: '高置信' },
    medium: { color: 'bg-[rgba(255,184,0,0.1)] text-[#FFB800]', label: '中置信' },
    low: { color: 'bg-[rgba(255,51,102,0.1)] text-[#FF3366]', label: '低置信' },
  };
  const conf = config[confidence];
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${conf.color}`}>
      {conf.label}
    </span>
  );
}

function hasEvidence(result: WorkflowResult): boolean {
  const payload = result.structured_payload;
  if ('evidence_chain' in payload) {
    return Array.isArray(payload.evidence_chain) && payload.evidence_chain.length > 0;
  }
  return false;
}

function getEvidenceItems(result: WorkflowResult): EvidenceItem[] {
  const payload = result.structured_payload;
  if ('evidence_chain' in payload && Array.isArray(payload.evidence_chain)) {
    return payload.evidence_chain;
  }
  return [];
}

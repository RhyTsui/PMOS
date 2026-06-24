'use client';

import { useMemo } from 'react';
import XMarkdown from '@ant-design/x-markdown';
import { AlertCircle, Info, LockKeyhole, TriangleAlert } from 'lucide-react';
import type { SemanticRegion, SemanticResultContract } from '@/contracts/semantic/semantic-result-contract';
import type { Message } from '@/types';
import type { VizSpec } from '@/types/viz';
import { semanticResultToVizSpec } from '@/lib/report-result-visualization';
import { useThemeColors } from '@/hooks/useTheme';
import { DataVizRenderer } from './DataVizRenderer';
import { projectMessagePresentation } from './message-presentation-projection';
import { normalizeAnswerMarkdown } from '@/lib/chat-runtime/answer-markdown-normalizer';

interface MessagePresentationRendererProps {
  message: Message;
  result: SemanticResultContract;
  onFollowUpClick?: (text: string) => void;
  onSubmitFollowUp?: (text: string) => void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function safeString(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

function readRecordList(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function querySummaryText(data: unknown): string {
  const record = isRecord(data) ? data : {};
  return safeString(record.brief)
    || safeString(record.summary)
    || safeString(record.description)
    || safeString(record.business_impact || record.businessImpact);
}

function QueryResultCard({ region }: { region: SemanticRegion }) {
  const c = useThemeColors();
  const text = querySummaryText(region.data);
  if (!text) return null;
  return (
    <section
      style={{
        borderRadius: c.chat.radius.panel,
        border: `1px solid ${c.chat.border.subtle}`,
        background: c.chat.surface.panelSubtle,
        padding: 16,
      }}
    >
      <div className="ui-body" style={{ lineHeight: 1.75 }}>
        {text}
      </div>
    </section>
  );
}

function CapabilityGapCard({ region }: { region: SemanticRegion }) {
  const c = useThemeColors();
  const record = isRecord(region.data) ? region.data : {};
  const gap = isRecord(record.capability_gap) ? record.capability_gap : record;
  const title = safeString(gap.title || record.title, '\u8fd8\u9700\u8865\u9f50\u67e5\u8be2\u6761\u4ef6');
  const missing = readRecordList(gap.missingCapabilities);
  const brief = safeString(gap.mainMessage)
    || safeString(gap.brief || gap.summary || record.brief || record.summary)
    || safeString(missing[0]?.userMessage)
    || safeString(missing[0]?.label, '\u8fd8\u9700\u786e\u8ba4\u67e5\u8be2\u6761\u4ef6\u540e\u624d\u80fd\u7ee7\u7eed\u3002');

  return (
    <section
      style={{
        borderRadius: c.chat.radius.panel,
        border: `1px solid ${c.chat.border.subtle}`,
        background: c.chat.surface.panelSubtle,
        padding: 16,
      }}
    >
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <TriangleAlert size={16} style={{ color: c.warning, marginTop: 2, flexShrink: 0 }} />
        <div style={{ minWidth: 0 }}>
          <div className="ui-title" style={{ fontWeight: 700, lineHeight: 1.45 }}>{title}</div>
          {brief ? <div className="ui-body" style={{ marginTop: 8, lineHeight: 1.7 }}>{brief}</div> : null}
        </div>
      </div>

    </section>
  );
}

function MarkdownFallback({ region }: { region: SemanticRegion }) {
  const c = useThemeColors();
  const markdown = isRecord(region.data)
    ? safeString(
      region.data.markdown,
      safeString(
        region.data.answer_markdown,
        safeString(region.data.text, safeString(region.data.content, safeString(region.data.summary))),
      ),
    )
    : '';
  const visibleMarkdown = normalizeAnswerMarkdown(markdown);
  if (!visibleMarkdown) return null;
  return (
    <section
      style={{
        borderRadius: 0,
        border: 'none',
        background: 'transparent',
        padding: 0,
      }}
    >
      <XMarkdown content={visibleMarkdown} rootClassName="x-markdown" paragraphTag="div" openLinksInNewTab />
    </section>
  );
}

function formatDisplayValue(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => formatDisplayValue(item))
      .filter((item) => item.length > 0)
      .join('，');
  }
  if (isRecord(value)) {
    return Object.entries(value)
      .map(([key, item]) => `${key}：${formatDisplayValue(item)}`)
      .filter((item) => item.length > 0 && !/：$/.test(item))
      .join('；');
  }
  return '';
}

function toStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (isRecord(item)) {
        const question = safeString(
          item.question || item.label || item.text || item.message,
          safeString(item.key, safeString(item.value)),
        );
        const impact = safeString(item.impact);
        const defaultAssumption = safeString(item.defaultAssumption);
        const details: string[] = [];
        if (impact) details.push(`影响：${impact}`);
        if (defaultAssumption) details.push(`默认边界：${defaultAssumption}`);
        if (!question) return formatDisplayValue(item);
        if (details.length === 0) return question;
        return `${question}（${details.join('；')}）`;
      }
      return formatDisplayValue(item);
    })
    .filter(Boolean);
}

function ProgressiveDisclosurePanel({
  region,
  onFollowUpClick,
}: {
  region: SemanticRegion;
  onFollowUpClick?: (text: string) => void;
}) {
  const c = useThemeColors();
  if (!isRecord(region.data)) return null;
  const data = region.data;
  const policyTrace = isRecord(data.policyTrace) ? data.policyTrace : {};
  const minimumViableQuery = isRecord(data.minimumViableQuery) ? data.minimumViableQuery : {};
  const progressivePolicy = isRecord(data.progressivePolicy) ? data.progressivePolicy : {};
  const assumedContext = isRecord(data.assumedContext) ? data.assumedContext : {};
  const resolvedContext = isRecord(data.resolvedContext) ? data.resolvedContext : {};
  const unresolvedAmbiguities = toStringList(Array.isArray(data.unresolvedAmbiguities) ? data.unresolvedAmbiguities : []);

  const serviceType = safeString(data.serviceType);
  const serviceIntent = safeString(data.serviceIntent);
  const selectedService = safeString(data.selectedService, safeString(progressivePolicy.selectedService));
  const reasoningPolicy = safeString(data.reasoningPolicy, safeString(progressivePolicy.reasoningPolicy));
  const ambiguityClass = safeString(data.ambiguityClass, safeString(progressivePolicy.ambiguityClass));
  const riskLevel = safeString(data.riskLevel, safeString(progressivePolicy.riskLevel));
  const followUpMode = safeString(data.followUpMode, safeString(progressivePolicy.followUpMode));
  const policyTraceLabel = safeString(
    policyTrace.failureTranslation,
    safeString(policyTrace.failure_translation, safeString(policyTrace.failure_reason, safeString(policyTrace.failureReason))),
  );
  const assumedLines = Object.entries(assumedContext).map(([key, value]) => `${key}: ${formatDisplayValue(value)}`);
  const resolvedLines = Object.entries(resolvedContext).map(([key, value]) => `${key}: ${formatDisplayValue(value)}`);
  const minimumQueryLines = [
    safeString(minimumViableQuery.queryType),
    safeString(minimumViableQuery.executableTarget),
    ...(Array.isArray(minimumViableQuery.assumptionsUsed) ? minimumViableQuery.assumptionsUsed.map(String).filter(Boolean) : []),
  ].filter(Boolean);
  const followUpQuestion = safeString(
    policyTrace.followUpQuestion,
    safeString(policyTrace.follow_up_question, safeString(policyTrace.nextQuestion, safeString(policyTrace.next_follow_up_question))),
  );
  const followUpCandidates = followUpQuestion
    ? [followUpQuestion]
    : unresolvedAmbiguities.slice(0, 2);

  if (!serviceType && !serviceIntent && !selectedService && !reasoningPolicy && !minimumQueryLines.length && !assumedLines.length && !resolvedLines.length && !unresolvedAmbiguities.length) {
    return null;
  }

  return (
    <section
      style={{
        borderRadius: c.chat.radius.panel,
        border: `1px solid ${c.chat.border.subtle}`,
        background: c.chat.surface.panelSubtle,
        padding: 16,
      }}
    >
    <div className="ui-title" style={{ fontWeight: 700, lineHeight: 1.45 }}>进度与决策披露</div>
      <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
        <div style={{ display: 'grid', gap: 6, lineHeight: 1.65 }} className="ui-body">
          {serviceType ? <div><strong>\u670d\u52a1\u7c7b\u578b：</strong>{serviceType}</div> : null}
          {serviceIntent ? <div><strong>服务意图：</strong>{serviceIntent}</div> : null}
          {selectedService ? <div><strong>当前服务处理：</strong>{selectedService}</div> : null}
          {reasoningPolicy ? <div><strong>\u89c4\u5219：</strong>{reasoningPolicy}</div> : null}
          {ambiguityClass ? <div><strong>\u6a21\u7cca\u7c7b\u578b：</strong>{ambiguityClass}</div> : null}
          {riskLevel ? <div><strong>\u98ce\u9669\u7ea7\u522b：</strong>{riskLevel}</div> : null}
          {followUpMode ? <div><strong>\u8fdb\u5ea6\u7ea7\u8fdb\u5ea6\uff1a</strong>{followUpMode}</div> : null}
        </div>
        {minimumQueryLines.length ? (
          <div className="ui-body" style={{ lineHeight: 1.65 }}>
            <div style={{ fontWeight: 600 }}>默认口径</div>
            <div style={{ marginTop: 4 }}>{minimumQueryLines.join('；')}</div>
          </div>
        ) : null}
        {assumedLines.length ? (
          <div className="ui-body" style={{ lineHeight: 1.65 }}>
            <div style={{ fontWeight: 600 }}>已假设上下文</div>
            <div style={{ marginTop: 4 }}>{assumedLines.join('；')}</div>
          </div>
        ) : null}
        {resolvedLines.length ? (
          <div className="ui-body" style={{ lineHeight: 1.65 }}>
            <div style={{ fontWeight: 600 }}>已确认上下文</div>
            <div style={{ marginTop: 4 }}>{resolvedLines.join('；')}</div>
          </div>
        ) : null}
        {unresolvedAmbiguities.length ? (
          <div className="ui-body" style={{ lineHeight: 1.65 }}>
            <div style={{ fontWeight: 600 }}>未决歧义（建议继续确认）</div>
            <div style={{ marginTop: 4 }}>{unresolvedAmbiguities.join('；')}</div>
          </div>
        ) : null}
        {policyTraceLabel ? (
          <div className="ui-body" style={{ lineHeight: 1.65 }}>
            <div style={{ fontWeight: 600 }}>失败转译</div>
            <div style={{ marginTop: 4 }}>{policyTraceLabel}</div>
          </div>
        ) : null}
        {Array.isArray(progressivePolicy.confirmationItems) && progressivePolicy.confirmationItems.length > 0 ? (
          <div className="ui-body" style={{ lineHeight: 1.65 }}>
            <div style={{ fontWeight: 600 }}>操作确认项</div>
            <ul style={{ marginTop: 4, paddingLeft: 18, display: 'grid', gap: 3 }}>
              {(progressivePolicy.confirmationItems as Array<{ label: string; required?: boolean }>).map((item, idx) => (
                <li key={idx} style={{ color: item.required !== false ? c.chat.text.primary : c.chat.text.secondary }}>
                  {item.label}{item.required !== false ? '' : '（可选）'}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {/* 因果推理骨架（诊断域） */}
        {isRecord(data.thinkingChain) && isRecord((data.thinkingChain as Record<string, unknown>).advance) ? (() => {
          const advance = (data.thinkingChain as Record<string, unknown>).advance as Record<string, unknown>;
          const causal = isRecord(advance.causalSkeleton) ? advance.causalSkeleton as Record<string, unknown> : null;
          if (!causal) return null;
          const rootQuestion = safeString(causal.rootQuestion);
          const overallConfidence = typeof causal.overallConfidence === 'number' ? causal.overallConfidence : 0;
          const nodeCount = typeof causal.nodeCount === 'number' ? causal.nodeCount : 0;
          if (!rootQuestion && !nodeCount) return null;
          return (
            <div className="ui-body" style={{ lineHeight: 1.65 }}>
              <div style={{ fontWeight: 600 }}>诊断因果分析</div>
              <div style={{ marginTop: 4 }}>
                {rootQuestion ? <div>问题：{rootQuestion}</div> : null}
                <div>置信度：{Math.round(overallConfidence * 100)}%｜分析维度：{nodeCount} 个</div>
              </div>
            </div>
          );
        })() : null}
        {/* 路由降级提示 */}
        {isRecord(data.routingDecision) && isRecord((data.routingDecision as Record<string, unknown>).routeDowngrade) ? (() => {
          const downgrade = (data.routingDecision as Record<string, unknown>).routeDowngrade as Record<string, unknown>;
          const originalService = safeString(downgrade.originalService);
          const downgradedService = safeString(downgrade.downgradedService);
          const reason = safeString(downgrade.reason);
          if (!originalService || !downgradedService) return null;
          return (
            <div className="ui-body" style={{ lineHeight: 1.65 }}>
              <div style={{ fontWeight: 600 }}>服务调整</div>
              <div style={{ marginTop: 4 }}>
                <div>{originalService} → {downgradedService}</div>
                {reason ? <div style={{ marginTop: 2, color: c.chat.text.secondary }}>{reason}</div> : null}
              </div>
            </div>
          );
        })() : null}
        {followUpCandidates.length ? (
          <div style={{ display: 'grid', gap: 6 }}>
            <div className="ui-body" style={{ fontWeight: 600 }}>建议继续追问：</div>
            <div style={{ display: 'grid', gap: 6 }}>
              {followUpCandidates.map((question) => (
                <button
                  key={question}
                  type="button"
                  onClick={() => onFollowUpClick?.(question)}
                  style={{
                    borderRadius: 8,
                    border: `1px solid ${c.chat.border.subtle}`,
                    background: c.chat.surface.panel,
                    color: c.chat.text.primary,
                    padding: '6px 10px',
                    textAlign: 'left',
                    cursor: onFollowUpClick ? 'pointer' : 'default',
                  }}
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function DataRegion({ result, regions }: { result: SemanticResultContract; regions: SemanticRegion[] }) {
  if (regions.length === 0) return null;
  const first = regions[0];
  const direct = isRecord(first.data) && typeof first.data.kind === 'string' ? first.data as VizSpec : null;
  const spec = direct || semanticResultToVizSpec({
    ...result,
    regions: [first],
  });
  if (!spec) return null;
  return <DataVizRenderer spec={spec} />;
}

function PermissionCard({ region }: { region: SemanticRegion }) {
  const c = useThemeColors();
  const record = isRecord(region.data) ? region.data : {};
  const message = safeString(record.message, '\u5f53\u524d\u7ed3\u679c\u9700\u8981\u76f8\u5e94\u6743\u9650\u540e\u624d\u80fd\u67e5\u770b\u3002');
  return (
    <section style={{ borderRadius: c.chat.radius.panel, border: `1px solid ${c.chat.border.subtle}`, background: c.chat.surface.panelSubtle, padding: 16 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <LockKeyhole size={16} style={{ color: c.warning, marginTop: 2 }} />
        <div>
          <div className="ui-title" style={{ fontWeight: 700 }}>{'\u6743\u9650\u53d7\u9650'}</div>
          <div className="ui-body" style={{ marginTop: 8, lineHeight: 1.7 }}>{message}</div>
        </div>
      </div>
    </section>
  );
}

function EmptyCard({ region }: { region: SemanticRegion }) {
  const c = useThemeColors();
  const record = isRecord(region.data) ? region.data : {};
  const message = safeString(record.message, '\u672a\u627e\u5230\u7b26\u5408\u6761\u4ef6\u7684\u7ed3\u679c\u3002');
  return (
    <section style={{ borderRadius: c.chat.radius.panel, border: `1px solid ${c.chat.border.subtle}`, background: c.chat.surface.panelSubtle, padding: 16 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <Info size={16} style={{ color: c.textMuted, marginTop: 2 }} />
        <div className="ui-body" style={{ lineHeight: 1.7 }}>{message}</div>
      </div>
    </section>
  );
}

function ErrorCard({ region }: { region: SemanticRegion }) {
  const c = useThemeColors();
  const record = isRecord(region.data) ? region.data : {};
  const kind = safeString(record.kind || record.errorType || region.metadata?.kind);
  const fallback = kind === 'tool_failed'
    ? '\u83b7\u53d6\u6570\u636e\u65f6\u9047\u5230\u95ee\u9898\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002'
    : kind === 'empty_data'
      ? '\u672a\u627e\u5230\u7b26\u5408\u6761\u4ef6\u7684\u6570\u636e\u3002'
      : kind === 'permission_denied'
        ? '\u5f53\u524d\u7ed3\u679c\u9700\u8981\u76f8\u5e94\u6743\u9650\u540e\u624d\u80fd\u67e5\u770b\u3002'
        : '\u7ed3\u679c\u5c55\u793a\u9047\u5230\u95ee\u9898\uff0c\u5df2\u5c3d\u91cf\u4fdd\u7559\u53ef\u8bfb\u5185\u5bb9\u3002';
  const message = safeString(record.userMessage || record.message, fallback);
  return (
    <section style={{ borderRadius: c.chat.radius.panel, border: `1px solid ${c.danger}22`, background: '#fff5f5', padding: 16 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <AlertCircle size={16} style={{ color: c.danger, marginTop: 2 }} />
        <div className="ui-body" style={{ lineHeight: 1.7 }}>{message}</div>
      </div>
    </section>
  );
}

export function MessagePresentationRenderer({
  message,
  result,
  onFollowUpClick,
}: MessagePresentationRendererProps) {
  const c = useThemeColors();
  const projection = useMemo(() => projectMessagePresentation({ message, result }), [message, result]);

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {projection.sideRegions.map((region) => (
        region.componentBinding === 'disclosure-panel' ? (
          <ProgressiveDisclosurePanel key={region.id} region={region} onFollowUpClick={onFollowUpClick} />
        ) : null
      )).filter(Boolean)}
      {projection.permissionRegion ? <PermissionCard region={projection.permissionRegion} /> : null}
      {projection.errorRegion ? <ErrorCard region={projection.errorRegion} /> : null}
      {projection.capabilityGapRegion ? <CapabilityGapCard region={projection.capabilityGapRegion} /> : null}
      {!projection.capabilityGapRegion && projection.summaryRegion ? <QueryResultCard region={projection.summaryRegion} /> : null}
      <DataRegion result={result} regions={projection.dataRegions} />
      {projection.emptyRegion ? <EmptyCard region={projection.emptyRegion} /> : null}
      {projection.markdownRegion ? <MarkdownFallback region={projection.markdownRegion} /> : null}
    </div>
  );
}

export default MessagePresentationRenderer;

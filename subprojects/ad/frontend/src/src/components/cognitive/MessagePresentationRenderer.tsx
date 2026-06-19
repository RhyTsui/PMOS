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
}: MessagePresentationRendererProps) {
  const c = useThemeColors();
  const projection = useMemo(() => projectMessagePresentation({ message, result }), [message, result]);

  return (
    <div style={{ display: 'grid', gap: 12 }}>
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

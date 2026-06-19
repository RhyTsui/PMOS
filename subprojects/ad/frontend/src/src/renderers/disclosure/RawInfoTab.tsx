'use client';

import { useState } from 'react';
import { Collapse } from 'antd';
import type { MessageDisclosureView } from '@/contracts/disclosure';
import SafeCodeBlock from '@/components/ui/SafeCodeBlock';
import { useThemeColors } from '@/hooks/useTheme';
import { EmptyState } from './EmptyState';
import { formatToolCallPayloadText } from './tool-call-payload-format';

interface RawInfoTabProps {
  view: MessageDisclosureView;
}

type RawInfoItem = MessageDisclosureView['rawInfo']['items'][number];
type ToolCallItem = MessageDisclosureView['execution']['toolCalls'][number];

function formatRawValue(item: MessageDisclosureView['rawInfo']['items'][number]): string {
  if (item.rawValue === undefined) {
    return item.displayValue || '[已脱敏]';
  }
  if (typeof item.rawValue === 'string') return item.rawValue;
  if (item.displayValue) return item.displayValue;
  return '[结构化内容已按权限折叠]';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function promptHitsFromView(view: MessageDisclosureView): Array<Record<string, unknown>> {
  const metadata = isRecord(view.metadata) ? view.metadata : {};
  const projection = metadata.message_runtime_projection;
  if (!isRecord(projection)) return [];
  return Array.isArray(projection.prompt_hits) ? projection.prompt_hits.filter(isRecord) : [];
}

function traceUrlFromView(view: MessageDisclosureView): string {
  const traceItem = view.rawInfo.items.find((item) => item.id === 'trace-url');
  const fromItem = typeof traceItem?.rawValue === 'string'
    ? traceItem.rawValue
    : traceItem?.displayValue || '';
  if (fromItem) return fromItem;
  const projection = runtimeProjectionFromView(view);
  return typeof projection?.trace_url === 'string' ? projection.trace_url : '';
}

function runtimeProjectionFromView(view: MessageDisclosureView): Record<string, unknown> | null {
  const metadata = isRecord(view.metadata) ? view.metadata : {};
  const projection = metadata.message_runtime_projection;
  return isRecord(projection) ? projection : null;
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function formatTime(value: unknown): string {
  if (typeof value !== 'string' || !value) return '';
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return '';
  return new Date(timestamp).toLocaleTimeString('zh-CN', { hour12: false });
}

function formatDuration(value: unknown): string {
  if (typeof value !== 'number' || value <= 0) return '';
  const seconds = value / 1000;
  return seconds >= 10 ? `${Math.round(seconds)}s` : `${seconds.toFixed(1)}s`;
}

function logTime(value: unknown, duration: unknown): string {
  const time = formatTime(value);
  return time || formatDuration(duration);
}

function runtimeLogRows(view: MessageDisclosureView): Array<{ key: string; time: string; title: string; status: string; raw: unknown }> {
  const metadata = isRecord(view.metadata) ? view.metadata : {};
  const processEvents = Array.isArray(metadata.process_events) ? metadata.process_events.filter(isRecord) : [];
  if (processEvents.length > 0) {
    return processEvents.map((event, index) => ({
      key: String(event.id || `process-event-${index}`),
      time: logTime(event.started_at || event.completed_at, event.duration_ms),
      title: String(event.label || event.type || `事件 ${index + 1}`),
      status: String(event.status || 'recorded'),
      raw: event,
    }));
  }

  const projection = runtimeProjectionFromView(view);
  const steps = Array.isArray(projection?.runtime_steps) ? projection.runtime_steps.filter(isRecord) : [];
  return steps.map((step, index) => ({
    key: String(step.key || `runtime-step-${index}`),
    time: formatDuration(step.durationMs),
    title: String(step.label || step.key || `步骤 ${index + 1}`),
    status: String(step.status || 'recorded'),
    raw: step,
  }));
}

function isRouteDecisionRow(row: { key: string; title: string; raw: unknown }): boolean {
  const raw = isRecord(row.raw) ? row.raw : {};
  const text = [
    row.key,
    row.title,
    raw.id,
    raw.type,
    raw.label,
    raw.key,
  ].map((value) => String(value || '').toLowerCase()).join('\n');
  return /route|routing/.test(text) || /确定路由|意图路由/.test(text);
}

function isRouteObservationRow(row: { key: string; title: string; raw: unknown }): boolean {
  const raw = isRecord(row.raw) ? row.raw : {};
  const text = [
    row.key,
    row.title,
    raw.id,
    raw.type,
    raw.label,
    raw.key,
  ].map((value) => String(value || '').toLowerCase()).join('\n');
  return /route.*observ|observ.*route/.test(text) || /路由观测/.test(text);
}

function mergeRouteRows(rows: Array<{ key: string; time: string; title: string; status: string; raw: unknown }>) {
  const decision = rows.find((row) => isRouteDecisionRow(row) && !isRouteObservationRow(row));
  const observation = rows.find(isRouteObservationRow);
  if (!decision && !observation) return rows;

  const merged = {
    key: decision?.key || observation?.key || 'intent-route',
    time: decision?.time || observation?.time || '',
    title: '意图路由',
    status: decision?.status || observation?.status || 'recorded',
    raw: decision && observation
      ? { decision: decision.raw, observation: observation.raw }
      : decision
        ? { decision: decision.raw }
        : { observation: observation?.raw },
  };

  const mergedIndex = rows.findIndex((row) => row === decision || row === observation);
  const rest = rows.filter((row) => row !== decision && row !== observation);
  return [
    ...rest.slice(0, Math.max(mergedIndex, 0)),
    merged,
    ...rest.slice(Math.max(mergedIndex, 0)),
  ];
}

function routePayloadSections(value: unknown): Array<{ title: string; value: unknown }> {
  if (!isRecord(value)) return [];
  return [
    value.decision !== undefined ? { title: '路由决策', value: value.decision } : null,
    value.observation !== undefined ? { title: '路由观测', value: value.observation } : null,
  ].filter(Boolean) as Array<{ title: string; value: unknown }>;
}

function statusDotColor(status: string): string {
  const text = status.toLowerCase();
  if (/fail|error|warn|partial|missing|retry/.test(text)) return '#f59e0b';
  if (/running|pending|queued|waiting/.test(text)) return '#94a3b8';
  return '#22c55e';
}

function RuntimeTimelineDot({ status, showLine, color }: { status: string; showLine: boolean; color: string }) {
  const dotColor = statusDotColor(status);
  return (
    <div style={{ display: 'grid', justifyItems: 'center', position: 'relative' }}>
      <span
        aria-hidden="true"
        style={{
          width: 7,
          height: 7,
          marginTop: 7,
          borderRadius: 999,
          background: dotColor,
          boxShadow: `0 0 0 3px ${dotColor}1f`,
        }}
      />
      {showLine && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 18,
            bottom: -5,
            width: 1,
            background: color,
          }}
        />
      )}
    </div>
  );
}

function TraceActionButton({ traceUrl }: { traceUrl: string }) {
  return (
    <a
      href={traceUrl}
      target="_blank"
      rel="noreferrer"
      aria-label="打开连弩 Trace"
      title="打开连弩 Trace"
      style={{
        width: 26,
        height: 26,
        borderRadius: 8,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#fff',
        border: '1px solid rgba(148, 163, 184, 0.26)',
        textDecoration: 'none',
        flexShrink: 0,
        padding: 3,
        overflow: 'hidden',
      }}
    >
      <img
        src="/liannu-icon.png?v=20260611"
        alt="连弩"
        style={{ display: 'block', width: 20, height: 20, objectFit: 'cover', borderRadius: 6, filter: 'brightness(1.22) saturate(1.18)' }}
      />
    </a>
  );
}

function toolCallIdentity(item: ToolCallItem): string[] {
  return [item.id, item.name, item.displayName, item.stepKey, item.kind]
    .map((value) => String(value || '').trim())
    .filter(Boolean);
}

function runtimeRowIdentity(row: { key: string; title: string; raw: unknown }): string[] {
  const raw = isRecord(row.raw) ? row.raw : {};
  return [
    row.key,
    row.title,
    raw.id,
    raw.type,
    raw.label,
    raw.stepKey,
    raw.toolName,
    raw.toolDisplayName,
  ].map((value) => String(value || '').trim()).filter(Boolean);
}

function findToolCallForRow(row: { key: string; title: string; raw: unknown }, calls: ToolCallItem[], usedIds: Set<string>): ToolCallItem | null {
  const rowNames = runtimeRowIdentity(row);
  const rowText = rowNames.join('\n').toLowerCase();
  const exact = calls.find((item) => {
    if (usedIds.has(item.id)) return false;
    const names = toolCallIdentity(item);
    return names.some((name) => rowNames.includes(name));
  });
  if (exact) return exact;
  return calls.find((item) => {
    if (usedIds.has(item.id)) return false;
    const names = toolCallIdentity(item).map((name) => name.toLowerCase());
    return names.some((name) => name && rowText.includes(name));
  }) || null;
}

function RuntimeLogStream({ view }: { view: MessageDisclosureView }) {
  const c = useThemeColors();
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => new Set());
  const rows = mergeRouteRows(runtimeLogRows(view));
  const traceUrl = traceUrlFromView(view);
  const displayToolCalls = view.execution.toolCalls.filter(isDisplayableToolCall);
  if (!rows.length && !traceUrl && !displayToolCalls.length) return null;

  const usedToolCallIds = new Set<string>();
  const rowsWithTools = rows.map((row) => {
    const toolCall = findToolCallForRow(row, displayToolCalls, usedToolCallIds);
    if (toolCall?.id) usedToolCallIds.add(toolCall.id);
    return { ...row, toolCall };
  });
  const unmatchedToolRows = displayToolCalls
    .filter((item) => !usedToolCallIds.has(item.id))
    .map((item, index) => ({
      key: item.id || `tool-call-${index}`,
      title: item.displayName || item.name || `工具 ${index + 1}`,
      status: item.status || 'recorded',
      raw: item,
      toolCall: item,
    }));

  const timelineRows = [
    traceUrl ? {
      key: 'liannu-trace',
      title: '连弩 Trace',
      status: 'recorded',
      raw: { trace_url: traceUrl },
      traceUrl,
    } : null,
    ...rowsWithTools.map((row) => ({ ...row, traceUrl: '' })),
    ...unmatchedToolRows.map((row) => ({ ...row, traceUrl: '' })),
  ].filter(Boolean) as Array<{ key: string; title: string; status: string; raw: unknown; traceUrl?: string; toolCall?: ToolCallItem | null }>;

  const toggleExpanded = (key: string) => {
    setExpandedKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <section style={{ border: `1px solid ${c.chat.border.subtle}`, borderRadius: c.chat.radius.section, padding: 12, background: c.chat.surface.panel }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: c.chat.text.primary }}>运行时</div>
      <div style={{ marginTop: 10, display: 'grid', gap: 0 }}>
        {timelineRows.map((row, index) => {
          const expanded = expandedKeys.has(row.key);
          const last = index === timelineRows.length - 1;
          return (
            <div
              key={row.key}
              style={{
                display: 'grid',
                gridTemplateColumns: '18px minmax(0, 1fr)',
                gap: 10,
                paddingBottom: last ? 0 : 14,
              }}
            >
              <RuntimeTimelineDot status={row.status} showLine={!last} color={c.chat.border.subtle} />
              <div style={{ display: 'grid', gap: 7, minWidth: 0 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 560, color: c.chat.text.secondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.title}</div>
                  {row.traceUrl ? (
                    <TraceActionButton traceUrl={row.traceUrl} />
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleExpanded(row.key)}
                      aria-label={expanded ? '收起原始信息' : '展开原始信息'}
                      title={expanded ? '收起原始信息' : '展开原始信息'}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: c.chat.text.secondary,
                        cursor: 'pointer',
                        fontSize: 15,
                        lineHeight: 1,
                        padding: '2px 4px',
                        transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
                        transition: 'transform 160ms ease, color 160ms ease',
                      }}
                    >
                      &gt;
                    </button>
                  )}
                </div>
                {expanded && !row.traceUrl && (
                  <div style={{ display: 'grid', gap: 12 }}>
                    {row.toolCall ? (
                      <>
                        <ToolPayloadSection title="请求参数" value={toolPayloadValue(row.toolCall, 'request')} />
                        <ToolPayloadSection title="返回参数" value={toolPayloadValue(row.toolCall, 'response')} />
                      </>
                    ) : null}
                    {!row.toolCall && routePayloadSections(row.raw).map((section) => (
                      <SafeCodeBlock
                        key={section.title}
                        content={safeJson(section.value)}
                        language="json"
                        mode="panel"
                        title={section.title}
                        showLineNumbers
                      />
                    ))}
                    {!row.toolCall && routePayloadSections(row.raw).length === 0 && (
                      <SafeCodeBlock
                        content={safeJson(row.raw)}
                        language="json"
                        mode="panel"
                        title={row.title}
                        showLineNumbers
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function toolPayloadValue(item: ToolCallItem, side: 'request' | 'response'): unknown {
  if (side === 'request') return item.request?.normalized ?? item.request?.displayValue ?? item.arguments;
  return item.response?.normalized ?? item.response?.displayValue ?? item.result;
}

function ToolPayloadSection({ title, value }: { title: string; value: unknown }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <SafeCodeBlock
      content={formatToolCallPayloadText(value)}
      language="json"
      mode="panel"
      title={title}
      showLineNumbers
    />
  );
}

function isDisplayableToolCall(item: ToolCallItem): boolean {
  const text = [item.name, item.displayName, item.stepKey, item.kind].map((value) => String(value || '').toLowerCase()).join('\n');
  if (/web\.result|source\.attached|result\.compose|source\.aggregate/.test(text)) return false;
  if (/整理公开来源|挂载来源|整理来源|结果整理/.test(text)) return false;
  return true;
}

function shouldShowRawItem(item: RawInfoItem): boolean {
  if (item.id === 'runtime-projection') return false;
  if (item.id === 'trace-url') return false;
  if (/工具调用/.test(item.label)) return false;
  return true;
}

export function RawInfoTab({ view }: RawInfoTabProps) {
  const { rawInfo } = view;
  const c = useThemeColors();
  const promptHits = promptHitsFromView(view);
  const visibleRawItems = rawInfo.items.filter(shouldShowRawItem);
  const hasTrace = Boolean(traceUrlFromView(view));
  if (visibleRawItems.length === 0 && view.execution.toolCalls.length === 0 && runtimeLogRows(view).length === 0 && promptHits.length === 0 && !hasTrace) {
    return <EmptyState description={view.emptyStates.rawInfo} />;
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <RuntimeLogStream view={view} />

      {promptHits.length > 0 && (
        <section style={{ border: `1px solid ${c.chat.border.subtle}`, borderRadius: c.chat.radius.section, padding: 12, background: c.chat.surface.panel }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: c.chat.text.primary }}>提示词</div>
          <div style={{ marginTop: 8, display: 'grid', gap: 8 }}>
            {promptHits.map((item, index) => {
              const promptKey = String(item.summary || item.key || item.title || `提示词 ${index + 1}`);
              return (
                <div key={String(item.key || index)} style={{ display: 'grid', gap: 3, fontSize: 12, color: c.chat.text.secondary, lineHeight: 1.65 }}>
                  <a
                    href="https://dataki.dobest.com"
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: c.accent, textDecoration: 'none', fontWeight: 400, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {promptKey}
                  </a>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {visibleRawItems.length > 0 && (
        <Collapse
          size="small"
          items={visibleRawItems.map((item) => ({
            key: item.id,
            label: (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <span>{item.label}</span>
              </div>
            ),
            children: (
              <div style={{ display: 'grid', gap: 8 }}>
                {item.summary && <div style={{ fontSize: 12, color: c.chat.text.secondary }}>{item.summary}</div>}
                <SafeCodeBlock
                  content={formatRawValue(item)}
                  language={item.kind === 'text' ? 'text' : 'json'}
                  mode="panel"
                  title={item.label}
                  showLineNumbers
                />
                {item.source && <div style={{ fontSize: 12, color: c.chat.text.secondary }}>来源：{item.source}</div>}
              </div>
            ),
          }))}
        />
      )}
    </div>
  );
}

export default RawInfoTab;

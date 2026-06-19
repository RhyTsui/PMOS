'use client';

import { useMemo, useState } from 'react';
import { Button, Modal, Tooltip } from 'antd';
import type { MessageDisclosureView } from '@/contracts/disclosure';
import {
  buildRuntimeDisclosurePresentation,
  runtimeSourceUrl,
  type RuntimePresentationLog,
  type RuntimePresentationPrompt,
  type RuntimePresentationRow,
} from '@/contracts/disclosure/runtime-presentation';
import SafeCodeBlock from '@/components/ui/SafeCodeBlock';
import { useThemeColors } from '@/hooks/useTheme';
import { formatDisclosureText } from '@/lib/chat-runtime/runtime-disclosure';
import { formatToolCallPayloadText } from './tool-call-payload-format';

// 注入动画样式
const animationStyles = `
  @keyframes ping {
    75%, 100% {
      transform: scale(2);
      opacity: 0;
    }
  }
  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
`;

type ExecutionSource = MessageDisclosureView['evidence']['sources'][number];
type RuntimeExtraModal =
  | { kind: 'logs'; title: string; items: RuntimePresentationLog[] }
  | { kind: 'json'; title: string; value: unknown };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function statusColor(status: string): string {
  const text = status.toLowerCase();
  if (/fail|error|warn|partial|missing|retry/.test(text)) return '#f59e0b';
  if (/running|pending|queued|waiting/.test(text)) return '#94a3b8';
  return '#22c55e';
}

function formatDuration(value?: number): string {
  if (!value || value < 0) return '';
  const seconds = value / 1000;
  return seconds >= 10 ? `${Math.round(seconds)}s` : `${seconds.toFixed(1)}s`;
}

function safeJson(value: unknown): string {
  try {
    const text = JSON.stringify(value, null, 2);
    return typeof text === 'string' ? text : String(value);
  } catch {
    return String(value);
  }
}

function dedupeSourcesById(sources: ExecutionSource[]): ExecutionSource[] {
  const seen = new Set<string>();
  const result: ExecutionSource[] = [];
  for (const source of sources) {
    const id = source.id;
    if (!id) {
      result.push(source);
      continue;
    }
    if (seen.has(id)) continue;
    seen.add(id);
    result.push(source);
  }
  return result;
}

function SourceList({ sources }: { sources: ExecutionSource[] }) {
  const uniqueSources = useMemo(() => dedupeSourcesById(sources), [sources]);
  if (!uniqueSources.length) return null;
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      {uniqueSources.map((source) => {
        const metadata = isRecord(source.metadata) ? source.metadata : {};
        const iconUrl = typeof metadata.iconUrl === 'string' ? metadata.iconUrl : '';
        const url = runtimeSourceUrl(source);
        const siteName = typeof metadata.siteName === 'string'
          ? metadata.siteName
          : typeof metadata.publisher === 'string'
            ? metadata.publisher
            : typeof metadata.source === 'string'
              ? metadata.source
              : '';
        const title = source.title || siteName || source.id || '公开来源';
        return (
          <div key={source.id} style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, fontSize: 12, lineHeight: 1.65 }}>
            {iconUrl ? <img src={iconUrl} alt="" style={{ width: 22, height: 22, objectFit: 'contain', flexShrink: 0, borderRadius: 4 }} /> : null}
            {url ? (
              <a href={url} target="_blank" rel="noreferrer" style={{ color: '#64748b', textDecoration: 'none', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'normal', wordBreak: 'break-word', fontSize: 11 }}>
                {title}
              </a>
            ) : (
              <span style={{ color: '#64748b', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'normal', wordBreak: 'break-word', fontSize: 11 }}>{title}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function runtimeLogTime(item: RuntimePresentationLog): string {
  const raw = item.timestamp;
  const date = raw ? new Date(raw) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function runtimeStatusLabel(status: string): string {
  const text = String(status || '').toLowerCase();
  if (/fail|error/.test(text)) return '失败';
  if (/reject|block|deny/.test(text)) return '拒绝';
  if (/warn|partial|missing|retry/.test(text)) return '警告';
  if (/running|pending|queued|waiting/.test(text)) return '执行中';
  if (/success|succeed|complete|done|pass/.test(text)) return '成功';
  return status || '记录';
}

function runtimeLogSummary(item: RuntimePresentationLog): string {
  return String(item.summary || '').trim();
}

function runtimeLogTimeValue(item: RuntimePresentationLog): number {
  const time = item.timestamp ? new Date(item.timestamp).getTime() : NaN;
  return Number.isFinite(time) ? time : Number.MAX_SAFE_INTEGER;
}

function RuntimeLogStream({
  items,
  onOpenJson,
}: {
  items: RuntimePresentationLog[];
  onOpenJson: (item: RuntimePresentationLog) => void;
}) {
  const c = useThemeColors();
  if (!items.length) return <div style={{ fontSize: 12, color: c.chat.text.secondary }}>暂无运行日志。</div>;
  const sortedItems = [...items].sort((a, b) => runtimeLogTimeValue(a) - runtimeLogTimeValue(b));
  const columnTemplate = '74px 64px minmax(118px, 0.78fr) minmax(260px, 1.6fr) 48px';
  const headerCell = {
    fontSize: 11,
    color: c.chat.text.muted,
    lineHeight: 1.6,
    whiteSpace: 'nowrap',
  } as const;
  return (
    <div style={{ overflowX: 'auto', padding: '2px 0 4px' }}>
      <div style={{ minWidth: 720, display: 'grid', gap: 0 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: columnTemplate,
            gap: 12,
            alignItems: 'center',
            padding: '0 0 8px',
            borderBottom: `0.5px solid ${c.chat.border.subtle}`,
          }}
        >
          <div style={headerCell}>时间</div>
          <div style={headerCell}>状态</div>
          <div style={headerCell}>步骤</div>
          <div style={headerCell}>步骤描述</div>
          <div style={{ ...headerCell, textAlign: 'right' }}>JSON</div>
        </div>
        {sortedItems.map((item) => {
          const time = runtimeLogTime(item);
          const summary = formatDisclosureText(runtimeLogSummary(item));
          const status = runtimeStatusLabel(item.status);
          const dotColor = statusColor(item.status);
          return (
            <div
              key={item.key}
              style={{
                display: 'grid',
                gridTemplateColumns: columnTemplate,
                gap: 12,
                alignItems: 'center',
                minHeight: 36,
                padding: '7px 0',
              }}
            >
              <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace', fontSize: 11, color: c.chat.text.muted, lineHeight: 1.6, whiteSpace: 'nowrap' }}>{time || '-'}</div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: 999, background: dotColor, flexShrink: 0 }} />
                <span style={{ fontSize: 11.5, color: c.chat.text.secondary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{status}</span>
              </div>
              <div style={{ fontSize: 12, color: c.chat.text.secondary, lineHeight: 1.6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.title}>
                {item.title}
              </div>
              <div style={{ fontSize: 11.5, color: c.chat.text.muted, lineHeight: 1.6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={summary}>
                {summary || '-'}
              </div>
              <Button type="text" size="small" aria-label={`查看${item.title} JSON`} onClick={() => onOpenJson(item)} style={{ width: 40, height: 24, fontSize: 10, fontWeight: 700, color: c.chat.text.muted, padding: 0, justifySelf: 'end' }}>
                JSON
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RuntimeExtraButton({ title, count, onClick }: { title: string; count: number; onClick: () => void }) {
  const c = useThemeColors();
  if (!count) return null;
  return (
    <Button
      type="text"
      size="small"
      onClick={onClick}
      style={{
        height: 34,
        padding: '0 17px',
        color: c.chat.text.secondary,
        border: `1px solid rgba(148, 163, 184, 0.34)`,
        background: 'rgba(248, 250, 252, 0.84)',
        fontSize: 13,
        fontWeight: 400,
        minWidth: 106,
        borderRadius: 8,
        justifyContent: 'center',
        textAlign: 'center',
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
      }}
    >
      {title}
    </Button>
  );
}

function RuntimeDot({ status, showLine, color }: { status: string; showLine: boolean; color: string }) {
  const dotColor = statusColor(status);
  const isRunning = /running|pending|queued|waiting/i.test(status);

  return (
    <div style={{ display: 'grid', justifyItems: 'center', position: 'relative' }}>
      {/* 执行中的扩散波纹动画 */}
      {isRunning && (
        <>
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: 7,
              width: 7,
              height: 7,
              borderRadius: 999,
              background: dotColor,
              opacity: 0.6,
              animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
            }}
          />
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: 7,
              width: 7,
              height: 7,
              borderRadius: 999,
              background: dotColor,
              opacity: 0.4,
              animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
              animationDelay: '0.5s',
            }}
          />
        </>
      )}
      {/* 主体圆点 */}
      <span
        aria-hidden="true"
        style={{
          width: 7,
          height: 7,
          marginTop: 7,
          borderRadius: 999,
          background: dotColor,
          boxShadow: `0 0 0 3px ${dotColor}1f`,
          position: 'relative',
          zIndex: 1,
          animation: isRunning ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : undefined,
        }}
      />
      {showLine && <span aria-hidden="true" style={{ position: 'absolute', top: 18, bottom: -5, width: 1, background: color }} />}
    </div>
  );
}

export function RuntimeTimelinePanel({ view }: { view: MessageDisclosureView }) {
  const c = useThemeColors();
  const [activeRow, setActiveRow] = useState<RuntimePresentationRow | null>(null);
  const [activeExtra, setActiveExtra] = useState<RuntimeExtraModal | null>(null);
  const presentation = useMemo(() => buildRuntimeDisclosurePresentation(view), [view]);
  const rows = presentation.primaryRows;
  const runtimeLogs = presentation.runtimeLogs;
  const promptItems: RuntimePresentationPrompt[] = presentation.promptHits;
  if (!rows.length) return <div style={{ fontSize: 12, color: c.chat.text.secondary }}>当前没有可展示的运行过程信息。</div>;

  return (
    <>
      {/* 注入动画样式 */}
      <style dangerouslySetInnerHTML={{ __html: animationStyles }} />
      <div style={{ display: 'grid', gap: 0, background: '#fff' }}>
        {rows.map((row, index) => {
          const duration = formatDuration(row.durationMs);
          const hasDetails = Boolean(row.detailSections?.length);
          const hasInfo = Boolean(row.summary || row.sources?.length);
          const last = index === rows.length - 1;
          return (
            <div
              key={row.key}
              style={{
                display: 'grid',
                gridTemplateColumns: '18px minmax(0, 1fr)',
                gap: 10,
                paddingBottom: last ? 0 : 18,
                marginBottom: 0,
              }}
            >
              <RuntimeDot status={row.status} showLine={!last} color={c.chat.border.subtle} />
              <div style={{ display: 'grid', gap: hasInfo ? 9 : 0, minWidth: 0 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 34px', alignItems: 'center', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 650, color: c.chat.text.primary, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.title}</span>
                    {duration ? <span style={{ flexShrink: 0, fontSize: 11, color: c.chat.text.muted }}>{duration}</span> : null}
                  </div>
                  {hasDetails ? (
                    <Tooltip title="查看 JSON">
                      <Button type="text" size="small" aria-label={`查看${row.title} JSON`} onClick={() => setActiveRow(row)} style={{ width: 34, height: 24, fontSize: 10, fontWeight: 700, color: c.chat.text.muted, padding: 0, justifySelf: 'end' }}>
                        JSON
                      </Button>
                    </Tooltip>
                  ) : <span />}
                </div>
                {hasInfo ? (
                  <div style={{ borderLeft: '2px solid rgba(148, 163, 184, 0.18)', paddingLeft: 10, display: 'grid', gap: 6 }}>
                    {row.summary ? <div style={{ fontSize: 11.5, color: c.chat.text.muted, lineHeight: 1.7, whiteSpace: 'pre-line' }}>{formatDisclosureText(row.summary)}</div> : null}
                    <SourceList sources={row.sources || []} />
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', paddingTop: 0, marginTop: 28 }}>
          <RuntimeExtraButton title="运行日志" count={runtimeLogs.length} onClick={() => setActiveExtra({ kind: 'logs', title: '运行日志', items: runtimeLogs })} />
          <RuntimeExtraButton title="提示词" count={promptItems.length} onClick={() => setActiveExtra({ kind: 'json', title: '提示词', value: promptItems.map((item) => item.value) })} />
        </div>
      </div>
      <Modal open={Boolean(activeRow)} title={activeRow?.title || 'JSON'} footer={null} centered width="min(960px, calc(100vw - 40px))" onCancel={() => setActiveRow(null)} destroyOnHidden>
        <div style={{ display: 'grid', gap: 12 }}>
          {(activeRow?.detailSections || []).map((section) => (
            <SafeCodeBlock key={section.title} content={section.title.includes('参数') ? formatToolCallPayloadText(section.value) : safeJson(section.value)} language="json" mode="panel" title={section.title} showLineNumbers />
          ))}
        </div>
      </Modal>
      <Modal open={Boolean(activeExtra)} title={activeExtra?.title || '详情'} footer={null} centered width="min(960px, calc(100vw - 40px))" onCancel={() => setActiveExtra(null)} destroyOnHidden>
        {activeExtra?.kind === 'logs' ? (
          <RuntimeLogStream items={activeExtra.items} onOpenJson={(item) => setActiveExtra({ kind: 'json', title: item.title, value: item.value })} />
        ) : (
          <SafeCodeBlock content={safeJson(activeExtra?.value)} language="json" mode="panel" title={activeExtra?.title || '详情'} showLineNumbers />
        )}
      </Modal>
    </>
  );
}

export default RuntimeTimelinePanel;

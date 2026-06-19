'use client';

import type React from 'react';
import type { MessageDisclosureView } from '@/contracts/disclosure';
import { useThemeColors } from '@/hooks/useTheme';
import { formatDisclosureText } from '@/lib/chat-runtime/runtime-disclosure';
import { EmptyState } from './EmptyState';

interface ExecutionTabProps {
  view: MessageDisclosureView;
}

type ExecutionStep = MessageDisclosureView['execution']['steps'][number];
type ExecutionSource = MessageDisclosureView['evidence']['sources'][number];
type QualityItem = MessageDisclosureView['qualityChecks']['items'][number];
type FieldItem = MessageDisclosureView['fields']['items'][number];

function statusTone(status: string): 'done' | 'running' | 'failed' {
  const text = status.toLowerCase();
  if (text.includes('fail') || text.includes('error') || text.includes('retry') || text.includes('recover') || text.includes('partial') || text.includes('warn') || text.includes('missing')) return 'failed';
  if (text.includes('wait') || text.includes('running') || text.includes('pending') || text.includes('queued')) return 'running';
  return 'done';
}

function statusColor(status: string): string {
  const tone = statusTone(status);
  if (tone === 'done') return '#22c55e';
  if (tone === 'failed') return '#f59e0b';
  return '#94a3b8';
}

function terminalStatus(status: string): boolean {
  const text = status.toLowerCase();
  return ['success', 'succeeded', 'completed', 'complete', 'done', 'degraded', 'blocked'].some((item) => text.includes(item));
}

function displayStatus(status: string, executionStatus: string): string {
  if (status.toLowerCase() === 'running' && terminalStatus(executionStatus)) return 'succeeded';
  return status || 'unknown';
}

function statusText(status: string): string {
  const text = status.toLowerCase();
  if (text.includes('succeed') || text.includes('success') || text.includes('complete') || text.includes('done')) return '已完成';
  if (text.includes('running')) return '进行中';
  if (text.includes('wait') || text.includes('pending')) return '等待中';
  if (text.includes('partial') || text.includes('degraded')) return '部分完成';
  if (text.includes('fail') || text.includes('error')) return '未完成';
  if (text.includes('blocked')) return '已阻断';
  return status || '已记录';
}

function StatusLight({ status }: { status: string }) {
  const color = statusColor(status);
  return (
    <span
      aria-hidden="true"
      title={statusText(status)}
      style={{
        width: 7,
        height: 7,
        borderRadius: 999,
        display: 'inline-block',
        flexShrink: 0,
        background: color,
        boxShadow: `0 0 0 3px ${color}1f`,
      }}
    />
  );
}

function formatDuration(value?: number): string {
  if (!value || value < 0) return '';
  const seconds = value / 1000;
  return seconds >= 10 ? `${Math.round(seconds)}s` : `${seconds.toFixed(1)}s`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function projectionFromView(view: MessageDisclosureView): Record<string, unknown> | null {
  const metadata = isRecord(view.metadata) ? view.metadata : {};
  const projection = metadata.message_runtime_projection;
  return isRecord(projection) ? projection : null;
}

function renderConsumptionFromView(view: MessageDisclosureView): Array<Record<string, unknown>> {
  const projection = projectionFromView(view);
  return Array.isArray(projection?.render_consumption) ? projection.render_consumption.filter(isRecord) : [];
}

function sourceUrl(source: ExecutionSource): string {
  if (source.url) return source.url;
  const locator = source.locator;
  if (locator && locator.kind === 'url') return String(locator.value || '');
  return '';
}

function sourceMetaText(source: ExecutionSource): string {
  const metadata = isRecord(source.metadata) ? source.metadata : {};
  return [
    source.type,
    source.title,
    metadata.source_type,
    metadata.sourceType,
    metadata.provider,
    metadata.source,
    metadata.kind,
  ].map((item) => String(item || '').toLowerCase()).join('\n');
}

function isKnowledgeSource(source: ExecutionSource): boolean {
  const text = sourceMetaText(source);
  return /knowledge|dataki|知识库/.test(text);
}

function sourceDisplayTitle(source: ExecutionSource, url: string): string {
  const title = source.title || url || source.id;
  return isKnowledgeSource(source) ? `Dataki知识库 - ${title}` : title;
}

function sourceIdsForStep(step: ExecutionStep): Set<string> {
  return new Set([...(step.sourceRefs || []), ...(step.evidenceRefs || [])].filter(Boolean));
}

function sourceStepMatch(step: ExecutionStep) {
  const text = `${step.title}\n${step.summary || ''}\n${step.kind || ''}`.toLowerCase();
  return /source|web|search|fetch/.test(text) || /来源|检索|查询|获取/.test(text);
}

function shouldAttachFallbackSources(step: ExecutionStep, index: number, sources: ExecutionSource[], firstSourceStepIndex: number) {
  if (!sources.length) return false;
  return index === firstSourceStepIndex && sourceStepMatch(step);
}

function sourcesForStep(step: ExecutionStep, index: number, sources: ExecutionSource[], firstSourceStepIndex: number) {
  const ids = sourceIdsForStep(step);
  const matched = ids.size > 0
    ? sources.filter((source) => ids.has(source.id))
    : [];
  return matched.length ? matched : shouldAttachFallbackSources(step, index, sources, firstSourceStepIndex) ? sources : [];
}

function SourceList({ sources }: { sources: ExecutionSource[] }) {
  if (!sources.length) return null;
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      {sources.map((source) => {
        const url = sourceUrl(source);
        const knowledgeSource = isKnowledgeSource(source);
        const title = sourceDisplayTitle(source, url);
        return (
          <div key={source.id} style={{ display: 'grid', gap: 3, fontSize: 12, lineHeight: 1.65 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              {knowledgeSource && (
                <img
                  src="/dataki-logo.png"
                  alt="Dataki"
                  style={{ width: 22, height: 22, objectFit: 'contain', flexShrink: 0, borderRadius: 4 }}
                />
              )}
              {url ? (
                <a href={url} target="_blank" rel="noreferrer" style={{ color: '#2563eb', textDecoration: 'none', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {title}
                </a>
              ) : (
                <span style={{ color: '#0f172a', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function QualityCheckList({ items }: { items: QualityItem[] }) {
  const warnings = items.filter((item) => statusTone(item.status) === 'failed');
  if (!warnings.length) return null;
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {warnings.map((item) => (
        <div key={item.id} style={{ display: 'grid', gap: 3, fontSize: 12, color: '#475569', lineHeight: 1.65 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontWeight: 600, color: '#0f172a' }}>{item.label}</span>
            <StatusLight status={item.status} />
          </div>
          {item.summary && <span>{formatDisclosureText(item.summary)}</span>}
        </div>
      ))}
    </div>
  );
}

function resultQualityItems(items: QualityItem[]): QualityItem[] {
  return items.filter((item) => String(item.id || '').includes('render-contract') || /渲染|结果/.test(item.label));
}

function dataQualityItems(items: QualityItem[]): QualityItem[] {
  const resultIds = new Set(resultQualityItems(items).map((item) => item.id));
  return items.filter((item) => !resultIds.has(item.id));
}

function FieldCheckList({ items }: { items: FieldItem[] }) {
  if (!items.length) return null;
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {items.slice(0, 8).map((item) => (
        <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: 12, color: '#475569' }}>
          <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label || item.key}</span>
          <StatusLight status={item.status || 'unknown'} />
        </div>
      ))}
    </div>
  );
}

function RenderConsumptionList({ items }: { items: Array<Record<string, unknown>> }) {
  const warnings = items.filter((item) => item.consumed === false && !['empty', 'deduped'].includes(String(item.status || '')));
  if (!warnings.length) return null;
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {warnings.slice(0, 8).map((item, index) => {
        return (
          <div key={`${String(item.renderer || 'renderer')}-${String(item.field || index)}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: 12, color: '#475569' }}>
            <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              未渲染：{String(item.renderer || '结果组件')} / {String(item.field || '字段')}
            </span>
            <StatusLight status="warn" />
          </div>
        );
      })}
    </div>
  );
}

function ResultCheckList({ renderItems, qualityItems }: { renderItems: Array<Record<string, unknown>>; qualityItems: QualityItem[] }) {
  if (!renderItems.length && !qualityItems.length) return null;
  const renderWarnings = renderItems.filter((item) => item.consumed === false && !['empty', 'deduped'].includes(String(item.status || '')));
  const qualityWarnings = qualityItems.filter((item) => statusTone(item.status) === 'failed');
  if (!renderWarnings.length && !qualityWarnings.length) return null;
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {qualityWarnings.map((item) => (
        <div key={item.id} style={{ display: 'grid', gap: 3, fontSize: 12, color: '#475569', lineHeight: 1.65 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontWeight: 600, color: '#0f172a' }}>{item.label}</span>
            <StatusLight status={item.status} />
          </div>
          {item.summary && <span>{formatDisclosureText(item.summary)}</span>}
        </div>
      ))}
      <RenderConsumptionList items={renderItems} />
    </div>
  );
}

function isSystemStep(step: ExecutionStep): boolean {
  const text = `${step.id || ''}\n${step.title || ''}\n${step.kind || ''}`.toLowerCase();
  return /trace|prompt|contract|projection|observation|web\.result|source\.attached|source\.aggregate/.test(text)
    || /观测|投影|契约|提示词|整理公开来源|挂载来源|整理来源|结果整理/.test(text);
}

function isBoilerplateSummary(value?: string): boolean {
  const text = String(value || '').trim();
  return !text
    || /^已完成公开信息查询[。.]?$/.test(text)
    || /^已获取\s*\d+\s*条公开来源[。.]?$/.test(text);
}

function displayStepTitle(step: ExecutionStep): string {
  const text = `${step.id || ''}\n${step.title || ''}\n${step.kind || ''}`.toLowerCase();
  if (/route|routing/.test(text) || /确定路由|路由观测|意图路由/.test(text)) return '意图路由';
  return step.title;
}

function userFacingSteps(steps: ExecutionStep[], sources: ExecutionSource[]) {
  const firstSourceStepIndex = steps.findIndex(sourceStepMatch);
  const projected = steps.map((step, index) => {
    const stepSources = sourcesForStep(step, index, sources, firstSourceStepIndex);
    const hasVisibleContent = !isBoilerplateSummary(step.summary) || stepSources.length > 0;
    return { step, index, stepSources, hasVisibleContent };
  });
  const visible = projected.filter((item) => item.hasVisibleContent && !isSystemStep(item.step));
  return visible.length ? visible : projected.filter((item) => item.hasVisibleContent);
}

function TimelineDot({ status, showLine, color }: { status: string; showLine: boolean; color: string }) {
  const dotColor = statusColor(status);
  return (
    <div style={{ display: 'grid', justifyItems: 'center', position: 'relative' }}>
      <span
        style={{
          width: 7,
          height: 7,
          marginTop: 5,
          borderRadius: 999,
          background: dotColor,
          boxShadow: `0 0 0 3px ${dotColor}1f`,
        }}
      />
      {showLine && (
        <span
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

function TimelineRow({
  title,
  status,
  duration,
  last,
  children,
}: {
  title: string;
  status: string;
  duration?: string;
  last: boolean;
  children?: React.ReactNode;
}) {
  const c = useThemeColors();
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '18px minmax(0, 1fr)',
        gap: 10,
        paddingBottom: last ? 0 : 14,
        position: 'relative',
      }}
    >
      <TimelineDot status={status} showLine={!last} color={c.chat.border.subtle} />
      <div style={{ display: 'grid', gap: 7, minWidth: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: duration ? 'minmax(0, 1fr) auto' : 'minmax(0, 1fr)', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 560, color: c.chat.text.secondary }}>{title}</div>
          {duration && <span style={{ minWidth: 34, textAlign: 'right', fontSize: 11, color: c.chat.text.muted }}>{duration}</span>}
        </div>
        {children}
      </div>
    </div>
  );
}

export function ExecutionTab({ view }: ExecutionTabProps) {
  const c = useThemeColors();
  const { execution } = view;
  const hasContent = execution.steps.length > 0 || execution.toolCalls.length > 0 || Boolean(execution.summary);
  const renderConsumption = renderConsumptionFromView(view);
  const resultChecks = resultQualityItems(view.qualityChecks.items);
  const qualityChecks = dataQualityItems(view.qualityChecks.items);
  const steps = userFacingSteps(execution.steps, view.evidence.sources);
  const checkRows = [
    resultChecks.length > 0 || renderConsumption.length > 0 ? {
      key: 'result-checks',
      title: '结果检查',
      status: resultChecks.some((item) => statusTone(item.status) === 'failed') || renderConsumption.some((item) => item.consumed === false && !['empty', 'deduped'].includes(String(item.status || ''))) ? 'warn' : 'success',
      node: <ResultCheckList renderItems={renderConsumption} qualityItems={resultChecks} />,
    } : null,
    qualityChecks.length > 0 ? {
      key: 'quality-checks',
      title: '质量检查',
      status: qualityChecks.some((item) => statusTone(item.status) === 'failed') ? 'warn' : 'success',
      node: <QualityCheckList items={qualityChecks} />,
    } : null,
    view.fields.items.length > 0 ? {
      key: 'field-checks',
      title: '字段检查',
      status: view.fields.items.some((item) => statusTone(item.status || '') === 'failed') ? 'warn' : 'success',
      node: <FieldCheckList items={view.fields.items} />,
    } : null,
  ].filter(Boolean) as Array<{ key: string; title: string; status: string; node: React.ReactNode }>;
  const totalRows = steps.length + checkRows.length;

  if (!hasContent) {
    return <EmptyState description={view.emptyStates.execution} />;
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {totalRows > 0 && (
        <section
          style={{
            border: `1px solid ${c.chat.border.subtle}`,
            borderRadius: c.chat.radius.section,
            padding: 12,
            background: c.chat.surface.panel,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: c.chat.text.primary, marginBottom: 10 }}>运行时</div>
          <div style={{ display: 'grid', gap: 0 }}>
            {steps.map(({ step, stepSources }, index) => {
              const normalizedStatus = displayStatus(String(step.status || ''), String(execution.status || ''));
              const last = index === totalRows - 1;
              return (
                <TimelineRow
                  key={step.id}
                  title={displayStepTitle(step)}
                  status={normalizedStatus}
                  duration={formatDuration(step.durationMs)}
                  last={last}
                >
                  {!isBoilerplateSummary(step.summary) && (
                    <div style={{ fontSize: 12, color: c.chat.text.secondary, lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                        {formatDisclosureText(step.summary || '')}
                    </div>
                  )}
                  <SourceList sources={stepSources} />
                </TimelineRow>
              );
            })}
            {checkRows.map((row, index) => (
              <TimelineRow
                key={row.key}
                title={row.title}
                status={row.status}
                last={steps.length + index === totalRows - 1}
              >
                {row.node}
              </TimelineRow>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default ExecutionTab;

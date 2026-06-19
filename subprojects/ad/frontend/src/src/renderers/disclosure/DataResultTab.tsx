'use client';

import { Tag } from 'antd';
import type { MessageDisclosureView } from '@/contracts/disclosure';
import { EmptyState } from './EmptyState';

interface DataResultTabProps {
  view: MessageDisclosureView;
}

function getProjection(view: MessageDisclosureView): Record<string, unknown> | null {
  const metadata = view.metadata && typeof view.metadata === 'object' ? view.metadata as Record<string, unknown> : {};
  const projection = metadata.message_runtime_projection;
  return projection && typeof projection === 'object' ? projection as Record<string, unknown> : null;
}

export function DataResultTab({ view }: DataResultTabProps) {
  const projection = getProjection(view);
  const summary = projection?.view_model_summary && typeof projection.view_model_summary === 'object'
    ? projection.view_model_summary as Record<string, unknown>
    : null;
  const answerOrigin = projection?.answer_origin && typeof projection.answer_origin === 'object'
    ? projection.answer_origin as Record<string, unknown>
    : null;
  const traceUrl = typeof projection?.trace_url === 'string' ? projection.trace_url : '';

  if (!projection && !traceUrl) {
    return <EmptyState description="当前没有可展示的数据结果。" />;
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {traceUrl && (
        <section style={{ border: '1px solid rgba(148, 163, 184, 0.22)', borderRadius: 12, padding: 12, background: '#fff' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>原始链接</div>
          <a href={traceUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 6, fontSize: 12, color: '#2563eb', wordBreak: 'break-all' }}>
            {traceUrl}
          </a>
        </section>
      )}

      {answerOrigin && (
        <section style={{ border: '1px solid rgba(148, 163, 184, 0.22)', borderRadius: 12, padding: 12, background: '#fff' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>回答来源</div>
          <div style={{ marginTop: 8, display: 'grid', gap: 6, fontSize: 12, color: '#334155', lineHeight: 1.7 }}>
            <div>来源：{String(answerOrigin.source || '-')}</div>
            <div>模板：{String(answerOrigin.composer_name || '-')}</div>
            <div>模型：{String(answerOrigin.model_name || '-')}</div>
            <div>模型 Span：{String(answerOrigin.model_span_id || '-')}</div>
            <div>外部 Trace：{String(answerOrigin.external_trace_id || '-')}</div>
            {typeof answerOrigin.summary === 'string' && answerOrigin.summary && (
              <div>说明：{answerOrigin.summary}</div>
            )}
          </div>
        </section>
      )}

      {summary && (
        <section style={{ border: '1px solid rgba(148, 163, 184, 0.22)', borderRadius: 12, padding: 12, background: '#fff' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>数据结果摘要</div>
          <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
            {[
              ['类型', summary.type],
              ['状态', summary.status],
              ['表格', summary.table_count],
              ['图表', summary.chart_count],
              ['动作', summary.action_count],
            ].map(([label, value]) => (
              <div key={String(label)} style={{ border: '1px solid rgba(226, 232, 240, 1)', borderRadius: 10, padding: 10, background: '#f8fafc' }}>
                <div style={{ fontSize: 12, color: '#64748b' }}>{String(label)}</div>
                <div style={{ marginTop: 4, fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{String(value ?? '-')}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <Tag color={summary.has_answer_markdown ? 'green' : 'default'} style={{ margin: 0, borderRadius: 999 }}>答案文本</Tag>
            <Tag color={summary.has_business_summary ? 'green' : 'default'} style={{ margin: 0, borderRadius: 999 }}>业务摘要</Tag>
            <Tag color={summary.evidence_available ? 'blue' : 'default'} style={{ margin: 0, borderRadius: 999 }}>有依据</Tag>
          </div>
          {typeof summary.empty_reason === 'string' && summary.empty_reason && (
            <div style={{ marginTop: 8, fontSize: 12, color: '#475569', lineHeight: 1.7 }}>
              空态原因：{summary.empty_reason}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export default DataResultTab;

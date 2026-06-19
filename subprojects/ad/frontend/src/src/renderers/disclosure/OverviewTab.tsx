'use client';

import { Tag } from 'antd';
import type { MessageDisclosureView } from '@/contracts/disclosure';
import { EmptyState } from './EmptyState';

interface OverviewTabProps {
  view: MessageDisclosureView;
}

const toneColor: Record<string, string> = {
  success: '#16a34a',
  warning: '#d97706',
  danger: '#dc2626',
  neutral: '#64748b',
  default: '#0f172a',
};

export function OverviewTab({ view }: OverviewTabProps) {
  const { overview } = view;
  const hasContent = overview.metrics.length > 0 || overview.highlights.length > 0;

  if (!hasContent) {
    return <EmptyState description={view.emptyStates.overview} />;
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <section style={{ border: '1px solid rgba(148, 163, 184, 0.22)', borderRadius: 12, padding: 14, background: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{overview.title}</div>
            <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.7, color: '#475569' }}>{overview.summary}</div>
          </div>
          <Tag color="blue" style={{ margin: 0, borderRadius: 999 }}>{overview.status}</Tag>
        </div>

        {overview.badges.length > 0 && (
          <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {overview.badges.map((badge) => (
              <Tag key={badge} style={{ margin: 0, borderRadius: 999 }}>{badge}</Tag>
            ))}
          </div>
        )}
      </section>

      {overview.metrics.length > 0 && (
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
          {overview.metrics.map((metric) => (
            <div key={`${metric.label}-${metric.value}`} style={{ border: '1px solid rgba(148, 163, 184, 0.22)', borderRadius: 12, padding: 12, background: '#fff' }}>
              <div style={{ fontSize: 12, color: '#64748b' }}>{metric.label}</div>
              <div style={{ marginTop: 6, fontSize: 18, fontWeight: 700, color: toneColor[metric.tone || 'default'] || '#0f172a' }}>
                {metric.value}
              </div>
              {metric.detail && <div style={{ marginTop: 4, fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>{metric.detail}</div>}
            </div>
          ))}
        </section>
      )}

      {overview.highlights.length > 0 && (
        <section style={{ border: '1px solid rgba(148, 163, 184, 0.22)', borderRadius: 12, padding: 14, background: '#fff' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>要点</div>
          <ul style={{ margin: 0, paddingLeft: 18, color: '#334155', lineHeight: 1.8, fontSize: 13 }}>
            {overview.highlights.map((item, index) => (
              <li key={`${index}-${item}`}>{item}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export default OverviewTab;

'use client';

import { Tag } from 'antd';
import type { MessageDisclosureView } from '@/contracts/disclosure';
import { EmptyState } from './EmptyState';

interface QualityCheckTabProps {
  view: MessageDisclosureView;
}

const colorByStatus: Record<string, string> = {
  pass: 'green',
  warn: 'gold',
  fail: 'red',
  info: 'blue',
  pending: 'default',
};

export function QualityCheckTab({ view }: QualityCheckTabProps) {
  const { qualityChecks } = view;
  if (qualityChecks.items.length === 0) {
    return <EmptyState description={view.emptyStates.qualityChecks} />;
  }

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {qualityChecks.items.map((item) => (
        <section key={item.id} style={{ border: '1px solid rgba(148, 163, 184, 0.22)', borderRadius: 12, padding: 12, background: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{item.label}</div>
              <div style={{ marginTop: 4, fontSize: 12, color: '#475569', lineHeight: 1.6 }}>{item.summary}</div>
            </div>
            <Tag color={colorByStatus[item.status] || 'default'} style={{ margin: 0, borderRadius: 999 }}>{item.status}</Tag>
          </div>
          {item.detail && <div style={{ marginTop: 8, fontSize: 12, color: '#64748b', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{item.detail}</div>}
          {item.actionHint && <div style={{ marginTop: 8, fontSize: 12, color: '#0f172a', lineHeight: 1.7 }}>{item.actionHint}</div>}
        </section>
      ))}
    </div>
  );
}

export default QualityCheckTab;

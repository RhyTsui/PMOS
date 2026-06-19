'use client';

import { Tag } from 'antd';
import type { MessageDisclosureView } from '@/contracts/disclosure';
import { EmptyState } from './EmptyState';

interface EvidenceTabProps {
  view: MessageDisclosureView;
}

export function EvidenceTab({ view }: EvidenceTabProps) {
  const { evidence } = view;
  const hasContent = evidence.sources.length > 0 || evidence.evidenceRefs.length > 0;

  if (!hasContent) {
    return <EmptyState description={view.emptyStates.evidence} />;
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <section style={{ border: '1px solid rgba(148, 163, 184, 0.22)', borderRadius: 12, padding: 14, background: '#fff' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>来源</div>
        <div style={{ display: 'grid', gap: 8 }}>
          {evidence.sources.map((item) => (
            <div key={item.id} style={{ border: '1px solid rgba(226, 232, 240, 1)', borderRadius: 10, padding: 10, background: '#f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{item.title}</div>
                <Tag style={{ margin: 0, borderRadius: 999 }}>{item.type}</Tag>
              </div>
              <div style={{ marginTop: 6, display: 'grid', gap: 4, fontSize: 12, color: '#475569', lineHeight: 1.6 }}>
                {item.summary && <div>{item.summary}</div>}
                {item.detail && <div>{item.detail}</div>}
                {item.retrievedAt && <div>更新时间：{item.retrievedAt}</div>}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ border: '1px solid rgba(148, 163, 184, 0.22)', borderRadius: 12, padding: 14, background: '#fff' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>证据</div>
        <div style={{ display: 'grid', gap: 8 }}>
          {evidence.evidenceRefs.map((item) => (
            <div key={item.id} style={{ border: '1px solid rgba(226, 232, 240, 1)', borderRadius: 10, padding: 10, background: '#f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{item.title}</div>
                <Tag color="blue" style={{ margin: 0, borderRadius: 999 }}>{item.type || 'unknown'}</Tag>
              </div>
              {item.summary && <div style={{ marginTop: 6, fontSize: 12, color: '#475569', lineHeight: 1.6 }}>{item.summary}</div>}
              {item.sourceRefIds && item.sourceRefIds.length > 0 && (
                <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {item.sourceRefIds.map((sourceId) => (
                    <Tag key={sourceId} style={{ margin: 0, borderRadius: 999 }}>{sourceId}</Tag>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default EvidenceTab;

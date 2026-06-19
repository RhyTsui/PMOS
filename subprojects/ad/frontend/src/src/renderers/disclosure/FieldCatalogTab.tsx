'use client';

import type { MessageDisclosureView } from '@/contracts/disclosure';
import { EmptyState } from './EmptyState';

interface FieldCatalogTabProps {
  view: MessageDisclosureView;
}

export function FieldCatalogTab({ view }: FieldCatalogTabProps) {
  const { fields } = view;
  if (fields.items.length === 0) {
    return <EmptyState description={view.emptyStates.fields} />;
  }

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {fields.items.map((item) => (
        <section key={item.key} style={{ border: '1px solid rgba(148, 163, 184, 0.22)', borderRadius: 12, padding: 12, background: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{item.label}</div>
              <div style={{ marginTop: 4, fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>{item.description || '当前字段未提供说明。'}</div>
            </div>
            {item.status && <span style={{ fontSize: 12, color: '#0f172a' }}>{item.status}</span>}
          </div>
          <div style={{ marginTop: 8, display: 'grid', gap: 4, fontSize: 12, color: '#475569', lineHeight: 1.7 }}>
            <div>字段名：{item.key}</div>
            {item.type && <div>类型：{item.type}</div>}
            {item.unit && <div>单位：{item.unit}</div>}
            {item.format && <div>格式：{item.format}</div>}
            {item.displayValue && <div>示例值：{item.displayValue}</div>}
          </div>
        </section>
      ))}
    </div>
  );
}

export default FieldCatalogTab;

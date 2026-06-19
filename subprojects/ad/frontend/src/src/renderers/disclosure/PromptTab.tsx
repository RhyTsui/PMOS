'use client';

import { Tag } from 'antd';
import type { MessageDisclosureView } from '@/contracts/disclosure';
import { EmptyState } from './EmptyState';

interface PromptTabProps {
  view: MessageDisclosureView;
}

function getProjection(view: MessageDisclosureView): Record<string, unknown> | null {
  const metadata = view.metadata && typeof view.metadata === 'object' ? view.metadata as Record<string, unknown> : {};
  const projection = metadata.message_runtime_projection;
  return projection && typeof projection === 'object' ? projection as Record<string, unknown> : null;
}

export function PromptTab({ view }: PromptTabProps) {
  const projection = getProjection(view);
  const promptHits = Array.isArray(projection?.prompt_hits) ? projection.prompt_hits as Array<Record<string, unknown>> : [];

  if (!projection || promptHits.length === 0) {
    return <EmptyState description="当前没有可展示的 Prompt 命中信息。" />;
  }

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {promptHits.map((item, index) => {
        const promptVersion = typeof item.prompt_version === 'string' ? item.prompt_version : '';
        const summaryText = typeof item.summary === 'string' ? item.summary : '';
        const matched = item.matched !== false;

        return (
          <div key={String(item.key || index)} style={{ border: '1px solid rgba(226, 232, 240, 1)', borderRadius: 10, padding: 10, background: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                {String(item.title || item.key || `Prompt ${index + 1}`)}
              </div>
              <Tag color={matched ? 'green' : 'gold'} style={{ margin: 0, borderRadius: 999 }}>
                {matched ? '命中' : '未命中'}
              </Tag>
            </div>
            <div style={{ marginTop: 6, display: 'grid', gap: 4, fontSize: 12, color: '#475569', lineHeight: 1.6 }}>
              {promptVersion && <div>版本：{promptVersion}</div>}
              {summaryText && <div>说明：{summaryText}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default PromptTab;

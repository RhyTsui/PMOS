'use client';

import type { MessageDisclosureView } from '@/contracts/disclosure';
import { DisclosurePanelRenderer } from '@/renderers/disclosure';

interface MessageDisclosureDrawerProps {
  view: MessageDisclosureView | null;
}

export function MessageDisclosureDrawer({ view }: MessageDisclosureDrawerProps) {
  if (!view) {
    return (
      <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.7 }}>
        当前没有可展示的运行时信息。
      </div>
    );
  }

  return <DisclosurePanelRenderer view={view} />;
}

export default MessageDisclosureDrawer;

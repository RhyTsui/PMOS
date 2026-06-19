'use client';

import type { MessageDisclosureView } from '@/contracts/disclosure';
import { RuntimeTimelinePanel } from './RuntimeTimelinePanel';

interface DisclosurePanelRendererProps {
  view: MessageDisclosureView;
}

export function DisclosurePanelRenderer({ view }: DisclosurePanelRendererProps) {
  return <RuntimeTimelinePanel view={view} />;
}

export default DisclosurePanelRenderer;

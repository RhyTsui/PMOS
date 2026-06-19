'use client';

import { Empty } from 'antd';

interface EmptyStateProps {
  description: string;
}

export function EmptyState({ description }: EmptyStateProps) {
  return (
    <div style={{ padding: '28px 12px' }}>
      <Empty description={description} />
    </div>
  );
}

export default EmptyState;


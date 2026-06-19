'use client';

import { PanelLeft, PlusCircle, Send } from 'lucide-react';

type IconAssetProps = {
  name: 'sidebar' | 'share-plane' | 'plus-circle' | 'collapse';
  size?: number;
  className?: string;
};

const iconMap = {
  sidebar: PanelLeft,
  'share-plane': Send,
  'plus-circle': PlusCircle,
} satisfies Record<Exclude<IconAssetProps['name'], 'collapse'>, typeof PanelLeft>;

function CollapseIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M4 5H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 9H11.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 13H8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconAsset({ name, size = 18, className = '' }: IconAssetProps) {
  const Icon = name === 'collapse' ? CollapseIcon : iconMap[name];
  return (
    <span
      className={className}
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Icon size={size} strokeWidth={2} />
    </span>
  );
}

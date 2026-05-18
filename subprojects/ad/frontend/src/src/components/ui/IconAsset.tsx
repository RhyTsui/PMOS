'use client';

type IconAssetProps = {
  name: 'sidebar' | 'share-plane' | 'plus-circle' | 'collapse';
  size?: number;
  className?: string;
};

const iconPath: Record<IconAssetProps['name'], string> = {
  sidebar: '/icons/sidebar.svg',
  'share-plane': '/icons/share-plane.svg',
  'plus-circle': '/icons/plus-circle.svg',
  collapse: '/icons/collapse.svg',
};

export function IconAsset({ name, size = 18, className = '' }: IconAssetProps) {
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
      <img
        src={iconPath[name]}
        alt=""
        draggable={false}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          objectFit: 'contain',
          pointerEvents: 'none',
        }}
      />
    </span>
  );
}

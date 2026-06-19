'use client';

import { AssetPreviewModal, type AssetPreviewModalAsset } from '@/components/cognitive/AssetPreviewModal';
import type { AssetRecord } from '@/lib/page-helpers';

type OpenedAssetPreviewProps = {
  openedAsset: AssetRecord | null;
  setOpenedAsset: (asset: AssetRecord | null) => void;
};

export function OpenedAssetPreview({ openedAsset, setOpenedAsset }: OpenedAssetPreviewProps) {
  if (!openedAsset) return null;
  const modalAsset: AssetPreviewModalAsset = {
    ...openedAsset,
    previewUrl: openedAsset.thumbnailUrl || openedAsset.assetUrl,
    downloadUrl: openedAsset.downloadUrl || openedAsset.assetUrl,
  };
  return (
    <AssetPreviewModal
      open
      asset={modalAsset}
      onClose={() => setOpenedAsset(null)}
      onDownload={(asset) => {
        const url = asset.downloadUrl || asset.assetUrl;
        if (url) window.open(url, '_blank', 'noopener,noreferrer');
      }}
      onOpenExternal={(asset) => {
        const url = asset.assetUrl || asset.downloadUrl;
        if (url) window.open(url, '_blank', 'noopener,noreferrer');
      }}
    />
  );
}

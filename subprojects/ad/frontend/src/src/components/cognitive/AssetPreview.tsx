'use client';

import { File as FileIcon, FileSpreadsheet, FileText, ImageIcon, PlayCircle } from 'lucide-react';
import type { AttachmentKind } from '@/types';
import { ZHITOU_CHAT_COLORS } from '@/lib/zhitou-chat-colors';

interface AssetPreviewProps {
  kind: AttachmentKind | 'link' | 'file';
  format?: string;
  previewUrl?: string;
  tone?: string;
  thumbnailStatus?: 'generated' | 'generating' | 'unsupported' | 'failed';
  showVideoMark?: boolean;
}

export function AssetPreview({
  kind,
  format,
  previewUrl,
  tone = ZHITOU_CHAT_COLORS.primary,
  thumbnailStatus,
  showVideoMark = true,
}: AssetPreviewProps) {
  if ((kind === 'image' || kind === 'video') && previewUrl) {
    return (
      <div style={{ position: 'relative', width: '100%', height: '100%', background: '#f3f4f6' }}>
        <img src={previewUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        {kind === 'video' && showVideoMark && (
          <span
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              background: 'linear-gradient(180deg, rgba(0,0,0,0.04), rgba(0,0,0,0.18))',
            }}
          >
            <PlayCircle size={18} />
          </span>
        )}
      </div>
    );
  }

  if (kind === 'image' || kind === 'video') {
    return (
      <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg, ${tone}, ${kind === 'video' ? '#111827' : '#dbeafe'})`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        {kind === 'video' ? <PlayCircle size={18} /> : <ImageIcon size={18} />}
        {thumbnailStatus === 'generating' && <span style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.36)' }} />}
      </div>
    );
  }

  const Icon = kind === 'link'
    ? FileIcon
    : format === 'Excel' || format === 'CSV' || kind === 'table'
      ? FileSpreadsheet
      : format === 'Word' || format === 'PDF' || kind === 'document'
        ? FileText
        : FileIcon;

  return (
    <div style={{ width: '100%', height: '100%', background: '#f3f4f6', color: tone, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Icon size={17} />
    </div>
  );
}

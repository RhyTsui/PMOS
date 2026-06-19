'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Button, Modal } from 'antd';
import { Download, ExternalLink, FileSpreadsheet, FileText, Image as ImageIcon, Link2, Play } from 'lucide-react';
import type { AttachmentInsight } from '@/types';

export interface AssetPreviewModalAsset {
  id: string;
  title: string;
  category: 'image' | 'video' | 'link' | 'file';
  format?: string;
  summary?: string;
  source?: string;
  updatedAt?: string;
  anchorText?: string;
  assetUrl?: string;
  previewUrl?: string;
  downloadUrl?: string;
  thumbnailUrl?: string;
  insight?: AttachmentInsight;
}

interface AssetPreviewModalProps {
  open: boolean;
  asset: AssetPreviewModalAsset | null;
  onClose: () => void;
  onDownload?: (asset: AssetPreviewModalAsset) => void;
  onOpenExternal?: (asset: AssetPreviewModalAsset) => void;
}

function formatFileName(asset: AssetPreviewModalAsset) {
  if (asset.format === '链接') return asset.title;
  return asset.title.includes('.') ? asset.title : `${asset.title}${asset.format ? `.${asset.format.toLowerCase()}` : ''}`;
}

function TablePreview({ insight }: { insight?: AttachmentInsight }) {
  const table = insight?.tables?.[0];
  if (!table) {
    return (
      <div style={{ padding: 24, color: '#6b7280', fontSize: 13 }}>
        暂无可直接展示的表格内容，可以打开文件查看完整结果。
      </div>
    );
  }
  const rows = table.sample_rows.slice(0, 8);
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, color: '#475569', fontSize: 12 }}>
        <span>Sheet: {table.sheet_name || '默认'}</span>
        <span>行数: {table.row_count}</span>
        <span>列数: {table.column_count}</span>
      </div>
      <div style={{ overflow: 'auto', border: '1px solid #e5e7eb', borderRadius: 12 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead style={{ background: '#f8fafc' }}>
            <tr>
              {table.headers.map((header) => (
                <th key={header} style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${table.sheet_name}-${index}`}>
                {table.headers.map((header) => (
                  <td key={header} style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'top', color: '#334155' }}>
                    {String(row[header] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {insight?.fields?.length ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {insight.fields.slice(0, 8).map((field) => (
            <span key={field.key} style={{ borderRadius: 999, background: '#eef2ff', color: '#3730a3', padding: '4px 10px', fontSize: 12 }}>
              {field.label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function AssetPreviewModal({ open, asset, onClose, onDownload, onOpenExternal }: AssetPreviewModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const previewUrl = asset?.previewUrl || asset?.assetUrl || asset?.downloadUrl;
  const downloadUrl = asset?.downloadUrl || asset?.assetUrl || asset?.previewUrl;
  const isVideo = asset?.category === 'video';
  const isImage = asset?.category === 'image';
  const isTable = Boolean(asset?.insight?.tables?.length && (asset?.format === 'Excel' || asset?.format === 'CSV' || asset?.insight?.content_type === 'report_table' || asset?.insight?.content_type === 'spreadsheet'));

  useEffect(() => {
    if (open) return undefined;
    videoRef.current?.pause();
    return undefined;
  }, [open]);

  const sourceLabel = useMemo(() => {
    if (!asset) return '';
    return asset.source ? `${asset.source}${asset.updatedAt ? ` · ${asset.updatedAt}` : ''}` : asset.updatedAt || '';
  }, [asset]);

  if (!asset) return null;

  return (
    <Modal open={open} footer={null} centered width={isTable ? 1060 : 920} onCancel={onClose} title={formatFileName(asset)} destroyOnClose>
      <div style={{ display: 'grid', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.7 }}>{asset.summary || '文件已打开。'}</div>
            {sourceLabel ? <div style={{ marginTop: 6, fontSize: 12, color: '#94a3b8' }}>{sourceLabel}</div> : null}
            {asset.insight?.needs_confirmation ? <div style={{ marginTop: 8, fontSize: 12, color: '#b45309' }}>该文件需要先确认解析结果，再继续下一步。</div> : null}
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            {downloadUrl ? (
              <Button icon={<Download size={14} />} onClick={() => onDownload?.(asset)}>
                下载
              </Button>
            ) : null}
            {downloadUrl ? (
              <Button icon={<ExternalLink size={14} />} onClick={() => onOpenExternal?.(asset)}>
                新窗口打开
              </Button>
            ) : null}
          </div>
        </div>

        {isVideo ? (
          <video
            ref={videoRef}
            src={previewUrl}
            poster={asset.thumbnailUrl}
            controls
            style={{ width: '100%', maxHeight: 560, borderRadius: 14, background: '#111827' }}
          />
        ) : isImage ? (
          <div style={{ borderRadius: 14, overflow: 'hidden', background: '#f8fafc' }}>
            <img src={previewUrl} alt={asset.title} style={{ width: '100%', display: 'block', objectFit: 'contain', maxHeight: 620 }} />
          </div>
        ) : isTable ? (
          <TablePreview insight={asset.insight} />
        ) : (
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 14, padding: 24, background: '#f8fafc', display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#0f172a' }}>
              {asset.category === 'link' ? <Link2 size={20} /> : asset.format === 'Excel' || asset.format === 'CSV' ? <FileSpreadsheet size={20} /> : asset.format === 'PDF' ? <FileText size={20} /> : <ImageIcon size={20} />}
              <span style={{ fontSize: 14, fontWeight: 600 }}>当前类型暂不直接渲染</span>
            </div>
            <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.7 }}>
              可以先下载查看完整文件，或在会话中继续处理这份内容。
            </div>
            {previewUrl ? (
              <div style={{ fontSize: 12, color: '#94a3b8', wordBreak: 'break-all' }}>预览地址：{previewUrl}</div>
            ) : null}
          </div>
        )}

        {asset.insight?.candidate_questions?.length ? (
          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 8 }}>建议先确认</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {asset.insight.candidate_questions.slice(0, 6).map((item) => (
                <span key={item} style={{ borderRadius: 999, background: '#fff7ed', color: '#9a3412', padding: '4px 10px', fontSize: 12 }}>
                  {item}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>关闭</Button>
          {downloadUrl ? (
            <Button type="primary" icon={<Play size={14} />} onClick={() => onOpenExternal?.(asset)}>
              打开文件
            </Button>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}

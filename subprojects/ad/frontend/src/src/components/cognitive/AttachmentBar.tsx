'use client';

import { useState, useCallback } from 'react';
import { Paperclip, X, Upload, FileText, ImageIcon, Table, File, CheckCircle, Loader2, PlayCircle } from 'lucide-react';
import type { AttachmentRecord, AttachmentKind, AttachmentStatus } from '@/types';
import { useThemeColors } from '@/hooks/useTheme';

interface AttachmentBarProps {
  attachments: AttachmentRecord[];
  onUpload?: (files: FileList) => void;
  onRemove?: (id: string) => void;
  onRetry?: (id: string) => void;
  onPreview?: (attachment: AttachmentRecord) => void;
}

const kindIcons: Record<AttachmentKind, typeof File> = {
  image: ImageIcon,
  video: PlayCircle,
  document: FileText,
  table: Table,
  log: File,
};

export function AttachmentBar({ attachments, onUpload, onRemove, onRetry, onPreview }: AttachmentBarProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const c = useThemeColors();

  const statusConfig: Record<AttachmentStatus, { color: string; label: string }> = {
    uploading: { color: c.accent, label: '上传中' },
    uploaded: { color: c.textMuted, label: '已上传' },
    parsing: { color: c.warning, label: '解析中' },
    parsed: { color: c.success, label: '已解析' },
    upload_failed: { color: c.danger, label: '上传失败' },
    parse_failed: { color: c.danger, label: '解析失败' },
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0 && onUpload) {
      onUpload(e.dataTransfer.files);
    }
  }, [onUpload]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && onUpload) {
      onUpload(e.target.files);
    }
    e.target.value = '';
  }, [onUpload]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {/* Upload Button */}
      {onUpload && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <label style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 10px', borderRadius: 8,
          fontSize: 12, color: c.textMuted,
          cursor: 'pointer', transition: 'all 0.2s',
        }}
          onMouseEnter={e => { e.currentTarget.style.color = c.accent; e.currentTarget.style.background = c.accentSoft; }}
          onMouseLeave={e => { e.currentTarget.style.color = c.textMuted; e.currentTarget.style.background = 'transparent'; }}
        >
          <Upload className="w-3.5 h-3.5" />
          <span>上传附件</span>
          <input
            type="file"
            multiple
            style={{ display: 'none' }}
            onChange={handleFileInput}
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.log"
          />
        </label>
        <span style={{ fontSize: 10, color: c.textSubtle }}>支持图片、文档、表格、日志</span>
      </div>}

      {/* Attachment List */}
      {attachments.length > 0 && (
        <div
          style={{
            display: 'flex', flexDirection: 'column', gap: 4,
            padding: 8, borderRadius: 8,
            border: `1px solid ${isDragOver ? c.accent : c.border}`,
            background: isDragOver ? c.accentSoft : c.bgCard,
            transition: 'all 0.2s',
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {isDragOver && (
            <div style={{ textAlign: 'center', padding: '8px 0', fontSize: 12, color: c.accent }}>
              拖拽文件到此处上传
            </div>
          )}
          {attachments.map((att) => {
            const IconComp = kindIcons[att.kind] || File;
            const status = statusConfig[att.status];
            const isLoading = att.status === 'uploading' || att.status === 'parsing';
            const isFailed = att.status === 'upload_failed' || att.status === 'parse_failed';

            return (
              <div
                key={att.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 10px', borderRadius: 8,
                  background: isFailed ? `${c.danger}0F` : 'transparent',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={e => { if (!isFailed) e.currentTarget.style.background = c.bgElevated; }}
                onMouseLeave={e => { if (!isFailed) e.currentTarget.style.background = 'transparent'; }}
              >
                <IconComp className="w-4 h-4 flex-shrink-0" style={{ color: c.textMuted }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: c.textBody, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                    <span style={{ fontSize: 10, color: status.color, display: 'flex', alignItems: 'center', gap: 4 }}>
                      {isLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                      {status.label}
                    </span>
                    {att.summary && att.status === 'parsed' && (
                      <span style={{ fontSize: 10, color: c.textSubtle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.summary.slice(0, 40)}...</span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  {att.status === 'parsed' && (
                    <CheckCircle className="w-3.5 h-3.5" style={{ color: c.success }} />
                  )}
                  {isFailed && (
                    <button
                      onClick={() => onRetry?.(att.id)}
                      style={{ fontSize: 10, color: c.danger, transition: 'color 0.2s', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      onMouseEnter={e => e.currentTarget.style.color = '#ff6690'}
                      onMouseLeave={e => e.currentTarget.style.color = c.danger}
                    >
                      重试
                    </button>
                  )}
                  {onPreview && att.status === 'parsed' && (
                    <button
                      onClick={() => onPreview(att)}
                      style={{ fontSize: 10, color: c.textMuted, transition: 'color 0.2s', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      onMouseEnter={e => e.currentTarget.style.color = c.accent}
                      onMouseLeave={e => e.currentTarget.style.color = c.textMuted}
                    >
                      预览
                    </button>
                  )}
                  {onRemove && (
                    <button
                      onClick={() => onRemove(att.id)}
                      style={{ color: c.textSubtle, transition: 'color 0.2s', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      onMouseEnter={e => e.currentTarget.style.color = c.danger}
                      onMouseLeave={e => e.currentTarget.style.color = c.textSubtle}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty Drag Zone */}
      {attachments.length === 0 && (
        <div
          style={{
            border: `1px dashed ${isDragOver ? c.accent : c.border}`,
            borderRadius: 8, padding: 12, textAlign: 'center',
            background: isDragOver ? c.accentSoft : 'transparent',
            transition: 'all 0.2s',
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Paperclip className="w-4 h-4 mx-auto mb-1" style={{ color: c.textSubtle }} />
          <div style={{ fontSize: 10, color: c.textSubtle }}>拖拽文件到此处上传</div>
        </div>
      )}
    </div>
  );
}

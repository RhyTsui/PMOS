'use client';

import { useState, useCallback } from 'react';
import { Paperclip, X, Upload, FileText, ImageIcon, Table, File, CheckCircle, Loader2 } from 'lucide-react';
import type { AttachmentRecord, AttachmentKind, AttachmentStatus } from '@/types';

interface AttachmentBarProps {
  attachments: AttachmentRecord[];
  onUpload?: (files: FileList) => void;
  onRemove?: (id: string) => void;
  onRetry?: (id: string) => void;
  onPreview?: (attachment: AttachmentRecord) => void;
}

const kindIcons: Record<AttachmentKind, typeof File> = {
  image: ImageIcon,
  document: FileText,
  table: Table,
  log: File,
};

const statusConfig: Record<AttachmentStatus, { color: string; label: string }> = {
  uploading: { color: 'text-[#00D9FF]', label: '上传中' },
  uploaded: { color: 'text-[#8B9DC3]', label: '已上传' },
  parsing: { color: 'text-[#FFB800]', label: '解析中' },
  parsed: { color: 'text-[#00FF88]', label: '已解析' },
  upload_failed: { color: 'text-[#FF3366]', label: '上传失败' },
  parse_failed: { color: 'text-[#FF3366]', label: '解析失败' },
};

export function AttachmentBar({ attachments, onUpload, onRemove, onRetry, onPreview }: AttachmentBarProps) {
  const [isDragOver, setIsDragOver] = useState(false);

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
    <div className="space-y-1.5">
      {/* Upload Button */}
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-[#8B9DC3] hover:text-[#00D9FF] hover:bg-[rgba(0,217,255,0.08)] transition-colors cursor-pointer">
          <Upload className="w-3.5 h-3.5" />
          <span>上传附件</span>
          <input
            type="file"
            multiple
            className="hidden"
            onChange={handleFileInput}
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.log"
          />
        </label>
        <span className="text-[10px] text-[#5a6a8a]">支持图片、文档、表格、日志</span>
      </div>

      {/* Attachment List */}
      {attachments.length > 0 && (
        <div
          className={`space-y-1 p-2 rounded-lg border transition-colors ${
            isDragOver
              ? 'border-[#00D9FF] bg-[rgba(0,217,255,0.08)]'
              : 'border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {isDragOver && (
            <div className="text-center py-2 text-xs text-[#00D9FF]">
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
                className={`flex items-center gap-2 px-2.5 py-2 rounded-lg transition-colors ${
                  isFailed
                    ? 'bg-[rgba(255,51,102,0.06)]'
                    : 'hover:bg-[rgba(255,255,255,0.04)]'
                }`}
              >
                <IconComp className="w-4 h-4 text-[#8B9DC3] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-[#c8d6e5] truncate">{att.name}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] ${status.color}`}>
                      {isLoading && <Loader2 className="w-3 h-3 inline mr-1 animate-spin" />}
                      {status.label}
                    </span>
                    {att.summary && att.status === 'parsed' && (
                      <span className="text-[10px] text-[#5a6a8a] truncate">{att.summary.slice(0, 40)}...</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {att.status === 'parsed' && (
                    <CheckCircle className="w-3.5 h-3.5 text-[#00FF88]" />
                  )}
                  {isFailed && (
                    <button
                      onClick={() => onRetry?.(att.id)}
                      className="text-[10px] text-[#FF3366] hover:text-[#ff6690] transition-colors"
                    >
                      重试
                    </button>
                  )}
                  {onPreview && att.status === 'parsed' && (
                    <button
                      onClick={() => onPreview(att)}
                      className="text-[10px] text-[#8B9DC3] hover:text-[#00D9FF] transition-colors"
                    >
                      预览
                    </button>
                  )}
                  {onRemove && (
                    <button
                      onClick={() => onRemove(att.id)}
                      className="text-[#5a6a8a] hover:text-[#FF3366] transition-colors"
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
          className={`border border-dashed rounded-lg p-3 text-center transition-colors ${
            isDragOver
              ? 'border-[#00D9FF] bg-[rgba(0,217,255,0.06)]'
              : 'border-[rgba(255,255,255,0.08)]'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Paperclip className="w-4 h-4 text-[#5a6a8a] mx-auto mb-1" />
          <div className="text-[10px] text-[#5a6a8a]">拖拽文件到此处上传</div>
        </div>
      )}
    </div>
  );
}

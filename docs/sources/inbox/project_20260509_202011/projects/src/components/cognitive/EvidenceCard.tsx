'use client';

import { useState } from 'react';
import { FileText, ChevronDown, ChevronUp, Shield, AlertTriangle, CheckCircle2, ImageIcon } from 'lucide-react';
import type { EvidenceItem, AttachmentRecord } from '@/types';

interface EvidenceCardProps {
  evidence: EvidenceItem;
  attachment?: AttachmentRecord;
  compact?: boolean;
}

const sourceTypeIcons: Record<string, typeof FileText> = {
  upload: FileText,
  knowledge: Shield,
  'media-data': FileText,
  'callback-log': FileText,
  'client-log': FileText,
  report: FileText,
};

const statusConfig: Record<string, { color: string; icon: typeof CheckCircle2; label: string }> = {
  confirmed: { color: 'text-[#00FF88]', icon: CheckCircle2, label: '已确认' },
  suspected: { color: 'text-[#FFB800]', icon: AlertTriangle, label: '待确认' },
  pending: { color: 'text-[#8B9DC3]', icon: FileText, label: '待查' },
};

export function EvidenceCard({ evidence, attachment, compact = false }: EvidenceCardProps) {
  const [expanded, setExpanded] = useState(!compact);

  const StatusIcon = statusConfig[evidence.status]?.icon || FileText;
  const SourceIcon = sourceTypeIcons[evidence.evidence_type || ''] || FileText;
  const statusInfo = statusConfig[evidence.status] || statusConfig.pending;

  const confidenceConfig: Record<string, { color: string; label: string }> = {
    high: { color: 'text-[#00FF88] bg-[rgba(0,255,136,0.1)]', label: '高置信' },
    medium: { color: 'text-[#FFB800] bg-[rgba(255,184,0,0.1)]', label: '中置信' },
    low: { color: 'text-[#FF3366] bg-[rgba(255,51,102,0.1)]', label: '低置信' },
  };
  const conf = evidence.confidence ? confidenceConfig[evidence.confidence] : null;

  return (
    <div className="rounded-lg border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-[rgba(255,255,255,0.03)] transition-colors"
        onClick={() => compact && setExpanded(!expanded)}
      >
        {evidence.step && (
          <span className="w-5 h-5 rounded-full bg-[rgba(0,217,255,0.15)] text-[#00D9FF] text-[10px] flex items-center justify-center font-medium flex-shrink-0">
            {evidence.step}
          </span>
        )}
        <SourceIcon className="w-3.5 h-3.5 text-[#8B9DC3] flex-shrink-0" />
        <span className="text-sm text-[#c8d6e5] flex-1 min-w-0 truncate">{evidence.title}</span>
        <StatusIcon className={`w-3.5 h-3.5 ${statusInfo.color} flex-shrink-0`} />
        {conf && (
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${conf.color}`}>
            {conf.label}
          </span>
        )}
        {compact && (
          expanded ? <ChevronUp className="w-3.5 h-3.5 text-[#5a6a8a]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#5a6a8a]" />
        )}
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {/* Detail */}
          <div className="text-xs text-[#8B9DC3]">{evidence.detail || evidence.summary}</div>

          {/* Source */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#5a6a8a]">来源:</span>
            <span className="text-[10px] text-[#8B9DC3]">{evidence.source}</span>
            {evidence.evidence_type && (
              <span className="px-1.5 py-0.5 rounded bg-[rgba(0,217,255,0.08)] text-[10px] text-[#00D9FF]">
                {evidence.evidence_type}
              </span>
            )}
          </div>

          {/* Attachment reference */}
          {attachment && (
            <div className="flex items-center gap-2 p-2 rounded bg-[rgba(255,255,255,0.03)]">
              {attachment.kind === 'image' ? (
                <ImageIcon className="w-3.5 h-3.5 text-[#8B9DC3]" />
              ) : (
                <FileText className="w-3.5 h-3.5 text-[#8B9DC3]" />
              )}
              <span className="text-[10px] text-[#8B9DC3]">{attachment.name}</span>
              {attachment.summary && (
                <span className="text-[10px] text-[#5a6a8a] truncate">{attachment.summary.slice(0, 50)}</span>
              )}
            </div>
          )}

          {/* Timestamp */}
          {evidence.timestamp && (
            <div className="text-[10px] text-[#5a6a8a]">{evidence.timestamp}</div>
          )}
        </div>
      )}
    </div>
  );
}

// ==========================================
// Evidence Card Group (for ResultPanel)
// ==========================================

interface EvidenceCardGroupProps {
  evidences: EvidenceItem[];
  attachments?: AttachmentRecord[];
  title?: string;
}

export function EvidenceCardGroup({ evidences, attachments = [], title }: EvidenceCardGroupProps) {
  if (evidences.length === 0) return null;

  return (
    <div className="space-y-2">
      {title && (
        <div className="text-xs font-medium text-[#8B9DC3] flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5" />
          {title}
        </div>
      )}
      <div className="space-y-1.5">
        {evidences.map((ev, idx) => {
          const relatedAttachment = attachments.find(a => a.id === ev.source_attachment_id);
          return (
            <EvidenceCard
              key={ev.evidence_id || idx}
              evidence={ev}
              attachment={relatedAttachment}
              compact
            />
          );
        })}
      </div>
    </div>
  );
}

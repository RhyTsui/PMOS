'use client';

import { useState } from 'react';
import { FileText, ChevronDown, ChevronUp, Shield, AlertTriangle, CheckCircle2, ImageIcon } from 'lucide-react';
import type { EvidenceItem, AttachmentRecord } from '@/types';
import { useThemeColors } from '@/hooks/useTheme';

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

export function EvidenceCard({ evidence, attachment, compact = false }: EvidenceCardProps) {
  const [expanded, setExpanded] = useState(!compact);
  const c = useThemeColors();

  const StatusIcon = statusConfig(evidence.status, c).icon;
  const SourceIcon = sourceTypeIcons[evidence.evidence_type || ''] || FileText;
  const statusInfo = statusConfig(evidence.status, c);

  const confConfig: Record<string, { color: string; bg: string; label: string }> = {
    high: { color: c.success, bg: `${c.success}1A`, label: '高置信' },
    medium: { color: c.warning, bg: `${c.warning}1A`, label: '中置信' },
    low: { color: c.danger, bg: `${c.danger}1A`, label: '低置信' },
  };
  const conf = evidence.confidence ? confConfig[evidence.confidence] : null;

  return (
    <div style={{
      borderRadius: 8,
      border: `1px solid ${c.border}`,
      background: c.bgCard,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 12px',
          cursor: compact ? 'pointer' : 'default',
          transition: 'background 0.2s',
        }}
        onClick={() => compact && setExpanded(!expanded)}
        onMouseEnter={e => { if (compact) e.currentTarget.style.background = c.accentSoft; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
      >
        {evidence.step && (
          <span style={{
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: c.accentBg,
            color: c.accent,
            fontSize: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 500,
            flexShrink: 0,
          }}>
            {evidence.step}
          </span>
        )}
        <SourceIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: c.textMuted }} />
        <span style={{ fontSize: 13, color: c.textBody, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{evidence.title}</span>
        <StatusIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: statusInfo.color }} />
        {conf && (
          <span style={{
            padding: '1px 6px',
            borderRadius: 4,
            fontSize: 10,
            fontWeight: 500,
            color: conf.color,
            background: conf.bg,
          }}>
            {conf.label}
          </span>
        )}
        {compact && (
          expanded ? <ChevronUp className="w-3.5 h-3.5" style={{ color: c.textMuted }} /> : <ChevronDown className="w-3.5 h-3.5" style={{ color: c.textMuted }} />
        )}
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {/* Detail */}
          <div style={{ fontSize: 11, color: c.textMuted }}>{evidence.detail || evidence.summary}</div>

          {/* Source */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 10, color: c.textMuted }}>来源:</span>
            <span style={{ fontSize: 10, color: c.textMuted }}>{evidence.source}</span>
            {evidence.evidence_type && (
              <span style={{
                padding: '1px 6px',
                borderRadius: 4,
                background: c.accentBg,
                fontSize: 10,
                color: c.accent,
              }}>
                {evidence.evidence_type}
              </span>
            )}
          </div>

          {/* Attachment reference */}
          {attachment && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: 6,
              borderRadius: 4,
              background: c.bgCard,
            }}>
              {attachment.kind === 'image' ? (
                <ImageIcon className="w-3.5 h-3.5" style={{ color: c.textMuted }} />
              ) : (
                <FileText className="w-3.5 h-3.5" style={{ color: c.textMuted }} />
              )}
              <span style={{ fontSize: 10, color: c.textMuted }}>{attachment.name}</span>
              {attachment.summary && (
                <span style={{ fontSize: 10, color: c.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{attachment.summary.slice(0, 50)}</span>
              )}
            </div>
          )}

          {/* Timestamp */}
          {evidence.timestamp && (
            <div style={{ fontSize: 10, color: c.textMuted }}>{evidence.timestamp}</div>
          )}
        </div>
      )}
    </div>
  );
}

function statusConfig(status: string, colors: { success: string; warning: string; textMuted: string }): { color: string; icon: typeof CheckCircle2; label: string } {
  switch (status) {
    case 'confirmed': return { color: colors.success, icon: CheckCircle2, label: '已确认' };
    case 'suspected': return { color: colors.warning, icon: AlertTriangle, label: '待确认' };
    default: return { color: colors.textMuted, icon: FileText, label: '待查' };
  }
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
  const c = useThemeColors();

  if (evidences.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {title && (
        <div style={{ fontSize: 11, fontWeight: 500, color: c.textMuted, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Shield className="w-3.5 h-3.5" />
          {title}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
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

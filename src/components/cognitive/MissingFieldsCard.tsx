'use client';

import { AlertCircle, ChevronRight } from 'lucide-react';
import type { MissingField } from '@/types';
import { useThemeColors } from '@/hooks/useTheme';

interface MissingFieldsCardProps {
  fields: MissingField[];
  onFieldClick?: (field: MissingField) => void;
  onFillAll?: () => void;
}

export function MissingFieldsCard({ fields, onFieldClick, onFillAll }: MissingFieldsCardProps) {
  const c = useThemeColors();

  if (fields.length === 0) return null;

  const requiredFields = fields.filter(f => f.priority === 'required');
  const otherFields = fields.filter(f => f.priority !== 'required');

  const priorityConfig: Record<string, { color: string; bg: string; label: string }> = {
    required: { color: c.danger, bg: `${c.danger}1A`, label: '必填' },
    recommended: { color: c.warning, bg: `${c.warning}1A`, label: '建议' },
    optional: { color: c.textMuted, bg: `${c.textMuted}1A`, label: '可选' },
  };

  return (
    <div style={{
      borderRadius: 12,
      border: `1px solid ${c.danger}33`,
      background: `${c.danger}0A`,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 16px',
        borderBottom: `1px solid ${c.danger}1A`,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <AlertCircle className="w-4 h-4" style={{ color: c.danger }} />
        <span style={{ fontSize: 13, fontWeight: 500, color: c.danger }}>
          需要补充 {requiredFields.length} 个必填字段
        </span>
        {onFillAll && (
          <button
            onClick={onFillAll}
            style={{
              marginLeft: 'auto',
              fontSize: 11,
              color: c.accent,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.8'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
          >
            批量补录
          </button>
        )}
      </div>

      {/* Required Fields */}
      {requiredFields.length > 0 && (
        <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {requiredFields.map((field) => {
            const pc = priorityConfig[field.priority || 'required'];
            return (
              <button
                key={field.field_key}
                onClick={() => onFieldClick?.(field)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  borderRadius: 8,
                  background: `${c.danger}0F`,
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = `${c.danger}1F`; }}
                onMouseLeave={e => { e.currentTarget.style.background = `${c.danger}0F`; }}
              >
                <span style={{
                  padding: '1px 6px',
                  borderRadius: 4,
                  fontSize: 10,
                  fontWeight: 500,
                  color: pc.color,
                  background: pc.bg,
                }}>
                  {pc.label}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: c.textBody }}>{field.field_label}</div>
                  <div style={{ fontSize: 11, color: c.textMuted, marginTop: 2 }}>{field.why_required}</div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: c.textMuted }} />
              </button>
            );
          })}
        </div>
      )}

      {/* Recommended/Optional Fields */}
      {otherFields.length > 0 && (
        <div style={{
          padding: '8px 16px',
          borderTop: `1px solid ${c.borderFaint}`,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}>
          <div style={{ fontSize: 11, color: c.textMuted, marginBottom: 2 }}>建议补充</div>
          {otherFields.map((field) => {
            const pc = priorityConfig[field.priority || 'recommended'];
            return (
              <button
                key={field.field_key}
                onClick={() => onFieldClick?.(field)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '6px 8px',
                  borderRadius: 8,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = c.accentSoft; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
              >
                <span style={{
                  padding: '1px 6px',
                  borderRadius: 4,
                  fontSize: 10,
                  fontWeight: 500,
                  color: pc.color,
                  background: pc.bg,
                }}>
                  {pc.label}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: c.textMuted }}>{field.field_label}</div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: c.textMuted }} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

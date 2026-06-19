'use client';

import { ChevronRight } from 'lucide-react';
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

  const requiredFields = fields.filter((field) => field.priority === 'required');
  const otherFields = fields.filter((field) => field.priority !== 'required');
  const priorityConfig: Record<string, { color: string; label: string }> = {
    required: { color: c.danger, label: '必填' },
    recommended: { color: c.warning, label: '建议' },
    optional: { color: c.textMuted, label: '可选' },
  };

  const renderField = (field: MissingField) => {
    const pc = priorityConfig[field.priority || 'recommended'] || priorityConfig.recommended;
    return (
      <button
        key={field.field_key}
        type="button"
        onClick={() => onFieldClick?.(field)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 8,
          padding: '4px 0',
          border: 'none',
          background: 'transparent',
          textAlign: 'left',
          cursor: onFieldClick ? 'pointer' : 'default',
        }}
      >
        <span
          className="ui-micro"
          style={{
            width: 34,
            flexShrink: 0,
            lineHeight: '19px',
            fontWeight: 600,
            color: pc.color,
          }}
        >
          {pc.label}
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span className="ui-body" style={{ display: 'block', lineHeight: '20px' }}>
            {field.field_label}
          </span>
          {field.why_required ? (
            <span className="ui-caption" style={{ display: 'block', marginTop: 2, lineHeight: '17px' }}>
              {field.why_required}
            </span>
          ) : null}
        </span>
        {onFieldClick ? <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" style={{ marginTop: 3, color: c.textMuted }} /> : null}
      </button>
    );
  };

  return (
    <div data-missing-fields-text-list style={{ display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="ui-body" style={{ fontWeight: 600 }}>
          待补充信息
        </span>
        <span className="ui-caption">
          {requiredFields.length > 0 ? `${requiredFields.length} 项必填` : `${fields.length} 项待确认`}
        </span>
        {onFillAll ? (
          <button
            type="button"
            onClick={onFillAll}
            style={{
              marginLeft: 'auto',
              border: 'none',
              background: 'transparent',
              color: c.accent,
              cursor: 'pointer',
            }}
            className="ui-caption"
          >
            批量补录
          </button>
        ) : null}
      </div>

      {requiredFields.length > 0 ? (
        <div style={{ display: 'grid', gap: 4 }}>
          {requiredFields.map(renderField)}
        </div>
      ) : null}

      {otherFields.length > 0 ? (
        <div style={{ display: 'grid', gap: 4 }}>
          {requiredFields.length > 0 ? (
            <div className="ui-micro">建议补充</div>
          ) : null}
          {otherFields.map(renderField)}
        </div>
      ) : null}
    </div>
  );
}

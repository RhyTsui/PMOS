'use client';

import { AlertCircle, ChevronRight } from 'lucide-react';
import type { MissingField } from '@/types';

interface MissingFieldsCardProps {
  fields: MissingField[];
  onFieldClick?: (field: MissingField) => void;
  onFillAll?: () => void;
}

export function MissingFieldsCard({ fields, onFieldClick, onFillAll }: MissingFieldsCardProps) {
  if (fields.length === 0) return null;

  const requiredFields = fields.filter(f => f.priority === 'required');
  const otherFields = fields.filter(f => f.priority !== 'required');

  const priorityColors: Record<string, string> = {
    required: 'text-[#FF3366] bg-[rgba(255,51,102,0.1)]',
    recommended: 'text-[#FFB800] bg-[rgba(255,184,0,0.1)]',
    optional: 'text-[#8B9DC3] bg-[rgba(139,157,195,0.1)]',
  };

  const priorityLabels: Record<string, string> = {
    required: '必填',
    recommended: '建议',
    optional: '可选',
  };

  return (
    <div className="rounded-xl border border-[rgba(255,51,102,0.2)] bg-[rgba(255,51,102,0.04)] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[rgba(255,51,102,0.1)] flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-[#FF3366]" />
        <span className="text-sm font-medium text-[#FF3366]">
          需要补充 {requiredFields.length} 个必填字段
        </span>
        {onFillAll && (
          <button
            onClick={onFillAll}
            className="ml-auto text-xs text-[#00D9FF] hover:text-[#00b8d9] transition-colors"
          >
            批量补录
          </button>
        )}
      </div>

      {/* Required Fields */}
      {requiredFields.length > 0 && (
        <div className="px-4 py-2 space-y-2">
          {requiredFields.map((field) => (
            <button
              key={field.field_key}
              onClick={() => onFieldClick?.(field)}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-[rgba(255,51,102,0.06)] hover:bg-[rgba(255,51,102,0.12)] transition-colors text-left group"
            >
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${priorityColors[field.priority || 'required']}`}>
                {priorityLabels[field.priority || 'required']}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-[#c8d6e5]">{field.field_label}</div>
                <div className="text-xs text-[#8B9DC3] mt-0.5">{field.why_required}</div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-[#5a6a8a] group-hover:text-[#00D9FF] transition-colors flex-shrink-0" />
            </button>
          ))}
        </div>
      )}

      {/* Recommended/Optional Fields */}
      {otherFields.length > 0 && (
        <div className="px-4 py-2 border-t border-[rgba(255,255,255,0.04)] space-y-2">
          <div className="text-xs text-[#5a6a8a] mb-1">建议补充</div>
          {otherFields.map((field) => (
            <button
              key={field.field_key}
              onClick={() => onFieldClick?.(field)}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-[rgba(255,255,255,0.03)] transition-colors text-left group"
            >
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${priorityColors[field.priority || 'recommended']}`}>
                {priorityLabels[field.priority || 'recommended']}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-[#8B9DC3]">{field.field_label}</div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-[#5a6a8a] group-hover:text-[#00D9FF] transition-colors flex-shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

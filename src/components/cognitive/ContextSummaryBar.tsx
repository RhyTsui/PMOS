'use client';

import { useState } from 'react';
import { Info, ChevronDown, ChevronUp } from 'lucide-react';
import type { TaskContext, ConversationMode } from '@/types';
import { useThemeColors } from '@/hooks/useTheme';

interface ContextSummaryBarProps {
  taskContext: TaskContext | null;
  conversationMode: ConversationMode | null;
  media?: string;
  app?: string;
}

export function ContextSummaryBar({
  taskContext,
  conversationMode,
  media,
  app,
}: ContextSummaryBarProps) {
  const [expanded, setExpanded] = useState(false);
  const c = useThemeColors();

  const modeLabels: Record<ConversationMode, string> = {
    'natural-chat': '自由对话',
    'light-workflow': '已整理背景',
    'heavy-workflow': '处理中',
  };

  const modeColorMap: Record<ConversationMode, string> = {
    'natural-chat': c.accent,
    'light-workflow': c.warning,
    'heavy-workflow': c.danger,
  };

  const summaryItems: { label: string; value: string }[] = [];
  if (taskContext?.media) summaryItems.push({ label: '媒体', value: taskContext.media });
  if (taskContext?.app) summaryItems.push({ label: '应用', value: taskContext.app });
  if (taskContext?.plan_id) summaryItems.push({ label: '计划', value: taskContext.plan_id });
  if (taskContext?.device_id) summaryItems.push({ label: '设备', value: taskContext.device_id });
  if (taskContext?.time_range) summaryItems.push({ label: '时间', value: taskContext.time_range });
  if (taskContext?.anomaly_type) summaryItems.push({ label: '问题', value: taskContext.anomaly_type });
  if (media && !summaryItems.find((item) => item.label === '媒体')) {
    summaryItems.push({ label: '媒体', value: media });
  }
  if (app && !summaryItems.find((item) => item.label === '应用')) {
    summaryItems.push({ label: '应用', value: app });
  }

  if (summaryItems.length === 0 && !conversationMode) return null;

  const displayItems = expanded ? summaryItems : summaryItems.slice(0, 4);
  const modeColor = conversationMode ? modeColorMap[conversationMode] : c.accent;

  return (
    <div
      style={{
        borderBottom: `1px solid ${c.borderFaint}`,
        background: c.accentBg,
        backdropFilter: 'blur(8px)',
      }}
    >
      <div className="px-4 py-2 flex items-center gap-3 text-xs">
        <Info className="w-3.5 h-3.5 flex-shrink-0" style={{ color: modeColor }} />
        <div className="flex items-center gap-2.5 flex-1 min-w-0 flex-wrap">
          {conversationMode && (
            <span
              style={{
                padding: '1px 8px',
                borderRadius: 6,
                background: `${modeColor}12`,
                border: `1px solid ${modeColor}25`,
                color: modeColor,
                fontWeight: 500,
                fontSize: 11,
              }}
            >
              {modeLabels[conversationMode]}
            </span>
          )}
          {displayItems.map((item) => (
            <span key={item.label} style={{ color: c.textMuted, fontSize: 12 }}>
              <span>{item.label}</span>
              <span style={{ color: c.textBody, marginLeft: 4 }}>{item.value}</span>
            </span>
          ))}
        </div>
        {summaryItems.length > 4 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex-shrink-0 transition-all duration-200"
            style={{ color: c.textMuted }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = c.accent;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = c.textMuted;
            }}
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
    </div>
  );
}

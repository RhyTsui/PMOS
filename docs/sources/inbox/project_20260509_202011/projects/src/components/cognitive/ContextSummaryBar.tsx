'use client';

import { useState } from 'react';
import { Info, ChevronDown, ChevronUp } from 'lucide-react';
import type { TaskContext, ConversationMode } from '@/types';

interface ContextSummaryBarProps {
  taskContext: TaskContext | null;
  conversationMode: ConversationMode | null;
  media?: string;
  app?: string;
}

export function ContextSummaryBar({ taskContext, conversationMode, media, app }: ContextSummaryBarProps) {
  const [expanded, setExpanded] = useState(false);

  const modeLabels: Record<ConversationMode, string> = {
    'natural-chat': '普通对话',
    'light-workflow': '轻工作流',
    'heavy-workflow': '重工作流',
  };

  // Extract context summary from taskContext
  const summaryItems: { label: string; value: string }[] = [];
  if (taskContext?.media) summaryItems.push({ label: '媒体', value: taskContext.media });
  if (taskContext?.app) summaryItems.push({ label: '应用', value: taskContext.app });
  if (taskContext?.plan_id) summaryItems.push({ label: '计划', value: taskContext.plan_id });
  if (taskContext?.device_id) summaryItems.push({ label: '设备', value: taskContext.device_id });
  if (taskContext?.time_range) summaryItems.push({ label: '时间', value: taskContext.time_range });
  if (taskContext?.anomaly_type) summaryItems.push({ label: '异常', value: taskContext.anomaly_type });
  if (media && !summaryItems.find(i => i.label === '媒体')) summaryItems.push({ label: '媒体', value: media });
  if (app && !summaryItems.find(i => i.label === '应用')) summaryItems.push({ label: '应用', value: app });

  if (summaryItems.length === 0 && !conversationMode) return null;

  const displayItems = expanded ? summaryItems : summaryItems.slice(0, 4);

  return (
    <div className="border-b border-[rgba(255,255,255,0.06)] bg-[rgba(0,217,255,0.04)]">
      <div className="px-4 py-2 flex items-center gap-3 text-xs">
        <Info className="w-3.5 h-3.5 text-[#00D9FF] flex-shrink-0" />
        <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
          {conversationMode && (
            <span className="px-1.5 py-0.5 rounded bg-[rgba(0,217,255,0.15)] text-[#00D9FF] font-medium">
              {modeLabels[conversationMode]}
            </span>
          )}
          {displayItems.map((item) => (
            <span key={item.label} className="text-[#8B9DC3]">
              <span className="text-[#5a6a8a]">{item.label}:</span>{' '}
              <span className="text-[#c8d6e5]">{item.value}</span>
            </span>
          ))}
        </div>
        {summaryItems.length > 4 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-[#8B9DC3] hover:text-[#00D9FF] transition-colors flex-shrink-0"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
    </div>
  );
}

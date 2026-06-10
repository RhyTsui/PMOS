'use client';

import React, { type ComponentType, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Input, Modal, Tooltip, message as antMessage } from 'antd';
import { motion } from 'framer-motion';
import {
  BulbOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CodeOutlined,
  CopyOutlined,
  CloseCircleOutlined,
  DislikeOutlined,
  DownOutlined,
  EyeOutlined,
  InfoCircleOutlined,
  LikeOutlined,
  LoadingOutlined,
  MoreOutlined,
  PauseCircleOutlined,
  EditOutlined,
  ReloadOutlined,
  SoundOutlined,
  StarFilled,
  StarOutlined,
  ThunderboltOutlined,
  UpOutlined,
} from '@ant-design/icons';
import type { AgentType, AiNextAction, BusinessSummary, Message, MessageContract, MissingField, WorkflowResult } from '@/types';
import { useThemeColors } from '@/hooks/useTheme';
import { copyTextWithFallback, serializeMessageForCopy } from '@/lib/chat-copy';
import { formatDisplayValue } from '@/lib/display-format';
import { AGENT_MAP } from '@/lib/constants';
import FancyCodeBlock, { type CodeStyle } from '@/components/ui/FancyCodeBlock';
import type { useChatSettings } from '@/hooks/useChatSettings';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSpeech } from '@/hooks/useSpeech';
import { IconAsset } from '@/components/ui/IconAsset';
import { MessageActionBar } from './MessageActionBar';
import { AmbiguityConfirmCard, type AmbiguityConfirmPayload } from './AmbiguityConfirmCard';
import { cleanRuntimeLabel } from '@/lib/chat-runtime/runtime-disclosure';
import { CapabilityFollowUpCard, type CapabilityFollowUpPayload } from './CapabilityFollowUpCard';
import { decodeReportActionEnvelope, encodeReportActionEnvelope, reportActionLabel } from '@/lib/report-action-envelope';
import { WelcomeMascotIcon } from './WelcomeMascotIcon';
import { MessageErrorBoundary } from './MessageErrorBoundary';
import { MessagePresentationRenderer } from './MessagePresentationRenderer';
import { buildMessagePresentationResult, extractMessageContract, extractSemanticResult } from './message-presentation';
import { projectMessagePresentation, type ComposerRecommendation } from './message-presentation-projection';
import {
  MetricExplainerRenderer,
  isMetricExplainerUISchema,
  type MetricAction,
  type MetricExplainerUISchema,
} from '@/features/metric-explainer';
import {
  DEFAULT_CHAT_DISPLAY_CONFIG,
  type ChatDisplayConfig,
} from '@/types/chat-display';
import type { VizSpec } from '@/types/viz';
import type { SemanticResultContract } from '@/contracts/semantic/semantic-result-contract';

interface ChatContainerProps {
  messages: Message[];
  isTyping: boolean;
  onFollowUpClick?: (text: string) => void;
  isStreaming?: boolean;
  devMode?: boolean;
  onViewCallChain?: () => void;
  onOpenSourcePanel?: (payload: SourcePanelPayload) => void;
  onEditUserMessage?: (content: string) => void;
  onSubmitFollowUp?: (content: string) => void;
  onStopGeneration?: () => void;
  contextThinkingSteps?: Array<{ title: string; description?: string }>;
  currentResult?: WorkflowResult | Record<string, unknown> | null;
  chatSettings: ReturnType<typeof useChatSettings>;
  systemPrompt?: string;
  showSystemPrompt?: boolean;
  onToggleSystemPrompt?: () => void;
  onOpenAgentPanel?: (agent: AgentType) => void;
  onShareConversation?: (conversationId: string, title?: string) => void;
  currentConversationTitle?: string;
  conversationKey?: string | null;
  chatDisplayConfig?: ChatDisplayConfig;
  onResultRecommendationsChange?: (items: ComposerRecommendation[]) => void;
}

type BubbleKind = 'user' | 'assistant' | 'system' | 'clarification' | 'summary';

interface BubbleItem {
  key: string;
  role: 'ai' | 'user';
  kind: BubbleKind;
  content: string;
  toolCalls: NonNullable<Message['tool_calls']>;
  missingFields: MissingField[];
  messageId: string;
  agent?: string;
  runtimeState?: Record<string, unknown>;
  rawMessage: Message;
}

function isRenderableMessage(value: unknown): value is Message {
  return Boolean(value && typeof value === 'object');
}

interface SourceRefView {
  title: string;
  source?: string;
  url?: string;
  sourceType?: 'knowledge_base' | 'report_mcp' | 'mcp' | 'skill' | 'web_search' | 'other';
  reportName?: string;
  prompt?: string;
  detail?: string;
}

interface CapabilityRefView {
  key: string;
  name: string;
  kind: string;
  prompt?: string;
  providerUrl?: string;
  arguments?: string;
  result?: string;
  status?: string;
}

export interface SourcePanelPayload {
  message: Message;
  source?: SourceRefView;
  capability?: CapabilityRefView;
}

function CapabilityIcon({ kind, size = 13 }: { kind?: string; size?: number }) {
  const normalized = String(kind || '').toLowerCase();
  const InlineBadge = ({ label, background, color }: { label: string; background: string; color: string }) => (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: 3,
        background,
        color,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: Math.max(8, size - 5),
        fontWeight: 700,
        lineHeight: 1,
      }}
    >
      {label}
    </span>
  );
  if (normalized.includes('knowledge')) {
    return <InlineBadge label="K" background="#eaf3ff" color="#1d4ed8" />;
  }
  if (normalized.includes('mcp') || normalized.includes('report')) {
    return <InlineBadge label="M" background="#ecfdf3" color="#15803d" />;
  }
  if (normalized.includes('web')) {
    return <InlineBadge label="G" background="#fff7ed" color="#c2410c" />;
  }
  if (normalized.includes('skill')) {
    return <InlineBadge label="S" background="#f5f3ff" color="#6d28d9" />;
  }
  return <InfoCircleOutlined style={{ fontSize: size }} />;
}

function normalizeToolKind(value?: string): string {
  const text = String(value || '').toLowerCase();
  if (text.includes('knowledge')) return 'knowledge';
  if (text.includes('report')) return 'report_mcp';
  if (text.includes('mcp')) return 'mcp';
  if (text.includes('web')) return 'web_search';
  if (text.includes('skill')) return 'skill';
  return text || 'tool';
}

function safeJsonText(value?: string) {
  if (!value) return '';
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

function stripInlineSourceSection(content: string): string {
  const lines = content.split('\n');
  const sourceHeadingIndex = lines.findIndex((line) => {
    const normalized = line.replace(/\*/g, '').replace(/^#+\s*/, '').trim();
    return /^(关键信息来源|信息来源|来源|参考来源|数据来源)[:：]?$/.test(normalized);
  });
  if (sourceHeadingIndex < 0) return content;
  const before = lines.slice(0, sourceHeadingIndex).join('\n').trimEnd();
  const after = lines.slice(sourceHeadingIndex + 1);
  const nextHeadingIndex = after.findIndex((line) => /^#{1,3}\s+/.test(line.trim()));
  if (nextHeadingIndex < 0) return before;
  return `${before}\n\n${after.slice(nextHeadingIndex).join('\n')}`.trim();
}

function getRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function getAmbiguityConfirmPayload(message: Message): AmbiguityConfirmPayload | null {
  const meta = message.metadata || {};
  const workflowResult = meta.workflow_result && typeof meta.workflow_result === 'object'
    ? meta.workflow_result as Record<string, unknown>
    : null;
  const payload = workflowResult?.structured_payload && typeof workflowResult.structured_payload === 'object'
    ? workflowResult.structured_payload as Record<string, unknown>
    : meta.structured_payload && typeof meta.structured_payload === 'object'
      ? meta.structured_payload as Record<string, unknown>
      : null;
  const raw = payload?.confirmation && typeof payload.confirmation === 'object'
    ? payload.confirmation as Record<string, unknown>
    : payload?.confirmation_needed && payload?.confirmation && typeof payload.confirmation === 'object'
      ? payload.confirmation as Record<string, unknown>
      : null;
  if (!raw || typeof raw !== 'object') return null;

  const title = typeof raw.title === 'string' ? raw.title : '先确认对象';
  const hint = typeof raw.hint === 'string' ? raw.hint : '请先选择一个对象再继续。';
  const options = Array.isArray(raw.options)
    ? raw.options
        .map((item) => {
          if (!item || typeof item !== 'object') return null;
          const option = item as Record<string, unknown>;
          const label = typeof option.label === 'string' ? option.label : '';
          const prompt = typeof option.prompt === 'string' ? option.prompt : '';
          return label && prompt ? { label, prompt } : null;
        })
        .filter((item): item is { label: string; prompt: string } => Boolean(item))
    : [];
  if (!options.length) return null;
  return { title, hint, options };
}

function getCapabilityFollowUpPayload(message: Message): CapabilityFollowUpPayload | null {
  const meta = message.metadata || {};
  const workflowResult = meta.workflow_result && typeof meta.workflow_result === 'object'
    ? meta.workflow_result as Record<string, unknown>
    : null;
  const payload = workflowResult?.structured_payload && typeof workflowResult.structured_payload === 'object'
    ? workflowResult.structured_payload as Record<string, unknown>
    : meta.structured_payload && typeof meta.structured_payload === 'object'
      ? meta.structured_payload as Record<string, unknown>
      : null;
  const followUp = payload && typeof payload === 'object' ? payload.follow_up : undefined;
  const followUpTitle = payload && typeof payload === 'object' ? payload.follow_up_title : undefined;
  const followUpHint = payload && typeof payload === 'object' ? payload.follow_up_hint : undefined;
  const followUpFields = payload && typeof payload === 'object' ? payload.follow_up_fields : undefined;
  const raw = followUp && typeof followUp === 'object'
    ? followUp as Record<string, unknown>
    : (followUpTitle || followUpHint || followUpFields)
      ? { title: followUpTitle, hint: followUpHint, fields: followUpFields }
      : null;
  if (!raw || typeof raw !== 'object') return null;

  const title = typeof raw.title === 'string' ? raw.title : '继续补充信息';
  const hint = typeof raw.hint === 'string' ? raw.hint : '请先补充缺失信息后继续。';
  const rawFields = raw.fields;
  const fields = Array.isArray(rawFields)
    ? rawFields
        .map((item: unknown) => {
          if (!item || typeof item !== 'object') return null;
          const field = item as Record<string, unknown>;
          const label = typeof field.label === 'string' ? field.label : '';
          const prompt = typeof field.prompt === 'string' ? field.prompt : '';
          return label && prompt ? { label, prompt } : null;
        })
        .filter((item): item is { label: string; prompt: string } => Boolean(item))
    : [];
  if (!fields.length) return null;
  return { title, hint, fields };
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const c = useThemeColors();
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = useCallback(async () => {
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
    }
    setCopied(true);
    resetTimerRef.current = setTimeout(() => setCopied(false), 1800);

    const copyWithFallback = () => {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', 'true');
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '0';
      document.body.appendChild(textarea);
      textarea.select();
      let ok = false;
      try {
        ok = document.execCommand('copy');
      } finally {
        document.body.removeChild(textarea);
      }
      return ok;
    };

    try {
      const copiedByFallback = copyWithFallback();
      if (!copiedByFallback && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else if (!copiedByFallback && !navigator.clipboard?.writeText) {
        throw new Error('copy fallback failed');
      }
      antMessage.success('复制成功');
    } catch {
      setCopied(false);
      antMessage.warning('复制失败，请手动选择内容复制');
    }
  }, [text]);

  return (
    <Tooltip title={copied ? '已复制' : '复制'}>
      <button
        type="button"
        onPointerDown={(event) => {
          event.stopPropagation();
        }}
        onClick={(event) => {
          event.stopPropagation();
          void handleCopy();
        }}
        aria-label={copied ? '已复制' : '复制'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: copied ? 'rgba(21, 127, 84, 0.12)' : 'none',
          border: copied ? `1px solid rgba(21, 127, 84, 0.22)` : '1px solid transparent',
          cursor: 'pointer',
          color: copied ? c.success : c.textMuted,
          fontSize: 12,
          width: copied ? 58 : 28,
          height: 28,
          gap: 4,
          padding: copied ? '0 8px' : 0,
          borderRadius: 10,
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = copied ? 'rgba(21, 127, 84, 0.12)' : c.accentBgFaint;
          e.currentTarget.style.color = copied ? c.success : c.accent;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = copied ? 'rgba(21, 127, 84, 0.12)' : 'none';
          e.currentTarget.style.color = copied ? c.success : c.textMuted;
        }}
      >
        {copied ? <CheckCircleOutlined /> : <CopyOutlined />}
        {copied ? <span style={{ whiteSpace: 'nowrap' }}>已复制</span> : null}
      </button>
    </Tooltip>
  );
}

function MessageActionButton({
  icon,
  label,
  onClick,
  active = false,
  activeColor,
  activeBackground,
  dataAction,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => unknown;
  active?: boolean;
  activeColor?: string;
  activeBackground?: string;
  dataAction?: string;
}) {
  const c = useThemeColors();
  const highlightColor = activeColor || c.accent;
  const inactiveBackground = 'none';
  const activeBg = activeBackground || 'rgba(246, 189, 22, 0.14)';

  return (
    <Tooltip title={label}>
      <button
        type="button"
        aria-label={label}
        aria-pressed={active}
        data-message-action={dataAction}
        data-active={active ? 'true' : 'false'}
        onClick={onClick}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: active ? activeBg : inactiveBackground,
          border: 'none',
          cursor: 'pointer',
          color: active ? highlightColor : c.textMuted,
          fontSize: 13,
          width: 28,
          height: 28,
          padding: 0,
          borderRadius: 10,
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = active ? activeBg : c.accentBgFaint;
          e.currentTarget.style.color = active ? highlightColor : c.accent;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = active ? activeBg : inactiveBackground;
          e.currentTarget.style.color = active ? highlightColor : c.textMuted;
        }}
      >
        {icon}
      </button>
    </Tooltip>
  );
}

function MarkdownRenderer({
  content,
  codeStyle,
  showLineNumbers,
}: {
  content: string;
  codeStyle: CodeStyle;
  showLineNumbers: boolean;
}) {
  const c = useThemeColors();

  const segments = useMemo(() => {
    const parts: Array<{ type: 'text' | 'code'; content: string; language?: string }> = [];
    const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: content.slice(lastIndex, match.index) });
      }
      parts.push({ type: 'code', content: match[2], language: match[1] || 'text' });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      parts.push({ type: 'text', content: content.slice(lastIndex) });
    }

    return parts;
  }, [content]);

  const isMarkdownTableLine = (line: string) => {
    const trimmed = line.trim();
    return trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.split('|').length >= 4;
  };

  const isMarkdownTableSeparator = (line: string) => (
    /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(line.trim())
  );

  const parseMarkdownTableRow = (line: string) => (
    line
      .trim()
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((cell) => cell.trim())
  );

  const renderMarkdownTable = (lines: string[], key: string) => {
    const [headerLine, , ...bodyLines] = lines;
    const headers = parseMarkdownTableRow(headerLine);
    const rows = bodyLines.map(parseMarkdownTableRow);
    return (
      <div
        key={key}
        data-markdown-table-scroll
        style={{
          maxWidth: '100%',
          overflowX: 'auto',
          overscrollBehaviorX: 'contain',
          WebkitOverflowScrolling: 'touch',
          margin: '8px 0 10px',
          border: `1px solid ${c.borderFaint}`,
          borderRadius: 12,
          background: '#fff',
        }}
      >
        <table style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              {headers.map((header, headerIndex) => (
                <th
                  key={`${key}-h-${headerIndex}`}
                  style={{
                    padding: '8px 10px',
                    borderBottom: `1px solid ${c.borderFaint}`,
                    background: c.bgSection,
                    color: c.textSecondary,
                    fontWeight: 600,
                    textAlign: 'left',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={`${key}-r-${rowIndex}`}>
                {headers.map((header, cellIndex) => (
                  <td
                    key={`${key}-r-${rowIndex}-c-${cellIndex}`}
                    style={{
                      padding: '8px 10px',
                      borderTop: rowIndex === 0 ? 'none' : `1px solid ${c.borderFaint}`,
                      color: c.textBody,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {formatDisplayValue(row[cellIndex], header)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderText = (text: string) => {
    const lines = text.split('\n');
    const nodes: React.ReactElement[] = [];
    let index = 0;
    while (index < lines.length) {
      const line = lines[index];
      if (
        isMarkdownTableLine(line)
        && index + 1 < lines.length
        && isMarkdownTableSeparator(lines[index + 1])
      ) {
        const tableLines = [line, lines[index + 1]];
        index += 2;
        while (index < lines.length && isMarkdownTableLine(lines[index])) {
          tableLines.push(lines[index]);
          index += 1;
        }
        nodes.push(renderMarkdownTable(tableLines, `table-${nodes.length}`));
        continue;
      }

      const normalizedLine = line.replace(/\*\*([^*]+)\*\*/g, '$1');
      const trimmedLine = normalizedLine.trim();
      const rawTrimmedLine = line.trim();
    const hasPreviousContent = lines.slice(0, index).some((item) => item.trim());
    const sectionDivider = hasPreviousContent ? (
      <div style={{ height: 1, background: c.borderFaint, margin: '14px 0 12px' }} />
    ) : null;
    const wrapSection = (node: React.ReactElement) => sectionDivider ? (
      <React.Fragment key={`section-${index}`}>
        {sectionDivider}
        {node}
      </React.Fragment>
    ) : node;
    const boldHeadingMatch = trimmedLine.match(/^\*\*([^*]+)\*\*$/);
    if (boldHeadingMatch) {
      nodes.push(wrapSection(<h2 key={index} style={{ fontSize: 16, fontWeight: 700, color: c.textPrimary, marginTop: 0, marginBottom: 6 }}>{boldHeadingMatch[1]}</h2>));
      index += 1;
      continue;
    }

    const boldLabelMatch = trimmedLine.match(/^\*\*([^*]+)\*\*[:：]\s*(.*)$/);
    if (boldLabelMatch) {
      nodes.push(wrapSection(
        <div key={index} style={{ margin: '0 0 8px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: c.textPrimary }}>{boldLabelMatch[1]}</div>
          {boldLabelMatch[2] && <div style={{ marginTop: 4, color: c.textSecondary }}>{boldLabelMatch[2]}</div>}
        </div>,
      ));
      index += 1;
      continue;
    }

    if (trimmedLine.startsWith('### ')) {
      nodes.push(wrapSection(<h3 key={index} style={{ fontSize: 15, fontWeight: 700, color: c.textPrimary, marginTop: 0, marginBottom: 4 }}>{trimmedLine.slice(4)}</h3>));
      index += 1;
      continue;
    }
    if (trimmedLine.startsWith('## ')) {
      nodes.push(wrapSection(<h2 key={index} style={{ fontSize: 16, fontWeight: 700, color: c.textPrimary, marginTop: 0, marginBottom: 6 }}>{trimmedLine.slice(3)}</h2>));
      index += 1;
      continue;
    }
    if (trimmedLine.startsWith('# ')) {
      nodes.push(wrapSection(<h1 key={index} style={{ fontSize: 18, fontWeight: 700, color: c.textPrimary, marginTop: 0, marginBottom: 8 }}>{trimmedLine.slice(2)}</h1>));
      index += 1;
      continue;
    }

    const listMatch = trimmedLine.match(/^(\d+)[.、)]\s*(.*)/);
    if (listMatch) {
      nodes.push(
        <div key={index} style={{ display: 'grid', gridTemplateColumns: '22px minmax(0, 1fr)', gap: 8, alignItems: 'start', margin: '3px 0' }}>
          <span
            style={{
              width: 20,
              height: 20,
              borderRadius: 999,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: c.accentBgFaint,
              color: c.accent,
              fontSize: 11,
              fontWeight: 600,
              lineHeight: 1,
            }}
          >
            {listMatch[1]}
          </span>
          <span style={{ color: c.textBody }}>{listMatch[2]}</span>
        </div>
      );
      index += 1;
      continue;
    }

    if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ') || trimmedLine.startsWith('•')) {
      const content = trimmedLine.startsWith('•') ? trimmedLine.slice(1).trim() : trimmedLine.slice(2);
      nodes.push(
        <div key={index} style={{ display: 'flex', gap: 8 }}>
          <span style={{ color: c.accent }}>•</span>
          <span>{content}</span>
        </div>
      );
      index += 1;
      continue;
    }

    nodes.push(!trimmedLine
      ? <div key={index} style={{ height: 8 }} />
      : <p key={index} style={{ margin: '2px 0' }}>{normalizedLine}</p>);
    index += 1;
    }
    return nodes;
  };

  return (
    <div style={{ fontSize: 14, lineHeight: 1.82, color: c.textBody }}>
      {segments.map((segment, index) => {
        if (segment.type === 'code') {
          if (segment.language?.toLowerCase() === 'mermaid') {
            return <MermaidDiagram key={index} chart={segment.content} />;
          }
          return (
            <FancyCodeBlock
              key={index}
              language={segment.language}
              codeStyle={codeStyle}
              showLineNumbers={showLineNumbers}
            >
              {segment.content}
            </FancyCodeBlock>
          );
        }

        return <React.Fragment key={index}>{renderText(segment.content)}</React.Fragment>;
      })}
    </div>
  );
}

function MermaidDiagram({ chart }: { chart: string }) {
  const c = useThemeColors();
  const [open, setOpen] = useState(false);
  const nodes = useMemo(() => {
    const cleaned = chart
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !/^flowchart|^graph/i.test(line));
    const labels: string[] = [];
    for (const line of cleaned) {
      const parts = line.split(/-->|---|==>|-.->/).map(part => part.trim());
      for (const part of parts) {
        const label = part
          .replace(/^[A-Za-z0-9_]+\[/, '')
          .replace(/^[A-Za-z0-9_]+\(/, '')
          .replace(/[\]\)]$/, '')
          .replace(/^["']|["']$/g, '')
          .trim();
        if (label && !labels.includes(label)) labels.push(label);
      }
    }
    return labels.slice(0, 8);
  }, [chart]);

  const renderDiagram = (large = false) => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: large ? 'center' : 'flex-start',
        gap: large ? 12 : 8,
        flexWrap: 'wrap',
        padding: large ? 16 : 0,
      }}
    >
      {nodes.map((node, index) => (
        <React.Fragment key={`${node}-${index}-${large ? 'large' : 'preview'}`}>
          <div
            style={{
              borderRadius: large ? 14 : 12,
              border: `1px solid ${c.borderFaint}`,
              background: c.bgSection,
              padding: large ? '12px 14px' : '8px 10px',
              color: c.textSecondary,
              fontSize: large ? 14 : 12,
              lineHeight: 1.5,
              maxWidth: large ? 220 : 160,
              wordBreak: 'break-word',
            }}
          >
            {node}
          </div>
          {index < nodes.length - 1 && (
            <span style={{ color: c.textMuted, fontSize: large ? 18 : 14 }}>→</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <div style={{ margin: '10px 0' }}>
      {nodes.length > 0 ? (
        <>
          <button
            type="button"
            onClick={() => setOpen(true)}
            style={{
              width: '100%',
              border: 'none',
              background: 'transparent',
              padding: 0,
              textAlign: 'left',
              cursor: 'zoom-in',
            }}
          >
            <div
              style={{
                borderRadius: 12,
                border: `1px solid ${c.borderFaint}`,
                background: 'transparent',
                padding: 10,
                overflow: 'hidden',
              }}
            >
              {renderDiagram(false)}
            </div>
          </button>
          <Modal
            open={open}
            onCancel={() => setOpen(false)}
            footer={null}
            width={860}
            centered
          >
            <div style={{ borderRadius: 14, border: `1px solid ${c.borderFaint}`, background: '#fff', minHeight: 220 }}>
              {renderDiagram(true)}
            </div>
          </Modal>
        </>
      ) : (
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: c.textMuted, fontSize: 12 }}>{chart}</pre>
      )}
    </div>
  );
}

function SystemPromptDisplay({ prompt }: { prompt: string }) {
  const c = useThemeColors();
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      style={{
        margin: '8px 0',
        borderRadius: 14,
        border: `1px solid ${c.borderFaint}`,
        overflow: 'hidden',
        background: c.bgSection,
      }}
    >
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontSize: 12,
          color: c.textSecondary,
        }}
      >
        <EyeOutlined style={{ fontSize: 12, color: c.accent }} />
        <span>系统提示词</span>
        <span style={{ marginLeft: 'auto', color: c.textMuted }}>{expanded ? <UpOutlined /> : <DownOutlined />}</span>
      </button>
      {expanded && (
        <div
          style={{
            padding: 12,
            fontSize: 12,
            color: c.textSecondary,
            whiteSpace: 'pre-wrap',
            fontFamily: 'var(--font-mono)',
            maxHeight: 300,
            overflow: 'auto',
          }}
        >
          {prompt}
        </div>
      )}
    </div>
  );
}

function MissingFieldPanel({
  fields,
  onClick,
}: {
  fields: MissingField[];
  onClick?: (field: MissingField, value?: string) => void;
}) {
  const c = useThemeColors();
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  if (fields.length === 0) return null;

  const getOptions = (field: MissingField) => {
    if (field.field_key === 'compare_source') {
      return ['媒体后台原始账单', '智投平台报表', 'BI 报表', '其他报表'];
    }
    return [];
  };
  const hasRequiredMissing = fields.some((field) => field.priority === 'required' && !drafts[field.field_key]?.trim());

  return (
    <div
      data-missing-field-text-panel
      style={{
        marginTop: 10,
        padding: '4px 0 0',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, color: c.textPrimary, fontSize: 13, fontWeight: 600 }}>
        <InfoCircleOutlined style={{ color: c.textMuted }} />
        <span>补充排查条件</span>
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {fields.slice(0, 6).map((field) => {
          const options = getOptions(field);
          return (
          <label
            key={field.field_key}
            style={{
              display: 'grid',
              gridTemplateColumns: '88px minmax(0, 1fr)',
              alignItems: 'center',
              gap: 8,
              padding: '2px 0',
            }}
          >
            <Tooltip title={`${field.why_required} ${field.suggested_question}`}>
              <span style={{ color: c.textSecondary, fontSize: 12, fontWeight: 600, cursor: 'help' }}>
                {field.field_label}
                {field.priority === 'required' ? <span style={{ color: c.danger }}> *</span> : null}
              </span>
            </Tooltip>
            {options.length > 0 ? (
              <select
                value={drafts[field.field_key] || ''}
                onChange={(event) => setDrafts((prev) => ({ ...prev, [field.field_key]: event.target.value }))}
                style={{
                  height: 34,
                  borderRadius: 8,
                  border: `1px solid ${c.borderFaint}`,
                  background: '#fff',
                  padding: '0 10px',
                  color: drafts[field.field_key] ? c.textPrimary : c.textMuted,
                  fontSize: 12,
                  outline: 'none',
                }}
              >
                <option value="">请选择</option>
                {options.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            ) : (
              <input
                value={drafts[field.field_key] || ''}
                onChange={(event) => setDrafts((prev) => ({ ...prev, [field.field_key]: event.target.value }))}
                placeholder={`填写${field.field_label}`}
                style={{
                  height: 32,
                  borderRadius: 8,
                  border: `1px solid ${c.borderFaint}`,
                  background: '#fff',
                  padding: '0 10px',
                  color: c.textSecondary,
                  fontSize: 12,
                  outline: 'none',
                }}
              />
            )}
          </label>
        );
        })}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 2 }}>
          <button
            type="button"
            disabled={hasRequiredMissing}
            onClick={() => {
              const completed = fields
                .filter((field) => drafts[field.field_key]?.trim())
                .map((field) => `${field.field_label}=${drafts[field.field_key].trim()}`);
              if (completed.length === 0) return;
              onClick?.(fields[0], completed.join('；'));
            }}
            style={{
              border: 'none',
              background: hasRequiredMissing ? c.bgSection : c.accent,
              color: hasRequiredMissing ? c.textMuted : '#fff',
              borderRadius: 999,
              padding: '8px 14px',
              fontSize: 12,
              fontWeight: 600,
              cursor: hasRequiredMissing ? 'not-allowed' : 'pointer',
            }}
          >
            确认并继续
          </button>
        </div>
      </div>
    </div>
  );
}

function collectSourceRefs(message: Message): SourceRefView[] {
  const meta = message.metadata || {};
  const raw = [
    meta.source_refs,
    meta.sourceRefs,
    meta.sources,
    meta.citations,
    message.evidence_ids,
  ].find((value) => Array.isArray(value)) as unknown[] | undefined;

  if (!raw || raw.length === 0) return [];

  return raw
    .reduce<SourceRefView[]>((acc, item) => {
      if (typeof item === 'string') {
        acc.push({ title: item, sourceType: 'other' });
        return acc;
      }
      if (item && typeof item === 'object') {
        const obj = item as Record<string, unknown>;
        const title = String(obj.report_name || obj.title || obj.name || obj.source || obj.id || '');
        if (!title) return acc;
        const rawType = String(obj.source_type || obj.type || '');
        const sourceType = rawType === 'knowledge_base' || rawType === 'report_mcp' || rawType === 'mcp' || rawType === 'skill' || rawType === 'web_search'
          ? rawType
          : 'other';
        acc.push({
          title: sourceType === 'report_mcp' ? String(obj.report_name || title) : title,
          source: obj.source ? String(obj.source) : undefined,
          url: obj.url ? String(obj.url) : undefined,
          sourceType,
          reportName: obj.report_name ? String(obj.report_name) : undefined,
          prompt: obj.prompt ? String(obj.prompt) : undefined,
          detail: obj.detail || obj.content || obj.snippet ? String(obj.detail || obj.content || obj.snippet) : undefined,
        });
      }
      return acc;
    }, [])
    .slice(0, 5);
}

function collectCapabilities(message: Message): CapabilityRefView[] {
  const calls = message.tool_calls || [];
  const capabilities = calls
    .map((call, index) => {
      const kind = normalizeToolKind(call.kind || call.type || call.name);
      return {
        key: `${call.step_key || call.name}-${index}`,
        name: call.display_name || call.name || `Tool ${index + 1}`,
        kind,
        prompt: call.prompt,
        providerUrl: call.provider_url,
        arguments: call.arguments,
        result: call.result,
        status: call.status,
      };
    })
    .filter((item, index, array) => array.findIndex(other => other.name === item.name && other.kind === item.kind) === index)
    .slice(0, 8);
  return capabilities;
}

function UnifiedEvidenceStrip({
  capabilities,
  refs,
  onOpenCapability,
  onOpenSource,
}: {
  capabilities: CapabilityRefView[];
  refs: SourceRefView[];
  onOpenCapability?: (capability: CapabilityRefView) => void;
  onOpenSource?: (ref: SourceRefView) => void;
}) {
  const c = useThemeColors();
  const [expanded, setExpanded] = useState(false);
  const items: Array<
    | { type: 'capability'; key: string; label: string; detail: string; kind: string; payload: CapabilityRefView }
    | { type: 'source'; key: string; label: string; detail: string; kind: string; payload: SourceRefView }
  > = [
    ...capabilities.map((capability) => ({
      type: 'capability' as const,
      key: `cap-${capability.key}`,
      label: capability.kind === 'debug_log' ? '联调日志' : capability.kind === 'skill' ? 'Skill' : capability.kind === 'report_mcp' ? '报表 MCP' : capability.kind === 'knowledge' ? '知识库' : capability.kind === 'web_search' ? '网页查询' : 'MCP',
      detail: capability.name,
      kind: capability.kind,
      payload: capability,
    })),
    ...refs.map((ref, index) => ({
      type: 'source' as const,
      key: `src-${ref.sourceType || 'source'}-${ref.title}-${index}`,
      label: ref.sourceType === 'report_mcp' ? '报表来源' : ref.sourceType === 'knowledge_base' ? '知识库来源' : ref.sourceType === 'web_search' ? '网页来源' : '来源',
      detail: ref.sourceType === 'report_mcp' ? `${ref.reportName || ref.title}` : ref.title,
      kind: ref.sourceType || 'other',
      payload: ref,
    })),
  ].filter((item, index, array) =>
    array.findIndex(other => other.kind === item.kind && other.detail === item.detail) === index,
  ).slice(0, 10);

  if (items.length === 0) return null;

  return (
    <div
      style={{
        margin: '0 0 8px',
        borderRadius: 14,
        border: `1px solid ${c.borderFaint}`,
        background: c.bgSection,
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          border: 'none',
          background: 'transparent',
          color: c.textSecondary,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <InfoCircleOutlined style={{ color: c.accent, fontSize: 10 }} />
        <span style={{ fontSize: 10, fontWeight: 400 }}>调用与来源</span>
        <span style={{ fontSize: 10, color: c.textMuted }}>
          {capabilities.length} 个调用 / {refs.length} 个来源
        </span>
        <span style={{ marginLeft: 'auto', color: c.textMuted, fontSize: 10 }}>
          {expanded ? '收起' : '展开'}
        </span>
        {expanded ? <UpOutlined style={{ fontSize: 10 }} /> : <DownOutlined style={{ fontSize: 10 }} />}
      </button>

      {expanded && (
        <div
          style={{
            borderTop: `1px solid ${c.borderFaint}`,
            padding: '10px 12px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            alignItems: 'center',
          }}
        >
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => item.type === 'capability' ? onOpenCapability?.(item.payload) : onOpenSource?.(item.payload)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                maxWidth: 340,
                border: `1px solid ${c.borderFaint}`,
                background: '#fff',
                color: c.textSecondary,
                borderRadius: 999,
                padding: '4px 8px',
                fontSize: 10,
                cursor: 'pointer',
              }}
              title={item.detail}
            >
              <CapabilityIcon kind={item.kind} size={10} />
              <span style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>{item.label}</span>
              <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: c.textMuted }}>
                {item.detail}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SourceReferenceStrip({
  refs,
  onOpen,
}: {
  refs: SourceRefView[];
  onOpen?: (ref: SourceRefView) => void;
}) {
  const c = useThemeColors();
  if (refs.length === 0) return null;

  return (
    <div
      style={{
        marginTop: 8,
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        borderRadius: 14,
        border: `1px solid ${c.borderFaint}`,
        background: c.bgSection,
        padding: '8px 10px',
        color: c.textSecondary,
        textAlign: 'left',
      }}
    >
      <InfoCircleOutlined style={{ color: c.accent, fontSize: 13 }} />
      <span style={{ fontSize: 12, fontWeight: 500, flexShrink: 0 }}>来源</span>
      <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap', minWidth: 0 }}>
        {refs.map((ref) => {
          const label = ref.sourceType === 'report_mcp'
            ? `${ref.title} · 取自智投报表MCP`
            : ref.sourceType === 'knowledge_base'
              ? `${ref.title} · 知识库`
              : ref.title;
          return (
          <span
            role="button"
            tabIndex={0}
            onClick={() => onOpen?.(ref)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') onOpen?.(ref);
            }}
            key={`${ref.sourceType || 'source'}-${ref.title}`}
            style={{
              maxWidth: 260,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              borderRadius: 999,
              border: `1px solid ${c.borderFaint}`,
              background: '#fff',
              padding: '3px 8px',
              fontSize: 11,
              color: c.textMuted,
              cursor: onOpen ? 'pointer' : 'default',
            }}
            title={label}
          >
            <CapabilityIcon kind={ref.sourceType} size={11} />
            {label}
          </span>
        );
        })}
      </span>
    </div>
  );
}

function CapabilityStrip({
  capabilities,
  onOpen,
}: {
  capabilities: CapabilityRefView[];
  onOpen?: (capability: CapabilityRefView) => void;
}) {
  const c = useThemeColors();
  if (capabilities.length === 0) return null;

  const labelMap: Record<string, string> = {
    skill: 'Skill',
    mcp: 'MCP',
    report_mcp: '报表 MCP',
    knowledge: '知识库',
    web_search: '网页搜索',
    model: '模型',
  };

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '0 0 6px' }}>
      {capabilities.map((capability) => (
        <button
          key={capability.key}
          type="button"
          onClick={() => onOpen?.(capability)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            border: `1px solid ${c.borderFaint}`,
            background: '#fff',
            color: c.textSecondary,
            borderRadius: 999,
            padding: '4px 8px',
            fontSize: 11,
            cursor: onOpen ? 'pointer' : 'default',
          }}
          title={capability.prompt || capability.name}
        >
          <CapabilityIcon kind={capability.kind} size={12} />
          <span>{labelMap[capability.kind] || '能力'}</span>
          <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: c.textMuted }}>
            {capability.name}
          </span>
        </button>
      ))}
    </div>
  );
}

type RuntimeDisplayState = 'queued' | 'understanding' | 'context_resolving' | 'capability_matching' | 'entity_resolving' | 'tool_executing' | 'result_composing' | 'final' | 'degraded' | 'blocked' | 'empty' | 'skipped' | 'failed' | 'cancelled';

const RUNTIME_STATUS_TEXT: Record<RuntimeDisplayState, string> = {
  queued: '\u5df2\u6536\u5230\u8bf7\u6c42',
  understanding: '\u6b63\u5728\u7406\u89e3\u8bf7\u6c42',
  context_resolving: '\u6b63\u5728\u8865\u9f50\u4e0a\u4e0b\u6587',
  capability_matching: '\u6b63\u5728\u5339\u914d\u80fd\u529b',
  entity_resolving: '\u6b63\u5728\u8bc6\u522b\u6761\u4ef6',
  tool_executing: '\u6b63\u5728\u83b7\u53d6\u6570\u636e',
  result_composing: '\u6b63\u5728\u751f\u6210\u7ed3\u679c',
  final: '\u5df2\u5b8c\u6210',
  degraded: '\u5df2\u8fd4\u56de\u5f53\u524d\u53ef\u7528\u7ed3\u679c',
  blocked: '\u9700\u8981\u8865\u5145\u6761\u4ef6',
  empty: '\u6682\u65e0\u53ef\u7528\u7ed3\u679c',
  skipped: '\u65e0\u9700\u6267\u884c',
  failed: '\u5904\u7406\u5f02\u5e38',
  cancelled: '\u5df2\u505c\u6b62',
};

function hasAssistantVisibleContent(message: Message): boolean {
  return message.role === 'assistant' && typeof message.content === 'string' && message.content.trim().length > 0;
}

function normalizeRuntimeStatus(message: Message): RuntimeDisplayState {
  const metadata = message.metadata || {};
  const runtimeState = metadata.runtime_state && typeof metadata.runtime_state === 'object'
    ? metadata.runtime_state as Record<string, unknown>
    : null;
  const raw = String(metadata.turn_ui_status || runtimeState?.status || '').toLowerCase();
  if (raw === 'idle' || raw === 'submitting' || raw === 'queued') return hasAssistantVisibleContent(message) ? 'final' : 'queued';
  if (raw === 'assistant_pending') return 'understanding';
  if (raw === 'streaming' || raw === 'finalizing') return 'result_composing';
  if (raw === 'tool_running') return 'tool_executing';
  if (raw === 'completed' || raw === 'complete' || raw === 'done' || raw === 'success') return 'final';
  if (raw === 'degraded' || raw === 'partial') return 'degraded';
  if (raw === 'blocked') return 'blocked';
  if (raw === 'empty') return 'empty';
  if (raw === 'cancel_requested' || raw === 'cancelled') return 'cancelled';
  if (raw === 'failed' || raw === 'error') return 'failed';
  if (raw === 'skipped') return 'skipped';

  const runningEvent = message.process_events?.find((event) => event.status === 'running');
  if (runningEvent?.type === 'capability.checked') return 'capability_matching';
  if (runningEvent?.type === 'context.prepared') return 'context_resolving';
  if (runningEvent?.type?.startsWith('mcp.')) return 'tool_executing';
  if (message.process_events?.length) return 'final';
  if (hasAssistantVisibleContent(message)) return 'final';
  return 'queued';
}

function runtimeStepLabel(message: Message, fallbackLabel?: string): string {
  const events = message.process_events || [];
  const running = [...events].reverse().find((event) => event.status === 'running');
  const latest = [...events].reverse().find((event) => event.label);
  const runtimeState = message.metadata?.runtime_state && typeof message.metadata.runtime_state === 'object'
    ? message.metadata.runtime_state as Record<string, unknown>
    : null;
  return running?.label
    || (typeof runtimeState?.label === 'string' ? runtimeState.label : '')
    || fallbackLabel
    || latest?.label
    || '';
}

function runtimeStepCount(message: Message): number {
  return Math.max(message.process_events?.length || 0, message.thinking_steps?.length || 0, message.tool_calls?.length || 0);
}

function runtimeDurationText(message: Message): string {
  const events = message.process_events || [];
  const durations = events
    .map((event) => typeof event.duration_ms === 'number' ? event.duration_ms : 0)
    .filter((value) => value > 0);
  const totalMs = durations.length > 0
    ? durations.reduce((sum, value) => sum + value, 0)
    : (() => {
        const started = events
          .map((event) => Date.parse(event.started_at))
          .filter((value) => Number.isFinite(value));
        const completed = events
          .map((event) => Date.parse(event.completed_at || ''))
          .filter((value) => Number.isFinite(value));
        if (!started.length || !completed.length) return 0;
        return Math.max(...completed) - Math.min(...started);
      })();
  if (!totalMs || totalMs < 0) return '';
  const seconds = totalMs / 1000;
  return seconds >= 10 ? `${Math.round(seconds)}s` : `${seconds.toFixed(1)}s`;
}

function shouldShowRuntimeStatusCard(message: Message): boolean {
  const status = String(message.metadata?.turn_ui_status || '');
  return Boolean(status || message.process_events?.length || message.thinking_steps?.length || message.tool_calls?.length);
}

function RuntimeStatusCard({
  message,
  label,
  presentationResult,
  onOpenDisclosure,
}: {
  message: Message;
  label?: string;
  presentationResult: SemanticResultContract | null;
  onOpenDisclosure?: (message: Message) => void;
}) {
  const c = useThemeColors();
  if (!shouldShowRuntimeStatusCard(message)) return null;

  const status = normalizeRuntimeStatus(message);
  const terminal = status === 'final' || status === 'degraded' || status === 'blocked' || status === 'empty' || status === 'failed' || status === 'cancelled' || status === 'skipped';
  const stepCount = runtimeStepCount(message);
  const duration = runtimeDurationText(message);
  const currentLabel = cleanRuntimeLabel(runtimeStepLabel(message, label)) || RUNTIME_STATUS_TEXT[status];
  const projection = presentationResult
    ? projectMessagePresentation({ message, result: presentationResult })
    : null;
  const hasSideDetails = Boolean(
    onOpenDisclosure
      && (message.process_events?.length || message.tool_calls?.length || projection?.sideRegions.length || presentationResult),
  );
  const openDisclosure = () => {
    if (!hasSideDetails || !onOpenDisclosure) return;
    onOpenDisclosure(message);
  };
  const completedText = [
    `\u5df2\u5904\u7406 ${stepCount || 1} \u6b65`,
    duration ? `\u7528\u65f6 ${duration}` : '',
  ].filter(Boolean).join(' · ');
  const displayText = status === 'final'
    ? completedText
    : terminal
      ? RUNTIME_STATUS_TEXT[status]
      : currentLabel;
  const textColor = status === 'failed'
    ? c.danger
    : status === 'degraded' || status === 'blocked' || status === 'empty'
      ? c.chat.text.muted
      : status === 'cancelled' || status === 'skipped'
      ? c.chat.text.muted
      : terminal
        ? c.textSecondary
        : c.accent;

  return (
    <div
      className="xq-runtime-status-card"
      data-runtime-status={status}
      role={hasSideDetails ? 'button' : undefined}
      tabIndex={hasSideDetails ? 0 : undefined}
      style={{
        marginBottom: c.chat.spacing.inlineGap,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        borderRadius: c.chat.radius.badge,
        border: `1px solid ${c.chat.border.subtle}`,
        background: c.chat.surface.status,
        color: textColor,
        padding: '6px 10px',
        fontSize: 12,
        lineHeight: 1.5,
        cursor: hasSideDetails ? 'pointer' : 'default',
      }}
      onClick={openDisclosure}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openDisclosure();
        }
      }}
    >
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <span
          aria-hidden="true"
          className={!terminal ? 'xq-runtime-pulse' : undefined}
          style={{
            width: 7,
            height: 7,
            borderRadius: 999,
            background: textColor,
            flexShrink: 0,
          }}
        />
        <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {displayText}
        </span>
      </div>
    </div>
  );
}

function MessageSurface({
  item,
  presentationResult,
  codeStyle,
  showLineNumbers,
  onFollowUpClick,
  onSubmitFollowUp,
  onOpenDisclosure,
}: {
  item: BubbleItem;
  presentationResult: SemanticResultContract | null;
  codeStyle: CodeStyle;
  showLineNumbers: boolean;
  onFollowUpClick?: (text: string) => void;
  onSubmitFollowUp?: (content: string) => void;
  onOpenDisclosure?: (message: Message) => void;
}) {
  const c = useThemeColors();
  const isAi = item.role === 'ai';
  const shellRadius = isAi ? c.chat.radius.message : c.chat.radius.section;
  const shellBorder = isAi ? c.chat.border.subtle : 'transparent';
  const shellBackground = isAi ? c.chat.surface.assistant : c.chat.surface.user;
  const turnLabel = typeof item.rawMessage.metadata?.turn_status_label === 'string'
    ? item.rawMessage.metadata.turn_status_label
    : '';
  const hasAssistantContent = item.content.trim().length > 0;

  if (!isAi) {
    return (
      <section
        style={{
          maxWidth: '72%',
          marginLeft: 'auto',
          borderRadius: shellRadius,
          border: `1px solid ${shellBorder}`,
          background: shellBackground,
          padding: '10px 12px',
          color: c.chat.text.primary,
          wordBreak: 'break-word',
          lineHeight: 1.72,
        }}
      >
        <MarkdownRenderer content={visibleChatContent(item.content)} codeStyle={codeStyle} showLineNumbers={showLineNumbers} />
      </section>
    );
  }

  return (
    <section
      style={{
        width: '100%',
        borderRadius: shellRadius,
        border: `1px solid ${shellBorder}`,
        background: shellBackground,
        overflow: 'hidden',
        boxShadow: c.chat.shadow.panel,
      }}
    >
      <div style={{ padding: presentationResult ? c.chat.spacing.blockGap : 12 }}>
        <RuntimeStatusCard
          message={item.rawMessage}
          label={turnLabel}
          presentationResult={presentationResult}
          onOpenDisclosure={onOpenDisclosure}
        />
        {presentationResult ? (
          <div style={{ display: 'grid', gap: c.chat.spacing.sectionGap }}>
            <MessagePresentationRenderer
              message={item.rawMessage}
              result={presentationResult}
              onFollowUpClick={onFollowUpClick}
              onSubmitFollowUp={onSubmitFollowUp}
            />
          </div>
        ) : hasAssistantContent ? (
          <div style={{ display: 'grid', gap: c.chat.spacing.sectionGap }}>
            <div style={{ padding: '2px 2px 0', wordBreak: 'break-word', lineHeight: 1.75 }}>
              <MarkdownRenderer content={item.content} codeStyle={codeStyle} showLineNumbers={showLineNumbers} />
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function shouldShowMetricExplanationCard(item: BubbleItem): boolean {
  if (item.role !== 'ai') return false;
  const text = item.content;
  return /(激活数|注册数|付费数|注册设备数|注册账号数|activation|register|payment)/i.test(text)
    && (item.rawMessage.intent_type === 'help' || item.agent === 'help');
}

function getMetricExplainerSchema(message: Message): MetricExplainerUISchema | null {
  const meta = message.metadata || {};
  const direct = meta.metric_explainer_schema;
  if (isMetricExplainerUISchema(direct)) return direct;

  const workflowResult = meta.workflow_result;
  if (workflowResult && typeof workflowResult === 'object') {
    const payload = (workflowResult as Record<string, unknown>).structured_payload;
    if (payload && typeof payload === 'object') {
      const schema = (payload as Record<string, unknown>).metric_explainer;
      if (isMetricExplainerUISchema(schema)) return schema;
    }
  }

  const resultPayload = meta.structured_payload;
  if (resultPayload && typeof resultPayload === 'object') {
    const schema = (resultPayload as Record<string, unknown>).metric_explainer;
    if (isMetricExplainerUISchema(schema)) return schema;
  }

  return null;
}

function getAgentDisplayName(agent?: string) {
  const names: Record<string, string> = {
    help: '使用帮助',
    report: '问数分析',
    report_query: '问数分析',
    diagnosis: '数据排查',
    demand: '需求跟踪',
    debugging: '自动联调',
    delivery: '验流程',
    monitoring: '监控任务',
    material: '素材',
    prediction: '预测分析',
    hub: '小乔智投',
  };
  return agent ? names[agent] || AGENT_MAP[agent]?.name || agent : '';
}

function MetricExplanationCard() {
  const c = useThemeColors();
  const rows = [
    ['激活数', '用户首次打开或激活应用后产生的归因结果', '激活事件、设备标识、媒体点击标识、归因时间'],
    ['注册数', '完成账号注册动作的用户数，通常按账号或用户 ID 去重', '注册事件、用户 ID、设备 ID、渠道、注册时间'],
    ['付费数', '完成支付事件的用户数，通常按订单或用户维度统计', '支付事件、订单 ID、金额、币种、用户 ID、支付时间'],
  ];

  return (
    <div style={{ margin: '0 0 10px', border: `1px solid ${c.borderFaint}`, borderRadius: 14, background: '#fff', overflow: 'hidden' }}>
      <div style={{ padding: '10px 12px', borderBottom: `1px solid ${c.borderFaint}` }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: c.textPrimary }}>指标解释器</div>
        <div style={{ marginTop: 3, fontSize: 12, color: c.textMuted }}>按“采集位置、上报事件、字段、计算过程、歧义和报表差异”解释。</div>
      </div>
      <div style={{ display: 'grid' }}>
        {rows.map(([name, meaning, fields]) => (
          <div key={name} style={{ display: 'grid', gridTemplateColumns: '88px minmax(0, 1fr)', gap: 10, padding: '10px 12px', borderBottom: `1px solid ${c.borderFaint}` }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: c.textPrimary }}>{name}</div>
            <div>
              <div style={{ fontSize: 12, color: c.textSecondary, lineHeight: 1.6 }}>{meaning}</div>
              <div style={{ marginTop: 4, fontSize: 11, color: c.textMuted, lineHeight: 1.6 }}>关键字段：{fields}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function visibleChatContent(content: string): string {
  const action = decodeReportActionEnvelope(content.trim());
  if (!action) return content;
  if (action.action === 'select_entity_candidate') {
    const candidateName = typeof action.params?.candidateName === 'string' && action.params.candidateName.trim()
      ? action.params.candidateName.trim()
      : action.label.replace(/^选择\s*/, '').trim();
    return `已按“${candidateName || action.label}”继续查询`;
  }
  return reportActionLabel(content);
}

function RuntimeStateBar({ state }: { state?: Record<string, unknown> }) {
  const c = useThemeColors();
  if (!state) return null;
  const label = typeof state.label === 'string' ? state.label : '';
  if (!label) return null;
  const status = typeof state.status === 'string' ? state.status : 'running';
  const done = status === 'completed';
  return (
    <div
      style={{
        marginBottom: 8,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        borderRadius: 999,
        border: `1px solid ${done ? c.borderFaint : c.accentBorder}`,
        background: done ? '#fff' : c.accentBgFaint,
        color: done ? c.textMuted : c.accent,
        padding: '5px 10px',
        fontSize: 12,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: 999,
          background: done ? c.textMuted : c.accent,
        }}
      />
      {label}
    </div>
  );
}

type QuickChipsRowProps = {
  starterItems: Array<{
    id: string;
    label: string;
    prompt: string;
    agent?: string;
    openPanel?: boolean;
    children?: Array<{
      id: string;
      label: string;
      prompt: string;
      agent?: string;
      openPanel?: boolean;
      enabled: boolean;
      sortOrder: number;
    }>;
  }>;
  compact?: boolean;
  onOpenAgentPanel?: (agent: AgentType) => void;
  onFollowUpClick?: (text: string) => void;
};

export function QuickChipsRow({ starterItems, compact = false, onOpenAgentPanel, onFollowUpClick }: QuickChipsRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  // Flatten: take first enabled child from each starter
  const flatChips = useMemo(() => {
    const chips: Array<{ id: string; label: string; prompt: string; agent?: string; openPanel?: boolean }> = [];
    for (const starter of starterItems) {
      if (starter.children?.length) {
        const first = starter.children.filter((item) => item.enabled).sort((a, b) => a.sortOrder - b.sortOrder)[0];
        if (first) {
          chips.push({ id: first.id, label: first.label, prompt: first.prompt, agent: first.agent, openPanel: first.openPanel });
        }
      } else {
        chips.push({ id: `${starter.id}-default`, label: starter.label, prompt: starter.prompt, agent: starter.agent, openPanel: starter.openPanel });
      }
    }
    return chips;
  }, [starterItems]);

  const checkArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setShowLeftArrow(el.scrollLeft > 4);
    setShowRightArrow(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkArrows, { passive: true });
    const observer = new ResizeObserver(checkArrows);
    observer.observe(el);
    checkArrows();
    return () => {
      el.removeEventListener('scroll', checkArrows);
      observer.disconnect();
    };
  }, [checkArrows]);

  const scrollBy = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'left' ? -288 : 288, behavior: 'smooth' });
  };

  const arrowBaseStyle: React.CSSProperties = {
    flexShrink: 0,
    width: 36,
    height: 35,
    borderRadius: 20,
    border: 'none',
    background: 'transparent',
    boxShadow: 'none',
    color: '#566074',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: 24,
    fontWeight: 300,
    transition: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1), border-color 200ms ease, box-shadow 200ms ease, background 200ms ease, opacity 200ms ease',
  };

  return (
      <div
        style={{
          width: '100%',
          position: 'relative',
          minHeight: 44,
          padding: '0 10px',
          boxSizing: 'border-box',
        }}
      >
      <div
        style={{
          position: 'absolute',
          left: 10,
          top: 0,
          bottom: 0,
          width: showLeftArrow ? 268 : 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          zIndex: 12,
          pointerEvents: 'none',
          height: 35,
          margin: 'auto 0',
        }}
      >
        <button
          type="button"
          onClick={() => scrollBy('left')}
          aria-label="向左滚动"
          aria-hidden={!showLeftArrow}
          tabIndex={showLeftArrow ? 0 : -1}
          style={{
            ...arrowBaseStyle,
            opacity: showLeftArrow ? 1 : 0,
            pointerEvents: showLeftArrow ? 'auto' : 'none',
            transform: 'translateY(-4px)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px) scale(1.05)';
            e.currentTarget.style.background = '#F3F4F6';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.background = 'transparent';
          }}
        >
          ‹
        </button>
      </div>
      <div
        ref={scrollRef}
        style={{
          width: '100%',
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          padding: '2px 0',
          minWidth: 0,
          paddingLeft: showLeftArrow ? 328 : 0,
          paddingRight: showRightArrow ? 176 : 44,
          maskImage: showLeftArrow
            ? 'linear-gradient(to right, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 1) 66px, rgba(0, 0, 0, 1) calc(100% - 122px), rgba(0, 0, 0, 0.92) calc(100% - 82px), rgba(0, 0, 0, 0.28) calc(100% - 48px), rgba(0, 0, 0, 0) 100%)'
            : 'linear-gradient(to right, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 1) calc(100% - 122px), rgba(0, 0, 0, 0.92) calc(100% - 82px), rgba(0, 0, 0, 0.28) calc(100% - 48px), rgba(0, 0, 0, 0) 100%)',
          WebkitMaskImage: showLeftArrow
            ? 'linear-gradient(to right, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 1) 66px, rgba(0, 0, 0, 1) calc(100% - 122px), rgba(0, 0, 0, 0.92) calc(100% - 82px), rgba(0, 0, 0, 0.28) calc(100% - 48px), rgba(0, 0, 0, 0) 100%)'
            : 'linear-gradient(to right, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 1) calc(100% - 122px), rgba(0, 0, 0, 0.92) calc(100% - 82px), rgba(0, 0, 0, 0.28) calc(100% - 48px), rgba(0, 0, 0, 0) 100%)',
        }}
        className="xiaoqiao-chips-scroll"
      >
        {flatChips.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              if (item.openPanel !== false) onOpenAgentPanel?.(item.agent as AgentType);
              onFollowUpClick?.(item.prompt);
            }}
            style={{
              flexShrink: 0,
              height: 35,
              padding: '0 14px',
              borderRadius: 20,
              border: '1px solid #E6ECF6',
              background: '#fff',
              color: '#666666',
              fontSize: 14,
              fontWeight: 400,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              whiteSpace: 'nowrap',
              transition: 'transform 220ms cubic-bezier(0.4, 0, 0.2, 1), border-color 220ms cubic-bezier(0.4, 0, 0.2, 1), background 220ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 220ms cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.borderColor = '#BBD1FE';
              e.currentTarget.style.background = '#F5F8FF';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(46, 117, 254, 0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = '#E6ECF6';
              e.currentTarget.style.background = '#fff';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <span aria-hidden style={{ width: 6, height: 6, borderRadius: '50%', background: '#B1C1FF', flexShrink: 0 }} />
            {item.label}
          </button>
        ))}
      </div>
      <div
        style={{
          position: 'absolute',
          right: 12,
          top: 0,
          bottom: 0,
          width: showRightArrow ? 164 : 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          zIndex: 11,
          pointerEvents: 'none',
          background: 'linear-gradient(270deg, rgba(255, 255, 255, 0.24) 0%, rgba(255, 255, 255, 0.10) 100%)',
          height: 35,
          margin: 'auto 0',
        }}
      >
        <button
          type="button"
          onClick={() => scrollBy('right')}
          aria-label="向右滚动"
          aria-hidden={!showRightArrow}
          tabIndex={showRightArrow ? 0 : -1}
          style={{
            ...arrowBaseStyle,
            opacity: showRightArrow ? 1 : 0,
            pointerEvents: showRightArrow ? 'auto' : 'none',
            transform: 'translateY(-4px)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px) scale(1.05)';
            e.currentTarget.style.background = '#F3F4F6';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.background = 'transparent';
          }}
        >
          ›
        </button>
      </div>
    </div>
  );
}

export default function ChatContainer({
  messages,
  isTyping,
  onFollowUpClick,
  devMode = false,
  onViewCallChain,
  onOpenSourcePanel,
  onEditUserMessage,
  onSubmitFollowUp,
  onStopGeneration,
  contextThinkingSteps,
  chatSettings,
  systemPrompt,
  onOpenAgentPanel,
  onShareConversation,
  currentConversationTitle,
  conversationKey,
  chatDisplayConfig = DEFAULT_CHAT_DISPLAY_CONFIG,
  onResultRecommendationsChange,
}: ChatContainerProps) {
  const c = useThemeColors();
  const isMobile = useIsMobile();
  const { speak, stopSpeaking, synthesisSupported, speaking } = useSpeech();
  const { settings } = chatSettings;
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [editingMessage, setEditingMessage] = useState<BubbleItem | null>(null);
  const [editingDraft, setEditingDraft] = useState('');
  const [messageVersions, setMessageVersions] = useState<Record<string, { items: string[]; active: number }>>({});
  const [savedKnowledgeMemoryIds, setSavedKnowledgeMemoryIds] = useState<Record<string, string>>({});
  const [messageFeedback, setMessageFeedback] = useState<Record<string, 'like' | 'dislike'>>({});
  const [viewportWidth, setViewportWidth] = useState(1280);
  const [renderFailedMessageIds, setRenderFailedMessageIds] = useState<Set<string>>(new Set());
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const lastConversationKeyRef = useRef<string | null | undefined>(undefined);
  const pendingInitialBottomScrollRef = useRef(false);
  const wasNearBottomRef = useRef(true);
  const previousMessagesLengthRef = useRef(0);

  useEffect(() => {
    const syncViewport = () => setViewportWidth(window.innerWidth);
    syncViewport();
    window.addEventListener('resize', syncViewport);
    return () => window.removeEventListener('resize', syncViewport);
  }, []);

  const effectiveChatDisplayConfig = useMemo<ChatDisplayConfig>(() => ({
    ...DEFAULT_CHAT_DISPLAY_CONFIG,
    ...chatDisplayConfig,
    starters: Array.isArray(chatDisplayConfig.starters) && chatDisplayConfig.starters.length
      ? chatDisplayConfig.starters
      : DEFAULT_CHAT_DISPLAY_CONFIG.starters,
  }), [chatDisplayConfig]);

  // 欢迎语随机选取：后台配置加载完成后更新，之后在组件生命周期内保持稳定
  const randomWelcomeText = useMemo<string>(() => {
    const pool = effectiveChatDisplayConfig.welcomeTexts?.length
      ? effectiveChatDisplayConfig.welcomeTexts
      : effectiveChatDisplayConfig.welcomeText
        ? [effectiveChatDisplayConfig.welcomeText]
        : [];
    if (!pool.length) return '需要我帮你做什么吗？';
    const index = Math.floor(Math.random() * pool.length);
    return pool[index] || '需要我帮你做什么吗？';
  }, [effectiveChatDisplayConfig.welcomeText, effectiveChatDisplayConfig.welcomeTexts]);

  useLayoutEffect(() => {
    const nextConversationKey = conversationKey ?? null;
    if (lastConversationKeyRef.current !== nextConversationKey) {
      lastConversationKeyRef.current = nextConversationKey;
      pendingInitialBottomScrollRef.current = Boolean(nextConversationKey);
    }

    const node = scrollContainerRef.current;
    if (!node || messages.length === 0) return;

    if (pendingInitialBottomScrollRef.current) {
      pendingInitialBottomScrollRef.current = false;
      const scrollToLoadedBottom = () => {
        const current = scrollContainerRef.current;
        if (!current) return;
        current.scrollTop = Math.max(0, current.scrollHeight - current.clientHeight);
        chatEndRef.current?.scrollIntoView({ block: 'end' });
        current.scrollTop = Math.max(0, current.scrollHeight - current.clientHeight);
        setShowScrollBottom(false);
      };
      scrollToLoadedBottom();
      const firstFrame = window.requestAnimationFrame(() => {
        scrollToLoadedBottom();
        window.requestAnimationFrame(scrollToLoadedBottom);
      });
      const settleTimer = window.setTimeout(scrollToLoadedBottom, 120);
      const lateSettleTimer = window.setTimeout(scrollToLoadedBottom, 320);
      return () => {
        window.cancelAnimationFrame(firstFrame);
        window.clearTimeout(settleTimer);
        window.clearTimeout(lateSettleTimer);
      };
    }

    const latestMessage = messages[messages.length - 1];
    const hasNewMessage = messages.length > previousMessagesLengthRef.current;
    previousMessagesLengthRef.current = messages.length;
    const shouldFollow = wasNearBottomRef.current || (hasNewMessage && latestMessage?.role === 'user');
    if (shouldFollow) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setShowScrollBottom(false);
    } else {
      setShowScrollBottom(true);
    }
  }, [conversationKey, messages.length, isTyping]);

  const handleScroll = useCallback(() => {
    const node = scrollContainerRef.current;
    if (!node) return;
    const distanceToBottom = node.scrollHeight - node.scrollTop - node.clientHeight;
    wasNearBottomRef.current = distanceToBottom < 120;
    setShowScrollBottom(distanceToBottom > 220);
  }, []);

  const scrollToBottom = useCallback(() => {
    wasNearBottomRef.current = true;
    setShowScrollBottom(false);
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handleQuoteMessage = useCallback((content: string) => {
    if (!onFollowUpClick) return;
    onFollowUpClick(`引用这条消息继续处理：\n${content}`);
  }, [onFollowUpClick]);

  const handleCopyMessage = useCallback(async (message: Message) => {
    const text = serializeMessageForCopy(message).trim();
    if (!text) {
      antMessage.info('当前没有可复制的内容');
      return;
    }
    const result = await copyTextWithFallback(text);
    if (result.ok) {
      antMessage.success('已复制');
    } else {
      antMessage.error('复制失败，请手动选择文本');
    }
  }, []);

  const handleRegenerateMessage = useCallback((content: string, isAi: boolean) => {
    if (!onFollowUpClick) return;
    onFollowUpClick(
      isAi
        ? `请基于上一条回复重新生成一个更好的版本：\n${content}`
        : `请基于这条输入重新生成回复：\n${content}`,
    );
  }, [onFollowUpClick]);

  const handleToggleSaveToKnowledge = useCallback(async (message: Message) => {
    const messageId = message.message_id || message.id || `local:${message.conversation_id || conversationKey || 'conversation'}:${message.created_at || message.timestamp || message.content.slice(0, 24)}`;
    if (!messageId) {
      antMessage.warning('当前消息缺少标识，暂不能保存到个人知识库');
      return;
    }

    const existingMemoryId = savedKnowledgeMemoryIds[messageId];
    if (existingMemoryId?.startsWith('pending:')) {
      antMessage.info('正在保存到个人知识库');
      return;
    }
    if (existingMemoryId) {
      setSavedKnowledgeMemoryIds((prev) => {
        const next = { ...prev };
        delete next[messageId];
        return next;
      });
      try {
        const response = await fetch(`/api/xiaoqiao/memory/${encodeURIComponent(existingMemoryId)}`, { method: 'DELETE' });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload?.success === false) {
          throw new Error(payload?.error || 'delete memory failed');
        }
        antMessage.success('已取消保存到个人知识库');
      } catch {
        setSavedKnowledgeMemoryIds((prev) => ({
          ...prev,
          [messageId]: existingMemoryId,
        }));
        antMessage.error('取消保存失败，请稍后重试');
      }
      return;
    }

    const optimisticMemoryId = `pending:${messageId}`;
    setSavedKnowledgeMemoryIds((prev) => ({
      ...prev,
      [messageId]: optimisticMemoryId,
    }));
    try {
      const response = await fetch('/api/xiaoqiao/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: `chat-message:${messageId}`,
          content: message.content || '',
          memory_type: 'context',
          source: 'agent_summary',
          source_conversation_id: message.conversation_id,
          keywords: ['chat-message', messageId, 'saved-knowledge'],
          business_domain: 'zhitou-chat',
          importance: 4,
        }),
      });
      const memory = await response.json().catch(() => ({}));
      if (!response.ok || !memory?.id) {
        throw new Error(memory?.error || 'create memory failed');
      }
      setSavedKnowledgeMemoryIds((prev) => ({
        ...prev,
        ...(prev[messageId] === optimisticMemoryId ? { [messageId]: memory.id } : {}),
      }));
      if (memory.sync_result?.success === false || memory.sync_result?.status === 'failed') {
        antMessage.warning('已保存到个人知识库，同步稍后重试');
      } else {
        antMessage.success('已保存到个人知识库');
      }
    } catch (error) {
      console.error('save message to knowledge failed', error);
      setSavedKnowledgeMemoryIds((prev) => {
        const next = { ...prev };
        if (next[messageId] === optimisticMemoryId) {
          delete next[messageId];
        }
        return next;
      });
      antMessage.error('保存到个人知识库失败，请稍后重试');
    }
  }, [conversationKey, savedKnowledgeMemoryIds]);

  const handleMessageFeedback = useCallback((messageId: string, feedback: 'like' | 'dislike') => {
    setMessageFeedback((prev) => {
      const next = { ...prev };
      if (next[messageId] === feedback) {
        delete next[messageId];
      } else {
        next[messageId] = feedback;
      }
      return next;
    });
    antMessage.success(feedback === 'like' ? '已记录喜欢反馈' : '已记录不喜欢反馈');
  }, []);

  const openUserMessageEditor = useCallback((item: BubbleItem) => {
    setEditingMessage(item);
    setEditingDraft(item.content);
  }, []);

  const submitEditedUserMessage = useCallback(() => {
    const nextContent = editingDraft.trim();
    if (!editingMessage || !nextContent || !onEditUserMessage) return;

    const messageId = editingMessage.messageId || editingMessage.key;
    setMessageVersions((prev) => {
      const current = prev[messageId] || { items: [editingMessage.content], active: 0 };
      const nextItems = [...current.items, nextContent];
      return {
        ...prev,
        [messageId]: {
          items: nextItems,
          active: nextItems.length - 1,
        },
      };
    });
    setEditingMessage(null);
    setEditingDraft('');
    onEditUserMessage(nextContent);
  }, [editingDraft, editingMessage, onEditUserMessage]);

  const shiftMessageVersion = useCallback((messageId: string, delta: number) => {
    setMessageVersions((prev) => {
      const current = prev[messageId];
      if (!current) return prev;
      const nextActive = Math.min(Math.max(current.active + delta, 0), current.items.length - 1);
      return {
        ...prev,
        [messageId]: { ...current, active: nextActive },
      };
    });
  }, []);

  const buildSpeechText = useCallback((raw: string) => raw
    .replace(/```[\s\S]*?```/g, '代码片段已省略。')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/#+\s/g, '')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/\n{2,}/g, '。')
    .replace(/\n/g, '，')
    .trim(), []);

  const handleSpeakMessage = useCallback((messageId: string, content: string) => {
    if (!synthesisSupported) {
      antMessage.warning('当前浏览器暂不支持语音播报');
      return;
    }

    if (playingMessageId === messageId && speaking) {
      stopSpeaking();
      setPlayingMessageId(null);
      return;
    }

    const started = speak(buildSpeechText(content), {
      onEnd: () => setPlayingMessageId(null),
    });

    if (started) {
      setPlayingMessageId(messageId);
    }
  }, [buildSpeechText, playingMessageId, speak, speaking, stopSpeaking, synthesisSupported]);

  const activeStarterItems = useMemo(() => effectiveChatDisplayConfig.starters
    .filter((item) => item.enabled)
    .sort((a, b) => {
      const preferredOrder = ['delivery', 'anomaly-diagnosis', 'metric-explain', 'business-collaboration', 'data-analysis', 'report-generation', 'market-intel'];
      const aIndex = preferredOrder.indexOf(a.id);
      const bIndex = preferredOrder.indexOf(b.id);
      if (aIndex !== -1 || bIndex !== -1) {
        return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
      }
      return a.sortOrder - b.sortOrder;
    }), [effectiveChatDisplayConfig.starters]);

  const compactWelcome = isMobile || viewportWidth <= 980;

  const renderableMessages = useMemo(() => messages.filter(isRenderableMessage), [messages]);

  const bubbleItems = useMemo<BubbleItem[]>(() => renderableMessages.map((msg, index) => {
    const isLiveAssistantMessage = msg.role === 'assistant' && index === renderableMessages.length - 1 && isTyping;
    const workflowType = typeof msg.metadata?.workflow_card === 'object'
      ? (msg.metadata.workflow_card as { type?: string }).type
      : undefined;
    let kind: BubbleKind = msg.role === 'user' ? 'user' : 'assistant';
    if (msg.role === 'system' || msg.message_type === 'system_notice') kind = 'system';
    if (msg.message_type === 'clarification') kind = 'clarification';
    if (msg.message_type === 'workflow_summary') kind = 'summary';

    const messageKey = msg.message_id || msg.id || `msg-${index}`;
    const versionState = msg.role === 'user' ? messageVersions[messageKey] : undefined;
    const displayContent = versionState ? versionState.items[versionState.active] : (msg.content || '');

    return {
      key: messageKey,
      role: msg.role === 'assistant' ? 'ai' : 'user',
      kind,
      content: displayContent,
      toolCalls: msg.tool_calls || [],
      missingFields: msg.missing_fields || [],
      messageId: messageKey,
      agent: msg.agent || (msg.routing_decision?.intent_type as string | undefined),
      runtimeState: (msg.metadata?.runtime_state || (msg.metadata?.workflow_result as Record<string, unknown> | undefined)?.runtime_state) as Record<string, unknown> | undefined,
      rawMessage: msg,
    };
  }), [isTyping, messageVersions, renderableMessages]);

  const latestResultRecommendations = useMemo<ComposerRecommendation[]>(() => {
    const latestAssistant = [...renderableMessages].reverse().find((message) => message.role === 'assistant');
    if (!latestAssistant) return [];
    const semanticResult = extractSemanticResult(latestAssistant);
    const messageContract = extractMessageContract(latestAssistant);
    const presentationResult = buildMessagePresentationResult({
      message: latestAssistant,
      messageContract,
      semanticResult,
    });
    if (!presentationResult) return [];
    return projectMessagePresentation({
      message: latestAssistant,
      result: presentationResult,
    }).recommendations;
  }, [renderableMessages]);

  useEffect(() => {
    onResultRecommendationsChange?.(latestResultRecommendations);
  }, [latestResultRecommendations, onResultRecommendationsChange]);

  // 消息渲染失败回调：记录失败的消息 ID
  const handleMessageRenderError = useCallback((messageId: string) => {
    setRenderFailedMessageIds((prev) => {
      if (prev.has(messageId)) return prev;
      const next = new Set(prev);
      next.add(messageId);
      return next;
    });
  }, []);

  // 当会话切换时，清空渲染失败记录
  useEffect(() => {
    setRenderFailedMessageIds(new Set());
  }, [conversationKey]);

  // 有渲染失败的消息时，不进入空态页
  if (messages.length === 0 && !isTyping && renderFailedMessageIds.size === 0) {
    return (
      <div
        id="chat-container"
        className="xiaoqiao-empty-stage chat-empty-scroll-area"
        style={{
          position: 'relative',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          minHeight: 0,
          overflowY: isMobile ? 'hidden' : 'auto',
          overflowX: 'hidden',
          padding: compactWelcome ? '20px 14px 80px' : '32px 36px 150px',
        }}
      >
        <div className="xiaoqiao-empty-particles" aria-hidden="true" />
        {/* 弥散光晕 - 氛围光效果（散开 + 呼吸动效） */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            bottom: isMobile ? '60px' : 'auto',
            top: isMobile ? 'auto' : '50%',
            left: '50%',
            transform: isMobile ? 'translateX(-50%)' : 'translate(-50%, -50%)',
            width: isMobile ? '100%' : 1260,
            height: isMobile ? 306 : 612,
            pointerEvents: 'none',
            zIndex: 0,
          }}
        >
          <div
            className="xiaoqiao-empty-glow"
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              background: isMobile
                ? 'radial-gradient(ellipse at center bottom, rgba(140, 180, 255, 0.5) 0%, rgba(165, 200, 255, 0.22) 50%, transparent 75%)'
                : 'radial-gradient(ellipse at center, rgba(130, 175, 255, 0.55) 0%, rgba(155, 190, 255, 0.26) 40%, transparent 70%)',
              filter: 'blur(100px)',
            }}
          />
        </div>
        <motion.div
          className="xiaoqiao-empty-content-shell"
          initial={false}
          style={{
            position: 'relative',
            zIndex: 1,
            width: '100%',
            maxWidth: compactWelcome ? 760 : 960,
            margin: '0 auto',
            padding: 0,
            transform: compactWelcome ? 'translateY(-70px)' : 'translateY(-152px)',
          }}
        >
          <motion.div
            initial={false}
            style={{ display: 'flex', flexDirection: compactWelcome ? 'column' : 'row', alignItems: 'center', justifyContent: 'center', gap: compactWelcome ? 8 : 2, minHeight: compactWelcome ? 184 : 228, textAlign: 'center' }}
          >
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
              className="xiaoqiao-empty-logo-wrap"
              style={{ marginRight: 2 }}
            >
              <div className="xiaoqiao-empty-logo" style={{ position: 'relative', zIndex: 1 }}>
                <WelcomeMascotIcon
                  size={compactWelcome ? 72 : 104}
                  stageWidth={compactWelcome ? 72 : 104}
                  stageHeight={compactWelcome ? 72 : 104}
                />
              </div>
            </motion.div>
            <h1 style={{ margin: compactWelcome ? '0' : '-12px -10px 0 0', fontSize: compactWelcome ? 22 : 28, fontWeight: 500, lineHeight: 1.2, letterSpacing: '-0.01em', color: '#000000', textAlign: compactWelcome ? 'center' : 'left' }}>
              {randomWelcomeText}
            </h1>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <>
    <div
      id="chat-container"
      className="conversation-scroll-area"
      ref={scrollContainerRef}
      onScroll={handleScroll}
      style={{
        position: 'relative',
        flex: 1,
        overflow: 'auto',
        padding: `4px ${isMobile ? '18px' : 'clamp(18px, 2.5vw, 20px)'} ${isMobile ? '12px' : '20px'}`,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: isMobile ? '100%' : 920,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {settings.showSystemPrompt && systemPrompt && (
          <SystemPromptDisplay prompt={systemPrompt} />
        )}

        {renderFailedMessageIds.size > 0 && (
          <div
            style={{
              borderRadius: 12,
              border: '1px solid #fde68a',
              background: '#fffbeb',
              padding: '12px 14px',
              fontSize: 13,
              color: '#92400e',
              lineHeight: 1.7,
              marginBottom: 4,
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 6 }}>
              ⚠ 部分历史消息无法正常渲染
            </div>
            <div style={{ fontSize: 12, color: '#a16207', marginBottom: 6 }}>
              <div>原因：某条消息格式不兼容（如旧版本插件、自定义卡片类型已下线）。</div>
              <div style={{ marginTop: 4 }}>你可以：</div>
              <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                <li>继续查看其他能正常展示的消息</li>
                <li>尝试「复制原始内容」查看完整对话</li>
                <li>如反复出现，请联系支持并告知会话 ID</li>
              </ul>
            </div>
            <div style={{ fontSize: 11, color: '#b45309' }}>
              受影响消息数：{renderFailedMessageIds.size} 条
            </div>
          </div>
        )}

        {bubbleItems.map((item, itemIndex) => {
        const isAi = item.role === 'ai';
        const messageId = item.messageId || item.key;
          const isRunningMessage = item.rawMessage.metadata?.turn_ui_status === 'assistant_pending'
            || item.rawMessage.metadata?.turn_ui_status === 'streaming'
            || item.rawMessage.metadata?.turn_ui_status === 'tool_running'
            || item.rawMessage.metadata?.turn_ui_status === 'finalizing'
            || item.rawMessage.metadata?.turn_ui_status === 'cancel_requested';
          const savedToKnowledge = Boolean(savedKnowledgeMemoryIds[messageId]);
          const feedbackState = messageFeedback[messageId];
          const messageContract = isAi ? extractMessageContract(item.rawMessage) : null;
          const semanticResult = isAi ? extractSemanticResult(item.rawMessage) : null;
          const presentationResult = isAi
            ? buildMessagePresentationResult({
                message: item.rawMessage,
                messageContract,
                semanticResult,
              })
            : null;
          const metricExplainerSchema = isAi
            ? getMetricExplainerSchema(item.rawMessage)
            : null;
          const hasRuntimeStatusCard = isAi && shouldShowRuntimeStatusCard(item.rawMessage);
          const bubbleWidthStyle = isAi
            ? {
                width: '100%',
                maxWidth: isMobile ? '100%' : 980,
                minWidth: 60,
              }
            : {
                width: '100%',
                maxWidth: isMobile ? '100%' : 980,
                minWidth: 60,
              };
          return (
            <div key={item.key} data-message-surface={item.messageId || item.key} style={{ position: 'relative' }}>
              <div style={{ display: 'flex', gap: isMobile ? 8 : 10, justifyContent: isAi ? 'flex-start' : 'flex-end' }}>
                <div style={bubbleWidthStyle}>
                  <MessageErrorBoundary messageId={messageId} onError={handleMessageRenderError}>
                  <MessageSurface
                    item={item}
                    presentationResult={presentationResult}
                    codeStyle={settings.codeStyle}
                    showLineNumbers={settings.codeLineNumbers}
                    onFollowUpClick={onFollowUpClick}
                    onSubmitFollowUp={onSubmitFollowUp}
                    onOpenDisclosure={isAi && onOpenSourcePanel ? (message) => onOpenSourcePanel({ message }) : undefined}
                  />
                  </MessageErrorBoundary>
                  <MessageActionBar
                    message={item.rawMessage}
                    isRunning={isRunningMessage}
                    onOpenDisclosure={undefined}
                    onCopy={() => handleCopyMessage(item.rawMessage)}
                    onRegenerate={isAi && onFollowUpClick ? () => handleRegenerateMessage(item.content, true) : undefined}
                    onEdit={!isAi && onEditUserMessage ? () => openUserMessageEditor(item) : undefined}
                    onQuote={onFollowUpClick ? () => handleQuoteMessage(item.content) : undefined}
                    feedbackState={feedbackState}
                    onLike={isAi ? () => handleMessageFeedback(messageId, 'like') : undefined}
                    onDislike={isAi ? () => handleMessageFeedback(messageId, 'dislike') : undefined}
                    savedToKnowledge={savedToKnowledge}
                    onToggleSave={isAi ? () => handleToggleSaveToKnowledge(item.rawMessage) : undefined}
                    isSpeaking={playingMessageId === item.messageId}
                    onSpeak={isAi ? () => handleSpeakMessage(item.messageId, item.content) : undefined}
                    onShareConversation={onShareConversation}
                    currentConversationTitle={currentConversationTitle}
                    onViewCallChain={onViewCallChain}
                    devMode={devMode}
                  />
                  {!isAi && messageVersions[item.messageId || item.key]?.items.length > 1 && (
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        alignItems: 'center',
                        gap: 8,
                        marginTop: 6,
                        color: c.textMuted,
                        fontSize: 12,
                      }}
                    >
                      <button
                        type="button"
                        aria-label="上一版"
                        onClick={() => shiftMessageVersion(item.messageId || item.key, -1)}
                        style={{ border: 'none', background: 'transparent', color: c.textMuted, cursor: 'pointer', padding: 2 }}
                      >
                        ?
                      </button>
                      <span>
                        {(messageVersions[item.messageId || item.key]?.active ?? 0) + 1}
                        /
                        {messageVersions[item.messageId || item.key]?.items.length ?? 1}
                      </span>
                      <button
                        type="button"
                        aria-label="下一版"
                        onClick={() => shiftMessageVersion(item.messageId || item.key, 1)}
                        style={{ border: 'none', background: 'transparent', color: c.textMuted, cursor: 'pointer', padding: 2 }}
                      >
                        ?
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        <div ref={chatEndRef} />
      </div>
      {showScrollBottom && (
        <button
          type="button"
          onClick={scrollToBottom}
          aria-label="返回底部"
          style={{
            position: 'sticky',
            left: '50%',
            bottom: 14,
            transform: 'translateX(-50%)',
            zIndex: 6,
            width: 34,
            height: 34,
            borderRadius: 999,
            border: `1px solid ${c.borderFaint}`,
            background: '#fff',
            color: c.textSecondary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
            cursor: 'pointer',
          }}
        >
          <DownOutlined style={{ fontSize: 13 }} />
        </button>
      )}
    </div>
    <Modal
      open={!!editingMessage}
      title="编辑消息"
      okText="重新发送"
      cancelText="取消"
      rootClassName="xiaoqiao-primary-modal"
      centered
      okButtonProps={{
        style: {
          background: c.accent,
          borderColor: c.accent,
          boxShadow: '0 8px 18px rgba(46, 117, 254, 0.18)',
          fontWeight: 500,
        },
      }}
      cancelButtonProps={{
        style: {
          borderColor: c.borderFaint,
          color: c.textSecondary,
          fontWeight: 500,
        },
      }}
      onOk={submitEditedUserMessage}
      onCancel={() => {
        setEditingMessage(null);
        setEditingDraft('');
      }}
      destroyOnHidden
    >
      <Input.TextArea
        value={editingDraft}
        onChange={(event) => setEditingDraft(event.target.value)}
        autoSize={{ minRows: 4, maxRows: 10 }}
        autoFocus
      />
    </Modal>
    </>
  );
}




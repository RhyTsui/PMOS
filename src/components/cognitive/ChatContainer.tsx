'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Prompts, ThoughtChain } from '@ant-design/x';
import { Dropdown, Tag, Tooltip, message as antMessage, type MenuProps } from 'antd';
import {
  BulbOutlined,
  CodeOutlined,
  CopyOutlined,
  DislikeOutlined,
  DownOutlined,
  EyeOutlined,
  InfoCircleOutlined,
  LikeOutlined,
  MoreOutlined,
  PauseCircleOutlined,
  EditOutlined,
  ReloadOutlined,
  SendOutlined,
  SoundOutlined,
  ThunderboltOutlined,
  UpOutlined,
} from '@ant-design/icons';
import type { Message, MissingField, WorkflowResult } from '@/types';
import { useThemeColors } from '@/hooks/useTheme';
import { AGENT_MAP } from '@/lib/constants';
import FancyCodeBlock, { type CodeStyle } from '@/components/ui/FancyCodeBlock';
import type { useChatSettings } from '@/hooks/useChatSettings';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSpeech } from '@/hooks/useSpeech';

interface ChatContainerProps {
  messages: Message[];
  isTyping: boolean;
  onFollowUpClick?: (text: string) => void;
  isStreaming?: boolean;
  devMode?: boolean;
  onViewCallChain?: () => void;
  onOpenSourcePanel?: (message: Message) => void;
  onEditUserMessage?: (content: string) => void;
  contextThinkingSteps?: Array<{ title: string; description?: string }>;
  currentResult?: WorkflowResult | Record<string, unknown> | null;
  chatSettings: ReturnType<typeof useChatSettings>;
  systemPrompt?: string;
  showSystemPrompt?: boolean;
  onToggleSystemPrompt?: () => void;
}

type BubbleKind = 'user' | 'assistant' | 'system' | 'clarification' | 'summary';

interface BubbleItem {
  key: string;
  role: 'ai' | 'user';
  kind: BubbleKind;
  content: string;
  thinkingSteps: NonNullable<Message['thinking_steps']>;
  toolCalls: NonNullable<Message['tool_calls']>;
  missingFields: MissingField[];
  messageId: string;
  agent?: string;
  rawMessage: Message;
}

function getResultForMessage(
  item: BubbleItem,
  currentResult?: WorkflowResult | Record<string, unknown> | null,
) {
  if (item.role !== 'ai') return null;
  const embeddedResult = item.rawMessage.metadata?.workflow_result as WorkflowResult | Record<string, unknown> | undefined;
  const result = embeddedResult || currentResult;
  if (!result) return null;
  const taskId = typeof result.task_id === 'string' ? result.task_id : undefined;
  if (taskId && item.rawMessage.task_id && taskId !== item.rawMessage.task_id) return null;
  return result;
}

interface WorkflowCardData {
  type?: string;
  status?: string;
  title?: string;
  sourceText?: string;
}

function getWorkflowCard(message: Message): WorkflowCardData | null {
  const raw = message.metadata?.workflow_card;
  if (!raw || typeof raw !== 'object') return null;
  return raw as WorkflowCardData;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const c = useThemeColors();

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  }, [text]);

  return (
    <Tooltip title={copied ? '已复制' : '复制'}>
      <button
        type="button"
        onClick={handleCopy}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: copied ? c.success : c.textMuted,
          fontSize: 13,
          width: 28,
          height: 28,
          padding: 0,
          borderRadius: 10,
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = c.accentBgFaint;
          e.currentTarget.style.color = copied ? c.success : c.accent;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'none';
          e.currentTarget.style.color = copied ? c.success : c.textMuted;
        }}
      >
        <CopyOutlined />
      </button>
    </Tooltip>
  );
}

function MessageActionButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  const c = useThemeColors();

  return (
    <Tooltip title={label}>
      <button
        type="button"
        onClick={onClick}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: c.textMuted,
          fontSize: 13,
          width: 28,
          height: 28,
          padding: 0,
          borderRadius: 10,
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = c.accentBgFaint;
          e.currentTarget.style.color = c.accent;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'none';
          e.currentTarget.style.color = c.textMuted;
        }}
      >
        {icon}
      </button>
    </Tooltip>
  );
}

function ThinkingChain({
  steps,
  toolCalls,
  title = '思维链',
  defaultExpanded = false,
}: {
  steps: NonNullable<Message['thinking_steps']>;
  toolCalls?: NonNullable<Message['tool_calls']>;
  title?: string;
  defaultExpanded?: boolean;
}) {
  const c = useThemeColors();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const totalDuration = steps.reduce((sum, step) => sum + (step.duration_ms || 0), 0);
  const running = steps.some((step) => step.status === 'loading');
  const items = steps.map((step, index) => {
    const relatedTool = toolCalls?.find((tool) => tool.name === step.key || tool.name === step.label);
    const details = [
      step.input ? `请求：${JSON.stringify(step.input).slice(0, 220)}` : '',
      step.output ? `返回：${JSON.stringify(step.output).slice(0, 220)}` : '',
      relatedTool?.arguments ? `参数：${relatedTool.arguments.slice(0, 220)}` : '',
      relatedTool?.result ? `结果：${relatedTool.result.slice(0, 220)}` : '',
    ].filter(Boolean);

    return {
      key: step.key || `${step.label}-${index}`,
      title: step.label,
      description: step.content,
      status: step.status === 'completed' ? 'success' as const : step.status,
      content: details.length ? (
        <div style={{ display: 'grid', gap: 6 }}>
          {details.map((detail) => (
            <div key={detail} style={{ borderRadius: 8, background: '#fff', padding: '6px 8px', color: c.textMuted, fontFamily: 'var(--font-mono)', fontSize: 11, lineHeight: 1.6, wordBreak: 'break-word' }}>
              {detail}
            </div>
          ))}
        </div>
      ) : undefined,
      footer: step.duration_ms ? <span>{Math.max(0.1, step.duration_ms / 1000).toFixed(1)} 秒</span> : undefined,
    };
  });

  return (
    <div
      style={{
        marginBottom: 8,
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
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontSize: 12,
          color: c.textSecondary,
        }}
      >
        <BulbOutlined style={{ fontSize: 12, color: c.accent }} />
        <span>{title}</span>
        <span style={{ color: c.textMuted }}>{running ? '处理中' : `完成 ${steps.length} 步`}</span>
        {totalDuration > 0 && <span style={{ color: c.textMuted }}>{(totalDuration / 1000).toFixed(1)} 秒</span>}
        <span style={{ marginLeft: 'auto', color: c.textMuted }}>
          {expanded ? <UpOutlined /> : <DownOutlined />}
        </span>
      </button>
      {expanded && (
        <div style={{ padding: '0 12px 12px' }}>
          <ThoughtChain
            items={items}
            line="dashed"
            styles={{
              item: { fontSize: 12 },
              itemContent: { fontSize: 12 },
              itemFooter: { color: c.textMuted, fontSize: 11 },
            }}
          />
        </div>
      )}
    </div>
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

  const renderText = (text: string) => text.split('\n').map((line, index) => {
    const boldLabelMatch = line.match(/^\*\*([^*]+)\*\*[:：]\s*(.*)$/);
    if (boldLabelMatch) {
      return (
        <div key={index} style={{ margin: '10px 0', borderRadius: 12, background: c.bgSection, padding: '10px 12px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: c.textPrimary }}>{boldLabelMatch[1]}</div>
          {boldLabelMatch[2] && <div style={{ marginTop: 4, color: c.textSecondary }}>{boldLabelMatch[2]}</div>}
        </div>
      );
    }

    if (line.startsWith('### ')) {
      return <h3 key={index} style={{ fontSize: 15, fontWeight: 700, color: c.textPrimary, marginTop: 12, marginBottom: 4 }}>{line.slice(4)}</h3>;
    }
    if (line.startsWith('## ')) {
      return <h2 key={index} style={{ fontSize: 16, fontWeight: 700, color: c.textPrimary, marginTop: 14, marginBottom: 6 }}>{line.slice(3)}</h2>;
    }
    if (line.startsWith('# ')) {
      return <h1 key={index} style={{ fontSize: 18, fontWeight: 700, color: c.textPrimary, marginTop: 16, marginBottom: 8 }}>{line.slice(2)}</h1>;
    }

    const listMatch = line.match(/^(\d+)\.\s+(.*)/);
    if (listMatch) {
      return (
        <div key={index} style={{ display: 'flex', gap: 8 }}>
          <span style={{ color: c.accent, minWidth: 18 }}>{listMatch[1]}.</span>
          <span>{listMatch[2]}</span>
        </div>
      );
    }

    if (line.startsWith('- ') || line.startsWith('* ')) {
      return (
        <div key={index} style={{ display: 'flex', gap: 8 }}>
          <span style={{ color: c.accent }}>•</span>
          <span>{line.slice(2)}</span>
        </div>
      );
    }

    if (!line.trim()) return <div key={index} style={{ height: 8 }} />;
    return <p key={index} style={{ margin: '2px 0' }}>{line}</p>;
  });

  return (
    <div style={{ fontSize: 14, lineHeight: 1.82, color: c.textBody }}>
      {segments.map((segment, index) => {
        if (segment.type === 'code') {
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
  onClick?: (field: MissingField) => void;
}) {
  const c = useThemeColors();

  if (fields.length === 0) return null;

  return (
    <div
      style={{
        marginTop: 8,
        borderRadius: 16,
        border: `1px solid ${c.borderFaint}`,
        background: c.bgSection,
        padding: '10px 12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, color: c.textSecondary, fontSize: 12 }}>
        <InfoCircleOutlined style={{ color: c.accent }} />
        <span>还需要补充的信息</span>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {fields.slice(0, 6).map((field) => (
          <button
            key={field.field_key}
            type="button"
            onClick={() => onClick?.(field)}
            style={{
              borderRadius: 999,
              border: `1px solid ${c.borderFaint}`,
              background: '#fff',
              color: c.textSecondary,
              fontSize: 12,
              padding: '6px 10px',
              cursor: 'pointer',
            }}
          >
            补充{field.field_label}
          </button>
        ))}
      </div>
    </div>
  );
}

function collectSourceRefs(message: Message): string[] {
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
    .map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object') {
        const obj = item as Record<string, unknown>;
        return String(obj.title || obj.name || obj.source || obj.id || '');
      }
      return '';
    })
    .filter(Boolean)
    .slice(0, 3);
}

function SourceReferenceStrip({
  refs,
  onOpen,
}: {
  refs: string[];
  onOpen?: () => void;
}) {
  const c = useThemeColors();
  if (refs.length === 0) return null;

  return (
    <button
      type="button"
      onClick={onOpen}
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
        cursor: onOpen ? 'pointer' : 'default',
      }}
    >
      <InfoCircleOutlined style={{ color: c.accent, fontSize: 13 }} />
      <span style={{ fontSize: 12, fontWeight: 560, flexShrink: 0 }}>来源</span>
      <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap', minWidth: 0 }}>
        {refs.map((ref) => (
          <span
            key={ref}
            style={{
              maxWidth: 180,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              borderRadius: 999,
              border: `1px solid ${c.borderFaint}`,
              background: '#fff',
              padding: '3px 8px',
              fontSize: 11,
              color: c.textMuted,
            }}
          >
            {ref}
          </span>
        ))}
      </span>
    </button>
  );
}

function WorkflowProcessCard({
  data,
  onFollowUpClick,
}: {
  data: WorkflowCardData;
  onFollowUpClick?: (text: string) => void;
}) {
  const c = useThemeColors();
  const [formOpen, setFormOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const isDebug = data.type === 'legacy_media_debug';
  const requiredFields = isDebug
    ? ['联调地址', '联调文档', '验证事件', '结果查看位置']
    : ['媒体名称', '对接文档', '监测链接参数', '回传事件', '验收方式'];

  return (
    <div
      style={{
        marginTop: 10,
        borderRadius: 16,
        border: `1px solid ${c.accentBorder}`,
        background: c.bgCard,
        boxShadow: '0 10px 28px rgba(15, 23, 42, 0.05)',
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '12px 14px', borderBottom: `1px solid ${c.borderFaint}` }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: c.textPrimary }}>
          {isDebug ? '媒体联调准备' : '新增媒体对接流程'}
        </div>
        <div style={{ marginTop: 4, fontSize: 12, color: c.textMuted, lineHeight: 1.6 }}>
          {isDebug
            ? '已有媒体进入联调前置检查，确认后继续调用联调 Agent。'
            : '新增媒体必须先补齐依赖并通过表单校验，再进入创建链接或需求池流程。'}
        </div>
      </div>

      <div style={{ padding: '12px 14px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
          {[
            { label: '收集依赖', active: true },
            { label: isDebug ? '检查准备项' : '表单校验', active: submitted },
            { label: isDebug ? '发起联调' : '创建链接/入池', active: submitted },
          ].map((step, index) => (
            <div
              key={step.label}
              style={{
                borderRadius: 12,
                border: `1px solid ${step.active ? c.accentBorder : c.borderFaint}`,
                background: step.active ? c.accentBgFaint : c.bgSection,
                padding: '9px 10px',
                color: step.active ? c.accent : c.textMuted,
                fontSize: 12,
                fontWeight: 620,
              }}
            >
              {index + 1}. {step.label}
            </div>
          ))}
        </div>

        {formOpen && (
          <div style={{ marginTop: 12, borderRadius: 14, background: c.bgSection, padding: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 650, color: c.textPrimary, marginBottom: 8 }}>结构化表单</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
              {requiredFields.map((field) => (
                <label key={field} style={{ display: 'grid', gap: 4, fontSize: 12, color: c.textSecondary }}>
                  {field}
                  <input
                    placeholder={`填写${field}`}
                    style={{
                      height: 34,
                      borderRadius: 10,
                      border: `1px solid ${c.borderFaint}`,
                      background: '#fff',
                      padding: '0 10px',
                      outline: 'none',
                    }}
                  />
                </label>
              ))}
            </div>
            {submitted && (
              <div style={{ marginTop: 10, fontSize: 12, color: c.accent, lineHeight: 1.6 }}>
                表单已校验：当前资料满足基础创建监测链接条件；若后续发现特殊回传规则，会自动生成需求并记录到需求池。
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button
            type="button"
            onClick={() => setFormOpen((prev) => !prev)}
            style={{ border: `1px solid ${c.accentBorder}`, background: c.accentBgFaint, color: c.accent, borderRadius: 999, padding: '7px 12px', fontSize: 12, cursor: 'pointer' }}
          >
            {formOpen ? '收起表单' : '打开结构化表单'}
          </button>
          <button
            type="button"
            onClick={() => setSubmitted(true)}
            style={{ border: 'none', background: c.accent, color: '#fff', borderRadius: 999, padding: '7px 12px', fontSize: 12, cursor: 'pointer' }}
          >
            提交并校验
          </button>
          <button
            type="button"
            onClick={() => onFollowUpClick?.(isDebug ? '记录联调准备为代办，并在右侧继续处理' : '记录新增媒体对接为代办，并在右侧继续补齐资料')}
            style={{ border: `1px solid ${c.borderFaint}`, background: '#fff', color: c.textSecondary, borderRadius: 999, padding: '7px 12px', fontSize: 12, cursor: 'pointer' }}
          >
            记录到代办
          </button>
          <button
            type="button"
            onClick={() => onFollowUpClick?.(isDebug ? '确认，立即进入联调' : '资料已补齐，继续创建监测链接')}
            style={{ border: `1px solid ${c.borderFaint}`, background: '#fff', color: c.textSecondary, borderRadius: 999, padding: '7px 12px', fontSize: 12, cursor: 'pointer' }}
          >
            {isDebug ? '立即联调' : '创建监测链接'}
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageSurface({
  item,
  codeStyle,
  showLineNumbers,
}: {
  item: BubbleItem;
  codeStyle: CodeStyle;
  showLineNumbers: boolean;
}) {
  const c = useThemeColors();
  const isAi = item.role === 'ai';
  const [expanded, setExpanded] = useState(false);
  const isLongMessage = item.content.length > 760 || item.content.split('\n').length > 12;
  const shouldFold = isLongMessage && !expanded;
  const foldedStyle = shouldFold
    ? {
        maxHeight: isAi ? 260 : 220,
        overflow: 'hidden' as const,
        WebkitMaskImage: 'linear-gradient(180deg, #000 72%, transparent 100%)',
        maskImage: 'linear-gradient(180deg, #000 72%, transparent 100%)',
      }
    : undefined;
  const foldButton = isLongMessage ? (
    <button
      type="button"
      onClick={() => setExpanded((prev) => !prev)}
      style={{
        marginTop: 8,
        border: `1px solid ${c.borderFaint}`,
        background: '#fff',
        color: c.textSecondary,
        borderRadius: 999,
        padding: '5px 10px',
        fontSize: 12,
        cursor: 'pointer',
      }}
    >
      {expanded ? '收起内容' : '展开全部'}
    </button>
  ) : null;

  if (item.kind === 'system') {
    return (
      <div>
        <div
          style={{
            padding: '12px 14px',
            borderRadius: 16,
            background: c.bgSection,
            border: `1px solid ${c.borderFaint}`,
            color: c.textSecondary,
            fontSize: 13,
            lineHeight: 1.75,
            whiteSpace: 'pre-wrap',
            ...foldedStyle,
          }}
        >
          {item.content}
        </div>
        {foldButton}
      </div>
    );
  }

  if (item.kind === 'clarification') {
    return (
      <div>
        <div
          style={{
            padding: '12px 14px',
            borderRadius: 16,
            background: c.accentBgFaint,
            border: `1px solid ${c.accentBorder}`,
            color: c.textSecondary,
            fontSize: 13,
            lineHeight: 1.75,
            whiteSpace: 'pre-wrap',
            ...foldedStyle,
          }}
        >
          {item.content}
        </div>
        {foldButton}
      </div>
    );
  }

  if (item.kind === 'summary') {
    return (
      <div>
        <div
          style={{
            padding: '12px 14px',
            borderRadius: 16,
            background: c.bgSection,
            border: `1px solid ${c.borderFaint}`,
            color: c.textSecondary,
            fontSize: 13,
            lineHeight: 1.75,
            whiteSpace: 'pre-wrap',
            ...foldedStyle,
          }}
        >
          {item.content}
        </div>
        {foldButton}
      </div>
    );
  }

  if (isAi) {
    return (
      <div>
        <div
          style={{
            padding: '2px 0',
            background: 'transparent',
            border: 'none',
            wordBreak: 'break-word',
            ...foldedStyle,
          }}
        >
          <MarkdownRenderer
            content={item.content}
            codeStyle={codeStyle}
            showLineNumbers={showLineNumbers}
          />
        </div>
        {foldButton}
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          padding: '10px 16px',
          borderRadius: '18px 8px 18px 18px',
          background: `linear-gradient(135deg, ${c.accentBgFaint}, ${c.accentSoft})`,
          border: `1px solid ${c.accentBorder}`,
          wordBreak: 'break-word',
          ...foldedStyle,
        }}
      >
        <div style={{ fontSize: 14, lineHeight: 1.8, color: c.textPrimary, whiteSpace: 'pre-wrap' }}>
          {item.content}
        </div>
      </div>
      {foldButton}
    </div>
  );
}

function ResultMessageCard({
  result,
}: {
  result: WorkflowResult | Record<string, unknown>;
}) {
  const c = useThemeColors();
  const summary = typeof result.summary === 'string' ? result.summary : '已生成结果';
  const resultType = typeof result.result_type === 'string' ? result.result_type : '';
  const nextActions = Array.isArray(result.next_actions) ? result.next_actions.slice(0, 4) : [];
  const pendingChecks = Array.isArray(result.pending_checks) ? result.pending_checks.slice(0, 4) : [];

  if (resultType === 'debugging_report') {
    const stages = ['需求识别', '资料确认', '发起联调', '过程观测', '结果沉淀'];
    const checks = pendingChecks.length > 0 ? pendingChecks : ['媒体账号', '应用包名', '测试设备', '联调地址'];
    const actions = nextActions.length > 0 ? nextActions : ['发起联调', '补充资料', '人工接管'];

    return (
      <div
        style={{
          borderRadius: 18,
          border: `1px solid ${c.borderFaint}`,
          background: c.bgSection,
          padding: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 10,
              background: c.accentBg,
              color: c.accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <ThunderboltOutlined />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: c.textPrimary }}>自动联调流程</div>
            <div style={{ fontSize: 12, color: c.textMuted }}>已进入联调任务承接，右侧可查看执行面板</div>
          </div>
        </div>

        <div style={{ fontSize: 14, lineHeight: 1.75, color: c.textBody }}>{summary}</div>

        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 6 }}>
          {stages.map((stage, index) => (
            <div
              key={stage}
              style={{
                borderRadius: 10,
                border: `1px solid ${index < 2 ? c.accentBorder : c.borderFaint}`,
                background: index < 2 ? c.accentBgFaint : '#fff',
                color: index < 2 ? c.accent : c.textMuted,
                padding: '8px 6px',
                textAlign: 'center',
                fontSize: 11,
                lineHeight: 1.3,
              }}
            >
              {stage}
            </div>
          ))}
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, color: c.textMuted, marginBottom: 8 }}>待确认资料</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {checks.slice(0, 4).map((item, idx) => (
              <span
                key={`${String(item)}-${idx}`}
                style={{
                  borderRadius: 999,
                  padding: '6px 10px',
                  background: '#fff',
                  border: `1px solid ${c.borderFaint}`,
                  color: c.textSecondary,
                  fontSize: 12,
                }}
              >
                {String(item)}
              </span>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {actions.slice(0, 3).map((action, idx) => (
            <button
              key={`${String(action)}-${idx}`}
              type="button"
              style={{
                border: `1px solid ${idx === 0 ? c.accentBorder : c.borderFaint}`,
                background: idx === 0 ? c.accentBg : '#fff',
                color: idx === 0 ? c.accent : c.textSecondary,
                borderRadius: 999,
                padding: '6px 10px',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              {String(action)}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const resultTypeLabelMap: Record<string, string> = {
    help_answer: '帮助说明',
    demand_form: '需求单',
    diagnosis_report: '问题排查',
    debugging_report: '自动联调',
  };

  return (
    <div
      style={{
        borderRadius: 18,
        border: `1px solid ${c.borderFaint}`,
        background: c.bgSection,
        padding: '14px 14px 12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 10,
            background: c.accentBg,
            color: c.accent,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <BulbOutlined />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: c.textPrimary }}>结果摘要</div>
          <div style={{ fontSize: 12, color: c.textMuted }}>
            {resultTypeLabelMap[resultType] || '结构化结果'}
          </div>
        </div>
      </div>

      <div style={{ fontSize: 14, lineHeight: 1.75, color: c.textBody }}>{summary}</div>

      {nextActions.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, color: c.textMuted, marginBottom: 8 }}>建议动作</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {nextActions.map((action, idx) => (
              <div
                key={`${String(action)}-${idx}`}
                style={{
                  borderRadius: 999,
                  padding: '6px 10px',
                  background: '#fff',
                  border: `1px solid ${c.borderFaint}`,
                  color: c.textSecondary,
                  fontSize: 12,
                }}
              >
                {String(action)}
              </div>
            ))}
          </div>
        </div>
      )}

      {pendingChecks.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, color: c.textMuted, marginBottom: 8 }}>待确认</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pendingChecks.map((item, idx) => (
              <div
                key={`${String(item)}-${idx}`}
                style={{
                  borderRadius: 12,
                  padding: '8px 10px',
                  background: '#fff',
                  border: `1px solid ${c.borderFaint}`,
                  color: c.textSecondary,
                  fontSize: 12,
                  lineHeight: 1.6,
                }}
              >
                {String(item)}
              </div>
            ))}
          </div>
        </div>
      )}
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
  contextThinkingSteps,
  currentResult,
  chatSettings,
  systemPrompt,
}: ChatContainerProps) {
  const c = useThemeColors();
  const isMobile = useIsMobile();
  const { speak, stopSpeaking, synthesisSupported, speaking } = useSpeech();
  const { settings } = chatSettings;
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isTyping]);

  const handleScroll = useCallback(() => {
    const node = scrollContainerRef.current;
    if (!node) return;
    const distanceToBottom = node.scrollHeight - node.scrollTop - node.clientHeight;
    setShowScrollBottom(distanceToBottom > 220);
  }, []);

  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handleQuoteMessage = useCallback((content: string) => {
    if (!onFollowUpClick) return;
    onFollowUpClick(`引用这条消息继续处理：\n${content}`);
  }, [onFollowUpClick]);

  const handleRegenerateMessage = useCallback((content: string, isAi: boolean) => {
    if (!onFollowUpClick) return;
    onFollowUpClick(
      isAi
        ? `请基于上一条回复重新生成一个更好的版本：\n${content}`
        : `请基于这条输入重新生成回复：\n${content}`,
    );
  }, [onFollowUpClick]);

  const handleSaveToKnowledge = useCallback((message: Message) => {
    const preview = (message.content || '').replace(/\s+/g, ' ').slice(0, 28);
    antMessage.success(`已保存到个人知识库待整理区：${preview}${message.content.length > 28 ? '...' : ''}`);
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

  const bubbleItems = useMemo<BubbleItem[]>(() => messages.map((msg, index) => {
    const ownThinkingSteps = Array.isArray(msg.thinking_steps) && msg.thinking_steps.length > 0
      ? msg.thinking_steps
      : msg.thinking
        ? [{ label: '模型思考', content: String(msg.thinking), status: 'completed' as const }]
        : [];
    const thinkingSteps = ownThinkingSteps.length > 0
      ? ownThinkingSteps
      : msg.role === 'assistant' && index === messages.length - 1
        ? (contextThinkingSteps ?? []).map((step, stepIndex) => ({
          key: `context-${stepIndex}`,
          label: step.title,
          content: step.description || '',
          status: 'loading' as const,
        }))
        : [];

    let kind: BubbleKind = msg.role === 'user' ? 'user' : 'assistant';
    if (msg.role === 'system' || msg.message_type === 'system_notice') kind = 'system';
    if (msg.message_type === 'clarification') kind = 'clarification';
    if (msg.message_type === 'workflow_summary') kind = 'summary';

    return {
      key: msg.message_id || msg.id || `msg-${index}`,
      role: msg.role === 'assistant' ? 'ai' : 'user',
      kind,
      content: msg.content || '',
      thinkingSteps,
      toolCalls: msg.tool_calls || [],
      missingFields: msg.missing_fields || [],
      messageId: msg.message_id || msg.id || '',
      agent: msg.agent || (msg.routing_decision?.intent_type as string | undefined),
      rawMessage: msg,
    };
  }), [contextThinkingSteps, messages]);

  if (messages.length === 0 && !isTyping) {
    const starterGroups = [
      {
        title: '核心功能',
        items: [
          '问题解答',
          '数据排查',
          '对接需求',
          '自动联调',
          '拼接报表',
        ],
      },
      {
        title: '我可以帮你',
        items: [
          '解释广告指标、系统路径和操作规则',
          '定位回传、归因、消耗和转化异常',
          '把新增媒体对接整理成可提交的需求',
          '发起联调并持续观察每一步结果',
        ],
      },
    ];

    return (
      <div
        id="chat-container"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          padding: isMobile ? '18px 20px 120px' : '28px 36px 140px',
        }}
      >
        <div style={{ width: '100%', maxWidth: 900, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: isMobile ? 12 : 6 }}>
            <img
              src="/zt-chat-logo-clean.png"
              alt="智投chat"
              style={{
                width: isMobile ? 72 : 86,
                height: 'auto',
                objectFit: 'contain',
              }}
            />
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: isMobile ? 17 : 19, color: c.textSecondary, lineHeight: 1.7, fontWeight: 520 }}>
                欢迎使用智投chat，输入问题、需求或联调目标，我会按对话方式继续推进。
              </p>
            </div>
          </div>

          <div style={{ marginTop: 28, fontSize: 13, color: c.textMuted }}>我可以帮你：</div>

          <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.1fr 1fr 1fr', gap: 14 }}>
            <section style={{ borderRadius: 16, background: '#f4f6ff', padding: 18, minHeight: 176 }}>
              <div style={{ fontSize: 17, fontWeight: 680, color: c.textPrimary }}>核心功能</div>
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {starterGroups[0].items.map((item, index) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => onFollowUpClick?.(item)}
                    style={{ display: 'grid', gridTemplateColumns: '18px minmax(0,1fr)', gap: 8, alignItems: 'center', border: 'none', background: 'transparent', padding: 0, textAlign: 'left', color: c.textSecondary, cursor: 'pointer', fontSize: 13 }}
                  >
                    <span style={{ color: index < 3 ? ['#f43f5e', '#f97316', '#f59e0b'][index] : c.textMuted, fontWeight: 700 }}>{index + 1}</span>
                    <span>{item}</span>
                  </button>
                ))}
              </div>
            </section>

            <section style={{ borderRadius: 16, background: '#f8f3ff', padding: 18, minHeight: 176 }}>
              <div style={{ fontSize: 17, fontWeight: 680, color: c.textPrimary }}>我可以帮你</div>
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {starterGroups[1].items.map((item) => (
                  <div key={item} style={{ borderRadius: 12, background: 'rgba(255,255,255,0.76)', padding: '10px 12px', fontSize: 12, color: c.textSecondary }}>
                    {item}
                  </div>
                ))}
              </div>
            </section>

            <div style={{ display: 'grid', gap: 14 }}>
              {['整理一个新增媒体对接需求', '排查媒体回传数据不一致'].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => onFollowUpClick?.(item)}
                  style={{ borderRadius: 16, border: 'none', background: '#f3f6ff', padding: 18, textAlign: 'left', cursor: 'pointer' }}
                >
                  <div style={{ fontSize: 17, fontWeight: 680, color: c.textPrimary }}>{item}</div>
                  <div style={{ marginTop: 14, display: 'inline-flex', alignItems: 'center', borderRadius: 999, background: '#fff', padding: '8px 14px', color: c.textSecondary, fontSize: 12 }}>
                    立即开始
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <Prompts
          items={[
            { key: '1', label: '整理一个新的媒体对接需求', description: '进入结构化需求流程' },
          ]}
          onItemClick={(info) => {
            const label = (info.data as unknown as Record<string, string>).label;
            if (label && onFollowUpClick) onFollowUpClick(label);
          }}
          styles={{
            list: {
              width: '100%',
              maxWidth: 320,
            },
          }}
        />
      </div>
    );
  }

  return (
    <div
      id="chat-container"
      className="conversation-scroll-area"
      ref={scrollContainerRef}
      onScroll={handleScroll}
      style={{
        position: 'relative',
        flex: 1,
        overflow: 'auto',
        padding: isMobile ? '4px 12px 12px' : '4px 20px 20px',
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

        {bubbleItems.map((item) => {
          const isAi = item.role === 'ai';
          const showAgentTag = isAi && item.agent && item.kind === 'assistant';
          const showActions = item.kind !== 'system';
          const sourceRefs = isAi ? collectSourceRefs(item.rawMessage) : [];
          const workflowCard = isAi ? getWorkflowCard(item.rawMessage) : null;
          const messageResult = getResultForMessage(item, currentResult);
          const moreActions: MenuProps['items'] = [
            onFollowUpClick ? {
              key: 'quote',
              label: '引用',
              icon: <CopyOutlined />,
              onClick: () => handleQuoteMessage(item.content),
            } : null,
            {
              key: 'source',
              label: '来源',
              icon: <InfoCircleOutlined />,
              onClick: () => onOpenSourcePanel?.(item.rawMessage),
            },
            {
              key: 'save-kb',
              label: '保存到个人知识库',
              icon: <SendOutlined />,
              onClick: () => handleSaveToKnowledge(item.rawMessage),
            },
            {
              key: 'share-xiaoshan',
              label: '分享到小闪',
              icon: <SendOutlined />,
              onClick: () => antMessage.success('已分享到小闪'),
            },
            {
              key: 'collapse',
              label: '收起',
              icon: <UpOutlined />,
              onClick: () => undefined,
            },
          ].filter(Boolean) as MenuProps['items'];

          return (
            <div key={item.key} data-message-surface={item.messageId || item.key} style={{ position: 'relative' }}>
              <div style={{ display: 'flex', gap: isMobile ? 8 : 10, justifyContent: isAi ? 'flex-start' : 'flex-end' }}>
                <div style={{ maxWidth: isMobile ? '88%' : 760, minWidth: 60 }}>
                  {showAgentTag && (
                    <div style={{ marginBottom: 4 }}>
                      <Tag
                        color={AGENT_MAP[item.agent!]?.color || 'default'}
                        style={{ fontSize: 11, borderRadius: 999, margin: 0 }}
                      >
                        {AGENT_MAP[item.agent!]?.name || item.agent}
                      </Tag>
                    </div>
                  )}

                  {isAi && item.kind === 'assistant' && item.thinkingSteps.length > 0 && (
                    <ThinkingChain
                      steps={item.thinkingSteps}
                      toolCalls={item.toolCalls}
                      title="思维链"
                      defaultExpanded={!settings.autoCollapseThinking}
                    />
                  )}

                  {isAi && item.kind === 'assistant' && item.toolCalls.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, marginBottom: 4, flexWrap: 'wrap' }}>
                      {item.toolCalls.map((tc, index) => (
                        <Tag
                          key={index}
                          icon={<CodeOutlined />}
                          style={{ fontSize: 11, borderRadius: 999 }}
                        >
                          {tc.name || `Tool ${index + 1}`}
                        </Tag>
                      ))}
                    </div>
                  )}

                  <MessageSurface
                    item={item}
                    codeStyle={settings.codeStyle}
                    showLineNumbers={settings.codeLineNumbers}
                  />

                  {messageResult && !isTyping && (
                    <div style={{ marginTop: 8 }}>
                      <ResultMessageCard result={messageResult} />
                    </div>
                  )}

                  {isAi && workflowCard && (
                    <WorkflowProcessCard
                      data={workflowCard}
                      onFollowUpClick={onFollowUpClick}
                    />
                  )}

                  {isAi && item.kind === 'assistant' && (
                    <SourceReferenceStrip
                      refs={sourceRefs}
                      onOpen={() => onOpenSourcePanel?.(item.rawMessage)}
                    />
                  )}

                  <MissingFieldPanel
                    fields={item.missingFields}
                    onClick={(field) => onFollowUpClick?.(field.suggested_question)}
                  />

                  {showActions && (
                    <div
                      style={{
                        display: 'flex',
                        gap: 4,
                        flexWrap: 'wrap',
                        marginTop: 8,
                        justifyContent: isAi ? 'flex-start' : 'flex-end',
                        opacity: 0.94,
                      }}
                    >
                      <CopyButton text={item.content} />
                      {!isAi ? (
                        onEditUserMessage && (
                          <MessageActionButton
                            icon={<EditOutlined />}
                            label="编辑"
                            onClick={() => onEditUserMessage(item.content)}
                          />
                        )
                      ) : (
                        <>
                          {onFollowUpClick && (
                            <MessageActionButton
                              icon={<ReloadOutlined />}
                              label="重新生成"
                              onClick={() => handleRegenerateMessage(item.content, true)}
                            />
                          )}
                          <MessageActionButton
                            icon={<LikeOutlined />}
                            label="喜欢"
                            onClick={() => antMessage.success('已记录喜欢反馈')}
                          />
                          <MessageActionButton
                            icon={<DislikeOutlined />}
                            label="不喜欢"
                            onClick={() => antMessage.info('已记录不喜欢反馈')}
                          />
                          <MessageActionButton
                            icon={playingMessageId === item.messageId ? <PauseCircleOutlined /> : <SoundOutlined />}
                            label={playingMessageId === item.messageId ? '停止播报' : '语音播报'}
                            onClick={() => handleSpeakMessage(item.messageId, item.content)}
                          />
                          <Dropdown
                            trigger={['click']}
                            placement="bottomRight"
                            menu={{ items: moreActions }}
                          >
                            <span>
                              <MessageActionButton
                                icon={<MoreOutlined />}
                                label="更多"
                                onClick={() => undefined}
                              />
                            </span>
                          </Dropdown>
                          {devMode && onViewCallChain && (
                            <MessageActionButton
                              icon={<CodeOutlined />}
                              label="调用链"
                              onClick={onViewCallChain}
                            />
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div style={{ display: 'flex', gap: isMobile ? 8 : 10, alignItems: 'flex-end' }}>
            <div
              style={{
                padding: '10px 16px',
                borderRadius: '8px 18px 18px 18px',
                background: c.bgCard,
                border: `1px solid ${c.borderFaint}`,
              }}
            >
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <span className="thinking-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: c.accent, animation: 'thinking-bounce 1.4s ease-in-out infinite' }} />
                <span className="thinking-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: c.accent, animation: 'thinking-bounce 1.4s ease-in-out 0.2s infinite' }} />
                <span className="thinking-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: c.accent, animation: 'thinking-bounce 1.4s ease-in-out 0.4s infinite' }} />
              </div>
            </div>
          </div>
        )}

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
  );
}

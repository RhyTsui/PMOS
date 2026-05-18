'use client';

import React, { useState, useCallback } from 'react';
import {
  DownOutlined,
  RightOutlined,
  RobotOutlined,
  ToolOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
  CloseCircleOutlined,
  CopyOutlined,
  CheckOutlined,
  ApiOutlined,
  ClockCircleOutlined,
  CodeOutlined,
  TagOutlined,
} from '@ant-design/icons';
import { Tag, Tooltip, message as antMessage } from 'antd';
import type { CallSpan, CallChainData, ModelCallDetail, ToolCallDetail } from '@/types';
import { useThemeColors } from '@/hooks/useTheme';

/* ─── Span Type Icon & Color ─── */
const SPAN_TYPE_CONFIG: Record<string, { icon: React.ReactNode; colorVar: string; label: string }> = {
  custom: { icon: <ThunderboltOutlined />, colorVar: '--aifs-warning', label: '流程' },
  model: { icon: <RobotOutlined />, colorVar: '--flow-demand', label: '模型' },
  tool: { icon: <ToolOutlined />, colorVar: '--aifs-success', label: '工具' },
  agent: { icon: <ApiOutlined />, colorVar: '--aifs-accent', label: 'Agent' },
};

/* ─── Format Duration ─── */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/* ─── Format JSON Preview ─── */
function formatJsonPreview(data: Record<string, unknown>, maxLen = 200): string {
  const str = JSON.stringify(data, null, 2);
  return str.length > maxLen ? str.slice(0, maxLen) + '...' : str;
}

/* ─── Copy Button ─── */
function MiniCopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const c = useThemeColors();
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      antMessage.success({ content: '已复制', duration: 1, style: { marginTop: '20vh' } });
      setTimeout(() => setCopied(false), 1500);
    });
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: copied ? c.success : c.textMuted,
        fontSize: 11,
        padding: '2px 4px',
        transition: 'color 0.2s',
      }}
    >
      {copied ? <CheckOutlined /> : <CopyOutlined />}
    </button>
  );
}

/* ─── Status Icon ─── */
function StatusIcon({ status }: { status: string }) {
  const c = useThemeColors();
  if (status === 'running') return <LoadingOutlined style={{ color: c.accent, fontSize: 12 }} spin />;
  if (status === 'success') return <CheckCircleOutlined style={{ color: c.success, fontSize: 12 }} />;
  if (status === 'error') return <CloseCircleOutlined style={{ color: c.danger, fontSize: 12 }} />;
  return <ClockCircleOutlined style={{ color: c.textMuted, fontSize: 12 }} />;
}

/* ─── Data Preview Block ─── */
function DataPreview({ label, data }: { label: string; data?: Record<string, unknown> }) {
  const [expanded, setExpanded] = useState(false);
  const c = useThemeColors();
  if (!data || Object.keys(data).length === 0) return null;
  const preview = formatJsonPreview(data);

  return (
    <div style={{ marginTop: 6 }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: c.textMuted,
          fontSize: 11,
          padding: 0,
          transition: 'color 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.color = c.textSecondary; }}
        onMouseLeave={e => { e.currentTarget.style.color = c.textMuted; }}
      >
        {expanded ? <DownOutlined style={{ fontSize: 9 }} /> : <RightOutlined style={{ fontSize: 9 }} />}
        <CodeOutlined style={{ fontSize: 10 }} />
        {label}
      </button>
      {expanded && (
        <div style={{
          marginTop: 4,
          padding: '8px 10px',
          background: '#f8fafc',
          borderRadius: 6,
          border: `1px solid ${c.borderFaint}`,
          fontSize: 11,
          fontFamily: 'JetBrains Mono, monospace',
          color: '#1f2937',
          lineHeight: 1.6,
          maxHeight: 160,
          width: '100%',
          maxWidth: '100%',
          overflowX: 'auto',
          overflowY: 'auto',
          position: 'relative',
        }}>
          <pre style={{ margin: 0, minWidth: 'max-content', whiteSpace: 'pre' }}>
            {JSON.stringify(data, null, 2)}
          </pre>
          <div style={{ position: 'absolute', top: 4, right: 4 }}>
            <MiniCopyButton text={JSON.stringify(data, null, 2)} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Tags Preview ─── */
function TagsPreview({ tags }: { tags?: Record<string, string> }) {
  const c = useThemeColors();
  if (!tags || Object.keys(tags).length === 0) return null;
  return (
    <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      <TagOutlined style={{ color: c.textMuted, fontSize: 10, marginTop: 2 }} />
      {Object.entries(tags).map(([key, val]) => (
        <Tooltip key={key} title={`${key}: ${val}`}>
          <Tag style={{
            fontSize: 10,
            lineHeight: '16px',
            padding: '0 5px',
            margin: 0,
            borderRadius: 4,
            background: c.accentBg,
            border: `1px solid ${c.border}`,
            color: c.textSecondary,
            maxWidth: 120,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {key.split('.').pop()}: {val}
          </Tag>
        </Tooltip>
      ))}
    </div>
  );
}

/* ─── Resolve CSS Var Color ─── */
function useCssVar(varName: string): string {
  const c = useThemeColors();
  if (typeof window === 'undefined') return c.accent;
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || c.accent;
}

/* ─── Span Tree Node ─── */
function SpanNode({ span, depth = 0 }: { span: CallSpan; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 1);
  const hasChildren = span.children && span.children.length > 0;
  const config = SPAN_TYPE_CONFIG[span.type] || SPAN_TYPE_CONFIG.custom;
  const c = useThemeColors();
  const typeColor = useCssVar(config.colorVar);

  return (
    <div style={{ marginLeft: depth * 20 }}>
      {/* Span Header */}
      <button
        onClick={() => hasChildren && setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 10px',
          background: depth === 0 ? c.accentBg : 'transparent',
          border: depth === 0 ? `1px solid ${c.border}` : 'none',
          borderRadius: 8,
          cursor: hasChildren ? 'pointer' : 'default',
          width: '100%',
          color: c.textBody,
          fontSize: 12,
          transition: 'all 0.2s',
          textAlign: 'left',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = c.accentSoft; }}
        onMouseLeave={e => { e.currentTarget.style.background = depth === 0 ? c.accentBg : 'transparent'; }}
      >
        {/* Expand Arrow */}
        {hasChildren ? (
          <DownOutlined style={{
            fontSize: 9,
            color: c.textMuted,
            transition: 'transform 0.2s',
            transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
          }} />
        ) : (
          <span style={{ width: 9 }} />
        )}

        {/* Type Icon */}
        <span style={{ color: typeColor, fontSize: 13 }}>{config.icon}</span>

        {/* Span Name */}
        <span style={{ fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {span.name}
        </span>

        {/* Type Tag */}
        <Tag style={{
          fontSize: 10,
          lineHeight: '14px',
          padding: '0 4px',
          margin: 0,
          borderRadius: 3,
          background: `${typeColor}12`,
          border: `1px solid ${typeColor}25`,
          color: typeColor,
        }}>
          {config.label}
        </Tag>

        {/* Status */}
        <StatusIcon status={span.status} />

        {/* Duration */}
        {span.durationMs != null && (
          <span style={{
            fontSize: 11,
            fontFamily: 'JetBrains Mono, monospace',
            color: span.durationMs > 3000 ? c.warning : c.textMuted,
          }}>
            {formatDuration(span.durationMs)}
          </span>
        )}
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div style={{ marginLeft: 24, marginTop: 2 }}>
          {/* Input/Output Preview */}
          <DataPreview label="输入" data={span.input} />
          <DataPreview label="输出" data={span.output} />
          <TagsPreview tags={span.tags} />

          {/* Error */}
          {span.error && (
            <div style={{
              marginTop: 6,
              padding: '6px 10px',
              background: `${c.danger}0F`,
              border: `1px solid ${c.danger}26`,
              borderRadius: 6,
              fontSize: 11,
              color: c.danger,
            }}>
              {span.error}
            </div>
          )}

          {/* Children */}
          {hasChildren && span.children!.map((child, idx) => (
            <SpanNode key={child.spanId || idx} span={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Model Call Card ─── */
function ModelCallCard({ call }: { call: ModelCallDetail }) {
  const c = useThemeColors();
  const modelColor = useCssVar('--flow-demand');

  return (
    <div style={{
      padding: '8px 12px',
      background: `${modelColor}0A`,
      border: `1px solid ${modelColor}1A`,
      borderRadius: 8,
      fontSize: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <RobotOutlined style={{ color: modelColor, fontSize: 12 }} />
        <span style={{ color: c.textBody, fontWeight: 500 }}>
          {call.model}
        </span>
        <Tag style={{
          fontSize: 10,
          lineHeight: '14px',
          padding: '0 4px',
          margin: 0,
          borderRadius: 3,
          background: `${modelColor}1A`,
          border: `1px solid ${modelColor}33`,
          color: modelColor,
        }}>
          {call.provider}
        </Tag>
        {call.stream && (
          <Tag style={{
            fontSize: 10,
            lineHeight: '14px',
            padding: '0 4px',
            margin: 0,
            borderRadius: 3,
            background: c.accentBg,
            border: `1px solid ${c.border}`,
            color: c.accent,
          }}>
            stream
          </Tag>
        )}
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 4, color: c.textMuted, fontSize: 11 }}>
        {call.inputTokens != null && <span>Input: {call.inputTokens} tokens</span>}
        {call.outputTokens != null && <span>Output: {call.outputTokens} tokens</span>}
        <span style={{ color: call.latencyMs > 5000 ? c.warning : c.textMuted }}>
          {formatDuration(call.latencyMs)}
        </span>
      </div>
    </div>
  );
}

/* ─── Tool Call Card ─── */
function ToolCallDetailCard({ call }: { call: ToolCallDetail }) {
  const c = useThemeColors();
  const isMcp = call.toolType === 'mcp';
  const toolColor = isMcp ? c.accent : c.success;

  return (
    <div style={{
      padding: '8px 12px',
      background: `${toolColor}04`,
      border: `1px solid ${toolColor}12`,
      borderRadius: 8,
      fontSize: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <ToolOutlined style={{ color: toolColor, fontSize: 12 }} />
        <span style={{ color: c.textBody, fontWeight: 500 }}>
          {isMcp && call.serverName ? `${call.serverName}/` : ''}{call.toolName}
        </span>
        <Tag style={{
          fontSize: 10,
          lineHeight: '14px',
          padding: '0 4px',
          margin: 0,
          borderRadius: 3,
          background: `${toolColor}10`,
          border: `1px solid ${toolColor}20`,
          color: toolColor,
        }}>
          {isMcp ? 'MCP' : '内置'}
        </Tag>
      </div>
      <div style={{ marginTop: 4, color: c.textMuted, fontSize: 11 }}>
        <span style={{ color: c.textSecondary }}>Query:</span> {call.query.length > 60 ? call.query.slice(0, 60) + '...' : call.query}
      </div>
      <div style={{ marginTop: 2, color: c.textMuted, fontSize: 11 }}>
        <span style={{ color: c.textSecondary }}>Result:</span> {call.resultPreview.length > 80 ? call.resultPreview.slice(0, 80) + '...' : call.resultPreview}
      </div>
      <div style={{ marginTop: 2, fontSize: 11 }}>
        <span style={{ color: call.latencyMs > 3000 ? c.warning : c.textMuted }}>
          {formatDuration(call.latencyMs)}
        </span>
      </div>
    </div>
  );
}

/* ─── Main CallChainPanel ─── */
interface CallChainPanelProps {
  data: CallChainData | null;
  visible: boolean;
  onClose: () => void;
}

export function CallChainPanel({ data, visible, onClose }: CallChainPanelProps) {
  const c = useThemeColors();
  const modelColor = useCssVar('--flow-demand');

  if (!visible) return null;

  return (
    <div
      className="animate-slide-in-right"
      style={{
      position: 'fixed',
      right: 0,
      top: 0,
      bottom: 0,
      width: 420,
      background: c.bgMain + 'F9',
      borderLeft: `1px solid ${c.border}`,
      backdropFilter: 'blur(16px)',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
    }}
    >
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: `1px solid ${c.border}`,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexShrink: 0,
      }}>
        <ApiOutlined style={{ color: c.accent, fontSize: 14 }} />
        <span style={{ color: c.textPrimary, fontWeight: 600, fontSize: 14 }}>调用链</span>
        {data && (
          <Tag style={{
            fontSize: 10,
            lineHeight: '14px',
            padding: '0 6px',
            margin: 0,
            borderRadius: 4,
            background: c.accentBg,
            border: `1px solid ${c.border}`,
            color: c.accent,
            fontFamily: 'JetBrains Mono, monospace',
          }}>
            {data.traceId.slice(0, 12)}...
          </Tag>
        )}
        <div style={{ flex: 1 }} />
        {data && (
          <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: c.textMuted }}>
            {formatDuration(data.totalDurationMs)}
          </span>
        )}
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: `1px solid ${c.border}`,
            borderRadius: 6,
            color: c.textMuted,
            fontSize: 12,
            cursor: 'pointer',
            padding: '2px 8px',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = c.accent; e.currentTarget.style.borderColor = c.borderActive; }}
          onMouseLeave={e => { e.currentTarget.style.color = c.textMuted; e.currentTarget.style.borderColor = c.border; }}
        >
          关闭
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
        {!data ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: c.textMuted,
          }}>
            <ApiOutlined style={{ fontSize: 32, color: c.textMuted + '60', marginBottom: 12 }} />
            <p style={{ fontSize: 13 }}>发送消息后查看调用链数据</p>
            <p style={{ fontSize: 11, color: c.textMuted + 'AA' }}>调用链将展示模型推理、工具调用等完整数据流</p>
          </div>
        ) : (
          <>
            {/* Token Usage Summary */}
            {data.tokenUsage && (
              <div style={{
                marginBottom: 12,
                padding: '10px 14px',
                background: c.accentBg,
                border: `1px solid ${c.border}`,
                borderRadius: 10,
              }}>
                <div style={{ fontSize: 12, color: c.textSecondary, fontWeight: 500, marginBottom: 6 }}>
                  Token 用量
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                  <div>
                    <span style={{ fontSize: 11, color: c.textMuted }}>Input</span>
                    <div style={{ fontSize: 16, fontWeight: 600, color: modelColor, fontFamily: 'JetBrains Mono, monospace' }}>
                      {data.tokenUsage.inputTokens.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: c.textMuted }}>Output</span>
                    <div style={{ fontSize: 16, fontWeight: 600, color: c.accent, fontFamily: 'JetBrains Mono, monospace' }}>
                      {data.tokenUsage.outputTokens.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: c.textMuted }}>Total</span>
                    <div style={{ fontSize: 16, fontWeight: 600, color: c.textPrimary, fontFamily: 'JetBrains Mono, monospace' }}>
                      {data.tokenUsage.totalTokens.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Model Calls */}
            {data.modelCalls.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: c.textSecondary, fontWeight: 500, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <RobotOutlined style={{ color: modelColor, fontSize: 12 }} />
                  模型调用 ({data.modelCalls.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {data.modelCalls.map((call, idx) => (
                    <ModelCallCard key={idx} call={call} />
                  ))}
                </div>
              </div>
            )}

            {/* Tool Calls */}
            {data.toolCalls.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: c.textSecondary, fontWeight: 500, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <ToolOutlined style={{ color: c.success, fontSize: 12 }} />
                  工具调用 ({data.toolCalls.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {data.toolCalls.map((call, idx) => (
                    <ToolCallDetailCard key={idx} call={call} />
                  ))}
                </div>
              </div>
            )}

            {/* Span Tree */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: c.textSecondary, fontWeight: 500, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                <ThunderboltOutlined style={{ color: c.warning, fontSize: 12 }} />
                完整调用树
              </div>
              <SpanNode span={data.rootSpan} depth={0} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

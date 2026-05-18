'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ThoughtChain } from '@ant-design/x';
import { Dropdown, Input, Modal, Tag, Tooltip, message as antMessage, type MenuProps } from 'antd';
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
  SoundOutlined,
  ThunderboltOutlined,
  UpOutlined,
} from '@ant-design/icons';
import type { AgentProcessEvent, AgentType, Message, MissingField, WorkflowResult } from '@/types';
import { thinkingStepFromProcessEvent, toolCallFromProcessEvent } from '@/lib/agent-runtime';
import { useThemeColors } from '@/hooks/useTheme';
import { AGENT_MAP } from '@/lib/constants';
import FancyCodeBlock, { type CodeStyle } from '@/components/ui/FancyCodeBlock';
import type { useChatSettings } from '@/hooks/useChatSettings';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSpeech } from '@/hooks/useSpeech';
import { IconAsset } from '@/components/ui/IconAsset';
import {
  MetricExplainerRenderer,
  isMetricExplainerUISchema,
  type MetricAction,
  type MetricExplainerUISchema,
} from '@/features/metric-explainer';

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
  contextThinkingSteps?: Array<{ title: string; description?: string }>;
  currentResult?: WorkflowResult | Record<string, unknown> | null;
  chatSettings: ReturnType<typeof useChatSettings>;
  systemPrompt?: string;
  showSystemPrompt?: boolean;
  onToggleSystemPrompt?: () => void;
  onOpenAgentPanel?: (agent: AgentType) => void;
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

interface DebugProcessStep {
  index?: number;
  key?: string;
  name?: string;
  status?: string;
  available?: boolean;
  message?: string;
  tool?: string;
  response?: unknown;
  raw_output?: unknown;
  logs?: string[];
  started_at?: string | number;
  duration_ms?: number;
  elapsed_ms?: number;
  latency_ms?: number;
  sub_steps?: Array<{
    name?: string;
    status?: string;
    message?: string;
    screenshot?: string;
    screenshot_url?: string;
    started_at?: string | number;
    duration_ms?: number;
    elapsed_ms?: number;
    latency_ms?: number;
  }>;
  screenshots?: Array<string | { url?: string; src?: string; name?: string }>;
  screenshot?: string;
  screenshot_url?: string;
}

function getDebugStepSourceSteps(payload: DebugProcessPayload): DebugProcessStep[] {
  const sources: DebugProcessStep[] = Array.isArray(payload.steps) ? [...payload.steps] : [];
  const taskDetail = asRecord(payload.task_detail);
  if (taskDetail) {
    [
      taskDetail.steps,
      taskDetail.latest_response,
      taskDetail.result,
      taskDetail.task,
    ].forEach((source, index) => {
      if (source === undefined || source === null) return;
      sources.push({
        index: sources.length + 1,
        key: `debug-task-detail-source-${index}`,
        name: '联调详情',
        status: String(payload.status || 'running'),
        response: source,
        raw_output: source,
      });
    });
  }
  return sources;
}

interface DebugProcessPayload {
  status?: string;
  conclusion?: string;
  logs?: unknown[];
  task_detail?: unknown;
  steps?: DebugProcessStep[];
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
  if (normalized.includes('debug_log')) {
    return <InlineBadge label="L" background="#eef6ff" color="#1d4ed8" />;
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
  if (text.includes('debug_log')) return 'debug_log';
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

function getDebugProcessPayload(message: Message): DebugProcessPayload | null {
  const events = Array.isArray(message.process_events)
    ? message.process_events
    : Array.isArray(message.metadata?.process_events)
      ? message.metadata.process_events as NonNullable<Message['process_events']>
      : [];
  const event = [...events].reverse().find((item) => item.ui_component?.type === 'debug_workbench');
  const payload = event?.ui_component?.payload || event?.output;
  if (payload && typeof payload === 'object') return payload as DebugProcessPayload;

  const debugEvents = events.filter((item) => {
    const text = `${item.label || ''} ${item.summary || ''} ${item.tool_name || ''} ${item.skill_name || ''}`;
    return /debug_automation|mcp_debug|自动联调|联调/.test(text);
  });
  const debugCalls = (message.tool_calls || []).filter((call) => {
    const text = `${call.name || ''} ${call.display_name || ''} ${call.result || ''} ${call.arguments || ''}`;
    return /debug_automation|mcp_debug|自动联调|联调/.test(text);
  });
  if (debugEvents.length === 0 && debugCalls.length === 0) return null;

  const eventSteps: DebugProcessStep[] = debugEvents
    .filter((item) => item.type.includes('tool') || item.type.startsWith('mcp.') || item.type === 'capability.checked')
    .map((item, index) => ({
      index: index + 1,
      key: item.id || `${item.tool_name || item.label}-${index}`,
      name: item.tool_name || item.label || `联调步骤 ${index + 1}`,
      status: item.status === 'error' ? 'failed' : item.status === 'running' ? 'running' : 'success',
      available: item.status === 'error' ? false : item.status === 'success' ? true : undefined,
      message: item.summary || item.label || '',
      response: item.output,
      raw_output: item,
      started_at: item.started_at,
      duration_ms: item.duration_ms,
      sub_steps: [{ name: item.summary || item.label || '处理中', status: item.status === 'error' ? 'failed' : item.status || 'running' }],
    }));
  const callSteps: DebugProcessStep[] = debugCalls.map((call, index) => ({
    index: eventSteps.length + index + 1,
    key: call.step_key || call.name || `debug-tool-${index}`,
    name: call.display_name || call.name || `联调工具 ${index + 1}`,
    status: call.status === 'error' ? 'failed' : call.status === 'calling' ? 'running' : 'success',
    available: call.status === 'error' ? false : call.status === 'done' ? true : undefined,
    message: call.prompt || call.arguments || '',
    response: parseMaybeJson(call.result),
    raw_output: call,
    sub_steps: [{ name: call.prompt || call.display_name || call.name || '处理中', status: call.status === 'error' ? 'failed' : call.status === 'calling' ? 'running' : 'success' }],
  }));

  return {
    status: eventSteps.concat(callSteps).some((step) => String(step.status).includes('running')) ? 'running' : 'running',
    conclusion: '正在观测联调详情。',
    task_detail: {
      process_events: debugEvents,
      tool_calls: debugCalls,
    },
    steps: [...eventSteps, ...callSteps],
    logs: debugEvents,
  };
}

function getDebugThinkingStepsFromWorkflowResult(message: Message): NonNullable<Message['thinking_steps']> {
  const workflowResult = asRecord(message.metadata?.workflow_result);
  if (!workflowResult) return [];

  const debugPayload: DebugProcessPayload = {
    status: String(workflowResult.status || workflowResult.result_status || workflowResult.resultType || workflowResult.kind || ''),
    conclusion: String(workflowResult.summary || workflowResult.conclusion || ''),
    task_detail: workflowResult.task_detail || workflowResult,
    steps: Array.isArray(workflowResult.steps) ? workflowResult.steps as DebugProcessStep[] : [],
  };
  const steps = normalizeMcpDebugSteps(debugPayload);
  if (steps.length === 0) return [];
  const thinkingSteps = steps.map((step, index) => ({
    key: step.key || `debug-step-${index}`,
    label: cleanDebugLine(step.name || step.message || `联调步骤 ${index + 1}`) || `联调步骤 ${index + 1}`,
    content: cleanDebugLine(step.message || step.status || '') || '',
    status: String(step.status || '').toLowerCase().includes('error') || String(step.status || '').toLowerCase().includes('fail')
      ? 'error' as const
      : String(step.status || '').toLowerCase().includes('running') || String(step.status || '').toLowerCase().includes('loading')
        ? 'loading' as const
        : 'completed' as const,
    started_at: typeof step.started_at === 'number' ? step.started_at : step.started_at ? new Date(step.started_at).getTime() : undefined,
    duration_ms: getDebugStepDurationMs(step, normalizeDebugStatus(step, index, steps.length - 1), Date.now()),
    input: step.response && typeof step.response === 'object' ? step.response as Record<string, unknown> : undefined,
    output: step.raw_output && typeof step.raw_output === 'object' ? step.raw_output as Record<string, unknown> : undefined,
  }));
  const hasCreateSummary = thinkingSteps.some((step) => String(step.label || '').includes('创建联调任务'));
  const hasObserveSummary = thinkingSteps.some((step) => String(step.label || '').includes('观测联调过程'));
  return [
    ...thinkingSteps,
    ...(hasCreateSummary ? [] : [{
      key: 'debug-create-task',
      label: '创建联调任务',
      content: '联调任务已发起',
      status: 'loading' as const,
    }]),
    ...(hasObserveSummary ? [] : [{
      key: 'debug-observe-process',
      label: '观测联调过程',
      content: '正在观测联调步骤',
      status: 'loading' as const,
    }]),
  ];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function parseMaybeJson(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const text = value.trim();
  if (!text || (!text.startsWith('{') && !text.startsWith('['))) return value;
  try {
    return JSON.parse(text);
  } catch {
    return value;
  }
}

function unwrapMcpResponse(value: unknown): unknown {
  let current = parseMaybeJson(value);
  for (let i = 0; i < 6; i += 1) {
    const record = asRecord(current);
    if (!record) return current;
    const resultRecord = asRecord(record.result);
    const content: unknown[] | null = Array.isArray(record.content)
      ? record.content
      : Array.isArray(resultRecord?.content)
        ? resultRecord.content as unknown[]
        : null;
    const textContent = content?.map((item: unknown) => {
      const itemRecord = asRecord(item);
      return itemRecord?.text || itemRecord?.content || '';
    }).filter(Boolean).join('\n');
    const candidates = [
      record.structuredContent,
      record.data,
      record.result,
      record.payload,
      record.output,
      record.raw_text,
      textContent,
    ].filter((item) => item !== undefined && item !== null && item !== current);
    if (candidates.length === 0) return current;
    current = parseMaybeJson(candidates[0]);
  }
  return current;
}

function findFirstArray(value: unknown, keys: string[]): unknown[] {
  const visited = new Set<unknown>();
  const walk = (node: unknown, depth: number): unknown[] => {
    if (depth > 6 || !node || visited.has(node)) return [];
    visited.add(node);
    if (Array.isArray(node)) return node;
    const record = asRecord(node);
    if (!record) return [];
    for (const key of keys) {
      const candidate = record[key];
      if (Array.isArray(candidate)) return candidate;
    }
    for (const candidate of Object.values(record)) {
      const found = walk(parseMaybeJson(candidate), depth + 1);
      if (found.length) return found;
    }
    return [];
  };
  return walk(unwrapMcpResponse(value), 0);
}

function findDebugStepArray(value: unknown): unknown[] {
  const unwrapped = unwrapMcpResponse(value);
  if (Array.isArray(unwrapped)) return unwrapped;
  const record = asRecord(unwrapped);
  if (!record) return [];
  const direct = record.steps || asRecord(record.response)?.steps || asRecord(record.data)?.steps;
  if (Array.isArray(direct)) return direct;
  const nestedDirect = findFirstArray(direct, ['steps', 'data', 'records', 'items', 'list', 'rows']);
  if (nestedDirect.length) return nestedDirect;
  const result = asRecord(record.result);
  if (Array.isArray(result?.steps)) return result.steps as unknown[];
  return findFirstArray(record, ['steps', 'data', 'records', 'items', 'list', 'rows']);
}

function parseDebugStepLog(value: unknown): { progress: Record<string, unknown>; lines: string[] } {
  const parsed = parseMaybeJson(value);
  const record = asRecord(parsed);
  if (!record) {
    return {
      progress: {},
      lines: typeof value === 'string' ? value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean) : [],
    };
  }
  const progress = asRecord(record.progress) || {};
  const lines = Array.isArray(record.lines)
    ? record.lines.map((line) => String(line || '').trim()).filter(Boolean)
    : [];
  return { progress, lines };
}

function normalizeDebugStepName(value?: unknown): string {
  const text = String(value || '').trim();
  const map: Record<string, string> = {
    starting: '准备启动',
    login: '巨量登录',
    navigate_event: '进入事件资产',
    enter_debug_tool: '进入联调工具',
    select_channel: '选择渠道包',
    open_package_link: '点击分包链接',
    open_download_link_selector: '点击选择下载链接',
    select_target_channel: '选择目标渠道号',
    select_link_group: '选择监测链接组',
    generate_qr: '生成二维码',
    push_qr: '推送二维码',
    scan_qr: '手机扫码',
    authorize: '授权测试',
    detect_auth_button: '检测授权按钮',
    web_auth_check: '确认授权结果',
    find_ad: '查找广告',
    feed_refresh: '刷新推荐流',
    find_ad_swipe: '滑动查找广告',
    click_ad: '点击广告并拉起游戏',
    wait_game_start: '等待游戏启动',
    login_game: '游戏登录',
    poll_events: '事件回传轮询',
  };
  return map[text] || text;
}

function formatDebugTime(value: unknown): string {
  const text = String(value || '').trim();
  const matched = text.match(/(?:\d{4}-\d{2}-\d{2}[ T])?(\d{2}:\d{2}:\d{2})(?:[,.]\d+)?/);
  if (matched) return matched[1];
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString('zh-CN', { hour12: false });
}

function isDebugScreenshotUrl(value: unknown): value is string {
  const text = String(value || '').trim();
  if (!text || text === 'null' || text === 'undefined') return false;
  return /^(https?:)?\/\//i.test(text) || text.startsWith('/api/') || text.startsWith('/_next/') || /^data:image\//i.test(text);
}

function cleanDebugLogLine(line: string): string {
  return line
    .replace(/\s*screenshot_url=\S+/g, '')
    .replace(/\d{4}-\d{2}-\d{2}[ T](\d{2}:\d{2}:\d{2})(?:[,.]\d+)?\s*\[[^\]]+]\s*[^:]+:\s*/g, '$1 ')
    .replace(/\bxiaoqiao\.progress:\s+\[XQ_PROGRESS[^\]]+]\s*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function safeDebugStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}

function debugProcessStepText(step: DebugProcessStep): string {
  let rawText = '';
  try {
    rawText = JSON.stringify(step.response || step.raw_output || '');
  } catch {
    rawText = '';
  }
  return `${step.key || ''} ${step.tool || ''} ${step.name || ''} ${step.status || ''} ${step.message || ''} ${rawText}`;
}

function findDebugTaskSnapshot(payload: DebugProcessPayload): DebugProcessStep[] {
  const originalSteps = Array.isArray(payload.steps) ? payload.steps : [];
  const startStep = originalSteps.find((step) => /mcp_debug_start_task|debug_automation_create_task|debug_automation_get_task/i.test(
    `${step.key || ''} ${step.tool || ''} ${step.message || ''}`,
  ));
  if (!startStep) return [];
  const response = asRecord(unwrapMcpResponse(startStep.response || startStep.raw_output)) || {};
  const parsedTask = unwrapMcpResponse(response.task);
  const task = asRecord(parsedTask) || asRecord(response.task) || asRecord(response.create_result) || response;
  const rawOutput = asRecord(startStep.raw_output) || {};
  const rawResponse = asRecord(rawOutput.response) || {};
  const taskId = String(response.task_id || rawResponse.task_id || task.task_id || task.taskId || task.id || '');
  if (!taskId) return [];
  const taskStatus = String(task.status || task.state || task.task_status || task.status_label || response.task_status || '').toLowerCase();
  const isTerminal = /success|failed|error|complete|done|manual/.test(taskStatus);
  const currentStep = String(task.current_step || task.currentStep || task.phase || task.status_label || taskStatus || '');
  return [{
    index: 1,
    key: 'debug-task-created',
    name: '联调任务已创建',
    status: isTerminal ? taskStatus : 'running',
    available: !/failed|error/.test(taskStatus),
    message: currentStep ? `当前进展：${currentStep}` : '已创建联调任务，等待服务返回步骤。',
    sub_steps: [
      { name: `任务：${taskId}`, status: 'success' },
      { name: currentStep ? `当前进展：${currentStep}` : '等待服务返回步骤', status: isTerminal ? taskStatus : 'running' },
    ],
  }];
}

function normalizeMcpDebugSteps(payload: DebugProcessPayload): DebugProcessStep[] {
  const originalSteps = getDebugStepSourceSteps(payload);
  const returnedSteps = originalSteps.flatMap((step) => {
    const response = unwrapMcpResponse(step.response || step.raw_output);
    const list = findDebugStepArray(response);
    return list.flatMap((item, itemIndex): DebugProcessStep[] => {
      if (typeof item === 'string') {
        const isFindAdSwipe = /find_ad_swipe/i.test(item);
        const name = normalizeDebugStepDisplayName(item) || (isFindAdSwipe ? '滑动查找广告' : '');
        if (!name && !/图片上传中/.test(item)) return [];
        return [{
          index: itemIndex + 1,
          key: `${step.key || 'mcp-step'}-${itemIndex}`,
          name: name || '图片上传中',
          status: step.status,
          available: step.available,
          message: item,
          sub_steps: [],
        }];
      }
      const record = asRecord(item) || {};
      const parsedLog = parseDebugStepLog(record.logText || record.log_text);
      const progress = asRecord(record.progress) || parsedLog.progress;
      const logLines = parsedLog.lines.map(cleanDebugLogLine).filter(Boolean);
      const subList = findFirstArray(record.sub_steps || record.children || record.logs || record.events, ['sub_steps', 'children', 'logs', 'events']);
      const effectiveSubList = subList.length > 0 ? subList : logLines;
      const screenshotUrl = String(record.screenshot_url || record.screenshotUrl || progress.screenshot_url || progress.screenshotUrl || '');
      const hasScreenshotUploading = logLines.some((line) => /screenshot uploaded|upload.*screenshot|上传截图|图片上传中/i.test(line))
        || /true/i.test(String(progress.has_screenshot || ''));
      const screenshotCandidates = [
        ...(Array.isArray(record.screenshots) ? record.screenshots : []),
        ...(Array.isArray(record.images) ? record.images : []),
      ].filter((candidate) => {
        if (typeof candidate === 'string') return isDebugScreenshotUrl(candidate);
        const itemRecord = asRecord(candidate);
        const url = itemRecord?.url || itemRecord?.src || itemRecord?.path || itemRecord?.screenshotUrl || itemRecord?.screenshot_url;
        return isDebugScreenshotUrl(url);
      }) as DebugProcessStep['screenshots'];
      const resolvedSubSteps = effectiveSubList.length > 0
        ? effectiveSubList
        : hasScreenshotUploading
          ? ['图片上传中']
          : [];
      const isFindAdSwipe = /find_ad_swipe/i.test(
        `${record.key || ''} ${record.name || ''} ${record.step_name || ''} ${record.stepName || ''} ${record.title || ''} ${record.stage || ''} ${record.message || ''} ${record.log_summary || ''} ${record.summary || ''} ${JSON.stringify(record)}`,
      );
      const displayName = normalizeDebugStepDisplayName(
        String(progress.step_description || record.name || record.step_name || record.stepName || record.title || record.stage || progress.step_name || step.name || ''),
      ) || (isFindAdSwipe ? '滑动查找广告' : '');
      const normalizedSubSteps = resolvedSubSteps.flatMap((sub): NonNullable<DebugProcessStep['sub_steps']>[number][] => {
        if (typeof sub === 'string') {
          const subName = normalizeDebugStepDisplayName(sub);
          if (!subName && !/图片上传中/.test(sub)) return [];
          return [{
            name: subName || '图片上传中',
            status: String(record.status || progress.status || step.status || ''),
            message: sub,
          }];
        }
        const subRecord = asRecord(sub) || {};
        const subName = normalizeDebugStepDisplayName(
          String(subRecord.name || subRecord.title || subRecord.action || subRecord.step_name || subRecord.message || subRecord.log || ''),
        );
        if (!subName) return [];
        return [{
          name: subName,
          status: String(subRecord.status || record.status || ''),
          message: String(subRecord.message || subRecord.log_summary || subRecord.detail || ''),
          screenshot: typeof subRecord.screenshot === 'string' ? subRecord.screenshot : undefined,
          screenshot_url: typeof subRecord.screenshot_url === 'string'
            ? subRecord.screenshot_url
            : typeof subRecord.screenshotUrl === 'string'
              ? subRecord.screenshotUrl
              : undefined,
          started_at: typeof subRecord.started_at === 'string' || typeof subRecord.started_at === 'number' ? subRecord.started_at : undefined,
          duration_ms: Number(subRecord.duration_ms || subRecord.duration || subRecord.cost_ms || 0) || undefined,
          elapsed_ms: Number(subRecord.elapsed_ms || subRecord.elapsed || 0) || undefined,
          latency_ms: Number(subRecord.latency_ms || 0) || undefined,
        }];
      }).filter(Boolean) as NonNullable<DebugProcessStep['sub_steps']>;
      if (!displayName && normalizedSubSteps.length === 0 && !hasScreenshotUploading) return [];
      return [{
        index: itemIndex + 1,
        key: String(record.key || record.id || `${step.key || 'mcp-step'}-${itemIndex}`),
        name: displayName || '图片上传中',
        status: String(record.status || progress.status || step.status || ''),
        available: record.available === undefined ? step.available : Boolean(record.available),
        message: String(record.message || record.log_summary || record.summary || record.detail || logLines[logLines.length - 1] || ''),
        started_at: typeof record.started_at === 'string' || typeof record.started_at === 'number' ? record.started_at : String(progress.timestamp || record.createdAt || record.created_at || '') || undefined,
        duration_ms: Number(record.duration_ms || record.durationMs || record.duration || record.cost_ms || 0) || undefined,
        elapsed_ms: Number(record.elapsed_ms || record.elapsed || 0) || undefined,
        latency_ms: Number(record.latency_ms || 0) || undefined,
        screenshots: hasScreenshotUploading ? [] : screenshotCandidates,
        screenshot: hasScreenshotUploading ? undefined : (typeof record.screenshot === 'string' ? record.screenshot : undefined),
        screenshot_url: hasScreenshotUploading ? undefined : (isDebugScreenshotUrl(screenshotUrl) ? screenshotUrl : undefined),
        response: record,
        raw_output: item,
        logs: logLines,
        sub_steps: normalizedSubSteps,
      } satisfies DebugProcessStep];
    }).filter((item): item is DebugProcessStep => Boolean(item));
  });

  const truncatedSteps = (() => {
    const lastSwipeIndex = returnedSteps.reduce((acc, step, index) => {
      const text = `${step.key || ''} ${step.name || ''} ${step.message || ''} ${safeDebugStringify(step.response || step.raw_output || '')}`;
      return /find_ad_swipe/i.test(text) || /find_ad_swipe/i.test(debugProcessStepText(step)) ? index : acc;
    }, -1);
    if (lastSwipeIndex >= 0) {
      return returnedSteps.slice(0, lastSwipeIndex + 1);
    }
    return returnedSteps;
  })();

  if (truncatedSteps.length > 0) {
    return dedupeDebugSteps(truncatedSteps);
  }

  const taskSnapshot = findDebugTaskSnapshot(payload);
  if (taskSnapshot.length > 0) {
    return dedupeDebugSteps(taskSnapshot);
  }

  const authExpiredStep = originalSteps.find((step) => {
    const text = debugProcessStepText(step);
    return /token|access[-_ ]?token|unauthori[sz]ed|forbidden|invalid.*auth|auth.*expired|401|403|expired|过期|授权失败/i.test(text);
  });
  if (authExpiredStep) {
    const passMessage = '媒体应用校验已临时放行';
    const nextMessage = '正在调用联调 MCP';
    return [
      {
        index: 1,
        key: 'media-app-temporary-pass',
        name: '媒体应用校验',
        status: 'success',
        available: true,
        message: passMessage,
        sub_steps: [{ name: passMessage, status: 'success' }],
      },
      {
        index: 2,
        key: 'calling-debug-mcp',
        name: '调用联调 MCP',
        status: 'running',
        message: nextMessage,
        sub_steps: [{ name: nextMessage, status: 'running' }],
      },
    ];
  }

  const debugMcpUnavailableStep = originalSteps.find((step) => {
    const text = debugProcessStepText(step);
    const status = String(step.status || '').toLowerCase();
    return /mcp_debug_start_task|mcp_debug_watch_steps|debug\.start_task|debug\.watch_steps|start_task|watch_steps/i.test(text)
      && (step.available === false || /failed|not_configured|error/.test(status));
  });
  if (debugMcpUnavailableStep) {
    const message = '联调 MCP 不通';
    return [{
      index: 1,
      key: 'debug-mcp-unavailable',
      name: '调用联调 MCP',
      status: 'failed',
      available: false,
      message,
      sub_steps: [{ name: cleanDebugLine(debugMcpUnavailableStep.message) || message, status: 'failed' }],
    }];
  }

  const taskStarted = originalSteps.some((step) => {
    const text = debugProcessStepText(step);
    const status = String(step.status || '').toLowerCase();
    return /start_task|debug.*start/i.test(text) && (step.available === true || /success|done|running/i.test(status));
  });
  const waitingMessage = taskStarted ? '已发起联调任务，正在等待步骤返回' : '暂未收到联调步骤';
  return [{
    index: 1,
    key: taskStarted ? 'waiting-debug-steps' : 'waiting-debug-mcp',
    name: taskStarted ? '读取联调进度' : '等待联调步骤',
    status: 'running',
    message: waitingMessage,
    sub_steps: [{ name: waitingMessage, status: 'running' }],
  }];
}

function cleanDebugLine(raw?: string): string {
  const text = String(raw || '').trim();
  if (!text) return '';
  if (/token|access[-_ ]?token|unauthori[sz]ed|invalid.*auth|auth.*expired|401|过期|授权失败/i.test(text)) {
    return '媒体授权已过期，需要更新授权后再校验应用';
  }
  const cleaned = text
    .replace(/^\[[^\]]+]\s*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const rules: Array<[RegExp, string]> = [
    [/事件资产主内容已加载/, '事件资产主内容已加载'],
    [/已勾选复选框/, '已勾选复选框'],
    [/正在弹窗中寻找渠道号/, '正在弹窗中寻找渠道号'],
    [/tr 策略失败，降级为后续节点点击/, 'tr 策略失败，降级为后续节点点击'],
    [/下拉选项 selector 命中/, '选中下拉选项'],
    [/推送二维码到 .*DCIM\/Camera/, '推送二维码到手机'],
    [/刷新媒体库 .*DCIM\/Camera/, '刷新手机相册'],
    [/Broadcast completed/, '刷新手机相册完成'],
    [/手机端文件确认/, '手机相册确认'],
    [/二维码已成功推送到手机相册/, '二维码已成功推送到手机相册'],
    [/关闭游戏进程/, '关闭游戏进程，确保后续点击广告产生启动事件'],
    [/关闭抖音并重新启动/, '关闭抖音并重新启动'],
    [/系统解析到抖音启动 Activity/, '系统解析到抖音启动'],
    [/确认抖音启动状态/, '确认抖音启动状态'],
    [/抖音已进入前台/, '抖音已进入前台，具备后续扫码入口操作条件'],
    [/相册预览候选区域/, '相册预览'],
    [/授权按钮蓝色区域/, '授权按钮蓝色区域'],
    [/手机端已点击授权/, '手机端已点击授权'],
    [/第 \d+ 次确认截图/, '确认截图'],
    [/检测到 Web 页面特征.*确认手机端授权成功/, '触发事件并回传，确认手机端授权成功'],
    [/正在判断图片/, '正在判断图片'],
    [/UIAutomator 关键词检测 转化联调广告/, '关键词检测 转化联调广告'],
  ];
  for (const [pattern, label] of rules) {
    if (pattern.test(cleaned)) return label;
  }
  return cleaned
    .replace(/:\s*(attempt=\d+|bbox=.*|center=.*|activity=.*|Locator\.click:[\s\S]*)$/i, '')
    .replace(/\s*\.\.\.$/, '')
    .slice(0, 80);
}

function stripDebugAbsoluteTime(raw?: string): string {
  const text = String(raw || '').trim();
  if (!text) return '';
  return text
    .replace(/\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:[,.]\d+)?/g, '')
    .replace(/\d{4}\/\d{2}\/\d{2}[ T]\d{2}:\d{2}:\d{2}(?:[,.]\d+)?/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractDebugStepDisplayName(raw?: string): string {
  const text = String(raw || '').trim();
  if (!text) return '';
  const directPatterns = [
    /\bstep_name\s*=\s*([^\s|,，;]+(?:\s+[^\s|,，;]+)?)/i,
    /\bstep\s*=\s*([^\s|,，;]+(?:\s+[^\s|,，;]+)?)/i,
    /\bname\s*=\s*([^\s|,，;]+(?:\s+[^\s|,，;]+)?)/i,
    /\btitle\s*=\s*([^\s|,，;]+(?:\s+[^\s|,，;]+)?)/i,
    /\bstage\s*=\s*([^\s|,，;]+(?:\s+[^\s|,，;]+)?)/i,
  ];
  for (const pattern of directPatterns) {
    const matched = text.match(pattern);
    if (matched?.[1]) {
      return stripDebugAbsoluteTime(cleanDebugLine(matched[1]) || matched[1])
        .replace(/[\]\)】》]+$/g, '')
        .trim();
    }
  }

  const shortText = stripDebugAbsoluteTime(cleanDebugLine(text) || text);
  const parts = shortText.split(/[:：]/).map((part) => part.trim()).filter(Boolean);
  const lastPart = parts.length > 0 ? parts[parts.length - 1] : shortText;
  return lastPart
    .replace(/\b(seq|phase|phase_index|step_index|step|index|kind|type|status|progress|Web Step \d+)\s*=\s*[^ ]+/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function normalizeDebugStepDisplayName(raw?: string): string {
  const text = String(raw || '').trim();
  if (!text) return '';
  const extracted = extractDebugStepDisplayName(text) || cleanDebugLine(text);
  const mapped = normalizeDebugStepName(extracted);
  const hasChinese = /[\u4e00-\u9fff]/.test(mapped) || /[\u4e00-\u9fff]/.test(extracted);
  if (hasChinese) {
    return stripDebugAbsoluteTime(mapped || extracted).trim();
  }
  return '';
}

function isMeaningfulDebugStepText(raw?: string): boolean {
  return Boolean(normalizeDebugStepDisplayName(raw));
}

function normalizeDebugStatus(step: DebugProcessStep, index: number, latestActiveIndex: number): 'success' | 'running' | 'error' | 'waiting' {
  const status = String(step.status || '').toLowerCase();
  if (status.includes('error') || status.includes('fail') || step.available === false) return 'error';
  if (status.includes('success') || status.includes('done') || status.includes('complete') || step.available === true) return 'success';
  if (index < latestActiveIndex) return 'success';
  if (status.includes('running') || status.includes('loading') || status.includes('progress')) return 'running';
  return index === latestActiveIndex ? 'running' : 'waiting';
}

function normalizeDebugSubStatus(
  subStep: NonNullable<DebugProcessStep['sub_steps']>[number],
  parentStatus: ReturnType<typeof normalizeDebugStatus>,
): ReturnType<typeof normalizeDebugStatus> {
  const status = String(subStep.status || '').toLowerCase();
  if (status.includes('error') || status.includes('fail')) return 'error';
  if (status.includes('success') || status.includes('done') || status.includes('complete')) return 'success';
  if (status.includes('running') || status.includes('loading') || status.includes('progress')) return 'running';
  return parentStatus;
}

function normalizeDebugStepSignature(step: DebugProcessStep): string {
  const subSteps = Array.isArray(step.sub_steps)
    ? step.sub_steps.map((item) => cleanDebugLine(item.name || item.message || '')).filter(Boolean).join('|')
    : '';
  const screenshots = collectStepScreenshots(step).join('|');
  return [
    cleanDebugLine(step.name || ''),
    String(step.status || '').toLowerCase(),
    cleanDebugLine(step.message || ''),
    subSteps,
    screenshots,
  ].join('::').toLowerCase();
}

function mergeDebugStep(base: DebugProcessStep, next: DebugProcessStep): DebugProcessStep {
  return {
    ...base,
    ...next,
    index: Number(base.index || next.index || 0) || undefined,
    key: base.key || next.key,
    name: next.name || base.name,
    status: next.status || base.status,
    message: next.message || base.message,
    started_at: next.started_at || base.started_at,
    duration_ms: next.duration_ms || base.duration_ms,
    elapsed_ms: next.elapsed_ms || base.elapsed_ms,
    latency_ms: next.latency_ms || base.latency_ms,
    screenshot: next.screenshot || base.screenshot,
    screenshot_url: next.screenshot_url || base.screenshot_url,
    screenshots: [...new Set([...(base.screenshots || []), ...(next.screenshots || [])].map((item) => typeof item === 'string' ? item : item?.url || item?.src || '').filter(Boolean))],
    logs: [...new Set([...(base.logs || []), ...(next.logs || [])].map((line) => cleanDebugLogLine(line)).filter(Boolean))],
    sub_steps: (next.sub_steps && next.sub_steps.length > 0 ? next.sub_steps : base.sub_steps) || [],
  };
}

function dedupeDebugSteps(steps: DebugProcessStep[]): DebugProcessStep[] {
  const deduped: DebugProcessStep[] = [];
  const indexBySignature = new Map<string, number>();
  steps.forEach((step) => {
    const signature = normalizeDebugStepSignature(step);
    const existingIndex = indexBySignature.get(signature);
    if (existingIndex === undefined) {
      indexBySignature.set(signature, deduped.length);
      deduped.push(step);
      return;
    }
    deduped[existingIndex] = mergeDebugStep(deduped[existingIndex], step);
  });
  return deduped.sort((a, b) => Number(a.index || 0) - Number(b.index || 0));
}

function getDebugStepDurationMs(
  step: Pick<DebugProcessStep, 'duration_ms' | 'elapsed_ms' | 'latency_ms' | 'started_at'>,
  status: ReturnType<typeof normalizeDebugStatus>,
  now: number,
): number {
  const explicit = Number(step.duration_ms || step.elapsed_ms || step.latency_ms || 0);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  const started = typeof step.started_at === 'number'
    ? step.started_at
    : step.started_at
      ? Date.parse(step.started_at)
      : 0;
  if (status === 'running' && Number.isFinite(started) && started > 0) {
    return Math.max(0, now - started);
  }
  return 0;
}

function formatDebugDuration(ms: number): string {
  if (!ms || ms < 0) return '';
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}分${String(seconds).padStart(2, '0')}秒`;
}

function stringifyDebugTaskDetail(value: unknown): string {
  if (!value) return '';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function getDebugOutcome(payload: DebugProcessPayload, steps: DebugProcessStep[], latestActiveIndex: number): {
  state: 'running' | 'success' | 'failed';
  label: string;
  activeStep: DebugProcessStep | undefined;
  reason: string;
} {
  const payloadStatus = String(payload.status || '').toLowerCase();
  const failedStep = steps.find((step, index) => normalizeDebugStatus(step, index, latestActiveIndex) === 'error');
  if (failedStep || /fail|error|blocked/.test(payloadStatus)) {
    const activeStep = failedStep || steps[latestActiveIndex] || steps[steps.length - 1];
    const reason = cleanDebugLine(activeStep?.message || payload.conclusion || '') || '请查看联调日志确认失败原因';
    return { state: 'failed', label: '联调失败', activeStep, reason };
  }
  if (/success|done|complete|passed/.test(payloadStatus)) {
    return { state: 'success', label: '联调通过', activeStep: steps[steps.length - 1], reason: cleanDebugLine(payload.conclusion || '') };
  }
  return { state: 'running', label: '正在联调', activeStep: steps[latestActiveIndex] || steps[steps.length - 1], reason: '' };
}

function flattenDebugLogItems(value: unknown): string[] {
  if (!value) return [];
  if (typeof value === 'string') return [value];
  if (typeof value === 'number' || typeof value === 'boolean') return [String(value)];
  if (Array.isArray(value)) return value.flatMap((item) => flattenDebugLogItems(item));
  if (typeof value !== 'object') return [];

  const record = value as Record<string, unknown>;
  const direct = [
    record.log,
    record.logText,
    record.message,
    record.name,
    record.summary,
    record.current_step,
    record.currentStep,
  ].flatMap((item) => flattenDebugLogItems(item));

  const nested = [
    record.lines,
    record.logs,
    record.steps,
    record.sub_steps,
    record.subSteps,
    record.response,
    record.raw_output,
    record.result,
    record.data,
    record.task,
  ].flatMap((item) => flattenDebugLogItems(item));

  return [...direct, ...nested];
}

function formatDebugLogLine(line: string): string {
  return line
    .replace(/\d{4}-\d{2}-\d{2}[ T](\d{2}:\d{2}:\d{2})(?:\.\d+)?/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function collectDebugLogs(payload: DebugProcessPayload | null): string {
  if (!payload) return '';
  const normalizedSteps = normalizeMcpDebugSteps(payload);
  const timelineLogs = normalizedSteps.flatMap((step, index) => {
    const time = formatDebugTime(step.started_at);
    const title = cleanDebugLine(step.name || step.message) || `步骤 ${index + 1}`;
    const status = String(step.status || '').toLowerCase();
    const marker = /success|done|complete/.test(status) ? 'OK' : /fail|error/.test(status) ? 'FAIL' : '...';
    const header = `${time || '--:--:--'} ${marker} ${index + 1}. ${title}`;
    const lines = (step.logs || []).map((line) => {
      const lineTime = formatDebugTime(line) || time || '--:--:--';
      const cleaned = cleanDebugLogLine(line);
      return cleaned ? `${lineTime} ${cleaned.replace(/^\d{2}:\d{2}:\d{2}\s*/, '')}` : '';
    }).filter(Boolean);
    return [header, ...lines];
  });
  if (timelineLogs.length > 0) {
    return Array.from(new Set(timelineLogs)).join('\n');
  }
  const stepLogs = normalizedSteps.flatMap((step) => [
    step.message,
    step.logs,
    ...(step.sub_steps || []).map((item) => item.message || item.name),
  ]);
  const logs = [
    ...(Array.isArray(payload.logs) ? payload.logs : []),
    ...stepLogs,
  ].flatMap((item) => flattenDebugLogItems(item));
  return Array.from(new Set(logs.map((line) => formatDebugLogLine(line)).filter(Boolean)))
    .join('\n');
}

function collectStepScreenshots(step: DebugProcessStep): string[] {
  const fromList = (step.screenshots || []).map((item) => typeof item === 'string' ? item : item.url || item.src || '').filter(isDebugScreenshotUrl);
  const fromSubSteps = (step.sub_steps || []).flatMap((item) => [item.screenshot, item.screenshot_url]);
  return [...fromList, step.screenshot, step.screenshot_url, ...fromSubSteps]
    .filter(isDebugScreenshotUrl);
}

function getDebugStepDetailText(step: DebugProcessStep): string {
  const lines: string[] = [];
  const name = normalizeDebugStepDisplayName(step.name || '') || cleanDebugLine(step.name || '') || '联调步骤';
  const status = cleanDebugLine(step.status || '');
  const subSteps = Array.isArray(step.sub_steps) ? step.sub_steps : [];
  const screenshots = collectStepScreenshots(step);

  lines.push(`步骤: ${name}`);
  if (status) lines.push(`状态: ${status}`);
  if (subSteps.length > 0) {
    lines.push('子步骤:');
    subSteps.forEach((subStep, index) => {
      const subName = normalizeDebugStepDisplayName(subStep.name || subStep.message || '') || cleanDebugLine(subStep.name || subStep.message || '');
      if (!subName) return;
      const subStatus = cleanDebugLine(subStep.status || '');
      lines.push(`  ${index + 1}. ${subName}${subStatus ? ` (${subStatus})` : ''}`);
    });
  }
  if (screenshots.length > 0) {
    lines.push(`截图: ${screenshots.length}`);
  }

  return lines.length > 1 ? lines.join('\n') : '';
}

function collectDebugImages(value: unknown): string[] {
  const visited = new Set<unknown>();
  const images = new Set<string>();
  const add = (candidate: unknown) => {
    if (typeof candidate !== 'string') return;
    const text = candidate.trim();
    if (!text) return;
    if (isDebugScreenshotUrl(text)) {
      images.add(text);
    }
  };
  const walk = (node: unknown, depth: number) => {
    if (depth > 8 || !node || visited.has(node)) return;
    visited.add(node);
    const parsed = parseMaybeJson(node);
    if (Array.isArray(parsed)) {
      parsed.forEach((item) => walk(item, depth + 1));
      return;
    }
    const record = asRecord(parsed);
    if (!record) return;
    [
      record.screenshot,
      record.screenshot_url,
      record.screenshotUrl,
      record.image,
      record.image_url,
      record.imageUrl,
      record.src,
    ].forEach(add);
    ['screenshots', 'images', 'pictures', 'attachments'].forEach((key) => {
      const candidate = record[key];
      if (Array.isArray(candidate)) {
        candidate.forEach((item) => {
          if (typeof item === 'string') add(item);
          else {
            const itemRecord = asRecord(item);
            add(itemRecord?.url || itemRecord?.src || itemRecord?.path || itemRecord?.screenshotUrl || itemRecord?.screenshot_url);
            walk(item, depth + 1);
          }
        });
      }
    });
    Object.values(record).forEach((item) => walk(item, depth + 1));
  };
  walk(value, 0);
  return Array.from(images);
}

function compactProcessThinkingSteps(events: AgentProcessEvent[]): NonNullable<Message['thinking_steps']> {
  if (events.length === 0) return [];

  const buildStep = (
    key: string,
    label: string,
    groupedEvents: AgentProcessEvent[],
    fallbackSummary: string,
  ): NonNullable<Message['thinking_steps']>[number] | null => {
    if (groupedEvents.length === 0) return null;
    const hasError = groupedEvents.some((event) => event.status === 'error' || event.status === 'rejected');
    const hasRunning = groupedEvents.some((event) => event.status === 'running' || event.status === 'waiting');
    const names = Array.from(new Set(groupedEvents
      .map((event) => event.tool_name || event.skill_name || event.label)
      .filter(Boolean)
      .map(String)));
    const duration = groupedEvents.reduce((sum, event) => sum + (event.duration_ms || 0), 0);
    return {
      key,
      label,
      content: names.length > 0
        ? `${fallbackSummary}：${names.slice(0, 4).join('、')}${names.length > 4 ? ` 等 ${names.length} 项` : ''}`
        : fallbackSummary,
      status: hasError ? 'error' as const : hasRunning ? 'loading' as const : 'completed' as const,
      started_at: groupedEvents[0]?.started_at ? new Date(groupedEvents[0].started_at).getTime() : undefined,
      duration_ms: duration || undefined,
    };
  };

  const isDebugFlow = events.some((event) => {
    const text = [event.label || '', event.summary || '', event.tool_name || '', event.skill_name || ''].filter(Boolean).join(' ');
    return event.ui_component?.type === 'debug_workbench'
      || event.visibility === 'debug'
      || /debug_automation|mcp_debug|自动联调|联调/.test(text);
  });

  const genericSteps: NonNullable<Message['thinking_steps']> = [
    buildStep('agent-route', '识别处理路径', events.filter((event) => event.type === 'intent.detected' || event.type === 'context.prepared'), '已识别为当前问题并整理处理路径'),
    buildStep('skill-flow', '调用 Skill', events.filter((event) => event.type.startsWith('skill.')), '已匹配可复用的处理能力'),
    buildStep('mcp-flow', '调用 MCP', events.filter((event) => event.type.startsWith('mcp.') || event.type === 'capability.checked'), '已调用外部能力进行核验'),
    buildStep('knowledge-flow', '查询知识', events.filter((event) => event.type.startsWith('knowledge.') || event.type.startsWith('web.')), '已查询可用知识与参考'),
    buildStep('result-render', '生成回复', events.filter((event) => event.type === 'ui.component_rendered' || event.type === 'answer.final' || event.type === 'model.step'), '已整理为可读结果'),
  ].filter((step): step is NonNullable<Message['thinking_steps']>[number] => Boolean(step));

  if (!isDebugFlow) {
    return genericSteps.length > 0 ? genericSteps : events.slice(0, 5).map((event) => thinkingStepFromProcessEvent(event));
  }

  const debugEvents = events.filter((event) => {
    const text = [event.label || '', event.summary || '', event.tool_name || ''].filter(Boolean).join(' ');
    return event.ui_component?.type === 'debug_workbench'
      || event.visibility === 'debug'
      || /debug_automation|mcp_debug|自动联调|联调/.test(text);
  });

  const uniqueDebugEvents = debugEvents.filter((event, index, array) => {
    const text = [event.label || '', event.summary || '', event.tool_name || '', event.skill_name || '', event.type || ''].filter(Boolean).join('|').toLowerCase();
    return array.findIndex((other) => [other.label || '', other.summary || '', other.tool_name || '', other.skill_name || '', other.type || ''].filter(Boolean).join('|').toLowerCase() === text) === index;
  });

  const createEvents = uniqueDebugEvents.filter((event) => {
    const text = [event.label || '', event.summary || '', event.tool_name || ''].filter(Boolean).join(' ');
    return /debug_automation_create_task|debug_automation_start_task|mcp_debug_start_task|start_task|创建联调任务|发起联调/.test(text);
  });
  const observeEvents = uniqueDebugEvents.filter((event) => {
    const text = [event.label || '', event.summary || '', event.tool_name || ''].filter(Boolean).join(' ');
    return /debug_automation_get_steps|debug_automation_get_result|mcp_debug_watch_steps|watch_steps|观测联调|联调步骤/.test(text)
      || event.ui_component?.type === 'debug_workbench';
  });

  const summarizePhase = (
    key: string,
    label: string,
    phaseEvents: AgentProcessEvent[],
    runningText: string,
    doneText: string,
  ): NonNullable<Message['thinking_steps']>[number] | null => {
    if (phaseEvents.length === 0) return null;
    const hasError = phaseEvents.some((event) => event.status === 'error' || event.status === 'rejected');
    const hasRunning = phaseEvents.some((event) => event.status === 'running' || event.status === 'waiting');
    const duration = phaseEvents.reduce((sum, event) => sum + (event.duration_ms || 0), 0);
    const lastSummary = phaseEvents.map((event) => cleanDebugLine(event.summary || event.label || event.tool_name || '')).filter(Boolean).pop() || '';
    const startedAt = phaseEvents.find((event) => event.started_at)?.started_at;
    return {
      key,
      label,
      content: hasRunning ? runningText : lastSummary || doneText,
      status: hasError ? 'error' as const : hasRunning ? 'loading' as const : 'completed' as const,
      started_at: startedAt ? new Date(String(startedAt)).getTime() : undefined,
      duration_ms: duration || undefined,
    };
  };

  const createSummary = summarizePhase(
    'debug-create-task',
    '创建联调任务',
    createEvents.length > 0 ? createEvents : uniqueDebugEvents.slice(0, Math.max(1, Math.ceil(uniqueDebugEvents.length / 2))),
    '联调任务已发起',
    '联调任务已创建',
  );
  const observeSummary = summarizePhase(
    'debug-observe-process',
    '观测联调过程',
    observeEvents.length > 0 ? observeEvents : uniqueDebugEvents.slice(Math.max(1, Math.floor(uniqueDebugEvents.length / 2))),
    '正在观测联调步骤',
    '联调步骤已返回',
  );

  return [
    ...uniqueDebugEvents.map((event) => thinkingStepFromProcessEvent(event)),
    ...(createSummary ? [createSummary] : []),
    ...(observeSummary ? [observeSummary] : []),
  ];
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
  media?: string;
  metric?: string;
  threshold?: string;
  projectContext?: string;
  notifyTarget?: string;
  inspectionItems?: Array<{ label: string; status: string; detail: string }>;
  debugChecks?: Array<{ label: string; status: string; detail: string }>;
  accountShared?: boolean;
  intakeModes?: string[];
  template?: {
    name?: string;
    metrics?: string[];
    dimensions?: string[];
    timeRange?: string;
    frequency?: string;
    deliveryTime?: string;
    deliveryTargets?: string[];
  };
  metricCatalog?: string[];
  metricIssues?: string[];
  dataPreview?: {
    columns?: string[];
    rows?: Array<Record<string, string>>;
  };
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
      antMessage.success('已复制');
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
  codeStyle,
  showLineNumbers,
  title = '思维链',
  defaultExpanded = false,
  collapseToken,
}: {
  steps: NonNullable<Message['thinking_steps']>;
  toolCalls?: NonNullable<Message['tool_calls']>;
  codeStyle: CodeStyle;
  showLineNumbers: boolean;
  title?: string;
  defaultExpanded?: boolean;
  collapseToken?: number;
}) {
  const c = useThemeColors();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const displayTitle = title && !/[鎬濈淮閾]/.test(title) ? title : '思考过程';
  const [now, setNow] = useState(Date.now());
  const [expandedStepKeys, setExpandedStepKeys] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!steps.some((step) => step.status === 'loading')) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, [steps]);
  useEffect(() => {
    setExpanded(false);
    setExpandedStepKeys(new Set());
  }, [collapseToken]);
  const toggleStep = (key: string) => {
    setExpandedStepKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  const running = steps.some((step) => step.status === 'loading');
  const items = steps.map((step, index) => {
    const itemKey = step.key || `${step.label}-${index}`;
    const relatedTool = toolCalls?.find((tool) =>
      tool.step_key === step.key ||
      tool.name === step.key ||
      tool.name === step.label ||
      tool.display_name === step.label);
    const details = [
      step.input ? `请求：${JSON.stringify(step.input).slice(0, 220)}` : '',
      step.output ? `返回：${JSON.stringify(step.output).slice(0, 220)}` : '',
      relatedTool?.arguments ? `参数：${relatedTool.arguments.slice(0, 220)}` : '',
      relatedTool?.result ? `结果：${relatedTool.result.slice(0, 220)}` : '',
    ].filter(Boolean);
    const requestText = step.input
      ? JSON.stringify(step.input, null, 2)
      : safeJsonText(relatedTool?.arguments);
    const responseText = step.output
      ? JSON.stringify(step.output, null, 2)
      : safeJsonText(relatedTool?.result);
    const toolTitle = relatedTool?.display_name || relatedTool?.name || step.label;
    const hasStepDetail = Boolean(requestText || responseText);
    const stepExpanded = expandedStepKeys.has(itemKey);

    return {
      key: itemKey,
      title: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span>{index + 1}. {step.label}</span>
          {hasStepDetail && (
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                toggleStep(itemKey);
              }}
              style={{
                border: 'none',
                background: 'transparent',
                padding: 0,
                color: c.textMuted,
                cursor: 'pointer',
                fontSize: 10,
                lineHeight: 1,
              }}
            >
              {stepExpanded ? '收起' : '展开'}
            </button>
          )}
        </span>
      ),
      description: step.content,
      status: step.status === 'completed' ? 'success' as const : step.status,
      content: hasStepDetail && stepExpanded ? (
        <div style={{ display: 'grid', gap: 8, width: '100%', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: c.textSecondary, fontSize: 10, fontWeight: 650 }}>
            <CapabilityIcon kind={relatedTool?.kind || step.key} size={10} />
            <span>{toolTitle}</span>
          </div>
          {requestText && (
            <div style={{ width: '100%', minWidth: 0 }}>
              <div style={{ marginBottom: 4, color: c.textMuted, fontSize: 10 }}>请求</div>
              <FancyCodeBlock language="json" codeStyle={codeStyle} showLineNumbers={showLineNumbers}>{requestText}</FancyCodeBlock>
            </div>
          )}
          {responseText && (
            <div style={{ width: '100%', minWidth: 0 }}>
              <div style={{ marginBottom: 4, color: c.textMuted, fontSize: 10 }}>返回</div>
              <FancyCodeBlock language="json" codeStyle={codeStyle} showLineNumbers={showLineNumbers}>{responseText}</FancyCodeBlock>
            </div>
          )}
        </div>
      ) : undefined,
      footer: undefined,
    };
  });

  return (
    <div
      style={{
        marginBottom: 8,
        borderRadius: 14,
        border: `1px solid ${c.borderFaint}`,
        background: '#fff',
        overflow: 'visible',
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
          position: 'static',
          background: c.accentBgFaint,
          border: 'none',
          borderBottom: expanded ? `1px solid ${c.borderFaint}` : 'none',
          cursor: 'pointer',
          fontSize: 10,
          color: c.textSecondary,
        }}
      >
        <BulbOutlined style={{ fontSize: 10, color: c.accent }} />
        <span>{displayTitle}</span>
        {running && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            {[0, 1, 2].map((dot) => (
              <span
                key={dot}
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  background: c.accent,
                  animation: `typing-dot 1.2s ease-in-out ${dot * 0.16}s infinite`,
                }}
              />
            ))}
          </span>
        )}
        <span style={{ color: c.textMuted }}>{running ? '正在思考' : `完成 ${steps.length} 步`}</span>
        <span style={{ marginLeft: 'auto', color: c.textMuted, fontSize: 10 }}>
          {expanded ? '收起' : '展开'}
        </span>
        <span style={{ color: c.textMuted, fontSize: 10 }}>
          {expanded ? <UpOutlined style={{ fontSize: 10 }} /> : <DownOutlined style={{ fontSize: 10 }} />}
        </span>
      </button>
      {expanded && (
        <div style={{ padding: '0 12px 12px' }}>
          <ThoughtChain
            items={items}
            line="dashed"
            styles={{
              item: { fontSize: 10 },
              itemContent: { fontSize: 10 },
              itemFooter: { color: c.textMuted, fontSize: 10 },
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

  const renderText = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, index) => {
      const normalizedLine = line.replace(/\*\*([^*]+)\*\*/g, '$1');
      const trimmedLine = normalizedLine.trim();
      const rawTrimmedLine = line.trim();
    const hasPreviousContent = lines.slice(0, index).some((item) => item.trim());
    const sectionDivider = hasPreviousContent ? (
      <div style={{ height: 1, background: c.borderFaint, margin: '14px 0 12px' }} />
    ) : null;
    const wrapSection = (node: React.ReactElement) => sectionDivider ? (
      <React.Fragment key={index}>
        {sectionDivider}
        {node}
      </React.Fragment>
    ) : node;
    const boldHeadingMatch = trimmedLine.match(/^\*\*([^*]+)\*\*$/);
    if (boldHeadingMatch) {
      return wrapSection(<h2 key={index} style={{ fontSize: 16, fontWeight: 700, color: c.textPrimary, marginTop: 0, marginBottom: 6 }}>{boldHeadingMatch[1]}</h2>);
    }

    const boldLabelMatch = trimmedLine.match(/^\*\*([^*]+)\*\*[:：]\s*(.*)$/);
    if (boldLabelMatch) {
      return wrapSection(
        <div key={index} style={{ margin: '0 0 8px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: c.textPrimary }}>{boldLabelMatch[1]}</div>
          {boldLabelMatch[2] && <div style={{ marginTop: 4, color: c.textSecondary }}>{boldLabelMatch[2]}</div>}
        </div>,
      );
    }

    if (trimmedLine.startsWith('### ')) {
      return wrapSection(<h3 key={index} style={{ fontSize: 15, fontWeight: 700, color: c.textPrimary, marginTop: 0, marginBottom: 4 }}>{trimmedLine.slice(4)}</h3>);
    }
    if (trimmedLine.startsWith('## ')) {
      return wrapSection(<h2 key={index} style={{ fontSize: 16, fontWeight: 700, color: c.textPrimary, marginTop: 0, marginBottom: 6 }}>{trimmedLine.slice(3)}</h2>);
    }
    if (trimmedLine.startsWith('# ')) {
      return wrapSection(<h1 key={index} style={{ fontSize: 18, fontWeight: 700, color: c.textPrimary, marginTop: 0, marginBottom: 8 }}>{trimmedLine.slice(2)}</h1>);
    }

    const listMatch = trimmedLine.match(/^(\d+)[.、)]\s*(.*)/);
    if (listMatch) {
      return (
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
              fontWeight: 650,
              lineHeight: 1,
            }}
          >
            {listMatch[1]}
          </span>
          <span style={{ color: c.textBody }}>{listMatch[2]}</span>
        </div>
      );
    }

    if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ') || trimmedLine.startsWith('•')) {
      const content = trimmedLine.startsWith('•') ? trimmedLine.slice(1).trim() : trimmedLine.slice(2);
      return (
        <div key={index} style={{ display: 'flex', gap: 8 }}>
          <span style={{ color: c.accent }}>•</span>
          <span>{content}</span>
        </div>
      );
    }

    if (!trimmedLine) return <div key={index} style={{ height: 8 }} />;
    return <p key={index} style={{ margin: '2px 0' }}>{normalizedLine}</p>;
    });
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
    <div style={{ margin: '10px 0', borderRadius: 14, border: `1px solid ${c.borderFaint}`, background: '#fff', padding: 12 }}>
      <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: c.textSecondary }}>流程图</div>
        {nodes.length > 0 && <div style={{ fontSize: 11, color: c.textMuted }}>点击查看大图</div>}
      </div>
      {nodes.length > 0 ? (
        <>
          <button
            type="button"
            onClick={() => setOpen(true)}
            style={{
              width: '100%',
              border: 'none',
              background: '#fff',
              padding: 0,
              textAlign: 'left',
              cursor: 'zoom-in',
            }}
          >
            <div
              style={{
                borderRadius: 12,
                border: `1px solid ${c.borderFaint}`,
                background: '#fbfdff',
                padding: 10,
                overflow: 'hidden',
              }}
            >
              {renderDiagram(false)}
            </div>
          </button>
          <Modal
            title="流程图"
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
      style={{
        marginTop: 10,
        padding: 12,
        border: `1px solid ${c.borderFaint}`,
        borderRadius: 14,
        background: '#fff',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, color: c.textPrimary, fontSize: 13, fontWeight: 600 }}>
        <InfoCircleOutlined style={{ color: c.accent }} />
        <span>补充排查条件</span>
      </div>
      <div style={{ display: 'grid', gap: 10 }}>
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
                  borderRadius: 10,
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
                  borderRadius: 10,
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
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
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
  const debugPayload = getDebugProcessPayload(message);
  const debugLog = collectDebugLogs(debugPayload);
  const calls = message.tool_calls || [];
  const capabilities: CapabilityRefView[] = calls
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
    .filter((item, index, array) => array.findIndex(other => other.name === item.name && other.kind === item.kind) === index);
  if (debugLog) {
    capabilities.unshift({
      key: 'debug-log',
      name: '联调日志',
      kind: 'debug_log',
      result: debugLog,
      status: 'done',
    });
  }
  return capabilities.slice(0, 8);
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
      label: capability.kind === 'debug_log' ? '联调日志' : capability.kind === 'skill' ? 'Skill' : capability.kind === 'report_mcp' ? '报表' : capability.kind === 'knowledge' ? '知识库' : capability.kind === 'web_search' ? '网页查询' : '调用',
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
        <span style={{ fontSize: 10, fontWeight: 650 }}>调用与来源</span>
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
              <CapabilityIcon kind={item.kind} size={12} />
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

function DebugProcessStrip({ payload, collapseToken }: { payload: DebugProcessPayload; collapseToken?: number }) {
  const c = useThemeColors();
  const [expanded, setExpanded] = useState(false);
  const [expandedStepKeys, setExpandedStepKeys] = useState<Set<string>>(new Set());
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const parsedSteps = normalizeMcpDebugSteps(payload);
  const taskDetailText = '';
  const detailTextForFallback = stringifyDebugTaskDetail(payload.task_detail);
  const debugLogText = '';
  const rawStepsText = '';
  const debugImages: string[] = [];
  const steps = parsedSteps.length > 0
    ? parsedSteps
    : detailTextForFallback
      ? [{
        index: 1,
        key: 'debug-task-detail',
        name: '任务详情',
        status: String(payload.status || 'running'),
        message: '已收到任务详情，等待解析联调步骤。',
        sub_steps: [{ name: '等待解析联调步骤', status: String(payload.status || 'running') }],
      } satisfies DebugProcessStep]
      : [];

  const latestActiveIndex = Math.max(0, steps.reduce((latest, step, index) => {
    const status = String(step.status || '').toLowerCase();
    return !status.includes('success') && !status.includes('done') && step.available !== true ? index : latest;
  }, -1));
  const hasRunningStep = steps.some((step, index) => normalizeDebugStatus(step, index, latestActiveIndex) === 'running');
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!hasRunningStep) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, [hasRunningStep]);
  useEffect(() => {
    setExpanded(false);
    setExpandedStepKeys(new Set());
    setPreviewImage(null);
  }, [collapseToken]);

  if (steps.length === 0 && !detailTextForFallback) return null;

  const outcome = getDebugOutcome(payload, steps, latestActiveIndex);
  const currentStep = outcome.activeStep || steps[latestActiveIndex] || steps[steps.length - 1];
  const currentSubStep = currentStep.sub_steps?.find((item) => String(item.status || '').toLowerCase().includes('running'))
    || currentStep.sub_steps?.[currentStep.sub_steps.length - 1];
  const currentLabel = outcome.state === 'failed'
    ? `卡在：${extractDebugStepDisplayName(currentSubStep?.name || currentSubStep?.message || currentStep.message || currentStep.name) || '联调步骤'}`
    : extractDebugStepDisplayName(currentSubStep?.name || currentSubStep?.message || currentStep.message || currentStep.name) || '准备联调';
  const isRunning = String(payload.status || '').toLowerCase() !== 'blocked'
    && hasRunningStep
    && outcome.state === 'running';
  const statusIcon = (status: ReturnType<typeof normalizeDebugStatus>) => {
    if (status === 'success') return <span style={{ color: '#16a34a', fontSize: 11 }}>✓</span>;
    if (status === 'error') return <span style={{ color: '#dc2626', fontSize: 11 }}>!</span>;
    if (status === 'running') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
          {[0, 1, 2].map((dot) => (
            <span
              key={dot}
              style={{
                width: 3,
                height: 3,
                borderRadius: '50%',
                background: c.accent,
                animation: `typing-dot 1.2s ease-in-out ${dot * 0.16}s infinite`,
              }}
            />
          ))}
        </span>
      );
    }
    return <span style={{ color: c.textMuted, fontSize: 11 }}>•</span>;
  };

  return (
    <div
      style={{
        marginBottom: 8,
        borderRadius: 14,
        border: `1px solid ${c.borderFaint}`,
        background: '#fff',
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
          background: c.accentBgFaint,
          border: 'none',
          borderBottom: expanded ? `1px solid ${c.borderFaint}` : 'none',
          cursor: 'pointer',
          fontSize: 10,
          color: c.textSecondary,
          minWidth: 0,
        }}
      >
        <ThunderboltOutlined style={{ fontSize: 10, color: c.accent }} />
        <span style={{ flexShrink: 0 }}>联调</span>
        {isRunning && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            {[0, 1, 2].map((dot) => (
              <span
                key={dot}
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  background: c.accent,
                  animation: `typing-dot 1.2s ease-in-out ${dot * 0.16}s infinite`,
                }}
              />
            ))}
          </span>
        )}
        <span style={{ flexShrink: 0, color: c.textMuted }}>
          {outcome.state === 'running' ? '正在联调' : outcome.label}
        </span>
        <span style={{ minWidth: 0, whiteSpace: 'normal', wordBreak: 'break-word', textAlign: 'left' }}>
          {currentLabel}
        </span>
        <span style={{ marginLeft: 'auto', color: c.textMuted, fontSize: 10, flexShrink: 0 }}>
          {expanded ? '收起' : '展开'}
        </span>
        <span style={{ color: c.textMuted, fontSize: 10, flexShrink: 0 }}>
          {expanded ? <UpOutlined style={{ fontSize: 10 }} /> : <DownOutlined style={{ fontSize: 10 }} />}
        </span>
      </button>
      {expanded && (
        <div style={{ padding: '10px 12px 12px', display: 'grid', gap: 8, maxHeight: 360, overflow: 'auto' }}>
          {taskDetailText && (
            <div
              style={{
                border: `1px solid ${c.borderFaint}`,
                borderRadius: 10,
                background: '#fff',
                overflow: 'hidden',
              }}
            >
              <div style={{ padding: '7px 10px', borderBottom: `1px solid ${c.borderFaint}`, fontSize: 10, color: c.textPrimary, fontWeight: 650 }}>
                技术返回
              </div>
              <pre
                style={{
                  margin: 0,
                  padding: 10,
                  maxHeight: 180,
                  overflow: 'auto',
                  whiteSpace: 'pre',
                  color: c.textSecondary,
                  fontSize: 10,
                  lineHeight: 1.6,
                  background: '#fff',
                }}
              >
                {taskDetailText}
              </pre>
            </div>
          )}
          {debugLogText && (
            <div
              style={{
                border: `1px solid ${c.borderFaint}`,
                borderRadius: 10,
                background: '#fff',
                overflow: 'hidden',
              }}
            >
              <div style={{ padding: '7px 10px', borderBottom: `1px solid ${c.borderFaint}`, fontSize: 10, color: c.textPrimary, fontWeight: 650 }}>
                联调日志
              </div>
              <pre
                style={{
                  margin: 0,
                  padding: 10,
                  maxHeight: 140,
                  overflow: 'auto',
                  whiteSpace: 'pre',
                  color: c.textSecondary,
                  fontSize: 10,
                  lineHeight: 1.6,
                  background: '#fff',
                }}
              >
                {debugLogText}
              </pre>
            </div>
          )}
          {debugImages.length > 0 && (
            <div
              style={{
                border: `1px solid ${c.borderFaint}`,
                borderRadius: 10,
                background: '#fff',
                overflow: 'hidden',
              }}
            >
              <div style={{ padding: '7px 10px', borderBottom: `1px solid ${c.borderFaint}`, fontSize: 10, color: c.textPrimary, fontWeight: 650 }}>
                运行截图
              </div>
              <div style={{ padding: 10, display: 'flex', gap: 8, overflowX: 'auto' }}>
                {debugImages.map((src, shotIndex) => (
                  <button
                    key={`${src}-${shotIndex}`}
                    type="button"
                    onClick={() => setPreviewImage(src)}
                    style={{
                      border: `1px solid ${c.borderFaint}`,
                      borderRadius: 8,
                      padding: 0,
                      background: '#fff',
                      width: 108,
                      height: 66,
                      flex: '0 0 auto',
                      overflow: 'hidden',
                      cursor: 'zoom-in',
                    }}
                  >
                    <img
                      src={src}
                      alt="运行截图"
                      loading="lazy"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
          {rawStepsText && (
            <div
              style={{
                border: `1px solid ${c.borderFaint}`,
                borderRadius: 10,
                background: '#fff',
                overflow: 'hidden',
              }}
            >
              <div style={{ padding: '7px 10px', borderBottom: `1px solid ${c.borderFaint}`, fontSize: 10, color: c.textPrimary, fontWeight: 650 }}>
                步骤原文
              </div>
              <pre
                style={{
                  margin: 0,
                  padding: 10,
                  maxHeight: 140,
                  overflow: 'auto',
                  whiteSpace: 'pre',
                  color: c.textSecondary,
                  fontSize: 10,
                  lineHeight: 1.6,
                  background: '#fff',
                }}
              >
                {rawStepsText}
              </pre>
            </div>
          )}
          {steps.map((step, index) => {
            const normalizedStatus = normalizeDebugStatus(step, index, latestActiveIndex);
            const subSteps = step.sub_steps?.length ? step.sub_steps : [];
            const screenshots = collectStepScreenshots(step);
            const stepKey = `${step.key || step.name || 'step'}-${index}`;
            const stepDetailText = getDebugStepDetailText(step);
            const isStepExpanded = expandedStepKeys.has(stepKey);
            const failureReason = normalizedStatus === 'error'
              ? extractDebugStepDisplayName(step.message || outcome.reason)
              : '';
            const displayStepName = normalizeDebugStepDisplayName(step.name || '') || step.name || '';
            return (
              <div
                key={stepKey}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '18px minmax(0, 1fr)',
                  gap: 8,
                  alignItems: 'start',
                  padding: '7px 0',
                  borderBottom: index === steps.length - 1 ? 'none' : `1px solid ${c.borderFaint}`,
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: 18 }}>
                  {statusIcon(normalizedStatus)}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, fontSize: 10, color: c.textPrimary, fontWeight: 650 }}>
                    <span style={{ color: c.textMuted }}>{index + 1}.</span>
                    <span style={{ flex: 1, minWidth: 0, whiteSpace: 'normal', wordBreak: 'break-word' }}>{displayStepName}</span>
                    {stepDetailText && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setExpandedStepKeys((prev) => {
                            const next = new Set(prev);
                            if (next.has(stepKey)) next.delete(stepKey);
                            else next.add(stepKey);
                            return next;
                          });
                        }}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          color: c.accent,
                          cursor: 'pointer',
                          fontSize: 10,
                          padding: '0 2px',
                          flexShrink: 0,
                        }}
                      >
                        {isStepExpanded ? '收起' : '展开'}
                      </button>
                    )}
                  </div>
                  {failureReason && (
                    <div style={{ marginTop: 4, fontSize: 10, color: '#dc2626', lineHeight: 1.5 }}>
                      {failureReason}
                    </div>
                  )}
                  <div style={{ marginTop: 5, display: 'grid', gap: 4 }}>
                    {subSteps.map((subStep, subIndex) => {
                      const subStatus = normalizeDebugSubStatus(subStep, normalizedStatus);
                      const displaySubStepName = normalizeDebugStepDisplayName(
                        subStep.name || subStep.message || step.message,
                      );
                      if (!displaySubStepName) return null;
                      return (
                      <div key={`${step.key || index}-${subIndex}`} style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, fontSize: 10, color: c.textSecondary }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 12, flexShrink: 0 }}>
                          {statusIcon(subStatus)}
                        </span>
                        <span style={{ color: c.textMuted, flexShrink: 0 }}>{subIndex + 1}.</span>
                        <span style={{ minWidth: 0, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                          {displaySubStepName}
                        </span>
                      </div>
                      );
                    })}
                  </div>
                  {screenshots.length > 0 && (
                    <div style={{ marginTop: 8, display: 'flex', gap: 6, overflowX: 'auto' }}>
                      {screenshots.map((src, shotIndex) => (
                        <button
                          key={`${src}-${shotIndex}`}
                          type="button"
                          onClick={() => setPreviewImage(src)}
                          style={{
                            border: `1px solid ${c.borderFaint}`,
                            borderRadius: 8,
                            padding: 0,
                            background: '#fff',
                            width: 88,
                            height: 54,
                            flex: '0 0 auto',
                            overflow: 'hidden',
                            cursor: 'zoom-in',
                          }}
                        >
                          <img
                            src={src}
                            alt="运行截图"
                            loading="lazy"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </button>
                      ))}
                    </div>
                  )}
                  {stepDetailText && isStepExpanded && (
                    <FancyCodeBlock language="json" codeStyle="minimal" showLineNumbers={false}>
                      {stepDetailText}
                    </FancyCodeBlock>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <Modal
        open={Boolean(previewImage)}
        onCancel={() => setPreviewImage(null)}
        footer={null}
        centered
        width={920}
        destroyOnHidden
        styles={{
          body: { padding: 12, background: '#0b1220' },
        }}
      >
        {previewImage && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '56vh' }}>
            <img
              src={previewImage}
              alt="图片预览"
              style={{ maxWidth: '100%', maxHeight: '76vh', objectFit: 'contain', borderRadius: 10, background: '#0b1220' }}
            />
          </div>
        )}
      </Modal>
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
      <span style={{ fontSize: 12, fontWeight: 560, flexShrink: 0 }}>来源</span>
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

function ReportComposerCard({ data }: { data: WorkflowCardData }) {
  const c = useThemeColors();
  const template = data.template || {};
  const [templateConfirmed, setTemplateConfirmed] = useState(false);
  const [querying, setQuerying] = useState(false);
  const [dataColumns, setDataColumns] = useState<string[]>(data.dataPreview?.columns || []);
  const [dataRows, setDataRows] = useState<Array<Record<string, string>>>(data.dataPreview?.rows || []);
  const [taskCreated, setTaskCreated] = useState(false);

  const metrics = template.metrics || [];
  const dimensions = template.dimensions || [];
  const deliveryTargets = template.deliveryTargets || [];

  const runDataQuery = async () => {
    setQuerying(true);
    try {
      const response = await fetch('/api/xiaoqiao/report-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: data.sourceText || '生成广告消耗日报',
          reportDate: new Date().toISOString().slice(0, 10),
        }),
      });
      const payload = await response.json();
      const draft = payload?.draft;
      if (draft?.columns?.length && draft?.rows?.length) {
        setDataColumns(draft.columns.map(String));
        setDataRows(draft.rows.slice(0, 8).map((row: Record<string, unknown>) => {
          const next: Record<string, string> = {};
          Object.entries(row).forEach(([key, value]) => {
            next[key] = String(value ?? '');
          });
          return next;
        }));
        antMessage.success('已生成报表预览');
      } else {
        setDataColumns(['日期', '媒体', '账户', '消耗', '数据来源', '状态']);
        setDataRows([
          {
            日期: '待确认查询范围',
            媒体: '全部',
            账户: '全部',
            消耗: '等待智投报表返回',
            数据来源: '智投报表',
            状态: '模板已确认',
          },
        ]);
        antMessage.warning('未返回真实报表数据，请确认报表 MCP 是否可用');
      }
    } catch {
      antMessage.error('报表查询失败，请检查报表服务');
    } finally {
      setQuerying(false);
    }
  };

  const createSchedule = async () => {
    try {
      await fetch('/api/xiaoqiao/scheduled-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: template.name || '广告消耗日报',
          description: '每天 10:00 自动生成并发送广告消耗日报',
          task_type: 'report',
          cron_expression: '0 10 * * *',
          frequency: template.frequency || 'daily',
          monitor_metrics: metrics,
          alert_channels: deliveryTargets.length > 0 ? deliveryTargets : ['小闪'],
          alert_targets: deliveryTargets.length > 0 ? deliveryTargets : ['小闪'],
          custom_params: {
            delivery_time: template.deliveryTime || '10:00',
            dimensions,
            delivery_targets: deliveryTargets.length > 0 ? deliveryTargets : ['小闪'],
            metrics,
            source_text: data.sourceText,
          },
          status: 'active',
        }),
      });
      setTaskCreated(true);
      antMessage.success('已创建每天 10:00 的广告消耗日报任务');
    } catch {
      antMessage.error('定时任务创建失败');
    }
  };

  const templateRows = [
    ['报表名称', template.name || '广告消耗日报', '待确认'],
    ['指标', metrics.join('、') || '消耗', metrics.length > 0 ? '已识别' : '待补充'],
    ['维度', dimensions.join('、') || '日期、媒体、账户', dimensions.length > 0 ? '已识别' : '待补充'],
    ['时间范围', template.timeRange || '每天生成前一日数据', '已识别'],
    ['发送时间', `${template.frequency || '每天'} ${template.deliveryTime || '10:00'}`, '已识别'],
    ['发送位置', deliveryTargets.join('、') || '小闪', '待确认'],
  ];

  return (
    <div
      style={{
        marginTop: 10,
        borderRadius: 14,
        border: `1px solid ${c.borderFaint}`,
        background: '#fff',
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '12px 14px', borderBottom: `1px solid ${c.borderFaint}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: c.textPrimary }}>{data.title || '报表模板确认'}</div>
            <div style={{ marginTop: 4, fontSize: 12, color: c.textMuted }}>
              先确认指标和维度，再获取数据、保存模板或创建定时任务。
            </div>
          </div>
          <Tag color={taskCreated ? 'green' : templateConfirmed ? 'blue' : 'default'} style={{ borderRadius: 999, margin: 0 }}>
            {taskCreated ? '已定时' : templateConfirmed ? '模板已确认' : '待确认'}
          </Tag>
        </div>
      </div>

      <div style={{ padding: 14, display: 'grid', gap: 14 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 650, color: c.textPrimary, marginBottom: 8 }}>可接收的模板来源</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {(data.intakeModes || ['截图提取模板', '上传 Excel 模板', '手动输入模板', '指定系统页面']).map((mode) => (
              <span
                key={mode}
                style={{
                  borderRadius: 999,
                  border: `1px solid ${c.borderFaint}`,
                  padding: '5px 9px',
                  fontSize: 12,
                  color: c.textSecondary,
                  background: '#fff',
                }}
              >
                {mode}
              </span>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 12, fontWeight: 650, color: c.textPrimary, marginBottom: 8 }}>报表模板</div>
          <div style={{ overflowX: 'auto', borderTop: `1px solid ${c.borderFaint}` }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ color: c.textMuted, textAlign: 'left' }}>
                  <th style={{ padding: '8px 6px', fontWeight: 600 }}>项目</th>
                  <th style={{ padding: '8px 6px', fontWeight: 600 }}>当前值</th>
                  <th style={{ padding: '8px 6px', fontWeight: 600 }}>状态</th>
                </tr>
              </thead>
              <tbody>
                {templateRows.map(([label, value, status]) => (
                  <tr key={label} style={{ borderTop: `1px solid ${c.borderFaint}` }}>
                    <td style={{ padding: '8px 6px', color: c.textSecondary, whiteSpace: 'nowrap' }}>{label}</td>
                    <td style={{ padding: '8px 6px', color: c.textPrimary }}>{value}</td>
                    <td style={{ padding: '8px 6px', color: status === '待确认' ? c.warning : c.success, whiteSpace: 'nowrap' }}>{status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 12, fontWeight: 650, color: c.textPrimary, marginBottom: 8 }}>指标校验</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {metrics.map((metric) => (
              <Tag key={metric} color="green" style={{ borderRadius: 999, margin: 0 }}>{metric} 已存在</Tag>
            ))}
            {(data.metricCatalog || []).slice(0, 8).map((metric) => (
              <Tag key={metric} style={{ borderRadius: 999, margin: 0 }}>{metric}</Tag>
            ))}
          </div>
        </div>

        {dataColumns.length > 0 && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 650, color: c.textPrimary, marginBottom: 8 }}>数据预览</div>
            <div style={{ overflowX: 'auto', borderTop: `1px solid ${c.borderFaint}` }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ color: c.textMuted, textAlign: 'left' }}>
                    {dataColumns.map((column) => (
                      <th key={column} style={{ padding: '8px 6px', fontWeight: 600, whiteSpace: 'nowrap' }}>{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dataRows.map((row, rowIndex) => (
                    <tr key={rowIndex} style={{ borderTop: `1px solid ${c.borderFaint}` }}>
                      {dataColumns.map((column) => (
                        <td key={column} style={{ padding: '8px 6px', color: c.textPrimary, whiteSpace: 'nowrap' }}>{row[column] || '-'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button
            type="button"
            onClick={() => {
              setTemplateConfirmed(true);
              antMessage.success('模板已确认');
            }}
            style={{ border: 'none', background: c.accent, color: '#fff', borderRadius: 999, padding: '7px 12px', fontSize: 12, cursor: 'pointer' }}
          >
            确认模板
          </button>
          <button
            type="button"
            disabled={!templateConfirmed || querying}
            onClick={runDataQuery}
            style={{ border: `1px solid ${templateConfirmed ? c.accentBorder : c.borderFaint}`, background: '#fff', color: templateConfirmed ? c.accent : c.textMuted, borderRadius: 999, padding: '7px 12px', fontSize: 12, cursor: templateConfirmed ? 'pointer' : 'not-allowed' }}
          >
            {querying ? '获取中' : '立即获取数据'}
          </button>
          <button
            type="button"
            disabled={!templateConfirmed}
            onClick={createSchedule}
            style={{ border: `1px solid ${templateConfirmed ? c.accentBorder : c.borderFaint}`, background: '#fff', color: templateConfirmed ? c.accent : c.textMuted, borderRadius: 999, padding: '7px 12px', fontSize: 12, cursor: templateConfirmed ? 'pointer' : 'not-allowed' }}
          >
            创建定时任务
          </button>
          <button type="button" onClick={() => antMessage.success('已分享到小闪')} style={{ border: `1px solid ${c.borderFaint}`, background: '#fff', color: c.textSecondary, borderRadius: 999, padding: '7px 12px', fontSize: 12, cursor: 'pointer' }}>
            分享到小闪
          </button>
          <button type="button" onClick={() => antMessage.success('已保存到个人知识库')} style={{ border: `1px solid ${c.borderFaint}`, background: '#fff', color: c.textSecondary, borderRadius: 999, padding: '7px 12px', fontSize: 12, cursor: 'pointer' }}>
            保存到知识库
          </button>
        </div>
      </div>
    </div>
  );
}

function ReportComposerFlowCard({ data }: { data: WorkflowCardData }) {
  const c = useThemeColors();
  const template = data.template || {};
  const metrics = template.metrics || ['消耗'];
  const dimensions = template.dimensions || ['日期', '媒体', '账户'];
  const deliveryTargets = template.deliveryTargets || ['小闪'];
  const metricIssues = data.metricIssues || [];
  const templateColumns = [...dimensions, ...metrics];
  const [templateConfirmed, setTemplateConfirmed] = useState(false);
  const [querying, setQuerying] = useState(false);
  const [dataReady, setDataReady] = useState(false);
  const [taskCreated, setTaskCreated] = useState(false);
  const [dataColumns, setDataColumns] = useState<string[]>([]);
  const [dataRows, setDataRows] = useState<Array<Record<string, string>>>([]);

  const queryData = async () => {
    setQuerying(true);
    try {
      const response = await fetch('/api/xiaoqiao/report-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: data.sourceText || '生成广告消耗日报',
          reportDate: new Date().toISOString().slice(0, 10),
        }),
      });
      const payload = await response.json();
      const draft = payload?.draft;
      if (draft?.columns?.length && draft?.rows?.length) {
        setDataColumns(draft.columns.map(String));
        setDataRows(draft.rows.slice(0, 8).map((row: Record<string, unknown>) => {
          const next: Record<string, string> = {};
          Object.entries(row).forEach(([key, value]) => {
            next[key] = String(value ?? '');
          });
          return next;
        }));
      } else {
        setDataColumns(templateColumns);
        setDataRows([{ 日期: '前一日', 媒体: '全部', 账户: '全部', 消耗: '等待智投报表返回' }]);
        antMessage.warning('未返回真实报表数据，请确认报表 MCP 是否可用');
      }
      setDataReady(true);
    } catch {
      antMessage.error('报表查询失败，请检查报表服务');
    } finally {
      setQuerying(false);
    }
  };

  const createSchedule = async () => {
    try {
      await fetch('/api/xiaoqiao/scheduled-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: template.name || '广告消耗日报',
          description: '每天 10:00 自动生成并发送广告消耗日报',
          task_type: 'report_generate',
          cron_expression: '0 10 * * *',
          frequency: 'daily',
          monitor_metrics: metrics,
          alert_channels: deliveryTargets,
          alert_targets: deliveryTargets,
          custom_params: {
            delivery_time: template.deliveryTime || '10:00',
            dimensions,
            metrics,
            delivery_targets: deliveryTargets,
            source_text: data.sourceText,
          },
          status: 'active',
        }),
      });
      setTaskCreated(true);
      antMessage.success('已创建每天 10:00 的广告消耗日报');
    } catch {
      antMessage.error('定时报表创建失败');
    }
  };

  const stageItems = [
    { label: '确认模板', active: templateConfirmed },
    { label: '查询数据', active: dataReady },
    { label: '创建定时报表', active: taskCreated },
  ];

  return (
    <div style={{ marginTop: 10, border: `1px solid ${c.borderFaint}`, borderRadius: 14, background: '#fff', overflow: 'hidden' }}>
      <div style={{ padding: '12px 14px', borderBottom: `1px solid ${c.borderFaint}`, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: c.textPrimary }}>{data.title || '广告消耗日报'}</div>
        <Tag color={taskCreated ? 'green' : dataReady ? 'blue' : 'default'} style={{ borderRadius: 999, margin: 0 }}>
          {taskCreated ? '已创建' : dataReady ? '数据待确认' : templateConfirmed ? '查询中' : '模板待确认'}
        </Tag>
      </div>

      <div style={{ padding: 14, display: 'grid', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
          {stageItems.map((stage, index) => (
            <div
              key={stage.label}
              style={{
                borderRadius: 10,
                border: `1px solid ${stage.active ? c.accentBorder : c.borderFaint}`,
                background: stage.active ? c.accentBgFaint : '#fff',
                color: stage.active ? c.accent : c.textMuted,
                padding: '8px 10px',
                fontSize: 12,
                fontWeight: 620,
              }}
            >
              {index + 1}. {stage.label}
            </div>
          ))}
        </div>

        <div>
          <div style={{ fontSize: 12, fontWeight: 650, color: c.textPrimary, marginBottom: 8 }}>模板预览</div>
          <div style={{ overflowX: 'auto', borderTop: `1px solid ${c.borderFaint}` }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ color: c.textMuted, textAlign: 'left' }}>
                  {templateColumns.map((column) => (
                    <th key={column} style={{ padding: '8px 6px', fontWeight: 600, whiteSpace: 'nowrap' }}>{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderTop: `1px solid ${c.borderFaint}` }}>
                  {templateColumns.map((column) => (
                    <td key={column} style={{ padding: '8px 6px', color: c.textMuted, whiteSpace: 'nowrap' }}>
                      {metrics.includes(column) ? '待查询' : column === '日期' ? '前一日' : '全部'}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ fontSize: 12, color: metricIssues.length > 0 ? c.warning : c.success }}>
          {metricIssues.length > 0 ? `指标需要确认：${metricIssues.join('、')}` : '指标校验无误'}
        </div>

        {dataReady && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 650, color: c.textPrimary, marginBottom: 8 }}>查询结果</div>
            <div style={{ overflowX: 'auto', borderTop: `1px solid ${c.borderFaint}` }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ color: c.textMuted, textAlign: 'left' }}>
                    {dataColumns.map((column) => (
                      <th key={column} style={{ padding: '8px 6px', fontWeight: 600, whiteSpace: 'nowrap' }}>{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dataRows.map((row, rowIndex) => (
                    <tr key={rowIndex} style={{ borderTop: `1px solid ${c.borderFaint}` }}>
                      {dataColumns.map((column) => (
                        <td key={column} style={{ padding: '8px 6px', color: c.textPrimary, whiteSpace: 'nowrap' }}>{row[column] || '-'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          {!templateConfirmed && (
            <button
              type="button"
              onClick={() => {
                setTemplateConfirmed(true);
                void queryData();
              }}
              style={{ border: 'none', background: c.accent, color: '#fff', borderRadius: 999, padding: '7px 12px', fontSize: 12, cursor: 'pointer' }}
            >
              确认模板并查询数据
            </button>
          )}
          {templateConfirmed && !dataReady && (
            <span style={{ fontSize: 12, color: c.textMuted }}>{querying ? '正在查询智投报表数据...' : '等待查询结果'}</span>
          )}
          {dataReady && !taskCreated && (
            <>
              <span style={{ fontSize: 12, color: c.textSecondary }}>请检查数据。无误后可创建每天 10:00 的定时报表。</span>
              <button
                type="button"
                onClick={createSchedule}
                style={{ border: 'none', background: c.accent, color: '#fff', borderRadius: 999, padding: '7px 12px', fontSize: 12, cursor: 'pointer' }}
              >
                数据无误，创建定时报表
              </button>
            </>
          )}
          {taskCreated && (
            <span style={{ fontSize: 12, color: c.success }}>已创建每天 10:00 发送到{deliveryTargets.join('、') || '小闪'}的广告消耗日报。</span>
          )}
        </div>
      </div>
    </div>
  );
}

function MonitorTaskFlowCard({ data }: { data: WorkflowCardData }) {
  const c = useThemeColors();
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(false);
  const conditions = [
    { label: '项目范围', value: data.projectContext || '顶部项目选择器当前范围' },
    { label: '媒体', value: data.media || '巨量' },
    { label: '指标', value: data.metric || '回传延迟' },
    { label: '阈值', value: data.threshold || '30 分钟' },
    { label: '通知', value: data.notifyTarget || '站内告警' },
  ];

  const createTask = async () => {
    if (creating || created) return;
    setCreating(true);
    try {
      const res = await fetch('/api/xiaoqiao/scheduled-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.title || '回传延迟监控',
          task_type: 'alert_check',
          status: 'active',
          frequency: '每 5 分钟',
          monitor_metrics: ['回传延迟'],
          alert_conditions: [
            {
              metric: 'callback_latency',
              operator: 'gt',
              threshold_minutes: Number(String(data.threshold || '30').match(/\d+/)?.[0] || 30),
            },
          ],
          alert_channels: ['站内告警'],
          custom_params: {
            project_context: data.projectContext,
            media: data.media || '巨量',
            auto_diagnosis: true,
          },
        }),
      });
      if (!res.ok) throw new Error(`create task failed: ${res.status}`);
      setCreated(true);
      antMessage.success('已创建监控任务');
    } catch {
      antMessage.error('创建失败，请稍后重试');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={{ marginTop: 10, border: `1px solid ${c.borderFaint}`, borderRadius: 14, background: '#fff', overflow: 'hidden' }}>
      <div style={{ padding: '12px 14px', borderBottom: `1px solid ${c.borderFaint}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: c.textPrimary }}>{data.title || '回传延迟监控'}</div>
        <Tag color={created ? 'green' : 'blue'} style={{ margin: 0, borderRadius: 999 }}>
          {created ? '已创建' : '待确认'}
        </Tag>
      </div>
      <div style={{ padding: 14, display: 'grid', gap: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
          {['识别监控意图', '确认监控条件', '触发后自动排查'].map((step, index) => (
            <div
              key={step}
              style={{
                borderRadius: 10,
                border: `1px solid ${index === 1 && !created ? c.accentBorder : c.borderFaint}`,
                background: index === 1 && !created ? c.accentBgFaint : '#fff',
                color: index === 1 && !created ? c.accent : c.textSecondary,
                padding: '8px 10px',
                fontSize: 12,
                fontWeight: 620,
              }}
            >
              {index + 1}. {step}
            </div>
          ))}
        </div>
        <div style={{ borderTop: `1px solid ${c.borderFaint}` }}>
          {conditions.map((item) => (
            <div
              key={item.label}
              style={{ display: 'grid', gridTemplateColumns: '92px minmax(0, 1fr)', gap: 10, padding: '9px 0', borderBottom: `1px solid ${c.borderFaint}`, fontSize: 13 }}
            >
              <span style={{ color: c.textMuted }}>{item.label}</span>
              <span style={{ color: c.textPrimary, fontWeight: 560, wordBreak: 'break-word' }}>{item.value}</span>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12, color: c.textSecondary, lineHeight: 1.7 }}>
          告警触发后会自动创建排查上下文，并携带项目、媒体、指标和阈值，不再要求用户重复补充。
        </div>
        <div>
          <button
            type="button"
            disabled={creating || created}
            onClick={createTask}
            style={{
              border: 'none',
              background: created ? c.success : c.accent,
              color: '#fff',
              borderRadius: 999,
              padding: '8px 14px',
              fontSize: 12,
              cursor: creating || created ? 'default' : 'pointer',
            }}
          >
            {created ? '监控任务已创建' : creating ? '正在创建...' : '确认并创建监控任务'}
          </button>
        </div>
      </div>
    </div>
  );
}

function MonitorInspectionFlowCard({ data }: { data: WorkflowCardData }) {
  const c = useThemeColors();
  const items = data.inspectionItems?.length ? data.inspectionItems : [
    { label: '消耗与预算', status: '待接入', detail: '等待智投报表 MCP 返回昨日投放概览。' },
    { label: '转化与回传', status: '待接入', detail: '等待回传链路 MCP 返回激活、注册、付费健康度。' },
    { label: '报表调度', status: '待接入', detail: '等待调度状态工具返回昨日报表完成情况。' },
  ];

  return (
    <div style={{ marginTop: 10, border: `1px solid ${c.borderFaint}`, borderRadius: 14, background: '#fff', overflow: 'hidden' }}>
      <div style={{ padding: '12px 14px', borderBottom: `1px solid ${c.borderFaint}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: c.textPrimary }}>{data.title || '投放异常巡检'}</div>
        <Tag color="blue" style={{ margin: 0, borderRadius: 999 }}>监控巡检</Tag>
      </div>
      <div style={{ padding: 14, display: 'grid', gap: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
          {['识别宽泛诉求', '执行监控检查', '异常后转排查'].map((step, index) => (
            <div
              key={step}
              style={{
                borderRadius: 10,
                border: `1px solid ${index === 1 ? c.accentBorder : c.borderFaint}`,
                background: index === 1 ? c.accentBgFaint : '#fff',
                color: index === 1 ? c.accent : c.textSecondary,
                padding: '8px 10px',
                fontSize: 12,
                fontWeight: 620,
              }}
            >
              {index + 1}. {step}
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gap: 8 }}>
          {items.map((item) => (
            <div
              key={item.label}
              style={{
                display: 'grid',
                gridTemplateColumns: '120px 76px minmax(0, 1fr)',
                gap: 10,
                alignItems: 'center',
                padding: '9px 0',
                borderBottom: `1px solid ${c.borderFaint}`,
                fontSize: 13,
              }}
            >
              <span style={{ color: c.textPrimary, fontWeight: 600 }}>{item.label}</span>
              <span style={{ color: item.status === '正常' ? c.success : c.textMuted, fontSize: 12 }}>{item.status}</span>
              <span style={{ color: c.textSecondary, wordBreak: 'break-word' }}>{item.detail}</span>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12, color: c.textSecondary, lineHeight: 1.7 }}>
          这是项目级巡检，不要求先填写具体异常指标。若巡检发现异常，会携带项目、时间、指标和来源自动进入排查；未发现异常时只返回监控结果。
        </div>
      </div>
    </div>
  );
}

function WorkflowProcessCard({
  data,
  onFollowUpClick,
  onSubmitFollowUp,
}: {
  data: WorkflowCardData;
  onFollowUpClick?: (text: string) => void;
  onSubmitFollowUp?: (content: string) => void;
}) {
  const c = useThemeColors();
  if (data.type === 'report_composer') {
    return <ReportComposerFlowCard data={data} />;
  }
  if (data.type === 'monitor_task') {
    return <MonitorTaskFlowCard data={data} />;
  }
  if (data.type === 'monitor_inspection') {
    return <MonitorInspectionFlowCard data={data} />;
  }
  const isDebug = data.type === 'legacy_media_debug';
  const [formOpen, setFormOpen] = useState(isDebug);
  const [submitted, setSubmitted] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({
    media: data.media || '',
    account: data.accountShared ? '已共享到 wuyanlan@dobest.com' : '',
  });
  const autoDebugChecks = Array.isArray(data.debugChecks) ? data.debugChecks : [];
  if (isDebug && data.status === 'auto_checked') {
    const checks = autoDebugChecks.length ? autoDebugChecks : [
      { label: '项目与媒体', status: '已确认', detail: `${data.projectContext || '当前项目'} / ${data.media || '巨量引擎'}` },
      { label: '应用共享', status: data.accountShared ? '通过' : '未通过', detail: data.accountShared ? '已共享到 wuyanlan@dobest.com' : '未检测到默认账号共享记录' },
      { label: '验收状态', status: '通过', detail: '联调配置满足当前媒体验收条件' },
      { label: '数据上报', status: '通过', detail: '数据上报 MCP 已查询到激活/注册记录' },
    ];
    const allPassed = checks.every((item) => item.status === '通过' || item.status === '已确认');
    return (
      <div style={{ marginTop: 10, borderRadius: 16, border: `1px solid ${c.borderFaint}`, background: c.bgCard, overflow: 'hidden' }}>
        <div style={{ padding: '12px 14px', borderBottom: `1px solid ${c.borderFaint}` }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: c.textPrimary }}>自动联调校验结果</div>
          <div style={{ marginTop: 4, fontSize: 12, color: c.textMuted, lineHeight: 1.6 }}>
            系统已根据项目、媒体和应用包完成前置校验，不需要用户再确认。
          </div>
        </div>
        <div style={{ padding: '12px 14px', display: 'grid', gap: 8 }}>
          {checks.map((item) => {
            const passed = item.status === '通过' || item.status === '已确认';
            return (
              <div key={item.label} style={{ display: 'grid', gridTemplateColumns: '94px 56px 1fr', gap: 8, alignItems: 'center', minHeight: 34, fontSize: 12 }}>
                <span style={{ color: c.textPrimary, fontWeight: 650 }}>{item.label}</span>
                <span style={{ color: passed ? c.success : '#b45309', fontWeight: 700 }}>{item.status}</span>
                <span style={{ color: c.textSecondary, lineHeight: 1.5 }}>{item.detail}</span>
              </div>
            );
          })}
          <div style={{ marginTop: 4, color: allPassed ? c.success : '#b45309', fontSize: 12, fontWeight: 700 }}>
            {allPassed ? '结论：前置条件通过，可发起自动联调。' : '结论：前置条件未通过，请先处理未通过项。'}
          </div>
        </div>
      </div>
    );
  }
  const requiredFields = isDebug
    ? ['媒体平台', '账号共享状态', '验证事件', '回传查看位置', '测试设备']
    : ['媒体名称', '对接文档', '监测链接参数', '回传事件', '验收方式'];
  const debugFieldKeys = ['media', 'account', 'event', 'resultView', 'device'];
  const hasMissingDebugField = isDebug && debugFieldKeys.some((key) => !drafts[key]?.trim());
  const submitDebug = () => {
    const summary = debugFieldKeys
      .map((key, index) => `${requiredFields[index]}=${drafts[key] || ''}`)
      .join('；');
    const prompt = `发起联调：${summary}`;
    if (onSubmitFollowUp) {
      onSubmitFollowUp(prompt);
      return;
    }
    onFollowUpClick?.(prompt);
  };

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
            ? '确认联调意图、联调能力、联调信息和联调条件后，再发起执行。'
            : '新增媒体必须先补齐依赖并通过表单校验，再进入创建链接或需求池流程。'}
        </div>
      </div>

      <div style={{ padding: '12px 14px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
          {[
            { label: '收集依赖', active: true },
            { label: isDebug ? '确认联调信息' : '表单校验', active: submitted || !hasMissingDebugField },
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
          <div style={{ marginTop: 12, borderRadius: 14, background: '#fff', padding: 12, border: `1px solid ${c.borderFaint}` }}>
            <div style={{ fontSize: 12, fontWeight: 650, color: c.textPrimary, marginBottom: 8 }}>
              {isDebug ? '联调确认表单' : '结构化表单'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
              {requiredFields.map((field, index) => {
                const key = isDebug ? debugFieldKeys[index] : field;
                return (
                <label key={field} style={{ display: 'grid', gap: 4, fontSize: 12, color: c.textSecondary }}>
                  {field}
                  <input
                    value={drafts[key] || ''}
                    onChange={(event) => setDrafts((prev) => ({ ...prev, [key]: event.target.value }))}
                    placeholder={isDebug && key === 'event' ? '如：激活、注册、付费' : `填写${field}`}
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
              );})}
            </div>
            {submitted && !isDebug && (
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
          {!isDebug && (
            <>
              <button
                type="button"
                onClick={() => setSubmitted(true)}
                style={{ border: 'none', background: c.accent, color: '#fff', borderRadius: 999, padding: '7px 12px', fontSize: 12, cursor: 'pointer' }}
              >
                提交并校验
              </button>
              <button
                type="button"
                onClick={() => onFollowUpClick?.('记录新增媒体对接为代办，并在右侧继续补齐资料')}
                style={{ border: `1px solid ${c.borderFaint}`, background: '#fff', color: c.textSecondary, borderRadius: 999, padding: '7px 12px', fontSize: 12, cursor: 'pointer' }}
              >
                记录到代办
              </button>
            </>
          )}
          <button
            type="button"
            disabled={isDebug && hasMissingDebugField}
            onClick={() => {
              if (isDebug) {
                setSubmitted(true);
                submitDebug();
                return;
              }
              onFollowUpClick?.('资料已补齐，继续创建监测链接');
            }}
            style={{
              border: `1px solid ${isDebug && hasMissingDebugField ? c.borderFaint : c.accentBorder}`,
              background: isDebug && hasMissingDebugField ? c.bgSection : c.accent,
              color: isDebug && hasMissingDebugField ? c.textMuted : '#fff',
              borderRadius: 999,
              padding: '7px 12px',
              fontSize: 12,
              cursor: isDebug && hasMissingDebugField ? 'not-allowed' : 'pointer',
            }}
          >
            {isDebug ? '发起联调' : '创建监测链接'}
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
  const displayContent = isAi ? stripInlineSourceSection(item.content) : item.content;
  const isLongMessage = displayContent.length > 760 || displayContent.split('\n').length > 12;
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
          {displayContent}
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
            padding: '2px 0',
            background: 'transparent',
            border: 'none',
            wordBreak: 'break-word',
            ...foldedStyle,
          }}
        >
          <MarkdownRenderer
            content={displayContent}
            codeStyle={codeStyle}
            showLineNumbers={showLineNumbers}
          />
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
          {displayContent}
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
            content={displayContent}
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
          {displayContent}
        </div>
      </div>
      {foldButton}
    </div>
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
    diagnosis: '数据排查',
    demand: '需求跟踪',
    debugging: '自动联调',
    monitoring: '监控任务',
    material: '素材分析',
    prediction: '预测分析',
    hub: '智投chat',
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
            <div style={{ fontSize: 13, fontWeight: 650, color: c.textPrimary }}>{name}</div>
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
  onSubmitFollowUp,
  contextThinkingSteps,
  currentResult,
  chatSettings,
  systemPrompt,
  onOpenAgentPanel,
}: ChatContainerProps) {
  const c = useThemeColors();
  const isMobile = useIsMobile();
  const { speak, stopSpeaking, synthesisSupported, speaking } = useSpeech();
  const { settings } = chatSettings;
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [panelCollapseToken, setPanelCollapseToken] = useState(0);
  const [editingMessage, setEditingMessage] = useState<BubbleItem | null>(null);
  const [editingDraft, setEditingDraft] = useState('');
  const [messageVersions, setMessageVersions] = useState<Record<string, { items: string[]; active: number }>>({});
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

  const handleOpenSourcePanel = useCallback((payload: SourcePanelPayload) => {
    setPanelCollapseToken((value) => value + 1);
    onOpenSourcePanel?.(payload);
  }, [onOpenSourcePanel]);

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

  const bubbleItems = useMemo<BubbleItem[]>(() => messages.map((msg, index) => {
    const workflowType = typeof msg.metadata?.workflow_card === 'object'
      ? (msg.metadata.workflow_card as { type?: string }).type
      : undefined;
    const suppressContextThinking = workflowType === 'legacy_media_debug';
    const processEvents = Array.isArray(msg.process_events)
      ? msg.process_events
      : Array.isArray(msg.metadata?.process_events)
        ? msg.metadata.process_events as NonNullable<Message['process_events']>
        : [];
    const processThinkingSteps = compactProcessThinkingSteps(processEvents);
    const workflowThinkingSteps = msg.role === 'assistant' ? getDebugThinkingStepsFromWorkflowResult(msg) : [];
    const processToolCalls = processEvents
      .map((event) => toolCallFromProcessEvent(event))
      .filter((event): event is NonNullable<ReturnType<typeof toolCallFromProcessEvent>> => Boolean(event));
    const ownThinkingSteps = Array.isArray(msg.thinking_steps) && msg.thinking_steps.length > 0
      ? msg.thinking_steps
      : processThinkingSteps.length > 0
        ? processThinkingSteps
        : workflowThinkingSteps.length > 0
          ? workflowThinkingSteps
          : msg.thinking
            ? [{ label: '模型思考', content: String(msg.thinking), status: 'completed' as const }]
            : [];
    const thinkingSteps = ownThinkingSteps.length > 0
      ? ownThinkingSteps
      : msg.role === 'assistant' && index === messages.length - 1 && !suppressContextThinking
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

    const messageKey = msg.message_id || msg.id || `msg-${index}`;
    const versionState = msg.role === 'user' ? messageVersions[messageKey] : undefined;
    const displayContent = versionState ? versionState.items[versionState.active] : (msg.content || '');

    return {
      key: messageKey,
      role: msg.role === 'assistant' ? 'ai' : 'user',
      kind,
      content: displayContent,
      thinkingSteps,
      toolCalls: msg.tool_calls || processToolCalls,
      missingFields: msg.missing_fields || [],
      messageId: messageKey,
      agent: msg.agent || (msg.routing_decision?.intent_type as string | undefined),
      rawMessage: msg,
    };
  }), [contextThinkingSteps, messageVersions, messages]);

  if (messages.length === 0 && !isTyping) {
    const starterGroups: Array<{
      title: string;
      items: Array<{
        label: string;
        description: string;
        prompt: string;
        agent: AgentType;
        disabled?: boolean;
      }>;
    }> = [
      {
        title: '包体检查 / 数据排查',
        items: [
          {
            label: '包体检查',
            description: '直接输出“已经通过我们检测、可以交付投放”的包',
            prompt: '获取当前项目下通过检测的可交付包，并告诉我哪些包已经可以交付投放',
            agent: 'demand',
          },
          {
            label: '数据排查',
            description: '操作异常排查、归因异常排查、回推异常排查、采集异常排查',
            prompt: '请帮我排查当前项目的数据异常，包含操作异常、归因异常、回推异常和采集异常',
            agent: 'diagnosis',
          },
        ],
      },
      {
        title: '效果分析 / 创意沉淀',
        items: [
          {
            label: '效果分析',
            description: '取数拼表、分析解读、用户洞察、广告预测',
            prompt: '请帮我做当前项目的效果分析，包括取数拼表、分析解读、用户洞察和广告预测',
            agent: 'material',
          },
          {
            label: '创意沉淀',
            description: '视频脚本解析、跨媒体汇总、跨项目沉淀',
            prompt: '请帮我整理当前项目的创意沉淀内容，包含视频脚本解析、跨媒体汇总和跨项目沉淀',
            agent: 'material',
          },
        ],
      },
      {
        title: '采集对接 / 使用帮助',
        items: [
          {
            label: '采集对接',
            description: '自动阅读文档、快速对接新媒体、快速集成行业数据',
            prompt: '请帮我阅读对接文档并推进当前项目的新媒体采集对接',
            agent: 'demand',
          },
          {
            label: '使用帮助',
            description: '出包规范、归因回推逻辑、指标解释、报表看数指引',
            prompt: '请帮我解释当前项目的使用帮助，包括出包规范、归因回推逻辑、指标解释和报表看数指引',
            agent: 'help',
          },
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
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginTop: isMobile ? 12 : 6, textAlign: 'center' }}>
            <img
              src="/zt-chat-logo-clean.png"
              alt="智投chat"
              style={{
                width: isMobile ? 96 : 118,
                height: 'auto',
                objectFit: 'contain',
              }}
            />
            <p style={{ margin: 0, maxWidth: 620, fontSize: 14, color: c.textSecondary, lineHeight: 1.75, fontWeight: 400 }}>
              欢迎使用智投chat，输入问题、需求或操作任务，我会按对话方式继续推进。
            </p>
          </div>

          <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr', gap: 14 }}>
            <section style={{ borderRadius: 16, background: '#f6f7f9', padding: 18, minHeight: 160 }}>
              <div style={{ fontSize: 16, fontWeight: 680, color: c.textPrimary }}>你可以直接这样问</div>
              <div style={{ marginTop: 14, display: 'grid', gap: 12 }}>
                {starterGroups.map((group) => (
                  <div
                    key={group.title}
                    style={{
                      background: '#fff',
                      border: `1px solid ${c.borderFaint}`,
                      borderRadius: 14,
                      padding: '14px 14px 10px',
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 650, color: c.textPrimary, marginBottom: 10 }}>
                      {group.title}
                    </div>
                    <div style={{ display: 'grid', gap: 8 }}>
                      {group.items.map((item) => {
                        const button = (
                          <button
                            key={item.label}
                            type="button"
                            disabled={item.disabled}
                            onClick={() => {
                              if (item.disabled) return;
                              onOpenAgentPanel?.(item.agent);
                              onFollowUpClick?.(item.prompt);
                            }}
                            style={{
                              width: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 12,
                              border: `1px solid ${c.borderFaint}`,
                              background: item.disabled ? '#f1f3f5' : '#fff',
                              borderRadius: 12,
                              padding: '10px 12px',
                              color: item.disabled ? c.textMuted : c.textPrimary,
                              cursor: item.disabled ? 'not-allowed' : 'pointer',
                              fontSize: 13,
                              textAlign: 'left',
                            }}
                          >
                            <span style={{ minWidth: 66, fontWeight: 650, flexShrink: 0 }}>{item.label}</span>
                            <span style={{ flex: 1, color: c.textSecondary, lineHeight: 1.5 }}>{item.description}</span>
                          </button>
                        );
                        return item.disabled ? <Tooltip key={item.label} title="规划中">{button}</Tooltip> : button;
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
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

        {bubbleItems.map((item, itemIndex) => {
          const isAi = item.role === 'ai';
          const showAgentTag = isAi && item.agent && item.kind !== 'system';
          const showActions = item.kind !== 'system';
          const sourceRefs = isAi ? collectSourceRefs(item.rawMessage) : [];
          const capabilities = isAi ? collectCapabilities(item.rawMessage) : [];
          const debugProcessPayload = isAi ? getDebugProcessPayload(item.rawMessage) : null;
          const workflowCard = isAi ? getWorkflowCard(item.rawMessage) : null;
          const metricExplainerSchema = isAi
            ? getMetricExplainerSchema(item.rawMessage)
            : null;
          const handleMetricAction = (action: MetricAction) => {
            onFollowUpClick?.(`请继续处理：${action.label}`);
          };
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
              onClick: () => handleOpenSourcePanel({ message: item.rawMessage }),
            },
            {
              key: 'save-kb',
              label: '保存到个人知识库',
              icon: <IconAsset name="share-plane" size={14} />,
              onClick: () => handleSaveToKnowledge(item.rawMessage),
            },
            {
              key: 'share-xiaoshan',
              label: '分享到小闪',
              icon: <IconAsset name="share-plane" size={14} />,
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
                        {workflowCard?.type === 'report_composer' ? '报表任务' : getAgentDisplayName(item.agent)}
                      </Tag>
                    </div>
                  )}

                  {isAi && item.thinkingSteps.length > 0 && (
                    <ThinkingChain
                      steps={item.thinkingSteps}
                      toolCalls={item.toolCalls}
                      codeStyle={settings.codeStyle}
                      showLineNumbers={settings.codeLineNumbers}
                      title="思维链"
                      defaultExpanded={!settings.autoCollapseThinking}
                      collapseToken={panelCollapseToken}
                    />
                  )}

                  {isAi && debugProcessPayload && (
                    <DebugProcessStrip payload={debugProcessPayload} collapseToken={panelCollapseToken} />
                  )}

                  {isAi && item.kind === 'assistant' && (capabilities.length > 0 || sourceRefs.length > 0) && (
                    <UnifiedEvidenceStrip
                      capabilities={capabilities}
                      refs={sourceRefs}
                      onOpenCapability={(capability) => handleOpenSourcePanel({ message: item.rawMessage, capability })}
                      onOpenSource={(source) => handleOpenSourcePanel({ message: item.rawMessage, source })}
                    />
                  )}

                  {isAi && metricExplainerSchema && (
                    <MetricExplainerRenderer
                      schema={metricExplainerSchema}
                      onAction={handleMetricAction}
                    />
                  )}

                  <MessageSurface
                    item={item}
                    codeStyle={settings.codeStyle}
                    showLineNumbers={settings.codeLineNumbers}
                  />

                  {isAi && workflowCard && workflowCard.type !== 'legacy_media_debug' && (
                    <WorkflowProcessCard
                      data={workflowCard}
                      onFollowUpClick={onFollowUpClick}
                      onSubmitFollowUp={onSubmitFollowUp}
                    />
                  )}

                  {false && isAi && item.kind === 'assistant' && (
                    <SourceReferenceStrip
                      refs={sourceRefs}
                      onOpen={(source) => handleOpenSourcePanel({ message: item.rawMessage, source })}
                    />
                  )}

                  <MissingFieldPanel
                    fields={item.missingFields}
                    onClick={(field, value) => {
                      if (!value) {
                        onFollowUpClick?.(field.suggested_question);
                        return;
                      }
                      const payload = value.includes('=') ? value : `${field.field_label}=${value}`;
                      const previousUserMessage = [...bubbleItems.slice(0, itemIndex)]
                        .reverse()
                        .find((candidate) => candidate.role === 'user')?.content;
                      const nextQuestion = [
                        previousUserMessage || '请继续排查当前问题',
                        `已补充排查条件：${payload}`,
                        '请结合原问题和已补充条件继续排查。',
                      ].join('\n\n');
                      if (onSubmitFollowUp) {
                        onSubmitFollowUp(nextQuestion);
                        return;
                      }
                      onFollowUpClick?.(nextQuestion);
                    }}
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
                            onClick={() => openUserMessageEditor(item)}
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
                        ‹
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
                        ›
                      </button>
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
    <Modal
      open={!!editingMessage}
      title="编辑消息"
      okText="重新发送"
      cancelText="取消"
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


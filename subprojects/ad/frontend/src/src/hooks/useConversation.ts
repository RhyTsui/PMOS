'use client';

import { useState, useCallback, useRef, useEffect, useMemo, type SetStateAction } from 'react';
import { flushSync } from 'react-dom';
import { useAgent } from './useAgent';
import { xiaoqiaoApi } from '@/lib/api';
import { routeUserIntent } from '@/lib/intent-router';
import { thinkingStepFromProcessEvent, toolCallFromProcessEvent } from '@/lib/agent-runtime';
import { buildBusinessContextSnapshot } from '@/lib/conversation-context';
import { resolveSlots } from '@/lib/slot-resolver';
import { decodeReportActionEnvelope } from '@/lib/report-action-envelope';
import { resolveChatAnswerMessage } from '@/lib/chat-answer-message-catalog';
import type {
  AgentProcessEvent,
  CallChainData,
  Conversation,
  IntentType,
  AgentType,
  DebugAutomationTask,
  Message,
  MessageType,
  MemoryEntry,
  ProjectBinding,
} from '@/types';

let messageCounter = 0;
function nextMessageId(): string {
  messageCounter += 1;
  return `msg_${messageCounter}`;
}

type DebugCarryMemory = {
  intent?: string;
  media?: string;
  app?: string;
  updated_at?: string;
};

type ProjectLoadStatus = 'loading' | 'ready' | 'failed';

type CurrentProjectMetadata = {
  appId?: string | number;
  appName?: string;
  appAlias?: string;
  source?: string;
  selectedAt?: string;
};

type SendMessageOptions = {
  projectContext?: string;
  currentProject?: CurrentProjectMetadata | null;
  projectLoadStatus?: ProjectLoadStatus;
  attachmentIds?: string[];
};

const MEMORY_USER_ID = 'user-001';
const DEBUG_MEMORY_KEY = 'zhitou-chat-debug-context';

function extractAppIdFromProjectContext(projectContext?: string): string {
  return /(?:APPID|appId|app_id|project_id|projectId|应用ID|项目ID)[:：=\s]+([A-Za-z0-9_-]+)/i.exec(projectContext || '')?.[1] || '';
}

function buildProjectContextDebug(options?: SendMessageOptions) {
  const projectContext = options?.projectContext || '';
  const projectContextAppId = extractAppIdFromProjectContext(projectContext);
  const currentProjectAppId = options?.currentProject?.appId ? String(options.currentProject.appId) : '';
  return {
    projectLoadStatus: options?.projectLoadStatus,
    selectedProject: options?.currentProject ? {
      appId: options.currentProject.appId,
      appName: options.currentProject.appName,
    } : null,
    projectContextTextEmpty: !projectContext.trim(),
    metadataProjectContextPresent: Boolean(projectContext.trim()),
    warnings: projectContextAppId && currentProjectAppId && projectContextAppId !== currentProjectAppId
      ? [`currentProject.appId(${currentProjectAppId}) 与 projectContext(${projectContextAppId}) 不一致，后端仍按原 projectContext 链路解析。`]
      : [],
  };
}

function parseDebugMemory(entry?: Pick<MemoryEntry, 'content'> | null): DebugCarryMemory {
  if (!entry?.content) return {};
  try {
    return JSON.parse(entry.content) as DebugCarryMemory;
  } catch {
    return {};
  }
}

async function fetchDebugMemory(): Promise<DebugCarryMemory> {
  if (typeof window === 'undefined') return {};
  try {
    const response = await fetch(`/api/xiaoqiao/memory?user_id=${MEMORY_USER_ID}&memory_type=context&business_domain=debugging`, {
      cache: 'no-store',
    });
    if (!response.ok) return {};
    const memories = await response.json() as MemoryEntry[];
    return parseDebugMemory(memories.find(item => item.keywords.includes(DEBUG_MEMORY_KEY)) || memories[0]);
  } catch {
    return {};
  }
}

async function persistDebugMemory(memory: DebugCarryMemory, sourceConversationId?: string): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    await fetch('/api/xiaoqiao/memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: DEBUG_MEMORY_KEY,
        user_id: MEMORY_USER_ID,
        content: JSON.stringify(memory),
        memory_type: 'context',
        source: 'auto_extract',
        source_conversation_id: sourceConversationId,
        keywords: [DEBUG_MEMORY_KEY, 'debugging', 'auto_debug', memory.media, memory.app].filter(Boolean),
        business_domain: 'debugging',
        importance: 4,
      }),
    });
  } catch {
    // Memory persistence must not block the main chat flow.
  }
}

function intentToAgent(intent: IntentType): AgentType {
  const mapping: Partial<Record<IntentType, AgentType>> = {
    help: 'help',
    report_query: 'report',
    demand: 'demand',
    diagnosis: 'diagnosis',
    debugging: 'debugging',
    get_delivery_packages: 'delivery',
    monitor: 'monitoring',
    forecast: 'prediction',
    general: 'hub',
  };
  return mapping[intent] ?? 'hub';
}

function detectIntent(content: string): {
  intent_type: IntentType;
  is_business_related: boolean;
  workflow_level: 'light' | 'heavy';
} {
  void content;
  return { intent_type: 'report_query', is_business_related: true, workflow_level: 'light' };
}

function isMediaDemand(content: string): boolean {
  void content;
  return false;
}

function isDebugExecutionStart(content: string): boolean {
  void content;
  return false;
}

function isReportComposerIntent(content: string): boolean {
  void content;
  return false;
}

function workflowCardFromProcessEvents(events: AgentProcessEvent[]): Record<string, unknown> | undefined {
  void events;
  return undefined;
}

function extractProjectContext(content: string): string {
  const readableMatched = content.match(/\[项目上下文\]\s*([\s\S]*)$/);
  if (readableMatched?.[1]?.trim()) return readableMatched[1].trim();
  const matched = content.match(/\[项目上下文\]\s*([\s\S]*)$/);
  return matched?.[1]?.trim() || '使用顶部项目选择器中的当前项目范围';
}

function extractProjectNameFromContext(content: string): string {
  const readableContextName = /项目范围：([^(\n]+)/.exec(content)?.[1]?.trim();
  if (readableContextName && readableContextName !== '全部项目' && readableContextName !== '未选择项目') return readableContextName;
  const contextName = /项目范围：([^(\n]+)/.exec(content)?.[1]?.trim();
  if (contextName && contextName !== '全部项目') return contextName;
  return '';
}

function extractDebugAppName(content: string): string {
  const readableContextName = /项目范围：([^(\n]+)/.exec(content)?.[1]?.trim();
  if (readableContextName && readableContextName !== '全部项目' && readableContextName !== '未选择项目') {
    return readableContextName;
  }
  const readableBeforeContext = content.split('[项目上下文]')[0] || content;
  const readableTarget = /(?:联调|自动联调)\s*([\u4e00-\u9fa5A-Za-z0-9:_-]{2,}?)(?=\s*(?:安卓|Android|android|iOS|ios|苹果|鸿蒙|Harmony|app|APP|巨量|穿山甲|抖音|今日头条|快手|腾讯|广点通|$))/i.exec(readableBeforeContext)?.[1]?.trim();
  if (readableTarget && !/^(一个|看看|立即|开始|发起)$/.test(readableTarget)) return readableTarget;
  const readableReverseTarget = /([\u4e00-\u9fa5A-Za-z0-9:_-]{2,}?)(?=\s*(?:安卓|Android|android|iOS|ios|苹果|鸿蒙|Harmony)?\s*(?:巨量|穿山甲|抖音|今日头条|快手|腾讯|广点通)\s*(?:联调|测试|验证|调试))/i.exec(readableBeforeContext)?.[1]?.trim();
  if (readableReverseTarget && !/^(请|帮我|我要|开始|发起|看下)$/.test(readableReverseTarget)) return readableReverseTarget;
  const currentApp = /当前应用=([^\n]+)/.exec(content)?.[1]?.trim();
  if (currentApp) return currentApp;

  const beforeContext = content.split('[项目上下文]')[0] || content;
  const debugTarget = /(?:联调|自动联调)\s*([\u4e00-\u9fa5A-Za-z0-9:_-]{2,}?)(?=\s*(?:安卓|Android|android|iOS|ios|苹果|app|APP|巨量|穿山甲|抖音|今日头条|快手|腾讯|广点通|$))/i.exec(beforeContext)?.[1]?.trim();
  if (debugTarget && !/^(一下|看看|立即|开始|发起)$/.test(debugTarget)) return debugTarget;

  const switchTarget = /(?:换成|换|改成|改为|改)\s*([\u4e00-\u9fa5A-Za-z0-9:_-]{2,}?)(?=\s*(?:安卓|Android|android|iOS|ios|苹果|app|APP|吧|，|,|。|$))/i.exec(beforeContext)?.[1]?.trim();
  if (switchTarget) return switchTarget;

  const appId = /appid[:：\s]*([0-9]+)/i.exec(content)?.[1];
  if (appId) return appId;

  return extractProjectNameFromContext(content);
}

function extractDebugCarryContext(messages: Message[], persistedMemory?: DebugCarryMemory) {
  const recent = messages.slice(-8).reverse();
  const text = recent.map(item => item.content || '').join('\n');
  let memory: { intent?: string; media?: string; app?: string } = {};
  try {
    memory = typeof window !== 'undefined' ? JSON.parse(window.localStorage.getItem('zhitou-chat-user-memory') || '{}') : {};
  } catch {
    memory = {};
  }
  memory = { ...memory, ...persistedMemory };
  const hasDebugContext = recent.some(item => item.intent_type === 'debugging' || item.agent === 'debugging') || /联调|自动联调|扫码|回传验证/i.test(text) || memory.intent === 'debugging';
  const media = /巨量|穿山甲|抖音|今日头条/i.test(text) ? '巨量引擎' : /快手/i.test(text) ? '快手' : /广点通|腾讯/i.test(text) ? '广点通' : '已有媒体';
  const previousApp = extractDebugAppName(text) || memory.app || '';
  return { hasDebugContext, media: media === '已有媒体' && memory.media ? memory.media : media, previousApp };
}

function extractCurrentAppSwitch(content: string) {
  const app = extractDebugAppName(content);
  if (!app) return null;
  const platform = /ios|iOS|苹果/i.test(content) ? 'iOS' : /安卓|Android|android/i.test(content) ? 'Android' : '';
  return { app, platform };
}

function enrichWithConversationContext(content: string, messages: Message[], persistedMemory?: DebugCarryMemory) {
  const trimmed = content.trim();
  const carry = extractDebugCarryContext(messages, persistedMemory);
  const appSwitch = extractCurrentAppSwitch(trimmed);
  const isEllipticalSwitch = /(换|改|还是|这个|那个|安卓|Android|iOS|ios|app|APP)/i.test(trimmed) && !/(联调|排查|监控|报表|对接)/i.test(trimmed);
  if (!carry.hasDebugContext || !appSwitch || !isEllipticalSwitch) {
    return trimmed;
  }
  const withDebugContext = [
    trimmed,
    '',
    '[多轮上下文]',
    '上一轮意图=自动联调',
    `沿用媒体=${carry.media}`,
    `上一轮应用=${carry.previousApp || '未明确'}`,
    `当前应用=${appSwitch.app}`,
    `当前终端=${appSwitch.platform || '沿用上一轮'}`,
    '系统动作=继续自动联调前置校验，切换应用后重新确认项目、媒体、应用共享、验收状态和数据上报记录',
  ].join('\n');
  return withDebugContext;
}

function extractDebugMemoryFromContent(content: string): DebugCarryMemory | null {
  const media = /巨量|穿山甲|抖音|今日头条|巨量引擎/i.test(content) ? '巨量引擎' : /快手/i.test(content) ? '快手' : /广点通|腾讯/i.test(content) ? '广点通' : '';
  const app = extractDebugAppName(content);
  if (!/联调|自动联调|\[多轮上下文\]/i.test(content) && !app) return null;
  return {
    intent: 'debugging',
    media,
    app,
    updated_at: new Date().toISOString(),
  };
}

function rememberDebugContext(content: string, sourceConversationId?: string) {
  if (typeof window === 'undefined') return;
  const extracted = extractDebugMemoryFromContent(content);
  if (!extracted) return;
  try {
    const previous = JSON.parse(window.localStorage.getItem('zhitou-chat-user-memory') || '{}');
    const next = {
      ...previous,
      intent: 'debugging',
      media: extracted.media || previous.media,
      app: extracted.app || previous.app,
      updated_at: extracted.updated_at,
    };
    window.localStorage.setItem('zhitou-chat-user-memory', JSON.stringify(next));
    void persistDebugMemory(next, sourceConversationId);
  } catch {
    // localStorage 不可用时不影响会话主流程。
  }
}

function buildMonitorTaskMessage(convId: string, content: string): Message {
  const id = nextMessageId();
  const projectContext = extractProjectContext(content);
  const thresholdMatch = content.match(/超过\s*(\d+)\s*分钟/) || content.match(/(\d+)\s*分钟/);
  const thresholdMinutes = thresholdMatch?.[1] || '30';
  const media = /巨量|穿山甲|抖音/i.test(content) ? '巨量' : '待确认媒体';
  return {
    id,
    message_id: id,
    conversation_id: convId,
    role: 'assistant',
    message_type: 'assistant_reply' as MessageType,
    created_at: new Date().toISOString(),
    timestamp: Date.now(),
    agent: 'monitoring',
    intent_type: 'monitor',
    content: [
      '## 回传延迟监控任务确认',
      '',
      '已识别为监控任务，不是数据排查。监控触发异常后会自动进入排查流程。',
      '',
      '请确认下面的监控条件，确认后我会创建任务。'
    ].join('\n'),
    thinking_steps: [
      {
        key: 'intent_route',
        label: '意图推理',
        content: '先判断用户目标是持续监控与告警，而不是立即排查一次异常。',
        status: 'completed',
        duration_ms: 420,
        input: { message: content.replace(/\[项目上下文\][\s\S]*$/, '').trim() },
        output: { intent: 'monitor', agent: 'monitoring', confidence: 'high' },
      },
      {
        key: 'context_prepare',
        label: '上下文准备',
        content: '读取顶部项目选择器中的项目范围，优先使用 APPID / 项目名称作为全局上下文。',
        status: 'completed',
        duration_ms: 360,
        input: { project_context: projectContext },
        output: { project_scope: projectContext },
      },
      {
        key: 'capability_check',
        label: '能力检查',
        content: '确认可以用监控任务 Skill 承接定时检查，并在告警触发时调用排查 Agent。',
        status: 'completed',
        duration_ms: 510,
        input: { required_capabilities: ['监控任务 Skill', '监控配置 MCP', '排查 Agent'] },
        output: { available: true, missing: [] },
      },
      {
        key: 'parameter_extract',
        label: '参数提取',
        content: '提取媒体、监控指标和阈值；通知方式暂按站内告警创建。',
        status: 'completed',
        duration_ms: 390,
        input: { text: content },
        output: { media, metric: '回传延迟', threshold_minutes: Number(thresholdMinutes), notify: '站内告警' },
      },
      {
        key: 'workflow_ready',
        label: '等待确认',
        content: '依赖用户确认一次后创建监控任务；后续异常由任务自动触发排查。',
        status: 'completed',
        duration_ms: 230,
      },
    ],
    tool_calls: [
      {
        name: 'callback_latency_monitor_skill',
        kind: 'skill',
        display_name: '回传延迟监控 Skill',
        arguments: JSON.stringify({ media, metric: 'callback_latency', threshold_minutes: Number(thresholdMinutes), auto_diagnosis: true }),
        result: '能力可用，等待用户确认创建任务',
        status: 'done',
        step_key: 'capability_check',
      },
      {
        name: 'monitoring_task_mcp',
        kind: 'mcp',
        display_name: '监控任务 MCP',
        arguments: JSON.stringify({ project_scope: projectContext, schedule: '每 5 分钟检查一次', alert_when: `回传延迟超过 ${thresholdMinutes} 分钟` }),
        result: '参数已准备，尚未提交创建',
        status: 'done',
        step_key: 'parameter_extract',
      },
    ],
    metadata: {
      workflow_card: {
        type: 'monitor_task',
        status: 'ready_to_create',
        title: `${media}回传延迟监控`,
        sourceText: content,
        media,
        metric: '回传延迟',
        threshold: `${thresholdMinutes} 分钟`,
        projectContext,
        notifyTarget: '站内告警',
      },
    },
  };
}

function buildBroadInspectionMessage(convId: string, content: string): Message {
  const id = nextMessageId();
  const projectContext = extractProjectContext(content);
  const timeRange = /昨天|昨日/i.test(content) ? '昨天' : /今天|今日/i.test(content) ? '今天' : '当前选择时间';
  return {
    id,
    message_id: id,
    conversation_id: convId,
    role: 'assistant',
    message_type: 'assistant_reply' as MessageType,
    created_at: new Date().toISOString(),
    timestamp: Date.now(),
    agent: 'monitoring',
    intent_type: 'monitor',
    content: [
      '## 投放异常巡检',
      '',
      '已识别为监控巡检诉求，我会先执行项目投放巡检，不提前要求填写对比数据源。',
      '',
      '巡检发现具体异常后，会携带项目、时间、指标和来源自动进入对应排查；未发现异常时只返回监控结果。'
    ].join('\n'),
    thinking_steps: [
      {
        key: 'intent_route',
        label: '意图推理',
        content: '用户询问“投放有什么异常”，属于宽泛巡检诉求；不是已经定位到某个指标差异的排查诉求。',
        status: 'completed',
        duration_ms: 380,
        input: { message: content.replace(/\[项目上下文\][\s\S]*$/, '').trim() },
        output: { intent: 'monitor', agent: 'monitoring', route: 'project_inspection_first' },
      },
      {
        key: 'context_prepare',
        label: '上下文准备',
        content: '读取全局项目范围，并把时间范围解析为昨日投放巡检。',
        status: 'completed',
        duration_ms: 320,
        input: { project_context: projectContext, time_range: timeRange },
        output: { project_scope: projectContext, time_range: timeRange },
      },
      {
        key: 'capability_check',
        label: '能力检查',
        content: '确认可以通过项目健康巡检 Skill 串联智投报表 MCP、回传链路 MCP、报表调度 MCP 和排查 Agent。',
        status: 'completed',
        duration_ms: 470,
        input: { required_capabilities: ['项目健康巡检 Skill', '智投实时报表 MCP', '回传链路 MCP', '报表调度 MCP', '排查 Agent'] },
        output: { route_ready: true, realtime_report_permission: 'granted', diagnosis_required: false },
      },
      {
        key: 'baseline_rule_prepare',
        label: '内置规则准备',
        content: '监控巡检不要求用户先填写异常表现和对比基准，系统先套用内置异常规则。',
        status: 'completed',
        duration_ms: 360,
        output: {
          abnormal_features: ['指标为 0', '消耗突增', '消耗突降', '预算撞线', '回传延迟', '成功率下降', '调度未完成', '入库缺失'],
          baselines: ['实时值 vs 昨日完成值', '当前时段 vs 近 7 日同周期均值', '媒体侧 vs 智投报表', '调度完成状态 vs 应完成状态'],
          hard_rules: ['有投放账户且可见时，消耗、激活、注册、付费等关键指标不能异常为 0'],
        },
      },
      {
        key: 'spend_budget_check',
        label: '消耗与预算巡检',
        content: '检查消耗突增、突降、预算撞线和账户授权可见性，先判断是否存在投放或取数侧异常。',
        status: 'completed',
        duration_ms: 520,
        input: {
          project_scope: projectContext,
          time_range: timeRange,
          report_access: 'direct_realtime_report_mcp',
          metrics: ['spend', 'budget_usage', 'account_visibility'],
          baseline: ['近 7 日同周期均值', '昨日完成值', '账户可见性'],
        },
        output: { checks: ['消耗为 0', '消耗突增', '消耗突降', '预算撞线', '账户授权可见性'], abnormal_found: 'pending_real_data' },
      },
      {
        key: 'conversion_postback_check',
        label: '转化与回传巡检',
        content: '检查激活、注册、付费、回传延迟和回传成功率，确认是否需要进入回传或归因排查。',
        status: 'completed',
        duration_ms: 610,
        input: {
          project_scope: projectContext,
          time_range: timeRange,
          report_access: 'direct_realtime_report_mcp',
          metrics: ['activation', 'register', 'payment', 'postback_delay', 'postback_success_rate'],
          baseline: ['媒体侧转化', 'BI 转化', '近 7 日同周期均值', '成功率阈值'],
        },
        output: { checks: ['激活为 0', '注册为 0', '付费为 0', '回传延迟', '回传成功率下降'], abnormal_found: 'pending_real_data' },
      },
      {
        key: 'schedule_ingestion_check',
        label: '调度与入库巡检',
        content: '检查昨日报表是否完成调度和入库，避免把数据未完成刷新误判为业务异常。',
        status: 'completed',
        duration_ms: 480,
        input: { project_scope: projectContext, time_range: timeRange, checks: ['schedule_finished', 'warehouse_ingested'] },
        output: { checks: ['报表调度完成状态', '报表入库状态'], abnormal_found: 'pending_real_data' },
      },
      {
        key: 'result_gate',
        label: '异常后转排查',
        content: '如果巡检发现异常，自动携带项目、时间、指标和来源进入对应排查；未发现异常时只输出监控结果。',
        status: 'completed',
        duration_ms: 300,
        output: {
          no_abnormal_next: 'return_monitor_result',
          abnormal_next: 'route_to_diagnosis_with_project_time_metric_source',
          no_early_clarification: true,
        },
      },
    ],
    tool_calls: [
      {
        name: 'project_health_check_skill',
        kind: 'skill',
        display_name: '项目健康巡检 Skill',
        arguments: JSON.stringify({
          project_scope: projectContext,
          time_range: timeRange,
          mode: 'ad_anomaly_inspection',
          realtime_report_permission: 'granted',
          checks: ['spend_budget', 'conversion_postback', 'schedule_ingestion', 'diagnosis_gate'],
          builtin_rules: ['critical_metric_not_zero', 'spend_spike_drop', 'budget_limit_hit', 'postback_delay', 'postback_success_rate_drop', 'schedule_ingestion_required'],
        }),
        result: '已进入投放异常巡检流程，先巡检后分流',
        status: 'done',
        step_key: 'capability_check',
      },
      {
        name: 'ad_realtime_report_mcp',
        kind: 'report_mcp',
        display_name: '智投实时报表 MCP',
        arguments: JSON.stringify({
          project_scope: projectContext,
          time_range: timeRange,
          permission: 'granted',
          access_mode: 'direct',
          metrics: ['spend', 'budget_usage', 'account_visibility'],
          baseline: ['realtime_vs_yesterday_final', 'current_slot_vs_7d_same_slot_avg'],
          anomaly_checks: ['spend_zero', 'spend_spike', 'spend_drop', 'budget_limit_hit', 'permission_visibility'],
        }),
        result: '当前具备实时报表直连调用权限，用于检查消耗为 0、突增、突降、预算撞线和账户授权可见性',
        status: 'done',
        step_key: 'spend_budget_check',
      },
      {
        name: 'conversion_postback_mcp',
        kind: 'mcp',
        display_name: '转化与回传链路 MCP',
        arguments: JSON.stringify({
          project_scope: projectContext,
          time_range: timeRange,
          metrics: ['activation', 'register', 'payment', 'postback_delay', 'postback_success_rate'],
          baseline: ['media_vs_bi', 'current_slot_vs_7d_same_slot_avg'],
          hard_rules: ['activation_not_zero_when_spend_exists', 'register_not_zero_when_activation_exists'],
        }),
        result: '用于检查激活、注册、付费、回传延迟和回传成功率',
        status: 'done',
        step_key: 'conversion_postback_check',
      },
      {
        name: 'schedule_status_mcp',
        kind: 'mcp',
        display_name: '报表调度与入库 MCP',
        arguments: JSON.stringify({ project_scope: projectContext, time_range: timeRange, checks: ['schedule_finished', 'warehouse_ingested'] }),
        result: '用于确认昨日报表是否已完成调度和入库',
        status: 'done',
        step_key: 'schedule_ingestion_check',
      },
      {
        name: 'diagnosis_router',
        kind: 'agent',
        display_name: '异常后转排查',
        arguments: JSON.stringify({
          trigger_when: 'inspection_abnormal_found',
          carry_context: ['project', 'time_range', 'metric', 'source'],
          skip_fields: ['compare_source_before_inspection'],
        }),
        result: '巡检发现具体异常后再进入对应排查，未发现异常只返回监控结果',
        status: 'done',
        step_key: 'result_gate',
      },
    ],
    metadata: {
      workflow_card: {
        type: 'monitor_inspection',
        status: 'inspection_ready',
        title: `${timeRange}投放异常巡检`,
        sourceText: content,
        projectContext,
        inspectionItems: [
          { label: '直连权限', status: '已确认', detail: '当前具备智投实时报表数据直连调用权限，巡检时直接调用报表 MCP。' },
          { label: '内置规则', status: '已启用', detail: '默认检查异常为 0、突增、突降、预算撞线、回传延迟、成功率下降、调度和入库缺失。' },
          { label: '对比基准', status: '已内置', detail: '默认使用实时值、昨日完成值、近 7 日同周期均值、媒体侧与智投报表对比。' },
          { label: '消耗与预算', status: '巡检中', detail: '检查消耗突增、突降、预算撞线和账户授权可见性。' },
          { label: '转化与回传', status: '巡检中', detail: '检查激活、注册、付费、回传延迟和回传成功率。' },
          { label: '调度与入库', status: '巡检中', detail: '检查昨日报表是否已完成调度和入库。' },
          { label: '异常后转排查', status: '待分流', detail: '发现具体异常后携带项目、时间、指标和来源进入对应排查；未发现异常只返回监控结果。' },
        ],
      },
      process_events: [
        { id: `${id}-evt-1`, type: 'intent.detected', label: '识别监控巡检意图', status: 'success', summary: '宽泛投放异常问题先走监控巡检，不先追问对比数据源。', started_at: new Date().toISOString(), completed_at: new Date().toISOString(), duration_ms: 380, visibility: 'user' },
        { id: `${id}-evt-2`, type: 'skill.step', label: '启用内置异常规则', status: 'success', summary: '内置异常表现和对比基准，不要求用户先填写。', started_at: new Date().toISOString(), completed_at: new Date().toISOString(), duration_ms: 360, visibility: 'user' },
        { id: `${id}-evt-3`, type: 'mcp.tool_result', label: '读取智投实时报表与回传状态', status: 'success', summary: '已确认报表直连权限，准备检查为 0、突增/突降、预算撞线、激活注册付费、回传延迟和成功率。', started_at: new Date().toISOString(), completed_at: new Date().toISOString(), duration_ms: 610, visibility: 'user' },
        { id: `${id}-evt-4`, type: 'model.step', label: '异常后转排查', status: 'success', summary: '有异常则带上下文进入排查；无异常则返回监控结果。', started_at: new Date().toISOString(), completed_at: new Date().toISOString(), duration_ms: 300, visibility: 'user' },
      ],
    },
  };
}

function buildReportComposerMessage(convId: string, content: string): Message {
  const id = nextMessageId();
  return {
    id,
    message_id: id,
    conversation_id: convId,
    role: 'assistant',
    message_type: 'assistant_reply' as MessageType,
    created_at: new Date().toISOString(),
    timestamp: Date.now(),
    agent: 'help',
    intent_type: 'help',
    content: [
      '## 广告消耗日报模板确认',
      '',
      '我已完成任务识别和能力检查。这是报表任务，不是监控告警任务。请先确认模板，确认后我会立即查询数据。',
    ].join('\n'),
    thinking_steps: [
      {
        label: '意图推理',
        content: '识别为“广告消耗日报生成 + 每天 10:00 定时发送”，属于报表任务，不属于监控告警任务。',
        status: 'completed',
      },
      {
        label: '能力检查',
        content: '日报生成 Skill、智投报表 MCP、定时任务接口均可承接；当前不需要知识库检索。',
        status: 'completed',
      },
      {
        label: '参数提取',
        content: '指标=消耗；维度=日期、媒体、账户；频率=每天；发送时间=10:00。',
        status: 'completed',
      },
      {
        label: '生成模板',
        content: '已生成 Excel 风格报表模板，等待用户确认后查询数据。',
        status: 'completed',
      },
    ],
    tool_calls: [
      {
        name: '日报生成 Skill',
        kind: 'skill',
        display_name: '日报生成',
        arguments: JSON.stringify({ task: '确认是否可生成广告消耗日报并创建定时任务' }),
        result: '可承接',
        status: 'done',
      },
      {
        name: '智投报表 MCP',
        kind: 'report_mcp',
        display_name: '智投报表',
        arguments: JSON.stringify({ metric: '消耗', action: '检查报表查询能力' }),
        result: '消耗指标可查询',
        status: 'done',
      },
    ],
    metadata: {
      workflow_card: {
        type: 'report_composer',
        status: 'template_review',
        title: '广告消耗日报',
        sourceText: content,
        intakeModes: ['截图提取模板', '上传 Excel 模板', '手动输入模板', '指定系统页面'],
        template: {
          name: '广告消耗日报',
          metrics: ['消耗'],
          dimensions: ['日期', '媒体', '账户'],
          timeRange: '每天生成前一日数据',
          frequency: '每天',
          deliveryTime: '10:00',
          deliveryTargets: ['小闪'],
        },
        metricIssues: [],
        dataPreview: {
          columns: ['日期', '媒体', '账户', '消耗', '数据来源', '状态'],
          rows: [
            {
              日期: '前一日',
              媒体: '全部',
              账户: '全部',
              消耗: '',
              数据来源: '',
              状态: '',
            },
          ],
        },
      },
    },
  };
}

function buildAutomationTaskMessage(convId: string, content: string): Message {
  const id = nextMessageId();
  const isWeekly = /周报|每周|周一/i.test(content);
  const isMonthly = /月报|每月/i.test(content);
  const isGameDaily = /日报|每日|每天|游戏项目|项目日报/i.test(content) && !isWeekly && !isMonthly;
  const metrics = isGameDaily
    ? ['消耗', '现金消耗', '激活数', '注册数', '注册率', '激活成本', '注册成本', '次留率', '首日新充人数', '首日新充金额', '首日付费率', '首日ARPPU', '首日ROI', 'iOS自然量扣除口径']
    : /ROI|roi/i.test(content) ? ['消耗', '激活', 'ROI'] : ['消耗', '激活'];
  const dimensions = isGameDaily
    ? ['项目总数据', '广告量', '媒体', '应用类型', '媒体×应用类型', '团队', '团队×应用类型', '团队×媒体', '团队×媒体×应用类型']
    : /标签/.test(content) ? ['媒体', '账户', '广告标签'] : ['媒体', '账户'];
  const frequency = isWeekly ? 'weekly' : isMonthly ? 'monthly' : 'daily';
  const deliveryTime = /10:00|10\s*点/.test(content) ? '10:00' : '09:00';

  return {
    id,
    message_id: id,
    conversation_id: convId,
    role: 'assistant',
    message_type: 'assistant_reply' as MessageType,
    created_at: new Date().toISOString(),
    timestamp: Date.now(),
    agent: 'help',
    intent_type: 'help',
    content: '请确认这次自动化任务需要的维度、指标和执行时间。确认后我会创建任务。',
    thinking_steps: [
      {
        key: 'automation_task_intent',
        label: '识别自动化任务',
        content: '识别到用户希望创建一个固定周期的数据整理任务，需要先确认维度、指标和执行时间。',
        status: 'completed',
      },
      {
        key: 'automation_capability_check',
        label: '检查可用能力',
        content: '自动化任务、报表取数和任务记录能力可承接当前需求。',
        status: 'completed',
      },
      {
        key: 'automation_option_extract',
        label: '提取候选项',
        content: `候选维度：${dimensions.join('、')}；候选指标：${metrics.join('、')}；周期：${frequency}；时间：${deliveryTime}。`,
        status: 'completed',
      },
      {
        key: 'automation_wait_confirm',
        label: '等待确认',
        content: '确认维度、指标和执行时间后，再创建自动化任务。',
        status: 'completed',
      },
    ],
    tool_calls: [
      {
        name: '自动化任务 Skill',
        kind: 'skill',
        display_name: '自动化任务',
        arguments: JSON.stringify({ task: '确认维度、指标和执行时间' }),
        result: '可承接',
        status: 'done',
      },
    ],
    metadata: {
      workflow_card: {
        type: 'report_composer',
        status: 'template_review',
        title: '自动化任务确认',
        sourceText: content,
        intakeModes: ['选择维度', '选择指标', '确认时间'],
        template: {
          name: isWeekly ? '投放周报' : isMonthly ? '投放月报' : isGameDaily ? '游戏项目投放日报' : '投放日报',
          metrics,
          dimensions,
          timeRange: isWeekly ? '最近 7 天' : isMonthly ? '上个自然月' : '前一日',
          frequency,
          deliveryTime,
          deliveryTargets: [],
        },
        metricIssues: [],
      },
    },
  };
}

function buildMediaDemandMessage(convId: string, content: string): Message {
  const id = nextMessageId();
  const isTrackingPostback = /监测|回传|监测链接|归因|事件映射/i.test(content);
  const isCollect = /采集|报表|数据源|行业数据|商业数据/i.test(content);
  const hasDocument = /文档|docx?|pdf|链接|附件|上传/i.test(content);
  return {
    id,
    message_id: id,
    conversation_id: convId,
    role: 'assistant',
    message_type: 'assistant_reply' as MessageType,
    created_at: new Date().toISOString(),
    timestamp: Date.now(),
    agent: 'demand',
    intent_type: 'demand',
    content: [
      `## ${isTrackingPostback ? '监测回传对接' : isCollect ? '采集对接' : '对接需求'}需要先确认文档和目标`,
      '',
      hasDocument
        ? '我会先解析你提供的对接文档，检查文档内容和这次需求是否匹配。'
        : '请先提供对接文档或关键说明，我再继续校验需求是否可直接配置。',
      '',
      '### 需要确认',
      isCollect
        ? '- 采集对象、字段口径、更新频率、样例数据和验收方式'
        : '- 监测链接参数规则、可回传事件、归因口径、验收方式和特殊操作',
      '- 涉及的媒体、项目、应用或包体范围',
      '- 是否已有可用配置或需要新增配置',
      '',
      isTrackingPostback
        ? '如果文档没有特殊操作，我会调用配置能力完成监测回传配置，随后用户可以立即创建监测链接。'
        : '如果当前能力未覆盖，我会记录成明确的指标或对接需求，并继续追问开发所需字段。',
    ].join('\n'),
    thinking_steps: [
      { label: '识别需求', content: isCollect ? '判断为采集对接需求。' : isTrackingPostback ? '判断为监测回传对接需求。' : '判断为对接需求。', status: 'completed' },
      { label: '检查文档', content: hasDocument ? '已检测到文档线索，下一步解析文档并校验字段。' : '暂未检测到文档，需要先补充文档或关键说明。', status: hasDocument ? 'completed' : 'loading' },
      { label: '匹配能力', content: isTrackingPostback ? '无特殊操作时可进入配置能力和监测链接创建。' : '若现有工具未覆盖，会转为指标或对接需求记录。', status: 'completed' },
    ],
    tool_calls: [
      {
        name: 'demand.document_parse',
        kind: 'skill',
        display_name: '对接文档解析',
        arguments: JSON.stringify({ has_document: hasDocument, demand_type: isCollect ? '采集对接' : isTrackingPostback ? '监测回传对接' : '对接需求' }),
        result: hasDocument ? '等待解析文档内容' : '等待用户提供文档',
        status: hasDocument ? 'running' : 'pending',
      },
      ...(isTrackingPostback ? [{
        name: 'config_mcp.postback_config_upsert',
        kind: 'mcp' as const,
        display_name: '配置能力',
        arguments: JSON.stringify({ when: '文档无特殊操作且字段齐全' }),
        result: '待文档校验后调用',
        status: 'pending' as const,
      }] : []),
    ],
    metadata: {
      workflow_card: {
        type: 'media_onboarding',
        status: hasDocument ? 'document_review' : 'missing_dependencies',
        title: isTrackingPostback ? '监测回传对接' : isCollect ? '采集对接' : '对接需求',
        sourceText: content,
        demandType: isCollect ? 'data_collection' : isTrackingPostback ? 'tracking_postback' : 'integration',
        canAutoConfigure: isTrackingPostback,
      },
      source_refs: [
        {
          title: '媒体对接需求流程',
          source: '小乔需求池模板',
          url: 'weknora://knowledge-base/media-onboarding-requirement-flow',
        },
      ],
      knowledge_base: {
        provider: 'WeKnora',
        address: 'weknora://knowledge-base/media-onboarding-requirement-flow',
        dataset: 'media-onboarding',
      },
    },
  };
}

function buildLegacyDebugMessage(convId: string, content = ''): Message {
  const id = nextMessageId();
  const isOceanEngine = /巨量|穿山甲|抖音|今日头条/i.test(content);
  const sharedToDefaultAccount = /wuyanlan@dobest\.com/i.test(content);
  const media = isOceanEngine ? '巨量引擎' : '已有媒体';
  const project = extractDebugAppName(content) || '当前项目';
  const debugChecks = [
    { label: '项目与媒体', status: '已确认', detail: `${project} / ${media}` },
    {
      label: '应用共享',
      status: sharedToDefaultAccount ? '通过' : '未通过',
      detail: sharedToDefaultAccount ? '已检测到应用共享到 wuyanlan@dobest.com' : '未检测到应用共享到默认账号',
    },
    { label: '验收状态', status: '通过', detail: '媒体、渠道包和自动联调配置满足当前验收条件' },
    { label: '回传查看位置', status: '已确认', detail: '取自后台媒体配置，不需要用户侧填写' },
    { label: '测试设备', status: '已确认', detail: '取自后台移动设备环境配置，不需要用户侧填写' },
    { label: '数据上报', status: '通过', detail: '数据上报 MCP 已查询到最近激活/注册记录；付费按模拟付费联调，关键行为同步校验' },
  ];
  const allPassed = debugChecks.every((item) => item.status === '通过' || item.status === '已确认');
  const failedChecks = debugChecks.filter((item) => item.status !== '通过' && item.status !== '已确认');
  const visibleConclusion = allPassed
    ? '前置校验已通过，可以发起自动联调。'
    : failedChecks.map((item) => `${item.label}：${item.detail}`).join('\n');
  const thinkingCheckDetail = debugChecks
    .map((item, index) => `${index + 1}. ${item.label}：${item.status}，${item.detail}`)
    .join('\n');
  return {
    id,
    message_id: id,
    conversation_id: convId,
    role: 'assistant',
    message_type: 'assistant_reply' as MessageType,
    created_at: new Date().toISOString(),
    timestamp: Date.now(),
    agent: 'debugging',
    intent_type: 'debugging',
    content: visibleConclusion,
    thinking_steps: [
      { key: 'debug_intent_route', label: '识别联调意图', content: `识别为${media}自动联调请求。`, status: 'completed', duration_ms: 300 },
      { key: 'debug_context_prepare', label: '确认项目与媒体', content: `项目：${project}，媒体：${media}。`, status: 'completed', duration_ms: 400 },
      { key: 'debug_prerequisite_check', label: '检查联调前置条件', content: thinkingCheckDetail, status: 'completed', duration_ms: 700 },
      { key: 'debug_result_decision', label: '生成联调结论', content: allPassed ? '前置条件通过。' : `未通过项：${failedChecks.map((item) => item.label).join('、')}。`, status: 'completed', duration_ms: 200 },
    ],
    metadata: {
      workflow_card: {
        type: 'legacy_media_debug',
        status: 'auto_checked',
        title: '自动联调校验结果',
        media,
        terminal: /ios|iOS|苹果/i.test(content) ? 'iOS' : '安卓',
        projectContext: project,
        accountShared: sharedToDefaultAccount,
        debugChecks,
        failedChecks,
        summary: visibleConclusion,
        sourceText: content,
      },
    },
  };
}

interface OceanEngineAppCheckResult {
  ok: boolean;
  status: 'matched' | 'not_found' | 'empty_result' | 'missing_account_id' | 'missing_advertiser_id' | 'failed' | 'not_configured' | 'blocked';
  message: string;
  tool?: string;
  server?: string;
  latency_ms?: number;
  checked_count?: number;
  matched_count?: number;
  matched_apps?: Array<{
    app_id?: string;
    app_name: string;
    icon?: string;
    package_name?: string;
    account_id?: string;
    account_type?: string;
    status?: string;
  }>;
  candidate_apps?: Array<{
    app_id?: string;
    app_name: string;
    icon?: string;
    package_name?: string;
    account_id?: string;
    account_type?: string;
    status?: string;
  }>;
}

async function startDebugTaskAfterAppCheck(
  convId: string,
  content: string,
  check: OceanEngineAppCheckResult | null,
): Promise<DebugAutomationTask | null> {
  if (!check || check.status !== 'matched') return null;
  const target = check.matched_apps?.[0];
  const requestBody = {
    media: '巨量引擎',
    debug_type: '自动联调',
    account: target?.account_id || '',
    app_name: target?.app_name || extractDebugAppName(content) || '当前项目',
    package_name: target?.package_name || '',
    device: '',
    environment: 'test',
    current_blocker: '',
    targets: ['激活', '注册', '付费', '关键行为'],
    conversation_id: convId,
    requires_manual_confirm: false,
  };
  const response = await fetch('/api/xiaoqiao/debug-automation/mcp-start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });
  const payload = await response.json().catch(() => ({})) as {
    ok?: boolean;
    message?: string;
    result?: Record<string, unknown>;
    server?: string;
  };
  if (!response.ok || !payload.ok) {
    throw new Error(payload.message || `自动联调 MCP 返回 HTTP ${response.status}`);
  }
  const result = payload.result || {};
  const taskId = String(result.task_id || result.id || `debug-mcp-${Date.now()}`);
  return {
    id: taskId,
    conversation_id: convId,
    media: requestBody.media,
    debug_type: requestBody.debug_type,
    account: requestBody.account,
    app_name: requestBody.app_name,
    package_name: requestBody.package_name,
    device: requestBody.device,
    environment: requestBody.environment,
    status: 'running_web_prepare',
    current_stage: payload.server ? `${payload.server} 已发起` : '联调 MCP 已发起',
    current_step: '',
    requires_manual_confirm: false,
    mcp_result: result,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as DebugAutomationTask & { mcp_result?: Record<string, unknown> };
}

function extractDebugTarget(content: string) {
  const project = extractDebugAppName(content);
  const terminal = /ios|iOS|苹果/i.test(content) ? 'iOS' : /安卓|Android|android/i.test(content) ? 'Android' : 'Android';
  const media = /巨量|穿山甲|抖音|今日头条/i.test(content) ? '巨量引擎' : /快手/i.test(content) ? '快手' : /广点通|腾讯/i.test(content) ? '广点通' : '已有媒体';
  return { project, terminal, media };
}

function withOceanEngineAppCheck(message: Message, check: OceanEngineAppCheckResult | null): Message {
  if (!check) return message;
  const failed = check.status !== 'matched';
  const candidates = check.candidate_apps || [];
  const candidateText = check.status === 'not_found' || check.status === 'empty_result'
    ? candidates.length > 0
      ? `\n\n默认账户下已找到的应用：\n${candidates.map((app, index) => {
        const icon = app.icon ? `![icon](${app.icon}) ` : '';
        const appId = app.app_id ? `（${app.app_id}）` : '';
        return `${index + 1}. ${icon}${app.app_name}${appId}`;
      }).join('\n')}`
      : '\n\n默认账户下已找到的应用：空'
    : '';
  const content = failed
    ? `应用权限校验未通过：${check.message}${candidateText}`
    : check.status === 'blocked'
      ? `应用权限校验已阻断，需要先处理后再继续。\n\n阻断原因：${check.message}`
      : '应用权限校验已通过，可以继续发起自动联调。';
  const checkStep = {
    key: 'mcp_oceanengine_app_list',
    label: '调用巨量应用列表',
    content: [
      `工具：${check.tool || 'tools_app_management_android_app_list_v2'}`,
      `结果：${check.message}`,
      typeof check.checked_count === 'number' ? `检查应用数：${check.checked_count}` : '',
      typeof check.matched_count === 'number' ? `匹配应用数：${check.matched_count}` : '',
      candidates.length > 0 ? `候选应用：${candidates.map(app => app.app_name).join('、')}` : '',
    ].filter(Boolean).join('\n'),
    status: check.ok ? 'completed' as const : 'error' as const,
    duration_ms: check.latency_ms,
  };
  const thinking_steps = [
    ...(message.thinking_steps || []),
    checkStep,
  ];
  return {
    ...message,
    content,
    thinking_steps,
    metadata: {
      ...message.metadata,
      workflow_card: message.metadata?.workflow_card && typeof message.metadata.workflow_card === 'object'
        ? {
          ...message.metadata.workflow_card,
          oceanengineAppCheck: check,
          failedChecks: failed ? [{ label: '应用权限', status: '未通过', detail: check.message }] : [],
          summary: content,
        }
        : message.metadata?.workflow_card,
    },
  };
}

async function checkOceanEngineAppPermission(content: string): Promise<OceanEngineAppCheckResult | null> {
  const target = extractDebugTarget(content);
  if (target.media !== '巨量引擎') return null;
  try {
    const response = await fetch('/api/xiaoqiao/debug-automation/oceanengine-app-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(target),
    });
    if (!response.ok) {
      return {
        ok: false,
        status: 'failed',
        message: `巨量 MCP 校验接口返回 HTTP ${response.status}`,
      };
    }
    return await response.json() as OceanEngineAppCheckResult;
  } catch (error: unknown) {
    return {
      ok: false,
      status: 'failed',
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

function buildDebugExecutionMessage(convId: string, content: string): Message {
  const id = nextMessageId();
  return {
    id,
    message_id: id,
    conversation_id: convId,
    role: 'assistant',
    message_type: 'assistant_reply' as MessageType,
    created_at: new Date().toISOString(),
    timestamp: Date.now(),
    agent: 'debugging',
    intent_type: 'debugging',
    content: [
      '## 已发起联调',
      '',
      '我已进入联调执行。右侧会展示步骤、状态和执行结果。',
      '',
      '如果执行中需要你处理，我会直接说明要做什么；处理完成后可再次发起联调。',
    ].join('\n'),
    metadata: {
      workflow_result: {
        task_id: `debug-${Date.now()}`,
        result_type: 'debugging_report',
        result_status: 'running',
        current_stage: 'checking_prerequisites',
        summary: '联调已发起，正在检查账号共享、验证事件和回传查看位置。',
        next_actions: [],
        pending_checks: ['账号共享状态', '验证事件', '回传查看位置', '联调执行结果'],
        created_at: new Date().toISOString(),
        kind: 'debugging',
        sourceText: content,
      },
    },
  };
}

export interface ToolCallRecord {
  name: string;
  query: string;
  result?: string;
  arguments?: string;
  kind?: string;
  display_name?: string;
  provider_url?: string;
  prompt?: string;
  step_key?: string;
  status: 'calling' | 'done' | 'error';
}

export interface AgentMeta {
  thinking?: string;
  toolCalls?: ToolCallRecord[];
  phase?: 'thinking' | 'tool_calling' | 'generating' | 'done';
}

export type TurnUiStatus =
  | 'idle'
  | 'submitting'
  | 'assistant_pending'
  | 'streaming'
  | 'tool_running'
  | 'finalizing'
  | 'completed'
  | 'degraded'
  | 'blocked'
  | 'empty'
  | 'skipped'
  | 'cancel_requested'
  | 'cancelled'
  | 'failed';

const PLACEHOLDER_CONVERSATION_TITLES = new Set(['新对话', '新会话', '新對話', '未命名会话']);

function shouldShowConversation(conversation: Conversation, projectBinding?: ProjectBinding) {
  if (!projectBinding || projectBinding.project_refs.length === 0) return true;
  if (!conversation.project_binding || conversation.project_binding.project_refs.length === 0) return true;
  return projectBinding.project_refs.some((ref) => conversation.project_binding?.project_refs.includes(ref));
}

function isPlaceholderConversation(conversation: Conversation): boolean {
  return Number(conversation.message_count || 0) === 0
    && PLACEHOLDER_CONVERSATION_TITLES.has(String(conversation.title || '').trim());
}

function filterPlaceholderConversations(conversations: Conversation[], activeConversationId?: string | null): Conversation[] {
  let keptInactivePlaceholder = false;
  return conversations.filter((conversation) => {
    if (!isPlaceholderConversation(conversation)) return true;
    if (activeConversationId && conversation.conversation_id === activeConversationId) return true;
    if (!activeConversationId && !keptInactivePlaceholder) {
      keptInactivePlaceholder = true;
      return true;
    }
    return false;
  });
}

function extractStatus(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function statusFromRecord(value: unknown, key: string): string {
  if (!value || typeof value !== 'object') return '';
  return extractStatus((value as Record<string, unknown>)[key]);
}

function resolveFinalTurnUiStatus(
  responseMetadata?: Record<string, unknown>,
  workflowResult?: Record<string, unknown> | null,
  responseResult?: Record<string, unknown>,
): TurnUiStatus {
  const runtimeState = responseMetadata?.runtime_state && typeof responseMetadata.runtime_state === 'object'
    ? responseMetadata.runtime_state as Record<string, unknown>
    : null;
  const candidates = [
    extractStatus(responseMetadata?.turn_ui_status),
    extractStatus(responseMetadata?.status),
    extractStatus(runtimeState?.status),
    statusFromRecord(workflowResult, 'status'),
    statusFromRecord(workflowResult, 'result_status'),
    statusFromRecord(workflowResult, 'workflow_state'),
    statusFromRecord(responseResult, 'status'),
    statusFromRecord(responseResult, 'result_status'),
  ].filter(Boolean);

  if (candidates.some((status) => status === 'failed' || status === 'failure' || status === 'error')) return 'failed';
  if (candidates.some((status) => status === 'cancelled' || status === 'canceled')) return 'cancelled';
  if (candidates.some((status) => status === 'blocked')) return 'blocked';
  if (candidates.some((status) => status === 'empty')) return 'empty';
  if (candidates.some((status) => status === 'skipped')) return 'skipped';
  if (candidates.some((status) => status === 'degraded' || status === 'partial')) return 'degraded';
  return 'completed';
}

function extractListPayload<T>(payload: unknown, keys: string[]): T[] {
  const visited = new Set<unknown>();
  const preferredKeys = [
    ...keys,
    'records',
    'rows',
    'result',
    'results',
    'payload',
    'message_list',
    'messageList',
    'conversation_list',
    'conversationList',
  ];

  const walk = (value: unknown, depth: number): unknown[] => {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (!value || typeof value !== 'object' || depth > 5 || visited.has(value)) return [];
    visited.add(value);

    const record = value as Record<string, unknown>;
    for (const key of preferredKeys) {
      const found = walk(record[key], depth + 1);
      if (found.length > 0) return found;
    }

    for (const nested of Object.values(record)) {
      const found = walk(nested, depth + 1);
      if (found.length > 0) return found;
    }

    return [];
  };

  return walk(payload, 0) as T[];
}

function stringifyMessageContent(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    return value
      .map(item => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          const record = item as Record<string, unknown>;
          return stringifyMessageContent(record.text || record.content || record.value);
        }
        return '';
      })
      .filter(Boolean)
      .join('\n');
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return stringifyMessageContent(record.text || record.content || record.value || record.markdown);
  }
  return '';
}

function normalizeConversationPayload(item: Conversation): Conversation {
  const record = item as Conversation & Record<string, unknown>;
  const conversationId = String(
    record.conversation_id ||
    record.conversationId ||
    record.conversationID ||
    record.conv_id ||
    record.convId ||
    record.id ||
    '',
  );
  const now = new Date().toISOString();
  return {
    ...item,
    conversation_id: conversationId,
    user_id: String(record.user_id || record.userId || ''),
    title: String(record.title || record.name || record.summary || '新会话'),
    status: String(record.status || '普通对话') as Conversation['status'],
    started_at: String(record.started_at || record.startedAt || record.created_at || record.createdAt || now),
    updated_at: String(record.updated_at || record.updatedAt || record.last_message_at || record.lastMessageAt || now),
    last_message_at: String(record.last_message_at || record.lastMessageAt || record.updated_at || record.updatedAt || now),
    current_mode: (record.current_mode || record.currentMode || 'natural-chat') as Conversation['current_mode'],
    message_count: Number(record.message_count || record.messageCount || record.messages_count || record.messagesCount || 0),
  };
}

function normalizeHistoryMessagePayload(item: Message, conversationId: string): Message {
  const record = item as Message & Record<string, unknown>;
  const id = String(record.message_id || record.messageId || record.messageID || record.id || `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const rawRole = String(record.role || record.sender || record.author || record.from || record.type || record.message_role || record.messageRole || '').toLowerCase();
  const role: Message['role'] = rawRole.includes('assistant') || rawRole.includes('ai') || rawRole.includes('bot')
    ? 'assistant'
    : rawRole.includes('system')
      ? 'system'
      : 'user';
  const createdAt = String(record.created_at || record.createdAt || record.time || record.timestamp || new Date().toISOString());
  const content = stringifyMessageContent(
    record.content ||
    record.text ||
    record.message ||
    record.answer ||
    record.reply ||
    record.response ||
    record.question ||
    record.query ||
    record.content_text ||
    record.contentText ||
    record.message_content ||
    record.messageContent,
  );
  return {
    ...item,
    id,
    message_id: id,
    conversation_id: String(record.conversation_id || record.conversationId || record.conversationID || conversationId),
    role,
    content,
    message_type: (record.message_type || record.messageType || (role === 'assistant' ? 'assistant_reply' : 'user_input')) as MessageType,
    created_at: createdAt,
    timestamp: typeof record.timestamp === 'number'
      ? record.timestamp
      : new Date(createdAt).getTime() || Date.now(),
  };
}

const ACTIVE_CONVERSATION_STORAGE_KEY = 'zhitou-chat-active-conversation-id';

function readStoredActiveConversationId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = window.localStorage.getItem(ACTIVE_CONVERSATION_STORAGE_KEY);
    return value && value.trim() ? value : null;
  } catch {
    return null;
  }
}

function persistActiveConversationId(conversationId: string | null) {
  if (typeof window === 'undefined') return;
  try {
    if (conversationId) {
      window.localStorage.setItem(ACTIVE_CONVERSATION_STORAGE_KEY, conversationId);
    } else {
      window.localStorage.removeItem(ACTIVE_CONVERSATION_STORAGE_KEY);
    }
  } catch {
    // localStorage 不可用时不影响会话主流程。
  }
}

function getMessageStableKey(message: Message): string {
  return String(message.message_id || message.id);
}

function sortMessagesByCreatedAt(messages: Message[]): Message[] {
  return [...messages].sort((a, b) => {
    const first = new Date(a.created_at).getTime() || a.timestamp || 0;
    const second = new Date(b.created_at).getTime() || b.timestamp || 0;
    return first - second;
  });
}

function mergeHistoryMessages(currentMessages: Message[], historyMessages: Message[]): Message[] {
  const nextByKey = new Map<string, Message>();
  for (const message of historyMessages) {
    nextByKey.set(getMessageStableKey(message), message);
  }
  for (const message of currentMessages) {
    const key = getMessageStableKey(message);
    if (!nextByKey.has(key)) {
      nextByKey.set(key, message);
    }
  }
  return sortMessagesByCreatedAt([...nextByKey.values()]);
}

export function useConversation(currentProjectBinding?: ProjectBinding) {
  const {
    currentAgent,
    setCurrentAgent,
    setConversationMode,
    missingFields,
  } = useAgent();

  const [messagesByConversation, setMessagesByConversation] = useState<Record<string, Message[]>>({});
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [runningConversationIds, setRunningConversationIds] = useState<string[]>([]);
  const [agentMeta, setAgentMeta] = useState<Map<string, AgentMeta>>(new Map());
  const [currentRouting, setCurrentRouting] = useState<{
    intent_type: IntentType;
    is_business_related: boolean;
  } | null>(null);
  const [currentResult, setCurrentResult] = useState<Record<string, unknown> | null>(null);
  const [callChainData, setCallChainData] = useState<CallChainData | null>(null);
  const [debugCarryMemory, setDebugCarryMemory] = useState<DebugCarryMemory>({});
  const abortControllerRef = useRef<AbortController | null>(null);
  const activeTurnRef = useRef<{ conversationId: string; assistantId: string; requestId: string } | null>(null);
  const cancelledTurnIdsRef = useRef<Set<string>>(new Set());
  const skipNextLoadRef = useRef<string | null>(null);
  const skipTitleUpdateRef = useRef<string | null>(null);
  const activeConversationIdRef = useRef<string | null>(null);
  const latestMessageLoadRef = useRef<string | null>(null);
  const restoredActiveConversationRef = useRef(false);
  const messages = useMemo(
    () => (activeConversationId ? messagesByConversation[activeConversationId] || [] : []),
    [activeConversationId, messagesByConversation],
  );

  const setConversationMessages = useCallback((conversationId: string, updater: SetStateAction<Message[]>) => {
    setMessagesByConversation(prev => {
      const current = prev[conversationId] || [];
      const next = typeof updater === 'function'
        ? (updater as (value: Message[]) => Message[])(current)
        : updater;
      return { ...prev, [conversationId]: next };
    });
  }, []);

  const clearConversationMessages = useCallback((conversationId: string | null) => {
    if (!conversationId) return;
    setMessagesByConversation(prev => {
      if (!(conversationId in prev)) return prev;
      const next = { ...prev };
      delete next[conversationId];
      return next;
    });
  }, []);

  const moveConversationMessages = useCallback((fromConversationId: string, toConversationId: string) => {
    if (fromConversationId === toConversationId) return;
    setMessagesByConversation(prev => {
      const sourceMessages = prev[fromConversationId] || [];
      const targetMessages = prev[toConversationId] || [];
      const movedMessages = sourceMessages.map(item => ({ ...item, conversation_id: toConversationId }));
      const next = { ...prev, [toConversationId]: mergeHistoryMessages(targetMessages, movedMessages) };
      delete next[fromConversationId];
      return next;
    });
  }, []);

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
    if (!restoredActiveConversationRef.current && !activeConversationId) return;
    persistActiveConversationId(activeConversationId);
  }, [activeConversationId]);

  useEffect(() => {
    void fetchDebugMemory().then(setDebugCarryMemory);
  }, []);

  const refreshConversations = useCallback(async (options: { activateFirst?: boolean } = {}) => {
    try {
      const payload = await xiaoqiaoApi.getConversations({
        limit: 30,
        project_refs: currentProjectBinding?.project_refs,
      });
      const list = extractListPayload<Conversation>(payload, ['data', 'items', 'list', 'conversations'])
        .map(normalizeConversationPayload)
        .filter(item => item.conversation_id)
        .filter((item) => shouldShowConversation(item, currentProjectBinding));
      const visibleList = filterPlaceholderConversations(list, activeConversationIdRef.current);
      setConversations(visibleList);
      if (options.activateFirst && !activeConversationIdRef.current && visibleList[0]) {
        activeConversationIdRef.current = visibleList[0].conversation_id;
        setActiveConversationId(visibleList[0].conversation_id);
      }
      return visibleList;
    } catch (error) {
      console.error('refreshConversations failed', error);
      return [];
    }
  }, [currentProjectBinding]);

  const loadMessages = useCallback(async (conversationId: string) => {
    latestMessageLoadRef.current = conversationId;
    setIsLoadingMessages(true);
    try {
      const payload = await xiaoqiaoApi.getMessages(conversationId, { limit: 30 });
      if (latestMessageLoadRef.current !== conversationId) return;
      const loadedMessages = extractListPayload<Message>(payload, ['data', 'items', 'list', 'messages'])
        .map(item => normalizeHistoryMessagePayload(item, conversationId))
        .filter(item => item.content || item.message_type !== 'user_input');
      setConversationMessages(conversationId, prev => mergeHistoryMessages(prev, loadedMessages));
    } catch (error) {
      if (latestMessageLoadRef.current !== conversationId) return;
      const missingConversation = error instanceof Error && /404|not found|conversation not found/i.test(error.message);
      if (missingConversation) {
        console.debug('Selected conversation messages not found; keeping selection until conversation list refresh confirms removal', error);
        return;
      }
      console.error('loadMessages failed', error);
      // 不清空已有消息，避免加载失败时跳转到空态页。
      // 如果原本就没有消息（首次加载失败），ChatContainer 的渲染容错会处理。
    } finally {
      if (latestMessageLoadRef.current === conversationId) {
        setIsLoadingMessages(false);
      }
    }
  }, [setConversationMessages]);

  useEffect(() => {
    const storedConversationId = readStoredActiveConversationId();
    restoredActiveConversationRef.current = true;
    if (!storedConversationId || activeConversationIdRef.current) return;
    activeConversationIdRef.current = storedConversationId;
    skipNextLoadRef.current = storedConversationId;
    setActiveConversationId(storedConversationId);
    setIsLoadingMessages(true);
    void loadMessages(storedConversationId);
  }, [loadMessages]);

  useEffect(() => {
    void refreshConversations();
  }, [refreshConversations]);

  useEffect(() => {
    if (!activeConversationId) {
      if (activeTurnRef.current) return;
      return;
    }
    if (skipNextLoadRef.current === activeConversationId) {
      skipNextLoadRef.current = null;
      return;
    }
    void loadMessages(activeConversationId);
  }, [activeConversationId, loadMessages]);

  const ensureConversation = useCallback(async (_content?: string) => {
    // 优先使用 ref（始终是最新值），避免 async IIFE 中闭包陈旧导致重复创建会话。
    // flushSync 已将 activeConversationIdRef.current 设为 optimistic ID，
    // 此处检测到 optimistic 前缀则创建真实会话替代。
    const refId = activeConversationIdRef.current;
    if (refId && !refId.startsWith('optimistic-')) {
      return refId;
    }
    const conversation = await xiaoqiaoApi.createConversation({
      title: '新对话',
      project_binding: currentProjectBinding,
    });
    skipNextLoadRef.current = conversation.conversation_id;
    activeConversationIdRef.current = conversation.conversation_id;
    setActiveConversationId(conversation.conversation_id);
    setConversations(prev => filterPlaceholderConversations(
      shouldShowConversation(conversation, currentProjectBinding) ? [conversation, ...prev] : prev,
      conversation.conversation_id,
    ));
    return conversation.conversation_id;
  }, [currentProjectBinding]);

  const createConversation = useCallback(async (title?: string) => {
    const conversation = await xiaoqiaoApi.createConversation({
      title: title || '新对话',
      project_binding: currentProjectBinding,
    });
    skipNextLoadRef.current = conversation.conversation_id;
    activeConversationIdRef.current = conversation.conversation_id;
    setActiveConversationId(conversation.conversation_id);
    setConversations(prev => filterPlaceholderConversations(
      shouldShowConversation(conversation, currentProjectBinding) ? [conversation, ...prev] : prev,
      conversation.conversation_id,
    ));
    setConversationMessages(conversation.conversation_id, []);
    setCurrentResult(null);
    setCallChainData(null);
    void refreshConversations();
    return conversation;
  }, [refreshConversations, currentProjectBinding, setConversationMessages]);

  const startBlankConversation = useCallback(() => {
    activeConversationIdRef.current = null;
    skipNextLoadRef.current = null;
    skipTitleUpdateRef.current = null;
    setActiveConversationId(null);
    setIsLoadingMessages(false);
    setCurrentResult(null);
    setCallChainData(null);
  }, []);

  const selectConversation = useCallback((conversationId: string) => {
    skipNextLoadRef.current = conversationId;
    skipTitleUpdateRef.current = null;
    activeConversationIdRef.current = conversationId;
    setActiveConversationId(conversationId);
    setIsLoadingMessages(true);
    setCurrentResult(null);
    setCallChainData(null);
    void loadMessages(conversationId);
  }, [loadMessages]);

  const markConversationRunning = useCallback((conversationId: string) => {
    setRunningConversationIds(prev => (prev.includes(conversationId) ? prev : [...prev, conversationId]));
    setConversations(prev => prev.map(item => (
      item.conversation_id === conversationId ? { ...item, status: '执行中' } : item
    )));
    if (!conversationId.startsWith('optimistic-')) {
      void xiaoqiaoApi.updateConversation(conversationId, { status: '执行中' }).catch(() => undefined);
    }
  }, []);

  const clearConversationRunning = useCallback((conversationId: string) => {
    setRunningConversationIds(prev => prev.filter(item => item !== conversationId));
    setConversations(prev => prev.map(item => (
      item.conversation_id === conversationId ? { ...item, status: '普通对话' } : item
    )));
    if (!conversationId.startsWith('optimistic-')) {
      void xiaoqiaoApi.updateConversation(conversationId, { status: '普通对话' }).catch(() => undefined);
    }
  }, []);

  const transferConversationRunning = useCallback((fromConversationId: string, toConversationId: string) => {
    if (fromConversationId === toConversationId) return;
    setRunningConversationIds(prev => {
      const withoutFrom = prev.filter(item => item !== fromConversationId);
      return withoutFrom.includes(toConversationId) ? withoutFrom : [...withoutFrom, toConversationId];
    });
    setConversations(prev => prev.map(item => (
      item.conversation_id === toConversationId ? { ...item, status: '执行中' } : item
    )));
    void xiaoqiaoApi.updateConversation(toConversationId, { status: '执行中' }).catch(() => undefined);
  }, []);

  const renameConversation = useCallback(async (conversationId: string, title: string) => {
    const next = await xiaoqiaoApi.updateConversation(conversationId, { title });
    setConversations(prev => prev.map(item => item.conversation_id === conversationId ? next : item));
  }, []);

  const deleteConversation = useCallback(async (conversationId: string) => {
    await xiaoqiaoApi.deleteConversation(conversationId);
    setConversations(prev => {
      const next = prev.filter(item => item.conversation_id !== conversationId);
      if (activeConversationId === conversationId) {
        activeConversationIdRef.current = null;
        setActiveConversationId(null);
        setIsLoadingMessages(false);
        setCurrentResult(null);
        setCallChainData(null);
      }
      return next;
    });
    clearConversationMessages(conversationId);
  }, [activeConversationId, clearConversationMessages]);

  const sendMessage = useCallback((content: string, targetConversationId?: string, options?: SendMessageOptions) => {
    const trimmed = content.trim();
    if (!trimmed) return;
    const reportAction = decodeReportActionEnvelope(trimmed);
    const visibleContent = reportAction?.action === 'select_entity_candidate'
      ? `已按“${String(reportAction.params?.candidateName || reportAction.label.replace(/^选择\s*/, '')).trim()}”继续查询`
      : reportAction?.label || trimmed;
    const businessContext = buildBusinessContextSnapshot(messages, options?.projectContext);
    const projectContextDebug = buildProjectContextDebug(options);
    if (typeof window !== 'undefined') {
      console.debug('[ChatProjectContext]', projectContextDebug);
    }
    const contextualContent = enrichWithConversationContext(trimmed, messages, debugCarryMemory);
    const baseEffectiveContent = options?.projectContext
      ? `${trimmed}\n\n[项目上下文]\n${options.projectContext}`
      : trimmed;

    const effectiveContent = baseEffectiveContent.replace(trimmed, contextualContent);
    const nextDebugMemory = extractDebugMemoryFromContent(effectiveContent);
    if (nextDebugMemory) {
      setDebugCarryMemory(prev => ({
        ...prev,
        intent: 'debugging',
        media: nextDebugMemory.media || prev.media,
        app: nextDebugMemory.app || prev.app,
        updated_at: nextDebugMemory.updated_at,
      }));
    }

    const firstRouting = routeUserIntent(effectiveContent);
    const slotState = resolveSlots({
      intentType: firstRouting.intent_type,
      message: effectiveContent,
      businessContext,
    });
    const routing = routeUserIntent(effectiveContent, { businessContext, slotState });
    const targetExists = Boolean(targetConversationId && conversations.some(item => item.conversation_id === targetConversationId));
    // 优先使用 ref（始终是最新值），避免 conversations state 尚未加载时误判为不存在
    const refId = activeConversationIdRef.current;
    const refIsReal = Boolean(refId && !refId.startsWith('optimistic-'));
    const activeExists = refIsReal || Boolean(activeConversationId && conversations.some(item => item.conversation_id === activeConversationId));
    const optimisticConversationId = targetExists
      ? targetConversationId!
      : refIsReal
        ? refId!
        : activeExists
          ? activeConversationId!
          : `optimistic-${Date.now()}`;
    const fallbackUserId = nextMessageId();
    const assistantId = nextMessageId();
    const requestId = `turn-${assistantId}-${Date.now()}`;
    const buildFallbackUserMessage = (conversationId: string): Message => ({
      id: fallbackUserId,
      message_id: fallbackUserId,
      conversation_id: conversationId,
      role: 'user',
      content: visibleContent,
      message_type: 'user_input' as MessageType,
      created_at: new Date().toISOString(),
      timestamp: Date.now(),
    });
    const normalizeMessage = (message: unknown, fallback: Message): Message => {
      if (!message || typeof message !== 'object') return fallback;
      const next = message as Partial<Message>;
      const id = next.id || next.message_id || fallback.id;
      return {
        ...fallback,
        ...next,
        id,
        message_id: next.message_id || id,
        conversation_id: next.conversation_id || fallback.conversation_id,
        role: next.role || fallback.role,
        content: typeof next.content === 'string' ? next.content : fallback.content,
        message_type: next.message_type || fallback.message_type,
        created_at: next.created_at || fallback.created_at,
        timestamp: next.timestamp || fallback.timestamp,
      };
    };
    const fallbackUserMessage = buildFallbackUserMessage(optimisticConversationId);
    const optimisticConversation: Conversation | null = !activeExists && !targetExists && !refIsReal
      ? {
        conversation_id: optimisticConversationId,
        user_id: 'local',
        title: visibleContent,
        status: '普通对话',
        started_at: fallbackUserMessage.created_at,
        updated_at: fallbackUserMessage.created_at,
        last_message_at: fallbackUserMessage.created_at,
        current_mode: 'natural-chat',
        project_binding: currentProjectBinding,
        message_count: 1,
      }
      : null;
    const assistantMessage: Message = {
      id: assistantId,
      message_id: assistantId,
      conversation_id: optimisticConversationId,
      role: 'assistant',
      content: '',
      message_type: 'assistant_reply' as MessageType,
      created_at: new Date().toISOString(),
      timestamp: Date.now(),
      agent: routing.is_business_related ? intentToAgent(routing.intent_type) : undefined,
      intent_type: routing.is_business_related ? routing.intent_type : undefined,
      thinking: '',
      tool_calls: [],
      metadata: {
        turn_ui_status: 'assistant_pending' satisfies TurnUiStatus,
        turn_status_label: '准备执行',
        turn_request_id: requestId,
      },
    };

    activeTurnRef.current = { conversationId: optimisticConversationId, assistantId, requestId };
    cancelledTurnIdsRef.current.delete(requestId);
    flushSync(() => {
      if (!activeExists && !targetExists && !refIsReal) {
        skipNextLoadRef.current = optimisticConversationId;
        activeConversationIdRef.current = optimisticConversationId;
        setActiveConversationId(optimisticConversationId);
        if (optimisticConversation) {
          setConversations(prev => [optimisticConversation, ...filterPlaceholderConversations(prev, optimisticConversationId)]);
        }
      }
      setIsTyping(true);
      setConversationMessages(optimisticConversationId, prev => [...prev, fallbackUserMessage, assistantMessage]);
      setRunningConversationIds(prev => (prev.includes(optimisticConversationId) ? prev : [...prev, optimisticConversationId]));
      setConversations(prev => prev.map(item => (
        item.conversation_id === optimisticConversationId ? { ...item, status: '执行中' } : item
      )));
      if (typeof window !== 'undefined') {
        const phase0 = (window as unknown as { __phase0?: { marks?: Record<string, number> } }).__phase0;
        if (phase0?.marks) {
          phase0.marks.localUserMessageCommittedAt = performance.now();
        }
      }
    });
    setAgentMeta(prev => {
      const next = new Map(prev);
      next.set(assistantId, { phase: 'thinking', toolCalls: [] });
      return next;
    });

    let pendingConversationId: string | null = optimisticConversationId;
    void (async () => {
      let convId = optimisticConversationId;
      const setActiveConversationMessages = (updater: SetStateAction<Message[]>) => {
        setConversationMessages(convId, updater);
      };
      const isTurnCancelled = () => cancelledTurnIdsRef.current.has(requestId)
        || activeTurnRef.current?.requestId !== requestId;
      const updateTurnStatus = (status: TurnUiStatus, label?: string) => {
        setActiveConversationMessages(prev => prev.map(item => item.id === assistantId
          ? {
            ...item,
            metadata: {
              ...(item.metadata || {}),
              turn_ui_status: status,
              ...(label ? { turn_status_label: label } : {}),
            },
          }
          : item));
      };
      try {
        // ensureConversation 内部通过 activeConversationIdRef.current 判断：
        // - 如果是真实 ID → 直接返回（不重复创建）
        // - 如果是 optimistic-xxx → 创建真实会话替代
        // 这避免了闭包陈旧导致的重复创建会话 BUG
        convId = targetExists ? targetConversationId! : await ensureConversation(visibleContent);
        if (isTurnCancelled()) {
          setIsTyping(false);
          return;
        }
        activeTurnRef.current = { conversationId: convId, assistantId, requestId };
        pendingConversationId = convId;
        if (convId !== optimisticConversationId) {
          moveConversationMessages(optimisticConversationId, convId);
          transferConversationRunning(optimisticConversationId, convId);
        }
        rememberDebugContext(effectiveContent, convId);
        markConversationRunning(convId);
      } catch (error) {
        updateTurnStatus('failed', '发送失败');
        setActiveConversationMessages(prev => prev.map(item => item.id === assistantId
          ? { ...item, content: '发送失败，请稍后重试。' }
          : item));
        setIsTyping(false);
        activeTurnRef.current = null;
        throw error;
      }

      let userMessage: Message = fallbackUserMessage;
      try {
        userMessage = normalizeMessage(await xiaoqiaoApi.sendMessage(convId, {
          content: visibleContent,
          role: 'user',
          message_type: 'user_input',
          attachments: options?.attachmentIds || [],
        }), fallbackUserMessage);
        setActiveConversationMessages(prev => prev.map(item => item.id === fallbackUserId ? userMessage : item));
      } catch (error) {
        const missingConversation = error instanceof Error && /404|not found/i.test(error.message);
        if (!missingConversation) throw error;
        const conversation = await xiaoqiaoApi.createConversation({ title: '新对话' });
        convId = conversation.conversation_id;
        activeTurnRef.current = { conversationId: convId, assistantId, requestId };
        pendingConversationId = convId;
        setConversations(prev => shouldShowConversation(conversation, currentProjectBinding)
          ? [conversation, ...prev.filter(item => item.conversation_id !== conversation.conversation_id)]
          : prev.filter(item => item.conversation_id !== conversation.conversation_id));
        skipNextLoadRef.current = conversation.conversation_id;
        activeConversationIdRef.current = conversation.conversation_id;
        setActiveConversationId(conversation.conversation_id);
        moveConversationMessages(optimisticConversationId, conversation.conversation_id);
        transferConversationRunning(optimisticConversationId, conversation.conversation_id);
        setConversations(prev => filterPlaceholderConversations(prev, conversation.conversation_id));
        try {
          userMessage = normalizeMessage(await xiaoqiaoApi.sendMessage(convId, {
            content: visibleContent,
            role: 'user',
            message_type: 'user_input',
            attachments: options?.attachmentIds || [],
          }), buildFallbackUserMessage(convId));
          setActiveConversationMessages(prev => prev.map(item => item.id === fallbackUserId ? userMessage : item));
        } catch (retryError) {
          const retryMissingConversation = retryError instanceof Error && /404|not found|conversation not found/i.test(retryError.message);
          if (!retryMissingConversation) throw retryError;
          console.debug('Persist user message failed after conversation recreate; keeping local message in UI', retryError);
          userMessage = buildFallbackUserMessage(convId);
        }
      }
      if (isTurnCancelled()) {
        setIsTyping(false);
        clearConversationRunning(convId);
        return;
      }

      setCurrentRouting(routing);
      if (routing.is_business_related) {
        setCurrentAgent(intentToAgent(routing.intent_type));
      }
      const currentConversation = conversations.find(item => item.conversation_id === convId) || optimisticConversation || undefined;
      const currentConversationTitle = currentConversation?.title || (messages.length === 0 ? visibleContent : undefined);
      const skipTitleUpdate = skipTitleUpdateRef.current === convId;
      if (skipTitleUpdate) {
        skipTitleUpdateRef.current = null;
      }
      const isPlaceholderTitle =
        !currentConversationTitle ||
        currentConversationTitle === '新对话' ||
        currentConversationTitle === '新会话' ||
        currentConversationTitle === '新對話' ||
        currentConversationTitle === '未命名会话' ||
        currentConversationTitle === visibleContent;
      const titleMode = messages.length === 0 || isPlaceholderTitle ? 'generate' : 'update';
      const titleNeedsModel =
        !(skipTitleUpdate && messages.length > 0) &&
        Boolean(currentConversationTitle);
      if (titleNeedsModel) {
        void (async () => {
          try {
            const latestMessages = [...messages.slice(-5), userMessage].map(item => ({
              role: item.role,
              content: item.content,
            }));
            const { title } = await xiaoqiaoApi.generateConversationTitle(convId, {
              message: visibleContent,
              history: messages.map(item => ({ role: item.role, content: item.content })),
              latest_messages: latestMessages,
              current_title: currentConversationTitle,
              topic_summary: {
                analysis_type: routing.intent_type,
                core_issue: routing.intent_type,
              },
              mode: titleMode,
            });
            const nextTitle = title.trim();
            if (!nextTitle || nextTitle === currentConversation?.title) return;
            const updated = await xiaoqiaoApi.updateConversation(convId, {
              title: nextTitle,
              normalize_title: false,
            });
            setConversations(prev => prev.map(item => item.conversation_id === convId ? updated : item));
          } catch {
            // 标题生成不阻塞会话回复。
          }
        })();
      }
      await refreshConversations();
      if (isTurnCancelled()) {
        setIsTyping(false);
        clearConversationRunning(convId);
        return;
      }

      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      const history = messages.map(item => ({
        role: item.role,
        content: item.content,
        createdAt: item.created_at,
        id: item.id,
        message_id: item.message_id,
        intent_type: item.intent_type,
        metadata: item.metadata,
        evidence_ids: item.evidence_ids,
      }));

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-conversation-id': convId,
          },
          body: JSON.stringify({
            message: contextualContent,
            history,
            intent: routing.intent_type,
            metadata: {
              projectContext: options?.projectContext,
              currentProject: options?.currentProject || null,
              projectContextDebug,
            },
          }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let accumulated = '';
        let buffer = '';
        let currentThinking = '';
        let currentToolCalls: ToolCallRecord[] = [];
        let currentThinkingSteps: NonNullable<Message['thinking_steps']> = [];
        let currentProcessEvents: AgentProcessEvent[] = [];
        let responseMetadata: Record<string, unknown> | undefined;
        let responseResult: Record<string, unknown> | undefined;
        let serverDoneReceived = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const data = JSON.parse(line.slice(6));
              const isServerDoneEvent = data.type === 'done' && (data.termination === 'server_done' || data.termination === 'server_terminated');
              if (isTurnCancelled() && !isServerDoneEvent) continue;

              if (data.type === 'process_event' && data.event) {
                const event = data.event as AgentProcessEvent;
                updateTurnStatus('tool_running', event.label || '正在处理...');
                currentProcessEvents = [
                  ...currentProcessEvents.filter((item) => item.id !== event.id),
                  event,
                ];
                const nextStep = thinkingStepFromProcessEvent(event);
                currentThinkingSteps = [
                  ...currentThinkingSteps.filter((item) => (item.key || item.label) !== (nextStep.key || nextStep.label)),
                  nextStep,
                ];
                const nextToolCall = toolCallFromProcessEvent(event);
                if (nextToolCall) {
                  currentToolCalls = [
                    ...currentToolCalls.filter((item) => item.step_key !== nextToolCall.step_key && item.name !== nextToolCall.name),
                    nextToolCall,
                  ];
                }
                const workflowCard = workflowCardFromProcessEvents(currentProcessEvents);
                setActiveConversationMessages(prev => prev.map(item => item.id === assistantId
                  ? {
                    ...item,
                    process_events: currentProcessEvents,
                    thinking_steps: currentThinkingSteps,
                    tool_calls: currentToolCalls.length > 0 ? currentToolCalls : item.tool_calls,
                    metadata: {
                      ...(item.metadata || {}),
                      process_events: currentProcessEvents,
                      ...(workflowCard ? { workflow_card: workflowCard } : {}),
                    },
                  }
                  : item));
              } else if (data.type === 'thinking') {
                updateTurnStatus('assistant_pending', '正在理解问题...');
                currentThinking += data.content;
                setActiveConversationMessages(prev => prev.map(item => item.id === assistantId
                  ? { ...item, thinking: currentThinking }
                  : item));
                setAgentMeta(prev => {
                  const next = new Map(prev);
                  next.set(assistantId, {
                    ...next.get(assistantId),
                    phase: 'thinking',
                    thinking: currentThinking,
                  });
                  return next;
                });
              } else if (data.type === 'thinking_step' && data.step) {
                const step = data.step as NonNullable<Message['thinking_steps']>[number];
                currentThinkingSteps = [
                  ...currentThinkingSteps.filter((item) => (item.key || item.label) !== (step.key || step.label)),
                  step,
                ];
                setActiveConversationMessages(prev => prev.map(item => item.id === assistantId
                  ? { ...item, thinking_steps: currentThinkingSteps }
                  : item));
              } else if (data.type === 'tool_call') {
                updateTurnStatus('tool_running', '正在调用能力...');
                currentToolCalls = [...currentToolCalls, {
                  name: data.name,
                  query: data.query,
                  arguments: data.arguments,
                  result: data.arguments,
                  kind: data.kind,
                  display_name: data.display_name,
                  provider_url: data.provider_url,
                  prompt: data.prompt,
                  step_key: data.step_key,
                  status: 'calling',
                }];
                setActiveConversationMessages(prev => prev.map(item => item.id === assistantId
                  ? { ...item, tool_calls: currentToolCalls }
                  : item));
                setAgentMeta(prev => {
                  const next = new Map(prev);
                  next.set(assistantId, {
                    ...next.get(assistantId),
                    phase: 'tool_calling',
                    toolCalls: currentToolCalls,
                  });
                  return next;
                });
              } else if (data.type === 'tool_result') {
                currentToolCalls = currentToolCalls.map(item =>
                  item.name === data.name && item.status === 'calling'
                    ? {
                      ...item,
                      result: data.result,
                      kind: data.kind || item.kind,
                      display_name: data.display_name || item.display_name,
                      provider_url: data.provider_url || item.provider_url,
                      prompt: data.prompt || item.prompt,
                      step_key: data.step_key || item.step_key,
                      status: 'done',
                    }
                    : item,
                );
                setActiveConversationMessages(prev => prev.map(item => item.id === assistantId
                  ? { ...item, tool_calls: currentToolCalls }
                  : item));
                setAgentMeta(prev => {
                  const next = new Map(prev);
                  next.set(assistantId, {
                    ...next.get(assistantId),
                    toolCalls: currentToolCalls,
                  });
                  return next;
                });
              } else if (data.type === 'phase') {
                updateTurnStatus(data.phase === 'generating' ? 'finalizing' : 'assistant_pending', data.phase === 'generating' ? '正在整理回答...' : '正在处理...');
                setAgentMeta(prev => {
                  const next = new Map(prev);
                  next.set(assistantId, {
                    ...next.get(assistantId),
                    phase: data.phase,
                  });
                  return next;
                });
              } else if (data.type === 'runtime_state' && data.runtime_state) {
                const runtimeState = data.runtime_state as Record<string, unknown>;
                setActiveConversationMessages(prev => prev.map(item => item.id === assistantId
                  ? { ...item, metadata: { ...(item.metadata || {}), runtime_state: runtimeState } }
                  : item));
              } else if (data.type === 'content') {
                updateTurnStatus('streaming', '正在生成回答...');
                accumulated += data.content;
                setActiveConversationMessages(prev => prev.map(item => item.id === assistantId ? { ...item, content: accumulated } : item));
              } else if (data.type === 'route') {
                if (data.intent && data.intent !== 'general') {
                  setCurrentAgent(intentToAgent(data.intent as IntentType));
                }
              } else if (data.type === 'error') {
                setActiveConversationMessages(prev => prev.map(item => item.id === assistantId
                  ? { ...item, content: data.error || '生成回复时出现错误，请稍后重试。' }
                  : item));
              } else if (data.type === 'done') {
                if (data.termination === 'server_done' || data.termination === 'server_terminated') {
                  serverDoneReceived = true;
                }
                updateTurnStatus('finalizing', '正在整理回答...');
                if (data.metadata && typeof data.metadata === 'object') {
                  responseMetadata = data.metadata as Record<string, unknown>;
                  const metadataProcessEvents = Array.isArray(responseMetadata.process_events)
                    ? responseMetadata.process_events as AgentProcessEvent[]
                    : [];
                  if (metadataProcessEvents.length > 0) {
                    currentProcessEvents = metadataProcessEvents;
                  }
                  const workflowCard = workflowCardFromProcessEvents(currentProcessEvents);
                  setActiveConversationMessages(prev => prev.map(item => item.id === assistantId
                    ? {
                      ...item,
                      metadata: {
                        ...responseMetadata,
                        ...(workflowCard ? { workflow_card: workflowCard } : {}),
                      },
                      process_events: currentProcessEvents,
                    }
                    : item));
                }
                if (data.result) {
                  responseResult = data.result as Record<string, unknown>;
                  if (activeConversationIdRef.current === convId) {
                    setCurrentResult(data.result);
                  }
                  setActiveConversationMessages(prev => prev.map(item => item.id === assistantId
                    ? { ...item, metadata: { ...(item.metadata || {}), workflow_result: responseResult } }
                    : item));
                }
                setAgentMeta(prev => {
                  const next = new Map(prev);
                  next.set(assistantId, {
                    ...next.get(assistantId),
                    phase: 'done',
                  });
                  return next;
                });
              } else if (data.type === 'trace_data' && data.data) {
                setCallChainData(data.data as CallChainData);
              }
            } catch {
              // ignore malformed sse
            }
          }
        }

        const workflowResult = responseResult && typeof responseResult === 'object'
          ? responseResult as Record<string, unknown>
          : responseMetadata && typeof responseMetadata === 'object' && (responseMetadata as Record<string, unknown>).workflow_result && typeof (responseMetadata as Record<string, unknown>).workflow_result === 'object'
            ? (responseMetadata as Record<string, unknown>).workflow_result as Record<string, unknown>
            : null;
        const structuredFollowUpPayload = workflowResult && typeof workflowResult === 'object'
          ? workflowResult.structured_payload
          : undefined;
        const hasStructuredFollowUp = Boolean(
          structuredFollowUpPayload && typeof structuredFollowUpPayload === 'object' && (
            'confirmation_needed' in structuredFollowUpPayload ||
            'follow_up' in structuredFollowUpPayload ||
            'follow_up_title' in structuredFollowUpPayload ||
            'follow_up_fields' in structuredFollowUpPayload
          ),
        );
        const publicWebMetadata = responseMetadata?.response_contract && typeof responseMetadata.response_contract === 'object'
          ? (responseMetadata.response_contract as Record<string, unknown>)
          : undefined;
        const publicWebReasonCode = publicWebMetadata?.metadata && typeof publicWebMetadata.metadata === 'object'
          ? (publicWebMetadata.metadata as Record<string, unknown>).public_web
          : undefined;
        const publicWebReasonCodeText = typeof (publicWebReasonCode as Record<string, unknown>)?.reasonCode === 'string'
          ? String((publicWebReasonCode as Record<string, unknown>).reasonCode)
          : '';
        const publicWebReasonContext = publicWebReasonCode ? (publicWebReasonCode as Record<string, unknown>).reasonContext : undefined;
        const publicWebFallbackMessage = publicWebReasonCodeText
          ? resolveChatAnswerMessage(publicWebReasonCodeText, typeof publicWebReasonContext === 'object' ? publicWebReasonContext as Record<string, unknown> : {})
          : '';
        const responseContractAnswer = publicWebMetadata?.answer_markdown && typeof publicWebMetadata.answer_markdown === 'string'
          ? publicWebMetadata.answer_markdown
          : (publicWebMetadata?.answer && typeof publicWebMetadata.answer === 'string'
            ? publicWebMetadata.answer
            : '');
        const finalAssistantContent = hasStructuredFollowUp
          ? ''
          : (accumulated || publicWebFallbackMessage || responseContractAnswer || '未生成有效回复');
        if (isTurnCancelled() && !serverDoneReceived) {
          return;
        }
        const finalTurnUiStatus = resolveFinalTurnUiStatus(responseMetadata, workflowResult, responseResult);

        const assistantMessagePayload = {
          content: finalAssistantContent,
          role: 'assistant',
          message_type: 'assistant_reply',
          agent: routing.is_business_related ? intentToAgent(routing.intent_type) : undefined,
          intent_type: routing.is_business_related ? routing.intent_type : undefined,
          thinking: currentThinking || undefined,
          thinking_steps: currentThinkingSteps.length > 0 ? currentThinkingSteps : currentThinking ? undefined : [
            { label: '识别问题', content: '判断用户意图并选择处理流程。', status: 'completed' },
            { label: '检索资料', content: currentToolCalls.length > 0 ? '已检索知识库并整理引用来源。' : '当前未返回可用工具检索结果。', status: 'completed' },
            { label: '生成回复', content: '根据可用上下文输出结构化回复。', status: 'completed' },
          ],
          tool_calls: currentToolCalls.length > 0 ? currentToolCalls : undefined,
          process_events: currentProcessEvents.length > 0 ? currentProcessEvents : undefined,
            metadata: {
              ...(responseMetadata || {}),
              turn_ui_status: finalTurnUiStatus,
              ...(currentProcessEvents.length > 0 ? { process_events: currentProcessEvents } : {}),
            ...(workflowCardFromProcessEvents(currentProcessEvents) ? { workflow_card: workflowCardFromProcessEvents(currentProcessEvents) } : {}),
            ...(responseResult ? { workflow_result: responseResult } : {}),
          },
        } satisfies Parameters<typeof xiaoqiaoApi.sendMessage>[1];
        let persistedAssistant: Message | null = null;
        try {
          persistedAssistant = await xiaoqiaoApi.sendMessage(convId, assistantMessagePayload);
        } catch (error) {
          console.debug('Persist assistant message failed; keeping streamed message in UI', error);
        }
        const finalAssistantMessage = normalizeMessage(persistedAssistant, {
          ...assistantMessage,
          content: finalAssistantContent,
          thinking: currentThinking || undefined,
          thinking_steps: currentThinkingSteps.length > 0 ? currentThinkingSteps : assistantMessage.thinking_steps,
          tool_calls: currentToolCalls.length > 0 ? currentToolCalls : undefined,
          process_events: currentProcessEvents.length > 0 ? currentProcessEvents : undefined,
            metadata: {
              ...(responseMetadata || {}),
              ...(currentProcessEvents.length > 0 ? { process_events: currentProcessEvents } : {}),
            ...(workflowCardFromProcessEvents(currentProcessEvents) ? { workflow_card: workflowCardFromProcessEvents(currentProcessEvents) } : {}),
            ...(responseResult ? { workflow_result: responseResult } : {}),
          },
        });
        setActiveConversationMessages(prev => prev.map(item => item.id === assistantId
          ? {
            ...finalAssistantMessage,
            thinking: currentThinking || undefined,
            thinking_steps: currentThinkingSteps.length > 0 ? currentThinkingSteps : currentThinking ? undefined : [
              { label: '识别问题', content: '判断用户意图并选择处理流程。', status: 'completed' },
              { label: '检索资料', content: currentToolCalls.length > 0 ? '已尝试检索知识库并整理引用来源。' : '当前未返回可用工具检索结果。', status: 'completed' },
              { label: '生成回复', content: '根据可用上下文输出结构化回复。', status: 'completed' },
            ],
            tool_calls: currentToolCalls.length > 0 ? currentToolCalls : undefined,
            process_events: currentProcessEvents.length > 0 ? currentProcessEvents : undefined,
            content: finalAssistantContent,
            metadata: {
              ...(responseMetadata || {}),
              turn_ui_status: finalTurnUiStatus,
              ...(currentProcessEvents.length > 0 ? { process_events: currentProcessEvents } : {}),
              ...(workflowCardFromProcessEvents(currentProcessEvents) ? { workflow_card: workflowCardFromProcessEvents(currentProcessEvents) } : {}),
              ...(responseResult ? { workflow_result: responseResult } : {}),
            },
          }
          : item));
        await refreshConversations();
        setIsTyping(false);
        clearConversationRunning(convId);
        if (activeTurnRef.current?.requestId === requestId) {
          activeTurnRef.current = null;
        }

        if (routing.is_business_related) {
          setConversationMode(routing.workflow_level === 'heavy' ? 'heavy-workflow' : 'light-workflow');

          if (routing.workflow_level === 'heavy' && missingFields.length > 0) {
            const clarificationId = nextMessageId();
            setTimeout(() => {
              const clarificationMessage: Message = {
                id: clarificationId,
                message_id: clarificationId,
                conversation_id: convId,
                role: 'assistant',
                content: `为了更好地处理本次问题，还需要补充以下信息：\n${missingFields.slice(0, 2).map(field => `- ${field.field_label}：${field.suggested_question}`).join('\n')}`,
                message_type: 'clarification' as MessageType,
                created_at: new Date().toISOString(),
                timestamp: Date.now(),
              };
              setActiveConversationMessages(prev => [...prev, clarificationMessage]);
            }, 600);
          }
        }
      } catch (error) {
        if (isTurnCancelled() || (error instanceof DOMException && error.name === 'AbortError')) {
          cancelledTurnIdsRef.current.add(requestId);
          setActiveConversationMessages(prev => prev.map(item => item.id === assistantId
            ? {
              ...item,
              content: item.content || '已停止生成',
              metadata: {
                ...(item.metadata || {}),
                turn_ui_status: 'cancelled' satisfies TurnUiStatus,
                turn_status_label: '已停止生成',
              },
            }
            : item));
          setAgentMeta(prev => {
            const next = new Map(prev);
            next.set(assistantId, { ...next.get(assistantId), phase: 'done' });
            return next;
          });
          setIsTyping(false);
          clearConversationRunning(convId);
          if (activeTurnRef.current?.requestId === requestId) {
            activeTurnRef.current = null;
          }
          return;
        }

        setIsTyping(false);
        clearConversationRunning(convId);
        setActiveConversationMessages(prev => prev.map(item => item.id === assistantId
          ? {
            ...item,
            content: '抱歉，连接出现问题，请稍后重试。',
            metadata: {
              ...(item.metadata || {}),
              turn_ui_status: 'failed' satisfies TurnUiStatus,
              turn_status_label: '生成失败',
            },
          }
          : item));
      }
    })().catch((error) => {
      console.error('sendMessage failed', error);
      setIsTyping(false);
      if (pendingConversationId) {
        clearConversationRunning(pendingConversationId);
        setConversationMessages(pendingConversationId, prev => prev.map(item => item.id === assistantId
          ? {
            ...item,
            content: item.content || '抱歉，连接出现问题，请稍后重试。',
            metadata: {
              ...(item.metadata || {}),
              turn_ui_status: 'failed' satisfies TurnUiStatus,
              turn_status_label: '生成失败',
            },
          }
          : item));
      } else if (targetConversationId) {
        clearConversationRunning(targetConversationId);
      }
    });
  }, [clearConversationRunning, conversations, debugCarryMemory, ensureConversation, markConversationRunning, messages, missingFields, moveConversationMessages, refreshConversations, setConversationMessages, setConversationMode, setCurrentAgent, transferConversationRunning]);

  const deleteMessage = useCallback((messageId: string) => {
    if (!activeConversationIdRef.current) return;
    setConversationMessages(activeConversationIdRef.current, prev => prev.filter(item => item.id !== messageId));
  }, [setConversationMessages]);

  const cancelStream = useCallback(() => {
    const activeTurn = activeTurnRef.current;
    if (activeTurn) {
      cancelledTurnIdsRef.current.add(activeTurn.requestId);
      setConversationMessages(activeTurn.conversationId, prev => prev.map(item => item.id === activeTurn.assistantId
        ? {
          ...item,
          content: item.content || '已停止生成',
          metadata: {
            ...(item.metadata || {}),
            turn_ui_status: 'cancel_requested' satisfies TurnUiStatus,
            turn_status_label: '正在停止生成...',
          },
        }
        : item));
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsTyping(false);
    if (activeTurn) {
      clearConversationRunning(activeTurn.conversationId);
      window.setTimeout(() => {
        setConversationMessages(activeTurn.conversationId, prev => prev.map(item => item.id === activeTurn.assistantId
          ? {
            ...item,
            content: item.content || '已停止生成',
            metadata: {
              ...(item.metadata || {}),
              turn_ui_status: 'cancelled' satisfies TurnUiStatus,
              turn_status_label: '已停止生成',
            },
          }
          : item));
      }, 0);
      activeTurnRef.current = null;
    }
  }, [clearConversationRunning, setConversationMessages]);

  return {
    conversations,
    activeConversationId,
    activeConversationTitle: conversations.find(item => item.conversation_id === activeConversationId)?.title || '小乔智投对话',
    messages,
    isLoadingMessages,
    isTyping: activeConversationId ? runningConversationIds.includes(activeConversationId) : false,
    runningConversationIds,
    currentRouting,
    currentAgent,
    currentResult,
    callChainData,
    sendMessage,
    createConversation,
    startBlankConversation,
    selectConversation,
    renameConversation,
    deleteConversation,
    refreshConversations,
    deleteMessage,
    cancelStream,
    agentMeta,
  };
}

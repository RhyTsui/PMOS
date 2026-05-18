'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useAgent } from './useAgent';
import { xiaoqiaoApi } from '@/lib/api';
import { routeUserIntent } from '@/lib/intent-router';
import { thinkingStepFromProcessEvent, toolCallFromProcessEvent } from '@/lib/agent-runtime';
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

const MEMORY_USER_ID = 'user-001';
const DEBUG_MEMORY_KEY = 'zhitou-chat-debug-context';

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
    demand: 'demand',
    diagnosis: 'diagnosis',
    debugging: 'debugging',
    monitor: 'monitoring',
    'material-analysis': 'material',
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
  const lower = content.toLowerCase();

  if (/(新增媒体|新媒体|媒体对接|接入媒体|对接文档|监测链接|需求表单|需求池|回传对接)/.test(lower)) {
    return { intent_type: 'demand', is_business_related: true, workflow_level: 'heavy' };
  }
  if (/(立即联调|开始联调|扫码联调|联调地址|联调文档|巨量|wuyanlan@dobest\.com)/.test(lower)) {
    return { intent_type: 'debugging', is_business_related: true, workflow_level: 'heavy' };
  }

  if (/(差距|不一致|异常|对不上|缺失|gap|排查|问题|为什么|偏差)/.test(lower)) {
    return { intent_type: 'diagnosis', is_business_related: true, workflow_level: 'heavy' };
  }
  if (/(联调|测试|回传|调试|debug|验证|准备)/.test(lower)) {
    return { intent_type: 'debugging', is_business_related: true, workflow_level: 'heavy' };
  }
  if (/(需求|接入|对接|新媒|配置|事件映射|埋点)/.test(lower)) {
    return { intent_type: 'demand', is_business_related: true, workflow_level: 'heavy' };
  }
  if (/(什么|怎么|如何|哪个系统|在哪|口径|指标|解释|说明)/.test(lower)) {
    return { intent_type: 'help', is_business_related: true, workflow_level: 'light' };
  }
  if (/(监控|延迟|上报|归因监控|回推)/.test(lower)) {
    return { intent_type: 'monitor', is_business_related: true, workflow_level: 'light' };
  }
  if (/(预测|roi|ltv|回本|测算)/.test(lower)) {
    return { intent_type: 'forecast', is_business_related: true, workflow_level: 'light' };
  }

  return { intent_type: 'general', is_business_related: false, workflow_level: 'light' };
}

function isMediaDemand(content: string): boolean {
  return /(新增媒体|新媒体|媒体对接|接入媒体|对接文档|监测链接|回传对接|318\s*媒体|318媒体)/i.test(content);
}

function isLegacyMediaDebug(content: string): boolean {
  return /(巨量|穿山甲|抖音|今日头条|小米|网易有道|UC头条).*(联调|测试|验证)|(?:联调|测试|验证).*(巨量|穿山甲|抖音|今日头条|小米|网易有道|UC头条)|wuyanlan@dobest\.com/i.test(content);
}

function isDebugExecutionStart(content: string): boolean {
  return /^发起联调[:：]/i.test(content.trim());
}

function isReportComposerIntent(content: string): boolean {
  const text = content.trim();
  const hasReportGoal = /(日报|周报|月报|报表|拼表|取数|查数|数据表|消耗日报|广告消耗)/i.test(text);
  const hasScheduleOrBuild = /(每天|每日|上午|下午|定时|发送|创建|生成|立即获取|截图|excel|模板|指标|维度|小闪|知识库)/i.test(text);
  return hasReportGoal && hasScheduleOrBuild;
}

function isMonitorTaskIntent(content: string): boolean {
  const text = content.trim();
  const hasMonitorGoal = /(监控|告警|报警|提醒|阈值|超过\s*\d+\s*分钟|回传延迟|callback.*delay|postback.*delay)/i.test(text);
  const hasMonitorObject = /(巨量|穿山甲|抖音|回传|归因|延迟|分钟|媒体)/i.test(text);
  return hasMonitorGoal && hasMonitorObject;
}

function isBroadAnomalyInspectionIntent(content: string): boolean {
  const text = content.trim();
  const hasBroadCheck = /(看看|看下|检查|巡检|有没有|是否有|有什么|哪些).*(投放|广告|项目).*(异常|问题|波动)|投放.*异常|广告.*异常/i.test(text);
  const hasTime = /(昨天|昨日|今天|今日|近\s*\d+\s*天|过去\s*\d+\s*天)/i.test(text);
  const hasSpecificDiff = /(不一致|对不上|差异|少了|多了|缺口|预期值|媒体ID|账户ID|指标[:：]|APPID[:：])/i.test(text);
  return hasBroadCheck && hasTime && !hasSpecificDiff;
}

function extractProjectContext(content: string): string {
  const matched = content.match(/\[项目上下文\]\s*([\s\S]*)$/);
  return matched?.[1]?.trim() || '使用顶部项目选择器中的当前项目范围';
}

function extractProjectNameFromContext(content: string): string {
  const contextName = /项目范围：([^(\n]+)/.exec(content)?.[1]?.trim();
  if (contextName && contextName !== '全部项目') return contextName;
  return '';
}

function extractDebugAppName(content: string): string {
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
  if (!carry.hasDebugContext || !appSwitch || !isEllipticalSwitch) return trimmed;
  return [
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

function buildMediaDemandMessage(convId: string, content: string): Message {
  const id = nextMessageId();
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
      '## 新增媒体对接需要先完成需求表单',
      '',
      '我已把这次输入识别为新增媒体对接需求。接下来不直接给建议，需要先完成必填依赖校验。',
      '',
      '### 必填依赖',
      '- 媒体名称与平台归属',
      '- 对接文档或回传说明',
      '- 监测链接参数规则',
      '- 可回传事件类型',
      '- 回传验收方式',
      '',
      '表单提交后会先做校验：通过则提示可以立即去后台创建监测链接；如果需要特殊处理，会生成需求并记录到需求池，链接可先行创建，后续联调时间会继续通知。',
    ].join('\n'),
    thinking_steps: [
      { label: '识别需求', content: '判断为新增媒体对接，进入需求 Agent 必经流程。', status: 'completed' },
      { label: '依赖校验', content: '需要先收齐对接文档、监测链接规则、事件清单和验收方式。', status: 'completed' },
      { label: '下一步', content: '生成结构化表单，支持保存到代办并从右侧继续处理。', status: 'completed' },
    ],
    metadata: {
      workflow_card: {
        type: 'media_onboarding',
        status: 'missing_dependencies',
        title: '新增媒体对接',
        sourceText: content,
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
  status: 'matched' | 'not_found' | 'empty_result' | 'missing_account_id' | 'missing_advertiser_id' | 'failed' | 'not_configured';
  message: string;
  tool?: string;
  server?: string;
  latency_ms?: number;
  checked_count?: number;
  matched_count?: number;
  temporary_pass?: boolean;
  temporary_reason?: string;
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
    : check.temporary_pass
      ? `应用权限校验已临时放行，可以继续发起自动联调。\n\n临时放行原因：${check.temporary_reason || check.message}`
      : '应用权限校验已通过，可以继续发起自动联调。';
  const checkStep = {
    key: 'mcp_oceanengine_app_list',
    label: '调用巨量应用列表',
    content: [
      `工具：${check.tool || 'tools_app_management_android_app_list_v2'}`,
      `结果：${check.message}`,
      check.temporary_pass ? `临时放行：${check.temporary_reason || '巨量 MCP 当前不可用，先按用户要求放行该环节'}` : '',
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

export function useConversation() {
  const {
    currentAgent,
    setCurrentAgent,
    setConversationMode,
    missingFields,
  } = useAgent();

  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [agentMeta, setAgentMeta] = useState<Map<string, AgentMeta>>(new Map());
  const [currentRouting, setCurrentRouting] = useState<{
    intent_type: IntentType;
    is_business_related: boolean;
  } | null>(null);
  const [currentResult, setCurrentResult] = useState<Record<string, unknown> | null>(null);
  const [callChainData, setCallChainData] = useState<CallChainData | null>(null);
  const [debugCarryMemory, setDebugCarryMemory] = useState<DebugCarryMemory>({});
  const abortControllerRef = useRef<AbortController | null>(null);
  const skipNextLoadRef = useRef<string | null>(null);
  const activeConversationIdRef = useRef<string | null>(null);

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    void fetchDebugMemory().then(setDebugCarryMemory);
  }, []);

  const refreshConversations = useCallback(async (options: { activateFirst?: boolean } = {}) => {
    const list = await xiaoqiaoApi.getConversations();
    setConversations(list);
    if (options.activateFirst && !activeConversationIdRef.current && list[0]) {
      activeConversationIdRef.current = list[0].conversation_id;
      setActiveConversationId(list[0].conversation_id);
    }
    return list;
  }, []);

  const loadMessages = useCallback(async (conversationId: string) => {
    const nextMessages = await xiaoqiaoApi.getMessages(conversationId);
    setMessages(nextMessages);
  }, []);

  useEffect(() => {
    void refreshConversations({ activateFirst: true });
  }, [refreshConversations]);

  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }
    if (skipNextLoadRef.current === activeConversationId) {
      skipNextLoadRef.current = null;
      return;
    }
    void loadMessages(activeConversationId);
  }, [activeConversationId, loadMessages]);

  const ensureConversation = useCallback(async (content: string) => {
    if (activeConversationId) {
      return activeConversationId;
    }
    const conversation = await xiaoqiaoApi.createConversation({ title: content });
    setConversations(prev => [conversation, ...prev]);
    skipNextLoadRef.current = conversation.conversation_id;
    activeConversationIdRef.current = conversation.conversation_id;
    setActiveConversationId(conversation.conversation_id);
    return conversation.conversation_id;
  }, [activeConversationId]);

  const createConversation = useCallback(async (title?: string) => {
    const conversation = await xiaoqiaoApi.createConversation({ title: title || '新对话' });
    setConversations(prev => [conversation, ...prev]);
    skipNextLoadRef.current = conversation.conversation_id;
    activeConversationIdRef.current = conversation.conversation_id;
    setActiveConversationId(conversation.conversation_id);
    setMessages([]);
    setCurrentResult(null);
    setCallChainData(null);
    void refreshConversations();
    return conversation;
  }, [refreshConversations]);

  const selectConversation = useCallback((conversationId: string) => {
    activeConversationIdRef.current = conversationId;
    setActiveConversationId(conversationId);
    setCurrentResult(null);
    setCallChainData(null);
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
        activeConversationIdRef.current = next[0]?.conversation_id || null;
        setActiveConversationId(next[0]?.conversation_id || null);
        setMessages([]);
        setCurrentResult(null);
        setCallChainData(null);
      }
      return next;
    });
  }, [activeConversationId]);

  const sendMessage = useCallback((content: string, targetConversationId?: string, options?: { projectContext?: string }) => {
    const trimmed = content.trim();
    if (!trimmed) return;
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

    void (async () => {
      const routing = routeUserIntent(effectiveContent);
      let convId = targetConversationId || await ensureConversation(trimmed);
      rememberDebugContext(effectiveContent, convId);
      let userMessage: Message;
      try {
        userMessage = await xiaoqiaoApi.sendMessage(convId, {
          content: trimmed,
          role: 'user',
          message_type: 'user_input',
        });
      } catch (error) {
        const missingConversation = error instanceof Error && /404|not found/i.test(error.message);
        if (!missingConversation) throw error;
        const conversation = await xiaoqiaoApi.createConversation({ title: '新对话' });
        convId = conversation.conversation_id;
        setConversations(prev => [conversation, ...prev.filter(item => item.conversation_id !== conversation.conversation_id)]);
        skipNextLoadRef.current = conversation.conversation_id;
        activeConversationIdRef.current = conversation.conversation_id;
        setActiveConversationId(conversation.conversation_id);
        userMessage = await xiaoqiaoApi.sendMessage(convId, {
          content: trimmed,
          role: 'user',
          message_type: 'user_input',
        });
      }

      setCurrentRouting(routing);
      if (routing.is_business_related) {
        setCurrentAgent(intentToAgent(routing.intent_type));
      }

      setMessages(prev => [...prev, userMessage]);
      const currentConversation = conversations.find(item => item.conversation_id === convId);
      const titleNeedsModel =
        messages.length === 0 &&
        (!currentConversation ||
          currentConversation.title === trimmed ||
          currentConversation.title === '新对话' ||
          currentConversation.title === '鏂板璇?');
      if (titleNeedsModel) {
        void (async () => {
          try {
            const { title } = await xiaoqiaoApi.generateConversationTitle(convId, {
              message: trimmed,
              history: messages.map(item => ({ role: item.role, content: item.content })),
            });
            const nextTitle = title.trim();
            if (!nextTitle || nextTitle === currentConversation?.title) return;
            const updated = await xiaoqiaoApi.updateConversation(convId, { title: nextTitle });
            setConversations(prev => prev.map(item => item.conversation_id === convId ? updated : item));
          } catch {
            // 标题生成不阻塞会话回复。
          }
        })();
      }
      await refreshConversations();

      if (isMonitorTaskIntent(effectiveContent)) {
        const monitorMessage = buildMonitorTaskMessage(convId, effectiveContent);
        void xiaoqiaoApi.sendMessage(convId, {
          content: monitorMessage.content,
          role: 'assistant',
          message_type: monitorMessage.message_type,
          agent: monitorMessage.agent,
          intent_type: monitorMessage.intent_type,
          thinking_steps: monitorMessage.thinking_steps,
          tool_calls: monitorMessage.tool_calls,
          metadata: monitorMessage.metadata,
        }).catch(() => undefined);
        setMessages(prev => [...prev, monitorMessage]);
        setCurrentAgent('monitoring');
        setConversationMode('heavy-workflow');
        setCurrentResult({
          task_id: `task-${Date.now()}`,
          result_type: 'monitor_snapshot',
          summary: '已生成回传延迟监控任务确认卡，等待用户确认创建。',
          confidence: 'high',
          structured_payload: monitorMessage.metadata,
          next_actions: [],
          pending_checks: ['确认监控条件', '创建监控任务', '异常触发后自动排查'],
          created_at: new Date().toISOString(),
          kind: 'monitor',
        });
        setIsTyping(false);
        return;
      }

      if (isBroadAnomalyInspectionIntent(effectiveContent)) {
        const inspectionMessage = buildBroadInspectionMessage(convId, effectiveContent);
        void xiaoqiaoApi.sendMessage(convId, {
          content: inspectionMessage.content,
          role: 'assistant',
          message_type: inspectionMessage.message_type,
          agent: inspectionMessage.agent,
          intent_type: inspectionMessage.intent_type,
          thinking_steps: inspectionMessage.thinking_steps,
          tool_calls: inspectionMessage.tool_calls,
          metadata: inspectionMessage.metadata,
        }).catch(() => undefined);
        setMessages(prev => [...prev, inspectionMessage]);
        setCurrentAgent('monitoring');
        setConversationMode('heavy-workflow');
        setCurrentResult({
          task_id: `task-${Date.now()}`,
          result_type: 'monitor_snapshot',
          summary: '已进入项目级投放异常巡检，未发现具体异常前不创建排查表单。',
          confidence: 'high',
          structured_payload: inspectionMessage.metadata,
          next_actions: [],
          pending_checks: ['项目全链路巡检', '异常项分流', '必要时进入排查'],
          created_at: new Date().toISOString(),
          kind: 'monitor',
        });
        setIsTyping(false);
        return;
      }

      if (routing.intent_type === 'diagnosis' && routing.clarification_needed && routing.missing_fields.length > 0) {
        const clarificationId = nextMessageId();
        const clarificationMessage: Message = {
          id: clarificationId,
          message_id: clarificationId,
          conversation_id: convId,
          role: 'assistant',
          content: '我可以继续排查，但当前条件还不够。请先补充下面几项信息，我会基于这些条件创建排查记录并继续定位。',
          message_type: 'clarification' as MessageType,
          created_at: new Date().toISOString(),
          timestamp: Date.now(),
          agent: 'diagnosis',
          intent_type: 'diagnosis',
          missing_fields: routing.missing_fields,
          thinking_steps: [
            {
              label: '识别排查意图',
              content: routing.reason,
              status: 'completed',
            },
            {
              label: '检查排查条件',
              content: `缺少 ${routing.missing_fields.map((field) => field.field_label).join('、')}，暂不生成排查结论。`,
              status: 'completed',
            },
          ],
          metadata: {
            routing_decision: routing,
            clarification_type: 'diagnosis_required_slots',
          },
        };

        void xiaoqiaoApi.sendMessage(convId, {
          content: clarificationMessage.content,
          role: 'assistant',
          message_type: clarificationMessage.message_type,
          agent: clarificationMessage.agent,
          intent_type: clarificationMessage.intent_type,
          missing_fields: clarificationMessage.missing_fields,
          thinking_steps: clarificationMessage.thinking_steps,
          metadata: clarificationMessage.metadata,
        }).catch(() => undefined);
        setMessages(prev => [...prev, clarificationMessage]);
        setCurrentAgent('diagnosis');
        setConversationMode('heavy-workflow');
        setCurrentResult({
          task_id: `task-${Date.now()}`,
          result_type: 'diagnosis_report',
          summary: '排查条件不足，等待用户补充必要信息。',
          confidence: 'medium',
          structured_payload: {
            status: 'waiting_for_clarification',
            missing_fields: routing.missing_fields,
          },
          next_actions: [],
          pending_checks: routing.missing_fields.map((field) => field.field_label),
          created_at: new Date().toISOString(),
          kind: 'diagnosis',
        });
        setIsTyping(false);
        return;
      }

      if (isDebugExecutionStart(trimmed)) {
        const executionMessage = buildDebugExecutionMessage(convId, trimmed);
        setMessages(prev => [...prev, executionMessage]);
        setCurrentAgent('debugging');
        setConversationMode('heavy-workflow');
        setCurrentResult(executionMessage.metadata?.workflow_result as Record<string, unknown>);
        setIsTyping(false);
        return;
      }

      if (isReportComposerIntent(effectiveContent)) {
        const reportMessage = buildReportComposerMessage(convId, effectiveContent);
        void xiaoqiaoApi.sendMessage(convId, {
          content: reportMessage.content,
          role: 'assistant',
          message_type: reportMessage.message_type,
          agent: reportMessage.agent,
          intent_type: reportMessage.intent_type,
          metadata: reportMessage.metadata,
        }).catch(() => undefined);
        setMessages(prev => [...prev, reportMessage]);
        setCurrentAgent('help');
        setConversationMode('heavy-workflow');
        setCurrentResult({
          task_id: `task-${Date.now()}`,
          result_type: 'report_composer',
          summary: '已生成广告消耗日报模板，等待用户确认后查询数据并创建定时报表。',
          confidence: 'high',
          structured_payload: reportMessage.metadata,
          next_actions: [],
          pending_checks: ['确认报表模板', '查询报表数据', '创建定时报表'],
          created_at: new Date().toISOString(),
          kind: 'report',
        });
        setIsTyping(false);
        return;
      }

      if (isMediaDemand(effectiveContent) || isLegacyMediaDebug(effectiveContent) || /\[多轮上下文\][\s\S]*上一轮意图=自动联调/.test(effectiveContent)) {
        let flowMessage = isMediaDemand(effectiveContent)
          ? buildMediaDemandMessage(convId, effectiveContent)
          : buildLegacyDebugMessage(convId, effectiveContent);
        let startedDebugTask: DebugAutomationTask | null = null;
        if (!isMediaDemand(effectiveContent)) {
          const appCheck = await checkOceanEngineAppPermission(effectiveContent);
          flowMessage = withOceanEngineAppCheck(flowMessage, appCheck);
          if (appCheck?.status === 'matched') {
            try {
              startedDebugTask = await startDebugTaskAfterAppCheck(convId, effectiveContent, appCheck);
              if (startedDebugTask) {
                const startStep = {
                  key: 'mcp_debug_start_task',
                  label: '发起自动联调',
                  content: '',
                  status: 'completed' as const,
                  duration_ms: 500,
                  input: {
                    project: appCheck.matched_apps?.[0]?.app_name || extractDebugAppName(effectiveContent),
                    media: '巨量引擎',
                    terminal: /ios|iOS|苹果/i.test(effectiveContent) ? 'iOS' : 'Android',
                    targets: ['激活', '注册', '付费', '关键行为'],
                  },
                  output: {
                    task_id: startedDebugTask.id,
                    status: startedDebugTask.status,
                    current_stage: startedDebugTask.current_stage,
                  },
                };
                flowMessage = {
                  ...flowMessage,
                  content: '',
                  thinking_steps: [
                    ...(flowMessage.thinking_steps || []),
                    startStep,
                    {
                      key: 'mcp_debug_watch_steps',
                      label: '进入联调观测',
                      content: '已进入 Web、Mobile/Game、回传轮询步骤观测；右侧联调记录会持续展示执行步骤、截图、错误日志和回传结果。',
                      status: 'loading' as const,
                      duration_ms: 0,
                      input: { task_id: startedDebugTask.id },
                    },
                  ],
                  tool_calls: [
                    ...(flowMessage.tool_calls || []),
                    {
                      name: 'debug.start_task',
                      kind: 'mcp',
                      display_name: '自动联调 MCP.debug.start_task',
                      arguments: JSON.stringify({ task_id: startedDebugTask.id }),
                      result: `已启动：${startedDebugTask.current_stage || startedDebugTask.status}`,
                      status: 'done',
                      step_key: 'mcp_debug_start_task',
                    },
                    {
                      name: 'debug.watch_steps',
                      kind: 'mcp',
                      display_name: '自动联调 MCP.debug.watch_steps',
                      arguments: JSON.stringify({ task_id: startedDebugTask.id }),
                      result: '进入联调步骤观测',
                      status: 'running',
                      step_key: 'mcp_debug_watch_steps',
                    },
                  ],
                  metadata: {
                    ...flowMessage.metadata,
                    workflow_card: flowMessage.metadata?.workflow_card && typeof flowMessage.metadata.workflow_card === 'object'
                      ? {
                        ...flowMessage.metadata.workflow_card,
                        status: 'running',
                        debugTask: startedDebugTask,
                        summary: '已发起自动联调',
                      }
                      : flowMessage.metadata?.workflow_card,
                    workflow_result: {
                      task_id: startedDebugTask.id,
                      result_type: 'debug_automation',
                      summary: '已发起自动联调',
                      confidence: 'high',
                      structured_payload: { task: startedDebugTask, appCheck },
                      next_actions: [],
                      pending_checks: ['Web端准备', '移动端扫码', '事件回传轮询', '生成联调结论'],
                      created_at: new Date().toISOString(),
                      kind: 'debugging',
                    },
                  },
                };
              }
            } catch (error: unknown) {
              const detail = error instanceof Error ? error.message : String(error);
              flowMessage = {
                ...flowMessage,
                content: `应用权限校验已通过，但自动联调发起失败：${detail}`,
                thinking_steps: [
                  ...(flowMessage.thinking_steps || []),
                  {
                    key: 'mcp_debug_start_task',
                    label: '发起自动联调',
                    content: `调用自动联调 MCP 失败：${detail}`,
                    status: 'error' as const,
                    duration_ms: 0,
                  },
                ],
              };
            }
          }
        }
        void xiaoqiaoApi.sendMessage(convId, {
          content: flowMessage.content,
          role: 'assistant',
          message_type: flowMessage.message_type,
          agent: flowMessage.agent,
          intent_type: flowMessage.intent_type,
          missing_fields: flowMessage.missing_fields,
          thinking_steps: flowMessage.thinking_steps,
          tool_calls: flowMessage.tool_calls,
          metadata: flowMessage.metadata,
        }).catch(() => undefined);
        setMessages(prev => [...prev, flowMessage]);
        setCurrentAgent(flowMessage.agent || 'demand');
        setConversationMode('heavy-workflow');
        if (isMediaDemand(trimmed)) {
          setCurrentResult({
            task_id: `task-${Date.now()}`,
            result_type: 'demand_form',
            summary: '已生成新增媒体对接需求表单，等待补齐依赖信息。',
            confidence: 'high',
            structured_payload: flowMessage.metadata,
            next_actions: ['打开结构化表单', '记录到代办', '补齐对接文档'],
            pending_checks: ['对接文档', '监测链接参数规则', '事件清单', '验收方式'],
            created_at: new Date().toISOString(),
            kind: flowMessage.intent_type,
          });
        } else {
          setCurrentResult(
            startedDebugTask
              ? (flowMessage.metadata?.workflow_result as Record<string, unknown>)
              : null,
          );
        }
        setIsTyping(false);
        return;
      }

      const assistantId = nextMessageId();
      const assistantMessage: Message = {
        id: assistantId,
        message_id: assistantId,
        conversation_id: convId,
        role: 'assistant',
        content: '',
        message_type: 'assistant_reply' as MessageType,
        created_at: new Date().toISOString(),
        timestamp: Date.now(),
        agent: routing.is_business_related ? intentToAgent(routing.intent_type) : undefined,
        intent_type: routing.is_business_related ? routing.intent_type : undefined,
        thinking: '',
        tool_calls: [],
      };

      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(true);
      setAgentMeta(prev => {
        const next = new Map(prev);
        next.set(assistantId, { phase: 'thinking', toolCalls: [] });
        return next;
      });

      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      const history = [...messages, userMessage].map(item => ({
        role: item.role,
        content: item.content,
      }));

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-conversation-id': convId,
          },
          body: JSON.stringify({
            message: trimmed,
            history,
            intent: routing.intent_type,
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

              if (data.type === 'process_event' && data.event) {
                const event = data.event as AgentProcessEvent;
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
                setMessages(prev => prev.map(item => item.id === assistantId
                  ? {
                    ...item,
                    process_events: currentProcessEvents,
                    thinking_steps: currentThinkingSteps,
                    tool_calls: currentToolCalls.length > 0 ? currentToolCalls : item.tool_calls,
                    metadata: {
                      ...(item.metadata || {}),
                      process_events: currentProcessEvents,
                    },
                  }
                  : item));
              } else if (data.type === 'thinking') {
                currentThinking += data.content;
                setMessages(prev => prev.map(item => item.id === assistantId
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
                setMessages(prev => prev.map(item => item.id === assistantId
                  ? { ...item, thinking_steps: currentThinkingSteps }
                  : item));
              } else if (data.type === 'tool_call') {
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
                setMessages(prev => prev.map(item => item.id === assistantId
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
                setMessages(prev => prev.map(item => item.id === assistantId
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
                setAgentMeta(prev => {
                  const next = new Map(prev);
                  next.set(assistantId, {
                    ...next.get(assistantId),
                    phase: data.phase,
                  });
                  return next;
                });
              } else if (data.type === 'content') {
                accumulated += data.content;
                setMessages(prev => prev.map(item => item.id === assistantId ? { ...item, content: accumulated } : item));
              } else if (data.type === 'route') {
                if (data.intent && data.intent !== 'general') {
                  setCurrentAgent(intentToAgent(data.intent as IntentType));
                }
              } else if (data.type === 'error') {
                setMessages(prev => prev.map(item => item.id === assistantId
                  ? { ...item, content: data.error || '生成回复时出现错误，请稍后重试。' }
                  : item));
              } else if (data.type === 'done') {
                if (data.metadata && typeof data.metadata === 'object') {
                  responseMetadata = data.metadata as Record<string, unknown>;
                  const metadataProcessEvents = Array.isArray(responseMetadata.process_events)
                    ? responseMetadata.process_events as AgentProcessEvent[]
                    : [];
                  if (metadataProcessEvents.length > 0) {
                    currentProcessEvents = metadataProcessEvents;
                  }
                  setMessages(prev => prev.map(item => item.id === assistantId
                    ? { ...item, metadata: responseMetadata, process_events: currentProcessEvents }
                    : item));
                }
                if (data.result) {
                  responseResult = data.result as Record<string, unknown>;
                  setCurrentResult(data.result);
                  setMessages(prev => prev.map(item => item.id === assistantId
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

        const persistedAssistant = await xiaoqiaoApi.sendMessage(convId, {
          content: accumulated || '未生成有效回复',
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
            ...(currentProcessEvents.length > 0 ? { process_events: currentProcessEvents } : {}),
            ...(responseResult ? { workflow_result: responseResult } : {}),
          },
        });
        setMessages(prev => prev.map(item => item.id === assistantId
          ? {
            ...persistedAssistant,
            thinking: currentThinking || undefined,
            thinking_steps: currentThinkingSteps.length > 0 ? currentThinkingSteps : currentThinking ? undefined : [
              { label: '识别问题', content: '判断用户意图并选择处理流程。', status: 'completed' },
              { label: '检索资料', content: currentToolCalls.length > 0 ? '已尝试检索知识库并整理引用来源。' : '当前未返回可用工具检索结果。', status: 'completed' },
              { label: '生成回复', content: '根据可用上下文输出结构化回复。', status: 'completed' },
            ],
            tool_calls: currentToolCalls.length > 0 ? currentToolCalls : undefined,
            process_events: currentProcessEvents.length > 0 ? currentProcessEvents : undefined,
            metadata: {
              ...(responseMetadata || {}),
              ...(currentProcessEvents.length > 0 ? { process_events: currentProcessEvents } : {}),
              ...(responseResult ? { workflow_result: responseResult } : {}),
            },
          }
          : item));
        await refreshConversations();
        setIsTyping(false);

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
              setMessages(prev => [...prev, clarificationMessage]);
            }, 600);
          }
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        setIsTyping(false);
        setMessages(prev => prev.map(item => item.id === assistantId
          ? { ...item, content: '抱歉，连接出现问题，请稍后重试。' }
          : item));
      }
    })();
  }, [conversations, debugCarryMemory, messages, ensureConversation, missingFields, refreshConversations, setConversationMode, setCurrentAgent]);

  const deleteMessage = useCallback((messageId: string) => {
    setMessages(prev => prev.filter(item => item.id !== messageId));
  }, []);

  const cancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsTyping(false);
  }, []);

  return {
    conversations,
    activeConversationId,
    activeConversationTitle: conversations.find(item => item.conversation_id === activeConversationId)?.title || '智投chat对话',
    messages,
    isTyping,
    currentRouting,
    currentAgent,
    currentResult,
    callChainData,
    sendMessage,
    createConversation,
    selectConversation,
    renameConversation,
    deleteConversation,
    refreshConversations,
    deleteMessage,
    cancelStream,
    agentMeta,
  };
}

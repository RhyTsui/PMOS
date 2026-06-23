import type { AutomationIntentResult, TaskProposalPayload } from '@/types';
import { guessTemplateFromInput } from '@/contracts/automation/task-template-registry';

/**
 * Automation Intent Router
 *
 * 识别用户是否要创建、修改、暂停、恢复、删除、重跑、查看任务。
 * 基于通用任务动作词 + 受治理模板注册表进行初步判断，后续可接入 LLM prompt。
 */

interface AutomationIntentInput {
  message: string;
  history?: Array<{ role: string; content: string; intent_type?: string; metadata?: Record<string, unknown> }>;
  currentTaskId?: string;
}

/**
 * 识别自动化意图
 *
 * 该路由只产出候选意图，不授权高风险执行；风险与确认仍由生命周期和风险策略处理。
 */
export function detectAutomationIntent(input: AutomationIntentInput): AutomationIntentResult {
  const message = input.message.trim();
  const lowerMessage = message.toLowerCase();
  const templateId = guessTemplateFromInput(message);
  const latestProposal = extractTaskProposalFromHistory(input.history);

  if (isConfirmationIntent(lowerMessage) && latestProposal) {
    return {
      automation_intent: 'confirm',
      target_task_ref: resolveTargetRef(input),
      requires_confirmation: false,
      risk_level: 'L0',
      template_id: latestProposal.template_id,
      slots: {},
      missing_slots: [],
    };
  }

  if (isCancellationIntent(lowerMessage) && latestProposal) {
    return {
      automation_intent: 'cancel',
      target_task_ref: resolveTargetRef(input),
      requires_confirmation: false,
      risk_level: 'L0',
      slots: {},
      missing_slots: [],
    };
  }

  if (matchesAny(lowerMessage, ACTION_PATTERNS.delete)) {
    return {
      automation_intent: 'delete',
      target_task_ref: resolveTargetRef(input),
      requires_confirmation: true,
      risk_level: 'L0',
      slots: {},
      missing_slots: [],
    };
  }

  if (matchesAny(lowerMessage, ACTION_PATTERNS.pause)) {
    return {
      automation_intent: 'pause',
      target_task_ref: resolveTargetRef(input),
      requires_confirmation: false,
      risk_level: 'L0',
      slots: {},
      missing_slots: [],
    };
  }

  if (matchesAny(lowerMessage, ACTION_PATTERNS.resume)) {
    return {
      automation_intent: 'resume',
      target_task_ref: resolveTargetRef(input),
      requires_confirmation: false,
      risk_level: 'L0',
      slots: {},
      missing_slots: [],
    };
  }

  if (matchesAny(lowerMessage, ACTION_PATTERNS.rerun)) {
    return {
      automation_intent: 'rerun',
      target_task_ref: resolveTargetRef(input),
      requires_confirmation: false,
      risk_level: 'L0',
      slots: {},
      missing_slots: [],
    };
  }

  if (matchesAny(lowerMessage, ACTION_PATTERNS.update)) {
    return {
      automation_intent: 'update',
      target_task_ref: resolveTargetRef(input),
      requires_confirmation: false,
      risk_level: 'L0',
      slots: extractUpdateSlots(lowerMessage),
      missing_slots: [],
    };
  }

  if (matchesAny(lowerMessage, ACTION_PATTERNS.status)) {
    return {
      automation_intent: 'ask_status',
      target_task_ref: resolveTargetRef(input),
      requires_confirmation: false,
      risk_level: 'L0',
      slots: {},
      missing_slots: [],
    };
  }

  if (matchesAny(lowerMessage, ACTION_PATTERNS.history)) {
    return {
      automation_intent: 'ask_history',
      target_task_ref: resolveTargetRef(input),
      requires_confirmation: false,
      risk_level: 'L0',
      slots: {},
      missing_slots: [],
    };
  }

  if (templateId || hasCreateSignal(lowerMessage)) {
    return {
      automation_intent: 'create',
      target_task_ref: 'unknown',
      requires_confirmation: true,
      risk_level: templateId ? getTemplateRiskLevel(templateId) : 'L1',
      template_id: templateId,
      slots: extractCreateSlots(lowerMessage),
      missing_slots: [],
    };
  }

  return {
    automation_intent: 'none',
    target_task_ref: 'unknown',
    requires_confirmation: false,
    risk_level: 'L0',
    slots: {},
    missing_slots: [],
  };
}

/**
 * 从历史消息中提取最近的 task_proposal 结构化卡片。
 */
export function extractTaskProposalFromHistory(
  history?: Array<{ role: string; content: string; metadata?: Record<string, unknown> }>,
): TaskProposalPayload | undefined {
  if (!Array.isArray(history)) return undefined;

  for (let i = history.length - 1; i >= 0; i--) {
    const item = history[i];
    if (!item || item.role !== 'assistant') continue;

    const metadata = item.metadata;
    if (!metadata || typeof metadata !== 'object') continue;

    const taskProposal = metadata.task_proposal;
    if (!taskProposal || typeof taskProposal !== 'object') continue;

    const proposal = taskProposal as Partial<TaskProposalPayload>;
    if (
      typeof proposal.task_title === 'string'
      && proposal.task_title.trim()
      && typeof proposal.schedule_label === 'string'
      && proposal.schedule_label.trim()
      && typeof proposal.risk_level === 'string'
      && typeof proposal.scope_summary === 'string'
      && typeof proposal.output_summary === 'string'
    ) {
      return {
        task_title: proposal.task_title,
        description: typeof proposal.description === 'string' ? proposal.description : '',
        template_id: typeof proposal.template_id === 'string' ? proposal.template_id : undefined,
        schedule_label: proposal.schedule_label,
        risk_level: proposal.risk_level as 'L0' | 'L1' | 'L2' | 'L3' | 'L4' | 'L5',
        risk_description: typeof proposal.risk_description === 'string' ? proposal.risk_description : undefined,
        scope_summary: proposal.scope_summary,
        output_summary: proposal.output_summary,
        missing_slots: Array.isArray(proposal.missing_slots)
          ? proposal.missing_slots.filter((slot): slot is string => typeof slot === 'string')
          : undefined,
        clarifying_question: typeof proposal.clarifying_question === 'string' ? proposal.clarifying_question : undefined,
      };
    }
  }

  return undefined;
}

/**
 * 是否是自动化意图
 */
export function isAutomationIntent(result: AutomationIntentResult): boolean {
  return result.automation_intent !== 'none';
}

function isConfirmationIntent(message: string): boolean {
  const confirmPatterns = [
    /^确认$/,
    /^确定$/,
    /^是的$/,
    /^好$/,
    /^好的$/,
    /^可以$/,
    /^confirm$/,
    /^yes$/,
  ];

  return confirmPatterns.some((pattern) => pattern.test(message));
}

function isCancellationIntent(message: string): boolean {
  const cancelPatterns = [
    /^取消$/,
    /^放弃$/,
    /^不用了$/,
    /^不需要了$/,
    /^算了$/,
    /^取消创建$/,
    /^别创建$/,
  ];

  return cancelPatterns.some((pattern) => pattern.test(message));
}

// ─── 通用动作匹配 ─────────────────────────────────────

const ACTION_PATTERNS = {
  delete: [/删除/, /取消/, /移除/, /去掉/],
  pause: [/暂停/, /停止/, /关掉/, /关闭/],
  resume: [/恢复/, /重启/, /重新开启/, /启动/],
  rerun: [/重新跑/, /重新执行/, /再跑/, /再执行/, /重跑/],
  update: [/以后/, /改成/, /改为/, /调整/, /变更/, /修改/, /时间改/],
  status: [/任务.*状态/, /自动化.*状态/, /执行.*状态/, /运行.*状态/, /任务.*怎么样/, /任务.*如何/],
  history: [/历史/, /汇总/, /总结/, /执行记录/, /运行记录/],
} satisfies Record<string, RegExp[]>;

const CREATE_CADENCE_PATTERNS = [/每天/, /每日/, /每小时/, /每周/, /定时/, /周期/, /定期/];
const CREATE_ACTION_PATTERNS = [/帮我/, /自动/, /生成/, /更新/, /检查/, /看一下/, /看下/];

function matchesAny(message: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(message));
}

function hasCreateSignal(message: string): boolean {
  return matchesAny(message, CREATE_CADENCE_PATTERNS) && matchesAny(message, CREATE_ACTION_PATTERNS);
}

// ─── 槽位提取 ─────────────────────────────────────

function extractCreateSlots(msg: string): AutomationIntentResult['slots'] {
  const slots: AutomationIntentResult['slots'] = {};

  // 时间/频率
  if (/(?:每天|每日)/.test(msg)) slots.schedule = 'daily';
  if (/(?:每小时)/.test(msg)) slots.schedule = 'hourly';
  if (/(?:每周|周)/.test(msg)) slots.schedule = 'weekly';
  if (/(?:9\s*点|上午9|早上9)/.test(msg)) slots.schedule = 'daily 09:00';
  if (/(?:下午|3\s*点|15\s*点)/.test(msg)) slots.schedule = 'daily 15:00';

  // 时间范围
  if (/(?:昨天|昨日)/.test(msg)) slots.time_range = '昨天';
  if (/(?:今天|今日)/.test(msg)) slots.time_range = '今天';
  if (/(?:最近7天|近7天|一周)/.test(msg)) slots.time_range = '最近7天';
  if (/(?:最近30天|近30天|一个月)/.test(msg)) slots.time_range = '最近30天';

  return slots;
}

function extractUpdateSlots(msg: string): AutomationIntentResult['slots'] {
  const slots: AutomationIntentResult['slots'] = {};

  // 时间修改
  if (/(?:时间改|改到|改到.*点|下午|上午|早上)/.test(msg)) {
    const timeMatch = /(\d{1,2})\s*[点时]/.exec(msg);
    if (timeMatch) {
      let hour = parseInt(timeMatch[1], 10);
      // 下午时间转换为24小时制
      if (/下午/.test(msg) && hour < 12) hour += 12;
      slots.schedule = `daily ${hour.toString().padStart(2, '0')}:00`;
    }
  }

  return slots;
}

function resolveTargetRef(input: AutomationIntentInput): AutomationIntentResult['target_task_ref'] {
  if (input.currentTaskId) return 'current';
  // 检查历史中是否有最近的任务上下文
  if (input.history?.length) {
    const lastAssistant = [...input.history].reverse().find((h) => h.role === 'assistant');
    if (lastAssistant?.intent_type === 'automation' || lastAssistant?.content?.includes('任务')) {
      return 'latest';
    }
  }
  return 'unknown';
}

function getTemplateRiskLevel(templateId: string): 'L0' | 'L1' | 'L2' | 'L3' | 'L4' | 'L5' {
  const riskMap: Record<string, 'L0' | 'L1' | 'L2' | 'L3' | 'L4' | 'L5'> = {
    scheduled_join_table: 'L3',
    scheduled_aggregate_table: 'L3',
    gi_keyword_daily_digest: 'L1',
    scheduled_metric_monitor: 'L2',
  };
  return riskMap[templateId] || 'L1';
}

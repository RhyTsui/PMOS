/**
 * CaseFrame Transition — 状态转换逻辑
 *
 * 处理 CaseFrameEvent，驱动 CaseFrame 的阶段转换。
 * 纯函数设计：接收当前 CaseFrame + Event，返回新的 CaseFrame。
 *
 * 合法迁移路径：
 * - discovering → clarifying → ready_to_execute → executing → resolved → converted_to_task
 * - 任意阶段 → waiting_user（等待用户确认/补充）→ 回到前一阶段或 executing
 * - 任意阶段 → abandoned（放弃）
 */

import type { CaseFrame, CaseFrameEvent, CaseStage } from './case-frame-contract';
import { SERVICE_TYPE_FAMILY } from '@/contracts/service-catalog';

// ─── Valid Transitions ─────────────────────────────────

/**
 * 合法阶段迁移表
 */
const VALID_TRANSITIONS: Record<CaseStage, CaseStage[]> = {
  discovering: ['clarifying', 'ready_to_execute', 'executing', 'waiting_user', 'abandoned'],
  clarifying: ['ready_to_execute', 'executing', 'waiting_user', 'abandoned'],
  ready_to_execute: ['executing', 'waiting_user', 'abandoned'],
  executing: ['resolved', 'waiting_user', 'converted_to_task', 'abandoned'],
  waiting_user: ['clarifying', 'ready_to_execute', 'executing', 'abandoned'],
  resolved: ['converted_to_task', 'abandoned'],
  converted_to_task: [],  // 终态
  abandoned: [],           // 终态
};

// ─── Transition Error ──────────────────────────────────

export class CaseFrameTransitionError extends Error {
  constructor(
    public readonly caseId: string,
    public readonly currentStage: CaseStage,
    public readonly attemptedStage: CaseStage,
    public readonly eventType: string,
  ) {
    super(
      `Invalid CaseFrame transition: ${currentStage} → ${attemptedStage} ` +
      `(event: ${eventType}, case: ${caseId})`
    );
    this.name = 'CaseFrameTransitionError';
  }
}

// ─── Transition Function ───────────────────────────────

/**
 * 应用事件，返回新的 CaseFrame。
 * 不修改原始 frame（不可变更新）。
 */
export function applyCaseFrameEvent(
  frame: CaseFrame,
  event: CaseFrameEvent,
): CaseFrame {
  const now = new Date().toISOString();
  const updated = { ...frame, updatedAt: now };

  switch (event.type) {
    // ─── 消息接收 ──────────────────────────────────────
    case 'message_received': {
      updated.surfaceAsks = [...frame.surfaceAsks, event.message];
      updated.messageIds = [...frame.messageIds, event.messageId];
      updated.turnCount = frame.turnCount + 1;
      updated.lastUserMessageAt = now;
      // 如果当前在 waiting_user，收到消息后回到 clarifying
      if (frame.stage === 'waiting_user') {
        updated.stage = 'clarifying';
      }
      return updated;
    }

    // ─── 意图识别 ──────────────────────────────────────
    case 'intent_identified': {
      updated.serviceType = event.serviceType;
      updated.serviceFamily = SERVICE_TYPE_FAMILY[event.serviceType];
      if (event.realGoal) {
        updated.realGoal = event.realGoal;
      }
      // 从 discovering 进入 clarifying 或 ready_to_execute
      if (frame.stage === 'discovering') {
        updated.stage = 'clarifying';
      }
      return updated;
    }

    // ─── 需要澄清 ──────────────────────────────────────
    case 'clarification_needed': {
      updated.missingInputs = [...new Set([...frame.missingInputs, ...event.missingInputs])];
      updated.openQuestions = [...new Set([...frame.openQuestions, ...event.questions])];
      updated.stage = 'clarifying';
      return updated;
    }

    // ─── 用户补充信息 ──────────────────────────────────
    case 'information_provided': {
      // 从 missingInputs 中移除已提供的字段
      updated.missingInputs = frame.missingInputs.filter(input => input !== event.field);
      // 如果所有缺失信息已补齐，进入 ready_to_execute
      if (updated.missingInputs.length === 0 && frame.stage === 'clarifying') {
        updated.stage = 'ready_to_execute';
      }
      return updated;
    }

    // ─── 就绪 ──────────────────────────────────────────
    case 'ready_to_execute': {
      if (!canTransition(frame.stage, 'ready_to_execute')) {
        throw new CaseFrameTransitionError(frame.caseId, frame.stage, 'ready_to_execute', event.type);
      }
      updated.stage = 'ready_to_execute';
      return updated;
    }

    // ─── 开始执行 ──────────────────────────────────────
    case 'execution_started': {
      if (!canTransition(frame.stage, 'executing')) {
        throw new CaseFrameTransitionError(frame.caseId, frame.stage, 'executing', event.type);
      }
      updated.stage = 'executing';
      return updated;
    }

    // ─── 等待用户 ──────────────────────────────────────
    case 'waiting_for_user': {
      if (!canTransition(frame.stage, 'waiting_user')) {
        throw new CaseFrameTransitionError(frame.caseId, frame.stage, 'waiting_user', event.type);
      }
      updated.stage = 'waiting_user';
      return updated;
    }

    // ─── 执行完成 ──────────────────────────────────────
    case 'execution_completed': {
      if (event.deliverables) {
        updated.deliverables = [...frame.deliverables, ...event.deliverables];
      }
      updated.stage = 'resolved';
      updated.closedAt = now;
      return updated;
    }

    // ─── 已解决 ────────────────────────────────────────
    case 'resolved': {
      if (!canTransition(frame.stage, 'resolved')) {
        throw new CaseFrameTransitionError(frame.caseId, frame.stage, 'resolved', event.type);
      }
      updated.stage = 'resolved';
      updated.closedAt = now;
      if (event.reply) {
        updated.generatedReply = event.reply;
      }
      return updated;
    }

    // ─── 已转任务 ──────────────────────────────────────
    case 'converted_to_task': {
      if (!canTransition(frame.stage, 'converted_to_task')) {
        throw new CaseFrameTransitionError(frame.caseId, frame.stage, 'converted_to_task', event.type);
      }
      updated.stage = 'converted_to_task';
      updated.closedAt = now;
      updated.metadata = { ...frame.metadata, taskId: event.taskId };
      return updated;
    }

    // ─── 已放弃 ────────────────────────────────────────
    case 'abandoned': {
      updated.stage = 'abandoned';
      updated.closedAt = now;
      updated.metadata = { ...frame.metadata, abandonReason: event.reason };
      return updated;
    }

    // ─── 已沉淀 ────────────────────────────────────────
    case 'deposited': {
      updated.deposited = true;
      updated.depositTypes = [...new Set([...frame.depositTypes, ...event.depositTypes])];
      updated.depositedAt = now;
      return updated;
    }

    default: {
      // 穷尽检查：未处理的事件类型
      const _exhaustive: never = event;
      return updated;
    }
  }
}

// ─── Helper ────────────────────────────────────────────

/**
 * 检查阶段迁移是否合法
 */
export function canTransition(from: CaseStage, to: CaseStage): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * 获取当前阶段可迁移的目标阶段列表
 */
export function getAvailableTransitions(stage: CaseStage): CaseStage[] {
  return VALID_TRANSITIONS[stage] ?? [];
}

/**
 * 判断阶段是否为终态
 */
export function isTerminalStage(stage: CaseStage): boolean {
  return stage === 'converted_to_task' || stage === 'abandoned';
}

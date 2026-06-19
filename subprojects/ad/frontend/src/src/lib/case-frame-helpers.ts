/**
 * CaseFrame 状态更新辅助函数
 *
 * 提供类型安全的 CaseFrame 状态转换方法
 */

import type { CaseFrame, CaseStage } from '@/contracts/case-frame';
import type { ServiceType } from '@/contracts/service-catalog';
import { saveCaseFrame } from '@/lib/case-frame-store';

/**
 * 更新 CaseFrame 的阶段
 */
export async function transitionCaseFrameStage(
  scopeKey: string,
  caseFrame: CaseFrame,
  newStage: CaseStage,
  metadata?: Record<string, unknown>,
): Promise<CaseFrame> {
  const updatedFrame: CaseFrame = {
    ...caseFrame,
    stage: newStage,
    updatedAt: new Date().toISOString(),
    metadata: {
      ...caseFrame.metadata,
      ...metadata,
    },
  };

  // 如果是结束阶段，记录关闭时间
  if (newStage === 'resolved' || newStage === 'abandoned' || newStage === 'converted_to_task') {
    updatedFrame.closedAt = new Date().toISOString();
  }

  return saveCaseFrame(scopeKey, updatedFrame);
}

/**
 * 添加已知事实到 CaseFrame
 */
export async function addKnownFact(
  scopeKey: string,
  caseFrame: CaseFrame,
  fact: {
    id: string;
    content: string;
    source: string;
  },
): Promise<CaseFrame> {
  const updatedFrame: CaseFrame = {
    ...caseFrame,
    knownFacts: [
      ...caseFrame.knownFacts,
      {
        ...fact,
        recordedAt: new Date().toISOString(),
      },
    ],
    updatedAt: new Date().toISOString(),
  };

  return saveCaseFrame(scopeKey, updatedFrame);
}

/**
 * 添加证据引用到 CaseFrame
 */
export async function addEvidenceRef(
  scopeKey: string,
  caseFrame: CaseFrame,
  evidenceId: string,
): Promise<CaseFrame> {
  if (caseFrame.evidenceRefs.includes(evidenceId)) {
    return caseFrame; // 已存在，无需添加
  }

  const updatedFrame: CaseFrame = {
    ...caseFrame,
    evidenceRefs: [...caseFrame.evidenceRefs, evidenceId],
    updatedAt: new Date().toISOString(),
  };

  return saveCaseFrame(scopeKey, updatedFrame);
}

/**
 * 添加产物到 CaseFrame
 */
export async function addDeliverable(
  scopeKey: string,
  caseFrame: CaseFrame,
  deliverable: {
    type: string;
    id?: string;
    summary: string;
  },
): Promise<CaseFrame> {
  const updatedFrame: CaseFrame = {
    ...caseFrame,
    deliverables: [
      ...caseFrame.deliverables,
      {
        ...deliverable,
        createdAt: new Date().toISOString(),
      },
    ],
    updatedAt: new Date().toISOString(),
  };

  return saveCaseFrame(scopeKey, updatedFrame);
}

/**
 * 更新 CaseFrame 的业务上下文
 */
export async function updateBusinessContext(
  scopeKey: string,
  caseFrame: CaseFrame,
  context: Partial<CaseFrame['businessContext']>,
): Promise<CaseFrame> {
  const updatedFrame: CaseFrame = {
    ...caseFrame,
    businessContext: {
      ...caseFrame.businessContext,
      ...context,
    },
    updatedAt: new Date().toISOString(),
  };

  return saveCaseFrame(scopeKey, updatedFrame);
}

/**
 * 添加消息 ID 到 CaseFrame
 */
export async function addMessageId(
  scopeKey: string,
  caseFrame: CaseFrame,
  messageId: string,
): Promise<CaseFrame> {
  if (caseFrame.messageIds.includes(messageId)) {
    return caseFrame; // 已存在，无需添加
  }

  const updatedFrame: CaseFrame = {
    ...caseFrame,
    messageIds: [...caseFrame.messageIds, messageId],
    turnCount: caseFrame.turnCount + 1,
    lastUserMessageAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return saveCaseFrame(scopeKey, updatedFrame);
}

/**
 * 更新服务类型和目标
 */
export async function updateServiceIntent(
  scopeKey: string,
  caseFrame: CaseFrame,
  serviceType: ServiceType,
  realGoal?: string,
): Promise<CaseFrame> {
  const updatedFrame: CaseFrame = {
    ...caseFrame,
    serviceType,
    realGoal: realGoal ?? caseFrame.realGoal,
    updatedAt: new Date().toISOString(),
  };

  return saveCaseFrame(scopeKey, updatedFrame);
}

/**
 * 标记 CaseFrame 为已沉淀
 */
export async function markAsDeposited(
  scopeKey: string,
  caseFrame: CaseFrame,
  depositTypes: CaseFrame['depositTypes'],
): Promise<CaseFrame> {
  const updatedFrame: CaseFrame = {
    ...caseFrame,
    deposited: true,
    depositTypes: [...new Set([...caseFrame.depositTypes, ...depositTypes])],
    depositedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return saveCaseFrame(scopeKey, updatedFrame);
}

/**
 * CaseFrame 查询和清理接口
 *
 * 提供 CaseFrame 的查询、统计和清理功能
 */

import type { CaseFrame, CaseStage, CaseFrameSummary } from '@/contracts/case-frame';
import { readStore, writeStore, type CaseFrameStoreFile } from './case-frame-store';

// ─── 查询接口 ─────────────────────────────────────────────

/**
 * 查询 CaseFrame 列表（带过滤和分页）
 */
export async function queryCaseFrames(
  scopeKey: string,
  options: {
    conversationId?: string;
    stage?: CaseStage | CaseStage[];
    serviceType?: string;
    deposited?: boolean;
    createdAfter?: string;
    createdBefore?: string;
    limit?: number;
    offset?: number;
  } = {},
): Promise<{ frames: CaseFrame[]; total: number }> {
  const store = await readStore(scopeKey);
  const stages = options.stage ? new Set(Array.isArray(options.stage) ? options.stage : [options.stage]) : null;
  let frames = Object.values(store.caseFrames).filter((frame) => (
    (!options.conversationId || frame.conversationId === options.conversationId)
    && (!stages || stages.has(frame.stage))
    && (!options.serviceType || frame.serviceType === options.serviceType)
    && (options.deposited === undefined || frame.deposited === options.deposited)
    && (!options.createdAfter || frame.createdAt >= options.createdAfter)
    && (!options.createdBefore || frame.createdAt <= options.createdBefore)
  ));

  // 排序（按更新时间降序）
  frames.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const total = frames.length;

  // 分页
  if (options.offset) {
    frames = frames.slice(options.offset);
  }
  if (options.limit) {
    frames = frames.slice(0, options.limit);
  }

  return { frames, total };
}

/**
 * 统计 CaseFrame 数量（按阶段分组）
 */
export async function countCaseFramesByStage(
  scopeKey: string,
  conversationId?: string,
): Promise<Record<CaseStage, number>> {
  const store = await readStore(scopeKey);
  let frames = Object.values(store.caseFrames);

  if (conversationId) {
    frames = frames.filter(f => f.conversationId === conversationId);
  }

  const counts: Record<CaseStage, number> = {
    discovering: 0,
    clarifying: 0,
    ready_to_execute: 0,
    executing: 0,
    waiting_user: 0,
    resolved: 0,
    converted_to_task: 0,
    abandoned: 0,
  };

  for (const frame of frames) {
    counts[frame.stage]++;
  }

  return counts;
}

/**
 * 获取 CaseFrame 摘要列表（轻量级查询）
 */
export async function listCaseFrameSummaries(
  scopeKey: string,
  options: {
    conversationId?: string;
    stage?: CaseStage;
    limit?: number;
  } = {},
): Promise<CaseFrameSummary[]> {
  const { frames } = await queryCaseFrames(scopeKey, {
    conversationId: options.conversationId,
    stage: options.stage,
    limit: options.limit,
  });

  return frames.map(frame => ({
    caseId: frame.caseId,
    conversationId: frame.conversationId,
    stage: frame.stage,
    serviceType: frame.serviceType,
    realGoal: frame.realGoal,
    priority: frame.priority,
    turnCount: frame.turnCount,
    createdAt: frame.createdAt,
    updatedAt: frame.updatedAt,
    closedAt: frame.closedAt,
    deposited: frame.deposited,
  }));
}

// ─── 清理接口 ─────────────────────────────────────────────

/**
 * 清理已解决的 CaseFrame（保留最近 N 个）
 */
export async function cleanupResolvedCaseFrames(
  scopeKey: string,
  options: {
    keepRecent?: number;
    olderThanDays?: number;
    conversationId?: string;
  } = {},
): Promise<{ deleted: number; kept: number }> {
  const store = await readStore(scopeKey);
  const keepRecent = options.keepRecent ?? 50;
  const olderThanDays = options.olderThanDays;

  let frames = Object.values(store.caseFrames).filter(
    f => f.stage === 'resolved' || f.stage === 'converted_to_task' || f.stage === 'abandoned'
  );

  if (options.conversationId) {
    frames = frames.filter(f => f.conversationId === options.conversationId);
  }

  // 按更新时间排序
  frames.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const toDelete: string[] = [];

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];

    // 保留最近 N 个
    if (i < keepRecent) {
      continue;
    }

    // 如果设置了时间过滤，只清理旧的
    if (olderThanDays) {
      const updatedAt = new Date(frame.updatedAt).getTime();
      const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
      if (updatedAt > cutoff) {
        continue;
      }
    }

    toDelete.push(frame.caseId);
  }

  // 执行删除
  for (const caseId of toDelete) {
    delete store.caseFrames[caseId];

    // 从 conversation 索引中移除
    for (const convId of Object.keys(store.caseIdsByConversation)) {
      store.caseIdsByConversation[convId] = store.caseIdsByConversation[convId].filter(id => id !== caseId);
    }
  }

  if (toDelete.length > 0) {
    await writeStore(scopeKey, store);
  }

  return {
    deleted: toDelete.length,
    kept: Object.values(store.caseFrames).length,
  };
}

/**
 * 清理已沉淀的 CaseFrame
 */
export async function cleanupDepositedCaseFrames(
  scopeKey: string,
  options: {
    olderThanDays?: number;
  } = {},
): Promise<{ deleted: number; kept: number }> {
  const store = await readStore(scopeKey);
  const olderThanDays = options.olderThanDays;

  const toDelete: string[] = [];

  for (const frame of Object.values(store.caseFrames)) {
    if (!frame.deposited) {
      continue;
    }

    // 如果设置了时间过滤
    if (olderThanDays && frame.depositedAt) {
      const depositedAt = new Date(frame.depositedAt).getTime();
      const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
      if (depositedAt > cutoff) {
        continue;
      }
    }

    toDelete.push(frame.caseId);
  }

  // 执行删除
  for (const caseId of toDelete) {
    delete store.caseFrames[caseId];

    // 从 conversation 索引中移除
    for (const convId of Object.keys(store.caseIdsByConversation)) {
      store.caseIdsByConversation[convId] = store.caseIdsByConversation[convId].filter(id => id !== caseId);
    }
  }

  if (toDelete.length > 0) {
    await writeStore(scopeKey, store);
  }

  return {
    deleted: toDelete.length,
    kept: Object.values(store.caseFrames).length,
  };
}

/**
 * 清理指定会话的所有 CaseFrame
 */
export async function cleanupConversationCaseFrames(
  scopeKey: string,
  conversationId: string,
): Promise<{ deleted: number; kept: number }> {
  const store = await readStore(scopeKey);
  const caseIds = store.caseIdsByConversation[conversationId] ?? [];

  for (const caseId of caseIds) {
    delete store.caseFrames[caseId];
  }

  delete store.caseIdsByConversation[conversationId];

  if (caseIds.length > 0) {
    await writeStore(scopeKey, store);
  }

  return {
    deleted: caseIds.length,
    kept: Object.values(store.caseFrames).length,
  };
}

// ─── 统计接口 ─────────────────────────────────────────────

/**
 * 获取 CaseFrame 统计信息
 */
export async function getCaseFrameStats(
  scopeKey: string,
): Promise<{
  total: number;
  byStage: Record<CaseStage, number>;
  byServiceType: Record<string, number>;
  depositedCount: number;
  averageTurnCount: number;
}> {
  const store = await readStore(scopeKey);
  const frames = Object.values(store.caseFrames);

  const byStage: Record<CaseStage, number> = {
    discovering: 0,
    clarifying: 0,
    ready_to_execute: 0,
    executing: 0,
    waiting_user: 0,
    resolved: 0,
    converted_to_task: 0,
    abandoned: 0,
  };

  const byServiceType: Record<string, number> = {};
  let depositedCount = 0;
  let totalTurnCount = 0;

  for (const frame of frames) {
    byStage[frame.stage]++;

    if (frame.serviceType) {
      byServiceType[frame.serviceType] = (byServiceType[frame.serviceType] || 0) + 1;
    }

    if (frame.deposited) {
      depositedCount++;
    }

    totalTurnCount += frame.turnCount;
  }

  return {
    total: frames.length,
    byStage,
    byServiceType,
    depositedCount,
    averageTurnCount: frames.length > 0 ? totalTurnCount / frames.length : 0,
  };
}

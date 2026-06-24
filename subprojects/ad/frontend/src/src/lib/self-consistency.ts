/**
 * 自我一致性多数投票
 *
 * 对 LLM 路由判断（routeReviewAssist）做多次采样+投票，提升路由准确率。
 * 仅在歧义度高或存在路由警告时触发，简单场景不触发。
 *
 * 投票对象：intent_routing_review 的 LLM 路由判断
 * 投票策略：2 次不同 temperature（0.1 + 0.5），取一致结果或 fallback 到高置信度单次结果
 */

import type { LlmIntentSignal } from '@/lib/request-understanding';
import { generateModelText } from '@/lib/model-router';
import type { ModelServiceConfig } from '@/lib/runtime-config';

// Stub for runReportModelNode - experimental feature not yet implemented
async function runReportModelNode(_input: Record<string, unknown>): Promise<Record<string, unknown>> {
  return {};
}

export interface VotingInput {
  message: string;
  history?: Array<{ role: string; content: string }>;
  projectContext?: Record<string, unknown>;
  availableIntentTypes?: string[];
  routeRules?: string;
  capabilitySummary?: string;
  modelServiceConfig?: ModelServiceConfig | null;
  /** 是否触发投票（由调用方根据 ambiguityClass/routeWarningCount 判断） */
  shouldVote: boolean;
}

export interface VotingResult {
  /** 投票后的意图信号 */
  signal: LlmIntentSignal | null;
  /** 投票次数 */
  voteCount: number;
  /** 是否发生投票 */
  voted: boolean;
  /** 一致性得分 (0-1)：1 = 完全一致, 0 = 完全不一致 */
  consistencyScore: number;
  /** 投票详情（用于 trace） */
  votes: Array<{
    temperature: number;
    signal: LlmIntentSignal | null;
  }>;
  /** 是否 fallback 到单次结果 */
  fallbackToSingle: boolean;
}

const VOTING_TIMEOUT_MS = 3000;

/**
 * 执行路由投票
 */
export async function executeRouteVoting(input: VotingInput): Promise<VotingResult> {
  if (!input.shouldVote) {
    return {
      signal: null,
      voteCount: 0,
      voted: false,
      consistencyScore: 1,
      votes: [],
      fallbackToSingle: false,
    };
  }

  // 两次不同 temperature 的调用
  const temperatureVariants = [0.1, 0.5];
  const votePromises = temperatureVariants.map(async (temperature) => {
    try {
      const result = await Promise.race([
        runReportModelNode({
          useCase: 'intent_routing_review',
          fallbackText: '',
          modelServiceConfig: input.modelServiceConfig ?? undefined,
          input: {
            message: input.message,
            history: (input.history || []).slice(-3).map((h) => ({ role: h.role, content: h.content?.slice(0, 200) })),
            projectContext: input.projectContext,
            availableIntentTypes: input.availableIntentTypes || ['report_query', 'diagnosis', 'help', 'demand', 'debugging', 'general'],
            routeRules: input.routeRules || '',
            capabilitySummary: input.capabilitySummary || '',
          },
          consume: { enabled: false, consumedBy: 'route_voting' },
          traceMeta: { node: 'route_voting', temperature },
        }),
        new Promise<{ output: null }>((resolve) => {
          setTimeout(() => resolve({ output: null }), VOTING_TIMEOUT_MS);
        }),
      ]);
      const output = (result as { output: Record<string, unknown> | null })?.output;
      const signal: LlmIntentSignal | null = output && typeof output === 'object' && 'intent_type' in output
        ? output as unknown as LlmIntentSignal
        : null;
      return { temperature, signal };
    } catch {
      return { temperature, signal: null };
    }
  });

  const votes = await Promise.all(votePromises);

  // 投票聚合
  const intentVotes = votes.filter((v) => v.signal?.intent_type);
  if (intentVotes.length === 0) {
    return {
      signal: null,
      voteCount: 0,
      voted: true,
      consistencyScore: 0,
      votes,
      fallbackToSingle: true,
    };
  }

  // 按 intent_type 分组计数
  const intentCounts = new Map<string, number>();
  for (const vote of intentVotes) {
    const intentType = vote.signal!.intent_type;
    intentCounts.set(intentType, (intentCounts.get(intentType) || 0) + 1);
  }

  // 取出现次数最多的 intent_type
  let maxIntent = '';
  let maxCount = 0;
  for (const [intent, count] of intentCounts) {
    if (count > maxCount) {
      maxCount = count;
      maxIntent = intent;
    }
  }

  const consistencyScore = maxCount / intentVotes.length;

  // 找到最一致的 signal
  const winningVote = intentVotes.find((v) => v.signal?.intent_type === maxIntent);

  return {
    signal: winningVote?.signal || null,
    voteCount: intentVotes.length,
    voted: true,
    consistencyScore,
    votes,
    fallbackToSingle: consistencyScore < 0.5,
  };
}

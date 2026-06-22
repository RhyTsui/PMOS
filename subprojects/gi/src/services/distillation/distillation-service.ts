/**
 * 蒸馏任务服务
 *
 * 核心流程：
 * 1. 选择 RequirementProfile + 任务类型
 * 2. 构建 prompt
 * 3. 调用 LLM（通过 LLMClient，自动选择供应商）
 * 4. 解析输出（按任务类型的契约）
 * 5. 存储 ModelAnswer + ModelClaim + ModelSourceMention
 * 6. 返回蒸馏结果
 *
 * @see docs/WHITE_PAPER.md §7.2 / §11.3 / §11.4
 */
import { v4 as uuidv4 } from 'uuid';
import { getLLMClient } from '../../lib/llm-client-v2.js';
import {
  getSystemPrompt,
  buildUserPrompt,
  type DistillationTaskType,
  type PromptTemplateContext,
} from './prompt-templates.js';
import {
  parseDistillationOutput,
  type DistillationOutputMap,
  type DiscoveredSource,
  type DiscoveredTrend,
} from './output-contracts.js';
import { ModelQueryTaskRepository } from '../../repositories/model-query-task-repository.js';
import { ModelAnswerRepository } from '../../repositories/model-answer-repository.js';
import { ModelClaimRepository } from '../../repositories/model-claim-repository.js';
import { ModelSourceMentionRepository } from '../../repositories/model-source-mention-repository.js';
import { RequirementProfileRepository } from '../../repositories/requirement-profile-repository.js';
import type { ModelAnswer, ModelClaim, ModelSourceMention } from '../../models/types.js';

// ===== 蒸馏任务配置 =====

export interface DistillationJobConfig {
  /** 画像 ID */
  profileId: string;
  /** 任务类型 */
  taskType: DistillationTaskType;
  /** 专题（默认从画像 focusTopics 中选） */
  topic?: string;
  /** 待核验观点（用于 fact_check / generate_verification_queries） */
  claimToVerify?: string;
  /** 已有证据（用于 insight_synthesis） */
  existingEvidence?: Array<{ title: string; summary: string }>;
  /** 目标模型（可选，不指定则自动选择） */
  model?: string;
  /** 指定供应商 ID（可选） */
  providerId?: string;
}

// ===== 蒸馏结果 =====

export interface DistillationResult {
  answer: ModelAnswer;
  claims: ModelClaim[];
  sourceMentions: ModelSourceMention[];
  taskType: DistillationTaskType;
  rawOutput: unknown;
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latencyMs: number;
  providerName: string;
}

// ===== 服务实现 =====

export class DistillationService {
  private taskRepo = new ModelQueryTaskRepository();
  private answerRepo = new ModelAnswerRepository();
  private claimRepo = new ModelClaimRepository();
  private mentionRepo = new ModelSourceMentionRepository();
  private profileRepo = new RequirementProfileRepository();

  /**
   * 执行一次蒸馏任务
   */
  async distill(config: DistillationJobConfig): Promise<DistillationResult> {
    const startedAt = Date.now();

    // 1. 加载画像
    const profile = this.profileRepo.findById(config.profileId);
    if (!profile) {
      throw new Error(`画像不存在: ${config.profileId}`);
    }

    // 2. 构建上下文
    const context = this.buildContext(config, profile);

    // 3. 构建 prompt
    const systemPrompt = getSystemPrompt(config.taskType);
    const userPrompt = buildUserPrompt(config.taskType, context);

    // 4. 调用 LLM
    const llmClient = getLLMClient();
    const llmResult = await llmClient.call(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        providerId: config.providerId,
        model: config.model,
        temperature: 0.3,
        maxTokens: 4000,
      },
    );

    // 5. 创建 ModelAnswer 记录
    const answerId = uuidv4();
    const answer: ModelAnswer = {
      id: answerId,
      taskId: this.ensureTaskExists(config).id,
      modelProvider: llmResult.providerName,
      modelName: llmResult.model,
      promptVersion: `v1-${config.taskType}`,
      answerText: llmResult.content,
      createdAt: new Date().toISOString(),
      tokenCost: {
        input: llmResult.usage.promptTokens,
        output: llmResult.usage.completionTokens,
        total: llmResult.usage.totalTokens,
      },
      latencyMs: Date.now() - startedAt,
      status: 'success',
    };
    this.answerRepo.create(answer);

    // 6. 解析输出
    let rawOutput: unknown;
    try {
      rawOutput = parseDistillationOutput(config.taskType, llmResult.content);
    } catch (err) {
      // 解析失败时，存储原始文本作为单个 claim
      console.warn(`[Distillation] 解析输出失败，存储为原始 claim: ${err instanceof Error ? err.message : String(err)}`);
      rawOutput = { __rawText: llmResult.content };
    }

    // 7. 抽取 ModelClaim + ModelSourceMention
    const { claims, mentions } = this.extractClaimsAndMentions(
      answerId,
      config.taskType,
      rawOutput,
    );

    // 8. 存储
    for (const claim of claims) {
      this.claimRepo.create(claim);
    }
    for (const mention of mentions) {
      this.mentionRepo.create(mention);
    }

    return {
      answer,
      claims,
      sourceMentions: mentions,
      taskType: config.taskType,
      rawOutput,
      tokenUsage: {
        promptTokens: llmResult.usage.promptTokens,
        completionTokens: llmResult.usage.completionTokens,
        totalTokens: llmResult.usage.totalTokens,
      },
      latencyMs: Date.now() - startedAt,
      providerName: llmResult.providerName,
    };
  }

  /**
   * 批量蒸馏（多个任务类型 × 多个专题）
   */
  async distillBatch(
    configs: DistillationJobConfig[],
    options: { concurrency?: number } = {},
  ): Promise<DistillationResult[]> {
    const concurrency = options.concurrency ?? 3;
    const results: DistillationResult[] = [];
    const errors: Array<{ config: DistillationJobConfig; error: Error }> = [];

    // 简单并发控制
    const queue = [...configs];
    const workers: Promise<void>[] = [];

    for (let i = 0; i < Math.min(concurrency, queue.length); i++) {
      workers.push((async () => {
        while (queue.length > 0) {
          const config = queue.shift();
          if (!config) break;
          try {
            const result = await this.distill(config);
            results.push(result);
          } catch (err) {
            errors.push({ config, error: err instanceof Error ? err : new Error(String(err)) });
          }
        }
      })());
    }

    await Promise.all(workers);

    if (errors.length > 0) {
      console.warn(`[Distillation] 批量蒸馏完成，${results.length} 成功，${errors.length} 失败`);
      for (const { config, error } of errors) {
        console.warn(`  - ${config.taskType}/${config.topic}: ${error.message}`);
      }
    }

    return results;
  }

  // ===== 私有方法 =====

  /**
   * 构建 prompt 上下文
   */
  private buildContext(
    config: DistillationJobConfig,
    profile: any,
  ): PromptTemplateContext {
    // 专题选择：优先用 config.topic，否则从 profile.focusTopics 中选第一个
    const topic = config.topic || profile.focusTopics?.[0] || profile.name;

    return {
      topic,
      timeWindow: profile.timeWindow,
      entities: [
        ...profile.entities?.companies ?? [],
        ...profile.entities?.products ?? [],
        ...profile.entities?.platforms ?? [],
      ],
      claimToVerify: config.claimToVerify,
      existingEvidence: config.existingEvidence,
      audienceRole: profile.purpose?.[0],
    };
  }

  /**
   * 确保任务记录存在（每个 profile+taskType 一个）
   */
  private ensureTaskExists(config: DistillationJobConfig): { id: string } {
    const existing = this.taskRepo.findByProfile(config.profileId)
      .find((t) => t.taskType === config.taskType);
    if (existing) return existing;

    // 创建新任务
    return this.taskRepo.create({
      profileId: config.profileId,
      taskType: config.taskType,
      promptTemplateId: config.taskType,
      promptVariables: {},
      models: config.model ? [{ provider: 'auto', model: config.model }] : [],
      schedule: { runOnce: true },
      status: 'pending',
    } as any);
  }

  /**
   * 从蒸馏输出中抽取 claims 和 source mentions
   */
  private extractClaimsAndMentions(
    answerId: string,
    taskType: DistillationTaskType,
    output: unknown,
  ): { claims: ModelClaim[]; mentions: ModelSourceMention[] } {
    const claims: ModelClaim[] = [];
    const mentions: ModelSourceMention[] = [];

    if (!output || typeof output !== 'object') {
      return { claims, mentions };
    }

    const obj = output as Record<string, unknown>;

    switch (taskType) {
      case 'discover_sources': {
        // 每个推荐源 → ModelSourceMention
        const sources = obj.sources as DiscoveredSource[] | undefined;
        if (Array.isArray(sources)) {
          for (const source of sources) {
            mentions.push({
              id: uuidv4(),
              answerId,
              sourceName: source.name,
              sourceType: this.mapSourceType(source.type),
              reason: source.reason,
              recommendedUse: source.keywords.join(', '),
              confidence: source.confidence,
              discoveryStatus: 'new',
              createdAt: new Date().toISOString(),
            });
          }
        }
        // 整体作为 1 个观点
        claims.push({
          id: uuidv4(),
          answerId,
          claimType: 'source_recommendation',
          summary: `推荐 ${sources?.length ?? 0} 个信息源监控「${(obj as any).topic || ''}」`,
          entities: [],
          confidence: 0.7,
          freshness: 'recent',
          verificationRequired: true,
          verificationStatus: 'unverified',
          verifiedEvidenceIds: [],
          createdAt: new Date().toISOString(),
        });
        break;
      }

      case 'discover_trend_hypothesis': {
        // 每个趋势 → 1 个 claim
        const trends = obj.trends as DiscoveredTrend[] | undefined;
        if (Array.isArray(trends)) {
          for (const trend of trends) {
            claims.push({
              id: uuidv4(),
              answerId,
              claimType: 'trend',
              summary: trend.summary,
              entities: [],
              confidence: trend.confidence,
              freshness: trend.direction === 'emerging' ? 'recent' : 'breaking',
              verificationRequired: true,
              verificationStatus: 'unverified',
              verifiedEvidenceIds: [],
              createdAt: new Date().toISOString(),
            });
          }
        }
        break;
      }

      case 'generate_verification_queries': {
        // 生成核验查询作为 fact 类型 claim
        const queries = obj.queries as Array<{ keywords: string[] }> | undefined;
        if (Array.isArray(queries) && queries.length > 0) {
          claims.push({
            id: uuidv4(),
            answerId,
            claimType: 'fact',
            summary: `生成 ${queries.length} 组核验查询`,
            entities: [],
            confidence: 0.8,
            freshness: 'recent',
            verificationRequired: false,
            verificationStatus: 'verified',
            verifiedEvidenceIds: [],
            createdAt: new Date().toISOString(),
          });
        }
        break;
      }

      case 'benchmark_estimation': {
        // 每个基准参数 → benchmark 类型 claim
        const benchmarks = obj.benchmarks as Array<{
          metricName: string;
          valueRange: { min: number; max: number; p50?: number };
          confidence: number;
        }> | undefined;
        if (Array.isArray(benchmarks)) {
          for (const bm of benchmarks) {
            claims.push({
              id: uuidv4(),
              answerId,
              claimType: 'benchmark',
              summary: `${bm.metricName}: ${bm.valueRange.min}-${bm.valueRange.max}${bm.valueRange.p50 ? ` (p50=${bm.valueRange.p50})` : ''}`,
              entities: [],
              confidence: bm.confidence,
              freshness: 'recent',
              verificationRequired: true,
              verificationStatus: 'unverified',
              verifiedEvidenceIds: [],
              createdAt: new Date().toISOString(),
            });
          }
        }
        break;
      }

      case 'fact_check': {
        const fc = obj.factCheck as {
          claim: string;
          confidence: number;
          verdict: string;
        } | undefined;
        if (fc) {
          claims.push({
            id: uuidv4(),
            answerId,
            claimType: 'fact',
            summary: fc.claim,
            entities: [],
            confidence: fc.confidence,
            freshness: 'recent',
            verificationRequired: true,
            verificationStatus: this.mapVerificationStatus(fc.verdict),
            verifiedEvidenceIds: [],
            createdAt: new Date().toISOString(),
          });
        }
        break;
      }

      case 'insight_synthesis': {
        // 每个洞察 → 1 个 opinion 类型 claim
        const insights = obj.insights as Array<{
          summary: string;
          confidence: number;
        }> | undefined;
        if (Array.isArray(insights)) {
          for (const insight of insights) {
            claims.push({
              id: uuidv4(),
              answerId,
              claimType: 'opinion',
              summary: insight.summary,
              entities: [],
              confidence: insight.confidence,
              freshness: 'recent',
              verificationRequired: true,
              verificationStatus: 'unverified',
              verifiedEvidenceIds: [],
              createdAt: new Date().toISOString(),
            });
          }
        }
        break;
      }
    }

    return { claims, mentions };
  }

  /**
   * 映射源类型字符串到 SourceType
   */
  private mapSourceType(type: string): any {
    const mapping: Record<string, string> = {
      media: 'media',
      wechat_mp: 'wechat_mp',
      wechat: 'wechat_mp',
      community: 'community',
      database: 'database',
      ranking: 'ranking',
      kol: 'kol',
      official: 'official',
    };
    return mapping[type] || 'unknown';
  }

  /**
   * 映射核验状态
   */
  private mapVerificationStatus(verdict: string): any {
    const mapping: Record<string, string> = {
      verified: 'verified',
      unverified: 'unverified',
      conflicted: 'conflicted',
      low_confidence: 'low_confidence',
    };
    return mapping[verdict] || 'unverified';
  }
}

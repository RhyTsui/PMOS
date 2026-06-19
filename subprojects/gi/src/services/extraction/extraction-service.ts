/**
 * 事件抽取服务
 *
 * 从 RawEvidence 中抽取结构化事件
 */
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { QwenClient, createLLMClient } from '../../lib/llm-client.js';
import { buildExtractionPrompt } from './prompt-builder.js';
import { RawEvidenceRepository } from '../../repositories/raw-evidence-repository.js';
import { IntelSourceRepository } from '../../repositories/intel-source-repository.js';
import { StructuredEventRepository } from '../../repositories/structured-event-repository.js';
import type {
  RawEvidence, StructuredEvent, EventType, Priority, Sentiment,
  KeyFact, ActionAdvice, MentionedEntity,
} from '../../models/types.js';

/**
 * LLM 抽取输出 Schema（用 Zod 校验）
 */
const ExtractionOutputSchema = z.object({
  eventTitle: z.string(),
  eventType: z.enum([
    '上线', '测试', '预约', '版号', '榜单变化',
    '买量', '舆情', '融资', '组织动作', '版本更新',
    '出海', '合作', '政策', 'AI应用',
  ]),
  keyFacts: z.array(z.object({
    fact: z.string(),
    importance: z.enum(['high', 'medium', 'low']),
    entities: z.array(z.string()).default([]),
  })).min(0).max(10),
  actionAdvice: z.array(z.object({
    role: z.string(),
    advice: z.string(),
    urgency: z.enum(['immediate', 'watch', 'info']),
  })).max(7),
  sentiment: z.object({
    polarity: z.enum(['positive', 'negative', 'neutral', 'mixed']),
    intensity: z.number().min(0).max(1),
    target: z.string().optional(),
  }),
  entities: z.array(z.object({
    name: z.string(),
    type: z.enum(['game', 'company', 'person', 'brand']),
    role: z.enum(['subject', 'object', 'context']),
  })),
  audienceTags: z.array(z.string()),
  publishedAt: z.string().optional(),
});

type ExtractionOutput = z.infer<typeof ExtractionOutputSchema>;

/**
 * 事件抽取服务
 */
export class ExtractionService {
  private llm: QwenClient;
  private evidenceRepo: RawEvidenceRepository;
  private sourceRepo: IntelSourceRepository;
  private eventRepo: StructuredEventRepository;

  constructor() {
    this.llm = createLLMClient();
    this.evidenceRepo = new RawEvidenceRepository();
    this.sourceRepo = new IntelSourceRepository();
    this.eventRepo = new StructuredEventRepository();
  }

  /**
   * 从单条证据中抽取事件
   */
  async extractFromEvidence(evidence: RawEvidence): Promise<StructuredEvent | null> {
    const source = this.sourceRepo.findById(evidence.sourceId);
    if (!source) {
      throw new Error(`Source not found: ${evidence.sourceId}`);
    }

    // 构建 Prompt
    const prompt = buildExtractionPrompt(evidence, source);

    // 调用 LLM
    const response = await this.llm.call({
      model: 'Qwen3.5-397B',  // 使用公司网关的 Qwen3.5-397B 模型
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      maxTokens: 8000,  // 思考模型需要更多 token（思考 + 输出）
      timeout: 180000,  // 思考模型需要更长时间（180秒）
    });

    // 解析输出
    const parsed = this.parseExtractionOutput(response.content);
    if (!parsed) {
      // Debug: 输出 LLM 原始响应
      console.log('[Extraction] LLM 原始响应:', response.content?.substring(0, 500));
      // 标记为抽取失败
      this.evidenceRepo.updateStatus(evidence.id, 'failed', 'JSON 解析失败');
      return null;
    }

    // 校验 Schema
    const validated = this.validateOutput(parsed);
    if (!validated) {
      this.evidenceRepo.updateStatus(evidence.id, 'failed', 'Schema 校验失败');
      return null;
    }

    // 构建 StructuredEvent
    const event: StructuredEvent = {
      id: uuidv4(),
      evidenceId: evidence.id,
      sourceId: evidence.sourceId,
      eventTitle: validated.eventTitle,
      keyFacts: validated.keyFacts,
      actionAdvice: validated.actionAdvice,
      eventType: validated.eventType,
      sentiment: validated.sentiment,
      impactScore: this.calculateImpactScore(validated),
      priority: this.determinePriority(validated),
      audienceTags: validated.audienceTags,
      entities: validated.entities,
      extractedAt: new Date().toISOString(),
      model: response.model,
      confidence: 0.8, // 默认置信度
    };

    // 更新证据状态
    this.evidenceRepo.updateStatus(evidence.id, 'extracted');

    // 保存结构化事件到数据库
    try {
      this.eventRepo.create(event);
    } catch (saveError) {
      console.error('[Extraction] 保存事件失败:', saveError);
      // 继续返回事件，但不影响抽取结果
    }

    return event;
  }

  /**
   * 批量抽取
   */
  async extractBatch(evidenceIds: string[]): Promise<StructuredEvent[]> {
    const results: StructuredEvent[] = [];

    for (const evidenceId of evidenceIds) {
      const evidence = this.evidenceRepo.findById(evidenceId);
      if (!evidence || evidence.status !== 'collected') continue;

      try {
        const event = await this.extractFromEvidence(evidence);
        if (event) {
          results.push(event);
        }
      } catch (error) {
        console.error(`抽取失败 [${evidenceId}]:`, error);
        this.evidenceRepo.updateStatus(
          evidence.id,
          'failed',
          error instanceof Error ? error.message : String(error)
        );
      }
    }

    return results;
  }

  /**
   * 解析 LLM 输出
   */
  private parseExtractionOutput(raw: string): ExtractionOutput | null {
    if (!raw || raw.trim().length === 0) {
      console.log('[Extraction] 空响应');
      return null;
    }

    // 清理：去除前后空白
    let cleaned = raw.trim();

    // 1. 尝试直接解析
    try {
      return JSON.parse(cleaned);
    } catch {
      // 继续尝试
    }

    // 2. 尝试提取 JSON 块（```json ... ```）
    const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1].trim());
      } catch {
        // 继续尝试
      }
    }

    // 3. 尝试提取 { 到 最后一个 } 之间的内容
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const jsonStr = cleaned.substring(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(jsonStr);
      } catch {
        // JSON 可能被截断，尝试修复
        console.log('[Extraction] JSON 可能截断，尝试修复...');

        // 尝试补全截断的 JSON
        const repaired = this.tryRepairTruncatedJson(jsonStr);
        if (repaired) {
          try {
            return JSON.parse(repaired);
          } catch {
            console.log('[Extraction] 修复失败');
          }
        }
      }
    }

    console.log('[Extraction] 所有解析尝试失败');
    return null;
  }

  /**
   * 尝试修复截断的 JSON
   */
  private tryRepairTruncatedJson(json: string): string | null {
    // 简单策略：移除最后一个不完整的对象/数组
    let repaired = json;

    // 尝试补全数组
    const openArrays = (repaired.match(/\[/g) || []).length;
    const closeArrays = (repaired.match(/\]/g) || []).length;
    if (openArrays > closeArrays) {
      // 找到最后一个不完整的数组元素并移除
      repaired = repaired.replace(/,\s*"[^"]*$/, '');
      repaired = repaired.replace(/,\s*\{[^}]*$/, '');
      repaired += ']';
    }

    // 尝试补全对象
    const openObjects = (repaired.match(/\{/g) || []).length;
    const closeObjects = (repaired.match(/\}/g) || []).length;
    if (openObjects > closeObjects) {
      repaired = repaired.replace(/,\s*"[^"]*":\s*[^,}]*$/, '');
      repaired += '}';
    }

    return repaired;
  }

  /**
   * 校验输出 Schema
   */
  private validateOutput(data: unknown): ExtractionOutput | null {
    const result = ExtractionOutputSchema.safeParse(data);
    if (!result.success) {
      console.warn('Schema 校验失败:', result.error.message);
      return null;
    }
    return result.data;
  }

  /**
   * 计算影响评分
   */
  private calculateImpactScore(output: ExtractionOutput): number {
    let score = 0;

    // ① 实体权重（30%）
    const entityScore = this.calculateEntityWeight(output.entities);
    score += 30 * entityScore;

    // ② 事件类型权重（25%）
    const eventTypeScore = this.getEventTypeWeight(output.eventType);
    score += 25 * eventTypeScore;

    // ③ 角色覆盖（20%）
    const roleScore = Math.min(1.0, output.audienceTags.length / 3);
    score += 20 * roleScore;

    // ④ 关键事实数量（15%）
    const factScore = Math.min(1.0, output.keyFacts.length / 5);
    score += 15 * factScore;

    // ⑤ 情绪强度（10%）
    score += 10 * output.sentiment.intensity;

    return Math.round(Math.max(0, Math.min(100, score)));
  }

  /**
   * 实体权重
   */
  private calculateEntityWeight(entities: MentionedEntity[]): number {
    if (entities.length === 0) return 0.4;

    const topTierEntities = ['腾讯', '网易', '米哈游', '原神', '王者荣耀'];
    const hasTopTier = entities.some(e => topTierEntities.includes(e.name));
    if (hasTopTier) return 1.0;

    return Math.min(1.0, entities.length / 5);
  }

  /**
   * 事件类型权重
   */
  private getEventTypeWeight(eventType: EventType): number {
    const weights: Record<EventType, number> = {
      '版号': 1.0,
      '融资': 0.95,
      '组织动作': 0.9,
      '上线': 0.85,
      '政策': 0.85,
      'AI应用': 0.7,
      '出海': 0.7,
      '榜单变化': 0.7,
      '买量': 0.6,
      '舆情': 0.6,
      '合作': 0.5,
      '测试': 0.5,
      '预约': 0.4,
      '版本更新': 0.4,
    };
    return weights[eventType] || 0.5;
  }

  /**
   * 确定优先级
   */
  private determinePriority(output: ExtractionOutput): Priority {
    const score = this.calculateImpactScore(output);
    if (score >= 80) return 'P0';
    if (score >= 60) return 'P1';
    if (score >= 40) return 'P2';
    return 'P3';
  }
}

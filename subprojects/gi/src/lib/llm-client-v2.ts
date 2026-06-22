/**
 * LLM 客户端（基于 Vercel AI SDK + DB 配置）
 *
 * 设计理念：
 * 1. 配置从数据库读取（支持后台动态管理）
 * 2. 使用 Vercel AI SDK 的统一接口支持多种模型
 * 3. 支持公司中转代理模式（baseUrl → 实际模型）
 * 4. 支持多供应商自动切换（故障转移 + 优先级）
 *
 * @see docs/WHITE_PAPER.md §8.5
 */
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { generateText, generateObject, type ModelMessage } from 'ai';
import { LLMProviderRepository } from '../repositories/llm-provider-repository.js';
import type { LLMProvider } from '../models/types.js';

// ===== 接口定义 =====

export interface LLMCallOptions {
  /** 指定供应商 ID（可选，不指定则自动选择） */
  providerId?: string;
  /** 指定模型名（可选，不指定则用供应商默认） */
  model?: string;
  /** 温度参数（默认 0.7） */
  temperature?: number;
  /** 最大 token 数（默认 2000） */
  maxTokens?: number;
  /** 是否流式输出（默认 false） */
  stream?: boolean;
  /** 超时时间（毫秒，默认 30000） */
  timeoutMs?: number;
  /** 重试次数（默认 2） */
  maxRetries?: number;
  /** JSON 模式（返回结构化数据） */
  jsonMode?: boolean;
}

export interface LLMCallResult {
  content: string;
  model: string;
  providerId: string;
  providerName: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// ===== 客户端实现 =====

export class LLMClient {
  private providerRepo = new LLMProviderRepository();
  /** 内存中的限流计数器 */
  private rateLimits = new Map<string, { count: number; resetAt: number }>();
  /** 内存中的每日计数器 */
  private dailyCounts = new Map<string, { count: number; date: string }>();

  /**
   * 调用 LLM（文本生成）
   */
  async call(messages: ModelMessage[], options: LLMCallOptions = {}): Promise<LLMCallResult> {
    const provider = this.selectProvider(options);
    if (!provider) {
      throw new Error('没有可用的 LLM 供应商，请先在后台配置');
    }

    // 限流检查
    this.checkRateLimit(provider);

    const modelName = options.model || provider.defaultModel || provider.models[0];
    if (!modelName) {
      throw new Error(`供应商 ${provider.name} 没有可用模型`);
    }

    // 创建 OpenAI-compatible provider
    const openaiProvider = createOpenAICompatible({
      name: provider.name,
      baseURL: provider.baseUrl,
      apiKey: provider.apiKey,
      headers: (provider.config?.headers as Record<string, string>) || {},
    });

    // 重试逻辑
    let lastError: Error | null = null;
    const maxRetries = options.maxRetries ?? 2;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await generateText({
          model: openaiProvider(modelName),
          messages,
          temperature: options.temperature ?? 0.7,
          maxOutputTokens: options.maxTokens ?? 2000,
        });

        // 记录使用
        this.providerRepo.recordUsage(provider.id);
        this.incrementRateLimit(provider);

        return {
          content: result.text,
          model: modelName,
          providerId: provider.id,
          providerName: provider.name,
          usage: {
            promptTokens: result.usage?.inputTokens ?? 0,
            completionTokens: result.usage?.outputTokens ?? 0,
            totalTokens: (result.usage?.inputTokens ?? 0) + (result.usage?.outputTokens ?? 0),
          },
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // 429 限流，切换到下一个供应商
        if ((error as any).status === 429 || (error as any).statusCode === 429) {
          console.warn(`[LLM] 供应商 ${provider.name} 限流，尝试下一个`);
          this.providerRepo.updateStatus(provider.id, 'error', lastError.message);
          // 重试时会自动选择下一个供应商
          break;
        }

        // 其他错误，等待后重试
        if (attempt < maxRetries) {
          await this.sleep(1000 * (attempt + 1));
        }
      }
    }

    // 所有重试都失败，标记供应商状态
    if (lastError) {
      this.providerRepo.updateStatus(provider.id, 'error', lastError.message);
      throw new Error(`LLM 调用失败（供应商 ${provider.name}，模型 ${modelName}）: ${lastError.message}`);
    }

    throw new Error('LLM 调用失败：未知错误');
  }

  /**
   * 结构化输出（JSON 模式）
   */
  async callForJSON<T>(
    messages: ModelMessage[],
    schema: { parse: (data: unknown) => T },
    options: LLMCallOptions = {},
  ): Promise<T> {
    const result = await this.call(messages, { ...options, jsonMode: true });

    // 尝试解析 JSON
    try {
      const parsed = JSON.parse(result.content);
      return schema.parse(parsed);
    } catch (error) {
      throw new Error(`LLM 返回的内容不是有效 JSON: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 列出所有可用供应商
   */
  listProviders(): LLMProvider[] {
    return this.providerRepo.findEnabled();
  }

  /**
   * 获取供应商详情
   */
  getProvider(id: string): LLMProvider | null {
    return this.providerRepo.findById(id);
  }

  /**
   * 创建供应商
   */
  createProvider(data: Omit<LLMProvider, 'id' | 'createdAt' | 'updatedAt'>): LLMProvider {
    return this.providerRepo.create(data);
  }

  /**
   * 更新供应商
   */
  updateProvider(id: string, data: Partial<LLMProvider>): LLMProvider | null {
    return this.providerRepo.update(id, data);
  }

  /**
   * 删除供应商
   */
  deleteProvider(id: string): boolean {
    return this.providerRepo.delete(id);
  }

  // ===== 私有方法 =====

  /**
   * 选择供应商（优先级 + 可用性）
   */
  private selectProvider(options: LLMCallOptions): LLMProvider | null {
    // 1. 指定了供应商 ID
    if (options.providerId) {
      const provider = this.providerRepo.findById(options.providerId);
      if (provider && provider.enabled && provider.status !== 'inactive') {
        return provider;
      }
      return null;
    }

    // 2. 自动选择：按优先级排序，选第一个可用的
    const enabled = this.providerRepo.findEnabled();
    for (const provider of enabled) {
      // 检查模型是否匹配
      if (options.model && !provider.models.includes(options.model)) {
        continue;
      }
      // 检查限流
      if (this.isRateLimited(provider)) {
        continue;
      }
      return provider;
    }

    return null;
  }

  /**
   * 检查是否被限流
   */
  private isRateLimited(provider: LLMProvider): boolean {
    const now = Date.now();

    // 检查每分钟限制
    const minuteKey = `${provider.id}:minute`;
    const minuteLimit = this.rateLimits.get(minuteKey);
    if (minuteLimit && now < minuteLimit.resetAt && minuteLimit.count >= provider.rateLimitRpm) {
      return true;
    }

    // 检查每日限制
    const today = new Date().toISOString().split('T')[0];
    const dailyKey = `${provider.id}:daily`;
    const dailyLimit = this.dailyCounts.get(dailyKey);
    if (dailyLimit && dailyLimit.date === today && dailyLimit.count >= provider.rateLimitDaily) {
      return true;
    }

    return false;
  }

  /**
   * 检查限流（抛出异常）
   */
  private checkRateLimit(provider: LLMProvider): void {
    if (this.isRateLimited(provider)) {
      throw new Error(`供应商 ${provider.name} 已达到限流阈值`);
    }
  }

  /**
   * 增加限流计数
   */
  private incrementRateLimit(provider: LLMProvider): void {
    const now = Date.now();

    // 每分钟计数
    const minuteKey = `${provider.id}:minute`;
    const minuteLimit = this.rateLimits.get(minuteKey);
    if (!minuteLimit || now >= minuteLimit.resetAt) {
      this.rateLimits.set(minuteKey, { count: 1, resetAt: now + 60000 });
    } else {
      minuteLimit.count++;
    }

    // 每日计数
    const today = new Date().toISOString().split('T')[0];
    const dailyKey = `${provider.id}:daily`;
    const dailyLimit = this.dailyCounts.get(dailyKey);
    if (!dailyLimit || dailyLimit.date !== today) {
      this.dailyCounts.set(dailyKey, { count: 1, date: today });
    } else {
      dailyLimit.count++;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ===== 单例 =====

let clientInstance: LLMClient | null = null;

export function getLLMClient(): LLMClient {
  if (!clientInstance) {
    clientInstance = new LLMClient();
  }
  return clientInstance;
}

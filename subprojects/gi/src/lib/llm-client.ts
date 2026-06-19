/**
 * Qwen LLM 客户端
 *
 * 封装 Qwen API 调用，支持限流、重试、多模型
 *
 * @see docs/design/06-LLM抽取与评分设计.md
 */

/**
 * LLM 调用参数
 */
export interface LLMCallParams {
  model?: string;
  messages: LLMMessage[];
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
  maxRetries?: number;
}

/**
 * LLM 消息
 */
export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | LLMContentPart[];
}

/**
 * 多模态内容（文本 + 图片）
 */
export interface LLMContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };
}

/**
 * LLM 响应
 */
export interface LLMResponse {
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * LLM 客户端配置
 */
export interface LLMClientConfig {
  apiKey: string;
  baseUrl: string;
  defaultModel?: string;
  rateLimit?: {
    rpm: number;       // 每分钟请求数
    dailyLimit: number; // 每日请求数
  };
}

/**
 * Qwen LLM 客户端
 */
export class QwenClient {
  private config: LLMClientConfig;
  private requestCount = 0;
  private lastResetTime = Date.now();
  private dailyCount = 0;
  private dailyResetDate = new Date().toDateString();

  constructor(config: LLMClientConfig) {
    this.config = {
      defaultModel: 'Qwen3.5-397B',
      rateLimit: { rpm: 30, dailyLimit: 1000 },
      ...config,
    };
  }

  /**
   * 调用 LLM
   */
  async call(params: LLMCallParams): Promise<LLMResponse> {
    // 限流检查
    this.checkRateLimit();

    const {
      model = this.config.defaultModel || 'qwen-plus',
      messages,
      temperature = 0.1,
      maxTokens = 2000,
      timeout = 30000,
      maxRetries = 2,
    } = params;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.doRequest({
          model,
          messages: this.formatMessages(messages),
          temperature,
          max_tokens: maxTokens,
        }, timeout);

        this.requestCount++;
        this.dailyCount++;

        // Debug: log raw response
        if (process.env.DEBUG_LLM === 'true') {
          console.log('[LLM Debug] Raw response:', JSON.stringify(response, null, 2));
        }

        // 处理思考模型（reasoning model）：如果 content 为 null，尝试从 reasoning 字段提取
        const message = response.choices?.[0]?.message;
        let content = message?.content || message?.text || '';

        // 如果是思考模型且 content 为空，从 reasoning 字段提取最终答案
        if (!content && message?.reasoning) {
          // reasoning 字段包含思考过程，通常最后会有答案
          // 简单处理：直接使用 reasoning 内容（生产环境可能需要更智能的解析）
          content = message.reasoning;
        }

        return {
          content,
          model: response.model,
          usage: {
            promptTokens: response.usage?.prompt_tokens || 0,
            completionTokens: response.usage?.completion_tokens || 0,
            totalTokens: response.usage?.total_tokens || 0,
          },
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // 429 限流，等待后重试
        if ((error as any).status === 429) {
          await this.sleep(60000);
          continue;
        }

        // 其他错误，短暂等待后重试
        if (attempt < maxRetries) {
          await this.sleep(1000 * (attempt + 1));
        }
      }
    }

    throw new LLMError(`LLM 调用失败（重试 ${maxRetries} 次后）: ${lastError?.message}`, lastError || undefined);
  }

  /**
   * 调用多模态模型（图片理解）
   */
  async callVision(imageUrl: string, prompt: string): Promise<string> {
    const response = await this.call({
      model: 'qwen-vl-max',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: imageUrl } },
            { type: 'text', text: prompt },
          ],
        },
      ],
      temperature: 0.1,
      maxTokens: 500,
    });

    return response.content;
  }

  /**
   * 执行 HTTP 请求
   */
  private async doRequest(body: object, timeout: number): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
        (error as any).status = response.status;
        throw error;
      }

      return response.json();
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * 格式化消息（适配 API 格式）
   */
  private formatMessages(messages: LLMMessage[]): any[] {
    return messages.map(msg => {
      if (typeof msg.content === 'string') {
        return { role: msg.role, content: msg.content };
      }
      // 多模态内容
      return {
        role: msg.role,
        content: msg.content.map(part => {
          if (part.type === 'text') {
            return { type: 'text', text: part.text };
          }
          return { type: 'image_url', image_url: { url: part.image_url?.url } };
        }),
      };
    });
  }

  /**
   * 检查限流
   */
  private checkRateLimit(): void {
    const now = Date.now();

    // 重置每分钟计数
    if (now - this.lastResetTime > 60000) {
      this.requestCount = 0;
      this.lastResetTime = now;
    }

    // 重置每日计数
    const today = new Date().toDateString();
    if (today !== this.dailyResetDate) {
      this.dailyCount = 0;
      this.dailyResetDate = today;
    }

    // 检查限制
    if (this.config.rateLimit) {
      if (this.requestCount >= this.config.rateLimit.rpm) {
        throw new LLMError('已达到每分钟请求限制');
      }
      if (this.dailyCount >= this.config.rateLimit.dailyLimit) {
        throw new LLMError('已达到每日请求限制');
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * LLM 错误
 */
export class LLMError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'LLMError';
  }
}

/**
 * 创建全局 LLM 客户端实例
 */
export function createLLMClient(): QwenClient {
  const apiKey = process.env.QWEN_API_KEY || '';
  const baseUrl = process.env.QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1';

  if (!apiKey) {
    console.warn('[LLM] QWEN_API_KEY 未配置，LLM 功能将不可用');
  }

  return new QwenClient({ apiKey, baseUrl });
}

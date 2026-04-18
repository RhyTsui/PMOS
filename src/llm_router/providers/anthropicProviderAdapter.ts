import { randomUUID } from 'node:crypto';
import type { ProviderExecutionResult } from '../../shared/schemas.js';
import type { ModelProvider, ModelProviderRequest } from '../../core/modelProvider.js';
import type { ResolvedProvider } from '../../core/providerRegistry.js';

type AnthropicMessagesResponse = {
  id?: string;
  model?: string;
  content?: Array<{
    type?: string;
    text?: string;
  }>;
  error?: {
    type?: string;
    message?: string;
  };
};

export class AnthropicProviderAdapter implements ModelProvider {
  readonly provider: ResolvedProvider;

  constructor(provider: ResolvedProvider) {
    this.provider = provider;
  }

  async execute(request: ModelProviderRequest): Promise<ProviderExecutionResult> {
    if (!this.provider.apiKey) {
      return this.buildErrorResult(request, `未检测到 ${this.provider.envKey}。`);
    }

    if (!['text', 'code', 'review'].includes(request.capability)) {
      return this.buildErrorResult(request, `Anthropic runtime 暂未执行 ${request.capability}。`);
    }

    const baseUrl = (process.env.ANTHROPIC_BASE_URL?.trim() || 'https://api.anthropic.com').replace(/\/$/, '');
    const model = 'claude-sonnet-4-6';

    try {
      const response = await fetch(`${baseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'anthropic-version': '2023-06-01',
          'x-api-key': this.provider.apiKey,
          authorization: `Bearer ${this.provider.apiKey}`,
        },
        body: JSON.stringify({
          model,
          max_tokens: 1024,
          messages: [{ role: 'user', content: request.prompt }],
        }),
      });

      const payload = (await response.json().catch(() => null)) as AnthropicMessagesResponse | null;
      if (!response.ok) {
        return this.buildErrorResult(
          request,
          payload?.error?.message ?? `Anthropic 请求失败 (${response.status})`,
          payload?.model ?? model,
        );
      }

      const outputText = payload?.content
        ?.filter((part) => part.type === 'text' && typeof part.text === 'string')
        .map((part) => part.text?.trim() ?? '')
        .filter(Boolean)
        .join('\n\n') || null;

      return {
        providerName: this.provider.name,
        providerType: this.provider.type,
        capability: request.capability,
        model: payload?.model ?? model,
        status: outputText ? 'success' : 'error',
        operationId: payload?.id ?? randomUUID(),
        outputText,
        assets: outputText
          ? [
              {
                kind: 'text',
                mimeType: 'text/plain',
                text: outputText,
                uri: null,
              },
            ]
          : [],
        warning: null,
        error: outputText ? null : 'Anthropic 返回成功，但没有可提取文本。',
      };
    } catch (error) {
      return this.buildErrorResult(
        request,
        error instanceof Error ? error.message : 'Anthropic 调用发生未知错误。',
        model,
      );
    }
  }

  private buildErrorResult(request: ModelProviderRequest, error: string, model = 'claude-sonnet-4-6'): ProviderExecutionResult {
    return {
      providerName: this.provider.name,
      providerType: this.provider.type,
      capability: request.capability,
      model,
      status: 'error',
      operationId: null,
      outputText: null,
      assets: [],
      warning: this.provider.deprecatedEnvInUse
        ? `当前使用旧环境变量 ${this.provider.legacyEnvKeys[0] ?? 'unknown'}，请迁移到 ${this.provider.envKey}。`
        : null,
      error,
    };
  }
}

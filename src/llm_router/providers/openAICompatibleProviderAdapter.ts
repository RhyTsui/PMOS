import { randomUUID } from 'node:crypto';
import type { ProviderExecutionResult } from '../../shared/schemas.js';
import type { ModelProvider, ModelProviderRequest } from '../../core/modelProvider.js';
import type { ResolvedProvider } from '../../core/providerRegistry.js';

type OpenAICompatibleResponse = {
  id?: string;
  model?: string;
  choices?: Array<{
    message?: {
      content?:
        | string
        | Array<{
            type?: string;
            text?: string;
          }>;
    };
  }>;
  error?: {
    message?: string;
  };
};

export class OpenAICompatibleProviderAdapter implements ModelProvider {
  readonly provider: ResolvedProvider;

  constructor(provider: ResolvedProvider) {
    this.provider = provider;
  }

  async execute(request: ModelProviderRequest): Promise<ProviderExecutionResult> {
    if (!this.provider.apiKey) {
      return this.buildErrorResult(request, `Missing ${this.provider.envKey}.`);
    }

    if (!['text', 'code', 'review'].includes(request.capability)) {
      return this.buildErrorResult(request, `OpenAI-compatible runtime does not implement ${request.capability}.`);
    }

    const baseUrl = this.getBaseUrl();
    const model = this.getModel();

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${this.provider.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'user',
              content: request.prompt,
            },
          ],
          temperature: 0.2,
        }),
      });

      const payload = (await response.json().catch(() => null)) as OpenAICompatibleResponse | null;
      if (!response.ok) {
        const errorMessage = payload?.error?.message?.trim() || `OpenAI-compatible request failed (${response.status}).`;
        return this.buildErrorResult(request, `${errorMessage} [status=${response.status}]`, payload?.model ?? model);
      }

      const content = payload?.choices?.[0]?.message?.content ?? null;
      const reasoning = (payload?.choices?.[0] as Record<string, unknown>)?.reasoning as string | null;
      const outputText = this.extractContent(content) || (typeof reasoning === 'string' && reasoning.trim() ? reasoning.trim() : null);

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
        error: outputText ? null : 'OpenAI-compatible provider returned no extractable text.',
      };
    } catch (error) {
      return this.buildErrorResult(
        request,
        error instanceof Error ? error.message : 'Unknown OpenAI-compatible provider error.',
        model,
      );
    }
  }

  private getBaseUrl() {
    return (this.provider.baseUrl?.trim()
      || process.env.OPENAI_COMPATIBLE_BASE_URL?.trim()
      || 'https://dashscope.aliyuncs.com/compatible-mode/v1').replace(/\/$/, '');
  }

  private getModel() {
    return this.provider.model?.trim() || process.env.OPENAI_COMPATIBLE_MODEL?.trim() || 'qwen-plus-latest';
  }

  private extractContent(
    content:
      | string
      | Array<{
          type?: string;
          text?: string;
        }>
      | null,
  ) {
    if (typeof content === 'string') {
      return content.trim() || null;
    }

    if (!Array.isArray(content)) {
      return null;
    }

    const text = content
      .map((item) => (item.type === 'text' && typeof item.text === 'string' ? item.text.trim() : ''))
      .filter(Boolean)
      .join('\n\n');

    return text || null;
  }

  private buildErrorResult(
    request: ModelProviderRequest,
    error: string,
    model = this.getModel(),
  ): ProviderExecutionResult {
    return {
      providerName: this.provider.name,
      providerType: this.provider.type,
      capability: request.capability,
      model,
      status: 'error',
      operationId: null,
      outputText: null,
      assets: [],
      warning: this.provider.deprecatedEnvInUse ? `Legacy env key detected for ${this.provider.name}.` : null,
      error,
    };
  }
}

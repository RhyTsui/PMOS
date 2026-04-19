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
      return this.buildErrorResult(request, `Missing ${this.provider.envKey}.`);
    }

    if (!['text', 'code', 'review'].includes(request.capability)) {
      return this.buildErrorResult(request, `Anthropic runtime does not implement ${request.capability}.`);
    }

    const baseUrl = this.getBaseUrl();
    const model = this.getModel();

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
        const errorMessage = payload?.error?.message?.trim() || `Anthropic request failed (${response.status}).`;
        return this.buildErrorResult(request, `${errorMessage} [status=${response.status}]`, payload?.model ?? model);
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
        error: outputText ? null : 'Anthropic returned successfully but no text could be extracted.',
      };
    } catch (error) {
      return this.buildErrorResult(
        request,
        error instanceof Error ? error.message : 'Unknown Anthropic provider error.',
        model,
      );
    }
  }

  private getBaseUrl() {
    return (this.provider.baseUrl?.trim() || process.env.ANTHROPIC_BASE_URL?.trim() || 'https://api.anthropic.com').replace(/\/$/, '');
  }

  private getModel() {
    return this.provider.model?.trim() || 'claude-sonnet-4-6';
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
      warning: this.provider.deprecatedEnvInUse
        ? `Legacy env key detected for ${this.provider.name}; migrate to ${this.provider.envKey}.`
        : null,
      error,
    };
  }
}

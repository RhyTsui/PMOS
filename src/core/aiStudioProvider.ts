import { randomUUID } from 'node:crypto';
import type { ProviderExecutionResult } from '../shared/schemas.js';
import type { ModelProvider, ModelProviderRequest } from './modelProvider.js';
import type { ResolvedProvider } from './providerRegistry.js';

type GeminiGenerateContentResponse = {
  responseId?: string;
  model?: string;
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message?: string;
  };
};

export class AiStudioProvider implements ModelProvider {
  readonly provider: ResolvedProvider;

  constructor(provider: ResolvedProvider) {
    this.provider = provider;
  }

  async execute(request: ModelProviderRequest): Promise<ProviderExecutionResult> {
    if (!this.provider.apiKey) {
      return this.buildErrorResult(request, `Missing ${this.provider.envKey}.`);
    }

    if (!['text', 'code', 'review', 'text-multimodal'].includes(request.capability)) {
      return this.buildErrorResult(request, `AI Studio runtime does not implement ${request.capability}.`);
    }

    const model = this.getModel();
    const baseUrl = this.getBaseUrl();

    try {
      const response = await fetch(
        `${baseUrl}/models/${model}:generateContent?key=${encodeURIComponent(this.provider.apiKey)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: request.prompt }],
              },
            ],
          }),
        },
      );

      const payload = (await response.json().catch(() => null)) as GeminiGenerateContentResponse | null;
      if (!response.ok) {
        const errorMessage = payload?.error?.message?.trim() || `AI Studio request failed (${response.status}).`;
        return this.buildErrorResult(request, `${errorMessage} [status=${response.status}]`, payload?.model ?? model);
      }

      const outputText = this.extractText(payload);

      return {
        providerName: this.provider.name,
        providerType: this.provider.type,
        capability: request.capability,
        model: payload?.model ?? model,
        status: outputText ? 'success' : 'error',
        operationId: payload?.responseId ?? randomUUID(),
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
        warning: outputText ? null : 'AI Studio returned successfully but no text could be extracted.',
        error: outputText ? null : 'AI Studio returned no extractable text.',
      };
    } catch (error) {
      return this.buildErrorResult(
        request,
        error instanceof Error ? error.message : 'Unknown AI Studio provider error.',
        model,
      );
    }
  }

  private getBaseUrl() {
    return (this.provider.baseUrl?.trim() || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/$/, '');
  }

  private getModel() {
    return this.provider.model?.trim() || process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';
  }

  private extractText(payload: GeminiGenerateContentResponse | null): string | null {
    const text = payload?.candidates
      ?.flatMap((candidate) => candidate.content?.parts ?? [])
      .map((part) => part.text?.trim() ?? '')
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
      warning: this.provider.deprecatedEnvInUse
        ? `Legacy env key detected for ${this.provider.name}; migrate to ${this.provider.envKey}.`
        : null,
      error,
    };
  }
}

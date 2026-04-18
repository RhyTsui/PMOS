import { randomUUID } from 'node:crypto';
import type { ProviderExecutionResult } from '../shared/schemas.js';
import type { ModelProvider, ModelProviderRequest } from './modelProvider.js';
import type { ResolvedProvider } from './providerRegistry.js';

export class AiStudioProvider implements ModelProvider {
  readonly provider: ResolvedProvider;

  constructor(provider: ResolvedProvider) {
    this.provider = provider;
  }

  async execute(request: ModelProviderRequest): Promise<ProviderExecutionResult> {
    if (!this.provider.apiKey) {
      return this.buildErrorResult(request, `未检测到 ${this.provider.envKey}。`);
    }

    if (request.capability !== 'text-multimodal') {
      return this.buildErrorResult(request, `AI Studio MVP 当前仅实现 text-multimodal，暂未执行 ${request.capability}。`);
    }

    const model = 'gemini-2.5-flash';

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(this.provider.apiKey)}`,
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

      if (!response.ok) {
        return this.buildErrorResult(request, `AI Studio 请求失败 (${response.status}): ${await response.text()}`, model);
      }

      const payload = (await response.json()) as GeminiGenerateContentResponse;
      const outputText = this.extractText(payload);

      return {
        providerName: this.provider.name,
        providerType: this.provider.type,
        capability: request.capability,
        model,
        status: 'success',
        operationId: payload.responseId ?? randomUUID(),
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
        warning: outputText ? null : 'AI Studio 返回成功，但没有可提取的文本内容。',
        error: null,
      };
    } catch (error) {
      return this.buildErrorResult(
        request,
        error instanceof Error ? error.message : 'AI Studio 调用发生未知错误。',
        model,
      );
    }
  }

  private extractText(payload: GeminiGenerateContentResponse): string | null {
    const text = payload.candidates
      ?.flatMap((candidate) => candidate.content?.parts ?? [])
      .map((part) => part.text?.trim() ?? '')
      .filter(Boolean)
      .join('\n\n');

    return text || null;
  }

  private buildErrorResult(
    request: ModelProviderRequest,
    error: string,
    model = 'gemini-2.5-flash',
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
        ? `当前使用旧环境变量 ${this.provider.legacyEnvKeys[0] ?? 'AI_STUDIO_API_KEY'}，请迁移到 ${this.provider.envKey}。`
        : null,
      error,
    };
  }
}

type GeminiGenerateContentResponse = {
  responseId?: string;
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

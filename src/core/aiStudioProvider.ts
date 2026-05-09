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
        inlineData?: {
          mimeType?: string;
          data?: string;
        };
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

    if (!['text', 'code', 'review', 'text-multimodal', 'image-generation'].includes(request.capability)) {
      return this.buildErrorResult(request, `AI Studio runtime does not implement ${request.capability}.`);
    }

    const model = this.getModel(request.capability);
    const baseUrl = this.getBaseUrl();

    try {
      const response = await fetch(
        `${baseUrl}/models/${model}:generateContent?key=${encodeURIComponent(this.provider.apiKey)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(this.buildRequestBody(request)),
        },
      );

      const payload = (await response.json().catch(() => null)) as GeminiGenerateContentResponse | null;
      if (!response.ok) {
        const errorMessage = payload?.error?.message?.trim() || `AI Studio request failed (${response.status}).`;
        return this.buildErrorResult(request, `${errorMessage} [status=${response.status}]`, payload?.model ?? model);
      }

      const outputText = this.extractText(payload);
      const assets = this.extractAssets(payload);
      const hasContent = Boolean(outputText) || assets.length > 0;

      return {
        providerName: this.provider.name,
        providerType: this.provider.type,
        capability: request.capability,
        model: payload?.model ?? model,
        status: hasContent ? 'success' : 'error',
        operationId: payload?.responseId ?? randomUUID(),
        outputText,
        assets,
        warning: hasContent ? null : 'AI Studio returned successfully but no supported text/image payload could be extracted.',
        error: hasContent ? null : 'AI Studio returned no extractable text or image.',
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

  private getModel(capability: ModelProviderRequest['capability']) {
    if (capability === 'image-generation') {
      return this.provider.model?.trim() || process.env.GEMINI_IMAGE_MODEL?.trim() || 'gemini-2.5-flash-image';
    }

    return this.provider.model?.trim() || process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';
  }

  private buildRequestBody(request: ModelProviderRequest) {
    if (request.capability === 'image-generation') {
      return {
        contents: [
          {
            role: 'user',
            parts: [{ text: this.buildImagePrompt(request) }],
          },
        ],
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      };
    }

    return {
      contents: [
        {
          role: 'user',
          parts: [{ text: request.prompt }],
        },
      ],
    };
  }

  private buildImagePrompt(request: ModelProviderRequest) {
    const profile = request.imageGeneration;
    if (!profile) {
      return request.prompt;
    }

    const aspectHint = profile.resolution === '1536x1024'
      ? 'Use a landscape composition close to 3:2.'
      : profile.resolution === '1024x1536'
        ? 'Use a portrait composition close to 2:3.'
        : 'Use a balanced square composition.';
    const qualityHint = profile.quality === 'high'
      ? 'Output should look high-resolution, sharp, clean, and presentation-ready.'
      : 'Output should be clear and readable.';

    return [
      request.prompt,
      '',
      'Output requirements:',
      '- Treat this as a product UI generation task, not an illustration poster.',
      '- Prioritize sharp typography, crisp interface lines, and readable labels.',
      '- Avoid soft-focus, blur, grain, haze, painterly textures, and low-detail surfaces.',
      `- ${aspectHint}`,
      `- ${qualityHint}`,
      ...(profile.outputHint ? [`- ${profile.outputHint}`] : []),
    ].join('\n');
  }

  private extractText(payload: GeminiGenerateContentResponse | null): string | null {
    const text = payload?.candidates
      ?.flatMap((candidate) => candidate.content?.parts ?? [])
      .map((part) => part.text?.trim() ?? '')
      .filter(Boolean)
      .join('\n\n');

    return text || null;
  }

  private extractAssets(payload: GeminiGenerateContentResponse | null): ProviderExecutionResult['assets'] {
    const assets: ProviderExecutionResult['assets'] = [];
    const parts = payload?.candidates?.flatMap((candidate) => candidate.content?.parts ?? []) ?? [];

    for (const part of parts) {
      if (typeof part.text === 'string' && part.text.trim()) {
        assets.push({
          kind: 'text',
          mimeType: 'text/plain',
          text: part.text.trim(),
          uri: null,
        });
      }

      if (part.inlineData?.data) {
        const mimeType = part.inlineData.mimeType?.trim() || 'image/png';
        assets.push({
          kind: mimeType.startsWith('image/') ? 'image' : 'prototype',
          mimeType,
          text: null,
          uri: `data:${mimeType};base64,${part.inlineData.data}`,
        });
      }
    }

    return assets;
  }

  private buildErrorResult(
    request: ModelProviderRequest,
    error: string,
    model = this.getModel(request.capability),
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

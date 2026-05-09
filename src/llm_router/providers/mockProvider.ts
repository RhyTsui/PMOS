import type { ProviderExecutionResult } from '../../shared/schemas.js';
import type { ModelProvider, ModelProviderRequest } from '../../core/modelProvider.js';
import type { ResolvedProvider } from '../../core/providerRegistry.js';

export class MockProvider implements ModelProvider {
  readonly provider: ResolvedProvider;

  constructor(provider: ResolvedProvider) {
    this.provider = provider;
  }

  async execute(request: ModelProviderRequest): Promise<ProviderExecutionResult> {
    const latestUserInput = this.extractLatestUserInput(request.prompt);
    const outputText = [
      `PMAIOS v0.2 LLM Router 已接管本次 ${request.capability} 请求。`,
      '当前使用本地 mock provider 返回回退结果。',
      latestUserInput ? `你的输入：${latestUserInput}` : null,
      '如需真实模型结果，请继续配置可用的在线 provider。',
    ]
      .filter(Boolean)
      .join('\n\n');

    return {
      providerName: this.provider.name,
      providerType: this.provider.type,
      capability: request.capability,
      model: 'mock-local-v1',
      status: 'success',
      operationId: `${request.runId}:${request.stageId}:mock`,
      outputText,
      assets: [
        {
          kind: 'text',
          mimeType: 'text/plain',
          text: outputText,
          uri: null,
        },
      ],
      warning: '当前为本地 mock 回退响应。',
      error: null,
    };
  }

  private extractLatestUserInput(prompt: string) {
    const matched = prompt.match(/当前用户输入：([\s\S]*)$/u);
    return matched?.[1]?.trim() ?? null;
  }
}

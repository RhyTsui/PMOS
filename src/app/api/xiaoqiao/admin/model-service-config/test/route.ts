import { NextRequest, NextResponse } from 'next/server';
import { LLMClient } from 'coze-coding-dev-sdk';
import {
  buildModelSdkConfig,
  getKnowledgeBaseApiKey,
  getKnowledgeBaseId,
  getKnowledgeBasesEndpoint,
  getKnowledgeSearchEndpoint,
  getModelServiceConfig,
  hasConfiguredKnowledgeCredentials,
  hasConfiguredModelCredentials,
  type ModelServiceConfig,
} from '@/lib/runtime-config';

interface TestRequestBody {
  target?: 'model' | 'knowledge';
  config?: Partial<ModelServiceConfig>;
}

interface KnowledgeBaseItem {
  id?: string;
}

function mergeConfig(base: ModelServiceConfig, patch?: Partial<ModelServiceConfig>): ModelServiceConfig {
  return {
    ...base,
    ...patch,
    updatedAt: base.updatedAt,
  };
}

function looksLikeMcpUrl(url: string): boolean {
  return /\/mcp\/?$/i.test(url) || /(^|[/.:-])mcp([/.:-]|$)/i.test(url);
}

async function resolveKnowledgeBaseIds(config: ModelServiceConfig): Promise<string[]> {
  const explicitId = getKnowledgeBaseId(config);
  if (explicitId) {
    return [explicitId];
  }

  const listEndpoint = getKnowledgeBasesEndpoint(config);
  const response = await fetch(listEndpoint, {
    headers: {
      'X-API-Key': getKnowledgeBaseApiKey(config),
    },
    cache: 'no-store',
  });

  const data = await response.json().catch(() => ({})) as {
    success?: boolean;
    data?: KnowledgeBaseItem[];
    error?: { message?: string };
  };

  if (!response.ok || !data.success) {
    throw new Error(data.error?.message || `获取知识库列表失败（HTTP ${response.status}）`);
  }

  return (data.data || [])
    .map(item => item.id?.trim())
    .filter((item): item is string => Boolean(item));
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as TestRequestBody;
  const target = body.target || 'model';

  try {
    const persistedConfig = await getModelServiceConfig();
    const mergedConfig = mergeConfig(persistedConfig, body.config);
    const startTime = Date.now();

    if (target === 'knowledge') {
      if (!hasConfiguredKnowledgeCredentials(mergedConfig)) {
        return NextResponse.json({
          ok: false,
          target,
          message: '请补齐知识库地址和知识库 Key，或提供可复用的服务地址与 API Key。',
        }, { status: 400 });
      }

      const knowledgeBaseUrl = (mergedConfig.knowledgeBaseUrl || mergedConfig.baseUrl).trim();
      if (looksLikeMcpUrl(knowledgeBaseUrl)) {
        return NextResponse.json({
          ok: false,
          target,
          message: '当前知识库测试走 REST API，不走 MCP 协议。请填写知识库 API 地址，不要填写 /mcp 服务地址。',
        }, { status: 400 });
      }

      const knowledgeBaseIds = await resolveKnowledgeBaseIds(mergedConfig);
      if (!knowledgeBaseIds.length) {
        return NextResponse.json({
          ok: false,
          target,
          message: '当前 API Key 下没有可访问的知识库，请先创建知识库或确认权限。',
        }, { status: 400 });
      }

      const response = await fetch(getKnowledgeSearchEndpoint(mergedConfig), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': getKnowledgeBaseApiKey(mergedConfig),
        },
        body: JSON.stringify({
          query: '连接测试',
          knowledge_base_ids: knowledgeBaseIds,
        }),
        cache: 'no-store',
      });
      const latencyMs = Date.now() - startTime;
      const data = await response.json().catch(() => ({})) as {
        success?: boolean;
        data?: Array<Record<string, unknown>>;
        error?: { message?: string };
      };

      if (!response.ok || !data.success) {
        return NextResponse.json({
          ok: false,
          target,
          latencyMs,
          knowledgeBaseIds,
          message: data.error?.message || `知识库返回异常（HTTP ${response.status}）`,
        });
      }

      return NextResponse.json({
        ok: true,
        target,
        latencyMs,
        knowledgeBaseIds,
        knowledgeBaseCount: knowledgeBaseIds.length,
        chunkCount: data.data?.length || 0,
        message: getKnowledgeBaseId(mergedConfig)
          ? `知识库连接正常，知识库 ID ${knowledgeBaseIds[0]} 可访问`
          : `知识库连接正常，已自动覆盖 ${knowledgeBaseIds.length} 个可访问知识库`,
      });
    }

    if (!hasConfiguredModelCredentials(mergedConfig)) {
      return NextResponse.json({
        ok: false,
        target,
        message: '请补齐 API Key、服务地址、模型地址和模型名称。',
      }, { status: 400 });
    }

    const client = new LLMClient(buildModelSdkConfig(mergedConfig));
    const chunks: string[] = [];
    for await (const chunk of client.stream(
      [{ role: 'user', content: '请仅回复：连接正常' }],
      { model: mergedConfig.modelName },
    )) {
      if (typeof chunk.content === 'string' && chunk.content.trim()) {
        chunks.push(chunk.content);
      }
    }

    const latencyMs = Date.now() - startTime;
    const preview = chunks.join('').trim().slice(0, 120);

    return NextResponse.json({
      ok: true,
      target,
      latencyMs,
      modelName: mergedConfig.modelName,
      message: preview ? `模型连接正常：${preview}` : '模型连接正常',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const isAuthError = /401|api key|authorization|bearer|x-api-key/i.test(message);
    const isNotFound = /404|not found/i.test(message);
    const friendlyMessage = target === 'knowledge'
      ? (isAuthError
        ? '知识库认证失败，请检查知识库 Key、知识库地址和权限。'
        : isNotFound
          ? '知识库连接失败：返回 404。当前知识库测试走 REST API，请检查地址是否填成了 MCP 地址或错误路径。'
          : `知识库连接失败：${message}`)
      : (isAuthError
        ? '大模型认证失败，请检查 API Key、服务地址和模型地址。'
        : `模型连接失败：${message}`);

    return NextResponse.json({
      ok: false,
      target,
      message: friendlyMessage,
    }, { status: 500 });
  }
}

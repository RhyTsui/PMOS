import { NextRequest, NextResponse } from 'next/server';
import { cozeLoopTracer, SpanKind } from '@cozeloop/ai';
import { LLMClient } from 'coze-coding-dev-sdk';
import {
  buildEffectiveModelRoute,
  buildModelSdkConfig,
  getKnowledgeBaseApiKey,
  getKnowledgeBaseId,
  getKnowledgeSearchEndpoint,
  getModelServiceConfig,
  hasConfiguredKnowledgeCredentials,
  hasConfiguredModelCredentials,
  resolveKnowledgeBaseIds,
  type ModelServiceConfig,
} from '@/lib/runtime-config';
import {
  buildStandardTraceInput,
  buildStandardTraceTags,
  buildTracePropagationHeaders,
  flushTrace,
  initTrace,
  truncate,
} from '@/lib/trace';
import { generateModelText } from '@/lib/model-router';
import type { ModelUseCase } from '@/contracts/model-service';

interface TestRequestBody {
  target?: 'model' | 'knowledge' | 'dataki-admin';
  useCase?: ModelUseCase;
  config?: Partial<ModelServiceConfig>;
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

async function fetchJsonWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
      cache: 'no-store',
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({}));
    return { response, data };
  } finally {
    clearTimeout(timer);
  }
}

function pickString(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function urlHost(value: string): string {
  try { return value ? new URL(value).host : ''; } catch { return value || ''; }
}

function maskSecret(value: string): string {
  return value ? `${value.slice(0, 4)}***${value.slice(-2)}` : '';
}

function parseConnectivityError(message: string) {
  const hostPortMatch = message.match(/(?:connect|ECONN[A-Z_]*|ENOTFOUND|EACCES).*(?:\s|:)([\d.]+):(\d+)/i)
    || message.match(/([\w.-]+):(\d+)/i);
  const host = hostPortMatch?.[1] || '';
  const port = hostPortMatch?.[2] ? Number(hostPortMatch[2]) : undefined;
  const normalized = message.toLowerCase();
  const category = normalized.includes('enotfound') || normalized.includes('dns')
    ? 'dns'
    : normalized.includes('proxy')
      ? 'proxy'
      : normalized.includes('timeout')
        ? 'timeout'
        : normalized.includes('eacces')
          ? 'permission'
          : normalized.includes('401') || normalized.includes('api key') || normalized.includes('unauthorized')
            ? 'api_key'
            : normalized.includes('403')
              ? 'permission'
              : normalized.includes('404')
                ? 'base_url'
                : normalized.includes('refused') || normalized.includes('econnrefused')
                  ? 'network'
                  : 'unknown';
  return { host, port, category };
}

async function runModelConnectivityTest(
  mergedConfig: ModelServiceConfig,
  startTime: number,
  target: 'model' | 'knowledge',
  useCase: ModelUseCase,
) {
  try {
    const result = await generateModelText({
      useCase,
      promptId: 'model-connectivity-test',
      messages: [{ role: 'user', content: '请仅回复：连接正常' }],
      fallback: '',
      traceMeta: { target, useCase },
      modelServiceConfig: mergedConfig,
    });
    const latencyMs = Date.now() - startTime;
    const preview = result.text.trim().slice(0, 120);
    const effectiveRoute = buildEffectiveModelRoute(mergedConfig, useCase);
    return NextResponse.json({
      ok: true,
      target,
      useCase,
      latencyMs,
      modelName: result.modelName || effectiveRoute.modelName || mergedConfig.modelName,
      effectiveRoute,
      modelSpanId: result.modelSpanId,
      fallbackUsed: result.fallbackUsed,
      configSource: effectiveRoute.source,
      baseUrlHost: urlHost(mergedConfig.baseUrl),
      modelBaseUrlHost: urlHost(mergedConfig.modelBaseUrl),
      apiKeySource: mergedConfig.apiKey ? 'runtime_or_env' : 'missing',
      apiKeyMasked: maskSecret(mergedConfig.apiKey),
      request_url: mergedConfig.modelBaseUrl || mergedConfig.baseUrl || '',
      message: preview ? `???????${preview}` : '??????',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const { host, port, category } = parseConnectivityError(message);
    const effectiveRoute = buildEffectiveModelRoute(mergedConfig, useCase);
    return NextResponse.json({
      ok: false,
      target,
      useCase,
      effectiveRoute,
      latencyMs: Date.now() - startTime,
      error_code: error instanceof Error ? error.name : 'Error',
      host,
      port,
      request_url: mergedConfig.modelBaseUrl || mergedConfig.baseUrl || '',
      baseUrlHost: urlHost(mergedConfig.baseUrl),
      modelBaseUrlHost: urlHost(mergedConfig.modelBaseUrl),
      apiKeySource: mergedConfig.apiKey ? 'runtime_or_env' : 'missing',
      root_cause: category,
      message: `模型连接失败：${message}`,
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as TestRequestBody;
  const target = body.target || 'model';
  const useCase = body.useCase || 'model_connectivity_test';

  try {
    const persistedConfig = await getModelServiceConfig();
    const mergedConfig = mergeConfig(persistedConfig, body.config);
    const startTime = Date.now();

    if (target === 'dataki-admin') {
      const datakiBaseUrl = (mergedConfig.datakiBaseUrl || 'https://dataki.dobest.com').replace(/\/$/, '');
      const adminEmail = mergedConfig.datakiAdminEmail.trim();
      const adminPassword = mergedConfig.datakiAdminPassword.trim();
      if (!adminEmail || !adminPassword) {
        return NextResponse.json({
          ok: false,
          target,
          message: '请补齐 Dataki 管理员账号和密码。',
        }, { status: 400 });
      }

      const login = await fetchJsonWithTimeout(`${datakiBaseUrl}/api/v1/auth/login`, {
        method: 'POST',
        body: JSON.stringify({ email: adminEmail, password: adminPassword }),
      });
      const loginRecord = asRecord(login.data);
      const loginData = asRecord(loginRecord.data);
      const token = pickString(loginRecord, ['token', 'access_token']) || pickString(loginData, ['token', 'access_token']);
      if (!login.response.ok || loginRecord.success === false || !token) {
        return NextResponse.json({
          ok: false,
          target,
          latencyMs: Date.now() - startTime,
          message: pickString(loginRecord, ['message', 'error']) || `Dataki 管理员登录失败（HTTP ${login.response.status}）`,
        }, { status: 400 });
      }

      const tenants = await fetchJsonWithTimeout(`${datakiBaseUrl}/api/v1/tenants/all`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      const tenantsRecord = asRecord(tenants.data);
      if (!tenants.response.ok || tenantsRecord.success === false) {
        return NextResponse.json({
          ok: false,
          target,
          latencyMs: Date.now() - startTime,
          message: pickString(tenantsRecord, ['message', 'error']) || `Dataki 用户列表读取失败（HTTP ${tenants.response.status}）`,
        }, { status: 400 });
      }

      return NextResponse.json({
        ok: true,
        target,
        latencyMs: Date.now() - startTime,
        message: 'Dataki 管理员授权正常，可用于首次登录时读取个人知识库授权。',
      });
    }

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

    return await runModelConnectivityTest(mergedConfig, startTime, target, useCase);

    const client = new LLMClient(buildModelSdkConfig(mergedConfig));
    const chunks: string[] = [];
    for await (const chunk of client.stream(
      [{ role: 'user', content: '请仅回复：连接正常' }],
      { model: mergedConfig.modelName },
    )) {
      const contentParts = Array.isArray(chunk.content)
        ? chunk.content as Array<string | { text?: string }>
        : [];
      const chunkText = contentParts.length > 0
        ? contentParts.map((part) => typeof part === 'string' ? part : (part.text || '')).join('')
        : typeof chunk.content === 'string'
          ? chunk.content
          : '';
      const normalizedChunkText = String(chunkText);
      if (normalizedChunkText.trim()) {
        chunks.push(normalizedChunkText);
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

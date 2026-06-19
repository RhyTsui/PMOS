/**
 * IntentOrch 候选规划层
 *
 * 接入位置：意图理解（requirement drafting）完成后，能力发现（capability discovery）之前。
 * 职责：将用户问法 + 意图 + 对话历史交给 IntentOrch 做意图解析和工具编排预分析，
 *       结果先归一化为 planner candidate，再交给 Plan Arbitrator/Prompt 变量契约消费。
 *
 * 关键约束：
 * - 不改现有链路决策（不替换工具选择、不改 executionCapabilityDecision）
 * - 不把 mappedParameters/raw tool args 作为 Prompt 或 Trace 权威输入
 * - 复用系统模型配置（DashScope → IntentOrch openai provider）
 * - 支持多 MCP Server 连接
 * - INTENT_ORCH_ENABLED 环境变量控制开关
 * - 增强失败静默忽略，不影响主链路
 */

import { createSDK, type IntentOrchSDK } from '@mcpilotx/intentorch';
import { getModelServiceConfig, type ModelServiceConfig } from './runtime-config';
import { listMcpServers } from './mcp-server-store';
import type { MCPClientConfig } from '@mcpilotx/intentorch';

// ─── Types ───────────────────────────────────────────────

export interface IntentOrchEnhancementInput {
  message: string;
  userRequirement: {
    metrics: string[];
    dimensions: Array<{ key: string }>;
    dateRange: { type: string; start?: string; end?: string };
    task: string;
  };
  routeIntent: string;
  conversationHistory: Array<{ role: string; content: string }>;
}

export interface IntentOrchWorkflowPlan {
  parsedIntents: Array<{
    id: string;
    type: string;
    description: string;
    parameters: Record<string, unknown>;
  }>;
  toolSelections: Array<{
    intentId: string;
    toolName: string;
    toolDescription: string;
    mappedParameters: Record<string, unknown>;
    confidence: number;
  }>;
  executionOrder: string[];
  dependencies: Array<{ from: string; to: string }>;
  estimatedSteps: number;
}

export interface IntentOrchEnhancementResult {
  success: boolean;
  plan: IntentOrchWorkflowPlan | null;
  toolDigests: Array<{ name: string; description: string; serverName: string }>;
  durationMs: number;
  error?: string;
  warnings: string[];
}

// ─── SDK Singleton ───────────────────────────────────────

let sdkInstance: IntentOrchSDK | null = null;
let sdkInitPromise: Promise<IntentOrchSDK | null> | null = null;
let lastModelConfigFingerprint = '';
let sdkInitGeneration = 0;
let lastSdkInitFailure: string | undefined;

export const DEFAULT_INTENT_ORCH_TOTAL_TIMEOUT_MS = 8000;
export const DEFAULT_INTENT_ORCH_MCP_CONNECT_TIMEOUT_MS = 2000;

function resolveIntentOrchTotalTimeoutMs(value: unknown = process.env.XIAOQIAO_INTENT_ORCH_TOTAL_TIMEOUT_MS): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_INTENT_ORCH_TOTAL_TIMEOUT_MS;
  return Math.max(100, Math.min(10000, parsed));
}

function resolveIntentOrchMcpConnectTimeoutMs(value: unknown = process.env.XIAOQIAO_INTENT_ORCH_MCP_CONNECT_TIMEOUT_MS): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_INTENT_ORCH_MCP_CONNECT_TIMEOUT_MS;
  return Math.max(100, Math.min(3000, parsed));
}

function normalizeIntentOrchErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error || '');
  if (/cloud intent engine/i.test(message) && /not initialized/i.test(message)) {
    return 'engine_not_initialized';
  }
  if (/api[_ -]?key|authorization|unauthorized|forbidden/i.test(message)) {
    return 'model_auth_unavailable';
  }
  if (/timeout|timed out|abort/i.test(message)) {
    return 'intentorch_timeout';
  }
  return message ? 'intentorch_unavailable' : 'unknown';
}

function buildModelFingerprint(config: ModelServiceConfig): string {
  return `${config.apiKey.slice(0, 8)}:${config.modelBaseUrl}:${config.modelName}`;
}

function mapModelConfig(config: ModelServiceConfig): { provider: string; apiKey: string; endpoint: string; model: string } {
  // DashScope (阿里云) 使用 OpenAI 兼容接口
  return {
    provider: 'openai',
    apiKey: config.apiKey,
    endpoint: config.modelBaseUrl || config.baseUrl,
    model: config.modelName,
  };
}

function readIntentOrchModelReadiness(config: ModelServiceConfig): string | undefined {
  if (!config.enabled) return 'model_service_disabled';
  if (!config.apiKey) return 'model_api_key_missing';
  if (!(config.modelBaseUrl || config.baseUrl)) return 'model_endpoint_missing';
  if (!config.modelName) return 'model_name_missing';
  return undefined;
}

function mapMcpServersToIntentOrch(servers: Array<{ id: string; name: string; endpoint_url: string; transport: string; enabled: boolean; status: string }>): Array<{ name: string; config: MCPClientConfig }> {
  return servers
    .filter(s => s.enabled && s.status === 'connected' && s.endpoint_url)
    .map(s => ({
      name: s.name || s.id,
      config: {
        transport: {
          type: (s.transport === 'streamable-http' ? 'http' : s.transport || 'http') as 'stdio' | 'http' | 'sse',
          url: s.endpoint_url,
        },
      },
    }));
}

function isCloudIntentEngineReady(sdk: IntentOrchSDK | null): boolean {
  if (!sdk) return false;
  const statusReader = (sdk as IntentOrchSDK & { getCloudIntentEngineStatus?: () => { initialized?: boolean } }).getCloudIntentEngineStatus;
  if (typeof statusReader !== 'function') return true;
  try {
    return statusReader.call(sdk)?.initialized === true;
  } catch {
    return false;
  }
}

function resetIntentOrchSdkState(): void {
  sdkInstance = null;
  sdkInitPromise = null;
  lastModelConfigFingerprint = '';
  sdkInitGeneration += 1;
}

async function connectMcpServerWithTimeout(
  sdk: IntentOrchSDK,
  name: string,
  config: MCPClientConfig,
  timeoutMs: number,
): Promise<{ connected: boolean; name: string; warning?: string }> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const connection = sdk.connectMCPServer(config, name)
    .then(() => ({ connected: true, name }))
    .catch((err) => ({
      connected: false,
      name,
      warning: err instanceof Error ? err.message : String(err),
    }));
  const timeout = new Promise<{ connected: false; name: string; warning: string }>((resolve) => {
    timeoutId = setTimeout(() => resolve({
      connected: false,
      name,
      warning: `mcp_connect_timeout:${timeoutMs}`,
    }), timeoutMs);
  });

  try {
    return await Promise.race([connection, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
    connection.catch(() => undefined);
  }
}

async function getOrInitSDK(modelConfigInput?: ModelServiceConfig): Promise<IntentOrchSDK | null> {
  if (process.env.INTENT_ORCH_ENABLED !== 'true') return null;

  const modelConfig = modelConfigInput ?? await getModelServiceConfig();
  const readinessFailure = readIntentOrchModelReadiness(modelConfig);
  if (readinessFailure) {
    lastSdkInitFailure = readinessFailure;
    console.warn('[IntentOrch] SDK 初始化前置条件不满足:', readinessFailure);
    return null;
  }

  const fingerprint = buildModelFingerprint(modelConfig);
  if (sdkInstance && fingerprint === lastModelConfigFingerprint && isCloudIntentEngineReady(sdkInstance)) return sdkInstance;
  if (sdkInstance && fingerprint === lastModelConfigFingerprint && !isCloudIntentEngineReady(sdkInstance)) {
    resetIntentOrchSdkState();
  }

  // Re-init if config changed or first time
  if (sdkInitPromise) return sdkInitPromise;

  const initGeneration = sdkInitGeneration;
  sdkInitPromise = (async () => {
    try {
      lastSdkInitFailure = undefined;
      const sdk = createSDK();
      sdk.init();

      // 配置 AI — 复用系统模型
      const aiConfig = mapModelConfig(modelConfig);
      await sdk.configureAI({
        provider: aiConfig.provider as 'openai',
        apiKey: aiConfig.apiKey,
        apiEndpoint: aiConfig.endpoint,
        model: aiConfig.model,
      });
      await sdk.initCloudIntentEngine();

      // 连接所有已启用的 MCP Server
      const servers = await listMcpServers();
      const mcpConfigs = mapMcpServersToIntentOrch(servers);
      const mcpConnectTimeoutMs = resolveIntentOrchMcpConnectTimeoutMs();
      const connectionResults = await Promise.all(
        mcpConfigs.map(({ name, config }) => connectMcpServerWithTimeout(sdk, name, config, mcpConnectTimeoutMs)),
      );
      for (const result of connectionResults) {
        if (result.connected) continue;
        console.warn(`[IntentOrch] MCP 连接失败 (${result.name}):`, result.warning || 'mcp_connect_failed');
      }

      if (initGeneration !== sdkInitGeneration) return null;
      sdkInstance = sdk;
      lastModelConfigFingerprint = fingerprint;
      lastSdkInitFailure = undefined;
      return sdk;
    } catch (err) {
      lastSdkInitFailure = normalizeIntentOrchErrorMessage(err);
      console.warn('[IntentOrch] SDK 初始化失败:', lastSdkInitFailure);
      if (initGeneration === sdkInitGeneration) resetIntentOrchSdkState();
      return null;
    } finally {
      if (initGeneration === sdkInitGeneration) sdkInitPromise = null;
    }
  })();

  return sdkInitPromise;
}

// ─── Main Enhancement Function ───────────────────────────

export async function runIntentOrchEnhancement(
  input: IntentOrchEnhancementInput,
  options?: { timeoutMs?: number },
): Promise<IntentOrchEnhancementResult | null> {
  if (process.env.INTENT_ORCH_ENABLED !== 'true') return null;

  const startTime = Date.now();
  const timeoutMs = resolveIntentOrchTotalTimeoutMs(options?.timeoutMs);
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const work = runIntentOrchEnhancementCore(input, startTime);
  const timeout = new Promise<IntentOrchEnhancementResult>((resolve) => {
    timeoutId = setTimeout(() => {
      sdkInitPromise = null;
      resolve({
        success: false,
        plan: null,
        toolDigests: [],
        durationMs: Date.now() - startTime,
        error: 'intentorch_timeout',
        warnings: [`IntentOrch 总超时 ${timeoutMs}ms，已跳过该候选。`],
      });
      resetIntentOrchSdkState();
    }, timeoutMs);
  });

  try {
    return await Promise.race([work, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
    work.catch(() => undefined);
  }
}

async function runIntentOrchEnhancementCore(
  input: IntentOrchEnhancementInput,
  startTime = Date.now(),
): Promise<IntentOrchEnhancementResult | null> {
  const warnings: string[] = [];

  try {
    const modelConfig = await getModelServiceConfig();
    const readinessFailure = readIntentOrchModelReadiness(modelConfig);
    if (readinessFailure) {
      return {
        success: false,
        plan: null,
        toolDigests: [],
        durationMs: Date.now() - startTime,
        error: readinessFailure,
        warnings,
      };
    }

    const sdk = await getOrInitSDK(modelConfig);
    if (!sdk) {
      return {
        success: false,
        plan: null,
        toolDigests: [],
        durationMs: Date.now() - startTime,
        error: lastSdkInitFailure || 'sdk_not_available',
        warnings,
      };
    }

    // 获取已连接的工具列表
    const tools = sdk.listTools();
    const toolDigests = tools.map(t => ({
      name: t.name,
      description: t.description,
      serverName: t.serverName || t.serverId || '',
    }));

    if (!tools.length) {
      return {
        success: false,
        plan: null,
        toolDigests: [],
        durationMs: Date.now() - startTime,
        error: 'no_tools_available',
        warnings: ['IntentOrch 未连接到任何 MCP 工具'],
      };
    }

    // 构造增强查询 — 将意图上下文拼入，帮助 IntentOrch 更好理解
    const enhancedQuery = buildEnhancedQuery(input);

    // 使用 parseAndPlanWorkflow 做意图解析 + 工具选择（不执行）
    const workflowResult = await parseAndPlanWorkflowWithRecovery(sdk, enhancedQuery);

    if (!workflowResult.success || !workflowResult.plan) {
      return {
        success: false,
        plan: null,
        toolDigests,
        durationMs: Date.now() - startTime,
        error: workflowResult.error || 'workflow_plan_failed',
        warnings,
      };
    }

    const plan: IntentOrchWorkflowPlan = {
      parsedIntents: workflowResult.plan.parsedIntents,
      toolSelections: workflowResult.plan.toolSelections,
      executionOrder: workflowResult.plan.executionOrder,
      dependencies: workflowResult.plan.dependencies,
      estimatedSteps: workflowResult.plan.estimatedSteps,
    };

    return {
      success: true,
      plan,
      toolDigests,
      durationMs: Date.now() - startTime,
      warnings,
    };
  } catch (err) {
    const message = normalizeIntentOrchErrorMessage(err);
    console.warn('[IntentOrch] 增强执行异常:', message);
    return {
      success: false,
      plan: null,
      toolDigests: [],
      durationMs: Date.now() - startTime,
      error: message,
      warnings,
    };
  }
}

async function parseAndPlanWorkflowWithRecovery(
  sdk: IntentOrchSDK,
  query: string,
): Promise<Awaited<ReturnType<IntentOrchSDK['parseAndPlanWorkflow']>>> {
  try {
    return await sdk.parseAndPlanWorkflow(query);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err || '');
    if (!/cloud intent engine/i.test(message) || !/not initialized/i.test(message)) throw err;
    resetIntentOrchSdkState();
    const recoveredSdk = await getOrInitSDK();
    if (!recoveredSdk) throw err;
    return recoveredSdk.parseAndPlanWorkflow(query);
  }
}

function buildEnhancedQuery(input: IntentOrchEnhancementInput): string {
  const parts: string[] = [input.message];

  if (input.routeIntent && input.routeIntent !== 'general') {
    parts.push(`[意图类型: ${input.routeIntent}]`);
  }

  if (input.userRequirement.metrics.length) {
    parts.push(`[关注指标: ${input.userRequirement.metrics.join(', ')}]`);
  }

  if (input.userRequirement.dimensions.length) {
    parts.push(`[分析维度: ${input.userRequirement.dimensions.map(d => d.key).join(', ')}]`);
  }

  if (input.userRequirement.dateRange.type !== 'unknown') {
    const { type, start, end } = input.userRequirement.dateRange;
    parts.push(`[时间范围: ${type}${start ? ` ${start}` : ''}${end ? ` ~ ${end}` : ''}]`);
  }

  if (input.conversationHistory.length) {
    const recentHistory = input.conversationHistory
      .slice(-3)
      .map(h => `${h.role}: ${h.content.slice(0, 100)}`)
      .join('\n');
    parts.push(`[对话上下文]\n${recentHistory}`);
  }

  return parts.join('\n');
}

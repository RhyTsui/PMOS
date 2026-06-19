import { runPlannerOrchestratorShadow, type PlannerOrchestratorResult } from './planner-orchestrator';
import { getModelUseCaseDefinition } from '@/contracts/model-service/model-use-case-registry';
import { PROMPT_VARIABLE_SCHEMAS, type PromptVariableValidationResult } from '@/contracts/model-service/prompt-variable-contract';
import { getModelServiceConfig, type ModelServiceConfig } from './runtime-config';
import { generateModelText } from './model-router';
import type { PlannerPlanContract } from '@/contracts/planner/planner-plan-contract';

/**
 * Planner Shadow - 旁路规划观测
 *
 * 只生成 PlannerPlanContract 候选，只记录观测，不接管路由、不选择工具、不执行 MCP。
 * 不影响主链，fail-open。
 */

export interface PlannerShadowInput {
  message: string;
  history?: Array<{ role: string; content: string }>;
  locale?: string;
  timeoutMs?: number;
}

/**
 * Planner Shadow Observation Payload
 * 只包含 summary，不包含敏感信息
 */
export interface PlannerShadowObservationPayload {
  status: PlannerOrchestratorResult['status'];
  durationMs: number;
  modelName?: string;
  validationValid?: boolean;
  errorCodes: string[];
  warningCodes: string[];
  planSummary?: {
    task_type?: string;
    service_intent?: string;
    evidence_mode?: string;
    confidence?: number;
    risk_level?: string;
    clarification_needed?: boolean;
    plan_steps_count?: number;
    candidate_capabilities_count?: number;
    tool_selection_priors_count?: number;
  };
}

/**
 * 校验 prompt variables
 */
function validatePromptVariables(
  useCase: 'planner_shadow',
  variables: Record<string, unknown>,
): PromptVariableValidationResult {
  const schema = PROMPT_VARIABLE_SCHEMAS[useCase];
  if (!schema) {
    return { passed: false, missingRequired: ['schema_not_found'], forbiddenPaths: [] };
  }

  const missingRequired = schema.required_variables.filter((v) => {
    const value = variables[v];
    return value === undefined || value === null || value === '';
  });

  const forbiddenPaths: string[] = [];
  for (const forbidden of schema.forbidden_variables) {
    if (variables[forbidden] !== undefined) {
      forbiddenPaths.push(forbidden);
    }
  }

  return {
    passed: missingRequired.length === 0 && forbiddenPaths.length === 0,
    missingRequired,
    forbiddenPaths,
  };
}

/**
 * 创建 Planner LLM Client
 */
async function createPlannerLLMClient(): Promise<{
  generatePlannerJson: (input: { prompt: string; timeoutMs: number; modelName?: string }) => Promise<{ text: string; modelName?: string; latencyMs?: number }>;
} | null> {
  const config = await getModelServiceConfig();
  if (!config.enabled || !config.apiKey) {
    return null;
  }

  return {
    generatePlannerJson: async ({ prompt, timeoutMs }) => {
      const startTime = Date.now();
      try {
        const response = await generateModelText({
          useCase: 'planner_shadow',  // 使用独立的 planner_shadow use case
          messages: [{ role: 'user', content: prompt }],
          input: { message: prompt },
          modelServiceConfig: config,
          fallback: '',
        });

        return {
          text: response.text,
          modelName: response.modelName,
          latencyMs: Date.now() - startTime,
        };
      } catch (error) {
        throw error;
      }
    },
  };
}

/**
 * 运行 Planner Shadow
 *
 * Fail-open: 任何异常都返回 disabled 状态，不影响主链。
 */
export async function runPlannerShadow(input: PlannerShadowInput): Promise<PlannerOrchestratorResult> {
  const startTime = Date.now();

  // 1. 检查开关
  if (process.env.PLANNER_FIRST_SHADOW_ENABLED !== 'true') {
    return {
      status: 'disabled',
      errors: [],
      warnings: [],
      durationMs: 0,
    };
  }

  // 2. 检查 use case 是否存在
  const definition = getModelUseCaseDefinition('planner_shadow');
  if (!definition) {
    return {
      status: 'disabled',
      errors: [{ code: 'use_case_not_found', message: 'planner_shadow use case not found' }],
      warnings: [],
      durationMs: Date.now() - startTime,
    };
  }

  // 3. 检查 required variables
  const now = new Date().toISOString();
  const locale = input.locale || 'zh-CN';
  const variables = {
    message: input.message,
    now,
    locale,
    conversation_history: input.history,
  };

  if (!input.message || !now || !locale) {
    return {
      status: 'disabled',
      errors: [{ code: 'missing_required_variables', message: 'Missing required variables' }],
      warnings: [],
      durationMs: Date.now() - startTime,
    };
  }

  // 4. 检查 forbidden variables
  const forbiddenCheck = validatePromptVariables('planner_shadow', variables);
  if (!forbiddenCheck.passed) {
    return {
      status: 'disabled',
      errors: [
        ...forbiddenCheck.missingRequired.map((v) => ({ code: 'missing_required', message: `Missing required variable: ${v}` })),
        ...forbiddenCheck.forbiddenPaths.map((v) => ({ code: 'forbidden_variable', message: `Forbidden variable present: ${v}` })),
      ],
      warnings: [],
      durationMs: Date.now() - startTime,
    };
  }

  // 5. 创建 LLM client
  const llm = await createPlannerLLMClient();
  if (!llm) {
    return {
      status: 'llm_unavailable',
      errors: [{ code: 'llm_unavailable', message: 'LLM client not available' }],
      warnings: [],
      durationMs: Date.now() - startTime,
    };
  }

  // 6. 调用 orchestrator
  try {
    const result = await runPlannerOrchestratorShadow({
      message: input.message,
      conversationHistory: input.history,
      now,
      locale,
      llm,
      timeoutMs: input.timeoutMs || Number(process.env.PLANNER_FIRST_SHADOW_TIMEOUT_MS) || 3000,
    });

    return result;
  } catch (error) {
    // Fail-open: 任何异常都返回 disabled，不影响主链
    return {
      status: 'disabled',
      errors: [{ code: 'unexpected_error', message: String(error) }],
      warnings: [],
      durationMs: Date.now() - startTime,
    };
  }
}

/**
 * 构建 Planner Shadow Observation Payload
 * 只提取 summary 信息，禁止输出敏感字段
 */
export function buildPlannerShadowObservationPayload(
  result: PlannerOrchestratorResult,
): PlannerShadowObservationPayload {
  const payload: PlannerShadowObservationPayload = {
    status: result.status,
    durationMs: result.durationMs,
    modelName: result.modelName,
    validationValid: result.validation?.valid,
    errorCodes: result.errors.map(e => e.code),
    warningCodes: result.warnings.map(w => w.code),
  };

  // 只提取 plan summary，不包含完整 plan
  if (result.plan) {
    payload.planSummary = {
      task_type: result.plan.task_type,
      service_intent: result.plan.service_intent,
      evidence_mode: result.plan.evidence_mode,
      confidence: result.plan.confidence,
      risk_level: result.plan.risk_level,
      clarification_needed: result.plan.clarification_needed,
      plan_steps_count: result.plan.plan_steps?.length,
      candidate_capabilities_count: result.plan.candidate_capabilities?.length,
      tool_selection_priors_count: result.plan.tool_selection_priors?.length,
    };
  }

  return payload;
}

/**
 * 构建 Planner Shadow Summary 字符串
 */
export function buildPlannerShadowSummary(payload: PlannerShadowObservationPayload): string {
  if (payload.status === 'disabled') {
    return 'Planner Shadow 已禁用';
  }

  if (payload.status === 'succeeded' && payload.planSummary) {
    const ps = payload.planSummary;
    return `Planner Shadow 成功：${ps.task_type} / ${ps.service_intent} / ${ps.evidence_mode} (confidence: ${ps.confidence?.toFixed(2)})`;
  }

  if (payload.status === 'timeout') {
    return `Planner Shadow 超时 (${payload.durationMs}ms)`;
  }

  if (payload.status === 'contract_validation_failed') {
    return `Planner Shadow 契约校验失败：${payload.errorCodes.join(', ')}`;
  }

  return `Planner Shadow ${payload.status}：${payload.errorCodes.join(', ') || 'unknown'}`;
}

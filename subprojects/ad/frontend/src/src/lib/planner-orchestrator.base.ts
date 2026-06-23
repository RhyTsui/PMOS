import { validatePlannerPlanContract } from './planner-contract-validator';
import type { PlannerPlanContract } from '@/contracts/planner/planner-plan-contract';
import type { PlannerContractValidationResult } from './planner-contract-validator';
import { getPromptContent } from '@/lib/prompt-store';

export interface PlannerOrchestratorInput {
  message: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  now?: string;
  locale?: string;
  modelName?: string;
  timeoutMs?: number;
  llm?: PlannerLLMClient;
}

export interface PlannerLLMClient {
  generatePlannerJson(input: {
    prompt: string;
    timeoutMs: number;
    modelName?: string;
  }): Promise<{ text: string; modelName?: string; latencyMs?: number }>;
}

export interface PlannerOrchestratorResult {
  status:
    | 'disabled'
    | 'llm_unavailable'
    | 'timeout'
    | 'json_parse_failed'
    | 'contract_validation_failed'
    | 'succeeded';
  plan?: PlannerPlanContract;
  validation?: PlannerContractValidationResult;
  errors: Array<{ code: string; message: string }>;
  warnings: Array<{ code: string; message: string }>;
  durationMs: number;
  modelName?: string;
  plannerMode?: 'shadow' | 'main';
  promptSource?: 'managed' | 'builtin_local_degrade';
  fallbackPolicy?: 'fail_open_contract_guarded';
  comparisonTrace?: {
    route_candidate_only: boolean;
    can_execute_tools: boolean;
    can_change_user_visible_result: boolean;
  };
  debugSummary?: {
    output_length: number;
    starts_with_char_type: 'brace' | 'bracket' | 'backtick' | 'letter' | 'whitespace' | 'other' | 'empty';
    ends_with_char_type: 'brace' | 'bracket' | 'backtick' | 'letter' | 'whitespace' | 'other' | 'empty';
    contains_json_fence: boolean;
    contains_left_brace: boolean;
    contains_right_brace: boolean;
    brace_balance: number;
    json_object_count: number;
    parse_error_code?: string;
    parse_error_message_short?: string;
    modelName?: string;
    durationMs: number;
  };
}

/**
 * Extract JSON from LLM output with enhanced safety
 * Supports: pure JSON, fenced blocks, JSON with surrounding text
 * Rejects: arrays, multiple JSON objects, multiple fenced blocks
 */
function extractJson(text: string): { json: string; warning?: string } | null {
  const trimmed = text.trim();

  // Helper function to log debug info
  const logFailure = (reason: string) => {
    if (process.env.NODE_ENV === 'development' || process.env.PLANNER_DEBUG === 'true') {
      console.warn(`[PlannerOrchestrator] JSON extraction failed: ${reason}`);
      console.warn(`[PlannerOrchestrator] LLM output preview (first 200 chars): ${trimmed.slice(0, 200)}`);
      console.warn(`[PlannerOrchestrator] Output length: ${trimmed.length}`);
      console.warn(`[PlannerOrchestrator] Starts with: ${trimmed[0] || '(empty)'}`);
      console.warn(`[PlannerOrchestrator] Ends with: ${trimmed[trimmed.length - 1] || '(empty)'}`);
    }
  };

  // 1. Check for fenced code blocks
  const fencedMatches = [...trimmed.matchAll(/```(?:json)?\s*([\s\S]*?)\s*```/g)];

  if (fencedMatches.length > 1) {
    logFailure('Multiple fenced blocks found');
    return null; // Reject multiple fenced blocks
  }

  if (fencedMatches.length === 1) {
    const jsonContent = fencedMatches[0][1].trim();
    // Validate it's an object, not an array
    if (jsonContent.startsWith('[')) {
      logFailure('Fenced block contains array instead of object');
      return null; // Reject arrays
    }
    return { json: jsonContent };
  }

  // 2. No fenced blocks - try to find JSON object with brace matching
  const firstBrace = trimmed.indexOf('{');
  const firstBracket = trimmed.indexOf('[');

  // If starts with array bracket, reject
  if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
    logFailure('Output starts with array bracket');
    return null;
  }

  if (firstBrace === -1) {
    logFailure('No JSON object found (no opening brace)');
    return null; // No JSON object found
  }

  // Brace matching to extract complete JSON object
  let braceCount = 0;
  let inString = false;
  let escape = false;
  let jsonEnd = -1;

  for (let i = firstBrace; i < trimmed.length; i++) {
    const char = trimmed[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (char === '\\') {
      escape = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === '{') {
        braceCount++;
      } else if (char === '}') {
        braceCount--;
        if (braceCount === 0) {
          jsonEnd = i;
          break;
        }
      }
    }
  }

  if (jsonEnd === -1) {
    logFailure(`Incomplete JSON (brace balance: ${braceCount})`);
    return null; // Incomplete JSON
  }

  const jsonContent = trimmed.substring(firstBrace, jsonEnd + 1);

  // Check if there's another JSON object after this one
  const afterJson = trimmed.substring(jsonEnd + 1).trim();
  if (afterJson.includes('{')) {
    logFailure('Multiple JSON objects found');
    return null; // Multiple JSON objects
  }

  return { json: jsonContent };
}

/**
 * Build debug summary for failed JSON extraction
 * Only includes safe metadata, no raw output slices
 */
function buildDebugSummary(
  output: string,
  modelName?: string,
  durationMs: number = 0,
  parseError?: { code: string; message: string },
): PlannerOrchestratorResult['debugSummary'] {
  // Only fill in development or when PLANNER_DEBUG=true
  if (process.env.NODE_ENV !== 'development' && process.env.PLANNER_DEBUG !== 'true') {
    return undefined;
  }

  const trimmed = output.trim();
  const firstChar = trimmed[0] || '';
  const lastChar = trimmed[trimmed.length - 1] || '';

  const getCharType = (char: string): 'brace' | 'bracket' | 'backtick' | 'letter' | 'whitespace' | 'other' | 'empty' => {
    if (!char) return 'empty';
    if (char === '{' || char === '}') return 'brace';
    if (char === '[' || char === ']') return 'bracket';
    if (char === '`') return 'backtick';
    if (/\s/.test(char)) return 'whitespace';
    if (/[a-zA-Z]/.test(char)) return 'letter';
    return 'other';
  };

  // Count JSON objects (simple heuristic: count top-level { })
  let braceCount = 0;
  let inString = false;
  let escape = false;
  let objectCount = 0;

  for (const char of trimmed) {
    if (escape) {
      escape = false;
      continue;
    }
    if (char === '\\') {
      escape = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === '{') {
        braceCount++;
        if (braceCount === 1) objectCount++;
      } else if (char === '}') {
        braceCount--;
      }
    }
  }

  return {
    output_length: output.length,
    starts_with_char_type: getCharType(firstChar),
    ends_with_char_type: getCharType(lastChar),
    contains_json_fence: output.includes('```'),
    contains_left_brace: output.includes('{'),
    contains_right_brace: output.includes('}'),
    brace_balance: braceCount,
    json_object_count: objectCount,
    parse_error_code: parseError?.code,
    parse_error_message_short: parseError?.message.slice(0, 100),
    modelName,
    durationMs,
  };
}

/**
 * Built-in fallback planner prompt (used when prompt store is unavailable)
 */
const PLANNER_PROMPT_BUILTIN = [
  '你是一个任务规划器。分析用户消息并生成 PlannerPlanContract 结构化执行计划。',
  '',
  '【严格规则 - 必须遵守】',
  '1. 只输出一个 JSON 对象，不要输出任何其他内容',
  '2. 禁止输出 markdown、代码块标记（```）、解释文字、前言或后缀',
  '3. 禁止输出数组（[...]），只输出对象（{...}）',
  '4. 禁止输出多个 JSON 对象',
  '5. JSON 必须以 { 开头，以 } 结尾',
  '6. 所有必填字段都必须存在',
  '',
  '【必填字段清单】',
  '- plan_id: string (格式: "plan-{timestamp}")',
  '- version: "planner-plan/v1" (固定值)',
  '- user_goal: string (用户目标的简洁描述)',
  '- task_type: "general_chat" | "data_query" | "knowledge_qa" | "debugging" | "automation" | "configuration" | "diagnosis" | "explanation" | "multi_step"',
  '- service_intent: "general_chat" | "help_qa" | "data_query" | "issue_diagnosis" | "system_operation" | "package_fetch" | "integration_workflow" | "report_summary" | "requirement_drafting" | "clarification"',
  '- operation_type: "read" | "write" | "execute" | "navigate" | "none"',
  '- plan_steps: 步骤数组（至少 1 个步骤）',
  '- sub_intents: 子意图数组',
  '- evidence_mode: "model_only" | "no_external_evidence_required" | "internal_data_required" | "knowledge_required" | "web_required" | "file_required" | "task_required" | "mixed_evidence_required"',
  '- required_evidence: 所需证据数组',
  '- evidence_requirements: 证据要求数组',
  '- source_policy: "model_only" | "grounded_only" | "mixed_allowed"',
  '- candidate_capabilities: 候选能力数组',
  '- tool_selection_priors: 工具选择偏好数组',
  '- required_inputs: 所需输入数组',
  '- missing_inputs: 缺失输入数组',
  '- risk_level: "none" | "low" | "medium" | "high" | "critical"',
  '- planner_warnings: 规划警告数组',
  '- answer_policy: { must_ground_facts: boolean, allow_model_fallback: boolean, clarification_policy: "ask_first" | "answer_with_caveat" | "auto_resolve" }',
  '- confidence: number (0-1)',
  '- assumptions: 假设数组',
  '- clarification_needed: boolean',
  '- disclosure_policy: "minimal" | "standard" | "full"',
  '- created_at: ISO timestamp',
  '',
  '【evidence_mode 与 evidence_requirements 对齐规则】',
  '- evidence_mode = "model_only" 或 "no_external_evidence_required": evidence_requirements 中不得 required tool_result/web_source/task_state',
  '- evidence_mode = "internal_data_required": evidence_requirements 中必须 required tool_result',
  '- evidence_mode = "web_required": evidence_requirements 中必须 required web_source',
  '- evidence_mode = "knowledge_required": evidence_requirements 中必须 required knowledge_source',
  '- evidence_mode = "file_required": evidence_requirements 中必须 required file_source',
  '- evidence_mode = "task_required": evidence_requirements 中必须 required task_state',
  '- evidence_mode = "mixed_evidence_required": evidence_requirements 中至少两类 required evidence',
  '',
  '【禁止字段】',
  '- final_tool_arguments',
  '- mcp_arguments',
  '- tool_arguments',
  '- execute_now',
  '- bypass_preflight',
  '- bypass_permission',
  '- skip_contract_safety',
  '- declare_tool_success',
  '- fabricated_tool_result',
  '- fabricated_data',
  '- final_execution_args',
  '',
  '【tool_selection_priors 规则】',
  '- 如果为空，可以是 []',
  '- 如果有元素，每一项必须包含 _semantics: "hint_only_not_executable"',
  '',
  '【完整示例】',
  '{',
  '  "plan_id": "plan-1718234567890",',
  '  "version": "planner-plan/v1",',
  '  "user_goal": "查询昨天的广告消耗数据",',
  '  "task_type": "data_query",',
  '  "service_intent": "data_query",',
  '  "operation_type": "read",',
  '  "plan_steps": [',
  '    {',
  '      "step_id": "step-1",',
  '      "purpose": "规划内部数据查询所需证据",',
  '      "task_type": "data_query",',
  '      "service_intent": "data_query",',
  '      "evidence_mode": "internal_data_required",',
  '      "required_evidence": ["tool_result"],',
  '      "candidate_capabilities": ["report_query"],',
  '      "depends_on": [],',
  '      "risk_level": "low",',
  '      "expected_output": "形成内部数据查询所需的证据需求"',
  '    }',
  '  ],',
  '  "sub_intents": [],',
  '  "evidence_mode": "internal_data_required",',
  '  "required_evidence": ["tool_result"],',
  '  "evidence_requirements": [',
  '    {',
  '      "evidence_type": "tool_result",',
  '      "required": true,',
  '      "purpose": "昨天的广告消耗数据"',
  '    }',
  '  ],',
  '  "source_policy": "grounded_only",',
  '  "candidate_capabilities": [',
  '    {',
  '      "capability_id": "ad_report_query",',
  '      "display_name": "广告报表查询",',
  '      "match_reason": "用户需要查询广告消耗数据",',
  '      "confidence": 0.9',
  '    }',
  '  ],',
  '  "tool_selection_priors": [',
  '    {',
  '      "tool_name": "get_ad_report",',
  '      "match_reason": "用户需要查询广告消耗数据",',
  '      "confidence": 0.95,',
  '      "_semantics": "hint_only_not_executable"',
  '    }',
  '  ],',
  '  "required_inputs": [',
  '    {',
  '      "name": "date_range",',
  '      "type": "string",',
  '      "required": true,',
  '      "source": "user_input"',
  '    }',
  '  ],',
  '  "missing_inputs": [],',
  '  "risk_level": "low",',
  '  "planner_warnings": [],',
  '  "answer_policy": {',
  '    "must_ground_facts": true,',
  '    "allow_model_fallback": false,',
  '    "clarification_policy": "ask_first"',
  '  },',
  '  "confidence": 0.9,',
  '  "assumptions": [',
  '    {',
  '      "statement": "用户指的是系统内的广告报表数据",',
  '      "confidence": 0.8,',
  '      "source": "user_input"',
  '    }',
  '  ],',
  '  "clarification_needed": false,',
  '  "disclosure_policy": "standard",',
  '  "created_at": "2026-06-16T16:37:26.367Z"',
  '}',
  '',
  '【输出要求】',
  '现在分析用户消息，输出符合上述 schema 的 JSON 对象。',
  '记住：只输出 JSON，不要任何其他内容。',
].join('\n');

/**
 * Build Planner prompt without business-specific keywords
 * P0 治理：从 prompt store 读取 managed prompt，失败时 fallback 到原始内置文案
 */
async function buildPlannerPrompt(input: PlannerOrchestratorInput): Promise<{ prompt: string; source: 'managed' | 'builtin_local_degrade' }> {
  const { message, conversationHistory, now, locale } = input;

  const managedPrompt = await getPromptContent('planner_shadow.plan', '').catch(() => '');
  const basePrompt = managedPrompt || PLANNER_PROMPT_BUILTIN;

  const parts: string[] = [basePrompt];

  if (now) {
    parts.push(`Current time: ${now}`);
  }

  if (locale) {
    parts.push(`Locale: ${locale}`);
  }

  if (conversationHistory && conversationHistory.length > 0) {
    parts.push('');
    parts.push('Recent conversation:');
    const recent = conversationHistory.slice(-3);
    for (const msg of recent) {
      parts.push(`${msg.role}: ${msg.content}`);
    }
  }

  parts.push('');
  parts.push('User message:');
  parts.push(message);
  parts.push('');
  parts.push('Output ONLY the JSON object, no explanations.');

  return {
    prompt: parts.join('\n'),
    source: managedPrompt ? 'managed' : 'builtin_local_degrade',
  };
}

function buildPlannerGovernanceMeta(params: {
  plannerMode: 'shadow' | 'main';
  promptSource?: 'managed' | 'builtin_local_degrade';
}): Pick<PlannerOrchestratorResult, 'plannerMode' | 'promptSource' | 'fallbackPolicy' | 'comparisonTrace'> {
  return {
    plannerMode: params.plannerMode,
    promptSource: params.promptSource,
    fallbackPolicy: 'fail_open_contract_guarded',
    comparisonTrace: {
      route_candidate_only: true,
      can_execute_tools: false,
      can_change_user_visible_result: false,
    },
  };
}
/**
 * Run Planner Orchestrator in shadow mode
 *
 * Shadow mode constraints:
 * - Does NOT modify /api/chat main chain
 * - Does NOT select real tools
 * - Does NOT execute MCP/API/KB/Web/File/Task
 * - Does NOT change user-visible results
 * - Fail-open on any errors
 */
export async function runPlannerOrchestratorShadow(
  input: PlannerOrchestratorInput,
): Promise<PlannerOrchestratorResult> {
  const startTime = Date.now();
  const errors: Array<{ code: string; message: string }> = [];
  const warnings: Array<{ code: string; message: string }> = [];
  const plannerMode = process.env.PLANNER_FIRST_MODE === 'main' ? 'main' : 'shadow';

  try {
    // Check if shadow mode is enabled
    if (process.env.PLANNER_FIRST_SHADOW_ENABLED !== 'true') {
      return {
        status: 'disabled',
        errors,
        warnings,
        durationMs: Date.now() - startTime,
      ...buildPlannerGovernanceMeta({ plannerMode }),
      };
    }

    // Check if LLM client is provided
    if (!input.llm) {
      return {
        status: 'llm_unavailable',
        errors: [{ code: 'llm_client_missing', message: 'LLM client not provided' }],
        warnings,
        durationMs: Date.now() - startTime,
      ...buildPlannerGovernanceMeta({ plannerMode }),
      };
    }

    const timeoutMs = input.timeoutMs ?? 3000;
    const promptBuild = await buildPlannerPrompt(input);
    const prompt = promptBuild.prompt;
    if (promptBuild.source === 'builtin_local_degrade') {
      warnings.push({ code: 'planner_prompt_builtin_degrade', message: 'Managed planner prompt unavailable; using local builtin prompt as governed degrade fallback.' });
    }

    // Call LLM with timeout
    let llmResult: { text: string; modelName?: string; latencyMs?: number };
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('LLM_TIMEOUT')), timeoutMs);
      });

      llmResult = await Promise.race([
        input.llm.generatePlannerJson({
          prompt,
          timeoutMs,
          modelName: input.modelName,
        }),
        timeoutPromise,
      ]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (errorMessage === 'LLM_TIMEOUT') {
        return {
          status: 'timeout',
          errors: [{ code: 'llm_timeout', message: `LLM call timed out after ${timeoutMs}ms` }],
          warnings,
          durationMs: Date.now() - startTime,
          ...buildPlannerGovernanceMeta({ plannerMode }),
        };
      }

      return {
        status: 'llm_unavailable',
        errors: [{ code: 'llm_error', message: errorMessage }],
        warnings,
        durationMs: Date.now() - startTime,
        modelName: input.modelName,
        ...buildPlannerGovernanceMeta({ plannerMode }),
      };
    }

    // Check if LLM output is empty
    if (!llmResult.text || llmResult.text.trim().length === 0) {
      if (process.env.NODE_ENV === 'development' || process.env.PLANNER_DEBUG === 'true') {
        console.warn(`[PlannerOrchestrator] LLM returned empty output`);
        console.warn(`[PlannerOrchestrator] Model: ${llmResult.modelName || 'unknown'}`);
        console.warn(`[PlannerOrchestrator] Latency: ${llmResult.latencyMs || 0}ms`);
      }
      return {
        status: 'json_parse_failed',
        errors: [{ code: 'empty_llm_output', message: 'LLM returned empty output. This may indicate API quota exceeded, timeout, or model service error.' }],
        warnings,
        durationMs: Date.now() - startTime,
        modelName: llmResult.modelName,
        ...buildPlannerGovernanceMeta({ plannerMode, promptSource: promptBuild.source }),
        debugSummary: buildDebugSummary('', llmResult.modelName, Date.now() - startTime, {
          code: 'empty_llm_output',
          message: 'LLM returned empty output',
        }),
      };
    }

    // Extract JSON from LLM output
    const extractionResult = extractJson(llmResult.text);
    if (!extractionResult) {
      return {
        status: 'json_parse_failed',
        errors: [{ code: 'json_extraction_failed', message: 'Could not extract JSON from LLM output. The model may have output explanation text, multiple JSON objects, or malformed JSON.' }],
        warnings,
        durationMs: Date.now() - startTime,
        modelName: llmResult.modelName,
        ...buildPlannerGovernanceMeta({ plannerMode, promptSource: promptBuild.source }),
        debugSummary: buildDebugSummary(llmResult.text, llmResult.modelName, Date.now() - startTime, {
          code: 'json_extraction_failed',
          message: 'Could not extract JSON from LLM output',
        }),
      };
    }

    if (extractionResult.warning) {
      warnings.push({ code: 'json_extraction_warning', message: extractionResult.warning });
    }

    // Parse JSON
    let plan: PlannerPlanContract;
    try {
      plan = JSON.parse(extractionResult.json) as PlannerPlanContract;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        status: 'json_parse_failed',
        errors: [{ code: 'json_parse_error', message: errorMessage }],
        warnings,
        durationMs: Date.now() - startTime,
        modelName: llmResult.modelName,
        ...buildPlannerGovernanceMeta({ plannerMode, promptSource: promptBuild.source }),
        debugSummary: buildDebugSummary(llmResult.text, llmResult.modelName, Date.now() - startTime, {
          code: 'json_parse_error',
          message: errorMessage,
        }),
      };
    }

    // Validate contract
    const validation = validatePlannerPlanContract(plan);

    if (!validation.valid) {
      return {
        status: 'contract_validation_failed',
        validation,
        errors: validation.errors.map(e => ({ code: e.code, message: `${e.path}: ${e.message}` })),
        warnings: validation.warnings.map(w => ({ code: w.code, message: `${w.path}: ${w.message}` })),
        durationMs: Date.now() - startTime,
        modelName: llmResult.modelName,
      ...buildPlannerGovernanceMeta({ plannerMode, promptSource: promptBuild.source }),
      };
    }

    // Success
    return {
      status: 'succeeded',
      plan,
      validation,
      errors,
      warnings: [...warnings, ...validation.warnings.map(w => ({ code: w.code, message: `${w.path}: ${w.message}` }))],
      durationMs: Date.now() - startTime,
      modelName: llmResult.modelName,
      ...buildPlannerGovernanceMeta({ plannerMode, promptSource: promptBuild.source }),
    };

  } catch (error) {
    // Fail-open: catch any unexpected errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      status: 'json_parse_failed',
      errors: [{ code: 'unexpected_error', message: errorMessage }],
      warnings,
      durationMs: Date.now() - startTime,
      ...buildPlannerGovernanceMeta({ plannerMode }),
    };
  }
}

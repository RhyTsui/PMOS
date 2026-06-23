import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { runPlannerOrchestratorShadow } from '../src/lib/planner-orchestrator';
import type { PlannerLLMClient, PlannerOrchestratorInput } from '../src/lib/planner-orchestrator';
import type { PlannerPlanContract } from '../src/contracts/planner/planner-plan-contract';

function createValidPlan(): PlannerPlanContract {
  return {
    plan_id: 'test-plan-001',
    version: 'planner-plan/v1',
    user_goal: 'test goal',
    task_type: 'general_chat',
    service_intent: 'general_chat',
    operation_type: 'none',
    plan_steps: [{
      step_id: 'step-1',
      purpose: 'test step',
      task_type: 'general_chat',
      service_intent: 'general_chat',
      evidence_mode: 'model_only',
      required_evidence: [],
      candidate_capabilities: [],
      depends_on: [],
      risk_level: 'none',
      expected_output: 'test output',
    }],
    sub_intents: [],
    evidence_mode: 'model_only',
    required_evidence: [],
    evidence_requirements: [],
    source_policy: 'model_only',
    candidate_capabilities: [],
    tool_selection_priors: [],
    required_inputs: [],
    missing_inputs: [],
    risk_level: 'none',
    planner_warnings: [],
    answer_policy: {
      must_ground_facts: false,
      allow_model_fallback: true,
      clarification_policy: 'auto_resolve',
    },
    confidence: 0.8,
    assumptions: [],
    clarification_needed: false,
    disclosure_policy: 'minimal',
    created_at: new Date().toISOString(),
  };
}

function createMockLLM(response: string, options?: { delay?: number; shouldThrow?: boolean }): PlannerLLMClient {
  return {
    generatePlannerJson: vi.fn(async () => {
      if (options?.delay) {
        await new Promise(resolve => setTimeout(resolve, options.delay));
      }
      if (options?.shouldThrow) {
        throw new Error('LLM service error');
      }
      return { text: response, modelName: 'mock-model', latencyMs: 100 };
    }),
  };
}

describe('runPlannerOrchestratorShadow', () => {
  const originalEnv = process.env.PLANNER_FIRST_SHADOW_ENABLED;
  const originalPlannerMode = process.env.PLANNER_FIRST_MODE;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PLANNER_FIRST_MODE = originalPlannerMode;
  });

  afterEach(() => {
    process.env.PLANNER_FIRST_SHADOW_ENABLED = originalEnv;
    process.env.PLANNER_FIRST_MODE = originalPlannerMode;
  });

  // Test 1: disabled when env is not true
  it('returns disabled when PLANNER_FIRST_SHADOW_ENABLED is not true', async () => {
    process.env.PLANNER_FIRST_SHADOW_ENABLED = 'false';
    const llm = createMockLLM('{}');

    const result = await runPlannerOrchestratorShadow({
      message: 'test',
      llm,
    });

    expect(result.status).toBe('disabled');
    expect(llm.generatePlannerJson).not.toHaveBeenCalled();
  });

  // Test 2: llm_unavailable when llm is not provided
  it('returns llm_unavailable when llm is not provided', async () => {
    process.env.PLANNER_FIRST_SHADOW_ENABLED = 'true';

    const result = await runPlannerOrchestratorShadow({
      message: 'test',
    });

    expect(result.status).toBe('llm_unavailable');
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].code).toBe('planner_llm_missing');
  });

  // Test 3: succeeded with valid JSON
  it('returns succeeded with valid JSON', async () => {
    process.env.PLANNER_FIRST_SHADOW_ENABLED = 'true';
    const validPlan = createValidPlan();
    const llm = createMockLLM(JSON.stringify(validPlan));

    const result = await runPlannerOrchestratorShadow({
      message: 'test',
      llm,
    });

    expect(result.status).toBe('succeeded');
    expect(result.plan).toBeDefined();
    expect(result.validation?.valid).toBe(true);
    expect(result.plan?.plan_id).toBe('test-plan-001');
  });

  // Test 4: succeeded with fenced JSON
  it('returns succeeded with fenced JSON', async () => {
    process.env.PLANNER_FIRST_SHADOW_ENABLED = 'true';
    const validPlan = createValidPlan();
    const fencedJson = '```json\n' + JSON.stringify(validPlan) + '\n```';
    const llm = createMockLLM(fencedJson);

    const result = await runPlannerOrchestratorShadow({
      message: 'test',
      llm,
    });

    expect(result.status).toBe('succeeded');
    expect(result.plan).toBeDefined();
    expect(result.validation?.valid).toBe(true);
  });

  // Test 5: json_parse_failed with non-JSON
  it('returns json_parse_failed with non-JSON', async () => {
    process.env.PLANNER_FIRST_SHADOW_ENABLED = 'true';
    const llm = createMockLLM('This is not JSON');

    const result = await runPlannerOrchestratorShadow({
      message: 'test',
      llm,
    });

    expect(result.status).toBe('json_parse_failed');
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].code).toBe('planner_json_extraction_failed');
  });

  // Test 6: contract_validation_failed with invalid contract
  it('returns contract_validation_failed with invalid contract', async () => {
    process.env.PLANNER_FIRST_SHADOW_ENABLED = 'true';
    const invalidPlan = {
      plan_id: 'test',
      version: 'wrong-version',
      // missing many required fields
    };
    const llm = createMockLLM(JSON.stringify(invalidPlan));

    const result = await runPlannerOrchestratorShadow({
      message: 'test',
      llm,
    });

    expect(result.status).toBe('contract_validation_failed');
    expect(result.errors.length).toBeGreaterThan(0);
  });

  // Test 7: timeout when LLM takes too long
  it('returns timeout when LLM takes too long', async () => {
    process.env.PLANNER_FIRST_SHADOW_ENABLED = 'true';
    const llm = createMockLLM('{}', { delay: 5000 });

    const result = await runPlannerOrchestratorShadow({
      message: 'test',
      llm,
      timeoutMs: 100,
    });

    expect(result.status).toBe('timeout');
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].code).toBe('planner_timeout');
  });

  // Test 8: fail-open when LLM throws
  it('returns fail-open status when LLM throws', async () => {
    process.env.PLANNER_FIRST_SHADOW_ENABLED = 'true';
    const llm = createMockLLM('', { shouldThrow: true });

    const result = await runPlannerOrchestratorShadow({
      message: 'test',
      llm,
    });

    expect(result.status).toBe('llm_unavailable');
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].code).toBe('planner_llm_exception');
  });
  it('keeps shadow orchestrator observation-only when main mode is requested', async () => {
    process.env.PLANNER_FIRST_SHADOW_ENABLED = 'true';
    process.env.PLANNER_FIRST_MODE = 'main';
    const validPlan = createValidPlan();
    const llm = createMockLLM(JSON.stringify(validPlan));

    const result = await runPlannerOrchestratorShadow({
      message: 'test',
      llm,
    });

    expect(result.status).toBe('succeeded');
    expect(result.plannerMode).toBe('shadow');
    expect(result.comparisonTrace).toMatchObject({
      route_candidate_only: true,
      can_execute_tools: false,
      shadow_mode: true,
      can_change_user_visible_result: false,
    });
    expect(result.warnings.some(w => w.code === 'planner_main_mode_blocked')).toBe(true);
  });

  // Test 9: prompt does not contain business-specific keywords
  it('does not contain business-specific keywords in prompt', async () => {
    process.env.PLANNER_FIRST_SHADOW_ENABLED = 'true';
    const validPlan = createValidPlan();
    const llm = createMockLLM(JSON.stringify(validPlan));

    await runPlannerOrchestratorShadow({
      message: '查询昨天的数据',
      llm,
    });

    const callArgs = (llm.generatePlannerJson as any).mock.calls[0][0];
    const prompt = callArgs.prompt;

    // Should not contain business-specific keywords in system prompt
    expect(prompt).not.toContain('get_zt');
    expect(prompt).not.toContain('巨量引擎');
    expect(prompt).not.toContain('媒体名');
    expect(prompt).not.toContain('广告样例');

    // Should contain generic instructions
    expect(prompt).toContain('PlannerPlanContract');
    expect(prompt).toContain('查询昨天的数据');
  });

  // Test 10: result does not contain selectedTool or final_tool_arguments
  it('does not return selectedTool or final_tool_arguments', async () => {
    process.env.PLANNER_FIRST_SHADOW_ENABLED = 'true';
    const validPlan = createValidPlan();
    const llm = createMockLLM(JSON.stringify(validPlan));

    const result = await runPlannerOrchestratorShadow({
      message: 'test',
      llm,
    });

    expect(result.status).toBe('succeeded');
    expect(result.plan).toBeDefined();

    // Check that result does not contain forbidden fields
    const resultStr = JSON.stringify(result);
    expect(resultStr).not.toContain('selectedTool');
    expect(resultStr).not.toContain('final_tool_arguments');
    expect(resultStr).not.toContain('execute_now');
    expect(resultStr).not.toContain('bypass_preflight');
  });

  // Additional test: conversation history is included in prompt
  it('includes conversation history in prompt', async () => {
    process.env.PLANNER_FIRST_SHADOW_ENABLED = 'true';
    const validPlan = createValidPlan();
    const llm = createMockLLM(JSON.stringify(validPlan));

    await runPlannerOrchestratorShadow({
      message: 'test',
      conversationHistory: [
        { role: 'user', content: 'previous message' },
        { role: 'assistant', content: 'previous response' },
      ],
      llm,
    });

    const callArgs = (llm.generatePlannerJson as any).mock.calls[0][0];
    const prompt = callArgs.prompt;

    expect(prompt).toContain('previous message');
    expect(prompt).toContain('previous response');
  });

  // Additional test: now and locale are included in prompt
  it('includes now and locale in prompt', async () => {
    process.env.PLANNER_FIRST_SHADOW_ENABLED = 'true';
    const validPlan = createValidPlan();
    const llm = createMockLLM(JSON.stringify(validPlan));

    await runPlannerOrchestratorShadow({
      message: 'test',
      now: '2026-06-16T17:00:00Z',
      locale: 'zh-CN',
      llm,
    });

    const callArgs = (llm.generatePlannerJson as any).mock.calls[0][0];
    const prompt = callArgs.prompt;

    expect(prompt).toContain('2026-06-16T17:00:00Z');
    expect(prompt).toContain('zh-CN');
  });

  // Test 11: JSON with surrounding explanation text
  it('returns succeeded with JSON surrounded by explanation text', async () => {
    process.env.PLANNER_FIRST_SHADOW_ENABLED = 'true';
    const validPlan = createValidPlan();
    const llmOutput = `好的，我来分析这个任务并生成执行计划。

${JSON.stringify(validPlan)}

这个计划包含了一个步骤，用于查询数据。`;
    const llm = createMockLLM(llmOutput);

    const result = await runPlannerOrchestratorShadow({
      message: 'test',
      llm,
    });

    expect(result.status).toBe('succeeded');
    expect(result.plan).toBeDefined();
    expect(result.plan?.plan_id).toBe('test-plan-001');
  });

  // Test 12: Multiple JSON objects rejected
  it('returns json_parse_failed with multiple JSON objects', async () => {
    process.env.PLANNER_FIRST_SHADOW_ENABLED = 'true';
    const validPlan = createValidPlan();
    const llmOutput = JSON.stringify(validPlan) + '\n' + JSON.stringify(validPlan);
    const llm = createMockLLM(llmOutput);

    const result = await runPlannerOrchestratorShadow({
      message: 'test',
      llm,
    });

    expect(result.status).toBe('json_parse_failed');
    expect(result.errors[0].code).toBe('planner_json_extraction_failed');
  });

  // Test 13: Multiple fenced blocks rejected
  it('returns json_parse_failed with multiple fenced blocks', async () => {
    process.env.PLANNER_FIRST_SHADOW_ENABLED = 'true';
    const validPlan = createValidPlan();
    const llmOutput = '```json\n' + JSON.stringify(validPlan) + '\n```\n\n```json\n' + JSON.stringify(validPlan) + '\n```';
    const llm = createMockLLM(llmOutput);

    const result = await runPlannerOrchestratorShadow({
      message: 'test',
      llm,
    });

    expect(result.status).toBe('json_parse_failed');
    expect(result.errors[0].code).toBe('planner_json_extraction_failed');
  });

  // Test 14: Array JSON rejected
  it('returns json_parse_failed with array JSON', async () => {
    process.env.PLANNER_FIRST_SHADOW_ENABLED = 'true';
    const llm = createMockLLM('[{"plan_id": "test"}]');

    const result = await runPlannerOrchestratorShadow({
      message: 'test',
      llm,
    });

    expect(result.status).toBe('json_parse_failed');
    expect(result.errors[0].code).toBe('planner_json_extraction_failed');
  });

  // Test 15: Malformed JSON returns json_parse_failed
  it('returns json_parse_failed with malformed JSON', async () => {
    process.env.PLANNER_FIRST_SHADOW_ENABLED = 'true';
    // This JSON has a syntax error (missing comma) that will pass brace matching but fail JSON.parse
    const llm = createMockLLM('{"plan_id": "test" "version": "planner-plan/v1"}');

    const result = await runPlannerOrchestratorShadow({
      message: 'test',
      llm,
    });

    expect(result.status).toBe('json_parse_failed');
    expect(result.errors[0].code).toBe('planner_json_parse_error');
  });

  // Test 16: debugSummary only in development or PLANNER_DEBUG=true
  it('debugSummary is only filled in development or when PLANNER_DEBUG=true', async () => {
    process.env.PLANNER_FIRST_SHADOW_ENABLED = 'true';

    // Test 1: production without PLANNER_DEBUG
    vi.stubEnv('NODE_ENV', 'production');
    delete process.env.PLANNER_DEBUG;
    const llm1 = createMockLLM('This is not JSON');
    const result1 = await runPlannerOrchestratorShadow({ message: 'test', llm: llm1 });
    expect(result1.debugSummary).toBeUndefined();

    // Test 2: development
    vi.stubEnv('NODE_ENV', 'development');
    const llm2 = createMockLLM('This is not JSON');
    const result2 = await runPlannerOrchestratorShadow({ message: 'test', llm: llm2 });
    expect(result2.debugSummary).toBeDefined();
    expect(result2.debugSummary?.output_length).toBeGreaterThan(0);

    // Test 3: PLANNER_DEBUG=true
    vi.stubEnv('NODE_ENV', 'production');
    process.env.PLANNER_DEBUG = 'true';
    const llm3 = createMockLLM('This is not JSON');
    const result3 = await runPlannerOrchestratorShadow({ message: 'test', llm: llm3 });
    expect(result3.debugSummary).toBeDefined();

    // Restore
    vi.unstubAllEnvs();
    delete process.env.PLANNER_DEBUG;
  });

  // Test 17: debugSummary does not contain raw output slices
  it('debugSummary does not contain raw output slices', async () => {
    process.env.PLANNER_FIRST_SHADOW_ENABLED = 'true';
    vi.stubEnv('NODE_ENV', 'development');

    // Use invalid JSON to trigger error path and generate debugSummary
    const llmOutput = 'Some explanation\nThis is not valid JSON\nMore text';
    const llm = createMockLLM(llmOutput);

    const result = await runPlannerOrchestratorShadow({
      message: 'test',
      llm,
    });

    expect(result.status).toBe('json_parse_failed');
    expect(result.debugSummary).toBeDefined();
    // Check that debugSummary does not contain forbidden fields
    const debugStr = JSON.stringify(result.debugSummary);
    expect(debugStr).not.toContain('trimmed_starts_with');
    expect(debugStr).not.toContain('trimmed_ends_with');
    expect(debugStr).not.toContain('raw_output');
    expect(debugStr).not.toContain('raw_prompt');

    // Check that it contains allowed fields
    expect(result.debugSummary?.output_length).toBeDefined();
    expect(result.debugSummary?.starts_with_char_type).toBeDefined();
    expect(result.debugSummary?.ends_with_char_type).toBeDefined();
    expect(result.debugSummary?.contains_json_fence).toBeDefined();

    vi.unstubAllEnvs();
  });

  // Test 18: Result does not leak raw LLM output
  it('result does not leak raw LLM output', async () => {
    process.env.PLANNER_FIRST_SHADOW_ENABLED = 'true';
    const secretText = 'SECRET_LLM_OUTPUT_12345';
    const llm = createMockLLM(secretText);

    const result = await runPlannerOrchestratorShadow({
      message: 'test',
      llm,
    });

    const resultStr = JSON.stringify(result);
    expect(resultStr).not.toContain(secretText);
  });

  // Test 19: JSON with braces in strings
  it('handles JSON with braces in string values', async () => {
    process.env.PLANNER_FIRST_SHADOW_ENABLED = 'true';
    const validPlan = createValidPlan();
    validPlan.user_goal = 'Query data with {braces} in the goal';
    const llm = createMockLLM(JSON.stringify(validPlan));

    const result = await runPlannerOrchestratorShadow({
      message: 'test',
      llm,
    });

    expect(result.status).toBe('succeeded');
    expect(result.plan?.user_goal).toBe('Query data with {braces} in the goal');
  });

  // Test 20: JSON with escaped characters
  it('handles JSON with escaped characters', async () => {
    process.env.PLANNER_FIRST_SHADOW_ENABLED = 'true';
    const validPlan = createValidPlan();
    validPlan.user_goal = 'Query with "quotes" and \\backslash';
    const llm = createMockLLM(JSON.stringify(validPlan));

    const result = await runPlannerOrchestratorShadow({
      message: 'test',
      llm,
    });

    expect(result.status).toBe('succeeded');
    expect(result.plan?.user_goal).toBe('Query with "quotes" and \\backslash');
  });

  // Test 21: Prompt example plan_steps conforms to PlanStep contract
  it('prompt example plan_steps conforms to PlanStep contract', async () => {
    process.env.PLANNER_FIRST_SHADOW_ENABLED = 'true';

    // Create a plan based on the prompt example structure
    const planFromPromptExample: PlannerPlanContract = {
      plan_id: 'plan-1718234567890',
      version: 'planner-plan/v1',
      user_goal: '查询昨天的广告消耗数据',
      task_type: 'data_query',
      service_intent: 'data_query',
      operation_type: 'read',
      plan_steps: [
        {
          step_id: 'step-1',
          purpose: '规划内部数据查询所需证据',
          task_type: 'data_query',
          service_intent: 'data_query',
          evidence_mode: 'internal_data_required',
          required_evidence: ['tool_result'],
          candidate_capabilities: ['report_query'],
          depends_on: [],
          risk_level: 'low',
          expected_output: '形成内部数据查询所需的证据需求',
        },
      ],
      sub_intents: [],
      evidence_mode: 'internal_data_required',
      required_evidence: ['tool_result'],
      evidence_requirements: [
        {
          evidence_type: 'tool_result',
          required: true,
          purpose: '昨天的广告消耗数据',
        },
      ],
      source_policy: 'grounded_only',
      candidate_capabilities: [
        {
          capability_id: 'ad_report_query',
          display_name: '广告报表查询',
          match_reason: '用户需要查询广告消耗数据',
          confidence: 0.9,
        },
      ],
      tool_selection_priors: [
        {
          tool_name: 'get_ad_report',
          match_reason: '用户需要查询广告消耗数据',
          confidence: 0.95,
          _semantics: 'hint_only_not_executable',
        },
      ],
      required_inputs: [
        {
          name: 'date_range',
          type: 'string',
          required: true,
          source: 'user_input',
        },
      ],
      missing_inputs: [],
      risk_level: 'low',
      planner_warnings: [],
      answer_policy: {
        must_ground_facts: true,
        allow_model_fallback: false,
        clarification_policy: 'ask_first',
      },
      confidence: 0.9,
      assumptions: [
        {
          statement: '用户指的是系统内的广告报表数据',
          confidence: 0.8,
          source: 'user_input',
        },
      ],
      clarification_needed: false,
      disclosure_policy: 'standard',
      created_at: '2026-06-16T16:37:26.367Z',
    };

    const llm = createMockLLM(JSON.stringify(planFromPromptExample));

    const result = await runPlannerOrchestratorShadow({
      message: '查询昨天的广告消耗数据',
      llm,
    });

    expect(result.status).toBe('succeeded');
    expect(result.validation?.valid).toBe(true);

    // Verify plan_steps does not contain forbidden fields
    const planStepsStr = JSON.stringify(result.plan?.plan_steps);
    expect(planStepsStr).not.toContain('tool_name');
    expect(planStepsStr).not.toContain('input_mapping');
    expect(planStepsStr).not.toContain('output_mapping');

    // Verify plan_steps contains required fields
    const step = result.plan?.plan_steps[0];
    expect(step).toBeDefined();
    expect(step?.task_type).toBe('data_query');
    expect(step?.service_intent).toBe('data_query');
    expect(step?.evidence_mode).toBe('internal_data_required');
    expect(step?.required_evidence).toBeDefined();
    expect(step?.candidate_capabilities).toBeDefined();
    expect(step?.depends_on).toBeDefined();
    expect(step?.risk_level).toBe('low');
    expect(step?.expected_output).toBeDefined();
  });
});

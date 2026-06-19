import { describe, expect, it } from 'vitest';
import { validatePlannerPlanContract } from '../src/lib/planner-contract-validator';
import type { PlannerPlanContract } from '../src/contracts/planner/planner-plan-contract';

function createValidPlan(overrides: Partial<PlannerPlanContract> = {}): PlannerPlanContract {
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
    ...overrides,
  };
}

describe('validatePlannerPlanContract', () => {
  it('accepts a valid plan', () => {
    const plan = createValidPlan();
    const result = validatePlannerPlanContract(plan);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects null input', () => {
    const result = validatePlannerPlanContract(null);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'invalid_input')).toBe(true);
  });

  it('rejects string input', () => {
    const result = validatePlannerPlanContract('not an object');
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'invalid_input')).toBe(true);
  });

  it('rejects array input', () => {
    const result = validatePlannerPlanContract([]);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'invalid_input')).toBe(true);
  });

  it('rejects missing plan_id', () => {
    const plan = createValidPlan();
    delete (plan as any).plan_id;
    const result = validatePlannerPlanContract(plan);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'missing_required' && e.path === '$.plan_id')).toBe(true);
  });

  it('rejects unknown top-level field', () => {
    const plan = createValidPlan({ foo: 'bar' } as any);
    const result = validatePlannerPlanContract(plan);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'unknown_field' && e.path === '$.foo')).toBe(true);
  });

  it('rejects invalid version', () => {
    const plan = { ...createValidPlan(), version: 'wrong-version' } as unknown;
    const result = validatePlannerPlanContract(plan);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'invalid_version')).toBe(true);
  });

  it('rejects confidence -0.1', () => {
    const plan = createValidPlan({ confidence: -0.1 });
    const result = validatePlannerPlanContract(plan);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'invalid_confidence')).toBe(true);
  });

  it('rejects confidence 1.1', () => {
    const plan = createValidPlan({ confidence: 1.1 });
    const result = validatePlannerPlanContract(plan);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'invalid_confidence')).toBe(true);
  });

  it('rejects confidence Infinity', () => {
    const plan = createValidPlan({ confidence: Infinity });
    const result = validatePlannerPlanContract(plan);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'invalid_confidence')).toBe(true);
  });

  it('rejects invalid task_type', () => {
    const plan = createValidPlan({ task_type: 'ad_report_xxx' as any });
    const result = validatePlannerPlanContract(plan);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'invalid_enum' && e.path === '$.task_type')).toBe(true);
  });

  it('rejects tool_selection_prior with wrong _semantics', () => {
    const plan = createValidPlan({
      tool_selection_priors: [{
        tool_name: 'test_tool',
        match_reason: 'test',
        confidence: 0.5,
        _semantics: 'wrong_value' as any,
      }],
    });
    const result = validatePlannerPlanContract(plan);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'invalid_tool_prior_semantics')).toBe(true);
  });

  it('rejects tool_selection_prior with selectedTool', () => {
    const plan = createValidPlan({
      tool_selection_priors: [{
        tool_name: 'test_tool',
        match_reason: 'test',
        confidence: 0.5,
        _semantics: 'hint_only_not_executable',
        selectedTool: 'test',
      } as any],
    });
    const result = validatePlannerPlanContract(plan);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'tool_prior_not_executable')).toBe(true);
  });

  it('rejects tool_selection_prior with executableTool', () => {
    const plan = createValidPlan({
      tool_selection_priors: [{
        tool_name: 'test_tool',
        match_reason: 'test',
        confidence: 0.5,
        _semantics: 'hint_only_not_executable',
        executableTool: 'test',
      } as any],
    });
    const result = validatePlannerPlanContract(plan);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'tool_prior_not_executable')).toBe(true);
  });

  it('rejects execute_now', () => {
    const plan = createValidPlan({ execute_now: true } as any);
    const result = validatePlannerPlanContract(plan);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'forbidden_output_path' || e.code === 'planner_fabrication')).toBe(true);
  });

  it('rejects bypass_preflight', () => {
    const plan = createValidPlan({ bypass_preflight: true } as any);
    const result = validatePlannerPlanContract(plan);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'forbidden_output_path')).toBe(true);
  });

  it('rejects fabricated_tool_result', () => {
    const plan = createValidPlan({ fabricated_tool_result: {} } as any);
    const result = validatePlannerPlanContract(plan);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'forbidden_output_path' || e.code === 'planner_fabrication')).toBe(true);
  });

  it('rejects model_only with required tool_result', () => {
    const plan = createValidPlan({
      evidence_mode: 'model_only',
      evidence_requirements: [{
        evidence_type: 'tool_result',
        required: true,
        purpose: 'test',
      }],
    });
    const result = validatePlannerPlanContract(plan);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'evidence_mode_conflict')).toBe(true);
  });

  it('rejects no_external_evidence_required with required web_source', () => {
    const plan = createValidPlan({
      evidence_mode: 'no_external_evidence_required',
      evidence_requirements: [{
        evidence_type: 'web_source',
        required: true,
        purpose: 'test',
      }],
    });
    const result = validatePlannerPlanContract(plan);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'evidence_mode_conflict')).toBe(true);
  });

  it('rejects no_external_evidence_required with required task_state', () => {
    const plan = createValidPlan({
      evidence_mode: 'no_external_evidence_required',
      evidence_requirements: [{
        evidence_type: 'task_state',
        required: true,
        purpose: 'test',
      }],
    });
    const result = validatePlannerPlanContract(plan);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'evidence_mode_conflict')).toBe(true);
  });

  it('rejects internal_data_required without tool_result', () => {
    const plan = createValidPlan({
      evidence_mode: 'internal_data_required',
      evidence_requirements: [],
    });
    const result = validatePlannerPlanContract(plan);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'evidence_mode_missing_type')).toBe(true);
  });

  it('rejects web_required without web_source', () => {
    const plan = createValidPlan({
      evidence_mode: 'web_required',
      evidence_requirements: [],
    });
    const result = validatePlannerPlanContract(plan);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'evidence_mode_missing_type')).toBe(true);
  });

  it('rejects knowledge_required without knowledge_source', () => {
    const plan = createValidPlan({
      evidence_mode: 'knowledge_required',
      evidence_requirements: [],
    });
    const result = validatePlannerPlanContract(plan);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'evidence_mode_missing_type')).toBe(true);
  });

  it('rejects file_required without file_source', () => {
    const plan = createValidPlan({
      evidence_mode: 'file_required',
      evidence_requirements: [],
    });
    const result = validatePlannerPlanContract(plan);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'evidence_mode_missing_type')).toBe(true);
  });

  it('rejects task_required without task_state', () => {
    const plan = createValidPlan({
      evidence_mode: 'task_required',
      evidence_requirements: [],
    });
    const result = validatePlannerPlanContract(plan);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'evidence_mode_missing_type')).toBe(true);
  });

  it('rejects mixed_evidence_required with only 1 type', () => {
    const plan = createValidPlan({
      evidence_mode: 'mixed_evidence_required',
      evidence_requirements: [{
        evidence_type: 'tool_result',
        required: true,
        purpose: 'test',
      }],
    });
    const result = validatePlannerPlanContract(plan);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'mixed_evidence_insufficient')).toBe(true);
  });

  it('rejects required_inputs with value field', () => {
    const plan = createValidPlan({
      required_inputs: [{
        name: 'test',
        type: 'string',
        required: true,
        value: 'test_value',
      } as any],
    });
    const result = validatePlannerPlanContract(plan);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'input_has_value')).toBe(true);
  });

  it('rejects missing_inputs with value field', () => {
    const plan = createValidPlan({
      missing_inputs: [{
        name: 'test',
        type: 'string',
        required: true,
        value: 'test_value',
      } as any],
    });
    const result = validatePlannerPlanContract(plan);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'input_has_value')).toBe(true);
  });

  it('rejects empty plan_steps', () => {
    const plan = createValidPlan({ plan_steps: [] });
    const result = validatePlannerPlanContract(plan);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.code === 'empty_plan_steps')).toBe(true);
  });
});

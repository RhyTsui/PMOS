import { describe, expect, it } from 'vitest';
import { getPromptVariableSchema, validatePromptVariables } from '../src/contracts/model-service/prompt-variable-contract';

describe('prompt variable contract governance', () => {
  it('allows IntentOrch as an audited planner candidate for open answers', () => {
    const schema = getPromptVariableSchema('chat_answer');

    expect(schema?.optional_variables).toContain('intentorch_candidate');
    expect(schema?.optional_variables).toContain('planner_candidates');
    expect(schema?.optional_variables).toContain('arbitration_summary');
    expect(schema?.optional_variables).toContain('assistant_profile');
    expect(schema?.optional_variables).toContain('capability_overview');
    expect(schema?.variable_sources).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'intentorch_candidate', source: 'intent_orch', redaction: 'summary_only' }),
      expect.objectContaining({ name: 'arbitration_summary', source: 'plan_arbitrator', redaction: 'summary_only' }),
      expect.objectContaining({ name: 'assistant_profile', source: 'admin_config', redaction: 'summary_only' }),
      expect.objectContaining({ name: 'capability_overview', source: 'capability_manifest', redaction: 'summary_only' }),
    ]));

    const validation = validatePromptVariables('chat_answer', {
      message: '你好，请用一句话说明你现在可以帮我做什么。',
      context: { intentType: 'general' },
      baseAnswer: '需要基于证据和约束生成回答。',
      assistant_profile: { identity: '小乔智投通用 AI 助手' },
      capability_overview: { dynamic_signals: [{ key: 'knowledge_context', available: true }] },
      intentorch_candidate: {
        candidate_id: 'intentorch-open-answer-1',
        suggested_path: 'knowledge_or_model_only',
        confidence: 'medium',
        risk_flags: ['needs_arbitration'],
      },
      arbitration_summary: {
        selected_path: 'model_only',
        rejected_candidates: ['public_web_without_need'],
      },
    });

    expect(validation).toEqual({ passed: true, missingRequired: [], forbiddenPaths: [] });
  });

  it('blocks forbidden raw tool data even when nested under IntentOrch candidate', () => {
    const validation = validatePromptVariables('chat_answer', {
      message: '帮我看看这个问题。',
      context: { intentType: 'general' },
      baseAnswer: '需要基于证据和约束生成回答。',
      intentorch_candidate: {
        candidate_id: 'intentorch-unsafe-1',
        raw_tool_args: { app_id: 'secret-app-id' },
      },
    });

    expect(validation.passed).toBe(false);
    expect(validation.missingRequired).toEqual([]);
    expect(validation.forbiddenPaths).toContain('intentorch_candidate.raw_tool_args');
  });

  it('blocks raw knowledge, route rules, and tool priority payloads before chat answer composition', () => {
    const validation = validatePromptVariables('chat_answer', {
      message: '按内部资料回答这个问题。',
      context: { intentType: 'general' },
      baseAnswer: '需要基于证据和约束生成回答。',
      planner_candidates: [{
        source: 'knowledge',
        status: 'searched',
        raw_kb_chunks: [{ content: 'unfiltered internal chunk' }],
      }],
      arbitration_summary: {
        route_rules: [{ pattern: 'business-keyword' }],
        tool_priority: ['public_web', 'internal_api'],
      },
      evidence_ledger: {
        raw_knowledge_hits: [{ content: 'raw hit must stay outside composer prompt' }],
      },
    });

    expect(validation.passed).toBe(false);
    expect(validation.missingRequired).toEqual([]);
    expect(validation.forbiddenPaths).toEqual(expect.arrayContaining([
      'planner_candidates.0.raw_kb_chunks',
      'arbitration_summary.route_rules',
      'arbitration_summary.tool_priority',
      'evidence_ledger.raw_knowledge_hits',
    ]));
  });

  it('allows IntentOrch only as summarized planner input for capability discovery', () => {
    const schema = getPromptVariableSchema('capability_discovery');

    expect(schema?.optional_variables).toEqual(expect.arrayContaining([
      'intentorch_candidate',
      'planner_candidates',
      'arbitration_summary',
    ]));
    expect(schema?.variable_sources).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'intentorch_candidate', source: 'intent_orch', redaction: 'summary_only' }),
      expect.objectContaining({ name: 'arbitration_summary', source: 'plan_arbitrator', redaction: 'summary_only' }),
    ]));

    const validation = validatePromptVariables('capability_discovery', {
      message: '查一下昨天消耗',
      tools: [{ tool_name: 'report.query', description: '报表查询' }],
      intentorch_candidate: {
        source: 'intentorch',
        status: 'success',
        tool_selection_count: 1,
        suggested_tools: [{ tool_name: 'report.query', confidence: 0.81 }],
      },
      planner_candidates: [{ source: 'intentorch', status: 'success', suggested_tool_names: ['report.query'] }],
      arbitration_summary: { final_authority: 'contract_safety' },
    });

    expect(validation).toEqual({ passed: true, missingRequired: [], forbiddenPaths: [] });
  });

  it('blocks raw IntentOrch plans in capability discovery prompts', () => {
    const validation = validatePromptVariables('capability_discovery', {
      message: '查一下昨天消耗',
      tools: [{ tool_name: 'report.query', description: '报表查询' }],
      intentOrchPlan: {
        toolSelections: [{ mappedParameters: { app_id: 'secret-app-id' } }],
      },
    });

    expect(validation.passed).toBe(false);
    expect(validation.forbiddenPaths).toContain('intentOrchPlan.toolSelections.0.mappedParameters');
  });
});

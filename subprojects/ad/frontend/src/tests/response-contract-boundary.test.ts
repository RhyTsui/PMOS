import { describe, expect, it } from 'vitest';
import { buildResponseContract } from '../src/lib/response-contract';

describe('response contract main-message boundary', () => {
  it('keeps report result payload summarized and preserves evidence refs', () => {
    const contract = buildResponseContract({
      status: 'success',
      intentType: 'report_query',
      answer: 'Report is ready.',
      reportResult: {
        status: 'success',
        message: 'Returned 2 rows.',
        rows: [{ media_id: 'secret-media-id', cost: 1 }],
        query_plan: { evidence_refs: ['ev-query-plan'], tool_arguments: { media_id: 'secret-media-id' } },
        call_result: { raw_payload: { token: 'secret-token' } },
        evidence_refs: ['ev-result'],
      },
      toolChain: [{
        key: 'business_report',
        tool_name: 'report.query',
        input: { media_id: 'secret-media-id' },
        result: { status: 'success', row_count: 1, raw_payload: { token: 'secret-token' } },
      }],
    });

    const serialized = JSON.stringify(contract.message_parts);
    expect(contract.evidence_refs).toEqual(['ev-query-plan', 'ev-result']);
    expect(serialized).toContain('row_count');
    expect(serialized).not.toContain('query_plan');
    expect(serialized).not.toContain('call_result');
    expect(serialized).not.toContain('tool_arguments');
    expect(serialized).not.toContain('raw_payload');
    expect(serialized).not.toContain('secret-media-id');
    expect(serialized).not.toContain('secret-token');
  });

  it('adds contract safety metadata and blocks mojibake in user-visible answer', () => {
    const contract = buildResponseContract({
      status: 'success',
      intentType: 'general',
      answer: `项目范围${'\u951b'}?测试项目`,
    });

    expect(contract.status).toBe('failed');
    expect(contract.contract_safety?.status).toBe('blocked');
    expect(contract.contract_safety?.issues.some((item) => item.code === 'mojibake_detected')).toBe(true);
    expect(contract.disclaimers?.join('\n')).toContain('疑似乱码');
  });

  it('marks open model answers as model_only when no external evidence is used', () => {
    const contract = buildResponseContract({
      status: 'success',
      intentType: 'general',
      answer: '我可以帮你梳理问题，并在需要时结合工具和来源给出可执行建议。',
      answerOrigin: { source: 'real_llm', composer_name: 'chat_answer' },
    });

    expect(contract.status).toBe('success');
    expect(contract.evidence_mode).toBe('model_only');
    expect(contract.contract_safety?.status).toBe('degraded');
  });

  it('projects tool and public source events into tool_call_trace', () => {
    const contract = buildResponseContract({
      status: 'success',
      intentType: 'general',
      answer: '已基于公开来源回答。',
      processEvents: [{
        id: 'web-1',
        type: 'web.result',
        label: '查询公开来源',
        status: 'success',
        visibility: 'user',
        summary: '返回 1 条来源',
        started_at: '2026-06-12T00:00:00.000Z',
        duration_ms: 120,
        source_refs: [{ id: 'source-1', title: '公开资料', source: 'web', url: 'https://example.com/source', source_type: 'web_search' }],
        output: { status: 'success', row_count: 1 },
      }],
    });

    expect(contract.source_refs).toHaveLength(1);
    expect(contract.tool_call_trace?.[0]).toEqual(expect.objectContaining({ id: 'web-1', kind: 'public_web', status: 'success' }));
    expect(contract.evidence_mode).toBe('source_grounded');
    expect(contract.disclaimers?.join('\n')).toContain('公开网络');
  });

  it('projects arbitration and fallback governance metadata', () => {
    const contract = buildResponseContract({
      status: 'degraded',
      intentType: 'general',
      traceId: 'trace-governance-1',
      answer: '我需要更多信息才能继续处理。',
      metadata: {
        candidate_source: 'legacy_intent_router',
        execution_decision: 'no_executable_capability',
        fallback_reason: 'legacy_no_hit_candidate_only',
        final_route_decision: { status: 'clarify_required', arbitration_rule_id: 'pending-plan-arbitrator' },
      },
    });

    expect(contract.candidate_source).toBe('legacy_intent_router');
    expect(contract.execution_decision).toBe('no_executable_capability');
    expect(contract.fallback_reason).toBe('legacy_no_hit_candidate_only');
    expect(contract.final_route_decision).toEqual(expect.objectContaining({ status: 'clarify_required' }));
    expect(contract.contract_safety_trace_ref).toBe('contract_safety:trace-governance-1');
  });
});

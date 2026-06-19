import { describe, expect, it } from 'vitest';
import { buildResponseContract } from '../src/lib/response-contract';
import type { WorkflowResult } from '../src/types';

describe('response contract main-message boundary', () => {
  it('keeps report result payload summarized and preserves evidence refs', () => {
    const contract = buildResponseContract({
      status: 'success',
      intentType: 'report_query',
      answer: 'Report is ready.',
      reportResult: {
        status: 'success',
        business_outcome: 'succeeded',
        message: 'Returned 2 rows.',
        answer_markdown: 'Report is ready.',
        rows: [{ media_id: 'secret-media-id', cost: 1 }, { media_id: 'secret-media-id', cost: 2 }],
        columns: ['cost'],
        query_plan: {
          evidence_refs: ['ev-query-plan'],
          tool_arguments: { media_id: 'secret-media-id' },
        },
        call_result: {
          raw_payload: { token: 'secret-token' },
          request_payload: { media_id: 'secret-media-id' },
        },
        selection_trace: { internal_enum: 'no_full_coverage' },
        evidence_refs: ['ev-result'],
      },
      toolChain: [{
        key: 'business_report',
        tool_name: 'report.query',
        input: { media_id: 'secret-media-id' },
        result: {
          status: 'success',
          row_count: 2,
          raw_payload: { token: 'secret-token' },
          request_payload: { media_id: 'secret-media-id' },
        },
      }],
    });

    const serialized = JSON.stringify(contract.message_parts);

    expect(contract.evidence_refs).toEqual(['ev-query-plan', 'ev-result']);
    expect(serialized).toContain('row_count');
    expect(serialized).not.toContain('query_plan');
    expect(serialized).not.toContain('call_result');
    expect(serialized).not.toContain('selection_trace');
    expect(serialized).not.toContain('tool_arguments');
    expect(serialized).not.toContain('raw_payload');
    expect(serialized).not.toContain('request_payload');
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

  it('adds low-confidence disclaimer when a successful answer has no evidence', () => {
    const contract = buildResponseContract({
      status: 'success',
      intentType: 'general',
      answer: '这是一个没有证据引用的普通回答。',
    });

    expect(contract.status).toBe('success');
    expect(contract.confidence?.level).toBe('unknown');
    expect(contract.contract_safety?.status).toBe('degraded');
    expect(contract.disclaimers?.join('\n')).toContain('证据不足');
  });

  it('marks open model answers as model_only when no external evidence is used', () => {
    const contract = buildResponseContract({
      status: 'success',
      intentType: 'general',
      answer: '我可以帮你梳理问题、生成方案、处理文档与代码，并在需要时结合工具和来源给出可执行建议。',
      answerOrigin: {
        source: 'real_llm',
        composer_name: 'chat_answer',
        summary: '开放式回答由模型基于上下文和回答约束生成。',
      },
    });

    expect(contract.status).toBe('success');
    expect(contract.evidence_mode).toBe('model_only');
    expect(contract.contract_safety?.status).toBe('degraded');
  });

  it('blocks model-only answers that claim external retrieval happened', () => {
    const contract = buildResponseContract({
      status: 'success',
      intentType: 'general',
      answer: '我已检索知识库并联网验证，可以确认这个答案。',
      answerOrigin: {
        source: 'real_llm',
        composer_name: 'chat_answer',
        summary: '开放式回答由模型基于上下文和回答约束生成。',
      },
    });

    expect(contract.status).toBe('failed');
    expect(contract.evidence_mode).toBe('model_only');
    expect(contract.contract_safety?.status).toBe('blocked');
    expect(contract.contract_safety?.issues.some((item) => item.code === 'model_only_claims_external_evidence')).toBe(true);
  });

  it('keeps model unavailable fallback degraded with low confidence', () => {
    const contract = buildResponseContract({
      status: 'degraded',
      intentType: 'general',
      answer: '我已收到你的问题。当前回答生成暂不可用，请稍后重试或继续补充上下文。',
      answerOrigin: {
        source: 'model_unavailable',
        composer_name: 'fallbackAnswer',
        summary: '通用回答需要模型生成，但当前模型服务不可用。',
      },
    });

    expect(contract.status).toBe('degraded');
    expect(contract.confidence?.level).toBe('low');
    expect(contract.confidence?.basis).toBe('model');
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
        source_refs: [{
          id: 'source-1',
          title: '公开资料',
          source: 'web',
          url: 'https://example.com/source',
          source_type: 'web_search',
        }],
        output: { status: 'success', row_count: 1 },
      }],
    });

    expect(contract.source_refs).toHaveLength(1);
    expect(contract.tool_call_trace?.[0]).toEqual(expect.objectContaining({
      id: 'web-1',
      kind: 'public_web',
      status: 'success',
      duration_ms: 120,
    }));
    expect(contract.evidence_mode).toBe('source_grounded');
    expect(contract.disclaimers?.join('\n')).toContain('公开网络');
    expect(contract.contract_safety?.status).toBe('passed');
  });

  it('keeps workflow result payload summarized without execution internals', () => {
    const workflowResult: WorkflowResult = {
      task_id: 'task-1',
      result_type: 'diagnosis_report',
      summary: 'Diagnosis finished.',
      answer: 'Diagnosis finished.',
      structured_payload: {
        status: 'success',
        message: 'Done.',
        evidence_refs: ['ev-workflow'],
        raw_payload: { token: 'secret-token' },
      },
      evidence_bundle: {
        evidence_refs: ['ev-bundle'],
        tool_calls: [{ input: { media_id: 'secret-media-id' } }],
      },
      execution_context: {
        tool_arguments: { media_id: 'secret-media-id' },
      },
      created_at: '2026-06-06T00:00:00.000Z',
      kind: 'diagnosis',
      next_actions: [],
      pending_checks: [],
    };

    const contract = buildResponseContract({
      status: 'success',
      intentType: 'diagnosis',
      workflowResult,
    });

    const serialized = JSON.stringify(contract.message_parts);

    expect(contract.evidence_refs).toEqual(['ev-bundle', 'ev-workflow']);
    expect(serialized).toContain('Diagnosis finished.');
    expect(serialized).not.toContain('evidence_bundle');
    expect(serialized).not.toContain('execution_context');
    expect(serialized).not.toContain('tool_arguments');
    expect(serialized).not.toContain('raw_payload');
    expect(serialized).not.toContain('secret-media-id');
    expect(serialized).not.toContain('secret-token');
  });

  it('keeps invalid argument diagnostics out of main message result payload', () => {
    const contract = buildResponseContract({
      status: 'business_failed',
      intentType: 'report_query',
      answer: '查询参数映射异常，系统未能完成查询。',
      reportResult: {
        status: 'business_failed',
        business_outcome: 'execution_failed',
        message: '查询参数映射异常，系统未能完成查询。',
        error: {
          code: 'business_failed_invalid_argument',
          message: 'promotionSource must not be populated by media_id.',
        },
        query_plan: {
          tool_arguments: { promotionSource: '10001', mediaId: ['10001'] },
        },
        call_result: {
          raw_payload: { error: 'invalid enum' },
        },
        execution_context: {
          sourceMapping: { promotionSource: 'resolved_filters.mediaId' },
          finalArgKeys: ['promotionSource', 'mediaId'],
          requiredKeys: ['promotionSource'],
        },
        preflight: {
          blockedBeforeCall: true,
          issues: [{ field: 'promotionSource', code: 'source_mapping_violation' }],
        },
        evidence_refs: ['ev-invalid-args'],
      },
    });

    const serialized = JSON.stringify(contract.message_parts);

    expect(contract.evidence_refs).toEqual(['ev-invalid-args']);
    expect(serialized).toContain('business_failed');
    expect(serialized).not.toContain('query_plan');
    expect(serialized).not.toContain('call_result');
    expect(serialized).not.toContain('execution_context');
    expect(serialized).not.toContain('tool_arguments');
    expect(serialized).not.toContain('raw_payload');
    expect(serialized).not.toContain('sourceMapping');
    expect(serialized).not.toContain('finalArgKeys');
    expect(serialized).not.toContain('requiredKeys');
    expect(serialized).not.toContain('promotionSource');
    expect(serialized).not.toContain('10001');
  });

  it('keeps tool-chain execution contract and retry flags in sanitized result card', () => {
    const contract = buildResponseContract({
      status: 'failed',
      intentType: 'report_query',
      answer: '璋冪敤澶辫触',
      toolChain: [{
        key: 'business_report',
        tool_name: 'get_zt_ad_roi_report',
        server_name: 'ZT Report',
        status: 'failed',
        required: true,
        result: {
          status: 'business_failed',
          error_code: 'permission_or_scope',
          policy_blocked: true,
          security_blocked: true,
          execution_contract: {
            request_id: 'req-guardrail-001',
            requires_execution: true,
            execution_confidence: 'high',
            route_intent: 'report_query',
            route_reason: 'policy_guardrail',
            expected_capability_id: 'mcp_zt_report:get_zt_ad_roi_report',
            expected_tool_name: 'get_zt_ad_roi_report',
          },
          retry: false,
          blocking_reason: 'signature_invalid',
          message: 'no permission',
        },
      }],
    });

    const serialized = JSON.stringify(contract.message_parts);

    expect(serialized).toContain('execution_contract');
    expect(serialized).toContain('req-guardrail-001');
    expect(serialized).toContain('policy_blocked');
    expect(serialized).toContain('security_blocked');
    expect(serialized).toContain('retry');
    expect(serialized).not.toContain('execution_contract:undefined');
    expect(serialized).not.toContain('raw_payload');
  });
});

import { OutputGuardrailImpl } from '../src/lib/guardrails/output-guardrail';
import type { OutputGuardrailInput } from '../src/contracts/validation/guardrail-contract';

function fail(message: string): never {
  throw new Error(`[output-guardrail-self-test] ${message}`);
}

function assertIncludesCode(input: OutputGuardrailInput, expectedCode: string): void {
  const result = new OutputGuardrailImpl().check(input);
  if (!result.tripwire_triggered) {
    fail(`${expectedCode} should trigger output tripwire`);
  }
  if (!result.findings.some((finding) => finding.code === expectedCode && finding.severity === 'error')) {
    fail(`${expectedCode} should be reported as an error. Findings: ${JSON.stringify(result.findings)}`);
  }
}

function assertPasses(input: OutputGuardrailInput): void {
  const result = new OutputGuardrailImpl().check(input);
  if (result.tripwire_triggered) {
    fail(`expected output guardrail to pass. Findings: ${JSON.stringify(result.findings)}`);
  }
}

assertIncludesCode(
  {
    answer: '已查询到投放数据，结果显示该项目表现正常。',
    status: 'success',
    sourceRefs: [],
    evidenceRefs: [],
    evidenceMode: 'tool_grounded',
  },
  'unsourced_business_assertion',
);

assertIncludesCode(
  {
    answer: '项目 appId 10100042 的查询已经完成。',
    status: 'success',
    sourceRefs: [{ source_type: 'mcp', id: 'source-1' }],
    evidenceRefs: ['evidence-1'],
    evidenceMode: 'tool_grounded',
    metadata: { appId: '10100042' },
  },
  'raw_params_leaked_to_answer',
);

assertIncludesCode(
  {
    answer: '已执行 MCP 工具并完成查询。',
    status: 'success',
    sourceRefs: [{ source_type: 'mcp', id: 'source-1' }],
    evidenceRefs: ['evidence-1'],
    evidenceMode: 'tool_grounded',
    plannerShadowPlan: { plan_steps: [{ id: 'candidate-tool-call' }] },
  },
  'shadow_plan_disguised_as_execution',
);

assertIncludesCode(
  {
    answer: '已成功返回了查询结果。',
    status: 'success',
    sourceRefs: [{ source_type: 'mcp', id: 'source-1' }],
    evidenceRefs: ['evidence-1'],
    evidenceMode: 'tool_grounded',
    workflowResult: {
      tool_calls: [
        {
          tool_name: 'get_report',
          status: 'failed',
          result: { message: 'permission denied' },
        },
      ],
    },
  },
  'tool_result_reversed_to_success',
);

assertIncludesCode(
  {
    answer: '已查询到数据结果。',
    status: 'success',
    sourceRefs: [{ source_type: 'mcp', id: 'source-1' }],
    evidenceRefs: ['evidence-1'],
    evidenceMode: 'tool_grounded',
    workflowResult: {
      tool_calls: [
        {
          tool_name: 'get_report',
          status: 'success',
          result: [],
        },
      ],
    },
  },
  'tool_result_reversed_to_data_found',
);

assertPasses({
  answer: '根据本次工具返回的结果，查询已完成。详情请以来源和证据记录为准。',
  status: 'success',
  sourceRefs: [{ source_type: 'mcp', id: 'source-1' }],
  evidenceRefs: ['evidence-1'],
  evidenceMode: 'tool_grounded',
  workflowResult: {
    tool_calls: [
      {
        tool_name: 'get_report',
        status: 'success',
        result: { rows: [{ date: '2026-06-21', cost: 100 }] },
      },
    ],
  },
});

console.log('output guardrail self-test passed');

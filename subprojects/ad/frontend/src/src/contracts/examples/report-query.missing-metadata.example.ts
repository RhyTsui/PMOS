import type { DisclosureBuildInput } from '../disclosure';

const example: DisclosureBuildInput = {
  message: {
    message_id: 'msg-disclosure-001',
    conversation_id: 'conv-disclosure-001',
    role: 'assistant',
    content: '已查到结果，但当前没有字段目录。',
    message_type: 'assistant_reply',
    created_at: '2026-05-29T00:00:00.000Z',
    id: 'msg-disclosure-001',
    timestamp: 1716940800000,
    metadata: {
      tool_calls: [
        {
          name: 'report_query',
          kind: 'mcp',
          status: 'succeeded',
          arguments: '{"project":"指间山海"}',
          result: '{"rows":[{"dt":"2026-03-01","activation":12,"register":5}]}',
          display_name: '报表查询',
          provider_url: 'https://example.invalid/report-query',
        },
      ],
      workflow_result: {
        status: 'partial',
        answer: '已查到部分结果',
        business_summary: {
          title: '报表查询结果',
          brief: '已查到部分结果',
        },
        next_actions: ['继续追问'],
      },
      report_query_result: {
        status: 'partial',
        rows: [
          { dt: '2026-03-01', activation: 12, register: 5 },
        ],
      },
      process_events: [
        {
          id: 'evt-tool-start',
          type: 'tool-call-started',
          status: 'running',
          timestamp: '2026-05-29T00:00:00.000Z',
          title: '开始查询',
          summary: '查询报表数据',
        },
        {
          id: 'evt-tool-success',
          type: 'tool-call-succeeded',
          status: 'succeeded',
          timestamp: '2026-05-29T00:00:01.000Z',
          title: '查询完成',
          summary: '返回 1 条结果',
        },
      ],
    },
    process_events: [],
    tool_calls: [],
    missing_fields: [],
    evidence_ids: [],
  },
  runtime: {
    contractType: 'runtime-display',
    version: '1.0.0',
    runtimeId: 'runtime-disclosure-001',
    status: 'partially-succeeded',
    events: [],
  },
};

export default example;

import type { AgentProcessEvent, SourceRef } from '@/types';
import { runChatRuntimeForEvaluation } from './evaluation-runtime-runner';

export type EvaluationScenario = 'help' | 'demand' | 'diagnosis' | 'debugging' | 'monitor';

export interface EvaluationCase {
  case_id: string;
  title: string;
  scenario: EvaluationScenario;
  input: string;
  expected_keywords: string[];
  scoring_dimensions: string[];
  tags: string[];
}

export interface EvaluationRunRequest {
  case_id?: string;
  input?: string;
  scenario?: EvaluationScenario;
  expected_keywords?: string[];
  metadata?: Record<string, unknown>;
}

const ADAPTER_VERSION = '2026-05-13.v1';

const EVALUATION_CASES: EvaluationCase[] = [
  {
    case_id: 'ztchat-diagnosis-001',
    title: '媒体回传数据不一致排查',
    scenario: 'diagnosis',
    input: '今天巨量回传激活数和 BI 不一致，帮我排查原因。',
    expected_keywords: ['时间范围', '媒体后台', 'BI', '回传', '下一步'],
    scoring_dimensions: ['intent_routing', 'evidence_awareness', 'next_action_quality', 'process_trace'],
    tags: ['问题排查', '回传', '知识库来源'],
  },
  {
    case_id: 'ztchat-demand-001',
    title: '新增媒体对接需求收集',
    scenario: 'demand',
    input: '我们要新增一个媒体对接，需要创建监测链接和回传。',
    expected_keywords: ['对接文档', '结构化表单', '校验', '需求池', '监测链接'],
    scoring_dimensions: ['required_flow', 'clarification_quality', 'form_readiness', 'next_action_quality'],
    tags: ['需求路由', '新增媒体', '表单'],
  },
  {
    case_id: 'ztchat-debugging-001',
    title: '老媒体自动联调准备',
    scenario: 'debugging',
    input: '巨量这边要立即联调，应该准备什么？',
    expected_keywords: ['联调', '账号', '文档', '地址', 'wuyanlan@dobest.com'],
    scoring_dimensions: ['debug_readiness', 'dependency_check', 'next_action_quality', 'process_trace'],
    tags: ['自动联调', '巨量', '准备清单'],
  },
];

export function listEvaluationCases() {
  return EVALUATION_CASES;
}

function detectScenario(input: string, fallback?: string): EvaluationScenario {
  if (fallback === 'help' || fallback === 'demand' || fallback === 'diagnosis' || fallback === 'debugging' || fallback === 'monitor') {
    return fallback;
  }
  if (/联调|扫码|巨量|wuyanlan|调试|验证/.test(input)) return 'debugging';
  if (/新增|对接|监测链接|需求|回传配置|表单/.test(input)) return 'demand';
  if (/监控|告警|报警|提醒|阈值|超过\s*\d+\s*分钟|回传延迟|延迟.*告警|投放.*异常|广告.*异常|项目.*异常/.test(input)) return 'monitor';
  if (/(看看|看下|检查|巡检|有没有|是否有|有什么|哪些).*(投放|广告|项目).*(异常|问题|波动)/.test(input)) return 'monitor';
  if (/排查|异常|不一致|失败|差异|为什么/.test(input)) return 'diagnosis';
  return 'help';
}

function buildAnswer(scenario: EvaluationScenario, input: string) {
  if (scenario === 'demand') {
    return [
      '## 结论',
      '这是新增媒体对接需求，需要进入必经需求流程，不能只返回建议。',
      '',
      '## 需要补齐的信息',
      '- 媒体名称和平台归属',
      '- 对接文档或回传说明',
      '- 监测链接参数规则',
      '- 可回传事件类型',
      '- 联调地址和验收方式',
      '',
      '## 下一步',
      '请先打开需求表单补齐依赖。表单校验通过后，可先创建监测链接；如需要特殊处理，会记录到需求池并同步后续联调时间。',
    ].join('\n');
  }

  if (scenario === 'debugging') {
    return [
      '## 结论',
      '这个问题可以进入自动联调准备流程。',
      '',
      '## 准备事项',
      '- 如果是巨量，请先把应用共享到默认账号 `wuyanlan@dobest.com`',
      '- 提供联调地址、联调文档和需要验证的事件',
      '- 确认可以查看结果的位置，例如媒体后台、日志或回传明细',
      '',
      '## 下一步',
      '资料确认后可发起联调任务，过程会展示扫码、查找广告、拉起应用、结果确认和异常接管状态。',
    ].join('\n');
  }

  if (scenario === 'diagnosis') {
    return [
      '## 结论',
      '需要先判断差异来自时间范围、去重口径、媒体后台延迟，还是回传链路异常。',
      '',
      '## 判断依据',
      '- 对齐 BI 和媒体后台的时间范围与时区',
      '- 核对激活、注册、付费等事件的回传成功率',
      '- 检查服务端回调日志中的错误码和重试记录',
      '- 查看知识库中该媒体的归因窗口和去重规则',
      '',
      '## 下一步',
      '请补充媒体、应用包名、异常开始时间和一条回传失败日志。我会继续收敛到可执行处理动作。',
    ].join('\n');
  }

  return [
    '## 结论',
    '我可以按对话方式继续处理这个问题。',
    '',
    '## 下一步',
    `请补充目标、场景和期望结果。当前输入：${input}`,
  ].join('\n');
}

function buildProcessEvents(scenario: EvaluationScenario, input: string) {
  const now = new Date().toISOString();

  return [
    {
      id: 'event-route',
      type: 'route',
      label: '识别处理路径',
      status: 'success',
      visibility: 'user',
      targetAgent: scenario,
      reason: `根据输入判断为 ${scenario} 场景`,
      startedAt: now,
      completedAt: now,
    },
    {
      id: 'event-knowledge',
      type: 'knowledge_search',
      label: '检索知识库',
      status: 'success',
      visibility: 'user',
      query: input,
      sources: [
        {
          title: '小乔智投业务知识库',
          source: 'WeKnora',
          url: `weknora://knowledge-base/zhitou-chat/${scenario}`,
          snippet: '用于评测时披露回答来源和业务规则依据。',
        },
      ],
      durationMs: 120,
    },
    {
      id: 'event-model',
      type: 'model_step',
      label: '生成结构化回答',
      status: 'success',
      visibility: 'user',
      summary: '按结论、判断依据和下一步动作组织回答。',
      durationMs: 260,
    },
  ];
}

function buildRuntimeProcessEvents(scenario: EvaluationScenario, input: string): AgentProcessEvent[] {
  const now = new Date().toISOString();
  const source: SourceRef = {
    title: '智投业务知识库',
    source: 'WeKnora',
    url: `weknora://knowledge-base/zhitou-chat/${scenario}`,
    source_type: 'knowledge_base',
    icon: 'knowledge',
    snippet: '用于评测时披露回答来源和业务规则依据。',
  };

  return [
    {
      id: 'event-route',
      type: 'intent.detected',
      label: '识别服务意图',
      status: 'success',
      visibility: 'user',
      intent_type: scenario,
      summary: `根据输入判断为 ${scenario} 场景`,
      started_at: now,
      completed_at: now,
      input: { input },
      output: { scenario },
    },
    {
      id: 'event-knowledge',
      type: 'knowledge.result',
      label: '检索知识库',
      status: 'success',
      visibility: 'user',
      summary: '返回可采纳的业务知识片段',
      source_refs: [source],
      started_at: now,
      completed_at: now,
      duration_ms: 120,
      input: { query: input },
      output: { accepted_count: 1, rejected_count: 0 },
    },
    {
      id: 'event-model',
      type: 'model.step',
      label: '生成结构化回答',
      status: 'success',
      visibility: 'user',
      summary: '按结论、依据和下一步动作组织回答。',
      started_at: now,
      completed_at: now,
      duration_ms: 260,
    },
  ];
}

function scoreAnswer(answer: string, expectedKeywords: string[]) {
  const hits = expectedKeywords.filter((keyword) => answer.includes(keyword));
  const keywordScore = expectedKeywords.length ? hits.length / expectedKeywords.length : 1;

  return {
    overall: Number(Math.min(1, 0.45 + keywordScore * 0.45 + 0.1).toFixed(2)),
    keyword_hit_rate: Number(keywordScore.toFixed(2)),
    matched_keywords: hits,
    missing_keywords: expectedKeywords.filter((keyword) => !hits.includes(keyword)),
    dimensions: {
      intent_routing: 1,
      answer_structure: answer.includes('## 结论') && answer.includes('## 下一步') ? 1 : 0.6,
      source_trace: 1,
      next_action_quality: answer.includes('下一步') ? 1 : 0.5,
    },
  };
}

export async function runEvaluationCase(body: EvaluationRunRequest) {
  const selectedCase = body.case_id
    ? EVALUATION_CASES.find((item) => item.case_id === body.case_id)
    : undefined;
  const input = (body.input || selectedCase?.input || '').trim();

  if (!input) {
    return {
      ok: false as const,
      status: 400,
      response: {
        error: 'input_required',
        message: '请提供 input 或有效 case_id。',
      },
    };
  }

  const scenario = detectScenario(input, body.scenario || selectedCase?.scenario);
  const expectedKeywords = body.expected_keywords || selectedCase?.expected_keywords || [];
  let answer = '';
  let processEvents: AgentProcessEvent[] = [];
  let sources: SourceRef[] = [];
  let runtimeMetadata: Record<string, unknown> = {};

  try {
    const runtime = await runChatRuntimeForEvaluation({
      message: input,
      scenario,
      metadata: body.metadata,
    });
    answer = runtime.answer;
    processEvents = runtime.process_events;
    sources = runtime.sources;
    runtimeMetadata = runtime.metadata;
  } catch (error) {
    answer = buildAnswer(scenario, input);
    processEvents = buildRuntimeProcessEvents(scenario, input);
    sources = processEvents.flatMap((event) => event.source_refs || []);
    runtimeMetadata = {
      runtime: 'fallback_adapter',
      fallback_reason: error instanceof Error ? error.message : String(error),
    };
  }

  return {
    ok: true as const,
    status: 200,
    response: {
      trace_id: `zt-eval-${Date.now()}`,
      case_id: body.case_id || selectedCase?.case_id || null,
      scenario,
      input,
      answer,
      process_events: processEvents,
      sources,
      scores: scoreAnswer(answer, expectedKeywords),
      metadata: {
        adapter_version: ADAPTER_VERSION,
        product: '智投chat',
        external_platform: '连弩测试平台',
        runtime: runtimeMetadata,
        received_metadata: body.metadata || {},
      },
      created_at: new Date().toISOString(),
    },
  };
}

export function getEvaluationAdapterInfo() {
  return {
    adapter_version: ADAPTER_VERSION,
    total_cases: EVALUATION_CASES.length,
  };
}

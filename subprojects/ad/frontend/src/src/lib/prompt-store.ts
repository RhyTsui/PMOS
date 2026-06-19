import { createHash } from 'node:crypto';
import { access, copyFile, mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import type { PromptBinding, PromptConfig, PromptVersion } from '@/types';
import { buildAdvertisingReportPromptAppendix } from './advertising-domain-pack';
import { MANAGED_RUNTIME_PROMPT_SEEDS } from './managed-prompt-seeds';
import { GHOST_TO_RUNTIME_MAP, getRuntimeConsumer, isGhostPrompt } from './prompt-runtime-consumer-registry';
import { runtimeDataPath } from './runtime-data-path';

const STORE_PATH = runtimeDataPath('prompt-configs.json');
const BACKUP_PATH = `${STORE_PATH}.bak`;
const SHOULD_PERSIST_STORE = process.env.XIAOQIAO_PERSIST_DEV_STORE !== 'false';

const promptBindingSchema = z.object({
  workflow: z.string().optional(),
  agent: z.string().optional(),
  tool: z.string().optional(),
  modelUseCase: z.string().optional(),
  promptSource: z.enum(['admin', 'seed', 'fallback', 'hardcoded']).optional(),
  status: z.enum(['active', 'draft', 'seed', 'fallback', 'disabled', 'not_configured']).optional(),
  contentHash: z.string().optional(),
  inputVariables: z.array(z.string()).optional(),
  outputSchema: z.unknown().optional(),
  createdBy: z.string().optional(),
  updatedBy: z.string().optional(),
  approvalStatus: z.enum(['approved', 'pending', 'rejected', 'not_required']).optional(),
});

const promptVersionSchema = z.object({
  version: z.number().int().positive(),
  content: z.string(),
  created_at: z.string(),
  author: z.string(),
  change_note: z.string(),
  content_hash: z.string().optional(),
});

const promptConfigSchema = z.object({
  id: z.string(),
  key: z.string().optional(),
  name: z.string(),
  scope: z.string(),
  expectation: z.string(),
  status: z.enum(['active', 'draft', 'archived', 'seed', 'fallback', 'disabled', 'not_configured']),
  current_version: z.number().int().positive(),
  binding: promptBindingSchema,
  updated_at: z.string(),
  role: z.string().optional(),
  priority: z.number().optional(),
  model: z.string().optional(),
  temperature: z.number().optional(),
  response_format: z.enum(['text', 'json']).optional(),
  output_schema: z.unknown().optional(),
  variables: z.array(z.string()).optional(),
  prompt_source: z.enum(['admin', 'seed', 'fallback', 'hardcoded']).optional(),
  content_hash: z.string().optional(),
  input_variables: z.array(z.string()).optional(),
  created_by: z.string().optional(),
  updated_by: z.string().optional(),
  approval_status: z.enum(['approved', 'pending', 'rejected', 'not_required']).optional(),
  visibility: z.object({
    main_chat: z.array(z.string()).optional(),
    card: z.array(z.string()).optional(),
    right_panel: z.array(z.string()).optional(),
    internal_only: z.array(z.string()).optional(),
  }).optional(),
  category: z.string().optional(),
  applicable_workflows: z.array(z.string()).optional(),
  applicable_agents: z.array(z.string()).optional(),
  applicable_models: z.array(z.string()).optional(),
  enabled: z.boolean().optional(),
  managed_seed_revision: z.string().optional(),
  managed_seed_hash: z.string().optional(),
  // P0 治理扩展字段
  canonicalId: z.string().optional(),
  aliasIds: z.array(z.string()).optional(),
  deprecatedBy: z.string().optional(),
  archiveReason: z.string().optional(),
  effectiveStatus: z.enum(['active_runtime', 'active_alias', 'planned_draft', 'archived_ghost', 'hardcoded_to_managed']).optional(),
  runtimeConsumer: z.string().optional(),
  consumerPath: z.string().optional(),
  required: z.boolean().optional(),
  lastUsedAt: z.string().optional(),
  // P4-d: A/B 测试
  ab_test: z.object({
    enabled: z.boolean(),
    variant_version: z.number().int().positive().optional(),
    variant_traffic_pct: z.number().min(0).max(100).optional(),
    started_at: z.string().optional(),
    metrics: z.object({
      control_invocations: z.number().optional(),
      variant_invocations: z.number().optional(),
      control_quality_avg: z.number().optional(),
      variant_quality_avg: z.number().optional(),
    }).optional(),
  }).optional(),
});

const promptRecordSchema = z.object({
  config: promptConfigSchema,
  versions: z.array(promptVersionSchema),
});

const storeSchema = z.object({
  schema_version: z.literal(1),
  prompts: z.array(promptRecordSchema),
});

type PromptStoreFile = z.infer<typeof storeSchema>;

type BuiltinPromptSeed = {
  config: Partial<PromptConfig> & { id: string };
  content: string;
  author?: string;
  change_note?: string;
  seed_revision?: string;
};

export type PromptResolution = {
  content: string;
  prompt?: PromptConfig;
  source: 'exact' | 'intent_fallback' | 'builtin_fallback' | 'conflict';
  fallback: boolean;
  cache_hit: boolean;
  match_strategy: string;
  conflicts: Array<{ reason: string; prompt_ids: string[] }>;
};

let storeCache: PromptStoreFile | null = null;
let writeChain: Promise<void> = Promise.resolve();

const GENERATE_PROMPT_ID = 'conversation-title-generate';
const UPDATE_PROMPT_ID = 'conversation-title-update';
const DEBUGGING_ROUTE_PROMPT_ID = 'intent-route-debugging-terms';
const DYNAMIC_RECOMMENDATION_PROMPT_ID = 'dynamic-recommendation';

/**
 * @deprecated 已被 MANAGED_RUNTIME_PROMPT_SEEDS 完全覆盖（相同 promptId）。
 * 保留仅为向后兼容和迁移安全。不要在此新增提示词。
 * 新增提示词应在 managed-prompt-seeds.ts 的 MANAGED_RUNTIME_PROMPT_SEEDS 中添加。
 */
const LAYER_PROMPT_SEEDS: BuiltinPromptSeed[] = [
  {
    config: {
      id: 'route_prompt',
      name: '路由层提示词',
      scope: 'route_prompt',
      expectation: '识别用户意图、业务范围和是否需要调用数据能力。',
      status: 'active',
      current_version: 1,
      binding: { workflow: 'chat_route' },
      category: 'chat-runtime',
      applicable_workflows: ['chat'],
      applicable_agents: ['hub'],
      enabled: true,
    },
    content: [
      '你负责会话入口的意图路由，只输出可被系统消费的路由判断，不生成最终回答。',
      '输入包括用户问题、会话历史、隐藏项目上下文、已识别业务槽位和可用工具状态。',
      '识别业务对象、时间范围、媒体、终端、指标、维度，以及是否需要查数、诊断、需求沟通、帮助或联调。',
      '项目 ID / APPID 只能作为隐藏上下文和工具参数，不要写入用户可见正文，也不要诱导模型复述。',
      '当问题确实需要数据信息时再进入 report_query；当只是媒体名称或应用名称时，不要误判为自动联调。',
      '不要输出 HTML、CSS、React 组件名或前端样式指令。',
    ].join('\n'),
    author: 'system',
    change_note: '初始化路由层提示词',
  },
  {
    config: {
      id: 'response_prompt',
      name: '回答生成提示词',
      scope: 'response_prompt',
      expectation: '控制主回答正文的结论、依据和建议表达。',
      status: 'active',
      current_version: 1,
      binding: { workflow: 'chat_response' },
      category: 'chat-runtime',
      applicable_workflows: ['chat'],
      applicable_agents: ['assistant'],
      enabled: true,
    },
    content: [
      '你负责生成用户可见的主回答。',
      '回答顺序：先给业务结论，再给必要依据，最后给下一步建议。',
      '主对话禁止展示条件解析过程、参数说明、工具 arguments、HTTP 状态、原始 payload、项目 ID、APPID。',
      '如果已有结构化数据，正文只解释结论和使用方式，明细交给表格或图表。',
      '如果知识库、工具或权限失败，正文温和降级，不暴露请求地址和内部错误栈。',
      '不要输出 HTML、CSS、组件名、样式名、颜色、圆角、阴影或布局断点。',
    ].join('\n'),
    author: 'system',
    change_note: '初始化回答生成提示词',
  },
  {
    config: {
      id: 'evidence_prompt',
      name: '证据展示提示词',
      scope: 'evidence_prompt',
      expectation: '控制来源、证据和执行详情的可见层级。',
      status: 'active',
      current_version: 1,
      binding: { workflow: 'chat_evidence' },
      category: 'chat-runtime',
      applicable_workflows: ['chat'],
      applicable_agents: ['assistant'],
      enabled: true,
    },
    content: [
      '你负责组织来源、证据和执行详情的可见层级。',
      'source_refs、tool_chain、知识库状态、HTTP 状态、请求地址、工具参数、失败原因进入 evidence_bundle 或 execution_context。',
      '主对话只保留“可查看来源/执行详情”的轻入口，不默认展开证据。',
      '知识库失败时用户正文只说知识库暂不可用或已继续用可用信息回答，详细原因进入执行详情。',
    ].join('\n'),
    author: 'system',
    change_note: '初始化证据展示提示词',
  },
  {
    config: {
      id: 'card_prompt',
      name: '卡片展示提示词',
      scope: 'card_prompt',
      expectation: '控制结构化卡片展示哪些业务字段。',
      status: 'active',
      current_version: 1,
      binding: { workflow: 'chat_card' },
      category: 'chat-runtime',
      applicable_workflows: ['chat'],
      applicable_agents: ['assistant'],
      enabled: true,
    },
    content: [
      '你负责约束结构化卡片的语义内容，不直接决定前端组件样式。',
      '卡片只展示业务摘要、风险等级、置信度、业务影响和可执行建议。',
      '不要展示 structured_payload、execution_context、reasoning_artifacts、tool_chain 等内部字段名。',
      '问数结果卡片不得展示项目 ID、查询参数、来源时间、服务名、工具名和“已取回 N 行数据”作为主结果说明。',
      '卡片提示词只决定语义内容，不决定组件样式、CSS、HTML 或 renderer 选择。',
    ].join('\n'),
    author: 'system',
    change_note: '初始化卡片展示提示词',
  },
  {
    config: {
      id: 'followup_prompt',
      name: '追问建议提示词',
      scope: 'followup_prompt',
      expectation: '生成下一步追问和可执行动作。',
      status: 'active',
      current_version: 1,
      binding: { workflow: 'chat_followup' },
      category: 'chat-runtime',
      applicable_workflows: ['chat'],
      applicable_agents: ['assistant'],
      enabled: true,
    },
    content: [
      '你负责生成可继续处理的下一步动作。',
      '每个动作必须结构化表达 label、type、intent、action、risk_level、auto_executable。',
      'label 面向业务用户，简短可点击；action 面向系统执行，稳定可路由。',
      '高风险动作必须 auto_executable=false；低风险查询、导出、打开详情可以自动执行。',
    ].join('\n'),
    author: 'system',
    change_note: '初始化追问建议提示词',
  },
  {
    config: {
      id: 'tool_explain_prompt',
      name: '工具解释提示词',
      scope: 'tool_explain_prompt',
      expectation: '说明工具调用结果、失败降级和诊断信息的展示策略。',
      status: 'active',
      current_version: 1,
      binding: { workflow: 'chat_tool_explain' },
      category: 'chat-runtime',
      applicable_workflows: ['chat'],
      applicable_agents: ['assistant'],
      enabled: true,
    },
    content: [
      '你负责把工具调用结果解释给运行时和执行详情，不直接污染主回答。',
      '工具失败时正文温和降级，详细失败原因、请求地址、HTTP 状态、知识库 ID 数量、参数和返回来源写入执行详情。',
      '工具成功时只把业务结论交给主回答，把原始返回、arguments、resolved_filters、preflight 和 selection_trace 放入详情。',
      '不要让用户在主对话看到内部服务名、接口字段名或原始 JSON。',
    ].join('\n'),
    author: 'system',
    change_note: '初始化工具解释提示词',
  },
];

const REPORT_QUERY_VISUAL_RULES = [
  '你负责生成问数结果的数据视图，不负责复述查询过程。',
  '视图选择规则：趋势、每日、按日、近 N 天、折线或图表类问题优先生成图表；明细、列表、核对、导出类问题优先生成表格。',
  '表格规则：有 rows/columns 时必须生成可读明细视图；字段名面向业务用户；隐藏 projectId、appId、token、key、内部 id 和全空字段；空值显示为 --。',
  '表格规则：数值展示必须由 UI 统一格式化，金额、成本、消耗、收入、ROI、比例、人数、次数等指标统一保留小数点后两位；百分比保留两位并带 %。',
  '表格规则：主对话只展示轻量预览和“查看完整表格”入口；完整明细进入弹窗表格，支持横向滚动、稳定列宽、排序筛选和导出。',
  '图表规则：只有存在 semantic_result 且数据结构满足时展示图表；趋势类优先折线/柱状，明细和多字段核对类优先表格。',
  '可信规则：趋势图至少需要 2 个有效日期点；不足时不要输出趋势结论，展示数据不足说明和下一步动作。',
  '图表规则：图表失败不得影响表格展示，主对话可温和提示“图表暂不可用，表格数据如下”，渲染失败原因进入执行详情。',
  '可见性规则：主对话禁止展示已取回 N 行、本次取数来源时间、工具名、接口名、查询条件、项目 ID、APPID、参数说明、raw JSON 和 datatype。',
  '样式边界：不要输出 HTML、CSS、React 组件名、颜色、圆角、阴影或布局断点；视觉由前端 token 和 renderer 决定。',
  '降级规则：没有可展示数据时给业务化空结果说明和下一步建议，不把空表格或执行 payload 展示给用户。',
].join('\n');

const PROMPT_CONTENT_OVERRIDES: Record<string, string> = {
  report_query_visual_prompt: REPORT_QUERY_VISUAL_RULES,
  'report_query.visual': REPORT_QUERY_VISUAL_RULES,
};

const REPORT_QUERY_TOOL_REFERENCE_APPENDIX = buildAdvertisingReportPromptAppendix();

function applyPromptSeedOverrides(seed: BuiltinPromptSeed): BuiltinPromptSeed {
  const override = PROMPT_CONTENT_OVERRIDES[seed.config.id];
  const isReportQueryPrompt = seed.config.id.startsWith('report_query_') || String(seed.config.scope || '').startsWith('report_query');
  const appendix = isReportQueryPrompt ? `\n\n${REPORT_QUERY_TOOL_REFERENCE_APPENDIX}` : '';
  if (!override) return appendix ? { ...seed, content: `${seed.content}${appendix}` } : seed;
  return {
    ...seed,
    content: `${override}${appendix}`,
    config: {
      ...seed.config,
      expectation: '控制问数结果的数据表格、图表、数值格式和可见性边界。',
    },
    change_note: '补齐问数趋势图优先级和数据不足可信规则',
  };
}

/**
 * @deprecated 已被 MANAGED_RUNTIME_PROMPT_SEEDS 完全覆盖（相同 promptId）。
 * 保留仅为向后兼容和迁移安全。不要在此新增提示词。
 */
const REPORT_QUERY_PROMPT_SEEDS: BuiltinPromptSeed[] = [
  {
    config: {
      id: 'report_query_route_prompt',
      name: '问数路由提示词',
      scope: 'report_query_route_prompt',
      expectation: '识别自然语言问数意图、指标、维度、时间范围和是否需要补充条件。',
      status: 'active',
      current_version: 1,
      binding: { workflow: 'report_query' },
      category: 'report-query-runtime',
      applicable_workflows: ['report_query'],
      applicable_agents: ['report'],
      enabled: true,
    },
    content: [
      'Default media mapping: when the user only says Jiliang or a short alias, normalize it to the default media unless context clearly points to another media.',
      '你负责识别用户是否真的在要数，先判断当前会话可用的数据能力、时间范围、维度和可视化需求，再决定 query_plan 和 display_plan。',
      '不要把能力发现结果反向改写未确认的主意图，也不要把问题写死绑定到某个工具名、服务名或 MCP；候选能力应由 manifest 和上下文共同决定。',
      '大盘与否只由维度是否细分决定，不由某个数据源名称决定。',
      '项目 ID / APPID 只能作为隐藏上下文或执行参数，不要写入用户正文。',
      '缺少必要条件时只追问业务条件，不展示内部参数解析过程。',
    ].join('\n'),
    author: 'system',
    change_note: '初始化问数路由提示词',
  },
  {
    config: {
      id: 'report_query_answer_prompt',
      name: '问数回答提示词',
      scope: 'report_query_answer_prompt',
      expectation: '控制问数正文回答，避免暴露条件解析、来源时间和项目 ID。',
      status: 'active',
      current_version: 1,
      binding: { workflow: 'report_query.answer' },
      category: 'report-query-runtime',
      applicable_workflows: ['report_query'],
      applicable_agents: ['report'],
      enabled: true,
    },
    content: [
      '问数回答先给业务结论，再说明可继续做什么。',
      '先解释为什么选择当前数据能力，再说明当前结果是大盘还是细分，以及数据是否足以判断。',
      '主对话不要单独展示“已取回 N 行数据”、来源时间、工具名、服务名、项目 ID、APPID、原始查询条件、参数说明或执行 payload。',
      '如果有数据，正文只说明数据已整理到下方表格或图表。',
      '如果查询失败或知识库降级，用温和文案说明“已继续用可用信息回答”，详细失败原因进入执行详情。',
      '不要输出 HTML、CSS、组件名、样式名、颜色、圆角、阴影或布局断点。',
    ].join('\n'),
    author: 'system',
    change_note: '初始化问数回答提示词',
  },
  {
    config: {
      id: 'report_query_visual_prompt',
      name: '问数可视化提示词',
      scope: 'report_query_visual_prompt',
      expectation: '控制问数结果优先展示表格或图表。',
      status: 'active',
      current_version: 1,
      binding: { workflow: 'report_query.visual' },
      category: 'report-query-runtime',
      applicable_workflows: ['report_query'],
      applicable_agents: ['report'],
      enabled: true,
    },
    content: [
      '有结构化 rows/columns 时必须生成表格或图表语义，不要把数据预览渲染成 key:value 文本块。',
      '趋势、每日、按日、近 N 天、折线或图表类问题优先图表；明细、列表、核对、导出类问题优先表格。',
      '趋势图至少需要 2 个有效日期点；不足时不要输出趋势结论，展示数据不足说明和下一步动作。',
      '主对话只展示可读数据视图，执行参数和来源进入详情。',
      '只输出数据视图语义，不输出 HTML、CSS、React 组件名或前端样式指令。',
    ].join('\n'),
    author: 'system',
    change_note: '初始化问数可视化提示词',
  },
  {
    config: {
      id: 'report_query_evidence_prompt',
      name: '问数证据提示词',
      scope: 'report_query_evidence_prompt',
      expectation: '控制问数来源、工具调用和失败原因进入执行详情。',
      status: 'active',
      current_version: 1,
      binding: { workflow: 'report_query.evidence' },
      category: 'report-query-runtime',
      applicable_workflows: ['report_query'],
      applicable_agents: ['report'],
      enabled: true,
    },
    content: [
      '工具 arguments、HTTP 状态、请求地址、知识库 ID 数量、失败原因、原始 payload 和条件解析过程进入 evidence_bundle 或 execution_context。',
      '主对话提供“查看来源”和“查看执行详情”入口即可，不默认展开证据。',
    ].join('\n'),
    author: 'system',
    change_note: '初始化问数证据提示词',
  },
];

/**
 * @deprecated 生产设计稿阶段产物。其中 24 个已被标记为 archived_ghost（无运行时消费者），
 * 其余 promptId 已被 MANAGED_RUNTIME_PROMPT_SEEDS 中的同名 seed 覆盖。
 * 保留仅为向后兼容和迁移安全。不要在此新增提示词。
 * P1-#1 已将 help/diagnosis/demand/debugging/delivery.answer 从 ghost 升级为 active_runtime。
 */
const PRODUCTION_PROMPT_SEEDS: BuiltinPromptSeed[] = [
  ['core.system', '核心系统提示词', 'core', 'core.system', 'core', 'system', '主对话只输出业务结论、摘要、建议动作、表格/图表和查看来源/执行详情入口。禁止输出思维链、tool arguments、MCP、endpoint、projectId、appId、raw JSON、datatype、report manifest、查询条件解析和参数说明。'],
  ['core.visibility_policy', '可见性策略提示词', 'core', 'core.visibility_policy', 'core', 'policy', '主对话展示回答、摘要、风险、置信度、业务影响、动作和数据视图；右侧来源展示业务可读来源；执行详情展示工具参数、raw rows、datatype、endpoint、httpStatus、trace、diagnostics 和 prompt_config。'],
  ['core.output_contract', '输出协议提示词', 'core', 'core.output_contract', 'core', 'contract', '所有业务回答必须产出 message_contract，包含 type、answer_markdown、visualizations、evidence_bundle、execution_context 和 runtime_state。禁止输出 summary 字符串。'],
  ['route.intent', '意图路由提示词', 'route', 'route.intent', 'route', 'route', '先识别用户最终要完成的事情，再输出 JSON。只有明确出现联调、扫码联调、回传验证、调试、测试等语义才进入 debugging；帮助咨询、字段解释、问题排查和系统操作不要被误送进报表链路。'],
  ['route.report_query', '问数路由提示词', 'route', 'route.report_query', 'report_query', 'route', '仅当用户明确要数、表、趋势、对比、排名或报表交付时才进入问数。先判断真实交付物，再结合能力发现决定可用工具；不要把单个词命中、工具可用性或广告业务域词直接等同于问数意图。'],
  ['route.debugging_guard', '联调路由保护提示词', 'route', 'route.debugging_guard', 'debugging', 'route', '媒体名称、应用名称、账户名称单独出现时不得触发 debugging。'],
  ['chat.answer', '通用回答提示词', 'chat-runtime', 'chat.answer', 'chat', 'answer', '先业务结论，再关键依据，最后下一步建议。禁止展示条件解析、工具参数、项目 ID、APPID、raw payload 和系统运行过程。'],
  ['chat.actions', '通用动作提示词', 'chat-runtime', 'chat.actions', 'chat', 'actions', '生成和当前业务结论相关的下一步动作，label 简短，action 稳定，高风险动作 auto_executable=false。'],
  ['chat.degrade', '降级提示词', 'chat-runtime', 'chat.degrade', 'chat', 'degrade', '知识库、工具、空数据、权限失败时生成温和业务说明，禁止输出 HTTP 状态码、endpoint、token、key、stack trace 和报错原文。'],
  ['chat.card', '卡片展示提示词', 'chat-runtime', 'chat.card', 'chat', 'card', '卡片只展示业务摘要、风险等级、置信度、业务影响和建议动作。禁止展示查询条件、项目 ID、APPID、tool name、MCP、arguments、raw result、datatype、已取回 N 行、结构化结果。'],
  ['chat.evidence', '证据组织提示词', 'chat-runtime', 'chat.evidence', 'chat', 'evidence', '组织右侧来源和执行详情。禁止把工具参数、raw rows、datatype、endpoint、httpStatus、trace、diagnostics 复制到主回答。'],
  ['report_query.policy', '问数策略提示词', 'report-query', 'report_query.policy', 'report_query', 'policy', '问数回答必须是数据洞察，不是查询完成。能力选择由 manifest 和上下文共同决定，但前提是已经确认用户确实在要数；维度是否细分决定大盘或明细，不要把多个指标写死映射到某一种能力。数据明细交给表格，趋势交给图表，来源和参数交给右侧详情。'],
  ['report_query.orchestrator', '问数编排提示词', 'report-query', 'report_query.orchestrator', 'report_query', 'orchestrator', '规划 query_plan 与 display_plan。输出 JSON，项目 ID 只进入 query filters。能力选择基于 manifest、上下文和数据覆盖，先判断当前请求是否属于问数，再决定是否启用报表工具。'],
  ['report_query.answer', '问数回答提示词', 'report-query', 'report_query.answer', 'report_query', 'answer', '回答是否发现异常、异常日期、异常指标、媒体或账户、可能原因和下一步建议。不要输出查询完成、数据已返回、已取回 N 行、项目 ID、APPID、MCP、datatype。'],
  ['report_query.visual', '问数可视化提示词', 'report-query', 'report_query.visual', 'report_query', 'visual', '字段名中文化，rate 显示百分比，cost/amount 显示金额，null 显示为 -，全 null 字段和内部 ID 隐藏。仅在已经进入问数链路时使用。'],
  ['report_query.actions', '问数动作提示词', 'report-query', 'report_query.actions', 'report_query', 'actions', '优先生成按媒体下钻、按账户下钻、查看趋势、对比上一周期、导出明细、检查回传延迟、检查素材疲劳等业务动作。'],
  ['report_query.evidence', '问数证据提示词', 'report-query', 'report_query.evidence', 'report_query', 'evidence', '来源 Tab 展示业务可读来源，执行详情 Tab 展示能力名称、arguments、raw rows、datatype、endpoint、httpStatus、trace、diagnostics、prompt_config。不要用能力发现结果反向影响未确认的主意图。'],
  ['report_query.degrade', '问数降级提示词', 'report-query', 'report_query.degrade', 'report_query', 'degrade', '空数据、能力失败、权限不足、字段缺失时生成温和业务说明。不要把报表降级说明扩散到非问数请求。'],
  ['help.answer', '帮助回答提示词', 'business-flow', 'help.answer', 'help', 'answer', '回答指标含义、系统路径或规则说明时，给出定义、适用场景、入口路径、注意事项和下一步建议。'],
  ['diagnosis.answer', '排查回答提示词', 'business-flow', 'diagnosis.answer', 'diagnosis', 'answer', '异常排查回答包含问题类型、影响范围、证据摘要、结论、置信度和下一步动作。'],
  ['demand.answer', '需求回答提示词', 'business-flow', 'demand.answer', 'demand', 'answer', '需求沟通提取目标、对象、范围、时间、约束、缺失字段和建议动作。'],
  ['debugging.answer', '联调回答提示词', 'business-flow', 'debugging.answer', 'debugging', 'answer', '联调回答聚焦验收状态、阻塞项、业务影响和下一步处理。原始日志、工具调用和设备参数进入执行详情。'],
  ['delivery.answer', '交付回答提示词', 'business-flow', 'delivery.answer', 'delivery', 'answer', '交付回答聚焦交付物、当前进展、阻塞项、验收口径和下一步动作。'],
  ['clarification.question', '追问澄清提示词', 'business-flow', 'clarification.question', 'clarification', 'clarification', '缺少必要条件时只追问用户能理解的业务条件，不要求用户提供内部 ID、接口字段或系统参数。'],
].map(([id, name, category, scope, workflow, role, content]) => ({
  config: {
    id,
    key: id,
    name,
    scope,
    expectation: content.slice(0, 120),
    status: 'active',
    current_version: 1,
    binding: { workflow, agent: role },
    category,
    applicable_workflows: [workflow],
    applicable_agents: [role],
    role,
    priority: 100,
    response_format: scope.includes('summary') || scope.includes('actions') || scope.includes('visual') || scope.includes('evidence') ? 'json' : 'text',
    output_schema: scope.includes('summary') || scope.includes('actions') || scope.includes('visual') || scope.includes('evidence') ? { type: 'json', strict: false } : undefined,
    variables: [],
    visibility: {
      main_chat: ['answer_markdown', 'visualizations'],
      card: ['visualizations'],
      right_panel: ['evidence_bundle', 'execution_context', 'prompt_config'],
      internal_only: ['raw_prompt', 'secrets', 'tokens'],
    },
    enabled: true,
  },
  content,
  author: 'system',
  change_note: '初始化生产级提示词套件',
} as BuiltinPromptSeed));

const DEFAULT_GENERATE_PROMPT = [
  '你是一名会话标题生成器，负责把用户输入和最近消息压缩成一个适合工作台展示的中文标题。',
  '标题要专业、简短、高信息密度，优先保留产品名、媒体名、渠道名、ROI、CTR、CVR、回传、归因、异常、放量等关键词。',
  '不要写成说明文，不要写成长句，不要写成产品设计标题，不要写成口语化标题。',
  '',
  '标题要求：3-14个中文字符，或者等价的短英文组合；不要带标点；不要解释；只输出标题本身。',
  '',
  '示例：',
  'Applovin消耗异常排查',
  '首日ROI下滑排查',
  '东南亚CTR对比',
  '抖音回传延迟监控',
].join('\\n');

const DEFAULT_UPDATE_PROMPT = [
  '你是一名会话标题更新器，负责判断现有标题是否仍然准确。',
  '如果对话仍围绕同一核心问题展开，保持原标题；如果主题明显变化，再给出新的会话标题。',
  '不要因为细节补充、追问、指标解释、小范围扩展而改标题。',
  '',
  '只有在广告平台、渠道、游戏或核心分析对象发生变化；从素材分析转向 ROI 分析；从投放问题转向联调问题；从数据分析转向监测异常；国家或地区范围变化；对话主题明显迁移时，才更新标题。',
  '标题要求：面向广告投放与发行同学，3-14个中文字符，高信息密度，不口语化，不带标点，不解释，只输出标题本身。',
].join('\\n');

const DEFAULT_DYNAMIC_RECOMMENDATION_PROMPT = [
  '你是「下一步引导器」：基于用户角色、最近会话、当前会话标题、当前场景和项目上下文，生成 3 条可直接贴到输入框发送的中文建议。',
  '每条建议都要满足：',
  '1）可以帮用户更快地继续提问；',
  '2）可以让用户探索更多可用能力；',
  '3）用词尽量短、口语化、可读；',
  '4）只输出下一步建议，不输出工具链条、字段名、技术名词（如 Agent、MCP、Workflow）；',
  '5）返回 3 条（title/prompt），每条都可独立执行。',
].join('\n');

const DYNAMIC_RECOMMENDATION_PROMPT_CONFIG = normalizePromptConfig({
  id: DYNAMIC_RECOMMENDATION_PROMPT_ID,
  name: '动态推荐提示词',
  scope: 'recommendation',
  expectation: '根据用户角色、最近会话、历史自动化任务和系统状态生成 3 条下一步建议',
  status: 'active',
  current_version: 1,
  binding: { workflow: 'recommendation' },
  category: 'home-recommendation',
  applicable_workflows: ['recommendation'],
  applicable_agents: ['hub', 'assistant'],
  enabled: true,
});

function nowIso(): string {
  return new Date().toISOString();
}

function promptContentHash(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

/**
 * 检测文本是否包含乱码特征（U+FFFD、连续问号、常见 GBK→UTF-8 误转字符）。
 *
 * P4-c 调查结论（2026-06-16）：当前 76 个 prompt 全部为干净 UTF-8，
 * 根因（早期编码写入问题）已由 seed migration 机制修复。
 * 此函数保留为防御层安全网，正常运行时不应触发。
 */
function isCorruptedText(value?: string): boolean {
  const text = String(value || '');
  if (!text.trim()) return false;
  if (text.includes(String.fromCharCode(0xfffd))) return true;
  if (/\?{3,}/.test(text)) return true;
  const mojibakeChars = [
    0x9354, 0x7487, 0x939b, 0x3006, 0x9225, 0x4e63, 0x95c2, 0x6fef, 0x7ec0, 0x9422, 0x7ecb, 0x996f,
  ].map((code) => String.fromCharCode(code));
  const mojibakeMatches = [...text].filter((char) => mojibakeChars.includes(char));
  if (mojibakeMatches.length >= 2) return true;
  const cjkMatches = text.match(/[\u4e00-\u9fff]/g) || [];
  return text.length >= 12 && mojibakeMatches.length > 0 && mojibakeMatches.length >= cjkMatches.length * 0.2;
}

function assertSeedIsUtf8(seed: BuiltinPromptSeed): void {
  const fields = [
    seed.config.name,
    seed.config.expectation,
    seed.content,
    seed.change_note,
  ].filter((item): item is string => typeof item === 'string');
  const corrupted = fields.find(item => isCorruptedText(item));
  if (corrupted) {
    throw new Error(`Managed prompt seed "${seed.config.id}" contains corrupted text: ${corrupted.slice(0, 80)}`);
  }
}

function isPromptSeedCorrupted(seed: BuiltinPromptSeed): boolean {
  return [
    seed.config.name,
    seed.config.expectation,
    seed.content,
    seed.change_note,
  ].some(item => typeof item === 'string' && isCorruptedText(item));
}

function normalizeBinding(input?: Partial<PromptBinding>): PromptBinding {
  return {
    workflow: input?.workflow?.trim() || undefined,
    agent: input?.agent?.trim() || undefined,
    tool: input?.tool?.trim() || undefined,
    modelUseCase: input?.modelUseCase?.trim() || undefined,
    promptSource: input?.promptSource,
    status: input?.status,
    contentHash: input?.contentHash?.trim() || undefined,
    inputVariables: Array.isArray(input?.inputVariables) ? input.inputVariables.map(String).filter(Boolean) : undefined,
    outputSchema: input?.outputSchema,
    createdBy: input?.createdBy?.trim() || undefined,
    updatedBy: input?.updatedBy?.trim() || undefined,
    approvalStatus: input?.approvalStatus,
  };
}

function normalizePromptStatus(status: PromptConfig['status'] | undefined): PromptConfig['status'] {
  if (status === 'active' || status === 'draft' || status === 'archived' || status === 'seed' || status === 'fallback' || status === 'disabled' || status === 'not_configured') {
    return status;
  }
  return 'draft';
}

function normalizePromptConfig(input: Partial<PromptConfig> & { id?: string }): PromptConfig {
  const timestamp = nowIso();
  const binding = normalizeBinding(input.binding);
  return {
    id: input.id?.trim() || `prompt-${Date.now()}`,
    key: input.key?.trim() || input.id?.trim(),
    name: input.name?.trim() || '未命名提示词',
    scope: input.scope?.trim() || 'global',
    expectation: input.expectation?.trim() || '',
    status: normalizePromptStatus(input.status),
    current_version: Math.max(1, Math.floor(input.current_version || 1)),
    binding,
    updated_at: input.updated_at?.trim() || timestamp,
    role: input.role?.trim() || binding.agent || undefined,
    priority: typeof input.priority === 'number' ? input.priority : 100,
    model: input.model?.trim() || undefined,
    temperature: typeof input.temperature === 'number' ? input.temperature : undefined,
    response_format: input.response_format === 'json' ? 'json' : input.response_format === 'text' ? 'text' : undefined,
    output_schema: input.output_schema,
    variables: Array.isArray(input.variables) ? input.variables.map(String).filter(Boolean) : undefined,
    prompt_source: input.prompt_source,
    content_hash: input.content_hash?.trim() || undefined,
    input_variables: Array.isArray(input.input_variables) ? input.input_variables.map(String).filter(Boolean) : undefined,
    created_by: input.created_by?.trim() || undefined,
    updated_by: input.updated_by?.trim() || undefined,
    approval_status: input.approval_status || 'not_required',
    visibility: input.visibility && typeof input.visibility === 'object'
      ? {
        main_chat: Array.isArray(input.visibility.main_chat) ? input.visibility.main_chat.map(String).filter(Boolean) : undefined,
        card: Array.isArray(input.visibility.card) ? input.visibility.card.map(String).filter(Boolean) : undefined,
        right_panel: Array.isArray(input.visibility.right_panel) ? input.visibility.right_panel.map(String).filter(Boolean) : undefined,
        internal_only: Array.isArray(input.visibility.internal_only) ? input.visibility.internal_only.map(String).filter(Boolean) : undefined,
      }
      : undefined,
    category: input.category?.trim() || undefined,
    applicable_workflows: Array.isArray(input.applicable_workflows) ? input.applicable_workflows.filter(Boolean) : undefined,
    applicable_agents: Array.isArray(input.applicable_agents) ? input.applicable_agents.filter(Boolean) : undefined,
    applicable_models: Array.isArray(input.applicable_models) ? input.applicable_models.filter(Boolean) : undefined,
    enabled: input.enabled ?? true,
    managed_seed_revision: input.managed_seed_revision?.trim() || undefined,
    managed_seed_hash: input.managed_seed_hash?.trim() || undefined,
    // P0 治理扩展字段
    canonicalId: input.canonicalId?.trim() || undefined,
    aliasIds: Array.isArray(input.aliasIds) ? input.aliasIds.map(String).filter(Boolean) : undefined,
    deprecatedBy: input.deprecatedBy?.trim() || undefined,
    archiveReason: input.archiveReason?.trim() || undefined,
    effectiveStatus: input.effectiveStatus,
    runtimeConsumer: input.runtimeConsumer?.trim() || undefined,
    consumerPath: input.consumerPath?.trim() || undefined,
    required: input.required,
    lastUsedAt: input.lastUsedAt?.trim() || undefined,
    // P4-d: A/B 测试
    ab_test: input.ab_test && typeof input.ab_test === 'object' ? {
      enabled: Boolean(input.ab_test.enabled),
      variant_version: typeof input.ab_test.variant_version === 'number' ? input.ab_test.variant_version : undefined,
      variant_traffic_pct: typeof input.ab_test.variant_traffic_pct === 'number' ? Math.max(0, Math.min(100, input.ab_test.variant_traffic_pct)) : undefined,
      started_at: input.ab_test.started_at?.trim() || undefined,
      metrics: input.ab_test.metrics,
    } : undefined,
  };
}

function normalizeVersion(input: Partial<PromptVersion> & { version: number }): PromptVersion {
  const content = typeof input.content === 'string' ? input.content : '';
  return {
    version: Math.max(1, Math.floor(input.version)),
    content,
    created_at: input.created_at?.trim() || nowIso(),
    author: input.author?.trim() || 'system',
    change_note: input.change_note?.trim() || '',
    content_hash: input.content_hash?.trim() || promptContentHash(content),
  };
}

function defaultPrompts(): PromptStoreFile {
  const generateConfig = normalizePromptConfig({
    id: GENERATE_PROMPT_ID,
    name: '会话标题生成',
    scope: 'conversation_title.generate',
    expectation: '根据用户输入生成简短标题',
    status: 'active',
    current_version: 1,
    binding: { workflow: 'conversation_title' },
    category: 'conversation-title',
    applicable_workflows: ['conversation-title'],
    enabled: true,
  });
  const updateConfig = normalizePromptConfig({
    id: UPDATE_PROMPT_ID,
    name: '会话标题更新',
    scope: 'conversation_title.update',
    expectation: '判断原标题是否需要更新',
    status: 'active',
    current_version: 1,
    binding: { workflow: 'conversation_title' },
    category: 'conversation-title',
    applicable_workflows: ['conversation-title'],
    enabled: true,
  });
  const debuggingRouteConfig = normalizePromptConfig({
    id: DEBUGGING_ROUTE_PROMPT_ID,
    name: '自动联调路由词',
    scope: 'intent_route.debugging',
    expectation: '配置触发自动联调意图的关键词，避免把纯查数问题误分流到联调。',
    status: 'active',
    current_version: 1,
    binding: { workflow: 'routing' },
    category: 'routing',
    applicable_workflows: ['routing'],
    applicable_agents: ['hub'],
    enabled: true,
  });
    return {
      schema_version: 1,
      prompts: [
      {
        config: generateConfig,
        versions: [normalizeVersion({ version: 1, content: DEFAULT_GENERATE_PROMPT, author: 'system', change_note: '系统默认标题生成提示词' })],
      },
      {
        config: updateConfig,
        versions: [normalizeVersion({ version: 1, content: DEFAULT_UPDATE_PROMPT, author: 'system', change_note: '系统默认标题更新提示词' })],
      },
    ],
  };
}

async function readStore(): Promise<PromptStoreFile> {
  if (storeCache) {
    await seedBuiltinPromptCatalogIfMissing();
    return structuredClone(storeCache);
  }

  for (const candidate of [STORE_PATH, BACKUP_PATH]) {
    try {
      const raw = await readFile(candidate, 'utf8');
      const parsed = storeSchema.parse(JSON.parse(raw));
      storeCache = parsed;
      await seedBuiltinPromptCatalogIfMissing();
      return structuredClone(storeCache);
    } catch {
      // try next candidate
    }
  }

  storeCache = defaultPrompts();
  await seedBuiltinPromptCatalogIfMissing();
  return structuredClone(storeCache);
}

async function writeStore(store: PromptStoreFile): Promise<void> {
  storeCache = structuredClone(store);
  if (!SHOULD_PERSIST_STORE) return;

  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  const tempPath = `${STORE_PATH}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`;
  await writeFile(tempPath, `${JSON.stringify(store, null, 2)}\n`, 'utf8');
  try {
    await access(STORE_PATH);
    await rename(STORE_PATH, BACKUP_PATH);
  } catch {
    // no previous file
  }
  try {
    await rename(tempPath, STORE_PATH);
  } catch (error) {
    try {
      await copyFile(BACKUP_PATH, STORE_PATH);
    } catch {
      // ignore
    }
    try {
      await unlink(tempPath);
    } catch {
      // ignore
    }
    throw error;
  }
}

async function updateStore(mutator: (store: PromptStoreFile) => void | Promise<void>): Promise<PromptStoreFile> {
  const next = await readStore();
  await mutator(next);
  writeChain = writeChain.then(() => writeStore(next));
  await writeChain;
  return structuredClone(next);
}

function findRecord(store: PromptStoreFile, id: string): { index: number; record: PromptStoreFile['prompts'][number] } | undefined {
  const index = store.prompts.findIndex(item => item.config.id === id);
  if (index < 0) return undefined;
  return { index, record: store.prompts[index] };
}

function sortVersions(versions: PromptVersion[]): PromptVersion[] {
  return [...versions].sort((a, b) => a.version - b.version);
}

function cloneVersions(versions: PromptVersion[]): PromptVersion[] {
  return sortVersions(versions.map(item => normalizeVersion(item)));
}

async function ensureDynamicRecommendationPrompt(): Promise<void> {
  const store = await readStore();
  if (store.prompts.some((item) => item.config.id === DYNAMIC_RECOMMENDATION_PROMPT_ID)) return;
  await updateStore((next) => {
    if (next.prompts.some((item) => item.config.id === DYNAMIC_RECOMMENDATION_PROMPT_ID)) return;
    next.prompts.unshift({
      config: DYNAMIC_RECOMMENDATION_PROMPT_CONFIG,
      versions: [normalizeVersion({
        version: 1,
        content: DEFAULT_DYNAMIC_RECOMMENDATION_PROMPT,
        author: 'system',
        change_note: '系统默认动态推荐提示词',
      })],
    });
  });
}

export async function listPrompts(filters: { category?: string; status?: string } = {}): Promise<PromptConfig[]> {
  await ensureDynamicRecommendationPrompt();
  const store = await readStore();
  return store.prompts
    .map(item => item.config)
    .filter(item => (
      (!filters.category || item.category === filters.category)
      && (!filters.status || item.status === filters.status)
    ))
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
}

export async function getPrompt(id: string): Promise<PromptConfig | undefined> {
  const store = await readStore();
  return store.prompts.find(item => item.config.id === id)?.config;
}

export async function listPromptVersions(id: string): Promise<PromptVersion[]> {
  const store = await readStore();
  return cloneVersions(store.prompts.find(item => item.config.id === id)?.versions || []);
}

export async function getPromptContent(id: string, fallback: string): Promise<string> {
  if (id === DYNAMIC_RECOMMENDATION_PROMPT_ID) {
    await ensureDynamicRecommendationPrompt();
  }
  const store = await readStore();
  const record = store.prompts.find(item => item.config.id === id);
  if (!record || record.config.enabled === false || record.config.status !== 'active') {
    return fallback;
  }
  const current = record.versions.find(item => item.version === record.config.current_version);
  const latest = sortVersions(record.versions)[record.versions.length - 1];
  return current?.content || latest?.content || fallback;
}

export async function getActivePromptContent(
  scope: string,
  fallback: string,
  intent?: string,
): Promise<PromptResolution> {
  const cacheHit = Boolean(storeCache);
  const store = await readStore();
  const activeRecords = store.prompts.filter((item) => item.config.enabled !== false && item.config.status === 'active');
  const byPriority = (items: typeof activeRecords) => items
    .slice()
    .sort((a, b) => (a.config.priority ?? 100) - (b.config.priority ?? 100));
  const exactRecords = activeRecords.filter((item) => {
    const config = item.config;
    return config.scope === scope || config.id === scope || config.key === scope || config.binding.workflow === scope;
  });
  if (exactRecords.length > 1) {
    return {
      content: fallback,
      source: 'conflict',
      fallback: true,
      cache_hit: cacheHit,
      match_strategy: 'exact_scope_or_id',
      conflicts: [{ reason: 'PROMPT_CONFLICT_EXACT', prompt_ids: exactRecords.map(item => item.config.id) }],
    };
  }
  const exactRecord = exactRecords[0];
  const fallbackRecords = activeRecords.filter((item) => {
    const config = item.config;
    if (intent && config.scope === intent) return true;
    return Boolean(intent && config.applicable_workflows?.includes(intent));
  });
  const record = exactRecord || byPriority(fallbackRecords)[0];
  if (!record) {
    return {
      content: fallback,
      source: 'builtin_fallback',
      fallback: true,
      cache_hit: cacheHit,
      match_strategy: 'fallback',
      conflicts: [],
    };
  }
  const current = record.versions.find(item => item.version === record.config.current_version);
  const latest = sortVersions(record.versions)[record.versions.length - 1];
  return {
    content: current?.content || latest?.content || fallback,
    prompt: record.config,
    source: exactRecord ? 'exact' : 'intent_fallback',
    fallback: !exactRecord,
    cache_hit: cacheHit,
    match_strategy: exactRecord ? 'exact_scope_or_id' : 'intent_or_workflow_fallback',
    conflicts: fallbackRecords.length > 1 && !exactRecord
      ? [{ reason: 'PROMPT_MULTIPLE_FALLBACK_CANDIDATES', prompt_ids: fallbackRecords.map(item => item.config.id) }]
      : [],
  };
}

export async function createPrompt(input: Partial<PromptConfig> & { content?: string; change_note?: string; author?: string }): Promise<PromptConfig> {
  const content = input.content?.trim() || input.expectation?.trim() || '';
  const prompt = normalizePromptConfig(input);
  const version = normalizeVersion({
    version: 1,
    content,
    author: input.author || 'system',
    change_note: input.change_note || '创建提示词',
  });

  await updateStore((store) => {
    store.prompts.unshift({
      config: prompt,
      versions: [version],
    });
  });

  return prompt;
}

export async function updatePrompt(id: string, input: Partial<PromptConfig> & { content?: string; change_note?: string; author?: string }): Promise<PromptConfig | undefined> {
  let updated: PromptConfig | undefined;
  await updateStore((store) => {
    const found = findRecord(store, id);
    if (!found) return;

    const nextConfig = normalizePromptConfig({
      ...found.record.config,
      ...input,
      id,
      binding: normalizeBinding(input.binding ?? found.record.config.binding),
      current_version: found.record.config.current_version,
      updated_at: nowIso(),
    });
    const nextVersions = cloneVersions(found.record.versions);
    const hasContent = typeof input.content === 'string' && input.content.trim().length > 0;
    if (hasContent) {
      const nextVersionNumber = (nextVersions[nextVersions.length - 1]?.version || 0) + 1;
      nextVersions.push(normalizeVersion({
        version: nextVersionNumber,
        content: input.content,
        author: input.author || 'system',
        change_note: input.change_note || '更新提示词',
      }));
      nextConfig.current_version = nextVersionNumber;
    }
    const nextRecord = { config: nextConfig, versions: nextVersions };
    store.prompts[found.index] = nextRecord;
    updated = nextConfig;
  });
  return updated;
}

export async function updatePromptBinding(id: string, input: Partial<PromptBinding>): Promise<PromptBinding | undefined> {
  let updated: PromptBinding | undefined;
  await updateStore((store) => {
    const found = findRecord(store, id);
    if (!found) return;
    const nextConfig = normalizePromptConfig({
      ...found.record.config,
      binding: normalizeBinding({ ...found.record.config.binding, ...input }),
      updated_at: nowIso(),
      id,
    });
    store.prompts[found.index] = {
      config: nextConfig,
      versions: found.record.versions,
    };
    updated = nextConfig.binding;
  });
  return updated;
}

export async function rollbackPrompt(id: string, version: number): Promise<PromptConfig | undefined> {
  let updated: PromptConfig | undefined;
  await updateStore((store) => {
    const found = findRecord(store, id);
    if (!found) return;
    const targetVersion = found.record.versions.find((item) => item.version === version);
    if (!targetVersion) return;

    const nextConfig = normalizePromptConfig({
      ...found.record.config,
      current_version: targetVersion.version,
      updated_at: nowIso(),
      id,
    });
    nextConfig.status = 'active';
    store.prompts[found.index] = {
      config: nextConfig,
      versions: cloneVersions(found.record.versions),
    };
    updated = nextConfig;
  });
  return updated;
}

export async function seedPromptContentIfMissing(): Promise<void> {
  const store = await readStore();
  if (store.prompts.length > 0) return;
  await writeStore(defaultPrompts());
}

const LEGACY_DEMO_PROMPT_IDS = new Set([
  'prompt_001',
  'prompt-001',
  'prompt_002',
  'prompt-002',
  'prompt_003',
  'prompt-003',
  'prompt_004',
  'prompt-004',
  'prompt_005',
  'prompt-005',
]);

const TRUSTED_MANAGED_PROMPT_IDS = new Set(MANAGED_RUNTIME_PROMPT_SEEDS.map(seed => seed.config.id));

function applyPromptCatalogMigrations(store: PromptStoreFile): boolean {
  let changed = false;
  const managedSeedById = new Map(
    [...LAYER_PROMPT_SEEDS, ...REPORT_QUERY_PROMPT_SEEDS, ...PRODUCTION_PROMPT_SEEDS]
      .map(applyPromptSeedOverrides)
      .filter(seed => !isPromptSeedCorrupted(seed))
      .map(seed => [seed.config.id, seed] as const),
  );
  for (const seed of MANAGED_RUNTIME_PROMPT_SEEDS.map(applyPromptSeedOverrides)) {
    assertSeedIsUtf8(seed);
    managedSeedById.set(seed.config.id, seed);
  }
  for (const record of store.prompts) {
    const config = record.config;
    if (!config.key) {
      config.key = config.id;
      changed = true;
    }
    if (!config.role && config.binding.agent) {
      config.role = config.binding.agent;
      changed = true;
    }
    if (typeof config.priority !== 'number') {
      config.priority = 100;
      changed = true;
    }
    if (!Array.isArray(config.variables)) {
      config.variables = [];
      changed = true;
    }
    if (!config.visibility) {
      config.visibility = {
        main_chat: ['answer_markdown', 'visualizations'],
        card: ['visualizations'],
        right_panel: ['evidence_bundle', 'execution_context', 'prompt_config'],
        internal_only: ['raw_prompt', 'secrets', 'tokens'],
      };
      changed = true;
    }
    if (!config.output_schema && (config.scope.includes('summary') || config.scope.includes('actions') || config.scope.includes('visual') || config.scope.includes('evidence'))) {
      config.output_schema = { type: 'json', strict: false };
      changed = true;
    }
    if (LEGACY_DEMO_PROMPT_IDS.has(config.id) && (config.status !== 'archived' || config.enabled !== false)) {
      config.status = 'archived';
      config.enabled = false;
      config.updated_at = nowIso();
      changed = true;
    }
    if (config.id === DEBUGGING_ROUTE_PROMPT_ID) {
      const nextScope = 'intent_route.debugging';
      const nextWorkflow = 'intent_route.debugging';
      const nextWorkflows = ['debugging', 'intent_route.debugging'];
      if (
        config.scope !== nextScope
        || config.binding.workflow !== nextWorkflow
        || JSON.stringify(config.applicable_workflows || []) !== JSON.stringify(nextWorkflows)
      ) {
        config.scope = nextScope;
        config.binding = normalizeBinding({ ...config.binding, workflow: nextWorkflow });
        config.applicable_workflows = nextWorkflows;
        config.updated_at = nowIso();
        changed = true;
      }
    }
    const managedSeed = managedSeedById.get(config.id);
    if (managedSeed) {
      const previousManagedSeedRevision = config.managed_seed_revision;
      const seedHash = promptContentHash(managedSeed.content);
      const seedConfig = normalizePromptConfig({
        ...managedSeed.config,
        current_version: config.current_version,
        updated_at: config.updated_at,
        managed_seed_revision: managedSeed.seed_revision,
        managed_seed_hash: seedHash,
      });
      const configFieldNames: Array<keyof PromptConfig> = [
        'key',
        'name',
        'scope',
        'expectation',
        'binding',
        'category',
        'applicable_workflows',
        'applicable_agents',
        'visibility',
        'output_schema',
        'managed_seed_revision',
        'managed_seed_hash',
      ];
      for (const fieldName of configFieldNames) {
        const currentValue = config[fieldName];
        const seedValue = seedConfig[fieldName];
        if (seedValue === undefined) continue;
        const currentText = typeof currentValue === 'string' ? currentValue : JSON.stringify(currentValue ?? null);
        if (
          currentValue === undefined
          || isCorruptedText(currentText)
          || fieldName === 'managed_seed_revision'
          || fieldName === 'managed_seed_hash'
        ) {
          if (JSON.stringify(currentValue ?? null) !== JSON.stringify(seedValue)) {
            (config as Record<string, unknown>)[fieldName] = seedValue;
            changed = true;
          }
        }
      }
      const current = record.versions.find(item => item.version === config.current_version);
      const currentContent = current?.content || '';
      const currentHash = currentContent ? promptContentHash(currentContent) : '';
      if (currentHash === seedHash) {
        if (config.managed_seed_hash !== seedHash || config.managed_seed_revision !== managedSeed.seed_revision) {
          config.managed_seed_hash = seedHash;
          config.managed_seed_revision = managedSeed.seed_revision;
          changed = true;
        }
      } else if (
        !currentContent
        || isCorruptedText(currentContent)
        || previousManagedSeedRevision !== managedSeed.seed_revision
        || (config.managed_seed_hash === seedHash && currentHash !== seedHash)
      ) {
        const nextVersion = Math.max(config.current_version, ...record.versions.map(item => item.version)) + 1;
        config.current_version = nextVersion;
        config.updated_at = nowIso();
        config.managed_seed_revision = managedSeed.seed_revision;
        config.managed_seed_hash = seedHash;
        record.versions.push(normalizeVersion({
          version: nextVersion,
          content: managedSeed.content,
          author: managedSeed.author || 'system',
          change_note: managedSeed.change_note || '修复为可信 UTF-8 中文提示词',
        }));
        changed = true;
      }
    }
  }

  // P0 治理：标记有运行时消费者的提示词
  for (const record of store.prompts) {
    const config = record.config;
    const consumer = getRuntimeConsumer(config.id);
    if (consumer && config.effectiveStatus !== consumer.category) {
      config.effectiveStatus = consumer.category;
      config.runtimeConsumer = consumer.consumer;
      config.consumerPath = consumer.consumerFile;
      config.required = consumer.category === 'active_runtime' || consumer.category === 'hardcoded_to_managed';
      changed = true;
    }
    // P1-#1: 有 active_runtime 消费者但被错误归档的提示词（如业务流提示词）自动激活
    if (consumer?.category === 'active_runtime' && (config.status === 'archived' || config.enabled === false)) {
      config.status = 'active';
      config.enabled = true;
      config.updated_at = nowIso();
      changed = true;
    }
  }

  // P0 治理：标记幽灵提示词（无运行时消费者）为 archived_ghost
  for (const record of store.prompts) {
    const config = record.config;
    if (isGhostPrompt(config.id)) {
      const ghostInfo = GHOST_TO_RUNTIME_MAP[config.id];
      if (ghostInfo) {
        if (
          config.status !== 'archived'
          || config.enabled !== false
          || config.deprecatedBy !== ghostInfo.deprecatedBy
          || config.archiveReason !== ghostInfo.archiveReason
          || config.effectiveStatus !== 'archived_ghost'
        ) {
          config.status = 'archived';
          config.enabled = false;
          config.deprecatedBy = ghostInfo.deprecatedBy;
          config.archiveReason = ghostInfo.archiveReason;
          config.effectiveStatus = 'archived_ghost';
          config.updated_at = nowIso();
          changed = true;
        }
      } else if (config.effectiveStatus !== 'archived_ghost') {
        // 未在 GHOST_TO_RUNTIME_MAP 中但有明确 ghost 身份的（如遗留 demo）
        if (config.status !== 'archived' || config.enabled !== false) {
          config.status = 'archived';
          config.enabled = false;
          config.updated_at = nowIso();
          changed = true;
        }
        config.effectiveStatus = 'archived_ghost';
      }
    }
  }

  return changed;
}

const BUILTIN_PROMPT_SEEDS: BuiltinPromptSeed[] = ([
  ...MANAGED_RUNTIME_PROMPT_SEEDS,
  ...LAYER_PROMPT_SEEDS,
  ...REPORT_QUERY_PROMPT_SEEDS,
  ...PRODUCTION_PROMPT_SEEDS,
  {
    config: {
      id: 'prompt_001',
      name: '路由判断提示词',
      scope: 'routing',
      expectation: '准确识别四类业务意图',
      status: 'active',
      current_version: 3,
      binding: { workflow: 'routing' },
      category: '路由',
      applicable_workflows: ['routing'],
      applicable_agents: ['hub'],
      applicable_models: ['gpt-4o'],
      enabled: true,
    },
    content: '你是小乔路由判断模块。根据用户输入，判断业务相关性、业务域、意图类型、工作流层级，以及是否需要追问。输出 JSON。',
    author: '产品经理',
    change_note: '初始化路由判断提示词',
  },
  {
    config: {
      id: 'prompt_002',
      name: '使用帮助提示词',
      scope: 'help',
      expectation: '提供准确的指标解释与系统路径',
      status: 'active',
      current_version: 5,
      binding: { workflow: 'help' },
      category: '业务流',
      applicable_workflows: ['help'],
      applicable_agents: ['help'],
      applicable_models: ['gpt-4o'],
      enabled: true,
    },
    content: '你是小乔帮助模块。用户询问指标含义、系统路径或规则时，输出定义说明、入口路径、引用来源、不确定性表达和下一步建议。',
    author: '产品经理',
    change_note: '初始化使用帮助提示词',
  },
  {
    config: {
      id: 'prompt_003',
      name: '排查分析提示词',
      scope: 'diagnosis',
      expectation: '输出结构化证据链与结论',
      status: 'active',
      current_version: 4,
      binding: { workflow: 'diagnosis' },
      category: '业务流',
      applicable_workflows: ['diagnosis'],
      applicable_agents: ['diagnosis'],
      applicable_models: ['gpt-4o'],
      enabled: true,
    },
    content: '你是小乔排查模块。遇到异常、错误、延迟、回传失败等问题时，输出问题类型、影响范围、证据、结论、置信度和下一步动作。',
    author: '产品经理',
    change_note: '初始化排查分析提示词',
  },
  {
    config: {
      id: 'prompt_004',
      name: '需求沟通提示词',
      scope: 'demand',
      expectation: '结构化需求单并追问缺失字段',
      status: 'active',
      current_version: 2,
      binding: { workflow: 'demand' },
      category: '业务流',
      applicable_workflows: ['demand'],
      applicable_agents: ['demand'],
      applicable_models: ['gpt-4o'],
      enabled: true,
    },
    content: '你是小乔需求沟通模块。提取需求目标、对象、范围、时间和约束，标记缺失字段，生成追问和协作建议。',
    author: '产品经理',
    change_note: '初始化需求沟通提示词',
  },
  {
    config: {
      id: 'prompt_005',
      name: '联调执行提示词',
      scope: 'debugging',
      expectation: '按步骤执行联调流程',
      status: 'draft',
      current_version: 1,
      binding: { workflow: 'debugging' },
      category: '业务流',
      applicable_workflows: ['debugging'],
      applicable_agents: ['debugging'],
      applicable_models: ['gpt-4o'],
      enabled: false,
    },
    content: '你是小乔联调执行模块。按步骤执行联调检查，记录状态、证据和阻塞原因，不要跳过必要步骤。',
    author: '产品经理',
    change_note: '初始化联调执行提示词',
  },
  {
    config: {
      id: 'prompt_006',
      name: '追问补全提示词',
      scope: 'clarification',
      expectation: '识别缺失字段并生成追问',
      status: 'active',
      current_version: 3,
      binding: { tool: 'clarification_service' },
      category: '支撑',
      applicable_workflows: ['routing'],
      applicable_agents: ['hub'],
      applicable_models: ['gpt-4o-mini'],
      enabled: true,
    },
    content: '你是小乔追问补全模块。识别缺失字段，选择最关键的一个问题追问，尽量减少用户重复表达。',
    author: '产品经理',
    change_note: '初始化追问补全提示词',
  },
  {
    config: {
      id: 'prompt-001',
      name: '路由判断 Prompt',
      scope: 'routing',
      expectation: '判断用户消息业务意图和路由',
      status: 'active',
      current_version: 3,
      binding: { workflow: 'all' },
      category: 'routing',
      applicable_workflows: ['help', 'demand', 'diagnosis', 'debugging'],
      enabled: true,
    },
    content: '判断用户消息的业务意图，识别帮助、需求、排查和联调四类路径，并给出是否追问的建议。',
    author: '系统',
    change_note: '初始化路由判断 Prompt',
  },
  {
    config: {
      id: 'prompt-002',
      name: '使用帮助 Prompt',
      scope: 'help',
      expectation: '生成使用帮助类回答',
      status: 'active',
      current_version: 2,
      binding: { workflow: 'help' },
      category: 'help',
      applicable_workflows: ['help'],
      enabled: true,
    },
    content: '当用户询问指标、定义、入口或规则时，生成简洁、准确、可引用的帮助类回答。',
    author: '系统',
    change_note: '初始化使用帮助 Prompt',
  },
  {
    config: {
      id: 'prompt-003',
      name: '问题排查 Prompt',
      scope: 'diagnosis',
      expectation: '引导排查流程和证据收集',
      status: 'active',
      current_version: 4,
      binding: { workflow: 'diagnosis' },
      category: 'diagnosis',
      applicable_workflows: ['diagnosis'],
      enabled: true,
    },
    content: '当用户描述异常、失败、延迟或波动时，优先收集证据、界定范围、给出结论和下一步动作。',
    author: '系统',
    change_note: '初始化问题排查 Prompt',
  },
  {
    config: {
      id: 'prompt-004',
      name: '需求沟通 Prompt',
      scope: 'demand',
      expectation: '需求结构化和缺失字段补全',
      status: 'active',
      current_version: 1,
      binding: { workflow: 'demand' },
      category: 'demand',
      applicable_workflows: ['demand'],
      enabled: true,
    },
    content: '当用户提出新需求时，结构化成需求记录，标记缺失字段，并给出下一步协作建议。',
    author: '系统',
    change_note: '初始化需求沟通 Prompt',
  },
  {
    config: {
      id: 'prompt-005',
      name: '联调执行 Prompt',
      scope: 'debugging',
      expectation: '自动联调执行指令',
      status: 'draft',
      current_version: 2,
      binding: { workflow: 'debugging' },
      category: 'debugging',
      applicable_workflows: ['debugging'],
      enabled: false,
    },
    content: '当用户明确要求联调、回传验证或调试时，按步骤执行联调流程并记录结果。',
    author: '系统',
    change_note: '初始化联调执行 Prompt',
  },
  {
    config: {
      id: 'conversation-title-generate',
      name: '会话标题生成 Prompt',
      scope: 'conversation-title.generate',
      expectation: '根据首轮消息生成投放分析类会话标题',
      status: 'active',
      current_version: 1,
      binding: { workflow: 'conversation_title', agent: 'title-generate' },
      category: 'title',
      applicable_workflows: ['conversation_title'],
      applicable_agents: ['title-generate'],
      enabled: true,
    },
    content: DEFAULT_GENERATE_PROMPT,
    author: 'system',
    change_note: '初始化会话标题生成 Prompt',
  },
  {
    config: {
      id: 'conversation-title-update',
      name: '会话标题更新 Prompt',
      scope: 'conversation-title.update',
      expectation: '根据当前标题和最近消息稳定更新会话标题',
      status: 'active',
      current_version: 1,
      binding: { workflow: 'conversation_title', agent: 'title-update' },
      category: 'title',
      applicable_workflows: ['conversation_title'],
      applicable_agents: ['title-update'],
      enabled: true,
    },
    content: DEFAULT_UPDATE_PROMPT,
    author: 'system',
    change_note: '初始化会话标题更新 Prompt',
  },
  {
    config: {
      id: 'prompt-delivery-packages',
      name: '投放包交付 Prompt',
      scope: 'delivery',
      expectation: '识别可交付包、分包准备、审核状态、联调证据和阻塞原因',
      status: 'active',
      current_version: 1,
      binding: { workflow: 'delivery_workflow' },
      category: 'delivery',
      applicable_workflows: ['get_delivery_packages', 'delivery_workflow'],
      applicable_agents: ['delivery'],
      applicable_models: ['gpt-4o'],
      enabled: true,
    },
    content: '识别当前投放包是否可交付，输出分包准备、审核状态、联调证据和阻塞原因。',
    author: 'system',
    change_note: '初始化投放包交付 Prompt',
  },
  {
    config: {
      id: 'intent-route-debugging-terms',
      name: '自动联调触发词 Prompt',
      scope: 'routing',
      expectation: '定义自动联调触发词，避免查数误分流',
      status: 'active',
      current_version: 1,
      binding: { workflow: 'routing' },
      category: 'routing',
      applicable_workflows: ['routing'],
      applicable_agents: ['hub'],
      enabled: true,
    },
    content: '自动联调只允许联调、扫码联调、回传验证、调试、测试等明确语义触发，不要把媒体名称单独当成联调触发词。',
    author: 'system',
    change_note: '初始化自动联调触发词 Prompt',
  },
] as BuiltinPromptSeed[]).map(applyPromptSeedOverrides);

export async function seedBuiltinPromptCatalogIfMissing(): Promise<void> {
  if (!storeCache) {
    return;
  }
  const existingIds = new Set(storeCache.prompts.map(item => item.config.id));
  const missing = BUILTIN_PROMPT_SEEDS.filter(item => !existingIds.has(item.config.id));
  for (const seed of missing) {
    if (existingIds.has(seed.config.id)) continue;
    if (TRUSTED_MANAGED_PROMPT_IDS.has(seed.config.id)) {
      assertSeedIsUtf8(seed);
    } else if (isPromptSeedCorrupted(seed)) {
      continue;
    }
    const config = normalizePromptConfig(seed.config);
    const version = normalizeVersion({
      version: config.current_version,
      content: seed.content,
      author: seed.author || 'system',
      change_note: seed.change_note || '初始化提示词',
    });
    storeCache.prompts.push({
      config,
      versions: [version],
    });
    existingIds.add(config.id);
  }
  const migrated = applyPromptCatalogMigrations(storeCache);
  if (missing.length === 0 && !migrated) {
    return;
  }
  await writeStore(storeCache);
}

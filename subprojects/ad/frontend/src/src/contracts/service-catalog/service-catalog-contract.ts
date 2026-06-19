/**
 * Service Catalog — 服务目录契约
 *
 * 统一的服务类型定义，替代散落在 route-decision-contract 和 planner-plan-contract 中的
 * ServiceIntent / PlannerServiceIntent 枚举。
 *
 * 设计原则：
 * 1. 服务类型（ServiceType）是产品级概念，表示系统能向用户提供什么服务
 * 2. 每种服务有明确的输入契约、前置条件、依赖能力、可生成产物
 * 3. 服务类型按服务族（ServiceFamily）分组，便于管理和路由
 * 4. ServiceIntent / PlannerServiceIntent 应逐步迁移到本枚举
 */

// ─── Service Family（服务族）─────────────────────────────

export const SERVICE_FAMILIES = [
  'data',           // 数据服务：查数、聚合分析
  'report',         // 报表服务：拼表、报表生成
  'troubleshoot',   // 排查服务：数据排查、配置排查、排查解答
  'diagnosis',      // 诊断服务：ROI 诊断、效果诊断
  'delivery',       // 交付服务：取包、联调
  'creative',       // 创意服务：创意数据、创意分析
  'requirement',    // 需求服务：需求收集、可实现性确认
  'assist',         // 协助服务：使用协助、知识问答
  'automation',     // 自动化服务：定时任务、监控
  'chat',           // 通用对话
] as const;
export type ServiceFamily = typeof SERVICE_FAMILIES[number];

// ─── Service Type（服务类型）────────────────────────────

export const SERVICE_TYPES = [
  // 数据服务
  'data_query',                    // 自然语言查数
  'aggregate_analysis',            // 标签聚合分析

  // 报表服务
  'join_table_report',             // 拼表生成报表

  // 排查服务
  'data_issue_diagnosis',          // 数据问题排查（无数据、对不上、归因不到）
  'config_issue_diagnosis',        // 配置问题排查（没配、配错）
  'troubleshooting_answer',        // 排查解答（生成可复制的业务回复）

  // 诊断服务
  'roi_diagnosis',                 // ROI 下降诊断
  'creative_diagnosis',            // 创意效果诊断

  // 交付服务
  'package_fetch',                 // 获取包信息（包列表、详情、下载地址）
  'integration_workflow',          // 联调 workflow（触发、步骤执行、截图日志）

  // 创意服务
  'creative_data_query',           // 创意数据查询
  'creative_analysis',             // 创意效果分析

  // 需求服务
  'requirement_draft',             // 需求草稿
  'feasibility_check',             // 可实现性确认

  // 协助服务
  'current_usage_assist',          // 使用协助（怎么看、什么意思、路径导航）
  'field_definition',              // 字段/指标定义
  'knowledge_answer',              // 知识库问答

  // 自动化服务
  'automation_task',               // 自动化任务（定时查数、异常监控）

  // 通用
  'general_chat',                  // 通用对话
  'clarification',                 // 澄清（最小必要追问）
] as const;
export type ServiceType = typeof SERVICE_TYPES[number];

// ─── Service Family Mapping ────────────────────────────

export const SERVICE_TYPE_FAMILY: Record<ServiceType, ServiceFamily> = {
  // 数据服务
  data_query: 'data',
  aggregate_analysis: 'data',

  // 报表服务
  join_table_report: 'report',

  // 排查服务
  data_issue_diagnosis: 'troubleshoot',
  config_issue_diagnosis: 'troubleshoot',
  troubleshooting_answer: 'troubleshoot',

  // 诊断服务
  roi_diagnosis: 'diagnosis',
  creative_diagnosis: 'diagnosis',

  // 交付服务
  package_fetch: 'delivery',
  integration_workflow: 'delivery',

  // 创意服务
  creative_data_query: 'creative',
  creative_analysis: 'creative',

  // 需求服务
  requirement_draft: 'requirement',
  feasibility_check: 'requirement',

  // 协助服务
  current_usage_assist: 'assist',
  field_definition: 'assist',
  knowledge_answer: 'assist',

  // 自动化服务
  automation_task: 'automation',

  // 通用
  general_chat: 'chat',
  clarification: 'chat',
};

// ─── Service Input Contract ────────────────────────────

/**
 * 服务输入契约：启动该服务所需的参数
 */
export interface ServiceInputContract {
  /** 必填参数 */
  required: string[];
  /** 可选参数 */
  optional: string[];
  /** 参数说明 */
  descriptions: Record<string, string>;
}

// ─── Service Definition ────────────────────────────────

/**
 * 服务定义：描述一个服务类型的完整规格
 */
export interface ServiceDefinition {
  /** 服务类型 */
  type: ServiceType;
  /** 显示名称 */
  displayName: string;
  /** 一句话描述 */
  description: string;
  /** 所属服务族 */
  family: ServiceFamily;
  /** 输入契约 */
  input: ServiceInputContract;
  /** 前置条件（需要哪些上下文就绪） */
  preconditions: string[];
  /** 依赖的 capability ID 列表 */
  requiredCapabilities: string[];
  /** 可选依赖的 capability ID 列表 */
  optionalCapabilities: string[];
  /** 可生成的产物类型 */
  deliverables: ServiceDeliverable[];
  /** 澄清策略 */
  clarificationPolicy: ClarificationPolicy;
  /** 是否需要用户确认才能执行 */
  requiresConfirmation: boolean;
  /** 是否只读（不改变系统状态） */
  readOnly: boolean;
  /** 用户常见说法示例 */
  exampleUtterances: string[];
}

export interface ServiceDiscoveryHint {
  terms: string[];
  weight: number;
  source: 'service_catalog_seed';
  governance: {
    owner: 'service_catalog';
    exitCondition: string;
  };
}

export const SERVICE_DISCOVERY_HINTS: Partial<Record<ServiceType, ServiceDiscoveryHint[]>> = {
  data_query: [
    { terms: ['消耗', '激活', 'ROI', 'ROAS', '收入', '付费', '注册', '留存', '次留', 'ARPU', '数据', '查数', '看数据'], weight: 0.8, source: 'service_catalog_seed', governance: { owner: 'service_catalog', exitCondition: '由 capability manifest / planner candidate 提供同等召回后移除词表触发。' } },
  ],
  aggregate_analysis: [
    { terms: ['对比', '排名', '排序', 'TOP', '最高', '最低', '分布', '趋势', '分析'], weight: 0.7, source: 'service_catalog_seed', governance: { owner: 'service_catalog', exitCondition: '由分析服务 manifest 的 task/action metadata 覆盖后移除。' } },
  ],
  join_table_report: [
    { terms: ['拼表', '报表', '导出', 'Excel', 'CSV', '模板'], weight: 0.9, source: 'service_catalog_seed', governance: { owner: 'service_catalog', exitCondition: '由报表服务 manifest 与文件输入契约覆盖后移除。' } },
  ],
  data_issue_diagnosis: [
    { terms: ['为什么没数据', '对不上', '数据不准', '归因不到', '回传缺失', '没有数据'], weight: 0.85, source: 'service_catalog_seed', governance: { owner: 'service_catalog', exitCondition: '由诊断 capability manifest 覆盖后移除。' } },
  ],
  config_issue_diagnosis: [
    { terms: ['没配', '配错', '配置问题', 'SDK参数'], weight: 0.85, source: 'service_catalog_seed', governance: { owner: 'service_catalog', exitCondition: '由配置排查 manifest 覆盖后移除。' } },
  ],
  troubleshooting_answer: [
    { terms: ['回复业务方', '怎么解释', '排查结论'], weight: 0.8, source: 'service_catalog_seed', governance: { owner: 'service_catalog', exitCondition: '由回复草稿服务 manifest 覆盖后移除。' } },
  ],
  roi_diagnosis: [
    { terms: ['ROI下降', '消耗涨了', '效果变差', '诊断'], weight: 0.8, source: 'service_catalog_seed', governance: { owner: 'service_catalog', exitCondition: '由效果诊断 manifest 覆盖后移除。' } },
  ],
  creative_diagnosis: [
    { terms: ['创意效果', '素材表现', '创意诊断'], weight: 0.8, source: 'service_catalog_seed', governance: { owner: 'service_catalog', exitCondition: '由创意诊断 manifest 覆盖后移除。' } },
  ],
  package_fetch: [
    { terms: ['包', '联调包', '渠道包', '下载地址', '包状态'], weight: 0.9, source: 'service_catalog_seed', governance: { owner: 'service_catalog', exitCondition: '由包交付 skill contract 与 capability manifest 覆盖后移除。' } },
  ],
  integration_workflow: [
    { terms: ['联调', '触发联调', '联调状态', '联调失败'], weight: 0.9, source: 'service_catalog_seed', governance: { owner: 'service_catalog', exitCondition: '由联调 workflow manifest 覆盖后移除。' } },
  ],
  creative_data_query: [
    { terms: ['创意数据', '素材数据', '创意维度'], weight: 0.8, source: 'service_catalog_seed', governance: { owner: 'service_catalog', exitCondition: '由创意数据 manifest 覆盖后移除。' } },
  ],
  creative_analysis: [
    { terms: ['创意追踪', '标签表现', '异常创意'], weight: 0.7, source: 'service_catalog_seed', governance: { owner: 'service_catalog', exitCondition: '由创意分析 manifest 覆盖后移除。' } },
  ],
  requirement_draft: [
    { terms: ['提需求', '能不能加', '需要改', '需求单'], weight: 0.8, source: 'service_catalog_seed', governance: { owner: 'service_catalog', exitCondition: '由需求服务 manifest 覆盖后移除。' } },
  ],
  feasibility_check: [
    { terms: ['能做吗', '支持吗', '可实现', '智投能不能'], weight: 0.8, source: 'service_catalog_seed', governance: { owner: 'service_catalog', exitCondition: '由可行性服务 manifest 覆盖后移除。' } },
  ],
  current_usage_assist: [
    { terms: ['怎么看', '什么意思', '路径在哪', '怎么用'], weight: 0.7, source: 'service_catalog_seed', governance: { owner: 'service_catalog', exitCondition: '由帮助能力 manifest 覆盖后移除。' } },
  ],
  field_definition: [
    { terms: ['字段', '指标口径', '定义'], weight: 0.8, source: 'service_catalog_seed', governance: { owner: 'service_catalog', exitCondition: '由字段字典 capability manifest 覆盖后移除。' } },
  ],
  knowledge_answer: [
    { terms: ['规则', '怎么接入', '广告规则'], weight: 0.7, source: 'service_catalog_seed', governance: { owner: 'service_catalog', exitCondition: '由知识源 policy 覆盖后移除。' } },
  ],
  automation_task: [
    { terms: ['定时', '每天', '监控', '异常提醒', '自动化'], weight: 0.8, source: 'service_catalog_seed', governance: { owner: 'service_catalog', exitCondition: '由自动化服务 manifest 覆盖后移除。' } },
  ],
};

// ─── Service Deliverable ───────────────────────────────

export type ServiceDeliverable =
  | 'chat_answer'           // 文本回答
  | 'data_table'            // 数据表格
  | 'chart'                 // 图表
  | 'report_file'           // 报表文件（Excel/CSV）
  | 'diagnosis_result'      // 排查/诊断结论
  | 'reply_draft'           // 业务回复草稿
  | 'requirement_draft'     // 需求草稿
  | 'package_info'          // 包信息
  | 'workflow_trace'        // 联调过程轨迹
  | 'task_created';         // 已创建任务

// ─── Clarification Policy ──────────────────────────────

export type ClarificationPolicy =
  | 'ask_first'             // 缺信息先追问，不猜测
  | 'answer_with_caveat'    // 先回答，注明假设
  | 'auto_resolve'          // 自动用默认值填充
  | 'propose_options';      // 提供多个可选方案

// ─── Built-in Service Definitions ──────────────────────

/**
 * 内置服务定义。
 * 新增服务类型时在此处添加定义。
 */
export const BUILTIN_SERVICE_DEFINITIONS: Record<ServiceType, ServiceDefinition> = {
  // ─── 数据服务 ────────────────────────────────────────
  data_query: {
    type: 'data_query',
    displayName: '数据查询',
    description: '自然语言查询广告核心指标（消耗、激活、ROI、留存等）',
    family: 'data',
    input: {
      required: ['project_id'],
      optional: ['metrics', 'dimensions', 'time_range', 'filters'],
      descriptions: {
        project_id: '项目 ID（从当前项目上下文获取）',
        metrics: '要查询的指标列表',
        dimensions: '拆分维度列表',
        time_range: '时间范围',
        filters: '过滤条件',
      },
    },
    preconditions: ['user_authenticated', 'project_selected'],
    requiredCapabilities: ['report_execution'],
    optionalCapabilities: ['dictionary_lookup'],
    deliverables: ['data_table', 'chart'],
    clarificationPolicy: 'answer_with_caveat',
    requiresConfirmation: false,
    readOnly: true,
    exampleUtterances: ['昨天消耗多少', '看下近 7 天 ROI', '按媒体拆激活数据'],
  },

  aggregate_analysis: {
    type: 'aggregate_analysis',
    displayName: '聚合分析',
    description: '围绕项目、媒体、渠道、终端、创意标签等做聚合、排序、对比和趋势分析',
    family: 'data',
    input: {
      required: ['project_id', 'analysis_type'],
      optional: ['metrics', 'dimensions', 'time_range', 'comparison_range'],
      descriptions: {
        analysis_type: '分析类型：ranking / comparison / trend / distribution',
      },
    },
    preconditions: ['user_authenticated', 'project_selected'],
    requiredCapabilities: ['report_execution'],
    optionalCapabilities: ['dictionary_lookup'],
    deliverables: ['data_table', 'chart', 'chat_answer'],
    clarificationPolicy: 'answer_with_caveat',
    requiresConfirmation: false,
    readOnly: true,
    exampleUtterances: ['哪个渠道 ROI 最高', '对比上周和本周', '看素材标签效果分布'],
  },

  // ─── 报表服务 ────────────────────────────────────────
  join_table_report: {
    type: 'join_table_report',
    displayName: '拼表生成报表',
    description: '支持 Excel/CSV/模板上传，完成字段识别、模板取数、多表拼接和报表生成',
    family: 'report',
    input: {
      required: ['files'],
      optional: ['template_id', 'join_keys', 'output_format'],
      descriptions: {
        files: '上传的文件列表（Excel/CSV）',
        template_id: '报表模板 ID',
        join_keys: '多表关联键',
        output_format: '输出格式：xlsx / csv',
      },
    },
    preconditions: ['user_authenticated', 'files_uploaded'],
    requiredCapabilities: ['file_data_extraction'],
    optionalCapabilities: ['report_generate'],
    deliverables: ['report_file'],
    clarificationPolicy: 'ask_first',
    requiresConfirmation: true,
    readOnly: false,
    exampleUtterances: ['按这个模板生成报表', '帮我把这两个表拼起来', '导出 Excel'],
  },

  // ─── 排查服务 ────────────────────────────────────────
  data_issue_diagnosis: {
    type: 'data_issue_diagnosis',
    displayName: '数据问题排查',
    description: '面向数据不准、无数据、对不上、归因不到、回传缺失等问题，先查证据再输出排查结论',
    family: 'troubleshoot',
    input: {
      required: ['issue_description'],
      optional: ['project_id', 'media', 'metric', 'time_range'],
      descriptions: {
        issue_description: '问题描述',
      },
    },
    preconditions: ['user_authenticated'],
    requiredCapabilities: ['diagnostic_evidence'],
    optionalCapabilities: ['report_execution', 'config_check', 'log_check'],
    deliverables: ['diagnosis_result', 'chat_answer'],
    clarificationPolicy: 'answer_with_caveat',
    requiresConfirmation: false,
    readOnly: true,
    exampleUtterances: ['为什么没有数据', '消耗对不上', '归因不到这个渠道', '回传缺失'],
  },

  config_issue_diagnosis: {
    type: 'config_issue_diagnosis',
    displayName: '配置问题排查',
    description: '排查是否没配、配错、SDK 参数问题等配置类异常',
    family: 'troubleshoot',
    input: {
      required: ['issue_description'],
      optional: ['project_id', 'config_type'],
      descriptions: {
        config_type: '配置类型：SDK / 媒体参数 / 回传配置',
      },
    },
    preconditions: ['user_authenticated'],
    requiredCapabilities: ['diagnostic_evidence', 'config_check'],
    optionalCapabilities: ['log_check'],
    deliverables: ['diagnosis_result', 'chat_answer'],
    clarificationPolicy: 'answer_with_caveat',
    requiresConfirmation: false,
    readOnly: true,
    exampleUtterances: ['是不是没配', '配置对不对', 'SDK 参数有问题'],
  },

  troubleshooting_answer: {
    type: 'troubleshooting_answer',
    displayName: '排查解答',
    description: '基于证据生成可直接复制给业务方的回复',
    family: 'troubleshoot',
    input: {
      required: ['issue_description'],
      optional: ['project_id', 'reply_target'],
      descriptions: {
        reply_target: '回复对象：业务方 / 媒体 / 内部',
      },
    },
    preconditions: ['user_authenticated'],
    requiredCapabilities: ['diagnostic_evidence'],
    optionalCapabilities: ['report_execution', 'knowledge_base'],
    deliverables: ['reply_draft', 'diagnosis_result'],
    clarificationPolicy: 'answer_with_caveat',
    requiresConfirmation: false,
    readOnly: true,
    exampleUtterances: ['帮我回复业务方', '怎么跟媒体解释', '写个排查结论'],
  },

  // ─── 诊断服务 ────────────────────────────────────────
  roi_diagnosis: {
    type: 'roi_diagnosis',
    displayName: 'ROI 诊断',
    description: '对 ROI 下降、消耗上涨但转化不涨等问题进行原因分析和建议输出',
    family: 'diagnosis',
    input: {
      required: ['project_id'],
      optional: ['time_range', 'comparison_range', 'dimensions'],
      descriptions: {},
    },
    preconditions: ['user_authenticated', 'project_selected'],
    requiredCapabilities: ['report_execution', 'diagnostic_evidence'],
    optionalCapabilities: ['knowledge_base'],
    deliverables: ['diagnosis_result', 'chat_answer'],
    clarificationPolicy: 'answer_with_caveat',
    requiresConfirmation: false,
    readOnly: true,
    exampleUtterances: ['ROI 为什么下降了', '消耗涨了但转化没涨', '帮我诊断一下'],
  },

  creative_diagnosis: {
    type: 'creative_diagnosis',
    displayName: '创意效果诊断',
    description: '创意效果变差等问题进行原因分析和建议输出',
    family: 'diagnosis',
    input: {
      required: ['project_id'],
      optional: ['creative_ids', 'time_range'],
      descriptions: {},
    },
    preconditions: ['user_authenticated', 'project_selected'],
    requiredCapabilities: ['report_execution', 'diagnostic_evidence'],
    optionalCapabilities: [],
    deliverables: ['diagnosis_result', 'chat_answer'],
    clarificationPolicy: 'answer_with_caveat',
    requiresConfirmation: false,
    readOnly: true,
    exampleUtterances: ['创意效果变差了', '哪些素材需要替换', '帮我分析创意表现'],
  },

  // ─── 交付服务 ────────────────────────────────────────
  package_fetch: {
    type: 'package_fetch',
    displayName: '获取包信息',
    description: '查询包列表、包详情、包状态、下载地址、渠道包和联调包',
    family: 'delivery',
    input: {
      required: ['project_id'],
      optional: ['package_type', 'terminal'],
      descriptions: {
        package_type: '包类型：channel / debug / release',
        terminal: '终端类型',
      },
    },
    preconditions: ['user_authenticated', 'project_selected'],
    requiredCapabilities: ['package_query'],
    optionalCapabilities: [],
    deliverables: ['package_info'],
    clarificationPolicy: 'answer_with_caveat',
    requiresConfirmation: false,
    readOnly: true,
    exampleUtterances: ['包在哪里', '有没有可用包', '查下联调包状态', '下载地址'],
  },

  integration_workflow: {
    type: 'integration_workflow',
    displayName: '联调',
    description: '联调触发、步骤执行、截图日志、失败原因、过程披露和交付结论',
    family: 'delivery',
    input: {
      required: ['project_id'],
      optional: ['debug_scope', 'events'],
      descriptions: {
        debug_scope: '联调范围',
        events: '需要联调的事件列表',
      },
    },
    preconditions: ['user_authenticated', 'project_selected'],
    requiredCapabilities: ['workflow_execution'],
    optionalCapabilities: ['diagnostic_evidence'],
    deliverables: ['workflow_trace', 'diagnosis_result'],
    clarificationPolicy: 'ask_first',
    requiresConfirmation: true,
    readOnly: false,
    exampleUtterances: ['帮我看联调状态', '触发联调', '联调失败了', '截图日志'],
  },

  // ─── 创意服务 ────────────────────────────────────────
  creative_data_query: {
    type: 'creative_data_query',
    displayName: '创意数据查询',
    description: '通过 MCP 接入数仓创意数据，查询创意维度的指标表现',
    family: 'creative',
    input: {
      required: ['project_id'],
      optional: ['creative_ids', 'metrics', 'time_range'],
      descriptions: {},
    },
    preconditions: ['user_authenticated', 'project_selected'],
    requiredCapabilities: ['report_execution'],
    optionalCapabilities: [],
    deliverables: ['data_table', 'chart'],
    clarificationPolicy: 'answer_with_caveat',
    requiresConfirmation: false,
    readOnly: true,
    exampleUtterances: ['看下创意数据', '素材表现怎么样', '创意维度的消耗'],
  },

  creative_analysis: {
    type: 'creative_analysis',
    displayName: '创意效果分析',
    description: '创意效果追踪、标签表现和异常创意识别',
    family: 'creative',
    input: {
      required: ['project_id'],
      optional: ['creative_ids', 'tags', 'time_range'],
      descriptions: {},
    },
    preconditions: ['user_authenticated', 'project_selected'],
    requiredCapabilities: ['report_execution'],
    optionalCapabilities: [],
    deliverables: ['data_table', 'chart', 'chat_answer'],
    clarificationPolicy: 'answer_with_caveat',
    requiresConfirmation: false,
    readOnly: true,
    exampleUtterances: ['创意效果追踪', '哪些标签表现好', '异常创意识别'],
  },

  // ─── 需求服务 ────────────────────────────────────────
  requirement_draft: {
    type: 'requirement_draft',
    displayName: '需求草稿',
    description: '将用户描述转化为结构化需求单，包含影响范围和验收标准',
    family: 'requirement',
    input: {
      required: ['requirement_description'],
      optional: ['priority', 'deadline'],
      descriptions: {},
    },
    preconditions: [],
    requiredCapabilities: [],
    optionalCapabilities: ['knowledge_base'],
    deliverables: ['requirement_draft'],
    clarificationPolicy: 'ask_first',
    requiresConfirmation: true,
    readOnly: false,
    exampleUtterances: ['能不能加一个鸿蒙拆分', '提个需求', '这个需要改'],
  },

  feasibility_check: {
    type: 'feasibility_check',
    displayName: '可实现性确认',
    description: '判断智投当前能力边界，输出支持/不支持/需改造',
    family: 'requirement',
    input: {
      required: ['feature_description'],
      optional: [],
      descriptions: {},
    },
    preconditions: [],
    requiredCapabilities: [],
    optionalCapabilities: ['knowledge_base'],
    deliverables: ['chat_answer'],
    clarificationPolicy: 'answer_with_caveat',
    requiresConfirmation: false,
    readOnly: true,
    exampleUtterances: ['智投能不能支持', '这个能做吗', '需不需要改'],
  },

  // ─── 协助服务 ────────────────────────────────────────
  current_usage_assist: {
    type: 'current_usage_assist',
    displayName: '使用协助',
    description: '指标口径解释、系统路径导航、广告规则说明',
    family: 'assist',
    input: {
      required: ['question'],
      optional: [],
      descriptions: {},
    },
    preconditions: [],
    requiredCapabilities: [],
    optionalCapabilities: ['knowledge_base', 'dictionary_lookup'],
    deliverables: ['chat_answer'],
    clarificationPolicy: 'answer_with_caveat',
    requiresConfirmation: false,
    readOnly: true,
    exampleUtterances: ['这个怎么看', '这个字段什么意思', '路径在哪'],
  },

  field_definition: {
    type: 'field_definition',
    displayName: '字段定义',
    description: '解释具体字段/指标的含义和口径',
    family: 'assist',
    input: {
      required: ['field_name'],
      optional: [],
      descriptions: {},
    },
    preconditions: [],
    requiredCapabilities: [],
    optionalCapabilities: ['dictionary_lookup', 'schema_lookup'],
    deliverables: ['chat_answer'],
    clarificationPolicy: 'answer_with_caveat',
    requiresConfirmation: false,
    readOnly: true,
    exampleUtterances: ['这个指标口径是什么', 'XX 字段什么意思'],
  },

  knowledge_answer: {
    type: 'knowledge_answer',
    displayName: '知识问答',
    description: '基于知识库回答广告业务相关问题',
    family: 'assist',
    input: {
      required: ['question'],
      optional: [],
      descriptions: {},
    },
    preconditions: [],
    requiredCapabilities: [],
    optionalCapabilities: ['knowledge_base', 'public_web_qa'],
    deliverables: ['chat_answer'],
    clarificationPolicy: 'answer_with_caveat',
    requiresConfirmation: false,
    readOnly: true,
    exampleUtterances: ['广告规则是什么', '媒体回传怎么接入', '怎么配置'],
  },

  // ─── 自动化服务 ──────────────────────────────────────
  automation_task: {
    type: 'automation_task',
    displayName: '自动化任务',
    description: '创建定时/条件触发的自动化任务（定时查数、异常监控等）',
    family: 'automation',
    input: {
      required: ['task_type', 'task_config'],
      optional: ['schedule', 'notification_config'],
      descriptions: {
        task_type: '任务类型：scheduled_query / anomaly_monitor / report_delivery',
        task_config: '任务配置',
        schedule: '调度配置（cron 表达式或自然语言）',
        notification_config: '通知配置',
      },
    },
    preconditions: ['user_authenticated'],
    requiredCapabilities: [],
    optionalCapabilities: ['report_execution'],
    deliverables: ['task_created'],
    clarificationPolicy: 'ask_first',
    requiresConfirmation: true,
    readOnly: false,
    exampleUtterances: ['每天帮我看 ROI 异常', '定时查数', '设置监控'],
  },

  // ─── 通用 ────────────────────────────────────────────
  general_chat: {
    type: 'general_chat',
    displayName: '通用对话',
    description: '不属于任何特定服务的通用对话',
    family: 'chat',
    input: {
      required: ['message'],
      optional: [],
      descriptions: {},
    },
    preconditions: [],
    requiredCapabilities: [],
    optionalCapabilities: ['public_web_qa'],
    deliverables: ['chat_answer'],
    clarificationPolicy: 'auto_resolve',
    requiresConfirmation: false,
    readOnly: true,
    exampleUtterances: ['你好', '谢谢', '今天天气怎么样'],
  },

  clarification: {
    type: 'clarification',
    displayName: '澄清追问',
    description: '最小必要追问，补齐缺失上下文',
    family: 'chat',
    input: {
      required: ['clarification_target'],
      optional: [],
      descriptions: {
        clarification_target: '需要澄清的内容',
      },
    },
    preconditions: [],
    requiredCapabilities: [],
    optionalCapabilities: [],
    deliverables: ['chat_answer'],
    clarificationPolicy: 'ask_first',
    requiresConfirmation: false,
    readOnly: true,
    exampleUtterances: [],
  },
};

// ─── Service Catalog API ───────────────────────────────

/**
 * 获取服务定义
 */
export function getServiceDefinition(type: ServiceType): ServiceDefinition {
  return BUILTIN_SERVICE_DEFINITIONS[type];
}

/**
 * 获取服务族下的所有服务类型
 */
export function getServicesByFamily(family: ServiceFamily): ServiceType[] {
  return (Object.entries(SERVICE_TYPE_FAMILY) as Array<[ServiceType, ServiceFamily]>)
    .filter(([_, f]) => f === family)
    .map(([t]) => t);
}

/**
 * 检查服务类型是否有效
 */
export function isValidServiceType(type: string): type is ServiceType {
  return (SERVICE_TYPES as readonly string[]).includes(type);
}

// ─── Legacy Mapping ────────────────────────────────────

/**
 * 从旧版 ServiceIntent 映射到新版 ServiceType
 * 用于渐进式迁移
 */
export function fromLegacyServiceIntent(intent: string): ServiceType | null {
  const mapping: Record<string, ServiceType> = {
    general_chat: 'general_chat',
    help_qa: 'knowledge_answer',
    field_definition: 'field_definition',
    knowledge_answer: 'knowledge_answer',
    light_requirement: 'requirement_draft',
    issue_diagnosis: 'data_issue_diagnosis',
    system_operation: 'config_issue_diagnosis',
    data_query: 'data_query',
    report_delivery: 'join_table_report',
    package_fetch: 'package_fetch',
    integration_workflow: 'integration_workflow',
  };
  return mapping[intent] || null;
}

/**
 * 从 PlannerServiceIntent 映射到新版 ServiceType
 */
export function fromPlannerServiceIntent(intent: string): ServiceType | null {
  const mapping: Record<string, ServiceType> = {
    general_chat: 'general_chat',
    help_qa: 'knowledge_answer',
    data_query: 'data_query',
    issue_diagnosis: 'data_issue_diagnosis',
    system_operation: 'config_issue_diagnosis',
    package_fetch: 'package_fetch',
    integration_workflow: 'integration_workflow',
    report_summary: 'data_query',
    requirement_drafting: 'requirement_draft',
    clarification: 'clarification',
  };
  return mapping[intent] || null;
}

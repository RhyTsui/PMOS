import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { SkillContract } from '@/types';
import { CALLBACK_ATTR_DIAGNOSIS_SKILL_CONTRACT } from '@/contracts/skills/callback-attribution-diagnosis';
import { runtimeDataPath } from './runtime-data-path';

const SKILL_CONTRACTS_PATH = runtimeDataPath('skill-contracts.json');

interface SkillContractsFile {
  contracts: SkillContract[];
}

function nowTs(): number {
  return Date.now();
}

const RAW_BUILTIN_SKILL_CONTRACTS: SkillContract[] = [
  {
    skill_id: 'package_delivery_execution_skill',
    name: '投放包交付',
    description: '从当前项目出发，查询可投放包、补齐可自动处理的分包或联调动作，最终只交付可投放包或明确阻塞项。',
    category: 'integration',
    priority: 'P0',
    enabled: true,
    version: '2026-05-19.v0.3',
    intent_triggers: ['获取广告包', '可交付包', '投放包', '包体检查', '验流程', '生成分包'],
    input_schema: {
      type: 'object',
      properties: {
        project_scope: { type: 'string' },
        media_scope: { type: 'array', items: { type: 'string' } },
        terminal: { type: 'string' },
        allow_write: { type: 'boolean' },
      },
      required: ['project_scope'],
    },
    workflow_steps: [
      { key: 'query_package_status', label: '查询项目包', tool_bindings: ['get_app_package_list', 'zhitou_package.channel_package_query'] },
      { key: 'query_download_url', label: '确认下载地址', tool_bindings: ['zhitou_package.download_url_query'] },
      { key: 'create_sub_package_if_allowed', label: '必要时生成分包', tool_bindings: ['zhitou_package.create_sub_package', 'zhitou_package.sync_media_sub_package'] },
      { key: 'check_media_review', label: '检查媒体审核', tool_bindings: ['media_config.review_status'] },
      { key: 'check_debug_result', label: '检查联调结果', tool_bindings: ['debug_automation_get_result', 'debug.watch_steps'] },
      { key: 'check_callback_result', label: '检查回传结果', tool_bindings: ['debug.event_report_check', 'collect.platform_event_report_status'] },
      { key: 'render_delivery_result', label: '整理可交付结果', ui_component: 'delivery_summary_card' },
    ],
    output_schema: {
      type: 'object',
      properties: {
        deliverable_packages: { type: 'array' },
        blockers: { type: 'array' },
        evidence: { type: 'array' },
      },
    },
    evaluation_cases: ['delivery-package-current-project-001', 'delivery-package-blocker-001'],
    risk_guardrails: ['只有真实工具返回的包和证据才能标记可交付。', '写操作必须由已配置真实 MCP 执行，缺能力时只返回阻塞。'],
  },
  {
    skill_id: 'package_status_query_skill',
    name: '包信息与状态',
    description: '只读查询项目包、官方渠道包、分包、下载地址、审核状态、联调状态和回传状态。',
    category: 'integration',
    priority: 'P0',
    enabled: true,
    version: '2026-05-19.v0.3',
    intent_triggers: ['包列表', '分包状态', '审核状态', '下载地址', '联调状态', '回传状态'],
    input_schema: { type: 'object', properties: { project_scope: { type: 'string' }, package_name: { type: 'string' } }, required: ['project_scope'] },
    workflow_steps: [
      { key: 'query_app_packages', label: '查询应用包', tool_bindings: ['get_app_package_list'] },
      { key: 'query_channel_packages', label: '查询渠道包', tool_bindings: ['zhitou_package.channel_package_query'] },
      { key: 'query_download_urls', label: '查询下载地址', tool_bindings: ['zhitou_package.download_url_query'] },
    ],
    output_schema: { type: 'object', properties: { packages: { type: 'array' } } },
    evaluation_cases: ['package-status-query-001'],
    risk_guardrails: ['查不到状态时展示待确认，不写成通过。'],
  },
  {
    skill_id: 'delivery_diagnosis_skill',
    name: '交付阻塞排查',
    description: '当包不能交付时，定位最后阻塞步骤、原因和下一步动作。',
    category: 'diagnosis',
    priority: 'P0',
    enabled: true,
    version: '2026-05-19.v0.3',
    intent_triggers: ['为什么不能投', '包为什么不可用', '为什么没有通过检测', '联调包失败'],
    input_schema: { type: 'object', properties: { project_scope: { type: 'string' }, package_name: { type: 'string' } }, required: ['project_scope'] },
    workflow_steps: [
      { key: 'locate_last_blocker', label: '定位最后阻塞项' },
      { key: 'attach_package_evidence', label: '挂载包和联调证据', tool_bindings: ['zhitou_package.channel_package_query', 'debug_automation_get_result'] },
      { key: 'render_blocker', label: '展示处理建议', ui_component: 'delivery_blocker_card' },
    ],
    output_schema: { type: 'object', properties: { blocker: { type: 'object' }, next_step: { type: 'string' } } },
    evaluation_cases: ['delivery-diagnosis-blocker-001'],
    risk_guardrails: ['失败原因必须来自真实返回或明确标记为缺证据。'],
  },
  CALLBACK_ATTR_DIAGNOSIS_SKILL_CONTRACT,
  {
    skill_id: 'metric_diff_diagnosis_skill',
    name: '指标差异排查',
    description: '按指标类型选择排查路径，消耗不默认进入回传链路，转化差异再检查上报、归因和回传。',
    category: 'diagnosis',
    priority: 'P0',
    enabled: true,
    version: '2026-05-15.v1',
    intent_triggers: ['不一致', '差异', '对不上', '排查', 'BI 不一致'],
    input_schema: {
      type: 'object',
      properties: {
        project_scope: { type: 'string' },
        media: { type: 'string' },
        metric: { type: 'string' },
        date_range: { type: 'string' },
      },
      required: ['metric'],
    },
    clarification_schema: {
      type: 'object',
      properties: {
        compare_source: { type: 'string', title: '对比数据源' },
      },
    },
    workflow_steps: [
      { key: 'query_system_value', label: '查询系统实际值', tool_bindings: ['report.query_metric_value'] },
      { key: 'explain_metric_scope', label: '对齐指标口径', tool_bindings: ['metric.explain'] },
      { key: 'diagnose_by_metric_type', label: '按指标类型选择排查链路' },
      { key: 'attach_evidence', label: '挂载来源和证据', ui_component: 'diagnosis_report' },
    ],
    output_schema: { type: 'object', properties: { conclusion: { type: 'string' }, evidence: { type: 'array' } } },
    evaluation_cases: ['diagnosis-activation-diff-001', 'diagnosis-cost-diff-001'],
    risk_guardrails: ['查不到真实报表值时必须说明缺口，不允许自行编造系统实际值。'],
  },
  {
    skill_id: 'preflight_quality_check_skill',
    name: '投放前质量保障',
    description: '投放前只读检查官方渠道包、智投分包、巨量应用分包、媒体应用、监测链接、归因、报表和联调状态，给出可投放结论；v1 不自动创建分包。',
    category: 'integration',
    priority: 'P0',
    enabled: true,
    version: '2026-05-15.v1',
    intent_triggers: ['能不能投', '投放前', '包有没有问题', '可投放'],
    input_schema: { type: 'object', properties: { project_scope: { type: 'string' }, media: { type: 'string' }, package_name: { type: 'string' } } },
    workflow_steps: [
      { key: 'query_zhitou_package', label: '查询智投已有包和分包状态', tool_bindings: ['zhitou_package.channel_package_query', 'zhitou_package.download_url_query'] },
      { key: 'query_oceanengine_package', label: '巨量场景查询巨量应用和应用分包', tool_bindings: ['tools_app_management_android_app_list_v2', 'oceanengine.app_package_query'] },
      { key: 'check_tracking_link', label: '检查监测链接', tool_bindings: ['tracking_link.check'] },
      { key: 'check_attribution', label: '检查归因配置', tool_bindings: ['attribution.config_check'] },
      { key: 'check_report_ready', label: '检查报表可用性', tool_bindings: ['report.health_check'] },
      { key: 'check_debug_result', label: '检查联调结论', tool_bindings: ['debug.latest_result'] },
    ],
    output_schema: { type: 'object', properties: { can_launch: { type: 'boolean' }, blockers: { type: 'array' } } },
    evaluation_cases: ['preflight-package-001'],
    risk_guardrails: ['不能把缺失配置写成可投放。', 'v1 只查询已有分包；没有分包时返回阻塞项，不自动创建。', '巨量应用和智投应用只能通过包名+终端匹配，不得只按名称猜测。'],
  },
  {
    skill_id: 'knowledge_answer_skill',
    name: '疑问解答',
    description: '基于知识库、指标资料和来源回答业务规范、归因逻辑和流程问题。',
    category: 'help',
    priority: 'P1',
    enabled: true,
    version: '2026-05-15.v1',
    intent_triggers: ['为什么', '区别', '口径', '什么意思', '怎么理解'],
    input_schema: { type: 'object', properties: { question: { type: 'string' } }, required: ['question'] },
    workflow_steps: [
      { key: 'search_knowledge', label: '检索知识库', tool_bindings: ['knowledge.search'] },
      { key: 'reject_low_relevance', label: '丢弃低相关知识' },
      { key: 'answer_with_sources', label: '生成结构化答案', ui_component: 'source_detail' },
    ],
    output_schema: { type: 'object', properties: { answer: { type: 'string' }, sources: { type: 'array' } } },
    evaluation_cases: ['help-metric-diff-001'],
  },
  {
    skill_id: 'metric_explainer_skill',
    name: '指标解释器',
    description: '从后台结构化指标资料生成动态指标解释组件，知识库仅作为补充。',
    category: 'help',
    priority: 'P1',
    enabled: true,
    version: '2026-05-15.v1',
    intent_triggers: ['指标解释', '注册数', '激活数', '付费数', 'ROI', '自然量'],
    input_schema: { type: 'object', properties: { metric_name: { type: 'string' } }, required: ['metric_name'] },
    workflow_steps: [
      { key: 'load_metric_schema', label: '读取指标结构化资料', tool_bindings: ['metric_explainer.get_schema'] },
      { key: 'render_metric_component', label: '渲染指标解释组件', ui_component: 'metric_explainer' },
    ],
    output_schema: { type: 'object', properties: { metric_schema: { type: 'object' } } },
    evaluation_cases: ['metric-explainer-register-001'],
    risk_guardrails: ['没有结构化资料时明确提示缺资料，不用 mock 或泛化知识伪装。'],
  },
  {
    skill_id: 'tracking_link_delivery_skill',
    name: '监测链接交付',
    description: '查询已有监测链接，并支持有权限用户直接创建新链接。',
    category: 'integration',
    priority: 'P1',
    enabled: true,
    version: '2026-05-15.v1',
    intent_triggers: ['监测链接', '创建链接', '给我链接'],
    input_schema: { type: 'object', properties: { project_scope: { type: 'string' }, media: { type: 'string' }, package_name: { type: 'string' } } },
    workflow_steps: [
      { key: 'check_permission', label: '检查创建权限', tool_bindings: ['tracking_link.permission_check'] },
      { key: 'query_existing_link', label: '查询已有链接', tool_bindings: ['tracking_link.query'] },
      { key: 'create_link_if_needed', label: '必要时创建新链接', tool_bindings: ['tracking_link.create'], ui_component: 'tracking_link_card' },
    ],
    output_schema: { type: 'object', properties: { link: { type: 'string' }, created: { type: 'boolean' } } },
    evaluation_cases: ['tracking-link-001'],
    risk_guardrails: ['无权限时明确提示，不做假创建。'],
  },
  {
    skill_id: 'report_template_builder_skill',
    name: '报表模板提炼',
    description: '从文本或标准二维 Excel 模板提炼报表结构，复杂 Excel 和截图识别后置。',
    category: 'report',
    priority: 'P1',
    enabled: true,
    version: '2026-05-15.v1',
    intent_triggers: ['日报', '周报', '报表模板', 'Excel 模板', '拼表'],
    input_schema: { type: 'object', properties: { template_source: { type: 'string' }, description: { type: 'string' } } },
    workflow_steps: [
      { key: 'parse_template', label: '解析文本或标准二维 Excel 模板', ui_component: 'report_template' },
      { key: 'validate_metrics', label: '校验指标', tool_bindings: ['report.validate_metrics'] },
      { key: 'preview_data', label: '预览数据', tool_bindings: ['report.preview'], ui_component: 'data_preview' },
    ],
    output_schema: { type: 'object', properties: { template: { type: 'object' }, preview: { type: 'object' } } },
    evaluation_cases: ['report-template-text-001', 'report-template-excel-001'],
  },
  {
    skill_id: 'scheduled_report_skill',
    name: '自动报表',
    description: '创建、暂停、开启和修改定时报表任务，支持业务日报、周报、月报和自定义指标维度；游戏项目日报默认覆盖项目、媒体、应用类型、团队和 iOS 自然量扣除口径。',
    category: 'report',
    priority: 'P1',
    enabled: true,
    version: '2026-05-20.v0.6',
    intent_triggers: ['每天', '每周', '定时发送', '自动报表', '游戏项目日报', '投放日报'],
    input_schema: { type: 'object', properties: { template_id: { type: 'string' }, schedule: { type: 'string' } } },
    workflow_steps: [
      { key: 'confirm_template', label: '确认报表模板', ui_component: 'report_template' },
      { key: 'load_game_daily_template', label: '加载游戏项目日报模板', tool_bindings: ['report_template.get_game_project_daily'] },
      { key: 'preview_report_data', label: '预览数据', tool_bindings: ['report.preview'], ui_component: 'data_preview' },
      { key: 'create_schedule', label: '创建定时任务', tool_bindings: ['scheduled_report.create'] },
    ],
    output_schema: { type: 'object', properties: { task_id: { type: 'string' }, schedule: { type: 'string' } } },
    evaluation_cases: ['scheduled-report-001'],
    risk_guardrails: ['创建任务前必须让用户确认维度、指标、时间和频率。', '任务修改、暂停、开启必须保留操作记录。'],
  },
  {
    skill_id: 'report_data_quality_check_skill',
    name: '报表数据异常检查',
    description: '每次报表查询成功后，对返回数据做空值、字段缺失、日期缺口和异常波动检查，有问题优先告知用户。',
    category: 'diagnosis',
    priority: 'P0',
    enabled: true,
    version: '2026-05-20.v0.6',
    intent_triggers: ['报表数据异常', '查数后检查', '数据质量', '空值', '日期缺口'],
    input_schema: { type: 'object', properties: { report_query: { type: 'object' }, report_payload: { type: 'object' } }, required: ['report_query'] },
    workflow_steps: [
      { key: 'check_empty_result', label: '检查空返回' },
      { key: 'check_missing_metric', label: '检查字段缺失' },
      { key: 'check_date_gap', label: '检查日期缺口' },
      { key: 'check_outlier', label: '检查异常波动' },
      { key: 'render_quality_result', label: '输出数据检查结果' },
    ],
    output_schema: { type: 'object', properties: { ok: { type: 'boolean' }, issues: { type: 'array' } } },
    evaluation_cases: ['report-quality-empty-001', 'report-quality-missing-metric-001', 'report-quality-date-gap-001'],
    risk_guardrails: ['有数据问题时先告知用户，不继续生成确定性业务结论。'],
  },
];

const BUILTIN_SKILL_CONTRACTS: SkillContract[] = RAW_BUILTIN_SKILL_CONTRACTS.map((contract, index) => ({
  ...contract,
  created_at: contract.created_at || nowTs() + index,
  updated_at: contract.updated_at || nowTs() + index,
}));

function normalizeContract(input: Partial<SkillContract>): SkillContract {
  const base = BUILTIN_SKILL_CONTRACTS.find(item => item.skill_id === input.skill_id);
  return {
    skill_id: input.skill_id || `skill-contract-${nowTs()}`,
    name: input.name || base?.name || '',
    description: input.description ?? base?.description ?? '',
    domain: input.domain || base?.domain,
    category: input.category || base?.category || 'help',
    priority: input.priority || base?.priority || 'P1',
    enabled: input.enabled ?? base?.enabled ?? true,
    version: input.version || base?.version || '2026-05-15.v1',
    intent_triggers: Array.isArray(input.intent_triggers) ? input.intent_triggers : (base?.intent_triggers || []),
    input_schema: input.input_schema || base?.input_schema || {},
    clarification_schema: input.clarification_schema || base?.clarification_schema,
    slot_schema_ref: input.slot_schema_ref || base?.slot_schema_ref,
    capability_requirements_ref: input.capability_requirements_ref || base?.capability_requirements_ref,
    workflow_ref: input.workflow_ref || base?.workflow_ref,
    prompt_fragment_refs: Array.isArray(input.prompt_fragment_refs) ? input.prompt_fragment_refs : (base?.prompt_fragment_refs || []),
    result_screen_type: input.result_screen_type || base?.result_screen_type,
    runtime_display_ref: input.runtime_display_ref || base?.runtime_display_ref,
    observability_ref: input.observability_ref || base?.observability_ref,
    default_inputs: input.default_inputs || base?.default_inputs,
    selection_policy: input.selection_policy || base?.selection_policy,
    workflow_steps: Array.isArray(input.workflow_steps) ? input.workflow_steps : (base?.workflow_steps || []),
    output_schema: input.output_schema || base?.output_schema || {},
    evaluation_cases: Array.isArray(input.evaluation_cases) ? input.evaluation_cases : (base?.evaluation_cases || []),
    risk_guardrails: Array.isArray(input.risk_guardrails) ? input.risk_guardrails : (base?.risk_guardrails || []),
    created_at: input.created_at || nowTs(),
    updated_at: input.updated_at || nowTs(),
  };
}

async function readContractsFile(): Promise<SkillContractsFile> {
  try {
    const raw = await readFile(SKILL_CONTRACTS_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<SkillContractsFile>;
    if (Array.isArray(parsed.contracts)) {
      const fromDisk = parsed.contracts.map(normalizeContract);
      const merged = BUILTIN_SKILL_CONTRACTS.map((builtin) => {
        const override = fromDisk.find(item => item.skill_id === builtin.skill_id);
        return override ? normalizeContract({ ...builtin, ...override }) : builtin;
      });
      const custom = fromDisk.filter(item => !BUILTIN_SKILL_CONTRACTS.some(builtin => builtin.skill_id === item.skill_id));
      return { contracts: [...merged, ...custom] };
    }
  } catch {
    // Use builtins when the file has not been created yet.
  }
  return { contracts: BUILTIN_SKILL_CONTRACTS.map(normalizeContract) };
}

async function writeContractsFile(file: SkillContractsFile): Promise<void> {
  await mkdir(path.dirname(SKILL_CONTRACTS_PATH), { recursive: true });
  await writeFile(SKILL_CONTRACTS_PATH, JSON.stringify(file, null, 2), 'utf8');
}

export async function listSkillContracts(): Promise<SkillContract[]> {
  const file = await readContractsFile();
  return file.contracts.sort((a, b) => {
    const priorityOrder = { P0: 0, P1: 1, P2: 2, P3: 3 };
    const priorityDiff = priorityOrder[a.priority || 'P1'] - priorityOrder[b.priority || 'P1'];
    if (priorityDiff !== 0) return priorityDiff;
    return a.name.localeCompare(b.name, 'zh-Hans-CN');
  });
}

export async function getSkillContract(skillId: string): Promise<SkillContract | undefined> {
  const contracts = await listSkillContracts();
  return contracts.find(contract => contract.skill_id === skillId);
}

export async function upsertSkillContract(data: Partial<SkillContract>): Promise<SkillContract> {
  const file = await readContractsFile();
  const contract = normalizeContract({
    ...data,
    skill_id: data.skill_id || `skill-contract-${nowTs()}`,
    updated_at: nowTs(),
  });
  const exists = file.contracts.some(item => item.skill_id === contract.skill_id);
  file.contracts = exists
    ? file.contracts.map(item => item.skill_id === contract.skill_id ? normalizeContract({ ...item, ...contract, created_at: item.created_at }) : item)
    : [...file.contracts, contract];
  await writeContractsFile(file);
  return contract;
}

export async function updateSkillContract(skillId: string, patch: Partial<SkillContract>): Promise<SkillContract | undefined> {
  const current = await getSkillContract(skillId);
  if (!current) return undefined;
  return upsertSkillContract({
    ...current,
    ...patch,
    skill_id: skillId,
    created_at: current.created_at,
    updated_at: nowTs(),
  });
}

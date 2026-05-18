import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { SkillContract } from '@/types';
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
    skill_id: 'ads_health_monitor_skill',
    name: '监控巡检',
    description: '检查投放和数据链路异常，宽泛异常先巡检，发现异常后再进入排查。',
    category: 'monitor',
    priority: 'P0',
    enabled: true,
    version: '2026-05-15.v1',
    intent_triggers: ['昨天投放有什么异常', '监控', '巡检', '告警', '回传延迟'],
    input_schema: {
      type: 'object',
      properties: {
        project_scope: { type: 'string' },
        date_range: { type: 'string' },
        media: { type: 'string' },
      },
    },
    workflow_steps: [
      { key: 'prepare_context', label: '确认项目、媒体和时间范围' },
      { key: 'collect_media_report_status', label: '检查媒体报表采集', tool_bindings: ['collect.media_report_status'] },
      { key: 'collect_click_log_status', label: '检查点击日志采集', tool_bindings: ['collect.click_log_status'] },
      { key: 'collect_attribution_status', label: '检查自归因结果', tool_bindings: ['collect.self_attribution_status'] },
      { key: 'collect_event_report_status', label: '检查平台上报报告', tool_bindings: ['collect.platform_event_report_status'] },
      { key: 'collect_quality_status', label: '检查数据质量监控', tool_bindings: ['collect.data_quality_status'] },
      { key: 'collect_scheduler_status', label: '检查运维调度状态', tool_bindings: ['collect.scheduler_status'] },
    ],
    output_schema: { type: 'object', properties: { status: { type: 'string' }, anomalies: { type: 'array' } } },
    evaluation_cases: ['monitor-broad-001', 'monitor-postback-delay-001'],
    risk_guardrails: ['未接入数据源必须标记为未接入，不允许用 mock 生成巡检结论。'],
  },
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
    skill_id: 'auto_debug_skill',
    name: '自动联调',
    description: '巨量优先打透，用户只指定项目、媒体和终端；联调目标默认覆盖激活、注册、付费、关键行为，后台配置承载账号、设备、游戏登录和回传查看位置。',
    category: 'debugging',
    priority: 'P0',
    enabled: true,
    version: '2026-05-15.v1',
    intent_triggers: ['联调', '巨量联调', '立即联调', '应用共享'],
    input_schema: {
      type: 'object',
      properties: {
        project_scope: { type: 'string' },
        media: { type: 'string' },
        terminal: { type: 'string' },
        debug_targets: { type: 'array', items: { type: 'string' } },
      },
      required: ['project_scope', 'media', 'terminal'],
    },
    workflow_steps: [
      { key: 'check_debug_config', label: '检查后台联调配置', tool_bindings: ['debug.config_check'] },
      { key: 'match_app_by_package_terminal', label: '按包名和终端匹配智投应用与媒体应用' },
      { key: 'query_oceanengine_app_package', label: '巨量场景查询巨量应用和应用分包', tool_bindings: ['tools_app_management_android_app_list_v2', 'oceanengine.app_package_query'] },
      { key: 'query_zhitou_package', label: '非巨量场景查询智投分包', tool_bindings: ['zhitou_package.channel_package_query', 'zhitou_package.download_url_query'] },
      { key: 'check_media_app', label: '检查媒体应用、共享状态和事件资产', tool_bindings: ['debug.media_app_check'] },
      { key: 'check_event_report', label: '检查平台事件上报记录', tool_bindings: ['debug.event_report_check'] },
      { key: 'create_debug_task', label: '创建自动联调任务', tool_bindings: ['debug_automation_create_task'], ui_component: 'debug_workbench' },
      { key: 'start_debug_task', label: '发起自动联调任务', tool_bindings: ['debug_automation_start_task'], ui_component: 'debug_workbench' },
      { key: 'watch_debug_steps', label: '观测联调步骤和回传结果', tool_bindings: ['debug_automation_get_steps', 'debug_automation_get_result'], ui_component: 'debug_workbench' },
    ],
    output_schema: { type: 'object', properties: { passed: { type: 'boolean' }, reason: { type: 'string' } } },
    evaluation_cases: ['debug-oceanengine-001'],
    risk_guardrails: ['巨量以外媒体 v1 不承诺完整打透；缺配置时必须说明缺哪项配置。'],
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
    description: '基于已确认模板创建定时报表任务。',
    category: 'report',
    priority: 'P1',
    enabled: true,
    version: '2026-05-15.v1',
    intent_triggers: ['每天', '每周', '定时发送', '自动报表'],
    input_schema: { type: 'object', properties: { template_id: { type: 'string' }, schedule: { type: 'string' } } },
    workflow_steps: [
      { key: 'confirm_template', label: '确认报表模板', ui_component: 'report_template' },
      { key: 'create_schedule', label: '创建定时任务', tool_bindings: ['scheduled_report.create'] },
    ],
    output_schema: { type: 'object', properties: { task_id: { type: 'string' }, schedule: { type: 'string' } } },
    evaluation_cases: ['scheduled-report-001'],
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
    category: input.category || base?.category || 'help',
    priority: input.priority || base?.priority || 'P1',
    enabled: input.enabled ?? base?.enabled ?? true,
    version: input.version || base?.version || '2026-05-15.v1',
    intent_triggers: Array.isArray(input.intent_triggers) ? input.intent_triggers : (base?.intent_triggers || []),
    input_schema: input.input_schema || base?.input_schema || {},
    clarification_schema: input.clarification_schema || base?.clarification_schema,
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

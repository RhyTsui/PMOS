import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import * as XLSX from 'xlsx';
import { listMcpServers } from '../src/lib/mcp-server-store';
import { selectReportTool } from '../src/lib/report-query-orchestrator';

type Ownership =
  | 'mcp_native'
  | 'chat_mapping_required'
  | 'orchestrator_postprocess'
  | 'ui_required'
  | 'unknown_or_gap';

type ReportDomain =
  | 'ad_daily_report'
  | 'ad_hour_report'
  | 'ad_roi_report'
  | 'ad_retention_report'
  | 'ad_material_report'
  | 'ad_dictionary_lookup'
  | 'report_diagnosis_candidate'
  | 'unknown';

type FailureCategory =
  | 'route_error'
  | 'slot_error'
  | 'dictionary_error'
  | 'tool_selection_error'
  | 'mcp_call_error'
  | 'result_parse_error'
  | 'postprocess_error'
  | 'ui_contract_error'
  | 'permission_error'
  | 'data_empty_or_unavailable';

type CurrentStatus = 'covered' | 'partial' | 'blocked' | 'unknown';
type ToolMatchStatus = 'exact' | 'mismatch' | 'not_selected' | 'not_applicable';

interface RawCase {
  用例ID: string;
  优先级: string;
  业务域: string;
  测试场景: string;
  测试输入Prompt: string;
  预期结果: string;
}

interface TestCaseMapping {
  case_id: string;
  priority: string;
  business_domain: string;
  scenario: string;
  user_question: string;
  expected_result: string;
  expected_report_domain: ReportDomain;
  expected_tool?: string;
  expected_tools: string[];
  current_selected_tool?: string;
  current_selected_server?: string;
  current_rule_id?: string;
  current_tool_match: ToolMatchStatus;
  ownership: Ownership[];
  required_slots: string[];
  dictionary_tools: string[];
  postprocess: string[];
  ui_contract: string[];
  failure_categories: FailureCategory[];
  current_status: CurrentStatus;
  status_reason: string;
}

const repoRoot = path.resolve(process.cwd(), '..', '..');
const aiOsRoot = path.resolve(repoRoot, '..', '..');
const testcasePath = path.join(aiOsRoot, 'docs', 'sources', 'inbox', '智投Chat_广告业务（问数）测试集_预期精简版_v3.xlsx');
const outputDir = path.join(repoRoot, 'docs', 'design-v1', 'generated');
const jsonOutput = path.join(outputDir, 'report-query-testcase-capability-mapping.json');
const mdOutput = path.join(outputDir, 'report-query-testcase-capability-mapping.md');

function textOf(row: RawCase): string {
  return `${row.业务域} ${row.测试场景} ${row.测试输入Prompt} ${row.预期结果}`;
}

function promptTextOf(row: RawCase): string {
  return `${row.业务域} ${row.测试场景} ${row.测试输入Prompt}`;
}

function uniq<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function hasAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some(pattern => pattern.test(text));
}

function inferReportDomain(row: RawCase): ReportDomain {
  const text = promptTextOf(row);
  if (hasAny(text, [/为什么|下降|异常|排查|问题排查|不一致|差异/])) return 'report_diagnosis_candidate';
  if (hasAny(text, [/小时|实时|分时|截至\s*\d+\s*点|当前小时/])) return 'ad_hour_report';
  if (hasAny(text, [/素材|创意|material/i])) return 'ad_material_report';
  if (hasAny(text, [/留存|次留|[37]留|D\d+|retention/i])) return 'ad_retention_report';
  if (hasAny(text, [/ROI|ROAS|回收|回本|付费回收|累计 ROI|区间 ROI/i])) return 'ad_roi_report';
  if (hasAny(text, [/字典|列表|媒体识别|终端识别/]) && row.业务域.includes('Tools')) return 'ad_dictionary_lookup';
  if (row.业务域.includes('指标口径') && hasAny(text, [/媒体|终端|团队|应用类型/])) return 'ad_dictionary_lookup';
  if (
    row.业务域.includes('广告')
    || row.业务域.includes('媒体')
    || row.业务域.includes('自然量')
    || row.业务域.includes('指标')
    || row.业务域.includes('权限')
    || row.业务域.includes('多轮')
    || row.业务域.includes('意图')
    || row.业务域.includes('应用类型')
    || row.业务域.includes('展示')
    || row.业务域.includes('数据准确性')
    || row.业务域.includes('边界')
    || row.业务域.includes('空结果')
    || hasAny(text, [/激活|注册|消耗|花费|成本|投放|广告|日报|报表|数据/])
  ) return 'ad_daily_report';
  return 'unknown';
}

function expectedToolFor(domain: ReportDomain): string | undefined {
  switch (domain) {
    case 'ad_hour_report':
      return 'get_zt_hour_report';
    case 'ad_roi_report':
      return 'get_zt_ad_roi_report';
    case 'ad_retention_report':
      return 'get_zt_ad_retention_report';
    case 'ad_material_report':
      return 'get_zt_ad_mat_report';
    case 'ad_daily_report':
      return 'get_zt_ad_day_report';
    default:
      return undefined;
  }
}

function inferExpectedTools(row: RawCase, domain: ReportDomain): string[] {
  const text = promptTextOf(row);
  const tools: string[] = [];
  if (hasAny(text, [/小时|实时|分时|截至\s*\d+\s*点|当前小时|\d+\s*点-\d+\s*点/])) tools.push('get_zt_hour_report');
  if (hasAny(text, [/素材|创意|material/i])) tools.push('get_zt_ad_mat_report');
  if (hasAny(text, [/留存|次留|[37]留|D\d+|retention/i])) tools.push('get_zt_ad_retention_report');
  if (hasAny(text, [/ROI|ROAS|回收|回本|付费回收|累计\s*\d*日?ROI|区间 ROI|\d+\s*[日周月]roi/i])) tools.push('get_zt_ad_roi_report');
  if (hasAny(text, [/激活|注册|消耗|花费|成本|付费|有效数|新设备|日报|周报|月报|投放效果|广告投放/i])) tools.push('get_zt_ad_day_report');
  const primary = expectedToolFor(domain);
  if (primary) tools.unshift(primary);
  return uniq(tools);
}

function inferSlots(row: RawCase, domain: ReportDomain): string[] {
  const text = promptTextOf(row);
  const slots = ['project'];
  if (hasAny(text, [/日期|昨天|今天|近\s*\d+\s*天|本月|上月|上周|本周|\d{4}[ 年-]\d{1,2}/])) slots.push('date_range');
  if (hasAny(text, [/小时|实时|截至\s*\d+\s*点|分时/])) slots.push('hour');
  if (hasAny(text, [/激活|注册|消耗|花费|成本|付费|ROI|留存|转化率|ARPPU|回收/i])) slots.push('metrics');
  if (hasAny(text, [/媒体|巨量|腾讯|广点通|快手|tap|渠道/])) slots.push('media');
  if (hasAny(text, [/团队|投放部|广告投放部/])) slots.push('team');
  if (hasAny(text, [/应用类型|安卓|Android|iOS|苹果|鸿蒙|小游戏|H5/i])) slots.push('app_package_type');
  if (hasAny(text, [/终端|安卓|Android|iOS|苹果|鸿蒙/i])) slots.push('terminal');
  if (domain === 'ad_roi_report' && hasAny(text, [/累计|区间|30日|首日|ROI|回收/i])) slots.push('roi_data_type');
  if (domain === 'ad_retention_report') slots.push('retention_type');
  return uniq(slots);
}

function dictionaryToolsFor(slots: string[]): string[] {
  const tools: string[] = [];
  if (slots.includes('project')) tools.push('list_all_apps');
  if (slots.includes('media')) tools.push('get_dict_zt_all_media');
  if (slots.includes('terminal')) tools.push('get_dict_zt_rpt_os_type_v2');
  if (slots.includes('team')) tools.push('get_dict_zt_label_team');
  if (slots.includes('app_package_type')) tools.push('get_dict_zt_app_package_type');
  return tools;
}

function inferPostprocess(row: RawCase): string[] {
  const text = promptTextOf(row);
  const steps: string[] = [];
  if (hasAny(text, [/最高|最低|top\s*\d+|Top\s*\d+|排名|哪个.*好/i])) steps.push('ranking_topn');
  if (hasAny(text, [/对比|比较|环比|同期|高多少|差多少|变化/])) steps.push('comparison_delta');
  if (hasAny(text, [/总计|合计|明细|一致|核对|差异/])) steps.push('total_detail_reconcile');
  if (hasAny(text, [/如果|再查|然后|继续/])) steps.push('conditional_branch');
  if (hasAny(text, [/为什么|下降|异常|排查|问题排查/])) steps.push('diagnosis_handoff');
  return steps;
}

function inferUiContract(row: RawCase): string[] {
  const text = promptTextOf(row);
  const contract = ['source_refs', 'filters_summary'];
  if (hasAny(text, [/表格|明细|日报|报表|各媒体|各团队/])) contract.push('table');
  if (hasAny(text, [/趋势|图|环比|对比/])) contract.push('chart_or_comparison');
  if (hasAny(text, [/口径|ROI|留存|折后|转化率/i])) contract.push('metric_evidence');
  if (hasAny(text, [/下一步|异常|下降|空|超时|无数据|不存在/])) contract.push('recommended_actions');
  return uniq(contract);
}

function inferFailureCategories(row: RawCase, slots: string[], postprocess: string[], domain: ReportDomain): FailureCategory[] {
  const text = promptTextOf(row);
  const categories: FailureCategory[] = ['route_error', 'tool_selection_error', 'mcp_call_error', 'result_parse_error'];
  if (slots.length) categories.push('slot_error');
  if (dictionaryToolsFor(slots).length) categories.push('dictionary_error');
  if (postprocess.length) categories.push('postprocess_error');
  if (hasAny(text, [/权限|范围|无权/])) categories.push('permission_error');
  if (hasAny(text, [/空|暂无|无数据|不存在日期|不存在媒体|超时/])) categories.push('data_empty_or_unavailable');
  if (domain === 'unknown') categories.push('route_error');
  categories.push('ui_contract_error');
  return uniq(categories);
}

function inferOwnership(domain: ReportDomain, slots: string[], postprocess: string[], uiContract: string[]): Ownership[] {
  const ownership: Ownership[] = [];
  if (expectedToolFor(domain) || domain === 'ad_dictionary_lookup') ownership.push('mcp_native');
  if (slots.length) ownership.push('chat_mapping_required');
  if (postprocess.length) ownership.push('orchestrator_postprocess');
  if (uiContract.length) ownership.push('ui_required');
  if (!ownership.length || domain === 'unknown') ownership.push('unknown_or_gap');
  return uniq(ownership);
}

function inferToolMatch(expectedTools: string[], currentTool: string | undefined): ToolMatchStatus {
  if (!expectedTools.length) return 'not_applicable';
  if (!currentTool) return 'not_selected';
  return expectedTools.includes(currentTool) ? 'exact' : 'mismatch';
}

function inferStatus(mapping: Omit<TestCaseMapping, 'current_status' | 'status_reason'>): Pick<TestCaseMapping, 'current_status' | 'status_reason'> {
  if (!mapping.expected_tool) {
    return {
      current_status: mapping.expected_report_domain === 'ad_dictionary_lookup' ? 'partial' : 'unknown',
      status_reason: mapping.expected_report_domain === 'ad_dictionary_lookup'
        ? '字典类用例需要通过 slot 到字典 tool 的依赖链验证，当前只做归属映射。'
        : '无法从当前规则确定唯一期望 tool。',
    };
  }
  if (!mapping.current_selected_tool) {
    return {
      current_status: 'blocked',
      status_reason: '当前系统未选中任何报表 tool。',
    };
  }
  if (mapping.expected_tools.includes(mapping.current_selected_tool)) {
    if (mapping.expected_tools.length > 1) {
      return {
        current_status: 'partial',
        status_reason: `当前命中 ${mapping.current_selected_tool}，但该用例需要多工具编排：${mapping.expected_tools.join(', ')}。`,
      };
    }
    if (mapping.ownership.includes('orchestrator_postprocess') || mapping.ownership.includes('ui_required')) {
      return {
        current_status: 'partial',
        status_reason: 'MCP tool 命中正确，但仍需要验证后处理或 UI 契约。',
      };
    }
    return {
      current_status: 'covered',
      status_reason: '当前 tool 选择与期望 tool 一致。',
    };
  }
  return {
    current_status: 'partial',
    status_reason: `当前选中 ${mapping.current_selected_tool}，期望 ${mapping.expected_tools.join(', ')}。`,
  };
}

function renderMarkdown(mappings: TestCaseMapping[]): string {
  const by = (key: keyof TestCaseMapping) => {
    const counts = new Map<string, number>();
    for (const item of mappings) {
      const value = String(item[key] || 'unknown');
      counts.set(value, (counts.get(value) || 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  };
  const ownerCounts = new Map<string, number>();
  for (const item of mappings) {
    for (const owner of item.ownership) ownerCounts.set(owner, (ownerCounts.get(owner) || 0) + 1);
  }
  const toolGateFailures = mappings.filter(item => item.current_tool_match === 'mismatch' || item.current_tool_match === 'not_selected');
  const p0ToolGateFailures = toolGateFailures.filter(item => item.priority === 'P0');

  const lines: string[] = [
    '# 问数测试集能力归属矩阵',
    '',
    `生成时间：${new Date().toISOString()}`,
    '',
    '## 1. 汇总',
    '',
    `- 用例总数：${mappings.length}`,
    `- P0 用例：${mappings.filter(item => item.priority === 'P0').length}`,
    `- P1 用例：${mappings.filter(item => item.priority === 'P1').length}`,
    `- P2 用例：${mappings.filter(item => item.priority === 'P2').length}`,
    '',
    '### 1.1 当前状态',
    '',
    '| 状态 | 数量 |',
    '|---|---:|',
    ...by('current_status').map(([value, count]) => `| ${value} | ${count} |`),
    '',
    '### 1.2 Tool 命中',
    '',
    '| Tool 命中状态 | 数量 |',
    '|---|---:|',
    ...by('current_tool_match').map(([value, count]) => `| ${value} | ${count} |`),
    '',
    '### 1.3 报表域',
    '',
    '| 报表域 | 数量 |',
    '|---|---:|',
    ...by('expected_report_domain').map(([value, count]) => `| ${value} | ${count} |`),
    '',
    '### 1.4 责任层',
    '',
    '| 责任层 | 涉及用例数 |',
    '|---|---:|',
    ...Array.from(ownerCounts.entries()).sort((a, b) => b[1] - a[1]).map(([value, count]) => `| ${value} | ${count} |`),
    '',
    '### 1.5 门禁',
    '',
    `- Tool 选择门禁：${toolGateFailures.length === 0 ? '通过' : '失败'}`,
    `- Tool mismatch / not selected：${toolGateFailures.length}`,
    `- P0 Tool mismatch / not selected：${p0ToolGateFailures.length}`,
    `- 多工具编排用例：${mappings.filter(item => item.expected_tools.length > 1).length}`,
    ...(toolGateFailures.length ? [
      '',
      '| 用例 | P | 期望 tool | 当前 tool | 问题 |',
      '|---|---|---|---|---|',
    ] : []),
    ...toolGateFailures.map(item => `| ${item.case_id} | ${item.priority} | ${item.expected_tools.join(', ')} | ${item.current_selected_tool || '-'} | ${item.status_reason.replace(/\|/g, '/')} |`),
    '',
    '## 2. 用例明细',
    '',
    '| 用例 | P | 业务域 | 报表域 | 期望 tool | 当前 tool | Tool 命中 | 责任层 | 状态 |',
    '|---|---|---|---|---|---|---|---|---|',
    ...mappings.map(item => [
      item.case_id,
      item.priority,
      item.business_domain,
      item.expected_report_domain,
      item.expected_tools.length ? item.expected_tools.join(', ') : '-',
      item.current_selected_tool || '-',
      item.current_tool_match,
      item.ownership.join(', '),
      item.current_status,
    ].map(value => String(value).replace(/\|/g, '/')).join(' | ')).map(row => `| ${row} |`),
    '',
    '## 3. 说明',
    '',
    '- `partial` 不等于失败，通常表示 MCP tool 已能命中，但仍需要验证 Chat slot、后处理、UI 或 Trace。',
    '- `unknown_or_gap` 只表示当前规则或当前绑定能力无法确认，不直接等同于 MCP 缺失。',
    '- 本脚本中的推断规则仅用于测试集归属和门禁，不是生产路由事实来源；生产执行事实应来自 MCP tool schema、动态策略配置、权限上下文和知识库口径说明的分层组合。',
    '- JSON 产物包含每条用例的 slots、dictionary tools、postprocess、UI contract 和 failure categories。',
    '',
  ];
  return lines.join('\n');
}

async function main(): Promise<void> {
  const workbook = XLSX.readFile(testcasePath);
  const sheet = workbook.Sheets['广告业务测试集'] || workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<RawCase>(sheet, { defval: '' });
  if (rows.length !== 91) {
    throw new Error(`unexpected testcase count: ${rows.length}, expected 91`);
  }

  const servers = await listMcpServers();
  const mappings: TestCaseMapping[] = rows.map((row) => {
    const expected_report_domain = inferReportDomain(row);
    const expected_tools = inferExpectedTools(row, expected_report_domain);
    const expected_tool = expected_tools[0] || expectedToolFor(expected_report_domain);
    const selected = selectReportTool(
      servers,
      promptTextOf(row),
      expected_tool ? { preferredToolName: expected_tool } : undefined,
    );
    const required_slots = inferSlots(row, expected_report_domain);
    const dictionary_tools = dictionaryToolsFor(required_slots);
    const postprocess = inferPostprocess(row);
    const ui_contract = inferUiContract(row);
    const ownership = inferOwnership(expected_report_domain, required_slots, postprocess, ui_contract);
    const failure_categories = inferFailureCategories(row, required_slots, postprocess, expected_report_domain);
    const base = {
      case_id: row.用例ID,
      priority: row.优先级,
      business_domain: row.业务域,
      scenario: row.测试场景,
      user_question: row.测试输入Prompt,
      expected_result: row.预期结果,
      expected_report_domain,
      expected_tool,
      expected_tools,
      current_selected_tool: selected?.tool.name,
      current_selected_server: selected?.server.name,
      current_rule_id: selected?.entry.id,
      current_tool_match: inferToolMatch(expected_tools, selected?.tool.name),
      ownership,
      required_slots,
      dictionary_tools,
      postprocess,
      ui_contract,
      failure_categories,
    };
    return {
      ...base,
      ...inferStatus(base),
    };
  });

  await mkdir(outputDir, { recursive: true });
  await writeFile(jsonOutput, `${JSON.stringify({
    generated_at: new Date().toISOString(),
    source: testcasePath,
    total: mappings.length,
    mappings,
  }, null, 2)}\n`, 'utf8');
  await writeFile(mdOutput, renderMarkdown(mappings), 'utf8');

  const statusCounts = mappings.reduce<Record<string, number>>((acc, item) => {
    acc[item.current_status] = (acc[item.current_status] || 0) + 1;
    return acc;
  }, {});
  const toolGateFailures = mappings.filter(item => item.current_tool_match === 'mismatch' || item.current_tool_match === 'not_selected');
  console.log(`report-query testcase mapping generated: ${mappings.length} cases`);
  console.log(JSON.stringify(statusCounts, null, 2));
  console.log(jsonOutput);
  console.log(mdOutput);
  if (toolGateFailures.length) {
    console.error('report-query mapping tool gate failed');
    for (const item of toolGateFailures) {
      console.error(`${item.case_id}: expected ${item.expected_tools.join(', ')} but selected ${item.current_selected_tool || '-'}`);
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

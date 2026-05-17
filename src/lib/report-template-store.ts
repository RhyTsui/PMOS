import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { legacyDataPath, runtimeDataPath } from './runtime-data-path';
import type {
  ReportCellValue,
  ReportDraft,
  ReportDraftStatus,
  ReportExportTarget,
  ReportMetricBinding,
  ReportMetricFormatter,
  ReportSummaryCard,
  ReportTemplate,
} from '@/types';

const TEMPLATES_PATH = runtimeDataPath('report-templates.json');
const LEGACY_TEMPLATES_PATH = legacyDataPath('report-templates.json');
const DRAFTS_PATH = runtimeDataPath('report-drafts.json');
const LEGACY_DRAFTS_PATH = legacyDataPath('report-drafts.json');

interface ReportTemplatesFile {
  templates: ReportTemplate[];
}

interface ReportDraftsFile {
  drafts: ReportDraft[];
}

function nowIso(): string {
  return new Date().toISOString();
}

function metricBinding(
  metricKey: string,
  reportLabel: string,
  metricLabel: string,
  columnKey: string,
  aggregation: ReportMetricBinding['aggregation'],
  formatter: ReportMetricFormatter,
): ReportMetricBinding {
  return {
    id: `metric-${metricKey}`,
    reportKey: metricKey,
    reportLabel,
    metricKey,
    metricLabel,
    columnKey,
    aggregation,
    formatter,
    required: true,
  };
}

function defaultTemplates(): ReportTemplate[] {
  const now = nowIso();
  return [
    {
      id: 'report-template-daily-ops',
      name: '经营总览报表',
      description: '按账户与媒体汇总昨日消耗、现金消耗、转化和 ROI，适合发行晨会复盘。',
      scene: '日常经营复盘',
      frequency: 'daily',
      cronExpression: '0 9 * * *',
      enabled: true,
      reviewRequired: true,
      exportTarget: 'xiaoshan',
      sources: [
        {
          id: 'src-overview-daily',
          sourceType: 'mcp_report',
          sourceName: '投放总览报表',
          sourceRef: 'report_mcp',
          reportCode: 'ad_overview_daily',
          dimension: 'account',
          filters: ['time=yesterday'],
        },
        {
          id: 'src-attribution-daily',
          sourceType: 'mcp_attribution',
          sourceName: '归因表现报表',
          sourceRef: 'attribution_mcp',
          reportCode: 'attribution_daily',
          dimension: 'account',
          filters: ['time=yesterday'],
        },
      ],
      metricBindings: [
        metricBinding('cost', '投放总览报表', '总消耗', '总消耗', 'sum', 'currency'),
        metricBinding('cash_consumption', '投放总览报表', '现金消耗', '现金消耗', 'sum', 'currency'),
        metricBinding('impression', '投放总览报表', '曝光', '曝光', 'sum', 'integer'),
        metricBinding('click', '投放总览报表', '点击', '点击', 'sum', 'integer'),
        metricBinding('conversion', '归因表现报表', '转化', '转化', 'sum', 'integer'),
        metricBinding('roi', '归因表现报表', 'ROI', 'ROI', 'avg', 'decimal'),
      ],
      narrativeFocus: ['关注现金消耗是否超节奏', '识别高消耗低回收账户', '给出今日预算收放建议'],
      createdBy: 'system',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'report-template-channel-weekly',
      name: '渠道对比报表',
      description: '按媒体对比近 7 天消耗、转化、CPA 和 ROI，适合做预算再分配。',
      scene: '渠道预算复盘',
      frequency: 'weekly',
      cronExpression: '0 10 * * 1',
      enabled: true,
      reviewRequired: true,
      exportTarget: 'xiaoshan',
      sources: [
        {
          id: 'src-channel-weekly',
          sourceType: 'mcp_report',
          sourceName: '渠道效果报表',
          sourceRef: 'report_mcp',
          reportCode: 'media_compare_weekly',
          dimension: 'media',
          filters: ['time=last_7_days'],
        },
      ],
      metricBindings: [
        metricBinding('cost', '渠道效果报表', '总消耗', '总消耗', 'sum', 'currency'),
        metricBinding('cash_consumption', '渠道效果报表', '现金消耗', '现金消耗', 'sum', 'currency'),
        metricBinding('conversion', '渠道效果报表', '转化', '转化', 'sum', 'integer'),
        metricBinding('cpa', '渠道效果报表', 'CPA', 'CPA', 'avg', 'currency'),
        metricBinding('roi', '渠道效果报表', 'ROI', 'ROI', 'avg', 'decimal'),
      ],
      narrativeFocus: ['定位增量渠道', '识别高 CPA 渠道', '给出下周预算偏向建议'],
      createdBy: 'system',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'report-template-budget-risk',
      name: '预算风险报表',
      description: '按项目检查预算进度、现金消耗和 ROI 预警，适合日内巡检和人工复核。',
      scene: '预算风险巡检',
      frequency: 'custom',
      cronExpression: '0 14 * * *',
      enabled: true,
      reviewRequired: true,
      exportTarget: 'xiaoshan',
      sources: [
        {
          id: 'src-budget-monitor',
          sourceType: 'mcp_monitor',
          sourceName: '预算监控报表',
          sourceRef: 'monitor_mcp',
          reportCode: 'budget_monitor_daily',
          dimension: 'project',
          filters: ['time=today'],
        },
      ],
      metricBindings: [
        metricBinding('budget', '预算监控报表', '预算', '预算', 'latest', 'currency'),
        metricBinding('cash_consumption', '预算监控报表', '现金消耗', '现金消耗', 'sum', 'currency'),
        metricBinding('budget_progress', '预算监控报表', '预算进度', '预算进度', 'latest', 'percent'),
        metricBinding('roi', '预算监控报表', 'ROI', 'ROI', 'avg', 'decimal'),
      ],
      narrativeFocus: ['识别预算超前项目', '识别高消耗低 ROI 项目', '提醒发行人工收口'],
      createdBy: 'system',
      createdAt: now,
      updatedAt: now,
    },
  ];
}

function normalizeTemplate(input: Partial<ReportTemplate>): ReportTemplate {
  const now = nowIso();
  return {
    id: input.id || `report-template-${Date.now()}`,
    name: input.name?.trim() || '未命名模板',
    description: input.description?.trim() || '',
    scene: input.scene?.trim() || '自定义报表',
    frequency: input.frequency || 'daily',
    cronExpression: input.cronExpression?.trim() || '',
    enabled: input.enabled ?? true,
    reviewRequired: input.reviewRequired ?? true,
    exportTarget: (input.exportTarget || 'xiaoshan') as ReportExportTarget,
    sources: Array.isArray(input.sources) ? input.sources : [],
    metricBindings: Array.isArray(input.metricBindings) ? input.metricBindings : [],
    narrativeFocus: Array.isArray(input.narrativeFocus) ? input.narrativeFocus : [],
    linkedScheduledTaskId: input.linkedScheduledTaskId?.trim() || undefined,
    createdBy: input.createdBy?.trim() || 'user-001',
    createdAt: input.createdAt || now,
    updatedAt: input.updatedAt || now,
  };
}

function normalizeDraft(input: Partial<ReportDraft>): ReportDraft {
  const now = nowIso();
  return {
    id: input.id || `report-draft-${Date.now()}`,
    templateId: input.templateId || '',
    templateName: input.templateName || '未命名模板',
    reportDate: input.reportDate || now.slice(0, 10),
    status: (input.status || 'draft') as ReportDraftStatus,
    reviewRequired: input.reviewRequired ?? true,
    exportTarget: (input.exportTarget || 'xiaoshan') as ReportExportTarget,
    summary: input.summary || '',
    narrative: Array.isArray(input.narrative) ? input.narrative : [],
    columns: Array.isArray(input.columns) ? input.columns : [],
    rows: Array.isArray(input.rows) ? input.rows : [],
    summaryCards: Array.isArray(input.summaryCards) ? input.summaryCards : [],
    sourceSnapshots: Array.isArray(input.sourceSnapshots) ? input.sourceSnapshots : [],
    generatedAt: input.generatedAt || now,
    reviewedAt: input.reviewedAt,
    exportedAt: input.exportedAt,
  };
}

async function readTemplatesFile(): Promise<ReportTemplatesFile> {
  for (const templatesPath of [TEMPLATES_PATH, LEGACY_TEMPLATES_PATH]) {
    try {
      const raw = await readFile(templatesPath, 'utf8');
      const parsed = JSON.parse(raw) as Partial<ReportTemplatesFile>;
      return {
        templates: Array.isArray(parsed.templates) ? parsed.templates.map(normalizeTemplate) : [],
      };
    } catch {
      // 尝试下一个存储位置。
    }
  }
  return { templates: [] };
}

async function writeTemplatesFile(file: ReportTemplatesFile): Promise<void> {
  await mkdir(path.dirname(TEMPLATES_PATH), { recursive: true });
  await writeFile(TEMPLATES_PATH, JSON.stringify(file, null, 2), 'utf8');
}

async function readDraftsFile(): Promise<ReportDraftsFile> {
  for (const draftsPath of [DRAFTS_PATH, LEGACY_DRAFTS_PATH]) {
    try {
      const raw = await readFile(draftsPath, 'utf8');
      const parsed = JSON.parse(raw) as Partial<ReportDraftsFile>;
      return {
        drafts: Array.isArray(parsed.drafts) ? parsed.drafts.map(normalizeDraft) : [],
      };
    } catch {
      // 尝试下一个存储位置。
    }
  }
  return { drafts: [] };
}

async function writeDraftsFile(file: ReportDraftsFile): Promise<void> {
  await mkdir(path.dirname(DRAFTS_PATH), { recursive: true });
  await writeFile(DRAFTS_PATH, JSON.stringify(file, null, 2), 'utf8');
}

export async function listReportTemplates(): Promise<ReportTemplate[]> {
  const file = await readTemplatesFile();
  return file.templates.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getReportTemplate(id: string): Promise<ReportTemplate | undefined> {
  const templates = await listReportTemplates();
  return templates.find(template => template.id === id);
}

export async function createReportTemplate(data: Partial<ReportTemplate>): Promise<ReportTemplate> {
  const file = await readTemplatesFile();
  const next = normalizeTemplate({ ...data, createdAt: nowIso(), updatedAt: nowIso() });
  file.templates = [...file.templates, next];
  await writeTemplatesFile(file);
  return next;
}

export async function updateReportTemplate(id: string, patch: Partial<ReportTemplate>): Promise<ReportTemplate | undefined> {
  const file = await readTemplatesFile();
  const current = file.templates.find(template => template.id === id);
  if (!current) return undefined;
  const next = normalizeTemplate({ ...current, ...patch, id, createdAt: current.createdAt, updatedAt: nowIso() });
  file.templates = file.templates.map(template => (template.id === id ? next : template));
  await writeTemplatesFile(file);
  return next;
}

export async function deleteReportTemplate(id: string): Promise<boolean> {
  const file = await readTemplatesFile();
  const before = file.templates.length;
  file.templates = file.templates.filter(template => template.id !== id);
  if (file.templates.length === before) return false;
  await writeTemplatesFile(file);
  return true;
}

export async function listReportDrafts(templateId?: string): Promise<ReportDraft[]> {
  const file = await readDraftsFile();
  return file.drafts
    .filter(draft => !templateId || draft.templateId === templateId)
    .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
}

export async function getReportDraft(id: string): Promise<ReportDraft | undefined> {
  const drafts = await listReportDrafts();
  return drafts.find(draft => draft.id === id);
}

export async function updateReportDraft(id: string, patch: Partial<ReportDraft>): Promise<ReportDraft | undefined> {
  const file = await readDraftsFile();
  const current = file.drafts.find(draft => draft.id === id);
  if (!current) return undefined;
  const next = normalizeDraft({ ...current, ...patch, id });
  file.drafts = file.drafts.map(draft => (draft.id === id ? next : draft));
  await writeDraftsFile(file);
  return next;
}

export async function createReportDraftFromTemplate(template: ReportTemplate, reportDate: string): Promise<ReportDraft> {
  const file = await readDraftsFile();
  const draft = normalizeDraft(generateDraft(template, reportDate));
  file.drafts = [draft, ...file.drafts.filter(item => item.id !== draft.id)].slice(0, 50);
  await writeDraftsFile(file);
  return draft;
}

function generateDraft(template: ReportTemplate, reportDate: string): Partial<ReportDraft> {
  const rows = buildRows(template, reportDate);
  const columns = ['主体', ...template.metricBindings.map(binding => binding.columnKey)];
  const summaryCards = buildSummaryCards(template.metricBindings, rows);
  const focusEntity = String(rows[0]?.主体 || '重点主体');
  const totalCost = summaryCards.find(card => card.label === '总消耗')?.value;
  const totalCash = summaryCards.find(card => card.label === '现金消耗')?.value;
  const totalRoi = summaryCards.find(card => card.label === 'ROI')?.value;
  const weakestRoiRow = rows
    .filter(row => typeof row.ROI === 'number')
    .sort((a, b) => Number(a.ROI) - Number(b.ROI))[0];

  return {
    id: `report-draft-${Date.now()}`,
    templateId: template.id,
    templateName: template.name,
    reportDate,
    status: 'draft',
    reviewRequired: template.reviewRequired,
    exportTarget: template.exportTarget,
    summary: `${template.name} 已生成待复核草稿，覆盖 ${rows.length} 个主体，当前建议优先关注 ${focusEntity}。`,
    narrative: [
      `本次报表基于“${template.scene}”场景生成，重点跟踪 ${template.metricBindings.map(item => item.metricLabel).join('、')}。`,
      `当前总消耗 ${formatForNarrative(totalCost)}，现金消耗 ${formatForNarrative(totalCash)}，整体 ROI ${formatForNarrative(totalRoi)}。`,
      weakestRoiRow
        ? `${String(weakestRoiRow.主体)} 的 ROI 相对偏低，建议优先检查现金消耗、投放目标与素材承接。`
        : '当前未识别到明显异常主体，建议按模板重点项逐一复核。',
      template.narrativeFocus.length
        ? `建议复核重点：${template.narrativeFocus.join('；')}。`
        : '建议复核重点：预算进度、现金消耗和低效主体。',
    ],
    columns,
    rows,
    summaryCards,
    sourceSnapshots: template.sources.map(source => ({
      sourceName: source.sourceName,
      sourceRef: source.sourceRef,
      reportCode: source.reportCode,
      status: source.sourceRef.includes('internal') ? 'mock' : 'ready',
      note: source.sourceRef.includes('internal')
        ? '当前使用本地示例数据生成，接通真实报表服务后可替换。'
        : '已纳入本次报表聚合范围。',
    })),
    generatedAt: nowIso(),
  };
}

function buildRows(template: ReportTemplate, reportDate: string): Record<string, ReportCellValue>[] {
  const dimension = template.sources[0]?.dimension || 'account';
  const dimensionValues = dimension === 'media'
    ? ['巨量引擎', '抖音', '快手']
    : dimension === 'project'
      ? ['项目 A', '项目 B', '项目 C']
      : ['账户 A', '账户 B', '账户 C'];

  return dimensionValues.map((entity, index) => {
    const row: Record<string, ReportCellValue> = { 主体: entity };
    for (const binding of template.metricBindings) {
      row[binding.columnKey] = generateMetricValue(binding.metricKey, entity, reportDate, index);
    }
    return row;
  });
}

function generateMetricValue(metricKey: string, entity: string, reportDate: string, index: number): number {
  const seed = parseInt(createHash('md5').update(`${metricKey}:${entity}:${reportDate}:${index}`).digest('hex').slice(0, 8), 16);
  switch (metricKey) {
    case 'cost':
      return 10000 + (seed % 180000);
    case 'cash_consumption':
      return 8000 + (seed % 150000);
    case 'budget':
      return 50000 + (seed % 300000);
    case 'budget_progress':
      return Number((0.35 + (seed % 55) / 100).toFixed(2));
    case 'impression':
      return 300000 + (seed % 800000);
    case 'click':
      return 12000 + (seed % 50000);
    case 'conversion':
      return 500 + (seed % 5000);
    case 'cpa':
      return Number((30 + (seed % 120)).toFixed(2));
    case 'roi':
      return Number((0.6 + (seed % 180) / 100).toFixed(2));
    default:
      return seed % 1000;
  }
}

function buildSummaryCards(bindings: ReportMetricBinding[], rows: Record<string, ReportCellValue>[]): ReportSummaryCard[] {
  return bindings.slice(0, 4).map(binding => {
    const values = rows.map(row => Number(row[binding.columnKey] || 0)).filter(value => Number.isFinite(value));
    let value = 0;
    if (binding.aggregation === 'avg' || binding.aggregation === 'latest') {
      value = values.length ? Number((values.reduce((sum, item) => sum + item, 0) / values.length).toFixed(2)) : 0;
    } else {
      value = values.reduce((sum, item) => sum + item, 0);
    }
    return {
      label: binding.metricLabel,
      value: formatMetricValue(value, binding.formatter),
      formatter: binding.formatter,
      trend: value > 0 ? 'up' : 'stable',
    };
  });
}

function formatMetricValue(value: number, formatter: ReportMetricFormatter): number | string {
  if (formatter === 'currency') return `¥${Math.round(value).toLocaleString('zh-CN')}`;
  if (formatter === 'percent') return `${Math.round(value * 100)}%`;
  if (formatter === 'integer') return Math.round(value).toLocaleString('zh-CN');
  if (formatter === 'decimal') return value.toFixed(2);
  return String(value);
}

function formatForNarrative(value: number | string | undefined): string {
  if (value === undefined || value === null || value === '') return '--';
  return String(value);
}

export function buildXiaoshanReportMarkdown(draft: ReportDraft): string {
  const headline = `# ${draft.templateName}\n\n报表日期：${draft.reportDate}\n状态：${draft.status}`;
  const summary = `\n\n## 摘要\n${draft.summary}`;
  const narrative = `\n\n## 解读\n${draft.narrative.map(item => `- ${item}`).join('\n')}`;
  const tableHeader = `\n\n## 宽表预览\n| ${draft.columns.join(' | ')} |\n| ${draft.columns.map(() => '---').join(' | ')} |`;
  const tableRows = draft.rows.slice(0, 10)
    .map(row => `| ${draft.columns.map(column => String(row[column] ?? '--')).join(' | ')} |`)
    .join('\n');
  return [headline, summary, narrative, tableHeader, tableRows].join('\n');
}

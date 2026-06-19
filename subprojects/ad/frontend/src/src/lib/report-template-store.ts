import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { runtimeDataPath } from './runtime-data-path';
import type {
  ReportDraft,
  ReportDraftStatus,
  ReportExportTarget,
  ReportMetricBinding,
  ReportMetricFormatter,
  ReportTemplate,
} from '@/types';

const TEMPLATES_PATH = runtimeDataPath('report-templates.json');
const TEMPLATE_RESULTS_PATH = runtimeDataPath('report-template-results.json');
const LEGACY_TEMPLATES_PATH = TEMPLATES_PATH;
const LEGACY_TEMPLATE_RESULTS_PATH = TEMPLATE_RESULTS_PATH;
const LEGACY_DRAFTS_PATH = TEMPLATE_RESULTS_PATH;

interface ReportTemplatesFile {
  templates: ReportTemplate[];
}

interface ReportDraftsFile {
  drafts: ReportDraft[];
}

export class ReportDraftGenerationUnavailableError extends Error {
  readonly code = 'REPORT_DRAFT_REAL_DATA_REQUIRED';
  readonly status = 409;

  constructor(template: ReportTemplate, reportDate: string) {
    super(`未找到可用于生成「${template.name}」${reportDate} 报告模板结果的真实数据来源，已停止生成。请先接入真实报表数据或上传可校验的数据文件。`);
    this.name = 'ReportDraftGenerationUnavailableError';
  }
}

export function isReportDraftGenerationUnavailableError(
  error: unknown,
): error is ReportDraftGenerationUnavailableError {
  return error instanceof ReportDraftGenerationUnavailableError
    || (typeof error === 'object'
      && error !== null
      && 'code' in error
      && (error as { code?: unknown }).code === 'REPORT_DRAFT_REAL_DATA_REQUIRED');
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

function sourceBinding(
  id: string,
  sourceName: string,
  reportCode: string,
  dimension: string,
  filters: string[],
): ReportTemplate['sources'][number] {
  return {
    id,
    sourceType: 'mcp_report',
    sourceName,
    sourceRef: 'report_mcp',
    reportCode,
    dimension,
    filters,
  };
}

function defaultTemplates(): ReportTemplate[] {
  const now = nowIso();
  return [
    {
      id: 'report-template-game-project-daily-v06',
      name: '游戏项目投放日报',
      description: '按业务日报模板汇总项目总数据、广告量、媒体、应用类型、团队和 iOS 自然量扣除口径，适合每日发行复盘。',
      scene: '游戏项目每日投放复盘',
      frequency: 'daily',
      cronExpression: '0 9 * * *',
      enabled: true,
      reviewRequired: true,
      exportTarget: 'xiaoshan',
      sources: [
        sourceBinding('src-game-daily-overview', '项目总数据', 'game_project_daily_overview', 'project', ['time=yesterday']),
        sourceBinding('src-game-daily-ad-volume', '广告量', 'game_project_ad_volume_daily', 'project', ['time=yesterday']),
        sourceBinding('src-game-daily-media', '各媒体流量', 'game_project_media_daily', 'media', ['time=yesterday']),
        sourceBinding('src-game-daily-app-type', '各应用类型流量', 'game_project_app_type_daily', 'app_type', ['time=yesterday']),
        sourceBinding('src-game-daily-media-app-type', '各媒体各应用类型流量', 'game_project_media_app_type_daily', 'media_app_type', ['time=yesterday']),
        sourceBinding('src-game-daily-team', '各团队流量', 'game_project_team_daily', 'team', ['time=yesterday']),
        sourceBinding('src-game-daily-team-app-type', '各团队各应用类型流量', 'game_project_team_app_type_daily', 'team_app_type', ['time=yesterday']),
        sourceBinding('src-game-daily-team-media', '各团队媒体流量', 'game_project_team_media_daily', 'team_media', ['time=yesterday']),
        sourceBinding('src-game-daily-team-media-app-type', '各团队各媒体各应用类型流量', 'game_project_team_media_app_type_daily', 'team_media_app_type', ['time=yesterday']),
      ],
      metricBindings: [
        metricBinding('cost', '项目总数据', '消耗', '消耗', 'sum', 'currency'),
        metricBinding('cash_consumption', '项目总数据', '现金消耗', '现金消耗', 'sum', 'currency'),
        metricBinding('activation', '广告量', '激活数', '激活数', 'sum', 'integer'),
        metricBinding('register', '广告量', '注册数', '注册数', 'sum', 'integer'),
        metricBinding('register_rate', '广告量', '注册率', '注册率', 'avg', 'percent'),
        metricBinding('activation_cost', '广告量', '激活成本', '激活成本', 'avg', 'currency'),
        metricBinding('register_cost', '广告量', '注册成本', '注册成本', 'avg', 'currency'),
        metricBinding('retention_d1', '项目总数据', '次留率', '次留率', 'avg', 'percent'),
        metricBinding('new_pay_user', '项目总数据', '首日新充人数', '首日新充人数', 'sum', 'integer'),
        metricBinding('new_pay_amount', '项目总数据', '首日新充金额', '首日新充金额', 'sum', 'currency'),
        metricBinding('pay_rate', '项目总数据', '首日付费率', '首日付费率', 'avg', 'percent'),
        metricBinding('arppu', '项目总数据', '首日ARPPU', '首日ARPPU', 'avg', 'currency'),
        metricBinding('roi', '项目总数据', '首日ROI', '首日ROI', 'avg', 'percent'),
        metricBinding('ios_organic_deducted_cost', '扣除 iOS 自然量', '扣除iOS自然量后消耗', '扣除iOS自然量后消耗', 'sum', 'currency'),
        metricBinding('ios_organic_undeducted_cost', '不扣除 iOS 自然量', '不扣除iOS自然量消耗', '不扣除iOS自然量消耗', 'sum', 'currency'),
        metricBinding('ios_share_deducted_cost', '扣除 iOS 分成比例', '扣除iOS分成后消耗', '扣除iOS分成后消耗', 'sum', 'currency'),
      ],
      narrativeFocus: [
        '先看项目总数据和广告量，确认昨日整体消耗、激活、注册和首日 ROI。',
        '按媒体、应用类型、团队逐层下钻，定位流量结构变化。',
        '同时展示扣除 iOS 自然量、不扣除 iOS 自然量、扣除 iOS 分成比例三套口径，避免复盘时混用。',
        '若发现空值、异常波动或口径缺失，先进入数据异常检查，不直接输出结论。',
      ],
      createdBy: 'system',
      createdAt: now,
      updatedAt: now,
    },
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
    id: input.id || `report-template-${Date.now()}`,
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
        templates: Array.isArray(parsed.templates) ? parsed.templates.map(normalizeTemplate) : defaultTemplates(),
      };
    } catch {
      // 尝试下一个存储位置。
    }
  }
  return { templates: defaultTemplates() };
}

async function writeTemplatesFile(file: ReportTemplatesFile): Promise<void> {
  await mkdir(path.dirname(TEMPLATES_PATH), { recursive: true });
  await writeFile(TEMPLATES_PATH, JSON.stringify(file, null, 2), 'utf8');
}

async function readDraftsFile(): Promise<ReportDraftsFile> {
  for (const draftsPath of [TEMPLATE_RESULTS_PATH, LEGACY_TEMPLATE_RESULTS_PATH, LEGACY_DRAFTS_PATH]) {
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
  await mkdir(path.dirname(TEMPLATE_RESULTS_PATH), { recursive: true });
  await writeFile(TEMPLATE_RESULTS_PATH, JSON.stringify(file, null, 2), 'utf8');
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
  throw new ReportDraftGenerationUnavailableError(template, reportDate);
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

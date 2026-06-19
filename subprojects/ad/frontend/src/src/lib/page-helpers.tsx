import type {
  AgentType, AttachmentRecord, AttachmentInsight, AutomationTemplateConfig,
  Message, MissingField, ProjectBinding, ScheduleFrequency, ScheduledTask,
  ScheduledTaskExecution, WorkflowResult,
} from '@/types';
import type { CurrentProjectMetadata } from '@/components/yokaui/ProjectSelectorCombo';
import { Select } from 'antd';
import { ChevronDown, Loader2 } from 'lucide-react';
import { IconAsset } from '@/components/ui/IconAsset';
import { AssetPreview } from '@/components/cognitive/AssetPreview';

export const WORKSPACE_VIEW_STORAGE_KEY = 'zhitou-chat-workspace-view';

// ---- Types ----

export type WorkspaceView = 'chat' | 'assets' | 'automation';
export type AssetCategory = 'image' | 'link' | 'video' | 'file';
export type AssetSourceFilter = 'all' | 'uploaded' | 'generated';
export type AssetFormatFilter = 'all' | 'image' | 'video' | 'document' | 'spreadsheet' | 'slides' | 'pdf';
export type AutomationTab = 'configured' | 'runs' | 'templates';
export type ProjectContextLoadStatus = 'loading' | 'ready' | 'failed';

// ---- Interfaces ----

export interface AssetRecord {
  id: string;
  title: string;
  category: AssetCategory;
  format: string;
  summary: string;
  source: string;
  updatedAt: string;
  conversationId: string;
  anchorText: string;
  previewTone: string;
  previewSupported?: boolean;
  thumbnailStatus?: 'generated' | 'generating' | 'unsupported' | 'failed';
  thumbnailUrl?: string;
  thumbnailPrompt?: string;
  assetUrl?: string;
  downloadUrl?: string;
  insight?: AttachmentInsight;
  projectBinding?: ProjectBinding;
}

export interface ConversationSearchHit {
  conversation_id: string;
  title: string;
  updated_at: string;
  matchCount: number;
  snippets: string[];
}

export function SharePlaneIcon({ size = 17 }: { size?: number }) {
  return <IconAsset name="share-plane" size={size} />;
}

export interface AutomationTemplate {
  id: string;
  title: string;
  description: string;
  typeLabel: string;
  cadence: string;
  prompt: string;
  metrics: string[];
  dimensions: string[];
}

export interface AutomationRunRecord {
  id: string;
  task: ScheduledTask;
  execution: ScheduledTaskExecution;
}

export interface AutomationTaskDraft {
  name: string;
  description: string;
  frequency: ScheduleFrequency;
  run_time: string;
  cron_expression: string;
  monitor_metrics: string;
  dimension: string;
  notify_on_failure: boolean;
  notify_on_success: boolean;
  alert_targets: string;
}

// ---- Constants ----

export const CHAT_WORKSPACE_BACKGROUND = [
  'radial-gradient(circle at 16% 58%, rgba(219, 234, 254, 0.62) 0%, rgba(219, 234, 254, 0) 28%)',
  'radial-gradient(circle at 86% 46%, rgba(224, 242, 254, 0.68) 0%, rgba(224, 242, 254, 0) 30%)',
  'radial-gradient(circle at 56% 96%, rgba(240, 253, 250, 0.5) 0%, rgba(240, 253, 250, 0) 34%)',
  'linear-gradient(180deg, #f8faff 0%, #f4f7fc 52%, #f7f9fc 100%)',
].join(', ');

export const ASSET_SOURCE_FILTERS: Array<{ key: AssetSourceFilter; label: string }> = [
  { key: 'all', label: '全部来源' },
  { key: 'uploaded', label: '已上传' },
  { key: 'generated', label: '已生成' },
];

export const ASSET_FORMAT_FILTERS: Array<{ key: AssetFormatFilter; label: string }> = [
  { key: 'all', label: '全部类型' },
  { key: 'image', label: '图片' },
  { key: 'video', label: '视频' },
  { key: 'document', label: '文档' },
  { key: 'spreadsheet', label: '电子表格' },
  { key: 'slides', label: '演示文稿' },
  { key: 'pdf', label: 'PDF' },
];

export const ASSET_LIBRARY: AssetRecord[] = [
  {
    id: 'asset-001',
    title: '安卓回传联调说明',
    category: 'file',
    format: 'Word',
    summary: '包含回传链路、字段映射、验收口径和常见异常处理说明。',
    source: '会话沉淀',
    updatedAt: '今天',
    conversationId: 'conv_004',
    anchorText: '联调准备清单',
    previewTone: '#4f7cff',
  },
  {
    id: 'asset-002',
    title: '投放日报模板',
    category: 'file',
    format: 'Excel',
    summary: '用于汇总分媒体消耗、转化、归因和异常监控结果。',
    source: 'AI 生成',
    updatedAt: '今天',
    conversationId: 'conv_001',
    anchorText: '巨量激活报表',
    previewTone: '#16a34a',
  },
  {
    id: 'asset-003',
    title: 'SKAN 归因口径说明',
    category: 'file',
    format: 'PDF',
    summary: '沉淀版本差异、回传窗口、媒体限制和投放注意事项。',
    source: '知识沉淀',
    updatedAt: '昨天',
    conversationId: 'conv_003',
    anchorText: 'SKAN 归因口径',
    previewTone: '#ef4444',
  },
  {
    id: 'asset-004',
    title: '高价值事件素材图',
    category: 'image',
    format: 'PNG',
    summary: '用于复核埋点和投放素材是否与事件命名一致。',
    source: '上传图片',
    updatedAt: '昨天',
    conversationId: 'conv_002',
    anchorText: '高价值事件素材图',
    previewTone: '#0ea5e9',
  },
  {
    id: 'asset-005',
    title: '媒体平台排查录屏',
    category: 'video',
    format: 'MP4',
    summary: '展示异常重现过程、操作路径和控制台日志定位过程。',
    source: '会话产物',
    updatedAt: '2 天前',
    conversationId: 'conv_001',
    anchorText: '异常重现过程',
    previewTone: '#7c3aed',
  },
  {
    id: 'asset-006',
    title: '企业账户白名单入口',
    category: 'link',
    format: '链接',
    summary: '可直接进入白名单配置页，方便在会话里发起排查和复核。',
    source: '外部链接',
    updatedAt: '3 天前',
    conversationId: 'conv_005',
    anchorText: '白名单配置页',
    previewTone: '#f59e0b',
  },
  {
    id: 'asset-007',
    title: '自动联调结果归档',
    category: 'file',
    format: 'PDF',
    summary: '会话中生成的联调结论、修复建议和来源引用归档文件。',
    source: 'AI 生成',
    updatedAt: '3 天前',
    conversationId: 'conv_004',
    anchorText: '联调结论归档',
    previewTone: '#ef4444',
  },
  {
    id: 'asset-008',
    title: '渠道投放素材库',
    category: 'image',
    format: 'JPG',
    summary: '近期投放使用的素材预览和落地页截图，便于交叉核对。',
    source: '上传图片',
    updatedAt: '5 天前',
    conversationId: 'conv_002',
    anchorText: '投放素材预览',
    previewTone: '#0ea5e9',
  },
  {
    id: 'asset-009',
    title: '项目排查 SOP',
    category: 'file',
    format: 'Word',
    summary: '沉淀问题排查流程、证据要求、升级条件和结果回写规范。',
    source: '知识沉淀',
    updatedAt: '1 周前',
    conversationId: 'conv_001',
    anchorText: '排查流程',
    previewTone: '#4f7cff',
  },
  {
    id: 'asset-010',
    title: '投放监控看板',
    category: 'link',
    format: '链接',
    summary: '跳转到实时监控看板，适合在会话中引用数据和截图。',
    source: '外部链接',
    updatedAt: '1 周前',
    conversationId: 'conv_005',
    anchorText: '实时监控看板',
    previewTone: '#f59e0b',
  },
  {
    id: 'asset-011',
    title: '归因异常样例视频',
    category: 'video',
    format: 'MP4',
    summary: '典型归因偏差案例与修复前后效果对比视频。',
    source: '会话产物',
    updatedAt: '1 周前',
    conversationId: 'conv_001',
    anchorText: '归因偏差案例',
    previewTone: '#7c3aed',
  },
  {
    id: 'asset-012',
    title: '文件写入权限清单',
    category: 'file',
    format: 'Excel',
    summary: '列出当前支持写入和生成的 Word、Excel、PDF 资产范围。',
    source: '权限清单',
    updatedAt: '1 周前',
    conversationId: 'conv_002',
    anchorText: '文件写入权限',
    previewTone: '#16a34a',
  },
];

export const FALLBACK_AUTOMATION_TEMPLATES: AutomationTemplate[] = [
  {
    id: 'daily-report',
    title: '投放日报',
    description: '每天汇总核心投放指标，快速判断昨日消耗、转化和 ROI 是否正常。',
    typeLabel: '日报',
    cadence: '每天 09:00',
    prompt: '为当前项目创建每天 09:00 的广告投放日报，按媒体、账户汇总消耗、激活、注册、付费和 ROI，并生成适合复制到邮件的表格和解读。',
    metrics: ['消耗', '激活', '注册', '付费', 'ROI'],
    dimensions: ['媒体', '账户'],
  },
  {
    id: 'weekly-report',
    title: '投放周报',
    description: '每周汇总项目表现，沉淀趋势变化、异常点和下周关注项。',
    typeLabel: '周报',
    cadence: '每周一 09:00',
    prompt: '为当前项目创建每周一 09:00 的广告投放周报，按媒体、账户、广告标签汇总消耗、激活、ROI，并生成适合复制到邮件的表格和解读。',
    metrics: ['消耗', '激活', 'ROI'],
    dimensions: ['媒体', '账户', '广告标签'],
  },
  {
    id: 'monthly-report',
    title: '投放月报',
    description: '每月输出趋势、对比、结构变化和可执行优化建议。',
    typeLabel: '月报',
    cadence: '每月第 1 天 09:00',
    prompt: '为当前项目创建每月第 1 天 09:00 的广告投放月报，按媒体、账户、流量类型和广告标签汇总消耗、激活、付费、ROI，输出趋势、异常点和优化建议。',
    metrics: ['消耗', '激活', '付费', 'ROI'],
    dimensions: ['媒体', '账户', '流量类型', '广告标签'],
  },
  {
    id: 'traffic-classification',
    title: '流量分类报表',
    description: '按流量类型、媒体和广告标签聚合表现，定位结构变化和效率差异。',
    typeLabel: '分类分析',
    cadence: '每周一 10:00',
    prompt: '为当前项目创建每周一 10:00 的流量分类报表，按流量类型、媒体、广告标签聚合消耗、激活、ROI，并输出结构变化、异常分类和建议关注项。',
    metrics: ['消耗', '激活', 'ROI'],
    dimensions: ['流量类型', '媒体', '广告标签'],
  },
];

export const AUTOMATION_TABS: Array<{ key: AutomationTab; label: string }> = [
  { key: 'configured', label: '已配置' },
  { key: 'runs', label: '运行记录' },
  { key: 'templates', label: '任务模板' },
];

export const AUTOMATION_FREQUENCY_OPTIONS: Array<{ value: ScheduleFrequency; label: string; description: string }> = [
  { value: 'daily', label: '每天', description: '适合日报和日常复盘' },
  { value: 'weekly', label: '每周', description: '适合周报和周期汇总' },
  { value: 'hourly', label: '每小时', description: '适合高频监控' },
  { value: 'every_30min', label: '每 30 分钟', description: '适合波动提醒' },
  { value: 'every_15min', label: '每 15 分钟', description: '适合关键链路观察' },
  { value: 'every_5min', label: '每 5 分钟', description: '适合短时验证' },
];

export const AUTOMATION_RUN_TIME_OPTIONS = [
  '08:00',
  '09:00',
  '10:00',
  '12:00',
  '18:00',
  '20:00',
].map((value) => ({ value, label: value }));

export const AUTOMATION_METRIC_OPTIONS = [
  '消耗',
  '激活',
  '注册',
  '付费',
  'ROI',
  'ROAS',
  '留存',
  'ARPPU',
].map((value) => ({ value, label: value }));

export const AUTOMATION_DIMENSION_OPTIONS = [
  '媒体',
  '账户',
  '应用',
  '计划',
  '素材',
  '日期',
  '小时',
  '终端',
].map((value) => ({ value, label: value }));

export const AUTOMATION_TYPE_LABELS: Record<AutomationTemplateConfig['template_type'], string> = {
  daily_report: '日报',
  weekly_report: '周报',
  monthly_report: '月报',
  traffic_classification: '分类分析',
  table_merge: '拼表',
  tag_summary: '标签汇总',
  custom: '自定义',
};

// ---- Helper Functions ----

export function getAutomationCadence(template: AutomationTemplateConfig) {
  if (template.default_cron_expression === '0 9 * * *') return '每天 09:00';
  if (template.default_cron_expression === '0 9 * * 1') return '每周一 09:00';
  if (template.default_cron_expression === '0 10 * * 1') return '每周一 10:00';
  if (template.default_cron_expression === '0 9 1 * *') return '每月 1 日 09:00';
  return template.default_cron_expression || template.default_frequency;
}

export function mapAutomationTemplate(template: AutomationTemplateConfig): AutomationTemplate {
  return {
    id: template.id,
    title: template.name,
    description: template.description,
    typeLabel: AUTOMATION_TYPE_LABELS[template.template_type] || '自定义',
    cadence: getAutomationCadence(template),
    prompt: template.prompt_template,
    metrics: template.metrics,
    dimensions: template.dimensions,
  };
}

export function splitAutomationList(value: string) {
  return value.split(/[\n,，、]/).map((item) => item.trim()).filter(Boolean);
}

export function joinAutomationList(values: string[]) {
  return values.map((item) => item.trim()).filter(Boolean).join('、');
}

export function runTimeFromCronExpression(cronExpression?: string) {
  const parts = String(cronExpression || '').trim().split(/\s+/);
  if (parts.length < 2) return '09:00';
  const minute = Number(parts[0]);
  const hour = Number(parts[1]);
  if (!Number.isFinite(minute) || !Number.isFinite(hour)) return '09:00';
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function buildAutomationCronExpression(frequency: ScheduleFrequency, runTime: string) {
  const [hourRaw, minuteRaw] = runTime.split(':');
  const hour = Math.min(23, Math.max(0, Number(hourRaw) || 9));
  const minute = Math.min(59, Math.max(0, Number(minuteRaw) || 0));
  if (frequency === 'daily') return `${minute} ${hour} * * *`;
  if (frequency === 'weekly') return `${minute} ${hour} * * 1`;
  if (frequency === 'hourly') return `${minute} * * * *`;
  if (frequency === 'every_30min') return '*/30 * * * *';
  if (frequency === 'every_15min') return '*/15 * * * *';
  if (frequency === 'every_5min') return '*/5 * * * *';
  return `${minute} ${hour} * * *`;
}

export function isTimeAwareFrequency(frequency: ScheduleFrequency) {
  return frequency === 'daily' || frequency === 'weekly' || frequency === 'hourly';
}

export function normalizeProjectRef(project?: CurrentProjectMetadata | null) {
  const raw = project?.appId;
  return raw === undefined || raw === null ? '' : String(raw).trim();
}

export function resolveProjectBindingRef(binding?: ProjectBinding | null) {
  if (!binding || binding.project_refs.length === 0) return '';
  return (
    binding.default_project_ref
    || binding.last_active_project_ref
    || binding.project_refs[0]
    || ''
  ).trim();
}

export function normalizeProjectBindingSignature(binding?: ProjectBinding | null) {
  const projectRefs = Array.isArray(binding?.project_refs)
    ? binding?.project_refs.map((item) => String(item).trim()).filter(Boolean)
    : [];
  const sourceProjectRefs = Array.isArray(binding?.source_project_refs)
    ? binding?.source_project_refs.map((item) => String(item).trim()).filter(Boolean)
    : [];
  return JSON.stringify({
    project_refs: projectRefs,
    default_project_ref: binding?.default_project_ref?.trim() || '',
    last_active_project_ref: binding?.last_active_project_ref?.trim() || '',
    source_project_refs: sourceProjectRefs,
  });
}

export function buildProjectBinding(project?: CurrentProjectMetadata | null): ProjectBinding | undefined {
  const projectRef = normalizeProjectRef(project);
  if (!projectRef) return undefined;
  return {
    project_refs: [projectRef],
    default_project_ref: projectRef,
    last_active_project_ref: projectRef,
    source_project_refs: [projectRef],
  };
}

export function buildProjectContextText(project?: CurrentProjectMetadata | null) {
  const projectRef = normalizeProjectRef(project);
  if (!projectRef || !project?.appName) return '项目范围：未选择项目';
  return `项目范围：${project.appName}(APPID:${projectRef})`;
}

export function extractExplicitProjectTarget(messageText: string) {
  const cleaned = messageText.replace(/\[项目上下文\][\s\S]*$/, '').trim();
  if (!cleaned) return '';
  const cueMatch = /(?:切换到|切到|切换为|换成|换到|改成|改为|使用|用)\s*([^\n，。！？,]+)/i.exec(cleaned)?.[1]?.trim();
  const appIdMatch = /(?:APPID|appId|app_id|project_id|projectId|应用ID|项目ID)[:：=\s]+([A-Za-z0-9_-]+)/i.exec(cleaned)?.[1]?.trim();
  const target = cueMatch || appIdMatch || '';
  if (!target) return '';
  if (/^(当前|本|这个|该|此)(项目|应用|APPID)?$/i.test(target)) return '';
  return target;
}

export function isProjectBoundObjectVisible(projectBinding: ProjectBinding | undefined, currentProjectRef: string) {
  if (!projectBinding || projectBinding.project_refs.length === 0) return true;
  if (!currentProjectRef) return true;
  return projectBinding.project_refs.includes(currentProjectRef);
}

export function shouldWaitForProjectContext(messageText: string, hasProject: boolean) {
  if (hasProject) return false;
  const normalized = messageText.trim().toLowerCase();
  if (!normalized) return false;
  return [
    '当前项目',
    '本项目',
    '这个项目',
    '当前应用',
    '本应用',
    'appid',
    'app id',
    '项目数据',
    '项目指标',
  ].some((keyword) => normalized.includes(keyword));
}

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

export function extractStringListFromResult(value: unknown, keys: string[]): string[] {
  const record = asRecord(value);
  for (const key of keys) {
    const item = record[key];
    if (Array.isArray(item)) return item.map((entry) => String(entry).trim()).filter(Boolean);
    if (typeof item === 'string' && item.trim()) return splitAutomationList(item);
  }
  return [];
}

export function buildAutomationDraftFromResult(result: WorkflowResult | Record<string, unknown> | null, fallbackMessage: string): Partial<AutomationTaskDraft> | null {
  if (!result) return null;
  const payload = asRecord(asRecord(result).structured_payload || result);
  const messageContract = asRecord(asRecord(result).message_contract);
  const summary = String(
    asRecord(messageContract.business_summary).brief
      || asRecord(result).summary
      || asRecord(result).answer
      || asRecord(payload).message
      || fallbackMessage
      || '按本次问数结果定时生成报表',
  ).trim();
  const metrics = extractStringListFromResult(payload, ['metrics', 'monitor_metrics', 'metric_names', 'columns'])
    .filter((item) => !/日期|时间|媒体|账户|计划|素材|维度/.test(item));
  const dimensions = extractStringListFromResult(payload, ['dimensions', 'dimension_names', 'group_by']);
  return {
    name: summary.slice(0, 24) || '定时报表',
    description: summary,
    monitor_metrics: joinAutomationList(metrics.slice(0, 8)) || '消耗、激活、ROI',
    dimension: joinAutomationList(dimensions.slice(0, 6)) || '媒体、账户',
  };
}

export function getExecutionStatusLabel(status: ScheduledTaskExecution['status']) {
  if (['success', 'succeeded'].includes(status)) return { text: '成功', color: '#047857', bg: '#ecfdf3' };
  if (status === 'partial_succeeded') return { text: '部分完成', color: '#b7791f', bg: '#fff7e6' };
  if (status === 'running' || status === 'queued') return { text: '处理中', color: '#2563eb', bg: '#eaf2ff' };
  if (status === 'cancelled') return { text: '已取消', color: '#667085', bg: '#f2f4f7' };
  return { text: '失败', color: '#b42318', bg: '#fee4e2' };
}

export function formatJsonPreview(value: unknown) {
  if (value === undefined || value === null) return '无';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function getAssetFileName(asset: AssetRecord) {
  if (asset.format === '链接') return asset.title;
  return asset.title.includes('.') ? asset.title : `${asset.title}.${asset.format.toLowerCase()}`;
}

export function getAssetTypeLabel(asset: AssetRecord) {
  if (asset.category === 'image') return '图片';
  if (asset.category === 'video') return '视频';
  if (asset.category === 'link') return '链接';
  return asset.format;
}

export function isPreviewSupported(asset: AssetRecord) {
  return asset.previewSupported ?? (asset.category === 'image' || asset.category === 'video');
}

export function getAssetPreview(asset: AssetRecord) {
  return (
    <AssetPreview
      kind={asset.category}
      format={asset.format}
      previewUrl={asset.thumbnailUrl}
      tone={asset.previewTone}
      thumbnailStatus={asset.thumbnailStatus}
    />
  );
}

export function getAttachmentCategory(attachment: AttachmentRecord): AssetCategory {
  if (attachment.kind === 'image') return 'image';
  if (attachment.kind === 'video') return 'video';
  return 'file';
}

export function getAttachmentFormat(attachment: AttachmentRecord) {
  const name = attachment.name.toLowerCase();
  if (attachment.kind === 'image') return name.endsWith('.jpg') || name.endsWith('.jpeg') ? 'JPG' : name.endsWith('.webp') ? 'WEBP' : 'PNG';
  if (attachment.kind === 'video') return name.endsWith('.mov') ? 'MOV' : 'MP4';
  if (attachment.kind === 'table') return name.endsWith('.csv') ? 'CSV' : 'Excel';
  if (name.endsWith('.pdf')) return 'PDF';
  if (name.endsWith('.doc') || name.endsWith('.docx')) return 'Word';
  if (name.endsWith('.txt') || name.endsWith('.log')) return 'TXT';
  return '文件';
}

export function attachmentToAsset(
  attachment: AttachmentRecord,
  conversationTitle?: string,
): AssetRecord {
  const category = getAttachmentCategory(attachment);
  const format = getAttachmentFormat(attachment);
  return {
    id: attachment.id,
    title: attachment.name,
    category,
    format,
    summary: attachment.summary || '已在会话中引用的文件。',
    source: '已上传',
    updatedAt: new Date(attachment.created_at).toLocaleDateString('zh-CN'),
    conversationId: attachment.conversation_id,
    anchorText: conversationTitle || '相关会话',
    previewTone: category === 'video' ? '#7c3aed' : category === 'image' ? '#0ea5e9' : format === 'Excel' || format === 'CSV' ? '#16a34a' : '#4f7cff',
    previewSupported: category === 'image' || category === 'video',
    thumbnailStatus: attachment.thumbnail_status,
    thumbnailUrl: attachment.preview_image_url || attachment.thumbnail_url || attachment.cover_url,
    assetUrl: attachment.asset_url || attachment.url,
    downloadUrl: attachment.asset_url || attachment.url,
    insight: attachment.insight,
    projectBinding: attachment.project_binding,
  };
}

const MB = 1024 * 1024;
export const MAX_UPLOAD_FILES = 10;
const MAX_UPLOAD_SIZE_BY_KIND: Record<AttachmentRecord['kind'], number> = {
  image: 20 * MB,
  video: 200 * MB,
  document: 50 * MB,
  table: 50 * MB,
  log: 50 * MB,
};
const PREVIEW_MAX_EDGE = 320;

export function inferAttachmentKind(file: File): AttachmentRecord['kind'] {
  const name = file.name.toLowerCase();
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  if (name.endsWith('.xls') || name.endsWith('.xlsx') || name.endsWith('.csv')) return 'table';
  if (name.endsWith('.log') || name.endsWith('.txt') || name.endsWith('.json')) return 'log';
  return 'document';
}

export function validateUploadFile(file: File) {
  const kind = inferAttachmentKind(file);
  const limit = MAX_UPLOAD_SIZE_BY_KIND[kind] || 20 * MB;
  if (file.size > limit) {
    return `${file.name} 超过 ${Math.round(limit / MB)}MB，请压缩后再上传。`;
  }
  return '';
}

export function canvasToBlob(canvas: HTMLCanvasElement, timeoutMs: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(null), timeoutMs);
    canvas.toBlob((blob) => {
      window.clearTimeout(timer);
      resolve(blob);
    }, 'image/webp', 0.78);
  });
}

export async function createImageThumbnail(file: File): Promise<{ blob: Blob; width: number; height: number } | null> {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      const timer = window.setTimeout(() => reject(new Error('thumbnail timeout')), 2000);
      img.onload = () => {
        window.clearTimeout(timer);
        resolve(img);
      };
      img.onerror = () => {
        window.clearTimeout(timer);
        reject(new Error('thumbnail failed'));
      };
      img.src = url;
    });
    const scale = Math.min(1, PREVIEW_MAX_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await canvasToBlob(canvas, 2000);
    return blob ? { blob, width: image.naturalWidth, height: image.naturalHeight } : null;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function createVideoCover(file: File): Promise<{ blob: Blob; width: number; height: number; durationMs: number } | null> {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.src = url;
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error('video metadata timeout')), 5000);
      video.onloadedmetadata = () => {
        window.clearTimeout(timer);
        resolve();
      };
      video.onerror = () => {
        window.clearTimeout(timer);
        reject(new Error('video metadata failed'));
      };
    });
    const targetTime = Number.isFinite(video.duration) && video.duration > 0 ? Math.min(1, video.duration * 0.1) : 0;
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error('video seek timeout')), 5000);
      video.onseeked = () => {
        window.clearTimeout(timer);
        resolve();
      };
      video.onerror = () => {
        window.clearTimeout(timer);
        reject(new Error('video seek failed'));
      };
      video.currentTime = targetTime;
    });
    const width = video.videoWidth || PREVIEW_MAX_EDGE;
    const height = video.videoHeight || PREVIEW_MAX_EDGE;
    const scale = Math.min(1, PREVIEW_MAX_EDGE / Math.max(width, height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await canvasToBlob(canvas, 5000);
    return blob ? { blob, width, height, durationMs: Math.round((video.duration || 0) * 1000) } : null;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}


// ---- Knowledge / Workspace Helpers ----

export function getKnowledgeSourceDetails(message: Message | null): Array<{ title: string; source?: string; url?: string; prompt?: string }> {
  const meta = message?.metadata || {};
  const rawRefs = [meta.source_refs, meta.sourceRefs, meta.sources, meta.citations]
    .find((item) => Array.isArray(item)) as unknown[] | undefined;
  const refs = (rawRefs || []).map((item) => {
    if (typeof item === 'string') return { title: item };
    if (item && typeof item === 'object') {
      const obj = item as Record<string, unknown>;
      return {
        title: String(obj.title || obj.name || obj.source || obj.id || '知识库来源'),
        source: obj.source ? String(obj.source) : undefined,
        url: obj.url ? String(obj.url) : undefined,
        prompt: obj.prompt ? String(obj.prompt) : undefined,
      };
    }
    return null;
  }).filter((item): item is { title: string; source?: string; url?: string; prompt?: string } => Boolean(item));

  const knowledge = meta.knowledge_base;
  if (knowledge && typeof knowledge === 'object') {
    const obj = knowledge as Record<string, unknown>;
    refs.unshift({
      title: String(obj.provider || '知识库'),
      source: obj.dataset ? `知识库 ID：${String(obj.dataset)}` : undefined,
      url: obj.address ? String(obj.address) : undefined,
    });
  }

  return refs;
}

export function getInitialWorkspaceView(): WorkspaceView {
  if (typeof window === 'undefined') return 'chat';
  const params = new URLSearchParams(window.location.search);
  const view = params.get('view');
  if (view === 'assets' || view === 'automation') return view;
  try {
    const stored = window.localStorage.getItem(WORKSPACE_VIEW_STORAGE_KEY);
    return stored === 'assets' || stored === 'automation' ? stored : 'chat';
  } catch {
    return 'chat';
  }
}

export function getResultMissingFields(result: WorkflowResult | null): MissingField[] {
  if (!result?.structured_payload || typeof result.structured_payload !== 'object') return [];
  const rawFields = (result.structured_payload as Record<string, unknown>).missing_fields;
  return Array.isArray(rawFields) ? rawFields as MissingField[] : [];
}

export function FilterSelect<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  width,
}: {
  value: T;
  options: Array<{ key: T; label: string }>;
  onChange: (value: T) => void;
  ariaLabel: string;
  width: number;
}) {
  return (
    <Select
      className="zhitou-filter-select"
      classNames={{ popup: { root: 'zhitou-filter-select-popup' } }}
      value={value}
      onChange={(nextValue) => onChange(nextValue as T)}
      options={options.map((item) => ({ value: item.key, label: item.label }))}
      aria-label={ariaLabel}
      data-filter-select={ariaLabel}
      size="middle"
      variant="borderless"
      suffixIcon={<ChevronDown size={14} />}
      popupMatchSelectWidth={width}
      style={{ width, height: 34 }}
    />
  );
}


export function LoadingSkeletonRows({
  rows = 4,
  minHeight,
}: {
  rows?: number;
  minHeight?: number;
}) {
  return (
    <div
      data-loading-skeleton
      style={{
        display: 'grid',
        gap: 10,
        minHeight,
      }}
    >
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          style={{
            height: index === 0 ? 72 : 64,
            borderRadius: 12,
            border: '1px solid rgba(219, 228, 240, 0.78)',
            background: 'linear-gradient(90deg, #ffffff 0%, #f6f9fd 42%, #ffffff 84%)',
            backgroundSize: '220% 100%',
            animation: 'xq-skeleton-shimmer 1.25s ease-in-out infinite',
          }}
        />
      ))}
    </div>
  );
}

export function SharedConversationLoadingPanel({
  isMobile,
  pageSidePadding,
}: {
  isMobile: boolean;
  pageSidePadding: number;
}) {
  return (
    <div
      data-shared-conversation-loading
      style={{
        flex: 1,
        minHeight: 0,
        overflow: 'auto',
        padding: `4px ${isMobile ? '18px' : pageSidePadding}px ${isMobile ? '12px' : '20px'}`,
      }}
    >
      <div style={{ maxWidth: 900, margin: '0 auto', paddingTop: isMobile ? 12 : 20 }}>
        <LoadingSkeletonRows rows={isMobile ? 5 : 6} minHeight={isMobile ? 520 : 620} />
      </div>
    </div>
  );
}

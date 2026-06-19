import { getAttachment, listCommittedAttachments } from './attachment-store';
import { getAutomationTemplate } from './automation-template-store';
import type { AutomationDraftSuggestion, AttachmentRecord, ScheduledTaskType } from '@/types';

function unique(values: string[]) {
  return Array.from(new Set(values.map((item) => String(item).trim()).filter(Boolean)));
}

function normalizeText(value: unknown) {
  return String(value ?? '').trim();
}

function inferFrequency(text: string, fallback: AutomationDraftSuggestion['frequency'] = 'daily') {
  const value = text.toLowerCase();
  if (/每小时|hourly|小时/.test(value)) return 'hourly';
  if (/每周|周报|weekly/.test(value)) return 'weekly';
  if (/每月|月报|monthly/.test(value)) return 'custom_cron';
  if (/每15分钟/.test(value)) return 'every_15min';
  if (/每30分钟/.test(value)) return 'every_30min';
  if (/每5分钟/.test(value)) return 'every_5min';
  return fallback;
}

function inferTaskType(text: string): ScheduledTaskType {
  const value = text.toLowerCase();
  if (/提醒|告警|报警|异常|风险/.test(value)) return 'alert_check';
  if (/健康|巡检|检查/.test(value)) return 'health_check';
  return 'report_generate';
}

function inferTriggerType(message: string, attachments: AttachmentRecord[]): AutomationDraftSuggestion['trigger_type'] {
  if (attachments.length > 0) return 'file_upload';
  const lower = message.toLowerCase();
  if (/cron|定时|每天|每周|每月|周期/.test(lower)) return 'cron';
  if (/阈值|告警|提醒|异常/.test(lower)) return 'metric_threshold';
  return 'manual';
}

function buildCronByFrequency(frequency: AutomationDraftSuggestion['frequency']) {
  if (frequency === 'hourly') return '0 * * * *';
  if (frequency === 'weekly') return '0 9 * * 1';
  if (frequency === 'custom_cron') return '0 9 1 * *';
  if (frequency === 'daily') return '0 9 * * *';
  return undefined;
}

function buildMissingFields(parts: {
  metrics: string[];
  dimensions: string[];
  cronExpression?: string;
  triggerType: AutomationDraftSuggestion['trigger_type'];
}) {
  const missing = [];
  if (parts.metrics.length === 0) missing.push('指标');
  if (parts.dimensions.length === 0) missing.push('维度');
  if (parts.triggerType === 'cron' && !parts.cronExpression) missing.push('执行时间');
  return missing;
}

async function loadAttachments(scopeKey: string, attachmentIds: string[], conversationId?: string) {
  const attachments = [];
  const requestedIds = new Set(attachmentIds.filter(Boolean));
  if (requestedIds.size > 0) {
    for (const id of requestedIds) {
      const attachment = await getAttachment(id, scopeKey);
      if (attachment && (!conversationId || attachment.conversation_id === conversationId)) {
        attachments.push(attachment);
      }
    }
    return attachments;
  }
  const listed = await listCommittedAttachments(scopeKey);
  return conversationId
    ? listed.filter((item) => item.conversation_id === conversationId)
    : listed;
}

export async function buildAutomationDraftSuggestion(params: {
  scopeKey: string;
  conversationId?: string;
  attachmentIds?: string[];
  message?: string;
  templateId?: string;
}): Promise<AutomationDraftSuggestion> {
  const message = normalizeText(params.message);
  const attachments = await loadAttachments(params.scopeKey, params.attachmentIds || [], params.conversationId);
  const template = params.templateId ? await getAutomationTemplate(params.scopeKey, params.templateId) : undefined;

  const insightMetrics = unique(attachments.flatMap((attachment) => attachment.insight?.metrics || []));
  const insightDimensions = unique(attachments.flatMap((attachment) => attachment.insight?.dimensions || []));
  const insightDates = unique(attachments.flatMap((attachment) => attachment.insight?.date_ranges || []));
  const requirementMetrics = unique(attachments.flatMap((attachment) => attachment.insight?.report_requirement?.metrics || []));
  const requirementDimensions = unique(attachments.flatMap((attachment) => attachment.insight?.report_requirement?.dimensions || []));
  const templateMetrics = template?.metrics || [];
  const templateDimensions = template?.dimensions || [];

  const metrics = unique([...requirementMetrics, ...insightMetrics, ...templateMetrics]);
  const dimensions = unique([...requirementDimensions, ...insightDimensions, ...templateDimensions]);
  const sourceAttachmentIds = unique([
    ...attachments.map((attachment) => attachment.id),
    ...attachments.flatMap((attachment) => attachment.insight?.report_requirement?.source_attachment_ids || []),
  ]);

  const summary = attachments
    .map((attachment) => attachment.summary || attachment.insight?.summary || attachment.name)
    .filter(Boolean)
    .slice(0, 3)
    .join('；');
  const sourceRefs = attachments.map((attachment) => ({
    id: attachment.id,
    title: attachment.name,
    summary: attachment.summary || attachment.insight?.summary,
  }));
  const combinedText = [
    message,
    template?.name || '',
    template?.description || '',
    summary,
    ...attachments.map((attachment) => attachment.name),
    ...attachments.flatMap((attachment) => attachment.insight?.metrics || []),
    ...attachments.flatMap((attachment) => attachment.insight?.dimensions || []),
    ...attachments.flatMap((attachment) => attachment.insight?.date_ranges || []),
  ].join('\n');
  const triggerType = inferTriggerType(combinedText, attachments);
  const frequency = inferFrequency(combinedText, template?.default_frequency || 'daily');
  const taskType = inferTaskType(combinedText);
  const cronExpression = template?.default_cron_expression || buildCronByFrequency(frequency);
  const outputFormats: AutomationDraftSuggestion['output_formats'] = taskType === 'alert_check'
    ? ['markdown', 'json']
    : ['markdown', 'excel'];

  return {
    name: template?.name || attachments[0]?.name?.replace(/\.[^.]+$/, '') || '自动化任务',
    description: template?.description || summary || '基于上传内容自动生成结果，并写入我的资产。',
    task_type: taskType,
    trigger_type: triggerType,
    frequency,
    cron_expression: cronExpression,
    monitor_metrics: metrics,
    dimensions,
    alert_channels: ['in_app'],
    alert_targets: [],
    output_formats: outputFormats,
    source_attachment_ids: sourceAttachmentIds,
    source_refs: sourceRefs,
    missing_fields: buildMissingFields({ metrics, dimensions, cronExpression, triggerType }),
    confidence: attachments.length > 0 || template ? 'high' : message ? 'medium' : 'low',
    reason: attachments.length > 0
      ? '已根据上传文件中的内容、摘要和结构化识别结果自动补全。'
      : template
        ? '已根据模板默认配置自动补全。'
        : '已根据当前输入自动补全常用配置。',
  };
}

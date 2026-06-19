import { decodeReportActionEnvelope } from '@/lib/report-action-envelope';
import type { BusinessContextSnapshot, CompiledContextPackage } from '@/types';

export function readSlotText(slot: BusinessContextSnapshot[keyof BusinessContextSnapshot]): string {
  if (!slot || typeof slot !== 'object' || !('value' in slot)) return '';
  const value = slot.value;
  return Array.isArray(value) ? String(value[0] || '') : String(value || '');
}

export function readSlotList(slot: BusinessContextSnapshot[keyof BusinessContextSnapshot]): string[] {
  if (!slot || typeof slot !== 'object' || !('value' in slot)) return [];
  const value = slot.value;
  return Array.isArray(value) ? value.map(String).filter(Boolean) : String(value || '').split(/[,，、]/).map(item => item.trim()).filter(Boolean);
}

export function readStructuredDateRange(params?: Record<string, unknown>): { start_date: string; end_date: string } | null {
  if (!params || typeof params !== 'object') return null;
  const direct = params.date_range;
  if (direct && typeof direct === 'object' && !Array.isArray(direct)) {
    const directRange = direct as Record<string, unknown>;
    const startDate = typeof directRange.start_date === 'string' ? directRange.start_date : typeof directRange.startDate === 'string' ? directRange.startDate : '';
    const endDate = typeof directRange.end_date === 'string' ? directRange.end_date : typeof directRange.endDate === 'string' ? directRange.endDate : '';
    if (startDate && endDate) return { start_date: startDate, end_date: endDate };
  }
  if (typeof direct === 'string') {
    const match = /^(\d{4}-\d{1,2}-\d{1,2})~(\d{4}-\d{1,2}-\d{1,2})$/.exec(direct);
    if (match) return { start_date: match[1], end_date: match[2] };
  }
  const requested = params.requested_date_range;
  if (requested && typeof requested === 'object' && !Array.isArray(requested)) {
    const requestedRange = requested as Record<string, unknown>;
    const startDate = typeof requestedRange.start_date === 'string' ? requestedRange.start_date : typeof requestedRange.startDate === 'string' ? requestedRange.startDate : '';
    const endDate = typeof requestedRange.end_date === 'string' ? requestedRange.end_date : typeof requestedRange.endDate === 'string' ? requestedRange.endDate : '';
    if (startDate && endDate) return { start_date: startDate, end_date: endDate };
  }
  return null;
}

function normalizedProjectText(value: unknown): string {
  return String(value || '').replace(/\s+/g, '').toLowerCase();
}

function projectMatchTerms(project: NonNullable<CompiledContextPackage['project']['availableProjects']>[number]): string[] {
  return Array.from(new Set([
    project.appName,
    project.appAlias,
    project.appEnName,
    project.projectName,
    project.packageName,
    project.appId != null ? `app${project.appId}` : '',
    project.appId != null ? `appid${project.appId}` : '',
  ].map(item => normalizedProjectText(item)).filter(item => item.length >= 2)));
}

function resolveAppIdFromAvailableProjects(message: string, compiledContext?: CompiledContextPackage | null): string {
  const text = normalizedProjectText(message);
  if (!text) return '';
  const projects = compiledContext?.project?.availableProjects || [];
  const matches = projects
    .map(project => ({ project, score: Math.max(0, ...projectMatchTerms(project).map(term => text.includes(term) ? term.length : 0)) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);
  if (!matches.length) return '';
  const bestScore = matches[0].score;
  const bestMatches = matches.filter(item => item.score === bestScore);
  if (bestMatches.length !== 1) return '';
  const appId = bestMatches[0].project.appId;
  return appId == null ? '' : String(appId);
}

export function buildReportQueryInput(message: string, compiledContext?: CompiledContextPackage | null, userScopeKey?: string): Record<string, unknown> {
  const structuredAction = decodeReportActionEnvelope(message);
  const actionParams = structuredAction?.params || {};
  const routedMessage = typeof actionParams.original_message === 'string' ? actionParams.original_message : structuredAction?.label || message;
  const appId = /(?:APPID|appId|app_id|project_id|projectId|app|应用id|项目id)[:：=\s]*([0-9]+)/i.exec(routedMessage)?.[1];
  const contextAppId = readSlotText(compiledContext?.businessContext.app);
  const structuredProject = compiledContext?.project.currentProject;
  const structuredProjectAppId = structuredProject?.appId ?? structuredProject?.projectId;
  const structuredProjectName = structuredProject?.appName || structuredProject?.projectName || structuredProject?.packageName || structuredProject?.mediaName;
  const timeRange = readSlotText(compiledContext?.businessContext.timeRange);
  const timeRangeMatch = /^(\d{4}-\d{1,2}-\d{1,2})~(\d{4}-\d{1,2}-\d{1,2})$/.exec(timeRange);
  const structuredDateRange = readStructuredDateRange(structuredAction?.params as Record<string, unknown> | undefined);
  const metrics = readSlotList(compiledContext?.businessContext.metrics);
  const dimensions = readSlotList(compiledContext?.businessContext.dimensions);
  const projectMatchedAppId = resolveAppIdFromAvailableProjects(routedMessage, compiledContext);
  const resolvedAppId = appId || projectMatchedAppId || (structuredProjectAppId ? String(structuredProjectAppId) : '') || (/^\d+$/.test(contextAppId) ? contextAppId : '');
  return {
    ...(userScopeKey ? { user_scope_key: userScopeKey } : {}),
    ...(resolvedAppId ? { appId: resolvedAppId, project_scope: [resolvedAppId] } : { project_scope: ['current_project'] }),
    ...(structuredProject ? {
      project_context: {
        appId: structuredProject.appId ?? undefined,
        appName: structuredProject.appName || undefined,
        projectId: structuredProject.projectId ?? undefined,
        projectName: structuredProject.projectName || undefined,
        packageName: structuredProject.packageName || undefined,
        platform: structuredProject.platform || undefined,
        channel: structuredProject.channel || undefined,
        media: structuredProject.media || undefined,
        mediaName: structuredProject.mediaName || undefined,
      },
      ...(structuredProjectName ? { project_name: structuredProjectName } : {}),
    } : {}),
    ...(structuredDateRange ? structuredDateRange : timeRangeMatch ? { start_date: timeRangeMatch[1], end_date: timeRangeMatch[2] } : {}),
    ...(structuredAction ? { follow_up_action: structuredAction.action || structuredAction.label, follow_up_action_label: structuredAction.label, follow_up_action_params: structuredAction.params } : {}),
    ...(structuredAction?.action === 'select_entity_candidate' && typeof actionParams.entityType === 'string' && typeof actionParams.candidateId === 'string' ? {
      selected_entities: [{
        entityType: actionParams.entityType,
        identifierKey: actionParams.identifierKey,
        id: actionParams.candidateId,
        name: actionParams.candidateName,
      }],
    } : {}),
    ...(metrics.length ? { metrics } : {}),
    ...(dimensions.length ? { dimensions } : {}),
  };
}

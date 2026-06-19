import { buildCompiledContextPackage } from '@/lib/context-compiler';
import { decodeReportActionEnvelope } from '@/lib/report-action-envelope';
import type { CompiledContextPackage, IntentType } from '@/types';
import { isRecord } from './payload-compact';
import { readSlotText } from './report-query-input';
import type { UserScope } from '@/lib/user-scope';

export interface ChatProjectRequestBody {
  history?: Array<{ role: string; content: string; createdAt?: string; id?: string; message_id?: string; intent_type?: string; metadata?: Record<string, unknown>; evidence_ids?: string[] }>;
  projectContext?: string;
  metadata?: {
    projectContext?: string;
    project_context?: string;
    currentProject?: {
      appId?: string | number;
      appName?: string;
      appAlias?: string;
      projectId?: string | number;
      projectName?: string;
      packageName?: string;
      platform?: string;
      channel?: string;
      media?: string;
      mediaName?: string;
      app_id?: string | number;
      app_name?: string;
      app_alias?: string;
      project_id?: string | number;
      project_name?: string;
      package_name?: string;
      platform_name?: string;
      channel_name?: string;
      media_name?: string;
    } | null;
    projectContextDebug?: Record<string, unknown>;
    [key: string]: unknown;
  };
}

export interface ProjectContextSummary {
  metadataProjectContextPresent: boolean;
  metadataCurrentProjectPresent: boolean;
  metadataProjectContextAppId?: string;
  metadataCurrentProjectAppId?: string;
  compiledBusinessContextAppPresent: boolean;
  compiledBusinessContextAppId?: string;
  appIdSource: 'metadata.projectContext' | 'compiledContext.businessContext.app' | 'metadata.currentProject' | 'none';
  frontendDebug?: Record<string, unknown>;
  warnings: string[];
}

export function cleanQuestion(message: string): string {
  const action = decodeReportActionEnvelope(message);
  const originalMessage = action?.params && typeof action.params.original_message === 'string'
    ? action.params.original_message
    : undefined;
  const source = originalMessage || action?.label || message;
  return source
    .replace(/\n\n\[(?:\u9879\u76ee\u4e0a\u4e0b\u6587)\][\s\S]*$/i, '')
    .trim();
}

export function projectItemFromProjectContext(projectContext?: string) {
  const text = projectContext?.trim();
  if (!text) return null;
  const appId = /(?:APPID|appId|app_id|project_id|projectId|应用ID|项目ID)[:：=\s]+([A-Za-z0-9_-]+)/i.exec(text)?.[1];
  const appName = /(?:项目范围|当前项目|项目)[:：]\s*([^\n(（]+)/.exec(text)?.[1]?.trim();
  if (!appId && !appName) return null;
  return { appId, appName };
}

export function projectItemFromStructuredCurrentProject(currentProject: NonNullable<ChatProjectRequestBody['metadata']>['currentProject']) {
  if (!isRecord(currentProject)) return null;
  const appId = currentProject.appId ?? currentProject.app_id;
  const appName = currentProject.appName || currentProject.app_name;
  const appAlias = currentProject.appAlias || currentProject.app_alias;
  const projectId = currentProject.projectId ?? currentProject.project_id;
  const projectName = currentProject.projectName || currentProject.project_name;
  const packageName = currentProject.packageName || currentProject.package_name;
  const platform = currentProject.platform || currentProject.platform_name;
  const channel = currentProject.channel || currentProject.channel_name;
  const media = currentProject.media;
  const mediaName = currentProject.mediaName || currentProject.media_name;
  if (!appId && !appName && !projectId && !projectName && !packageName && !platform && !channel && !media && !mediaName) return null;
  return {
    appId,
    appName,
    appAlias,
    projectId,
    projectName,
    packageName,
    platform,
    channel,
    media,
    mediaName,
  };
}

export function readMetadataProjectContext(body: Partial<ChatProjectRequestBody>): string {
  const value = body.metadata?.projectContext || body.metadata?.project_context || body.projectContext;
  return typeof value === 'string' ? value : '';
}

export function readAppIdFromProjectContext(projectContext?: string): string {
  return /(?:APPID|appId|app_id|project_id|projectId|应用ID|项目ID)[:：=\s]+([A-Za-z0-9_-]+)/i.exec(projectContext || '')?.[1] || '';
}

export function buildProjectContextSummary(
  body: Partial<ChatProjectRequestBody>,
  compiledContext?: CompiledContextPackage | null,
): ProjectContextSummary {
  const metadataProjectContext = readMetadataProjectContext(body);
  const metadataProjectContextAppId = readAppIdFromProjectContext(metadataProjectContext);
  const metadataCurrentProject = isRecord(body.metadata?.currentProject) ? body.metadata.currentProject : null;
  const metadataCurrentProjectAppId = metadataCurrentProject?.appId ? String(metadataCurrentProject.appId) : '';
  const compiledBusinessContextAppId = readSlotText(compiledContext?.businessContext.app);
  const warnings = Array.isArray(body.metadata?.projectContextDebug?.warnings)
    ? body.metadata.projectContextDebug.warnings.map(String)
    : [];
  if (metadataProjectContextAppId && metadataCurrentProjectAppId && metadataProjectContextAppId !== metadataCurrentProjectAppId) {
    warnings.push(`currentProject.appId(${metadataCurrentProjectAppId}) 与 projectContext(${metadataProjectContextAppId}) 不一致，未改变后端主解析逻辑。`);
  }
  return {
    metadataProjectContextPresent: Boolean(metadataProjectContext.trim()),
    metadataCurrentProjectPresent: Boolean(metadataCurrentProject),
    ...(metadataProjectContextAppId ? { metadataProjectContextAppId } : {}),
    ...(metadataCurrentProjectAppId ? { metadataCurrentProjectAppId } : {}),
    compiledBusinessContextAppPresent: Boolean(compiledBusinessContextAppId),
    ...(compiledBusinessContextAppId ? { compiledBusinessContextAppId } : {}),
    appIdSource: metadataProjectContextAppId
      ? 'metadata.projectContext'
      : compiledBusinessContextAppId
        ? 'compiledContext.businessContext.app'
        : metadataCurrentProjectAppId
          ? 'metadata.currentProject'
          : 'none',
    frontendDebug: isRecord(body.metadata?.projectContextDebug) ? body.metadata.projectContextDebug : undefined,
    warnings: [...new Set(warnings)],
  };
}

export async function compileChatContext(params: {
  body: Partial<ChatProjectRequestBody>;
  message: string;
  conversationId: string;
  userScopeKey: string;
  userScope?: UserScope | null;
}): Promise<CompiledContextPackage> {
  const hiddenProjectContext = readMetadataProjectContext(params.body);
  const structuredCurrentProject = projectItemFromStructuredCurrentProject(params.body.metadata?.currentProject);
  const fallbackProject = projectItemFromProjectContext(typeof hiddenProjectContext === 'string' ? hiddenProjectContext : undefined);
  const currentProject = structuredCurrentProject || fallbackProject || params.userScope?.current_project || null;
  const userProjects = Array.isArray(params.userScope?.projects) ? params.userScope.projects : [];
  const projects = currentProject
    ? [currentProject, ...userProjects.filter(item => String(item.app_id || item.id || '') !== String((currentProject as any).app_id || (currentProject as any).appId || (currentProject as any).id || ''))]
    : userProjects;
  return buildCompiledContextPackage({
    scopeKey: params.userScopeKey || params.conversationId,
    user: {
      uid: params.userScope?.uid,
      account: params.userScope?.account || 'current-user',
      user_name: params.userScope?.user_name || 'current-user',
      real_name: params.userScope?.real_name,
      current: currentProject,
      projects,
    },
    message: cleanQuestion(params.message),
    conversation: {
      conversation_id: params.conversationId,
      recent_messages: (params.body.history || []).map((item) => ({
        role: item.role === 'assistant' || item.role === 'system' ? item.role : 'user',
        content: item.content,
        createdAt: item.createdAt,
        id: item.id,
        message_id: item.message_id,
        intent_type: item.intent_type as IntentType | undefined,
        metadata: item.metadata,
        evidence_ids: item.evidence_ids,
      })),
    },
  });
}

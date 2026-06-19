import type {
  AgentType,
  CompiledContextPackage,
  IntentType,
  McpSkill,
  Message,
  RoleProfile,
  TaskStatus,
  UserPreferenceProfile,
} from '@/types';
import { getDefaultRoleProfile, listRoleProfiles } from './role-profile-store';
import { getOrCreateUserPreferenceProfile, summarizePreferenceProfile } from './user-preference-store';
import { buildBusinessContextSnapshot } from './conversation-context';
import { deriveRequestRouteDecision } from './request-understanding';
import { resolveSlots } from './slot-resolver';
import { DEFAULT_NEW_USER_ROLE_ID, normalizeInternalRoleId } from './zhitou-role-mapping';

export interface ContextCompilerMessage {
  role: Message['role'];
  content: string;
  createdAt?: string;
  id?: string;
  message_id?: string;
  intent_type?: IntentType;
  metadata?: Record<string, unknown>;
  evidence_ids?: string[];
}

export interface ContextCompilerProjectItem {
  appId?: string | number;
  appName?: string;
  appAlias?: string;
  appEnName?: string;
  appTypes?: string[];
  status?: string;
  icon?: string;
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
  app_en_name?: string;
  app_types?: string[] | string | number | null;
  app_type?: string | number | string[];
  project_id?: string | number;
  project_name?: string;
  package_name?: string;
  platform_name?: string;
  channel_name?: string;
  media_name?: string;
}

export interface ContextCompilerInput {
  scopeKey: string;
  user: {
    uid?: number;
    account: string;
    user_name: string;
    real_name?: string;
    current?: ContextCompilerProjectItem | null;
    projects?: ContextCompilerProjectItem[];
  };
  message?: string;
  conversation?: {
    conversation_id?: string;
    title?: string;
    current_mode?: string;
    recent_messages?: ContextCompilerMessage[];
    temporary_role?: string;
    temporary_constraints?: string[];
  };
  task?: {
    task_id?: string;
    task_type?: string;
    workflow_level?: 'light' | 'heavy';
    status?: string;
    summary?: string;
    blockers?: string[];
    next_actions?: string[];
    latest_result_id?: string;
    latest_evidence_ids?: string[];
  };
  featureSwitches?: Array<{ key: string; enabled: boolean; name?: string; label?: string }>;
  mcpServers?: Array<{ id: string; name: string; enabled?: boolean; status?: string }>;
  skills?: McpSkill[];
  modelAvailable?: boolean;
  mcpAvailable?: boolean;
  memories?: Array<{ id: string; content: string; memory_type: string; importance: number }>;
  preferenceProfile?: UserPreferenceProfile;
  roleProfile?: RoleProfile;
}

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeProject(item?: ContextCompilerProjectItem | null) {
  if (!item) return null;
  const appTypes = Array.isArray(item.appTypes)
    ? item.appTypes
    : Array.isArray(item.app_types)
      ? item.app_types
      : typeof item.app_types === 'string'
        ? [item.app_types]
        : typeof item.app_type === 'string'
          ? [item.app_type]
          : Array.isArray(item.app_type)
            ? item.app_type.map((value) => String(value))
            : [];
  return {
    appId: item.appId ?? item.app_id,
    appName: item.appName || item.app_name,
    appAlias: item.appAlias || item.app_alias,
    appEnName: item.appEnName || item.app_en_name,
    appTypes: appTypes.filter(Boolean),
    status: item.status,
    icon: item.icon,
    projectId: item.projectId ?? item.project_id,
    projectName: item.projectName || item.project_name,
    packageName: item.packageName || item.package_name,
    platform: item.platform || item.platform_name,
    channel: item.channel || item.channel_name,
    media: item.media,
    mediaName: item.mediaName || item.media_name,
  };
}

function normalizeProjects(items?: ContextCompilerProjectItem[]) {
  return (Array.isArray(items) ? items : []).map((item) => normalizeProject(item)).filter(Boolean) as NonNullable<ReturnType<typeof normalizeProject>>[];
}

function normalizeTaskStatus(value?: string): TaskStatus | undefined {
  const allowed: TaskStatus[] = ['created', 'clarifying', 'running', 'waiting', 'completed', 'archived', 'downgraded'];
  return value && allowed.includes(value as TaskStatus) ? (value as TaskStatus) : undefined;
}

function normalizeAgentType(value?: string | null): AgentType {
  const allowed: AgentType[] = ['hub', 'help', 'report', 'demand', 'diagnosis', 'debugging', 'delivery', 'monitoring', 'material', 'prediction'];
  return value && allowed.includes(value as AgentType) ? (value as AgentType) : 'hub';
}

function normalizeIntentType(value?: string | null): IntentType | undefined {
  const allowed: IntentType[] = ['help', 'report_query', 'demand', 'diagnosis', 'debugging', 'get_delivery_packages', 'monitor', 'forecast', 'general'];
  return value && allowed.includes(value as IntentType) ? (value as IntentType) : undefined;
}

function mergeStrings(values: Array<string | undefined | null>): string[] {
  return [...new Set(values.flatMap((value) => String(value || '').split(/[\n,，、]/)).map((item) => item.trim()).filter(Boolean))];
}

function chooseRoleProfile(
  preference: UserPreferenceProfile,
  availableRoles: RoleProfile[],
  input: ContextCompilerInput,
): RoleProfile {
  const preferredRoleId = normalizeInternalRoleId(preference.currentRole || preference.defaultRole, DEFAULT_NEW_USER_ROLE_ID);
  const current = availableRoles.find((role) => role.id === preferredRoleId);
  if (current) return current;

  const projectText = [input.user.current?.appName, input.user.current?.appAlias, input.user.current?.appEnName]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  const preferenceText = mergeStrings([
    ...preference.activePreferences,
    ...(input.memories || []).map((item) => item.content),
  ]).join(' ').toLowerCase();

  const matched = availableRoles.find((role) => {
    const roleText = [role.name, role.description, ...role.scopeTags].join(' ').toLowerCase();
    return [projectText, preferenceText].some((text) =>
      role.scopeTags.some((tag) => text.includes(tag.toLowerCase())) ||
      roleText.includes(text) ||
      text.includes(role.id.toLowerCase()),
    );
  });
  if (matched) return matched;

  return getDefaultRoleProfile(DEFAULT_NEW_USER_ROLE_ID) || availableRoles[0] || {
    id: DEFAULT_NEW_USER_ROLE_ID,
    name: '优化师',
    description: '',
    enabled: true,
    sortOrder: 0,
    defaultPerspective: 'summary',
    allowedPerspectives: ['summary', 'analysis'],
    defaultAgent: 'hub',
    allowedIntentTypes: ['general'],
    scopeTags: [],
    routePolicy: { ambiguous: 'confirm', outOfScope: 'explain', clarificationRounds: 1 },
    rolePrompt: '',
    resultTemplate: { defaultBlocks: ['结论'], blockOrder: ['结论'] },
    responseStyle: {
      outputStyle: ['先结论后证据'],
      analysisFocus: ['项目进展'],
      riskBias: ['均衡'],
      explanationDepth: 'balanced',
      decisionStyle: 'balanced',
    },
    shortcutEntries: [],
    updatedAt: nowIso(),
  };
}

function buildRolePrompt(role: RoleProfile, preference: UserPreferenceProfile, input: ContextCompilerInput): string {
  const sections = [
    role.rolePrompt,
    preference.activePreferences.length > 0 ? `User stable preferences: ${preference.activePreferences.join(', ')}` : '',
    input.conversation?.temporary_constraints?.length ? `Current temporary constraints: ${input.conversation.temporary_constraints.join(', ')}` : '',
    input.task?.summary ? `Current task summary: ${input.task.summary}` : '',
  ].filter(Boolean);
  return sections.join('\n');
}

function buildResponseStyle(role: RoleProfile, preference: UserPreferenceProfile) {
  return {
    outputStyle: [...new Set([...role.responseStyle.outputStyle, ...preference.inferredPreferences.outputStyle])],
    analysisFocus: [...new Set([...role.responseStyle.analysisFocus, ...preference.inferredPreferences.analysisFocus])],
    riskBias: [...new Set([...role.responseStyle.riskBias, ...preference.inferredPreferences.riskBias])],
    explanationDepth: preference.inferredPreferences.explanationDepth || role.responseStyle.explanationDepth,
    decisionStyle: preference.inferredPreferences.decisionStyle || role.responseStyle.decisionStyle,
  };
}

function buildRenderHints(role: RoleProfile, responseStyle: ReturnType<typeof buildResponseStyle>) {
  const defaultBlocks = [...new Set([...role.resultTemplate.defaultBlocks, 'evidence', 'next_action'])];
  const showEvidence = responseStyle.analysisFocus.some((item) => /evidence|anomaly|risk|roi|cost|debug/i.test(item));
  const showRisk = responseStyle.riskBias.some((item) => /conservative|risk/i.test(item)) || role.defaultPerspective !== 'summary';
  const showActions = role.defaultAgent !== 'help';
  return {
    defaultBlocks,
    showEvidence,
    showRisk,
    showActions,
  };
}

function buildRouteHints(role: RoleProfile, intentType?: IntentType, agent?: AgentType): CompiledContextPackage['routeHints'] {
  return {
    intentType,
    agent: agent || role.defaultAgent,
    confidence: intentType ? 'medium' : 'low',
    clarificationPolicy: role.routePolicy.clarificationRounds > 1 ? 'batch' : 'single',
    outOfScope: false,
  };
}

function buildProjectContextText(input: ContextCompilerInput): string {
  const current = normalizeProject(input.user.current);
  if (!current) return '';
  return [
    current.appName ? `项目范围：${current.appName}` : '',
    current.appId ? `APPID：${current.appId}` : '',
    current.appAlias ? `项目别名：${current.appAlias}` : '',
  ].filter(Boolean).join('\n');
}

function toCompilerMessages(messages: ContextCompilerMessage[]): Message[] {
  return messages.map((message, index) => ({
    id: message.id || message.message_id || `compiler-message-${index}`,
    message_id: message.message_id || message.id || `compiler-message-${index}`,
    conversation_id: '',
    role: message.role,
    content: message.content,
    message_type: message.role === 'user' ? 'user_input' : 'assistant_reply',
    created_at: message.createdAt || new Date(0).toISOString(),
    timestamp: message.createdAt ? new Date(message.createdAt).getTime() : 0,
    intent_type: message.intent_type,
    metadata: message.metadata,
    evidence_ids: message.evidence_ids,
  }));
}

export async function buildCompiledContextPackage(input: ContextCompilerInput): Promise<CompiledContextPackage> {
  const availableRoles = await listRoleProfiles();
  const preference = input.preferenceProfile || await getOrCreateUserPreferenceProfile(input.scopeKey, input.roleProfile?.id);
  const roleProfile = input.roleProfile || chooseRoleProfile(preference, availableRoles, input);
  const responseStyle = buildResponseStyle(roleProfile, preference);
  const renderHints = buildRenderHints(roleProfile, responseStyle);
  const activeFeatureSwitches = (input.featureSwitches || []).filter((item) => item.enabled).map((item) => item.key);
  const enabledSkills = (input.skills || []).filter((item) => item.installed).map((item) => item.id);
  const mcpServers = (input.mcpServers || []).filter((item) => item.enabled !== false).map((item) => item.id);
  const availableMcp = input.mcpAvailable ?? mcpServers.length > 0;
  const availableModel = input.modelAvailable ?? true;
  const recentMessages = (input.conversation?.recent_messages || []).slice(-8).map((item) => ({
    role: item.role,
    content: item.content,
    createdAt: item.createdAt,
    id: item.id,
    message_id: item.message_id,
    intent_type: item.intent_type,
    metadata: item.metadata,
    evidence_ids: item.evidence_ids,
  }));
  const businessContext = buildBusinessContextSnapshot(
    toCompilerMessages(recentMessages),
    buildProjectContextText(input),
  );
  const initialRouteDecision = input.message ? deriveRequestRouteDecision(input.message, { roleProfile, preferenceProfile: preference, businessContext }) : null;
  const initialSlotState = resolveSlots({
    intentType: normalizeIntentType(initialRouteDecision?.intent_type),
    message: input.message || '',
    businessContext,
  });
  const routeDecision = input.message ? deriveRequestRouteDecision(input.message, {
    roleProfile,
    preferenceProfile: preference,
    businessContext,
    slotState: initialSlotState,
  }) : null;
  const slotState = resolveSlots({
    intentType: normalizeIntentType(routeDecision?.intent_type),
    message: input.message || '',
    businessContext,
  });
  const inheritedSlots = slotState.resolvedSlots.filter((slot) => slot.inherited).map((slot) => slot.slotKey);
  const mustConfirmSlots = slotState.missingSlots.filter((slot) => slot.priority === 'required').map((slot) => slot.slotKey);

  return {
    compiledAt: nowIso(),
    scopeKey: input.scopeKey,
    user: {
      uid: input.user.uid,
      account: input.user.account,
      userName: input.user.user_name,
      realName: input.user.real_name,
      currentRole: normalizeInternalRoleId(preference.currentRole || preference.defaultRole || roleProfile.id, DEFAULT_NEW_USER_ROLE_ID),
    },
    conversation: {
      conversationId: input.conversation?.conversation_id,
      title: input.conversation?.title,
      currentMode: input.conversation?.current_mode as CompiledContextPackage['conversation']['currentMode'],
      recentMessages,
      temporaryRole: input.conversation?.temporary_role,
      temporaryConstraints: input.conversation?.temporary_constraints || [],
    },
    task: {
      taskId: input.task?.task_id,
      taskType: input.task?.task_type,
      workflowLevel: input.task?.workflow_level,
      status: normalizeTaskStatus(input.task?.status),
      summary: input.task?.summary,
      blockers: input.task?.blockers || [],
      nextActions: input.task?.next_actions || [],
      latestResultId: input.task?.latest_result_id,
      latestEvidenceIds: input.task?.latest_evidence_ids || [],
    },
    project: {
      currentProject: normalizeProject(input.user.current),
      availableProjects: normalizeProjects(input.user.projects),
      modelAvailable: availableModel,
      mcpAvailable: availableMcp,
      availableMcpServers: mcpServers,
      enabledFeatureSwitches: activeFeatureSwitches,
    },
    preference: {
      ...preference,
      currentRole: normalizeInternalRoleId(preference.currentRole || preference.defaultRole || roleProfile.id, DEFAULT_NEW_USER_ROLE_ID),
    },
    roleProfile,
    promptContext: {
      rolePrompt: buildRolePrompt(roleProfile, preference, input),
      resultTemplate: roleProfile.resultTemplate.blockOrder,
    },
    skillContext: {
      installedSkills: (input.skills || []).filter((item) => item.installed).map((item) => item.name),
      enabledSkills,
    },
    toolAvailability: {
      model: availableModel,
      mcp: availableMcp,
      knowledge: true,
    },
    routeHints: routeDecision
      ? {
        intentType: normalizeIntentType(routeDecision.intent_type),
        agent: normalizeAgentType(routeDecision.agent),
        confidence: routeDecision.confidence,
        clarificationPolicy: roleProfile.routePolicy.clarificationRounds > 1 ? 'batch' : 'single',
        outOfScope: !routeDecision.is_business_related && routeDecision.intent_type === 'general',
      }
      : buildRouteHints(roleProfile, undefined, roleProfile.defaultAgent),
    businessContext,
    slotState,
    followUpPolicy: {
      policyId: slotState.policyId || 'general-v1',
      allowInheritance: slotState.followUpAllowed,
      inheritedSlots,
      mustConfirmSlots,
      reason: inheritedSlots.length > 0
        ? '当前问题可承接会话内已确认条件。'
        : mustConfirmSlots.length > 0
          ? '当前问题仍需补充关键条件。'
          : '当前问题不需要承接上一轮条件。',
    },
    responseStyle,
    renderHints,
    shortcutEntries: roleProfile.shortcutEntries.filter((item) => item.enabled).sort((a, b) => a.sortOrder - b.sortOrder),
  };
}

export function summarizeCompiledContext(context: CompiledContextPackage) {
  return {
    compiledAt: context.compiledAt,
    scopeKey: context.scopeKey,
    user: context.user,
    role: context.roleProfile ? {
      id: context.roleProfile.id,
      name: context.roleProfile.name,
      defaultPerspective: context.roleProfile.defaultPerspective,
    } : null,
    routeHints: context.routeHints,
    renderHints: context.renderHints,
    businessContext: context.businessContext,
    slotState: context.slotState,
    followUpPolicy: context.followUpPolicy,
    currentRole: context.preference.currentRole || context.preference.defaultRole,
    preference: summarizePreferenceProfile(context.preference),
  };
}

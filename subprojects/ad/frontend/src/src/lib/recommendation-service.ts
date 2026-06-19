import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { decodeJwtPayload, getCurrentUser, getUserIdFromToken, type AiadUserInfo } from './auth-service';
import { getUserScopeKey } from './user-scope';
import { getPromptContent } from './prompt-store';
import { getConversation, listConversations, listMessages } from './conversation-store';
import { listScheduledTasks } from './scheduled-task-store';
import { listFeatureSwitches } from './feature-switch-store';
import { getModelServiceConfig } from './runtime-config';
import { runModelUseCase } from './model-use-case-runtime';
import { runtimeUserDataPath } from './runtime-data-path';

export interface DynamicRecommendationItem {
  id: string;
  title: string;
  prompt: string;
  reason?: string;
  category: 'help' | 'demand' | 'diagnosis' | 'debugging';
}

export interface RecommendationContextInfo {
  role: string;
  recent_conversations: number;
  recent_tasks: number;
  active_features: number;
}

export interface RecommendationBundle {
  recommendations: DynamicRecommendationItem[];
  source: 'cache' | 'llm' | 'fallback';
  updated_at: string;
  context: RecommendationContextInfo;
  refreshing?: boolean;
}

interface RecommendationCacheFile {
  updated_at: string;
  source: RecommendationBundle['source'];
  context_signature: string;
  recommendations: DynamicRecommendationItem[];
  context: RecommendationContextInfo;
}

const DYNAMIC_RECOMMENDATION_PROMPT_ID = 'dynamic-recommendation';
// P3-#7: fallback 与 managed seed (dynamic-recommendation) 内容保持一致
// 当 prompt store 不可用时使用此内置文案
const FALLBACK_PROMPT = [
  '你是「下一步引导器」：基于用户角色、最近会话、当前会话标题、当前场景和项目上下文，生成 3 条可直接贴到输入框发送的中文建议。',
  '每条建议都要满足：',
  '1）可以帮用户更快地继续提问；',
  '2）可以让用户探索更多可用能力；',
  '3）用词尽量短、口语化、可读；',
  '4）只输出下一步建议，不输出工具链条、字段名、技术名词（如 Agent、MCP、Workflow）；',
  '5）返回 3 条（title/prompt），每条都可独立执行。',
].join('\n');

const recommendationSchema = z.object({
  recommendations: z.array(
    z.object({
      title: z.string().min(1),
      prompt: z.string().min(1),
      reason: z.string().optional(),
      category: z.enum(['help', 'demand', 'diagnosis', 'debugging']),
    }),
  ).length(3),
});

const CACHE_FILE_NAME = 'recommendations.json';
const CACHE_TTL_MS = 5 * 60 * 1000;
const SHOULD_PERSIST_STORE = process.env.XIAOQIAO_PERSIST_DEV_STORE !== 'false';

const inFlightByScope = new Map<string, Promise<void>>();

function cachePath(scopeKey: string): string {
  return runtimeUserDataPath(scopeKey, CACHE_FILE_NAME);
}

function nowIso(): string {
  return new Date().toISOString();
}

function truncate(value: string, max = 90): string {
  const text = value.trim().replace(/\s+/g, ' ');
  return text.length <= max ? text : `${text.slice(0, max - 1)}...`;
}

function summarizeConversation(messages: Awaited<ReturnType<typeof listMessages>>) {
  const lastMessage = messages[messages.length - 1];
  const assistantMessage = [...messages].reverse().find((item) => item.role === 'assistant');
  return {
    lastUserText: truncate([...messages].reverse().find((item) => item.role === 'user')?.content || '', 70),
    lastAssistantText: truncate(assistantMessage?.content || '', 70),
    lastRole: lastMessage?.role || 'user',
  };
}

async function readCache(scopeKey: string): Promise<RecommendationCacheFile | null> {
  try {
    const raw = await readFile(cachePath(scopeKey), 'utf8');
    const parsed = JSON.parse(raw) as RecommendationCacheFile;
    if (Array.isArray(parsed.recommendations)) {
      return {
        ...parsed,
        recommendations: parsed.recommendations.map((item, index) => ({
          ...item,
          id: item.id || `${item.category}-${index + 1}`,
        })),
      };
    }
  } catch {
    // no scoped recommendation cache yet
  }
  return null;
}

async function writeCache(scopeKey: string, file: RecommendationCacheFile): Promise<void> {
  if (!SHOULD_PERSIST_STORE) return;
  const target = cachePath(scopeKey);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(file, null, 2)}\n`, 'utf8');
}

async function generateWithModelTraced(input: {
  promptText: string;
  roleLabel: string;
  recentConversations: Array<{ title: string; lastUserText: string; lastAssistantText: string }>;
  recentTasks: Array<{ name: string; status: string; task_type: string }>;
  activeFeatures: Array<{ key: string; enabled: boolean; name: string }>;
  currentConversationTitle?: string;
  activeAgent?: string;
  projectContext?: string;
}): Promise<DynamicRecommendationItem[] | null> {
  return await generateWithModel(input);
}
async function generateWithModel(input: {
  promptText: string;
  roleLabel: string;
  recentConversations: Array<{ title: string; lastUserText: string; lastAssistantText: string }>;
  recentTasks: Array<{ name: string; status: string; task_type: string }>;
  activeFeatures: Array<{ key: string; enabled: boolean; name: string }>;
  currentConversationTitle?: string;
  activeAgent?: string;
  projectContext?: string;
}): Promise<DynamicRecommendationItem[] | null> {
  const modelServiceConfig = await getModelServiceConfig();

  const prompt = [
    input.promptText,
    '',
    '你是推荐服务，目标是让用户能快速继续提问或探索更多能力。只输出 JSON：',
    '{',
    '  "recommendations": [',
    '    { "title": "短标题", "prompt": "可直接发送的提示词", "reason": "一句话理由", "category": "help|demand|diagnosis|debugging" }',
    '  ]',
    '}',
    '',
    '约束：',
    '- 必须输出 3 条',
    '- 每条都可独立粘贴发送',
    '- 标题和内容都要短，面向任务推进',
    '- 重点覆盖帮助、需求沟通、问题排查、联调推进',
    '- 不出现 Agent、MCP、Workflow 等内部技术词',
    '',
    '当前用户信息：',
    `- 用户角色：${input.roleLabel}`,
    `- 当前会话标题：${input.currentConversationTitle || '未命名会话'}`,
    `- 当前场景：${input.activeAgent || 'chat'}`,
    `- 当前项目上下文：${input.projectContext || '无'}`,
    '',
    '最近会话：',
    ...input.recentConversations.map((item, index) => `- ${index + 1}. ${item.title} | 用户：${item.lastUserText || '无'} | 最近回复：${item.lastAssistantText || '无'}`),
    '',
    '历史任务：',
    ...input.recentTasks.map((item, index) => `- ${index + 1}. ${item.name} | 状态：${item.status} | 类型：${item.task_type}`),
    '',
    '系统状态：',
    ...input.activeFeatures.filter((item) => item.enabled).map((item, index) => `- ${index + 1}. ${item.name}`),
  ].join('\n');

  const result = await runModelUseCase<{ recommendations: DynamicRecommendationItem[] }>({
    useCase: 'recommendation',
    modelServiceConfig,
    fallbackText: '',
    input: {
      promptText: input.promptText,
      prompt,
      roleLabel: input.roleLabel,
      recentConversations: input.recentConversations,
      recentTasks: input.recentTasks,
      activeFeatures: input.activeFeatures,
      currentConversationTitle: input.currentConversationTitle,
      activeAgent: input.activeAgent,
      projectContext: input.projectContext,
    },
    consume: {
      enabled: false,
      consumedBy: 'recommendation_service',
    },
    traceMeta: {
      role: input.roleLabel,
      active_agent: input.activeAgent || 'chat',
    },
  });
  if (!result.modelUsed || !result.output) return null;

  try {
    const parsed = recommendationSchema.parse(result.output);
    return parsed.recommendations.map((item, index) => ({
      ...item,
      id: `${item.category}-${index + 1}`,
      reason: item.reason || '',
    }));
  } catch {
    return null;
  }
}

function buildContextSignature(input: {
  roleLabel: string;
  recentConversations: Array<{ title: string; lastUserText: string; lastAssistantText: string }>;
  recentTasks: Array<{ name: string; status: string; task_type: string }>;
  activeFeatures: Array<{ key: string; enabled: boolean; name: string }>;
  currentConversationTitle?: string;
  activeAgent?: string;
  projectContext?: string;
}) {
  return JSON.stringify({
    roleLabel: input.roleLabel,
    conversations: input.recentConversations,
    tasks: input.recentTasks,
    features: input.activeFeatures.filter((item) => item.enabled).map((item) => item.key),
    currentConversationTitle: input.currentConversationTitle || '',
    activeAgent: input.activeAgent || '',
    projectContext: input.projectContext || '',
  });
}

async function resolveUserIdentity(token: string): Promise<{
  scopeKey: string;
  user: Pick<AiadUserInfo, 'account' | 'user_name' | 'real_name' | 'third_account' | 'uid' | 'current_role' | 'admin_access'>;
}> {
  try {
    const current = await getCurrentUser(token);
    return {
      scopeKey: getUserScopeKey(current.user),
      user: current.user,
    };
  } catch {
    const payload = decodeJwtPayload(token);
    const rawUserId = getUserIdFromToken(token).trim();
    const parsedUid = rawUserId ? Number(rawUserId) : undefined;
    const uid = typeof parsedUid === 'number' && Number.isFinite(parsedUid) ? parsedUid : undefined;
    const account = String(payload?.third_account || payload?.account || payload?.user_name || payload?.real_name || payload?.phone || '');
    const user_name = String(payload?.user_name || payload?.account || payload?.real_name || account || 'anonymous');
    const real_name = typeof payload?.real_name === 'string' ? payload.real_name : undefined;
    const third_account = typeof payload?.third_account === 'string' ? payload.third_account : undefined;
    const user = {
      account: account || user_name,
      user_name,
      real_name,
      third_account,
      uid: uid ?? 0,
      current_role: undefined,
      admin_access: undefined,
    };
    return {
      scopeKey: getUserScopeKey({
        uid,
        account: user.account,
        user_name,
        real_name,
        third_account,
      }),
      user,
    };
  }
}

export async function buildRecommendationBundle(input: {
  token: string;
  conversationId?: string;
  activeAgent?: string;
  projectContext?: string;
}): Promise<RecommendationBundle> {
  const { scopeKey, user } = await resolveUserIdentity(input.token);
  const conversations = await listConversations(scopeKey, { limit: 20 });
  const currentConversation = input.conversationId
    ? (conversations.find((item) => item.conversation_id === input.conversationId)
      ?? await getConversation(input.conversationId, scopeKey))
    : undefined;
  const projectRefs = currentConversation?.project_binding?.project_refs || [];
  const recentConversationIds = (input.conversationId
    ? [input.conversationId, ...conversations.map((item) => item.conversation_id)]
    : conversations.map((item) => item.conversation_id))
    .filter((value, index, array) => array.indexOf(value) === index)
    .slice(0, 3);

  const recentConversations = await Promise.all(
    recentConversationIds.map(async (conversationId) => {
      const conversation = conversations.find((item) => item.conversation_id === conversationId);
      const messages = await listMessages(conversationId, scopeKey, { limit: 20 });
      const summary = summarizeConversation(messages);
      return {
        title: conversation?.title || '新会话',
        lastUserText: summary.lastUserText,
        lastAssistantText: summary.lastAssistantText,
      };
    }),
  );

  const allTasks = await listScheduledTasks(projectRefs.length > 0 ? { project_refs: projectRefs } : {});
  const ownerCandidates = new Set([
    scopeKey,
    user.account,
    user.user_name,
    user.real_name || '',
    user.third_account || '',
  ].filter(Boolean));
  const recentTasksSource = allTasks
    .filter((task) => ownerCandidates.has(task.created_by))
    .sort((a, b) => b.updated_at - a.updated_at)
    .slice(0, 4);
  const recentTasks = (recentTasksSource.length > 0 ? recentTasksSource : allTasks.slice(0, 4)).map((task) => ({
    name: task.name,
    status: task.status,
    task_type: task.task_type,
  }));

  const featureSwitches = await listFeatureSwitches();
  const promptText = await getPromptContent(DYNAMIC_RECOMMENDATION_PROMPT_ID, FALLBACK_PROMPT);
  const roleLabel = user.current_role || (user.admin_access?.is_super_admin ? '超级管理员' : '普通用户');

  const generationInput = {
    promptText,
    roleLabel,
    recentConversations,
    recentTasks,
    activeFeatures: featureSwitches,
    currentConversationTitle: conversations.find((item) => item.conversation_id === input.conversationId)?.title,
    activeAgent: input.activeAgent,
    projectContext: input.projectContext,
  };

  const generated = await generateWithModel(generationInput);
  const recommendations = generated || [];

  return {
    recommendations,
    source: 'llm',
    updated_at: nowIso(),
    context: {
      role: roleLabel,
      recent_conversations: recentConversations.length,
      recent_tasks: recentTasks.length,
      active_features: featureSwitches.filter((item) => item.enabled).length,
    },
  };
}

export async function loadCachedRecommendations(scopeKey: string): Promise<RecommendationBundle | null> {
  const cached = await readCache(scopeKey);
  if (!cached) return null;
  return {
    recommendations: cached.recommendations,
    source: cached.source,
    updated_at: cached.updated_at,
    context: cached.context,
    refreshing: Date.now() - new Date(cached.updated_at).getTime() > CACHE_TTL_MS,
  };
}

export async function saveRecommendationBundle(scopeKey: string, bundle: RecommendationBundle, contextSignature: string): Promise<RecommendationBundle> {
  const file: RecommendationCacheFile = {
    updated_at: bundle.updated_at,
    source: bundle.source,
    context_signature: contextSignature,
    recommendations: bundle.recommendations,
    context: bundle.context,
  };
  await writeCache(scopeKey, file);
  return bundle;
}

export async function refreshRecommendationBundle(input: {
  token: string;
  conversationId?: string;
  activeAgent?: string;
  projectContext?: string;
}): Promise<RecommendationBundle> {
  const { scopeKey } = await resolveUserIdentity(input.token);
  const next = await buildRecommendationBundle(input);
  const contextSignature = buildContextSignature({
    roleLabel: next.context.role,
    recentConversations: [],
    recentTasks: [],
    activeFeatures: [],
    currentConversationTitle: input.conversationId || '',
    activeAgent: input.activeAgent,
    projectContext: input.projectContext,
  });
  await saveRecommendationBundle(scopeKey, next, contextSignature);
  return next;
}

export async function scheduleRecommendationRefresh(input: {
  token: string;
  conversationId?: string;
  activeAgent?: string;
  projectContext?: string;
}): Promise<void> {
  const { scopeKey } = await resolveUserIdentity(input.token);
  if (inFlightByScope.has(scopeKey)) return;
  const task = (async () => {
    try {
      const bundle = await buildRecommendationBundle(input);
      const contextSignature = buildContextSignature({
        roleLabel: bundle.context.role,
        recentConversations: [],
        recentTasks: [],
        activeFeatures: [],
        currentConversationTitle: input.conversationId || '',
        activeAgent: input.activeAgent,
        projectContext: input.projectContext,
      });
      await saveRecommendationBundle(scopeKey, bundle, contextSignature);
    } finally {
      inFlightByScope.delete(scopeKey);
    }
  })();
  inFlightByScope.set(scopeKey, task);
  void task.catch(() => undefined);
}

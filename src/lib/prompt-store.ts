import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { legacyDataPath, runtimeDataPath } from './runtime-data-path';
import type { PromptBinding, PromptConfig, PromptVersion } from '@/types';

interface PromptStoreFile {
  prompts: PromptConfig[];
  versions: Record<string, PromptVersion[]>;
}

const STORE_PATH = runtimeDataPath('prompt-store.json');
const LEGACY_STORE_PATH = legacyDataPath('prompt-store.json');

const now = () => new Date().toISOString();

const DEFAULT_PROMPT_CONTENT: Record<string, string> = {
  route_prompt: '识别用户意图、业务域、缺失信息和下一步处理路径。只输出路由判断，不生成业务结论。',
  response_prompt: [
    '用产品语言回答用户，直接给结论、依据和下一步。',
    '不要暴露内部接口、schema、mock、contract、工具参数或项目 ID。',
    '来源由结构化来源模块展示，正文不要重复列“信息来源”。',
  ].join('\n'),
  summary_prompt: [
    '根据最终回答和可用证据生成 business_summary JSON。',
    '字段：title、brief、severity、confidence、business_impact。',
    'brief 必须短，不要截断原文，不要包含内部过程。',
  ].join('\n'),
  evidence_prompt: '归纳可展示来源和证据。技术诊断、HTTP 状态、工具参数只进入执行详情，不进入用户正文。',
  card_prompt: '生成业务卡片语义，只输出可供前端渲染的业务摘要和动作，不生成 UI 布局代码。',
  followup_prompt: '当缺少必要信息时，一次只追问最关键字段，并说明补充后能继续做什么。',
  tool_explain_prompt: '把工具结果解释成业务语言。失败或部分降级时温和说明，不把技术细节放进用户正文。',
};

function defaultPrompt(id: string, name: string, workflow: string, content: string): PromptConfig {
  return {
    id,
    name,
    scope: workflow,
    expectation: name,
    status: 'active',
    current_version: 1,
    binding: { workflow },
    updated_at: now(),
    category: workflow,
    applicable_workflows: [workflow],
    enabled: true,
    content,
  };
}

function defaultStore(): PromptStoreFile {
  const prompts = Object.entries(DEFAULT_PROMPT_CONTENT).map(([workflow, content], index) =>
    defaultPrompt(`prompt-${workflow}`, `${workflow.replace(/_/g, ' ')}`, workflow, content),
  );
  const versions = Object.fromEntries(prompts.map((prompt) => [
    prompt.id,
    [{
      version: 1,
      content: prompt.content || '',
      created_at: prompt.updated_at,
      author: 'system',
      change_note: '默认提示词',
    }],
  ]));
  return { prompts, versions };
}

function normalizePrompt(input: Partial<PromptConfig> & { id?: string }): PromptConfig {
  const updatedAt = input.updated_at || now();
  return {
    id: input.id || `prompt-${Date.now()}`,
    name: input.name || '未命名提示词',
    scope: input.scope || input.binding?.workflow || input.category || 'response_prompt',
    expectation: input.expectation || '',
    status: input.status || 'draft',
    current_version: Number(input.current_version || 1),
    binding: input.binding || { workflow: input.scope || 'response_prompt' },
    updated_at: updatedAt,
    category: input.category || input.scope || input.binding?.workflow,
    applicable_workflows: input.applicable_workflows || (input.binding?.workflow ? [input.binding.workflow] : undefined),
    applicable_agents: input.applicable_agents,
    applicable_models: input.applicable_models,
    enabled: input.enabled ?? input.status !== 'archived',
    content: input.content || '',
  };
}

async function readStore(): Promise<PromptStoreFile> {
  for (const storePath of [STORE_PATH, LEGACY_STORE_PATH]) {
    try {
      const raw = await readFile(storePath, 'utf8');
      const parsed = JSON.parse(raw) as Partial<PromptStoreFile>;
      const fallback = defaultStore();
      return {
        prompts: Array.isArray(parsed.prompts) && parsed.prompts.length
          ? parsed.prompts.map((prompt) => normalizePrompt(prompt))
          : fallback.prompts,
        versions: parsed.versions || fallback.versions,
      };
    } catch {
      // Try the next location, then seed defaults.
    }
  }
  const seeded = defaultStore();
  await writeStore(seeded);
  return seeded;
}

async function writeStore(store: PromptStoreFile): Promise<void> {
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
}

export async function listPrompts(filters?: { category?: string; status?: string }): Promise<PromptConfig[]> {
  const store = await readStore();
  return store.prompts
    .filter((prompt) => !filters?.category || prompt.category === filters.category || prompt.scope === filters.category)
    .filter((prompt) => !filters?.status || prompt.status === filters.status);
}

export async function getPrompt(id: string): Promise<PromptConfig | undefined> {
  const store = await readStore();
  return store.prompts.find((prompt) => prompt.id === id);
}

export async function createPrompt(input: Partial<PromptConfig>): Promise<PromptConfig> {
  const store = await readStore();
  const prompt = normalizePrompt({ ...input, id: input.id || `prompt-${Date.now()}` });
  store.prompts = [prompt, ...store.prompts.filter((item) => item.id !== prompt.id)];
  store.versions[prompt.id] = [{
    version: prompt.current_version,
    content: prompt.content || '',
    created_at: prompt.updated_at,
    author: 'admin',
    change_note: '创建提示词',
  }];
  await writeStore(store);
  return prompt;
}

export async function updatePrompt(id: string, input: Partial<PromptConfig>): Promise<PromptConfig | undefined> {
  const store = await readStore();
  const existing = store.prompts.find((prompt) => prompt.id === id);
  if (!existing) return undefined;
  const contentChanged = typeof input.content === 'string' && input.content !== existing.content;
  const nextVersion = contentChanged ? existing.current_version + 1 : existing.current_version;
  const next = normalizePrompt({
    ...existing,
    ...input,
    id,
    current_version: nextVersion,
    updated_at: now(),
  });
  store.prompts = store.prompts.map((prompt) => prompt.id === id ? next : prompt);
  if (contentChanged) {
    store.versions[id] = [
      {
        version: nextVersion,
        content: next.content || '',
        created_at: next.updated_at,
        author: 'admin',
        change_note: '更新提示词正文',
      },
      ...(store.versions[id] || []),
    ];
  }
  await writeStore(store);
  return next;
}

export async function listPromptVersions(id: string): Promise<PromptVersion[]> {
  const store = await readStore();
  return store.versions[id] || [];
}

export async function updatePromptBinding(id: string, binding: PromptBinding): Promise<PromptBinding | undefined> {
  const prompt = await updatePrompt(id, { binding });
  return prompt?.binding;
}

export async function getActivePromptContent(scope: string, fallback: string, intent?: string): Promise<{ content: string; prompt?: PromptConfig }> {
  const store = await readStore();
  const prompt = store.prompts.find((item) => {
    const enabled = item.enabled !== false && item.status === 'active';
    const workflowMatches = item.binding?.workflow === scope || item.scope === scope || item.category === scope;
    const intentMatches = !intent || !item.applicable_workflows?.length || item.applicable_workflows.includes(intent) || item.applicable_workflows.includes(scope);
    return enabled && workflowMatches && intentMatches;
  });
  return {
    content: prompt?.content?.trim() || fallback,
    prompt,
  };
}

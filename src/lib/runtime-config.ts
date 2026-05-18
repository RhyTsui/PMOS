import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Config } from 'coze-coding-dev-sdk';
import { legacyDataPath, runtimeDataPath } from './runtime-data-path';

export interface ModelServiceConfig {
  enabled: boolean;
  provider: 'coze_openai_compatible' | 'custom_openai_compatible';
  providerLabel: string;
  apiKey: string;
  baseUrl: string;
  modelBaseUrl: string;
  modelName: string;
  knowledgeBaseUrl: string;
  knowledgeBaseApiKey: string;
  knowledgeBaseDataset: string;
  notes: string;
  updatedAt: string;
}

export interface ProjectServiceConfig {
  enabled: boolean;
  apiBaseUrl: string;
  apiToken: string;
  notes: string;
  updatedAt: string;
}

const CONFIG_PATH = runtimeDataPath('runtime-config.json');
const LEGACY_CONFIG_PATH = legacyDataPath('runtime-config.json');

const DEFAULT_MODEL_SERVICE_CONFIG: ModelServiceConfig = {
  enabled: true,
  provider: 'coze_openai_compatible',
  providerLabel: process.env.XIAOQIAO_MODEL_PROVIDER_LABEL || 'Coze/OpenAI 兼容服务',
  apiKey: process.env.COZE_WORKLOAD_IDENTITY_API_KEY || process.env.COZE_CODING_API_KEY || '',
  baseUrl:
    process.env.COZE_INTEGRATION_BASE_URL ||
    process.env.COZE_CODING_BASE_URL ||
    '',
  modelBaseUrl:
    process.env.COZE_INTEGRATION_MODEL_BASE_URL ||
    process.env.COZE_CODING_MODEL_BASE_URL ||
    '',
  modelName: process.env.XIAOQIAO_MODEL_NAME || 'doubao-seed-1-8-251228',
  knowledgeBaseUrl: process.env.XIAOQIAO_KNOWLEDGE_BASE_URL || '',
  knowledgeBaseApiKey: process.env.XIAOQIAO_KNOWLEDGE_API_KEY || '',
  knowledgeBaseDataset: process.env.XIAOQIAO_KNOWLEDGE_BASE_ID || process.env.XIAOQIAO_KNOWLEDGE_DATASET || '',
  notes: '',
  updatedAt: new Date().toISOString(),
};

const DEFAULT_PROJECT_SERVICE_CONFIG: ProjectServiceConfig = {
  enabled: true,
  apiBaseUrl: process.env.XIAOQIAO_PROJECT_API_BASE_URL || 'https://ads.dobest.com/api/aiad-setting/v2/app/list',
  apiToken: process.env.XIAOQIAO_PROJECT_API_TOKEN || '',
  notes: '',
  updatedAt: new Date().toISOString(),
};

interface RuntimeConfigFile {
  modelService: ModelServiceConfig;
  projectService: ProjectServiceConfig;
}

function normalizeModelServiceConfig(input?: Partial<ModelServiceConfig>): ModelServiceConfig {
  return {
    ...DEFAULT_MODEL_SERVICE_CONFIG,
    ...input,
    provider: input?.provider || DEFAULT_MODEL_SERVICE_CONFIG.provider,
    providerLabel: input?.providerLabel?.trim() || DEFAULT_MODEL_SERVICE_CONFIG.providerLabel,
    apiKey: input?.apiKey?.trim() || '',
    baseUrl: input?.baseUrl?.trim() || '',
    modelBaseUrl: input?.modelBaseUrl?.trim() || input?.baseUrl?.trim() || '',
    modelName: input?.modelName?.trim() || DEFAULT_MODEL_SERVICE_CONFIG.modelName,
    knowledgeBaseUrl: input?.knowledgeBaseUrl?.trim() || '',
    knowledgeBaseApiKey: input?.knowledgeBaseApiKey?.trim() || '',
    knowledgeBaseDataset: input?.knowledgeBaseDataset?.trim() || '',
    notes: input?.notes?.trim() || '',
    updatedAt: input?.updatedAt || new Date().toISOString(),
  };
}

function normalizeProjectServiceConfig(input?: Partial<ProjectServiceConfig>): ProjectServiceConfig {
  return {
    ...DEFAULT_PROJECT_SERVICE_CONFIG,
    ...input,
    enabled: typeof input?.enabled === 'boolean' ? input.enabled : DEFAULT_PROJECT_SERVICE_CONFIG.enabled,
    apiBaseUrl: input?.apiBaseUrl?.trim() || DEFAULT_PROJECT_SERVICE_CONFIG.apiBaseUrl,
    apiToken: input?.apiToken?.trim() || '',
    notes: input?.notes?.trim() || '',
    updatedAt: input?.updatedAt || new Date().toISOString(),
  };
}

async function readRuntimeConfigFile(): Promise<RuntimeConfigFile> {
  for (const configPath of [CONFIG_PATH, LEGACY_CONFIG_PATH]) {
    try {
      const raw = await readFile(configPath, 'utf8');
      const parsed = JSON.parse(raw) as Partial<RuntimeConfigFile>;
      return {
        modelService: normalizeModelServiceConfig(parsed.modelService),
        projectService: normalizeProjectServiceConfig(parsed.projectService),
      };
    } catch {
      // 尝试下一个存储位置。
    }
  }
  return {
    modelService: normalizeModelServiceConfig(),
    projectService: normalizeProjectServiceConfig(),
  };
}

async function writeRuntimeConfigFile(file: RuntimeConfigFile): Promise<void> {
  await mkdir(path.dirname(CONFIG_PATH), { recursive: true });
  await writeFile(CONFIG_PATH, JSON.stringify(file, null, 2), 'utf8');
}

export async function getModelServiceConfig(): Promise<ModelServiceConfig> {
  const file = await readRuntimeConfigFile();
  return file.modelService;
}

export async function updateModelServiceConfig(
  patch: Partial<ModelServiceConfig>,
): Promise<ModelServiceConfig> {
  const file = await readRuntimeConfigFile();
  const next = normalizeModelServiceConfig({
    ...file.modelService,
    ...patch,
    updatedAt: new Date().toISOString(),
  });
  await writeRuntimeConfigFile({
    ...file,
    modelService: next,
  });
  return next;
}

export async function getProjectServiceConfig(): Promise<ProjectServiceConfig> {
  const file = await readRuntimeConfigFile();
  return file.projectService;
}

export async function updateProjectServiceConfig(
  patch: Partial<ProjectServiceConfig>,
): Promise<ProjectServiceConfig> {
  const file = await readRuntimeConfigFile();
  const next = normalizeProjectServiceConfig({
    ...file.projectService,
    ...patch,
    updatedAt: new Date().toISOString(),
  });
  await writeRuntimeConfigFile({
    ...file,
    projectService: next,
  });
  return next;
}

export function hasConfiguredProjectService(config: ProjectServiceConfig): boolean {
  return Boolean(config.enabled && config.apiBaseUrl && config.apiToken);
}

export function hasConfiguredModelCredentials(config: ModelServiceConfig): boolean {
  return Boolean(
    config.enabled &&
    config.apiKey &&
    config.baseUrl &&
    config.modelBaseUrl &&
    config.modelName,
  );
}

export function hasConfiguredKnowledgeCredentials(config: ModelServiceConfig): boolean {
  return Boolean(
    config.enabled &&
    (config.knowledgeBaseApiKey || config.apiKey) &&
    (config.knowledgeBaseUrl || config.baseUrl),
  );
}

export function getKnowledgeBaseApiKey(config: ModelServiceConfig): string {
  return config.knowledgeBaseApiKey || config.apiKey;
}

export function getKnowledgeBaseId(config: ModelServiceConfig): string {
  return config.knowledgeBaseDataset || '';
}

export function getKnowledgeApiBase(config: ModelServiceConfig): string {
  const rawBase = config.knowledgeBaseUrl || config.baseUrl;
  if (!rawBase) return '';

  const normalizedBase = rawBase.replace(/\/$/, '');
  if (normalizedBase.endsWith('/api/v1')) {
    return normalizedBase;
  }
  if (normalizedBase.endsWith('/api')) {
    return `${normalizedBase}/v1`;
  }
  return `${normalizedBase}/api/v1`;
}

export function getKnowledgeSearchEndpoint(config: ModelServiceConfig): string {
  const apiBase = getKnowledgeApiBase(config);
  return apiBase ? `${apiBase}/knowledge-search` : '';
}

export function getKnowledgeBasesEndpoint(config: ModelServiceConfig): string {
  const apiBase = getKnowledgeApiBase(config);
  return apiBase ? `${apiBase}/knowledge-bases` : '';
}

export function buildModelSdkConfig(modelService: ModelServiceConfig): Config {
  const config = new Config();
  if (modelService.apiKey) {
    (config as Config & { apiKey: string }).apiKey = modelService.apiKey;
  }
  if (modelService.baseUrl) {
    (config as Config & { baseUrl: string }).baseUrl = modelService.baseUrl;
  }
  if (modelService.modelBaseUrl) {
    (config as Config & { modelBaseUrl: string }).modelBaseUrl = modelService.modelBaseUrl;
  }
  return config;
}

export function buildKnowledgeSdkConfig(modelService: ModelServiceConfig): Config {
  const config = new Config();
  const knowledgeBaseUrl = modelService.knowledgeBaseUrl || modelService.baseUrl;
  const knowledgeBaseApiKey = modelService.knowledgeBaseApiKey || modelService.apiKey;
  if (knowledgeBaseApiKey) {
    (config as Config & { apiKey: string }).apiKey = knowledgeBaseApiKey;
  }
  if (knowledgeBaseUrl) {
    (config as Config & { baseUrl: string }).baseUrl = knowledgeBaseUrl;
  }
  if (modelService.modelBaseUrl) {
    (config as Config & { modelBaseUrl: string }).modelBaseUrl = modelService.modelBaseUrl;
  }
  return config;
}

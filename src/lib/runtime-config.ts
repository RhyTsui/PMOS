import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Config } from 'coze-coding-dev-sdk';

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

const DATA_DIR = path.join(process.cwd(), 'data');
const CONFIG_PATH = path.join(DATA_DIR, 'runtime-config.json');

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

interface RuntimeConfigFile {
  modelService: ModelServiceConfig;
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

async function readRuntimeConfigFile(): Promise<RuntimeConfigFile> {
  try {
    const raw = await readFile(CONFIG_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<RuntimeConfigFile>;
    return {
      modelService: normalizeModelServiceConfig(parsed.modelService),
    };
  } catch {
    return {
      modelService: normalizeModelServiceConfig(),
    };
  }
}

async function writeRuntimeConfigFile(file: RuntimeConfigFile): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
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

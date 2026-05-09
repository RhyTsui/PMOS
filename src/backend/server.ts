import 'dotenv/config';
import express from 'express';
import { promises as fsp } from 'node:fs';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { FileStore } from '../core/fileStore.js';
import { WorkflowEngine } from '../core/workflowEngine.js';
import { ReviewCommittee } from '../core/reviewCommittee.js';
import { MultiPmGroupSessionService } from '../core/multiPmGroupSessionService.js';
import { ProviderRegistry } from '../core/providerRegistry.js';
import { McpRegistry } from '../core/mcpRegistry.js';
import { MemoryService } from '../core/memoryService.js';
import { OrchestratorRuntime } from '../core/orchestratorRuntime.js';
import { SubprojectRegistry } from '../core/subprojectRegistry.js';
import { ChatService } from '../core/chatService.js';
import { ProductAgentService } from '../core/productAgentService.js';
import { CapabilityRegistry } from '../core/capabilityRegistry.js';
import { RequirementService } from '../core/requirementService.js';
import { VersionRegistry } from '../core/versionRegistry.js';
import { ObservabilityService } from '../core/observabilityService.js';
import { DagService } from '../core/dagService.js';
import { RetrievalGovernanceService } from '../core/retrievalGovernanceService.js';
import { HermesPolicyService } from '../core/hermesPolicyService.js';
import { ProductChiefService } from '../core/productChiefService.js';
import { DocumentationNormalizationService } from '../core/documentationNormalizationService.js';
import { DocumentGovernanceService } from '../core/documentGovernanceService.js';
import { SkillRegistry } from '../core/skillRegistry.js';
import { ExternalConnectorService } from '../core/externalConnectorService.js';
import { DatakiKnowledgeBaseService } from '../core/datakiKnowledgeBaseService.js';
import { McpContextSyncService, type ToolIdentity } from '../core/mcpContextSyncService.js';
import { CodexLocalStateService } from '../core/codexLocalStateService.js';
import { TaskSsotService } from '../core/taskSsotService.js';
import { SchedulerRunService } from '../core/schedulerRunService.js';
import { FinalStateValidationService } from '../core/finalStateValidationService.js';
import { OutboxService } from '../core/outboxService.js';
import { ProofOfWorkService } from '../core/proofOfWorkService.js';
import { PlaywrightFrontendVerificationRunner } from '../core/playwrightFrontendVerificationRunner.js';
import { SpecialistActivationService } from '../core/specialistActivationService.js';
import { V07RuntimeGovernanceService } from '../core/v07RuntimeGovernanceService.js';
import { LlmRouter } from '../llm_router/index.js';

const rootDir = process.env.AI_OS_ROOT ? path.resolve(process.env.AI_OS_ROOT) : process.cwd();
const store = new FileStore(rootDir);
const memoryService = new MemoryService(store);
const workflowEngine = new WorkflowEngine(store, memoryService);
const reviewCommittee = new ReviewCommittee();
const multiPmGroupSessionService = new MultiPmGroupSessionService(store);
const providerRegistry = new ProviderRegistry(store);
const mcpRegistry = new McpRegistry(store);
const orchestratorRuntime = new OrchestratorRuntime(store, memoryService);
const subprojectRegistry = new SubprojectRegistry(store);
const chatService = new ChatService(store);
const productAgentService = new ProductAgentService(store);
const capabilityRegistry = new CapabilityRegistry(store);
const requirementService = new RequirementService(memoryService);
const versionRegistry = new VersionRegistry(memoryService);
const observabilityService = new ObservabilityService(memoryService);
const dagService = new DagService(store);
const retrievalGovernanceService = new RetrievalGovernanceService(store, memoryService);
const hermesPolicyService = new HermesPolicyService(store, memoryService);
const productChiefService = new ProductChiefService(store, memoryService, productAgentService);
const documentationNormalizationService = new DocumentationNormalizationService(store, memoryService);
const documentGovernanceService = new DocumentGovernanceService(store);
const skillRegistry = new SkillRegistry(store);
const codexLocalStateService = new CodexLocalStateService(store, skillRegistry);
const externalConnectorService = new ExternalConnectorService(store);
const datakiKnowledgeBaseService = new DatakiKnowledgeBaseService();
const mcpContextSync = new McpContextSyncService(rootDir);
const taskSsotService = new TaskSsotService(store, mcpContextSync, memoryService);
const schedulerRunService = new SchedulerRunService(
  orchestratorRuntime,
  memoryService,
  workflowEngine,
  reviewCommittee,
  hermesPolicyService,
);
const finalStateValidationService = new FinalStateValidationService();
const outboxService = new OutboxService(store);
const proofOfWorkService = new ProofOfWorkService(finalStateValidationService);
const playwrightFrontendVerificationRunner = new PlaywrightFrontendVerificationRunner(store);
const specialistActivationService = new SpecialistActivationService();
const v07RuntimeGovernanceService = new V07RuntimeGovernanceService(store, memoryService, requirementService);
const llmRouter = new LlmRouter(store);

const app = express();
app.use(cors());
app.use(express.json());

function renderDirectEntryHtml(
  projectEntries: ProjectEntrySummary[] = [],
  checklistSummary: ExecutionChecklistSummary = { versions: [], userBackchecks: [] },
  dailyDigests: DailyDigestEntry[] = [],
  resumeContext: ResumeContextSummary | null = null,
) {
  const rolloutAssets: ProjectEntryAsset['name'][] = [
    'project-board.svg',
    'roadmap-board.svg',
    'decision-board.svg',
    'change-log.md',
  ];
  const fullyCoveredProjects = projectEntries.filter((entry) => entry.missingAssets.length === 0).length;
  const rolloutCounts = rolloutAssets.map((assetName) => ({
    name: assetName,
    present: projectEntries.filter((entry) => entry.assets.some((asset) => asset.name === assetName)).length,
  }));
  const versionSection =
    checklistSummary.versions.length === 0
      ? '<p class="empty">当前还没有可展示的分母进度。</p>'
      : `<div class="summary-grid">${checklistSummary.versions
          .map(
            (version) => `<article class="info-tile">
              <strong>${version.label}</strong>
              <span>总项数：${version.totalTrackedItems}</span>
              <span>已解：${version.solved}</span>
              <span>部分完成：${version.partial}</span>
              <span>carry-over：${version.carryOver}</span>
            </article>`,
          )
          .join('')}</div>`;
  const backcheckSection =
    checklistSummary.userBackchecks.length === 0
      ? '<p class="empty">当前还没有用户需求回查样板。</p>'
      : `<div class="summary-grid">${checklistSummary.userBackchecks
          .map(
            (backcheck) => `<article class="info-tile">
              <strong>${backcheck.label}</strong>
              <span>状态：${backcheck.status}</span>
              <span>${backcheck.detail}</span>
            </article>`,
          )
          .join('')}</div>`;
  const digestSection =
    dailyDigests.length === 0
      ? '<p class="empty">当前还没有每日蒸馏文件。</p>'
      : `<div class="summary-grid">${dailyDigests
          .map(
            (digest) => `<article class="info-tile">
              <strong>${digest.label}</strong>
              <span>${digest.path}</span>
              <span><a href="${digest.url}" target="_blank" rel="noreferrer">打开蒸馏文档</a></span>
            </article>`,
          )
          .join('')}</div>`;
  const resumeSection = !resumeContext
    ? '<p class="empty">当前还没有可恢复的共享会话摘要。</p>'
    : `<div class="summary-grid">
        <article class="info-tile">
          <strong>继续 do</strong>
          <span>当前模式：${resumeContext.currentMode}</span>
          <span>当前任务：${resumeContext.currentTaskLabel ?? '无'}</span>
          <span>最近更新：${resumeContext.lastUpdated}</span>
        </article>
        <article class="info-tile">
          <strong>最近 checkpoint</strong>
          <span>${resumeContext.latestCheckpointLabel ?? '无'}</span>
          <span>${resumeContext.latestCheckpointAt ?? '尚未记录 checkpoint'}</span>
          <span>活跃任务数：${resumeContext.activeTaskCount}</span>
        </article>
        <article class="info-tile">
          <strong>最近蒸馏</strong>
          <span>${resumeContext.latestDigest?.label ?? '无'}</span>
          <span>${resumeContext.latestDigest?.path ?? '尚未生成每日蒸馏'}</span>
          ${resumeContext.latestDigest?.url ? `<span><a href="${resumeContext.latestDigest.url}" target="_blank" rel="noreferrer">打开蒸馏</a></span>` : '<span>需要继续补齐自动沉淀链路</span>'}
        </article>
      </div>`;
  const projectSection =
    projectEntries.length === 0
      ? '<p class="empty">当前还没有发现标准项目入口资产。</p>'
      : `<div class="project-grid">${projectEntries
          .map(
            (entry) => `<article class="project-card">
              <strong>${entry.subprojectId}</strong>
              <span class="meta">已发现 ${entry.assetCount}/${entry.expectedAssetCount} 个入口资产，${entry.linkedSourceCount} 个依据入口</span>
              <div class="link-list">
                ${entry.assets
                  .map(
                    (asset) =>
                      `<a href="${asset.url}" target="_blank" rel="noreferrer">${asset.name}</a>`,
                  )
                  .join('')}
              </div>
              ${
                entry.linkedSources.length === 0
                  ? ''
                  : `<div class="link-list link-list--secondary">
                ${entry.linkedSources
                  .map(
                    (source) =>
                      `<a href="${source.url}" target="_blank" rel="noreferrer">${source.kind} / ${source.name}</a>`,
                  )
                  .join('')}
              </div>`
              }
              ${
                entry.missingAssets.length === 0
                  ? ''
                  : `<div class="meta">缺失：${entry.missingAssets.join(' / ')}</div>`
              }
            </article>`,
          )
          .join('')}</div>`;
  const rolloutSection = `<div class="summary-grid">
      <article class="info-tile">
        <strong>项目入口 rollout 分母</strong>
        <span>活跃项目：${projectEntries.length}</span>
        ${rolloutCounts
          .map((item) => `<span>${item.name}：${item.present} / ${projectEntries.length}</span>`)
          .join('')}
      </article>
      <article class="info-tile">
        <strong>真源与图板入口</strong>
        <span><a href="/pmaios/docs/operations/project-entry-rollout-status.md" target="_blank" rel="noreferrer">打开 rollout 真源</a></span>
        <span><a href="/pmaios/boards/project-entry-rollout-status.svg" target="_blank" rel="noreferrer">打开 rollout 图板</a></span>
        <span>用途：v0.4 收口依据 + v0.5 人阅读层 rollout 基线</span>
      </article>
    </div>`;
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>PMAIOS</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f6f2e8;
        --panel: #fffdf8;
        --text: #1f1a14;
        --muted: #6f675d;
        --line: #d9cfbf;
        --accent: #b65c2d;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        padding: 32px;
        font-family: "Microsoft YaHei", "PingFang SC", sans-serif;
        background:
          radial-gradient(circle at top left, rgba(182, 92, 45, 0.14), transparent 28%),
          linear-gradient(180deg, #f8f4ea 0%, var(--bg) 100%);
        color: var(--text);
      }
      main {
        max-width: 920px;
        margin: 0 auto;
        display: grid;
        gap: 18px;
      }
      .hero,
      .panel {
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 20px;
        padding: 24px;
        box-shadow: 0 12px 36px rgba(31, 26, 20, 0.08);
      }
      h1, h2, p { margin: 0; }
      .hero {
        display: grid;
        gap: 10px;
      }
      .eyebrow {
        font-size: 13px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--accent);
      }
      .hero p,
      .panel p {
        color: var(--muted);
        line-height: 1.6;
      }
      .grid {
        display: grid;
        gap: 14px;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      }
      a.card {
        display: grid;
        gap: 6px;
        padding: 18px;
        border-radius: 16px;
        border: 1px solid var(--line);
        background: #fffaf2;
        color: inherit;
        text-decoration: none;
      }
      a.card:hover {
        border-color: var(--accent);
        transform: translateY(-1px);
      }
      .meta {
        font-size: 13px;
        color: var(--muted);
      }
      .project-grid {
        display: grid;
        gap: 14px;
      }
      .project-card {
        display: grid;
        gap: 8px;
        padding: 16px;
        border: 1px solid var(--line);
        border-radius: 16px;
        background: #fffaf2;
      }
      .summary-grid {
        display: grid;
        gap: 12px;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      }
      .info-tile {
        display: grid;
        gap: 6px;
        padding: 16px;
        border: 1px solid var(--line);
        border-radius: 16px;
        background: #fffaf2;
      }
      .info-tile strong {
        font-size: 15px;
      }
      .info-tile span {
        color: var(--muted);
        line-height: 1.5;
        font-size: 13px;
      }
      .link-list {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .link-list--secondary {
        margin-top: 4px;
      }
      .link-list a {
        color: var(--accent);
        text-decoration: none;
        padding: 4px 8px;
        border-radius: 999px;
        background: #f1e8da;
        font-size: 13px;
      }
      .empty {
        color: var(--muted);
      }
      code {
        padding: 2px 6px;
        border-radius: 6px;
        background: #f1e8da;
      }
    </style>
  </head>
  <body>
    <main>
      <section class="hero">
        <div class="eyebrow">PMAIOS Direct Entry</div>
        <h1>PMAIOS 本机统一入口</h1>
        <p>根路径优先提供稳定的人读入口，避免首页直接落到可能白屏的 SPA。工作台、图板和版本文档都从这里进入。</p>
      </section>
      <section class="grid">
        <a class="card" href="/workspace">
          <strong>Workspace 工作台</strong>
          <p>React 控制台，查看共享上下文、版本分母、每日蒸馏和运行状态。</p>
          <span class="meta">路径：<code>/workspace</code></span>
        </a>
        <a class="card" href="/pmaios/graph">
          <strong>PMAIOS 全景图谱</strong>
          <p>交互式全景画布，查看 PMAIOS 的系统节点、依赖关系、共享文档和提示词入口。</p>
          <span class="meta">路径：<code>/pmaios/graph</code></span>
        </a>
        <a class="card" href="/pmaios/wiki">
          <strong>PMAIOS Wiki</strong>
          <p>面向演示的人读入口，聚合内核思想、应用价值、工作流、搭建方法、迭代记录和提示词全文。</p>
          <span class="meta">路径：<code>/pmaios/wiki</code></span>
        </a>
        <a class="card" href="/pmaios/boards/index.svg">
          <strong>SVG 图板入口</strong>
          <p>直接查看 PMAIOS 主图板、版本图板、模式架构和演示图板。</p>
          <span class="meta">路径：<code>/pmaios/boards/index.svg</code></span>
        </a>
        <a class="card" href="/pmaios/docs/operations/current-version-progress.md">
          <strong>当前版本快照</strong>
          <p>查看 v0.4 / v0.5 分母进度、用户回查和当前版本状态。</p>
          <span class="meta">路径：<code>/pmaios/docs/operations/current-version-progress.md</code></span>
        </a>
        <a class="card" href="/api/health">
          <strong>健康检查</strong>
          <p>快速确认后端服务是否在线。</p>
          <span class="meta">路径：<code>/api/health</code></span>
        </a>
      </section>
      <section class="panel">
        <h2>上次会话恢复</h2>
        <p>这里直接显示共享 <code>mcp-context</code> 里的当前模式、任务、checkpoint 和最近蒸馏，重启后可以从这里继续做，而不是重新翻聊天。</p>
        ${resumeSection}
      </section>
      <section class="panel">
        <h2>版本分母进度</h2>
        <p>这里直接展示 v0.4 / v0.5 的总盘子，而不是只看刚完成了什么。</p>
        ${versionSection}
      </section>
      <section class="panel">
        <h2>用户需求回查</h2>
        <p>产品侧动作是否真的回到原始用户场景，这里给第一层结论。</p>
        ${backcheckSection}
      </section>
      <section class="panel">
        <h2>每日蒸馏</h2>
        <p>这里展示最近的对话蒸馏结果，方便从首页直接回到方法论沉淀。</p>
        ${digestSection}
      </section>
      <section class="panel">
        <h2>Codex 同步标准动作</h2>
        <p>如果你在 <code>codex.exe</code> 里新增或调整了 skill / plugin，默认先跑这一条，不用分别查本地目录、运行时和 PMAIOS registry。</p>
        <div class="link-list">
          <span><code>npm run cli -- codex-state sync</code></span>
        </div>
        <p class="empty">这个动作会重写同步快照，并直接告诉你当前是 <code>aligned</code> 还是 <code>drift-detected</code>。</p>
      </section>
      <section class="panel">
        <h2>已发现的项目入口</h2>
        <p>这些入口来自当前仓库里已经存在的 project-board、roadmap-board、decision-board 和 change-log 资产。当前已补齐标准入口的项目：${fullyCoveredProjects}/${projectEntries.length || 0}。</p>
        ${projectSection}
      </section>
      <section class="panel">
        <h2>项目入口 Rollout</h2>
        <p>把“partial adoption”拆成可追踪的分母：哪些项目已经有总览入口，哪些项目还缺 roadmap、decision 和 change-log。</p>
        ${rolloutSection}
      </section>
    </main>
  </body>
</html>`;
}

const PUBLIC_ASSET_EXTENSIONS = new Set([
  '.svg',
  '.md',
  '.pdf',
  '.docx',
  '.txt',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.html',
]);

const PUBLIC_ASSET_PREFIXES = [
  'boards/',
  'docs/architecture/',
  'docs/implementation/',
  'docs/operations/',
  'docs/prd/',
  'docs/research/',
  'docs/templates/',
  'prompts/',
  'subprojects/',
];

function normalizePublicAssetPath(relativePath: string) {
  const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
  if (!normalized || normalized.includes('..')) {
    return null;
  }
  if (!PUBLIC_ASSET_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
    return null;
  }
  const extension = path.extname(normalized).toLowerCase();
  if (!PUBLIC_ASSET_EXTENSIONS.has(extension)) {
    return null;
  }
  return normalized;
}

function sendPublicAsset(res: express.Response, relativePath: string) {
  const normalized = normalizePublicAssetPath(relativePath);
  if (!normalized) {
    res.status(404).json({ error: 'asset_not_found' });
    return;
  }

  const absolutePath = path.join(rootDir, normalized);
  if (!absolutePath.startsWith(rootDir) || !fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
    res.status(404).json({ error: 'asset_not_found' });
    return;
  }

  res.sendFile(absolutePath);
}

function readWildcardPath(params: Record<string, unknown>) {
  const value = params[''];
  if (Array.isArray(value)) {
    return value.join('/');
  }
  return typeof value === 'string' ? value : '';
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeSubprojectId(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

type DatakiContextDefaults = {
  baseUrl: string | null;
  apiKey: string | null;
  userId: string | null;
  agentId: string | null;
  defaultKnowledgeBaseId: string | null;
  defaultKnowledgeBaseIds: string[];
};

async function resolveDatakiContextDefaults(subprojectId?: string | null): Promise<DatakiContextDefaults> {
  const normalizedSubprojectId = normalizeSubprojectId(subprojectId);
  const subproject = normalizedSubprojectId
    ? await subprojectRegistry.loadSubproject(normalizedSubprojectId).catch(() => null)
    : null;
  const datakiOverrides = subproject?.overrides.dataki;
  const envDefaultKnowledgeBaseId =
    process.env.DATAKI_KNOWLEDGE_BASE_ID?.trim() || process.env.WEKNORA_KNOWLEDGE_BASE_ID?.trim() || null;
  const defaultKnowledgeBaseIds = [
    ...(datakiOverrides?.knowledgeBaseIds ?? []),
    ...(process.env.DATAKI_KNOWLEDGE_BASE_IDS?.split(',') ?? []),
    ...(process.env.WEKNORA_KNOWLEDGE_BASE_IDS?.split(',') ?? []),
    ...(datakiOverrides?.knowledgeBaseId ? [datakiOverrides.knowledgeBaseId] : []),
    ...(envDefaultKnowledgeBaseId ? [envDefaultKnowledgeBaseId] : []),
  ].map((item) => item.trim()).filter((item, index, list) => Boolean(item) && list.indexOf(item) === index);

  return {
    baseUrl: process.env.DATAKI_BASE_URL?.trim() || process.env.WEKNORA_BASE_URL?.trim() || null,
    apiKey: process.env.DATAKI_API_KEY?.trim() || process.env.WEKNORA_API_KEY?.trim() || null,
    userId: process.env.DATAKI_USER_ID?.trim() || process.env.WEKNORA_USER_ID?.trim() || null,
    agentId: datakiOverrides?.agentId?.trim() || process.env.DATAKI_AGENT_ID?.trim() || process.env.WEKNORA_AGENT_ID?.trim() || null,
    defaultKnowledgeBaseId: datakiOverrides?.knowledgeBaseId?.trim() || envDefaultKnowledgeBaseId,
    defaultKnowledgeBaseIds,
  };
}

type ChecklistVersionSummary = {
  id: string;
  label: string;
  totalTrackedItems: number;
  solved: number;
  partial: number;
  carryOver: number;
  missingPlacement: number;
};

type ChecklistBackcheckSummary = {
  id: string;
  label: string;
  status: 'solved' | 'partial' | 'unsolved';
  detail: string;
};

type ExecutionChecklistSummary = {
  versions: ChecklistVersionSummary[];
  userBackchecks: ChecklistBackcheckSummary[];
};

type ProjectEntryAsset = {
  name: 'project-board.svg' | 'roadmap-board.svg' | 'decision-board.svg' | 'change-log.md';
  path: string;
  url: string;
};

type ProjectLinkedSourceKind = 'repo-entry' | 'governance' | 'ai-facing';

type ProjectLinkedSource = {
  name: string;
  kind: ProjectLinkedSourceKind;
  path: string;
  url: string;
};

type DailyDigestEntry = {
  id: string;
  label: string;
  path: string;
  url: string;
};

type ResumeContextSummary = {
  currentMode: string;
  currentTaskId: string | null;
  currentTaskLabel: string | null;
  lastUpdated: string;
  activeTaskCount: number;
  latestCheckpointLabel: string | null;
  latestCheckpointAt: string | null;
  latestDigest: DailyDigestEntry | null;
  recentEventLabels: string[];
};

type SharedWikiDocuments = {
  sourceDoc: string;
  translatedDoc: string;
  updatedAt: string | null;
};

type GraphNode = {
  id: string;
  label: string;
  kind: 'portal' | 'concept' | 'doc' | 'board' | 'prompt' | 'shared-doc';
  group: 'entry' | 'kernel' | 'workflow' | 'docs' | 'boards' | 'prompts';
  summary: string;
  url: string | null;
  weight: number;
};

type GraphEdge = {
  id: string;
  source: string;
  target: string;
  relation: 'contains' | 'explains' | 'supports' | 'navigates';
};

type ProjectEntrySummary = {
  subprojectId: string;
  expectedAssetCount: number;
  assetCount: number;
  assets: ProjectEntryAsset[];
  missingAssets: ProjectEntryAsset['name'][];
  linkedSourceCount: number;
  linkedSources: ProjectLinkedSource[];
};

async function loadExecutionChecklistSummary(): Promise<ExecutionChecklistSummary> {
  const checklistPath = path.join(rootDir, 'docs', 'operations', 'v0.4-v0.5-execution-checklist.md');
  try {
    const content = await fsp.readFile(checklistPath, 'utf8');
    const lines = content.split(/\r?\n/);
    const versions: ChecklistVersionSummary[] = [];
    const versionSections = [
      { id: 'v0.4', label: 'v0.4', start: '## v0.4 收口清单', end: '## v0.5 主清单' },
      { id: 'v0.5', label: 'v0.5', start: '## v0.5 主清单', end: '## 当前推荐执行顺序' },
    ];

    for (const section of versionSections) {
      const startIndex = lines.findIndex((line) => line.trim() === section.start);
      if (startIndex < 0) {
        continue;
      }
      const endIndex = lines.findIndex((line, index) => index > startIndex && line.trim() === section.end);
      const sectionLines = lines.slice(startIndex + 1, endIndex > startIndex ? endIndex : undefined);
      const totalTrackedItems = sectionLines.filter((line) => /^\s*-\s\[[x~ ]\]\s/.test(line)).length;
      const solved = sectionLines.filter((line) => /^\s*-\s\[x\]\s/.test(line)).length;
      const partial = sectionLines.filter((line) => /^\s*-\s\[~\]\s/.test(line)).length;
      const carryOver = sectionLines.filter((line) => /^\s*-\s\[[x~ ]\]\s.*carry-over/i.test(line)).length;

      versions.push({
        id: section.id,
        label: section.label,
        totalTrackedItems,
        solved,
        partial,
        carryOver,
        missingPlacement: 0,
      });
    }

    const userBackchecks: ChecklistBackcheckSummary[] = [];
    const backcheckStart = lines.findIndex((line) => line.trim() === '## 用户需求回查');
    if (backcheckStart >= 0) {
      let index = backcheckStart + 1;
      while (index < lines.length) {
        const header = lines[index].trim();
        if (!header.startsWith('### ')) {
          index += 1;
          continue;
        }

        const idBase = header.replace(/^###\s+/, '').trim().toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-');
        let label = '';
        let status: ChecklistBackcheckSummary['status'] = 'unsolved';
        let detail = '';
        index += 1;

        while (index < lines.length && !lines[index].trim().startsWith('### ') && !lines[index].trim().startsWith('## ')) {
          const current = lines[index].trim();
          const requirementMatch = current.match(/^-\s需求：(.+)$/);
          const statusMatch = current.match(/^-\s当前状态：`(solved|partial|unsolved)`$/);
          const detailMatch = current.match(/^-\s说明：(.+)$/);
          if (requirementMatch) {
            label = requirementMatch[1].trim();
          } else if (statusMatch) {
            status = statusMatch[1] as ChecklistBackcheckSummary['status'];
          } else if (detailMatch) {
            detail = detailMatch[1].trim();
          }
          index += 1;
        }

        if (label) {
          userBackchecks.push({
            id: idBase || `backcheck-${userBackchecks.length + 1}`,
            label,
            status,
            detail,
          });
        }
      }
    }

    return { versions, userBackchecks };
  } catch {
    return { versions: [], userBackchecks: [] };
  }
}

async function loadProjectEntrySummaries(): Promise<ProjectEntrySummary[]> {
  const subprojectsRoot = path.join(rootDir, 'subprojects');
  const assetNames: ProjectEntryAsset['name'][] = [
    'project-board.svg',
    'roadmap-board.svg',
    'decision-board.svg',
    'change-log.md',
  ];
  const linkedSourcePatterns: Array<{ relativePath: string; kind: ProjectLinkedSourceKind; name: string }> = [
    { relativePath: 'README.md', kind: 'repo-entry', name: 'README' },
    { relativePath: 'CLAUDE.md', kind: 'governance', name: 'CLAUDE' },
    { relativePath: 'subproject.json', kind: 'governance', name: 'subproject.json' },
    { relativePath: 'ARCHITECTURE.md', kind: 'ai-facing', name: 'ARCHITECTURE' },
    { relativePath: 'docs/README.md', kind: 'ai-facing', name: 'docs/README' },
    { relativePath: 'docs/ARCHITECTURE.md', kind: 'ai-facing', name: 'docs/ARCHITECTURE' },
    { relativePath: 'docs/TASKS.md', kind: 'ai-facing', name: 'docs/TASKS' },
    { relativePath: 'docs/PRD.md', kind: 'ai-facing', name: 'docs/PRD' },
    { relativePath: 'docs/memory/project-memory.md', kind: 'ai-facing', name: 'project-memory' },
  ];

  try {
    const entries = await fsp.readdir(subprojectsRoot, { withFileTypes: true });
    const summaries: ProjectEntrySummary[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const subprojectId = entry.name;
      const assets: ProjectEntryAsset[] = [];
      const linkedSources: ProjectLinkedSource[] = [];
      for (const assetName of assetNames) {
        const relativePath = path.posix.join('subprojects', subprojectId, assetName);
        const absolutePath = path.join(rootDir, relativePath);
        if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
          continue;
        }
        assets.push({
          name: assetName,
          path: relativePath,
          url: `/pmaios/${relativePath.replace(/\\/g, '/')}`,
        });
      }

      for (const source of linkedSourcePatterns) {
        const relativePath = path.posix.join('subprojects', subprojectId, source.relativePath);
        const absolutePath = path.join(rootDir, relativePath);
        if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
          continue;
        }
        linkedSources.push({
          name: source.name,
          kind: source.kind,
          path: relativePath,
          url: `/pmaios/${relativePath.replace(/\\/g, '/')}`,
        });
      }

      const docsRoot = path.join(subprojectsRoot, subprojectId, 'docs');
      if (fs.existsSync(docsRoot) && fs.statSync(docsRoot).isDirectory()) {
        const docFiles = await collectProjectDocFiles(path.join('subprojects', subprojectId, 'docs'));
        const discoveredDocSources: Array<{ includes: string[]; kind: ProjectLinkedSourceKind }> = [
          { includes: ['执行工作流'], kind: 'governance' },
          { includes: ['任务单'], kind: 'governance' },
        ];
        for (const descriptor of discoveredDocSources) {
          const matches = docFiles.filter((file) => descriptor.includes.some((token) => file.includes(token)));
          for (const match of matches.slice(0, 2)) {
            if (linkedSources.some((source) => source.path === match)) {
              continue;
            }
            linkedSources.push({
              name: path.basename(match, path.extname(match)),
              kind: descriptor.kind,
              path: match,
              url: `/pmaios/${match.replace(/\\/g, '/')}`,
            });
          }
        }
      }

      const missingAssets = assetNames.filter((assetName) => !assets.some((asset) => asset.name === assetName));

      if (assets.length || linkedSources.length) {
        summaries.push({
          subprojectId,
          expectedAssetCount: assetNames.length,
          assetCount: assets.length,
          assets,
          missingAssets,
          linkedSourceCount: linkedSources.length,
          linkedSources,
        });
      }
    }

    return summaries.sort((left, right) => left.subprojectId.localeCompare(right.subprojectId));
  } catch {
    return [];
  }
}

async function collectProjectDocFiles(relativeRoot: string): Promise<string[]> {
  const absoluteRoot = path.join(rootDir, relativeRoot);
  const collected: string[] = [];

  async function walk(currentRelative: string) {
    const currentAbsolute = path.join(rootDir, currentRelative);
    const entries = await fsp.readdir(currentAbsolute, { withFileTypes: true });
    for (const entry of entries) {
      const childRelative = path.posix.join(currentRelative, entry.name);
      if (entry.isDirectory()) {
        await walk(childRelative);
        continue;
      }
      if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
        collected.push(childRelative);
      }
    }
  }

  if (!fs.existsSync(absoluteRoot) || !fs.statSync(absoluteRoot).isDirectory()) {
    return [];
  }

  await walk(relativeRoot);
  return collected;
}

async function loadDailyDigestEntries(): Promise<DailyDigestEntry[]> {
  const digestsRoot = path.join(rootDir, 'docs', 'operations', 'daily-digests');
  try {
    if (!fs.existsSync(digestsRoot) || !fs.statSync(digestsRoot).isDirectory()) {
      return [];
    }
    const entries = await fsp.readdir(digestsRoot, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.md'))
      .map((entry) => entry.name)
      .sort((left, right) => right.localeCompare(left))
      .slice(0, 5);
    return files.map((file) => {
      const relativePath = path.posix.join('docs', 'operations', 'daily-digests', file);
      return {
        id: file.replace(/\.md$/i, ''),
        label: file.replace(/\.md$/i, ''),
        path: relativePath,
        url: `/pmaios/${relativePath}`,
      };
    });
  } catch {
    return [];
  }
}

async function loadResumeContextSummary(): Promise<ResumeContextSummary | null> {
  try {
    const [state, dailyDigests] = await Promise.all([
      mcpContextSync.getState(),
      loadDailyDigestEntries(),
    ]);
    const currentTask = state.tasks.find((task) => task.id === state.currentTaskId) ?? null;
    const activeTaskCount = state.tasks.filter((task) => task.status === 'in_progress').length;
    const checkpoints = [...state.checkpoints].sort((left, right) => right.timestamp.localeCompare(left.timestamp));
    const recentEvents = [...state.eventLog]
      .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
      .slice(0, 5)
      .map((event) => event.content);
    const latestCheckpoint = checkpoints[0] ?? null;

    return {
      currentMode: state.currentMode,
      currentTaskId: state.currentTaskId,
      currentTaskLabel: currentTask?.label ?? null,
      lastUpdated: state.lastUpdated,
      activeTaskCount,
      latestCheckpointLabel: latestCheckpoint?.label ?? null,
      latestCheckpointAt: latestCheckpoint?.timestamp ?? null,
      latestDigest: dailyDigests[0] ?? null,
      recentEventLabels: recentEvents,
    };
  } catch {
    return null;
  }
}

type HumanReadingLink = {
  label: string;
  description: string;
  url: string;
};

type PromptEntry = {
  id: string;
  path: string;
  url: string;
  content: string;
};

async function loadPromptEntries(): Promise<PromptEntry[]> {
  async function walk(relativeRoot: string): Promise<string[]> {
    const absoluteRoot = path.join(rootDir, relativeRoot);
    if (!fs.existsSync(absoluteRoot) || !fs.statSync(absoluteRoot).isDirectory()) {
      return [];
    }

    const entries = await fsp.readdir(absoluteRoot, { withFileTypes: true });
    const collected: string[] = [];

    for (const entry of entries) {
      const childRelative = path.posix.join(relativeRoot, entry.name);
      if (entry.isDirectory()) {
        collected.push(...(await walk(childRelative)));
        continue;
      }
      if (!entry.isFile() || path.extname(entry.name).toLowerCase() !== '.md') {
        continue;
      }

      collected.push(childRelative);
    }

    return collected.sort((left, right) => left.localeCompare(right));
  }

  try {
    const files = new Set<string>(await walk('prompts'));
    const promptPathRefs = ['skills/registry.json', 'config/product-management/agent-blueprints.json'];

    for (const promptPathRef of promptPathRefs) {
      const absoluteRefPath = path.join(rootDir, promptPathRef);
      if (!fs.existsSync(absoluteRefPath) || !fs.statSync(absoluteRefPath).isFile()) {
        continue;
      }

      const payload = JSON.parse(await fsp.readFile(absoluteRefPath, 'utf8')) as unknown;
      const stack: unknown[] = [payload];

      while (stack.length > 0) {
        const current = stack.pop();
        if (!current || typeof current !== 'object') {
          continue;
        }

        if (Array.isArray(current)) {
          stack.push(...current);
          continue;
        }

        for (const [key, value] of Object.entries(current)) {
          if (key === 'promptPath' && typeof value === 'string' && value.trim().length > 0) {
            const normalized = value.replace(/\\/g, '/').trim();
            if (!normalized.startsWith('~/')) {
              files.add(normalized);
            }
          }
          if (value && typeof value === 'object') {
            stack.push(value);
          }
        }
      }
    }

    const collected: PromptEntry[] = [];
    for (const relativePath of Array.from(files).sort((left, right) => left.localeCompare(right))) {
      const normalized = relativePath.replace(/\\/g, '/');
      const absolutePath = path.resolve(rootDir, normalized);
      if (!absolutePath.startsWith(rootDir) || !fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
        continue;
      }

      collected.push({
        id: normalized.replace(/[\\/]/g, '-').replace(/[^a-zA-Z0-9-_]/g, '-'),
        path: normalized,
        url: `/pmaios/${normalized}`,
        content: await fsp.readFile(absolutePath, 'utf8'),
      });
    }

    return collected;
  } catch {
    return [];
  }
}

function buildWikiReadingSections() {
  const kernelLinks: HumanReadingLink[] = [
    {
      label: 'PMAIOS 愿景需求',
      description: '解释 PMAIOS 为什么存在，以及它试图替代哪类碎片化协作方式。',
      url: '/pmaios/docs/prd/PMAIOS_requirements_vision.md',
    },
    {
      label: 'PMAIOS 架构愿景',
      description: '解释内核层、能力层、工作流层和人读层如何分层。',
      url: '/pmaios/docs/architecture/PMAIOS_architecture_vision.md',
    },
    {
      label: 'PMAIOS Product Operating Model',
      description: '解释 PMAIOS 如何把产品管理代理化、治理化，而不是只停留在聊天式辅助。',
      url: '/pmaios/docs/architecture/PMAIOS_product_management_agent_operating_model.md',
    },
    {
      label: 'PMAIOS 产品介绍',
      description: '统一说明 PMAIOS 的定位、image2 设计交付规则、高清出图和不漏页要求。',
      url: '/pmaios/docs/operations/pmaios-introduction.md',
    },
    {
      label: 'Prompt 文档集',
      description: '查看当前系统使用的 prompt 来源、查看入口、设计 prompt pack 和明细索引。',
      url: '/pmaios/docs/operations/prompt-library-index.md',
    },
    {
      label: 'PMAIOS 版本计划',
      description: '解释系统当前所处阶段，以及从本地 runtime 走向更稳定产品化系统的路径。',
      url: '/pmaios/docs/operations/pmaios-version-plan.md',
    },
  ];

  const workflowLinks: HumanReadingLink[] = [
    {
      label: '产品总工作流真源',
      description: '平台级工作主链，定义输入、研究、决策、输出和同步方式。',
      url: '/pmaios/docs/operations/product-workflow-total-design.md',
    },
    {
      label: '主工作流定义',
      description: 'PMAIOS 主流程运行定义，解释工作流节点如何连接。',
      url: '/pmaios/workflows/main.md',
    },
    {
      label: '执行工作流定义',
      description: '解释 file-driven、repository-native 的执行模式。',
      url: '/pmaios/workflows/execution.md',
    },
    {
      label: '版本治理',
      description: '解释版本如何被分配、确认、回写和治理。',
      url: '/pmaios/docs/operations/version-governance.md',
    },
  ];

  const setupLinks: HumanReadingLink[] = [
    {
      label: '本地运行手册',
      description: '开发态、生产态、端口、冒烟检查和 Docker 说明。',
      url: '/pmaios/docs/operations/local-runbook.md',
    },
    {
      label: '启动身份单',
      description: '重启、切换工具或上下文丢失后，系统如何恢复统一身份与工作规则。',
      url: '/pmaios/docs/operations/startup-whoami.md',
    },
    {
      label: '发布总结',
      description: '当前本地可交付 runtime 已经打通了哪些表层和链路。',
      url: '/pmaios/docs/operations/release-summary.md',
    },
  ];

  const iterationLinks: HumanReadingLink[] = [
    {
      label: 'v0.4 -> v0.5 过渡快照',
      description: '迭代演进的关键快照，适合讲系统是怎么收口和转向的。',
      url: '/pmaios/docs/operations/v0.4-v0.5-transition-2026-04-21.md',
    },
    {
      label: 'v0.5 实施索引',
      description: '把 v0.5 的实施材料、图板和真源文档汇总成一个入口。',
      url: '/pmaios/docs/operations/v0.5-implementation-index.md',
    },
    {
      label: '2026-04-21 迭代资产索引',
      description: '汇总某一轮迭代中的图板和配套说明。',
      url: '/pmaios/docs/operations/iteration-assets-2026-04-21.md',
    },
    {
      label: 'v0.4 / v0.5 执行清单',
      description: '从分母视角追踪哪些项已完成、部分完成或 carry-over。',
      url: '/pmaios/docs/operations/v0.4-v0.5-execution-checklist.md',
    },
  ];

  const boardLinks: HumanReadingLink[] = [
    {
      label: 'SVG 图板总目录',
      description: '统一图形化入口，适合直接演示。',
      url: '/pmaios/boards/index.svg',
    },
    {
      label: 'PMAIOS Demo Intro',
      description: '一页讲清系统做什么、解决什么、现在做到哪。',
      url: '/pmaios/boards/pmaios-demo-intro.svg',
    },
    {
      label: 'Capability Overview',
      description: '整体能力概览，适合对外讲当前能力与下一步价值。',
      url: '/pmaios/boards/pmaios-capability-overview.svg',
    },
    {
      label: 'Architecture Roadmap',
      description: '把架构、路线和产品化方向放进一张图。',
      url: '/pmaios/boards/pmaios-architecture-roadmap.svg',
    },
    {
      label: 'Workflow Board',
      description: '把 PMAIOS 主工作流可视化。',
      url: '/pmaios/boards/pmaios-workflow.svg',
    },
    {
      label: 'Rules Board',
      description: '把系统长期有效的规则抽出来做视觉讲解。',
      url: '/pmaios/boards/pmaios-rules.svg',
    },
  ];

  return { kernelLinks, workflowLinks, setupLinks, iterationLinks, boardLinks };
}

function renderLinkCards(items: HumanReadingLink[]) {
  return items
    .map(
      (item) => `<a class="wiki-card" href="${item.url}" target="_blank" rel="noreferrer">
        <strong>${escapeHtml(item.label)}</strong>
        <span>${escapeHtml(item.description)}</span>
        <code>${escapeHtml(item.url)}</code>
      </a>`,
    )
    .join('');
}

function renderPromptPanels(entries: PromptEntry[]) {
  if (entries.length === 0) {
    return '<p class="wiki-empty">当前没有发现可展示的 prompt 资产。</p>';
  }

  return entries
    .map(
      (entry) => `<details class="prompt-panel" id="${entry.id}">
        <summary>
          <span>${escapeHtml(entry.path)}</span>
          <a href="${entry.url}" target="_blank" rel="noreferrer">打开原文件</a>
        </summary>
        <pre>${escapeHtml(entry.content)}</pre>
      </details>`,
    )
    .join('');
}

const SHARED_WIKI_DOCUMENTS_PATH = 'generated/wiki/shared-documents.json';

async function loadSharedWikiDocuments(): Promise<SharedWikiDocuments> {
  if (!(await store.exists(SHARED_WIKI_DOCUMENTS_PATH))) {
    return {
      sourceDoc: '',
      translatedDoc: '',
      updatedAt: null,
    };
  }

  const payload = await store.readJson<Partial<SharedWikiDocuments>>(SHARED_WIKI_DOCUMENTS_PATH);
  return {
    sourceDoc: typeof payload.sourceDoc === 'string' ? payload.sourceDoc : '',
    translatedDoc: typeof payload.translatedDoc === 'string' ? payload.translatedDoc : '',
    updatedAt: typeof payload.updatedAt === 'string' ? payload.updatedAt : null,
  };
}

async function saveSharedWikiDocuments(documents: SharedWikiDocuments) {
  await store.writeJson(SHARED_WIKI_DOCUMENTS_PATH, documents);
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, Math.max(0, maxLength - 3))}...`;
}

function buildGraphOverview(
  promptEntries: PromptEntry[],
  sharedDocs: SharedWikiDocuments,
  resumeContext: ResumeContextSummary | null,
) {
  const nodes: GraphNode[] = [
    {
      id: 'entry-root',
      label: 'PMAIOS',
      kind: 'portal',
      group: 'entry',
      summary: '统一入口，汇聚 wiki、图板、workspace 与共享文档。',
      url: '/',
      weight: 3,
    },
    {
      id: 'entry-workspace',
      label: 'Workspace',
      kind: 'portal',
      group: 'entry',
      summary: '运行时控制台，查看 shared context、模式、任务与进度。',
      url: '/workspace',
      weight: 2,
    },
    {
      id: 'entry-wiki',
      label: 'Wiki',
      kind: 'portal',
      group: 'entry',
      summary: '系统状态型入口，展示最近动作、当前状态、共享文档与推荐入口。',
      url: '/pmaios/wiki',
      weight: 3,
    },
    {
      id: 'entry-prompts',
      label: 'Prompts',
      kind: 'portal',
      group: 'entry',
      summary: '独立提示词清单页，展示系统真实引用的 prompt 路径与全文。',
      url: '/pmaios/prompts',
      weight: 2,
    },
    {
      id: 'entry-graph',
      label: 'Graph',
      kind: 'portal',
      group: 'entry',
      summary: '交互式全景图入口，适合演示全貌与快速钻取。',
      url: '/pmaios/graph',
      weight: 3,
    },
    {
      id: 'entry-resume',
      label: 'Resume Context',
      kind: 'portal',
      group: 'entry',
      summary: resumeContext
        ? `当前 ${resumeContext.currentMode} / ${resumeContext.currentTaskLabel ?? '无当前任务'}`
        : '读取共享 mcp-context，恢复上次会话的模式、任务与 checkpoint。',
      url: '/api/mcp-context/resume',
      weight: 2,
    },
    {
      id: 'kernel-core',
      label: 'Kernel',
      kind: 'concept',
      group: 'kernel',
      summary: '文件驱动、真源优先、版本治理、评审闭环。',
      url: '/pmaios/docs/operations/pmaios-version-plan.md',
      weight: 3,
    },
    {
      id: 'kernel-requirement',
      label: 'Requirements',
      kind: 'concept',
      group: 'kernel',
      summary: '用户需求 / 产品需求双层规则，防漏与晋升机制。',
      url: '/pmaios/docs/operations/requirement-promotion-and-loss-prevention.md',
      weight: 2,
    },
    {
      id: 'kernel-progress',
      label: 'Progress Protocol',
      kind: 'concept',
      group: 'kernel',
      summary: '按长目标分母看进度，而不是只报完成项。',
      url: '/pmaios/docs/operations/current-version-progress.md',
      weight: 2,
    },
    {
      id: 'workflow-main',
      label: 'Workflow',
      kind: 'concept',
      group: 'workflow',
      summary: '输入进入 inbox，经研究、决策、评审、交付形成主链。',
      url: '/pmaios/boards/pmaios-workflow.svg',
      weight: 3,
    },
    {
      id: 'workflow-mode',
      label: 'Modes',
      kind: 'concept',
      group: 'workflow',
      summary: 'default / plan / deep / do 协作模式及其恢复逻辑。',
      url: '/pmaios/docs/architecture/mode-architecture.md',
      weight: 2,
    },
    {
      id: 'workflow-codex',
      label: 'Codex Migration',
      kind: 'concept',
      group: 'workflow',
      summary: 'Codex 与 PMAIOS 的本地状态、plugin、skill、shared context 对齐。',
      url: '/pmaios/docs/operations/codex-collaboration-migration-baseline.md',
      weight: 2,
    },
    {
      id: 'doc-version',
      label: 'Version Plan',
      kind: 'doc',
      group: 'docs',
      summary: 'v0.4 / v0.5 正式版本时间线与主题边界。',
      url: '/pmaios/docs/operations/pmaios-version-plan.md',
      weight: 2,
    },
    {
      id: 'doc-checklist',
      label: 'Execution Checklist',
      kind: 'doc',
      group: 'docs',
      summary: 'v0.4 / v0.5 执行清单与分母收口真源。',
      url: '/pmaios/docs/operations/v0.4-v0.5-execution-checklist.md',
      weight: 2,
    },
    {
      id: 'doc-transition',
      label: 'Transition Snapshot',
      kind: 'doc',
      group: 'docs',
      summary: 'v0.4 -> v0.5 的正式交接快照。',
      url: '/pmaios/docs/operations/v0.4-v0.5-transition-2026-04-21.md',
      weight: 2,
    },
    {
      id: 'doc-shared-source',
      label: '原文文档',
      kind: 'shared-doc',
      group: 'docs',
      summary: sharedDocs.sourceDoc
        ? truncateText(sharedDocs.sourceDoc.replace(/\s+/g, ' '), 84)
        : '统一共享原文文档，本地持久化在 wiki 里。',
      url: '/pmaios/wiki',
      weight: 2,
    },
    {
      id: 'doc-shared-translated',
      label: '中文文档',
      kind: 'shared-doc',
      group: 'docs',
      summary: sharedDocs.translatedDoc
        ? truncateText(sharedDocs.translatedDoc.replace(/\s+/g, ' '), 84)
        : '统一共享中文文档，本地持久化在 wiki 里。',
      url: '/pmaios/wiki',
      weight: 2,
    },
    {
      id: 'doc-latest-digest',
      label: 'Latest Digest',
      kind: 'doc',
      group: 'docs',
      summary: resumeContext?.latestDigest
        ? `最近蒸馏：${resumeContext.latestDigest.label}`
        : '最近蒸馏尚未生成，说明自动沉淀链路还不完整。',
      url: resumeContext?.latestDigest?.url ?? '/pmaios/docs/operations/daily-digests',
      weight: 2,
    },
    {
      id: 'board-index',
      label: 'Boards Index',
      kind: 'board',
      group: 'boards',
      summary: 'SVG 图板总目录，适合演示和讲故事。',
      url: '/pmaios/boards/index.svg',
      weight: 3,
    },
    {
      id: 'board-capability',
      label: 'Capability Overview',
      kind: 'board',
      group: 'boards',
      summary: '系统能力总览，适合对外汇报。',
      url: '/pmaios/boards/pmaios-capability-overview.svg',
      weight: 2,
    },
    {
      id: 'board-roadmap',
      label: 'Architecture Roadmap',
      kind: 'board',
      group: 'boards',
      summary: '把架构、路线、产品化方向放进一张图。',
      url: '/pmaios/boards/pmaios-architecture-roadmap.svg',
      weight: 2,
    },
  ];

  const promptNodes = promptEntries.slice(0, 10).map((entry, index) => ({
    id: `prompt-${index + 1}`,
    label: path.basename(entry.path).replace(/\.md$/i, ''),
    kind: 'prompt' as const,
    group: 'prompts' as const,
    summary: truncateText(entry.content.replace(/\s+/g, ' '), 90),
    url: entry.url,
    weight: 1,
  }));

  const runtimeNodes = resumeContext
    ? [
        {
          id: 'workflow-current-task',
          label: 'Current Task',
          kind: 'concept' as const,
          group: 'workflow' as const,
          summary: resumeContext.currentTaskLabel
            ? `当前共享任务：${resumeContext.currentTaskLabel}`
            : '当前没有共享进行中的任务。',
          url: '/api/mcp-context/resume',
          weight: 2,
        },
        {
          id: 'workflow-checkpoint',
          label: 'Latest Checkpoint',
          kind: 'concept' as const,
          group: 'workflow' as const,
          summary: resumeContext.latestCheckpointLabel
            ? `${resumeContext.latestCheckpointLabel} @ ${resumeContext.latestCheckpointAt ?? '-'}`
            : '当前还没有 checkpoint。',
          url: '/api/mcp-context/resume',
          weight: 1,
        },
      ]
    : [];

  nodes.push(...runtimeNodes, ...promptNodes);

  const edges: GraphEdge[] = [
    { id: 'e-root-wiki', source: 'entry-root', target: 'entry-wiki', relation: 'contains' },
    { id: 'e-root-workspace', source: 'entry-root', target: 'entry-workspace', relation: 'contains' },
    { id: 'e-root-graph', source: 'entry-root', target: 'entry-graph', relation: 'contains' },
    { id: 'e-root-resume', source: 'entry-root', target: 'entry-resume', relation: 'contains' },
    { id: 'e-wiki-kernel', source: 'entry-wiki', target: 'kernel-core', relation: 'explains' },
    { id: 'e-wiki-workflow', source: 'entry-wiki', target: 'workflow-main', relation: 'explains' },
    { id: 'e-wiki-shared1', source: 'entry-wiki', target: 'doc-shared-source', relation: 'contains' },
    { id: 'e-wiki-shared2', source: 'entry-wiki', target: 'doc-shared-translated', relation: 'contains' },
    { id: 'e-wiki-digest', source: 'entry-wiki', target: 'doc-latest-digest', relation: 'contains' },
    { id: 'e-kernel-req', source: 'kernel-core', target: 'kernel-requirement', relation: 'supports' },
    { id: 'e-kernel-progress', source: 'kernel-core', target: 'kernel-progress', relation: 'supports' },
    { id: 'e-workflow-mode', source: 'workflow-main', target: 'workflow-mode', relation: 'supports' },
    { id: 'e-workflow-codex', source: 'workflow-main', target: 'workflow-codex', relation: 'supports' },
    { id: 'e-resume-mode', source: 'entry-resume', target: 'workflow-mode', relation: 'supports' },
    { id: 'e-version-checklist', source: 'doc-version', target: 'doc-checklist', relation: 'supports' },
    { id: 'e-checklist-transition', source: 'doc-checklist', target: 'doc-transition', relation: 'supports' },
    { id: 'e-boards-index', source: 'entry-wiki', target: 'board-index', relation: 'navigates' },
    { id: 'e-board-capability', source: 'board-index', target: 'board-capability', relation: 'contains' },
    { id: 'e-board-roadmap', source: 'board-index', target: 'board-roadmap', relation: 'contains' },
  ];

  for (const promptNode of promptNodes) {
    edges.push({
      id: `e-prompt-${promptNode.id}`,
      source: 'entry-wiki',
      target: promptNode.id,
      relation: 'contains',
    });
  }

  if (resumeContext) {
    edges.push({
      id: 'e-resume-task',
      source: 'entry-resume',
      target: 'workflow-current-task',
      relation: 'supports',
    });
    edges.push({
      id: 'e-task-checkpoint',
      source: 'workflow-current-task',
      target: 'workflow-checkpoint',
      relation: 'supports',
    });
    edges.push({
      id: 'e-checkpoint-digest',
      source: 'workflow-checkpoint',
      target: 'doc-latest-digest',
      relation: 'supports',
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    nodes,
    edges,
  };
}

function renderPmaiosGraphHtml() {
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>PMAIOS Graph</title>
    <style>
      :root {
        color-scheme: dark;
        --bg: #07111d;
        --bg-2: #0d1a2b;
        --panel: rgba(11, 23, 38, 0.82);
        --line: rgba(117, 219, 181, 0.24);
        --text: #f4fbff;
        --muted: #9ab8c9;
        --accent: #75dbb5;
        --accent-2: #7ea0ff;
        --board: #ffbc6d;
        --doc: #8de3ff;
        --prompt: #ff8f9c;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        overflow: hidden;
        font-family: "Microsoft YaHei", "PingFang SC", sans-serif;
        color: var(--text);
        background:
          radial-gradient(circle at 15% 20%, rgba(117, 219, 181, 0.18), transparent 20%),
          radial-gradient(circle at 80% 15%, rgba(126, 160, 255, 0.16), transparent 24%),
          radial-gradient(circle at 50% 85%, rgba(255, 143, 156, 0.14), transparent 20%),
          linear-gradient(180deg, var(--bg) 0%, var(--bg-2) 100%);
      }
      .shell {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 360px;
        min-height: 100vh;
      }
      .canvas-wrap {
        position: relative;
        overflow: auto;
        padding: 24px;
      }
      .hero {
        position: absolute;
        top: 24px;
        left: 24px;
        z-index: 3;
        width: min(520px, calc(100% - 48px));
        padding: 18px 20px;
        border: 1px solid rgba(117, 219, 181, 0.18);
        border-radius: 22px;
        background: rgba(7, 17, 29, 0.72);
        backdrop-filter: blur(16px);
        box-shadow: 0 18px 48px rgba(0, 0, 0, 0.28);
      }
      .hero h1, .hero p { margin: 0; }
      .eyebrow {
        color: var(--accent);
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-size: 12px;
      }
      .hero h1 {
        margin-top: 8px;
        font-size: 30px;
        line-height: 1.1;
      }
      .hero p {
        margin-top: 10px;
        color: var(--muted);
        line-height: 1.65;
      }
      .hero-links {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 14px;
      }
      .hero-links a {
        color: var(--text);
        text-decoration: none;
        border: 1px solid rgba(117, 219, 181, 0.22);
        background: rgba(117, 219, 181, 0.08);
        border-radius: 999px;
        padding: 8px 12px;
      }
      .graph-stage {
        position: relative;
        min-width: 1500px;
        min-height: 1080px;
        border-radius: 28px;
        border: 1px solid rgba(117, 219, 181, 0.12);
        background:
          linear-gradient(rgba(117, 219, 181, 0.06) 1px, transparent 1px),
          linear-gradient(90deg, rgba(117, 219, 181, 0.06) 1px, transparent 1px),
          radial-gradient(circle at center, rgba(117, 219, 181, 0.06), transparent 44%),
          rgba(255, 255, 255, 0.01);
        background-size: 48px 48px, 48px 48px, cover, auto;
        box-shadow: inset 0 0 120px rgba(117, 219, 181, 0.04);
      }
      .graph-svg {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        z-index: 1;
      }
      .group-label {
        position: absolute;
        z-index: 2;
        padding: 8px 12px;
        border-radius: 999px;
        background: rgba(7, 17, 29, 0.78);
        border: 1px solid rgba(117, 219, 181, 0.14);
        color: var(--muted);
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .node {
        position: absolute;
        z-index: 2;
        width: 220px;
        min-height: 110px;
        padding: 14px 16px;
        border-radius: 22px;
        background: rgba(11, 23, 38, 0.78);
        border: 1px solid rgba(117, 219, 181, 0.18);
        box-shadow: 0 18px 48px rgba(0, 0, 0, 0.22);
        backdrop-filter: blur(12px);
        cursor: pointer;
        transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
      }
      .node:hover,
      .node.is-active {
        transform: translateY(-3px) scale(1.02);
        border-color: rgba(117, 219, 181, 0.6);
        box-shadow: 0 20px 54px rgba(117, 219, 181, 0.18);
      }
      .node::before {
        content: "";
        position: absolute;
        top: -8px;
        right: 16px;
        width: 12px;
        height: 12px;
        border-radius: 999px;
        background: var(--accent);
        box-shadow: 0 0 18px var(--accent);
      }
      .node[data-kind="board"]::before { background: var(--board); box-shadow: 0 0 18px var(--board); }
      .node[data-kind="doc"]::before,
      .node[data-kind="shared-doc"]::before { background: var(--doc); box-shadow: 0 0 18px var(--doc); }
      .node[data-kind="prompt"]::before { background: var(--prompt); box-shadow: 0 0 18px var(--prompt); }
      .node[data-kind="portal"]::before { background: var(--accent-2); box-shadow: 0 0 18px var(--accent-2); }
      .node__title {
        font-size: 18px;
        font-weight: 700;
        line-height: 1.15;
      }
      .node__kind {
        margin-top: 6px;
        font-size: 11px;
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .node__summary {
        margin-top: 10px;
        color: var(--muted);
        line-height: 1.55;
        font-size: 13px;
      }
      .side-panel {
        border-left: 1px solid rgba(117, 219, 181, 0.12);
        background: rgba(5, 11, 19, 0.88);
        backdrop-filter: blur(16px);
        padding: 24px 20px;
        display: grid;
        gap: 16px;
        align-content: start;
      }
      .side-panel h2, .side-panel p { margin: 0; }
      .panel-card {
        padding: 16px;
        border-radius: 20px;
        border: 1px solid rgba(117, 219, 181, 0.12);
        background: rgba(11, 23, 38, 0.72);
      }
      .panel-card h2 {
        font-size: 22px;
        line-height: 1.15;
      }
      .panel-card p {
        margin-top: 10px;
        color: var(--muted);
        line-height: 1.7;
      }
      .panel-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 12px;
      }
      .panel-meta span,
      .panel-meta a {
        padding: 6px 10px;
        border-radius: 999px;
        background: rgba(117, 219, 181, 0.08);
        color: var(--text);
        text-decoration: none;
        border: 1px solid rgba(117, 219, 181, 0.14);
      }
      .legend {
        display: grid;
        gap: 8px;
      }
      .legend-row {
        display: flex;
        align-items: center;
        gap: 10px;
        color: var(--muted);
      }
      .legend-row i {
        width: 10px;
        height: 10px;
        border-radius: 999px;
        display: inline-block;
      }
      .hint {
        color: var(--muted);
        font-size: 13px;
        line-height: 1.7;
      }
      @media (max-width: 1100px) {
        .shell {
          grid-template-columns: 1fr;
        }
        .side-panel {
          border-left: 0;
          border-top: 1px solid rgba(117, 219, 181, 0.12);
        }
      }
    </style>
  </head>
  <body>
    <div class="shell">
      <section class="canvas-wrap">
        <div class="hero">
          <div class="eyebrow">PMAIOS Panorama</div>
          <h1>交互式全景图 / 知识图谱</h1>
          <p>这里不是静态海报，而是可点击、可钻取、能跳到真实 wiki / 图板 / 文档 / prompt 的演示层。点击节点后，右侧会切换详情与跳转入口。</p>
          <div class="hero-links">
            <a href="/pmaios/wiki">返回 Wiki</a>
            <a href="/pmaios/boards/index.svg">打开图板</a>
            <a href="/">统一入口</a>
          </div>
        </div>
        <div id="graph-stage" class="graph-stage">
          <svg id="graph-svg" class="graph-svg"></svg>
        </div>
      </section>
      <aside class="side-panel">
        <div id="panel-main" class="panel-card">
          <h2>选择一个节点</h2>
          <p>建议先点中央的 <strong>PMAIOS</strong>、<strong>Wiki</strong>、<strong>Kernel</strong> 或 <strong>Boards Index</strong>，从核心结构开始讲解整套系统。</p>
        </div>
        <div class="panel-card">
          <h2>图例</h2>
          <div class="legend">
            <div class="legend-row"><i style="background:#7ea0ff"></i><span>入口 / Portal</span></div>
            <div class="legend-row"><i style="background:#75dbb5"></i><span>概念 / Kernel / Workflow</span></div>
            <div class="legend-row"><i style="background:#8de3ff"></i><span>文档 / Shared Docs</span></div>
            <div class="legend-row"><i style="background:#ffbc6d"></i><span>图板 / Boards</span></div>
            <div class="legend-row"><i style="background:#ff8f9c"></i><span>Prompt / 提示词</span></div>
          </div>
        </div>
        <div class="panel-card">
          <h2>使用方式</h2>
          <p class="hint">滚动页面可以浏览整张全景图。节点是仓库真源的可导航入口，不是纯视觉摆设。后续还可以继续接入自动生成的项目、版本、需求和知识图谱层。</p>
        </div>
      </aside>
    </div>
    <script>
      const stage = document.getElementById('graph-stage');
      const svg = document.getElementById('graph-svg');
      const panel = document.getElementById('panel-main');

      const groupConfig = {
        entry: { x: 120, y: 170, label: 'Entry Layer' },
        kernel: { x: 470, y: 180, label: 'Kernel Layer' },
        workflow: { x: 820, y: 180, label: 'Workflow Layer' },
        docs: { x: 420, y: 520, label: 'Docs Layer' },
        boards: { x: 860, y: 520, label: 'Boards Layer' },
        prompts: { x: 1210, y: 180, label: 'Prompt Layer' },
      };

      function escapeHtml(value) {
        return value
          .replaceAll('&', '&amp;')
          .replaceAll('<', '&lt;')
          .replaceAll('>', '&gt;')
          .replaceAll('"', '&quot;')
          .replaceAll("'", '&#39;');
      }

      function renderPanel(node, linkedEdges) {
        const linked = linkedEdges.length
          ? '<div class="panel-meta">' + linkedEdges.map((edge) => '<span>' + edge.relation + '</span>').join('') + '</div>'
          : '';
        const action = node.url
          ? '<div class="panel-meta"><a href="' + node.url + '">打开入口</a></div>'
          : '';
        panel.innerHTML =
          '<h2>' + escapeHtml(node.label) + '</h2>' +
          '<p>' + escapeHtml(node.summary) + '</p>' +
          '<div class="panel-meta">' +
            '<span>' + escapeHtml(node.kind) + '</span>' +
            '<span>' + escapeHtml(node.group) + '</span>' +
          '</div>' +
          linked +
          action;
      }

      function drawLine(source, target, relation) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', String(source.x + 110));
        line.setAttribute('y1', String(source.y + 55));
        line.setAttribute('x2', String(target.x + 110));
        line.setAttribute('y2', String(target.y + 55));
        line.setAttribute('stroke', relation === 'contains' ? 'rgba(117,219,181,0.26)' : 'rgba(126,160,255,0.22)');
        line.setAttribute('stroke-width', relation === 'contains' ? '2.4' : '1.6');
        line.setAttribute('stroke-linecap', 'round');
        line.setAttribute('stroke-dasharray', relation === 'supports' ? '8 8' : 'none');
        return line;
      }

      function buildLayout(nodes) {
        const layout = new Map();
        const grouped = new Map();
        for (const node of nodes) {
          const list = grouped.get(node.group) || [];
          list.push(node);
          grouped.set(node.group, list);
        }

        for (const [group, items] of grouped.entries()) {
          const conf = groupConfig[group];
          items.forEach((item, index) => {
            const row = Math.floor(index / 2);
            const col = index % 2;
            const x = conf.x + col * 250 + (row % 2 === 1 ? 20 : 0);
            const y = conf.y + row * 160;
            layout.set(item.id, { x, y });
          });
        }

        return layout;
      }

      async function main() {
        const response = await fetch('/api/graph/overview');
        const payload = await response.json();
        const layout = buildLayout(payload.nodes);

        Object.entries(groupConfig).forEach(([group, conf]) => {
          const label = document.createElement('div');
          label.className = 'group-label';
          label.textContent = conf.label;
          label.style.left = conf.x + 'px';
          label.style.top = (conf.y - 52) + 'px';
          stage.appendChild(label);
        });

        for (const edge of payload.edges) {
          const sourcePos = layout.get(edge.source);
          const targetPos = layout.get(edge.target);
          if (!sourcePos || !targetPos) continue;
          svg.appendChild(drawLine(sourcePos, targetPos, edge.relation));
        }

        const edgesByNode = new Map();
        payload.edges.forEach((edge) => {
          const sourceList = edgesByNode.get(edge.source) || [];
          sourceList.push(edge);
          edgesByNode.set(edge.source, sourceList);
          const targetList = edgesByNode.get(edge.target) || [];
          targetList.push(edge);
          edgesByNode.set(edge.target, targetList);
        });

        let activeEl = null;
        for (const node of payload.nodes) {
          const pos = layout.get(node.id);
          if (!pos) continue;

          const el = document.createElement('button');
          el.type = 'button';
          el.className = 'node';
          el.dataset.kind = node.kind;
          el.style.left = pos.x + 'px';
          el.style.top = pos.y + 'px';
          el.innerHTML =
            '<div class="node__title">' + escapeHtml(node.label) + '</div>' +
            '<div class="node__kind">' + escapeHtml(node.kind) + ' · ' + escapeHtml(node.group) + '</div>' +
            '<div class="node__summary">' + escapeHtml(node.summary) + '</div>';

          el.addEventListener('click', () => {
            if (activeEl) activeEl.classList.remove('is-active');
            el.classList.add('is-active');
            activeEl = el;
            renderPanel(node, edgesByNode.get(node.id) || []);
          });

          stage.appendChild(el);
        }
      }

      void main();
    </script>
  </body>
</html>`;
}

function renderPmaiosWikiHtml(
  promptEntries: PromptEntry[],
  sharedDocs: SharedWikiDocuments,
  resumeContext: ResumeContextSummary | null,
) {
  const { kernelLinks, workflowLinks, setupLinks, iterationLinks, boardLinks } = buildWikiReadingSections();
  const recentActions = (resumeContext?.recentEventLabels ?? []).slice(0, 5);

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>PMAIOS Wiki</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f4efe6;
        --panel: rgba(255, 251, 245, 0.94);
        --panel-strong: #fffaf2;
        --text: #1c1814;
        --muted: #6f675d;
        --line: #d8ccbb;
        --accent: #a84f27;
        --accent-soft: #f0ddcf;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "Microsoft YaHei", "PingFang SC", sans-serif;
        color: var(--text);
        background:
          radial-gradient(circle at top left, rgba(168, 79, 39, 0.16), transparent 26%),
          radial-gradient(circle at top right, rgba(30, 103, 122, 0.12), transparent 22%),
          linear-gradient(180deg, #fbf7f1 0%, var(--bg) 100%);
      }
      a { color: var(--accent); }
      main {
        width: min(1240px, calc(100vw - 32px));
        margin: 0 auto;
        padding: 24px 0 48px;
        display: grid;
        gap: 18px;
      }
      .hero,
      .section,
      .graph-node,
      .prompt-panel {
        border: 1px solid var(--line);
        background: var(--panel);
        border-radius: 24px;
        box-shadow: 0 18px 48px rgba(28, 24, 20, 0.08);
      }
      .hero {
        padding: 28px;
        display: grid;
        gap: 16px;
      }
      .eyebrow {
        color: var(--accent);
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-size: 12px;
      }
      h1, h2, p { margin: 0; }
      h1 { font-size: clamp(30px, 5vw, 48px); line-height: 1.08; }
      h2 { font-size: 24px; }
      p { line-height: 1.7; color: var(--muted); }
      .card-grid,
      .graph-grid,
      .metric-grid {
        display: grid;
        gap: 14px;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      }
      .metric-grid {
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      }
      .resume-grid {
        display: grid;
        gap: 14px;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      }
      .metric-card,
      .wiki-card,
      .graph-node {
        padding: 18px;
        background: var(--panel-strong);
      }
      .metric-card strong,
      .wiki-card strong,
      .graph-node strong {
        display: block;
        margin-bottom: 8px;
        font-size: 16px;
      }
      .metric-card span,
      .wiki-card span,
      .graph-node span,
      .graph-node code {
        color: var(--muted);
        line-height: 1.6;
      }
      .wiki-card,
      .graph-node {
        text-decoration: none;
        border: 1px solid var(--line);
        border-radius: 18px;
      }
      .wiki-card:hover {
        border-color: var(--accent);
        transform: translateY(-1px);
      }
      .wiki-card code,
      .summary-bar code {
        display: inline-block;
        margin-top: 10px;
        padding: 4px 8px;
        border-radius: 999px;
        background: var(--accent-soft);
        color: #66311a;
      }
      .section {
        padding: 24px;
        display: grid;
        gap: 16px;
      }
      .summary-bar,
      .prompt-nav {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }
      .status-list,
      .action-list {
        display: grid;
        gap: 12px;
      }
      .visual-frame {
        overflow: hidden;
        border-radius: 24px;
        border: 1px solid var(--line);
        background: var(--panel-strong);
        box-shadow: 0 18px 48px rgba(28, 24, 20, 0.08);
      }
      .visual-frame img {
        display: block;
        width: 100%;
        height: auto;
      }
      .status-item,
      .action-item {
        padding: 16px 18px;
        border: 1px solid var(--line);
        border-radius: 18px;
        background: var(--panel-strong);
      }
      .status-item strong,
      .action-item strong {
        display: block;
        margin-bottom: 6px;
      }
      .action-item span,
      .status-item span {
        color: var(--muted);
        line-height: 1.6;
      }
      .graph-node em {
        display: block;
        margin-top: 8px;
        font-style: normal;
        color: var(--accent);
      }
      .prompt-nav a {
        text-decoration: none;
        padding: 6px 10px;
        border-radius: 999px;
        border: 1px solid var(--line);
        background: var(--panel-strong);
      }
      .prompt-panel {
        overflow: hidden;
      }
      .doc-editor {
        display: grid;
        gap: 14px;
      }
      .doc-editor__meta {
        color: var(--muted);
        font-size: 13px;
      }
      .doc-editor__grid {
        display: grid;
        gap: 14px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .doc-editor__field {
        display: grid;
        gap: 8px;
      }
      .doc-editor__label {
        font-weight: 700;
      }
      .doc-editor__textarea {
        width: 100%;
        min-height: 320px;
        padding: 14px;
        resize: vertical;
        border-radius: 18px;
        border: 1px solid var(--line);
        background: #fffdf9;
        color: #2f2a24;
        line-height: 1.6;
        font-size: 14px;
        font-family: inherit;
      }
      .doc-editor__actions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        align-items: center;
      }
      .doc-editor__button {
        border: 1px solid var(--line);
        background: var(--panel-strong);
        color: var(--text);
        border-radius: 999px;
        padding: 10px 16px;
        cursor: pointer;
        font: inherit;
      }
      .doc-editor__button:hover {
        border-color: var(--accent);
      }
      .doc-editor__status {
        color: var(--muted);
        font-size: 13px;
      }
      .prompt-panel summary {
        list-style: none;
        cursor: pointer;
        padding: 16px 18px;
        display: flex;
        gap: 12px;
        align-items: center;
        justify-content: space-between;
        background: var(--panel-strong);
      }
      .prompt-panel summary::-webkit-details-marker { display: none; }
      .prompt-panel summary span {
        font-weight: 700;
        overflow-wrap: anywhere;
      }
      .prompt-panel pre {
        margin: 0;
        padding: 18px;
        overflow: auto;
        border-top: 1px solid var(--line);
        background: #fffdf9;
        color: #2f2a24;
        line-height: 1.6;
        font-size: 13px;
        white-space: pre-wrap;
        word-break: break-word;
      }
      .wiki-empty {
        color: var(--muted);
      }
      @media (max-width: 720px) {
        main {
          width: min(100vw - 20px, 1240px);
          padding-top: 12px;
        }
        .hero,
        .section {
          padding: 18px;
          border-radius: 18px;
        }
        .prompt-panel summary {
          flex-direction: column;
          align-items: flex-start;
        }
        .doc-editor__grid {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <section class="hero">
        <div class="eyebrow">PMAIOS Wiki</div>
        <h1>PMAIOS 运行态介绍页</h1>
        <p>这里不再承担 prompt 全文陈列，而是作为 PMAIOS 的状态型入口：用来快速说明它最近在做什么、当前处于什么状态、应该从哪里继续看。提示词内容已拆到单独页面。</p>
        <div class="summary-bar">
          <code>统一入口 http://localhost:4312/</code>
          <code>图谱 http://localhost:4312/pmaios/graph</code>
          <code>Wiki http://localhost:4312/pmaios/wiki</code>
          <code>Prompts http://localhost:4312/pmaios/prompts</code>
          <code>SVG 图板 http://localhost:4312/pmaios/boards/index.svg</code>
        </div>
        <div class="metric-grid">
          <article class="metric-card">
            <strong>系统定位</strong>
            <span>不是聊天页集合，而是以仓库真源为核心的 AI 产品操作系统。</span>
          </article>
          <article class="metric-card">
            <strong>当前模式</strong>
            <span>${escapeHtml(resumeContext?.currentMode ?? 'unknown')}</span>
          </article>
          <article class="metric-card">
            <strong>当前任务</strong>
            <span>${escapeHtml(resumeContext?.currentTaskLabel ?? '无')}</span>
          </article>
          <article class="metric-card">
            <strong>活跃任务数</strong>
            <span>${escapeHtml(String(resumeContext?.activeTaskCount ?? 0))}</span>
          </article>
        </div>
      </section>

      <section class="section">
        <div class="eyebrow">Panorama</div>
        <h2>全景图</h2>
        <p>这里展示当前 v0.7 的平台全景：控制平面、产品主链、Hermes 治理、知识 grounding 与交付闭环都在同一张 repo 真源图里统一表达。</p>
        <div class="visual-frame">
          <img src="/pmaios/docs/boards/pmaios-runtime-panorama-v0.7.svg" alt="PMAIOS v0.7 运行全景图" />
        </div>
      </section>

      <section class="section">
        <div class="eyebrow">Status</div>
        <h2>当前状态</h2>
        <p>这部分直接读取共享 <code>mcp-context</code>，用于说明现在系统处在哪个工作位面，而不是重新翻聊天记录。</p>
        <div class="status-list">
          <div class="status-item">
            <strong>最近 checkpoint</strong>
            <span>${escapeHtml(resumeContext?.latestCheckpointLabel ?? '无')}</span>
          </div>
          <div class="status-item">
            <strong>checkpoint 时间</strong>
            <span>${escapeHtml(resumeContext?.latestCheckpointAt ?? '尚未记录')}</span>
          </div>
          <div class="status-item">
            <strong>最近蒸馏</strong>
            <span>${escapeHtml(resumeContext?.latestDigest?.label ?? '无')}</span>
          </div>
          <div class="status-item">
            <strong>蒸馏路径</strong>
            <span>${escapeHtml(resumeContext?.latestDigest?.path ?? '尚未生成每日蒸馏')}</span>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="eyebrow">Recent Moves</div>
        <h2>最近动作</h2>
        <p>这里展示最近发生过的共享动作，适合在介绍 PMAIOS 时直接讲“最近系统推进了什么”。</p>
        <div class="action-list">
          ${
            recentActions.length > 0
              ? recentActions
                  .map(
                    (item, index) => `<div class="action-item">
            <strong>动作 ${index + 1}</strong>
            <span>${escapeHtml(item)}</span>
          </div>`,
                  )
                  .join('')
              : '<p class="wiki-empty">当前没有可展示的最近动作。</p>'
          }
        </div>
      </section>

      <section class="section">
        <div class="eyebrow">Reading Paths</div>
        <h2>推荐入口</h2>
        <p>如果你要快速理解 PMAIOS，建议从下面这几类入口开始，而不是一次性读完整个仓库。</p>
        <div class="card-grid">${renderLinkCards(kernelLinks)}</div>
      </section>

      <section class="section">
        <div class="eyebrow">Workflow</div>
        <h2>工作流入口</h2>
        <p>这组入口适合讲清“输入如何进入系统、系统如何推进、输出如何沉淀”。</p>
        <div class="card-grid">${renderLinkCards(workflowLinks)}</div>
      </section>

      <section class="section">
        <div class="eyebrow">Setup</div>
        <h2>运行与查看</h2>
        <p>当前本地运行入口和人读入口集中在这里，适合现场演示时快速跳转。</p>
        <div class="card-grid">${renderLinkCards(setupLinks)}</div>
      </section>

      <section class="section">
        <div class="eyebrow">Iteration</div>
        <h2>迭代与图板</h2>
        <p>如果要继续往下讲，可以从迭代记录和图板入口展开，而不是在本页堆更多说明文本。</p>
        <div class="card-grid">${renderLinkCards(iterationLinks)}</div>
        <div class="card-grid">${renderLinkCards(boardLinks)}</div>
      </section>

      <section class="section">
        <div class="eyebrow">Prompts</div>
        <h2>提示词入口</h2>
        <p>提示词内容已拆到独立页面展示，不再放在介绍正文里。需要查看完整清单和全文时，直接进入提示词页。</p>
        <div class="card-grid">
          <a class="wiki-card" href="/pmaios/prompts">
            <strong>Prompt 清单页</strong>
            <span>查看系统真实引用的 prompt 路径、全文、数量和原文件入口。</span>
            <code>/pmaios/prompts</code>
          </a>
        </div>
      </section>

      <section class="section">
        <div class="eyebrow">Shared Docs</div>
        <h2>统一文档区</h2>
        <p>所有人看的文档统一放在这里。本页本地保留两份文档：原文文档和中文文档，保存后所有访问 <code>/pmaios/wiki</code> 的人都看到同一份内容。</p>
        <div class="doc-editor">
          <div class="doc-editor__meta">
            当前保存位置：<code>${escapeHtml(SHARED_WIKI_DOCUMENTS_PATH)}</code>
            ${sharedDocs.updatedAt ? ` · 最近更新时间：${escapeHtml(sharedDocs.updatedAt)}` : ''}
          </div>
          <div class="doc-editor__grid">
            <label class="doc-editor__field">
              <span class="doc-editor__label">原文文档</span>
              <textarea id="shared-source-doc" class="doc-editor__textarea" placeholder="这里放所有人共用的原始文档、英文原文、提示词原稿。">${escapeHtml(sharedDocs.sourceDoc)}</textarea>
            </label>
            <label class="doc-editor__field">
              <span class="doc-editor__label">中文文档</span>
              <textarea id="shared-translated-doc" class="doc-editor__textarea" placeholder="这里放对外展示的中文整理稿、翻译稿或统一讲解文档。">${escapeHtml(sharedDocs.translatedDoc)}</textarea>
            </label>
          </div>
          <div class="doc-editor__actions">
            <button id="shared-doc-save" class="doc-editor__button" type="button">保存统一文档</button>
            <span id="shared-doc-status" class="doc-editor__status">未修改</span>
          </div>
        </div>
      </section>

    </main>
    <script>
      const sourceDocEl = document.getElementById('shared-source-doc');
      const translatedDocEl = document.getElementById('shared-translated-doc');
      const saveButtonEl = document.getElementById('shared-doc-save');
      const statusEl = document.getElementById('shared-doc-status');

      async function saveSharedDocs() {
        if (!sourceDocEl || !translatedDocEl || !saveButtonEl || !statusEl) {
          return;
        }

        saveButtonEl.disabled = true;
        statusEl.textContent = '保存中...';

        try {
          const response = await fetch('/api/wiki/shared-documents', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sourceDoc: sourceDocEl.value,
              translatedDoc: translatedDocEl.value,
            }),
          });

          if (!response.ok) {
            throw new Error('保存失败');
          }

          const payload = await response.json();
          statusEl.textContent = payload.updatedAt ? '已保存：' + payload.updatedAt : '已保存';
        } catch (error) {
          statusEl.textContent = error instanceof Error ? error.message : '保存失败';
        } finally {
          saveButtonEl.disabled = false;
        }
      }

      if (saveButtonEl) {
        saveButtonEl.addEventListener('click', saveSharedDocs);
      }
    </script>
  </body>
</html>`;
}

function renderPmaiosPromptsHtml(promptEntries: PromptEntry[]) {
  const promptNav = promptEntries.map((entry) => `<a href="#${entry.id}">${escapeHtml(entry.path)}</a>`).join('');

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>PMAIOS Prompts</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f4efe6;
        --panel: rgba(255, 251, 245, 0.94);
        --panel-strong: #fffaf2;
        --text: #1c1814;
        --muted: #6f675d;
        --line: #d8ccbb;
        --accent: #a84f27;
        --accent-soft: #f0ddcf;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "Microsoft YaHei", "PingFang SC", sans-serif;
        color: var(--text);
        background:
          radial-gradient(circle at top left, rgba(168, 79, 39, 0.16), transparent 26%),
          linear-gradient(180deg, #fbf7f1 0%, var(--bg) 100%);
      }
      a { color: var(--accent); }
      main {
        width: min(1240px, calc(100vw - 32px));
        margin: 0 auto;
        padding: 24px 0 48px;
        display: grid;
        gap: 18px;
      }
      .hero,
      .section,
      .prompt-panel {
        border: 1px solid var(--line);
        background: var(--panel);
        border-radius: 24px;
        box-shadow: 0 18px 48px rgba(28, 24, 20, 0.08);
      }
      .hero,
      .section {
        padding: 24px;
        display: grid;
        gap: 16px;
      }
      .eyebrow {
        color: var(--accent);
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-size: 12px;
      }
      h1, h2, p { margin: 0; }
      h1 { font-size: clamp(30px, 5vw, 44px); line-height: 1.08; }
      h2 { font-size: 24px; }
      p { line-height: 1.7; color: var(--muted); }
      .summary-bar,
      .prompt-nav {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }
      .summary-bar code,
      .prompt-nav a {
        display: inline-block;
        padding: 6px 10px;
        border-radius: 999px;
        background: var(--accent-soft);
        color: #66311a;
        text-decoration: none;
      }
      .prompt-panel {
        overflow: hidden;
      }
      .prompt-panel summary {
        list-style: none;
        cursor: pointer;
        padding: 16px 18px;
        display: flex;
        gap: 12px;
        align-items: center;
        justify-content: space-between;
        background: var(--panel-strong);
      }
      .prompt-panel summary::-webkit-details-marker { display: none; }
      .prompt-panel summary span {
        font-weight: 700;
        overflow-wrap: anywhere;
      }
      .prompt-panel pre {
        margin: 0;
        padding: 18px;
        overflow: auto;
        border-top: 1px solid var(--line);
        background: #fffdf9;
        color: #2f2a24;
        line-height: 1.6;
        font-size: 13px;
        white-space: pre-wrap;
        word-break: break-word;
      }
      .wiki-empty {
        color: var(--muted);
      }
      @media (max-width: 720px) {
        main {
          width: min(100vw - 20px, 1240px);
          padding-top: 12px;
        }
        .hero,
        .section {
          padding: 18px;
          border-radius: 18px;
        }
        .prompt-panel summary {
          flex-direction: column;
          align-items: flex-start;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <section class="hero">
        <div class="eyebrow">PMAIOS Prompts</div>
        <h1>PMAIOS 提示词清单</h1>
        <p>这个页面只负责展示系统真实引用的 prompt 资产，不承担系统介绍正文。你可以在这里查看清单、全文和原文件入口。</p>
        <div class="summary-bar">
          <code>Prompt 数量 ${escapeHtml(String(promptEntries.length))}</code>
          <a href="/pmaios/wiki">返回 Wiki</a>
          <a href="/pmaios/graph">查看图谱</a>
        </div>
      </section>

      <section class="section">
        <div class="eyebrow">Prompt Nav</div>
        <h2>提示词清单</h2>
        <p>这里按系统真实引用的文件路径展示。需要展开内容时，直接打开下方条目。</p>
        <div class="prompt-nav">${promptNav || '<span class="wiki-empty">当前没有可导航的提示词。</span>'}</div>
      </section>

      <section class="section">
        <div class="eyebrow">Prompt Body</div>
        <h2>提示词全文</h2>
        <p>下方展示 prompt 全文，并保留原文件入口。</p>
        ${renderPromptPanels(promptEntries)}
      </section>
    </main>
  </body>
</html>`;
}

async function ensureCurrentRun(subprojectId?: string | null) {
  const runs = await orchestratorRuntime.listRuns(subprojectId);
  if (runs[0]) {
    return runs[0];
  }

  const project = await subprojectRegistry.resolveProjectContext(subprojectId);
  const definition = await workflowEngine.loadDefinition(project.projectRoot);
  const providers = await providerRegistry.listProviders(subprojectId);
  const servers = await mcpRegistry.listServers(subprojectId);
  return orchestratorRuntime.initRun({
    definition,
    project,
    providerCount: providers.length,
    mcpServerCount: servers.length,
  });
}

async function buildReviewForRun(runId: string, subprojectId?: string | null) {
  const run = await orchestratorRuntime.loadRun(runId, subprojectId);
  const events = await orchestratorRuntime.loadEvents(runId, subprojectId);
  const artifactCount = events.filter((event) => event.kind === 'artifact_written').length;
  const artifacts = await workflowEngine.hydrateArtifacts(run);
  const openSourceEvidence = reviewCommittee.inspectOpenSourceEvidence(artifacts);
  const hermesReport = await hermesPolicyService.evaluateRun(run);
  const activatedSpecialistRoles = specialistActivationService.resolveActivatedRoles({
    stageId: run.currentStageId,
    artifacts: artifacts.map((artifact) => ({ path: artifact.path, content: artifact.content })),
  });
  return reviewCommittee.buildReportForRun({
    runId,
    artifactCount,
    activeStageId: run.currentStageId,
    activatedSpecialistRoles: activatedSpecialistRoles.length > 0 ? activatedSpecialistRoles : undefined,
    openSourceEvaluationPresent: openSourceEvidence.present,
    openSourceEvidencePaths: openSourceEvidence.evidencePaths,
    hermesResearchFindings: hermesReport.researchFindings,
    hermesAutoPromotions: hermesReport.autoPromotions,
    hermesWatchFindings: hermesReport.watchFindings,
    artifacts: artifacts.map((artifact) => ({ path: artifact.path, content: artifact.content })),
  });
}

app.get('/pmaios', (_req, res) => {
  res.redirect('/pmaios/wiki');
});

app.get('/pmaios/graph', (_req, res) => {
  res.type('html').send(renderPmaiosGraphHtml());
});

app.get('/pmaios/wiki', async (_req, res) => {
  const [promptEntries, sharedDocs, resumeContext] = await Promise.all([
    loadPromptEntries(),
    loadSharedWikiDocuments(),
    loadResumeContextSummary(),
  ]);
  res.type('html').send(renderPmaiosWikiHtml(promptEntries, sharedDocs, resumeContext));
});

app.get('/pmaios/prompts', async (_req, res) => {
  res.type('html').send(renderPmaiosPromptsHtml(await loadPromptEntries()));
});

app.get('/pmaios/*', (req, res) => {
  const requestedPath = readWildcardPath(req.params);
  if (!requestedPath || requestedPath === 'wiki') {
    res.redirect('/pmaios/wiki');
    return;
  }

  sendPublicAsset(res, requestedPath);
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'ai-os-backend' });
});

app.get('/api/wiki/shared-documents', async (_req, res) => {
  res.json(await loadSharedWikiDocuments());
});

app.get('/api/mcp-context/resume', async (_req, res) => {
  res.json(await loadResumeContextSummary());
});

app.get('/api/graph/overview', async (_req, res) => {
  const [promptEntries, sharedDocs, resumeContext] = await Promise.all([
    loadPromptEntries(),
    loadSharedWikiDocuments(),
    loadResumeContextSummary(),
  ]);
  res.json(buildGraphOverview(promptEntries, sharedDocs, resumeContext));
});

app.put('/api/wiki/shared-documents', async (req, res) => {
  const nextDocuments: SharedWikiDocuments = {
    sourceDoc: typeof req.body?.sourceDoc === 'string' ? req.body.sourceDoc : '',
    translatedDoc: typeof req.body?.translatedDoc === 'string' ? req.body.translatedDoc : '',
    updatedAt: new Date().toISOString(),
  };

  await saveSharedWikiDocuments(nextDocuments);
  res.json(nextDocuments);
});

app.get('/api/human-reading/manifest', (_req, res) => {
  res.json({
    basePath: '/pmaios',
    entries: {
      rootEntry: '/',
      workspace: '/workspace',
      graph: '/pmaios/graph',
      wiki: '/pmaios/wiki',
      boardsIndex: '/pmaios/boards/index.svg',
      currentVersionProgress: '/pmaios/docs/operations/current-version-progress.md',
      versionPlan: '/pmaios/docs/operations/pmaios-version-plan.md',
      v05Checklist: '/pmaios/docs/operations/pmaios-v0.5-checklist.md',
      v05ImplementationIndex: '/pmaios/docs/operations/v0.5-implementation-index.md',
      executionChecklist: '/pmaios/docs/operations/v0.4-v0.5-execution-checklist.md',
      userRequirementBackcheckSample: '/pmaios/docs/operations/user-requirement-backcheck-2026-04-21.md',
      transitionSnapshot: '/pmaios/docs/operations/v0.4-v0.5-transition-2026-04-21.md',
      dailyDigests: '/api/ops/daily-digests',
      projectEntries: '/api/human-reading/project-entries',
    },
  });
});

app.get('/api/human-reading/project-entries', async (_req, res) => {
  res.json({ items: await loadProjectEntrySummaries() });
});

app.get('/api/ops/execution-checklist-summary', async (_req, res) => {
  res.json(await loadExecutionChecklistSummary());
});

app.get('/api/ops/daily-digests', async (_req, res) => {
  res.json({ items: await loadDailyDigestEntries() });
});

app.get('/api/subprojects', async (_req, res) => {
  res.json(await subprojectRegistry.listSubprojects());
});

app.post('/api/subprojects', async (req, res) => {
  const subproject = await subprojectRegistry.createSubproject({
    id: String(req.body?.id ?? '').trim(),
    name: typeof req.body?.name === 'string' ? req.body.name : undefined,
    description: typeof req.body?.description === 'string' ? req.body.description : undefined,
    defaultWorkflow: typeof req.body?.defaultWorkflow === 'string' ? req.body.defaultWorkflow : undefined,
    overrides:
      req.body?.overrides && typeof req.body.overrides === 'object'
        ? {
            provider: typeof req.body.overrides.provider === 'string' ? req.body.overrides.provider : undefined,
            providerConfigPath:
              typeof req.body.overrides.providerConfigPath === 'string' ? req.body.overrides.providerConfigPath : undefined,
            workflow: typeof req.body.overrides.workflow === 'string' ? req.body.overrides.workflow : undefined,
            mcpConfigPath: typeof req.body.overrides.mcpConfigPath === 'string' ? req.body.overrides.mcpConfigPath : undefined,
          }
        : undefined,
  });
  res.status(201).json(subproject);
});

app.get('/api/subprojects/:id', async (req, res) => {
  res.json(await subprojectRegistry.loadSubproject(req.params.id));
});

app.get('/api/subprojects/:id/runs/current', async (req, res) => {
  res.json(await ensureCurrentRun(req.params.id));
});

app.post('/api/subprojects/:id/runs/init', async (req, res) => {
  const subprojectId = req.params.id;
  const project = await subprojectRegistry.resolveProjectContext(subprojectId);
  const definition = await workflowEngine.loadDefinition(project.projectRoot);
  const providers = await providerRegistry.listProviders(subprojectId);
  const servers = await mcpRegistry.listServers(subprojectId);
  const run = await orchestratorRuntime.initRun({
    definition,
    project,
    providerCount: providers.length,
    mcpServerCount: servers.length,
  });
  res.status(201).json(run);
});

app.get('/api/portfolio', async (_req, res) => {
  const subprojects = await subprojectRegistry.listSubprojects();
  const portfolio = await Promise.all(
    [null, ...subprojects.map((subproject) => subproject.id)].map(async (subprojectId) => {
      const runs = await orchestratorRuntime.listRuns(subprojectId);
      const currentRun = runs[0] ?? null;
      const review = currentRun ? await buildReviewForRun(currentRun.id, currentRun.subprojectId) : null;
      const metrics = currentRun ? await workflowEngine.buildMetrics(currentRun, review) : null;
      return {
        subprojectId,
        label: subprojectId ? subprojects.find((item) => item.id === subprojectId)?.name ?? subprojectId : 'PMAIOS Platform',
        runCount: runs.length,
        currentRun,
        metrics,
      };
    }),
  );

  res.json(portfolio);
});

app.get('/api/chats', async (req, res) => {
  res.json({ items: await chatService.listSessions(normalizeSubprojectId(req.query.subprojectId)) });
});

app.post('/api/chats', async (req, res) => {
  const session = await chatService.createSession({
    title: typeof req.body?.title === 'string' ? req.body.title : undefined,
    subprojectId: normalizeSubprojectId(req.body?.subprojectId),
  });
  res.status(201).json(session);
});

app.get('/api/chats/:id', async (req, res) => {
  res.json(await chatService.loadSession(req.params.id, normalizeSubprojectId(req.query.subprojectId)));
});

app.get('/api/chats/:id/messages', async (req, res) => {
  res.json({ items: await chatService.listMessages(req.params.id, normalizeSubprojectId(req.query.subprojectId)) });
});

app.post('/api/chats/:id/messages', async (req, res) => {
  if (typeof req.body?.content !== 'string' || !req.body.content.trim()) {
    res.status(400).json({ error: 'content is required' });
    return;
  }

  const message = await chatService.createUserMessage(req.params.id, {
    content: req.body.content,
    subprojectId: normalizeSubprojectId(req.body?.subprojectId),
    parentMessageId: typeof req.body?.parentMessageId === 'string' ? req.body.parentMessageId : null,
  });
  res.status(201).json(message);
});

app.post('/api/chats/:id/respond', async (req, res) => {
  res.json(
    await chatService.respond(req.params.id, {
      subprojectId: normalizeSubprojectId(req.body?.subprojectId),
      messageId: typeof req.body?.messageId === 'string' ? req.body.messageId : null,
    }),
  );
});

app.get('/api/chats/:id/runs', async (req, res) => {
  res.json({ items: await chatService.listRuns(req.params.id, normalizeSubprojectId(req.query.subprojectId)) });
});

app.get('/api/product-agents', async (req, res) => {
  res.json({ items: await productAgentService.listAgents(normalizeSubprojectId(req.query.subprojectId)) });
});

app.get('/api/product-agent-blueprints', async (_req, res) => {
  res.json({ items: await productAgentService.listBlueprints() });
});

app.get('/api/skills', async (req, res) => {
  const items = await skillRegistry.listSkills(normalizeSubprojectId(req.query.subprojectId));
  const readiness = await skillRegistry.describeReadiness(normalizeSubprojectId(req.query.subprojectId));
  const byMainline = {
    product: items.filter((skill) => ['product', 'management', 'planning', 'research', 'iteration'].includes(skill.category)),
    design: items.filter(
      (skill) =>
        ['design', 'multimodal'].includes(skill.category) ||
        /design|schema|prototype|demo|ui/ui.test(`${skill.id} ${skill.name} ${skill.description} ${skill.outputs.join(' ')}`),
    ),
    documentation: items.filter(
      (skill) =>
        ['documentation', 'delivery'].includes(skill.category) ||
        /document|manual|brief|script|output|handoff/ui.test(`${skill.id} ${skill.name} ${skill.description} ${skill.outputs.join(' ')}`),
    ),
  };

  res.json({
    items,
    summary: {
      total: items.length,
      product: byMainline.product.length,
      design: byMainline.design.length,
      documentation: byMainline.documentation.length,
      autoTriggerable: readiness.autoTriggerable,
      integrated: readiness.integrated,
    },
    readiness,
    byMainline,
    designTooling: {
      packageName: 'claude-design-system',
      command: 'design-system.cmd',
      status:
        items.find((skill) => skill.id === 'claude-design-system')?.deployment.status ??
        (readiness.byStatus.installed ? 'installed' : 'manual'),
      statusPath: 'docs/operations/claude-design-tooling-status.md',
      localGuidePath: 'DESIGN-SYSTEM.md',
    },
  });
});

app.get('/api/skills/find', async (req, res) => {
  res.json({
    items: await skillRegistry.findSkills({
      query: typeof req.query.query === 'string' ? req.query.query : '',
      stageId: typeof req.query.stageId === 'string' ? req.query.stageId : null,
      outputType: typeof req.query.outputType === 'string' ? req.query.outputType : null,
      limit: typeof req.query.limit === 'string' ? Number.parseInt(req.query.limit, 10) : null,
      subprojectId: normalizeSubprojectId(req.query.subprojectId),
    }),
  });
});

app.get('/api/codex/local-state', async (req, res) => {
  res.json(await codexLocalStateService.inspect(normalizeSubprojectId(req.query.subprojectId)));
});

app.get('/api/connectors/status', async (req, res) => {
  const subprojectId = normalizeSubprojectId(req.query.subprojectId);
  const datakiDefaults = await resolveDatakiContextDefaults(subprojectId);
  const externalStatus = await externalConnectorService.getStatus(normalizeSubprojectId(req.query.subprojectId), {
    checkRemote: req.query.checkRemote === 'true',
  });
  const datakiStatus = await datakiKnowledgeBaseService.getStatus({
    baseUrl: datakiDefaults.baseUrl,
    apiKey: datakiDefaults.apiKey,
    userId: datakiDefaults.userId,
    agentId: datakiDefaults.agentId,
    defaultKnowledgeBaseId: datakiDefaults.defaultKnowledgeBaseId,
    defaultKnowledgeBaseIds: datakiDefaults.defaultKnowledgeBaseIds,
    checkRemote: req.query.checkRemote === 'true',
  });
  res.json({
    ...externalStatus,
    dataki: datakiStatus,
  });
});

app.post('/api/connectors/web-fetch', async (req, res) => {
  if (typeof req.body?.url !== 'string' || !req.body.url.trim()) {
    res.status(400).json({ error: 'url is required' });
    return;
  }

  const artifact = await externalConnectorService.fetchWebPage({
    url: req.body.url,
    subprojectId: normalizeSubprojectId(req.body?.subprojectId),
  });
  res.status(201).json(artifact);
});

app.post('/api/connectors/figma/files/inspect', async (req, res) => {
  if ((typeof req.body?.fileKey !== 'string' || !req.body.fileKey.trim()) && !process.env.FIGMA_FILE_KEY?.trim()) {
    res.status(400).json({ error: 'fileKey is required' });
    return;
  }

  res.json(await externalConnectorService.inspectFigmaFile({ fileKey: req.body.fileKey }));
});

app.get('/api/connectors/figma/team/projects', async (req, res) => {
  res.json({
    items: await externalConnectorService.listFigmaTeamProjects({
      teamId: typeof req.query.teamId === 'string' ? req.query.teamId : null,
    }),
  });
});

app.post('/api/connectors/dingtalk/meeting-notes', async (req, res) => {
  if (typeof req.body?.content !== 'string' || !req.body.content.trim()) {
    res.status(400).json({ error: 'content is required' });
    return;
  }

  const imported = await externalConnectorService.importDingTalkMeetingNote({
    title: typeof req.body?.title === 'string' ? req.body.title : null,
    content: req.body.content,
    subprojectId: normalizeSubprojectId(req.body?.subprojectId),
  });
  const normalizationRun = await documentationNormalizationService.normalize({
    subprojectId: normalizeSubprojectId(req.body?.subprojectId),
    sourceRoot: null,
    sourcePaths: [imported.sourcePath],
  });
  res.status(201).json({ imported, normalizationRun });
});

app.post('/api/connectors/dataki/knowledge-bases/list', async (req, res) => {
  try {
    const datakiDefaults = await resolveDatakiContextDefaults(normalizeSubprojectId(req.body?.subprojectId));
    res.json({
      items: await datakiKnowledgeBaseService.listKnowledgeBases({
        baseUrl: typeof req.body?.baseUrl === 'string' ? req.body.baseUrl : datakiDefaults.baseUrl,
        apiKey: typeof req.body?.apiKey === 'string' ? req.body.apiKey : datakiDefaults.apiKey,
        userId: typeof req.body?.userId === 'string' ? req.body.userId : datakiDefaults.userId,
        agentId: typeof req.body?.agentId === 'string' ? req.body.agentId : datakiDefaults.agentId,
      }),
    });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'dataki knowledge base list failed',
    });
  }
});

app.post('/api/connectors/dataki/knowledge-bases/:knowledgeBaseId/knowledge/list', async (req, res) => {
  const datakiDefaults = await resolveDatakiContextDefaults(normalizeSubprojectId(req.body?.subprojectId));
  const knowledgeBaseId =
    (typeof req.params.knowledgeBaseId === 'string' && req.params.knowledgeBaseId.trim()) || datakiDefaults.defaultKnowledgeBaseId || '';
  if (!knowledgeBaseId) {
    res.status(400).json({ error: 'knowledgeBaseId is required' });
    return;
  }

  try {
    res.json({
      items: await datakiKnowledgeBaseService.listKnowledgeFiles({
        knowledgeBaseId,
        page: typeof req.body?.page === 'number' ? req.body.page : 1,
        pageSize: typeof req.body?.pageSize === 'number' ? req.body.pageSize : 20,
        keyword: typeof req.body?.keyword === 'string' ? req.body.keyword : null,
        fileType: typeof req.body?.fileType === 'string' ? req.body.fileType : null,
        baseUrl: typeof req.body?.baseUrl === 'string' ? req.body.baseUrl : datakiDefaults.baseUrl,
        apiKey: typeof req.body?.apiKey === 'string' ? req.body.apiKey : datakiDefaults.apiKey,
      }),
    });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'dataki knowledge file list failed',
    });
  }
});

app.post('/api/connectors/dataki/knowledge-search', async (req, res) => {
  if (typeof req.body?.query !== 'string' || !req.body.query.trim()) {
    res.status(400).json({ error: 'query is required' });
    return;
  }

  try {
    const datakiDefaults = await resolveDatakiContextDefaults(normalizeSubprojectId(req.body?.subprojectId));
    const requestedKnowledgeBaseIds = Array.isArray(req.body?.knowledgeBaseIds)
      ? req.body.knowledgeBaseIds.filter((item: unknown) => typeof item === 'string' && item.trim())
      : [];
    const requestedKnowledgeBaseId =
      typeof req.body?.knowledgeBaseId === 'string' && req.body.knowledgeBaseId.trim()
        ? req.body.knowledgeBaseId
        : datakiDefaults.defaultKnowledgeBaseId;
    res.json({
      items: await datakiKnowledgeBaseService.searchKnowledge({
        query: req.body.query,
        knowledgeBaseId: requestedKnowledgeBaseId,
        knowledgeBaseIds: requestedKnowledgeBaseIds.length > 0 ? requestedKnowledgeBaseIds : datakiDefaults.defaultKnowledgeBaseIds,
        knowledgeIds: Array.isArray(req.body?.knowledgeIds)
          ? req.body.knowledgeIds.filter((item: unknown) => typeof item === 'string' && item.trim())
          : [],
        baseUrl: typeof req.body?.baseUrl === 'string' ? req.body.baseUrl : datakiDefaults.baseUrl,
        apiKey: typeof req.body?.apiKey === 'string' ? req.body.apiKey : datakiDefaults.apiKey,
      }),
    });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'dataki knowledge search failed',
    });
  }
});

app.post('/api/product-agent-blueprints/bootstrap', async (req, res) => {
  res.status(201).json({
    items: await productAgentService.bootstrapManagementHierarchy(normalizeSubprojectId(req.body?.subprojectId)),
  });
});

app.get('/api/product-chief/reports', async (req, res) => {
  res.json({ items: await productChiefService.listReports(normalizeSubprojectId(req.query.subprojectId)) });
});

app.get('/api/product-chief/outputs', async (req, res) => {
  res.json({ items: await productChiefService.listOutputs(normalizeSubprojectId(req.query.subprojectId)) });
});

app.get('/api/product-chief/image-batches', async (req, res) => {
  res.json({ items: await productChiefService.listGeneratedImageBatches(normalizeSubprojectId(req.query.subprojectId)) });
});

app.get('/api/product-chief/specialist-tasks', async (req, res) => {
  res.json({ items: await productChiefService.listSpecialistTasks(normalizeSubprojectId(req.query.subprojectId)) });
});

app.get('/api/product-chief/multi-agent-reviews', async (req, res) => {
  res.json({ items: await productChiefService.listMultiAgentReviews(normalizeSubprojectId(req.query.subprojectId)) });
});

app.get('/api/product-chief/group-sessions', async (req, res) => {
  res.json({ items: await multiPmGroupSessionService.listSessions(normalizeSubprojectId(req.query.subprojectId)) });
});

app.post('/api/product-chief/analyze', async (req, res) => {
  if (typeof req.body?.brief !== 'string' || !req.body.brief.trim()) {
    res.status(400).json({ error: 'brief is required' });
    return;
  }

  res.status(201).json(
    await productChiefService.analyze({
      brief: req.body.brief,
      subprojectId: normalizeSubprojectId(req.body?.subprojectId),
      contextPaths: Array.isArray(req.body?.contextPaths) ? req.body.contextPaths.filter((item: unknown) => typeof item === 'string') : [],
    }),
  );
});

app.post('/api/product-chief/reports/:id/outputs', async (req, res) => {
  try {
    res.status(201).json(
      await productChiefService.generateGovernedOutput({
        reportId: req.params.id,
        type: typeof req.body?.type === 'string' ? req.body.type : null,
        subprojectId: normalizeSubprojectId(req.body?.subprojectId),
        requirementIds: Array.isArray(req.body?.requirementIds) ? req.body.requirementIds.filter((item: unknown) => typeof item === 'string') : [],
      }),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'product chief output generation failed';
    if (/subprojectid|project directory|platform root|image2 design generation requires/i.test(message)) {
      res.status(400).json({ error: message });
      return;
    }
    throw error;
  }
});

app.get('/api/document-normalization/runs', async (req, res) => {
  res.json({ items: await documentationNormalizationService.listRuns(normalizeSubprojectId(req.query.subprojectId)) });
});

app.post('/api/document-normalization/runs', async (req, res) => {
  res.status(201).json(
    await documentationNormalizationService.normalize({
      subprojectId: normalizeSubprojectId(req.body?.subprojectId),
      sourceRoot: typeof req.body?.sourceRoot === 'string' ? req.body.sourceRoot : null,
      sourcePaths: Array.isArray(req.body?.sourcePaths) ? req.body.sourcePaths.filter((item: unknown) => typeof item === 'string') : [],
      limit: typeof req.body?.limit === 'number' ? req.body.limit : null,
    }),
  );
});

app.post('/api/document-normalization/inbox-updates', async (req, res) => {
  res.status(201).json(
    await documentationNormalizationService.ingestInboxUpdates({
      subprojectId: normalizeSubprojectId(req.body?.subprojectId),
      sourceRoot: typeof req.body?.sourceRoot === 'string' ? req.body.sourceRoot : null,
      limit: typeof req.body?.limit === 'number' ? req.body.limit : null,
    }),
  );
});

app.get('/api/document-governance/truth-sources', async (req, res) => {
  res.json({ items: await documentGovernanceService.listEntries(normalizeSubprojectId(req.query.subprojectId)) });
});

app.post('/api/document-governance/truth-sources', async (req, res) => {
  res.status(201).json(
    await documentGovernanceService.upsertEntry({
      id: typeof req.body?.id === 'string' ? req.body.id : null,
      topicKey: typeof req.body?.topicKey === 'string' ? req.body.topicKey : '',
      subprojectId: normalizeSubprojectId(req.body?.subprojectId),
      title: typeof req.body?.title === 'string' ? req.body.title : typeof req.body?.path === 'string' ? req.body.path : '',
      path: typeof req.body?.path === 'string' ? req.body.path : '',
      status: typeof req.body?.status === 'string' ? req.body.status : 'draft',
      tags: Array.isArray(req.body?.tags) ? req.body.tags.filter((item: unknown) => typeof item === 'string') : [],
      supersedes: Array.isArray(req.body?.supersedes) ? req.body.supersedes.filter((item: unknown) => typeof item === 'string') : [],
      successorPath: typeof req.body?.successorPath === 'string' ? req.body.successorPath : null,
      note: typeof req.body?.note === 'string' ? req.body.note : null,
    }),
  );
});

app.post('/api/document-governance/audit', async (req, res) => {
  res.status(201).json(await documentGovernanceService.audit(normalizeSubprojectId(req.body?.subprojectId)));
});

app.get('/api/document-governance/audit', async (req, res) => {
  const audit = await documentGovernanceService.readLatestAudit(normalizeSubprojectId(req.query.subprojectId));
  if (!audit) {
    res.status(404).json({ error: 'document governance audit not found' });
    return;
  }
  res.json(audit);
});

app.post('/api/product-agents', async (req, res) => {
  if (typeof req.body?.name !== 'string' || !req.body.name.trim()) {
    res.status(400).json({ error: 'name is required' });
    return;
  }
  if (typeof req.body?.summary !== 'string' || !req.body.summary.trim()) {
    res.status(400).json({ error: 'summary is required' });
    return;
  }
  if (typeof req.body?.problem !== 'string' || !req.body.problem.trim()) {
    res.status(400).json({ error: 'problem is required' });
    return;
  }

  const agent = await productAgentService.createAgent({
    name: req.body.name,
    summary: req.body.summary,
    problem: req.body.problem,
    role:
      typeof req.body?.role === 'string' &&
      ['general', 'product-management', 'requirements', 'versioning', 'review', 'workflow', 'delivery', 'retrospective'].includes(
        req.body.role,
      )
        ? req.body.role
        : undefined,
    level:
      typeof req.body?.level === 'string' && ['supervisor', 'manager', 'specialist'].includes(req.body.level)
        ? req.body.level
        : undefined,
    scope:
      typeof req.body?.scope === 'string' && ['platform', 'shared', 'subproject'].includes(req.body.scope)
        ? req.body.scope
        : undefined,
    targetUsers: Array.isArray(req.body?.targetUsers) ? req.body.targetUsers : [],
    goals: Array.isArray(req.body?.goals) ? req.body.goals : [],
    nonGoals: Array.isArray(req.body?.nonGoals) ? req.body.nonGoals : [],
    constraints: Array.isArray(req.body?.constraints) ? req.body.constraints : [],
    acceptanceCriteria: Array.isArray(req.body?.acceptanceCriteria) ? req.body.acceptanceCriteria : [],
    relatedPaths: Array.isArray(req.body?.relatedPaths) ? req.body.relatedPaths : [],
    governanceRefs: Array.isArray(req.body?.governanceRefs) ? req.body.governanceRefs : [],
    managedAgentIds: Array.isArray(req.body?.managedAgentIds) ? req.body.managedAgentIds : [],
    promptPath: typeof req.body?.promptPath === 'string' ? req.body.promptPath : null,
    templateId: typeof req.body?.templateId === 'string' ? req.body.templateId : null,
    subprojectId: normalizeSubprojectId(req.body?.subprojectId),
    chatSessionId: typeof req.body?.chatSessionId === 'string' ? req.body.chatSessionId : null,
    contextSnapshotId: typeof req.body?.contextSnapshotId === 'string' ? req.body.contextSnapshotId : null,
    generatedByRunId: typeof req.body?.generatedByRunId === 'string' ? req.body.generatedByRunId : null,
    source: 'api',
  });
  res.status(201).json(agent);
});

app.post('/api/product-agents/generate', async (req, res) => {
  if (typeof req.body?.brief !== 'string' || !req.body.brief.trim()) {
    res.status(400).json({ error: 'brief is required' });
    return;
  }

  const agent = await productAgentService.generateAgent({
    brief: req.body.brief,
    name: typeof req.body?.name === 'string' ? req.body.name : undefined,
    role:
      typeof req.body?.role === 'string' &&
      ['general', 'product-management', 'requirements', 'versioning', 'review', 'workflow', 'delivery', 'retrospective'].includes(
        req.body.role,
      )
        ? req.body.role
        : undefined,
    level:
      typeof req.body?.level === 'string' && ['supervisor', 'manager', 'specialist'].includes(req.body.level)
        ? req.body.level
        : undefined,
    scope:
      typeof req.body?.scope === 'string' && ['platform', 'shared', 'subproject'].includes(req.body.scope)
        ? req.body.scope
        : undefined,
    subprojectId: normalizeSubprojectId(req.body?.subprojectId),
    chatSessionId: typeof req.body?.chatSessionId === 'string' ? req.body.chatSessionId : null,
    contextSnapshotId: typeof req.body?.contextSnapshotId === 'string' ? req.body.contextSnapshotId : null,
    generatedByRunId: typeof req.body?.generatedByRunId === 'string' ? req.body.generatedByRunId : null,
    source: 'workspace',
  });
  res.status(201).json(agent);
});

app.get('/api/product-agents/:id', async (req, res) => {
  res.json(await productAgentService.loadAgent(req.params.id, normalizeSubprojectId(req.query.subprojectId)));
});

app.get('/api/capabilities', async (req, res) => {
  res.json({ items: await capabilityRegistry.listCapabilities(normalizeSubprojectId(req.query.subprojectId)) });
});

app.post('/api/capabilities', async (req, res) => {
  if (typeof req.body?.name !== 'string' || !req.body.name.trim()) {
    res.status(400).json({ error: 'name is required' });
    return;
  }
  if (typeof req.body?.description !== 'string' || !req.body.description.trim()) {
    res.status(400).json({ error: 'description is required' });
    return;
  }
  if (!['product-agent', 'workflow'].includes(String(req.body?.implementationType ?? ''))) {
    res.status(400).json({ error: 'implementationType must be product-agent or workflow' });
    return;
  }
  if (typeof req.body?.implementationRef !== 'string' || !req.body.implementationRef.trim()) {
    res.status(400).json({ error: 'implementationRef is required' });
    return;
  }

  const capability = await capabilityRegistry.registerCapability({
    id: typeof req.body?.id === 'string' ? req.body.id : undefined,
    name: req.body.name,
    description: req.body.description,
    subprojectId: normalizeSubprojectId(req.body?.subprojectId),
    visibility: ['private', 'internal', 'public'].includes(String(req.body?.visibility ?? '')) ? req.body.visibility : undefined,
    implementationType: req.body.implementationType,
    implementationRef: req.body.implementationRef,
    inputSchema: req.body?.inputSchema,
    outputSchema: req.body?.outputSchema,
    permissions: Array.isArray(req.body?.permissions) ? req.body.permissions : [],
    tags: Array.isArray(req.body?.tags) ? req.body.tags : [],
    acceptanceCriteria: Array.isArray(req.body?.acceptanceCriteria) ? req.body.acceptanceCriteria : [],
    requirementIds: Array.isArray(req.body?.requirementIds) ? req.body.requirementIds : [],
    runId: typeof req.body?.runId === 'string' ? req.body.runId : null,
    version: typeof req.body?.version === 'string' ? req.body.version : undefined,
    testsPassed: typeof req.body?.testsPassed === 'boolean' ? req.body.testsPassed : undefined,
    reviewPassed: typeof req.body?.reviewPassed === 'boolean' ? req.body.reviewPassed : undefined,
    releaseNotes: typeof req.body?.releaseNotes === 'string' ? req.body.releaseNotes : null,
    reviewSummary: typeof req.body?.reviewSummary === 'string' ? req.body.reviewSummary : null,
    metadata: req.body?.metadata && typeof req.body.metadata === 'object' ? req.body.metadata : undefined,
  });
  res.status(201).json(capability);
});

app.get('/api/capabilities/:id', async (req, res) => {
  res.json(await capabilityRegistry.loadCapability(req.params.id, normalizeSubprojectId(req.query.subprojectId)));
});

app.get('/api/capabilities/:id/invocations', async (req, res) => {
  res.json({ items: await capabilityRegistry.listInvocations(req.params.id, normalizeSubprojectId(req.query.subprojectId)) });
});

app.get('/api/capability-evaluations', async (req, res) => {
  res.json({ items: await capabilityRegistry.listEvaluations(normalizeSubprojectId(req.query.subprojectId)) });
});

app.get('/api/requirements', async (req, res) => {
  res.json({ items: await requirementService.listRequirements(normalizeSubprojectId(req.query.subprojectId)) });
});

app.post('/api/requirements', async (req, res) => {
  if (typeof req.body?.title !== 'string' || !req.body.title.trim()) {
    res.status(400).json({ error: 'title is required' });
    return;
  }
  if (typeof req.body?.description !== 'string' || !req.body.description.trim()) {
    res.status(400).json({ error: 'description is required' });
    return;
  }

  res.status(201).json(
    await requirementService.createRequirement({
      subprojectId: normalizeSubprojectId(req.body?.subprojectId),
      title: req.body.title,
      description: req.body.description,
      category: ['feature', 'bug', 'architecture'].includes(String(req.body?.category ?? '')) ? req.body.category : 'feature',
      priority: ['P0', 'P1', 'P2'].includes(String(req.body?.priority ?? '')) ? req.body.priority : 'P1',
      relatedRequirementIds: Array.isArray(req.body?.relatedRequirementIds) ? req.body.relatedRequirementIds : [],
      linkedVersionIds: Array.isArray(req.body?.linkedVersionIds) ? req.body.linkedVersionIds : [],
      linkedRunIds: Array.isArray(req.body?.linkedRunIds) ? req.body.linkedRunIds : [],
      artifactPaths: Array.isArray(req.body?.artifactPaths) ? req.body.artifactPaths : [],
      metadata: req.body?.metadata && typeof req.body.metadata === 'object' ? req.body.metadata : undefined,
    }),
  );
});

app.patch('/api/requirements/:id', async (req, res) => {
  res.json(
    await requirementService.updateRequirement(req.params.id, {
      subprojectId: normalizeSubprojectId(req.body?.subprojectId),
      title: typeof req.body?.title === 'string' ? req.body.title : undefined,
      description: typeof req.body?.description === 'string' ? req.body.description : undefined,
      category: ['feature', 'bug', 'architecture'].includes(String(req.body?.category ?? '')) ? req.body.category : undefined,
      status: ['draft', 'active', 'done', 'archived'].includes(String(req.body?.status ?? '')) ? req.body.status : undefined,
      priority: ['P0', 'P1', 'P2'].includes(String(req.body?.priority ?? '')) ? req.body.priority : undefined,
      relatedRequirementIds: Array.isArray(req.body?.relatedRequirementIds) ? req.body.relatedRequirementIds : undefined,
      linkedVersionIds: Array.isArray(req.body?.linkedVersionIds) ? req.body.linkedVersionIds : undefined,
      linkedRunIds: Array.isArray(req.body?.linkedRunIds) ? req.body.linkedRunIds : undefined,
      artifactPaths: Array.isArray(req.body?.artifactPaths) ? req.body.artifactPaths : undefined,
      metadataPatch: req.body?.metadataPatch && typeof req.body.metadataPatch === 'object' ? req.body.metadataPatch : undefined,
    }),
  );
});

app.post('/api/requirements/batch', async (req, res) => {
  if (!Array.isArray(req.body?.requirementIds) || req.body.requirementIds.length === 0) {
    res.status(400).json({ error: 'requirementIds are required' });
    return;
  }

  res.json({
    items: await requirementService.batchUpdateRequirements({
      requirementIds: req.body.requirementIds,
      subprojectId: normalizeSubprojectId(req.body?.subprojectId),
      status: ['draft', 'active', 'done', 'archived'].includes(String(req.body?.status ?? '')) ? req.body.status : undefined,
      priority: ['P0', 'P1', 'P2'].includes(String(req.body?.priority ?? '')) ? req.body.priority : undefined,
      metadataPatch: req.body?.metadataPatch && typeof req.body.metadataPatch === 'object' ? req.body.metadataPatch : undefined,
    }),
  });
});

app.post('/api/requirements/ingest-chat', async (req, res) => {
  if (typeof req.body?.sessionId !== 'string' || !req.body.sessionId.trim()) {
    res.status(400).json({ error: 'sessionId is required' });
    return;
  }

  res.status(201).json(
    await requirementService.ingestFromChat({
      sessionId: req.body.sessionId,
      messageId: typeof req.body?.messageId === 'string' ? req.body.messageId : null,
      subprojectId: normalizeSubprojectId(req.body?.subprojectId),
    }),
  );
});

app.post('/api/requirements/ingest-acceptance-review', async (req, res) => {
  if (typeof req.body?.content !== 'string' || !req.body.content.trim()) {
    res.status(400).json({ error: 'content is required' });
    return;
  }

  res.status(201).json(
    await requirementService.ingestFromAcceptanceReview({
      title: typeof req.body?.title === 'string' ? req.body.title : null,
      content: req.body.content,
      subprojectId: normalizeSubprojectId(req.body?.subprojectId),
      runId: typeof req.body?.runId === 'string' ? req.body.runId : null,
      artifactPath: typeof req.body?.artifactPath === 'string' ? req.body.artifactPath : null,
    }),
  );
});

app.post('/api/requirements/ingest-runtime-gate', async (req, res) => {
  if (typeof req.body?.content !== 'string' || !req.body.content.trim()) {
    res.status(400).json({ error: 'content is required' });
    return;
  }

  res.status(201).json(
    await requirementService.ingestFromRuntimeGateEvent({
      title: typeof req.body?.title === 'string' ? req.body.title : null,
      content: req.body.content,
      subprojectId: normalizeSubprojectId(req.body?.subprojectId),
      runId: typeof req.body?.runId === 'string' ? req.body.runId : null,
      gateId: typeof req.body?.gateId === 'string' ? req.body.gateId : null,
      artifactPath: typeof req.body?.artifactPath === 'string' ? req.body.artifactPath : null,
    }),
  );
});

app.post('/api/requirements/ingest-auto-capture', async (req, res) => {
  if (typeof req.body?.content !== 'string' || !req.body.content.trim()) {
    res.status(400).json({ error: 'content is required' });
    return;
  }

  res.status(201).json(
    await requirementService.ingestFromAutoCapture({
      title: typeof req.body?.title === 'string' ? req.body.title : null,
      content: req.body.content,
      subprojectId: normalizeSubprojectId(req.body?.subprojectId),
      runId: typeof req.body?.runId === 'string' ? req.body.runId : null,
      artifactPath: typeof req.body?.artifactPath === 'string' ? req.body.artifactPath : null,
      eventKind: typeof req.body?.eventKind === 'string' ? req.body.eventKind : null,
    }),
  );
});

app.get('/api/versions', async (req, res) => {
  res.json({ items: await versionRegistry.listEntries(normalizeSubprojectId(req.query.subprojectId)) });
});

app.get('/api/dag/graph', async (req, res) => {
  res.json(await dagService.loadGraph(normalizeSubprojectId(req.query.subprojectId)));
});

app.get('/api/dag/runs', async (req, res) => {
  res.json({ items: await dagService.listRuns(normalizeSubprojectId(req.query.subprojectId)) });
});

app.get('/api/dag/changes', async (req, res) => {
  res.json({ items: await dagService.listChangeEvents(normalizeSubprojectId(req.query.subprojectId)) });
});

app.post('/api/dag/changes', async (req, res) => {
  if (typeof req.body?.nodeId !== 'string' || !req.body.nodeId.trim()) {
    res.status(400).json({ error: 'nodeId is required' });
    return;
  }
  if (typeof req.body?.runId !== 'string' || !req.body.runId.trim()) {
    res.status(400).json({ error: 'runId is required' });
    return;
  }

  res.status(201).json(
    await dagService.registerChange({
      subprojectId: normalizeSubprojectId(req.body?.subprojectId),
      runId: req.body.runId,
      nodeId: req.body.nodeId,
      changeType:
        typeof req.body?.changeType === 'string' &&
        ['requirement', 'design', 'ui', 'backend', 'doc', 'dependency'].includes(req.body.changeType)
          ? req.body.changeType
          : 'requirement',
      previousVersion: typeof req.body?.previousVersion === 'string' ? req.body.previousVersion : null,
      newVersion: typeof req.body?.newVersion === 'string' ? req.body.newVersion : null,
      triggeredBy:
        typeof req.body?.triggeredBy === 'string' && ['user', 'agent', 'system', 'webhook'].includes(req.body.triggeredBy)
          ? req.body.triggeredBy
          : 'user',
    }),
  );
});

app.post('/api/dag/runs/:id/rerun', async (req, res) => {
  res.json(
    await dagService.rerunDirtyNodes({
      dagRunId: req.params.id,
      subprojectId: normalizeSubprojectId(req.body?.subprojectId),
      workflowRunId: typeof req.body?.workflowRunId === 'string' ? req.body.workflowRunId : null,
      reason: typeof req.body?.reason === 'string' ? req.body.reason : null,
      runUntilBlocked: typeof req.body?.runUntilBlocked === 'boolean' ? req.body.runUntilBlocked : true,
    }),
  );
});

app.get('/api/retrieval/governance', async (req, res) => {
  res.json(await retrievalGovernanceService.load(normalizeSubprojectId(req.query.subprojectId)));
});

app.patch('/api/retrieval/governance', async (req, res) => {
  res.json(
    await retrievalGovernanceService.update(normalizeSubprojectId(req.body?.subprojectId), {
      mode:
        typeof req.body?.mode === 'string' && ['local-only', 'prefer-remote', 'remote-required'].includes(req.body.mode)
          ? req.body.mode
          : undefined,
      remoteUrl: typeof req.body?.remoteUrl === 'string' ? req.body.remoteUrl : undefined,
      collectionName: typeof req.body?.collectionName === 'string' ? req.body.collectionName : undefined,
      topK: typeof req.body?.topK === 'number' ? Math.trunc(req.body.topK) : undefined,
      indexingEnabled: typeof req.body?.indexingEnabled === 'boolean' ? req.body.indexingEnabled : undefined,
      qualityGate:
        req.body?.qualityGate && typeof req.body.qualityGate === 'object'
          ? {
              minChunkCount:
                typeof req.body.qualityGate.minChunkCount === 'number' ? Math.trunc(req.body.qualityGate.minChunkCount) : undefined,
              minScore: typeof req.body.qualityGate.minScore === 'number' ? req.body.qualityGate.minScore : undefined,
              requireTruthSources:
                typeof req.body.qualityGate.requireTruthSources === 'boolean'
                  ? req.body.qualityGate.requireTruthSources
                  : undefined,
            }
          : undefined,
    }),
  );
});

app.post('/api/retrieval/governance/index', async (req, res) => {
  res.json(await retrievalGovernanceService.index(normalizeSubprojectId(req.body?.subprojectId)));
});

app.post('/api/retrieval/governance/search', async (req, res) => {
  if (typeof req.body?.query !== 'string' || !req.body.query.trim()) {
    res.status(400).json({ error: 'query is required' });
    return;
  }

  res.json(
    await retrievalGovernanceService.search(normalizeSubprojectId(req.body?.subprojectId), req.body.query.trim()),
  );
});

app.get('/api/hermes/policy-reports', async (req, res) => {
  res.json({ items: await hermesPolicyService.listReports(normalizeSubprojectId(req.query.subprojectId)) });
});

app.get('/api/v0.7/runtime-governance', async (req, res) => {
  res.json(await v07RuntimeGovernanceService.buildSnapshot(normalizeSubprojectId(req.query.subprojectId)));
});

app.post('/api/v0.7/runtime-governance/repeat-corrections/:candidateId/promote', async (req, res) => {
  res.status(201).json(
    await v07RuntimeGovernanceService.promoteRepeatCorrectionCandidate({
      subprojectId: normalizeSubprojectId(req.body?.subprojectId),
      candidateId: req.params.candidateId,
    }),
  );
});

app.get('/api/evaluation-datasets', async (req, res) => {
  res.json({ items: await capabilityRegistry.listEvaluationDatasets(normalizeSubprojectId(req.query.subprojectId)) });
});

app.get('/api/evaluation-runs', async (req, res) => {
  res.json({ items: await capabilityRegistry.listEvaluationRuns(normalizeSubprojectId(req.query.subprojectId)) });
});

app.get('/api/evaluation-history', async (req, res) => {
  res.json(
    await capabilityRegistry.getEvaluationHistory({
      subprojectId: normalizeSubprojectId(req.query.subprojectId),
      capabilityId: normalizeSubprojectId(req.query.capabilityId),
      version: typeof req.query.version === 'string' ? req.query.version : null,
      requirementId: typeof req.query.requirementId === 'string' ? req.query.requirementId : null,
      versionEntryId: typeof req.query.versionEntryId === 'string' ? req.query.versionEntryId : null,
    }),
  );
});

app.post('/api/capabilities/:id/evaluation-datasets', async (req, res) => {
  if (typeof req.body?.version !== 'string' || !req.body.version.trim()) {
    res.status(400).json({ error: 'version is required' });
    return;
  }
  if (typeof req.body?.name !== 'string' || !req.body.name.trim()) {
    res.status(400).json({ error: 'name is required' });
    return;
  }
  if (!Array.isArray(req.body?.cases) || req.body.cases.length === 0) {
    res.status(400).json({ error: 'cases are required' });
    return;
  }

  const dataset = await capabilityRegistry.createEvaluationDataset(req.params.id, {
    version: req.body.version,
    name: req.body.name,
    description: typeof req.body?.description === 'string' ? req.body.description : req.body.name,
    cases: req.body.cases.map((item: Record<string, unknown>, index: number) => ({
      id: typeof item?.id === 'string' ? item.id : `case-${index + 1}`,
      input: item?.input ?? {},
      expected: item?.expected ?? {},
      rubric: Array.isArray(item?.rubric) ? item.rubric : [],
      metadata: item?.metadata && typeof item.metadata === 'object' ? item.metadata : {},
    })),
    subprojectId: normalizeSubprojectId(req.body?.subprojectId),
    metadata: req.body?.metadata && typeof req.body.metadata === 'object' ? req.body.metadata : undefined,
  });
  res.status(201).json(dataset);
});

app.post('/api/capabilities/:id/evaluation-runs', async (req, res) => {
  if (typeof req.body?.datasetId !== 'string' || !req.body.datasetId.trim()) {
    res.status(400).json({ error: 'datasetId is required' });
    return;
  }
  if (typeof req.body?.version !== 'string' || !req.body.version.trim()) {
    res.status(400).json({ error: 'version is required' });
    return;
  }
  if (typeof req.body?.evaluator !== 'string' || !req.body.evaluator.trim()) {
    res.status(400).json({ error: 'evaluator is required' });
    return;
  }

  const result = await capabilityRegistry.runEvaluationDataset(req.params.id, {
    datasetId: req.body.datasetId,
    version: req.body.version,
    evaluator: req.body.evaluator,
    subprojectId: normalizeSubprojectId(req.body?.subprojectId),
    requirementIds: Array.isArray(req.body?.requirementIds) ? req.body.requirementIds.filter((item: unknown) => typeof item === 'string') : [],
    metadata: req.body?.metadata && typeof req.body.metadata === 'object' ? req.body.metadata : undefined,
  });
  res.status(201).json(result);
});

app.post('/api/capabilities/:id/evaluations', async (req, res) => {
  if (typeof req.body?.version !== 'string' || !req.body.version.trim()) {
    res.status(400).json({ error: 'version is required' });
    return;
  }
  if (typeof req.body?.evaluator !== 'string' || !req.body.evaluator.trim()) {
    res.status(400).json({ error: 'evaluator is required' });
    return;
  }
  if (typeof req.body?.score !== 'number') {
    res.status(400).json({ error: 'score is required' });
    return;
  }

  const result = await capabilityRegistry.recordEvaluation(req.params.id, {
    version: req.body.version,
    evaluator: req.body.evaluator,
    passed: typeof req.body?.passed === 'boolean' ? req.body.passed : false,
    score: req.body.score,
    summary: typeof req.body?.summary === 'string' ? req.body.summary : '',
    dimensions: Array.isArray(req.body?.dimensions) ? req.body.dimensions : [],
    requirementIds: Array.isArray(req.body?.requirementIds) ? req.body.requirementIds.filter((item: unknown) => typeof item === 'string') : [],
    metadata: req.body?.metadata && typeof req.body.metadata === 'object' ? req.body.metadata : undefined,
    subprojectId: normalizeSubprojectId(req.body?.subprojectId),
  });
  res.status(201).json(result);
});

app.post('/api/capabilities/:id/publish', async (req, res) => {
  if (typeof req.body?.version !== 'string' || !req.body.version.trim()) {
    res.status(400).json({ error: 'version is required' });
    return;
  }

  res.json(
    await capabilityRegistry.publishCapabilityVersion(req.params.id, {
      version: req.body.version,
      releaseNotes: typeof req.body?.releaseNotes === 'string' ? req.body.releaseNotes : null,
      reviewSummary: typeof req.body?.reviewSummary === 'string' ? req.body.reviewSummary : null,
      testsPassed: typeof req.body?.testsPassed === 'boolean' ? req.body.testsPassed : undefined,
      reviewPassed: typeof req.body?.reviewPassed === 'boolean' ? req.body.reviewPassed : undefined,
      requirementIds: Array.isArray(req.body?.requirementIds) ? req.body.requirementIds : [],
      runId: typeof req.body?.runId === 'string' ? req.body.runId : null,
      subprojectId: normalizeSubprojectId(req.body?.subprojectId),
    }),
  );
});

app.post('/api/capabilities/:id/rollback', async (req, res) => {
  if (typeof req.body?.version !== 'string' || !req.body.version.trim()) {
    res.status(400).json({ error: 'version is required' });
    return;
  }

  res.json(
    await capabilityRegistry.rollbackCapabilityVersion(req.params.id, {
      version: req.body.version,
      summary: typeof req.body?.summary === 'string' ? req.body.summary : null,
      requirementIds: Array.isArray(req.body?.requirementIds) ? req.body.requirementIds : [],
      runId: typeof req.body?.runId === 'string' ? req.body.runId : null,
      subprojectId: normalizeSubprojectId(req.body?.subprojectId),
    }),
  );
});

app.post('/api/capabilities/:id/invoke', async (req, res) => {
  res.json(
    await capabilityRegistry.invokeCapability(req.params.id, {
      version: typeof req.body?.version === 'string' ? req.body.version : null,
      subprojectId: normalizeSubprojectId(req.body?.subprojectId),
      requirementIds: Array.isArray(req.body?.requirementIds) ? req.body.requirementIds : [],
      runId: typeof req.body?.runId === 'string' ? req.body.runId : null,
      payload: req.body?.payload && typeof req.body.payload === 'object' ? req.body.payload : {},
    }),
  );
});

app.get('/api/chat-snapshots/:id', async (req, res) => {
  res.json(await chatService.loadContextSnapshot(req.params.id, normalizeSubprojectId(req.query.subprojectId)));
});

app.get('/api/chat-runs/:id', async (req, res) => {
  res.json(await chatService.loadRun(req.params.id, normalizeSubprojectId(req.query.subprojectId)));
});

app.get('/api/chat-runs/:id/events', async (req, res) => {
  res.json({ items: await chatService.loadRunEvents(req.params.id, normalizeSubprojectId(req.query.subprojectId)) });
});

app.get('/api/chat-runs/:id/observability', async (req, res) => {
  res.json(await observabilityService.loadExecutionObservability(req.params.id, normalizeSubprojectId(req.query.subprojectId)));
});

app.get('/api/files/*', async (req, res) => {
  const requestedPath = decodeURIComponent(req.path.replace(/^\/api\/files\//, ''));
  if (!requestedPath) {
    res.status(400).json({ error: 'path is required' });
    return;
  }
  const extension = path.extname(requestedPath).toLowerCase();
  if (['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'].includes(extension)) {
    const bytes = await fsp.readFile(store.resolve(requestedPath));
    if (extension === '.png') res.type('image/png');
    else if (extension === '.jpg' || extension === '.jpeg') res.type('image/jpeg');
    else if (extension === '.webp') res.type('image/webp');
    else if (extension === '.gif') res.type('image/gif');
    else if (extension === '.svg') res.type('image/svg+xml');
    res.send(bytes);
    return;
  }

  if (extension === '.md') {
    res.type('text/markdown').send(await store.read(requestedPath));
    return;
  }

  if (extension === '.json') {
    res.type('application/json').send(await store.read(requestedPath));
    return;
  }

  res.type('text/plain').send(await store.read(requestedPath));
});

app.get('/api/runs', async (req, res) => {
  res.json(await orchestratorRuntime.listRuns(normalizeSubprojectId(req.query.subprojectId)));
});

app.post('/api/runs', async (req, res) => {
  const subprojectId = normalizeSubprojectId(req.body?.subprojectId);
  const project = await subprojectRegistry.resolveProjectContext(subprojectId);
  const definition = await workflowEngine.loadDefinition(project.projectRoot);
  const providers = await providerRegistry.listProviders(subprojectId);
  const servers = await mcpRegistry.listServers(subprojectId);
  const run = await orchestratorRuntime.initRun({
    definition,
    project,
    providerCount: providers.length,
    mcpServerCount: servers.length,
  });
  res.status(201).json(run);
});

app.get('/api/runs/:id', async (req, res) => {
  res.json(await orchestratorRuntime.loadRun(req.params.id, normalizeSubprojectId(req.query.subprojectId)));
});

app.post('/api/runs/:id/advance', async (req, res) => {
  const subprojectId = normalizeSubprojectId(req.query.subprojectId) ?? normalizeSubprojectId(req.body?.subprojectId);
  const run = await orchestratorRuntime.loadRun(req.params.id, subprojectId);
  const review = run.currentStageId === 'frontend-backend-integration' ? await buildReviewForRun(run.id, run.subprojectId) : null;
  const updated = await orchestratorRuntime.advanceRun(req.params.id, { reviewReport: review });
  res.json(updated);
});

app.post('/api/runs/:id/run-until-blocked', async (req, res) => {
  const subprojectId = normalizeSubprojectId(req.query.subprojectId) ?? normalizeSubprojectId(req.body?.subprojectId);
  let run = await orchestratorRuntime.loadRun(req.params.id, subprojectId);

  while (run.status === 'running' && run.currentStageId) {
    const review = run.currentStageId === 'frontend-backend-integration' ? await buildReviewForRun(run.id, run.subprojectId) : null;
    run = await orchestratorRuntime.advanceRun(req.params.id, { reviewReport: review });
  }

  res.json(run);
});

app.post('/api/runs/:id/resume', async (req, res) => {
  res.json(
    await orchestratorRuntime.resumeRun(req.params.id, {
      targetStageId: typeof req.body?.targetStageId === 'string' ? req.body.targetStageId : null,
      reason: typeof req.body?.reason === 'string' ? req.body.reason : null,
    }),
  );
});

app.post('/api/runs/:id/manual-gate', async (req, res) => {
  if (!['approve', 'rework'].includes(String(req.body?.decision ?? ''))) {
    res.status(400).json({ error: 'decision must be approve or rework' });
    return;
  }
  if (typeof req.body?.summary !== 'string' || !req.body.summary.trim()) {
    res.status(400).json({ error: 'summary is required' });
    return;
  }

  res.json(
    await orchestratorRuntime.applyManualGateDecision(req.params.id, {
      decision: req.body.decision,
      summary: req.body.summary,
      targetStageId: typeof req.body?.targetStageId === 'string' ? req.body.targetStageId : null,
    }),
  );
});

app.get('/api/runs/:id/events', async (req, res) => {
  const subprojectId = normalizeSubprojectId(req.query.subprojectId);
  res.json(await workflowEngine.loadEvents(req.params.id, subprojectId));
});

app.get('/api/runs/:id/artifacts', async (req, res) => {
  const run = await orchestratorRuntime.loadRun(req.params.id, normalizeSubprojectId(req.query.subprojectId));
  res.json(await workflowEngine.hydrateArtifacts(run));
});

app.get('/api/runs/:id/review', async (req, res) => {
  res.json(await buildReviewForRun(req.params.id, normalizeSubprojectId(req.query.subprojectId)));
});

app.get('/api/runs/:id/metrics', async (req, res) => {
  const run = await orchestratorRuntime.loadRun(req.params.id, normalizeSubprojectId(req.query.subprojectId));
  const activeOrCompletedReview = run.stages.some((stage) => stage.id === 'frontend-backend-integration' && stage.status !== 'pending');
  const review = activeOrCompletedReview ? await buildReviewForRun(req.params.id, run.subprojectId) : null;
  res.json(await workflowEngine.buildMetrics(run, review));
});

app.get('/api/runs/:id/hermes-policy', async (req, res) => {
  const run = await orchestratorRuntime.loadRun(req.params.id, normalizeSubprojectId(req.query.subprojectId));
  res.json(await hermesPolicyService.evaluateRun(run));
});

app.post('/api/runs/:id/hermes/close-loop', async (req, res) => {
  const subprojectId = normalizeSubprojectId(req.body?.subprojectId ?? req.query.subprojectId);
  const run = await orchestratorRuntime.loadRun(req.params.id, subprojectId);
  res.json(await hermesPolicyService.closeLoopForRun(run));
});

app.post('/api/runs/:id/hermes/execute-writeback', async (req, res) => {
  const subprojectId = normalizeSubprojectId(req.body?.subprojectId ?? req.query.subprojectId);
  const run = await orchestratorRuntime.loadRun(req.params.id, subprojectId);
  res.json(await hermesPolicyService.executeWritebackForRun(run));
});

app.get('/api/workflow', async (req, res) => {
  res.json(await ensureCurrentRun(normalizeSubprojectId(req.query.subprojectId)));
});

app.get('/api/workflow-definition', async (req, res) => {
  const project = await subprojectRegistry.resolveProjectContext(normalizeSubprojectId(req.query.subprojectId));
  res.json(await workflowEngine.loadDefinition(project.projectRoot));
});

app.get('/api/workflow-events', async (req, res) => {
  const subprojectId = normalizeSubprojectId(req.query.subprojectId);
  const run = await ensureCurrentRun(subprojectId);
  res.json(await workflowEngine.loadEvents(run.id, run.subprojectId));
});

app.get('/api/workflow-metrics', async (req, res) => {
  const subprojectId = normalizeSubprojectId(req.query.subprojectId);
  const run = await ensureCurrentRun(subprojectId);
  const activeOrCompletedReview = run.stages.some((stage) => stage.id === 'frontend-backend-integration' && stage.status !== 'pending');
  const review = activeOrCompletedReview ? await buildReviewForRun(run.id, run.subprojectId) : null;
  res.json(await workflowEngine.buildMetrics(run, review));
});

app.get('/api/artifacts', async (req, res) => {
  const run = await ensureCurrentRun(normalizeSubprojectId(req.query.subprojectId));
  res.json(await workflowEngine.hydrateArtifacts(run));
});

app.get('/api/review', async (req, res) => {
  const run = await ensureCurrentRun(normalizeSubprojectId(req.query.subprojectId));
  res.json(await buildReviewForRun(run.id, run.subprojectId));
});

app.get('/api/providers', async (req, res) => {
  const subprojectId = normalizeSubprojectId(req.query.subprojectId);
  res.json(await providerRegistry.listProviders(subprojectId));
});

app.get('/api/providers/routing', async (req, res) => {
  const subprojectId = normalizeSubprojectId(req.query.subprojectId);
  const project = await subprojectRegistry.resolveProjectContext(subprojectId);
  const capabilityQuery = typeof req.query.capability === 'string' ? req.query.capability.trim() : '';
  const capabilities = capabilityQuery
    ? [capabilityQuery]
    : ['text', 'code', 'review', 'text-multimodal'];

  res.json({
    items: await Promise.all(
      capabilities.map((capability) =>
        llmRouter.describeRouting(capability as 'text' | 'code' | 'review' | 'text-multimodal', {
          subprojectId,
          preferredProvider: project.selectedProvider,
          allowCrossCapabilityFallback: capability === 'text-multimodal',
        }),
      ),
    ),
  });
});

app.post('/api/providers/primary', async (req, res) => {
  const subprojectId = normalizeSubprojectId(req.body?.subprojectId);
  const providerName = typeof req.body?.providerName === 'string' ? req.body.providerName.trim() : '';

  if (!providerName) {
    res.status(400).json({ error: 'providerName is required' });
    return;
  }

  const provider = await providerRegistry.resolveProviderByName(providerName, subprojectId);
  if (!provider) {
    res.status(404).json({ error: 'provider_not_found' });
    return;
  }

  if (subprojectId) {
    await subprojectRegistry.updateOverrides(subprojectId, { provider: providerName });
  } else {
    await providerRegistry.setDefaultProvider(providerName, null);
  }

  const project = await subprojectRegistry.resolveProjectContext(subprojectId);
  res.json({
    subprojectId,
    providerName,
    selectedProvider: project.selectedProvider,
    defaultProvider: (await providerRegistry.loadConfig(subprojectId)).defaultProvider,
  });
});

app.post('/api/providers/:name/priority', async (req, res) => {
  const subprojectId = normalizeSubprojectId(req.body?.subprojectId);
  const delta = typeof req.body?.delta === 'number' ? Math.trunc(req.body.delta) : 0;
  const provider = await providerRegistry.resolveProviderByName(req.params.name, subprojectId);

  if (!provider) {
    res.status(404).json({ error: 'provider_not_found' });
    return;
  }

  if (!delta) {
    res.status(400).json({ error: 'delta must be a non-zero number' });
    return;
  }

  const updated = await providerRegistry.updateProvider(
    req.params.name,
    {
      priority: provider.priority + delta,
    },
    subprojectId,
  );

  res.json({
    name: updated.name,
    priority: updated.priority,
    subprojectId,
  });
});

app.get('/api/providers/:name', async (req, res) => {
  const subprojectId = normalizeSubprojectId(req.query.subprojectId);
  const provider = await providerRegistry.resolveProviderByName(req.params.name, subprojectId);
  if (!provider) {
    res.status(404).json({ error: 'provider_not_found' });
    return;
  }

  res.json({
    name: provider.name,
    type: provider.type,
    configured: provider.configured,
    runtimeReady: provider.runtimeReady,
    deprecatedEnvInUse: provider.deprecatedEnvInUse,
    activeEnvKey: provider.activeEnvKey,
    capabilities: provider.capabilities,
    model: provider.model ?? null,
    baseUrl: provider.baseUrl ?? null,
    priority: provider.priority,
    authMode: provider.authMode,
    scope: provider.scope,
  });
});

app.get('/api/mcp', async (req, res) => {
  res.json(await mcpRegistry.listServers(normalizeSubprojectId(req.query.subprojectId)));
});

app.get('/api/mcp-context/state', async (req, res) => {
  const etag = typeof req.headers['if-none-match'] === 'string' ? req.headers['if-none-match'] : null;
  const { state, changed, newEtag } = await mcpContextSync.getStateIfChanged(etag);
  if (!changed && etag) {
    res.status(304).end();
    return;
  }
  res.setHeader('ETag', newEtag);
  res.json({ ...state, eventLog: state.eventLog.slice(-20) });
});

app.get('/api/task-ssot/state', async (_req, res) => {
  const state = await taskSsotService.getState(normalizeSubprojectId(_req.query.subprojectId));
  res.json({
    ...state,
    total: state.tasks.length,
    active: state.tasks.filter((task) => task.status === 'active').length,
    blocked: state.tasks.filter((task) => task.status === 'blocked').length,
    completed: state.tasks.filter((task) => task.status === 'completed').length,
  });
});

app.get('/api/task-ssot/tasks', async (req, res) => {
  const taskSsotStatuses = ['draft', 'active', 'blocked', 'in_review', 'ready_for_delivery', 'completed', 'failed'] as const;
  const status = typeof req.query.status === 'string' && taskSsotStatuses.includes(req.query.status as (typeof taskSsotStatuses)[number])
    ? (req.query.status as (typeof taskSsotStatuses)[number])
    : undefined;
  const tasks = await taskSsotService.listTasks(status, normalizeSubprojectId(req.query.subprojectId));
  res.json({ tasks, total: tasks.length });
});

app.get('/api/task-ssot/tasks/:taskId', async (req, res) => {
  const task = await taskSsotService.getTask(req.params.taskId, normalizeSubprojectId(req.query.subprojectId));
  if (!task) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  res.json(task);
});

app.get('/api/task-ssot/tasks/:taskId/final-state-validation', async (req, res) => {
  const task = await taskSsotService.getTask(req.params.taskId, normalizeSubprojectId(req.query.subprojectId));
  if (!task) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  let workflowRun = null;
  if (task.sourceType === 'workflow-run-task' && task.sourceRef) {
    try {
      workflowRun = await orchestratorRuntime.loadRun(task.sourceRef, normalizeSubprojectId(req.query.subprojectId));
    } catch {
      workflowRun = null;
    }
  }
  res.json(finalStateValidationService.evaluateTask(task, workflowRun));
});

app.get('/api/task-ssot/tasks/:taskId/frontend-browser-verification', async (req, res) => {
  const subprojectId = normalizeSubprojectId(req.query.subprojectId);
  const task = await taskSsotService.getTask(req.params.taskId, subprojectId);
  if (!task) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  let workflowRun = null;
  if (task.sourceType === 'workflow-run-task' && task.sourceRef) {
    try {
      workflowRun = await orchestratorRuntime.loadRun(task.sourceRef, subprojectId);
    } catch {
      workflowRun = null;
    }
  }
  const report = finalStateValidationService.evaluateTask(task, workflowRun).browserVerification;
  if (!report) {
    res.json({
      taskId: task.taskId,
      workflowRunId: workflowRun?.id ?? null,
      stageId: task.currentStage ?? workflowRun?.currentStageId ?? null,
      applicable: false,
      status: 'not-applicable',
      generatedAt: new Date().toISOString(),
      checks: [],
      summary: 'Current task is not in a frontend delivery stage, so browser-grade verification is not required yet.',
    });
    return;
  }
  res.json(report);
});

app.post('/api/task-ssot/tasks/:taskId/frontend-browser-verification/run', async (req, res) => {
  try {
    const subprojectId = normalizeSubprojectId(req.query.subprojectId);
    const task = await taskSsotService.getTask(req.params.taskId, subprojectId);
    if (!task) {
      res.status(404).json({ error: 'not_found' });
      return;
    }

    const requestedOutputPath = typeof req.body?.outputPath === 'string' && req.body.outputPath.trim()
      ? req.body.outputPath.trim()
      : null;
    const result = await playwrightFrontendVerificationRunner.run({
      subprojectId,
      outputPath: requestedOutputPath ?? path.join(
        'docs',
        'review',
        `playwright-browser-verification-${task.taskId}.json`,
      ),
    });

    if (task.sourceType === 'workflow-run-task' && task.sourceRef) {
      try {
        const workflowRun = await orchestratorRuntime.loadRun(task.sourceRef, subprojectId);
        const nextOutputPaths = workflowRun.stages.map((stage) => stage.id === task.currentStage
          ? {
              ...stage,
              outputPaths: stage.outputPaths.includes(result.outputPath)
                ? stage.outputPaths
                : [...stage.outputPaths, result.outputPath],
            }
          : stage);
        const nextTasks = workflowRun.tasks.map((workflowTask) => workflowTask.id === task.taskId
          ? {
              ...workflowTask,
              artifactPaths: workflowTask.artifactPaths.includes(result.outputPath)
                ? workflowTask.artifactPaths
                : [...workflowTask.artifactPaths, result.outputPath],
            }
          : workflowTask);
        const updatedRun = {
          ...workflowRun,
          stages: nextOutputPaths,
          tasks: nextTasks,
          updatedAt: new Date().toISOString(),
        };
        await memoryService.saveRunSnapshot(workflowRun.id, updatedRun);
        await memoryService.appendEvent(
          workflowRun.id,
          {
            id: `${workflowRun.id}-${task.taskId}-playwright-browser-verification`,
            runId: workflowRun.id,
            stageId: task.currentStage,
            kind: 'artifact_written',
            status: result.report.status === 'ok' ? 'ok' : 'warning',
            timestamp: updatedRun.updatedAt,
            detail: `Playwright 浏览器验证已写入 ${result.outputPath}`,
            artifactPath: result.outputPath,
            metadata: {
              verificationType: 'playwright-browser-verification',
              screenshotPath: result.report.screenshotPath,
            },
          },
          subprojectId,
        );
      } catch {
        // Keep the verification result usable even if workflow-run backwrite fails.
      }
    }

    res.json({
      taskId: task.taskId,
      ...result,
    });
  } catch (error) {
    res.status(500).json({
      error: 'frontend_browser_verification_failed',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

app.post('/api/frontend-browser-verification/run', async (req, res) => {
  try {
    const subprojectId = typeof req.body?.subprojectId === 'string' && req.body.subprojectId.trim()
      ? req.body.subprojectId.trim()
      : normalizeSubprojectId(req.query.subprojectId);
    const url = typeof req.body?.url === 'string' && req.body.url.trim() ? req.body.url.trim() : null;
    const file = typeof req.body?.file === 'string' && req.body.file.trim() ? req.body.file.trim() : null;
    const outputPath = typeof req.body?.outputPath === 'string' && req.body.outputPath.trim()
      ? req.body.outputPath.trim()
      : null;

    const result = await playwrightFrontendVerificationRunner.run({
      subprojectId,
      url,
      file,
      outputPath,
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: 'frontend_browser_verification_failed',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

app.get('/api/proof-of-work/bundle', async (req, res) => {
  const subprojectId = normalizeSubprojectId(req.query.subprojectId);
  const state = await taskSsotService.getState(subprojectId);
  const activeTaskId = state.continuation.activeMainlineTaskId;
  if (!activeTaskId) {
    res.status(404).json({ error: 'no_active_mainline_task' });
    return;
  }

  const task = state.tasks.find((item) => item.taskId === activeTaskId) ?? null;
  if (!task) {
    res.status(404).json({ error: 'active_mainline_task_not_found' });
    return;
  }

  let workflowRun = null;
  let review = null;
  if (task.sourceType === 'workflow-run-task' && task.sourceRef) {
    try {
      workflowRun = await orchestratorRuntime.loadRun(task.sourceRef, subprojectId);
      review = await buildReviewForRun(task.sourceRef, subprojectId);
    } catch {
      workflowRun = null;
      review = null;
    }
  }

  const outboxEnvelopes = await outboxService.listEnvelopes(subprojectId);
  res.json(
    proofOfWorkService.buildBundle({
      task,
      workflowRun,
      review,
      outboxEnvelopes: outboxEnvelopes.filter((item) => item.taskId === task.taskId),
    }),
  );
});

app.get('/api/scheduler/runs', async (req, res) => {
  const items = await schedulerRunService.listRuns(normalizeSubprojectId(req.query.subprojectId));
  res.json({
    items,
    total: items.length,
    running: items.filter((run) => run.status === 'running').length,
    paused: items.filter((run) => run.status === 'paused').length,
    blocked: items.filter((run) => run.status === 'blocked').length,
    completed: items.filter((run) => run.status === 'completed').length,
  });
});

app.get('/api/scheduler/runs/:workflowRunId', async (req, res) => {
  res.json(await schedulerRunService.getRun(req.params.workflowRunId, normalizeSubprojectId(req.query.subprojectId)));
});

app.post('/api/scheduler/runs/tick-due', async (req, res) => {
  const items = await schedulerRunService.tickDueRuns(
    normalizeSubprojectId(req.query.subprojectId) ?? normalizeSubprojectId(req.body?.subprojectId),
  );
  res.json({ items, total: items.length });
});

app.post('/api/scheduler/runs/:workflowRunId/tick', async (req, res) => {
  res.json(
    await schedulerRunService.tickRun(
      req.params.workflowRunId,
      normalizeSubprojectId(req.query.subprojectId) ?? normalizeSubprojectId(req.body?.subprojectId),
    ),
  );
});

app.post('/api/scheduler/runs/:workflowRunId/schedule', async (req, res) => {
  const action =
    req.body?.action === 'advance' || req.body?.action === 'resume-current-stage' || req.body?.action === 'resume-rework-stage'
      ? req.body.action
      : null;
  const cooldownUntil = typeof req.body?.cooldownUntil === 'string' && req.body.cooldownUntil.trim()
    ? req.body.cooldownUntil.trim()
    : null;
  const reason = typeof req.body?.reason === 'string' && req.body.reason.trim() ? req.body.reason.trim() : null;

  res.json(
    await schedulerRunService.scheduleRun(req.params.workflowRunId, {
      action,
      cooldownUntil,
      reason,
      subprojectId: normalizeSubprojectId(req.query.subprojectId) ?? normalizeSubprojectId(req.body?.subprojectId),
    }),
  );
});

app.get('/api/outbox/envelopes', async (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  res.json({
    items: await outboxService.listEnvelopes(normalizeSubprojectId(req.query.subprojectId), status as never),
  });
});

app.post('/api/outbox/envelopes', async (req, res) => {
  if (typeof req.body?.taskId !== 'string' || !req.body.taskId.trim()) {
    res.status(400).json({ error: 'taskId is required' });
    return;
  }
  if (typeof req.body?.entityType !== 'string' || !req.body.entityType.trim()) {
    res.status(400).json({ error: 'entityType is required' });
    return;
  }
  if (typeof req.body?.entityId !== 'string' || !req.body.entityId.trim()) {
    res.status(400).json({ error: 'entityId is required' });
    return;
  }
  if (typeof req.body?.targetSystem !== 'string' || !req.body.targetSystem.trim()) {
    res.status(400).json({ error: 'targetSystem is required' });
    return;
  }
  if (typeof req.body?.action !== 'string' || !req.body.action.trim()) {
    res.status(400).json({ error: 'action is required' });
    return;
  }
  if (typeof req.body?.payloadRef !== 'string' || !req.body.payloadRef.trim()) {
    res.status(400).json({ error: 'payloadRef is required' });
    return;
  }
  res.status(201).json(
    await outboxService.enqueue({
      taskId: req.body.taskId,
      entityType: req.body.entityType,
      entityId: req.body.entityId,
      targetSystem: req.body.targetSystem,
      action: req.body.action,
      payloadRef: req.body.payloadRef,
      maxRetries: typeof req.body?.maxRetries === 'number' ? req.body.maxRetries : undefined,
      subprojectId: normalizeSubprojectId(req.body?.subprojectId),
    }),
  );
});

app.get('/api/mcp-context/tasks', async (req, res) => {
  const status = typeof req.query.status === 'string' && ['pending', 'in_progress', 'completed', 'blocked'].includes(req.query.status)
    ? req.query.status
    : null;
  const state = await mcpContextSync.getState();
  const tasks = status ? state.tasks.filter((t) => t.status === status) : state.tasks;
  res.json({ tasks, total: state.tasks.length });
});

app.get('/api/mcp-context/events', async (req, res) => {
  const count = typeof req.query.count === 'string' ? parseInt(req.query.count, 10) : 20;
  res.json({ items: await mcpContextSync.getRecentEvents(count) });
});

app.get('/api/mcp-context/checkpoints', async (req, res) => {
  res.json({ items: await mcpContextSync.getCheckpoints() });
});

app.get('/api/mcp-context/mode', async (req, res) => {
  const state = await mcpContextSync.getState();
  res.json({
    currentMode: state.currentMode,
    currentTaskId: state.currentTaskId,
    lastUpdated: state.lastUpdated,
    lastUpdatedBy: state.lastUpdatedBy,
  });
});

app.get('/api/mcp-context/mode-history', async (req, res) => {
  res.json({ items: await mcpContextSync.getModeHistory() });
});

app.post('/api/mcp-context/tasks', async (req, res) => {
  if (typeof req.body?.label !== 'string' || !req.body.label.trim()) {
    res.status(400).json({ error: 'label is required' });
    return;
  }
  const toolIdentity: ToolIdentity = ['claude', 'codex', 'other'].includes(String(req.body?.toolIdentity ?? ''))
    ? req.body.toolIdentity
    : 'other';
  const state = await mcpContextSync.updateState({
    toolIdentity,
    newTask: { label: req.body.label.trim(), status: 'in_progress', notes: null },
    newEvent: { toolIdentity, kind: 'task_started', taskId: null, content: req.body.label.trim() },
  });
  res.status(201).json({ currentTaskId: state.currentTaskId, lastUpdated: state.lastUpdated });
});

app.patch('/api/mcp-context/tasks/:taskId', async (req, res) => {
  const toolIdentity: ToolIdentity = ['claude', 'codex', 'other'].includes(String(req.body?.toolIdentity ?? ''))
    ? req.body.toolIdentity
    : 'other';
  const state = await mcpContextSync.updateState({
    toolIdentity,
    taskId: req.params.taskId,
    taskUpdates: {
      ...(req.body?.status ? { status: req.body.status } : {}),
      ...(req.body?.notes !== undefined ? { notes: req.body.notes } : {}),
    },
    newEvent: { toolIdentity, kind: 'task_completed', taskId: req.params.taskId, content: '状态更新' },
  });
  res.json(state.tasks.find((t) => t.id === req.params.taskId) ?? { error: 'not_found' });
});

app.post('/api/mcp-context/checkpoints', async (req, res) => {
  if (typeof req.body?.label !== 'string' || !req.body.label.trim()) {
    res.status(400).json({ error: 'label is required' });
    return;
  }
  const toolIdentity: ToolIdentity = ['claude', 'codex', 'other'].includes(String(req.body?.toolIdentity ?? ''))
    ? req.body.toolIdentity
    : 'other';
  const state = await mcpContextSync.getState();
  await mcpContextSync.updateState({
    toolIdentity,
    newCheckpoint: { label: req.body.label.trim(), taskId: state.currentTaskId, contextSnapshot: 'api checkpoint' },
    newEvent: { toolIdentity, kind: 'checkpoint', taskId: state.currentTaskId, content: req.body.label.trim() },
  });
  const checkpoints = await mcpContextSync.getCheckpoints();
  res.status(201).json(checkpoints[0]);
});

app.post('/api/mcp-context/mode', async (req, res) => {
  const mode = typeof req.body?.mode === 'string' && ['default', 'plan', 'deep', 'do'].includes(req.body.mode)
    ? req.body.mode
    : null;
  if (!mode) {
    res.status(400).json({ error: 'mode must be one of default|plan|deep|do' });
    return;
  }
  const toolIdentity: ToolIdentity = ['claude', 'codex', 'other'].includes(String(req.body?.toolIdentity ?? ''))
    ? req.body.toolIdentity
    : 'other';
  const label = typeof req.body?.label === 'string' && req.body.label.trim()
    ? req.body.label.trim()
    : `switch to ${mode}`;
  const state = await mcpContextSync.updateState({
    toolIdentity,
    mode,
    modeLabel: label,
    newEvent: {
      toolIdentity,
      kind: 'mode_changed',
      taskId: null,
      content: label,
    },
  });
  res.status(201).json({
    currentMode: state.currentMode,
    lastUpdated: state.lastUpdated,
    lastUpdatedBy: state.lastUpdatedBy,
  });
});

app.post('/api/mcp-context/session', async (req, res) => {
  const toolIdentity: ToolIdentity = ['claude', 'codex', 'other'].includes(String(req.body?.toolIdentity ?? ''))
    ? req.body.toolIdentity
    : 'other';
  res.json(await mcpContextSync.createSession({ toolIdentity, projectPath: rootDir }));
});

const staticDir = path.join(rootDir, 'dist');
const staticIndexPath = path.join(staticDir, 'index.html');

if (fs.existsSync(staticIndexPath)) {
  app.use(express.static(staticDir, { index: false }));
  app.get('/', async (_req, res) => {
    const [projectEntries, checklistSummary, dailyDigests, resumeContext] = await Promise.all([
      loadProjectEntrySummaries(),
      loadExecutionChecklistSummary(),
      loadDailyDigestEntries(),
      loadResumeContextSummary(),
    ]);
    res.type('html').send(renderDirectEntryHtml(projectEntries, checklistSummary, dailyDigests, resumeContext));
  });
  app.get('/workspace', (_req, res) => {
    res.sendFile(staticIndexPath);
  });
  app.get('/workspace/*', (_req, res) => {
    res.sendFile(staticIndexPath);
  });
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      next();
      return;
    }

    res.sendFile(staticIndexPath);
  });
}

const port = Number(process.env.PORT ?? 4312);
app.listen(port, () => {
  console.log(`PMAIOS backend listening on http://localhost:${port}`);
});

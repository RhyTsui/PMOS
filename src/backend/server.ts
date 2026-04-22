import 'dotenv/config';
import express from 'express';
import { promises as fsp } from 'node:fs';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { FileStore } from '../core/fileStore.js';
import { WorkflowEngine } from '../core/workflowEngine.js';
import { ReviewCommittee } from '../core/reviewCommittee.js';
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
import { SkillRegistry } from '../core/skillRegistry.js';
import { ExternalConnectorService } from '../core/externalConnectorService.js';
import { McpContextSyncService, type ToolIdentity } from '../core/mcpContextSyncService.js';
import { LlmRouter } from '../llm_router/index.js';

const rootDir = process.env.AI_OS_ROOT ? path.resolve(process.env.AI_OS_ROOT) : process.cwd();
const store = new FileStore(rootDir);
const memoryService = new MemoryService(store);
const workflowEngine = new WorkflowEngine(store, memoryService);
const reviewCommittee = new ReviewCommittee();
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
const skillRegistry = new SkillRegistry(store);
const externalConnectorService = new ExternalConnectorService(store);
const mcpContextSync = new McpContextSyncService(rootDir);
const llmRouter = new LlmRouter(store);

const app = express();
app.use(cors());
app.use(express.json());

function renderDirectEntryHtml(
  projectEntries: ProjectEntrySummary[] = [],
  checklistSummary: ExecutionChecklistSummary = { versions: [], userBackchecks: [] },
  dailyDigests: DailyDigestEntry[] = [],
) {
  const fullyCoveredProjects = projectEntries.filter((entry) => entry.missingAssets.length === 0).length;
  const versionSection =
    checklistSummary.versions.length === 0
      ? '<p class="empty">当前还没有可展示的分母进度。</p>'
      : `<div class="summary-grid">${checklistSummary.versions
          .map(
            (version) => `<article class="summary-card">
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
            (backcheck) => `<article class="summary-card">
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
            (digest) => `<article class="summary-card">
              <strong>${digest.label}</strong>
              <span>${digest.path}</span>
              <span><a href="${digest.url}" target="_blank" rel="noreferrer">打开蒸馏文档</a></span>
            </article>`,
          )
          .join('')}</div>`;
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
      <article class="summary-card">
        <strong>项目入口 rollout 分母</strong>
        <span>活跃项目：5</span>
        <span>project-board：3 / 5</span>
        <span>roadmap-board：0 / 5</span>
        <span>decision-board：0 / 5</span>
        <span>change-log：0 / 5</span>
      </article>
      <article class="summary-card">
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
      .summary-card {
        display: grid;
        gap: 6px;
        padding: 16px;
        border: 1px solid var(--line);
        border-radius: 16px;
        background: #fffaf2;
      }
      .summary-card strong {
        font-size: 15px;
      }
      .summary-card span {
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
  'docs/operations/',
  'docs/research/',
  'docs/templates/',
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

function normalizeSubprojectId(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
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
  return reviewCommittee.buildReportForRun({
    runId,
    artifactCount,
    openSourceEvaluationPresent: openSourceEvidence.present,
    openSourceEvidencePaths: openSourceEvidence.evidencePaths,
  });
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'ai-os-backend' });
});

app.get('/api/human-reading/manifest', (_req, res) => {
  res.json({
    basePath: '/pmaios',
    entries: {
      rootEntry: '/',
      workspace: '/workspace',
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

app.get('/api/connectors/status', async (req, res) => {
  res.json(
    await externalConnectorService.getStatus(normalizeSubprojectId(req.query.subprojectId), {
      checkRemote: req.query.checkRemote === 'true',
    }),
  );
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

app.get('/api/product-chief/specialist-tasks', async (req, res) => {
  res.json({ items: await productChiefService.listSpecialistTasks(normalizeSubprojectId(req.query.subprojectId)) });
});

app.get('/api/product-chief/multi-agent-reviews', async (req, res) => {
  res.json({ items: await productChiefService.listMultiAgentReviews(normalizeSubprojectId(req.query.subprojectId)) });
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
  res.status(201).json(
    await productChiefService.generateGovernedOutput({
      reportId: req.params.id,
      type: typeof req.body?.type === 'string' ? req.body.type : null,
      subprojectId: normalizeSubprojectId(req.body?.subprojectId),
      requirementIds: Array.isArray(req.body?.requirementIds) ? req.body.requirementIds.filter((item: unknown) => typeof item === 'string') : [],
    }),
  );
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

  res.type('application/json').send(await store.read(requestedPath));
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
  const review = run.currentStageId === 'review-metrics-telemetry' ? await buildReviewForRun(run.id, run.subprojectId) : null;
  const updated = await orchestratorRuntime.advanceRun(req.params.id, { reviewReport: review });
  res.json(updated);
});

app.post('/api/runs/:id/run-until-blocked', async (req, res) => {
  const subprojectId = normalizeSubprojectId(req.query.subprojectId) ?? normalizeSubprojectId(req.body?.subprojectId);
  let run = await orchestratorRuntime.loadRun(req.params.id, subprojectId);

  while (run.status === 'running' && run.currentStageId) {
    const review = run.currentStageId === 'review-metrics-telemetry' ? await buildReviewForRun(run.id, run.subprojectId) : null;
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
  const activeOrCompletedReview = run.stages.some((stage) => stage.id === 'review-metrics-telemetry' && stage.status !== 'pending');
  const review = activeOrCompletedReview ? await buildReviewForRun(req.params.id, run.subprojectId) : null;
  res.json(await workflowEngine.buildMetrics(run, review));
});

app.get('/api/runs/:id/hermes-policy', async (req, res) => {
  const run = await orchestratorRuntime.loadRun(req.params.id, normalizeSubprojectId(req.query.subprojectId));
  res.json(await hermesPolicyService.evaluateRun(run));
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
  const activeOrCompletedReview = run.stages.some((stage) => stage.id === 'review-metrics-telemetry' && stage.status !== 'pending');
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
    const projectEntries = await loadProjectEntrySummaries();
    const checklistSummary = await loadExecutionChecklistSummary();
    const dailyDigests = await loadDailyDigestEntries();
    res.type('html').send(renderDirectEntryHtml(projectEntries, checklistSummary, dailyDigests));
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

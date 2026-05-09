#!/usr/bin/env node
import 'dotenv/config';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { FileStore } from '../core/fileStore.js';
import { WorkflowEngine } from '../core/workflowEngine.js';
import { MemoryService } from '../core/memoryService.js';
import { OrchestratorRuntime } from '../core/orchestratorRuntime.js';
import { ProviderRegistry } from '../core/providerRegistry.js';
import { McpRegistry } from '../core/mcpRegistry.js';
import { ReviewCommittee } from '../core/reviewCommittee.js';
import { SubprojectRegistry } from '../core/subprojectRegistry.js';
import { ProductAgentService } from '../core/productAgentService.js';
import { ProductChiefService } from '../core/productChiefService.js';
import { DocumentationNormalizationService } from '../core/documentationNormalizationService.js';
import { DocumentGovernanceService } from '../core/documentGovernanceService.js';
import { McpContextSyncService, type CollaborationMode, type ToolIdentity } from '../core/mcpContextSyncService.js';
import { SkillRegistry } from '../core/skillRegistry.js';
import { SubprojectPrepService } from '../core/subprojectPrepService.js';
import { CodexLocalStateService } from '../core/codexLocalStateService.js';
import { RequirementExcelPoolService } from '../core/requirementExcelPoolService.js';
import { LlmRouter } from '../llm_router/index.js';
import { syncActiveModelToSettings } from '../llm_router/claudeSettingsSync.js';
import type { ProviderCapability } from '../shared/schemas.js';

const rootDir = process.env.AI_OS_ROOT ? path.resolve(process.env.AI_OS_ROOT) : process.cwd();
const store = new FileStore(rootDir);
const memoryService = new MemoryService(store);
const workflowEngine = new WorkflowEngine(store, memoryService);
const orchestratorRuntime = new OrchestratorRuntime(store, memoryService);
const providerRegistry = new ProviderRegistry(store);
const mcpRegistry = new McpRegistry(store);
const reviewCommittee = new ReviewCommittee();
const subprojectRegistry = new SubprojectRegistry(store);
const productAgentService = new ProductAgentService(store);
const skillRegistry = new SkillRegistry(store);
const subprojectPrepService = new SubprojectPrepService(store, skillRegistry, subprojectRegistry);
const codexLocalStateService = new CodexLocalStateService(store, skillRegistry);
const productChiefService = new ProductChiefService(store, memoryService, productAgentService, skillRegistry);
const documentationNormalizationService = new DocumentationNormalizationService(store, memoryService);
const documentGovernanceService = new DocumentGovernanceService(store);
const requirementExcelPoolService = new RequirementExcelPoolService(store, memoryService);
const mcpContextSync = new McpContextSyncService(rootDir);
const llmRouter = new LlmRouter(store);

function normalizeSubprojectId(value?: string) {
  return value?.trim() ? value.trim() : null;
}

function parseOptions(args: string[]) {
  let subprojectId: string | null = null;
  let tool: string | null = null;
  const positional: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const current = args[index];
    if (current === '--subproject') {
      subprojectId = normalizeSubprojectId(args[index + 1]);
      index += 1;
      continue;
    }
    if (current === '--tool') {
      tool = args[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (current === '--status' || current === '--count') {
      positional.push(current);
      positional.push(args[index + 1] ?? '');
      index += 1;
      continue;
    }
    positional.push(current);
  }

  return { positional, subprojectId, tool };
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
    activeStageId: run.currentStageId,
    openSourceEvaluationPresent: openSourceEvidence.present,
    openSourceEvidencePaths: openSourceEvidence.evidencePaths,
    artifacts: artifacts.map((artifact) => ({ path: artifact.path, content: artifact.content })),
  });
}

function printUsage() {
  console.log([
    'PMAIOS CLI',
    '',
    '用法：',
    '  npm run cli -- subproject list',
    '  npm run cli -- subproject create <id> [name] [description]',
    '  npm run cli -- subproject show <id>',
    '  npm run cli -- subproject portfolio',
    '  npm run cli -- run init [--subproject <id>]',
    '  npm run cli -- run advance [runId] [--subproject <id>]',
    '  npm run cli -- run until-blocked [runId] [--subproject <id>]',
    '  npm run cli -- run resume [runId] [stageId] [--subproject <id>]',
    '  npm run cli -- run gate [runId] <approve|rework> <summary> [targetStageId] [--subproject <id>]',
    '  npm run cli -- run status [runId] [--subproject <id>]',
    '  npm run cli -- run events [runId] [--subproject <id>]',
    '  npm run cli -- run artifacts [runId] [--subproject <id>]',
    '  npm run cli -- run metrics [runId] [--subproject <id>]',
    '  npm run cli -- provider list',
    '  npm run cli -- provider check [name]',
    '  npm run cli -- provider use <name> [--tool claude|codex] [--subproject <id>]',
    '  npm run cli -- provider routing [text|code|review|text-multimodal] [--subproject <id>]',
    '  npm run cli -- product-agent list [--subproject <id>]',
    '  npm run cli -- product-agent blueprints',
    '  npm run cli -- product-agent bootstrap [--subproject <id>]',
    '  npm run cli -- product-agent create <name> <summary> <problem> [--subproject <id>]',
    '  npm run cli -- product-agent generate <brief> [name] [--subproject <id>]',
    '  npm run cli -- product-agent show <id> [--subproject <id>]',
    '  npm run cli -- skill list [--subproject <id>]',
    '  npm run cli -- skill find <brief> [stageId] [outputType] [--subproject <id>]',
    '  npm run cli -- subproject-prep scan [--subproject <id>]',
    '  npm run cli -- subproject-prep check [--subproject <id>]',
    '  npm run cli -- subproject-prep status [--subproject <id>]',
    '  npm run cli -- codex-state status [--subproject <id>]',
    '  npm run cli -- codex-state write [relativePath] [--subproject <id>]',
    '  npm run cli -- codex-state sync [relativePath] [--subproject <id>]',
    '  npm run cli -- product-chief analyze <brief> [--subproject <id>]',
    '  npm run cli -- product-chief output <reportId> [type] [--subproject <id>]',
    '  npm run cli -- product-chief reports [--subproject <id>]',
    '  npm run cli -- product-chief outputs [--subproject <id>]',
    '  npm run cli -- documentation normalize [sourceRoot] [--subproject <id>]',
    '  npm run cli -- documentation normalize-paths <path1[,path2...]> [--subproject <id>]',
    '  npm run cli -- documentation ingest-inbox-updates [sourceRoot] [--subproject <id>]',
    '  npm run cli -- documentation runs [--subproject <id>]',
    '  npm run cli -- documentation truth-source-list [--subproject <id>]',
    '  npm run cli -- documentation truth-source-upsert <topicKey> <path> [status] [title] [--subproject <id>]',
    '  npm run cli -- documentation truth-source-audit [--subproject <id>]',
    '  npm run cli -- requirement-pool export [outputPath] [--subproject <id>]',
    '  npm run cli -- requirement-pool import <inputPath> [--subproject <id>]',
    '  npm run cli -- requirement-pool path [--subproject <id>]',
    '  npm run cli -- review show [runId] [--subproject <id>]',
    '  npm run cli -- memory show [runId] [--subproject <id>]',
    '  npm run cli -- mcp-context status [--tool claude|codex]',
    '  npm run cli -- mcp-context tasks [--status pending|in_progress|completed|blocked]',
    '  npm run cli -- mcp-context task-start <label> [--tool claude|codex]',
    '  npm run cli -- mcp-context task-complete <taskId> [--tool claude|codex]',
    '  npm run cli -- mcp-context task-note <taskId> <note> [--tool claude|codex]',
    '  npm run cli -- mcp-context events [--count <n>]',
    '  npm run cli -- mcp-context checkpoint <label> [--tool claude|codex]',
    '  npm run cli -- mcp-context mode',
    '  npm run cli -- mcp-context mode-set <default|plan|deep|do> [label] [--tool claude|codex]',
    '  npm run cli -- mcp-context mode-history',
    '  npm run cli -- mcp-context digest-day [YYYY-MM-DD] [--tool claude|codex]',
    '  npm run cli -- mcp-context repair [--tool claude|codex]',
  ].join('\n'));
}

async function runInit(subprojectId?: string | null) {
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
  console.log(JSON.stringify(run, null, 2));
}

async function runAdvance(runId?: string, subprojectId?: string | null) {
  const targetRun = runId ? await orchestratorRuntime.loadRun(runId, subprojectId) : await ensureCurrentRun(subprojectId);
  const review = targetRun.currentStageId === 'frontend-backend-integration' ? await buildReviewForRun(targetRun.id, targetRun.subprojectId) : null;
  const updated = await orchestratorRuntime.advanceRun(targetRun.id, { reviewReport: review });
  console.log(JSON.stringify(updated, null, 2));
}

async function runUntilBlocked(runId?: string, subprojectId?: string | null) {
  const targetRun = runId ? await orchestratorRuntime.loadRun(runId, subprojectId) : await ensureCurrentRun(subprojectId);
  let run = targetRun;

  while (run.status === 'running' && run.currentStageId) {
    const review = run.currentStageId === 'frontend-backend-integration' ? await buildReviewForRun(run.id, run.subprojectId) : null;
    run = await orchestratorRuntime.advanceRun(run.id, { reviewReport: review });
  }

  console.log(JSON.stringify(run, null, 2));
}

async function runResume(runId?: string, targetStageId?: string, subprojectId?: string | null) {
  const targetRun = runId ? await orchestratorRuntime.loadRun(runId, subprojectId) : await ensureCurrentRun(subprojectId);
  const resumed = await orchestratorRuntime.resumeRun(targetRun.id, {
    targetStageId: normalizeSubprojectId(targetStageId),
    reason: 'cli manual resume',
  });
  console.log(JSON.stringify(resumed, null, 2));
}

async function runGate(
  runId?: string,
  decision?: string,
  summary?: string,
  targetStageId?: string,
  subprojectId?: string | null,
) {
  if (!decision || !['approve', 'rework'].includes(decision)) {
    throw new Error('run gate 需要 decision=approve|rework。');
  }
  if (!summary) {
    throw new Error('run gate 需要 summary。');
  }

  const targetRun = runId ? await orchestratorRuntime.loadRun(runId, subprojectId) : await ensureCurrentRun(subprojectId);
  const updated = await orchestratorRuntime.applyManualGateDecision(targetRun.id, {
    decision: decision as 'approve' | 'rework',
    summary,
    targetStageId: normalizeSubprojectId(targetStageId),
  });
  console.log(JSON.stringify(updated, null, 2));
}

async function runStatus(runId?: string, subprojectId?: string | null) {
  const run = runId ? await orchestratorRuntime.loadRun(runId, subprojectId) : await ensureCurrentRun(subprojectId);
  const summary = {
    id: run.id,
    subprojectId: run.subprojectId,
    projectName: run.projectName,
    projectRoot: run.projectRoot,
    status: run.status,
    currentStageId: run.currentStageId,
    generatedAt: run.generatedAt,
    updatedAt: run.updatedAt,
    stages: run.stages.map((stage) => ({
      id: stage.id,
      label: stage.label,
      status: stage.status,
      outputs: stage.outputPaths.length,
    })),
  };
  console.log(JSON.stringify(summary, null, 2));
}

async function runEvents(runId?: string, subprojectId?: string | null) {
  const run = runId ? await orchestratorRuntime.loadRun(runId, subprojectId) : await ensureCurrentRun(subprojectId);
  const events = await orchestratorRuntime.loadEvents(run.id, run.subprojectId);
  console.log(
    JSON.stringify(
      {
        runId: run.id,
        subprojectId: run.subprojectId,
        events,
      },
      null,
      2,
    ),
  );
}

async function runArtifacts(runId?: string, subprojectId?: string | null) {
  const run = runId ? await orchestratorRuntime.loadRun(runId, subprojectId) : await ensureCurrentRun(subprojectId);
  const artifacts = run.stages.flatMap((stage) =>
    stage.outputPaths.map((artifactPath, index) => ({
      id: `${stage.id}-${index + 1}`,
      runId: run.id,
      stageId: stage.id,
      stage: stage.label,
      title: `${stage.label} MVP 产物 ${index + 1}`,
      path: artifactPath,
      type: artifactPath.endsWith('.json') ? 'json' : 'markdown',
    })),
  );

  console.log(
    JSON.stringify(
      {
        runId: run.id,
        subprojectId: run.subprojectId,
        artifacts,
      },
      null,
      2,
    ),
  );
}

async function runMetrics(runId?: string, subprojectId?: string | null) {
  const run = runId ? await orchestratorRuntime.loadRun(runId, subprojectId) : await ensureCurrentRun(subprojectId);
  const review = await buildReviewForRun(run.id, run.subprojectId);
  const metrics = await workflowEngine.buildMetrics(run, review);
  console.log(JSON.stringify(metrics, null, 2));
}

async function reviewShow(runId?: string, subprojectId?: string | null) {
  const run = runId ? await orchestratorRuntime.loadRun(runId, subprojectId) : await ensureCurrentRun(subprojectId);
  const review = await buildReviewForRun(run.id, run.subprojectId);
  console.log(JSON.stringify(review, null, 2));
}

async function memoryShow(runId?: string, subprojectId?: string | null) {
  const run = runId ? await orchestratorRuntime.loadRun(runId, subprojectId) : await ensureCurrentRun(subprojectId);
  const projectMemory = await store.read(run.memory.projectMemoryPath);
  console.log(
    JSON.stringify(
      {
        runId: run.id,
        subprojectId: run.subprojectId,
        memory: run.memory,
        projectMemory,
      },
      null,
      2,
    ),
  );
}

async function providerList(subprojectId?: string | null) {
  const providers = await providerRegistry.listProviders(subprojectId);
  console.log(JSON.stringify(providers, null, 2));
}

async function providerCheck(name?: string, subprojectId?: string | null) {
  if (!name) {
    throw new Error('provider check 需要 provider 名称。');
  }

  const provider = await providerRegistry.resolveProviderByName(name, subprojectId);
  if (!provider) {
    throw new Error(`未找到 provider: ${name}`);
  }

  console.log(
    JSON.stringify(
      {
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
      },
      null,
      2,
    ),
  );
}

async function providerUse(name?: string, subprojectId?: string | null, tool?: string | null) {
  if (!name) {
    throw new Error('provider use requires a provider name.');
  }

  const provider = await providerRegistry.resolveProviderByName(name, subprojectId);
  if (!provider) {
    throw new Error(`provider not found: ${name}`);
  }

  if (provider.scope === 'codex-only' || provider.authMode === 'browser') {
    console.log(
      JSON.stringify(
        {
          providerName: provider.name,
          changed: false,
          reason: 'This provider is a native Codex login provider. PMAIOS cannot route Claude/Web/runtime calls through it.',
          nextRuntimeProvider: (await llmRouter.describeRouting('text', { subprojectId })).providers[0]?.name ?? null,
        },
        null,
        2,
      ),
    );
    return;
  }

  if (subprojectId) {
    await subprojectRegistry.updateOverrides(subprojectId, { provider: provider.name });
  } else {
    await providerRegistry.setDefaultProvider(provider.name, null);
  }

  const toolIdentity = parseToolIdentity(tool ?? undefined);
  if (toolIdentity === 'claude') {
    await syncActiveModelToSettings(provider);
  }

  console.log(
    JSON.stringify(
      {
        providerName: provider.name,
        subprojectId: subprojectId ?? null,
        toolIdentity,
        defaultProvider: (await providerRegistry.loadConfig(subprojectId)).defaultProvider,
        note:
          toolIdentity === 'claude'
            ? 'Claude settings sync was requested. Existing interactive sessions may need restart or an in-tool model switch.'
            : 'PMAIOS runtime default was updated. Native Codex login sessions are not intercepted by this command.',
      },
      null,
      2,
    ),
  );
}

async function providerRouting(capability?: string, subprojectId?: string | null) {
  const capabilities: ProviderCapability[] = capability
    ? [capability as ProviderCapability]
    : ['text', 'code', 'review', 'text-multimodal'];
  const project = await subprojectRegistry.resolveProjectContext(subprojectId);
  const snapshots = await Promise.all(
    capabilities.map((item) =>
      llmRouter.describeRouting(item, {
        subprojectId,
        preferredProvider: project.selectedProvider,
        allowCrossCapabilityFallback: item === 'text-multimodal',
      }),
    ),
  );
  console.log(JSON.stringify({ subprojectId: subprojectId ?? null, items: snapshots }, null, 2));
}

async function productAgentList(subprojectId?: string | null) {
  console.log(JSON.stringify(await productAgentService.listAgents(subprojectId), null, 2));
}

async function productAgentBlueprints() {
  console.log(JSON.stringify(await productAgentService.listBlueprints(), null, 2));
}

async function productAgentBootstrap(subprojectId?: string | null) {
  console.log(JSON.stringify(await productAgentService.bootstrapManagementHierarchy(subprojectId), null, 2));
}

async function productAgentCreate(name?: string, summary?: string, problem?: string, subprojectId?: string | null) {
  if (!name || !summary || !problem) {
    throw new Error('product-agent create 需要 name、summary、problem。');
  }

  const agent = await productAgentService.createAgent({
    name,
    summary,
    problem,
    subprojectId,
    source: 'cli',
  });
  console.log(JSON.stringify(agent, null, 2));
}

async function productAgentGenerate(brief?: string, name?: string, subprojectId?: string | null) {
  if (!brief) {
    throw new Error('product-agent generate 需要 brief。');
  }

  const agent = await productAgentService.generateAgent({
    brief,
    name,
    subprojectId,
    source: 'cli',
  });
  console.log(JSON.stringify(agent, null, 2));
}

async function productAgentShow(agentId?: string, subprojectId?: string | null) {
  if (!agentId) {
    throw new Error('product-agent show 需要 agent id。');
  }

  console.log(JSON.stringify(await productAgentService.loadAgent(agentId, subprojectId), null, 2));
}

async function skillList(subprojectId?: string | null) {
  const items = await skillRegistry.listSkills(subprojectId);
  const readiness = await skillRegistry.describeReadiness(subprojectId);
  console.log(JSON.stringify({ items, readiness }, null, 2));
}

async function skillFind(query?: string, stageId?: string, outputType?: string, subprojectId?: string | null) {
  if (!query) {
    throw new Error('skill find requires a brief or query.');
  }

  console.log(
    JSON.stringify(
      {
        query,
        stageId: normalizeSubprojectId(stageId),
        outputType: normalizeSubprojectId(outputType),
        items: await skillRegistry.findSkills({
          query,
          stageId: normalizeSubprojectId(stageId),
          outputType: normalizeSubprojectId(outputType),
          subprojectId,
        }),
      },
      null,
      2,
    ),
  );
}

async function subprojectPrepScan(subprojectId?: string | null) {
  console.log(JSON.stringify(await subprojectPrepService.scan(subprojectId), null, 2));
}

async function subprojectPrepCheck(subprojectId?: string | null) {
  console.log(JSON.stringify(await subprojectPrepService.check(subprojectId), null, 2));
}

async function subprojectPrepStatus(subprojectId?: string | null) {
  console.log(JSON.stringify(await subprojectPrepService.status(subprojectId), null, 2));
}

async function codexStateStatus(subprojectId?: string | null) {
  console.log(JSON.stringify(await codexLocalStateService.inspect(subprojectId), null, 2));
}

async function codexStateWrite(relativePath?: string, subprojectId?: string | null) {
  const result = await codexLocalStateService.writeSnapshot(relativePath?.trim() || undefined, subprojectId);
  console.log(
    JSON.stringify(
      {
        path: result.path,
        localSkillCount: result.snapshot.localSkills.length,
        localPluginCount: result.snapshot.localPlugins.length,
        localOnlySkills: result.snapshot.diff.localOnlySkills,
        pmaiosOnlyExternalSkills: result.snapshot.diff.pmaiosOnlyExternalSkills,
      },
      null,
      2,
    ),
  );
}

async function codexStateSync(relativePath?: string, subprojectId?: string | null) {
  const result = await codexLocalStateService.writeSnapshot(relativePath?.trim() || undefined, subprojectId);
  const { snapshot } = result;
  console.log(
    JSON.stringify(
      {
        status:
          snapshot.diff.localOnlySkills.length === 0 &&
          snapshot.diff.runtimeVisibleOnlySkills.length === 0 &&
          snapshot.diff.enabledPluginsNotTrackedByPmaios.length === 0
            ? 'aligned'
            : 'drift-detected',
        path: result.path,
        codexHome: snapshot.codexHome,
        localSkillCount: snapshot.localSkills.length,
        runtimeVisibleSkillCount: snapshot.runtimeVisibleSkills.length,
        localPluginCount: snapshot.localPlugins.length,
        syncedExternalSkills: snapshot.diff.localVisibleAndRegisteredSkills,
        governedRuntimeCapabilities: snapshot.governedRuntimeCapabilities.map((item) => item.id),
        governedLocalRuntimeCore: snapshot.governedLocalRuntimeCore.map((item) => item.id),
        governedPlugins: snapshot.governedPlugins.map((item) => item.id),
        localOnlySkills: snapshot.diff.localOnlySkills,
        runtimeVisibleOnlySkills: snapshot.diff.runtimeVisibleOnlySkills,
        enabledPluginsNotTrackedByPmaios: snapshot.diff.enabledPluginsNotTrackedByPmaios,
      },
      null,
      2,
    ),
  );
}

async function productChiefAnalyze(brief?: string, subprojectId?: string | null) {
  if (!brief) {
    throw new Error('product-chief analyze requires a brief.');
  }

  console.log(JSON.stringify(await productChiefService.analyze({ brief, subprojectId }), null, 2));
}

async function productChiefOutput(reportId?: string, type?: string, subprojectId?: string | null) {
  if (!reportId) {
    throw new Error('product-chief output requires a report id.');
  }

  console.log(
    JSON.stringify(
      await productChiefService.generateGovernedOutput({
        reportId,
        type,
        subprojectId,
      }),
      null,
      2,
    ),
  );
}

async function productChiefReports(subprojectId?: string | null) {
  console.log(JSON.stringify(await productChiefService.listReports(subprojectId), null, 2));
}

async function productChiefOutputs(subprojectId?: string | null) {
  console.log(JSON.stringify(await productChiefService.listOutputs(subprojectId), null, 2));
}

async function documentationNormalize(sourceRoot?: string, subprojectId?: string | null) {
  const run = await documentationNormalizationService.normalize({
    subprojectId,
    sourceRoot: sourceRoot?.trim() || null,
  });
  console.log(JSON.stringify(run, null, 2));
}

async function documentationNormalizePaths(rawPaths?: string, subprojectId?: string | null) {
  const sourcePaths = (rawPaths ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  if (sourcePaths.length === 0) {
    throw new Error('documentation normalize-paths requires at least one source path.');
  }

  const run = await documentationNormalizationService.normalize({
    subprojectId,
    sourcePaths,
  });
  console.log(JSON.stringify(run, null, 2));
}

async function documentationIngestInboxUpdates(sourceRoot?: string, subprojectId?: string | null) {
  const run = await documentationNormalizationService.ingestInboxUpdates({
    subprojectId,
    sourceRoot: sourceRoot?.trim() || null,
  });
  console.log(JSON.stringify(run, null, 2));
}

async function documentationRuns(subprojectId?: string | null) {
  console.log(JSON.stringify(await documentationNormalizationService.listRuns(subprojectId), null, 2));
}

async function documentationTruthSourceList(subprojectId?: string | null) {
  console.log(JSON.stringify(await documentGovernanceService.listEntries(subprojectId), null, 2));
}

async function documentationTruthSourceUpsert(
  topicKey?: string,
  documentPath?: string,
  status?: string,
  title?: string,
  subprojectId?: string | null,
) {
  if (!topicKey?.trim()) {
    throw new Error('documentation truth-source-upsert requires topicKey.');
  }
  if (!documentPath?.trim()) {
    throw new Error('documentation truth-source-upsert requires path.');
  }
  const allowedStatuses = ['draft', 'active', 'superseded', 'archived', 'deleted'];
  if (status && !allowedStatuses.includes(status)) {
    throw new Error(`documentation truth-source-upsert status must be one of: ${allowedStatuses.join(', ')}`);
  }
  const entry = await documentGovernanceService.upsertEntry({
    topicKey,
    path: documentPath,
    status: (status as 'draft' | 'active' | 'superseded' | 'archived' | 'deleted' | undefined) ?? 'draft',
    title: title?.trim() || documentPath,
    subprojectId,
  });
  console.log(JSON.stringify(entry, null, 2));
}

async function documentationTruthSourceAudit(subprojectId?: string | null) {
  console.log(JSON.stringify(await documentGovernanceService.audit(subprojectId), null, 2));
}

async function requirementPoolExport(outputPath?: string, subprojectId?: string | null) {
  console.log(JSON.stringify(await requirementExcelPoolService.exportWorkbook(outputPath, subprojectId), null, 2));
}

async function requirementPoolImport(inputPath?: string, subprojectId?: string | null) {
  if (!inputPath) {
    throw new Error('requirement-pool import requires an input workbook path.');
  }
  console.log(JSON.stringify(await requirementExcelPoolService.importWorkbook(inputPath, subprojectId), null, 2));
}

async function requirementPoolPath(subprojectId?: string | null) {
  console.log(
    JSON.stringify(
      {
        subprojectId: subprojectId ?? null,
        defaultPath: requirementExcelPoolService.getDefaultWorkbookPath(subprojectId),
      },
      null,
      2,
    ),
  );
}

async function subprojectList() {
  const subprojects = await subprojectRegistry.listSubprojects();
  console.log(JSON.stringify(subprojects, null, 2));
}

async function subprojectCreate(id?: string, name?: string, description?: string) {
  if (!id) {
    throw new Error('subproject create 需要子项目 id。');
  }

  const subproject = await subprojectRegistry.createSubproject({ id, name, description });
  console.log(JSON.stringify(subproject, null, 2));
}

async function subprojectPortfolio() {
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

  console.log(JSON.stringify(portfolio, null, 2));
}

async function subprojectShow(id?: string) {
  if (!id) {
    throw new Error('subproject show 需要子项目 id。');
  }

  const subproject = await subprojectRegistry.loadSubproject(id);
  console.log(JSON.stringify(subproject, null, 2));
}

function parseToolIdentity(raw?: string): ToolIdentity {
  if (raw === 'claude' || raw === 'codex' || raw === 'other') {
    return raw;
  }
  return 'other';
}

function parseCollaborationMode(raw?: string): CollaborationMode | null {
  if (raw === 'default' || raw === 'plan' || raw === 'deep' || raw === 'do') {
    return raw;
  }
  return null;
}

async function mcpContextStatus(rawTool?: string, statusFilter?: string) {
  const toolIdentity = parseToolIdentity(rawTool);
  const state = toolIdentity === 'other'
    ? await mcpContextSync.getState()
    : await mcpContextSync.createSession({ toolIdentity, projectPath: rootDir });
  let tasks = state.tasks;
  if (statusFilter && ['pending', 'in_progress', 'completed', 'blocked'].includes(statusFilter)) {
    tasks = tasks.filter((t) => t.status === statusFilter);
  }
  console.log(JSON.stringify({ state: { ...state, eventLog: state.eventLog.slice(-20) }, tasks, total: state.tasks.length }, null, 2));
}

async function mcpContextMode() {
  const state = await mcpContextSync.getState();
  console.log(
    JSON.stringify(
      {
        currentMode: state.currentMode,
        lastUpdated: state.lastUpdated,
        lastUpdatedBy: state.lastUpdatedBy,
        currentTaskId: state.currentTaskId,
      },
      null,
      2,
    ),
  );
}

async function mcpContextModeSet(rawMode?: string, label?: string, tool?: string) {
  const mode = parseCollaborationMode(rawMode);
  if (!mode) {
    throw new Error('mcp-context mode-set requires one of: default | plan | deep | do');
  }
  const toolIdentity = parseToolIdentity(tool);
  const state = await mcpContextSync.updateState({
    toolIdentity,
    mode,
    modeLabel: label ?? `switch to ${mode}`,
    newEvent: {
      toolIdentity,
      kind: 'mode_changed',
      taskId: null,
      content: label?.trim() || `switch to ${mode}`,
    },
  });
  console.log(
    JSON.stringify(
      {
        currentMode: state.currentMode,
        lastUpdated: state.lastUpdated,
        lastUpdatedBy: state.lastUpdatedBy,
      },
      null,
      2,
    ),
  );
}

async function mcpContextModeHistory() {
  console.log(JSON.stringify(await mcpContextSync.getModeHistory(), null, 2));
}

async function mcpContextTasks(statusFilter?: string) {
  const state = await mcpContextSync.getState();
  const tasks = statusFilter && ['pending', 'in_progress', 'completed', 'blocked'].includes(statusFilter)
    ? state.tasks.filter((t) => t.status === statusFilter)
    : state.tasks;
  console.log(JSON.stringify(tasks, null, 2));
}

async function mcpContextTaskStart(label?: string, tool?: string) {
  if (!label) throw new Error('mcp-context task-start 需要 label');
  const toolIdentity = parseToolIdentity(tool);
  await mcpContextSync.updateState({
    toolIdentity,
    newTask: { label, status: 'in_progress', notes: null },
    newEvent: { toolIdentity, kind: 'task_started', taskId: null, content: label },
  });
  console.log(JSON.stringify(await mcpContextSync.getState().then((s) => ({ currentTaskId: s.currentTaskId, lastUpdated: s.lastUpdated })), null, 2));
}

async function mcpContextTaskComplete(taskId?: string, tool?: string) {
  if (!taskId) throw new Error('mcp-context task-complete 需要 taskId');
  const toolIdentity = parseToolIdentity(tool);
  const updated = await mcpContextSync.updateState({
    toolIdentity,
    taskId,
    taskUpdates: { status: 'completed' },
    newEvent: { toolIdentity, kind: 'task_completed', taskId, content: '任务完成' },
  });
  console.log(JSON.stringify(updated.tasks.find((t) => t.id === taskId) ?? { error: 'task not found' }, null, 2));
}

async function mcpContextTaskNote(taskId?: string, note?: string, tool?: string) {
  if (!taskId || !note) throw new Error('mcp-context task-note 需要 taskId 和 note');
  const toolIdentity = parseToolIdentity(tool);
  await mcpContextSync.updateState({
    toolIdentity,
    taskId,
    taskUpdates: { notes: note },
    newEvent: { toolIdentity, kind: 'note', taskId, content: note },
  });
  console.log(JSON.stringify({ ok: true, taskId, note }, null, 2));
}

async function mcpContextEvents(count?: number) {
  const events = await mcpContextSync.getRecentEvents(count ?? 10);
  console.log(JSON.stringify(events, null, 2));
}

async function mcpContextCheckpoint(label?: string, tool?: string) {
  if (!label) throw new Error('mcp-context checkpoint 需要 label');
  const toolIdentity = parseToolIdentity(tool);
  const state = await mcpContextSync.getState();
  await mcpContextSync.updateState({
    toolIdentity,
    newCheckpoint: { label, taskId: state.currentTaskId, contextSnapshot: 'task snapshot' },
    newEvent: { toolIdentity, kind: 'checkpoint', taskId: state.currentTaskId, content: label },
  });
  console.log(JSON.stringify(await mcpContextSync.getCheckpoints().then((c) => c[0]), null, 2));
}

async function mcpContextRepair(tool?: string) {
  const toolIdentity = parseToolIdentity(tool);
  const repaired = await mcpContextSync.repairState(toolIdentity);
  console.log(
    JSON.stringify(
      {
        currentTaskId: repaired.currentTaskId,
        taskCount: repaired.tasks.length,
        eventCount: repaired.eventLog.length,
        checkpointCount: repaired.checkpoints.length,
        lastUpdated: repaired.lastUpdated,
      },
      null,
      2,
    ),
  );
}

function formatDigestDate(input: Date, timeZone = 'Asia/Shanghai') {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(input);
}

function matchesDigestDate(timestamp: string, digestDate: string) {
  return formatDigestDate(new Date(timestamp)) === digestDate;
}

function classifyDigestCandidate(label: string) {
  const normalized = label.toLowerCase();
  if (
    normalized.includes('rule') ||
    normalized.includes('protocol') ||
    normalized.includes('mode') ||
    normalized.includes('requirement') ||
    normalized.includes('backcheck') ||
    normalized.includes('progress')
  ) {
    return 'rule-or-method';
  }
  if (
    normalized.includes('template') ||
    normalized.includes('contract') ||
    normalized.includes('workflow') ||
    normalized.includes('checklist')
  ) {
    return 'template-or-contract';
  }
  if (
    normalized.includes('research') ||
    normalized.includes('cognition') ||
    normalized.includes('intent') ||
    normalized.includes('digestion')
  ) {
    return 'research-or-cognition';
  }
  if (normalized.includes('skill')) {
    return 'skill-candidate';
  }
  return null;
}

async function mcpContextDigestDay(rawDate?: string, tool?: string) {
  const toolIdentity = parseToolIdentity(tool);
  const state = await mcpContextSync.getState();
  const digestDate = rawDate?.trim() || formatDigestDate(new Date());
  const events = state.eventLog.filter((event) => matchesDigestDate(event.timestamp, digestDate));
  const checkpoints = state.checkpoints.filter((checkpoint) => matchesDigestDate(checkpoint.timestamp, digestDate));
  const tasks = state.tasks.filter(
    (task) =>
      matchesDigestDate(task.createdAt, digestDate) ||
      matchesDigestDate(task.updatedAt, digestDate) ||
      (task.completedAt ? matchesDigestDate(task.completedAt, digestDate) : false),
  );

  const candidatePool = [...checkpoints.map((item) => item.label), ...events.map((item) => item.content)];
  const seen = new Set<string>();
  const candidates = candidatePool
    .map((label) => ({ label, type: classifyDigestCandidate(label) }))
    .filter((item): item is { label: string; type: string } => Boolean(item.type))
    .filter((item) => {
      const dedupeKey = `${item.type}:${item.label}`;
      if (seen.has(dedupeKey)) return false;
      seen.add(dedupeKey);
      return true;
    });

  const digestPath = path.join(rootDir, 'docs', 'operations', 'daily-digests', `${digestDate}.md`);
  const markdown = [
    `# ${digestDate} 对话蒸馏`,
    '',
    '- generator: `npm run cli -- mcp-context digest-day`',
    `- date: ${digestDate}`,
    `- current mode: ${state.currentMode}`,
    `- current task: ${state.currentTaskId ?? '-'}`,
    `- tool identity: ${toolIdentity}`,
    '',
    '## 当日任务变化',
    ...(tasks.length
      ? tasks.map(
          (task) =>
            `- ${task.label} | status=${task.status} | created=${task.createdAt} | updated=${task.updatedAt}${
              task.completedAt ? ` | completed=${task.completedAt}` : ''
            }`,
        )
      : ['- 无']),
    '',
    '## 当日 checkpoints',
    ...(checkpoints.length
      ? checkpoints.map((checkpoint) => `- ${checkpoint.label} | ${checkpoint.taskId ?? '-'} | ${checkpoint.timestamp}`)
      : ['- 无']),
    '',
    '## 当日共享事件',
    ...(events.length
      ? events.map((event) => `- ${event.kind} | ${event.content} | ${event.taskId ?? '-'} | ${event.timestamp}`)
      : ['- 无']),
    '',
    '## 可提炼候选',
    ...(candidates.length ? candidates.map((item) => `- ${item.type}: ${item.label}`) : ['- 今日未识别到明确候选']),
    '',
    '## 待人工判断',
    '- 哪些候选应升级为 rule',
    '- 哪些候选应升级为 method asset',
    '- 哪些候选应升级为 skill candidate',
    '- 哪些候选应单开 deep research',
    '',
  ].join('\n');

  await fs.mkdir(path.dirname(digestPath), { recursive: true });
  await fs.writeFile(digestPath, markdown, 'utf8');
  console.log(
    JSON.stringify(
      {
        date: digestDate,
        path: path.relative(rootDir, digestPath),
        eventCount: events.length,
        checkpointCount: checkpoints.length,
        taskCount: tasks.length,
        candidateCount: candidates.length,
      },
      null,
      2,
    ),
  );
}

async function main() {
  const { positional, subprojectId, tool } = parseOptions(process.argv.slice(2));
  const [scope, action, target, extraName, extraDescription] = positional;

  if (!scope || !action) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  if (scope === 'subproject' && action === 'list') {
    await subprojectList();
    return;
  }

  if (scope === 'subproject' && action === 'create') {
    await subprojectCreate(target, extraName, extraDescription);
    return;
  }

  if (scope === 'subproject' && action === 'show') {
    await subprojectShow(target);
    return;
  }

  if (scope === 'subproject' && action === 'portfolio') {
    await subprojectPortfolio();
    return;
  }

  if (scope === 'run' && action === 'init') {
    await runInit(subprojectId);
    return;
  }

  if (scope === 'run' && action === 'advance') {
    await runAdvance(target, subprojectId);
    return;
  }

  if (scope === 'run' && action === 'until-blocked') {
    await runUntilBlocked(target, subprojectId);
    return;
  }

  if (scope === 'run' && action === 'resume') {
    await runResume(target, extraName, subprojectId);
    return;
  }

  if (scope === 'run' && action === 'gate') {
    await runGate(target, extraName, extraDescription, positional[5], subprojectId);
    return;
  }

  if (scope === 'run' && action === 'status') {
    await runStatus(target, subprojectId);
    return;
  }

  if (scope === 'run' && action === 'events') {
    await runEvents(target, subprojectId);
    return;
  }

  if (scope === 'run' && action === 'artifacts') {
    await runArtifacts(target, subprojectId);
    return;
  }

  if (scope === 'run' && action === 'metrics') {
    await runMetrics(target, subprojectId);
    return;
  }

  if (scope === 'provider' && action === 'list') {
    await providerList(subprojectId);
    return;
  }

  if (scope === 'provider' && action === 'check') {
    await providerCheck(target, subprojectId);
    return;
  }

  if (scope === 'provider' && action === 'use') {
    await providerUse(target, subprojectId, tool);
    return;
  }

  if (scope === 'provider' && action === 'routing') {
    await providerRouting(target, subprojectId);
    return;
  }

  if (scope === 'product-agent' && action === 'list') {
    await productAgentList(subprojectId);
    return;
  }

  if (scope === 'product-agent' && action === 'blueprints') {
    await productAgentBlueprints();
    return;
  }

  if (scope === 'product-agent' && action === 'bootstrap') {
    await productAgentBootstrap(subprojectId);
    return;
  }

  if (scope === 'product-agent' && action === 'create') {
    await productAgentCreate(target, extraName, extraDescription, subprojectId);
    return;
  }

  if (scope === 'product-agent' && action === 'generate') {
    await productAgentGenerate(target, extraName, subprojectId);
    return;
  }

  if (scope === 'product-agent' && action === 'show') {
    await productAgentShow(target, subprojectId);
    return;
  }

  if (scope === 'skill' && action === 'list') {
    await skillList(subprojectId);
    return;
  }

  if (scope === 'skill' && action === 'find') {
    await skillFind(target, extraName, extraDescription, subprojectId);
    return;
  }

  if (scope === 'subproject-prep' && action === 'scan') {
    await subprojectPrepScan(subprojectId);
    return;
  }

  if (scope === 'subproject-prep' && action === 'check') {
    await subprojectPrepCheck(subprojectId);
    return;
  }

  if (scope === 'subproject-prep' && action === 'status') {
    await subprojectPrepStatus(subprojectId);
    return;
  }

  if (scope === 'codex-state' && action === 'status') {
    await codexStateStatus(subprojectId);
    return;
  }

  if (scope === 'codex-state' && action === 'write') {
    await codexStateWrite(target, subprojectId);
    return;
  }

  if (scope === 'codex-state' && action === 'sync') {
    await codexStateSync(target, subprojectId);
    return;
  }

  if (scope === 'product-chief' && action === 'analyze') {
    await productChiefAnalyze(target, subprojectId);
    return;
  }

  if (scope === 'product-chief' && action === 'output') {
    await productChiefOutput(target, extraName, subprojectId);
    return;
  }

  if (scope === 'product-chief' && action === 'reports') {
    await productChiefReports(subprojectId);
    return;
  }

  if (scope === 'product-chief' && action === 'outputs') {
    await productChiefOutputs(subprojectId);
    return;
  }

  if (scope === 'documentation' && action === 'normalize') {
    await documentationNormalize(target, subprojectId);
    return;
  }

  if (scope === 'documentation' && action === 'normalize-paths') {
    await documentationNormalizePaths(target, subprojectId);
    return;
  }

  if (scope === 'documentation' && action === 'ingest-inbox-updates') {
    await documentationIngestInboxUpdates(target, subprojectId);
    return;
  }

  if (scope === 'documentation' && action === 'runs') {
    await documentationRuns(subprojectId);
    return;
  }

  if (scope === 'documentation' && action === 'truth-source-list') {
    await documentationTruthSourceList(subprojectId);
    return;
  }

  if (scope === 'documentation' && action === 'truth-source-upsert') {
    await documentationTruthSourceUpsert(target, extraName, extraDescription, positional[5], subprojectId);
    return;
  }

  if (scope === 'documentation' && action === 'truth-source-audit') {
    await documentationTruthSourceAudit(subprojectId);
    return;
  }

  if (scope === 'requirement-pool' && action === 'export') {
    await requirementPoolExport(target, subprojectId);
    return;
  }

  if (scope === 'requirement-pool' && action === 'import') {
    await requirementPoolImport(target, subprojectId);
    return;
  }

  if (scope === 'requirement-pool' && action === 'path') {
    await requirementPoolPath(subprojectId);
    return;
  }

  if (scope === 'review' && action === 'show') {
    await reviewShow(target, subprojectId);
    return;
  }

  if (scope === 'memory' && action === 'show') {
    await memoryShow(target, subprojectId);
    return;
  }

  if (scope === 'mcp-context' && action === 'status') {
    await mcpContextStatus(tool ?? target, target === '--status' ? extraName : undefined);
    return;
  }

  if (scope === 'mcp-context' && action === 'tasks') {
    await mcpContextTasks(target === '--status' ? extraName : target);
    return;
  }

  if (scope === 'mcp-context' && action === 'task-start') {
    await mcpContextTaskStart(target, tool ?? extraName);
    return;
  }

  if (scope === 'mcp-context' && action === 'task-complete') {
    await mcpContextTaskComplete(target, tool ?? extraName);
    return;
  }

  if (scope === 'mcp-context' && action === 'task-note') {
    await mcpContextTaskNote(target, extraName, positional[5]);
    return;
  }

  if (scope === 'mcp-context' && action === 'events') {
    const rawCount = target === '--count' ? extraName : target;
    const count = rawCount ? parseInt(rawCount, 10) : undefined;
    await mcpContextEvents(count);
    return;
  }

  if (scope === 'mcp-context' && action === 'checkpoint') {
    await mcpContextCheckpoint(target, tool ?? extraName);
    return;
  }

  if (scope === 'mcp-context' && action === 'mode') {
    await mcpContextMode();
    return;
  }

  if (scope === 'mcp-context' && action === 'mode-set') {
    await mcpContextModeSet(target, extraName, tool ?? positional[5]);
    return;
  }

  if (scope === 'mcp-context' && action === 'mode-history') {
    await mcpContextModeHistory();
    return;
  }

  if (scope === 'mcp-context' && action === 'digest-day') {
    await mcpContextDigestDay(target, tool ?? extraName);
    return;
  }

  if (scope === 'mcp-context' && action === 'repair') {
    await mcpContextRepair(tool ?? target);
    return;
  }

  printUsage();
  process.exitCode = 1;
}

void main();

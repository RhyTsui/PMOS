#!/usr/bin/env node
import 'dotenv/config';
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
import { DocumentationNormalizationService } from '../core/documentationNormalizationService.js';

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
const documentationNormalizationService = new DocumentationNormalizationService(store, memoryService);

function normalizeSubprojectId(value?: string) {
  return value?.trim() ? value.trim() : null;
}

function parseOptions(args: string[]) {
  let subprojectId: string | null = null;
  const positional: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const current = args[index];
    if (current === '--subproject') {
      subprojectId = normalizeSubprojectId(args[index + 1]);
      index += 1;
      continue;
    }
    positional.push(current);
  }

  return { positional, subprojectId };
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
    '  npm run cli -- product-agent list [--subproject <id>]',
    '  npm run cli -- product-agent blueprints',
    '  npm run cli -- product-agent bootstrap [--subproject <id>]',
    '  npm run cli -- product-agent create <name> <summary> <problem> [--subproject <id>]',
    '  npm run cli -- product-agent generate <brief> [name] [--subproject <id>]',
    '  npm run cli -- product-agent show <id> [--subproject <id>]',
    '  npm run cli -- documentation normalize [sourceRoot] [--subproject <id>]',
    '  npm run cli -- documentation runs [--subproject <id>]',
    '  npm run cli -- review show [runId] [--subproject <id>]',
    '  npm run cli -- memory show [runId] [--subproject <id>]',
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
  const review = targetRun.currentStageId === 'review-metrics-telemetry' ? await buildReviewForRun(targetRun.id, targetRun.subprojectId) : null;
  const updated = await orchestratorRuntime.advanceRun(targetRun.id, { reviewReport: review });
  console.log(JSON.stringify(updated, null, 2));
}

async function runUntilBlocked(runId?: string, subprojectId?: string | null) {
  const targetRun = runId ? await orchestratorRuntime.loadRun(runId, subprojectId) : await ensureCurrentRun(subprojectId);
  let run = targetRun;

  while (run.status === 'running' && run.currentStageId) {
    const review = run.currentStageId === 'review-metrics-telemetry' ? await buildReviewForRun(run.id, run.subprojectId) : null;
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
      },
      null,
      2,
    ),
  );
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

async function documentationNormalize(sourceRoot?: string, subprojectId?: string | null) {
  const run = await documentationNormalizationService.normalize({
    subprojectId,
    sourceRoot: sourceRoot?.trim() || null,
  });
  console.log(JSON.stringify(run, null, 2));
}

async function documentationRuns(subprojectId?: string | null) {
  console.log(JSON.stringify(await documentationNormalizationService.listRuns(subprojectId), null, 2));
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

async function main() {
  const { positional, subprojectId } = parseOptions(process.argv.slice(2));
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

  if (scope === 'documentation' && action === 'normalize') {
    await documentationNormalize(target, subprojectId);
    return;
  }

  if (scope === 'documentation' && action === 'runs') {
    await documentationRuns(subprojectId);
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

  printUsage();
  process.exitCode = 1;
}

void main();

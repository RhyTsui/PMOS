import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import { FileStore } from '../../src/core/fileStore';
import { WorkflowEngine } from '../../src/core/workflowEngine';
import { MemoryService } from '../../src/core/memoryService';
import { OrchestratorRuntime } from '../../src/core/orchestratorRuntime';
import { ReviewCommittee } from '../../src/core/reviewCommittee';
import { SkillRegistry } from '../../src/core/skillRegistry';
import { SubprojectRegistry } from '../../src/core/subprojectRegistry';

function createStore() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'ai-os-'));
  return new FileStore(root);
}

async function seedFixture(store: FileStore) {
  const repoStore = new FileStore(path.resolve(process.cwd()));
  await store.write('docs/memory/project-memory.md', '# Project Memory\n');
  await store.write('skills/registry.json', await repoStore.read('skills/registry.json'));
  await store.write('config/providers.json', await repoStore.read('config/providers.json'));
}

async function seedRuntimeFixture(store: FileStore) {
  await seedFixture(store);
  await store.write(
    'config/providers.json',
    JSON.stringify(
      {
        defaultProvider: 'mock',
        providers: [
          {
            name: 'mock',
            type: 'mock',
            envKey: 'MOCK_KEY',
            capabilities: ['text', 'code', 'review', 'text-multimodal'],
          },
        ],
      },
      null,
      2,
    ),
  );
}

describe('WorkflowEngine', () => {
  it('loads a typed workflow definition aligned to the 9-stage delivery chain', async () => {
    const store = createStore();
    const engine = new WorkflowEngine(store);

    const definition = await engine.loadDefinition();

    expect(definition.defaultLocale).toBe('zh-CN');
    expect(definition.stages).toHaveLength(9);
    expect(definition.name).toBe('PMAIOS v0.7 产品交付主链');
    expect(definition.stages[0]?.id).toBe('research-document');
    expect(definition.stages[0]?.priority).toBe('P0');
    expect(definition.stages[4]?.id).toBe('design-document');
    expect(definition.stages[5]?.id).toBe('frontend-page');
    expect(definition.stages[5]?.capability).toBe('multimodal');
    expect(definition.stages[8]?.capability).toBe('review');
    expect(definition.stages.every((stage) => stage.requiredOutputs.length > 0)).toBe(true);

    const requirementsStage = definition.stages.find((stage) => stage.id === 'requirements-document');
    const functionalStage = definition.stages.find((stage) => stage.id === 'functional-specification');
    const backendStage = definition.stages.find((stage) => stage.id === 'backend-api');
    expect(requirementsStage?.requiredOutputs.some((output) => output.path.includes('requirement-to-function-'))).toBe(true);
    expect(functionalStage?.requiredOutputs.some((output) => output.path.includes('function-to-api-'))).toBe(true);
    expect(backendStage?.requiredOutputs.some((output) => output.path.includes('api-to-task-'))).toBe(true);
  });

  it('creates and advances a real run', async () => {
    const store = createStore();
    await seedFixture(store);

    const memoryService = new MemoryService(store);
    const engine = new WorkflowEngine(store, memoryService);
    const runtime = new OrchestratorRuntime(store, memoryService);
    const definition = await engine.loadDefinition();
    const subprojectRegistry = new SubprojectRegistry(store);
    const project = await subprojectRegistry.resolveProjectContext();

    const run = await runtime.initRun({
      definition,
      project,
      providerCount: 1,
      mcpServerCount: 1,
    });

    expect(run.currentStageId).toBe('research-document');
    expect(run.stages[0]?.status).toBe('active');
    expect(run.stages[0]?.attemptCount).toBe(1);
    expect(run.tasks[0]?.status).toBe('active');
    expect(run.activeCapability).toBe('text');

    const nextRun = await runtime.advanceRun(run.id);
    expect(nextRun.stages[0]?.status).toBe('completed');
    expect(nextRun.stages[1]?.status).toBe('active');
    expect(nextRun.tasks[0]?.status).toBe('completed');
    expect(nextRun.tasks[0]?.artifactPaths.length).toBeGreaterThan(0);
    expect(nextRun.tasks[1]?.status).toBe('active');
    expect(nextRun.activeCapability).toBe('text');

    const events = await engine.loadEvents(run.id);
    expect(events.some((event) => event.kind === 'run_initialized')).toBe(true);
    expect(events.some((event) => event.kind === 'artifact_written')).toBe(true);
    expect(events.every((event) => event.metadata !== undefined)).toBe(true);
  });

  it('writes structured stage content with skills', async () => {
    const store = createStore();
    await seedFixture(store);
    await store.write('docs/memory/project-memory.md', '# Project Memory\n- 文件真源优先\n');

    const memoryService = new MemoryService(store);
    const engine = new WorkflowEngine(store, memoryService);
    const runtime = new OrchestratorRuntime(store, memoryService);
    const definition = await engine.loadDefinition();
    const subprojectRegistry = new SubprojectRegistry(store);
    const project = await subprojectRegistry.resolveProjectContext();

    const run = await runtime.initRun({
      definition,
      project,
      providerCount: 1,
      mcpServerCount: 1,
    });

    const nextRun = await runtime.advanceRun(run.id);
    const artifactPath = nextRun.stages[0]?.outputPaths[0];
    expect(artifactPath).toBeTruthy();
    expect(artifactPath).toBe(`docs/research/${run.id}.md`);

    const content = await store.read(artifactPath!);
    expect(content).toContain('## 方法参考 Skills');
    expect(content).toContain('Competitive Analysis');
    expect(content).toContain('## 调研范围');
    expect(content).toContain('projectName: PMAIOS Platform');
  });

  it('builds telemetry metrics for a real run', async () => {
    const store = createStore();
    await seedFixture(store);

    const memoryService = new MemoryService(store);
    const engine = new WorkflowEngine(store, memoryService);
    const runtime = new OrchestratorRuntime(store, memoryService);
    const definition = await engine.loadDefinition();
    const reviewCommittee = new ReviewCommittee();
    const subprojectRegistry = new SubprojectRegistry(store);
    const project = await subprojectRegistry.resolveProjectContext();

    const run = await runtime.initRun({
      definition,
      project,
      providerCount: 2,
      mcpServerCount: 1,
    });

    const progressed = await runtime.runUntilBlocked(run.id, {
      reviewReport: reviewCommittee.buildReportForRun({ runId: run.id, artifactCount: 6 }),
    });
    const metrics = await engine.buildMetrics(
      progressed,
      reviewCommittee.buildReportForRun({ runId: run.id, artifactCount: 6 }),
    );

    expect(metrics.totalStages).toBe(progressed.stages.length);
    expect(metrics.artifactCount).toBeGreaterThan(0);
    expect(metrics.blockedStages).toBeGreaterThanOrEqual(0);
    expect(metrics.reworkCount).toBeGreaterThanOrEqual(0);
    expect(metrics.completionRate).toBeGreaterThan(0);
    expect(metrics.stageMetrics.every((stage) => stage.attemptCount >= 0)).toBe(true);
  });

  it('loads structured skills from registry through compatibility mapping', async () => {
    const store = createStore();
    const repoStore = new FileStore(path.resolve(process.cwd()));
    await store.write('skills/registry.json', await repoStore.read('skills/registry.json'));

    const registry = new SkillRegistry(store);
    const skills = await registry.listSkillsForStage('prd');

    expect(skills.map((skill) => skill.id)).toContain('persona');
    expect(skills.map((skill) => skill.id)).toContain('five-w-two-h');
  });

  it('merges subproject skill overrides with platform registry', async () => {
    const store = createStore();
    await seedFixture(store);

    const subprojectRegistry = new SubprojectRegistry(store);
    await subprojectRegistry.createSubproject({
      id: 'crm',
      name: 'CRM',
      overrides: {
        skillConfigPath: 'subprojects/crm/skills/registry.json',
      },
    });
    await store.write(
      'subprojects/crm/skills/registry.json',
      JSON.stringify(
        {
          version: '0.1.0-crm',
          skills: [
            {
              id: 'persona',
              name: 'CRM Persona',
              category: 'product',
              description: '覆盖平台默认画像定义。',
              ownerRole: 'CRM 产品经理',
              promptPath: 'subprojects/crm/prompts/crm-prd.md',
              stageIds: ['prd'],
              outputs: ['CRM 用户画像', 'CRM 成功标准'],
            },
            {
              id: 'crm-retention',
              name: 'CRM Retention',
              category: 'growth',
              description: '补充 CRM 留存分析。',
              ownerRole: '增长负责人',
              promptPath: 'subprojects/crm/prompts/retention.md',
              stageIds: ['prd'],
              outputs: ['留存策略', '关键指标'],
            },
          ],
        },
        null,
        2,
      ),
    );

    const registry = new SkillRegistry(store);
    const prdSkills = await registry.listSkillsForStage('prd', 'crm');
    const persona = prdSkills.find((skill) => skill.id === 'persona');
    const crmRetention = prdSkills.find((skill) => skill.id === 'crm-retention');

    expect(persona?.name).toBe('CRM Persona');
    expect(persona?.promptPath).toBe('subprojects/crm/prompts/crm-prd.md');
    expect(crmRetention?.name).toBe('CRM Retention');
    expect(prdSkills.map((skill) => skill.id)).toContain('five-w-two-h');
  });

  it('finds auto-trigger skills by brief, stage, output type, and deployment readiness', async () => {
    const store = createStore();
    const repoStore = new FileStore(path.resolve(process.cwd()));
    await store.write('skills/registry.json', await repoStore.read('skills/registry.json'));

    const registry = new SkillRegistry(store);
    const matches = await registry.findSkills({
      query: 'Build a schema-driven UI workflow with Ant Design X and manager agent review',
      stageId: 'frontend-page',
      outputType: 'ui-schema-spec',
      limit: 5,
    });
    const readiness = await registry.describeReadiness();

    expect(matches.map((match) => match.skill.id)).toContain('schema-driven-ui-design');
    expect(matches.map((match) => match.skill.id)).toContain('ant-design-family-frontend');
    expect(matches.map((match) => match.skill.id)).toContain('product-chief-manager-agent');
    expect(matches[0]?.score).toBeGreaterThan(0);
    expect(readiness.autoTriggerable).toBeGreaterThan(0);
    expect(readiness.integrated).toBeGreaterThan(0);
  });

  it('writes multimodal markdown and manifest outputs and blocks on missing provider config', async () => {
    const store = createStore();
    await seedFixture(store);

    const memoryService = new MemoryService(store);
    const engine = new WorkflowEngine(store, memoryService);
    const runtime = new OrchestratorRuntime(store, memoryService);
    const definition = await engine.loadDefinition();
    const reviewCommittee = new ReviewCommittee();
    const subprojectRegistry = new SubprojectRegistry(store);
    const project = await subprojectRegistry.resolveProjectContext();

    const run = await runtime.initRun({
      definition,
      project,
      providerCount: 2,
      mcpServerCount: 1,
    });

    const progressed = await runtime.runUntilBlocked(run.id, {
      reviewReport: reviewCommittee.buildReportForRun({ runId: run.id, artifactCount: 6 }),
    });
    const multimodalStage = progressed.stages.find((stage) => stage.id === 'frontend-page');
    const events = await engine.loadEvents(run.id);
    const multimodalArtifacts = multimodalStage?.outputPaths ?? [];

    expect(multimodalStage?.status).toBe('blocked');
    expect(multimodalArtifacts).toContain(`docs/multimodal/${run.id}.md`);
    expect(multimodalArtifacts).toContain(`docs/multimodal/${run.id}.json`);
    expect(events.some((event) => event.kind === 'provider_failed')).toBe(true);

    const manifest = await store.read(`docs/multimodal/${run.id}.json`);
    expect(manifest).toContain('"providerName": "gemini"');
    expect(manifest).toContain('"providerType": "ai-studio"');
    expect(manifest).toContain('"status": "error"');
  });

  it('isolates run outputs under subproject paths', async () => {
    const store = createStore();
    await seedFixture(store);

    const memoryService = new MemoryService(store);
    const engine = new WorkflowEngine(store, memoryService);
    const runtime = new OrchestratorRuntime(store, memoryService);
    const subprojectRegistry = new SubprojectRegistry(store);
    await subprojectRegistry.createSubproject({ id: 'crm', name: 'CRM' });
    const project = await subprojectRegistry.resolveProjectContext('crm');
    const definition = await engine.loadDefinition(project.projectRoot);

    const run = await runtime.initRun({
      definition,
      project,
      providerCount: 1,
      mcpServerCount: 1,
    });
    const updated = await runtime.advanceRun(run.id);
    const artifactPath = updated.stages[0]?.outputPaths[0] ?? '';

    expect(run.subprojectId).toBe('crm');
    expect(run.projectRoot).toBe('subprojects/crm');
    expect(artifactPath).toContain('subprojects/crm/docs/research/');
    expect(await store.exists(`subprojects/crm/docs/memory/runs/${run.id}.json`)).toBe(true);
    expect(await store.exists(`subprojects/crm/docs/memory/events/${run.id}.jsonl`)).toBe(true);
  });

  it('enters needs-rework when review gate blocks', async () => {
    const store = createStore();
    await seedRuntimeFixture(store);

    const memoryService = new MemoryService(store);
    const engine = new WorkflowEngine(store, memoryService);
    const runtime = new OrchestratorRuntime(store, memoryService);
    const definition = await engine.loadDefinition();
    const reviewCommittee = new ReviewCommittee();
    const subprojectRegistry = new SubprojectRegistry(store);
    const project = await subprojectRegistry.resolveProjectContext();

    const run = await runtime.initRun({
      definition,
      project,
      providerCount: 1,
      mcpServerCount: 1,
    });

    const progressed = await runtime.runUntilBlocked(run.id, {
      reviewReport: reviewCommittee.buildReportForRun({ runId: run.id, artifactCount: 4 }),
    });

    expect(progressed.status).toBe('needs-rework');
    expect(progressed.currentStageId).toBe('backend-api');
    expect(progressed.rework?.targetStageId).toBe('backend-api');
    expect(progressed.lastReview).toContain('评审');

    const reviewStage = progressed.stages.find((stage) => stage.id === 'frontend-backend-integration');
    const targetStage = progressed.stages.find((stage) => stage.id === 'backend-api');
    const requirements = await memoryService.listRequirements();
    expect(reviewStage?.status).toBe('pending');
    expect(targetStage?.status).toBe('blocked');
    expect(requirements.some((requirement) => requirement.source.kind === 'acceptance-review')).toBe(true);
    expect(requirements.some((requirement) => requirement.source.kind === 'runtime-gate-event')).toBe(true);
  });

  it('supports manual gate decisions and blocked run resume', async () => {
    const store = createStore();
    await seedRuntimeFixture(store);

    const memoryService = new MemoryService(store);
    const engine = new WorkflowEngine(store, memoryService);
    const runtime = new OrchestratorRuntime(store, memoryService);
    const definition = await engine.loadDefinition();
    const subprojectRegistry = new SubprojectRegistry(store);
    const project = await subprojectRegistry.resolveProjectContext();

    const run = await runtime.initRun({
      definition,
      project,
      providerCount: 1,
      mcpServerCount: 1,
    });

    const completed = await runtime.runUntilBlocked(run.id);
    expect(completed.status).toBe('completed');

    const reworked = await runtime.applyManualGateDecision(completed.id, {
      decision: 'rework',
      summary: 'Need operator rework on backend api',
      targetStageId: 'backend-api',
    });
    expect(reworked.status).toBe('needs-rework');
    expect(reworked.rework?.targetStageId).toBe('backend-api');

    const resumed = await runtime.resumeRun(reworked.id, {
      targetStageId: 'backend-api',
      reason: 'Operator fixed contract drift offline',
    });
    const resumedStage = resumed.stages.find((stage) => stage.id === 'backend-api');
    const events = await engine.loadEvents(resumed.id);

    expect(resumed.status).toBe('running');
    expect(resumed.currentStageId).toBe('backend-api');
    expect(resumedStage?.status).toBe('active');
    expect(events.some((event) => event.kind === 'stage_resumed')).toBe(true);
  });
});

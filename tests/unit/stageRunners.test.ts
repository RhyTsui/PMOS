import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FileStore } from '../../src/core/fileStore';
import { MemoryService } from '../../src/core/memoryService';
import { StageRunners } from '../../src/core/stageRunners';
import type { WorkflowRun, WorkflowStageRun, WorkflowTask } from '../../src/shared/schemas';

function createFrontendStage(): WorkflowStageRun {
  return {
    id: 'frontend-page',
    label: '前端页面',
    ownerRole: 'frontend',
    description: '产出交付级前端页面',
    acceptanceCriteria: ['产出前端页面与浏览器验证'],
    requiredOutputs: [],
    priority: 'P0',
    capability: 'multimodal',
    dependsOn: ['design-document'],
    gate: {
      reviewRequired: false,
      allowRework: true,
    },
    status: 'active',
    outputPaths: [],
    startedAt: new Date().toISOString(),
    completedAt: null,
    blockedReason: null,
    attemptCount: 1,
    summary: null,
    metadata: {},
  };
}

function createWorkflowTask(): WorkflowTask {
  return {
    id: 'task-frontend',
    runId: 'run-stage-runners',
    stageId: 'frontend-page',
    title: '交付前端页面',
    description: '实现交付级前端页面',
    ownerRole: 'frontend',
    priority: 'P0',
    dependsOn: [],
    status: 'active',
    acceptanceCriteria: ['通过浏览器验证'],
    artifactPaths: [],
    blockedReason: null,
    summary: null,
    metadata: {},
  };
}

function createWorkflowRun(stage: WorkflowStageRun, task: WorkflowTask): WorkflowRun {
  const now = new Date().toISOString();
  return {
    id: 'run-stage-runners',
    subprojectId: 'ad',
    projectName: 'ad',
    projectRoot: 'subprojects/ad',
    selectedProvider: null,
    providerConfigPath: null,
    mcpConfigPath: null,
    name: 'ad frontend-page run',
    status: 'running',
    currentStageId: stage.id,
    stages: [stage],
    tasks: [task],
    generatedAt: now,
    updatedAt: now,
    memory: {
      projectMemoryPath: 'docs/memory/project-memory.md',
      runStatePath: 'docs/memory/workflow-runs/run-stage-runners.json',
      eventLogPath: 'docs/memory/workflow-events/run-stage-runners.jsonl',
      projectRoot: 'subprojects/ad',
      loadedAt: now,
    },
    providerCount: 0,
    mcpServerCount: 0,
    reworkCount: 0,
    executionSummary: null,
    lastReview: null,
    activeCapability: 'multimodal',
    rework: null,
    metadata: {},
  };
}

function createRequirementsStage(): WorkflowStageRun {
  return {
    id: 'requirements-document',
    label: '需求文档',
    ownerRole: 'requirements',
    description: '产出结构化需求包',
    acceptanceCriteria: ['完成需求拆解与评审'],
    requiredOutputs: [],
    priority: 'P0',
    capability: 'text',
    dependsOn: ['planning-document'],
    gate: {
      reviewRequired: true,
      allowRework: true,
    },
    status: 'active',
    outputPaths: [],
    startedAt: new Date().toISOString(),
    completedAt: null,
    blockedReason: null,
    attemptCount: 1,
    summary: null,
    metadata: {},
  };
}

function createRequirementsTask(): WorkflowTask {
  return {
    id: 'task-requirements',
    runId: 'run-stage-runners',
    stageId: 'requirements-document',
    title: '需求评审包',
    description: '实现需求评审与拆解产物',
    ownerRole: 'requirements',
    priority: 'P0',
    dependsOn: [],
    status: 'active',
    acceptanceCriteria: ['通过需求评审'],
    artifactPaths: [],
    blockedReason: null,
    summary: null,
    metadata: {
      reviewRequired: true,
    },
  };
}

describe('StageRunners', () => {
  it('builds frontend-browser-verification artifact from existing stage outputs', async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'ai-os-stage-runners-'));
    fs.mkdirSync(path.join(root, 'docs', 'multimodal'), { recursive: true });
    fs.mkdirSync(path.join(root, 'subprojects', 'ad', 'frontend', 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(root, 'docs', 'multimodal', 'ui-schema-contract.json'),
      JSON.stringify({
        pageContracts: [
          {
            classification: 'production',
            blocks: [{ blockId: 'overview' }, { blockId: 'chat' }],
            actions: [{ actionId: 'submit' }],
            states: [{ kind: 'default' }, { kind: 'loading' }, { kind: 'empty' }],
          },
        ],
      }),
      'utf8',
    );
    fs.writeFileSync(
      path.join(root, 'subprojects', 'ad', 'frontend', 'src', 'App.jsx'),
      'export function App(){ return <section className="enterprise-shell"><div className="results-panel">submit loading empty</div></section>; }',
      'utf8',
    );

    const store = new FileStore(root);
    const memoryService = new MemoryService(store);
    const stageRunners = new StageRunners(store, memoryService);
    const stage = createFrontendStage();
    const task = createWorkflowTask();
    const run = createWorkflowRun(stage, task);

    const content = await stageRunners.buildArtifactContent({
      run,
      stage,
      artifactPath: 'docs/review/frontend-browser-verification-run-stage-runners.json',
      artifactKind: 'json',
      reviewReport: null,
      existingOutputPaths: [
        'docs/multimodal/ui-schema-contract.json',
        'subprojects/ad/frontend/src/App.jsx',
      ],
    });

    const report = JSON.parse(content) as {
      applicable: boolean;
      status: string;
      checks: Array<{ id: string; status: string }>;
      artifactPath: string;
    };

    expect(report.applicable).toBe(true);
    expect(report.artifactPath).toContain('frontend-browser-verification');
    expect(report.status).not.toBe('not-applicable');
    expect(report.checks.some((check) => check.id === 'page-contract-coverage')).toBe(true);
  });

  it('blocks fallback review output for review-required stages without a real committee report', async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'ai-os-stage-runners-review-'));
    const repoStore = new FileStore(path.resolve(process.cwd()));
    fs.mkdirSync(path.join(root, 'skills'), { recursive: true });
    fs.mkdirSync(path.join(root, 'subprojects', 'ad'), { recursive: true });
    fs.writeFileSync(
      path.join(root, 'skills', 'registry.json'),
      await repoStore.read('skills/registry.json'),
      'utf8',
    );
    fs.writeFileSync(
      path.join(root, 'subprojects', 'ad', 'subproject.json'),
      JSON.stringify(
        {
          id: 'ad',
          name: 'ad',
          description: 'ad test fixture',
          status: 'active',
          createdAt: new Date().toISOString(),
          defaultWorkflow: 'pmaios-main',
          rootPath: 'subprojects/ad',
          memoryPath: 'subprojects/ad/docs/memory/project-memory.md',
          path: 'subprojects/ad',
          skillsConfigPath: 'skills/registry.json',
          overrides: {
            skillConfigPath: 'skills/registry.json',
          },
        },
        null,
        2,
      ),
      'utf8',
    );
    const store = new FileStore(root);
    const memoryService = new MemoryService(store);
    const stageRunners = new StageRunners(store, memoryService);
    const stage = createRequirementsStage();
    const task = createRequirementsTask();
    const run = createWorkflowRun(stage, task);

    const content = await stageRunners.buildArtifactContent({
      run,
      stage,
      artifactPath: 'docs/review/requirements-run-stage-runners.json',
      artifactKind: 'json',
      reviewReport: null,
      existingOutputPaths: [],
    });

    const report = JSON.parse(content) as {
      gate: { blocked: boolean; decision: string };
      activationTrace: Array<{ role: string; status: string }>;
      recommendedReworkStageId: string | null;
    };

    expect(report.gate.blocked).toBe(true);
    expect(report.gate.decision).toBe('conditional');
    expect(report.recommendedReworkStageId).toBe('requirements-document');
    expect(report.activationTrace.some((item) => item.role === 'Solution-Optimality Review' && item.status === 'missing')).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import { FileStore } from '../../src/core/fileStore';
import { MemoryService } from '../../src/core/memoryService';
import { RequirementService } from '../../src/core/requirementService';
import { WorkflowEngine } from '../../src/core/workflowEngine';
import { OrchestratorRuntime } from '../../src/core/orchestratorRuntime';
import { HermesPolicyService } from '../../src/core/hermesPolicyService';

function createStore() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'ai-os-hermes-'));
  return new FileStore(root);
}

async function seedFixture(store: FileStore) {
  const repoStore = new FileStore(path.resolve(process.cwd()));
  const memoryService = new MemoryService(store);
  const requirementService = new RequirementService(memoryService);

  await store.write('docs/memory/project-memory.md', '# Project Memory\n');
  await store.write(
    'skills/registry.json',
    JSON.stringify(
      {
        version: 'test',
        skills: [
          {
            id: 'design-language-md',
            name: 'Design Language MD',
            category: 'design',
            description: 'Project design language baseline.',
            ownerRole: 'Experience Design Agent',
            promptPath: 'skills/design-language-md/SKILL.md',
            stageIds: ['ui'],
            outputs: ['DESIGN.md'],
            enabled: true,
            triggerKeywords: ['design language', 'design.md'],
            tool: 'codex-skill',
            deployment: {
              status: 'manual',
              command: null,
              statusPath: 'docs/operations/design-language-object-and-skill.md',
              integration: 'repo-skill',
              notes: null,
            },
          },
        ],
      },
      null,
      2,
    ),
  );
  await store.write(
    'docs/context/project/ui-feedback.md',
    [
      '# UI Feedback',
      'Keep overflow inside the local table container.',
      'design-language-md should affect the output.',
      'Reuse validated YokaUI components by default.',
    ].join('\n'),
  );
  await store.write(
    'docs/design/component-reuse.md',
    [
      '# Component Reuse',
      'YokaUI component mapping is the default.',
      'Reuse filter bar, cards, table, and drawer patterns.',
      'Component reuse must become the stable default.',
    ].join('\n'),
  );
  await store.write('skills/design-language-md/SKILL.md', '# Design Language MD\n');
  await store.write('docs/operations/uiux-stack-baseline.md', await repoStore.read('docs/operations/uiux-stack-baseline.md'));
  await store.write(
    'docs/operations/prd-and-design-two-step-governance.md',
    await repoStore.read('docs/operations/prd-and-design-two-step-governance.md'),
  );
  await store.write(
    'docs/operations/pmaios-v0.6-kernel-architecture.md',
    await repoStore.read('docs/operations/pmaios-v0.6-kernel-architecture.md'),
  );
  await store.write(
    'docs/operations/gate-runtime-traceability-deepening-2026-05-06.md',
    await repoStore.read('docs/operations/gate-runtime-traceability-deepening-2026-05-06.md'),
  );
  await store.write(
    'docs/operations/confirmation-chain-object-and-gate.md',
    await repoStore.read('docs/operations/confirmation-chain-object-and-gate.md'),
  );
  await store.write(
    'docs/operations/design-language-object-and-skill.md',
    await repoStore.read('docs/operations/design-language-object-and-skill.md'),
  );
  await store.write(
    'docs/operations/v0.7-p0-execution-definition-stage-agent-ui-spec-repeat-correction.md',
    await repoStore.read('docs/operations/v0.7-p0-execution-definition-stage-agent-ui-spec-repeat-correction.md'),
  );
  await store.write(
    'docs/operations/requirement-pool-object-and-desk.md',
    await repoStore.read('docs/operations/requirement-pool-object-and-desk.md'),
  );
  await store.write(
    'docs/operations/hermes-global-optimization-architecture.md',
    await repoStore.read('docs/operations/hermes-global-optimization-architecture.md'),
  );
  await store.write(
    'workflows/product-management.md',
    await repoStore.read('workflows/product-management.md'),
  );
  await store.write(
    'prompts/product-management/virtual_workflow_pm_prompt.md',
    await repoStore.read('prompts/product-management/virtual_workflow_pm_prompt.md'),
  );
  await store.write(
    'docs/memory/retrieval/governance.json',
    JSON.stringify(
      {
        subprojectId: null,
        mode: 'local-only',
        remoteUrl: null,
        collectionName: 'platform',
        topK: 5,
        indexingEnabled: true,
        qualityGate: {
          minChunkCount: 1,
          minScore: 0.1,
          requireTruthSources: true,
        },
        lastIndexedAt: new Date().toISOString(),
        lastIndexedChunkCount: 2,
        updatedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  await requirementService.createRequirement({
    title: '[Hermes重复纠正] local scroll rule',
    description: 'Promoted from repeat correction candidate.',
    category: 'architecture',
    priority: 'P0',
    metadata: {
      lifecycle: 'normalized',
      poolScope: 'platform',
      repeatCorrectionCandidateId: 'project-local-scroll-first',
    },
  });
  await requirementService.createRequirement({
    title: '[Hermes重复纠正] component reuse rule',
    description: 'Promoted from repeat correction candidate.',
    category: 'architecture',
    priority: 'P0',
    metadata: {
      lifecycle: 'normalized',
      poolScope: 'platform',
      repeatCorrectionCandidateId: 'project-component-reuse-first',
    },
  });
  await store.write('docs/product-office/multi-agent-reviews/review-1.md', '# Multi-Agent Review Loop\nUsable for continuation.\n');
  await store.writeJson('docs/memory/product-chief/multi-agent-reviews/review-1.json', {
    id: 'review-1',
    reportId: 'report-1',
    outputId: 'output-1',
    subprojectId: null,
    mode: 'deterministic-multi-agent-review',
    status: 'pass',
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    participantTaskIds: ['task-a', 'task-b'],
    artifactPath: 'docs/product-office/multi-agent-reviews/review-1.md',
    consensus: 'Multi-agent review concluded that the output is usable.',
    turns: [],
    conflicts: [],
    stopConditions: [],
    requirementIds: [],
    metadata: {
      projectPmUsable: true,
    },
  });
}

describe('HermesPolicyService', () => {
  it('mounts Hermes as enhance-only policy without taking control of workflow routing', async () => {
    const originalEnv = {
      baseUrl: process.env.DATAKI_BASE_URL,
      apiKey: process.env.DATAKI_API_KEY,
      userId: process.env.DATAKI_USER_ID,
      knowledgeBaseId: process.env.DATAKI_KNOWLEDGE_BASE_ID,
    };
    process.env.DATAKI_BASE_URL = 'https://dataki.example.com/api/v1';
    process.env.DATAKI_API_KEY = 'test-key';
    process.env.DATAKI_USER_ID = 'user-1';
    process.env.DATAKI_KNOWLEDGE_BASE_ID = 'kb-platform';

    const store = createStore();
    try {
      await seedFixture(store);
      const memoryService = new MemoryService(store);
      const requirementService = new RequirementService(memoryService);
      const workflowEngine = new WorkflowEngine(store, memoryService);
      const runtime = new OrchestratorRuntime(store, memoryService);
      const hermes = new HermesPolicyService(store, memoryService, {
        searchKnowledge: async () => [
          {
            id: 'search-1',
            content: '系统现状显示当前版本需求和运行时治理都挂在版本库知识库里。',
            knowledgeId: 'knowledge-1',
            knowledgeTitle: '版本库 / 当前系统现状',
            knowledgeFilename: 'current-state.md',
            knowledgeSource: 'dataki',
            chunkType: 'text',
            score: 0.92,
          },
        ],
      } as never);
      const definition = await workflowEngine.loadDefinition();
      const run = await runtime.initRun({
        definition,
        project: {
          subprojectId: null,
          projectName: 'Hermes Fixture',
          projectDescription: null,
          projectRoot: '',
          projectMemoryPath: 'docs/memory/project-memory.md',
          selectedProvider: null,
          providerConfigPath: null,
          mcpConfigPath: null,
        },
        providerCount: 1,
        mcpServerCount: 1,
      });

      const report = await hermes.evaluateRun(run);
      const requirements = await requirementService.listRequirements();

      expect(report.mode).toBe('enhance-only');
      expect(report.guardrails.canRoute).toBe(false);
      expect(report.guardrails.canPlan).toBe(false);
      expect(report.guardrails.canModifyDag).toBe(false);
      expect(report.guardrails.canBlockWorkflow).toBe(false);
      expect(report.checks.some((check) => check.id === 'enhance-only-guardrail' && check.status === 'pass')).toBe(true);
      expect(report.checks.some((check) => check.id === 'review-gate-presence' && check.status === 'pass')).toBe(true);
      expect(report.checks.some((check) => check.id === 'repeat-correction-promotion' && check.status === 'pass')).toBe(true);
      expect(report.checks.some((check) => check.id === 'multi-agent-review-loop' && check.status === 'pass')).toBe(true);
      expect(report.checks.some((check) => check.id === 'skill-effectiveness' && check.status === 'pass')).toBe(true);
      expect(report.checks.some((check) => check.id === 'design-tool-effectiveness' && check.status === 'pass')).toBe(true);
      expect(report.checks.some((check) => check.id === 'component-reuse-memory' && check.status === 'pass')).toBe(true);
      expect(report.checks.some((check) => check.id === 'knowledge-source-context' && check.status === 'pass')).toBe(true);
      expect(report.comparisons.some((comparison) => comparison.id === 'gate-traceability-mainline' && comparison.decision === 'promote')).toBe(true);
      expect(report.comparisons.some((comparison) => comparison.id === 'design-governance-baseline' && comparison.decision === 'promote')).toBe(true);
      expect(report.comparisons.some((comparison) => comparison.id === 'stage-agent-default-switching' && comparison.decision === 'replace')).toBe(true);
      expect(report.comparisons.some((comparison) => comparison.id === 'repeat-correction-default' && (comparison.decision === 'replace' || comparison.decision === 'promote'))).toBe(true);
      expect(report.comparisons.some((comparison) => comparison.id === 'hermes-hard-control' && comparison.decision === 'reject')).toBe(true);
      expect(report.comparisons.some((comparison) => comparison.id === 'autonomous-external-research-executor' && comparison.decision === 'park')).toBe(true);
      expect(report.promotions.some((promotion) => promotion.action === 'replace')).toBe(true);
      expect(report.promotions.some((promotion) => promotion.action === 'reject')).toBe(true);
      expect(report.promotions.some((promotion) => promotion.action === 'park')).toBe(true);
      expect(report.researchFindings.some((finding) => finding.id === 'research-executor-candidate' && finding.status === 'parked')).toBe(true);
      expect(report.researchFindings.some((finding) => finding.id === 'research-system-state-knowledge' && finding.status === 'promoted')).toBe(true);
      expect(report.researchFindings.some((finding) => finding.id === 'research-system-state-search' && finding.status === 'promoted' && finding.resultCount === 1)).toBe(true);
      expect(report.researchFindings.find((finding) => finding.id === 'research-system-state-search')?.query).toContain('Hermes Fixture');
      expect(report.researchFindings.find((finding) => finding.id === 'research-system-state-search')?.excerpts[0]?.knowledgeTitle).toBe('版本库 / 当前系统现状');
      expect(report.watchFindings.some((finding) => finding.id === 'watch-comparison-hermes-hard-control' && finding.status === 'resolved')).toBe(true);
      expect(
        report.watchFindings.every(
          (finding) =>
            finding.recurrenceCount >= 1
            && finding.stableRunCount >= 1
            && typeof finding.noiseSuppressed === 'boolean'
            && finding.lastSeenAt !== null,
        ),
      ).toBe(true);
      expect(
        report.watchFindings.some(
          (finding) =>
            finding.id.startsWith('watch-check-') &&
            Boolean(finding.taskRequirementId) &&
            finding.nextActionType === 'rectify',
        ),
      ).toBe(true);
      expect(report.autoPromotions.some((promotion) => promotion.status === 'created')).toBe(true);
      expect(
        report.autoPromotions.some(
          (promotion) =>
            promotion.comparisonId === 'stage-agent-default-switching' &&
            promotion.writebackTargets.length > 0 &&
            promotion.writebackTargets.some((target) => Boolean(target.taskRequirementId)),
        ),
      ).toBe(true);
      expect(requirements.some((requirement) => requirement.metadata?.hermesComparisonId === 'stage-agent-default-switching')).toBe(true);
      expect(requirements.some((requirement) => requirement.metadata?.hermesAutoPromotion === true)).toBe(true);
      expect(
        requirements.some(
          (requirement) =>
            typeof requirement.metadata?.hermesWatchFindingId === 'string' &&
            requirement.metadata.hermesWatchFindingId.startsWith('watch-check-'),
        ),
      ).toBe(true);
      expect(
        requirements.some(
          (requirement) => requirement.metadata?.autoCaptureEventKind === 'hermes-writeback-task',
        ),
      ).toBe(true);

      const executeWritebackResult = await hermes.executeWritebackForRun(run);
      expect(executeWritebackResult.executedWritebackTargetCount).toBeGreaterThan(0);
      expect(executeWritebackResult.closedWritebackTaskCount).toBeGreaterThan(0);
      expect(await store.read('workflows/product-management.md')).toContain('## Hermes Governed Writeback');
      expect(await store.read('prompts/product-management/virtual_workflow_pm_prompt.md')).toContain('## Hermes Governed Writeback');
      expect(
        executeWritebackResult.report.autoPromotions.some(
          (promotion) =>
            promotion.comparisonId === 'stage-agent-default-switching'
            && promotion.writebackTargets.length > 0
            && promotion.writebackTargets.some(
              (target) => target.status === 'completed' && target.closureEvidencePaths.length > 0,
            ),
        ),
      ).toBe(true);
      expect(
        executeWritebackResult.report.watchFindings.some(
          (finding) =>
            finding.id === 'watch-promotion-stage-agent-default-switching' &&
            finding.closureEvidencePaths.length > 0,
        ),
      ).toBe(true);

      const reports = await hermes.listReports();
      expect(reports[0]?.runId).toBe(run.id);
    } finally {
      process.env.DATAKI_BASE_URL = originalEnv.baseUrl;
      process.env.DATAKI_API_KEY = originalEnv.apiKey;
      process.env.DATAKI_USER_ID = originalEnv.userId;
      process.env.DATAKI_KNOWLEDGE_BASE_ID = originalEnv.knowledgeBaseId;
    }
  });

  it('tracks Hermes watch recurrence across runs and suppresses repeated low-signal noise', async () => {
    const store = createStore();
    await seedFixture(store);
    const memoryService = new MemoryService(store);
    const workflowEngine = new WorkflowEngine(store, memoryService);
    const runtime = new OrchestratorRuntime(store, memoryService);
    const hermes = new HermesPolicyService(store, memoryService);
    const definition = await workflowEngine.loadDefinition();

    const firstRun = await runtime.initRun({
      definition,
      project: {
        subprojectId: null,
        projectName: 'Hermes Recurrence A',
        projectDescription: null,
        projectRoot: '',
        projectMemoryPath: 'docs/memory/project-memory.md',
        selectedProvider: null,
        providerConfigPath: null,
        mcpConfigPath: null,
      },
      providerCount: 1,
      mcpServerCount: 1,
    });
    firstRun.id = `${firstRun.id}-a`;
    const firstReport = await hermes.evaluateRun(firstRun);
    const firstPromotionWatch = firstReport.watchFindings.find(
      (finding) => finding.id === 'watch-promotion-stage-agent-default-switching',
    );

    const secondRun = await runtime.initRun({
      definition,
      project: {
        subprojectId: null,
        projectName: 'Hermes Recurrence B',
        projectDescription: null,
        projectRoot: '',
        projectMemoryPath: 'docs/memory/project-memory.md',
        selectedProvider: null,
        providerConfigPath: null,
        mcpConfigPath: null,
      },
      providerCount: 1,
      mcpServerCount: 1,
    });
    secondRun.id = `${secondRun.id}-b`;
    const secondReport = await hermes.evaluateRun(secondRun);
    const secondPromotionWatch = secondReport.watchFindings.find(
      (finding) => finding.id === 'watch-promotion-stage-agent-default-switching',
    );

    expect(firstPromotionWatch).toBeTruthy();
    expect(firstPromotionWatch?.recurrenceCount).toBe(1);
    expect(firstPromotionWatch?.stableRunCount).toBe(1);
    expect(firstPromotionWatch?.noiseSuppressed).toBe(false);

    expect(secondPromotionWatch).toBeTruthy();
    expect(secondPromotionWatch?.recurrenceCount).toBe(2);
    expect(secondPromotionWatch?.stableRunCount).toBe(2);
    expect(secondPromotionWatch?.noiseSuppressed).toBe(true);
    expect(secondPromotionWatch?.noiseReason).toContain('Recurring active Hermes watch item');
    expect(secondPromotionWatch?.firstSeenAt).toBe(firstPromotionWatch?.lastSeenAt);
    expect(secondPromotionWatch?.carriedFromReportId).toBe(firstReport.id);
  });
});

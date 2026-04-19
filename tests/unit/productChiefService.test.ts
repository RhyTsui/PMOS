import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import { FileStore } from '../../src/core/fileStore';
import { MemoryService } from '../../src/core/memoryService';
import { ProductChiefService } from '../../src/core/productChiefService';

function createStore() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'ai-os-product-chief-'));
  return new FileStore(root);
}

async function createFixture() {
  const store = createStore();
  const repoStore = new FileStore('E:/AI/ai-os');
  await store.write('docs/memory/project-memory.md', '# Project Memory\n');
  await store.write('workflows/main.md', '# Workflow\n');
  await store.write('workflows/execution.md', '# Execution\n');
  await store.write('docs/memory/global-rules.md', '# Rules\n');
  await store.write('docs/context/project/overview.md', '# Project Context\nNeed AI Product Office operating model.\n');
  await store.write('config/product-management/agent-blueprints.json', await repoStore.read('config/product-management/agent-blueprints.json'));
  return {
    store,
    productChiefService: new ProductChiefService(store),
  };
}

describe('ProductChiefService', () => {
  it('creates an auditable Product Chief report with questions, learning guidance, and specialist engagement', async () => {
    const { store, productChiefService } = await createFixture();
    await store.writeJson('docs/memory/hermes/reports/hermes-policy-run-1.json', {
      id: 'hermes-policy-run-1',
      runId: 'run-1',
      subprojectId: null,
      generatedAt: new Date().toISOString(),
      mode: 'enhance-only',
      status: 'warn',
      checks: [],
      enhancements: [
        {
          id: 'enhance-1',
          stageId: null,
          priority: 'P1',
          summary: 'Use Hermes signal in product output generation.',
          rationale: 'Keeps policy context visible.',
        },
      ],
      guardrails: {
        canRoute: false,
        canPlan: false,
        canModifyDag: false,
        canBlockWorkflow: false,
      },
      metadata: {},
    });

    const report = await productChiefService.analyze({
      brief: 'Build a schema-driven UI workflow for PMAIOS v0.6',
    });

    expect(report.missingQuestions.some((question) => question.topic === 'target-users')).toBe(true);
    expect(report.missingQuestions.some((question) => question.topic === 'success-metrics')).toBe(true);
    expect(report.learningGuidance.some((guidance) => guidance.title.includes('schema-first'))).toBe(true);
    expect(report.requiredGovernedOutputs.some((output) => output.type === 'ui-schema-spec' && output.priority === 'P0')).toBe(true);
    expect(report.requiredGovernedOutputs.some((output) => output.type === 'ecosystem-scan' && output.priority === 'P0')).toBe(true);
    expect(report.requiredGovernedOutputs.some((output) => output.type === 'strategic-radar' && output.priority === 'P1')).toBe(true);
    expect(report.requiredGovernedOutputs.some((output) => output.type === 'roadmap' && output.priority === 'P1')).toBe(true);
    expect(report.requiredGovernedOutputs.some((output) => output.type === 'weekly-product-brief' && output.priority === 'P1')).toBe(true);
    expect(report.requiredGovernedOutputs.some((output) => output.type === 'learning-upgrade-memo' && output.priority === 'P1')).toBe(true);
    expect(report.requiredGovernedOutputs.some((output) => output.type === 'user-manual' && output.priority === 'P1')).toBe(true);
    expect(report.requiredGovernedOutputs.some((output) => output.type === 'external-capability-evaluation' && output.priority === 'P2')).toBe(true);
    expect(report.engagedSpecialists.length).toBeGreaterThan(0);

    const ecosystemScan = await productChiefService.generateGovernedOutput({
      reportId: report.id,
      type: 'ecosystem-scan',
    });
    const uiSchema = await productChiefService.generateGovernedOutput({
      reportId: report.id,
      type: 'ui-schema-spec',
    });
    const versionPlan = await productChiefService.generateGovernedOutput({
      reportId: report.id,
      type: 'version-plan',
    });
    const weeklyBrief = await productChiefService.generateGovernedOutput({
      reportId: report.id,
      type: 'weekly-product-brief',
    });
    const userManual = await productChiefService.generateGovernedOutput({
      reportId: report.id,
      type: 'user-manual',
    });
    const outputs = await productChiefService.listOutputs();

    expect(ecosystemScan.artifactPath).toContain('docs/product-office/outputs/');
    expect(await store.read(ecosystemScan.artifactPath)).toContain('adopt');
    expect(await store.read(uiSchema.artifactPath)).toContain('Schema-Driven UI / Business Blocks');
    expect(await store.read(versionPlan.artifactPath)).toContain('Requirement Inputs');
    expect(await store.read(versionPlan.artifactPath)).toContain('Version Trace Inputs');
    expect(await store.read(versionPlan.artifactPath)).toContain('Hermes Policy Signals');
    expect(await store.read(weeklyBrief.artifactPath)).toContain('Executive Signal');
    expect(await store.read(weeklyBrief.artifactPath)).toContain('Requirement Watchlist');
    expect(await store.read(userManual.artifactPath)).toContain('Walkthrough Flow');
    expect(await store.read(userManual.artifactPath)).toContain('User-Facing Instructions');
    expect(outputs).toHaveLength(5);
    expect(ecosystemScan.requirementIds).toHaveLength(1);
    expect(ecosystemScan.versionEntryId).toMatch(/^ver-/u);
    expect(ecosystemScan.specialistTaskIds.length).toBeGreaterThan(0);
    expect(ecosystemScan.specialistTaskArtifactPaths.length).toBe(ecosystemScan.specialistTaskIds.length);
    expect(ecosystemScan.multiAgentReviewId).toMatch(/^product-chief-review-/u);
    expect(['pass', 'needs-human-decision', 'blocked']).toContain(ecosystemScan.multiAgentReviewStatus);
    expect(ecosystemScan.multiAgentReviewArtifactPath).toContain('docs/product-office/multi-agent-reviews/');

    const memoryService = new MemoryService(store);
    const outputRequirement = await memoryService.loadRequirement(ecosystemScan.requirementIds[0]!);
    const outputVersion = await memoryService.loadVersionEntry(ecosystemScan.versionEntryId!);
    const specialistTasks = await productChiefService.listSpecialistTasks();
    const multiAgentReviews = await productChiefService.listMultiAgentReviews();
    expect(outputRequirement.source.kind).toBe('product-output');
    expect(outputRequirement.source.sourceRef?.entityId).toBe(report.id);
    expect(outputRequirement.source.sourceRef?.label).toBe(ecosystemScan.type);
    expect(outputRequirement.trace.linkedVersionIds).toContain(ecosystemScan.versionEntryId);
    expect(outputRequirement.trace.artifactPaths).toContain(ecosystemScan.specialistTaskArtifactPaths[0]);
    expect(outputVersion.entityType).toBe('product-output');
    expect(outputVersion.requirementIds).toContain(outputRequirement.id);
    expect(outputVersion.artifactPaths).toContain(ecosystemScan.artifactPath);
    expect(outputVersion.artifactPaths).toContain(ecosystemScan.specialistTaskArtifactPaths[0]);
    expect(outputVersion.artifactPaths).toContain(ecosystemScan.multiAgentReviewArtifactPath);
    expect(specialistTasks.some((task) => task.outputId === ecosystemScan.id)).toBe(true);
    expect(multiAgentReviews.some((review) => review.outputId === ecosystemScan.id)).toBe(true);
    expect(await store.read(ecosystemScan.specialistTaskArtifactPaths[0]!)).toContain('Independent Specialist Output');
    const reviewArtifact = await store.read(ecosystemScan.multiAgentReviewArtifactPath!);
    expect(reviewArtifact).toContain('Multi-Agent Review Loop');
    expect(reviewArtifact).toContain('Stop Conditions');
    expect(reviewArtifact).toContain('Final Decision');

    const reports = await productChiefService.listReports();
    expect(reports[0]?.id).toBe(report.id);
  });
});

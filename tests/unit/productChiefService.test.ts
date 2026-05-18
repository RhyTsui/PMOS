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
  const repoStore = new FileStore(path.resolve(process.cwd()));
  await store.write('docs/memory/project-memory.md', '# Project Memory\n');
  await store.write('workflows/main.md', '# Workflow\n');
  await store.write('workflows/execution.md', '# Execution\n');
  await store.write('docs/memory/global-rules.md', '# Rules\n');
  await store.write('docs/context/project/overview.md', '# Project Context\nNeed AI Product Office operating model.\n');
  await store.write('config/product-management/agent-blueprints.json', await repoStore.read('config/product-management/agent-blueprints.json'));
  await store.write('skills/registry.json', await repoStore.read('skills/registry.json'));
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
    expect(report.requiredGovernedOutputs.some((output) => output.type === 'implementation-handoff' && output.priority === 'P1')).toBe(true);
    expect(report.requiredGovernedOutputs.some((output) => output.type === 'ecosystem-scan' && output.priority === 'P0')).toBe(true);
    expect(report.requiredGovernedOutputs.some((output) => output.type === 'strategic-radar' && output.priority === 'P1')).toBe(true);
    expect(report.requiredGovernedOutputs.some((output) => output.type === 'roadmap' && output.priority === 'P1')).toBe(true);
    expect(report.requiredGovernedOutputs.some((output) => output.type === 'weekly-product-brief' && output.priority === 'P1')).toBe(true);
    expect(report.requiredGovernedOutputs.some((output) => output.type === 'learning-upgrade-memo' && output.priority === 'P1')).toBe(true);
    expect(report.requiredGovernedOutputs.some((output) => output.type === 'user-manual' && output.priority === 'P1')).toBe(true);
    expect(report.requiredGovernedOutputs.some((output) => output.type === 'external-capability-evaluation' && output.priority === 'P2')).toBe(true);
    expect(report.requiredGovernedOutputs.some((output) => output.type === 'architecture-decision-record' && output.priority === 'P0')).toBe(true);
    expect(report.requiredGovernedOutputs.some((output) => output.type === 'code-review-brief' && output.priority === 'P1')).toBe(true);
    expect(report.requiredGovernedOutputs.some((output) => output.type === 'historical-code-review-brief' && output.priority === 'P2')).toBe(true);
    expect(report.requiredGovernedOutputs.find((output) => output.type === 'architecture-decision-record')?.templatePath).toBe(
      'docs/templates/architecture_decision_record_template.md',
    );
    expect(report.requiredGovernedOutputs.find((output) => output.type === 'code-review-brief')?.templatePath).toBe(
      'docs/templates/code_review_brief_template.md',
    );
    expect(report.requiredGovernedOutputs.find((output) => output.type === 'historical-code-review-brief')?.templatePath).toBe(
      'docs/templates/historical_code_review_brief_template.md',
    );
    expect(report.engagedSpecialists.length).toBeGreaterThan(0);
    expect(report.recommendedSkills.map((skill) => skill.skillId)).toContain('pmos-architecture-designer');
    expect(report.recommendedSkills.map((skill) => skill.skillId)).toContain('pmos-code-review');
    expect(report.recommendedSkills.map((skill) => skill.skillId)).toContain('pmos-historical-code-review');
    expect(report.recommendedSkills.map((skill) => skill.skillId)).toContain('schema-driven-ui-design');
    expect(report.recommendedSkills.map((skill) => skill.skillId)).toContain('product-chief-manager-agent');
    expect(report.nextActions).toContain('Run pmos-architecture-designer before builder execution to lock boundaries, data ownership, and irreversible choices.');
    expect(report.nextActions).toContain('Run pmos-code-review after implementation and before testing acceptance; do not skip the incremental review lane.');
    expect(report.nextActions).toContain('If incremental review or delivery risk exposes legacy hotspots, run pmos-historical-code-review and convert old-code findings into a remediation queue instead of mixing them into the current diff review.');

    const ecosystemScan = await productChiefService.generateGovernedOutput({
      reportId: report.id,
      type: 'ecosystem-scan',
    });
    const uiSchema = await productChiefService.generateGovernedOutput({
      reportId: report.id,
      type: 'ui-schema-spec',
    });
    const architectureDecision = await productChiefService.generateGovernedOutput({
      reportId: report.id,
      type: 'architecture-decision-record',
    });
    const codeReviewBrief = await productChiefService.generateGovernedOutput({
      reportId: report.id,
      type: 'code-review-brief',
    });
    const historicalCodeReviewBrief = await productChiefService.generateGovernedOutput({
      reportId: report.id,
      type: 'historical-code-review-brief',
    });
    const implementationHandoff = await productChiefService.generateGovernedOutput({
      reportId: report.id,
      type: 'implementation-handoff',
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
    expect(await store.read(uiSchema.artifactPath)).toContain('Default frontend framework baseline: x.ant.design / Ant Design X ecosystem.');
    expect(await store.read(uiSchema.artifactPath)).toContain('Every production page must expose route, layout shell, target roles, data refs, and component bindings before coding starts.');
    expect(await store.read(architectureDecision.artifactPath)).toContain('## Architecture Decision Surface');
    expect(await store.read(architectureDecision.artifactPath)).toContain('owner skill: pmos-architecture-designer');
    expect(await store.read(codeReviewBrief.artifactPath)).toContain('## Review Scope Contract');
    expect(await store.read(codeReviewBrief.artifactPath)).toContain('review owner skill: pmos-code-review');
    expect(await store.read(historicalCodeReviewBrief.artifactPath)).toContain('## Historical Review Scope');
    expect(await store.read(historicalCodeReviewBrief.artifactPath)).toContain('review owner skill: pmos-historical-code-review');
    expect(historicalCodeReviewBrief.requirementIds.length).toBe(2);
    expect((historicalCodeReviewBrief.metadata.remediationRequirementIds as string[]).length).toBe(1);
    const implementationHandoffContent = await store.read(implementationHandoff.artifactPath);
    expect(implementationHandoffContent).toContain('frontend output type: final delivery page');
    expect(implementationHandoffContent).toContain('default frontend framework baseline: x.ant.design / Ant Design X ecosystem');
    expect(implementationHandoffContent).toContain('normal functional page baseline: Ant Design X ecosystem');
    expect(implementationHandoffContent).toContain('conversation / agent / reasoning region baseline: Ant Design X ecosystem');
    expect(implementationHandoffContent).toContain('run automated acceptance and repeated browser verification before operator review');
    expect(implementationHandoffContent).toContain('reviewLane default: pmos-code-review');
    expect(implementationHandoffContent).toContain('historicalReviewLane default follow-up: pmos-historical-code-review');
    expect(implementationHandoffContent).toContain('acceptanceLane default: pmos-testing-acceptance');
    expect(implementationHandoffContent).toContain('## PMOS Implementation Execution Packet');
    expect(implementationHandoffContent).toContain('## Default Governed Agent Skills');
    expect(implementationHandoffContent).toContain('architecture lane skill: pmos-architecture-designer');
    expect(implementationHandoffContent).toContain('review lane skill: pmos-code-review');
    expect(implementationHandoffContent).toContain('historical review lane skill: pmos-historical-code-review');
    expect(implementationHandoffContent).toContain('linked architecture decision record refs');
    expect(implementationHandoffContent).toContain('linked code review brief refs');
    expect(implementationHandoffContent).toContain('run pmos-architecture-designer and record architecture-ready boundary/tradeoff conclusions');
    expect(implementationHandoffContent).toContain('run pmos-code-review on the actual change set before testing acceptance begins');
    expect(implementationHandoffContent).toContain('run pmos-historical-code-review and capture remediation work separately from the current diff review');
    expect(implementationHandoffContent).toContain('requiredSkillSequence: pmos-architecture-designer -> implementationLane -> reviewLane -> acceptanceLane');
    expect(await store.read(uiSchema.artifactPath)).toContain('Recommended Skills');
    expect(uiSchema.metadata.recommendedSkillIds).toContain('schema-driven-ui-design');
    expect(implementationHandoff.metadata.recommendedSkillIds).toContain('pmos-architecture-designer');
    expect(implementationHandoff.metadata.recommendedSkillIds).toContain('pmos-code-review');
    expect(implementationHandoff.metadata.recommendedSkillIds).toContain('pmos-historical-code-review');
    expect(await store.read(versionPlan.artifactPath)).toContain('Requirement Inputs');
    expect(await store.read(versionPlan.artifactPath)).toContain('Version Trace Inputs');
    expect(await store.read(versionPlan.artifactPath)).toContain('Hermes Policy Signals');
    expect(await store.read(weeklyBrief.artifactPath)).toContain('Executive Signal');
    expect(await store.read(weeklyBrief.artifactPath)).toContain('Requirement Watchlist');
    expect(await store.read(userManual.artifactPath)).toContain('Walkthrough Flow');
    expect(await store.read(userManual.artifactPath)).toContain('User-Facing Instructions');
    expect(outputs.length).toBeGreaterThanOrEqual(5);
    expect(ecosystemScan.requirementIds).toHaveLength(1);
    expect(ecosystemScan.versionEntryId).toMatch(/^ver-/u);
    expect(ecosystemScan.specialistTaskIds.length).toBeGreaterThan(0);
    expect(ecosystemScan.specialistTaskArtifactPaths.length).toBe(ecosystemScan.specialistTaskIds.length);
    expect(ecosystemScan.multiAgentReviewId).toMatch(/^product-chief-review-/u);
    expect(['pass', 'needs-human-decision', 'blocked']).toContain(ecosystemScan.multiAgentReviewStatus);
    expect(ecosystemScan.multiAgentReviewArtifactPath).toContain('docs/product-office/multi-agent-reviews/');
    expect(implementationHandoff.implementationLane).toBe('pmos-fullstack-builder');
    expect(implementationHandoff.reviewLane).toBe('pmos-code-review');
    expect(implementationHandoff.historicalReviewLane).toBe('pmos-historical-code-review');
    expect(implementationHandoff.acceptanceLane).toBe('pmos-testing-acceptance');
    const implementationPacket = await store.readJson<{ requiredSkillSequence: string[]; optionalFollowUpLanes: string[] }>(
      implementationHandoff.metadata.implementationExecutionPacketPath as string,
    );
    expect(implementationPacket.requiredSkillSequence).toEqual([
      'pmos-architecture-designer',
      'pmos-fullstack-builder',
      'pmos-code-review',
      'pmos-testing-acceptance',
    ]);
    expect(implementationPacket.optionalFollowUpLanes).toContain('pmos-historical-code-review');

    const memoryService = new MemoryService(store);
    const outputRequirement = await memoryService.loadRequirement(ecosystemScan.requirementIds[0]!);
    const historicalReviewRequirement = await memoryService.loadRequirement(historicalCodeReviewBrief.requirementIds[0]!);
    const historicalRemediationRequirement = await memoryService.loadRequirement(historicalCodeReviewBrief.requirementIds[1]!);
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
    expect(historicalReviewRequirement.source.kind).toBe('product-output');
    expect(historicalReviewRequirement.metadata.outputType).toBe('historical-code-review-brief');
    expect(historicalRemediationRequirement.category).toBe('architecture');
    expect(historicalRemediationRequirement.metadata.backlogTarget).toBe('roadmap');
    expect(historicalRemediationRequirement.metadata.remediationQueue).toBe(true);
    expect(historicalRemediationRequirement.trace.relatedRequirementIds).toContain(historicalReviewRequirement.id);
    expect(historicalRemediationRequirement.trace.artifactPaths).toContain(historicalCodeReviewBrief.artifactPath);
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

  it('writes governed design change-set and diff-audit artifacts for patch-mode html directions', async () => {
    const { store, productChiefService } = await createFixture();
    const report = await productChiefService.analyze({
      brief: [
        'Build a schema-driven UI workflow for PMAIOS v0.7, then apply a controlled design patch to the existing operator surface.',
        '基于上一版埋点需求设计图做 patch，不要整图重画。',
        '1. 事件详情不要压缩默认页宽度，拆成独立详情页或明显分离的二级表面。',
        '2. 保留原有左侧导航、顶部搜索和主列表层级，不要顺手改其他区域。',
        '3. 默认继续产出低中高三种信息密度的独立方向稿，不要压成一张对比图。',
      ].join('\n'),
    });

    const htmlDirections = await productChiefService.generateGovernedOutput({
      reportId: report.id,
      type: 'html-direction-pack',
    });

    expect(typeof htmlDirections.metadata.designChangeSetPath).toBe('string');
    expect(typeof htmlDirections.metadata.designDiffAuditPath).toBe('string');
    expect(htmlDirections.metadata.requestedChangeCount).toBe(3);
    expect((htmlDirections.metadata.appliedChangeCount as number) + (htmlDirections.metadata.missedChangeCount as number)).toBe(3);

    const changeSet = await store.readJson<{ mode: string; items: Array<{ request: string }> }>(htmlDirections.metadata.designChangeSetPath as string);
    const diffAudit = await store.readJson<{ mode: string; appliedChangeIds: string[]; missedChangeIds: string[] }>(htmlDirections.metadata.designDiffAuditPath as string);

    expect(changeSet.mode).toBe('patch');
    expect(changeSet.items).toHaveLength(3);
    expect(changeSet.items[0]?.request).toContain('事件详情');
    expect(diffAudit.mode).toBe('patch');
    expect(diffAudit.appliedChangeIds.length + diffAudit.missedChangeIds.length).toBe(3);
    expect(await store.read(htmlDirections.artifactPath)).toContain('Design Change Set');
    expect(await store.read(htmlDirections.artifactPath)).toContain('Design Diff Audit');
  });
});

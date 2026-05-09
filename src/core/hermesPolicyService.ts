import { FileStore } from './fileStore.js';
import { DatakiKnowledgeBaseService } from './datakiKnowledgeBaseService.js';
import { MemoryService } from './memoryService.js';
import { RequirementService } from './requirementService.js';
import { V07RuntimeGovernanceService } from './v07RuntimeGovernanceService.js';
import {
  getHermesPolicyReportDirectoryPath,
  getHermesPolicyReportPath,
  getHermesPromotionPath,
  getHermesResearchPath,
  getHermesWatchPath,
  getProductChiefMultiAgentReviewDirectoryPath,
  getRequirementPath,
  getRetrievalGovernancePath,
} from './projectPaths.js';
import type {
  HermesAutoPromotion,
  HermesComparison,
  HermesPolicyCheck,
  HermesPolicyEnhancement,
  HermesPolicyReport,
  HermesPromotion,
  HermesResearchFinding,
  HermesWatchFinding,
  ProductChiefMultiAgentReview,
  WorkflowRun,
} from '../shared/schemas.js';

export class HermesPolicyService {
  constructor(
    private readonly store: FileStore,
    private readonly memoryService = new MemoryService(store),
    private readonly datakiKnowledgeBaseService = new DatakiKnowledgeBaseService(),
  ) {}

  async evaluateRun(run: WorkflowRun): Promise<HermesPolicyReport> {
    const generatedAt = new Date().toISOString();
    const [openSourceCheck, retrievalCheck, latestInformationCheck, repeatCorrectionCheck, multiAgentReviewCheck, skillEffectivenessCheck, designToolEffectivenessCheck, componentReuseMemoryCheck] = await Promise.all([
      this.evaluateOpenSourceFirst(run),
      this.evaluateRetrievalGovernance(run),
      this.evaluateLatestInformationIntegration(run),
      this.evaluateRepeatCorrectionPromotion(run),
      this.evaluateMultiAgentReviewLoop(run),
      this.evaluateSkillEffectiveness(run),
      this.evaluateDesignToolEffectiveness(run),
      this.evaluateComponentReuseMemory(run),
    ]);
    const checks: HermesPolicyCheck[] = [
      {
        id: 'enhance-only-guardrail',
        label: 'Enhance-only guardrail',
        status: 'pass',
        detail: 'Hermes is mounted as a policy/enhancer service only; it cannot route, plan, modify DAG state, or block workflow execution.',
        evidencePaths: ['docs/operations/p0-p2-execution-log.md'],
      },
      this.evaluateReviewGate(run),
      this.evaluateDagAwareness(run),
      await this.evaluateKnowledgeSourceContext(run),
      retrievalCheck,
      openSourceCheck,
      latestInformationCheck,
      repeatCorrectionCheck,
      multiAgentReviewCheck,
      skillEffectivenessCheck,
      designToolEffectivenessCheck,
      componentReuseMemoryCheck,
    ];
    const status = checks.some((check) => check.status === 'fail')
      ? 'fail'
      : checks.some((check) => check.status === 'warn')
        ? 'warn'
        : 'pass';
    const comparisons = await this.buildComparisons(run);
    const promotions = this.buildPromotions(comparisons);
    const researchFindings = await this.buildResearchFindings(run, checks, comparisons);
    const autoPromotions = await this.applyAutoPromotions(run, comparisons, researchFindings);
    const watchFindings = await this.buildWatchFindings(run, checks, comparisons, autoPromotions, generatedAt);
    const report: HermesPolicyReport = {
      id: `hermes-policy-${run.id}`,
      runId: run.id,
      subprojectId: run.subprojectId,
      generatedAt,
      mode: 'enhance-only',
      status,
      checks,
      enhancements: this.buildEnhancements(run, checks),
      comparisons,
      promotions,
      researchFindings,
      autoPromotions,
      watchFindings,
      guardrails: {
        canRoute: false,
        canPlan: false,
        canModifyDag: false,
        canBlockWorkflow: false,
      },
      metadata: {
        workflowId: run.metadata.workflowId,
        workflowVersion: run.metadata.workflowVersion,
        activeDagRunId: run.metadata.activeDagRunId ?? null,
      },
    };

    await this.store.writeJson(getHermesPolicyReportPath(run.id, run.subprojectId), report);
    await this.store.writeJson(getHermesResearchPath(run.id, run.subprojectId), {
      runId: run.id,
      generatedAt: report.generatedAt,
      findings: report.researchFindings,
    });
    await this.store.writeJson(getHermesPromotionPath(run.id, run.subprojectId), {
      runId: run.id,
      generatedAt: report.generatedAt,
      promotions: report.autoPromotions,
    });
    await this.store.writeJson(getHermesWatchPath(run.id, run.subprojectId), {
      runId: run.id,
      generatedAt: report.generatedAt,
      findings: report.watchFindings,
    });
    return report;
  }

  async closeLoopForRun(run: WorkflowRun) {
    return this.closeLoopForRunInternal(run, []);
  }

  async executeWritebackForRun(run: WorkflowRun) {
    const requirementService = new RequirementService(this.memoryService);
    const initialReport = await this.evaluateRun(run);
    const comparisonById = new Map(initialReport.comparisons.map((comparison) => [comparison.id, comparison]));
    const executedTargetPaths = new Set<string>();
    let executedWritebackTargetCount = 0;
    let skippedWritebackTargetCount = 0;

    for (const promotion of initialReport.autoPromotions.filter((item) => item.status === 'created' || item.status === 'existing')) {
      const comparison = comparisonById.get(promotion.comparisonId);
      if (!comparison) {
        skippedWritebackTargetCount += promotion.writebackTargets.filter((target) => target.status !== 'completed').length;
        continue;
      }

      for (const target of promotion.writebackTargets.filter((item) => item.status !== 'completed')) {
        const executed = await this.executeWritebackTarget(
          run,
          requirementService,
          comparison,
          promotion,
          target,
        );
        if (executed) {
          executedWritebackTargetCount += 1;
          executedTargetPaths.add(target.targetPath);
        } else {
          skippedWritebackTargetCount += 1;
        }
      }
    }

    const closeResult = await this.closeLoopForRunInternal(run, [...executedTargetPaths]);
    return {
      executedWritebackTargetCount,
      skippedWritebackTargetCount,
      ...closeResult,
    };
  }

  private async closeLoopForRunInternal(run: WorkflowRun, extraArtifactPaths: string[]) {
    const requirementService = new RequirementService(this.memoryService);
    const initialReport = await this.evaluateRun(run);
    const runArtifactPaths = new Set<string>([
      ...run.tasks.flatMap((task) => task.artifactPaths),
      ...run.stages.flatMap((stage) => stage.outputPaths),
      ...extraArtifactPaths,
    ]);
    let closedWritebackTaskCount = 0;
    let closedWatchTaskCount = 0;

    const writebackRequirementIds = new Set(
      initialReport.autoPromotions
        .flatMap((promotion) => promotion.writebackTargets)
        .map((target) => target.taskRequirementId)
        .filter((item): item is string => Boolean(item)),
    );

    for (const requirementId of writebackRequirementIds) {
      const requirement = await requirementService.loadRequirement(requirementId, run.subprojectId);
      if (requirement.status === 'done') {
        continue;
      }
      const closureEvidencePaths = requirement.trace.artifactPaths.filter((artifactPath) => runArtifactPaths.has(artifactPath));
      if (closureEvidencePaths.length === 0) {
        continue;
      }
      await requirementService.updateRequirement(requirement.id, {
        subprojectId: run.subprojectId,
        status: 'done',
        artifactPaths: [...new Set([...requirement.trace.artifactPaths, ...closureEvidencePaths])],
        metadataPatch: {
          hermesWritebackActive: false,
          hermesWritebackClosedAt: new Date().toISOString(),
        },
      });
      closedWritebackTaskCount += 1;
    }

    const refreshedReport = await this.evaluateRun(run);
    const closableWatchTaskIds = new Set(
      refreshedReport.watchFindings
        .filter((finding) => finding.status === 'resolved')
        .map((finding) => finding.taskRequirementId)
        .filter((item): item is string => Boolean(item)),
    );

    for (const requirementId of closableWatchTaskIds) {
      const requirement = await requirementService.loadRequirement(requirementId, run.subprojectId);
      if (requirement.status === 'done') {
        continue;
      }
      const closureEvidencePaths = requirement.trace.artifactPaths.filter((artifactPath) => runArtifactPaths.has(artifactPath));
      if (closureEvidencePaths.length === 0) {
        continue;
      }
      await requirementService.updateRequirement(requirement.id, {
        subprojectId: run.subprojectId,
        status: 'done',
        artifactPaths: [...new Set([...requirement.trace.artifactPaths, ...closureEvidencePaths])],
        metadataPatch: {
          hermesWatchActive: false,
          hermesWatchClosedAt: new Date().toISOString(),
        },
      });
      closedWatchTaskCount += 1;
    }

    const report = await this.evaluateRun(run);
    return {
      closedWritebackTaskCount,
      closedWatchTaskCount,
      report,
    };
  }

  async listReports(subprojectId?: string | null) {
    const relativeDir = getHermesPolicyReportDirectoryPath(subprojectId);
    if (!(await this.store.exists(relativeDir))) {
      return [] as HermesPolicyReport[];
    }

    const files = await this.store.list(relativeDir);
    const reports = await Promise.all(
      files
        .filter((file) => file.endsWith('.json'))
        .map((file) => this.store.readJson<HermesPolicyReport>(file)),
    );
    return reports.sort((left, right) => right.generatedAt.localeCompare(left.generatedAt));
  }

  private evaluateReviewGate(run: WorkflowRun): HermesPolicyCheck {
    const reviewStage = run.stages.find((stage) => stage.capability === 'review') ?? null;
    if (!reviewStage) {
      return {
        id: 'review-gate-presence',
        label: 'Review gate presence',
        status: 'fail',
        detail: 'No review-capable stage is present in the workflow run.',
        evidencePaths: [],
      };
    }

    return {
      id: 'review-gate-presence',
      label: 'Review gate presence',
      status: reviewStage.gate.reviewRequired ? 'pass' : 'warn',
      detail: reviewStage.gate.reviewRequired
        ? `Review gate is configured on ${reviewStage.id}.`
        : `Review stage ${reviewStage.id} exists but is not marked reviewRequired.`,
      evidencePaths: reviewStage.outputPaths,
    };
  }

  private evaluateDagAwareness(run: WorkflowRun): HermesPolicyCheck {
    const stageWithDag = run.stages.find((stage) => typeof stage.metadata.dagRunId === 'string') ?? null;
    const activeDagRunId = typeof run.metadata.activeDagRunId === 'string' ? run.metadata.activeDagRunId : null;
    const evidence = stageWithDag ? [stageWithDag.id] : [];

    return {
      id: 'dag-awareness',
      label: 'DAG awareness',
      status: stageWithDag || activeDagRunId ? 'pass' : 'warn',
      detail: stageWithDag || activeDagRunId
        ? 'Workflow run includes DAG dirty-node rerun metadata.'
        : 'No DAG rerun metadata is attached to this workflow run yet.',
      evidencePaths: evidence,
    };
  }

  private async evaluateRetrievalGovernance(run: WorkflowRun): Promise<HermesPolicyCheck> {
    const target = getRetrievalGovernancePath(run.subprojectId);
    if (!(await this.store.exists(target))) {
      return {
        id: 'retrieval-governance',
        label: 'Retrieval governance',
        status: 'warn',
        detail: 'Retrieval governance settings have not been initialized for this scope.',
        evidencePaths: [],
      };
    }

    const settings = await this.store.readJson<{
      mode: string;
      lastIndexedChunkCount: number;
      qualityGate: { minChunkCount: number };
    }>(target);
    const passesChunkGate = settings.lastIndexedChunkCount >= settings.qualityGate.minChunkCount;
    return {
      id: 'retrieval-governance',
      label: 'Retrieval governance',
      status: passesChunkGate ? 'pass' : 'warn',
      detail: passesChunkGate
        ? `Retrieval mode ${settings.mode} satisfies indexed chunk gate.`
        : `Retrieval mode ${settings.mode} has ${settings.lastIndexedChunkCount}/${settings.qualityGate.minChunkCount} indexed chunks.`,
      evidencePaths: [target],
    };
  }

  private async evaluateOpenSourceFirst(run: WorkflowRun): Promise<HermesPolicyCheck> {
    const artifactPaths = run.stages.flatMap((stage) => stage.outputPaths);
    const evidencePaths: string[] = [];

    for (const artifactPath of artifactPaths) {
      if (!(await this.store.exists(artifactPath))) {
        continue;
      }

      const content = await this.store.read(artifactPath);
      if (/open[- ]source|build[- ]vs[- ]buy|oss|开源|自研/iu.test(content)) {
        evidencePaths.push(artifactPath);
      }
    }

    return {
      id: 'open-source-first',
      label: 'Open-source-first evidence',
      status: evidencePaths.length > 0 ? 'pass' : 'warn',
      detail: evidencePaths.length > 0
        ? `Found open-source-first/build-vs-buy evidence in ${evidencePaths.length} artifact(s).`
        : 'No open-source-first/build-vs-buy evidence was found in current workflow artifacts.',
      evidencePaths,
    };
  }

  private async evaluateLatestInformationIntegration(run: WorkflowRun): Promise<HermesPolicyCheck> {
    const baselineDocs = [
      'docs/operations/uiux-stack-baseline.md',
      'docs/operations/frontend-style-default.md',
      'docs/operations/prd-and-design-two-step-governance.md',
      'docs/operations/hermes-global-optimization-architecture.md',
    ];
    const evaluationDate = new Date();
    const evidencePaths: string[] = [];
    const staleDocs: string[] = [];
    const missingDocs: string[] = [];
    const inactiveDocs: string[] = [];

    for (const target of baselineDocs) {
      if (!(await this.store.exists(target))) {
        missingDocs.push(target);
        continue;
      }

      evidencePaths.push(target);
      const content = await this.store.read(target);
      const dateMatch = content.match(/^- date:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})\s*$/mu);
      const statusMatch = content.match(/^- status:\s*(.+)\s*$/mu);
      const docDate = dateMatch ? new Date(`${dateMatch[1]}T00:00:00Z`) : null;
      const status = statusMatch ? statusMatch[1].trim().toLowerCase() : '';

      if (!status.includes('active') && !status.includes('draft baseline')) {
        inactiveDocs.push(target);
      }

      if (!docDate || Number.isNaN(docDate.getTime())) {
        staleDocs.push(target);
        continue;
      }

      const ageDays = Math.floor((evaluationDate.getTime() - docDate.getTime()) / (1000 * 60 * 60 * 24));
      if (ageDays > 30) {
        staleDocs.push(`${target} (${ageDays}d)`);
      }
    }

    const problems = [
      missingDocs.length > 0 ? `missing ${missingDocs.length}` : null,
      staleDocs.length > 0 ? `stale ${staleDocs.length}` : null,
      inactiveDocs.length > 0 ? `inactive ${inactiveDocs.length}` : null,
    ].filter(Boolean);

    return {
      id: 'latest-information-integration',
      label: 'Latest-information integration',
      status: problems.length === 0 ? 'pass' : missingDocs.length > 0 ? 'fail' : 'warn',
      detail:
        problems.length === 0
          ? 'Hermes found active baseline truth-sources for UIUX, frontend style, PRD/design governance, and Hermes global optimization, all refreshed within the last 30 days.'
          : `Hermes detected baseline drift in truth-sources: ${problems.join(' / ')}.`,
      evidencePaths,
    };
  }

  private async evaluateRepeatCorrectionPromotion(run: WorkflowRun): Promise<HermesPolicyCheck> {
    const governance = new V07RuntimeGovernanceService(
      this.store,
      this.memoryService,
      new RequirementService(this.memoryService),
    );
    const snapshot = await governance.buildSnapshot(run.subprojectId);
    const promoted = snapshot.repeatCorrectionCandidates.filter((candidate) => candidate.status === 'promoted');
    const evidencePaths = [
      ...snapshot.repeatCorrectionCandidates.flatMap((candidate) => candidate.evidencePaths),
      ...promoted
        .map((candidate) =>
          candidate.promotedRequirementId ? getRequirementPath(candidate.promotedRequirementId, run.subprojectId) : null,
        )
        .filter((candidatePath): candidatePath is string => Boolean(candidatePath)),
    ];

    if (snapshot.repeatCorrectionCandidates.length === 0) {
      return {
        id: 'repeat-correction-promotion',
        label: 'Repeat-correction promotion loop',
        status: 'warn',
        detail: 'No repeat-correction candidates were detected yet, so Hermes cannot prove that repeated feedback is being turned into governed defaults.',
        evidencePaths,
      };
    }

    if (promoted.length === 0) {
      return {
        id: 'repeat-correction-promotion',
        label: 'Repeat-correction promotion loop',
        status: 'warn',
        detail: `Detected ${snapshot.repeatCorrectionCandidates.length} repeat-correction candidate(s), but none have been promoted into the governed requirement pool yet.`,
        evidencePaths,
      };
    }

    return {
      id: 'repeat-correction-promotion',
      label: 'Repeat-correction promotion loop',
      status: 'pass',
      detail: `Detected ${snapshot.repeatCorrectionCandidates.length} repeat-correction candidate(s); ${promoted.length} have already been promoted into the governed requirement pool.`,
      evidencePaths,
    };
  }

  private async evaluateMultiAgentReviewLoop(run: WorkflowRun): Promise<HermesPolicyCheck> {
    const relativeDir = getProductChiefMultiAgentReviewDirectoryPath(run.subprojectId);
    if (!(await this.store.exists(relativeDir))) {
      return {
        id: 'multi-agent-review-loop',
        label: 'Multi-agent review loop',
        status: 'warn',
        detail: 'No Product Chief multi-agent review records exist yet, so Hermes cannot verify real multi-agent collaboration usability.',
        evidencePaths: [],
      };
    }

    const files = await this.store.list(relativeDir);
    const reviews = await Promise.all(
      files
        .filter((file) => file.endsWith('.json'))
        .map((file) => this.store.readJson<ProductChiefMultiAgentReview>(file)),
    );
    const usableReviews = reviews.filter(
      (review) => review.status !== 'blocked' && review.metadata.projectPmUsable !== false,
    );
    const blockedReviews = reviews.filter((review) => review.status === 'blocked');
    const evidencePaths = reviews.map((review) => review.artifactPath);

    if (reviews.length === 0) {
      return {
        id: 'multi-agent-review-loop',
        label: 'Multi-agent review loop',
        status: 'warn',
        detail: 'The multi-agent review directory exists, but no completed review records were found yet.',
        evidencePaths,
      };
    }

    if (usableReviews.length === 0) {
      return {
        id: 'multi-agent-review-loop',
        label: 'Multi-agent review loop',
        status: 'warn',
        detail: `Found ${reviews.length} multi-agent review record(s), but all are blocked and not yet usable for project PM continuation.`,
        evidencePaths,
      };
    }

    return {
      id: 'multi-agent-review-loop',
      label: 'Multi-agent review loop',
      status: 'pass',
      detail: `Found ${reviews.length} multi-agent review record(s); ${usableReviews.length} are usable for governed continuation and ${blockedReviews.length} remain blocked.`,
      evidencePaths,
    };
  }

  private async evaluateSkillEffectiveness(run: WorkflowRun): Promise<HermesPolicyCheck> {
    const snapshot = await new V07RuntimeGovernanceService(
      this.store,
      this.memoryService,
      new RequirementService(this.memoryService),
    ).buildSnapshot(run.subprojectId);
    const passed = snapshot.skillEffectivenessChecks.filter((item) => item.status === 'pass');
    const evidencePaths = snapshot.skillEffectivenessChecks.flatMap((item) => item.evidencePaths);

    if (snapshot.skillEffectivenessChecks.length === 0) {
      return {
        id: 'skill-effectiveness',
        label: 'Skill effectiveness check',
        status: 'warn',
        detail: 'No design/frontend skill effectiveness objects were available yet, so Hermes cannot verify whether registered skills truly influenced output.',
        evidencePaths,
      };
    }

    return {
      id: 'skill-effectiveness',
      label: 'Skill effectiveness check',
      status: passed.length === snapshot.skillEffectivenessChecks.length ? 'pass' : passed.length > 0 ? 'warn' : 'fail',
      detail:
        passed.length === snapshot.skillEffectivenessChecks.length
          ? `All ${snapshot.skillEffectivenessChecks.length} tracked design/frontend skills show explicit downstream evidence.`
          : passed.length > 0
            ? `${passed.length}/${snapshot.skillEffectivenessChecks.length} tracked design/frontend skills show explicit downstream evidence.`
            : 'Tracked design/frontend skills are registered, but none show explicit downstream evidence yet.',
      evidencePaths,
    };
  }

  private async evaluateDesignToolEffectiveness(run: WorkflowRun): Promise<HermesPolicyCheck> {
    const snapshot = await new V07RuntimeGovernanceService(
      this.store,
      this.memoryService,
      new RequirementService(this.memoryService),
    ).buildSnapshot(run.subprojectId);
    const passed = snapshot.designToolEffectivenessChecks.filter((item) => item.status === 'pass');
    const evidencePaths = snapshot.designToolEffectivenessChecks.flatMap((item) => item.evidencePaths);

    if (snapshot.designToolEffectivenessChecks.length === 0) {
      return {
        id: 'design-tool-effectiveness',
        label: 'Design-tool effectiveness check',
        status: 'warn',
        detail: 'No design-tool effectiveness objects were available yet, so Hermes cannot verify whether connected design tools truly influenced output.',
        evidencePaths,
      };
    }

    return {
      id: 'design-tool-effectiveness',
      label: 'Design-tool effectiveness check',
      status:
        passed.length === snapshot.designToolEffectivenessChecks.length ? 'pass' : passed.length > 0 ? 'warn' : 'fail',
      detail:
        passed.length === snapshot.designToolEffectivenessChecks.length
          ? `All ${snapshot.designToolEffectivenessChecks.length} tracked design tools show explicit influence evidence.`
          : passed.length > 0
            ? `${passed.length}/${snapshot.designToolEffectivenessChecks.length} tracked design tools show explicit influence evidence.`
            : 'Tracked design tools currently show connection/configuration traces, but no explicit influence evidence yet.',
      evidencePaths,
    };
  }

  private async evaluateComponentReuseMemory(run: WorkflowRun): Promise<HermesPolicyCheck> {
    const snapshot = await new V07RuntimeGovernanceService(
      this.store,
      this.memoryService,
      new RequirementService(this.memoryService),
    ).buildSnapshot(run.subprojectId);
    const passed = snapshot.componentReuseMemoryChecks.filter((item) => item.status === 'pass');
    const evidencePaths = snapshot.componentReuseMemoryChecks.flatMap((item) => item.evidencePaths);

    if (snapshot.componentReuseMemoryChecks.length === 0) {
      return {
        id: 'component-reuse-memory',
        label: 'Component-reuse memory',
        status: 'warn',
        detail: 'No component-reuse memory objects were available yet, so Hermes cannot verify whether validated components are becoming governed defaults.',
        evidencePaths,
      };
    }

    return {
      id: 'component-reuse-memory',
      label: 'Component-reuse memory',
      status:
        passed.length === snapshot.componentReuseMemoryChecks.length ? 'pass' : passed.length > 0 ? 'warn' : 'fail',
      detail:
        passed.length === snapshot.componentReuseMemoryChecks.length
          ? `All ${snapshot.componentReuseMemoryChecks.length} tracked component-reuse memory checks show governed promotion and downstream reuse evidence.`
          : passed.length > 0
            ? `${passed.length}/${snapshot.componentReuseMemoryChecks.length} tracked component-reuse memory checks show governed promotion and downstream reuse evidence.`
            : 'Tracked component-reuse memory checks still show reminders or partial traces, but not a stable governed default yet.',
      evidencePaths,
    };
  }

  private async evaluateKnowledgeSourceContext(run: WorkflowRun): Promise<HermesPolicyCheck> {
    const snapshot = await new V07RuntimeGovernanceService(
      this.store,
      this.memoryService,
      new RequirementService(this.memoryService),
    ).buildSnapshot(run.subprojectId);
    const context = snapshot.datakiKnowledgeContext;

    return {
      id: 'knowledge-source-context',
      label: 'System-state knowledge context',
      status: context.configured ? 'pass' : context.sourceScope === 'missing' ? 'warn' : 'warn',
      detail: context.summary,
      evidencePaths: context.evidencePaths,
    };
  }

  private buildEnhancements(run: WorkflowRun, checks: HermesPolicyCheck[]): HermesPolicyEnhancement[] {
    return checks
      .filter((check) => check.status !== 'pass')
      .map((check, index) => ({
        id: `hermes-enhancement-${index + 1}`,
        stageId: run.currentStageId,
        priority: check.status === 'fail' ? 'P0' : 'P1',
        summary: `Address ${check.label}`,
        rationale: check.detail,
      }));
  }

  private async buildResearchFindings(
    run: WorkflowRun,
    checks: HermesPolicyCheck[],
    comparisons: HermesComparison[],
  ): Promise<HermesResearchFinding[]> {
    const findings: HermesResearchFinding[] = [];
    const governance = new V07RuntimeGovernanceService(
      this.store,
      this.memoryService,
      new RequirementService(this.memoryService),
    );
    const snapshot = await governance.buildSnapshot(run.subprojectId);
    const latestInformationCheck = checks.find((check) => check.id === 'latest-information-integration') ?? null;
    if (latestInformationCheck) {
      findings.push(this.createResearchFinding({
        id: 'research-baseline-drift',
        topic: 'baseline drift',
        status: latestInformationCheck.status === 'pass' ? 'promoted' : 'active',
        summary: latestInformationCheck.detail,
        suggestedAction:
          latestInformationCheck.status === 'pass'
            ? 'Keep the active truth-source set refreshed and continue watching for drift.'
            : 'Refresh stale or missing baseline truth-sources before widening default adoption.',
        evidencePaths: latestInformationCheck.evidencePaths,
      }));
    }

    const researchComparison = comparisons.find((comparison) => comparison.id === 'autonomous-external-research-executor') ?? null;
    if (researchComparison) {
      findings.push(this.createResearchFinding({
        id: 'research-executor-candidate',
        topic: 'autonomous external research executor',
        status: researchComparison.decision === 'park' ? 'parked' : 'active',
        summary: researchComparison.summary,
        suggestedAction: researchComparison.nextStep ?? 'Return to this after stronger runtime/operator foundations exist.',
        evidencePaths: researchComparison.evidencePaths,
      }));
    }

    if (snapshot.repeatCorrectionCandidates.length > 0) {
      const promotedCount = snapshot.repeatCorrectionCandidates.filter((candidate) => candidate.status === 'promoted').length;
      findings.push(this.createResearchFinding({
        id: 'research-repeat-correction-pool',
        topic: 'repeat correction reuse',
        status: promotedCount === snapshot.repeatCorrectionCandidates.length ? 'promoted' : promotedCount > 0 ? 'active' : 'active',
        summary: `Hermes found ${snapshot.repeatCorrectionCandidates.length} repeat-correction candidate(s); ${promotedCount} have already been promoted.`,
        suggestedAction:
          promotedCount === snapshot.repeatCorrectionCandidates.length
            ? 'Expand these promoted corrections into broader default reuse across more pages and projects.'
            : 'Promote the remaining repeat-correction candidates into governed requirements before claiming stable reuse.',
        evidencePaths: snapshot.repeatCorrectionCandidates.flatMap((candidate) => candidate.evidencePaths),
      }));
    }

    findings.push(this.createResearchFinding({
      id: 'research-system-state-knowledge',
      topic: 'system state knowledge context',
      status: snapshot.datakiKnowledgeContext.configured
        ? 'promoted'
        : snapshot.datakiKnowledgeContext.sourceScope === 'missing'
          ? 'active'
          : 'active',
      summary: snapshot.datakiKnowledgeContext.summary,
      suggestedAction: snapshot.datakiKnowledgeContext.configured
        ? 'Keep this default knowledge-base mapping aligned with platform or subproject system reality so Hermes research stays grounded.'
        : 'Attach a default Dataki knowledge base mapping before claiming Hermes research is grounded in system-state truth.',
      evidencePaths: snapshot.datakiKnowledgeContext.evidencePaths,
    }));

    const weakEffectivenessChecks = checks.filter((check) =>
      ['skill-effectiveness', 'design-tool-effectiveness', 'component-reuse-memory'].includes(check.id) && check.status !== 'pass',
    );
    for (const check of weakEffectivenessChecks) {
      findings.push(this.createResearchFinding({
        id: `research-${check.id}`,
        topic: check.label,
        status: 'active',
        summary: check.detail,
        suggestedAction: `Close ${check.label} by producing explicit downstream evidence instead of configuration-only traces.`,
        evidencePaths: check.evidencePaths,
      }));
    }

    const systemStateSearchFinding = await this.buildSystemStateSearchFinding(run, snapshot, comparisons);
    if (systemStateSearchFinding) {
      findings.push(systemStateSearchFinding);
    }

    return findings;
  }

  private async buildSystemStateSearchFinding(
    run: WorkflowRun,
    snapshot: Awaited<ReturnType<V07RuntimeGovernanceService['buildSnapshot']>>,
    comparisons: HermesComparison[],
  ): Promise<HermesResearchFinding | null> {
    const context = snapshot.datakiKnowledgeContext;
    if (!context.configured) {
      return null;
    }

    const queryTerms = [
      run.projectName,
      run.currentStageId,
      ...comparisons.slice(0, 2).map((comparison) => comparison.domain),
    ].map((item) => item?.trim()).filter((item): item is string => Boolean(item));
    const query = [...new Set(queryTerms)].join(' ');
    if (!query) {
      return null;
    }

    try {
      const items = await this.datakiKnowledgeBaseService.searchKnowledge({
        query,
        knowledgeBaseId: context.defaultKnowledgeBaseId,
        knowledgeBaseIds: context.defaultKnowledgeBaseIds,
      });
      const excerpts = items.slice(0, 3).map((item) => ({
        knowledgeTitle: item.knowledgeTitle || item.knowledgeFilename || item.knowledgeId,
        snippet: item.content.slice(0, 180),
        score: item.score,
      }));
      const titles = [...new Set(excerpts.map((item) => item.knowledgeTitle).filter(Boolean))];

      return this.createResearchFinding({
        id: 'research-system-state-search',
        topic: 'system state retrieval',
        status: items.length > 0 ? 'promoted' : 'active',
        summary:
          items.length > 0
            ? `Hermes queried the default system-state knowledge base and found ${items.length} hit(s) across ${titles.length} knowledge item(s): ${titles.slice(0, 3).join(' / ')}.`
            : 'Hermes queried the default system-state knowledge base, but no current retrieval hits were returned for the active runtime query.',
        suggestedAction:
          items.length > 0
            ? 'Use these retrieved system-state signals as the default grounding layer before comparing or promoting new runtime directions.'
            : 'Refine the knowledge naming, document structure, or Hermes query terms so system-state retrieval becomes reliably useful.',
        query,
        resultCount: items.length,
        excerpts,
        evidencePaths: [
          ...context.evidencePaths,
          ...(context.defaultKnowledgeBaseId ? [`dataki:kb:${context.defaultKnowledgeBaseId}`] : []),
          ...context.defaultKnowledgeBaseIds.map((item) => `dataki:kb:${item}`),
        ],
      });
    } catch (error) {
      return this.createResearchFinding({
        id: 'research-system-state-search',
        topic: 'system state retrieval',
        status: 'active',
        summary: `Hermes has default system-state knowledge context, but the retrieval execution failed: ${error instanceof Error ? error.message : 'unknown error'}.`,
        suggestedAction: 'Fix Dataki connectivity or KB permissions before claiming Hermes research is fully grounded in system-state knowledge.',
        query,
        resultCount: 0,
        excerpts: [],
        evidencePaths: context.evidencePaths,
      });
    }
  }

  private createResearchFinding(input: Omit<HermesResearchFinding, 'query' | 'resultCount' | 'excerpts'> & {
    query?: string | null;
    resultCount?: number;
    excerpts?: HermesResearchFinding['excerpts'];
  }): HermesResearchFinding {
    return {
      ...input,
      query: input.query ?? null,
      resultCount: input.resultCount ?? 0,
      excerpts: input.excerpts ?? [],
    };
  }

  private async applyAutoPromotions(
    run: WorkflowRun,
    comparisons: HermesComparison[],
    researchFindings: HermesResearchFinding[],
  ): Promise<HermesAutoPromotion[]> {
    const requirementService = new RequirementService(this.memoryService);
    const existingRequirements = await requirementService.listRequirements(run.subprojectId);
    const results: HermesAutoPromotion[] = [];

    for (const comparison of comparisons) {
      if (!['promote', 'replace'].includes(comparison.decision) || !comparison.promoteTargetPath) {
        results.push({
          id: `hermes-auto-promotion-${comparison.id}`,
          comparisonId: comparison.id,
          status: 'skipped',
          summary: `Skipped auto-promotion for ${comparison.id} because the decision is ${comparison.decision}.`,
          requirementId: null,
          targetPath: comparison.promoteTargetPath ?? null,
          artifactPaths: comparison.evidencePaths,
          writebackTargets: [],
        });
        continue;
      }

      const existing = existingRequirements.find(
        (requirement) => requirement.metadata?.hermesComparisonId === comparison.id,
      ) ?? null;
      if (existing) {
        const writebackTargets = await this.materializeWritebackTargets(
          run,
          requirementService,
          existingRequirements,
          comparison,
        );
        results.push({
          id: `hermes-auto-promotion-${comparison.id}`,
          comparisonId: comparison.id,
          status: 'existing',
          summary: `Existing governed requirement already tracks Hermes decision ${comparison.id}.`,
          requirementId: existing.id,
          targetPath: comparison.promoteTargetPath,
          artifactPaths: [...new Set([comparison.promoteTargetPath, ...comparison.evidencePaths, ...existing.trace.artifactPaths])],
          writebackTargets,
        });
        continue;
      }

      const relatedFinding = researchFindings.find((finding) => finding.topic.toLowerCase().includes(comparison.domain.toLowerCase())) ?? null;
      const requirement = await requirementService.createRequirement({
        subprojectId: run.subprojectId,
        title: `[Hermes ${comparison.decision}] ${comparison.domain}`,
        description: [
          comparison.summary,
          '',
          `Current baseline: ${comparison.currentLabel}`,
          comparison.nextStep ? `Next step: ${comparison.nextStep}` : null,
          relatedFinding ? `Research finding: ${relatedFinding.summary}` : null,
        ].filter((line): line is string => Boolean(line)).join('\n'),
        category: 'architecture',
        priority: comparison.decision === 'replace' ? 'P0' : 'P1',
        source: {
          kind: 'auto-capture',
          sessionId: null,
          messageId: null,
          runId: run.id,
          sourceRef: {
            entityType: 'auto-capture',
            entityId: comparison.id,
            path: comparison.promoteTargetPath,
            label: comparison.domain,
          },
        },
        linkedRunIds: [run.id],
        artifactPaths: [...new Set([comparison.promoteTargetPath, ...comparison.evidencePaths])],
        metadata: {
          ingestedFrom: 'auto-capture',
          autoCaptureEventKind: 'hermes-auto-promotion',
          hermesComparisonId: comparison.id,
          hermesDecision: comparison.decision,
          lifecycle: 'promoted',
        },
      });
      await requirementService.updateRequirement(requirement.id, {
        subprojectId: run.subprojectId,
        status: 'active',
        metadataPatch: {
          lifecycle: 'promoted',
          hermesAutoPromotion: true,
        },
      });
      existingRequirements.push({
        ...requirement,
        status: 'active',
        metadata: {
          ...requirement.metadata,
          lifecycle: 'promoted',
          hermesAutoPromotion: true,
        },
      });
      const writebackTargets = await this.materializeWritebackTargets(
        run,
        requirementService,
        existingRequirements,
        comparison,
      );

      results.push({
        id: `hermes-auto-promotion-${comparison.id}`,
        comparisonId: comparison.id,
        status: 'created',
        summary: `Created governed requirement ${requirement.id} from Hermes decision ${comparison.id}.`,
        requirementId: requirement.id,
        targetPath: comparison.promoteTargetPath,
        artifactPaths: [...new Set([comparison.promoteTargetPath, ...comparison.evidencePaths, getRequirementPath(requirement.id, run.subprojectId)])],
        writebackTargets,
      });
    }

    return results;
  }

  private async buildWatchFindings(
    run: WorkflowRun,
    checks: HermesPolicyCheck[],
    comparisons: HermesComparison[],
    autoPromotions: HermesAutoPromotion[],
    generatedAt: string,
  ): Promise<HermesWatchFinding[]> {
    const previousReports = await this.listReports(run.subprojectId);
    const comparableReports = previousReports.filter((report) => report.runId !== run.id);
    const previousReport = comparableReports[0] ?? null;
    const requirementService = new RequirementService(this.memoryService);
    const existingRequirements = await requirementService.listRequirements(run.subprojectId);
    const findings: HermesWatchFinding[] = [];
    const activeWatchIds = new Set<string>();

    for (const check of checks.filter((item) => item.status !== 'pass')) {
      const previousCheck = previousReport?.checks.find((item) => item.id === check.id) ?? null;
      const taskRequirement = await this.ensureWatchTaskRequirement(
        run,
        requirementService,
        existingRequirements,
        `watch-check-${check.id}`,
        check.label,
        [
          check.detail,
          '',
          'Hermes 要求把这个未解决问题转成结构化整改任务，而不是继续停在提醒层。',
          `建议动作: ${check.status === 'fail' ? '立即整改并阻断继续扩散' : '补齐证据并完成治理闭环'}`,
        ].join('\n'),
        check.status === 'fail' ? 'P0' : 'P1',
        check.evidencePaths,
      );
      activeWatchIds.add(`watch-check-${check.id}`);
      findings.push({
        id: `watch-check-${check.id}`,
        title: check.label,
        status: 'active',
        summary: check.detail,
        detail:
          previousCheck
            ? `Still unresolved since previous report ${previousReport?.id}: ${previousCheck.detail}`
            : 'New unresolved Hermes watch item in the current run.',
        evidencePaths: check.evidencePaths,
        carriedFromReportId: previousCheck ? previousReport?.id ?? null : null,
        firstSeenAt: null,
        lastSeenAt: null,
        recurrenceCount: 1,
        stableRunCount: 1,
        noiseSuppressed: false,
        noiseReason: null,
        taskRequirementId: taskRequirement.id,
        trackedRequirementIds: [taskRequirement.id],
        closureEvidencePaths: [],
        nextActionType: 'rectify',
      });
    }

    for (const requirement of existingRequirements.filter(
      (item) => typeof item.metadata?.hermesWatchFindingId === 'string',
    )) {
      const watchFindingId = String(requirement.metadata?.hermesWatchFindingId);
      if (activeWatchIds.has(watchFindingId)) {
        continue;
      }
      if (requirement.status !== 'done') {
        findings.push({
          id: watchFindingId,
          title: requirement.title.replace(/^\[Hermes Watch\]\s*/, ''),
          status: 'active',
          summary: 'Hermes watch task still exists in the governed pool, but the current runtime report no longer surfaces the original failed check.',
          detail: `Requirement ${requirement.id} is still ${requirement.status}; close the governed task or archive it with explicit closure evidence.`,
          evidencePaths: requirement.trace.artifactPaths,
          carriedFromReportId: null,
          firstSeenAt: null,
          lastSeenAt: null,
          recurrenceCount: 1,
          stableRunCount: 1,
          noiseSuppressed: false,
          noiseReason: null,
          taskRequirementId: requirement.id,
          trackedRequirementIds: [requirement.id],
          closureEvidencePaths: [],
          nextActionType: 'rectify',
        });
        continue;
      }

      findings.push({
        id: watchFindingId,
        title: requirement.title.replace(/^\[Hermes Watch\]\s*/, ''),
        status: 'resolved',
        summary: 'Hermes watch task has closure evidence in the governed requirement pool.',
        detail: `Requirement ${requirement.id} reached done and returned ${requirement.trace.artifactPaths.length} closure artifact(s).`,
        evidencePaths: requirement.trace.artifactPaths,
        carriedFromReportId: null,
        firstSeenAt: null,
        lastSeenAt: null,
        recurrenceCount: 1,
        stableRunCount: 1,
        noiseSuppressed: false,
        noiseReason: null,
        taskRequirementId: requirement.id,
        trackedRequirementIds: [requirement.id],
        closureEvidencePaths: requirement.trace.artifactPaths,
        nextActionType: 'none',
      });
    }

    for (const comparison of comparisons.filter((item) => item.decision === 'park' || item.decision === 'reject')) {
      findings.push({
        id: `watch-comparison-${comparison.id}`,
        title: comparison.id,
        status: comparison.decision === 'park' ? 'parked' : 'resolved',
        summary: comparison.summary,
        detail:
          comparison.decision === 'park'
            ? comparison.nextStep ?? 'Parked until the stronger runtime slice is ready.'
            : 'Rejected as an active v0.7 direction and should not be silently reintroduced.',
        evidencePaths: comparison.evidencePaths,
        carriedFromReportId: null,
        firstSeenAt: null,
        lastSeenAt: null,
        recurrenceCount: 1,
        stableRunCount: 1,
        noiseSuppressed: false,
        noiseReason: null,
        taskRequirementId: null,
        trackedRequirementIds: [],
        closureEvidencePaths: [],
        nextActionType: comparison.decision === 'park' ? 'watch' : 'none',
      });
    }

    for (const promotion of autoPromotions.filter((item) => item.status === 'created' || item.status === 'existing')) {
      const trackedRequirementIds = promotion.writebackTargets
        .map((target) => target.taskRequirementId)
        .filter((item): item is string => Boolean(item));
      const incompleteTargets = promotion.writebackTargets.filter((target) => target.status !== 'completed');
      const closureEvidencePaths = [
        ...new Set(
          promotion.writebackTargets.flatMap((target) => target.closureEvidencePaths),
        ),
      ];
      findings.push({
        id: `watch-promotion-${promotion.comparisonId}`,
        title: promotion.comparisonId,
        status: incompleteTargets.length === 0 ? 'resolved' : 'active',
        summary:
          incompleteTargets.length === 0
            ? `${promotion.summary} All governed writeback targets now have closure evidence.`
            : `${promotion.summary} ${incompleteTargets.length}/${promotion.writebackTargets.length} writeback target(s) still need governed closure.`,
        detail: incompleteTargets.length === 0
          ? (promotion.requirementId
              ? `This Hermes decision is tracked by governed requirement ${promotion.requirementId}, and every writeback task has returned closure evidence.`
              : 'This Hermes decision already has a governed tracking object, and its writeback targets are closed.')
          : `Pending writeback targets: ${incompleteTargets.map((target) => target.targetPath).join(' ; ')}`,
        evidencePaths: [...new Set([...promotion.artifactPaths, ...closureEvidencePaths])],
        carriedFromReportId: null,
        firstSeenAt: null,
        lastSeenAt: null,
        recurrenceCount: 1,
        stableRunCount: 1,
        noiseSuppressed: false,
        noiseReason: null,
        taskRequirementId: incompleteTargets[0]?.taskRequirementId ?? null,
        trackedRequirementIds,
        closureEvidencePaths,
        nextActionType: incompleteTargets.length === 0 ? 'none' : 'rectify',
      });
    }

    return this.applyWatchHistory(findings, comparableReports, generatedAt);
  }

  private applyWatchHistory(
    findings: HermesWatchFinding[],
    previousReports: HermesPolicyReport[],
    generatedAt: string,
  ): HermesWatchFinding[] {
    return findings.map((finding) => {
      const history = previousReports
        .map((report) => ({
          reportId: report.id,
          generatedAt: report.generatedAt,
          finding: report.watchFindings.find((item) => item.id === finding.id) ?? null,
        }))
        .filter((item): item is { reportId: string; generatedAt: string; finding: HermesWatchFinding } => Boolean(item.finding));
      const latest = history[0] ?? null;
      const oldest = history[history.length - 1] ?? null;
      const fingerprint = this.buildWatchFingerprint(finding);
      let stableRunCount = 1;

      for (const item of history) {
        if (this.buildWatchFingerprint(item.finding) !== fingerprint) {
          break;
        }
        stableRunCount += 1;
      }

      const firstSeenAt = oldest?.finding.firstSeenAt ?? oldest?.finding.lastSeenAt ?? oldest?.generatedAt ?? generatedAt;
      const historicalRecurrence = history.reduce(
        (maxCount, item) => Math.max(maxCount, item.finding.recurrenceCount),
        history.length,
      );
      const totalRecurrenceCount = history.length > 0 ? historicalRecurrence + 1 : 1;
      const noiseSuppressed = this.shouldSuppressWatchNoise(finding, stableRunCount);
      const noiseReason = noiseSuppressed
        ? `Recurring ${finding.status} Hermes watch item has stayed unchanged for ${stableRunCount} consecutive run(s); collapse repeated reminder noise and keep only lifecycle deltas.`
        : null;

      return {
        ...finding,
        carriedFromReportId: finding.carriedFromReportId ?? latest?.reportId ?? null,
        firstSeenAt,
        lastSeenAt: generatedAt,
        recurrenceCount: totalRecurrenceCount,
        stableRunCount,
        noiseSuppressed,
        noiseReason,
      };
    });
  }

  private buildWatchFingerprint(finding: HermesWatchFinding) {
    return JSON.stringify({
      id: finding.id,
      title: finding.title,
      status: finding.status,
      nextActionType: finding.nextActionType,
      taskRequirementId: finding.taskRequirementId,
      trackedRequirementIds: [...finding.trackedRequirementIds].sort(),
      closureEvidencePaths: [...finding.closureEvidencePaths].sort(),
    });
  }

  private shouldSuppressWatchNoise(finding: HermesWatchFinding, stableRunCount: number) {
    if (stableRunCount < 2) {
      return false;
    }
    if (finding.status === 'resolved') {
      return false;
    }
    if (finding.id.startsWith('watch-check-') && finding.taskRequirementId) {
      return false;
    }
    return finding.nextActionType !== 'none';
  }

  private buildWritebackTargets(comparison: HermesComparison): HermesAutoPromotion['writebackTargets'] {
    const baseTargets: HermesAutoPromotion['writebackTargets'] = comparison.promoteTargetPath
      ? [
          {
            targetPath: comparison.promoteTargetPath,
            targetKind: this.classifyWritebackTargetKind(comparison.promoteTargetPath),
            status: 'recorded',
            reason: `Hermes ${comparison.decision} decision should be reflected in the source-of-truth document for ${comparison.domain}.`,
            taskRequirementId: null,
            closureEvidencePaths: [],
          },
        ]
      : [];

    const domainTargets: Record<string, Array<{ targetPath: string; targetKind: HermesAutoPromotion['writebackTargets'][number]['targetKind']; reason: string }>> = {
      'stage-agent-orchestration': [
        {
          targetPath: 'workflows/product-management.md',
          targetKind: 'workflow',
          reason: 'Stage-specific orchestration should remain part of the built-in workflow truth.',
        },
        {
          targetPath: 'prompts/product-management/virtual_workflow_pm_prompt.md',
          targetKind: 'prompt',
          reason: 'Workflow PM prompt should keep stage-specific switching as the default path.',
        },
      ],
      'ui-spec-activation': [
        {
          targetPath: 'docs/templates/ui_schema_spec_template.md',
          targetKind: 'template',
          reason: 'UI schema template should preserve active-spec loading and governed UI rules.',
        },
        {
          targetPath: 'docs/operations/frontend-style-default.md',
          targetKind: 'operations-doc',
          reason: 'Frontend default rules should reflect active UI spec activation instead of prose-only reminders.',
        },
      ],
      'repeat-correction-memory': [
        {
          targetPath: 'docs/operations/requirement-promotion-and-loss-prevention.md',
          targetKind: 'operations-doc',
          reason: 'Repeat corrections should be written back as governed defaults instead of staying in chat memory.',
        },
        {
          targetPath: 'docs/templates/ai_product_development_loop_template.md',
          targetKind: 'template',
          reason: 'Delivery templates should reflect repeat-correction promotion as a default contract.',
        },
      ],
      'design-delivery': [
        {
          targetPath: 'prompts/product-management/virtual_delivery_pm_prompt.md',
          targetKind: 'prompt',
          reason: 'Delivery PM prompt should keep the governed design-delivery chain as default.',
        },
        {
          targetPath: 'docs/templates/ui_schema_spec_template.md',
          targetKind: 'template',
          reason: 'UI schema template should stay aligned with the promoted design-delivery chain.',
        },
      ],
      'execution-runtime': [
        {
          targetPath: 'docs/operations/module-roadmap.md',
          targetKind: 'operations-doc',
          reason: 'Execution runtime promotion should remain visible in the active module roadmap.',
        },
      ],
      'gate-traceability': [
        {
          targetPath: 'docs/operations/current-version-progress.md',
          targetKind: 'operations-doc',
          reason: 'Gate traceability promotion should be reflected in the active version truth snapshot.',
        },
      ],
    };

    const extras = domainTargets[comparison.domain] ?? [];
    return [...new Map(
      [
        ...baseTargets,
        ...extras.map((item) => ({
          ...item,
          status: 'planned' as const,
          taskRequirementId: null,
          closureEvidencePaths: [],
        })),
      ]
        .map((item) => [item.targetPath, item]),
    ).values()];
  }

  private async materializeWritebackTargets(
    run: WorkflowRun,
    requirementService: RequirementService,
    existingRequirements: Awaited<ReturnType<RequirementService['listRequirements']>>,
    comparison: HermesComparison,
  ): Promise<HermesAutoPromotion['writebackTargets']> {
    const targets = this.buildWritebackTargets(comparison);
    const results: HermesAutoPromotion['writebackTargets'] = [];

    for (const target of targets) {
      const existing = existingRequirements.find(
        (requirement) =>
          requirement.metadata?.hermesComparisonId === comparison.id
          && requirement.metadata?.hermesWritebackTargetPath === target.targetPath,
      ) ?? null;
      if (existing) {
        results.push({
          ...target,
          taskRequirementId: existing.id,
          status: existing.status === 'done' ? 'completed' : 'active',
          closureEvidencePaths: existing.status === 'done' ? existing.trace.artifactPaths : [],
        });
        continue;
      }

      const requirement = await requirementService.createRequirement({
        subprojectId: run.subprojectId,
        title: `[Hermes Writeback] ${comparison.domain} -> ${target.targetPath}`,
        description: [
          target.reason,
          '',
          `Hermes decision: ${comparison.decision}`,
          `Target path: ${target.targetPath}`,
          comparison.nextStep ? `Next step: ${comparison.nextStep}` : null,
        ].filter((line): line is string => Boolean(line)).join('\n'),
        category: 'architecture',
        priority: comparison.decision === 'replace' ? 'P0' : 'P1',
        source: {
          kind: 'auto-capture',
          sessionId: null,
          messageId: null,
          runId: run.id,
          sourceRef: {
            entityType: 'auto-capture',
            entityId: comparison.id,
            path: target.targetPath,
            label: target.targetPath,
          },
        },
        linkedRunIds: [run.id],
        artifactPaths: [...new Set([target.targetPath, comparison.promoteTargetPath, ...comparison.evidencePaths].filter((item): item is string => Boolean(item)))],
        metadata: {
          ingestedFrom: 'auto-capture',
          autoCaptureEventKind: 'hermes-writeback-task',
          hermesComparisonId: comparison.id,
          hermesWritebackTargetPath: target.targetPath,
          hermesWritebackTargetKind: target.targetKind,
          hermesWritebackReason: target.reason,
          hermesWritebackActive: true,
        },
      });
      const activeRequirement = await requirementService.updateRequirement(requirement.id, {
        subprojectId: run.subprojectId,
        status: 'active',
        metadataPatch: {
          lifecycle: 'active',
          hermesWritebackActive: true,
        },
      });
      existingRequirements.push(activeRequirement);
      results.push({
        ...target,
        taskRequirementId: activeRequirement.id,
        status: 'active',
        closureEvidencePaths: [],
      });
    }

    return results;
  }

  private async executeWritebackTarget(
    run: WorkflowRun,
    requirementService: RequirementService,
    comparison: HermesComparison,
    promotion: HermesAutoPromotion,
    target: HermesAutoPromotion['writebackTargets'][number],
  ) {
    if (!target.taskRequirementId) {
      return false;
    }
    if (!this.isSupportedWritebackPath(target.targetPath)) {
      return false;
    }
    if (!(await this.store.exists(target.targetPath))) {
      return false;
    }

    const currentContent = await this.store.read(target.targetPath);
    const nextContent = this.upsertHermesWritebackBlock(currentContent, {
      run,
      comparison,
      promotion,
      target,
    });
    if (nextContent !== currentContent) {
      await this.store.write(target.targetPath, nextContent);
    }

    await requirementService.updateRequirement(target.taskRequirementId, {
      subprojectId: run.subprojectId,
      metadataPatch: {
        hermesWritebackExecutedAt: new Date().toISOString(),
        hermesWritebackExecutionMode: 'controlled-auto-writeback',
      },
    });
    return true;
  }

  private isSupportedWritebackPath(targetPath: string) {
    return /\.(md|mdx|txt)$/iu.test(targetPath);
  }

  private upsertHermesWritebackBlock(
    content: string,
    input: {
      run: WorkflowRun;
      comparison: HermesComparison;
      promotion: HermesAutoPromotion;
      target: HermesAutoPromotion['writebackTargets'][number];
    },
  ) {
    const markerId = `${input.comparison.id}:${input.target.targetPath}`;
    const beginMarker = `<!-- HERMES:BEGIN ${markerId} -->`;
    const endMarker = `<!-- HERMES:END ${markerId} -->`;
    const block = [
      beginMarker,
      '## Hermes Governed Writeback',
      `- run: ${input.run.id}`,
      `- comparison: ${input.comparison.id}`,
      `- decision: ${input.comparison.decision}`,
      `- domain: ${input.comparison.domain}`,
      `- target: ${input.target.targetPath}`,
      `- reason: ${input.target.reason}`,
      `- summary: ${input.comparison.summary}`,
      ...(input.comparison.nextStep ? [`- next-step: ${input.comparison.nextStep}`] : []),
      ...(input.promotion.requirementId ? [`- governance-requirement: ${input.promotion.requirementId}`] : []),
      ...(input.target.taskRequirementId ? [`- writeback-task: ${input.target.taskRequirementId}`] : []),
      ...input.comparison.evidencePaths.slice(0, 5).map((item, index) => `${index === 0 ? '- evidence' : '  evidence'}: ${item}`),
      endMarker,
    ].join('\n');
    const blockPattern = new RegExp(
      `${this.escapeRegExp(beginMarker)}[\\s\\S]*?${this.escapeRegExp(endMarker)}`,
      'u',
    );

    if (blockPattern.test(content)) {
      return content.replace(blockPattern, block);
    }

    return `${content.replace(/\s*$/u, '')}\n\n${block}\n`;
  }

  private escapeRegExp(input: string) {
    return input.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  }

  private classifyWritebackTargetKind(targetPath: string): HermesAutoPromotion['writebackTargets'][number]['targetKind'] {
    if (targetPath.startsWith('prompts/')) {
      return 'prompt';
    }
    if (targetPath.startsWith('workflows/')) {
      return 'workflow';
    }
    if (targetPath.startsWith('docs/templates/')) {
      return 'template';
    }
    if (targetPath.startsWith('docs/memory/')) {
      return 'memory-doc';
    }
    return 'operations-doc';
  }

  private async ensureWatchTaskRequirement(
    run: WorkflowRun,
    requirementService: RequirementService,
    existingRequirements: Awaited<ReturnType<RequirementService['listRequirements']>>,
    watchFindingId: string,
    title: string,
    description: string,
    priority: 'P0' | 'P1',
    artifactPaths: string[],
  ) {
    const existing = existingRequirements.find(
      (requirement) => requirement.metadata?.hermesWatchFindingId === watchFindingId,
    );
    if (existing) {
      return requirementService.updateRequirement(existing.id, {
        subprojectId: run.subprojectId,
        status: 'active',
        priority,
        artifactPaths: [...new Set([...existing.trace.artifactPaths, ...artifactPaths])],
        metadataPatch: {
          hermesWatchActive: true,
        },
      });
    }

    return requirementService.createRequirement({
      subprojectId: run.subprojectId,
      title: `[Hermes Watch] ${title}`,
      description,
      category: 'architecture',
      priority,
      source: {
        kind: 'auto-capture',
        sessionId: null,
        messageId: null,
        runId: run.id,
        sourceRef: {
          entityType: 'auto-capture',
          entityId: watchFindingId,
          path: artifactPaths[0] ?? null,
          label: title,
        },
      },
      linkedRunIds: [run.id],
      artifactPaths,
      metadata: {
        ingestedFrom: 'auto-capture',
        autoCaptureEventKind: 'hermes-watch-task',
        hermesWatchFindingId: watchFindingId,
        hermesWatchActive: true,
      },
    });
  }

  private async buildComparisons(run: WorkflowRun): Promise<HermesComparison[]> {
    const uiuxBaselinePath = 'docs/operations/uiux-stack-baseline.md';
    const designGovernancePath = 'docs/operations/prd-and-design-two-step-governance.md';
    const kernelPath = 'docs/operations/pmaios-v1.0-direction.md';
    const gateTraceabilityPath = 'docs/operations/gate-runtime-traceability-deepening-2026-05-06.md';
    const confirmationChainPath = 'docs/operations/confirmation-chain-object-and-gate.md';
    const designLanguagePath = 'docs/operations/design-language-object-and-skill.md';
    const p0RuntimeSlicePath = 'docs/operations/v0.7-p0-execution-definition-stage-agent-ui-spec-repeat-correction.md';
    const requirementPoolPath = 'docs/operations/requirement-pool-object-and-desk.md';
    const comparisons: HermesComparison[] = [];
    const governance = new V07RuntimeGovernanceService(
      this.store,
      this.memoryService,
      new RequirementService(this.memoryService),
    );
    const snapshot = await governance.buildSnapshot(run.subprojectId);

    if (await this.store.exists(uiuxBaselinePath)) {
      comparisons.push({
        id: 'uiux-stack-baseline',
        domain: 'uiux-stack',
        currentLabel: 'Next.js App Router + Tailwind + shadcn/ui + Radix',
        candidates: [
          {
            label: 'Next.js App Router + Tailwind + shadcn/ui + Radix',
            classification: 'current',
            rationale: 'Repo-owned code and design-token control fit PMAIOS productization and AI-assisted code editing.',
          },
          {
            label: 'Ant Design full-stack console baseline',
            classification: 'candidate',
            rationale: 'Faster for enterprise-console density, but stronger framework taste and lower repo-native flexibility.',
          },
          {
            label: 'MUI material baseline',
            classification: 'fallback',
            rationale: 'Fast application scaffold, but heavier default design language and more opinionated material flavor.',
          },
        ],
        decision: 'keep',
        summary: 'Current repo-owned UI stack remains the preferred baseline; alternatives stay as governed references rather than default replacement.',
        evidencePaths: [uiuxBaselinePath],
        nextStep: 'Keep tracking whether a denser enterprise-console baseline truly outperforms the current repo-owned stack on real operator tasks.',
        promoteTargetPath: uiuxBaselinePath,
      });
    }

    if (await this.store.exists(designGovernancePath)) {
      comparisons.push({
        id: 'design-delivery-chain',
        domain: 'design-delivery',
        currentLabel: 'concept image2 -> html direction -> ui-schema -> delivery pack',
        candidates: [
          {
            label: 'concept image2 -> html direction -> ui-schema -> delivery pack',
            classification: 'current',
            rationale: 'Separates exploration from implementation and preserves a machine-readable handoff layer.',
          },
          {
            label: 'single image-driven direct delivery',
            classification: 'candidate',
            rationale: 'Feels fast, but causes requirement/design/frontend drift and forces developers to guess interaction structure.',
          },
        ],
        decision: 'promote',
        summary: 'Structured design delivery chain should be promoted as the default implementation path instead of image-only handoff.',
        evidencePaths: [designGovernancePath],
        nextStep: 'Push UI schema and delivery pack adoption into more project handoffs so the contract stops depending on prose explanations.',
        promoteTargetPath: designGovernancePath,
      });
    }

    if (await this.store.exists(kernelPath)) {
      comparisons.push({
        id: 'runtime-mainline',
        domain: 'execution-runtime',
        currentLabel: 'Task SSOT + Gate + Scheduler + Continuation runtime',
        candidates: [
          {
            label: 'Task SSOT + Gate + Scheduler + Continuation runtime',
            classification: 'current',
            rationale: 'Provides traceable work orchestration, resumability, and governed execution.',
          },
          {
            label: 'conversation-only manual execution',
            classification: 'candidate',
            rationale: 'Low setup, but poor continuity, weak auditability, and high drift risk across long-running projects.',
          },
        ],
        decision: 'promote',
        summary: 'Structured runtime should be promoted as the platform default for continuation and governed execution.',
        evidencePaths: [kernelPath],
        nextStep: 'Continue replacing conversation-only continuation with Task SSOT, SchedulerRun, and proof-of-work on the active mainline.',
        promoteTargetPath: kernelPath,
      });
    }

    if (await this.store.exists(gateTraceabilityPath)) {
      comparisons.push({
        id: 'gate-traceability-mainline',
        domain: 'gate-traceability',
        currentLabel: 'gate summary only',
        candidates: [
          {
            label: 'Task SSOT gate history + proof-of-work gate events',
            classification: 'candidate',
            rationale: 'Turns gate actions into traceable governance events instead of summary-only runtime state.',
          },
          {
            label: 'gate summary only',
            classification: 'current',
            rationale: 'Low implementation cost, but weak operator auditability and poor continuation evidence.',
          },
        ],
        decision: 'promote',
        summary: 'History-backed gate traceability should replace summary-only gate visibility as the runtime baseline.',
        evidencePaths: [gateTraceabilityPath],
        nextStep: 'Keep deepening gate evidence so proof-of-work reads like an acceptance package rather than a raw runtime log.',
        promoteTargetPath: gateTraceabilityPath,
      });
    }

    if (await this.store.exists(confirmationChainPath) && await this.store.exists(designLanguagePath)) {
      comparisons.push({
        id: 'design-governance-baseline',
        domain: 'design-governance',
        currentLabel: 'design outputs without unified confirmation and design-language gates',
        candidates: [
          {
            label: 'DESIGN.md + design-confirmed gate + ai-writeback-confirmation',
            classification: 'candidate',
            rationale: 'Connects design language, confirmation state, and writeback review into the same governed chain.',
          },
          {
            label: 'design outputs without unified confirmation and design-language gates',
            classification: 'current',
            rationale: 'Allows faster local output, but causes hidden drift between design artifacts, confirmation state, and implementation handoff.',
          },
        ],
        decision: 'promote',
        summary: 'Unified design language and confirmation gates should be promoted as the platform baseline for design-to-delivery governance.',
        evidencePaths: [confirmationChainPath, designLanguagePath],
        nextStep: 'Keep attaching design-language and confirmation evidence directly into delivery-facing proof bundles.',
        promoteTargetPath: confirmationChainPath,
      });
    }

    if ((await this.store.exists(p0RuntimeSlicePath)) && snapshot.stageAgents.length > 0) {
      comparisons.push({
        id: 'stage-agent-default-switching',
        domain: 'stage-agent-orchestration',
        currentLabel: 'single generic workflow mode across all product stages',
        candidates: [
          {
            label: 'stage-specific orchestration for requirements / prototype / interaction / UI / frontend',
            classification: 'candidate',
            rationale: 'Prevents requirement work from collapsing into frontend implementation and keeps each stage aligned to its own output contract.',
          },
          {
            label: 'single generic workflow mode across all product stages',
            classification: 'current',
            rationale: 'Lower short-term setup, but repeatedly causes stage drift and weakens operator governance.',
          },
        ],
        decision: 'replace',
        summary: 'Stage-specific orchestration should replace generic one-mode execution as the governed default.',
        evidencePaths: [p0RuntimeSlicePath],
        nextStep: 'Roll the landed stage-agent runtime slice out beyond tracking-acceptance into more subprojects.',
        promoteTargetPath: p0RuntimeSlicePath,
      });
    }

    if ((await this.store.exists(p0RuntimeSlicePath)) && snapshot.uiSpecActivation.status !== 'missing') {
      comparisons.push({
        id: 'ui-spec-activation-default',
        domain: 'ui-spec-activation',
        currentLabel: 'UI output that may ignore active spec unless manually restated',
        candidates: [
          {
            label: 'UI spec activation gate with active-spec loading before UI-stage output',
            classification: 'candidate',
            rationale: 'Turns design rules into a default runtime contract instead of a reminder buried in docs.',
          },
          {
            label: 'UI output that may ignore active spec unless manually restated',
            classification: 'current',
            rationale: 'Feels flexible, but recreates repeated clarification and weakens design-to-delivery consistency.',
          },
        ],
        decision: 'replace',
        summary: 'UI spec activation should replace manual restatement as the default design-governance path.',
        evidencePaths: [p0RuntimeSlicePath],
        nextStep: 'Deepen machine-readable UI schema and active-spec loading so implementation depends less on prose.',
        promoteTargetPath: p0RuntimeSlicePath,
      });
    }

    if ((await this.store.exists(p0RuntimeSlicePath)) && (await this.store.exists(requirementPoolPath)) && snapshot.repeatCorrectionCandidates.length > 0) {
      const promotedCount = snapshot.repeatCorrectionCandidates.filter((candidate) => candidate.status === 'promoted').length;
      comparisons.push({
        id: 'repeat-correction-default',
        domain: 'repeat-correction-memory',
        currentLabel: 'chat-only repeated correction memory',
        candidates: [
          {
            label: 'repeat-correction memory with requirement-pool promotion and governed reuse',
            classification: 'candidate',
            rationale: 'Converts repeated feedback into stable defaults so the same correction does not need to be said again.',
          },
          {
            label: 'chat-only repeated correction memory',
            classification: 'current',
            rationale: 'Low friction at first, but loses corrections across turns, projects, and operator handoffs.',
          },
        ],
        decision: promotedCount > 0 ? 'replace' : 'promote',
        summary:
          promotedCount > 0
            ? 'Governed repeat-correction memory should replace chat-only recall as the default correction-absorption path.'
            : 'Repeat-correction candidates exist and should be promoted into the governed requirement pool before they can become the default.',
        evidencePaths: [p0RuntimeSlicePath, requirementPoolPath],
        nextStep:
          promotedCount > 0
            ? 'Expand governed repeat-correction reuse across more projects and component families.'
            : 'Promote remaining repeat-correction candidates into governed requirements and wire them into downstream defaults.',
        promoteTargetPath: requirementPoolPath,
      });
    }

    comparisons.push({
      id: 'hermes-hard-control',
      domain: 'hermes-guardrail',
      currentLabel: 'enhance-only Hermes policy layer',
      candidates: [
        {
          label: 'Hermes directly routes, plans, blocks, or mutates workflow execution',
          classification: 'candidate',
          rationale: 'Looks powerful, but breaks current platform guardrails and makes policy evaluation non-auditable.',
        },
        {
          label: 'enhance-only Hermes policy layer',
          classification: 'current',
          rationale: 'Keeps Hermes in a reviewable governance role while the runtime and operator surfaces continue hardening.',
        },
      ],
      decision: 'reject',
      summary: 'Hermes should not become a hard-control orchestrator in v0.7; direct routing/blocking remains outside the guardrail.',
      evidencePaths: ['docs/operations/v0.7-minimum-loop-summary.md', 'docs/operations/hermes-skill-candidate-policy.md'],
      nextStep: 'Keep strengthening compare/judge/promote/watch effectiveness without breaking enhance-only guardrails.',
      promoteTargetPath: null,
    });

    comparisons.push({
      id: 'autonomous-external-research-executor',
      domain: 'hermes-research',
      currentLabel: 'open-source-first and latest-information checks without autonomous external research execution',
      candidates: [
        {
          label: 'autonomous external research executor with candidate harvesting across tools and domains',
          classification: 'candidate',
          rationale: 'Would strengthen long-cycle optimization, but still depends on a stronger runtime chain and clearer operator controls.',
        },
        {
          label: 'open-source-first and latest-information checks without autonomous external research execution',
          classification: 'current',
          rationale: 'Already gives governance value without overextending the runtime into unstable automation.',
        },
      ],
      decision: 'park',
      summary: 'Autonomous external research execution stays parked until the active runtime and operator surfaces are stronger.',
      evidencePaths: ['docs/operations/hermes-current-effectiveness-assessment-2026-05-07.md'],
      nextStep: 'Return to this only after SchedulerRun, gate control, and acceptance packages are stronger.',
      promoteTargetPath: null,
    });

    return comparisons;
  }

  private buildPromotions(comparisons: HermesComparison[]): HermesPromotion[] {
    return comparisons.map((comparison, index) => ({
      id: `hermes-promotion-${index + 1}`,
      targetPath: comparison.promoteTargetPath ?? null,
      action: comparison.decision,
      summary: comparison.summary,
      rationale: `${comparison.domain}: ${comparison.currentLabel}`,
    }));
  }
}

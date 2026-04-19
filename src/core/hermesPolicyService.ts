import { FileStore } from './fileStore.js';
import { MemoryService } from './memoryService.js';
import { getHermesPolicyReportDirectoryPath, getHermesPolicyReportPath, getRetrievalGovernancePath } from './projectPaths.js';
import type { HermesPolicyCheck, HermesPolicyEnhancement, HermesPolicyReport, WorkflowRun } from '../shared/schemas.js';

export class HermesPolicyService {
  constructor(
    private readonly store: FileStore,
    private readonly memoryService = new MemoryService(store),
  ) {}

  async evaluateRun(run: WorkflowRun): Promise<HermesPolicyReport> {
    const [openSourceCheck, retrievalCheck] = await Promise.all([
      this.evaluateOpenSourceFirst(run),
      this.evaluateRetrievalGovernance(run),
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
      retrievalCheck,
      openSourceCheck,
    ];
    const status = checks.some((check) => check.status === 'fail')
      ? 'fail'
      : checks.some((check) => check.status === 'warn')
        ? 'warn'
        : 'pass';
    const report: HermesPolicyReport = {
      id: `hermes-policy-${run.id}`,
      runId: run.id,
      subprojectId: run.subprojectId,
      generatedAt: new Date().toISOString(),
      mode: 'enhance-only',
      status,
      checks,
      enhancements: this.buildEnhancements(run, checks),
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
    return report;
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
}

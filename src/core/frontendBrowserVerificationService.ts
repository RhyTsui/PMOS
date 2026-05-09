import fs from 'node:fs';
import path from 'node:path';
import type { FrontendBrowserVerificationCheck, FrontendBrowserVerificationReport, TaskSsotTask, WorkflowRun } from '../shared/schemas.js';

const FRONTEND_STAGE_IDS = new Set(['frontend-page', 'frontend-backend-integration']);
const PAGE_CLASSIFICATION_BLOCKERS = new Set(['demo', 'promo']);
const BANNED_FRONTEND_PATTERNS = [
  /summary-card/iu,
  /hero-workbench/iu,
  /runtime-hero-panel/iu,
  /artifact-hub-card/iu,
  /claude/iu,
  /glassmorphism/iu,
  /control plane/iu,
  /execution console/iu,
];

type UiSchemaContractLike = {
  pageContracts?: Array<{
    classification?: string;
    blocks?: unknown[];
    actions?: unknown[];
    states?: Array<{ kind?: string }>;
  }>;
  implementationRules?: string[];
};

export class FrontendBrowserVerificationService {
  constructor(private readonly rootDir = process.cwd()) {}

  evaluateTask(task: TaskSsotTask, workflowRun: WorkflowRun | null = null): FrontendBrowserVerificationReport {
    const artifactPaths = [
      ...new Set([
        ...task.artifactLinks.map((artifact) => artifact.artifactPath),
        ...(workflowRun?.tasks.flatMap((workflowTask) => workflowTask.artifactPaths) ?? []),
        ...(workflowRun?.stages.flatMap((stage) => stage.outputPaths) ?? []),
      ]),
    ];
    const applicable = this.isFrontendApplicable(task, artifactPaths);
    if (!applicable) {
      return {
        taskId: task.taskId,
        workflowRunId: workflowRun?.id ?? null,
        stageId: task.currentStage ?? workflowRun?.currentStageId ?? null,
        applicable: false,
        status: 'not-applicable',
        generatedAt: new Date().toISOString(),
        checks: [],
        summary: 'Current task is not in a frontend delivery stage, so browser-grade verification is not required yet.',
      };
    }

    const relevantPaths = artifactPaths.filter((artifactPath) => this.isFrontendArtifactPath(artifactPath));
    const uiSchemaArtifacts = relevantPaths
      .map((artifactPath) => ({ artifactPath, contract: this.tryReadUiSchemaContract(artifactPath) }))
      .filter((item): item is { artifactPath: string; contract: UiSchemaContractLike } => item.contract !== null);
    const pageContracts = uiSchemaArtifacts.flatMap((item) => item.contract.pageContracts ?? []);
    const implementationRules = uiSchemaArtifacts.flatMap((item) => item.contract.implementationRules ?? []);
    const frontendArtifactText = relevantPaths
      .map((artifactPath) => this.tryReadTextArtifact(artifactPath))
      .filter((content): content is string => Boolean(content))
      .join('\n');
    const browserEvidencePaths = relevantPaths.filter((artifactPath) =>
      /browser|playwright|verification|frontend-page-|integration|html/iu.test(artifactPath),
    );
    const stateKinds = pageContracts.flatMap((page) => page.states?.map((state) => state.kind ?? '') ?? []);
    const totalActionCount = pageContracts.reduce((count, page) => count + (page.actions?.length ?? 0), 0);
    const totalBlockCount = pageContracts.reduce((count, page) => count + (page.blocks?.length ?? 0), 0);
    const checks: FrontendBrowserVerificationCheck[] = [
      {
        id: 'delivery-page-artifacts',
        label: '交付级页面产物',
        status: relevantPaths.length > 0 ? 'pass' : 'block',
        detail:
          relevantPaths.length > 0
            ? `Found ${relevantPaths.length} frontend delivery artifact(s) tied to this task.`
            : 'No frontend delivery artifact is attached, so page-level verification cannot even start.',
        evidencePaths: relevantPaths,
      },
      {
        id: 'page-contract-coverage',
        label: '页面 contract 覆盖',
        status:
          pageContracts.length === 0
            ? 'block'
            : pageContracts.some((page) => PAGE_CLASSIFICATION_BLOCKERS.has(page.classification ?? ''))
              ? 'block'
              : pageContracts.some((page) => (page.blocks?.length ?? 0) === 0)
                ? 'warn'
                : 'pass',
        detail:
          pageContracts.length === 0
            ? 'No ui-schema page contract was found, so frontend delivery is still relying on prose or screenshots.'
            : pageContracts.some((page) => PAGE_CLASSIFICATION_BLOCKERS.has(page.classification ?? ''))
              ? 'At least one page contract is still marked as demo/promo, which is not acceptable for delivery-grade frontend pages.'
              : pageContracts.some((page) => (page.blocks?.length ?? 0) === 0)
                ? 'Page contracts exist, but some pages still lack block-level structure.'
                : `Found ${pageContracts.length} page contract(s) with structured block coverage.`,
        evidencePaths: uiSchemaArtifacts.map((item) => item.artifactPath),
      },
      {
        id: 'interaction-and-state-coverage',
        label: '交互与状态覆盖',
        status:
          pageContracts.length === 0
            ? 'block'
            : totalActionCount === 0
              ? 'block'
              : stateKinds.includes('loading') && stateKinds.includes('empty') && stateKinds.includes('error')
                ? 'pass'
                : 'warn',
        detail:
          pageContracts.length === 0
            ? 'No page contract exists to verify interaction and state coverage.'
            : totalActionCount === 0
              ? 'Page contracts exist, but no action contracts were found.'
              : stateKinds.includes('loading') && stateKinds.includes('empty') && stateKinds.includes('error')
                ? `Found ${totalActionCount} action contract(s) and explicit loading / empty / error states.`
                : `Found ${totalActionCount} action contract(s), but loading / empty / error coverage is still incomplete.`,
        evidencePaths: uiSchemaArtifacts.map((item) => item.artifactPath),
      },
      {
        id: 'user-facing-layout-quality',
        label: '面向用户的布局质量',
        status:
          totalBlockCount === 0
            ? 'block'
            : implementationRules.some((rule) => /pageContracts|actions|states|dataRefs/iu.test(rule))
              ? 'pass'
              : 'warn',
        detail:
          totalBlockCount === 0
            ? 'No block-level page structure was found, so layout correctness cannot be reviewed from a user-flow perspective.'
            : implementationRules.some((rule) => /pageContracts|actions|states|dataRefs/iu.test(rule))
              ? 'UI schema explicitly requires frontend implementation to follow pageContracts / actions / states / dataRefs.'
              : 'Page structure exists, but implementation rules do not strongly bind frontend work to governed UI contracts yet.',
        evidencePaths: uiSchemaArtifacts.map((item) => item.artifactPath),
      },
      {
        id: 'anti-pattern-ban',
        label: '反模式清理',
        status:
          frontendArtifactText && BANNED_FRONTEND_PATTERNS.some((pattern) => pattern.test(frontendArtifactText))
            ? 'block'
            : frontendArtifactText
              ? 'pass'
              : 'warn',
        detail:
          frontendArtifactText && BANNED_FRONTEND_PATTERNS.some((pattern) => pattern.test(frontendArtifactText))
            ? 'Frontend artifacts still contain banned Claude-style shell patterns or terminology.'
            : frontendArtifactText
              ? 'No banned Claude-style shell patterns were detected in frontend delivery artifacts.'
              : 'No readable frontend artifact content was available for anti-pattern scanning.',
        evidencePaths: relevantPaths,
      },
      {
        id: 'browser-evidence-anchor',
        label: '浏览器级证据锚点',
        status:
          browserEvidencePaths.length > 0
            ? 'pass'
            : 'warn',
        detail:
          browserEvidencePaths.length > 0
            ? `Found ${browserEvidencePaths.length} browser/integration verification artifact anchor(s).`
            : 'No explicit browser/playwright/integration verification artifact was attached yet. This still needs a real runtime check.',
        evidencePaths: browserEvidencePaths,
      },
    ];

    const status =
      checks.some((check) => check.status === 'block')
        ? 'block'
        : checks.some((check) => check.status === 'warn')
          ? 'warn'
          : 'pass';

    return {
      taskId: task.taskId,
      workflowRunId: workflowRun?.id ?? null,
      stageId: task.currentStage ?? workflowRun?.currentStageId ?? null,
      applicable: true,
      status,
      generatedAt: new Date().toISOString(),
      checks,
      summary:
        status === 'pass'
          ? 'Frontend delivery package passed governed browser-grade verification gates.'
          : status === 'block'
            ? 'Frontend delivery package is blocked: user-facing layout, interaction, or anti-pattern checks are not yet acceptable.'
            : 'Frontend delivery package is structurally usable, but still lacks complete browser-grade evidence or state coverage.',
    };
  }

  private isFrontendApplicable(task: TaskSsotTask, artifactPaths: string[]) {
    return FRONTEND_STAGE_IDS.has(task.currentStage)
      || artifactPaths.some((artifactPath) => this.isFrontendArtifactPath(artifactPath));
  }

  private isFrontendArtifactPath(artifactPath: string) {
    return /frontend|multimodal|ui-schema|delivery|html|\.tsx$|\.jsx$|\.css$|frontend-page|integration/iu.test(artifactPath);
  }

  private tryReadUiSchemaContract(artifactPath: string): UiSchemaContractLike | null {
    if (!/\.json$/iu.test(artifactPath)) {
      return null;
    }
    const absolutePath = path.resolve(this.rootDir, artifactPath);
    if (!fs.existsSync(absolutePath)) {
      return null;
    }
    try {
      const raw = fs.readFileSync(absolutePath, 'utf8');
      const parsed = JSON.parse(raw) as UiSchemaContractLike;
      return Array.isArray(parsed.pageContracts) ? parsed : null;
    } catch {
      return null;
    }
  }

  private tryReadTextArtifact(artifactPath: string) {
    if (!/\.(md|json|tsx|jsx|css|html)$/iu.test(artifactPath)) {
      return null;
    }
    const absolutePath = path.resolve(this.rootDir, artifactPath);
    if (!fs.existsSync(absolutePath)) {
      return null;
    }
    try {
      return fs.readFileSync(absolutePath, 'utf8');
    } catch {
      return null;
    }
  }
}

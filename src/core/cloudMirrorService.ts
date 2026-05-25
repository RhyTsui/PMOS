import { FileStore } from './fileStore.js';
import type { DocumentGovernanceAudit, TaskSsotState } from '../shared/schemas.js';

type McpContextLike = {
  currentMode: string;
  currentTaskId: string | null;
  lastUpdated: string;
  tasks: Array<{
    id: string;
    label: string;
    status: string;
    updatedAt: string;
  }>;
  checkpoints: Array<{
    id: string;
    label: string;
    taskId: string | null;
    timestamp: string;
  }>;
};

type RuntimeSummary = Record<string, unknown>;

type RuntimeStatusInput = {
  mcpContext: McpContextLike;
  taskState: TaskSsotState;
  outboxRuntime: RuntimeSummary;
  schedulerRuntime: RuntimeSummary;
  documentGovernanceAudit: DocumentGovernanceAudit | null;
  subprojectId?: string | null;
};

type RuntimeStatus = {
  version: number;
  generatedAt: string;
  subprojectId: string | null;
  currentProductVersion: string;
  currentRuntimeBaseline: string;
  currentMode: string;
  currentHighestPriorityLine: string;
  inProgressTasks: Array<{
    taskId: string;
    title: string;
    status: string;
    currentStage: string;
    collaborationLevel: string;
    owner: string | null;
    resumeAnchor: string | null;
    nextSafeStep: string | null;
  }>;
  latestCheckpoints: McpContextLike['checkpoints'];
  blockers: {
    taskCount: number;
    gateCount: number;
    gateSampleCount: number;
    tasks: Array<{
      taskId: string;
      title: string;
      blockerType: string | null;
      nextSafeStep: string | null;
    }>;
    gates: Array<{
      taskId: string;
      title: string;
      gateId: string;
      reason: string | null;
      evidencePaths: string[];
    }>;
  };
  activeSubprojects: string[];
  runtime: {
    taskSsot: {
      total: number;
      active: number;
      inReview: number;
      blocked: number;
      completed: number;
    };
    outbox: RuntimeSummary;
    scheduler: RuntimeSummary;
    documentGovernance: {
      generatedAt: string;
      entryCount: number;
      activeTopicCount: number;
      issueCount: number;
      summary: string;
      blockingIssues: number;
    } | null;
  };
  latestReviewSummary: {
    evidencePaths: string[];
    taskCountWithReviewEvidence: number;
  };
};

export class CloudMirrorService {
  constructor(private readonly store: FileStore) {}

  async writeRuntimeStatus(input: RuntimeStatusInput) {
    const generatedAt = new Date().toISOString();
    const activeTasks = input.taskState.tasks.filter((task) =>
      task.status === 'active' || task.status === 'in_review' || task.status === 'blocked',
    );
    const blockedTasks = input.taskState.tasks.filter((task) => task.status === 'blocked');
    const blockedGates = input.taskState.tasks.flatMap((task) =>
      task.gateChecks
        .filter((gate) => gate.status === 'block')
        .map((gate) => ({
          taskId: task.taskId,
          title: task.title,
          gateId: gate.gateId,
          reason: gate.reason,
          evidencePaths: gate.evidencePaths,
        })),
    );
    const activeSubprojects = [...new Set(input.taskState.tasks.map((task) => task.subprojectId).filter((item): item is string => Boolean(item)))];
    const latestReviewEvidence = [
      ...new Set(
        input.taskState.tasks.flatMap((task) =>
          task.artifactLinks
            .filter((artifact) => artifact.roleInTask === 'review-evidence')
            .map((artifact) => artifact.artifactPath),
        ),
      ),
    ].slice(0, 10);

    const status: RuntimeStatus = {
      version: 1,
      generatedAt,
      subprojectId: input.subprojectId ?? null,
      currentProductVersion: 'v1.0',
      currentRuntimeBaseline: 'v0.7',
      currentMode: input.mcpContext.currentMode,
      currentHighestPriorityLine:
        input.taskState.continuation.activeMainlineLabel ??
        input.mcpContext.tasks.find((task) => task.id === input.mcpContext.currentTaskId)?.label ??
        'v1.0 non-page closure',
      inProgressTasks: activeTasks.map((task) => ({
        taskId: task.taskId,
        title: task.title,
        status: task.status,
        currentStage: task.currentStage,
        collaborationLevel: task.collaborationLevel,
        owner: task.currentOwnerAgentId,
        resumeAnchor: task.continuation.resumeAnchor,
        nextSafeStep: task.continuation.nextSafeStep,
      })),
      latestCheckpoints: input.mcpContext.checkpoints.slice(-8).reverse(),
      blockers: {
        taskCount: blockedTasks.length,
        gateCount: blockedGates.length,
        gateSampleCount: Math.min(blockedGates.length, 50),
        tasks: blockedTasks.map((task) => ({
          taskId: task.taskId,
          title: task.title,
          blockerType: task.continuation.blockerType,
          nextSafeStep: task.continuation.nextSafeStep,
        })),
        gates: blockedGates.slice(0, 50),
      },
      activeSubprojects,
      runtime: {
        taskSsot: {
          total: input.taskState.tasks.length,
          active: input.taskState.tasks.filter((task) => task.status === 'active').length,
          inReview: input.taskState.tasks.filter((task) => task.status === 'in_review').length,
          blocked: blockedTasks.length,
          completed: input.taskState.tasks.filter((task) => task.status === 'completed').length,
        },
        outbox: input.outboxRuntime,
        scheduler: input.schedulerRuntime,
        documentGovernance: input.documentGovernanceAudit
          ? {
              generatedAt: input.documentGovernanceAudit.generatedAt,
              entryCount: input.documentGovernanceAudit.entryCount,
              activeTopicCount: input.documentGovernanceAudit.activeTopicCount,
              issueCount: input.documentGovernanceAudit.issueCount,
              summary: input.documentGovernanceAudit.summary,
              blockingIssues: input.documentGovernanceAudit.issues.filter((issue) => issue.severity === 'block').length,
            }
          : null,
      },
      latestReviewSummary: {
        evidencePaths: latestReviewEvidence,
        taskCountWithReviewEvidence: input.taskState.tasks.filter((task) =>
          task.artifactLinks.some((artifact) => artifact.roleInTask === 'review-evidence'),
        ).length,
      },
    };

    const jsonPath = this.runtimeStatusJsonPath(input.subprojectId);
    const markdownPath = this.runtimeStatusMarkdownPath(input.subprojectId);
    await this.store.writeJson(jsonPath, status);
    await this.store.write(markdownPath, this.toMarkdown(status));
    return { jsonPath, markdownPath, status };
  }

  private runtimeStatusJsonPath(subprojectId?: string | null) {
    return subprojectId ? `subprojects/${subprojectId}/cloud-mirror/runtime-status.json` : 'cloud-mirror/runtime-status.json';
  }

  private runtimeStatusMarkdownPath(subprojectId?: string | null) {
    return subprojectId ? `subprojects/${subprojectId}/cloud-mirror/runtime-status.md` : 'cloud-mirror/runtime-status.md';
  }

  private toMarkdown(status: RuntimeStatus) {
    return [
      '# PMOS Runtime Status',
      '',
      `- generatedAt: ${status.generatedAt}`,
      `- currentProductVersion: ${status.currentProductVersion}`,
      `- currentRuntimeBaseline: ${status.currentRuntimeBaseline}`,
      `- currentHighestPriorityLine: ${status.currentHighestPriorityLine}`,
      `- currentMode: ${status.currentMode}`,
      '',
      '## In Progress Tasks',
      ...(status.inProgressTasks.length
        ? status.inProgressTasks.map((task) => `- ${task.taskId} | ${task.status} | ${task.currentStage} | ${task.title}`)
        : ['- none']),
      '',
      '## Blockers',
      `- blockedTasks: ${status.blockers.taskCount}`,
      `- blockedGates: ${status.blockers.gateCount}`,
      `- shownGates: ${status.blockers.gateSampleCount}`,
      ...(status.blockers.gates.length
        ? status.blockers.gates.map((gate) => `- ${gate.taskId} | ${gate.gateId} | ${gate.reason}`)
        : ['- none']),
      '',
      '## Runtime Summary',
      `- taskSsot.total: ${status.runtime.taskSsot.total}`,
      `- taskSsot.active: ${status.runtime.taskSsot.active}`,
      `- taskSsot.inReview: ${status.runtime.taskSsot.inReview}`,
      `- taskSsot.blocked: ${status.runtime.taskSsot.blocked}`,
      `- documentGovernance.issueCount: ${status.runtime.documentGovernance?.issueCount ?? 'not-run'}`,
      '',
      '## Latest Checkpoints',
      ...(status.latestCheckpoints.length
        ? status.latestCheckpoints.map((checkpoint) => `- ${checkpoint.timestamp} | ${checkpoint.taskId ?? '-'} | ${checkpoint.label}`)
        : ['- none']),
      '',
    ].join('\n');
  }
}

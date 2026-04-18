import type {
  TaskPriority,
  WorkflowStageCapability,
  WorkflowStageDefinition,
  WorkflowStageRun,
} from '../shared/schemas.js';
import type { FileStore } from '../core/fileStore.js';
import type { MemoryService } from '../core/memoryService.js';

export type LangGraphState = {
  runId: string;
  currentStageId: string | null;
  stages: Record<string, WorkflowStageRun>;
  context: Record<string, unknown>;
  messages: string[];
  artifacts: ArtifactRecord[];
  status: 'running' | 'completed' | 'blocked' | 'needs-rework';
  rework?: {
    sourceStageId: string;
    targetStageId: string;
    reason: string;
    triggeredAt: string;
  };
};

export type ArtifactRecord = {
  id: string;
  stageId: string;
  path: string;
  type: string;
  content: string;
};

type LegacyWorkflowStageDefinition = Omit<WorkflowStageDefinition, 'order' | 'requiredOutputs' | 'priority' | 'capability' | 'gate'> & {
  order?: number;
  requiredOutputs: Array<{
    path: string;
    kind: string;
    required?: boolean;
  }>;
  priority: string;
  capability: string;
  gate: {
    reviewRequired: boolean;
    allowRework?: boolean;
  };
};

export type LangGraphConfig = {
  workflowId: string;
  stages: Array<WorkflowStageDefinition | LegacyWorkflowStageDefinition>;
  subprojectId?: string | null;
};

export class LangGraphEngine {
  private state: LangGraphState | null = null;

  constructor(
    private readonly store: FileStore,
    private readonly memoryService: MemoryService,
  ) {
    void this.store;
    void this.memoryService;
  }

  async initWorkflow(config: LangGraphConfig): Promise<LangGraphState> {
    const runId = `langgraph-${Date.now()}`;
    const now = new Date().toISOString();
    const normalizedStages = config.stages.map((stage, index) => this.normalizeStage(stage, index));
    const stages: Record<string, WorkflowStageRun> = {};

    for (const [index, stage] of normalizedStages.entries()) {
      stages[stage.id] = {
        id: stage.id,
        label: stage.label,
        ownerRole: stage.ownerRole,
        description: stage.description,
        acceptanceCriteria: stage.acceptanceCriteria,
        requiredOutputs: stage.requiredOutputs,
        priority: stage.priority,
        capability: stage.capability,
        dependsOn: stage.dependsOn,
        gate: stage.gate,
        status: index === 0 ? 'active' : 'pending',
        outputPaths: [],
        startedAt: index === 0 ? now : null,
        completedAt: null,
        blockedReason: null,
        attemptCount: index === 0 ? 1 : 0,
        summary: null,
        metadata: {
          order: stage.order,
        },
      };
    }

    this.state = {
      runId,
      currentStageId: normalizedStages[0]?.id ?? null,
      stages,
      context: {
        workflowId: config.workflowId,
        subprojectId: config.subprojectId ?? null,
      },
      messages: [],
      artifacts: [],
      status: 'running',
    };

    return this.state;
  }

  async step(): Promise<LangGraphState> {
    if (!this.state || this.state.status !== 'running') {
      throw new Error('Workflow is not running');
    }

    const currentStageId = this.state.currentStageId;
    if (!currentStageId) {
      this.state.status = 'completed';
      return this.state;
    }

    const currentStage = this.state.stages[currentStageId];
    if (!currentStage) {
      throw new Error(`Unknown stage: ${currentStageId}`);
    }

    const result = await this.executeStage(currentStage);

    this.state.stages[currentStageId] = {
      ...currentStage,
      ...result.stage,
    };

    if (result.artifacts) {
      this.state.artifacts.push(...result.artifacts);
    }

    if (result.needsRework) {
      const targetStageId = this.findReworkTarget(currentStageId);
      if (targetStageId) {
        this.state.status = 'needs-rework';
        this.state.rework = {
          sourceStageId: currentStageId,
          targetStageId,
          reason: result.blockedReason ?? 'Review requested rework',
          triggeredAt: new Date().toISOString(),
        };
        this.state.stages[targetStageId] = {
          ...this.state.stages[targetStageId],
          status: 'blocked',
          blockedReason: this.state.rework.reason,
        };
        return this.state;
      }
    }

    if (result.blockedReason) {
      this.state.stages[currentStageId] = {
        ...this.state.stages[currentStageId],
        status: 'blocked',
        blockedReason: result.blockedReason,
      };
      this.state.status = 'blocked';
      return this.state;
    }

    this.state.stages[currentStageId] = {
      ...this.state.stages[currentStageId],
      status: 'completed',
      completedAt: new Date().toISOString(),
    };

    const nextStageId = this.findNextStage(currentStageId);
    this.state.currentStageId = nextStageId;

    if (!nextStageId) {
      this.state.status = 'completed';
    } else {
      this.state.stages[nextStageId] = {
        ...this.state.stages[nextStageId],
        status: 'active',
        startedAt: new Date().toISOString(),
        attemptCount: Math.max(this.state.stages[nextStageId].attemptCount, 1),
      };
    }

    return this.state;
  }

  getState(): LangGraphState | null {
    return this.state;
  }

  restoreState(state: LangGraphState) {
    this.state = state;
  }

  private async executeStage(stage: WorkflowStageRun): Promise<{
    stage: Partial<WorkflowStageRun>;
    artifacts?: ArtifactRecord[];
    blockedReason?: string | null;
    needsRework?: boolean;
  }> {
    const artifacts: ArtifactRecord[] = stage.requiredOutputs.map((output, index) => ({
      id: `${stage.id}-${index + 1}`,
      stageId: stage.id,
      path: this.materializeArtifactPath(stage.id, output.path, output.kind, index),
      type: output.kind,
      content: `Output for ${stage.label}`,
    }));

    return {
      stage: {
        outputPaths: artifacts.map((artifact) => artifact.path),
        summary: `${stage.label} completed with ${artifacts.length} artifact(s)`,
      },
      artifacts,
      blockedReason: null,
      needsRework: false,
    };
  }

  private materializeArtifactPath(
    stageId: string,
    templatePath: string,
    kind: WorkflowStageDefinition['requiredOutputs'][number]['kind'],
    index: number,
  ) {
    if (!templatePath.includes('*')) {
      return templatePath;
    }

    const extension = kind === 'json' ? '.json' : kind === 'code' ? '.ts' : kind === 'config' ? '.json' : '.md';
    return templatePath.replace('*', `${stageId}-output-${index + 1}${extension}`);
  }

  private findNextStage(currentStageId: string): string | null {
    if (!this.state) {
      return null;
    }

    const stageIds = Object.keys(this.state.stages);
    const currentIndex = stageIds.indexOf(currentStageId);

    for (let index = currentIndex + 1; index < stageIds.length; index += 1) {
      const stageId = stageIds[index];
      const stage = this.state.stages[stageId];
      const dependenciesReady = stage.dependsOn.every((dependencyId) => this.state?.stages[dependencyId]?.status === 'completed');

      if (dependenciesReady && stage.status === 'pending') {
        return stageId;
      }
    }

    return null;
  }

  private findReworkTarget(currentStageId: string): string | null {
    if (!this.state) {
      return null;
    }

    const stageIds = Object.keys(this.state.stages);
    const currentIndex = stageIds.indexOf(currentStageId);
    return currentIndex > 0 ? stageIds[currentIndex - 1] : null;
  }

  private normalizeStage(
    stage: WorkflowStageDefinition | LegacyWorkflowStageDefinition,
    index: number,
  ): WorkflowStageDefinition {
    return {
      ...stage,
      order: stage.order ?? index + 1,
      requiredOutputs: stage.requiredOutputs.map((output) => ({
        path: output.path,
        kind: this.normalizeArtifactKind(output.kind),
        required: output.required ?? true,
      })),
      priority: this.normalizePriority(stage.priority),
      capability: this.normalizeCapability(stage.capability),
      gate: {
        reviewRequired: stage.gate.reviewRequired,
        allowRework: stage.gate.allowRework ?? stage.gate.reviewRequired,
      },
    };
  }

  private normalizePriority(priority: LegacyWorkflowStageDefinition['priority']): TaskPriority {
    switch (priority) {
      case 'high':
        return 'P0';
      case 'medium':
        return 'P1';
      case 'low':
        return 'P2';
      case 'P0':
      case 'P1':
      case 'P2':
        return priority;
      default:
        return 'P1';
    }
  }

  private normalizeCapability(capability: LegacyWorkflowStageDefinition['capability']): WorkflowStageCapability {
    switch (capability) {
      case 'code':
        return 'text';
      case 'text-multimodal':
        return 'multimodal';
      case 'system':
      case 'text':
      case 'review':
      case 'multimodal':
        return capability;
      default:
        return 'text';
    }
  }

  private normalizeArtifactKind(kind: string): WorkflowStageDefinition['requiredOutputs'][number]['kind'] {
    switch (kind) {
      case 'markdown':
        return 'document';
      case 'document':
      case 'json':
      case 'code':
      case 'config':
        return kind;
      default:
        return 'document';
    }
  }
}

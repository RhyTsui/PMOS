import { FileStore } from './fileStore.js';
import { MemoryService } from './memoryService.js';
import { prefixProjectPath } from './projectPaths.js';
import type {
  Artifact,
  CommitteeReport,
  WorkflowDefinition,
  WorkflowEvent,
  WorkflowMetrics,
  WorkflowRun,
} from '../shared/schemas.js';

export class WorkflowEngine {
  constructor(
    private readonly store: FileStore,
    private readonly memoryService = new MemoryService(store),
  ) {}

  async loadDefinition(projectRoot = ''): Promise<WorkflowDefinition> {
    return {
      id: 'pmaios-main',
      name: 'PMAIOS v0.6 主工作流',
      version: '0.6.0',
      defaultLocale: 'zh-CN',
      sourceMarkdownPath: 'workflows/main.md',
      executionMarkdownPath: 'workflows/execution.md',
      stages: [
        {
          id: 'core-definition-baseline',
          label: '核心定义基线',
          order: 1,
          ownerRole: '产品架构负责人',
          description: '统一 PMAIOS v0.6 的闭环目标、边界、非目标与阶段验收语义。',
          acceptanceCriteria: ['明确 v0.6 闭环目标', '明确本轮边界', '明确非目标与验收口径'],
          requiredOutputs: [
            {
              path: prefixProjectPath(projectRoot, 'docs/implementation/baseline/*.md'),
              kind: 'document',
              required: true,
            },
            {
              path: prefixProjectPath(projectRoot, 'docs/tasks/*.md'),
              kind: 'document',
              required: true,
            },
          ],
          priority: 'P0',
          capability: 'system',
          dependsOn: [],
          gate: {
            reviewRequired: false,
            allowRework: true,
          },
        },
        {
          id: 'schema-contract-upgrade',
          label: 'Schema 与契约升级',
          order: 2,
          ownerRole: '核心工程师',
          description: '补齐 workflow/task/review/execution/requirement/version/observability 的 v0.6 typed schema。',
          acceptanceCriteria: ['可表达优先级与依赖', '可表达 gate 与返工', '可表达 requirement/version/trace 关联'],
          requiredOutputs: [
            {
              path: prefixProjectPath(projectRoot, 'docs/implementation/schema/*.md'),
              kind: 'document',
              required: true,
            },
          ],
          priority: 'P0',
          capability: 'text',
          dependsOn: ['core-definition-baseline'],
          gate: {
            reviewRequired: false,
            allowRework: true,
          },
        },
        {
          id: 'orchestrator-kernel',
          label: 'Orchestrator 内核调度',
          order: 3,
          ownerRole: 'Orchestrator Engineer',
          description: '把阶段推进器升级为带 gate、依赖、返工、追踪与恢复推进能力的内核调度器。',
          acceptanceCriteria: ['blocked 可追踪', 'needs-rework 可恢复', '调度语义与事件日志一致'],
          requiredOutputs: [
            {
              path: prefixProjectPath(projectRoot, 'docs/implementation/orchestrator/*.md'),
              kind: 'document',
              required: true,
            },
          ],
          priority: 'P0',
          capability: 'text',
          dependsOn: ['schema-contract-upgrade'],
          gate: {
            reviewRequired: false,
            allowRework: true,
          },
        },
        {
          id: 'capability-slots',
          label: 'Stage Execution / Capability 插槽',
          order: 4,
          ownerRole: 'Runtime Engineer',
          description: '统一 text / review / multimodal 等能力路径，为未来 tool/provider 接入保留边界。',
          acceptanceCriteria: ['stage runner 输入输出稳定', 'capability 路径清晰', 'provider/tool 插槽边界清晰'],
          requiredOutputs: [
            {
              path: prefixProjectPath(projectRoot, 'docs/implementation/capability/*.md'),
              kind: 'document',
              required: true,
            },
          ],
          priority: 'P0',
          capability: 'text',
          dependsOn: ['orchestrator-kernel'],
          gate: {
            reviewRequired: false,
            allowRework: true,
          },
        },
        {
          id: 'memory-context-trace',
          label: 'Memory / Context / Trace',
          order: 5,
          ownerRole: 'State Engineer',
          description: '统一 run、chat、context snapshot、artifact refs 与 execution trace 的 file-based 持久化视图。',
          acceptanceCriteria: ['输入/上下文/事件/产物可串联', '平台与子项目边界清晰', 'trace 查询可读'],
          requiredOutputs: [
            {
              path: prefixProjectPath(projectRoot, 'docs/memory/trace/*.md'),
              kind: 'document',
              required: true,
            },
          ],
          priority: 'P1',
          capability: 'text',
          dependsOn: ['capability-slots'],
          gate: {
            reviewRequired: false,
            allowRework: true,
          },
        },
        {
          id: 'operations-surface',
          label: 'API / CLI / Frontend 操作面',
          order: 6,
          ownerRole: '体验集成工程师',
          description: '形成 Workflow Viewer + Run Console 的统一操作面，并暴露 requirement/version/observability 入口。',
          acceptanceCriteria: ['CLI/API/Frontend 共享同一运行模型', '操作面可观测', '需求/版本/trace 路径可挂接'],
          requiredOutputs: [
            {
              path: prefixProjectPath(projectRoot, 'docs/multimodal/*.md'),
              kind: 'document',
              required: true,
            },
            {
              path: prefixProjectPath(projectRoot, 'docs/multimodal/*.json'),
              kind: 'json',
              required: true,
            },
          ],
          priority: 'P1',
          capability: 'multimodal',
          dependsOn: ['memory-context-trace'],
          gate: {
            reviewRequired: false,
            allowRework: true,
          },
        },
        {
          id: 'review-metrics-telemetry',
          label: 'Review / Metrics / Telemetry',
          order: 7,
          ownerRole: '评审委员会',
          description: '让 gate、metrics、review、execution observability 形成可阻塞、可返工、可恢复推进的统一闭环。',
          acceptanceCriteria: ['为什么通过/阻塞/返工可解释', 'metrics 可反映阶段状态', 'review 与 observability 可驱动闭环'],
          requiredOutputs: [
            {
              path: prefixProjectPath(projectRoot, 'docs/review/*.json'),
              kind: 'json',
              required: true,
            },
          ],
          priority: 'P2',
          capability: 'review',
          dependsOn: ['operations-surface'],
          gate: {
            reviewRequired: true,
            allowRework: true,
          },
        },
        {
          id: 'regression-acceptance',
          label: '测试回归与升级验收',
          order: 8,
          ownerRole: '质量负责人',
          description: '总结 build/lint/test 与闭环主链路验收结果，形成本轮升级收口结论。',
          acceptanceCriteria: ['主链路可回归验证', '核心风险有结论', '输出下一步闭环收口建议'],
          requiredOutputs: [
            {
              path: prefixProjectPath(projectRoot, 'docs/iteration/*.md'),
              kind: 'document',
              required: true,
            },
          ],
          priority: 'P2',
          capability: 'text',
          dependsOn: ['review-metrics-telemetry'],
          gate: {
            reviewRequired: false,
            allowRework: false,
          },
        },
      ],
    };
  }

  async loadRun(runId: string, subprojectId?: string | null): Promise<WorkflowRun> {
    return this.memoryService.loadRunSnapshot(runId, subprojectId);
  }

  async listRuns(subprojectId?: string | null): Promise<WorkflowRun[]> {
    const runIds = await this.memoryService.listRunIds(subprojectId);
    const runs = await Promise.all(
      runIds.map(async (runId) => {
        try {
          return await this.loadRun(runId);
        } catch {
          return null;
        }
      }),
    );
    return runs.filter((run): run is WorkflowRun => run !== null).sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
  }

  async listArtifacts(run: WorkflowRun): Promise<Artifact[]> {
    return run.stages.flatMap((stage) =>
      stage.outputPaths.map((path, index) => ({
        id: `${stage.id}-${index + 1}`,
        runId: run.id,
        stageId: stage.id,
        title: `${stage.label} 产物 ${index + 1}`,
        path,
        stage: stage.label,
        type: path.endsWith('.json') ? 'json' : path.endsWith('.ts') ? 'code' : 'document',
      })),
    );
  }

  async hydrateArtifacts(run: WorkflowRun): Promise<Array<Artifact & { content: string }>> {
    const artifacts = await this.listArtifacts(run);
    return Promise.all(
      artifacts.map(async (artifact) => ({
        ...artifact,
        content: await this.store.read(artifact.path),
      })),
    );
  }

  async loadEvents(runId: string, subprojectId?: string | null): Promise<WorkflowEvent[]> {
    return this.memoryService.loadEvents(runId, subprojectId);
  }

  async buildMetrics(run: WorkflowRun, review: CommitteeReport | null): Promise<WorkflowMetrics> {
    const artifacts = await this.listArtifacts(run);
    const completedStages = run.stages.filter((stage) => stage.status === 'completed').length;
    const blockedStages = run.stages.filter((stage) => stage.status === 'blocked').length;
    const reviewIssueCount = review ? review.roles.reduce((count, role) => count + role.issues.length, 0) : 0;
    const passCount = review
      ? review.roles.reduce(
          (count, role) => count + role.issues.filter((issue) => issue.decision === 'Pass').length,
          0,
        )
      : 0;
    const conditionalCount = review
      ? review.roles.reduce(
          (count, role) => count + role.issues.filter((issue) => issue.decision === 'Conditional').length,
          0,
        )
      : 0;

    return {
      runId: run.id,
      generatedAt: new Date().toISOString(),
      totalStages: run.stages.length,
      completedStages,
      artifactCount: artifacts.length,
      reviewIssueCount,
      passCount,
      conditionalCount,
      blockedStages,
      reworkCount: run.reworkCount,
      completionRate: run.stages.length === 0 ? 0 : completedStages / run.stages.length,
      stageMetrics: run.stages.map((stage) => ({
        stageId: stage.id,
        label: stage.label,
        status: stage.status,
        outputCount: stage.outputPaths.length,
        requiredOutputCount: stage.requiredOutputs.length,
        attemptCount: stage.attemptCount,
      })),
    };
  }
}

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
      name: 'PMAIOS v0.7 产品交付主链',
      version: '0.7.0',
      defaultLocale: 'zh-CN',
      sourceMarkdownPath: 'workflows/product-management.md',
      executionMarkdownPath: 'workflows/execution.md',
      stages: [
        {
          id: 'research-document',
          label: '调研文档',
          order: 1,
          ownerRole: 'Research PM',
          description: '先完成事实调研、竞品与开源方案评估，避免直接跳到方案和实现。',
          acceptanceCriteria: ['问题与场景定义清楚', '开源优先与 build-vs-buy 结论明确', '风险与待确认问题成文'],
          requiredOutputs: [
            {
              path: prefixProjectPath(projectRoot, 'docs/research/*.md'),
              kind: 'document',
              required: true,
            },
          ],
          priority: 'P0',
          capability: 'text',
          dependsOn: [],
          gate: {
            reviewRequired: false,
            allowRework: true,
          },
        },
        {
          id: 'planning-document',
          label: '规划文档',
          order: 2,
          ownerRole: 'Planning PM',
          description: '把调研结论收口为版本规划、范围边界、依赖与里程碑。',
          acceptanceCriteria: ['版本目标与范围边界明确', '依赖与优先级明确', '里程碑和推进顺序可执行'],
          requiredOutputs: [
            {
              path: prefixProjectPath(projectRoot, 'docs/planning/*.md'),
              kind: 'document',
              required: true,
            },
          ],
          priority: 'P0',
          capability: 'text',
          dependsOn: ['research-document'],
          gate: {
            reviewRequired: false,
            allowRework: true,
          },
        },
        {
          id: 'requirements-document',
          label: '需求文档',
          order: 3,
          ownerRole: 'Requirements PM',
          description: '把规划拆成可治理需求，明确用户场景、约束、验收标准与需求池落点。',
          acceptanceCriteria: ['用户需求和产品需求双层映射明确', '验收标准可追溯', '需求池有正式落点'],
          requiredOutputs: [
            {
              path: prefixProjectPath(projectRoot, 'docs/requirements/*.md'),
              kind: 'document',
              required: true,
            },
            {
              path: prefixProjectPath(projectRoot, 'docs/review/requirements-*.json'),
              kind: 'json',
              required: true,
            },
          ],
          priority: 'P0',
          capability: 'text',
          dependsOn: ['planning-document'],
          gate: {
            reviewRequired: true,
            allowRework: true,
          },
        },
        {
          id: 'functional-specification',
          label: '功能文档',
          order: 4,
          ownerRole: 'Solution PM',
          description: '把需求定义成模块、流程、状态、边界和功能契约，作为设计与研发共同上游。',
          acceptanceCriteria: ['模块边界明确', '流程和状态机可实现', '前后端契约基础齐全'],
          requiredOutputs: [
            {
              path: prefixProjectPath(projectRoot, 'docs/functional/*.md'),
              kind: 'document',
              required: true,
            },
            {
              path: prefixProjectPath(projectRoot, 'docs/review/functional-*.json'),
              kind: 'json',
              required: true,
            },
          ],
          priority: 'P0',
          capability: 'text',
          dependsOn: ['requirements-document'],
          gate: {
            reviewRequired: true,
            allowRework: true,
          },
        },
        {
          id: 'design-document',
          label: '设计文档',
          order: 5,
          ownerRole: 'Product Designer',
          description: '在正式前端交付前，固化页面清单、信息架构、关键交互流程、状态设计和组件约束。',
          acceptanceCriteria: ['页面清单与导航结构明确', '关键流程、状态流转与异常态明确', '设计约束足以支撑交付级前端页面实现'],
          requiredOutputs: [
            {
              path: prefixProjectPath(projectRoot, 'docs/design/*.md'),
              kind: 'document',
              required: true,
            },
            {
              path: prefixProjectPath(projectRoot, 'docs/review/design-*.json'),
              kind: 'json',
              required: true,
            },
          ],
          priority: 'P1',
          capability: 'text',
          dependsOn: ['functional-specification'],
          gate: {
            reviewRequired: true,
            allowRework: true,
          },
        },
        {
          id: 'frontend-page',
          label: '前端页面',
          order: 6,
          ownerRole: 'Frontend Delivery Designer',
          description: '直接输出面向用户、可交互、可联调的交付级前端页面包，验证布局、模块合理性、用户体验流程与动态交互。',
          acceptanceCriteria: ['页面布局、导航与模块职责通过用户视角校验', '关键流程、空态、异常态、反馈态和动态交互明确', '页面输出已达到可交付前端实现标准并显式绑定 UI 规范'],
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
              {
                path: prefixProjectPath(projectRoot, 'docs/review/frontend-page-*.json'),
                kind: 'json',
                required: true,
              },
              {
                path: prefixProjectPath(projectRoot, 'docs/review/frontend-browser-verification-*.json'),
                kind: 'json',
                required: true,
              },
            ],
          priority: 'P1',
          capability: 'multimodal',
          dependsOn: ['design-document'],
          gate: {
            reviewRequired: true,
            allowRework: true,
          },
        },
        {
          id: 'data-schema',
          label: '数据表',
          order: 7,
          ownerRole: 'Data Architect',
          description: '把功能与页面状态收口为数据模型、字段、关系、索引和审计要求。',
          acceptanceCriteria: ['核心实体和关系明确', '字段与状态可支撑前后端', '关键索引与审计要求明确'],
          requiredOutputs: [
            {
              path: prefixProjectPath(projectRoot, 'docs/data-schema/*.md'),
              kind: 'document',
              required: true,
            },
            {
              path: prefixProjectPath(projectRoot, 'docs/review/data-schema-*.json'),
              kind: 'json',
              required: true,
            },
          ],
          priority: 'P1',
          capability: 'text',
          dependsOn: ['frontend-page'],
          gate: {
            reviewRequired: true,
            allowRework: true,
          },
        },
        {
          id: 'backend-api',
          label: '后端接口',
          order: 8,
          ownerRole: 'Backend Engineer',
          description: '基于功能文档与数据模型定义接口、错误语义、权限边界与联调约束。',
          acceptanceCriteria: ['接口契约覆盖主流程', '错误与权限边界明确', '联调前置条件齐全'],
          requiredOutputs: [
            {
              path: prefixProjectPath(projectRoot, 'docs/backend-api/*.md'),
              kind: 'document',
              required: true,
            },
            {
              path: prefixProjectPath(projectRoot, 'docs/review/backend-api-*.json'),
              kind: 'json',
              required: true,
            },
          ],
          priority: 'P1',
          capability: 'text',
          dependsOn: ['data-schema'],
          gate: {
            reviewRequired: true,
            allowRework: true,
          },
        },
        {
          id: 'frontend-backend-integration',
          label: '联调与验收',
          order: 9,
          ownerRole: 'Delivery PM',
          description: '执行前后端联调、验收回查、阻塞收口和交付结论沉淀，作为主链最终 review gate。',
          acceptanceCriteria: ['主流程联调完成', '阻塞项有归因和整改结论', '验收结论、遗留项与交接动作明确'],
          requiredOutputs: [
            {
              path: prefixProjectPath(projectRoot, 'docs/integration/*.md'),
              kind: 'document',
              required: true,
            },
            {
              path: prefixProjectPath(projectRoot, 'docs/review/*.json'),
              kind: 'json',
              required: true,
            },
          ],
          priority: 'P1',
          capability: 'review',
          dependsOn: ['backend-api'],
          gate: {
            reviewRequired: true,
            allowRework: true,
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
    const hydrated = await Promise.all(
      artifacts.map(async (artifact) => {
        try {
          return {
            ...artifact,
            content: await this.store.read(artifact.path),
          };
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            console.warn(`Skipping missing artifact for run ${run.id}: ${artifact.path}`);
            return null;
          }

          throw error;
        }
      }),
    );

    return hydrated.filter((artifact): artifact is Artifact & { content: string } => artifact !== null);
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

import type { Artifact, CommitteeReport, TaskSsotTask, WorkflowRun, WorkflowStageRun } from '../shared/schemas.js';
import type { ProviderExecutionBundle } from './modelProvider.js';
import { ContextInjectionService } from './contextInjectionService.js';
import { FileStore } from './fileStore.js';
import { FrontendBrowserVerificationService } from './frontendBrowserVerificationService.js';
import { MemoryService } from './memoryService.js';
import { PipelineLauncherService } from './pipelineLauncherService.js';
import { ProviderRouter } from './providerRouter.js';
import { SkillRegistry, type SkillDefinition } from './skillRegistry.js';

export class StageRunners {
  private readonly skillRegistry: SkillRegistry;
  private readonly providerRouter: ProviderRouter;
  private readonly contextInjectionService: ContextInjectionService;
  private readonly pipelineLauncherService: PipelineLauncherService;
  private readonly frontendBrowserVerificationService: FrontendBrowserVerificationService;
  private readonly executionCache = new Map<string, ProviderExecutionBundle>();

  constructor(
    private readonly store: FileStore,
    private readonly memoryService: MemoryService,
  ) {
    this.skillRegistry = new SkillRegistry(store);
    this.providerRouter = new ProviderRouter(store);
    this.contextInjectionService = new ContextInjectionService();
    this.pipelineLauncherService = new PipelineLauncherService();
    this.frontendBrowserVerificationService = new FrontendBrowserVerificationService(store.resolve('.'));
  }

  async buildArtifactContent(input: {
    run: WorkflowRun;
    stage: WorkflowStageRun;
    artifactPath: string;
    artifactKind: Artifact['type'];
    reviewReport: CommitteeReport | null;
    existingOutputPaths?: string[];
  }): Promise<string> {
    const { run, stage, artifactPath, artifactKind, reviewReport } = input;
    const skills = await this.listSkillsForStage(stage.id, run.subprojectId);

    if (artifactKind === 'json' && /frontend-browser-verification/iu.test(artifactPath)) {
      return this.buildFrontendBrowserVerificationArtifact(run, stage, artifactPath, input.existingOutputPaths ?? []);
    }

    if (stage.capability === 'multimodal') {
      const execution = await this.getOrCreateMultimodalExecution(run, stage);
      if (artifactKind === 'json') {
        return JSON.stringify(execution.result, null, 2);
      }

      return this.buildMultimodalMarkdownArtifact(run, stage, artifactPath, execution);
    }

    if (artifactKind === 'json') {
      return JSON.stringify(reviewReport ?? this.buildFallbackReview(run, stage, skills), null, 2);
    }

    const projectMemory = await this.loadProjectMemorySnippet(run.memory.projectMemoryPath);
    return this.buildMarkdownArtifact(run, stage, artifactPath, skills, projectMemory);
  }

  getExecutionBundle(runId: string, stageId: string): ProviderExecutionBundle | null {
    return this.executionCache.get(this.getExecutionCacheKey(runId, stageId)) ?? null;
  }

  private async getOrCreateMultimodalExecution(run: WorkflowRun, stage: WorkflowStageRun): Promise<ProviderExecutionBundle> {
    const cacheKey = this.getExecutionCacheKey(run.id, stage.id);
    const cached = this.executionCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const projectName = run.projectName;
    const projectDescription = run.subprojectId
      ? `这是业务子项目 ${run.projectName} 的阶段产物。`
      : '这是 AI OS 母体平台的阶段产物。';
    const runtimeContext = this.buildStageRuntimeContext(run, stage);

    const execution = await this.providerRouter.execute(
      {
        runId: run.id,
        stageId: stage.id,
        capability: 'text-multimodal',
        prompt: [
          `你正在为 ${projectName} 生成多模态阶段摘要。`,
          `runId: ${run.id}`,
          `stageId: ${stage.id}`,
          `工作流名称: ${run.name}`,
          `项目根目录: ${run.projectRoot || '.'}`,
          projectDescription,
          `协作等级: ${runtimeContext.contextBundle.collaborationLevel}`,
          `项目标签: ${runtimeContext.contextBundle.projectLabel}`,
          `当前阶段: ${runtimeContext.contextBundle.currentStage ?? stage.id}`,
          `激活 gate: ${runtimeContext.contextBundle.activeGateIds.join(', ') || '-'}`,
          `阻塞 gate: ${runtimeContext.contextBundle.blockedGateIds.join(', ') || '-'}`,
          `恢复锚点: ${runtimeContext.contextBundle.resumeAnchor ?? '-'}`,
          `下一安全步: ${runtimeContext.contextBundle.nextSafeStep ?? '-'}`,
          `下游 readiness: ${runtimeContext.pipelineLauncher.map((plan) => `${plan.label}:${plan.status}`).join(' / ') || '-'}`,
          `请输出一份中文多模态交付说明，至少包含：展示脚本、视觉说明、交互重点、适合 dashboard 展示的总结。`,
        ].join('\n'),
      },
      run,
    );

    this.executionCache.set(cacheKey, execution);
    return execution;
  }

  private getExecutionCacheKey(runId: string, stageId: string) {
    return `${runId}:${stageId}`;
  }

  private async loadProjectMemorySnippet(projectMemoryPath: string) {
    try {
      const content = await this.store.read(projectMemoryPath);
      return content
        .split(/\r?\n/u)
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 6);
    } catch {
      return ['# Project Memory', '当前尚无额外项目记忆，使用 workflow 默认规则执行。'];
    }
  }

  private async listSkillsForStage(stageId: string, subprojectId?: string | null) {
    try {
      const direct = await this.skillRegistry.listSkillsForStage(stageId, subprojectId);
      const aliases = this.getLegacyStageAliases(stageId);
      const resolved = await Promise.all(aliases.map((alias) => this.skillRegistry.listSkillsForStage(alias, subprojectId)));
      return [...direct, ...resolved.flat()].filter(
        (skill, index, items) => items.findIndex((candidate) => candidate.id === skill.id) === index,
      );
    } catch {
      return [];
    }
  }

  private buildMarkdownArtifact(
    run: WorkflowRun,
    stage: WorkflowStageRun,
    artifactPath: string,
    skills: SkillDefinition[],
    projectMemory: string[],
  ) {
    const sections = this.getStageSections(run, stage.id, skills);
    const runtimeContext = this.buildStageRuntimeContext(run, stage);

    return [
      `# ${stage.label}`,
      '',
      '## 运行上下文',
      `- projectName: ${run.projectName}`,
      `- subprojectId: ${run.subprojectId ?? 'platform'}`,
      `- projectRoot: ${run.projectRoot || '.'}`,
      `- runId: ${run.id}`,
      `- stageId: ${stage.id}`,
      `- ownerRole: ${stage.ownerRole}`,
      `- capability: ${stage.capability}`,
      `- priority: ${stage.priority}`,
      `- artifactPath: ${artifactPath}`,
      `- currentStage: ${run.currentStageId ?? 'completed'}`,
      '',
      '## Context Injection Bundle',
      `- collaborationLevel: ${runtimeContext.contextBundle.collaborationLevel}`,
      `- projectLabel: ${runtimeContext.contextBundle.projectLabel}`,
      `- currentStage: ${runtimeContext.contextBundle.currentStage ?? stage.id}`,
      `- activeGateIds: ${runtimeContext.contextBundle.activeGateIds.join(' / ') || '-'}`,
      `- blockedGateIds: ${runtimeContext.contextBundle.blockedGateIds.join(' / ') || '-'}`,
      `- truthRefs: ${runtimeContext.contextBundle.truthRefs.join(' / ') || '-'}`,
      `- reviewEvidenceRefs: ${runtimeContext.contextBundle.reviewEvidenceRefs.join(' / ') || '-'}`,
      `- syncTargets: ${runtimeContext.contextBundle.syncTargets.join(' / ') || '-'}`,
      `- resumeAnchor: ${runtimeContext.contextBundle.resumeAnchor ?? '-'}`,
      `- nextSafeStep: ${runtimeContext.contextBundle.nextSafeStep ?? '-'}`,
      `- redlines: ${runtimeContext.contextBundle.redlines.join(' / ') || '-'}`,
      '',
      '## Pipeline Launcher',
      ...(runtimeContext.pipelineLauncher.length > 0
        ? runtimeContext.pipelineLauncher.flatMap((plan) => [
            `### ${plan.label}`,
            `- status: ${plan.status}`,
            `- trigger: ${plan.trigger}`,
            `- targetStages: ${plan.targetStages.join(' / ') || '-'}`,
            `- missingInputs: ${plan.missingInputs.join(' / ') || '-'}`,
            `- nextAction: ${plan.nextAction ?? '-'}`,
            '',
          ])
        : ['- 当前没有下游启动计划。', '']),
      '## 方法参考 Skills',
      ...(skills.length > 0
        ? skills.flatMap((skill) => [
            `### ${skill.name}`,
            `- id: ${skill.id}`,
            `- category: ${skill.category}`,
            `- description: ${skill.description}`,
            `- prompt: ${skill.promptPath}`,
            `- outputs: ${skill.outputs.join(' / ')}`,
            '',
          ])
        : ['- 当前阶段未绑定独立 skill，按 execution rules 执行。', '']),
      '## 项目记忆摘录',
      ...projectMemory.map((line) => `- ${line.replace(/^#\s*/u, '')}`),
      '',
      '## Open Source First Assessment',
      '- build-vs-buy: Prefer mature open-source tools, reusable components, or managed services before custom implementation.',
      '- recommendation: Name the preferred external toolchain and define the integration boundary before writing bespoke code.',
      '- self-build-exception: Only hand-roll code when license, cost, security, performance, maintainability, or integration constraints block reuse.',
      '',
      '## 阶段说明',
      stage.description,
      '',
      '## 验收标准',
      ...stage.acceptanceCriteria.map((item) => `- ${item}`),
      '',
      ...sections,
    ].join('\n');
  }

  private buildMultimodalMarkdownArtifact(
    run: WorkflowRun,
    stage: WorkflowStageRun,
    artifactPath: string,
    execution: ProviderExecutionBundle,
  ) {
    const { result } = execution;
    const runtimeContext = this.buildStageRuntimeContext(run, stage);

    return [
      `# ${stage.label}`,
      '',
      '## 运行上下文',
      `- projectName: ${run.projectName}`,
      `- subprojectId: ${run.subprojectId ?? 'platform'}`,
      `- projectRoot: ${run.projectRoot || '.'}`,
      `- runId: ${run.id}`,
      `- stageId: ${stage.id}`,
      `- artifactPath: ${artifactPath}`,
      `- provider: ${result.providerName}`,
      `- capability: ${result.capability}`,
      `- model: ${result.model}`,
      `- status: ${result.status}`,
      '',
      '## Context Injection Bundle',
      `- collaborationLevel: ${runtimeContext.contextBundle.collaborationLevel}`,
      `- projectLabel: ${runtimeContext.contextBundle.projectLabel}`,
      `- currentStage: ${runtimeContext.contextBundle.currentStage ?? stage.id}`,
      `- activeGateIds: ${runtimeContext.contextBundle.activeGateIds.join(' / ') || '-'}`,
      `- blockedGateIds: ${runtimeContext.contextBundle.blockedGateIds.join(' / ') || '-'}`,
      `- resumeAnchor: ${runtimeContext.contextBundle.resumeAnchor ?? '-'}`,
      `- nextSafeStep: ${runtimeContext.contextBundle.nextSafeStep ?? '-'}`,
      '',
      '## Pipeline Launcher',
      ...(runtimeContext.pipelineLauncher.length > 0
        ? runtimeContext.pipelineLauncher.map((plan) => `- ${plan.label}: ${plan.status} / ${plan.nextAction ?? '-'}`)
        : ['- 当前没有下游启动计划。']),
      '',
      '## Provider 执行摘要',
      result.outputText ?? '当前没有生成可展示的文本内容。',
      '',
      '## 执行告警',
      `- ${result.warning ?? '无'}`,
      '',
      '## 执行错误',
      `- ${result.error ?? '无'}`,
      '',
      '## 可追踪资源',
      ...(result.assets.length > 0
        ? result.assets.map((asset, index) => `- 资源 ${index + 1}: ${asset.kind} / ${asset.mimeType ?? 'unknown'} / ${asset.uri ?? 'inline'}`)
        : ['- 当前未返回额外资源。']),
    ].join('\n');
  }

  private buildStageRuntimeContext(run: WorkflowRun, stage: WorkflowStageRun) {
    const syntheticTask = this.buildSyntheticTask(run, stage);
    return {
      contextBundle: this.contextInjectionService.buildBundle(syntheticTask, run),
      pipelineLauncher: this.pipelineLauncherService.buildPlans(syntheticTask, run),
    };
  }

  private buildSyntheticTask(run: WorkflowRun, stage: WorkflowStageRun): TaskSsotTask {
    const workflowTask = run.tasks.find((item) => item.stageId === stage.id) ?? null;
    const artifactLinks = [...new Set([...(workflowTask?.artifactPaths ?? []), ...stage.outputPaths])].map((artifactPath, index) => ({
      taskId: workflowTask?.id ?? `${run.id}-${stage.id}`,
      artifactType: 'workflow-artifact',
      artifactId: `${stage.id}-artifact-${index + 1}`,
      artifactPath,
      roleInTask: 'working-output' as const,
    }));
    return {
      taskId: workflowTask?.id ?? `${run.id}-${stage.id}`,
      sourceType: 'workflow-run-task',
      sourceRef: run.id,
      originalDemandRefs: [],
      subprojectId: run.subprojectId ?? null,
      title: workflowTask?.title ?? stage.label,
      summary: workflowTask?.summary ?? stage.summary ?? null,
      collaborationLevel: stage.gate.reviewRequired ? 'L2' : 'L1',
      status: workflowTask?.status === 'completed' ? 'completed' : workflowTask?.status === 'blocked' ? 'blocked' : 'ready_for_delivery',
      currentStage: stage.id,
      currentOwnerAgentId: `workflow-role:${stage.ownerRole}`,
      createdAt: run.generatedAt,
      updatedAt: run.updatedAt,
      stages: [],
      gateChecks: [],
      gateHistory: [],
      artifactLinks,
      agentAssignments: [],
      syncEnvelopes: [],
      continuation: {
        mainlineLabel: run.projectName,
        nextSafeStep: null,
        parkedLines: [],
        blockerType: null,
        resumeAnchor: run.memory.runStatePath,
        lastMeaningfulAdvanceAt: run.updatedAt,
        currentAttention: null,
      },
    };
  }

  private buildFrontendBrowserVerificationArtifact(
    run: WorkflowRun,
    stage: WorkflowStageRun,
    artifactPath: string,
    existingOutputPaths: string[],
  ) {
    const syntheticTask = this.buildSyntheticTask(run, {
      ...stage,
      outputPaths: [...new Set([...stage.outputPaths, ...existingOutputPaths])],
    });
    const report = {
      ...this.frontendBrowserVerificationService.evaluateTask(syntheticTask, run),
      artifactPath,
    };
    return JSON.stringify(report, null, 2);
  }

  private getStageSections(run: WorkflowRun, stageId: string, skills: SkillDefinition[]) {
    const skillLines = skills.map((skill) => `- ${skill.name}: ${skill.outputs.join('、')}`);

    switch (stageId) {
      case 'research-document':
        return [
          '## Competitive Analysis',
          '- 对目标问题做竞品、替代方案与开源能力扫描，先判断是否值得自研。',
          '- 输出 build-vs-buy 结论、关键差异点与版本适配风险。',
          '',
          '## 调研范围',
          '- 用户问题、目标角色、当前流程、竞品方案、开源方案、约束条件。',
          '- 只记录与本轮产品决策直接相关的事实、风险与待确认项。',
          '',
          '## 结论摘要',
          '- 先完成事实调研与方案比较，再进入需求与设计阶段。',
          ...skillLines,
        ];
      case 'core-definition-baseline':
        return [
          '## 基线目标',
          '- 面向 PMAIOS OS 内核升级，而不是业务子项目需求流转。',
          '- 本轮坚持骨架先行，先补齐契约、调度、观测与扩展插槽。',
          '',
          '## 范围边界',
          '- 顶层真源仍然是 docs / workflows / prompts / config。',
          '- 外部基础设施本轮只保留 adapter 边界与迁移位。',
          '',
          '## 当前结论',
          '- PMAIOS 需要从 demo-ish 骨架升级为可持续演进的内核底座。',
          '- 平台态与子项目态必须保持作用域隔离。',
          '',
          '## 方法参考',
          ...skillLines,
        ];
      case 'schema-contract-upgrade':
        return [
          '## 契约升级范围',
          '- WorkflowRun / WorkflowTask / WorkflowEvent / WorkflowMetrics 统一对齐 v0.3。',
          '- 增加 priority、dependsOn、gate、rework、summary、metadata 等字段。',
          '',
          '## 设计原则',
          '- API、CLI、前端消费同一运行模型。',
          '- 保持 file-based persistence，不引入额外状态源。',
          '',
          '## 关键对象',
          ...skillLines,
        ];
      case 'orchestrator-kernel':
        return [
          '## 调度语义',
          '- initRun 建立统一运行实例。',
          '- advanceRun 根据 capability、依赖与 gate 推进下一阶段。',
          '- needs-rework 恢复后保留原有 trace 与 gate 历史。',
          '',
          '## 关键行为',
          '- blocked / completed / needs-rework 三类状态均有事件记录。',
          '- 返工阶段通过 recommendedReworkStageId 或前序阶段推导。',
          '',
          '## 关注点',
          ...skillLines,
        ];
      case 'capability-slots':
        return [
          '## 能力插槽',
          '- system / text / review / multimodal 四类能力统一进 stage runtime。',
          '- provider/tool 接入走 capability 边界，而不是散落在业务代码中。',
          '',
          '## 执行层约定',
          '- text 阶段输出结构化 markdown。',
          '- review 阶段输出 committee report。',
          '- multimodal 阶段输出 markdown + manifest。',
          '',
          '## 可扩展点',
          ...skillLines,
        ];
      case 'memory-context-trace':
        return [
          '## Trace 视图',
          '- 任一 run 都应可看到输入、上下文、事件、产物与结果。',
          '- 平台态与子项目态通过路径前缀严格隔离。',
          '',
          '## 持久化边界',
          '- 继续采用 docs/memory 下的 file-based persistence。',
          '- 事件日志使用 jsonl，run snapshot 使用 json。',
          '',
          '## 扩展方向',
          ...skillLines,
        ];
      case 'operations-surface':
        return [
          '## 展示脚本',
          '- 展示当前 runId、当前阶段、最近事件与评审结论。',
          '- 从 Workflow Viewer 打开阶段产物与 review/metrics 面板。',
          '',
          '## 视觉说明',
          '- 首页强调当前运行实例与 stage trace。',
          '- 阶段卡片展示状态、产物路径、priority、blocked reason。',
          '',
          '## 交互重点',
          '- 通过 API/CLI 推进 stage。',
          '- 通过前端查看 artifact、context、metrics 与 review。',
        ];
      case 'review-metrics-telemetry':
        return [
          '## 评审结论',
          '- review gate 决定是否继续推进。',
          '- Conditional / Reject 都可驱动返工。',
          '',
          '## 指标口径',
          '- 记录阶段数、完成数、阻塞数、返工数、产物数与 issue 数。',
          '- 首版允许后续继续增加耗时、失败原因与 provider 维度。',
          '',
          '## 审计重点',
          ...skillLines,
        ];
      case 'regression-acceptance':
        return [
          '## 验收结论',
          '- 当前升级进入测试回归与收口阶段。',
          '',
          '## 验证范围',
          '- build / lint / test 主链路。',
          '- run init / advance / review / metrics / artifacts 路径。',
          '',
          '## 下一步建议',
          '- 补齐自动化测试覆盖。',
          '- 收敛 API、CLI、Frontend 对同一运行模型的消费。',
        ];
      default:
        return ['## Summary', `${stageId} 已生成最小可运行产物。`];
    }
  }

  private getLegacyStageAliases(stageId: string) {
    switch (stageId) {
      case 'core-definition-baseline':
        return ['industry-analysis', 'tasks'];
      case 'schema-contract-upgrade':
        return ['architecture'];
      case 'orchestrator-kernel':
        return ['architecture', 'development'];
      case 'capability-slots':
        return ['tasks', 'development'];
      case 'memory-context-trace':
        return ['development'];
      case 'operations-surface':
        return ['multimodal'];
      case 'review-metrics-telemetry':
        return ['review'];
      case 'regression-acceptance':
        return ['iteration'];
      default:
        return [];
    }
  }

  private buildFallbackReview(run: WorkflowRun, stage: WorkflowStageRun, skills: SkillDefinition[]): CommitteeReport {
    const reviewRequired = stage.gate.reviewRequired;
    const blocked = reviewRequired;
    const fallbackIssue = {
      title: '缺少真实 committee report',
      description: '当前评审产物仍是 fallback review，未生成真实委员会评审报告。',
      impact: 'review-required 阶段会失去机制约束，无法作为可交付的正式评审结论。',
      recommendation: '补跑真实 committee review，并回写正式的角色评审与 gate 结果。',
      expectedAnswer: '提供真实 committee report artifact，并明确各角色结论与 gate 决策。',
      decision: 'Conditional' as const,
    };

    return {
      overallConclusion: `${stage.label} 已形成结构化评审输出。`,
      nextStage: !blocked,
      reworkRequired: blocked,
      gate: {
        decision: blocked ? 'conditional' : 'pass',
        blocked,
        issueCount: blocked ? 1 : 0,
        blockingStageId: blocked ? stage.id : null,
      },
      roles: [
        {
          role: stage.ownerRole,
          summary: `${stage.label} 使用 ${skills.map((skill) => skill.name).join(' / ') || 'execution rules'} 完成评审。`,
          issues: blocked ? [fallbackIssue] : [],
        },
      ],
      hermes: {
        overallDecision: blocked ? 'block' : 'keep',
        summary: blocked
          ? 'Fallback review detected that a review-required stage is missing a real committee report.'
          : 'Default fallback review keeps the current stage package as baseline.',
        actions: [
          {
            action: blocked ? 'block' : 'keep',
            target: stage.id,
            reason: blocked
              ? 'Review-required stage cannot pass with fallback review only.'
              : 'Fallback review found no blocking issue in the default path.',
          },
        ],
        knowledgeGrounding: {
          configured: false,
          query: null,
          resultCount: 0,
          summary: null,
        },
        writebackClosure: {
          totalTargets: 0,
          completedTargets: 0,
          openTargets: 0,
          activeTaskCount: 0,
          summary: null,
        },
        watchClosure: {
          activeFindings: 0,
          resolvedFindings: 0,
          recurringFindings: 0,
          suppressedFindings: 0,
          openTaskCount: 0,
          closureEvidenceCount: 0,
          summary: null,
        },
      },
      activationTrace: blocked
        ? [
            {
              role: 'Solution-Optimality Review',
              required: true,
              activated: false,
              source: 'missing-stage-specialist',
              status: 'missing',
            },
          ]
        : [],
      summary: blocked
        ? `${run.projectName} 的 ${stage.label} 缺少真实评审报告，已回退到阻断态。`
        : `${run.projectName} 已通过 ${stage.label} 的默认评审。`,
      recommendedReworkStageId: blocked ? stage.id : null,
    };
  }
}


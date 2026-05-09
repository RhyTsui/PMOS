import type { Artifact, CommitteeReport, WorkflowRun, WorkflowStageRun } from '../shared/schemas.js';
import type { ProviderExecutionBundle } from './modelProvider.js';
import { FileStore } from './fileStore.js';
import { MemoryService } from './memoryService.js';
import { ProviderRouter } from './providerRouter.js';
import { SkillRegistry, type SkillDefinition } from './skillRegistry.js';
import { FrontendBrowserVerificationService } from './frontendBrowserVerificationService.js';
import type { TaskSsotTask } from '../shared/schemas.js';

export class StageRunners {
  private readonly skillRegistry: SkillRegistry;
  private readonly providerRouter: ProviderRouter;
  private readonly frontendBrowserVerificationService: FrontendBrowserVerificationService;
  private readonly executionCache = new Map<string, ProviderExecutionBundle>();

  constructor(
    private readonly store: FileStore,
    private readonly memoryService: MemoryService,
  ) {
    this.skillRegistry = new SkillRegistry(store);
    this.providerRouter = new ProviderRouter(store);
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

    if (artifactKind === 'json' && /frontend-browser-verification/iu.test(artifactPath)) {
      return this.buildFrontendBrowserVerificationArtifact(run, stage, artifactPath, input.existingOutputPaths ?? []);
    }

    const skills = await this.listSkillsForStage(stage.id, run.subprojectId);

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

  private buildFrontendBrowserVerificationArtifact(
    run: WorkflowRun,
    stage: WorkflowStageRun,
    artifactPath: string,
    existingOutputPaths: string[],
  ) {
    const workflowTask = run.tasks.find((task) => task.stageId === stage.id) ?? null;
    const artifactLinks = [
      ...new Set([
        ...existingOutputPaths,
        ...stage.outputPaths,
        ...workflowTask?.artifactPaths ?? [],
      ]),
    ].map((path, index) => ({
      taskId: workflowTask?.id ?? `${run.id}-${stage.id}`,
      artifactType: 'workflow-artifact',
      artifactId: `${stage.id}-artifact-${index + 1}`,
      artifactPath: path,
      roleInTask: 'working-output' as const,
    }));

    const syntheticTask: TaskSsotTask = {
      taskId: workflowTask?.id ?? `${run.id}-${stage.id}`,
      sourceType: 'workflow-run-task',
      sourceRef: run.id,
      originalDemandRefs: [],
      subprojectId: run.subprojectId ?? null,
      title: workflowTask?.title ?? `${stage.label} 任务`,
      summary: workflowTask?.summary ?? stage.summary ?? null,
      collaborationLevel: 'L1',
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
        mainlineLabel: `${run.projectName} / ${stage.label}`,
        nextSafeStep: null,
        parkedLines: [],
        blockerType: null,
        resumeAnchor: run.memory.runStatePath,
        lastMeaningfulAdvanceAt: run.updatedAt,
        currentAttention: null,
      },
    };

    const report = this.frontendBrowserVerificationService.evaluateTask(syntheticTask, {
      ...run,
      stages: run.stages.map((item) => item.id === stage.id ? { ...item, outputPaths: artifactLinks.map((artifact) => artifact.artifactPath) } : item),
      tasks: workflowTask
        ? run.tasks.map((item) => item.id === workflowTask.id ? { ...item, artifactPaths: artifactLinks.map((artifact) => artifact.artifactPath) } : item)
        : run.tasks,
    });

    return JSON.stringify({
      ...report,
      artifactPath,
    }, null, 2);
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

    const projectDescription = run.subprojectId
      ? `这是业务子项目 ${run.projectName} 的交付级前端页面产出。`
      : '这是 PMAIOS 平台主链的交付级前端页面产出。';

    const execution = await this.providerRouter.execute(
      {
        runId: run.id,
        stageId: stage.id,
        capability: 'text-multimodal',
        prompt: [
          `你正在为 ${run.projectName} 生成交付级前端页面说明。`,
          `runId: ${run.id}`,
          `stageId: ${stage.id}`,
          `工作流名称: ${run.name}`,
          `项目根目录: ${run.projectRoot || '.'}`,
          projectDescription,
          '请输出一份中文交付级前端页面包说明，至少包含：页面布局、模块职责、关键用户流程、动态交互、关键数据状态、空态/异常态、组件语义、实现约束，以及适合 dashboard 展示的结构化总结。严禁产出低保真示意页、静态说明页或文档式页面。',
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
      return ['# Project Memory', '当前暂无额外项目记忆，按 workflow 默认规则执行。'];
    }
  }

  private async listSkillsForStage(stageId: string, subprojectId?: string | null) {
    const direct = await this.skillRegistry.listSkillsForStage(stageId, subprojectId);
    const aliases = this.getLegacyStageAliases(stageId);
    const resolved = await Promise.all(aliases.map((alias) => this.skillRegistry.listSkillsForStage(alias, subprojectId)));
    return [...direct, ...resolved.flat()].filter(
      (skill, index, items) => items.findIndex((candidate) => candidate.id === skill.id) === index,
    );
  }

  private buildMarkdownArtifact(
    run: WorkflowRun,
    stage: WorkflowStageRun,
    artifactPath: string,
    skills: SkillDefinition[],
    projectMemory: string[],
  ) {
    const sections = this.getStageSections(run, stage.id, skills);

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

  private getStageSections(run: WorkflowRun, stageId: string, skills: SkillDefinition[]) {
    const skillLines = skills.map((skill) => `- ${skill.name}: ${skill.outputs.join(' / ')}`);

    switch (stageId) {
      case 'research-document':
        return [
          '## 调研范围',
          '- 明确用户问题、业务目标、竞品格局、内部能力现状和外部成熟方案。',
          '- 在研究阶段就写清 build-vs-buy，不允许把“先自己做”当默认前提。',
          '',
          '## 需要回答的问题',
          '- 用户真正卡在哪里，为什么现在要做。',
          '- 已有开源方案、同类产品和内部资产分别能复用什么。',
          '- 哪些假设仍未证实，需要后续规划或架构确认。',
          '',
          '## 方法参考',
          ...skillLines,
        ];
      case 'planning-document':
        return [
          '## 规划收口',
          '- 把调研结论收口为版本目标、分期策略、依赖顺序和边界约束。',
          '- 显式标记本轮必做、可延期、明确不做的项。',
          '',
          '## 交付视角',
          '- 规划文档需要说明从文档到设计、前端、数据、接口、联调验收的推进顺序。',
          '- 每个里程碑都要有可验证产物，而不是抽象口号。',
          '',
          '## 方法参考',
          ...skillLines,
        ];
      case 'requirements-document':
        return [
          '## 需求拆解要求',
          '- 需求文档不得停在 user story 或业务口号层，必须继续拆到功能层级。',
          '- 每条重要需求都要能回指来源、验收方式，以及对应的功能拆解。',
          '',
          '## 必须输出的矩阵',
          '- requirement-to-function breakdown matrix',
          '- 每条需求至少说明：Requirement ID、需求摘要、用户价值、对应 Function IDs、验收标准。',
          '- 如果某条需求还无法映射到功能点，就不能进入下游正式交付。',
          '',
          '## 需求分层',
          '- 把原始用户需求和产品机制需求分层表达，避免只有产品语言没有用户场景。',
          '- 每条重要需求都要能回溯到来源和验收方式。',
          '',
          '## 需求治理',
          '- 要求正式进入 requirement pool 或等价治理对象。',
          '- 对于重复修正，优先沉淀成项目默认规则。',
          '',
          '## 方法参考',
          ...skillLines,
        ];
      case 'functional-specification':
        return [
          '## 功能拆解要求',
          '- 功能文档不得只停在模块说明层，必须继续拆到接口层级。',
          '- 每个核心功能都要说明：Function ID、功能摘要、触发动作、输入、输出/响应、API/Event candidate、权限/错误语义。',
          '',
          '## 必须输出的矩阵',
          '- function-to-api mapping',
          '- 后端接口阶段负责正式定契约，但不应该在那里第一次发明核心功能语义。',
          '',
          '## 功能契约',
          '- 说明模块责任、主流程、状态变化、边界条件和异常处理。',
          '- 为设计文档、前端页面、数据模型和接口定义提供同一份上游约束。',
          '',
          '## 语义前置要求',
          '- 在这一阶段先暴露核心对象模型，而不是把数据问题留到后面再想。',
          '- 至少明确实体、关系、关键状态、主流程中的输入输出对象。',
          '',
          '## 对后续阶段的要求',
          '- 设计文档与前端页面阶段必须基于这里完成页面责任、状态设计和可交互页面收口。',
          '- 数据表和后端接口不得脱离这里另起一套语义。',
          '',
          '## 方法参考',
          ...skillLines,
        ];
      case 'design-document':
        return [
          '## 设计文档目标',
          '- 固化页面清单、信息架构、导航关系、关键交互流程、状态设计和组件级约束。',
          '- 设计文档不是视觉稿占位，而是把“用户如何使用、页面如何组织、状态如何成立”写成前端可执行契约。',
          '',
          '## 必须覆盖',
          '- 页面清单、页面职责、页面间跳转关系。',
          '- 关键用户流程、关键交互步骤、成功与失败路径。',
          '- 数据依赖、状态切换、空态、异常态、权限或前置条件。',
          '- 组件级设计约束与 UI 规范引用。',
          '',
          '## 质量门槛',
          '- 不允许只给流程图或结构草图而不给页面责任。',
          '- 不允许只讲视觉而不讲用户动作与状态语义。',
          '- 前端页面阶段拿到这份文档后应可直接进入交付级页面实现。',
          '',
          '## 方法参考',
          ...skillLines,
        ];
      case 'frontend-page':
        return [
          '## 前端页面目标',
          '- 直接产出交付级、面向用户、可交互的前端页面方案，而不是低保真示意页、静态文档页或说明书式页面。',
          '- 页面必须能回答：布局是否正确、功能模块是否合理、用户体验流程是否顺畅、动态交互是否可实现。',
          '',
          '## 面向用户的检查项',
          '- 布局：信息密度、主次层级、导航路径、操作入口是否符合用户任务场景。',
          '- 模块：页面区块、组件职责、页面与功能映射是否合理，不得堆示意卡片。',
          '- 流程：主流程、回退路径、异常流、空态、加载态、成功反馈是否完整。',
          '- 交互：筛选、编辑、提交、确认、联动、反馈是否具备动态行为，不得停在平铺说明。',
          '',
          '## 交付要求',
          '- 显式应用 UI 规范，包括字体、圆角、间距、状态、组件语义与设计系统约束。',
          '- 显式暴露关键数据状态、交互状态、空态、异常态及需要后端配合的反馈语义。',
          '- 输出应足以支持前端直接实现和后续联调，不允许再靠人二次猜页面含义。',
          '',
          '## 方法参考',
          ...skillLines,
        ];
      case 'data-schema':
        return [
          '## 数据模型目标',
          '- 把用户对象、业务对象、状态对象和审计对象拆清楚。',
          '- 说明字段、枚举、关系、索引和生命周期。',
          '',
          '## 正式定表要求',
          '- 这一阶段负责把前面已经暴露出来的对象模型正式落成表结构。',
          '- 不应在这里第一次发现核心对象或主状态。',
          '',
          '## 与上下游的关系',
          '- 页面状态、接口入参/出参和联调验证都要能回指到数据模型。',
          '- 不允许数据层语义与功能文档割裂。',
          '',
          '## 方法参考',
          ...skillLines,
        ];
      case 'backend-api':
        return [
          '## 接口收口要求',
          '- 接口文档要逐条回指 function-to-api mapping，而不是重写一遍功能说明。',
          '- 每个接口至少说明：API ID、用途、调用方、入参、出参、错误语义、权限语义、幂等/分页/异步规则。',
          '',
          '## 接口定义目标',
          '- 明确读写接口、错误码、权限边界、幂等要求和分页/查询规则。',
          '- 让联调阶段可以基于稳定契约推进，而不是边连边猜。',
          '',
          '## 正式定契约要求',
          '- 这一阶段负责把前面已经暴露出来的交互动作正式落成 API contract。',
          '- 不应在这里第一次发现页面动作、关键响应语义或异常反馈规则。',
          '',
          '## 关键关注点',
          '- 契约与功能文档、数据表、前端页面状态保持一致。',
          '- 记录联调所需 mock、假数据和环境前置条件。',
          '',
          '## 方法参考',
          ...skillLines,
        ];
      case 'frontend-backend-integration':
        return [
          '## 联调与验收目标',
          '- 验证前端页面、数据模型和后端接口是否在真实主流程中闭环。',
          '- 这一阶段同时承担 workflow review gate。',
          '',
          '## 最终需要回答',
          '- 哪些主流程已经打通，哪些仍阻塞，阻塞点归属谁。',
          '- 是否可以进入交付，还是需要回退到上游阶段返工。',
          '',
          '## 方法参考',
          ...skillLines,
        ];
      default:
        return ['## Summary', `${run.projectName} 已生成 ${stageId} 的最小可运行产物。`];
    }
  }

  private getLegacyStageAliases(stageId: string) {
    switch (stageId) {
      case 'research-document':
        return ['industry-analysis'];
      case 'planning-document':
        return ['tasks'];
      case 'requirements-document':
        return ['prd'];
      case 'functional-specification':
        return ['architecture', 'prd'];
      case 'design-document':
        return ['prototype', 'ui'];
      case 'frontend-page':
        return ['ui', 'multimodal', 'frontend'];
      case 'data-schema':
        return ['architecture', 'development'];
      case 'backend-api':
        return ['development'];
      case 'frontend-backend-integration':
        return ['review', 'iteration', 'frontend'];
      default:
        return [];
    }
  }

  private buildFallbackReview(run: WorkflowRun, stage: WorkflowStageRun, skills: SkillDefinition[]): CommitteeReport {
    return {
      overallConclusion: `${stage.label} 已形成结构化评审输出。`,
      nextStage: true,
      reworkRequired: false,
      gate: {
        decision: 'pass',
        blocked: false,
        issueCount: 0,
        blockingStageId: null,
      },
      roles: [
        {
          role: stage.ownerRole,
          summary: `${stage.label} 使用 ${skills.map((skill) => skill.name).join(' / ') || 'execution rules'} 完成评审。`,
          issues: [],
        },
      ],
      summary: `${run.projectName} 已通过 ${stage.label} 的默认评审。`,
      hermes: {
        overallDecision: 'keep',
        summary: 'Fallback review keeps the current stage package as the active baseline until a richer committee report is attached.',
        actions: [
          {
            action: 'keep',
            target: stage.id,
            reason: 'Fallback review contains no blocking evidence and preserves current stage output as baseline.',
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
      recommendedReworkStageId: null,
    };
  }
}

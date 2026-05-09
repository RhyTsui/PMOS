import { promises as fsp } from 'node:fs';
import path from 'node:path';
import { FileStore } from './fileStore.js';
import { MemoryService } from './memoryService.js';
import { RequirementService } from './requirementService.js';
import { SkillRegistry } from './skillRegistry.js';
import { getSubprojectManifestPath } from './projectPaths.js';
import type {
  V07ComponentReuseMemoryCheck,
  V07DatakiKnowledgeContext,
  V07DesignToolEffectivenessCheck,
  Requirement,
  V07RepeatCorrectionCandidate,
  V07RuntimeGovernanceSnapshot,
  V07StageAgentPhase,
  V07SkillEffectivenessCheck,
  V07UiSpecActivationSnapshot,
} from '../shared/schemas.js';

type CorrectionCandidateDefinition = {
  candidateId: string;
  label: string;
  scope: 'project' | 'platform';
  summary: string;
  keywords: string[];
};

const STAGE_DEFINITIONS: Array<{
  stageId: V07StageAgentPhase['stageId'];
  label: string;
  defaultMode: string;
  requiredBehaviors: string[];
  filenameKeywords: string[];
}> = [
  {
    stageId: 'requirements',
    label: '需求阶段',
    defaultMode: 'question-driven clarification',
    requiredBehaviors: ['先入需求池', '先澄清对象、边界、成功标准', '不直接滑向实现'],
    filenameKeywords: ['需求池', '需求真源', '迭代需求', '会议纪要转迭代需求'],
  },
  {
    stageId: 'prototype',
    label: '原型阶段',
    defaultMode: 'structure-first prototype',
    requiredBehaviors: ['先做页面职责和对象归位', '不默认进入视觉表达'],
    filenameKeywords: ['原型'],
  },
  {
    stageId: 'interaction',
    label: '交互阶段',
    defaultMode: 'state/action-first',
    requiredBehaviors: ['先做状态流和切换规则', '异常态和动作链先收口'],
    filenameKeywords: ['交互'],
  },
  {
    stageId: 'ui',
    label: 'UI阶段',
    defaultMode: 'spec-activated diagnosis-first',
    requiredBehaviors: ['必须读取活动 UI 规范', '先做差异诊断，再进入页面整改'],
    filenameKeywords: ['设计规范', 'UI规范', '通用设计规范', '页面整改清单'],
  },
  {
    stageId: 'frontend',
    label: '前端阶段',
    defaultMode: 'delivery-grade implementation',
    requiredBehaviors: ['真实组件优先', 'mock 可用，但不再交付示意壳'],
    filenameKeywords: ['frontend', '实现承接', '静态HTML确认稿'],
  },
];

const UI_SPEC_KEYWORDS = ['设计规范', 'UI规范', '通用设计规范', 'UI设计规范', 'UI规范文档'];
const EFFECTIVE_RULE_KEYWORDS: Array<[string, string]> = [
  ['字体', '字体与字号层级'],
  ['圆角', '圆角规则'],
  ['颜色', '色彩语义'],
  ['标题', '标题层级'],
  ['间距', '间距与密度'],
  ['滚动', '局部滚动策略'],
  ['列宽', '表格列宽策略'],
  ['组件', '组件优先级'],
];

const CORRECTION_CANDIDATES: CorrectionCandidateDefinition[] = [
  {
    candidateId: 'project-ui-spec-first',
    label: '已有 UI 规范时默认先读规范再改页',
    scope: 'platform',
    summary: '页面整改前默认加载项目 UI 规范，避免用户重复补圆角、色彩、滚动、间距等细节。',
    keywords: ['UI规范', '设计规范', '圆角', '滑动条', '滚动条', '不要再让我说这些'],
  },
  {
    candidateId: 'project-component-reuse-first',
    label: '类似需求默认复用已验证组件',
    scope: 'platform',
    summary: '同类筛选器、卡片、表格、项目切换器等应优先复用已验证组件，不再从零猜。',
    keywords: ['组件', '复用', 'YokaUI', '用这个组件', '默认复用'],
  },
  {
    candidateId: 'project-local-scroll-first',
    label: '局部滚动优先，禁止浏览器全局横向滚动',
    scope: 'platform',
    summary: '表格、详情、字典等页面默认把横向滚动收在 body 或表格容器内，不再泄漏到浏览器全局。',
    keywords: ['滑动条', '滚动条', '全局', '局部滚动', 'overflow'],
  },
  {
    candidateId: 'project-density-and-no-fluff',
    label: '后台读数优先，去说明性废话',
    scope: 'project',
    summary: '页面默认压低说明性文案，优先保留读数、状态和动作，不再堆说明稿式内容。',
    keywords: ['不要废话', '说明性', '同步页', '太密', '信息过载'],
  },
  {
    candidateId: 'project-stage-specialists',
    label: '不同阶段由不同专业工作模式主导',
    scope: 'platform',
    summary: '需求、原型、交互、UI、前端不再用同一种 generic 工作模式贯穿。',
    keywords: ['需求阶段', '原型阶段', '交互阶段', 'UI阶段', '前端阶段', '不同专业agent'],
  },
];

export class V07RuntimeGovernanceService {
  constructor(
    private readonly store: FileStore,
    private readonly memoryService: MemoryService,
    private readonly requirementService: RequirementService,
    private readonly skillRegistry = new SkillRegistry(store),
  ) {}

  async buildSnapshot(subprojectId?: string | null): Promise<V07RuntimeGovernanceSnapshot> {
    const relativeFiles = await this.listRelevantFiles(subprojectId);
    const stageAgents = this.buildStageAgents(relativeFiles);
    const uiSpecActivation = await this.buildUiSpecActivation(relativeFiles);
    const requirements = await this.memoryService.listRequirements(subprojectId);
    const repeatCorrectionCandidates = await this.buildRepeatCorrectionCandidates(relativeFiles, requirements);
    const skillEffectivenessChecks = await this.buildSkillEffectivenessChecks(relativeFiles, subprojectId);
    const designToolEffectivenessChecks = await this.buildDesignToolEffectivenessChecks(relativeFiles, subprojectId);
    const componentReuseMemoryChecks = await this.buildComponentReuseMemoryChecks(
      relativeFiles,
      repeatCorrectionCandidates,
    );
    const datakiKnowledgeContext = await this.buildDatakiKnowledgeContext(subprojectId);

    return {
      version: 1,
      subprojectId: subprojectId ?? null,
      generatedAt: new Date().toISOString(),
      stageAgents,
      uiSpecActivation,
      repeatCorrectionCandidates,
      skillEffectivenessChecks,
      designToolEffectivenessChecks,
      componentReuseMemoryChecks,
      datakiKnowledgeContext,
      backcheck: {
        stageAgentOrchestration: stageAgents.every((item) => item.status === 'pass') ? 'solved' : 'partial',
        uiSpecActivationGate:
          uiSpecActivation.status === 'pass'
            ? 'solved'
            : uiSpecActivation.activeSpecPaths.length > 0
              ? 'partial'
              : 'unsolved',
        repeatCorrectionMemory:
          repeatCorrectionCandidates.length > 0
            ? repeatCorrectionCandidates.some((item) => item.status === 'promoted')
              ? 'solved'
              : 'partial'
            : 'unsolved',
        skillEffectivenessCheck:
          skillEffectivenessChecks.length === 0
            ? 'unsolved'
            : skillEffectivenessChecks.every((item) => item.status === 'pass')
              ? 'solved'
              : skillEffectivenessChecks.some((item) => item.status === 'pass')
                ? 'partial'
                : 'unsolved',
        designToolEffectivenessCheck:
          designToolEffectivenessChecks.length === 0
            ? 'unsolved'
            : designToolEffectivenessChecks.every((item) => item.status === 'pass')
              ? 'solved'
              : designToolEffectivenessChecks.some((item) => item.status === 'pass')
                ? 'partial'
                : 'unsolved',
        componentReuseMemory:
          componentReuseMemoryChecks.length === 0
            ? 'unsolved'
            : componentReuseMemoryChecks.every((item) => item.status === 'pass')
              ? 'solved'
              : componentReuseMemoryChecks.some((item) => item.status === 'pass' || item.status === 'warn')
                ? 'partial'
                : 'unsolved',
        knowledgeSourceContext:
          datakiKnowledgeContext.configured
            ? 'solved'
            : datakiKnowledgeContext.sourceScope === 'missing'
              ? 'unsolved'
              : 'partial',
      },
    };
  }

  async promoteRepeatCorrectionCandidate(input: {
    subprojectId?: string | null;
    candidateId: string;
  }): Promise<Requirement> {
    const snapshot = await this.buildSnapshot(input.subprojectId);
    const candidate = snapshot.repeatCorrectionCandidates.find((item) => item.candidateId === input.candidateId);
    if (!candidate) {
      throw new Error(`repeat correction candidate not found: ${input.candidateId}`);
    }
    if (candidate.promotedRequirementId) {
      return this.memoryService.loadRequirement(candidate.promotedRequirementId, input.subprojectId);
    }

    return this.requirementService.createRequirement({
      subprojectId: input.subprojectId ?? null,
      title: `[Hermes重复纠正] ${candidate.label}`,
      description: `${candidate.summary}\n\n来源证据：\n${candidate.evidencePaths.join('\n')}`,
      category: 'architecture',
      priority: candidate.scope === 'platform' ? 'P0' : 'P1',
      source: {
        kind: 'auto-capture',
        sessionId: null,
        messageId: null,
        runId: null,
        sourceRef: {
          entityType: 'repeat-correction-memory',
          entityId: candidate.candidateId,
          path: candidate.evidencePaths[0] ?? null,
          label: candidate.label,
        },
      },
      artifactPaths: candidate.evidencePaths,
      metadata: {
        lifecycle: 'normalized',
        poolScope: input.subprojectId ? 'subproject' : 'platform',
        repeatCorrectionCandidateId: candidate.candidateId,
        repeatCorrectionScope: candidate.scope,
        repeatCorrectionSignalCount: candidate.signalCount,
      },
    });
  }

  private async buildUiSpecActivation(relativeFiles: string[]): Promise<V07UiSpecActivationSnapshot> {
    const activeSpecPaths = relativeFiles.filter((relativePath) =>
      UI_SPEC_KEYWORDS.some((keyword) => relativePath.includes(keyword)),
    );
    const loadedSignals: string[] = [];
    const missingSignals: string[] = [];
    const effectiveRules = new Set<string>();

    for (const specPath of activeSpecPaths.slice(0, 6)) {
      const content = await this.safeRead(specPath);
      for (const [keyword, label] of EFFECTIVE_RULE_KEYWORDS) {
        if (content.includes(keyword)) {
          effectiveRules.add(label);
        }
      }
      if (/页面整改清单|差异诊断/u.test(content)) {
        loadedSignals.push(`${specPath}: 已包含差异诊断整改链`);
      } else {
        loadedSignals.push(`${specPath}: 已挂入项目设计规范链`);
      }
    }

    if (activeSpecPaths.length === 0) {
      missingSignals.push('当前 scope 未发现 active UI 规范或页面整改清单');
    }
    if (!effectiveRules.has('表格列宽策略')) {
      missingSignals.push('规范中未显式暴露表格列宽策略证据');
    }
    if (!effectiveRules.has('局部滚动策略')) {
      missingSignals.push('规范中未显式暴露局部滚动策略证据');
    }

    return {
      status: activeSpecPaths.length === 0 ? 'missing' : missingSignals.length > 0 ? 'warn' : 'pass',
      summary:
        activeSpecPaths.length === 0
          ? '当前没有检测到已激活的 UI 规范，后续 UI 整改仍可能回到默认模型风格。'
          : `已检测到 ${activeSpecPaths.length} 份活动 UI 规范或整改清单，后续 UI 阶段应默认先读规范再改页。`,
      activeSpecPaths,
      loadedSignals,
      missingSignals,
      effectiveRules: Array.from(effectiveRules),
    };
  }

  private buildStageAgents(relativeFiles: string[]): V07StageAgentPhase[] {
    return STAGE_DEFINITIONS.map((definition) => {
      const evidencePaths = relativeFiles.filter((relativePath) =>
        definition.filenameKeywords.some((keyword) => relativePath.includes(keyword)),
      );
      return {
        stageId: definition.stageId,
        label: definition.label,
        defaultMode: definition.defaultMode,
        status: evidencePaths.length > 0 ? 'pass' : 'missing',
        summary:
          evidencePaths.length > 0
            ? `已找到 ${evidencePaths.length} 份 ${definition.label} 证据，说明该阶段已从 generic 模式分离。`
            : `未找到 ${definition.label} 直接证据，仍有退回 generic 工作模式的风险。`,
        requiredBehaviors: definition.requiredBehaviors,
        evidencePaths,
      };
    });
  }

  private async buildRepeatCorrectionCandidates(
    relativeFiles: string[],
    requirements: Requirement[],
  ): Promise<V07RepeatCorrectionCandidate[]> {
    const contentByFile = await Promise.all(
      relativeFiles.map(async (relativePath) => ({
        relativePath,
        content: await this.safeRead(relativePath),
      })),
    );

    return CORRECTION_CANDIDATES.map((definition) => {
      const matchedFiles = contentByFile.filter(({ content }) =>
        definition.keywords.some((keyword) => content.includes(keyword)),
      );
      const promotedRequirement = requirements.find(
        (item) => item.metadata.repeatCorrectionCandidateId === definition.candidateId,
      );
      const status: V07RepeatCorrectionCandidate['status'] = promotedRequirement ? 'promoted' : 'candidate';
      return {
        candidateId: definition.candidateId,
        label: definition.label,
        scope: definition.scope,
        status,
        signalCount: matchedFiles.length,
        summary: definition.summary,
        evidencePaths: matchedFiles.map((item) => item.relativePath),
        promotedRequirementId: promotedRequirement?.id ?? null,
      };
    }).filter((item) => item.signalCount > 0);
  }

  private async buildSkillEffectivenessChecks(
    relativeFiles: string[],
    subprojectId?: string | null,
  ): Promise<V07SkillEffectivenessCheck[]> {
    const registry = await this.safeLoadSkillRegistry(subprojectId);
    const targetSkills = registry.skills.filter(
      (skill) =>
        skill.enabled &&
        (skill.category === 'design' ||
          skill.id.includes('design') ||
          skill.id.includes('frontend') ||
          skill.id.includes('schema')),
    );
    const contentByFile = await Promise.all(
      relativeFiles.map(async (relativePath) => ({
        relativePath,
        content: await this.safeRead(relativePath),
      })),
    );

    return targetSkills.map((skill) => {
      const tokens = [
        skill.id,
        skill.name,
        skill.tool ?? '',
        ...(skill.triggerKeywords ?? []),
        ...(skill.outputs ?? []),
      ]
        .map((token) => token.trim().toLowerCase())
        .filter((token) => token.length >= 3);

      const evidencePaths = contentByFile
        .filter(({ relativePath, content }) => {
          const haystack = `${relativePath}\n${content}`.toLowerCase();
          return tokens.some((token) => haystack.includes(token));
        })
        .map((item) => item.relativePath);

      if (skill.promptPath) {
        evidencePaths.push(skill.promptPath);
      }
      if (skill.deployment.statusPath) {
        evidencePaths.push(skill.deployment.statusPath);
      }

      const uniqueEvidencePaths = [...new Set(evidencePaths)].filter(Boolean);
      const missingSignals: string[] = [];

      if (!skill.promptPath) {
        missingSignals.push('缺少 promptPath，无法确认上游规则入口');
      }
      if (!skill.deployment.statusPath) {
        missingSignals.push('缺少 statusPath，无法确认运行态挂接位置');
      }
      if (uniqueEvidencePaths.length <= (skill.promptPath ? 1 : 0) + (skill.deployment.statusPath ? 1 : 0)) {
        missingSignals.push('未发现除注册信息外的下游输出证据');
      }

      const status: V07SkillEffectivenessCheck['status'] =
        uniqueEvidencePaths.length >= 3 ? 'pass' : uniqueEvidencePaths.length > 0 ? 'warn' : 'missing';

      return {
        skillId: skill.id,
        name: skill.name,
        integration: skill.deployment.integration,
        status,
        summary:
          status === 'pass'
            ? `${skill.name} 已出现明确上下游证据，说明不只是注册存在，而是已经影响当前产出。`
            : status === 'warn'
              ? `${skill.name} 已被注册并有部分证据，但仍缺少足够下游痕迹，当前更像“接入了”而不是“稳定生效”。`
              : `${skill.name} 仅存在于注册层，当前尚未看到它真实影响项目输出。`,
        evidencePaths: uniqueEvidencePaths.slice(0, 8),
        missingSignals,
      };
    });
  }

  private async buildDesignToolEffectivenessChecks(
    relativeFiles: string[],
    subprojectId?: string | null,
  ): Promise<V07DesignToolEffectivenessCheck[]> {
    const registry = await this.safeLoadSkillRegistry(subprojectId);
    const toolSkills = registry.skills.filter(
      (skill) =>
        skill.enabled &&
        skill.category === 'design' &&
        ['external-tool', 'repo-skill', 'manual'].includes(skill.deployment.integration),
    );
    const contentByFile = await Promise.all(
      relativeFiles.map(async (relativePath) => ({
        relativePath,
        content: await this.safeRead(relativePath),
      })),
    );

    return toolSkills.map((skill) => {
      const toolTokens = [
        skill.tool ?? '',
        skill.name,
        skill.id,
        ...(skill.triggerKeywords ?? []),
      ]
        .map((token) => token.trim().toLowerCase())
        .filter((token) => token.length >= 3);
      const matchedEvidencePaths = contentByFile
        .filter(({ relativePath, content }) => {
          const haystack = `${relativePath}\n${content}`.toLowerCase();
          return toolTokens.some((token) => haystack.includes(token));
        })
        .map((item) => item.relativePath);
      const evidencePaths = [
        ...matchedEvidencePaths,
        ...(skill.deployment.statusPath ? [skill.deployment.statusPath] : []),
      ];
      const uniqueEvidencePaths = [...new Set(evidencePaths)].filter(Boolean);
      const missingSignals: string[] = [];
      if (!skill.deployment.statusPath) {
        missingSignals.push('缺少 statusPath，无法确认工具状态锚点');
      }
      if (matchedEvidencePaths.length === 0) {
        missingSignals.push('未发现工具影响当前设计输出的直接证据');
      }

      const status: V07DesignToolEffectivenessCheck['status'] =
        matchedEvidencePaths.length >= 1 && skill.deployment.statusPath ? 'pass' : uniqueEvidencePaths.length > 0 ? 'warn' : 'missing';

      return {
        toolId: skill.tool ?? skill.id,
        label: skill.name,
        integration:
          skill.deployment.integration === 'external-tool' || skill.deployment.integration === 'repo-skill'
            ? skill.deployment.integration
            : 'manual',
        status,
        summary:
          status === 'pass'
            ? `${skill.name} 既有状态锚点，也已出现设计输出证据，可视为已生效。`
            : status === 'warn'
              ? `${skill.name} 有接入痕迹，但证据不足以证明它真正改变了当前设计结果。`
              : `${skill.name} 当前只看到配置层，不足以证明工具实际生效。`,
        evidencePaths: uniqueEvidencePaths.slice(0, 8),
        missingSignals,
      };
    });
  }

  private async buildComponentReuseMemoryChecks(
    relativeFiles: string[],
    repeatCorrectionCandidates: V07RepeatCorrectionCandidate[],
  ): Promise<V07ComponentReuseMemoryCheck[]> {
    const targetCandidate = repeatCorrectionCandidates.find(
      (candidate) => candidate.candidateId === 'project-component-reuse-first',
    );
    if (!targetCandidate) {
      return [];
    }

    const contentByFile = await Promise.all(
      relativeFiles.map(async (relativePath) => ({
        relativePath,
        content: await this.safeRead(relativePath),
      })),
    );

    const matchedFiles = contentByFile.filter(({ relativePath, content }) => {
      const haystack = `${relativePath}\n${content}`;
      return (
        /YokaUI|YKUI/u.test(haystack) &&
        /组件复用|组件映射|组件语义|复用|component reuse|component mapping|component semantic|reuse/iu.test(haystack)
      );
    });
    const reusableComponentSignals = matchedFiles.flatMap(({ content }) => {
      const signals: string[] = [];
      if (/筛选|filter/iu.test(content)) {
        signals.push('筛选器复用');
      }
      if (/卡片|card/iu.test(content)) {
        signals.push('卡片复用');
      }
      if (/表格|table/iu.test(content)) {
        signals.push('表格复用');
      }
      if (/抽屉|drawer/iu.test(content)) {
        signals.push('抽屉复用');
      }
      if (/组件映射|component mapping/iu.test(content)) {
        signals.push('组件映射');
      }
      return signals;
    });
    const uniqueSignals = [...new Set(reusableComponentSignals)];
    const evidencePaths = [...new Set([...targetCandidate.evidencePaths, ...matchedFiles.map((item) => item.relativePath)])];
    const missingSignals: string[] = [];

    if (!targetCandidate.promotedRequirementId) {
      missingSignals.push('重复纠正候选尚未提升进 requirement pool，组件复用还不是治理默认值');
    }
    if (matchedFiles.length === 0) {
      missingSignals.push('未发现 YokaUI / 组件映射 / 组件复用 的下游证据');
    }
    if (uniqueSignals.length < 2) {
      missingSignals.push('可复用组件族证据不足，尚未覆盖多个高频页面块');
    }

    const status: V07ComponentReuseMemoryCheck['status'] =
      targetCandidate.promotedRequirementId && matchedFiles.length > 0 && uniqueSignals.length >= 2
        ? 'pass'
        : evidencePaths.length > 0
          ? 'warn'
          : 'missing';

    return [
      {
        candidateId: targetCandidate.candidateId,
        label: targetCandidate.label,
        status,
        summary:
          status === 'pass'
            ? '组件复用要求已经从重复纠正候选提升为治理默认值，并且存在 YokaUI / 组件映射 下游证据。'
            : status === 'warn'
              ? '组件复用已经出现治理或落地痕迹，但还不足以证明它已稳定成为跨项目默认复用记忆。'
              : '当前还看不到组件复用记忆的稳定治理和落地证据。',
        promotedRequirementId: targetCandidate.promotedRequirementId,
        reusableComponentSignals: uniqueSignals,
        evidencePaths: evidencePaths.slice(0, 8),
        missingSignals,
      },
    ];
  }

  private async buildDatakiKnowledgeContext(subprojectId?: string | null): Promise<V07DatakiKnowledgeContext> {
    const baseUrl = process.env.DATAKI_BASE_URL?.trim() || process.env.WEKNORA_BASE_URL?.trim() || null;
    const apiKey = process.env.DATAKI_API_KEY?.trim() || process.env.WEKNORA_API_KEY?.trim() || null;
    const userId = process.env.DATAKI_USER_ID?.trim() || process.env.WEKNORA_USER_ID?.trim() || null;
    const envAgentId = process.env.DATAKI_AGENT_ID?.trim() || process.env.WEKNORA_AGENT_ID?.trim() || null;
    const envKnowledgeBaseId =
      process.env.DATAKI_KNOWLEDGE_BASE_ID?.trim() || process.env.WEKNORA_KNOWLEDGE_BASE_ID?.trim() || null;
    const envKnowledgeBaseIds = [
      ...(process.env.DATAKI_KNOWLEDGE_BASE_IDS?.split(',') ?? []),
      ...(process.env.WEKNORA_KNOWLEDGE_BASE_IDS?.split(',') ?? []),
    ].map((item) => item.trim()).filter(Boolean);

    let sourceScope: V07DatakiKnowledgeContext['sourceScope'] = 'missing';
    let evidencePaths: string[] = [];
    let agentId = envAgentId;
    let defaultKnowledgeBaseId = envKnowledgeBaseId;
    let defaultKnowledgeBaseIds = [...envKnowledgeBaseIds];

    if (subprojectId) {
      const manifestPath = getSubprojectManifestPath(subprojectId);
      if (await this.store.exists(manifestPath)) {
        const subproject = await this.store.readJson<{
          overrides?: {
            dataki?: {
              agentId?: string;
              knowledgeBaseId?: string;
              knowledgeBaseIds?: string[];
            };
          };
        }>(manifestPath);
        const overrides = subproject.overrides?.dataki;
        if (overrides) {
          sourceScope = 'subproject';
          evidencePaths.push(manifestPath);
          agentId = overrides.agentId?.trim() || agentId;
          defaultKnowledgeBaseId = overrides.knowledgeBaseId?.trim() || defaultKnowledgeBaseId;
          defaultKnowledgeBaseIds = [
            ...(overrides.knowledgeBaseIds ?? []),
            ...defaultKnowledgeBaseIds,
            ...(overrides.knowledgeBaseId ? [overrides.knowledgeBaseId] : []),
          ].map((item) => item.trim()).filter(Boolean);
        }
      }
    }

    if (sourceScope === 'missing' && (baseUrl || apiKey || userId || envAgentId || envKnowledgeBaseId || envKnowledgeBaseIds.length > 0)) {
      sourceScope = 'platform';
    }

    defaultKnowledgeBaseIds = [...new Set(defaultKnowledgeBaseIds)];
    const configured = Boolean(baseUrl && apiKey && (defaultKnowledgeBaseId || defaultKnowledgeBaseIds.length > 0));
    const missingSignals: string[] = [];
    if (!baseUrl) {
      missingSignals.push('missing DATAKI_BASE_URL');
    }
    if (!apiKey) {
      missingSignals.push('missing DATAKI_API_KEY');
    }
    if (!userId) {
      missingSignals.push('missing DATAKI_USER_ID');
    }
    if (!defaultKnowledgeBaseId && defaultKnowledgeBaseIds.length === 0) {
      missingSignals.push('missing default knowledge base mapping');
    }
    if (baseUrl) {
      evidencePaths.push('env:DATAKI_BASE_URL');
    }
    if (apiKey) {
      evidencePaths.push('env:DATAKI_API_KEY');
    }
    if (userId) {
      evidencePaths.push('env:DATAKI_USER_ID');
    }
    if (envAgentId || agentId) {
      evidencePaths.push(sourceScope === 'subproject' ? 'subproject.dataki.agentId' : 'env:DATAKI_AGENT_ID');
    }
    if (defaultKnowledgeBaseId) {
      evidencePaths.push(sourceScope === 'subproject' ? 'subproject.dataki.knowledgeBaseId' : 'env:DATAKI_KNOWLEDGE_BASE_ID');
    }

    const summary =
      sourceScope === 'missing'
        ? 'Dataki system-state knowledge context is not configured yet, so Hermes research still depends on repo truth and manual recall only.'
        : configured
          ? `Dataki system-state knowledge context is configured at ${sourceScope} scope and Hermes can treat the default knowledge base mapping as a governed research baseline.`
          : `Dataki context exists at ${sourceScope} scope, but Hermes still lacks a complete default knowledge source contract for stable research grounding.`;

    return {
      configured,
      sourceScope,
      summary,
      baseUrl,
      userId,
      agentId,
      defaultKnowledgeBaseId,
      defaultKnowledgeBaseIds,
      evidencePaths: [...new Set(evidencePaths)],
      missingSignals,
    };
  }

  private async listRelevantFiles(subprojectId?: string | null) {
    const roots = [
      subprojectId ? path.posix.join('subprojects', subprojectId, 'docs') : 'docs',
      subprojectId ? path.posix.join('subprojects', subprojectId, 'frontend') : '',
    ].filter(Boolean);
    const collected = new Set<string>();
    for (const root of roots) {
      await this.collectFilesRecursive(root, collected);
    }
    return Array.from(collected).sort();
  }

  private async collectFilesRecursive(relativeRoot: string, collector: Set<string>) {
    if (!(await this.store.exists(relativeRoot))) {
      return;
    }
    const absoluteRoot = this.store.resolve(relativeRoot);
    const entries = await fsp.readdir(absoluteRoot, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && ['node_modules', 'dist', '.vite', '.git'].includes(entry.name)) {
        continue;
      }
      const relativePath = path.posix.join(relativeRoot.replace(/\\/gu, '/'), entry.name);
      if (entry.isDirectory()) {
        await this.collectFilesRecursive(relativePath, collector);
      } else if (/\.(md|json|tsx|ts|jsx|js|html)$/iu.test(entry.name)) {
        collector.add(relativePath);
      }
    }
  }

  private async safeRead(relativePath: string) {
    try {
      return await this.store.read(relativePath);
    } catch {
      return '';
    }
  }

  private async safeLoadSkillRegistry(subprojectId?: string | null) {
    try {
      return await this.skillRegistry.loadRegistry(subprojectId);
    } catch {
      return { version: 'missing', skills: [] };
    }
  }
}

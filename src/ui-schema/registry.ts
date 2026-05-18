import type { PMOSScreenSchema, RecommendedAction, UISchemaBlock } from './schema';

export const allowedUIBlocks = {
  ChatShell: {
    purpose: '提供统一主 chat 壳层，作为首页和子项目默认交互入口。',
    allowedRegions: ['main'],
    requiredProps: ['id', 'title', 'aiAssistanceMode'],
    forbiddenUse: '不能退化为普通介绍区或消息列表摆设。',
  },
  ContextRail: {
    purpose: '展示产品、项目、需求、阶段和状态等核心上下文。',
    allowedRegions: ['contextRail', 'topBar'],
    requiredProps: ['id', 'title', 'items'],
    forbiddenUse: '不能退化为营销说明或装饰性摘要。',
  },
  ConversationPanel: {
    purpose: '承载人与 AI 的多轮对话、追问和行动建议。',
    allowedRegions: ['main'],
    requiredProps: ['id', 'title', 'aiAssistanceMode'],
    forbiddenUse: '不能作为空壳聊天窗口脱离业务上下文存在。',
  },
  EvidencePanel: {
    purpose: '集中展示证据引用、来源、时效和支撑信息。',
    allowedRegions: ['evidencePanel', 'sidePanel'],
    requiredProps: ['id', 'title', 'evidenceRefs', 'sourceRefs', 'lastUpdatedAt'],
    forbiddenUse: '不能写成无来源的展示卡片，也不应默认永久展开抢占首页主焦点。',
  },
  RequirementIntakeCard: {
    purpose: '展示需求输入、当前阶段和原始来源。',
    allowedRegions: ['main', 'sidePanel'],
    requiredProps: ['id', 'title', 'summary', 'workflowStage', 'sourceRefs'],
    forbiddenUse: '不能只写愿景口号。',
  },
  ResearchSynthesisCard: {
    purpose: '展示调研结论、综合判断和支撑证据。',
    allowedRegions: ['main', 'evidencePanel'],
    requiredProps: ['id', 'title', 'summary', 'evidenceRefs', 'sourceRefs'],
    forbiddenUse: '不能省略证据链。',
  },
  PRDSectionCard: {
    purpose: '展示 PRD 章节摘要和对应来源。',
    allowedRegions: ['main'],
    requiredProps: ['id', 'title', 'sectionKey', 'summary', 'sourceRefs'],
    forbiddenUse: '不能替代完整 PRD 结构。',
  },
  DecisionCard: {
    purpose: '展示需要判断、升级或确认的关键决策。',
    allowedRegions: ['main', 'sidePanel'],
    requiredProps: ['id', 'title', 'summary', 'decisionPolicy', 'evidenceRefs', 'recommendedActions'],
    forbiddenUse: '不能只有态度没有依据。',
    riskRules: '高风险决策必须带 riskLevel，并给出审批或升级语义。',
  },
  RiskReviewPanel: {
    purpose: '展示当前风险、影响范围和责任归属。',
    allowedRegions: ['sidePanel', 'evidencePanel'],
    requiredProps: ['id', 'title', 'risks'],
    forbiddenUse: '不能变成装饰性告警。',
  },
  RoadmapTimeline: {
    purpose: '展示版本里程碑和阶段推进。',
    allowedRegions: ['main', 'sidePanel'],
    requiredProps: ['id', 'title', 'milestones'],
    forbiddenUse: '不能退化为静态宣传时间轴。',
  },
  TaskBoard: {
    purpose: '展示任务执行状态、责任人和推进顺序。',
    allowedRegions: ['main', 'sidePanel'],
    requiredProps: ['id', 'title', 'items'],
    forbiddenUse: '不能只显示视觉占位，也不应在首页默认全量展开。',
  },
  SourceReferenceList: {
    purpose: '展示当前页面引用的真源、输入源和更新时间。',
    allowedRegions: ['evidencePanel', 'auditTrail'],
    requiredProps: ['id', 'title', 'sourceRefs', 'lastUpdatedAt'],
    forbiddenUse: '不能省略来源和更新时间。',
  },
  ApprovalPanel: {
    purpose: '展示审批动作、审批策略和可执行操作。',
    allowedRegions: ['approvalPanel', 'sidePanel'],
    requiredProps: ['id', 'title', 'approvalPolicy', 'actions'],
    forbiddenUse: '不能缺少审批策略。',
    riskRules: '高风险动作必须带 approvalPolicy 或 requiresApproval，并保持 auditRequired=true。',
  },
  AuditLog: {
    purpose: '展示审批、发布、状态变更和回写痕迹。',
    allowedRegions: ['auditTrail', 'evidencePanel'],
    requiredProps: ['id', 'title', 'logs'],
    forbiddenUse: '不能省略行为记录。',
  },
  WorkflowStatusPanel: {
    purpose: '展示当前工作流阶段、执行状态和阻塞点。',
    allowedRegions: ['main', 'sidePanel'],
    requiredProps: ['id', 'title', 'workflowStage', 'status'],
    forbiddenUse: '不能只是彩色状态标签。',
  },
  AIRecommendationCard: {
    purpose: '展示 AI 建议、支撑证据和下一步动作。',
    allowedRegions: ['main', 'sidePanel'],
    requiredProps: ['id', 'title', 'summary', 'aiAssistanceMode', 'evidenceRefs', 'recommendedActions'],
    forbiddenUse: '不能成为无业务语义的 AI 展示卡。',
    riskRules: '如果动作影响项目范围、发布或流程状态，则必须声明风险和审计语义。',
  },
  AgentControlCard: {
    purpose: '展示 agent 当前控制动作、任务摘要和可触发操作。',
    allowedRegions: ['sidePanel', 'approvalPanel'],
    requiredProps: ['id', 'title', 'agentRole', 'summary', 'recommendedActions'],
    forbiddenUse: '不能作为无动作能力的海报卡片。',
    riskRules: '高风险动作必须继承审批与审计语义。',
  },
  DynamicSurfaceCard: {
    purpose: '承接由 chat 或 agent 唤出的动态结构化表面。',
    allowedRegions: ['sidePanel', 'evidencePanel', 'approvalPanel'],
    requiredProps: ['id', 'title', 'surfaceKind'],
    forbiddenUse: '不能在首页默认大面积常驻展开。',
  },
} as const;

export type AllowedUIBlockType = keyof typeof allowedUIBlocks;

export const forbiddenUIBlockTypes = [
  'Hero',
  'Poster',
  'FeatureGrid',
  'MarketingCard',
  'PricingCard',
  'LandingSection',
  'Showcase',
  'CTASection',
  'GlassCard',
  'GradientPanel',
] as const;

export function assertAllowedBlock(block: UISchemaBlock): void {
  if (!(block.type in allowedUIBlocks)) {
    throw new Error(`Unsupported UI block type: ${block.type}`);
  }
}

export function assertNoForbiddenBlockType(type: string): void {
  if ((forbiddenUIBlockTypes as readonly string[]).includes(type)) {
    throw new Error(`Forbidden demo UI block type: ${type}`);
  }
}

function isHighRiskAction(action: RecommendedAction): boolean {
  return action.riskLevel === 'high';
}

function collectBlocks(schema: PMOSScreenSchema): UISchemaBlock[] {
  const regionBlocks = [
    ...(schema.regions.topBar ?? []),
    ...(schema.regions.contextRail ?? []),
    ...(schema.regions.main ?? []),
    ...(schema.regions.evidencePanel ?? []),
    ...(schema.regions.sidePanel ?? []),
    ...(schema.regions.approvalPanel ?? []),
    ...(schema.regions.auditTrail ?? []),
  ];
  return schema.blocks ? [...regionBlocks, ...schema.blocks] : regionBlocks;
}

export function validatePMOSSchema(schema: PMOSScreenSchema): string[] {
  const errors: string[] = [];

  if (schema.schemaVersion !== '1.0') errors.push('schemaVersion must be 1.0');
  if (!schema.screenType) errors.push('screenType is required');
  if (!schema.layout?.desktop) errors.push('layout.desktop is required');
  if (!schema.layout?.mobile) errors.push('layout.mobile is required');
  if (schema.screenType === 'pmchat-home' && schema.homepageMode !== 'chat-first') {
    errors.push('pmchat-home must set homepageMode=chat-first');
  }

  const blocks = collectBlocks(schema);
  if (!blocks.length) errors.push('at least one region or block is required');

  for (const block of blocks) {
    assertAllowedBlock(block);
    assertNoForbiddenBlockType(block.type);

    if (block.type === 'EvidencePanel' && !block.lastUpdatedAt.trim()) {
      errors.push(`${block.id}: EvidencePanel.lastUpdatedAt is required`);
    }
    if (block.type === 'SourceReferenceList' && !block.lastUpdatedAt.trim()) {
      errors.push(`${block.id}: SourceReferenceList.lastUpdatedAt is required`);
    }
    if (block.type === 'DecisionCard') {
      if (!block.evidenceRefs.length) {
        errors.push(`${block.id}: DecisionCard.evidenceRefs is required`);
      }
      for (const action of block.recommendedActions) {
        if (isHighRiskAction(action) && !(action.approvalPolicy || action.requiresApproval)) {
          errors.push(`${block.id}:${action.id}: high-risk action must carry approval semantics`);
        }
        if (isHighRiskAction(action) && !action.auditRequired) {
          errors.push(`${block.id}:${action.id}: high-risk action must set auditRequired=true`);
        }
      }
    }
    if (block.type === 'AIRecommendationCard' && !block.evidenceRefs.length) {
      errors.push(`${block.id}: AIRecommendationCard.evidenceRefs is required`);
    }
    if (block.type === 'DynamicSurfaceCard' && !['x-card', 'drawer', 'side-sheet', 'inline-panel'].includes(block.surfaceKind)) {
      errors.push(`${block.id}: DynamicSurfaceCard.surfaceKind is invalid`);
    }
    if (block.type === 'AgentControlCard') {
      for (const action of block.recommendedActions) {
        if (isHighRiskAction(action) && !(action.approvalPolicy || action.requiresApproval)) {
          errors.push(`${block.id}:${action.id}: high-risk agent action must carry approval semantics`);
        }
      }
    }
    if (block.type === 'ApprovalPanel') {
      for (const action of block.actions) {
        if (isHighRiskAction(action) && !(action.approvalPolicy || action.requiresApproval)) {
          errors.push(`${block.id}:${action.id}: high-risk approval action must carry approval semantics`);
        }
        if (isHighRiskAction(action) && !action.auditRequired) {
          errors.push(`${block.id}:${action.id}: high-risk approval action must set auditRequired=true`);
        }
      }
    }
  }

  return errors;
}

/**
 * Service Proposal — 服务提案契约
 *
 * 服务提案是系统向用户展示的"三段式响应"结构：
 * 1. 我理解你的目标是...
 * 2. 我可以帮你做 N 件事...
 * 3. 还需要确认...
 *
 * 与 Service Catalog 的关系：
 * - Service Catalog 定义系统能提供的服务
 * - Service Proposal 是根据用户诉求，从 Service Catalog 中选择的推荐服务组合
 */

import type { ServiceType } from '@/contracts/service-catalog';

// ─── Service Proposal ──────────────────────────────────

export interface ServiceProposal {
  /** 提案 ID */
  proposalId: string;
  /** 关联的 CaseFrame ID */
  caseId?: string;
  /** 生成时间 ISO */
  createdAt: string;

  // ─── 第一段：目标复述 ────────────────────────────────

  /** 用户表面问题 */
  surfaceAsk: string;
  /** 推断的真实目标 */
  realGoal: string;
  /** 目标置信度 */
  goalConfidence: number;

  // ─── 第二段：可服务路径 ──────────────────────────────

  /** 推荐服务列表 */
  recommendedServices: ServiceProposalItem[];
  /** 推荐下一步（首选服务） */
  recommendedNext?: ServiceType;

  // ─── 第三段：缺失信息 ────────────────────────────────

  /** 缺失的输入信息 */
  missingInputs: MissingInput[];
  /** 是否需要用户确认才能开始 */
  requiresConfirmation: boolean;

  // ─── 扩展 ───────────────────────────────────────────

  /** 优先级建议 */
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  /** 预估耗时（秒） */
  estimatedDuration?: number;
  /** 扩展数据 */
  metadata?: Record<string, unknown>;
}

// ─── Service Proposal Item ─────────────────────────────

export interface ServiceProposalItem {
  /** 服务类型 */
  serviceType: ServiceType;
  /** 显示名称 */
  displayName: string;
  /** 为什么推荐这个服务 */
  reason: string;
  /** 是否可以立即执行 */
  canStartNow: boolean;
  /** 缺失的输入（针对这个服务） */
  missingInputs: string[];
  /** 推荐排序（1 = 最推荐） */
  rank: number;
}

// ─── Missing Input ─────────────────────────────────────

export interface MissingInput {
  /** 字段名 */
  field: string;
  /** 显示标签 */
  label: string;
  /** 说明 */
  description?: string;
  /** 是否必填 */
  required: boolean;
  /** 可选值（如果是枚举类型） */
  options?: string[];
  /** 默认值 */
  defaultValue?: string;
}

// ─── Service Proposal Generator Input ──────────────────

export interface ServiceProposalGeneratorInput {
  /** 用户消息 */
  message: string;
  /** 推断的真实目标 */
  realGoal?: string;
  /** 匹配的服务类型列表 */
  candidateServices: Array<{
    type: ServiceType;
    reason: string;
    confidence: number;
  }>;
  /** 缺失信息 */
  missingInputs?: MissingInput[];
  /** 业务上下文 */
  businessContext?: {
    project?: { id?: string; name?: string };
    media?: string;
    timeRange?: string;
  };
}

// ─── Helper Functions ──────────────────────────────────

/**
 * 生成服务提案
 */
export function generateServiceProposal(
  input: ServiceProposalGeneratorInput,
): ServiceProposal {
  const now = new Date().toISOString();

  // 按置信度排序，生成推荐服务列表
  const sortedServices = [...input.candidateServices]
    .sort((a, b) => b.confidence - a.confidence)
    .map((item, index) => ({
      serviceType: item.type,
      displayName: getServiceDisplayName(item.type),
      reason: item.reason,
      canStartNow: !input.missingInputs?.length,
      missingInputs: input.missingInputs?.map(m => m.field) ?? [],
      rank: index + 1,
    }));

  return {
    proposalId: `proposal-${Date.now()}`,
    createdAt: now,
    surfaceAsk: input.message,
    realGoal: input.realGoal ?? input.message,
    goalConfidence: input.candidateServices[0]?.confidence ?? 0.5,
    recommendedServices: sortedServices,
    recommendedNext: sortedServices[0]?.serviceType,
    missingInputs: input.missingInputs ?? [],
    requiresConfirmation: Boolean(input.missingInputs?.length),
    priority: input.candidateServices[0]?.confidence > 0.8 ? 'high' : 'medium',
  };
}

/**
 * 获取服务显示名称
 */
function getServiceDisplayName(type: ServiceType): string {
  const names: Record<ServiceType, string> = {
    data_query: '数据查询',
    aggregate_analysis: '聚合分析',
    join_table_report: '拼表生成报表',
    data_issue_diagnosis: '数据问题排查',
    config_issue_diagnosis: '配置问题排查',
    troubleshooting_answer: '排查解答',
    roi_diagnosis: 'ROI 诊断',
    creative_diagnosis: '创意效果诊断',
    package_fetch: '获取包信息',
    integration_workflow: '联调',
    creative_data_query: '创意数据查询',
    creative_analysis: '创意效果分析',
    requirement_draft: '需求草稿',
    feasibility_check: '可实现性确认',
    current_usage_assist: '使用协助',
    field_definition: '字段定义',
    knowledge_answer: '知识问答',
    automation_task: '自动化任务',
    general_chat: '通用对话',
    clarification: '澄清追问',
  };
  return names[type] ?? type;
}

/**
 * 判断提案是否可以立即执行
 */
export function canExecuteProposal(proposal: ServiceProposal): boolean {
  return proposal.missingInputs.length === 0 && !proposal.requiresConfirmation;
}

/**
 * 获取提案的首选服务
 */
export function getPrimaryService(proposal: ServiceProposal): ServiceProposalItem | null {
  return proposal.recommendedServices[0] ?? null;
}

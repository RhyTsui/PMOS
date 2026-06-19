/**
 * CaseFrame — 案例帧契约
 *
 * CaseFrame 是跨轮持久的结构化状态对象，表示一个"服务案例"的完整生命周期。
 * 与 semanticFrame（单轮推理）不同，CaseFrame 贯穿多个对话轮次，
 * 跟踪从"发现需求"到"交付结果"再到"沉淀知识"的完整过程。
 *
 * 设计原则：
 * 1. CaseFrame 按 caseId 聚合，一个 conversation 可包含多个 case
 * 2. 每轮 semanticFrame 产出后 merge 进当前 CaseFrame
 * 3. CaseFrame 有明确的生命周期阶段（CaseStage）
 * 4. CaseFrame 是 Feedback Loop（服务沉淀）的数据基础
 *
 * 与 semanticFrame 的关系：
 * - semanticFrame：单轮推理结果（这一轮用户说了什么、推断出什么）
 * - CaseFrame：跨轮聚合状态（这个 case 整体进展到哪一步、积累了什么）
 * - 类比：semanticFrame 是一次听诊结果，CaseFrame 是整份病历
 */

import type { ServiceType, ServiceFamily } from '@/contracts/service-catalog';

// ─── Case Stage（案例阶段）─────────────────────────────

/**
 * 案例生命周期阶段。
 * 合法迁移路径：
 * - discovering → clarifying → ready_to_execute → executing → resolved → converted_to_task
 * - 任意阶段 → waiting_user（等待用户确认/补充）
 * - 任意阶段 → abandoned（放弃）
 */
export const CASE_STAGES = [
  'discovering',        // 发现中：正在理解用户诉求
  'clarifying',         // 澄清中：需要补充信息
  'ready_to_execute',   // 就绪：信息已齐，等待执行
  'executing',          // 执行中：正在调用工具/服务
  'waiting_user',       // 等待用户：需要用户确认或补充
  'resolved',           // 已解决：服务完成
  'converted_to_task',  // 已转任务：沉淀为待办/需求
  'abandoned',          // 已放弃：用户取消或超时
] as const;
export type CaseStage = typeof CASE_STAGES[number];

// ─── Case Priority ─────────────────────────────────────

export type CasePriority = 'low' | 'medium' | 'high' | 'urgent';

// ─── Case Frame ────────────────────────────────────────

/**
 * 案例帧：跨轮持久的服务案例状态
 */
export interface CaseFrame {
  /** 案例唯一 ID */
  caseId: string;
  /** 所属会话 ID */
  conversationId: string;
  /** 创建时间 ISO */
  createdAt: string;
  /** 最后更新时间 ISO */
  updatedAt: string;
  /** 关闭时间 ISO（resolved/abandoned 时填写） */
  closedAt?: string;

  // ─── 理解层 ──────────────────────────────────────────

  /** 用户表面说了什么（原始消息列表） */
  surfaceAsks: string[];
  /** 推断的真实目标 */
  realGoal?: string;
  /** 当前判断的服务类型 */
  serviceType?: ServiceType;
  /** 服务族 */
  serviceFamily?: ServiceFamily;
  /** 当前阶段 */
  stage: CaseStage;
  /** 优先级 */
  priority: CasePriority;

  // ─── 业务上下文 ─────────────────────────────────────

  /** 业务上下文 */
  businessContext: {
    project?: { id?: string; name?: string };
    app?: { id?: string; name?: string };
    media?: string;
    terminal?: string;
    channel?: string;
    campaign?: string;
    package?: string;
    timeRange?: string;
    metrics?: string[];
    dimensions?: string[];
  };

  // ─── 知识层 ─────────────────────────────────────────

  /** 已确认的事实（来自工具执行、知识库等） */
  knownFacts: Array<{
    id: string;
    content: string;
    source: string;
    recordedAt: string;
  }>;
  /** 用户声明（用户说的但未验证） */
  userClaims: string[];
  /** 系统假设（推断但未经确认） */
  assumptions: Array<{
    statement: string;
    confidence: number;
    source: string;
  }>;
  /** 待解答的问题 */
  openQuestions: string[];

  // ─── 证据层 ─────────────────────────────────────────

  /** 关联的证据 ID（Evidence Ledger entry IDs） */
  evidenceRefs: string[];
  /** 关联的来源 ID */
  sourceRefs: string[];

  // ─── 服务层 ─────────────────────────────────────────

  /** 可选服务列表（Service Discovery 产出） */
  possibleServices: Array<{
    type: ServiceType;
    reason: string;
    canStartNow: boolean;
    missingInputs: string[];
  }>;
  /** 推荐的下一步动作 */
  recommendedNextAction?: string;
  /** 缺失信息列表 */
  missingInputs: string[];

  // ─── 输出层 ─────────────────────────────────────────

  /** 生成的回复/结论 */
  generatedReply?: string;
  /** 生成的产物（报表、需求草稿等） */
  deliverables: Array<{
    type: string;
    id?: string;
    summary: string;
    createdAt: string;
  }>;

  // ─── 轮次追踪 ───────────────────────────────────────

  /** 关联的消息 ID 列表 */
  messageIds: string[];
  /** 轮次计数 */
  turnCount: number;
  /** 最后一次用户消息时间 ISO */
  lastUserMessageAt?: string;

  // ─── 沉淀标记 ───────────────────────────────────────

  /** 是否已沉淀为知识/需求/评测用例 */
  deposited: boolean;
  /** 沉淀类型 */
  depositTypes: Array<'knowledge' | 'requirement' | 'eval_case' | 'alias' | 'capability_gap'>;
  /** 沉淀时间 ISO */
  depositedAt?: string;

  // ─── 扩展 ───────────────────────────────────────────

  /** 自定义标签 */
  tags: string[];
  /** 扩展数据 */
  metadata: Record<string, unknown>;
}

// ─── Case Frame Event ──────────────────────────────────

/**
 * 触发 CaseFrame 状态转换的事件
 */
export type CaseFrameEvent =
  | { type: 'message_received'; message: string; messageId: string }
  | { type: 'intent_identified'; serviceType: ServiceType; realGoal?: string }
  | { type: 'clarification_needed'; missingInputs: string[]; questions: string[] }
  | { type: 'information_provided'; field: string; value: unknown }
  | { type: 'ready_to_execute' }
  | { type: 'execution_started' }
  | { type: 'waiting_for_user'; reason: string }
  | { type: 'execution_completed'; deliverables?: CaseFrame['deliverables'] }
  | { type: 'resolved'; reply?: string }
  | { type: 'converted_to_task'; taskId: string }
  | { type: 'abandoned'; reason: string }
  | { type: 'deposited'; depositTypes: CaseFrame['depositTypes'] };

// ─── Case Frame Summary ────────────────────────────────

/**
 * CaseFrame 的摘要视图，用于展示和检索
 */
export interface CaseFrameSummary {
  caseId: string;
  conversationId: string;
  stage: CaseStage;
  serviceType?: ServiceType;
  realGoal?: string;
  priority: CasePriority;
  turnCount: number;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  deposited: boolean;
}

// ─── Helper Functions ──────────────────────────────────

/**
 * 创建新的 CaseFrame
 */
export function createCaseFrame(params: {
  caseId: string;
  conversationId: string;
  initialMessage?: string;
  messageId?: string;
}): CaseFrame {
  const now = new Date().toISOString();
  return {
    caseId: params.caseId,
    conversationId: params.conversationId,
    createdAt: now,
    updatedAt: now,
    surfaceAsks: params.initialMessage ? [params.initialMessage] : [],
    stage: 'discovering',
    priority: 'medium',
    businessContext: {},
    knownFacts: [],
    userClaims: [],
    assumptions: [],
    openQuestions: [],
    evidenceRefs: [],
    sourceRefs: [],
    possibleServices: [],
    missingInputs: [],
    deliverables: [],
    messageIds: params.messageId ? [params.messageId] : [],
    turnCount: params.initialMessage ? 1 : 0,
    deposited: false,
    depositTypes: [],
    tags: [],
    metadata: {},
  };
}

/**
 * 判断 CaseFrame 是否已关闭
 */
export function isCaseClosed(frame: CaseFrame): boolean {
  return ['resolved', 'converted_to_task', 'abandoned'].includes(frame.stage);
}

/**
 * 判断 CaseFrame 是否等待用户
 */
export function isCaseWaitingUser(frame: CaseFrame): boolean {
  return frame.stage === 'waiting_user' || frame.stage === 'clarifying';
}

/**
 * 转换为摘要视图
 */
export function toCaseFrameSummary(frame: CaseFrame): CaseFrameSummary {
  return {
    caseId: frame.caseId,
    conversationId: frame.conversationId,
    stage: frame.stage,
    serviceType: frame.serviceType,
    realGoal: frame.realGoal,
    priority: frame.priority,
    turnCount: frame.turnCount,
    createdAt: frame.createdAt,
    updatedAt: frame.updatedAt,
    closedAt: frame.closedAt,
    deposited: frame.deposited,
  };
}

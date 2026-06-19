/**
 * Chat Pipeline Types
 *
 * 定义 Chat Runtime Pipeline 的公共类型。
 * 每个 stage handler 通过这些接口通信，不再直接操作 SSE 闭包。
 *
 * 设计原则：
 * 1. StreamIO 封装 SSE 输出操作（push / pushEvent / close 等）
 * 2. PipelineContext 封装所有 stage 共享的输入
 * 3. SharedPipelineState 封装跨 stage 的可变状态
 * 4. 每个 stage 返回 StageResult，可选 terminal=true 表示提前结束
 */

import type {
  AgentProcessEvent,
  AnswerPolicy,
  CompiledContextPackage,
  IntentType,
  MessageContract,
  RuntimeStage,
  RuntimeState,
  WorkflowResult,
  McpServerConfig,
} from '@/types';
import type { UserScope } from '@/lib/user-scope';
import type {
  RouteDecisionContract,
  ServiceIntent,
  ToolPurpose,
} from '@/contracts/request-understanding/route-decision-contract';
import type { RequestSemanticFrame } from '@/contracts/request-understanding/semantic-frame-contract';
import type { UserRequirementContract } from '@/contracts/request-understanding/user-requirement-contract';
import type { EvidenceLedger } from '@/lib/evidence-ledger';
import type { RuntimePromptMap } from '@/lib/prompt-runtime-policy';
import type { SemanticResultContract } from '@/contracts/semantic/semantic-result-contract';
import type { ReportQueryResult } from '@/lib/report-query-orchestrator';
import type { ProjectContextSummary } from '@/lib/chat-runtime/project-context';
import type { CaseFrame } from '@/contracts/case-frame';
import type { ModelServiceConfig } from '@/lib/runtime-config';
import type { CapabilityManifest, CapabilitySelectionCandidate } from '@/contracts/capability/capability-manifest';
import type { RequestRouteDecision } from '@/lib/request-understanding';

export interface ChatRequestHistoryItem {
  role: string;
  content: string;
  [key: string]: unknown;
}

export interface ChatRequestBody {
  message: string;
  intent?: string;
  history?: ChatRequestHistoryItem[];
  metadata?: Record<string, unknown>;
}

export type PipelineRouteDecision = RequestRouteDecision & Partial<Omit<RouteDecisionContract, 'confidence'>> & {
  [key: string]: unknown;
};

export interface PipelineRouteDecisionMetadata {
  serviceIntent: ServiceIntent | string;
  resolvedIntent?: ServiceIntent | string;
  warnings: string[];
  executionConfidence?: 'high' | 'medium' | 'low';
  [key: string]: unknown;
}

// ─── StreamIO ────────────────────────────────────────────────
// 封装 SSE 输出操作，替代 route.ts 内的闭包函数

export interface StreamIO {
  /** 推送 SSE 事件。 */
  push: (payload: Record<string, unknown>) => boolean;
  /** 推送 process event 并记录到 processEvents 数组。 */
  pushEvent: (event: AgentProcessEvent) => void;
  /** 推送 runtime state 事件。 */
  pushRuntimeState: (
    currentStage: RuntimeState['current_stage'],
    completedStages?: RuntimeStage[],
    status?: RuntimeState['status'],
  ) => void;
  /** 关闭 SSE 流。 */
  close: () => void;
  /** 结束 planning 阶段并启动 execution 阶段（hook 发出）。 */
  endPlanningAndStartExecution: () => Promise<void>;
  /** 当前已收集的 process events（只读）。 */
  getProcessEvents: () => AgentProcessEvent[];
  /** 当前 evidence ledger（可变，stage 可更新）。 */
  getEvidenceLedger: () => EvidenceLedger;
  /** 更新 evidence ledger。 */
  setEvidenceLedger: (ledger: EvidenceLedger) => void;
}

// ─── PipelineContext ─────────────────────────────────────────
// 所有 stage 共享的输入（不可变或仅在 route.ts 主链路中写入）

export interface ChatPipelineContext {
  // ─── 基础标识 ───
  message: string;
  question: string;
  conversationId: string;
  traceId: string;
  startedAt: string;
  userScopeKey: string;
  body: ChatRequestBody;

  // ─── 理解阶段产物 ───
  compiledContext: CompiledContextPackage;
  semanticFrame: RequestSemanticFrame;
  userRequirement: UserRequirementContract;
  projectContextSummary: ProjectContextSummary;
  serviceProposal?: import('@/contracts/service-proposal').ServiceProposal;
  possibleServices?: Array<{ type: string; displayName: string; reason: string; canStartNow: boolean; missingInputs: string[]; confidence: number; family: string }>;
  caseFrame?: CaseFrame;

  // ─── 路由决策 ───
  route: PipelineRouteDecision;
  routeIntent: IntentType | string;
  routeServiceIntent: ServiceIntent | string;
  routeToolPurpose: ToolPurpose;
  routeReason: string;
  routeConfidence: number | string | undefined;
  routeAgent: string;
  clientIntent: string | undefined;
  isReportQuery: boolean;

  // ─── 路由匹配 / 仲裁 ───
  reportRouteMatch: any;
  capabilityReportMatch: any;
  publicWebNeed: any;
  routeInformationSourceArbitration: any;
  routeDecisionMetadata: PipelineRouteDecisionMetadata;
  matchedRouteRules: any[];

  // ─── Skill / Capability ───
  skillSelection: {
    selected?: {
      skill: { skill_id: string; name: string; description?: string };
      score?: number;
      reasons?: string[];
      matchedTriggers?: string[];
    };
  };
  routeServers: McpServerConfig[];
  routeCapabilityManifest: CapabilityManifest[];
  routeCapabilityCandidates: CapabilitySelectionCandidate[];

  // ─── 报表续查 ───
  reportContinuation: boolean;
  reportContinuationClassification: any;

  // ─── Prompt 配置 ───
  promptConfigMetadata: any;
  promptRuntimePolicy: any;
  runtimePrompts: RuntimePromptMap;

  // ─── 模型服务配置 ───
  modelServiceConfig: ModelServiceConfig | null;
  publicWebModelServiceConfig: ModelServiceConfig | null;
  nonReportModelServiceConfig: ModelServiceConfig | null;
  reportModelServiceConfig: ModelServiceConfig | null;

  // ─── 用户 scope ───
  userScope: UserScope | null;

  // ─── 路由告警（可变数组，stages 会 push） ───
  routeWarnings: string[];

  // ─── 其他上下文 ───
  [key: string]: unknown;
}

// ─── SharedPipelineState ─────────────────────────────────────
// 跨 stage 的可变状态。stage 可以直接修改这些字段。

export interface SharedPipelineState {
  /** Evidence ledger — 每个 stage 通过 io.setEvidenceLedger 更新。 */
  evidenceLedger: EvidenceLedger;
  /** 公开网络证据 — public-web stage 产出，open-answer stage 消费。 */
  publicWebEvidenceForComposer: Record<string, unknown> | undefined;
  /** 执行能力决策 — report-query stage 内工具消歧可更新。 */
  executionCapabilityDecision: Record<string, unknown>;
}

// ─── Stage Result ────────────────────────────────────────────
// 每个 stage handler 的返回值

export interface ChatPipelineResult {
  /** 是否为终结状态（需要 close + return）。 */
  terminal?: boolean;
  /** 最终回答内容。 */
  content?: string;
  /** Workflow 结果。 */
  workflowResult?: WorkflowResult;
  /** Semantic Result Contract。 */
  semanticResult?: SemanticResultContract | null;
  /** Message Contract。 */
  messageContract?: MessageContract;
  /** 业务摘要。 */
  businessSummary?: Record<string, unknown>;
  /** 最终 runtime state。 */
  finalRuntimeState?: RuntimeState;
  /** Answer Policy。 */
  answerPolicy?: AnswerPolicy;
  /** 模型参与记录。 */
  modelParticipation?: unknown[];
  /** 额外 metadata（最终合入 done 事件）。 */
  metadata?: Record<string, unknown>;
  /** 意图类型（用于 trace 等）。 */
  intentType?: IntentType | string;
  /** 报表查询结果（仅 report_query 分支）。 */
  reportQueryResult?: ReportQueryResult;
  /** 公开网络证据（public-web stage → open-answer stage）。 */
  publicWebEvidenceForComposer?: Record<string, unknown> | undefined;
  /** 更新后的路由告警。 */
  routeWarnings?: string[];
}

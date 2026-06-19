/**
 * Chat Pipeline
 *
 * 将 Chat route.ts 的主链路拆分为独立的 stage 模块。
 * route.ts 只负责 SSE 流初始化和 stage 编排，具体业务逻辑由以下 stage 承担：
 *
 * - understandingStage — 意图理解、路由决策、能力匹配
 * - publicWebStage    — 公开网络搜索（可选，可能产出 evidence 供后续 stage）
 * - diagnosisStage    — 诊断 Skill 执行
 * - packageStage     — 包查询/交付 Skill 执行
 * - openAnswerStage   — 开放式回答（兜底）
 * - reportQueryStage  — 报表查询（问数）执行
 * - multiQueryStage   — 多工具编排 / 拼表（跨 MCP 工具联邦查询）
 */

export type {
  ChatPipelineContext,
  ChatPipelineResult,
  ChatRequestBody,
  PipelineRouteDecision,
  SharedPipelineState,
  StreamIO,
} from './pipeline-types';
export { createStreamIO } from './stream-io';
export { executeUnderstandingStage, type UnderstandingInput, type UnderstandingResult, type UnderstandingBlockedResult, type UnderstandingOutput } from './understanding-stage';
export { executePublicWebStage } from './public-web-stage';
export { executeDiagnosisStage } from './diagnosis-stage';
export { executePackageStage, shouldEnterPackageStage } from './package-stage';
export { executeOpenAnswerStage } from './open-answer-stage';
export { executeReportQueryStage } from './report-query-stage';
export { executeMultiQueryStage, shouldEnterMultiQueryStage } from './multi-query-stage';

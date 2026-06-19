/**
 * CaseFrame — 案例帧
 *
 * 跨轮持久的结构化状态对象，跟踪服务案例的完整生命周期。
 */

export {
  // 常量
  CASE_STAGES,
  // 类型
  type CaseStage,
  type CasePriority,
  type CaseFrame,
  type CaseFrameEvent,
  type CaseFrameSummary,
  // 函数
  createCaseFrame,
  isCaseClosed,
  isCaseWaitingUser,
  toCaseFrameSummary,
} from './case-frame-contract';

export {
  CaseFrameTransitionError,
  applyCaseFrameEvent,
  canTransition,
  getAvailableTransitions,
  isTerminalStage,
} from './case-frame-transition';

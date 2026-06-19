/**
 * Request Semantic Frame Contract
 *
 * 语义框架合约：从用户输入中提取结构化语义信息。
 *
 * 设计原则：
 * 1. semantic frame 只表达理解结果，不授权执行
 * 2. 通用语法规则只能产生 semantic frame，不能授权执行
 * 3. 业务对象来自 Domain Ontology / Report Catalog / Capability Manifest
 * 4. 执行仍由 execution gate 根据 frame + capability contract + policy 决定
 */

import type { ServiceIntent } from './route-decision-contract';

// ─── Speech Act（言语行为）───────────────────────────────

export type SpeechAct =
  | 'ask_definition'      // 询问定义/含义（"X是什么"、"X什么意思"）
  | 'ask_data'            // 询问数据（"查X数据"、"X的报表"）
  | 'ask_diagnosis'       // 询问诊断（"为什么X异常"、"X问题排查"）
  | 'ask_how_to'          // 询问方法（"如何配置"、"怎么接入"）
  | 'request_operation'   // 请求操作（"执行配置检查"、"投放包"）
  | 'chat';               // 闲聊/通用对话

// ─── Semantic Task（语义任务）────────────────────────────

export type SemanticTask =
  | 'retrieve_report_data'      // 查报表数据
  | 'explain_field_or_value'    // 解释字段/值含义
  | 'diagnose_data_issue'       // 诊断数据问题
  | 'draft_requirement'         // 撰写需求
  | 'execute_workflow'          // 执行工作流（通用，具体类型由 serviceIntent 决定）
  | 'general_chat';             // 通用对话

// ─── Execution Mode（执行模式）───────────────────────────

export type ExecutionMode =
  | 'none'                    // 纯回答，不调用工具
  | 'read_only_lookup'        // 只读查询（字典/知识库/schema）
  | 'data_execution'          // 数据执行（查报表）
  | 'diagnostic_evidence'     // 诊断证据收集
  | 'workflow_execution'      // 工作流执行
  | 'mutation';               // 状态变更

// ─── Evidence Need（证据需求）────────────────────────────

export type EvidenceNeed =
  | 'field_dictionary'        // 字段字典
  | 'schema_registry'         // Schema 注册表
  | 'metric_dictionary'       // 指标字典
  | 'knowledge_base'          // 知识库
  | 'data_mcp'                // 数据 MCP 工具
  | 'config_check'            // 配置检查
  | 'log_check'               // 日志检查
  | 'public_web'              // 公开网络
  | 'conversation_context';   // 对话上下文

// ─── Business Object Role ────────────────────────────────

export type BusinessObjectRole =
  | 'primary_target'    // 主要目标（"素材报表的数据"中的"素材报表"）
  | 'constraint'        // 约束条件（"今天的"中的"今天"）
  | 'term'              // 术语（"未知是什么"中的"未知"）
  | 'context';          // 上下文

// ─── Business Object Reference ───────────────────────────

/**
 * 业务对象引用。
 * 由 Object Resolver 从 Domain Ontology 解析得到。
 *
 * 注意：完整的类型定义在 domain-ontology-contract.ts 中。
 * 这里保留兼容类型，新增 workflow/package/operation 类型。
 */
export interface BusinessObjectReference {
  type: 'report' | 'metric' | 'dimension' | 'time_range' | 'entity' | 'field' | 'field_value' | 'workflow' | 'package' | 'operation';
  reference: string;            // 原始文本引用
  conceptId?: string;           // 概念 ID（来自 ontology）
  displayName?: string;         // 显示名称
  role: BusinessObjectRole;
  source: 'ontology' | 'capability_manifest' | 'user_explicit' | 'fallback';
  resolved?: boolean;           // 是否已解析到具体能力
  confidence: number;
}

// ─── Semantic Frame ──────────────────────────────────────

export interface RequestSemanticFrame {
  // 言语行为
  speechAct: SpeechAct;

  // 语义任务
  semanticTask: SemanticTask;

  // 执行模式
  executionMode: ExecutionMode;

  // 业务对象引用（来自 Domain Ontology，不是关键词）
  businessObjects: BusinessObjectReference[];

  // 服务意图（从 semanticTask + context 推导，不是关键词）
  serviceIntent: ServiceIntent;

  // 证据需求（该任务需要什么类型的证据）
  evidenceNeeds: EvidenceNeed[];

  // 槽位状态
  requiredSlots: string[];
  filledSlots: string[];
  missingSlots: string[];

  // 是否需要澄清
  needsClarification: boolean;
  clarificationReason?: string;

  // 来源追踪
  frameSource: 'syntax_rule' | 'llm_understanding' | 'capability_match';
  confidence: number;

  // 字段定义信号（如果是 explain_field_or_value）
  fieldDefinition?: {
    targetObject?: string;
    targetTerm?: string;
    termRole: 'field_name' | 'field_value' | 'unknown';
  };
}

// ─── Speech Act → Semantic Task Mapping ──────────────────

export function speechActToSemanticTask(act: SpeechAct): SemanticTask {
  switch (act) {
    case 'ask_definition':
      return 'explain_field_or_value';
    case 'ask_data':
      return 'retrieve_report_data';
    case 'ask_diagnosis':
      return 'diagnose_data_issue';
    case 'ask_how_to':
      return 'general_chat'; // how-to 通常是解释，不是执行
    case 'request_operation':
      return 'execute_workflow';
    case 'chat':
      return 'general_chat';
  }
}

// ─── Semantic Task → Execution Mode Mapping ──────────────

export function semanticTaskToExecutionMode(task: SemanticTask): ExecutionMode {
  switch (task) {
    case 'retrieve_report_data':
      return 'data_execution';
    case 'explain_field_or_value':
      return 'read_only_lookup';
    case 'diagnose_data_issue':
      return 'diagnostic_evidence';
    case 'draft_requirement':
      return 'none'; // 需求撰写是生成，不是执行
    case 'execute_workflow':
      return 'workflow_execution';
    case 'general_chat':
      return 'none';
  }
}

// ─── Semantic Task → Evidence Needs Mapping ──────────────

export function semanticTaskToEvidenceNeeds(task: SemanticTask): EvidenceNeed[] {
  switch (task) {
    case 'retrieve_report_data':
      return ['data_mcp', 'conversation_context'];
    case 'explain_field_or_value':
      return ['field_dictionary', 'schema_registry', 'knowledge_base'];
    case 'diagnose_data_issue':
      return ['data_mcp', 'log_check', 'knowledge_base'];
    case 'draft_requirement':
      return ['knowledge_base', 'conversation_context'];
    case 'execute_workflow':
      return ['config_check', 'conversation_context'];
    case 'general_chat':
      return ['knowledge_base', 'public_web', 'conversation_context'];
  }
}

// ─── Semantic Task → Service Intent Mapping ──────────────
// 注意：execute_workflow 不硬映射到单一 serviceIntent
// 具体 serviceIntent 由 frame 构建时根据上下文决定

export function semanticTaskToDefaultServiceIntent(task: SemanticTask): ServiceIntent {
  switch (task) {
    case 'retrieve_report_data':
      return 'data_query';
    case 'explain_field_or_value':
      return 'field_definition';
    case 'diagnose_data_issue':
      return 'issue_diagnosis';
    case 'draft_requirement':
      return 'light_requirement';
    case 'execute_workflow':
      // 工作流的默认 serviceIntent 需要根据上下文进一步确定
      // 可能是 integration_workflow, package_fetch, system_operation 等
      return 'system_operation';
    case 'general_chat':
      return 'general_chat';
  }
}

// ─── Execution Mode → Blocked Capabilities ───────────────
// 用于 execution gate 快速判断

export function executionModeToBlockedCapabilities(mode: ExecutionMode): string[] {
  switch (mode) {
    case 'none':
    case 'read_only_lookup':
      // 非执行模式，阻止所有执行类能力
      return ['report_execution', 'diagnostic_evidence', 'workflow_execution'];
    case 'data_execution':
      // 数据执行模式，只允许 report_execution
      return ['diagnostic_evidence', 'workflow_execution'];
    case 'diagnostic_evidence':
      // 诊断模式，允许 diagnostic_evidence 和 report_execution
      return ['workflow_execution'];
    case 'workflow_execution':
      // 工作流模式，只允许 workflow_execution
      return ['report_execution', 'diagnostic_evidence'];
    case 'mutation':
      // 状态变更模式，允许 workflow_execution
      return ['report_execution', 'diagnostic_evidence'];
  }
}

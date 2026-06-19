import type { PromptConfig } from '@/types';

/**
 * Prompt Runtime Consumer Registry
 *
 * P0 治理：建立 promptId → 运行时消费者 的精确映射。
 * 所有 active_runtime 和 hardcoded_to_managed prompt 必须有此注册。
 * 健康检查依赖此注册表验证 required prompt 是否有真实消费者。
 */

export type PromptConsumerCategory =
  | 'active_runtime'
  | 'active_alias'
  | 'hardcoded_to_managed';

export interface RuntimeConsumerEntry {
  promptId: string;
  consumer: string;
  consumerFile: string;
  useCase: string;
  mainPath: boolean;
  category: PromptConsumerCategory;
}

/**
 * Ghost prompt → active_runtime prompt 映射表。
 * 用于 PRODUCTION_PROMPT_SEEDS 中的幽灵提示词标记 deprecatedBy。
 */
export const GHOST_TO_RUNTIME_MAP: Record<string, { deprecatedBy: string; archiveReason: string }> = {
  'core.system': { deprecatedBy: 'model-use-case.chat_answer', archiveReason: '核心系统约束已通过 contract-safety 代码层实现，无需 LLM 层重复' },
  'core.visibility_policy': { deprecatedBy: 'evidence_prompt', archiveReason: '可见性策略已通过 runtime visibility 代码层实现' },
  'core.output_contract': { deprecatedBy: 'response_prompt', archiveReason: '输出协议已通过 message_contract 代码层实现' },
  'route.intent': { deprecatedBy: 'route_prompt', archiveReason: '已被 route_prompt 完全覆盖' },
  'route.report_query': { deprecatedBy: 'report_query_route_prompt', archiveReason: '已被 report_query_route_prompt 完全覆盖' },
  'route.debugging_guard': { deprecatedBy: 'route_prompt', archiveReason: '联调保护已合并到 route_prompt 路由逻辑' },
  'chat.answer': { deprecatedBy: 'model-use-case.chat_answer', archiveReason: '已被 model-use-case.chat_answer 替代' },
  'chat.actions': { deprecatedBy: 'followup_prompt', archiveReason: '动作生成已合并到 followup_prompt' },
  'chat.degrade': { deprecatedBy: 'response_prompt', archiveReason: '降级文案已合并到 response_prompt' },
  'chat.card': { deprecatedBy: 'card_prompt', archiveReason: '已被 card_prompt 完全覆盖' },
  'chat.evidence': { deprecatedBy: 'evidence_prompt', archiveReason: '已被 evidence_prompt 完全覆盖' },
  'report_query.policy': { deprecatedBy: 'report_query_route_prompt', archiveReason: '问数策略已合并到 report_query_route_prompt' },
  'report_query.orchestrator': { deprecatedBy: 'report_query_route_prompt', archiveReason: '问数编排已合并到 report_query_route_prompt' },
  'report_query.answer': { deprecatedBy: 'report_query_answer_prompt', archiveReason: '已被 report_query_answer_prompt 完全覆盖' },
  'report_query.visual': { deprecatedBy: 'report_query_visual_prompt', archiveReason: '已被 report_query_visual_prompt 完全覆盖' },
  'report_query.actions': { deprecatedBy: 'followup_prompt', archiveReason: '问数动作已合并到 followup_prompt' },
  'report_query.evidence': { deprecatedBy: 'report_query_evidence_prompt', archiveReason: '已被 report_query_evidence_prompt 完全覆盖' },
  'report_query.degrade': { deprecatedBy: 'report_query_answer_prompt', archiveReason: '问数降级已合并到 report_query_answer_prompt' },
  // P1-#1: help/diagnosis/demand/debugging/delivery.answer 已从 ghost 升级为 active_runtime
  'clarification.question': { deprecatedBy: 'model-use-case.ambiguity_detection', archiveReason: '追问澄清已合并到 ambiguity_detection 模型用例' },
};

export const RUNTIME_CONSUMER_REGISTRY: RuntimeConsumerEntry[] = [
  // ──── chat/route.ts 消费的 10 个主链路 prompt ────
  { promptId: 'route_prompt', consumer: 'chat/route.ts:routePrompt', consumerFile: 'src/app/api/chat/route.ts', useCase: 'intent_routing', mainPath: true, category: 'active_runtime' },
  { promptId: 'response_prompt', consumer: 'chat/route.ts:responsePrompt', consumerFile: 'src/app/api/chat/route.ts', useCase: 'response_generation', mainPath: true, category: 'active_runtime' },
  { promptId: 'evidence_prompt', consumer: 'chat/route.ts:evidencePrompt', consumerFile: 'src/app/api/chat/route.ts', useCase: 'evidence_organization', mainPath: true, category: 'active_runtime' },
  { promptId: 'card_prompt', consumer: 'chat/route.ts:cardPrompt', consumerFile: 'src/app/api/chat/route.ts', useCase: 'card_display', mainPath: true, category: 'active_runtime' },
  { promptId: 'followup_prompt', consumer: 'chat/route.ts:followupPrompt', consumerFile: 'src/app/api/chat/route.ts', useCase: 'followup_suggestions', mainPath: true, category: 'active_runtime' },
  { promptId: 'tool_explain_prompt', consumer: 'chat/route.ts:toolExplainPrompt', consumerFile: 'src/app/api/chat/route.ts', useCase: 'tool_explanation', mainPath: true, category: 'active_runtime' },
  { promptId: 'report_query_route_prompt', consumer: 'chat/route.ts:reportQueryRoutePrompt', consumerFile: 'src/app/api/chat/route.ts', useCase: 'report_query_routing', mainPath: true, category: 'active_runtime' },
  { promptId: 'report_query_answer_prompt', consumer: 'chat/route.ts:reportQueryAnswerPrompt', consumerFile: 'src/app/api/chat/route.ts', useCase: 'report_query_answer', mainPath: true, category: 'active_runtime' },
  { promptId: 'report_query_visual_prompt', consumer: 'chat/route.ts:reportQueryVisualPrompt', consumerFile: 'src/app/api/chat/route.ts', useCase: 'report_query_visual', mainPath: true, category: 'active_runtime' },
  { promptId: 'report_query_evidence_prompt', consumer: 'chat/route.ts:reportQueryEvidencePrompt', consumerFile: 'src/app/api/chat/route.ts', useCase: 'report_query_evidence', mainPath: true, category: 'active_runtime' },

  // ──── model-use-case-runtime.ts 消费的 22 个模型用例 prompt ────
  { promptId: 'model-use-case.request_understanding', consumer: 'model-use-case-runtime.ts', consumerFile: 'src/lib/model-use-case-runtime.ts', useCase: 'request_understanding', mainPath: true, category: 'active_runtime' },
  { promptId: 'model-use-case.intent_routing_review', consumer: 'model-use-case-runtime.ts', consumerFile: 'src/lib/model-use-case-runtime.ts', useCase: 'intent_routing_review', mainPath: true, category: 'active_runtime' },
  { promptId: 'model-use-case.query_contract_building', consumer: 'model-use-case-runtime.ts', consumerFile: 'src/lib/model-use-case-runtime.ts', useCase: 'query_contract_building', mainPath: true, category: 'active_runtime' },
  { promptId: 'model-use-case.entity_candidate_extraction', consumer: 'model-use-case-runtime.ts', consumerFile: 'src/lib/model-use-case-runtime.ts', useCase: 'entity_candidate_extraction', mainPath: true, category: 'active_runtime' },
  { promptId: 'model-use-case.ambiguity_detection', consumer: 'model-use-case-runtime.ts', consumerFile: 'src/lib/model-use-case-runtime.ts', useCase: 'ambiguity_detection', mainPath: true, category: 'active_runtime' },
  { promptId: 'model-use-case.resolver_disambiguation_review', consumer: 'model-use-case-runtime.ts', consumerFile: 'src/lib/model-use-case-runtime.ts', useCase: 'resolver_disambiguation_review', mainPath: true, category: 'active_runtime' },
  { promptId: 'model-use-case.capability_ranking_review', consumer: 'model-use-case-runtime.ts', consumerFile: 'src/lib/model-use-case-runtime.ts', useCase: 'capability_ranking_review', mainPath: true, category: 'active_runtime' },
  { promptId: 'model-use-case.capability_discovery', consumer: 'model-use-case-runtime.ts', consumerFile: 'src/lib/model-use-case-runtime.ts', useCase: 'capability_discovery', mainPath: true, category: 'active_runtime' },
  { promptId: 'model-use-case.tool_selection_review', consumer: 'model-use-case-runtime.ts', consumerFile: 'src/lib/model-use-case-runtime.ts', useCase: 'tool_selection_review', mainPath: true, category: 'active_runtime' },
  { promptId: 'model-use-case.operation_risk_review', consumer: 'model-use-case-runtime.ts', consumerFile: 'src/lib/model-use-case-runtime.ts', useCase: 'operation_risk_review', mainPath: true, category: 'active_runtime' },
  { promptId: 'model-use-case.trace_summary', consumer: 'model-use-case-runtime.ts', consumerFile: 'src/lib/model-use-case-runtime.ts', useCase: 'trace_summary', mainPath: true, category: 'active_runtime' },
  { promptId: 'model-use-case.required_input_assist', consumer: 'model-use-case-runtime.ts', consumerFile: 'src/lib/model-use-case-runtime.ts', useCase: 'required_input_assist', mainPath: true, category: 'active_runtime' },
  { promptId: 'model-use-case.data_result_interpretation', consumer: 'model-use-case-runtime.ts', consumerFile: 'src/lib/model-use-case-runtime.ts', useCase: 'data_result_interpretation', mainPath: true, category: 'active_runtime' },
  { promptId: 'model-use-case.report_summary', consumer: 'model-use-case-runtime.ts', consumerFile: 'src/lib/model-use-case-runtime.ts', useCase: 'report_summary', mainPath: true, category: 'active_runtime' },
  { promptId: 'model-use-case.diagnosis_summary', consumer: 'model-use-case-runtime.ts', consumerFile: 'src/lib/model-use-case-runtime.ts', useCase: 'diagnosis_summary', mainPath: true, category: 'active_runtime' },
  { promptId: 'model-use-case.answer_composition', consumer: 'model-use-case-runtime.ts', consumerFile: 'src/lib/model-use-case-runtime.ts', useCase: 'answer_composition', mainPath: true, category: 'active_runtime' },
  { promptId: 'model-use-case.chat_answer', consumer: 'model-use-case-runtime.ts', consumerFile: 'src/lib/model-use-case-runtime.ts', useCase: 'chat_answer', mainPath: true, category: 'active_runtime' },
  { promptId: 'model-use-case.knowledge_answer', consumer: 'model-use-case-runtime.ts', consumerFile: 'src/lib/model-use-case-runtime.ts', useCase: 'knowledge_answer', mainPath: true, category: 'active_runtime' },
  { promptId: 'model-use-case.requirement_drafting', consumer: 'model-use-case-runtime.ts', consumerFile: 'src/lib/model-use-case-runtime.ts', useCase: 'requirement_drafting', mainPath: true, category: 'active_runtime' },
  { promptId: 'model-use-case.recommendation', consumer: 'model-use-case-runtime.ts', consumerFile: 'src/lib/model-use-case-runtime.ts', useCase: 'recommendation', mainPath: true, category: 'active_runtime' },
  { promptId: 'model-use-case.data_analysis_interpret', consumer: 'model-use-case-runtime.ts', consumerFile: 'src/lib/model-use-case-runtime.ts', useCase: 'data_analysis', mainPath: false, category: 'active_runtime' },

  // ──── 辅助 prompt ────
  { promptId: 'conversation-title-generate', consumer: 'conversations/[id]/title/route.ts', consumerFile: 'src/app/api/xiaoqiao/conversations/[id]/title/route.ts', useCase: 'conversation_title_generate', mainPath: true, category: 'active_runtime' },
  { promptId: 'conversation-title-update', consumer: 'conversations/[id]/title/route.ts', consumerFile: 'src/app/api/xiaoqiao/conversations/[id]/title/route.ts', useCase: 'conversation_title_update', mainPath: true, category: 'active_runtime' },
  { promptId: 'dynamic-recommendation', consumer: 'recommendation-service.ts', consumerFile: 'src/lib/recommendation-service.ts', useCase: 'recommendation', mainPath: true, category: 'active_runtime' },

  // ──── hardcoded_to_managed（P0 新增） ────
  { promptId: 'report_continuation.classifier', consumer: 'chat/route.ts:reportContinuation', consumerFile: 'src/app/api/chat/route.ts', useCase: 'report_continuation_classification', mainPath: false, category: 'hardcoded_to_managed' },
  { promptId: 'public_web.need_classifier', consumer: 'public-web-runtime.ts:needClassifier', consumerFile: 'src/lib/public-web-runtime.ts', useCase: 'public_web_need_classification', mainPath: false, category: 'hardcoded_to_managed' },
  { promptId: 'public_web.query_rewriter', consumer: 'public-web-runtime.ts:queryRewriter', consumerFile: 'src/lib/public-web-runtime.ts', useCase: 'public_web_query_rewrite', mainPath: false, category: 'hardcoded_to_managed' },
  { promptId: 'search.evidence_summary', consumer: 'search-orchestrator.ts:evidenceSummary', consumerFile: 'src/lib/search-orchestrator.ts', useCase: 'evidence_summary_composition', mainPath: false, category: 'hardcoded_to_managed' },
  { promptId: 'planner_shadow.plan', consumer: 'planner-orchestrator.ts:plannerPrompt', consumerFile: 'src/lib/planner-orchestrator.ts', useCase: 'planner_shadow', mainPath: false, category: 'hardcoded_to_managed' },

  // ──── P1-#1: 业务流领域约束提示词（从 ghost 升级为 active_runtime） ────
  { promptId: 'help.answer', consumer: 'model-use-case-runtime.ts:domainContext', consumerFile: 'src/lib/model-use-case-runtime.ts', useCase: 'help_domain_context', mainPath: false, category: 'active_runtime' },
  { promptId: 'diagnosis.answer', consumer: 'model-use-case-runtime.ts:domainContext', consumerFile: 'src/lib/model-use-case-runtime.ts', useCase: 'diagnosis_domain_context', mainPath: false, category: 'active_runtime' },
  { promptId: 'demand.answer', consumer: 'model-use-case-runtime.ts:domainContext', consumerFile: 'src/lib/model-use-case-runtime.ts', useCase: 'demand_domain_context', mainPath: false, category: 'active_runtime' },
  { promptId: 'debugging.answer', consumer: 'model-use-case-runtime.ts:domainContext', consumerFile: 'src/lib/model-use-case-runtime.ts', useCase: 'debugging_domain_context', mainPath: false, category: 'active_runtime' },
  { promptId: 'delivery.answer', consumer: 'model-use-case-runtime.ts:domainContext', consumerFile: 'src/lib/model-use-case-runtime.ts', useCase: 'delivery_domain_context', mainPath: false, category: 'active_runtime' },
];

// 预计算索引
const consumerByPromptId = new Map<string, RuntimeConsumerEntry>();
for (const entry of RUNTIME_CONSUMER_REGISTRY) {
  consumerByPromptId.set(entry.promptId, entry);
}

/** 查询 promptId 的运行时消费者 */
export function getRuntimeConsumer(promptId: string): RuntimeConsumerEntry | undefined {
  return consumerByPromptId.get(promptId);
}

/** 获取所有 required prompt ID（active_runtime + hardcoded_to_managed） */
export function getAllRequiredPromptIds(): string[] {
  return RUNTIME_CONSUMER_REGISTRY
    .filter(entry => entry.category === 'active_runtime' || entry.category === 'hardcoded_to_managed')
    .map(entry => entry.promptId);
}

/** 获取所有 active_runtime prompt ID（仅主路径需要的） */
export function getActiveRuntimePromptIds(): string[] {
  return RUNTIME_CONSUMER_REGISTRY
    .filter(entry => entry.category === 'active_runtime')
    .map(entry => entry.promptId);
}

/** 判断 promptId 是否为 ghost（无运行时消费者） */
export function isGhostPrompt(promptId: string): boolean {
  return !consumerByPromptId.has(promptId);
}

/** 获取 ghost prompt 的归档信息 */
export function getGhostArchiveInfo(promptId: string): { deprecatedBy: string; archiveReason: string } | undefined {
  return GHOST_TO_RUNTIME_MAP[promptId];
}

/**
 * P1-#1: 根据 serviceIntent / routeIntent 返回对应的业务流领域约束 prompt ID。
 * 返回 undefined 表示该意图无专用领域约束，使用通用 chat_answer 即可。
 */
const SERVICE_INTENT_DOMAIN_PROMPT_MAP: Record<string, string> = {
  help_qa: 'help.answer',
  issue_diagnosis: 'diagnosis.answer',
  light_requirement: 'demand.answer',
  system_operation: 'debugging.answer',
  package_fetch: 'delivery.answer',
  integration_workflow: 'delivery.answer',
};

const ROUTE_INTENT_DOMAIN_PROMPT_MAP: Record<string, string> = {
  help: 'help.answer',
  diagnosis: 'diagnosis.answer',
  demand: 'demand.answer',
  debugging: 'debugging.answer',
  get_delivery_packages: 'delivery.answer',
};

export function resolveDomainContextPromptId(params: {
  serviceIntent?: string;
  routeIntent?: string;
}): string | undefined {
  return SERVICE_INTENT_DOMAIN_PROMPT_MAP[params.serviceIntent || '']
    || ROUTE_INTENT_DOMAIN_PROMPT_MAP[params.routeIntent || '']
    || undefined;
}

/** 构建完整的 Prompt Runtime Inventory 行 */
export interface InventoryRow {
  promptId: string;
  source: 'managed_seed' | 'production_seed' | 'layer_seed' | 'builtin' | 'admin';
  enabled: boolean;
  required: boolean;
  runtimeConsumer: string | undefined;
  consumerFile: string | undefined;
  useCase: string | undefined;
  mainPath: boolean;
  fallbackPrompt: boolean;
  adminVisible: boolean;
  issue: string | undefined;
  effectiveStatus: PromptConfig['effectiveStatus'];
}

/** 构建 prompt 运行时清单 */
export function buildPromptInventory(prompts: PromptConfig[]): InventoryRow[] {
  return prompts.map((prompt) => {
    const consumer = getRuntimeConsumer(prompt.id);
    const ghostInfo = getGhostArchiveInfo(prompt.id);
    const isEnabled = prompt.enabled !== false && prompt.status === 'active';
    const isRequired = getAllRequiredPromptIds().includes(prompt.id);

    let effectiveStatus: PromptConfig['effectiveStatus'];
    let issue: string | undefined;

    if (consumer) {
      effectiveStatus = consumer.category === 'hardcoded_to_managed'
        ? 'hardcoded_to_managed'
        : 'active_runtime';
    } else if (ghostInfo) {
      effectiveStatus = 'archived_ghost';
      if (isEnabled) {
        issue = 'enabled + active but no runtime consumer (ghost)';
      }
    } else if (prompt.status === 'draft') {
      effectiveStatus = 'planned_draft';
    } else {
      effectiveStatus = 'archived_ghost';
    }

    if (isRequired && !consumer) {
      issue = 'required but no runtime consumer';
    }
    if (isEnabled && !consumer && !ghostInfo) {
      issue = issue || 'enabled but no runtime consumer';
    }

    return {
      promptId: prompt.id,
      source: prompt.prompt_source === 'seed' ? 'managed_seed'
        : prompt.prompt_source === 'hardcoded' ? 'builtin'
        : prompt.prompt_source === 'admin' ? 'admin'
        : 'managed_seed',
      enabled: isEnabled,
      required: isRequired,
      runtimeConsumer: consumer?.consumer,
      consumerFile: consumer?.consumerFile,
      useCase: consumer?.useCase,
      mainPath: consumer?.mainPath ?? false,
      fallbackPrompt: false,
      adminVisible: true,
      issue,
      effectiveStatus,
    };
  });
}

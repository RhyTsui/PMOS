import type {
  ApprovalPolicyRef,
  AutomationLevel,
  ServiceCenter,
  ServiceOutputSurface,
} from '@/contracts/service-catalog';

export type CapabilityProvider = 'mcp' | 'builtin';

export type CapabilityPurpose =
  | 'report_execution'
  | 'dictionary_lookup'
  | 'schema_lookup'
  | 'diagnostic_evidence'
  | 'workflow_execution';

export type CapabilityType =
  | 'data.report'
  | 'data.dictionary'
  | 'workflow'
  | 'general'
  | 'web_search'
  | 'web_fetch'
  | 'realtime_public_info'
  | 'public_web_qa'
  | 'external_doc_lookup';

export interface CapabilitySupports {
  metrics: string[];
  dimensions: string[];
  identifierTypes: string[];
  granularity: Array<'hour' | 'day' | 'week' | 'month'>;
  views: Array<'summary' | 'trend' | 'table' | 'detail' | 'comparison' | 'diagnosis'>;
}

export type SemanticCapabilitySupportLevel = 'supported' | 'unknown' | 'unsupported';
export type SemanticMetricVariant = 'd1' | 'standard';

export interface SemanticCapabilityEvidence {
  source: 'schema_field' | 'schema_enum' | 'tool_name' | 'description' | 'metadata' | 'inferred';
  raw: string;
  normalized: string;
  confidence?: 'high' | 'medium' | 'low';
}

export interface SemanticDimensionSupport {
  key: string;
  rawFields: string[];
  supportLevel: SemanticCapabilitySupportLevel;
  evidence: SemanticCapabilityEvidence[];
}

export interface SemanticGranularitySupport {
  key: 'hour' | 'day' | 'week' | 'month';
  supportLevel: SemanticCapabilitySupportLevel;
  evidence: SemanticCapabilityEvidence[];
}

export interface SemanticMetricSupport {
  key: string;
  supportLevel: SemanticCapabilitySupportLevel;
  variant?: SemanticMetricVariant;
  rawFields: string[];
  evidence: SemanticCapabilityEvidence[];
}

export interface SemanticCapabilitySurface {
  toolName: string;
  capabilityId: string;
  serviceIntents: string[];
  dataViews: string[];
  timeRangeInputs: string[];
  supportedOutputDimensions: SemanticDimensionSupport[];
  supportedFilterDimensions: SemanticDimensionSupport[];
  supportedGranularities: SemanticGranularitySupport[];
  supportedMetrics: SemanticMetricSupport[];
  requiredToolInputs: string[];
  rawSchemaFields: string[];
  evidence: SemanticCapabilityEvidence[];
}

export interface CapabilityAuthority {
  authoritativeFor: string[];
}

export interface CapabilityManifest {
  capabilityId: string;
  displayName?: string;
  description?: string;
  provider: CapabilityProvider;
  capabilityType: CapabilityType;
  capabilityPurpose?: CapabilityPurpose;
  /**
   * VNext 服务分类元数据。
   *
   * 这些字段用于 Capability Discovery / Admin / Trace 治理，不授权执行。
   * 真实执行仍必须通过 route + semantic frame + capability + execution gate。
   */
  center?: ServiceCenter;
  serviceLine?: string;
  automationLevel?: AutomationLevel;
  owner?: string;
  governanceVersion?: string;
  routeRuleRefs?: string[];
  fallbackPolicy?: 'clarify' | 'degrade' | 'manual_review' | 'not_applicable';
  inputContract?: {
    requiredFields?: string[];
    optionalFields?: string[];
    description?: string;
  };
  toolContractRefs?: string[];
  evidenceNeed?: string[];
  outputSurface?: ServiceOutputSurface[];
  approvalPolicy?: ApprovalPolicyRef;
  /** 执行类别：read_only（只读查询）/ write（状态变更）/ workflow（多步骤）/ diagnostic（诊断证据） */
  executionClass?: 'read_only' | 'write' | 'workflow' | 'diagnostic';
  /** 支持的语义任务（来自 SemanticTask）。用于 planner capability grounding 匹配。 */
  supportedSemanticTasks?: Array<'retrieve_report_data' | 'explain_field_or_value' | 'diagnose_data_issue' | 'draft_requirement' | 'execute_workflow' | 'general_chat'>;
  /** 支持的业务对象类型（来自 Domain Ontology conceptId，如 'report.daily', 'package'）。 */
  supportedObjectTypes?: string[];
  /** 风险等级。permission_blocked 的工具通常为 high/critical。 */
  riskLevel?: 'none' | 'low' | 'medium' | 'high' | 'critical';
  dataDomain: string;
  supportedServiceIntents?: Array<'data_query' | 'report_delivery' | 'package_fetch' | 'integration_workflow' | 'help_qa' | 'field_definition' | 'knowledge_answer' | 'issue_diagnosis' | 'system_operation' | 'general_chat' | 'light_requirement' | 'realtime_public_info'>;
  toolPurpose?: 'none' | 'help_lookup' | 'field_lookup' | 'draft_generation' | 'data_fetch' | 'evidence_fetch' | 'config_check' | 'log_check' | 'package_fetch' | 'integration_run' | 'report_generate' | 'report_schedule' | 'file_data_extraction';
  primaryGoal?: string;
  requiredInputs?: string[];
  optionalInputs?: string[];
  defaultInputs?: Record<string, unknown>;
  resolverDependencies?: Array<{
    entityType: string;
    identifierKey: string;
    required?: boolean;
  }>;
  outputContract?: {
    contractType: 'semantic_result' | 'tool_payload' | 'artifact' | 'unknown';
    requiredFields?: string[];
  };
  errorTaxonomy?: Array<'business_failed' | 'tool_failed' | 'unavailable' | 'permission_denied' | 'schema_mismatch' | 'empty_result'>;
  examples?: string[];
  aliases?: string[];
  triggerHints?: string[];
  supports: CapabilitySupports;
  semanticSurface?: SemanticCapabilitySurface;
  authority?: CapabilityAuthority;
  source: {
    sourceType: CapabilityProvider;
    toolName: string;
    serverId?: string;
  };
}

export type CapabilityExecutionDecision =
  | 'executable'
  | 'executable_with_presentation_fallback'
  | 'needs_clarification'
  | 'no_executable_capability';

export type CapabilityBlockingReason =
  | 'missing_required_slot'
  | 'entity_unresolved'
  | 'metric_unresolved'
  | 'date_range_unresolved'
  | 'tool_data_capability_missing'
  | 'tool_schema_mismatch'
  | 'permission_denied'
  | 'project_context_missing';

export interface CapabilityCoverageDetail {
  covered: boolean;
  missing: string[];
  reasons: string[];
  score?: number;
  supportLevel?: 'full_match' | 'executable_with_validation' | 'partial_match' | 'not_executable';
  unsupportedMetrics?: string[];
  unsupportedDimensions?: string[];
  unsupportedFilters?: string[];
  missingMappings?: string[];
  validationRequired?: string[];
}

export interface CapabilitySelectionCandidate {
  capability: CapabilityManifest;
  score: number;
  reasons: string[];
  dataCoverage?: CapabilityCoverageDetail;
  presentationCoverage?: CapabilityCoverageDetail & {
    requestedView?: string;
    preferredView?: string;
    fallbackView?: string;
  };
}

export interface CapabilitySelectionTrace {
  requirement: {
    task: string;
    requestedView: string;
    requiredDimensions: string[];
    requiredMetrics: string[];
    requiredGranularity: string;
    requiredIdentifiers: string[];
  };
  selectedCapabilityId?: string;
  selectedToolName?: string;
  fallbackUsed: boolean;
  fallbackReason?: string;
  executionDecision?: CapabilityExecutionDecision;
  blockingReason?: CapabilityBlockingReason;
  dataCoverage?: CapabilityCoverageDetail;
  presentationCoverage?: CapabilityCoverageDetail & {
    requestedView?: string;
    preferredView?: string;
    fallbackView?: string;
  };
  candidates: CapabilitySelectionCandidate[];
  warnings: string[];
}

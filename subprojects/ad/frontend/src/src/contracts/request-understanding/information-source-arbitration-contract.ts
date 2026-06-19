export type InformationSourceProvider =
  | 'internal_capability'
  | 'mcp_api'
  | 'knowledge'
  | 'schema_registry'
  | 'field_dictionary'
  | 'public_web'
  | 'conversation_context'
  | 'context'
  | 'model_only'
  | 'model'
  | 'clarify'
  | 'intentorch';

export type InformationSourceCandidateStatus =
  | 'available'
  | 'candidate'
  | 'selected'
  | 'deferred'
  | 'rejected'
  | 'not_evaluated';

export type InformationSourceCandidateRole =
  | 'primary_answer'
  | 'verification'
  | 'context'
  | 'background'
  | 'not_applicable';

export interface InformationSourceCandidate {
  source: InformationSourceProvider;
  status: InformationSourceCandidateStatus;
  priority: number;
  role: InformationSourceCandidateRole;
  reasons: string[];
  evidence_required?: boolean;
  confidence?: number | string;
  metadata?: Record<string, unknown>;
}

export interface InformationSourceArbitration extends Record<string, unknown> {
  policy: 'planner_first_tool_grounded_contract_guarded';
  stage: 'route_arbitration' | 'execution_arbitration';
  selected_source: InformationSourceProvider | 'clarify';
  priority_order: Array<'mcp_api' | 'knowledge' | 'public_web' | 'model_only' | 'clarify'>;
  candidates: InformationSourceCandidate[];
  rejected_authorities: string[];
  public_web_decision: 'not_needed' | 'candidate_only' | 'deferred_to_internal' | 'selected_for_evidence' | 'blocked';
  final_authority: 'plan_arbitrator_then_contract_safety';
}

import type { IntentType } from '@/types';
import type {
  CapabilityDecisionContract,
  DomainSignalContract,
  PromptRuntimeConflict,
  ServiceIntent,
  SkillSelectionContract,
  ToolPurpose,
} from '@/contracts/request-understanding/route-decision-contract';

export type RouteGovernanceConflictCode =
  | 'help_qa_vs_data_query'
  | 'issue_diagnosis_vs_data_query'
  | 'system_operation_vs_report_fallback'
  | 'prompt_strong_report_bias'
  | 'seed_fallback_used'
  | 'domain_signal_service_intent_override'
  | 'skill_route_bonus_without_scope'
  | 'candidate_capability_without_executable'
  | 'skill_mcp_selector_duplicate_decision';

export interface RouteGovernanceConflict {
  code: RouteGovernanceConflictCode;
  message: string;
  severity: 'info' | 'warning' | 'error';
}

export interface RouteRuleGovernanceMetadata {
  ruleId: string;
  status?: string;
  activeVersion?: number;
  version?: number;
  precedence?: number;
  priority?: number;
  rolloutPercent?: number;
  updatedAt?: string;
  changeReason?: string;
}

export interface RouteGovernanceScanInput {
  message: string;
  serviceIntent: ServiceIntent;
  routeIntent: IntentType;
  toolPurpose: ToolPurpose;
  isReportQuery: boolean;
  reportRouteMatch: boolean;
  domainSignals: DomainSignalContract[];
  promptContent?: string;
  promptRuntime?: {
    seedFallbackUsed?: boolean;
    conflicts?: PromptRuntimeConflict[];
  };
  skillSelection?: SkillSelectionContract;
  capabilityDecision?: CapabilityDecisionContract;
}

function hasReportBias(text: string): boolean {
  return /(force|always|default|must|必须|总是|默认|强制).{0,24}(report_query|报表|查数|数据查询)/i.test(text);
}

export function scanRouteGovernanceConflicts(input: RouteGovernanceScanInput): RouteGovernanceConflict[] {
  const conflicts: RouteGovernanceConflict[] = [];
  if (input.serviceIntent === 'help_qa' && (input.isReportQuery || input.routeIntent === 'report_query')) {
    conflicts.push({
      code: 'help_qa_vs_data_query',
      message: 'Help intent has report-query execution evidence.',
      severity: 'warning',
    });
  }
  if (input.serviceIntent === 'issue_diagnosis' && (input.toolPurpose === 'data_fetch' || input.isReportQuery)) {
    conflicts.push({
      code: 'issue_diagnosis_vs_data_query',
      message: 'Diagnosis intent is at risk of being treated as ordinary data query.',
      severity: 'warning',
    });
  }
  if ((input.serviceIntent === 'system_operation' || input.serviceIntent === 'package_fetch' || input.serviceIntent === 'integration_workflow') && input.reportRouteMatch) {
    conflicts.push({
      code: 'system_operation_vs_report_fallback',
      message: 'System operation has report route fallback evidence.',
      severity: 'warning',
    });
  }
  if (input.promptContent && hasReportBias(input.promptContent)) {
    conflicts.push({
      code: 'prompt_strong_report_bias',
      message: 'Prompt contains strong report-query routing language and must remain evidence only.',
      severity: 'warning',
    });
  }
  if (input.promptRuntime?.conflicts?.some(conflict => conflict.conflictType === 'strong_report_bias' || /strong_report_bias|report_query|报表|查数/i.test(conflict.message))) {
    conflicts.push({
      code: 'prompt_strong_report_bias',
      message: 'Prompt runtime conflict indicates strong report-query bias.',
      severity: 'warning',
    });
  }
  if (input.promptRuntime?.seedFallbackUsed) {
    conflicts.push({
      code: 'seed_fallback_used',
      message: 'Prompt seed fallback was used for this decision.',
      severity: 'info',
    });
  }
  if (input.domainSignals.length > 0 && input.domainSignals.some(signal => signal.evidenceOnly !== true)) {
    conflicts.push({
      code: 'domain_signal_service_intent_override',
      message: 'A domain signal is not marked evidence-only.',
      severity: 'error',
    });
  }
  const selectedSkill = input.skillSelection?.selectedSkill;
  const selectedCandidate = input.skillSelection?.candidateSkills.find(candidate => candidate.skillId === selectedSkill);
  if (selectedCandidate && (!selectedCandidate.domainScope || selectedCandidate.domainScope.length === 0) && /route_bonus/i.test(selectedCandidate.reason || '')) {
    conflicts.push({
      code: 'skill_route_bonus_without_scope',
      message: 'Skill route bonus exists without explicit domain scope.',
      severity: 'warning',
    });
  }
  if (input.capabilityDecision?.candidates.length && !input.capabilityDecision.executable) {
    conflicts.push({
      code: 'candidate_capability_without_executable',
      message: 'Candidate capability exists but no executable capability is selected.',
      severity: 'warning',
    });
  }
  if (input.skillSelection?.selectedSkill && input.capabilityDecision?.executable) {
    conflicts.push({
      code: 'skill_mcp_selector_duplicate_decision',
      message: 'Skill selection and MCP capability selector both selected execution targets.',
      severity: 'info',
    });
  }
  return conflicts;
}

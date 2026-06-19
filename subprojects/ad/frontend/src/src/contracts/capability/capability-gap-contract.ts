export interface CapabilityGapCondition {
  label: string;
  value: string;
  status: 'recognized' | 'unresolved' | 'missing';
}

export interface CapabilityGapCheckedCapability {
  name: string;
  status: 'checked' | 'not_configured' | 'not_available';
  description?: string;
}

export interface CapabilityGapMissingCapability {
  type:
    | 'metric'
    | 'dimension'
    | 'filter'
    | 'granularity'
    | 'date_range'
    | 'project_context'
    | 'permission'
    | 'tool_schema'
    | 'presentation';
  label: string;
  userMessage: string;
}

export interface CapabilityGapNextAction {
  label: string;
  actionType:
    | 'configure_capability'
    | 'resolve_entity'
    | 'select_candidate'
    | 'check_permission'
    | 'check_project_context'
    | 'fallback_view';
}

export interface CapabilityGapContract {
  type: 'capability_gap';
  title: string;
  mainMessage?: string;
  recognizedConditions: CapabilityGapCondition[];
  checkedCapabilities: CapabilityGapCheckedCapability[];
  missingCapabilities: CapabilityGapMissingCapability[];
  nextActions: CapabilityGapNextAction[];
  severity: 'info' | 'warning' | 'error';
  debug?: {
    blockingReason?: string;
    fallbackReason?: string;
  };
}

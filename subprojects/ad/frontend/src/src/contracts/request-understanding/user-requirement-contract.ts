import type { EntityDependency, EntityType } from './entity-resolution';

export type RequestTask =
  | 'report_query'
  | 'help'
  | 'diagnosis'
  | 'debugging'
  | 'demand'
  | 'forecast'
  | 'general';

export type RequestedView = 'summary' | 'trend' | 'table' | 'detail' | 'comparison' | 'diagnosis';
export type RequirementGranularity = 'hour' | 'day' | 'week' | 'month';
export type RequirementDimensionRole = 'breakdown' | 'x_axis' | 'filter' | 'focus';
export type RequestServiceIntent =
  | 'general_chat'
  | 'help_qa'
  | 'field_definition'
  | 'knowledge_answer'
  | 'light_requirement'
  | 'issue_diagnosis'
  | 'system_operation'
  | 'data_query'
  | 'report_delivery'
  | 'package_fetch'
  | 'integration_workflow';

export interface RequirementDimension {
  key: string;
  role: RequirementDimensionRole;
}

export interface UserRequirementContract {
  task: RequestTask;
  taskAuthority?: 'planner' | 'route_rule' | 'heuristic_candidate' | 'inherited';
  taskSource?: string;
  taskConfidence?: 'high' | 'medium' | 'low';
  businessDomain: 'advertising';
  serviceIntent?: RequestServiceIntent;
  routeEvidence?: string[];
  domainSignals?: string[];
  capabilityCandidates?: string[];
  blockingRequirements?: string[];
  requestedView: RequestedView;
  focusEntity?: string;
  metrics: string[];
  dimensions: RequirementDimension[];
  filters: Record<string, string[]>;
  requiredIdentifiers: string[];
  entityHints?: Array<{
    entityType: EntityType;
    rawText: string;
  }>;
  identifierDependencies?: EntityDependency[];
  dateRange: {
    type: 'relative' | 'absolute' | 'unknown';
    value: string;
  };
  granularity: RequirementGranularity;
  dataRequirement: {
    requiredDimensions: string[];
    requiredMetrics: string[];
    requiredGranularity: RequirementGranularity;
  };
  clarifyingQuestions?: string[];
  missingFields?: string[];
}

export function createEmptyUserRequirement(): UserRequirementContract {
  return {
    task: 'general',
    businessDomain: 'advertising',
    requestedView: 'summary',
    metrics: [],
    dimensions: [],
    filters: {},
    requiredIdentifiers: [],
    dateRange: {
      type: 'unknown',
      value: '',
    },
    granularity: 'day',
    dataRequirement: {
      requiredDimensions: [],
      requiredMetrics: [],
      requiredGranularity: 'day',
    },
  };
}

export interface RoutingTraceCandidate {
  capabilityId: string;
  toolName: string;
  score: number;
  reasons: string[];
}

export interface RoutingTrace {
  traceId: string;
  userQuestion: string;
  requirement: {
    task: string;
    requestedView: string;
    requiredDimensions: string[];
    requiredMetrics: string[];
    requiredGranularity: string;
  };
  selectedCapabilityId?: string;
  selectedToolName?: string;
  fallbackUsed: boolean;
  fallbackReason?: string;
  candidates: RoutingTraceCandidate[];
  warnings: string[];
  createdAt: string;
}

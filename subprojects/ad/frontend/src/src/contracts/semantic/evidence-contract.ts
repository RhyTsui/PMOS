export type EvidenceType =
  | 'metric-value'
  | 'data-row'
  | 'data-snapshot'
  | 'query-result'
  | 'calculation'
  | 'chart-observation'
  | 'document-excerpt'
  | 'tool-output'
  | 'runtime-trace'
  | 'human-approval'
  | 'model-output'
  | 'experiment-result'
  | 'external-reference'
  | 'policy-rule'
  | 'unknown';

export interface ConfidencePolicy {
  level: 'high' | 'medium' | 'low' | 'unknown';
  score?: number;
  basis?: 'source' | 'calculation' | 'human' | 'model' | 'heuristic' | 'mixed';
  explanation?: string;
}

export interface DataFreshness {
  asOf?: string;
  generatedAt?: string;
  retrievedAt?: string;
  updatedAt?: string;
  status: 'fresh' | 'stale' | 'expired' | 'unknown';
  maxAgeMs?: number;
  staleReason?: string;
}

export interface RedactionPolicy {
  level: 'none' | 'partial' | 'full';
  reason?: string;
  redactedFields?: string[];
}

export interface EvidenceRef {
  id: string;
  type: EvidenceType;
  title: string;
  summary?: string;
  sourceRefIds?: string[];
  artifactRef?: {
    artifactId: string;
    artifactType?: string;
  };
  locator?: {
    kind: string;
    value: string;
    redacted?: boolean;
  };
  fields?: Record<string, unknown>;
  confidence?: ConfidencePolicy;
  freshness?: DataFreshness;
  permission?: {
    requiredPermissions?: string[];
    deniedBehavior?: 'hide' | 'redact' | 'disable' | 'request-access';
  };
  redaction?: RedactionPolicy;
  verification?: {
    status: 'verified' | 'unverified' | 'conflicting' | 'unknown';
    verifiedBy?: 'system' | 'human' | 'tool' | 'model';
    verifiedAt?: string;
  };
  metadata?: Record<string, unknown>;
}

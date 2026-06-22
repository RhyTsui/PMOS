export type AdminPolicySource = 'built_in_default' | 'runtime_config' | 'admin_store' | 'derived_runtime';
export type AdminPolicyStatus = 'active' | 'draft' | 'disabled' | 'degraded';
export type AdminPolicyRiskLevel = 'low' | 'medium' | 'high';

export interface AdminPolicyVersionRef {
  key: string;
  version: string;
  updatedAt: string;
  owner: string;
  source: AdminPolicySource;
  riskLevel: AdminPolicyRiskLevel;
  status: AdminPolicyStatus;
  checksum: string;
}

export interface AdminGuardrailCheckPolicy {
  code: string;
  name: string;
  severity: 'error' | 'warning' | 'info';
  enabled: boolean;
}

export interface AdminGuardrailLayerPolicy {
  enabled: boolean;
  checks: AdminGuardrailCheckPolicy[];
  integration?: string;
}

export interface AdminSafetyPolicy {
  version: AdminPolicyVersionRef;
  guardrails: {
    input: AdminGuardrailLayerPolicy;
    tool: AdminGuardrailLayerPolicy;
    output: AdminGuardrailLayerPolicy;
  };
}

export interface AdminEvidenceSourcePolicy {
  type: string;
  description: string;
  integration_points: string[];
  status: 'active' | 'planned';
}

export interface AdminEvidencePolicy {
  version: AdminPolicyVersionRef;
  sources: AdminEvidenceSourcePolicy[];
  confidence_levels: Array<{ level: string; description: string }>;
}

export interface AdminFeatureFlagPolicy {
  key: string;
  name: string;
  enabled: boolean;
  type: 'boolean' | 'number';
  scope: 'global' | 'role' | 'environment' | 'runtime';
  runtimeBinding: string;
  riskLevel: AdminPolicyRiskLevel;
  owner: string;
  updatedAt: string;
  configVersion: string;
  checksum: string;
  description: string;
  config: Record<string, unknown>;
}

export interface AdminPolicyBundle {
  schemaVersion: 'admin-policy-bundle/v1';
  version: AdminPolicyVersionRef;
  capability: {
    version: AdminPolicyVersionRef;
    manifestCount: number;
    overrideCount: number;
    enabledOverrideCount: number;
    warningCount: number;
  };
  toolContract: {
    version: AdminPolicyVersionRef;
    serverCount: number;
    enabledServerCount: number;
    toolCount: number;
  };
  routePolicy: {
    version: AdminPolicyVersionRef;
    enabled: boolean;
    ruleCount: number;
    fallbackPolicy: string;
    governedSeed: boolean;
  };
  modelPrompt: {
    version: AdminPolicyVersionRef;
    modelRouteCount: number;
    enabledModelRouteCount: number;
    promptCount: number;
    activePromptCount: number;
  };
  evidencePolicy: AdminEvidencePolicy;
  safetyPolicy: AdminSafetyPolicy;
  tracePolicy: {
    version: AdminPolicyVersionRef;
    enabled: boolean;
    sampleRate: number;
    serviceName: string;
    env: string;
  };
  featureFlags: {
    version: AdminPolicyVersionRef;
    flags: AdminFeatureFlagPolicy[];
  };
  health: {
    status: 'healthy' | 'degraded';
    warnings: string[];
    generatedAt: string;
  };
}

export interface EffectiveChatRuntimeConfig {
  schemaVersion: 'effective-chat-runtime-config/v1';
  generatedAt: string;
  adminConfigVersions: Record<string, string>;
  featureFlags: Record<string, boolean | number>;
  safetyPolicy: AdminSafetyPolicy;
  evidencePolicy: AdminEvidencePolicy;
  tracePolicy: AdminPolicyBundle['tracePolicy'];
  routePolicy: Pick<AdminPolicyBundle['routePolicy'], 'enabled' | 'ruleCount' | 'fallbackPolicy' | 'governedSeed'> & {
    version: string;
  };
  capabilityPolicy: Pick<AdminPolicyBundle['capability'], 'manifestCount' | 'overrideCount' | 'enabledOverrideCount' | 'warningCount'> & {
    version: string;
  };
  modelPromptPolicy: Pick<AdminPolicyBundle['modelPrompt'], 'modelRouteCount' | 'enabledModelRouteCount' | 'promptCount' | 'activePromptCount'> & {
    version: string;
  };
}

export type SubjectType = "user" | "department" | "project" | "app";

export type AssetScope =
  | "personal"
  | "department"
  | "project"
  | "company_public"
  | "app_private"
  | "app_shared";

export type PermissionOperation =
  | "view"
  | "retrieve"
  | "quote"
  | "edit"
  | "publish"
  | "bind"
  | "admin";

export type BindingMode = "built_in" | "external";

export type ConnectorCapability =
  | "game_bi"
  | "ads_bi"
  | "multidimensional_analysis"
  | "ads_diagnosis"
  | "ads_auto_tuning";

export type ConnectorPermissionLevel =
  | "result_viewer"
  | "query_runner"
  | "action_operator"
  | "connector_admin";

export interface AuthIdentityInput {
  auth_provider: "unified_auth_center";
  user_id: string;
  tenant_like_org_id?: string;
  department_ids?: string[];
  project_ids?: string[];
  app_ids?: string[];
}

export interface SubjectRef {
  subject_type: SubjectType;
  subject_id: string;
}

export interface EnterpriseKnowledgeAsset {
  asset_id: string;
  asset_name: string;
  asset_scope: AssetScope;
  owner_subject: SubjectRef;
  source_system: "weknora" | "platform_import" | "meeting_note" | "external_subscription";
  tags: string[];
  status: "draft" | "active" | "archived";
}

export interface OperationGrant {
  operation: PermissionOperation;
  allowed_subjects: SubjectRef[];
}

export interface EnterprisePermissionPolicy {
  policy_id: string;
  asset_id: string;
  scope: AssetScope;
  grants: OperationGrant[];
  inherited_from?: string;
}

export interface AppKnowledgeBinding {
  binding_id: string;
  app_id: string;
  asset_id: string;
  binding_mode: BindingMode;
  retrieve_enabled: boolean;
  quote_enabled: boolean;
  edit_enabled: boolean;
}

export interface ConnectorPolicy {
  policy_id: string;
  capability: ConnectorCapability;
  permission_level: ConnectorPermissionLevel;
  allowed_subjects: SubjectRef[];
}

export interface EffectiveAccessContext {
  identity: AuthIdentityInput;
  app_id?: string;
  requested_operations: PermissionOperation[];
  requested_connectors?: ConnectorCapability[];
}

export interface EffectiveAccessDecision {
  allowed_assets: {
    asset_id: string;
    operations: PermissionOperation[];
  }[];
  allowed_connectors: {
    capability: ConnectorCapability;
    permission_level: ConnectorPermissionLevel;
  }[];
  denied_reasons: string[];
}

export const enterprisePermissionBaseline = {
  version: "v1.1",
  northStar:
    "Define enterprise knowledge and AI application permissions locally, while using the unified permission center only for authentication input.",
  authorityBoundary: {
    unifiedPermissionCenter: ["authentication", "trusted identity input", "optional org metadata"],
    localControlPlane: [
      "knowledge asset permission management",
      "application binding management",
      "personal department project public scope management",
      "connector and tool authorization policies",
    ],
  },
  defaultScopes: ["personal", "department", "project", "company_public", "app_private", "app_shared"] satisfies AssetScope[],
  defaultOperations: ["view", "retrieve", "quote", "edit", "publish", "bind", "admin"] satisfies PermissionOperation[],
  defaultConnectorCapabilities: [
    "game_bi",
    "ads_bi",
    "multidimensional_analysis",
    "ads_diagnosis",
    "ads_auto_tuning",
  ] satisfies ConnectorCapability[],
  decisionChain: [
    "accept authenticated identity input",
    "expand subject relations",
    "resolve asset scope",
    "evaluate operation grants",
    "evaluate app binding rules",
    "evaluate connector policies",
    "return effective usable assets and tools",
  ],
} as const;

export default enterprisePermissionBaseline;

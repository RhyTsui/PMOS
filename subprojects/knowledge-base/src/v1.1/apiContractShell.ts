export interface PermissionPolicy {
  scope: string;
  grants: {
    operation: string;
    allowed_subjects: {
      subject_type: string;
      subject_id: string;
    }[];
  }[];
  inherited_from?: string;
}

export interface IntakePayload {
  source_type: string;
  payload_type: string;
  asset_type: string;
  name: string;
  content: string;
  tags: string[];
  permission_policy: PermissionPolicy;
}

export interface IntakeJob {
  intake_id: string;
  status: "pending" | "running" | "completed" | "failed";
  structured_result?: Record<string, unknown>;
  storage_result?: Record<string, unknown>;
  error_message?: string;
}

export interface AssetRecord {
  id: string;
  name: string;
  type: string;
  source_id: string;
  owner_subject: {
    subject_type: string;
    subject_id: string;
  };
  scope: string;
  tags: string[];
  summary: string;
  status: string;
  updated_at: string;
}

export interface ConsumerBinding {
  consumer_type: string;
  consumer_id: string;
  asset_scope: string[];
  asset_types: string[];
}

export interface AppKnowledgeBinding {
  binding_id: string;
  app_id: string;
  asset_id: string;
  binding_mode: "built_in" | "external";
  retrieve_enabled: boolean;
  quote_enabled: boolean;
  edit_enabled: boolean;
}

export interface ConnectorPolicy {
  policy_id: string;
  capability: string;
  permission_level: string;
  allowed_subjects: {
    subject_type: string;
    subject_id: string;
  }[];
}

export interface SearchRequest {
  query: string;
  asset_scope: string[];
  asset_types: string[];
  consumer_type: string;
  consumer_id: string;
}

export interface SearchResult {
  asset_id: string;
  snippet: string;
  score: number;
  source_meta: Record<string, unknown>;
}

export interface SearchResponse {
  results: SearchResult[];
  references: SearchResult[];
  sources: Record<string, unknown>[];
}

export interface ChatQueryRequest {
  message: string;
  consumer_type: string;
  consumer_id: string;
  app_id?: string;
  asset_scope?: string[];
  asset_types?: string[];
}

export interface ChatQueryResponse {
  answer: string;
  references: SearchResult[];
  sources: Record<string, unknown>[];
}

export interface PlazaAsset {
  id: string;
  name: string;
  summary: string;
  source_meta: Record<string, unknown>;
  applicable_scope: string[];
}

export interface EffectiveAccessRequest {
  identity: {
    auth_provider: "unified_auth_center";
    user_id: string;
    department_ids?: string[];
    project_ids?: string[];
    app_ids?: string[];
  };
  app_id?: string;
  requested_operations: string[];
  requested_connectors?: string[];
}

export interface EffectiveAccessResponse {
  allowed_assets: {
    asset_id: string;
    operations: string[];
  }[];
  allowed_connectors: {
    capability: string;
    permission_level: string;
  }[];
  denied_reasons: string[];
}

export const apiContractShell = {
  intake: {
    create: { method: "POST", path: "/api/v1/intakes" },
    list: { method: "GET", path: "/api/v1/intakes" },
    detail: { method: "GET", path: "/api/v1/intakes/:id" },
  },
  assets: {
    list: { method: "GET", path: "/api/v1/assets" },
    detail: { method: "GET", path: "/api/v1/assets/:id" },
    patch: { method: "PATCH", path: "/api/v1/assets/:id" },
    patchPermissions: { method: "PATCH", path: "/api/v1/assets/:id/permissions" },
    references: { method: "GET", path: "/api/v1/assets/:id/references" },
    flags: { method: "POST", path: "/api/v1/assets/:id/flags" },
  },
  consumption: {
    search: { method: "POST", path: "/api/v1/knowledge/search" },
    chatQuery: { method: "POST", path: "/api/v1/chat/query" },
    createBinding: { method: "POST", path: "/api/v1/consumer-bindings" },
    listBindings: { method: "GET", path: "/api/v1/consumer-bindings" },
    createAppBinding: { method: "POST", path: "/api/v1/apps/:id/knowledge-bindings" },
    listAppBindings: { method: "GET", path: "/api/v1/apps/:id/knowledge-bindings" },
  },
  access: {
    effective: { method: "POST", path: "/api/v1/access/effective" },
  },
  connectors: {
    patchPolicy: { method: "PATCH", path: "/api/v1/connector-policies/:id" },
  },
  plaza: {
    home: { method: "GET", path: "/api/v1/plaza/home" },
    detail: { method: "GET", path: "/api/v1/plaza/assets/:id" },
    subscribe: { method: "POST", path: "/api/v1/plaza/assets/:id/subscribe" },
  },
} as const;

export default apiContractShell;

export type PlatformModuleId =
  | "main-chat"
  | "knowledge-assets"
  | "prompt-assets"
  | "intake-center"
  | "knowledge-plaza"
  | "permission-management";

export type WorkstreamId =
  | "foundation"
  | "domain-model"
  | "intake"
  | "asset"
  | "consumption"
  | "governance"
  | "plaza"
  | "experience"
  | "connector";

export type DeliveryPhaseId = "phase-1" | "phase-2" | "phase-3" | "phase-4";

export interface PlatformModule {
  id: PlatformModuleId;
  name: string;
  goal: string;
  priority: "P0" | "P1";
  workstreams: WorkstreamId[];
}

export interface DomainObject {
  id: string;
  description: string;
  fields: string[];
  upstream?: string[];
}

export interface PageDefinition {
  id: string;
  name: string;
  module: PlatformModuleId;
  priority: "P0" | "P1" | "P2";
  purpose: string;
}

export interface ApiDefinition {
  id: string;
  method: "GET" | "POST" | "PATCH";
  path: string;
  lane: WorkstreamId;
  purpose: string;
}

export interface DeliveryPhase {
  id: DeliveryPhaseId;
  name: string;
  goal: string;
  deliverables: string[];
}

export const v11EngineeringManifest = {
  version: "v1.1",
  productName: "Xiaoxun Knowledge Asset Platform",
  northStar:
    "Build a unified enterprise knowledge and AI application platform, validated locally end-to-end before production implementation.",
  baseStrategy: {
    reuse: [
      "WeKnora parsing",
      "chunking and indexing",
      "search and citation",
      "base RAG and model integration",
      "MCP integration framework",
    ],
    rebuild: [
      "top-level product structure",
      "platform domain objects",
      "permission governance model",
      "application binding model",
      "connector authorization model",
      "consumer binding interfaces",
      "knowledge plaza and work entry",
    ],
    excluded: [
      "agent orchestration platform",
      "recording transcription product",
      "testing platform integration",
      "deep GraphRAG production rollout",
    ],
  },
  modules: [
    {
      id: "main-chat",
      name: "Main Chat",
      goal: "Act as the unified work entry for knowledge, prompts, MCP, models, and enterprise AI applications.",
      priority: "P0",
      workstreams: ["consumption", "experience", "governance", "connector"],
    },
    {
      id: "knowledge-assets",
      name: "Knowledge Assets",
      goal: "Provide unified browsing, filtering, detail view, and correction for platform assets.",
      priority: "P0",
      workstreams: ["asset", "governance", "experience"],
    },
    {
      id: "prompt-assets",
      name: "Prompt Assets",
      goal: "Enter the same platform object system and binding system as a parallel asset line.",
      priority: "P1",
      workstreams: ["domain-model", "consumption", "experience"],
    },
    {
      id: "intake-center",
      name: "Intake Center",
      goal: "Accept text, documents, meeting notes, and project data through one intake model.",
      priority: "P0",
      workstreams: ["foundation", "intake", "experience"],
    },
    {
      id: "knowledge-plaza",
      name: "Knowledge Plaza",
      goal: "Provide discovery and subscription instead of acting as a social community.",
      priority: "P1",
      workstreams: ["plaza", "asset", "experience"],
    },
    {
      id: "permission-management",
      name: "Permission Management",
      goal: "Define enterprise subjects, asset scopes, operation permissions, app bindings, and connector policies in one governance model.",
      priority: "P1",
      workstreams: ["governance", "domain-model", "experience", "connector"],
    },
  ] satisfies PlatformModule[],
  domainObjects: [
    {
      id: "auth_identity_input",
      description: "Trusted authentication input from the unified permission center, without delegating control-plane management to it.",
      fields: ["auth_provider", "user_id", "department_ids", "project_ids", "app_ids"],
      upstream: ["foundation", "governance", "consumption"],
    },
    {
      id: "subject_ref",
      description: "Unifies enterprise permission subjects including user, department, project, and AI application.",
      fields: ["subject_type", "subject_id"],
      upstream: ["domain-model", "governance", "consumption"],
    },
    {
      id: "asset",
      description: "Core platform object carrying personal, department, project, public, and app-bound knowledge assets.",
      fields: ["id", "name", "type", "source_id", "owner_subject", "scope", "tags", "summary", "status", "updated_at"],
      upstream: ["intake", "governance", "consumption"],
    },
    {
      id: "asset_type",
      description: "Initial asset type enum for v1.1.",
      fields: [
        "formal_knowledge",
        "process_knowledge",
        "meeting_note",
        "business_rule",
        "faq_case",
        "subscription_content",
      ],
    },
    {
      id: "source",
      description: "Tracks asset origin, import mode, and sync status.",
      fields: ["id", "source_type", "source_name", "import_mode", "last_sync_at"],
    },
    {
      id: "permission_policy",
      description: "Operation-level permission expression over enterprise subjects.",
      fields: ["scope", "grants", "inherited_from"],
      upstream: ["asset", "consumption", "governance"],
    },
    {
      id: "app_knowledge_binding",
      description: "Binds one AI application to built-in or external knowledge assets.",
      fields: ["app_id", "asset_id", "binding_mode", "retrieve_enabled", "quote_enabled", "edit_enabled"],
      upstream: ["consumption", "governance", "connector"],
    },
    {
      id: "connector_policy",
      description: "Controls BI, diagnosis, and automation tool capabilities separately from knowledge permissions.",
      fields: ["capability", "permission_level", "allowed_subjects"],
      upstream: ["connector", "governance", "consumption"],
    },
    {
      id: "consumer_binding",
      description: "Binds consumers such as chats to asset scopes and types.",
      fields: ["consumer_type", "consumer_id", "asset_scope", "asset_types"],
      upstream: ["consumption", "governance"],
    },
    {
      id: "reference",
      description: "Stores citation snippets, source metadata, and usage traces.",
      fields: ["asset_id", "consumer_id", "snippet", "source_meta", "created_at"],
      upstream: ["consumption", "governance"],
    },
  ] satisfies DomainObject[],
  pages: [
    {
      id: "intake-list",
      name: "Intake List",
      module: "intake-center",
      priority: "P0",
      purpose: "Browse intake jobs, sources, statuses, and update times.",
    },
    {
      id: "intake-create",
      name: "Intake Create",
      module: "intake-center",
      priority: "P0",
      purpose: "Create intake jobs with ownership, tags, and permissions.",
    },
    {
      id: "asset-list",
      name: "Asset List",
      module: "knowledge-assets",
      priority: "P0",
      purpose: "Browse and filter all knowledge assets in the platform.",
    },
    {
      id: "asset-detail",
      name: "Asset Detail",
      module: "knowledge-assets",
      priority: "P0",
      purpose: "Inspect raw content, summaries, tags, source, permissions, and references.",
    },
    {
      id: "meeting-note-detail",
      name: "Meeting Note Detail",
      module: "knowledge-assets",
      priority: "P0",
      purpose: "Display structured meeting outputs such as decisions and action items.",
    },
    {
      id: "consumer-binding",
      name: "Consumption Config",
      module: "main-chat",
      priority: "P0",
      purpose: "Configure how chats and AI applications bind to asset scopes, types, and knowledge sources.",
    },
    {
      id: "main-chat-demo",
      name: "Platform Chat Demo",
      module: "main-chat",
      priority: "P0",
      purpose: "Show the main chat using platform knowledge and returning references.",
    },
    {
      id: "business-chat-binding",
      name: "Business Chat Binding",
      module: "main-chat",
      priority: "P1",
      purpose: "Bind data analysis chat and advertising chat to both knowledge scopes and connector policies.",
    },
    {
      id: "plaza-home",
      name: "Knowledge Plaza Home",
      module: "knowledge-plaza",
      priority: "P1",
      purpose: "Show recommended, hot, and topic-based assets for discovery.",
    },
    {
      id: "plaza-detail",
      name: "Knowledge Plaza Detail",
      module: "knowledge-plaza",
      priority: "P1",
      purpose: "Explain one subscribable asset and allow adding it into personal scope.",
    },
    {
      id: "permission-reference",
      name: "Permissions And References",
      module: "permission-management",
      priority: "P1",
      purpose: "Review subject templates, effective permissions, app bindings, connector policies, and reference traces.",
    },
    {
      id: "correction-confirmation",
      name: "Correction And Confirmation",
      module: "permission-management",
      priority: "P2",
      purpose: "Manage summary edits, tag edits, field corrections, and flags.",
    },
  ] satisfies PageDefinition[],
  apis: [
    {
      id: "create-intake",
      method: "POST",
      path: "/api/v1/intakes",
      lane: "intake",
      purpose: "Create a knowledge intake job.",
    },
    {
      id: "list-intakes",
      method: "GET",
      path: "/api/v1/intakes",
      lane: "intake",
      purpose: "List intake jobs.",
    },
    {
      id: "get-intake",
      method: "GET",
      path: "/api/v1/intakes/:id",
      lane: "intake",
      purpose: "Read one intake job and its parse result.",
    },
    {
      id: "list-assets",
      method: "GET",
      path: "/api/v1/assets",
      lane: "asset",
      purpose: "List assets.",
    },
    {
      id: "get-asset",
      method: "GET",
      path: "/api/v1/assets/:id",
      lane: "asset",
      purpose: "Read one asset detail.",
    },
    {
      id: "patch-asset",
      method: "PATCH",
      path: "/api/v1/assets/:id",
      lane: "governance",
      purpose: "Update summary, tags, and base metadata.",
    },
    {
      id: "patch-permissions",
      method: "PATCH",
      path: "/api/v1/assets/:id/permissions",
      lane: "governance",
      purpose: "Update permission policy.",
    },
    {
      id: "create-app-binding",
      method: "POST",
      path: "/api/v1/apps/:id/knowledge-bindings",
      lane: "consumption",
      purpose: "Bind knowledge assets to one AI application.",
    },
    {
      id: "list-app-bindings",
      method: "GET",
      path: "/api/v1/apps/:id/knowledge-bindings",
      lane: "consumption",
      purpose: "List one AI application's knowledge bindings.",
    },
    {
      id: "patch-connector-policy",
      method: "PATCH",
      path: "/api/v1/connector-policies/:id",
      lane: "connector",
      purpose: "Update one connector or tool authorization policy.",
    },
    {
      id: "effective-access",
      method: "POST",
      path: "/api/v1/access/effective",
      lane: "governance",
      purpose: "Resolve effective assets and tools for one authenticated identity and app context.",
    },
    {
      id: "list-references",
      method: "GET",
      path: "/api/v1/assets/:id/references",
      lane: "governance",
      purpose: "Read reference traces.",
    },
    {
      id: "flag-asset",
      method: "POST",
      path: "/api/v1/assets/:id/flags",
      lane: "governance",
      purpose: "Mark an asset as error or outdated.",
    },
    {
      id: "knowledge-search",
      method: "POST",
      path: "/api/v1/knowledge/search",
      lane: "consumption",
      purpose: "Search knowledge with platform permissions applied.",
    },
    {
      id: "chat-query",
      method: "POST",
      path: "/api/v1/chat/query",
      lane: "consumption",
      purpose: "Query platform chat with knowledge assets.",
    },
    {
      id: "create-binding",
      method: "POST",
      path: "/api/v1/consumer-bindings",
      lane: "consumption",
      purpose: "Create a consumer binding.",
    },
    {
      id: "list-bindings",
      method: "GET",
      path: "/api/v1/consumer-bindings",
      lane: "consumption",
      purpose: "List consumer bindings.",
    },
    {
      id: "plaza-home",
      method: "GET",
      path: "/api/v1/plaza/home",
      lane: "plaza",
      purpose: "Load plaza home data.",
    },
    {
      id: "plaza-detail",
      method: "GET",
      path: "/api/v1/plaza/assets/:id",
      lane: "plaza",
      purpose: "Load one plaza asset detail.",
    },
    {
      id: "plaza-subscribe",
      method: "POST",
      path: "/api/v1/plaza/assets/:id/subscribe",
      lane: "plaza",
      purpose: "Subscribe one shared asset into personal scope.",
    },
  ] satisfies ApiDefinition[],
  phases: [
    {
      id: "phase-1",
      name: "Foundation Ready",
      goal: "Make WeKnora minimally usable and connect authenticated identity input into the local platform baseline.",
      deliverables: ["foundation environment", "search sample", "reference sample", "auth input shell"],
    },
    {
      id: "phase-2",
      name: "Platform Skeleton",
      goal: "Land enterprise domain objects, operation-level permission model, app binding model, and platform API shells.",
      deliverables: [
        "domain objects",
        "enterprise permission model",
        "app binding model",
        "intake API shell",
        "consumption API shell",
      ],
    },
    {
      id: "phase-3",
      name: "Scenario Samples",
      goal: "Validate personal loop, department/public access, and two business chat scenarios with connector control.",
      deliverables: [
        "personal knowledge loop",
        "department and public scope sample",
        "data analysis chat sample",
        "advertising chat sample",
        "meeting note sample",
      ],
    },
    {
      id: "phase-4",
      name: "Demo And Acceptance",
      goal: "Assemble a complete local demo validation loop and production handoff package.",
      deliverables: [
        "page skeleton",
        "knowledge plaza sample",
        "correction sample",
        "acceptance checklist",
        "production task packages",
      ],
    },
  ] satisfies DeliveryPhase[],
  immediateBuildSlice: {
    phase: "phase-2",
    rationale:
      "Phase 2 is the smallest engineering baseline that can align enterprise permission design, local validation, later UI, and production handoff to one source of truth.",
    nextArtifacts: [
      "platform domain model",
      "enterprise permission baseline",
      "local validation execution plan",
      "module route map",
      "API contract shell",
      "phase-2 page scaffolds",
    ],
  },
} as const;

export default v11EngineeringManifest;

export type ValidationStage =
  | "requirements_review"
  | "permission_design_review"
  | "adaptation_review"
  | "engineering_review"
  | "local_demo_validation"
  | "production_handoff";

export interface ValidationScenario {
  id: string;
  name: string;
  assets: string[];
  expectedFocus: string;
}

export interface ValidationPackage {
  id: string;
  title: string;
  target: string;
  boundaries: string[];
  testGoals: string[];
  observationMetrics: string[];
  rollbackTriggers: string[];
}

export const localValidationExecutionPlan = {
  version: "v1.1",
  goal:
    "Prove the enterprise permission model locally end-to-end before handing production work to implementation developers.",
  stages: [
    "requirements_review",
    "permission_design_review",
    "adaptation_review",
    "engineering_review",
    "local_demo_validation",
    "production_handoff",
  ] satisfies ValidationStage[],
  mandatoryScenarios: [
    {
      id: "personal-knowledge",
      name: "Personal knowledge management",
      assets: ["personal asset", "meeting note", "personal app binding"],
      expectedFocus: "private-by-default and optional sharing path",
    },
    {
      id: "data-public-support",
      name: "Data department public support knowledge",
      assets: ["department asset", "company public asset"],
      expectedFocus: "company-wide readable and department-maintained",
    },
    {
      id: "project-app-maintenance",
      name: "Project members maintain AI application knowledge",
      assets: ["project asset", "app binding"],
      expectedFocus: "maintain vs use permission split",
    },
    {
      id: "data-app-with-tools",
      name: "Data department AI apps with knowledge and tools",
      assets: ["department asset", "tool connector policy"],
      expectedFocus: "knowledge permission and connector permission both applied",
    },
  ] satisfies ValidationScenario[],
  productionPackages: [
    {
      id: "pkg-auth-input",
      title: "Authentication Input Package",
      target: "Consume unified auth center identity and sync local subject context.",
      boundaries: ["identity input", "context hydration", "no local permission UI yet"],
      testGoals: ["auth input accepted", "subject expansion correct"],
      observationMetrics: ["login success rate", "subject mapping accuracy"],
      rollbackTriggers: ["subject mismatch", "auth context corruption"],
    },
    {
      id: "pkg-asset-model",
      title: "Asset And Scope Package",
      target: "Land knowledge asset and asset scope model.",
      boundaries: ["asset schema", "scope schema", "basic CRUD shell"],
      testGoals: ["asset CRUD works", "scope separation works"],
      observationMetrics: ["asset creation pass rate", "scope filter accuracy"],
      rollbackTriggers: ["scope leakage", "asset migration failure"],
    },
    {
      id: "pkg-permission-chain",
      title: "Permission Decision Package",
      target: "Apply operation-level permission decisions to search and references.",
      boundaries: ["permission evaluation", "search filtering", "reference filtering"],
      testGoals: ["permission differences visible", "quote restrictions enforced"],
      observationMetrics: ["permission filter accuracy", "reference correctness"],
      rollbackTriggers: ["over-permission", "missing required access"],
    },
    {
      id: "pkg-app-binding",
      title: "App Binding Package",
      target: "Enable built-in and external knowledge bindings for AI applications.",
      boundaries: ["binding creation", "binding read path", "binding enforcement"],
      testGoals: ["built-in binding works", "external binding works"],
      observationMetrics: ["binding success rate", "app retrieval correctness"],
      rollbackTriggers: ["wrong app sees wrong asset", "binding persistence failure"],
    },
    {
      id: "pkg-connector-policy",
      title: "Connector Policy Package",
      target: "Apply connector and tool permissions for BI and diagnosis capabilities.",
      boundaries: ["connector policy", "tool gating", "result visibility"],
      testGoals: ["connector permissions differ by role", "tool actions gated correctly"],
      observationMetrics: ["tool deny accuracy", "connector execution error rate"],
      rollbackTriggers: ["unsafe tool access", "connector outage caused by policy"],
    },
  ] satisfies ValidationPackage[],
} as const;

export default localValidationExecutionPlan;

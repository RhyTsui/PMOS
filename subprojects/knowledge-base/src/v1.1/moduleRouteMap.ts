import type { PlatformModuleId } from "./engineeringManifest";

export interface ModuleRoute {
  id: string;
  path: string;
  module: PlatformModuleId;
  page: string;
  priority: "P0" | "P1" | "P2";
  phase: "phase-2" | "phase-3" | "phase-4";
}

export const moduleRouteMap: ModuleRoute[] = [
  {
    id: "intake-list",
    path: "/intakes",
    module: "intake-center",
    page: "Intake List",
    priority: "P0",
    phase: "phase-2",
  },
  {
    id: "intake-create",
    path: "/intakes/new",
    module: "intake-center",
    page: "Intake Create",
    priority: "P0",
    phase: "phase-2",
  },
  {
    id: "asset-list",
    path: "/assets",
    module: "knowledge-assets",
    page: "Asset List",
    priority: "P0",
    phase: "phase-2",
  },
  {
    id: "asset-detail",
    path: "/assets/:id",
    module: "knowledge-assets",
    page: "Asset Detail",
    priority: "P0",
    phase: "phase-2",
  },
  {
    id: "meeting-note-detail",
    path: "/meeting-notes/:id",
    module: "knowledge-assets",
    page: "Meeting Note Detail",
    priority: "P0",
    phase: "phase-3",
  },
  {
    id: "consumer-config",
    path: "/consumption/config",
    module: "main-chat",
    page: "Consumption Config",
    priority: "P0",
    phase: "phase-2",
  },
  {
    id: "platform-chat-demo",
    path: "/chat",
    module: "main-chat",
    page: "Platform Chat Demo",
    priority: "P0",
    phase: "phase-3",
  },
  {
    id: "business-chat-binding",
    path: "/consumption/business-bindings",
    module: "main-chat",
    page: "Business Chat Binding",
    priority: "P1",
    phase: "phase-3",
  },
  {
    id: "app-knowledge-bindings",
    path: "/apps/:id/knowledge-bindings",
    module: "main-chat",
    page: "App Knowledge Bindings",
    priority: "P0",
    phase: "phase-3",
  },
  {
    id: "plaza-home",
    path: "/plaza",
    module: "knowledge-plaza",
    page: "Knowledge Plaza Home",
    priority: "P1",
    phase: "phase-4",
  },
  {
    id: "plaza-detail",
    path: "/plaza/assets/:id",
    module: "knowledge-plaza",
    page: "Knowledge Plaza Detail",
    priority: "P1",
    phase: "phase-4",
  },
  {
    id: "permission-reference",
    path: "/governance/permissions",
    module: "permission-management",
    page: "Permissions And References",
    priority: "P1",
    phase: "phase-4",
  },
  {
    id: "connector-policies",
    path: "/governance/connectors",
    module: "permission-management",
    page: "Connector Policies",
    priority: "P1",
    phase: "phase-4",
  },
  {
    id: "effective-access-debug",
    path: "/governance/effective-access",
    module: "permission-management",
    page: "Effective Access Debug",
    priority: "P1",
    phase: "phase-4",
  },
  {
    id: "correction-confirmation",
    path: "/governance/corrections",
    module: "permission-management",
    page: "Correction And Confirmation",
    priority: "P2",
    phase: "phase-4",
  },
];

export default moduleRouteMap;

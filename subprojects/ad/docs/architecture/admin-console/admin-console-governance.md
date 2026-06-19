# Admin Console Governance

Status: IA-A planning document.

Baseline: P1-C route governance metadata and conflict scanner landed in commit `9450034`.

This document defines the target information architecture for the Admin Console. It is a planning document only. It does not change `/api/chat`, Prompt runtime content, MCP schema, Route Rules, Capability selection, ResponseContract compatibility, or Admin menu code.

## 1. Current Problems

The current Admin Console is useful but still organized around many configuration entry points instead of a clear control plane.

Primary issues:

- Duplicate entry points: Prompt, Route Rules, Entity Resolution, MCP, Capability Override, Workflow, Skill, Trace, Model Service, Report Policy, and Display Config are exposed as separate surfaces without a shared source-of-truth map.
- Distributed source of truth: runtime JSON files, built-in seeds, default normalizers, and in-memory store caches all participate in effective runtime behavior.
- Mixed boundaries: Prompt, Request Understanding, Capability, MCP, Workflow, Skill, and Renderer governance are visible together, but ownership is not explicit.
- Runtime effect is not obvious: some entries change runtime behavior, some only test or display state, and some are generated or seed-backed defaults.
- Governance metadata is available after P1-C but not yet organized into an Admin IA: Prompt effective metadata, route rule governance metadata, conflict scanner warnings, and route observation need a home.

## 2. Target Admin Console IA

Target centers:

| Center | Purpose |
|---|---|
| Home Overview | Show effective runtime health, latest conflicts, active config sources, and operation status. |
| Request Understanding Center | Govern route rules, route observations, route golden results, and route conflicts. |
| Prompt Strategy Center | Govern prompt configs, versions, bindings, effective prompt metadata, and prompt conflicts. |
| Capability Center | Govern MCP servers, capability manifests, capability overrides, tool availability, and preflight status. |
| Workflow & Agent Center | Govern workflow tasks, skills, skill contracts, automation templates, and task runs. |
| Knowledge & Memory Center | Govern controlled glossary, knowledge settings, memory sources, and personal knowledge config. |
| Domain / Metric / Entity Center | Govern entity resolution, domain packs, metrics, media/project/package/channel config, and report query policy. |
| Model Service & Routing Center | Govern model provider config, model routing by use case, and model service tests. |
| Security / Workspace / Permission Center | Govern users, roles, workspace/project scope, Dataki key, and admin access. |
| Evaluation & Observability Center | Govern trace config, route governance warnings, golden checks, process events, and evaluation views. |
| Frontend Rendering Governance | Govern chat display config, renderer binding, message presentation, runtime disclosure, and UI guardrails. |
| Operations & Release | Govern operation logs, release notes, publish history, rollback notes, and admin audit trails. |

## 3. Old Menu to New Center Mapping

| Current entry | Target center | Runtime effect | Notes |
|---|---|---|---|
| `prompts` | Prompt Strategy Center | Yes | Writes prompt runtime store and versions. |
| `prompts/health` | Prompt Strategy Center | Display / diagnostic | Should show effective prompt state and warnings. |
| `intent-route-rules` | Request Understanding Center | Yes | Runtime route rule config. |
| `entity-resolution-config` | Domain / Metric / Entity Center | Yes | Entity normalization affects context and slot resolution. |
| `report-query-policy` | Domain / Metric / Entity Center | Yes | Report tool selection, defaults, project resolution, and semantic defaults. |
| `report-capability-manifest` | Capability Center | Display / derived | Derived from MCP servers and overrides. |
| `report-capability-overrides` | Capability Center | Yes | Runtime capability override source. |
| `mcp-servers` | Capability Center | Yes | MCP server runtime source. |
| `mcp-test` / `mcp-servers/:id/test` | Capability Center | Test only | Should not be treated as a config source. |
| `skills` | Workflow & Agent Center | Yes | Skill install/edit affects routing and execution candidates. |
| `skill-contracts` if exposed | Workflow & Agent Center | Yes | Skill contract source. |
| `workflow` | Workflow & Agent Center | Yes / display | Workflow task and run history governance. |
| `automation-templates` | Workflow & Agent Center | Yes | Automation template source. |
| `debug-automation/configs` | Workflow & Agent Center | Yes | Debug automation config source. |
| `controlled-glossary` | Knowledge & Memory Center | Yes / support | Used by explanation and controlled vocabulary flows. |
| `metric-explainers` | Domain / Metric / Entity Center | Yes / support | Metric knowledge source. |
| `model-service-config` | Model Service & Routing Center | Yes | Current implementation is a single model service config. |
| `model-service-config/test` | Model Service & Routing Center | Test only | Connectivity test, not a runtime source. |
| `trace-config` | Evaluation & Observability Center | Yes | Trace reporting and observability behavior. |
| `trace-config/test` | Evaluation & Observability Center | Test only | Connectivity/reporting test. |
| `operation-logs` | Operations & Release | Display / audit | Audit trail, not runtime decision source. |
| `users` | Security / Workspace / Permission Center | Yes | User/admin/workspace permission source. |
| `users/:id/dataki-key` | Security / Workspace / Permission Center | Yes | User credential/scope source. |
| `users/:id/preference` | Security / Workspace / Permission Center | Yes | User preference/context source. |
| `role-profiles` | Security / Workspace / Permission Center | Yes | Role/profile runtime context source. |
| `chat-display-config` | Frontend Rendering Governance | Yes | Message/display runtime config. |
| `demand-pool` | Operations & Release | Display / workflow | Demand lifecycle and handoff surface. |
| `report-templates` | Operations & Release | Yes / content | Report template source. |
| `report-template-results` | Operations & Release | Display / generated | Generated result records. |
| `report-drafts` | Operations & Release | Display / generated | Draft report records. |

## 4. Center Responsibilities

### Home Overview

Responsibilities:

- Show active runtime config sources by center.
- Show latest P1-C conflict scanner warnings.
- Show Prompt effective metadata summary.
- Show MCP and model service status.
- Show latest route observation and golden status.

Do not edit configs directly from Home Overview. It is an orientation surface.

### Request Understanding Center

Responsibilities:

- Intent route rules.
- RouteDecision observation.
- Route governance warnings.
- Route golden status.
- Client intent vs backend decision comparison.

Runtime source:

- `intent-route-rules.json`
- built-in/default normalized rules
- route observation metadata

Display P1-C metadata:

- rule status
- active version
- precedence
- priority
- rollout percent
- updated time
- change reason
- conflict scanner results

### Prompt Strategy Center

Responsibilities:

- Prompt configs.
- Prompt versions.
- Prompt bindings.
- Prompt health.
- Effective prompt metadata.
- Prompt conflict warnings.

Runtime source:

- `prompt-configs.json`
- managed prompt seeds
- prompt-store built-in seeds
- prompt-store cache

Display P1-C metadata:

- `activePromptId`
- `activePromptVersion`
- `source`
- `seedFallbackUsed`
- `cacheHit`
- `contentHash`
- `conflictWarnings`

### Capability Center

Responsibilities:

- MCP server config.
- MCP connectivity tests.
- MCP tool list.
- Capability manifest.
- Capability overrides.
- Tool preflight status.

Runtime source:

- `mcp-servers.json`
- built-in MCP servers
- `report-capability-overrides.json`
- derived capability manifest

Important boundary:

- MCP schema is not edited by Chat Core.
- Capability selection remains execution-plane logic.
- Admin displays capability governance and availability only.

### Workflow & Agent Center

Responsibilities:

- Workflow tasks.
- Workflow runs and replay.
- Skill list.
- Skill contracts.
- Automation templates.
- Debug automation configs.
- Agent runtime task status.

Runtime source:

- `workflow-tasks.json`
- `skill-contracts.json`
- built-in skill contracts
- automation template store
- debug automation store

Boundary:

- This center can show MCP Workflow status and Automation Task state.
- It must not introduce a heavy Workflow Engine in IA-A.

### Knowledge & Memory Center

Responsibilities:

- Controlled glossary.
- Knowledge source settings.
- Personal knowledge and memory config.
- Field explanation support sources.

Runtime source:

- controlled glossary store
- knowledge/memory config stores if present
- user memory and personal knowledge config

### Domain / Metric / Entity Center

Responsibilities:

- Advertising domain pack visibility.
- Entity resolution.
- Metric explainers.
- Report query policy.
- Media/project/package/channel related config.
- Project resolution strategy.

Runtime source:

- `entity-resolution-config.json`
- `report-query-policy.json`
- `advertising-domain-pack.ts` seeds/defaults
- metric explainer store

Boundary:

- Domain signals are evidence only.
- Domain pack must not override top intent.

### Model Service & Routing Center

Responsibilities:

- Model provider.
- API/base URL.
- Model service test.
- Model usage slots.
- Future per-purpose model routing.

Current runtime source:

- model service config through `model-service-config` API.

Target model slots:

- question answering / report query model
- title generation model
- parameter parsing model
- summary / polishing model
- knowledge QA model

IA-A rule:

- Document the slots as target IA only.
- Do not create new model-routing runtime config in IA-A.

### Security / Workspace / Permission Center

Responsibilities:

- Users.
- Role profiles.
- Admin access.
- Workspace/project scope.
- User preference.
- Dataki key.

Runtime source:

- users store
- role profiles store
- admin access store
- user scope and preference stores

### Evaluation & Observability Center

Responsibilities:

- Trace config.
- Trace test.
- Process events.
- Route observation.
- Reasoning artifacts.
- Golden status.
- Evaluation reports.

Runtime source:

- `trace-config.json`
- route observation metadata
- process events
- golden scripts

### Frontend Rendering Governance

Responsibilities:

- Chat display config.
- Message presentation.
- Runtime disclosure.
- Component binding.
- Renderer registry.
- UI guardrail status.

Runtime source:

- chat display config
- renderer registry contracts
- message presentation projection

Boundary:

- UI rendering must consume ResponseContract / SemanticResultContract projections.
- Runtime details must not leak into main message by default.

### Operations & Release

Responsibilities:

- Operation logs.
- Release notes.
- Report templates.
- Report drafts.
- Generated report results.
- Publish and rollback audit records.

Runtime source:

- operation logs are audit source, not route source.
- templates may affect report content and should be clearly marked as content config.

## 5. Source of Truth Map

| Config object | Runtime source | Seed/default | Cache | Admin API | Runtime effect |
|---|---|---|---|---|---|
| Prompt configs | `prompt-configs.json` | managed prompt seeds and prompt-store built-ins | Yes | `prompts/*` | Yes |
| Intent route rules | `intent-route-rules.json` | default normalized rules and domain pack seeds | No long-lived cache | `intent-route-rules` | Yes |
| Entity resolution | `entity-resolution-config.json` | advertising domain pack entries | Store-dependent | `entity-resolution-config` | Yes |
| Report query policy | `report-query-policy.json` | advertising report policy seed | No long-lived cache | `report-query-policy` | Yes |
| Capability overrides | `report-capability-overrides.json` | empty default | No long-lived cache | `report-capability-overrides` | Yes |
| MCP servers | `mcp-servers.json` | built-in MCP servers | Store merge | `mcp-servers/*` | Yes |
| Feature switches | `feature-switches.json` | default switches | Store-dependent | `feature-switches/*` | Partial |
| Skill contracts | `skill-contracts.json` | built-in skill contracts | Store merge | skills / skill contracts APIs | Yes |
| Workflow tasks | `workflow-tasks.json` | empty default | Yes | workflow APIs | Yes |
| Model service | runtime config | default runtime config | Store-dependent | `model-service-config` | Yes |
| Trace config | runtime config | default trace config | Store-dependent | `trace-config` | Yes |
| Chat display config | runtime config | default display config | Store-dependent | `chat-display-config` | Yes |
| Operation logs | operation log store | none | Store-dependent | `operation-logs` | Audit only |

## 6. Runtime Effective vs Entry Only

Runtime effective entries:

- Prompt configs.
- Intent route rules.
- Entity resolution.
- Report query policy.
- Capability overrides.
- MCP servers.
- Skill contracts.
- Workflow task state.
- Feature switches where consumed.
- Model service config.
- Trace config.
- Chat display config.
- Users, role profiles, preferences, and permission stores.

Entry or display only:

- MCP tests.
- Model service tests.
- Trace tests.
- Operation logs.
- Report capability manifest when rendered as derived view.
- Generated report drafts/results unless used as templates or workflow state.

## 7. P1-C Governance Metadata Display

Request Understanding Center should show:

- route rule status
- active version
- rule version
- precedence
- priority
- rollout percent
- updated time
- change reason
- conflict scanner warnings

Prompt Strategy Center should show:

- active prompt id
- active prompt version
- source
- seed fallback used
- cache hit
- content hash
- conflict warnings

Evaluation & Observability Center should show:

- route observation mode
- decision authority
- domain signal evidence-only status
- actual execution comparison
- governance conflicts
- mismatches

## 8. Model Service IA

Current state:

- `model-service-config` is a single model service configuration surface.
- It supports provider, provider label, model name, base URLs, API key, knowledge base URL, enablement, notes, and test.

Target IA slots:

| Slot | Purpose | IA-A behavior |
|---|---|---|
| Question / report query model | Data questions and report generation | Document only |
| Title generation model | Conversation title generation | Document only |
| Parameter parsing model | Slot and tool input parsing | Document only |
| Summary / polishing model | Response summarization and wording | Document only |
| Knowledge QA model | Knowledge lookup and help QA | Document only |

Implementation boundary:

- IA-A does not add multi-model runtime routing.
- IA-B may group current single config under Model Service & Routing Center.
- Per-slot model routing requires a later implementation stage.

## 9. Not In Scope

This stage does not:

- modify `/api/chat`
- modify MCP schema
- modify active Prompt content
- modify selectedTool
- modify `isReportQuery`
- modify `serviceIntent`
- modify ResponseContract compatibility fields
- implement P1-D
- refactor Admin Console menu code
- introduce Prompt as the only classifier
- allow domain pack to override top intent

## 10. Admin IA-B Candidates

Can proceed in IA-B:

- Group existing admin tabs into the target centers.
- Add Home Overview as a read-only governance dashboard.
- Surface P1-C prompt and route governance metadata.
- Add derived effective config panels.
- Keep existing APIs and runtime files unchanged.

Must wait for P1-D or P2:

- Multi-model slot routing implementation.
- Automatic conflict repair.
- RouteDecision control-plane takeover.
- MCP schema governance platform.
- Workflow Engine redesign.
- `/api/chat` modular split.

---

## v0.2 总纲一致性补充

Admin Console 需治理 Capability Source Registry、Capability Contract、Tool Contract、MCP business outcome mapping、Model/Prompt version、Report Domain 配置与 Evaluation 开关。配置变更必须可追踪，不得通过通用 Chat Core 硬编码分支替代。

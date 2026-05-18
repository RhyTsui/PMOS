# PMOS v1.1 Ant Design X Frontend Design Skill

## 1. Purpose

This document defines the PMOS local frontend default framework based on Ant Design and Ant Design X.

It is intended for Codex / CLI execution.

It does not define final UI visual design. It defines:

```text
frontend architecture
component library policy
AI interaction model
Agent dynamic routing model
Dynamic Work Surface model
A2UI / X Card strategy
implementation order
acceptance standard
```

## 2. Official Ant Design interpretation for PMOS

Ant Design is an enterprise-class design language and React UI component library. Its official React implementation provides high-quality components, TypeScript support, i18n, design resources, and theme customization. For PMOS, Ant Design should be used as the enterprise UI foundation.

PMOS interpretation:

```text
Ant Design = enterprise-grade product UI foundation
Ant Design X = AI Copilot and Hybrid UI interaction foundation
Ant Design X Card / A2UI = Agent-generated Dynamic Surface foundation
```

## 3. Ant Design values translated into PMOS rules

Ant Design design values are Natural, Certain, Meaningful, and Growing.

### 3.1 Natural

PMOS rule:

```text
User expresses product intent naturally.
System routes to the correct agent and surface.
User should not search through flat menus to find the right module.
```

Implementation:

```text
Use Copilot-first entry.
Use Sender for intent expression.
Use Prompts and Suggestions for guided expression.
Use Dynamic Surface only when structured interaction is needed.
```

### 3.2 Certain

PMOS rule:

```text
Every action must have explicit state, confirmation, and next step.
Codex execution must be stateful.
```

Implementation:

```text
Use ThoughtChain for visible runtime trace.
Use Steps / Timeline / Tag / Alert for state.
Use Actions for approve, rework, cancel, writeback.
Never use a stateless "run codex" button.
```

### 3.3 Meaningful

PMOS rule:

```text
Every interaction must advance the delivery chain.
```

Implementation:

```text
Every bubble or surface must connect to a PMOS entity:
Requirement, PageSpec, CodexJob, VerificationReport, ProofOfWork.
```

### 3.4 Growing

PMOS rule:

```text
The frontend must support future desktop shell, Coze plugin, Gemini CLI, Workflow Canvas, and team collaboration.
```

Implementation:

```text
Keep frontend as Web-first, Desktop-ready.
Keep Runtime API boundary stable.
Do not hardcode one executor or one page layout.
```

## 4. Official Ant Design X interpretation for PMOS

Ant Design X is designed for AI-driven interfaces and provides AI conversation components, model/agent integration tools, streaming Markdown rendering, dynamic cards, and skills.

The core PMOS interpretation:

```text
Ant Design X is not only a chat UI library.
It is the frontend interaction foundation for PMOS Copilot, Agent routing, execution trace, and dynamic surfaces.
```

## 5. RICH paradigm translated into PMOS

Ant Design X uses the RICH paradigm:

```text
Role
Intention
Conversation
Hybrid UI
```

PMOS mapping:

| RICH | PMOS meaning | Implementation |
|---|---|---|
| Role | active user role + active agent | Product Chief, BuilderAgent, CodexAgent, EvidenceAgent |
| Intention | user goal and route intent | Agent Router |
| Conversation | user stays in Copilot flow | Bubble / Sender / Conversations |
| Hybrid UI | structured UI appears when needed | Dynamic Surface / X Card / typed surfaces |

## 6. Ant Design X interaction stages translated into PMOS

Ant Design X frames AI interaction around stages such as wake-up, expression, confirmation, and feedback.

PMOS mapping:

| Stage | PMOS frontend requirement | Components |
|---|---|---|
| Awaken | tell user what PMOS can do | Welcome, Prompts |
| Express | capture goal and context | Sender, Attachments, Suggestion |
| Confirm | show route, plan, progress | Think, ThoughtChain, Steps |
| Feedback | show result and artifacts | Actions, FileCard, Sources, CodeHighlighter, Folder |

## 7. PMOS frontend default pattern

PMOS v1.1 must not default to a flat admin dashboard.

Default pattern:

```text
Copilot-first shell
  ↓
User intent
  ↓
Agent Router
  ↓
Dynamic Work Surface
  ↓
Runtime action
  ↓
Feedback / proof / next step
```

## 8. PMOS Copilot layout policy

This document does not define exact UI layout, but the functional regions should be:

```text
Conversation region
- Bubble list
- assistant/user messages
- route explanations
- structured outputs

Intent input region
- Sender
- Attachments
- quick prompts
- mode/agent hint

Dynamic Surface region
- PageSpec editor
- CodexJob console
- Proof viewer
- Runtime inspector

Trace region
- ThoughtChain
- runtime events
- CodexJob status
- verification status
```

The final designer can decide exact visual arrangement.

## 9. Component selection matrix

### Use Ant Design X for AI interaction

```text
Conversation management: Conversations
Conversation display: Bubble, Bubble.List
Welcome state: Welcome
Prompt starters: Prompts
Input: Sender
Context files: Attachments
Quick command: Suggestion
Thinking/status: Think
Execution trace: ThoughtChain
Action buttons: Actions
Artifact display: FileCard
Source display: Sources
Code display: CodeHighlighter
Workflow/DAG text diagram: Mermaid
Changed files / artifacts: Folder
Global config: XProvider
```

### Use Ant Design for enterprise structure

```text
Page structure: Layout, Flex, Splitter, Drawer, Modal, App
Forms: Form, Input, InputNumber, Select, DatePicker, Checkbox, Radio
State: Alert, Result, Empty, Skeleton, Spin, Progress
Data: Table, Descriptions, List, Tree, Tabs
Navigation: Menu, Breadcrumb, Steps, Timeline
Feedback: Notification, Message, Popconfirm, Tooltip
Badges: Tag, Badge
Typography: Typography, Space, Divider
```

## 10. Dynamic Surface strategy

PMOS should support two rendering strategies.

### 10.1 Typed surfaces

Required for v1.1:

```text
PageSpecSurface
CodexJobSurface
VerificationSurface
ProofSurface
RuntimeInspectorSurface
WorkflowOperatorSurface
```

These are explicit React components using Ant Design / Ant Design X.

### 10.2 A2UI / X Card surfaces

Recommended for v1.1+ and required for advanced agent-generated UI:

```text
Agent returns structured JSON commands.
Frontend renders through registered catalog.
No raw HTML execution.
```

Use `@ant-design/x-card` for this.

## 11. PMOS A2UI principles

A2UI means Agent-to-User Interface.

PMOS should use it as:

```text
Agent describes an interactive surface as data.
Frontend validates it against a component catalog.
Frontend renders safe native components.
User actions return structured action events to Runtime.
```

A2UI is preferred over AI-generated HTML because:

```text
safe component catalog
streaming updates
declarative UI
data binding
cross-platform potential
LLM-friendly flat JSON
```

## 12. PMOS catalog direction

PMOS v1.1 should start with a conservative catalog:

```text
Text
Title
Paragraph
Card
Form
TextField
TextArea
Select
Checkbox
Button
ActionGroup
Steps
StatusTag
Alert
Descriptions
Table
FileList
CodeBlock
DiffSummary
Progress
```

Do not allow arbitrary HTML, script, style, iframe, or external runtime code.

## 13. Frontend data flow

```text
Sender submit
  ↓
POST /api/studio/agent-route
  ↓
AgentRouteResponse
  ↓
append assistant Bubble
  ↓
render ThoughtChain route trace
  ↓
open DynamicSurfaceHost
  ↓
user edits / confirms
  ↓
POST /api/studio/surfaces/:surfaceId/actions/:actionId
  ↓
Runtime updates entity
  ↓
React Query refetch or stream update
  ↓
Bubble / Surface / Trace update
```

## 14. State management

Use:

```text
React Query = server/runtime state
Zustand = local UI state only
X SDK = chat/conversation stream where suitable
Shared schemas = domain types
```

Do not put server truth into Zustand.

## 15. Theme policy

Use `XProvider` as top-level provider. It extends Ant Design ConfigProvider.

Minimum theme contract:

```ts
const pmosTheme = {
  token: {
    colorPrimary: '#1677ff',
    borderRadius: 12,
    fontSize: 14,
  },
  components: {
    Button: { borderRadius: 10 },
    Card: { borderRadiusLG: 16 },
  },
};
```

Designers can replace tokens later. Codex must not hardcode visual-specific CSS across components.

## 16. PMOS-specific frontend entities

Frontend must understand these entities:

```text
StudioSession
AgentRoute
DynamicSurfaceDescriptor
Requirement
PageSpec
CodexJob
CodexJobEvent
CodexJobArtifact
VerificationReport
ProofOfWorkBundle
```

## 17. Implementation warning

Do not implement PMOS v1.1 as:

```text
Sidebar with all modules
dashboard with all cards
terminal emulator
generic chat with no structured action
UI-only redesign
```

Implement it as:

```text
Copilot + Agent Router + Dynamic Surface + Runtime state + Proof feedback
```

## 18. Codex development rule

Codex must implement this in phases:

1. Install/verify dependencies.
2. Add XProvider and theme.
3. Add PMOS Copilot route.
4. Add Agent Router API client.
5. Add Bubble / Sender / Attachments / Prompts.
6. Add ThoughtChain route trace.
7. Add DynamicSurfaceHost.
8. Add typed surfaces.
9. Add A2UI catalog.
10. Add tests and build verification.

## 19. Success criteria

PMOS frontend is acceptable when:

```text
User enters a goal.
Agent Router selects an agent.
A Dynamic Surface opens.
User confirms a structured action.
Runtime creates/updates PMOS entity.
CodexJob stays guarded.
Verification/proof status is visible.
User gets next safe step.
```

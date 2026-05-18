# PMOS Ant Design X Frontend Skill

用途：部署到本地 PMOS / Codex，作为 v1.1 Studio 前端默认框架、组件库、Agent 动态路由、Dynamic Surface 和验收标准的执行规范。

本包不包含 UI 视觉稿，不规定最终视觉排版；它定义的是：

```text
前端默认技术栈
组件选择规则
Ant Design / Ant Design X 使用原则
Copilot-first 架构
Agent Dynamic Routing
Dynamic Work Surface
A2UI / X Card 结构化渲染策略
Codex 实施顺序
验收标准
```

## 文件

| 文件 | 作用 |
|---|---|
| `SKILL.md` | 可放入本地 Codex / PMOS skill 目录的核心技能说明 |
| `design.md` | 深度设计说明：Ant Design / Ant Design X 如何转化为 PMOS 前端框架 |
| `frontend-framework.md` | PMOS v1.1 默认前端工程结构、依赖、Provider、数据流 |
| `component-policy.md` | Ant Design X / Ant Design 组件选型策略 |
| `a2ui-dynamic-surface.md` | Dynamic Surface / X Card / A2UI 执行规范 |
| `codex-implementation-prompt.md` | 可直接贴给 Codex CLI 的实施提示词 |
| `acceptance-checklist.md` | 实施验收清单 |
| `source-notes.md` | 官方资料摘录与链接 |

## 一句话原则

```text
PMOS 前端不是平铺式后台，也不是普通聊天页。
它是 Ant Design X 风格的 Copilot-first 前端：
用户表达目标，Agent Router 选择工作面，Dynamic Surface 承载结构化操作，Runtime 管状态，Codex 只执行。
```


---

# PMOS Ant Design X Frontend Skill

## When to use

Use this skill whenever you implement, refactor, or review PMOS frontend work related to:

- PMOS v1.1 Studio
- PMOS Copilot
- Ant Design / Ant Design X adoption
- Agent dynamic routing frontend
- Dynamic Work Surface
- PageSpec / CodexJob / Proof frontend flows
- Frontend component library selection
- Local PMOS desktop-ready Web Studio

## Core identity

PMOS frontend must be:

```text
Copilot-first
Agent-routed
Dynamic-surface driven
Runtime-state governed
Codex-execution guarded
Proof-oriented
```

PMOS frontend must not be:

```text
a generic dashboard
a Coze clone
a flat admin panel
a pure chat page
a direct shell launcher
a visual-only redesign
```

## Mandatory product boundary

Always preserve this boundary:

```text
PMOS Studio / Copilot = user entry and interaction
Agent Router = intent routing and surface selection
Dynamic Surface = structured task UI
PMOS Runtime = state, workflow, proof, verification, API
Codex CLI = controlled executor only
Proof-of-Work = delivery evidence
```

The frontend must never directly execute shell commands or directly invoke Codex CLI.

## Required default stack

Use this default stack unless the repository already has a conflicting stable stack:

```text
React
TypeScript
Ant Design
Ant Design X
Ant Design X SDK
Ant Design X Markdown
Ant Design X Card, when Dynamic Surface is needed
React Router
TanStack Query
Zustand, only for local UI state
Zod or existing shared schemas for typed contracts
```

Package names:

```text
antd
@ant-design/icons
@ant-design/x
@ant-design/x-sdk
@ant-design/x-markdown
@ant-design/x-card
react-router-dom
@tanstack/react-query
zustand
```

Before installing anything, inspect `package.json` and avoid duplicate or incompatible package choices.

## Design doctrine

Apply Ant Design values to PMOS:

- Natural: users express product goals naturally and stay in flow.
- Certain: every action has explicit state, next step, and confirmation.
- Meaningful: each interaction advances PMOS delivery chain.
- Growing: the system supports future desktop, Coze plugin, Gemini CLI, workflow canvas.

Apply Ant Design X RICH paradigm to PMOS:

- Role: active agent and user role are visible.
- Intention: user intent is routed, not manually menu-selected.
- Conversation: Copilot conversation remains the primary flow.
- Hybrid UI: structured dynamic surfaces appear only when useful.

## PMOS frontend main flow

Every frontend feature must serve this chain:

```text
Original Demand
→ AgentRoute
→ DynamicSurface
→ Requirement
→ PageSpec
→ CodexJob
→ Diff
→ Preview
→ BrowserVerification
→ ReviewGate
→ ProofOfWork
→ VersionWriteback
```

If a feature does not serve this chain, do not implement it in v1.1.

## Component rules

Use Ant Design X components for AI interaction:

```text
Conversations: session list and active conversation
Welcome: initial wake-up and capability framing
Prompts: intention starters and safe next steps
Sender: user input
Attachments: uploaded docs/screenshots/context
Bubble / Bubble.List: conversation rendering
Think: model/agent thinking status, not private chain-of-thought
ThoughtChain: visible execution trace and tool/runtime progress
Actions: approve, rework, cancel, writeback
FileCard: PageSpec, CodexJob, Proof, Diff, Verification artifacts
Sources: truth source / grounding citations
CodeHighlighter: code snippets and command outputs
Mermaid: workflow/DAG text rendering when needed
Folder: changed file tree / artifact tree
Notification: runtime/system notices
XProvider: global config, locale, theme
```

Use Ant Design components for enterprise/product UI:

```text
App, ConfigProvider, Layout, Card, Flex, Splitter, Drawer, Modal,
Form, Input, Select, Button, Steps, Timeline, Alert, Tag,
Table, Descriptions, Tabs, Result, Empty, Skeleton, Spin, Progress,
Badge, Tooltip, Typography, Space, Divider, Menu
```

Do not create custom components when an Ant Design or Ant Design X component is appropriate.

## Recommended file structure

Create or converge to:

```text
src/frontend/
  app/
    App.tsx
    AppProviders.tsx
    routes.tsx
    theme.ts
    queryClient.ts
  features/
    copilot/
      PMOSCopilotShell.tsx
      CopilotConversation.tsx
      CopilotSender.tsx
      AgentRouteTrace.tsx
      hooks.ts
      types.ts
    dynamic-surface/
      DynamicSurfaceHost.tsx
      DynamicSurfaceRenderer.tsx
      surfaces/
        PageSpecSurface.tsx
        CodexJobSurface.tsx
        ProofSurface.tsx
        RuntimeInspectorSurface.tsx
      a2ui/
        pmosCatalog.ts
        a2uiTypes.ts
    studio-session/
      StudioSessionProvider.tsx
      useStudioSession.ts
    shared/
      api/
        studioApi.ts
        builderApi.ts
        codexApi.ts
      components/
      status/
      formatters/
```

## Provider rule

Use `XProvider` at the top level. It extends Ant Design `ConfigProvider`.

Minimum provider stack:

```tsx
<XProvider theme={pmosTheme} locale={mergedLocale}>
  <App>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </App>
</XProvider>
```

If the codebase already has providers, integrate rather than duplicate.

## Agent routing frontend contract

The frontend sends user input to:

```text
POST /api/studio/agent-route
```

Expected response:

```ts
type AgentRouteResponse = {
  routeId: string;
  selectedAgentId: string;
  confidence: number;
  reason: string;
  targetEntityType: string;
  targetEntityId: string | null;
  dynamicSurface: DynamicSurfaceDescriptor;
  nextSafeStep: string;
  blockedReason: string | null;
};
```

The frontend must render:

- assistant bubble with route reason
- visible route trace / ThoughtChain
- Dynamic Surface matching `dynamicSurface.type`
- next safe step action

## Dynamic Surface rule

For PMOS v1.1, Dynamic Surface can be implemented in two levels:

### Level 1: typed React surfaces

Use explicit React components:

```text
PageSpecSurface
CodexJobSurface
ProofSurface
RuntimeInspectorSurface
```

This is required for v1.1 stability.

### Level 2: A2UI / X Card surfaces

Use `@ant-design/x-card` and A2UI v0.9 when Agent output is structured as JSON commands.

Use A2UI only with a registered component catalog. Never render LLM-generated raw HTML.

## A2UI safety rule

Allowed:

```text
Agent → structured JSON commands → registered catalog → native components
```

Forbidden:

```text
Agent → raw HTML/JS/CSS → dangerouslySetInnerHTML
```

## Implementation order

When implementing this skill, follow this order:

1. Inspect current frontend stack and package.json.
2. Add dependencies only if missing.
3. Add `AppProviders.tsx`, `theme.ts`, and top-level `XProvider`.
4. Add Copilot shell route.
5. Add AgentRoute API client and hook.
6. Add conversation renderer using Bubble / Sender / Attachments / Prompts.
7. Add DynamicSurfaceHost.
8. Add typed React surfaces for PageSpec, CodexJob, Proof, Runtime.
9. Add ThoughtChain / trace visualization.
10. Add A2UI catalog only after typed surfaces work.
11. Add tests/build checks.
12. Update docs.

## Acceptance checklist

Implementation is acceptable only if:

- The default user entry is Copilot-first.
- The UI is not a flat dashboard.
- User intent routes to an Agent.
- Agent route result opens a Dynamic Surface.
- PageSpec can be created or displayed.
- CodexJob can be created/displayed with status machine.
- Codex execution is not triggered directly from frontend shell.
- Runtime APIs own state.
- Proof / verification states are visible.
- Ant Design / Ant Design X components are used rather than custom UI.
- `npm run lint`, `npm run build`, and existing frontend verification commands pass.


---

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


---

# PMOS v1.1 Default Frontend Framework

## 1. Target stack

```json
{
  "ui": ["antd", "@ant-design/icons"],
  "ai-ui": ["@ant-design/x"],
  "ai-data-flow": ["@ant-design/x-sdk"],
  "ai-markdown": ["@ant-design/x-markdown"],
  "dynamic-card": ["@ant-design/x-card"],
  "routing": ["react-router-dom"],
  "server-state": ["@tanstack/react-query"],
  "local-ui-state": ["zustand"]
}
```

Before installing, check existing `package.json`.

## 2. Recommended commands

```bash
npm install antd @ant-design/icons @ant-design/x @ant-design/x-sdk @ant-design/x-markdown @ant-design/x-card
npm install react-router-dom @tanstack/react-query zustand
```

If any dependency already exists, keep current compatible version unless package resolution fails.

## 3. Directory structure

```text
src/frontend/
  app/
    App.tsx
    AppProviders.tsx
    routes.tsx
    theme.ts
    queryClient.ts

  features/
    copilot/
      PMOSCopilotShell.tsx
      CopilotConversation.tsx
      CopilotSender.tsx
      CopilotWelcome.tsx
      CopilotPrompts.tsx
      AgentRouteTrace.tsx
      hooks.ts
      types.ts

    dynamic-surface/
      DynamicSurfaceHost.tsx
      DynamicSurfaceRenderer.tsx
      types.ts
      surfaces/
        PageSpecSurface.tsx
        CodexJobSurface.tsx
        VerificationSurface.tsx
        ProofSurface.tsx
        RuntimeInspectorSurface.tsx
        WorkflowOperatorSurface.tsx
      a2ui/
        pmosCatalog.ts
        a2uiTypes.ts
        A2UISurface.tsx

    studio-session/
      StudioSessionProvider.tsx
      useStudioSession.ts
      studioSessionStore.ts

  shared/
    api/
      studioApi.ts
      builderApi.ts
      codexApi.ts
      proofApi.ts
      runtimeApi.ts
    components/
      StatusTag.tsx
      EntityFileCard.tsx
      NextSafeStep.tsx
    formatters/
    status/
```

## 4. Provider implementation

Create `src/frontend/app/theme.ts`:

```ts
import type { ThemeConfig } from 'antd';

export const pmosTheme: ThemeConfig = {
  token: {
    colorPrimary: '#1677ff',
    borderRadius: 12,
    fontSize: 14,
  },
  components: {
    Button: {
      borderRadius: 10,
    },
    Card: {
      borderRadiusLG: 16,
    },
  },
};
```

Create `src/frontend/app/AppProviders.tsx`:

```tsx
import type { PropsWithChildren } from 'react';
import { App as AntdApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import zhCNX from '@ant-design/x/locale/zh_CN';
import { XProvider } from '@ant-design/x';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './queryClient';
import { pmosTheme } from './theme';

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <XProvider theme={pmosTheme} locale={{ ...zhCNX, ...zhCN }}>
      <AntdApp>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </AntdApp>
    </XProvider>
  );
}
```

## 5. Route policy

Default route:

```text
/workspace → PMOSCopilotShell
```

Do not make `/workspace` a flat dashboard.

Optional technical routes:

```text
/workspace/runtime
/workspace/dev
```

These are not default user entry.

## 6. API client policy

Use React Query for runtime state.

Example:

```ts
export async function routeAgent(input: AgentRouteRequest): Promise<AgentRouteResponse> {
  const response = await fetch('/api/studio/agent-route', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error ?? 'agent_route_failed');
  }
  return data;
}
```

## 7. Copilot shell required behavior

`PMOSCopilotShell` must:

```text
1. maintain current StudioSession
2. show conversations/session context
3. render user and assistant bubbles
4. provide Sender with Attachments
5. show Prompts for safe starter actions
6. call /api/studio/agent-route on submit
7. append route result as assistant message
8. update active Dynamic Surface
9. show ThoughtChain/trace for agent routing
10. display Next Safe Step
```

## 8. Dynamic Surface required behavior

`DynamicSurfaceHost` must:

```text
1. read active DynamicSurfaceDescriptor
2. select typed React surface by descriptor.type
3. pass entity id and mode
4. expose actions back to Runtime
5. never execute shell
```

## 9. Local UI state

Only store these in Zustand:

```text
activeConversationKey
activeSurfaceId
drawer open/closed
selected local display mode
temporary unsaved input draft
```

Do not store Runtime truth in Zustand.

## 10. Testing expectations

At minimum, add tests or build checks for:

```text
Agent route API parsing
Dynamic surface type switching
CodexJob status rendering
No frontend shell execution path
Provider renders without error
```


---

# PMOS Component Policy: Ant Design X + Ant Design

## 1. Component source priority

Use components in this order:

```text
1. Ant Design X, for AI/Copilot interaction
2. Ant Design, for enterprise product UI
3. PMOS shared components, for domain wrappers
4. Custom component, only when no suitable existing component exists
```

## 2. Ant Design X usage policy

### Conversations

Use for:

```text
Studio sessions
delivery threads
project conversation list
```

Do not use for:

```text
full project navigation tree
runtime admin tree
```

### Welcome

Use for:

```text
empty state
first-run PMOS Copilot explanation
agent capability framing
```

### Prompts

Use for:

```text
starter intentions
next safe step suggestions
common tasks
```

Examples:

```text
生成 PageSpec
创建 CodexJob
检查是否可交付
查看 Proof
检查 Codex 状态
```

### Sender

Use as primary user input.

Must support:

```text
text input
attachments
submit loading state
disabled state when route is running
```

### Attachments

Use for:

```text
PRD files
screenshots
API docs
markdown context
source docs
```

### Bubble / Bubble.List

Use for:

```text
user message
assistant response
route result
structured summary
runtime feedback
```

Assistant bubbles should not contain massive dashboards. They should contain concise reasoning, next steps, and linked surfaces/artifacts.

### Think

Use for:

```text
agent processing status
model waiting state
```

Do not reveal private chain-of-thought. Use business process summaries only.

### ThoughtChain

Use for:

```text
Agent route trace
Runtime execution trace
CodexJob event trace
Verification progress
Proof generation trace
```

Labels should be operational:

```text
Route intent
Create PageSpec
Create CodexJob
Run verification
Generate Proof
```

### Actions

Use for:

```text
Confirm
Approve
Rework
Cancel
Writeback
Open artifact
```

### FileCard

Use for PMOS artifacts:

```text
PageSpec
CodexJob
Diff
VerificationReport
ProofOfWork
VersionEntry
```

### Sources

Use for:

```text
truth source refs
knowledge grounding refs
retrieval results
```

### CodeHighlighter

Use for:

```text
short code snippets
command output
patch summaries
```

Do not use it to replace a full diff viewer if PMOS implements a specialized diff component.

### Mermaid

Use for:

```text
simple workflow or DAG explanation
```

Do not make Mermaid the primary workflow editor in v1.1.

### Folder

Use for:

```text
changed file tree
artifact tree
proof bundle tree
```

### XProvider

Use as top-level provider. It extends Ant Design ConfigProvider.

## 3. Ant Design usage policy

Use Ant Design for:

```text
Card: bounded content surfaces
Drawer: temporary inspector / action details
Modal: destructive confirmation
Form: structured edit
Table: logs/list data only when needed
Descriptions: entity details
Steps/Timeline: execution stages
Alert: risk or blocking reason
Tag/Badge: status
Progress: verification/proof progress
Result/Empty/Skeleton/Spin: state feedback
```

## 4. PMOS shared components

Allowed PMOS wrappers:

```text
StatusTag
EntityFileCard
NextSafeStep
RuntimeStateBadge
ProofStatusCard
CodexJobStatusTag
SurfaceActionBar
```

These wrappers should be small and built from Ant Design / Ant Design X components.

## 5. Prohibited patterns

Do not:

```text
1. Build custom button/card/input systems.
2. Use raw HTML generated by Agent.
3. Use dangerouslySetInnerHTML for agent UI.
4. Create a flat admin dashboard as default entry.
5. Use terminal-like UI as main Codex interface.
6. Mix runtime truth into local-only store.
7. Hide critical state behind icons only.
8. Mark tasks completed without proof or verification.
```

## 6. Component mapping by PMOS entity

| PMOS entity | Primary component | Secondary components |
|---|---|---|
| StudioSession | Conversations | Bubble.List |
| AgentRoute | ThoughtChain | Bubble, Tag |
| DynamicSurface | X Card or typed React surface | Card, Form, Actions |
| Requirement | Form, Descriptions | FileCard, Sources |
| PageSpec | Form, Steps, FileCard | Descriptions, Tag |
| CodexJob | ThoughtChain, Steps | Actions, FileCard, Folder |
| Diff | FileCard / custom DiffViewer | CodeHighlighter, Folder |
| VerificationReport | Progress, Alert, Descriptions | ThoughtChain |
| ProofOfWork | FileCard, Result | Sources, Actions |
| RuntimeState | Badge, Alert, Descriptions | Table |


---

# PMOS Dynamic Surface and A2UI Skill

## 1. Why Dynamic Surface

PMOS v1.1 should not expose all features as a flat layout. Instead:

```text
User intent
→ Agent Router
→ Dynamic Surface
→ Runtime action
```

Dynamic Surface lets the UI adapt to the current task without forcing users to manually select modules.

## 2. Two implementation levels

### Level 1: typed React Surface

Required for v1.1.

```text
PageSpecSurface
CodexJobSurface
VerificationSurface
ProofSurface
RuntimeInspectorSurface
WorkflowOperatorSurface
```

Each surface is a normal React component using Ant Design / Ant Design X.

### Level 2: A2UI / X Card Surface

Use when Agent generates UI as structured JSON.

```text
Agent → A2UI commands → XCard renderer → registered PMOS catalog → native UI
```

## 3. A2UI safety rule

Allowed:

```text
structured JSON commands
registered catalog components
data binding
action events
```

Forbidden:

```text
raw HTML
raw JavaScript
inline script
arbitrary CSS
iframe
dangerouslySetInnerHTML
unregistered components
```

## 4. A2UI v0.9 commands

PMOS should prefer v0.9 style:

```ts
type CreateSurfaceCommand = {
  version: 'v0.9';
  createSurface: {
    surfaceId: string;
    catalogId: string;
  };
};

type UpdateComponentsCommand = {
  version: 'v0.9';
  updateComponents: {
    surfaceId: string;
    components: Array<{
      id: string;
      component: string;
      children?: string[];
      child?: string;
      [key: string]: unknown;
    }>;
  };
};

type UpdateDataModelCommand = {
  version: 'v0.9';
  updateDataModel: {
    surfaceId: string;
    path: string;
    value: unknown;
  };
};

type DeleteSurfaceCommand = {
  version: 'v0.9';
  deleteSurface: {
    surfaceId: string;
  };
};
```

## 5. PMOS catalog

Start catalog:

```text
Text
Title
Paragraph
Card
Section
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

## 6. PMOS action event contract

Every A2UI action must produce a structured action event:

```ts
type PMOSSurfaceAction = {
  version: 'v0.9';
  action: {
    name:
      | 'confirm_page_spec'
      | 'create_codex_job'
      | 'approve_codex_job'
      | 'request_rework'
      | 'cancel_job'
      | 'run_verification'
      | 'writeback_proof';
    surfaceId: string;
    sourceComponentId: string;
    timestamp: string;
    context: Record<string, unknown>;
  };
};
```

Frontend sends this to:

```text
POST /api/studio/surfaces/:surfaceId/actions/:actionId
```

## 7. Example: PageSpec Surface

```json
[
  {
    "version": "v0.9",
    "createSurface": {
      "surfaceId": "page-spec-123",
      "catalogId": "pmos-v1"
    }
  },
  {
    "version": "v0.9",
    "updateDataModel": {
      "surfaceId": "page-spec-123",
      "path": "/pageSpec",
      "value": {
        "title": "PMOS Builder",
        "userGoal": "Create PageSpec and CodexJob from product intent",
        "status": "draft"
      }
    }
  },
  {
    "version": "v0.9",
    "updateComponents": {
      "surfaceId": "page-spec-123",
      "components": [
        {
          "id": "root",
          "component": "Card",
          "children": ["title", "goal", "confirm"]
        },
        {
          "id": "title",
          "component": "Title",
          "text": { "path": "/pageSpec/title" }
        },
        {
          "id": "goal",
          "component": "TextArea",
          "label": "User Goal",
          "value": { "path": "/pageSpec/userGoal" }
        },
        {
          "id": "confirm",
          "component": "Button",
          "variant": "primary",
          "text": "Confirm PageSpec",
          "action": {
            "event": {
              "name": "confirm_page_spec",
              "context": {
                "pageSpec": { "path": "/pageSpec" }
              }
            }
          }
        }
      ]
    }
  }
]
```

## 8. Implementation requirement

In v1.1, implement typed surfaces first. Add A2UI as progressive enhancement.

Reason:

```text
typed surfaces guarantee stability
A2UI unlocks agent-generated interfaces later
```

## 9. Acceptance

A Dynamic Surface implementation passes if:

```text
1. Surface is opened by AgentRouteResponse.
2. Surface binds to a PMOS entity.
3. User actions are structured.
4. Runtime handles the action.
5. No raw HTML is rendered.
6. Surface can be closed/replaced by Agent Router.
7. Surface can show next safe step.
```


---

# Codex Implementation Prompt: PMOS Ant Design X Frontend Skill

Copy this prompt into Codex CLI when implementing the local PMOS frontend framework.

---

You are implementing the PMOS v1.1 frontend default framework.

Do not create a visual design mockup. Implement the framework and components needed to support Ant Design X style Copilot-first PMOS frontend.

Core requirement:

```text
PMOS frontend must be Copilot-first, Agent-routed, Dynamic Surface driven.
It must not be a flat dashboard or generic chat page.
```

Use official Ant Design and Ant Design X principles:

```text
Ant Design = enterprise product UI foundation
Ant Design X = AI conversation and Hybrid UI foundation
XProvider = global config provider
Bubble/Sender/Conversations/Prompts/Welcome/Attachments = Copilot interaction
Think/ThoughtChain = visible agent/runtime process status
Actions/FileCard/Sources/CodeHighlighter/Mermaid/Folder = results and artifacts
X Card / A2UI = optional Dynamic Surface renderer
```

Implementation tasks:

## 1. Inspect current repo

Check:

```text
package.json
src/frontend
src/shared/schemas.ts
src/backend routes
```

Do not install duplicate packages.

## 2. Install or verify dependencies

Required packages:

```text
antd
@ant-design/icons
@ant-design/x
@ant-design/x-sdk
@ant-design/x-markdown
@ant-design/x-card
react-router-dom
@tanstack/react-query
zustand
```

## 3. Add provider layer

Create:

```text
src/frontend/app/AppProviders.tsx
src/frontend/app/theme.ts
src/frontend/app/queryClient.ts
```

Use `XProvider` as top-level provider. Merge Ant Design and Ant Design X Chinese locales if zh_CN is used.

## 4. Add Copilot shell

Create:

```text
src/frontend/features/copilot/PMOSCopilotShell.tsx
src/frontend/features/copilot/CopilotConversation.tsx
src/frontend/features/copilot/CopilotSender.tsx
src/frontend/features/copilot/CopilotWelcome.tsx
src/frontend/features/copilot/CopilotPrompts.tsx
src/frontend/features/copilot/AgentRouteTrace.tsx
```

Required behavior:

```text
- Render Welcome when no messages exist.
- Render Prompts for safe starter actions.
- Render Bubble.List for conversation.
- Render Sender with Attachments.
- On submit, call POST /api/studio/agent-route.
- Append assistant bubble with route reason and next safe step.
- Update active DynamicSurfaceHost.
```

## 5. Add API clients

Create:

```text
src/frontend/shared/api/studioApi.ts
src/frontend/shared/api/builderApi.ts
src/frontend/shared/api/codexApi.ts
```

Do not store server truth in Zustand.

## 6. Add Dynamic Surface Host

Create:

```text
src/frontend/features/dynamic-surface/DynamicSurfaceHost.tsx
src/frontend/features/dynamic-surface/DynamicSurfaceRenderer.tsx
```

Typed surfaces:

```text
PageSpecSurface
CodexJobSurface
VerificationSurface
ProofSurface
RuntimeInspectorSurface
WorkflowOperatorSurface
```

## 7. Add A2UI catalog optional foundation

Create:

```text
src/frontend/features/dynamic-surface/a2ui/pmosCatalog.ts
src/frontend/features/dynamic-surface/a2ui/A2UISurface.tsx
```

Do not render raw HTML. Only use registered components.

## 8. Add route

Make `/workspace` render PMOSCopilotShell.

Keep technical pages optional and not default.

## 9. Runtime boundary

Never implement frontend shell execution.

Any execution action must call Runtime API:

```text
POST /api/codex/jobs/:id/start
POST /api/codex/jobs/:id/run-verification
POST /api/codex/jobs/:id/writeback
```

## 10. Acceptance

Run:

```bash
npm run lint
npm run build
npm run test
npm run verify:frontend-browser
```

If some command does not exist, report that honestly and run the available closest command.

## 11. Required completion report

After implementation, output:

```text
1. Files changed
2. Dependencies added
3. New components
4. New routes
5. New API clients
6. How AgentRoute opens DynamicSurface
7. How frontend avoids direct shell execution
8. How Ant Design X components are used
9. Remaining gaps
10. Verification command results
```


---

# PMOS Ant Design X Frontend Acceptance Checklist

## 1. Architecture

- [ ] `/workspace` defaults to Copilot-first entry.
- [ ] Frontend is not a flat dashboard.
- [ ] `XProvider` is installed at top level.
- [ ] React Query manages Runtime/server state.
- [ ] Zustand, if used, only manages local UI state.
- [ ] No frontend direct shell execution.
- [ ] No direct Codex CLI call from React.

## 2. Ant Design X usage

- [ ] `Bubble` or `Bubble.List` is used for conversation.
- [ ] `Sender` is used for user input.
- [ ] `Attachments` or equivalent file input support exists.
- [ ] `Welcome` is used for empty/wake-up state.
- [ ] `Prompts` or equivalent safe starter prompts exist.
- [ ] `ThoughtChain` or equivalent trace is used for Agent/Runtime/Codex progress.
- [ ] `Actions` or Ant Design buttons are used for confirm/approve/rework/cancel.
- [ ] `FileCard` or equivalent artifact cards display PageSpec/CodexJob/Proof.

## 3. PMOS interaction

- [ ] User input calls `/api/studio/agent-route`.
- [ ] AgentRouteResponse is rendered visibly.
- [ ] Selected agent is visible.
- [ ] Route reason is visible.
- [ ] Next safe step is visible.
- [ ] DynamicSurfaceHost opens based on route response.
- [ ] Dynamic surface is tied to PMOS entity.

## 4. Dynamic Surface

- [ ] PageSpecSurface exists.
- [ ] CodexJobSurface exists.
- [ ] ProofSurface or VerificationSurface exists.
- [ ] RuntimeInspectorSurface exists or is planned.
- [ ] User actions post to Runtime API.
- [ ] No raw HTML generated by Agent is rendered.
- [ ] A2UI catalog, if implemented, only supports whitelisted components.

## 5. Codex execution safety

- [ ] CodexJob status machine is visible.
- [ ] CodexJob logs/events are visible or stubbed.
- [ ] Diff/preview/verification/proof slots exist.
- [ ] Completed state cannot be shown without verification/proof status.
- [ ] Start/verify/writeback actions call Runtime API endpoints.

## 6. Component policy

- [ ] Ant Design components are used for enterprise UI.
- [ ] Ant Design X components are used for AI interaction.
- [ ] No unnecessary custom component system.
- [ ] Styling uses theme tokens / CSS modules / scoped styles.
- [ ] No global ad hoc CSS that fights Ant Design tokens.

## 7. Verification commands

Run available commands:

```bash
npm run lint
npm run build
npm run test
npm run verify:frontend-browser
```

Record unavailable commands and closest alternatives.

## 8. Final pass condition

Pass if:

```text
User can express intent in Copilot.
System routes to Agent.
Dynamic Surface opens.
User confirms a structured action.
Runtime state is used.
Codex stays guarded.
Verification/proof feedback exists.
```


---

# Source Notes

These notes summarize the official materials used to create this PMOS Ant Design X Frontend Skill.

## Ant Design

Official repository:

```text
https://github.com/ant-design/ant-design
```

Key points:

```text
Ant Design is an enterprise-class UI design language and React UI library.
It provides high-quality React components, TypeScript support, internationalization, design resources, and CSS-in-JS theme customization.
It supports modern browsers, SSR, and Electron.
```

Official React docs:

```text
https://ant.design/docs/react/introduce/
```

Official design values:

```text
https://ant.design/docs/spec/values/
https://ant.design/docs/spec/introduce/
```

Key values:

```text
Natural
Certain
Meaningful
Growing
```

## Ant Design X

Official site:

```text
https://x.ant.design/
```

Key points:

```text
Ant Design X presents the RICH paradigm:
Role, Intention, Conversation, Hybrid UI.

It focuses on AI interface solutions and combines GUI with natural conversation.
```

Components introduction:

```text
https://x.ant.design/components/introduce/
https://x.ant.design/components/overview/
```

Key components:

```text
Bubble
Conversations
Notification
Welcome
Prompts
Sender
Attachments
Suggestion
Think
ThoughtChain
Actions
FileCard
Sources
CodeHighlighter
Mermaid
Folder
XProvider
```

XProvider:

```text
https://ant-design-x.antgroup.com/components/x-provider
```

Key point:

```text
XProvider extends antd ConfigProvider and provides global configuration for Ant Design X components.
```

X SDK:

```text
https://x.ant.design/x-sdks/introduce/
https://x.ant.design/x-sdks/use-x-chat/
https://x.ant.design/x-sdks/use-x-conversations/
https://x.ant.design/x-sdks/x-stream
```

Key points:

```text
X SDK helps manage AI conversation data flow.
useXChat manages single conversation data through Agent.
useXConversations manages multiple sessions.
XStream transforms SSE or other readable streams.
```

X Card / A2UI:

```text
https://x.ant.design/x-cards/introduce/
```

Key points:

```text
X Card is a dynamic card renderer based on A2UI.
A2UI lets Agents describe interaction intent with declarative JSON message sequences.
Frontend runtime renders native UI components from registered catalogs.
A2UI is safer than AI-generated HTML because it avoids arbitrary code execution.
Recommended protocol version is v0.9.
```

X Skill:

```text
https://x.ant.design/x-skills/introduce/
https://x.ant.design/x-skills/skills/
```

Key points:

```text
Ant Design X Skill provides Agent skills for building high-quality AI conversation applications.
Skills cover x-sdk, x-components, x-markdown, x-card and related best practices.
```

## PMOS interpretation

This skill maps official Ant Design X concepts to PMOS:

```text
RICH Role → PMOS user role + active agent
RICH Intention → Agent Router
RICH Conversation → PMOS Copilot
RICH Hybrid UI → Dynamic Work Surface
X Card / A2UI → Agent-generated safe structured UI
ThoughtChain → visible Runtime/Codex/Verification trace
FileCard → PageSpec/CodexJob/Proof artifacts
Sources → PMOS truth source references
```


---

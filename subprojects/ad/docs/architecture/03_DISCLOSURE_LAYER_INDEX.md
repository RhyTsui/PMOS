# Disclosure Layer Index

> Parent: `docs/architecture/ENTERPRISE_AI_CHAT_OS_SPEC.md`
>
> Layer: `Disclosure Contract / Disclosure Projection`

## 1. 定位

Disclosure Layer 负责把运行过程、证据、来源、字段说明和质量状态投影成用户可见的“过程与依据”面板。
它不是新的结果总协议，不替代 `Unified Semantic Contract`，也不替代 `Runtime Display Protocol`。

## 2. 位置

```txt
Request Understanding
-> Capability Orchestration
-> Business Semantics
-> Context Memory
-> MCP Governance
-> Skill / Workflow
-> MCP / Tool Calls
-> Result Assembly
-> Unified Semantic Contract
-> Runtime Display Protocol
-> Disclosure Contract / Disclosure Projection
-> Component Binding / Registry / Renderer
-> Chat UI
```

## 3. 真源目录

```txt
docs/architecture/disclosure-contract/
frontend/src/src/contracts/disclosure/
frontend/src/src/renderers/disclosure/
schemas/disclosure/
```

## 4. 核心对象

- `MessageDisclosureView`
- `DisclosureProjectionBuilder`
- `DisclosurePanelRenderer`
- `MessageActionBar`
- `MessageDisclosureDrawer`

## 5. 边界

- `Unified Semantic Contract` = 业务结果真源
- `Runtime Display Protocol` = 执行过程真源
- `Disclosure Contract / Disclosure Projection` = 用户可见过程与依据的投影
- `Component Binding / Registry / Renderer` = 展示绑定、注册与渲染

## 6. P0 落地要求

1. 右侧“过程与依据”入口必须绑定到 `message_id`。
2. 过程信息不得再直接读全局 `currentResult`。
3. 原始 JSON 只能进入 `RawInfoTab`，并执行脱敏和权限控制。
4. 字段说明必须来自字段目录或显式输入，不得靠字段名硬猜。

## 7. P0.6 / P0.7 Refresh

Rules:

1. Main message displays business result, analysis conclusion, or required blocking action.
2. Runtime steps, MCP workflow logs, task run history, raw artifacts, and source evidence belong to side surfaces or disclosure panels.
3. `business_outcome` is a result state, not a route classifier.
4. `tool_execution_status` must stay separate from step status and business outcome.
5. Automation artifacts are projected through disclosure or side surfaces unless the artifact itself is the final user-facing result.

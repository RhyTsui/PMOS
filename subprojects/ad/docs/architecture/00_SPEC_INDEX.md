# AI Chat OS Architecture Specification Index

> Canonical index for all Enterprise AI Chat OS architecture and implementation specifications.

> Historical implementation plans under `docs/implementation-v1/` are archived references only. They are not current implementation source of truth and must not override this index, `ENTERPRISE_AI_CHAT_OS_SPEC.md`, architecture subdomain documents, or `frontend/src/src/contracts`.

## 1. 顶层总纲

| 文档 | 位置 | 角色 |
|---|---|---|
| Enterprise AI Chat OS 总纲 | `docs/architecture/ENTERPRISE_AI_CHAT_OS_SPEC.md` | 总体系、层级、边界、原则 |
| Orchestration Layer Patch | `docs/architecture/ENTERPRISE_AI_CHAT_OS_SPEC_ORCHESTRATION_PATCH.md` | 请求理解、能力编排、MCP 治理、结果组装、路由观测补丁 |

## 2. P0：协议真源

| 文档 | 位置 | 角色 |
|---|---|---|
| Unified Semantic Contract | `docs/architecture/semantic-contract/semantic-result-contract.md` | 最终业务结果渲染协议 |
| Action Contract | `docs/architecture/semantic-contract/action-contract.md` | 用户动作统一协议 |
| Evidence Contract | `docs/architecture/semantic-contract/evidence-contract.md` | 证据统一协议 |
| Source Contract | `docs/architecture/semantic-contract/source-contract.md` | 来源统一协议 |
| Business Semantics Protocol | `docs/architecture/business-semantics/business-semantics-protocol.md` | 业务语义、产物、任务、报表与动作收口协议 |
| Component Binding | `docs/architecture/semantic-contract/component-binding.md` | region 到 renderer 的挂载入口 |
| Orchestration Layer Index | `docs/architecture/02_ORCHESTRATION_LAYER_INDEX.md` | 请求理解与能力编排层索引 |

对应前端类型真源：

```txt
frontend/src/src/contracts/semantic/
```

## 3. P1：Runtime 与 Renderer

| 文档 | 位置 | 角色 |
|---|---|---|
| Runtime Display Protocol | `docs/architecture/runtime/runtime-display-protocol.md` | Agent / Tool / Workflow / Streaming 运行态展示协议 |
| Trace Fail-Open Policy | `docs/architecture/runtime/trace-fail-open-policy.md` | 观测写入失败不得阻断业务主链路 |
| Component Registry / Renderer | `docs/architecture/frontend-engineering/component-registry-renderer.md` | componentBinding 到 renderer 的工程规范 |
| Disclosure Layer Index | `docs/architecture/03_DISCLOSURE_LAYER_INDEX.md` | 过程与依据披露层索引 |
| Message Rendering Architecture | `docs/architecture/frontend-engineering/message-rendering-architecture.md` | 正文、结果、过程与依据的消息返回展示总链路 |
| Message State Management | `docs/architecture/frontend-engineering/message-state-management.md` | 消息级状态与结果绑定规则 |

对应前端类型真源：

```txt
frontend/src/src/contracts/runtime/
frontend/src/src/contracts/renderer/
frontend/src/src/contracts/disclosure/
```

## 4. P2：体验与工程约束

| 文档 | 位置 | 角色 |
|---|---|---|
| AI Runtime UX | `docs/architecture/interaction-system/ai-runtime-ux.md` | 运行过程的用户体验规范 |
| AI Trust UX | `docs/architecture/interaction-system/ai-trust-ux.md` | 可信解释、证据、置信度、风险提示规范 |
| Data Visualization UX | `docs/architecture/interaction-system/data-visualization-ux.md` | 广告指标、图表、表格、Sankey、路径分析、AI Insight 展示规范 |
| Frontend Engineering System | `docs/architecture/frontend-engineering/frontend-engineering-system.md` | 长会话、大表格、流式渲染、懒加载、可观测性约束 |
| Registry Spec | `docs/architecture/frontend-engineering/registry-spec.md` | 组件注册、校验、fallback、telemetry 规范 |
| UI Component Registry | `docs/architecture/frontend-engineering/ui-component-registry.md` | 前端常用组件统一导出与按名解析入口 |
| Markdown Renderer | `docs/architecture/frontend-engineering/markdown-renderer.md` | 正文 Markdown 渲染规范 |
| Data Visualization Renderer | `docs/architecture/frontend-engineering/data-visualization-renderer.md` | 图表 / 表格 / 指标卡渲染规范 |
| Runtime Renderer | `docs/architecture/frontend-engineering/runtime-renderer.md` | 运行态摘要与追踪渲染规范 |
| Action Renderer | `docs/architecture/frontend-engineering/action-renderer.md` | 动作区渲染规范 |
| Empty / Error State Renderer | `docs/architecture/frontend-engineering/empty-error-state-renderer.md` | 空态、错误态、权限态渲染规范 |

## 5. P3：基础体验域与迁移

| 文档 | 位置 | 角色 |
|---|---|---|
| Visual System Breakdown | `docs/architecture/visual-system/visual-system-breakdown.md` | 字体、颜色、图标、间距、动效、层级拆分 |
| Chat Presentation Visual System | `docs/architecture/visual-system/chat-presentation-visual-system.md` | Chat 会话区视觉表现、消息壳、结果容器、过程与依据面板、Chat token |
| Conversation / Input / Feedback UX | `docs/architecture/interaction-system/conversation-input-feedback-ux.md` | Chat OS 核心交互域 |
| Product Execution Principles | `docs/architecture/interaction-system/product-execution-principles.md` | 用户结果、证据、动作与产物的产品执行原则 |
| Streaming State Spec | `docs/architecture/runtime/streaming-state-spec.md` | 流式输出状态展示规范 |
| Virtualization Spec | `docs/architecture/frontend-engineering/virtualization-spec.md` | 长会话与大数据量虚拟化规范 |
| Performance Spec | `docs/architecture/frontend-engineering/performance-spec.md` | 消息渲染性能目标与约束 |
| Responsive System | `docs/architecture/frontend-engineering/responsive-system.md` | 桌面 / 平板 / 移动端响应式规则 |

## 6. P4：可执行落地层

| 文档 | 位置 | 角色 |
|---|---|---|
| Execution Layer Index | `docs/architecture/01_EXECUTION_LAYER_INDEX.md` | validator / adapter / registry / golden / guardrail / observability 的强制实现入口 |

对应前端执行层类型真源：

```txt
frontend/src/src/contracts/validation/
frontend/src/src/contracts/adapters/
frontend/src/src/contracts/observability/
frontend/src/src/contracts/examples/
frontend/src/src/contracts/__tests__/
```

## 7. 总体依赖关系

```txt
Enterprise AI Chat OS Spec
        ↓
Unified Semantic Contract
        ↓
Action / Evidence / Source Contract
        ↓
Component Registry / Renderer
        ↓
Interaction UX + Frontend Engineering
```

Runtime 是并行协议线：

```txt
Runtime Display Protocol
        ↓
ai-runtime / workflow-trace renderer
        ↓
AI Runtime UX
```

Execution Layer 是强制落地线：

```txt
00_SPEC_INDEX.md
        ↓
01_EXECUTION_LAYER_INDEX.md
        ↓
validation / adapter / registry / golden / guardrail / observability
        ↓
具体业务用例落地
```

## 8. 禁止事项

1. 禁止新增与 `SemanticResultContract` 平级竞争的最终 UI schema。
2. 禁止 renderer 私有定义 action、evidence、source。
3. 禁止 Runtime Trace 直接污染业务结果结构。
4. 禁止 Data Visualization UX 成为新的总协议。
5. 禁止 `VizSpec` 替代 `regions` / `componentBinding`。
6. 禁止图表、表格、报告、AI Insight 分别定义各自的导出、下钻、来源、证据结构。

## 9. P0.6 / P0.7 Refresh

| 文档 | 位置 | 角色 |
|---|---|---|
| Chat Domain Protocol | `docs/architecture/request-understanding/chat-domain/chat-domain-protocol.md` | Chat intent / capability / response binding boundary |
| Chat Capability Selection Policy | `docs/architecture/request-understanding/chat-domain/chat-capability-selection-policy.md` | Capability Discovery before Query Contract |
| Tool-First Query Runtime | `docs/architecture/runtime/tool-first-query-runtime.md` | P0.6 tool-first query runtime |
| Business Outcome State Model | `docs/architecture/runtime/business-outcome-state-model.md` | `business_outcome` / `step_status` / `tool_execution_status` boundary |
| MCP Workflow Status Contract | `docs/architecture/runtime/mcp-workflow-status-contract.md` | P0.7 MCP workflow runtime projection |
| Automation Task Protocol | `docs/architecture/automation/automation-task-protocol.md` | P0.7 automation task minimal protocol |

Type source:

```txt
frontend/src/src/contracts/automation/
```

## 10. 编排层与能力发现契约

| 文档 | 位置 | 角色 |
|---|---|---|
| Request Understanding Architecture | `docs/architecture/request-understanding/request-understanding-architecture.md` | 请求理解层总架构 |
| **Semantic Frame Runtime Spec** | `docs/architecture/semantic-frame-runtime/00_SEMANTIC_FRAME_RUNTIME_SPEC.md` | **P0/P1-1 已实现：语义帧运行时规格** |
| **Execution Gate 详细设计** | `docs/architecture/semantic-frame-runtime/05_EXECUTION_GATE.md` | **P0 已实现：多维度执行门控设计** |
| **演进路线图** | `docs/architecture/semantic-frame-runtime/EVOLUTION_ROADMAP.md` | **P0/P1-1 完成，P1-2+ 计划中** |
| Information Source Coordination | `docs/architecture/request-understanding/information-source-coordination-design.md` | 信息源协调设计 |
| Route Governance P1 | `docs/architecture/request-understanding/route-governance-p1.md` | 路由治理 P1 |
| Capability Discovery Execution Policy | `docs/architecture/capability-orchestration/capability-discovery-execution-policy.md` | 能力发现执行策略 |
| Capability Source Architecture | `docs/architecture/capability-orchestration/capability-source-architecture.md` | 能力源架构 |
| MCP Business Error Normalization | `docs/architecture/capability-orchestration/mcp-business-error-normalization.md` | MCP 业务错误规范化 |
| Resolver Chain Architecture | `docs/architecture/capability-orchestration/resolver-chain-architecture.md` | 解析链架构 |

对应前端类型真源：

```txt
frontend/src/src/contracts/request-understanding/     # entity-resolution / fact-need / route-decision / user-requirement / info-source-arbitration / semantic-frame-contract
frontend/src/src/contracts/planner/                    # planner-plan-contract
frontend/src/src/contracts/capability/                 # capability-gap-contract / capability-manifest
frontend/src/src/contracts/mcp/                        # tool-capability-normalization
```

前端实现：

```txt
frontend/src/src/lib/semantic-frame-resolver.ts        # 语义帧解析器
frontend/src/src/lib/report-execution-gate.ts          # 多维度执行门控
frontend/src/src/lib/service-intent-execution-policy.ts # 服务意图执行策略
frontend/src/src/lib/field-definition-resolver.ts      # 字段定义检测
```

测试覆盖：

```txt
frontend/src/tests/semantic-frame-resolver.test.ts     # 语义帧解析测试
frontend/src/tests/report-execution-gate.test.ts       # 执行门控测试
frontend/src/tests/service-intent-execution-policy.test.ts # 执行策略测试
frontend/src/tests/field-definition-resolver.test.ts   # 字段定义测试
frontend/src/tests/report-execution-integration.test.ts # 集成测试
```

## 11. 模型服务与检索层契约

| 文档 | 位置 | 角色 |
|---|---|---|
| Prompt Runtime Contract | `docs/architecture/prompting/prompt-runtime-contract.md` | 提示词运行时契约 |
| Observability Trace Architecture | `docs/architecture/evaluation-observability/observability-trace-architecture.md` | 可观测性追踪架构 |

对应前端类型真源：

```txt
frontend/src/src/contracts/model-service/              # llm-output / model-route / model-use-case-registry / prompt-variable
frontend/src/src/contracts/retrieval/                  # retrieval-layer-contract
frontend/src/src/contracts/public-web/                 # source-grounding
frontend/src/src/contracts/result-assembly/            # semantic-result-assembly
frontend/src/src/contracts/presentation/               # message-contract-field-bindings
frontend/src/src/contracts/business-semantics/         # dataset-authority / dimension-catalog / metric-catalog
```

## 12. Skill 契约（按业务域拆分）

对应前端类型真源：

```txt
frontend/src/src/contracts/skills/
  └── callback-attribution-diagnosis/   # 回传归因诊断 Skill
      ├── skill-manifest.ts
      ├── capability-requirements.ts
      ├── slot-schema.ts
      ├── workflow.ts
      ├── result-contract.ts
      └── prompt-fragments.ts
```

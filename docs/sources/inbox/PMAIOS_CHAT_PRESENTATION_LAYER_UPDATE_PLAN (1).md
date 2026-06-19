# PMAIOS / Enterprise AI Chat OS — Chat Presentation Layer 总纲架构更新方案

> 目标：在不新增平行总架构、不推翻现有 Semantic Contract / Runtime Protocol / Disclosure Projection / Component Registry 的前提下，把消息返回部分收敛为“契约驱动、区域化、组件化、可回归”的 10 分展示体系。

---

## 0. 核心结论

当前系统已经具备正文渲染、结构化结果、运行态、Disclosure、组件注册、图表/表格渲染等能力。下一步不是重建一套 Presentation OS，而是将现有能力正式收口为 Chat Presentation Layer 规范域。

Chat Presentation Layer 的定位是：

```txt
SemanticResultContract / MessageContract
  ↓
Message Presentation Pipeline
  ↓
regions[] / blocks[] / componentBinding
  ↓
Component Registry / Renderer
  ↓
Message Surface
```

它只解决“消息返回如何正确展示”，不解决“来源与依据如何解释”。来源、依据、字段、执行过程继续由 Disclosure Contract / MessageDisclosureView 负责。

---

## 1. 总纲架构更新

### 1.1 当前总纲不推翻

保留现有一级总纲：

```txt
Enterprise AI Chat OS
├─ Visual System
├─ Interaction System
├─ Frontend Engineering System
├─ Unified Semantic Contract
├─ Runtime Display Protocol
├─ Disclosure Contract / Disclosure Projection
├─ Component Binding / Registry / Renderer
├─ Orchestration Layer
├─ Execution Layer
└─ Skill / Workflow Packages
```

### 1.2 新增“Chat Presentation Layer”作为规范域，不作为平行 OS

Chat Presentation Layer 不新增为与 Unified Semantic Contract 平级的结果真源，而是挂在：

```txt
Interaction System
Frontend Engineering System
Component Binding / Registry / Renderer
Unified Semantic Contract
```

之间，用于统一消息正文、结构化结果、动作区、运行态摘要、错误态、空态、响应式和流式渲染策略。

建议在总纲中增加描述：

```txt
Chat Presentation Layer
= Message Surface 的展示架构域
= SemanticResultContract 到前端可见消息界面的区域化渲染规范
= Component Binding / Registry / Renderer 的消息级应用层
```

它不是：

```txt
新的 UI Schema 总协议
新的 Visualization OS
新的 Runtime UI OS
新的 Report UI Protocol
新的 Agent UI Schema
```

---

## 2. 正文返回链路目标态

### 2.1 现状链路

```txt
Message
→ MessageSurface
→ MessageContract / workflow_result / semantic_result
→ 正文展示
→ 结果展示
→ MessageActionBar
→ MessageDisclosureDrawer
→ DisclosurePanelRenderer
```

### 2.2 目标链路

```txt
MessageEnvelope
→ MessageContractResolver
→ SemanticResultContract
→ SemanticResultValidator
→ MessagePresentationPlanner
→ MessageSurfaceLayout
→ RegionRenderer
→ Component Registry
→ Concrete Renderer
→ Message Surface
```

同时旁路挂载：

```txt
RuntimeDisplayProtocol
→ Runtime Summary Region / Runtime Inline State

Disclosure Projection
→ MessageDisclosureDrawer / DisclosurePanelRenderer
```

### 2.3 关键边界

```txt
正文区域
  answer_markdown / summary / explanation

结果区域
  metric cards / tables / charts / business summary / recommendations

动作区域
  ActionContract / next actions / approval actions / follow-up actions

运行态区域
  streaming / loading / tool running / partial / failed / retry / recovered

过程与依据区域
  MessageDisclosureView / Drawer / DisclosurePanelRenderer
```

---

## 3. 三层消息模型升级

### 3.1 Message Frame

Message Frame 是消息外壳，负责消息级布局，不负责业务解释。

职责：

- assistant / user / system / tool 等角色展示
- 消息状态：streaming、completed、failed、partial
- 消息操作入口：复制、重试、过程与依据、反馈
- 消息宽度、折叠、响应式、虚拟化边界
- 渲染错误兜底

不负责：

- 从 raw_result 猜表格
- 从字段名猜指标含义
- 从 runtime trace 拼执行过程
- 从 tool result 组装业务结论

### 3.2 Message Body

Message Body 是消息正文区域，由 regions 驱动。

推荐区域顺序：

```txt
1. status / runtime-summary        运行态摘要，轻量
2. answer / markdown-summary       自然语言结论
3. key-metrics                     KPI 卡片
4. insight / finding               洞察与风险
5. visualization                   图表 / 表格
6. recommendation                  建议
7. actions                         下一步动作
8. artifact                        报告 / 文件 / 可下载结果
9. disclosure-entry                过程与依据入口
10. feedback                       反馈
```

### 3.3 Message Disclosure

Message Disclosure 是旁路解释层。

正文中最多出现轻量入口：

```txt
过程与依据
来源 3 · 工具 2 · 字段 12 · 质量警告 1
```

完整内容仍进入 Drawer：

```txt
MessageDisclosureDrawer
→ DisclosurePanelRenderer
```

---

## 4. Contract 更新建议

### 4.1 不新增新的结果真源

仍以 SemanticResultContract / MessageContract 为真源。

新增的是展示规划字段和规范，不替代现有结果协议。

### 4.2 SemanticResultContract 建议补齐字段

```ts
export interface SemanticResultContract {
  contractVersion: 'semantic-result/v1';
  messageId: string;
  screenType: ScreenType;
  status: SemanticResultStatus;

  answer_markdown?: string;
  business_summary?: BusinessSummary;
  visualizations?: VisualizationSpec[];
  next_actions?: ActionContract[];

  regions: SemanticRegion[];

  evidenceRefs?: EvidenceRef[];
  sourceRefs?: SourceRef[];
  runtimeRefs?: RuntimeRef[];
  disclosureRef?: string;

  layoutHints?: MessageLayoutHints;
  compatibility?: LegacyCompatibilityInfo;
}
```

### 4.3 Region Contract 补齐

```ts
export interface SemanticRegion {
  regionId: string;
  regionType:
    | 'answer'
    | 'summary'
    | 'runtime_summary'
    | 'metric_cards'
    | 'data_table'
    | 'chart'
    | 'insight'
    | 'recommendation'
    | 'actions'
    | 'artifact'
    | 'disclosure_entry'
    | 'feedback'
    | 'empty_state'
    | 'error_state';

  title?: string;
  description?: string;
  priority: number;
  visibility: 'primary' | 'secondary' | 'collapsed' | 'drawer' | 'hidden';

  blocks: SemanticBlock[];
  componentBinding: ComponentBinding;

  evidenceRefs?: EvidenceRef[];
  sourceRefs?: SourceRef[];
  runtimeRefs?: RuntimeRef[];

  layoutHints?: RegionLayoutHints;
  fallback?: RegionFallbackPolicy;
}
```

### 4.4 Block Contract 补齐

```ts
export interface SemanticBlock {
  blockId: string;
  blockType:
    | 'markdown'
    | 'metric_card'
    | 'data_table'
    | 'chart'
    | 'finding'
    | 'recommendation'
    | 'action_group'
    | 'artifact_card'
    | 'status_badge'
    | 'empty_state'
    | 'error_state';

  data: unknown;
  priority?: number;
  evidenceRefs?: EvidenceRef[];
  sourceRefs?: SourceRef[];
  actions?: ActionContract[];
  renderHints?: BlockRenderHints;
}
```

### 4.5 ComponentBinding 不允许私有协议扩散

```ts
export interface ComponentBinding {
  rendererId: string;
  rendererVersion?: string;
  variant?: string;
  dataContract: string;
  validateMode: 'strict' | 'compatible' | 'best_effort';
  fallbackRendererId?: string;
  capabilities?: string[];
}
```

规则：

```txt
1. RendererId 必须在 registry 中注册。
2. Renderer 只能消费 region/block data，不得读取 raw_result。
3. Renderer 不得私有定义 action / evidence / source / disclosure。
4. Renderer 不得直接访问 tool_calls / runtime raw trace。
5. 旧结构只能由 adapter 转成 SemanticResultContract。
```

---

## 5. Renderer 矩阵

### 5.1 必备 Renderer

```txt
markdown-result-renderer
  answer_markdown / explanation / short summary

data-visualization-renderer
  ECharts / Ant Design Plots / Recharts / AG Grid 的统一入口

metric-card-renderer
  KPI / 指标卡 / 趋势 / 对比

data-table-renderer
  AG Grid / Basic Table / small table fallback

action-group-renderer
  ActionContract 驱动按钮、菜单、确认动作

runtime-summary-renderer
  轻量运行态：正在查询、部分完成、失败、重试、已恢复

error-state-renderer
  错误、失败、无权限、数据不足

empty-state-renderer
  空结果、无数据、条件不足、等待输入

artifact-card-renderer
  文件、报告、截图、表格导出、生成物

disclosure-entry-renderer
  只显示过程与依据入口，不渲染完整 Disclosure 内容
```

### 5.2 图表库归位

当前已经接入多个开源库，建议统一由 DataVizRenderer 管理选择策略：

```txt
AG Grid
  大表格、可排序、可筛选、列很多、数据量较大

ECharts
  复杂图表、组合图、多轴、业务监控图

@ant-design/plots
  常规业务图表、漏斗、趋势、分布、对比

Recharts
  轻量面板图、小型卡片图、监控局部图

Ant Design / Ant Design X
  会话工作台、基础 UI、消息承接

Radix UI
  底层可访问性交互控件

Framer Motion
  动效、消息进入、局部过渡

Lucide React
  图标

Sonner
  Toast / 轻量反馈
```

必须补一个图表选择策略：

```txt
VisualizationSpec
→ chartIntent / dataShape / interactionNeed / dataSize
→ engineResolver
→ concrete chart renderer
```

---

## 6. 目录更新方案

### 6.1 不建议新增独立根目录 chat-presentation/

为了避免平行总架构，建议将 Chat Presentation 拆到已有目录中。

### 6.2 docs/architecture/frontend-engineering/ 补齐

```txt
docs/architecture/frontend-engineering/
├─ frontend-engineering-system.md                       # 已有，补索引
├─ component-registry-renderer.md                       # 已有，补矩阵
├─ component-registry-implementation.md                 # 已有，补运行约束
├─ message-rendering-architecture.md                    # 新增 P0
├─ message-state-management.md                          # 新增 P0
├─ renderer-registry-spec.md                            # 新增 P0
├─ markdown-renderer.md                                 # 新增 P1
├─ data-visualization-renderer.md                       # 新增 P1
├─ runtime-renderer.md                                  # 新增 P1
├─ action-renderer.md                                   # 新增 P1
├─ empty-error-state-renderer.md                        # 新增 P1
├─ streaming-rendering-spec.md                          # 新增 P1，可引用 runtime protocol
├─ virtualization-spec.md                               # 新增 P2
├─ performance-spec.md                                  # 新增 P2
└─ responsive-rendering-system.md                       # 新增 P2
```

### 6.3 docs/architecture/semantic-contract/ 补齐

```txt
docs/architecture/semantic-contract/
├─ semantic-result-contract.md                          # 已有，补 regions 规范
├─ action-contract.md                                   # 已有
├─ evidence-contract.md                                 # 已有
├─ region-contract.md                                   # 新增 P0
├─ block-contract.md                                    # 新增 P0
├─ component-binding-contract.md                        # 新增 P0，可从现有文档抽出
├─ screen-type-spec.md                                  # 新增 P1，可从代码归档
├─ layout-hints-contract.md                             # 新增 P1
└─ semantic-result-adapter-policy.md                    # 新增 P1
```

### 6.4 docs/architecture/interaction-system/ 补齐

```txt
docs/architecture/interaction-system/
├─ conversation-input-feedback-ux.md                    # 已有，等价 conversation-ux
├─ ai-runtime-ux.md                                     # 已有
├─ data-visualization-ux.md                             # 已有
├─ ai-trust-ux.md                                       # 已有
├─ message-surface-ux.md                                # 新增 P0
├─ result-consumption-ux.md                             # 新增 P1
├─ feedback-system.md                                   # 新增 P1
├─ progressive-disclosure-ux.md                         # 新增 P1
└─ mobile-responsive-chat-ux.md                         # 新增 P2
```

---

## 7. 前端代码归位方案

### 7.1 建议目标结构

```txt
frontend/src/src/
├─ contracts/
│  ├─ semantic/
│  │  ├─ semantic-result-contract.ts
│  │  ├─ region-contract.ts
│  │  ├─ block-contract.ts
│  │  ├─ component-binding-contract.ts
│  │  └─ validators/
│  ├─ runtime/
│  │  └─ runtime-display-protocol.ts
│  ├─ disclosure/
│  │  └─ message-disclosure-view.ts
│  └─ renderer/
│     ├─ component-registry.ts
│     ├─ component-registry-runtime.ts
│     └─ renderer-contract.ts
│
├─ presentation/
│  ├─ message/
│  │  ├─ MessageFrame.tsx
│  │  ├─ MessageSurface.tsx
│  │  ├─ MessageRegionRenderer.tsx
│  │  ├─ MessageActionBar.tsx
│  │  └─ MessageFeedback.tsx
│  ├─ planners/
│  │  ├─ buildMessagePresentationPlan.ts
│  │  ├─ normalizeMessageContract.ts
│  │  └─ resolveRegionOrder.ts
│  └─ adapters/
│     ├─ legacyWorkflowResultToSemantic.ts
│     ├─ reportQueryResultToSemantic.ts
│     └─ messageContentToMarkdownRegion.ts
│
├─ renderers/
│  ├─ markdown/
│  ├─ data-visualization/
│  ├─ metric-card/
│  ├─ table/
│  ├─ actions/
│  ├─ runtime/
│  ├─ state/
│  └─ disclosure/                                      # 已有独立 Disclosure renderer
│
└─ components/
   └─ cognitive/
      ├─ ChatContainer.tsx
      ├─ MessageDisclosureDrawer.tsx
      └─ ...
```

### 7.2 ChatContainer 收口目标

ChatContainer 最终只做：

```txt
1. 会话列表编排
2. 消息流状态接入
3. 虚拟化容器接入
4. MessageFrame 挂载
5. Drawer / modal / global action portal 挂载
```

不得继续做：

```txt
1. 从 workflow_result 猜结果
2. 直接插入业务卡片
3. 直接解析 process_events
4. 直接判断图表类型
5. 直接拼接 Disclosure 内容
```

### 7.3 MessageSurface 收口目标

MessageSurface 最终只做：

```txt
1. 渲染 message frame
2. 渲染 regions
3. 根据 componentBinding 调用 RegionRenderer
4. 管理正文折叠 / 展开
5. 提供 message-level context
```

MessageSurface 不再是万能渲染器。

---

## 8. 正确展示的 10 分标准

一条企业级 AI 消息应满足：

```txt
1. 第一眼有结论：answer / summary 清晰，不被表格和 trace 淹没。
2. 结构化结果正确：指标卡、表格、图表和建议各在对应 region。
3. 不重复：正文不重复渲染 business_summary / visualization 的内容。
4. 不泄漏：raw_result、tool_calls、工程字段不进正文。
5. 可追溯：结论、洞察、建议带 evidenceRefs/sourceRefs。
6. 动作统一：按钮、菜单、跳转、确认都走 ActionContract。
7. 可降级：renderer 缺失、数据为空、无权限、失败时有稳定 fallback。
8. 可流式：streaming 时能逐步展示状态，不造成布局抖动。
9. 可扩展：新增业务结果只新增 renderer/binding，不改 ChatContainer。
10. 可回归：golden cases 能覆盖 markdown、table、chart、actions、runtime、error、empty、disclosure-entry。
```

---

## 9. P0 / P1 / P2 实施计划

### P0：消息返回正确展示主链路

```txt
1. 新增 message-rendering-architecture.md。
2. 新增 region-contract.md、block-contract.md、component-binding-contract.md。
3. 新增 MessageRegionRenderer。
4. 将 MessageSurface 改为 regions 驱动优先。
5. 保留 answer_markdown / message.content / workflow_result.answer 兼容，但只能在 adapter 层。
6. 把 ChatContainer 中直接插入的结果类组件逐步移到 MessageSurfaceLayout / regions。
7. 建立 renderer registry 强校验。
8. 禁止 renderer 读取 raw_result / tool_calls / process_events。
9. 建立 8 个 golden cases。
10. 保留 DisclosureDrawer 旁路，不塞进正文 renderer。
```

### P1：组件矩阵与 UX 细化

```txt
1. 补 markdown-renderer.md。
2. 补 data-visualization-renderer.md。
3. 补 runtime-renderer.md。
4. 补 action-renderer.md。
5. 补 empty-error-state-renderer.md。
6. 补 message-surface-ux.md。
7. 补 feedback-system.md。
8. 统一 AG Grid / ECharts / Ant Design Plots / Recharts 的选择策略。
9. 统一长文本折叠、表格折叠、图表 loading、错误态。
10. 增加 renderer telemetry。
```

### P2：性能、响应式与长会话

```txt
1. 补 virtualization-spec.md。
2. 补 performance-spec.md。
3. 补 responsive-rendering-system.md。
4. 大表格 virtualization。
5. 长会话 message virtualization。
6. 图表懒加载。
7. Streaming layout stabilization。
8. Mobile drawer / inline fallback。
9. 渲染耗时观测。
10. UI 回归截图测试。
```

---

## 10. 需要立刻修正的边界

```txt
1. DisclosurePreviewStrip 可以保留，但定义为 disclosure-entry region 的过渡实现。
2. MessageActionBar 保留为 message-level action，不承载正文结果。
3. MessageDisclosureDrawer 继续旁路挂载，不进入正文 regions 的内容渲染。
4. Result display 必须从 SemanticResultContract / MessageContract 来，不从 workflow_result 直接取。
5. 所有 legacy 读取必须移入 adapters。
6. DataVizRenderer 不再被业务页面绕过直接调用。
7. MarkdownRenderer 不承担图表、表格、动作、来源解释。
8. RuntimeRenderer 只展示轻量运行态，完整过程仍归 Disclosure。
```

---

## 11. Golden Cases

P0 至少覆盖：

```txt
1. plain_markdown_answer
2. markdown_with_metric_cards
3. report_query_with_table_and_chart
4. report_query_empty_result
5. failed_tool_with_error_state
6. streaming_partial_answer
7. message_with_actions
8. message_with_disclosure_entry
9. legacy_workflow_result_adapter
10. renderer_missing_fallback
```

每个 case 检查：

```txt
- regions 顺序正确
- componentBinding 命中 registry
- renderer validate 通过
- 不读取 raw_result
- actions 走 ActionContract
- evidenceRefs/sourceRefs 不丢失
- disclosureRef 只打开 Drawer
- fallback 稳定
```

---

## 12. Codex CLI 任务提示词

```txt
请在不新增平行总架构、不推翻现有 SemanticResultContract / RuntimeDisplayProtocol / DisclosureProjection / ComponentRegistry 的前提下，补齐 Enterprise AI Chat OS 的 Chat Presentation Layer。

目标：把消息返回部分从组件硬编码展示收口为 SemanticResultContract → regions[] → componentBinding → ComponentRegistry → Renderer 的契约驱动渲染链路。

实施要求：
1. 新增 docs/architecture/frontend-engineering/message-rendering-architecture.md。
2. 新增 docs/architecture/semantic-contract/region-contract.md、block-contract.md、component-binding-contract.md。
3. 补强 component-registry-renderer.md，明确 renderer registry、validate、fallback、telemetry。
4. 新增 MessageRegionRenderer，用 regions[].componentBinding 驱动正文区域渲染。
5. 保留 MessageSurface，但将其职责收口为 message frame + region renderer，不再直接组装业务结果。
6. 将 workflow_result / report_query_result / tool_calls / process_events 的读取移入 adapter，不允许渲染层直接读取。
7. MarkdownRenderer 只渲染 markdown-result；DataVizRenderer 统一承接 table/chart；ActionRenderer 只消费 ActionContract。
8. DisclosurePanelRenderer 保持独立旁路，只由 MessageDisclosureDrawer 打开，不并入正文主 renderer。
9. 增加 renderer missing、empty result、error result、streaming partial、legacy adapter 的 golden cases。
10. 增加 CI guardrail：禁止 ChatContainer / MessageSurface 从 raw_result、tool_calls、process_events 直接组装业务展示。
```

---

## 13. 最终一句话

这次 Chat Presentation Layer 的核心不是“再设计一套 UI”，而是把已有正文、结果、动作、表格、图表、运行态和披露入口，统一收口到：

```txt
SemanticResultContract
→ regions[]
→ componentBinding
→ Component Registry
→ Renderer
→ Message Surface
```

做到这一步，消息返回才会从“能显示”升级为“展示正确、边界清晰、可扩展、可回归、可治理”。

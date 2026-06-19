# 代码量治理审计报告

**审计日期**: 2026-06-17
**审计范围**: `frontend/src/src/` 全部 ts/tsx 文件
**审计原则**: 只读分析，不修改任何文件

---

## 一、项目总览

| 指标 | 数值 |
|------|------|
| 总文件数 | 504 |
| 总行数 | 60,141 |
| lib/ | 48,737 行 / 144 文件 |
| app/ | 24,304 行 / 142 文件 |
| components/ | 24,303 行 / 112 文件 |
| contracts/ | 9,324 行 / 74 文件 |
| hooks/ | 3,417 行 / 7 文件 |
| types/ | 2,681 行 / 3 文件 |
| features/ | 1,205 行 / 6 文件 |
| renderers/ | 2,006 行 / 14 文件 |
| 超过 500 行的文件 | 51 个 |
| 超过 1000 行的文件 | 12 个 |
| 测试文件 | 2 个 |

---

## 二、最大的 50 个 ts/tsx 文件

| # | 文件 | 行数 | 职责 | 是否应拆分 |
|---|------|------|------|-----------|
| 1 | `app/admin/page.tsx` | 6,659 | 管理后台全部 Tab 集中在一个文件 | **P0 必须拆** |
| 2 | `lib/report-query-orchestrator.ts` | 4,892 | 问数全链路（解析/规划/执行/诊断/展示） | **P0 必须拆** |
| 3 | `app/api/chat/route.ts` | 4,212 | Chat 主链路全部逻辑 | **P0 必须拆** |
| 4 | `app/page.tsx` | 4,037 | 主工作台页面（含自动化/资产/附件逻辑） | **P0 必须拆** |
| 5 | `components/cognitive/ChatContainer.tsx` | 2,815 | 会话区主组件（含 Markdown/证据/来源/能力条） | **P1 建议拆** |
| 6 | `hooks/useConversation.ts` | 2,481 | 发送/SSE/回放/重试/状态机/业务路由 | **P0 必须拆** |
| 7 | `types/index.ts` | 2,310 | 全局类型聚合（157 个 interface/type） | **P1 建议拆** |
| 8 | `lib/prompt-store.ts` | 1,547 | Prompt CRUD + seed + 版本管理 | P2 可拆 |
| 9 | `lib/public-web-runtime.ts` | 1,367 | 公网搜索运行时 | P2 可拆 |
| 10 | `lib/runtime-config.ts` | 1,083 | 模型/知识库/展示/公网配置读写 | P2 可拆 |
| 11 | `lib/request-understanding.ts` | 1,056 | 意图理解+实体解析 | P2 可拆 |
| 12 | `components/admin/WorkflowManagementTab.tsx` | 1,242 | 工作流管理 Tab | P2 可拆 |
| 13 | `lib/mcp-server-store.ts` | 870 | MCP 服务器 CRUD | 可保留 |
| 14 | `lib/industry-intel-store.ts` | 865 | 行业情报 store | 可保留 |
| 15 | `lib/report-result-visualization.ts` | 840 | 报表结果可视化 | P2 可拆 |
| 16 | `lib/advertising-domain-pack.ts` | 831 | 广告域信号包（合理的大文件） | 可保留 |
| 17 | `lib/report-capability-manifest.ts` | 829 | 报表能力清单 | P2 可拆 |
| 18 | `lib/mcp-discovery.ts` | 801 | MCP 能力发现 | 可保留 |
| 19 | `lib/api.ts` | 801 | API 客户端 | 可保留 |
| 20 | `lib/open-answer-planner-context.ts` | 774 | 开放答案规划上下文 | P2 可拆 |
| 21 | `lib/mcp-tool-output-adapter.ts` | 759 | MCP 工具输出适配 | 可保留 |
| 22 | `lib/intent-router.ts` | 750 | 意图路由 | 可保留 |
| 23 | `lib/model-router.ts` | 735 | 模型路由 | 可保留 |
| 24 | `lib/search-orchestrator.ts` | 731 | 搜索编排 | 可保留 |
| 25 | `lib/managed-prompt-seeds.ts` | 726 | Prompt 种子数据 | 可保留 |
| 26 | `components/ui/sidebar.tsx` | 724 | UI 组件 | 可保留 |
| 27 | `contracts/disclosure/builders/buildDisclosureView.ts` | 718 | Disclosure 构建器 | 可保留 |
| 28 | `lib/attachment-understanding.ts` | 700 | 附件理解 | P2 可拆 |
| 29 | `lib/scheduled-task-store.ts` | 675 | 定时任务 store | 可保留 |
| 30 | `components/admin/UserManagementTab.tsx` | 668 | 用户管理 Tab | P2 可拆 |
| 31 | `lib/skill-orchestration.ts` | 666 | Skill 编排 | 可保留 |
| 32 | `components/workspace/ResultPanel.tsx` | 661 | 结果面板 | P2 可拆 |
| 33 | `lib/route-decision-observation.ts` | 595 | 路由决策观察 | 可保留 |
| 34 | `lib/planner-orchestrator.ts` | 592 | Planner 编排 | 可保留 |
| 35 | `components/cognitive/InputArea.tsx` | 991 | 输入区 | P2 可拆 |
| 36 | `components/workspace/TaskSidebar.tsx` | 903 | 任务侧栏 | P2 可拆 |
| 37 | `app/login/page.tsx` | 583 | 登录页 | 可保留 |
| 38 | `components/cognitive/CallChainPanel.tsx` | 580 | 调用链面板 | 可保留 |
| 39 | `components/cognitive/ComposerMotionLab.tsx` | 575 | 动效实验室 | 可保留 |
| 40 | `components/cognitive/DataVizRenderer.tsx` | 573 | 数据可视化渲染 | 可保留 |
| 41 | `lib/callback-attribution-diagnosis-orchestration.ts` | 566 | 回传归因诊断编排 | 可保留 |
| 42 | `components/yokaui/ProjectSelectorCombo.tsx` | 551 | 项目选择器 | 可保留 |
| 43 | `components/admin/RoleProfileManagementTab.tsx` | 547 | 角色配置 Tab | P2 可拆 |
| 44 | `lib/search-provider-adapter.ts` | 542 | 搜索提供商适配 | 可保留 |
| 45 | `lib/dataki-memory-sync.ts` | 538 | DataKI 记忆同步 | 可保留 |
| 46 | `features/metric-explainer/components/MetricExplainerRenderer.tsx` | 534 | 指标解释渲染 | 可保留 |
| 47 | `lib/conversation-store.ts` | 527 | 会话 store | 可保留 |
| 48 | `lib/trace.ts` | 526 | Trace 构建 | 可保留 |
| 49 | `components/admin/PublicWebConfigTab.tsx` | 522 | 公网配置 Tab | P2 可拆 |
| 50 | `app/api/xiaoqiao/web-search/route.ts` | 518 | 网页搜索 API | 可保留 |

---

## 三、app/api 下超过 300 行的 route（高风险入口）

| 文件 | 行数 | 风险等级 | 说明 |
|------|------|---------|------|
| `app/api/chat/route.ts` | 4,212 | **P0 极高** | Chat 主链路，31 个函数，64 个 import |
| `app/api/xiaoqiao/web-search/route.ts` | 518 | **P1 高** | 公网搜索，含 provider 选择/重试/降级 |
| `app/api/xiaoqiao/debug-automation/mcp-observe/[id]/route.ts` | 379 | P2 中 | MCP 观察 |
| `app/api/xiaoqiao/admin/model-service-config/test/route.ts` | 361 | P2 中 | 模型配置测试 |
| `app/api/xiaoqiao/report-session/route.ts` | 342 | P2 中 | 报表会话 |

---

## 四、lib 下超过 500 行文件的职责混合分析

| 文件 | 行数 | runtime | domain | tool | prompt | trace | presentation | 诊断 |
|------|------|---------|--------|------|--------|-------|-------------|------|
| `report-query-orchestrator.ts` | 4,892 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **六职混合** |
| `prompt-store.ts` | 1,547 | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | prompt 专用，可接受 |
| `public-web-runtime.ts` | 1,367 | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ | runtime+tool+trace |
| `runtime-config.ts` | 1,083 | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | 纯 runtime config |
| `request-understanding.ts` | 1,056 | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | runtime+domain+trace |
| `mcp-server-store.ts` | 870 | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | store+tool |
| `industry-intel-store.ts` | 865 | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | store+domain |
| `report-result-visualization.ts` | 840 | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | domain+presentation |
| `advertising-domain-pack.ts` | 831 | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | 纯 domain（合理） |
| `report-capability-manifest.ts` | 829 | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | runtime+domain+tool |
| `mcp-discovery.ts` | 801 | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | runtime+domain+tool+trace |
| `api.ts` | 801 | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | 纯 runtime API client |
| `open-answer-planner-context.ts` | 774 | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | runtime+domain+prompt+trace |
| `mcp-tool-output-adapter.ts` | 759 | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | **五职混合** |
| `intent-router.ts` | 750 | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | runtime+domain+trace |
| `model-router.ts` | 735 | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | runtime+trace |
| `search-orchestrator.ts` | 731 | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ | runtime+tool+trace |
| `managed-prompt-seeds.ts` | 726 | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | domain+prompt |
| `attachment-understanding.ts` | 700 | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | runtime+domain+trace |
| `scheduled-task-store.ts` | 675 | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | 纯 store |
| `skill-orchestration.ts` | 666 | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | runtime+domain+tool+trace |
| `route-decision-observation.ts` | 595 | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | runtime+trace |
| `planner-orchestrator.ts` | 592 | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | runtime+domain+prompt+trace |
| `callback-attribution-diagnosis-orchestration.ts` | 566 | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | runtime+domain+tool+trace |
| `search-provider-adapter.ts` | 542 | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | runtime+tool |
| `dataki-memory-sync.ts` | 538 | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | runtime+trace |
| `conversation-store.ts` | 527 | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | 纯 store |
| `trace.ts` | 526 | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | runtime+trace |

---

## 五、components 下超过 300 行的组件分析

| 文件 | 行数 | 是否含业务解释 | 是否含字段兜底 | 是否含后端修补 | 诊断 |
|------|------|--------------|--------------|--------------|------|
| `ChatContainer.tsx` | 2,815 | ✅ 指标解释/能力标签 | ✅ 来源类型兜底 | ❌ | **P1 内含业务逻辑** |
| `WorkflowManagementTab.tsx` | 1,242 | ❌ | ✅ 配置兜底 | ❌ | 管理 Tab，可拆 |
| `InputArea.tsx` | 991 | ✅ "联调记录"标签 | ❌ | ❌ | 含域标签 |
| `TaskSidebar.tsx` | 903 | ✅ 任务状态文案 | ✅ | ❌ | 含业务文案 |
| `sidebar.tsx` | 724 | ❌ | ❌ | ❌ | 纯 UI |
| `UserManagementTab.tsx` | 668 | ❌ | ✅ | ❌ | 管理 Tab |
| `ResultPanel.tsx` | 661 | ✅ 联调/回传/报表文案 | ✅ 状态标签兜底 | ❌ | **含业务解释** |
| `CallChainPanel.tsx` | 580 | ❌ | ❌ | ❌ | 纯展示 |
| `ComposerMotionLab.tsx` | 575 | ❌ | ❌ | ❌ | 纯 UI |
| `DataVizRenderer.tsx` | 573 | ❌ | ✅ 图表兜底 | ❌ | 可接受 |
| `ProjectSelectorCombo.tsx` | 551 | ❌ | ✅ | ❌ | 可接受 |
| `RoleProfileManagementTab.tsx` | 547 | ❌ | ✅ | ❌ | 管理 Tab |
| `PublicWebConfigTab.tsx` | 522 | ❌ | ✅ | ❌ | 管理 Tab |
| `MonitoringPanel.tsx` | 409 | ✅ 监控指标文案 | ❌ | ❌ | 含域文案 |
| `message-presentation-projection.ts` | 397 | ❌ | ❌ | ❌ | 投影逻辑 |

---

## 六、hooks 下超过 200 行的 hook 分析

| 文件 | 行数 | 发送 | SSE | 回放 | 状态机 | 错误处理 | 业务路由 | 诊断 |
|------|------|------|-----|------|--------|---------|---------|------|
| `useConversation.ts` | 2,481 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | **六职混合** |
| `useTheme.tsx` | 298 | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | 可接受 |
| `useAgent.tsx` | 235 | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | 含少量域逻辑 |
| `useSpeech.ts` | 176 | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | 可接受 |
| `useAuth.tsx` | 109 | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | 可接受 |

### useConversation.ts 详细问题

- **2,481 行**，包含 48+ 个函数
- **职责混合**：
  - 发送消息（sendMessage）
  - SSE 流解析（reader.read + data: 解析，约 200 行）
  - 回放/历史加载
  - 重试逻辑（conversation 404 重建重试）
  - 状态机（TurnUiStatus 16 种状态）
  - 业务路由（isReportComposerIntent / isDebugExecutionStart / isMediaDemand 等）
  - 调试上下文记忆（DebugCarryMemory / rememberDebugContext）
  - 广告域实体提取（extractDebugAppName / extractDebugTarget / oceanengine 检查）
- **广告域硬编码**：`巨量`、`穿山甲`、`抖音`、`今日头条`、`快手`、`腾讯`、`广点通` 出现在正则中

---

## 七、contracts/types 重复定义分析

### 7.1 疑似重复的类型

| 类型名 | types/index.ts | contracts/ | lib/ | 诊断 |
|--------|---------------|-----------|------|------|
| `ResponseContract` | ✅ L545 | ❌ | `lib/response-contract.ts` (builder) | types 中定义，lib 中构建 |
| `MessageContract` | ✅ L617 | `contracts/presentation/message-contract-field-bindings.ts` (引用) | ❌ | types 中定义，contracts 中绑定 |
| `SemanticResultContract` | ❌ | ✅ `contracts/semantic/` L147 | ❌ | 独立定义在 contracts |
| `MessagePart` | ✅ L535 | ❌ | ❌ | 仅在 types 中 |
| `ToolCallTrace` | ✅ L500 | ❌ | ❌ | 仅在 types 中 |
| `WorkflowResult` | ✅ L455 | ❌ | ❌ | 仅在 types 中 |
| `HelpResult` | ✅ L726 | ❌ | ❌ | 仅在 types 中 |
| `DemandResult` | ✅ L757 | ❌ | ❌ | 仅在 types 中 |
| `DiagnosisResult` | ✅ L800 | ❌ | ❌ | 仅在 types 中 |
| `DebuggingResult` | ✅ L838 | ❌ | ❌ | 仅在 types 中 |

### 7.2 Trace 类型分散

| 类型 | 位置 |
|------|------|
| `ToolCallTrace` | `types/index.ts` L500 |
| `TraceConfig` | `lib/trace.ts` L7 |
| `TraceSpanKind` | `lib/trace.ts` L255 |
| `ChatTraceInput` | `lib/trace.ts` L402 |
| `CapabilitySelectionTrace` | `contracts/capability/` L165 |
| `RoutingTrace` | `contracts/observability/` L8 |
| `RetrievalLayerTrace` | `contracts/retrieval/` L44 |
| `EntityResolutionTraceStep` | `contracts/request-understanding/` L66 |
| `ModelTracePolicy` | `contracts/model-service/` L70 |
| `ObjectResolverTrace` | `contracts/request-understanding/` L167 |

**诊断**：Trace 类型分散在 3 个位置（types/contracts/lib），无统一 Trace 真源。

### 7.3 Capability 类型分散

- `types/index.ts`: 无 Capability 相关 interface
- `contracts/`: 29 个 Capability 相关 interface/type
- `lib/`: 多个 capability 相关文件

**诊断**：Capability 类型集中在 contracts 中（合理），但 types/index.ts 中缺失对应类型。

---

## 八、JSON 配置文件分类

### 8.1 .runtime/zhitou-chat/ (v1 遗留)

| 文件 | 分类 | 说明 |
|------|------|------|
| `admin-users.json` | **fixture_only** | v2 已替代，v1 仅作为 legacy fallback |
| `oceanengine-auth.json` | **deprecated** | 代码中未直接引用 |
| `role-profiles.json` | **fixture_only** | v2 已替代 |
| `runtime-config.json` | **fixture_only** | v2 已替代 |
| `trace-config.json` | **fixture_only** | v2 已替代 |
| `user-preferences.json` | **fixture_only** | v2 已替代 |

### 8.2 .runtime/zhitou-chat/v2/ (当前活跃)

| 文件 | 分类 | 说明 |
|------|------|------|
| `admin-users.json` | **runtime_active** | 被 admin-access-store 消费 |
| `automation-failure-cases.json` | **runtime_active** | 被自动化故障用例消费 |
| `demand-pool.json` | **runtime_active** | 被需求池消费 |
| `entity-resolution-config.json` | **runtime_active** | 被实体解析消费 |
| `feature-switches.json` | **runtime_active** | 被特性开关消费 |
| `mcp-servers.json` | **runtime_active** | 被 MCP 服务器消费 |
| `model-resilience-state.json` | **runtime_active** | 被模型韧性消费 |
| `operation-logs.json` | **runtime_active** | 被操作日志消费 |
| `prompt-configs.json` | **runtime_active** | 被 prompt store 消费 |
| `real-provider-e2e-samples.json` | **fixture_only** | 测试样本 |
| `role-profiles.json` | **runtime_active** | 被角色配置消费 |
| `runtime-config.json` | **runtime_active** | 被 runtime-config 消费 |
| `scheduled-tasks.json` | **runtime_active** | 被定时任务消费 |
| `skill-contracts.json` | **runtime_active** | 被 Skill 契约消费 |
| `skills.json` | **runtime_active** | 被 Skill store 消费 |
| `trace-config.json` | **runtime_active** | 被 trace 消费 |
| `user-memory.json` | **runtime_active** | 被用户记忆消费 |
| `user-preferences.json` | **runtime_active** | 被用户偏好消费 |
| `workflow-tasks.json` | **runtime_active** | 被工作流任务消费 |

### 8.3 contracts/examples/golden/

| 文件 | 分类 |
|------|------|
| `ai-trust.insight-with-evidence.json` | **doc_example** |
| `data-visualization.sankey.json` | **doc_example** |
| `runtime-display.tool-call.json` | **doc_example** |
| `semantic-result.insufficient-trend.json` | **doc_example** |
| `semantic-result.report-trend.json` | **doc_example** |

---

## 九、Markdown 文档与代码实现状态对齐

### 9.1 MASTER_SPEC.md 引用的模块

| 模块 | 是否存在 | 状态 |
|------|---------|------|
| `agent-runtime.ts` | ✅ 存在 | done |
| `conversation-store.ts` | ✅ 存在 | done |
| `intent-route-engine.ts` | ✅ 存在 | **doc_only (0 引用)** |
| `intent-route-rules.ts` | ✅ 存在 | done |
| `intent-router.ts` | ✅ 存在 | done |
| `mcp-discovery.ts` | ✅ 存在 | done |
| `mcp-server-store.ts` | ✅ 存在 | done |
| `report-query-orchestrator.ts` | ✅ 存在 | done |
| `skill-contract-store.ts` | ✅ 存在 | done |
| `skill-store.ts` | ✅ 存在 | done |

### 9.2 NEXT_IMPLEMENTATION_PLAN.md P0 状态

文档自评：大部分 P0 标记为 🟡（大部分完成），实际代码中：
- `route.ts` 仍然 4,212 行 → P0 "压薄 route" **未完成**
- `useConversation.ts` 仍然 2,481 行 → P0 "拆超级 Hook" **未完成**
- `types/index.ts` 仍然 2,310 行 → P0 "收敛 ResponseContract" **未完成**
- `admin/page.tsx` 仍然 6,659 行 → 管理后台拆分 **未完成**

---

## 十、广告域硬编码词在通用 Chat Core 中的分布

### 10.1 严重泄露（出现在非广告域专用文件中）

| 词 | 泄露文件 | 严重性 |
|----|---------|--------|
| `巨量` | `constants.ts` (示例问题), `context-engine.ts` (正则), `intent-router.ts`, `managed-prompt-seeds.ts`, `evaluation-adapter.ts` | **高** |
| `腾讯` | `context-engine.ts` (正则), `intent-router.ts`, `mcp-server-store.ts`, `skill-orchestration.ts`, `slot-resolver.ts` | **高** |
| `ROI` | `constants.ts`, `intent-router.ts`, `managed-prompt-seeds.ts`, `capability-gap-result.ts`, `metric-explainer-store.ts` | 中 |
| `日报` | `attachment-understanding.ts`, `intent-route-rules.ts`, `intent-router.ts`, `managed-prompt-seeds.ts`, `public-web-runtime.ts` | 中 |
| `联调` | `agent-runtime.ts`, `constants.ts`, `debug-automation-store.ts`, `evaluation-adapter.ts`, `feature-switch-store.ts` | 中 |
| `回传` | `agent-runtime.ts`, `attachment-understanding.ts`, `constants.ts`, `evaluation-adapter.ts`, `intent-router.ts` | 中 |
| `归因` | `evaluation-adapter.ts`, `intent-router.ts`, `managed-prompt-seeds.ts`, `mcp-server-store.ts`, `metric-explainer-store.ts` | 中 |
| `media_id` | `capability-gap-result.ts`, `conversation-context.ts`, `intent-router.ts`, `mcp-tool-output-adapter.ts`, `request-understanding.ts` | **高** |
| `promotionSource` | `managed-prompt-seeds.ts`, `mcp-tool-output-adapter.ts` | 中 |
| `appId` | `auth-service.ts` (合理), `conversation-context.ts` | 低 |

### 10.2 核心泄露点

1. **`lib/constants.ts`** — 硬编码广告域示例问题（"提交巨量监测回传需求"、"昨天巨量激活比 BI 少 30%"、"发起巨量联调测试"）
2. **`lib/context-engine.ts`** — 硬编码广告域 follow-up 正则（"巨量呢|腾讯呢|快手呢"）
3. **`lib/intent-router.ts`** — 多处广告域词用于意图判断
4. **`lib/conversation-context.ts`** — 硬编码 `media_id`/`appId` 提取正则
5. **`hooks/useConversation.ts`** — 硬编码广告域实体提取正则（"联调.*巨量|穿山甲|抖音"）

---

## 十一、死代码分析

### 11.1 0 引用的文件（可安全删除）

| 文件 | 说明 |
|------|------|
| `lib/automation-worker.ts` | 自动化 worker，未被任何文件引用 |
| `lib/guarded-tool-call.ts` | 被 tool-guardrail 替代 |
| `lib/intent-route-engine.ts` | 被 intent-router + intent-route-rules 替代 |
| `lib/personal-knowledge-config-store.ts` | 未被引用 |
| `lib/planner-assisted-routing.ts` | 未被引用 |
| `lib/planner-capability-grounding.ts` | 未被引用 |
| `lib/tool-fallback-policy.ts` | 未被引用 |
| `lib/tracking-link-service.ts` | 未被引用 |
| `lib/workflow-engine.ts` | 未被引用 |

### 11.2 仅 1 次引用的文件（可能是过度拆分或遗留）

共 48 个文件仅被 1 处引用，其中关键的包括：
- `intent-router.ts` — 仅被 route.ts 引用
- `managed-prompt-seeds.ts` — 仅被 prompt-store 引用
- `open-answer-planner-context.ts` — 仅被 route.ts 引用
- `planner-shadow.ts` — 仅被 route.ts 引用
- `evidence-ledger.ts` — 仅被 route.ts 引用

---

## 十二、测试覆盖分析

| 指标 | 数值 |
|------|------|
| 测试文件总数 | 2 |
| 核心链路测试覆盖 | 几乎为零 |
| `chat/route.ts` 测试 | 0 |
| `intent-router.ts` 测试 | 0 |
| `capability-orchestration.ts` 测试 | 0 |
| `planner-orchestrator.ts` 测试 | 0 |
| `useConversation.ts` 测试 | 0 |
| `report-query-orchestrator.ts` 测试 | 0 |

**结论**：项目几乎没有单元测试，仅有 2 个契约验证测试文件。核心链路完全无测试保护。

---

## 十三、当前最大结构风险

### 风险 1：Chat Route 单文件 4,212 行（P0 极高）
- 31 个函数、64 个 import
- 包含意图理解、能力选择、问数执行、模型调用、结果组装、证据收集全部逻辑
- 无法独立测试、无法独立部署、无法独立审查

### 风险 2：useConversation 单 Hook 2,481 行（P0 极高）
- 混合发送、SSE、回放、重试、状态机、业务路由、广告域实体提取
- 前端核心交互逻辑无法测试
- 广告域硬编码泄露到通用 Hook

### 风险 3：admin/page.tsx 单文件 6,659 行（P0 高）
- 全部管理 Tab 组件集中在一个文件
- 无法按需加载、无法独立维护

### 风险 4：types/index.ts 2,310 行 157 个类型（P1 高）
- 全局类型垃圾桶
- Message 接口 48 个字段
- ResponseContract / MessageContract / SemanticResultContract 三套响应协议并存

### 风险 5：report-query-orchestrator.ts 4,892 行（P0 高）
- 问数全链路六职混合
- 无法独立测试每个阶段

### 风险 6：广告域硬编码泄露到通用层（P0 中）
- `constants.ts`、`context-engine.ts`、`intent-router.ts`、`useConversation.ts` 中硬编码广告域词
- 违反"Chat Runtime 不绑定广告域"原则

### 风险 7：测试覆盖率为零（P0 极高）
- 504 个文件，2 个测试文件
- 任何重构都没有安全网

---

## 十四、可能的错误架构决策

1. **types/index.ts 作为全局类型垃圾桶** — 157 个类型全部堆在一个文件，没有按领域拆分
2. **admin/page.tsx 作为单页面应用** — 全部管理 Tab 在一个文件，没有路由拆分
3. **useConversation 作为万能 Hook** — 发送/SSE/回放/重试/状态机/业务路由全部混合
4. **chat/route.ts 作为单入口** — 全部 Chat 逻辑在一个文件，没有 pipeline 拆分
5. **report-query-orchestrator.ts 作为全链路编排** — 解析/规划/执行/诊断/展示全部混合
6. **v1/v2 runtime 数据并存** — legacy fallback 路径仍然存在，增加维护成本
7. **三套响应协议并存** — ResponseContract / MessageContract / SemanticResultContract 无统一真源

---

## 十五、可删除/可迁移/需保留的代码类型

### 可删除（约 9 个文件，~3,000 行）

| 文件 | 原因 |
|------|------|
| `lib/automation-worker.ts` | 0 引用 |
| `lib/guarded-tool-call.ts` | 被替代 |
| `lib/intent-route-engine.ts` | 被替代 |
| `lib/personal-knowledge-config-store.ts` | 0 引用 |
| `lib/planner-assisted-routing.ts` | 0 引用 |
| `lib/planner-capability-grounding.ts` | 0 引用 |
| `lib/tool-fallback-policy.ts` | 0 引用 |
| `lib/tracking-link-service.ts` | 0 引用 |
| `lib/workflow-engine.ts` | 0 引用 |

### 可迁移（广告域词从通用层迁出）

| 当前位置 | 迁移目标 |
|---------|---------|
| `constants.ts` 中的广告域示例 | → `advertising-domain-pack.ts` |
| `context-engine.ts` 中的广告域正则 | → `advertising-domain-pack.ts` |
| `intent-router.ts` 中的广告域判断 | → `advertising-domain-pack.ts` |
| `useConversation.ts` 中的广告域提取 | → 业务 Hook 或 domain pack |
| `conversation-context.ts` 中的 media_id 提取 | → `advertising-domain-pack.ts` |

### 需保留（合理的大文件）

| 文件 | 原因 |
|------|------|
| `advertising-domain-pack.ts` (831) | 纯域信号包，内聚 |
| `managed-prompt-seeds.ts` (726) | 种子数据，非逻辑 |
| `api.ts` (801) | API client，内聚 |
| `trace.ts` (526) | Trace 构建，内聚 |

---

## 十六、P0/P1/P2 代码量治理方案

### P0 — 必须立即治理（不修改代码，仅建议边界）

| 项 | 当前 | 目标 | 拆分边界建议 | 验收标准 |
|----|------|------|------------|---------|
| **P0-1 压薄 chat/route.ts** | 4,212 行 / 31 函数 | < 300 行 | 提取 `chat-pipeline/` 目录：understanding → planning → capability → execution → assembly → disclosure | route.ts 只做入口调用，每个 pipeline 阶段独立文件、独立测试 |
| **P0-2 拆 useConversation.ts** | 2,481 行 / 48 函数 | < 500 行 | 拆为：`useSendMessage` / `useSSEStream` / `useConversationHistory` / `useTurnStateMachine` / `useConversationBusiness` | 每个 Hook 单一职责，SSE 解析可独立测试 |
| **P0-3 拆 admin/page.tsx** | 6,659 行 | 每个 Tab < 500 行 | 每个 Tab 独立文件：`admin/OverviewTab.tsx` / `PromptTab.tsx` / `AutomationTab.tsx` 等 | 每个 Tab 独立组件文件，按路由懒加载 |
| **P0-4 拆 report-query-orchestrator.ts** | 4,892 行 | 每个阶段 < 500 行 | 拆为：`report-parsing.ts` / `report-planning.ts` / `report-execution.ts` / `report-diagnosis.ts` / `report-visualization.ts` | 每个阶段独立文件、独立类型、独立测试 |
| **P0-5 清理死代码** | 9 个 0 引用文件 | 0 死代码 | 删除 11.1 节中列出的 9 个文件 | `grep -r` 确认无引用后删除 |
| **P0-6 广告域词迁出通用层** | 6+ 个通用文件含广告域词 | 仅 domain pack 含域词 | 将域词集中到 `advertising-domain-pack.ts` | `grep` 通用 lib/hooks 不再出现域词 |

### P1 — 应该治理

| 项 | 当前 | 目标 | 拆分边界建议 | 验收标准 |
|----|------|------|------------|---------|
| **P1-1 收敛 ResponseContract** | 三套响应协议并存 | 统一为 SemanticResultContract + MessageContract | ResponseContract 降级为内部构建中间物，UI 只消费 MessageContract + SemanticResultContract | `types/index.ts` 中 ResponseContract 字段与 SemanticResultContract 对齐 |
| **P1-2 拆 types/index.ts** | 2,310 行 / 157 类型 | 每个文件 < 300 行 | 拆为：`types/message.ts` / `types/result.ts` / `types/runtime.ts` / `types/conversation.ts` / `types/capability.ts` / `types/trace.ts` | 每个类型文件按领域内聚 |
| **P1-3 拆 ChatContainer.tsx** | 2,815 行 | < 500 行 | 拆出：`MarkdownRenderer.tsx` / `SourceReferenceStrip.tsx` / `CapabilityStrip.tsx` / `RuntimeStatusCard.tsx` / `MetricExplanationCard.tsx` | 每个子组件独立文件 |
| **P1-4 建立 renderer registry** | ChatContainer 内含业务解释 | 组件只展示，不解释业务 | 将指标解释、来源标签、能力标签移入 renderer registry | ChatContainer 不含 "激活数"/"付费数" 等业务解释 |
| **P1-5 统一 Trace 类型** | Trace 类型分散在 3 处 | 统一 Trace 真源 | 所有 Trace 类型迁入 `contracts/observability/` | `lib/trace.ts` 仅包含构建函数，不包含类型定义 |
| **P1-6 补测试** | 2 个测试文件 | 核心链路 80%+ | 优先补：route pipeline / useConversation / report-query-orchestrator | 每个核心模块至少 1 个测试文件 |

### P2 — 可以治理

| 项 | 当前 | 目标 | 建议 | 验收标准 |
|----|------|------|------|---------|
| **P2-1 清理 v1 runtime 数据** | v1/v2 并存 | 仅 v2 | 确认 legacy fallback 无流量后删除 v1 目录和 legacyDataPath | 代码中无 `legacyDataPath` 引用 |
| **P2-2 拆 runtime-config.ts** | 1,083 行 | 每个文件 < 300 行 | 拆为：`model-service-config.ts` / `public-web-config.ts` / `chat-display-config.ts` | 每个配置文件独立 |
| **P2-3 拆 app/page.tsx** | 4,037 行 | < 500 行 | 拆出：`AutomationPanel.tsx` / `AssetPanel.tsx` / `AttachmentPanel.tsx` | 每个面板独立组件 |
| **P2-4 文档-代码对齐** | 部分 doc_only | 100% 对齐 | 更新 MASTER_SPEC 删除 `intent-route-engine.ts` 引用 | 文档引用的模块全部存在且被使用 |
| **P2-5 拆管理后台 Tab** | 多个 Tab > 300 行 | 每个 < 300 行 | 拆出子组件 | 每个 Tab 文件 < 300 行 |

---

## 十七、建议拆分边界总结

### 核心拆分原则

1. **Chat Runtime Pipeline** — route.ts 拆为 understanding → planning → capability → execution → assembly → disclosure 六阶段
2. **Hook 单一职责** — useConversation 拆为发送/SSE/历史/状态机/业务路由五个 Hook
3. **类型按领域内聚** — types/index.ts 拆为 message/result/runtime/conversation/capability/trace 六个文件
4. **组件只展示** — ChatContainer 中的业务解释移入 renderer registry
5. **域词集中管理** — 广告域词全部迁入 advertising-domain-pack.ts
6. **阶段独立可测** — report-query-orchestrator 拆为解析/规划/执行/诊断/展示五个文件

### 拆分优先级矩阵

```
        高影响
          │
    P0-1  │  P0-2
  route拆 │ hook拆
          │
 ─────────┼───────── 高紧急
          │
    P0-3  │  P0-4
  admin拆 │ report拆
          │
        低影响
```

---

## 十八、每项治理的验收标准

| 治理项 | 验收标准 |
|--------|---------|
| P0-1 route 压薄 | `route.ts` < 300 行，仅包含 POST handler 和 pipeline 调用 |
| P0-2 hook 拆分 | `useConversation.ts` < 500 行，SSE/发送/状态机各自独立文件 |
| P0-3 admin 拆分 | `admin/page.tsx` < 500 行，每个 Tab 独立组件文件 |
| P0-4 report 拆分 | `report-query-orchestrator.ts` 不存在，拆为 5 个阶段文件 |
| P0-5 死代码清理 | 0 个 0 引用文件 |
| P0-6 域词迁出 | 通用 lib/hooks 中 `grep` 不到广告域词 |
| P1-1 响应协议收敛 | ResponseContract 不再被 UI 直接消费 |
| P1-2 types 拆分 | `types/index.ts` < 500 行，按领域拆分 |
| P1-3 ChatContainer 拆分 | `ChatContainer.tsx` < 500 行 |
| P1-4 renderer registry | ChatContainer 不含业务解释逻辑 |
| P1-5 Trace 统一 | Trace 类型全部在 `contracts/observability/` |
| P1-6 测试覆盖 | 核心链路至少各有 1 个测试文件 |
| P2-1 v1 清理 | 代码中无 `legacyDataPath` |
| P2-2 runtime-config 拆分 | `runtime-config.ts` < 300 行 |
| P2-3 page 拆分 | `app/page.tsx` < 500 行 |
| P2-4 文档对齐 | 文档引用的模块全部存在且被使用 |
| P2-5 Tab 拆分 | 每个管理 Tab < 300 行 |

---

## 十九、总结

### 当前最大结构风险

1. **chat/route.ts (4,212 行)** — 全部 Chat 逻辑在一个文件
2. **useConversation.ts (2,481 行)** — 全部交互逻辑在一个 Hook
3. **admin/page.tsx (6,659 行)** — 全部管理 Tab 在一个文件
4. **report-query-orchestrator.ts (4,892 行)** — 问数全链路在一个文件
5. **types/index.ts (2,310 行)** — 全部类型在一个文件
6. **广告域硬编码泄露** — 通用层含广告域词
7. **测试覆盖率为零** — 无安全网

### 核心治理方向

- **压薄入口** — route.ts / page.tsx 只做入口调用
- **拆超级文件** — 4 个超过 2,000 行的文件必须拆分
- **域词集中** — 广告域词迁入 domain pack
- **收敛协议** — 三套响应协议统一
- **补测试** — 核心链路必须有测试保护

### 预估治理工作量

| 优先级 | 项数 | 预估工作量 |
|--------|------|-----------|
| P0 | 6 项 | 2-3 周 |
| P1 | 6 项 | 2-3 周 |
| P2 | 5 项 | 1-2 周 |
| **总计** | **17 项** | **5-8 周** |

---

*本报告为只读审计结果，未修改任何文件。*

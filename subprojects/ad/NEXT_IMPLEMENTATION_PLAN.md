# 小乔智投 NEXT_IMPLEMENTATION_PLAN

## 0. 计划地位

本文件是 `MASTER_SPEC.md` 的下一阶段实施计划，并受 `docs/architecture/ENTERPRISE_AI_CHAT_OS_SPEC.md` 约束。

本计划只做当前方向收敛，不新增世界观，不新增复杂架构，不把 MCP / Skill 已有的步骤、状态、失败原因、建议和 workflow 重新搬进 Chat Runtime。

当前统一方向继续保持：

```text
Fat MCP / Fat Skill
+
Thin Chat Runtime
```

Chat Runtime 近期只负责：

- Intent Router
- Skill Router 的轻量选择与记录
- 参数补齐
- Result Protocol 派生
- Timeline 派生
- MessagePart 派生
- 会话区结果展示
- Tool Card / 折叠卡片 / 数据可视化卡片渲染

## 1. 实施总原则

1. `MASTER_SPEC.md` 是唯一系统主规格。
2. 本计划只拆实施顺序，不替代主规格。
3. 所有新增字段必须兼容旧消息字段。
4. 新能力优先挂载在现有 `metadata`、`process_events`、`workflow_result`、`report_query_result` 周边。
5. 不引入新的聊天渲染框架。
6. 不建设复杂 Multi-Agent Runtime。
7. UI 不反推业务事实，只消费 Result / Timeline / MessagePart。
8. MCP / Skill 是事实源；Chat Runtime 是薄编排和协议转换层。
9. UI 体验调整必须遵守 `docs/review/智投Chat-前端自主渲染与色彩字体系统-2026-05-27.md`，不得重新引入旧字体、旧色彩口径或分散硬编码色值。
10. 新增协议、renderer 或 UX 规范必须先归属到 Enterprise AI Chat OS；最终结果进入 Unified Semantic Contract，运行过程进入 Runtime Display Protocol，具体展示形态进入 `regions[].componentBinding`。
11. 扩展规范补全不得覆盖问数趋势展示修复；趋势类仍优先图表、明细类仍优先表格，少于 2 个有效日期点不得输出趋势结论。

## 2. P0

| 项 | 目标 | 涉及模块 | 风险 | 是否需要重构 | 是否影响线上 | 是否依赖 MCP 改造 |
|---|---|---|---|---|---|---|
| P0-1 Router 稳定收敛 | 统一 `/api/chat` 使用当前 Intent Router 输出，避免 route 判断散落；保留规则路由、上下文补偿、问数优先链路 | `intent-router.ts`、`intent-route-engine.ts`、`intent-route-rules.ts`、`api/chat/route.ts` | 意图误判会直接影响进入问数、诊断、帮助链路 | 小重构，仅整理调用入口和 trace 字段 | 是，影响所有会话请求 | 否 |
| P0-2 Result Protocol 类型落地 | 在现有类型体系中新增 `ResultStatus`、`ResponseContract`，由 `/api/chat` 将 `WorkflowResult`、`ReportQueryResult`、失败状态统一封装 | `types/index.ts`、`api/chat/route.ts`、`report-query-orchestrator.ts` | 状态映射错误会让 UI 把失败当成功 | 小重构，新增派生函数，不替换旧字段 | 是，影响 assistant message metadata | 否 |
| P0-3 MessagePart Protocol 类型落地 | 新增 `MessagePart` 类型和派生函数，从 `ResponseContract` 派生 text、timeline、tool_card、result_card、table、chart、missing_fields | `types/index.ts`、新增轻量协议派生模块、`api/chat/route.ts` | 派生重复可能导致 UI 展示两套卡片 | 小重构，保持旧字段兼容 | 是，影响新消息渲染 | 否 |
| P0-4 Timeline 标准化 | 明确继续以 `AgentProcessEvent` 为 TimelineEvent；补齐 `process_events` 到 `response_contract.timeline`，失败事件必须带原因和建议 | `agent-runtime.ts`、`chat-route-primitives.ts`、`api/chat/route.ts` | 事件过多会造成会话区噪声 | 否，主要是规范化字段 | 是，影响过程展示 | 否 |
| P0-5 ChatContainer 优先消费 MessagePart | 会话区优先读取 `metadata.response_contract.message_parts`，无该字段时继续用 `process_events`、`tool_calls`、`workflow_result` 回退 | `ChatContainer.tsx`、`ReportQueryResultCard`、`DataVizRenderer`、`MissingFieldPanel` | 兼容不完整会导致历史消息空白 | 中等重构，仅限消息渲染层 | 是，影响主要 UI | 否 |
| P0-6 `/api/chat` scope 与会话归属补齐 | 进入编排前解析 user scope，校验 conversation ownership，MCP 入参只能来自 effective scope 和 compiled context | `api/chat/route.ts`、scope/auth 工具、conversation store | 权限收紧可能暴露历史脏数据或无权限会话 | 小重构，但安全影响高 | 是，属于安全修复 | 否 |
| P0-7 问数 mapping 从 partial 推进到可验收 | 修正问数测试映射缺口，保证核心问数用例能产出明确 ResultStatus、MessagePart 和数据卡 | `report-query-orchestrator.ts`、问数测试脚本、能力映射配置 | 能力映射误配会导致空结果或错误工具选择 | 否，主要是映射与测试补齐 | 是，影响问数体验 | 可能，若 MCP manifest 缺字段则需要适配 |
| P0-8 乱码与协议文案门禁 | 对协议、Router 触发词、用户可见文案、Skill/MCP contract 做编码扫描，先保护关键链路 | `types/index.ts`、Router、协议文档、用户文案 | 乱码会导致路由命中和 UI 文案不可用 | 否 | 是，影响中文体验和路由准确性 | 否 |
| P0-9 设计系统真源收口 | 新增或触达 UI 必须引用 2026-05-27 设计系统；色彩从 `ZHITOU_CHAT_COLORS`、CSS 变量或 Ant Design token 取值；字体使用中文优先字体栈 | `globals.css`、`AntdProvider.tsx`、`zhitou-chat-colors.ts`、UI 文档 | 旧文档或历史硬编码继续扩散会导致视觉反复 | 否，先规范和局部收口 | 是，影响 UI 一致性 | 否 |
| P0-10 Enterprise AI Chat OS 总纲接入 | 将企业级 AI Chat OS、Unified Semantic Contract、Runtime Display Protocol、Component Binding 的边界写入真源和 guardrail，阻断平行总协议 | `docs/architecture/ENTERPRISE_AI_CHAT_OS_SPEC.md`、`MASTER_SPEC.md`、`README.md`、`ui-guardrail.md`、`check-ad-ui-guardrail.cjs` | 概念并列会导致后续 renderer、action、source/evidence 再次分裂 | 否，先文档和门禁收口 | 是，影响后续开发规则 | 否 |
| P0-11 AI Chat OS 扩展规范补全 | 补齐架构索引、Semantic Contract、Action/Evidence/Source、Runtime Display Protocol、Component Registry、AI Runtime UX、AI Trust UX、Frontend Engineering、Visual breakdown、Conversation/Input/Feedback、Legacy mapping 和前端 contract 类型真源 | `docs/architecture/**`、`frontend/src/src/contracts/**`、`README.md`、`MASTER_SPEC.md`、`ui-guardrail.md`、`check-ad-ui-guardrail.cjs` | 若误覆盖 Visual token 或问数趋势修复，会造成视觉反复或报表结果退化 | 否，先规范、类型和门禁收口 | 是，影响后续开发规则 | 否 |

### P0 状态追踪（2026-06-16 更新）

基于 git log 和代码扫描的当前进展：

| 项 | 状态 | 证据 |
|---|---|---|
| P0-1 Router 稳定收敛 | 🟡 大部分完成 | `intent-orch-enhancer.ts`、`route-governance-scanner.ts`、`route-decision-observation.ts` 已落地；`feat: 统一搜索编排与 Retrieval Layer 契约落地` 已合入 |
| P0-2 Result Protocol 类型落地 | 🟡 大部分完成 | `lib/response-contract.ts`、`contracts/result-assembly/semantic-result-assembly.ts` 已存在 |
| P0-3 MessagePart Protocol 类型落地 | 🟡 大部分完成 | `contracts/disclosure/`（8 文件）、`contracts/presentation/message-contract-field-bindings.ts` 已落地 |
| P0-4 Timeline 标准化 | 🟡 大部分完成 | `feat(planner): add planner orchestrator shadow mode` + `planner plan contract validator` 已合入 |
| P0-5 ChatContainer 优先消费 MessagePart | 🟡 进行中 | `MessagePresentationRenderer.tsx`、`MessageDisclosureDrawer.tsx` 已存在；`refactor: simplify legacy rendering paths` 已合入 |
| P0-6 scope 与会话归属补齐 | 🟡 进行中 | `conversation-store.ts` 护栏已落地；完整 scope 校验待确认 |
| P0-7 问数 mapping | 🟡 进行中 | 问数测试脚本存在；mapping 从 partial 到可验收的进度待验证 |
| P0-8 乱码与协议文案门禁 | 🟢 已完成 | `check:encoding`、`check:mojibake` 脚本已接入；`fix-encoding.js` 已存在 |
| P0-9 设计系统真源收口 | 🟡 大部分完成 | `ui:guardrail` 已接入；`zhitou-chat-colors.ts` 已存在；仍需持续治理 |
| P0-10 Enterprise AI Chat OS 总纲接入 | 🟢 已完成 | `docs/architecture/ENTERPRISE_AI_CHAT_OS_SPEC.md` + `00_SPEC_INDEX.md` 已建立；`validate:ad-ui` 门禁已接入 |
| P0-11 AI Chat OS 扩展规范补全 | 🟢 已完成 | `docs/architecture/` 119 个规范文件、`contracts/` 68 个类型文件已建立 |

> 🟢 = 已完成 🟡 = 大部分完成/进行中 🔴 = 未开始

### P0 完成定义

- 新 assistant message 能读取 `metadata.response_contract.status`。
- 新 assistant message 能读取 `metadata.response_contract.timeline`。
- 新 assistant message 能读取 `metadata.response_contract.message_parts`。
- 旧消息继续通过 `process_events`、`tool_calls`、`workflow_result` 正常回退。
- `/api/chat` 不再直接信任裸 `x-conversation-id` 进入 MCP / workflow 链路。
- 问数核心用例不再只停留在 mapping partial 状态。
- 新增或触达的用户可见 UI 不再引入同义硬编码色值，字体、色彩和渲染方式能追溯到 2026-05-27 设计系统。
- Enterprise AI Chat OS 总纲已成为当前真源入口，Data Visualization UX、AI Runtime UI、AI Trust UX 没有被定义为平行总协议。
- `docs/architecture/00_SPEC_INDEX.md` 和 `frontend/src/src/contracts/**` 已成为二级规范与类型真源入口，且不覆盖当前问数趋势展示修复。

## 3. P1

| 项 | 目标 | 涉及模块 | 风险 | 是否需要重构 | 是否影响线上 | 是否依赖 MCP 改造 |
|---|---|---|---|---|---|---|
| P1-1 Tool Card 折叠统一 | 将 `mcp.tool_call`、`mcp.tool_result`、`mcp.tool_error` 派生为统一 Tool Card，大输入输出默认折叠，失败摘要常显 | `agent-runtime.ts`、`ChatContainer.tsx`、Tool 展示组件 | 原始数据过多会拖慢渲染 | 小重构 | 是 | 否 |
| P1-2 SourceRef 默认展示恢复 | 从 `response_contract.source_refs` 和 `source.attached` 统一展示来源，不再依赖隐藏分支 | `ChatContainer.tsx`、`SourceReferenceStrip` | 来源重复或来源为空时影响可信度 | 否 | 是 | MCP 返回来源越完整效果越好，但不强依赖 |
| P1-3 数据可视化卡片标准化 | chart/table 只消费结构化数据和 `viz_spec`，空结果显示条件、原因、建议，不展示虚构趋势 | `ReportQueryResultCard`、`DataVizRenderer`、MessagePart 派生模块 | 旧结果结构不一致会导致卡片降级 | 小重构 | 是 | 否 |
| P1-3A Data Visualization UX 扩展落地 | 指标卡、表格、Drill-down、图表交互、Sankey、路径分析、Tooltip、大数据量、移动端、图表联动、AI Insight 统一作为 `data-visualization` binding 的局部 data shape 与交互规范 | `docs/architecture/interaction-system/data-visualization-ux.md`、`DataVizRenderer`、`ReportQueryResultCard`、MessagePart 派生模块 | 如果绕过 ActionContract / EvidenceRef / SourceRef，会重新形成私有协议 | 小重构，先兼容旧 `VizSpec` | 是 | 否 |
| P1-3B 问数趋势展示按契约修复 | `report-result` 优先派生 summary -> chart -> table/detail -> actions -> source_refs；近 30 天趋势、多日趋势、单行不足数据按契约降级 | report query 提示词、`ReportQueryResultCard`、`DataVizRenderer`、MessagePart 派生模块、问数测试 | MCP 只返回汇总行时不能伪造成趋势，需要清晰不足说明 | 中等重构，保留旧入口 | 是 | 否 |
| P1-4 管理后台展示 Router/MCP gap | 在已有后台能力页补充 route trace、capability preflight、mapping gap 和测试状态 | 管理后台 intent/MCP 相关页面、mapping 测试输出 | 后台信息过多会难读 | 否 | 低，主要影响管理入口 | 可能，需要 MCP manifest 暴露能力字段更完整 |
| P1-5 Workflow run 与 Timeline 回放统一 | 历史 workflow run 能回放成 Timeline，不再只有当前 SSE 流可见 | `workflow-task-store.ts`、`workflow-engine.ts`、Timeline 派生模块 | 历史数据字段不全时只能降级 | 小重构 | 否，主要影响历史查看 | 否 |
| P1-6 协议验收测试 | 增加测试断言：新消息必须包含 `response_contract`，核心场景必须包含 `message_parts` 和合法 `status` | 现有测试脚本、evaluation runtime | 测试会暴露旧链路缺口 | 否 | 否 | 否 |

### P1 完成定义

- Tool Card 展示统一，技术细节默认折叠。
- SourceRef 默认可见，且不会重复堆叠。
- 图表和表格只来自结构化结果。
- 管理后台可以看见 Router / MCP 能力缺口。
- 历史 workflow run 可以被还原为用户可理解 Timeline。

## 4. P2

| 项 | 目标 | 涉及模块 | 风险 | 是否需要重构 | 是否影响线上 | 是否依赖 MCP 改造 |
|---|---|---|---|---|---|---|
| P2-1 Skill Router 轻量显式化 | 不做复杂 Runtime，仅把当前能力选择结果显式记录为 `SkillRouteDecision` 形态 | Skill contract、orchestrator、metadata | 过早抽象会扩大范围 | 小重构，必须保持轻量 | 低 | 否 |
| P2-2 UI 体验细节打磨 | 优化 Timeline/Stepper 密度、卡片折叠状态、移动端堆叠、失败态和空态文案 | 会话区 UI 组件 | 视觉调整可能影响现有布局 | 否 | 是 | 否 |
| P2-3 导出与审计消费新协议 | 导出、评测、审计优先读取 `response_contract`，旧字段作为回退 | export/evaluation/audit 相关模块 | 旧消息兼容复杂 | 小重构 | 低 | 否 |
| P2-4 MCP 能力描述质量提升 | 按现有 MCP 边界补齐步骤、失败原因、建议、source_refs、schema 说明 | MCP 配置与 manifest | MCP 输出不稳定会影响 Result 质量 | 否，属于能力配置优化 | 视具体 MCP 而定 | 是 |
| P2-5 会话区产品化持续增强 | 基于 MessagePart 扩展更多业务卡片，但仍使用当前渲染体系，不替换聊天框架 | `ChatContainer`、业务卡片组件 | 卡片过多会造成体验碎片化 | 否 | 是 | 视卡片数据源而定 |

### P2 完成定义

- Skill 选择结果可追踪，但没有独立 Agent 调度平台。
- 导出、评测、审计能消费新协议。
- MCP 输出质量提升不会改变 Runtime 边界。
- 会话区体验增强仍围绕 MessagePart，不扩展成新架构。

## 5. 明确先不要做

以下事项当前阶段明确不做：

- Multi-Agent Runtime
- Autonomous Agent
- Recursive Agent
- Self-Evolving Runtime
- 复杂 Planner
- 独立 Agent 调度平台
- 新聊天渲染框架替换当前会话区
- 将 MCP workflow 重写进 Chat Runtime
- 用 mock 数据补业务结论
- 让 UI 从自然语言正文反推业务状态

## 5A. 待办归档：IntentOrch 真实验证收尾（2026-06-14）

> **当前状态（2026-06-16 更新）：** 代码护栏已落地（conversation-store 防覆盖、runtime-config 防写回、登录页 SDK 加载修复）。真实探针和持久化护栏测试全部通过。第三次真实浏览器端到端证据 **仍待补齐** — 需在 dev server 运行且用户保持登录态时，发送真实消息验证 `response_contract` 落盘。此验证完成后本节可标记为 fully closed。

### 当前真实表现与边界

- 运行面：`modelService.enabled` 当前真实配置为 `true`，`chat_answer` 路由启用；回答模型 breaker 当前未处于 active open 状态。
- MCP 面：已配置且有 endpoint 的 MCP 真实连通探针通过；未配置 endpoint 的 MCP 只记录为 `not_configured`，不作为 401/406/400 失败。
- 展示面：登录页已修复 `/js/ykLogin.iife.js` 未真正执行导致的“正在准备登录”卡住问题；用户已能通过真实登录态发送消息。
- 观测面：第二次真实发送后，旧逻辑曾把 `.runtime/zhitou-chat/v2/users/acct-xuyun/conversations.json` 写成空 store；这不是本轮新增主链路问题，但导致该次 assistant message 与 `metadata.response_contract` 证据不可追溯。
- 配置面：`chat_answer` 超时配置已从 `connectTimeoutMs=10000` 调整到 `30000`，`responseTimeoutMs=60000`，`generationParams.timeoutMs=45000`；后续仍需单独做配置治理，避免运行态写回和 breaker 参数漂移。

### 可能根因与影响链路

- 根因候选：`conversation-store` 在已有会话文件不可读、被截断或部分写入时，旧逻辑会静默退回 `defaultStore()`，随后的 mutation 可能把真实会话覆盖成空 store。
- 影响链路：真实浏览器发送 -> `/api/chat` -> 模型调用成功或失败 -> assistant message 生成 -> `conversation-store` 持久化；若持久化层清空文件，则后续无法证明该轮 `ResponseContract`、`turn_ui_status`、`process_events` 是否真实落盘。
- 直接影响：不能把第二次真实回答作为通过证据；若要证明真实端到端回答链路，必须在修复后重新发起一次真实登录态消息取证。

### 涉及架构层级

- Request Understanding：本轮未新增业务关键词路由。
- Chat Domain：会话持久化可靠性受到影响。
- Capability Discovery / MCP：真实连通探针已通过，当前未复现 401/406/400。
- Model Service：breaker 已从 active open 恢复，但仍出现过 `model_connect_timeout:30000`。
- Prompt：本轮未改 Prompt 主逻辑。
- ResponseContract：第二次真实发送的 `response_contract` 证据因会话文件清空而缺失；不能据此反推回答链路一定失败。
- Frontend Presentation：登录页脚本加载修复已完成。
- Observability：新增真实探针和持久化护栏测试；仍缺修复后第三次真实浏览器消息证据。
- Admin / 配置面：超时配置已有一次治理修改，后续需独立配置治理任务收口。

### 硬编码风险识别

- 本轮修复未新增业务关键词 if/else 路由。
- `conversation-store` 护栏属于通用持久化保护，不绑定广告业务、媒体名、指标名或单个客户样例。
- 真实探针脚本标明 `uses_mock=false` 或 `validation_mode=real_*`，不得把 `test:chat-runtime-regression` 的 mock fetch 结果当作真实验收依据。

### 已落地修改

- `frontend/src/src/lib/runtime-config.ts`：增加 scoped runtime config override，避免测试/运行时把真实 `runtime-config.json` 写回到错误状态。
- `frontend/src/src/lib/conversation-store.ts`：已有文件读取失败时不再静默初始化为空；写入改为临时文件 + rename，降低截断覆盖风险。
- `frontend/src/src/app/login/page.tsx`：改为客户端动态加载登录 SDK，避免 Next `<Script>` 未执行时页面卡在“正在准备登录”。
- `frontend/src/scripts/conversation-store-governance-golden.ts`：新增真实文件级持久化护栏测试。
- `frontend/src/scripts/real-provider-config-probe.ts`、`real-mcp-connectivity-probe.ts`、`model-breaker-state-probe.ts`、`real-provider-chat-e2e.ts`：用于区分 mock regression 与真实运行态验证。
- `frontend/src/package.json`：接入真实探针和持久化护栏脚本。

### 已验证证据

```bash
npm.cmd run test:conversation-store-governance
npm.cmd run test:real-provider-config-probe
npm.cmd run test:real-mcp-connectivity
npm.cmd run test:model-breaker-state
npm.cmd run ts-check
npm.cmd run ui:guardrail
npm.cmd run check:encoding
git diff --check
```

关键结果：

- `test:conversation-store-governance` 通过：坏的已有 store 不会被覆盖成空 store；健康 store 可持久化 user + assistant 两条消息。
- `test:real-provider-config-probe` 通过：`model_enabled=true`，知识库与 public web 配置为真实配置探针。
- `test:real-mcp-connectivity` 通过：当前已配置 endpoint 的 MCP 均为 pass；未配置 endpoint 的 MCP 为 skip/not_configured。
- `test:model-breaker-state` 通过：breaker 未处于 active open。
- `ts-check`、`ui:guardrail`、`check:encoding`、`git diff --check` 通过。

已知阻断：

- `npm.cmd run validate:ad-ui` 当前被 `check:runtime-migration-gate` 阻断：工作区已有 14 个 runtime 文件处在变更状态，且 41 个 P0/P1 rule-debt 仍待 expert committee approval。
- `npm.cmd run check:rule-debt-inventory` 当前失败在既有 `frontend/src/src/lib/public-web-runtime.ts` if-count 基线扩张：expected at most 65, actual 78。

### 下次重启必须继续的最小验证

1. 确认 dev server 仍在 `http://127.0.0.1:8002/`，用户保持登录态。
2. 让用户在真实浏览器里发送第三次短消息，例如“你好第三次”。
3. 读取 `.runtime/zhitou-chat/v2/users/acct-xuyun/conversations.json`，确认新 conversation 中同时存在 user message 与 assistant message。
4. 对 assistant message 检查：
   - `metadata.response_contract` 存在；
   - `metadata.response_contract.answer_origin.source` 不是 `model_unavailable`；
   - `metadata.turn_ui_status` 不是 `degraded`，或如降级必须记录真实 error；
   - `metadata.process_events` 至少包含 `intent.detected`、`planner.arbitrated`、`model.step` 或等价真实运行事件。
5. 重新运行：

```bash
npm.cmd run test:real-provider-config-probe
npm.cmd run test:real-mcp-connectivity
npm.cmd run test:model-breaker-state
npm.cmd run test:conversation-store-governance
npm.cmd run ts-check
```

6. 若第三次仍无 assistant message 或 store 再次为空，优先继续排查 `conversation-store` 调用方和 `/api/xiaoqiao/conversations` 相关路径，不得用 mock 或手写消息替代真实证据。

### 推送整理建议

- 可以单独拆一个配置/持久化治理提交，范围聚焦：
  - `frontend/src/src/lib/runtime-config.ts`
  - `frontend/src/src/lib/conversation-store.ts`
  - `frontend/src/src/app/login/page.tsx`
  - `frontend/src/scripts/conversation-store-governance-golden.ts`
  - 真实探针脚本
  - `frontend/src/package.json`
  - 本待办归档小节
- 当前工作区存在大量其他已修改/未跟踪文件，推送前必须先按 `git diff` 分组确认，不要把无关 rule-debt、review packet、checkpoint 产物混入同一提交。
- 在第三次真实链路证据补齐前，不建议把 IntentOrch 本轮目标标记为“真实端到端已验收”；可以标记为“代码护栏已落地，第二次真实链路证据不可追溯，端到端证据待补”。

## 6. 验收与测试

基础门禁：

```bash
npm run ts-check
npm run validate:ad-ui
npm run ui:guardrail
```

问数链路：

```bash
npm run test:report-query
npm run test:report-query:mapping
```

角色与路由：

```bash
npm run test:role-mapping
```

构建验收：

```bash
npm run build
```

UI 验收场景：

- 成功问数
- 空结果
- 缺字段
- MCP 未配置
- MCP 失败
- 部分成功
- 历史消息回放
- 移动端卡片折叠

协议验收：

- 新 assistant message 必须包含 `metadata.response_contract.status`。
- 新 assistant message 必须包含 `metadata.response_contract.timeline`。
- 新 assistant message 必须包含 `metadata.response_contract.message_parts`。
- 旧消息必须通过旧字段正常回退。
- ResultStatus 必须区分 `success`、`empty`、`partial_success`、`missing_input`、`blocked`、`failed`、`not_configured`。

## 7. 默认假设

1. 文件落点为 `ad/NEXT_IMPLEMENTATION_PLAN.md`，与 `ad/MASTER_SPEC.md` 同级。
2. 第一批实施不新增复杂目录结构。
3. `MessagePart` 不替换 `Message` 存储结构，只挂载在 metadata 中。
4. `TimelineEvent` 直接复用 `AgentProcessEvent`，不新增第二套过程事件体系。
5. MCP 改造只在 P2 作为质量增强；P0 必须能在当前 MCP 返回结构上完成协议收敛。
6. 若 MCP manifest 缺字段，P0 只做适配和降级，不阻塞 Result / MessagePart 协议落地。

## 8. 与用户需求的闭环判断

用户要求：

- 基于 `MASTER_SPEC.md` 和当前代码库生成未来实施计划。
- 不新增世界观。
- 不新增复杂架构。
- 只做当前方向收敛。
- 优先解决 Router 稳定、Result Protocol、Timeline、Tool/Card Renderer、UI 体验。
- 明确 P0 / P1 / P2。
- 明确哪些先不要做。

闭环结果：`solved`。

本计划已经把用户要求映射到 P0 / P1 / P2，并明确 Multi-Agent Runtime、Autonomous Agent、Recursive Agent、Self-Evolving Runtime、复杂 Planner 当前阶段不做。

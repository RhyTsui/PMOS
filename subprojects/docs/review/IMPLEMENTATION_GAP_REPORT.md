# 小乔智投需求实现差距报告

生成时间：2026-05-26  
分类口径：已实现 / 半实现 / Mock或占位 / 未实现 / 设计冲突 / 代码存在但未接入主流程。  
风险等级：高 = 影响闭环真实性或权限安全；中 = 影响体验、稳定性或可维护性；低 = 暂不阻断第一批问数闭环。

## 1. 总体差距结论

当前系统已经有真实问数链路基础，但仍存在三个关键风险：

1. 项目与权限解析尚未成为 MCP 调用前的硬门禁，存在“顶部 A 项目、用户问 B 项目但请求 A 数据”的风险。
2. 结果协议没有完全标准化，前端仍从 `metadata`、`workflow_result`、`report_query_result`、`tool_calls`、`thinking_steps` 等多处拼装展示。
3. 多个业务模块有 UI/API/Store，但未接入真实主流程，容易被误判为已完成。

## 2. 能力差距矩阵

| 能力 | 当前状态 | 风险 | 证据路径 | 判断 |
|---|---|---:|---|---|
| Intent Router | 半实现 | 高 | `ad/frontend/src/src/lib/intent-router.ts`、`ad/frontend/src/src/lib/intent-route-engine.ts`、`ad/frontend/src/src/hooks/useConversation.ts` | 有规则路由和复合路由，但仍有硬编码关键词、旧本地 detectIntent、部分乱码文本，路由与能力发现/权限未完全绑定。 |
| Skill Router | 代码存在但未接入主流程 | 中 | `ad/frontend/src/src/lib/skill-store.ts`、`ad/frontend/src/src/lib/skill-contract-store.ts`、`ad/frontend/src/src/app/api/xiaoqiao/skill-contracts/route.ts` | 有 Skill 与 SkillContract 管理，但 `/api/chat` 问数链路直接调用 report orchestrator，没有稳定 Skill Router 主控。 |
| MCP 调用 | 已实现 | 中 | `ad/frontend/src/src/lib/mcp-discovery.ts`、`ad/frontend/src/src/lib/report-query-orchestrator.ts` | 已实现 tools/list 和 tools/call；风险在于调用前项目权限和字典阻断仍需补强。 |
| 能力发现 | 半实现 | 高 | `ad/frontend/src/src/lib/report-capability-manifest.ts`、`ad/frontend/src/src/lib/report-query-policy-store.ts`、`ad/frontend/src/src/lib/report-query-orchestrator.ts` | 问数已有 manifest/policy/preflight；其他业务域未形成统一 CapabilityRegistry。 |
| 知识库/RAG | 半实现 | 中 | `ad/frontend/src/src/lib/runtime-config.ts`、`ad/frontend/src/src/lib/report-query-orchestrator.ts`、`ad/frontend/src/src/lib/personal-knowledge-config-store.ts` | 问数缺口时有 knowledge fallback 配置；个人知识库 Key 与通用知识库/个人记忆/受控术语融合未闭环。 |
| 受控术语归一 | 半实现 | 中 | `ad/frontend/src/src/lib/controlled-glossary-index.ts`、`ad/frontend/src/src/lib/report-query-orchestrator.ts` | 问数路由选型中已调用归一化，但知识库同步到轻量索引机制未确认。 |
| MessagePart Protocol | 未实现 | 高 | `ad/docs/implementation-v1/16-智投Chat架构收敛评估与计划调整建议.md`、`ad/docs/implementation-v1/17-第一批代码落地执行计划与文件边界.md`、`ad/frontend/src/src/types/index.ts` | 文档已规划，代码类型未落地。 |
| Result Protocol | 半实现 | 高 | `ad/frontend/src/src/lib/report-query-orchestrator.ts`、`ad/frontend/src/src/app/api/chat/route.ts`、`ad/frontend/src/src/types/index.ts` | `ReportQueryResult` 和 `WorkflowResult` 存在，但未统一成 `ResponseContract`。 |
| Timeline / Stepper | 半实现 / 设计冲突 | 中 | `ad/frontend/src/src/lib/agent-runtime.ts`、`ad/frontend/src/src/components/cognitive/ChatContainer.tsx` | `AgentProcessEvent` 可转步骤，但 UI 仍显示“思维链”，与“不展示伪 CoT”目标冲突。 |
| Tool Card | 半实现 | 中 | `ad/frontend/src/src/components/cognitive/ChatContainer.tsx`、`ad/frontend/src/src/lib/agent-runtime.ts` | 有工具条与来源条，但缺少稳定 ToolCallEnvelope。 |
| 数据可视化卡片 | 已实现 | 低 | `ad/frontend/src/src/components/cognitive/DataVizRenderer.tsx`、`ad/frontend/src/src/types/viz.ts` | 支持表格、图表、链路图。 |
| 问数结果卡 | 已实现 | 低 | `ad/frontend/src/src/components/cognitive/ReportQueryResultCard.tsx` | 支持四态、质量检查、预览、下一步建议。 |
| 折叠卡片 | 半实现 | 低 | `ad/frontend/src/src/components/cognitive/ChatContainer.tsx` | 局部存在，不是统一折叠卡片协议。 |
| Trace 上报 | 半实现 | 中 | `ad/frontend/src/src/lib/trace.ts`、`ad/frontend/src/src/lib/trace-config-store.ts`、`ad/frontend/src/src/app/api/chat/route.ts` | Chat trace 存在；字段最终以连弩 SDK 为准，当前不是完整评测平台。 |
| 权限/风控 | 半实现 / 设计冲突 | 高 | `ad/frontend/src/src/lib/user-scope.ts`、`ad/frontend/src/src/lib/admin-access-store.ts`、`ad/frontend/src/src/app/api/chat/route.ts` | 有用户 scope 和后台权限，但问数 MCP 入参仍可能 fallback 到 `current_project`，未实现跨项目显式校验。 |
| Fat MCP | 已实现基础 | 中 | `ad/frontend/src/src/lib/mcp-discovery.ts`、`ad/frontend/src/src/lib/mcp-server-store.ts` | MCP 能力基础成立。 |
| Fat Skill | 半实现 | 中 | `ad/frontend/src/src/lib/skill-store.ts`、`ad/frontend/src/src/lib/skill-contract-store.ts` | 配置和契约存在，主链路薄弱。 |
| Thin Chat Runtime | 半实现 | 高 | `ad/frontend/src/src/app/api/chat/route.ts`、`ad/frontend/src/src/lib/context-compiler.ts`、`ad/frontend/src/src/lib/report-query-orchestrator.ts` | 问数链路具备雏形，但 Runtime 合同、项目门禁、MessagePart 未完整。 |
| 会话区视觉优化 | 已实现局部 | 低 | `ad/frontend/src/src/components/cognitive/ChatContainer.tsx`、`ad/frontend/src/src/app/page.tsx` | 已有较完整 UI，但后续不能重构页面框架。 |

## 3. 已实现能力

- MCP 发现与调用：`ad/frontend/src/src/lib/mcp-discovery.ts`
- 问数执行编排：`ad/frontend/src/src/lib/report-query-orchestrator.ts`
- 问数回答生成：`ad/frontend/src/src/lib/report-answer-composer.ts`
- 问数结果卡：`ad/frontend/src/src/components/cognitive/ReportQueryResultCard.tsx`
- 数据可视化：`ad/frontend/src/src/components/cognitive/DataVizRenderer.tsx`
- 会话与消息存储：`ad/frontend/src/src/lib/conversation-store.ts`
- Workflow task/run/result 基础：`ad/frontend/src/src/lib/workflow-task-store.ts`
- 管理后台配置 API：`ad/frontend/src/src/app/api/xiaoqiao/admin/*`

## 4. 半实现能力

- 路由：有规则与复合路由，但缺能力发现、权限和项目冲突强绑定。
- 能力发现：问数有，其他业务域没有统一能力注册。
- Trace：有 Chat trace 发送，未完全对齐连弩标准字段。
- 知识库/RAG：有配置和 fallback，个人 Key 与检索融合未产品化。
- 个人记忆：有 store，但固定用户 Key 与隔离需求冲突。
- Timeline：过程事件存在，但 UI 语义仍是“思维链”。
- 包交付/联调：有 debug automation 相关接口和 UI，但非完整包状态机。

## 5. Mock / 占位能力

| 能力 | 证据路径 | 说明 |
|---|---|---|
| 部分旧业务流程消息 | `ad/frontend/src/src/hooks/useConversation.ts` | 文件内有大量构造型 assistant message、thinking_steps、workflow_card，不能全部等同真实工具执行。 |
| 非问数 Chat fallback | `ad/frontend/src/src/app/api/chat/route.ts` | 非 report_query 时返回 fallbackAnswer，不是通用业务执行闭环。 |
| 部分可视化/流程卡 | `ad/frontend/src/src/components/cognitive/ChatContainer.tsx` | 组件能力存在，但部分数据来自 metadata/workflow_card，不一定来自真实后端服务。 |

## 6. 未实现能力

- 通用 `MessagePart` 类型与渲染优先级。
- 通用 `ResponseContract`。
- 项目显式提及与顶部项目冲突的强门禁。
- 跨项目问数逐项目权限校验。
- 个人知识库 Key 用户配置入口与完整同步状态。
- 包交付完整状态机：上报检查、后台更新检测、新包联调、旧包替代、失败 Case。
- Case 用户确认后创建与同 Case 更新机制。
- 资产与证据沉淀系统。该项此前用户明确要求先不做。
- 连弩评测平台用例拆分。用户已明确由连弩负责，小乔不做。

## 7. 设计冲突

| 冲突 | 风险 | 证据路径 | 处理建议 |
|---|---|---|---|
| 个人记忆固定 `user-001` | 高 | `ad/frontend/src/src/hooks/useConversation.ts` | 必须改为当前登录用户/知识库 Key 绑定，避免用户隔离后记忆串用。 |
| Timeline 仍叫“思维链” | 中 | `ad/frontend/src/src/components/cognitive/ChatContainer.tsx` | 改成“执行过程”，仅展示结构化事件。 |
| Chat 内保留大量硬编码业务流程 | 中 | `ad/frontend/src/src/hooks/useConversation.ts` | 第一批不大重构，但要避免新增假闭环。 |
| 项目 fallback 到 `current_project` | 高 | `ad/frontend/src/src/app/api/chat/route.ts`、`ad/frontend/src/src/lib/report-query-orchestrator.ts` | 用户显式提及项目时必须优先显式项目并校验权限。 |
| assistant-ui 曾进入计划又被撤回 | 中 | `ad/docs/implementation-v1/16-智投Chat架构收敛评估与计划调整建议.md`、`ad/docs/implementation-v1/17-第一批代码落地执行计划与文件边界.md` | 保持“不引入 assistant-ui”的禁令。 |

## 8. 代码存在但未接入主流程

- `intent-route-engine.ts` 有复合路由能力，但主 Chat 的 `/api/chat` 仍直接 `routeUserIntent`，需要核对复合路由在前端或后台管理中的真实接入点。
- `skill-contract-store.ts` 与 Skill API 存在，但问数主链路未先走 Skill Router。
- `personal-knowledge-config-store.ts` 存在，但 Chat 保存到个人知识库与用户配置 Key 的关系未闭环。
- `evaluation-adapter.ts`、`evaluation-runtime-runner.ts` 存在，但用户已明确评测用例拆分和闭环定义由连弩负责，小乔不应内建评测平台。

## 9. 第一批阻断项

进入第一批代码实施前，必须优先处理：

1. 项目解析与权限冲突。
2. 能力发现与 preflight 结果结构化。
3. 问数 MCP 真实调用失败、空结果、部分成功的状态分类。
4. MessagePart / ResponseContract 最小协议。
5. 前端四态展示与“思维链”文案收敛。
6. 不恢复 assistant-ui，不重构页面框架。


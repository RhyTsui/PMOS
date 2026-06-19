# 小乔智投代码全景 Review

生成时间：2026-05-26  
审计方式：只读扫描代码与既有实施文档，不修改业务代码，不生成图片。  
核心结论：当前仓库已经不是纯 Demo。系统具备会话页、对话存储、意图路由、MCP 管理与调用、问数执行、报表结果卡、数据可视化、Trace 配置与发送等基础能力。但能力成熟度不均衡，问数主链路最接近真实闭环；包交付、异常排查、资产沉淀、个人知识库隔离、Case 等仍有较多 UI 壳、流程计划或局部实现，不能按“已完成业务闭环”理解。

## 1. 当前真实系统架构

### 1.1 前端应用与页面层

| 模块 | 状态 | 证据路径 | 说明 |
|---|---|---|---|
| Next.js 主应用 | 已实现 | `ad/frontend/src/src/app/page.tsx` | 主工作台页面，承载 Chat、资产、附件、项目上下文、侧栏等入口。 |
| Chat 会话区 | 已实现 | `ad/frontend/src/src/components/cognitive/ChatContainer.tsx` | 负责消息气泡、执行过程、工具/来源条、结果卡、反馈、保存到个人知识库等渲染。 |
| Header | 已实现 | `ad/frontend/src/src/components/cognitive/Header.tsx` | 现有顶部区域独立存在，不应在第一批实施中替换。 |
| 输入区 | 已实现 | `ad/frontend/src/src/components/cognitive/InputArea.tsx` | 现有发送入口存在，第一批计划要求保持 send message API 不变。 |
| 资产预览 | 半实现 | `ad/frontend/src/src/components/cognitive/AssetPreview.tsx`、`ad/frontend/src/src/app/page.tsx` | 有资产入口与附件转资产逻辑，但“资产与证据沉淀系统设计”此前被用户要求暂缓，不应判定为完整资产闭环。 |
| 管理后台 | 已实现 | `ad/frontend/src/src/app/admin/page.tsx`、`ad/frontend/src/src/components/admin/*` | 包含用户、角色、MCP、Prompt、Trace、规则、报表模板等后台管理 Tab。 |
| 报表页 | 已实现 | `ad/frontend/src/src/app/reports/page.tsx` | 报表相关独立页面存在。 |

### 1.2 API 层

| API 类别 | 状态 | 证据路径 | 说明 |
|---|---|---|---|
| Chat SSE 主接口 | 半实现 | `ad/frontend/src/src/app/api/chat/route.ts` | 已接入问数主链路、WorkflowTask、MCP、Trace；非问数返回 fallback，未形成所有业务域通用 Runtime。 |
| 会话 API | 已实现 | `ad/frontend/src/src/app/api/xiaoqiao/conversations/route.ts`、`ad/frontend/src/src/app/api/xiaoqiao/conversations/[id]/messages/route.ts` | 支持会话与消息持久化。 |
| MCP 管理 API | 已实现 | `ad/frontend/src/src/app/api/xiaoqiao/admin/mcp-servers/route.ts`、`ad/frontend/src/src/app/api/xiaoqiao/admin/mcp-test/route.ts` | 支持 MCP 配置、测试、发现。 |
| Skill API | 半实现 | `ad/frontend/src/src/app/api/xiaoqiao/skills/route.ts`、`ad/frontend/src/src/app/api/xiaoqiao/skill-contracts/route.ts` | 有配置与契约管理，但主 Chat 调用链未完全按 Skill Contract 编排。 |
| 问数/报表策略 API | 已实现 | `ad/frontend/src/src/app/api/xiaoqiao/admin/report-query-policy/route.ts`、`ad/frontend/src/src/app/api/xiaoqiao/admin/report-capability-manifest/route.ts` | 可管理问数能力策略与能力清单。 |
| Trace API | 半实现 | `ad/frontend/src/src/app/api/xiaoqiao/admin/trace-config/route.ts`、`ad/frontend/src/src/app/api/chat/route.ts` | 有配置和发送逻辑，但字段最终仍应以连弩 SDK 文档为准。 |
| 自动联调 API | 半实现 | `ad/frontend/src/src/app/api/xiaoqiao/debug-automation/*` | 存在任务与 MCP observe/start/result 等接口；不等同于已完成包交付状态机。 |

### 1.3 Store / Service / Runtime 层

| 模块 | 状态 | 证据路径 | 说明 |
|---|---|---|---|
| 会话存储 | 已实现 | `ad/frontend/src/src/lib/conversation-store.ts` | 文件型/运行时会话存储能力存在。 |
| 会话 Hook | 半实现 | `ad/frontend/src/src/hooks/useConversation.ts` | 真实连接 `/api/chat` SSE，同时保留大量硬编码业务流程与旧 thinking_steps。 |
| 意图路由 | 半实现 | `ad/frontend/src/src/lib/intent-router.ts` | 基于规则、关键词、上下文的本地路由存在，但文本中存在硬编码表达，且部分中文编码显示异常。 |
| 复合路由引擎 | 半实现 | `ad/frontend/src/src/lib/intent-route-engine.ts` | 支持规则候选、LLM verdict、角色与工具可用性加权，但是否在主链路稳定使用需继续核对。 |
| 上下文编译 | 已实现 | `ad/frontend/src/src/lib/context-compiler.ts`、`ad/frontend/src/src/lib/conversation-context.ts` | 有用户、项目、偏好、角色、slot、业务上下文封装。 |
| MCP 发现与调用 | 已实现 | `ad/frontend/src/src/lib/mcp-discovery.ts` | 支持 streamable-http/SSE 初始化、tools/list、tools/call。 |
| MCP 服务存储 | 已实现 | `ad/frontend/src/src/lib/mcp-server-store.ts` | 支持 MCP server 配置管理。 |
| 问数编排器 | 已实现 | `ad/frontend/src/src/lib/report-query-orchestrator.ts` | 具备能力选择、preflight、字典解析、MCP 调用、结果解析、质量检查、空结果诊断。 |
| 报表回答生成 | 已实现 | `ad/frontend/src/src/lib/report-answer-composer.ts` | 将 `ReportQueryResult` 组织成回答文本。 |
| 受控术语归一 | 半实现 | `ad/frontend/src/src/lib/controlled-glossary-index.ts` | 问数中已调用 `normalizeQuestionWithGlossary`，但“从知识库同步轻量索引”的机制未在本次扫描中确认。 |
| 个人记忆 | 半实现 / 设计冲突 | `ad/frontend/src/src/lib/user-memory-store.ts`、`ad/frontend/src/src/hooks/useConversation.ts` | 有 memory store，但 `useConversation.ts` 中仍有 `MEMORY_USER_ID = 'user-001'` 的固定用户写法，与用户隔离需求冲突。 |
| 个人知识库配置 | 半实现 | `ad/frontend/src/src/lib/personal-knowledge-config-store.ts`、`ad/frontend/src/src/app/api/xiaoqiao/personal-knowledge/config/route.ts` | 有配置存储/API，但产品入口、用户配置 Key 与 RAG 价值闭环需继续落地。 |

### 1.4 MCP / Tool / Skill / Workflow 清单

| 能力 | 状态 | 证据路径 | 说明 |
|---|---|---|---|
| MCP tools/list | 已实现 | `ad/frontend/src/src/lib/mcp-discovery.ts` | `discoverMcpServer` 内执行 initialize、notifications/initialized、tools/list。 |
| MCP tools/call | 已实现 | `ad/frontend/src/src/lib/mcp-discovery.ts` | `callMcpTool` 执行 JSON-RPC `tools/call`。 |
| 问数 Tool 选择 | 已实现 | `ad/frontend/src/src/lib/report-query-orchestrator.ts`、`ad/frontend/src/src/lib/report-capability-manifest.ts` | 通过 manifest、policy、tool schema 选择报表工具。 |
| Skill 配置 | 半实现 | `ad/frontend/src/src/lib/skill-store.ts`、`ad/frontend/src/src/lib/skill-contract-store.ts` | 有 store 与后台 API，主链路未完全按“先 Skill Router 再 MCP”执行。 |
| Workflow task/run/result | 已实现 | `ad/frontend/src/src/lib/workflow-task-store.ts`、`ad/frontend/src/src/app/api/chat/route.ts` | 问数会创建 workflow task/run/result；其他业务域覆盖不完整。 |
| Debug automation workflow | 半实现 | `ad/frontend/src/src/lib/debug-automation-store.ts`、`ad/frontend/src/src/app/api/xiaoqiao/debug-automation/*` | 有任务 API 和 UI 展示，但包交付状态机与上报检查规则尚未整体闭环。 |

### 1.5 渲染与结果层

| 能力 | 状态 | 证据路径 | 说明 |
|---|---|---|---|
| AgentProcessEvent | 已实现 | `ad/frontend/src/src/types/index.ts`、`ad/frontend/src/src/lib/agent-runtime.ts` | 定义并支持从 SSE payload 转成过程事件。 |
| Timeline / Stepper | 半实现 | `ad/frontend/src/src/components/cognitive/ChatContainer.tsx` | 当前仍以 `ThinkingChain` 展示，标题仍有“思维链”，与目标“执行过程/Timeline”语义冲突。 |
| Tool Card | 半实现 | `ad/frontend/src/src/components/cognitive/ChatContainer.tsx` | `tool_calls`、`UnifiedEvidenceStrip`、能力条存在，但没有独立稳定的 ToolCallEnvelope/MessagePart 渲染协议。 |
| 数据可视化卡片 | 已实现 | `ad/frontend/src/src/components/cognitive/DataVizRenderer.tsx`、`ad/frontend/src/src/types/viz.ts` | 支持 AgGrid、ECharts、ReactFlow、Ant Design Plots。 |
| 问数结果卡 | 已实现 | `ad/frontend/src/src/components/cognitive/ReportQueryResultCard.tsx` | 支持 success/empty/failed/blocked、质量检查、下一步建议。 |
| 折叠卡片 | 半实现 | `ad/frontend/src/src/components/cognitive/ChatContainer.tsx` | 联调步骤流等局部折叠存在，不是统一 Card Renderer。 |
| MessagePart | 未实现 | `ad/docs/implementation-v1/16-智投Chat架构收敛评估与计划调整建议.md`、`ad/docs/implementation-v1/17-第一批代码落地执行计划与文件边界.md` | 计划文档定义了目标，但 `types/index.ts` 未见稳定 `MessagePart` 类型。 |
| Result Protocol | 半实现 | `ad/frontend/src/src/lib/report-query-orchestrator.ts`、`ad/frontend/src/src/app/api/chat/route.ts` | 问数已有 `ReportQueryResult`、`WorkflowResult`、metadata，但未抽象为通用 `ResponseContract/message_parts`。 |

## 2. 当前系统能力边界

### 已经具备的边界

- 可以从 Chat 发起自然语言问数，并进入 `/api/chat`。
- 可以基于路由判断进入 `report_query`。
- 可以读取 MCP 配置，发现/调用 MCP 工具。
- 可以做问数能力选择、字典筛选、preflight、MCP 调用、结果解析。
- 可以把问数结果渲染为文本、结果卡、表格、图表、质量检查和下一步建议。
- 可以配置 Trace，并在 `/api/chat` 内异步发送一次 Chat trace。

### 仍然不应宣称完成的边界

- 不能宣称已经有完整的多业务域 Agent Runtime。
- 不能宣称已经有完整 Skill Router。当前更像“配置存在 + 局部使用”。
- 不能宣称已完成 MessagePart Protocol。
- 不能宣称包交付、异常排查、Case、资产沉淀、个人知识库隔离已经端到端闭环。
- 不能宣称项目权限冲突已经完全解决。当前 `buildReportQueryInput` 仍有 `current_project` fallback，项目显式提及与顶部项目冲突的强校验还需要实施。

## 3. 当前方向判断

当前代码方向基本符合“Thin Chat Runtime + Fat MCP/Fat Skill”的目标，但实现仍混杂：

- Thin Chat Runtime 的雏形在 `/api/chat`、`intent-router.ts`、`report-query-orchestrator.ts` 中已经出现。
- Fat MCP 的真实调用基础在 `mcp-discovery.ts` 中成立。
- Fat Skill 还没有形成稳定主链路，更多是管理配置和设计计划。
- 前端目前过厚，`ChatContainer.tsx` 同时承担消息渲染、过程渲染、业务卡片、保存知识库、反馈、分享等职责。
- 问数链路是最适合优先打磨成第一个最低闭环的模块。


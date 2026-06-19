# 已实施代码全景图 image2 提示词

用途：后续用于生成《已实施代码全景图》。  
注意：本文只提供 image2 提示词，不生成图片。

## 1. image2 提示词

请生成一张 4K 高清横向企业级架构全景图，标题为《小乔智投 Chat 已实施代码全景图》。  
图风格：中文清晰可读，专业 B 端产品架构图，类似 Figma / 企业内部架构评审图，白底，克制科技感，大面积留白，清晰分层，不要营销海报，不要卡通，不要 AI 艺术风，不要复杂插画。

请按从左到右的数据流绘制：

1. 用户与入口层
   - 用户自然语言输入
   - 顶部项目选择器
   - 会话历史
   - 附件/资产入口

2. 前端工作台层
   - `app/page.tsx` 主工作台，标记为绿色“已实现”
   - `ChatContainer.tsx` 会话区，标记为黄色“半实现：渲染能力强但职责过重”
   - `InputArea.tsx` 输入区，绿色“已实现”
   - `Header.tsx`、Sidebar、Workspace、Drawer，绿色“已实现，禁止第一批重构”
   - `ReportQueryResultCard.tsx` 问数结果卡，绿色“已实现”
   - `DataVizRenderer.tsx` 数据可视化，绿色“已实现”
   - `ThinkingChain` / thinking_steps，黄色并加风险标注“语义需改为执行过程”

3. 会话状态与存储层
   - `useConversation.ts`，黄色“半实现：连接真实 SSE，但保留硬编码流程与固定记忆用户”
   - `conversation-store.ts`，绿色“已实现”
   - `workflow-task-store.ts`，绿色“已实现”
   - `user-memory-store.ts`，黄色“半实现”
   - `personal-knowledge-config-store.ts`，黄色“半实现”

4. 路由与上下文层
   - `intent-router.ts`，黄色“半实现：规则路由存在”
   - `intent-route-engine.ts`，黄色“半实现：复合路由存在但主流程接入需核对”
   - `context-compiler.ts`，绿色“已实现”
   - `conversation-context.ts`，绿色“已实现”
   - `slot-resolver.ts`，绿色“已实现”
   - 项目权限冲突处理，红色“未完成强门禁”

5. 问数执行层
   - `report-query-orchestrator.ts`，绿色“已实现：问数主链路核心”
   - `report-capability-manifest.ts`，绿色“已实现”
   - `report-query-policy-store.ts`，绿色“已实现”
   - `controlled-glossary-index.ts`，黄色“半实现：索引存在，同步机制需补”
   - `report-answer-composer.ts`，绿色“已实现”

6. MCP / Tool / Skill 层
   - `mcp-discovery.ts`，绿色“已实现：initialize、tools/list、tools/call”
   - `mcp-server-store.ts`，绿色“已实现”
   - `skill-store.ts`，黄色“半实现”
   - `skill-contract-store.ts`，黄色“代码存在但未完全接入主流程”
   - 报表 MCP / 字典 MCP，绿色“已接入问数链路”
   - 其他业务 MCP，灰色“不确定，需要人工确认”

7. 后台 API 层
   - `/api/chat`，黄色“半实现：问数真实，其他意图 fallback”
   - `/api/xiaoqiao/conversations/*`，绿色“已实现”
   - `/api/xiaoqiao/admin/mcp-servers/*`，绿色“已实现”
   - `/api/xiaoqiao/admin/report-query-policy`，绿色“已实现”
   - `/api/xiaoqiao/debug-automation/*`，黄色“半实现”
   - `/api/xiaoqiao/personal-knowledge/config`，黄色“半实现”

8. Trace / Evaluation 层
   - `trace.ts`、`trace-config-store.ts`，黄色“半实现”
   - `/api/chat` 内 trace 发送，黄色“半实现：以连弩 SDK 为准”
   - 连弩评测平台，灰色“外部系统，小乔不内建”

9. 结果展示层
   - `AgentProcessEvent`，绿色“已实现”
   - `WorkflowResult`，绿色“已实现”
   - `ReportQueryResult`，绿色“已实现”
   - `MessagePart`，红色“未实现”
   - `ResponseContract`，红色“未实现”

请用箭头表达主数据流：
用户输入 -> useConversation -> `/api/chat` -> intent-router/context-compiler -> report-query-orchestrator -> mcp-discovery -> Report MCP -> ReportQueryResult -> ChatContainer -> ReportQueryResultCard/DataVizRenderer。

请额外画出风险虚线：
- 项目权限冲突风险：从顶部项目选择器、用户显式项目、MCP 入参之间画红色虚线。
- 假闭环风险：从硬编码流程消息指向前端展示层。
- 记忆隔离风险：从 `MEMORY_USER_ID = user-001` 指向个人记忆。
- 协议缺口风险：从 ReportQueryResult 指向 MessagePart/ResponseContract 红色节点。

## 2. 图中结构说明

这张图展示当前代码真实实现，而不是目标架构。必须把“代码存在但未接入主流程”单独标出，避免把后台配置能力误读为业务闭环。

重点突出：

- 问数链路是真实执行链路。
- MCP 调用基础已经存在。
- 前端展示能力强，但渲染协议不统一。
- Skill、个人知识库、包交付、异常排查、资产沉淀不是完整闭环。

## 3. 图例定义

- 实线箭头：当前已接入主流程的数据流。
- 虚线箭头：代码存在或计划存在，但接入不完整。
- 红色警示线：当前会导致假闭环、权限错误或协议断层的风险。
- 模块右下角小标签：写明证据文件名。

## 4. 节点颜色规则

- 绿色：已实现，可在当前代码中找到主流程证据。
- 黄色：半实现，有局部能力但未完成闭环。
- 蓝色：Mock / 占位 / 配置壳。
- 红色：未实现或当前阻断项。
- 灰色：不确定，需要人工确认。

## 5. 重点风险区域

1. 项目权限风险：用户显式项目与顶部项目冲突时，当前仍需补强有效项目解析。
2. 结果协议风险：`MessagePart` 与 `ResponseContract` 未落地。
3. 前端过厚风险：`ChatContainer.tsx` 承担过多业务渲染职责。
4. 假闭环风险：`useConversation.ts` 中存在硬编码业务流程消息。
5. 个人记忆隔离风险：固定 `user-001` 与用户隔离目标冲突。
6. Skill Router 风险：Skill 配置存在，但主链路未形成稳定路由。


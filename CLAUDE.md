# PMAIOS Shared Tool Context

Claude must treat this repository as a shared workspace with Codex.

Before starting or resuming substantive work:

1. Read `docs/memory/mcp-context/session-state.json` when it exists.
2. Read recent events with `npm run cli -- mcp-context events 20`.
3. Read active tasks with `npm run cli -- mcp-context tasks --status in_progress`.

During work:

- Record task starts with `npm run cli -- mcp-context task-start "<label>" --tool claude`.
- Record important decisions with `npm run cli -- mcp-context checkpoint "<label>" --tool claude`.
- Mark completed shared tasks with `npm run cli -- mcp-context task-complete <taskId> --tool claude`.

If switching between Claude and Codex, use the shared `mcp-context` commands as the handoff source of truth. Do not rely only on the hidden conversation context of either CLI.

## 小乔智投工程实施协作规范补充：反局部收敛与未上线能力闭环

本仓库 `subprojects/ad`（小乔智投）当前处于**未上线、待能力闭环**阶段。在该阶段，不得采用"只修局部点""先最小化改动""其余问题后续再说"的默认策略。

### 核心约束（适用于所有 agent）

1. **禁止自主忽略用户诉求**：用户显式列出的每一项问题都必须进入任务清单。禁止标注"本轮先不处理"但没有用户确认，禁止只处理模型认为最关键的一项。
2. **禁止只完成局部**：系统性治理必须覆盖设计文档、运行链路、数据契约、代码实现、trace、UI 展示、单测、浏览器 E2E、回滚策略。
3. **禁止修了但没生效**：每个改动都必须证明进入真实链路——被 import、被运行时调用、未被 feature flag 挡住、有 trace 证明生效、有浏览器 E2E 证明用户可见结果变化。
4. **禁止靠隐藏警告伪装修复**：不允许隐藏 warning、删除 UI 展示但不修链路、跳过 preflight/resolver、强行 fallback 成通用回答、把 missing_input 改成 success。

### 工作方式要求

- 每轮任务必须输出完整任务清单（用户列多少项就列多少项，不允许合并遗漏）
- 复杂问题必须先输出链路图或数据流
- 涉及架构/主链/数据契约/能力发现/LLM 调用点/mcp-agent/FastMCP/UI/trace 的任务必须同步更新文档
- 每轮完成后必须提供：单元测试、关键链路 dump、浏览器真实 E2E、traceId、未修问题清单、下一步阻塞清单

### 问数主链专项红线

| 区域 | 允许 | 禁止 |
|------|------|------|
| QueryContract | Canonical QueryContract 是唯一结构化输入，parsedFilters 是 filter clause 唯一真源 | 下游不得重新从 raw message 抽实体/能力/工具/参数，entityHints 不允许包含字段名或筛选说明 |
| 能力发现 | 只消费 QueryContract / ToolContract / Registry | 不允许重新解析 raw message，不允许并行映射 |
| Entity/Enum 分流 | identifierFields 与 enumFilterFields 必须分离，enumFilterFields 从 tool input_schema.enum 校验 | 不允许 enumFilterField 走 ID resolver |
| mcp-agent | QueryContract Review、Capability Candidate Provider、Multi-tool Plan Candidate、Parameter Assist、Failure Replan | 不允许直接 selectedTool / final_tool_arguments / 执行工具 / 绕过 Decision Merge / 绕过 Resolver |
| FastMCP | tools/list → Internal ToolContract、input_schema.enum → enumFilterFields、tool call result → Internal ToolResult | 不允许自建独立注册中心、自己决定工具、做意图识别、绕过 Unified Registry / Preflight |

### LLM 调用点有效性要求

每个 LLM 调用点必须记录和验证其输入 schema、输出 schema、Prompt 版本、模型选择、调用频率、失败策略、trace 证据。

### 验收策略

当前阶段以"上线能力闭环"为目标验收。E2E 不通过不允许宣称完成。不允许收敛用户已提出的问题、业务目标、链路闭环、E2E 验收、文档更新、trace 可观测性、已暴露的系统性漏洞。

详细完整规范见：`docs/sources/inbox/小乔智投工程实施协作规范补充.docx`

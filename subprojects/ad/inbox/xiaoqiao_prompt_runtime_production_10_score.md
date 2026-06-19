# 小乔提示词运行时生产化 10 分评估

日期：2026-05-27

## 结论

当前评分：4.2 / 10。

后端已经具备“后台提示词配置进入 chat 链路”的基础，`/api/chat` 也已经读取 `route_prompt`、`response_prompt`、`summary_prompt`、`evidence_prompt`、`card_prompt`、`followup_prompt`、`tool_explain_prompt` 这 7 类运行时提示词。但距离生产态还差一层关键治理：提示词库存仍有重复与短文本，问数没有专门提示词，前端展示仍混有执行过程和重复卡片，证据入口可发现性不足，LLM 输出和 UI 展示之间的语义层还没有被稳定固化。

这不是“再加几条提示词”能解决的问题。目标应是建立 Prompt Runtime + Answer Policy + Runtime Presentation 的完整闭环：后台管提示词，后端生成语义结果，前端只展示面向用户的正文、业务摘要和下一步动作，证据与执行细节进入可控入口。

## 依据

- 运行时提示词源：`.runtime/zhitou-chat/prompt-configs.json`
- 当前提示词导出：`docs/audit/current-prompts-export-2026-05-27.md`
- chat 运行链路：`frontend/src/src/app/api/chat/route.ts`
- 提示词读取：`frontend/src/src/lib/prompt-store.ts`
- 问数回答组合：`frontend/src/src/lib/report-answer-composer.ts`
- 会话展示：`frontend/src/src/components/cognitive/ChatContainer.tsx`
- 右侧详情面板：`frontend/src/src/app/page.tsx`

## 当前库存事实

| 项 | 当前状态 |
| --- | --- |
| 提示词总数 | 23 |
| active 提示词 | 21 |
| disabled / draft | 2，均为 `debugging` |
| active 重复 scope | 4 类：`routing`、`help`、`diagnosis`、`demand` |
| 运行时分层提示词 | 7 类已存在 |
| 专门问数提示词 | 未发现 `report_query` 或“问数”专属提示词 |
| 短提示词风险 | 20 条正文少于 80 字 |

重复 scope 明细：

| scope | active 提示词 |
| --- | --- |
| routing | `prompt_001`、`prompt-001`、`intent-route-debugging-terms` |
| help | `prompt_002`、`prompt-002` |
| diagnosis | `prompt_003`、`prompt-003` |
| demand | `prompt_004`、`prompt-004` |

## 分项评分

| 维度 | 分数 | 说明 |
| --- | ---: | --- |
| 提示词库存治理 | 3 / 10 | 已有后台源，但 active 重复仍存在，缺少归档、冲突检测和版本准入。 |
| 运行时绑定正确性 | 5 / 10 | chat 链路已读取 7 类运行时提示词，但还需要验证精确命中、fallback 边界和实际生效证据。 |
| 提示词内容质量 | 2 / 10 | 多数新增提示词只有一句话，难以稳定约束摘要、证据、卡片和下一步动作。 |
| 业务流程覆盖 | 5 / 10 | 覆盖帮助、诊断、需求、联调、交付、推荐、标题等核心流，但重复和 draft 状态会降低确定性。 |
| 问数能力覆盖 | 2 / 10 | 没有专门问数提示词，问数结果展示仍更多依赖 composer 和卡片逻辑。 |
| Answer Policy 层 | 4 / 10 | 已有 `summary`、`diagnostics`、`evidence`、`prompt_config` 雏形，但还没有统一的展示策略契约。 |
| Runtime State 层 | 5 / 10 | 已有运行状态字段方向，但前端轻量状态栏、阶段语义和降级提示还需要固化。 |
| 证据与执行详情体验 | 4 / 10 | 主对话已尝试减少过程信息，但右侧详情默认不展开且入口偏隐蔽。 |
| 管理中心可运营性 | 5 / 10 | 管理中心能看到真实提示词，但缺少冲突、短文本、覆盖范围和生产评分提示。 |
| 验证与观测 | 4 / 10 | 有 trace / prompt_config 方向，但缺少问数、摘要、证据、降级的自动化验收用例。 |

## 主要问题

1. 提示词有冲突源。

   `routing` 同时存在 3 条 active，`help`、`diagnosis`、`demand` 各有 2 条 active。只要匹配逻辑不是严格按 id 或 scope 唯一命中，就可能出现“后台改了但运行时没按预期生效”的问题。

2. 缺少专门问数提示词。

   当前核心服务都有一定提示词覆盖，但用户反馈最明显的问题集中在问数：结果说明重复、来源时间单独展示、查询条件暴露项目 id、数据预览没有表格或图表、结果卡片冗余。这里需要专门的 `report_query` 提示词族，而不是让通用 `response_prompt` 承担全部约束。

3. 新增提示词太短，不能承担生产约束。

   7 个运行时分层提示词方向是对的，但内容基本是一句话。生产态至少需要约束输入、输出结构、禁止项、降级策略、证据可见性、低置信度处理、业务口径和 UI 渲染边界。

4. LLM 输出和 UI 展示仍然耦合。

   LLM 可以生成正文、摘要、证据和动作建议，但前端不能直接把所有中间字段展示给用户。需要中间语义层把 `execution_context`、`evidence_bundle`、`agent_runtime`、`reasoning_artifacts` 分清楚，主对话只消费面向用户的结果。

5. 证据入口可发现性不足。

   如果已禁止默认展开侧边栏，同时会话区也没有稳定、显性的“查看来源 / 查看执行详情”入口，用户会看不到证据和工具调用来源。证据不应默认占主对话，但必须可发现。

6. 项目上下文需要继续隐藏化验收。

   项目 ID / APPID 应作为 metadata 或 `execution_context` 传递，不能进入用户消息正文，也不应出现在默认答案、查询条件卡片或结果说明里。

## 目标架构

### 1. Prompt Runtime Layer

后台提示词不只保存文本，还要形成可治理的运行时配置。

建议分层：

| 层 | 作用 | 示例 scope |
| --- | --- | --- |
| Route Prompt | 判断意图、工具、工作流 | `route_prompt` |
| Domain Prompt | 业务领域专属约束 | `report_query`、`diagnosis`、`demand` |
| Response Prompt | 正文回答风格和边界 | `response_prompt` |
| Summary Prompt | 业务摘要对象 | `summary_prompt` |
| Evidence Prompt | 来源与证据组织 | `evidence_prompt` |
| Card Prompt | 卡片语义，不直接决定 UI | `card_prompt` |
| Followup Prompt | 追问和下一步建议 | `followup_prompt` |
| Tool Explain Prompt | 工具调用解释，进入详情 | `tool_explain_prompt` |

### 2. Answer Policy Layer

建议引入明确的回答展示策略对象：

```json
{
  "verbosity": "concise",
  "evidence_visibility": "on_demand",
  "reasoning_visibility": "internal",
  "diagnostics_visibility": "execution_detail",
  "confidence_policy": "show_when_low",
  "fallback_strategy": "soft_degrade"
}
```

主对话默认只展示：

- 正文回答
- `summary`
- `next_actions`
- 必要的数据表格或图表

不默认展示：

- 已识别条件
- 参数说明
- 项目 ID / APPID
- 原始工具参数
- 原始返回 payload
- 重复的数据查询结果卡片

### 3. Business Summary Layer

`summary` 不应只是截断字符串，建议固定为业务摘要对象：

```json
{
  "title": "",
  "brief": "",
  "severity": "normal",
  "confidence": 0.82,
  "business_impact": ""
}
```

### 4. AI Action Layer

`next_actions` 应可进入自动执行系统：

```json
[
  {
    "label": "",
    "type": "investigate",
    "intent": "",
    "action": "",
    "risk_level": "low",
    "auto_executable": false
  }
]
```

### 5. Runtime State Layer

轻量展示 AI 工作状态，不暴露内部 trace：

```json
{
  "current_stage": "analysis",
  "completed_stages": ["understanding", "context_loading", "data_fetching"],
  "status": "running",
  "started_at": "",
  "duration_ms": 0
}
```

推荐阶段：

- `understanding`
- `context_loading`
- `data_fetching`
- `analysis`
- `diagnosis`
- `knowledge_lookup`
- `recommendation`
- `response_generation`

## 待办

### P0：先让生产链路确定、少错、可验收

- 清理 active 重复提示词：每个 scope 只保留一个生产版本，其余改为 archived 或 disabled，并保留迁移说明。
- 增加问数专属提示词族：`report_query_route_prompt`、`report_query_answer_prompt`、`report_query_summary_prompt`、`report_query_visual_prompt`、`report_query_evidence_prompt`。
- 将问数链路接入专属提示词：覆盖 `/api/chat` 的 report query 分支和 `report-answer-composer`。
- 禁止主对话展示项目 ID / APPID：只允许进入 metadata、`execution_context` 或执行详情。
- 禁止主对话展示“已识别条件”“参数说明”“已取回 N 行数据”等过程说明；这些进入执行详情。
- 问数数据预览统一成表格或图表语义，不再重复渲染多个查询结果卡片。
- 在主回答卡片增加稳定入口：`查看来源`、`查看执行详情`，点击后打开右侧面板。
- 收紧 `getActivePromptContent` 命中规则：运行时分层提示词优先精确 scope/id，避免被旧业务提示词 fallback 覆盖。
- 在 trace / 执行详情展示 effective prompt id、version、scope、fallback 原因和命中路径。

### P1：提升可运营性和提示词质量

- 管理中心增加提示词健康标识：重复 scope、短文本、未绑定工作流、draft、disabled、缺少版本说明。
- 为 7 个运行时分层提示词补齐生产模板：角色、输入、输出、禁止项、降级策略、证据策略、UI 边界。
- 增加 Answer Policy 配置项，并允许按工作流覆盖默认策略。
- 增加 Runtime State 的前端轻状态栏：只显示当前阶段、完成阶段和温和降级提示。
- 为知识库失败建立统一降级文案：用户正文只说“知识库暂不可用，已继续用可用信息回答”，细节进入执行详情。
- 建立问数验收用例：项目 ID 不外显、查询条件不进主对话、数据表格可读、卡片不重复、来源可打开。

### P2：形成长期治理

- 增加提示词评分面板：覆盖率、冲突率、短文本率、最近变更、线上命中量。
- 增加提示词回滚和灰度能力：按项目、用户、工作流或百分比启用。
- 建立 Prompt Eval 数据集：路由、问数、诊断、需求、联调、知识库降级、低置信度。
- 将 `next_actions` 接入动作审批和自动执行系统，按风险等级决定是否需要确认。
- 建立语义结果契约版本：避免前后端字段随意变化导致 UI 回退到硬编码展示。

## 验收标准

达到 8 分生产态前，至少满足：

- 管理中心没有 active 重复 scope。
- 问数有专属提示词，并能在执行详情看到实际命中的 prompt id 和 version。
- 主对话不显示项目 ID / APPID、原始查询条件、参数说明、工具 arguments。
- 问数结果默认只有正文、业务摘要、表格或图表、下一步动作。
- 来源、知识库状态、HTTP 状态、工具入参和原始 payload 可在右侧详情查看。
- 右侧详情不默认打扰用户，但主对话存在明确入口。
- 知识库失败时主对话温和降级，详细失败原因进入 trace / 执行详情。
- 自动化验收覆盖问数展示、提示词命中、知识库降级、项目上下文隐藏化。

## 建议优先级

第一阶段先处理 P0，目标从 4.2 分提升到 6.5 分：清重复、补问数提示词、隐藏项目上下文、压缩主对话展示、补证据入口。

第二阶段处理 P1，目标到 8 分：管理中心可治理、提示词模板生产化、Answer Policy 和 Runtime State 稳定落地。

第三阶段处理 P2，目标到 9 分以上：评测、灰度、回滚、动作执行和语义契约版本化。

## 实施核查记录

核查时间：2026-05-27

已对照外部文档 `E:\AI\ai-os\docs\sources\inbox\提示词管理体系生产化”.txt` 做真实检查。

本轮已完成：

- 旧 demo prompt 已从 active 池移出：`prompt_001`、`prompt-001`、`prompt_002`、`prompt-002`、`prompt_003`、`prompt-003`、`prompt_004`、`prompt-004`、`prompt_005`、`prompt-005` 已归档或禁用。
- `intent-route-debugging-terms` 已从通用 `routing` scope 移出，避免继续制造路由 active 冲突。
- 已补齐生产级 prompt key：`core.*`、`route.*`、`chat.*`、`report_query.*`、`help.answer`、`diagnosis.answer`、`demand.answer`、`debugging.answer`、`delivery.answer`、`clarification.question`。
- 已新增问数专属语义层 `ReportQueryViewModel`，把主回答、summary、insights、visualizations、next_actions、evidence_bundle 分层。
- `/api/chat` 问数 done payload 已包含 `report_query_view_model`、`business_summary`、`runtime_state`、`answer_policy`、`prompt_config`、`evidence_bundle`、`execution_context`。
- 主对话问数展示已避免直接消费 raw tool result，语义层结果优先展示业务正文、摘要、表格/图表和动作。
- 问数结果卡片已隐藏工具名、来源时间、行列数、指标/维度 pill 等过程信息，数据预览改为表格。
- 语义结果卡片已补 `查看来源`、`查看执行详情` 入口，点击打开右侧详情。
- 已新增只读健康检查 API：`/api/xiaoqiao/admin/prompts/health`。

真实检查结果：

| 检查项 | 结果 |
| --- | --- |
| runtime prompt 总数 | 54 |
| active prompt | 44 |
| archived prompt | 10 |
| disabled prompt | 10 |
| duplicate active scope | 0 |
| missing required prompt | 0 |
| report_query prompt suite complete | true |
| `npm run ts-check` | passed |
| 主链路风险文案检索 | 未命中 `已取回`、`本次取数`、`查询条件`、`结构化结果`、`数据已返回`、`明细已整理`、`datatype`、`report manifest` |

仍需后续增强：

- 管理中心提示词页已新增 Prompt Health 卡片，展示重复生效、缺失必需、问数套件完整性和归档数量。
- 右侧详情已改为 Tab：来源、执行详情、工具调用、原始返回、字段说明。
- Prompt Registry 的 `key / role / output_schema / visibility / priority / variables` 已进入类型定义、store schema、normalize 逻辑和当前 runtime 数据。
- `ReportQueryViewModel` 已落地基础版，异常识别仍是轻量统计逻辑，后续可接入更强的异常检测和字段字典。

二次核查结果：

| 检查项 | 结果 |
| --- | --- |
| Prompt Registry 必需字段缺失 | 0 |
| duplicate active scope | 0 |
| duplicate workflow + role | 0 |
| 主链路风险文案检索 | 未命中 |
| `npm run ts-check` | passed |

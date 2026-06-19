# P1 Route Governance Design

## 目标

P1 路由治理的目标是把 P0/P0.5 的止血逻辑收口为一套可治理、可观测、可回归、可扩展的通用 Chat 路由架构。本阶段不继续通过样例补丁修复路由问题，也不重启一套路由系统。

核心边界：

- 后端只输出一个权威 `RouteDecisionContract`。
- 前端 `body.intent`、Prompt、route rules、domain config、metric catalog、skill contract、capability manifest 都只能作为证据、提示或范围约束。
- 通用 Chat 的 Top Intent 只判断用户最终交付物，不按业务词、媒体词、指标词判断。
- 业务域只输出 `domainSignals`、实体、指标、能力范围和工具候选，不覆盖 `serviceIntent`。
- `needTool=true` 不等于 `report_query`，工具目的必须由 `toolPurpose` 表达。
- ResponseContract、旧字段兼容、MCP tool schema 和已稳定服务保持不变。

## 目标链路

```text
User Input
  -> Client Hint
  -> Context Compiler
  -> Backend RouteDecision Resolver
  -> Domain Signal Resolver
  -> ServiceIntent Resolver
  -> Skill Selector
  -> Capability Preflight
  -> Tool Planner
  -> MCP / Workflow Execution
  -> ResponseContract
  -> Renderer
```

## 分层职责

| 层级 | 职责 | 不允许做的事 |
|---|---|---|
| Client Hint | 提供前端初判和交互上下文 | 不得决定最终路由 |
| Context Compiler | 编译项目、用户、会话、附件、历史上下文 | 不得做最终 intent 判定 |
| RouteDecision Resolver | 生成后端权威路由结果 | 不得硬编码业务域词 |
| Domain Signal Resolver | 输出业务域、实体、指标、渠道、包体等信号 | 不得覆盖 `serviceIntent` |
| ServiceIntent Resolver | 判断用户最终交付物 | 不得被 domain signal 直接覆盖 |
| Skill Selector | 根据 `serviceIntent + domainSignals` 选择技能 | 不得无条件给某个业务 skill 加分 |
| Capability Preflight | 判断候选能力是否可执行 | 不得把 candidate 当 executable |
| Tool Planner | 生成工具执行计划 | 不得绕过 `serviceIntent` |
| MCP / Workflow Execution | 执行工具或工作流 | 不得修改主路由 |
| ResponseContract | 统一结果协议 | 不参与路由决策 |
| Renderer | 展示结果 | 不参与路由决策 |

## 权威 RouteDecision

`RouteDecisionContract` 是 P1 的唯一权威路由契约。它不替换 P0/P0.5 已有运行时实现，而是作为后续 P1-B 只读观测和 P1-D 权威接管的共同边界。

关键语义：

- `serviceIntent`：通用 Chat 顶层任务类型，只表达用户最终要什么。
- `primaryDeliverable`：最终交付物，避免业务词抢走路由。
- `domainSignals`：业务域证据，必须 `evidenceOnly=true`，不得覆盖 `serviceIntent`。
- `decisionAuthority`：说明各输入来源的权限，只有后端权威结果是 `authoritative`。
- `skillSelection`：技能候选和 readiness，不覆盖 `serviceIntent`。
- `capabilityDecision`：区分 candidate 和 executable，只有 executable 存在时才允许进入工具调用。
- `toolPurpose`：表达工具调用目的，例如数据查询、证据获取、配置检查、联调执行。
- `isReportQuery`：只能由后端权威 RouteDecision 推导，不能由 client hint、Prompt 或 domain signal 单独触发。

## ServiceIntent 边界

允许的通用顶层意图：

- `general_chat`：普通对话。
- `help_qa`：帮助说明、能力咨询、字段解释、配置说明。
- `light_requirement`：需求、方案、PRD、文档、草稿等交付物撰写。
- `issue_diagnosis`：原因定位、异常排查、对不上、没数、下降等诊断结论。
- `system_operation`：获取包、发起联调、执行检查、创建任务、修改配置等系统操作结果。
- `data_query`：取数、趋势、对比、排名、拼表、导出、按模板取数等数据结果。
- `report_delivery`：日报、周报、月报、报表生成、订阅和调度。

冲突优先级：

1. 显式交付物撰写优先进入 `light_requirement`。
2. 帮助说明优先进入 `help_qa`。
3. 原因诊断优先进入 `issue_diagnosis`。
4. 系统执行优先进入 `system_operation`。
5. 报告交付优先于普通问数，进入 `report_delivery`。
6. 明确数据结果进入 `data_query`。
7. 无法明确时进入 `general_chat`，不得默认进入 report query。

## 配置治理边界

P1 不在通用路由层继续新增业务词、媒体词、指标词、项目词、包体词或具体编号。业务信息应逐步迁入以下治理面：

- Domain Config：业务域信号、实体、业务对象、渠道、包体、workflow scope。
- Metric Catalog：指标口径、别名、单位、formatter、报表域。
- Report Query Policy：问数组合证据、fallback 策略、tool purpose mapping。
- Skill Contract：支持的 `serviceIntent`、domain scope、selection policy、tool scopes、required inputs。
- Route Rules Runtime Config：active version、precedence、priority、rollout、conflict check。
- Prompt Runtime：active prompt、version、source、seed fallback、cache、content hash、conflict warnings。

Prompt 只允许作为 `decision_support` 或 `evidence_only`。如果 Prompt 出现“默认问数”“默认报表”“不确定查表”等强引导，只记录 conflict，不覆盖权威 RouteDecision。

## 分阶段实施

### P1-A：文档与接口契约

只输出文档和类型契约，不改变主链行为。

允许：

- 新增或更新架构文档。
- 新增 type-only 契约。
- 新增 route golden 规格文档。

禁止：

- 修改主路由行为。
- 修改 MCP tool schema。
- 修改 ResponseContract 兼容字段。
- 修改 active Prompt 配置。
- 接入新的 route engine 主链。

### P1-B：只读观测接入

旁路生成 P1 RouteDecision metadata，与当前实际执行结果对比。如不一致，只记录 warning，不改变行为。

输出重点：

- `metadata.routing_decision`
- `metadata.domain_signals`
- `metadata.prompt_runtime`
- `metadata.capability_decision`
- `metadata.skill_selection`

### P1-C：后台规则治理

治理 route rules、Prompt、domain config、skill contract 的版本、状态、优先级和冲突检测。

### P1-D：权威接管

在 P1-B 观测期和 P1-C 治理上线后，后端权威 RouteDecision 才能正式成为工具链判断源，并通过 feature switch 灰度。

## 回滚

- P1-A 只改文档和类型契约，可直接回滚提交。
- P1-B 必须通过 feature switch 关闭旁路观测。
- P1-C 可回滚到旧 runtime config。
- P1-D 必须以 route golden 作为回滚验收基线。

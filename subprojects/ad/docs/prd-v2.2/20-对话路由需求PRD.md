# 对话路由需求 PRD

## 1. 需求背景

小乔智投的入口是自由对话。用户不会先选择 Agent、Workflow、Skill 或 MCP，而是直接用自然语言表达诉求，例如：

- “帮我看下这个包能不能投。”
- “昨天 ROI 为什么掉了？”
- “这个数据不对。”
- “ROI 怎么算？”
- “给我查一下最近 7 天消耗。”
- “帮我把这个报表每天发一下。”
- “今天天气怎么样？”

因此，对话路由是小乔智投的第一层核心能力。它决定系统是否能从自由表达进入正确业务闭环。

当前系统已经有 `intent-router`、`intent-route-rules`、`context-compiler`、`slot-resolver` 和 `prompt-store`，但真实执行主要集中在 `report_query`。其它意图存在“能识别、能展示，但不一定能真实执行”的风险。

本 PRD 的目标是把对话路由从“意图判断”升级为“可执行服务分发中枢”。

## 2. 需求目标

对话路由必须做到：

1. 判断用户是否在业务域内。
2. 判断用户具体意图。
3. 识别内部术语、简称和歧义表达。
4. 判断系统是否有真实能力承接。
5. 在能力可执行前提下补齐必要信息。
6. 在信息不足时追问最少问题。
7. 调用正确 Workflow / Skill / MCP。
8. 能解析执行结果并生成下一步建议。
9. 不能执行时不假装完成，而是进入失败闭环。
10. 全链路记录 Trace、Evidence 和评测样本。

一句话目标：

> 对话路由不是把用户分给某个 Agent，而是把用户诉求路由到一个可验证、可执行、可追踪的服务闭环。

## 3. 用户需求

### 3.1 用户希望自由表达

用户不想先理解系统能力，也不想先选择入口。他只希望直接说出问题。

需求：

- 支持自然语言表达。
- 支持模糊表达。
- 支持内部简称。
- 支持多轮上下文。
- 支持当前项目、历史项目、跨项目上下文。

### 3.2 用户希望系统少问废话

用户能接受必要追问，但不能接受系统反复询问已知信息。

需求：

- 能从当前项目、历史会话、个人记忆和页面上下文继承信息。
- 只追问影响路由或执行的关键字段。
- 能力未接入时不继续追问执行字段。

### 3.3 用户希望结果真实

用户不需要一个“像完成了”的回答，而是需要真实查数、真实包状态、真实联调、真实口径、真实证据。

需求：

- 路由必须检查能力注册。
- 没有真实能力时不能输出完成口吻。
- 所有业务结论必须带来源和证据。

## 4. 产品范围

### 4.1 一期 P0 意图

一期 P0 对话路由必须支持：

| 意图 | intent_key | 是否执行闭环 | 承接能力 |
|---|---|---|---|
| 数据查询 | `report_query` | 是 | 数据查询 Skill / 报表 Workflow |
| 定时报表 | `scheduled_report` | 是 | 定时报表 Workflow |
| 包交付状态 | `package_delivery` / `get_delivery_packages` | 是 | 包交付 Workflow |
| 指标解释 | `metric_explanation` / `help` | 轻闭环 | 指标口径 Skill / 知识库 |
| 异常排查 | `diagnosis` | 轻闭环 | 异常诊断 Workflow / Skill |
| 需求沟通 | `demand` | 轻闭环 | 需求结构化 Skill / Case |
| 通用问答 | `general` | 非业务闭环 | 大模型 / 外部搜索，按策略控制 |

### 4.2 一期不作为完整闭环的意图

以下意图可以识别，但不能作为一期完整闭环验收：

- 市场情报。
- 预测。
- 受控自动投放执行。
- 复杂素材策略生成。
- 跨系统自动审批和回滚。

系统可以回答边界、生成 Case 或进入后续规划，但不能宣称完成。

## 5. 当前实现与纠偏

### 5.1 当前实现

当前代码基础：

- `intent-router.ts`：内置规则路由。
- `intent-route-rules.ts`：配置化路由规则。
- `intent-route-engine.ts`：组合路由雏形。
- `context-compiler.ts`：上下文编译。
- `slot-resolver.ts`：槽位解析。
- `prompt-store.ts`：提示词管理。
- `/api/chat/route.ts`：主 Chat 执行入口。

当前真实闭环：

- `report_query` 已有较完整执行链路。

当前问题：

- 主 Chat 最终路由没有完整贯穿角色、偏好、路由规则和能力发现。
- 受控术语词典还没有成为路由前置能力。
- 能力注册表缺失或未贯穿主链路。
- slot 追问主要来自代码，不完全来自能力注册和 Workflow 入参。
- 提示词存在，但没有成为可追踪的路由判断组件。
- 非 `report_query` 意图容易进入兜底或假展示。

### 5.2 纠偏原则

- 路由命中不等于能力可执行。
- 能力发现必须早于 slot 补齐。
- Prompt 不能替代真实能力。
- 术语归一化不能做重型 RAG。
- Chat 不能直接生成业务执行结论。
- 所有业务结论必须能追溯到工具、知识库或用户确认。

## 6. 标准路由流程

每轮对话按以下流程处理：

1. 接收用户输入。
2. 读取登录用户和用户作用域。
3. 编译上下文：项目、权限、角色、会话、页面、资产、个人记忆。
4. 调用受控术语归一化。
5. 生成候选意图。
6. 查询能力注册表。
7. 判断是否业务域。
8. 判断能力状态。
9. 判断角色权限和项目权限。
10. 判断是否需要路由前追问。
11. 判断是否需要路由后 slot 补齐。
12. 调用 Workflow / Skill / MCP。
13. 解析结构化结果。
14. 生成业务回答和下一步建议。
15. 写入 Trace、Evidence、Asset 或 Case。

## 7. 路由分层设计

### 7.1 术语归一化层

作用：

- 将内部简称、行业表达、别名映射为标准业务词。
- 识别歧义词。
- 生成低置信度追问建议。

输入：

- 用户原文。
- 当前项目。
- 当前角色。
- 会话上下文。
- 受控术语词典版本。

输出：

- 标准词。
- 原始词。
- 类别。
- 置信度。
- 歧义候选。
- 是否需要追问。

约束：

- 不生成业务结论。
- 不扩展词典外知识。
- 不代替指标解释。

### 7.2 候选意图层

候选意图来自：

- 内置规则。
- 配置化路由规则。
- 上下文偏置。
- LLM 结构化分类。

候选意图至少输出：

- `intent_key`
- `confidence`
- `source`
- `matched_terms`
- `reason`

### 7.3 能力发现层

对每个候选意图查询能力注册表。

能力状态：

- `available`：可执行。
- `partially_available`：部分可执行。
- `planned`：规划中。
- `disabled`：关闭。
- `missing`：未注册。

路由最终不能只选置信度最高意图，还要选“可承接能力最明确”的路径。

### 7.4 权限与项目层

路由必须叠加：

- 用户角色权限。
- 动作权限。
- 项目权限。
- 当前项目。
- 跨项目上下文。

无权限时不能继续调用工具，也不能展示历史项目数据。

### 7.4.1 项目上下文冲突处理

顶部项目选择器只是默认上下文，不是本轮请求的绝对项目。用户在自然语言中显式提到项目时，显式项目优先。

规则：

- 顶部项目是 A，用户问“查 B 项目昨天消耗”：请求 B，不请求 A。
- 顶部项目是 A，用户问“查这个项目昨天消耗”：请求 A。
- 顶部项目是 A，用户问“B 和当前项目对比”：请求 A + B。
- 顶部项目是 A，用户问“B 项目的包能投吗”：包交付请求 B，且保持单项目。
- 用户明示 B 项目但无权限：阻断并说明无权限，不能回退到 A。
- 用户明示 B 项目但无法唯一识别：追问确认。
- 用户明示多个项目，但能力只支持单项目：追问选择一个或拆成多个任务。

系统必须区分：

- `ui_selected_project`：右上角选择器项目。
- `explicit_project_mentions`：用户原文中提到的项目。
- `effective_project_refs`：最终真实请求项目。

所有 Workflow / Skill / MCP 请求必须使用 `effective_project_refs`，不能直接使用顶部项目。

工程实现不得硬编码项目名、项目 ID 或示例 A/B。A/B 只用于说明“顶部默认项目”和“用户明示项目”的冲突关系，真实项目解析必须基于项目服务、用户权限、项目字典、项目别名、APPID、历史上下文和个人记忆动态完成。

### 7.5 追问层

追问分三类：

| 追问阶段 | 触发条件 | 示例 |
|---|---|---|
| 路由前追问 | 基本意图不清 | “你是想查数据异常，还是查包状态？” |
| 路由后追问 | 意图明确但执行字段缺失 | “要查哪个项目、哪个时间段？” |
| Workflow 运行中追问 | 执行中发现业务条件不足 | “需要活动 ID 才能继续定位。” |

约束：

- 一次最多问 1-2 个关键问题。
- 能从上下文继承时不追问。
- 能力不可用时不追问执行字段。

## 8. 核心场景规则

### 8.1 数据查询

示例：

- “查一下昨天消耗。”
- “最近 7 天 ROI。”
- “巨量激活成本趋势。”

路由条件：

- 出现查数、指标、时间、趋势、对比等表达。

必须字段：

- 项目。
- 时间范围。
- 指标。

可继承字段：

- 当前项目。
- 最近报表上下文。
- 用户常用指标。

可执行条件：

- 数据查询 Skill / 报表 Workflow 可用。
- 用户有项目数据权限。

失败闭环：

- 数据服务不可用：生成数据查询失败记录。
- 指标不存在：进入指标解释或口径确认。

### 8.2 定时报表

示例：

- “这个报表以后每天早上发。”
- “把刚才结果做成周报。”

路由条件：

- 查询 / 报表结果 + 频率 / 发送 / 定时。

必须字段：

- 项目。
- 指标或报表模板。
- 频率。
- 数据延迟策略。

关键规则：

- 创建时必须确认数据延迟策略。
- 定时报表产物默认进入资产。
- 报表模板可跨项目复用，运行时校验权限。

### 8.3 包交付

示例：

- “这个包能投吗？”
- “查一下巨量包状态。”
- “新包联调怎么样？”

路由条件：

- 包、分包、媒体包、渠道包、上报检查、联调、可投、下载地址等表达。

必须字段：

- 项目。
- 媒体。
- 包版本或当前有效包。

可执行条件：

- 包交付 Workflow 可用。
- 上报检查 Skill / MCP 可用。
- 联调检查 Skill 可用。

关键规则：

- Chat 不能直接回答“能投”。
- 可投结论必须由系统派生。
- 上报不通过不提示提审或更新。
- 联调失败生成 Case。

### 8.4 异常排查

示例：

- “数据为什么对不上？”
- “昨天 ROI 掉了。”
- “为什么没回传？”

路由条件：

- 异常、对不上、下降、缺失、没量、没回传、失败、为什么。

必须字段：

- 项目。
- 异常对象。
- 时间范围。
- 对比来源或异常指标。

可执行条件：

- 异常诊断 Workflow / Skill 可用。

规则：

- 不能编造原因。
- 必须展示已检查项和未确认项。
- 多轮仍无法定位时生成 Case。

### 8.5 指标解释

示例：

- “ROI 怎么算？”
- “激活口径是什么？”
- “回收和媒体后台为什么不一样？”

路由条件：

- 口径、怎么算、是什么意思、指标解释、字段说明。

必须来源：

1. 内部口径库。
2. 通用知识库。
3. 外部补充。

规则：

- 内部口径优先。
- 外部联网只能补充。
- 冲突时说明差异。

### 8.6 需求沟通

示例：

- “帮我提一个需求。”
- “这个报表想固定看。”
- “帮我整理素材需求。”

路由条件：

- 需求、对接、帮我整理、以后固定、提给谁。

必须字段：

- 目标。
- 对象。
- 期望产出。
- 优先级。

规则：

- 先整理草案。
- 用户确认后生成 Case 或任务。

### 8.7 通用问答

示例：

- “今天天气怎么样？”
- “2026 年投放有什么新方法论？”

规则：

- 非业务问题可按企业策略回答。
- 不进入业务资产。
- 不调用业务 Workflow。
- 若使用外部来源，必须标注来源。
- 行业通用知识可与内部业务约束融合，但不能伪造内部数据。

## 9. 配置、代码和 Prompt 边界

### 9.1 写进代码

- 路由流水线顺序。
- 能力发现前置。
- 权限检查。
- 项目过滤。
- 失败闭环。
- Trace 写入。
- 防假功能红线。

### 9.2 写进配置

- 意图规则。
- 关键词和排除词。
- 灰度状态。
- 受控术语。
- 能力注册。
- slot schema。
- 追问文案。
- prompt 绑定。

### 9.3 写进 Prompt

- 术语归一化 JSON 输出。
- 意图分类 JSON 输出。
- 追问表达。
- 工具结果解释。

Prompt 禁止：

- 生成内部数据。
- 生成包状态。
- 生成联调结果。
- 生成上报检查结果。
- 绕过能力注册回答可执行结论。

## 10. 数据模型

### 10.1 DialogueRouteRequest

```ts
type DialogueRouteRequest = {
  conversation_id: string
  message_id: string
  raw_text: string
  user_scope_key: string
  role_id: string
  ui_selected_project_ref?: string
  current_project_ref?: string
  allowed_project_refs: string[]
  context_refs?: {
    page?: string
    asset_ids?: string[]
    previous_message_ids?: string[]
    memory_refs?: string[]
  }
}
```

### 10.1.1 ProjectResolution

```ts
type ProjectResolution = {
  ui_selected_project_ref?: string
  explicit_project_mentions: Array<{
    raw: string
    project_ref?: string
    project_name?: string
    confidence: number
    matched_by: 'exact_name' | 'alias' | 'app_id' | 'history' | 'fuzzy'
  }>
  inherited_project_refs: string[]
  effective_project_refs: string[]
  resolution_source:
    | 'explicit_user_project'
    | 'ui_selected_project'
    | 'cross_project_compare'
    | 'history_inherited'
    | 'clarification_required'
  conflict_detected: boolean
  clarification_needed: boolean
  clarification_question?: string
  permission_status: 'allowed' | 'partial_allowed' | 'denied' | 'unknown'
}
```

### 10.2 DialogueRouteDecision

```ts
type DialogueRouteDecision = {
  route_id: string
  intent_key: string
  confidence: number
  is_business_related: boolean
  project_resolution: ProjectResolution
  normalized_terms: NormalizedTerm[]
  candidates: IntentCandidate[]
  capability_id?: string
  capability_status: 'available' | 'partially_available' | 'planned' | 'disabled' | 'missing'
  execution_allowed: boolean
  blocked_reason?: string
  required_slots: string[]
  resolved_slots: Record<string, unknown>
  missing_slots: string[]
  clarification_needed: boolean
  clarification_stage: 'pre_route' | 'post_route' | 'workflow_runtime' | 'none'
  next_action:
    | 'ask_clarification'
    | 'call_workflow'
    | 'call_skill'
    | 'answer_general'
    | 'create_case'
    | 'show_boundary'
}
```

### 10.3 IntentCandidate

```ts
type IntentCandidate = {
  intent_key: string
  confidence: number
  source: 'builtin_rule' | 'route_rule' | 'llm_classifier' | 'context_bias'
  matched_terms: string[]
  reason: string
}
```

### 10.4 NormalizedTerm

```ts
type NormalizedTerm = {
  raw: string
  standard: string
  category: string
  confidence: number
  need_clarification: boolean
}
```

## 11. 失败闭环

失败不是一句“我做不了”。失败也必须闭环。

失败类型：

- 意图不清。
- 术语歧义。
- 能力未接入。
- 权限不足。
- 项目不可见。
- slot 缺失且用户未补充。
- 工具调用失败。
- 工具结果无法解析。
- 证据不足。

处理策略：

1. 能追问则先追问。
2. 能缩小范围则先缩小范围。
3. 能调用部分能力则返回部分结果。
4. 多轮后仍不能完成则生成 Case。
5. 告知用户当前状态、已记录内容和下一步处理方式。

## 12. Trace 与评测

每次路由必须记录：

- 用户原文。
- 用户作用域。
- 项目上下文。
- 项目解析结果，包括顶部项目、明示项目和最终请求项目。
- 角色上下文。
- 术语归一化结果。
- 候选意图。
- 最终意图。
- 能力发现结果。
- 权限检查结果。
- slot 继承和缺失。
- 追问内容。
- 调用的 Workflow / Skill / MCP。
- 工具结果摘要。
- 最终回答。
- Evidence。
- Case / Asset。

评测场景：

- “这个不对”能否先追问基本意图。
- “ROI 怎么算”是否走指标解释而不是查数。
- “ROI 昨天掉了”是否走异常诊断。
- “这个包能投吗”是否走包交付 Workflow。
- “今天天气怎么样”是否作为非业务问题处理。
- 用户无项目权限时是否阻断。
- 顶部项目 A、用户明示 B 时是否请求 B 而不是 A。
- 用户明示 B 无权限时是否阻断而不是回退到 A。
- 项目字典替换为任意真实项目后，A/B 验收样例仍成立，代码无硬编码项目。
- 能力未接入时是否不追问无意义字段。
- 工具失败时是否生成失败闭环。

## 13. 验收标准

P0 验收：

- `report_query` 能正确路由并真实执行。
- 包交付意图不会直接输出可投结论。
- 指标解释优先内部口径。
- 异常表达不会被误路由成通用问答。
- 模糊表达能触发路由前最小追问。
- 能力未接入时不继续追问执行字段。
- 所有路由有 Trace。
- 失败能生成 Case 或能力缺口记录。

P1 验收：

- 个人记忆可参与上下文继承。
- 通用知识库和个人知识库可按来源进入 RAG。
- LLM 分类结果可和规则结果共同进入评测。
- 路由规则可配置、可灰度、可回滚。

## 14. 工程实施项

P0：

- 主 Chat 链路统一调用 Route Engine。
- Route Engine 接入受控术语归一化。
- Route Engine 接入能力注册表。
- Route Decision 增加 `capability_status` 和 `execution_allowed`。
- Route Decision 增加 `project_resolution`。
- 工具请求统一使用 `effective_project_refs`。
- slot 补齐改为能力发现之后执行。
- 非 `report_query` 意图未接入时走边界说明 / Case。
- Trace 增加路由候选、术语归一化和能力发现字段。

P1：

- LLM 结构化分类接入 prompt-store。
- 路由规则管理和评测集联动。
- 个人记忆、通用知识库和个人知识库进入路由上下文。
- 路由误判样本沉淀为规则候选。

后续：

- 自动学习规则进入审核流。
- 多意图拆解和任务队列。
- 跨会话长期偏好路由。

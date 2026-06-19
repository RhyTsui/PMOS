# 需求沟通与 Case 闭环系统设计

> 承接 PRD：`docs/prd-v2.2/08-异常排查需求沟通与指标解释PRD.md`、`docs/prd-v2.2/10-数据建模与请求反馈模型.md`、`docs/prd-v2.2/12-Chat交互追问与结果呈现规范.md`。
> 当前文档只定义 Chat 侧需求沟通、结构化草案、确认、Case 生成和证据沉淀。具体业务执行能力仍由 MCP / Skill / Workflow 提供。

## 1. 目标与边界

需求沟通的目标不是把用户的一句话包装成“已完成”，而是把模糊诉求整理成可执行、可分发、可追踪的结构化事项。

一期最低闭环：

1. 正确识别用户是在“提出需求 / 跟进事项 / 能力建议 / 无法自动完成后的 Case 闭环”。
2. 在能力发现和上下文解析后，自动补齐可确定字段。
3. 对关键缺口追问，不把缺字段的需求直接提交。
4. 用户确认后，真实调用需求池 / Case / Workflow 服务生成记录。
5. 返回 Case 或任务编号、状态、证据来源和下一步建议。
6. 沉淀原始对话、结构化需求、确认记录、调用记录和失败原因。

非目标：

- 不在 Chat 内部直接实现素材制作、报表开发、包处理、联调执行、指标新增等业务执行。
- 不把“生成一段需求文案”视为需求已提交。
- 不通过 Prompt 伪造 Case 编号、负责人、状态或业务系统结果。
- 不要求一期把所有复杂需求自动分发到所有业务系统；一期允许先生成 Case / 需求池记录。

## 2. 当前实现盘点

当前系统已经具备若干零散基础能力，但缺少统一需求沟通闭环。

| 模块 | 当前实现 | 可复用点 | 缺口 |
|---|---|---|---|
| Intent Router | `frontend/src/src/lib/intent-router.ts` 支持 `demand` 意图，媒体对接、事件映射等表达可路由到 demand | 可作为需求沟通入口 | 需求类型窄，未覆盖数据需求、报表需求、素材需求、包流程跟进、产品建议等完整分类 |
| Slot Resolver | `frontend/src/src/lib/slot-resolver.ts` 可按意图抽取和追问 slot | 可复用追问机制 | demand slot 偏薄，不能表达不同需求类型的必填字段和确认策略 |
| 类型定义 | `DemandResult`、`DemandForm`、`DemandMissingField` 已存在 | 可作为旧版兼容 | `demand_type` 只覆盖媒体回传 / 埋点 / 白名单等，对当前 PRD 不够 |
| 需求池 | `frontend/src/src/lib/demand-pool-store.ts` 支持创建需求池条目，Admin 页面可查看 | 可作为一期沉淀载体 | 当前 admin API 主要是列表；创建来源不统一；默认 `user-001` 需要废弃 |
| Skill 合约 | `metric_requirement_intake_skill`、`integration_requirement_workflow_skill` 已存在 | 可接入指标需求和对接需求 | 需要纳入统一 DemandWorkflow，而不是各自返回孤立结果 |
| Case 生成 | Chat route 中存在部分失败 Case 生成逻辑 | 可复用 CaseRecord 思路 | 缺通用 `demand_followup` / `capability_not_connected` 生成入口和 UI 呈现 |

当前必须纠偏：

- 需求沟通不能只在前端 ResultPanel 展示 `DemandSummary`，必须有后端记录。
- 需求创建不能写死 `user-001`，必须绑定登录用户、会话、项目权限上下文。
- Case 状态不能由大模型生成，必须由真实存储或 Case 服务返回。
- 需求分类不能继续局限在媒体对接字段，应扩展为面向小乔智投一阶段业务场景的通用需求模型。

## 3. 分层职责

| 层级 | 负责内容 | 不负责内容 |
|---|---|---|
| Chat / Router | 识别需求沟通意图，解析项目上下文，调用能力发现，决定追问或进入 DemandWorkflow | 不直接生成真实 Case 状态，不执行下游业务 |
| Context / Slot | 从当前消息、历史会话、附件、项目上下文中补齐字段；标记继承字段是否需要确认 | 不绕过项目权限，不把顶部项目强行用于用户明示的其他项目 |
| DemandWorkflow | 生成结构化需求草案，校验缺口，等待用户确认，调用 Case / 需求池 / 业务 Workflow | 不伪造已提交结果 |
| Skill / MCP / Workflow | 执行具体能力，例如指标需求记录、对接需求分析、包流程检查、报表能力查询 | 不承担自由对话路由和用户确认策略 |
| Case / Demand Pool | 保存需求、失败闭环、跟进状态、证据和处理角色 | 不做业务事实推断 |
| UI | 展示需求草案、缺口、证据、确认按钮、Case 状态和下一步建议 | 不允许只有纯文本“已提交”而无记录编号 |

## 4. 需求类型

一期需求沟通统一支持以下类型。

| 类型 | 用户表达示例 | 首选处理 |
|---|---|---|
| `data_requirement` | “帮我提一个数据需求”“这个字段能加到报表吗” | 先检查现有问数 / MCP 能力；可实现则建议直接查询或定时报表；不可实现则生成需求草案 |
| `report_requirement` | “这个报表以后固定看”“帮我做日报模板” | 可落定时报表则转定时报表 Workflow；复杂报表先生成需求草案 |
| `material_requirement` | “帮我整理素材需求”“这个素材要做一版对比” | 形成素材目标、素材类型、平台、验收口径和交付时间 |
| `package_process_requirement` | “这个包处理流程帮我跟一下”“帮我看新包联调” | 可查包交付则转包交付 Workflow；否则生成跟进 Case |
| `anomaly_collaboration` | “这个异常需要拉人处理”“帮我建个排查单” | 优先转异常排查；无法定位或需人工协作时生成 Case |
| `integration_requirement` | “接一个媒体回传”“这个事件怎么映射” | 调用 `integration_requirement_workflow_skill`；阻塞时生成对接需求 |
| `metric_requirement` | “这个指标没有”“要新增一个口径” | 调用 `metric_requirement_intake_skill`；记录指标定义、来源、维度、展示方式 |
| `product_capability_suggestion` | “小乔以后能不能自动做这个” | 生成产品能力建议，不承诺一期实现 |
| `general_followup` | “帮我记录一下”“这个后面跟进” | 形成通用跟进 Case |

## 5. 数据模型

### 5.1 DemandWorkflowTask

```ts
interface DemandWorkflowTask {
  task_id: string;
  conversation_id: string;
  source_message_id: string;
  user_id: string;
  project_refs: ProjectRef[];
  demand_type: DemandType;
  status:
    | 'created'
    | 'collecting'
    | 'waiting_user_confirm'
    | 'structured'
    | 'submitted'
    | 'case_created'
    | 'cancelled'
    | 'failed';
  capability_check: CapabilityCheckSummary;
  draft: DemandDraft;
  missing_fields: DemandFieldGap[];
  evidence_refs: EvidenceRef[];
  case_id?: string;
  demand_pool_item_id?: string;
  workflow_run_id?: string;
  created_at: string;
  updated_at: string;
}
```

### 5.2 DemandDraft

```ts
interface DemandDraft {
  title: string;
  problem_statement: string;
  business_goal: string;
  target_object: string;
  expected_output: string;
  scope_in: string[];
  scope_out: string[];
  acceptance_criteria: string[];
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  expected_time?: string;
  owner_role_suggestion: string[];
  dependencies: DemandDependency[];
  project_refs: ProjectRef[];
  source_context: {
    original_user_message: string;
    attachment_ids: string[];
    normalized_terms: string[];
    inherited_slots: string[];
    confirmed_slots: string[];
  };
}
```

### 5.3 DemandFieldGap

```ts
interface DemandFieldGap {
  field_key: string;
  field_label: string;
  priority: 'required' | 'recommended' | 'optional';
  reason: string;
  suggested_question: string;
  can_submit_without_it: boolean;
}
```

必填字段按需求类型变化，但通用必填为：

- 需求背景或问题陈述。
- 目标对象，例如项目、媒体、报表、指标、包、素材、流程。
- 期望产出。
- 验收方式或成功标准。

### 5.4 CaseRecord 扩展

沿用 `CaseRecord`，但 `case_type` 必须支持：

- `demand_followup`
- `capability_not_connected`
- `metric_requirement`
- `integration_requirement`
- `report_requirement`
- `material_requirement`
- `package_process_followup`

Case 必须包含：

- 原始问题。
- 已确认事实。
- 未确认问题。
- 已调用能力。
- 返回结果。
- 失败或转人工原因。
- Evidence。
- 建议处理角色。
- 关联会话、消息、项目和用户。

## 6. 流程设计

### 6.1 总流程

1. 用户输入。
2. Context Compiler 编译用户、会话、项目、权限、历史消息、附件和个人偏好。
3. Router 识别为 `demand` 或由其他链路转入需求沟通。
4. Capability Registry 检查是否已有可执行能力。
5. Slot Resolver 按需求类型补齐字段。
6. 字段不足时追问；字段足够时生成 `DemandDraft`。
7. Chat 展示结构化草案，明确“待确认”，不写“已提交”。
8. 用户确认后调用需求池 / Case / Workflow API。
9. 返回真实编号、状态、证据和下一步建议。

### 6.2 能力发现优先

需求沟通前必须先检查现有能力，避免补齐一堆字段后发现不能执行。

规则：

- 如果用户要的是现有能力可以完成的动作，例如查数、定时报表、包状态查询、指标解释，应优先转对应 Workflow。
- 如果现有能力只能部分完成，应说明可完成部分和不可完成部分，再询问是否生成需求。
- 如果能力未接入，才进入 `capability_not_connected` 或 `demand_followup` Case。

示例：

用户说“这个报表以后每天固定看”。系统应先判断当前结果是否来自真实问数、是否具备可复用查询计划、是否已确认数据延迟策略。满足时转定时报表创建，不满足时追问缺口，而不是直接生成报表需求单。

### 6.3 追问策略

追问只问会影响执行或分发的关键字段。

| 场景 | 追问字段 | 追问原因 |
|---|---|---|
| 数据需求 | 目标指标、维度、时间范围、项目、期望使用场景 | 决定能否复用现有 MCP 或需要新增数据能力 |
| 报表需求 | 报表周期、接收人、数据延迟策略、展示形式 | 决定是否可转定时报表 |
| 素材需求 | 平台、素材类型、目标人群、验收指标、交付时间 | 决定素材产出和验收口径 |
| 包流程跟进 | 项目、包类型、媒体、版本号或包地址 | 决定是否可查包交付 Workflow |
| 指标需求 | 指标定义、计算来源、维度、展示位置 | 决定是否进入指标口径库或报表开发 |
| 对接需求 | 媒体、应用、对接文档、事件映射、验收方式 | 决定是否可配置监测链接和回传 |

### 6.4 用户确认

生成草案不等于提交。只有以下动作需要用户确认：

- 创建 Case。
- 写入需求池。
- 发起可能改变系统状态的 Workflow。
- 把需求草案转给后续处理角色。

确认文案必须展示：

- 将创建什么记录。
- 绑定哪些项目。
- 包含哪些已确认字段。
- 哪些字段仍为空但允许后续补充。
- 创建后的下一步由谁处理。

## 7. 接口契约

### 7.1 创建或推进需求沟通

`POST /api/xiaoqiao/demand/tasks`

请求：

```json
{
  "conversation_id": "conv_001",
  "source_message_id": "msg_001",
  "user_message": "帮我整理一个素材需求",
  "project_refs": [{ "project_id": "p1", "project_name": "项目A" }],
  "attachments": [],
  "context": {}
}
```

响应：

```json
{
  "task_id": "demand_task_001",
  "status": "waiting_user_confirm",
  "demand_type": "material_requirement",
  "draft": {
    "title": "素材需求草案",
    "problem_statement": "需要整理素材制作诉求",
    "business_goal": "",
    "target_object": "",
    "expected_output": "",
    "acceptance_criteria": []
  },
  "missing_fields": [
    {
      "field_key": "target_platform",
      "field_label": "投放平台",
      "priority": "required",
      "suggested_question": "这个素材主要用于哪个媒体或投放平台？"
    }
  ],
  "evidence_refs": []
}
```

### 7.2 确认并提交

`POST /api/xiaoqiao/demand/tasks/{task_id}/confirm`

请求：

```json
{
  "confirm_action": "create_case",
  "draft_patch": {},
  "user_confirmed": true
}
```

响应：

```json
{
  "task_id": "demand_task_001",
  "status": "case_created",
  "case_id": "case_001",
  "demand_pool_item_id": "demand_001",
  "next_actions": [
    "已生成跟进记录，可在需求池查看",
    "后续处理需要补充验收标准"
  ],
  "evidence_refs": [
    { "id": "ev_001", "source_type": "conversation", "title": "原始用户诉求" }
  ]
}
```

### 7.3 需求池查询

`GET /api/xiaoqiao/demand-pool?project_id=&status=&type=`

要求：

- 必须按当前登录用户的项目权限动态过滤。
- 支持跨项目需求展示，但不可见项目的数据必须隐藏或删除明细。
- 不再使用 `user-001` 兜底。

## 8. UI 契约

Chat 中的需求草案卡片必须包含：

- 需求类型。
- 草案标题。
- 背景 / 目标 / 对象 / 期望产出。
- 适用项目。
- 缺失字段。
- 验收标准。
- 依赖与建议处理角色。
- 证据来源。
- 操作按钮：继续补充、确认创建 Case、保存到需求池、取消。

状态展示：

- `collecting`：正在补齐信息。
- `waiting_user_confirm`：已形成草案，等待确认。
- `case_created`：已创建 Case，展示 Case 编号。
- `submitted`：已写入需求池或转入下游 Workflow。
- `failed`：创建失败，展示失败原因和重试建议。

UI 禁止：

- 只显示“已帮你提交”但没有编号。
- 把未确认草案放进“我的资产”。
- 把无权限项目的需求明细展示给用户。

## 9. Trace 与 Evidence

每个 DemandWorkflow 必须记录：

- `intent.detected`：识别为需求沟通或从其他链路转入。
- `context.prepared`：项目、用户、权限、历史上下文。
- `capability.checked`：已检查哪些能力，结论是什么。
- `clarify.requested` / `clarify.submitted`：追问和用户补充。
- `workflow.step`：草案生成、确认、Case 创建。
- `tool_call` / `tool_result`：真实调用需求池、Case 或 Workflow 的记录。
- `source.attached`：原始消息、附件、知识来源、能力发现结果。

Evidence 最少包含：

- 原始用户消息。
- 结构化草案版本。
- 用户确认消息。
- Case / 需求池创建返回。
- 失败原因和重试结果。

## 10. Prompt、配置、工具和知识库边界

| 内容 | 放置位置 | 原因 |
|---|---|---|
| 需求类型枚举、状态机、权限校验、确认门禁 | 代码 | 改变系统行为，必须稳定可测 |
| 需求类型字段模板、追问模板、Case 模板 | 后台配置 / 运行时策略 | 需要运营和产品迭代 |
| 需求草案措辞润色 | Prompt | 只影响表达，不产生事实 |
| 指标需求记录、对接需求分析、包状态查询 | Skill / Workflow / MCP | 依赖真实业务服务 |
| 术语、SOP、验收示例 | 知识库 / 受控术语索引 | 帮助理解和生成草案 |
| Case 编号、处理状态、负责人 | Case / 需求池服务 | 真实业务记录来源 |

知识库只能用于理解和辅助草案，不可作为“需求已创建”的事实来源。

## 11. 失败也闭环

系统无法完成时，不允许一次失败就兜底结束。推荐状态：

1. `collecting`：继续追问关键缺口。
2. `partial`：说明已完成哪些能力检查，哪些缺口导致无法继续。
3. `case_created`：多轮后仍无法完成时生成 Case。
4. `failed`：Case 创建也失败时，返回失败原因、重试入口和人工处理说明。

失败 Case 必须说明：

- 为什么不能自动完成。
- 已经调用过哪些能力。
- 需要谁处理。
- 用户下一步需要等待还是补充材料。

## 12. 典型验收场景

| 场景 | 期望 |
|---|---|
| 用户说“帮我提一个数据需求” | 系统追问目标指标、维度、项目、使用场景；不直接提交 |
| 用户说“这个报表以后每天固定看”且当前有真实查询结果 | 系统询问数据延迟策略，转定时报表创建 |
| 用户说“帮我整理素材需求” | 系统生成素材需求草案，追问平台、素材类型、目标和验收 |
| 用户说“这个包处理流程帮我跟一下” | 系统优先查包交付能力；无法查时生成包流程跟进 Case |
| 用户说“这个指标没有，想加一个” | 系统调用指标需求 intake skill，记录定义、来源、维度、展示位置 |
| 用户确认“就按这个创建” | 系统真实调用 Case / 需求池 API，并返回编号 |
| Case 创建失败 | 系统返回失败原因、保留草案、提供重试和人工处理建议 |

## 13. 工程改造清单

1. 扩展 `DemandType`，覆盖 PRD 中的一期需求类型。
2. 新增 `DemandWorkflowTask`、`DemandDraft`、`DemandFieldGap` 类型。
3. 扩展 `slot-resolver` 的 demand schema，按需求类型配置必填字段。
4. 新增需求沟通服务 API：创建、补充、确认、取消、创建 Case。
5. 需求池创建废弃 `user-001`，绑定登录用户和项目权限。
6. Chat route 接入 Capability Registry，需求沟通前先检查可执行能力。
7. 将 `metric_requirement_intake_skill` 和 `integration_requirement_workflow_skill` 接入统一 DemandWorkflow。
8. ResultPanel 新增需求草案卡片，区分草案、待确认、已创建 Case、失败。
9. Trace 增加 `capability.checked`、`demand.draft_created`、`case.created` 事件。
10. 增加端到端测试：模糊需求追问、确认创建、权限过滤、Case 失败重试。

## 14. 用户需求回映射

| 用户原始诉求 | 设计满足情况 |
|---|---|
| “失败也要闭环，先继续追问，多轮后不行再生成 case” | 已定义 `collecting -> partial -> case_created / failed` 闭环 |
| “真实调用工具完成执行，解析正确结果，提供证据来源、记录、沉淀” | 已要求 Case / 需求池必须真实调用，并记录 Trace / Evidence |
| “不要和 Chat 本身功能混在一起，业务能力由 MCP / Workflow 提供” | 已拆分 Chat、DemandWorkflow、Skill/MCP、Case 服务职责 |
| “很多需求细节没有定义清楚，需要一个个需求单独输出” | 本文专门定义需求沟通与 Case 闭环，作为后续工程实现依据 |
| “不确定需求时要追问确认” | 已定义字段缺口、追问策略和用户确认门禁 |

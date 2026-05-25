# 智投 Chat「获取广告包 / 验流程」AI Native 交付方案

> 面向 Codex CLI 的产品与实现需求文档  
> 版本：v0.3  
> 目标项目：智投 Chat  
> 目标形态：基于现有 Chat 结构实现，不新增复杂三栏工作台  
> 核心原则：能自动化的全部自动化；只在缺权限、缺输入、缺系统能力时阻塞提示

---

## 1. 背景与目标

当前智投 Chat 已经具备 MCP 接入、项目上下文、配置查询、分包、联调、媒体配置等基础能力。下一阶段目标不是继续把 Chat 做成“问答助手”，而是把「获取广告包 / 验流程」做成一个可执行的 AI Native 交付流程。

业务目标是给公司各发行部门端到端交付一批当前项目可用的投放包。这批包必须满足以下条件：

1. 已按照出包规范完成包管理与分包动作。
2. 渠道 ID、分包 ID、包地址等数据监测体系完整。
3. 已通过数据上报验收。
4. 已完成媒体监测回传功能联调。
5. 对应媒体后台应用、授权、审核、共享关系满足投放要求。
6. 最终能直接交付给投放人员使用。

用户不应该再理解应用管理、包管理、分包工具、联调工具、媒体后台配置等内部复杂过程。用户只需要点击快捷入口或用自然语言表达目标，系统自动推进流程，并在会话卡片中输出结果。




## 4. 意图识别规则
新增业务意图：
```yaml
intent: get_delivery_packages
display_name: 验流程
```
### 4.1 命中词
当用户问题中包含以下词汇时，优先进入该流程，而不是普通知识问答：
```yaml
keywords:
  - 广告包
  - 投放包
  - 可交付包
  - 可投放包
  - 包体检查
  - 分包
  - 包地址
  - 验流程
  - 联调包
  - 媒体包
  - 渠道包
  - 应用包
```
## 5. 总体流程
该流程进入后，执行固定业务流程：
```text
确认项目
→ 查询包列表
→ 检查上报验收状态
→ 检查审核状态
→ 检查分包状态
→ 检查媒体应用与授权
→ 检查联调状态
→ 检查回传状态
→ 输出可交付结果
```
只有以下情况才停止：

## 6. Agent 设计

### 6.1 Agent 名称

```yaml
agent_id: delivery_readiness_agent
agent_name: 投放包交付 Agent
```
### 6.2 Agent 职责
该 Agent 负责完整调度“获取广告包 / 验流程”业务流程。
核心职责：
1. 读取当前会话项目上下文。
2. 判断媒体、终端、包类型等条件。
3. 调用包列表与状态查询 Skill。
4. 调用分包、联调、共享等自动执行 Skill。
5. 调用异常排查 Skill。
6. 汇总并生成会话卡片。
7. 将执行过程写入右侧 Trace / 日志区。
8. 保证正文只展示最终结果或阻塞结果，不展示冗长中间过程。

### 6.3 Agent 行为原则
```yaml
principles:
  result_first: true
  auto_execute_by_default: true
  no_fake_result: true
  no_tool_hallucination: true
  no_long_clarification: true
  use_buttons_for_ambiguity: true
  block_only_when_unrecoverable: true
```

解释：
- 结果优先：用户先看到包列表或阻塞项。
- 默认自动执行：能自动推进的不需要问“是否继续”。
- 不生成假结果：MCP 查不到就是查不到，不允许编造包、应用、状态。
- 简洁歧义处理：必须确认时用按钮，不要大段解释。
- 只在不可自动修复时阻塞。

---

## 7. Skill 体系设计

本阶段定义 3 个一级 Skill，与用户已有设想保持一致，但进一步规范边界。
---
### 7.1 Skill 1：包管理 / 分包 / 联调执行 Skill
```yaml
skill_id: package_delivery_execution_skill
skill_name: 包交付执行 Skill
```
#### 职责
负责所有可自动执行动作：

1. 执行包管理相关动作。
2. 执行分包创建。
3. 执行媒体分包同步。
4. 执行应用共享。
5. 执行联调发起。
6. 执行联调重试。
7. 执行状态刷新。
8. 必要时回写状态。

#### 绑定 MCP
```yaml
mcp_bindings:
  - package_mcp
  - debug_mcp
  - media_config_mcp
  - zhitou_config_mcp
```
#### 典型 Tool

```yaml
tools:
  - create_sub_package
  - sync_media_sub_package
  - share_media_app
  - start_debug
  - retry_debug
  - refresh_package_status
  - update_delivery_status
```

#### 自动执行原则
以下动作默认自动执行，不需要用户确认：
```yaml
auto_execute:
  create_sub_package: true
  sync_media_sub_package: true
  share_media_app: true
  start_debug: true
  retry_debug: true
  refresh_status: true
```
---

### 7.2 Skill 2：分包信息与状态 Skill
```yaml
skill_id: package_status_query_skill
skill_name: 包信息与状态 Skill
```

#### 职责
负责查询和汇总包信息，一行一个包输出给会话卡片。
优先调用智投配置 MCP 获取分包列表。后续可切换到整合应用信息的包列表 MCP。

#### 数据来源优先级

```yaml
source_priority:
  - integrated_delivery_package_mcp
  - zhitou_config_mcp.package_list_tool
  - package_mcp.sub_package_list_tool
  - media_config_mcp.media_app_tool
```

#### 必须返回字段
```yaml
fields:
  - package_id
  - package_name
  - package_type
  - media
  - platform
  - package_url
  - channel_id
  - sub_package_id
  - qa_acceptance_status
  - media_review_status
  - debug_status
  - callback_status
  - delivery_status
  - updated_at
```

#### 状态标准化
不同 MCP 的原始状态必须被标准化为统一枚举：
```yaml
qa_acceptance_status:
  - unknown
  - pending
  - passed
  - failed

media_review_status:
  - unknown
  - pending
  - approved
  - rejected

debug_status:
  - unknown
  - not_started
  - running
  - passed
  - failed

callback_status:
  - unknown
  - normal
  - abnormal

delivery_status:
  - blocked
  - processing
  - deliverable
```

---

### 7.3 Skill 3：步骤排查 Skill
```yaml
skill_id: delivery_diagnosis_skill
skill_name: 步骤排查 Skill
```

#### 职责
当包列表获取失败、状态异常、流程阻塞时，执行排查。
排查顺序：
```text
1. 检查智投配置 MCP 包管理 Tool
2. 确认是否存在 QA 验收通过的渠道包
3. 如果存在渠道包，检查媒体后台 MCP 是否存在审核通过的应用
4. 检查默认账户是否有授权过的应用
5. 检查是否存在分包关系
6. 检查是否已发起联调
7. 检查联调失败原因
8. 检查回传或监测验证是否异常
9. 输出最终缺口
```
#### 阻塞结果格式

当无法自动修复时，正文只展示最后阻塞项、原因、下一步。

示例：
```yaml
blocker:
  type: no_authorized_media_app
  title: 未找到已授权的媒体应用
  reason: 当前默认账户下没有可用于共享和联调的审核通过应用
  next_step: 请先完成媒体账户授权或配置默认账户
```

---

## 8. MCP 接入规则

### 8.1 MCP 列表

当前流程绑定以下 MCP：

```yaml
mcps:
  zhitou_config_mcp:
    desc: 智投配置 MCP，负责项目、包管理、应用配置、分包关系查询

  package_mcp:
    desc: 分包 MCP，负责分包创建、分包状态、包地址、渠道 ID、分包 ID

  debug_mcp:
    desc: 联调 MCP，负责联调发起、联调结果、回传验证、失败原因

  media_config_mcp:
    desc: 媒体配置 MCP，负责媒体后台应用、审核状态、账户授权、应用共享
```

### 8.2 调用优先级

```yaml
call_order:
  - zhitou_config_mcp
  - package_mcp
  - media_config_mcp
  - debug_mcp
```

### 8.3 严禁规则

```yaml
forbidden:
  - MCP 找不到结果时生成假包
  - 工具失败时用模型猜测状态
  - 没有状态字段时默认通过
  - 没有包地址时输出可交付
  - 没有联调状态时输出可投放
  - 没有权限时继续自动执行写操作
```

---

## 9. Delivery DSL 设计

为避免 Agent 自由发挥，必须引入轻量 DSL。DSL 用于定义流程、状态、自动修复、阻塞条件和输出规则。

### 9.1 DSL 目标
1. 固化业务流程。
2. 避免 Agent 幻觉。
3. 保证每个状态有明确来源。
4. 保证自动执行动作有边界。
5. 保证结果输出可测试。

### 9.2 DSL 示例
```yaml
workflow_id: get_delivery_packages
workflow_name: 获取广告包

trigger:
  intents:
    - get_delivery_packages
  quick_actions:
    - 验流程
    - 获取广告包

required_context:
  - project_id

optional_context:
  - media
  - platform
  - package_type

states:
  - id: project_confirmed
    name: 项目已确认
    check:
      skill: package_status_query_skill
      action: resolve_project_context
    blockers:
      - no_project_context

  - id: package_list_ready
    name: 包列表已获取
    check:
      skill: package_status_query_skill
      action: get_package_list
    fallback:
      skill: delivery_diagnosis_skill
      action: diagnose_package_list_missing
    blockers:
      - no_package
      - mcp_capability_missing

  - id: qa_acceptance_ready
    name: 上报验收已通过
    check:
      skill: package_status_query_skill
      action: check_qa_acceptance
    blockers:
      - no_qa_passed_package

  - id: media_app_ready
    name: 媒体应用已就绪
    check:
      skill: package_status_query_skill
      action: check_media_app
    auto_repair:
      skill: package_delivery_execution_skill
      action: create_or_share_media_app
    blockers:
      - no_media_account
      - no_permission

  - id: sub_package_ready
    name: 分包已完成
    check:
      skill: package_status_query_skill
      action: check_sub_package
    auto_repair:
      skill: package_delivery_execution_skill
      action: create_sub_package
    blockers:
      - package_template_missing

  - id: debug_ready
    name: 联调已通过
    check:
      skill: package_status_query_skill
      action: check_debug_status
    auto_repair:
      skill: package_delivery_execution_skill
      action: start_or_retry_debug
    blockers:
      - debug_failed_unrecoverable

  - id: callback_ready
    name: 回传验证通过
    check:
      skill: package_status_query_skill
      action: check_callback_status
    auto_repair:
      skill: package_delivery_execution_skill
      action: retry_callback_validation
    blockers:
      - callback_config_missing

  - id: deliverable
    name: 可交付
    check:
      skill: package_status_query_skill
      action: build_delivery_result

output_rules:
  success:
    body: delivery_package_cards
    include_process_in_body: false

  blocked:
    body: blocker_card
    include_last_blocker_only: true

  processing:
    body: progress_card
    final_conclusion: false

trace_rules:
  write_tool_calls_to_sidebar: true
  write_state_transitions_to_sidebar: true
  write_root_cause_to_sidebar: true
```

---

## 10. 状态机设计

### 10.1 状态流

```text
INIT
→ PROJECT_CONFIRMED
→ PACKAGE_LIST_READY
→ QA_ACCEPTANCE_READY
→ MEDIA_APP_READY
→ SUB_PACKAGE_READY
→ DEBUG_READY
→ CALLBACK_READY
→ DELIVERABLE
```

### 10.2 状态解释

| 状态 | 说明 | 可自动修复 |
|---|---|---|
| INIT | 流程初始化 | 是 |
| PROJECT_CONFIRMED | 已识别当前项目 | 部分 |
| PACKAGE_LIST_READY | 已获取包列表 | 否 |
| QA_ACCEPTANCE_READY | 已找到 QA 验收通过包 | 否 |
| MEDIA_APP_READY | 媒体后台应用满足要求 | 是 |
| SUB_PACKAGE_READY | 分包已完成 | 是 |
| DEBUG_READY | 联调已通过 | 是 |
| CALLBACK_READY | 回传验证正常 | 是 |
| DELIVERABLE | 可交付 | 不需要 |

### 10.3 自动推进规则

只要状态的 `check` 失败，但存在 `auto_repair`，就自动执行修复动作，然后重新检查状态。

伪代码：

```ts
for (const state of workflow.states) {
  const result = await check(state)

  if (result.passed) {
    continue
  }

  if (state.auto_repair && canAutoRepair(result)) {
    await executeAutoRepair(state.auto_repair)
    const retryResult = await check(state)

    if (retryResult.passed) {
      continue
    }
  }

  return buildBlockedResult(result)
}

return buildDeliverableResult()
```

---

## 11. 输出规则

### 11.1 正文输出原则

Chat 正文只展示：

1. 可交付包列表。
2. 当前阻塞项。
3. 必要的进行中状态。

正文不展示：

- MCP 原始调用
- SQL
- 长过程
- 调试日志
- 工具参数
- 大段解释
- 完整思维链

这些内容放思维链、调用与来源里，和右侧侧边栏。

### 11.2 成功输出

成功时，正文只展示包列表卡片。

示例：

```text
已为当前项目准备 3 个可投放包
```

每个包一行或一卡。

### 11.3 失败输出

失败时，正文只展示最后阻塞项、原因、下一步。

示例：

```text
当前无法生成可投放包

阻塞项：未找到审核通过的媒体应用
原因：默认账户下没有已授权应用
下一步：请先完成媒体账户授权
```

### 11.4 进行中输出

进行中不输出最终结论，只展示过程状态。

示例：

```text
正在自动准备投放包

已完成：
✓ 项目识别
✓ 包列表获取
✓ QA 验收检查

进行中：
- 自动发起联调
```

---

## 12. 会话卡片设计

本阶段使用会话卡片，而不是复杂页面。

### 12.1 总览卡片

```json
{
  "type": "delivery_summary_card",
  "title": "已为你准备 3 个可投放包",
  "project": "王者荣耀海外版",
  "media": "巨量",
  "platform": "Android",
  "summary": {
    "total": 5,
    "deliverable": 3,
    "processing": 1,
    "blocked": 1
  }
}
```

### 12.2 包列表卡片

一行一个包。

```json
{
  "type": "package_list_card",
  "title": "可投放包列表",
  "rows": [
    {
      "package_name": "巨量 Android 广告包",
      "package_id": "pkg_001",
      "package_url": "https://example.com/pkg.apk",
      "media": "巨量",
      "platform": "Android",
      "channel_id": "310012",
      "sub_package_id": "6f3a9c2e7b",
      "qa_acceptance_status": "passed",
      "media_review_status": "approved",
      "debug_status": "passed",
      "callback_status": "normal",
      "delivery_status": "deliverable",
      "actions": [
        "copy_url",
        "view_detail"
      ]
    }
  ]
}
```

### 12.3 阻塞卡片

```json
{
  "type": "delivery_blocker_card",
  "title": "当前无法交付",
  "blocker": "未找到审核通过的媒体应用",
  "reason": "默认账户下没有已授权应用，无法完成应用共享和联调",
  "next_step": "请先完成媒体账户授权",
  "can_auto_repair": false
}
```

### 12.4 进行中卡片

```json
{
  "type": "delivery_progress_card",
  "title": "正在自动准备投放包",
  "steps": [
    {
      "name": "项目识别",
      "status": "done"
    },
    {
      "name": "包列表获取",
      "status": "done"
    },
    {
      "name": "联调验证",
      "status": "running"
    }
  ]
}
```

---

## 13. 前端实现建议

### 13.1 页面形态

复用当前 Chat 页面。

```text
Chat 主区
  - 用户消息
  - Agent 过程卡片
  - 结果卡片
  - 包列表卡片
  - 阻塞卡片

```

### 13.3 会话卡片组件建议

建议新增或复用以下组件：

```text
DeliverySummaryCard
PackageListCard
PackageRow
DeliveryProgressCard
DeliveryBlockerCard
DeliveryStatusTag
PackageActionButton
```

### 13.4 状态标签

状态颜色建议：

```yaml
deliverable:
  text: 可投放
  color: green

processing:
  text: 执行中
  color: blue

blocked:
  text: 待补齐
  color: orange

failed:
  text: 不通过
  color: red

unknown:
  text: 未知
  color: gray
```

---

## 14. 歧义处理

### 14.1 应用列表歧义

“应用列表”可能指：

1. 智投应用
2. 媒体应用
3. 包关联应用
4. 默认账户授权应用

处理规则：

如果当前 intent 是 `get_delivery_packages`，默认优先解释为“与投放包交付相关的媒体应用 / 包关联应用”。

必要时用按钮确认：

```text
你要查看哪类应用？
[智投应用] [媒体应用] [包关联应用]
```

### 14.2 包歧义

“包”可能指：

1. 母包
2. 渠道包
3. 分包
4. 媒体后台包
5. 可投放交付包

处理规则：

如果当前 intent 是 `get_delivery_packages`，默认输出“可投放交付包”。

必要时用按钮确认：

```text
你要看哪类包？
[可投放包] [母包] [渠道包] [分包]
```

### 14.3 媒体歧义

如果用户没有指定媒体，则默认输出当前项目全部媒体可投放包。

如果用户指定媒体，则只过滤对应媒体。

---

## 15. 数据模型建议

### 15.1 DeliveryPackage

```ts
export interface DeliveryPackage {
  packageId: string
  packageName: string
  packageType: 'mother' | 'channel' | 'sub_package' | 'media_package' | 'delivery_package'
  projectId: string
  projectName?: string

  media?: string
  platform?: 'Android' | 'iOS' | 'HarmonyOS' | 'H5' | 'PC'
  packageUrl?: string

  channelId?: string
  subPackageId?: string
  appId?: string
  mediaAppId?: string
  defaultAccountId?: string

  qaAcceptanceStatus: 'unknown' | 'pending' | 'passed' | 'failed'
  mediaReviewStatus: 'unknown' | 'pending' | 'approved' | 'rejected'
  debugStatus: 'unknown' | 'not_started' | 'running' | 'passed' | 'failed'
  callbackStatus: 'unknown' | 'normal' | 'abnormal'
  deliveryStatus: 'blocked' | 'processing' | 'deliverable'

  blocker?: DeliveryBlocker
  updatedAt?: string
}
```

### 15.2 DeliveryBlocker

```ts
export interface DeliveryBlocker {
  type:
    | 'no_project_context'
    | 'no_package'
    | 'no_qa_passed_package'
    | 'no_media_app'
    | 'no_media_account'
    | 'no_permission'
    | 'package_template_missing'
    | 'debug_failed_unrecoverable'
    | 'callback_config_missing'
    | 'mcp_capability_missing'

  title: string
  reason: string
  nextStep: string
  canAutoRepair: boolean
}
```

### 15.3 DeliveryTrace

```ts
export interface DeliveryTrace {
  traceId: string
  workflowId: string
  projectId: string
  state: string
  skillId?: string
  mcpName?: string
  toolName?: string
  status: 'running' | 'success' | 'failed' | 'blocked'
  startedAt: string
  finishedAt?: string
  summary?: string
  error?: string
}
```

---

## 16. 后端接口建议

### 16.1 启动流程

```http
POST /api/chat/workflows/get-delivery-packages/start
```

请求：

```json
{
  "conversation_id": "c_001",
  "project_id": "p_001",
  "media": "巨量",
  "platform": "Android",
  "source": "quick_action"
}
```

返回：

```json
{
  "workflow_run_id": "wr_001",
  "status": "running"
}
```

### 16.2 查询流程状态

```http
GET /api/chat/workflows/get-delivery-packages/{workflow_run_id}
```

返回：

```json
{
  "workflow_run_id": "wr_001",
  "status": "deliverable",
  "cards": [],
  "traces": []
}
```

### 16.3 获取卡片结果

```http
GET /api/chat/workflows/get-delivery-packages/{workflow_run_id}/cards
```

### 16.4 获取 Trace

```http
GET /api/chat/workflows/get-delivery-packages/{workflow_run_id}/traces
```

---

## 17. Codex CLI 实施任务拆解

### 17.1 第一阶段：意图与流程入口

实现：

1. 新增 `get_delivery_packages` intent。
2. 新增快捷入口“获取广告包 / 验流程”。
3. 支持从当前上下文读取 project_id。
4. 支持识别媒体、平台、包相关语义。
5. 普通问答路由命中后不再进入知识问答，直接进入 workflow。

建议文件：

```text
src/chat/intents/getDeliveryPackagesIntent.ts
src/chat/router/intentRouter.ts
src/chat/quick-actions/deliveryQuickAction.ts
```

---

### 17.2 第二阶段：DSL 与 Workflow Runtime

实现：

1. 新增 workflow DSL 配置。
2. 新增 workflow runner。
3. 支持状态 check。
4. 支持 auto_repair。
5. 支持 blocker。
6. 支持 trace 写入。

建议文件：

```text
src/workflows/delivery/getDeliveryPackages.workflow.yaml
src/workflows/runtime/workflowRunner.ts
src/workflows/runtime/stateMachine.ts
src/workflows/runtime/blocker.ts
src/workflows/runtime/traceWriter.ts
```

---

### 17.3 第三阶段：Skill 封装

实现 3 个 Skill：

```text
package_delivery_execution_skill
package_status_query_skill
delivery_diagnosis_skill
```

建议文件：

```text
src/skills/delivery/packageDeliveryExecutionSkill.ts
src/skills/delivery/packageStatusQuerySkill.ts
src/skills/delivery/deliveryDiagnosisSkill.ts
```

要求：

- Skill 不直接生成用户文案。
- Skill 只返回结构化结果。
- 所有 MCP 失败必须返回明确错误对象。
- 不允许静默吞错。

---

### 17.4 第四阶段：MCP Adapter

实现 MCP Adapter，不在业务 Skill 中散落 MCP 调用细节。

建议文件：

```text
src/mcp/adapters/zhitouConfigMcpAdapter.ts
src/mcp/adapters/packageMcpAdapter.ts
src/mcp/adapters/debugMcpAdapter.ts
src/mcp/adapters/mediaConfigMcpAdapter.ts
```

Adapter 返回统一结构：

```ts
export interface McpResult<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    raw?: unknown
  }
  source: {
    mcp: string
    tool: string
  }
}
```

---

### 17.5 第五阶段：会话卡片

实现：

```text
DeliverySummaryCard
PackageListCard
PackageRow
DeliveryProgressCard
DeliveryBlockerCard
```

建议文件：

```text
src/components/chat/cards/DeliverySummaryCard.tsx
src/components/chat/cards/PackageListCard.tsx
src/components/chat/cards/PackageRow.tsx
src/components/chat/cards/DeliveryProgressCard.tsx
src/components/chat/cards/DeliveryBlockerCard.tsx
```

要求：

- 一行一个包。
- 不展示复杂中间过程。
- 支持复制包地址。
- 支持查看详情。
- 支持状态标签。
- 支持空态和阻塞态。

---

### 17.6 第六阶段：思维链中展示
1. Workflow 状态流转。
2. MCP 调用。
3. Skill 执行。
4. Root Cause。
5. 阻塞原因。


---

## 18. 测试用例

### 18.1 成功用例

输入：

```text
我要获取当前项目可投放广告包
```

期望：

1. 自动读取当前 project_id。
2. 自动查询包列表。
3. 自动检查状态。
4. 输出可投放包列表。
5. 每个包一行。
6. 不输出中间 MCP 过程到正文。

---

### 18.3 包列表 MCP 失败

输入：

```text
我要获取当前项目可投放广告包
```

且包列表 MCP 失败。

期望：

1. 自动进入排查。
2. 检查智投配置 MCP 包管理 Tool。
3. 检查是否存在 QA 验收通过渠道包。
4. 如果能力缺失，输出“当前缺少哪项能力”。

---

### 18.4 缺少媒体应用但可自动修复

条件：

- 已有 QA 验收通过渠道包。
- 无媒体应用。
- 有权限创建或共享。

期望：

1. 自动创建或共享媒体应用。
2. 自动继续联调。
3. 不向用户确认是否执行。

---

### 18.5 缺少默认账户授权

条件：

- 无默认账户授权。
- 系统无法自动修复。

期望正文：

```text
当前无法交付

阻塞项：缺少默认账户授权
原因：无法确认应用共享和联调执行账户
下一步：请先完成默认账户授权配置
```

---

### 18.6 进行中状态

条件：

- 联调已发起但未完成。

期望：

1. 正文展示进行中卡片。
2. 不输出最终可交付结论。
3. 右侧 Trace 展示联调任务。

---

## 19. 验收标准

### 19.1 产品验收

1. 点击“验流程 / 获取广告包”后，能进入固定业务流程。
2. 用户按模板提问后，能展示该项目包信息。
3. 包列表一行一个包。
4. 成功时正文只展示可交付包列表。
5. 失败时正文只展示最后阻塞项、原因、下一步。
6. 进行中时正文不输出最终结论。
7. 中间过程进入右侧 Trace / 日志，不污染正文。
8. 能自动化的步骤全部自动化，不追问是否继续。
9. 缺信息时直接提示缺口。
10. 不因 MCP 缺失或失败生成假结果。

### 19.2 技术验收

1. 有独立 intent。
2. 有独立 workflow DSL。
3. 有 workflow runner。
4. 有 3 个一级 Skill。
5. 有 MCP Adapter。
6. 有统一状态枚举。
7. 有统一卡片协议。
8. 有 Trace 写入。
9. 有 blocker 对象。
10. 有单元测试覆盖成功、失败、进行中、能力缺失、权限缺失等场景。

---

## 20. 最终一句话原则

> 用户要的是“能投放的包”，不是工具、流程、日志和解释。  
> 系统能自动推进的全部自动推进；只有真正无法推进时，才在会话正文中用最短路径告诉用户缺什么、为什么、下一步是什么。

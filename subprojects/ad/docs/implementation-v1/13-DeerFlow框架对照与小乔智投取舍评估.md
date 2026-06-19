# DeerFlow 框架对照与小乔智投差距诊断及落地转化矩阵

## 1. 文档定位

本文不是 DeerFlow 概念介绍，也不是建议把小乔智投迁移到 DeerFlow。

本文目标是用 DeerFlow 的成熟 Agent 产品结构作为参照系，对小乔智投当前 Chat / Agent / MCP / Workflow / Skill / Memory / Trace 体系做一次工程化差距诊断，明确：

- 哪些能力小乔已经有，但还不完善。
- 哪些能力小乔还没有，需要新增。
- 哪些当前理解或实现方向是错的，需要纠正。
- 哪些 DeerFlow 能力当前不采纳。
- 哪些内容应写进代码、配置、Tool、知识库或后台管理。

参考来源：

- DeerFlow Documentation: https://deerflow.tech/en/docs
- Core Concepts: https://deerflow.tech/en/docs/introduction/core-concepts
- Harness vs App: https://deerflow.tech/en/docs/introduction/harness-vs-app
- Lead Agent: https://deerflow.tech/en/docs/harness/lead-agent
- Tools: https://deerflow.tech/en/docs/harness/tools

关联小乔文档：

- `docs/design-v1/04A-MCP能力发现与问数归属矩阵.md`
- `docs/design-v1/07A-问数闭环与测试集验收细化设计.md`
- `docs/design-v1/09-包交付与联调系统设计.md`
- `docs/design-v1/10-异常排查系统设计.md`
- `docs/implementation-v1/03-对话路由细节问题评估与落地方案.md`
- `docs/implementation-v1/05-个人记忆与知识库细节问题评估与落地方案.md`
- `docs/implementation-v1/12-Trace与评测细节问题评估与落地方案.md`

## 2. 总体判断

小乔智投短期不应整体迁移 DeerFlow，但必须吸收 DeerFlow 的运行时分层思想。

当前关键问题不是“没有 Agent 框架”，而是已有能力没有形成统一运行时契约：

- 路由已有，但仍容易停留在关键词分类或单 intent。
- MCP 能力发现已有设计和部分实现，但还没有成为所有业务执行前的统一前置环节。
- 问数 MCP 已披露大量能力，问题不应再粗暴归因到 MCP 缺失，而应落到 Chat 映射、slot、字典、后处理、UI、Trace。
- 个人记忆、知识库、受控术语已有设计，但还没有形成用户隔离后的稳定产品闭环。
- Trace 已有设计，但小乔只应发给连弩，不应内建评测平台。
- 包交付、异常排查已有设计，但还缺真实 Workflow 返回样本和状态契约。

因此，13 文档的作用是从 DeerFlow 抽象出一组小乔需要补齐的运行时能力，而不是引入一个新框架替代现有系统。

## 3. 当前事实盘点

### 3.1 已有但不完善

| 能力 | 当前事实 | 不完善点 |
|---|---|---|
| 路由 | `src/ad/xiaoqiao/routing.py` 已有业务关键词、帮助、排查、需求、联调路由 | 仍偏关键词路由，不支持完整 TaskPlan、多意图、能力预检、项目权限冲突 |
| 会话任务 | `src/ad/xiaoqiao/service.py` 已能创建 conversation、task、routing、result | 结果多为结构化 mock/模板，尚未统一真实工具调用闭环 |
| 运行追踪 | `src/ad/xiaoqiao/autonomous_runtime.py` 已有 run、task、checkpoint、review、rework | 这是交付运行追踪，不等于小乔业务 Agent Runtime |
| MCP 服务 | `src/ad/api/routes/mcp.py` 已支持 MCP initialize、tools/list、tools/call | 需要和业务能力发现、schema 适配、错误分类、Trace 统一 |
| 问数能力发现 | `04A-MCP能力发现与问数归属矩阵.md` 已盘点报表 MCP 47 个 tool | 需要落实到运行态快照、测试集映射、tool 选择解释和 UI 验收 |
| 包交付设计 | 09/09A 已定义状态机和 MCP/Workflow 边界 | 缺真实返回样本、状态字段契约、失败 Case 样本 |
| 异常排查设计 | 10 和 08 已定义 Diagnostic OS | 缺诊断 Workflow 返回样本和真实检查项契约 |
| Trace 设计 | 12 已明确小乔发连弩，不做评测平台 | 字段必须继续对齐连弩 SDK 标准 |
| 个人记忆 | 05 已定义个人记忆、个人知识库、受控术语分层 | 用户知识库 Key 配置、同步状态、权限过滤仍需落地 |

### 3.2 还没有或不足以称为已有

| 缺失能力 | 影响 |
|---|---|
| 统一 `AgentRuntimeContract` | Chat、MCP、Workflow、Skill、Trace、资产之间缺少共同运行契约 |
| `TaskPlan` 多任务图 | 一句话多意图、任务依赖、纠错重跑无法稳定表达 |
| `MiddlewarePipeline` | 权限、术语、项目解析、上下文、能力预检、Trace 仍可能散落 |
| 通用 `CapabilityRegistry` | 问数有 Manifest 思路，但包交付、异常、Case、知识库未统一 |
| `ToolCallEnvelope` | 工具调用、错误分类、脱敏错误、解析结果、证据引用缺统一封装 |
| `ArtifactPolicy` | 报表、截图、Case、资产、证据、Trace 的沉淀边界需要系统化 |
| `SubagentPolicy` | 后续诊断、策略、创意、合规是否作为子 Agent，需要边界而不是口号 |

### 3.3 当前错误方向

必须纠正：

- 把 Chat 当成全能业务 Agent。
- 把 MCP / Workflow / Skill 混成一个概念。
- 把知识库当实时项目数据、包状态、权限和联调结论来源。
- 把问数测试集失败默认写成 MCP 缺失。
- 用顶部项目覆盖用户明示项目。
- 工具未真实调用成功时输出“已查询、已检查、已完成”。
- 把 `autonomous_runtime.py` 交付运行追踪等同于小乔业务 Agent Runtime。

## 4. DeerFlow 能力逐项转化矩阵

| DeerFlow 参照能力 | 小乔当前状态 | 需要新增 | 需要补强/纠正 | 不采纳 | 优先级 |
|---|---|---|---|---|---|
| Harness Runtime | 有会话、任务、运行追踪、MCP route，但没有统一业务运行契约 | 新增 `AgentRuntimeContract` | 把路由、上下文、能力、工具、结果、Trace 统一到一条链路 | 不迁移 DeerFlow Harness 代码 | P0 |
| App Reference Product | 小乔已有产品界面、会话、左下角入口、资产规划 | 不新增 App 层 | 保持当前小乔产品形态，不做 DeerFlow 风格产品重构 | 不采用 DeerFlow App UI | P2 |
| Lead Agent | 有关键词路由和任务创建 | 新增“会话总控 Agent”职责定义 | 从单 intent 分类升级为 TaskPlan + 预检 + 执行编排 | 不做裸全能 Agent | P0 |
| Middleware | 有权限、术语、上下文、Trace 的分散设计 | 新增 `MiddlewarePipeline` | 形成固定顺序：输入标准化、术语、项目、权限、上下文、能力预检、Trace | 不让各业务模块各自随意处理权限 | P0 |
| Tool Registry / Tool Groups | 问数有 ReportCapabilityManifest，MCP route 支持 tools/list | 新增全局 `CapabilityRegistry` | 统一 MCP / Workflow / Skill / 内部 API 的注册、健康、schema、scope | 不只用关键词判断能力存在 | P0 |
| MCP Integration | 已有 MCP 服务和问数 MCP 盘点 | 不新增一套 MCP 协议 | 补运行态快照、schema mismatch、字典依赖、tool 选择解释 | 不把 MCP 缺失当默认结论 | P0 |
| Skills | 文档有 Skill / Workflow 边界，但实现不统一 | 新增 `SkillContract` 文档字段要求 | Skill 负责场景方法和轻编排，不替代真实 Tool | 不把 Skill 写成纯 Prompt | P1 |
| Memory | 已定义会话上下文、个人记忆、个人知识库、受控术语 | 新增 `MemoryPolicy` 和用户 Key 配置要求 | 用户隔离、权限过滤、同步状态、纠错管理 | 不直接套 DeerFlow Memory 概念 | P0 |
| Artifact | 有资产、证据、Trace、Case 设计 | 新增 `ArtifactPolicy` | 明确哪些自动入资产、哪些手动保存、哪些只进 Trace | Trace 不作为普通用户资产 | P1 |
| Subagents | 文档提过诊断、策略、创意、合规角色 | 新增 `SubagentPolicy` | 一期只预留，不强行拆多个 Agent | 不在一期做复杂子 Agent 编队 | P2 |
| Context Engineering | 有 TaskContext、历史会话、上下文继承设计 | 新增上下文压缩和失效策略 | 区分会话上下文、项目权限、个人记忆、知识主题 | 不用历史记忆绕过权限 | P0 |
| Human-in-the-loop | Case、写操作确认已有设计 | 不新增复杂审批平台 | 高风险动作确认、Case 创建确认、失败多轮升级 | 不对只读查询过度确认 | P1 |
| Eval / Trace | 已明确连弩负责评测 | 不新增评测平台 | 小乔只发 TraceEnvelope、错误字段、证据引用 | 不在小乔后台做评测用例和评分 | P0 |

## 5. 必须新增的运行时契约

### 5.1 AgentRuntimeContract

目的：定义小乔 Chat 总控如何从用户输入走到真实执行闭环。

最小链路：

```text
UserMessage
  -> Normalize
  -> ControlledGlossary
  -> ProjectResolution
  -> PermissionCheck
  -> ContextMerge
  -> TaskPlan
  -> CapabilityPreflight
  -> ToolCallEnvelope / WorkflowCallEnvelope
  -> ResultParser
  -> ResponseComposer
  -> Trace / Asset / Case / Memory
```

新增原因：当前已有 routing、service、MCP route，但缺少统一运行时 contract，导致文档和代码容易各做各的。

不替代：不替代 MCP、Workflow、Skill，只定义 Chat 总控调用它们的顺序和边界。

### 5.2 TaskPlan

目的：把用户一句话拆成可执行任务图。

必须支持：

- 多意图。
- 任务依赖。
- slot 来源和置信度。
- 纠错后重跑受影响任务。
- 高风险动作确认。
- 能力缺失阻断。

当前纠正点：不能再只输出 `intent_type=help/diagnosis/demand/debugging`。

### 5.3 MiddlewarePipeline

目的：把分散的前置处理变成固定链路。

建议顺序：

1. 输入清洗和语言标准化。
2. 受控术语归一化。
3. 项目/APPID/包/媒体实体解析。
4. 项目权限校验。
5. 会话上下文与个人记忆合并。
6. 能力发现和预检。
7. 风险分级和确认策略。
8. Trace 初始化。

当前纠正点：路由引擎可以追问，但不能在不知道能力是否可执行前盲目补参。

### 5.4 CapabilityRegistry

目的：统一管理 MCP、Workflow、Skill、内部 API、大模型回答能力。

必须记录：

- capability_id。
- domain。
- binding_type：`mcp_tool`、`workflow`、`skill`、`internal_api`、`model_answer`。
- binding_ref。
- status。
- schema_version。
- required_slots。
- project_scope。
- health。
- owner_source。

当前已有基础：问数 `ReportCapabilityManifest` 和 MCP tools/list。  
需要新增：跨问数、包交付、异常、Case、知识库的全局 Registry。

### 5.5 ToolCallEnvelope

目的：真实调用统一封装，避免“工具失败但用户看到成功”。

必须包含：

- call_id。
- capability_id。
- tool_name / workflow_name。
- input_summary。
- raw_input_ref。
- result_status。
- output_summary。
- evidence_refs。
- `tool_error_raw`。
- `tool_error_safe`。
- `tool_error_type`。
- `tool_error_stage`。

当前纠正点：工具调用、错误分类、结果解析、UI 文案必须一致。

### 5.6 MemoryPolicy

目的：统一会话上下文、个人记忆、个人知识库、通用知识库、受控术语。

新增要求：

- 用户配置个人知识库 Key。
- 通用知识库只读。
- 个人记忆写入用户作用域。
- 敏感项目数据不进入自动个人记忆。
- 检索结果必须经当前项目权限过滤。

当前纠正点：不能把 DeerFlow Memory 直接等同于 Dataki 个人知识库。

### 5.7 ArtifactPolicy

目的：定义执行产物怎么沉淀。

规则：

- 即时问数结果：用户保存后才进资产。
- 自动化和定时报表产物：默认进资产。
- Trace：进连弩，不作为普通用户资产。
- Case：进后台需求池/异常池。
- AI 回复：用户手动保存后进 Dataki 个人知识库。

当前纠正点：资产、知识库、Trace、Case 不能混用。

### 5.8 SubagentPolicy

目的：避免“为了多 Agent 而多 Agent”。

一期不新增复杂子 Agent 编队。只预留边界：

- 问数：主链路能力，不单独拆 Agent。
- 包交付：Workflow 优先。
- 异常排查：后续可作为 Diagnosis Agent，但必须调用真实检查能力。
- 指标解释：知识库和口径库优先，不需要子 Agent。
- 策略/创意/合规：后续期再拆。

## 6. 已有能力的补强清单

| 已有能力 | 当前不足 | 补强方向 | 关联实施文档 |
|---|---|---|---|
| 关键词路由 | 只能粗分业务类型 | 升级为 TaskPlan、置信度、预检、追问 | 03 |
| 任务上下文 | 缺项目权限和多任务依赖 | 加 ProjectResolution、ReferenceLedger、TaskGraph | 03、04 |
| MCP tools/list | 未必进入业务能力决策 | 接入 CapabilityRegistry 和 preflight | 06、13 |
| 问数能力 | MCP 已有，但 Chat 映射不足 | 补 slot、字典、schema adapter、UI 四态 | 06 |
| 包交付设计 | 缺返回样本和状态契约 | 补状态流转字段和失败 Case 样本 | 07 |
| 异常排查设计 | 缺真实检查项返回 | 补 checked/unchecked/unable_to_check | 08 |
| 指标解释 | 口径库结构需冻结 | 内部口径优先，外部补充 | 09 |
| Case 草案 | 容易和正式 Case 混淆 | 用户确认后真实创建，返回编号 | 10 |
| 前端状态 | 文案可能和真实状态不一致 | 已查询/已检查/已保存绑定真实事件 | 11 |
| Trace | 字段待连弩冻结 | 只发送，不内建评测 | 12 |

## 7. 不采纳项

当前不采纳：

1. 不整体迁移 DeerFlow 框架。
2. 不采用 DeerFlow App UI 或产品形态。
3. 不一期引入复杂 Subagent 编队。
4. 不把 DeerFlow Memory 直接映射为个人知识库。
5. 不用框架概念替代现有 MCP / Workflow / Skill 服务边界。
6. 不在小乔后台重建连弩评测平台。
7. 不把业务方法论 Skill 当成真实数据 Tool。

## 8. 写死、配置、Tool、知识库的最终归属

| 内容 | 归属 | 示例 |
|---|---|---|
| 安全红线 | 代码写死 | 权限不可绕过；无真实调用不得输出事实；写操作必须确认 |
| 执行链路顺序 | 代码写死 | MiddlewarePipeline、CapabilityPreflight、ToolCallEnvelope |
| 状态枚举 | 代码 + 配置 | 包状态、Case 状态、任务状态、错误分类 |
| 路由权重 | 配置 | intent 权重、能力优先级、追问文案 |
| 受控术语 | ControlledGlossaryIndex | 指标、媒体、项目别名、行业表达 |
| 业务事实 | Tool / MCP / Workflow | 消耗、ROI、包状态、联调报告、Case 编号 |
| 业务方法论 | Skill / 知识库 | 排查 SOP、日报写法、投放方法论 |
| 用户偏好 | 个人记忆 | 默认项目、常用时间、日报格式 |
| 用户沉淀经验 | 个人知识库 | 保存的 AI 回复、案例、问答 |
| 评测规则 | 连弩 | 闭环成功、部分成功、失败闭环成功 |

## 9. 实施优先级

### P0：必须进入当前实施主线

- AgentRuntimeContract。
- TaskPlan。
- MiddlewarePipeline。
- CapabilityRegistry。
- ToolCallEnvelope。
- MemoryPolicy 用户隔离和个人知识库 Key。
- TraceEnvelope 与连弩字段对齐。

### P1：当前实施阶段需要设计冻结，代码可分批

- ArtifactPolicy。
- SkillContract。
- 包交付 Workflow 返回契约。
- Diagnostic Workflow 返回契约。
- Case 创建和更新契约。

### P2：后续期再推进

- SubagentPolicy 的具体子 Agent 编队。
- 策略、创意、合规 Agent。
- DeerFlow 类长任务沙箱或复杂运行时。

## 10. 验收规则

这份评估文档合格的标准不是“能解释 DeerFlow”，而是能约束后续实施：

- 能指出每个 DeerFlow 能力点在小乔里是已有、缺失、需补强、需纠正还是不采纳。
- 能明确新增运行时契约名称和作用。
- 能指出当前错误方向，防止继续做 Chat 假功能。
- 能把问数 MCP 已有能力和 Chat 侧待补能力分开。
- 能把交付运行追踪和业务 Agent Runtime 分开。
- 能把 Trace / 资产 / 知识库 / Case 的沉淀边界分开。
- 能回答“哪些写死、哪些配置、哪些封装 Tool、哪些放知识库”。


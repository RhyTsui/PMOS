# 已知计划 / 目标架构全景图 image2 提示词

用途：后续用于生成《已知计划 / 目标架构全景图》。  
注意：本文只提供 image2 提示词，不生成图片。

## 1. image2 提示词

请生成一张 4K 高清横向企业级目标架构全景图，标题为《小乔智投 Chat 已知计划 / 目标架构全景图》。  
图风格：中文清晰可读，专业 AI 产品架构图，企业级战略规划视觉，类似 OpenAI / 字节 / 腾讯内部架构评审图，白底，高级灰与科技蓝点缀，克制、分层、留白，不要营销海报，不要卡通，不要复杂插画。

请按“Thin Chat Runtime + Fat MCP / Fat Skill”的目标架构绘制，从左到右分层：

1. 用户输入与上下文层
   - 自然语言输入
   - 当前会话上下文
   - 顶部项目选择器
   - 用户显式项目提及
   - 附件与历史结果
   - 用户角色与项目权限
   - 个人记忆
   - 个人知识库 Key
   - 通用知识库
   - 受控术语词典

2. Thin Chat Runtime 层
   - Input Normalizer：计划增强，黄色
   - ControlledGlossaryIndex：计划增强，黄色
   - Intent Router：计划增强，黄色
   - ProjectResolution：计划增强，黄色，标注“显式项目优先，权限前置”
   - PermissionCheck：计划增强，黄色
   - CapabilityPreflight：计划增强，黄色
   - Slot Resolver：当前已有 + 计划增强，绿黄渐变
   - TaskPlan：计划增强，黄色
   - ToolCallEnvelope：计划增强，黄色
   - ResponseContract：计划增强，黄色
   - MessagePart Protocol：计划增强，黄色
   - Trace Adapter：计划增强，黄色

3. Fat MCP / Fat Skill 层
   - 报表问数 MCP：当前已有，绿色
   - 字典 MCP：当前已有 + 计划增强，绿黄渐变
   - 包管理 Workflow / MCP：计划增强，黄色
   - 联调 Workflow / MCP：计划增强，黄色
   - 异常排查 Workflow / MCP：长期规划，紫色
   - 指标口径库 / 知识库：计划增强，黄色
   - Case API：计划增强，黄色
   - 资产沉淀服务：暂不实施，灰色
   - 连弩 Trace / 评测平台：外部系统，灰色边框，标注“小乔只对接 SDK，不内建平台”

4. 业务闭环层
   - 问数闭环：P0 当前第一批，绿色 + 黄色增强
   - 数据与定时报表：P1，黄色
   - 包交付与联调：P1/P2，黄色
   - 异常排查：P1/P2，紫色
   - 指标解释：P1，黄色
   - 需求沟通与 Case：P1，黄色
   - 市场情报：二期，紫色
   - 预测：三期，紫色
   - 广告投放自动化：四期，紫色

5. 前端展示层
   - 保持现有 Header / Sidebar / Workspace / Drawer：绿色，标注“保留，不重构”
   - ChatContainer 内增强渲染：黄色
   - Timeline / Stepper：黄色，标注“执行过程，不展示伪 CoT”
   - Tool Card：黄色
   - ReportQueryResultCard：绿色
   - DataVizRenderer：绿色
   - MessagePart Renderer：黄色，标注“不引入 assistant-ui”
   - SourceRefs / Evidence Strip：黄色
   - ActionList / 下一步建议：黄色

6. 治理与验收层
   - 项目权限 ABAC：计划增强，黄色
   - MCP 调用前权限门禁：计划增强，黄色
   - 错误脱敏：计划增强，黄色
   - Trace 字段对齐连弩 SDK：计划增强，黄色
   - 问数测试集自测：当前已有测试入口，绿色
   - 发布门禁：计划增强，黄色

请用主链路箭头表达：
用户输入 -> Input Normalizer -> 术语归一 -> Intent Router -> ProjectResolution/PermissionCheck -> CapabilityPreflight -> Slot Resolver -> Fat MCP/Fat Skill -> Result Parser -> ResponseContract -> MessagePart -> ChatContainer 渲染 -> 下一步建议/证据/Trace。

请用泳道标出四种流：
- Runtime 控制流
- Tool 调用流
- 数据结果流
- UI 渲染流

请在图右侧画出演进路线：

Phase 0：当前已实现基础  
Phase 1：问数最低闭环  
Phase 2：包交付、异常排查、指标解释、Case  
Phase 3：定时报表增强、个人知识库、资产沉淀  
Phase 4：市场情报、预测、广告投放自动化

其中 Phase 1 必须突出：
- 项目权限冲突修复
- 能力发现与预检
- 真实 MCP 调用
- Result Protocol / MessagePart
- Timeline / Tool Card / 四态展示
- Trace 最小记录

请额外标出“不做/暂缓”区域：
- assistant-ui：灰色，标注“不引入”
- 页面框架重构：灰色，标注“不重构 Header/Sidebar/Workspace/Drawer”
- 小乔内建评测平台：灰色，标注“由连弩负责”
- 资产与证据沉淀：灰色，标注“用户要求先不做”

## 2. 图中结构说明

目标架构不是引入复杂 Multi-Agent 框架，而是把 Chat 收敛为薄运行时：

- Chat 负责意图、上下文、权限、能力预检、调用编排、结果协议和展示组织。
- MCP / Workflow / Skill 负责真实业务执行。
- 前端只消费结构化结果，不再从自然语言猜测业务状态。
- Trace 与评测只做 SDK 对接，不在小乔后台内建评测平台。

## 3. 图例定义

- 当前已有：绿色实线节点。
- 计划增强：黄色节点。
- 长期规划：紫色节点。
- 风险项：红色边框节点。
- 暂不实施：灰色节点。
- 外部系统：灰色虚线外框。
- 主链路：粗实线箭头。
- 可选链路：细虚线箭头。
- 风险依赖：红色虚线箭头。

## 4. 节点颜色规则

- 绿色：当前代码已有且可继续复用。
- 黄色：第一批或近期计划增强。
- 紫色：长期规划，不进入第一批。
- 红色：当前必须规避或修复的风险。
- 灰色：暂不实施或外部负责。

## 5. 风险区域说明

1. 项目权限：必须在 MCP 调用前解决，禁止用顶部项目覆盖用户显式项目。
2. 能力发现：必须先发现能力再补参，避免补齐后无法执行。
3. MessagePart：必须落地，否则前端继续依赖散落字段。
4. 假闭环：前端不能显示“已查询/已检查/已保存”，除非真实服务返回成功。
5. 个人记忆：必须按用户隔离，禁止固定用户 Key。
6. assistant-ui：已撤回，不纳入目标架构。
7. 资产沉淀：用户已要求暂缓，不进入当前实施。

## 6. 后续演进路线

### Phase 0：当前基础

- 保留现有页面框架。
- 复用 MCP 管理、问数编排、报表卡、数据可视化。
- 保留会话 store 与 send message API。

### Phase 1：问数最低闭环

- 修复项目解析与权限冲突。
- 完成能力发现与 preflight。
- 打通真实 MCP 调用、字典解析、结果解析。
- 落地 ResponseContract / MessagePart。
- 前端完成四态展示、Timeline、Tool Card、来源和下一步建议。
- Trace 做最小记录。

### Phase 2：业务链路扩展

- 包交付状态机。
- 联调触发与失败 Case。
- 异常排查 Workflow。
- 指标解释内部口径优先。
- 需求沟通与 Case 创建。

### Phase 3：沉淀与自动化

- 定时报表增强。
- 个人知识库 Key 与记忆隔离。
- 资产与证据沉淀。
- 自动化任务跨项目权限处理。

### Phase 4：战略扩展

- 市场情报。
- 预测。
- 广告投放自动化。
- 更完整的行业通用 + 内部业务融合回答。


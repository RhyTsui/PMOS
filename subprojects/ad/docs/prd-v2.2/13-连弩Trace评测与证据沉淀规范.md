# 连弩 Trace、评测与证据沉淀规范

## 1. 边界

Trace、评测、回放和证据规则发送到连弩平台。小乔后台不重建评测平台。

小乔负责生成和发送结构化记录，连弩负责完整回放、评测管理、证据规则和测试平台能力。

## 2. 小乔需要记录什么

小乔每次关键交互需要记录：

- 用户。
- 角色。
- 项目。
- 顶部项目。
- 用户明示项目。
- 最终请求项目。
- 会话。
- 消息。
- 意图。
- 受控术语归一化结果。
- 候选意图和最终路由原因。
- 路由结果。
- 能力注册结果。
- slot 继承、缺失和追问阶段。
- 项目冲突处理结果。
- 权限预检结果。
- 追问。
- Workflow Run。
- Skill Call。
- MCP Call。
- Evidence。
- Asset。
- Case。
- 最终完成状态。

## 3. TraceMetadata

```ts
type TraceMetadata = {
  trace_id: string
  conversation_id?: string
  message_id?: string
  workflow_run_id?: string
  skill_call_id?: string
  user_id: string
  role_id: string
  project_refs: string[]
  ui_selected_project_ref?: string
  explicit_project_refs?: string[]
  effective_project_refs?: string[]
  project_resolution_source?: string
  project_conflict_detected?: boolean
  intent: string
  route_result: string
  capability_id?: string
  capability_status?: string
  tool_calls: ToolCallRecord[]
  evidence_refs: EvidenceRef[]
  asset_refs?: string[]
  case_refs?: string[]
  completion_status: 'completed' | 'partial' | 'failed' | 'waiting'
}
```

## 4. 证据沉淀

Evidence 不等于日志。Evidence 用于证明系统为什么得出某个业务结论。

典型 Evidence：

- 数据查询结果。
- 数据更新时间。
- 指标口径来源。
- 上报检查报告。
- 联调日志。
- 联调截图。
- 媒体后台版本检测结果。
- 用户确认过的信息。
- Workflow 状态事件。
- 外部资料来源。

## 5. 失败闭环记录

失败时必须记录：

- 用户原始问题。
- 系统识别意图。
- 已确认信息。
- 缺失信息。
- 已调用能力。
- 调用结果。
- 失败原因。
- 是否生成 Case。
- 下一步建议。

这类记录是后续优化路由、追问、能力注册和 Skill 封装的基础。

## 6. 路由评测集

连弩评测集至少覆盖：

- 查数和指标解释混淆。
- 查包状态和触发联调混淆。
- 数据异常和包异常混淆。
- 内部简称与行业术语差异。
- 当前项目、历史会话默认项目和跨项目查询。
- 顶部项目 A、用户明示 B 时请求 B。
- 顶部项目 A、用户明示无权限 B 时阻断且不回退到 A。
- 用户项目权限变化。
- 能力未接入。
- 工具调用失败。
- 工具返回无法解析。
- 多轮追问后仍无法明确。

评测通过不能只看最终文案是否顺畅，必须检查路由、能力发现、追问、真实调用、结果解析、Evidence、Trace 和 Case 是否完整。

## 7. 权限和回放

前台会基于项目权限动态过滤内容，但 Trace 在连弩平台应保持完整回放能力。连弩回放的可见性由连弩平台权限和审计规则控制。

小乔不能因为前台隐藏了部分项目内容，就丢弃 Trace 原始引用。

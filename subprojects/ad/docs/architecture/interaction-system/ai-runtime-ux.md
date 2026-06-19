# AI Runtime UX Specification

> Canonical path: `docs/architecture/interaction-system/ai-runtime-ux.md`  
> Depends on: `RuntimeDisplayProtocol`, `ActionContract`, `Component Registry`  
> Scope: AI 执行过程、工具调用、Trace、错误、重试、审批、多 Agent 的体验规范

## 1. 文档定位

AI Runtime UX 是 Interaction System 下的运行态体验域。

它不定义新的协议，必须使用：

```txt
RuntimeDisplayProtocol
ActionContract
ComponentBinding = ai-runtime / workflow-trace
```

## 2. 基本体验原则

1. 普通用户看“可理解的进度”，不是底层日志。
2. 管理员和开发者可以展开 trace。
3. Runtime 过程不抢占最终结果。
4. 失败状态必须可解释、可恢复。
5. 等待用户确认时必须明确阻塞原因和风险。
6. 工具调用必须脱敏。

## 3. 状态展示

| RuntimeStatus | 用户文案 | 展示方式 |
|---|---|---|
| queued | 已加入队列 | 轻量状态条 |
| planning | 正在规划分析步骤 | 思考状态 |
| running | 正在执行 | 进度条 / timeline 摘要 |
| streaming | 正在生成回答 | 流式输出 |
| waiting-for-user | 需要你的补充 | 输入提示 |
| waiting-for-approval | 等待确认 | 审批卡 |
| retrying | 正在重试 | 状态条 + 尝试次数 |
| recovering | 正在恢复 | 恢复提示 |
| succeeded | 已完成 | 自动收起 runtime |
| partially-succeeded | 部分完成 | 展示失败项 |
| failed | 执行失败 | 错误卡 + retry |

## 4. 模型生成状态

普通用户展示：

```txt
正在理解问题
正在分析数据
正在组织回答
```

管理员可展开：

```txt
model id
latency
token count
stream chunks
truncation / context compression status
```

禁止展示：

```txt
系统 prompt
密钥
完整隐藏上下文
未脱敏内部参数
```

## 5. 工具调用卡

工具调用卡分两层：

```txt
普通摘要层：工具名称、状态、耗时、结果摘要
高级详情层：输入摘要、输出摘要、错误、重试、artifact
```

字段展示：

| 字段 | 普通用户 | 管理员 |
|---|---|---|
| toolDisplayName | 显示 | 显示 |
| toolName | 隐藏或弱显示 | 显示 |
| inputSummary | 显示脱敏摘要 | 显示脱敏详情 |
| outputSummary | 显示 | 显示 |
| raw input | 不显示 | 视权限显示 |
| raw output | 不显示 | 视权限显示 |
| error code | 简化 | 完整 |

## 6. Trace 展示

默认策略：

```txt
普通用户：默认折叠，只看关键节点
管理员：可展开完整 timeline
开发者：可查看 event payload 脱敏版
```

Trace 展示形态：

```txt
compact timeline
expanded timeline
DAG viewer
step detail drawer
error focus view
```

规则：

1. 高频事件必须合并。
2. 失败节点必须自动定位。
3. 成功完成后 runtime 默认折叠。
4. Trace 不得压过最终 answer。

## 7. 错误与重试

错误卡必须包含：

```txt
用户可理解原因
影响范围
是否已产生部分结果
可选恢复动作
retry action
联系管理员提示，可选
```

规则：

1. 可重试错误必须显示 retry。
2. 权限错误显示申请权限，而不是 retry。
3. 数据为空不是系统错误，应走 empty-state。
4. 多次失败后必须降级，避免无限 retry。

## 8. 等待用户确认

等待确认使用 `decision-card` 或 `ai-runtime` 区块。

必须显示：

```txt
要执行什么
为什么需要确认
风险等级
影响对象
证据 / 来源
确认 / 拒绝 action
```

规则：

1. 风险动作必须二次确认。
2. 审批动作走 ActionContract。
3. 审批完成写入 RuntimeEvent。

## 9. 多 Agent 展示

多 Agent 展示必须区分：

```txt
Agent 名称
Agent 角色
当前状态
产出摘要
依赖关系
```

推荐展示：

```txt
Agent chips
Agent timeline lanes
Workflow DAG node group
```

规则：

1. 不同 Agent 的错误必须可定位。
2. Agent 内部 prompt 默认不展示。
3. Agent 最终产出必须进入 SemanticResultContract。

## 10. 可见性差异

| 内容 | 普通用户 | 管理员 | 开发者 |
|---|---|---|---|
| 模型状态 | 摘要 | 详情 | 详情 |
| 工具名称 | 业务名 | 业务名 + 内部名 | 完整 |
| Tool input | 摘要 | 脱敏详情 | 权限内详情 |
| Trace payload | 不显示 | 脱敏 | 权限内完整 |
| Latency | 可选 | 显示 | 显示 |
| Error code | 简化 | 完整 | 完整 |

## 11. 折叠策略

默认折叠：

```txt
成功完成的 tool call
高频 model-token event
内部 workflow step
管理员详情
```

默认展开：

```txt
当前正在执行的步骤
等待用户确认
失败步骤
部分成功说明
```

## 12. 验收清单

- [ ] Runtime UX 不定义新协议。
- [ ] Runtime UI 来自 RuntimeDisplayProtocol。
- [ ] retry / approval 走 ActionContract。
- [ ] 普通用户和管理员展示不同。
- [ ] 工具调用脱敏。
- [ ] 失败可解释、可恢复。

---

## v0.2 总纲一致性补充

AI Runtime UX 展示运行过程，但不得覆盖主消息业务结果。MCP business error、Trace fail-open、Resolver Chain 决策和 Evidence Ledger 明细应优先进入右侧披露，主消息只给用户可理解摘要和下一步动作。

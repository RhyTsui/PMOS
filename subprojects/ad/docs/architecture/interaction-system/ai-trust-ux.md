# AI Trust UX Specification

> Canonical path: `docs/architecture/interaction-system/ai-trust-ux.md`  
> Depends on: `EvidenceRef`, `SourceRef`, `ActionContract`, `SemanticResultContract`  
> Scope: 可信解释、证据、来源、置信度、新鲜度、AI 推断、风险提示的体验规范

## 1. 文档定位

AI Trust UX 是 Interaction System 下的可信体验域。

它不定义新的 evidence/source 协议，必须复用：

```txt
EvidenceRef
SourceRef
ActionContract
SemanticResultContract.evidenceRefs / sourceRefs
```

## 2. 哪些内容必须显示证据

必须显示证据或证据入口：

1. 指标变化原因。
2. 异常归因。
3. AI Insight。
4. 风险建议。
5. 预算 / 投放 / 账户 / 权限相关建议。
6. 排名、对比、最优、最差判断。
7. 预测、估算、推断。
8. 继续分析建议。
9. 自动化执行建议。
10. 用户可能据此做业务决策的结论。

## 3. 证据展示层级

### L1：轻量标识

```txt
有证据
数据截至 2026-05-26
高置信度
```

### L2：证据摘要

```txt
证据标题
摘要
来源数量
置信度
新鲜度
```

### L3：证据详情

```txt
字段值
计算过程
查询结果
文档片段
工具输出摘要
脱敏说明
```

## 4. 置信度展示

| Confidence | 展示文案 | 使用限制 |
|---|---|---|
| high | 高可信 | 可作为明确结论 |
| medium | 中等可信 | 建议用户复核 |
| low | 低可信 | 只能作为线索 |
| unknown | 可信度未知 | 不得作为确定结论 |

规则：

1. 低置信度结论必须使用“可能”、“建议复核”等语气。
2. 高风险动作不能只基于低置信度证据。
3. 置信度不是模型自信度的简单外显，必须说明 basis。

## 5. AI 推断与真实数据区分

必须区分：

```txt
真实数据              来自 SourceRef 的数据
计算结果              基于数据和公式得到
AI 推断               模型根据证据做出的解释
人工确认              人类审批或确认
```

展示标签：

```txt
Data-backed
Calculated
AI-inferred
Human-approved
```

中文可用：

```txt
数据支持
计算得出
AI 推断
人工确认
```

规则：

1. AI 推断不能伪装为真实数据。
2. 图表观察属于 AI 推断或 chart-observation evidence。
3. 人工确认必须有时间和角色。

## 6. 来源不可见与脱敏

来源不可见时展示：

```txt
来源受权限限制
部分字段已脱敏
你没有权限查看该来源
可申请权限
```

规则：

1. 不可见来源不代表无来源。
2. 脱敏后仍应保留来源类型和新鲜度，除非会泄露敏感信息。
3. 申请权限动作必须走 ActionContract。

## 7. 数据新鲜度

数据类结果必须展示：

```txt
数据截至时间
生成时间，可选
来源更新时间，可选
是否过期
```

文案示例：

```txt
数据截至 2026-05-26 23:59
数据可能不是最新
数据新鲜度未知
该结果基于过期数据，不建议直接用于决策
```

规则：

1. `stale` 数据结论需要警示。
2. `expired` 数据结论不能触发高风险自动化动作。
3. 新鲜度未知时必须弱化结论确定性。

## 8. 幻觉风险提示

以下场景必须提示风险：

1. 无 evidence 的 AI 推断。
2. Source 不可见或 unknown。
3. 低置信度。
4. 数据过期。
5. 模型根据不完整上下文生成建议。
6. 工具调用失败后仍给出部分建议。

提示方式：

```txt
Inline warning
Evidence badge
Trust panel
Action confirm warning
```

## 9. 风险建议确认

风险建议包括：

```txt
调整预算
暂停投放
修改权限
删除数据
对外发送报告
执行自动化 workflow
```

必须包含：

```txt
风险等级
影响对象
证据
来源
确认动作
拒绝动作
审计记录
```

## 10. Trust Panel

Trust Panel 推荐内容：

```txt
证据列表
来源列表
数据新鲜度
置信度
AI 推断说明
脱敏说明
运行态引用，可选
```

## 11. 验收清单

- [ ] 所有 AI Insight 有证据入口。
- [ ] AI 推断和真实数据有区分。
- [ ] 数据新鲜度可见。
- [ ] 来源不可见时有脱敏提示。
- [ ] 风险建议需要确认。
- [ ] 低置信度不会被展示为确定结论。

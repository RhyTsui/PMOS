# Evidence Contract Specification

> Canonical path: `docs/architecture/semantic-contract/evidence-contract.md`  
> Type source: `frontend/src/src/contracts/semantic/evidence-contract.ts`  
> Scope: 结论、洞察、建议、风险判断、异常解释的证据统一协议

## 1. 文档定位

`EvidenceRef` 是 AI Chat OS 的证据引用协议。

它回答的问题是：

```txt
这个结论为什么可信？它依据什么数据、计算、文档、工具输出或人工确认？
```

`EvidenceRef` 不等于 `SourceRef`：

```txt
SourceRef = 来源在哪里
EvidenceRef = 支撑某个结论的证据是什么
```

## 2. 必须挂证据的内容

以下内容必须挂 `EvidenceRef`：

1. 指标异常解释。
2. 归因结论。
3. 趋势判断。
4. 风险建议。
5. 预算、投放、权限、账户相关建议。
6. AI Insight。
7. 预测、估算、推断。
8. 排名、对比、最佳 / 最差判断。
9. 需要用户执行动作的建议。
10. 任何可能影响业务决策的结论。

## 3. EvidenceType

推荐初始枚举：

```txt
metric-value            指标值
data-row                数据行
data-snapshot           数据快照
query-result            查询结果
calculation             计算过程
chart-observation       图表观察
document-excerpt        文档片段
tool-output             工具输出
runtime-trace           运行态 trace 摘要
human-approval          人工确认
model-output            模型输出
experiment-result       实验结果
external-reference      外部引用
policy-rule             规则 / 策略
unknown                 未知证据
```

规则：

1. `model-output` 不能单独支撑高风险业务建议。
2. `unknown` 只能作为降级状态，不得作为可信证据展示。
3. `runtime-trace` 可作为执行证明，但不等于业务数据证据。

## 4. 核心结构

```txt
EvidenceRef
├─ id
├─ type
├─ title
├─ summary
├─ sourceRefIds[]
├─ artifactRef
├─ locator
├─ fields
├─ confidence
├─ freshness
├─ permission
├─ redaction
├─ verification
└─ metadata
```

## 5. Confidence

置信度描述证据支持强度。

字段：

```txt
level                   high / medium / low / unknown
score                   0 到 1，可选
basis                   source / calculation / human / model / heuristic / mixed
explanation             简短解释
```

展示规则：

| level | 展示策略 |
|---|---|
| high | 可作为明确结论 |
| medium | 可作为建议或倾向 |
| low | 必须显示不确定性 |
| unknown | 不得作为确定结论 |

## 6. Freshness

数据类证据必须提供新鲜度。

字段：

```txt
asOf                    数据截止时间
generatedAt             证据生成时间
retrievedAt             证据读取时间
status                  fresh / stale / expired / unknown
maxAgeMs                最大可接受年龄
```

规则：

1. 数据证据必须显示 `asOf` 或等效文案。
2. `stale` 证据支撑的结论必须显示过期提示。
3. `expired` 证据不得支撑确定结论。

## 7. Permission / Redaction

证据可以不可见，但结论必须解释证据受限。

常见场景：

```txt
可见证据              正常展示
部分脱敏              展示摘要 + 脱敏字段
无权限                展示“证据受权限限制”
来源删除              展示“证据来源不可用”
```

规则：

1. 不可见证据不得泄露字段名、表名、客户名、账户名。
2. 证据不可见时，不得伪装为无证据。
3. 管理员可见不等于普通用户可见。

## 8. Evidence 与 Source 的关系

一个 evidence 可以引用多个 source：

```json
{
  "id": "ev_001",
  "type": "calculation",
  "sourceRefIds": ["src_cost", "src_conversion"]
}
```

一个 source 也可以支撑多个 evidence。

规则：

1. Evidence 必须尽量引用 Source。
2. Source 不足以替代 Evidence。
3. Evidence 是结论级引用，Source 是出处级引用。

## 9. Evidence Panel 展示规则

默认展示：

```txt
证据标题
证据摘要
来源数量
数据截止时间
置信度
可展开详情
```

高级模式展示：

```txt
字段级证据
查询结果
计算公式
运行工具
来源详情
脱敏说明
```

## 10. 最小示例

```json
{
  "id": "ev_cpa_increase_calc",
  "type": "calculation",
  "title": "CPA 周环比上升计算",
  "summary": "本周 CPA 较上周上升 18.4%，主要来自 Channel A 的成本增长。",
  "sourceRefIds": ["src_ads_daily"],
  "fields": {
    "metric": "CPA",
    "currentValue": 42.3,
    "previousValue": 35.7,
    "deltaPct": 0.184
  },
  "confidence": {
    "level": "high",
    "basis": "calculation"
  },
  "freshness": {
    "asOf": "2026-05-26T23:59:59+08:00",
    "status": "fresh"
  }
}
```

## 11. 验收清单

- [ ] 所有 AI Insight 都挂 EvidenceRef。
- [ ] 所有风险建议都挂 EvidenceRef。
- [ ] 所有数据类 evidence 都有 freshness。
- [ ] Evidence 与 Source 分离。
- [ ] 低置信度证据不会被展示为确定结论。
- [ ] 权限受限证据有脱敏或解释。

---

## v0.2 总纲一致性补充

`EvidenceRef` 是 Evidence Ledger 的引用视图，不再被视为完整证据容器。完整 tool output、source quote、file chunk、calculation、model inference、artifact 与 task state 应进入 `semantic-contract/evidence-ledger.md` 定义的账本，再由主消息和右侧披露按权限投影。

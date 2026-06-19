# Source Contract Specification

> Canonical path: `docs/architecture/semantic-contract/source-contract.md`  
> Type source: `frontend/src/src/contracts/semantic/source-contract.ts`  
> Scope: 数据、文档、工具、人工输入、系统对象的来源统一协议

## 1. 文档定位

`SourceRef` 是 AI Chat OS 的来源引用协议。

它回答的问题是：

```txt
这个数据、证据或结论来自哪里？来源是否可见、是否新鲜、是否可靠？
```

## 2. SourceType

推荐初始枚举：

```txt
warehouse-table         数仓表
warehouse-query         数仓查询
api                     API
file                    文件
document                文档
url                     URL
email                   邮件
spreadsheet             表格文件
chart                   图表
report                  报告
artifact                系统 artifact
tool                    工具输出
runtime                 运行态对象
human                   人工输入
model                   模型输出
system                  系统配置
policy                  策略 / 规则
unknown                 未知来源
```

规则：

1. `model` 来源不能单独支撑事实性结论。
2. `unknown` 来源只能作为降级状态。
3. 涉及外部 URL 必须经过安全校验。

## 3. 核心结构

```txt
SourceRef
├─ id
├─ type
├─ title
├─ description
├─ locator
├─ owner
├─ retrievedAt
├─ freshness
├─ permission
├─ redaction
├─ reliability
├─ citationPolicy
└─ metadata
```

## 4. Locator

`locator` 描述来源如何定位。

推荐类型：

```txt
table                   表名 / schema / partition
query                   query id / SQL hash
file                    file id / path / version
document                document id / section / anchor
url                     normalized URL
artifact                artifact id
runtime                 runtime id / event id
tool                    tool name / call id
human                   user id / role / timestamp
```

规则：

1. 前端不得直接暴露敏感 locator。
2. locator 可以被脱敏。
3. 可点击来源必须走 `ActionContract(type=open-source)`。

## 5. Freshness

字段：

```txt
asOf                    数据截止时间
retrievedAt             读取时间
updatedAt               来源更新时间
status                  fresh / stale / expired / unknown
staleReason             过期原因
```

展示规则：

| status | 展示 |
|---|---|
| fresh | “数据截至 …” |
| stale | “数据可能不是最新” |
| expired | “数据已过期，不建议用于决策” |
| unknown | “数据新鲜度未知” |

## 6. Reliability

字段：

```txt
level                   verified / trusted / user-provided / model-generated / unknown
explanation             可靠性说明
```

规则：

1. `model-generated` 不能作为事实来源。
2. `user-provided` 需要在高风险场景提示来源为用户输入。
3. `verified` 来源可作为高置信度证据基础。

## 7. Permission / Redaction

来源可能包含敏感信息。

脱敏等级：

```txt
none                    不脱敏
partial                 部分脱敏
full                    完全隐藏
```

规则：

1. 无权限来源不得暴露原始 URI、表名、客户名、邮箱、账户名。
2. 可点击来源必须先过权限判断。
3. 只要 source 不可见，引用它的 evidence 也必须显示受限状态。

## 8. CitationPolicy

字段：

```txt
required                是否必须引用
format                  inline / panel / footnote / hidden
clickable               是否可点击
quoteAllowed            是否允许展示原文摘录
maxQuoteLength          最大摘录长度
```

规则：

1. 外部文档引用默认不大段复制原文。
2. 高风险结论默认要求可追溯 citation。
3. 不可点击来源仍应显示脱敏来源类型。

## 9. 最小示例

```json
{
  "id": "src_ads_daily",
  "type": "warehouse-table",
  "title": "ads_performance_daily",
  "description": "广告投放日粒度表现数据",
  "locator": {
    "kind": "table",
    "value": "warehouse.marketing.ads_performance_daily",
    "redacted": false
  },
  "freshness": {
    "asOf": "2026-05-26T23:59:59+08:00",
    "retrievedAt": "2026-05-27T10:00:00+08:00",
    "status": "fresh"
  },
  "reliability": {
    "level": "verified",
    "explanation": "来自生产数仓 ETL 完成后的正式表。"
  },
  "permission": {
    "requiredPermissions": ["ads.performance.read"],
    "deniedBehavior": "redact"
  }
}
```

## 10. 验收清单

- [ ] 所有 EvidenceRef 能追溯 SourceRef。
- [ ] Source freshness 可展示。
- [ ] Source 权限和脱敏独立处理。
- [ ] 不存在图表、报告、表格私有 source 结构。
- [ ] 可点击来源统一通过 ActionContract。

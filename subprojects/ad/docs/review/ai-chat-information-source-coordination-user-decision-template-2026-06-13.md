# 通用 Chat 信息源协同用户审查结论模板

- status: `user_reviewed_runtime_authorized`
- review packet: `docs/review/ai-chat-information-source-coordination-review-packet-2026-06-13.md`
- design: `docs/architecture/request-understanding/information-source-coordination-design.md`
- sample set: `docs/review/ai-chat-information-source-coordination-sample-set-2026-06-13.md`

## 1. 审查结论

请选择一个结论：

- `approve_design`: 认可设计方案，可进入 runtime 实施计划。
- `revise_design`: 认可大方向，但需要先修改设计或样例集。
- `reject_design`: 不认可核心顺序、权威等级或业务域治理方式，需要重做方案。

当前结论：`user_reviewed_runtime_authorized`

说明：2026-06-13 用户已回复“已审核”，随后明确“授权 runtime 实施”。由于未明确选择 `approve_design / revise_design / reject_design`，本记录不倒填三态结论；但 runtime 实施已获得用户授权。

## 2. 必须确认的核心判断

| 判断项 | 结论 | 备注 |
|---|---|---|
| 主顺序采用“先理解证据需求 -> 并行候选 -> 仲裁 -> 执行取证 -> Composer” | `pending` |  |
| Capability Discovery 是候选生成中的权威输入，不是全局前置主脑 | `pending` |  |
| 公开联网拆成 need candidate 和 evidence candidate | `pending` |  |
| 默认权威等级为 MCP/API > 内部知识库 > 公开联网 > model-only > clarify | `pending` |  |
| 显式联网不能覆盖内部数据能力 | `pending` |  |
| 业务域需要保留，但只能治理化存在 | `pending` |  |
| Composer 只能消费 Evidence Ledger / SourceRef / ToolCallTrace / ArbitrationSummary / safe context | `pending` |  |
| 样例集可作为后续非硬编码回归来源 | `pending` |  |

## 3. 如需修改，请填写

需要修改的部分：

- `sequence`
- `priority`
- `public_web_policy`
- `knowledge_policy`
- `intentorch_boundary`
- `context_boundary`
- `business_domain_governance`
- `composer_contract`
- `sample_set`
- `other`

修改意见：

```txt
待填写
```

## 4. 进入 runtime 实施前的附加要求

可选要求：

- 补充更多真实 B 端样例。
- 先做代码现状差距审计。
- 先把样例集转成 golden / regression。
- 先扩展专家委员会复审。
- 先由用户确认 Admin policy / metric catalog / capability manifest 的治理边界。

用户指定要求：

```txt
待填写
```

## 5. 审查后状态流转

| 用户结论 | 状态流转 | 下一步 |
|---|---|---|
| `approve_design` | `waiting_for_runtime_plan` | 制定 runtime 实施计划和验证计划 |
| `revise_design` | `design_revision_required` | 修改设计/样例集后重新专家复审 |
| `reject_design` | `design_rework_required` | 重新定义主顺序、优先级或业务域治理方案 |

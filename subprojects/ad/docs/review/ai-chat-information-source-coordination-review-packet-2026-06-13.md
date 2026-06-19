# 通用 Chat 信息源协同用户审查包

- status: `user_reviewed_runtime_authorized`
- scope: 公开联网、内部 MCP/API、知识库、IntentOrch、用户上下文在 Planner / Evidence / Composer 中的协同策略
- current conclusion: `design_pass_runtime_gate_pending`
- runtime implementation: first slice implemented and partially accepted
- runtime acceptance: `docs/review/ai-chat-general-capability-acceptance-report-2026-06-13.md`
- user review: 2026-06-13 用户已审核；随后明确授权 runtime 实施。
- latest runtime slice: 2026-06-13 已补充 knowledge candidate runtime 状态记录，开放回答使用实际知识库命中状态，问数分支记录 `not_collected_in_report_pre_execution`。

## 1. 阅读顺序

建议按下面顺序审查：

1. `docs/review/ai-chat-information-source-coordination-user-review-brief-2026-06-13.md`
   - 最短入口，说明核心结论、取舍、专家委员会状态和需要你拍板的问题。
2. `docs/review/ai-chat-information-source-coordination-sample-set-2026-06-13.md`
   - 真实样例集草案，用来判断方案是否会误杀 B 端数据场景。
3. `docs/review/ai-chat-information-source-coordination-objective-audit-2026-06-13.md`
   - 逐条映射用户原始目标到当前材料，说明哪些已设计覆盖，哪些仍 pending。
4. `docs/architecture/request-understanding/information-source-coordination-design.md`
   - 完整设计方案，包含推理、候选定义、优先级、冲突矩阵、反模式阻断。
5. `docs/review/ai-chat-information-source-coordination-design-review-2026-06-13.md`
   - 专家委员会复审记录，包含初审 `revise`、修订点和复审 `pass`。
6. `docs/review/ai-chat-information-source-coordination-user-decision-template-2026-06-13.md`
   - 用户审查结论模板，用于明确 `approve_design / revise_design / reject_design`。
7. `docs/review/ai-chat-general-capability-acceptance-report-2026-06-13.md`
   - 第一阶段 runtime 后验验收报告，说明哪些已通过、哪些仍不能宣称完成。

## 2. 当前已形成的设计结论

本方案不采用：

- “先查能力再候选”
- “先排查再查能力再候选”

推荐主路径：

```txt
先理解当前轮目标和证据需求
-> 同步形成五类候选
-> 仲裁候选和风险
-> 按仲裁结果执行取证
-> 对证据再次做采纳/拒绝
-> Composer 只基于证据和仲裁摘要回答
-> ContractSafety 兜底
```

默认权威等级：

```txt
MCP/API > 内部知识库 > 公开联网 > model-only > clarify
```

公开联网拆成两段：

- `public_web_need_candidate`：是否值得查公开信息。
- `public_web_evidence_candidate`：查到的公开来源是否可靠、相关、可引用。

业务域结论：

- 业务域需要保留，否则 B 端数据产品不可用。
- 业务域只能治理化存在，进入 capability manifest、tool metadata、metric catalog、knowledge policy、public web policy、Admin policy、governed seed 或 Prompt variable schema。
- 业务域不能散落在 runtime `includes()`、Prompt 中文 if/else、renderer 关键词判断或单个验收样例里。

## 3. 专家委员会状态

初审结论：`revise`

初审问题：

- 公开联网 need 仍可能被理解成先抢路径。
- Capability Discovery 位置不够精确。
- 知识库在问数混合场景中的角色不够清楚。
- 业务域治理边界不够硬。
- Composer 输入边界不够严格。

修订后结论：`design_pass_runtime_gate_pending`

含义：

- 专家委员会认为设计方向可给用户审查。
- 设计可作为后续 runtime 实施门禁。
- 但不能宣称 runtime 已完成。

## 4. 需要用户拍板的事项

1. 是否认可推荐主路径。
2. 是否认可 Capability Discovery 是“候选生成中的权威输入”，不是全局前置主脑。
3. 是否认可公开联网两阶段。
4. 是否认可内部 MCP/API、内部知识库、公开联网的默认权威等级。
5. 是否认可显式联网不能覆盖内部数据能力。
6. 是否认可业务域保留但治理化。
7. 是否认可样例集作为后续非硬编码回归来源。
8. 是否要求补更多真实业务样例后再实施。
9. 审查结论是 `approve_design`、`revise_design` 还是 `reject_design`。

## 5. 当前不能宣称完成

- 不能宣称用户已经审查通过。
- 不能宣称 `/api/chat` 全量真实链路已经通过；目前只是 FactNeed、公开联网门禁、内部数据优先和基础 ResponseContract/Trace slice 通过。
- 不能宣称问数分支知识库候选已完整落地。
- 不能宣称所有 Composer 路径都已完成 raw payload 隔离。
- 不能把已有最小 runtime 修复视作最终完成。

## 6. 下一阶段建议

用户审查后有三种路径：

| 用户结论 | 下一步 |
|---|---|
| 认可方案和样例集 | 将样例集转成非硬编码回归，进入 runtime 实施计划 |
| 认可大方向但要补场景 | 先扩充样例集和冲突矩阵，再复审 |
| 不认可核心顺序或权威等级 | 修改设计方案，专家委员会重新评审 |

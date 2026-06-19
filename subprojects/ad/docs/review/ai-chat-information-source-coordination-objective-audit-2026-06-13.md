# 通用 Chat 信息源协同目标满足度审计表

- status: `waiting_for_user_review`
- objective source: 用户目标“检查公开联网、内部能力、知识库、IntentOrch、用户上下文在 planner/evidence/composer 里的优先级是否仍有偏差……先不要急着实施……专家委员会评审通过……然后我来审查”
- design: `docs/architecture/request-understanding/information-source-coordination-design.md`
- expert review: `docs/review/ai-chat-information-source-coordination-design-review-2026-06-13.md`
- user brief: `docs/review/ai-chat-information-source-coordination-user-review-brief-2026-06-13.md`
- sample set: `docs/review/ai-chat-information-source-coordination-sample-set-2026-06-13.md`
- review packet: `docs/review/ai-chat-information-source-coordination-review-packet-2026-06-13.md`
- runtime acceptance: `docs/review/ai-chat-general-capability-acceptance-report-2026-06-13.md`

## 1. 审计结论

当前目标在“设计方案 + 推理/论证 + 专家委员会复审 + 用户审查材料”层面已经具备审查入口；在 runtime 层面已经完成第一阶段 slice 验收。

当前目标不能标记为最终完成，因为：

- 用户尚未审查并确认方案。
- runtime 状态是 `runtime_partial_pass_scope_limited`，不是 full pass。
- 问数分支知识库候选、记忆/偏好真实命中、混合场景端到端验证仍未完成。

## 2. 逐项满足度

| 用户目标要求 | 当前证据 | 状态 | 备注 |
|---|---|---|---|
| 检查公开联网、内部能力、知识库、IntentOrch、用户上下文优先级 | 设计文档第 5、6、15 节；brief 第 3 节 | `design_covered` | 已定义五类候选、Planner/Evidence/Composer 优先级和冲突让位关系 |
| 回答“先查能力再候选”还是“先排查再查能力再候选” | 设计文档第 2、7 节；brief 第 1、2 节 | `design_covered` | 结论为“先理解证据需求 -> 并行候选 -> 仲裁 -> 执行取证 -> Composer” |
| 确保外部联网搜索必要信息 | 设计文档第 5.3、5.4、8.2、15 节；样例集第 3、4、9 节 | `design_covered` | 公开联网拆成 need candidate 和 evidence candidate |
| 确保内部数据查询功能调用 | 设计文档第 5.1、6.2、8.1 节；样例集第 2 节 | `design_covered` | 内部 MCP/API 为内部业务事实最高权威 |
| 外部联网和内部调用相辅相成，不互相抢路 | 设计文档第 6.2、8.3、15 节；样例集第 4 节 | `design_covered` | 混合场景为 `mixed_grounded`，公开来源不能覆盖内部数据 |
| 避免特殊处理无法覆盖全部场景 | 设计文档第 16 节；样例集同义表达和负例 | `design_covered` | 明确业务词 includes、样例硬编码、Prompt 路由为阻断反模式 |
| 说明业务域是否需要 | 设计文档第 9 节；brief 第 4 节 | `design_covered` | 结论为需要，但只能治理化存在 |
| 提供更完善设计方案 | 设计文档全文 | `design_covered` | 状态 `design_pass_runtime_gate_pending` |
| 方案必须有推理/论证 | 设计文档第 2、8、15、16 节；brief 第 2 节 | `design_covered` | 包含反例、取舍、冲突矩阵和场景推理 |
| 经过专家委员会评审，不通过则修改再评审 | 复审文档第 3、4、5.1 节 | `design_covered` | 初审 `revise`，修订后 `design_pass_runtime_gate_pending` |
| 然后由用户审查 | brief 和样例集 | `waiting_for_user` | 当前正在等待用户审查，不能标记 complete |

## 3. 仍未满足或不能宣称的事项

| 事项 | 为什么未完成 | 后续需要 |
|---|---|---|
| 用户审查通过 | 用户尚未明确批准设计、brief、样例集 | 等待用户确认、修改意见或进入实施指令 |
| runtime 全量完成 | 第一阶段 slice 已通过，但知识库、记忆、混合证据仍有 pending | 后续按验收报告第 7 节继续实施 |
| 真实 `/api/chat` 全量回归 | 基础 runtime regression 已通过，但未覆盖全部目标能力 | 补知识库、记忆、真实 public web provider 和混合证据 case |
| 问数分支知识库候选完整落地 | 设计已覆盖，但 runtime 证据不足 | 后续补 `knowledge_candidate` 采纳/拒绝记录 |
| 所有 Composer 路径 raw payload 隔离 | 设计已规定白名单，但未全量审计 runtime | 后续做 Composer 输入治理和测试 |

## 4. 用户审查入口建议

建议按下面顺序审：

1. 先读审查包索引：`docs/review/ai-chat-information-source-coordination-review-packet-2026-06-13.md`
2. 再读用户简报：`docs/review/ai-chat-information-source-coordination-user-review-brief-2026-06-13.md`
3. 再看样例集：`docs/review/ai-chat-information-source-coordination-sample-set-2026-06-13.md`
4. 如有争议，再回到完整设计：`docs/architecture/request-understanding/information-source-coordination-design.md`
5. 最后看专家复审：`docs/review/ai-chat-information-source-coordination-design-review-2026-06-13.md`

## 5. 建议用户直接确认的问题

为了进入下一阶段，建议用户至少明确：

1. 是否认可主顺序。
2. 是否认可公开联网两阶段。
3. 是否认可内部 MCP/API、知识库、公开联网的默认权威等级。
4. 是否认可业务域保留但治理化。
5. 是否认可样例集作为后续非硬编码回归来源。
6. 是否要求补更多真实业务样例后再实施。

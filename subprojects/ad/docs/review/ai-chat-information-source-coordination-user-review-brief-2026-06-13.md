# 通用 Chat 信息源协同方案用户审查简报

- status: `waiting_for_user_review`
- design: `docs/architecture/request-understanding/information-source-coordination-design.md`
- expert review: `docs/review/ai-chat-information-source-coordination-design-review-2026-06-13.md`
- sample set: `docs/review/ai-chat-information-source-coordination-sample-set-2026-06-13.md`
- objective audit: `docs/review/ai-chat-information-source-coordination-objective-audit-2026-06-13.md`
- review packet: `docs/review/ai-chat-information-source-coordination-review-packet-2026-06-13.md`
- runtime acceptance: `docs/review/ai-chat-general-capability-acceptance-report-2026-06-13.md`
- decision template: `docs/review/ai-chat-information-source-coordination-user-decision-template-2026-06-13.md`
- scope: 公开联网、内部 MCP/API、知识库、IntentOrch、用户上下文在 Planner / Evidence / Composer 的协同优先级

## 1. 需要你审查的核心结论

本方案不采用“先查能力再候选”，也不采用“先排查再查能力再候选”。

推荐主路径是：

```txt
先理解当前轮目标和证据需求
-> 同步形成五类候选
-> 仲裁候选和风险
-> 按仲裁结果执行取证
-> 对证据再次做采纳/拒绝
-> Composer 只基于证据和仲裁摘要回答
-> ContractSafety 兜底
```

这里的关键点是：能力发现不是全局前置主脑，也不是最后才查的补丁。它是候选生成中的权威输入，负责告诉仲裁器“内部能力是否可用、能覆盖什么、缺什么、风险是什么”。

## 2. 为什么不是另外两种顺序

### 2.1 为什么不是“先查能力再候选”

这种顺序会把 Capability Discovery 变成实际 router。

风险：

- 公开政策、新闻、公告、天气等公共事实会被内部能力过早收窄。
- 知识库解释类问题可能被误判成问数或工具执行。
- 混合问题会先落到某个工具，后续公开信息只能变成补丁。

### 2.2 为什么不是“先排查再查能力再候选”

这种顺序会把 Request Understanding、public web need 或排查规则变成路径权威。

风险：

- 公开联网的 `required` 可能再次抢掉内部问数/MCP。
- 业务词、样例句或 Prompt 里的判断会变成隐形 router。
- IntentOrch 或上下文弱信号可能覆盖当前轮显式输入。

### 2.3 推荐顺序的取舍

推荐顺序的代价是链路更显式，需要记录更多候选和拒绝原因。

收益是：

- 内部数据、知识库、公开联网可以互补。
- 每个信息源为什么被采纳或拒绝可审计。
- 不靠业务关键词和特殊 case 显得聪明。
- Composer 不再从 raw result 或 Prompt 规则里拼答案。

## 3. 五类候选的权威等级

| 候选 | 角色 | 权威边界 |
|---|---|---|
| `internal_capability_candidate` | 内部 MCP/API、报表、任务、动作 | 内部业务事实和动作最高权威 |
| `knowledge_candidate` | 内部制度、口径、流程、说明 | 高于公开联网，但不能替代实时内部数据 |
| `public_web_need_candidate` | 是否需要公开事实取证 | 只能进入仲裁，不能排除内部能力 |
| `public_web_evidence_candidate` | 联网结果是否可采纳 | 必须有来源、相关性、时效、disclaimer |
| `intentorch_candidate` | 外部规划增强 | 只能建议，不得直接选工具或改参数 |
| `context_candidate` | 用户上下文、项目、记忆、历史 | 只能填空和调整表达，不得覆盖当前轮 |

默认仲裁优先级：

```txt
MCP/API > 内部知识库 > 公开联网 > model-only > clarify
```

但混合问题可以是 `mixed_grounded`，例如内部 ROI 变化 + 外部政策公告。

## 4. 业务域是否需要

结论：需要。

理由：

- B 端用户不会总说标准指标、标准实体、标准工具名。
- 广告投放、报表、权限、指标口径、媒体差异天然是业务域。
- 完全去业务域会让 Planner 无法稳定连接工具和数据。

但业务域必须治理化，不能散落在 runtime：

| 允许位置 | 作用 |
|---|---|
| Capability manifest | 能力描述、支持意图、输入输出、权限 |
| Tool metadata | 参数 schema、失败语义、证据输出 |
| Metric catalog | 指标别名、口径、维度、时间粒度 |
| Knowledge source policy | 知识范围、可信度、权限、更新时间 |
| Public web policy | 允许联网的事实类型、来源偏好、相关性阈值 |
| Admin policy / governed seed | 受治理术语、风险阈值、默认优先级 |
| Prompt variable schema | 允许注入的摘要变量和禁止变量 |

不允许：

- 用业务关键词 `includes()` 直接决定路由。
- 用 Prompt 中文 if/else 承载路由规则。
- 用单个验收句或客户样例写路径判断。
- 让前端根据正文关键词反推业务状态。

## 5. 专家委员会结论

初审：`revise`

初审问题：

- 容易被理解成 public web need 先抢路径。
- Capability Discovery 的位置还不够精确。
- 知识库在问数混合场景里的补充角色不够清楚。
- 业务域治理边界需要更硬。
- Composer 输入边界需要更严格。

修订后：`design_pass_runtime_gate_pending`

第一阶段 runtime 后验：`runtime_partial_pass_scope_limited`

含义：

- 设计可以给你审查。
- 专家委员会认为方案方向可进入下一阶段。
- FactNeed、公开联网门禁、内部数据优先、基础 ResponseContract/Trace slice 已有回归证据。
- 但 runtime 全量完成尚未证明，问数分支知识库候选、记忆/偏好真实命中、混合场景端到端仍需后续验证。

## 6. 请你重点拍板的问题

1. 是否接受“先理解证据需求 -> 并行候选 -> 仲裁 -> 执行取证 -> Composer”的主顺序？
2. 是否接受 Capability Discovery 是“候选生成中的权威输入”，不是全局前置主脑？
3. 是否接受公开联网拆成 `need candidate` 和 `evidence candidate`？
4. 是否接受内部 MCP/API、内部知识库、公开联网的默认权威等级？
5. 是否接受显式联网只触发外部取证，但不能覆盖内部数据能力？
6. 是否接受业务域必须保留，但只能进入受治理配置、manifest、metadata、catalog、policy 或 seed？
7. 是否认为 Composer 输入白名单足够严格，是否还需要加禁止项？
8. 是否有某类真实 B 端数据场景会被该方案误杀？
9. 是否同意后续 runtime 实施必须先补非硬编码回归和真实 `/api/chat` 验收？
10. 是否认可已补充的真实样例集草案可作为后续非硬编码回归的来源，还是需要继续增加业务场景。

## 7. 当前不能宣称完成的事项

- 不能宣称 `/api/chat` 全量真实链路已经通过。
- 不能宣称问数分支知识库候选已完整落地。
- 不能宣称所有 Composer 路径都已完成 raw payload 隔离。
- 不能把已有第一阶段 runtime slice 视作最终完成。
- 不能把专家委员会 design pass 视作用户已审查通过。

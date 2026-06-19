# 通用 Chat 信息源协同真实样例集草案

- status: `draft_for_user_review`
- design: `docs/architecture/request-understanding/information-source-coordination-design.md`
- user brief: `docs/review/ai-chat-information-source-coordination-user-review-brief-2026-06-13.md`
- purpose: 在进入 runtime 实施前，用真实 B 端数据产品场景审查信息源仲裁是否会误判、抢路或硬编码。

## 1. 使用方式

本样例集不是测试代码，也不是业务词路由表。它用于审查设计是否覆盖同类问题，而不是让实现按样例句写规则。

评审每条样例时必须确认：

- 当前轮显式输入是否被保留。
- 内部 MCP/API、知识库、公开联网、IntentOrch、用户上下文的候选状态是否合理。
- 公开联网是否只作为 need/evidence candidate，不抢内部能力。
- Composer 是否只能基于 accepted evidence 回答。
- 是否能支持同义表达，而不是只支持样例原句。

## 2. 内部数据优先

| 编号 | 用户问题 | 期望仲裁 | 公开联网 | 知识库 | 关键拒绝/采纳理由 |
|---|---|---|---|---|---|
| D01 | 看一下昨天计划 A 的消耗和转化 | `internal_capability_candidate` selected | rejected/deferred | optional | 内部业务数据必须走 MCP/API |
| D02 | 这个账户上周 ROI 怎么样 | `internal_capability_candidate` selected | rejected/deferred | optional | ROI 是内部报表事实，不是公开事实 |
| D03 | 帮我查最近 7 天素材点击率最高的几个 | `internal_capability_candidate` selected | rejected/deferred | optional | “最近”表示内部时效数据，不触发公开搜索抢路 |
| D04 | 我想看一下今天投放有没有异常 | `internal_capability_candidate` selected; maybe clarify | rejected/deferred | optional | 若缺账户/项目，先 clarify，不外搜 |
| D05 | 计划 A 和计划 B 哪个转化成本更低 | `internal_capability_candidate` selected | rejected/deferred | optional | 比较对象是内部实体 |

同义表达补测：

- “昨天 A 计划花了多少钱，转化怎么样”
- “最近一周这个账号投得好不好”
- “素材里哪个点得最多”

业务负例：

- “ROI 是什么意思”不应进入内部问数，优先 knowledge/model-only。
- “Google Ads 行业平均 ROI 是多少”不应误判为内部 ROI，可能需要 public web。

## 3. 显式公开联网

| 编号 | 用户问题 | 期望仲裁 | 内部能力 | 知识库 | 关键采纳/拒绝理由 |
|---|---|---|---|---|---|
| W01 | 联网查一下 Google Ads 最近政策更新 | `public_web_evidence_candidate` selected | candidate only if internal policy needed | supporting if has internal interpretation | 用户显式要求公开来源；需来源和时效 |
| W02 | 查一下今天美元兑人民币汇率 | `public_web_evidence_candidate` selected | rejected | rejected | 实时公共事实，公开来源优先 |
| W03 | 帮我看下 Meta 最近有没有广告投放政策调整 | `public_web_evidence_candidate` selected | optional | supporting | 外部公告/政策事实 |
| W04 | 现在北京天气怎么样，会不会影响线下活动 | `public_web_evidence_candidate` selected | optional | optional | 天气是公共实时事实，影响判断需标注假设 |
| W05 | 去官网查一下 TikTok Ads API 最新版本 | `public_web_evidence_candidate` selected | optional | optional | 官方公开版本信息 |

非硬编码补测：

- “帮我搜一下 Google Ads 的新政策”
- “网上有没有 Meta 广告审核规则更新”
- “官网版本号现在是多少”

必须拒绝：

- 低相关搜索结果不得进入最终证据。
- 没有来源时不得让模型编造“最新政策”。

## 4. 内部数据 + 外部公开事实混合

| 编号 | 用户问题 | 期望仲裁 | 公开联网 | Composer 要求 |
|---|---|---|---|---|
| M01 | 我们昨天 ROI 掉了，是不是和 Google Ads 最新政策有关 | `mixed_grounded` | selected for external policy evidence | 内部 ROI 和公开政策分开说，不能强行归因 |
| M02 | 今天消耗异常，帮我看看是不是汇率变化影响 | `mixed_grounded` | selected for exchange rate evidence | 内部消耗来自 MCP/API，汇率只是外部背景 |
| M03 | 最近素材点击率下降，行业是不是整体也在降 | `mixed_grounded` | selected if reliable benchmark exists | 若无公开基准，不能编造行业结论 |
| M04 | 这周转化成本升高，平台公告有没有相关变化 | `mixed_grounded` | selected for platform公告 | 平台公告只作为可能因素 |

必须记录：

- internal evidence accepted。
- public web evidence accepted/rejected。
- causal conclusion 是否有证据。
- 若只有时间相关性，必须标为待验证假设。

## 5. 知识库优先

| 编号 | 用户问题 | 期望仲裁 | 公开联网 | model-only |
|---|---|---|---|---|
| K01 | 我们内部 ROI 口径怎么算 | `knowledge_candidate` selected | rejected/deferred | rejected if no evidence |
| K02 | 这个报表里的转化成本字段定义是什么 | `knowledge_candidate` selected | rejected/deferred | rejected if no evidence |
| K03 | 小乔智投里素材诊断的使用流程是什么 | `knowledge_candidate` selected | rejected/deferred | fallback only if no internal fact claim |
| K04 | 我们对高风险操作的审批规则是什么 | `knowledge_candidate` selected | rejected/deferred | rejected if no evidence |
| K05 | 这个工具支持哪些数据源 | `knowledge_candidate` or capability selected | rejected/deferred | only for generic explanation |

无命中要求：

- 不得输出“我们内部规定是……”。
- 应说明未找到内部口径，建议补充知识库或转人工确认。

## 6. IntentOrch 只做候选

| 编号 | 用户问题 | IntentOrch 情况 | 期望 |
|---|---|---|---|
| I01 | 帮我查素材表现 | IntentOrch 建议素材分析工具 | 仍需 Capability Discovery 确认可执行 |
| I02 | 帮我诊断投放异常 | IntentOrch 超时 | 记录 candidate failure，主链路继续 |
| I03 | 帮我查账户 A 的昨天数据 | IntentOrch 建议错误工具 | 拒绝该建议，内部能力和当前轮显式输入优先 |
| I04 | 帮我生成报告 | IntentOrch 建议自动化任务 | 只能进入 planning signal，不直接创建任务 |

阻断点：

- IntentOrch 不得直接改指标、时间、实体。
- IntentOrch 不得绕过 Execution Policy 直接执行工具。

## 7. 用户上下文弱信号

| 编号 | 上下文 | 用户当前轮 | 期望 |
|---|---|---|---|
| C01 | 历史项目 A | 看项目 B 上周情况 | 当前轮项目 B 优先；项目 A rejected |
| C02 | 用户偏好看图表 | 看昨天明细 | 明细优先；偏好只影响展示建议 |
| C03 | 历史问 ROI | 这次问消耗 | 当前轮消耗优先；ROI 不继承 |
| C04 | 记忆里常用账户 X | 查账户 Y 今天数据 | 账户 Y 优先；X rejected |
| C05 | 用户角色是运营 | 请求审批高风险动作 | 角色不是授权；仍需权限检查 |

## 8. Model-only 合法边界

| 编号 | 用户问题 | 期望 | 证据模式 |
|---|---|---|---|
| O01 | 解释一下 ROI 和 ROAS 的区别 | 可 model-only 或 knowledge supporting | `model_only` / `no_external_evidence_required` |
| O02 | 帮我把这段投放总结改得更清楚 | model-only rewrite | `no_external_evidence_required` |
| O03 | 给我一个日报结构模板 | model-only create | `no_external_evidence_required` |
| O04 | 讲讲为什么要看转化成本 | model-only explanation unless internal policy requested | `model_only` |

禁止：

- model-only 不得声称“我查了报表/知识库/官网”。
- model-only 不得回答内部口径、实时事实、权限状态或工具执行结果。

## 9. 低相关和失败场景

| 编号 | 场景 | 期望 |
|---|---|---|
| F01 | 公开搜索返回同名无关公司 | public web evidence rejected |
| F02 | 知识库命中旧版本口径 | rejected 或低置信，要求标注时间边界 |
| F03 | MCP transport success 但业务失败 | `business_failed`，不得渲染成功 |
| F04 | 公开联网未配置 | not configured / degraded，不让模型补最新事实 |
| F05 | 用户要求查无权限账户 | permission denied / clarify，不用上下文绕过 |
| F06 | Prompt 缺 required variable | prompt-variable failure，不调用模型 |

## 10. 审查通过标准

本样例集通过，不代表 runtime 完成。它只证明设计覆盖面可以进入实施。

进入 runtime 实施前，至少需要用户确认：

1. 样例分类是否符合真实产品心智。
2. 是否缺少关键业务域场景。
3. 是否有样例的期望仲裁会误杀用户需求。
4. 是否需要增加媒体、指标、权限、知识库、公开政策的更多真实表达。
5. 是否同意这些样例后续转成非硬编码回归，而不是 route 关键词表。


# 通用 Chat 真实验收待办归档

更新时间：2026-06-14

## 当前结论

本轮通用 Chat 事实需求与证据仲裁验收已经完成一轮真实 provider 验证。公开联网链路已具备真实调用、FactNeed 识别、多 query 搜索计划、搜索结果解析、SourceRef 组装和 Trace 记录能力；但公开联网 provider 存在波动，需要后续治理稳定性和来源质量。知识库链路仍有一个主链路问题：直连知识库命中时，`/api/chat` 信息源仲裁未采纳 knowledge。

剩余系统问题收敛为两项：

1. 公开联网 provider 波动与来源质量治理。
2. 知识库命中后，信息源仲裁未采纳 knowledge。

另有一个验收样本问题：

- `XIAOQIAO_REAL_KB_NO_HIT_QUERY = 指间山海今天的消耗多少` 在真实知识库直连中返回 1 条命中，所以它不是有效 no-hit 样本。该项需要重选样本，不算系统能力缺陷。

旧口径/废弃/过期知识 case 暂时跳过。原因是当前知识库暂无已治理的过期样本；该 case 后续用于验证“过期资料不能作为当前确定口径回答”。

## 已完成的真实验证

执行命令：

```bash
npm.cmd run ts-check
npm.cmd exec tsx scripts/real-public-web-focused-debug.ts
npm.cmd exec tsx scripts/real-provider-chat-e2e.ts
npm.cmd run check:mojibake
```

验证结果：

- `ts-check`：通过。
- `check:mojibake`：通过，`findings=0`。
- `public_web_official_source_real_provider`：通过，公开联网返回来源。
- `public_web_low_relevance_real_provider`：通过，低相关闲聊未触发联网。
- `public_web_multi_source_real_provider`：通过，`乌克兰是否真要和俄罗斯停火` 返回 3 个来源。
- `knowledge_stale_api_chat_e2e`：跳过，无真实过期知识样本。
- `knowledge_hit_api_chat_e2e`：失败，直连知识库有命中，但信息源仲裁结果为 `rejected`。
- `knowledge_no_hit_api_chat_e2e`：失败，样本直连知识库返回 1 条命中。

## 已落地的关键改动

- `frontend/src/src/lib/fact-need-reasoner.ts`
  - 把“是否 / 是不是 / 有没有 / 会不会 / 能否 / 真要”等疑问式状态判断归入 `status_update`。
  - 将这类状态判断的 freshness 归入 `recent`。
  - SearchPlan 从单 query 扩展为 primary / verification / background 多 query。

- `frontend/src/src/lib/public-web-runtime.ts`
  - 支持多 query 逐条尝试，单次 provider 失败不立即终止整条公开联网链路。
  - 每次 `web.search` / `web.result` 记录 query、purpose、attempt、source count、relevance/freshness gate 信息。
  - 扩展 provider 结果解析字段，支持更多常见搜索返回结构。
  - 按 SearchPlan source policy 决定 relevance threshold，避免近期状态问题被 stable reference 高阈值误伤。
  - 对 `fresh_news` / 近期多源事实增加 freshness gate，减少百科/旧文章进入证据。
  - 模型 query rewrite 改为显式开关 `XIAOQIAO_PUBLIC_WEB_QUERY_REWRITE_MODEL=true`，避免模型服务波动时污染主链路。

- `frontend/src/scripts/real-provider-chat-e2e.ts`
  - 明确 `validation_mode=strict_real_provider_no_mock_no_fixture_no_random`。
  - stale case 改为可跳过，避免当前无真实过期知识样本时产生伪失败。

- `frontend/src/scripts/real-public-web-focused-debug.ts`
  - 新增真实公开联网 focused debug，用于复查多源 query 的 FactNeed、SearchPlan、事件和来源。

## 下次优先待办

### P0：修复知识库命中后未被仲裁采纳

真实表现：

- 直连知识库样本 `最近智投更新了什么功能` 返回命中。
- `/api/chat` 运行时信息源仲裁中 knowledge 候选状态为 `rejected`，预期应为 `selected` 或至少进入可解释的候选证据。

下一步定位建议：

1. 检查 `frontend/src/src/lib/information-source-arbitration.ts` 中 knowledge 候选 eligibility / rejection reason。
2. 对比 `searchRealKnowledge()` 直连结果与 `/api/chat` planner metadata 中的 knowledge hit count。
3. 确认是不是 FactNeed、ProviderEligibility、知识库 relevance/freshness gate、或 Answer Composer evidence requirement 导致被拒。
4. 补一条真实链路断言：直连知识库命中时，knowledge 候选必须记录命中数、采纳/拒绝原因和 evidence role；不得静默 rejected。

验收命令：

```bash
npm.cmd exec tsx scripts/real-provider-chat-e2e.ts
```

通过标准：

- `knowledge_hit_api_chat_e2e` 通过。
- 若 knowledge 被拒，必须输出可审计 rejection reason，且该 reason 与真实命中证据一致。

### P1：公开联网 provider 稳定性与来源质量治理

真实表现：

- 同一 focused debug 有时成功返回来源，有时所有 query 返回 `fetch failed`。
- 中文状态问题成功时可能混入百科/社区/旧背景资料；已增加 freshness gate，但仍需要继续观察真实 provider 波动和来源排序。

下一步建议：

1. 在 provider 失败时区分 HTTP 错误、网络失败、超时、provider 空结果、解析为空、relevance gate 全拒。
2. 增加 provider 层 retry/backoff 或 circuit breaker，避免一次网络抖动影响整轮。
3. 对 `fresh_news` / `multi_source_consensus` 引入 source quality metadata，例如 official/news/reference/community，不在通用 Core 写业务场景词。
4. 将 focused debug 结果归档到验收报告，保留成功和失败两类样本，用于判断 provider SLA。

验收命令：

```bash
npm.cmd exec tsx scripts/real-public-web-focused-debug.ts
npm.cmd exec tsx scripts/real-provider-chat-e2e.ts
```

通过标准：

- `public_web_multi_source_real_provider` 连续多次运行不因 provider 单次波动全部失败。
- `web.search` / `web.result` 能解释每个 query 的失败或过滤原因。
- 近期事实问题来源优先为新闻/官方/近期公开来源，背景百科只能作为补充或被过滤。

### P2：重选知识库 no-hit 真实样本

当前样本：

```txt
指间山海今天的消耗多少
```

真实结果：

- 直连知识库返回 1 条命中，因此不是 no-hit 样本。

下一步：

- 由知识库维护者提供一个确定不会命中当前知识库的真实查询。
- 不允许使用 mock、fixture、随机字符串或默认伪样本替代。

## 下次重启读取入口

下次继续该任务时，先读取本文档，然后复跑：

```bash
npm.cmd run ts-check
npm.cmd exec tsx scripts/real-provider-chat-e2e.ts
npm.cmd run check:mojibake
```

如果只继续公开联网 provider 治理，先跑：

```bash
npm.cmd exec tsx scripts/real-public-web-focused-debug.ts
```

如果只继续知识库仲裁问题，优先看：

- `frontend/src/src/lib/information-source-arbitration.ts`
- `frontend/src/src/lib/open-answer-planner-context.ts`
- `frontend/src/scripts/real-provider-chat-e2e.ts`
- `frontend/src/src/lib/evaluation-runtime-runner.ts`

## 不要误判

- `no-hit` 样本失败不是系统能力失败，而是样本不成立。
- stale/expired case 当前是治理待补样本，不是运行时失败。
- 公开联网 provider 波动不等同于解析失败；成功样本已证明解析和 SourceRef 组装可用。
- 后续不能通过加入“乌克兰、NBA、智投、巨量”等场景词修问题；只能继续按 FactNeed、ProviderEligibility、SearchPlan、Evidence Ledger 和仲裁理由推进。

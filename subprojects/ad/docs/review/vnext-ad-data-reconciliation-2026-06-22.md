# VNext AD 数据口径待核对记录（2026-06-22）

本文记录 VNext 二轮回放中无法通过代码修复直接闭环的数据口径冲突。处理原则：以 MCP/工具返回的事实作为回答依据，不在通用 Chat 主链路中硬编码测试期望值。

## Row20：日报按媒体查询的消耗口径

- 用例：Excel row 20，`R20-MIG-004-广告报表-日期识别-DATE-F001`
- 用户问题：`指间山海2026-03-25日报中，查询广告投放部 各媒体激活数、注册数和消耗`
- 测试期望来源：
  - `docs/design-v1/generated/report-query-testcase-capability-mapping.json`
  - 历史 runtime 结果中的 `keyPoint`
- 当前期望片段：`巨量：激活126 注册106 消耗115000 tap: 激活71，注册64，消耗7010.83`

## 最新验证状态

- `/api/chat` 二轮回放：`docs/review/小乔智投测试集v1.1_second-round-20260622-145207.checkpoint.json`
  - 结果：阻断
  - 原因：登录态失效，非交互模式不弹出浏览器
  - 内存：server PID 40696，checkpoint 峰值 368 MB
- 源级 MCP 探针：`frontend/src/scripts/row20-report-query-reconciliation-probe.ts`
  - 执行链路：`executeReportQueryStep()` -> `get_zt_ad_day_report`
  - 结果状态：success
  - 返回行数：17
  - 关键数据：
    - 巨量广告：消耗 `11,500.00` 元，激活数 `126`，注册数 `106`
    - TapTap广告：消耗 `7,010.83` 元，激活数 `71`，注册数 `64`

## 判断

当前代码链路已能正确识别日报查询、项目、日期、团队、媒体维度和指标，并调用广告报表 MCP。row20 剩余差异集中在测试期望的“巨量消耗 `115000`”与 MCP 真实返回“巨量广告消耗 `11500.00`”之间。

这不是适合在 Request Understanding、Capability Discovery、report query orchestration、Answer Composer 或 ResponseContract 层硬修的逻辑问题。若直接把 `115000` 写入代码，会破坏 tool-grounded 与 Evidence Ledger 原则，并污染后续相同媒体/日期/团队查询。

## 待确认项

- 如果 MCP 为权威数据源：将 row20 以及复用同一 keyPoint 的相关测试期望从 `115000` 修正为 `11500.00`。
- 如果测试期望为权威口径：需要由数据或 MCP 侧确认是否存在单位、折前/折后消耗、团队过滤、媒体别名或币种转换差异。
- 确认后再恢复 `/api/chat` 二轮回放，补 row20 端到端证据。


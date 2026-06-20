# AI Chat 第二轮验收风险待办

日期：2026-06-20

## 当前结论

第二轮 MIG-050~060 还不能标记完成。MIG-051 已从 `debugging/not_configured` 误路由推进到 `report_query`，并修复了单日 ISO 日期被落到当天的问题；`get_zt_ad_retention_report` 的入参构造已修到轻量 preflight 通过，并补齐应用类型数组参数、`subGroup=app_package_type` 细分契约，以及 retention 自然量在数组 schema 下的 `["ORGANIC","AD","MKT","OP"]` 多来源组合映射和受治理 `filter_values` 补参 `mediaId=["99999"]`，但真实 E2E 仍受登录态失效阻断，不能标记业务链路完成。日报 fallback 也不能再冒充留存查询成功。MIG-050/052/053/054/055/058 风格复合指标已补到离线拆解层，能覆盖 daily/roi/retention/hour 多工具候选、应用类型/团队分布维度、累计 ROI 与第 N 周/月 ROI 的差异，以及不同 retentionType 子查询；`multi_query` 子查询过程事件也已补充工具级 source/tool/output 证据，但仍需真实 `/api/chat` 链路确认 MCP 入参、Evidence 和最终回答一致。

## 已完成修复

| 优先级 | 项目 | 证据 |
| --- | --- | --- |
| P0 | `multi_query` 0 子查询不再终止主链路，改为继续常规报表查询 | `npm.cmd exec tsx scripts/multi-query-stage-self-test.ts` 通过 |
| P0 | `execute_workflow` semantic frame 不再无条件覆盖强查数信号 | MIG-051 从 `debugging` 回到 `report_query` |
| P0 | `/api/chat` 服务端上下文可从登录态携带当前项目和可见项目列表 | MIG-051 不再停在“确认项目” |
| P0 | 泛化维度词“应用类型”不再触发应用类型字典实体解析 | MIG-051 不再停在“应用类型解析输出” |
| P0 | `YYYY-MM-DD` 单日日期进入公共日期解析器 | MIG-051 回归回答日期从 2026-06-20 修正为 2026-02-01 |
| P0 | 不兼容 fallback 不再遮蔽主工具失败 | MIG-051 由假成功变为 `failed`，暴露 retention 参数映射问题 |
| P0 | `get_zt_ad_retention_report` 入参构造按已选 capability 和工具 schema 补齐 | 轻量构造验证得到 `promotionSource: ["ORGANIC"]`、`retentionType: "REG_RETENTION"`，`preflight.status=passed` |
| P0 | MIG-050/052 风格复合指标从原文补充抽取并进入 `multi_query` | `npm.cmd exec tsx scripts/multi-query-stage-self-test.ts` 覆盖稀疏 `userRequirement` 场景 |
| P0 | 留存三类指标拆成独立 retention 子查询 | 离线拆解得到 `DEVICE_RETENTION`、`REG_RETENTION`、`PAY_D1_RETENTION` 三个 `get_zt_ad_retention_report` 子查询 |
| P0 | daily/roi/retention/hour 工具按报表域优先匹配 | 离线拆解 MIG-050 覆盖 `get_zt_ad_day_report`、`get_zt_ad_roi_report`、`get_zt_ad_retention_report`、`get_zt_hour_report` |
| P0 | MIG-050 复合子查询在调用前逐个通过工具 schema 入参构造 | `npm.cmd exec tsx scripts/multi-query-stage-self-test.ts` 新增覆盖 day/roi/retention/hour 子查询 `buildMcpToolArgs`；小时子查询补齐 `hour="19-20"`，各子查询带 `appId/startDate/endDate/promotionSource/appPackageType/mediaId/teamIds/subGroup/timeType` |
| P0 | MIG-052 周粒度复合子查询在调用前逐个通过工具 schema 入参构造 | `npm.cmd exec tsx scripts/multi-query-stage-self-test.ts` 新增覆盖 `2026-01-01那一周` 解析为 `startDate=2025-12-29`、`endDate=2026-01-04`、`timeType=NATURAL_WEEK`，day/roi/retention 子查询均可通过 preflight |
| P0 | MIG-053 应用类型分布维度按 `app_package_type` 归一并参与工具覆盖 | 真实 `.runtime` manifest 离线拆解 MIG-053 覆盖 day/roi/retention，维度为 `app_package_type`，留存仍拆 3 个 retentionType |
| P0 | MIG-053 应用类型分布子查询在调用前逐个通过工具 schema 入参构造 | `npm.cmd exec tsx scripts/multi-query-stage-self-test.ts` 新增覆盖 `2026年1月1号` 日期格式与 `subGroup=app_package_type`，day/roi/retention 子查询均可通过 preflight |
| P0 | MIG-054 团队分布维度按 `team_id` 归一并参与工具覆盖 | `npm.cmd exec tsx scripts/multi-query-stage-self-test.ts` 覆盖 `teamIds/team_id` 复数字段归一，day/roi/retention 均可选中 |
| P0 | MIG-055/058 月 ROI 同时抽取累计 ROI 与第 N 月 ROI | `npm.cmd exec tsx scripts/multi-query-stage-self-test.ts` 覆盖 `2月累计roi`、`2月roi`、`第2月roi` |
| P0 | MIG-055/058 月粒度复合子查询在调用前逐个通过工具 schema 入参构造 | `npm.cmd exec tsx scripts/multi-query-stage-self-test.ts` 新增覆盖 `2025年12月1号那一月` 与 `2025-12-01那一月` 解析为 `startDate=2025-12-01`、`endDate=2025-12-31`、`timeType=NATURAL_MONTH`，day/roi/retention 子查询均可通过 preflight |
| P0 | MIG-050/052 中的 IOS、应用类型、媒体、团队筛选词不再误抽成输出维度 | 真实 `.runtime` manifest 离线拆解 MIG-050 覆盖 10/10 指标、MIG-052 覆盖 6/6 指标，`dimensions=[]` |
| P0 | `multi_query` 子查询执行前复用报表工具 schema 入参适配 | 真实 `.runtime` manifest 轻量验证 retention 子查询得到 `timeType: "DAY"`、`retentionType: "REG_RETENTION"`、`promotionSource: ["ORGANIC"]`、`appId/startDate/endDate` |
| P0 | retention 应用类型分布按工具 schema 传数组并补 `subGroup` | `npm.cmd exec tsx scripts/multi-query-stage-self-test.ts` 新增覆盖 `appPackageType: ["IOS"]` 与 `subGroup: "app_package_type"` |
| P0 | retention 自然量在数组 schema 下优先映射完整来源组合，并由配置补齐自然量媒体过滤 | `npm.cmd exec tsx scripts/multi-query-stage-self-test.ts` 新增覆盖 `promotionSource: ["ORGANIC","AD","MKT","OP"]` 与 `mediaId: ["99999"]`；CSV 候选逐项通过 enum 校验后再拆成数组，媒体过滤来自 schema adapter `promotion_source.filter_values` |
| P0 | MIG-051 单工具 retention 主路径直接构造参数并通过 preflight | `npm.cmd exec tsx scripts/multi-query-stage-self-test.ts` 新增覆盖 `buildReportToolInput(get_zt_ad_retention_report)`，断言 `appId/startDate/endDate/promotionSource/mediaId/appPackageType/retentionType/timeType` 完整且 `preflight.status="passed"` |
| P0 | `multi_query` 子查询 process event 补工具级 source/tool/output 证据 | `response_contract` 可从每个子查询事件生成更细的 `source_refs` 与 `tool_call_trace` |
| P1 | 第二轮测试脚本支持 `SECOND_ROUND_BASE_URL` | 可在 8002/3000 等不同本地端口间切换，不再硬绑 8002 |
| P1 | 第二轮测试判定增加日期、指标标签和关键数值覆盖 | `SECOND_ROUND_EVAL_SELF_TEST=1 node scripts/run-second-round-tests.cjs` 通过，历史 MIG-051 错报表答案不再判通过 |
| P1 | 第二轮测试判定补充无冒号指标值格式 | `激活数 645 首日 ROI 11.12%` 这类 keyPoint 可被解析；错 ROI 自测不再通过 |
| P1 | 第二轮测试判定补充分组格式归属校验 | `所在周/所在月` 多行分组会在对应分组片段内校验指标和值；周/月数值互换自测不再通过 |
| P1 | 第二轮测试判定补充紧凑日期与不返回数据语义 | `20260101` 会归一校验为 `2026-01-01`；不存在日期/未来日期必须说明不返回数据且不能夹带报表指标数值 |
| P1 | 第二轮测试脚本 checkpoint 增加过程事件摘要 | checkpoint 包含 `processEventSummary` 和 `outputSummary` |
| P1 | 第二轮测试脚本增加 dev server 内存护栏和非交互登录阻断 | `SECOND_ROUND_MEMORY_SELF_TEST=1 node scripts/run-second-round-tests.cjs` 通过；`SECOND_ROUND_NON_INTERACTIVE=1 SECOND_ROUND_CASE_IDS=MIG-051` 会快速写入登录阻断 checkpoint，不再等待 5 分钟 |
| P1 | 第二轮测试脚本 checkpoint 增加有界内存采样历史和峰值 | checkpoint 包含 `memoryPeakMb` 和最近 200 条 `memorySamples`，可在服务进程崩溃后保留崩前最后一次 PID/Working Set 证据；采样数组自身有上限，避免测试脚本长跑无界增长 |
| P1 | 第二轮测试脚本关闭默认自动重启，避免错端口拉起服务 | `SECOND_ROUND_NON_INTERACTIVE=1 SECOND_ROUND_CASE_IDS=MIG-050..060` 不再自动拉起默认端口 dev server；服务器不可用时写 checkpoint |
| P1 | 第二轮测试脚本支持显式 auth 文件且不打印 token 前缀 | `SECOND_ROUND_AUTH_FILE=...` 可指定刷新后的登录态文件；日志只输出 cookie 名、时间戳和文件路径，避免把 token 片段写入终端或 checkpoint |
| P1 | MIG-061~068 批次脚本限制重复 SSE 捕获 | `node --check e2e-batch-mig061-068.cjs` 通过；API 模式不再在浏览器 fetch wrapper 中重复保存完整 SSE body，UI 模式每个 case 后清理已消费捕获 |
| P1 | MIG-061~068 批次脚本增加 dev server 内存护栏和有界采样 | `node --check e2e-batch-mig061-068.cjs` 通过；脚本按 `E2E_BASE_URL` 端口采样监听进程 Working Set，超过 `E2E_MAX_SERVER_RSS_MB` 默认 3072MB 时阻断后续 case，并在报告写入 `memoryPeakMb`、`memorySamples`、`memoryGuard` |
| P1 | 早期鉴权/public web 分流逻辑迁出主 stage，恢复规则债务门禁 | `npm.cmd run validate:ad-ui`（工作目录：`frontend/src`）通过 |

## 仍阻断

| 优先级 | 待办 | 现象 | 下一步验收 |
| --- | --- | --- | --- |
| P0 | 刷新有效登录态后重跑 `get_zt_ad_retention_report` 真实链路 | 入参构造轻量验证已通过；8002 非交互重跑因服务不可用阻断，8010 非交互重跑服务可用但登录态失效；`tmp/auth-state.json` 与 `.auth-state/auth-tokens.json` 两个本地 auth 来源探测 `/api/xiaoqiao/auth/me` 均为 401，均未进入业务链路 | 刷新登录态后重跑 MIG-051，必须返回留存指标而不是日报 fallback |
| P0 | 用真实链路验收 MIG-050/052/053 多指标拆解和工具覆盖 | 离线拆解已覆盖 daily/roi/retention/hour 与 retentionType 拆分；最新 8010 MIG-050~060 非交互重跑全部因登录态失效阻断，尚未确认 MCP 入参、Evidence Ledger 和最终回答一致 | 重跑 MIG-050~060，强制校验 source/evidence/tool trace 与关键数值 |
| P0 | 治理 E2E 长请求内存增长 | dev server 曾在多轮报表 E2E 后达到约 4GB 并 OOM；当前第二轮脚本与 MIG-061~068 批次脚本均已能采样监听 PID 和 Working Set，并在超过默认 3072MB 时阻断后续 case；最新 8010 阻断 checkpoint 记录 PID 6868 Working Set / `memoryPeakMb` 为 306MB，未触发护栏；MIG-061~068 批次脚本也已避免测试端重复持有完整 SSE body | 继续在有效登录态下定位服务端增长来源，限制 IntentOrch/LLM 重入；重跑前建议重启服务或缩小批次，批次运行不应崩服务；MIG-061~068 真实批次还需用有效登录态验证报告内 `memoryPeakMb/memorySamples` |
| P1 | 继续扩展第二轮测试判定到复杂媒体/应用类型分组格式 | 已覆盖 `指标：数值`、`指标 数值`、`指标数值`、`所在周/所在月` 分组归属、紧凑日期、不存在/未来日期不返回数据；仍需继续观察媒体/应用类型多行分组 | 对媒体/应用类型分组答案补更细的 label 归属校验，避免宽松通过 |

## 已验证命令

- `npm.cmd run ts-check`
- `npm.cmd run validate:ad-ui`（工作目录：`frontend/src`）
- `npm.cmd exec tsx scripts/multi-query-stage-self-test.ts`（工作目录：`frontend/src`）
- `git diff --check`
- `SECOND_ROUND_EVAL_SELF_TEST=1 node scripts/run-second-round-tests.cjs`
- `npm.cmd exec -- tsx -e "...decomposeQuery(MIG-050/052/053 with .runtime mcp-servers.json)..."`，验证真实本地 manifest 下 MIG-050 覆盖 10/10、MIG-052 覆盖 6/6、MIG-053 覆盖 6/6
- `npm.cmd exec -- tsx -e "...buildMcpToolArgs(retention sub query with .runtime mcp-servers.json)..."`，验证 `multi_query` 子查询 schema 入参 `ok=true`
- `npm.cmd exec -- tsx -e "...buildReportToolInput(get_zt_ad_retention_report)..."`，验证 retention 入参 `preflight.status=passed`
- `SECOND_ROUND_MEMORY_SELF_TEST=1 node scripts/run-second-round-tests.cjs`
- `node --check scripts/run-second-round-tests.cjs`
- `SECOND_ROUND_NON_INTERACTIVE=1 SECOND_ROUND_CASE_IDS=MIG-051 SECOND_ROUND_BASE_URL=http://127.0.0.1:8002 node scripts/run-second-round-tests.cjs`
- `SECOND_ROUND_NON_INTERACTIVE=1 SECOND_ROUND_CASE_IDS=MIG-051 SECOND_ROUND_BASE_URL=http://127.0.0.1:8010 SECOND_ROUND_AUTH_FILE=E:\AI\ai-os\subprojects\ad\.auth-state\auth-tokens.json node scripts/run-second-round-tests.cjs`
- `SECOND_ROUND_NON_INTERACTIVE=1 SECOND_ROUND_CASE_IDS=MIG-050,MIG-051,MIG-052,MIG-053,MIG-054,MIG-055,MIG-056,MIG-057,MIG-058,MIG-059,MIG-060 SECOND_ROUND_BASE_URL=http://127.0.0.1:8002 node scripts/run-second-round-tests.cjs`
- `SECOND_ROUND_NON_INTERACTIVE=1 SECOND_ROUND_CASE_IDS=MIG-050,MIG-051,MIG-052,MIG-053,MIG-054,MIG-055,MIG-056,MIG-057,MIG-058,MIG-059,MIG-060 SECOND_ROUND_BASE_URL=http://127.0.0.1:8010 node scripts/run-second-round-tests.cjs`
- `node --check e2e-batch-mig061-068.cjs`

## 最新关键证据

- `docs/review/小乔智投测试集v1.1_second-round-20260620-010627.checkpoint.json`
- 失败形态：MIG-051 进入 `report_query`，项目与日期已解析，终端字典成功，retention 主工具失败，日报 fallback 成功但不再作为最终成功替代。
- 历史假成功样例：`docs/review/小乔智投测试集v1.1_second-round-20260620-004816.checkpoint.json` 曾把 `2026-02-01，激活数为 293，注册成本为 70.04 元。` 判为通过；当前脚本自测已覆盖并拦截该形态。
- 最新真实 E2E 阻断：单 case MIG-051 指向 `SECOND_ROUND_BASE_URL=http://localhost:3000` 时，服务就绪但登录态失效，脚本等待 301 秒后登录超时退出。
- 最新非交互 E2E 阻断：`docs/review/小乔智投测试集v1.1_second-round-20260620-085506.checkpoint.json` 记录 MIG-051 因登录态失效阻断；同时记录 8002 监听 PID 31248，Working Set 约 2463-2465MB，未超过默认 3072MB 护栏。
- 最新 MIG-050~060 非交互重跑阻断：`docs/review/小乔智投测试集v1.1_second-round-20260620-090303.checkpoint.json` 记录 11 条 case 全部因 `http://127.0.0.1:8002` 服务不可用阻断；脚本未再默认自动重启，避免错端口拉起额外 dev server。
- 最新可用服务非交互重跑阻断：`docs/review/小乔智投测试集v1.1_second-round-20260620-090545.checkpoint.json` 记录 11 条 case 在 `http://127.0.0.1:8010` 服务就绪后全部因登录态失效阻断；监听 PID 42276，Working Set 约 2780MB，未超过默认 3072MB 护栏但已接近。
- 最新二次可用服务非交互重跑阻断：`docs/review/小乔智投测试集v1.1_second-round-20260620-103839.checkpoint.json` 记录 11 条 case 在 `http://127.0.0.1:8010` 服务就绪后仍全部因登录态失效阻断；监听 PID 15328，Working Set 约 828MB，未触发内存护栏。
- 最新三次可用服务非交互重跑阻断：`docs/review/小乔智投测试集v1.1_second-round-20260620-152730.checkpoint.json` 记录 11 条 case 在 `http://127.0.0.1:8010` 服务就绪后仍全部因登录态失效阻断；监听 PID 40860，Working Set 约 805MB，未触发内存护栏。
- 最新四次可用服务非交互重跑阻断：`docs/review/小乔智投测试集v1.1_second-round-20260620-153853.checkpoint.json` 记录 11 条 case 在 `http://127.0.0.1:8010` 服务就绪后仍全部因登录态失效阻断；checkpoint 已写入 `memoryPeakMb=318` 与 12 条 `memorySamples`，未触发内存护栏。
- 最新五次可用服务非交互重跑阻断：`docs/review/小乔智投测试集v1.1_second-round-20260620-154150.checkpoint.json` 记录 11 条 case 在 `http://127.0.0.1:8010` 服务就绪后仍全部因登录态失效阻断；checkpoint 已写入 `memoryPeakMb=317` 与 12 条有界 `memorySamples`，未触发内存护栏。
- 最新六次可用服务非交互重跑阻断：`docs/review/小乔智投测试集v1.1_second-round-20260620-162254.checkpoint.json` 记录 11 条 case 在 `http://127.0.0.1:8010` 服务就绪后仍全部因登录态失效阻断；checkpoint 已写入 `memoryPeakMb=306` 与 12 条有界 `memorySamples`，未触发内存护栏。
- 最新七次可用服务非交互重跑阻断：`docs/review/小乔智投测试集v1.1_second-round-20260620-163941.checkpoint.json` 记录 11 条 case 在 `http://127.0.0.1:8010` 服务就绪后仍全部因登录态失效阻断；`total=11`、`blockedCount=11`、`failCount=0`、`errorCount=0`，checkpoint 已写入 `memoryPeakMb=306` 与有界 `memorySamples`，未触发内存护栏。
- 显式 auth 文件入口验证阻断：`docs/review/小乔智投测试集v1.1_second-round-20260620-172758.checkpoint.json` 使用 `SECOND_ROUND_AUTH_FILE=E:\AI\ai-os\subprojects\ad\.auth-state\auth-tokens.json` 读取到 `xiaoqiao_auth_session` / `xiaoqiao_auth_token` 两类 cookie，但 `/api/xiaoqiao/auth/me` 仍判定登录态失效；MIG-051 单 case `blockedCount=1`、`memoryPeakMb=314`。
- 最新 auth 探测：`tmp/auth-state.json` 和 `.auth-state/auth-tokens.json` 分别构造 cookie / bearer header 探测 `http://127.0.0.1:8010/api/xiaoqiao/auth/me`，均返回 401 `系统已自动登出，请重新登录`。
- 最新内存观察：最新非交互阻断 checkpoint 的 `memoryGuard` 显示 8010 监听 PID 6868，Working Set 约 306MB，低于默认 3072MB 护栏。
- 最新离线拆解证据：MIG-050 风格文本抽取到 `activation`、ROI、三类留存、首日注册设备小时指标、首日付费账号截止小时指标，并拆到 day/roi/retention/hour；MIG-050 子查询已逐个通过 schema 入参构造，其中小时时段 `19点-20点` 进入 `hour="19-20"`；MIG-052 风格文本拆到 day/roi/retention，`2026-01-01那一周` 进入自然周 `2025-12-29~2026-01-04` 与 `timeType=NATURAL_WEEK`；MIG-053 风格文本识别 `app_package_type` 输出维度并拆到 day/roi/retention，`2026年1月1号` 正常解析为 `2026-01-01`，应用类型分布通过 `subGroup=app_package_type` 表达；MIG-055/058 风格文本进入自然月 `2025-12-01~2025-12-31` 与 `timeType=NATURAL_MONTH`；留存子查询分别带 `DEVICE_RETENTION`、`REG_RETENTION`、`PAY_D1_RETENTION`。

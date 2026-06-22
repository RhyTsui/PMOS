# 规则债务与硬编码治理清单

日期：2026-06-21

原则：禁止在通用 Chat Core、Prompt、UI renderer、handler 中用业务关键词、媒体名、指标名、报表名、单个客户样例或临时测试需求写死路由、参数补齐或结果判断。发现项先登记，系统性迁移到 capability manifest、tool contract、metric catalog、Admin policy、workflow runtime 或受治理 seed。

## P0/P1 债务

| ID | 位置 | 违规类型 | 影响链路 | 处理路径 | 退出条件 |
| --- | --- | --- | --- | --- | --- |
| VNX-DEBT-001 | `frontend/src/src/lib/query-decomposer.ts` | 指标、时间、维度等中文正则/样例词参与查询拆解 | Request Understanding、Data Intelligence、Prompt/Tool 参数 | 建立 metric catalog 与 query intent contract；将同义词、时间粒度、字段投影放入受治理数据字典；Query Decomposer 只消费契约结果 | 新增非样例问法回放通过；源码不再用业务词正则决定查询结构 |
| VNX-DEBT-002 | `frontend/src/src/lib/report-query-orchestrator.ts` | 报表分组、输出形态存在规则推断 | Data Intelligence、Answer Composer、ResponseContract | 将报表类型、分组策略、字段投影、输出格式迁移到 report capability/tool contract；Answer Composer 按 contract 生成结论、口径、风险和动作 | 报表 case 可通过契约声明输出形态；无硬补数值和样例分支 |
| VNX-DEBT-003 | `frontend/src/src/contracts/mcp/tool-capability-normalization.ts` | 用 `report/rpt/daily/weekly/monthly/日报/周报/月报/报表/报告` 等正则推断能力 | Capability Discovery、MCP、Admin | MCP 工具能力必须由 manifest/tool metadata 暴露；归一化层只做 schema 适配和校验 | 新工具接入不依赖名称关键词；Admin 可审计能力分类来源 |
| VNX-DEBT-004 | `frontend/src/src/app/api/xiaoqiao/debug-automation/mcp-observe/[id]/route.ts` | 调试自动化名称正则识别 | Delivery & Integration OS、AI Service OS、Trace | Debug Automation 迁移到 workflow runtime 类型、task metadata 与 trace event type；API 不通过名称判断业务 | Trace 中可按 runtime/task 类型过滤；名称变化不影响识别 |
| VNX-DEBT-005 | `frontend/src/src/lib/intent-route-engine.ts` | `enabledTools` 或 route rule 中有调试、回传、自动化等业务关键词推断 | Request Understanding、Planner、Capability Discovery | Route policy 统一进入 Admin policy/capability manifest；运行时只执行 policy 编译结果 | 真实 `/api/chat` trace 显示路由依据来自 policy id，而非源码词表 |
| VNX-DEBT-006 | `frontend/src/src/lib/industry-intel-store.ts` | 行业情报 topic 关键词规则 | Intelligence Center、Public Web、Evidence Ledger | 建立 intelligence source policy 与 topic taxonomy；关键词仅作为可治理 seed，不在 runtime 决策 | 情报类 case 有 source policy、evidence level、topic id |
| VNX-DEBT-007 | `frontend/src/src/lib/intent-router.ts` | 旧式交付/取包 intent 分支风险 | Conversation OS、Delivery & Integration OS | 将旧 intent router 收敛为兼容 adapter，最终由 Request Understanding + Capability Discovery 接管 | 交付类 case 的 route trace 不再指向 legacy business branch |
| VNX-DEBT-008 | `scripts/run-second-round-tests.cjs` | 测试评估器存在场景特定判断，可能和运行时治理混淆 | Test Harness、Output Guardrail | 评估逻辑迁移到测试 manifest，按 `Excel行号 + 用例ID + 场景` 声明断言；明确测试侧规则不得进入 runtime | 测试报告显示每条断言来源；运行时代码不复制测试规则 |
| VNX-DEBT-013 | `frontend/src/src/lib/gi-intelligence-client.ts` | 情报查询窗口、关键词抽取、信源类型、种子拓展由客户端正则和 fallback 判断 | Intelligence Center、Capability Discovery、Public Web、Evidence Ledger、ResponseContract | 将情报查询意图、时间窗口、信源类型、种子拓展策略迁移到 intelligence source policy、topic taxonomy、tool contract 或 Admin policy；客户端只消费结构化 query contract 并做 transport adapter | 同类不同问法、无原关键词表达和低相关信源负例通过；源码不再用业务词正则决定 GI 查询结构，SourceRef/EvidenceRef 与 tool trace 可审计 |

## P2 债务

| ID | 位置 | 风险 | 处理路径 |
| --- | --- | --- | --- |
| VNX-DEBT-009 | Prompt store 与 managed prompt seed | Prompt 中如出现条件式业务判断，容易绕过 tool-grounded | Prompt 仅用于理解、规划、解释、改写；输出必须 schema 校验并进入 Evidence/Contract |
| VNX-DEBT-010 | UISchema/golden 覆盖 | 用户可见页面与结果区域可能未绑定 sourceRefs/evidenceRefs/mobile layout | 每个可见工作台和结果区域补 UISchema/golden，纳入 `validate:ad-ui` |
| VNX-DEBT-011 | Admin 配置真源 | capability、tool、route、model、prompt、safety、trace 分散 | 建立 Admin Control Plane 统一索引和变更审计 |
| VNX-DEBT-012 | 数据/测试口径冲突记录 | 可能被误修成硬补测试值 | 测试报告单列“数据/测试口径待复核”，真实 MCP 返回优先作为事实证据 |

## 迁移原则

1. 业务差异只能进入 manifest、contract、catalog、policy、workflow runtime 或受治理 seed。
2. 通用运行时只负责契约解释、候选能力发现、执行策略、证据落账、答案组合和安全校验。
3. 测试侧允许有断言，但必须与 runtime 隔离，不得把测试期望复制为产品逻辑。
4. 数据口径冲突不得通过 Answer Composer、Prompt 或前端硬补。

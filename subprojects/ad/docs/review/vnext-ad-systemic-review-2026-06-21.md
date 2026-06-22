# VNext AD 全面 Review 报告

日期：2026-06-21

产品真源：`E:\AI\ai-os\docs\sources\inbox\小乔智投AI服务平台白皮书_VNext_内部查看版.docx`

评审范围：AD 项目运行面、控制面、展示面、观测面、配置面；重点覆盖 `/api/chat`、Capability/Intent/Tool/ResponseContract、Evidence Ledger、Admin、Task Center、UISchema/golden、移动端决策流与测试收口。

## 结论

AD 项目已经具备一部分 VNext 底座雏形：Service Catalog 与 Capability Manifest 已出现 `Conversation OS / Data Intelligence / Intelligence Center / Delivery & Integration OS / AI Service OS`、`L0-L5`、证据需求、风险等级和审批策略等字段；`/api/chat` 已接入 Evidence Ledger、ResponseContract 与 Output Guardrail；报表、多查询、公开联网、知识库、诊断、取包等阶段存在工具证据记录点。

但当前不能标记为 VNext 收口完成，也不能进入全量上线准入。主要缺口是：真实 `/api/chat` 全量回放尚未从 Excel 第一条完整通过；规则债务仍存在于通用运行链路、能力归一化、查询拆解、调试自动化与部分测试评估器；Evidence Ledger 覆盖面需要真实回放证明；报表和诊断回答仍需产品化输出闭环；Admin Control Plane、Task Center、UISchema/golden 与移动端决策流仍未形成统一准入。

## VNext 对照矩阵

| VNext 中心 | 产品要求 | 当前代码承接 | 主要缺口 | 优先级 |
| --- | --- | --- | --- | --- |
| Conversation OS | 统一服务入口、需求理解、澄清、上下文、分诊、任务追踪、解释 | `/api/chat`、`intent-route-engine`、`service-catalog-contract`、`capability-manifest`、ResponseContract、Evidence Ledger | 仍需证明 Planner-first 的真实优先级；部分意图和能力归一化存在业务词正则；重复 MIG 用例曾按 ID 覆盖风险 | P0 |
| Data Intelligence | 问数、拼表、报表、分析、洞察、口径解释、可信证据 | `multi-query-stage`、`report-query-stage`、`query-decomposer`、`report-query-orchestrator`、Evidence Ledger | 数据/测试口径冲突不能硬补；字段投影、报告结论、口径、风险、下一步动作仍需统一 Answer Composer 契约 | P0 |
| Intelligence Center | 行业、竞品、广告、创意情报，预测和策略建议 | `industry-intel-store`、公开联网阶段、创意/洞察 capability 元数据 | 情报主题仍有关键词推断；缺少可治理 source policy、情报证据等级和策略建议准入 | P1 |
| Delivery & Integration OS | 媒体接入、监测回传、字段映射、联调交付、交付 SOP | 取包/联调相关 stage、debug automation API、automation templates | 调试自动化路由存在正则信号；交付 SOP 与 Workflow Runtime、Task Center、审批/回滚未统一 | P0 |
| AI Service OS | 任务调度、巡检、诊断、告警、自动化运行 | `scheduled-task-store`、`automation-execution-store`、`automation-scheduler`、Admin automation 页面与 API | Task Center 仍偏散点；Inspection/Diagnosis/Workflow Runtime 缺少统一运行状态、证据、审批和移动端承接 | P0 |

## 架构层 Review

| 层级 | 当前状态 | 风险判断 |
| --- | --- | --- |
| Request Understanding | 已有意图路由与澄清相关能力，但仍需用契约化结果证明不是业务 if/else 主导 | P0：通用入口必须迁移到配置/能力契约 |
| Chat Domain / Planner / Arbitrator | 代码存在多阶段 orchestrator 和 service catalog，但真实优先级需要测试回放验证 | P0：需要 Trace 证明 planner 候选、仲裁、fallback 全链路 |
| Capability Discovery | Capability Manifest 已有 VNext 字段 | P1：能力发现与 tool contract、Admin policy 未完全统一 |
| MCP / Tool | 多查询、报表、联网、知识库等已有工具调用与证据记录 | P0：工具失败、空结果、权限不足、降级证据需要回放 |
| Model Service / Prompt | Prompt store/seed 已存在 | P1：Prompt 不得承担路由、补数值或业务规则判断，需要守卫 |
| ResponseContract | 已输出 source/evidence/tool trace/safety 等字段 | P0：需对每条真实 case 校验完整性与一致性 |
| Frontend Presentation | 会话工作台、运行过程、自动化入口、移动端状态已有基础 | P1：UISchema/golden 与移动端决策流覆盖不足 |
| Observability | Evidence Ledger、process events、trace 字段存在 | P0：真实回放与 Output Guardrail 必须成为准入门禁 |
| Admin | Admin 有 service/config/automation 入口 | P0：能力、工具、路由、模型、Prompt、Evidence、Safety、Trace、feature flags 多真源风险仍需收束 |

## 本轮已落地调整

测试执行脚本已从“按用例 ID”升级为“按 Excel 行号 + 用例 ID + 测试场景”唯一定位，避免 `MIG-000~014` 重复编号覆盖结果。新增执行口径：

- `SECOND_ROUND_EXCEL_ROWS=2-16`
- `SECOND_ROUND_ROW_RANGE=2-16,20,25-30`
- 结果、checkpoint、明细表写入 `excelRow` 与 `caseKey`

首批用例必须从 Excel row 2 开始，即 `R2-MIG-000-连通`。

## 阻断项

1. 当前测试源实际包含 107 条有用例 ID 的有效用例，真实 `/api/chat` 全量回放尚未完成，不能声明测试收口。
2. 高风险规则债务仍在运行链路和能力归一化链路中，必须迁移到 capability manifest、tool contract、metric catalog、Admin policy、workflow runtime 或受治理 seed。
3. Evidence Ledger 需要覆盖工具成功、工具失败、空结果、知识库、公开联网、planner inference、fallback、invalid date、权限不足、模型降级。
4. 报表、周报、月报、复盘、诊断、策略建议回答需要统一产品化契约，不能只返回证据表预览。
5. Admin Control Plane 仍需统一治理 capability、tool contract、route policy、model/prompt、Evidence policy、Safety policy、Trace、feature flags。
6. Task Center、Inspection Runtime、Diagnosis Runtime、Workflow Runtime 需要从页面/脚本散点升级为可配置、可调度、可追踪、可复用 runtime。
7. UISchema/golden、sourceRefs/evidenceRefs、desktop/mobile layout、空态/加载/错误/权限/移动端承接仍需补齐。

## 上线判断

当前结论：不具备 VNext 全量上线准入。可以进入“系统性整改与分批回放”阶段，不能以局部 MIG 修复或单项静态门禁通过作为上线依据。

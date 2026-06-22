# 上线准入结论

日期：2026-06-21

结论：当前不具备 VNext 全量上线准入。

## 可进入下一阶段的部分

- VNext 产品真源已抽取为五大中心、八类核心场景、L0-L5 自动化等级、组织边界和技术原则。
- Service Catalog 与 Capability Manifest 已具备 VNext 字段基础。
- `/api/chat` 已具备 Evidence Ledger、ResponseContract、Output Guardrail 接入基础。
- 二轮测试脚本已支持从 Excel 第一条开始，按 `Excel行号 + 用例ID + 测试场景` 唯一定位。
- 可进入分批真实回放与系统性整改阶段。

## 阻断上线的问题

| 阻断项 | 影响 | 准入要求 |
| --- | --- | --- |
| 全量真实回放未完成 | 无法证明当前测试集 107 条有效用例可重复通过 | rows 2-129 中有用例 ID 的有效行全部有真实 `/api/chat` 记录和失败归因 |
| 规则债务未清理 | 可能绕过 Planner-first、tool-grounded、contract-guarded | P0 清零，P1 有迁移计划和守卫 |
| Evidence Ledger 未全场景回放 | 无法审计答案依据和工具链路 | 工具成功/失败/空结果/知识库/公开联网/planner/fallback/权限/模型降级均有样例 |
| 报表产品化回答不足 | 用户只看到数据片段，缺少结论、口径、风险和动作 | 报表/复盘/诊断/策略建议统一 Answer Composer contract |
| Admin Control Plane 未统一 | 多处配置真源导致治理漂移 | capability、tool、route、model/prompt、Evidence、Safety、Trace、feature flags 统一治理 |
| Task Center/Runtime 未闭环 | 自动化运行不可调度、不可追踪或不可审批 | Task Center、Inspection、Diagnosis、Workflow Runtime 统一状态与审计 |
| UISchema/golden/mobile 不完整 | 用户体验和前端准入不可验证 | 关键页面和结果区域均有 schema、golden、移动端决策流 |
| 数据/测试口径冲突未复核 | 容易诱发硬补数值 | 明确事实源、口径归属和复核流程 |

## 准入门槛

1. `validate:ad-ui`、`check:encoding`、`git diff --check`、Output Guardrail、report-query/multi-query self-test、二轮评估器 self-test 通过。
2. Batch A rows 2-16 完成真实回放，失败项全部归因；当前仅完成登录态阻断归因，业务链路未进入。
3. Batch B rows 17-76 完成真实回放，报表类输出满足结论、证据、口径、风险、下一步动作。
4. Batch C rows 77-129 完成真实回放，交付、反馈、自动化类输出满足 task/runtime/approval/trace 要求。
5. P0 规则债务清零；P1 债务有迁移 owner、验证方式和退出日期。
6. Evidence Ledger 与 ResponseContract 字段一致性纳入准入报告。

## 当前阶段建议

进入“VNext 系统性整改 + 分批回放”阶段。禁止以局部修复、单个报表数值对齐或单个 MIG case 通过作为收口依据。

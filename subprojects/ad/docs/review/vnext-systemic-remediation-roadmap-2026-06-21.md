# 系统性整改路线图

日期：2026-06-21

原则：不采用最小补丁收口。每个 P0/P1 问题必须给出系统迁移目标、退出条件、验证矩阵和回滚边界。

## Phase 0：准入底座

目标：先让测试和评审口径可信。

- 统一测试定位：`Excel行号 + 用例ID + 场景`
- 统一 checkpoint：保存 `excelRow`、`caseKey`、ResponseContract、Evidence Ledger、ToolCallTrace、process_events
- 统一失败分类：真实缺陷、数据/测试口径待复核、环境阻断、权限阻断、规则债务
- 统一门禁：`validate:ad-ui`、`check:encoding`、`git diff --check`、Output Guardrail、report-query/multi-query self-test、二轮评估器 self-test

退出条件：Batch A rows 2-16 可重复执行，报告不覆盖重复 MIG ID，失败原因可定位到真实链路。

## Phase 1：Conversation OS

目标：统一服务入口从“可回答”升级为“可理解、可规划、可追踪、可解释”。

- Request Understanding 输出 schema 化需求、上下文、澄清、风险和目标对象
- Task Planner 生成候选计划，不直接执行业务分支
- Plan Arbitrator 合并 LLM、IntentOrch、policy fallback 候选，并记录仲裁证据
- Capability Discovery 只消费 capability manifest/tool metadata/Admin policy
- 移除通用运行链路中的业务关键词路由和样例词分支

验证矩阵：通用 Chat、联网、知识库、系统帮助、指标解释、问数首批 case；每条检查 planner trace、capability source、fallback reason。

## Phase 2：Data Intelligence

目标：问数和报表成为可信数据服务，而不是脚本化表格输出。

- 建立 metric catalog：指标、口径、字段投影、同义词、时间粒度、维度、权限
- 建立 report contract：日报、周报、月报、复盘、诊断、策略建议的输出结构
- Answer Composer 固定输出结论、证据、口径、风险、下一步动作
- Evidence Ledger 覆盖工具成功、失败、空结果、数据截断、权限不足、数据延迟
- 禁止为测试期望硬补数值；口径冲突进入复核队列

验证矩阵：rows 17-76 报表专项，外加非硬编码同义问法、不同媒体/指标/日期/维度反样例。

## Phase 3：Intelligence Center

目标：行业、竞品、广告、创意情报可追溯、可分级、可用于策略建议。

- 建立 intelligence source policy：公开联网、知识库、内部情报、用户输入的证据等级
- 建立 topic taxonomy，替换 runtime 关键词判断
- 策略建议必须包含依据、适用条件、风险、置信度和人审要求
- 预测类能力明确数据来源、模型边界和不可自动执行范围

验证矩阵：行业文档解读、新闻解读、创意与策略建议类 case；检查 evidence mode 与 freshness。

## Phase 4：Delivery & Integration OS

目标：交付、取包、联调、回传、字段映射进入 Workflow Runtime。

- 将交付 SOP 建模为 workflow template、task type、step contract、approval policy
- Debug Automation 不再靠名称正则识别，改用 runtime metadata 与 trace event type
- Task Center 展示当前进展、阻断原因、证据、下一步动作和审批
- 交付结果能回写当前会话，支持移动端继续处理

验证矩阵：取包、联调、交付、反馈类 case；检查任务状态、审批、回滚、trace。

## Phase 5：AI Service OS

目标：自动化运行入口具备 L0-L5 分级、调度、巡检、诊断、告警和审计。

- Operation Safety Policy 统一落地到 workflow runtime
- L0-L2 默认建议和解释；L3 必须人审；L4 只允许低风险自动执行并有回滚；L5 需成熟闭环
- Inspection Runtime 与 Diagnosis Runtime 统一事件、证据、告警和复盘
- Admin Control Plane 管理 capability、tool contract、route policy、model/prompt、Evidence policy、Safety policy、Trace、feature flags

验证矩阵：自动化、巡检、诊断、反馈闭环 case；检查审批、审计、回滚和告警。

## Phase 6：Frontend、UISchema、Golden、Mobile

目标：用户看到的是 AI 会话驱动工作台，不是传统后台或研发说明页。

- 会话工作台、运行过程、Task Center、Admin、结果区域补 UISchema/golden
- 每个结果区域声明 `screenType`、`layout`、`regions`、`sourceRefs`、`evidenceRefs`
- 覆盖空态、加载、错误、权限、移动端堆叠和下一步动作
- 用户页面禁止工程黑话，按钮和提示必须说明“这是什么、帮用户做什么、下一步能做什么”

验证矩阵：`validate:ad-ui`、golden diff、移动端截图/布局检查、Output Guardrail。

## 回滚边界

- 若 runtime policy 迁移导致能力发现下降，允许回退到受治理 adapter，但必须保留 trace 标记和迁移截止项。
- 若真实 MCP 数据与测试期望冲突，回滚测试期望或标记复核，不回滚产品逻辑去补数值。
- 若自动化执行风险超出 L3/L4 准入，回退到建议/人审，不允许静默自动执行。

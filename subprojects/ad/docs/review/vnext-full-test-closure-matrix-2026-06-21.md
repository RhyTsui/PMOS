# 全量测试收口矩阵

日期：2026-06-21

测试集：`E:\AI\ai-os\docs\sources\inbox\小乔智投测试集v1.1.xlsx`

Sheet：`广告业务测试集`

实际文件统计：原始数据行 128 行，有用例 ID 的有效用例 107 条；有效行从 Excel row 2 开始，最后一个有用例 ID 的行是 row 129。脚本执行口径按 `用例ID` 过滤，避免把无 ID 的说明/备注行误当用例。

## 唯一定位规则

测试集中 `MIG-000~014` 存在重复编号。执行、checkpoint、明细报告和评审记录必须统一使用：

`R{Excel行号}-{用例ID}-{测试场景}`

示例：`R2-MIG-000-连通`。

## 执行批次

| 批次 | Excel 行号 | 覆盖范围 | 状态 |
| --- | --- | --- | --- |
| Batch A | rows 2-16 | 通用 Chat、联网、知识库、基础问数 | 待真实回放 |
| Batch B | rows 17-76 | 广告报表专项 | 待真实回放 |
| Batch C | rows 77-129 | 反馈、边缘、交付类用例，执行时按用例 ID 过滤 | 待真实回放 |

## 执行命令

PowerShell 示例：

```powershell
$env:SECOND_ROUND_NON_INTERACTIVE='1'
$env:SECOND_ROUND_KILL_SERVER_ON_MEMORY_GUARD='1'
$env:SECOND_ROUND_EXCEL_ROWS='2-16'
node scripts\run-second-round-tests.cjs
```

也可以使用 `SECOND_ROUND_ROW_RANGE=2-16,20,25-30` 做分片回放。

本轮已执行 Batch A rows 2-16 的非交互真实链路启动检查：服务可用，登录态文件存在，但登录态已失效，15 条均被阻断并写入 checkpoint `docs/review/小乔智投测试集v1.1_second-round-20260621-224214.checkpoint.json`。该 checkpoint 已包含 `selectedExcelRows`、`excelRow`、`caseKey` 和统一阻断原因。

## 每条 Case 必验字段

| 检查项 | 要求 |
| --- | --- |
| 真实链路 | 必须 `POST /api/chat`，不得用静态 mock 替代 |
| SSE | 必须收到 done 或明确阻断原因 |
| 主消息 | 面向用户、无工程黑话、无乱码 |
| ResponseContract | `answer_origin`、`contract_safety`、`source_refs`、`evidence_refs`、`tool_call_trace` 必须一致 |
| Evidence Ledger | 覆盖工具成功/失败/空结果/知识库/公开联网/planner/fallback/权限/模型降级等实际路径 |
| process_events | 能还原理解、规划、执行、组合、守卫阶段 |
| Output Guardrail | 无硬补数值、无数据口径绕路、无不合规免责声明 |
| 乱码健康 | 源码、报告、UI 文案不得出现真实错码或 U+FFFD |
| 非硬编码补测 | 每批至少加入同义问法、不同媒体/指标/日期/报表形态的反样例 |

## Batch A 首批矩阵

| 唯一键 | 用例ID | 场景 | Prompt | 当前状态 | 阻断/关注点 |
| --- | --- | --- | --- | --- | --- |
| R2-MIG-000-连通 | MIG-000 | 连通 | 你好 | 登录态阻断 | 简单回答也需 contract 与 safety |
| R3-MIG-001-天气 | MIG-001 | 天气 | 现在杭州天气怎么样 | 登录态阻断 | 公开信息来源和日期时效 |
| R4-MIG-002-新闻解读 | MIG-002 | 新闻解读 | 最近杭州有什么新闻 | 登录态阻断 | 公开联网证据、时间范围 |
| R5-MIG-003-行业文档解读 | MIG-003 | 行业文档解读 | 当前游戏行业广告投放有什么趋势 | 登录态阻断 | 情报来源和观点边界 |
| R6-MIG-004-行业知识问答 | MIG-004 | 行业知识问答 | 介绍一下IAA游戏 | 登录态阻断 | 知识解释和证据模式 |
| R7-MIG-005-系统知识问答 | MIG-005 | 系统知识问答 | 小乔智投有什么功能 | 登录态阻断 | 产品语言，不能写工程黑话 |
| R8-MIG-006-系统操作帮助 | MIG-006 | 系统操作帮助 | 怎么配置联调 | 登录态阻断 | 交付 SOP 与下一步动作 |
| R9-MIG-007-指标解释 | MIG-007 | 指标解释 | 什么是arpu | 登录态阻断 | 指标口径来源 |
| R10-MIG-008-系统说明 | MIG-008 | 系统说明 | 什么是小乔智投 | 登录态阻断 | VNext 定位：AI 服务操作系统 |
| R11-MIG-009-查大盘数据 | MIG-009 | 查大盘数据 | 昨日大盘消耗 | 登录态阻断 | 时间解析、MCP 数据证据 |
| R12-MIG-010-查维度数据 | MIG-010 | 查维度数据 | 昨日不同媒体的消耗情况 | 登录态阻断 | 维度投影、SourceRef |
| R13-MIG-011-查明细数据 | MIG-011 | 查明细数据 | 昨日所有计划的消耗情况 | 登录态阻断 | 明细规模、分页/截断说明 |
| R14-MIG-012-查维度数据 | MIG-012 | 查维度数据 | 上周各项目消耗情况 | 登录态阻断 | 周期口径、项目维度 |
| R15-MIG-013-查多日数据 | MIG-013 | 查多日数据 | 最近7天每天消耗 | 登录态阻断 | 时间序列字段投影 |
| R16-MIG-014-查多日数据 | MIG-014 | 查多日数据 | 过去一周每天消耗 | 登录态阻断 | 同义时间表达不能靠样例词 |

说明：上表中 rows 2-15 同样已在本轮 checkpoint 中记录为“登录态失效，非交互模式不弹出浏览器”。业务链路尚未进入，因此 ResponseContract/Evidence/ToolCallTrace 不得标记通过。

## 数据口径冲突规则

真实 MCP 返回作为默认事实证据。若测试集期望与真实数据不一致，记录为“数据/测试口径待复核”，禁止在 runtime、Prompt、Answer Composer、UI renderer 中硬补数值。

## 当前准入状态

未完成。必须刷新登录态后完成三批真实回放，并对失败项按 P0/P1/P2 归档后，才能进入上线准入判断。

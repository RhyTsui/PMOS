# Documentation Normalization Artifact

- runId: docnorm-75597177-2a4a-41a2-aa43-5c801ccc7a02
- sourceRoot: docs/sources/inbox
- sourcePath: docs/sources/inbox/周报-产品组-徐韵-0509.xlsx
- documentType: historical-source
- suggestedTarget: docs/sources/historical/周报-产品组-徐韵-0509.xlsx
- projectHints: knowledge-base, platform

## Extracted Signals

- contains:ui-scope

## Normalization Decision

- Keep the original source immutable until the generated requirement/version trace is reviewed.
- Move or rewrite into the suggested target only after review.
- Preserve this artifact as the audit link between source material and governed repository taxonomy.

## Source Preview

```text
## Sheet1

| 周报5月9号 |
| --- |
| 项目 | 需求方 | 本周工作 | 汇报人 | 进度 | 备注 | 下周计划 | 进度 |
| PMOS | 产品 | 完善AI工作流 | 徐韵 | 0.75 | v0.7-完善Hermes+接入Dataki+漂移治理
魔方：总用户547 周活250 周活率46% 周访问量1.1万 下载人数96
智投：总用户151 周活62 周活率41% 周访问量1.1万
埋点：总用户191 周活30  周活率16% 周访问量1000 | v1.0-产品经理agent发布，部署到UI和测试电脑试用 | 0.85 |
| Dataki | 发行 | 广告知识建设 | 徐韵 | 0.1 | 导入失败BUG+缺进度条
v1.1-小闪登录验收
v1.2-Prompt跟进
v1.3-知识自动更新 | 广告知识导入
v1.1上线 | 0.3 |
| 连弩 | 测试 | 测试平台项目跟进 | 徐韵 | 0.35 | 解决需求和工程卡点
V0.1 coze部署 周六上线
V0.2 项目接入，开始接入魔方问数
V0.3 AI自动生成评测集
V0.4 观测统计
V0.5 观测自动化任务，开始接入小乔智投
V1.0 正式使用 5.29 | v0.2上线 | 0.5 |
| 埋点 | 数分 | 埋点验收需求沟通 | 徐韵 | 0.55 | 1.杭州数分和上海数分的工作模式不同，验收标准不同
2.当前采用需求结构化设计的方式，让系统和AI能理解需求和自动校验
3.数分希望一次性录入高频复用，但每次的验收差异都需要录入
4.待进一步调整产品形态 | 提炼确定性的埋点需求，结构化设计并内置到系统 | 0.55 |
| 智投 | 数分 | 广告Agent拆解 | 徐韵 | 0.7 | 先做4个agent：需求agent、帮助agent、排查agent、联调agent
3.14.15.2-财务折扣需求
v3.14.16-存量报表MCP | 完成版本拆解和启动开发
3.14.15.2和v3.14.16测试上线 | 0.8 |
| 魔方 | ALL | 1. 魔方问数-v1.0，周三已开放全量用户上线。
2. 魔方问数-v1.1，完成demo周会评审，新增ai报告/ai解读需求。
3. 魔方-v1.20-多终端适配，周六已上线。 | 冯康平 | 0.5 |  | 1. 完成问数-ai报告集成demo设计评审。
2. 完成魔方-ai解读demo设计评审。
3. 问数-v1.0.1上线，支持项目搜索等。 | 0.55 |
| 多维 | ALL | 评审确认5月计划，项目接入/sql报表mcp/低代码报表mcp/预聚合分析mcp。 | 冯康平 | 0.5 |  | 多维报表MCP、预聚合分析MCP方案细化。 | 0.55 |
| 智投 |  | 【智投v3.14.16_存量报表MCP/二部需求】测试范围+测试执行
1、智投报表_新增指标+汇总口径（测试执行） | 吴艳兰 |  | 预计5.14上线 | 【智投v3.14.16_存量报表MCP/二部需求】测试执行+生产验证
1、智投报表_新增指标+汇总口径（待bugfix+回归）
2、智投MCP_新增11个tools（测试执行） |
| 智投 |  | 【广告排查诊断AI Agent】
1、广告自动联调demo：整理平移交接文档
实现技术栈调研：Browser Use (Web) + TuriX-CUA (Mobile) + MiniMax (Brain) 智感联动较优
功能：web UI 生成广告联调二维码 -->同步二维码至手机真机-->App UI 触发媒体广告并下载游戏 ->App UI 游戏启动+登录 ->mcp 接收数据+归因流程+媒体回传监控
2、归因表mcp mock 整理平移交接文档
 | 吴艳兰 |  |  | 【小乔-智投】
1、自动联调+问题排查+使用帮助 文档熟悉+拆解
2、 整理并转化Agent 友好的归因和智投日常问题+排查决策树文档 | 1 |
| 连弩 |  | 【AI 专项测试】 
1、OpenAI_Agent SDK调研完善
2、ceze 罗盘试用中 | 吴艳兰 |  |  | 【AI 专项测试】 
ceze 罗盘调研试用 | 1 |
| 连弩 | all | 【5月版本】
1.整理沟通记录、梳理版本计划
2. V0.1部署：跟进部署
3. V0.2项目接入：整理需求文档、demo | 许晴 | 0.1 |  | 【5月版本】
1.V0.2项目接入：跟进验收
2.V0.3 AI自动生成评测集：整理需求文档、demo | 0.5 |
| 魔方 | all | 【V1.20_多终端互通项目适配_测试执行】 | 许晴 | 1 |  | 【多维看板mcp_测试】 | 1 |


```

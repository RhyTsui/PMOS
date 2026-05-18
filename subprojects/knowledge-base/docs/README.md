# 知识库项目文档入口

## 当前主入口

- [Dataki v1.1 首版定义](./Dataki-v1.1首版定义.md)
- [Dataki v1.1 组件库与小闪登录对齐说明](./Dataki-v1.1组件库与小闪登录对齐说明.md)
- [Dataki v1.1 前台文件接管与组件映射](./Dataki-v1.1前台文件接管与组件映射.md)
- [Dataki v1.1 设计出图与确认清单](./Dataki-v1.1设计出图与确认清单.md)
- [Dataki v1.1 页面清单与页面流](./Dataki-v1.1页面清单与页面流.md)
- [Dataki v1.1 统一资产模型与权限模型](./Dataki-v1.1统一资产模型与权限模型.md)
- [Dataki v1.1 前后端任务拆分表](./Dataki-v1.1前后端任务拆分表.md)
- [Dataki v1.1 本地 Demo 验收清单](./Dataki-v1.1本地Demo验收清单.md)
- [Dataki v1.1 分支保存与回退机制](./Dataki-v1.1分支保存与回退机制.md)
- [WeKnora 二开准备与 PMAIOS v0.5 收敛方案](./WeKnora二开准备与PMAIOS-v0.5收敛方案.md)
- [WeKnora 开工条件检查清单](./WeKnora开工条件检查清单.md)
- [WeKnora 前台沿用接管方案](./WeKnora前台沿用接管方案.md)
- [WeKnora 容器启动依赖清单](./WeKnora容器启动依赖清单.md)
- [WeKnora 适配性评估](./WeKnora适配性评估.md)
- [知识资产平台二开计划 v1.1](./知识资产平台二开计划-v1.1.md)
- [知识资产平台 v1.1 研发任务单](./知识资产平台v1.1研发任务单.md)
- [知识库项目执行工作流](./知识库项目执行工作流.md)

## 扫描与证据

- 扫描脚本：`subprojects/knowledge-base/tools/weknora-prep-scan.mjs`
- 默认输出目录：`subprojects/knowledge-base/docs/scan/`
- 推荐命令：`node subprojects/knowledge-base/tools/weknora-prep-scan.mjs`

首次扫描会生成以下产物：

- `weknora-file-tree.json`
- `weknora-module-summary.json`
- `weknora-route-map.json`
- `weknora-prep-scan-report.md`

## v1.1 规划与设计

- [知识资产平台整体规划 v1.1](./知识资产平台整体规划-v1.1.md)
- [知识资产平台 v1.1 产品设计文档](./知识资产平台v1.1产品设计文档.md)
- [知识资产平台 v1.1 页面清单](./知识资产平台v1.1页面清单.md)
- [知识资产平台 v1.1 开发排期](./知识资产平台v1.1开发排期.md)
- [知识资产平台 v1.1 前后端接口清单](./知识资产平台v1.1前后端接口清单.md)
- [知识资产平台 v1.1 本地验证与生产交接](./知识资产平台v1.1本地验证与生产交接.md)

## 权限与架构分析

- [知识资产平台 v1.1 权限需求分析](./知识资产平台v1.1权限需求分析.md)
- [知识资产平台 v1.1 权限评审包](./知识资产平台v1.1权限评审包.md)
- [知识资产平台 v1.1 权限二开降级方案](./知识资产平台v1.1权限二开降级方案.md)
- [v1.1 权限主模型 HTML](./html/v1.1-permission-main-model.html)
- [WeKnora 现有权限架构 SVG（中文）](./svg/weknora-permission-architecture-cn.svg)
- [WeKnora 空间机制详解 SVG（中文）](./svg/weknora-space-mechanism-cn.svg)
- [公司 AI 应用与知识资产权限架构 SVG](./svg/company-ai-kb-permission-architecture-cn.svg)

## 工程基线

- [v1.1 工程清单代码](../src/v1.1/engineeringManifest.ts)
- [v1.1 API 合同壳](../src/v1.1/apiContractShell.ts)
- [v1.1 页面路由图谱](../src/v1.1/moduleRouteMap.ts)
- [v1.1 企业权限基线](../src/v1.1/enterprisePermissionBaseline.ts)
- [v1.1 本地验证执行包骨架](../src/v1.1/localValidationExecutionPlan.ts)

## 历史输入

- [知识库整体规划](./知识库整体规划.md)
- [知识库 v1.0 整体设计方案](./知识库%20v1.0%20整体设计方案.md)
- [PRD 草稿](./PRD.md)
- [架构草稿](./ARCHITECTURE.md)

## 说明

- 当前正式真源以“准备包 + v1.1 文档 + 扫描产物”为主。
- 旧版 `PRD.md` 和 `ARCHITECTURE.md` 保留为历史输入，不作为当前二开准备的唯一依据。

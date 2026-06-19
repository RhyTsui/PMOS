# Artifact & Task Architecture

> Parent: `docs/architecture/ENTERPRISE_AI_CHAT_OS_SPEC.md`

## Artifact

Artifact 是可保存、复用、下载、分享或继续处理的业务产物。示例：报表、诊断包、导出文件、图表、分析摘要、审批材料。

Artifact Contract 最少包含：`artifactId`、`type`、`title`、`status`、`sourceRefs`、`evidenceRefs`、`createdAt`、`owner`、`contentRef`、`actions`。

## Task

Task 是异步或长流程状态对象。示例：报表生成、审批、批量查询、联调诊断、文件解析。

Task Contract 最少包含：`taskId`、`type`、`state`、`progress`、`owner`、`startedAt`、`updatedAt`、`artifactRefs`、`runtimeRefs`、`actions`。

## 展示边界

主消息展示 Artifact/Task 摘要与下一步动作；右侧披露展示时间线、执行步骤、错误归一化、证据与原始输出。

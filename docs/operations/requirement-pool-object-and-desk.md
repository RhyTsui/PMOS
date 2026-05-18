# Requirement Pool Object And Desk

- version: v0.1
- date: 2026-05-07
- status: active
- scope: PMOS platform runtime + subproject workflow
- purpose: 将需求池从分散 requirement 记录提升为平台正式对象、正式摄取链和正式运营桌面

## 1. Why This Must Exist

当前仓库已经有 requirement 记录、会话摄取、文档归一化摄取和 `Requirement + Version Desk`。

但这些还不等于真正的“需求池”。

现在缺的是：

1. 平台池与子项目池的双层结构
2. 统一的来源分类与摄取链
3. 从 `raw signal` 到 `normalized / promoted / solved` 的生命周期
4. 与 `Task SSOT / gate / version / UI schema / proof-of-work` 的正式双向链接
5. 让虚拟产品主管、虚拟产品经理、真实产品经理都围绕同一池子工作

## 2. Two-Layer Pool

### 2.1 PMOS Platform Requirement Pool

用于承接：

1. 平台版本需求
2. runtime / gate / scheduler / Hermes / proof-of-work 需求
3. 治理、规则、workflow、desk 需求
4. 从子项目回流并被平台化提升的共性需求

### 2.2 Subproject Requirement Pool

每个子项目单独一池，用于承接：

1. 业务需求
2. 设计调整
3. 实现承接需求
4. 验收发现问题
5. 运行中回流的 blocker / rework / follow-up

规则：

1. 子项目需求默认先进入子项目池
2. 只有抽象成共性治理、共性运行时、共性模板后，才提升进平台池
3. 平台池不能被业务子项目日常噪音覆盖

## 3. Requirement Lifecycle

正式需求池不该只有 `draft / active / done / archived` 四态，还应有上层治理态：

1. `raw-signal`
   - 刚从会议纪要、会话、输入文档、自动采集、运行时事件里抓到
2. `normalized`
   - 已整理成正式 requirement 记录
3. `promoted`
   - 已晋升到 plan / backlog / active runtime line
4. `active`
   - 已进入当前执行主线
5. `solved`
   - 原始用户场景或产品场景已被闭环解决
6. `archived`
   - 已结束且保留历史
7. `rejected`
   - 明确不做，并带原因

当前仓库里的 `Requirement.status` 仍可保留轻量实现，
但平台真源应明确存在上述治理层状态，后续用 `metadata.lifecycle` 承接也可以。

## 4. Source Ingestion

需求池的正式来源应至少包括：

1. `meeting-note`
2. `chat`
3. `input-document`
4. `product-output`
5. `workflow-run`
6. `runtime-gate-event`
7. `acceptance-review`
8. `auto-capture`
9. `manual`

对应摄取链：

`ingest -> detect -> normalize -> dedupe -> classify -> write -> link -> review -> promote`

## 5. Required Fields

每条需求池条目至少应具备：

1. `id`
2. `poolScope`
   - `platform`
   - `subproject`
3. `subprojectId`
4. `title`
5. `description`
6. `category`
7. `priority`
8. `status`
9. `lifecycle`
10. `source.kind`
11. `sourceRef`
12. `linkedRequirementIds`
13. `linkedVersionIds`
14. `linkedRunIds`
15. `linkedTaskIds`
16. `linkedGateIds`
17. `linkedOutputIds`
18. `artifactPaths`
19. `createdAt`
20. `updatedAt`

## 6. Operating Roles

### 6.1 Virtual Product Supervisor

负责：

1. 跨池扫描
2. 去重与冲突识别
3. 从子项目池提升到平台池
4. 检查哪些需求还没被正式落位

### 6.2 Virtual Product Manager

负责：

1. 子项目内需求拆解
2. 维护状态
3. 连接设计、实现、验收链
4. 在需求变化后回写相关对象

### 6.3 Real Product Manager

负责：

1. 确认、纠偏、关闭
2. 调整优先级
3. 决定提升、搁置、拒绝
4. 回查需求池是否真实反映项目进展

## 7. Desk Shape

`Requirement Pool Desk` 至少应有这些区：

1. `Inbox`
   - 新摄取、待归一化信号
2. `Pool`
   - 正式 requirement 列表
3. `Promotion`
   - 已晋升到版本、backlog、runtime 的需求
4. `Trace`
   - 与 task / gate / version / output / proof 的双向链接
5. `Loss Audit`
   - 识别“提过但没落位”的需求

## 7.1 Excel Operating Surface

需求池可以采用 `Excel (.xlsx)` 作为真实产品经理和虚拟 PM 的正式操作面，但不应替代 repo 内结构化 requirement 真源。

建议落法：

1. 平台池默认文件
   - `docs/operations/requirement-pool.xlsx`
2. 子项目池默认文件
   - `subprojects/<id>/docs/operations/requirement-pool.xlsx`
3. 同步原则
   - Excel 负责批量查看、筛选、编辑、排序、备注
   - repo requirement JSON 负责运行时读写、traceability、gate/version/output 链接
   - 导入按 `id` 优先更新；无 `id` 条目创建新 requirement
4. 当前 CLI 入口
   - `npm run cli -- requirement-pool path [--subproject <id>]`
   - `npm run cli -- requirement-pool export [outputPath] [--subproject <id>]`
   - `npm run cli -- requirement-pool import <inputPath> [--subproject <id>]`

推荐 Excel 列：

1. `id`
2. `pool_scope`
3. `subproject_id`
4. `title`
5. `description`
6. `category`
7. `priority`
8. `status`
9. `lifecycle`
10. `source_kind`
11. `source_entity_type`
12. `source_entity_id`
13. `source_path`
14. `source_label`
15. `source_session_id`
16. `source_message_id`
17. `source_run_id`
18. `linked_requirement_ids`
19. `linked_version_ids`
20. `linked_run_ids`
21. `linked_task_ids`
22. `linked_gate_ids`
23. `linked_output_ids`
24. `artifact_paths`
25. `owner`
26. `notes`
27. `created_at`
28. `updated_at`

## 8. Integration Targets

需求池后续必须接回：

1. `Task SSOT`
2. `SchedulerRun`
3. `Gate Runtime`
4. `Hermes compare/promote`
5. `UI schema contract`
6. `proof-of-work bundle`
7. `Version Desk`

## 9. Current Repo State

当前已有：

1. `RequirementService`
2. 会话摄取
3. 文档归一化摄取
4. `Requirement + Version Desk`

当前缺失：

1. 平台池 / 子项目池双层结构显式对象化
2. 更完整的 source kind
3. 生命周期治理态
4. runtime / gate / output 双向 trace
5. 真正意义上的 Requirement Pool Desk

## 10. Backcheck

- 用户需求：每个子项目和 PMOS 都应该有需求池，虚拟产品主管、虚拟产品经理、真实产品经理都围绕需求池工作
  - 当前状态：`partial`
  - 说明：仓库已有 requirement 雏形和摄取链，但还没升成正式 requirement pool object 和正式 desk

- 产品需求：需求池应支持从会议纪要、会话、输入文档、自动采集等来源自主分析、写入、读取、更新
  - 当前状态：`partial`
  - 说明：会话和文档来源已存在，会议纪要、自动采集、runtime 事件回流还需补齐为正式来源

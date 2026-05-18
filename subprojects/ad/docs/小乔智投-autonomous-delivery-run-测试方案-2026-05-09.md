# 小乔智投-autonomous-delivery-run-测试方案-2026-05-09

- 版本：v0.1
- 状态：active
- 日期：2026-05-09
- 适用范围：`ad` 子项目作为 PMAIOS autonomous delivery run 首个实战测试样本

---

## 0. 文档目的

这份文档只做 4 件事：

1. 固定 `ad` 子项目作为 autonomous delivery run 首个实战样本
2. 固定本轮唯一输入包、目标树、任务 DAG 和压测边界
3. 固定 `Goal Manager runtime / Context 注入 / Review 打分 / auto rework / 60 分钟连续执行` 的测试口径
4. 固定 Web 面板必须追踪的运行字段

这不是产品规划补丁，也不是一次性汇报。

---

## 1. 样本选择结论

`ad` 当前适合作为首个实战样本，原因如下：

1. 真源包已成套存在，且已明确进入 `aiocoding` 前的统一交付口径
2. 前后端最小运行链已在，可真实承接会话、任务、结果和工作台状态
3. 当前主要卡点在开发实现、结果 contract、联调闭环，而不在需求缺失
4. 这正适合验证 autonomous delivery run 在“实现受阻但真源已齐”场景中的稳定性

补充约束：

1. 本文档用于运行时验证，不直接定义业务首页信息架构
2. 这里提到的运行状态、压测证据、恢复能力，默认是二级承接面，不要求首页常驻平铺展示

本轮不验证：

1. 真实生产数据源接入
2. 预发布数据库直连
3. 大范围跨项目 rollout

---

## 2. 本轮唯一输入包

本轮 autonomous delivery run 默认只读取以下真源：

1. `docs/小乔智投-交付总控-2026-05-08.md`
2. `docs/小乔智投-产品规划文档-2026-05-08.md`
3. `docs/小乔智投-需求文档-2026-05-08.md`
4. `docs/小乔智投-功能开发说明文档-2026-05-08.md`
5. `docs/小乔智投-设计文档-2026-05-08.md`
6. `docs/小乔智投-前置文档评审委员会清单-2026-05-08.md`
7. `docs/小乔智投-开发任务拆解与技术评审-2026-05-08.md`
8. `docs/小乔智投-数据表真源-2026-05-07.md`
9. `docs/小乔智投-接口真源-2026-05-07.md`
10. 当前仓内相关前后端代码

默认不作为本轮主输入：

1. `docs/废弃或不用/*`
2. 旧的“简单版前端页面 / UIUX版前端页面”口径
3. 单次补丁说明文档
4. 乱码文档或与上述真源冲突的旧稿

---

## 3. 本轮测试目标

本轮主目标不是“一次做完整个产品”，而是验证下面 5 个运行时能力是否能在 `ad` 上闭环：

1. `Goal Manager runtime`
2. `Context 注入器`
3. `Review Gate 评分规则`
4. `auto rework`
5. `60 分钟连续执行 + 中断恢复`

用户需求回查：

- 原始目标：给一个复杂需求后，系统应能自动拆目标、自动拆任务、持续执行、自动评审、自动返工，并最终沉淀可追踪交付物
- 当前测试口径：先在 `ad` 上验证开发实现阶段的闭环，不直接夸大到“所有项目均已成立”
- 当前判断：`partial`

---

## 4. Goal Manager runtime 输出口径

### 4.1 输入问题

本轮默认复杂需求问题为：

`把小乔智投当前真源推进到可持续开发实现状态，先跑通工作台主链、四类结果 contract、Review 打分与自动返工闭环。`

### 4.2 目标树

`G0`：把 `ad` 收口成可持续推进的交付级实现样本

子目标：

1. `G1`：工作台主链可稳定运行
2. `G2`：四类结果 contract 可结构化返回
3. `G3`：评审与返工闭环可运行
4. `G4`：运行状态可在 Web 面板追踪
5. `G5`：连续执行 60 分钟并可恢复

页面解释约束：

1. `G4` 的含义是“运行状态可被查看和恢复”，不是“运行治理必须成为业务首页主内容”

非目标：

1. 本轮不接真实生产数据源
2. 本轮不追求完整上线包
3. 本轮不同时推进所有业务分支页面

### 4.3 Goal 状态集合

每个 goal 必须具备：

- `owner`
- `state`
- `evidencePaths`
- `updatedAt`

状态集合固定为：

- `pending`
- `running`
- `blocked`
- `needs_rework`
- `completed`

---

## 5. Task DAG 基线

### 5.1 本轮执行 DAG

`T-01` 工作台头部与运行状态区接入真实 workspace  
`T-02` 主对话区与消息发送链路接入真实 conversations/messages  
`T-03` 历史任务区与任务回看接入真实 tasks/task detail  
`T-11` 使用帮助结果 contract 收口  
`T-21` 需求沟通结果 contract 收口  
`T-31` 问题排查结果 contract 收口  
`T-41` 广告联调结果 contract 收口  
`T-51` Review 打分与自动返工回路接入  
`T-61` 60 分钟连续执行压测与中断恢复验证  

页面解释约束：

1. `T-01` 只要求主工作台能读取必要运行状态，不要求把运行验证面板扩成首页主区

### 5.2 DAG 依赖

1. `T-01 -> T-02`
2. `T-02 -> T-03`
3. `T-03 -> T-11`
4. `T-03 -> T-21`
5. `T-03 -> T-31`
6. `T-03 -> T-41`
7. `T-11/T-21/T-31/T-41 -> T-51`
8. `T-51 -> T-61`

### 5.3 每个任务必须具备

1. `taskId`
2. `title`
3. `owner`
4. `state`
5. `artifactLinks`
6. `goalRefs`
7. `reviewScore`
8. `reworkCount`

---

## 6. Context 注入器口径

每次 stage/task 执行前，必须生成 `ContextInjectionBundle`，至少包含：

1. 当前主目标与子目标摘要
2. 上游依赖任务摘要
3. 最近 checkpoint 摘要
4. 最近 review/rework 摘要
5. 当前任务关联 artifact 摘要
6. 当前任务的 `fact / judgment / candidate / unknown`

注入规则：

1. 不直接把整份长文档原样塞给执行器
2. 默认优先注入真源摘要和直接关联 artifact
3. 必须显式标注未知项，不能用推测冒充事实
4. 上下文长度超限时，优先保留当前目标、最近 checkpoint、最近 review 和直接依赖任务

---

## 7. Review Gate 评分规则

### 7.1 总分

总分固定为 `100`

### 7.2 评分项

1. 结构完整度：`20`
2. 内容深度：`20`
3. 与真源一致性：`20`
4. 实现可执行性：`15`
5. 风险与异常覆盖：`15`
6. artifact 可追踪性：`10`

### 7.3 判定规则

1. `>= 90`：pass
2. `80-89`：conditional pass
3. `< 80`：reject，自动进入 rework

### 7.4 打分输出

Review 输出必须至少包含：

1. `score`
2. `decision`
3. `deductions`
4. `blockingIssues`
5. `recommendedReworkStageId`
6. `evidencePaths`

---

## 8. auto rework 机制

当 review `< 80` 时，系统必须自动执行：

1. 把当前 task/state 改为 `needs_rework`
2. 生成 rework record
3. 指定 rework owner
4. 指定回退 stage 或目标 task
5. 记录本次打回原因与扣分项
6. 写入下一轮执行时的 context 注入包

本轮固定约束：

1. 单任务默认最多自动 rework `2` 次
2. 超过 `2` 次仍不达标时，转 `manual_attention`
3. 每次 rework 必须保留历史，不允许覆盖旧记录

---

## 9. 60 分钟连续执行压测

### 9.1 通过标准

1. 单次 run 连续执行 `>= 60 分钟`
2. 每 `10 分钟` 自动生成一次 checkpoint
3. 中途断开后可恢复
4. 恢复后 task owner/state/artifact 不漂移
5. review/rework 历史可继续接续

### 9.2 压测场景

建议固定 3 个场景：

1. `S1`：主链顺跑
2. `S2`：中途人工中断后恢复
3. `S3`：review 低分触发至少一次 auto rework

### 9.3 压测记录

压测记录必须输出：

1. `runStartedAt`
2. `runEndedAt`
3. `totalRuntimeMinutes`
4. `checkpointCount`
5. `resumeCount`
6. `reworkCount`
7. `finalDecision`

---

## 10. Web 面板追踪字段

Web 面板必须至少追踪：

1. `runId`
2. `runState`
3. `startedAt`
4. `lastHeartbeatAt`
5. `nextCheckpointAt`
6. `currentGoalId`
7. `currentTaskId`
8. `currentTaskOwner`
9. `currentTaskState`
10. `artifactCount`
11. `latestReviewScore`
12. `latestReviewDecision`
13. `reworkCount`
14. `resumeCount`
15. `finalArtifacts`

final artifacts 至少包含：

1. PRD
2. 架构
3. API
4. UI / 页面方案
5. 代码任务

---

## 11. 本轮实施顺序

1. 先实现 `Goal Manager runtime` 最小对象与目标树输出
2. 再实现 `ContextInjectionBundle`
3. 再实现 `ReviewScorecard`
4. 再实现 `auto rework` 触发与历史记录
5. 最后跑 `60 分钟连续执行压测`

本轮不建议反过来先做压测壳。没有目标树、上下文注入、评分卡和返工机制，压测数据没有意义。

---

## 12. 当前结论

按本轮目标回查：

- `ad` 是否适合作为首个实战样本：`solved`
- 本轮输入包是否已固定：`solved`
- 目标树 / Task DAG / 评分卡 / 压测口径是否已固定：`solved`
- 运行对象是否已全部实现：`unsolved`

下一步默认动作：

1. 围绕本方案实现 `Goal Manager runtime`
2. 补 `ContextInjectionBundle`
3. 补 `ReviewScorecard + auto rework`
4. 在 `ad` 上跑首轮 60 分钟连续执行压测

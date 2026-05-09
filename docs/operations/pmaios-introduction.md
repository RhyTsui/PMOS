# PMOS 介绍

- version: `v1.0`
- date: `2026-05-09`
- status: `active`
- owner: `product office`

## 一句话介绍

`PMOS` 是一个面向真实产品交付的产品经理 Agent 平台，用来把需求承接、拆解、评审、交付证据和云端知识连续性放进同一条受控工作流。

## PMOS 适合谁

`v1.0` 当前默认服务这些角色：

1. 产品经理
2. 设计 / UI / UX
3. 前端工程师
4. 后端工程师
5. 测试工程师
6. 运营或交付协作方

它不是只给“产品自己”用，而是给整个产品交付链用。

## PMOS 不是什麽

它不是：

1. 一个通用聊天壳
2. 一个只会生成几份文档的提示词集合
3. 一个只在当前机器、当前会话里才有效的临时工作台

## PMOS 解决的核心问题

很多团队的问题不是“没有 AI”，而是：

1. 需求散落在聊天、补充说明、临时文档里，没有统一真源
2. 需求到功能、API、任务的拆解太粗，无法直接支撑开发和验收
3. 评审容易形式化，缺少真正的多角色专业判断
4. 前端产物容易退化成说明页、示意页，而不是可验证的真实页面
5. 切设备、切会话、切工具后，上下文需要反复复制粘贴

`PMOS` 的目标就是把这些问题收口到一个系统里解决。

## 核心能力

### 1. 统一承接

把复杂需求接进来，而不是继续散落在聊天记录里。

### 2. 深度拆解

把需求拆到：

- `function`
- `API`
- `task`
- `artifact`

### 3. 多角色评审

让 `specialist review + Hermes governance + proof-of-work` 成为默认交付机制，而不是可选动作。

### 4. 浏览器级验证

前端不只看代码和截图，而要进入浏览器验证和证据回写。

### 5. 跨设备知识连续性

用 `GitHub + Notion + cloud-mirror` 组合承接：

- 系统真源
- 人类协作视图
- 最新状态镜像

## 当前已落地的产品基线

截至当前 `v1.0` 首版产品仓，这些已经成立：

1. `v0.7` 受控 runtime baseline
2. 主产品链路：
   `调研 -> 规划 -> 需求 -> 功能 -> 设计 -> 前端页面 -> 数据表 -> 后端接口 -> 联调与验收`
3. 评审链路：
   `self-check -> review committee -> Hermes -> human final approval`
4. `frontend browser verification` 已进入默认产物链
5. `specialist activation` 已进入 task-level gate
6. 独立产品仓已具备最小安装、构建、启动闭环

## 为什么当前版本是 v1.0

`v0.7` 回答的是：受控 runtime baseline 是否成立。  
`v1.0` 回答的是：`PMOS` 能不能作为一个独立产品被安装、理解、启动、使用和继续部署。

这意味着 `v1.0` 的目标不再只是“平台内核存在”，而是：

1. 可以脱离母仓单独存在
2. 可以在其他设备上部署
3. 可以被多角色共同使用
4. 可以把评审、治理、证据和知识同步到云端

## 当前仓库边界

当前这个仓库：

1. 是独立 `PMOS product repo`
2. 不包含业务子项目主体
3. 不包含私有原始材料和真实本地运行态
4. 提供 sample、配置、部署文档和产品真源，用于多设备部署和继续产品化

## 当前仍在补齐什么

1. 更完整的测试覆盖
2. 更严格的第二设备部署验证
3. 更完整的对外操作文档
4. 更稳定的 `latest-state` 云端镜像接线

## 从哪里开始

建议阅读顺序：

1. `docs/operations/platform-truth-source-index.md`
2. `docs/operations/current-version-progress.md`
3. `docs/operations/pmaios-v1.0-direction.md`
4. `docs/deployment/first-run.md`
5. `docs/deployment/api-overview.md`
6. `docs/deployment/operator-guide.md`

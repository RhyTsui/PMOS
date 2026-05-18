# PMAIOS v1.0 方向文档

- version: v0.2
- date: 2026-05-09
- status: active
- owner: product office

## 1. 这一版在回答什么

`v0.7` 已经回答了“runtime baseline 是否成立”。

`v1.0` 不再继续证明平台骨架是否存在，而是回答：

1. PMAIOS 能不能成为一个真正可用的产品经理 Agent 产品
2. 它能不能被部署、配置、发布，并被多人真实使用
3. 它能不能同时服务测试、UI/UX、算法、前后端、运营、产品等角色
4. 它能不能输出可交付页面、可执行任务、可联调接口、可验收结果
5. 它能不能形成独立产品仓，并通过 GitHub + Notion 云端知识层减少上下文复制

一句话定义：

`v1.0 = 打造一个能干活、能部署、能协作、能交付的产品经理 Agent 产品。`

## 2. 正式定位

`一个可部署的产品经理 Agent 工作平台，能为测试、UI、算法、前后端、运营、产品等角色提供统一的产品承接、需求拆解、方案评审、交付协同与验收支撑。`

它不是：

1. 泛聊天助手
2. 只会写文档的生成器
3. 只对产品自己可用的个人工具

它应该是：

1. 产品经理 Agent
2. 产品协作操作台
3. 多角色共同使用的产品工作入口

## 3. 目标用户

`v1.0` 默认服务以下角色：

1. 产品经理
2. 测试同学
3. UI/UX 同学
4. 算法同学
5. 前端同学
6. 后端同学
7. 运营同学

## 4. 核心价值

`v1.0` 必须同时提供这 6 个价值：

1. 统一承接问题和需求
2. 把需求稳定拆到功能、接口、task 层
3. 组织调研、规划、需求、功能、设计、前端、数据、接口、联调验收全链路产物
4. 用多角色 agent 执行专业评审
5. 用 Hermes 做治理、回写、追踪和闭环
6. 为不同角色输出可直接开工或协作的结果包

## 5. 正式目标

`v1.0` 当前固定按 `10` 条主 track 推进：

1. 产品经理 Agent 身份与统一入口
2. 多角色工作承接与差异化输出
3. 需求 -> 功能 -> 接口 -> task 深拆链
4. 专业评审委员会与 Hermes 治理闭环
5. 交付级前端页面生产能力
6. 文档生命周期治理
7. Dataki 默认知识层与系统现状 grounding
8. 部署、操作、验收、发布与 GitHub 共享
9. 云端知识同步层
10. PMOS 与 codex 规格边界

## 6. 正式 workflow 主链

`v1.0` 默认产品主链统一为：

`调研 -> 规划 -> 需求 -> 功能 -> 设计 -> 前端页面 -> 数据表 -> 后端接口 -> 联调与验收`

附带硬规则：

1. `需求文档` 必须输出 `requirement-to-function breakdown matrix`
2. `功能文档` 必须输出 `function-to-api mapping`
3. `前端页面` 必须是面向用户的交付级动态页面
4. `联调与验收` 必须形成正式 acceptance package

## 7. 正式评审链

默认评审链为：

`self-check -> multi-role review committee -> Hermes governance -> human final approval`

默认专业角色包括：

1. `Solution-Optimality Review`
2. `Development Review`
3. `Design Review`
4. `Research Review`
5. `Delivery Review`
6. `Hermes Governance`

## 8. 前端方向定义

`v1.0` 的前端不是示意层，不是文档页，也不是聊天壳首页。

必须满足：

1. 页面面向真实用户使用
2. 布局、模块、流程、交互都能被评审
3. 默认采用既定组件系统
4. 禁止 `hero + summary-card + explanation-first`
5. 页面必须通过浏览器级验证，而不是只靠截图和代码阅读

## 9. Hermes 在 v1.0 的职责

`Hermes` 在 `v1.0` 中是产品治理骨架，不只是 runtime 检查器。

必须承担：

1. `Research`
2. `Committee grounding`
3. `Watch`
4. `Promote`
5. `Writeback`
6. `Closure`

并对外回答：

1. 当前方案是 `keep / revise / block / promote`
2. 哪些问题已经闭环
3. 哪些问题仍未闭环
4. 哪些问题应升级为平台默认规则

## 10. 本版不做什么

这些不属于 `v1.0` 主线：

1. 生态级 OS 叙事
2. 经济层玩法
3. 多租户平台化大扩张
4. 为了“看起来大”而重开 `2.0 / 3.0` 分支

## 11. 当前判断

对 `v1.0` 当前状态的判断：

1. 方向本身：`solved`
2. 产品化程度：`partial`
3. 可部署可发布路径：`partial`
4. 多角色真实使用闭环：`partial`
5. 独立产品仓与云端连续性：`partial`

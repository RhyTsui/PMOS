# PMAIOS 版本规划

- version: v0.2
- date: 2026-05-09
- status: active

## Purpose

这是当前规范化后的 `PMAIOS` 版本时间线与版本纪律真源。

它回答：

1. 当前平台实际站在哪个版本阶段
2. 历史版本应该如何归档理解
3. 当前主线是 runtime 基座延续，还是产品版本推进

## Version Timeline

| Version | Cycle | Theme | State |
| --- | --- | --- | --- |
| `v0.1` | 2026-04-06 -> 2026-04-12 | 原型 workflow/runtime 种子 | Archived |
| `v0.2` | 2026-04-13 -> 2026-04-18 | 本地 runtime baseline | Accepted |
| `v0.3` | 2026-04-18 | AI Product Office 规划与基础收敛 | Accepted |
| `v0.4` | 2026-04-18 -> 2026-04-27 | governed product loop foundation | Accepted |
| `v0.5` | 2026-04-21 -> 2026-04-28 | 治理基线、阅读面、设计交付链、方法体系收口 | Accepted closeout |
| `v0.6` | 2026-04-28 -> 2026-04-30 | 最小内核运行时、Task SSOT、Gate Runtime、Hermes Global 收口 | Accepted minimum runtime |
| `v0.7` | 2026-04-30 -> 2026-05-09 | Autonomous Continuation + Governed Productization Runtime | Accepted runtime baseline |
| `v1.0` | 2026-05-09 -> active | 可部署、可协作、可交付的产品经理 Agent 产品版本 | Active |

## Current Version Judgment

当前统一判断：

1. 当前产品版本主线：`v1.0`
2. 当前 runtime 基座：`v0.7 landed runtime baseline`
3. `v0.8 / v0.9` 不再作为独立产品叙事推进，相关产品化与稳定交付内容并入 `v1.0`

## Version Roles

### `v0.6`

解决的是：

`PMAIOS 能不能形成最小结构化运行时，而不再只是分散能力。`

### `v0.7`

解决的是：

`PMAIOS 能不能把最小运行时推进成可持续执行、可治理、可证据化、可交付的 runtime 基座。`

`v0.7` 现在应被视为：

- 已落地的 runtime 基座
- `v1.0` 的技术与治理前提
- 不再是当前对外产品版本叙事本身

### `v1.0`

当前要解决的是：

`PMAIOS 能不能成为一个可部署、可协作、可交付、多人可真实使用的产品经理 Agent 产品。`

## v1.0 Active Focus

`v1.0` 的当前 active tracks 为：

1. 产品经理 Agent 身份与多角色服务入口定稿
2. 需求 -> 功能 -> 接口 -> task 深拆能力定稿
3. 多角色专业评审与 Hermes 治理闭环定稿
4. 交付级前端页面生产能力定稿
5. 文档生命周期治理定稿
6. Dataki 默认知识层与系统现状 grounding 定稿
7. 工程剥离、部署、配置、操作文档定稿
8. 产品级验收标准、发布标准、GitHub 共享标准定稿

## Version Discipline

从现在起，平台层新增工作必须先回答三件事：

1. 它是在深化 `v1.0 active track`，还是又在重新开版本叙事
2. 它落在哪份 `v1.0` 真源文档里
3. 它是否会造成 runtime 基座、产品版本、子项目样板三者漂移

禁止再出现：

1. runtime 还在 `v0.7`，对外却继续讲 `v3.0`
2. 产品主线已经切到 `v1.0`，真源还停留在 `v0.8 / v0.9`
3. 子项目文档与平台版本边界互相覆盖

## Historical Reference Notes

以下文档仍可参考，但默认按历史理解：

1. `docs/operations/pmaios-v0.7-direction.md`
2. `docs/operations/v0.7-minimum-loop-summary.md`
3. `docs/operations/v0.8-productization-program.md`

其中：

- `v0.7` 文档保留为 runtime 基座来源
- `v0.8` 文档保留为已被 `v1.0` 合并吸收的中间规划

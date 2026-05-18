# PMAIOS v0.7 方向文档

- version: v0.2
- date: 2026-05-08
- status: active
- owner: product office

## 1. 这一版在回答什么

`v0.6` 已经把最小运行内核做出来了。

`v0.7` 不再回答“有没有内核”，而是回答：

1. 内核能不能持续跑
2. 内核能不能被人和 agent 共同治理
3. `Hermes` 能不能从检查器升级成完整治理器
4. 产品主链能不能真的承接到前后端开发与验收
5. 页面和文档能不能不再漂回默认 AI 壳

一句话：

`v0.7 = 把 v0.6 的最小运行内核升级成可持续执行、可知识 grounding、可治理回写、可交付验收的产品化平台版本`

## 2. 当前正式目标

本版正式目标有 6 条：

1. `SchedulerRun` 从“可见调度”升级成“更自治的调度”
2. `Gate Runtime` 从“会显示 gate”升级成“会驱动动作和证据”
3. `Hermes` 从“会出 report”升级成“会 research / review / watch / promote / writeback / closure”
4. `产品主链` 从“最小闭环”升级成“完整交付链”
5. `proof-of-work` 从“内部证据包”升级成“更接近真实 acceptance package”
6. `前端工作台` 从“默认 AI 审美”拉回“可执行企业工作台”

## 3. 正式产品主链

`v0.7` 下，平台默认产品主链必须统一为：

`调研文档 -> 规划文档 -> 需求文档 -> 功能文档 -> 设计文档 -> 前端页面（简单版） -> 前端页面（UI/UX版） -> 数据表 -> 后端接口 -> 前后端联调与验收`

并附带 4 条强规则：

1. `需求文档` 必须拆到 `requirement-to-function breakdown matrix`
2. `功能文档` 必须拆到 `function-to-api mapping`
3. 数据语义和接口语义必须前置暴露、后置定稿
4. 评审必须先由多角色 agent committee 执行，再进入 human final approval

## 4. Hermes 方向定义

`Hermes` 是本版最重要的治理主线，不再只是 compare/promote 辅助器。

### 正式职责

1. `Research`
   基于 repo 真源和 Dataki 系统现状知识做 grounding
2. `Committee`
   把 findings 注入评审，不让 review 停在结构检查
3. `Watch`
   记录 recurring issue、降噪、跟踪跨 run 闭环
4. `Promote`
   把共性问题升格为 requirement、workflow、prompt、template 或 UI 规则
5. `Writeback`
   对受管真源执行受控回写
6. `Closure`
   跟踪 writeback/watch 任务生命周期，回收 closure evidence

### 本版完成标准

当 `Hermes` 能同时做到下面几件事，才算本版完成：

1. 默认带系统现状 knowledge context
2. 默认进入 committee 输出包
3. 默认进入 proof-of-work
4. 有 operator action 可继续推动 writeback / close loop
5. 有 recurrence memory 和 noise suppression
6. 能把共享问题真实写回默认规则和真源

## 5. Review 方向定义

评审不能再是“文档结构齐不齐”的形式化检查。

`v0.7` 的正式评审方向是：

- `Solution-Optimality Review`
  产品角度评估当前方案是不是当前阶段更优解
- `Development Review`
  技术角度评估结合系统现状后的开发 task 是否可执行
- `Design Review`
  设计角度评估页面结构、交互、状态和规范是否足够承接实现
- `Research Review`
  评估 knowledge grounding 是否足够支撑判断
- `Delivery Review`
  评估是否足以进入联调、验收和交付

## 6. Frontend 方向定义

这一版明确要求：

1. 首页是 `control plane`，不是介绍页
2. 工作台首屏优先露出 `scope + state + actions + outputs`
3. 聊天工作区默认采用 `Ant Design X`
4. 企业系统壳、密度、token 和状态规则继续受企业 UI spec 约束
5. 禁止 `hero + summary-card + explanation-first` 反模式

## 7. 本版不做什么

这些方向可以做，但不是 `v0.7` 的优先收口目标：

1. 再开新的平台版本叙事
2. 为了“看起来更先进”而做大规模重新抽象
3. 把主线注意力转移到非核心子项目试验
4. 在没有系统现状 grounding 的情况下继续靠经验猜方案

## 8. 当前完成判断基线

下面这些必须同时满足，`v0.7` 才能被认为真正收口：

1. 主链、阶段产物、评审规则和 proof-of-work 口径一致
2. `Hermes` 完整闭环进入 runtime、review 和 operator action
3. 页面风格治理写成真源并有自动审计
4. PMOS 主文档、operating model、全景图回正到同一口径
5. 对原始用户诉求回查不再只是“有计划”，而是能判断 `solved / partial / unsolved`

## 9. 当前判断

当前对 `v0.7` 的方向性判断：

- 方向本身：`solved`
- 主线能力已落地：`partial`
- `Hermes` 完整能力闭环：`partial`
- 前端默认风格治理：`partial`
- PMOS 真源回正：`solved`

这意味着本版已经不是“缺方向”，而是进入“把最后几个高价值闭环做完整”的阶段。

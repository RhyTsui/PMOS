# PMAIOS 首页设计真源

- version: v0.2
- date: 2026-04-24
- status: active
- scope: `src/frontend` 平台首页与总控入口

## 1. 设计目标

这份文档定义 `PMAIOS` 首页的设计基线。
它解决的不是“页面怎么更好看”，而是下面 4 件事：

1. 首页首先要表达 `PMAIOS` 是平台本体，不是知识库换皮。
2. 首页要像真实运行中的系统，不是概念海报，也不是聊天客户端。
3. 首页要能承载多 Agent、多模态、双 wiki、技能矩阵、模块入口。
4. 首页改造要能落到可执行工作流，而不是停留在视觉口号。

## 2. 产品身份

### 正确定义

`PMAIOS = 平台级 AI Operating System / Product OS / Runtime Control Plane`

### 错误定义

- 不是 `knowledge-base`
- 不是 `WeKnora`
- 不是 `Dataki` 换皮
- 不是 `Chat Workspace`
- 不是 `Claude 风格聊天页`

### 身份规则

首页标题、首屏文案、主结构、模块命名，都必须先服务于 `PMAIOS` 平台身份。

`knowledge-base / WeKnora / Dataki / ad / chokonu / tracking-acceptance`
只能作为：

- 子项目
- 业务模块
- 平台入口
- 被治理对象

不能再反客为主占据首页主身份。

## 3. 视觉方向

### 总体方向

视觉应接近“正在运行中的 PMAIOS 平台总控面”，不是聊天工具 UI。

关键词：

- 平台总控
- 运行态
- 编排感
- 结构化高密度
- 多层系统可视化
- 模块关系清晰

### 明确不要的风格

- Claude 式三栏聊天产品感
- 过强的 terminal / trace log 主导感
- 平均铺满的一堆 dashboard 卡片
- 知识库首页气质
- 笔记软件 / 文档工作台气质

### 建议视觉语义

- 背景应体现平台分层和运行态，不是纯文档白底
- 首屏要显式区分 `control plane / runtime / modules`
- 卡片需要主次和层级，不要均匀平铺
- 模块之间要体现编排关系，而不是彼此孤立

## 4. 信息架构

首页至少包含以下一级区块：

1. 平台身份区
2. 运行态总控区
3. 多 Agent 协作区
4. 多模态输入区
5. Human Wiki / AI Archive 双层区
6. 技能矩阵区
7. 子项目 / 模块入口区

### 4.1 平台身份区

必须回答：

- 这是谁：`PMAIOS`
- 这是什么：平台控制面 / AI Product OS
- 当前控制范围是什么：platform 或选中的 subproject scope

### 4.2 运行态总控区

必须回答：

- 当前 scope
- 当前运行状态
- workflow / run / message / output 的实时信号
- 当前阻塞与推进状态

### 4.3 多 Agent 协作区

至少要体现三层：

- chief / review
- planner / product agents
- execution / trace / workflow

不能只显示一个 agents 数量。

### 4.4 多模态输入区

至少覆盖：

- conversation
- image / screenshot
- retrieval / knowledge
- external connectors
- artifact / output

### 4.5 双层 wiki 区

必须区分：

- Human Wiki：给人阅读、汇报、协同的工作层
- AI Archive：给模型检索、追溯、恢复上下文的归档层

不能混成一个“文档区”。

### 4.6 技能矩阵区

必须体现：

- product skills
- runtime skills
- module / business capability coverage
- 每个 agent 的技能职责分布

### 4.7 模块入口区

必须把 `knowledge-base` 明确降级为一个模块入口。

首页表达要清楚：

- `PMAIOS` 是平台
- `knowledge-base` 是被平台管理的一个业务模块

## 5. 文案规则

### 文案气质

- 中文为主
- 平台语义优先
- 少用 `chat`、`assistant`、`workspace` 作为首页主语
- 多用“总控”“运行态”“编排”“模块”“控制面”“归档”“治理”

### 禁止倾向

以下表述不要再作为首页中心：

- Chat Workspace
- Platform Chat Console
- knowledge base home
- assistant-first

## 6. 结构规则

### 强规则

1. 先平台，再模块
2. 先总控，再细节
3. 先层级，再列表
4. 先关系，再数量

### 禁止结构

- 打开就是聊天区占满主视角
- 左边 scope、右边聊天、中间消息流的标准 chat client 布局
- 所有区块同权平铺，没有主控面

## 7. OpenAI 设计能力接入策略

这一节定义“OpenAI 最近出的设计能力，哪些该接入 PMAIOS，怎么接”。
目标不是追新，而是把能力变成稳定工作流。

### 7.1 第一优先级：`gpt-image-1.5`

用途：

- 生成首页概念图
- 生成模块插画与全景图
- 生成带透明背景的视觉资产
- 基于参考图做视觉改稿

适用原因：

- 当前官方口径下，它是最新、最强的图像生成模型
- 同时支持生成与编辑，适合 PMAIOS 首页反复压稿
- 比旧 `dall-e-2/3` 更适合当前设计链路

在 PMAIOS 中的定位：

- `image2` 主模型
- 首页视觉稿和全景图主生产能力
- 设计探索阶段的默认图像生成引擎

### 7.2 第二优先级：Responses API 多轮图像编辑

用途：

- 在同一上下文里连续改 2 到 3 轮首页方案
- 对同一张截图持续做结构、样式、布局微调
- 保留改稿上下文，不每轮从零开始

适用原因：

- 适合 conversational image editing
- 适合把“图片 + 文本指令 + 上一轮结论”串起来

在 PMAIOS 中的定位：

- `design review -> image edit -> compare -> next revision` 的核心工作流

### 7.3 第三优先级：`gpt-5.4` 视觉理解与工具编排

用途：

- 截图审查
- 设计稿转页面结构
- 设计问题清单输出
- 组件树 / design token / JSON 结构抽取
- 页面改造优先级判断

适用原因：

- 适合把“看图理解”变成“结构化执行建议”
- 适合把设计任务进一步分解给 Codex 或前端 worker

在 PMAIOS 中的定位：

- 设计评审代理
- 页面结构规划代理
- 设计到工程的中间层

### 7.4 第四优先级：Codex 前端设计落地

用途：

- 把设计参考图、草图、截图直接落到 `src/frontend`
- 把视觉建议改成真实前端结构、样式和响应式布局
- 做页面级细化，不只停在图稿

适用原因：

- OpenAI 官方已将“responsive front-end design”和“Figma to code”作为 Codex 用例
- 这和 PMAIOS 当前首页改造完全同路

在 PMAIOS 中的定位：

- 设计落地执行层
- 从图到页面的最后一跳

### 7.5 后移能力：`gpt-realtime-1.5`

用途：

- 语音设计评审
- 边看截图边口述改稿
- 语音化多模态协作入口

判断：

- 对“多模态交互”有长期价值
- 但不是当前首页改造的第一优先级

在 PMAIOS 中的定位：

- 后续多模态控制台能力

### 7.6 暂不优先：`Sora 2`

用途：

- 产品宣传片
- 动态概念演示
- 汇报级短视频

判断：

- 适合对外表达，不适合当前首页主设计链
- 当前不进入首页改造主线

## 8. 页面改造执行链

首页改造默认遵循下面这条链：

1. `gpt-5.4` 读取需求、截图、草图，产出结构化页面改造建议
2. `gpt-image-1.5` 生成或改出首页视觉方向稿
3. Responses API 保持多轮改稿上下文，连续压 2 到 3 轮
4. Codex 把确定后的方案落到 `src/frontend/App.tsx` 与 `src/frontend/styles.css`
5. 最终以前端真实页面验证，而不是只看图稿

## 9. 当前实现改造要求

针对 `src/frontend/App.tsx`：

1. 继续沿用现有真实数据源
2. 首页结构要向平台总控重新排版
3. 聊天区只能作为 runtime workspace 的一部分，不能再充当首页本体
4. `knowledge-base` 不得再被误表达为 `PMAIOS` 本身

## 10. 验收标准

页面改完后，至少满足：

1. 用户一眼能看出这是 `PMAIOS` 平台，不是知识库
2. 用户一眼能看出这是运行中的系统，不是概念页
3. 用户一眼能看出有多 Agent、多模态、双层 wiki、技能矩阵
4. 用户不会再说“这是 Claude 风格”
5. 用户不会再说“打开的还是知识库”
6. 首页改造链已经明确区分：出图、评审、落地、验证

## 11. 后续使用规则

从现在开始，`docs/design/design.md` 作为 `PMAIOS 首页设计真源`。

后续首页改动优先遵循这份文档，而不是：

- 临时聊天口径
- 子项目视觉壳
- 模型默认生成风格

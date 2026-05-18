# Coze Studio 作为 PMOS 开发实现阶段子能力的集成判断

- version: v0.2
- date: 2026-05-12
- status: parked
- scope: `需求/设计完成后 -> 开发实现阶段 -> Coze Studio 能力调用`

## Parking Decision

- decision: `parked`
- reason:
  - 用户确认 `Coze Studio` 当前不适合作为 `PMOS` 的开发工具
  - 当前判断是不再继续把它融入 `PMOS`
  - 本文仅保留为一次已完成分析的参考记录，不再代表 PMOS 活跃默认机制

## Current Rule

当前规则已经切换为：

- `Coze Studio` 不进入 PMOS 默认主链
- 不作为 PMOS 默认开发实现能力入口
- 不继续推进 PMOS -> Coze Studio packet / result 回流集成
- 若后续重启评估，应作为新的独立能力评审事项重新进入，而不是沿用这轮默认结论

## 1. 目标重述

当前目标不是把 `Coze Studio` 注册成 PMOS 子项目，也不是让它替代 PMOS 主控制面。

当前正确目标是：

`把 Coze Studio 作为 PMOS 在开发实现阶段调用的子能力，用于承接 Agent / Workflow / Prompt / Resource / AI 应用实现。`

## 2. 事实基线

基于官方 README 与仓内说明，`Coze Studio` 当前明确具备这些内置能力：

1. `模型服务管理`
   - 可管理模型列表并接入外部模型服务。
2. `智能体开发`
   - 创建、编排、发布、管理 agent。
   - 可挂接工作流、知识库等资源。
3. `应用开发`
   - 创建、发布应用。
   - 通过 workflow 承接业务逻辑。
4. `工作流开发`
   - 创建、修改、发布、删除 workflow。
   - 提供可视化画布。
5. `资源开发`
   - 插件
   - 知识库
   - 数据库
   - 提示词
6. `API / SDK`
   - 对话与工作流相关 API
   - Chat SDK 集成到业务系统
7. `记忆与知识增强`
   - 官方说明明确支持 knowledge / memory，用于降低幻觉和增强上下文回答。

补充判断：

- README 的安全提示明确提到 `workflow code nodes Python execution environment`。
- 这说明它不仅是静态配置台，还能承接一定的可执行逻辑节点。
- 但它本质仍是 `AI agent / workflow / app 开发平台`，不是通用全栈代码 IDE。

## 3. 对 PMOS 最有价值的切入点

如果把 PMOS 的主链拆开：

`调研 -> 规划 -> 需求 -> 功能 -> 设计 -> implementation-handoff -> 开发实现 -> 自动验收 -> 发布`

那么 `Coze Studio` 最适合承接的是：

`implementation-handoff 之后的开发实现阶段`

具体来说，最值的不是“让它替 PMOS 写所有代码”，而是让它承担以下几类实现工作：

### A. Agent 实现面

适合做：

- 把 PMOS 输出的角色定义、能力边界、工具权限转成 agent
- 给不同角色生成可运行的 agent 版本
- 把 `prompt + knowledge + plugin + workflow` 组合成一个可调试 agent

对应 PMOS 价值：

- PMOS 负责定义“要什么 agent”
- Coze Studio 负责把这个 agent 快速搭出来并调试

### B. Workflow 实现面

适合做：

- 把 PMOS 的 requirement / functional spec 里的流程逻辑转成 workflow
- 做可视化节点编排
- 做 tool / plugin / model / retrieval 组合

对应 PMOS 价值：

- PMOS 负责定义“流程应该怎么工作”
- Coze Studio 负责把它变成可运行流程

### C. Prompt / Plugin / Knowledge / Database 资源实现面

适合做：

- 管理实现期 prompt
- 配置插件和工具调用
- 配置知识库
- 配置数据库资源

对应 PMOS 价值：

- PMOS 管 prompt 治理、版本与验收口径
- Coze Studio 管 prompt/resource 的运行态装配

### D. AI 应用原型与嵌入面

适合做：

- 先做可运行 AI 应用原型
- 用 Chat SDK 把 agent / app 嵌入业务页面
- 承接对话式工作台、Agent 助手、Copilot 区块

对应 PMOS 价值：

- PMOS 定义业务入口、场景、验收标准
- Coze Studio 快速提供 AI 应用实现壳和运行能力

## 4. 它不能替代 PMOS 的部分

这条边界必须钉死。

`Coze Studio` 不应替代：

1. `PMOS requirement truth`
   - 需求真源仍在 PMOS 文档链
2. `PMOS Task SSOT`
   - 任务状态、主链责任、分解关系仍在 PMOS
3. `PMOS review / acceptance gate`
   - 最终验收、回写、审计、proof-of-work 仍在 PMOS
4. `PMOS frontend delivery governance`
   - 交付级页面标准、自动验收、browser verification 仍在 PMOS
5. `PMOS release / outbox / scheduler`
   - 发布、调度、同步仍由 PMOS 主系统治理

一句话：

`Coze Studio 是实现引擎，不是真源系统，也不是最终治理系统。`

## 5. 对“开发 agent / 开发 web”这两个问题的判断

### 5.1 开发 agent

这是它的强项，适合深接。

原因：

- 官方产品定义本身就是 `all-in-one AI agent development tool`
- 内置 agent / workflow / knowledge / plugin / prompt / memory / model service
- 对 PMOS 来说，几乎天然适合承接“设计完成后的 agent 落地”

判断：

- `开发 agent`：`strong fit`

### 5.2 开发 web

要分两类。

第一类，`AI web application / chat app / copilot surface`

- 适合
- 可以通过 app、workflow、Chat SDK 很快落地

第二类，`通用企业管理后台 / 任意复杂 React 业务系统`

- 不适合作为唯一主开发工具
- 它不是通用前后端代码工作台的完全替代
- 更像 AI 应用实现平台，而不是通用业务系统代码生成器

判断：

- `AI web / 对话式应用 / Agent 工作台`：`strong fit`
- `传统全量后台前端开发`：`partial fit`

## 6. 接入 PMOS 后最合理的默认触发方式

不应该让用户手动判断什么时候开 Coze Studio。

建议默认规则：

### Rule 1

当 `implementation-handoff` 产物类型是这些之一时，允许推荐或触发 `Coze Studio`：

- `agent implementation`
- `workflow implementation`
- `prompt/resource implementation`
- `copilot/chat app implementation`

### Rule 2

当实现目标是这些类型时，优先考虑 `Coze Studio`：

- 智能体
- 工作流
- AI 应用
- 对话式页面能力
- 依赖知识库 / 插件 / 工具组合的实现

### Rule 3

当实现目标是这些类型时，不应把 `Coze Studio` 当唯一主路径：

- 普通企业后台页面
- 复杂数据后台
- 纯前端视觉重构
- 通用 CRUD 系统
- 非 AI 为核心的传统全栈开发

## 7. PMOS 中应形成的固定机制

建议形成固定机制：

1. `implementation-handoff` 新增字段
   - `implementationLane`
   - 可选值：
     - `repo-coding`
     - `coze-studio-agent`
     - `coze-studio-workflow`
     - `coze-studio-app`
     - `hybrid`

2. `PMOS capability registry`
   - 把 `Coze Studio` 注册为实现阶段能力，而不是子项目

3. `统一入口动作`
   - 在控制面提供：
     - 打开 Coze Studio
     - 生成 Coze Studio implementation packet
     - 回收 Coze Studio result packet

4. `验收回流`
   - Coze Studio 输出不算完成
   - 必须回到 PMOS 跑：
     - acceptance
     - review
     - proof-of-work
     - writeback

## 8. 当前产品判断

- 用户需求：
  - `把 Coze 编程融入 PMOS，作为需求设计完成后的开发实现能力`
  - 当前状态：`partial`
  - 原因：定位已经明确，但能力入口、默认触发规则、回流契约还没落 runtime

- 产品需求：
  - `把 Coze Studio 作为 PMOS 开发实现阶段子能力，而非子项目`
  - 当前状态：`solved`
  - 原因：边界和默认定位已经明确，可据此继续集成

## 9. 下一安全步

下一步不该先泛化讨论，而该直接落三件事：

1. 部署 `Coze Studio` 到独立本地端口，避免与现有服务冲突
2. 在 PMOS 控制面把它注册为 `开发实现阶段能力入口`
3. 给 `implementation-handoff` 增加 `implementationLane`，让 PMOS 能默认判断是否该调用它

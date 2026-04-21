0.4
想法
我在打造新一代产品工作流，主要是本地验证核心需求，不涉及权限网络，底层设施等问题，接入真实业务数据和现有服务，然后跑通验证。比如需求定义-最佳实践-方案最优解-前端最优解-UX最优解-用户demo呈现-后端最优解-Agent开放设计-后端demo呈现-业务数据服务接入-完整demo呈现-自动循环。 希望不是一个个去问，前面需求做调整，后面全部重新来一遍，文档积压很多。我希望是自动执行，人只评审给意见，文档自动从头到尾更新，工程也是。 这是我之前的pmaiosv0.3可能没完整说明这个意思。简单流程：先用gpt进行需求会话沟通（做一个对用户的会话chat，需求基于知识库和记忆和gpt自动沟通，如果是已有固定解决方案的自动流转至需求池往下走，非标的基于需求池进行预研反馈。），再在后台由产品发起gpt做进一步分发和调研。2，再用gemini完善设计需求，再用aistudio完善前端demo，产品检查前端demo是否符合用户需求最优解和最佳呈现。再用gpt做产品规划和全栈设计，最后用claude进行文档管理和开发。

https://aistudio.google.com/apps/964f57a7-53cc-4fcd-af15-0d5b8aa234f0?project=gen-lang-client-0903621189&showPreview=true&showAssistant=true

需求
一、系统目标（重新定义）

构建一个：

AI驱动的产品自动生成与持续重构系统（Product Compiler OS）

核心能力：

从自然语言需求 → 自动生成完整产品链路
自动维护设计 / UI / 后端 / 文档一致性
支持局部更新，不强制全量重跑
人只做评审，不参与流程推进

二、核心系统结构
1、输入层：需求对话系统（GPT）

功能：

用户自然语言需求收集
自动结构化需求
判断：
已知模式 → 进入标准流程
非标需求 → 进入预研池

2、中枢层：需求分流系统（Router）

将需求分为三类：

📦 标准需求池（可直接执行）
🔬 预研池（不确定方案）
📚 复用方案库（历史最佳实践）

3、核心执行层：DAG系统（关键）

系统所有产物由 DAG 驱动：

需求 → 设计 → UI → 后端 → 文档 → Demo

但关键不是流程，而是：

✔ 节点之间有依赖关系
✔ 状态驱动执行
✔ 支持局部重算

三、核心机制（重点）
1、SSOT（单一真相源）

所有系统状态统一管理：

每个节点包含：

{
  "id": "ui_dashboard",
  "version": "v3",
  "state": "clean | dirty | stale",
  "dependencies": ["requirement_v3", "design_v2"],
  "outputs": ["ui_spec_v3"]
}

👉 所有产物都不能“独立存在版本”
2、变更传播机制（核心）

当上游变化：

需求变更
   ↓
依赖图分析
   ↓
标记影响节点（dirty）

⚠️ 注意：

❗不自动执行，只标记影响范围

3、执行机制（三种模式）
🟢 Auto 模式（自动执行）

触发条件：

初始化项目
明确“一键生成”

行为：

全 DAG 自动执行
2、Lazy 模式（默认核心模式）

特点：

只标记 dirty
不执行任何 Agent
等用户触发：

“更新 UI / 重新生成 / 看最新结果”

👉 才执行对应子图
3、Manual 模式（手动控制）

特点：

节点冻结
不自动更新
用户指定才运行
4、选择性重算机制（关键能力）

系统核心不是“重跑”，而是：

🔁 局部子图重算（Subgraph Recompute）

例如：

只改 UI → 只重跑 UI + 相关依赖
不动 backend / docs
5、影响传播机制（Propagation Engine）

系统内部流程：

Change Event
   ↓
Dependency Graph Traverse
   ↓
Impact Analysis
   ↓
Mark dirty nodes
   ↓
等待执行
四、四、系统本质抽象

你的系统本质不是：

❌ 工作流工具
❌ agent编排系统
❌ 自动化pipeline

而是：

🧠 一个“基于DAG的产品编译器（Product Compiler）”
五、五、运行循环（核心闭环）
1. 用户输入需求
2. GPT结构化需求
3. Router分流
4. DAG生成
5. 节点执行（按 auto/lazy/manual）
6. 输出 UI / 后端 / 文档 / Demo
7. 用户评审
8. 修改 → 触发影响传播
9. 局部重算
10. 循环
六、关键设计原则（非常重要）
1、不全量重跑

❗任何变更只影响局部子图
2、不让 Agent 控制执行

Agent 只能建议，不能执行
3、状态驱动，而不是流程驱动

Flow ≠ Execution
State ≠ Pipeline
4、文档 / UI / 后端统一来源

所有产物都来自 DAG state
七、系统一句话定义

一个支持“局部重算 + 状态驱动 + AI自动生成产品全链路”的 DAG 编译型产品操作系统
如果再压缩成一句更狠的版本：

🔁 这是一个”AI产品自动重构编译器”，不是工作流工具。

---

## v0.4 补充需求（2026-04-19）

### 一、多 Agent 自动触发（产品经理多 agent 生效）

**问题现状**：`productChiefService` 已实现但只暴露 REST API，无法在 subproject 场景下自动触发产出。

**需求**：子项目运行时能自动触发多 agent 协作（specialist agents + review committee），自动产出设计/报告。

**实现要求**：
1. 在 `orchestratorRuntime` 的 `core-definition-baseline` 阶段自动调用 `productChiefService.analyze()`
2. 把 `productChiefService` 的输出（reports、outputs、specialist-tasks）写入 artifact 系统
3. 打通 Auto/Lazy/Manual 三种执行模式（Auto=全链路自动，Lazy=只标记dirty等触发，Manual=节点冻结）
4. 产物路径：`memory/product-chief/reports/`, `memory/product-chief/outputs/`

### 二、Finds Skill 部署 + 自动选择

**问题现状**：`skills/registry.json` 16个 skill 都是方法论类，没有 finds/research 类 skill，全部被过滤。

**需求**：部署 Claude 官方 finds 类 skill，自动根据 brief/task 内容匹配执行。

**实现要求**：
1. 新增 finds 类 skill（如 `market-research`, `competitor-analysis`, `technology-scan`, `user-insight`）
2. 每个 finds skill 调用 `WebSearch`/`WebFetch` 工具搜集信息，写入 `memory/research/` 目录
3. 在 `capabilityRegistry` 或 `workflowEngine` 中实现”根据 brief 关键词自动选择相关 skill”的选择器
4. Skill 执行结果写入 artifact 的”调研”章节

### 三、Claude Design 自动集成

**问题现状**：`design-it` 命令已安装（`.claude/commands/`），但作为外部工具，未与 PMAIOS workflow 打通。

**需求**：`design-it` 集成进 workflow 自动触发，UI/前端类需求自动产出设计草案。

**实现要求**：
1. 在 `capabilityRegistry` 中新增 `design` 类型 capability，触发时调用 `design-it` 命令
2. 当 `productChiefService` 判定需要 `ui-schema-spec` 输出时，自动调用设计生成
3. 设计产物写入 `docs/design/` 目录（而非 `memory/`）
4. 通过 MCP 工具或子进程调用 `claude design-it` 并捕获结果

### 四、实现优先级

1. **多 agent 自动触发**（核心，DAG 节点依赖的前提）
2. **Finds skill 部署**（调研是设计的前置依赖）
3. **Claude Design 集成**（设计产出的最后一环）


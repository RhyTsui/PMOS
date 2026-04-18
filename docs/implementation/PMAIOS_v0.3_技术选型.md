PMAIOS v0.3
技术重构版（骨架先行）

从“自研基础设施”转向“核心内核 + 开源积木 + 可拼装平台”的重构方案

适用于：单人高效开发 / v0.3 一次性升级 / v0.4 平台化准备 / 技术选型与开源组件集成

|文档目标|明确 PMAIOS v0.3 本轮真实落地的 OS 内核能力、仅保留接入位的外部能力，以及一次性升级的落地顺序。|
|---|---|
|核心原则|只保留差异化内核；基础设施优先复用；所有模块必须可评测、可版本化、可替换。|
|本轮策略|骨架先行：先补齐契约、调度、观测、trace 与 capability 插槽，不做外部基础设施全量迁移。|
|输出用途|可直接作为系统当前开发计划的技术依据，并为后续 v0.4 能力平台化预留接口。|

# 1. 重构目标与原则

v0.3 的重构，不是增加新功能，而是把系统从"尽量自己做"改成"只自研核心，其余拼装成熟组件"。这样才能把开发效率从按小时计的重度手工实现，转变为按天迭代的可控集成。

• 只保留差异化能力：Orchestrator、知识抽象、Agent 规范、Workflow 规范、Capability API、评测闭环。

• 基础设施优先复用：向量库、队列、认证、UI 框架、工作流执行器、图可视化、模型接入、OCR、对象存储。

• 模块之间保持契约化：所有输入输出都使用 schema，避免隐式耦合。

• 每个模块都要能被评测、被回放、被替换、被版本化。

# 2. 重构后的总体架构

建议把系统调整为"核心内核 + 开源积木 + 平台能力"的三层结构：

|层级|职责|实现策略|
|---|---|---|
|核心内核|系统的差异化能力|自研 Orchestrator、知识模型、Agent 注册、Capability API、评测与治理|
|开源积木|通用工程能力|LangGraph / LangChain、FastAPI、Next.js、React Flow、Postgres、Redis、Celery、Pinecone / Weaviate|
|平台能力|产品化与对外发布|Agent 发布、权限、配额、UI 入口、版本管理、监控、审计|

# 3. 模块级保留 / 替换 / 不自研清单

|模块|策略|建议方案|说明|
|---|---|---|---|
|Orchestrator|保留自研|任务解析 + Agent/Workflow/Tool 调度|这是系统大脑，不能外包给通用框架。|
|Workflow 执行|半自研|LangGraph 执行 + 自定义 Workflow Schema/Registry|你定义流程，框架负责跑流程。|
|Agent 执行|半自研|LangChain / OpenAI tool calling|保留 Agent 规范与权限，不自写循环执行器。|
|Knowledge 检索|外部复用|Pinecone / Weaviate + Postgres 元数据|不自研 embedding search。|
|队列/调度|外部复用|Celery + Redis|不自研 scheduler/queue。|
|API 服务|外部复用|FastAPI|快速稳定，适合 AI 服务。|
|前端 UI|外部复用|Next.js + Tailwind|不要自研 UI 框架。|
|流程可视化|外部复用|React Flow|适合 workflow viewer。|
|认证权限|外部复用|Supabase Auth / Auth0|减少账号体系工作量。|
|OCR/解析|外部复用|开源 OCR + 文档解析库|文件摄取不从零实现。|

# 4. 技术选型与开源组件集成

以下选型以"先能跑、再做强、最后平台化"为原则，优先选择成熟、文档好、生态稳定的组件。

|能力域|推荐组件|集成方式|选择原因|
|---|---|---|---|
|Workflow/Agent|LangGraph + LangChain|Orchestrator 调用图执行/工具调用|适合复杂任务编排与多 Agent 协作|
|API|FastAPI|统一对外服务层|轻量、类型友好、适合 AI 服务|
|前端|Next.js + Tailwind|UI Portal / 多会话 / 控制台|组件生态成熟，便于快速迭代|
|流程图|React Flow|Workflow Viewer / 设计器|节点流可视化成本低|
|向量检索|Pinecone 或 Weaviate|知识检索层|避免自建向量数据库|
|关系与事务|PostgreSQL|元数据 / 版本 / 权限 / 审计|稳定、易维护、适合主数据|
|缓存与队列|Redis + Celery|异步任务 / 计划任务|减少调度自研成本|
|认证|Supabase Auth / Auth0|账号、组织、权限|快速获得成熟权限能力|
|对象存储|S3 / OSS / MinIO|文档、图片、模型产物|统一文件资产管理|
|OCR/解析|Tesseract / Unstructured 等|文件摄取 pipeline|不用从零实现解析器|

# 5. 核心模块重构说明

## 5.1 Orchestrator 中枢

• 保留：任务解析、能力路由、Agent/Workflow 选择、Tool 调用策略。

• 不做：DAG 执行细节、队列、调度器、低层状态机。

• 落地：Orchestrator 只负责决策与组装，将执行交给 LangGraph/Celery 等组件。

## 5.2 Workflow 系统

• 保留：Workflow Schema、Registry、阶段门禁、人工确认、回放与版本化。

• 不做：底层图执行、并发队列、重试调度。

• 落地：工作流定义由你维护，执行由 LangGraph + 状态存储完成。

## 5.3 Agent 系统

• 保留：Agent 定义、角色、输入输出 schema、权限范围、工具绑定。

• 不做：手写复杂 agent loop、模型 fallback 逻辑、通用工具调用框架。

• 落地：Agent 使用 LangChain / function calling 实现执行，内部统一注册与版本控制。

## 5.4 Knowledge 中台

• 保留：知识类型、来源、生命周期、版本、标签、关系、可信度。

• 不做：embedding 计算、向量索引、相似度搜索实现。

• 落地：Postgres 管元数据，Pinecone/Weaviate 管向量，所有知识先统一 schema 再入库。

## 5.5 Tool / Connector 中台

• 保留：Tool registry、输入输出 schema、权限、审计、错误语义。

• 不做：把外部服务直接写死在业务逻辑中。

• 落地：API/DB/ML/CLI 统一封装为 Tool，再由 Agent/Workflow 调用。

## 5.6 Runtime / Memory

• 保留：Session、短期记忆、工作记忆、事件日志、执行上下文。

• 不做：自己写队列和计划调度。

• 落地：Redis/Celery 负责运行，Runtime 只负责状态和上下文。

## 5.7 UI / 交互层

• 保留：多会话、多项目、灵动交互、多模态输入输出、语音入口。

• 不做：自研前端基础框架和图形编辑器底座。

• 落地：Next.js + React Flow + 组件库，交互逻辑由 PMAIOS 定义。

## 5.8 Evaluation / Feedback

• 保留：Prompt/Agent/Workflow 的评测、回归、A/B、benchmark、报告。

• 不做：评测引擎和数据标注全手工管理。

• 落地：复用 runner 与数据集管理思路，形成统一 eval 中台。

# 6. 集成后的端到端架构

建议采用以下调用链，将工程复杂度压到最少，同时保留系统主控权：

```
UI / CLI / API → FastAPI → Orchestrator → LangGraph / LangChain → Tools / DB / ML → Postgres / Redis / Vector DB / Object Storage
```

• Orchestrator 是唯一决策入口。

• Workflow 负责过程控制，Agent 负责智能执行。

• Knowledge 统一承载所有长期资产。

• Tool 将外部服务标准化后再开放给 Agent/Workflow。

• Runtime 只保存执行状态，不承载业务逻辑。

# 7. 推荐开发顺序

• 第一步：保留 v0.3 核心定义，删掉自研基础设施的伪需求。

• 第二步：先打通 Orchestrator + 1 个 Agent + 1 个 Workflow + 1 个 Tool + 1 个 Knowledge 查询。

• 第三步：接入 FastAPI / Next.js / LangGraph / Postgres / Redis / Vector DB 的最小闭环。

• 第四步：把评测、版本管理、日志与回放补齐。

• 第五步：再考虑 Agent 发布平台、能力市场和 v0.4 平台化。

# 8. 风险与约束

|风险|表现|应对|
|---|---|---|
|过度自研|每个基础能力都自己写，开发极慢|直接用开源/托管，只保留核心内核|
|抽象过度|架构很漂亮但不落地|先跑通一个最小闭环，再扩展|
|接口混乱|模块间隐式耦合，难以替换|所有模块使用 schema contract|
|评测缺失|改了 Prompt/Agent 结果变差看不出来|强制评测与回归|
|运维复杂|自建队列/DB/向量库导致运维负担大|选成熟服务，先轻后重|

# 9. 结论

v0.3 技术重构的本质，不是把系统变得更复杂，而是把"该自己做的"和"没必要自己做的"分开。你真正要坚持自研的是 Orchestrator、知识抽象、能力注册、评测闭环与治理；其余一切成熟工程能力，都应该尽量用开源组件和托管服务拼装。

这样，PMAIOS 才能从"一个人堆功能"升级为"一个人也能高效驾驭的平台内核"。

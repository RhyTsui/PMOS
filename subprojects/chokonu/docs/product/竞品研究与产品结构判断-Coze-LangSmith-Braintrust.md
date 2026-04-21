# 竞品研究与产品结构判断：Coze / LangSmith / Braintrust

- 版本：v0.1
- 日期：2026-04-20
- 状态：Draft
- 项目：连弩-AI测试平台 / ChoKoNu

## 1. 研究目标

这份文档回答四个问题：

1. `Coze / 扣子` 到底是哪类产品，哪些部分值得直接参考
2. `LangSmith` 和 `Braintrust` 代表的又是哪类 AI 质量平台
3. 连弩如果继续做，会和它们在哪些层面直接竞争
4. 连弩当前版本的产品结构，到底该长成什么样

这不是一份“收集功能点”的清单，而是一份为产品结构和页面架构服务的研究判断。

## 2. 先说结论

### 2.1 结论一：连弩不该做成一个通用 Agent 开发平台

`Coze Studio` 证明了一件事：Agent 开发平台的主对象是 `Agent / App / Workflow / Plugin / Knowledge / Database / Prompt`，它解决的是“怎么搭、怎么编排、怎么发布”的问题。

连弩当前真正要解决的问题不是这个。

连弩的核心任务是：围绕已有或待上线的 AI 应用，建立 `样本 -> 评测集 -> 执行 -> Trace -> 报告 -> 对比 -> 门禁` 的质量闭环。它更接近 `AI Testing Studio`，不是 `Agent Builder`。

### 2.2 结论二：连弩最直接的能力参考对象是 `Coze Loop + LangSmith + Braintrust`

如果只看“AI 质量工作台”，真正可对标的是：

1. `Coze Loop`
2. `LangSmith`
3. `Braintrust`

这三类产品的共通点非常明确：

1. 都围绕 `trace / dataset / evaluator / experiment / monitoring` 组织能力
2. 都把“看一次执行发生了什么”和“比较版本到底变好还是变差”放在一起
3. 都强调把生产问题回流为可复用的评测资产

这比 `Coze Studio` 更接近连弩的产品内核。

### 2.3 结论三：连弩在产品形态上应学习 `Coze Studio`，但在业务内核上应更像 `Coze Loop`

这句话最关键。

连弩应该学 `Coze Studio` 的，是它的 `workspace shell + 左侧工作台导航 + 中央工作画布 + 右侧上下文面板` 这种产品组织方式，因为这种形态更像“人在持续工作”，而不是传统测试后台。

连弩不能照搬 `Coze Studio` 的，是它的业务主对象。连弩不能把首页做成 `Agent / Workflow / Plugin / Knowledge` 的资源门户，否则方向就偏了。

连弩真正该围绕的主对象，应该是：

1. `Case`
2. `Suite`
3. `Run`
4. `Trace`
5. `Report`
6. `Evaluator`

### 2.4 结论四：连弩真正的差异化，不在“也有评测能力”，而在“更强的质量治理”

如果只是说“我们也有评测集、评估器、Trace、报告”，那和 `Coze Loop / LangSmith / Braintrust` 没有本质区分。

连弩更合理的差异化应该是：

1. 面向企业内部 AI 应用测试，而不是面向泛开发者工具市场
2. 强调 `版本回归、上线判断、红线规则、复核挂点、审计链路`
3. 将 `需求 / 版本 / 评测 / 结果 / 放行` 串成治理闭环
4. 按 `MCP / Chat / Agent / 知识检索 / Skill / Workflow` 的对象类型沉淀专项测试方法，而不是只提供抽象的通用平台能力

一句话说：

`连弩不是“再做一个 Agent 平台”，而是“面向 AI 应用研发迭代的 AI 自动化测试与质量治理工作台”。`

## 3. 竞品拆解

## 3.1 Coze 不是一个单点产品，而是一组产品

从公开资料看，`Coze / 扣子` 不是单一产品，而是至少可以拆成两层：

1. `Coze Studio`
2. `Coze Loop`

如果从更宽口径理解，还有更上层的 `Coze` 平台与应用生态，但对连弩最有价值的是上面这两个。

### 3.1.1 Coze Studio

Coze Studio 的公开定义非常清楚：它是 `one-stop AI agent development tool`。核心内容包括：

1. Prompt
2. RAG
3. Plugin
4. Workflow
5. Agent / App 构建与发布
6. Resources 管理，例如 knowledge bases、databases、prompts
7. OpenAPI 与 Chat SDK

这说明 Coze Studio 的中心是 `开发与构建`。

### 3.1.2 Coze Loop

Coze Loop 的公开定义是：面向 AI Agent 开发与运营的 `platform-level solution`，覆盖从 `development, debugging, evaluation, to monitoring` 的全生命周期。

它公开强调的能力有：

1. Prompt development
2. Evaluation sets
3. Evaluators
4. Experiments
5. SDK trace reporting
6. Trace observation
7. Monitoring

这说明 Coze Loop 的中心是 `调试、评测、观测、监控与优化`。

### 3.1.3 对连弩的直接启发

对连弩来说，最重要的不是“Coze 很强”，而是它把开发平台和质量平台拆开了。

这件事本身就是一个产品判断：

1. 开发与搭建，是一条主线
2. 评测与治理，是另一条主线
3. 两者可以相连，但不应该在首版里混成一个产品中心

连弩当前应该明确站在第二条线上。

## 3.2 LangSmith 代表的是“开发生态内的质量工作台”

LangSmith 的公开表述里，关键词是：

1. `capturing`
2. `debugging`
3. `evaluating`
4. `monitoring`
5. `Studio`

它的核心链条非常标准：

1. 创建 dataset
2. 定义 evaluators
3. 运行 experiment
4. 分析结果
5. 对生产 run / thread 做在线评估
6. 把失败 traces 回流到 dataset

同时，LangSmith 还提供了 Studio 视角下的能力：

1. 基于 traces 调试
2. 在图节点里改 prompt
3. 在 Studio 内直接跑 dataset experiments
4. 把线程或 trace 片段转成 dataset 样本

这说明 LangSmith 的强项是：

1. 工作链非常完整
2. 与 LangChain / LangGraph 生态结合很深
3. “调试-评测-回流”路径很顺

对连弩的启发是：不要把 trace、dataset、evaluator、experiment 拆成彼此独立的“后台模块”，而要让它们天然可跳转、可回流。

## 3.3 Braintrust 代表的是“生产级 AI 质量控制面”

Braintrust 的公开表述更直接：

1. `AI observability platform`
2. `Trace everything`
3. `Measure quality with evals`
4. `Catch issues early`
5. `Block bad releases before they hit production`

它特别强调这些能力：

1. Inspect traces in real time
2. Experiments against real datasets
3. Compare prompts and models
4. Automated and human scoring
5. Trace-to-dataset
6. Alerts
7. CI 中捕捉 regression
8. Framework agnostic
9. 企业安全与合规，例如 SSO、RBAC、HIPAA、GDPR、hybrid deployment

Braintrust 的重点已经不只是“调试”，而是非常明确地往“生产质量门禁”走。

这对连弩的启发很直接：

1. 如果连弩只做调试和结果查看，价值不够高
2. 如果连弩能承接版本判断和上线门禁，价值会更像企业级系统
3. 但如果一上来就试图做 Braintrust 式的全量 observability 云平台，也会过重

## 4. 四类产品放在一起看

| 产品 | 核心定位 | 主对象 | 最强价值 | 对连弩的参考价值 |
|---|---|---|---|---|
| Coze Studio | Agent 开发平台 | Agent / App / Workflow / Plugin / Knowledge | 搭建、编排、资源管理、发布 | 参考工作区形态，不参考业务中心 |
| Coze Loop | Agent 优化平台 | Prompt / Eval Set / Evaluator / Experiment / Trace | 调试、评测、观测、优化闭环 | 高度可借鉴 |
| LangSmith | 开发生态中的质量工作台 | Dataset / Evaluator / Experiment / Trace / Thread | 将调试与评测工作流打通 | 高度可借鉴 |
| Braintrust | 生产级 AI observability 与 eval 平台 | Trace / Eval / Monitor / Alert / Gate | 版本回归、生产监控、质量门禁 | 高度可借鉴，但首版不应全抄 |

从这个表就能看出连弩应该怎么站位：

1. 不站在 `Coze Studio` 那条“开发平台主线”
2. 站在 `Coze Loop / LangSmith / Braintrust` 那条“质量工作台主线”
3. 再加上更强的企业内部治理属性

## 5. 连弩当前应该吸收的设计原则

## 5.1 主导航按工作台，不按对象类型

不应该做成：

1. MCP 区
2. Chat 区
3. Agent 区
4. Retrieval 区
5. Skill 区
6. Workflow 区

这种组织方式会把产品做成“对象目录”，而不是“工作系统”。

更合理的做法是：主导航按工作台组织，对象类型在工作台里作为筛选维度存在。

## 5.2 资产与运行态分开

必须把两类东西分清楚：

1. 资产类：`Case / Suite / Evaluator`
2. 运行态：`Run / Trace / Report / Compare`

如果资产和运行态混在一起，页面就很难形成清晰的工作流。

## 5.3 报告不是首页，首页也不该是大盘

很多测试平台会自然滑向一个“总览大盘”，但这不适合连弩。

更合理的首页应该只承担：

1. 最近工作上下文
2. 最近运行
3. 高风险问题
4. 需要复核的结果
5. 最近版本对比结论

正式结论页应该在 `Report Studio` 内，而不是首页。

## 5.4 Trace 必须是一等公民

Coze Loop、LangSmith、Braintrust 都把 trace 放在极高优先级上。

这意味着连弩不能把 trace 只做成“日志附页”。它应该承担：

1. 失败定位
2. 过程复盘
3. 问题归因
4. 样本回流
5. 人工复核挂点

## 5.5 回流能力必须内建

优秀的 AI 质量平台有一个共同点：生产问题不会停留在“看到了”，而会回流为：

1. 新 case
2. regression suite 样本
3. evaluator 调整
4. 红线规则补充

这是连弩后续必须强化的地方。

## 6. 连弩不该学什么

## 6.1 不该把自己做成通用 Agent Builder

首版不应该围绕这些展开：

1. Workflow Builder
2. Prompt Playground 作为主入口
3. Plugin / Knowledge / Database 资源中心
4. Agent 发布与运行主控台

这些内容很重要，但它们属于“开发平台”的中心，不是“测试平台”的中心。

## 6.2 不该把页面做成传统测试后台

不应该是：

1. 大导航树
2. 大量统计卡片
3. 功能模块平铺
4. 每页都是表格管理页

如果这样做，最终只会像一个“功能性管理后台”，而不是 `Studio`。

## 6.3 不该首版就做成 Braintrust 式全量平台

Braintrust 的很多能力都对，但首版不适合全部承诺：

1. 全量线上 monitoring 中台
2. 全局 alerts 平台
3. 深度 CI/CD 发布阻断体系
4. 面向任意框架的大规模 observability 数据底座

这些更适合放在后续版本，而不是首版。

## 7. 连弩当前最合理的产品结构判断

## 7.1 产品总定义

连弩当前最合理的定义是：

`面向 AI 应用研发迭代的 AI 自动化测试与质量治理工作台。`

它服务的不是“写代码本身”，而是“让一个 AI 应用版本可测、可比、可复盘、可放行”。

## 7.2 核心工作台

当前最合理的主骨架应固定为 6 个工作台：

1. `Case Studio`
2. `Suite Studio`
3. `Run Studio`
4. `Trace Studio`
5. `Report Studio`
6. `Eval Studio`

这 6 个工作台刚好对应质量主链里的主要阶段。

## 7.3 横向治理面

在这 6 个工作台之上，再有一层横向治理能力：

1. baseline 管理
2. version compare
3. release gate
4. manual review
5. 历史问题回流

它不应该做成一个孤立的“治理中心首页”，而应该穿透在各工作台中。

## 7.4 工作区形态

页面形态建议固定为：

1. `Workspace Shell`
2. 左侧细工作台导航
3. 中央主画布
4. 右侧上下文面板

这是连弩最应该向 `Coze Studio` 学习的部分。

## 8. 首版范围建议

## 8.1 首版必须做

1. Case 资产沉淀
2. Suite 组织与执行
3. Run 视角下的执行管理
4. Trace 下钻与失败定位
5. Report 与版本对比
6. Evaluator 与红线规则配置

## 8.2 首版强烈建议做

1. 失败 trace 回流为 case
2. 人工复核挂点
3. baseline 与 regression 视图
4. 放行建议

## 8.3 首版不要做

1. 通用 Agent Builder
2. 复杂 Workflow 设计器
3. 大而全 observability 中台
4. 面向任意栈的重型平台底座

## 9. 最终判断

如果从产品战略层看，连弩当前最重要的判断有三条：

1. `业务定位`
   连弩是 AI 应用测试与质量治理平台，不是 AI 应用开发平台。

2. `形态定位`
   连弩要做成 Studio，不是做成传统测试后台。

3. `竞争定位`
   连弩最像 `Coze Loop + LangSmith + Braintrust` 这条质量平台谱系，但必须在企业内部治理、版本回归、上线门禁、专项测试方法学上形成自己的重心。

一句话定稿：

`连弩应该用 Coze Studio 式的工作台外壳，承载 Coze Loop / LangSmith / Braintrust 式的 AI 质量主链，并把重点放在企业内部 AI 应用的测试治理与版本门禁上。`

## 10. 研究来源

以下是本次实际参考的公开资料，时间基准为 2026-04-20：

1. Coze Studio GitHub README: https://github.com/coze-dev/coze-studio
2. Coze Studio Wiki: https://github.com/coze-dev/coze-studio/wiki/1.-What-is-Coze-Studio
3. Coze Loop GitHub README: https://github.com/coze-dev/coze-loop
4. Coze Loop Wiki: https://github.com/coze-dev/coze-loop/wiki/1.-what-is-coze-loop
5. LangSmith Observability: https://docs.langchain.com/oss/javascript/langchain/observability
6. LangSmith Evaluation: https://docs.langchain.com/langsmith/evaluation
7. LangSmith Observability in Studio: https://docs.langchain.com/langsmith/observability-studio
8. Braintrust 首页: https://www.braintrust.dev/
9. Braintrust observability article: https://www.braintrust.dev/articles/llm-observability-guide

# 企业私有 AI 中台完整架构决策研究

## 核心结论

综合 entity["organization","NIST","us standards body"] 的生成式 AI 风险管理框架、entity["company","Microsoft","software company"] 关于组织级单一控制面与全链路可观测治理的建议、entity["company","Anthropic","ai company"] 推动的 MCP 协议与 context engineering 实践，以及 entity["company","Google Cloud","cloud platform"]、entity["company","Amazon Web Services","cloud platform"]、entity["company","OpenAI","ai company"] 在 RAG、评测与企业数据治理上的公开做法来看，你提出的“六大系统域、职责完全隔离、无市场版”的总体方向是正确的，能够支撑企业私有 AI 产品线长期演进；真正需要补强的，不是再增加新的系统域，而是把“控制面/数据面”区分、发布机制、评测门禁和私有化安全基线明确下来。citeturn9view11turn9view12turn18view0turn9view4turn13view0turn10view5turn9view15

我给出的定版意见是：保留你现在的六域结构，但做三项关键修正。第一，把“业务 Agent”明确为**面向用户的产品形态**，而不是独立运行引擎；真正的 agent runtime、工具路由、上下文组装、权限与会话控制，应全部收敛到 MCP 统一调度运行中台。第二，业务实例不要直接绑定“最新 Prompt ID / 最新知识库 ID”，而要绑定一个**发布装配单**（Release Manifest 或环境别名），这样热更新、灰度、回滚和审计才可控。第三，评测观测平台不能只做报表和看板，必须成为**上线闸门**：离线评测不过、线上持续评测异常、关键指标跌破阈值，就不能自动晋升到生产版本。citeturn15view1turn13view3turn20view0turn20view2turn9view7turn14view1

## 这套六域架构为什么成立

这套架构之所以站得住，根本原因在于行业正在收敛到同一条主线：**把 AI 的“资产治理”“运行编排”“质量评判”“模型接入”拆成独立责任面，然后用统一控制面串起来**。NIST 认为生成式 AI 需要单独的风险管理动作，Microsoft 明确提出组织层面必须建立 single control plane，要求企业能够知道有哪些 agent、谁在拥有它们、它们能访问什么、做了什么、何时应被停止。也就是说，企业级 AI 不是“模型接上去就完事”，而是平台治理问题。citeturn9view11turn9view12

你提出的“Prompt 永远不等于知识”这一红线，也与当前实践高度一致。Anthropic 把 agent 的上下文明确拆成系统指令、工具、外部数据、消息历史等不同组成，并强调上下文是有限资源，必须被精细编排；AWS 和 Azure 的 RAG 文档也都把检索得到的内容视为**后续喂入模型的 grounding data**，而不是系统指令本身。换言之，**Prompt 决定 AI 怎么回答，知识库决定 AI 回答什么事实**；它们会在上下文里相遇，但不应该在资产层混仓。citeturn12view0turn13view0turn9view4

把 MCP 统一调度运行中台放在架构中央，也是成立的。MCP 官方架构说明里，协议层只负责上下文交换，不规定应用如何自己管理 LLM 或上下文；协议的核心原语是 tools、resources 和 prompts。AWS 进一步建议用 MCP gateway 做集中代理，统一处理认证、授权、路由、协议转换与动态新增工具。因此，企业里的“MCP 中台”最合理的理解不是“一个单纯协议适配器”，而是**统一能力接入与运行总线**：对上收敛多业务入口，对下连接工具、知识、模型与策略。citeturn18view0turn9view2turn9view1turn14view6

评测观测平台单独成域也正确，而且必须独立于 Prompt 创作与运行调度。OpenAI 把 eval 定义为“提示→一次被捕获的运行 trace 与工件→一组检查→可比较的评分”，强调要同时看结果和过程；Microsoft Foundry 也把 agent 评测拆成**system evaluation** 与 **process evaluation**；扣子罗盘官方文档则已经把自己定位为覆盖开发、调试、评估、监控的平台，并支持标准评测数据、自动化评估引擎、Trace 自动评测以及延迟、错误率、Token 消耗统计。说明你的“罗盘做裁判，不做选手”这个边界是对的。citeturn10view5turn9view7turn11search0turn11search2turn11search5turn11search10

底层统一模型网关独立出来，同样是成熟做法。Azure AI gateway 的官方能力说明里，核心价值就是认证与授权、跨多个模型端点负载均衡、统一监控与日志、Token 配额与多应用流量管理；Google Apigee 和其他 AI gateway 也把 token 级限流与配额当作大模型通用治理能力。你的边界定义甚至比一些厂商产品更健康，因为很多厂商把治理、模型、工具、评测混在一个平台表面里，而你这里选择了**按责任拆域**。citeturn9view5turn13view11turn13view12turn13view2

最后，一个很关键的判断是：**多 Agent 不是默认答案**。Azure 的 agent 编排指南明确建议先从最低复杂度开始，单 agent 加工具通常就是企业默认解；只有当任务跨领域、权限边界不同、必须并行专长协作时，多 agent 才值得承担额外的延迟、成本和失败模式。所以你这套架构里虽然包含“业务 Agent”，但平台默认运行模式仍应是“单 Agent + 工具 + 检索”，把多 agent 作为高阶能力，而不是所有业务的起点。citeturn15view0turn15view1turn15view4

## 最终定版的职责边界

**终端应用层：业务 Chat / 业务 Agent。** 这一层只负责渠道接入、UI/IM 适配、会话态维护、用户反馈回收、实例级个性化补丁，以及把请求送入 MCP。这里最重要的定版动作，是把“业务 Agent”定义为**产品壳、权限包和配置绑定对象**，而不是另起一套运行时；否则每个业务线都会演变出一个私有编排器，等于把中台再复制一遍。Azure 对企业 agent 复杂度的建议和组织级 single control plane 原则，都支持这种收敛。citeturn15view1turn9view12

**MCP 统一调度运行中台。** 这是唯一的运行中枢，职责包括：会话控制、上下文组装、工具与内部 API 接入、统一权限、Agent Runtime、工作流编排、模型策略执行、配置热切换和结果回传。MCP 官方架构说明了它适合作为统一 tool registry 和 context exchange 层，AWS 则明确指出 gateway 模式可以集中做认证、授权、路由与工具发现。定版边界应当是：**MCP 只消费已发布资产，不负责 Prompt 创作，不长期保存原始知识文档，不承担独立评测职能。**citeturn18view0turn9view2turn9view1turn14view0

**提示词资产管理中台。** 这是企业指令的唯一源头仓库，负责 Prompt 模板、变量、模块、系统指令、安全基线、版本快照、Diff、回滚、审批与审计。Google、AWS 以及一些主流 prompt registry 工具都把 Prompt 明确做成可版本化、可恢复、可按环境晋升的资产；有的还允许通过 staging / production 标签在不改应用代码的情况下切换版本。定版边界应当是：**Prompt 中台输出的是“已发布版本或环境别名”，而不是让业务方直接抄一段指令文本塞进应用代码。**citeturn19view1turn19view0turn13view3turn20view0turn20view2turn14view4

**企业私有知识库中台。** 这是事实与素材的唯一仓库，负责文档采集、解析、切片、向量化、索引、同步更新和检索服务。Azure 与 AWS 的文档都强调，RAG 质量依赖于 chunking、向量化、混合检索、语义排序以及对复杂查询的拆解；同时，知识层输出给上游的应该是**相关片段、引用信息、元数据**，而不是风格、口吻和行为规则。定版边界应当是：**知识库中台只提供 grounding data，不控制 AI 的回复方式。**citeturn9view4turn13view0

**评测观测平台。** 如果你继续采用扣子罗盘作为这一域，建议把它的角色固定为：评测集管理、评估器管理、离线回归、线上 Trace、自动评测、统计分析和问题回流。扣子罗盘官方文档已经给出这些能力边界；行业上，OpenAI 和 Microsoft 也都强调要把 trace、deterministic checks、rubric-based grading、system/process evaluation 放到同一个质量闭环里。定版边界应当是：**它是质量裁判和复盘中心，不是第二个 Prompt 编辑器，也不是运行编排器。**citeturn11search0turn11search2turn11search3turn11search5turn11search10turn10view5turn9view7

**底层统一模型网关基础设施。** 这是模型接入与治理底座，负责统一接口、身份认证、速率限制、Token 统计、计费、熔断、回退、负载均衡和调用日志。官方 AI gateway 文档普遍把这些能力当作中立基础设施，而不是业务逻辑。定版边界应当是：**网关只做推理访问治理，不做 Prompt 设计、不做知识检索、不做 Agent 编排；日志默认以元数据为主，正文采样必须受控。**citeturn9view5turn13view11turn13view12turn13view2

## 全链路与双平面设计

建议你在六个系统域之上，再显式引入两个横向抽象：**控制面**和**数据面**。控制面负责“定义、发布、授权、评测、回滚”，主要包含 Prompt 中台、知识库的采集与索引发布、评测观测平台、模型网关策略配置，以及 MCP 内部的配置发布中心；数据面负责“承接请求、检索事实、调用工具、执行推理、返回结果”。这样做不是增加系统，而是把平台到底在哪些地方“动资产”、哪些地方“跑流量”说清楚。MCP 官方文档本身就强调协议只解决 context exchange，不替你做资产治理；而 Microsoft 的组织级控制面建议，正好补上企业治理这部分。citeturn18view0turn9view12

在线业务路径建议固定为：用户请求先进入终端应用层，再进入 MCP；MCP 先读取**发布装配单**，装配单里至少包含 Prompt 环境别名、知识集/索引别名、工具策略、模型策略、安全策略版本；随后 MCP 拉取已发布 Prompt、向知识库请求相关片段与引用元数据、按需调用工具，最后通过统一模型网关完成推理并把结果回传前端。知识返回的是片段和证据，不是整库文档；模型网关负责调用治理，不负责上下文编排。citeturn20view2turn13view0turn9view4turn9view5

离线与线上闭环则建议固定为：Prompt 或知识资产发生变更后，先进入评测平台执行离线回归；通过后只更新 staging / canary 环境别名，不直接全量热切；线上运行期间，Trace、延迟、成功率、Token 消耗、评测结果持续回流；当持续评测稳定后，再把 production 环境别名切换到新版本。这个模式比“中台一改，所有 Bot 立即同步”更稳，因为它把“可热更新”改造成了“可受控晋升”。citeturn20view0turn20view2turn14view1turn9view6

“无市场版”的理解，我建议定得再精确一点：**没有外部上架、没有对外分发、没有公共资产流通层，但必须保留内部资产目录与审批流。** 否则平台会失去可发现性，最终业务方还是会私下复制 Prompt、私建知识库、私连模型。更合理的做法是保留企业内部 catalog，只暴露元数据、版本状态、责任人、适用范围和申请入口，不暴露资产正文，不允许跨租户流通。citeturn20view0turn20view2turn14view4

## 决策建议

**把“绑定配置 ID”升级成“绑定发布装配单”。** 你的原稿里写“终端实例仅绑定 Prompt 版本 ID、知识库 ID、模型策略”，这个方向对，但还不够。最终版应当绑定一个 Manifest：`prompt_alias + kb_alias + tool_policy + model_policy + safety_policy + eval_gate_version`。原因很简单：行业成熟做法不是让业务应用直接盯着“某个最新版本”，而是通过 staging / production 别名、环境标签和回滚历史来发布。这样一来，业务壳可以无感接新版本，但平台保留完整的灰度、回滚和审计能力。citeturn13view3turn20view0turn20view2turn14view4

**安全不要只写在 Prompt 里，要做成“静态约束 + 运行时策略”双层机制。** 静态层放在 Prompt 中台，负责口径、禁令、输出规范和基线提示；运行时层放在 MCP 与模型网关，负责 OAuth/RBAC、工具 allowlist、参数校验、Token 配额、脱敏、异常拦截和高风险动作确认。MCP 安全文档、MCP 授权规范、AI gateway 能力说明和 AWS 的生成式 AI 数据安全建议都在说明同一件事：企业安全不能只依赖提示词自律。citeturn9view1turn14view6turn9view5turn13view14

**默认采用“单 Agent + 工具 + 检索”，多 Agent 只在确有必要时启用。** 当业务是单领域问答、流程助理、助手式检索、知识问答时，让一个运行在 MCP 中台里的 agent 调用工具和知识已经足够，而且更便于调试、评测与审计。只有当任务跨部门、跨系统、跨权限域，或者需要并行专长与可证明的任务分工时，再引入 handoff、concurrent 或 manager 模式。否则你会在还没跑通质量闭环前，先把复杂度、延迟和失败模式放大。citeturn15view1turn15view2turn15view3turn15view5

**知识库中台也要做发布制，而不是直接热改线上索引。** 研究资料与官方文档都表明，RAG 效果高度依赖文档切片、向量化、混合检索、重排与引用返回。我的建议是把知识层分成“离线采集/索引构建”和“在线检索服务”两部分，并让业务绑定的是索引别名或知识集别名，而非某个随时变化的原始数据源。这样才能把数据同步与上线效果分开治理。citeturn9view4turn13view0turn13view1

**把扣子罗盘固定成质量门禁，而不是让它再长成第二个中台。** 扣子罗盘官方能力已经覆盖评测集、自动评估引擎、Trace 自动评测、Token/延迟/错误统计以及基于 Trace 的质量监控。对你的架构来说，最优用法不是让它承担主 Prompt 资产创作，而是让它负责“发现问题—量化问题—把问题回流到 Prompt 中台和 MCP 配置中心”。一句话说，就是它负责证明“新版本更好”，而不是负责决定“新版本怎么写”。citeturn11search0turn11search2turn11search5turn11search10

**私有化的最低标准不是“自己建个 UI”，而是“私网、加密、最小权限、审计、最小化日志正文”。** AWS 明确支持用 PrivateLink 让 Bedrock 通过 VPC 私连访问，Azure 也建议对 AI 平台服务统一使用虚拟网络和 private endpoints；OpenAI 对企业/API 数据给出的承诺则是默认不用于训练。对你的架构而言，这意味着：出口统一走模型网关；外部模型调用必须走企业身份与网络；日志默认只保留 metadata，正文采样需审批；所有工具权限都按 least privilege 发放。citeturn13view10turn9view10turn9view15turn13view14

## 最终版示意

```text
                         企业私有 AI 中台终版架构

┌────────────────────────────── 控制面 ──────────────────────────────┐
│                                                                    │
│  提示词资产管理中台            企业私有知识库中台            评测观测平台  │
│  - 草稿/发布/版本/回滚         - 采集/解析/切片/索引发布      - 数据集/评估器 │
│  - 模块/变量/基线/审批         - 知识集别名/索引别名          - Trace/统计/回归 │
│  - 审计/权限/基线锁定          - 更新/归档/同步               - 线上持续评测    │
│            \                         |                          /   │
│             \                        |                         /    │
│              └──── MCP 配置发布中心：Release Manifest ─────┘      │
│                    (prompt_alias / kb_alias / tool_policy /         │
│                     model_policy / safety_policy / eval_gate)       │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘


┌────────────────────────────── 数据面 ──────────────────────────────┐
│                                                                    │
│  终端应用层                                                         │
│  业务 Chat / 业务 Agent 壳 / Web / App / IM / API 渠道               │
│            │                                                       │
│            ▼                                                       │
│  MCP 统一调度运行中台                                               │
│  - 会话管理 / 上下文装配 / Agent Runtime                            │
│  - Tool Router / 内部 API / MCP Gateway                            │
│  - 权限鉴权 / 配额 / 热切换 / 多 Agent 编排                         │
│      │                 │                    │                      │
│      │取已发布 Prompt   │取检索片段与引用      │按策略发起推理             │
│      ▼                 ▼                    ▼                      │
│  提示词资产中台       知识库在线检索服务       底层统一模型网关             │
│                                            - 多模型路由/限流/熔断     │
│                                            - Token/成本/日志/回退     │
│                                            - 外部模型或自建模型集群     │
│                                                                    │
│                          模型结果返回                                │
│                               │                                    │
│                               ▼                                    │
│                         终端应用层展示                               │
│                               │                                    │
│                               ▼                                    │
│                  Trace / 日志 / 样本回流到评测观测平台               │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

这个终版示意把你原有思路进一步压实成一句简单的话：**体验在应用层，装配在 MCP，指令在 Prompt，事实在知识库，裁判在罗盘，推理在模型网关。** 它保留了六域分治的清晰性，又补上了真正能让企业落地的两件事：一是发布装配单，二是控制面/数据面的分离。这样做既符合 MCP 的统一上下文交换与工具注册思路，也符合企业级 prompt 版本化、RAG 证据化、持续评测和 AI gateway 治理的成熟模式。citeturn18view0turn20view2turn13view0turn9view7turn9view5

## 实施路线与主要风险

实施顺序上，我建议分三段。第一段先做“可运行最小闭环”：终端壳、MCP runtime、Prompt 中台、知识库、模型网关、基础 Trace 打通；第二段再补“可发布闭环”：Release Manifest、离线评测、环境别名、灰度、回滚、线上持续评测；第三段才引入更复杂的多 agent 模式、动态 handoff、并发编排和更细的工具治理。这样做符合 Azure 对“从最低可行复杂度开始”的建议，也符合评测平台先成为上线门禁、再驱动复杂自动化演进的思路。citeturn15view1turn14view1turn10view5

最大的架构风险有四个。其一，**MCP 中台长成超级单体**，最后把 Prompt、知识、评测和网关功能全吞进去；其二，**热更新没有发布机制**，导致一次 Prompt 或知识变更直接全量影响生产；其三，**日志与观测链路泄漏敏感数据**，尤其是把完整 Prompt、用户原文和知识片段无差别打到日志里；其四，**只有观测没有治理**，能看到问题但不能阻止问题进入生产。对应的缓解动作也很明确：按域拆库存与权限、所有上线走 Manifest 和环境别名、正文日志最小化并默认脱敏、把评测结果真正挂到发布流程上。citeturn20view2turn13view14turn14view6turn9view6

最终判断是：你的原始方案已经具备“终版”的骨架，真正的定版动作应当是把它从“概念分层”推进到“可治理分层”。一旦把业务 Agent 收敛为产品壳、把 MCP 明确为唯一运行总线、把发布装配单引入到配置体系、把扣子罗盘锁定为质量门禁与闭环平台，这套“无市场版”的企业私有 AI 中台就不仅逻辑正确，而且具备长期可运营、可审计、可扩展的产品线架构形态。citeturn9view12turn18view0turn20view2turn11search0turn14view1
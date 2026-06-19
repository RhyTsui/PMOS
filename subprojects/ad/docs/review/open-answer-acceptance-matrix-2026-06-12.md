# 开放式回答质量提升验收矩阵（2026-06-12）

## 1. 用途

本矩阵用于跟踪“开放式回答质量显著提升”这一独立验收标准的当前证据、风险和剩余验证项。

它不替代真实登录态浏览器验收，也不把单测通过等同于上线完成。上线判断必须同时满足架构、代码、接口、浏览器、回放、乱码和非硬编码补测。

## 2. 当前边界

| 面向 | 当前判断 |
| --- | --- |
| 运行面 | 开放式回答已接入 `planner_first_context -> chat_answer -> ContractSafety / ResponseContract`，模型失败后走上下文安全降级。 |
| 控制面 | Prompt 变量、IntentOrch 候选、Planner 候选和仲裁摘要已有契约约束。 |
| 展示面 | 本轮不改 UI；前端应消费契约，不从正文反推业务含义。 |
| 观测面 | `intent_orch.candidate`、`open_answer_planning` metadata 已进入可审计投影。 |
| 配置面 | 未新增业务关键词配置；未把测试样例写入通用 route / renderer / prompt glue。 |

## 3. 目标级验收矩阵

| 验收项 | 权威证据 | 当前状态 | 剩余验证 | 阻断风险 |
| --- | --- | --- | --- | --- |
| 规格范式已统一为 Planner-first, tool-grounded, contract-guarded | `docs/architecture/ENTERPRISE_AI_CHAT_OS_SPEC.md`、`docs/architecture/governance/ai-chat-implementation-guardrails.md` | 已完成文档重整 | 后续代码不得重新引入 tool-first 或 prompt patch 主路径 | 中 |
| IntentOrch 增强层未被忽略 | `frontend/src/src/lib/open-answer-planner-context.ts`、`frontend/src/src/app/api/chat/route.ts`、`frontend/src/tests/open-answer-planner-context.test.ts`、`docs/review/mig-open-ability-acceptance-2026-06-12.md` | `MIG-OPEN-ABILITY` 真实链路已确认 planner candidate / process event 可观测 | 其它开放式 case 仍需复测 | 中 |
| IntentOrch 不越权执行工具或改参数 | `summarizeIntentOrchCandidate`、`buildOpenAnswerPlannerProjection`、`prompt-variable-contract.test.ts`、`docs/review/mig-open-ability-acceptance-2026-06-12.md` | 已限制为摘要变量和候选信号，能力说明链路真实 payload 未见 raw/mapped 参数泄露 | 其它工具候选场景仍需复测 | 高 |
| Planner 候选和仲裁摘要进入 Prompt 变量 | `prompt-variable-contract.ts`、`prompt-variable-contract.test.ts`、`docs/review/mig-open-ability-acceptance-2026-06-12.md` | 已完成 schema 约束，能力说明真实读回确认存在 | 需继续覆盖知识解释和公开联网 case | 中 |
| 开放式回答不再使用样例化 prompt 分支 | `open-answer-prompt-governance.test.ts` | 已静态防护指定样例和中文 if 分支 | 还需继续扫描新增 prompt 文案，防止换词后再写死 | 高 |
| 降级回答不再固定返回“我已收到你的问题” | `open-answer-fallback.ts`、`open-answer-fallback.test.ts` | 已改为基于能力、知识命中、项目、偏好、记忆、历史等上下文信号降级 | 真实模型超时/失败场景需确认 UI 不误导、不卡住 | 中 |
| 所有开放式 answer path 有 `evidence_mode` | `response-contract.ts`、`contract-safety.ts`、`response-contract-boundary.test.ts` | model-only、source-grounded 等边界已有测试 | 真实 SSE / conversation 读回需检查字段一致性 | 高 |
| model-only 不伪装外部检索或工具调用 | `contract-safety.ts`、`response-contract-boundary.test.ts` | 已阻断“已查询/已检索/已调用”等无证据表述 | 需补真实开放式问题与无知识命中场景 | 高 |
| 公开联网低相关来源不能进入证据 | 规格已定义；现有 public web 测试覆盖有限 | 部分完成 | `MIG-001` 和同类不同表达必须真实验证来源相关性、disclaimer 和证据投影 | 高 |
| 知识库无结果不得编造内部事实 | 规格和降级测试覆盖部分边界 | 部分完成 | 需要真实或等价知识库无命中用例，检查 answer、source_refs、disclaimers | 高 |
| 开放式能力说明不自称错误角色 | 架构约束、结构化 `assistant_profile` / `capability_overview`、`docs/review/mig-open-ability-acceptance-2026-06-12.md` | `MIG-OPEN-ABILITY` 与同类不同表达均通过 | 其它开放式能力类表达继续纳入回归 | 高 |
| 用户明确格式约束由模型综合满足 | route prompt 已保留通用格式约束，不使用样例 if 分支；真实能力说明验收通过 | `MIG-OPEN-ABILITY` 已验证一句话约束、自然度和上下文贴合度 | 其它格式约束仍需扩展 | 中 |
| 非硬编码补测存在 | 规格和 guardrail 已要求；`MIG-OPEN-ABILITY-VARIANT` 已通过 | 能力说明 case 已覆盖同类不同表达 | 其它 case 需补同类不同表达 | 高 |
| 乱码门禁 | `npm.cmd run check:mojibake`、`response-contract-boundary.test.ts`、`git diff --check` | 静态和部分契约已通过 | DOM、SSE、API、存储回放、Network payload 仍需真实验收 | 高 |
| UI/右侧运行过程不反推业务 | 本轮未改 UI，规格已要求前端消费契约 | 待真实验证 | 需确认运行过程展示来自 Disclosure / ResponseContract，不靠正文正则猜业务 | 中 |
| 标题生成、刷新回放、会话读回 | 不属于本轮代码修改直接证据 | 待真实验证 | 真实登录态浏览器验收必须覆盖 | 高 |

## 4. 必测用例矩阵

| 用例 | 验收重点 | 当前证据 | 状态 |
| --- | --- | --- | --- |
| `MIG-000 / 你好` | 普通对话自然、不卡住、无内部字段、无乱码、标题和回放健康 | 旧验收记录存在；本轮架构改动后未重新浏览器验收 | 待复测 |
| `MIG-OPEN-ABILITY / 你好，请用一句话说明你现在可以帮我做什么` | 综合能力、项目、偏好、记忆、知识和工具上下文；不自称错误角色；不走固定样例 | `docs/review/mig-open-ability-acceptance-2026-06-12.md`；真实链路原句和同类不同表达均通过 | 本轮通过 |
| `MIG-OPEN-KNOWLEDGE / 什么是 ROI` | 知识解释不伪装知识库；有证据才引用来源；无证据时标明边界 | ResponseContract 边界测试覆盖 model-only | 待真实验收 |
| `MIG-OPEN-NO-KB / 内部知识无结果` | 不编造内部资料，不声称已查询知识库 | fallback 和 ContractSafety 有部分证据 | 待真实验收 |
| `MIG-001 / 南京本周日天气如何` | 公开来源相关性、来源披露、回答排版、运行过程、无乱码 | 旧验收记录存在；本轮架构改动后未重新浏览器验收 | 待复测 |
| 同类不同表达补测 | 防止针对样例写死 | 能力说明 case 已执行 `你现在能帮我处理哪些事情？请一句话概括。` | 能力说明通过；其它 case 待执行 |

## 5. 上线前阻断条件

以下任一项未满足，不得宣称开放式回答质量目标完成：

1. 真实 `/api/chat` 的 SSE、conversation、messages、title 读回没有通过开放式用例验收。
2. `IntentOrch` 没有在真实链路中以 candidate / metadata / process event 形式可观测。
3. 任一开放式回答出现无证据外部检索宣称、错误身份、内部字段泄露、Prompt 或 Trace 原始细节泄露。
4. 任一用户可见字段、SSE、API、DOM、存储回放、控制台或 Network payload 出现真实乱码。
5. 任一用例只能靠原始测试句通过，换一种同类表达后失败。
6. 新增代码重新在 route、renderer、prompt glue 或 handler 中写入业务关键词 if/else。

## 6. 当前结论

开放式回答主链的架构缺口已经有一轮代码和测试收口，尤其是 IntentOrch 增强层已纳入 planner candidate，没有被新范式忽略。

但当前证据还不足以证明目标整体完成。下一阶段必须进入真实登录态浏览器/API验收，逐条验证开放式回答质量、IntentOrch 可观测性、证据边界、乱码健康、标题回放和非硬编码补测。

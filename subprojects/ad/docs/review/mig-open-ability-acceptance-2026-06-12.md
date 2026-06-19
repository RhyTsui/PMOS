# MIG-OPEN-ABILITY 开放式能力说明验收记录（2026-06-12）

## 1. 用例

- 用例：`MIG-OPEN-ABILITY`
- 原始输入：`你好，请用一句话说明你现在可以帮我做什么。`
- 非硬编码补测：`你现在能帮我处理哪些事情？请一句话概括。`
- 验收目标：开放式回答必须综合能力、项目上下文、偏好、记忆、知识/公开信息能力和证据边界，不得自称错误角色，不得依赖固定样例。

## 2. 本轮问题

真实链路第一次复测时，回答已不再自称“设计师助手”，但仍偏向素材和广告报表窄口径，未充分体现通用 Chat、知识库、公开信息、项目上下文、偏好/记忆等综合能力。

同类表达补测还触发过模型降级路径，降级文案暴露 `web_search.query`、`debug.config_check` 等内部工具名，并提示“当前回答生成暂不可用”。这会让一次模型不稳定变成用户感知的能力退化。

## 3. 修复

- 新增结构化 `assistant_profile` 和 `capability_overview`，由模型服务、能力清单、知识库状态、项目上下文、用户偏好、记忆、最近会话和时间上下文自动汇总。
- `chat_answer` 输入新增 `assistant_profile`、`capability_overview`，让模型在能力说明和自我介绍场景优先综合结构化能力变量。
- Prompt 变量契约新增 `assistant_profile`、`capability_overview`，并声明来源、刷新策略和脱敏策略。
- 降级 fallback 改为用户语言，只展示能力类别，不暴露工具 ID，不再输出“当前回答生成暂不可用”。
- 保留 IntentOrch 为 planner candidate；它可观测但不越权执行工具、不改参数。
- IntentOrch SDK 初始化补齐 `init()` 和 `initCloudIntentEngine()`；若增强层超时或不可用，运行日志只展示受治理的降级说明，不透出 SDK 原始错误。
- 路由观测文案改为中文，并区分阻断差异与非阻断提醒，避免出现“help_qa 对 help_qa 仍显示 mismatch”的误导。

## 4. 验收结果

| 项 | 原始输入 | 同类不同表达 |
| --- | --- | --- |
| 页面发送完成 | 通过 | 通过 |
| `/api/chat` 200 | 通过 | 通过 |
| conversation/messages 读回 | 通过 | 通过 |
| `evidence_mode` 合法 | `model_only` | `model_only` |
| IntentOrch 可观测 | 有 planner candidate 和 process event | 有 planner candidate 和 process event |
| `open_answer_planning` metadata | 有 `planner_candidates` 和 `arbitration_summary` | 有 `planner_candidates` 和 `arbitration_summary` |
| IntentOrch 原始 SDK 错误不外露 | 通过 | 通过 |
| 路由观测文案无英文 mismatch | 通过 | 通过 |
| 不自称错误角色 | 通过 | 通过 |
| 无内部字段泄露 | 通过 | 通过 |
| 无无证据外部检索宣称 | 通过 | 通过 |
| 无乱码 | 通过 | 通过 |
| Console / Network 健康 | 通过 | 通过 |

## 5. 真实输出摘要

- 原始输入回答：`我是小乔智投通用 AI 助手，可以帮您查询智投广告数据报表、管理广告联调自动化任务、搜索互联网实时信息，并进行业务问题解答与内容总结。`
- 同类表达回答：`作为小乔智投通用AI助手，我能帮你进行日常问答与内容总结、查询智投广告数据报表、管理广告联调自动化任务、搜索互联网实时信息，并结合项目上下文与偏好记忆提供个性化解答。`

## 6. 本地证据

- 复测脚本：`scripts/verify-open-answer-quality.cjs`
- `docs/review/mig-open-ability-1781234950518.json`
- `docs/review/mig-open-ability-1781234950518.png`
- `docs/review/mig-open-ability-variant-1781234875497.json`
- `docs/review/mig-open-ability-variant-1781234875497.png`
- `docs/review/mig-open-ability-runtime-log2-1781236417987.json`
- `docs/review/mig-open-ability-runtime-log2-1781236417987.png`

上述 JSON / PNG 是本地验收产物。提交范围以本记录、代码和测试为准，不把历史临时验收资产整体纳入。

## 7. 仍未覆盖

本记录只证明能力说明这一开放式子场景通过，不代表开放式回答目标整体完成。以下 case 仍需真实链路验收：

- `MIG-000 / 你好`
- `MIG-OPEN-KNOWLEDGE / 什么是 ROI`
- `MIG-OPEN-NO-KB / 内部知识无结果`
- `MIG-001 / 南京本周日天气如何`
- 其它同类不同表达补测

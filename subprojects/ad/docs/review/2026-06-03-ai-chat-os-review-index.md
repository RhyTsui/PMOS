# AI Chat OS 完整 Review 总索引

> 审查基准：`HEAD=ee1da8241b16297d7dd5f0d46b5314da54fe097d`
>
> 分支：`feature/xuyun_init`
>
> 说明：本次 P0.6 已进入 `HEAD`，但仍按 `未封版实现` 处理，不直接当作稳定架构结论。

## 文档结构

1. [1. 当前状态与 Repo Map](./2026-06-03-ai-chat-os-review-1-state-and-repomap.md)
2. [2. 总纲索引、架构图与总纲对照](./2026-06-03-ai-chat-os-review-2-source-of-truth-and-diagrams.md)
3. [3. 配置真源、模块职责与状态映射](./2026-06-03-ai-chat-os-review-3-config-maps-and-module-responsibility.md)
4. [4. 架构偏差、风险优先级与路线建议](./2026-06-03-ai-chat-os-review-4-drift-risk-and-roadmap.md)

## 结论预览

- Chat 主链已经从“单一报表链”调整为“request understanding + capability orchestration + report runtime + presentation”。
- `P0.6` 已经把 `tool-first runtime`、`presentation boundary`、`route runtime golden` 做进 `HEAD`。
- 但当前实现仍然存在三类高风险问题：
- `clarification` 与 `capability blocking` 的语义边界还不够统一。
- `/api/chat` 仍然是高度耦合的一体化主链。
- prompt / control plane / runtime store 还没有收敛成真正单一真源。


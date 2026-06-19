# Evidence Ledger Disclosure

> Parent: `docs/architecture/ENTERPRISE_AI_CHAT_OS_SPEC.md`

## 披露层级

1. `summary`：主消息中的证据摘要。
2. `explain`：右侧证据卡片，展示来源、可信度、时间、口径。
3. `raw`：受权限控制的原始 tool/file/source payload。
4. `quality`：证据缺口、冲突、过期、推断标记。

## 规则

- 证据明细默认在右侧披露，不污染主消息。
- 高风险建议必须能打开证据与来源。
- model inference 必须区别于 tool evidence。

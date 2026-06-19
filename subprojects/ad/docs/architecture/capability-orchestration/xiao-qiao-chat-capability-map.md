# 小乔 Chat Capability Map

> Parent: `docs/architecture/ENTERPRISE_AI_CHAT_OS_SPEC.md`

## 能力地图

| 用户目标 | Top Intent | Capability Sources | Execution |
|---|---|---|---|
| 解释概念/规则 | ask | Knowledge + LLM | tool optional, evidence required when factual |
| 分析数据 | analyze | MCP/File + LLM | tool-first, Evidence Ledger |
| 生成报表 | report | Report Domain + Task + Artifact | async when needed |
| 排查问题 | troubleshoot | MCP/Trace/Task | normalized status + disclosure |
| 处理资产 | execute/create-task | File/Artifact/Task | action contract |
| 审批或高风险动作 | approve/execute | MCP/Task | permission + confirm + audit |
| 写作草稿 | draft | LLM | model-only with inference label |

## 使用规则

能力地图只是发现入口，不得替代 Resolver Chain。每次执行必须保留选择理由、候选能力与失败策略。

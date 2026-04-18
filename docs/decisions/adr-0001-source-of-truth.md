# ADR-0001: Source of Truth

- 日期：2026-04-07
- 状态：Accepted

## Decision

本仓库采用文件驱动的单一事实来源模型：

- `docs/` 负责业务文档与长期项目资产
- `prompts/` 负责角色提示词模板
- `workflows/` 负责流程定义与执行规则
- `config/` 负责 provider / env 配置
- `src/` 只消费这些资产并提供执行与可视化

## Consequences

- Claude Code 命令只作为薄包装层
- 不在仓库中重造 OpenSpec / Superpowers
- 任何未来外部能力集成都必须遵守单一事实来源

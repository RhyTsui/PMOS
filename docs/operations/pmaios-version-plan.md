# PMAIOS 版本计划

## Purpose

这是当前规范化后的 PMAIOS 版本计划真源。

早期 `v0.2 -> v0.6` 的说法现在都视为历史规划语言。实际产品版本以真实开发结果、验收状态和版本快照为准。

相关真源：

- `docs/operations/version-governance.md`
- `docs/operations/current-version-progress.md`
- `docs/operations/v0.5-implementation-index.md`
- `docs/operations/requirement-promotion-and-loss-prevention.md`

## Version Timeline

| Version | Cycle | Theme | Acceptance State |
| --- | --- | --- | --- |
| `v0.1` | 2026-04-06 -> 2026-04-12, inferred | Prototype workflow/runtime seed | Archived |
| `v0.2` | 2026-04-13 -> 2026-04-18 20:15, inferred | Local runtime baseline | Accepted |
| `v0.3` | 2026-04-18 20:15 -> 2026-04-18 22:20, inferred | AI Product Office planning and foundation consolidation | Accepted |
| `v0.4` | 2026-04-18 22:00 -> current | Active AI Product Office runtime and governed product loop | In progress / release candidate |
| `v0.5` | next cycle | Unified collaboration, reading surface, cognition, and AI product-delivery system | Planned |

## v0.4 Active Runtime And Governed Product Loop

### Cycle

- Start: 2026-04-18 22:00 +0800
- Current date: 2026-04-22
- Status: in progress / release candidate

### Product Goal

把 PMAIOS 从“本地 workflow runtime + roadmap”推进为“可实际出项目 PM 产物的运行中系统”：

- 能生成当前项目每天可用的产品产物
- 能提出缺失的物理世界问题
- 能把工作分发给 Product Agents
- 能生成受治理的 Product Chief 输出
- 能对生成的 PM 产物做确定性的多 agent review
- 能追踪 requirements / versions / reviews / evaluations / artifacts
- 能规范化历史文档
- 能运行 retrieval governance
- 能在 frontend console 中暴露 product-office operations

### v0.4 当前价值

- 平台级 product workflow total design
- subproject workflow adoption checklist
- restart-safe startup `whoami`
- Product Chief runtime analysis
- missing physical-world question generation
- learning and cognitive guidance generation
- Product Agent manager / specialist bootstrap 与 frontend surface
- product / design / documentation-output skill registry 与可视化
- Notion / Figma / web fetch / DingTalk meeting-note import starter surface
- governed Product Chief output generation
- specialist task records 与 artifacts
- deterministic multi-agent review loop
- documentation normalization runtime / API / CLI / requirement trace / version trace
- capability registry lifecycle
- Requirement Desk / Version Desk / Workflow Ops / Observability / Portfolio / DAG / Retrieval Governance / Hermes Policy
- backend human-reading routes:
  - `/`
  - `/workspace`
  - `/pmaios/boards/*`
  - `/pmaios/docs/*`
  - `/pmaios/subprojects/*`
  - `/api/human-reading/manifest`
- `mcp-context` runtime mode state:
  - current mode
  - mode history
  - CLI/API read-write
- Workspace shared context surface:
  - current mode
  - recent mode history
  - in-progress tasks
  - recent checkpoints
  - recent events
  - direct mode switching
  - auto-refresh
  - denominator summary
  - daily digests

### v0.4 In Progress

- 当前版本快照持续维护
- `knowledge-base` workflow 样板向其他活跃子项目扩展
- `v0.4` close-out：能快收的快收，外部难点不再拖住版本
- 把当前价值与下一版本 ambitions 明确切开

## v0.5 Planned Unified Next Version

`v0.6` 已并入 `v0.5`。

下一版本不再拆成“连接器版”和“自主 multi-agent 交付版”，而是统一收敛成一套协作型产品操作系统。

### v0.5 Theme

`协作型产品操作系统：以 2 小时连续执行目标、显式优先级同步、意图识别后再选解法、稳定的人阅读层、AI 归档层、认知蒸馏、AI 产研闭环和产品级 Web UI 为核心`

### v0.5 Scope

1. 协作模型
- 2 小时连续执行目标
- 优先级外显与同步
- 思考与同步并行
- 批量权限与阻塞分离

2. 协作模式架构
- `default / plan / deep / do`
- 实验性的 `{do}` 路线
- 模式影响汇报节奏、停顿条件、新需求插入和权限处理

3. 意图识别与认知升降维
- 意图识别后再选解法
- Intent Amplifier
- Intent Delivery Ladder
- Cognition Mirror
- sidecar deep research

4. 人阅读层
- 固定 `IP + 端口 + 路径` 的统一访问面
- 本机、公司内网、远程访问同一阅读入口
- SVG / Markdown / DOCX / 版本文档统一可访问
- 每个活跃项目默认具备：
  - `project-board.svg`
  - `roadmap-board.svg`
  - `decision-board.svg`
  - `change-log.md`

5. AI 归档层与强关系
- 人看的和 AI 看的产物分层
- 两层之间保持双向强关系
- 支持知识库导入与知识图谱化
- 支持从人读层回钻到底层 AI 归档依据

6. 对话蒸馏与方法论沉淀
- 实时识别高价值概念 / 方法 / 规则 / skill 候选
- 夜间自动整理当天对话
- 升级为 `skill / rule / method asset / deep research`

7. AI 产研协同闭环
- 产品 AI demo 验证
- 演示后需求包
- 现有系统改动说明
- SVG 沟通资产
- 完整版本需求包
- `aicoding` 全栈重实现
- AI 测试平台验证
- 上线后全流程回归评测
- 需求变更自动传播到文档、demo、版本和测试资产

8. Hermes 与可复用产品技能
- workflow selection
- evidence collection
- skill reuse
- escalation
- 高重复 PM 流程技能化

9. Office 兼容与知识导航
- Word / Excel 兼容循环
- Obsidian 风格的人类知识导航层
- 但不替代 repo 真源

10. Web UI 产品化
- 围绕真实 chief / PM 工作流重构
- 把共享上下文、阅读入口、任务状态、agent 输出收敛成产品面

### Planning Notes

- `docs/operations/v0.5-research-and-execution-backlog.md` 是研究与执行 backlog
- `docs/operations/v0.5-implementation-index.md` 是实施入口
- `docs/operations/v0.4-v0.5-transition-2026-04-21.md` 是过渡边界快照
- `docs/operations/requirement-promotion-and-loss-prevention.md` 是防漏需求机制

### Version Rule

未来版本进入实施前，新增需求不能只停留在对话和候选草案里，必须至少进入以下之一：

- `version plan` 正式范围
- `backlog` 明确条目
- `candidate` 列表并附原因
- `parked / rejected` 记录并附原因

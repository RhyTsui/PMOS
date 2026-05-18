# PMOS Prompts / Skills / Agents / Tools 中文索引

- status: active
- date: 2026-05-09
- purpose: 汇总 PMOS 当前直接参与运行的 prompts、skills、agents、tools，给人读和对外整理提供统一索引

## 说明

- 这份文档优先回答“有哪些、在哪、做什么”。
- 这不是全文手册；对应中文全文见 `docs/operations/pmos-prompt-zh-manual.md`。
- 本轮已把 manager 层和 specialist 层的产品管理 prompts 全部补齐。
- 本机 local-only skill 只做登记，不把私人配置当成产品真源。

## 1. Prompt 索引

| 路径 | 英文名 / 文件名 | 中文名 | 主要用途 | 状态 |
| --- | --- | --- | --- | --- |
| `prompts/architecture_prompt.md` | architecture prompt | 架构提示词 | 约束系统边界、集成方式、非目标与架构产出 | 已落地 |
| `prompts/industry_analysis_prompt.md` | industry analysis prompt | 行业分析提示词 | 做竞品、市场、生态、开源扫描与 build-vs-buy 判断 | 已落地 |
| `prompts/prd_prompt.md` | prd prompt | PRD 提示词 | 产出 PRD、用户画像、5W2H、范围与成功标准 | 已落地 |
| `prompts/review_prompt.md` | review prompt | 评审提示词 | 组织多角色评审并产出 gate 结论、返工建议与回流目标 | 已落地 |
| `prompts/task_prompt.md` | task prompt | 任务拆解提示词 | 把范围拆成任务、依赖、验收项和交付风险 | 已落地 |
| `prompts/product-management/product_management_agent_prompt.md` | Product Management Agent Prompt | 产品管理总控提示词 | 作为 Virtual Product Chief，收拢需求、治理流程、决定调用哪些 specialist | 已落地 |
| `prompts/product-management/virtual_requirements_pm_prompt.md` | Virtual Requirements PM Prompt | 虚拟需求产品经理提示词 | 识别需求、写入需求池、维护优先级、来源与状态 | 已落地 |
| `prompts/product-management/virtual_version_pm_prompt.md` | Virtual Version PM Prompt | 虚拟版本产品经理提示词 | 管版本计划、版本记录、发布与回滚依据 | 已落地 |
| `prompts/product-management/virtual_review_pm_prompt.md` | Virtual Review PM Prompt | 虚拟评审产品经理提示词 | 汇总多视角评审，给出 gate decision、blocked items、rework targets | 已落地 |
| `prompts/product-management/virtual_workflow_pm_prompt.md` | Virtual Workflow PM Prompt | 虚拟流程产品经理提示词 | 维护 stage 输入输出、owner、handoff、delivery chain 与 gate 规则 | 已落地 |
| `prompts/product-management/virtual_delivery_pm_prompt.md` | Virtual Delivery PM Prompt | 虚拟交付产品经理提示词 | 把确认过的产品决策转成交付包、handoff 包、design delivery 包 | 已落地 |
| `prompts/product-management/virtual_retrospective_pm_prompt.md` | Virtual Retrospective PM Prompt | 虚拟复盘产品经理提示词 | 沉淀复盘、教训、流程改进与 follow-up action | 已落地 |
| `prompts/product-management/virtual_industry_research_pm_prompt.md` | Virtual Industry Research PM Prompt | 虚拟行业研究产品经理提示词 | 做行业情报、日报周报、外部变化与产品影响判断 | 已落地 |
| `prompts/product-management/virtual_user_research_pm_prompt.md` | Virtual User Research PM Prompt | 虚拟用户研究产品经理提示词 | 识别用户分层、场景、痛点、证据与需求输入 | 已落地 |
| `prompts/product-management/virtual_competitive_analysis_pm_prompt.md` | Virtual Competitive Analysis PM Prompt | 虚拟竞品分析产品经理提示词 | 做竞品对标、模式对比、差异判断与 adopt/adapt 建议 | 已落地 |
| `prompts/product-management/virtual_stakeholder_pm_prompt.md` | Virtual Stakeholder PM Prompt | 虚拟干系人产品经理提示词 | 做干系人、依赖、协作阻力与协调动作分析 | 已落地 |
| `prompts/product-management/virtual_roi_pm_prompt.md` | Virtual ROI PM Prompt | 虚拟 ROI 产品经理提示词 | 做收益、成本、风险、时机与优先级判断 | 已落地 |
| `prompts/product-management/virtual_strategy_radar_pm_prompt.md` | Virtual Strategy Radar PM Prompt | 虚拟战略雷达产品经理提示词 | 跟踪新范式、新工具、新生态并给出 adopt/watch 判断 | 已落地 |
| `prompts/product-management/virtual_roadmap_pm_prompt.md` | Virtual Roadmap PM Prompt | 虚拟路线图产品经理提示词 | 组织路线图、里程碑、依赖和阶段顺序 | 已落地 |
| `prompts/product-management/virtual_documentation_pm_prompt.md` | Virtual Documentation PM Prompt | 虚拟文档产品经理提示词 | 统一手册、说明、演示稿、同步文档与文档边界 | 已落地 |

## 2. Skills 索引

| Skill ID | 中文名 | ownerRole | 主要用途 | promptPath / 来源 | 状态 |
| --- | --- | --- | --- | --- | --- |
| `product-management-governance` | 产品治理技能 | Product Chief Agent | 产品总控、决策权、治理清单、agent 分配 | `prompts/product-management/product_management_agent_prompt.md` | integrated |
| `product-chief-manager-agent` | 产品主管理层编排技能 | Product Chief Agent | 启动 manager / specialist 层级与多 agent 参与者 | `config/product-management/agent-blueprints.json` | integrated |
| `requirement-pool-operations` | 需求池运维技能 | Requirements Manager Agent | requirement card、优先级、trace source、acceptance | `prompts/product-management/virtual_requirements_pm_prompt.md` | integrated |
| `version-repository-operations` | 版本仓运维技能 | Version Manager Agent | 版本记录、审批、artifact trace、release evidence | `prompts/product-management/virtual_version_pm_prompt.md` | integrated |
| `workflow-governance` | 流程治理技能 | Workflow Manager Agent | workflow contract、handoff、stage artifact、operator control | `prompts/product-management/virtual_workflow_pm_prompt.md` | integrated |
| `review-governance` | 评审治理技能 | Review Manager Agent | review gate、issues、blocker summary、approval recommendation | `prompts/product-management/virtual_review_pm_prompt.md` | integrated |
| `delivery-coordination` | 交付协调技能 | Delivery Manager Agent | delivery plan、runbook、handoff checklist、risk log | `prompts/product-management/virtual_delivery_pm_prompt.md` | integrated |
| `retrospective-governance` | 复盘治理技能 | Retrospective Manager Agent | retrospective、learning memo、process update | `prompts/product-management/virtual_retrospective_pm_prompt.md` | integrated |
| `competitive-analysis` | 竞品与生态扫描技能 | Industry Research Agent | ecosystem scan、competitor map、外部能力评估 | `prompts/industry_analysis_prompt.md` | integrated |
| `persona` | 用户画像技能 | Product Manager Agent | persona、stakeholder、usage scenario | `prompts/prd_prompt.md` | integrated |
| `five-w-two-h` | 5W2H 技能 | Product Manager Agent | 明确 what / why / who / when / where / how / how much | `prompts/prd_prompt.md` | integrated |
| `jobs-to-be-done` | JTBD 技能 | Product Manager Agent | 明确 trigger、desired outcome、真实 job | `docs/product-methods/jobs-to-be-done.md` | manual |
| `kano-model` | Kano 模型技能 | Requirements Manager Agent | 区分 must-have / delighter / scope warning | `docs/product-methods/kano-model.md` | manual |
| `rice` | RICE 排序技能 | Requirements Manager Agent | 做 reach / impact / confidence / effort 排序 | `docs/product-methods/rice.md` | manual |
| `north-star-metric` | 北极星指标技能 | Strategy Manager Agent | 定义北极星指标与 guardrail metrics | `docs/product-methods/north-star-metric.md` | manual |
| `system-boundary` | 系统边界技能 | Architecture Agent | 做边界、约束、架构图与非目标 | `prompts/architecture_prompt.md` | integrated |
| `schema-driven-ui-design` | Schema 驱动 UI 设计技能 | Experience Design Agent | 产出 ui-schema-spec、业务块、交互 contract | `docs/templates/ui_schema_spec_template.md` | integrated |
| `design-language-md` | DESIGN.md 设计语言技能 | Experience Design Agent | 生成项目级设计语言基线与禁忌清单 | `skills/design-language-md/SKILL.md` | manual |
| `ant-design-family-frontend` | Ant Design 家族前端技能 | Experience Design Agent | 固化 Ant Design / Ant Design X 基线、A2UI 规则与 Pro 隔离边界 | `skills/ant-design-family-frontend/SKILL.md` | manual |
| `follow-builders` | Builder 追踪技能 | Industry Research Agent | 跟踪 AI builders、播客、博客并转成情报摘要 | `~/.codex/skills/follow-builders/SKILL.md` | installed but local-only |
| `fireworks-tech-graph` | 技术图谱出图技能 | Architecture Agent | 生成架构图、流程图、时序图、SVG/PNG 图产物 | `~/.codex/skills/fireworks-tech-graph/SKILL.md` | installed but local-only |
| `frontend-skill` | 前端视觉技能 | Experience Design Agent | 出 landing page、prototype UI、demo shell | `~/.codex/skills/frontend-skill/SKILL.md` | installed but local-only |
| `task-breakdown` | 任务拆解技能 | Task Planning Agent | 任务列表、依赖、验收检查、风险 | `prompts/task_prompt.md` | integrated |
| `mvp-delivery` | MVP 交付技能 | Delivery Agent | implementation checklist、smoke evidence、release notes | `workflows/execution.md` | integrated |
| `committee-gate` | 委员会闸门技能 | Review Committee | committee report、issues、gate decision | `workflows/execution.md` | integrated |
| `demo-script` | Demo 脚本技能 | Documentation Agent | 演示脚本、讲解顺序、talk track | `workflows/execution.md` | integrated |
| `iteration-plan` | 迭代计划技能 | Iteration Agent | iteration plan、risk burn-down、follow-up backlog | `workflows/execution.md` | integrated |

## 3. Agents 索引

### 3.1 管理层与总控层

| Agent ID | 英文名 | 中文名 | 层级 | 主要职责 | Prompt |
| --- | --- | --- | --- | --- | --- |
| `product-management-agent` | Virtual Product Chief | 虚拟产品总监 / 产品总控 | supervisor | 决定调哪些 specialist、综合结论、把结论写回真源 | `prompts/product-management/product_management_agent_prompt.md` |
| `virtual-requirements-pm` | Virtual Requirements PM | 虚拟需求产品经理 | manager | 需求 intake、需求池、需求评估反馈、traceability | `prompts/product-management/virtual_requirements_pm_prompt.md` |
| `virtual-version-pm` | Virtual Version PM | 虚拟版本产品经理 | manager | 版本计划、版本记录、变更追踪 | `prompts/product-management/virtual_version_pm_prompt.md` |
| `virtual-review-pm` | Virtual Review PM | 虚拟评审产品经理 | manager | review gate、问题归因、返工指向 | `prompts/product-management/virtual_review_pm_prompt.md` |
| `virtual-workflow-pm` | Virtual Workflow PM | 虚拟流程产品经理 | manager | stage contract、handoff、delivery sequencing | `prompts/product-management/virtual_workflow_pm_prompt.md` |
| `virtual-delivery-pm` | Virtual Delivery PM | 虚拟交付产品经理 | manager | 交付包、用户材料、runbook、handoff 包 | `prompts/product-management/virtual_delivery_pm_prompt.md` |
| `virtual-retrospective-pm` | Virtual Retrospective PM | 虚拟复盘产品经理 | manager | 复盘、复发问题抽取、流程改进 capture | `prompts/product-management/virtual_retrospective_pm_prompt.md` |

### 3.2 专项 specialist 层

| Agent ID | 英文名 | 中文名 | 层级 | 主要职责 | Prompt |
| --- | --- | --- | --- | --- | --- |
| `virtual-industry-research-pm` | Virtual Industry Research PM | 虚拟行业研究产品经理 | specialist | 产业情报、日报周报、市场变化与产品影响判断 | `prompts/product-management/virtual_industry_research_pm_prompt.md` |
| `virtual-user-research-pm` | Virtual User Research PM | 虚拟用户研究产品经理 | specialist | 用户分析、场景、痛点、证据总结 | `prompts/product-management/virtual_user_research_pm_prompt.md` |
| `virtual-competitive-analysis-pm` | Virtual Competitive Analysis PM | 虚拟竞品分析产品经理 | specialist | 竞品情报、模式对比、可复用思路 | `prompts/product-management/virtual_competitive_analysis_pm_prompt.md` |
| `virtual-stakeholder-pm` | Virtual Stakeholder PM | 虚拟干系人产品经理 | specialist | 干系人分析、依赖关系、协作阻力 | `prompts/product-management/virtual_stakeholder_pm_prompt.md` |
| `virtual-roi-pm` | Virtual ROI PM | 虚拟 ROI 产品经理 | specialist | 成本收益、优先级与投入产出判断 | `prompts/product-management/virtual_roi_pm_prompt.md` |
| `virtual-strategy-radar-pm` | Virtual Strategy Radar PM | 虚拟战略雷达产品经理 | specialist | 新模式、新工具、新生态 watchlist | `prompts/product-management/virtual_strategy_radar_pm_prompt.md` |
| `virtual-roadmap-pm` | Virtual Roadmap PM | 虚拟路线图产品经理 | specialist | 路线图、里程碑、阶段顺序 | `prompts/product-management/virtual_roadmap_pm_prompt.md` |
| `virtual-documentation-pm` | Virtual Documentation PM | 虚拟文档产品经理 | specialist | 手册、demo script、同步文档、知识归一化 | `prompts/product-management/virtual_documentation_pm_prompt.md` |

## 4. Tools / Connectors 索引

### 4.1 平台工具面

| 工具名 | 中文说明 | 主要用途 | 来源 |
| --- | --- | --- | --- |
| `product-chief` | 产品总控工具面 | 做 Product Chief 分析、产出治理型结果 | CLI / runtime |
| `product-agent` | 产品 agent 工具面 | bootstrap manager / specialist hierarchy | CLI / backend |
| `requirement-service` | 需求服务 | requirement card、priority、trace source | `src/core/requirementService.ts` |
| `version-registry` | 版本服务 | version entry、approval、artifact trace | `src/core/versionRegistry.ts` |
| `workflow-engine` | 流程引擎 | stage、handoff、artifact、run 运行 | `src/core/workflowEngine.ts` |
| `review-committee` | 评审委员会 | review report、issue、gate decision | `src/core/reviewCommittee.ts` |
| `Hermes` | 治理与闭环层 | freshness、compare、promote、watch、writeback、closure | `src/core/hermesPolicyService.ts` |
| `Task SSOT` | 任务真源层 | task / stage / gate / artifact / assignment 统一结构 | runtime mainline |
| `SchedulerRun` | 调度运行时 | 自动续跑、resume、blocked reason、retry | runtime mainline |
| `proof-of-work` | 交付证据层 | final-state、artifact、gate summary、receipt summary | backend / runtime |

### 4.2 外部连接器

| Connector | 中文名 | 当前用途 | 当前状态 |
| --- | --- | --- | --- |
| `Notion` | Notion 文档连接器 | inbox digest、文档同步、知识页回写 | 已接通，page-mode 已验证 |
| `Figma` | Figma 连接器 | 检查设计文件、列团队项目 | 接口已做，token 当前失效 |
| `Web page fetch` | 网页抓取连接器 | 抓网页并写入 `docs/sources/inbox/` | 已实现 |
| `DingTalk AI meeting notes` | 钉钉会议纪要连接器 | 导入会议纪要并做文档归一化 | 手工导入可用 |
| `GitHub push / CI artifact` | GitHub 发布连接器 | 推送仓库、看 Actions artifact | 已验证 |
| `Dataki` | Dataki 知识连接器 | 知识库检索、系统状态 grounding | 可用 |

### 4.3 Provider 工具

| Provider | 中文名 | 能力 | 说明 |
| --- | --- | --- | --- |
| `mock` | 本地占位模型 | `text / code / review` | 首跑与演示默认占位 |
| `anthropic` | Anthropic 提供方 | `text / code / review` | 通过 `ANTHROPIC_API_KEY` 配置 |
| `openai-compatible` | OpenAI 兼容提供方 | `text / code / review` | 自定义兼容端点 |
| `ai-studio` | Google AI Studio 提供方 | `text / code / review / text-multimodal` | 通过 `GOOGLE_AI_STUDIO_API_KEY` 配置 |

## 5. 英文提示词中文对照

| 英文名 | 中文译名 |
| --- | --- |
| Product Management Agent Prompt | 产品管理总控提示词 |
| Virtual Requirements PM Prompt | 虚拟需求产品经理提示词 |
| Virtual Version PM Prompt | 虚拟版本产品经理提示词 |
| Virtual Review PM Prompt | 虚拟评审产品经理提示词 |
| Virtual Workflow PM Prompt | 虚拟流程产品经理提示词 |
| Virtual Delivery PM Prompt | 虚拟交付产品经理提示词 |
| Virtual Retrospective PM Prompt | 虚拟复盘产品经理提示词 |
| Virtual Industry Research PM Prompt | 虚拟行业研究产品经理提示词 |
| Virtual User Research PM Prompt | 虚拟用户研究产品经理提示词 |
| Virtual Competitive Analysis PM Prompt | 虚拟竞品分析产品经理提示词 |
| Virtual Stakeholder PM Prompt | 虚拟干系人产品经理提示词 |
| Virtual ROI PM Prompt | 虚拟 ROI 产品经理提示词 |
| Virtual Strategy Radar PM Prompt | 虚拟战略雷达产品经理提示词 |
| Virtual Roadmap PM Prompt | 虚拟路线图产品经理提示词 |
| Virtual Documentation PM Prompt | 虚拟文档产品经理提示词 |
| architecture prompt | 架构提示词 |
| industry analysis prompt | 行业分析提示词 |
| prd prompt | PRD 提示词 |
| review prompt | 评审提示词 |
| task prompt | 任务拆解提示词 |

## 6. 当前缺口

- 一部分 codex skills 只在本机可见，不适合作为 PMOS 产品仓的公开真源。
- 当前索引已经补齐全部产品管理 prompt，但还没有把每个 prompt 映射到 stage / API / UI 入口。
- 运行资产之间的调用关系还需要单独一份 runtime 关系文档。

## 7. 后续建议

- 下一步补一份 `agent / skill / tool / prompt 运行关系图文档`。
- 再补一份 `PMOS agent runtime 中文运行手册`。
- 对外发布时，把 `本机 local-only` skill 与 `产品级真源` skill 分开。
## 8. 2026-05-12 New Default Agent Lanes

To close the long-standing gap where PMOS had stronger product and design agents than implementation and testing agents, two new governed default lanes now exist:

### Fullstack Builder Agent

- role: `Fullstack Builder Agent`
- skill: `pmos-fullstack-builder`
- path: `skills/pmos-fullstack-builder/SKILL.md`
- responsibility:
  - convert governed requirement / design / UI schema outputs into runnable implementation
  - scaffold frontend mother-repos and CRUD feature packages
  - wire `api-client / service-config / mock / CI`

### Testing Acceptance Agent

- role: `Testing Acceptance Agent`
- skill: `pmos-testing-acceptance`
- path: `skills/pmos-testing-acceptance/SKILL.md`
- responsibility:
  - execute strict automated verification
  - block incomplete delivery before user review
  - provide pass/fail evidence for lint, typecheck, tests, build, and browser/runtime checks

### Architecture Designer Agent

- role: `Architecture Designer Agent`
- skill: `pmos-architecture-designer`
- path: `skills/pmos-architecture-designer/SKILL.md`
- responsibility:
  - define architecture prerequisites before builder execution
  - lock boundaries, integration seams, ownership, and ADR-level tradeoffs
  - prevent implementation from starting with unclear one-way-door decisions

### Code Review Agent

- role: `Code Review Agent`
- skill: `pmos-code-review`
- path: `skills/pmos-code-review/SKILL.md`
- responsibility:
  - run incremental code review on the current change set
  - classify blocker vs should-fix findings
  - validate architecture conformance and requirement traceability before testing acceptance

### Historical Code Review Agent

- role: `Historical Code Review Agent`
- skill: `pmos-historical-code-review`
- path: `skills/pmos-historical-code-review/SKILL.md`
- responsibility:
  - audit legacy hotspots outside the current implementation diff
  - separate immediate delivery risk from non-blocking historical debt
  - generate remediation queues instead of mixing old-code debt into current diff review

### Current Completion Chain

The governed PMOS completion chain now should be read as:

1. product governance lane
2. design / UI schema lane
3. architecture lane
4. fullstack builder lane
5. code review lane
6. historical code review lane
7. testing acceptance lane

Source of truth:

- `docs/operations/pmos-fullstack-and-testing-agent-baseline.md`
- `skills/registry.json`
- `docs/operations/product-workflow-total-design.md`

## 9. 2026-05-12 Product Chief Engineering Output Templates

To make architecture and code review first-class governed outputs instead of recommendation-only text, PMOS now also ships dedicated template entry points.

### Architecture Decision Record

- output type: `architecture-decision-record`
- owner skill: `pmos-architecture-designer`
- template: `docs/templates/architecture_decision_record_template.md`
- purpose:
  - capture one-way-door decisions before implementation starts
  - make boundaries, dependencies, tradeoffs, and integration seams explicit
  - provide stable upstream refs for implementation handoff

### Code Review Brief

- output type: `code-review-brief`
- owner skill: `pmos-code-review`
- template: `docs/templates/code_review_brief_template.md`
- purpose:
  - define the review scope for the current implementation change set
  - separate blocker findings from non-blocking improvement notes
  - provide a governed review artifact before testing acceptance

### Historical Code Review Brief

- output type: `historical-code-review-brief`
- owner skill: `pmos-historical-code-review`
- template: `docs/templates/historical_code_review_brief_template.md`
- purpose:
  - capture legacy hotspot / old-code fragility outside the current diff
  - separate immediate delivery risk from non-blocking historical debt
  - generate remediation queues without replacing incremental review

## 10. 2026-05-12 PMChat Ant Design X Capability Matrix

For the benchmark-chat mainline, PMOS now carries a dedicated capability and acceptance matrix:

- doc: `docs/operations/pmchat-ant-design-x-capability-matrix.md`
- purpose:
  - define the `React + Ant Design X + Qwen` baseline
  - lock `useXChat + useXConversations + XRequest + XStream/Stream` as the default chat dataflow
  - govern `RICH`, `Streaming Chat`, `X Markdown`, `Theme`, `Playground`, and `A2UI v0.9`
  - provide a single checklist for component-by-component acceptance instead of drifting ad hoc demos
  - promote remediation follow-up into roadmap / backlog tracking instead of leaving it only inside the review document

### Active Dependency Chain

The current engineering output chain should be read as:

1. `architecture-decision-record`
2. `code-review-brief`
3. `implementation-handoff`
4. `historical-code-review-brief` for hotspot / legacy follow-up when triggered
5. `testing acceptance evidence`

Source of truth:

- `src/core/productChiefService.ts`
- `docs/templates/architecture_decision_record_template.md`
- `docs/templates/code_review_brief_template.md`
- `docs/templates/workflow_handoff_template.md`

# Design Image2 Prompt Pack

## Design Scope

- project: PMOS
- version: v1.0
- design objective: 重画一张更高级、更少废话、更强调自动化与质量机制的中文全景海报
- target users: 管理层、合作方、GitHub 外部读者、内部产品与研发团队
- scenario summary: 用于高层汇报、宣传发布、GitHub 展示，不再像普通产品流程说明图

## Page Inventory

| Priority | Page Name | Goal | Scenario | Page Mode | Output Needed |
| --- | --- | --- | --- | --- | --- |
| P0 | PMOS v1.0 运行机制全景海报 | 讲清 PMOS 如何自动推进、治理质量、回写真源、持续协作 | 汇报 / 宣传 / GitHub 发布 | promo | 16:9 高级中文海报 |

## Page-by-Page Prompt Pack

### Page 1

- page name: PMOS v1.0 运行机制全景海报
- page goal: 从“能力总览图”升级为“运行机制总览图”，少讲常规产品流程，多讲自动化、质量、治理和持续运行
- target user / scenario: 面向管理层汇报、产品品牌宣传、对外发布
- page mode: promo
- on-page explanatory copy policy: 只保留高价值短文案，不写大段说明，不堆常识步骤
- information hierarchy: 标题区 > 中央机制核心 > 六大能力层 > 下部辅助闭环 > 价值主张
- key sections: 标题、中心核心、六大层、企业 grounding、人机协作、底部精简闭环、价值主张
- primary actions: 让读者理解 PMOS 的价值来自“自动推进 + 质量治理 + 回写约束 + 外部同步 + 长链续跑”
- visual direction: 明亮但克制的高级科技海报，浅底渐变、精细玻璃卡片、细腻发光边、成熟品牌感、发布级信息设计
- layout constraints: 全中文；16:9；高级感强；不幼态；不 Q 版；不写满普通流程词；核心机制必须大于辅助步骤
- required components: 状态引擎、上下文注入、Task SSOT、统一 Gate Runtime、Autonomous Scheduler、L0-L3 协作等级、Pipeline Launcher、回写契约、External Sync Outbox、企业知识 grounding
- style limits / prohibited traits: 禁止 Q 版头像、禁止可爱 mascot、禁止儿童感、禁止暗黑赛博朋克、禁止低清文字、禁止廉价渐变、禁止常规 PPT 表格味
- production content rule: 全中文为主，允许极少量英文机制名与品牌名混排，如 Task SSOT、Pipeline Launcher、External Sync Outbox
- `image2` main prompt: Create a premium 16:9 Chinese infographic launch poster for “PMOS v1.0”. This is not a generic product workflow chart. It must explain how PMOS automates and governs product delivery with quality, continuity, and truth-source discipline. Use a refined bright background with soft white-to-ice gradients, subtle blue-violet glow, elegant glassmorphism cards, precise micro-lines, premium spacing, and sharp typography. The style should feel mature, high-end, strategic, detailed, and publication-ready. No chibi, no mascot, no childish style. At the top center show: “PMOS v1.0”, subtitle “产品操作系统”, and one line: “让产品从意图进入可自动推进、可质量治理、可持续交付的运行机制”. In the exact center create the main mechanism core, not just a decorative circle. The center must clearly highlight these 5 mechanisms as the true core: “状态引擎”, “上下文注入”, “Task SSOT”, “统一 Gate Runtime”, “Autonomous Scheduler”. Each of these should have a short premium sub-label: 状态引擎 for runtime state control, 上下文注入 with “系统现状 / 历史决策 / 当前目标”, Task SSOT with “任务 / 状态 / 证据 / 同步主存”, 统一 Gate Runtime with “规则拦截 / 放行 / 打回 / 升级”, Autonomous Scheduler with “重试 / 恢复 / 长链续跑”. Around the core build six numbered capability zones with elegant large number markers and concise content: 01 战略认知层, 02 工作流治理层, 03 Agent 协作运行层, 04 自动化交付运行层, 05 知识沉淀层, 06 外部同步与协作层. These zones should not explain basic product steps. They should emphasize high-value mechanisms. In 03 add a very visible module “L0-L3 协作等级” to show layered collaboration protocol. In 04 add a visible module “Pipeline Launcher” with sub-label “命中成熟链路自动起跑”. In 02 or 05 add a visible module “回写契约” with sub-label “未回写真源不算完成”. In 06 add a visible module “External Sync Outbox” with sub-label “Notion / GitHub / Dataki / Figma 异步出口”. Also show enterprise grounding in a refined lower-middle band with concise labels such as 企业知识内置, 会议记录, 战略规划, 产品历史, 业务知识, and show that all of them feed the runtime as governed context rather than static storage. Add a concise human-and-agent collaboration strip showing 人类角色, Agent 团队, 协作共识, but keep it mature and abstract, no characters. At the bottom use a very short auxiliary loop only: 洞察, 规划, 需求, 设计, 开发, 验证, 交付, 回写, 同步, 续跑. This bottom loop must be visually secondary. Add a bottom value band titled “PMOS v1.0 价值主张”, with concise benefit statements emphasizing 自动起跑, 质量治理, 长链续跑, 真源回写, 外部异步同步. The whole composition must feel like a next-generation operating mechanism overview, not a checklist of modules. Strong hierarchy, fewer words, higher value density, rich detail, clear readability, premium Chinese typography, launch-poster quality.
- optional negative prompt: no chibi, no cartoon avatars, no mascot, no childish style, no dark cyberpunk, no busy tiny text, no generic workflow chart, no low-resolution typography, no cheap 3D icons, no cluttered boxes
- notes for regeneration: 如果再出现常规流程堆字，继续减少底部闭环权重，把中央五机制和四个新增机制做得更大；如果还不够高级，就加强版式留白、细线、玻璃层次和标题气场

# Design Image2 Prompt Pack

## Purpose

- 将 `docs/sources/inbox/PMOS_v1_0_深色AIOS全景图设计文档.docx` 收敛为一张可用于汇报、宣传和 GitHub 发布的主视觉全景图。
- 图的重点不是罗列模块，而是表达 `PMOS 如何把 Product Intent 转化为 Governed Delivery Reality`。
- 本次只生成 1 张 P0 宣传主图。

## Design Scope

- project: PMOS
- version: v1.0
- design objective: 输出一张深色 AI OS 全景蓝图主视觉，体现 PMOS 的战略认知、治理运行时、自治交付、知识 grounding 与多项目长周期协同能力
- target users: 管理层、潜在合作方、GitHub 外部读者、内部产品与研发团队
- scenario summary: 用于版本汇报、能力宣传、仓库首页发布与对外介绍

## Page Inventory

| Priority | Page Name | Goal | Scenario | Page Mode | Output Needed |
| --- | --- | --- | --- | --- | --- |
| P0 | PMOS v1.0 深色 AIOS 全景图 | 用一张图讲清 PMOS 如何从产品意图驱动到治理化交付现实 | 汇报 / 宣传 / GitHub 发布 | promo | 16:9 横版深色主视觉信息图 |

## Page-by-Page Prompt Pack

### Page 1

- page name: PMOS v1.0 深色 AIOS 全景图
- page goal: 生成一张具有系统控制平面气质的深色信息图，让读者第一眼理解 PMOS 是 AI Native Product Operating System，而不只是 AI coding tool
- target user / scenario: 面向管理者汇报、品牌宣传物料和 GitHub 首页展示
- page mode: promo
- on-page explanatory copy policy: 只保留少量高价值英文标题与标签，避免大段说明文字
- information hierarchy: 顶部标题区 > 中央 Runtime Core > 左右六大能力域 > 底部 Autonomous Delivery Loop > 最底部价值主张
- key sections: 顶部标题、中央状态引擎与 Hermes Governance Ring、左侧战略认知与工作流治理、右侧自治运行时/产品交付/知识记忆/部署协作、底部闭环、底部价值主张
- primary actions: 让读者快速建立“这是一个受治理的 AI 产品运行时操作系统”的认知
- visual direction: 深色 AI Runtime Blueprint、OpenAI/Anthropic 式系统图、Linear/Vercel 风格的冷静发光控制平面
- visual direction: 深空控制平面主视觉，中心发光治理环，外围玻璃态能力面板，兼具系统蓝图的可信度与品牌海报的发布感
- layout constraints: 16:9 横版；中心强聚焦；左右对称但不呆板；信息块分层清晰；不能做成普通 PPT 框图
- required components: Runtime Flow、Governance Ring、DAG Graph、Knowledge Graph、Human ↔ AI Collaboration、Browser/API/Design 联动、Enterprise Knowledge Streams、Multi-project Runtime
- style limits / prohibited traits: 禁止白底、禁止传统拓扑图、禁止廉价霓虹赛博朋克、禁止满屏小字堆砌、禁止普通流程箭头
- production content rule: 标签以英文为主，允许少量关键中文副标题，但必须保持高级、清晰、可读
- `image2` main prompt: Create a premium 16:9 widescreen dark-mode hero infographic poster for “PMOS v1.0”, an AI Product Operating System. Choose an original visual style: deep-space control plane meets enterprise launch poster. It should feel like a strategic AI operating system panorama, not a generic architecture slide, not a cluttered blueprint, and not flashy cyberpunk. Use a luxurious dark navy to indigo background with subtle neural textures, faint signal streams, runtime particles, layered glass panels, and restrained luminous edges. At the top center, show the title “PMOS v1.0”, subtitle “AI Product Operating System”, and the tagline “From Product Intent to Governed Delivery Reality” in sharp, elegant, highly legible typography. In the center, create a powerful glowing “State Engine” core surrounded by a semi-transparent orbital “Hermes Governance Ring” carrying five governance signals: Review, Traceability, Proof, Audit, Safety. Around the center, distribute clean high-end system nodes such as Workflow Kernel, Task SSOT, SchedulerRun, and Gate Runtime. Build the left side as two elevated capability constellations: “Strategic Cognition” and “Workflow Governance”. Build the right side as four elevated capability constellations: “Autonomous Agent Runtime”, “Product Delivery Runtime”, “Knowledge & Memory”, and “Deployment & Collaboration”. Show each domain with selective refined labels rather than too many tiny words, using only the most important readable labels: Product Chief, Product Manager Agents, Deep Research, Intent Amplifier, Requirement Intelligence, Review Gate, DAG Impact Graph, Multi-Agent Collaboration, Skill Runtime, Frontend Generation, Backend API, Browser Verification, Dataki Grounding, Knowledge Graph, Daily Distillation, GitHub Sync, Release Readiness, Product Repo. Visualize enterprise grounding as live meeting streams, strategy surfaces, product history signals, and business knowledge flows entering the knowledge runtime. Visualize long-running multi-project operation as several parallel project streams converging into the central runtime. At the bottom, add a sleek autonomous delivery loop ribbon with readable stages: Research, Planning, Requirement, Function, Design, API, Task, Implementation, Verification, Review, Proof, Deployment, Knowledge Sync, Continuation, plus a small note “Governed by Hermes”. At the very bottom, place the value line “Governed Autonomous Product Delivery Runtime”. Use PMOS Blue #4F7CFF, AI Purple #7B61FF, Data Cyan #3CCBFF, Governance Indigo #5B6EFF, with strong hierarchy, premium clarity, restrained glow, crisp typography, strategic composition, and publication-ready finish for executive reporting, marketing, and GitHub launch.
- optional negative prompt: no white background, no cartoon style, no chaotic cyberpunk, no low-resolution text, no cluttered tiny labels, no generic flowchart arrows, no cheap 3D icons, no excessive lens flare, no watermark
- notes for regeneration: 如果首版文字过多或发糊，优先减少小标签数量，保留标题、核心环、六大域名称和底部闭环；如果首版偏 PPT，则增加 runtime glow、signal streams、glass panels 和 control-plane density

## Generation Order

1. 先生成 P0 主图。
2. 若首图文字过密，则做“降字数、保结构”的单点再生。
3. 如需适配 GitHub 封面，可再裁一版更少字的 hero 版。

## Acceptance Checklist

- 生成结果必须是深色 AI OS 主视觉，而不是普通架构图。
- 中央 Runtime Core 与 Governance Ring 必须是第一视觉中心。
- 必须能看出六大能力域与企业知识 grounding、多项目长周期运行。
- 必须包含底部 Autonomous Delivery Loop。
- 画面必须适合汇报页首屏、宣传物料和 GitHub 发布封面。

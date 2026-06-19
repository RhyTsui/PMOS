# ad

`ad` 是 PMAIOS `v0.7` 新交付链在子项目上的首个 rollout 测试项目，当前承载对象为 `小乔智投`。

当前默认目标不是继续维护旧的 Android integration PoC，而是把小乔智投收口成一套可直接进入 `aiocoding` 的交付级产品真源与工程骨架。

## 当前有效范围

- 产品对象：`小乔智投`
- 业务域：广告支持 / 投放协同 / 数据排查 / 联调执行
- 前端形态：面向用户的交付级动态页面，不接受示意页、平铺说明页、静态文档页
- 后端形态：本地仓内 runtime + 正式 mock contract 承接，后续可切测试/生产数据源

## 当前有效交付链

`调研文档 -> 规划文档 -> 需求文档 -> 功能文档 -> 设计文档 -> 前端页面 -> 数据表 -> 后端接口 -> 联调与验收`

补充要求：

- 不再使用 `前端页面（简单版） -> 前端页面（UI/UX版）` 双阶段口径
- `前端页面` 必须一次性按交付标准产出
- 评审时必须检查布局正确性、功能模块合理性、用户体验流程、动态交互承接

## 当前有效真源入口

优先阅读以下文档：

1. [ENTERPRISE_AI_CHAT_OS_SPEC.md](./docs/architecture/ENTERPRISE_AI_CHAT_OS_SPEC.md)
2. [00_SPEC_INDEX.md](./docs/architecture/00_SPEC_INDEX.md)
3. [MASTER_SPEC.md](./MASTER_SPEC.md)
4. [NEXT_IMPLEMENTATION_PLAN.md](./NEXT_IMPLEMENTATION_PLAN.md)
5. [智投Chat-前端自主渲染与色彩字体系统-2026-05-27.md](./docs/review/智投Chat-前端自主渲染与色彩字体系统-2026-05-27.md)
6. [data-visualization-ux.md](./docs/architecture/interaction-system/data-visualization-ux.md)
7. [ui-guardrail.md](./docs/operations/ui-guardrail.md)
8. [小乔智投-交付总控-2026-05-08.md](./docs/小乔智投-交付总控-2026-05-08.md)
9. [小乔智投-前置文档评审委员会清单-2026-05-08.md](./docs/小乔智投-前置文档评审委员会清单-2026-05-08.md)
10. [小乔智投-开发任务拆解与技术评审-2026-05-08.md](./docs/小乔智投-开发任务拆解与技术评审-2026-05-08.md)
11. [小乔智投-v0.7-rollout-to-aiocoding-2026-05-09.md](./docs/小乔智投-v0.7-rollout-to-aiocoding-2026-05-09.md)
12. [小乔智投-autonomous-delivery-run-测试方案-2026-05-09.md](./docs/小乔智投-autonomous-delivery-run-测试方案-2026-05-09.md)

## Execution Layer

正式三层入口：

```text
Enterprise AI Chat OS
  -> docs/architecture/00_SPEC_INDEX.md
  -> docs/architecture/01_EXECUTION_LAYER_INDEX.md
  -> frontend/src/src/contracts/{validation,adapters,observability,examples,__tests__}
```

## Backend

> **注意：** Python 后端 (`src/ad/`) 为历史遗留原型（Ads Flow Insight PoC），当前主链路全部在 Next.js API Routes，无需启动 Python 后端。

如需运行旧原型（不推荐）：

```bash
pip install -e .
ad
```

## Frontend

在 `subprojects/ad/frontend/src/` 下：

```bash
pnpm install
pnpm dev
```

前端默认运行在 `http://0.0.0.0:8002`。

## 当前前端要求

- 企业系统基础组件：`Ant Design`
- 会话/Chat 组件：`Ant Design X`
- 企业级 AI Chat OS 以 `docs/architecture/ENTERPRISE_AI_CHAT_OS_SPEC.md` 为顶层地图；Unified Semantic Contract 是最终业务结果的唯一语义渲染协议，Runtime Display Protocol 是运行态展示协议
- 二级规范索引以 `docs/architecture/00_SPEC_INDEX.md` 为准；前端 contract 类型真源位于 `frontend/src/src/contracts`
- 会话结果按 SemanticResultContract / Result / Timeline / MessagePart 协议自主渲染，不从自然语言正文反推业务状态
- Data Visualization UX、AI Runtime UI、AI Trust UX 都是 Enterprise AI Chat OS 下的子域，不得新增平行总协议
- 字体、色彩、背景、Ant Design token 和硬编码治理以 2026-05-27 设计系统文档为准
- 禁用默认 `hero + summary-card + explanation-first` 工作台骨架
- 必须围绕真实业务对象、真实任务状态、真实结果结构建页面

## 文档治理说明

- 原有旧口径、乱码口径、示意性交付文档不得继续作为新开发真源
- 旧文档如仍需保留，按 `superseded / archived` 视角看待
- 后续修改优先回写原真源，不再新增同义补丁文档




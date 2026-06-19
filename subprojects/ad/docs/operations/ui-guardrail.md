# 小乔智投 UI Guardrail

- status: active
- applies-to: 首页、我的资产、需求沟通、自动联调、问题排查、报告、AI 助手、用户可见管理入口
- enterprise-os: `docs/architecture/ENTERPRISE_AI_CHAT_OS_SPEC.md`
- spec-index: `docs/architecture/00_SPEC_INDEX.md`
- execution-layer: `docs/architecture/01_EXECUTION_LAYER_INDEX.md`
- design-system: `docs/review/智投Chat-前端自主渲染与色彩字体系统-2026-05-27.md`
- last-updated: 2026-06-11

## 核心判断

小乔智投不是传统后台系统。默认页面形态必须是：

`会话入口 -> 任务上下文 -> 证据 / 资产 -> 建议动作 -> 带回对话或继续处理`

如果一个页面看起来像“筛选区 + 指标卡 + 表格”，但没有会话承接、任务目标、证据来源和下一步动作，它就是错误方向。

## 设计约束

- 不做 Ant Design Pro dashboard，除非任务明确是后台管理页。
- 不做营销首页、功能介绍墙、海报式卡片墙。
- 不用“为了展示而展示”的指标卡；每个区块必须服务于用户正在处理的任务。
- 不把工程名、接口名、schema、mock、联调状态等词放到用户页面。
- 不允许乱码作为可交付状态。
- 不在 UI 组件、renderer、输入区推荐、页面状态或兜底逻辑里写业务 if/else；业务差异必须来自 SemanticResultContract、ActionContract、Capability/Tool Contract、Admin 配置或受治理的组件绑定。
- 不新增绕开 Enterprise AI Chat OS 的平行 UI 协议、私有 schema 或长期 fallback；旧字段兼容只能作为局部 adapter，必须可追溯到统一契约。

## 组件契约

默认组件体系：

- 会话输入与承接：Ant Design X `Sender` / 现有等价输入组件
- 会话建议与快捷动作：Ant Design X `Prompts` / `Actions`
- 会话结果：`Bubble` / X Markdown / 现有消息渲染器
- 资产或文件：`Attachments` 语义或等价资产引用组件
- 结构化结果：动态卡片、侧边面板、抽屉或内联结果面板
- 基础筛选、按钮、菜单：Ant Design 或本地等价封装

组件使用规则：

- 筛选和列表必须回答“用户要处理什么、如何继续”。
- 右侧或底部动作区必须说明选中项会去哪里。
- 资产、证据、结论必须显示来源或更新时间。
- 高风险动作必须带确认、审批或审计语义。
- 会话结果必须按 Result / Timeline / MessagePart 或旧字段兼容回退渲染，不得从自然语言正文反推业务状态。

## Enterprise AI Chat OS 契约边界

新增 UI、renderer、结果卡或运行态展示时，必须先判断归属：

- 最终业务结果进入 Unified Semantic Contract / SemanticResultContract。
- 运行过程进入 Runtime Display Protocol。
- 具体展示形态只能挂到 `regions[].componentBinding`。
- 二级规范和前端类型真源必须能追溯到 `docs/architecture/00_SPEC_INDEX.md` 与 `frontend/src/src/contracts`。
- Data Visualization UX 只能作为 `componentBinding = "data-visualization"` 的子规范。
- AI Runtime UI 只能作为 Runtime Display Protocol 的展示规范或 `componentBinding = "ai-runtime"` 的子规范。
- 用户动作统一走 ActionContract。
- 结论、洞察、风险、建议统一挂 EvidenceRef / SourceRef。
- 页面状态、推荐动作、输入区上下文和右侧披露不得承载隐藏业务路由；不得用 UI 文案反推业务事实或工具执行结果。

不得新增 `Visualization OS`、`Runtime UI OS`、`Report UI Protocol`、`Agent UI Schema` 等平行总体系；旧 `ReportQueryViewModel`、`MetricExplainerUISchema`、`VizSpec` 只能作为兼容输入或局部 data shape。

问数趋势展示修复是当前受保护链路：趋势类结果优先图表，明细类优先表格；少于 2 个有效日期点时只能展示数据不足和下一步动作，不得伪造趋势结论。规范补全、renderer 注册或类型迁移不得覆盖该行为。

## UISchema 要求

所有新用户页面必须先有 UISchema / golden schema，再实现 React。

必须声明：

- `screenId`
- `screenType`
- `layout.desktop`
- `layout.mobile`
- `regions`
- `sourceRefs`
- `evidenceRefs`
- `lastUpdatedAt`
- `recommendedActions`
- 空态、加载、错误、权限状态的处理原则

没有专属截图时，必须在 `sourceRefs` 里记录所采用的最近视觉参考图。

## Review 清单

交付前逐项检查：

1. 主结构是否仍是会话或任务工作台，而不是后台 dashboard？
2. 页面是否有明确的用户目标和下一步动作？
3. 是否有 UISchema / golden schema？
4. 是否引用了规范与参考截图？
5. 是否覆盖空态、加载、错误、权限、移动端？
6. 是否没有工程黑话、内部接口词和乱码？
7. 是否没有新增分散的硬编码色值；智投 Chat 色彩是否引用 `src/lib/zhitou-chat-colors.ts` 或 Ant Design 主题 token？
8. 是否遵守 `docs/review/智投Chat-前端自主渲染与色彩字体系统-2026-05-27.md` 的字体、色彩和前端自主渲染口径？
9. 是否遵守 `docs/architecture/ENTERPRISE_AI_CHAT_OS_SPEC.md` 的 Result Plane / Runtime Plane / Component Binding 分层？
10. 是否没有在 UI、renderer、输入区推荐或 fallback 中新增业务硬编码、业务 if/else 或平行协议？
11. 是否通过 `npm run ui:schema:check`、`npm run ui:lint`；可用时通过 `npm run validate`？

任一项不满足，结论只能是 `partial` 或 `unsolved`，不能写成已完成。

## 本仓库执行命令

在当前运行前端 `frontend/src` 内改页面后，至少运行：

```bash
npm run validate:ad-ui
```

若改动的是历史导入项目 `imported/projects`，也必须在对应项目目录运行同名或等价脚本，并说明它不是当前 `8002` 运行真源。

该命令会执行：

- `ts-check`：确认页面和组件类型可编译
- `ui:guardrail`：扫描非后台用户页面，阻断传统后台词汇、Pro Dashboard 范式、缺少 golden schema / guardrail 引用等问题
- 编码审查：用户可见源码、文档片段、golden schema 不得出现常见 GBK/UTF-8 错读片段或替换字符（如 U+951B、U+9428、U+6D93、U+7EDB、U+FFFD）；终端显示错读需与文件本体乱码区分。

若改动涉及全局 PMOS schema，还需要在仓库根目录运行：

```bash
npm run ui:schema:check
npm run ui:lint
```

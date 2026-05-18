# 小乔智投 UI Guardrail

- status: active
- applies-to: 首页、我的资产、需求沟通、自动联调、问题排查、报告、AI 助手、用户可见管理入口

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
7. 是否通过 `npm run ui:schema:check`、`npm run ui:lint`；可用时通过 `npm run validate`？

任一项不满足，结论只能是 `partial` 或 `unsolved`，不能写成已完成。

## 本仓库执行命令

在 `imported/projects` 前端内改页面后，至少运行：

```bash
npm run validate:ad-ui
```

该命令会执行：

- `ts-check`：确认页面和组件类型可编译
- `ui:guardrail`：扫描非后台用户页面，阻断传统后台词汇、Pro Dashboard 范式、缺少 golden schema / guardrail 引用等问题

若改动涉及全局 PMOS schema，还需要在仓库根目录运行：

```bash
npm run ui:schema:check
npm run ui:lint
```

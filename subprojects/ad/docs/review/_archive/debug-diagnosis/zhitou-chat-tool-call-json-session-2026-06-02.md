# 智投 Chat 工具调用 JSON 展示修复会话沉淀 2026-06-02

本文件记录本轮围绕右侧“过程与依据 / 工具调用”详情展示的修复，便于后续恢复上下文和回溯验证口径。

## 背景

用户反馈本轮并非自动化任务开发，而是要继续解决工具调用详情中 JSON 展示不清楚的问题。当前工作区同时存在自动化任务相关残留改动，本轮提交需要排除这些残留，只收口工具调用展示修复。

## 定位结论

- 问题集中在 `ToolCallsTab` 的请求参数和返回参数展示。
- 旧逻辑只能处理普通对象或一层 JSON 字符串，遇到多层转义 JSON、文本中夹带 JSON 片段时会显示成难读的转义字符串。
- 日志文本里的普通方括号，例如 `[step]`，不能被误判为 JSON 数组并影响后续真实 JSON 片段解析。

## 修改点

- 将工具调用 payload 格式化逻辑从 `ToolCallsTab` 拆出到独立模块 `tool-call-payload-format.ts`。
- 支持普通对象、数组、JSON 字符串、多层转义 JSON 字符串、普通文本中夹带 `{...}` 或 `[...]` 的片段格式化。
- 修复片段扫描游标，保证非 JSON 方括号前缀不会吞掉后续文本。
- 新增专项自测脚本 `tool-call-payload-format-self-test.ts`，覆盖典型输入形态。

## 验证

已执行：

```bash
npm.cmd exec -- tsx scripts/tool-call-payload-format-self-test.ts
npm.cmd run ts-check
npm.cmd run ui:guardrail
npm.cmd run build
```

结果：全部通过。

## 提交边界

本轮应纳入提交：

- `frontend/src/src/renderers/disclosure/ToolCallsTab.tsx`
- `frontend/src/src/renderers/disclosure/tool-call-payload-format.ts`
- `frontend/src/scripts/tool-call-payload-format-self-test.ts`
- 本会话沉淀文档
- `docs/review/智投chat-版本记录表-2026-06-01.md`

本轮不纳入提交：

- 自动化任务中心、自动化执行接口、自动化草稿、定时任务执行链路相关改动。
- 其它未确认属于本轮工具调用展示修复的残留改动。

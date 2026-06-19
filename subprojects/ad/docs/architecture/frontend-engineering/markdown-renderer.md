# Markdown Renderer

> Scope: `markdown-result`

## 目标

正文只负责自然语言内容，不承载图表、表格、动作或过程信息。

## 建议能力

- 标题、段落、列表
- 表格
- 代码块
- 链接
- 引用
- 流式文本节奏

## 规则

1. 只消费正文类数据。
2. 不直接渲染 raw tool call 或 runtime trace。
3. 代码块、表格、引用样式由统一 Markdown 基座处理。


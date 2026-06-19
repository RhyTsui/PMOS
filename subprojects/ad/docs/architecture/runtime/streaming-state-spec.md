# Streaming State Spec

> Scope: 流式输出展示

## 说明

流式展示只负责“正在生成”的视觉节奏，不负责业务解释。

## 状态

- `loading`
- `partial`
- `done`
- `failed`
- `paused`
- `recovered`

## 规则

1. 流式正文使用统一 Markdown 基座。
2. 流式过程中布局不得频繁跳动。
3. 异常中断必须有明确恢复态或错误态。


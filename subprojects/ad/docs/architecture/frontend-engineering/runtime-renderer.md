# Runtime Renderer

> Scope: `ai-runtime` and `workflow-trace`

## 目标

展示运行过程的摘要、步骤和异常，但不把过程塞进正文。

## 规则

1. 默认只显示摘要。
2. 详细 trace 默认折叠。
3. Retry / approval / recovery 仍然是 runtime 层，不回写业务正文。


# Execution Mode

这个 skill 采用“一个主入口 + 平台分支 references”的执行方式。

执行顺序：

1. 先在 `SKILL.md` 里完成参数收集、工具调用顺序和停止条件判断。
2. 只有在需要解释稳定业务概念时，才读取 `concepts.md`。
3. 只有在平台已经明确后，才读取对应的 `android-branching.md` 或 `ios-branching.md`。

约束：

- 不要同时加载 Android 和 iOS 两份分支文档，除非当前任务是在比较两套口径。
- 优先直接调用顶层 MCP 工具，不依赖 module runner 或 catalog wrapper。
- skill 中出现的工具必须能在 MCP 原生 `tools/list` 找到；找不到时先停下来检查暴露状态。
- 常改的编排提示只维护在 `SKILL.md`，稳定概念和平台经验放在 `references/`。

# PMOS v1.0 发布前代办清单

- date: 2026-05-09
- status: active
- scope: product-repo release prep

## 当前发布判断

- `preview / internal beta`：`ready`
- `public v1.0`：`ready`

## 已关闭事项

1. 真实第二设备完整验证：已验证，不再作为发布阻塞。
2. `Notion -> Dataki -> agent retrieval` 闭环：已验证，不再作为发布阻塞。

## 当前高优先级代办

1. 继续把母仓最新 `v1.0` 真源 patch-sync 到 `product-repo`。
2. 继续精炼 `README`、`operator guide` 和对外产品说明。
3. 继续补运行资产之间的调用关系说明。

## 文档代办

1. README 继续压缩成更适合 GitHub 首页的入口文案。
2. operator guide 继续强调“先看什么、怎么排障、怎么回写真源”。
3. 把 prompts / skills / agents / tools 的运行关系补成单独文档。

## Prompt / Agent 代办

1. 8 个 specialist prompt 已落地，后续继续细化内容深度。
2. 下一步补 `agent / skill / tool / prompt` 运行关系文档。
3. 继续补 stage / API / UI 与 prompt 的映射关系。

## 共享任务清理

当前共享 `mcp-context` 里仍有大量历史 `in_progress`。

这轮先处理：

1. 本轮已完成但仍未关闭的版本功能点清单任务。
2. 本轮已完成但仍未关闭的中文索引与中文手册任务。
3. 本轮已完成但仍未关闭的发布检查任务。

后续再做：

1. `product-repo` 发布准备相关历史任务清理。
2. 明显已停止的旧前端 / 子项目任务清理。
3. 需要 owner 确认的历史任务单独复核。

## 下一步最安全顺序

1. 完成这轮文档同步与任务清理。
2. 再做一轮发布前最终复扫。
3. 等母仓 `v1.0` 再有增量时继续 patch-sync。

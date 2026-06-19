# MIG-001 第二轮验收记录

- 用例编号：MIG-001
- 测试场景：天气
- 测试输入：南京本周日天气如何
- 关键能力：联网搜索
- 测试系统：http://10.236.14.27:8002/
- 会话 ID：conv-1781177058550
- Assistant 消息 ID：msg-1781177075530-5i4adm
- Trace ID：zt-chat-1781177061838-3b1a2v

## 预期

系统应通过公开联网能力获取南京天气信息，返回可读答案，并在右侧“过程与依据”中展示执行过程、工具调用、来源、质量、Prompt 和原始信息。刷新后历史消息、标题、来源和过程信息应可回放，DOM / SSE / API 不得出现乱码。

## 实际与修复

首次验证发现系统已识别到 public_web_search 候选，但运行配置为 `enabled=false`、`searchEndpoint=""`，导致回答“未配置公共网页能力”。随后通过 Admin 控制面启用真实联网搜索配置，并修复 `/api/xiaoqiao/web-search` provider：DuckDuckGo 超时时降级 Bing，天气类公开查询使用 wttr.in 公开天气源，仍统一输出 `results[]` 契约。

进一步复测发现 public web 成功链路缺少 `semantic_result`，且刷新回放进入 semantic renderer 后未显示 `answer_markdown`。已补齐 public web 的 `SemanticResultContract` 投影，并让通用 `markdown-result` renderer 读取 `answer_markdown`。

排版与运行态复核时发现右侧“执行步骤”里 `web.search` 仍停留在 `running`，虽然最终结果已完成。已改为由 public web 工具层收口 `web.search` 最终状态，成功、无结果、失败都会写入终态、完成时间和耗时，避免前端回放出现悬挂步骤。公开信息答案也改为 markdown 分段列表，右侧“过程与依据”摘要做展示层文本清洗，避免直接露出 `**` 等 markdown 标记。

窄屏左侧栏按钮复核发现曾被替换成 `<<` 或等长菜单图标。已改为内联三条长短线图标，不再依赖缺失 `/icons/*.svg` 资源，同时保持原有按钮尺寸与样式。

右侧“过程与依据”按目标态重构：去掉折叠态，仅保留关闭、展开、窄屏悬浮展开；去掉顶部副标题、概述统计区、独立数据结果和独立工具调用页签；默认展示用户可理解的执行过程，状态灯统一放在左侧并用线连接，每个步骤右侧展示耗时，工具请求/返回参数按需展开，公开来源贴到查询步骤下并可新标签页打开。最终仅保留 `执行过程`、`原始信息` 两个 tab；结果检查、质量检查和字段检查作为执行过程的一部分，仅在异常时展开具体问题，正常渲染时不再列出 `MessageSurface / answer_markdown` 等渲染子结果明细。Prompt 命中、系统运行总览、工具调用和 Trace 链接归入原始信息，作为开发者留档。窄屏专项验证显示页面级浮层从页面顶部展开，打开前后输入框宽度变化 `0`、用户消息宽度变化 `0`，不会挤压主聊天区。

刷新回放复核发现历史消息存在只在 `metadata.process_events` 保留过程事件的情况，运行态入口曾因只读取顶层 `process_events` 而不可见。已在前端读取侧兼容顶层与 metadata 两种位置，不改变 conversations/messages 接口返回格式。

## 复测结果

- 页面链路：通过
- 接口读回：通过，`message_id`、`thread_id`、`trace_id`、`semantic_result`、`answer_markdown`、来源和工具调用均可读
- 刷新回放：通过，历史消息、标题、来源、右侧过程与依据可回放
- 标题生成：通过，标题为“南京本周日天气”
- Network / Console：通过，无非预期失败和 console error
- 乱码扫描：通过，DOM / SSE / API / 控制台均无错码
- 结果排版：通过，主消息按“公开信息 / 来源”分段展示，右侧摘要无裸 markdown 标记
- 运行态收口：通过，最终消息 `pendingProcessEventCount=0`，右侧执行步骤均为终态
- 窄屏图标：通过，折叠入口为三条长短线内联图标，无缺失资源请求
- 右侧栏目标态：通过，无折叠态；仅保留 `执行过程 / 原始信息` 两个 tab；窄屏悬浮展示不挤压主消息、执行状态组件和输入框
- 接口格式：通过，本轮 UI 重组未改变 `/api/chat`、`/conversations`、`/messages` 返回结构；回放读回仍包含 `response_contract`、`semantic_result`、`process_events`、`tool_calls`、`trace_id`
- 静态门禁：`validate:ad-ui`、`check:mojibake`、`git diff --check` 通过

## 验收证据

- 基础复测报告：`docs/review/mig-001-1781177056141.json`
- 基础复测截图：`docs/review/mig-001-1781177056141.png`
- 完整回放报告：`docs/review/mig-001-full-1781177516527.json`
- 完整回放截图：`docs/review/mig-001-full-1781177516527.png`
- 窄屏悬浮右侧栏截图：`docs/review/mig-001-floating-disclosure-1781177353539.png`
- 窄屏图标截图：`docs/review/mig-001-collapse-icon-1781171641311.png`

## 风险备注

- 当前天气信息来自公开源 wttr.in，搜索 fallback 支持 Bing；后续如有企业级搜索服务，应通过 Admin public web 配置切换 provider。
- 本次未进入 MIG-002。

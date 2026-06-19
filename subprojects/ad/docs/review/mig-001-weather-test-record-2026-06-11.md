# MIG-001 第二条用例复测记录

- 用例编号：MIG-001
- 测试场景：天气
- 测试输入：南京本周日天气如何
- 预期结果：联网搜索生效，不能回答“没有联网能力”；返回天气信息、公开来源、工具调用与运行过程，并支持刷新回放。
- 实际结果：通过。页面返回南京天气摘要，API 读回有 `response_contract`、`semantic_result`、`business_summary`、`answer_markdown`、公开来源、工具调用和 web process events；右侧运行过程可打开、可关闭，Trace 菜单可打开，刷新后历史消息和运行过程可回放。
- 首轮失败原因：
  - public web 分支已有 `semantic_result`，但未在 response/workflow/message 契约中产出 `business_summary`。
  - 验收过程中浏览器曾命中过期 Next dev chunk，出现 `Application error`。清理浏览器缓存后恢复。
  - 验收脚本对右侧栏关闭和 Trace 菜单的测量时机不稳定，早于关闭动画完成。
- 修复点：
  - `frontend/src/src/app/api/chat/route.ts`：public web 分支补齐 `BusinessSummary`、`WorkflowResult` 与 `MessageContract`，并写入 response/result metadata。
  - `tmp/verify-mig001-weather.cjs`：新增第二条专用 Playwright 验收；使用 `E:\AI\ai-os\node_modules` 的 Playwright；执行前清理失效 chunk 缓存；按真实 DOM 状态验证运行过程关闭、Trace 菜单、右侧栏宽度、刷新回放、SSE/API/DOM/Console/Network/乱码健康。
- 复测结果：通过。
- 复测报告：`docs/review/mig-001-weather-1781193109650.json`
- 截图：`docs/review/mig-001-weather-1781193109650.png`
- 乱码扫描结果：通过，DOM、SSE、API response、Console 文本均无 mojibake 命中。
- 风险备注：本地 Next dev 环境存在旧 chunk 缓存导致登录页或刷新页短暂 `Application error` 的风险；第二条验收前已清理浏览器缓存，最终复测链路无 Network/Console 错误。

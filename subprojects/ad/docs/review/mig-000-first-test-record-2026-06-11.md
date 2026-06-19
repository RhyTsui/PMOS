# MIG-000 第一条用例复测记录

- 用例编号：MIG-000
- 测试场景：连通
- 测试输入：你好
- 预期结果：LLM 理解并给出简单回应；会话链路、契约读回、刷新回放、标题、运行过程、Network/Console、乱码扫描均健康。
- 实际结果：通过。页面展示回复“你好，我在。你可以直接告诉我想查询、分析或处理的事情。”，右侧运行过程可打开，刷新后历史消息和运行过程可回放，标题为“日常问候”。
- 首轮失败原因：接口读回中 assistant message 有 `response_contract.answer_markdown`，但普通对话分支未产出 `semantic_result` 和 `business_summary`，导致契约验收失败。
- 修复点：
  - `frontend/src/src/contracts/result-assembly/semantic-result-assembly.ts`：新增普通对话 `SemanticResultContract` 与 `BusinessSummary` 组装。
  - `frontend/src/src/lib/response-contract.ts`：让 `ResponseContract` 顶层透出 `business_summary` 与 `semantic_result`。
  - `frontend/src/src/app/api/chat/route.ts`：普通对话分支改为通过 result assembly 生成 `message_contract`、`workflow_result`、`semantic_result` 和 `business_summary`，并写入响应与消息 metadata。
  - `frontend/src/src/types/index.ts`：补齐 `ResponseContract` 类型字段。
- 复测结果：通过。
- 复测报告：`docs/review/mig-000-first-1781191059687.json`
- 截图：`docs/review/mig-000-first-1781191059687.png`
- 乱码扫描结果：通过，DOM、SSE、API response、Console 文本均无 mojibake 命中。
- 风险备注：MIG-000 是普通对话连通用例，不要求真实工具调用；本次验收确认 source/tool 字段按契约可读为空数组，未伪造来源或工具结果。后续工具链路用例需继续验证非空 source/tool disclosure。

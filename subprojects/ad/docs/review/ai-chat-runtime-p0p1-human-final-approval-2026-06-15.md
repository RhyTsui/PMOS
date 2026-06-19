# AI Chat P0/P1 Runtime 迁移人工最终确认

- approval_id: `RULE-DEBT-RUNTIME-HUMAN-FINAL-APPROVAL-20260615`
- status: `approved_with_conditions`
- confirmed_at: `2026-06-15T15:45:00.000+08:00`
- final_approver: `AD project human final approver`
- inventory_ref: `docs/review/ai-chat-rule-debt-inventory-2026-06-13.json`
- review_request_ref: `docs/review/ai-chat-runtime-p0p1-migration-review-request-2026-06-15.md`
- evidence_classification_ref: `docs/review/ai-chat-rule-debt-runtime-mig003-evidence-classification-2026-06-15.md`

## 批准范围

本次只批准以下 9 个 runtime 文件按 `approved_with_conditions` 进入治理迁移提交：

- `frontend/src/src/app/api/chat/route.ts`
- `frontend/src/src/app/api/xiaoqiao/web-search/route.ts`
- `frontend/src/src/lib/chat-answer-message-catalog.ts`
- `frontend/src/src/lib/conversation-store.ts`
- `frontend/src/src/lib/managed-prompt-seeds.ts`
- `frontend/src/src/lib/mcp-server-store.ts`
- `frontend/src/src/lib/open-answer-fallback.ts`
- `frontend/src/src/lib/public-web-runtime.ts`
- `frontend/src/src/lib/request-understanding.ts`

## 人工确认原文

我确认：作为本次 AD 项目 P0/P1 runtime 迁移的人工最终确认人，批准当前 9 个 runtime 文件按 approved_with_conditions 进入治理迁移提交。

条件是：

1. 不声明 runtime-full 完整验收通过。
2. 当前通过的 rule-debt inventory、相关单测、ts-check、git diff check 可作为本次准入证据。
3. runtime-full 大量 REVIEW、内部报表登录/权限阻断、多源公开联网失败、stale 知识库样本缺失，继续作为后续阻断项补齐。
4. 不允许把 mock/fake/fixture 当作真实通过证据。

## 准入边界

- 本确认只解除 P0/P1 runtime diff 的治理准入阻断，不代表 runtime-full 完整通过。
- `runtime_migration_gate` 元数据仍保持 blocked 策略语义，直到后续真实验收补齐并更新治理门禁。
- 真实 provider E2E 中已通过知识库命中、知识库 no-hit、公开官方来源、低相关排除；stale 样本缺失和多源公开联网失败仍为后续条件。
- 内部报表类用例存在登录/权限阻断，不能作为业务链路完整通过证据。
- 2026-06-15 追加尝试真实扫码浏览器验证：可打开 `/login?redirect=%2F` 登录页，但本轮检查窗口内仍停留在登录页，未形成登录后的真实 `/api/chat` 浏览器 E2E 通过证据。

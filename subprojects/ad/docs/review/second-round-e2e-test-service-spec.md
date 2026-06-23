# 第二轮 E2E 测试服务运行规格

本文定义 Codex 后续执行“测试”“执行测试用例”“跑用例”等请求时的默认入口。该服务只属于测试与观测工具层，不进入 `/api/chat` runtime，不作为生产路由或业务规则来源。

## 默认入口

默认使用本地 wrapper 服务执行第二轮 E2E：

```powershell
node scripts\second-round-test-client.cjs run --row <Markdown编号所在行>
```

执行规则：

1. `run` 默认先执行 `scripts\restart-second-round-test-service.cjs`。
2. restart 必须按命令行精确停止旧的 `scripts\second-round-test-service.cjs` Node 进程。
3. restart 再从当前工作区启动最新 `scripts\second-round-test-service.cjs`。
4. client 等 `/health` 可用后再提交 `/run`，禁止直接在旧 wrapper 服务上跑。
5. 只有显式传 `--no-restart` 才允许复用已有服务。

## 默认配置

默认地址：

```text
http://10.236.14.27:8002
```

默认测试集：

```text
E:\AI\ai-os\subprojects\ad\docs\review\testcase-prompts-v1.1-renumbered.md
```

默认登录态：

```text
E:\AI\ai-os\subprojects\ad\frontend\src\.auth\login-state.json
```

默认 wrapper 端口：

```text
http://127.0.0.1:8787
```

覆盖参数：

- `SECOND_ROUND_BASE_URL`：临时覆盖被测地址。
- `SECOND_ROUND_INPUT_FILE`：临时覆盖测试集；默认使用 Markdown Prompt 清单。
- `SECOND_ROUND_AUTH_FILE`：临时覆盖登录态。
- `SECOND_ROUND_SERVICE_PORT`：临时覆盖 wrapper 端口。

## 自查与自动处理

执行测试前可运行：

```powershell
node scripts\second-round-test-client.cjs check
```

自查内容：

- wrapper 服务是否可访问。
- 默认地址是否可打开。
- 默认地址打不开时，wrapper 自动在 `frontend/src` 执行 `npm.cmd run dev:clean`，使用 Turbopack 清理并启动 8002，然后复查。
- 登录态是否能访问 `/api/xiaoqiao/auth/me`。
- Markdown 测试集是否存在且能读取有效用例。

处理规则：

- 如果页面打不开，先自动启动 dev server 并复查。
- 如果仍打不开，判定为运行面失败，不执行用例。
- 如果登录态失效，返回 `loginRequired: true`，需要先扫码刷新登录态，再执行用例。
- 如果测试集不可读，判定为配置面失败，不执行用例。

## 本地 8002 默认修复路径

如果 `http://10.236.14.27:8002` 打不开，默认按以下路径处理：

1. 不按浏览器缓存或 5174/8002 混淆处理，先判定为运行面问题。
2. 使用 `frontend/src/package.json` 中的 `npm run dev:clean`。
3. `dev:clean` 由 `frontend/src/scripts/dev-server.cjs` 统一清理 8002 占用进程、清理 `.next` 并以 Turbopack 启动。
4. 停止服务使用 `npm run dev:stop`。
5. 不恢复 `frontend/src/.babelrc`；避免 Next dev 关闭 SWC 后走 Babel 冷启动卡死或退出。

## 常用命令

按 Markdown 表格行跑单条：

```powershell
node scripts\second-round-test-client.cjs run --row 22
```

按重新编号查询或运行：

```powershell
node scripts\second-round-test-client.cjs cases --q 006
node scripts\second-round-test-client.cjs run --case 006
```

查服务元信息：

```powershell
node scripts\second-round-test-client.cjs health
```

只自查不执行：

```powershell
node scripts\second-round-test-client.cjs check
```

## Codex 默认理解

后续用户只说“测试”“执行测试用例”“跑 006”“跑第 22 行”时，Codex 默认应使用上述 wrapper 服务，而不是手写长环境变量命令，也不是直接调用旧 `run-second-round-tests.cjs`。

默认测试集是 Markdown Prompt 清单；原 Excel 不再作为默认测试集。执行结果默认输出 Markdown 报告。只有显式通过 `SECOND_ROUND_INPUT_FILE` 指向 Excel 时，runner 才按 Excel 输入与 Excel 输出路径运行。

执行前仍需遵守仓库级 AI Chat OS 规则：说明运行面、配置面、观测面边界；失败归因必须区分 runner/SSE 解析误判、服务打不开、登录态失效、MCP 异常、`response_contract` 缺失和关键结果覆盖不足。

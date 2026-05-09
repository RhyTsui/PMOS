# GitHub 发布就绪检查单

## 目的

在把独立 `PMOS product repo` 发布到 GitHub 之前，用这份清单确认它已经达到“可读、可装、可跑、边界清晰”的最低发布标准。

## 边界检查

1. 不包含业务子项目主体代码。
2. 不包含原始私有 `inbox` 材料。
3. 不包含真实会话历史与隐藏运行态。
4. 不包含真实密钥、token、机器路径。
5. 不包含临时日志和本地调试残留。
6. `PMOS / subprojects` 边界已签版，不再作为当前发布阻塞。

## 工程检查

1. `npm install` 可完成。
2. `npm run lint` 通过。
3. `npm run build` 通过。
4. `npm start` 可启动。
5. `/api/health` 返回 `200`。
6. 根路径可访问。

## 文档检查

1. `README.md` 可读。
2. `docs/operations/pmaios-introduction.md` 可读。
3. `docs/deployment/first-run.md` 可读。
4. `docs/deployment/operator-guide.md` 可读。
5. `docs/deployment/environment-variables.md` 可读。
6. `docs/deployment/api-overview.md` 可读。
7. `CHANGELOG.md` 可读。
8. 真源文档明确区分 `v1.0` 与 `v0.7` 的关系。
9. prompts / skills / agents / tools 中文索引与中文手册已具备。

## 产品检查

1. 对外读者能理解 PMOS 是什么。
2. 对外读者能理解这个仓库包含什么、不包含什么。
3. 能清楚知道当前已完成什么、还会继续补什么。
4. 能清楚知道如何启动、验证和继续维护。

## 当前判断

截至 `2026-05-09`：

1. 本地静态验证：`ready`
2. 本地启动验证：`ready`
3. 第二设备验证：`ready`
4. `Notion -> Dataki -> agent retrieval`：`ready`
5. GitHub 正式发布：`ready`

## 允许发布的最低结论

如以上检查通过，可发布：

- `preview`
- `internal beta`
- `public v1.0`

## 最终复核入口

正式发仓前，统一再按这份硬清单过一遍：

- `docs/operations/github-final-verification-checklist.md`

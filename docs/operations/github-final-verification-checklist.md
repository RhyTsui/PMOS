# GitHub 发布最终核查清单

- version: `v1.0`
- date: `2026-05-09`
- status: `active`

## 用途

这份文档是 `GitHub 发布前最后一轮人工复核` 的执行清单。

## 当前结论

截至 `2026-05-09`，当前判断为：

- `preview / internal beta`：`ready`
- `public v1.0`：`ready`

## 已成立的发布基础

以下事项已具备证据，不需要重复从零判断：

1. `README / introduction / deployment / release / acceptance / changelog` 已形成发布面真源。
2. `npm install` 已通过。
3. `npm run lint` 已通过。
4. `npm run build` 已通过。
5. `npm start` 已通过。
6. `GET /api/health -> 200`。
7. `GET / -> 200`。
8. `PMOS / subprojects` 对外边界已签版。
9. 真实第二设备验证已完成。
10. `Notion -> Dataki -> agent retrieval` 闭环已完成。

## 最终必查项

### 1. 工程面

确认：

1. product-repo 可独立安装、构建、启动。
2. 健康检查和根路径可正常访问。
3. 不依赖母仓隐藏上下文才能运行。

### 2. 文档面

确认：

1. `README.md` 可作为首页入口阅读。
2. `docs/operations/pmaios-introduction.md`、`current-version-progress.md`、`v1.0-acceptance-standard.md` 口径一致。
3. `docs/deployment/first-run.md`、`operator-guide.md`、`api-overview.md` 可支撑首跑和接手。
4. prompts / skills / agents / tools 中文索引和中文手册已存在。

### 3. 边界面

确认：

1. 不包含真实业务子项目主体。
2. 不包含私有 inbox 原始材料。
3. 不包含真实密钥、token、用户路径和本地状态残留。
4. 不把本机 local-only 能力误写成产品必备能力。

## 复核输出格式

最后统一只输出这 4 项：

1. `preview / internal beta`: `pass` 或 `fail`
2. `public v1.0`: `pass` 或 `fail`
3. 当前剩余问题列表
4. 对应证据文件或缺失证据

## 当前建议

如果现在准备发仓：

1. 可以按 `public v1.0` 执行发布。
2. 继续把后续增量作为补丁同步，不必等“所有未来项都完成”。

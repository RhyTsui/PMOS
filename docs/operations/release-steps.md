# 发布步骤

## 目的

这份文档定义独立 `PMOS product repo` 的最小发布流程，目标是让发布动作可重复，而不是依赖临场判断。

## 发布前本地检查

1. `npm install`
2. `npm run lint`
3. `npm run build`
4. `npm start`
5. `/api/health` 返回 `200`
6. 根路径可访问

## 发布前仓库清理

确认以下内容不进入 GitHub：

1. `node_modules`
2. `dist`
3. `.env`
4. 私有原始材料
5. 临时日志
6. 本机专属路径说明
7. 隐藏运行态快照

## 发布前文档检查

1. `README.md` 可读
2. `docs/operations/current-version-progress.md` 可读
3. `docs/deployment/first-run.md` 可读
4. `docs/deployment/second-machine-verification-checklist.md` 可读
5. 明确哪些是已完成能力，哪些仍是后续补丁项

## 首次发布步骤

1. 初始化或确认 Git 仓库状态
2. 检查 `.gitignore` 是否覆盖依赖、构建产物和私有配置
3. 整理首版提交说明
4. 创建远程 GitHub 仓库
5. 绑定 `origin`
6. 推送 `main`

## 发布后立即要做的事

1. 回写版本说明
2. 回写当前发布状态
3. 记录缺口与后续补丁方向
4. 如果存在旧仓镜像，补一条跳转说明

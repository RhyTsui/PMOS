# Current Session Start Prompt

这是一份滚动文档。
用过以后，直接清理或覆盖成下一次要用的内容。

---

## 记录 1：AI埋点平台 v1.1 前端主链

- 触发短语：`继续 tracking-acceptance v1.1 前端主链`

### 当前有效判断

1. `v1.1` 需求真源已新增
2. 系统右上角 `需求版本切换` 已接入
3. 概览页、需求装配页、查询验证页、验收报告页都已按 `v1.1` 做主链骨架化
4. 三页已接通 `workflowContext` 跨页联动
5. `frontend` 最近一次 `npm run build` 已通过

### 下次回来先做什么

1. 把装配页里的 `模板 / 勾选 / 差异项` 变成真实上下文
2. 让查询验证页沉淀成可回写的 `查询会话`
3. 让报告页把 `推送状态 / 来源会话 / 来源装配项` 做成完整状态链

### 可直接复制的启动提示词

```md
继续 tracking-acceptance 的 AI埋点平台 v1.1 前端主链。

先按仓库恢复顺序读取：
1. docs/memory/mcp-context/session-state.json
2. npm run cli -- mcp-context events 20
3. npm run cli -- mcp-context tasks --status in_progress
4. docs/operations/startup-whoami.md
5. AGENTS.md

然后读取：
docs/context/session-start-prompts/CURRENT.md

当前有效判断：
1. v1.1 需求真源已新增
2. 右上角需求版本切换已接入
3. 概览页、需求装配页、查询验证页、验收报告页都已按 v1.1 做主链骨架化
4. 三页已接通 workflowContext 跨页联动
5. frontend 最近一次 npm run build 已通过

这次不要重复搭骨架，直接继续做真实状态流：
1. 装配页模板 / 勾选 / 差异项 -> 真实上下文
2. 查询验证页 -> 查询会话对象
3. 报告页 -> 推送状态、来源会话、来源装配项完整状态链
```

---

## 记录 2：ad 首页重做

- 触发短语：`继续整改 ad 首页`

### 当前有效判断

1. 放弃当前 `index.html` 这版展示态首页
2. 改成真正的企业操作台首页
3. 只保留三段主结构：`任务队列`、`当前处理区`、`右侧检查器`
4. 旧 `frontend` 已删除
5. 当前只剩临时首页样稿
6. 不能沿用当前形态继续小修

### 下次回来先做什么

1. 先按企业操作台信息架构重建首页主骨架
2. 不回到旧首页视觉语言和展示型布局
3. 先收住三段主结构，再补具体卡片和状态

### 可直接复制的启动提示词

```md
继续整改 ad 首页。

先看：
docs/context/session-start-prompts/CURRENT.md

当前有效判断：
1. 放弃当前 index.html 这版展示态首页
2. 改成真正的企业操作台首页
3. 只保留三段主结构：任务队列、当前处理区、右侧检查器
4. 旧 frontend 已删除
5. 当前只剩临时首页样稿
6. 不能沿用当前形态继续小修

这次不要做小修补，直接从企业操作台首页主骨架开始重做。
```

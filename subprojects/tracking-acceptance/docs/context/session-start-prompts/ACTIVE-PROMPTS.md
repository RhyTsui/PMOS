# Active Session Start Prompts

用于集中放置当前仍可直接使用的续跑启动提示词。

说明：

1. 这是一份“总入口”
2. 下次续跑时，优先先看这份
3. 具体长文档仍可保留为历史明细
4. 如果某条主线失效，应在这里同步标记 `superseded` 或 `void`

---

## 1. AI埋点平台 v1.1 前端主链

- status: `active`
- trigger: `继续 tracking-acceptance v1.1 前端主链`
- detail_doc: `docs/context/session-start-prompts/2026-05-09-v1.1-frontend-mainline-v1.md`

### 当前有效判断

1. 已新增 `v1.1` 需求真源
2. 前端已接入右上角 `需求版本` 切换
3. 概览页、需求装配页、查询验证页、验收报告页已按 `v1.1` 做主链骨架化
4. 三页已打通 `workflowContext` 跨页联动
5. 当前不要回到旧版“页面补丁”思路

### 下次优先继续

1. 让装配页的模板、勾选、差异项变成真实上下文
2. 让查询验证页沉淀查询会话对象
3. 让报告页把推送状态、来源会话、来源装配项做成完整状态链

### 可直接复制的启动提示词

```md
继续 tracking-acceptance 的 AI埋点平台 v1.1 前端主链重排。

先按仓库恢复顺序读取：
1. docs/memory/mcp-context/session-state.json
2. npm run cli -- mcp-context events 20
3. npm run cli -- mcp-context tasks --status in_progress
4. docs/operations/startup-whoami.md
5. AGENTS.md

再看：
docs/context/session-start-prompts/ACTIVE-PROMPTS.md

当前有效判断：
1. v1.1 需求真源已新增
2. 右上角需求版本切换已接入
3. 概览页、需求装配页、查询验证页、验收报告页都已按 v1.1 做主链骨架化
4. 三页已接通 workflowContext 跨页联动
5. frontend 最近一次 npm run build 已通过

本次不要重复搭骨架，直接继续做真实状态流：
1. 装配页模板/勾选/差异项 -> 真实上下文
2. 查询验证页 -> 查询会话对象
3. 报告页 -> 推送状态、来源会话、来源装配项完整状态链
```

---

## 2. ad 首页重做

- status: `active`
- trigger: `继续整改 ad 首页`
- detail_doc: `docs/context/session-start-prompts/2026-05-09-ad-homepage-redesign-v1.md`

### 当前有效判断

1. 放弃当前 `index.html` 这版展示态首页
2. 改成真正的企业操作台首页
3. 只保留三段主结构：`任务队列 / 当前处理区 / 右侧检查器`
4. 旧 `frontend` 已删除
5. 当前只剩临时首页样稿
6. 不可沿用当前形态继续小修

### 下次优先继续

1. 重新定义企业操作台首页的信息结构
2. 用三段主结构重建页面骨架
3. 把临时样稿替换为正式操作台首页

### 可直接复制的启动提示词

```md
继续整改 ad 首页。

先看：
docs/context/session-start-prompts/ACTIVE-PROMPTS.md

当前有效判断：
1. 放弃当前 index.html 这版展示态首页
2. 改成真正的企业操作台首页
3. 只保留三段主结构：任务队列、当前处理区、右侧检查器
4. 旧 frontend 已删除
5. 当前只剩临时首页样稿
6. 不可沿用当前形态继续小修

本次不要做小修补，直接从企业操作台首页骨架开始重做。
优先完成：
1. 三段主结构的信息架构
2. 企业操作台首页的页面骨架
3. 临时样稿到正式操作台首页的替换路径
```

---

## 3. 更新与作废

### 更新

如果某条主线需要升级：

1. 更新这份总文档中的对应条目
2. 如有必要，再更新对应的 `detail_doc`
3. 保留旧判断时，在条目里注明 `superseded`

### 作废

如果某条主线不再继续：

1. 将对应条目的 `status` 改为 `void`
2. 写明作废原因
3. 如有替代主线，补充新的 trigger 和 detail_doc

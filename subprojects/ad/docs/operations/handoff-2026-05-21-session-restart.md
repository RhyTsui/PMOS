# 小乔智投会话交接记录 2026-05-21

更新时间：2026-05-21 12:18:05 +08:00

## 1. 当前已推送版本

当前分支：`feature/xuyun_init`

已推送到 GitLab：

```text
c2327d9 feat(ad): add animated welcome mascot
```

这次提交只包含欢迎区小乔动画相关内容：

- `frontend/src/src/components/cognitive/ChatContainer.tsx`
- `frontend/src/src/components/cognitive/WelcomeMascotIcon.tsx`

已验证：

- `npm.cmd run ts-check` 通过
- `npm.cmd run validate:ad-ui` 通过
- 浏览器打开 `http://127.0.0.1:8002/` 检查过欢迎区动画，无控制台报错

## 2. 欢迎区小乔动画当前状态

当前已经实现：

- 欢迎区原静态 `brand-icon.png` 替换为 Canvas 版 `WelcomeMascotIcon`
- 默认先做“登场”动画
- 登场结束后进入“夏日装扮待机”
- 鼠标移入欢迎语这一整行时，切换为原始蓝色 icon，不带夏日装扮
- 鼠标移入后 icon 在欢迎语区域上方小范围巡游躲避，并带少量泡泡反馈
- 鼠标移出后回到夏日装扮待机

注意：

- 这次只接入欢迎区，不接会话任务状态、不接自动任务状态、不接缺信息阻塞状态
- 后续如果要接 `working / success / blocked`，必须先确认状态来源和影响面

## 3. 当前工作区还有未提交内容

`git status --short --branch` 显示除了已推送的欢迎区动画外，还有早前遗留的未提交内容。

这些内容没有随 `c2327d9` 一起提交，重启后不要误以为它们都是本轮 icon 改动。

修改中的文件：

```text
frontend/src/next-env.d.ts
frontend/src/src/app/api/chat/route.ts
frontend/src/src/app/api/xiaoqiao/scheduled-tasks/[id]/pause/route.ts
frontend/src/src/app/api/xiaoqiao/scheduled-tasks/[id]/resume/route.ts
frontend/src/src/app/api/xiaoqiao/scheduled-tasks/[id]/route.ts
frontend/src/src/app/api/xiaoqiao/scheduled-tasks/route.ts
frontend/src/src/lib/api.ts
frontend/src/src/lib/demo-data.ts
frontend/src/src/lib/intent-router.ts
frontend/src/src/lib/trace.ts
frontend/src/src/lib/scheduled-task-store.ts
```

未跟踪文档/原型：

```text
docs/review/小乔智投-Framer-Motion应用场景设计-2026-05-20.md
docs/review/小乔智投-Framer-Motion应用场景设计图-2026-05-20.html
docs/review/小乔智投-icon交互动画预览-2026-05-21.html
docs/review/小乔智投-icon宠物动画预览-2026-05-21.html
docs/review/小乔智投-品牌形象叙事动画Canvas原型-2026-05-21.html
docs/review/小乔智投-思维链视觉交互设计图-2026-05-20.html
docs/review/小乔智投-思维链视觉交互设计规范-2026-05-20.md
```

处理建议：

- 重启后第一步先跑 `git status --short --branch`
- 不要直接 `git add .`
- 如果要继续提交，先按需求切分：后端/自动化、报表、行业动态、设计文档、动画原型分别提交

## 4. 明确禁止误动的稳定模块

后续继续开发时，除非用户明确要求，否则不要改：

- 左侧侧边栏
- 会话顶部栏
- 新会话页整体布局和快捷入口交互
- 项目选择器
- 联调组件
- 右侧侧边栏
- 思维链组件现有结构

如果需求必须影响这些模块，先列影响点给用户确认。

## 5. 产品与交互原则

当前产品统一命名：

- 产品名：小乔智投
- 定位：AI 投放服务台

核心交互原则：

- 正文结果只放结论、可交付内容、失败原因和下一步建议
- 过程展示放在思维链、联调组件、调用与来源
- 技术请求和返回默认收起，外层用中文表达
- 进行中不生成“未生成有效回复”之类正文
- 用户缺信息时优先做简洁确认，不在正文里堆说明
- 使用生产真实 MCP / tool 结果，不把 mock 数据当业务证据

## 6. 近期未完成事项池

### 6.1 小乔动画后续

低风险后续：

- 微调登场幅度和时间，让用户更容易感知
- 微调巡游范围，避免遮挡欢迎语核心文字
- 移动端单独检查欢迎区动画是否遮挡快捷入口

高影响后续，需要先评审：

- 会话列表有任务执行中时，切换为 `working`
- 自动任务完成时，顶部悬浮成功反馈
- 缺信息/人工确认时，在会话空白区展示阻塞动画

### 6.2 报表问数生产级验收

核心目标：

- 验证报表 MCP 是否真实调用
- 验证正文数值是否和 tool 返回一致
- 清理仍然展示示例数据的问题

必测用例：

- 指间山海今天消耗多少
- 查看当前项目近 7 天投放效果
- 查看近 30 天 ROI 趋势

待处理线索：

- `frontend/src/src/lib/api.ts` 中 `reportApi` 曾出现 `apiMode: 'demo'`
- 定时报表任务仍可能存在 demo 链路
- 查数后需要自动补一轮异常检查 workflow：空表、字段缺失、日期缺口、异常波动

### 6.3 Agent 路由与上下文回归

必须保持：

- 先找 Agent / Skill
- 再找 MCP
- 最后才普通问答

重点回归问题：

- `获取智投的指间山海应用列表`
- `获取巨量的指间山海应用列表`
- 上一轮失败后输入 `重试一下`
- 点击 7 个快捷入口后是否进入对应 Agent / Skill

注意：

- “智投”是系统名，不是媒体
- “巨量”是广告媒体
- “应用列表”存在业务歧义，需结合知识库或确认组件追问
- 如果 tool 已调用成功，正文不能只说“已获取结果”，要展示用户要看的应用列表

### 6.4 定时报表与自动化

待补：

- 日报 / 周报 / 月报 / 流量分类报表模板真实保存
- 已配置任务支持暂停、开启、修改
- 运行记录点击后打开报表结果
- 后台模板管理能力补齐
- 报表模板以“维度 + 指标”确认方式为主，不走报告风文案

### 6.5 行业动态能力

已有方向：

- `Crawl4AI + Playwright`
- 可插拔 Crawling Provider
- Knowledge Ingestion Layer
- Dataki 入库
- Chat RAG 检索

MVP 待验收：

- 配置一个行业动态知识库
- 跑一次抓取
- 去重
- Dataki 入库
- Chat 通过“追情报”快捷入口检索

后台需要保留调试能力：

- 最近抓取结果
- 最近入库
- 去重日志
- 失败日志

### 6.6 统一任务 / 结果模型

现状问题：

- 联调、报表、自动化、行业动态各有各的任务和结果模型

后续方向：

- 定义统一 `Task / Artifact`
- 支撑任务回看、最近结果、执行中状态、结果证据复用

这块是 v1 级别基础能力，不建议插在小 UI 修复中顺手做。

## 7. 重启后推荐第一步

建议新会话开头直接说：

```text
请读取 docs/operations/handoff-2026-05-21-session-restart.md，按交接记录继续。先不要动代码，先复核当前 git status 和待办优先级。
```

然后执行：

```bash
git status --short --branch
git log -5 --oneline --decorate
```

如果继续做开发，优先选择一个明确小版本，不要同时改多个稳定模块。


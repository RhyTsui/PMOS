# PMOS 前端母仓库 GitLab 执行版提示词

版本：2026-05-12

目标仓库：

- `http://gitlab.sh.com/xuyun/pmos.git`

## 用途

这份提示词是给 Codex CLI 的 **直接执行版**。

它不是通用模板，而是面向这次实际目标：

- 在空目录中创建 PMOS 前端母仓库
- 跑通本地质量门禁
- 初始化 Git 仓库
- 连接到 `http://gitlab.sh.com/xuyun/pmos.git`
- 完成首版提交与首次 push

## 默认 Agent 分工

这份执行版提示词默认要求 Codex 同时扮演两条 PMOS lane：

1. `Fullstack Builder Agent`
   - 负责实际建仓、生成 CRUD 功能包、补齐脚本与 CI

2. `Testing Acceptance Agent`
   - 负责本地验证、失败回修、最终决定是否允许进入 push

如果你希望 Codex 一次性把“建仓 + 本地验证 + 首推 GitLab”都做掉，就直接把下面整段粘给它。

---

## 主提示词

```text
你现在是一个资深前端工程代理。请在当前空目录中，直接创建一个 PMOS 前端母仓库，并准备推送到以下 GitLab 仓库：

http://gitlab.sh.com/xuyun/pmos.git

这次任务不是只生成代码，也不是只生成说明文档，而是要完成：

1. 创建前端母仓代码
2. 本地跑通尽量完整的验证
3. 初始化 Git
4. 连接 GitLab remote
5. 创建首版提交
6. 推送到远端 main 分支

如果 push 因认证失败，请不要伪装成功；明确说明卡在认证。

在本次任务中，请显式采用以下 PMOS lane 身份：

- 你当前的执行身份 = `Fullstack Builder Agent`
- 你的收口身份 = `Testing Acceptance Agent`

执行顺序必须是：

1. 先搭真实工程
2. 再跑自动验收
3. 验收通过后再做 `git commit / git push`
4. 未通过则继续修，不要把未验收代码推上去

# 一、产品与工程目标

创建一个 PMOS 前端母仓库，用于后续稳定生成 CRUD 功能包。

这不是 landing page，不是单页 demo，不是营销展示壳。

它必须体现：

- PMOS
- chat-first
- agent-controlled frontend
- Ant Design 业务 CRUD
- Ant Design X 助手交互壳
- CRUD 生成器
- GitLab CI

当前先做前端优先版：

- 先不接真实后端
- 但保留 API Client / Service Config / MSW 扩展位
- 后续可平滑升级为真实 API 联调模式

# 二、技术栈要求

必须使用：

- pnpm workspace
- React + TypeScript + Vite
- react-router-dom
- @tanstack/react-query
- antd
- @ant-design/x
- vitest + testing-library
- msw
- eslint + prettier
- GitLab CI

不要引入：

- Ant Design Pro dashboard 套壳
- 其他 UI 框架
- landing/hero/showcase 风格页面

# 三、必须创建的结构

至少包含：

- apps/web
- packages/service-config
- packages/api-client
- packages/mock
- packages/ui
- generators/create-crud.mjs
- specs/features/user-management.yaml
- scripts/verify.mjs
- .gitlab-ci.yml
- README.md

# 四、前端功能要求

至少实现：

1. `/users`
   - 完整用户管理 CRUD 功能包
   - 搜索、分页、新增、编辑、删除、启用/禁用、loading/error/empty

2. `/assistant`
   - PMOS Assistant Panel
   - 使用 Ant Design X
   - 至少有 welcome、prompts、conversation shell、sender
   - 可本地运行，但先不接真实 LLM

3. `/`
   - 重定向到 `/users`

要求：

- 页面只能通过 api-client 访问 `/api`
- 当前通过 MSW 提供 mock
- 组件不能直接依赖 mock 数据

# 五、CRUD 生成功能

必须实现：

```bash
pnpm pmos:create-crud specs/features/user-management.yaml
```

并保证 `users` 是第一个真实样板，而不是空壳。

# 六、质量门禁

请尽量运行并修复到通过：

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm pmos:verify
```

如果因为网络或环境问题无法继续，必须说明。

# 七、GitLab 推送要求

完成代码与验证后，执行：

1. `git init`
2. `git branch -M main`
3. `git remote add origin http://gitlab.sh.com/xuyun/pmos.git`
4. `git add .`
5. `git commit -m "feat: initialize PMOS frontend kit"`
6. `git push -u origin main`

要求：

- 不要等待用户逐步确认
- 直接执行
- 如果 remote 已存在，改为更新它
- 如果 push 被认证拦住，停止在真实阻塞点，并明确说明

# 八、最后输出

请用中文输出：

1. 创建了哪些核心文件
2. 哪些命令通过了
3. 哪些命令没通过，以及原因
4. Git 是否已初始化
5. remote 是否已指向 GitLab
6. 是否已经成功 push 到 `main`
7. 如果没有 push 成功，卡在什么地方

现在开始执行。
```

# PMOS 前端母仓库 Codex CLI 提示词

版本：2026-05-12

## 用途

这份提示词用于让 Codex CLI 在空目录中直接创建一个 **PMOS 前端母仓库**。

目标不是做一个好看的 demo，也不是只做一张页面，而是搭一个后续可以稳定生成 CRUD 功能包、能承接 PMOS `chat-first + agent-controlled frontend` 范式、并且具备 GitLab CI 质量门禁的前端工程底座。

这版是 **前端优先版**：

- 先不创建真实后端服务
- 但必须保留未来真实 API 接入位
- 当前通过 `API Client + Service Config + MSW` 跑通产品验证
- 后续可以平滑升级到 Fastify / SQLite / Prisma 等真实后端

## 默认 Agent 分工

这份提示词默认由两条 PMOS agent lane 协作完成：

1. `Fullstack Builder Agent`
   - 负责创建母仓、搭前端结构、落 CRUD 功能包、接 `api-client / service-config / mock / generator / CI`

2. `Testing Acceptance Agent`
   - 负责执行 `lint / typecheck / test / build / verify`
   - 负责阻断不完整交付，而不是把半成品交给用户

## 推荐使用方式

```bash
mkdir pmos-frontend-kit
cd pmos-frontend-kit
codex
```

然后把下面「主提示词」整段粘贴给 Codex CLI。

如果首次生成后命令没全部通过，再粘贴下面的「修复提示词」。

---

## 主提示词

```text
你现在是一个资深前端工程代理。请在当前空目录中，从零创建一个可运行、可构建、可测试、可扩展的 PMOS 前端母仓库。

不要只写方案，不要只写 README，不要停在脚手架说明。你必须真实创建代码、配置、测试、生成器、GitLab CI 文件，并尽量运行验证命令。遇到不确定项时，不要反问，直接采用下面的默认约束。

在本次任务中，请显式采用以下 PMOS lane 身份：

- 你当前的执行身份 = `Fullstack Builder Agent`
- 你的收口身份 = `Testing Acceptance Agent`

也就是说：

- 先把真实工程搭出来
- 再把自动验收跑完
- 没通过就继续修，不要把未验收结果直接交付

# 一、任务目标

创建一个 `pmos-frontend-kit` 级别的前端母仓库，用于后续稳定生成 PMOS 风格的 CRUD 功能包。

本轮重点不是视觉稿，而是工程底座：

1. React + TypeScript + Vite 前端应用
2. Ant Design 负责 CRUD 和业务页基础组件
3. Ant Design X 负责 PMOS chat-first / copilot / assistant 交互外壳
4. pnpm workspace 多包结构
5. API Client 抽象层
6. Service Config 抽象层
7. MSW mock 兜底层
8. CRUD 功能包生成器
9. GitLab CI 质量门禁
10. 一个真实可运行的 `用户管理 CRUD 功能包`

必须避免把仓库做成：

- landing page
- hero section
- feature grid
- showcase shell
- Claude 风格平铺卡片墙
- 泛 AI SaaS 首页
- 只有一张演示页、没有工程生成能力的 demo 项目

# 二、默认技术栈

必须使用：

- 包管理：pnpm workspace
- 前端：React + TypeScript + Vite
- 路由：react-router-dom
- 状态请求：@tanstack/react-query
- UI：antd
- AI UI：@ant-design/x
- 测试：vitest + @testing-library/react + @testing-library/user-event + jsdom
- Mock：msw
- 代码质量：eslint + prettier
- CI：GitLab CI
- Node：优先按 Node 22 兼容

重要约束：

- CRUD 主体页面优先使用 antd
- PMOS 助手、chat、建议、欢迎、对话外壳优先使用 Ant Design X
- 不要引入新的 UI 框架
- 不要生成 Ant Design Pro dashboard 套壳
- 不要把首页做成控制台面板墙
- 首页/默认入口必须体现 `chat-first + agent-controlled frontend`
- 但本轮不需要做一个完整复杂首页，只需要把这种范式放进可扩展外壳里

# 三、仓库结构要求

请创建如下结构，可按需要补充，但不要大幅偏离：

```text
.
├─ apps/
│  └─ web/
│     ├─ package.json
│     ├─ tsconfig.json
│     ├─ vite.config.ts
│     ├─ index.html
│     └─ src/
│        ├─ main.tsx
│        ├─ app/
│        │  ├─ App.tsx
│        │  ├─ AppProviders.tsx
│        │  └─ routes.tsx
│        ├─ layouts/
│        │  └─ AppLayout.tsx
│        ├─ features/
│        │  ├─ assistant/
│        │  │  └─ PmosAssistantPanel.tsx
│        │  └─ users/
│        │     ├─ UsersPage.tsx
│        │     ├─ users.constants.ts
│        │     ├─ hooks/
│        │     │  └─ useUsersPage.ts
│        │     ├─ components/
│        │     │  ├─ UserSearchForm.tsx
│        │     │  ├─ UserTable.tsx
│        │     │  ├─ UserUpsertDrawer.tsx
│        │     │  └─ UserStatusTag.tsx
│        │     └─ __tests__/
│        │        └─ UsersPage.test.tsx
│        ├─ shared/
│        │  ├─ query/
│        │  │  └─ queryClient.ts
│        │  ├─ styles/
│        │  │  └─ global.css
│        │  └─ testing/
│        │     └─ renderWithProviders.tsx
│        └─ vite-env.d.ts
├─ packages/
│  ├─ service-config/
│  │  └─ src/index.ts
│  ├─ api-client/
│  │  └─ src/
│  │     ├─ index.ts
│  │     ├─ request.ts
│  │     └─ users.ts
│  ├─ mock/
│  │  └─ src/
│  │     ├─ browser.ts
│  │     ├─ handlers.ts
│  │     ├─ users.handlers.ts
│  │     └─ users.mock-data.ts
│  └─ ui/
│     └─ src/index.ts
├─ generators/
│  └─ create-crud.mjs
├─ specs/
│  └─ features/
│     └─ user-management.yaml
├─ scripts/
│  └─ verify.mjs
├─ .gitlab-ci.yml
├─ eslint.config.js
├─ .prettierrc
├─ package.json
├─ pnpm-workspace.yaml
├─ tsconfig.base.json
└─ README.md
```

# 四、产品与交互原则

这个母仓库服务的是 PMOS，不是广告系统，也不是普通后台模板。

默认设计原则：

- chat-first
- agent-controlled frontend
- assistant shell 统一
- CRUD / 审批 / 任务 / PRD / 决策页都能作为功能包被稳定生成

必须体现：

- 一个 `PmosAssistantPanel`
- 至少有 welcome / prompts / conversation shell / sender 这类 Ant Design X 基础能力
- 但不要为了炫技把所有 X 组件都硬塞进首版
- 这层助手是 PMOS 通用交互壳，不是页面主内容的营销展示

禁止：

- 大面积渐变营销页
- Hero + 三卡片 + CTA
- 平铺式智能体海报墙
- 伪 dashboard
- 组件炫技页

# 五、前端应用要求

## 5.1 路由

至少实现：

- `/` 重定向到 `/users`
- `/users` 用户管理 CRUD 页面
- `/assistant` PMOS 助手页面或侧区域

## 5.2 AppLayout

使用 antd Layout + Menu。

包含：

- PMOS Frontend Kit 标题
- 用户管理菜单
- PMOS 助手菜单

整体风格要克制、工程化，不要做营销壳。

## 5.3 UsersPage

必须实现一个完整且稳定的 CRUD 功能包页面：

- 搜索表单：关键字、状态
- 表格：姓名、邮箱、角色、状态、创建时间、操作
- 新增用户
- 编辑用户
- 删除用户，必须有确认
- 启用 / 禁用状态切换
- loading 状态
- error 状态
- empty 状态
- 分页
- 操作成功提示
- 操作失败提示

当前数据源：

- 默认走 `packages/api-client`
- api-client 默认命中本地 `/api`
- 本轮不接真实后端，所以由 MSW 拦截
- 但组件层不能直接依赖 mock 数据，必须通过 api-client 间接访问

## 5.4 PMOS Assistant

`PmosAssistantPanel.tsx` 用 `@ant-design/x` 搭一个可运行的 PMOS 助手交互壳。

至少包含：

- Welcome
- Prompt 建议
- 对话消息展示
- 输入框
- 示例操作建议

示例文案可以是：

- 生成一个 CRUD 功能包
- 为当前功能补齐审批流
- 从需求规格生成页面骨架
- 检查当前功能包的接口契约

要求：

- 是一个真实的可运行助手面板
- 但先不接真实 LLM
- 使用本地状态管理会话即可
- 结构上要为未来接入真实对话服务保留扩展点

# 六、Service Config 要求

`packages/service-config/src/index.ts` 至少导出：

```ts
export type RuntimeEnv = 'local' | 'dev' | 'test' | 'staging' | 'prod';

export interface ServiceConfig {
  apiBaseUrl: string;
  enableMock: boolean;
  enableDebug: boolean;
  requestTimeoutMs: number;
}

export function getRuntimeEnv(): RuntimeEnv;
export function getServiceConfig(): ServiceConfig;
export function isMockEnabled(): boolean;
```

要求：

- Web 端可读 `import.meta.env`
- 默认 local 配置：
  - `apiBaseUrl = '/api'`
  - `enableMock = true`
- 未来切真实后端时，只需要改配置，不需要重写页面逻辑

# 七、API Client 要求

`packages/api-client` 必须提供：

- 通用 `request<T>()`
- `ApiError`
- 用户管理 CRUD API

至少导出：

```ts
listUsers(params)
getUser(id)
createUser(payload)
updateUser(id, payload)
deleteUser(id)
toggleUserStatus(id, status)
```

类型至少包含：

```ts
export type UserStatus = 'active' | 'disabled';
export type UserRole = 'admin' | 'member' | 'viewer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt?: string;
}

export interface ListUsersParams {
  keyword?: string;
  status?: UserStatus | 'all';
  page?: number;
  pageSize?: number;
}

export interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}
```

# 八、Mock 要求

`packages/mock` 必须基于 MSW 提供完整的用户 CRUD mock。

要求：

- 类型与 api-client 一致
- 至少 8 条用户 seed 数据
- 覆盖 active / disabled / admin / member / viewer
- 支持搜索、分页、编辑、删除、状态切换

但要注意：

- mock 是当前前端母仓库的产品验证兜底
- 不是直接把 mock 数据写死在组件里
- 组件必须通过 api-client 使用这些能力

# 九、CRUD 生成功能

实现 `generators/create-crud.mjs`。

要求：

```bash
pnpm pmos:create-crud specs/features/user-management.yaml
```

第一版至少做到：

1. 读取 yaml 规格
2. 根据 feature code / route / entity / fields / actions 生成一个前端 CRUD 功能目录骨架
3. 生成结构至少包括：
   - page
   - constants
   - hooks
   - components
   - test
4. 行为尽量 idempotent
5. 当前仓库必须已经内置 `users` 作为标准样板

`specs/features/user-management.yaml` 至少包含：

```yaml
feature:
  name: 用户管理
  code: users
  route: /users
  pageType: crud-list

entity:
  name: User
  fields:
    - name: id
      type: string
      label: 用户 ID
      readonly: true
    - name: name
      type: string
      label: 姓名
      required: true
    - name: email
      type: string
      label: 邮箱
      required: true
      unique: true
    - name: role
      type: enum
      label: 角色
      options: [admin, member, viewer]
    - name: status
      type: enum
      label: 状态
      options: [active, disabled]
    - name: createdAt
      type: datetime
      label: 创建时间
      readonly: true

actions:
  - search
  - create
  - edit
  - delete
  - toggleStatus

api:
  basePath: /api/users
```

# 十、测试要求

至少补齐：

## 10.1 Web 测试

`UsersPage.test.tsx` 覆盖：

1. 页面标题可见
2. 列表加载成功
3. 搜索 Alice 可筛选
4. 新增用户成功后出现在列表
5. 删除用户后不再出现
6. 状态切换触发成功

## 10.2 Generator 测试或最小验证

至少要有可执行验证，证明 `create-crud.mjs` 能根据 spec 输出样板。

如果你不想引入单测框架测试 generator，也必须在 `scripts/verify.mjs` 中真实校验一次。

# 十一、GitLab CI 要求

创建 `.gitlab-ci.yml`，至少包含：

```yaml
stages:
  - install
  - validate
  - test
  - build
```

要求：

- 使用 `node:22`
- 启用 corepack
- 使用 pnpm
- 缓存 pnpm store
- install 阶段安装依赖
- validate 阶段执行 lint 和 typecheck
- test 阶段执行测试
- build 阶段执行构建
- build 产物保存为 artifacts

本地脚本和 CI 命令必须一致。

# 十二、根脚本要求

根 `package.json` 至少包含：

```json
{
  "scripts": {
    "dev": "pnpm --filter @pmos/web dev",
    "build": "pnpm -r --if-present build",
    "lint": "pnpm -r --if-present lint",
    "typecheck": "pnpm -r --if-present typecheck",
    "test": "pnpm -r --if-present test",
    "pmos:create-crud": "node generators/create-crud.mjs",
    "pmos:verify": "node scripts/verify.mjs"
  }
}
```

如有必要可增加：

- `dev:web`
- `preview`

# 十三、README 要求

README 必须包含：

1. 项目定位：PMOS 前端母仓库
2. 技术栈
3. 目录结构说明
4. 本地安装与启动命令
5. Mock 机制说明
6. API Client / Service Config 说明
7. CRUD 功能包生成器说明
8. GitLab CI 说明
9. 后续如何升级为真实后端联调模式

启动流程必须清晰：

```bash
pnpm install
pnpm dev
```

# 十四、质量要求

- 不要写伪代码
- 不要留 TODO
- 不要用一个大文件塞满所有逻辑
- 类型要清晰
- 导入路径要能解析
- 测试要能跑
- CRUD 功能必须真可用
- 生成器必须不是空壳
- 最终结果必须是一个能运行的前端工程

# 十五、运行验证

完成后尽量运行：

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm pmos:verify
```

如果网络或环境限制导致不能安装依赖或执行命令，也必须先把完整文件创建好，并在最后明确说明哪些命令没法跑、为什么没法跑。

不要把失败状态直接交付给用户；如果命令失败，请继续修复，直到通过，除非是外部环境问题。

# 十六、最后输出格式

完成后请用中文输出：

1. 创建了哪些核心文件
2. 运行了哪些命令并通过
3. 哪些命令没有运行或未通过，以及原因
4. 如何启动本地工程
5. 如何生成新的 CRUD 功能包
6. 后续升级到真实后端时的扩展点，不超过 5 条

现在开始执行。
```

---

## 修复提示词

```text
请继续修复当前 PMOS 前端母仓库，不要重建项目。

目标是让以下命令尽量全部通过：

pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm pmos:verify

请优先检查：

1. pnpm workspace 包名和 filter 是否一致
2. tsconfig/base paths 是否和 Vite 解析一致
3. React Router、TanStack Query、MSW、Ant Design、Ant Design X 的版本与 import 是否匹配
4. mock 数据是否绕过了 api-client，若绕过则收回到 api-client 链路
5. UsersPage 测试是否真实覆盖 CRUD 流程
6. create-crud.mjs 是否真能根据 spec 生成文件，而不是空输出
7. GitLab CI 中的命令是否与本地 scripts 一致

不要只解释问题，直接修改文件并重新运行验证命令；只有当环境限制无法继续时，再报告。
```

---

## 最小压缩版

```text
在当前空目录创建一个 PMOS 前端母仓库，使用 pnpm workspace。必须包含 apps/web、packages/service-config、packages/api-client、packages/mock、packages/ui、generators/create-crud.mjs、specs/features/user-management.yaml、.gitlab-ci.yml。前端用 React + TypeScript + Vite + antd + @ant-design/x + react-router-dom + @tanstack/react-query。实现一个稳定可运行的用户管理 CRUD 功能包，支持搜索、分页、新增、编辑、删除、启用禁用、loading/error/empty。默认通过 api-client 访问 /api，由 MSW 提供本地 mock 兜底，但组件不能直接依赖 mock 数据。实现一个 PMOS Assistant Panel，体现 chat-first + agent-controlled frontend，用 Ant Design X 提供 welcome、prompts、conversation shell、sender。实现 pnpm dev、pnpm lint、pnpm typecheck、pnpm test、pnpm build、pnpm pmos:create-crud、pnpm pmos:verify。实现 GitLab CI 同时校验 lint、typecheck、test、build。不要问问题，直接创建真实代码并运行验证，失败则继续修复。
```

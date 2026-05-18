# Codex CLI 一次性提示词：PMOS 全栈母仓库 + CRUD 产品验证包

把下面整段复制给 Codex CLI。建议在一个空目录里执行：

```bash
mkdir pmos-fullstack-kit
cd pmos-fullstack-kit
codex
```

然后把「主提示词」完整粘贴进去。

这版不是纯前端。它要求 Codex 生成一个 **前后端一体化 PMOS 母仓库**，包含：

- React + TypeScript + Vite 前端
- Ant Design CRUD 页面
- Ant Design X PMOS 助手面板
- Fastify + TypeScript 后端 API
- Prisma + SQLite 本地数据库
- 真实用户管理 CRUD API
- seed 数据
- Mock 兜底能力
- 服务配置模块
- CRUD 生成器
- GitLab CI 前后端质量门禁

---

## 主提示词

你是一个资深全栈工程代理。请在当前目录从零创建一个可运行、可构建、可测试的 PMOS 全栈母仓库。

本任务是一次性工程交付，不要只写方案，不要只写 README。你必须真实创建代码文件、配置文件、数据库 schema、seed、测试文件和 GitLab CI 文件，并尽量运行验证命令。不要向用户追问细节；遇到不确定项时，采用下面的默认约束。

# 一、核心目标

创建一个名为 `pmos-fullstack-kit` 的全栈母仓库，用于 PMOS 未来稳定生成“可产品验证”的功能包。

第一版必须完成：

1. `apps/web`：React + TypeScript + Vite 前端应用。
2. `apps/api`：Fastify + TypeScript 基础后端服务。
3. `packages/service-config`：前后端共享服务配置模块。
4. `packages/api-client`：前端调用后端的类型化 API client。
5. `packages/mock`：MSW mock 兜底能力。
6. `packages/ui`：基础 UI 导出位。
7. `specs/features/user-management.yaml`：用户管理功能规格。
8. `generators/create-crud.mjs`：最小可用 CRUD 生成器。
9. `.gitlab-ci.yml`：GitLab CI 前后端质量门禁。
10. 一个完整的「用户管理 CRUD 产品验证包」。

这版的重点不是复杂后端，而是让页面不只依赖假数据，而是能通过真实本地 API + SQLite 跑起来，支撑产品验证。

# 二、默认技术栈

使用：

- 包管理：pnpm workspace
- 前端构建：Vite
- 前端框架：React + TypeScript
- UI：antd
- AI UI：@ant-design/x
- 路由：react-router-dom
- 前端数据请求状态：@tanstack/react-query
- 前端 Mock：msw
- 后端框架：Fastify + TypeScript
- 后端数据库：SQLite
- ORM：Prisma
- 后端校验：zod，或者 Fastify schema；优先 zod
- 后端 API 文档：@fastify/swagger + @fastify/swagger-ui，若版本不兼容则用可运行替代方案
- 后端测试：vitest，优先使用 Fastify `app.inject()`
- 前端测试：vitest + @testing-library/react + @testing-library/user-event + jsdom
- 代码质量：eslint + prettier
- CI：GitLab CI
- Node：优先 Node 22

重要约束：

- CRUD 页面主体使用 antd。
- Ant Design X 只用于 PMOS 助手/智能交互面板，不要强行用于表格 CRUD。
- 第一版后端不要做复杂微服务、Redis、消息队列、分布式任务、完整 OAuth。
- 后端必须有清晰扩展点：config、plugins、modules、repository、service、routes、schemas、errors。
- 本地产品验证优先：真实 API + SQLite + seed 必须能跑通。
- MSW 只作为兜底或离线开发模式，不是默认唯一数据源。
- 默认 local 开发应优先走真实后端 API。
- 如果依赖版本 API 不一致，请检查已安装包的类型定义并调整到能编译通过。

# 三、仓库结构要求

请创建如下结构。可以根据实际需要补充文件，但不要大幅偏离：

```text
.
├── apps/
│   ├── web/
│   │   ├── index.html
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   └── src/
│   │       ├── main.tsx
│   │       ├── app/
│   │       │   ├── App.tsx
│   │       │   ├── AppProviders.tsx
│   │       │   └── routes.tsx
│   │       ├── layouts/
│   │       │   └── AppLayout.tsx
│   │       ├── features/
│   │       │   ├── assistant/
│   │       │   │   └── PmosAssistantPanel.tsx
│   │       │   └── users/
│   │       │       ├── UsersPage.tsx
│   │       │       ├── users.constants.ts
│   │       │       ├── hooks/
│   │       │       │   └── useUsersPage.ts
│   │       │       ├── components/
│   │       │       │   ├── UserSearchForm.tsx
│   │       │       │   ├── UserTable.tsx
│   │       │       │   ├── UserUpsertDrawer.tsx
│   │       │       │   └── UserStatusTag.tsx
│   │       │       └── __tests__/
│   │       │           └── UsersPage.test.tsx
│   │       ├── shared/
│   │       │   ├── query/
│   │       │   │   └── queryClient.ts
│   │       │   ├── styles/
│   │       │   │   └── global.css
│   │       │   └── testing/
│   │       │       └── renderWithProviders.tsx
│   │       └── vite-env.d.ts
│   │
│   └── api/
│       ├── package.json
│       ├── tsconfig.json
│       ├── prisma/
│       │   ├── schema.prisma
│       │   └── seed.ts
│       ├── src/
│       │   ├── server.ts
│       │   ├── app.ts
│       │   ├── config/
│       │   │   └── env.ts
│       │   ├── plugins/
│       │   │   ├── cors.ts
│       │   │   ├── prisma.ts
│       │   │   └── swagger.ts
│       │   ├── shared/
│       │   │   ├── http/
│       │   │   │   ├── api-error.ts
│       │   │   │   ├── error-handler.ts
│       │   │   │   └── response.ts
│       │   │   ├── pagination.ts
│       │   │   └── validation.ts
│       │   ├── modules/
│       │   │   ├── health/
│       │   │   │   └── health.routes.ts
│       │   │   └── users/
│       │   │       ├── users.routes.ts
│       │   │       ├── users.service.ts
│       │   │       ├── users.repository.ts
│       │   │       ├── users.schemas.ts
│       │   │       └── users.types.ts
│       │   └── __tests__/
│       │       └── users.routes.test.ts
│       └── .env.example
│
├── packages/
│   ├── service-config/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       └── index.ts
│   ├── api-client/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── request.ts
│   │       └── users.ts
│   ├── mock/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── browser.ts
│   │       ├── handlers.ts
│   │       ├── users.handlers.ts
│   │       └── users.mock-data.ts
│   └── ui/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           └── index.ts
│
├── generators/
│   └── create-crud.mjs
├── specs/
│   └── features/
│       └── user-management.yaml
├── scripts/
│   └── verify.mjs
├── .gitlab-ci.yml
├── .prettierrc
├── eslint.config.js
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── README.md
```

# 四、根 package.json 脚本要求

根目录 `package.json` 至少包含：

```json
{
  "scripts": {
    "dev": "concurrently \"pnpm --filter @pmos/api dev\" \"pnpm --filter @pmos/web dev\"",
    "dev:web": "pnpm --filter @pmos/web dev",
    "dev:api": "pnpm --filter @pmos/api dev",
    "setup:local": "pnpm --filter @pmos/api prisma:generate && pnpm --filter @pmos/api db:push && pnpm --filter @pmos/api db:seed",
    "build": "pnpm -r --if-present build",
    "lint": "pnpm -r --if-present lint",
    "typecheck": "pnpm -r --if-present typecheck",
    "test": "pnpm -r --if-present test",
    "pmos:create-crud": "node generators/create-crud.mjs",
    "pmos:verify": "node scripts/verify.mjs"
  }
}
```

可以安装 `concurrently`。

`pmos:verify` 要依次执行：

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

# 五、后端 apps/api 详细要求

## 5.1 API 基础能力

`apps/api` 必须实现：

1. Fastify app builder：`src/app.ts`
2. server 启动入口：`src/server.ts`
3. 环境变量配置：`src/config/env.ts`
4. CORS 插件
5. Prisma 插件
6. Swagger/OpenAPI 插件
7. 全局错误处理
8. 统一响应工具
9. 分页工具
10. zod 或 schema 校验
11. Health check
12. Users CRUD module

后端端口默认：

```text
http://localhost:3001
```

前端开发服务器通过 Vite proxy 把 `/api` 转发到 `http://localhost:3001`。

## 5.2 后端环境变量

`apps/api/.env.example` 至少包含：

```env
NODE_ENV=development
PORT=3001
API_HOST=0.0.0.0
DATABASE_URL=file:./dev.db
CORS_ORIGIN=http://localhost:5173
LOG_LEVEL=info
```

`src/config/env.ts` 要有类型化读取和默认值。

## 5.3 Prisma schema

`apps/api/prisma/schema.prisma` 使用 SQLite。

建议模型：

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id        String   @id @default(cuid())
  name      String
  email     String   @unique
  role      String
  status    String   @default("active")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

不要依赖复杂外部数据库。第一版用 SQLite 保障本地产品验证。

## 5.4 API 路由

必须实现以下真实后端接口：

```text
GET    /health
GET    /api/users
POST   /api/users
GET    /api/users/:id
PUT    /api/users/:id
DELETE /api/users/:id
POST   /api/users/:id/status
GET    /docs
GET    /openapi.json 或 Swagger JSON 等价路径
```

`GET /api/users` 支持：

```text
keyword
status: all | active | disabled
page
pageSize
```

返回格式：

```ts
{
  list: User[];
  total: number;
  page: number;
  pageSize: number;
}
```

## 5.5 Users module 分层

Users 模块必须分层：

```text
users.schemas.ts       // zod/schema 校验
users.types.ts         // 类型
users.repository.ts    // Prisma 查询
users.service.ts       // 业务规则
users.routes.ts        // Fastify routes
```

业务规则至少包括：

- email 唯一性检查
- role 只能是 admin/member/viewer
- status 只能是 active/disabled
- 删除不存在用户返回 404
- 修改不存在用户返回 404
- 创建重复邮箱返回 409
- 分页参数有默认值和上限
- 返回错误不能是裸 Prisma 异常

## 5.6 Seed

`apps/api/prisma/seed.ts` 必须生成至少 8 个用户，覆盖：

- active
- disabled
- admin
- member
- viewer
- 不同创建时间
- 可搜索关键词，例如 Alice、Bob、Charlie

脚本要求：

```bash
pnpm --filter @pmos/api db:seed
```

## 5.7 API package scripts

`apps/api/package.json` 至少包含：

```json
{
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "start": "node dist/server.js",
    "build": "tsc -p tsconfig.json",
    "lint": "eslint .",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "cross-env DATABASE_URL=file:./test.db vitest run",
    "prisma:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:push:test": "cross-env DATABASE_URL=file:./test.db prisma db push --force-reset --skip-generate",
    "db:seed": "tsx prisma/seed.ts"
  }
}
```

如果 `test` 需要先建库，可以用 `pretest` 自动执行：

```json
{
  "pretest": "cross-env DATABASE_URL=file:./test.db prisma db push --force-reset --skip-generate"
}
```

# 六、前端 apps/web 详细要求

## 6.1 Web 基础

`apps/web` 必须实现：

1. `main.tsx` 启动 React。
2. `AppProviders.tsx` 包含：
   - antd `ConfigProvider`
   - Ant Design X 的全局 provider；如果当前版本不需要或 API 不同，则以可编译方式处理
   - TanStack Query `QueryClientProvider`
3. `routes.tsx` 包含：
   - `/` 重定向到 `/users`
   - `/users` 用户管理页面
   - `/assistant` PMOS 助手页面或展示区
4. `AppLayout.tsx` 使用 antd `Layout`、`Menu`，展示：
   - PMOS Fullstack Kit 标题
   - 用户管理菜单
   - PMOS 助手菜单

## 6.2 Vite proxy

`apps/web/vite.config.ts` 必须配置：

```ts
server: {
  proxy: {
    '/api': 'http://localhost:3001',
    '/health': 'http://localhost:3001',
    '/docs': 'http://localhost:3001',
    '/openapi.json': 'http://localhost:3001'
  }
}
```

可以根据 Vite 最新 API 调整写法，但必须实现本地前端请求后端。

## 6.3 UsersPage

`UsersPage.tsx` 实现完整 CRUD：

- 搜索表单：关键词、状态
- 表格：姓名、邮箱、角色、状态、创建时间、操作
- 新增用户
- 编辑用户
- 删除用户，必须有确认
- 启用/禁用状态切换
- loading 状态
- error 状态
- empty 状态
- 分页
- 操作成功消息
- 操作失败提示

默认数据来源：

```text
真实后端 API /api/users
```

只有当 `VITE_ENABLE_MOCK=true` 时才启用 MSW mock。

## 6.4 PMOS Assistant

`PmosAssistantPanel.tsx` 使用 `@ant-design/x` 的可用组件构建一个 PMOS 助手界面，至少包含：

- 欢迎语
- prompt 建议
- 对话消息展示
- 输入框
- 示例 prompt：
  - “生成一个 CRUD 功能包”
  - “检查当前页面的接口契约”
  - “生成 GitLab CI 质量门禁”
  - “根据当前 API 生成页面”
- 这个助手先是本地演示，不接真实 LLM API。

如果 `@ant-design/x` 的 API 与预期不同，请适配到能编译通过。不要留下坏 import。

# 七、共享服务配置 packages/service-config

`packages/service-config/src/index.ts` 必须提供：

```ts
export type RuntimeEnv = 'local' | 'dev' | 'test' | 'staging' | 'prod';

export interface ServiceConfig {
  apiBaseUrl: string;
  apiServerUrl: string;
  authBaseUrl: string;
  fileBaseUrl: string;
  enableMock: boolean;
  enableDebug: boolean;
  requestTimeoutMs: number;
}

export function getRuntimeEnv(): RuntimeEnv;
export function getServiceConfig(): ServiceConfig;
export function isMockEnabled(): boolean;
```

要求：

- Web 端可以读取 `import.meta.env`。
- API 端可以读取 `process.env`。
- 如果共享包中直接兼容两边困难，可以做安全抽象，保证构建通过。
- local 默认：
  - `apiBaseUrl = '/api'`
  - `apiServerUrl = 'http://localhost:3001'`
  - `enableMock = false`
- 只有显式设置 `VITE_ENABLE_MOCK=true` 才启用 MSW。

# 八、API Client packages/api-client

`packages/api-client` 必须包含：

- 通用 `request<T>()`
- `ApiError`
- 用户 CRUD API：
  - `listUsers(params)`
  - `getUser(id)`
  - `createUser(payload)`
  - `updateUser(id, payload)`
  - `deleteUser(id)`
  - `toggleUserStatus(id, status)`

用户类型：

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

# 九、Mock packages/mock

MSW mock 仍需保留，但不是默认数据源。

实现：

- `GET /api/users`
- `POST /api/users`
- `GET /api/users/:id`
- `PUT /api/users/:id`
- `DELETE /api/users/:id`
- `POST /api/users/:id/status`

Mock 数据要与后端 seed 类型一致。

# 十、CRUD 生成器

实现 `generators/create-crud.mjs`。

要求：

```bash
pnpm pmos:create-crud specs/features/user-management.yaml
```

第一版至少做到：

1. 读取 yaml。
2. 根据 feature code、route、entity、fields、actions 生成一个功能目录。
3. 支持生成前端 CRUD 骨架。
4. 支持生成后端 module 骨架，至少包括 routes/service/repository/schemas/types。
5. 支持 idempotent：
   - 重复运行不要破坏现有可运行代码。
   - 可以选择覆盖生成区，或者检测存在后跳过。
   - 行为必须写进 README。
6. 当前仓库必须已经包含 `users` 功能包，作为生成器目标形态的样例。

`specs/features/user-management.yaml` 内容：

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
    - name: updatedAt
      type: datetime
      label: 更新时间
      readonly: true

actions:
  - search
  - create
  - edit
  - delete
  - toggleStatus

api:
  basePath: /api/users
  backend: true
  database: sqlite
```

可以安装 `yaml` 依赖解析。

# 十一、测试要求

## 11.1 API 测试

至少实现 `apps/api/src/__tests__/users.routes.test.ts`，覆盖：

1. `GET /health` 返回 ok。
2. `GET /api/users` 返回分页列表。
3. 搜索 Alice 能返回对应用户。
4. 创建用户成功。
5. 重复邮箱创建返回 409。
6. 更新用户成功。
7. 切换状态成功。
8. 删除用户成功。
9. 删除不存在用户返回 404。

API 测试优先使用 Fastify `app.inject()`，不要真的启动端口。

## 11.2 Web 测试

至少实现 `UsersPage.test.tsx`，覆盖：

1. 页面标题可见。
2. 用户数据能加载到表格。
3. 搜索 Alice 后能筛选。
4. 点击新增，填写表单，提交后新用户出现在列表。
5. 删除一个用户后，该用户不再出现在列表。
6. 状态切换按钮能触发状态变化。

Web 单测可以使用 MSW，避免依赖真实 API 端口。但应用运行时默认仍走真实 API。

# 十二、GitLab CI 要求

创建 `.gitlab-ci.yml`，至少包含：

```yaml
stages:
  - install
  - validate
  - test
  - build
```

要求：

- 使用 `node:22` 镜像。
- 启用 corepack。
- 使用 pnpm。
- 配置 pnpm store cache。
- install 阶段安装依赖。
- validate 阶段执行 lint 和 typecheck。
- test 阶段执行：
  - API test
  - Web test
- build 阶段执行 build。
- API 测试前需要执行 Prisma generate 和 test db push。
- build 产物作为 artifacts 保存：
  - `apps/web/dist`
  - `apps/api/dist`
- CI 命令应与本地 README 中的命令一致。

# 十三、README 要求

README 必须包含：

1. 项目定位：PMOS 全栈母仓库。
2. 技术栈。
3. 目录说明。
4. 本地初始化命令。
5. 本地启动命令。
6. 数据库初始化和 seed。
7. 前端如何连接后端。
8. Mock 开关说明。
9. API 文档地址。
10. 后端模块扩展说明。
11. 如何生成 CRUD 功能包。
12. GitLab CI 说明。
13. 当前已包含的用户管理 CRUD 功能说明。
14. 后续扩展建议：
    - OpenAPI 到 API Client 自动生成
    - 登录鉴权
    - RBAC 权限
    - PostgreSQL 迁移
    - 文件上传
    - 审计日志
    - E2E 测试
    - Docker 化部署

README 的本地运行流程必须清楚，例如：

```bash
pnpm install
pnpm setup:local
pnpm dev
```

访问：

```text
Web: http://localhost:5173
API: http://localhost:3001
Health: http://localhost:3001/health
Docs: http://localhost:3001/docs
```

# 十四、质量门禁

完成后请尽量运行：

```bash
pnpm install
pnpm setup:local
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm pmos:verify
```

如果环境没有网络，无法安装依赖，你仍然要创建完整文件，并在最终回复中说明无法运行的原因和需要用户运行的命令。

如果命令失败，你必须修复代码，直到通过为止。不要把失败状态交付给用户，除非是网络、权限或系统环境问题导致无法继续。

# 十五、编码质量要求

- 不要写伪代码。
- 不要留下 TODO。
- 不要把所有逻辑塞进一个文件。
- TypeScript 类型要明确。
- 所有导入路径要可解析。
- 共享包边界要清晰。
- 后端必须有 repository/service/routes 分层。
- 后端错误不能直接暴露 Prisma 原始异常。
- 前端表单校验要基本可用。
- 出错时要有用户可见的错误提示。
- CRUD 页面要能通过真实后端 API 完整操作。
- Mock 只作为兜底模式。
- 最终结果必须是一个能跑的全栈工程，不是建议文档。

# 十六、最终回复格式

完成后，请回复：

1. 你创建了哪些核心文件。
2. 哪些命令已经运行并通过。
3. 如果有未运行或未通过的命令，说明原因。
4. 如何初始化数据库。
5. 如何启动前后端。
6. 如何访问 Web/API/API Docs。
7. 如何生成新的 CRUD 功能包。
8. 后续开发复杂后端时的扩展点，不超过 5 条。

现在开始执行。

---

## 增量补充提示词：如果你已经执行过纯前端版，用这个追加后端能力

请继续修改当前仓库，不要重建项目。现在要把它从纯前端 PMOS 母仓库升级为「可产品验证的全栈 PMOS 母仓库」。

新增目标：

1. 新增 `apps/api`。
2. 使用 Fastify + TypeScript。
3. 使用 Prisma + SQLite。
4. 实现真实 `/api/users` CRUD 后端接口。
5. 前端默认调用真实 API，不再默认只用 MSW。
6. 保留 MSW 作为 `VITE_ENABLE_MOCK=true` 时的兜底。
7. 新增 API 测试。
8. 更新 GitLab CI，让它同时验证前端和后端。
9. 更新 README。

请新增或修改以下内容：

```text
apps/api/
├── package.json
├── tsconfig.json
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── src/
│   ├── server.ts
│   ├── app.ts
│   ├── config/env.ts
│   ├── plugins/cors.ts
│   ├── plugins/prisma.ts
│   ├── plugins/swagger.ts
│   ├── shared/http/api-error.ts
│   ├── shared/http/error-handler.ts
│   ├── shared/http/response.ts
│   ├── shared/pagination.ts
│   ├── shared/validation.ts
│   ├── modules/health/health.routes.ts
│   ├── modules/users/users.routes.ts
│   ├── modules/users/users.service.ts
│   ├── modules/users/users.repository.ts
│   ├── modules/users/users.schemas.ts
│   ├── modules/users/users.types.ts
│   └── __tests__/users.routes.test.ts
└── .env.example
```

后端接口必须包含：

```text
GET    /health
GET    /api/users
POST   /api/users
GET    /api/users/:id
PUT    /api/users/:id
DELETE /api/users/:id
POST   /api/users/:id/status
GET    /docs
GET    /openapi.json 或等价 Swagger JSON
```

前端修改要求：

1. `packages/api-client` 默认请求 `/api`。
2. `apps/web/vite.config.ts` 添加 proxy，把 `/api` 转发到 `http://localhost:3001`。
3. `packages/service-config` 中 local 默认 `enableMock=false`。
4. 只有 `VITE_ENABLE_MOCK=true` 时才启动 MSW。
5. UsersPage 的 CRUD 操作必须能通过真实 API 跑通。

根脚本补充：

```json
{
  "scripts": {
    "dev": "concurrently \"pnpm --filter @pmos/api dev\" \"pnpm --filter @pmos/web dev\"",
    "dev:web": "pnpm --filter @pmos/web dev",
    "dev:api": "pnpm --filter @pmos/api dev",
    "setup:local": "pnpm --filter @pmos/api prisma:generate && pnpm --filter @pmos/api db:push && pnpm --filter @pmos/api db:seed"
  }
}
```

GitLab CI 修改：

- 添加 API validate/test/build。
- API test 前执行 Prisma generate 和 test db push。
- artifacts 包含 `apps/web/dist` 和 `apps/api/dist`。

完成后运行：

```bash
pnpm install
pnpm setup:local
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm pmos:verify
```

如果失败，直接修复，不要只解释。

---

## 如果 Codex 执行失败，追加这个修复提示词

请继续修复当前仓库，不要重建项目。目标是让以下命令全部通过：

```bash
pnpm setup:local
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm pmos:verify
```

请优先检查：

1. pnpm workspace 包名和 filter 是否一致。
2. apps/api 的 Prisma Client 是否生成。
3. `DATABASE_URL` 是否正确指向 SQLite。
4. Fastify app 是否可被测试直接 import，测试不要强行监听端口。
5. Vite proxy 是否把 `/api` 转发到 `http://localhost:3001`。
6. MSW 是否只在 `VITE_ENABLE_MOCK=true` 时启动。
7. API client 的 baseURL 是否正确。
8. @ant-design/x 的 import 和组件 API 是否与当前安装版本一致。
9. TypeScript path alias 是否同时在 tsconfig 和 Vite 中配置。
10. GitLab CI 中的命令是否与本地脚本一致。

不要只解释问题，直接修改文件并重新运行验证命令。最终只在通过或遇到环境限制时汇报。

---

## 最小压缩版提示词

在当前空目录创建一个 PMOS 全栈母仓库，使用 pnpm workspace。必须包含 apps/web、apps/api、packages/service-config、packages/api-client、packages/mock、packages/ui、generators/create-crud.mjs、specs/features/user-management.yaml、.gitlab-ci.yml。前端用 React + TypeScript + Vite + antd + @ant-design/x；后端用 Fastify + TypeScript + Prisma + SQLite。实现用户管理 CRUD 产品验证包：前端页面支持搜索、分页、新增、编辑、删除、启用禁用、loading/error/empty；后端提供 GET/POST/PUT/DELETE /api/users、POST /api/users/:id/status、GET /health、API docs；本地 seed 至少 8 个用户；前端默认通过 Vite proxy 调真实后端，MSW 只在 VITE_ENABLE_MOCK=true 时启用。实现 pnpm setup:local、pnpm dev、pnpm lint、pnpm typecheck、pnpm test、pnpm build、pnpm pmos:verify。GitLab CI 同时验证 web 和 api。不要问问题，直接创建真实代码并运行验证，失败则修复。

# WeKnora 二开准备扫描报告

- generatedAt: 2026-04-23T14:36:29.073Z
- target: WeKnora

## 1. 文件树摘要

- totalFiles: 1070

### 顶层目录

- internal: 504 files
- frontend: 205 files
- migrations: 77 files
- docs: 76 files
- docreader: 51 files
- client: 24 files
- mcp-server: 19 files
- helm: 16 files
- cmd: 13 files
- config: 13 files
- scripts: 12 files
- dataset: 8 files

### 扩展名分布（前 12 项）

- .go: 534
- .vue: 88
- .md: 87
- .sql: 77
- .py: 49
- .ts: 48
- .svg: 35
- .yaml: 27
- .png: 19
- <no-ext>: 18
- .sh: 15
- .json: 10

## 2. 模块摘要

### Go internal 包

- application: 135 files
- types: 77 files
- models: 64 files
- agent: 54 files
- im: 42 files
- handler: 32 files
- infrastructure: 24 files
- datasource: 18 files
- utils: 12 files
- event: 8 files
- sandbox: 7 files
- middleware: 6 files

### 前端 src 模块

- views: 64 files
- assets: 47 files
- components: 26 files
- api: 17 files
- utils: 10 files
- stores: 6 files
- i18n: 5 files
- wailsjs: 5 files
- hooks: 2 files
- App.vue: 1 files
- composables: 1 files
- main.ts: 1 files

### 关键切口文件

- WeKnora/internal/router/router.go
- WeKnora/frontend/src/router/index.ts
- WeKnora/docker-compose.yml
- WeKnora/.env

## 3. 后端路由样本

- total: 183

- GET /health (r, line 92)
- GET /swagger/*any (r, line 99)
- GET /:knowledge_id (chunks, line 162)
- GET /by-id/:id (chunks, line 164)
- DELETE /:knowledge_id/:id (chunks, line 166)
- DELETE /:knowledge_id (chunks, line 168)
- PUT /:knowledge_id/:id (chunks, line 170)
- DELETE /by-id/:id/questions (chunks, line 172)
- POST /file (kb, line 182)
- POST /url (kb, line 184)
- POST /manual (kb, line 186)
- GET /batch (k, line 197)
- GET /:id (k, line 199)
- DELETE /:id (k, line 201)
- PUT /:id (k, line 203)
- PUT /manual/:id (k, line 205)
- POST /:id/reparse (k, line 207)
- GET /:id/download (k, line 209)
- GET /:id/preview (k, line 211)
- PUT /image/:id/:chunk_id (k, line 213)
- PUT /tags (k, line 215)
- GET /search (k, line 217)
- POST /move (k, line 219)
- GET /move/progress/:task_id (k, line 221)

## 4. 前端路由样本

- total: 16

- / (line 39)
- /login (line 43)
- /join (line 49)
- /platform/organizations (line 55)
- /knowledgeBase (line 62)
- /platform (line 68)
- tenant (line 75)
- settings (line 79)
- knowledge-bases (line 85)
- knowledge-bases/:kbId (line 91)
- knowledge-search (line 97)
- agents (line 103)
- creatChat (line 109)
- knowledge-bases/:kbId/creatChat (line 115)
- chat/:chatid (line 121)
- organizations (line 127)

## 5. 当前扫描结论

1. WeKnora 不是一个轻量组件，而是带完整前后端、配置、组织、IM、Agent、MCP、数据源和存储栈的系统。
2. 后端主要切口集中在 `internal/router/router.go`，前端主要切口集中在 `frontend/src/router/index.ts`。
3. 如果直接在现有产品壳上深改，影响面会同时覆盖路由、菜单、会话、知识库、组织和设置。
4. 因此更合理的路径仍是：先能力映射，再决定是“底座裁剪”还是“临时沿用产品壳”。

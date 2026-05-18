# 广告素材情报系统（Ad Intelligence）

面向广告素材采集、分析与情报沉淀的子项目。当前代码处于基础骨架阶段，已经具备最小后端服务入口，但还没有完成素材采集、AI 分析和前端工作台。

这份 README 的目标不是描述理想蓝图，而是让开发者在 3 分钟内判断三件事：

1. 这个项目现在能跑到什么程度。
2. 下一步应该从哪里继续开发。
3. 需要看哪些文档才能避免重复摸索。

## 当前状态

当前已实现：

- TypeScript + Express 基础服务
- `GET /` 基础信息接口
- `GET /health` 健康检查接口
- 基础脚本：`dev`、`start`、`lint`、`build`

当前未实现或未闭环：

- 广告平台采集器
- AI 分析链路
- 数据存储层
- 可用的前端页面入口
- 测试用例

需要特别注意：

- `npm run lint` 当前可通过。
- `npm run build` 当前失败，原因是前端构建缺少 `index.html`。
- `npm run dev:frontend` 可以启动 Vite，但项目还没有实际前端页面。

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 准备环境变量

```bash
cp .env.example .env
```

Windows PowerShell 可改为：

```powershell
Copy-Item .env.example .env
```

### 3. 启动后端

```bash
npm run start
```

或开发模式：

```bash
npm run dev:backend
```

默认端口是 `3001`，可通过 `.env` 中的 `PORT` 覆盖。

### 4. 验证服务

访问：

- `http://localhost:3001/`
- `http://localhost:3001/health`

预期返回：

```json
{ "status": "ok" }
```

## 常用脚本

- `npm run dev`
  同时启动后端和前端开发脚本。注意：前端目前没有实际页面，使用价值有限。
- `npm run dev:backend`
  使用 `tsx watch` 启动后端。
- `npm run dev:frontend`
  启动 Vite 开发服务器。
- `npm run start`
  直接运行 `src/server.ts`。
- `npm run lint`
  执行 TypeScript 类型检查。
- `npm run build`
  先构建前端，再构建后端。当前会因为缺少 `index.html` 而失败。

## 当前目录说明

```text
ad-intelligence/
├─ src/
│  └─ server.ts              # 当前唯一已实现的后端入口
├─ docs/
│  ├─ memory/
│  │  └─ project-memory.md   # 项目记忆与当前范围
│  ├─ developer-guide.md     # 开发者操作手册
│  └─ *.md                   # 历史方案与研究草稿
├─ tests/                    # 预留测试目录，当前为空
├─ .env.example              # 环境变量模板
├─ ARCHITECTURE.md           # 当前架构与演进路线
├─ CLAUDE.md                 # AI 协作说明
└─ package.json              # 脚本与依赖定义
```

## 开发建议顺序

如果要把这个项目从骨架推进到可用版本，建议按这个顺序继续：

1. 先补齐数据模型与素材采集接口，不要先做复杂 UI。
2. 把“采集任务”和“分析任务”拆成清晰模块，避免所有逻辑堆进 `server.ts`。
3. 明确最小可验证链路：
   输入一个广告素材来源 -> 拉取结果 -> 保存结构化数据 -> 返回查询接口。
4. 前端只在后端最小闭环后补一个简单工作台，不要先搭空壳页面。

## 文档入口

- [开发者操作手册](./docs/developer-guide.md)
- [项目架构说明](./ARCHITECTURE.md)
- [项目记忆](./docs/memory/project-memory.md)

## 文档维护原则

为了避免文档再次失真，后续更新请遵守：

- README 只写“开发者第一次进入最需要知道的事实”。
- 架构文档要分清“当前实现”和“目标架构”。
- 规划类内容不要覆盖现状说明。
- 如果脚本、端口、目录或入口发生变化，同一轮开发里同步更新文档。

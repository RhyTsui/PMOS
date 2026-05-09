# PMOS 首次启动指南

## 目的

这份文档定义独立 `PMOS product repo` 的最小首次启动路径，目标不是“本地能勉强跑起来”，而是让另一位操作者也能按同一套步骤完成首跑。

## 前置要求

1. Node.js `22+`
2. npm
3. Git
4. 当前机器允许启动本地前后端开发服务
5. 已从 `.env.example` 创建 `.env`

## 推荐首跑路径

1. 克隆仓库
2. 进入仓库根目录
3. 运行 `npm install`
4. 复制 `.env.example` 为 `.env`
5. 只填写当前要用到的变量
6. 先运行 `npm run lint`
7. 再运行 `npm run build`
8. 最后运行 `npm run dev` 或 `npm start`

## 首跑命令

```bash
npm install
npm run lint
npm run build
npm run dev
```

如果要验证生产近似启动：

```bash
npm start
```

## 首跑通过标准

至少满足以下条件，才能判定当前机器首跑成功：

1. 依赖安装成功
2. `lint` 通过
3. `build` 通过
4. 前端可打开
5. 后端可响应
6. `docs/operations` 里的真源文档可正常阅读
7. 至少一个 workflow 相关页面或接口可访问

## 首跑时优先阅读哪些文档

1. `docs/operations/pmaios-introduction.md`
2. `docs/operations/platform-truth-source-index.md`
3. `docs/operations/current-version-progress.md`
4. `docs/operations/pmaios-v1.0-direction.md`

## 环境变量处理原则

1. 不要把真实密钥提交进仓库
2. 能不填的变量先不填
3. 先完成本地启动，再逐步接入 GitHub、Notion、Dataki 等外部连接器
4. 变量说明统一看 `docs/deployment/environment-variables.md`

## 首跑后建议继续做什么

1. 验证前端主入口是否可读、可操作
2. 验证后端健康检查和基础 API
3. 验证一条最小 workflow 是否能跑通
4. 记录本机遇到的路径、端口、依赖问题
5. 首机通过后继续执行 `docs/deployment/second-machine-verification-checklist.md`

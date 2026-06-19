# 游戏内参 Game Insider（GI）

游戏行业情报信号源平台——比人更快、更全地发现游戏行业情报。

## 当前状态

一期阶段：文档体系建设中。代码仅有最小骨架。

已实现：
- TypeScript + Express 基础服务
- `GET /` 项目信息接口
- `GET /health` 健康检查接口

详见 [落地总体规划](docs/IMPLEMENTATION_PLAN.md)

## 快速开始

```bash
npm install
cp .env.example .env
npm run dev
```

访问 `http://localhost:3001/`

## 项目架构

```
GI（游戏内参）= 情报源生产系统（文本 + 图片 OCR）
    ↓ 同步
Dataki = 知识库与检索系统
    ↓ 检索
小乔智投 = 对话消费入口 → 日报生成
```

核心模块：
1. **Seed 种子系统**（核心发动机）
2. 采集层（Crawl4AI + Playwright + RSS + API + Search）
3. LLM 事件抽取 + 图片 OCR
4. 信号评分 + 趋势检测
5. Dataki 同步
6. Web UI（瀑布流文章展示）

## 文档

| 文档 | 说明 |
|------|------|
| [落地总体规划](docs/IMPLEMENTATION_PLAN.md) | 技术栈、分期计划、编码规范 |
| [核心设计思想](docs/design/01-核心设计思想.md) | 10 条通用设计原则 |
| [CLAUDE 开发规范](CLAUDE.md) | AI 辅助开发规范 |

## 常用命令

```bash
npm run dev          # 开发模式启动
npm run lint         # 类型检查
npm run test         # 单元测试
npm run validate     # 完整校验
```

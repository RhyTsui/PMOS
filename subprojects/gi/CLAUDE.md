# 游戏内参 Game Insider（GI）CLAUDE 配置

## 项目定位
游戏行业情报信号源平台——不是爬虫，不是 Skill，是独立的情报生产系统。
纯文本 + 图片（OCR）情报采集，不做视频/广告素材分析。

```
GI（游戏内参）= 情报源生产系统
Dataki        = 知识库与检索系统
小乔智投       = 对话消费入口
公众号/日报    = 发布消费入口
```

**核心使命**：比人更快、更全地发现游戏行业情报。如果用户自己发现了而系统没采到，系统就失去意义。

## 技术栈
- 后端：TypeScript + Express
- 数据库：SQLite (better-sqlite3)
- 调度：node-cron（零 Redis 依赖）
- 静态页采集：Crawl4AI (Python sidecar)
- 动态页采集：Playwright
- 图片 OCR：Tesseract + Qwen-VL
- LLM：Qwen（通义千问，已有 API）
- 去重：SimHash + URL 规范化（语义检索走 Dataki）
- 知识库：Dataki（已有）
- RSS：RSSHub（自建实例）
- 公众号：WeWe RSS（Docker）
- 变更监控：changedetection.io（Docker）
- 前端：React 19 + Vite 6 + Ant Design 6 + react-fast-masonry
- 所有工具必须免费开源

## 开发规范
- 代码以中文注释为主，变量名用英文
- TypeScript strict 模式，所有类型显式声明
- 所有文件必须 UTF-8 编码（无 BOM）
- 新功能优先写测试
- API 设计遵循 RESTful 风格
- 配置驱动，不硬编码业务参数
- 分层：API → Service → Repository → Model

## 核心模块
1. **Seed 种子系统**（核心发动机，必须做到极致）
   - 四类种子：实体Seed / 事件Seed / 话题Seed / 源Seed
   - 自动评分 + 自进化 + 漏采检测
2. 采集层（Crawl4AI + Playwright + RSS + API + Search）
3. 结构化抽取（LLM 事件抽取 → 事件标题/关键事实/行动建议/事件类型/情绪倾向）
4. 信号处理（评分 + 趋势检测 + SimHash 去重 + 事件合并）
5. Dataki 同步
6. Web UI（瀑布流文章展示 + 搜索 + 过滤）

## 启动命令
- 后端：`npm run dev`
- Python sidecar：`cd src/python && python server.py`
- Docker 服务：`docker-compose up -d`

## 门禁
- `npm run lint` — 类型检查
- `npm run test` — 单元测试
- `npm run check:encoding` — 编码检查（防乱码）
- `npm run validate` — 完整校验

## 关键真源入口
1. `docs/IMPLEMENTATION_PLAN.md` — 落地总体规划文档
2. `docs/design/01-核心设计思想.md` — 核心设计原则
3. `src/config/intelligence-requirements/` — 情报需求配置

## 不变量（不得被局部需求覆盖）
1. Seed 系统是核心发动机，采集上限由种子质量决定
2. 不在本地搭向量库，语义检索全部走 Dataki
3. 所有工具必须免费开源
4. 漏采是最大的失败——必须有漏采检测机制
5. 结构抽取是情报视角（事件标题/关键事实/行动建议），不是广告视角（Hook/卖点/CTA）
6. 日报生成在小乔智投侧，不在 GI
7. 配置驱动，源/种子/评分权重/调度策略全部可配置
8. 不做视频/广告素材分析，纯文本 + 图片 OCR

## 注意事项
- 图片解析需要——很多文章核心信息在图片里
- 角色维度：老板/战略/发行/运营/广告投放/数据部/产品，各有不同关注点
- 本地先跑通再部署，开发阶段不需要运维

# 游戏内参 Game Insider（GI）— 落地总体规划文档

> 版本：1.1 | 最后更新：2026-06-18 | 状态：一期完成，可启动二期开发
> 核心设计思想见：`docs/design/01-核心设计思想.md`

---

## 一、项目定位

**游戏内参 Game Insider（GI）**——纯文本 + 图片（OCR）情报采集，不做视频/广告素材分析。

```
GI（游戏内参）               = 情报源生产系统（文本 + 图片）
Dataki                      = 知识库与检索系统
小乔智投                     = 对话消费入口
公众号/日报                  = 发布消费入口
```

**核心使命**：比人更快、更全地发现游戏行业情报。如果用户自己发现了而系统没采到，系统就失去意义。

### 范围边界（★ 重要）

| 做 | 不做（已隔离） |
|---|--------------|
| ✅ 网页/文章/RSS 文本采集 | ❌ 广告视频采集 |
| ✅ 文章内图片 OCR 提取 | ❌ 视频 OCR/ASR |
| ✅ 图片内容理解（Qwen-VL） | ❌ 广告创意分析 |
| ✅ 事件抽取/评分/趋势检测 | ❌ 广告素材结构化（Hook/卖点/CTA） |
| ✅ 种子系统/源发现/自进化 | ❌ 多账号反风控体系 |
| ✅ 瀑布流 Web UI | ❌ 广告家族/变体聚合 |

**素材相关能力**（广告视频采集/OCR/ASR/创意分析/家族聚合/模板提取等）已隔离到独立规划，不在本项目范围内。原始调研文档保留在 `docs/素材爬虫v*.md` 供未来参考。

---

## 二、分期规划

### 一期：文档体系建设（当前阶段）

**目标**：把规划、设计、规范全部写清楚，为后续开发打好基础。

| 序号 | 文档 | 状态 | 说明 |
|------|------|------|------|
| 1 | `docs/design/01-核心设计思想.md` | ✅ 已完成 | 从 v0.1-v1.8 提炼的 10 条通用原则 |
| 2 | `docs/IMPLEMENTATION_PLAN.md`（本文） | ✅ 已完成 | 落地总体规划 |
| 3 | `CLAUDE.md` | ✅ 已完成 | AI 辅助开发规范 |
| 4 | `docs/design/02-数据模型设计.md` | ✅ 已完成 | 全部数据结构定义（10 个核心模型 + SQLite 表结构） |
| 5 | `docs/design/03-Seed种子系统设计.md` | ✅ 已完成 | 四类种子 + 评分 + 自进化 + 漏采检测 |
| 6 | `docs/design/04-API接口设计.md` | ✅ 已完成 | RESTful API 完整定义（12 个模块） |
| 7 | `docs/design/05-采集器设计.md` | ✅ 已完成 | Crawl4AI/Playwright/RSS/API/Search |
| 8 | `docs/design/06-LLM抽取与评分设计.md` | ✅ 已完成 | 事件抽取 prompt + 信号评分 + 图片理解 |
| 9 | `docs/design/07-角色-关注矩阵.md` | ✅ 已完成 | 7 个角色的关注维度定义 |
| 10 | `docs/design/08-开源工具集成方案.md` | ✅ 已完成 | RSSHub/WeWe RSS/changedetection 等 |
| 11 | `docs/design/09-部署方案.md` | ✅ 已完成 | 本地开发 + Docker 部署 |
| 12 | `docs/design/10-编码规范.md` | ✅ 已完成 | 代码风格 + 防乱码 + Git 规范 |

**一期验收标准**：✅ 所有设计文档已完成，可直接进入二期开发。

### 二期：核心开发（文档完成后启动）

**目标**：跑通 "种子 → 采集 → 抽取 → 评分 → 入库 → Web UI" 最小闭环

- 项目骨架 + SQLite + Express
- Seed 种子系统（核心）
- 采集层（Crawl4AI + RSS + Playwright）
- LLM 事件抽取 + 图片 OCR
- 信号评分 + 去重
- Dataki 同步
- 瀑布流 Web UI
- P0 源：TapTap + GameLook + Steam + 版号 + 公众号

### 三期：自动化 + 扩展

- 定时调度 + 源健康监控
- 自进化引擎 + 源发现
- 从业者管理 + 社媒推理
- 小乔智投日报对接
- P1/P2 源扩展

### 四期：优化 + 部署

- Docker Compose 一键部署
- 采集质量度量体系
- 性能优化

---

## 三、技术栈

| 层 | 技术选型 | 理由 |
|---|---------|------|
| 后端 | TypeScript + Express | 与 PMAIOS 一致，复用 Dataki 客户端 |
| 数据库 | SQLite (better-sqlite3) | 零依赖、查询方便 |
| 调度 | node-cron | 零 Redis 依赖 |
| 静态页采集 | Crawl4AI (Python sidecar) | 中文优化、内置 LLM 抽取、免费 |
| 动态页采集 | Playwright | 需登录/交互、免费 |
| 图片 OCR | Tesseract（Crawl4AI 内置）| 零成本 |
| 图片理解 | Qwen-VL（API）| 图表/截图理解 |
| LLM | Qwen | 已有 API，成本可控 |
| 去重 | SimHash + URL 规范化 | 轻量，语义检索走 Dataki |
| 知识库 | Dataki（已有）| 直接复用 |
| RSS | RSSHub（自建）| 1000+ 网站 |
| 公众号 | WeWe RSS（Docker）| 基于微信读书 |
| 变更监控 | changedetection.io（Docker）| 版号/榜单 |
| 前端 | React 19 + Vite + Ant Design 6 | 已有依赖 |
| 所有工具 | 全部免费开源 | 零费用 |

---

## 四、编码规范

### 4.1 基本规则

- **中文注释为主，变量名用英文**
- **TypeScript strict 模式**，所有类型显式声明
- **分层清晰**：API → Service → Repository → Model
- **配置驱动**，不在代码中硬编码业务参数
- **新功能优先写测试**

### 4.2 文件编码规范（★ 防乱码）

```
⚠️ 所有源代码文件必须使用 UTF-8 编码（无 BOM）
⚠️ 所有配置文件必须使用 UTF-8 编码
⚠️ Git 提交前必须通过编码检查
```

**具体措施**：

```bash
# 1. Git 配置（全局）
git config --global core.quotepath false      # 中文文件名不乱码
git config --global i18n.commitEncoding utf-8  # 提交信息 UTF-8
git config --global i18n.logOutputEncoding utf-8

# 2. 编辑器配置（.editorconfig）
[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true

# 3. Node.js 启动参数（确保 UTF-8）
# package.json scripts 中加：
NODE_OPTIONS="--max-old-space-size=4096"

# 4. 编码检查脚本（加入门禁）
# scripts/check-encoding.sh
find src -name "*.ts" -exec file --mime-encoding {} \; | grep -v utf-8
```

**VSCode 设置**（`.vscode/settings.json`）：
```json
{
  "files.encoding": "utf8",
  "files.autoGuessEncoding": true,
  "[typescript]": {
    "files.encoding": "utf8"
  }
}
```

### 4.3 命名规范

```typescript
// 文件名：kebab-case
// source-registry.ts
// collector-router.ts

// 类名：PascalCase
class SourceRegistry { }
class CollectorRouter { }

// 变量/函数：camelCase
const sourceRegistry = new SourceRegistry();
function collectEvidence() { }

// 常量：UPPER_SNAKE_CASE
const MAX_RETRY_COUNT = 3;
const DEFAULT_CRON_EXPRESSION = '*/15 * * * *';

// 类型/接口：PascalCase
interface IntelSource { }
type EventType = '上线' | '测试' | '版号';

// 枚举值：中文（业务语义）
// ✅ 正确：符合业务语言
type Priority = 'P0' | 'P1' | 'P2' | 'P3';
type EventType = '上线' | '测试' | '预约' | '版号' | '榜单变化' | '买量' | '舆情' | '融资' | '组织动作';

// ❌ 错误：英文枚举值丢失业务语义
type EventType = 'launch' | 'test' | 'reserve';
```

### 4.4 注释规范

```typescript
/**
 * 采集路由分发器
 * 
 * 根据情报源的 accessMethod 自动选择最佳采集器。
 * 支持 5 种采集方式：RSS / API / Crawl4AI / Playwright / Search
 * 
 * @see docs/design/05-采集器设计.md
 */
class CollectorRouter {

  /**
   * 执行采集任务
   * @param job - 采集任务配置
   * @returns 采集到的原始证据列表（已去重）
   * @throws {CollectorError} 采集失败时抛出
   */
  async route(job: CollectionJob): Promise<RawEvidence[]> {
    // 获取情报源配置
    const source = await this.registry.getSource(job.sourceId);
    
    // 自动选择采集器（根据 accessMethod）
    const collector = this.selectCollector(source);
    
    // ...
  }
}
```

### 4.5 错误处理规范

```typescript
// ✅ 正确：自定义错误类型，携带业务上下文
class CollectorError extends Error {
  constructor(
    message: string,
    public readonly sourceId: string,
    public readonly sourceName: string,
    public readonly cause?: unknown,
  ) {
    super(`[${sourceName}] ${message}`);
    this.name = 'CollectorError';
  }
}

// ✅ 正确：错误日志包含上下文
try {
  await collector.collect(source);
} catch (error) {
  logger.error('采集失败', {
    sourceId: source.id,
    sourceName: source.name,
    accessMethod: source.accessMethod,
    error: error instanceof Error ? error.message : String(error),
  });
  // 标记源健康状态
  await this.registry.markFailure(source.id, error);
}

// ❌ 错误：吞掉异常
try {
  await collector.collect(source);
} catch {
  // 什么都不做
}
```

### 4.6 配置管理规范

```typescript
// src/config/settings.ts
// 借鉴 AD 项目的 settings.py 模式

import dotenv from 'dotenv';
dotenv.config();

export interface SystemSettings {
  port: number;
  env: 'local' | 'staging' | 'production';
  dataki: { baseUrl: string; apiKey: string; };
  llm: { defaultModel: string; models: LLMModelConfig[]; };
  scheduling: {
    realtimeCron: string;
    highFreqCron: string;
    dailyBatchCron: string;
  };
}

// 所有配置从环境变量读取，支持 .env 文件
export function loadSettings(): SystemSettings {
  return {
    port: parseInt(process.env.PORT || '3001', 10),
    env: (process.env.NODE_ENV as any) || 'local',
    dataki: {
      baseUrl: process.env.DATAKI_BASE_URL || '',
      apiKey: process.env.DATAKI_API_KEY || '',
    },
    // ...
  };
}
```

### 4.7 门禁命令

```json
// package.json
{
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "lint": "tsc --noEmit",
    "test": "vitest run",
    "check:encoding": "node scripts/check-encoding.mjs",
    "validate": "npm run lint && npm run check:encoding && npm run test"
  }
}
```

---

## 五、角色-关注矩阵

| 角色 | 关注维度 | audience_tags |
|------|---------|---------------|
| 老板 | 战略信号、资本动作、爆款信号、行业趋势、AI应用、组织变革、技术演进 | [战略信号, 资本动作, 爆款信号, 行业趋势, AI应用, 组织变革, 技术演进] |
| 战略 | 新赛道、出海、平台政策、资本并购 | [新赛道, 出海, 平台政策, 资本并购] |
| 发行 | 上线、测试、预约、版号、渠道、发行节奏、买量 | [上线, 测试, 预约, 版号, 渠道, 发行节奏, 买量] |
| 运营 | 活动、版本更新、用户反馈、社区舆情、留存 | [活动, 版本更新, 用户反馈, 社区舆情, 留存] |
| 广告投放 | 买量素材、投放平台、创意趋势、投放强度 | [买量素材, 投放平台, 创意趋势, 投放强度] |
| 数据部 | 数据架构、技术演进、AI提效、行业最佳实践、数据服务 | [数据架构, 技术演进, AI提效, 行业最佳实践, 数据服务] |
| 产品 | 玩法、题材、美术、商业化、系统设计 | [玩法, 题材, 美术, 商业化, 系统设计] |

---

## 六、事件抽取结构（情报视角）

| 字段 | 说明 | 示例 |
|------|------|------|
| eventTitle | 事件标题 | "米哈游《鸣潮》2.0 版本 6/28 上线" |
| keyFacts | 关键事实 | 涉及：米哈游、鸣潮；事件：大版本上线 |
| actionAdvice | 行动建议 | 发行：关注竞品上线节奏；老板：二游赛道竞争加剧 |
| eventType | 事件类型 | 上线 |
| sentiment | 情绪倾向 + 强度 | 正面 / 0.8 |
| audienceTags | 适用角色 | [老板, 发行, 战略] |
| impactScore | 影响评分 | 87 |
| priority | 优先级 | P0 |

---

## 七、集成架构

```
采集平台（ad-intelligence）
├── Crawl4AI sidecar（Python）→ 静态页采集 + 图片 OCR
├── Playwright → 动态页采集
├── RSS 采集器 → RSSHub / WeWe RSS
├── Search 采集器 → Exa / Brave
│
├── Seed 种子系统（★ 核心）
├── LLM 事件抽取（Qwen）
├── 图片理解（Qwen-VL）
├── SimHash 去重
├── 信号评分 + 趋势检测
│
├── SQLite 存储
├── Dataki 同步 ──→ 小乔智投 RAG 检索 ──→ 日报生成
│
├── changedetection.io（Docker）→ 版号/榜单变更
├── WeWe RSS（Docker）→ 微信公众号
└── RSSHub（Docker）→ TapTap/微博/B站
```

---

## 八、关键决策记录

| 决策 | 结论 | 理由 |
|------|------|------|
| 项目范围 | 纯文本 + 图片 OCR | 不做视频/广告素材 |
| 素材相关 | 已隔离 | 独立规划，不在本项目 |
| 日报生成 | 小乔智投侧 | 已有定时任务 + Dataki |
| 调度器 | node-cron + SQLite | 零 Redis 依赖 |
| 去重 | SimHash + URL | 不加本地向量库 |
| 向量检索 | Dataki | 已有，不重复建设 |
| Seed 系统 | V1.0 极致设计 | 采集上限由种子质量决定 |
| 图片解析 | OCR + Qwen-VL | 文章图片包含重要信息 |
| 部署策略 | 本地先跑通再部署 | 开发阶段不需要运维 |
| 一期 | 文档体系 | 先设计清楚再开发 |

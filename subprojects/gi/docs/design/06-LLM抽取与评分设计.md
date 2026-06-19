# 06-LLM 抽取与评分设计

> 版本：1.0 | 创建时间：2026-06-18 | 状态：设计中
> 定义 LLM 事件抽取的 Prompt 设计、信号评分模型、图片理解流程。

---

## 一、处理流水线

```
RawEvidence
    ↓
┌─────────────────────────────────┐
│ Step 1: 预处理                    │
│ - 文本清洗（去广告、去导航等噪音）  │
│ - 图片 OCR（如未处理）             │
│ - 文本截断（超长文章分段/截断）     │
└───────────────┬─────────────────┘
                ↓
┌─────────────────────────────────┐
│ Step 2: 事件抽取                  │
│ - LLM 提取事件标题/关键事实/建议   │
│ - 识别事件类型/情绪/实体           │
│ - 角色-关注矩阵驱动 actionAdvice  │
└───────────────┬─────────────────┘
                ↓
┌─────────────────────────────────┐
│ Step 3: 图片理解（可选）           │
│ - Qwen-VL 理解图表/截图/信息图    │
│ - OCR 结果补充到正文              │
└───────────────┬─────────────────┘
                ↓
┌─────────────────────────────────┐
│ Step 4: 信号评分                  │
│ - impactScore 计算               │
│ - priority 判定                  │
│ - audienceTags 确定              │
└───────────────┬─────────────────┘
                ↓
StructuredEvent
```

---

## 二、事件抽取 Prompt

### 2.1 主抽取 Prompt

```typescript
const EXTRACTION_PROMPT = `你是一个专业的游戏行业情报分析师。你的任务是从给定的文章中提取结构化情报。

## 输入文章

标题：{{title}}
来源：{{sourceName}}（{{sourceType}}）
发布时间：{{publishedAt}}
正文：
{{content}}

{{imageDescriptions}}

## 角色-关注矩阵

请根据以下角色的关注维度来提取情报：

| 角色 | 关注维度 |
|------|---------|
| 老板 | 战略信号、资本动作、爆款信号、行业趋势、AI应用、组织变革、技术演进 |
| 战略 | 新赛道、出海、平台政策、资本并购、竞争格局 |
| 发行 | 上线、测试、预约、版号、渠道、发行节奏、买量 |
| 运营 | 活动、版本更新、用户反馈、社区舆情、留存 |
| 广告投放 | 买量素材、投放平台、创意趋势、投放强度 |
| 数据部 | 数据架构、技术演进、AI提效、行业最佳实践、数据服务 |
| 产品 | 玩法、题材、美术、商业化、系统设计 |

## 输出要求

请以 JSON 格式输出以下字段：

1. **eventTitle**（string）：用一句话概括这篇文章的核心事件。要求：
   - 包含主体（谁）+ 动作（做了什么）+ 关键信息（时间/数据/影响）
   - 例："米哈游《鸣潮》2.0 版本 6/28 上线，首日 DAU 破 500 万"

2. **eventType**（string）：事件类型，从以下选择：
   上线 | 测试 | 预约 | 版号 | 榜单变化 | 买量 | 舆情 | 融资 | 组织动作 | 版本更新 | 出海 | 合作 | 政策 | AI应用

3. **keyFacts**（array）：3-7 条关键事实。每条包含：
   - fact: 事实描述（简洁、可独立理解）
   - importance: "high" | "medium" | "low"
   - entities: 涉及的实体名称列表

4. **actionAdvice**（array）：针对不同角色的行动建议。每条包含：
   - role: 角色名（老板/战略/发行/运营/广告投放/数据部/产品）
   - advice: 具体建议（一句话，可操作）
   - urgency: "immediate" | "watch" | "info"
   
   注意：只为与该事件强相关的角色提供建议（参考角色-关注矩阵）

5. **sentiment**（object）：情绪分析
   - polarity: "positive" | "negative" | "neutral" | "mixed"
   - intensity: 0-1（情绪强度）
   - target: 情绪指向的对象（可选）

6. **entities**（array）：文章中提到的实体。每个包含：
   - name: 实体名称
   - type: "game" | "company" | "person" | "brand"
   - role: "subject" | "object" | "context"（在事件中的角色）

7. **audienceTags**（array）：适用的角色标签列表（从角色-关注矩阵中选择）

8. **publishedAt**（string，可选）：如果文章中有明确的事件发生时间，提取之（ISO 8601）

## 注意事项

- 如果文章没有明确的情报价值（纯广告、无信息量），eventTitle 写 "无有效情报"，eventType 写 "舆情"，keyFacts 为空数组
- 行动建议必须具体可操作，不要泛泛而谈
- 情绪分析要基于文章整体基调，不是个别句子
- 实体识别要尽可能完整

## 输出格式

直接输出 JSON，不要包裹在 markdown 代码块中。`;
```

### 2.2 Prompt 模板变量

```typescript
interface ExtractionInput {
  title: string;
  sourceName: string;
  sourceType: string;
  publishedAt?: string;
  content: string;               // 预处理后的正文（已清洗、已截断）
  imageDescriptions?: string;    // 图片描述（OCR + Qwen-VL 结果）
}

function buildExtractionInput(evidence: RawEvidence, source: IntelSource): ExtractionInput {
  // 1. 文本清洗
  const cleanedContent = cleanContent(evidence.content);

  // 2. 文本截断（最多 6000 字，留 2000 字给 prompt 框架和输出）
  const truncated = truncate(cleanedContent, 6000);

  // 3. 图片描述
  const imageDesc = buildImageDescription(evidence.images);

  return {
    title: evidence.title,
    sourceName: source.name,
    sourceType: source.sourceType,
    publishedAt: evidence.publishedAt,
    content: truncated,
    imageDescriptions: imageDesc,
  };
}
```

### 2.3 图片描述构建

```typescript
function buildImageDescription(images: ImageRef[]): string {
  if (!images || images.length === 0) return '';

  const descriptions = images
    .filter(img => img.ocrText || img.qwenDescription)
    .map(img => {
      const parts = [];
      if (img.ocrText) {
        parts.push(`图片${img.position} OCR文字：${img.ocrText}`);
      }
      if (img.qwenDescription) {
        parts.push(`图片${img.position} 内容描述：${img.qwenDescription}`);
      }
      return parts.join('\n');
    });

  if (descriptions.length === 0) return '';

  return `\n## 文章图片信息\n\n${descriptions.join('\n\n')}`;
}
```

---

## 三、信号评分模型

### 3.1 评分公式

```typescript
/**
 * 信号评分：决定一条情报的重要程度
 * 最终输出：impactScore (0-100) + priority (P0-P3)
 */
function calculateImpactScore(event: StructuredEvent, context: ScoringContext): number {
  let score = 0;

  // ① 实体权重（30%）
  //    涉及大公司的分数更高
  score += 30 * entityWeight(event.entities);

  // ② 事件类型权重（25%）
  //    不同事件类型有不同的基础分
  score += 25 * eventTypeWeight(event.eventType);

  // ③ 角色覆盖（20%）
  //    影响的角色越多，分数越高
  score += 20 * roleCoverageScore(event.audienceTags);

  // ④ 新鲜度（15%）
  //    新发布的事件分数更高
  score += 15 * freshnessScore(event, context);

  // ⑤ 多源交叉验证（10%）
  //    多个源报道同一事件，可信度和重要性都更高
  score += 10 * multiSourceScore(context.sourceCount);

  return clamp(Math.round(score), 0, 100);
}
```

### 3.2 各因子详细设计

**① 实体权重**：
```typescript
const ENTITY_TIERS = {
  // T1: 超一线公司/产品，分数 = 1.0
  tier1: ['腾讯', '网易', '米哈游', '原神', '王者荣耀', '和平精英', '崩坏：星穹铁道'],
  // T2: 一线公司/产品，分数 = 0.8
  tier2: ['莉莉丝', '鹰角', '叠纸', '完美世界', '三七互娱', '明日方舟', '阴阳师'],
  // T3: 知名公司/产品，分数 = 0.6
  tier3: ['西山居', '巨人网络', '心动', 'TapTap', 'FunPlus', 'IGG'],
  // T4: 其他，分数 = 0.4
  tier4: [] as string[],  // 默认
};

function entityWeight(entities: MentionedEntity[]): number {
  if (entities.length === 0) return 0.4;
  
  const maxWeight = Math.max(
    ...entities.map(e => {
      if (ENTITY_TIERS.tier1.includes(e.name)) return 1.0;
      if (ENTITY_TIERS.tier2.includes(e.name)) return 0.8;
      if (ENTITY_TIERS.tier3.includes(e.name)) return 0.6;
      return 0.4;
    })
  );
  
  return maxWeight;
}
```

**② 事件类型权重**：
```typescript
const EVENT_TYPE_WEIGHTS: Record<EventType, number> = {
  '版号':     1.0,   // 政策性强，影响全行业
  '融资':     0.95,  // 资本信号
  '组织动作': 0.9,   // 大公司变动
  '上线':     0.85,  // 竞品动态
  '政策':     0.85,  // 监管变化
  '出海':     0.7,   // 市场拓展
  '榜单变化': 0.7,   // 市场表现
  '买量':     0.6,   // 投放信号
  '舆情':     0.6,   // 口碑信号
  '合作':     0.5,   // IP 联动
  '测试':     0.5,   // 早期信号
  '预约':     0.4,   // 前期信号
  '版本更新': 0.4,   // 日常更新
  'AI应用':   0.7,   // 技术趋势
};

function eventTypeWeight(eventType: EventType): number {
  return EVENT_TYPE_WEIGHTS[eventType] || 0.5;
}
```

**③ 角色覆盖**：
```typescript
function roleCoverageScore(audienceTags: string[]): number {
  if (audienceTags.length === 0) return 0;
  // 覆盖 1 个角色 = 0.3, 2 个 = 0.6, 3+ 个 = 1.0
  return Math.min(1.0, audienceTags.length / 3);
}
```

**④ 新鲜度**：
```typescript
function freshnessScore(event: StructuredEvent, context: ScoringContext): number {
  const publishedAt = event.publishedAt
    ? new Date(event.publishedAt)
    : context.collectedAt;
  
  const hoursAgo = (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60);
  
  if (hoursAgo < 1) return 1.0;     // 1 小时内
  if (hoursAgo < 6) return 0.8;     // 6 小时内
  if (hoursAgo < 24) return 0.6;    // 1 天内
  if (hoursAgo < 72) return 0.4;    // 3 天内
  if (hoursAgo < 168) return 0.2;   // 1 周内
  return 0.1;                       // 超过 1 周
}
```

**⑤ 多源交叉验证**：
```typescript
function multiSourceScore(sourceCount: number): number {
  if (sourceCount <= 1) return 0.3;   // 单源
  if (sourceCount <= 3) return 0.7;   // 2-3 源
  return 1.0;                          // 4+ 源
}
```

### 3.3 优先级判定

```typescript
function determinePriority(impactScore: number): Priority {
  if (impactScore >= 80) return 'P0';  // 立即关注
  if (impactScore >= 60) return 'P1';  // 重要
  if (impactScore >= 40) return 'P2';  // 一般
  return 'P3';                          // 可忽略
}
```

### 3.4 评分配置

```yaml
# src/config/scoring.yaml

scoring:
  weights:
    entity: 0.30
    event_type: 0.25
    role_coverage: 0.20
    freshness: 0.15
    multi_source: 0.10

  priority_thresholds:
    P0: 80
    P1: 60
    P2: 40
    # < 40 = P3

  # 实体分层（可配置）
  entity_tiers:
    tier1: [腾讯, 网易, 米哈游, 原神, 王者荣耀]
    tier2: [莉莉丝, 鹰角, 叠纸, 完美世界]
    tier3: [西山居, 心动, TapTap]
    tier1_score: 1.0
    tier2_score: 0.8
    tier3_score: 0.6
    default_score: 0.4

  # 事件类型权重（可配置）
  event_type_weights:
    版号: 1.0
    融资: 0.95
    组织动作: 0.9
    上线: 0.85
    政策: 0.85
    AI应用: 0.7
    出海: 0.7
    榜单变化: 0.7
    买量: 0.6
    舆情: 0.6
    合作: 0.5
    测试: 0.5
    预约: 0.4
    版本更新: 0.4
```

---

## 四、图片理解（Qwen-VL）

### 4.1 什么图片需要理解

```
需要 Qwen-VL 理解的图片：
✅ 数据图表（DAU/收入/排名变化图）
✅ 信息截图（公告截图、版号列表截图）
✅ 信息图（行业报告中的信息图）
✅ 产品截图（游戏内截图、UI 截图）
✅ 社交媒体截图（推文、评论截图）

不需要 Qwen-VL 理解的图片：
❌ 纯装饰图（banner、分隔线、logo）
❌ 已经通过 OCR 充分提取的图片（纯文字截图）
❌ 过小的图片（< 100x100 px）
❌ 重复图片
```

### 4.2 调用流程

```typescript
/**
 * 图片理解流程
 */
async function processImages(evidence: RawEvidence): Promise<void> {
  for (const image of evidence.images) {
    // 1. 跳过不需要处理的图片
    if (image.processed) continue;
    if (shouldSkipImage(image)) continue;

    // 2. 如果已有 OCR 结果且足够好，跳过 Qwen-VL
    if (image.ocrConfidence && image.ocrConfidence > 0.9) {
      // OCR 已经很好了，不需要 VLM
      image.processed = true;
      continue;
    }

    // 3. 调用 Qwen-VL
    try {
      const description = await callQwenVL(image.url, {
        prompt: `请描述这张图片的内容。如果包含数据/图表，请提取关键数据点。
                 如果包含文字信息，请总结文字的核心内容。
                 用中文回答，简洁明了，不超过 200 字。`,
      });
      
      image.qwenDescription = description;
      image.processed = true;
    } catch (error) {
      // 图片理解失败不影响主流程
      image.processed = true;
      console.warn(`图片理解失败: ${image.url}`, error);
    }
  }
}

function shouldSkipImage(image: ImageRef): boolean {
  // 跳过太小的图片
  // 跳过纯装饰图（可通过 URL 模式判断）
  const skipPatterns = [
    /logo/i, /banner/i, /icon/i, /avatar/i,
    /loading/i, /placeholder/i, /blank/i,
  ];
  return skipPatterns.some(p => p.test(image.url));
}
```

### 4.3 Qwen-VL 调用

```typescript
async function callQwenVL(imageUrl: string, options: { prompt: string }): Promise<string> {
  const response = await fetch(`${QWEN_BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${QWEN_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'qwen-vl-max',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: imageUrl } },
            { type: 'text', text: options.prompt },
          ],
        },
      ],
      max_tokens: 500,
    }),
  });

  const data = await response.json();
  return data.choices[0].message.content;
}
```

---

## 五、文本预处理

### 5.1 清洗规则

```typescript
/**
 * 文本清洗：去除噪音，保留核心内容
 */
function cleanContent(rawContent: string): string {
  let content = rawContent;

  // 1. 去除常见噪音
  const noisePatterns = [
    /阅读全文\s*>>/g,
    /点击阅读原文/g,
    /扫码关注/g,
    /长按识别二维码/g,
    /点击.*?关注/g,
    /广告/g,
    /推广/g,
    /商务合作/g,
  ];
  for (const pattern of noisePatterns) {
    content = content.replace(pattern, '');
  }

  // 2. 去除多余空白
  content = content
    .replace(/\n{3,}/g, '\n\n')   // 多个空行合并
    .replace(/[ \t]+/g, ' ')       // 多个空格合并
    .trim();

  return content;
}

/**
 * 文本截断：保留前 N 个字符
 */
function truncate(content: string, maxLength: number): string {
  if (content.length <= maxLength) return content;
  
  // 在句子边界截断
  const truncated = content.substring(0, maxLength);
  const lastPeriod = Math.max(
    truncated.lastIndexOf('。'),
    truncated.lastIndexOf('！'),
    truncated.lastIndexOf('？'),
    truncated.lastIndexOf('.'),
  );
  
  if (lastPeriod > maxLength * 0.8) {
    return truncated.substring(0, lastPeriod + 1);
  }
  
  return truncated + '...';
}
```

---

## 六、LLM 调用管理

### 6.1 调用配置

```yaml
# src/config/llm.yaml

llm:
  # 事件抽取
  extraction:
    model: qwen-plus          # 用性价比最高的模型
    temperature: 0.1          # 低温度，保证稳定性
    max_tokens: 2000
    timeout: 30000            # 30s 超时
    retry: 2

  # 种子扩展
  seed_expansion:
    model: qwen-max           # 用最强模型
    temperature: 0.7          # 高温度，保证创造性
    max_tokens: 3000
    timeout: 60000

  # 图片理解
  image_understanding:
    model: qwen-vl-max
    temperature: 0.1
    max_tokens: 500
    timeout: 30000

  # 限流
  rate_limit:
    requests_per_minute: 30
    requests_per_day: 1000
```

### 6.2 错误处理

```typescript
/**
 * LLM 调用封装（带重试和限流）
 */
async function callLLM(params: LLMCallParams): Promise<string> {
  // 限流检查
  await rateLimiter.acquire();

  for (let attempt = 0; attempt <= params.maxRetries; attempt++) {
    try {
      const response = await fetch(`${params.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${params.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: params.model,
          messages: params.messages,
          temperature: params.temperature,
          max_tokens: params.maxTokens,
        }),
        signal: AbortSignal.timeout(params.timeout),
      });

      if (!response.ok) {
        if (response.status === 429) {
          // 被限流，等待后重试
          await sleep(60_000);
          continue;
        }
        throw new Error(`LLM API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      if (attempt === params.maxRetries) throw error;
      await sleep(1000 * (attempt + 1));  // 线性退避
    }
  }

  throw new Error('LLM call failed after retries');
}
```

---

## 七、输出质量保障

### 7.1 JSON 解析保障

```typescript
/**
 * LLM 输出解析（带容错）
 */
function parseExtractionResult(raw: string): StructuredEvent | null {
  // 1. 尝试直接解析
  try {
    return JSON.parse(raw);
  } catch {
    // 继续尝试
  }

  // 2. 尝试提取 JSON 块（LLM 有时会包在 markdown 代码块里）
  const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1]);
    } catch {
      // 继续尝试
    }
  }

  // 3. 尝试提取第一个 { 到最后一个 } 之间的内容
  const firstBrace = raw.indexOf('{');
  const lastBrace = raw.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1) {
    try {
      return JSON.parse(raw.substring(firstBrace, lastBrace + 1));
    } catch {
      // 失败
    }
  }

  // 4. 完全失败
  console.error('Failed to parse LLM output:', raw.substring(0, 200));
  return null;
}
```

### 7.2 输出校验

```typescript
import { z } from 'zod';

const ExtractionSchema = z.object({
  eventTitle: z.string(),
  eventType: z.enum([
    '上线', '测试', '预约', '版号', '榜单变化',
    '买量', '舆情', '融资', '组织动作', '版本更新',
    '出海', '合作', '政策', 'AI应用',
  ]),
  keyFacts: z.array(z.object({
    fact: z.string(),
    importance: z.enum(['high', 'medium', 'low']),
    entities: z.array(z.string()),
  })).min(0).max(10),
  actionAdvice: z.array(z.object({
    role: z.string(),
    advice: z.string(),
    urgency: z.enum(['immediate', 'watch', 'info']),
  })).max(7),
  sentiment: z.object({
    polarity: z.enum(['positive', 'negative', 'neutral', 'mixed']),
    intensity: z.number().min(0).max(1),
    target: z.string().optional(),
  }),
  entities: z.array(z.object({
    name: z.string(),
    type: z.enum(['game', 'company', 'person', 'brand']),
    role: z.enum(['subject', 'object', 'context']),
  })),
  audienceTags: z.array(z.string()),
  publishedAt: z.string().optional(),
});

function validateExtraction(raw: unknown): StructuredEvent | null {
  const result = ExtractionSchema.safeParse(raw);
  if (!result.success) {
    console.warn('Extraction validation failed:', result.error);
    return null;
  }
  return result.data as StructuredEvent;
}
```

---

## 八、设计决策

| 决策 | 结论 | 理由 |
|------|------|------|
| 抽取模型 | qwen-plus | 性价比最优，够用 |
| 种子扩展模型 | qwen-max | 需要创造性 |
| 图片理解 | qwen-vl-max | 需要视觉理解能力 |
| 温度设置 | 抽取 0.1 / 扩展 0.7 | 抽取要稳定，扩展要发散 |
| JSON 解析 | 多级容错 | LLM 输出不可控，必须容错 |
| 输出校验 | Zod schema | 强类型保障 |
| 评分模型 | 规则模型 | V1 简单可控，V2 可升级 ML |
| 文本截断 | 6000 字 + 句子边界 | 留空间给 prompt 和输出 |

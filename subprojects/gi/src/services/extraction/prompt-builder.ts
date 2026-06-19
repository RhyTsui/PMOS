/**
 * 事件抽取 Prompt 模板
 *
 * @see docs/design/06-LLM抽取与评分设计.md
 */
import type { RawEvidence, IntelSource, ImageRef } from '../../models/types.js';

/**
 * 构建事件抽取 Prompt
 */
export function buildExtractionPrompt(evidence: RawEvidence, source: IntelSource): string {
  // 文本预处理
  const cleanedContent = cleanContent(evidence.content);
  const truncatedContent = truncate(cleanedContent, 6000);

  // 图片描述
  const imageDescriptions = buildImageDescriptions(evidence.images);

  return `你是一个专业的游戏行业情报分析师。你的任务是从给定的文章中提取结构化情报。

## 输入文章

标题：${evidence.title}
来源：${source.name}（${source.sourceType}）
发布时间：${evidence.publishedAt || '未知'}
正文：
${truncatedContent}
${imageDescriptions}

## 角色-关注矩阵

请根据以下角色的关注维度来提取情报：

| 角色 | 关注维度 |
|------|---------|
| 组织 | 战略信号、资本动作、爆款信号、行业趋势、AI应用、组织变革、技术演进 |
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
   - 例："米哈游《原神》4.0 版本 8/16 上线，新增沙漠地图"

2. **eventType**（string）：事件类型，从以下选择：
   上线 | 测试 | 预约 | 版号 | 榜单变化 | 买量 | 舆情 | 融资 | 组织动作 | 版本更新 | 出海 | 合作 | 政策 | AI应用

3. **keyFacts**（array）：3-7 条关键事实。每条包含：
   - fact: 事实描述（简洁、可独立理解）
   - importance: "high" | "medium" | "low"
   - entities: 涉及的实体名称列表

4. **actionAdvice**（array）：针对不同角色的行动建议。每条包含：
   - role: 角色名（组织/战略/发行/运营/广告投放/数据部/产品）
   - advice: 具体建议（一句话，可操作）
   - urgency: "immediate" | "watch" | "info"

   注意：只为与该事件强相关的角色提供建议

5. **sentiment**（object）：情绪分析
   - polarity: "positive" | "negative" | "neutral" | "mixed"
   - intensity: 0-1（情绪强度）
   - target: 情绪指向的对象（可选）

6. **entities**（array）：文章中提到的实体。每个包含：
   - name: 实体名称
   - type: "game" | "company" | "person" | "brand"
   - role: "subject" | "object" | "context"

7. **audienceTags**（array）：适用的角色标签列表

8. **publishedAt**（string，可选）：如果文章中有明确的事件发生时间

## 注意事项

- 如果文章没有明确的情报价值（纯广告、无信息量），eventTitle 写 "无有效情报"
- 行动建议必须具体可操作，不要泛泛而谈
- 情绪分析要基于文章整体基调

## 输出格式

直接输出 JSON，不要包裹在 markdown 代码块中。`;
}

/**
 * 构建种子扩展 Prompt
 */
export function buildSeedExpansionPrompt(seedText: string, seedType: string, score: number, discoveryCount: number): string {
  return `当前高效种子：${seedText}（类型：${seedType}，评分：${score}）
这个种子最近发现了 ${discoveryCount} 条有效情报。

请推荐 5-10 个相关的新种子，覆盖：
1. 相关实体（游戏/公司/人名）
2. 相关事件方向
3. 相关话题趋势

每个种子请用 JSON 格式输出：
{
  "seeds": [
    {
      "seedType": "entity" | "event" | "topic",
      "text": "种子文本",
      "reason": "推荐理由"
    }
  ]
}

直接输出 JSON。`;
}

/**
 * 清洗文本内容
 */
function cleanContent(rawContent: string): string {
  let content = rawContent;

  // 去除 HTML 标签
  content = content
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')  // 移除 script
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')    // 移除 style
    .replace(/<[^>]+>/g, ' ')                           // 移除所有 HTML 标签
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // 去除常见噪音
  const noisePatterns = [
    /阅读全文\s*>>/g,
    /点击阅读原文/g,
    /扫码关注/g,
    /长按识别二维码/g,
    /点击.*?关注/g,
    /商务合作/g,
  ];
  for (const pattern of noisePatterns) {
    content = content.replace(pattern, '');
  }

  // 去除多余空白
  content = content
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();

  return content;
}

/**
 * 截断文本（在句子边界）
 */
function truncate(content: string, maxLength: number): string {
  if (content.length <= maxLength) return content;

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

/**
 * 构建图片描述
 */
function buildImageDescriptions(images: ImageRef[]): string {
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

/**
 * Dataki 直接同步服务
 *
 * 直接从结构化事件同步到 Dataki 知识库
 */
import { StructuredEventRepository } from '../../repositories/structured-event-repository.js';
import { RawEvidenceRepository } from '../../repositories/raw-evidence-repository.js';

/**
 * Dataki 配置
 */
interface DatakiConfig {
  baseUrl: string;
  apiKey: string;
  knowledgeBaseId: string;
}

/**
 * 同步结果
 */
interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: string[];
}

/**
 * Dataki 直接同步服务
 */
export class DatakiDirectSyncService {
  private eventRepo: StructuredEventRepository;
  private evidenceRepo: RawEvidenceRepository;
  private config: DatakiConfig;

  constructor() {
    this.eventRepo = new StructuredEventRepository();
    this.evidenceRepo = new RawEvidenceRepository();
    this.config = {
      baseUrl: process.env.DATAKI_BASE_URL || '',
      apiKey: process.env.DATAKI_API_KEY || '',
      knowledgeBaseId: process.env.DATAKI_KNOWLEDGE_BASE_ID || '',
    };
  }

  /**
   * 检查配置是否完整
   */
  isConfigured(): boolean {
    return !!(this.config.baseUrl && this.config.apiKey && this.config.knowledgeBaseId);
  }

  /**
   * 检查 Dataki 连接
   */
  async checkConnection(): Promise<{ connected: boolean; message: string }> {
    try {
      const response = await fetch(`${this.config.baseUrl}/knowledge-bases`, {
        headers: { 'X-API-Key': this.config.apiKey },
      });

      if (response.ok) {
        return { connected: true, message: 'Dataki 连接正常' };
      }
      return { connected: false, message: `连接失败: HTTP ${response.status}` };
    } catch (error) {
      return { connected: false, message: `连接异常: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  /**
   * 获取知识库信息
   */
  async getKnowledgeBaseInfo(): Promise<any> {
    const response = await fetch(`${this.config.baseUrl}/knowledge-bases`, {
      headers: { 'X-API-Key': this.config.apiKey },
    });

    if (!response.ok) {
      throw new Error(`获取知识库列表失败: HTTP ${response.status}`);
    }

    const data = await response.json() as any;
    const kb = data.data?.find((k: any) => k.id === this.config.knowledgeBaseId);

    if (!kb) {
      throw new Error(`知识库 ${this.config.knowledgeBaseId} 不存在`);
    }

    return {
      id: kb.id,
      name: kb.name,
      knowledgeCount: kb.knowledge_count,
      chunkCount: kb.chunk_count,
      isProcessing: kb.is_processing,
      createdAt: kb.created_at,
      updatedAt: kb.updated_at,
    };
  }

  /**
   * 同步事件到 Dataki
   */
  async syncEvents(limit: number = 50): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      errors: [],
    };

    try {
      // 获取结构化事件（按评分排序）
      const events = this.eventRepo.findTopScored(limit);

      if (events.length === 0) {
        return { ...result, success: false };
      }

      for (const event of events) {
        try {
          await this.pushEventToDataki(event);
          result.synced++;
        } catch (error) {
          result.failed++;
          const message = error instanceof Error ? error.message : String(error);
          result.errors.push(`Event ${event.id}: ${message}`);
        }
      }
    } catch (error) {
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : String(error));
    }

    return result;
  }

  /**
   * 推送单个结构化事件到 Dataki
   */
  private async pushEventToDataki(event: any): Promise<void> {
    // 获取关联的原始证据
    const evidence = this.evidenceRepo.findById(event.evidenceId);

    // 构建文档内容（Markdown 格式）
    const content = this.buildEventContent(event, evidence);

    // 构建 Dataki 文档
    const doc = {
      title: event.eventTitle || '未命名事件',
      description: this.buildDescription(event),
      content: content,
    };

    // 调用 Dataki API 创建文档
    const createResponse = await fetch(`${this.config.baseUrl}/knowledge-bases/${this.config.knowledgeBaseId}/knowledge/manual`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.config.apiKey,
      },
      body: JSON.stringify(doc),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      throw new Error(`Dataki API 错误: ${createResponse.status} - ${errorText}`);
    }

    const createResult = await createResponse.json() as any;
    const knowledgeId = createResult.data?.id;

    if (!knowledgeId) {
      throw new Error('创建文档成功但未返回 ID');
    }

    // 触发解析
    await this.triggerReparse(knowledgeId);

    // 启用文档参与检索
    await this.enableKnowledge(knowledgeId);
  }

  /**
   * 触发文档重新解析
   */
  private async triggerReparse(knowledgeId: string): Promise<void> {
    const response = await fetch(`${this.config.baseUrl}/knowledge/${knowledgeId}/reparse`, {
      method: 'POST',
      headers: {
        'X-API-Key': this.config.apiKey,
      },
    });

    if (!response.ok) {
      console.warn(`[Dataki] 触发解析失败: ${response.status}`);
    }
  }

  /**
   * 启用文档参与检索
   */
  private async enableKnowledge(knowledgeId: string): Promise<void> {
    const response = await fetch(`${this.config.baseUrl}/knowledge/${knowledgeId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.config.apiKey,
      },
      body: JSON.stringify({ enable_status: 'enabled' }),
    });

    if (!response.ok) {
      console.warn(`[Dataki] 启用文档失败: ${response.status}`);
    }
  }

  /**
   * 构建文档描述（用于 Dataki 列表显示）
   */
  private buildDescription(event: any): string {
    const parts: string[] = [];

    // 事件类型和优先级
    parts.push(`[${event.eventType}] [${event.priority}]`);

    // 关键事实摘要（前2条）
    if (event.keyFacts && event.keyFacts.length > 0) {
      const topFacts = event.keyFacts.slice(0, 2).map((f: any) => f.fact);
      parts.push(topFacts.join('；'));
    }

    // 影响评分
    parts.push(`(评分: ${event.impactScore})`);

    return parts.join(' ');
  }

  /**
   * 构建事件文档内容（Markdown 格式）
   */
  private buildEventContent(event: any, evidence?: any): string {
    const parts: string[] = [];

    // 事件标题
    parts.push(`# ${event.eventTitle}\n`);

    // 基本信息
    parts.push(`## 基本信息\n`);
    parts.push(`- **事件类型**: ${event.eventType}`);
    parts.push(`- **优先级**: ${event.priority}`);
    parts.push(`- **影响评分**: ${event.impactScore}`);
    parts.push(`- **抽取时间**: ${event.extractedAt}`);
    parts.push(`- **模型**: ${event.model} (置信度: ${(event.confidence * 100).toFixed(0)}%)\n`);

    // 关键事实
    if (event.keyFacts && event.keyFacts.length > 0) {
      parts.push(`## 关键事实\n`);
      event.keyFacts.forEach((fact: any, i: number) => {
        const importance = fact.importance === 'high' ? '🔴' : fact.importance === 'medium' ? '🟡' : '🟢';
        parts.push(`${i + 1}. ${importance} **[${fact.importance}]** ${fact.fact}`);
        if (fact.entities && fact.entities.length > 0) {
          parts.push(`   - 涉及实体: ${fact.entities.join(', ')}`);
        }
      });
      parts.push('');
    }

    // 行动建议
    if (event.actionAdvice && event.actionAdvice.length > 0) {
      parts.push(`## 行动建议\n`);
      event.actionAdvice.forEach((advice: any, i: number) => {
        const urgency = advice.urgency === 'immediate' ? '⚡ 立即' : advice.urgency === 'watch' ? '👀 关注' : 'ℹ️ 了解';
        // 将"老板"替换为"组织"
        const role = advice.role === '老板' ? '组织' : advice.role;
        parts.push(`${i + 1}. **[${role}]** ${urgency}`);
        parts.push(`   ${advice.advice}`);
      });
      parts.push('');
    }

    // 情绪分析
    if (event.sentiment) {
      parts.push(`## 情绪分析\n`);
      const polarity = event.sentiment.polarity === 'positive' ? '👍 正面' :
                       event.sentiment.polarity === 'negative' ? '👎 负面' : '➖ 中性';
      parts.push(`- **倾向**: ${polarity}`);
      parts.push(`- **强度**: ${(event.sentiment.intensity * 100).toFixed(0)}%`);
      if (event.sentiment.target) {
        parts.push(`- **对象**: ${event.sentiment.target}`);
      }
      parts.push('');
    }

    // 涉及实体
    if (event.entities && event.entities.length > 0) {
      parts.push(`## 涉及实体\n`);
      const byType: Record<string, string[]> = {};
      event.entities.forEach((e: any) => {
        if (!byType[e.type]) byType[e.type] = [];
        byType[e.type].push(e.name);
      });
      Object.entries(byType).forEach(([type, names]) => {
        const typeLabel = type === 'game' ? '🎮 游戏' :
                         type === 'company' ? '🏢 公司' :
                         type === 'person' ? '👤 人物' :
                         type === 'brand' ? '🏷️ 品牌' : type;
        parts.push(`- **${typeLabel}**: ${names.join(', ')}`);
      });
      parts.push('');
    }

    // 适用角色
    if (event.audienceTags && event.audienceTags.length > 0) {
      parts.push(`## 适用角色\n`);
      // 将"老板"替换为"组织"
      const tags = event.audienceTags.map((tag: string) => tag === '老板' ? '组织' : tag);
      parts.push(tags.map((tag: string) => `\`${tag}\``).join(' · '));
      parts.push('');
    }

    // 原始正文（如果有足够长度的内容）
    if (evidence && evidence.content && evidence.content.length > 200) {
      parts.push(`## 原始正文\n`);
      parts.push(`> 来源: ${evidence.url || '未知'}\n`);
      // 截取前 3000 字符
      const content = evidence.content.length > 3000
        ? evidence.content.substring(0, 3000) + '\n\n...(内容过长，已截断)'
        : evidence.content;
      parts.push(content);
      parts.push('');
    }

    // 元信息
    parts.push(`---`);
    parts.push(`*此情报由 GI 游戏内参系统自动采集并抽取*`);

    return parts.join('\n');
  }

  /**
   * 构建文档内容
   */
  private buildContent(event: any): string {
    const parts: string[] = [];

    // 事件标题
    parts.push(`# ${event.eventTitle}\n`);

    // 基本信息
    parts.push(`**事件类型**: ${event.eventType}`);
    parts.push(`**优先级**: ${event.priority}`);
    parts.push(`**影响评分**: ${event.impactScore}`);
    parts.push(`**抽取时间**: ${event.extractedAt}\n`);

    // 关键事实
    if (event.keyFacts && event.keyFacts.length > 0) {
      parts.push('## 关键事实\n');
      event.keyFacts.forEach((fact: any, i: number) => {
        const importance = fact.importance === 'high' ? '🔴' : fact.importance === 'medium' ? '🟡' : '🟢';
        parts.push(`${i + 1}. ${importance} ${fact.fact}`);
        if (fact.entities && fact.entities.length > 0) {
          parts.push(`   - 涉及实体: ${fact.entities.join(', ')}`);
        }
      });
      parts.push('');
    }

    // 行动建议
    if (event.actionAdvice && event.actionAdvice.length > 0) {
      parts.push('## 行动建议\n');
      event.actionAdvice.forEach((advice: any, i: number) => {
        const urgency = advice.urgency === 'immediate' ? '⚡' : advice.urgency === 'watch' ? '👀' : 'ℹ️';
        parts.push(`${i + 1}. **[${advice.role}]** ${urgency} ${advice.advice}`);
      });
      parts.push('');
    }

    // 情绪分析
    if (event.sentiment) {
      parts.push('## 情绪分析\n');
      parts.push(`- **倾向**: ${event.sentiment.polarity === 'positive' ? '正面' : event.sentiment.polarity === 'negative' ? '负面' : '中性'}`);
      parts.push(`- **强度**: ${(event.sentiment.intensity * 100).toFixed(0)}%`);
      if (event.sentiment.target) {
        parts.push(`- **对象**: ${event.sentiment.target}`);
      }
      parts.push('');
    }

    // 涉及实体
    if (event.entities && event.entities.length > 0) {
      parts.push('## 涉及实体\n');
      const byType: Record<string, string[]> = {};
      event.entities.forEach((e: any) => {
        if (!byType[e.type]) byType[e.type] = [];
        byType[e.type].push(e.name);
      });
      Object.entries(byType).forEach(([type, names]) => {
        parts.push(`- **${type}**: ${names.join(', ')}`);
      });
      parts.push('');
    }

    // 适用角色
    if (event.audienceTags && event.audienceTags.length > 0) {
      parts.push(`**适用角色**: ${event.audienceTags.join(', ')}`);
    }

    return parts.join('\n');
  }
}

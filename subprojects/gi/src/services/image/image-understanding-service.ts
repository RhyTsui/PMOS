/**
 * 图片理解服务
 *
 * 调用 Qwen-VL 对文章中的图片进行内容描述
 * 描述结果存入 ImageRef.qwenDescription，供后续 LLM 抽取使用
 */
import { QwenClient, createLLMClient } from '../../lib/llm-client.js';
import { RawEvidenceRepository } from '../../repositories/raw-evidence-repository.js';
import type { RawEvidence, ImageRef } from '../../models/types.js';

/**
 * 图片理解配置
 */
export interface ImageUnderstandingConfig {
  /** 每篇文章最多处理的图片数 */
  maxImagesPerEvidence: number;
  /** 图片描述 prompt */
  descriptionPrompt: string;
  /** 是否跳过小图片（像素估计） */
  skipSmallImages: boolean;
}

const DEFAULT_CONFIG: ImageUnderstandingConfig = {
  maxImagesPerEvidence: 5,
  descriptionPrompt: `你是一个游戏行业情报分析助手。请仔细观察这张图片，用 2-3 句话描述：
1. 图片的主要内容是什么（人物/产品/场景/数据图表等）
2. 如果包含文字，请提取关键文字信息
3. 如果与游戏行业相关，指出关键信息（如新游截图、公司 logo、数据图表、发布会照片等）

请用中文回答，直接描述，不要加"这张图片"等前缀。`,
  skipSmallImages: true,
};

/**
 * 图片理解服务
 */
export class ImageUnderstandingService {
  private llm: QwenClient;
  private evidenceRepo: RawEvidenceRepository;
  private config: ImageUnderstandingConfig;

  constructor(config: Partial<ImageUnderstandingConfig> = {}) {
    this.llm = createLLMClient();
    this.evidenceRepo = new RawEvidenceRepository();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 处理单条证据的所有图片
   *
   * 对未处理的图片调用 Qwen-VL 生成描述，
   * 更新 evidence 的 images 字段
   */
  async processImages(evidenceId: string): Promise<ImageProcessResult> {
    const evidence = this.evidenceRepo.findById(evidenceId);
    if (!evidence) {
      return { processed: 0, failed: 0, descriptions: [] };
    }

    const images = evidence.images || [];
    if (images.length === 0) {
      return { processed: 0, failed: 0, descriptions: [] };
    }

    const result: ImageProcessResult = {
      processed: 0,
      failed: 0,
      descriptions: [],
    };

    // 限制处理数量
    const toProcess = images
      .filter(img => !img.processed && !img.qwenDescription)
      .slice(0, this.config.maxImagesPerEvidence);

    for (const image of toProcess) {
      try {
        // 跳过明显是小图标的 URL
        if (this.config.skipSmallImages && this.isLikelyIcon(image.url)) {
          image.processed = true;
          continue;
        }

        const description = await this.describeImage(image.url);
        if (description) {
          image.qwenDescription = description;
          image.processed = true;
          result.processed++;
          result.descriptions.push({
            position: image.position,
            url: image.url,
            description,
          });
          console.log(`  [图片理解] 位置${image.position}: ${description.substring(0, 60)}...`);
        }
      } catch (error) {
        result.failed++;
        const msg = error instanceof Error ? error.message : String(error);
        console.warn(`  [图片理解] 位置${image.position} 失败: ${msg}`);
      }
    }

    // 更新数据库中的 images 字段
    if (result.processed > 0) {
      this.evidenceRepo.update(evidenceId, { images } as Partial<RawEvidence>);
    }

    return result;
  }

  /**
   * 调用 Qwen-VL 描述单张图片
   */
  private async describeImage(imageUrl: string): Promise<string | null> {
    try {
      const description = await this.llm.callVision(imageUrl, this.config.descriptionPrompt);
      return description?.trim() || null;
    } catch (error) {
      // 某些图片可能无法访问，静默失败
      return null;
    }
  }

  /**
   * 简单启发式：判断是否可能是小图标
   */
  private isLikelyIcon(url: string): boolean {
    const lower = url.toLowerCase();
    // 常见图标/装饰性图片路径特征
    const iconPatterns = [
      /icon/i, /logo(?!.*game)/i, /avatar/i, /emoji/i,
      /favicon/i, /badge/i, /sprite/i, /16x16/i, /32x32/i, /48x48/i,
      /btn_|button_|arrow_|check_|close_/i,
    ];
    return iconPatterns.some(p => p.test(url));
  }

  /**
   * 批量描述多张图片
   *
   * @param images 图片数组，每个图片包含 url 和可选的 alt 文本
   * @returns 描述结果数组
   */
  async describeImages(images: Array<{ url: string; alt?: string }>): Promise<Array<{ url: string; description: string | null }>> {
    const results: Array<{ url: string; description: string | null }> = [];

    for (const image of images) {
      // 跳过明显是小图标的 URL
      if (this.config.skipSmallImages && this.isLikelyIcon(image.url)) {
        continue;
      }

      try {
        const description = await this.describeImage(image.url);
        results.push({
          url: image.url,
          description,
        });
      } catch (error) {
        results.push({
          url: image.url,
          description: null,
        });
      }
    }

    return results;
  }

  /**
   * 构建图片描述文本（供 prompt 使用）
   */
  buildImageDescriptionsText(images: Array<{ url?: string; description?: string; qwenDescription?: string; position?: number }>): string {
    const processed = images.filter(img => img.qwenDescription || img.description);
    if (processed.length === 0) return '';

    const parts: string[] = [];
    for (let i = 0; i < processed.length; i++) {
      const img = processed[i];
      const desc = img.qwenDescription || img.description;
      const pos = img.position || (i + 1);
      parts.push(`图片${pos}：${desc}`);
    }
    return `\n## 文章图片内容描述\n\n${parts.join('\n')}`;
  }
}

/**
 * 图片处理结果
 */
export interface ImageProcessResult {
  processed: number;
  failed: number;
  descriptions: Array<{
    position: number;
    url: string;
    description: string;
  }>;
}

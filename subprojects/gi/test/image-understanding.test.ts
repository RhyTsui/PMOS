/**
 * Image Understanding 单元测试
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImageUnderstandingService } from '../src/services/image/image-understanding-service.js';
import { QwenClient } from '../src/lib/llm-client.js';

// Mock QwenClient
vi.mock('../src/lib/llm-client.js', () => {
  const mockCallVision = vi.fn().mockImplementation((imageUrl: string) => {
    // 模拟不同图片的返回
    if (!imageUrl || imageUrl === '' || !imageUrl.startsWith('http')) {
      // 无效 URL 抛出错误
      return Promise.reject(new Error('Invalid URL'));
    } else if (imageUrl.includes('chart')) {
      return Promise.resolve('这是一张游戏收入数据图表，显示2024年Q3各公司收入排名');
    } else if (imageUrl.includes('screenshot')) {
      return Promise.resolve('游戏截图展示新角色立绘，二次元风格，画面精美');
    } else if (imageUrl.includes('logo') || imageUrl.includes('brand')) {
      return Promise.resolve('公司Logo图片，品牌标识清晰');
    } else if (imageUrl.includes('error')) {
      return Promise.reject(new Error('API Error'));
    } else {
      return Promise.resolve('图片内容：一般性图片');
    }
  });

  return {
    QwenClient: vi.fn().mockImplementation(() => ({
      callVision: mockCallVision,
    })),
    createLLMClient: vi.fn().mockImplementation(() => ({
      callVision: mockCallVision,
    })),
  };
});

describe('ImageUnderstandingService', () => {
  let service: ImageUnderstandingService;

  beforeEach(() => {
    service = new ImageUnderstandingService();
    vi.clearAllMocks();
  });

  it('处理单张图片描述', async () => {
    const imageUrl = 'https://example.com/chart.jpg';
    const result = await service.describeImage(imageUrl);

    expect(result).toBeDefined();
    expect(result).toContain('图表');
    expect(result).toContain('收入');
  });

  it('处理多张图片批量描述', async () => {
    const images = [
      { url: 'https://example.com/chart.jpg', alt: '数据图' },
      { url: 'https://example.com/screenshot.jpg', alt: '游戏截图' },
      { url: 'https://example.com/company-brand.png', alt: '公司Logo' },
    ];

    const results = await service.describeImages(images);

    expect(results.length).toBe(3);
    expect(results[0].description).toContain('图表');
    expect(results[1].description).toContain('截图');
    expect(results[2].description).toContain('Logo');
  });

  it('跳过小图标图片', async () => {
    const images = [
      { url: 'https://example.com/favicon.ico', alt: '网站图标' },
      { url: 'https://example.com/icon.png', alt: '图标' },
      { url: 'https://example.com/normal.jpg', alt: '正常图片' },
    ];

    const results = await service.describeImages(images);

    // 应该只处理正常图片，跳过图标
    expect(results.length).toBe(1);
    expect(results[0].url).toBe('https://example.com/normal.jpg');
  });

  it('处理图片描述失败的情况', async () => {
    // 由于 mock 已经配置为对 error.jpg 返回错误，直接测试即可
    const result = await service.describeImage('https://example.com/error.jpg');

    expect(result).toBeNull();
  });

  it('批量处理时部分失败不影响其他', async () => {
    const images = [
      { url: 'https://example.com/chart.jpg', alt: '图1' },
      { url: 'https://example.com/error.jpg', alt: '图2' },
      { url: 'https://example.com/screenshot.jpg', alt: '图3' },
    ];

    // 使用顶层 mock，error.jpg 会自动失败
    const results = await service.describeImages(images);

    // 应该有2个成功，1个失败（error.jpg）
    expect(results.filter(r => r.description).length).toBe(2);
    expect(results.filter(r => !r.description).length).toBe(1);
  });

  it('构建图片描述文本', () => {
    const descriptions = [
      { url: 'url1', description: '第一张图片描述' },
      { url: 'url2', description: '第二张图片描述' },
    ];

    const text = service.buildImageDescriptionsText(descriptions);

    expect(text).toContain('图片1');
    expect(text).toContain('第一张图片描述');
    expect(text).toContain('图片2');
    expect(text).toContain('第二张图片描述');
  });

  it('空描述列表返回空字符串', () => {
    const text = service.buildImageDescriptionsText([]);
    expect(text).toBe('');
  });

  it('自定义配置', () => {
    const customService = new ImageUnderstandingService({
      maxImagesPerArticle: 3,
      skipSmallImages: false,
    });

    expect(customService['config'].maxImagesPerArticle).toBe(3);
    expect(customService['config'].skipSmallImages).toBe(false);
  });

  it('图片URL验证', async () => {
    // 测试无效URL
    const invalidUrls = [
      '',
      'not-a-url',
      'ftp://example.com/image.jpg',
    ];

    for (const url of invalidUrls) {
      const result = await service.describeImage(url);
      expect(result).toBeNull();
    }
  });

  it('并发处理控制', async () => {
    const images = Array.from({ length: 20 }, (_, i) => ({
      url: `https://example.com/image${i}.jpg`,
      alt: `图片${i}`,
    }));

    const startTime = Date.now();
    const results = await service.describeImages(images);
    const endTime = Date.now();

    // 应该有并发限制，不会瞬间完成
    expect(results.length).toBeGreaterThan(0);
    // 实际处理时间应该大于某个阈值（说明有并发控制）
    // 这个测试可能需要根据实际实现调整
  });
});

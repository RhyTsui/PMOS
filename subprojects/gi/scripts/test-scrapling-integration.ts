/**
 * 集成测试：验证 Scrapling 采集器集成
 */
import { initializeDatabase, closeDatabase } from '../src/lib/database.js';
import { IntelSourceRepository } from '../src/repositories/intel-source-repository.js';
import { CollectorRouter } from '../src/collectors/router.js';

async function testScraplingIntegration() {
  console.log('=== Scrapling 集成测试 ===\n');

  initializeDatabase();
  const sourceRepo = new IntelSourceRepository();
  const router = new CollectorRouter();

  // 1. 确保有一个 dynamic 类型的源（会触发 Scrapling）
  let testSource = sourceRepo.findByName('游戏陀螺-Scrapling');
  if (!testSource) {
    testSource = sourceRepo.create({
      name: '游戏陀螺-Scrapling',
      shortName: 'YXL-S',
      sourceType: 'media',
      accessMethod: 'dynamic', // 触发 Scrapling
      baseUrl: 'https://youxichaguan.com/archives/199543', // 具体文章页，避免重复
      enabled: true,
      priority: 'P0',
      tags: ['游戏行业'],
      config: {
        cssSelectors: {
          content: 'article, .article-content, .post-content, .entry-content',
          title: 'h1, h2',
        },
      },
      schedule: { cron: '*/30 * * * *', retryOnFail: true, maxRetries: 3, backoffMinutes: 5 },
    } as any);
    console.log('✅ 创建测试源');
  }

  // 2. 通过 CollectorRouter 采集（自动选择 Scrapling）
  console.log('\n开始采集（通过 CollectorRouter）...');
  console.log(`源: ${testSource.name}`);
  console.log(`类型: ${testSource.accessMethod} → 应该走 Scrapling\n`);

  const result = await router.quickCollect(testSource.id, 0);

  console.log('=== 结果 ===');
  console.log(`成功: ${result.success ? '✅' : '❌'}`);
  console.log(`采集: ${result.totalCollected} 条`);
  console.log(`新增: ${result.newCount} 条`);
  console.log(`重复: ${result.duplicateCount} 条`);
  console.log(`耗时: ${result.duration}ms`);

  if (result.errorMessage) {
    console.log(`错误: ${result.errorMessage}`);
  }

  if (result.evidences.length > 0) {
    console.log('\n=== 示例证据 ===');
    result.evidences.slice(0, 3).forEach((ev, i) => {
      console.log(`\n[${i + 1}] ${ev.title}`);
      console.log(`    URL: ${ev.url}`);
      console.log(`    采集器: ${ev.metadata.collectorType}`);
      console.log(`    摘要: ${(ev.summary || '').substring(0, 100)}...`);
      console.log(`    图片: ${ev.images.length} 张`);
    });
  }

  closeDatabase();
  console.log('\n=== 测试完成 ===');
}

testScraplingIntegration().catch(console.error);

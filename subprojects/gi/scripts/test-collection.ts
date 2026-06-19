/**
 * 测试脚本：添加可用的 RSS 源并测试采集
 */
import { initializeDatabase, closeDatabase } from '../src/lib/database.js';
import { IntelSourceRepository } from '../src/repositories/intel-source-repository.js';
import { SeedRepository } from '../src/repositories/seed-repository.js';
import { RawEvidenceRepository } from '../src/repositories/raw-evidence-repository.js';
import { CollectorRouter } from '../src/collectors/router.js';

async function testCollection() {
  console.log('=== 测试采集流程 ===\n');

  // 1. 初始化数据库
  initializeDatabase();

  const sourceRepo = new IntelSourceRepository();
  const seedRepo = new SeedRepository();
  const evidenceRepo = new RawEvidenceRepository();

  // 2. 添加可访问的测试源：少数派
  console.log('1. 添加测试源 少数派...');

  // 检查是否已存在
  let source = sourceRepo.findByName('少数派');
  if (!source) {
    source = sourceRepo.create({
      name: '少数派',
      shortName: 'SSP',
      sourceType: 'media',
      accessMethod: 'rss',
      baseUrl: 'https://sspai.com',
      feedUrl: 'https://sspai.com/feed',
      enabled: true,
      priority: 'P0',
      tags: ['科技媒体'],
      config: {},
      schedule: {
        cron: '*/30 * * * *',
        retryOnFail: true,
        maxRetries: 3,
        backoffMinutes: 5,
      },
    } as any);
    console.log(`   ✅ 源创建成功: ${source.name} (${source.id})`);
  } else {
    console.log(`   ✅ 源已存在: ${source.name} (${source.id})`);
  }

  // 3. 添加测试种子（不过滤，采集全部）
  console.log('\n2. 准备采集（不过滤种子）...');

  // 4. 测试采集
  console.log('\n3. 开始采集...');
  const router = new CollectorRouter();

  try {
    const result = await router.quickCollect(source.id, 0); // 0 = 不用种子过滤

    console.log(`   采集完成！`);
    console.log(`   - 总共采集: ${result.totalCollected} 条`);
    console.log(`   - 新增: ${result.newCount} 条`);
    console.log(`   - 重复: ${result.duplicateCount} 条`);
    console.log(`   - 耗时: ${result.duration}ms`);
    console.log(`   - 成功: ${result.success}`);

    if (result.evidences.length > 0) {
      console.log('\n4. 采集结果示例:');
      result.evidences.slice(0, 5).forEach((ev, i) => {
        console.log(`\n   [${i + 1}] ${ev.title}`);
        console.log(`       URL: ${ev.url}`);
        console.log(`       作者: ${ev.author || '未知'}`);
        console.log(`       发布时间: ${ev.publishedAt || '未知'}`);
        if (ev.images.length > 0) {
          console.log(`       图片: ${ev.images.length} 张`);
        }
      });
    }

    if (!result.success && result.errorMessage) {
      console.log(`\n   ❌ 错误: ${result.errorMessage}`);
    }
  } catch (error) {
    console.log(`   ❌ 采集失败: ${error instanceof Error ? error.message : error}`);
  }

  // 5. 检查数据库
  console.log('\n5. 数据库统计:');
  console.log(`   - 源数量: ${sourceRepo.count()}`);
  console.log(`   - 种子数量: ${seedRepo.count()}`);
  console.log(`   - 证据数量: ${evidenceRepo.count()}`);

  // 显示证据状态分布
  const byStatus = evidenceRepo.countByStatus();
  console.log(`   - 证据状态:`, byStatus);

  closeDatabase();
  console.log('\n=== 测试完成 ===');
}

testCollection().catch(console.error);

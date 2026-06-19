/**
 * 测试 Scrapling 采集器
 *
 * 需要先启动 Scrapling sidecar:
 * 1. cd src/python && pip install -r requirements-scrapling.txt
 * 2. scrapling install
 * 3. python scrapling_server.py
 *
 * 或 Docker:
 * docker-compose up -d scrapling
 */
import { initializeDatabase, closeDatabase } from '../src/lib/database.js';
import { IntelSourceRepository } from '../src/repositories/intel-source-repository.js';
import { ScraplingCollector } from '../src/collectors/scrapling-collector.js';

const SCRAPLING_URL = process.env.SCRAPLING_URL || 'http://localhost:8889';

async function testScrapling() {
  console.log('=== 测试 Scrapling 采集器 ===\n');
  console.log(`Sidecar URL: ${SCRAPLING_URL}\n`);

  const collector = new ScraplingCollector(SCRAPLING_URL);

  // 1. 健康检查
  console.log('1. 健康检查...');
  const healthy = await collector.healthCheck();
  console.log(`   状态: ${healthy ? '✅ 可用' : '❌ 不可用'}`);

  if (!healthy) {
    console.log('\n请先启动 Scrapling sidecar:');
    console.log('  Docker: docker-compose up -d scrapling');
    console.log('  本地:   cd src/python && python scrapling_server.py');
    return;
  }

  // 2. 测试反爬绕过（GameLook）
  console.log('\n2. 测试反爬绕过（GameLook）...');
  const antiBotResult = await collector.testAntiBypass('https://www.gamelook.com.cn');
  console.log(`   结果: ${antiBotResult.success ? '✅ 绕过成功' : '❌ 绕过失败'}`);
  if (antiBotResult.title) {
    console.log(`   标题: ${antiBotResult.title}`);
  }
  if (antiBotResult.error) {
    console.log(`   错误: ${antiBotResult.error}`);
  }

  // 3. 测试采集
  console.log('\n3. 测试采集...');

  initializeDatabase();
  const sourceRepo = new IntelSourceRepository();

  // 创建一个测试源
  let testSource = sourceRepo.findByName('Scrapling-Test');
  if (!testSource) {
    testSource = sourceRepo.create({
      name: 'Scrapling-Test',
      shortName: 'ST',
      sourceType: 'media',
      accessMethod: 'dynamic', // 使用 dynamic 触发 ScraplingCollector
      baseUrl: 'https://youxituoluo.com',
      enabled: true,
      priority: 'P0',
      tags: ['测试'],
      config: {
        cssSelectors: {
          content: 'article, .article, .post',
          title: 'h1, h2, .title',
        },
      },
      schedule: { cron: '0 0 * * *', retryOnFail: false, maxRetries: 0, backoffMinutes: 0 },
    } as any);
  }

  try {
    const evidences = await collector.collect(testSource, []);
    console.log(`   采集到 ${evidences.length} 条证据`);

    if (evidences.length > 0) {
      console.log('\n   示例:');
      evidences.slice(0, 3).forEach((ev, i) => {
        console.log(`   [${i + 1}] ${ev.title}`);
        console.log(`       URL: ${ev.url}`);
        console.log(`       摘要: ${ev.summary?.substring(0, 80)}...`);
        console.log(`       图片: ${ev.images.length} 张`);
        console.log('');
      });
    }
  } catch (error) {
    console.log(`   ❌ 采集失败: ${error instanceof Error ? error.message : error}`);
  }

  closeDatabase();
  console.log('\n=== 测试完成 ===');
}

testScrapling().catch(console.error);

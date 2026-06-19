/**
 * 测试从 P0 源采集数据
 */
import { initializeDatabase, closeDatabase } from '../src/lib/database.js';
import { IntelSourceRepository } from '../src/repositories/intel-source-repository.js';
import { CollectorRouter } from '../src/collectors/router.js';

async function testP0Sources() {
  console.log('=== 测试 P0 源采集 ===\n');

  initializeDatabase();
  const sourceRepo = new IntelSourceRepository();
  const router = new CollectorRouter();

  // 获取所有启用的 P0 源
  const sources = sourceRepo.findAll().filter(s => s.priority === 'P0' && s.enabled);

  console.log(`找到 ${sources.length} 个 P0 源\n`);

  let totalCollected = 0;
  let totalNew = 0;

  for (const source of sources) {
    console.log(`采集: ${source.name}...`);

    try {
      const result = await router.quickCollect(source.id, 0);

      console.log(`  - 采集: ${result.totalCollected} 条`);
      console.log(`  - 新增: ${result.newCount} 条`);
      console.log(`  - 重复: ${result.duplicateCount} 条`);
      console.log(`  - 耗时: ${result.duration}ms`);
      console.log(`  - 状态: ${result.success ? '✅ 成功' : '❌ 失败'}`);

      if (result.evidences.length > 0) {
        console.log(`  - 示例: ${result.evidences[0].title}`);
      }

      totalCollected += result.totalCollected;
      totalNew += result.newCount;
    } catch (error) {
      console.log(`  ❌ 错误: ${error instanceof Error ? error.message : error}`);
    }

    console.log('');
  }

  console.log('=== 总计 ===');
  console.log(`采集: ${totalCollected} 条`);
  console.log(`新增: ${totalNew} 条`);

  closeDatabase();
}

testP0Sources().catch(console.error);

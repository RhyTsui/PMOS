/**
 * 测试脚本：LLM 事件抽取
 *
 * 需要先配置 .env:
 * QWEN_API_KEY=your-api-key
 * QWEN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
 */
import { initializeDatabase, closeDatabase } from '../src/lib/database.js';
import { RawEvidenceRepository } from '../src/repositories/raw-evidence-repository.js';
import { IntelSourceRepository } from '../src/repositories/intel-source-repository.js';
import { ExtractionService } from '../src/services/extraction/index.js';

async function testExtraction() {
  console.log('=== 测试 LLM 事件抽取 ===\n');

  // 检查 API Key
  if (!process.env.QWEN_API_KEY) {
    console.log('❌ 请先配置 QWEN_API_KEY 环境变量');
    console.log('   在 .env 文件中添加：');
    console.log('   QWEN_API_KEY=your-api-key');
    console.log('   QWEN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1');
    return;
  }

  // 初始化数据库
  initializeDatabase();

  const evidenceRepo = new RawEvidenceRepository();
  const sourceRepo = new IntelSourceRepository();
  const extractionService = new ExtractionService();

  // 1. 查找待处理的证据
  console.log('1. 查找待处理证据...');
  const pendingEvidences = evidenceRepo.findPending(5);

  if (pendingEvidences.length === 0) {
    console.log('   ⚠️ 没有待处理的证据');
    console.log('   请先运行采集任务收集一些数据');

    // 创建一个测试证据
    console.log('\n   创建测试证据...');
    let source = sourceRepo.findByName('测试源');
    if (!source) {
      source = sourceRepo.create({
        name: '测试源',
        shortName: 'TEST',
        sourceType: 'media',
        accessMethod: 'rss',
        baseUrl: 'https://test.com',
        enabled: true,
        priority: 'P1',
        tags: [],
        config: {},
        schedule: { cron: '0 0 * * *', retryOnFail: false, maxRetries: 0, backoffMinutes: 0 },
      } as any);
    }

    evidenceRepo.create({
      sourceId: source.id,
      seedIds: [],
      url: 'https://test.com/article/1',
      title: '米哈游《原神》5.0 版本定档 8 月 28 日上线，新增纳塔地区',
      content: `米哈游今日正式宣布，《原神》5.0 版本将于 2026 年 8 月 28 日全球同步上线。
新版本将带来全新的纳塔地区，这是一个以拉丁美洲文明为灵感的火元素国度。
玩家将探索广袤的沙漠和丛林，结识新的伙伴，揭开深渊教团的更多秘密。
此外，新角色「伊安珊」也将同步登场，她是一位使用长柄武器的火元素角色。
米哈游表示，5.0 版本是《原神》史上内容最丰富的版本之一，开发团队历时 18 个月打造。`,
      collectedAt: new Date().toISOString(),
      publishedAt: new Date().toISOString(),
      images: [],
      metadata: { collectorType: 'rss' },
      hash: 'test-hash',
      status: 'collected',
    } as any);
    console.log('   ✅ 测试证据创建成功');

    const newPending = evidenceRepo.findPending(1);
    if (newPending.length === 0) {
      console.log('   ❌ 仍然没有待处理证据');
      closeDatabase();
      return;
    }
    pendingEvidences.push(...newPending);
  }

  console.log(`   找到 ${pendingEvidences.length} 条待处理证据\n`);

  // 2. 开始抽取
  console.log('2. 开始 LLM 抽取...\n');

  for (const evidence of pendingEvidences) {
    console.log(`处理: ${evidence.title}`);
    console.log(`URL: ${evidence.url}`);

    try {
      const event = await extractionService.extractFromEvidence(evidence);

      if (event) {
        console.log('\n✅ 抽取成功！');
        console.log(`事件标题: ${event.eventTitle}`);
        console.log(`事件类型: ${event.eventType}`);
        console.log(`影响评分: ${event.impactScore}`);
        console.log(`优先级: ${event.priority}`);
        console.log(`适用角色: ${event.audienceTags.join(', ')}`);
        console.log(`\n关键事实:`);
        event.keyFacts.forEach((fact, i) => {
          console.log(`  ${i + 1}. [${fact.importance}] ${fact.fact}`);
        });
        console.log(`\n行动建议:`);
        event.actionAdvice.forEach((advice, i) => {
          console.log(`  ${i + 1}. [${advice.role}] ${advice.advice} (${advice.urgency})`);
        });
        console.log(`\n情绪: ${event.sentiment.polarity} (${event.sentiment.intensity})`);
        console.log(`\n提及实体:`);
        event.entities.forEach((entity, i) => {
          console.log(`  ${i + 1}. ${entity.name} (${entity.type}, ${entity.role})`);
        });
      } else {
        console.log('❌ 抽取失败（返回 null）');
      }
    } catch (error) {
      console.log(`❌ 抽取异常: ${error instanceof Error ? error.message : error}`);
    }

    console.log('\n' + '-'.repeat(60) + '\n');
  }

  // 3. 统计
  console.log('3. 数据库统计:');
  const byStatus = evidenceRepo.countByStatus();
  console.log('   证据状态:', byStatus);

  closeDatabase();
  console.log('\n=== 测试完成 ===');
}

testExtraction().catch(console.error);

/**
 * 测试 LLM 抽取功能
 */
// 首先加载环境变量
import '../src/lib/load-env.js';

import { initializeDatabase, closeDatabase } from '../src/lib/database.js';
import { ExtractionService } from '../src/services/extraction/index.js';
import { RawEvidenceRepository } from '../src/repositories/raw-evidence-repository.js';

async function testExtraction() {
  console.log('=== 测试 LLM 抽取功能 ===\n');

  initializeDatabase();
  const extractionService = new ExtractionService();
  const evidenceRepo = new RawEvidenceRepository();

  // 获取一条证据进行测试
  const evidence = evidenceRepo.findById('17096656-7d4e-409a-b1f3-ec5b00fcd897');

  if (!evidence) {
    console.error('❌ 证据不存在');
    closeDatabase();
    return;
  }

  console.log(`📄 证据: ${evidence.title}`);
  console.log(`🔗 URL: ${evidence.url}`);
  console.log(`📝 内容长度: ${evidence.content?.length || 0} 字符\n`);

  try {
    console.log('⏳ 正在抽取事件...\n');
    const event = await extractionService.extractFromEvidence(evidence);

    if (event) {
      console.log('✅ 抽取成功！\n');
      console.log('事件标题:', event.eventTitle);
      console.log('事件类型:', event.eventType);
      console.log('优先级:', event.priority);
      console.log('影响评分:', event.impactScore);
      console.log('\n关键事实:');
      event.keyFacts.forEach((f, i) => {
        console.log(`  ${i + 1}. [${f.importance}] ${f.fact}`);
        console.log(`     实体: ${f.entities.join(', ')}`);
      });
      console.log('\n行动建议:');
      event.actionAdvice.forEach((a, i) => {
        console.log(`  ${i + 1}. [${a.role}] ${a.advice}`);
        console.log(`     紧急度: ${a.urgency}`);
      });
    } else {
      console.log('❌ 抽取失败: 返回 null');
    }
  } catch (error) {
    console.error('❌ 抽取异常:', error instanceof Error ? error.message : error);
  }

  closeDatabase();
}

testExtraction().catch(console.error);

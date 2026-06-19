/**
 * LLM 事件抽取端到端测试
 *
 * 使用已采集的证据测试完整的抽取流程
 */
import dotenv from 'dotenv';
dotenv.config();  // 加载 .env 配置

import { initializeDatabase, closeDatabase } from '../src/lib/database.js';
import { RawEvidenceRepository } from '../src/repositories/raw-evidence-repository.js';
import { ExtractionService } from '../src/services/extraction/index.js';

async function testExtraction() {
  console.log('=== LLM 事件抽取测试 ===\n');

  initializeDatabase();
  const evidenceRepo = new RawEvidenceRepository();
  const extractionService = new ExtractionService();

  // 获取最新的证据
  const evidences = evidenceRepo.findAll({ limit: 1, orderBy: 'collected_at', order: 'DESC' });

  if (evidences.length === 0) {
    console.log('❌ 没有证据数据，请先运行采集');
    closeDatabase();
    return;
  }

  const evidence = evidences[0];
  console.log('测试证据:');
  console.log(`  标题: ${evidence.title}`);
  console.log(`  URL: ${evidence.url}`);
  console.log(`  内容长度: ${evidence.content.length} 字符`);
  console.log(`  内容预览: ${evidence.content.substring(0, 200)}...\n`);

  console.log('开始 LLM 抽取...\n');

  try {
    const event = await extractionService.extractFromEvidence(evidence);

    if (!event) {
      console.log('❌ 抽取失败');
      closeDatabase();
      return;
    }

    console.log('✅ 抽取成功!\n');
    console.log('=== 抽取结果 ===\n');

    console.log(`事件标题: ${event.eventTitle}`);
    console.log(`事件类型: ${event.eventType}`);
    console.log(`影响评分: ${event.impactScore}`);
    console.log(`优先级: ${event.priority}`);
    console.log(`适用角色: ${event.audienceTags.join(', ')}`);
    console.log();

    console.log('关键事实:');
    event.keyFacts.forEach((fact, i) => {
      console.log(`  ${i + 1}. [${fact.importance}] ${fact.fact}`);
      if (fact.entities.length > 0) {
        console.log(`     涉及: ${fact.entities.join(', ')}`);
      }
    });
    console.log();

    console.log('行动建议:');
    event.actionAdvice.forEach((advice, i) => {
      console.log(`  ${i + 1}. [${advice.role}] (${advice.urgency})`);
      console.log(`     ${advice.advice}`);
    });
    console.log();

    console.log('情绪分析:');
    console.log(`  倾向: ${event.sentiment.polarity}`);
    console.log(`  强度: ${event.sentiment.intensity}`);
    if (event.sentiment.target) {
      console.log(`  对象: ${event.sentiment.target}`);
    }
    console.log();

    console.log('提及实体:');
    event.entities.forEach((entity, i) => {
      console.log(`  ${i + 1}. ${entity.name} (${entity.type}, ${entity.role})`);
    });
    console.log();

    console.log('=== 抽取元数据 ===');
    console.log(`模型: ${event.model}`);
    console.log(`置信度: ${event.confidence}`);
    console.log(`抽取时间: ${event.extractedAt}`);

  } catch (error) {
    console.log('❌ 抽取异常:', error instanceof Error ? error.message : String(error));
  }

  closeDatabase();
  console.log('\n=== 测试完成 ===');
}

testExtraction().catch(console.error);

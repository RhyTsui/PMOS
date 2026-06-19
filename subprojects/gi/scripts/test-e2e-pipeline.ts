/**
 * 端到端管道测试
 *
 * 完整测试：采集 → 抽取 → 信号生成 → API 验证
 */
import dotenv from 'dotenv';
dotenv.config();

import { initializeDatabase, closeDatabase } from '../src/lib/database.js';
import { CollectorRouter } from '../src/collectors/router.js';
import { ExtractionService } from '../src/services/extraction/index.js';
import { PipelineService } from '../src/services/pipeline/index.js';
import { RawEvidenceRepository } from '../src/repositories/raw-evidence-repository.js';
import { StructuredEventRepository } from '../src/repositories/structured-event-repository.js';
import { EvidenceEventRepository } from '../src/repositories/evidence-event-repository.js';
import { SignalRepository } from '../src/repositories/signal-repository.js';
import { IntelSourceRepository } from '../src/repositories/intel-source-repository.js';

async function testEndToEndPipeline() {
  console.log('=== 端到端管道测试 ===\n');

  initializeDatabase();

  const sourceRepo = new IntelSourceRepository();
  const evidenceRepo = new RawEvidenceRepository();
  const structuredEventRepo = new StructuredEventRepository();
  const evidenceEventRepo = new EvidenceEventRepository();
  const signalRepo = new SignalRepository();
  const collectorRouter = new CollectorRouter();
  const pipelineService = new PipelineService();

  // 获取所有启用的 P0 源
  const sources = sourceRepo.findAll().filter(s => s.enabled && s.priority === 'P0');
  console.log(`找到 ${sources.length} 个 P0 源\n`);

  if (sources.length === 0) {
    console.log('❌ 没有可用的 P0 源');
    closeDatabase();
    return;
  }

  // 选择前 3 个源进行测试
  const testSources = sources.slice(0, 3);
  console.log('测试源:');
  testSources.forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.name} (${s.accessMethod})`);
  });
  console.log();

  // Step 1: 采集
  console.log('=== Step 1: 数据采集 ===\n');
  const collectionResults = [];

  for (const source of testSources) {
    console.log(`采集: ${source.name}...`);
    try {
      const result = await collectorRouter.quickCollect(source.id, 0);
      collectionResults.push({
        source: source.name,
        success: result.success,
        collected: result.totalCollected,
        newItems: result.newCount,
        error: result.errorMessage,
      });

      console.log(`  ✅ 采集 ${result.totalCollected} 条，新增 ${result.newCount} 条`);
    } catch (error) {
      console.log(`  ❌ 失败: ${error instanceof Error ? error.message : error}`);
      collectionResults.push({
        source: source.name,
        success: false,
        collected: 0,
        newItems: 0,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  console.log();

  // Step 2: LLM 抽取
  console.log('=== Step 2: LLM 事件抽取 ===\n');
  const pendingEvidences = evidenceRepo.findPending(5); // 最多处理 5 条
  console.log(`找到 ${pendingEvidences.length} 条待处理证据\n`);

  const extractionResults = [];
  for (const evidence of pendingEvidences) {
    console.log(`抽取: ${evidence.title.substring(0, 50)}...`);
    try {
      const result = await pipelineService.processEvidence(evidence.id);
      extractionResults.push({
        evidenceId: evidence.id,
        title: evidence.title.substring(0, 50),
        success: result.success,
        structuredEventId: result.structuredEventId,
        evidenceEventId: result.evidenceEventId,
        signalId: result.signalId,
        errors: result.errors,
      });

      if (result.success) {
        console.log(`  ✅ 抽取成功`);
        console.log(`     StructuredEvent: ${result.structuredEventId}`);
        console.log(`     EvidenceEvent: ${result.evidenceEventId}`);
        console.log(`     Signal: ${result.signalId}`);
      } else {
        console.log(`  ❌ 抽取失败: ${result.errors.join(', ')}`);
      }
    } catch (error) {
      console.log(`  ❌ 异常: ${error instanceof Error ? error.message : error}`);
      extractionResults.push({
        evidenceId: evidence.id,
        title: evidence.title.substring(0, 50),
        success: false,
        errors: [error instanceof Error ? error.message : String(error)],
      });
    }
  }
  console.log();

  // Step 3: 数据库统计
  console.log('=== Step 3: 数据库统计 ===\n');
  const stats = {
    sources: sourceRepo.count(),
    evidences: evidenceRepo.count(),
    structuredEvents: structuredEventRepo.count(),
    evidenceEvents: evidenceEventRepo.count(),
    signals: signalRepo.count(),
  };

  console.log('数据统计:');
  console.log(`  Sources: ${stats.sources}`);
  console.log(`  RawEvidences: ${stats.evidences}`);
  console.log(`  StructuredEvents: ${stats.structuredEvents}`);
  console.log(`  EvidenceEvents: ${stats.evidenceEvents}`);
  console.log(`  Signals: ${stats.signals}`);
  console.log();

  // Step 4: 验证最新信号
  console.log('=== Step 4: 验证最新信号 ===\n');
  const latestSignals = signalRepo.findAll({ limit: 3, orderBy: 'created_at', order: 'DESC' });

  if (latestSignals.length === 0) {
    console.log('❌ 没有生成任何信号');
  } else {
    console.log(`最新 ${latestSignals.length} 个信号:\n`);
    latestSignals.forEach((signal, i) => {
      console.log(`${i + 1}. ${signal.title}`);
      console.log(`   类型: ${signal.eventType}`);
      console.log(`   优先级: ${signal.priority}`);
      console.log(`   影响评分: ${signal.impactScore}`);
      console.log(`   角色: ${signal.audienceTags.join(', ')}`);
      console.log(`   状态: ${signal.status}`);
      console.log(`   创建时间: ${signal.createdAt}`);
      console.log();
    });
  }

  // Step 5: 测试总结
  console.log('=== 测试总结 ===\n');
  const successCollections = collectionResults.filter(r => r.success).length;
  const successExtractions = extractionResults.filter(r => r.success).length;

  console.log('采集结果:');
  console.log(`  成功: ${successCollections}/${collectionResults.length}`);
  console.log(`  总采集: ${collectionResults.reduce((sum, r) => sum + r.collected, 0)} 条`);
  console.log(`  新增: ${collectionResults.reduce((sum, r) => sum + r.newItems, 0)} 条`);
  console.log();

  console.log('抽取结果:');
  console.log(`  成功: ${successExtractions}/${extractionResults.length}`);
  console.log();

  console.log('数据完整性:');
  console.log(`  ✅ Sources: ${stats.sources}`);
  console.log(`  ${stats.evidences > 0 ? '✅' : '❌'} RawEvidences: ${stats.evidences}`);
  console.log(`  ${stats.structuredEvents > 0 ? '✅' : '❌'} StructuredEvents: ${stats.structuredEvents}`);
  console.log(`  ${stats.evidenceEvents > 0 ? '✅' : '❌'} EvidenceEvents: ${stats.evidenceEvents}`);
  console.log(`  ${stats.signals > 0 ? '✅' : '❌'} Signals: ${stats.signals}`);
  console.log();

  const allPassed = successCollections > 0 && successExtractions > 0 && stats.signals > 0;
  console.log(allPassed ? '✅ 端到端测试通过！' : '⚠️  部分测试未通过');

  closeDatabase();
  console.log('\n=== 测试完成 ===');
}

testEndToEndPipeline().catch(console.error);

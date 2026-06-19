/**
 * 测试结构化事件保存
 */
import '../src/lib/load-env.js';
import { initializeDatabase, closeDatabase } from '../src/lib/database.js';
import { StructuredEventRepository } from '../src/repositories/structured-event-repository.js';
import { ExtractionService } from '../src/services/extraction/index.js';
import { RawEvidenceRepository } from '../src/repositories/raw-evidence-repository.js';

async function testSave() {
  console.log('=== 测试结构化事件保存 ===\n');

  initializeDatabase();

  const eventRepo = new StructuredEventRepository();
  const evidenceRepo = new RawEvidenceRepository();
  const extractionService = new ExtractionService();

  // 检查当前事件数
  const existingEvents = eventRepo.findTopScored(100);
  console.log(`当前事件数: ${existingEvents.length}`);

  // 获取一条待处理的证据
  const pending = evidenceRepo.findPending(1);
  if (pending.length === 0) {
    console.log('没有待处理的证据');
    closeDatabase();
    return;
  }

  const evidence = pending[0];
  console.log(`\n测试证据: ${evidence.title?.substring(0, 50)}...`);

  // 抽取事件
  console.log('\n⏳ 正在抽取...');
  const event = await extractionService.extractFromEvidence(evidence);

  if (event) {
    console.log('✅ 抽取成功');
    console.log(`事件标题: ${event.eventTitle}`);
    console.log(`事件类型: ${event.eventType}`);
    console.log(`影响评分: ${event.impactScore}`);

    // 检查是否保存成功
    const savedEvent = eventRepo.findByEvidenceId(evidence.id);
    if (savedEvent) {
      console.log('\n✅ 事件已保存到数据库');
      console.log(`保存的 ID: ${savedEvent.id}`);
    } else {
      console.log('\n❌ 事件未保存到数据库');
    }
  } else {
    console.log('❌ 抽取失败');
  }

  // 再次检查事件数
  const finalEvents = eventRepo.findTopScored(100);
  console.log(`\n最终事件数: ${finalEvents.length}`);

  closeDatabase();
}

testSave().catch(console.error);

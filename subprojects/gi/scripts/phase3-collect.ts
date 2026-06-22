/**
 * 阶段 3：创建生产画像 + 触发手动采集
 */
import '../src/lib/load-env.js';
import { initializeDatabase, closeDatabase, getDatabase } from '../src/lib/database.js';
import { RequirementProfileService } from '../src/services/profile/index.js';
import { CollectionService } from '../src/services/collection/index.js';

initializeDatabase();
const profileService = new RequirementProfileService();
const collectionService = new CollectionService();

// 1. 创建生产画像
console.log('\n=== 1. 创建生产画像 ===');
const profile = profileService.createProfile({
  name: '游戏行业综合日报',
  owner: 'production',
  industry: '游戏',
  purpose: ['老板', '战略', '发行', '运营', '产品'],
  focusTopics: [
    '新游上线', '游戏测试', '游戏预约', '版号发放',
    '游戏买量', '榜单变化', '行业融资', '公司裁员',
    '版本更新', '游戏出海', 'AI+游戏', '微信小游戏',
  ],
  entities: {
    companies: ['腾讯', '网易', '米哈游', '莉莉丝', '三七互娱', '完美世界', '叠纸', '鹰角', '库洛'],
    products: ['王者荣耀', '原神', '崩坏：星穹铁道', '绝区零', '鸣潮', '明日方舟', '恋与深空', '黑神话：悟空'],
    platforms: ['Steam', 'TapTap', 'App Store', '微信小游戏', '抖音小游戏'],
  },
  sourcePolicy: {
    preferredSourceIds: [],
    excludeSourceIds: [],
  },
  verificationPolicy: {
    required: true,
    minSources: 2,
  },
  deliveryPolicy: {
    format: 'daily_brief',
    frequency: '每天 9 点',
    channels: ['chat', 'web'],
    excludeContent: ['八卦', '低质量搬运'],
  },
  priority: {
    新游上线: 'high',
    版号发放: 'high',
    行业融资: 'high',
    榜单变化: 'medium',
    版本更新: 'medium',
  },
  timeWindow: '最近 24 小时',
});
console.log(`创建画像: ${profile.name} (id: ${profile.id})`);

// 2. 触发所有 P0 源的手动采集
console.log('\n=== 2. 触发 P0 源手动采集 ===');
const db = getDatabase();
const sources = db.prepare(`SELECT id, name FROM intel_sources WHERE enabled = 1 AND priority = 'P0'`).all() as any[];
console.log(`找到 ${sources.length} 个 P0 源`);

let successCount = 0;
let failCount = 0;
let totalEvidence = 0;

for (const source of sources) {
  try {
    console.log(`\n采集 ${source.name} ...`);
    const result = await collectionService.collectSource(source.id);
    console.log(`  采集 ${result.totalCollected} 条 (新增 ${result.newCount}, 重复 ${result.duplicateCount})`);
    if (result.success) {
      successCount++;
      totalEvidence += result.totalCollected;
    } else {
      console.log(`  ❌ 失败: ${result.errorMessage}`);
      failCount++;
    }
  } catch (err) {
    console.log(`  ❌ 异常: ${err instanceof Error ? err.message : String(err)}`);
    failCount++;
  }
}

// 3. 验证采集结果
console.log('\n=== 3. 采集结果统计 ===');
console.log('成功源:', successCount);
console.log('失败源:', failCount);
console.log('总证据数:', totalEvidence);

console.log('\n表数据统计:');
console.log('  raw_evidence:', (db.prepare('SELECT count(*) as n FROM raw_evidence').get() as any).n);
console.log('  structured_events:', (db.prepare('SELECT count(*) as n FROM structured_events').get() as any).n);
console.log('  evidence_events:', (db.prepare('SELECT count(*) as n FROM evidence_events').get() as any).n);
console.log('  signals:', (db.prepare('SELECT count(*) as n FROM signals').get() as any).n);

closeDatabase();
console.log('\n✅ 阶段 3 完成');

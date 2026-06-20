import '../src/lib/load-env.js';
import { GapDetectionService } from '../src/services/gap-detection/index.js';

const service = new GapDetectionService({ gapDaysThreshold: 3 });
const report = service.detect();

console.log('=== 漏采检测报告 ===');
console.log('检测时间:', report.detectedAt);
console.log('检查种子数:', report.totalSeedsChecked);
console.log('发现漏采:', report.gapsFound);
console.log('严重:', report.summary.critical, '| 警告:', report.summary.warning);

if (report.alerts.length > 0) {
  console.log('\n=== 漏采告警 (前 15 条) ===');
  report.alerts.slice(0, 15).forEach(a => {
    const severity = a.severity === 'critical' ? '严重' : '警告';
    console.log(`  [${severity}] [${a.seedType}] ${a.seedText} | ${a.score}分 | ${a.gapDays}天未产出`);
  });
}

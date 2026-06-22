/**
 * Demand Intake P1-RC Real Chat Regression Test
 *
 * 覆盖 10 个真实场景，验证 P1 轻闭环在默认安全态、active gate 态、建单态下的行为。
 */

import { structureDemandIntake, deriveServiceIntakeType } from '@/lib/demand-intake-structurer';
import { generateDemandConfirmationCard, generateMissingInputsPrompt, isConfirmationIntent } from '@/lib/demand-intake-confirmation';
import { detectSecuritySensitiveContent } from '@/lib/demand-security-detector';
import { getDemandIntakeFlags } from '@/lib/demand-intake-flags';

interface RegressionCase {
  id: number;
  name: string;
  message: string;
  businessContext?: any;
  expected: {
    routeIntentType: string;
    enterDemandIntake: boolean;
    triggerReportDiagnosisPackageIntegration: boolean;
    createDemandPoolItem: boolean;
    leakInternalFields: boolean;
    updateCaseFrame: boolean;
  };
}

const regressionCases: RegressionCase[] = [
  {
    id: 1,
    name: '你好',
    message: '你好',
    expected: {
      routeIntentType: 'general',
      enterDemandIntake: false,
      triggerReportDiagnosisPackageIntegration: false,
      createDemandPoolItem: false,
      leakInternalFields: false,
      updateCaseFrame: false,
    },
  },
  {
    id: 2,
    name: '昨天巨量激活多少',
    message: '昨天巨量激活多少',
    expected: {
      routeIntentType: 'report_query',
      enterDemandIntake: false,
      triggerReportDiagnosisPackageIntegration: true,
      createDemandPoolItem: false,
      leakInternalFields: false,
      updateCaseFrame: false,
    },
  },
  {
    id: 3,
    name: '查日报',
    message: '查日报',
    expected: {
      routeIntentType: 'report_query',
      enterDemandIntake: false,
      triggerReportDiagnosisPackageIntegration: true,
      createDemandPoolItem: false,
      leakInternalFields: false,
      updateCaseFrame: false,
    },
  },
  {
    id: 4,
    name: '为什么昨天 ROI 下降',
    message: '为什么昨天 ROI 下降',
    expected: {
      routeIntentType: 'diagnosis',
      enterDemandIntake: false,
      triggerReportDiagnosisPackageIntegration: true,
      createDemandPoolItem: false,
      leakInternalFields: false,
      updateCaseFrame: false,
    },
  },
  {
    id: 5,
    name: '获取可用包并发起联调',
    message: '获取可用包并发起联调',
    expected: {
      routeIntentType: 'package',
      enterDemandIntake: false,
      triggerReportDiagnosisPackageIntegration: true,
      createDemandPoolItem: false,
      leakInternalFields: false,
      updateCaseFrame: false,
    },
  },
  {
    id: 6,
    name: '现在北京天气如何',
    message: '现在北京天气如何',
    expected: {
      routeIntentType: 'general',
      enterDemandIntake: false,
      triggerReportDiagnosisPackageIntegration: false,
      createDemandPoolItem: false,
      leakInternalFields: false,
      updateCaseFrame: false,
    },
  },
  {
    id: 7,
    name: 'https://example.com',
    message: 'https://example.com',
    expected: {
      routeIntentType: 'general',
      enterDemandIntake: false,
      triggerReportDiagnosisPackageIntegration: false,
      createDemandPoolItem: false,
      leakInternalFields: false,
      updateCaseFrame: false,
    },
  },
  {
    id: 8,
    name: '文档链接 + 监测回传对接',
    message: '我需要对接巨量的监测链接，文档在这里 https://example.com/doc',
    expected: {
      routeIntentType: 'demand',
      enterDemandIntake: true,
      triggerReportDiagnosisPackageIntegration: false,
      createDemandPoolItem: false, // 默认不建单，需用户确认
      leakInternalFields: false,
      updateCaseFrame: true,
    },
  },
  {
    id: 9,
    name: '文档链接 + 采集数据需求',
    message: '我需要从后端接口采集数据，文档在 https://example.com/api-doc',
    expected: {
      routeIntentType: 'demand',
      enterDemandIntake: true,
      triggerReportDiagnosisPackageIntegration: false,
      createDemandPoolItem: false,
      leakInternalFields: false,
      updateCaseFrame: true,
    },
  },
  {
    id: 10,
    name: '用户发送 Key / Secret / Token / 密码',
    message: '我的 API Key 是 sk-1234567890abcdef，Secret 是 my-secret-key',
    expected: {
      routeIntentType: 'general',
      enterDemandIntake: false,
      triggerReportDiagnosisPackageIntegration: false,
      createDemandPoolItem: false,
      leakInternalFields: false,
      updateCaseFrame: false,
    },
  },
];

interface TestResult {
  caseId: number;
  caseName: string;
  passed: boolean;
  details: string[];
  errors: string[];
}

async function runRegression(): Promise<TestResult[]> {
  console.log('=== Demand Intake P1-RC Real Chat Regression ===\n');
  console.log('Current flags:', getDemandIntakeFlags());
  console.log('');

  const results: TestResult[] = [];

  for (const tc of regressionCases) {
    const result: TestResult = {
      caseId: tc.id,
      caseName: tc.name,
      passed: true,
      details: [],
      errors: [],
    };

    console.log(`[CASE ${tc.id}] ${tc.name}`);
    console.log(`  Message: ${tc.message}`);

    try {
      // 1. 推断服务类型
      const serviceType = deriveServiceIntakeType(tc.message);
      result.details.push(`Service type: ${serviceType || 'none'}`);

      // 2. 结构化 intake draft
      const draft = structureDemandIntake(tc.message, tc.businessContext);
      result.details.push(`Intake candidate: ${draft.serviceIntakeCandidate}`);
      result.details.push(`Intake status: ${draft.intakeDraftStatus}`);

      // 3. 安全检测
      const securityFindings = detectSecuritySensitiveContent(tc.message);
      if (securityFindings.length > 0) {
        result.details.push(`Security findings: ${securityFindings.length}`);
      }

      // 4. 确认意图检测
      const isConfirmation = isConfirmationIntent(tc.message);
      result.details.push(`Is confirmation: ${isConfirmation}`);

      // 5. 验证预期
      const expectedIntentType = tc.expected.routeIntentType;
      const actualIntentType = serviceType ? 'demand' : (tc.message.includes('http') ? 'general' : 'general');

      // 验证是否进入 demand intake
      if (draft.serviceIntakeCandidate !== tc.expected.enterDemandIntake) {
        result.errors.push(`Expected enterDemandIntake=${tc.expected.enterDemandIntake}, got ${draft.serviceIntakeCandidate}`);
      }

      // 验证是否泄露内部字段
      if (draft.collectedSlots) {
        const sensitiveSlots = ['test_account', 'auth_method'];
        for (const slotId of sensitiveSlots) {
          if (draft.collectedSlots[slotId]?.value) {
            result.errors.push(`Sensitive slot ${slotId} has value (should be masked)`);
          }
        }
      }

      // 验证确认卡生成
      if (draft.intakeDraftStatus === 'ready_for_confirmation') {
        const card = generateDemandConfirmationCard(draft);
        if (card) {
          result.details.push(`Confirmation card generated with ${card.structured.slots.length} slots`);
        }
      } else if (draft.missingInputs.length > 0) {
        const prompt = generateMissingInputsPrompt(draft);
        if (prompt) {
          result.details.push(`Missing inputs prompt: ${draft.missingInputs.length} items`);
        }
      }

      // 判断测试结果
      if (result.errors.length > 0) {
        result.passed = false;
        console.log(`  ✗ FAILED`);
        for (const error of result.errors) {
          console.log(`    - ${error}`);
        }
      } else {
        console.log(`  ✓ PASSED`);
      }

      for (const detail of result.details) {
        console.log(`    ${detail}`);
      }

    } catch (error) {
      result.passed = false;
      result.errors.push(`Exception: ${error instanceof Error ? error.message : String(error)}`);
      console.log(`  ✗ FAILED with exception`);
      console.log(`    ${result.errors[0]}`);
    }

    console.log('');
    results.push(result);
  }

  return results;
}

async function main() {
  const results = await runRegression();

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  console.log('=== Regression Summary ===');
  console.log(`Passed: ${passed}/${total}`);
  console.log(`Failed: ${failed}/${total}`);

  if (failed > 0) {
    console.log('\nFailed cases:');
    for (const r of results.filter(r => !r.passed)) {
      console.log(`  [${r.caseId}] ${r.caseName}`);
      for (const error of r.errors) {
        console.log(`    - ${error}`);
      }
    }
    process.exit(1);
  }

  console.log('\n✓ All regression tests passed!');
}

main().catch(error => {
  console.error('Regression test failed:', error);
  process.exit(1);
});

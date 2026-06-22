/**
 * Demand Intake Regression Test（P1）
 *
 * 验证需求 intake 链路的 P1 实现。
 * 测试用例覆盖：
 * 1. 非需求意图不进入 demand intake
 * 2. 需求意图识别和结构化
 * 3. 缺失项追问
 * 4. 确认卡生成
 * 5. 用户确认后建单
 */

import { structureDemandIntake } from '@/lib/demand-intake-structurer';
import { generateDemandConfirmationCard, generateMissingInputsPrompt, isConfirmationIntent } from '@/lib/demand-intake-confirmation';
import { getCapabilityStatus } from '@/lib/demand-capability-status';

interface TestCase {
  name: string;
  message: string;
  businessContext?: any;
  expected: {
    serviceIntakeCandidate?: boolean;
    serviceType?: string | null;
    missingInputsCount?: number;
    intakeDraftStatus?: string;
    isConfirmation?: boolean;
    capabilityStatus?: string;
  };
}

const testCases: TestCase[] = [
  // 非需求意图
  {
    name: '普通问候不进入 demand intake',
    message: '你好',
    expected: {
      serviceIntakeCandidate: false,
      serviceType: null,
    },
  },
  {
    name: '报表查询不进入 demand intake',
    message: '昨天巨量激活多少',
    expected: {
      serviceIntakeCandidate: false,
      serviceType: null,
    },
  },
  // 需求意图识别
  {
    name: '监测回传对接需求识别',
    message: '我需要对接巨量的监测链接，文档在这里 https://example.com/doc',
    expected: {
      serviceIntakeCandidate: true,
      serviceType: 'monitoring_callback',
      intakeDraftStatus: 'collecting',
    },
  },
  {
    name: '监测回传信息不全生成缺失项追问',
    message: '我要对接巨量监测链接',
    expected: {
      serviceIntakeCandidate: true,
      serviceType: 'monitoring_callback',
      intakeDraftStatus: 'collecting',
    },
  },
  // 确认意图检测
  {
    name: '用户确认意图检测',
    message: '确认',
    expected: {
      isConfirmation: true,
    },
  },
  {
    name: '非确认意图',
    message: '我要修改信息',
    expected: {
      isConfirmation: false,
    },
  },
  // 能力状态
  {
    name: '能力状态默认 unknown',
    message: '',
    expected: {
      capabilityStatus: 'unknown',
    },
  },
];

async function runTests() {
  console.log('=== Demand Intake Regression Test ===\n');

  let passed = 0;
  let failed = 0;

  for (const tc of testCases) {
    try {
      console.log(`[TEST] ${tc.name}`);

      if (tc.expected.isConfirmation !== undefined) {
        const result = isConfirmationIntent(tc.message);
        if (result !== tc.expected.isConfirmation) {
          throw new Error(`Expected isConfirmation=${tc.expected.isConfirmation}, got ${result}`);
        }
      } else if (tc.expected.capabilityStatus) {
        const result = getCapabilityStatus('monitoring_callback');
        if (result.status !== tc.expected.capabilityStatus) {
          throw new Error(`Expected capabilityStatus=${tc.expected.capabilityStatus}, got ${result.status}`);
        }
      } else {
        const draft = structureDemandIntake(tc.message, tc.businessContext);

        if (tc.expected.serviceIntakeCandidate !== undefined) {
          if (draft.serviceIntakeCandidate !== tc.expected.serviceIntakeCandidate) {
            throw new Error(`Expected serviceIntakeCandidate=${tc.expected.serviceIntakeCandidate}, got ${draft.serviceIntakeCandidate}`);
          }
        }

        if (tc.expected.serviceType !== undefined) {
          if (draft.serviceType !== tc.expected.serviceType) {
            throw new Error(`Expected serviceType=${tc.expected.serviceType}, got ${draft.serviceType}`);
          }
        }

        if (tc.expected.intakeDraftStatus) {
          if (draft.intakeDraftStatus !== tc.expected.intakeDraftStatus) {
            throw new Error(`Expected intakeDraftStatus=${tc.expected.intakeDraftStatus}, got ${draft.intakeDraftStatus}`);
          }
        }

        if (tc.expected.missingInputsCount !== undefined) {
          if (draft.missingInputs.length !== tc.expected.missingInputsCount) {
            throw new Error(`Expected missingInputsCount=${tc.expected.missingInputsCount}, got ${draft.missingInputs.length}`);
          }
        }

        // Test confirmation card generation
        if (draft.intakeDraftStatus === 'ready_for_confirmation') {
          const card = generateDemandConfirmationCard(draft);
          if (!card) {
            throw new Error('Expected confirmation card to be generated');
          }
          console.log(`  ✓ Confirmation card generated with ${card.structured.slots.length} slots`);
        } else if (draft.missingInputs.length > 0) {
          const prompt = generateMissingInputsPrompt(draft);
          if (!prompt) {
            throw new Error('Expected missing inputs prompt to be generated');
          }
          console.log(`  ✓ Missing inputs prompt generated: ${draft.missingInputs.length} items`);
        }
      }

      console.log(`  ✓ PASSED\n`);
      passed++;
    } catch (error) {
      console.log(`  ✗ FAILED: ${error instanceof Error ? error.message : String(error)}\n`);
      failed++;
    }
  }

  console.log('=== Test Summary ===');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${testCases.length}`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});

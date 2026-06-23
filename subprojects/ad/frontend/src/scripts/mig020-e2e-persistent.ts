/**
 * MIG-020 E2E测试 - 持久化登录状态
 */
import { chromium } from 'playwright';
import { writeFileSync, existsSync } from 'node:fs';

const BASE_URL = 'http://10.236.14.27:8002';
const USER_DATA_DIR = 'E:/AI/ai-os/.runtime/chrome-e2e-persistent';

// MIG-020测试用例
const MIG_020 = {
  id: 'MIG-020',
  scenario: '广告报表-语义理解-SEM-025',
  input: '指间山海 - 国内2026-05-01~2026-05-07哪个媒体的激活成本最低',
};

interface ChatResult {
  answer: string;
  done: Record<string, unknown> | null;
  events: Array<Record<string, unknown>>;
  responseContract: Record<string, unknown>;
  responseMetadata: Record<string, unknown>;
}

function randomToken(): string {
  return Math.random().toString(36).slice(2, 12);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

async function chat(page: any, message: string, conversationId: string): Promise<ChatResult> {
  const inputJson = JSON.stringify({ message, conversationId });
  return page.evaluate(String.raw`(async () => {
    const { message: inputMessage, conversationId: inputConversationId } = ` + inputJson + String.raw`;
    function isRecord(value) {
      return Boolean(value && typeof value === 'object' && !Array.isArray(value));
    }

    function parseSse(raw) {
      return raw
        .split(/\n\n+/)
        .map(block => block.trim())
        .filter(Boolean)
        .flatMap(block => block
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.startsWith('data:'))
          .map((line) => {
            try {
              return JSON.parse(line.slice(5).trim());
            } catch {
              return null;
            }
          })
          .filter((item) => Boolean(item)));
    }

    const response = await window.fetch('/api/chat', {
      signal: AbortSignal.timeout(180000),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-conversation-id': inputConversationId,
        'x-pathname': '/mig020-e2e-test',
      },
      credentials: 'include',
      body: JSON.stringify({
        message: inputMessage,
        intent: 'general_chat',
        history: [],
        metadata: {},
      }),
    });
    const raw = await response.text();
    if (!response.ok) {
      throw new Error('chat http ' + response.status + ': ' + raw.slice(0, 220));
    }

    const payloads = parseSse(raw);
    let answer = '';
    let done = null;
    const events = [];
    for (const payload of payloads) {
      if (payload.type === 'content' && typeof payload.content === 'string') answer += payload.content;
      if (payload.type === 'process_event' && isRecord(payload.event)) events.push(payload.event);
      if (payload.type === 'done') done = payload;
    }

    const metadata = isRecord(done?.metadata) ? done.metadata : {};
    const responseContract = isRecord(metadata.response_contract) ? metadata.response_contract : {};
    const responseMetadata = isRecord(responseContract.metadata) ? responseContract.metadata : {};
    return { answer, done, events, responseContract, responseMetadata };
  })()`);
}

async function main(): Promise<void> {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`MIG-020 E2E验收测试`);
  console.log(`${'='.repeat(70)}\n`);

  const hasProfile = existsSync(USER_DATA_DIR);
  console.log(`[INFO] 浏览器配置目录: ${USER_DATA_DIR}`);
  console.log(`[INFO] 状态: ${hasProfile ? '已有登录记录' : '首次运行，需要登录'}`);

  console.log('[INFO] 启动浏览器...');
  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    args: ['--disable-blink-features=AutomationControlled'],
    viewport: { width: 1280, height: 720 },
  });

  const page = await context.newPage();

  try {
    console.log(`[INFO] 访问 ${BASE_URL}`);
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log(`[INFO] 当前URL: ${page.url()}`);

    // 检查是否需要登录
    if (new URL(page.url()).pathname.startsWith('/login')) {
      console.log(`\n${'!'.repeat(70)}`);
      console.log('请在浏览器中扫码登录（登录状态会被保存，下次无需重复登录）');
      console.log('等待时间: 300 秒（5分钟）');
      console.log(`${'!'.repeat(70)}\n`);

      console.log('[INFO] 等待用户扫码登录...');

      // 设置更长的超时
      await page.waitForURL((url) => !url.pathname.startsWith('/login'), {
        timeout: 300000, // 5分钟
        waitUntil: 'networkidle',
      });

      console.log('[INFO] ✓ 登录成功！状态已保存');
    } else {
      console.log('[INFO] ✓ 使用已保存的登录状态');
    }

    console.log(`[INFO] 当前URL: ${page.url()}`);

    // 等待页面完全加载
    await page.waitForLoadState('networkidle');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 执行MIG-020测试
    console.log(`\n${'-'.repeat(70)}`);
    console.log(`测试用例: ${MIG_020.id}`);
    console.log(`场景: ${MIG_020.scenario}`);
    console.log(`输入: ${MIG_020.input}`);
    console.log(`${'-'.repeat(70)}\n`);

    const conversationId = `mig020-e2e-${randomToken()}`;
    console.log(`[INFO] 发送请求 (conversation: ${conversationId})`);

    const startTime = Date.now();
    const result = await chat(page, MIG_020.input, conversationId);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`\n[INFO] 响应时间: ${duration}s`);
    console.log(`\n${'='.repeat(70)}`);
    console.log('回答内容:');
    console.log(`${'='.repeat(70)}`);
    console.log(result.answer);
    console.log(`${'='.repeat(70)}\n`);

    // 分析结果
    console.log('[INFO] 分析结果...\n');

    const intent = result.responseContract?.intent || result.responseMetadata?.intent || 'unknown';
    console.log(`[CHECK] 意图识别: ${intent}`);
    const isReportIntent = typeof intent === 'string' && (
      intent.toLowerCase().includes('report') ||
      intent.toLowerCase().includes('query') ||
      intent.toLowerCase().includes('数据') ||
      intent.toLowerCase().includes('报表')
    );
    console.log(`  ${isReportIntent ? '✓' : '✗'} ${isReportIntent ? '识别为数据/报表查询' : '未正确识别为报表查询'}`);

    const events = result.events || [];
    const mcpEvents = events.filter(e =>
      e.type === 'mcp.call' ||
      e.type === 'mcp.result' ||
      (typeof e.type === 'string' && e.type.includes('mcp'))
    );
    console.log(`\n[CHECK] MCP调用: ${mcpEvents.length} 个事件`);
    if (mcpEvents.length > 0) {
      console.log('  ✓ 调用了MCP工具');
      mcpEvents.forEach((e, i) => {
        console.log(`    [${i + 1}] ${e.type}: ${JSON.stringify(e).slice(0, 200)}`);
      });
    } else {
      console.log('  ✗ 未检测到MCP调用');
    }

    const answerLower = result.answer.toLowerCase();
    const hasExpectedAnswer = answerLower.includes('巨量') || answerLower.includes('巨量广告');
    console.log(`\n[CHECK] 返回结果包含"巨量广告": ${hasExpectedAnswer ? '是' : '否'}`);
    console.log(`  ${hasExpectedAnswer ? '✓' : '✗'} ${hasExpectedAnswer ? '返回结果正确' : '返回结果不包含预期答案'}`);

    const hasSourceRefs = result.responseContract?.source_refs ||
                         (result.done && isRecord(result.done.result) &&
                          isRecord(result.done.result.structured_payload) &&
                          Array.isArray(result.done.result.structured_payload.source_refs));
    console.log(`\n[CHECK] 输出查询口径/数据来源: ${hasSourceRefs ? '是' : '否'}`);
    console.log(`  ${hasSourceRefs ? '✓' : '△'} ${hasSourceRefs ? '提供了数据来源信息' : '未明确提供数据来源'}`);

    // 保存结果
    console.log(`\n${'='.repeat(70)}`);
    console.log('完整响应元数据:');
    console.log(`${'='.repeat(70)}`);
    console.log(JSON.stringify(result.responseMetadata, null, 2));

    const resultFile = `E:/AI/ai-os/.runtime/mig020-e2e-result-${Date.now()}.json`;
    const resultData = {
      caseId: MIG_020.id,
      scenario: MIG_020.scenario,
      input: MIG_020.input,
      answer: result.answer,
      duration: `${duration}s`,
      responseContract: result.responseContract,
      responseMetadata: result.responseMetadata,
      events: result.events,
      timestamp: new Date().toISOString(),
      checks: {
        intentRecognition: isReportIntent,
        mcpCall: mcpEvents.length > 0,
        expectedAnswer: hasExpectedAnswer,
        sourceRefs: hasSourceRefs,
      }
    };
    writeFileSync(resultFile, JSON.stringify(resultData, null, 2));
    console.log(`\n[INFO] 结果已保存到: ${resultFile}`);

    // 总结
    console.log(`\n${'='.repeat(70)}`);
    console.log('MIG-020 测试总结:');
    console.log(`${'='.repeat(70)}`);
    const allChecks = [
      isReportIntent ? '✓' : '✗',
      mcpEvents.length > 0 ? '✓' : '✗',
      hasExpectedAnswer ? '✓' : '✗',
      hasSourceRefs ? '✓' : '△',
    ];
    console.log(`意图识别: ${allChecks[0]}`);
    console.log(`MCP调用: ${allChecks[1]}`);
    console.log(`返回结果: ${allChecks[2]}`);
    console.log(`数据来源: ${allChecks[3]}`);
    console.log(`\n总体结果: ${allChecks.filter(c => c === '✓').length}/4 通过`);

  } catch (error) {
    console.error('\n[ERROR]', error);
    console.log('\n[INFO] 发生错误，浏览器将在30秒后关闭...');
    console.log('[INFO] 如果需要调试，请在30秒内检查浏览器窗口');
    await new Promise(resolve => setTimeout(resolve, 30000));
    process.exitCode = 1;
  } finally {
    try {
      console.log('\n[INFO] 关闭浏览器...');
      await context.close();
    } catch (e) {
      console.log('[INFO] 浏览器已关闭或连接已断开');
    }
  }

  console.log(`\n${'='.repeat(70)}\n`);
}

main().catch((error) => {
  console.error('[ERROR]', error);
  process.exitCode = 1;
});

/**
 * 测试有效性验证 — 用 10 条代表性用例验证评估标准
 * 严格检查：回答是否包含预期数据/结论，而非仅仅"追问"
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:8002';
const AUTH_FILE = path.resolve('E:/AI/ai-os/subprojects/ad/tmp/auth-state.json');

const auth = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));
const cookieHeader = auth.cookies.map(c => `${c.name}=${c.value}`).join('; ');

// 10 条代表性用例：Prompt + 期望关键点
const SAMPLE_CASES = [
  {
    id: 'DATE-001',
    prompt: '指间山海 2026年3月1日至3月15日的激活数和注册数',
    expectKeywords: ['11819', '11,819', '10554', '10,554'],
    expectType: 'data_return',  // 应返回数据
  },
  {
    id: 'DIA-001',
    prompt: '指间山海 20260521的激活数是多少',
    expectKeywords: ['74'],
    expectType: 'data_return',
  },
  {
    id: 'ACC-001',
    prompt: '验证指间山海 2026-03-15 的广告激活数是否为 1250',
    expectKeywords: ['707'],
    expectType: 'data_return',
  },
  {
    id: 'SEM-009',
    prompt: '指间山海2026-05-11~2026-05-17哪个媒体的累计ROI最高',
    expectKeywords: ['巨量', 'ROI', '8.28'],
    expectType: 'data_return',
  },
  {
    id: 'MDIM-001',
    prompt: '指间山海在iOS端巨量引擎和腾讯广告的2026-04-02至2026-04-08激活数对比',
    expectKeywords: ['巨量', '腾讯', '1218'],
    expectType: 'data_return',
  },
  {
    id: 'MIG-001',
    prompt: '南京本周日天气如何',
    expectKeywords: ['天气', '温度', '℃', '度', '南京'],
    expectType: 'info_return',
  },
  {
    id: 'MIG-002',
    prompt: '最近有哪些游戏上线',
    expectKeywords: ['游戏', '上线', '新游'],
    expectType: 'info_return',
  },
  {
    id: 'MIG-000',
    prompt: '你好',
    expectKeywords: ['你好', '小乔', '助手'],
    expectType: 'chat',
  },
  {
    id: 'MIG-005',
    prompt: '我们支持鸿蒙吗',
    expectKeywords: ['鸿蒙', 'HarmonyOS', '支持', '不支持'],
    expectType: 'knowledge',
  },
  {
    id: 'MIG-007',
    prompt: '有效是哪个点位',
    expectKeywords: ['点位', '广告', '激活', '注册', '有效'],
    expectType: 'knowledge',
  },
];

function sendChat(prompt) {
  return new Promise((resolve) => {
    const body = JSON.stringify({ message: prompt });
    const req = http.request({
      hostname: 'localhost', port: 8002, path: '/api/chat', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), 'Cookie': cookieHeader },
    }, res => {
      let buf = ''; res.setEncoding('utf-8');
      res.on('data', c => buf += c);
      res.on('end', () => {
        const m = buf.match(/data: {"type":"done".*}/);
        if (m) {
          const d = JSON.parse(m[0].slice(6));
          resolve({
            answer: d.result.answer || '',
            intent: d.result.response_contract?.intent_type || '',
            status: d.result.response_contract?.status || '',
          });
        } else resolve({ answer: '[no done]', intent: '?', status: '?' });
      });
    });
    req.setTimeout(120000, () => { req.destroy(); resolve({ answer: '[timeout]', intent: '?', status: '?' }); });
    req.on('error', e => resolve({ answer: `[err:${e.message}]`, intent: '?', status: '?' }));
    req.write(body); req.end();
  });
}

function evaluateStrict(caseDef, result) {
  const { answer, intent, status } = result;

  // 1. 空回答/错误
  if (!answer || answer.startsWith('[')) return { pass: false, reason: `回答异常: ${answer.slice(0, 50)}` };

  // 2. 需要登录
  if (/需要登录|登录后才能/.test(answer)) return { pass: false, reason: '需要登录' };

  // 3. 系统错误
  if (status === 'error' || /系统错误|服务异常/.test(answer)) return { pass: false, reason: '系统错误' };

  // 4. 对于 chat 类型，有合理回答就行
  if (caseDef.expectType === 'chat') {
    return { pass: answer.length > 5, reason: answer.length > 5 ? '正常回应' : '回答过短' };
  }

  // 5. 对于需要返回数据的用例 — 检查是否包含预期数据
  const matchedKeywords = caseDef.expectKeywords.filter(kw => answer.includes(kw));
  const hasExpectedData = matchedKeywords.length > 0;

  // 6. 检查是否是无效追问（参数齐全时不应该追问）
  const isAskingForProject = /确认项目|哪个项目|什么项目|请.*项目/.test(answer);
  const isAskingForMetric = /确认.*指标|查看.*指标/.test(answer);
  const isUselessClarify = isAskingForProject || (isAskingForMetric && caseDef.expectType === 'data_return');

  if (caseDef.expectType === 'data_return') {
    if (hasExpectedData) return { pass: true, reason: `包含预期数据: [${matchedKeywords.join(', ')}]` };
    if (isUselessClarify) return { pass: false, reason: `无效追问（参数齐全）: "${answer.slice(0, 80)}"` };
    if (status === 'missing_input') return { pass: false, reason: `缺失输入（参数提取失败）: "${answer.slice(0, 80)}"` };
    if (answer.length < 50) return { pass: false, reason: `回答过短: "${answer.slice(0, 80)}"` };
    return { pass: false, reason: `未包含预期数据 [${caseDef.expectKeywords.join('|')}]: "${answer.slice(0, 100)}"` };
  }

  if (caseDef.expectType === 'info_return' || caseDef.expectType === 'knowledge') {
    if (hasExpectedData) return { pass: true, reason: `包含关键信息: [${matchedKeywords.join(', ')}]` };
    if (answer.length > 30) return { pass: true, reason: `有实质内容（长度${answer.length}）` };
    return { pass: false, reason: `内容不足: "${answer.slice(0, 80)}"` };
  }

  return { pass: answer.length > 10, reason: `通用评估: 长度${answer.length}` };
}

async function main() {
  console.log('🔍 测试有效性验证（10 条代表性用例）');
  console.log('   严格模式：检查是否返回预期数据，不接受无效追问\n');

  let passCount = 0;
  for (const c of SAMPLE_CASES) {
    process.stdout.write(`${c.id.padEnd(12)} ${c.prompt.slice(0, 35).padEnd(35)} `);
    const start = Date.now();
    const result = await sendChat(c.prompt);
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    const ev = evaluateStrict(c, result);
    if (ev.pass) passCount++;
    const icon = ev.pass ? '✅' : '❌';
    console.log(`${icon} ${ev.reason} (${elapsed}s)`);
    if (!ev.pass) {
      console.log('   ↳ 回答:', result.answer.slice(0, 150));
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`📊 有效性验证结果: ${passCount}/${SAMPLE_CASES.length} 通过 (${(passCount / SAMPLE_CASES.length * 100).toFixed(0)}%)`);
  console.log('='.repeat(60));

  if (passCount <= 2) {
    console.log('\n⚠️  通过率过低，测试确认无效 — 存在系统性问题需要修复');
  } else if (passCount <= 5) {
    console.log('\n⚠️  通过率偏低 — 部分功能正常，但有显著缺陷');
  } else {
    console.log('\n✅ 通过率正常 — 评估标准有效');
  }
}

main().catch(console.error);

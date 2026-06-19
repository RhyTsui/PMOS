/**
 * Skill Integration Verification Script
 * Run in browser console at http://localhost:8002
 */

console.log('🧪 Skill Integration Verification');
console.log('='.repeat(50));

// Test 1: Check skill contract store
console.log('\n1️ Testing skill contract store...');
const skillStorePath = '/api/xiaoqiao/skill-contracts';
fetch(skillStorePath)
  .then(r => r.json())
  .then(data => {
    console.log('✅ Skill contracts loaded:', data.length || data.contracts?.length || 'unknown');
    const contractIds = (data.contracts || data || []).map(c => c.skill_id);
    console.log('   Skills:', contractIds);

    // Check for our new skills
    const hasCallbackDiagnosis = contractIds.includes('callback-attribution-diagnosis');
    const hasReportOrchestration = contractIds.includes('report-orchestration');
    console.log(`   - callback-attribution-diagnosis: ${hasCallbackDiagnosis ? '✅' : '❌'}`);
    console.log(`   - report-orchestration: ${hasReportOrchestration ? '✅' : '❌'}`);
  })
  .catch(err => console.error('❌ Failed to load skill contracts:', err));

// Test 2: Check MCP servers
console.log('\n2️⃣ Testing MCP server configuration...');
const mcpServerPath = '/api/xiaoqiao/mcp-servers';
fetch(mcpServerPath)
  .then(r => r.json())
  .then(data => {
    const servers = data.servers || data || [];
    console.log(`✅ MCP servers: ${servers.length}`);
    servers.forEach(s => {
      const status = s.status === 'connected' ? '✅' : s.status === 'disconnected' ? '⚠️' : '❌';
      console.log(`   ${status} ${s.name}: ${s.endpoint_url || 'no endpoint'}`);
    });
  })
  .catch(err => console.error('❌ Failed to load MCP servers:', err));

// Test 3: Test skill trigger detection
console.log('\n3️ Testing skill trigger detection...');
const testMessages = [
  { msg: '帮我看看为什么PAY没有回推', expected: 'callback-attribution-diagnosis' },
  { msg: 'iOS激活回调有问题', expected: 'callback-attribution-diagnosis' },
  { msg: '创建一个每日报表', expected: 'report-orchestration' },
  { msg: '普通问题', expected: null },
];

testMessages.forEach(({ msg, expected }) => {
  const lowerMsg = msg.toLowerCase();
  const triggers = [
    '安卓归因', 'android归因', '安卓回推', 'android回推', '媒体回推',
    'sdk回推', 'api回推', 'pay未回推', 'feedback-res', '804',
    '归因失败', '联调失败', '回传失败', '归因问题',
    'ios归因', 'ios归因', '苹果归因', 'ios回推',
    '鸿蒙归因', '鸿蒙回推', 'harmony归因',
    '微信归因', '微信回推', '微信小游戏',
    '抖音归因', '抖音回推', '抖音小游戏',
    'callback', 'attribution',
  ];
  const matched = triggers.filter(t => lowerMsg.includes(t.toLowerCase()));
  const detected = matched.length > 0 ? 'callback-attribution-diagnosis' : null;

  const reportTriggers = ['报表', '报告', '模板', '定时任务', '定时报表', '自动报表', '拼表'];
  const matchedReport = reportTriggers.filter(t => lowerMsg.includes(t.toLowerCase()));
  const detectedReport = matchedReport.length > 0 ? 'report-orchestration' : detected;

  const result = detectedReport === expected ? '✅' : '❌';
  console.log(`${result} "${msg}" → ${detectedReport || 'no match'} ${expected ? `(expected: ${expected})` : ''}`);
});

console.log('\n Verification Summary:');
console.log('   - Skill contracts: Check console above');
console.log('   - MCP servers: Check console above');
console.log('   - Skill triggers: Check console above');
console.log('\n✅ Verification script completed');
console.log('   Open http://localhost:8002 and check browser console');

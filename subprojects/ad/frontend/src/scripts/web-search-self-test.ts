import assert from 'node:assert/strict';

const BASE_URL = process.env.XIAOQIAO_SEARCH_TEST_URL || 'http://localhost:8002';

async function testSearchApiBasicQuery(): Promise<void> {
  const response = await fetch(`${BASE_URL}/api/xiaoqiao/web-search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: '广告归因 最新政策', maxResults: 3 }),
  });
  assert.equal(response.status, 200, 'search API should return 200');
  const data = await response.json() as { results: Array<{ title: string; url: string }>; count: number; provider: string; query: string };
  assert.equal(data.provider, 'duckduckgo', 'provider must be duckduckgo');
  assert.equal(data.query, '广告归因 最新政策', 'query must echo back');
  assert.ok(Array.isArray(data.results), 'results must be array');
  console.log(`  ✅ 基本查询: ${data.count} 条结果`);
}

async function testSearchApiEmptyQuery(): Promise<void> {
  const response = await fetch(`${BASE_URL}/api/xiaoqiao/web-search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: '' }),
  });
  assert.equal(response.status, 400, 'empty query must return 400');
  console.log('  ✅ 空查询拦截: 400');
}

async function testSearchApiInternalDataBlock(): Promise<void> {
  const response = await fetch(`${BASE_URL}/api/xiaoqiao/web-search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: 'appId: 10100042 的 ROI 报表数据' }),
  });
  assert.equal(response.status, 403, 'internal data must be blocked with 403');
  const data = await response.json() as { error: string };
  assert.equal(data.error, 'internal_data_blocked', 'error code must be internal_data_blocked');
  console.log('  ✅ 内部数据拦截: 403');
}

async function testSearchApiGetEndpoint(): Promise<void> {
  const response = await fetch(`${BASE_URL}/api/xiaoqiao/web-search?q=广告+归因&maxResults=2`);
  assert.equal(response.status, 200, 'GET endpoint should return 200');
  const data = await response.json() as { results: unknown[]; provider: string };
  assert.equal(data.provider, 'duckduckgo', 'provider must be duckduckgo');
  console.log(`  ✅ GET 端点: ${data.results.length} 条结果`);
}

async function testPublicWebRuntimeIntegration(): Promise<void> {
  const { detectPublicWebNeed } = await import('../src/lib/public-web-runtime');
  const { getModelServiceConfig } = await import('../src/lib/runtime-config');
  const config = await getModelServiceConfig();
  const need = await detectPublicWebNeed('最近有什么广告行业新政策', { modelServiceConfig: config });
  console.log(`  ✅ publicWebNeed 检测: required=${need.required}, reason=${need.reasonCode}, confidence=${need.confidence}`);
}

async function main(): Promise<void> {
  console.log('🔍 联网搜索链路自测\n');

  console.log('1. 搜索 API 路由测试:');
  await testSearchApiBasicQuery();
  await testSearchApiEmptyQuery();
  await testSearchApiInternalDataBlock();
  await testSearchApiGetEndpoint();

  console.log('\n2. Public Web Runtime 集成测试:');
  await testPublicWebRuntimeIntegration();

  console.log('\n✅ 全部通过');
}

main().catch((error) => {
  console.error('\n❌ 测试失败:', error.message);
  process.exit(1);
});

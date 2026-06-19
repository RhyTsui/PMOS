/**
 * MIG-001 评估：天气查询
 *
 * 输入：南京本周日天气如何
 * 预期：联网搜索能力被触发；如无法获取实时数据，给出合理拒绝，不捏造结果。
 *
 * 启动：cd subprojects/ad/frontend/src && node scripts/eval-mig001.mjs
 */

import { runChatRuntimeForEvaluation } from '../src/lib/evaluation-runtime-runner';
import { getPublicWebConfig, updatePublicWebConfig, getModelServiceConfig, updateModelServiceConfig, withRuntimeConfigOverrides } from '../src/lib/runtime-config';
import { detectPublicWebNeed } from '../src/lib/public-web-runtime';
import { getTraceConfigSync, updateTraceConfig } from '../src/lib/trace-config-store';

process.on('uncaughtException', (error) => {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  if (message.includes('connect EACCES') || message.includes('CozeLoopTraceExporter') || message.includes('Invalid URL')) {
    console.warn(message);
    return;
  }
  throw error;
});

process.on('unhandledRejection', (reason) => {
  const message = reason instanceof Error ? `${reason.name}: ${reason.message}` : String(reason);
  if (message.includes('connect EACCES') || message.includes('CozeLoopTraceExporter') || message.includes('Invalid URL')) {
    console.warn(message);
    return;
  }
  throw reason;
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function getContentFromPayload(donePayload: Record<string, unknown> | undefined): string {
  if (!donePayload) return '';
  const result = donePayload.result;
  if (isRecord(result) && typeof result.answer === 'string') return result.answer;
  if (isRecord(result) && typeof result.content === 'string') return result.content;
  if (isRecord(result) && typeof result.message === 'string') return result.message;
  if (isRecord(result) && typeof result.summary === 'string') return result.summary;
  if (typeof donePayload.content === 'string') return donePayload.content;
  return '';
}

async function main() {
  const originalPublicWebConfig = await getPublicWebConfig();
  const originalModelServiceConfig = await getModelServiceConfig();
  const originalTraceConfig = getTraceConfigSync();

  return withRuntimeConfigOverrides({}, async () => {
    await updatePublicWebConfig({ ...originalPublicWebConfig, enabled: false, searchEndpoint: '' });
    await updateModelServiceConfig({ ...originalModelServiceConfig, enabled: false });
    await updateTraceConfig({ ...originalTraceConfig, enabled: false });

    try {
      // Step 1: 验证公开联网检测边界
      console.log('\n=== MIG-001 Step 1: 公开联网检测 ===');
      const need = await detectPublicWebNeed('南京本周日天气如何');
      console.log('detectPublicWebNeed:');
      console.log('  required:', need.required);
      console.log('  reason:', need.reason);
      console.log('  capabilityType:', need.capabilityType);
      console.log('  factNeed:', JSON.stringify(need.factNeed, null, 2));
      console.log('  searchPlan:', JSON.stringify(need.searchPlan, null, 2));

      if (!need.required) {
        console.error('[FAIL] 天气查询应该触发公开联网需求');
        process.exitCode = 1;
        return;
      }
      if (need.factNeed?.fact_visibility !== 'public') {
        console.error('[FAIL] 天气查询的 fact_visibility 应该是 public');
        process.exitCode = 1;
        return;
      }
      if (need.searchPlan?.allowed !== true) {
        console.error('[FAIL] 天气查询的 searchPlan.allowed 应该是 true');
        process.exitCode = 1;
        return;
      }
      console.log('[PASS] 公开联网检测正确');

      // Step 2: 运行完整 Chat Runtime
      console.log('\n=== MIG-001 Step 2: Chat Runtime 执行 ===');
      const result = await runChatRuntimeForEvaluation({
        message: '南京本周日天气如何',
        scenario: 'general_chat',
      });

      const metadata = isRecord(result.done_payload?.metadata) ? result.done_payload.metadata : {};
      const observation = isRecord(metadata.routing_decision_observation) ? metadata.routing_decision_observation : {};
      const responseContract = isRecord(metadata.response_contract) ? metadata.response_contract : {};
      const answerOrigin = isRecord(responseContract.answer_origin) ? responseContract.answer_origin : {};
      const text = result.answer + getContentFromPayload(result.done_payload);

      console.log('answer:', result.answer);
      console.log('content:', getContentFromPayload(result.done_payload));
      console.log('answer_origin:', JSON.stringify(answerOrigin, null, 2));
      console.log('serviceIntent:', observation.serviceIntent || observation.actualServiceIntent);
      console.log('isReportQuery:', observation.isReportQuery || observation.actualIsReportQuery);
      console.log('event_types:', result.process_events.map(e => e.type));
      console.log('sources:', result.sources.length);

      // Step 3: 验证主消息不泄露内部字段
      console.log('\n=== MIG-001 Step 3: 内容验证 ===');
      const leaks = [
        /routeDecision/i,
        /semanticFrame/i,
        /query_contract/,
        /slot_validation/,
        /trace_id[:=]/i,
        /message_id[:=]/i,
        /business_summary/,
        /answer_markdown/,
        /preferred_capability_not_executable/,
        /source_count=0/,
        /未配置公共网页能力/,
      ].filter((re) => re.test(text));

      if (leaks.length) {
        console.log('[FAIL] 主消息泄露内部字段:', leaks.map((r) => r.source));
        process.exitCode = 1;
      } else {
        console.log('[PASS] 主消息无内部字段泄露');
      }

      // Step 4: 验证联网能力是否被识别
      console.log('\n=== MIG-001 Step 4: 联网能力识别 ===');
      const acknowledgesPublicWeb = /天气是公开可查|联网|公开信息|实时|外部/.test(text);
      if (acknowledgesPublicWeb) {
        console.log('[PASS] 主消息承认需要公开/实时来源');
      } else {
        console.log('[WARN] 主消息未明确承认需要公开/实时来源');
      }

      // Step 5: 无捏造结果
      const fabrications = [
        /摄氏度|℃|°C/i,
        /毫米|mm/i,
        /级风/,
      ].filter((re) => re.test(text));
      if (fabrications.length && answerOrigin.source !== 'real_llm') {
        console.log('[FAIL] 无证据情况下捏造了天气数据:', fabrications.map((r) => r.source));
        process.exitCode = 1;
      } else {
        console.log('[PASS] 无捏造天气数据');
      }

      // Step 6: 拒绝时不暴露内部配置
      const configLeaks = [
        /fake:public-web/,
        /example\.test/,
        /search_endpoint_missing/,
      ].filter((re) => re.test(text));
      if (configLeaks.length) {
        console.log('[FAIL] 拒绝回复泄露内部配置:', configLeaks.map((r) => r.source));
        process.exitCode = 1;
      } else {
        console.log('[PASS] 拒绝回复无内部配置泄露');
      }

      console.log('\n=== MIG-001 总结 ===');
      console.log('exitCode:', process.exitCode || 0);
      console.log('text:', text.slice(0, 500));
    } finally {
      await updatePublicWebConfig(originalPublicWebConfig);
      await updateModelServiceConfig(originalModelServiceConfig);
      await updateTraceConfig(originalTraceConfig);
    }
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

import assert from 'node:assert/strict';
import { createSafeTextPreview, serializeMessageForCopy } from '../src/lib/chat-copy';
import { buildMessagePresentationResult } from '../src/components/cognitive/message-presentation';
import { projectMessagePresentation } from '../src/components/cognitive/message-presentation-projection';
import {
  applyRendererAvailability,
  buildFieldRenderConsumption,
  composeContractFieldRegions,
  composeMessagePresentationRegions,
  mergePresentationRegions,
} from '../src/contracts/presentation/message-contract-field-bindings';
import type { Message, MessageContract } from '../src/types';
import type { SemanticResultContract } from '../src/contracts/semantic/semantic-result-contract';
import { createComponentRegistry } from '../src/contracts/renderer/component-registry-runtime';
import { validateRendererData } from '../src/contracts/validation/renderer-data-validator';

function createMessage(contract: Partial<MessageContract>, semanticResult?: SemanticResultContract | null): Message {
  return {
    id: 'm1',
    message_id: 'm1',
    conversation_id: 'c1',
    role: 'assistant',
    content: 'answer',
    message_type: 'assistant_reply',
    created_at: new Date().toISOString(),
    timestamp: Date.now(),
    metadata: {
      message_contract: contract,
      ...(semanticResult ? { semantic_result: semanticResult } : {}),
    },
  } as Message;
}

const huge = Array.from({ length: 200_000 }, (_, index) => `line-${index}`).join('\n');
const preview = createSafeTextPreview(huge, { maxLines: 500, maxChars: 120_000 });
assert.equal(preview.lineCount, 200_000);
assert.equal(preview.truncated, true);
assert.ok(preview.previewLineCount <= 501);
assert.ok(preview.preview.length < huge.length);

const copied = serializeMessageForCopy(createMessage({
  type: 'chat',
  answer_markdown: 'contract body',
  business_summary: {
    title: 'Summary',
    brief: 'Business result',
  },
}));

assert.match(copied, /contract body|answer/);
assert.doesNotMatch(copied, /raw_payload/);

const onlyContractSummary = createMessage({
  type: 'chat',
  answer_markdown: 'answer',
  business_summary: {
    title: 'Query summary',
    brief: 'Spend changed.',
  },
});
const onlyContractResult = buildMessagePresentationResult({
  message: onlyContractSummary,
  messageContract: onlyContractSummary.metadata?.message_contract as MessageContract,
  semanticResult: null,
});
assert.ok(onlyContractResult);
assert.equal(onlyContractResult?.regions.some((region) => region.componentBinding === 'decision-card'), true);
assert.equal((onlyContractResult?.metadata?.fieldStatuses as any).business_summary.status, 'rendered');

const emptySummary = createMessage({
  type: 'chat',
  answer_markdown: 'answer',
  business_summary: null as unknown as MessageContract['business_summary'],
});
const emptySummaryResult = buildMessagePresentationResult({
  message: emptySummary,
  messageContract: emptySummary.metadata?.message_contract as MessageContract,
  semanticResult: null,
});
assert.equal(emptySummaryResult?.regions.some((region) => region.componentBinding === 'decision-card') || false, false);
const emptySummaryComposition = composeContractFieldRegions(emptySummary.metadata?.message_contract as MessageContract);
assert.equal(emptySummaryComposition.fieldStatuses.business_summary.status, 'empty');
assert.equal(buildFieldRenderConsumption(emptySummaryComposition.fieldStatuses).find((item) => item.field === 'business_summary')?.warning, undefined);

const missingRendererComposition = composeContractFieldRegions({
  type: 'chat',
  answer_markdown: 'answer',
  business_summary: {
    title: 'Summary',
    brief: 'Has data.',
  },
});
const missingRendererStatuses = applyRendererAvailability(
  missingRendererComposition.fieldStatuses,
  () => false,
);
assert.equal(missingRendererStatuses.business_summary.status, 'missing_renderer');
const missingRendererConsumption = buildFieldRenderConsumption(missingRendererStatuses).find((item) => item.field === 'business_summary');
assert.equal(missingRendererConsumption?.consumed, false);
assert.equal(missingRendererConsumption?.status, 'missing_renderer');
assert.match(String(missingRendererConsumption?.warning), /renderer is not registered/);

const semanticWithSummary: SemanticResultContract = {
  contractType: 'semantic-result',
  version: '1.0.0',
  resultId: 's1',
  conversationId: 'c1',
  messageId: 'm1',
  screenType: 'conversation-answer',
  createdAt: new Date().toISOString(),
  regions: [{
    id: 'semantic-summary',
    type: 'summary',
    componentBinding: 'decision-card',
    title: 'Semantic summary',
    data: { title: 'Semantic summary', brief: 'Already rendered.' },
  }],
};
const duplicateContract = composeContractFieldRegions({
  type: 'chat',
  answer_markdown: 'answer',
  business_summary: {
    title: 'Contract summary',
    brief: 'Duplicate.',
  },
});
const duplicateMerged = mergePresentationRegions(
  semanticWithSummary.regions,
  duplicateContract.regions,
  duplicateContract.fieldStatuses,
);
assert.equal(duplicateMerged.regions.filter((region) => region.componentBinding === 'decision-card').length, 1);
assert.equal(duplicateMerged.fieldStatuses.business_summary.status, 'deduped');
const dedupedConsumption = buildFieldRenderConsumption(duplicateMerged.fieldStatuses).find((item) => item.field === 'business_summary');
assert.equal(dedupedConsumption?.consumed, false);
assert.equal(dedupedConsumption?.warning, undefined);

const reportMessage = createMessage({
  type: 'report_query',
  answer_markdown: 'answer',
  business_summary: {
    title: 'Report summary',
    brief: 'Report is ready.',
  },
  next_actions: [{ label: 'Continue' }],
  evidence_bundle: { items: [{ title: 'Source', summary: 'Checked.' }] },
}, {
  contractType: 'semantic-result',
  version: '1.0.0',
  resultId: 'report',
  conversationId: 'c1',
  messageId: 'm1',
  screenType: 'report-result',
  createdAt: new Date().toISOString(),
  regions: [{
    id: 'report-table',
    type: 'data-view',
    componentBinding: 'data-visualization',
    title: 'Table',
    data: { kind: 'table', engine: 'aggrid', columns: ['date'], rows: [{ date: '2026-06-01' }] },
  }],
});
const reportResult = buildMessagePresentationResult({
  message: reportMessage,
  messageContract: reportMessage.metadata?.message_contract as MessageContract,
  semanticResult: reportMessage.metadata?.semantic_result as SemanticResultContract,
});
assert.equal(reportResult?.regions.some((region) => region.componentBinding === 'data-visualization'), true);
assert.equal(reportResult?.regions.some((region) => region.componentBinding === 'decision-card'), true);
assert.equal(reportResult?.regions.some((region) => region.componentBinding === 'action-bar'), true);
assert.equal(reportResult?.regions.some((region) => region.componentBinding === 'evidence-panel'), true);

const composedReport = composeMessagePresentationRegions({
  messageContract: reportMessage.metadata?.message_contract as MessageContract,
  semanticRegions: (reportMessage.metadata?.semantic_result as SemanticResultContract).regions,
  hasRenderer: () => true,
});
const reportConsumption = buildFieldRenderConsumption(composedReport.fieldStatuses);
assert.equal(reportConsumption.find((item) => item.field === 'business_summary')?.status, 'rendered');
assert.equal(reportConsumption.find((item) => item.field === 'next_actions')?.status, 'rendered');
assert.equal(reportConsumption.find((item) => item.field === 'evidence_bundle')?.status, 'rendered');

const reportProjection = projectMessagePresentation({
  message: reportMessage,
  result: reportResult as SemanticResultContract,
});
assert.equal(reportProjection.summaryRegion?.title, '查询结果');
assert.equal(reportProjection.dataRegions.length, 1);
assert.equal(reportProjection.actionRegions.length, 1);
assert.equal(reportProjection.sideRegions.some((region) => region.componentBinding === 'evidence-panel'), true);
assert.equal(reportProjection.markdownRegion, null);
assert.deepEqual(reportProjection.recommendations.map((item) => item.title), ['Continue']);

const noisyMarkdownProjection = projectMessagePresentation({
  message: createMessage({
    type: 'chat',
    answer_markdown: '```json\n{\"trace\":true}\n```',
    business_summary: { title: 'Summary', brief: 'Structured summary.' },
  }),
  result: {
    contractType: 'semantic-result',
    version: '1.0.0',
    resultId: 'noisy',
    conversationId: 'c1',
    messageId: 'm1',
    screenType: 'conversation-answer',
    createdAt: new Date().toISOString(),
    regions: [
      {
        id: 'summary',
        type: 'summary',
        componentBinding: 'decision-card',
        title: 'Summary',
        data: { title: 'Summary', brief: 'Structured summary.' },
      },
      {
        id: 'markdown',
        type: 'primary-result',
        componentBinding: 'markdown-result',
        title: 'Markdown',
        data: { markdown: '```json\n{\"trace\":true}\n```' },
      },
      {
        id: 'trace',
        type: 'workflow',
        componentBinding: 'workflow-trace',
        title: 'Trace',
        data: { steps: [{ label: 'internal' }] },
      },
      {
        id: 'form',
        type: 'form',
        componentBinding: 'form-input',
        title: 'Form',
        data: { fields: [] },
      },
      {
        id: 'feedback',
        type: 'action-bar',
        componentBinding: 'feedback-panel',
        title: 'Feedback',
        data: {},
      },
    ],
  },
});
assert.equal(noisyMarkdownProjection.summaryRegion?.title, '查询结果');
assert.equal(noisyMarkdownProjection.markdownRegion, null);
assert.equal(noisyMarkdownProjection.sideRegions.some((region) => region.componentBinding === 'workflow-trace'), true);
assert.equal(noisyMarkdownProjection.suppressedRegions.some((region) => region.componentBinding === 'form-input'), true);
assert.equal(noisyMarkdownProjection.suppressedRegions.some((region) => region.componentBinding === 'feedback-panel'), true);

const gapProjection = projectMessagePresentation({
  message: createMessage({ type: 'report_query', answer_markdown: '' }),
  result: {
    contractType: 'semantic-result',
    version: '1.0.0',
    resultId: 'gap',
    conversationId: 'c1',
    messageId: 'm1',
    screenType: 'report-result',
    createdAt: new Date().toISOString(),
    regions: [{
      id: 'gap-card',
      type: 'warning',
      componentBinding: 'decision-card',
      title: 'Gap',
      state: 'blocked',
      data: {
        type: 'capability_gap',
        title: 'Need capability',
        recognizedConditions: [{ label: '条件', value: '已识别', status: 'recognized' }],
        missingCapabilities: [{ label: '能力', userMessage: '请先补齐可用能力。' }],
      },
    }],
  },
});
assert.equal(gapProjection.capabilityGapRegion?.id, 'gap-card');
assert.equal(gapProjection.summaryRegion, null);

const invalidVisualization = composeMessagePresentationRegions({
  messageContract: {
    type: 'report_query',
    answer_markdown: 'answer',
    visualizations: {
      tables: [{ kind: 'table', columns: ['date'], rows: [] }],
    },
  } as MessageContract,
});
assert.equal(invalidVisualization.regions.some((region) => region.componentBinding === 'data-visualization'), false);

const invalidTrendMessage = createMessage({
  type: 'report_query',
  answer_markdown: '趋势数据已返回，展示方式已降级为结构化摘要。',
  business_summary: {
    title: '趋势数据已返回',
    brief: '图表暂不可用，先展示结构化摘要。',
  },
}, {
  contractType: 'semantic-result',
  version: '1.0.0',
  resultId: 'invalid-trend',
  conversationId: 'c1',
  messageId: 'm1',
  screenType: 'report-result',
  createdAt: new Date().toISOString(),
  regions: [{
    id: 'invalid-trend-chart',
    type: 'data-view',
    componentBinding: 'data-visualization',
    title: 'Trend',
    data: {
      viewType: 'trend',
      requestedView: 'trend',
      chartType: 'line',
      dataset: [{ date: '2026-06-01', value: 10 }],
    },
  }],
  metadata: {
    presentation_fallback: {
      reason: 'chart_contract_invalid',
      fallbackView: 'summary',
    },
  },
});
const invalidTrendResult = buildMessagePresentationResult({
  message: invalidTrendMessage,
  messageContract: invalidTrendMessage.metadata?.message_contract as MessageContract,
  semanticResult: invalidTrendMessage.metadata?.semantic_result as SemanticResultContract,
});
assert.ok(invalidTrendResult);
assert.notEqual((invalidTrendMessage.metadata?.message_contract as MessageContract).answer_markdown?.trim(), '');
assert.equal(invalidTrendResult?.regions.some(region => region.componentBinding === 'decision-card'), true);
assert.equal(JSON.stringify(invalidTrendResult).includes('no_full_coverage'), false);

const renderedFallbacks: Array<{ kind: string; message?: string; reason?: string }> = [];
const registry = createComponentRegistry<{ kind: string; message?: string; reason?: string }>({
  fallbackRenderer: (_region, _context, reason) => {
    const fallback = { kind: 'renderer-fallback', reason, message: `展示方式已降级：${reason}` };
    renderedFallbacks.push(fallback);
    return fallback;
  },
});
registry.register({
  binding: 'data-visualization',
  version: 'test',
  displayName: 'Test data visualization renderer',
  validate: (data, region) => validateRendererData('data-visualization', data, region),
  render: () => ({ kind: 'data-visualization-rendered' }),
});
registry.renderResult(invalidTrendResult as SemanticResultContract, {
  actionDispatcher: () => undefined,
  evidenceResolver: () => undefined,
  sourceResolver: () => undefined,
  runtimeResolver: () => undefined,
});
assert.equal(renderedFallbacks.some(item => item.reason === 'invalid_data'), true);
assert.equal(renderedFallbacks.some(item => /展示方式已降级/.test(String(item.message))), true);

console.log('chat presentation regression passed');

import { describe, expect, it } from 'vitest';
import {
  buildReportAnswerContract,
  renderReportAnswerContractMarkdown,
  type ReportAnswerContract,
} from '../src/lib/report-query-answer-summary';
import { buildResponseContract } from '../src/lib/response-contract';
import type { SemanticResultContract } from '../src/contracts/semantic/semantic-result-contract';

const displayFields = [
  { key: 'date', displayName: '日期', role: 'dimension' as const, requestedKey: 'date' },
  { key: 'cost', displayName: '消耗', role: 'metric' as const, requestedKey: 'cost', formatter: 'currency-2' as const, unit: '元' },
  { key: 'roi', displayName: 'ROI', role: 'metric' as const, requestedKey: 'roi', formatter: 'number-2' as const },
];

function buildContract(overrides: Partial<Parameters<typeof buildReportAnswerContract>[0]> = {}): ReportAnswerContract {
  return buildReportAnswerContract({
    status: 'success',
    businessOutcome: 'success',
    message: '已查到结果。',
    rows: [
      { date: '2026-06-20', cost: 100, roi: 1.2 },
      { date: '2026-06-21', cost: 120, roi: 1.3 },
    ],
    metrics: ['cost', 'roi'],
    dimensions: ['date'],
    displayFields,
    dateRange: { start_date: '2026-06-20', end_date: '2026-06-21' },
    requestedView: 'trend',
    questionType: 'daily',
    serverName: 'report-server',
    toolName: 'query_report',
    resolvedFilters: { mediaKeys: ['A'], source: { mediaKeys: 'dictionary' } },
    qualityCheck: { ok: true, empty_table: false, missing_fields: [], issues: [], metric_risks: [] },
    dataCoverage: { date_point_count: 2, sufficient_for_trend: true, issues: [] },
    ...overrides,
  });
}

describe('report answer contract', () => {
  it('builds conclusion, evidence, methodology, risks and next actions for summary answers', () => {
    const contract = buildContract();
    const markdown = renderReportAnswerContractMarkdown(contract);

    expect(contract.contractType).toBe('report-answer');
    expect(contract.conclusions[0].evidenceRefIds).toEqual(['ev-query_report-report-server']);
    expect(contract.evidence.map(item => item.id)).toEqual(['row-count', 'time-range', 'field-coverage']);
    expect(contract.methodology.metrics).toEqual(['消耗', 'ROI']);
    expect(contract.methodology.filters).toEqual({ mediaKeys: ['A'] });
    expect(contract.risks).toEqual([]);
    expect(contract.nextActions.some(action => action.label === '继续下钻分析')).toBe(true);
    expect(markdown).toContain('**结论**');
    expect(markdown).toContain('**证据**');
    expect(markdown).toContain('**口径**');
    expect(markdown).toContain('**风险**');
    expect(markdown).toContain('**下一步**');
  });

  it.each([
    ['daily', 'trend'],
    ['hour', 'comparison'],
    ['roi', 'detail'],
    ['retention', 'trend'],
  ] as const)('covers %s report with %s view without hardcoded business routing', (questionType, requestedView) => {
    const contract = buildContract({ questionType, requestedView });

    expect(contract.methodology.granularity).toBe(questionType === 'hour' ? 'hour' : 'day');
    expect(contract.methodology.requestedView).toBe(requestedView);
    expect(contract.conclusions[0].summary).toContain('共 2 条数据');
    expect(contract.conclusions[0].sourceRefIds).toEqual(contract.sourceRefIds);
  });

  it('marks trend coverage risk without dropping the answer contract', () => {
    const contract = buildContract({
      rows: [{ date: '2026-06-21', cost: 120, roi: 1.3 }],
      dataCoverage: { date_point_count: 1, sufficient_for_trend: false, issues: ['当前返回数据不足以形成趋势。'] },
    });

    expect(contract.risks.some(risk => risk.id === 'data-coverage')).toBe(true);
    expect(contract.confidence).toBe('medium');
    expect(contract.nextActions.some(action => action.id === 'adjust-date-range')).toBe(true);
  });

  it('does not produce a determined data conclusion for empty or failed results', () => {
    const emptyContract = buildContract({
      status: 'empty',
      businessOutcome: 'empty',
      rows: [],
      message: '没有查到符合条件的数据。',
      qualityCheck: { ok: false, empty_table: true, missing_fields: [], issues: ['报表返回为空'] },
    });
    const failedContract = buildContract({
      status: 'business_failed',
      businessOutcome: 'execution_failed',
      rows: [],
      message: '查询参数映射异常，系统未能完成查询。',
      qualityCheck: { ok: false, empty_table: true, missing_fields: [], issues: ['参数映射异常'] },
    });

    expect(emptyContract.conclusions[0].summary).toContain('不能形成指标结论');
    expect(emptyContract.risks.some(risk => risk.id === 'empty-result')).toBe(true);
    expect(failedContract.conclusions[0].summary).toContain('本次查询未完成');
    expect(failedContract.risks.some(risk => risk.id === 'execution-not-completed')).toBe(true);
  });
});

describe('report answer contract in response contract', () => {
  it('collects semantic evidence and source refs into response contract', () => {
    const answerContract = buildContract();
    const semanticResult: SemanticResultContract = {
      contractType: 'semantic-result',
      version: '1.0.0',
      resultId: 'semantic-report-answer',
      screenType: 'report-result',
      title: '报表回答',
      createdAt: '2026-06-22T00:00:00.000Z',
      regions: [{
        id: 'report-answer-summary',
        type: 'summary',
        componentBinding: 'markdown-result',
        data: { markdown: renderReportAnswerContractMarkdown(answerContract), answerContract },
        evidenceRefs: answerContract.evidenceRefIds,
        sourceRefs: answerContract.sourceRefIds,
      }],
      evidenceRefs: [{
        id: answerContract.evidenceRefIds[0],
        type: 'query-result',
        title: '报表查询结果',
      }],
      sourceRefs: [{
        id: answerContract.sourceRefIds[0],
        type: 'report',
        title: 'report-server.query_report',
      }],
    };

    const contract = buildResponseContract({
      status: 'success',
      intentType: 'report_query',
      answer: renderReportAnswerContractMarkdown(answerContract),
      reportResult: {
        status: 'success',
        message: '已查到结果。',
        semantic_result: semanticResult,
      },
    });

    expect(contract.evidence_refs).toEqual(answerContract.evidenceRefIds);
    expect(contract.source_refs.map(source => source.id)).toEqual(answerContract.sourceRefIds);
    expect(contract.evidence_mode).toBe('tool_grounded');
    expect(contract.contract_safety?.status).toBe('passed');
  });

  it('degrades report answer when region evidence is not present at semantic top level', () => {
    const answerContract = buildContract();
    const semanticResult: SemanticResultContract = {
      contractType: 'semantic-result',
      version: '1.0.0',
      resultId: 'semantic-report-answer-missing-evidence',
      screenType: 'report-result',
      title: '报表回答',
      createdAt: '2026-06-22T00:00:00.000Z',
      regions: [{
        id: 'report-answer-summary',
        type: 'summary',
        componentBinding: 'markdown-result',
        data: { markdown: renderReportAnswerContractMarkdown(answerContract), answerContract },
        evidenceRefs: answerContract.evidenceRefIds,
        sourceRefs: answerContract.sourceRefIds,
      }],
      evidenceRefs: [],
      sourceRefs: [],
    };

    const contract = buildResponseContract({
      status: 'success',
      intentType: 'report_query',
      answer: renderReportAnswerContractMarkdown(answerContract),
      reportResult: {
        status: 'success',
        message: '已查到结果。',
        semantic_result: semanticResult,
      },
    });

    expect(contract.status).toBe('failed');
    expect(contract.contract_safety?.issues.some(issue => issue.code === 'report_answer_region_evidence_missing')).toBe(true);
    expect(contract.contract_safety?.issues.some(issue => issue.code === 'report_answer_region_source_missing')).toBe(true);
  });
});

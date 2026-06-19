import type {
  AttachmentContentType,
  AttachmentFieldCandidate,
  AttachmentInsight,
  AttachmentKind,
  AttachmentTableInsight,
  ConfidenceLevel,
  ReportRequirementDraft,
} from '@/types';
import { runModelUseCase } from './model-use-case-runtime';

const PARSER_VERSION = 'attachment-understanding.v1';
const LLM_PARSE_MAX_BYTES = 5 * 1024 * 1024;

const METRIC_ALIASES = [
  ['cost', ['消耗', '花费', '成本', '现金消耗', 'cost', 'spend']],
  ['impression', ['曝光', '展示', 'show', 'impression']],
  ['click', ['点击', 'click']],
  ['activation', ['激活', 'activation']],
  ['register', ['注册', 'register', 'registration']],
  ['payment', ['付费', '支付', 'payment', 'pay']],
  ['revenue', ['流水', '收入', 'revenue']],
  ['roi', ['roi', 'roas', '投入产出']],
  ['retention_d1', ['留存', '次留', 'retention']],
  ['cpa', ['cpa']],
  ['cpm', ['cpm']],
  ['ctr', ['ctr']],
  ['cvr', ['cvr', '转化率']],
  ['budget', ['预算']],
] as const;

const UNSUPPORTED_METRIC_ALIASES = [
  ['ltv', ['ltv']],
  ['arppu', ['arppu']],
  ['payback_period', ['回本周期', '回本天数']],
  ['creative_fatigue', ['素材疲劳度', '疲劳度']],
] as const;

const DIMENSION_ALIASES = [
  ['date', ['日期', '时间', 'day', 'date', 'dt', 'stat_date']],
  ['media', ['媒体', '渠道', '平台', 'media', 'channel']],
  ['account', ['账户', '账号', 'account']],
  ['campaign', ['计划', 'campaign']],
  ['adgroup', ['广告组', '单元', 'adgroup']],
  ['creative', ['素材', '创意', 'creative', 'material']],
  ['terminal', ['终端', '系统', '平台类型', 'os', 'android', 'ios']],
  ['project', ['项目', '应用', 'app', 'app_id', 'appid']],
] as const;

function nowIso() {
  return new Date().toISOString();
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((item) => item.trim()).filter(Boolean)));
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim();
}

function includesAny(text: string, aliases: readonly string[]): boolean {
  const lower = text.toLowerCase();
  return aliases.some((alias) => lower.includes(alias.toLowerCase()));
}

function inferRole(header: string): AttachmentFieldCandidate['role'] {
  if (includesAny(header, DIMENSION_ALIASES[0][1])) return 'date';
  if (METRIC_ALIASES.some(([, aliases]) => includesAny(header, aliases))) return 'metric';
  if (DIMENSION_ALIASES.some(([, aliases]) => includesAny(header, aliases))) return 'dimension';
  return 'unknown';
}

function confidenceForRole(role: AttachmentFieldCandidate['role']): ConfidenceLevel {
  if (role === 'unknown') return 'low';
  if (role === 'filter') return 'medium';
  return 'high';
}

function detectMetrics(texts: string[]): string[] {
  const haystack = texts.join(' \n ');
  return unique(METRIC_ALIASES
    .filter(([, aliases]) => includesAny(haystack, aliases))
    .map(([key]) => key));
}

function detectUnsupportedMetrics(texts: string[]): string[] {
  const haystack = texts.join(' \n ');
  return unique(UNSUPPORTED_METRIC_ALIASES
    .filter(([, aliases]) => includesAny(haystack, aliases))
    .map(([key]) => key));
}

function detectDimensions(texts: string[]): string[] {
  const haystack = texts.join(' \n ');
  return unique(DIMENSION_ALIASES
    .filter(([, aliases]) => includesAny(haystack, aliases))
    .map(([key]) => key));
}

function detectDateRanges(texts: string[]): string[] {
  const haystack = texts.join(' \n ');
  const ranges = [
    ...haystack.matchAll(/\d{4}[-/.]\d{1,2}[-/.]\d{1,2}\s*(?:~|至|到|-)\s*\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/g),
    ...haystack.matchAll(/\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/g),
  ].map((match) => match[0]);
  if (/昨天|昨日/.test(haystack)) ranges.push('昨天');
  if (/今天|今日/.test(haystack)) ranges.push('今天');
  if (/近\s*7\s*天|最近\s*7\s*天|过去\s*7\s*天/.test(haystack)) ranges.push('近7天');
  if (/本周|周报/.test(haystack)) ranges.push('本周');
  if (/本月|月报/.test(haystack)) ranges.push('本月');
  return unique(ranges);
}

function buildFieldsFromHeaders(table: AttachmentTableInsight): AttachmentFieldCandidate[] {
  return table.headers.map((header) => {
    const role = inferRole(header);
    const values = unique(table.sample_rows.map((row) => normalizeText(row[header])).filter(Boolean)).slice(0, 5);
    return {
      key: header,
      label: header,
      role,
      confidence: confidenceForRole(role),
      source: table.sheet_name,
      sample_values: values,
    };
  });
}

function buildReportRequirement(params: {
  attachmentId: string;
  metrics: string[];
  dimensions: string[];
  dateRanges: string[];
  unsupportedMetrics: string[];
  contentType: AttachmentContentType;
}): ReportRequirementDraft | undefined {
  const reportLike = params.contentType === 'report_table' || params.contentType === 'report_screenshot' || params.metrics.length > 0;
  if (!reportLike) return undefined;
  return {
    source_attachment_ids: [params.attachmentId],
    intent: params.metrics.length || params.dimensions.length ? 'report_query' : 'template_build',
    metrics: params.metrics,
    dimensions: params.dimensions,
    filters: {},
    date_range: params.dateRanges[0] ? { raw: params.dateRanges[0] } : undefined,
    unsupported_metrics: params.unsupportedMetrics,
    missing_fields: [
      params.metrics.length ? '' : '指标',
      params.dimensions.length ? '' : '维度',
      params.dateRanges.length ? '' : '时间范围',
    ].filter(Boolean),
    display: 'table',
    merge_policy: {
      mode: 'append_or_update',
      metric_strategy: 'union_by_name',
      dimension_strategy: 'union_by_name',
      output: 'single_table',
    },
  };
}

function buildAnalysisSignals(params: {
  attachmentId: string;
  fileName: string;
  kind: AttachmentKind;
  mimeType: string;
  size: number;
  contentType: AttachmentContentType;
  summary: string;
  tables: AttachmentTableInsight[];
  fields: AttachmentFieldCandidate[];
  metrics: string[];
  dimensions: string[];
  dateRanges: string[];
  limitations: string[];
  extractedText?: string;
}) {
  return {
    attachment_id: params.attachmentId,
    file_name: params.fileName,
    file_kind: params.kind,
    mime_type: params.mimeType,
    size_bytes: params.size,
    content_type: params.contentType,
    summary: params.summary,
    tables: params.tables.map((table) => ({
      sheet_name: table.sheet_name,
      row_count: table.row_count,
      column_count: table.column_count,
      headers: table.headers.slice(0, 30),
      sample_rows: table.sample_rows.slice(0, 6),
    })),
    fields: params.fields.slice(0, 40),
    metrics: params.metrics,
    dimensions: params.dimensions,
    date_ranges: params.dateRanges,
    limitations: params.limitations,
    extracted_text: params.extractedText?.slice(0, 2500),
  };
}

function mergeAnalysisFallback(base: AttachmentInsight, overrides: Partial<AttachmentInsight>): AttachmentInsight {
  return {
    ...base,
    ...overrides,
    keywords: overrides.keywords || base.keywords,
    tables: overrides.tables || base.tables,
    fields: overrides.fields || base.fields,
    metrics: overrides.metrics || base.metrics,
    dimensions: overrides.dimensions || base.dimensions,
    date_ranges: overrides.date_ranges || base.date_ranges,
    limitations: overrides.limitations || base.limitations,
  };
}

async function enrichInsightWithLLM(input: {
  attachmentId: string;
  fileName: string;
  kind: AttachmentKind;
  mimeType: string;
  size: number;
  baseInsight: AttachmentInsight;
}) {
  const requiresConfirmation =
    input.size > LLM_PARSE_MAX_BYTES
    || input.baseInsight.status !== 'parsed'
    || input.baseInsight.tables.length === 0
    || (input.baseInsight.report_requirement?.missing_fields?.length || 0) > 0
    || input.baseInsight.limitations.length > 0;
  const fallbackText = input.baseInsight.summary;
  const result = await runModelUseCase<{
    summary?: string;
    analysis_state?: AttachmentInsight['analysis_state'];
    needs_confirmation?: boolean;
    candidate_questions?: string[];
    missing_parameters?: string[];
    ambiguity_reasons?: string[];
    next_action?: AttachmentInsight['next_action'];
    parse_summary?: string;
  }>({
    useCase: 'request_understanding',
    input: {
      task: 'file_understanding',
      attachment: buildAnalysisSignals({
        attachmentId: input.attachmentId,
        fileName: input.fileName,
        kind: input.kind,
        mimeType: input.mimeType,
        size: input.size,
        contentType: input.baseInsight.content_type,
        summary: input.baseInsight.summary,
        tables: input.baseInsight.tables,
        fields: input.baseInsight.fields,
        metrics: input.baseInsight.metrics,
        dimensions: input.baseInsight.dimensions,
        dateRanges: input.baseInsight.date_ranges,
        limitations: input.baseInsight.limitations,
        extractedText: input.baseInsight.extracted_text,
      }),
      signals: {
        requires_confirmation: requiresConfirmation,
        missing_fields: input.baseInsight.report_requirement?.missing_fields || [],
        unsupported_metrics: input.baseInsight.report_requirement?.unsupported_metrics || [],
      },
    },
    fallbackText,
    consume: {
      enabled: false,
      consumedBy: 'attachment-understanding',
      textField: 'summary',
    },
    traceMeta: {
      attachment_id: input.attachmentId,
      file_name: input.fileName,
      parser_version: PARSER_VERSION,
      use_case: 'request_understanding',
    },
  });

  const llmOutput = result.output || {};
  const summary = typeof llmOutput.summary === 'string' && llmOutput.summary.trim()
    ? llmOutput.summary.trim()
    : input.baseInsight.summary;
  const needsConfirmation = typeof llmOutput.needs_confirmation === 'boolean'
    ? llmOutput.needs_confirmation
    : requiresConfirmation;
  const missingParameters = Array.isArray(llmOutput.missing_parameters)
    ? llmOutput.missing_parameters.map((item) => String(item).trim()).filter(Boolean)
    : input.baseInsight.report_requirement?.missing_fields || [];
  const candidateQuestions = Array.isArray(llmOutput.candidate_questions)
    ? llmOutput.candidate_questions.map((item) => String(item).trim()).filter(Boolean)
    : [];
  const ambiguityReasons = Array.isArray(llmOutput.ambiguity_reasons)
    ? llmOutput.ambiguity_reasons.map((item) => String(item).trim()).filter(Boolean)
    : [];
  const nextAction = llmOutput.next_action || (needsConfirmation ? 'ask_user' : 'run_query');
  const analysisState = llmOutput.analysis_state || (needsConfirmation ? 'needs_confirmation' : 'ready_for_query');

  return mergeAnalysisFallback(input.baseInsight, {
    llm_assisted: true,
    llm_use_case: 'request_understanding',
    llm_prompt_id: result.participation.prompt_id,
    llm_model: result.participation.model_name || result.participation.provider || result.participation.model_route_id,
    llm_participation: result.participation,
    analysis_state: analysisState,
    needs_confirmation: needsConfirmation,
    candidate_questions: candidateQuestions,
    missing_parameters: missingParameters,
    ambiguity_reasons: ambiguityReasons,
    next_action: nextAction,
    parse_summary: typeof llmOutput.parse_summary === 'string' && llmOutput.parse_summary.trim()
      ? llmOutput.parse_summary.trim()
      : summary,
    summary,
  });
}

function classifySpreadsheet(tables: AttachmentTableInsight[], metrics: string[], dimensions: string[]): AttachmentContentType {
  if (metrics.length > 0 || (tables.some((table) => table.headers.length >= 2) && dimensions.length > 0)) {
    return 'report_table';
  }
  return 'spreadsheet';
}

function classifyText(name: string, text: string, kind: AttachmentKind): AttachmentContentType {
  const lower = `${name} ${text}`.toLowerCase();
  if (kind === 'log') return 'log_text';
  if (/error|exception|失败|错误|报错|异常/.test(lower)) return 'error_screenshot';
  if (/配置|参数|setting|config|回传|监测/.test(lower)) return 'config_screenshot';
  if (/日报|周报|月报|报表|roi|消耗|指标|维度|excel|sheet/.test(lower)) return 'report_screenshot';
  if (/文档|说明|需求|流程|doc/.test(lower)) return 'document_screenshot';
  return kind === 'document' ? 'document' : 'unknown';
}

function classifyImage(name: string): AttachmentContentType {
  const lower = name.toLowerCase();
  if (/person|avatar|photo|portrait|head|人像|头像|照片/.test(lower)) return 'person_photo';
  if (/error|exception|失败|错误|报错|异常/.test(lower)) return 'error_screenshot';
  if (/配置|参数|setting|config|回传|监测/.test(lower)) return 'config_screenshot';
  if (/日报|周报|月报|报表|roi|消耗|指标|维度|excel|sheet|截图/.test(lower)) return 'report_screenshot';
  if (/文档|说明|需求|流程|doc/.test(lower)) return 'document_screenshot';
  return 'plain_image';
}

function readPngSize(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.length < 24) return null;
  if (buffer.toString('ascii', 1, 4) !== 'PNG') return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function readJpegSize(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) return null;
    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    if ([0xc0, 0xc1, 0xc2, 0xc3].includes(marker)) {
      return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
    }
    offset += 2 + length;
  }
  return null;
}

function readImageSize(buffer: Buffer): { width: number; height: number } | null {
  return readPngSize(buffer) || readJpegSize(buffer);
}

function tableRowsFromAoA(rows: unknown[][]): AttachmentTableInsight | null {
  const nonEmptyRows = rows
    .map((row) => row.map(normalizeText))
    .filter((row) => row.some(Boolean));
  if (nonEmptyRows.length === 0) return null;

  const headerIndex = nonEmptyRows
    .slice(0, 20)
    .map((row, index) => ({ index, score: row.filter(Boolean).length }))
    .sort((a, b) => b.score - a.score)[0]?.index ?? 0;
  const rawHeaders = nonEmptyRows[headerIndex];
  const headers = rawHeaders.map((header, index) => header || `列${index + 1}`);
  const bodyRows = nonEmptyRows.slice(headerIndex + 1);
  const sampleRows = bodyRows.slice(0, 20).map((row) => {
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = row[index] || '';
    });
    return record;
  });
  return {
    sheet_name: '',
    row_count: bodyRows.length,
    column_count: headers.length,
    headers,
    sample_rows: sampleRows,
  };
}

async function parseSpreadsheet(attachmentId: string, fileName: string, buffer: Buffer): Promise<AttachmentInsight> {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const tables: AttachmentTableInsight[] = [];
  for (const sheetName of workbook.SheetNames.slice(0, 8)) {
    const sheet = workbook.Sheets[sheetName];
    const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '', raw: false });
    const table = tableRowsFromAoA(aoa);
    if (table) tables.push({ ...table, sheet_name: sheetName });
  }
  const headers = tables.flatMap((table) => table.headers);
  const cellTexts = tables.flatMap((table) => [
    ...table.headers,
    ...table.sample_rows.flatMap((row) => Object.values(row)),
  ]);
  const metrics = detectMetrics(cellTexts);
  const unsupportedMetrics = detectUnsupportedMetrics(cellTexts);
  const dimensions = detectDimensions(cellTexts);
  const dateRanges = detectDateRanges(cellTexts);
  const fields = tables.flatMap(buildFieldsFromHeaders);
  const contentType = classifySpreadsheet(tables, metrics, dimensions);
  const summary = contentType === 'report_table'
    ? `已识别 ${tables.length} 个表格页，包含 ${headers.length} 个字段，可用于整理报表条件。`
    : `已读取 ${tables.length} 个表格页，可作为表格资料继续分析。`;
  const reportRequirement = buildReportRequirement({
    attachmentId,
    metrics,
    dimensions,
    dateRanges,
    unsupportedMetrics,
    contentType,
  });

  return {
    attachment_id: attachmentId,
    parser_version: PARSER_VERSION,
    parser_type: 'spreadsheet',
    status: tables.length ? 'parsed' : 'failed',
    content_type: tables.length ? contentType : 'unknown',
    summary: tables.length ? summary : '没有识别到可用表格内容。',
    keywords: unique([...metrics, ...dimensions, ...unsupportedMetrics]),
    tables,
    fields,
    metrics,
    dimensions,
    date_ranges: dateRanges,
    limitations: tables.length ? [] : ['文件中没有可用 sheet 或表格行。'],
    report_requirement: reportRequirement,
    updated_at: nowIso(),
  };
}

async function parseText(attachmentId: string, fileName: string, kind: AttachmentKind, buffer: Buffer): Promise<AttachmentInsight> {
  const text = buffer.toString('utf8').replace(/\u0000/g, '').slice(0, 20000);
  const metrics = detectMetrics([fileName, text]);
  const unsupportedMetrics = detectUnsupportedMetrics([fileName, text]);
  const dimensions = detectDimensions([fileName, text]);
  const dateRanges = detectDateRanges([fileName, text]);
  const contentType = classifyText(fileName, text, kind);
  const reportRequirement = buildReportRequirement({
    attachmentId,
    metrics,
    dimensions,
    dateRanges,
    unsupportedMetrics,
    contentType,
  });
  return {
    attachment_id: attachmentId,
    parser_version: PARSER_VERSION,
    parser_type: 'text',
    status: 'parsed',
    content_type: contentType,
    summary: contentType === 'log_text'
      ? '已读取日志文本，可用于定位异常线索。'
      : contentType === 'report_screenshot'
        ? '已从文本中识别到报表相关信息，可继续整理报表条件。'
        : '已读取文本内容，可作为会话资料继续处理。',
    extracted_text: text.slice(0, 4000),
    keywords: unique([...metrics, ...dimensions, ...unsupportedMetrics]),
    tables: [],
    fields: [],
    metrics,
    dimensions,
    date_ranges: dateRanges,
    limitations: text.length >= 20000 ? ['文本较长，本次只读取前 20000 个字符。'] : [],
    report_requirement: reportRequirement,
    updated_at: nowIso(),
  };
}

async function parseImage(attachmentId: string, fileName: string, mimeType: string, buffer: Buffer): Promise<AttachmentInsight> {
  const imageSize = readImageSize(buffer);
  const contentType = classifyImage(fileName);
  const limitations = ['当前未配置视觉识别服务，无法读取图片中的文字或表格。'];
  const summaryParts = [
    contentType === 'person_photo'
      ? '已识别为普通照片，不会进入报表取数。'
      : contentType === 'report_screenshot'
        ? '图片可能包含报表内容，但当前只能完成文件识别，不能读取截图文字。'
        : '已识别为图片附件，可作为会话资料引用。',
    imageSize ? `尺寸 ${imageSize.width}x${imageSize.height}` : '',
  ].filter(Boolean);
  return {
    attachment_id: attachmentId,
    parser_version: PARSER_VERSION,
    parser_type: 'image_basic',
    status: contentType === 'report_screenshot' ? 'partial' : 'parsed',
    content_type: contentType,
    summary: summaryParts.join('，'),
    keywords: [],
    tables: [],
    fields: [],
    metrics: [],
    dimensions: [],
    date_ranges: [],
    limitations,
    updated_at: nowIso(),
  };
}

export async function understandAttachment(input: {
  attachmentId: string;
  fileName: string;
  mimeType: string;
  kind: AttachmentKind;
  buffer: Buffer;
}): Promise<AttachmentInsight> {
  try {
    if (input.kind === 'table') {
      return await parseSpreadsheet(input.attachmentId, input.fileName, input.buffer);
    }
    if (input.kind === 'log') {
      return await parseText(input.attachmentId, input.fileName, input.kind, input.buffer);
    }
    if (input.kind === 'image') {
      return await parseImage(input.attachmentId, input.fileName, input.mimeType, input.buffer);
    }
    if (input.kind === 'document' && input.buffer.length <= 1024 * 1024 && /\.(txt|md|json)$/i.test(input.fileName)) {
      return await parseText(input.attachmentId, input.fileName, input.kind, input.buffer);
    }
    return {
      attachment_id: input.attachmentId,
      parser_version: PARSER_VERSION,
      parser_type: 'unsupported',
      status: 'partial',
      content_type: input.kind === 'document' ? 'document' : 'unknown',
      summary: '文件已保存，当前类型暂不支持内容读取，可作为附件继续引用。',
      keywords: [],
      tables: [],
      fields: [],
      metrics: [],
      dimensions: [],
      date_ranges: [],
      limitations: ['当前仅支持图片基础识别、Excel/CSV 表格读取和文本/日志读取。'],
      updated_at: nowIso(),
    };
  } catch (error) {
    return {
      attachment_id: input.attachmentId,
      parser_version: PARSER_VERSION,
      parser_type: 'unsupported',
      status: 'failed',
      content_type: 'unknown',
      summary: '文件解析失败，请重试或换一个文件。',
      keywords: [],
      tables: [],
      fields: [],
      metrics: [],
      dimensions: [],
      date_ranges: [],
      limitations: [error instanceof Error ? error.message : 'unknown parse error'],
      updated_at: nowIso(),
    };
  }
}

export function formatAttachmentInsightForPrompt(insight: AttachmentInsight): string {
  const lines = [
    `内容类型：${insight.content_type}`,
    `摘要：${insight.summary}`,
    insight.metrics.length ? `指标：${insight.metrics.join('、')}` : '',
    insight.dimensions.length ? `维度：${insight.dimensions.join('、')}` : '',
    insight.date_ranges.length ? `时间：${insight.date_ranges.join('、')}` : '',
    insight.report_requirement?.unsupported_metrics.length ? `暂不支持指标：${insight.report_requirement.unsupported_metrics.join('、')}` : '',
    insight.tables.length
      ? `表格：${insight.tables.map((table) => `${table.sheet_name}(${table.row_count}行，字段：${table.headers.slice(0, 12).join('、')})`).join('；')}`
      : '',
    insight.extracted_text ? `文本片段：${insight.extracted_text.slice(0, 600)}` : '',
    insight.limitations.length ? `限制：${insight.limitations.join('；')}` : '',
  ].filter(Boolean);
  return lines.join('\n');
}

export async function understandAttachmentWithLLM(input: {
  attachmentId: string;
  fileName: string;
  mimeType: string;
  kind: AttachmentKind;
  buffer: Buffer;
}): Promise<AttachmentInsight> {
  const baseInsight = await understandAttachment(input);
  try {
  const requiresConfirmation =
    input.buffer.length > LLM_PARSE_MAX_BYTES
    || baseInsight.status !== 'parsed'
    || baseInsight.tables.length === 0
    || (baseInsight.report_requirement?.missing_fields?.length || 0) > 0
    || baseInsight.limitations.length > 0;
  const result = await runModelUseCase<{
    summary?: string;
    analysis_state?: AttachmentInsight['analysis_state'];
    needs_confirmation?: boolean;
    candidate_questions?: string[];
    missing_parameters?: string[];
    ambiguity_reasons?: string[];
    next_action?: AttachmentInsight['next_action'];
    parse_summary?: string;
  }>({
    useCase: 'request_understanding',
    input: {
      task: 'file_understanding',
      attachment: {
        attachment_id: input.attachmentId,
        file_name: input.fileName,
        mime_type: input.mimeType,
        file_kind: input.kind,
        size_bytes: input.buffer.length,
        insight: formatAttachmentInsightForPrompt(baseInsight),
        tables: baseInsight.tables.slice(0, 8),
        fields: baseInsight.fields.slice(0, 24),
        metrics: baseInsight.metrics,
        dimensions: baseInsight.dimensions,
        date_ranges: baseInsight.date_ranges,
        limitations: baseInsight.limitations,
      },
      signals: {
        requires_confirmation: requiresConfirmation,
        missing_fields: baseInsight.report_requirement?.missing_fields || [],
        unsupported_metrics: baseInsight.report_requirement?.unsupported_metrics || [],
      },
    },
    fallbackText: baseInsight.summary,
    consume: {
      enabled: false,
      consumedBy: 'attachment-understanding',
      textField: 'summary',
    },
    traceMeta: {
      attachment_id: input.attachmentId,
      file_name: input.fileName,
      parser_version: PARSER_VERSION,
      use_case: 'request_understanding',
    },
  });

  const llmOutput = result.output && typeof result.output === 'object'
    ? result.output as Record<string, unknown>
    : {};
  const summary = typeof llmOutput.summary === 'string' && llmOutput.summary.trim()
    ? llmOutput.summary.trim()
    : baseInsight.summary;
  const needsConfirmation = typeof llmOutput.needs_confirmation === 'boolean'
    ? llmOutput.needs_confirmation
    : requiresConfirmation;

  return {
    ...baseInsight,
    summary,
    llm_assisted: true,
    llm_use_case: 'request_understanding',
    llm_prompt_id: result.participation.prompt_id,
    llm_model: result.participation.model_name || result.participation.provider || result.participation.model_route_id,
    llm_participation: result.participation,
    analysis_state: (llmOutput.analysis_state as AttachmentInsight['analysis_state']) || (needsConfirmation ? 'needs_confirmation' : 'ready_for_query'),
    needs_confirmation: needsConfirmation,
    candidate_questions: Array.isArray(llmOutput.candidate_questions) ? llmOutput.candidate_questions.map((item) => String(item).trim()).filter(Boolean) : [],
    missing_parameters: Array.isArray(llmOutput.missing_parameters)
      ? llmOutput.missing_parameters.map((item) => String(item).trim()).filter(Boolean)
      : baseInsight.report_requirement?.missing_fields || [],
    ambiguity_reasons: Array.isArray(llmOutput.ambiguity_reasons) ? llmOutput.ambiguity_reasons.map((item) => String(item).trim()).filter(Boolean) : [],
    next_action: (llmOutput.next_action as AttachmentInsight['next_action']) || (needsConfirmation ? 'ask_user' : 'run_query'),
    parse_summary: typeof llmOutput.parse_summary === 'string' && llmOutput.parse_summary.trim()
      ? llmOutput.parse_summary.trim()
      : summary,
  };
  } catch {
    return {
      ...baseInsight,
      llm_assisted: false,
      llm_use_case: 'request_understanding',
      analysis_state: baseInsight.status === 'parsed' ? 'ready_for_query' : 'needs_confirmation',
      needs_confirmation: baseInsight.status !== 'parsed' || baseInsight.tables.length === 0,
      candidate_questions: baseInsight.report_requirement?.missing_fields?.map((item) => `请补充${item}`) || [],
      missing_parameters: baseInsight.report_requirement?.missing_fields || [],
      ambiguity_reasons: baseInsight.limitations,
      next_action: baseInsight.status === 'parsed' ? 'run_query' : 'ask_user',
      parse_summary: baseInsight.summary,
    };
  }
}

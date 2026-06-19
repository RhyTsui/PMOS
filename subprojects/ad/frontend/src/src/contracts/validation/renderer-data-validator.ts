import type { ComponentBinding, SemanticRegion } from '../semantic/semantic-result-contract';
import {
  addIssue,
  createValidationResult,
  isRecord,
  type ContractValidationResult,
} from './contract-validator';
import { validateReportTrendData } from './report-trend-validator';

export function validateRendererData(
  binding: ComponentBinding | string,
  data: unknown,
  region?: SemanticRegion,
  path = '$.data',
): ContractValidationResult<unknown> {
  switch (binding) {
    case 'markdown-result':
      return validateMarkdownData(data, path);
    case 'data-visualization':
      return validateDataVisualizationData(data, region, path);
    case 'ai-runtime':
    case 'workflow-trace':
      return validateRuntimeBindingData(data, region, path);
    case 'asset-reference':
      return validateAssetReferenceData(data, path);
    case 'decision-card':
      return validateDecisionCardData(data, path);
    case 'evidence-panel':
      return validateCollectionRendererData(data, 'evidence-panel', path);
    case 'source-list':
      return validateCollectionRendererData(data, 'source-list', path);
    case 'action-bar':
      return validateActionBarData(data, path);
    case 'disclosure-panel':
      return validateDisclosurePanelData(data, path);
    case 'empty-state':
    case 'error-state':
    case 'permission-gate':
    case 'feedback-panel':
    case 'form-input':
      return validatePassThroughObjectData(data, binding, path);
    default:
      return validateUnknownBindingData(binding, data, path);
  }
}

function validateMarkdownData(data: unknown, path: string): ContractValidationResult<unknown> {
  const result = createValidationResult(data);
  if (!isRecord(data)) {
    return addIssue(result, {
      level: 'error',
      code: 'markdown_data_not_object',
      message: 'markdown-result data must be an object.',
      path,
    });
  }
  if (typeof data.markdown !== 'string' && typeof data.text !== 'string') {
    addIssue(result, {
      level: 'error',
      code: 'markdown_text_missing',
      message: 'markdown-result requires markdown or text.',
      path,
    });
  }
  return result;
}

function validateDataVisualizationData(
  data: unknown,
  region: SemanticRegion | undefined,
  path: string,
): ContractValidationResult<unknown> {
  const result = createValidationResult(data);
  if (!isRecord(data)) {
    return addIssue(result, {
      level: 'error',
      code: 'data_visualization_data_not_object',
      message: 'data-visualization data must be an object.',
      path,
    });
  }

  const viewType = data.viewType;
  const requestedView = data.requestedView;
  if (typeof viewType !== 'string' && typeof requestedView !== 'string') {
    addIssue(result, {
      level: 'warning',
      code: 'data_visualization_view_type_missing',
      message: 'data-visualization should define viewType or requestedView.',
      path,
    });
  }

  const hasTrendEnvelope = isRecord(data.dateRange) || isRecord(data.dataCoverage) || isRecord(data.chartSpec);
  const trendRequested = viewType === 'trend' || requestedView === 'trend';
  const requestedChartType = String(data.chartType || '').toLowerCase().trim().replace(/_/g, '-');
  const chartLooksLikeTrend = (
    data.chartType === 'line'
    || data.chartType === 'area'
    || data.chartType === 'waterfall'
    || data.chartType === 'bubble'
    || data.chartType === 'polar'
    || data.chartType === 'bar'
    || data.chartType === 'stacked-bar'
    || data.chartType === 'stacked-area'
    || data.chartType === 'scatter'
    || data.chartType === 'pie'
    || data.chartType === 'donut'
    || data.chartType === 'radar'
    || data.chartType === 'funnel'
    || data.chartType === 'heatmap'
    || data.chartType === 'gauge'
    || data.chartType === 'boxplot'
    || data.chartType === 'sankey'
    || data.chartType === 'treemap'
    || data.chartType === 'sunburst'
    || data.chartType === 'tree'
    || data.chartType === 'dual-axis-line'
    || data.chartType === 'histogram'
    || ['折线图', '柱状图', '柱形图', '折线', '面积图', '面积', '散点图', '饼图', '环形图', '漏斗图', '热力图', '雷达图', '瀑布图', '气泡图', '树图', '树状图', '旭日图', '仪表盘'].includes(requestedChartType)
  ) && hasTrendEnvelope;

  if (trendRequested || chartLooksLikeTrend) {
    const trendResult = validateReportTrendData(data, region, path);
    result.errors.push(...trendResult.errors);
    result.warnings.push(...trendResult.warnings);
    result.infos.push(...trendResult.infos);
    result.valid = result.errors.length === 0;
  }

  if (viewType === 'sankey' || data.chartType === 'sankey') {
    if (!Array.isArray(data.nodes) || !Array.isArray(data.links)) {
      addIssue(result, {
        level: 'error',
        code: 'sankey_nodes_links_missing',
        message: 'Sankey visualization requires nodes and links arrays.',
        path,
      });
    }
  }

  return result;
}

function validateRuntimeBindingData(
  data: unknown,
  region: SemanticRegion | undefined,
  path: string,
): ContractValidationResult<unknown> {
  const result = createValidationResult(data);
  const hasRegionRuntimeRefs = Array.isArray(region?.runtimeRefs) && region.runtimeRefs.length > 0;
  const hasRuntimeRef = isRecord(data) && (typeof data.runtimeId === 'string' || typeof data.runtimeRef === 'string');
  if (!hasRegionRuntimeRefs && !hasRuntimeRef) {
    addIssue(result, {
      level: 'warning',
      code: 'runtime_binding_missing_runtime_ref',
      message: 'Runtime renderer should receive region.runtimeRefs or data.runtimeId/runtimeRef.',
      path,
    });
  }
  return result;
}

function validateAssetReferenceData(data: unknown, path: string): ContractValidationResult<unknown> {
  const result = createValidationResult(data);
  if (!isRecord(data)) {
    return addIssue(result, {
      level: 'error',
      code: 'asset_data_not_object',
      message: 'asset-reference data must be an object.',
      path,
    });
  }
  if (typeof data.artifactId !== 'string' && typeof data.assetId !== 'string') {
    addIssue(result, {
      level: 'error',
      code: 'asset_id_missing',
      message: 'asset-reference requires artifactId or assetId.',
      path,
    });
  }
  return result;
}

function validateDisclosurePanelData(data: unknown, path: string): ContractValidationResult<unknown> {
  const result = createValidationResult(data);
  if (!isRecord(data)) {
    return addIssue(result, {
      level: 'error',
      code: 'disclosure_data_not_object',
      message: 'disclosure-panel data must be an object.',
      path,
    });
  }
  if (typeof data.messageId !== 'string' && typeof data.disclosureId !== 'string') {
    addIssue(result, {
      level: 'warning',
      code: 'disclosure_message_id_missing',
      message: 'disclosure-panel should include messageId or disclosureId.',
      path,
    });
  }
  return result;
}

function validateDecisionCardData(data: unknown, path: string): ContractValidationResult<unknown> {
  const result = createValidationResult(data);
  if (!isRecord(data)) {
    return addIssue(result, {
      level: 'error',
      code: 'decision_card_data_not_object',
      message: 'decision-card data must be an object.',
      path,
    });
  }
  if (typeof data.title !== 'string' && typeof data.brief !== 'string' && typeof data.summary !== 'string') {
    addIssue(result, {
      level: 'warning',
      code: 'decision_card_summary_missing',
      message: 'decision-card should include title, brief, or summary.',
      path,
    });
  }
  return result;
}

function validateCollectionRendererData(
  data: unknown,
  binding: string,
  path: string,
): ContractValidationResult<unknown> {
  const result = createValidationResult(data);
  if (!isRecord(data)) {
    return addIssue(result, {
      level: 'error',
      code: `${binding.replace(/-/g, '_')}_data_not_object`,
      message: `${binding} data must be an object.`,
      path,
    });
  }
  if (!Array.isArray(data.items)) {
    addIssue(result, {
      level: 'warning',
      code: `${binding.replace(/-/g, '_')}_items_missing`,
      message: `${binding} should include an items array.`,
      path,
    });
  }
  return result;
}

function validateActionBarData(data: unknown, path: string): ContractValidationResult<unknown> {
  const result = createValidationResult(data);
  if (!isRecord(data)) {
    return addIssue(result, {
      level: 'error',
      code: 'action_bar_data_not_object',
      message: 'action-bar data must be an object.',
      path,
    });
  }
  if (!Array.isArray(data.actions)) {
    addIssue(result, {
      level: 'warning',
      code: 'action_bar_actions_missing',
      message: 'action-bar should include an actions array.',
      path,
    });
  }
  return result;
}

function validatePassThroughObjectData(data: unknown, binding: string, path: string): ContractValidationResult<unknown> {
  const result = createValidationResult(data);
  if (!isRecord(data)) {
    return addIssue(result, {
      level: 'error',
      code: `${binding.replace(/-/g, '_')}_data_not_object`,
      message: `${binding} data must be an object.`,
      path,
    });
  }
  return result;
}

function validateUnknownBindingData(binding: string, data: unknown, path: string): ContractValidationResult<unknown> {
  const result = createValidationResult(data);
  addIssue(result, {
    level: 'warning',
    code: 'unknown_component_binding',
    message: `Unknown componentBinding: ${binding}. Global fallback renderer should be used.`,
    path,
  });
  return result;
}



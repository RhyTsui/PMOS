export type MetricExplainerAnswerType =
  | 'metric_definition'
  | 'metric_formula'
  | 'metric_source'
  | 'metric_tracking'
  | 'metric_preprocessing'
  | 'metric_calculation'
  | 'metric_scheduler'
  | 'metric_difference'
  | 'metric_diagnosis'
  | 'metric_faq';

export interface MetricAction {
  label: string;
  action:
    | 'open_report'
    | 'view_sql'
    | 'view_lineage'
    | 'view_scheduler'
    | 'start_diagnosis'
    | 'create_alert'
    | 'generate_doc'
    | 'feedback_metric';
  params?: Record<string, unknown>;
}

export interface MetricSourceRef {
  title: string;
  sourceType?: 'knowledge' | 'report_mcp' | 'mcp' | 'skill' | 'web_search' | 'manual';
  source?: string;
  url?: string;
  detail?: string;
}

export interface MetricExplainCardSchema {
  type: 'metric_explain_card';
  props: {
    metricId: string;
    metricName: string;
    aliases?: string[];
    category?: string;
    subCategory?: string;
    level?: 'core' | 'important' | 'normal';
    status?: 'online' | 'draft' | 'deprecated';
    shortDefinition: string;
    businessMeaning?: string;
    usageScenarios?: string[];
    updatedAt?: string;
    owner?: string;
  };
}

export interface FormulaCardSchema {
  type: 'formula_card';
  props: {
    formulaText: string;
    formulaLatex?: string;
    numerator?: { name: string; description?: string; field?: string };
    denominator?: { name: string; description?: string; field?: string };
    aggregation?: string;
    unit?: string;
    displayFormat?: string;
    roundRule?: string;
    example?: { input: string; output: string };
  };
}

export interface DataSourceCardSchema {
  type: 'data_source_card';
  props: {
    sources: Array<{
      sourceName: string;
      sourceType?: string;
      system?: string;
      database?: string;
      table?: string;
      field?: string;
      fieldDescription?: string;
      updateFrequency?: string;
      owner?: string;
      reliability?: 'high' | 'medium' | 'low';
    }>;
  };
}

export interface TrackingCardSchema {
  type: 'tracking_card';
  props: {
    eventName?: string;
    eventId?: string;
    triggerTiming?: string;
    triggerLogic?: string;
    sdkOrApi?: string;
    uploadMode?: string;
    uploadTiming?: string;
    retryStrategy?: string;
    dedupKey?: string;
    validationRule?: string;
    commonIssues?: string[];
  };
}

export interface PreprocessingCardSchema {
  type: 'preprocessing_card';
  props: {
    timezoneProcess?: string;
    currencyConvert?: string;
    dedupRule?: string;
    dirtyDataFilter?: string;
    testDataFilter?: string;
    userMergeRule?: string;
    attributionMergeRule?: string;
    nullValueProcess?: string;
    outlierProcess?: string;
  };
}

export interface CalculationCardSchema {
  type: 'calculation_card';
  props: {
    calculationLogic?: string;
    calculationSql?: string;
    groupByDimensions?: string[];
    filterConditions?: string[];
    attributionRule?: string;
    timeWindow?: {
      eventTime?: string;
      start?: string;
      end?: string;
      timezone?: string;
    };
    example?: { input: string; output: string };
  };
}

export interface SchedulerCardSchema {
  type: 'scheduler_card';
  props: {
    taskName?: string;
    taskType?: string;
    cron?: string;
    dependencies?: string[];
    outputTable?: string;
    sla?: string;
    retryPolicy?: string;
    delayPolicy?: string;
    owner?: string;
    alertPolicy?: string;
    latestStatus?: 'success' | 'running' | 'failed' | 'delayed' | 'unknown';
    latestRunTime?: string;
  };
}

export interface ReportDifferenceCardSchema {
  type: 'report_difference_card';
  props: {
    differences: Array<{
      reportA: string;
      reportB: string;
      differenceType: string;
      reason: string;
      userExplanation?: string;
      diagnosisMethod?: string;
    }>;
  };
}

export interface MetricDifferenceCardSchema {
  type: 'metric_difference_card';
  props: {
    differences: Array<{
      metricA: string;
      metricB: string;
      differenceType: string;
      reason: string;
      userExplanation?: string;
    }>;
  };
}

export interface AmbiguityCardSchema {
  type: 'ambiguity_card';
  props: {
    items: Array<{
      userMisunderstanding: string;
      actualMeaning: string;
      recommendedAnswer?: string;
    }>;
  };
}

export interface LineageCardSchema {
  type: 'lineage_card';
  props: {
    upstreamSystems?: string[];
    upstreamTables?: string[];
    processingLayers?: string[];
    downstreamReports?: string[];
    downstreamApis?: string[];
    downstreamAgents?: string[];
    mermaid?: string;
  };
}

export interface FAQCardSchema {
  type: 'faq_card';
  props: {
    faqs: Array<{
      question: string;
      answer: string;
      nextActions?: string[];
    }>;
  };
}

export interface ActionCardSchema {
  type: 'action_card';
  props: {
    actions: MetricAction[];
  };
}

export type MetricExplainerComponent =
  | MetricExplainCardSchema
  | FormulaCardSchema
  | DataSourceCardSchema
  | TrackingCardSchema
  | PreprocessingCardSchema
  | CalculationCardSchema
  | SchedulerCardSchema
  | ReportDifferenceCardSchema
  | MetricDifferenceCardSchema
  | AmbiguityCardSchema
  | LineageCardSchema
  | FAQCardSchema
  | ActionCardSchema;

export interface MetricExplainerUISchema {
  ui_schema_version: 'metric_explainer_v1';
  answer_type: MetricExplainerAnswerType;
  metric_id?: string;
  metric_name?: string;
  summary?: string;
  components: MetricExplainerComponent[];
  sources?: MetricSourceRef[];
  actions?: MetricAction[];
}

export function isMetricExplainerUISchema(value: unknown): value is MetricExplainerUISchema {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return obj.ui_schema_version === 'metric_explainer_v1' && Array.isArray(obj.components);
}

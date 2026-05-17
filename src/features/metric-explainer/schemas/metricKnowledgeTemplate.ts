export interface MetricKnowledgeTemplate {
  metric_id: string;
  metric_name: string;
  metric_alias: string[];
  category: string;
  sub_category?: string;
  business_domain?: string;
  metric_level?: string;
  status: 'draft' | 'online' | 'deprecated';
  definition: {
    short: string;
    full?: string;
    business_meaning?: string;
    usage_scenarios?: string[];
    not_suitable_for?: string[];
  };
  formula?: {
    text?: string;
    latex?: string;
    aggregation?: string;
    unit?: string;
    display_format?: string;
    round_rule?: string;
  };
  data_sources?: Array<{
    source_name: string;
    source_type?: string;
    system?: string;
    database?: string;
    table?: string;
    field?: string;
    field_description?: string;
    update_frequency?: string;
    owner?: string;
    reliability?: 'high' | 'medium' | 'low';
  }>;
  tracking_info?: Record<string, unknown>;
  preprocessing?: Record<string, unknown>;
  calculation?: Record<string, unknown>;
  scheduler?: Record<string, unknown>;
  lineage?: Record<string, unknown>;
  report_differences?: unknown[];
  metric_differences?: unknown[];
  ambiguities?: unknown[];
  faq?: Array<{ question: string; answer: string; next_actions?: string[] }>;
  governance?: {
    product_owner?: string;
    data_owner?: string;
    tech_owner?: string;
    approval_status?: string;
    version?: string;
    updated_at?: string;
    confidence_level?: string;
  };
}

export function createEmptyMetricKnowledgeTemplate(metricId: string, metricName: string): MetricKnowledgeTemplate {
  return {
    metric_id: metricId,
    metric_name: metricName,
    metric_alias: [],
    category: '',
    status: 'draft',
    definition: {
      short: '',
      usage_scenarios: [],
      not_suitable_for: [],
    },
    data_sources: [],
    faq: [],
    governance: {
      version: 'v1.0',
      approval_status: 'draft',
      confidence_level: '待补充',
    },
  };
}

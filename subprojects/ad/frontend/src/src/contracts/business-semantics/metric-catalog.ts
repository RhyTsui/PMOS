export type BusinessMetric =
  | 'cost'
  | 'roi'
  | 'roas'
  | 'activation'
  | 'register'
  | 'payment'
  | 'revenue'
  | 'retention_d1'
  | 'arppu';

export interface MetricDefinition {
  key: BusinessMetric;
  label: string;
  description: string;
}

export const METRIC_CATALOG: MetricDefinition[] = [
  { key: 'cost', label: '消耗', description: '投放消耗或花费。' },
  { key: 'roi', label: 'ROI', description: '投入产出比。' },
  { key: 'roas', label: 'ROAS', description: '广告收入回报率。' },
  { key: 'activation', label: '激活', description: '激活量或激活率相关指标。' },
  { key: 'register', label: '注册', description: '注册量或注册率相关指标。' },
  { key: 'payment', label: '付费', description: '付费量或付费率相关指标。' },
  { key: 'revenue', label: '收入', description: '收入或回收相关指标。' },
  { key: 'retention_d1', label: '次留', description: 'D1 留存指标。' },
  { key: 'arppu', label: 'ARPPU', description: '单付费用户平均收入。' },
];

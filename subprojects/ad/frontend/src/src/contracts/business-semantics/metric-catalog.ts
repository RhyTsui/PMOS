export type BusinessMetric =
  | 'cost'
  | 'roi'
  | 'roas'
  | 'roi_day'
  | 'roi_week'
  | 'roi_month'
  | 'roi_cumulative'
  | 'activation'
  | 'register'
  | 'payment'
  | 'revenue'
  | 'retention_d1'
  | 'retention_d7'
  | 'retention_d30'
  | 'retention_device'
  | 'retention_register'
  | 'retention_pay_d1'
  | 'first_day_register_device_hour'
  | 'first_day_paid_account_cutoff_hour'
  | 'arppu';

export type ReportMetricDomain = 'daily' | 'roi' | 'retention' | 'hourly';

export interface MetricDefinition {
  key: BusinessMetric;
  label: string;
  description: string;
  reportDomain?: ReportMetricDomain;
}

export const METRIC_CATALOG: MetricDefinition[] = [
  { key: 'cost', label: '消耗', description: '投放消耗或花费。', reportDomain: 'daily' },
  { key: 'roi', label: 'ROI', description: '投入产出比。', reportDomain: 'roi' },
  { key: 'roas', label: 'ROAS', description: '广告收入回报率。', reportDomain: 'roi' },
  { key: 'roi_day', label: '日 ROI', description: '按日统计的 ROI。', reportDomain: 'roi' },
  { key: 'roi_week', label: '周 ROI', description: '按周统计的 ROI。', reportDomain: 'roi' },
  { key: 'roi_month', label: '月 ROI', description: '按月统计的 ROI。', reportDomain: 'roi' },
  { key: 'roi_cumulative', label: '累计 ROI', description: '累计口径 ROI。', reportDomain: 'roi' },
  { key: 'activation', label: '激活', description: '激活量或激活率相关指标。', reportDomain: 'daily' },
  { key: 'register', label: '注册', description: '注册量或注册率相关指标。', reportDomain: 'daily' },
  { key: 'payment', label: '付费', description: '付费量或付费率相关指标。', reportDomain: 'daily' },
  { key: 'revenue', label: '收入', description: '收入或回收相关指标。', reportDomain: 'daily' },
  { key: 'retention_d1', label: '次留', description: 'D1 留存指标。', reportDomain: 'retention' },
  { key: 'retention_d7', label: '7 日留存', description: 'D7 留存指标。', reportDomain: 'retention' },
  { key: 'retention_d30', label: '30 日留存', description: 'D30 留存指标。', reportDomain: 'retention' },
  { key: 'retention_device', label: '设备留存', description: '按设备统计的留存指标。', reportDomain: 'retention' },
  { key: 'retention_register', label: '注册留存', description: '按注册统计的留存指标。', reportDomain: 'retention' },
  { key: 'retention_pay_d1', label: '首日付费留存', description: '首日付费账号留存指标。', reportDomain: 'retention' },
  { key: 'first_day_register_device_hour', label: '首日注册设备小时指标', description: '首日注册设备的小时粒度指标。', reportDomain: 'hourly' },
  { key: 'first_day_paid_account_cutoff_hour', label: '首日付费账号截止小时指标', description: '首日付费账号的截止小时指标。', reportDomain: 'daily' },
  { key: 'arppu', label: 'ARPPU', description: '单付费用户平均收入。', reportDomain: 'daily' },
];

export function getReportMetricDomain(metric: string): ReportMetricDomain | undefined {
  return METRIC_CATALOG.find((item) => item.key === metric)?.reportDomain;
}

export type BusinessDimension =
  | 'material'
  | 'media'
  | 'account'
  | 'campaign'
  | 'adgroup'
  | 'date'
  | 'hour'
  | 'team'
  | 'package'
  | 'terminal';

export interface DimensionDefinition {
  key: BusinessDimension;
  label: string;
  role: 'breakdown' | 'x_axis' | 'filter' | 'focus';
  description: string;
}

export const DIMENSION_CATALOG: DimensionDefinition[] = [
  { key: 'date', label: '日期', role: 'x_axis', description: '用于趋势和对比的时间维度。' },
  { key: 'hour', label: '小时', role: 'x_axis', description: '用于小时粒度结果。' },
  { key: 'material', label: '素材', role: 'breakdown', description: '素材名、创意和相关明细维度。' },
  { key: 'media', label: '媒体', role: 'filter', description: '媒体平台或媒体账户维度。' },
  { key: 'account', label: '账户', role: 'filter', description: '投放账户维度。' },
  { key: 'campaign', label: '计划', role: 'breakdown', description: '计划粒度的拆分维度。' },
  { key: 'adgroup', label: '单元', role: 'breakdown', description: '广告组或单元粒度的拆分维度。' },
  { key: 'team', label: '团队', role: 'filter', description: '团队或负责人维度。' },
  { key: 'package', label: '包体', role: 'filter', description: '应用包体或包名维度。' },
  { key: 'terminal', label: '终端', role: 'filter', description: 'Android / iOS / 端类型维度。' },
];

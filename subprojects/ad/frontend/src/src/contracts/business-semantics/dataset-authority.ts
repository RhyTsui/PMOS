export type DatasetAuthorityId =
  | 'account-daily-performance'
  | 'campaign-performance'
  | 'adgroup-performance'
  | 'material-performance'
  | 'creative-quality'
  | 'roi-summary'
  | 'generic-report';

export interface DatasetAuthorityDefinition {
  id: DatasetAuthorityId;
  label: string;
  description: string;
  authoritativeFor: string[];
}

export const DATASET_AUTHORITY_CATALOG: DatasetAuthorityDefinition[] = [
  { id: 'account-daily-performance', label: '账户日报', description: '账户 / 大盘粒度的日常表现。', authoritativeFor: ['account', 'date'] },
  { id: 'campaign-performance', label: '计划表现', description: '计划粒度的投放表现。', authoritativeFor: ['campaign', 'date'] },
  { id: 'adgroup-performance', label: '单元表现', description: '广告组 / 单元粒度的投放表现。', authoritativeFor: ['adgroup', 'date'] },
  { id: 'material-performance', label: '素材表现', description: '素材维度的表现数据。', authoritativeFor: ['material', 'date'] },
  { id: 'creative-quality', label: '创意质量', description: '创意质量、内容和素材健康度。', authoritativeFor: ['material', 'creative'] },
  { id: 'roi-summary', label: 'ROI 汇总', description: 'ROI / ROAS 的聚合结果。', authoritativeFor: ['roi', 'roas'] },
  { id: 'generic-report', label: '通用报表', description: '通用报表数据权威域。', authoritativeFor: ['date', 'metrics'] },
];

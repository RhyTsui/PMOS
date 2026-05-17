'use client';

import React from 'react';
import { CheckCircleOutlined, DatabaseOutlined, FieldTimeOutlined, LineChartOutlined, QuestionCircleOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useThemeColors } from '@/hooks/useTheme';
import type {
  ActionCardSchema,
  AmbiguityCardSchema,
  CalculationCardSchema,
  DataSourceCardSchema,
  FAQCardSchema,
  FormulaCardSchema,
  LineageCardSchema,
  MetricAction,
  MetricDifferenceCardSchema,
  MetricExplainCardSchema,
  MetricExplainerComponent,
  MetricExplainerUISchema,
  PreprocessingCardSchema,
  ReportDifferenceCardSchema,
  SchedulerCardSchema,
  TrackingCardSchema,
} from '../schemas/metricExplainerSchema';

interface MetricExplainerRendererProps {
  schema: MetricExplainerUISchema;
  onAction?: (action: MetricAction) => void;
}

function Card({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  const c = useThemeColors();
  return (
    <section style={{ border: `1px solid ${c.borderFaint}`, borderRadius: 12, background: '#fff', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderBottom: `1px solid ${c.borderFaint}`, color: c.textPrimary, fontWeight: 700, fontSize: 13 }}>
        {icon}
        <span>{title}</span>
      </div>
      <div style={{ padding: 12 }}>{children}</div>
    </section>
  );
}

function TagList({ items }: { items?: string[] }) {
  const c = useThemeColors();
  if (!items?.length) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {items.map((item) => (
        <span key={item} style={{ borderRadius: 999, background: c.bgSection, color: c.textSecondary, padding: '3px 8px', fontSize: 11 }}>
          {item}
        </span>
      ))}
    </div>
  );
}

function KeyValueGrid({ items }: { items: Array<[string, React.ReactNode | undefined]> }) {
  const c = useThemeColors();
  const filtered = items.filter(([, value]) => value !== undefined && value !== '');
  if (!filtered.length) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
      {filtered.map(([label, value]) => (
        <div key={label} style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11, color: c.textMuted, marginBottom: 3 }}>{label}</div>
          <div style={{ fontSize: 12, color: c.textSecondary, lineHeight: 1.6, wordBreak: 'break-word' }}>{value}</div>
        </div>
      ))}
    </div>
  );
}

function SimpleTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: Array<Array<React.ReactNode>>;
}) {
  const c = useThemeColors();
  if (!rows.length) return null;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column} style={{ textAlign: 'left', color: c.textMuted, fontWeight: 650, padding: '7px 8px', borderBottom: `1px solid ${c.borderFaint}`, whiteSpace: 'nowrap' }}>
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} style={{ color: c.textSecondary, padding: '8px', borderBottom: `1px solid ${c.borderFaint}`, verticalAlign: 'top', lineHeight: 1.55 }}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MetricExplainCard({ component }: { component: MetricExplainCardSchema }) {
  const c = useThemeColors();
  const p = component.props;
  return (
    <Card title="统计口径总览" icon={<LineChartOutlined />}>
      <div style={{ display: 'grid', gap: 10 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <strong style={{ color: c.textPrimary, fontSize: 15 }}>{p.metricName}</strong>
            {p.category && <span style={{ fontSize: 11, color: c.accent, background: c.accentBgFaint, borderRadius: 999, padding: '2px 7px' }}>{p.category}</span>}
            {p.level && <span style={{ fontSize: 11, color: c.textMuted }}>{p.level === 'core' ? '核心指标' : p.level === 'important' ? '重要指标' : '常规指标'}</span>}
          </div>
          <p style={{ margin: '8px 0 0', color: c.textBody, lineHeight: 1.75 }}>{p.shortDefinition}</p>
        </div>
        {p.businessMeaning && <div style={{ color: c.textSecondary, fontSize: 12, lineHeight: 1.7 }}>{p.businessMeaning}</div>}
        <TagList items={p.usageScenarios} />
        <KeyValueGrid items={[['别名', p.aliases?.join(' / ')], ['负责人', p.owner], ['更新时间', p.updatedAt], ['状态', p.status]]} />
      </div>
    </Card>
  );
}

function FormulaCard({ component }: { component: FormulaCardSchema }) {
  const c = useThemeColors();
  const p = component.props;
  return (
    <Card title="计算公式" icon={<CheckCircleOutlined />}>
      <div style={{ display: 'grid', gap: 10 }}>
        <div style={{ borderRadius: 10, background: c.accentBgFaint, color: c.textPrimary, padding: '10px 12px', fontWeight: 700, fontSize: 13 }}>
          {p.formulaText}
        </div>
        <KeyValueGrid items={[
          ['分子', p.numerator ? `${p.numerator.name}${p.numerator.description ? `：${p.numerator.description}` : ''}` : undefined],
          ['分母', p.denominator ? `${p.denominator.name}${p.denominator.description ? `：${p.denominator.description}` : ''}` : undefined],
          ['聚合逻辑', p.aggregation],
          ['单位', p.unit],
          ['展示格式', p.displayFormat],
          ['取数规则', p.roundRule],
        ]} />
        {p.example && (
          <div style={{ fontSize: 12, color: c.textSecondary, lineHeight: 1.7 }}>
            示例：{p.example.input}，{p.example.output}
          </div>
        )}
      </div>
    </Card>
  );
}

function DataSourceCard({ component }: { component: DataSourceCardSchema }) {
  return (
    <Card title="数据来源" icon={<DatabaseOutlined />}>
      <SimpleTable
        columns={['来源', '系统', '表 / 字段', '更新', '可信度']}
        rows={component.props.sources.map((source) => [
          <span key="source">{source.sourceName}<br /><small>{source.sourceType}</small></span>,
          source.system || '-',
          <span key="field">{source.table || '待补充'}<br /><code>{source.field || '-'}</code></span>,
          source.updateFrequency || '-',
          source.reliability === 'high' ? '高' : source.reliability === 'medium' ? '中' : source.reliability === 'low' ? '低' : '-',
        ])}
      />
    </Card>
  );
}

function TrackingCard({ component }: { component: TrackingCardSchema }) {
  const p = component.props;
  return (
    <Card title="采集与上报" icon={<ThunderboltOutlined />}>
      <div style={{ display: 'grid', gap: 10 }}>
        <KeyValueGrid items={[
          ['事件', p.eventName],
          ['事件 ID', p.eventId],
          ['触发时机', p.triggerTiming],
          ['触发逻辑', p.triggerLogic],
          ['上报方式', p.uploadMode],
          ['去重键', p.dedupKey],
          ['校验规则', p.validationRule],
        ]} />
        <TagList items={p.commonIssues} />
      </div>
    </Card>
  );
}

function CalculationCard({ component }: { component: CalculationCardSchema }) {
  const c = useThemeColors();
  const p = component.props;
  return (
    <Card title="计算过程" icon={<FieldTimeOutlined />}>
      <div style={{ display: 'grid', gap: 10 }}>
        {p.calculationLogic && <div style={{ color: c.textSecondary, fontSize: 12, lineHeight: 1.7 }}>{p.calculationLogic}</div>}
        <KeyValueGrid items={[
          ['归因规则', p.attributionRule],
          ['统计时间', p.timeWindow ? `${p.timeWindow.start || ''} - ${p.timeWindow.end || ''}` : undefined],
          ['时区', p.timeWindow?.timezone],
          ['事件时间', p.timeWindow?.eventTime],
        ]} />
        <TagList items={p.groupByDimensions} />
        <TagList items={p.filterConditions} />
        {p.calculationSql && (
          <pre style={{ margin: 0, width: '100%', maxWidth: '100%', padding: 10, borderRadius: 10, border: '1px solid #dbe4f0', background: '#f8fafc', color: '#1f2937', overflowX: 'auto', overflowY: 'hidden', fontSize: 12, whiteSpace: 'pre' }}>{p.calculationSql}</pre>
        )}
      </div>
    </Card>
  );
}

function SchedulerCard({ component }: { component: SchedulerCardSchema }) {
  const p = component.props;
  return (
    <Card title="刷新与调度" icon={<FieldTimeOutlined />}>
      <KeyValueGrid items={[
        ['任务', p.taskName],
        ['类型', p.taskType],
        ['Cron', p.cron],
        ['输出表', p.outputTable],
        ['SLA', p.sla],
        ['最近状态', p.latestStatus],
        ['最近运行', p.latestRunTime],
        ['告警规则', p.alertPolicy],
      ]} />
    </Card>
  );
}

function DifferenceList({ title, rows }: { title: string; rows: Array<{ a: string; b: string; type: string; reason: string; explanation?: string; method?: string }> }) {
  const c = useThemeColors();
  return (
    <Card title={title} icon={<LineChartOutlined />}>
      <div style={{ display: 'grid', gap: 10 }}>
        {rows.map((row, index) => (
          <div key={`${row.a}-${row.b}-${index}`} style={{ borderRadius: 10, background: c.bgSection, padding: 10 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', color: c.textPrimary, fontSize: 13, fontWeight: 700 }}>
              <span>{row.a}</span>
              <span style={{ color: c.textMuted }}>vs</span>
              <span>{row.b}</span>
              <span style={{ marginLeft: 'auto', color: c.accent, fontSize: 11 }}>{row.type}</span>
            </div>
            <div style={{ marginTop: 6, color: c.textSecondary, fontSize: 12, lineHeight: 1.7 }}>{row.reason}</div>
            {row.explanation && <div style={{ marginTop: 4, color: c.textMuted, fontSize: 12, lineHeight: 1.7 }}>{row.explanation}</div>}
            {row.method && <div style={{ marginTop: 4, color: c.textMuted, fontSize: 12, lineHeight: 1.7 }}>排查方式：{row.method}</div>}
          </div>
        ))}
      </div>
    </Card>
  );
}

function ReportDifferenceCard({ component }: { component: ReportDifferenceCardSchema }) {
  return (
    <DifferenceList
      title="报表差异"
      rows={component.props.differences.map((item) => ({
        a: item.reportA,
        b: item.reportB,
        type: item.differenceType,
        reason: item.reason,
        explanation: item.userExplanation,
        method: item.diagnosisMethod,
      }))}
    />
  );
}

function MetricDifferenceCard({ component }: { component: MetricDifferenceCardSchema }) {
  return (
    <DifferenceList
      title="指标差异"
      rows={component.props.differences.map((item) => ({
        a: item.metricA,
        b: item.metricB,
        type: item.differenceType,
        reason: item.reason,
        explanation: item.userExplanation,
      }))}
    />
  );
}

function AmbiguityCard({ component }: { component: AmbiguityCardSchema }) {
  return (
    <Card title="常见误解" icon={<QuestionCircleOutlined />}>
      <SimpleTable
        columns={['容易误解', '实际含义', '推荐说法']}
        rows={component.props.items.map((item) => [item.userMisunderstanding, item.actualMeaning, item.recommendedAnswer || '-'])}
      />
    </Card>
  );
}

function FAQCard({ component, onAction }: { component: FAQCardSchema; onAction?: (action: MetricAction) => void }) {
  const c = useThemeColors();
  return (
    <Card title="常见问题" icon={<QuestionCircleOutlined />}>
      <div style={{ display: 'grid', gap: 10 }}>
        {component.props.faqs.map((faq) => (
          <div key={faq.question}>
            <div style={{ color: c.textPrimary, fontSize: 13, fontWeight: 700 }}>{faq.question}</div>
            <div style={{ marginTop: 4, color: c.textSecondary, fontSize: 12, lineHeight: 1.7 }}>{faq.answer}</div>
            {!!faq.nextActions?.length && (
              <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {faq.nextActions.map((action) => (
                  <button key={action} type="button" onClick={() => onAction?.({ label: action, action: 'start_diagnosis' })} style={{ border: `1px solid ${c.borderFaint}`, background: '#fff', borderRadius: 999, padding: '4px 8px', fontSize: 11, color: c.textSecondary, cursor: 'pointer' }}>
                    {action}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

function ActionCard({ component, onAction }: { component: ActionCardSchema; onAction?: (action: MetricAction) => void }) {
  const c = useThemeColors();
  return (
    <Card title="下一步动作" icon={<ThunderboltOutlined />}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {component.props.actions.map((action) => (
          <button key={`${action.action}-${action.label}`} type="button" onClick={() => onAction?.(action)} style={{ border: `1px solid ${c.borderFaint}`, background: '#fff', borderRadius: 999, padding: '7px 10px', fontSize: 12, color: c.textSecondary, cursor: 'pointer' }}>
            {action.label}
          </button>
        ))}
      </div>
    </Card>
  );
}

function PreprocessingCard({ component }: { component: PreprocessingCardSchema }) {
  const p = component.props;
  return (
    <Card title="预处理规则" icon={<CheckCircleOutlined />}>
      <KeyValueGrid items={[
        ['时区', p.timezoneProcess],
        ['汇率', p.currencyConvert],
        ['去重', p.dedupRule],
        ['脏数据', p.dirtyDataFilter],
        ['测试数据', p.testDataFilter],
        ['用户合并', p.userMergeRule],
        ['归因合并', p.attributionMergeRule],
        ['空值', p.nullValueProcess],
        ['异常值', p.outlierProcess],
      ]} />
    </Card>
  );
}

function LineageCard({ component }: { component: LineageCardSchema }) {
  const p = component.props;
  return (
    <Card title="数据血缘" icon={<DatabaseOutlined />}>
      <KeyValueGrid items={[
        ['上游系统', p.upstreamSystems?.join(' / ')],
        ['上游表', p.upstreamTables?.join(' / ')],
        ['处理层级', p.processingLayers?.join(' -> ')],
        ['下游报表', p.downstreamReports?.join(' / ')],
        ['下游能力', p.downstreamAgents?.join(' / ')],
      ]} />
    </Card>
  );
}

function MetricComponentRenderer({ component, onAction }: { component: MetricExplainerComponent; onAction?: (action: MetricAction) => void }) {
  switch (component.type) {
    case 'metric_explain_card':
      return <MetricExplainCard component={component} />;
    case 'formula_card':
      return <FormulaCard component={component} />;
    case 'data_source_card':
      return <DataSourceCard component={component} />;
    case 'tracking_card':
      return <TrackingCard component={component} />;
    case 'preprocessing_card':
      return <PreprocessingCard component={component} />;
    case 'calculation_card':
      return <CalculationCard component={component} />;
    case 'scheduler_card':
      return <SchedulerCard component={component} />;
    case 'report_difference_card':
      return <ReportDifferenceCard component={component} />;
    case 'metric_difference_card':
      return <MetricDifferenceCard component={component} />;
    case 'ambiguity_card':
      return <AmbiguityCard component={component} />;
    case 'lineage_card':
      return <LineageCard component={component} />;
    case 'faq_card':
      return <FAQCard component={component} onAction={onAction} />;
    case 'action_card':
      return <ActionCard component={component} onAction={onAction} />;
    default:
      return null;
  }
}

type MetricExplainerSectionKey = 'overview' | 'source' | 'process' | 'difference' | 'faq' | 'action';

interface MetricExplainerSection {
  key: MetricExplainerSectionKey;
  label: string;
  description: string;
  components: MetricExplainerComponent[];
}

function getComponentSection(component: MetricExplainerComponent): MetricExplainerSectionKey {
  if (component.type === 'metric_explain_card' || component.type === 'formula_card') return 'overview';
  if (component.type === 'data_source_card' || component.type === 'lineage_card') return 'source';
  if (component.type === 'tracking_card' || component.type === 'preprocessing_card' || component.type === 'calculation_card' || component.type === 'scheduler_card') return 'process';
  if (component.type === 'report_difference_card' || component.type === 'metric_difference_card' || component.type === 'ambiguity_card') return 'difference';
  if (component.type === 'faq_card') return 'faq';
  return 'action';
}

function buildSections(components: MetricExplainerComponent[]): MetricExplainerSection[] {
  const sectionMeta: Array<Omit<MetricExplainerSection, 'components'>> = [
    { key: 'overview', label: '总览', description: '先看定义、适用场景和核心公式。' },
    { key: 'source', label: '来源', description: '查看数据来自哪些系统、表和字段。' },
    { key: 'process', label: '过程', description: '查看采集、上报、预处理、计算和刷新方式。' },
    { key: 'difference', label: '差异', description: '查看指标之间、报表之间为什么不一致。' },
    { key: 'faq', label: '问答', description: '查看高频问题和推荐追问。' },
    { key: 'action', label: '动作', description: '继续查看报表、发起排查或反馈口径。' },
  ];

  return sectionMeta
    .map((section) => ({
      ...section,
      components: components.filter((component) => getComponentSection(component) === section.key),
    }))
    .filter((section) => section.components.length > 0);
}

function LegacyMetricExplainerRenderer({ schema, onAction }: MetricExplainerRendererProps) {
  const c = useThemeColors();
  return (
    <div style={{ margin: '0 0 10px', display: 'grid', gap: 8 }}>
      <div style={{ border: `1px solid ${c.borderFaint}`, borderRadius: 14, background: '#fff', padding: '10px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <strong style={{ color: c.textPrimary, fontSize: 13 }}>指标解释器</strong>
          {schema.metric_name && <span style={{ color: c.textMuted, fontSize: 12 }}>{schema.metric_name}</span>}
        </div>
        {schema.summary && <div style={{ marginTop: 6, color: c.textSecondary, fontSize: 12, lineHeight: 1.7 }}>{schema.summary}</div>}
      </div>
      {schema.components.map((component, index) => (
        <MetricComponentRenderer key={`${component.type}-${index}`} component={component} onAction={onAction} />
      ))}
    </div>
  );
}

export function MetricExplainerRenderer({ schema, onAction }: MetricExplainerRendererProps) {
  const c = useThemeColors();
  const sections = React.useMemo(() => buildSections(schema.components), [schema.components]);
  const [activeKey, setActiveKey] = React.useState<MetricExplainerSectionKey>(sections[0]?.key || 'overview');
  const activeSection = sections.find((section) => section.key === activeKey) || sections[0];

  React.useEffect(() => {
    if (sections.length > 0 && !sections.some((section) => section.key === activeKey)) {
      setActiveKey(sections[0].key);
    }
  }, [activeKey, sections]);

  return (
    <div style={{ margin: '0 0 10px', border: `1px solid ${c.borderFaint}`, borderRadius: 14, background: '#fff', overflow: 'hidden' }}>
      <div style={{ padding: '10px 12px', borderBottom: `1px solid ${c.borderFaint}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <strong style={{ color: c.textPrimary, fontSize: 13 }}>指标解释器</strong>
          {schema.metric_name && <span style={{ color: c.textMuted, fontSize: 12 }}>{schema.metric_name}</span>}
        </div>
        {schema.summary && <div style={{ marginTop: 6, color: c.textSecondary, fontSize: 12, lineHeight: 1.7 }}>{schema.summary}</div>}
      </div>

      <div style={{ padding: '8px 10px 0', display: 'flex', gap: 6, overflowX: 'auto' }}>
        {sections.map((section) => {
          const active = section.key === activeSection?.key;
          return (
            <button
              key={section.key}
              type="button"
              onClick={() => setActiveKey(section.key)}
              style={{
                flex: '0 0 auto',
                border: `1px solid ${active ? c.accentBorder : c.borderFaint}`,
                background: active ? c.accentBgFaint : '#fff',
                color: active ? c.accent : c.textSecondary,
                borderRadius: 999,
                padding: '6px 10px',
                fontSize: 12,
                fontWeight: active ? 700 : 500,
                cursor: 'pointer',
              }}
            >
              {section.label}
              <span style={{ marginLeft: 5, color: active ? c.accent : c.textMuted }}>{section.components.length}</span>
            </button>
          );
        })}
      </div>

      {activeSection ? (
        <div style={{ padding: 10 }}>
          <div style={{ margin: '0 2px 8px', color: c.textMuted, fontSize: 12 }}>{activeSection.description}</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {activeSection.components.map((component, index) => (
              <MetricComponentRenderer key={`${activeSection.key}-${component.type}-${index}`} component={component} onAction={onAction} />
            ))}
          </div>
        </div>
      ) : (
        <div style={{ padding: 12, color: c.textMuted, fontSize: 12 }}>暂无可展示的指标说明。</div>
      )}
    </div>
  );
}

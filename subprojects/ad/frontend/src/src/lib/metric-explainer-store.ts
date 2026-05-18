import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { MetricExplainerUISchema } from '@/features/metric-explainer/schemas/metricExplainerSchema';
import { runtimeDataPath } from './runtime-data-path';

const METRIC_EXPLAINERS_PATH = runtimeDataPath('metric-explainers.json');

interface MetricExplainersFile {
  explainers: MetricExplainerUISchema[];
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const BUILTIN_METRIC_EXPLAINERS: MetricExplainerUISchema[] = [
  {
    ui_schema_version: 'metric_explainer_v1',
    answer_type: 'metric_difference',
    metric_id: 'activation_registration_payment',
    metric_name: '激活数、注册数、付费数',
    summary: '这三个指标分别对应进入应用、创建账号和完成支付三个阶段。解释或排查时必须先区分事件发生、上报、归因、入库和报表聚合。',
    components: [
      {
        type: 'metric_explain_card',
        props: {
          metricId: 'activation_registration_payment',
          metricName: '激活数、注册数、付费数',
          aliases: ['激活数', '注册数', '注册设备数', '注册账号数', '付费人数', '付费次数'],
          category: '广告转化',
          subCategory: '归因与用户行为',
          level: 'core',
          status: 'online',
          shortDefinition: '激活看设备首次进入或归因激活，注册看账号创建，付费看支付成功行为。',
          businessMeaning: '用于判断广告流量从进入游戏、完成注册到产生收入的转化漏斗质量。',
          usageScenarios: ['渠道质量评估', '媒体回传排查', '注册转化分析', '付费漏斗分析'],
          updatedAt: today(),
          owner: '广告数据产品',
        },
      },
      {
        type: 'tracking_card',
        props: {
          eventName: 'activation / register / pay_success',
          triggerTiming: '激活通常发生在首次打开或首次有效启动；注册发生在账号创建成功；付费发生在订单支付成功。',
          triggerLogic: '服务端确认成功后进入统计，客户端事件需要经过校验、去重和归因匹配。',
          sdkOrApi: 'Game SDK / Server API / 监测归因服务',
          uploadMode: '客户端与服务端结合，付费建议以服务端为准',
          dedupKey: 'device_id、user_id、order_id 按指标分别去重',
          validationRule: '关键标识、事件时间、项目、媒体、包体和金额字段不能为空。',
          commonIssues: ['设备和账号维度混用', '客户端重复上报', '订单补单或退款未同步', '归因窗口与报表窗口不一致', '测试账号未过滤'],
        },
      },
      {
        type: 'calculation_card',
        props: {
          calculationLogic: '先按事件时间进入明细层，再按业务口径去重，最后按日期、项目、媒体、账户等维度聚合到报表。',
          groupByDimensions: ['日期', '项目', '媒体', '账户', 'campaign', '包体'],
          filterConditions: ['过滤测试账号和测试设备', '排除无效订单', '按权限过滤可见项目和账户', '按报表选择的时区和时间窗口聚合'],
          attributionRule: '激活和后续行为需要按内部归因规则关联广告来源；具体归因窗口等待后台资料补充。',
        },
      },
      {
        type: 'metric_difference_card',
        props: {
          differences: [
            {
              metricA: '激活数',
              metricB: '注册数',
              differenceType: '行为阶段不同',
              reason: '激活表示用户进入应用，注册表示完成账号创建。用户可能激活后未注册。',
              userExplanation: '激活数通常大于或等于注册数，注册转化率下降时需要看登录注册链路和渠道质量。',
            },
            {
              metricA: '注册设备数',
              metricB: '注册账号数',
              differenceType: '去重对象不同',
              reason: '注册设备数按设备去重，注册账号数按账号或用户 ID 去重。',
              userExplanation: '一台设备可能注册多个账号，一个账号也可能跨设备登录，两者不应强行对齐。',
            },
            {
              metricA: '付费人数',
              metricB: '付费次数',
              differenceType: '统计对象不同',
              reason: '付费人数按用户去重，付费次数按成功订单或支付事件计数。',
              userExplanation: '同一用户一天多次付费会让付费次数高于付费人数。',
            },
          ],
        },
      },
      {
        type: 'report_difference_card',
        props: {
          differences: [
            {
              reportA: '智投报表',
              reportB: '媒体后台',
              differenceType: '归因与刷新周期不同',
              reason: '智投报表使用内部统一归因和约 20 分钟调度；媒体后台使用媒体侧归因和自身刷新节奏。',
              userExplanation: '短时间内不一致不一定代表异常，需要先确认刷新时间、统计日期、账户和媒体过滤条件。',
              diagnosisMethod: '先对比消耗、激活、注册、付费的基础明细，再定位是采集、归因、权限还是调度问题。',
            },
          ],
        },
      },
    ],
    sources: [
      {
        title: '指标解释结构化资料',
        sourceType: 'manual',
        source: '智投后台',
        detail: '由后台结构化录入维护；知识库作为补充来源。',
      },
      {
        title: '广告转化漏斗报表',
        sourceType: 'report_mcp',
        source: '智投报表 MCP',
        detail: '用于核对激活、注册、付费明细和聚合口径。',
      },
    ],
  },
  {
    ui_schema_version: 'metric_explainer_v1',
    answer_type: 'metric_formula',
    metric_id: 'roi_d1',
    metric_name: '首日 ROI',
    summary: '首日 ROI 用于衡量激活当日产生的回收与广告消耗之间的关系，适合判断新计划、新素材和新渠道的早期回收质量。',
    components: [
      {
        type: 'metric_explain_card',
        props: {
          metricId: 'roi_d1',
          metricName: '首日 ROI',
          aliases: ['D1 ROI', '首日回收', '首日ROI'],
          category: '投放效果',
          subCategory: '回收指标',
          level: 'core',
          status: 'online',
          shortDefinition: '首日 ROI = 激活当日归因收入 / 对应广告消耗。',
          businessMeaning: '用于判断投放冷启动阶段的短期回收质量。',
          usageScenarios: ['新计划冷启动', '素材初筛', '渠道质量初判'],
          updatedAt: today(),
          owner: '广告数据产品',
        },
      },
      {
        type: 'formula_card',
        props: {
          formulaText: '首日 ROI = 首日归因收入 / 广告消耗',
          formulaLatex: 'ROI_{D1}=Revenue_{D1}/Cost',
          numerator: { name: '首日归因收入', description: '归因用户在激活当日产生的支付成功金额。', field: 'pay_amount_d1' },
          denominator: { name: '广告消耗', description: '媒体 API 或消耗明细中的广告花费。', field: 'cost' },
          aggregation: 'SUM(pay_amount_d1) / SUM(cost)',
          unit: '%',
          displayFormat: 'xx.xx%',
          roundRule: '保留两位小数',
        },
      },
      {
        type: 'calculation_card',
        props: {
          calculationLogic: '按日期、项目、媒体、账户等维度汇总首日收入和广告消耗，再计算两者比值。',
          groupByDimensions: ['日期', '项目', '媒体', '账户', 'campaign', '素材'],
          filterConditions: ['只统计有效归因用户', '过滤测试账号', '排除无效订单', '按用户权限过滤可见数据'],
          attributionRule: '采用智投内部统一归因规则，具体窗口等待后台资料补充。',
        },
      },
      {
        type: 'report_difference_card',
        props: {
          differences: [
            {
              reportA: '智投报表',
              reportB: '媒体后台',
              differenceType: '归因口径和收入来源不同',
              reason: '智投报表统一使用内部归因和订单数据；媒体后台使用媒体侧归因，且不一定包含完整游戏内收入。',
              userExplanation: '两个系统看到的用户归属和收入范围不同，因此 ROI 不会完全一致。',
              diagnosisMethod: '先分别对比消耗、激活、收入，再确认刷新时间和归因窗口。',
            },
          ],
        },
      },
    ],
    sources: [
      {
        title: '指标解释结构化资料',
        sourceType: 'manual',
        source: '智投后台',
        detail: '由后台结构化录入维护；知识库作为补充来源。',
      },
      {
        title: '广告投放效果报表',
        sourceType: 'report_mcp',
        source: '智投报表 MCP',
        detail: '用于核对消耗、收入和 ROI 聚合结果。',
      },
    ],
  },
];

function normalizeExplainer(input: MetricExplainerUISchema): MetricExplainerUISchema {
  return {
    ...input,
    ui_schema_version: 'metric_explainer_v1',
    answer_type: input.answer_type || 'metric_definition',
    metric_id: input.metric_id || input.metric_name || `metric-${Date.now()}`,
    metric_name: input.metric_name || input.metric_id || '未命名指标',
    components: Array.isArray(input.components) ? input.components : [],
    sources: Array.isArray(input.sources) ? input.sources : [],
    actions: Array.isArray(input.actions) ? input.actions : [],
  };
}

async function readExplainersFile(): Promise<MetricExplainersFile> {
  try {
    const raw = await readFile(METRIC_EXPLAINERS_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<MetricExplainersFile>;
    if (Array.isArray(parsed.explainers)) {
      const fromDisk = parsed.explainers.map(normalizeExplainer);
      const merged = BUILTIN_METRIC_EXPLAINERS.map((builtin) => {
        const override = fromDisk.find(item => item.metric_id === builtin.metric_id);
        return override ? normalizeExplainer({ ...builtin, ...override }) : builtin;
      });
      const custom = fromDisk.filter(item => !BUILTIN_METRIC_EXPLAINERS.some(builtin => builtin.metric_id === item.metric_id));
      return { explainers: [...merged, ...custom] };
    }
  } catch {
    // First run uses builtin structured entries.
  }
  return { explainers: BUILTIN_METRIC_EXPLAINERS.map(normalizeExplainer) };
}

async function writeExplainersFile(file: MetricExplainersFile): Promise<void> {
  await mkdir(path.dirname(METRIC_EXPLAINERS_PATH), { recursive: true });
  await writeFile(METRIC_EXPLAINERS_PATH, JSON.stringify(file, null, 2), 'utf8');
}

function schemaText(schema: MetricExplainerUISchema): string {
  const primaryCard = schema.components.find(component => component.type === 'metric_explain_card');
  const aliases = primaryCard?.type === 'metric_explain_card' ? primaryCard.props.aliases || [] : [];
  return [schema.metric_id, schema.metric_name, schema.summary, ...aliases].filter(Boolean).join(' ');
}

export async function listMetricExplainers(): Promise<MetricExplainerUISchema[]> {
  const file = await readExplainersFile();
  return file.explainers.sort((a, b) => String(a.metric_name || '').localeCompare(String(b.metric_name || ''), 'zh-Hans-CN'));
}

export async function getMetricExplainer(metricId: string): Promise<MetricExplainerUISchema | undefined> {
  const explainers = await listMetricExplainers();
  return explainers.find(item => item.metric_id === metricId);
}

export async function findMetricExplainerByQuestion(question: string): Promise<MetricExplainerUISchema | null> {
  const normalizedQuestion = question.toLowerCase();
  const explainers = await listMetricExplainers();
  const ranked = explainers
    .map((schema) => {
      const target = schemaText(schema).toLowerCase();
      let score = 0;
      for (const token of ['激活', '注册', '付费', 'roi', 'ROI', '首日', '回收', '自然量', '消耗', '展示', '点击']) {
        if (normalizedQuestion.includes(token.toLowerCase()) && target.includes(token.toLowerCase())) score += 2;
      }
      if (schema.metric_id && normalizedQuestion.includes(schema.metric_id.toLowerCase())) score += 5;
      if (schema.metric_name && normalizedQuestion.includes(schema.metric_name.toLowerCase())) score += 5;
      return { schema, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);
  return ranked[0]?.schema || null;
}

export async function upsertMetricExplainer(data: MetricExplainerUISchema): Promise<MetricExplainerUISchema> {
  const file = await readExplainersFile();
  const next = normalizeExplainer(data);
  file.explainers = file.explainers.some(item => item.metric_id === next.metric_id)
    ? file.explainers.map(item => item.metric_id === next.metric_id ? next : item)
    : [...file.explainers, next];
  await writeExplainersFile(file);
  return next;
}

export async function deleteMetricExplainer(metricId: string): Promise<boolean> {
  const file = await readExplainersFile();
  const before = file.explainers.length;
  file.explainers = file.explainers.filter(item => item.metric_id !== metricId);
  if (file.explainers.length === before) return false;
  await writeExplainersFile(file);
  return true;
}

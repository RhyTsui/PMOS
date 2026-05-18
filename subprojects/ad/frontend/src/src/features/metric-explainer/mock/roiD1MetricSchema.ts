import type { MetricExplainerUISchema } from '../schemas/metricExplainerSchema';

export const roiD1MetricSchema: MetricExplainerUISchema = {
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
        aliases: ['D1 ROI', '首日回收'],
        category: '投放效果',
        subCategory: '回收指标',
        level: 'core',
        status: 'online',
        shortDefinition: '首日 ROI = 激活当日归因收入 / 对应广告消耗。',
        businessMeaning: '用于判断投放冷启动阶段的短期回收质量。',
        usageScenarios: ['新计划冷启动', '素材初筛', '渠道质量初判'],
        updatedAt: '2026-05-14',
        owner: '广告数据产品',
      },
    },
    {
      type: 'formula_card',
      props: {
        formulaText: '首日 ROI = 首日归因收入 / 广告消耗',
        formulaLatex: 'ROI_{D1}=Revenue_{D1}/Cost',
        numerator: {
          name: '首日归因收入',
          description: '归因用户在激活当日产生的支付成功金额。',
          field: 'pay_amount_d1',
        },
        denominator: {
          name: '广告消耗',
          description: '媒体 API 或消耗明细中的广告花费。',
          field: 'cost',
        },
        aggregation: 'SUM(pay_amount_d1) / SUM(cost)',
        unit: '%',
        displayFormat: 'xx.xx%',
        roundRule: '保留两位小数',
      },
    },
    {
      type: 'data_source_card',
      props: {
        sources: [
          {
            sourceName: '广告消耗',
            sourceType: '媒体 API',
            system: '智投报表 MCP',
            table: '广告消耗明细报表',
            field: 'cost',
            fieldDescription: '广告花费',
            updateFrequency: '约 20 分钟调度',
            owner: '广告数据',
            reliability: 'high',
          },
          {
            sourceName: '首日收入',
            sourceType: '订单系统',
            system: '支付中心',
            table: '等待知识库补充',
            field: 'pay_amount_d1',
            fieldDescription: '激活当日支付成功金额',
            updateFrequency: '实时或准实时',
            owner: '游戏数据',
            reliability: 'medium',
          },
        ],
      },
    },
    {
      type: 'calculation_card',
      props: {
        calculationLogic: '按日期、项目、媒体、账户等维度汇总首日收入和广告消耗，再计算两者比值。',
        groupByDimensions: ['日期', '项目', '媒体', '账户', 'campaign', '素材'],
        filterConditions: ['只统计有效归因用户', '过滤测试账号', '排除无效订单', '按用户权限过滤可见数据'],
        attributionRule: '采用智投内部统一归因规则，具体窗口等待知识库补充。',
        timeWindow: {
          eventTime: '激活时间',
          start: '激活当日 00:00:00',
          end: '激活当日 23:59:59',
          timezone: '北京时间',
        },
        example: {
          input: '首日归因收入 10,000，广告消耗 50,000',
          output: '首日 ROI = 20.00%',
        },
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
    {
      type: 'action_card',
      props: {
        actions: [
          { label: '查看 ROI 报表', action: 'open_report', params: { report_id: 'ad_roi_dashboard' } },
          { label: '启动 ROI 差异排查', action: 'start_diagnosis', params: { metric_id: 'roi_d1' } },
        ],
      },
    },
  ],
  sources: [
    {
      title: '指标解释器知识模板',
      sourceType: 'knowledge',
      source: 'Dataki 知识库',
      detail: '按 metric_explainer_v1 的定义、公式、来源、计算、差异模板组织。',
    },
    {
      title: '广告投放效果报表',
      sourceType: 'report_mcp',
      source: '智投报表 MCP',
      detail: '用于核对消耗、收入和 ROI 聚合结果。',
    },
  ],
};

import type { MetricExplainerUISchema } from '../schemas/metricExplainerSchema';

export const activationRegistrationPaymentSchema: MetricExplainerUISchema = {
  ui_schema_version: 'metric_explainer_v1',
  answer_type: 'metric_difference',
  metric_id: 'activation_registration_payment',
  metric_name: '激活数、注册数、付费数',
  summary: '这三个指标分别描述用户从安装激活、创建账号到产生付费的不同阶段，不能直接互相替代。排查差异时要先确认统计对象、去重口径、时间窗口和报表来源。',
  components: [
    {
      type: 'metric_explain_card',
      props: {
        metricId: 'activation_registration_payment',
        metricName: '激活数、注册数、付费数',
        aliases: ['激活', '注册', '注册设备数', '注册账号数', '付费人数', '付费次数'],
        category: '广告转化',
        subCategory: '归因与用户行为',
        level: 'core',
        status: 'online',
        shortDefinition: '激活看设备首次打开或归因激活，注册看账号创建，付费看支付成功行为。',
        businessMeaning: '用于判断广告流量从触达、进入游戏、完成账号创建到产生收入的转化漏斗质量。',
        usageScenarios: ['渠道质量评估', '媒体回传排查', '注册转化分析', '付费漏斗分析'],
        updatedAt: '2026-05-14',
        owner: '广告数据产品',
      },
    },
    {
      type: 'data_source_card',
      props: {
        sources: [
          {
            sourceName: '激活事件',
            sourceType: '监测归因 / 游戏启动事件',
            system: '监测管理系统',
            table: '待知识库补充',
            field: 'device_id / click_id / activation_time',
            fieldDescription: '设备标识、媒体点击标识、激活时间',
            updateFrequency: '实时接入，报表约 20 分钟调度',
            owner: '监测数据',
            reliability: 'medium',
          },
          {
            sourceName: '注册事件',
            sourceType: '游戏账号系统 / 服务端事件',
            system: '账号中心',
            table: '待知识库补充',
            field: 'user_id / account_id / register_time / device_id',
            fieldDescription: '账号、用户、设备和注册时间',
            updateFrequency: '实时或准实时',
            owner: '游戏数据',
            reliability: 'medium',
          },
          {
            sourceName: '付费事件',
            sourceType: '订单系统 / 服务端支付事件',
            system: '支付中心',
            table: '待知识库补充',
            field: 'order_id / user_id / pay_amount / currency / pay_time',
            fieldDescription: '订单、用户、金额、币种和支付时间',
            updateFrequency: '实时或准实时',
            owner: '支付数据',
            reliability: 'medium',
          },
        ],
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
        attributionRule: '激活和后续行为需要按内部归因规则关联广告来源，具体窗口等待知识库补充。',
        timeWindow: {
          eventTime: '事件发生时间',
          start: '报表选择日期 00:00:00',
          end: '报表选择日期 23:59:59',
          timezone: '默认北京时间，海外项目需按报表口径确认',
        },
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
    {
      type: 'ambiguity_card',
      props: {
        items: [
          {
            userMisunderstanding: '注册数等于激活数',
            actualMeaning: '注册是激活之后的下一步行为，受登录方式、账号创建流程和用户意愿影响。',
            recommendedAnswer: '看注册问题时应同时查看激活到注册的转化率，而不是只比两个绝对数。',
          },
          {
            userMisunderstanding: '付费数只看媒体后台即可',
            actualMeaning: '媒体后台一般只能看到媒体归因后的转化，内部报表还会结合订单、退款、补单和权限过滤。',
            recommendedAnswer: '正式复盘以智投统一口径为准，媒体后台更适合看媒体优化趋势。',
          },
        ],
      },
    },
    {
      type: 'faq_card',
      props: {
        faqs: [
          {
            question: '为什么激活有数但注册少？',
            answer: '常见原因是注册流程门槛、登录服务异常、渠道用户质量偏低、激活归因窗口和注册统计窗口不一致。',
            nextActions: ['查看激活到注册转化率', '按媒体和包体下钻', '排查注册事件上报'],
          },
          {
            question: '为什么注册账号数和注册设备数不一致？',
            answer: '两者去重对象不同。注册账号数按账号或用户 ID，注册设备数按设备标识。',
            nextActions: ['确认报表选择的是账号口径还是设备口径', '查看设备多账号比例'],
          },
        ],
      },
    },
    {
      type: 'action_card',
      props: {
        actions: [
          { label: '查看转化漏斗报表', action: 'open_report', params: { report_id: 'conversion_funnel' } },
          { label: '启动转化差异排查', action: 'start_diagnosis', params: { metric_id: 'activation_registration_payment' } },
          { label: '反馈口径问题', action: 'feedback_metric', params: { metric_id: 'activation_registration_payment' } },
        ],
      },
    },
  ],
  sources: [
    {
      title: '指标解释器知识模板',
      sourceType: 'knowledge',
      source: 'Dataki 知识库',
      detail: '当前已按指标解释器 v1 模板组织，具体表名和字段等待知识库模块化补充。',
    },
    {
      title: '广告转化漏斗报表',
      sourceType: 'report_mcp',
      source: '智投报表 MCP',
      detail: '用于后续核对激活、注册、付费明细和聚合口径。',
    },
  ],
};

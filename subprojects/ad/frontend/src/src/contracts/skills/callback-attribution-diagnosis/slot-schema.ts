interface SlotSchema {
  slots: Array<Record<string, unknown>>;
  clarification_policy: Record<string, unknown>;
}

export const CALLBACK_ATTR_DIAGNOSIS_SLOT_SCHEMA: SlotSchema = {
  slots: [
    {
      key: 'app_query',
      label: '应用名称或编号',
      type: 'string',
      required: true,
      clarification_priority: 1,
      extraction_patterns: [
        /(?:应用|app|游戏|产品)[：:]\s*(\S+)/i,
        /(?:app[_\s-]?id|appid)[：:]\s*(\d+)/i,
      ],
    },
    {
      key: 'app_package_type',
      label: '应用包类型',
      type: 'enum',
      required: true,
      enum_values: ['ANDROID', 'IOS', 'HARMONY', 'WEIXIN', 'DOUYIN', 'KUAISHOU', 'BILIBILI', 'ALIPAY', 'PC', 'WEB', 'OTHER'],
      clarification_priority: 2,
      extraction_patterns: [
        /(安卓|android)/i,
        /(苹果|ios|iphone|ipad)/i,
        /(鸿蒙|harmony)/i,
        /(微信|weixin|wechat)/i,
        /(抖音|douyin|tiktok)/i,
        /(快手|kuaishou)/i,
      ],
    },
    {
      key: 'media_query',
      label: '媒体名称或编号',
      type: 'string',
      required: false,
      clarification_priority: 3,
      extraction_patterns: [
        /(?:媒体|平台|media)[：:]\s*(\S+)/i,
        /(?:media[_\s-]?id)[：:]\s*(\d+)/i,
      ],
    },
    {
      key: 'event_type',
      label: '事件类型',
      type: 'enum',
      required: true,
      enum_values: ['ACTIVATION', 'REGISTER', 'PAY', 'KEY_ACTION', 'DEVICE_RETENTION'],
      clarification_priority: 4,
      extraction_patterns: [
        /(激活|activation)/i,
        /(注册|register)/i,
        /(付费|pay|payment|充值)/i,
        /(关键行为|key[_\s-]?action)/i,
        /(次留|留存|retention)/i,
      ],
    },
    {
      key: 'date_start',
      label: '开始日期',
      type: 'string',
      required: true,
      clarification_priority: 5,
      default_value: '最近7天',
      extraction_patterns: [
        /(?:开始|start|从)[：:]\s*(\d{4}[-/]\d{1,2}[-/]\d{1,2})/i,
        /(最近|过去)\s*(\d+)\s*天/i,
      ],
    },
    {
      key: 'date_end',
      label: '结束日期',
      type: 'string',
      required: true,
      clarification_priority: 6,
      default_value: '今天',
      extraction_patterns: [
        /(?:结束|end|到)[：:]\s*(\d{4}[-/]\d{1,2}[-/]\d{1,2})/i,
        /(今天|today|昨日|yesterday)/i,
      ],
    },
    {
      key: 'problem_desc',
      label: '问题描述',
      type: 'string',
      required: false,
      clarification_priority: 7,
      extraction_patterns: [
        /(?:问题|问题描述|现象)[：:]\s*(.+)/i,
      ],
    },
  ],
  clarification_policy: {
    mode: 'sequential',
    max_rounds: 3,
    required_slots_first: true,
  },
};

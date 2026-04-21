export const navigation = [
  { id: "overview", label: "总览", hint: "问题与主线" },
  { id: "baseline", label: "文档基线", hint: "Tracking Spec" },
  { id: "rules", label: "规则中心", hint: "Validation Rules" },
  { id: "acceptance", label: "验收执行", hint: "Runs & Issues" },
  { id: "collaboration", label: "协作与沉淀", hint: "Reports & Knowledge" },
];

export const heroMetrics = [
  { label: "P0 业务问题", value: "7", tone: "alert" },
  { label: "AI 主链路步骤", value: "8", tone: "accent" },
  { label: "待确认规则", value: "12", tone: "warn" },
  { label: "本周目标", value: "最小闭环", tone: "neutral" },
];

export const problemGroups = [
  {
    title: "责任与流程",
    items: [
      "谁主导文档、谁确认基线、谁推进状态不清。",
      "买点验收缺少统一主链路，长期靠群里催和人工盯。",
    ],
  },
  {
    title: "文档与规则",
    items: [
      "文档灰区多，标准事件和自定义事件治理不一致。",
      "规则长期靠人工维护，易遗漏、易冲突，也不支持后续 AI 使用。",
    ],
  },
  {
    title: "验收与协作",
    items: [
      "查询路径低效，日志工具不适合验收场景。",
      "自动校验与人工确认没有形成闭环，多角色协作成本高。",
    ],
  },
];

export const workflowSteps = [
  { title: "原始输入", desc: "会议纪要、需求稿、Excel、版本说明统一进入 inbox。" },
  { title: "AI 提炼", desc: "自动抽取项目、版本、事件、字段、待确认项。" },
  { title: "文档基线", desc: "形成标准事件、自定义事件、字段定义和版本差异。" },
  { title: "规则生成", desc: "生成基础校验规则、冲突提示和待确认规则。" },
  { title: "验收执行", desc: "按 ID / DID / 时间窗口进行查询和自动校验。" },
  { title: "异常总结", desc: "生成高亮异常、可能原因和责任建议。" },
  { title: "人工确认", desc: "人工处理灰区、例外和最终验收结论。" },
  { title: "结果沉淀", desc: "沉淀报告、状态、历史版本结果和常见问题。" },
];

export const baselineCards = [
  {
    title: "当前版本基线",
    subtitle: "Project: 梦境商店 / v2.8.3 / iOS + Android",
    status: "待确认",
    bullets: ["18 个标准事件", "11 个自定义事件", "6 条版本差异说明"],
  },
  {
    title: "字段结构概览",
    subtitle: "字段类型、必填、枚举值和后果说明",
    status: "AI 草稿",
    bullets: ["51 个字段", "9 个必填字段", "4 个后果说明缺失"],
  },
  {
    title: "输入来源",
    subtitle: "统一进入 docs/sources/inbox/",
    status: "已统一",
    bullets: ["2 份会议纪要", "1 份数分需求稿", "3 份历史 Excel"],
  },
];

export const baselineRows = [
  { event: "login_success", kind: "标准事件", fields: "user_id, channel_id, login_type", required: "3/3", note: "稳定事件，已继承旧版本" },
  { event: "purchase_click", kind: "标准事件", fields: "item_id, price, currency", required: "3/4", note: "缺 currency 后果说明" },
  { event: "guild_invite_popup_show", kind: "自定义事件", fields: "guild_id, popup_source", required: "1/2", note: "popup_source 待策划确认" },
  { event: "ad_reward_claim", kind: "广告场景", fields: "ad_slot, reward_type, is_retry", required: "2/3", note: "广告规则需纳入一期" },
];

export const ruleSummary = [
  { label: "总规则数", value: "48" },
  { label: "AI 生成", value: "31" },
  { label: "待人工确认", value: "12" },
  { label: "存在冲突", value: "5" },
];

export const ruleRows = [
  { rule: "currency enum validation", source: "purchase_click", type: "枚举值", status: "待确认", owner: "数据BP", note: "不同地区包体币种是否统一待确认" },
  { rule: "popup_source required", source: "guild_invite_popup_show", type: "必填", status: "冲突", owner: "策划 + 数据BP", note: "旧版本文档标为可选，新纪要要求必填" },
  { rule: "ad_slot format", source: "ad_reward_claim", type: "格式", status: "已确认", owner: "数据BP", note: "slot_xxx 规则已固化" },
  { rule: "login_type enum", source: "login_success", type: "枚举值", status: "已确认", owner: "研发 + 数据BP", note: "支持微信/游客/苹果三类" },
];

export const acceptanceStats = [
  { label: "本次验收", value: "v2.8.3-0421" },
  { label: "查询方式", value: "DID + 时间窗口" },
  { label: "通过项", value: "19" },
  { label: "异常项", value: "6" },
];

export const acceptanceIssues = [
  { event: "purchase_click", issue: "currency 缺失", layer: "DWD", severity: "高", owner: "研发", action: "补字段并重放" },
  { event: "guild_invite_popup_show", issue: "popup_source 未上报", layer: "ODS", severity: "中", owner: "策划确认 / 研发处理", action: "先确认规则再补接" },
  { event: "ad_reward_claim", issue: "ad_slot 命名不一致", layer: "Kafka", severity: "中", owner: "广告接入", action: "统一命名并回归" },
];

export const runTimeline = [
  "09:30 触发验收任务，读取 v2.8.3 基线。",
  "09:34 自动校验完成，发现 6 个异常项。",
  "09:40 AI 生成异常摘要与责任建议。",
  "09:52 数据BP完成首轮人工确认。",
  "10:05 研发收到异常清单并开始修正。",
];

export const collaborationCards = [
  {
    title: "协作输出",
    content: "同一份结果按数据BP、研发、项目方三种口径输出，减少重复解释。",
  },
  {
    title: "知识与排查",
    content: "异常项可关联透传问题、广告规则、常见字段映射说明。",
  },
  {
    title: "历史沉淀",
    content: "每次验收都沉淀基线版本、异常记录、最终确认结果，支持版本继承。",
  },
];

export const reportRows = [
  { audience: "数据BP", output: "异常明细 + 规则冲突 + 待确认项", value: "当前已生成" },
  { audience: "研发", output: "字段缺失 + 建议责任 + 修复动作", value: "当前已生成" },
  { audience: "项目方", output: "版本风险 + 当前状态 + 是否可继续", value: "当前已生成" },
];

export const priorities = [
  "先收责任、流程、文档、规则，不先吞复杂研发正确性问题。",
  "先跑通输入 -> 文档 -> 规则 -> 校验 -> 确认 -> 沉淀的最小闭环。",
  "AI 一期只聚焦输入提炼、文档标准化、规则生成、结果总结四个点。",
];

export const acceptanceReportVersionOptions = [
  { label: "v1.7.3", value: "v1.7.3" },
  { label: "v1.7.2", value: "v1.7.2" },
];

export const acceptanceLaunchModeOptions = [
  { label: "单事件验收", value: "single_event" },
  { label: "分端验收", value: "platform_scope" },
  { label: "分渠道验收", value: "channel_scope" },
  { label: "多选事件验收", value: "multi_event" },
];

export const acceptancePlatformOptions = [
  { label: "全部", value: "all" },
  { label: "游戏客户端", value: "client" },
  { label: "游戏服务端", value: "server" },
];

export const acceptanceChannelCategoryOptions = [
  { label: "全部渠道", value: "all" },
  { label: "官包", value: "official" },
  { label: "渠道包", value: "channel" },
];

export const acceptanceChannelOptions = [
  { label: "安卓官包", value: "official_android", category: "official", platform: "client" },
  { label: "iOS官包", value: "official_ios", category: "official", platform: "client" },
  { label: "Tap渠道包", value: "tap", category: "channel", platform: "client" },
  { label: "巨量包", value: "ocean", category: "channel", platform: "client" },
  { label: "百度包", value: "baidu", category: "channel", platform: "client" },
  { label: "B站渠道包", value: "bilibili", category: "channel", platform: "client" },
];

export const acceptanceEventCategoryOptions = [
  { label: "全部分类", value: "all" },
  { label: "登录链路", value: "login" },
  { label: "充值链路", value: "payment" },
  { label: "广告变现", value: "ads" },
  { label: "主线流程", value: "mainline" },
];

export const acceptanceEventOptions = [
  { label: "登录完成", value: "HW_LOGIN_FINISH", category: "login", platform: "client" },
  { label: "登录失败", value: "HW_LOGIN_FAIL", category: "login", platform: "client" },
  { label: "充值完成", value: "HW_IAP_PAY_FINISH", category: "payment", platform: "client" },
  { label: "支付回调", value: "HW_IAP_CALLBACK", category: "payment", platform: "server" },
  { label: "广告触发", value: "HW_AD_TRIGGER", category: "ads", platform: "client" },
  { label: "广告结算", value: "HW_AD_SETTLE", category: "ads", platform: "server" },
  { label: "主线完成", value: "HW_STAGE_FINISH", category: "mainline", platform: "client" },
  { label: "资源消耗", value: "HW_RES_CONSUME", category: "mainline", platform: "server" },
];

export const acceptanceBriefPromptDefault = `请基于当前验收批次生成一份简报，固定包含以下部分：
1. 摘要
2. 验收数量
3. 版本覆盖率
4. 未上报数量
5. 已上报数量
6. 未通过数量
7. 验收通过率
8. 版本进度

输出要求：
- 每一项给出一句明确结论
- 使用业务语言，不只堆数字
- 如果信息不足，指出缺失项`;

export const acceptanceDetailPromptDefault = `请基于当前验收批次生成一份详细报告，固定包含以下部分：
1. 摘要
2. 验收数量
3. 版本覆盖率
4. 未上报数量
5. 已上报数量
6. 未通过数量
7. 验收通过率
8. 未上报明细
9. 未通过明细
10. 已通过明细
11. 未通过规则
12. 版本进度

输出要求：
- 未上报明细按事件、L1层参数展开
- 未通过明细按事件、不通过参数、不通过规则、规则分类展开
- 未通过规则补充触发条件、影响范围、修复优先级
- 结论需要支持版本是否继续推进的判断`;

export const acceptanceReportRows = [
  {
    key: "report-001",
    batchNo: "批次 01",
    version: "v1.7.3",
    scope: "分端验收 / 游戏客户端",
    launchMode: "分端验收",
    initiator: "云山",
    status: "已完成",
    eventCount: 42,
    failedCount: 8,
    passRate: "80.9%",
    createdAt: "今天 10:32",
    summary: "客户端首轮验收已完成，登录、充值、广告链路仍有未上报与规则失败问题。",
    brief: "当前版本可继续推进，但需要先补齐 role_id、order_id、ad_position 三类关键问题。",
  },
  {
    key: "report-002",
    batchNo: "批次 02",
    version: "v1.7.3",
    scope: "分渠道验收 / Tap渠道包、巨量包",
    launchMode: "分渠道验收",
    initiator: "云山",
    status: "进行中",
    eventCount: 26,
    failedCount: 5,
    passRate: "80.8%",
    createdAt: "今天 09:18",
    summary: "Tap渠道包与巨量包回归进行中，广告位映射与资源消耗字段仍有差异。",
    brief: "当前渠道问题集中在字段映射，建议修复后再结束渠道验收。",
  },
  {
    key: "report-003",
    batchNo: "批次 03",
    version: "v1.7.3",
    scope: "单事件验收 / 登录完成",
    launchMode: "单事件验收",
    initiator: "云山",
    status: "已完成",
    eventCount: 1,
    failedCount: 1,
    passRate: "66.7%",
    createdAt: "今天 16:05",
    summary: "登录完成事件复验后仍存在 role_id 缺失问题。",
    brief: "单事件问题未收敛，不建议关闭该专项。",
  },
  {
    key: "report-004",
    batchNo: "批次 04",
    version: "v1.7.3",
    scope: "分端验收 / 游戏服务端",
    launchMode: "分端验收",
    initiator: "云山",
    status: "已完成",
    eventCount: 31,
    failedCount: 4,
    passRate: "87.1%",
    createdAt: "今天 15:10",
    summary: "服务端验收已完成，支付回调与资源消耗仍有少量规则未通过。",
    brief: "服务端链路整体稳定，可继续推进，但应补一轮回归。",
  },
  {
    key: "report-005",
    batchNo: "批次 05",
    version: "v1.7.3",
    scope: "分渠道验收 / 安卓官包",
    launchMode: "分渠道验收",
    initiator: "云山",
    status: "已完成",
    eventCount: 18,
    failedCount: 2,
    passRate: "88.9%",
    createdAt: "今天 17:15",
    summary: "安卓官包回归通过率较高，仅剩广告位与订单回调两类问题。",
    brief: "安卓官包已接近收口，补齐问题后可结束验收。",
  },
  {
    key: "report-006",
    batchNo: "批次 06",
    version: "v1.7.3",
    scope: "分渠道验收 / iOS官包",
    launchMode: "分渠道验收",
    initiator: "云山",
    status: "已完成",
    eventCount: 17,
    failedCount: 1,
    passRate: "94.1%",
    createdAt: "今天 18:05",
    summary: "iOS官包验收基本通过，仅剩 currency_type 一条未上报。",
    brief: "iOS官包问题集中且可控，补齐后即可进入最终回归。",
  },
  {
    key: "report-007",
    batchNo: "批次 07",
    version: "v1.7.3",
    scope: "单事件验收 / 广告触发",
    launchMode: "单事件验收",
    initiator: "云山",
    status: "进行中",
    eventCount: 1,
    failedCount: 0,
    passRate: "待生成",
    createdAt: "今天 16:40",
    summary: "广告触发事件专项验收已发起，等待实时日志回流。",
    brief: "建议重点关注 ad_position 与 campaign_id 的枚举映射。",
  },
  {
    key: "report-008",
    batchNo: "批次 08",
    version: "v1.7.2",
    scope: "多选事件验收 / 登录完成、充值完成、广告触发",
    launchMode: "多选事件验收",
    initiator: "云山",
    status: "已完成",
    eventCount: 19,
    failedCount: 3,
    passRate: "84.2%",
    createdAt: "昨天 18:20",
    summary: "历史版本回归已完成，失败项主要是广告与引导事件的历史遗留规则。",
    brief: "历史版本可归档，但建议沉淀旧规则模板，避免后续重复问题。",
  },
  {
    key: "report-009",
    batchNo: "批次 09",
    version: "v1.7.3",
    scope: "分端验收 / 游戏客户端",
    launchMode: "分端验收",
    initiator: "云山",
    status: "已完成",
    eventCount: 35,
    failedCount: 6,
    passRate: "82.9%",
    createdAt: "昨天 14:30",
    summary: "客户端回归失败点主要在步骤事件覆盖和广告位枚举。",
    brief: "客户端问题仍以步骤事件与广告事件为主，建议分模块修复后再补验收。",
  },
  {
    key: "report-010",
    batchNo: "批次 10",
    version: "v1.7.2",
    scope: "分渠道验收 / Tap渠道包",
    launchMode: "分渠道验收",
    initiator: "云山",
    status: "已完成",
    eventCount: 14,
    failedCount: 2,
    passRate: "85.7%",
    createdAt: "前天 19:10",
    summary: "Tap渠道包回归完成，仍有 2 条历史规则问题。",
    brief: "建议作为历史问题沉淀，不阻塞当前版本。",
  },
];

function createInsight({
  summary,
  acceptanceCount,
  coverageRate,
  unreportedCount,
  reportedCount,
  failedCount,
  passRate,
  versionProgress,
  unreportedDetails,
  failedDetails,
  passedDetails,
  failedRules,
}) {
  return {
    summary,
    acceptanceCount,
    coverageRate,
    unreportedCount,
    reportedCount,
    failedCount,
    passRate,
    versionProgress,
    unreportedDetails,
    failedDetails,
    passedDetails,
    failedRules,
  };
}

export const acceptanceReportInsightMap = {
  "report-001": createInsight({
    summary: "v1.7.3 客户端首轮验收已覆盖登录、充值、广告、主线四类核心事件，当前可继续推进，但需补齐未上报与未通过问题后再进入二轮回归。",
    acceptanceCount: "42 个事件 / 186 条规则",
    coverageRate: "92%",
    unreportedCount: "4",
    reportedCount: "38",
    failedCount: "8",
    passRate: "80.9%",
    versionProgress: "核心链路已完成首轮验收，建议先修失败规则，再发起客户端二轮回归。",
    unreportedDetails: ["登录完成 / role_id 未上报 2 次", "广告触发 / ad_position 未上报 1 次", "充值完成 / currency_type 未上报 1 次"],
    failedDetails: ["登录完成 / role_id / 必填校验", "充值完成 / order_id / 唯一值校验", "广告触发 / ad_position / 枚举值校验"],
    passedDetails: ["主线完成：chapter_id、result、trace_id 已全部通过", "支付回调：服务端回调链路已通过", "资源消耗：consume_num 数值型校验通过"],
    failedRules: ["角色主键必填 / P0", "订单唯一值 / P0", "广告位枚举值 / P1"],
  }),
  "report-002": createInsight({
    summary: "v1.7.3 渠道包专项验收正在进行中，Tap 与巨量包字段映射差异已暴露，当前不建议直接结束渠道验收。",
    acceptanceCount: "26 个事件 / 104 条规则",
    coverageRate: "78%",
    unreportedCount: "3",
    reportedCount: "23",
    failedCount: "5",
    passRate: "80.8%",
    versionProgress: "建议先完成渠道包字段映射修复，再补做同版本回归。",
    unreportedDetails: ["广告结算 / campaign_id 未上报 1 次", "资源消耗 / consume_type 未上报 2 次"],
    failedDetails: ["资源消耗 / consume_type / 多字段联合唯一值", "主线完成 / chapter_id / 条件匹配率"],
    passedDetails: ["登录完成：Tap 渠道登录主链路通过", "支付回调：巨量包支付回调通过"],
    failedRules: ["多字段联合唯一值 / P1", "条件匹配率 / P1"],
  }),
  "report-003": createInsight({
    summary: "登录完成事件复验后仍未收口，role_id 缺失问题依然存在。",
    acceptanceCount: "1 个事件 / 6 条规则",
    coverageRate: "100%",
    unreportedCount: "0",
    reportedCount: "1",
    failedCount: "1",
    passRate: "66.7%",
    versionProgress: "单事件问题未解决，不建议关闭该专项。",
    unreportedDetails: [],
    failedDetails: ["登录完成 / role_id / 必填校验"],
    passedDetails: ["device_id 唯一值通过", "platform 枚举通过"],
    failedRules: ["角色主键必填 / P0"],
  }),
  "report-004": createInsight({
    summary: "服务端验收已完成，支付回调与资源消耗仍有少量规则未通过。",
    acceptanceCount: "31 个事件 / 122 条规则",
    coverageRate: "89%",
    unreportedCount: "2",
    reportedCount: "29",
    failedCount: "4",
    passRate: "87.1%",
    versionProgress: "服务端可继续推进，建议修完支付回调与资源规则后补一轮小批次回归。",
    unreportedDetails: ["支付回调 / callback_status 未上报 1 次", "资源消耗 / resource_scene 未上报 1 次"],
    failedDetails: ["支付回调 / order_id / 重复值校验", "资源消耗 / consume_sum / 汇总值校验"],
    passedDetails: ["广告结算：关键字段已通过", "资源消耗：主键关联通过"],
    failedRules: ["订单唯一值 / P0", "汇总值校验 / P1"],
  }),
  "report-005": createInsight({
    summary: "安卓官包渠道回归接近收口，仅剩两类规则需要处理。",
    acceptanceCount: "18 个事件 / 68 条规则",
    coverageRate: "93%",
    unreportedCount: "1",
    reportedCount: "17",
    failedCount: "2",
    passRate: "88.9%",
    versionProgress: "补齐广告位枚举与订单回调问题后可结束安卓官包验收。",
    unreportedDetails: ["广告触发 / ad_position 未上报 1 次"],
    failedDetails: ["广告触发 / ad_position / 枚举值校验", "支付回调 / order_id / 重复值校验"],
    passedDetails: ["登录完成：通过", "主线完成：通过"],
    failedRules: ["广告位枚举值 / P1", "订单唯一值 / P0"],
  }),
  "report-006": createInsight({
    summary: "iOS 官包验收已基本通过，仅剩 1 条未上报问题。",
    acceptanceCount: "17 个事件 / 64 条规则",
    coverageRate: "96%",
    unreportedCount: "1",
    reportedCount: "16",
    failedCount: "1",
    passRate: "94.1%",
    versionProgress: "补齐 currency_type 后即可进入最终回归。",
    unreportedDetails: ["充值完成 / currency_type 未上报 1 次"],
    failedDetails: ["充值完成 / currency_type / 必填校验"],
    passedDetails: ["登录完成：通过", "广告触发：通过"],
    failedRules: ["币种必填 / P1"],
  }),
  "report-007": createInsight({
    summary: "广告触发专项验收进行中，当前等待日志回流。",
    acceptanceCount: "1 个事件 / 5 条规则",
    coverageRate: "待生成",
    unreportedCount: "待生成",
    reportedCount: "待生成",
    failedCount: "待生成",
    passRate: "待生成",
    versionProgress: "需等待日志回流后生成结论。",
    unreportedDetails: ["待生成"],
    failedDetails: ["待生成"],
    passedDetails: ["待生成"],
    failedRules: ["待生成"],
  }),
  "report-008": createInsight({
    summary: "历史版本回归已完成，失败项主要是广告与引导事件的历史遗留规则。",
    acceptanceCount: "19 个事件 / 73 条规则",
    coverageRate: "87%",
    unreportedCount: "1",
    reportedCount: "18",
    failedCount: "3",
    passRate: "84.2%",
    versionProgress: "旧版本可归档，建议把遗留规则整理进统一模板。",
    unreportedDetails: ["新手引导步骤 / guide_step_name 未上报 1 次"],
    failedDetails: ["新手引导步骤 / step_id / 表行数覆盖不完整", "广告触发 / campaign_id / 历史渠道映射差异"],
    passedDetails: ["登录完成：关键参数已通过", "充值完成：订单链路已通过"],
    failedRules: ["步骤覆盖完整性 / P2", "历史渠道映射规则 / P2"],
  }),
  "report-009": createInsight({
    summary: "客户端回归失败点主要在步骤事件覆盖和广告位枚举。",
    acceptanceCount: "35 个事件 / 148 条规则",
    coverageRate: "88%",
    unreportedCount: "3",
    reportedCount: "32",
    failedCount: "6",
    passRate: "82.9%",
    versionProgress: "客户端需按模块修复后再补一轮回归。",
    unreportedDetails: ["新手引导 / step_name 未上报 1 次", "广告触发 / ad_scene 未上报 2 次"],
    failedDetails: ["新手引导 / step_id / 步骤覆盖校验", "广告触发 / ad_position / 枚举值校验"],
    passedDetails: ["登录完成：通过", "充值完成：通过"],
    failedRules: ["步骤覆盖完整性 / P1", "广告位枚举值 / P1"],
  }),
  "report-010": createInsight({
    summary: "Tap 渠道包回归完成，仍有 2 条历史规则问题。",
    acceptanceCount: "14 个事件 / 51 条规则",
    coverageRate: "86%",
    unreportedCount: "0",
    reportedCount: "14",
    failedCount: "2",
    passRate: "85.7%",
    versionProgress: "建议作为历史问题沉淀，不阻塞当前版本。",
    unreportedDetails: [],
    failedDetails: ["资源消耗 / consume_type / 唯一值校验", "广告触发 / campaign_id / 枚举值校验"],
    passedDetails: ["登录完成：通过", "主线完成：通过"],
    failedRules: ["多字段唯一值 / P2", "渠道映射规则 / P2"],
  }),
};

function createDetailRows(baseKey, eventId, eventCnName) {
  return [
    {
      key: `${baseKey}-1`,
      eventId,
      eventCnName,
      failedParam: "role_id",
      failedRule: "必填校验",
      ruleCategory: "空值行数",
      acceptanceStandard: "关键主键字段必须上报且不可为空。",
      payloadExample: `{"event_id":"${eventId}","role_id":"","device_id":"A1001"}`,
    },
    {
      key: `${baseKey}-2`,
      eventId,
      eventCnName,
      failedParam: "order_id",
      failedRule: "唯一值校验",
      ruleCategory: "重复值行数",
      acceptanceStandard: "订单号必须唯一，不允许重复上报。",
      payloadExample: `{"event_id":"${eventId}","order_id":"PAY20260506001","amount":30}`,
    },
  ];
}

export const acceptanceReportDetailMap = {
  "report-001": createDetailRows("detail-001", "HW_LOGIN_FINISH", "登录完成"),
  "report-002": createDetailRows("detail-002", "HW_RES_CONSUME", "资源消耗"),
  "report-003": createDetailRows("detail-003", "HW_LOGIN_FINISH", "登录完成"),
  "report-004": createDetailRows("detail-004", "HW_IAP_CALLBACK", "支付回调"),
  "report-005": createDetailRows("detail-005", "HW_AD_TRIGGER", "广告触发"),
  "report-006": createDetailRows("detail-006", "HW_IAP_PAY_FINISH", "充值完成"),
  "report-007": createDetailRows("detail-007", "HW_AD_TRIGGER", "广告触发"),
  "report-008": createDetailRows("detail-008", "HW_GUIDE_STEP", "新手引导步骤"),
  "report-009": createDetailRows("detail-009", "HW_STAGE_FINISH", "主线完成"),
  "report-010": createDetailRows("detail-010", "HW_AD_TRIGGER", "广告触发"),
};

function createKpis(unreported, reported, failed, passRate, offset) {
  return [
    { key: `stat-${offset}-1`, label: "未上报数量", value: String(unreported), tone: "danger" },
    { key: `stat-${offset}-2`, label: "已上报数量", value: String(reported), tone: "success" },
    { key: `stat-${offset}-3`, label: "未通过数量", value: String(failed), tone: "warning" },
    { key: `stat-${offset}-4`, label: "验收通过率", value: String(passRate), tone: "info" },
  ];
}

export const acceptanceReportKpiMap = {
  "report-001": createKpis(4, 38, 8, "80.9%", "001"),
  "report-002": createKpis(3, 23, 5, "80.8%", "002"),
  "report-003": createKpis(0, 1, 1, "66.7%", "003"),
  "report-004": createKpis(2, 29, 4, "87.1%", "004"),
  "report-005": createKpis(1, 17, 2, "88.9%", "005"),
  "report-006": createKpis(1, 16, 1, "94.1%", "006"),
  "report-007": createKpis("待生成", "待生成", "待生成", "待生成", "007"),
  "report-008": createKpis(1, 18, 3, "84.2%", "008"),
  "report-009": createKpis(3, 32, 6, "82.9%", "009"),
  "report-010": createKpis(0, 14, 2, "85.7%", "010"),
};

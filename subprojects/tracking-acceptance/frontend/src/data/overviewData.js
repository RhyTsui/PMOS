function createProjectIcon(label, color) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
      <rect width="28" height="28" rx="6" fill="${color}" />
      <text x="14" y="18" font-size="11" text-anchor="middle" fill="#ffffff" font-family="Microsoft YaHei">${label}</text>
    </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const currentUserName = "云山";

export const navigationItems = [
  { key: "overview", label: "概览", icon: "home" },
  { key: "requirements", label: "埋点需求", icon: "file" },
  { key: "dictionary", label: "数据字典", icon: "book" },
  { key: "rules", label: "校验规则", icon: "setting" },
  { key: "logs", label: "实时查询", icon: "search" },
  { key: "reports", label: "验收报告", icon: "file" },
  { key: "ai", label: "AI 助手", icon: "robot" },
];

export const personalMenuItems = [{ key: "logout", label: "退出登录" }];

export const viewOptions = [
  { label: "全部", value: "all" },
  { label: "游戏客户端", value: "client" },
  { label: "游戏服务端", value: "server" },
];

function makeTrend(values, month = "05") {
  return values.map((passRate, index) => ({
    date: `${month}-${String(index + 1).padStart(2, "0")}`,
    passRate,
  }));
}

function makeFailureRows(rows) {
  return rows.map((item) => ({
    eventId: item.eventId,
    eventName: item.eventName,
    priority: item.priority ?? "P0",
    source: item.source,
    badParam: item.badParam,
    rule: item.rule,
    status: "不通过",
  }));
}

function makePendingRows(rows) {
  return rows.map((item) => ({
    eventId: item.eventId,
    eventName: item.eventName,
    priority: item.priority ?? "P0",
    source: item.source,
    status: "未上报",
  }));
}

function createViewData({ metrics, trend, failedTop5, pendingTop5 }) {
  return { metrics, trend, failedTop5, pendingTop5 };
}

function createVersion(data) {
  return data;
}

function cloneVersion(version, overrides = {}) {
  return {
    ...version,
    ...overrides,
    updates: overrides.updates ?? version.updates.map((item) => ({ ...item })),
    views:
      overrides.views ??
      Object.fromEntries(
        Object.entries(version.views).map(([key, view]) => [
          key,
          {
            ...view,
            metrics: { ...view.metrics },
            trend: view.trend.map((item) => ({ ...item })),
            failedTop5: view.failedTop5.map((item) => ({ ...item })),
            pendingTop5: view.pendingTop5.map((item) => ({ ...item })),
          },
        ])
      ),
  };
}

const flowerWorldVersion = createVersion({
  value: "flower-1.7.3",
  label: "1.7.3 版本验收",
  versionNo: "1.7.3",
  goal: "完成登录、充值、广告触发、关键资源消耗事件的验收闭环。",
  startDate: "2026-05-01",
  endDate: "2026-05-14",
  scope: "充值、变现、生产环境回归。",
  channelCount: 5,
  updates: [
    { id: "fw-1", type: "版本信息变更", title: "版本延期至 05.14。", time: "今天 10:20" },
    { id: "fw-2", type: "埋点需求变更", title: "新增支付确认结果事件。", time: "今天 09:35" },
    { id: "fw-3", type: "校验规则变更", title: "login_result 的 user_id 缺失升级为阻塞。", time: "昨天 18:10" },
    { id: "fw-4", type: "数据字典更新", title: "reward_type 新增广告奖励枚举值。", time: "昨天 16:42" },
    { id: "fw-5", type: "验收批次报告更新", title: "第二批客户端回归报告已补录。", time: "昨天 14:08" },
  ],
  views: {
    all: createViewData({
      metrics: { eventCount: 186, acceptedCount: 142, pendingCount: 44 },
      trend: makeTrend([42, 47, 55, 61, 76]),
      failedTop5: makeFailureRows([
        { eventId: "HW_LOGIN_RESULT", eventName: "登录结果", source: "游戏客户端", badParam: "user_id", rule: "必填校验" },
        { eventId: "HW_IAP_PAY_FINISH", eventName: "充值完成", source: "游戏服务端", badParam: "order_id", rule: "唯一性校验" },
        { eventId: "HW_STAGE_FINISH", eventName: "章节完成", source: "游戏客户端", badParam: "chapter_id", rule: "枚举校验" },
        { eventId: "HW_AD_REWARD", eventName: "广告奖励发放", source: "游戏服务端", badParam: "reward_num", rule: "数值范围" },
        { eventId: "HW_GUIDE_STEP", eventName: "新手引导步骤", priority: "P1", source: "游戏客户端", badParam: "step_code", rule: "步骤完整性" },
      ]),
      pendingTop5: makePendingRows([
        { eventId: "HW_RES_CONSUME", eventName: "关键资源消耗", source: "游戏客户端" },
        { eventId: "HW_STAGE_ENTER", eventName: "主线关卡进入", source: "游戏客户端" },
        { eventId: "HW_AD_TRIGGER", eventName: "广告触发", source: "游戏客户端" },
        { eventId: "HW_MAIL_READ", eventName: "邮件阅读", source: "游戏客户端" },
        { eventId: "HW_PET_UPGRADE", eventName: "宠物升级", priority: "P1", source: "游戏客户端" },
      ]),
    }),
    client: createViewData({
      metrics: { eventCount: 94, acceptedCount: 73, pendingCount: 21 },
      trend: makeTrend([38, 44, 51, 58, 77]),
      failedTop5: makeFailureRows([
        { eventId: "HW_LOGIN_RESULT", eventName: "登录结果", source: "游戏客户端", badParam: "user_id", rule: "必填校验" },
        { eventId: "HW_STAGE_FINISH", eventName: "章节完成", source: "游戏客户端", badParam: "chapter_id", rule: "枚举校验" },
        { eventId: "HW_GUIDE_STEP", eventName: "新手引导步骤", source: "游戏客户端", badParam: "step_code", rule: "步骤完整性" },
        { eventId: "HW_STAGE_ENTER", eventName: "主线关卡进入", source: "游戏客户端", badParam: "entry_time", rule: "时间格式" },
        { eventId: "HW_AD_TRIGGER", eventName: "广告触发", priority: "P1", source: "游戏客户端", badParam: "ad_pos", rule: "枚举校验" },
      ]),
      pendingTop5: makePendingRows([
        { eventId: "HW_STAGE_ENTER", eventName: "主线关卡进入", source: "游戏客户端" },
        { eventId: "HW_AD_TRIGGER", eventName: "广告触发", source: "游戏客户端" },
        { eventId: "HW_MAIL_READ", eventName: "邮件阅读", source: "游戏客户端" },
        { eventId: "HW_SKIN_USE", eventName: "皮肤使用", source: "游戏客户端" },
        { eventId: "HW_STORE_CLICK", eventName: "商城点击", priority: "P1", source: "游戏客户端" },
      ]),
    }),
    server: createViewData({
      metrics: { eventCount: 92, acceptedCount: 69, pendingCount: 23 },
      trend: makeTrend([45, 49, 58, 64, 75]),
      failedTop5: makeFailureRows([
        { eventId: "HW_IAP_PAY_FINISH", eventName: "充值完成", source: "游戏服务端", badParam: "order_id", rule: "唯一性校验" },
        { eventId: "HW_AD_REWARD", eventName: "广告奖励发放", source: "游戏服务端", badParam: "reward_num", rule: "数值范围" },
        { eventId: "HW_RES_CONSUME", eventName: "关键资源消耗", source: "游戏服务端", badParam: "consume_type", rule: "枚举校验" },
        { eventId: "HW_PET_UPGRADE", eventName: "宠物升级", source: "游戏服务端", badParam: "pet_level", rule: "增长规则" },
        { eventId: "HW_RANK_REWARD", eventName: "排行奖励发放", priority: "P1", source: "游戏服务端", badParam: "rank_type", rule: "必填校验" },
      ]),
      pendingTop5: makePendingRows([
        { eventId: "HW_RES_CONSUME", eventName: "关键资源消耗", source: "游戏服务端" },
        { eventId: "HW_PET_UPGRADE", eventName: "宠物升级", source: "游戏服务端" },
        { eventId: "HW_RANK_REWARD", eventName: "排行奖励发放", source: "游戏服务端" },
        { eventId: "HW_ORDER_CANCEL", eventName: "订单取消", source: "游戏服务端" },
        { eventId: "HW_GUILD_JOIN", eventName: "公会加入", priority: "P1", source: "游戏服务端" },
      ]),
    }),
  },
});

export const projectOptions = [
  {
    label: "花花世界",
    value: "flower-world",
    icon: createProjectIcon("花", "#3B86F9"),
    versions: [flowerWorldVersion],
  },
  {
    label: "王者荣耀",
    value: "honor-of-kings",
    icon: createProjectIcon("王", "#C65A2E"),
    versions: [
      cloneVersion(flowerWorldVersion, {
        value: "hok-2.8.1",
        label: "2.8.1 版本验收",
        versionNo: "2.8.1",
        goal: "完成大厅、对局、活动与支付链路验收。",
        startDate: "2026-05-03",
        endDate: "2026-05-22",
      }),
    ],
  },
  {
    label: "和平精英",
    value: "peace-elite",
    icon: createProjectIcon("和", "#2F8F83"),
    versions: [
      cloneVersion(flowerWorldVersion, {
        value: "peace-3.4.0",
        label: "3.4.0 版本验收",
        versionNo: "3.4.0",
        goal: "完成登录、对战、商城和赛事埋点验收。",
        startDate: "2026-05-04",
        endDate: "2026-05-24",
      }),
    ],
  },
  {
    label: "蛋仔派对",
    value: "egg-party",
    icon: createProjectIcon("蛋", "#F0A43A"),
    versions: [
      cloneVersion(flowerWorldVersion, {
        value: "egg-1.9.2",
        label: "1.9.2 版本验收",
        versionNo: "1.9.2",
        goal: "完成乐园、商城、抽奖和活动埋点验收。",
        startDate: "2026-05-02",
        endDate: "2026-05-18",
      }),
    ],
  },
  {
    label: "鹅鸭杀",
    value: "goose-goose-duck",
    icon: createProjectIcon("鹅", "#6C7CF6"),
    versions: [
      cloneVersion(flowerWorldVersion, {
        value: "goose-1.4.6",
        label: "1.4.6 版本验收",
        versionNo: "1.4.6",
        goal: "完成房间、对局、语音和社交埋点验收。",
        startDate: "2026-05-01",
        endDate: "2026-05-19",
      }),
    ],
  },
  {
    label: "奔奔王国",
    value: "benben-kingdom",
    icon: createProjectIcon("奔", "#D04F8C"),
    versions: [
      cloneVersion(flowerWorldVersion, {
        value: "bb-0.9.8",
        label: "0.9.8 版本验收",
        versionNo: "0.9.8",
        goal: "完成养成、关卡、签到和礼包埋点验收。",
        startDate: "2026-05-05",
        endDate: "2026-05-21",
      }),
    ],
  },
];

export const navItems = [
  { id: "dashboard", label: "概览", icon: "home", enabled: true },
  { id: "requirements", label: "埋点需求", icon: "list", enabled: true },
  { id: "dictionary", label: "数据字典", icon: "book", enabled: false },
  { id: "rules", label: "校验规则", icon: "shield", enabled: false },
  { id: "logs", label: "日志查询", icon: "search", enabled: false },
  { id: "reports", label: "验收报告", icon: "report", enabled: false },
  { id: "ai", label: "AI 助手", icon: "spark", enabled: false },
];

export const roleOptions = [
  { id: "analyst", label: "数据分析师", subtitle: "默认查看全部上报方", defaultSource: "全部来源" },
  { id: "game-client", label: "游戏客户端开发", subtitle: "默认查看游戏客户端来源", defaultSource: "游戏客户端来源" },
  { id: "game-server", label: "游戏服务端开发", subtitle: "默认查看游戏服务端来源", defaultSource: "游戏服务端来源" },
  { id: "sdk-client", label: "SDK 客户端开发", subtitle: "默认查看 SDK 客户端来源", defaultSource: "SDK 客户端来源" },
  { id: "sdk-server", label: "SDK 服务端开发", subtitle: "默认查看 SDK 服务端来源", defaultSource: "SDK 服务端来源" },
  { id: "qa", label: "QA", subtitle: "默认查看客户端与服务端来源", defaultSource: "全部来源" },
  { id: "pm-ops", label: "项目经理 / 游戏运营", subtitle: "默认查看全部上报方", defaultSource: "全部来源" },
];

export const projectOptions = [
  { id: "u-code", label: "代号：U", versionLabel: "当前源文档版本未标注" },
];

const csvEvents = [
  ["启动", "用户打开游戏，初始化SDK", "SDK客户端", "核心", "P0", "进行中", "已完成"],
  ["账号登录", "用户登入游戏，获取账号凭证", "SDK客户端", "核心", "P0", "进行中", "已完成"],
  ["创建角色", "首次进入游戏获取角色ID成功", "SDK客户端", "核心", "P0", "无需接入", "无需接入"],
  ["角色登录(进入游戏)", "每次进入游戏获取角色ID成功", "SDK客户端", "核心", "P0", "进行中", "已完成"],
  ["升级", "游戏每次角色升级时", "SDK客户端", "核心", "P0", "无需接入", "无需接入"],
  ["充值", "客户端收到支付成功", "SDK客户端", "核心", "P0", "进行中", "已完成"],
  ["前置埋点", "游戏启动到进入游戏的过程打点：详情", "研发客户端", "核心", "P0", "进行中", "已完成"],
  ["新手引导", "进入游戏后在新手引导阶段的点位：详情", "研发客户端", "核心", "P0", "进行中", "已完成"],
  ["客户端自定义事件", "详情见：客户端自定义事件", "研发客户端", "非核心", "", "进行中", "已完成"],
  ["账号登录", "玩家账号登录时上报", "研发服务器", "核心", "P0", "进行中", "已完成"],
  ["角色登录事件", "玩家角色登录游戏时上报", "研发服务器", "核心", "P0", "进行中", "已完成"],
  ["登出事件", "玩家退出游戏/与服务器断开连接时上报", "研发服务器", "核心", "P0", "进行中", "已完成"],
  ["充值事件", "玩家充值成功时上报", "研发服务器", "核心", "P0", "进行中", "已完成"],
  ["升级事件", "账号/角色升级时上报", "研发服务器", "核心", "P0", "进行中", "已完成"],
  ["在线人数", "每隔5min，推送各区服实际在线角色/账号数", "研发服务器", "核心", "P0", "进行中", "已完成"],
  ["资源产销", "玩家在游戏内资源产出消耗时上报", "研发服务器", "核心", "P0", "进行中", "已完成"],
  ["有效点位", "有效点位（第2关通关）", "研发服务器", "核心", "P0", "进行中", "已完成"],
  ["激励视频", "激励视频触发及播放结束时上报一条数据", "研发服务器", "核心", "P0", "进行中", "已完成"],
  ["服务器自定义事件", "详情见：服务器自定义事件", "研发服务器", "非核心", "", "进行中", "已完成"],
].map(([eventName, description, reporter, eventType, priority, devStatus, acceptance], index) => ({
  id: `csv-${index + 1}`,
  eventId: `U-${String(index + 1).padStart(3, "0")}`,
  eventName,
  description,
  reporter,
  eventType,
  priority: priority || "未标注",
  devStatus,
  acceptance,
  category:
    eventName.includes("登录")
      ? "登录"
      : eventName.includes("充值")
        ? "付费"
        : eventName.includes("升级")
          ? "成长"
          : eventName.includes("视频")
            ? "广告"
            : eventName.includes("引导") || eventName.includes("前置")
              ? "流程"
              : eventName.includes("在线")
                ? "监控"
                : eventName.includes("资源")
                  ? "经济"
                  : eventName.includes("登出")
                    ? "会话"
                    : "业务",
  source:
    reporter === "SDK客户端"
      ? "SDK 客户端来源"
      : reporter === "研发客户端"
        ? "游戏客户端来源"
        : "游戏服务端来源",
  type: eventName.includes("自定义") ? "自定义" : "通用",
  channel: "源文档未区分",
  coreParams: eventName.includes("自定义") ? 0 : eventName.includes("前置") || eventName.includes("引导") ? 4 : 3,
  stepMode: eventName === "前置埋点" || eventName === "新手引导",
  stepCount: eventName === "前置埋点" ? 24 : eventName === "新手引导" ? 66 : 0,
}));

const countBy = (list, key, value) => list.filter((item) => item[key] === value).length;

const coreCount = countBy(csvEvents, "eventType", "核心");
const nonCoreCount = countBy(csvEvents, "eventType", "非核心");
const clientCount = csvEvents.filter((item) => item.source === "SDK 客户端来源" || item.source === "游戏客户端来源").length;
const serverCount = countBy(csvEvents, "source", "游戏服务端来源");
const adCount = countBy(csvEvents, "category", "广告");
const stepCount = csvEvents.filter((item) => item.stepMode).reduce((sum, item) => sum + item.stepCount, 0);
const completedCount = countBy(csvEvents, "acceptance", "已完成");
const skippedCount = countBy(csvEvents, "acceptance", "无需接入");

export const overviewMetrics = [
  { id: "core", label: "核心埋点数", value: String(coreCount), tone: "blue", icon: "chart" },
  { id: "non-core", label: "非核心埋点数", value: String(nonCoreCount), tone: "teal", icon: "list" },
  { id: "ads", label: "广告相关埋点数", value: String(adCount), tone: "purple", icon: "spark" },
  { id: "client", label: "游戏客户端埋点数", value: String(clientCount), tone: "sky", icon: "gamepad" },
  { id: "server", label: "游戏服务端埋点数", value: String(serverCount), tone: "green", icon: "server" },
  { id: "rules", label: "总校验规则数", value: "源文档未提供", tone: "orange", icon: "book" },
];

export const acceptanceSummary = [
  { label: "版本号", value: "源文档未标注" },
  { label: "版本名称", value: "《代号：U》埋点文档" },
  { label: "开始时间", value: "源文档未提供" },
  { label: "结束时间", value: "源文档未提供" },
  { label: "渠道包数量", value: "源文档未提供" },
  { label: "验收埋点数量", value: `${csvEvents.length} 个事件` },
];

export const overviewActivities = [
  { id: "act-1", tag: "需求变更", tone: "blue", content: `源文档当前整理出 ${csvEvents.length} 个事件`, time: "今日" },
  { id: "act-2", tag: "结构识别", tone: "green", content: `识别出 ${coreCount} 个核心事件、${nonCoreCount} 个非核心事件`, time: "今日" },
  { id: "act-3", tag: "步骤事件", tone: "orange", content: `识别到 2 个步骤型事件，共 ${stepCount} 个子步骤`, time: "今日" },
  { id: "act-4", tag: "验收状态", tone: "purple", content: `${completedCount} 个事件已完成验收，${skippedCount} 个无需接入`, time: "今日" },
  { id: "act-5", tag: "数据缺口", tone: "cyan", content: "规则、版本、渠道包等对象当前未在源 CSV 中提供", time: "今日" },
];

export const trendTabs = ["核心事件", "非核心事件", "游戏客户端", "游戏服务端"];

export const trendData = {
  核心事件: [
    { day: "识别", value: 17 },
    { day: "已验收", value: 15 },
    { day: "进行中", value: 13 },
    { day: "无需接入", value: 2 },
  ],
  非核心事件: [
    { day: "识别", value: 2 },
    { day: "已验收", value: 2 },
    { day: "进行中", value: 2 },
    { day: "无需接入", value: 0 },
  ],
  游戏客户端: [
    { day: "SDK客户端", value: 6 },
    { day: "研发客户端", value: 3 },
    { day: "已完成", value: 7 },
    { day: "无需接入", value: 2 },
  ],
  游戏服务端: [
    { day: "研发服务器", value: 10 },
    { day: "已完成", value: 10 },
    { day: "进行中", value: 10 },
    { day: "无需接入", value: 0 },
  ],
};

export const aiInsights = {
  anomalies: [
    "当前源文档主要覆盖事件级清单，没有参数级结构，因此无法直接展开字段级核验。",
    "步骤型事件仅在描述中以“详情”形式出现，子步骤清单仍需补充原始明细文档。",
  ],
  impacts: [
    "大部分事件已标记为“已完成”验收，但缺少版本和批次上下文，暂时无法做跨版本影响判断。",
    "两类自定义事件尚无优先级与字段细节，后续接入会直接影响规则生成与报告准确性。",
  ],
  deltas: [
    `真实文档当前识别出 ${csvEvents.length} 个事件，其中核心事件 ${coreCount} 个。`,
    `客户端相关事件 ${clientCount} 个，服务端相关事件 ${serverCount} 个。`,
  ],
  note: "当前页面已改为真实事件数据驱动；若要继续提升质量，需要继续补参数明细、规则清单和版本对象。",
};

export const keyIssues = [
  { id: "issue-1", priority: "P0", eventId: "U-007", eventName: "前置埋点", param: "子步骤", value: "详情未拆分", owner: "游戏客户端开发" },
  { id: "issue-2", priority: "P0", eventId: "U-008", eventName: "新手引导", param: "子步骤", value: "详情未拆分", owner: "游戏客户端开发" },
  { id: "issue-3", priority: "P1", eventId: "U-009", eventName: "客户端自定义事件", param: "优先级", value: "未标注", owner: "游戏客户端开发" },
  { id: "issue-4", priority: "P1", eventId: "U-019", eventName: "服务器自定义事件", param: "优先级", value: "未标注", owner: "游戏服务端开发" },
  { id: "issue-5", priority: "P2", eventId: "U-001", eventName: "启动", param: "规则清单", value: "源文档未提供", owner: "数据分析师" },
];

export const requirementSummary = {
  currentLabel: "当前版本验收范围（基于源 CSV 识别）",
  compareLabel: "历史版本差异摘要",
  compareTarget: "源文档未提供历史版本",
  items: [
    { label: "事件数", value: String(csvEvents.length), delta: `核心 ${coreCount}` },
    { label: "步骤数", value: String(stepCount), delta: "仅 2 个事件支持" },
    { label: "事件更新数", value: "源文档未提供", delta: "待补版本对象" },
  ],
};

export const requirementFilters = {
  source: ["全部来源", "SDK 客户端来源", "游戏客户端来源", "游戏服务端来源"],
  channels: ["全部渠道包", "源文档未区分"],
  categories: ["全部分类", "登录", "会话", "流程", "付费", "成长", "广告", "经济", "监控", "业务"],
  types: ["全部类型", "通用", "自定义"],
  priorities: ["全部优先级", "P0", "未标注"],
};

export const requirementRows = csvEvents.map((item) => ({
  id: item.id,
  priority: item.priority === "未标注" ? "P2" : item.priority,
  eventId: item.eventId,
  eventName: item.eventName,
  source: item.source,
  channel: item.channel,
  category: item.category,
  type: item.type,
  acceptance: item.acceptance,
  devStatus: item.devStatus,
  eventType: item.eventType,
  coreParams: item.coreParams,
  description: item.description,
  stepMode: item.stepMode,
  stepCount: item.stepCount,
}));

export const stepDetails = {
  "csv-7": {
    eventName: "前置埋点",
    subtitle: "源 CSV 仅说明“游戏启动到进入游戏的过程打点：详情”，未给出完整子步骤表。这里先按交互合同保留弹窗承载位。",
    steps: [
      { id: "PRE-001", name: "启动完成", order: 1, expected: "进入加载资源阶段", status: "待补明细" },
      { id: "PRE-002", name: "资源加载", order: 2, expected: "进入登录准备阶段", status: "待补明细" },
      { id: "PRE-003", name: "登录准备", order: 3, expected: "进入账号登录阶段", status: "待补明细" },
    ],
  },
  "csv-8": {
    eventName: "新手引导",
    subtitle: "源 CSV 仅说明“进入游戏后在新手引导阶段的点位：详情”，未给出完整子步骤表。这里先按交互合同保留弹窗承载位。",
    steps: [
      { id: "GUIDE-001", name: "开始按钮", order: 1, expected: "点击后进入引导第一步", status: "待补明细" },
      { id: "GUIDE-002", name: "引导第一步", order: 2, expected: "完成后进入第二步", status: "待补明细" },
      { id: "GUIDE-003", name: "引导第二步", order: 3, expected: "完成后进入结束收口", status: "待补明细" },
    ],
  },
};

export const uploadDialogPreset = {
  versionCode: "",
  versionName: "《代号：U》埋点文档.csv",
  acceptanceRange: "当前演示已切换为源 CSV 真数据展示",
  timeStart: "",
  timeEnd: "",
  channelRange: "",
  fileName: "《代号：U》埋点文档.csv",
  parseResult: `已解析 ${csvEvents.length} 个事件；字段级参数、规则、版本对象仍待补充原始资料。`,
};

export const exportDialogPreset = {
  selectedVersion: "当前源 CSV 视图",
  exportTargets: ["当前事件清单", "步骤型事件视图", "导出模板"],
  notes: [
    "当前页面中的事件列表已直接来自《代号：U》埋点文档.csv。",
    "如果需要历史版本导出，需要先补充版本号、版本名称和差异来源文档。",
  ],
};

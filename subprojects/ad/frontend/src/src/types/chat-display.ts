import type { AgentType } from '@/types';

export interface ChatStarterQuestionConfig {
  id: string;
  label: string;
  prompt: string;
  agent: AgentType;
  openPanel: boolean;
  enabled: boolean;
  sortOrder: number;
}

export interface ChatStarterItemConfig {
  id: string;
  label: string;
  description: string;
  prompt: string;
  agent: AgentType;
  openPanel: boolean;
  enabled: boolean;
  sortOrder: number;
  children?: ChatStarterQuestionConfig[];
}

export interface ChatDisplayConfig {
  welcomeText: string;
  welcomeTexts: string[];
  quickTitle: string;
  quickHint: string;
  taskPanelTitle: string;
  starters: ChatStarterItemConfig[];
  updatedAt: string;
}

export const DEFAULT_CHAT_STARTERS: ChatStarterItemConfig[] = [
  {
    id: 'delivery',
    label: '投放交付',
    description: '确认哪些包可以交付投放，以及还缺什么。',
    prompt: '哪些包能投？',
    agent: 'delivery',
    openPanel: true,
    enabled: true,
    sortOrder: 10,
    children: [
      {
        id: 'delivery-package-ready',
        label: '哪些包能投？',
        prompt: '获取当前项目下通过检测、可以交付投放的包，并告诉我包名、下载地址、上报验收状态、审核状态和联调情况。',
        agent: 'delivery',
        openPanel: true,
        enabled: true,
        sortOrder: 10,
      },
      {
        id: 'delivery-package-blocked',
        label: '为什么不能投？',
        prompt: '检查当前项目下暂时不能交付投放的包，说明卡在哪个环节、原因是什么、下一步怎么处理。',
        agent: 'delivery',
        openPanel: true,
        enabled: true,
        sortOrder: 20,
      },
      {
        id: 'delivery-package-prepare',
        label: '帮我准备投放包',
        prompt: '帮我准备当前项目的投放包，检查母包、提审、分包、审核、联调和上报验收情况，缺什么直接告诉我。',
        agent: 'delivery',
        openPanel: true,
        enabled: true,
        sortOrder: 30,
      },
    ],
  },
  {
    id: 'anomaly-diagnosis',
    label: '异常排查',
    description: '定位没量、没回传和联调失败的真实原因。',
    prompt: '为什么没量？',
    agent: 'diagnosis',
    openPanel: true,
    enabled: true,
    sortOrder: 20,
    children: [
      {
        id: 'diagnosis-no-volume',
        label: '为什么没量？',
        prompt: '排查当前项目为什么没量，先检查投放、包、媒体、数据回传和报表口径，最后只给结论、原因和下一步。',
        agent: 'diagnosis',
        openPanel: true,
        enabled: true,
        sortOrder: 10,
      },
      {
        id: 'diagnosis-no-postback',
        label: '为什么没回传？',
        prompt: '排查当前项目为什么没有回传，检查监测链接、事件上报、媒体回传、智投入库和报表展示，最后只给结论、原因和下一步。',
        agent: 'diagnosis',
        openPanel: true,
        enabled: true,
        sortOrder: 20,
      },
      {
        id: 'diagnosis-debug-failed',
        label: '为什么联调失败？',
        prompt: '排查当前项目最近一次联调失败的原因，定位最后失败步骤、失败原因和下一步处理建议。',
        agent: 'debugging',
        openPanel: true,
        enabled: true,
        sortOrder: 30,
      },
    ],
  },
  {
    id: 'data-analysis',
    label: '数据分析',
    description: '看 ROI、波动和转化率，直接给判断。',
    prompt: '今天ROI怎么样？',
    agent: 'prediction',
    openPanel: true,
    enabled: true,
    sortOrder: 50,
    children: [
      {
        id: 'analysis-roi-today',
        label: '今天ROI怎么样？',
        prompt: '查看当前项目今天 ROI 表现，默认给项目大盘数据，并结合消耗、激活、付费和收入判断是否正常。',
        agent: 'prediction',
        openPanel: true,
        enabled: true,
        sortOrder: 10,
      },
      {
        id: 'analysis-abnormal-wave',
        label: '看看异常波动',
        prompt: '查看当前项目最近 7 天投放数据，找出异常波动的日期、指标、媒体或账户，并说明可能原因。',
        agent: 'diagnosis',
        openPanel: true,
        enabled: true,
        sortOrder: 20,
      },
      {
        id: 'analysis-conversion-rate',
        label: '分析下转化率',
        prompt: '分析当前项目最近 7 天转化率表现，按可用维度查看激活、注册、付费等关键转化，并说明变化原因。',
        agent: 'prediction',
        openPanel: true,
        enabled: true,
        sortOrder: 30,
      },
    ],
  },
  {
    id: 'report-generation',
    label: '报告生成',
    description: '生成日报、周报和当天投放汇总。',
    prompt: '帮我出日报',
    agent: 'prediction',
    openPanel: true,
    enabled: true,
    sortOrder: 60,
    children: [
      {
        id: 'report-daily',
        label: '帮我出日报',
        prompt: '帮我生成当前项目今天的投放日报，包含项目总数据、媒体流量、应用类型流量、团队流量、异常说明和可复制到邮件的结论。',
        agent: 'prediction',
        openPanel: true,
        enabled: true,
        sortOrder: 10,
      },
      {
        id: 'report-weekly',
        label: '帮我生成周报',
        prompt: '帮我生成当前项目最近 7 天投放周报，包含核心指标趋势、媒体结构、团队结构、异常点和下周关注项。',
        agent: 'prediction',
        openPanel: true,
        enabled: true,
        sortOrder: 20,
      },
      {
        id: 'report-today-summary',
        label: '汇总今天投放',
        prompt: '汇总当前项目今天投放情况，默认展示大盘数据、主要媒体表现、异常波动和需要关注的下一步。',
        agent: 'prediction',
        openPanel: true,
        enabled: true,
        sortOrder: 30,
      },
    ],
  },
  {
    id: 'metric-explain',
    label: '指标解释',
    description: '解释指标算法、口径差异和报表不一致。',
    prompt: '这个指标怎么算？',
    agent: 'help',
    openPanel: false,
    enabled: true,
    sortOrder: 30,
    children: [
      {
        id: 'metric-how-calculate',
        label: '这个指标怎么算？',
        prompt: '解释我刚才提到的指标怎么算，说明定义、数据来源、计算方式、常见差异和查看位置。',
        agent: 'help',
        openPanel: false,
        enabled: true,
        sortOrder: 10,
      },
      {
        id: 'metric-daily-diff',
        label: '为什么和日报不一致？',
        prompt: '帮我排查当前项目这个数据为什么和日报不一致，检查时间、口径、维度、去重、自然量和分成等可能原因。',
        agent: 'diagnosis',
        openPanel: true,
        enabled: true,
        sortOrder: 20,
      },
      {
        id: 'metric-caliber',
        label: '这个口径是什么？',
        prompt: '解释我刚才提到的数据口径，说明适用场景、计算范围、和其他口径的差异，以及看数时要注意什么。',
        agent: 'help',
        openPanel: false,
        enabled: true,
        sortOrder: 30,
      },
    ],
  },
  {
    id: 'market-intel',
    label: '市场情报',
    description: '看竞品、素材和市场趋势。',
    prompt: '最近竞品在投什么？',
    agent: 'material',
    openPanel: true,
    enabled: true,
    sortOrder: 70,
    children: [
      {
        id: 'intel-competitor',
        label: '最近竞品在投什么？',
        prompt: '查看最近竞品在投什么，结合行业情报、素材榜单和可用数据，说明重点素材、媒体、趋势和对我们的启发。',
        agent: 'material',
        openPanel: true,
        enabled: true,
        sortOrder: 10,
      },
      {
        id: 'intel-material-rising',
        label: '最近什么素材涨了？',
        prompt: '查看最近广告行业里涨得快的素材，分析题材、脚本、卖点、投放平台和可复用方向。',
        agent: 'material',
        openPanel: true,
        enabled: true,
        sortOrder: 20,
      },
      {
        id: 'intel-market-trend',
        label: '看看市场趋势',
        prompt: '查看最近广告行业和游戏买量市场趋势，给出变化摘要、风险点和对当前项目投放的建议。',
        agent: 'hub',
        openPanel: true,
        enabled: true,
        sortOrder: 30,
      },
    ],
  },
  {
    id: 'business-collaboration',
    label: '业务协同',
    description: '记录需求、跟进需求和查看进度。',
    prompt: '帮我提需求',
    agent: 'demand',
    openPanel: true,
    enabled: true,
    sortOrder: 40,
    children: [
      {
        id: 'demand-create',
        label: '帮我提需求',
        prompt: '帮我把当前需求整理成可推进的需求记录，说明目标、背景、输入、验收标准、优先级和还缺什么。',
        agent: 'demand',
        openPanel: true,
        enabled: true,
        sortOrder: 10,
      },
      {
        id: 'demand-follow',
        label: '帮我跟进需求',
        prompt: '帮我跟进当前项目相关需求，整理当前状态、负责人、阻塞点和下一步。',
        agent: 'demand',
        openPanel: true,
        enabled: true,
        sortOrder: 20,
      },
      {
        id: 'demand-progress',
        label: '看看需求进度',
        prompt: '查看当前项目需求进度，按最近处理、待确认、处理中和已完成整理，并指出需要我处理的事项。',
        agent: 'demand',
        openPanel: true,
        enabled: true,
        sortOrder: 30,
      },
    ],
  },
];

export const DEFAULT_CHAT_DISPLAY_CONFIG: ChatDisplayConfig = {
  welcomeText: '需要我帮你做什么吗？',
  welcomeTexts: ['需要我帮你做什么吗？'],
  quickTitle: '你可以直接这样问',
  quickHint: '先选一个方向，再点具体问题，我会带入标准提问模板继续推进。',
  taskPanelTitle: '任务',
  starters: DEFAULT_CHAT_STARTERS,
  updatedAt: '',
};

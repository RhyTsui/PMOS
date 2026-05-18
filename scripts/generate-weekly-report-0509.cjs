const xlsx = require('xlsx');

const source = process.argv[2];
const target = process.argv[3];

if (!source || !target) {
  throw new Error('usage: node scripts/generate-weekly-report-0509.cjs <source> <target>');
}

const wb = xlsx.readFile(source);
const sheetName = wb.SheetNames[0] || 'Sheet1';

const rows = [
  ['周报5月9号', '', '', '', '', '', '', ''],
  ['项目', '需求方', '本周工作', '汇报人', '进度', '备注', '下周计划', '进度'],
  [
    'Dataki知识库',
    '发行',
    '完成 Dataki 与 PMAIOS 的接入校正，打通个人账号知识库检索；支持默认知识库上下文，系统现状检索结果已可进入 Hermes 评审链',
    '徐韵',
    0.7,
    '已确认版本库知识库可检索；修正了 userId/agentId 语义；开始承接系统现状 grounding',
    '继续推进 v1.1，围绕小闪登录、Prompt 权限/接入接出、知识自动更新、广告知识应用继续细化',
    0.8,
  ],
  [
    '小乔智投',
    '数分',
    '重启产品定义并补齐全链路文档；完成规划/需求/功能/设计/会话支撑能力专项；前端进入交付级实现，工作台与管理页已重构，后端 mock 接口补齐一批',
    '徐韵',
    0.7,
    '已明确会话支撑能力 12 项；前端切到 Ant Design + Ant Design X；管理页接入 Prompt/功能开关；后端当前以本地 mock contract 承接',
    '继续补数据表、接口、后端结构真源，并把前后端联调与验收链跑通',
    0.8,
  ],
  [
    'PMAIOS',
    '产品',
    '持续推进 v0.7 主线：Hermes 已打通 research/committee/watch/promote/writeback/closure；接入 Dataki 默认知识源；proof-of-work、review committee、operator action 持续产品化；重写 PMOS 主文档、全景图和本机统一入口',
    '徐韵',
    0.75,
    '已完成 Hermes 定向测试、平台 lint/build；本机统一入口已从 chat 壳重构为 control plane 骨架；新增前端反漂移审计规则',
    '继续收口剩余历史真源污染与跨项目 rollout，把 v0.7 从已落地主干推进到更完整平台化状态',
    0.85,
  ],
  [
    '连弩测试平台',
    '测试/发行',
    '本周未作为主线推进，保留 active task 与已有方案沉淀',
    '徐韵',
    0.35,
    '当前平台主线优先级低于 PMAIOS / 小乔 / Dataki',
    '视优先级决定是否继续补首版 plan-prd / functional-spec-pack',
    0.4,
  ],
  [
    '埋点验收平台',
    'ALL',
    '本周未继续主推业务线，保留既有 active tasks，未关闭主线判断',
    '徐韵',
    0.55,
    '当前明确“先不动埋点主线”，平台侧主要做 PMOS 与 Hermes 收口',
    '后续按优先级决定是否恢复推进 prep checklist 与前端交付链',
    0.55,
  ],
];

const ws = xlsx.utils.aoa_to_sheet(rows);
ws['!cols'] = [
  { wch: 16 },
  { wch: 12 },
  { wch: 54 },
  { wch: 10 },
  { wch: 8 },
  { wch: 50 },
  { wch: 44 },
  { wch: 8 },
];

wb.Sheets[sheetName] = ws;
wb.SheetNames = [sheetName];
xlsx.writeFile(wb, target);

console.log(target);

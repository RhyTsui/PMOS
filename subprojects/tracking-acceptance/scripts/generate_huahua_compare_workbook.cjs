const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const outPath = path.join(
  'E:\\AI\\ai-os\\subprojects\\tracking-acceptance\\docs\\deliverables\\huahua-tracking-docs',
  'huahua-doc-versions-compare.xlsx',
);

const versions = [
  {
    版本: 'V1 概览版',
    定位: '高层总览',
    适合对象: '老板/项目方/首次了解项目的人',
    优点: '快、清楚、先建立全局认知',
    不足: '不是完整需求文档',
    地址: 'huahua-human-overview.svg',
  },
  {
    版本: 'V2 接入版',
    定位: '开发者接入文档',
    适合对象: '客户端/SDK/服务端/测试',
    优点: '包含接入方式、payload、职责、时序、校验',
    不足: '偏规范，不够像业务清单',
    地址: 'huahua-human-integration-manual.html',
  },
  {
    版本: 'V3 需求版',
    定位: '业务完整需求总册',
    适合对象: '产品/数据BP/研发交接',
    优点: '更接近《代号Q》式完整需求结构',
    不足: '还未展开到逐事件独立章节',
    地址: 'huahua-human-requirements-spec.html',
  },
  {
    版本: 'V4 AI 结构版',
    定位: '结构化规格',
    适合对象: 'AI/规则生成/自动验收',
    优点: 'Fact/Conflict/Assumption 清晰',
    不足: '不适合作为业务首读版本',
    地址: 'huahua-ai-structured-spec.html',
  },
];

const matrix = [
  { 能力点: '项目整体理解', V1: '强', V2: '中', V3: '中', V4: '弱' },
  { 能力点: '业务需求完整性', V1: '弱', V2: '中', V3: '强', V4: '中' },
  { 能力点: 'SDK 接入方式', V1: '弱', V2: '强', V3: '中', V4: '中' },
  { 能力点: '服务端事件契约', V1: '弱', V2: '强', V3: '中', V4: '强' },
  { 能力点: '前置/新手流程清单', V1: '中', V2: '中', V3: '强', V4: '中' },
  { 能力点: '支付链字段冲突暴露', V1: '中', V2: '强', V3: '强', V4: '强' },
  { 能力点: 'AI 继续消费', V1: '弱', V2: '中', V3: '中', V4: '强' },
  { 能力点: '适合作为最终正式文档底稿', V1: '弱', V2: '中', V3: '强', V4: '中' },
];

const roadmap = [
  {
    阶段: '当前已交付',
    说明: 'V1/V2/V3/V4 四个版本 + HTML 入口 + SVG 概览 + Excel 对比',
  },
  {
    阶段: '下一步建议',
    说明: '以 V3 为主线，把 V2 的接口契约并入，扩成逐事件独立章节版',
  },
  {
    阶段: '最终目标',
    说明: '形成可直接给研发、测试、数据 BP 使用的正式埋点需求与接入文档',
  },
];

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(versions), '版本说明');
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(matrix), '覆盖矩阵');
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(roadmap), '建议路线');

fs.mkdirSync(path.dirname(outPath), { recursive: true });
XLSX.writeFile(wb, outPath);
console.log(outPath);

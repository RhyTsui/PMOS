export const requirementVersionOptions = [
  { label: "需求 v1.0", value: "v1.0" },
  { label: "需求 v1.1", value: "v1.1" },
];

export const requirementVersionMetaMap = {
  "v1.0": {
    title: "v1.0 页面口径",
    tag: "稳定基线",
    summary: "保留当前页面基线，不回写覆盖。",
    focus: "现有页面主要围绕埋点需求、规则、查询、报告等分模块展示。",
  },
  "v1.1": {
    title: "v1.1 页面口径",
    tag: "重做目标",
    summary: "后续页面按新主链重做：版本管理、模板装配、查询验证、报告分发。",
    focus: "新增要求包括内置通用埋点模板、勾选式补充、报告推送到小闪、右上角需求版本切换。",
  },
};

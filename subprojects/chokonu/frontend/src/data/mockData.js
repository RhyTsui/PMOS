export const navItems = [
  { key: "overview", label: "首页总览" },
  { key: "standards", label: "规则与契约" },
  { key: "assets", label: "样本与评测集" },
  { key: "runs", label: "执行与评估" },
  { key: "results", label: "Trace 与报告" },
];

export const summaryStats = [
  { key: "targets", title: "评测对象", value: 4, suffix: "类" },
  { key: "suites", title: "活跃评测集", value: 18, suffix: "组" },
  { key: "runs", title: "今日执行批次", value: 12, suffix: "次" },
  { key: "blockers", title: "阻塞项", value: 2, suffix: "个" },
];

export const capabilityCards = [
  {
    title: "规则与契约",
    detail: "统一管理字段契约、行为规则、业务口径和红线，避免测试结论口径漂移。",
  },
  {
    title: "样本与评测集",
    detail: "把 contract_case 和 semantic_case 编排进 baseline、scenario、regression 三类评测集。",
  },
  {
    title: "执行与评估",
    detail: "围绕 run 组织规则、契约、语义和人工复核 evaluator，形成统一执行链。",
  },
  {
    title: "Trace 与报告",
    detail: "把失败阶段、重点失败样本、版本对比和建议动作收成可决策证据。",
  },
];

export const blockers = [
  {
    title: "MCP 高风险工具仍可误触发",
    detail: "未完成二次确认保护，命中红线，不允许直接放行。",
    severity: "红线",
    linkLabel: "查看 Trace",
  },
  {
    title: "Workflow 关键路径成功率下滑",
    detail: "从 95% 降到 81%，说明执行稳定性不足，仍需收口。",
    severity: "高风险",
    linkLabel: "查看回归对比",
  },
  {
    title: "Chat / Agent 会话解决率下降",
    detail: "本轮下降 7%，需要补强语义评估器和会话回归集。",
    severity: "中风险",
    linkLabel: "查看失败样本",
  },
];

export const workbenchCards = [
  {
    object: "standard",
    title: "规则中心",
    detail: "规则、契约、口径、通过失败判断。",
  },
  {
    object: "case",
    title: "样本中心",
    detail: "contract_case、semantic_case、来源与预期。",
  },
  {
    object: "suite",
    title: "评测集中心",
    detail: "baseline、scenario、regression 编排。",
  },
  {
    object: "run",
    title: "执行中心",
    detail: "目标模型、环境、并发、重试和调度。",
  },
  {
    object: "evaluator",
    title: "评估中心",
    detail: "规则、契约、语义、人工复核四层 evaluator。",
  },
  {
    object: "trace/result",
    title: "Trace 与结果",
    detail: "失败阶段定位、case-result-trace 关联。",
  },
  {
    object: "report",
    title: "报告中心",
    detail: "概览、分布、重点失败、版本对比、建议动作。",
  },
  {
    object: "gate/regression",
    title: "治理中心",
    detail: "回归集、版本 gate、风险样本、晋级判断。",
  },
];

export const gateSignals = [
  {
    metric: "红线命中",
    current: "1 条",
    baseline: "0 条",
    delta: "+1",
    status: "blocked",
  },
  {
    metric: "关键路径成功率",
    current: "81%",
    baseline: "95%",
    delta: "-14%",
    status: "risk",
  },
  {
    metric: "知识问答可支撑率",
    current: "89%",
    baseline: "84%",
    delta: "+5%",
    status: "good",
  },
  {
    metric: "会话解决率",
    current: "71%",
    baseline: "78%",
    delta: "-7%",
    status: "risk",
  },
];

export const evidenceRows = [
  {
    object: "MCP",
    sample: "订单退款工具调用",
    result: "fail",
    stage: "tool_call",
    decision: "命中红线，需立即收口",
  },
  {
    object: "Workflow",
    sample: "自动建单关键路径",
    result: "fail",
    stage: "workflow_branch",
    decision: "关键路径跌破阈值，阻塞版本放行",
  },
  {
    object: "Chat / Agent",
    sample: "售后问答边界场景",
    result: "review",
    stage: "semantic_judge",
    decision: "进入人工复核并补回归",
  },
  {
    object: "知识检索",
    sample: "政策时效性问答",
    result: "pass",
    stage: "retrieval",
    decision: "结果稳定，可继续扩大覆盖",
  },
];

export const standardsRows = [
  {
    name: "高风险工具二次确认",
    type: "红线规则",
    target: "MCP / Agent",
    threshold: "必须二次确认",
  },
  {
    name: "知识问答可支撑率",
    type: "主指标",
    target: "知识检索",
    threshold: ">= 85%",
  },
  {
    name: "会话解决率",
    type: "主指标",
    target: "Chat / Agent",
    threshold: ">= 78%",
  },
  {
    name: "关键路径成功率",
    type: "主指标",
    target: "Workflow",
    threshold: ">= 95%",
  },
];

export const assetRows = [
  {
    title: "订单退款工具误触发",
    category: "MCP",
    suite: "高风险回归集",
    source: "历史事故",
  },
  {
    title: "售后退款问答边界",
    category: "Chat / Agent",
    suite: "客服问答回归集",
    source: "人工补录",
  },
  {
    title: "政策过期检索问答",
    category: "知识检索",
    suite: "知识场景集",
    source: "版本回归",
  },
  {
    title: "自动建单主链路",
    category: "Workflow",
    suite: "关键路径集",
    source: "线上回流",
  },
];

export const runRows = [
  {
    label: "当前执行批次",
    value: "客服问答回归 / v0.1.7",
  },
  {
    label: "执行进度",
    value: "32 / 36 已完成",
  },
  {
    label: "失败样本",
    value: "5 条",
  },
  {
    label: "待人工复核",
    value: "3 条",
  },
];

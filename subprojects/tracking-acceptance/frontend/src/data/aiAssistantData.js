export const aiAssistantBuiltinEntries = [
  {
    key: "builtin-mcp",
    title: "内置MCP",
    description: "提供需求、规则、查询结果、验收结果、报告等上下文访问能力。",
    accessKey: "tracking_acceptance_mcp",
  },
  {
    key: "builtin-kb",
    title: "内置知识库",
    description: "提供埋点需求真源、设计规范、规则模板和验收历史案例检索能力。",
    accessKey: "tracking_acceptance_kb",
  },
];

export const aiAssistantInitialMessages = [
  {
    id: "assistant-seed-001",
    role: "assistant",
    content: "你好，我可以开始处理你的问题。",
    attachments: [],
    createdAt: "07:30",
  },
];

export const aiAssistantQuickPrompts = [];

export function createAiAssistantReply(prompt, attachments = []) {
  const attachmentSummary =
    attachments.length > 0 ? `已同时读取 ${attachments.length} 个附件：${attachments.map((item) => item.name).join("、")}。` : "";

  if (prompt.includes("规则")) {
    return `${attachmentSummary}建议按事件、L1层参数、终端、渠道四层生成动态规则。例如：当终端等于 iOS 时，asa_token 必填；否则 asa_token 非必填。`;
  }

  if (prompt.includes("报告")) {
    return `${attachmentSummary}可以先输出项目摘要、失败事件归因、失败参数分布、规则分类分布，再给出修复优先级与回归建议。`;
  }

  if (prompt.includes("需求")) {
    return `${attachmentSummary}我会先检查事件、L1层参数、步骤、验收标准、校验规则与上报示例是否完整，再列出需要补全的缺口。`;
  }

  return `${attachmentSummary}已收到。请继续补充事件、版本、渠道、终端或验收标准，我会基于内置MCP继续回答。`;
}

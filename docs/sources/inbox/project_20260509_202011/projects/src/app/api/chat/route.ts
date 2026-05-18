import { NextRequest } from 'next/server';
import {
  LLMClient,
  KnowledgeClient,
  SearchClient,
  Config,
  HeaderUtils,
  DataSourceType,
} from 'coze-coding-dev-sdk';

// --- Clients ---
const config = new Config();
const llmClient = new LLMClient(config);
const knowledgeClient = new KnowledgeClient(config);

// --- Tool definitions (告诉 LLM 可以调用哪些工具) ---
const TOOL_DEFINITIONS = `
你可以使用以下工具来获取信息:

1. knowledge_search(query: string) - 在知识库中搜索广告技术文档、配置指南、指标口径说明
   使用场景: 用户询问指标定义、系统路径、配置步骤、排查方法等已有文档覆盖的问题
   返回: 相关文档片段列表

2. web_search(query: string) - 在互联网搜索最新的广告平台政策、行业动态、技术更新
   使用场景: 用户询问最新政策变化、平台更新、行业趋势等需要实时信息的问题
   返回: 搜索结果列表和AI摘要

调用工具时，请在回复中使用以下格式:
<tool_call name="knowledge_search">搜索关键词</tool_call)
<tool_call name="web_search">搜索关键词</tool_call)

你可以同时调用多个工具，也可以先思考再决定是否需要调用工具。
如果问题只需要你已有的知识即可回答，无需调用工具。
`;

// --- System Prompt ---
const SYSTEM_PROMPT = `你是小乔智投(XiaoQiao Ad OS)的AI助手，一位专业的广告技术支持工程师。

## 你的身份
你服务于广告投放和支持团队，帮助他们解决日常广告技术问题。你不是通用AI，你是广告领域的专家助手。

## 产品定位
小乔智投是「广告支持与投放协同自动化工作台」，核心价值是:
- 先实现支持侧自动化（需求接入/标准联调/异常排查/对话式分析）
- 先赋能投放团队，而非替代投放团队
- 中长期逐步实现投放自动化

## 四条核心业务流
1. **使用帮助(help)**: 指标口径解释、系统路径导航、广告规则说明、常见技术问题
2. **需求沟通(demand)**: 媒体回传接入、事件映射、埋点/归因/配置类需求、结构化需求单
3. **问题排查(diagnosis)**: 激活/付费/回传/归因/BI不一致、证据链收集、结论与建议
4. **广告联调(debugging)**: 联调准备项检查、执行状态与日志、联调结果报告

## 广告技术核心知识
### 常见指标口径
- 激活(Activation): 用户首次打开APP，巨量引擎默认事件app_open
- 注册(Register): 用户完成账号注册，需映射register事件
- 付费(Pay): 用户完成付费行为，需映射pay事件并上报金额
- ROI = 总回收金额/总消耗金额×100%
- LTV = 用户生命周期价值，按天维度累计
- CPA = 总消耗/转化数，CTR = 点击数/展示数，CVR = 转化数/点击数

### 常见排查场景
- 激活不一致: 检查SDK初始化→事件映射→归因窗口→时区→时间范围
- 付费缺失: 检查事件注册→金额格式→订单去重→回传延迟(2-4h)→环境
- 归因异常: 检查归因窗口(7天点击/1天浏览)→设备ID匹配→跨渠道冲突→归因模型
- BI不一致: 检查数据口径→时区→归因窗口→筛选条件→更新时间

### 联调流程
1. Web准备: 打开广告后台→登录→进入联调工具→创建任务→获取二维码
2. 移动端扫码: 扫码→确认设备连接→等待广告加载
3. 找广告点击: 浏览广告→找到目标→点击→等待跳转
4. 拉起应用: 确认DeepLink→等待拉起→确认落地页→完成事件
5. 成功轮询: 等2-4h→检查转化→确认回传→生成报告

### 媒体平台
- 巨量引擎(今日头条/抖音): access_token鉴权，OAID设备ID
- 腾讯广告: signature鉴权，IDFA/OAID
- 快手广告: callback鉴权

### 自动化边界
- 可直接自动化: 需求收集、表单补齐、标准联调、日志归集、指标查询、常见诊断
- 适合人机协作: 异常根因判断、联调问题解释、分析结论确认、需求可行性判断
- 必须人负责: 投放预算决策、重大活动排期、财务协调、商务策略、品牌合规

## 回复风格
- 专业但亲和，像一位有经验的技术同事
- 给出具体可操作步骤，不说空话
- 必要时引用知识库文档或搜索结果作为依据
- 对超出自动化边界的问题，明确告知需要人工决策

${TOOL_DEFINITIONS}
`;

// --- Tool execution ---
async function executeTool(
  name: string,
  query: string,
  customHeaders: Record<string, string>
): Promise<string> {
  try {
    if (name === 'knowledge_search') {
      const client = new KnowledgeClient(config, customHeaders);
      const resp = await client.search(query, undefined, 5, 0.3);
      if (resp.code === 0 && resp.chunks && resp.chunks.length > 0) {
        return resp.chunks
          .map(
            (chunk: { content: string; score: number }, i: number) =>
              `[知识库结果${i + 1}] (相关度: ${chunk.score.toFixed(2)})\n${chunk.content}`
          )
          .join('\n\n');
      }
      return '[知识库搜索未找到相关结果]';
    }

    if (name === 'web_search') {
      const client = new SearchClient(config, customHeaders);
      const resp = await client.webSearch(query, 5, true);
      const results: string[] = [];
      if (resp.summary) {
        results.push(`[AI摘要] ${resp.summary}`);
      }
      if (resp.web_items && resp.web_items.length > 0) {
        resp.web_items.forEach((item: { title: string; snippet: string; url?: string }, i: number) => {
          results.push(
            `[搜索结果${i + 1}] ${item.title}\n${item.snippet}${item.url ? `\n来源: ${item.url}` : ''}`
          );
        });
      }
      return results.length > 0 ? results.join('\n\n') : '[网络搜索未找到相关结果]';
    }

    return `[未知工具: ${name}]`;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return `[工具调用失败: ${name}] ${msg}`;
  }
}

// --- Parse tool calls from LLM response ---
function parseToolCalls(text: string): { name: string; query: string }[] {
  const calls: { name: string; query: string }[] = [];
  // Match <tool_call name="xxx">query</tool_call)
  const regex = /<tool_call\s+name="(\w+)">([^<]+)<\/tool_call>/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    calls.push({ name: match[1], query: match[2].trim() });
  }
  return calls;
}

// --- Remove tool call tags from display text ---
function cleanToolCallsFromText(text: string): string {
  return text.replace(/<tool_call\s+name="(\w+)">([^<]+)<\/tool_call>/g, '').trim();
}

// --- Route intent from user message ---
function detectIntent(message: string): string {
  const lower = message.toLowerCase();
  const helpKeywords = ['什么是', '指标', '口径', '怎么理解', '什么意思', '帮助', '路径', '在哪', '规则'];
  const demandKeywords = ['回传', '接入', '配置', '需求', '映射', '埋点', '事件', '上报'];
  const diagnosisKeywords = ['排查', '异常', '不一致', '少了', '多了', '缺失', '对不上', '为什么没', '问题', '失败'];
  const debuggingKeywords = ['联调', '调试', '测试', '扫码', '验证', '调通'];

  if (diagnosisKeywords.some((k) => lower.includes(k))) return 'diagnosis';
  if (debuggingKeywords.some((k) => lower.includes(k))) return 'debugging';
  if (demandKeywords.some((k) => lower.includes(k))) return 'demand';
  if (helpKeywords.some((k) => lower.includes(k))) return 'help';
  return 'help';
}

// --- POST handler ---
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { message, history = [], intent: providedIntent } = body as {
    message: string;
    history?: { role: string; content: string }[];
    intent?: string;
  };

  const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
  const intent = providedIntent || detectIntent(message);

  // Build messages with system prompt
  const messages = [
    { role: 'system' as const, content: SYSTEM_PROMPT },
    ...history.map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user' as const, content: message },
  ];

  const encoder = new TextEncoder();
  let controllerClosed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (data: string) => {
        if (controllerClosed) return;
        try {
          controller.enqueue(encoder.encode(data));
        } catch {
          controllerClosed = true;
        }
      };

      try {
        // Phase 1: LLM thinking + decide tools (with thinking mode)
        enqueue(
          `data: ${JSON.stringify({ type: 'phase', phase: 'thinking' })}\n\n`
        );

        let fullResponse = '';
        let thinkingContent = '';

        const llmStream = llmClient.stream(messages, {
          model: 'doubao-seed-1-8-251228',
          thinking: 'enabled',
        });

        for await (const chunk of llmStream) {
          // Thinking content
          const reasoning = chunk.additional_kwargs?.reasoning_content as string | undefined;
          if (reasoning) {
            thinkingContent += reasoning;
            enqueue(
              `data: ${JSON.stringify({ type: 'thinking', content: reasoning })}\n\n`
            );
          }

          // Regular content
          if (chunk.content && typeof chunk.content === 'string' && chunk.content.trim()) {
            fullResponse += chunk.content;
          }
        }

        // Phase 2: Parse and execute tool calls
        const toolCalls = parseToolCalls(fullResponse);
        const cleanResponse = cleanToolCallsFromText(fullResponse);

        if (toolCalls.length > 0) {
          // Execute each tool and send results
          for (const toolCall of toolCalls) {
            enqueue(
              `data: ${JSON.stringify({
                type: 'tool_call',
                name: toolCall.name,
                query: toolCall.query,
              })}\n\n`
            );

            const toolResult = await executeTool(toolCall.name, toolCall.query, customHeaders);

            enqueue(
              `data: ${JSON.stringify({
                type: 'tool_result',
                name: toolCall.name,
                result: toolResult.substring(0, 2000),
              })}\n\n`
            );
          }

          // Phase 3: LLM generates final answer based on tool results
          enqueue(
            `data: ${JSON.stringify({ type: 'phase', phase: 'generating' })}\n\n`
          );

          // Build context with tool results
          const toolContext = toolCalls
            .map((tc) => {
              return `[${tc.name}("${tc.query}")的结果]`;
            })
            .join('\n\n');

          const finalMessages = [
            ...messages,
            {
              role: 'assistant' as const,
              content: fullResponse,
            },
            {
              role: 'user' as const,
              content: `基于以上工具调用结果，请给出完整的专业回答。以下是工具返回的结果:\n\n${toolContext}\n\n请综合这些信息，给出结构化的专业回答。`,
            },
          ];

          // We need to actually get the tool results - let's re-execute and build context
          const actualToolResults: string[] = [];
          for (const tc of toolCalls) {
            const result = await executeTool(tc.name, tc.query, customHeaders);
            actualToolResults.push(`[${tc.name}("${tc.query}")]\n${result}`);
          }

          // Rebuild with actual results
          const finalMessagesWithResults = [
            ...messages,
            {
              role: 'assistant' as const,
              content: `我需要调用工具来获取信息:\n${toolCalls.map((tc) => `<tool_call name="${tc.name}">${tc.query}</tool_call)`).join('\n')}`,
            },
            {
              role: 'user' as const,
              content: `以下是工具返回的结果:\n\n${actualToolResults.join('\n\n')}\n\n请基于这些结果，结合你的专业知识，给出完整、结构化的回答。`,
            },
          ];

          const finalStream = llmClient.stream(finalMessagesWithResults, {
            model: 'doubao-seed-1-8-251228',
          });

          let finalContent = '';
          for await (const chunk of finalStream) {
            if (chunk.content && typeof chunk.content === 'string' && chunk.content.trim()) {
              finalContent += chunk.content;
              enqueue(
                `data: ${JSON.stringify({ type: 'content', content: chunk.content })}\n\n`
              );
            }
          }
        } else {
          // No tool calls - just output the clean response
          if (cleanResponse) {
            enqueue(
              `data: ${JSON.stringify({ type: 'content', content: cleanResponse })}\n\n`
            );
          }
        }

        // Send routing info
        enqueue(
          `data: ${JSON.stringify({
            type: 'route',
            intent,
            hasThinking: thinkingContent.length > 0,
            toolsUsed: toolCalls.map((tc) => tc.name),
          })}\n\n`
        );

        enqueue(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        enqueue(
          `data: ${JSON.stringify({ type: 'error', error: msg })}\n\n`
        );
      } finally {
        if (!controllerClosed) {
          try {
            controller.close();
          } catch {
            // already closed
          }
          controllerClosed = true;
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

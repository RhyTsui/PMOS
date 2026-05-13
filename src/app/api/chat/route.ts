import { NextRequest } from 'next/server';
import { LLMClient } from 'coze-coding-dev-sdk';
import { cozeLoopTracer, SpanKind } from '@cozeloop/ai';
import {
  buildModelSdkConfig,
  getKnowledgeBaseApiKey,
  getKnowledgeBaseId,
  getKnowledgeBasesEndpoint,
  getKnowledgeSearchEndpoint,
  getModelServiceConfig,
  hasConfiguredKnowledgeCredentials,
  hasConfiguredModelCredentials,
} from '@/lib/runtime-config';
import { buildChatTraceInput, flushTrace, initTrace, truncate } from '@/lib/trace';

interface ChatRequestBody {
  message: string;
  history?: Array<{ role: string; content: string }>;
  intent?: string;
}

interface KnowledgeSearchItem {
  content?: string;
  score?: number;
  knowledge_title?: string;
  knowledge_id?: string;
}

interface KnowledgeBaseItem {
  id?: string;
}

type IntentType = 'help' | 'demand' | 'diagnosis' | 'debugging';

function detectIntent(message: string): IntentType {
  const text = message.toLowerCase();
  if (['排查', '异常', '不一致', '失败', '告警', '对不上'].some(keyword => text.includes(keyword))) {
    return 'diagnosis';
  }
  if (['联调', '调试', '测试', '验证', '扫码'].some(keyword => text.includes(keyword))) {
    return 'debugging';
  }
  if (['回传', '接入', '配置', '映射', '埋点', '需求'].some(keyword => text.includes(keyword))) {
    return 'demand';
  }
  return 'help';
}

function buildFallbackAnswer(intent: IntentType, message: string): string {
  if (intent === 'diagnosis') {
    return `当前正式问答服务未接通，我先给你一版排查框架：
1. 确认异常开始时间、影响媒体和影响事件。
2. 对齐客户端上报、服务端接收和媒体侧回传三段日志。
3. 对比 BI、媒体后台和回传明细，定位差异链路。

当前问题：${message}`;
  }

  if (intent === 'demand') {
    return `当前正式问答服务未接通，我先按需求沟通方式帮你收口：
1. 明确目标媒体、包名、事件类型和验收口径。
2. 如果是回传接入，请补充地址、环境和负责人。
3. 如果是事件映射，请补充客户端事件名和媒体事件名。

当前需求：${message}`;
  }

  if (intent === 'debugging') {
    return `当前正式问答服务未接通，我先给你联调准备清单：
1. 确认测试设备、账号权限和白名单。
2. 确认目标媒体与待验证事件。
3. 确认联调结果查看方式，例如日志、回传明细或媒体后台。

当前联调目标：${message}`;
  }

  return `当前正式问答服务未接通，我先记录你的问题并给出可执行方向：
${message}

如果你补齐模型服务配置，我可以继续给出正式分析结果。`;
}

function buildStructuredResult(intent: IntentType, summary: string): Record<string, unknown> {
  const resultTypeMap: Record<IntentType, string> = {
    help: 'help_answer',
    demand: 'demand_form',
    diagnosis: 'diagnosis_report',
    debugging: 'debugging_report',
  };

  return {
    task_id: `task-${Date.now()}`,
    result_type: resultTypeMap[intent],
    summary: summary.slice(0, 80),
    confidence: 'medium',
    structured_payload: {},
    next_actions: [],
    pending_checks: [],
    created_at: new Date().toISOString(),
    kind: intent,
  };
}

async function resolveKnowledgeBaseIds(
  modelServiceConfig: Awaited<ReturnType<typeof getModelServiceConfig>>,
): Promise<string[]> {
  const explicitId = getKnowledgeBaseId(modelServiceConfig);
  if (explicitId) {
    return [explicitId];
  }

  const response = await fetch(getKnowledgeBasesEndpoint(modelServiceConfig), {
    headers: {
      'X-API-Key': getKnowledgeBaseApiKey(modelServiceConfig),
    },
    cache: 'no-store',
  });
  const data = await response.json().catch(() => ({})) as {
    success?: boolean;
    data?: KnowledgeBaseItem[];
    error?: { message?: string };
  };

  if (!response.ok || !data.success) {
    throw new Error(data.error?.message || `获取知识库列表失败（HTTP ${response.status}）`);
  }

  return (data.data || [])
    .map(item => item.id?.trim())
    .filter((item): item is string => Boolean(item));
}

async function searchKnowledge(
  query: string,
  modelServiceConfig: Awaited<ReturnType<typeof getModelServiceConfig>>,
): Promise<{ items: KnowledgeSearchItem[]; warning?: string; resolvedCount?: number }> {
  if (!hasConfiguredKnowledgeCredentials(modelServiceConfig)) {
    return { items: [] };
  }

  const knowledgeBaseIds = await resolveKnowledgeBaseIds(modelServiceConfig);
  if (!knowledgeBaseIds.length) {
    return {
      items: [],
      warning: '当前 API Key 下没有可访问的知识库，本次未启用知识检索。',
    };
  }

  const response = await fetch(getKnowledgeSearchEndpoint(modelServiceConfig), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': getKnowledgeBaseApiKey(modelServiceConfig),
    },
    body: JSON.stringify({
      query,
      knowledge_base_ids: knowledgeBaseIds,
    }),
    cache: 'no-store',
  });
  const data = await response.json().catch(() => ({})) as {
    success?: boolean;
    data?: KnowledgeSearchItem[];
    error?: { message?: string };
  };

  if (!response.ok || !data.success) {
    return {
      items: [],
      warning: data.error?.message || `知识库检索失败（HTTP ${response.status}）`,
      resolvedCount: knowledgeBaseIds.length,
    };
  }

  return {
    items: (data.data || []).slice(0, 5),
    resolvedCount: knowledgeBaseIds.length,
  };
}

function buildSystemPrompt(knowledgeItems: KnowledgeSearchItem[]): string {
  const knowledgeSection = knowledgeItems.length
    ? `\n\n以下是可直接引用的知识库上下文：\n${knowledgeItems.map((item, index) =>
      `【知识库${index + 1}】${item.knowledge_title ? `${item.knowledge_title}\n` : ''}${item.content || ''}`).join('\n\n')}`
    : '';

  return `你是智投chat的广告技术支持助手。你要用产品语言帮助用户推进问题解答、数据排查、对接需求和自动联调。

回答要求：
1. 使用清晰 Markdown，优先输出这些区块：**结论**、**判断依据**、**下一步建议**。
2. 每个区块内容要短句化、可扫读；能列表就用列表，不要堆成长段落。
3. 如果需要用户补充信息，必须先说明缺什么、为什么需要、用户下一步怎么提供，不要只给建议。
4. 如果有知识库上下文，必须优先引用知识库信息，不要编造。
5. 不要暴露内部实现细节，不要提 SDK、接口分层、工作区等研发术语。
6. 对排查、需求、联调类问题，要给出可继续交互的下一步，而不是一次性文本结束。${knowledgeSection}`;
}

function buildThinkingStep(
  key: string,
  label: string,
  content: string,
  status: 'loading' | 'completed' | 'error',
  startedAt: number,
  input?: Record<string, unknown>,
  output?: Record<string, unknown>,
) {
  return {
    type: 'thinking_step',
    step: {
      key,
      label,
      content,
      status,
      duration_ms: Date.now() - startedAt,
      input,
      output,
    },
  };
}

export async function POST(request: NextRequest) {
  initTrace();

  const {
    message,
    history = [],
    intent: providedIntent,
  } = (await request.json()) as ChatRequestBody;

  const frontendParams = {
    history_count: history.length,
    pathname: request.headers.get('x-pathname') || '/',
    user_agent: truncate(request.headers.get('user-agent') || '', 200),
  };
  const intent: IntentType = (providedIntent as IntentType | undefined) || detectIntent(message);
  const conversationId = request.headers.get('x-conversation-id') || undefined;
  const modelServiceConfig = await getModelServiceConfig();

  if (!hasConfiguredModelCredentials(modelServiceConfig)) {
    const fallbackAnswer = buildFallbackAnswer(intent, message);
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const push = (payload: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        const startedAt = Date.now();
        push({ type: 'phase', phase: 'generating' });
        push({ type: 'route', intent, hasThinking: false, toolsUsed: [] });
        push(buildThinkingStep('agent-route', '识别处理路径', `已进入${intent}处理路径`, 'completed', startedAt, { message }, { intent }));
        push(buildThinkingStep('model-fallback', '生成兜底回复', '模型服务未配置，返回本地可执行建议', 'completed', startedAt));
        push({ type: 'error', error: '正式模型服务未配置，当前返回本地兜底结果。' });
        push({ type: 'content', content: fallbackAnswer });
        push({ type: 'done', result: buildStructuredResult(intent, fallbackAnswer) });
        controller.close();
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

  const llmClient = new LLMClient(buildModelSdkConfig(modelServiceConfig));
  const modelName = modelServiceConfig.modelName;
  const encoder = new TextEncoder();
  const startedAt = Date.now();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const push = (payload: unknown) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      try {
        let fullResponse = '';
        let toolSummary: Record<string, unknown> = {};
        let finalKnowledgeResult: Awaited<ReturnType<typeof searchKnowledge>> = { items: [] };

        await cozeLoopTracer.traceable(async (rootSpan) => {
          cozeLoopTracer.setInput(rootSpan, buildChatTraceInput(message, {
            conversation_id: conversationId,
            agent_id: `agent_xiaoqiao_${intent}`,
            frontend_params: frontendParams,
          }));

          push({ type: 'phase', phase: 'thinking' });
          const routeStartedAt = Date.now();
          push(buildThinkingStep('agent-route', '识别处理路径', '正在判断问题类型和处理方式', 'loading', routeStartedAt, { message, history_count: history.length }));

          await cozeLoopTracer.traceable(async (agentSpan) => {
            const selectedTools = hasConfiguredKnowledgeCredentials(modelServiceConfig)
              ? ['knowledge_search', 'llm']
              : ['llm'];

            cozeLoopTracer.setInput(agentSpan, {
              intent,
              question: truncate(message, 1000),
              history_count: history.length,
            });
            cozeLoopTracer.setOutput(agentSpan, {
              plan_steps: [
                '识别意图',
                '尝试知识检索',
                '结合知识上下文生成回答',
              ],
              selected_tools: selectedTools,
              agent_version: '2026-05-12.chat-trace-v2',
              status: 'success',
            });
            push(buildThinkingStep('agent-route', '识别处理路径', `已进入${intent}处理路径`, 'completed', routeStartedAt, { message, history_count: history.length }, { intent, selected_tools: selectedTools }));
          }, { name: 'xiaoqiao.zhitou.agent', type: SpanKind.Tool });

          finalKnowledgeResult = await cozeLoopTracer.traceable(async (toolSpan) => {
            const toolStartedAt = Date.now();
            push(buildThinkingStep('knowledge_context_prepare', '检索知识库', '正在准备知识库上下文', 'loading', toolStartedAt, { query: truncate(message, 1000), provider: 'weknora' }));
            push({
              type: 'tool_call',
              name: 'knowledge_context_prepare',
              query: truncate(message, 1000),
              arguments: JSON.stringify({
                query: truncate(message, 1000),
                provider: 'weknora',
                knowledge_base_id: getKnowledgeBaseId(modelServiceConfig) || '',
              }),
            });
            cozeLoopTracer.setInput(toolSpan, {
              tool_name: 'knowledge_context_prepare',
              question: truncate(message, 1000),
              provider: 'weknora',
              explicit_knowledge_base_id: getKnowledgeBaseId(modelServiceConfig) || '',
            });

            const result = await cozeLoopTracer.traceable(async (retrievalSpan) => {
              const retrievalStartedAt = Date.now();
              push(buildThinkingStep('knowledge_search', '查询知识片段', '正在从知识库检索相关内容', 'loading', retrievalStartedAt, { query: truncate(message, 1000) }));
              const retrievalResult = await searchKnowledge(message, modelServiceConfig);
              const topResults = retrievalResult.items.slice(0, 3).map(item => ({
                title: truncate(item.knowledge_title || '', 80),
                score: item.score || 0,
                content_preview: truncate(item.content || '', 160),
              }));

              cozeLoopTracer.setInput(retrievalSpan, {
                query: truncate(message, 1000),
                source: 'weknora',
                explicit_knowledge_base_id: getKnowledgeBaseId(modelServiceConfig) || '',
              });
              cozeLoopTracer.setOutput(retrievalSpan, {
                status: retrievalResult.warning ? 'partial' : 'success',
                resolved_knowledge_base_count: retrievalResult.resolvedCount || 0,
                retrieved_count: retrievalResult.items.length,
                warning: retrievalResult.warning || '',
                top_results: topResults,
              });
              push(buildThinkingStep(
                'knowledge_search',
                '查询知识片段',
                retrievalResult.warning ? '知识库检索未完整返回，继续使用可用上下文' : `已找到 ${retrievalResult.items.length} 条相关内容`,
                retrievalResult.warning ? 'error' : 'completed',
                retrievalStartedAt,
                { query: truncate(message, 1000) },
                { retrieved_count: retrievalResult.items.length, top_results: topResults, warning: retrievalResult.warning || '' },
              ));
              return retrievalResult;
            }, { name: 'xiaoqiao.zhitou.retrieval', type: SpanKind.Retriever });

            toolSummary = {
              tool_name: 'knowledge_context_prepare',
              status: result.warning ? 'partial' : 'success',
              returned_items: result.items.length,
              resolved_knowledge_base_count: result.resolvedCount || 0,
              warning: result.warning || '',
            };
            push({
              type: 'tool_result',
              name: 'knowledge_context_prepare',
              result: JSON.stringify(toolSummary),
            });
            push(buildThinkingStep(
              'knowledge_context_prepare',
              '检索知识库',
              result.warning ? '知识库上下文准备部分完成' : '知识库上下文准备完成',
              result.warning ? 'error' : 'completed',
              toolStartedAt,
              { provider: 'weknora' },
              toolSummary,
            ));
            cozeLoopTracer.setOutput(toolSpan, toolSummary);
            return result;
          }, { name: 'xiaoqiao.zhitou.tool', type: SpanKind.Tool });

          const messages = [
            { role: 'system' as const, content: buildSystemPrompt(finalKnowledgeResult.items) },
            ...history.map(item => ({ role: item.role as 'user' | 'assistant', content: item.content })),
            { role: 'user' as const, content: message },
          ];

          push({
            type: 'route',
            intent,
            hasThinking: false,
            toolsUsed: finalKnowledgeResult.items.length ? ['knowledge_search'] : [],
            knowledgeWarning: finalKnowledgeResult.warning,
            knowledgeBaseCount: finalKnowledgeResult.resolvedCount,
          });

          if (finalKnowledgeResult.warning) {
            push({ type: 'error', error: finalKnowledgeResult.warning });
          }

          await cozeLoopTracer.traceable(async (llmSpan) => {
            const llmStartedAt = Date.now();
            push(buildThinkingStep('model-generate', '生成回答', '正在组织结论、依据和下一步建议', 'loading', llmStartedAt, { model: modelName, intent, knowledge_hits: finalKnowledgeResult.items.length }));
            cozeLoopTracer.setInput(llmSpan, {
              model: modelName,
              prompt_summary: truncate(message, 600),
              model_params: {
                thinking: 'enabled',
              },
              knowledge_hits: finalKnowledgeResult.items.length,
            });

            for await (const chunk of llmClient.stream(messages, { model: modelName, thinking: 'enabled' })) {
              const content = typeof chunk.content === 'string' ? chunk.content : '';
              if (!content.trim()) {
                continue;
              }
              fullResponse += content;
              push({ type: 'content', content });
            }

            cozeLoopTracer.setOutput(llmSpan, {
              status: 'success',
              model_name: modelName,
              token_usage: {
                input_tokens: 0,
                output_tokens: 0,
              },
              output_summary: truncate(fullResponse, 600),
              output_length: fullResponse.length,
            });
            push(buildThinkingStep('model-generate', '生成回答', '回答已生成', 'completed', llmStartedAt, { model: modelName, intent }, { output_length: fullResponse.length, knowledge_hits: finalKnowledgeResult.items.length }));
          }, { name: 'xiaoqiao.zhitou.llm', type: SpanKind.Model });

          cozeLoopTracer.setOutput(rootSpan, {
            user_question: truncate(message, 2000),
            frontend_params: frontendParams,
            final_answer: truncate(fullResponse, 8000),
            status: 'success',
            total_latency_ms: Date.now() - startedAt,
            error_summary: '',
            tool_summary: toolSummary,
            retrieval_count: finalKnowledgeResult.items.length,
            span_plan: [
              'xiaoqiao.zhitou.chat',
              'xiaoqiao.zhitou.agent',
              'xiaoqiao.zhitou.tool',
              'xiaoqiao.zhitou.retrieval',
              'xiaoqiao.zhitou.llm',
            ],
          });
        }, { name: 'xiaoqiao.zhitou.chat', type: SpanKind.Tool });

        const knowledgeBaseAddress = modelServiceConfig.knowledgeBaseUrl || modelServiceConfig.baseUrl || '';
        const sourceRefs = finalKnowledgeResult.items.slice(0, 5).map((item, index) => ({
          title: item.knowledge_title || `知识库片段 ${index + 1}`,
          source: item.knowledge_id || getKnowledgeBaseId(modelServiceConfig) || '自动检索范围',
          url: knowledgeBaseAddress,
        }));
        const result = buildStructuredResult(intent, fullResponse || '已完成处理');
        result.structured_payload = {
          source_refs: sourceRefs,
          knowledge_base: {
            provider: 'WeKnora',
            address: knowledgeBaseAddress,
            dataset: getKnowledgeBaseId(modelServiceConfig) || '',
            resolvedCount: finalKnowledgeResult.resolvedCount || 0,
          },
        };

        push({
          type: 'done',
          result,
          metadata: {
            source_refs: sourceRefs,
            knowledge_base: {
              provider: 'WeKnora',
              address: knowledgeBaseAddress,
              dataset: getKnowledgeBaseId(modelServiceConfig) || '',
              resolvedCount: finalKnowledgeResult.resolvedCount || 0,
            },
          },
        });
      } catch (error: unknown) {
        const messageText = error instanceof Error ? error.message : String(error);
        const isAuthError = /401|api key|authorization|bearer/i.test(messageText);
        const fallbackAnswer = isAuthError
          ? '模型服务认证失败，请在配置管理服务里检查 API Key、服务地址、模型地址和模型名称。'
          : `处理失败：${messageText}`;

        push({ type: 'error', error: fallbackAnswer });
        push({ type: 'done', result: buildStructuredResult(intent, fallbackAnswer) });
      } finally {
        closed = true;
        controller.close();
        flushTrace();
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

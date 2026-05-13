'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useAgent } from './useAgent';
import { xiaoqiaoApi } from '@/lib/api';
import type {
  CallChainData,
  Conversation,
  IntentType,
  AgentType,
  Message,
  MessageType,
} from '@/types';

let messageCounter = 0;
function nextMessageId(): string {
  messageCounter += 1;
  return `msg_${messageCounter}`;
}

function intentToAgent(intent: IntentType): AgentType {
  const mapping: Partial<Record<IntentType, AgentType>> = {
    help: 'help',
    demand: 'demand',
    diagnosis: 'diagnosis',
    debugging: 'debugging',
    monitor: 'monitoring',
    'material-analysis': 'material',
    forecast: 'prediction',
    general: 'hub',
  };
  return mapping[intent] ?? 'hub';
}

function detectIntent(content: string): {
  intent_type: IntentType;
  is_business_related: boolean;
  workflow_level: 'light' | 'heavy';
} {
  const lower = content.toLowerCase();

  if (/(新增媒体|新媒体|媒体对接|接入媒体|对接文档|监测链接|需求表单|需求池|回传对接)/.test(lower)) {
    return { intent_type: 'demand', is_business_related: true, workflow_level: 'heavy' };
  }
  if (/(立即联调|开始联调|扫码联调|联调地址|联调文档|巨量|wuyanlan@dobest\.com)/.test(lower)) {
    return { intent_type: 'debugging', is_business_related: true, workflow_level: 'heavy' };
  }

  if (/(差距|不一致|异常|对不上|缺失|gap|排查|问题|为什么|偏差)/.test(lower)) {
    return { intent_type: 'diagnosis', is_business_related: true, workflow_level: 'heavy' };
  }
  if (/(联调|测试|回传|调试|debug|验证|准备)/.test(lower)) {
    return { intent_type: 'debugging', is_business_related: true, workflow_level: 'heavy' };
  }
  if (/(需求|接入|对接|新媒|配置|事件映射|埋点)/.test(lower)) {
    return { intent_type: 'demand', is_business_related: true, workflow_level: 'heavy' };
  }
  if (/(什么|怎么|如何|哪个系统|在哪|口径|指标|解释|说明)/.test(lower)) {
    return { intent_type: 'help', is_business_related: true, workflow_level: 'light' };
  }
  if (/(监控|延迟|上报|归因监控|回推)/.test(lower)) {
    return { intent_type: 'monitor', is_business_related: true, workflow_level: 'light' };
  }
  if (/(预测|roi|ltv|回本|测算)/.test(lower)) {
    return { intent_type: 'forecast', is_business_related: true, workflow_level: 'light' };
  }

  return { intent_type: 'general', is_business_related: false, workflow_level: 'light' };
}

function isMediaDemand(content: string): boolean {
  return /(新增媒体|新媒体|媒体对接|接入媒体|对接文档|监测链接|回传对接|318\s*媒体|318媒体)/i.test(content);
}

function isLegacyMediaDebug(content: string): boolean {
  return /(巨量|穿山甲|抖音|今日头条|小米|网易有道|UC头条).*(联调|测试|验证)|(?:联调|测试|验证).*(巨量|穿山甲|抖音|今日头条|小米|网易有道|UC头条)/i.test(content);
}

function buildMediaDemandMessage(convId: string, content: string): Message {
  const id = nextMessageId();
  return {
    id,
    message_id: id,
    conversation_id: convId,
    role: 'assistant',
    message_type: 'assistant_reply' as MessageType,
    created_at: new Date().toISOString(),
    timestamp: Date.now(),
    agent: 'demand',
    intent_type: 'demand',
    content: [
      '## 新增媒体对接需要先完成需求表单',
      '',
      '我已把这次输入识别为新增媒体对接需求。接下来不直接给建议，需要先完成必填依赖校验。',
      '',
      '### 必填依赖',
      '- 媒体名称与平台归属',
      '- 对接文档或回传说明',
      '- 监测链接参数规则',
      '- 可回传事件类型',
      '- 回传验收方式',
      '',
      '表单提交后会先做校验：通过则提示可以立即去后台创建监测链接；如果需要特殊处理，会生成需求并记录到需求池，链接可先行创建，后续联调时间会继续通知。',
    ].join('\n'),
    thinking_steps: [
      { label: '识别需求', content: '判断为新增媒体对接，进入需求 Agent 必经流程。', status: 'completed' },
      { label: '依赖校验', content: '需要先收齐对接文档、监测链接规则、事件清单和验收方式。', status: 'completed' },
      { label: '下一步', content: '生成结构化表单，支持保存到代办并从右侧继续处理。', status: 'completed' },
    ],
    metadata: {
      workflow_card: {
        type: 'media_onboarding',
        status: 'missing_dependencies',
        title: '新增媒体对接',
        sourceText: content,
      },
      source_refs: [
        {
          title: '媒体对接需求流程',
          source: '小乔需求池模板',
          url: 'weknora://knowledge-base/media-onboarding-requirement-flow',
        },
      ],
      knowledge_base: {
        provider: 'WeKnora',
        address: 'weknora://knowledge-base/media-onboarding-requirement-flow',
        dataset: 'media-onboarding',
      },
    },
  };
}

function buildLegacyDebugMessage(convId: string): Message {
  const id = nextMessageId();
  return {
    id,
    message_id: id,
    conversation_id: convId,
    role: 'assistant',
    message_type: 'assistant_reply' as MessageType,
    created_at: new Date().toISOString(),
    timestamp: Date.now(),
    agent: 'debugging',
    intent_type: 'debugging',
    content: [
      '## 已进入媒体联调准备',
      '',
      '该媒体已有对接能力，可以继续调用联调 Agent。',
      '',
      '### 开始前请确认',
      '- 如果是巨量，请先把应用共享到默认账号 `wuyanlan@dobest.com`',
      '- 如果是新媒体，请补充联调地址和联调文档',
      '- 请确认要验证的事件和回传查看位置',
      '',
      '确认后我会继续发起联调流程。',
    ].join('\n'),
    thinking_steps: [
      { label: '识别媒体', content: '判断为已有媒体联调场景。', status: 'completed' },
      { label: '检查准备项', content: '需要账号共享、联调地址、文档和验证事件。', status: 'completed' },
    ],
    metadata: {
      workflow_card: {
        type: 'legacy_media_debug',
        status: 'ready_to_debug',
        title: '媒体联调准备',
      },
      source_refs: [
        {
          title: '联调准备清单',
          source: '小乔联调知识库',
          url: 'weknora://knowledge-base/debugging-prerequisites',
        },
      ],
      knowledge_base: {
        provider: 'WeKnora',
        address: 'weknora://knowledge-base/debugging-prerequisites',
        dataset: 'debugging',
      },
    },
  };
}

export interface ToolCallRecord {
  name: string;
  query: string;
  result?: string;
  status: 'calling' | 'done' | 'error';
}

export interface AgentMeta {
  thinking?: string;
  toolCalls?: ToolCallRecord[];
  phase?: 'thinking' | 'tool_calling' | 'generating' | 'done';
}

export function useConversation() {
  const {
    currentAgent,
    setCurrentAgent,
    setConversationMode,
    missingFields,
  } = useAgent();

  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [agentMeta, setAgentMeta] = useState<Map<string, AgentMeta>>(new Map());
  const [currentRouting, setCurrentRouting] = useState<{
    intent_type: IntentType;
    is_business_related: boolean;
  } | null>(null);
  const [currentResult, setCurrentResult] = useState<Record<string, unknown> | null>(null);
  const [callChainData, setCallChainData] = useState<CallChainData | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const refreshConversations = useCallback(async () => {
    const list = await xiaoqiaoApi.getConversations();
    setConversations(list);
    if (!activeConversationId && list[0]) {
      setActiveConversationId(list[0].conversation_id);
    }
    return list;
  }, [activeConversationId]);

  const loadMessages = useCallback(async (conversationId: string) => {
    const nextMessages = await xiaoqiaoApi.getMessages(conversationId);
    setMessages(nextMessages);
  }, []);

  useEffect(() => {
    void refreshConversations();
  }, [refreshConversations]);

  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }
    void loadMessages(activeConversationId);
  }, [activeConversationId, loadMessages]);

  const ensureConversation = useCallback(async (content: string) => {
    if (activeConversationId) {
      return activeConversationId;
    }
    const conversation = await xiaoqiaoApi.createConversation({ title: content });
    setConversations(prev => [conversation, ...prev]);
    setActiveConversationId(conversation.conversation_id);
    return conversation.conversation_id;
  }, [activeConversationId]);

  const createConversation = useCallback(async (title?: string) => {
    const conversation = await xiaoqiaoApi.createConversation({ title: title || '新对话' });
    setConversations(prev => [conversation, ...prev]);
    setActiveConversationId(conversation.conversation_id);
    setMessages([]);
    setCurrentResult(null);
    setCallChainData(null);
    void refreshConversations();
    return conversation;
  }, [refreshConversations]);

  const selectConversation = useCallback((conversationId: string) => {
    setActiveConversationId(conversationId);
    setCurrentResult(null);
    setCallChainData(null);
  }, []);

  const renameConversation = useCallback(async (conversationId: string, title: string) => {
    const next = await xiaoqiaoApi.updateConversation(conversationId, { title });
    setConversations(prev => prev.map(item => item.conversation_id === conversationId ? next : item));
  }, []);

  const deleteConversation = useCallback(async (conversationId: string) => {
    await xiaoqiaoApi.deleteConversation(conversationId);
    setConversations(prev => {
      const next = prev.filter(item => item.conversation_id !== conversationId);
      if (activeConversationId === conversationId) {
        setActiveConversationId(next[0]?.conversation_id || null);
        setMessages([]);
        setCurrentResult(null);
        setCallChainData(null);
      }
      return next;
    });
  }, [activeConversationId]);

  const sendMessage = useCallback((content: string, targetConversationId?: string) => {
    const trimmed = content.trim();
    if (!trimmed) return;

    void (async () => {
      const routing = detectIntent(trimmed);
      let convId = targetConversationId || await ensureConversation(trimmed);
      let userMessage: Message;
      try {
        userMessage = await xiaoqiaoApi.sendMessage(convId, {
          content: trimmed,
          role: 'user',
          message_type: 'user_input',
        });
      } catch (error) {
        const missingConversation = error instanceof Error && /404|not found/i.test(error.message);
        if (!missingConversation) throw error;
        const conversation = await xiaoqiaoApi.createConversation({ title: '新对话' });
        convId = conversation.conversation_id;
        setConversations(prev => [conversation, ...prev.filter(item => item.conversation_id !== conversation.conversation_id)]);
        setActiveConversationId(conversation.conversation_id);
        userMessage = await xiaoqiaoApi.sendMessage(convId, {
          content: trimmed,
          role: 'user',
          message_type: 'user_input',
        });
      }

      setCurrentRouting(routing);
      if (routing.is_business_related) {
        setCurrentAgent(intentToAgent(routing.intent_type));
      }

      setMessages(prev => [...prev, userMessage]);
      const currentConversation = conversations.find(item => item.conversation_id === convId);
      const titleNeedsModel =
        messages.length === 0 &&
        (!currentConversation ||
          currentConversation.title === trimmed ||
          currentConversation.title === '新对话' ||
          currentConversation.title === '鏂板璇?');
      if (titleNeedsModel) {
        void (async () => {
          try {
            const { title } = await xiaoqiaoApi.generateConversationTitle(convId, {
              message: trimmed,
              history: messages.map(item => ({ role: item.role, content: item.content })),
            });
            const nextTitle = title.trim();
            if (!nextTitle || nextTitle === currentConversation?.title) return;
            const updated = await xiaoqiaoApi.updateConversation(convId, { title: nextTitle });
            setConversations(prev => prev.map(item => item.conversation_id === convId ? updated : item));
          } catch {
            // 标题生成不阻塞会话回复。
          }
        })();
      }
      await refreshConversations();

      if (isMediaDemand(trimmed) || isLegacyMediaDebug(trimmed)) {
        const flowMessage = isMediaDemand(trimmed)
          ? buildMediaDemandMessage(convId, trimmed)
          : buildLegacyDebugMessage(convId);
        setMessages(prev => [...prev, flowMessage]);
        setCurrentAgent(flowMessage.agent || 'demand');
        setConversationMode('heavy-workflow');
        setCurrentResult({
          task_id: `task-${Date.now()}`,
          result_type: isMediaDemand(trimmed) ? 'demand_form' : 'debugging_report',
          summary: isMediaDemand(trimmed)
            ? '已生成新增媒体对接需求表单，等待补齐依赖信息。'
            : '已进入媒体联调准备，等待确认联调资料。',
          confidence: 'high',
          structured_payload: flowMessage.metadata,
          next_actions: isMediaDemand(trimmed)
            ? ['打开结构化表单', '记录到代办', '补齐对接文档']
            : ['确认是否立即联调', '补充联调地址', '确认账号共享'],
          pending_checks: isMediaDemand(trimmed)
            ? ['对接文档', '监测链接参数规则', '事件清单', '验收方式']
            : ['账号共享', '联调地址', '联调文档', '验证事件'],
          created_at: new Date().toISOString(),
          kind: flowMessage.intent_type,
        });
        setIsTyping(false);
        return;
      }

      const assistantId = nextMessageId();
      const assistantMessage: Message = {
        id: assistantId,
        message_id: assistantId,
        conversation_id: convId,
        role: 'assistant',
        content: '',
        message_type: 'assistant_reply' as MessageType,
        created_at: new Date().toISOString(),
        timestamp: Date.now(),
        agent: routing.is_business_related ? intentToAgent(routing.intent_type) : undefined,
        intent_type: routing.is_business_related ? routing.intent_type : undefined,
        thinking: '',
        tool_calls: [],
      };

      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(true);
      setAgentMeta(prev => {
        const next = new Map(prev);
        next.set(assistantId, { phase: 'thinking', toolCalls: [] });
        return next;
      });

      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      const history = [...messages, userMessage].map(item => ({
        role: item.role,
        content: item.content,
      }));

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-conversation-id': convId,
          },
          body: JSON.stringify({
            message: trimmed,
            history,
            intent: routing.intent_type,
          }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let accumulated = '';
        let buffer = '';
        let currentThinking = '';
        let currentToolCalls: ToolCallRecord[] = [];
        let currentThinkingSteps: NonNullable<Message['thinking_steps']> = [];
        let responseMetadata: Record<string, unknown> | undefined;
        let responseResult: Record<string, unknown> | undefined;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'thinking') {
                currentThinking += data.content;
                setMessages(prev => prev.map(item => item.id === assistantId
                  ? { ...item, thinking: currentThinking }
                  : item));
                setAgentMeta(prev => {
                  const next = new Map(prev);
                  next.set(assistantId, {
                    ...next.get(assistantId),
                    phase: 'thinking',
                    thinking: currentThinking,
                  });
                  return next;
                });
              } else if (data.type === 'thinking_step' && data.step) {
                const step = data.step as NonNullable<Message['thinking_steps']>[number];
                currentThinkingSteps = [
                  ...currentThinkingSteps.filter((item) => (item.key || item.label) !== (step.key || step.label)),
                  step,
                ];
                setMessages(prev => prev.map(item => item.id === assistantId
                  ? { ...item, thinking_steps: currentThinkingSteps }
                  : item));
              } else if (data.type === 'tool_call') {
                currentToolCalls = [...currentToolCalls, {
                  name: data.name,
                  query: data.query,
                  result: data.arguments,
                  status: 'calling',
                }];
                setMessages(prev => prev.map(item => item.id === assistantId
                  ? { ...item, tool_calls: currentToolCalls }
                  : item));
                setAgentMeta(prev => {
                  const next = new Map(prev);
                  next.set(assistantId, {
                    ...next.get(assistantId),
                    phase: 'tool_calling',
                    toolCalls: currentToolCalls,
                  });
                  return next;
                });
              } else if (data.type === 'tool_result') {
                currentToolCalls = currentToolCalls.map(item =>
                  item.name === data.name && item.status === 'calling'
                    ? { ...item, result: data.result, status: 'done' }
                    : item,
                );
                setMessages(prev => prev.map(item => item.id === assistantId
                  ? { ...item, tool_calls: currentToolCalls }
                  : item));
                setAgentMeta(prev => {
                  const next = new Map(prev);
                  next.set(assistantId, {
                    ...next.get(assistantId),
                    toolCalls: currentToolCalls,
                  });
                  return next;
                });
              } else if (data.type === 'phase') {
                setAgentMeta(prev => {
                  const next = new Map(prev);
                  next.set(assistantId, {
                    ...next.get(assistantId),
                    phase: data.phase,
                  });
                  return next;
                });
              } else if (data.type === 'content') {
                accumulated += data.content;
                setMessages(prev => prev.map(item => item.id === assistantId ? { ...item, content: accumulated } : item));
              } else if (data.type === 'route') {
                if (data.intent && data.intent !== 'general') {
                  setCurrentAgent(intentToAgent(data.intent as IntentType));
                }
              } else if (data.type === 'error') {
                setMessages(prev => prev.map(item => item.id === assistantId
                  ? { ...item, content: data.error || '生成回复时出现错误，请稍后重试。' }
                  : item));
              } else if (data.type === 'done') {
                if (data.metadata && typeof data.metadata === 'object') {
                  responseMetadata = data.metadata as Record<string, unknown>;
                  setMessages(prev => prev.map(item => item.id === assistantId
                    ? { ...item, metadata: responseMetadata }
                    : item));
                }
                if (data.result) {
                  responseResult = data.result as Record<string, unknown>;
                  setCurrentResult(data.result);
                  setMessages(prev => prev.map(item => item.id === assistantId
                    ? { ...item, metadata: { ...(item.metadata || {}), workflow_result: responseResult } }
                    : item));
                }
                setAgentMeta(prev => {
                  const next = new Map(prev);
                  next.set(assistantId, {
                    ...next.get(assistantId),
                    phase: 'done',
                  });
                  return next;
                });
              } else if (data.type === 'trace_data' && data.data) {
                setCallChainData(data.data as CallChainData);
              }
            } catch {
              // ignore malformed sse
            }
          }
        }

        const persistedAssistant = await xiaoqiaoApi.sendMessage(convId, {
          content: accumulated || '未生成有效回复',
          role: 'assistant',
          message_type: 'assistant_reply',
        });
        setMessages(prev => prev.map(item => item.id === assistantId
          ? {
            ...persistedAssistant,
            thinking: currentThinking || undefined,
            thinking_steps: currentThinkingSteps.length > 0 ? currentThinkingSteps : currentThinking ? undefined : [
              { label: '识别问题', content: '判断用户意图并选择处理流程。', status: 'completed' },
              { label: '检索资料', content: currentToolCalls.length > 0 ? '已尝试检索知识库并整理引用来源。' : '当前未返回可用工具检索结果。', status: 'completed' },
              { label: '生成回复', content: '根据可用上下文输出结构化回复。', status: 'completed' },
            ],
            tool_calls: currentToolCalls.length > 0 ? currentToolCalls : undefined,
            metadata: {
              ...(responseMetadata || {}),
              ...(responseResult ? { workflow_result: responseResult } : {}),
            },
          }
          : item));
        await refreshConversations();
        setIsTyping(false);

        if (routing.is_business_related) {
          setConversationMode(routing.workflow_level === 'heavy' ? 'heavy-workflow' : 'light-workflow');

          if (routing.workflow_level === 'heavy' && missingFields.length > 0) {
            const clarificationId = nextMessageId();
            setTimeout(() => {
              const clarificationMessage: Message = {
                id: clarificationId,
                message_id: clarificationId,
                conversation_id: convId,
                role: 'assistant',
                content: `为了更好地处理本次问题，还需要补充以下信息：\n${missingFields.slice(0, 2).map(field => `- ${field.field_label}：${field.suggested_question}`).join('\n')}`,
                message_type: 'clarification' as MessageType,
                created_at: new Date().toISOString(),
                timestamp: Date.now(),
              };
              setMessages(prev => [...prev, clarificationMessage]);
            }, 600);
          }
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        setIsTyping(false);
        setMessages(prev => prev.map(item => item.id === assistantId
          ? { ...item, content: '抱歉，连接出现问题，请稍后重试。' }
          : item));
      }
    })();
  }, [conversations, messages, ensureConversation, missingFields, refreshConversations, setConversationMode, setCurrentAgent]);

  const deleteMessage = useCallback((messageId: string) => {
    setMessages(prev => prev.filter(item => item.id !== messageId));
  }, []);

  const cancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsTyping(false);
  }, []);

  return {
    conversations,
    activeConversationId,
    activeConversationTitle: conversations.find(item => item.conversation_id === activeConversationId)?.title || '智投chat对话',
    messages,
    isTyping,
    currentRouting,
    currentAgent,
    currentResult,
    callChainData,
    sendMessage,
    createConversation,
    selectConversation,
    renameConversation,
    deleteConversation,
    refreshConversations,
    deleteMessage,
    cancelStream,
    agentMeta,
  };
}

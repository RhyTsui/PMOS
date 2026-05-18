'use client';

import { useState, useCallback, useRef } from 'react';
import { useAgent } from './useAgent';
import type {
  Message,
  IntentType,
  AgentType,
  MessageType,
} from '@/types';

let messageCounter = 0;
function nextMessageId(): string {
  messageCounter += 1;
  return `msg_${messageCounter}`;
}

/** Map IntentType to AgentType */
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

/** Client-side intent detection (used for UI routing before LLM responds) */
function detectIntent(content: string): {
  intent_type: IntentType;
  is_business_related: boolean;
  workflow_level: 'light' | 'heavy';
} {
  const lower = content.toLowerCase();

  if (/(少|差距|不一致|异常|对不上|缺失|gap|排查|问题|为什么|偏差)/.test(lower)) {
    return { intent_type: 'diagnosis', is_business_related: true, workflow_level: 'heavy' };
  }
  if (/(联调|测试|回传|调试|debug|验证|准备)/.test(lower)) {
    return { intent_type: 'debugging', is_business_related: true, workflow_level: 'heavy' };
  }
  if (/(需求|接入|对接|新媒|配置|事件映射|埋点)/.test(lower)) {
    return { intent_type: 'demand', is_business_related: true, workflow_level: 'heavy' };
  }
  if (/(什么意思|怎么|如何|哪个系统|在哪|口径|指标|解释|说明)/.test(lower)) {
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

/** Tool call record displayed in message */
export interface ToolCallRecord {
  name: string;
  query: string;
  result?: string;
  status: 'calling' | 'done' | 'error';
}

/** Extended message metadata for agent workflow */
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
  const [isTyping, setIsTyping] = useState(false);
  const [agentMeta, setAgentMeta] = useState<Map<string, AgentMeta>>(new Map());
  const [currentRouting, setCurrentRouting] = useState<{
    intent_type: IntentType;
    is_business_related: boolean;
  } | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback((content: string) => {
    if (!content.trim()) return;

    const convId = 'conv_001';

    // ── 1. Add user message ────────────────────────────────
    const userMessage: Message = {
      id: nextMessageId(),
      message_id: nextMessageId(),
      conversation_id: convId,
      role: 'user',
      content: content.trim(),
      message_type: 'user_input',
      created_at: new Date().toISOString(),
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMessage]);

    // ── 2. Client-side routing for immediate UI update ─────
    const routing = detectIntent(content);
    setCurrentRouting(routing);

    if (routing.is_business_related) {
      setCurrentAgent(intentToAgent(routing.intent_type));
    }

    // ── 3. Create placeholder assistant message for streaming ──
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
    };
    setMessages(prev => [...prev, assistantMessage]);
    setIsTyping(true);

    // Initialize agent meta
    const meta = new Map(agentMeta);
    meta.set(assistantId, { phase: 'thinking', toolCalls: [] });
    setAgentMeta(meta);

    // ── 4. Call /api/chat with SSE streaming ───────────────
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Build conversation history from existing messages
    const conversationHistory = messages.map(m => ({
      role: m.role,
      content: m.content,
    }));

    (async () => {
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: content.trim(),
            conversationHistory,
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

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Parse SSE data lines
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.type === 'thinking') {
                  // Accumulate thinking content
                  currentThinking += data.content;
                  const newMeta = new Map(agentMeta);
                  newMeta.set(assistantId, {
                    ...newMeta.get(assistantId),
                    phase: 'thinking',
                    thinking: currentThinking,
                  });
                  setAgentMeta(newMeta);
                } else if (data.type === 'tool_call') {
                  // Add tool call record
                  const tc: ToolCallRecord = {
                    name: data.name,
                    query: data.query,
                    status: 'calling',
                  };
                  currentToolCalls = [...currentToolCalls, tc];
                  const newMeta = new Map(agentMeta);
                  newMeta.set(assistantId, {
                    ...newMeta.get(assistantId),
                    phase: 'tool_calling',
                    toolCalls: currentToolCalls,
                  });
                  setAgentMeta(newMeta);
                } else if (data.type === 'tool_result') {
                  // Update tool call with result
                  currentToolCalls = currentToolCalls.map(tc =>
                    tc.name === data.name && tc.status === 'calling'
                      ? { ...tc, result: data.result, status: 'done' as const }
                      : tc
                  );
                  const newMeta = new Map(agentMeta);
                  newMeta.set(assistantId, {
                    ...newMeta.get(assistantId),
                    toolCalls: currentToolCalls,
                  });
                  setAgentMeta(newMeta);
                } else if (data.type === 'phase') {
                  // Update phase
                  const newMeta = new Map(agentMeta);
                  newMeta.set(assistantId, {
                    ...newMeta.get(assistantId),
                    phase: data.phase,
                  });
                  setAgentMeta(newMeta);
                } else if (data.type === 'content') {
                  accumulated += data.content;
                  // Update the assistant message with accumulated content
                  setMessages(prev =>
                    prev.map(m =>
                      m.id === assistantId
                        ? { ...m, content: accumulated }
                        : m
                    )
                  );
                } else if (data.type === 'route') {
                  // Server-side routing confirmation
                  if (data.intent && data.intent !== 'general') {
                    setCurrentAgent(intentToAgent(data.intent as IntentType));
                  }
                } else if (data.type === 'error') {
                  setMessages(prev =>
                    prev.map(m =>
                      m.id === assistantId
                        ? { ...m, content: data.error || '抱歉，生成回复时出现错误，请重试。' }
                        : m
                    )
                  );
                } else if (data.type === 'done') {
                  // Stream complete
                  const newMeta = new Map(agentMeta);
                  newMeta.set(assistantId, {
                    ...newMeta.get(assistantId),
                    phase: 'done',
                  });
                  setAgentMeta(newMeta);
                }
              } catch {
                // Ignore malformed JSON in SSE
              }
            }
          }
        }

        // ── 5. Post-stream: update workflow state ──────────
        setIsTyping(false);

        if (routing.is_business_related) {
          if (routing.workflow_level === 'heavy') {
            setConversationMode('heavy-workflow');
          } else {
            setConversationMode('light-workflow');
          }

          // If missing fields exist for heavy workflow, add clarification
          if (routing.workflow_level === 'heavy' && missingFields.length > 0) {
            const clarificationId = nextMessageId();
            setTimeout(() => {
              const clarificationMessage: Message = {
                id: clarificationId,
                message_id: clarificationId,
                conversation_id: convId,
                role: 'assistant',
                content: `为了更好地处理您的请求，还需要补充以下信息：\n${missingFields.slice(0, 2).map(f => `- ${f.field_label}（${f.suggested_question}）`).join('\n')}`,
                message_type: 'clarification' as MessageType,
                created_at: new Date().toISOString(),
                timestamp: Date.now(),
              };
              setMessages(prev => [...prev, clarificationMessage]);
            }, 600);
          }
        }
      } catch (error) {
        // AbortError is expected when user cancels
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        console.error('[Chat API Error]', error);
        setIsTyping(false);

        // Fallback: show error message
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantId
              ? { ...m, content: '抱歉，连接出现问题，请重试。' }
              : m
          )
        );
      }
    })();
  }, [messages, setCurrentAgent, setConversationMode, missingFields, agentMeta]);

  const cancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsTyping(false);
  }, []);

  return {
    messages,
    isTyping,
    currentRouting,
    currentAgent,
    sendMessage,
    cancelStream,
    agentMeta,
  };
}

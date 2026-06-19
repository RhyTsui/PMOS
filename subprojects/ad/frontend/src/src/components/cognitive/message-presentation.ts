import type { SemanticResultContract, ScreenType } from '@/contracts/semantic/semantic-result-contract';
import { composeMessagePresentationRegions } from '@/contracts/presentation/message-contract-field-bindings';
import type { Message, MessageContract } from '@/types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function extractWorkflowResult(message: Message): Record<string, unknown> | null {
  const metadata = isRecord(message.metadata) ? message.metadata : {};
  return isRecord(metadata.workflow_result) ? metadata.workflow_result : null;
}

export function extractSemanticResult(message: Message): SemanticResultContract | null {
  const metadata = isRecord(message.metadata) ? message.metadata : {};
  const workflowResult = extractWorkflowResult(message);
  const direct = isRecord(metadata.semantic_result)
    ? metadata.semantic_result
    : workflowResult && isRecord(workflowResult.semantic_result)
      ? workflowResult.semantic_result
      : isRecord(metadata.message_contract) && isRecord(metadata.message_contract.semantic_result)
        ? metadata.message_contract.semantic_result
        : null;

  return direct as SemanticResultContract | null;
}

export function extractMessageContract(message: Message): MessageContract | null {
  const metadata = isRecord(message.metadata) ? message.metadata : {};
  const workflowResult = extractWorkflowResult(message);
  const direct = isRecord(metadata.message_contract)
    ? metadata.message_contract as unknown as MessageContract
    : workflowResult && isRecord(workflowResult.message_contract)
      ? workflowResult.message_contract as unknown as MessageContract
      : null;

  return direct || null;
}

function inferScreenType(message: Message, contract?: MessageContract | null, semanticResult?: SemanticResultContract | null): ScreenType {
  if (semanticResult?.screenType) return semanticResult.screenType;
  if (message.intent_type === 'report_query' || contract?.visualizations?.charts?.length || contract?.visualizations?.tables?.length) {
    return 'report-result';
  }
  if (message.intent_type === 'diagnosis' || message.agent === 'diagnosis') return 'analysis-result';
  if (message.intent_type === 'debugging' || message.agent === 'debugging') return 'workflow-result';
  return 'conversation-answer';
}

function safeDate(value?: string): string {
  if (typeof value === 'string' && value.trim()) return value;
  return new Date().toISOString();
}

export function buildMessagePresentationResult(input: {
  message: Message;
  messageContract: MessageContract | null;
  semanticResult?: SemanticResultContract | null;
}): SemanticResultContract | null {
  const { message, messageContract, semanticResult } = input;
  if (!messageContract && !semanticResult) return null;

  const normalizedSemantic = semanticResult && semanticResult.contractType === 'semantic-result'
    ? semanticResult
    : null;
  const presentationComposition = composeMessagePresentationRegions({
    messageContract,
    semanticRegions: normalizedSemantic?.regions || [],
  });

  if (!presentationComposition.regions.length && !normalizedSemantic) return null;

  return {
    contractType: 'semantic-result',
    version: normalizedSemantic?.version || '1.0.0',
    resultId: normalizedSemantic?.resultId || `presentation-${message.message_id || message.id}`,
    conversationId: normalizedSemantic?.conversationId || message.conversation_id,
    messageId: normalizedSemantic?.messageId || message.message_id,
    screenType: normalizedSemantic?.screenType || inferScreenType(message, messageContract, normalizedSemantic),
    title: normalizedSemantic?.title || '已整理回答',
    description: normalizedSemantic?.description || '以下内容已按结果、数据和下一步整理。',
    createdAt: normalizedSemantic?.createdAt || safeDate(message.created_at),
    producer: normalizedSemantic?.producer || {
      kind: message.agent ? 'agent' : 'model',
      name: message.agent || message.intent_type,
    },
    regions: presentationComposition.regions,
    actions: normalizedSemantic?.actions || undefined,
    evidenceRefs: normalizedSemantic?.evidenceRefs || undefined,
    sourceRefs: normalizedSemantic?.sourceRefs || undefined,
    runtimeRefs: normalizedSemantic?.runtimeRefs || undefined,
    layoutHints: normalizedSemantic?.layoutHints || undefined,
    visibility: normalizedSemantic?.visibility || undefined,
    permission: normalizedSemantic?.permission || undefined,
    fallback: normalizedSemantic?.fallback || undefined,
    freshness: normalizedSemantic?.freshness || undefined,
    confidence: normalizedSemantic?.confidence || undefined,
    metadata: {
      ...(normalizedSemantic?.metadata || {}),
      source: 'message-presentation',
      messageId: message.message_id,
      conversationId: message.conversation_id,
      hasMessageContract: Boolean(messageContract),
      hasSemanticResult: Boolean(normalizedSemantic),
      fieldStatuses: presentationComposition.fieldStatuses,
    },
  };
}

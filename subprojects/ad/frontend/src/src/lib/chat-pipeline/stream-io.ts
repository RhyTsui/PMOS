/**
 * StreamIO Factory
 *
 * 构造 StreamIO 对象，封装 SSE 输出操作。
 * 将 route.ts 内的闭包函数（push / pushEvent / close / pushRuntimeState / endPlanningAndStartExecution）
 * 以及 output guardrail、evidence ledger 管理统一封装。
 */

import type { AgentProcessEvent, RuntimeStage, RuntimeState } from '@/types';
import type { StreamIO } from './pipeline-types';
import type { EvidenceLedger } from '@/lib/evidence-ledger';
import { sse } from '@/lib/chat-runtime/sse';
import { createRuntimeState } from '@/lib/chat-runtime/runtime-state';
import { serializeLedgerForMetadata } from '@/lib/evidence-ledger';
import { OutputGuardrailImpl } from '@/lib/guardrails/output-guardrail';

export interface CreateStreamIOParams {
  controller: ReadableStreamDefaultController;
  startedAt: string;
  getEvidenceLedger: () => EvidenceLedger;
  endPlanningAndStartExecution: () => Promise<void>;
}

/**
 * 创建 StreamIO 实例。
 *
 * 返回的 StreamIO 封装了 SSE 推送、心跳、output guardrail、process events 收集等功能。
 */
export function createStreamIO(params: CreateStreamIOParams): StreamIO & {
  /** 停止心跳（在 finally 中调用）。 */
  stopHeartbeat: () => void;
} {
  const { controller, startedAt, getEvidenceLedger, endPlanningAndStartExecution } = params;
  const encoder = new TextEncoder();
  const processEvents: AgentProcessEvent[] = [];
  let closed = false;
  let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  const stopHeartbeat = () => {
    if (!heartbeatInterval) return;
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  };

  const push = (payload: Record<string, unknown>): boolean => {
    if (closed) return false;
    try {
      // Stage 2: Output Guardrail — 在 done 事件前检查 answer 安全性
      if (payload.type === 'done') {
        const evidenceLedger = getEvidenceLedger();
        const result = payload.result as Record<string, unknown> | undefined;
        const answer = typeof result?.answer === 'string' ? result.answer : '';
        const responseContract = result?.response_contract as Record<string, unknown> | undefined;
        if (answer) {
          const outputGuardrail = new OutputGuardrailImpl();
          const outputResult = outputGuardrail.check({
            answer,
            status: String(responseContract?.status || 'unknown'),
            sourceRefs: (responseContract?.source_refs || []) as Array<{ source_type: string; [key: string]: unknown }>,
            evidenceRefs: (responseContract?.evidence_refs || []) as string[],
            evidenceMode: responseContract?.evidence_mode as string | undefined,
            workflowResult: payload.metadata as Record<string, unknown> | undefined,
            metadata: { ...payload.metadata as Record<string, unknown>, evidence_ledger: serializeLedgerForMetadata(evidenceLedger) },
          });
          // 将 output guardrail findings 附加到 metadata
          if (outputResult.findings.length > 0) {
            const metadata = (payload.metadata || {}) as Record<string, unknown>;
            metadata.output_guardrail = {
              tripwire_triggered: outputResult.tripwire_triggered,
              tripwire_reason: outputResult.tripwire_reason,
              findings: outputResult.findings.map((f) => ({ code: f.code, severity: f.severity, message: f.message })),
              evidence_ledger: serializeLedgerForMetadata(evidenceLedger),
            };
            payload.metadata = metadata;
          }
          // tripwire 触发时，替换 answer 为阻断消息
          if (outputResult.tripwire_triggered) {
            const blockedAnswer = '回答未通过安全校验，已拦截。请联系管理员。';
            payload.result = {
              ...result,
              answer: blockedAnswer,
              response_contract: {
                ...responseContract,
                status: 'blocked',
                answer: blockedAnswer,
              },
            };
          }
        }
      }
      controller.enqueue(encoder.encode(sse(payload)));
      return true;
    } catch (error) {
      closed = true;
      stopHeartbeat();
      console.warn('[chat] SSE push skipped after stream closed', error instanceof Error ? error.message : String(error));
      return false;
    }
  };

  const close = () => {
    if (closed) return;
    closed = true;
    stopHeartbeat();
    try {
      controller.close();
    } catch (error) {
      console.warn('[chat] SSE close skipped after stream closed', error instanceof Error ? error.message : String(error));
    }
  };

  const pushEvent = (event: AgentProcessEvent) => {
    processEvents.push(event);
    push({ type: 'process_event', event });
  };

  const pushRuntimeState = (
    currentStage: RuntimeState['current_stage'],
    completedStages: RuntimeStage[] = [],
    status: RuntimeState['status'] = 'running',
  ) => {
    push({ type: 'runtime_state', runtime_state: createRuntimeState(startedAt, currentStage, completedStages, status) });
  };

  // 心跳
  heartbeatInterval = setInterval(() => {
    if (!closed) push({ type: 'heartbeat', ts: Date.now() });
  }, 8000);

  // evidence ledger 通过闭包 get/set
  let evidenceLedgerRef = getEvidenceLedger();
  const setEvidenceLedger = (ledger: EvidenceLedger) => {
    evidenceLedgerRef = ledger;
  };

  return {
    push,
    pushEvent,
    pushRuntimeState,
    close,
    endPlanningAndStartExecution,
    getProcessEvents: () => processEvents,
    getEvidenceLedger: () => evidenceLedgerRef,
    setEvidenceLedger,
    stopHeartbeat,
  };
}

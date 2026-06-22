import { NextRequest } from 'next/server';
import { sse } from '@/lib/chat-runtime/sse';
import { createRuntimeState } from '@/lib/chat-runtime/runtime-state';
import { buildPromptConfigMetadata, buildPromptRuntimePolicy, type RuntimePromptMap } from '@/lib/prompt-runtime-policy';
import { getActivePromptContent } from '@/lib/prompt-store';
import { buildResponseContract } from '@/lib/response-contract';
import type { ToolPurpose } from '@/contracts/request-understanding/route-decision-contract';
import { resolveUserScopeFromRequest } from '@/lib/user-scope';
import type { AgentProcessEvent, RuntimeStage, RuntimeState } from '@/types';
import { normalizeQuestionWithGlossary } from '@/lib/controlled-glossary-index';
import { createRunnerHookRunner } from '@/contracts/observability/runner-hooks';
import { TraceSpanHook } from '@/lib/runner-hooks/trace-span-hook';
import { EventBridgeHook } from '@/lib/runner-hooks/event-bridge-hook';
import { InputGuardrailImpl } from '@/lib/guardrails/input-guardrail';
import { OutputGuardrailImpl } from '@/lib/guardrails/output-guardrail';
import { createEmptyEvidenceLedger, serializeLedgerForMetadata, type EvidenceLedger } from '@/lib/evidence-ledger';
import { getEvidenceLedgerByCase, saveEvidenceLedger } from '@/lib/evidence-ledger-store';
import { CALLBACK_ATTR_DIAGNOSIS_SKILL_ID } from '@/contracts/skills/callback-attribution-diagnosis';
import {
  executeUnderstandingStage,
  executePublicWebStage,
  executeGiIntelligenceStage,
  executeDiagnosisStage,
  executePackageStage,
  executeOpenAnswerStage,
  executeReportQueryStage,
  executeMultiQueryStage,
  shouldEnterPackageStage,
  shouldEnterMultiQueryStage,
  executeAutomationStage,
  type StreamIO,
} from '@/lib/chat-pipeline';
import { createProcessEvent } from '@/lib/chat-route-primitives';

interface ChatRequestBody {
  message: string;
  history?: Array<{ role: string; content: string; createdAt?: string; id?: string; message_id?: string; intent_type?: string; metadata?: Record<string, unknown>; evidence_ids?: string[] }>;
  intent?: string;
  projectContext?: string;
  metadata?: {
    projectContext?: string;
    project_context?: string;
    currentProject?: {
      appId?: string | number;
      appName?: string;
      appAlias?: string;
      projectId?: string | number;
      projectName?: string;
      packageName?: string;
      platform?: string;
      channel?: string;
      media?: string;
      mediaName?: string;
      source?: string;
      selectedAt?: string;
      app_id?: string | number;
      app_name?: string;
      app_alias?: string;
      project_id?: string | number;
      project_name?: string;
      package_name?: string;
      platform_name?: string;
      channel_name?: string;
      media_name?: string;
    } | null;
    projectContextDebug?: Record<string, unknown>;
    [key: string]: unknown;
  };
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as Partial<ChatRequestBody>;
  const rawMessage = String(body.message || '').trim();
  // 受控词典归一化：将用户表达映射到受治理的标准术语。
  const glossaryResult = normalizeQuestionWithGlossary(rawMessage);
  const message = glossaryResult.normalized_text;
  const conversationId = request.headers.get('x-conversation-id') || `conv-${Date.now()}`;

  // ─── Input Guardrail (Stage 2) ────────────────────────
  // 在理解阶段前运行，tripwire 触发时直接返回 blocked 响应。
  const inputGuardrail = new InputGuardrailImpl();
  const inputGuardrailResult = inputGuardrail.check({ message, history: body.history });
  if (inputGuardrailResult.tripwire_triggered) {
    const blockedAnswer = '您的输入触发了安全策略，请调整后重试。';
    const blockedResponseContract = buildResponseContract({
      status: 'blocked',
      intentType: body.intent,
      traceId: `zt-chat-${Date.now()}-blocked`,
      answer: blockedAnswer,
      processEvents: [],
      metadata: {
        input_guardrail_tripwire: true,
        input_guardrail_reason: inputGuardrailResult.tripwire_reason,
        input_guardrail_findings: inputGuardrailResult.findings.map((f) => ({ code: f.code, message: f.message })),
      },
    });
    return new Response(JSON.stringify({
      answer: blockedAnswer,
      response_contract: blockedResponseContract,
      metadata: { blocked: true, reason: inputGuardrailResult.tripwire_reason },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const userScope = await resolveUserScopeFromRequest(request).catch(() => null);
  const userScopeKey = userScope?.key || conversationId;
  const traceId = `zt-chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const startedAt = new Date().toISOString();

  // ─── Runner Hook System (Stage 0) ──────────────────────
  // 创建 hookRunner，注册 TraceSpanHook 用于自动 span 树。
  // EventBridgeHook 在 SSE 流初始化后注册（需要 pushEvent）。
  const traceSpanHook = new TraceSpanHook({ traceId, startedAt });
  const hookRunner = createRunnerHookRunner([traceSpanHook]);
  let eventBridgeHook: EventBridgeHook | null = null;

  /** 构建当前 run 的 hook 上下文。在 stage 切换时调用。 */
  const buildHookCtx = (stage: import('@/lib/runner-lifecycle').RunnerStage) => ({
    traceId,
    conversationId,
    message,
    stage,
    startedAt,
    userScopeKey,
  });

  // setup 阶段从 hookRunner 创建时开始
  void hookRunner.invokeStageStart({ stage: 'setup' }, buildHookCtx('setup'));
  const [
    routePrompt,
    responsePrompt,
    evidencePrompt,
    cardPrompt,
    followupPrompt,
    toolExplainPrompt,
    reportQueryRoutePrompt,
    reportQueryAnswerPrompt,
    reportQueryVisualPrompt,
    reportQueryEvidencePrompt,
  ] = await Promise.all([
    getActivePromptContent('route_prompt', '', body.intent),
    getActivePromptContent('response_prompt', '', body.intent),
    getActivePromptContent('evidence_prompt', '', body.intent),
    getActivePromptContent('card_prompt', '', body.intent),
    getActivePromptContent('followup_prompt', '', body.intent),
    getActivePromptContent('tool_explain_prompt', '', body.intent),
    getActivePromptContent('report_query_route_prompt', '', 'report_query'),
    getActivePromptContent('report_query_answer_prompt', '', 'report_query'),
    getActivePromptContent('report_query_visual_prompt', '', 'report_query'),
    getActivePromptContent('report_query_evidence_prompt', '', 'report_query'),
  ]);
  const runtimePrompts: RuntimePromptMap = {
    route_prompt: routePrompt,
    response_prompt: responsePrompt,
    evidence_prompt: evidencePrompt,
    card_prompt: cardPrompt,
    followup_prompt: followupPrompt,
    tool_explain_prompt: toolExplainPrompt,
    report_query_route_prompt: reportQueryRoutePrompt,
    report_query_answer_prompt: reportQueryAnswerPrompt,
    report_query_visual_prompt: reportQueryVisualPrompt,
    report_query_evidence_prompt: reportQueryEvidencePrompt,
  };
  const promptConfigMetadata = buildPromptConfigMetadata(runtimePrompts);
  const promptRuntimePolicy = buildPromptRuntimePolicy(runtimePrompts);

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const processEvents: AgentProcessEvent[] = [];
      // Stage 2: Evidence Ledger 初始化（从持久化存储加载，支持跨请求）
      // 初始使用 conversationId 作为 caseId，后续会切换到 CaseFrame 的 caseId
      let evidenceCaseId = `conv-${conversationId}`;
      let evidenceLedger: EvidenceLedger = await getEvidenceLedgerByCase(userScopeKey, evidenceCaseId)
        .catch(() => createEmptyEvidenceLedger({ caseId: evidenceCaseId, conversationId }));
      let streamIO: StreamIO;
      let closed = false;
      let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
      const stopHeartbeat = () => {
        if (!heartbeatInterval) return;
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      };
      const push = (payload: Record<string, unknown>) => {
        if (closed) {
          // Stream already closed - if this is a 'done' event, we have a problem
          if (payload.type === 'done') {
            console.error('[chat] CRITICAL: done event dropped because stream is already closed');
          }
          return false;
        }
        try {
          // Stage 2: Output Guardrail — 在 done 事件前检查 answer 安全性
          if (payload.type === 'done' && streamIO?.getEvidenceLedger()) {
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
                metadata: { ...payload.metadata as Record<string, unknown>, evidence_ledger: serializeLedgerForMetadata(streamIO.getEvidenceLedger()) },
                evidenceLedger: streamIO.getEvidenceLedger(),
              });
              // 将 output guardrail findings 附加到 metadata
              if (outputResult.findings.length > 0) {
                const metadata = (payload.metadata || {}) as Record<string, unknown>;
                metadata.output_guardrail = {
                  tripwire_triggered: outputResult.tripwire_triggered,
                  tripwire_reason: outputResult.tripwire_reason,
                  findings: outputResult.findings.map((f) => ({ code: f.code, severity: f.severity, message: f.message })),
                  evidence_ledger: serializeLedgerForMetadata(streamIO.getEvidenceLedger()),
                };
                payload.metadata = metadata;
              }
              if (outputResult.tripwire_triggered) {
                const metadata = (payload.metadata || {}) as Record<string, unknown>;
                metadata.output_guardrail_tripwire = true;
                metadata.output_guardrail_reason = outputResult.tripwire_reason;
                metadata.output_guardrail_findings = outputResult.findings.map((f) => ({ code: f.code, severity: f.severity, message: f.message }));
                const blockedAnswer = '这次结果没有通过证据和安全检查，我已停止输出原回答。请补充更多信息或稍后重试，我会重新按可追溯来源处理。';
                const blockedResponseContract = buildResponseContract({
                  status: 'blocked',
                  intentType: body.intent,
                  traceId,
                  answer: blockedAnswer,
                  processEvents,
                  metadata: {
                    output_guardrail_tripwire: true,
                    output_guardrail_reason: outputResult.tripwire_reason,
                    output_guardrail_findings: metadata.output_guardrail_findings,
                    evidence_ledger: serializeLedgerForMetadata(streamIO.getEvidenceLedger()),
                  },
                });
                payload.result = {
                  ...(result || {}),
                  answer: blockedAnswer,
                  response_contract: blockedResponseContract,
                };
                metadata.response_contract = blockedResponseContract;
                payload.metadata = metadata;
              }
            }
          }
          controller.enqueue(encoder.encode(sse(payload)));
          if (payload.type === 'done') donePushed = true;
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

      // 注册 EventBridgeHook（需要 pushEvent，因此在此处创建）
      eventBridgeHook = new EventBridgeHook({ pushEvent });
      hookRunner.register(eventBridgeHook);

      // ─── Stage 0 包装函数 ───
      // 在 planner shadow 后自动切换 planning → execution
      let planningEnded = false;
      let donePushed = false;  // Track if done event was successfully pushed
      const endPlanningAndStartExecution = async () => {
        if (planningEnded) return;
        planningEnded = true;
        await hookRunner.invokeStageEnd({ stage: 'planning', durationMs: 0, status: 'ok' }, buildHookCtx('planning'));
        await hookRunner.invokeStageStart({ stage: 'execution' }, buildHookCtx('execution'));
      };
      heartbeatInterval = setInterval(() => {
        if (!closed) push({ type: 'heartbeat', ts: Date.now() });
      }, 8000);
      const pushRuntimeState = (
        currentStage: RuntimeState['current_stage'],
        completedStages: RuntimeStage[] = [],
        status: RuntimeState['status'] = 'running',
      ) => {
        push({ type: 'runtime_state', runtime_state: createRuntimeState(startedAt, currentStage, completedStages, status) });
      };

      // ─── StreamIO 对象 ───
      // 封装 SSE 操作，供 pipeline stage handlers 使用。
      streamIO = {
        push,
        pushEvent,
        pushRuntimeState,
        close,
        endPlanningAndStartExecution,
        getProcessEvents: () => processEvents,
        getEvidenceLedger: () => evidenceLedger,
        setEvidenceLedger: (ledger: EvidenceLedger) => { evidenceLedger = ledger; },
      };

      try {
        // ─── Stage 0: setup → understanding ───
        const setupDurationMs = Date.now() - new Date(startedAt).getTime();
        void hookRunner.invokeStageEnd({ stage: 'setup', durationMs: setupDurationMs, status: 'ok' }, buildHookCtx('setup'));
        void hookRunner.invokeStageStart({ stage: 'understanding' }, buildHookCtx('understanding'));

        const understandingResult = await executeUnderstandingStage(
          {
            message,
            body: body as { message: string; intent?: string; history?: Array<Record<string, unknown>>; metadata?: Record<string, unknown> },
            conversationId,
            traceId,
            startedAt,
            userScopeKey,
            userScope,
            promptConfigMetadata,
          },
          streamIO,
        );

        if (understandingResult.status === 'blocked') {
          return;
        }

        const {
          question, compiledContext, semanticFrame, userRequirement, projectContextSummary,
          route, routeServers, routeCapabilityManifest, routeCapabilityCandidates, skillSelection,
          clientIntent, matchedRouteRules, reportRouteMatch, capabilityReportMatch,
          reportContinuation, reportContinuationClassification, publicWebNeed,
          routeInformationSourceArbitration, routeDecisionMetadata, isReportQuery,
          routeWarnings, routeServiceIntent, serviceProposal, possibleServices, caseFrame,
        } = understandingResult;

        // ─── Evidence Ledger 切换（使用 CaseFrame 的 caseId）───
        // understanding-stage 产出了 CaseFrame，现在切换到正确的 Evidence Ledger
        if (caseFrame?.caseId) {
          const correctEvidenceCaseId = caseFrame.caseId;
          if (correctEvidenceCaseId !== evidenceCaseId) {
            // 从存储中加载对应的 Evidence Ledger
            const correctLedger = await getEvidenceLedgerByCase(userScopeKey, correctEvidenceCaseId)
              .catch(() => createEmptyEvidenceLedger({ caseId: correctEvidenceCaseId, conversationId }));
            streamIO.setEvidenceLedger(correctLedger);
            // 更新本地的 evidenceCaseId 引用（用于后续保存）
            evidenceCaseId = correctEvidenceCaseId;
          }
        }

        // ─── Stage 0: understanding → planning ───
        void hookRunner.invokeStageEnd({ stage: 'understanding', durationMs: 0, status: 'ok' }, buildHookCtx('understanding'));
        void hookRunner.invokeStageStart({ stage: 'planning' }, buildHookCtx('planning'));

        // ─── Pipeline stages ─────────────────────────────────────
        // 将理解阶段产出的变量打包为 ctx，供各 stage handler 消费。
        const pipelineCtx: import('@/lib/chat-pipeline').ChatPipelineContext = {
          message,
          question,
          conversationId,
          traceId,
          startedAt,
          userScopeKey,
          body: body as import('@/lib/chat-pipeline').ChatRequestBody,
          compiledContext,
          semanticFrame,
          userRequirement,
          projectContextSummary,
          serviceProposal,
          possibleServices,
          caseFrame,
          route,
          routeIntent: route.intent_type,
          routeServiceIntent,
          routeToolPurpose: routeDecisionMetadata.toolPurpose as ToolPurpose,
          routeReason: route.reason,
          routeConfidence: route.confidence,
          routeAgent: route.agent,
          clientIntent,
          isReportQuery,
          reportRouteMatch,
          capabilityReportMatch,
          publicWebNeed,
          routeInformationSourceArbitration,
          routeDecisionMetadata,
          matchedRouteRules,
          skillSelection,
          routeServers,
          routeCapabilityManifest,
          routeCapabilityCandidates,
          reportContinuation,
          reportContinuationClassification,
          promptConfigMetadata,
          promptRuntimePolicy,
          runtimePrompts,
          modelServiceConfig: null,
          publicWebModelServiceConfig: null,
          nonReportModelServiceConfig: null,
          reportModelServiceConfig: null,
          userScope,
          routeWarnings,
        };

        let publicWebEvidenceForComposer: Record<string, unknown> | undefined;

        // ─── Automation Stage (Chat-first Task Center) ───
        // 在正常 pipeline 之前检测自动化意图，如命中则直接处理并终止。
        {
          const automationResult = await executeAutomationStage(pipelineCtx, streamIO);
          if (automationResult.handled && automationResult.terminal) {
            return;
          }
        }

        if (!isReportQuery) {
          // ─── GI Intelligence Stage ───
          const giIntelligenceResult = await executeGiIntelligenceStage(pipelineCtx, streamIO);
          switch (giIntelligenceResult.terminal) {
            case true:
              return;
          }

          // ─── Public Web Stage ───
          const publicWebResult = await executePublicWebStage(pipelineCtx, streamIO);
          publicWebEvidenceForComposer = publicWebResult.publicWebEvidenceForComposer;
          if (publicWebResult.terminal) {
            return;
          }

          // ─── Diagnosis Stage ───
          const selectedSkill = skillSelection.selected?.skill;
          if ((route.intent_type === 'diagnosis' || route.intent_type === 'debugging') && selectedSkill?.skill_id === CALLBACK_ATTR_DIAGNOSIS_SKILL_ID) {
            const diagnosisResult = await executeDiagnosisStage(pipelineCtx, streamIO);
            if (diagnosisResult.terminal) {
              return;
            }
          }

          // ─── Package Stage ───
          if (shouldEnterPackageStage(pipelineCtx)) {
            const packageResult = await executePackageStage(pipelineCtx, streamIO);
            if (packageResult.terminal) {
              return;
            }
          }

          // ─── Open Answer Stage ───
          const openAnswerResult = await executeOpenAnswerStage(pipelineCtx, streamIO, publicWebEvidenceForComposer);
          if (openAnswerResult.terminal) {
            return;
          }

          // ─── Demand Pool Item Creation（用户确认后建单）───
          const demandIntakeUserConfirmed = (pipelineCtx as Record<string, unknown>).demandIntakeUserConfirmed as boolean | undefined;
          const demandIntakeDraft = (pipelineCtx as Record<string, unknown>).demandIntakeDraft as any;
          const { getDemandIntakeFlags } = await import('@/lib/demand-intake-flags');
          const { createDemandPoolItem } = await import('@/lib/demand-pool-store');
          const { saveCaseFrame } = await import('@/lib/case-frame-store');
          const demandFlags = getDemandIntakeFlags();

          if (demandIntakeUserConfirmed && demandFlags.enableDemandPoolCreateOnConfirm && demandIntakeDraft) {
            try {
              // Build DemandPoolItem from intake draft
              const now = Date.now();
              const demandPoolInput: import('@/types').DemandPoolItem = {
                id: '', // Will be generated by store
                title: `${demandIntakeDraft.serviceType || 'demand'} - ${demandIntakeDraft.collectedSlots?.project?.value || '未命名'}`,
                problem_statement: `用户提交${demandIntakeDraft.serviceType || 'demand'}需求。`,
                target_users: ['ad_ops'],
                core_scenarios: [demandIntakeDraft.serviceType || 'demand_intake'],
                acceptance_criteria: demandIntakeDraft.missingInputs?.length === 0
                  ? ['所有必填槽位已齐全']
                  : ['需要补充缺失信息'],
                scope_in: demandIntakeDraft.collectedSlots
                  ? Object.entries(demandIntakeDraft.collectedSlots)
                      .filter(([, v]: any) => v.value)
                      .map(([k, v]: any) => `${k}: ${v.value}`)
                  : [],
                scope_out: [],
                dependencies: [],
                deliverables: demandIntakeDraft.artifacts?.map((a: any) => a.url || a.type) || [],
                phase: 'phase1',
                priority: 'P1',
                business_flow: 'demand',
                automation_boundary: 'manual',
                status: 'draft',
                proposer: userScopeKey,
                owner: userScopeKey,
                created_at: now,
                updated_at: now,
                // P1: Demand Intake 关联字段
                caseId: caseFrame?.caseId,
                conversationId,
                serviceType: demandIntakeDraft.serviceType,
                intakeDraftStatus: 'submitted',
                intakeSlots: demandIntakeDraft.collectedSlots,
                intakeMissingInputs: demandIntakeDraft.missingInputs,
                intakeArtifacts: demandIntakeDraft.artifacts,
                intakeRiskWarnings: demandIntakeDraft.riskWarnings,
                originalMessageSummary: message.slice(0, 200),
                confirmedAt: now,
                submittedAt: now,
                evidenceRefs: streamIO.getEvidenceLedger()?.entries?.map(e => e.id) || [],
                sourceRefs: [],
              };

              const createdItem = await createDemandPoolItem(demandPoolInput);

              // Update CaseFrame with demandPoolItemId
              if (caseFrame) {
                caseFrame.metadata.demandPoolItemId = createdItem.id;
                caseFrame.metadata.demandPoolItemSubmittedAt = now;
                caseFrame.stage = 'converted_to_task';
                await saveCaseFrame(userScopeKey, caseFrame);
              }

              // Emit process event
              streamIO.pushEvent(createProcessEvent({
                type: 'stage.ended',
                label: '需求单已创建',
                summary: `需求单 ${createdItem.id} 已创建并关联到 CaseFrame。`,
                status: 'success',
                visibility: 'internal',
                output: {
                  demandPoolItemId: createdItem.id,
                  serviceType: demandIntakeDraft.serviceType,
                  caseId: caseFrame?.caseId,
                },
              }));
            } catch (error) {
              console.error('[chat] demand pool item creation failed:', error);
              streamIO.pushEvent(createProcessEvent({
                type: 'stage.error',
                label: '需求单创建失败',
                summary: `需求单创建失败：${error instanceof Error ? error.message : String(error)}`,
                status: 'error',
                visibility: 'internal',
                output: { error: String(error) },
              }));
            }
          }
        } else {
          // ─── Multi-Query Stage (拼表 / 多工具编排) ───
          if (shouldEnterMultiQueryStage(pipelineCtx, routeServers)) {
            const multiQueryResult = await executeMultiQueryStage(pipelineCtx, streamIO);
            if (multiQueryResult.terminal) {
              return;
            }
          }

          // ─── Report Query Stage ───
          const reportQueryResult = await executeReportQueryStage(pipelineCtx, streamIO);
          if (reportQueryResult.terminal) {
            return;
          }
        }
      } catch (error) {
        const messageText = error instanceof Error ? error.message : String(error);
        push({ type: 'error', message: messageText });
        const responseContract = buildResponseContract({
          status: 'failed',
          intentType: body.intent,
          traceId,
          answer: messageText,
          processEvents,
          metadata: { error: messageText },
        });
        push({
          type: 'done',
          result: {
            answer: messageText,
            response_contract: responseContract,
          },
          metadata: {
            error: messageText,
            process_events: processEvents,
            response_contract: responseContract,
            runtime_state: createRuntimeState(startedAt, 'completed', ['understanding', 'context_loading', 'response_generation'], 'failed'),
          },
        });
      } finally {
        // 保存 Evidence Ledger 到持久化存储（异步，不阻塞流关闭）
        if (streamIO?.getEvidenceLedger()) {
          void saveEvidenceLedger(userScopeKey, evidenceCaseId, conversationId, streamIO.getEvidenceLedger()).catch(err => {
            console.warn('[chat] evidence ledger save failed:', err instanceof Error ? err.message : String(err));
          });
        }
        // Safeguard: ensure done event is always pushed before closing
        if (!donePushed && !closed) {
          console.warn('[chat] SAFEGUARD: pushing fallback done event');
          const fallbackContract = buildResponseContract({
            status: 'failed',
            intentType: body.intent,
            traceId,
            answer: '回答生成失败，请稍后重试。',
            processEvents,
            metadata: { safeguard_fallback: true },
          });
          push({
            type: 'done',
            result: {
              answer: '回答生成失败，请稍后重试。',
              response_contract: fallbackContract,
            },
            metadata: {
              safeguard_fallback: true,
              process_events: processEvents,
              runtime_state: createRuntimeState(startedAt, 'completed', ['understanding', 'context_loading', 'response_generation'], 'failed'),
            },
          });
        }
        stopHeartbeat();
        close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

/**
 * Diagnosis Stage
 *
 * 搬迁自 route.ts L1149-1438。
 * 当路由意图为 diagnosis/debugging 且选中了 CALLBACK_ATTR_DIAGNOSIS_SKILL_ID 时执行。
 */

import type { StreamIO, ChatPipelineContext, ChatPipelineResult } from './pipeline-types';
import { createRuntimeState, defaultAnswerPolicy } from '@/lib/chat-runtime/runtime-state';
import { createProcessEvent } from '@/lib/chat-route-primitives';
import { buildAnswerOrigin, buildMessageRuntimeProjection } from '@/lib/chat-runtime/message-runtime-projection';
import { modelParticipationFromRuntime } from '@/lib/runner-stages/assembly-helpers';
import { buildSemanticMessageContract } from '@/contracts/result-assembly/semantic-result-assembly';
import { buildResponseContract } from '@/lib/response-contract';
import { buildTraceUrl } from '@/lib/trace';
import { getTraceConfigSync } from '@/lib/trace-config-store';
import { emitChatMessageTrace } from '@/app/api/chat/chat-trace';
import { recordEvidence } from '@/lib/evidence-ledger';
import { runChatModelNode } from '@/lib/runner-stages/assembly-helpers';
import { getModelServiceConfig } from '@/lib/runtime-config';
import { executeCallbackAttributionDiagnosisSkill } from '@/lib/skill-orchestration';
import { CALLBACK_ATTR_DIAGNOSIS_SKILL_ID } from '@/contracts/skills/callback-attribution-diagnosis';
import {
  createWorkflowTask,
  startWorkflowRun,
  updateWorkflowRun,
} from '@/lib/workflow-task-store';
import {
  buildRouteDecisionObservation,
  isRouteDecisionObservationEnabled,
} from '@/lib/route-decision-observation';
import {
  buildRouteObservationEvent,
  emitPlannerShadowObservationIfEnabled,
} from '@/lib/runner-stages/route-helpers';
import {
  workflowStepsFromDiagnosisTrace,
  buildDiagnosisAnswer,
} from '@/lib/runner-stages/execution-helpers';
import { transitionCaseFrameStage, addEvidenceRef } from '@/lib/case-frame-helpers';
import type { AnswerPolicy, MessageContract } from '@/types';
import type { ServiceIntent } from '@/contracts/request-understanding/route-decision-contract';

export async function executeDiagnosisStage(
  ctx: ChatPipelineContext,
  io: StreamIO,
): Promise<ChatPipelineResult> {
  const route = ctx.route;
  const skillSelection = ctx.skillSelection;
  const selectedSkill = skillSelection.selected?.skill;
  const caseFrame = ctx.caseFrame;
  const userScopeKey = ctx.userScopeKey;

  // 前置条件检查
  if (!((route.intent_type === 'diagnosis' || route.intent_type === 'debugging') && selectedSkill?.skill_id === CALLBACK_ATTR_DIAGNOSIS_SKILL_ID)) {
    return {};
  }

  // CaseFrame 状态转换：进入执行阶段
  if (caseFrame) {
    await transitionCaseFrameStage(userScopeKey, caseFrame, 'executing', {
      diagnosis_skill: selectedSkill.skill_id,
      started_at: new Date().toISOString(),
    });
  }

  const {
    question,
    conversationId,
    traceId,
    startedAt,
    message,
    clientIntent,
    matchedRouteRules,
    reportRouteMatch,
    reportContinuation,
    userRequirement,
    routeWarnings,
    promptConfigMetadata,
    compiledContext,
    body,
    routeServiceIntent,
    projectContextSummary,
    routeServers,
  } = ctx;
  const routeDecisionMetadata = ctx.routeDecisionMetadata;

  io.push({ type: 'route', intent: route.intent_type, hasThinking: false, toolsUsed: [] });
  io.pushRuntimeState('data_fetching', ['understanding', 'context_loading']);
  const servers = routeServers;
  const task = await createWorkflowTask({
    conversation_id: conversationId,
    task_type: 'diagnosis',
    workflow_level: 'heavy',
    title: selectedSkill.name,
    summary: question,
    route_reason: route.reason as string,
    workflow_state: 'running',
  });
  const run = await startWorkflowRun({
    taskId: task.task_id,
    conversationId,
    intentType: 'diagnosis',
    workflowLevel: 'heavy',
    routeReason: route.reason as string,
    metadata: { question, skillId: selectedSkill.skill_id },
  });
  io.pushEvent(createProcessEvent({
    type: 'skill.selected',
    label: '选择 Skill',
    summary: `已选择 ${selectedSkill.name}`,
    intent_type: 'diagnosis',
    agent: 'diagnosis',
    skill_id: selectedSkill.skill_id,
    skill_name: selectedSkill.name,
    output: {
      score: skillSelection.selected?.score,
      reasons: skillSelection.selected?.reasons,
      matchedTriggers: skillSelection.selected?.matchedTriggers,
    },
  }));
  io.pushEvent(createProcessEvent({
    type: 'skill.started',
    label: '启动 Skill',
    summary: '开始执行安卓归因排查工作流。',
    intent_type: 'diagnosis',
    agent: 'diagnosis',
    skill_id: selectedSkill.skill_id,
    skill_name: selectedSkill.name,
  }));
  const execution = await executeCallbackAttributionDiagnosisSkill({
    message: question,
    compiledContext,
    routeReason: route.reason as string,
    servers,
  });
  // Stage 2: 诊断结果入账 Evidence Ledger
  const updatedLedger = recordEvidence(io.getEvidenceLedger(), {
    source: 'tool_result',
    sourceId: selectedSkill.skill_id,
    confidence: execution.status === 'success' ? 'confirmed_fact' : 'high_probability',
    content: {
      skill: selectedSkill.skill_id,
      status: execution.status,
      branch: execution.branch,
      step_count: execution.workflowTrace?.length || 0,
    },
  });
  io.setEvidenceLedger(updatedLedger);

  // CaseFrame 证据引用
  if (caseFrame && updatedLedger.entries.length > 0) {
    const latestEvidenceId = updatedLedger.entries[updatedLedger.entries.length - 1].id;
    await addEvidenceRef(userScopeKey, caseFrame, latestEvidenceId);
  }
  const steps = workflowStepsFromDiagnosisTrace(execution.workflowTrace);
  await updateWorkflowRun(task.task_id, run.run_id, {
    status: execution.status === 'success' || execution.status === 'partial' ? 'completed' : execution.status === 'blocked' ? 'blocked' : 'failed',
    state: execution.branch,
    steps,
    metadata: {
      question,
      skillId: selectedSkill.skill_id,
      branch: execution.branch,
      warnings: execution.warnings,
    },
  });
  for (const event of execution.events) {
    io.pushEvent(event);
  }
  const baseDiagnosisContent = buildDiagnosisAnswer(execution);
  const diagnosisSummaryAssist = await runChatModelNode({
    useCase: 'diagnosis_summary',
    fallbackText: baseDiagnosisContent,
    modelServiceConfig: await getModelServiceConfig(),
    input: {
      baseAnswer: baseDiagnosisContent,
      status: execution.status,
      branch: execution.branch,
      branchStatus: execution.branchStatus,
      summary: execution.summary,
      conclusion: execution.conclusion,
      warnings: execution.warnings,
      nextActions: execution.nextActions,
      workflowTrace: execution.workflowTrace,
      toolCalls: execution.toolCalls,
      evidenceRefs: execution.evidenceRefs,
      sourceRefs: execution.sourceRefs,
    },
    consume: {
      enabled: true,
      consumedBy: 'diagnosis_answers_composer',
      textField: 'diagnosis',
      consumedFields: ['diagnosis'],
    },
    traceMeta: { intent: 'diagnosis', status: execution.status },
  });
  const content = diagnosisSummaryAssist.text;
  const routeObservation = isRouteDecisionObservationEnabled()
    ? buildRouteDecisionObservation({
      decisionId: `${traceId}:route-observation`,
      traceId,
      message,
      clientIntent,
      routeIntent: route.intent_type as any,
      routeReason: route.reason as string,
      routeConfidence: route.confidence as any,
      resolvedIntent: routeDecisionMetadata.resolvedIntent as any,
      matchedRules: matchedRouteRules,
      reportRouteMatch,
      reportContinuation,
      userRequirementTask: userRequirement.task,
      routeWarnings,
      selectedSkill: { skill_id: selectedSkill.skill_id, name: selectedSkill.name },
      skillSelection,
      capabilityDecision: null,
      promptConfig: promptConfigMetadata,
      isReportQuery: false,
      actualExecution: {
        actualServiceIntent: 'issue_diagnosis',
        actualIsReportQuery: false,
        actualSelectedSkill: selectedSkill.skill_id,
        actualToolPurpose: 'evidence_fetch',
      },
    })
    : undefined;
  if (routeObservation) io.pushEvent(buildRouteObservationEvent(routeObservation));
  await emitPlannerShadowObservationIfEnabled({ message, history: body.history, pushEvent: io.pushEvent, route: { intent_type: route.intent_type as any, confidence: route.confidence as any, serviceIntent: routeServiceIntent as string }, onShadowResult: (result) => { io.setEvidenceLedger(recordEvidence(io.getEvidenceLedger(), { source: 'planner_inference', sourceId: 'planner_shadow', confidence: result.status === 'succeeded' ? 'high_probability' : 'unverified', content: { status: result.status, task_type: result.plan?.task_type, service_intent: result.plan?.service_intent, confidence: result.plan?.confidence, duration_ms: result.durationMs } })); } });
  await io.endPlanningAndStartExecution();

  const runtimeState = createRuntimeState(
    startedAt,
    'completed',
    ['understanding', 'context_loading', 'data_fetching', 'analysis', 'response_generation'],
    execution.status === 'failed' ? 'degraded' : execution.status === 'blocked' ? 'blocked' : 'completed',
  );
  const answerPolicy: AnswerPolicy = {
    ...defaultAnswerPolicy(),
    evidence_visibility: 'summary',
  };
  const processEvents = io.getProcessEvents();
  const messageContract: MessageContract = buildSemanticMessageContract({
    type: 'diagnosis',
    answerMarkdown: content,
    semanticResult: execution.semanticResult,
    runtimeState,
    answerPolicy,
    evidenceBundle: {
      sources: execution.sourceRefs,
      execution_context: {
        diagnosis: {
          branch: execution.branch,
          branch_status: execution.branchStatus,
          warnings: execution.warnings,
        },
      },
      tool_calls: execution.toolCalls,
    },
    executionContext: {
      diagnosis: {
        question,
        selected_skill_id: selectedSkill.skill_id,
        branch: execution.branch,
      },
    },
    agentRuntime: {
      trace_id: traceId,
      task_id: task.task_id,
      run_id: run.run_id,
    },
    reasoningArtifacts: {
      routing_decision: routeDecisionMetadata,
      routing_decision_observation: routeObservation,
      skill_selection: {
        selected_skill_id: selectedSkill.skill_id,
        score: skillSelection.selected?.score,
        reasons: skillSelection.selected?.reasons,
      },
    },
    rawResult: {
      runtime_display: execution.runtimeDisplay,
      workflow_trace: execution.workflowTrace,
    },
  });
  const runtimeProjection = buildMessageRuntimeProjection({
    messageId: traceId,
    threadId: conversationId,
    traceId,
    workflow: 'diagnosis',
    intent: 'diagnosis',
    status: execution.status,
    routeReason: route.reason as string,
    runtimeState,
    answerPolicy,
    content,
    promptConfig: promptConfigMetadata,
    compiledContext,
    messageContract,
    processEvents,
    traceUrl: buildTraceUrl(traceId, getTraceConfigSync().workspaceId),
    modelParticipation: modelParticipationFromRuntime(diagnosisSummaryAssist),
    answerOrigin: diagnosisSummaryAssist.consumed
      ? buildAnswerOrigin({
        source: 'real_llm',
        composerName: 'diagnosis_summary',
        summary: '诊断总结由模型基于诊断证据链生成，未修改工具事实。',
        modelName: diagnosisSummaryAssist.participation.model_name,
        modelSpanId: diagnosisSummaryAssist.participation.model_span_id,
      })
      : buildAnswerOrigin({
        source: 'template_composer',
        composerName: 'buildDiagnosisAnswer',
        summary: '诊断回答由本地模板组装。',
      }),
  });
  const responseContract = buildResponseContract({
    status: execution.status === 'failed' ? 'failed' : execution.status === 'blocked' ? 'blocked' : 'success',
    intentType: route.intent_type as any,
    traceId,
    answer: content,
    answerOrigin: runtimeProjection.answer_origin,
    processEvents,
    metadata: {
      answer_origin: runtimeProjection.answer_origin,
      skill_id: selectedSkill.skill_id,
      branch: execution.branch,
    },
  });
  const traceMeta = await emitChatMessageTrace({
    traceId,
    message,
    conversationId,
    threadId: conversationId,
    messageId: traceId,
    turnId: task.task_id,
    intentType: route.intent_type as any,
    taskId: task.task_id,
    runId: run.run_id,
    status: execution.status,
    routeReason: route.reason as string,
    finalAnswer: content,
    runtimeProjection,
    extra: {
      project_context_summary: projectContextSummary,
      skill_id: selectedSkill.skill_id,
      branch: execution.branch,
    },
  });
  io.pushRuntimeState('response_generation', ['understanding', 'context_loading', 'data_fetching', 'analysis']);
  io.push({ type: 'content', content });
  io.push({
    type: 'done',
    result: {
      answer: content,
      response_contract: responseContract,
      message_contract: messageContract,
      runtime_state: runtimeState,
      answer_policy: answerPolicy,
    },
    metadata: {
      process_events: processEvents,
      routing_decision_observation: routeObservation,
      project_context_summary: projectContextSummary,
      compiled_context: compiledContext,
      prompt_config: promptConfigMetadata,
      runtime_state: runtimeState,
      message_contract: messageContract,
      trace_meta: traceMeta,
      trace_url: traceMeta?.trace_url,
      thread_id: conversationId,
      message_id: traceId,
      turn_id: task.task_id,
      message_runtime_projection: runtimeProjection,
      skill_execution: {
        skill_id: selectedSkill.skill_id,
        branch: execution.branch,
        branch_status: execution.branchStatus,
        warnings: execution.warnings,
      },
    },
  });
  io.close();

  // CaseFrame 状态转换：执行完成
  if (caseFrame) {
    await transitionCaseFrameStage(userScopeKey, caseFrame, 'resolved', {
      diagnosis_skill: selectedSkill.skill_id,
      diagnosis_status: execution.status,
      branch: execution.branch,
      completed_at: new Date().toISOString(),
    });
  }

  return { terminal: true, content };
}

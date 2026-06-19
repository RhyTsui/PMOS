import { NextResponse } from 'next/server';
import { SpanKind } from '@cozeloop/ai';
import { analyzeReportRequirement, buildReportAssistantReply, getImplementedMetricCatalog } from '@/lib/report-agent';
import {
  createReportDraftFromTemplate,
  getReportTemplate,
  isReportDraftGenerationUnavailableError,
  listReportTemplates,
} from '@/lib/report-template-store';
import { buildChatTraceInput, buildStandardTraceTags, flushTrace, initTrace, safeSetInput, safeSetOutput, safeSetTags, safeTraceable, truncate } from '@/lib/trace';
import { appendWorkflowTaskResult, createWorkflowTask, patchWorkflowTask, startWorkflowRun, updateWorkflowRun } from '@/lib/workflow-task-store';
import type { HelpResult, ReportDraft, WorkflowResult } from '@/types';
import { AUTH_TOKEN_COOKIE } from '@/lib/auth-service';
import { scheduleRecommendationRefresh } from '@/lib/recommendation-service';
import { runModelUseCase } from '@/lib/model-use-case-runtime';

function readToken(request: Request): string {
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(new RegExp(`(?:^|; )${AUTH_TOKEN_COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : '';
}

interface ReportSessionRequest {
  message: string;
  attachmentSummaries?: string[];
  reportDate?: string;
}

export async function POST(request: Request) {
  initTrace();

  try {
    const body = (await request.json()) as ReportSessionRequest;
    const message = String(body.message || '').trim();
    const attachmentSummaries = Array.isArray(body.attachmentSummaries)
      ? body.attachmentSummaries.map(item => String(item))
      : [];
    const reportDate = String(body.reportDate || new Date().toISOString().slice(0, 10));

    if (!message) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }

    const templates = await listReportTemplates();
    let generatedDraft: ReportDraft | undefined;
    let draftBlockedReason = '';
    let shareLink = '';
    let screenshotHint = '?????????????????????????';
    const workflowTask = await createWorkflowTask({
      conversation_id: `report-session-${Date.now()}`,
      task_type: 'report_session',
      workflow_level: 'light',
      owner_type: 'xiaoqiao',
      title: truncate(message, 48),
      summary: '??????',
      route_reason: 'auto-report-session',
      workflow_state: 'running',
      status: 'running',
    });
    const workflowRun = await startWorkflowRun({
      taskId: workflowTask.task_id,
      conversationId: workflowTask.conversation_id,
      intentType: 'help',
      workflowLevel: 'light',
      routeReason: 'auto-report-session',
      metadata: { message: truncate(message, 300) },
    });

    const analysis = await safeTraceable(async (rootSpan) => {
      const localTraceId = workflowTask.task_id;
      const sdkTraceId = rootSpan.spanContext().traceId;
      safeSetInput(rootSpan, buildChatTraceInput(message, {
        trace_id: sdkTraceId,
        sdk_trace_id: sdkTraceId,
        local_trace_id: localTraceId,
        agent_id: 'agent_xiaoqiao_report',
        frontend_params: {
          attachment_count: attachmentSummaries.length,
          report_date: reportDate,
          scene: 'auto-report',
        },
      }));
      safeSetTags(rootSpan, buildStandardTraceTags({
        trace_id: sdkTraceId,
        sdk_trace_id: sdkTraceId,
        local_trace_id: localTraceId,
        task_id: workflowTask.task_id,
        run_id: workflowRun.run_id,
        conversation_id: workflowTask.conversation_id,
        intent_type: 'help',
        workflow_name: 'report_session',
        span_name: 'xiaoqiao.zhitou.chat',
        span_type: 'custom',
      }));

      const parsed = await safeTraceable(async (toolSpan) => {
        safeSetInput(toolSpan, {
          tool_name: 'report_requirement_parser',
          intake_mode_hint: attachmentSummaries.length ? 'attachment' : 'chat',
          prompt_summary: truncate(message, 500),
          attachments: attachmentSummaries.slice(0, 5),
        });
        const result = analyzeReportRequirement(message, templates, attachmentSummaries);
        safeSetOutput(toolSpan, {
          intake_mode: result.intakeMode,
          suggested_template: result.suggestedTemplateName || '',
          recognized_metric_count: result.recognizedMetrics.length,
          unclear_metric_count: result.unclearMetrics.length,
          unimplemented_metric_count: result.unimplementedMetrics.length,
          should_generate_draft: result.shouldGenerateDraft,
        });
        return result;
      }, { name: 'xiaoqiao.zhitou.tool', type: SpanKind.Tool });

      await safeTraceable(async (retrievalSpan) => {
        safeSetInput(retrievalSpan, {
          source: 'metric_catalog',
          query: truncate(message, 500),
        });
        safeSetOutput(retrievalSpan, {
          recognized_metrics: parsed.recognizedMetrics,
          unclear_metrics: parsed.unclearMetrics,
          unimplemented_metrics: parsed.unimplementedMetrics,
          available_metrics: getImplementedMetricCatalog(),
          matched_template_count: templates.filter(item => item.enabled).length,
        });
      }, { name: 'xiaoqiao.zhitou.retrieval', type: SpanKind.Retriever });

      const llmSummary = await runModelUseCase<{
        summary?: string;
        candidate_questions?: string[];
        next_action?: string;
      }>({
        useCase: 'request_understanding',
        input: {
          task: 'report_session_understanding',
          message,
          attachments: attachmentSummaries.slice(0, 5),
          analysis: {
            summary: parsed.summary,
            recognizedMetrics: parsed.recognizedMetrics,
            unclearMetrics: parsed.unclearMetrics,
            unimplementedMetrics: parsed.unimplementedMetrics,
            nextActions: parsed.nextActions,
            intakeMode: parsed.intakeMode,
          },
        },
        fallbackText: buildReportAssistantReply(parsed, {
          draft: generatedDraft,
          draftBlockedReason,
          shareLink,
          screenshotHint,
        }),
        consume: {
          enabled: false,
          consumedBy: 'report-session',
          textField: 'summary',
        },
        traceMeta: {
          session: 'report_session',
          attachment_count: attachmentSummaries.length,
        },
      });

      if (parsed.shouldGenerateDraft && parsed.suggestedTemplateId && !parsed.unclearMetrics.length && !parsed.unimplementedMetrics.length) {
        generatedDraft = await safeTraceable(async (mcpSpan) => {
          const templateId = parsed.suggestedTemplateId as string;
          safeSetInput(mcpSpan, {
            mcp_server: 'report-orchestrator',
            tool: 'compose_report_draft',
            template_id: templateId,
            report_date: reportDate,
          });
          const template = await getReportTemplate(templateId);
          if (!template) {
            throw new Error('report template not found');
          }
          try {
            const draft = await createReportDraftFromTemplate(template, reportDate);
            safeSetOutput(mcpSpan, {
              status: 'success',
              draft_id: draft.id,
              row_count: draft.rows.length,
              column_count: draft.columns.length,
            });
            return draft;
          } catch (error) {
            if (isReportDraftGenerationUnavailableError(error)) {
              draftBlockedReason = error.message;
              safeSetOutput(mcpSpan, {
                status: 'blocked',
                code: error.code,
                reason: error.message,
              });
              return undefined;
            }
            throw error;
          }
        }, { name: 'xiaoqiao.zhitou.mcp', type: SpanKind.Tool });
      }

      if (parsed.shouldCreateShareLink) {
        shareLink = `https://xiaoqiao.local/share/${Date.now().toString(36)}`;
      }
      if (parsed.shouldCreateScreenshot) {
        screenshotHint = '已生成报告截图任务，确认模板结果后可输出分享截图。';
      }

      await safeTraceable(async (llmSpan) => {
        safeSetInput(llmSpan, {
          model: llmSummary.participation.model_name || llmSummary.participation.provider || 'rule-based-report-assistant',
          prompt_summary: truncate(message, 500),
          planned_actions: parsed.nextActions,
        });
        safeSetOutput(llmSpan, {
          output_summary: truncate(llmSummary.text || buildReportAssistantReply(parsed, {
            draft: generatedDraft,
            draftBlockedReason,
            shareLink,
            screenshotHint,
          }), 600),
          status: 'success',
          candidate_questions: llmSummary.output?.candidate_questions || [],
        });
      }, { name: 'xiaoqiao.zhitou.report.template', type: 'custom' as unknown as SpanKind });

      const finalAssistantMessage = llmSummary.text || buildReportAssistantReply(parsed, {
        draft: generatedDraft,
        draftBlockedReason,
        shareLink,
        screenshotHint,
      });

      safeSetOutput(rootSpan, {
        status: 'success',
        final_answer: truncate(finalAssistantMessage, 1000),
        has_draft: Boolean(generatedDraft),
        total_actions: parsed.nextActions.length,
        llm_summary: llmSummary.text,
        llm_participation: llmSummary.participation,
      });

      return parsed;
      }, { name: 'xiaoqiao.zhitou.chat', type: 'custom' as unknown as SpanKind });

    const assistantMessage = buildReportAssistantReply(analysis, {
      draft: generatedDraft,
      draftBlockedReason,
      shareLink,
      screenshotHint,
    });
    const helpResult: HelpResult = {
      question_type: analysis.intakeMode,
      subject: analysis.suggestedTemplateName || '????',
      definition_text: assistantMessage,
      system_path: analysis.suggestedTemplateId,
      source_refs: [],
      confidence_level: analysis.unclearMetrics.length || analysis.unimplementedMetrics.length ? 'medium' : 'high',
      next_actions: analysis.nextActions.map((action) => ({
        action_type: action.includes('??') ? 'ask_followup' : action.includes('??') ? 'upgrade_workflow' : 'view_system',
        label: action,
      })),
      definition: assistantMessage,
      reference_sources: [],
      follow_up_questions: [...analysis.unclearMetrics, ...analysis.unimplementedMetrics],
    };
    const workflowResult: WorkflowResult = {
      result_id: `report-session-${Date.now()}`,
      task_id: workflowTask.task_id,
      result_type: 'help_answer',
      summary: assistantMessage.slice(0, 80),
      structured_payload: helpResult,
      confidence: helpResult.confidence_level,
      next_action: analysis.nextActions[0],
      created_at: new Date().toISOString(),
      kind: 'help',
      next_actions: analysis.nextActions,
      pending_checks: [...analysis.unclearMetrics, ...analysis.unimplementedMetrics],
    };

    await appendWorkflowTaskResult(workflowResult);
    await updateWorkflowRun(workflowTask.task_id, workflowRun.run_id, {
      state: 'completed',
      status: 'completed',
      result_id: workflowResult.result_id,
      completed_at: new Date().toISOString(),
      steps: [],
      metadata: {
        message: truncate(message, 300),
        analysis,
        llm_summary: assistantMessage,
        draft: generatedDraft ? {
          id: generatedDraft.id,
          templateId: generatedDraft.templateId,
          templateName: generatedDraft.templateName,
          reportDate: generatedDraft.reportDate,
        } : undefined,
        llm_participation: {
          use_case: 'request_understanding',
          attachment_count: attachmentSummaries.length,
        },
      },
    });
    await patchWorkflowTask(workflowTask.task_id, {
      summary: assistantMessage.slice(0, 120),
      workflow_state: 'completed',
      status: 'completed',
      latest_result_id: workflowResult.result_id,
    });
    const token = readToken(request);
    if (token) {
      void scheduleRecommendationRefresh({
        token,
        conversationId: workflowTask.conversation_id,
      });
    }

    return NextResponse.json({
      assistantMessage: buildReportAssistantReply(analysis, {
        draft: generatedDraft,
        draftBlockedReason,
        shareLink,
        screenshotHint,
      }),
      analysis,
      draft: generatedDraft,
      metricCatalog: getImplementedMetricCatalog(),
      missingClarifications: analysis.unclearMetrics,
      actionHints: analysis.nextActions,
      shareLink: shareLink || undefined,
      screenshotHint: screenshotHint || undefined,
      taskId: workflowTask.task_id,
      runId: workflowRun.run_id,
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'report session failed',
    }, { status: 500 });
  } finally {
    await flushTrace();
  }
}

import { NextResponse } from 'next/server';
import { SpanKind, cozeLoopTracer } from '@cozeloop/ai';
import { analyzeReportRequirement, buildReportAssistantReply, getImplementedMetricCatalog } from '@/lib/report-agent';
import { createReportDraftFromTemplate, getReportTemplate, listReportTemplates } from '@/lib/report-template-store';
import { buildChatTraceInput, flushTrace, initTrace, truncate } from '@/lib/trace';
import type { ReportDraft } from '@/types';

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
    let shareLink = '';
    let screenshotHint = '';

    const analysis = await cozeLoopTracer.traceable(async (rootSpan) => {
      cozeLoopTracer.setInput(rootSpan, buildChatTraceInput(message, {
        agent_id: 'agent_xiaoqiao_report',
        frontend_params: {
          attachment_count: attachmentSummaries.length,
          report_date: reportDate,
          scene: 'auto-report',
        },
      }));

      const parsed = await cozeLoopTracer.traceable(async (toolSpan) => {
        cozeLoopTracer.setInput(toolSpan, {
          tool_name: 'report_requirement_parser',
          intake_mode_hint: attachmentSummaries.length ? 'attachment' : 'chat',
          prompt_summary: truncate(message, 500),
          attachments: attachmentSummaries.slice(0, 5),
        });
        const result = analyzeReportRequirement(message, templates, attachmentSummaries);
        cozeLoopTracer.setOutput(toolSpan, {
          intake_mode: result.intakeMode,
          suggested_template: result.suggestedTemplateName || '',
          recognized_metric_count: result.recognizedMetrics.length,
          unclear_metric_count: result.unclearMetrics.length,
          unimplemented_metric_count: result.unimplementedMetrics.length,
          should_generate_draft: result.shouldGenerateDraft,
        });
        return result;
      }, { name: 'xiaoqiao.zhitou.tool', type: SpanKind.Tool });

      await cozeLoopTracer.traceable(async (retrievalSpan) => {
        cozeLoopTracer.setInput(retrievalSpan, {
          source: 'metric_catalog',
          query: truncate(message, 500),
        });
        cozeLoopTracer.setOutput(retrievalSpan, {
          recognized_metrics: parsed.recognizedMetrics,
          unclear_metrics: parsed.unclearMetrics,
          unimplemented_metrics: parsed.unimplementedMetrics,
          available_metrics: getImplementedMetricCatalog(),
          matched_template_count: templates.filter(item => item.enabled).length,
        });
      }, { name: 'xiaoqiao.zhitou.retrieval', type: SpanKind.Retriever });

      if (parsed.shouldGenerateDraft && parsed.suggestedTemplateId && !parsed.unclearMetrics.length && !parsed.unimplementedMetrics.length) {
        generatedDraft = await cozeLoopTracer.traceable(async (mcpSpan) => {
          const templateId = parsed.suggestedTemplateId as string;
          cozeLoopTracer.setInput(mcpSpan, {
            mcp_server: 'report-orchestrator',
            tool: 'compose_report_draft',
            template_id: templateId,
            report_date: reportDate,
          });
          const template = await getReportTemplate(templateId);
          if (!template) {
            throw new Error('report template not found');
          }
          const draft = await createReportDraftFromTemplate(template, reportDate);
          cozeLoopTracer.setOutput(mcpSpan, {
            status: 'success',
            draft_id: draft.id,
            row_count: draft.rows.length,
            column_count: draft.columns.length,
          });
          return draft;
        }, { name: 'xiaoqiao.zhitou.mcp', type: SpanKind.Tool });
      }

      if (parsed.shouldCreateShareLink) {
        shareLink = `https://xiaoqiao.local/share/${Date.now().toString(36)}`;
      }
      if (parsed.shouldCreateScreenshot) {
        screenshotHint = '已生成报表截图任务，可在确认草稿后输出共享用截图。';
      }

      await cozeLoopTracer.traceable(async (llmSpan) => {
        cozeLoopTracer.setInput(llmSpan, {
          model: 'rule-based-report-assistant',
          prompt_summary: truncate(message, 500),
          planned_actions: parsed.nextActions,
        });
        cozeLoopTracer.setOutput(llmSpan, {
          output_summary: truncate(buildReportAssistantReply(parsed, {
            draft: generatedDraft,
            shareLink,
            screenshotHint,
          }), 600),
          status: 'success',
        });
      }, { name: 'xiaoqiao.zhitou.llm', type: SpanKind.Model });

      cozeLoopTracer.setOutput(rootSpan, {
        status: 'success',
        final_answer: truncate(buildReportAssistantReply(parsed, {
          draft: generatedDraft,
          shareLink,
          screenshotHint,
        }), 1000),
        has_draft: Boolean(generatedDraft),
        total_actions: parsed.nextActions.length,
      });

      return parsed;
    }, { name: 'xiaoqiao.zhitou.chat', type: SpanKind.Tool });

    return NextResponse.json({
      assistantMessage: buildReportAssistantReply(analysis, {
        draft: generatedDraft,
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
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'report session failed',
    }, { status: 500 });
  } finally {
    flushTrace();
  }
}

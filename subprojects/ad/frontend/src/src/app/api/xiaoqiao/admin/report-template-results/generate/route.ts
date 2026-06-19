import { NextRequest, NextResponse } from 'next/server';
import {
  createReportDraftFromTemplate,
  getReportTemplate,
  isReportDraftGenerationUnavailableError,
} from '@/lib/report-template-store';
import { appendWorkflowTaskResult, createWorkflowTask, patchWorkflowTask, startWorkflowRun, updateWorkflowRun } from '@/lib/workflow-task-store';
import type { HelpResult, WorkflowResult } from '@/types';
import { describeFieldChange, logAdminOperation } from '@/lib/admin-operation-log';
import { resolveAdminRequestContext } from '@/lib/admin-request-context';
import { AUTH_TOKEN_COOKIE } from '@/lib/auth-service';
import { scheduleRecommendationRefresh } from '@/lib/recommendation-service';

function readToken(request: NextRequest): string {
  return request.cookies.get(AUTH_TOKEN_COOKIE)?.value || '';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const templateId = String(body.templateId || '');
    const reportDate = String(body.reportDate || '').trim();
    if (!templateId || !reportDate) {
      return NextResponse.json({ error: 'templateId and reportDate are required' }, { status: 400 });
    }

    const template = await getReportTemplate(templateId);
    if (!template) {
      return NextResponse.json({ error: 'report template not found' }, { status: 404 });
    }

    const draft = await createReportDraftFromTemplate(template, reportDate);
    const workflowTask = await createWorkflowTask({
      conversation_id: `report-template-${Date.now()}`,
      task_type: 'report_template_generate',
      workflow_level: 'light',
      owner_type: 'xiaoqiao',
      title: template.name,
      summary: `${template.name} / ${reportDate}`,
      route_reason: 'admin-report-template-generate',
      workflow_state: 'running',
      status: 'running',
    });
    const workflowRun = await startWorkflowRun({
      taskId: workflowTask.task_id,
      conversationId: workflowTask.conversation_id,
      intentType: 'help',
      workflowLevel: 'light',
      routeReason: 'admin-report-template-generate',
      metadata: { templateId, reportDate },
    });
    const assistantMessage = `已生成报告模板结果：${template.name} / ${reportDate}`;
    const helpResult: HelpResult = {
      question_type: 'report_template',
      subject: template.name,
      definition_text: assistantMessage,
      system_path: templateId,
      source_refs: [],
      confidence_level: 'high',
      next_actions: [{ action_type: 'view_source', label: '查看模板结果' }],
      definition: assistantMessage,
      reference_sources: [],
      follow_up_questions: [],
    };
    const workflowResult: WorkflowResult = {
      result_id: `report-template-${Date.now()}`,
      task_id: workflowTask.task_id,
      result_type: 'help_answer',
      summary: assistantMessage,
      structured_payload: helpResult,
      confidence: 'high',
      next_action: '查看模板结果',
      created_at: new Date().toISOString(),
      kind: 'help',
      next_actions: ['查看模板结果'],
      pending_checks: [],
    };
    await appendWorkflowTaskResult(workflowResult);
    await updateWorkflowRun(workflowTask.task_id, workflowRun.run_id, {
      state: 'completed',
      status: 'completed',
      result_id: workflowResult.result_id,
      completed_at: new Date().toISOString(),
      steps: [],
      metadata: { templateId, reportDate },
    });
    await patchWorkflowTask(workflowTask.task_id, {
      summary: assistantMessage,
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

    const context = await resolveAdminRequestContext(request);
    if (context) {
      await logAdminOperation({
        context,
        module: 'report_template',
        action: 'generate',
        targetType: 'report-template',
        targetId: template.id,
        targetName: template.name,
        summary: 'generate report template result ' + template.name,
        changes: [
          describeFieldChange('templateId', undefined, templateId),
          describeFieldChange('reportDate', undefined, reportDate),
        ],
        detail: assistantMessage,
      });
    }

    return NextResponse.json(draft, { status: 201 });
  } catch (error) {
    if (isReportDraftGenerationUnavailableError(error)) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'report template generation failed' },
      { status: 500 },
    );
  }
}

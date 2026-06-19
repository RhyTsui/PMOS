import { NextResponse } from 'next/server';
import { describeFieldChange, logAdminOperation } from '@/lib/admin-operation-log';
import { resolveAdminRequestContext } from '@/lib/admin-request-context';
import {
  loadReportQueryPolicySync,
  saveReportQueryPolicy,
  type ReportQueryProjectResolutionPolicy,
} from '@/lib/report-query-policy-store';

export async function GET(request: Request) {
  const context = await resolveAdminRequestContext(request);
  if (!context) return NextResponse.json({ message: '请先登录' }, { status: 401 });
  if (!context.access.can_view_admin && !context.access.can_operate_admin) {
    return NextResponse.json({ message: '无权查看报表问数策略' }, { status: 403 });
  }
  return NextResponse.json(loadReportQueryPolicySync());
}

export async function PUT(request: Request) {
  const context = await resolveAdminRequestContext(request);
  if (!context) return NextResponse.json({ message: '请先登录' }, { status: 401 });
  if (!context.access.can_operate_admin) {
    return NextResponse.json({ message: '无权修改报表问数策略' }, { status: 403 });
  }

  const before = loadReportQueryPolicySync();
  const body = await request.json().catch(() => ({})) as Partial<ReportQueryProjectResolutionPolicy>;
  const config = await saveReportQueryPolicy(body);

  await logAdminOperation({
    context,
    module: 'report_query_policy',
    action: 'update',
    targetType: 'report-query-policy',
    targetId: config.lookup_tool_step_key,
    targetName: '报表问数项目解析策略',
    summary: '更新报表问数项目解析策略',
    changes: [
      describeFieldChange('enabled', before.enabled, config.enabled),
      describeFieldChange('lookup_tool_keywords', before.lookup_tool_keywords.join(','), config.lookup_tool_keywords.join(',')),
      describeFieldChange('trigger_terms', before.trigger_terms.join(','), config.trigger_terms.join(',')),
      describeFieldChange('require_chinese_project_name', before.require_chinese_project_name, config.require_chinese_project_name),
      describeFieldChange('semantic_defaults', before.semantic_defaults, config.semantic_defaults),
    ],
  });

  return NextResponse.json(config);
}

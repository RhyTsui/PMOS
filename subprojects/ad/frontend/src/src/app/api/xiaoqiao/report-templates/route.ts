import { NextResponse } from 'next/server';
import { listReportTemplates } from '@/lib/report-template-store';
import { resolveUserScopeFromRequest } from '@/lib/user-scope';

export async function GET(request: Request) {
  const scope = await resolveUserScopeFromRequest(request);
  if (!scope) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const templates = await listReportTemplates();
  return NextResponse.json(templates.filter((template) => template.enabled));
}

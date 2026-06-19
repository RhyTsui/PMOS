import { NextResponse } from 'next/server';
import { listMcpServers } from '@/lib/mcp-server-store';
import { buildReportCapabilityManifest } from '@/lib/report-capability-manifest';
import { resolveAdminRequestContext } from '@/lib/admin-request-context';

export async function GET(request: Request) {
  const context = await resolveAdminRequestContext(request);
  if (!context) return NextResponse.json({ message: '请先登录' }, { status: 401 });
  if (!context.access.can_view_admin && !context.access.can_operate_admin) {
    return NextResponse.json({ message: '无权查看报表能力清单' }, { status: 403 });
  }

  const servers = await listMcpServers();
  const manifest = buildReportCapabilityManifest(servers);
  return NextResponse.json({
    ...manifest,
    summary: {
      report_tool_count: manifest.tools.length,
      dictionary_tool_count: manifest.dictionary_tools.length,
      warning_count: manifest.warnings.length,
      domains: manifest.tools.reduce<Record<string, number>>((acc, item) => {
        for (const domain of item.report_domains) acc[domain] = (acc[domain] || 0) + 1;
        return acc;
      }, {}),
    },
  });
}

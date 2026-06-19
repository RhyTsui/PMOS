import { NextResponse } from 'next/server';
import {
  loadControlledGlossaryIndexSync,
  syncControlledGlossaryIndexFromKnowledgeBase,
} from '@/lib/controlled-glossary-index';
import { logAdminOperation } from '@/lib/admin-operation-log';
import { resolveAdminRequestContext } from '@/lib/admin-request-context';

export async function GET(request: Request) {
  const context = await resolveAdminRequestContext(request);
  if (!context) return NextResponse.json({ message: '请先登录' }, { status: 401 });
  if (!context.access.can_view_admin && !context.access.can_operate_admin) {
    return NextResponse.json({ message: '无权查看受控术语索引' }, { status: 403 });
  }
  return NextResponse.json(loadControlledGlossaryIndexSync());
}

export async function POST(request: Request) {
  const context = await resolveAdminRequestContext(request);
  if (!context) return NextResponse.json({ message: '请先登录' }, { status: 401 });
  if (!context.access.can_operate_admin) {
    return NextResponse.json({ message: '无权同步受控术语索引' }, { status: 403 });
  }
  const result = await syncControlledGlossaryIndexFromKnowledgeBase();
  await logAdminOperation({
    context,
    module: 'controlled_glossary',
    action: 'sync',
    targetType: 'controlled-glossary-index',
    targetId: result.index?.index_version || 'not-updated',
    targetName: '受控术语索引',
    summary: result.message,
    changes: [
      `sync_status: ${result.status}`,
      `term_count: ${result.index?.terms.length || 0}`,
    ],
  });
  const status = result.status === 'failed' ? 400 : 200;
  return NextResponse.json(result, { status });
}

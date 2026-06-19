import { NextRequest, NextResponse } from 'next/server';
import { retryAttachmentParse } from '@/lib/attachment-store';
import { resolveUserScopeFromRequest } from '@/lib/user-scope';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ attachment_id: string }> },
) {
  const scope = await resolveUserScopeFromRequest(request);
  if (!scope) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { attachment_id } = await params;
  const attachment = await retryAttachmentParse(attachment_id, scope.key);

  if (!attachment) {
    return NextResponse.json({
      error: 'attachment_not_found',
      message: '没有找到该附件。',
    }, { status: 404 });
  }

  return NextResponse.json(attachment);
}

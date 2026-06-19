import { NextRequest, NextResponse } from 'next/server';
import { getAttachmentFilePayload } from '@/lib/attachment-store';
import { resolveUserScopeFromRequest } from '@/lib/user-scope';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ attachment_id: string }> },
) {
  const scope = await resolveUserScopeFromRequest(request);
  if (!scope) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { attachment_id } = await params;
  const payload = await getAttachmentFilePayload(attachment_id, scope.key, 'file');
  if (!payload) {
    return NextResponse.json({ error: 'attachment_not_found' }, { status: 404 });
  }

  return new NextResponse(payload.buffer, {
    headers: {
      'Content-Type': payload.contentType || 'application/octet-stream',
      'Content-Disposition': `inline; filename="${encodeURIComponent(payload.fileName)}"`,
      'Cache-Control': 'private, max-age=3600',
    },
  });
}

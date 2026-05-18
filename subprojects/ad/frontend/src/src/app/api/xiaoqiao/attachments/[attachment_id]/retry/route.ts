import { NextRequest, NextResponse } from 'next/server';
import { retryAttachmentParse } from '@/lib/attachment-store';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ attachment_id: string }> },
) {
  const { attachment_id } = await params;
  const attachment = await retryAttachmentParse(attachment_id);

  if (!attachment) {
    return NextResponse.json({
      error: 'attachment_not_found',
      message: '没有找到该附件。',
    }, { status: 404 });
  }

  return NextResponse.json(attachment);
}

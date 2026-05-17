import { NextRequest, NextResponse } from 'next/server';
import { deleteAttachment, getAttachment } from '@/lib/attachment-store';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ attachment_id: string }> },
) {
  const { attachment_id } = await params;
  const attachment = await getAttachment(attachment_id);

  if (!attachment) {
    return NextResponse.json({
      error: 'attachment_not_found',
      message: '没有找到该附件。',
    }, { status: 404 });
  }

  return NextResponse.json(attachment);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ attachment_id: string }> },
) {
  const { attachment_id } = await params;
  const success = await deleteAttachment(attachment_id);
  return NextResponse.json({ success });
}

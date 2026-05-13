import { NextResponse } from 'next/server';
import type { AttachmentRecord } from '@/types';

export async function POST(
  request: Request,
  { params }: { params: Promise<unknown> },
) {
  const { id } = await params as { id: string };
  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const now = new Date().toISOString();
  const attachment: AttachmentRecord = {
    id: `att-${Date.now()}`,
    conversation_id: id,
    name: file?.name || '未命名文件',
    filename: file?.name || '未命名文件',
    kind: file?.type.startsWith('image/') ? 'image' : 'document',
    type: file?.type.startsWith('image/') ? 'image' : 'document',
    mime_type: file?.type || 'application/octet-stream',
    size: file?.size || 0,
    status: 'uploaded',
    source_type: 'click',
    created_at: now,
  };
  return NextResponse.json(attachment, { status: 201 });
}

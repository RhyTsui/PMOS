import { NextResponse } from 'next/server';
import { createAttachment, listAttachments } from '@/lib/attachment-store';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return NextResponse.json(await listAttachments(id));
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const formData = await request.formData();
  const file = formData.get('file');
  const sourceType = formData.get('source_type');

  if (!(file instanceof File)) {
    return NextResponse.json({
      error: 'file_required',
      message: '请上传有效文件。',
    }, { status: 400 });
  }

  const attachment = await createAttachment(
    id,
    file,
    sourceType === 'drag' || sourceType === 'paste' ? sourceType : 'click',
  );

  return NextResponse.json(attachment, { status: 201 });
}

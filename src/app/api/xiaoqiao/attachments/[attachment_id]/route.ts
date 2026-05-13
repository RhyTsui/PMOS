import { NextRequest, NextResponse } from 'next/server';

// DELETE /api/xiaoqiao/attachments/[attachment_id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ attachment_id: string }> }
) {
  const { attachment_id } = await params;
  void attachment_id;

  // Demo mode: acknowledge deletion
  return NextResponse.json({ success: true });
}

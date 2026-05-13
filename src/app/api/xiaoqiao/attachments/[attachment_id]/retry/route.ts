import { NextRequest, NextResponse } from 'next/server';

// POST /api/xiaoqiao/attachments/[attachment_id]/retry
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ attachment_id: string }> }
) {
  const { attachment_id } = await params;

  // Demo mode: return updated attachment
  return NextResponse.json({
    id: attachment_id,
    status: 'parsed',
    summary: `[Demo] 附件重试解析成功`,
    updated_at: new Date().toISOString(),
  });
}

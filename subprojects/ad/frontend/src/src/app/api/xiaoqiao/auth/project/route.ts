import { NextRequest, NextResponse } from 'next/server';
import { AUTH_TOKEN_COOKIE, resetAiadProject } from '@/lib/auth-service';

export async function POST(request: NextRequest) {
  const token = request.cookies.get(AUTH_TOKEN_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ message: '请先登录' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const projectId = body.project_id;
  if (typeof projectId !== 'string' && typeof projectId !== 'number') {
    return NextResponse.json({ message: '请选择项目' }, { status: 400 });
  }

  try {
    return NextResponse.json(await resetAiadProject(token, projectId));
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : '项目切换失败' },
      { status: 500 },
    );
  }
}

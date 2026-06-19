import { NextResponse } from 'next/server';
import { getChatDisplayConfig, updateChatDisplayConfig } from '@/lib/runtime-config';
import { describeFieldChange, logAdminOperation } from '@/lib/admin-operation-log';
import { resolveAdminRequestContext } from '@/lib/admin-request-context';

export async function GET(request: Request) {
  const context = await resolveAdminRequestContext(request);
  if (!context) {
    return NextResponse.json({ message: '请先登录' }, { status: 401 });
  }
  if (!context.access.can_view_admin && !context.access.can_operate_admin) {
    return NextResponse.json({ message: '无权查看会话展示配置' }, { status: 403 });
  }
  const config = await getChatDisplayConfig();
  return NextResponse.json(config);
}

export async function PUT(request: Request) {
  const context = await resolveAdminRequestContext(request);
  if (!context) {
    return NextResponse.json({ message: '请先登录' }, { status: 401 });
  }
  if (!context.access.can_operate_admin) {
    return NextResponse.json({ message: '无权操作会话展示配置' }, { status: 403 });
  }
  const before = await getChatDisplayConfig();
  const body = await request.json();
  const config = await updateChatDisplayConfig(body);
  await logAdminOperation({
    context,
    module: 'chat_display',
    action: 'update',
    targetType: 'chat-display-config',
    targetId: 'chat-display',
    targetName: '会话展示配置',
    summary: '更新会话展示配置',
    changes: [
      describeFieldChange('欢迎语', before.welcomeText, config.welcomeText),
      describeFieldChange('欢迎语池', before.welcomeTexts, config.welcomeTexts),
      describeFieldChange('快捷标题', before.quickTitle, config.quickTitle),
      describeFieldChange('快捷说明', before.quickHint, config.quickHint),
      describeFieldChange('任务标题', before.taskPanelTitle, config.taskPanelTitle),
    ],
  });
  return NextResponse.json({ success: true, config });
}

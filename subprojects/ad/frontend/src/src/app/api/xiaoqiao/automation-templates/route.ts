import { NextResponse } from 'next/server';
import { listTaskTemplates } from '@/contracts/automation/task-template-registry';
import { resolveUserScopeFromRequest } from '@/lib/user-scope';

/**
 * GET /api/xiaoqiao/automation-templates
 *
 * 用户侧模板列表（只读）。返回 4 类标准模板的公开信息。
 */
export async function GET(request: Request) {
  const scope = await resolveUserScopeFromRequest(request);
  if (!scope) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const templates = listTaskTemplates().map((t) => ({
    template_id: t.template_id,
    name: t.name,
    description: t.description,
    risk_level: t.risk_level,
    required_slots: t.required_slots.map((s) => ({
      key: s.key,
      label: s.label,
      description: s.description,
      required: s.required,
    })),
    intent_keywords: t.intent_keywords,
  }));

  return NextResponse.json({ templates });
}

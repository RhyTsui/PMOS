import { NextResponse } from 'next/server';
import { describeFieldChange, logAdminOperation } from '@/lib/admin-operation-log';
import { resolveAdminRequestContext } from '@/lib/admin-request-context';
import {
  loadIntentRouteRulesSync,
  rollbackIntentRouteRules,
  updateIntentRouteRules,
} from '@/lib/intent-route-rules-store';
import { normalizeIntentRouteRule, type IntentRouteRule } from '@/lib/intent-route-rules';

export async function GET(request: Request) {
  const context = await resolveAdminRequestContext(request);
  if (!context) {
    return NextResponse.json({ message: '请先登录' }, { status: 401 });
  }
  if (!context.access.can_view_admin && !context.access.can_operate_admin) {
    return NextResponse.json({ message: '无权查看意图规则' }, { status: 403 });
  }
  return NextResponse.json(loadIntentRouteRulesSync());
}

export async function PUT(request: Request) {
  const context = await resolveAdminRequestContext(request);
  if (!context) {
    return NextResponse.json({ message: '请先登录' }, { status: 401 });
  }
  if (!context.access.can_operate_admin) {
    return NextResponse.json({ message: '无权修改意图规则' }, { status: 403 });
  }

  const before = loadIntentRouteRulesSync();
  const body = await request.json().catch(() => ({})) as { rules?: Partial<IntentRouteRule>[]; note?: string };
  const rules = Array.isArray(body.rules)
    ? body.rules.map((rule, index) => normalizeIntentRouteRule(rule, `rule-${index + 1}`))
    : before.rules;
  const config = await updateIntentRouteRules(rules, body.note || '后台更新意图规则');

  await logAdminOperation({
    context,
    module: 'intent_route_rules',
    action: 'update',
    targetType: 'intent-route-rules',
    targetId: `v${config.current_version}`,
    targetName: '意图规则',
    summary: '更新意图规则配置',
    changes: [
      describeFieldChange('version', before.current_version, config.current_version),
      describeFieldChange('rule_count', before.rules.length, config.rules.length),
    ],
  });

  return NextResponse.json(config);
}

export async function POST(request: Request) {
  const context = await resolveAdminRequestContext(request);
  if (!context) {
    return NextResponse.json({ message: '请先登录' }, { status: 401 });
  }
  if (!context.access.can_operate_admin) {
    return NextResponse.json({ message: '无权回滚意图规则' }, { status: 403 });
  }

  const before = loadIntentRouteRulesSync();
  const body = await request.json().catch(() => ({})) as { action?: string; version?: number };
  if (body.action !== 'rollback' || typeof body.version !== 'number') {
    return NextResponse.json({ message: '不支持的操作' }, { status: 400 });
  }
  const config = await rollbackIntentRouteRules(body.version);
  if (!config) {
    return NextResponse.json({ message: '版本不存在' }, { status: 404 });
  }

  await logAdminOperation({
    context,
    module: 'intent_route_rules',
    action: 'rollback',
    targetType: 'intent-route-rules',
    targetId: `v${body.version}`,
    targetName: '意图规则',
    summary: `回滚意图规则到 v${body.version}`,
    changes: [
      describeFieldChange('version', before.current_version, config.current_version),
      describeFieldChange('rollback_target', undefined, body.version),
    ],
  });

  return NextResponse.json(config);
}

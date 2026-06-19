import { NextRequest, NextResponse } from 'next/server';
import { listAdminUsers } from '@/lib/admin-access-store';
import { describeFieldChange, logAdminOperation } from '@/lib/admin-operation-log';
import { resolveAdminRequestContext } from '@/lib/admin-request-context';
import { getUserScopeKey } from '@/lib/user-scope';
import {
  ensureUserPreferenceProfile,
  summarizePreferenceProfile,
  updateUserPreferenceProfile,
} from '@/lib/user-preference-store';
import type { UserPreferenceProfile } from '@/types';

async function resolveTargetUser(scopeKey: string) {
  const users = await listAdminUsers();
  return users.find((user) => user.id === scopeKey) || null;
}

function toStringArray(value: unknown): string[] | undefined {
  return Array.isArray(value) ? value.map((item) => String(item)) : undefined;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await resolveAdminRequestContext(request);
  if (!context) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!context.access.can_view_admin) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const target = await resolveTargetUser(id);
  if (!target) {
    return NextResponse.json({ error: 'user_not_found' }, { status: 404 });
  }

  const scopeKey = getUserScopeKey(target);
  const profile = await ensureUserPreferenceProfile(scopeKey);
  return NextResponse.json({
    profile,
    summary: summarizePreferenceProfile(profile),
  });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await resolveAdminRequestContext(request);
  if (!context) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!context.access.can_manage_users) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const target = await resolveTargetUser(id);
  if (!target) {
    return NextResponse.json({ error: 'user_not_found' }, { status: 404 });
  }
  const scopeKey = getUserScopeKey(target);
  const currentProfile = await ensureUserPreferenceProfile(scopeKey);

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const inferredPreferences = typeof body.inferredPreferences === 'object' && body.inferredPreferences
    ? body.inferredPreferences as Record<string, unknown>
    : undefined;
  const next = await updateUserPreferenceProfile(scopeKey, {
    defaultRole: typeof body.defaultRole === 'string' ? body.defaultRole.trim() : undefined,
    currentRole: typeof body.currentRole === 'string' ? body.currentRole.trim() : undefined,
    activePreferences: Array.isArray(body.activePreferences) ? body.activePreferences.map((item) => String(item)) : undefined,
    inferredPreferences: inferredPreferences
      ? {
        outputStyle: toStringArray(inferredPreferences.outputStyle) || currentProfile.inferredPreferences.outputStyle,
        analysisFocus: toStringArray(inferredPreferences.analysisFocus) || currentProfile.inferredPreferences.analysisFocus,
        riskBias: toStringArray(inferredPreferences.riskBias) || currentProfile.inferredPreferences.riskBias,
        explanationDepth: typeof inferredPreferences.explanationDepth === 'string'
          ? String(inferredPreferences.explanationDepth)
          : currentProfile.inferredPreferences.explanationDepth,
        decisionStyle: typeof inferredPreferences.decisionStyle === 'string'
          ? String(inferredPreferences.decisionStyle)
          : currentProfile.inferredPreferences.decisionStyle,
      }
      : undefined,
    confidence: typeof body.confidence === 'object' && body.confidence ? body.confidence as Record<string, number> : undefined,
    roleHistory: Array.isArray(body.roleHistory)
      ? body.roleHistory.map((item) => ({
        role: String((item as Record<string, unknown>).role || ''),
        source: ['login', 'manual', 'inferred', 'system'].includes(String((item as Record<string, unknown>).source || ''))
          ? String((item as Record<string, unknown>).source) as 'login' | 'manual' | 'inferred' | 'system'
          : 'manual',
        updatedAt: String((item as Record<string, unknown>).updatedAt || new Date().toISOString()),
        reason: typeof (item as Record<string, unknown>).reason === 'string' ? String((item as Record<string, unknown>).reason) : undefined,
      }))
      : undefined,
  });

  if (!next) {
    return NextResponse.json({ error: 'update_failed' }, { status: 400 });
  }

  await logAdminOperation({
    context,
    module: 'user_preference',
    action: 'update',
    targetType: 'user',
    targetId: target.id,
    targetName: target.real_name || target.user_name || target.account,
    summary: 'update user preference ' + (target.real_name || target.user_name || target.account),
    changes: [
      describeFieldChange('defaultRole', undefined, next.defaultRole),
      describeFieldChange('currentRole', undefined, next.currentRole),
    ],
  });

  return NextResponse.json({
    profile: next,
    summary: summarizePreferenceProfile(next),
  });
}

import { NextResponse } from 'next/server';
import { listConversations } from '@/lib/conversation-store';
import { listFeatureSwitches } from '@/lib/feature-switch-store';
import { listSkills } from '@/lib/skill-store';
import { listWorkflowTasks, listWorkflowTaskResults } from '@/lib/workflow-task-store';
import { resolveUserScopeFromRequest } from '@/lib/user-scope';
import { ensureUserPreferenceProfile, summarizePreferenceProfile } from '@/lib/user-preference-store';
import { getRoleProfile } from '@/lib/role-profile-store';

export async function GET(request: Request) {
  const scope = await resolveUserScopeFromRequest(request);
  if (!scope) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const [conversations, tasks, skills, featureSwitches] = await Promise.all([
    listConversations(scope.key),
    listWorkflowTasks(),
    listSkills(),
    listFeatureSwitches(),
  ]);
  const preferenceProfile = await ensureUserPreferenceProfile(scope.key);
  const roleProfile = await getRoleProfile(preferenceProfile.currentRole || preferenceProfile.defaultRole);

  const ownedConversationIds = new Set(conversations.map((conversation) => conversation.conversation_id));
  const scopedTasks = tasks.filter((task) => ownedConversationIds.has(task.conversation_id));
  const recentTasks = scopedTasks.slice(0, 5);
  const recentResults = await Promise.all(
    recentTasks.map(async (task) => {
      const results = await listWorkflowTaskResults(task.task_id);
      return results[results.length - 1];
    }),
  );

  return NextResponse.json({
    user_id: conversations[0]?.user_id || scope.key,
    user_name: scope.user_name,
    status_summary: '可用',
    quick_modes: ['help', 'demand', 'diagnosis', 'debugging'],
    recent_tasks: recentTasks,
    app_support_summary: skills.filter((skill) => skill.installed).slice(0, 5).map((skill) => skill.name),
    conversation_count: conversations.length,
    task_count: scopedTasks.length,
    current_mode: conversations[0]?.current_mode || 'natural-chat',
    capabilities: [
      ...new Set([
        ...skills.filter((skill) => skill.installed).map((skill) => skill.category),
        ...featureSwitches.filter((item) => item.enabled).map((item) => item.key),
      ]),
    ].filter(Boolean),
    feature_switches: featureSwitches.map((item) => ({
      key: item.key,
      label: item.name,
      enabled: item.enabled,
      scope: 'global',
    })),
    recent_results: recentResults.filter(Boolean),
    current_role: preferenceProfile.currentRole || preferenceProfile.defaultRole,
    role_profile: roleProfile || null,
    preference_profile: preferenceProfile,
    preference_summary: summarizePreferenceProfile(preferenceProfile),
  });
}

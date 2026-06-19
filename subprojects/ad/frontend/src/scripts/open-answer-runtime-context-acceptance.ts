import assert from 'node:assert/strict';
import { addMessage, createConversation, deleteConversation } from '../src/lib/conversation-store';
import { runChatRuntimeForEvaluation } from '../src/lib/evaluation-runtime-runner';
import { getModelServiceConfig, getPublicWebConfig, updateModelServiceConfig, updatePublicWebConfig, withRuntimeConfigOverrides } from '../src/lib/runtime-config';
import { getTraceConfigSync, updateTraceConfig } from '../src/lib/trace-config-store';
import { createUserMemory, deleteUserMemory } from '../src/lib/user-memory-store';

type FetchInput = Parameters<typeof fetch>[0];
type FetchInit = Parameters<typeof fetch>[1];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function fetchInputToUrl(input: FetchInput): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

async function withMockedFetch<T>(
  handler: (input: FetchInput, init?: FetchInit) => Promise<Response> | Response,
  run: () => Promise<T>,
): Promise<T> {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: FetchInput, init?: FetchInit) => handler(input, init)) as typeof fetch;
  try {
    return await run();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

function getResponseContract(result: Awaited<ReturnType<typeof runChatRuntimeForEvaluation>>): Record<string, unknown> {
  const metadata = isRecord(result.done_payload?.metadata) ? result.done_payload.metadata : {};
  return isRecord(metadata.response_contract) ? metadata.response_contract : {};
}

function getResponseMetadata(responseContract: Record<string, unknown>): Record<string, unknown> {
  return isRecord(responseContract.metadata) ? responseContract.metadata : {};
}

function getPlanningMetadata(responseMetadata: Record<string, unknown>): Record<string, unknown> {
  return isRecord(responseMetadata.open_answer_planning) ? responseMetadata.open_answer_planning : {};
}

function findCandidate(arbitration: Record<string, unknown>, source: string): Record<string, unknown> {
  const candidates = Array.isArray(arbitration.candidates) ? arbitration.candidates.filter(isRecord) : [];
  return candidates.find(candidate => candidate.source === source) || {};
}

async function main(): Promise<void> {
  const originalModelServiceConfig = await getModelServiceConfig();
  const originalPublicWebConfig = await getPublicWebConfig();
  const originalTraceConfig = getTraceConfigSync();
  const runtimeUserScopeKey = 'acct-evaluation-runtime';
  const conversationId = `eval-context-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const createdMemoryIds: string[] = [];
  const createdConversationIds: string[] = [];

  await withRuntimeConfigOverrides({}, async () => {
  try {
    await updatePublicWebConfig({
      ...originalPublicWebConfig,
      enabled: false,
      searchEndpoint: '',
    });
    await updateTraceConfig({
      ...originalTraceConfig,
      enabled: false,
    });
    await updateModelServiceConfig({
      ...originalModelServiceConfig,
      enabled: true,
      knowledgeBaseUrl: 'https://knowledge.test.local',
      knowledgeBaseApiKey: 'knowledge-test-key',
      knowledgeBaseDataset: 'kb-runtime-context',
      modelProfiles: (originalModelServiceConfig.modelProfiles || []).map(profile => ({ ...profile, enabled: false })),
      routes: {
        ...(originalModelServiceConfig.routes || {}),
        chat_answer: {
          ...(originalModelServiceConfig.routes?.chat_answer || { useCase: 'chat_answer' }),
          useCase: 'chat_answer',
          enabled: false,
          routeMode: 'disabled',
        },
        requirement_drafting: {
          ...(originalModelServiceConfig.routes?.requirement_drafting || { useCase: 'requirement_drafting' }),
          useCase: 'requirement_drafting',
          enabled: false,
          routeMode: 'disabled',
        },
      },
    });

    const memory = await createUserMemory({
      user_id: runtimeUserScopeKey,
      memory_type: 'preference',
      source: 'system_default',
      content: '用户偏好简洁风格，整理增长实验复盘时先给结论，再给依据和下一步。',
      keywords: ['简洁', '增长实验', '复盘', '结论'],
      business_domain: 'open_answer',
      importance: 5,
    });
    createdMemoryIds.push(memory.id);

    const previousConversation = await createConversation(runtimeUserScopeKey, { title: '增长实验复盘上下文' });
    createdConversationIds.push(previousConversation.conversation_id);
    await addMessage(previousConversation.conversation_id, {
      role: 'user',
      content: '继续整理增长实验复盘，重点关注转化漏斗和结论结构。',
    }, runtimeUserScopeKey);

    await withMockedFetch(
      (input, init) => {
        const url = fetchInputToUrl(input);
        if (url.includes('/aiad-auth/user/info')) {
          return new Response(JSON.stringify({
            code: 200,
            data: {
              uid: 100000,
              account: 'evaluation-runtime',
              user_name: 'evaluation-runtime',
              real_name: '评估运行',
              projects: [],
            },
          }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        if (url.includes('/aiad-setting/v2/user/ability')) {
          return new Response(JSON.stringify({ code: 200, data: null }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        if (url.includes('/knowledge-search')) {
          const bodyText = typeof init?.body === 'string' ? init.body : '';
          const body = bodyText ? JSON.parse(bodyText) as Record<string, unknown> : {};
          const query = String(body.query || '');
          if (/不要按简洁/.test(query)) {
            return new Response(JSON.stringify({ data: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
          }
          return new Response(JSON.stringify({
            data: [
              {
                title: '内部复盘说明',
                content: '增长实验复盘应先说明结论，再给关键证据、口径边界和建议动作。',
                score: 0.92,
                document_id: 'doc-runtime-context',
              },
            ],
          }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        return new Response(JSON.stringify({ data: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      },
      async () => {
        const result = await runChatRuntimeForEvaluation({
          conversationId,
          message: '请继续按简洁风格整理增长实验复盘，并参考内部说明',
          scenario: 'general_chat',
        });
        const responseContract = getResponseContract(result);
        const responseMetadata = getResponseMetadata(responseContract);
        const planning = getPlanningMetadata(responseMetadata);
        const arbitration = isRecord(responseMetadata.info_source_arbitration) ? responseMetadata.info_source_arbitration : {};
        const knowledgeCandidate = findCandidate(arbitration, 'knowledge');
        const publicWebCandidate = findCandidate(arbitration, 'public_web');
        const contextCandidate = findCandidate(arbitration, 'context');
        const contextSelection = isRecord(planning.context_selection) ? planning.context_selection : {};
        const memorySelection = isRecord(contextSelection.memory) ? contextSelection.memory : {};
        const recentSelection = isRecord(contextSelection.recent_conversations) ? contextSelection.recent_conversations : {};
        const plannerCandidates = Array.isArray(planning.planner_candidates) ? planning.planner_candidates.filter(isRecord) : [];
        const knowledgePlannerCandidate = plannerCandidates.find(candidate => candidate.source === 'knowledge') || {};
        const planningAudit = result.process_events.find(event => event.type === 'model.step' && /开放式回答仲裁/.test(event.label || ''));

        assert.equal(responseContract.evidence_mode, 'mixed_grounded', 'knowledge plus memory/history context should be explicit mixed_grounded evidence');
        assert.equal(arbitration.selected_source, 'knowledge', 'knowledge should be selected when internal tool is not required and knowledge hit exists');
        assert.equal(knowledgeCandidate.status, 'selected', 'knowledge candidate should be selected');
        assert.equal(knowledgeCandidate.role, 'primary_answer', 'knowledge should be primary answer evidence');
        assert.equal(isRecord(knowledgeCandidate.metadata) ? knowledgeCandidate.metadata.hit_count : undefined, 1, 'knowledge metadata should expose hit count');
        assert(
          publicWebCandidate.status === 'not_evaluated' || publicWebCandidate.status === 'rejected',
          'public web should not be used for internal knowledge/context answer',
        );
        assert.equal(contextCandidate.status, 'candidate', 'memory/history should be recorded as context candidate');
        assert(
          Number(memorySelection.selected_count || 0) >= 1,
          `memory selection should include the relevant preference: ${JSON.stringify(memorySelection)}`,
        );
        assert(
          Number(recentSelection.selected_count || 0) >= 1,
          `recent conversation selection should include related context: ${JSON.stringify(recentSelection)}`,
        );
        assert.equal(knowledgePlannerCandidate.hit_count, 1, 'planner metadata should include knowledge hit count');
        assert(planningAudit, 'runtime process events should include open answer arbitration audit');

        const conflictResult = await runChatRuntimeForEvaluation({
          conversationId,
          message: '这次不要按简洁风格，请详细展开增长实验复盘',
          scenario: 'general_chat',
        });
        const conflictResponseContract = getResponseContract(conflictResult);
        const conflictResponseMetadata = getResponseMetadata(conflictResponseContract);
        const conflictPlanning = getPlanningMetadata(conflictResponseMetadata);
        const conflictContextSelection = isRecord(conflictPlanning.context_selection) ? conflictPlanning.context_selection : {};
        const conflictMemorySelection = isRecord(conflictContextSelection.memory) ? conflictContextSelection.memory : {};
        const conflictSelectedIds = Array.isArray(conflictMemorySelection.selected_ids)
          ? conflictMemorySelection.selected_ids.map(String)
          : [];
        const conflictRejected = Array.isArray(conflictMemorySelection.rejected)
          ? conflictMemorySelection.rejected.filter(isRecord)
          : [];
        const rejectedMemory = conflictRejected.find(item => item.id === memory.id) || {};

        assert(!conflictSelectedIds.includes(memory.id), 'current turn explicit constraint must override conflicting memory preference');
        const rejectedReasonText = [
          Array.isArray(rejectedMemory.reasons) ? rejectedMemory.reasons.join('|') : String(rejectedMemory.reasons || ''),
          String(rejectedMemory.reason_codes || ''),
        ].join('|');
        assert(
          rejectedReasonText.includes('explicit_user_constraint_conflict'),
          `conflicting memory should be rejected with an explicit conflict reason: ${JSON.stringify({
            memoryId: memory.id,
            selectedIds: conflictSelectedIds,
            rejected: conflictRejected,
            memorySelection: conflictMemorySelection,
          })}`,
        );
      },
    );
  } finally {
    await updateModelServiceConfig(originalModelServiceConfig);
    await updatePublicWebConfig(originalPublicWebConfig);
    await updateTraceConfig(originalTraceConfig);
    await Promise.all(createdMemoryIds.map(id => deleteUserMemory(id).catch(() => false)));
    await Promise.all(createdConversationIds.map(id => deleteConversation(id, runtimeUserScopeKey).catch(() => false)));
  }
  });

  console.log('open answer runtime context acceptance passed');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

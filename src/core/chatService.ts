import { randomUUID } from 'node:crypto';
import { FileStore } from './fileStore.js';
import { MemoryService, type ContextDocument } from './memoryService.js';
import { SubprojectRegistry } from './subprojectRegistry.js';
import { LlmRouter } from '../llm_router/index.js';
import {
  getProjectMemoryPath,
  type ProjectContext,
} from './projectPaths.js';
import type {
  ChatMessage,
  ChatSession,
  ContextSnapshot,
  ConversationOperatorRole,
  ConversationScopeType,
  ExecutionEvent,
  ExecutionRun,
  WorkspaceEntryType,
} from '../shared/schemas.js';
import { MultimodalRouter } from '../multimodal_engine/router.js';
import { ConversationGovernanceService } from './conversationGovernanceService.js';
import { RequirementService } from './requirementService.js';

type SessionScopeInput = {
  title?: string;
  subprojectId?: string | null;
  operatorRole?: ConversationOperatorRole;
  scopeType?: ConversationScopeType;
  linkedSubprojectIds?: string[];
  workspacePath?: string | null;
};

export class ChatService {
  constructor(
    private readonly store: FileStore,
    private readonly memoryService = new MemoryService(store),
    private readonly subprojectRegistry = new SubprojectRegistry(store),
    private readonly llmRouter = new LlmRouter(store),
    private readonly multimodalRouter = new MultimodalRouter(store),
    private readonly conversationGovernanceService = new ConversationGovernanceService(store, memoryService),
    private readonly requirementService = new RequirementService(memoryService),
  ) {}

  async listSessions(subprojectId?: string | null) {
    const sessionIds = await this.memoryService.listChatSessionIds(subprojectId);
    const sessions = await Promise.all(
      sessionIds.map(async (sessionId) => {
        try {
          return this.normalizeSession(await this.memoryService.loadChatSession(sessionId, subprojectId));
        } catch {
          return null;
        }
      }),
    );

    return sessions
      .filter((session): session is ChatSession => session !== null)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async createSession(input: SessionScopeInput) {
    const inferred = this.inferSessionScope(input);
    const project = await this.subprojectRegistry.resolveProjectContext(inferred.defaultSubprojectId);
    const now = new Date().toISOString();
    const session: ChatSession = {
      id: `chat-${randomUUID()}`,
      title: input.title?.trim() || `${project.projectName} Chat`,
      defaultSubprojectId: inferred.defaultSubprojectId,
      operatorRole: inferred.operatorRole,
      scopeType: inferred.scopeType,
      primarySubprojectId: inferred.primarySubprojectId,
      linkedSubprojectIds: inferred.linkedSubprojectIds,
      workspacePath: inferred.workspacePath,
      workspaceEntryType: inferred.workspaceEntryType,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };

    await this.memoryService.saveChatSession(session);
    return session;
  }

  async loadSession(sessionId: string, subprojectId?: string | null) {
    return this.normalizeSession(await this.memoryService.loadChatSession(sessionId, subprojectId));
  }

  async listMessages(sessionId: string, subprojectId?: string | null) {
    return this.memoryService.loadChatMessages(sessionId, subprojectId);
  }

  async listRuns(sessionId: string, subprojectId?: string | null) {
    const runIds = await this.memoryService.listExecutionRunIds(subprojectId);
    const runs = await Promise.all(
      runIds.map(async (runId) => {
        try {
          return await this.memoryService.loadExecutionRun(runId, subprojectId);
        } catch {
          return null;
        }
      }),
    );

    return runs
      .filter((run): run is ExecutionRun => run !== null && run.sessionId === sessionId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async createUserMessage(
    sessionId: string,
    input: { content: string; subprojectId?: string | null; parentMessageId?: string | null },
  ) {
    const session = this.normalizeSession(await this.memoryService.loadChatSession(sessionId, input.subprojectId));
    const effectiveSubprojectId = this.resolveSubprojectId(session, input.subprojectId);
    const now = new Date().toISOString();
    const message: ChatMessage = {
      id: `msg-${randomUUID()}`,
      sessionId,
      role: 'user',
      content: input.content.trim(),
      createdAt: now,
      parentMessageId: input.parentMessageId ?? null,
      runId: null,
      contextSnapshotId: null,
      subprojectId: effectiveSubprojectId,
    };

    await this.memoryService.appendChatMessage(sessionId, message, effectiveSubprojectId);
    await this.conversationGovernanceService.processUserMessage(sessionId, message);
    await this.memoryService.saveChatSession({ ...session, updatedAt: now });
    return message;
  }

  async respond(sessionId: string, input?: { subprojectId?: string | null; messageId?: string | null }) {
    const session = this.normalizeSession(await this.memoryService.loadChatSession(sessionId, input?.subprojectId));
    const effectiveSubprojectId = this.resolveSubprojectId(session, input?.subprojectId);
    const messages = await this.memoryService.loadChatMessages(sessionId, effectiveSubprojectId);
    const triggerMessage = this.resolveTriggerMessage(messages, input?.messageId ?? null);
    const linkedWorkflowRuns = await this.listScopedWorkflowRuns(session);
    const snapshot = await this.createContextSnapshot(session, messages, effectiveSubprojectId, linkedWorkflowRuns);
    const latestWorkflowRunId = linkedWorkflowRuns[0] ?? null;
    const now = new Date().toISOString();
    const run: ExecutionRun = {
      id: `exec-${randomUUID()}`,
      sessionId,
      subprojectId: effectiveSubprojectId,
      runType: 'workspace_sync',
      parentRunId: null,
      inputMessageId: triggerMessage.id,
      outputMessageIds: [],
      contextSnapshotId: snapshot.id,
      workflowRunId: latestWorkflowRunId,
      linkedWorkflowRunIds: linkedWorkflowRuns.slice(0, 5),
      source: 'workspace',
      status: 'running',
      createdAt: now,
      updatedAt: now,
    };

    await this.memoryService.saveExecutionRun(run);
    await this.memoryService.appendExecutionEvent(run.id, {
      id: `${run.id}-created`,
      runId: run.id,
      sessionId,
      subprojectId: effectiveSubprojectId,
      kind: 'run_created',
      status: 'ok',
      timestamp: now,
      detail: 'Chat execution run created.',
      messageId: triggerMessage.id,
      artifactPath: null,
      workflowRunId: latestWorkflowRunId,
      metadata: {
        source: run.source,
        linkedWorkflowRunIds: run.linkedWorkflowRunIds,
      },
    });
    await this.memoryService.appendExecutionEvent(run.id, {
      id: `${run.id}-context`,
      runId: run.id,
      sessionId,
      subprojectId: effectiveSubprojectId,
      kind: 'context_resolved',
      status: 'ok',
      timestamp: now,
      detail: this.buildContextResolvedDetail(snapshot),
      messageId: triggerMessage.id,
      artifactPath: null,
      workflowRunId: latestWorkflowRunId,
      metadata: {
        truthSourceRefs: snapshot.truthSourceRefs,
        contextDocRefs: snapshot.contextDocRefs,
        workflowRunRefs: snapshot.workflowRunRefs,
        workflowEventRefs: snapshot.workflowEventRefs,
      },
    });

    const providerResult = await this.buildAssistantReply({
      run,
      session,
      snapshot,
      messages,
      triggerMessage,
      subprojectId: effectiveSubprojectId,
    });

    for (const [index, event] of providerResult.events.entries()) {
      await this.memoryService.appendExecutionEvent(run.id, {
        id: `${run.id}-provider-${index + 1}`,
        runId: run.id,
        sessionId,
        subprojectId: effectiveSubprojectId,
        kind: event.kind,
        status: event.status,
        timestamp: new Date().toISOString(),
        detail: event.detail,
        messageId: triggerMessage.id,
        artifactPath: event.artifactPath ?? null,
        workflowRunId: latestWorkflowRunId,
        metadata: {
          source: 'provider',
        },
      });
    }

    await this.memoryService.appendExecutionEvent(run.id, {
      id: `${run.id}-provider-resolution`,
      runId: run.id,
      sessionId,
      subprojectId: effectiveSubprojectId,
      kind: providerResult.resolution.status === 'success' ? 'provider_succeeded' : 'provider_failed',
      status: providerResult.resolution.status === 'success' ? 'ok' : 'warning',
      timestamp: new Date().toISOString(),
      detail:
        providerResult.resolution.status === 'success'
          ? `Assistant reply resolved by ${providerResult.resolution.providerName} / ${providerResult.resolution.model}.`
          : `Assistant reply used fallback after ${providerResult.resolution.providerName} / ${providerResult.resolution.model} failed.`,
      messageId: triggerMessage.id,
      artifactPath: null,
      workflowRunId: latestWorkflowRunId,
      metadata: {
        source: 'provider',
        finalResolution: true,
        providerName: providerResult.resolution.providerName,
        providerType: providerResult.resolution.providerType,
        model: providerResult.resolution.model,
        usedFallbackReply: providerResult.resolution.usedFallbackReply,
        error: providerResult.resolution.error,
      },
    });
    if (providerResult.resolution.status === 'error') {
      await this.requirementService.ingestFromAutoCapture({
        title: `Auto capture: provider failure in ${session.title}`,
        content: [
          `P1 warning: provider_failed event triggered fallback reply.`,
          '',
          `Session: ${session.id}`,
          `Run: ${run.id}`,
          `Provider: ${providerResult.resolution.providerName} / ${providerResult.resolution.model}`,
          `Error: ${providerResult.resolution.error ?? 'unknown provider error'}`,
          `Trigger message: ${triggerMessage.content}`,
        ].join('\n'),
        subprojectId: effectiveSubprojectId,
        runId: run.id,
        eventKind: 'provider_failed',
      });
    }

    const assistantMessage: ChatMessage = {
      id: `msg-${randomUUID()}`,
      sessionId,
      role: 'assistant',
      content: providerResult.content,
      createdAt: new Date().toISOString(),
      parentMessageId: triggerMessage.id,
      runId: run.id,
      contextSnapshotId: snapshot.id,
      subprojectId: effectiveSubprojectId,
    };
    const completedRun: ExecutionRun = {
      ...run,
      status: 'completed',
      outputMessageIds: [assistantMessage.id],
      updatedAt: assistantMessage.createdAt,
    };

    await this.memoryService.appendChatMessage(sessionId, assistantMessage, effectiveSubprojectId);
    await this.memoryService.saveExecutionRun(completedRun);
    await this.memoryService.saveChatSession({ ...session, updatedAt: assistantMessage.createdAt });
    await this.memoryService.appendExecutionEvent(run.id, {
      id: `${run.id}-emitted`,
      runId: run.id,
      sessionId,
      subprojectId: effectiveSubprojectId,
      kind: 'message_emitted',
      status: 'ok',
      timestamp: assistantMessage.createdAt,
      detail: 'Assistant message emitted.',
      messageId: assistantMessage.id,
      artifactPath: null,
      workflowRunId: latestWorkflowRunId,
      metadata: {
        outputMessageIds: completedRun.outputMessageIds,
      },
    });
    await this.memoryService.appendExecutionEvent(run.id, {
      id: `${run.id}-completed`,
      runId: run.id,
      sessionId,
      subprojectId: effectiveSubprojectId,
      kind: 'run_completed',
      status: 'ok',
      timestamp: assistantMessage.createdAt,
      detail: 'Chat execution run completed.',
      messageId: assistantMessage.id,
      artifactPath: null,
      workflowRunId: latestWorkflowRunId,
      metadata: {
        status: completedRun.status,
      },
    });

    return {
      session: this.normalizeSession(await this.memoryService.loadChatSession(sessionId, effectiveSubprojectId)),
      run: completedRun,
      contextSnapshot: snapshot,
      assistantMessage,
    };
  }

  async loadContextSnapshot(snapshotId: string, subprojectId?: string | null) {
    return this.memoryService.loadContextSnapshot(snapshotId, subprojectId);
  }

  async loadRun(runId: string, subprojectId?: string | null) {
    return this.memoryService.loadExecutionRun(runId, subprojectId);
  }

  async loadRunEvents(runId: string, subprojectId?: string | null) {
    return this.memoryService.loadExecutionEvents(runId, subprojectId);
  }

  private resolveSubprojectId(session: ChatSession, requestedSubprojectId?: string | null) {
    if (
      session.scopeType === 'subproject'
      && requestedSubprojectId
      && session.primarySubprojectId
      && requestedSubprojectId !== session.primarySubprojectId
    ) {
      throw new Error(`chat session ${session.id} 不允许切换到其他子项目上下文。`);
    }

    if (
      session.scopeType === 'multi-subproject'
      && requestedSubprojectId
      && !session.linkedSubprojectIds.includes(requestedSubprojectId)
    ) {
      throw new Error(`chat session ${session.id} 不允许切换到未声明的联动项目上下文。`);
    }

    if (session.scopeType === 'platform' || session.scopeType === 'multi-subproject') {
      return null;
    }

    return requestedSubprojectId ?? session.primarySubprojectId ?? session.defaultSubprojectId ?? null;
  }

  private resolveTriggerMessage(messages: ChatMessage[], messageId?: string | null) {
    if (messageId) {
      const explicit = messages.find((message) => message.id === messageId);
      if (!explicit) {
        throw new Error(`message ${messageId} 不存在。`);
      }
      return explicit;
    }

    const latestUserMessage = [...messages].reverse().find((message) => message.role === 'user');
    if (!latestUserMessage) {
      throw new Error('当前 chat session 还没有 user message。');
    }

    return latestUserMessage;
  }

  private async createContextSnapshot(
    session: ChatSession,
    messages: ChatMessage[],
    subprojectId: string | null,
    linkedWorkflowRuns: string[],
  ) {
    const latestSnapshotId = [...messages]
      .reverse()
      .map((message) => message.contextSnapshotId)
      .find((snapshotId): snapshotId is string => Boolean(snapshotId));
    const scopeSubprojectIds = this.resolveScopeSubprojectIds(session);
    const truthSourceDocuments = await this.loadScopedTruthSourceDocuments(session);
    const contextDocuments = await this.loadScopedContextDocuments(session);
    const workflowEventRefs = await this.collectWorkflowEventRefs(linkedWorkflowRuns, session);
    const recentMessageIds = messages.slice(-12).map((message) => message.id);
    const snapshot: ContextSnapshot = {
      id: `snapshot-${randomUUID()}`,
      sessionId: session.id,
      subprojectId,
      operatorRole: session.operatorRole,
      scopeType: session.scopeType,
      primarySubprojectId: session.primarySubprojectId,
      linkedSubprojectIds: session.linkedSubprojectIds,
      inheritsFromSnapshotId: latestSnapshotId ?? null,
      messageIdsIncluded: recentMessageIds,
      platformMemoryRefs: [getProjectMemoryPath(null)],
      subprojectMemoryRefs: scopeSubprojectIds.filter((id): id is string => Boolean(id)).map((id) => getProjectMemoryPath(id)),
      truthSourceRefs: truthSourceDocuments.map((document) => document.path),
      contextDocRefs: contextDocuments.map((document) => document.path),
      artifactRefs: [],
      workflowRunRefs: linkedWorkflowRuns.slice(0, 5),
      workflowEventRefs,
      contextSummary: this.buildContextSummary({
        scopeType: session.scopeType,
        recentMessageCount: recentMessageIds.length,
        truthSourceCount: truthSourceDocuments.length,
        contextDocCount: contextDocuments.length,
        workflowRunCount: linkedWorkflowRuns.length,
        workflowEventCount: workflowEventRefs.length,
      }),
      permissions: this.buildSessionPermissions(session),
      createdAt: new Date().toISOString(),
    };

    await this.memoryService.saveContextSnapshot(snapshot);
    return snapshot;
  }

  private async buildAssistantReply(input: {
    run: ExecutionRun;
    session: ChatSession;
    snapshot: ContextSnapshot;
    messages: ChatMessage[];
    triggerMessage: ChatMessage;
    subprojectId: string | null;
  }): Promise<{
    content: string;
    events: Array<Pick<ExecutionEvent, 'kind' | 'status' | 'detail' | 'artifactPath'>>;
    resolution: {
      providerName: string;
      providerType: string;
      model: string;
      status: 'success' | 'error';
      usedFallbackReply: boolean;
      error: string | null;
    };
  }> {
    const project = await this.subprojectRegistry.resolveProjectContext(input.subprojectId);
    if (this.shouldUseMultimodal(input.triggerMessage.content)) {
      const result = await this.multimodalRouter.execute(
        {
          runId: input.run.id,
          stageId: 'multimodal-response',
          capability: 'text-multimodal',
          prompt: input.triggerMessage.content,
        },
        {
          subprojectId: input.subprojectId,
          preferredProvider: project.selectedProvider,
        },
      );

      return {
        content: result.summaryText,
        events: [
          {
            kind: 'provider_invoked',
            status: 'ok',
            detail: `Multimodal Router 尝试 provider ${result.providerName} 生成 ${result.artifact.type}。`,
            artifactPath: result.artifactPath,
          },
          {
            kind: 'provider_succeeded',
            status: 'ok',
            detail: `Multimodal Router 已生成 ${result.artifact.type}，产物写入 ${result.artifactPath}。`,
            artifactPath: result.artifactPath,
          },
        ],
        resolution: {
          providerName: result.providerName,
          providerType: result.providerType,
          model: result.model,
          status: 'success',
          usedFallbackReply: false,
          error: null,
        },
      };
    }

    const prompt = await this.buildPrompt(project, input.session, input.messages, input.triggerMessage.content, input.subprojectId);
    const execution = await this.llmRouter.execute(
      {
        runId: input.run.id,
        stageId: 'chat-response',
        capability: 'text',
        prompt,
      },
      {
        subprojectId: input.subprojectId,
        preferredProvider: project.selectedProvider,
        allowCrossCapabilityFallback: false,
      },
    );

    if (execution.result.status === 'success' && execution.result.outputText) {
      return {
        content: execution.result.outputText,
        events: execution.events.map((event) => ({ ...event, artifactPath: null })),
        resolution: {
          providerName: execution.result.providerName,
          providerType: execution.result.providerType,
          model: execution.result.model,
          status: 'success',
          usedFallbackReply: false,
          error: null,
        },
      };
    }

    return {
      content: this.buildFallbackReply(project, input.triggerMessage.content, execution.result.error ?? 'provider returned empty response'),
      events: execution.events.map((event) => ({ ...event, artifactPath: null })),
      resolution: {
        providerName: execution.result.providerName,
        providerType: execution.result.providerType,
        model: execution.result.model,
        status: 'error',
        usedFallbackReply: true,
        error: execution.result.error ?? 'provider returned empty response',
      },
    };
  }

  private shouldUseMultimodal(content: string) {
    return /(生成|输出).*(UI|界面|页面结构|架构图|架构草图)|为.+生成.+UI|为.+生成.+架构/u.test(content);
  }

  private async buildPrompt(
    project: ProjectContext,
    session: ChatSession,
    messages: ChatMessage[],
    latestUserInput: string,
    subprojectId: string | null,
  ) {
    const platformMemory = await this.safeLoadMemory(getProjectMemoryPath(null));
    const subprojectMemories = await Promise.all(
      this.resolveScopeSubprojectIds(session)
        .filter((id): id is string => Boolean(id))
        .map(async (id) => ({
          subprojectId: id,
          content: await this.safeLoadMemory(getProjectMemoryPath(id)),
        })),
    );
    const truthSourceDocuments = await this.loadScopedTruthSourceDocuments(session);
    const contextDocuments = await this.loadScopedContextDocuments(session);
    const transcript = messages
      .slice(-12)
      .map((message) => `${message.role}: ${message.content}`)
      .join('\n');

    return [
      `你是 PMAIOS 网页端 Chat 助手。当前项目：${project.projectName}。`,
      `当前会话角色：${session.operatorRole}。`,
      `当前会话作用域：${session.scopeType}。`,
      session.primarySubprojectId ? `主项目：${session.primarySubprojectId}` : null,
      session.linkedSubprojectIds.length > 0 ? `关联项目：${session.linkedSubprojectIds.join(', ')}` : null,
      '请默认使用中文，优先给出可执行、可追踪的工程回答。',
      '当用户提到 v0.6、v0.3、路线图、任务清单、愿景、workflow、execution 时，优先依据 truth-source 文档回答，而不是只依据最近聊天。',
      contextDocuments.length > 0
        ? '当用户询问近期进展、周报、个人偏好、项目上下文时，优先使用已加载的本地 context 文档，并在回答中尽量体现命中的上下文来源。'
        : '当前还没有发现 docs/context 下的本地上下文文档；回答时不要假装知道周报或个人进展。',
      platformMemory ? `平台记忆：\n${platformMemory}` : null,
      ...subprojectMemories
        .filter((item): item is { subprojectId: string; content: string } => Boolean(item.content))
        .map((item) => `子项目记忆(${item.subprojectId})：\n${item.content}`),
      truthSourceDocuments.length > 0 ? this.formatDocumentsSection('Truth-source 文档', truthSourceDocuments) : null,
      contextDocuments.length > 0 ? this.formatDocumentsSection('本地 context 文档', contextDocuments) : null,
      transcript ? `最近对话：\n${transcript}` : null,
      `当前用户输入：${latestUserInput}`,
      subprojectId === null && session.scopeType === 'multi-subproject'
        ? '当前任务处于跨项目联动模式，回答时优先给出平台层主结论，并明确受影响项目。'
        : null,
    ]
      .filter(Boolean)
      .join('\n\n');
  }

  private async collectWorkflowEventRefs(linkedWorkflowRuns: string[], session: ChatSession) {
    const refs: string[] = [];

    for (const runId of linkedWorkflowRuns.slice(0, 5)) {
      const events = await this.loadScopedWorkflowEvents(runId, session);
      refs.push(...events.slice(-5).map((event) => `${runId}:${event.id}`));
    }

    return [...new Set(refs)];
  }

  private buildContextSummary(input: {
    scopeType: ConversationScopeType;
    recentMessageCount: number;
    truthSourceCount: number;
    contextDocCount: number;
    workflowRunCount: number;
    workflowEventCount: number;
  }) {
    return [
      `scope=${input.scopeType}`,
      `loaded ${input.recentMessageCount} messages`,
      `${input.truthSourceCount} truth-source docs`,
      `${input.contextDocCount} context docs`,
      `${input.workflowRunCount} workflow runs`,
      `${input.workflowEventCount} workflow events`,
    ].join(', ');
  }

  private buildFallbackReply(project: ProjectContext, latestUserInput: string, reason?: string) {
    const suffix = reason ? `\n\n当前未接入可用实时模型，已返回本地回退响应。原因：${reason}` : '';
    return [
      `已收到你在 ${project.projectName} 上下文中的请求：${latestUserInput}`,
      'Workspace 已接入更宽的上下文装载：会优先带上 workflow、任务清单、愿景等 truth-source 文档。',
      '如果你后面把周报或个人上下文放进 docs/context 目录，后续对话也会自动带上。',
    ].join('\n\n') + suffix;
  }

  private async safeLoadMemory(memoryPath: string) {
    if (!(await this.store.exists(memoryPath))) {
      return null;
    }

    return this.store.read(memoryPath);
  }

  private formatDocumentsSection(title: string, documents: ContextDocument[]) {
    return [
      `${title}：`,
      ...documents.map((document) => `### ${document.path}\n${document.content}`),
    ].join('\n\n');
  }

  private buildContextResolvedDetail(snapshot: ContextSnapshot) {
    return [
      `Context resolved for ${snapshot.scopeType} scope.`,
      `operator=${snapshot.operatorRole}`,
      `primary=${snapshot.primarySubprojectId ?? 'platform'}`,
      `truth-source=${snapshot.truthSourceRefs.length}`,
      `context-docs=${snapshot.contextDocRefs.length}`,
      `platform-memory=${snapshot.platformMemoryRefs.length}`,
      `subproject-memory=${snapshot.subprojectMemoryRefs.length}`,
    ].join(' ');
  }

  private inferSessionScope(input: SessionScopeInput) {
    const normalizedLinkedSubprojectIds = [...new Set((input.linkedSubprojectIds ?? []).map((item) => item.trim()).filter(Boolean))];
    const inferredWorkspaceSubprojectId = this.extractSubprojectIdFromWorkspacePath(input.workspacePath ?? null);
    const primarySubprojectId = input.subprojectId?.trim()
      || inferredWorkspaceSubprojectId
      || normalizedLinkedSubprojectIds[0]
      || null;
    const linkedSubprojectIds = normalizedLinkedSubprojectIds.length > 0
      ? normalizedLinkedSubprojectIds
      : primarySubprojectId ? [primarySubprojectId] : [];
    const workspaceEntryType = this.classifyWorkspaceEntry(input.workspacePath ?? null, inferredWorkspaceSubprojectId);
    const scopeType = input.scopeType
      ?? (linkedSubprojectIds.length > 1 ? 'multi-subproject' : primarySubprojectId ? 'subproject' : 'platform');
    const operatorRole = input.operatorRole
      ?? (scopeType === 'multi-subproject' ? 'cross-project-pm' : scopeType === 'subproject' ? 'project-pm' : 'product-supervisor');

    return {
      operatorRole,
      scopeType,
      primarySubprojectId: scopeType === 'platform' ? null : primarySubprojectId,
      linkedSubprojectIds: scopeType === 'platform' ? [] : linkedSubprojectIds,
      defaultSubprojectId: scopeType === 'subproject' ? primarySubprojectId : null,
      workspacePath: input.workspacePath?.trim() || null,
      workspaceEntryType,
    };
  }

  private normalizeSession(session: ChatSession): ChatSession {
    const linkedSubprojectIds = [...new Set((session.linkedSubprojectIds ?? []).filter(Boolean))];
    const primarySubprojectId = session.primarySubprojectId ?? session.defaultSubprojectId ?? linkedSubprojectIds[0] ?? null;
    const scopeType = session.scopeType
      ?? (linkedSubprojectIds.length > 1 ? 'multi-subproject' : primarySubprojectId ? 'subproject' : 'platform');
    const operatorRole = session.operatorRole
      ?? (scopeType === 'multi-subproject' ? 'cross-project-pm' : scopeType === 'subproject' ? 'project-pm' : 'product-supervisor');
    const workspaceEntryType = session.workspaceEntryType ?? this.classifyWorkspaceEntry(session.workspacePath ?? null, primarySubprojectId);

    return {
      ...session,
      operatorRole,
      scopeType,
      primarySubprojectId: scopeType === 'platform' ? null : primarySubprojectId,
      linkedSubprojectIds: scopeType === 'platform' ? [] : linkedSubprojectIds.length > 0 ? linkedSubprojectIds : primarySubprojectId ? [primarySubprojectId] : [],
      workspacePath: session.workspacePath ?? null,
      workspaceEntryType,
    };
  }

  private resolveScopeSubprojectIds(session: ChatSession) {
    if (session.scopeType === 'platform') {
      return [null];
    }
    if (session.scopeType === 'subproject') {
      return session.primarySubprojectId ? [session.primarySubprojectId] : [null];
    }
    return [null, ...session.linkedSubprojectIds];
  }

  private async loadScopedTruthSourceDocuments(session: ChatSession) {
    return this.loadScopedDocuments(session, (subprojectId) => this.memoryService.loadTruthSourceDocuments(subprojectId));
  }

  private async loadScopedContextDocuments(session: ChatSession) {
    return this.loadScopedDocuments(session, (subprojectId) => this.memoryService.loadContextDocuments(subprojectId));
  }

  private async loadScopedDocuments(
    session: ChatSession,
    loader: (subprojectId: string | null) => Promise<ContextDocument[]>,
  ) {
    const results = await Promise.all(this.resolveScopeSubprojectIds(session).map((subprojectId) => loader(subprojectId)));
    const deduped = new Map<string, ContextDocument>();

    for (const document of results.flat()) {
      deduped.set(document.path, document);
    }

    return [...deduped.values()].sort((left, right) => left.path.localeCompare(right.path));
  }

  private async listScopedWorkflowRuns(session: ChatSession) {
    const runEntries = await Promise.all(
      this.resolveScopeSubprojectIds(session).map(async (subprojectId) => {
        const runIds = await this.memoryService.listRunIds(subprojectId);
        const runs = await Promise.all(
          runIds.map(async (runId) => {
            try {
              const run = await this.memoryService.loadRunSnapshot(runId, subprojectId);
              return { id: run.id, updatedAt: run.updatedAt };
            } catch {
              return null;
            }
          }),
        );
        return runs.filter((item): item is { id: string; updatedAt: string } => item !== null);
      }),
    );

    return [...new Map(
      runEntries
        .flat()
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
        .map((item) => [item.id, item]),
    ).values()].map((item) => item.id);
  }

  private async loadScopedWorkflowEvents(runId: string, session: ChatSession) {
    for (const subprojectId of this.resolveScopeSubprojectIds(session)) {
      try {
        const events = await this.memoryService.loadEvents(runId, subprojectId);
        if (events.length > 0) {
          return events;
        }
      } catch {
        continue;
      }
    }

    return [];
  }

  private buildSessionPermissions(session: ChatSession) {
    const permissions = [session.scopeType, `operator:${session.operatorRole}`];
    if (session.primarySubprojectId) {
      permissions.push(`primary:${session.primarySubprojectId}`);
    }
    permissions.push(...session.linkedSubprojectIds.map((id) => `subproject:${id}`));
    return [...new Set(permissions)];
  }

  private extractSubprojectIdFromWorkspacePath(workspacePath: string | null) {
    if (!workspacePath) {
      return null;
    }

    const normalized = workspacePath.replace(/\\/g, '/');
    const matched = normalized.match(/(?:^|\/)subprojects\/([^/]+)(?:\/|$)/u);
    return matched?.[1] ?? null;
  }

  private classifyWorkspaceEntry(workspacePath: string | null, inferredSubprojectId?: string | null): WorkspaceEntryType {
    if (!workspacePath) {
      return inferredSubprojectId ? 'subproject-root' : 'unknown';
    }

    return this.extractSubprojectIdFromWorkspacePath(workspacePath) ? 'subproject-root' : 'platform-root';
  }
}

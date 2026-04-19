import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { FileStore } from '../core/fileStore.js';
import { WorkflowEngine } from '../core/workflowEngine.js';
import { ReviewCommittee } from '../core/reviewCommittee.js';
import { ProviderRegistry } from '../core/providerRegistry.js';
import { McpRegistry } from '../core/mcpRegistry.js';
import { MemoryService } from '../core/memoryService.js';
import { OrchestratorRuntime } from '../core/orchestratorRuntime.js';
import { SubprojectRegistry } from '../core/subprojectRegistry.js';
import { ChatService } from '../core/chatService.js';
import { ProductAgentService } from '../core/productAgentService.js';
import { CapabilityRegistry } from '../core/capabilityRegistry.js';
import { RequirementService } from '../core/requirementService.js';
import { VersionRegistry } from '../core/versionRegistry.js';
import { ObservabilityService } from '../core/observabilityService.js';
import { DagService } from '../core/dagService.js';
import { RetrievalGovernanceService } from '../core/retrievalGovernanceService.js';
import { HermesPolicyService } from '../core/hermesPolicyService.js';
import { ProductChiefService } from '../core/productChiefService.js';
import { DocumentationNormalizationService } from '../core/documentationNormalizationService.js';
import { SkillRegistry } from '../core/skillRegistry.js';
import { ExternalConnectorService } from '../core/externalConnectorService.js';
import { LlmRouter } from '../llm_router/index.js';

const rootDir = process.env.AI_OS_ROOT ? path.resolve(process.env.AI_OS_ROOT) : process.cwd();
const store = new FileStore(rootDir);
const memoryService = new MemoryService(store);
const workflowEngine = new WorkflowEngine(store, memoryService);
const reviewCommittee = new ReviewCommittee();
const providerRegistry = new ProviderRegistry(store);
const mcpRegistry = new McpRegistry(store);
const orchestratorRuntime = new OrchestratorRuntime(store, memoryService);
const subprojectRegistry = new SubprojectRegistry(store);
const chatService = new ChatService(store);
const productAgentService = new ProductAgentService(store);
const capabilityRegistry = new CapabilityRegistry(store);
const requirementService = new RequirementService(memoryService);
const versionRegistry = new VersionRegistry(memoryService);
const observabilityService = new ObservabilityService(memoryService);
const dagService = new DagService(store);
const retrievalGovernanceService = new RetrievalGovernanceService(store, memoryService);
const hermesPolicyService = new HermesPolicyService(store, memoryService);
const productChiefService = new ProductChiefService(store, memoryService, productAgentService);
const documentationNormalizationService = new DocumentationNormalizationService(store, memoryService);
const skillRegistry = new SkillRegistry(store);
const externalConnectorService = new ExternalConnectorService(store);
const llmRouter = new LlmRouter(store);

const app = express();
app.use(cors());
app.use(express.json());

function normalizeSubprojectId(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

async function ensureCurrentRun(subprojectId?: string | null) {
  const runs = await orchestratorRuntime.listRuns(subprojectId);
  if (runs[0]) {
    return runs[0];
  }

  const project = await subprojectRegistry.resolveProjectContext(subprojectId);
  const definition = await workflowEngine.loadDefinition(project.projectRoot);
  const providers = await providerRegistry.listProviders(subprojectId);
  const servers = await mcpRegistry.listServers(subprojectId);
  return orchestratorRuntime.initRun({
    definition,
    project,
    providerCount: providers.length,
    mcpServerCount: servers.length,
  });
}

async function buildReviewForRun(runId: string, subprojectId?: string | null) {
  const run = await orchestratorRuntime.loadRun(runId, subprojectId);
  const events = await orchestratorRuntime.loadEvents(runId, subprojectId);
  const artifactCount = events.filter((event) => event.kind === 'artifact_written').length;
  const artifacts = await workflowEngine.hydrateArtifacts(run);
  const openSourceEvidence = reviewCommittee.inspectOpenSourceEvidence(artifacts);
  return reviewCommittee.buildReportForRun({
    runId,
    artifactCount,
    openSourceEvaluationPresent: openSourceEvidence.present,
    openSourceEvidencePaths: openSourceEvidence.evidencePaths,
  });
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'ai-os-backend' });
});

app.get('/api/subprojects', async (_req, res) => {
  res.json(await subprojectRegistry.listSubprojects());
});

app.post('/api/subprojects', async (req, res) => {
  const subproject = await subprojectRegistry.createSubproject({
    id: String(req.body?.id ?? '').trim(),
    name: typeof req.body?.name === 'string' ? req.body.name : undefined,
    description: typeof req.body?.description === 'string' ? req.body.description : undefined,
    defaultWorkflow: typeof req.body?.defaultWorkflow === 'string' ? req.body.defaultWorkflow : undefined,
    overrides:
      req.body?.overrides && typeof req.body.overrides === 'object'
        ? {
            provider: typeof req.body.overrides.provider === 'string' ? req.body.overrides.provider : undefined,
            providerConfigPath:
              typeof req.body.overrides.providerConfigPath === 'string' ? req.body.overrides.providerConfigPath : undefined,
            workflow: typeof req.body.overrides.workflow === 'string' ? req.body.overrides.workflow : undefined,
            mcpConfigPath: typeof req.body.overrides.mcpConfigPath === 'string' ? req.body.overrides.mcpConfigPath : undefined,
          }
        : undefined,
  });
  res.status(201).json(subproject);
});

app.get('/api/subprojects/:id', async (req, res) => {
  res.json(await subprojectRegistry.loadSubproject(req.params.id));
});

app.get('/api/subprojects/:id/runs/current', async (req, res) => {
  res.json(await ensureCurrentRun(req.params.id));
});

app.post('/api/subprojects/:id/runs/init', async (req, res) => {
  const subprojectId = req.params.id;
  const project = await subprojectRegistry.resolveProjectContext(subprojectId);
  const definition = await workflowEngine.loadDefinition(project.projectRoot);
  const providers = await providerRegistry.listProviders(subprojectId);
  const servers = await mcpRegistry.listServers(subprojectId);
  const run = await orchestratorRuntime.initRun({
    definition,
    project,
    providerCount: providers.length,
    mcpServerCount: servers.length,
  });
  res.status(201).json(run);
});

app.get('/api/portfolio', async (_req, res) => {
  const subprojects = await subprojectRegistry.listSubprojects();
  const portfolio = await Promise.all(
    [null, ...subprojects.map((subproject) => subproject.id)].map(async (subprojectId) => {
      const runs = await orchestratorRuntime.listRuns(subprojectId);
      const currentRun = runs[0] ?? null;
      const review = currentRun ? await buildReviewForRun(currentRun.id, currentRun.subprojectId) : null;
      const metrics = currentRun ? await workflowEngine.buildMetrics(currentRun, review) : null;
      return {
        subprojectId,
        label: subprojectId ? subprojects.find((item) => item.id === subprojectId)?.name ?? subprojectId : 'PMAIOS Platform',
        runCount: runs.length,
        currentRun,
        metrics,
      };
    }),
  );

  res.json(portfolio);
});

app.get('/api/chats', async (req, res) => {
  res.json({ items: await chatService.listSessions(normalizeSubprojectId(req.query.subprojectId)) });
});

app.post('/api/chats', async (req, res) => {
  const session = await chatService.createSession({
    title: typeof req.body?.title === 'string' ? req.body.title : undefined,
    subprojectId: normalizeSubprojectId(req.body?.subprojectId),
  });
  res.status(201).json(session);
});

app.get('/api/chats/:id', async (req, res) => {
  res.json(await chatService.loadSession(req.params.id, normalizeSubprojectId(req.query.subprojectId)));
});

app.get('/api/chats/:id/messages', async (req, res) => {
  res.json({ items: await chatService.listMessages(req.params.id, normalizeSubprojectId(req.query.subprojectId)) });
});

app.post('/api/chats/:id/messages', async (req, res) => {
  if (typeof req.body?.content !== 'string' || !req.body.content.trim()) {
    res.status(400).json({ error: 'content is required' });
    return;
  }

  const message = await chatService.createUserMessage(req.params.id, {
    content: req.body.content,
    subprojectId: normalizeSubprojectId(req.body?.subprojectId),
    parentMessageId: typeof req.body?.parentMessageId === 'string' ? req.body.parentMessageId : null,
  });
  res.status(201).json(message);
});

app.post('/api/chats/:id/respond', async (req, res) => {
  res.json(
    await chatService.respond(req.params.id, {
      subprojectId: normalizeSubprojectId(req.body?.subprojectId),
      messageId: typeof req.body?.messageId === 'string' ? req.body.messageId : null,
    }),
  );
});

app.get('/api/chats/:id/runs', async (req, res) => {
  res.json({ items: await chatService.listRuns(req.params.id, normalizeSubprojectId(req.query.subprojectId)) });
});

app.get('/api/product-agents', async (req, res) => {
  res.json({ items: await productAgentService.listAgents(normalizeSubprojectId(req.query.subprojectId)) });
});

app.get('/api/product-agent-blueprints', async (_req, res) => {
  res.json({ items: await productAgentService.listBlueprints() });
});

app.get('/api/skills', async (req, res) => {
  const items = await skillRegistry.listSkills(normalizeSubprojectId(req.query.subprojectId));
  const byMainline = {
    product: items.filter((skill) => ['product', 'management', 'planning', 'research', 'iteration'].includes(skill.category)),
    design: items.filter(
      (skill) =>
        ['design', 'multimodal'].includes(skill.category) ||
        /design|schema|prototype|demo|ui/ui.test(`${skill.id} ${skill.name} ${skill.description} ${skill.outputs.join(' ')}`),
    ),
    documentation: items.filter(
      (skill) =>
        ['documentation', 'delivery'].includes(skill.category) ||
        /document|manual|brief|script|output|handoff/ui.test(`${skill.id} ${skill.name} ${skill.description} ${skill.outputs.join(' ')}`),
    ),
  };

  res.json({
    items,
    summary: {
      total: items.length,
      product: byMainline.product.length,
      design: byMainline.design.length,
      documentation: byMainline.documentation.length,
    },
    byMainline,
    designTooling: {
      packageName: 'claude-design-system',
      command: 'design-system.cmd',
      status: 'installed',
      statusPath: 'docs/operations/claude-design-tooling-status.md',
      localGuidePath: 'DESIGN-SYSTEM.md',
    },
  });
});

app.get('/api/connectors/status', async (req, res) => {
  res.json(
    await externalConnectorService.getStatus(normalizeSubprojectId(req.query.subprojectId), {
      checkRemote: req.query.checkRemote === 'true',
    }),
  );
});

app.post('/api/connectors/web-fetch', async (req, res) => {
  if (typeof req.body?.url !== 'string' || !req.body.url.trim()) {
    res.status(400).json({ error: 'url is required' });
    return;
  }

  const artifact = await externalConnectorService.fetchWebPage({
    url: req.body.url,
    subprojectId: normalizeSubprojectId(req.body?.subprojectId),
  });
  res.status(201).json(artifact);
});

app.post('/api/connectors/figma/files/inspect', async (req, res) => {
  if (typeof req.body?.fileKey !== 'string' || !req.body.fileKey.trim()) {
    res.status(400).json({ error: 'fileKey is required' });
    return;
  }

  res.json(await externalConnectorService.inspectFigmaFile({ fileKey: req.body.fileKey }));
});

app.post('/api/connectors/dingtalk/meeting-notes', async (req, res) => {
  if (typeof req.body?.content !== 'string' || !req.body.content.trim()) {
    res.status(400).json({ error: 'content is required' });
    return;
  }

  const imported = await externalConnectorService.importDingTalkMeetingNote({
    title: typeof req.body?.title === 'string' ? req.body.title : null,
    content: req.body.content,
    subprojectId: normalizeSubprojectId(req.body?.subprojectId),
  });
  const normalizationRun = await documentationNormalizationService.normalize({
    subprojectId: normalizeSubprojectId(req.body?.subprojectId),
    sourceRoot: null,
    sourcePaths: [imported.sourcePath],
  });
  res.status(201).json({ imported, normalizationRun });
});

app.post('/api/product-agent-blueprints/bootstrap', async (req, res) => {
  res.status(201).json({
    items: await productAgentService.bootstrapManagementHierarchy(normalizeSubprojectId(req.body?.subprojectId)),
  });
});

app.get('/api/product-chief/reports', async (req, res) => {
  res.json({ items: await productChiefService.listReports(normalizeSubprojectId(req.query.subprojectId)) });
});

app.get('/api/product-chief/outputs', async (req, res) => {
  res.json({ items: await productChiefService.listOutputs(normalizeSubprojectId(req.query.subprojectId)) });
});

app.get('/api/product-chief/specialist-tasks', async (req, res) => {
  res.json({ items: await productChiefService.listSpecialistTasks(normalizeSubprojectId(req.query.subprojectId)) });
});

app.get('/api/product-chief/multi-agent-reviews', async (req, res) => {
  res.json({ items: await productChiefService.listMultiAgentReviews(normalizeSubprojectId(req.query.subprojectId)) });
});

app.post('/api/product-chief/analyze', async (req, res) => {
  if (typeof req.body?.brief !== 'string' || !req.body.brief.trim()) {
    res.status(400).json({ error: 'brief is required' });
    return;
  }

  res.status(201).json(
    await productChiefService.analyze({
      brief: req.body.brief,
      subprojectId: normalizeSubprojectId(req.body?.subprojectId),
      contextPaths: Array.isArray(req.body?.contextPaths) ? req.body.contextPaths.filter((item: unknown) => typeof item === 'string') : [],
    }),
  );
});

app.post('/api/product-chief/reports/:id/outputs', async (req, res) => {
  res.status(201).json(
    await productChiefService.generateGovernedOutput({
      reportId: req.params.id,
      type: typeof req.body?.type === 'string' ? req.body.type : null,
      subprojectId: normalizeSubprojectId(req.body?.subprojectId),
      requirementIds: Array.isArray(req.body?.requirementIds) ? req.body.requirementIds.filter((item: unknown) => typeof item === 'string') : [],
    }),
  );
});

app.get('/api/document-normalization/runs', async (req, res) => {
  res.json({ items: await documentationNormalizationService.listRuns(normalizeSubprojectId(req.query.subprojectId)) });
});

app.post('/api/document-normalization/runs', async (req, res) => {
  res.status(201).json(
    await documentationNormalizationService.normalize({
      subprojectId: normalizeSubprojectId(req.body?.subprojectId),
      sourceRoot: typeof req.body?.sourceRoot === 'string' ? req.body.sourceRoot : null,
      sourcePaths: Array.isArray(req.body?.sourcePaths) ? req.body.sourcePaths.filter((item: unknown) => typeof item === 'string') : [],
      limit: typeof req.body?.limit === 'number' ? req.body.limit : null,
    }),
  );
});

app.post('/api/product-agents', async (req, res) => {
  if (typeof req.body?.name !== 'string' || !req.body.name.trim()) {
    res.status(400).json({ error: 'name is required' });
    return;
  }
  if (typeof req.body?.summary !== 'string' || !req.body.summary.trim()) {
    res.status(400).json({ error: 'summary is required' });
    return;
  }
  if (typeof req.body?.problem !== 'string' || !req.body.problem.trim()) {
    res.status(400).json({ error: 'problem is required' });
    return;
  }

  const agent = await productAgentService.createAgent({
    name: req.body.name,
    summary: req.body.summary,
    problem: req.body.problem,
    role:
      typeof req.body?.role === 'string' &&
      ['general', 'product-management', 'requirements', 'versioning', 'review', 'workflow', 'delivery', 'retrospective'].includes(
        req.body.role,
      )
        ? req.body.role
        : undefined,
    level:
      typeof req.body?.level === 'string' && ['supervisor', 'manager', 'specialist'].includes(req.body.level)
        ? req.body.level
        : undefined,
    scope:
      typeof req.body?.scope === 'string' && ['platform', 'shared', 'subproject'].includes(req.body.scope)
        ? req.body.scope
        : undefined,
    targetUsers: Array.isArray(req.body?.targetUsers) ? req.body.targetUsers : [],
    goals: Array.isArray(req.body?.goals) ? req.body.goals : [],
    nonGoals: Array.isArray(req.body?.nonGoals) ? req.body.nonGoals : [],
    constraints: Array.isArray(req.body?.constraints) ? req.body.constraints : [],
    acceptanceCriteria: Array.isArray(req.body?.acceptanceCriteria) ? req.body.acceptanceCriteria : [],
    relatedPaths: Array.isArray(req.body?.relatedPaths) ? req.body.relatedPaths : [],
    governanceRefs: Array.isArray(req.body?.governanceRefs) ? req.body.governanceRefs : [],
    managedAgentIds: Array.isArray(req.body?.managedAgentIds) ? req.body.managedAgentIds : [],
    promptPath: typeof req.body?.promptPath === 'string' ? req.body.promptPath : null,
    templateId: typeof req.body?.templateId === 'string' ? req.body.templateId : null,
    subprojectId: normalizeSubprojectId(req.body?.subprojectId),
    chatSessionId: typeof req.body?.chatSessionId === 'string' ? req.body.chatSessionId : null,
    contextSnapshotId: typeof req.body?.contextSnapshotId === 'string' ? req.body.contextSnapshotId : null,
    generatedByRunId: typeof req.body?.generatedByRunId === 'string' ? req.body.generatedByRunId : null,
    source: 'api',
  });
  res.status(201).json(agent);
});

app.post('/api/product-agents/generate', async (req, res) => {
  if (typeof req.body?.brief !== 'string' || !req.body.brief.trim()) {
    res.status(400).json({ error: 'brief is required' });
    return;
  }

  const agent = await productAgentService.generateAgent({
    brief: req.body.brief,
    name: typeof req.body?.name === 'string' ? req.body.name : undefined,
    role:
      typeof req.body?.role === 'string' &&
      ['general', 'product-management', 'requirements', 'versioning', 'review', 'workflow', 'delivery', 'retrospective'].includes(
        req.body.role,
      )
        ? req.body.role
        : undefined,
    level:
      typeof req.body?.level === 'string' && ['supervisor', 'manager', 'specialist'].includes(req.body.level)
        ? req.body.level
        : undefined,
    scope:
      typeof req.body?.scope === 'string' && ['platform', 'shared', 'subproject'].includes(req.body.scope)
        ? req.body.scope
        : undefined,
    subprojectId: normalizeSubprojectId(req.body?.subprojectId),
    chatSessionId: typeof req.body?.chatSessionId === 'string' ? req.body.chatSessionId : null,
    contextSnapshotId: typeof req.body?.contextSnapshotId === 'string' ? req.body.contextSnapshotId : null,
    generatedByRunId: typeof req.body?.generatedByRunId === 'string' ? req.body.generatedByRunId : null,
    source: 'workspace',
  });
  res.status(201).json(agent);
});

app.get('/api/product-agents/:id', async (req, res) => {
  res.json(await productAgentService.loadAgent(req.params.id, normalizeSubprojectId(req.query.subprojectId)));
});

app.get('/api/capabilities', async (req, res) => {
  res.json({ items: await capabilityRegistry.listCapabilities(normalizeSubprojectId(req.query.subprojectId)) });
});

app.post('/api/capabilities', async (req, res) => {
  if (typeof req.body?.name !== 'string' || !req.body.name.trim()) {
    res.status(400).json({ error: 'name is required' });
    return;
  }
  if (typeof req.body?.description !== 'string' || !req.body.description.trim()) {
    res.status(400).json({ error: 'description is required' });
    return;
  }
  if (!['product-agent', 'workflow'].includes(String(req.body?.implementationType ?? ''))) {
    res.status(400).json({ error: 'implementationType must be product-agent or workflow' });
    return;
  }
  if (typeof req.body?.implementationRef !== 'string' || !req.body.implementationRef.trim()) {
    res.status(400).json({ error: 'implementationRef is required' });
    return;
  }

  const capability = await capabilityRegistry.registerCapability({
    id: typeof req.body?.id === 'string' ? req.body.id : undefined,
    name: req.body.name,
    description: req.body.description,
    subprojectId: normalizeSubprojectId(req.body?.subprojectId),
    visibility: ['private', 'internal', 'public'].includes(String(req.body?.visibility ?? '')) ? req.body.visibility : undefined,
    implementationType: req.body.implementationType,
    implementationRef: req.body.implementationRef,
    inputSchema: req.body?.inputSchema,
    outputSchema: req.body?.outputSchema,
    permissions: Array.isArray(req.body?.permissions) ? req.body.permissions : [],
    tags: Array.isArray(req.body?.tags) ? req.body.tags : [],
    acceptanceCriteria: Array.isArray(req.body?.acceptanceCriteria) ? req.body.acceptanceCriteria : [],
    requirementIds: Array.isArray(req.body?.requirementIds) ? req.body.requirementIds : [],
    runId: typeof req.body?.runId === 'string' ? req.body.runId : null,
    version: typeof req.body?.version === 'string' ? req.body.version : undefined,
    testsPassed: typeof req.body?.testsPassed === 'boolean' ? req.body.testsPassed : undefined,
    reviewPassed: typeof req.body?.reviewPassed === 'boolean' ? req.body.reviewPassed : undefined,
    releaseNotes: typeof req.body?.releaseNotes === 'string' ? req.body.releaseNotes : null,
    reviewSummary: typeof req.body?.reviewSummary === 'string' ? req.body.reviewSummary : null,
    metadata: req.body?.metadata && typeof req.body.metadata === 'object' ? req.body.metadata : undefined,
  });
  res.status(201).json(capability);
});

app.get('/api/capabilities/:id', async (req, res) => {
  res.json(await capabilityRegistry.loadCapability(req.params.id, normalizeSubprojectId(req.query.subprojectId)));
});

app.get('/api/capabilities/:id/invocations', async (req, res) => {
  res.json({ items: await capabilityRegistry.listInvocations(req.params.id, normalizeSubprojectId(req.query.subprojectId)) });
});

app.get('/api/capability-evaluations', async (req, res) => {
  res.json({ items: await capabilityRegistry.listEvaluations(normalizeSubprojectId(req.query.subprojectId)) });
});

app.get('/api/requirements', async (req, res) => {
  res.json({ items: await requirementService.listRequirements(normalizeSubprojectId(req.query.subprojectId)) });
});

app.post('/api/requirements', async (req, res) => {
  if (typeof req.body?.title !== 'string' || !req.body.title.trim()) {
    res.status(400).json({ error: 'title is required' });
    return;
  }
  if (typeof req.body?.description !== 'string' || !req.body.description.trim()) {
    res.status(400).json({ error: 'description is required' });
    return;
  }

  res.status(201).json(
    await requirementService.createRequirement({
      subprojectId: normalizeSubprojectId(req.body?.subprojectId),
      title: req.body.title,
      description: req.body.description,
      category: ['feature', 'bug', 'architecture'].includes(String(req.body?.category ?? '')) ? req.body.category : 'feature',
      priority: ['P0', 'P1', 'P2'].includes(String(req.body?.priority ?? '')) ? req.body.priority : 'P1',
      relatedRequirementIds: Array.isArray(req.body?.relatedRequirementIds) ? req.body.relatedRequirementIds : [],
      linkedVersionIds: Array.isArray(req.body?.linkedVersionIds) ? req.body.linkedVersionIds : [],
      linkedRunIds: Array.isArray(req.body?.linkedRunIds) ? req.body.linkedRunIds : [],
      artifactPaths: Array.isArray(req.body?.artifactPaths) ? req.body.artifactPaths : [],
      metadata: req.body?.metadata && typeof req.body.metadata === 'object' ? req.body.metadata : undefined,
    }),
  );
});

app.patch('/api/requirements/:id', async (req, res) => {
  res.json(
    await requirementService.updateRequirement(req.params.id, {
      subprojectId: normalizeSubprojectId(req.body?.subprojectId),
      title: typeof req.body?.title === 'string' ? req.body.title : undefined,
      description: typeof req.body?.description === 'string' ? req.body.description : undefined,
      category: ['feature', 'bug', 'architecture'].includes(String(req.body?.category ?? '')) ? req.body.category : undefined,
      status: ['draft', 'active', 'done', 'archived'].includes(String(req.body?.status ?? '')) ? req.body.status : undefined,
      priority: ['P0', 'P1', 'P2'].includes(String(req.body?.priority ?? '')) ? req.body.priority : undefined,
      relatedRequirementIds: Array.isArray(req.body?.relatedRequirementIds) ? req.body.relatedRequirementIds : undefined,
      linkedVersionIds: Array.isArray(req.body?.linkedVersionIds) ? req.body.linkedVersionIds : undefined,
      linkedRunIds: Array.isArray(req.body?.linkedRunIds) ? req.body.linkedRunIds : undefined,
      artifactPaths: Array.isArray(req.body?.artifactPaths) ? req.body.artifactPaths : undefined,
      metadataPatch: req.body?.metadataPatch && typeof req.body.metadataPatch === 'object' ? req.body.metadataPatch : undefined,
    }),
  );
});

app.post('/api/requirements/batch', async (req, res) => {
  if (!Array.isArray(req.body?.requirementIds) || req.body.requirementIds.length === 0) {
    res.status(400).json({ error: 'requirementIds are required' });
    return;
  }

  res.json({
    items: await requirementService.batchUpdateRequirements({
      requirementIds: req.body.requirementIds,
      subprojectId: normalizeSubprojectId(req.body?.subprojectId),
      status: ['draft', 'active', 'done', 'archived'].includes(String(req.body?.status ?? '')) ? req.body.status : undefined,
      priority: ['P0', 'P1', 'P2'].includes(String(req.body?.priority ?? '')) ? req.body.priority : undefined,
      metadataPatch: req.body?.metadataPatch && typeof req.body.metadataPatch === 'object' ? req.body.metadataPatch : undefined,
    }),
  });
});

app.post('/api/requirements/ingest-chat', async (req, res) => {
  if (typeof req.body?.sessionId !== 'string' || !req.body.sessionId.trim()) {
    res.status(400).json({ error: 'sessionId is required' });
    return;
  }

  res.status(201).json(
    await requirementService.ingestFromChat({
      sessionId: req.body.sessionId,
      messageId: typeof req.body?.messageId === 'string' ? req.body.messageId : null,
      subprojectId: normalizeSubprojectId(req.body?.subprojectId),
    }),
  );
});

app.get('/api/versions', async (req, res) => {
  res.json({ items: await versionRegistry.listEntries(normalizeSubprojectId(req.query.subprojectId)) });
});

app.get('/api/dag/graph', async (req, res) => {
  res.json(await dagService.loadGraph(normalizeSubprojectId(req.query.subprojectId)));
});

app.get('/api/dag/runs', async (req, res) => {
  res.json({ items: await dagService.listRuns(normalizeSubprojectId(req.query.subprojectId)) });
});

app.get('/api/dag/changes', async (req, res) => {
  res.json({ items: await dagService.listChangeEvents(normalizeSubprojectId(req.query.subprojectId)) });
});

app.post('/api/dag/changes', async (req, res) => {
  if (typeof req.body?.nodeId !== 'string' || !req.body.nodeId.trim()) {
    res.status(400).json({ error: 'nodeId is required' });
    return;
  }
  if (typeof req.body?.runId !== 'string' || !req.body.runId.trim()) {
    res.status(400).json({ error: 'runId is required' });
    return;
  }

  res.status(201).json(
    await dagService.registerChange({
      subprojectId: normalizeSubprojectId(req.body?.subprojectId),
      runId: req.body.runId,
      nodeId: req.body.nodeId,
      changeType:
        typeof req.body?.changeType === 'string' &&
        ['requirement', 'design', 'ui', 'backend', 'doc', 'dependency'].includes(req.body.changeType)
          ? req.body.changeType
          : 'requirement',
      previousVersion: typeof req.body?.previousVersion === 'string' ? req.body.previousVersion : null,
      newVersion: typeof req.body?.newVersion === 'string' ? req.body.newVersion : null,
      triggeredBy:
        typeof req.body?.triggeredBy === 'string' && ['user', 'agent', 'system', 'webhook'].includes(req.body.triggeredBy)
          ? req.body.triggeredBy
          : 'user',
    }),
  );
});

app.post('/api/dag/runs/:id/rerun', async (req, res) => {
  res.json(
    await dagService.rerunDirtyNodes({
      dagRunId: req.params.id,
      subprojectId: normalizeSubprojectId(req.body?.subprojectId),
      workflowRunId: typeof req.body?.workflowRunId === 'string' ? req.body.workflowRunId : null,
      reason: typeof req.body?.reason === 'string' ? req.body.reason : null,
      runUntilBlocked: typeof req.body?.runUntilBlocked === 'boolean' ? req.body.runUntilBlocked : true,
    }),
  );
});

app.get('/api/retrieval/governance', async (req, res) => {
  res.json(await retrievalGovernanceService.load(normalizeSubprojectId(req.query.subprojectId)));
});

app.patch('/api/retrieval/governance', async (req, res) => {
  res.json(
    await retrievalGovernanceService.update(normalizeSubprojectId(req.body?.subprojectId), {
      mode:
        typeof req.body?.mode === 'string' && ['local-only', 'prefer-remote', 'remote-required'].includes(req.body.mode)
          ? req.body.mode
          : undefined,
      remoteUrl: typeof req.body?.remoteUrl === 'string' ? req.body.remoteUrl : undefined,
      collectionName: typeof req.body?.collectionName === 'string' ? req.body.collectionName : undefined,
      topK: typeof req.body?.topK === 'number' ? Math.trunc(req.body.topK) : undefined,
      indexingEnabled: typeof req.body?.indexingEnabled === 'boolean' ? req.body.indexingEnabled : undefined,
      qualityGate:
        req.body?.qualityGate && typeof req.body.qualityGate === 'object'
          ? {
              minChunkCount:
                typeof req.body.qualityGate.minChunkCount === 'number' ? Math.trunc(req.body.qualityGate.minChunkCount) : undefined,
              minScore: typeof req.body.qualityGate.minScore === 'number' ? req.body.qualityGate.minScore : undefined,
              requireTruthSources:
                typeof req.body.qualityGate.requireTruthSources === 'boolean'
                  ? req.body.qualityGate.requireTruthSources
                  : undefined,
            }
          : undefined,
    }),
  );
});

app.post('/api/retrieval/governance/index', async (req, res) => {
  res.json(await retrievalGovernanceService.index(normalizeSubprojectId(req.body?.subprojectId)));
});

app.post('/api/retrieval/governance/search', async (req, res) => {
  if (typeof req.body?.query !== 'string' || !req.body.query.trim()) {
    res.status(400).json({ error: 'query is required' });
    return;
  }

  res.json(
    await retrievalGovernanceService.search(normalizeSubprojectId(req.body?.subprojectId), req.body.query.trim()),
  );
});

app.get('/api/hermes/policy-reports', async (req, res) => {
  res.json({ items: await hermesPolicyService.listReports(normalizeSubprojectId(req.query.subprojectId)) });
});

app.get('/api/evaluation-datasets', async (req, res) => {
  res.json({ items: await capabilityRegistry.listEvaluationDatasets(normalizeSubprojectId(req.query.subprojectId)) });
});

app.get('/api/evaluation-runs', async (req, res) => {
  res.json({ items: await capabilityRegistry.listEvaluationRuns(normalizeSubprojectId(req.query.subprojectId)) });
});

app.get('/api/evaluation-history', async (req, res) => {
  res.json(
    await capabilityRegistry.getEvaluationHistory({
      subprojectId: normalizeSubprojectId(req.query.subprojectId),
      capabilityId: normalizeSubprojectId(req.query.capabilityId),
      version: typeof req.query.version === 'string' ? req.query.version : null,
      requirementId: typeof req.query.requirementId === 'string' ? req.query.requirementId : null,
      versionEntryId: typeof req.query.versionEntryId === 'string' ? req.query.versionEntryId : null,
    }),
  );
});

app.post('/api/capabilities/:id/evaluation-datasets', async (req, res) => {
  if (typeof req.body?.version !== 'string' || !req.body.version.trim()) {
    res.status(400).json({ error: 'version is required' });
    return;
  }
  if (typeof req.body?.name !== 'string' || !req.body.name.trim()) {
    res.status(400).json({ error: 'name is required' });
    return;
  }
  if (!Array.isArray(req.body?.cases) || req.body.cases.length === 0) {
    res.status(400).json({ error: 'cases are required' });
    return;
  }

  const dataset = await capabilityRegistry.createEvaluationDataset(req.params.id, {
    version: req.body.version,
    name: req.body.name,
    description: typeof req.body?.description === 'string' ? req.body.description : req.body.name,
    cases: req.body.cases.map((item: Record<string, unknown>, index: number) => ({
      id: typeof item?.id === 'string' ? item.id : `case-${index + 1}`,
      input: item?.input ?? {},
      expected: item?.expected ?? {},
      rubric: Array.isArray(item?.rubric) ? item.rubric : [],
      metadata: item?.metadata && typeof item.metadata === 'object' ? item.metadata : {},
    })),
    subprojectId: normalizeSubprojectId(req.body?.subprojectId),
    metadata: req.body?.metadata && typeof req.body.metadata === 'object' ? req.body.metadata : undefined,
  });
  res.status(201).json(dataset);
});

app.post('/api/capabilities/:id/evaluation-runs', async (req, res) => {
  if (typeof req.body?.datasetId !== 'string' || !req.body.datasetId.trim()) {
    res.status(400).json({ error: 'datasetId is required' });
    return;
  }
  if (typeof req.body?.version !== 'string' || !req.body.version.trim()) {
    res.status(400).json({ error: 'version is required' });
    return;
  }
  if (typeof req.body?.evaluator !== 'string' || !req.body.evaluator.trim()) {
    res.status(400).json({ error: 'evaluator is required' });
    return;
  }

  const result = await capabilityRegistry.runEvaluationDataset(req.params.id, {
    datasetId: req.body.datasetId,
    version: req.body.version,
    evaluator: req.body.evaluator,
    subprojectId: normalizeSubprojectId(req.body?.subprojectId),
    requirementIds: Array.isArray(req.body?.requirementIds) ? req.body.requirementIds.filter((item: unknown) => typeof item === 'string') : [],
    metadata: req.body?.metadata && typeof req.body.metadata === 'object' ? req.body.metadata : undefined,
  });
  res.status(201).json(result);
});

app.post('/api/capabilities/:id/evaluations', async (req, res) => {
  if (typeof req.body?.version !== 'string' || !req.body.version.trim()) {
    res.status(400).json({ error: 'version is required' });
    return;
  }
  if (typeof req.body?.evaluator !== 'string' || !req.body.evaluator.trim()) {
    res.status(400).json({ error: 'evaluator is required' });
    return;
  }
  if (typeof req.body?.score !== 'number') {
    res.status(400).json({ error: 'score is required' });
    return;
  }

  const result = await capabilityRegistry.recordEvaluation(req.params.id, {
    version: req.body.version,
    evaluator: req.body.evaluator,
    passed: typeof req.body?.passed === 'boolean' ? req.body.passed : false,
    score: req.body.score,
    summary: typeof req.body?.summary === 'string' ? req.body.summary : '',
    dimensions: Array.isArray(req.body?.dimensions) ? req.body.dimensions : [],
    requirementIds: Array.isArray(req.body?.requirementIds) ? req.body.requirementIds.filter((item: unknown) => typeof item === 'string') : [],
    metadata: req.body?.metadata && typeof req.body.metadata === 'object' ? req.body.metadata : undefined,
    subprojectId: normalizeSubprojectId(req.body?.subprojectId),
  });
  res.status(201).json(result);
});

app.post('/api/capabilities/:id/publish', async (req, res) => {
  if (typeof req.body?.version !== 'string' || !req.body.version.trim()) {
    res.status(400).json({ error: 'version is required' });
    return;
  }

  res.json(
    await capabilityRegistry.publishCapabilityVersion(req.params.id, {
      version: req.body.version,
      releaseNotes: typeof req.body?.releaseNotes === 'string' ? req.body.releaseNotes : null,
      reviewSummary: typeof req.body?.reviewSummary === 'string' ? req.body.reviewSummary : null,
      testsPassed: typeof req.body?.testsPassed === 'boolean' ? req.body.testsPassed : undefined,
      reviewPassed: typeof req.body?.reviewPassed === 'boolean' ? req.body.reviewPassed : undefined,
      requirementIds: Array.isArray(req.body?.requirementIds) ? req.body.requirementIds : [],
      runId: typeof req.body?.runId === 'string' ? req.body.runId : null,
      subprojectId: normalizeSubprojectId(req.body?.subprojectId),
    }),
  );
});

app.post('/api/capabilities/:id/rollback', async (req, res) => {
  if (typeof req.body?.version !== 'string' || !req.body.version.trim()) {
    res.status(400).json({ error: 'version is required' });
    return;
  }

  res.json(
    await capabilityRegistry.rollbackCapabilityVersion(req.params.id, {
      version: req.body.version,
      summary: typeof req.body?.summary === 'string' ? req.body.summary : null,
      requirementIds: Array.isArray(req.body?.requirementIds) ? req.body.requirementIds : [],
      runId: typeof req.body?.runId === 'string' ? req.body.runId : null,
      subprojectId: normalizeSubprojectId(req.body?.subprojectId),
    }),
  );
});

app.post('/api/capabilities/:id/invoke', async (req, res) => {
  res.json(
    await capabilityRegistry.invokeCapability(req.params.id, {
      version: typeof req.body?.version === 'string' ? req.body.version : null,
      subprojectId: normalizeSubprojectId(req.body?.subprojectId),
      requirementIds: Array.isArray(req.body?.requirementIds) ? req.body.requirementIds : [],
      runId: typeof req.body?.runId === 'string' ? req.body.runId : null,
      payload: req.body?.payload && typeof req.body.payload === 'object' ? req.body.payload : {},
    }),
  );
});

app.get('/api/chat-snapshots/:id', async (req, res) => {
  res.json(await chatService.loadContextSnapshot(req.params.id, normalizeSubprojectId(req.query.subprojectId)));
});

app.get('/api/chat-runs/:id', async (req, res) => {
  res.json(await chatService.loadRun(req.params.id, normalizeSubprojectId(req.query.subprojectId)));
});

app.get('/api/chat-runs/:id/events', async (req, res) => {
  res.json({ items: await chatService.loadRunEvents(req.params.id, normalizeSubprojectId(req.query.subprojectId)) });
});

app.get('/api/chat-runs/:id/observability', async (req, res) => {
  res.json(await observabilityService.loadExecutionObservability(req.params.id, normalizeSubprojectId(req.query.subprojectId)));
});

app.get('/api/files/*', async (req, res) => {
  const requestedPath = decodeURIComponent(req.path.replace(/^\/api\/files\//, ''));
  if (!requestedPath) {
    res.status(400).json({ error: 'path is required' });
    return;
  }

  res.type('application/json').send(await store.read(requestedPath));
});

app.get('/api/runs', async (req, res) => {
  res.json(await orchestratorRuntime.listRuns(normalizeSubprojectId(req.query.subprojectId)));
});

app.post('/api/runs', async (req, res) => {
  const subprojectId = normalizeSubprojectId(req.body?.subprojectId);
  const project = await subprojectRegistry.resolveProjectContext(subprojectId);
  const definition = await workflowEngine.loadDefinition(project.projectRoot);
  const providers = await providerRegistry.listProviders(subprojectId);
  const servers = await mcpRegistry.listServers(subprojectId);
  const run = await orchestratorRuntime.initRun({
    definition,
    project,
    providerCount: providers.length,
    mcpServerCount: servers.length,
  });
  res.status(201).json(run);
});

app.get('/api/runs/:id', async (req, res) => {
  res.json(await orchestratorRuntime.loadRun(req.params.id, normalizeSubprojectId(req.query.subprojectId)));
});

app.post('/api/runs/:id/advance', async (req, res) => {
  const subprojectId = normalizeSubprojectId(req.query.subprojectId) ?? normalizeSubprojectId(req.body?.subprojectId);
  const run = await orchestratorRuntime.loadRun(req.params.id, subprojectId);
  const review = run.currentStageId === 'review-metrics-telemetry' ? await buildReviewForRun(run.id, run.subprojectId) : null;
  const updated = await orchestratorRuntime.advanceRun(req.params.id, { reviewReport: review });
  res.json(updated);
});

app.post('/api/runs/:id/run-until-blocked', async (req, res) => {
  const subprojectId = normalizeSubprojectId(req.query.subprojectId) ?? normalizeSubprojectId(req.body?.subprojectId);
  let run = await orchestratorRuntime.loadRun(req.params.id, subprojectId);

  while (run.status === 'running' && run.currentStageId) {
    const review = run.currentStageId === 'review-metrics-telemetry' ? await buildReviewForRun(run.id, run.subprojectId) : null;
    run = await orchestratorRuntime.advanceRun(req.params.id, { reviewReport: review });
  }

  res.json(run);
});

app.post('/api/runs/:id/resume', async (req, res) => {
  res.json(
    await orchestratorRuntime.resumeRun(req.params.id, {
      targetStageId: typeof req.body?.targetStageId === 'string' ? req.body.targetStageId : null,
      reason: typeof req.body?.reason === 'string' ? req.body.reason : null,
    }),
  );
});

app.post('/api/runs/:id/manual-gate', async (req, res) => {
  if (!['approve', 'rework'].includes(String(req.body?.decision ?? ''))) {
    res.status(400).json({ error: 'decision must be approve or rework' });
    return;
  }
  if (typeof req.body?.summary !== 'string' || !req.body.summary.trim()) {
    res.status(400).json({ error: 'summary is required' });
    return;
  }

  res.json(
    await orchestratorRuntime.applyManualGateDecision(req.params.id, {
      decision: req.body.decision,
      summary: req.body.summary,
      targetStageId: typeof req.body?.targetStageId === 'string' ? req.body.targetStageId : null,
    }),
  );
});

app.get('/api/runs/:id/events', async (req, res) => {
  const subprojectId = normalizeSubprojectId(req.query.subprojectId);
  res.json(await workflowEngine.loadEvents(req.params.id, subprojectId));
});

app.get('/api/runs/:id/artifacts', async (req, res) => {
  const run = await orchestratorRuntime.loadRun(req.params.id, normalizeSubprojectId(req.query.subprojectId));
  res.json(await workflowEngine.hydrateArtifacts(run));
});

app.get('/api/runs/:id/review', async (req, res) => {
  res.json(await buildReviewForRun(req.params.id, normalizeSubprojectId(req.query.subprojectId)));
});

app.get('/api/runs/:id/metrics', async (req, res) => {
  const run = await orchestratorRuntime.loadRun(req.params.id, normalizeSubprojectId(req.query.subprojectId));
  const activeOrCompletedReview = run.stages.some((stage) => stage.id === 'review-metrics-telemetry' && stage.status !== 'pending');
  const review = activeOrCompletedReview ? await buildReviewForRun(req.params.id, run.subprojectId) : null;
  res.json(await workflowEngine.buildMetrics(run, review));
});

app.get('/api/runs/:id/hermes-policy', async (req, res) => {
  const run = await orchestratorRuntime.loadRun(req.params.id, normalizeSubprojectId(req.query.subprojectId));
  res.json(await hermesPolicyService.evaluateRun(run));
});

app.get('/api/workflow', async (req, res) => {
  res.json(await ensureCurrentRun(normalizeSubprojectId(req.query.subprojectId)));
});

app.get('/api/workflow-definition', async (req, res) => {
  const project = await subprojectRegistry.resolveProjectContext(normalizeSubprojectId(req.query.subprojectId));
  res.json(await workflowEngine.loadDefinition(project.projectRoot));
});

app.get('/api/workflow-events', async (req, res) => {
  const subprojectId = normalizeSubprojectId(req.query.subprojectId);
  const run = await ensureCurrentRun(subprojectId);
  res.json(await workflowEngine.loadEvents(run.id, run.subprojectId));
});

app.get('/api/workflow-metrics', async (req, res) => {
  const subprojectId = normalizeSubprojectId(req.query.subprojectId);
  const run = await ensureCurrentRun(subprojectId);
  const activeOrCompletedReview = run.stages.some((stage) => stage.id === 'review-metrics-telemetry' && stage.status !== 'pending');
  const review = activeOrCompletedReview ? await buildReviewForRun(run.id, run.subprojectId) : null;
  res.json(await workflowEngine.buildMetrics(run, review));
});

app.get('/api/artifacts', async (req, res) => {
  const run = await ensureCurrentRun(normalizeSubprojectId(req.query.subprojectId));
  res.json(await workflowEngine.hydrateArtifacts(run));
});

app.get('/api/review', async (req, res) => {
  const run = await ensureCurrentRun(normalizeSubprojectId(req.query.subprojectId));
  res.json(await buildReviewForRun(run.id, run.subprojectId));
});

app.get('/api/providers', async (req, res) => {
  const subprojectId = normalizeSubprojectId(req.query.subprojectId);
  res.json(await providerRegistry.listProviders(subprojectId));
});

app.get('/api/providers/routing', async (req, res) => {
  const subprojectId = normalizeSubprojectId(req.query.subprojectId);
  const project = await subprojectRegistry.resolveProjectContext(subprojectId);
  const capabilityQuery = typeof req.query.capability === 'string' ? req.query.capability.trim() : '';
  const capabilities = capabilityQuery
    ? [capabilityQuery]
    : ['text', 'code', 'review', 'text-multimodal'];

  res.json({
    items: await Promise.all(
      capabilities.map((capability) =>
        llmRouter.describeRouting(capability as 'text' | 'code' | 'review' | 'text-multimodal', {
          subprojectId,
          preferredProvider: project.selectedProvider,
          allowCrossCapabilityFallback: capability === 'text-multimodal',
        }),
      ),
    ),
  });
});

app.post('/api/providers/primary', async (req, res) => {
  const subprojectId = normalizeSubprojectId(req.body?.subprojectId);
  const providerName = typeof req.body?.providerName === 'string' ? req.body.providerName.trim() : '';

  if (!providerName) {
    res.status(400).json({ error: 'providerName is required' });
    return;
  }

  const provider = await providerRegistry.resolveProviderByName(providerName, subprojectId);
  if (!provider) {
    res.status(404).json({ error: 'provider_not_found' });
    return;
  }

  if (subprojectId) {
    await subprojectRegistry.updateOverrides(subprojectId, { provider: providerName });
  } else {
    await providerRegistry.setDefaultProvider(providerName, null);
  }

  const project = await subprojectRegistry.resolveProjectContext(subprojectId);
  res.json({
    subprojectId,
    providerName,
    selectedProvider: project.selectedProvider,
    defaultProvider: (await providerRegistry.loadConfig(subprojectId)).defaultProvider,
  });
});

app.post('/api/providers/:name/priority', async (req, res) => {
  const subprojectId = normalizeSubprojectId(req.body?.subprojectId);
  const delta = typeof req.body?.delta === 'number' ? Math.trunc(req.body.delta) : 0;
  const provider = await providerRegistry.resolveProviderByName(req.params.name, subprojectId);

  if (!provider) {
    res.status(404).json({ error: 'provider_not_found' });
    return;
  }

  if (!delta) {
    res.status(400).json({ error: 'delta must be a non-zero number' });
    return;
  }

  const updated = await providerRegistry.updateProvider(
    req.params.name,
    {
      priority: provider.priority + delta,
    },
    subprojectId,
  );

  res.json({
    name: updated.name,
    priority: updated.priority,
    subprojectId,
  });
});

app.get('/api/providers/:name', async (req, res) => {
  const subprojectId = normalizeSubprojectId(req.query.subprojectId);
  const provider = await providerRegistry.resolveProviderByName(req.params.name, subprojectId);
  if (!provider) {
    res.status(404).json({ error: 'provider_not_found' });
    return;
  }

  res.json({
    name: provider.name,
    type: provider.type,
    configured: provider.configured,
    runtimeReady: provider.runtimeReady,
    deprecatedEnvInUse: provider.deprecatedEnvInUse,
    activeEnvKey: provider.activeEnvKey,
    capabilities: provider.capabilities,
    model: provider.model ?? null,
    baseUrl: provider.baseUrl ?? null,
    priority: provider.priority,
  });
});

app.get('/api/mcp', async (req, res) => {
  res.json(await mcpRegistry.listServers(normalizeSubprojectId(req.query.subprojectId)));
});

const staticDir = path.join(rootDir, 'dist');
const staticIndexPath = path.join(staticDir, 'index.html');

if (fs.existsSync(staticIndexPath)) {
  app.use(express.static(staticDir, { index: false }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      next();
      return;
    }

    res.sendFile(staticIndexPath);
  });
}

const port = Number(process.env.PORT ?? 4312);
app.listen(port, () => {
  console.log(`PMAIOS backend listening on http://localhost:${port}`);
});

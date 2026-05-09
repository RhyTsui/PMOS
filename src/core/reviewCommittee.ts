import type { CommitteeReport } from '../shared/schemas.js';

type ReviewArtifact = {
  path: string;
  content: string;
};

type ReviewCommitteeInput = {
  runId: string;
  artifactCount: number;
  activeStageId?: string | null;
  activatedSpecialistRoles?: string[];
  openSourceEvaluationPresent?: boolean;
  openSourceEvidencePaths?: string[];
  artifacts?: ReviewArtifact[];
  hermesResearchFindings?: Array<{
    id: string;
    topic: string;
    summary: string;
    query?: string | null;
    resultCount?: number;
  }>;
  hermesAutoPromotions?: Array<{
    comparisonId: string;
    writebackTargets: Array<{
      status: 'planned' | 'recorded' | 'active' | 'completed';
      taskRequirementId?: string | null;
      closureEvidencePaths?: string[];
    }>;
  }>;
  hermesWatchFindings?: Array<{
    status: 'active' | 'resolved' | 'parked';
    taskRequirementId?: string | null;
    trackedRequirementIds?: string[];
    closureEvidencePaths?: string[];
    recurrenceCount?: number;
    stableRunCount?: number;
    noiseSuppressed?: boolean;
  }>;
};

type CommitteeIssue = CommitteeReport['roles'][number]['issues'][number];

type StageRoleSpec = {
  role: string;
  summary: string;
  checks: Array<{
    title: string;
    passWhen: boolean;
    description: string;
    impact: string;
    recommendation: string;
    expectedAnswer: string;
    failStageId?: string | null;
  }>;
};

type StageChecks = {
  requirementToFunction: boolean;
  functionToApi: boolean;
  objectModel: boolean;
  solutionOptimality: boolean;
  currentSystemState: boolean;
  developmentTaskBreakdown: boolean;
  frontendLayout: boolean;
  moduleResponsibility: boolean;
  userFlow: boolean;
  interactiveFrontend: boolean;
  uiSpec: boolean;
  dataSchema: boolean;
  apiContract: boolean;
  integrationEvidence: boolean;
};

function makeIssue(input: {
  title: string;
  passWhen: boolean;
  description: string;
  impact: string;
  recommendation: string;
  expectedAnswer: string;
}): CommitteeIssue {
  return {
    title: input.title,
    description: input.description,
    impact: input.impact,
    recommendation: input.recommendation,
    expectedAnswer: input.expectedAnswer,
    decision: input.passWhen ? 'Pass' : 'Conditional',
  };
}

export class ReviewCommittee {
  inspectOpenSourceEvidence(artifacts: ReviewArtifact[]) {
    const evidencePatterns = [
      /open source first/iu,
      /open-source-first/iu,
      /build[- ]vs[- ]buy/iu,
      /buy before build/iu,
      /existing solution/iu,
      /mature open source/iu,
      /现成方案/u,
      /开源优先/u,
      /优先评估开源/u,
    ];

    const evidencePaths = artifacts
      .filter((artifact) => evidencePatterns.some((pattern) => pattern.test(artifact.content)))
      .map((artifact) => artifact.path);

    return {
      present: evidencePaths.length > 0,
      evidencePaths,
    };
  }

  buildReportForRun(input: ReviewCommitteeInput): CommitteeReport {
    const stageId = input.activeStageId ?? 'frontend-backend-integration';
    const artifacts = input.artifacts ?? [];
    const hasOpenSourceEvaluation = input.openSourceEvaluationPresent ?? true;
    const openSourceEvidencePaths = input.openSourceEvidencePaths ?? [];
    const hermesResearchFindings = input.hermesResearchFindings ?? [];
    const hermesAutoPromotions = input.hermesAutoPromotions ?? [];
    const hermesWatchFindings = input.hermesWatchFindings ?? [];
    const artifactText = artifacts.map((artifact) => artifact.content).join('\n');
    const hasArtifactContent = artifacts.length > 0;
    const requiredArtifactCount = stageId === 'frontend-backend-integration' ? 6 : 1;
    const hasEnoughArtifacts = input.artifactCount >= requiredArtifactCount;

    const contains = (pattern: RegExp) => (!hasArtifactContent ? true : pattern.test(artifactText));
    const containsAll = (patterns: RegExp[]) => (!hasArtifactContent ? true : patterns.every((pattern) => pattern.test(artifactText)));

    const checks: StageChecks = {
      requirementToFunction: contains(/requirement-to-function|Function IDs|Requirement ID|需求拆解|功能拆解/iu),
      functionToApi: contains(/function-to-api|API \/ Event Candidate|Function ID|接口收口|接口映射/iu),
      objectModel: contains(/core object model|实体|关系|关键状态|对象模型/iu),
      solutionOptimality: containsAll([
        /solution optimality|候选替代方案|替代方案|更优解|optimal solution/iu,
        /version fit|版本适配|current version|当前阶段|过度设计风险/iu,
      ]),
      currentSystemState: contains(/current system state|系统现状|现状理解|existing modules|相关模块|技术约束|system constraints|涉及文件/iu),
      developmentTaskBreakdown: containsAll([
        /development task breakdown|开发任务清单|任务拆解|impacted modules|涉及模块|affected modules/iu,
        /frontend task|前端任务|backend task|后端任务|数据任务|test task|测试任务|risk|风险|regression/iu,
      ]),
      frontendLayout: contains(/layout|information architecture|navigation structure|布局|信息架构|导航结构/iu),
      moduleResponsibility: contains(/module responsibility|page responsibility|page-to-function mapping|模块责任|页面责任|页面到功能映射/iu),
      userFlow: contains(/user flow|journey|key interaction flow|主流程|关键交互流程|用户流程/iu),
      interactiveFrontend: contains(/interactive|dynamic|loading state|empty state|error state|submit|filter|drawer|modal|form|table|动态交互|加载态|空态|异常态|表单|表格|筛选/iu),
      uiSpec: containsAll([/typography|font family|字体/iu, /radius|圆角/iu, /spacing|间距/iu, /state|状态/iu]),
      dataSchema: containsAll([/entity|实体/iu, /field|字段/iu, /relation|关系/iu]),
      apiContract: containsAll([/request|入参/iu, /response|出参/iu, /error|错误/iu]),
      integrationEvidence: contains(/integration|联调|验收|blocked item|acceptance/iu),
    };

    const stageRoleSpecs = this.buildStageRoleSpecs(
      stageId,
      checks,
      hasOpenSourceEvaluation,
      openSourceEvidencePaths.length > 0,
      hermesResearchFindings,
    );
    const roles = stageRoleSpecs.map((spec) => {
      const issues = spec.checks.map((check) => makeIssue(check));
      const blockedChecks = spec.checks.filter((check) => !check.passWhen);
      return {
        role: spec.role,
        summary: blockedChecks.length === 0 ? spec.summary : `${spec.summary} 当前仍有 ${blockedChecks.length} 个待补项。`,
        issues,
      };
    });
    const requiredSpecialistRoles = stageRoleSpecs.map((spec) => spec.role);
    const hasExplicitActivatedSpecialists = Boolean(input.activatedSpecialistRoles);
    const activatedSpecialistRoles = input.activatedSpecialistRoles?.length
      ? input.activatedSpecialistRoles
      : requiredSpecialistRoles;
    const activationTrace = [
      ...requiredSpecialistRoles.map((role) => {
        const activated = activatedSpecialistRoles.includes(role);
        return {
          role,
          required: true,
          activated,
          source: activated
            ? hasExplicitActivatedSpecialists
              ? 'stage-specialist-runtime'
              : 'implicit-stage-default'
            : 'missing-stage-specialist',
          status: activated
            ? hasExplicitActivatedSpecialists
              ? 'active' as const
              : 'assumed' as const
            : 'missing' as const,
        };
      }),
      {
        role: 'Hermes Governance',
        required: true,
        activated: true,
        source: 'governance-aggregator',
        status: 'active' as const,
      },
      {
        role: 'Human Final Approval',
        required: true,
        activated: true,
        source: 'final-approval-gate',
        status: 'active' as const,
      },
    ];
    const missingRequiredRoles = activationTrace.filter((item) => item.required && !item.activated);

    const missingChecks = stageRoleSpecs.flatMap((spec) => spec.checks).filter((check) => !check.passWhen);
    const stageBlockingStageId =
      !hasEnoughArtifacts && stageId === 'frontend-backend-integration'
        ? 'backend-api'
        : missingChecks.find((check) => check.failStageId)?.failStageId ?? stageId;
    const gateBlocked = !hasEnoughArtifacts || missingChecks.length > 0 || missingRequiredRoles.length > 0;

    const hermesRole = {
      role: 'Hermes Governance',
      summary: gateBlocked
        ? 'Hermes 负责汇总多角色评审问题，并给出 keep / revise / block / promote 治理动作，而不是把原始文档直接丢给人。'
        : 'Hermes 已把多角色评审收口为治理判断，可直接供最终人工裁决使用。',
      issues: [
        makeIssue({
          title: 'Hermes governance summary is required',
          passWhen: true,
          description: 'Hermes is responsible for aggregating multi-role review findings into a governed decision package.',
          impact: 'Review conclusions can become reusable governance instead of one-off chat output.',
          recommendation: 'Persist multi-role findings and Hermes judgment together with the workflow run.',
          expectedAnswer: 'Hermes should summarize what to keep, revise, block, or promote before human final approval.',
        }),
      ],
    };

    const humanRole = {
      role: 'Human Final Approval',
      summary: gateBlocked
        ? '当前不应进入人工最终放行，必须先完成 agent committee 校对与 Hermes 治理收口。'
        : '人工处于最后一层，用于风险接受、优先级判断和最终放行，而不是做人肉 lint。',
      issues: [
        makeIssue({
          title: 'Human approval is the final gate, not the first lint pass',
          passWhen: !gateBlocked,
          description: gateBlocked
            ? 'The current artifact set still has unresolved committee issues, so human review should not be the first quality net.'
            : 'The artifact set has passed multi-role committee checks and is ready for final human evaluation.',
          impact: 'Prevents expensive human review time from being spent on low-level structural defects.',
          recommendation: gateBlocked
            ? 'Resolve the committee and Hermes issues before requesting human approval.'
            : 'Use human review for prioritization, risk acceptance, and final decision only.',
          expectedAnswer: gateBlocked
            ? 'All blocking committee issues should be closed first.'
            : 'Human final approval can now focus on business judgment and risk acceptance.',
        }),
      ],
    };

    const allRoles = [...roles, hermesRole, humanRole];
    if (!hasEnoughArtifacts) {
      allRoles.unshift({
        role: 'Evidence Completeness Review',
        summary: `当前阶段产物数量不足，至少需要 ${requiredArtifactCount} 份可评审产物。`,
        issues: [
          makeIssue({
            title: 'Reviewable artifact set is incomplete',
            passWhen: false,
            description: `The current stage exposes ${input.artifactCount} artifact(s), below the required minimum ${requiredArtifactCount}.`,
            impact: 'The committee cannot verify whether the stage output is complete enough for governed continuation.',
            recommendation: 'Complete the missing artifacts before re-running committee review.',
            expectedAnswer: `At least ${requiredArtifactCount} reviewable artifacts should exist for this stage.`,
          }),
        ],
      });
    }
    if (missingRequiredRoles.length > 0) {
      allRoles.unshift({
        role: 'Specialist Activation Review',
        summary: `当前缺少 ${missingRequiredRoles.length} 个必需 specialist role 激活，review 不应继续视为有效通过。`,
        issues: missingRequiredRoles.map((item) => makeIssue({
          title: `Required specialist role is missing: ${item.role}`,
          passWhen: false,
          description: `Stage ${stageId} requires specialist role ${item.role}, but no activation trace was provided.`,
          impact: 'Without role activation trace, review can degrade into nominal committee labels instead of actual specialist participation.',
          recommendation: 'Provide activated specialist roles for this stage or wire the stage runtime to auto-emit activation trace before review.',
          expectedAnswer: `Role ${item.role} should appear in the activation trace before the review can pass.`,
        })),
      });
    }

    const hermes = this.buildHermesSummary(
      stageId,
      hasEnoughArtifacts,
      missingChecks,
      gateBlocked,
      hermesResearchFindings,
      hermesAutoPromotions,
      hermesWatchFindings,
    );
    const issueCount = allRoles.reduce((count, role) => count + role.issues.filter((issue) => issue.decision !== 'Pass').length, 0);

    return {
      overallConclusion: gateBlocked ? '评审未通过，需要先完成多角色 agent 校对与 Hermes 治理收口。' : '评审通过，可以进入 Hermes 汇总与最终人工评估。',
      nextStage: !gateBlocked,
      reworkRequired: gateBlocked,
      gate: {
        decision: gateBlocked ? 'conditional' : 'pass',
        blocked: gateBlocked,
        issueCount,
        blockingStageId: gateBlocked ? stageBlockingStageId : null,
      },
      roles: allRoles,
      activationTrace,
      hermes,
      summary: gateBlocked
        ? `多角色评审未通过，${stageId} 仍缺少可支撑下游开发的结构化内容。`
        : `多角色评审通过，${stageId} 已具备进入下游或进入最终人工评估的基础。`,
      recommendedReworkStageId: gateBlocked ? stageBlockingStageId : null,
    };
  }

  private buildStageRoleSpecs(
    stageId: string,
    checks: StageChecks,
    hasOpenSourceEvaluation: boolean,
    hasOpenSourceEvidencePaths: boolean,
    hermesResearchFindings: ReviewCommitteeInput['hermesResearchFindings'] = [],
  ): StageRoleSpec[] {
    const systemStateFinding = hermesResearchFindings.find((item) => item.id === 'research-system-state-search') ?? null;
    const commonResearchRole: StageRoleSpec = {
      role: 'Research Review',
      summary: 'Research review checks whether upstream build-vs-buy and open-source-first reasoning remain visible.',
      checks: [
        {
          title: 'Open-source-first evaluation is visible',
          passWhen: hasOpenSourceEvaluation || hasOpenSourceEvidencePaths,
          description: 'Current artifacts should still expose build-vs-buy or open-source-first evidence.',
          impact: 'Without it, downstream delivery may drift into premature self-build decisions.',
          recommendation: 'Keep research evidence linked in the current package or explicitly reference the upstream source.',
          expectedAnswer: 'Reviewers can find open-source-first reasoning without guessing.',
          failStageId: 'research-document',
        },
        {
          title: 'System-state knowledge grounding is visible',
          passWhen: !systemStateFinding || (systemStateFinding.resultCount ?? 0) > 0,
          description: 'Important review packages should ideally carry Hermes system-state retrieval grounding instead of relying on repo documents alone.',
          impact: 'Without it, product and development review may miss current-version facts, constraints, or prior decisions that live in the knowledge base.',
          recommendation: 'Attach Hermes default-KB retrieval summary or improve the retrieval query / KB naming until current system-state evidence is visible.',
          expectedAnswer: 'Reviewers can see at least one grounded system-state retrieval result when the project is using Dataki knowledge context.',
          failStageId: stageId === 'requirements-document' ? 'requirements-document' : 'functional-specification',
        },
      ],
    };

    if (stageId === 'requirements-document') {
      return [
        {
          role: 'Solution-Optimality Review',
          summary: 'Product-side optimality review checks whether the package solves the right problem with the right scope for the current version.',
          checks: [
            {
              title: 'Requirements are decomposed to function level',
              passWhen: checks.requirementToFunction,
              description: 'The requirement document should map important requirements to concrete functions.',
              impact: 'Without this, downstream design and engineering will reinterpret the same requirement differently.',
              recommendation: 'Add a requirement-to-function breakdown matrix with acceptance links.',
              expectedAnswer: 'Each important requirement has Requirement ID, Function IDs, and acceptance criteria.',
              failStageId: 'requirements-document',
            },
            {
              title: 'Current solution is compared against alternatives',
              passWhen: checks.solutionOptimality,
              description: 'Requirements review should explain candidate alternatives, current-version fit, and why the chosen scope is the better answer now.',
              impact: 'Without it, product review becomes a completeness pass instead of a judgment on whether this is the right solution.',
              recommendation: 'Add candidate alternatives, version-fit judgment, and over-design risk to the requirement package.',
              expectedAnswer: 'Reviewers can see why the current solution is better than smaller, heavier, or deferred alternatives.',
              failStageId: 'requirements-document',
            },
          ],
        },
        {
          role: 'Technical Review',
          summary: 'Technical review checks whether the requirement package already exposes enough system semantics for downstream decomposition.',
          checks: [
            {
              title: 'Core object model is already exposed',
              passWhen: checks.objectModel,
              description: 'Even at requirement stage, core entities and key states should be visible when they drive system design.',
              impact: 'Without object hints, the function spec becomes a second round of product rediscovery.',
              recommendation: 'Expose entities, key states, and main input/output objects in the requirement package.',
              expectedAnswer: 'Technical reviewers can see the business objects that later functions will operate on.',
              failStageId: 'requirements-document',
            },
          ],
        },
        commonResearchRole,
      ];
    }

    if (stageId === 'functional-specification') {
      return [
        {
          role: 'Development Review',
          summary: 'Development review checks whether the function package can be turned directly into executable frontend/backend/data/test tasks.',
          checks: [
            {
              title: 'Functions are decomposed to interface level',
              passWhen: checks.functionToApi,
              description: 'The function document should identify trigger, input, response, and API/event candidates.',
              impact: 'Without this, backend API design becomes speculative and frontend states drift.',
              recommendation: 'Add a function-to-api mapping table for each core function.',
              expectedAnswer: 'Every core function can point to one or more concrete contract candidates.',
              failStageId: 'functional-specification',
            },
            {
              title: 'Current system state and implementation constraints are explicit',
              passWhen: checks.currentSystemState,
              description: 'Development review should be grounded in current modules, existing data structures, technical constraints, and reuse boundaries.',
              impact: 'Without current-state grounding, technical review will recommend abstract work that collides with the real codebase.',
              recommendation: 'Add current system state, involved modules/files, and known constraints to the function package.',
              expectedAnswer: 'Reviewers can tell what already exists, what should be reused, and where the change will land.',
              failStageId: 'functional-specification',
            },
            {
              title: 'Function package is decomposed into executable development tasks',
              passWhen: checks.developmentTaskBreakdown,
              description: 'The function package should split work into concrete frontend, backend, data, and test tasks with impact and regression notes.',
              impact: 'Without task-level decomposition, delivery still depends on humans reinterpreting the document before coding.',
              recommendation: 'Add development task breakdown, impacted modules, risks, and regression surface before implementation starts.',
              expectedAnswer: 'Developers can start work directly from the reviewed package instead of re-planning it in chat.',
              failStageId: 'functional-specification',
            },
          ],
        },
        {
          role: 'Technical Review',
          summary: 'Technical review checks whether the functional package exposes stable business semantics for schema and API work.',
          checks: [
            {
              title: 'Core object model is explicit',
              passWhen: checks.objectModel,
              description: 'The functional package should expose entities, relations, and key states.',
              impact: 'Without it, data schema and API contracts will each invent their own semantics.',
              recommendation: 'Write the object model before data schema and API work proceed.',
              expectedAnswer: 'Reviewers can see stable entities and relationships in the function package.',
              failStageId: 'functional-specification',
            },
          ],
        },
        commonResearchRole,
      ];
    }

    if (stageId === 'design-document') {
      return [
        {
          role: 'Design Review',
          summary: 'Design review checks whether the design package can drive delivery-grade frontend work instead of staying at concept prose level.',
          checks: [
            {
              title: 'Page layout and information architecture are explicit',
              passWhen: checks.frontendLayout,
              description: 'The design package should define page inventory, page hierarchy, navigation, and information layout.',
              impact: 'Without it, frontend work will improvise structure and fall back to generic workbench shells.',
              recommendation: 'Add page list, information architecture, and navigation structure to the design document.',
              expectedAnswer: 'Reviewers can see how users enter, move, and complete work across pages.',
              failStageId: 'design-document',
            },
            {
              title: 'User flow and interaction flow are explicit',
              passWhen: checks.userFlow,
              description: 'The design package should expose the key user flows, step transitions, and exception paths.',
              impact: 'Without it, frontend pages become static demonstrations instead of user-facing workflows.',
              recommendation: 'Add key user flows, key interaction flows, and fallback paths to the design document.',
              expectedAnswer: 'Reviewers can trace the user journey from entry to completion and failure handling.',
              failStageId: 'design-document',
            },
          ],
        },
        {
          role: 'Product Review',
          summary: 'Product review checks whether the design document still preserves module responsibility and user-task fit.',
          checks: [
            {
              title: 'Page and module responsibility are explicit',
              passWhen: checks.moduleResponsibility,
              description: 'The design package should map pages and modules back to function responsibility.',
              impact: 'Without it, pages become decorative containers instead of business task carriers.',
              recommendation: 'Add page-to-function or module responsibility mapping to the design package.',
              expectedAnswer: 'Each core page or block has a clear business responsibility and upstream function mapping.',
              failStageId: 'design-document',
            },
          ],
        },
        commonResearchRole,
      ];
    }

    if (stageId === 'frontend-page') {
      return [
        {
          role: 'Design Review',
          summary: 'Design review checks whether the frontend page package is a delivery-grade user-facing page instead of a low-fidelity mock or document page.',
          checks: [
            {
              title: 'UI specification is explicit',
              passWhen: checks.uiSpec,
              description: 'The UI package should explicitly define typography, spacing, radius, and states.',
              impact: 'Without it, frontend delivery will drift page by page and designers will repeat the same correction.',
              recommendation: 'Bind the page package to an explicit UI spec with token and state sections.',
              expectedAnswer: 'UI reviewers can read the governed rules without asking for font/radius/spacing again.',
              failStageId: 'frontend-page',
            },
            {
              title: 'Page layout and module structure are delivery-grade',
              passWhen: checks.frontendLayout && checks.moduleResponsibility,
              description: 'The frontend page package should prove that layout hierarchy, module division, and page responsibility are ready for implementation.',
              impact: 'Without it, teams get flat示意页 or generic card walls instead of executable page structures.',
              recommendation: 'Show page layout, module boundaries, page responsibility, and page-to-function mapping explicitly.',
              expectedAnswer: 'Reviewers can judge whether the page structure is correct for the user task and not just visually neat.',
              failStageId: 'frontend-page',
            },
          ],
        },
        {
          role: 'Frontend Review',
          summary: 'Frontend review checks whether the page package is truly interactive and implementable without guessing.',
          checks: [
            {
              title: 'User flow and dynamic interaction are explicit',
              passWhen: checks.userFlow && checks.interactiveFrontend,
              description: 'The page package should show user flow, dynamic interactions, and runtime states instead of static explanatory panels.',
              impact: 'Without it, the frontend output becomes a document-like layout that cannot guide real development.',
              recommendation: 'Add dynamic interaction states, loading/empty/error feedback, and user action transitions to the page package.',
              expectedAnswer: 'Frontend can implement real interactive behavior rather than inferring it from prose.',
              failStageId: 'frontend-page',
            },
            {
              title: 'Function and state semantics are preserved',
              passWhen: checks.functionToApi || checks.objectModel,
              description: 'The page package should still expose data dependencies and state transitions from upstream stages.',
              impact: 'Without it, UI and API teams drift into parallel reinterpretation.',
              recommendation: 'Carry forward state transitions, backend-coupled feedback, and object references.',
              expectedAnswer: 'Frontend can implement pages without inventing new semantics.',
              failStageId: 'frontend-page',
            },
          ],
        },
        commonResearchRole,
      ];
    }

    if (stageId === 'data-schema') {
      return [
        {
          role: 'Data Review',
          summary: 'Data review checks whether schema design is grounded in existing business objects.',
          checks: [
            {
              title: 'Schema formalizes existing object semantics',
              passWhen: checks.dataSchema && checks.objectModel,
              description: 'The schema package should expose entities, fields, and relations while staying tied to the object model.',
              impact: 'Without this, database design becomes disconnected from product semantics.',
              recommendation: 'Make entity, field, and relation definitions explicitly traceable to the upstream object model.',
              expectedAnswer: 'Reviewers can see how schema formalizes, rather than invents, the business model.',
              failStageId: 'data-schema',
            },
          ],
        },
        {
          role: 'Technical Review',
          summary: 'Technical review checks whether schema output can support downstream API and page states.',
          checks: [
            {
              title: 'Schema supports downstream contracts',
              passWhen: checks.functionToApi || checks.apiContract,
              description: 'The current package should still make it obvious how the schema supports function and API contracts.',
              impact: 'Without this, backend and frontend teams will each patch missing fields differently.',
              recommendation: 'Keep function-to-api references visible when formalizing schema.',
              expectedAnswer: 'Data reviewers can see how tables support the planned actions and responses.',
              failStageId: 'data-schema',
            },
          ],
        },
      ];
    }

    if (stageId === 'backend-api') {
      return [
        {
          role: 'Backend Review',
          summary: 'Backend review checks whether API contracts are explicit enough for implementation and integration.',
          checks: [
            {
              title: 'API contracts are explicit',
              passWhen: checks.apiContract,
              description: 'The API package should expose request, response, and error semantics.',
              impact: 'Without this, frontend-backend integration will become a live negotiation instead of contract execution.',
              recommendation: 'Document request, response, error, permission, and async/pagination rules per API.',
              expectedAnswer: 'Developers can implement and mock APIs directly from the contract.',
              failStageId: 'backend-api',
            },
          ],
        },
        {
          role: 'Development Review',
          summary: 'Development review checks whether API work is still grounded in executable task decomposition and real system impact.',
          checks: [
            {
              title: 'API output traces back to function-to-api mapping',
              passWhen: checks.functionToApi,
              description: 'The API package should refine the upstream function mapping instead of restating product prose.',
              impact: 'Without this, API scope will bloat and drift from product behavior.',
              recommendation: 'Carry Function IDs and API/Event candidate mappings into the interface package.',
              expectedAnswer: 'Each API contract can be traced back to a specific function.',
              failStageId: 'backend-api',
            },
            {
              title: 'Implementation impact is explicit',
              passWhen: checks.currentSystemState || checks.developmentTaskBreakdown,
              description: 'API review should still name touched modules, compatibility boundaries, and regression surface.',
              impact: 'Without it, backend implementation remains a hidden second planning cycle.',
              recommendation: 'Add impacted modules, compatibility constraints, and backend/test task notes to the API package.',
              expectedAnswer: 'The backend team can identify where to change code and what might regress.',
              failStageId: 'backend-api',
            },
          ],
        },
      ];
    }

    return [
      {
        role: 'Delivery Review',
        summary: 'Delivery review checks whether end-to-end integration evidence is present.',
        checks: [
          {
            title: 'Integration and acceptance evidence is visible',
            passWhen: checks.integrationEvidence && hasEnoughArtifactsFallback(stageId),
            description: 'The final package should expose integration results, blockers, and acceptance conclusions.',
            impact: 'Without this, the platform cannot prove that the delivery chain is closed.',
            recommendation: 'Keep integration report, blocked items, and acceptance outputs in the review bundle.',
            expectedAnswer: 'Reviewers can see what passed, what failed, and where rework should go.',
            failStageId: 'frontend-backend-integration',
          },
        ],
      },
      {
        role: 'Development Review',
        summary: 'Development review checks whether integration output still ties back to executable tasks and real affected modules.',
        checks: [
          {
            title: 'Function, schema, and API semantics remained connected',
            passWhen: checks.functionToApi && checks.apiContract && checks.dataSchema,
            description: 'Integration review should still show the connection from function to schema to API.',
            impact: 'Without this, the run may pass local integration while still losing governed semantics.',
            recommendation: 'Reference the upstream matrices and contracts inside the integration output.',
            expectedAnswer: 'Integration reviewers can trace behavior back to the governed artifacts.',
            failStageId: 'backend-api',
          },
          {
            title: 'Remaining delivery work is task-addressable',
            passWhen: checks.developmentTaskBreakdown || checks.currentSystemState,
            description: 'Integration review should expose the exact affected modules, open tasks, owners, and regression surface when blockers remain.',
            impact: 'Without this, the system knows something is blocked but not how engineering should continue.',
            recommendation: 'Name remaining development tasks, affected modules, and next-safe-step ownership in the integration package.',
            expectedAnswer: 'Blocked integration can be resumed from concrete implementation tasks instead of general prose.',
            failStageId: 'frontend-backend-integration',
          },
        ],
      },
      commonResearchRole,
    ];
  }

  private buildHermesSummary(
    stageId: string,
    hasEnoughArtifacts: boolean,
    missingChecks: Array<{ title: string; recommendation: string; failStageId?: string | null }>,
    gateBlocked: boolean,
    hermesResearchFindings: ReviewCommitteeInput['hermesResearchFindings'] = [],
    hermesAutoPromotions: ReviewCommitteeInput['hermesAutoPromotions'] = [],
    hermesWatchFindings: ReviewCommitteeInput['hermesWatchFindings'] = [],
  ): CommitteeReport['hermes'] {
    const systemStateFinding = hermesResearchFindings.find((item) => item.id === 'research-system-state-search') ?? null;
    const writebackTargets = hermesAutoPromotions.flatMap((item) => item.writebackTargets);
    const completedTargets = writebackTargets.filter((item) => item.status === 'completed').length;
    const openTargets = writebackTargets.filter((item) => item.status !== 'completed').length;
    const writebackTaskIds = new Set(
      writebackTargets.map((item) => item.taskRequirementId).filter((item): item is string => Boolean(item)),
    );
    const activeWritebackTaskCount = writebackTargets.filter(
      (item) => item.status !== 'completed' && Boolean(item.taskRequirementId),
    ).length;
    const activeWatchFindings = hermesWatchFindings.filter((item) => item.status === 'active').length;
    const resolvedWatchFindings = hermesWatchFindings.filter((item) => item.status === 'resolved').length;
    const recurringWatchFindings = hermesWatchFindings.filter((item) => (item.recurrenceCount ?? 1) > 1).length;
    const suppressedWatchFindings = hermesWatchFindings.filter((item) => item.noiseSuppressed === true).length;
    const watchTaskIds = new Set(
      hermesWatchFindings.flatMap((item) => item.trackedRequirementIds ?? [])
        .concat(
          hermesWatchFindings.map((item) => item.taskRequirementId).filter((item): item is string => Boolean(item)),
        ),
    );
    const openWatchTaskCount = hermesWatchFindings.filter(
      (item) => item.status === 'active' && ((item.trackedRequirementIds?.length ?? 0) > 0 || Boolean(item.taskRequirementId)),
    ).length;
    const closureEvidenceCount = hermesWatchFindings.reduce(
      (count, item) => count + (item.closureEvidencePaths?.length ?? 0),
      0,
    );
    const writebackClosure = {
      totalTargets: writebackTargets.length,
      completedTargets,
      openTargets,
      activeTaskCount: activeWritebackTaskCount,
      summary: writebackTargets.length === 0
        ? 'No Hermes-governed writeback targets were attached to this review package.'
        : openTargets === 0
          ? `All ${completedTargets} Hermes writeback target(s) are closed with governed task coverage.`
          : `${openTargets}/${writebackTargets.length} Hermes writeback target(s) still need governed closure across ${writebackTaskIds.size} tracked task(s).`,
    };
    const watchClosure = {
      activeFindings: activeWatchFindings,
      resolvedFindings: resolvedWatchFindings,
      recurringFindings: recurringWatchFindings,
      suppressedFindings: suppressedWatchFindings,
      openTaskCount: openWatchTaskCount,
      closureEvidenceCount,
      summary: hermesWatchFindings.length === 0
        ? 'No Hermes watch findings were attached to this review package.'
        : activeWatchFindings === 0
          ? `Hermes watch is fully closed in this package; ${closureEvidenceCount} closure evidence item(s) are attached.`
          : `${activeWatchFindings} Hermes watch finding(s) remain active across ${watchTaskIds.size} tracked task(s); ${closureEvidenceCount} closure evidence item(s) are currently attached, with ${recurringWatchFindings} recurring item(s) and ${suppressedWatchFindings} low-signal reminder(s) suppressed.`,
    };
    if (gateBlocked) {
      const actions = missingChecks.map((check) => ({
        action: check.failStageId && check.failStageId !== stageId ? 'block' : 'revise',
        target: check.failStageId ?? stageId,
        reason: `${check.title}: ${check.recommendation}`,
      })) as CommitteeReport['hermes']['actions'];

      if (!hasEnoughArtifacts) {
        actions.unshift({
          action: 'block',
          target: stageId === 'frontend-backend-integration' ? 'backend-api' : stageId,
          reason: 'Artifact set is still incomplete for governed review.',
        });
      }

      return {
        overallDecision: actions.some((item) => item.action === 'block') ? 'block' : 'revise',
        summary: actions.some((item) => item.action === 'block')
          ? 'Hermes judges the current package should be blocked from continuation until committee blockers are closed.'
          : 'Hermes judges the current package should be revised before continuation.',
        actions,
        knowledgeGrounding: {
          configured: Boolean(systemStateFinding),
          query: systemStateFinding?.query ?? null,
          resultCount: systemStateFinding?.resultCount ?? 0,
          summary: systemStateFinding?.summary ?? null,
        },
        writebackClosure,
        watchClosure,
      };
    }

    return {
      overallDecision: stageId === 'frontend-backend-integration' ? 'promote' : 'keep',
      summary:
        stageId === 'frontend-backend-integration'
          ? 'Hermes judges the current review package is stable enough to promote as governed continuation evidence.'
          : 'Hermes judges the current stage package should be kept as the active baseline for downstream delivery.',
      actions: [
        {
          action: stageId === 'frontend-backend-integration' ? 'promote' : 'keep',
          target: stageId,
          reason:
            stageId === 'frontend-backend-integration'
              ? 'The reviewed package closes the current chain and can be promoted into governed evidence.'
              : 'The reviewed package is structurally consistent and can be kept as the current downstream baseline.',
        },
      ],
      knowledgeGrounding: {
        configured: Boolean(systemStateFinding),
        query: systemStateFinding?.query ?? null,
        resultCount: systemStateFinding?.resultCount ?? 0,
        summary: systemStateFinding?.summary ?? null,
      },
      writebackClosure,
      watchClosure,
    };
  }
}

function hasEnoughArtifactsFallback(stageId: string) {
  return stageId.length > 0;
}

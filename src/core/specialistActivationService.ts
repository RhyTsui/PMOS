type ReviewArtifact = {
  path: string;
  content: string;
};

const PRODUCT_AGENT_ROLES = [
  'general',
  'product-management',
  'requirements',
  'versioning',
  'review',
  'workflow',
  'delivery',
  'retrospective',
  'industry-research',
  'user-research',
  'competitive-analysis',
  'stakeholder-analysis',
  'roi-analysis',
  'strategy',
  'roadmap-planning',
  'documentation',
  'experience-design',
] as const;

type ProductAgentRole = (typeof PRODUCT_AGENT_ROLES)[number];

const STAGE_ROLE_MAPPING: Record<string, Partial<Record<ProductAgentRole, string[]>>> = {
  'requirements-document': {
    'product-management': ['Solution-Optimality Review'],
    strategy: ['Solution-Optimality Review'],
    'roadmap-planning': ['Solution-Optimality Review'],
    requirements: ['Technical Review'],
    versioning: ['Technical Review'],
    documentation: ['Technical Review'],
    'industry-research': ['Research Review'],
    'user-research': ['Research Review'],
    'competitive-analysis': ['Research Review'],
    'stakeholder-analysis': ['Research Review'],
    'roi-analysis': ['Research Review'],
  },
  'functional-specification': {
    workflow: ['Development Review'],
    delivery: ['Development Review'],
    requirements: ['Technical Review'],
    documentation: ['Technical Review'],
    versioning: ['Technical Review'],
    'industry-research': ['Research Review'],
    'competitive-analysis': ['Research Review'],
    strategy: ['Research Review'],
  },
  'design-document': {
    'experience-design': ['Design Review'],
    workflow: ['Product Review'],
    'product-management': ['Product Review'],
    requirements: ['Product Review'],
    'industry-research': ['Research Review'],
    'competitive-analysis': ['Research Review'],
    'user-research': ['Research Review'],
  },
  'frontend-page': {
    'experience-design': ['Design Review'],
    workflow: ['Frontend Review'],
    delivery: ['Frontend Review'],
    review: ['Frontend Review'],
    'industry-research': ['Research Review'],
    'competitive-analysis': ['Research Review'],
  },
  'data-schema': {
    requirements: ['Data Review'],
    versioning: ['Data Review'],
    workflow: ['Technical Review'],
    delivery: ['Technical Review'],
  },
  'backend-api': {
    delivery: ['Development Review'],
    workflow: ['Development Review'],
    review: ['Backend Review'],
    requirements: ['Backend Review'],
  },
  'frontend-backend-integration': {
    delivery: ['Delivery Review'],
    workflow: ['Development Review'],
    review: ['Development Review'],
    'industry-research': ['Research Review'],
    'competitive-analysis': ['Research Review'],
  },
};

export class SpecialistActivationService {
  resolveActivatedRoles(input: {
    stageId?: string | null;
    artifacts?: ReviewArtifact[];
    taskAssignmentRoles?: string[];
  }): string[] {
    const stageId = input.stageId ?? 'frontend-backend-integration';
    const activated = new Set<string>();
    const directReviewRoles = new Set(input.taskAssignmentRoles ?? []);
    const mappedRoles = this.extractProductAgentRoles(input.artifacts ?? [])
      .flatMap((role) => STAGE_ROLE_MAPPING[stageId]?.[role] ?? []);

    for (const role of directReviewRoles) {
      activated.add(role);
    }
    for (const role of mappedRoles) {
      activated.add(role);
    }

    return [...activated];
  }

  private extractProductAgentRoles(artifacts: ReviewArtifact[]): ProductAgentRole[] {
    const found = new Set<ProductAgentRole>();

    for (const artifact of artifacts) {
      if (!this.looksLikeSpecialistEvidence(artifact)) {
        continue;
      }

      for (const role of this.extractRolesFromContent(artifact.content)) {
        found.add(role);
      }
    }

    return [...found];
  }

  private looksLikeSpecialistEvidence(artifact: ReviewArtifact) {
    return /specialist-tasks|multi-agent-review|product-chief|specialist product agent task|Independent Specialist Output/iu.test(
      `${artifact.path}\n${artifact.content}`,
    );
  }

  private extractRolesFromContent(content: string): ProductAgentRole[] {
    const found = new Set<ProductAgentRole>();
    const roleLinePattern = /^\s*-\s*role:\s*([a-z-]+)\s*$/gimu;
    const turnPattern = /\(([a-z-]+)\)\s*->/gimu;

    let match: RegExpExecArray | null;
    while ((match = roleLinePattern.exec(content)) !== null) {
      const role = match[1] as ProductAgentRole;
      if (PRODUCT_AGENT_ROLES.includes(role)) {
        found.add(role);
      }
    }
    while ((match = turnPattern.exec(content)) !== null) {
      const role = match[1] as ProductAgentRole;
      if (PRODUCT_AGENT_ROLES.includes(role)) {
        found.add(role);
      }
    }

    return [...found];
  }
}

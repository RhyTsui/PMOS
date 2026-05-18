import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import { FileStore } from '../../src/core/fileStore';
import { MemoryService } from '../../src/core/memoryService';
import { RequirementService } from '../../src/core/requirementService';
import { V07RuntimeGovernanceService } from '../../src/core/v07RuntimeGovernanceService';

function createStore() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'ai-os-v07-governance-'));
  return new FileStore(root);
}

describe('V07RuntimeGovernanceService', () => {
  it('promotes detected repeat-correction candidates into governed requirements', async () => {
    const originalEnv = {
      baseUrl: process.env.DATAKI_BASE_URL,
      apiKey: process.env.DATAKI_API_KEY,
      userId: process.env.DATAKI_USER_ID,
      knowledgeBaseId: process.env.DATAKI_KNOWLEDGE_BASE_ID,
    };
    process.env.DATAKI_BASE_URL = 'https://dataki.example.com/api/v1';
    process.env.DATAKI_API_KEY = 'test-key';
    process.env.DATAKI_USER_ID = 'user-1';
    process.env.DATAKI_KNOWLEDGE_BASE_ID = 'kb-platform';

    const store = createStore();
    const memoryService = new MemoryService(store);
    const requirementService = new RequirementService(memoryService);
    const governance = new V07RuntimeGovernanceService(store, memoryService, requirementService);

    try {
      await store.write(
        'docs/context/project/ui-feedback.md',
        [
          '# UI Feedback',
          'Keep overflow inside the local table container.',
          'Do not fall back to generic UI behavior.',
          'design-language-md and frontend-skill should visibly affect this output.',
          'For similar requirements, reuse validated YokaUI components instead of guessing from scratch.',
        ].join('\n'),
      );
      await store.write(
        'docs/design/component-reuse.md',
        [
          '# Component Reuse',
          'YokaUI component mapping should be the default.',
          'Filter bar, cards, tables, and drawer patterns must be reused.',
          'This document records component reuse and component mapping evidence.',
        ].join('\n'),
      );
      await store.write(
        'skills/registry.json',
        JSON.stringify(
          {
            version: 'test',
            skills: [
              {
                id: 'design-language-md',
                name: 'Design Language MD',
                category: 'design',
                description: 'Project design language baseline.',
                ownerRole: 'Experience Design Agent',
                promptPath: 'skills/design-language-md/SKILL.md',
                stageIds: ['ui'],
                outputs: ['DESIGN.md'],
                enabled: true,
                triggerKeywords: ['design language', 'design.md'],
                tool: 'codex-skill',
                deployment: {
                  status: 'manual',
                  command: null,
                  statusPath: 'docs/operations/design-language-object-and-skill.md',
                  integration: 'repo-skill',
                  notes: null,
                },
              },
              {
                id: 'frontend-skill',
                name: 'Frontend Skill',
                category: 'design',
                description: 'Frontend visual direction.',
                ownerRole: 'Experience Design Agent',
                promptPath: 'skills/frontend-skill/SKILL.md',
                stageIds: ['frontend'],
                outputs: ['static html'],
                enabled: true,
                triggerKeywords: ['frontend-skill', 'frontend'],
                tool: 'frontend-skill',
                deployment: {
                  status: 'installed',
                  command: 'frontend-skill',
                  statusPath: 'docs/operations/codex-local-state-sync-status.json',
                  integration: 'external-tool',
                  notes: null,
                },
              },
            ],
          },
          null,
          2,
        ),
      );
      await store.write('skills/design-language-md/SKILL.md', '# Design Language MD\n');
      await store.write('skills/frontend-skill/SKILL.md', '# Frontend Skill\n');
      await store.write('docs/operations/design-language-object-and-skill.md', '# Design language object\n');
      await store.write('docs/operations/codex-local-state-sync-status.json', '{}');

      const beforePromotion = await governance.buildSnapshot();
      const candidate = beforePromotion.repeatCorrectionCandidates.find(
        (item) => item.candidateId === 'project-local-scroll-first',
      );

      expect(candidate?.status).toBe('candidate');
      expect(candidate?.signalCount).toBeGreaterThan(0);
      expect(
        beforePromotion.skillEffectivenessChecks.some(
          (item) => item.skillId === 'design-language-md' && item.status === 'pass',
        ),
      ).toBe(true);
      expect(
        beforePromotion.skillEffectivenessChecks.some(
          (item) => item.skillId === 'frontend-skill' && item.status === 'pass',
        ),
      ).toBe(true);
      expect(
        beforePromotion.designToolEffectivenessChecks.some(
          (item) => item.toolId === 'codex-skill' && item.status === 'pass',
        ),
      ).toBe(true);
      expect(
        beforePromotion.designToolEffectivenessChecks.some(
          (item) => item.toolId === 'frontend-skill' && item.status === 'pass',
        ),
      ).toBe(true);
      expect(beforePromotion.datakiKnowledgeContext.configured).toBe(true);
      expect(beforePromotion.datakiKnowledgeContext.defaultKnowledgeBaseId).toBe('kb-platform');
      expect(beforePromotion.backcheck.knowledgeSourceContext).toBe('solved');

      const requirement = await governance.promoteRepeatCorrectionCandidate({
        candidateId: 'project-local-scroll-first',
      });
      const componentReuseRequirement = await governance.promoteRepeatCorrectionCandidate({
        candidateId: 'project-component-reuse-first',
      });

      expect(requirement.metadata.repeatCorrectionCandidateId).toBe('project-local-scroll-first');
      expect(requirement.source.kind).toBe('auto-capture');
      expect(componentReuseRequirement.metadata.repeatCorrectionCandidateId).toBe('project-component-reuse-first');

      const afterPromotion = await governance.buildSnapshot();
      const promotedCandidate = afterPromotion.repeatCorrectionCandidates.find(
        (item) => item.candidateId === 'project-local-scroll-first',
      );
      const componentReuseCheck = afterPromotion.componentReuseMemoryChecks[0];

      expect(promotedCandidate?.status).toBe('promoted');
      expect(promotedCandidate?.promotedRequirementId).toBe(requirement.id);
      expect(afterPromotion.backcheck.repeatCorrectionMemory).toBe('solved');
      expect(afterPromotion.backcheck.skillEffectivenessCheck).toBe('solved');
      expect(afterPromotion.backcheck.designToolEffectivenessCheck).toBe('solved');
      expect(componentReuseCheck?.status).toBe('pass');
      expect(componentReuseCheck?.promotedRequirementId).toBe(componentReuseRequirement.id);
      expect(componentReuseCheck?.reusableComponentSignals).toContain('表格复用');
      expect(afterPromotion.backcheck.componentReuseMemory).toBe('solved');
    } finally {
      process.env.DATAKI_BASE_URL = originalEnv.baseUrl;
      process.env.DATAKI_API_KEY = originalEnv.apiKey;
      process.env.DATAKI_USER_ID = originalEnv.userId;
      process.env.DATAKI_KNOWLEDGE_BASE_ID = originalEnv.knowledgeBaseId;
    }
  });
});

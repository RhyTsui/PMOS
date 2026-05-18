import { describe, expect, it } from 'vitest';
import { SpecialistActivationService } from '../../src/core/specialistActivationService';

describe('SpecialistActivationService', () => {
  it('returns assigned specialist reviewer roles for review-required stages', () => {
    const service = new SpecialistActivationService();
    const roles = service.resolveAssignedRolesForStage('requirements-document');

    expect(roles).toContain('Solution-Optimality Review');
    expect(roles).toContain('Technical Review');
    expect(roles).toContain('Research Review');
  });

  it('maps specialist task evidence to stage review roles', () => {
    const service = new SpecialistActivationService();
    const roles = service.resolveActivatedRoles({
      stageId: 'frontend-page',
      artifacts: [
        {
          path: 'subprojects/ad/docs/product-office/specialist-tasks/task-1.md',
          content: [
            '# Specialist Product Agent Task',
            '',
            '- role: experience-design',
            '- role: delivery',
          ].join('\n'),
        },
      ],
    });

    expect(roles).toContain('Design Review');
    expect(roles).toContain('Frontend Review');
  });

  it('uses explicit task-assignment roles directly when present', () => {
    const service = new SpecialistActivationService();
    const roles = service.resolveActivatedRoles({
      stageId: 'requirements-document',
      taskAssignmentRoles: ['Solution-Optimality Review', 'Research Review'],
      artifacts: [],
    });

    expect(roles).toContain('Solution-Optimality Review');
    expect(roles).toContain('Research Review');
  });

  it('reuses persisted workflow signal roles when they already exist', () => {
    const service = new SpecialistActivationService();
    const roles = service.resolveActivatedRoles({
      stageId: 'frontend-backend-integration',
      artifacts: [],
      workflowSignals: [
        {
          activatedSpecialistRoles: ['Delivery Review', 'Development Review'],
          taskAssignmentRoles: ['Research Review'],
        },
      ],
    });

    expect(roles).toContain('Delivery Review');
    expect(roles).toContain('Development Review');
    expect(roles).not.toContain('Research Review');
  });
});

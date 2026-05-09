import { randomUUID } from 'node:crypto';
import { MemoryService } from './memoryService.js';
import type {
  CapabilityDefinition,
  CapabilityEvaluation,
  EvaluationCaseResult,
  EvaluationDataset,
  EvaluationRun,
} from '../shared/schemas.js';

export class EvaluationRunner {
  constructor(private readonly memoryService: MemoryService) {}

  async createDataset(input: {
    capability: CapabilityDefinition;
    version: string;
    name: string;
    description: string;
    cases: EvaluationDataset['cases'];
    metadata?: Record<string, unknown>;
  }) {
    const now = new Date().toISOString();
    const dataset: EvaluationDataset = {
      id: `eval-dataset-${randomUUID()}`,
      capabilityId: input.capability.id,
      version: input.version,
      subprojectId: input.capability.subprojectId,
      name: input.name.trim(),
      description: input.description.trim(),
      cases: input.cases,
      createdAt: now,
      updatedAt: now,
      metadata: input.metadata ?? {},
    };

    await this.memoryService.saveEvaluationDataset(dataset);
    return dataset;
  }

  async listDatasets(subprojectId?: string | null) {
    return this.memoryService.listEvaluationDatasets(subprojectId);
  }

  async listRuns(subprojectId?: string | null) {
    return this.memoryService.listEvaluationRuns(subprojectId);
  }

  async runDataset(input: {
    capability: CapabilityDefinition;
    version: string;
    dataset: EvaluationDataset;
    evaluator: string;
    executor: (payload: Record<string, unknown>) => Promise<unknown>;
    metadata?: Record<string, unknown>;
  }) {
    const startedAt = new Date().toISOString();
    const run: EvaluationRun = {
      id: `eval-run-${randomUUID()}`,
      datasetId: input.dataset.id,
      capabilityId: input.capability.id,
      version: input.version,
      subprojectId: input.capability.subprojectId,
      status: 'running',
      evaluator: input.evaluator.trim(),
      summary: null,
      aggregatedScore: null,
      passed: null,
      caseResults: [],
      startedAt,
      completedAt: null,
      metadata: input.metadata ?? {},
    };
    await this.memoryService.saveEvaluationRun(run);

    const caseResults: EvaluationCaseResult[] = [];
    for (const testCase of input.dataset.cases) {
      try {
        const output = await input.executor(this.normalizePayload(testCase.input));
        caseResults.push(this.evaluateCase(testCase.expected, testCase, input.capability, output));
      } catch (error) {
        caseResults.push({
          caseId: testCase.id,
          passed: false,
          score: 0,
          summary: error instanceof Error ? error.message : String(error),
          output: null,
          metadata: {
            rubric: testCase.rubric,
            capabilityType: input.capability.implementationType,
            executionFailed: true,
          },
        });
      }
    }
    const aggregatedScore =
      caseResults.length === 0 ? 0 : Number((caseResults.reduce((sum, result) => sum + result.score, 0) / caseResults.length).toFixed(4));
    const passed = caseResults.length > 0 && caseResults.every((result) => result.passed);
    const completedRun: EvaluationRun = {
      ...run,
      status: 'completed',
      summary: passed
        ? `dataset ${input.dataset.name} passed with score ${aggregatedScore}`
        : `dataset ${input.dataset.name} has failing cases`,
      aggregatedScore,
      passed,
      caseResults,
      completedAt: new Date().toISOString(),
    };
    await this.memoryService.saveEvaluationRun(completedRun);

    const evaluation: CapabilityEvaluation = {
      id: `cap-eval-${randomUUID()}`,
      capabilityId: input.capability.id,
      version: input.version,
      subprojectId: input.capability.subprojectId,
      evaluator: input.evaluator.trim(),
      passed,
      score: aggregatedScore,
      summary: completedRun.summary ?? '',
      dimensions: [
        {
          name: 'dataset-pass-rate',
          score: caseResults.length === 0 ? 0 : caseResults.filter((result) => result.passed).length / caseResults.length,
          summary: `${caseResults.filter((result) => result.passed).length}/${caseResults.length} cases passed`,
        },
        {
          name: 'aggregated-score',
          score: aggregatedScore,
          summary: `average case score ${aggregatedScore}`,
        },
      ],
      metadata: {
        ...input.metadata,
        evaluationRunId: completedRun.id,
        datasetId: input.dataset.id,
      },
      createdAt: completedRun.completedAt ?? startedAt,
    };
    await this.memoryService.saveCapabilityEvaluation(evaluation);

    return {
      run: completedRun,
      evaluation,
    };
  }

  async findLatestRun(capabilityId: string, version: string, subprojectId?: string | null) {
    const runs = await this.memoryService.listEvaluationRuns(subprojectId);
    return (
      runs
        .filter((run) => run.capabilityId === capabilityId && run.version === version && run.status === 'completed')
        .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))[0] ?? null
    );
  }

  private evaluateCase(
    expected: unknown,
    testCase: EvaluationDataset['cases'][number],
    capability: CapabilityDefinition,
    actualOutput: unknown,
  ): EvaluationCaseResult {
    const metadata = {
      rubric: testCase.rubric,
      capabilityType: capability.implementationType,
    };

    if (typeof expected === 'string') {
      const haystack = JSON.stringify(actualOutput ?? '');
      const passed = haystack.toLowerCase().includes(expected.toLowerCase());
      return {
        caseId: testCase.id,
        passed,
        score: passed ? 1 : 0,
        summary: passed ? 'expected text matched execution output' : `expected text not found: ${expected}`,
        output: haystack,
        metadata,
      };
    }

    if (expected && typeof expected === 'object' && !Array.isArray(expected) && expected !== null) {
      const checks: Array<{ passed: boolean; summary: string }> = [];
      const expectedObject = expected as Record<string, unknown>;

      if (Array.isArray(expectedObject.requiredKeys)) {
        const requiredKeys = expectedObject.requiredKeys.filter((item): item is string => typeof item === 'string');
        const actualKeys = actualOutput && typeof actualOutput === 'object' ? Object.keys(actualOutput as Record<string, unknown>) : [];
        const missingKeys = requiredKeys.filter((key) => !actualKeys.includes(key));
        checks.push({
          passed: missingKeys.length === 0,
          summary: missingKeys.length === 0 ? 'requiredKeys matched' : `missing keys: ${missingKeys.join(', ')}`,
        });
      }

      if (expectedObject.fieldEquals && typeof expectedObject.fieldEquals === 'object' && !Array.isArray(expectedObject.fieldEquals)) {
        const mismatches = Object.entries(expectedObject.fieldEquals as Record<string, unknown>).filter(
          ([path, value]) => this.readByPath(actualOutput, path) !== value,
        );
        checks.push({
          passed: mismatches.length === 0,
          summary: mismatches.length === 0 ? 'fieldEquals matched' : `field mismatches: ${mismatches.map(([path]) => path).join(', ')}`,
        });
      }

      if (expectedObject.fieldIncludes && typeof expectedObject.fieldIncludes === 'object' && !Array.isArray(expectedObject.fieldIncludes)) {
        const mismatches = Object.entries(expectedObject.fieldIncludes as Record<string, unknown>).filter(([path, value]) => {
          const actualValue = this.readByPath(actualOutput, path);
          if (typeof actualValue === 'string' && typeof value === 'string') {
            return !actualValue.includes(value);
          }
          if (Array.isArray(actualValue)) {
            return !actualValue.includes(value);
          }
          return true;
        });
        checks.push({
          passed: mismatches.length === 0,
          summary: mismatches.length === 0 ? 'fieldIncludes matched' : `fieldIncludes mismatches: ${mismatches.map(([path]) => path).join(', ')}`,
        });
      }

      if (expectedObject.exists && Array.isArray(expectedObject.exists)) {
        const missingPaths = expectedObject.exists.filter((item): item is string => typeof item === 'string').filter((path) => this.readByPath(actualOutput, path) === undefined);
        checks.push({
          passed: missingPaths.length === 0,
          summary: missingPaths.length === 0 ? 'exists matched' : `missing paths: ${missingPaths.join(', ')}`,
        });
      }

      if (expectedObject.arrayLength && typeof expectedObject.arrayLength === 'object' && !Array.isArray(expectedObject.arrayLength)) {
        const lengthMismatches = Object.entries(expectedObject.arrayLength as Record<string, unknown>).filter(([path, value]) => {
          const actualValue = this.readByPath(actualOutput, path);
          return !Array.isArray(actualValue) || typeof value !== 'number' || actualValue.length !== value;
        });
        checks.push({
          passed: lengthMismatches.length === 0,
          summary: lengthMismatches.length === 0 ? 'arrayLength matched' : `arrayLength mismatches: ${lengthMismatches.map(([path]) => path).join(', ')}`,
        });
      }

      if (expectedObject.stringIncludes && typeof expectedObject.stringIncludes === 'object' && !Array.isArray(expectedObject.stringIncludes)) {
        const includeMismatches = Object.entries(expectedObject.stringIncludes as Record<string, unknown>).filter(([path, value]) => {
          const actualValue = this.readByPath(actualOutput, path);
          return typeof actualValue !== 'string' || typeof value !== 'string' || !actualValue.includes(value);
        });
        checks.push({
          passed: includeMismatches.length === 0,
          summary: includeMismatches.length === 0 ? 'stringIncludes matched' : `stringIncludes mismatches: ${includeMismatches.map(([path]) => path).join(', ')}`,
        });
      }

      if (checks.length > 0) {
        const passed = checks.every((check) => check.passed);
        const score = checks.filter((check) => check.passed).length / checks.length;
        return {
          caseId: testCase.id,
          passed,
          score,
          summary: checks.map((check) => check.summary).join(' | '),
          output: actualOutput,
          metadata: {
            ...metadata,
            checks,
          },
        };
      }
    }

    return {
      caseId: testCase.id,
      passed: true,
      score: 1,
      summary: 'default evaluator accepted case',
      output: actualOutput,
      metadata,
    };
  }

  private normalizePayload(input: unknown) {
    return input && typeof input === 'object' && !Array.isArray(input) ? (input as Record<string, unknown>) : {};
  }

  private readByPath(value: unknown, path: string) {
    return path.split('.').reduce<unknown>((current, segment) => {
      if (!current || typeof current !== 'object') {
        return undefined;
      }
      return (current as Record<string, unknown>)[segment];
    }, value);
  }
}

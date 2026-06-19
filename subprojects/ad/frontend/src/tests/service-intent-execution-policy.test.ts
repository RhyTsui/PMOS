import { describe, expect, it } from 'vitest';
import { getServiceIntentExecutionPolicy, inferCapabilityPurpose, isCapabilityPurposeAllowed } from '../src/lib/service-intent-execution-policy';

describe('service intent execution policy', () => {
  describe('non_execution intents', () => {
    it('general_chat blocks all capability purposes', () => {
      const policy = getServiceIntentExecutionPolicy('general_chat');
      expect(policy.category).toBe('non_execution');
      expect(policy.requiresToolExecution).toBe(false);
      expect(policy.blockedPurposes).toContain('report_execution');
      expect(policy.blockedPurposes).toContain('dictionary_lookup');
      expect(policy.blockedPurposes).toContain('schema_lookup');
      expect(policy.blockedPurposes).toContain('diagnostic_evidence');
      expect(policy.blockedPurposes).toContain('workflow_execution');
    });

    it('help_qa allows dictionary_lookup and schema_lookup', () => {
      const policy = getServiceIntentExecutionPolicy('help_qa');
      expect(policy.category).toBe('non_execution');
      expect(policy.requiresToolExecution).toBe(false);
      expect(policy.allowedPurposes).toContain('dictionary_lookup');
      expect(policy.allowedPurposes).toContain('schema_lookup');
      expect(policy.blockedPurposes).toContain('report_execution');
    });

    it('field_definition allows dictionary_lookup and schema_lookup, blocks report_execution', () => {
      const policy = getServiceIntentExecutionPolicy('field_definition');
      expect(policy.category).toBe('non_execution');
      expect(policy.requiresToolExecution).toBe(false);
      expect(policy.allowedPurposes).toContain('dictionary_lookup');
      expect(policy.allowedPurposes).toContain('schema_lookup');
      expect(policy.blockedPurposes).toContain('report_execution');
      expect(policy.blockedPurposes).toContain('diagnostic_evidence');
      expect(policy.blockedPurposes).toContain('workflow_execution');
    });

    it('knowledge_answer allows dictionary/schema, blocks report', () => {
      const policy = getServiceIntentExecutionPolicy('knowledge_answer');
      expect(policy.category).toBe('non_execution');
      expect(policy.requiresToolExecution).toBe(false);
      expect(policy.allowedPurposes).toContain('dictionary_lookup');
      expect(policy.blockedPurposes).toContain('report_execution');
    });

    it('light_requirement blocks execution purposes', () => {
      const policy = getServiceIntentExecutionPolicy('light_requirement');
      expect(policy.category).toBe('non_execution');
      expect(policy.requiresToolExecution).toBe(false);
      expect(policy.blockedPurposes).toContain('report_execution');
    });
  });

  describe('execution intents', () => {
    it('data_query allows report_execution', () => {
      const policy = getServiceIntentExecutionPolicy('data_query');
      expect(policy.category).toBe('execution');
      expect(policy.requiresToolExecution).toBe(true);
      expect(policy.allowedPurposes).toContain('report_execution');
      expect(policy.allowedPurposes).toContain('dictionary_lookup');
      expect(policy.blockedPurposes).toEqual([]);
    });

    it('report_delivery allows only report_execution', () => {
      const policy = getServiceIntentExecutionPolicy('report_delivery');
      expect(policy.category).toBe('execution');
      expect(policy.requiresToolExecution).toBe(true);
      expect(policy.allowedPurposes).toEqual(['report_execution']);
    });

    it('package_fetch allows workflow_execution, blocks report', () => {
      const policy = getServiceIntentExecutionPolicy('package_fetch');
      expect(policy.category).toBe('execution');
      expect(policy.requiresToolExecution).toBe(true);
      expect(policy.allowedPurposes).toContain('workflow_execution');
      expect(policy.blockedPurposes).toContain('report_execution');
    });
  });

  describe('evidence_execution intents', () => {
    it('issue_diagnosis allows diagnostic_evidence', () => {
      const policy = getServiceIntentExecutionPolicy('issue_diagnosis');
      expect(policy.category).toBe('evidence_execution');
      expect(policy.requiresToolExecution).toBe(true);
      expect(policy.allowedPurposes).toContain('diagnostic_evidence');
    });
  });

  describe('workflow_execution intents', () => {
    it('integration_workflow allows workflow_execution, blocks report', () => {
      const policy = getServiceIntentExecutionPolicy('integration_workflow');
      expect(policy.category).toBe('workflow_execution');
      expect(policy.requiresToolExecution).toBe(true);
      expect(policy.allowedPurposes).toContain('workflow_execution');
      expect(policy.blockedPurposes).toContain('report_execution');
    });

    it('system_operation allows workflow_execution, blocks report', () => {
      const policy = getServiceIntentExecutionPolicy('system_operation');
      expect(policy.category).toBe('workflow_execution');
      expect(policy.requiresToolExecution).toBe(true);
      expect(policy.allowedPurposes).toContain('workflow_execution');
      expect(policy.blockedPurposes).toContain('report_execution');
    });
  });

  describe('isCapabilityPurposeAllowed', () => {
    it('field_definition blocks report_execution purpose', () => {
      expect(isCapabilityPurposeAllowed('field_definition', 'report_execution')).toBe(false);
    });

    it('field_definition allows dictionary_lookup purpose', () => {
      expect(isCapabilityPurposeAllowed('field_definition', 'dictionary_lookup')).toBe(true);
    });

    it('data_query allows report_execution purpose', () => {
      expect(isCapabilityPurposeAllowed('data_query', 'report_execution')).toBe(true);
    });

    it('help_qa blocks report_execution purpose', () => {
      expect(isCapabilityPurposeAllowed('help_qa', 'report_execution')).toBe(false);
    });

    it('help_qa allows dictionary_lookup purpose', () => {
      expect(isCapabilityPurposeAllowed('help_qa', 'dictionary_lookup')).toBe(true);
    });
  });

  describe('inferCapabilityPurpose', () => {
    it('data.report capabilityType → report_execution', () => {
      expect(inferCapabilityPurpose({ capabilityType: 'data.report' })).toBe('report_execution');
    });

    it('data.dictionary capabilityType → dictionary_lookup', () => {
      expect(inferCapabilityPurpose({ capabilityType: 'data.dictionary' })).toBe('dictionary_lookup');
    });

    it('data_fetch toolPurpose → report_execution', () => {
      expect(inferCapabilityPurpose({ toolPurpose: 'data_fetch' })).toBe('report_execution');
    });

    it('field_lookup toolPurpose → dictionary_lookup', () => {
      expect(inferCapabilityPurpose({ toolPurpose: 'field_lookup' })).toBe('dictionary_lookup');
    });

    it('evidence_fetch toolPurpose → diagnostic_evidence', () => {
      expect(inferCapabilityPurpose({ toolPurpose: 'evidence_fetch' })).toBe('diagnostic_evidence');
    });

    it('integration_run toolPurpose → workflow_execution', () => {
      expect(inferCapabilityPurpose({ toolPurpose: 'integration_run' })).toBe('workflow_execution');
    });
  });

  describe('fallback behavior', () => {
    it('undefined serviceIntent returns general_chat policy', () => {
      const policy = getServiceIntentExecutionPolicy(undefined);
      expect(policy.category).toBe('non_execution');
      expect(policy.serviceIntent).toBe('general_chat');
    });

    it('unknown serviceIntent returns general_chat policy', () => {
      const policy = getServiceIntentExecutionPolicy('unknown_intent');
      expect(policy.category).toBe('non_execution');
      expect(policy.serviceIntent).toBe('general_chat');
    });
  });
});

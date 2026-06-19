import { addIssue, createValidationResult, isRecord, requireString, type ContractValidationResult } from '../validation/contract-validator';
import type {
  DisclosureExecutionStep,
  DisclosureFieldCatalogItem,
  DisclosureQualityCheckItem,
  DisclosureRawInfoItem,
  MessageDisclosureView,
} from './types';
import { MESSAGE_DISCLOSURE_VIEW_CONTRACT_TYPE } from './types';

export function validateMessageDisclosureView(value: unknown): ContractValidationResult<MessageDisclosureView> {
  const result = createValidationResult<MessageDisclosureView>(value as MessageDisclosureView);
  if (!isRecord(value)) {
    return addIssue(result, {
      level: 'error',
      code: 'disclosure_not_object',
      message: 'MessageDisclosureView must be an object.',
      path: '$',
    });
  }

  if (value.contractType !== MESSAGE_DISCLOSURE_VIEW_CONTRACT_TYPE) {
    addIssue(result, {
      level: 'error',
      code: 'disclosure_contract_type_invalid',
      message: 'MessageDisclosureView.contractType must be "message-disclosure-view".',
      path: '$.contractType',
    });
  }

  requireString(result, value, 'version', '$');
  requireString(result, value, 'disclosureId', '$');
  requireString(result, value, 'messageId', '$');

  validateSectionArray(result, value.overview, '$.overview', 'overview');
  validateSectionArray(result, value.execution, '$.execution', 'execution');
  validateSectionArray(result, value.evidence, '$.evidence', 'evidence');
  validateSectionArray(result, value.fields, '$.fields', 'fields');
  validateSectionArray(result, value.qualityChecks, '$.qualityChecks', 'qualityChecks');
  validateSectionArray(result, value.rawInfo, '$.rawInfo', 'rawInfo');

  return result;
}

function validateSectionArray(
  result: ContractValidationResult<MessageDisclosureView>,
  section: unknown,
  path: string,
  name: string,
): void {
  if (!isRecord(section)) {
    addIssue(result, {
      level: 'error',
      code: 'disclosure_section_not_object',
      message: `${name} section must be an object.`,
      path,
    });
    return;
  }

  if (Array.isArray(section.items)) {
    section.items.forEach((item, index) => {
      validateSectionItem(result, item, `${path}.items[${index}]`, name);
    });
  }
}

function validateSectionItem(
  result: ContractValidationResult<MessageDisclosureView>,
  item: unknown,
  path: string,
  name: string,
): void {
  if (!isRecord(item)) {
    addIssue(result, {
      level: 'error',
      code: 'disclosure_section_item_not_object',
      message: `${name} item must be an object.`,
      path,
    });
    return;
  }

  if (name === 'fields') {
    requireString(result, item, 'key', path);
    requireString(result, item, 'label', path);
  }

  if (name === 'qualityChecks') {
    requireString(result, item, 'id', path);
    requireString(result, item, 'label', path);
    requireString(result, item, 'status', path);
  }

  if (name === 'rawInfo') {
    requireString(result, item, 'id', path);
    requireString(result, item, 'label', path);
    requireString(result, item, 'kind', path);
  }
}

export function validateDisclosureFieldCatalogItem(item: DisclosureFieldCatalogItem): boolean {
  return Boolean(item && typeof item.key === 'string' && typeof item.label === 'string');
}

export function validateDisclosureQualityCheckItem(item: DisclosureQualityCheckItem): boolean {
  return Boolean(item && typeof item.id === 'string' && typeof item.label === 'string' && typeof item.status === 'string');
}

export function validateDisclosureRawInfoItem(item: DisclosureRawInfoItem): boolean {
  return Boolean(item && typeof item.id === 'string' && typeof item.label === 'string' && typeof item.kind === 'string');
}


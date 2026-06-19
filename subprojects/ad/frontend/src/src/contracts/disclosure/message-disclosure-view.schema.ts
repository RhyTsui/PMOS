import { MESSAGE_DISCLOSURE_VIEW_CONTRACT_TYPE, MESSAGE_DISCLOSURE_VIEW_VERSION } from './types';

export const messageDisclosureViewSchema = {
  contractType: MESSAGE_DISCLOSURE_VIEW_CONTRACT_TYPE,
  version: MESSAGE_DISCLOSURE_VIEW_VERSION,
  tabs: ['overview', 'execution', 'toolCalls', 'prompt', 'dataResult', 'evidence', 'fields', 'qualityChecks', 'rawInfo'] as const,
} as const;

export type MessageDisclosureViewSchema = typeof messageDisclosureViewSchema;

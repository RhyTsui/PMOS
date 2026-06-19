/**
 * Service Proposal — 服务提案
 *
 * 系统向用户展示的"三段式响应"结构。
 */

export {
  type ServiceProposal,
  type ServiceProposalItem,
  type MissingInput,
  type ServiceProposalGeneratorInput,
  generateServiceProposal,
  canExecuteProposal,
  getPrimaryService,
} from './service-proposal-contract';

/**
 * Multi-Query — 多工具编排 / 拼表
 */

export {
  // Types
  type SubQuery,
  type QueryDecomposition,
  type SubQueryResult,
  type Column,
  type ColumnType,
  type Row,
  type FederatedQueryResult,
  type ToolSelectionInput,
  type ToolSelectionResult,
  type SelectedCapability,
  type DimensionNormalizationRule,
  type NormalizedDataSet,
  type MultiQueryContext,
  // Helpers
  createEmptyFederatedResult,
  createSubQuery,
} from './query-decomposition-contract';

export type ScreenType =
  | 'pmchat-home'
  | 'requirement-intake'
  | 'product-research-synthesis'
  | 'prd-generation-review'
  | 'roadmap-planning'
  | 'task-execution-tracking'
  | 'decision-review'
  | 'ai-workflow-console'
  | 'debug-automation-workbench';

export type WorkflowStage =
  | 'research'
  | 'planning'
  | 'requirements'
  | 'functional'
  | 'design'
  | 'frontend'
  | 'data'
  | 'backend'
  | 'integration';

export type Status = 'normal' | 'warning' | 'critical' | 'success' | 'unknown';
export type RiskLevel = 'low' | 'medium' | 'high';
export type ApprovalPolicy = 'none' | 'human-review' | 'dual-approval';
export type DecisionPolicy = 'inform' | 'review' | 'approve' | 'escalate';
export type AIAssistanceMode = 'copilot' | 'advisor' | 'reviewer' | 'automation';

export interface ProductContext {
  productId?: string;
  productName?: string;
  projectId?: string;
  projectName?: string;
  requirementId?: string;
  requirementTitle?: string;
  stageOwner?: string;
  targetRole?: 'product-manager' | 'designer' | 'engineer' | 'reviewer' | 'operator' | 'admin';
}

export interface ScreenLayout {
  desktop: 'chat-first' | 'chat-with-context' | 'single-column-review';
  mobile: 'stacked-decision-flow' | 'compact-review-flow';
  density: 'high' | 'medium';
  stickyActions?: boolean;
}

export interface RecommendedAction {
  id: string;
  label: string;
  actionType:
    | 'create_requirement'
    | 'update_prd'
    | 'advance_workflow'
    | 'request_review'
    | 'approve_change'
    | 'reject_change'
    | 'sync_artifact'
    | 'run_deep_analysis';
  riskLevel: RiskLevel;
  decisionPolicy?: DecisionPolicy;
  approvalPolicy?: ApprovalPolicy;
  requiresApproval?: boolean;
  auditRequired: boolean;
  targetObject?: string;
  rollbackPlan?: string;
}

export interface ContextRailBlock {
  type: 'ContextRail';
  id: string;
  title: string;
  items: Array<{ label: string; value: string; status?: Status }>;
}

export interface ConversationPanelBlock {
  type: 'ConversationPanel';
  id: string;
  title: string;
  aiAssistanceMode: AIAssistanceMode;
  summary?: string;
  evidenceRefs?: string[];
  sourceRefs?: string[];
}

export interface ChatShellBlock {
  type: 'ChatShell';
  id: string;
  title: string;
  aiAssistanceMode: AIAssistanceMode;
  playgroundVariant?: 'default' | 'focused' | 'operator';
  starterPrompts?: string[];
}

export interface EvidencePanelBlock {
  type: 'EvidencePanel';
  id: string;
  title: string;
  evidenceRefs: string[];
  sourceRefs: string[];
  lastUpdatedAt: string;
}

export interface RequirementIntakeCardBlock {
  type: 'RequirementIntakeCard';
  id: string;
  title: string;
  summary: string;
  workflowStage: WorkflowStage;
  sourceRefs: string[];
}

export interface ResearchSynthesisCardBlock {
  type: 'ResearchSynthesisCard';
  id: string;
  title: string;
  summary: string;
  evidenceRefs: string[];
  sourceRefs: string[];
}

export interface PRDSectionCardBlock {
  type: 'PRDSectionCard';
  id: string;
  title: string;
  sectionKey: string;
  summary: string;
  sourceRefs: string[];
}

export interface DecisionCardBlock {
  type: 'DecisionCard';
  id: string;
  title: string;
  summary: string;
  decisionPolicy: DecisionPolicy;
  riskLevel?: RiskLevel;
  evidenceRefs: string[];
  recommendedActions: RecommendedAction[];
}

export interface RiskReviewPanelBlock {
  type: 'RiskReviewPanel';
  id: string;
  title: string;
  risks: Array<{ id: string; summary: string; riskLevel: RiskLevel; owner?: string }>;
}

export interface RoadmapTimelineBlock {
  type: 'RoadmapTimeline';
  id: string;
  title: string;
  milestones: Array<{ id: string; label: string; status: Status; dueAt?: string }>;
}

export interface TaskBoardBlock {
  type: 'TaskBoard';
  id: string;
  title: string;
  items: Array<{ id: string; label: string; status: Status; owner?: string }>;
}

export interface SourceReferenceListBlock {
  type: 'SourceReferenceList';
  id: string;
  title: string;
  sourceRefs: string[];
  lastUpdatedAt: string;
}

export interface ApprovalPanelBlock {
  type: 'ApprovalPanel';
  id: string;
  title: string;
  approvalPolicy: ApprovalPolicy;
  actions: RecommendedAction[];
}

export interface AuditLogBlock {
  type: 'AuditLog';
  id: string;
  title: string;
  logs: Array<{ id: string; actor: string; action: string; timestamp: string; result: string }>;
}

export interface WorkflowStatusPanelBlock {
  type: 'WorkflowStatusPanel';
  id: string;
  title: string;
  workflowStage: WorkflowStage;
  status: 'idle' | 'running' | 'waiting_approval' | 'completed' | 'failed';
  currentStep?: string;
}

export interface AIRecommendationCardBlock {
  type: 'AIRecommendationCard';
  id: string;
  title: string;
  summary: string;
  aiAssistanceMode: AIAssistanceMode;
  evidenceRefs: string[];
  recommendedActions: RecommendedAction[];
}

export interface AgentControlCardBlock {
  type: 'AgentControlCard';
  id: string;
  title: string;
  agentRole: string;
  summary: string;
  recommendedActions: RecommendedAction[];
}

export interface DynamicSurfaceCardBlock {
  type: 'DynamicSurfaceCard';
  id: string;
  title: string;
  surfaceKind: 'x-card' | 'drawer' | 'side-sheet' | 'inline-panel';
  sourceRefs?: string[];
  evidenceRefs?: string[];
}

export type UISchemaBlock =
  | ChatShellBlock
  | ContextRailBlock
  | ConversationPanelBlock
  | EvidencePanelBlock
  | RequirementIntakeCardBlock
  | ResearchSynthesisCardBlock
  | PRDSectionCardBlock
  | DecisionCardBlock
  | RiskReviewPanelBlock
  | RoadmapTimelineBlock
  | TaskBoardBlock
  | SourceReferenceListBlock
  | ApprovalPanelBlock
  | AuditLogBlock
  | WorkflowStatusPanelBlock
  | AIRecommendationCardBlock
  | AgentControlCardBlock
  | DynamicSurfaceCardBlock;

export interface ScreenRegions {
  topBar?: UISchemaBlock[];
  contextRail?: UISchemaBlock[];
  main?: UISchemaBlock[];
  evidencePanel?: UISchemaBlock[];
  sidePanel?: UISchemaBlock[];
  approvalPanel?: UISchemaBlock[];
  auditTrail?: UISchemaBlock[];
}

export interface ValidationRule {
  id: string;
  description: string;
  severity: 'error' | 'warning';
}

export interface PMOSScreenSchema {
  schemaVersion: '1.0';
  screenId: string;
  screenType: ScreenType;
  workflowStage: WorkflowStage;
  title: string;
  description?: string;
  productContext: ProductContext;
  layout: ScreenLayout;
  regions: ScreenRegions;
  blocks?: UISchemaBlock[];
  evidenceRefs?: string[];
  sourceRefs?: string[];
  lastUpdatedAt?: string;
  decisionPolicy?: DecisionPolicy;
  approvalPolicy?: ApprovalPolicy;
  riskLevel?: RiskLevel;
  auditRequired?: boolean;
  aiAssistanceMode?: AIAssistanceMode;
  recommendedActions?: RecommendedAction[];
  homepageMode?: 'chat-first';
  validationRules?: ValidationRule[];
}

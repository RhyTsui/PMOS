'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import {
  MOCK_WORKSPACE,
  MOCK_TASKS,
  MOCK_RESULTS,
  MOCK_ATTACHMENTS,
  MOCK_EVIDENCE,
  MOCK_MISSING_FIELDS,
  AGENT_MAP,
} from '@/lib/constants';
import type {
  WorkspaceResponse,
  Task,
  TaskContext,
  WorkflowResult,
  AttachmentRecord,
  EvidenceItem,
  MissingField,
  ConversationMode,
  UIState,
  AgentType,
} from '@/types';

interface AgentContextType {
  // Workspace
  workspace: WorkspaceResponse;

  // Tasks
  tasks: Task[];
  activeTask: Task | null;
  activeTaskContext: TaskContext | null;
  setActiveTask: (task: Task | null) => void;

  // Results
  activeResult: WorkflowResult | null;
  setActiveResult: (result: WorkflowResult | null) => void;

  // Conversation support
  conversationMode: ConversationMode | null;
  attachments: AttachmentRecord[];
  evidence: EvidenceItem[];
  missingFields: MissingField[];
  addAttachment: (attachment: AttachmentRecord) => void;
  removeAttachment: (id: string) => void;
  fillMissingField: (field: string, value: string) => void;

  // UI State
  uiState: UIState;
  toggleResultPanel: () => void;
  toggleTaskSidebar: () => void;

  // Agent data
  allAgents: typeof AGENT_MAP;
  currentAgent: AgentType;
  setCurrentAgent: (agent: AgentType) => void;

  // Conversation mode
  setConversationMode: (mode: ConversationMode | null) => void;
}

const AgentContext = createContext<AgentContextType | null>(null);

export function AgentProvider({ children }: { children: ReactNode }) {
  const [workspace] = useState<WorkspaceResponse>(MOCK_WORKSPACE);
  const [tasks] = useState<Task[]>(MOCK_TASKS);
  const [activeTask, setActiveTaskRaw] = useState<Task | null>(null);
  const [activeResult, setActiveResult] = useState<WorkflowResult | null>(null);
  const [conversationMode, setConversationMode] = useState<ConversationMode | null>(null);
  const [attachments, setAttachments] = useState<AttachmentRecord[]>(MOCK_ATTACHMENTS);
  const [evidence] = useState<EvidenceItem[]>(MOCK_EVIDENCE);
  const [missingFields, setMissingFields] = useState<MissingField[]>(MOCK_MISSING_FIELDS);
  const [currentAgent, setCurrentAgent] = useState<AgentType>('help');
  const [uiState, setUiState] = useState<UIState>({
    isSidebarOpen: false,
    isAgentPanelOpen: false,
    activeAgent: 'help',
    activeTaskId: null,
    showResultPanel: false,
    showTaskSidebar: false,
  });

  const setActiveTask = useCallback((task: Task | null) => {
    setActiveTaskRaw(task);
    if (task) {
      const result = Object.values(MOCK_RESULTS).find(r => r.task_id === task.task_id) || null;
      setActiveResult(result);
      setConversationMode(
        task.workflow_level === 'heavy' ? 'heavy-workflow' :
        task.workflow_level === 'light' ? 'light-workflow' :
        'natural-chat'
      );
    } else {
      setActiveResult(null);
      setConversationMode(null);
    }
  }, []);

  const addAttachment = useCallback((attachment: AttachmentRecord) => {
    setAttachments(prev => {
      const idx = prev.findIndex(a => a.id === attachment.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = attachment;
        return next;
      }
      return [...prev, attachment];
    });
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  }, []);

  const fillMissingField = useCallback((field: string, value: string) => {
    void value; // value will be used when backend integration is complete
    setMissingFields(prev => prev.filter(f => f.field_key !== field));
    // In real implementation, would update task context
  }, []);

  const toggleResultPanel = useCallback(() => {
    setUiState(prev => ({ ...prev, showResultPanel: !prev.showResultPanel }));
  }, []);

  const toggleTaskSidebar = useCallback(() => {
    setUiState(prev => ({ ...prev, showTaskSidebar: !prev.showTaskSidebar }));
  }, []);

  const value: AgentContextType = {
    workspace,
    tasks,
    activeTask,
    activeTaskContext: activeTask ? {
      task_id: activeTask.task_id,
      is_business_related: true,
      business_domain: activeTask.task_type,
      intent_type: activeTask.task_type as import('@/types').IntentType,
      media: '巨量',
      app: '指间山海',
      plan_id: 'plan_001',
      device_id: undefined,
      time_range: '2026-05-01 ~ 2026-05-07',
      attachments: attachments.map(a => a.id),
      missing_fields: missingFields,
    } : null,
    activeResult,
    setActiveTask,
    setActiveResult,
    conversationMode,
    attachments,
    evidence,
    missingFields,
    addAttachment,
    removeAttachment,
    fillMissingField,
    uiState,
    toggleResultPanel,
    toggleTaskSidebar,
    allAgents: AGENT_MAP,
    currentAgent,
    setCurrentAgent,
    setConversationMode,
  };

  return (
    <AgentContext.Provider value={value}>
      {children}
    </AgentContext.Provider>
  );
}

export function useAgent() {
  const ctx = useContext(AgentContext);
  if (!ctx) throw new Error('useAgent must be used within AgentProvider');
  return ctx;
}

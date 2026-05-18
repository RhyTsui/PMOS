'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { apiFetch } from '@/lib/api';
import { AGENT_MAP } from '@/lib/constants';
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
  workspace: WorkspaceResponse | null;
  workspaceLoading: boolean;

  // Tasks
  tasks: Task[];
  tasksLoading: boolean;
  activeTask: Task | null;
  activeTaskContext: TaskContext | null;
  setActiveTask: (task: Task | null) => void;
  refreshTasks: () => void;

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
  replaceAttachments: (attachments: AttachmentRecord[]) => void;
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
  const [workspace, setWorkspace] = useState<WorkspaceResponse | null>(null);
  const [workspaceLoading, setWorkspaceLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [activeTask, setActiveTaskRaw] = useState<Task | null>(null);
  const [activeTaskContext, setActiveTaskContext] = useState<TaskContext | null>(null);
  const [activeResult, setActiveResult] = useState<WorkflowResult | null>(null);
  const [conversationMode, setConversationMode] = useState<ConversationMode | null>(null);
  const [attachments, setAttachments] = useState<AttachmentRecord[]>([]);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [missingFields, setMissingFields] = useState<MissingField[]>([]);
  const [currentAgent, setCurrentAgent] = useState<AgentType>('help');
  const [uiState, setUiState] = useState<UIState>({
    isSidebarOpen: false,
    isAgentPanelOpen: false,
    activeAgent: 'help',
    activeTaskId: null,
    showResultPanel: true,
    showTaskSidebar: false,
  });

  // ── Load workspace on mount ──
  useEffect(() => {
    apiFetch<WorkspaceResponse>('/workspace')
      .then(data => setWorkspace(data))
      .catch(() => {/* fallback: workspace stays null */})
      .finally(() => setWorkspaceLoading(false));
  }, []);

  // ── Load tasks on mount ──
  const refreshTasks = useCallback(() => {
    setTasksLoading(true);
    apiFetch<Task[]>('/tasks')
      .then(data => setTasks(data))
      .catch(() => setTasks([]))
      .finally(() => setTasksLoading(false));
  }, []);

  useEffect(() => { refreshTasks(); }, [refreshTasks]);

  // ── Set active task: load context/results/evidence ──
  const setActiveTask = useCallback((task: Task | null) => {
    setActiveTaskRaw(task);
    if (task) {
      // Load task context
      apiFetch<TaskContext>(`/tasks/${task.task_id}/context`)
        .then(ctx => {
          setActiveTaskContext(ctx);
          setMissingFields(ctx.missing_fields || []);
        })
        .catch(() => setActiveTaskContext(null));

      // Load results
      apiFetch<WorkflowResult[]>(`/tasks/${task.task_id}/results`)
        .then(results => setActiveResult(results[0] || null))
        .catch(() => setActiveResult(null));

      // Load evidence
      apiFetch<EvidenceItem[]>(`/tasks/${task.task_id}/evidence`)
        .then(ev => setEvidence(ev))
        .catch(() => setEvidence([]));

      // Load attachments
      apiFetch<AttachmentRecord[]>(`/conversations/${task.conversation_id}/attachments`)
        .then(att => setAttachments(att))
        .catch(() => setAttachments([]));

      setConversationMode(
        task.workflow_level === 'heavy' ? 'heavy-workflow' :
        task.workflow_level === 'light' ? 'light-workflow' :
        'natural-chat'
      );
    } else {
      setActiveTaskContext(null);
      setActiveResult(null);
      setConversationMode(null);
      setEvidence([]);
      setAttachments([]);
      setMissingFields([]);
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

  const replaceAttachments = useCallback((nextAttachments: AttachmentRecord[]) => {
    setAttachments(nextAttachments);
  }, []);

  const fillMissingField = useCallback((field: string, value: string) => {
    void value;
    setMissingFields(prev => prev.filter(f => f.field_key !== field));
  }, []);

  const toggleResultPanel = useCallback(() => {
    setUiState(prev => ({ ...prev, showResultPanel: !prev.showResultPanel }));
  }, []);

  const toggleTaskSidebar = useCallback(() => {
    setUiState(prev => ({ ...prev, showTaskSidebar: !prev.showTaskSidebar }));
  }, []);

  const value: AgentContextType = {
    workspace,
    workspaceLoading,
    tasks,
    tasksLoading,
    activeTask,
    activeTaskContext,
    setActiveTask,
    refreshTasks,
    activeResult,
    setActiveResult,
    conversationMode,
    attachments,
    evidence,
    missingFields,
    addAttachment,
    removeAttachment,
    replaceAttachments,
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

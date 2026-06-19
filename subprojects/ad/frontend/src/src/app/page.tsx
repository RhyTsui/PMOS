'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { App, Dropdown, Modal, Select, type MenuProps } from 'antd';
import {
  BarChart3,
  CalendarClock,
  ChevronDown,
  CheckCircle2,
  Clock3,
  Copy,
  Download,
  Ellipsis,
  FileSpreadsheet,
  FileText,
  Link2,
  MapPin,
  Play,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { AgentProvider, useAgent } from '@/hooks/useAgent';
import { useConversation } from '@/hooks/useConversation';
import { useSpeech } from '@/hooks/useSpeech';
import type { SourcePanelPayload } from '@/components/cognitive/ChatContainer';
import { QuickChipsRow } from '@/components/cognitive/ChatContainer';
import InputArea from '@/components/cognitive/InputArea';
import type { ComposerRecommendation } from '@/components/cognitive/message-presentation-projection';
import { AssetPreview } from '@/components/cognitive/AssetPreview';
import { TaskSidebar } from '@/components/workspace/TaskSidebar';
import { ContextEditDrawer } from '@/components/cognitive/ContextEditDrawer';
import { IconAsset } from '@/components/ui/IconAsset';
import FancyCodeBlock from '@/components/ui/FancyCodeBlock';
import ProjectSelectorCombo, { resolveProjectFromTarget, type CurrentProjectMetadata } from '@/components/yokaui/ProjectSelectorCombo';
import { useChatSettings } from '@/hooks/useChatSettings';
import { useThemeColors } from '@/hooks/useTheme';
import { useIsMobile } from '@/hooks/use-mobile';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { DEFAULT_CHAT_DISPLAY_CONFIG, type ChatDisplayConfig } from '@/types/chat-display';
import { buildConversationShareUrl } from '@/lib/share-link';
import { automationApi, automationExecutionApi, conversationApi, notificationApi, scheduledTaskApi } from '@/lib/api';
import type { AgentType, AttachmentRecord, AttachmentInsight, AutomationNotification, AutomationTemplateConfig, Message, MissingField, ProjectBinding, ScheduleFrequency, ScheduledTask, ScheduledTaskExecution, WorkflowResult } from '@/types';
import { ResultPanel } from '@/components/workspace/ResultPanel';
import { buildMessageDisclosureView } from '@/components/cognitive/messageState';
import { MessageDisclosureDrawer } from '@/components/cognitive/MessageDisclosureDrawer';
import { AssetPreviewModal, type AssetPreviewModalAsset } from '@/components/cognitive/AssetPreviewModal';
import { DebugLogPanel } from '@/components/workspace/DebugLogPanel';
import { AutomationModals } from '@/components/workspace/AutomationModals';
import { AssetsCenter } from '@/components/workspace/AssetsCenter';
import { AutomationCenter } from '@/components/workspace/AutomationCenter';
import { OpenedAssetPreview } from '@/components/workspace/OpenedAssetPreview';
import {
  type WorkspaceView, type AssetCategory, type AssetSourceFilter, type AssetFormatFilter,
  type AutomationTab, type ProjectContextLoadStatus,
  type AssetRecord, type AutomationTemplate, type AutomationRunRecord, type AutomationTaskDraft,
  type ConversationSearchHit,
  CHAT_WORKSPACE_BACKGROUND, WORKSPACE_VIEW_STORAGE_KEY,
  ASSET_SOURCE_FILTERS, ASSET_FORMAT_FILTERS, ASSET_LIBRARY,
  FALLBACK_AUTOMATION_TEMPLATES, AUTOMATION_TABS,
  AUTOMATION_FREQUENCY_OPTIONS, AUTOMATION_RUN_TIME_OPTIONS,
  AUTOMATION_METRIC_OPTIONS, AUTOMATION_DIMENSION_OPTIONS, AUTOMATION_TYPE_LABELS,
  mapAutomationTemplate, splitAutomationList, joinAutomationList,
  runTimeFromCronExpression, buildAutomationCronExpression, isTimeAwareFrequency,
  normalizeProjectRef, resolveProjectBindingRef, normalizeProjectBindingSignature,
  buildProjectBinding, buildProjectContextText, extractExplicitProjectTarget,
  isProjectBoundObjectVisible, shouldWaitForProjectContext,
  asRecord, buildAutomationDraftFromResult, getExecutionStatusLabel, formatJsonPreview,
  getAssetFileName, getAssetTypeLabel, isPreviewSupported, getAssetPreview,
  getAttachmentCategory, getAttachmentFormat, attachmentToAsset, inferAttachmentKind,
  validateUploadFile, canvasToBlob, getKnowledgeSourceDetails,
  getInitialWorkspaceView, getResultMissingFields,
  FilterSelect, LoadingSkeletonRows, SharedConversationLoadingPanel,
  MAX_UPLOAD_FILES, createImageThumbnail, createVideoCover,
} from '@/lib/page-helpers';


const ChatContainer = dynamic(() => import('@/components/cognitive/ChatContainer'), {
  ssr: false,
  loading: () => (
    <div
      data-chat-container-loading="true"
      style={{
        flex: 1,
        minHeight: 0,
      }}
    />
  ),
});



function SharePlaneIcon({ size = 17 }: { size?: number }) {
  return <IconAsset name="share-plane" size={size} />;
}

function hasRuntimeDisclosureDetails(message: Message | null | undefined): boolean {
  if (!message || message.role !== 'assistant') return false;
  const metadata = message.metadata && typeof message.metadata === 'object' ? message.metadata as Record<string, unknown> : {};
  const workflowResult = metadata.workflow_result && typeof metadata.workflow_result === 'object'
    ? metadata.workflow_result as Record<string, unknown>
    : {};
  const messageContract = metadata.message_contract && typeof metadata.message_contract === 'object'
    ? metadata.message_contract as Record<string, unknown>
    : {};
  return Boolean(
    (Array.isArray(message.process_events) && message.process_events.length > 0)
      || (Array.isArray(metadata.process_events) && metadata.process_events.length > 0)
      || (Array.isArray(message.tool_calls) && message.tool_calls.length > 0)
      || (Array.isArray(metadata.tool_calls) && metadata.tool_calls.length > 0)
      || metadata.message_runtime_projection
      || workflowResult.message_runtime_projection
      || messageContract.message_runtime_projection
      || metadata.runtime_state
  );
}




function WorkspaceContent() {
  const { message } = App.useApp();
  const c = useThemeColors();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const [viewportWidth, setViewportWidth] = useState(1440);
  const {
    activeTaskContext,
    activeResult: agentResult,
    attachments,
    missingFields,
    currentAgent,
    setCurrentAgent,
    addAttachment,
    removeAttachment,
    replaceAttachments,
    conversationMode,
  } = useAgent();

  const [projectContextText, setProjectContextText] = useState('项目范围：未选择项目');
  const [projectContextLoadStatus, setProjectContextLoadStatus] = useState<ProjectContextLoadStatus>('loading');
  const [currentProject, setCurrentProject] = useState<CurrentProjectMetadata | null>(null);
  const [currentProjectId, setCurrentProjectId] = useState<string | number | null>(null);
  const currentProjectRef = useMemo(() => normalizeProjectRef(currentProject), [currentProject]);
  const currentProjectBinding = useMemo(() => buildProjectBinding(currentProject), [currentProject]);

  const {
    conversations,
    activeConversationId,
    runningConversationIds,
    messages,
    isLoadingMessages,
    isTyping,
    sendMessage,
    cancelStream,
    createConversation,
    startBlankConversation,
    selectConversation,
    renameConversation,
    deleteConversation,
    currentResult,
  } = useConversation(currentProjectBinding);

  const chatSettings = useChatSettings();
  const { speak, stopSpeaking, speaking, synthesisSupported } = useSpeech();

  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const [showContextDrawer, setShowContextDrawer] = useState(false);
  const [autoSpeakEnabled, setAutoSpeakEnabled] = useState(false);
  const [sourcePanelPayload, setSourcePanelPayload] = useState<SourcePanelPayload | null>(null);
  const [sourcePanelMessageId, setSourcePanelMessageId] = useState<string | null>(null);
  const [sharedConversationId, setSharedConversationId] = useState<string | null>(null);
  const [sharedConversationTitle, setSharedConversationTitle] = useState('');
  const [sharedConversationMessages, setSharedConversationMessages] = useState<Message[]>([]);
  const [sharedConversationBlocked, setSharedConversationBlocked] = useState(false);
  const [sharedConversationLoading, setSharedConversationLoading] = useState(false);
  const [sidebarDrawerOpen, setSidebarDrawerOpen] = useState(false);
  const [sidebarDrawerVisible, setSidebarDrawerVisible] = useState(false);
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>('chat');
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [referencedAssets, setReferencedAssets] = useState<AssetRecord[]>([]);
  const [assetSourceFilter, setAssetSourceFilter] = useState<AssetSourceFilter>('all');
  const [assetFormatFilter, setAssetFormatFilter] = useState<AssetFormatFilter>('all');
  const [deletedAssetIds, setDeletedAssetIds] = useState<string[]>([]);
  const [assetSearch, setAssetSearch] = useState('');
  const [hoveredAssetId, setHoveredAssetId] = useState<string | null>(null);
  const [openedAsset, setOpenedAsset] = useState<AssetRecord | null>(null);
  const [uploadedAssetAttachments, setUploadedAssetAttachments] = useState<AttachmentRecord[]>([]);
  const [automationTab, setAutomationTab] = useState<AutomationTab>('configured');
  const [automationTasks, setAutomationTasks] = useState<ScheduledTask[]>([]);
  const [automationTemplates, setAutomationTemplates] = useState<AutomationTemplate[]>([]);
  const [automationLoading, setAutomationLoading] = useState(false);
  const [automationUnreadCount, setAutomationUnreadCount] = useState(0);
  const [openedAutomationRun, setOpenedAutomationRun] = useState<AutomationRunRecord | null>(null);
  const [editingAutomationTask, setEditingAutomationTask] = useState<ScheduledTask | null>(null);
  const [creatingAutomationTask, setCreatingAutomationTask] = useState(false);
  const [automationTaskDraft, setAutomationTaskDraft] = useState<AutomationTaskDraft>({
    name: '',
    description: '',
    frequency: 'daily',
    run_time: '09:00',
    cron_expression: '',
    monitor_metrics: '',
    dimension: '',
    notify_on_failure: true,
    notify_on_success: true,
    alert_targets: '',
  });
  const [composerDraft, setComposerDraft] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<ConversationSearchHit[]>([]);
  const [activeSidePanel, setActiveSidePanel] = useState<AgentType | null>(null);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [rightPanelDismissed, setRightPanelDismissed] = useState(true);
  const [chatDisplayConfig, setChatDisplayConfig] = useState<ChatDisplayConfig>(DEFAULT_CHAT_DISPLAY_CONFIG);
  const [resultRecommendations, setResultRecommendations] = useState<ComposerRecommendation[]>([]);
  const [personalKnowledgeOpen, setPersonalKnowledgeOpen] = useState(false);
  const [personalKnowledgeAccessUrl, setPersonalKnowledgeAccessUrl] = useState('https://dataki.dobest.com');
  const [personalKnowledgeStatus, setPersonalKnowledgeStatus] = useState<'success' | 'failed' | 'skipped' | undefined>();
  const [personalKnowledgeMessage, setPersonalKnowledgeMessage] = useState('');
  const lastSpokenMessageIdRef = useRef<string | null>(null);
  const assetUploadInputRef = useRef<HTMLInputElement>(null);

  const activeStarterItems = useMemo(() => chatDisplayConfig.starters
    .filter((item) => item.enabled)
    .sort((a, b) => {
      const preferredOrder = ['delivery', 'anomaly-diagnosis', 'metric-explain', 'business-collaboration', 'data-analysis', 'report-generation', 'market-intel'];
      const aIndex = preferredOrder.indexOf(a.id);
      const bIndex = preferredOrder.indexOf(b.id);
      if (aIndex !== -1 || bIndex !== -1) {
        return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
      }
      return a.sortOrder - b.sortOrder;
    }), [chatDisplayConfig.starters]);

  const [modelRuntimeStatus, setModelRuntimeStatus] = useState({
    connected: false,
    loading: true,
    modelName: '检测中',
  });

  useEffect(() => {
    let active = true;
    const loadModelStatus = async () => {
      try {
        const response = await fetch('/api/xiaoqiao/admin/model-service-config', {
          credentials: 'include',
        });
        if (!response.ok) throw new Error(`unexpected status ${response.status}`);
        const config = await response.json() as {
          enabled?: boolean;
          apiKey?: string;
          baseUrl?: string;
          modelBaseUrl?: string;
          modelName?: string;
        };
        const connected = Boolean(
          config.enabled &&
          config.apiKey &&
          config.baseUrl &&
          config.modelBaseUrl &&
          config.modelName,
        );
        if (!active) return;
        setModelRuntimeStatus({
          connected,
          loading: false,
          modelName: config.modelName?.trim() || '未接通',
        });
      } catch {
        if (!active) return;
        setModelRuntimeStatus({
          connected: false,
          loading: false,
          modelName: '未接通',
        });
      }
    };
    const timer = window.setTimeout(() => {
      void loadModelStatus();
    }, 2500);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, []);

  const activeResult = currentResult || agentResult;
  const showSourcePanel = workspaceView === 'chat' && !!sourcePanelPayload;
  const showCenteredComposer = !sharedConversationId && workspaceView === 'chat' && messages.length === 0 && !isTyping;
  const visibleMessages = useMemo(
    () => (sharedConversationId ? sharedConversationMessages : messages),
    [sharedConversationId, sharedConversationMessages, messages],
  );
  const activePanelMessage = useMemo(() => {
    if (!sourcePanelPayload) return null;
    const searchId = sourcePanelMessageId
      || sourcePanelPayload.message?.message_id
      || sourcePanelPayload.message?.id
      || null;
    const matchedMessage = searchId
      ? visibleMessages.find((message) => (message.message_id || message.id) === searchId)
      : null;
    if (matchedMessage) return matchedMessage;
    const latestRuntimeMessage = [...visibleMessages].reverse().find(hasRuntimeDisclosureDetails);
    return latestRuntimeMessage || sourcePanelPayload.message;
  }, [sourcePanelMessageId, sourcePanelPayload, visibleMessages]);
  const canViewRawDisclosure = Boolean(
    user?.admin_access?.is_super_admin
      || user?.admin_access?.can_operate_admin
      || user?.admin_access?.can_view_admin,
  );
  const disclosureView = useMemo(
    () => {
      if (!showSourcePanel) return null;
      return buildMessageDisclosureView({
        message: activePanelMessage || null,
        source: sourcePanelPayload?.source ? { ...sourcePanelPayload.source } : null,
        capability: sourcePanelPayload?.capability ? { ...sourcePanelPayload.capability } : null,
        permissions: {
          canViewRaw: canViewRawDisclosure,
          canViewFull: canViewRawDisclosure,
          redactionLevel: canViewRawDisclosure ? 'none' : 'partial',
        },
      });
    },
    [canViewRawDisclosure, showSourcePanel, sourcePanelPayload, activePanelMessage],
  );
  const activeConversation = useMemo(
    () => conversations.find((item) => item.conversation_id === activeConversationId) || null,
    [activeConversationId, conversations],
  );
  const topBarTitle = sharedConversationId
    ? '这是已分享的 小乔智投 对话副本'
    : workspaceView === 'assets'
      ? '我的资产'
      : workspaceView === 'automation'
        ? '自动化'
        : activeConversation?.title || '';

  useEffect(() => {
    setResultRecommendations([]);
  }, [activeConversationId, workspaceView]);

  useEffect(() => {
    if (sharedConversationId) return;
    const nextProjectRef = resolveProjectBindingRef(activeConversation?.project_binding);
    if (!nextProjectRef) return;
    setCurrentProjectId((current) => (String(current ?? '') === nextProjectRef ? current : nextProjectRef));
  }, [activeConversation?.project_binding, sharedConversationId]);

  useEffect(() => {
    if (sharedConversationId || !activeConversationId) return;
    if (activeConversationId.startsWith('optimistic-')) return;
    if (!currentProject || currentProjectId === null) return;
    if (String(currentProject.appId ?? '') !== String(currentProjectId)) return;
    const nextBinding = buildProjectBinding(currentProject);
    if (!nextBinding) return;
    if (normalizeProjectBindingSignature(activeConversation?.project_binding) === normalizeProjectBindingSignature(nextBinding)) return;
    void conversationApi.update(activeConversationId, { project_binding: nextBinding }).catch(() => undefined);
  }, [activeConversation?.project_binding, activeConversationId, currentProject, currentProjectId, sharedConversationId]);

  const reloadUploadedAssets = useCallback(async () => {
    try {
      const response = await fetch('/api/xiaoqiao/attachments', { cache: 'no-store' });
      if (!response.ok) throw new Error(await response.text());
      const items = await response.json() as AttachmentRecord[];
      setUploadedAssetAttachments(Array.isArray(items) ? items : []);
    } catch {
      setUploadedAssetAttachments([]);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    setSharedConversationId(params.get('sharedConversationId'));
    setSharedConversationTitle(params.get('sharedConversationTitle') || '');
    setWorkspaceView(getInitialWorkspaceView());
  }, []);

  useEffect(() => {
    if (workspaceView !== 'assets') return;
    void reloadUploadedAssets();
  }, [reloadUploadedAssets, workspaceView]);

  const loadPersonalKnowledgeConfig = useCallback(async () => {
    try {
      const response = await fetch('/api/xiaoqiao/personal-knowledge/config', { cache: 'no-store' });
      if (!response.ok) throw new Error(await response.text());
      const config = await response.json() as {
        enabled?: boolean;
        accessUrl?: string;
        lastTestStatus?: 'success' | 'failed' | 'skipped';
        lastTestMessage?: string;
      };
      setPersonalKnowledgeAccessUrl(config.accessUrl || 'https://dataki.dobest.com');
      setPersonalKnowledgeStatus(config.lastTestStatus);
      setPersonalKnowledgeMessage(config.lastTestMessage || (config.enabled ? '已内置个人知识库' : ''));
    } catch {
      setPersonalKnowledgeMessage('暂时无法读取个人知识库状态');
    }
  }, []);

  const openPersonalKnowledgeConfig = useCallback(() => {
    setPersonalKnowledgeOpen(true);
    void loadPersonalKnowledgeConfig();
  }, [loadPersonalKnowledgeConfig]);

  const hasRunningConversation = useMemo(
    () => runningConversationIds.length > 0,
    [runningConversationIds],
  );
  const isCurrentConversationRunning = useMemo(
    () => Boolean(
      activeConversationId && runningConversationIds.includes(activeConversationId),
    ),
    [activeConversationId, runningConversationIds],
  );
  const latestAssistantMessage = useMemo(
    () => [...messages].reverse().find((item) => item.role === 'assistant' && item.content.trim()),
    [messages],
  );
  const activeResultRef = useRef(activeResult);
  const isCompactLayout = isMobile || viewportWidth < 1200;
  const pageSidePadding = isCompactLayout ? 20 : 30;

  const closeRightPanel = useCallback(() => {
    setSourcePanelPayload(null);
    setSourcePanelMessageId(null);
    setActiveSidePanel(null);
    setRightPanelCollapsed(false);
    setRightPanelDismissed(true);
  }, []);

  const switchWorkspaceView = useCallback((nextView: WorkspaceView) => {
    setWorkspaceView(nextView);
    if (typeof window === 'undefined') return;

    const url = new URL(window.location.href);
    url.searchParams.delete('sharedConversationId');
    url.searchParams.delete('sharedConversationTitle');
    if (nextView === 'chat') {
      url.searchParams.delete('view');
    } else {
      url.searchParams.set('view', nextView);
    }
    try {
      if (nextView === 'chat') {
        window.localStorage.removeItem(WORKSPACE_VIEW_STORAGE_KEY);
      } else {
        window.localStorage.setItem(WORKSPACE_VIEW_STORAGE_KEY, nextView);
      }
    } catch {
      // localStorage 不可用时只保持当前页面状态。
    }
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  }, []);

  useEffect(() => {
    if (activeResultRef.current !== activeResult) {
      activeResultRef.current = activeResult;
      setRightPanelDismissed(true);
    }
  }, [activeResult]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => setViewportWidth(window.innerWidth);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/xiaoqiao/chat-display-config', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((config: ChatDisplayConfig | null) => {
        if (!cancelled && config) setChatDisplayConfig(config);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (sidebarDrawerOpen) {
      const id = window.requestAnimationFrame(() => setSidebarDrawerVisible(true));
      return () => window.cancelAnimationFrame(id);
    }

    setSidebarDrawerVisible(false);
    return undefined;
  }, [sidebarDrawerOpen]);

  const closeSidebarDrawer = useCallback(() => {
    setSidebarDrawerVisible(false);
    window.setTimeout(() => setSidebarDrawerOpen(false), 320);
  }, []);

  const clearSharedConversationMode = useCallback(() => {
    setSharedConversationId(null);
    setSharedConversationTitle('');
    setSharedConversationMessages([]);
    setSharedConversationBlocked(false);
    setSharedConversationLoading(false);
  }, []);

  const handleShareConversationLink = useCallback(async (conversationId: string, title?: string) => {
    const shareUrl = buildConversationShareUrl(conversationId, title || activeConversation?.title || '当前会话');
    if (!shareUrl) {
      message.info('当前环境暂不支持复制链接');
      return;
    }

    const tryClipboardApi = async () => {
      if (!navigator?.clipboard?.writeText) return false;
      try {
        await navigator.clipboard.writeText(shareUrl);
        return true;
      } catch {
        return false;
      }
    };

    const tryLegacyCopy = () => {
      try {
        const textarea = document.createElement('textarea');
        textarea.name = 'conversation_share_copy_buffer';
        textarea.value = shareUrl;
        textarea.setAttribute('readonly', 'true');
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '0';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        textarea.setSelectionRange(0, textarea.value.length);
        const ok = document.execCommand('copy');
        document.body.removeChild(textarea);
        return ok;
      } catch {
        return false;
      }
    };

    const copied = (await tryClipboardApi()) || tryLegacyCopy();
    if (copied) {
      message.success('链接已复制');
      return;
    }

    Modal.info({
      title: '复制链接',
      centered: true,
      content: (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 13, color: c.textSecondary, marginBottom: 10 }}>
            当前浏览器不支持一键复制，请长按或全选复制下面的链接。
          </div>
          <input
            id="conversation-share-url"
            name="conversation_share_url"
            readOnly
            value={shareUrl}
            onFocus={(event) => event.currentTarget.select()}
            style={{
              width: '100%',
              height: 40,
              borderRadius: 10,
              border: '1px solid #dbe4f0',
              padding: '0 12px',
              fontSize: 13,
              color: c.textPrimary,
              outline: 'none',
            }}
          />
        </div>
      ),
      okText: '关闭',
    });
  }, [activeConversation?.title]);

  const shareMenuItems: MenuProps['items'] = useMemo(() => {
    if (!activeConversationId) return [];
    return [
      {
        key: 'share-xiaoshan',
        label: '复制链接',
        icon: <SharePlaneIcon size={14} />,
        onClick: () => void handleShareConversationLink(activeConversationId, activeConversation?.title || '当前会话'),
      },
    ];
  }, [activeConversationId, activeConversation?.title, handleShareConversationLink]);

  useEffect(() => {
    if (!searchOpen) return;

    const keyword = searchQuery.trim();
    if (!keyword) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      setSearchLoading(true);
      try {
        const projectRefs = currentProjectBinding?.project_refs?.join(',') || '';
        const response = await fetch(`/api/xiaoqiao/conversations/search?q=${encodeURIComponent(keyword)}${projectRefs ? `&project_refs=${encodeURIComponent(projectRefs)}` : ''}`);
        const data = await response.json();
        setSearchResults(Array.isArray(data) ? data : []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 220);

    return () => window.clearTimeout(timer);
  }, [currentProjectBinding, searchOpen, searchQuery]);

  useEffect(() => {
    if (!sharedConversationId) {
      return undefined;
    }

    let cancelled = false;
    setWorkspaceView('chat');
    setSharedConversationLoading(true);
    setSharedConversationBlocked(false);
    setSharedConversationMessages([]);

    const loadSharedConversation = async () => {
      try {
        const [conversationResponse, messagesResponse] = await Promise.all([
          fetch(`/api/xiaoqiao/conversations/${sharedConversationId}`, { cache: 'no-store' }),
          fetch(`/api/xiaoqiao/conversations/${sharedConversationId}/messages`, { cache: 'no-store' }),
        ]);

        if (cancelled) return;

        // 共享链接在浏览器打开时，如果没有登录态，先引导到登录页，登录后回到当前链接。
        if (conversationResponse.status === 401 || messagesResponse.status === 401) {
          if (typeof window !== 'undefined') {
            const redirect = encodeURIComponent(`${window.location.pathname}${window.location.search}`);
            window.location.href = `/login?redirect=${redirect}`;
          }
          return;
        }
        if (!conversationResponse.ok || !messagesResponse.ok) {
          setSharedConversationBlocked(true);
          setSharedConversationMessages([]);
          return;
        }

        const conversationPayload = await conversationResponse.json().catch(() => null) as { title?: string } | null;
        const messagesPayload = await messagesResponse.json().catch(() => []);
        const nextMessages = Array.isArray(messagesPayload) ? messagesPayload : [];
        const nextTitle = typeof conversationPayload?.title === 'string' && conversationPayload.title.trim()
          ? conversationPayload.title
          : '';
        if (nextTitle) {
          setSharedConversationTitle(nextTitle);
        } else {
          setSharedConversationTitle((prev) => prev || '已分享的对话');
        }
        setSharedConversationMessages(nextMessages);
      } catch {
        if (!cancelled) {
          setSharedConversationBlocked(true);
          setSharedConversationMessages([]);
        }
      } finally {
        if (!cancelled) {
          setSharedConversationLoading(false);
        }
      }
    };

    void loadSharedConversation();

    return () => {
      cancelled = true;
    };
  }, [sharedConversationId]);

  useEffect(() => {
    if (!activeConversationId) {
      replaceAttachments([]);
      return;
    }
    if (activeConversationId.startsWith('optimistic-')) {
      replaceAttachments([]);
      return;
    }

    let cancelled = false;

    fetch(`/api/xiaoqiao/conversations/${activeConversationId}/attachments`)
      .then(async (response) => {
        if (!response.ok) throw new Error(await response.text());
        return response.json() as Promise<AttachmentRecord[]>;
      })
      .then((items) => {
        if (!cancelled) replaceAttachments(Array.isArray(items) ? items : []);
      })
      .catch(() => {
        if (!cancelled) replaceAttachments([]);
      });

    return () => {
      cancelled = true;
    };
  }, [activeConversationId, replaceAttachments]);

  useEffect(() => {
    if (workspaceView !== 'automation') return;
    let cancelled = false;
    fetch('/api/xiaoqiao/admin/automation-templates?status=active')
      .then(async (response) => {
        if (!response.ok) throw new Error(await response.text());
        return response.json() as Promise<AutomationTemplateConfig[]>;
      })
      .then((items) => {
        if (!cancelled) {
          setAutomationTemplates(Array.isArray(items) ? items.map(mapAutomationTemplate) : []);
        }
      })
      .catch(() => {
        if (!cancelled) setAutomationTemplates([]);
      });
    return () => {
      cancelled = true;
    };
  }, [workspaceView]);

  const handleFollowUpClick = useCallback((question: string) => {
    switchWorkspaceView('chat');
    setComposerDraft(question);
  }, [switchWorkspaceView]);

  const handleAgentChange = useCallback((agent: typeof currentAgent) => {
    setCurrentAgent(agent);
  }, [setCurrentAgent]);

  const handleOpenAgentPanel = useCallback((agent: AgentType) => {
    if (!['demand', 'diagnosis', 'debugging'].includes(agent)) return;
    switchWorkspaceView('chat');
    setSourcePanelPayload(null);
    setSourcePanelMessageId(null);
    setRightPanelDismissed(false);
    setCurrentAgent(agent);
    if (agent === 'debugging') {
      setActiveSidePanel(null);
      setRightPanelCollapsed(false);
      return;
    }
    setActiveSidePanel(agent);
    setRightPanelCollapsed(false);
  }, [setCurrentAgent, switchWorkspaceView]);

  const handleCreateConversationRequest = useCallback(async () => {
    switchWorkspaceView('chat');
    setSourcePanelPayload(null);
    setSourcePanelMessageId(null);
    setActiveSidePanel(null);
    setRightPanelCollapsed(false);
    setRightPanelDismissed(true);
    startBlankConversation();
  }, [startBlankConversation, switchWorkspaceView]);

  const handleUpload = useCallback(async (file: File, sourceType: 'click' | 'drag' | 'paste') => {
    const kind = inferAttachmentKind(file);
    const validationError = validateUploadFile(file);
    if (validationError) {
      message.error(validationError);
      return;
    }
    const imagePreview = kind === 'image' ? await createImageThumbnail(file) : null;
    const videoCover = kind === 'video' ? await createVideoCover(file) : null;
    const previewBlob = imagePreview?.blob || videoCover?.blob;
    const previewUrl = previewBlob ? URL.createObjectURL(previewBlob) : undefined;
    const conversationId = activeConversationId || (await createConversation()).conversation_id;
    const projectBinding = currentProjectBinding;
    const attachmentId = `att-local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const attachment: AttachmentRecord = {
      id: attachmentId,
      conversation_id: conversationId,
      name: file.name,
      filename: file.name,
      kind,
      type: kind,
      mime_type: file.type || 'application/octet-stream',
      size: file.size,
      status: 'uploading',
      asset_state: 'draft',
      preview_url: previewUrl,
      preview_image_url: previewUrl,
      thumbnail_status: kind === 'image' || kind === 'video' ? (previewUrl ? 'generated' : 'failed') : 'unsupported',
      media_width: imagePreview?.width || videoCover?.width,
      media_height: imagePreview?.height || videoCover?.height,
      duration_ms: videoCover?.durationMs,
      url: previewUrl,
      source_type: sourceType,
      project_binding: projectBinding,
      created_at: new Date().toISOString(),
    };

    addAttachment(attachment);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('source_type', sourceType);
      if (imagePreview?.blob) formData.append('thumbnail', imagePreview.blob, `${file.name}.thumb.webp`);
      if (videoCover?.blob) formData.append('cover', videoCover.blob, `${file.name}.cover.webp`);
      if (imagePreview?.width || videoCover?.width) formData.append('media_width', String(imagePreview?.width || videoCover?.width));
      if (imagePreview?.height || videoCover?.height) formData.append('media_height', String(imagePreview?.height || videoCover?.height));
      if (videoCover?.durationMs) formData.append('duration_ms', String(videoCover.durationMs));
      if (projectBinding) formData.append('project_binding', JSON.stringify(projectBinding));
      const response = await fetch(`/api/xiaoqiao/conversations/${conversationId}/attachments`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error(await response.text());
      const saved = await response.json() as AttachmentRecord;
      replaceAttachments(attachments.map(item => item.id === attachmentId ? saved : item).concat(
        attachments.some(item => item.id === attachmentId) ? [] : [saved],
      ));
    } catch {
      replaceAttachments(attachments.map(item => item.id === attachmentId ? { ...item, status: 'upload_failed' } : item));
    }
  }, [activeConversationId, addAttachment, attachments, createConversation, currentProjectBinding, replaceAttachments]);

  const handleUploadFiles = useCallback((files: FileList | File[], sourceType: 'click' | 'drag' | 'paste' = 'click') => {
    const items = Array.from(files);
    if (items.length === 0) return;
    const availableSlots = Math.max(0, MAX_UPLOAD_FILES - attachments.length);
    if (availableSlots <= 0) {
      message.warning(`一次最多上传 ${MAX_UPLOAD_FILES} 个文件。`);
      return;
    }
    const accepted = items.slice(0, availableSlots);
    if (items.length > availableSlots) {
      message.warning(`一次最多上传 ${MAX_UPLOAD_FILES} 个文件，已保留前 ${availableSlots} 个。`);
    }
    accepted.forEach((file) => {
      void handleUpload(file, sourceType);
    });
  }, [attachments.length, handleUpload]);

  const handleRemoveAttachment = useCallback((attachmentId: string) => {
    removeAttachment(attachmentId);
    void fetch(`/api/xiaoqiao/attachments/${attachmentId}`, { method: 'DELETE' }).catch(() => undefined);
  }, [removeAttachment]);

  const handleRetryAttachment = useCallback(async (attachmentId: string) => {
    try {
      const response = await fetch(`/api/xiaoqiao/attachments/${attachmentId}/retry`, { method: 'POST' });
      if (!response.ok) throw new Error(await response.text());
      const saved = await response.json() as AttachmentRecord;
      replaceAttachments(attachments.map(item => item.id === attachmentId ? saved : item));
    } catch {
      replaceAttachments(attachments.map(item => item.id === attachmentId ? { ...item, status: 'parse_failed' } : item));
    }
  }, [attachments, replaceAttachments]);

  const buildSpeechText = useCallback((content: string) => (
    content.replace(/```[\s\S]*?```/g, '').replace(/\s+/g, ' ').trim().slice(0, 500)
  ), []);

  const handleToggleAutoSpeak = useCallback(() => {
    setAutoSpeakEnabled(prev => {
      const next = !prev;
      if (!next) stopSpeaking();
      return next;
    });
  }, [stopSpeaking]);

  const handleContextSave = useCallback((nextContext: Record<string, unknown>) => {
    const lines = Object.entries(nextContext)
      .filter(([, value]) => value !== undefined && value !== null && String(value).trim())
      .map(([key, value]) => `${key}：${String(value)}`);
    setProjectContextText(lines.length ? lines.join('\n') : '项目范围：未选择项目');
    setProjectContextLoadStatus('ready');
    setShowContextDrawer(false);
  }, []);

  const contextThinkingSteps = useMemo(() => {
    const steps: Array<{ title: string; description?: string }> = [];
    if (conversationMode === 'light-workflow') {
      steps.push({ title: '已整理背景', description: '当前会话已进入结构化处理。' });
    }
    if (conversationMode === 'heavy-workflow') {
      steps.push({ title: '处理中', description: '当前会话正在进行更深一层的分析和联动。' });
    }
    if (activeTaskContext?.media) steps.push({ title: '媒体', description: activeTaskContext.media });
    if (activeTaskContext?.app) steps.push({ title: '应用', description: activeTaskContext.app });
    if (activeTaskContext?.time_range) steps.push({ title: '时间范围', description: activeTaskContext.time_range });
    if (activeTaskContext?.anomaly_type) steps.push({ title: '问题类型', description: activeTaskContext.anomaly_type });
    return steps;
  }, [activeTaskContext, conversationMode]);

  useEffect(() => {
    if (!autoSpeakEnabled || !synthesisSupported || isTyping || !latestAssistantMessage?.content) return;

    const messageId = latestAssistantMessage.message_id || latestAssistantMessage.id;
    if (lastSpokenMessageIdRef.current === messageId) return;

    lastSpokenMessageIdRef.current = messageId;
    speak(buildSpeechText(latestAssistantMessage.content));
  }, [autoSpeakEnabled, buildSpeechText, isTyping, latestAssistantMessage, speak, synthesisSupported]);

  const assetLibrary = useMemo(() => {
    const titleByConversation = new Map(conversations.map((item) => [item.conversation_id, item.title]));
    const uploadedAssets = uploadedAssetAttachments.map((attachment) => (
      attachmentToAsset(attachment, titleByConversation.get(attachment.conversation_id))
    ));
    const next = [...uploadedAssets, ...ASSET_LIBRARY];
    return next.filter((asset) => isProjectBoundObjectVisible(asset.projectBinding, currentProjectRef));
  }, [conversations, currentProjectRef, uploadedAssetAttachments]);

  const filteredAssets = useMemo(() => {
    const keyword = assetSearch.trim().toLowerCase();
    return assetLibrary.filter((asset) => {
      if (deletedAssetIds.includes(asset.id)) return false;
      const matchesSource =
        assetSourceFilter === 'all' ||
        (assetSourceFilter === 'uploaded' && asset.source.includes('上传')) ||
        (assetSourceFilter === 'generated' && asset.source.includes('AI'));
      const matchesFormat =
        assetFormatFilter === 'all' ||
        (assetFormatFilter === 'image' && asset.category === 'image') ||
        (assetFormatFilter === 'video' && asset.category === 'video') ||
        (assetFormatFilter === 'document' && ['Word'].includes(asset.format)) ||
        (assetFormatFilter === 'spreadsheet' && ['Excel'].includes(asset.format)) ||
        (assetFormatFilter === 'slides' && ['PPT', 'PPTX'].includes(asset.format)) ||
        (assetFormatFilter === 'pdf' && asset.format === 'PDF');
      const matchesKeyword = !keyword || [
        asset.title,
        asset.format,
        asset.summary,
        asset.source,
      ].some((value) => value.toLowerCase().includes(keyword));
      return matchesSource && matchesFormat && matchesKeyword;
    });
  }, [assetFormatFilter, assetLibrary, assetSearch, assetSourceFilter, deletedAssetIds]);

  const selectedAssets = useMemo(
    () => assetLibrary.filter((asset) => selectedAssetIds.includes(asset.id) && !deletedAssetIds.includes(asset.id)),
    [assetLibrary, deletedAssetIds, selectedAssetIds],
  );

  const automationReportTasks = useMemo(() => (
    automationTasks.filter((task) => (
      isProjectBoundObjectVisible(task.project_binding, currentProjectRef) && (
        task.task_type === 'report_generate' ||
        ['scheduled_report', 'report', 'table_merge', 'tag_summary'].includes(String(task.custom_params?.automation_type || task.custom_params?.report_type || ''))
      )
    ))
  ), [automationTasks, currentProjectRef]);

  const automationRunRecords = useMemo<AutomationRunRecord[]>(() => (
    automationReportTasks.flatMap((task) => (
      task.recent_executions.map((execution) => ({
        id: `${task.id}-${execution.id}`,
        task,
        execution,
      }))
    )).sort((a, b) => b.execution.started_at - a.execution.started_at)
  ), [automationReportTasks]);

  const availableAutomationTemplates = automationTemplates.length > 0 ? automationTemplates : FALLBACK_AUTOMATION_TEMPLATES;

  const reloadAutomationTasks = useCallback(async () => {
    setAutomationLoading(true);
    try {
      const items = await scheduledTaskApi.list({ project_refs: currentProjectBinding?.project_refs });
      setAutomationTasks(Array.isArray(items) ? items : []);
    } catch {
      setAutomationTasks([]);
    } finally {
      setAutomationLoading(false);
    }
  }, [currentProjectBinding]);

  const reloadAutomationUnreadCount = useCallback(async () => {
    try {
      const { unread_count } = await notificationApi.unreadCount();
      setAutomationUnreadCount(Number.isFinite(unread_count) ? unread_count : 0);
    } catch {
      setAutomationUnreadCount(0);
    }
  }, []);

  useEffect(() => {
    if (workspaceView !== 'automation') return;
    void reloadAutomationTasks();
    void reloadAutomationUnreadCount();
    void notificationApi.markRead().then(() => setAutomationUnreadCount(0)).catch(() => undefined);
  }, [reloadAutomationTasks, reloadAutomationUnreadCount, workspaceView]);

  const applySelectedAssets = useCallback(async () => {
    const picked = selectedAssets.slice(0, 10);
    if (selectedAssets.length > 10) {
      message.warning('一次最多引用 10 个资产，已保留前 10 个继续进入会话。');
    }
    await createConversation('基于资产的新对话');
    setReferencedAssets(picked);
    switchWorkspaceView('chat');
  }, [createConversation, selectedAssets, switchWorkspaceView]);

  const handleDownloadAssets = useCallback((assetsToDownload: AssetRecord[]) => {
    assetsToDownload
      .filter((asset) => asset.assetUrl)
      .forEach((asset) => {
        window.open(asset.assetUrl, '_blank', 'noopener,noreferrer');
      });
    const names = assetsToDownload.map((asset) => asset.title).join('、');
    message.success(`已开始下载：${names}`);
  }, []);

  const handleDeleteAssets = useCallback((assetIds: string[]) => {
    setDeletedAssetIds((prev) => Array.from(new Set([...prev, ...assetIds])));
    setSelectedAssetIds((prev) => prev.filter((id) => !assetIds.includes(id)));
    setOpenedAsset((prev) => (prev && assetIds.includes(prev.id) ? null : prev));
    assetIds
      .filter((id) => id.startsWith('att-'))
      .forEach((id) => {
        void fetch(`/api/xiaoqiao/attachments/${id}`, { method: 'DELETE' }).catch(() => undefined);
      });
    message.success('已删除选中的资产');
  }, []);

  const handleConfirmDeleteAsset = useCallback((asset: AssetRecord) => {
    Modal.confirm({
      title: '删除资产',
      content: (
        <div style={{ color: c.textPrimary, fontSize: 14, lineHeight: '22px' }}>
          这会删除“{getAssetFileName(asset)}”。
        </div>
      ),
      okText: '确认删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      centered: true,
      onOk: () => handleDeleteAssets([asset.id]),
    });
  }, [c.textPrimary, handleDeleteAssets]);

  const handleOpenAutomationTemplate = useCallback((template: AutomationTemplate) => {
    switchWorkspaceView('chat');
    setComposerDraft(template.prompt);
  }, [switchWorkspaceView]);

  const handleCreateAutomationInChat = useCallback(() => {
    switchWorkspaceView('chat');
    setComposerDraft('我想创建一个自动化报表任务，请先帮我确认项目、周期、指标、维度、筛选条件和输出格式。');
  }, [switchWorkspaceView]);

  const handleOpenManualAutomationCreate = useCallback(() => {
    setEditingAutomationTask(null);
    setCreatingAutomationTask(true);
    setAutomationTaskDraft({
      name: '',
      description: '',
      frequency: 'daily',
      run_time: '09:00',
      cron_expression: '0 9 * * *',
      monitor_metrics: '消耗、激活、ROI',
      dimension: '媒体、账户',
      notify_on_failure: true,
      notify_on_success: true,
      alert_targets: '',
    });
    const attachmentIds = attachments
      .filter((item) => item.status === 'parsed' && !item.id.startsWith('att-local-'))
      .map((item) => item.id);
    void automationApi.draft({
      conversation_id: activeConversationId || undefined,
      attachment_ids: attachmentIds,
      message: composerDraft || '创建自动化任务',
    }).then((draft) => {
      setAutomationTaskDraft({
        name: draft.name || '',
        description: draft.description || '',
        frequency: draft.frequency || 'daily',
        run_time: runTimeFromCronExpression(draft.cron_expression),
        cron_expression: draft.cron_expression || '0 9 * * *',
        monitor_metrics: draft.monitor_metrics.join('、'),
        dimension: draft.dimensions.join('、'),
        notify_on_failure: true,
        notify_on_success: true,
        alert_targets: draft.alert_targets.join('、'),
      });
    }).catch(() => undefined);
  }, [activeConversationId, attachments, composerDraft]);

  const handleOpenAutomationCreateFromResult = useCallback(() => {
    const resultDraft = buildAutomationDraftFromResult(activeResult as WorkflowResult | Record<string, unknown> | null, composerDraft);
    setEditingAutomationTask(null);
    setCreatingAutomationTask(true);
    setAutomationTaskDraft({
      name: resultDraft?.name || '本次问数定时报表',
      description: resultDraft?.description || '按本次问数结果定时生成报表',
      frequency: 'daily',
      run_time: '09:00',
      cron_expression: '0 9 * * *',
      monitor_metrics: resultDraft?.monitor_metrics || '消耗、激活、ROI',
      dimension: resultDraft?.dimension || '媒体、账户',
      notify_on_failure: true,
      notify_on_success: true,
      alert_targets: '',
    });
    switchWorkspaceView('automation');
    setAutomationTab('configured');
  }, [activeResult, composerDraft, switchWorkspaceView]);

  const handlePauseAutomationTask = useCallback(async (task: ScheduledTask) => {
    try {
      const next = await scheduledTaskApi.pause(task.id);
      setAutomationTasks((prev) => prev.map((item) => item.id === task.id ? next : item));
      message.success('已暂停');
    } catch {
      message.error('暂停失败，请稍后重试');
    }
  }, []);

  const handleResumeAutomationTask = useCallback(async (task: ScheduledTask) => {
    try {
      const next = await scheduledTaskApi.resume(task.id);
      setAutomationTasks((prev) => prev.map((item) => item.id === task.id ? next : item));
      message.success('已开启');
    } catch {
      message.error('开启失败，请稍后重试');
    }
  }, []);

  const handleRunAutomationTask = useCallback(async (task: ScheduledTask) => {
    try {
      setAutomationLoading(true);
      const result = await scheduledTaskApi.run(task.id);
      setAutomationTasks((prev) => prev.map((item) => (item.id === task.id ? result.task : item)));
      await reloadUploadedAssets();
      await reloadAutomationUnreadCount();
      if (result.artifact?.url) {
        window.open(result.artifact.url, '_blank', 'noopener,noreferrer');
      }
      message.success('已生成结果文件');
    } catch {
      message.error('生成失败，请稍后重试');
    } finally {
      setAutomationLoading(false);
    }
  }, [reloadAutomationUnreadCount, reloadUploadedAssets]);

  const handleEditAutomationTask = useCallback((task: ScheduledTask) => {
    setCreatingAutomationTask(false);
    setEditingAutomationTask(task);
    setAutomationTaskDraft({
      name: task.name,
      description: task.description,
      frequency: task.frequency,
      run_time: runTimeFromCronExpression(task.cron_expression),
      cron_expression: task.cron_expression || buildAutomationCronExpression(task.frequency, '09:00'),
      monitor_metrics: task.monitor_metrics.join('、'),
      dimension: String(task.custom_params?.dimension || ''),
      notify_on_failure: task.notification_policy?.on_failure !== false,
      notify_on_success: task.notification_policy?.on_success !== false,
      alert_targets: task.alert_targets.join('、'),
    });
  }, []);

  const handleSaveAutomationTask = useCallback(async () => {
    if (!editingAutomationTask && !creatingAutomationTask) return;
    const metrics = splitAutomationList(automationTaskDraft.monitor_metrics);
    const dimension = automationTaskDraft.dimension.trim();
    const frequency = automationTaskDraft.frequency;
    const cronExpression = buildAutomationCronExpression(frequency, automationTaskDraft.run_time);
    const name = automationTaskDraft.name.trim();
    try {
      const payload: Partial<ScheduledTask> = {
        name: name || editingAutomationTask?.name || '自定义自动化报表',
        description: automationTaskDraft.description.trim(),
        task_type: 'report_generate' as const,
        status: editingAutomationTask?.status || 'active',
        project_binding: editingAutomationTask?.project_binding || currentProjectBinding,
        cron_expression: cronExpression,
        frequency,
        monitor_metrics: metrics,
        alert_channels: ['in_app'] as ScheduledTask['alert_channels'],
        alert_targets: splitAutomationList(automationTaskDraft.alert_targets),
        notification_policy: {
          on_failure: automationTaskDraft.notify_on_failure,
          on_success: automationTaskDraft.notify_on_success,
          on_partial: automationTaskDraft.notify_on_failure,
          target_scope: automationTaskDraft.alert_targets.trim() ? 'custom' : 'creator',
        },
        custom_params: {
          ...(editingAutomationTask?.custom_params || {}),
          automation_type: 'scheduled_report',
          dimension,
          dimensions: splitAutomationList(dimension),
          run_time: automationTaskDraft.run_time,
          data_freshness_policy: 'realtime',
          source_result_id: String(asRecord(activeResult).result_id || ''),
        },
      };
      const next = editingAutomationTask
        ? await scheduledTaskApi.update(editingAutomationTask.id, payload)
        : await scheduledTaskApi.create(payload);
      setAutomationTasks((prev) => (
        editingAutomationTask
          ? prev.map((item) => item.id === next.id ? next : item)
          : [next, ...prev.filter((item) => item.id !== next.id)]
      ));
      setEditingAutomationTask(null);
      setCreatingAutomationTask(false);
      message.success(editingAutomationTask ? '已保存' : '已创建自动化任务');
    } catch {
      message.error(editingAutomationTask ? '保存失败，请稍后重试' : '创建失败，请稍后重试');
    }
  }, [activeResult, automationTaskDraft, creatingAutomationTask, currentProjectBinding, editingAutomationTask]);

  const handleCopyAutomationRun = useCallback(async (record: AutomationRunRecord) => {
    const metrics = record.task.monitor_metrics.length > 0 ? record.task.monitor_metrics.join('、') : '核心指标';
    const dimensions = String(record.task.custom_params?.dimension || '媒体、账户');
    const text = [
      `${record.task.name}`,
      record.execution.result_summary,
      `关注指标：${metrics}`,
      `拆分维度：${dimensions}`,
    ].join('\n');
    try {
      await navigator.clipboard?.writeText(text);
      message.success('报表内容已复制');
    } catch {
      message.info('当前环境不支持自动复制，请手动选择内容复制');
    }
  }, []);

  const handleRetryAutomationRun = useCallback(async (record: AutomationRunRecord) => {
    try {
      const execution = await automationExecutionApi.retry(record.execution.id);
      setAutomationTasks((prev) => prev.map((task) => {
        if (task.id !== record.task.id) return task;
        return {
          ...task,
          recent_executions: [
            execution as unknown as ScheduledTaskExecution,
            ...task.recent_executions.filter((item) => item.id !== execution.id),
          ].slice(0, 10),
        };
      }));
      await reloadAutomationTasks();
      await reloadAutomationUnreadCount();
      message.success('已重新执行');
    } catch {
      message.error('重新执行失败，请稍后重试');
    }
  }, [reloadAutomationTasks, reloadAutomationUnreadCount]);

  const handleLocateAsset = useCallback((asset: AssetRecord) => {
    switchWorkspaceView('chat');
    setOpenedAsset(null);
    selectConversation(asset.conversationId);
    window.setTimeout(() => {
      const element = document.querySelector(`[data-asset-anchor="${asset.id}"]`) || document.querySelector('[data-message-surface]');
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 420);
    message.success(`已打开「${asset.anchorText}」所在会话`);
  }, [selectConversation, switchWorkspaceView]);

  const handleSendWithAssets = useCallback(async (rawMessage: string) => {
    const messageText = rawMessage.trim();
    const explicitProjectTarget = extractExplicitProjectTarget(messageText);
    const resolvedExplicitProject = explicitProjectTarget
      ? await resolveProjectFromTarget(explicitProjectTarget)
      : null;
    const projectForTurn = resolvedExplicitProject || currentProject;
    const projectContextForTurn = buildProjectContextText(projectForTurn);

    if (
      workspaceView === 'chat' &&
      projectContextLoadStatus === 'loading' &&
      shouldWaitForProjectContext(messageText, Boolean(projectForTurn))
    ) {
      message.info('项目范围还在准备，涉及项目数据的问题请稍后再试');
      return;
    }
    if (
      workspaceView === 'chat' &&
      projectContextLoadStatus === 'failed' &&
      shouldWaitForProjectContext(messageText, Boolean(projectForTurn))
    ) {
      message.info(projectContextLoadStatus === 'failed'
        ? '项目范围加载失败，请刷新或重新选择项目'
        : '当前信息还在准备，请稍后再试');
      return;
    }
    const committedAttachmentIds = attachments
      .filter((attachment) => attachment.status === 'parsed')
      .map((attachment) => attachment.id)
      .filter((id) => !id.startsWith('att-local-'));
    if (!messageText && !openedAsset && referencedAssets.length === 0 && committedAttachmentIds.length === 0) {
      message.info('请先输入内容或添加文件');
      return;
    }

    if (resolvedExplicitProject) {
      setCurrentProjectId(resolvedExplicitProject.appId ?? null);
      setCurrentProject(resolvedExplicitProject);
      setProjectContextText(buildProjectContextText(resolvedExplicitProject));
      setProjectContextLoadStatus('ready');
    }

    setSourcePanelPayload(null);
    setSourcePanelMessageId(null);
    setActiveSidePanel(null);
    setRightPanelCollapsed(false);
    setRightPanelDismissed(true);
    setResultRecommendations([]);

    if (openedAsset) {
      const conversation = await createConversation(`关于${openedAsset.title}`);
      switchWorkspaceView('chat');
      setReferencedAssets([]);
      setOpenedAsset(null);
      sendMessage(`[引用资产] ${getAssetFileName(openedAsset)}（${openedAsset.format}）\n\n${messageText || '请结合此文件继续处理。'}`, conversation.conversation_id, {
        projectContext: resolvedExplicitProject ? projectContextForTurn : projectContextText,
        currentProject: resolvedExplicitProject || currentProject,
        projectLoadStatus: projectContextLoadStatus,
      });
      return;
    }

    switchWorkspaceView('chat');
    const assetPrefix = referencedAssets.length > 0
      ? `${referencedAssets.map((asset) => `[引用资产] ${asset.title}（${asset.format}）`).join('\n')}\n\n`
      : '';
    const attachmentPrefix = attachments.length > 0
      ? `${attachments
        .filter((attachment) => attachment.status === 'parsed')
        .map((attachment) => `[引用附件] ${attachment.name}：${attachment.summary || '已解析'} `)
        .join('\n')}\n\n`
      : '';
    sendMessage(`${assetPrefix}${attachmentPrefix}${messageText || '请结合这些资料继续处理。'}`, undefined, {
      projectContext: resolvedExplicitProject ? projectContextForTurn : projectContextText,
      currentProject: resolvedExplicitProject || currentProject,
      projectLoadStatus: projectContextLoadStatus,
      attachmentIds: committedAttachmentIds,
    });
    if (committedAttachmentIds.length > 0) {
      replaceAttachments(attachments.filter((attachment) => !committedAttachmentIds.includes(attachment.id)));
      window.setTimeout(() => {
        void reloadUploadedAssets();
      }, 600);
    }
    setReferencedAssets([]);
  }, [attachments, createConversation, currentProject, openedAsset, projectContextLoadStatus, projectContextText, referencedAssets, reloadUploadedAssets, replaceAttachments, sendMessage, switchWorkspaceView, workspaceView]);

  const renderRightPanel = () => {
    if (workspaceView !== 'chat') return null;

    const collapsedRail = (title: string, onClose?: () => void, showExpand = true) => (
      <aside
        className="flex w-[52px] flex-shrink-0 flex-col items-center"
        style={{ background: 'transparent', padding: '12px 8px' }}
      >
        {showExpand && (
          <button
            type="button"
            onClick={() => setRightPanelCollapsed(false)}
            className="right-panel-icon-button"
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              border: 'none',
              background: 'transparent',
              color: c.textSecondary,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title={`展开${title}`}
            aria-label={`展开${title}`}
          >
            <IconAsset name="sidebar" size={18} />
          </button>
        )}
        <div
          style={{
            marginTop: 12,
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            fontSize: 12,
            color: c.textMuted,
            letterSpacing: 0,
          }}
        >
          {title}
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="right-panel-icon-button"
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              border: 'none',
              background: 'transparent',
              color: c.textSecondary,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 'auto',
            }}
            title={`关闭${title}`}
            aria-label={`关闭${title}`}
          >
            <X size={18} />
          </button>
        )}
      </aside>
    );

    const collapseButton = (label = '收起右侧栏') => (
      <button
        type="button"
        onClick={() => setRightPanelCollapsed(true)}
        className="right-panel-icon-button"
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          border: 'none',
          background: 'transparent',
          color: c.textSecondary,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        title={label}
        aria-label={label}
      >
        <IconAsset name="sidebar" size={18} />
      </button>
    );

    const closeButton = (onClick: () => void, label = '关闭') => (
      <button
        type="button"
        onClick={onClick}
        className="right-panel-icon-button"
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          border: 'none',
          background: 'transparent',
          color: c.textSecondary,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        title={label}
        aria-label={label}
      >
        <X size={18} />
      </button>
    );

    const rightPanelClassName = 'right-side-panel flex flex-shrink-0 flex-col';
    const rightPanelExpandedStyle = isMobile
      ? { width: undefined, flexBasis: undefined, maxWidth: undefined, height: undefined, maxHeight: undefined }
      : { width: '36%', flexBasis: '36%', maxWidth: '60vw', height: undefined, maxHeight: undefined };
    const rightPanelExecutionExpandedStyle = isMobile
      ? rightPanelExpandedStyle
      : { width: 380, flexBasis: 380, maxWidth: 380, height: undefined, maxHeight: undefined };
    const rightPanelWideExpandedStyle = isMobile
      ? { width: undefined, flexBasis: undefined, maxWidth: undefined, height: undefined, maxHeight: undefined }
      : { width: '56%', flexBasis: '56%', maxWidth: '72vw', height: undefined, maxHeight: undefined };
    const rightPanelBodyStyle = {
      flex: 1,
      minWidth: 0,
      overflow: 'auto',
      overflowX: 'auto',
      padding: 16,
      wordBreak: 'break-word',
      overflowWrap: 'anywhere',
    } as const;

    const activeWorkflowResult = activeResult && typeof activeResult === 'object' && 'structured_payload' in activeResult
      ? activeResult as WorkflowResult
      : null;
    const activeWorkflowMissingFields = activeWorkflowResult
      ? (missingFields.length > 0 ? missingFields : getResultMissingFields(activeWorkflowResult))
      : missingFields;

    if (workspaceView === 'chat' && !rightPanelDismissed && !sourcePanelPayload && !activeSidePanel && activeWorkflowResult) {
      if (rightPanelCollapsed) {
        return collapsedRail('结果');
      }

      return (
        <aside
          className={rightPanelClassName}
          style={{
            ...rightPanelExpandedStyle,
            background: 'transparent',
            position: 'relative',
          }}
        >
          <div style={{ position: 'absolute', top: 10, right: 12, zIndex: 1 }}>
            {collapseButton()}
          </div>
          <div style={{ padding: '14px 16px 10px' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: c.textPrimary }}>
              当前结果
              </div>
              <div style={{ marginTop: 4, fontSize: 12, color: c.textMuted, lineHeight: 1.6 }}>
              这里承接当前会话的结论、证据和下一步。
              </div>
            </div>
            <div style={rightPanelBodyStyle}>
              <ResultPanel
                result={activeWorkflowResult}
                attachments={attachments}
                missingFields={activeWorkflowMissingFields}
                onMissingFieldClick={(field) => handleFollowUpClick(field.suggested_question)}
                onFollowUpClick={(question) => setComposerDraft(question)}
                onUpgradeWorkflow={(target) => setComposerDraft(target)}
              />
            </div>
          </aside>
      );
    }

    if (showSourcePanel) {
      const capabilityDetails = sourcePanelPayload?.capability;
      const isDebugLog = capabilityDetails?.kind === 'debug_log';
      const panelTitle = '运行过程';
      const floatingDisclosurePanel = isCompactLayout;

      return (
        <>
          {floatingDisclosurePanel && (
            <div
              onClick={closeRightPanel}
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 79,
                background: 'transparent',
              }}
            />
          )}
          <aside
            className={`${rightPanelClassName} ${floatingDisclosurePanel ? 'fixed z-40' : ''}`}
            style={{
              background: floatingDisclosurePanel ? c.bgCard : 'transparent',
              ...(floatingDisclosurePanel ? {} : rightPanelExecutionExpandedStyle),
              position: floatingDisclosurePanel ? 'fixed' : undefined,
              flexGrow: floatingDisclosurePanel ? 0 : undefined,
              flexBasis: floatingDisclosurePanel ? undefined : rightPanelExecutionExpandedStyle.flexBasis,
              flexShrink: floatingDisclosurePanel ? 0 : undefined,
              top: floatingDisclosurePanel ? 0 : undefined,
              right: floatingDisclosurePanel ? 0 : undefined,
              bottom: floatingDisclosurePanel ? 0 : undefined,
              left: floatingDisclosurePanel ? undefined : undefined,
              width: floatingDisclosurePanel ? 'min(380px, 92vw)' : rightPanelExecutionExpandedStyle.width,
              maxWidth: floatingDisclosurePanel ? '92vw' : rightPanelExecutionExpandedStyle.maxWidth,
              height: floatingDisclosurePanel ? undefined : undefined,
              maxHeight: floatingDisclosurePanel ? undefined : undefined,
              borderRadius: floatingDisclosurePanel ? 0 : undefined,
              borderLeft: '0.5px solid rgba(148, 163, 184, 0.28)',
              boxShadow: floatingDisclosurePanel ? '-18px 0 48px rgba(15, 23, 42, 0.18)' : undefined,
              zIndex: floatingDisclosurePanel ? 80 : undefined,
            }}
          >
            <div
              style={{
                padding: '14px 16px 10px',
                background: 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                borderBottom: '0.5px solid rgba(148, 163, 184, 0.28)',
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: c.textPrimary }}>{panelTitle}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                {closeButton(closeRightPanel)}
              </div>
            </div>

            <div style={rightPanelBodyStyle}>
              {disclosureView ? (
                <MessageDisclosureDrawer view={disclosureView} />
              ) : null}

              {isDebugLog && capabilityDetails?.providerUrl && (
                <div style={{ marginTop: 12, border: `1px solid ${c.borderFaint}`, borderRadius: 14, padding: 12, background: '#fff' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: c.textPrimary, marginBottom: 8 }}>联调日志</div>
                  <DebugLogPanel endpoint={capabilityDetails.providerUrl} />
                </div>
              )}
            </div>
          </aside>
        </>
      );
    }

    if (!rightPanelDismissed && currentAgent === 'demand' && activeResult?.result_type === 'demand_form') {
      const nextActions = Array.isArray(activeResult.next_actions) ? activeResult.next_actions : [];
      const pendingChecks = Array.isArray(activeResult.pending_checks) ? activeResult.pending_checks : [];
      if (rightPanelCollapsed) return collapsedRail('需求待办');
      return (
        <aside
          className={rightPanelClassName}
          style={{ ...rightPanelExpandedStyle, background: 'transparent', position: 'relative' }}
        >
          <div style={{ position: 'absolute', top: 10, right: 12, zIndex: 1 }}>
            {collapseButton()}
          </div>
          <div style={{ padding: '14px 16px 10px' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: c.textPrimary }}>需求代办</div>
            <div style={{ marginTop: 4, fontSize: 12, color: c.textMuted, lineHeight: 1.6 }}>
              选择代办后继续当前会话，补齐新增媒体对接所需资料。
            </div>
          </div>
          <div style={rightPanelBodyStyle}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[...pendingChecks, ...nextActions].map((item, index) => (
                <button
                  key={`${String(item)}-${index}`}
                  type="button"
                  onClick={() => setComposerDraft(`继续处理代办：${String(item)}`)}
                  style={{
                    textAlign: 'left',
                    borderRadius: 14,
                    border: `1px solid ${c.borderFaint}`,
                    background: c.bgSection,
                    padding: '12px',
                    color: c.textSecondary,
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, color: c.textPrimary }}>{String(item)}</div>
                  <div style={{ marginTop: 4, fontSize: 12, color: c.textMuted }}>点击后写入输入区继续补充。</div>
                </button>
              ))}
            </div>
          </div>
        </aside>
      );
    }

    if (!rightPanelDismissed && activeSidePanel && activeSidePanel !== 'debugging') {
      const panelMap: Record<string, { actions: string[] }> = {
        demand: {
          actions: ['补充需求信息', '查看需求进展', '继续当前会话'],
        },
        diagnosis: {
          actions: ['补充异常现象', '查看排查线索', '继续当前会话'],
        },
      };
      const panel = panelMap[activeSidePanel] || panelMap.demand;
      const panelTitle = chatDisplayConfig.taskPanelTitle || '任务';
      if (rightPanelCollapsed) return collapsedRail(panelTitle);
      return (
        <>
        {isMobile && (
          <div
            onClick={() => setActiveSidePanel(null)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 79,
              background: 'transparent',
            }}
          />
        )}
        <aside
          className={`${rightPanelClassName} ${isMobile ? 'fixed bottom-0 right-0 top-0 z-40' : ''}`}
          style={{
            background: isMobile ? c.bgCard : 'transparent',
            ...rightPanelExpandedStyle,
            width: isMobile ? 'min(320px, 86vw)' : rightPanelExpandedStyle.width,
            maxWidth: isMobile ? '86vw' : rightPanelExpandedStyle.maxWidth,
            boxShadow: isMobile ? '-3px 0 10px rgba(15, 23, 42, 0.08)' : undefined,
            zIndex: isMobile ? 80 : undefined,
          }}
        >
          <div style={{ padding: '14px 16px 10px', display: 'flex', gap: 12, justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: c.textPrimary }}>{panelTitle}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
              {collapseButton()}
              {closeButton(() => setActiveSidePanel(null))}
            </div>
          </div>
          <div style={rightPanelBodyStyle}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {panel.actions.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setComposerDraft(item)}
                  style={{ textAlign: 'left', borderRadius: 14, border: `1px solid ${c.borderFaint}`, background: c.bgSection, padding: '12px', color: c.textSecondary, cursor: 'pointer' }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, color: c.textPrimary }}>{item}</div>
                </button>
              ))}
            </div>
          </div>
        </aside>
        </>
      );
    }

    return null;
  };


  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: workspaceView === 'chat' && visibleMessages.length > 0 ? '#fff' : CHAT_WORKSPACE_BACKGROUND }}
    >
      {!isCompactLayout && (
        <TaskSidebar
          defaultCollapsed={false}
          conversations={conversations}
          activeConversationId={sharedConversationId ? null : activeConversationId}
          runningConversationIds={runningConversationIds}
          onCreateConversation={() => {
            clearSharedConversationMode();
            switchWorkspaceView('chat');
            return handleCreateConversationRequest();
          }}
          onSelectConversation={(conversationId) => {
            clearSharedConversationMode();
            switchWorkspaceView('chat');
            selectConversation(conversationId);
          }}
          onRenameConversation={renameConversation}
          onDeleteConversation={(conversationId) => void deleteConversation(conversationId)}
          onShareConversation={(conversation) => {
            void handleShareConversationLink(conversation.conversation_id, conversation.title);
          }}
          onOpenAssetCenter={() => {
            clearSharedConversationMode();
            setSelectedAssetIds(referencedAssets.map((asset) => asset.id));
            switchWorkspaceView('assets');
          }}
          onOpenAutomationCenter={() => {
            clearSharedConversationMode();
            switchWorkspaceView('automation');
            setAutomationTab('configured');
          }}
          onOpenPersonalKnowledgeConfig={openPersonalKnowledgeConfig}
          onOpenSearch={() => setSearchOpen(true)}
          automationUnreadCount={automationUnreadCount}
        />
      )}

      {isCompactLayout && sidebarDrawerOpen && (
        <>
          <div
            onClick={closeSidebarDrawer}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'transparent',
              zIndex: 30,
              opacity: sidebarDrawerVisible ? 1 : 0,
              transition: 'opacity 420ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          />
          <div
            style={{
              position: 'fixed',
              left: 0,
              top: 0,
              bottom: 0,
              zIndex: 31,
              width: 248,
              maxWidth: '88vw',
              borderRight: '1px solid #dbe4f0',
              boxShadow: '3px 0 10px rgba(15, 23, 42, 0.08)',
              transform: sidebarDrawerVisible ? 'translateX(0)' : 'translateX(-100%)',
              transition: 'transform 420ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            <TaskSidebar
              floating
              defaultCollapsed={false}
              conversations={conversations}
              activeConversationId={sharedConversationId ? null : activeConversationId}
              runningConversationIds={runningConversationIds}
              onCreateConversation={async () => {
                clearSharedConversationMode();
                switchWorkspaceView('chat');
                closeSidebarDrawer();
                await handleCreateConversationRequest();
              }}
              onSelectConversation={(conversationId) => {
                clearSharedConversationMode();
                switchWorkspaceView('chat');
                closeSidebarDrawer();
                selectConversation(conversationId);
              }}
              onRenameConversation={renameConversation}
              onDeleteConversation={(conversationId) => void deleteConversation(conversationId)}
              onShareConversation={(conversation) => {
                void handleShareConversationLink(conversation.conversation_id, conversation.title);
              }}
              onOpenAssetCenter={() => {
                clearSharedConversationMode();
                setSelectedAssetIds(referencedAssets.map((asset) => asset.id));
                switchWorkspaceView('assets');
                closeSidebarDrawer();
              }}
              onOpenAutomationCenter={() => {
                clearSharedConversationMode();
                switchWorkspaceView('automation');
                setAutomationTab('configured');
                closeSidebarDrawer();
              }}
              onOpenPersonalKnowledgeConfig={() => {
                openPersonalKnowledgeConfig();
                closeSidebarDrawer();
              }}
              onOpenSearch={() => setSearchOpen(true)}
              automationUnreadCount={automationUnreadCount}
              onCloseFloating={closeSidebarDrawer}
            />
          </div>
        </>
      )}

      <div className="relative flex min-w-0 flex-1 flex-col">
        <div
          className="xiaoqiao-chat-workspace-bg relative flex min-h-0 flex-1 overflow-hidden"
          style={{ background: 'transparent' }}
        >
          <div className="flex min-w-0 flex-1 flex-col">
              <div
                className="relative flex flex-1 flex-col overflow-hidden"
                style={{ padding: isMobile ? '10px 0 8px' : '16px 0 0' }}
              >
              <div
                style={{
                  width: '100%',
                  padding: `0 ${pageSidePadding}px 12px`,
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '40px minmax(0, 1fr) auto' : 'minmax(0, 1fr) auto',
                  alignItems: 'center',
                  gap: 16,
                  position: 'relative',
                }}
              >
                <div
                  className="flex min-w-0 items-center gap-3"
                  style={{
                    height: 36,
                    alignItems: 'center',
                    minWidth: 0,
                    overflow: 'hidden',
                  }}
                >
                  {isCompactLayout && (
                    <button
                      type="button"
                      onClick={() => setSidebarDrawerOpen(true)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 36,
                        height: 36,
                        borderRadius: 12,
                        border: 'none',
                        background: 'transparent',
                        color: c.textSecondary,
                        cursor: 'pointer',
                        flexShrink: 0,
                        position: 'relative',
                      }}
                      title="打开侧边栏"
                      aria-label="打开侧边栏"
                    >
                      <IconAsset name="collapse" size={18} />
                      {hasRunningConversation && (
                        <span
                          aria-hidden="true"
                          style={{
                            position: 'absolute',
                            right: 7,
                            top: 7,
                            width: 7,
                            height: 7,
                            borderRadius: 999,
                            border: '1px solid #fff',
                            background: '#2e75FE',
                            boxShadow: '0 0 0 2px rgba(46,117,254,0.14)',
                          }}
                        />
                      )}
                    </button>
                  )}
                  <div
                    style={{
                      minWidth: 0,
                      flex: '1 1 auto',
                      maxWidth: '100%',
                      display: isMobile ? 'none' : 'block',
                      height: 36,
                      lineHeight: '36px',
                      fontSize: 16,
                      fontWeight: 600,
                      color: c.textPrimary,
                      letterSpacing: 0,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {topBarTitle}
                  </div>
                </div>

                <div style={{ minWidth: 0, display: isMobile ? 'block' : 'none' }} />

                {!sharedConversationId && (
                  <div
                    className="flex items-center justify-end gap-2"
                    style={{
                      position: isMobile ? 'absolute' : 'static',
                      left: isMobile ? 58 : undefined,
                      right: pageSidePadding,
                      top: 0,
                      minWidth: isMobile ? 0 : 'max-content',
                      maxWidth: isMobile ? `calc(100% - ${pageSidePadding + 58}px)` : undefined,
                      zIndex: sidebarDrawerOpen ? 20 : 60,
                    }}
                  >
                    {workspaceView === 'chat' ? (
                      <ProjectSelectorCombo
                        selectedProjectId={currentProjectId}
                        onContextChange={setProjectContextText}
                        onProjectLoadStateChange={(state) => {
                          setProjectContextLoadStatus(state.status);
                          setProjectContextText(state.contextText);
                          setCurrentProject(state.currentProject);
                          setCurrentProjectId(state.currentProject?.appId ?? null);
                        }}
                      />
                    ) : null}

                    {workspaceView === 'chat' && isCompactLayout && (
                      <button
                        type="button"
                        onClick={handleCreateConversationRequest}
                        className="topbar-icon-button"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 34,
                          height: 36,
                          borderRadius: 999,
                          border: 'none',
                          background: 'transparent',
                          color: 'rgb(140, 155, 175)',
                          cursor: 'pointer',
                          flexShrink: 0,
                        }}
                        title="开启新对话"
                      >
                        <IconAsset name="plus-circle" size={18} />
                      </button>
                    )}

                    {workspaceView === 'chat' && messages.length > 0 && (
                      <Dropdown menu={{ items: shareMenuItems }} trigger={['click']} placement="bottomRight">
                        <button
                          type="button"
                          className="topbar-icon-button"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 34,
                            height: 36,
                            borderRadius: 999,
                            border: 'none',
                            background: 'transparent',
                            color: 'rgb(140, 155, 175)',
                            cursor: 'pointer',
                            flexShrink: 0,
                          }}
                          title="分享会话"
                        >
                          <SharePlaneIcon size={17} />
                        </button>
                      </Dropdown>
                    )}
                  </div>
                )}
              </div>

              {workspaceView === 'assets' ? (
                <AssetsCenter
                  isMobile={isMobile}
                  pageSidePadding={pageSidePadding}
                  themeColors={{
                    textPrimary: c.textPrimary,
                    textSecondary: c.textSecondary,
                    textMuted: c.textMuted,
                    accent: c.accent,
                  }}
                  assetSearch={assetSearch}
                  setAssetSearch={setAssetSearch}
                  selectedAssets={selectedAssets}
                  applySelectedAssets={applySelectedAssets}
                  handleDownloadAssets={handleDownloadAssets}
                  handleDeleteAssets={handleDeleteAssets}
                  assetSourceFilter={assetSourceFilter}
                  setAssetSourceFilter={setAssetSourceFilter}
                  assetFormatFilter={assetFormatFilter}
                  setAssetFormatFilter={setAssetFormatFilter}
                  assetUploadInputRef={assetUploadInputRef}
                  switchWorkspaceView={switchWorkspaceView}
                  handleUploadFiles={handleUploadFiles}
                  filteredAssets={filteredAssets}
                  selectedAssetIds={selectedAssetIds}
                  setSelectedAssetIds={setSelectedAssetIds}
                  hoveredAssetId={hoveredAssetId}
                  setHoveredAssetId={setHoveredAssetId}
                  handleLocateAsset={handleLocateAsset}
                  handleConfirmDeleteAsset={handleConfirmDeleteAsset}
                  setOpenedAsset={setOpenedAsset}
                />
              ) : workspaceView === 'automation' ? (
                <AutomationCenter
                  isMobile={isMobile}
                  pageSidePadding={pageSidePadding}
                  themeColors={{
                    textPrimary: c.textPrimary,
                    textSecondary: c.textSecondary,
                    textMuted: c.textMuted,
                  }}
                  automationTab={automationTab}
                  setAutomationTab={setAutomationTab}
                  automationLoading={automationLoading}
                  automationReportTasks={automationReportTasks}
                  automationRunRecords={automationRunRecords}
                  availableAutomationTemplates={availableAutomationTemplates}
                  setOpenedAutomationRun={setOpenedAutomationRun}
                  handleRunAutomationTask={handleRunAutomationTask}
                  handleResumeAutomationTask={handleResumeAutomationTask}
                  handlePauseAutomationTask={handlePauseAutomationTask}
                  handleEditAutomationTask={handleEditAutomationTask}
                  handleOpenAutomationCreateFromResult={handleOpenAutomationCreateFromResult}
                  handleCreateAutomationInChat={handleCreateAutomationInChat}
                  handleOpenManualAutomationCreate={handleOpenManualAutomationCreate}
                  handleOpenAutomationTemplate={handleOpenAutomationTemplate}
                />
              ) : (
                <>
                  {sharedConversationId && (
                    <div style={{ width: '100%', padding: `0 ${pageSidePadding}px 8px` }}>
                      <div
                        style={{
                          maxWidth: 900,
                          margin: '0 auto',
                          fontSize: 12.5,
                          color: sharedConversationBlocked ? '#9a3412' : c.textMuted,
                          lineHeight: '18px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {sharedConversationLoading
                          ? '正在打开共享对话...'
                          : sharedConversationBlocked
                            ? '没有该项目权限，无法查看该会话内容。'
                            : '这是已分享的 小乔智投 对话副本'}
                      </div>
                    </div>
                  )}

                  {sharedConversationId && sharedConversationLoading ? (
                    <SharedConversationLoadingPanel isMobile={isMobile} pageSidePadding={pageSidePadding} />
                  ) : (
                    <ChatContainer
                      messages={sharedConversationId ? sharedConversationMessages : messages}
                      isTyping={sharedConversationId ? false : (isTyping || isLoadingMessages)}
                      isStreaming={sharedConversationId ? false : isTyping}
                      devMode={false}
                      onFollowUpClick={sharedConversationId ? undefined : handleFollowUpClick}
                      onViewCallChain={() => undefined}
                      onOpenSourcePanel={(payload) => {
                        const messageId = payload.message.message_id || payload.message.id || null;
                        if (sourcePanelPayload && sourcePanelMessageId === messageId) {
                          setSourcePanelMessageId(null);
                          setSourcePanelPayload(null);
                          return;
                        }
                        setSourcePanelMessageId(messageId);
                        setSourcePanelPayload(payload);
                        setActiveSidePanel(null);
                        setRightPanelCollapsed(false);
                        setRightPanelDismissed(false);
                      }}
                      onEditUserMessage={sharedConversationId ? undefined : (content) => {
                        void handleSendWithAssets(content).catch(() => {
                          message.error('重新发送失败，请稍后重试');
                        });
                      }}
                  onSubmitFollowUp={sharedConversationId ? undefined : (content) => {
                        void handleSendWithAssets(content).catch(() => {
                          message.error('发送失败，请稍后重试');
                        });
                      }}
                      onStopGeneration={sharedConversationId ? undefined : cancelStream}
                      contextThinkingSteps={sharedConversationId ? [] : contextThinkingSteps}
                      currentResult={sharedConversationId ? null : (activeResult as WorkflowResult | Record<string, unknown> | null)}
                      chatSettings={chatSettings}
                      onToggleSystemPrompt={sharedConversationId ? undefined : (() => setShowSystemPrompt((prev) => !prev))}
                      showSystemPrompt={sharedConversationId ? false : showSystemPrompt}
                      systemPrompt=""
                      onOpenAgentPanel={sharedConversationId ? undefined : handleOpenAgentPanel}
                      onShareConversation={sharedConversationId ? undefined : handleShareConversationLink}
                      currentConversationTitle={sharedConversationId ? (sharedConversationTitle || '已分享的对话') : (activeConversation?.title || '当前会话')}
                      conversationKey={sharedConversationId || activeConversationId || null}
                      chatDisplayConfig={chatDisplayConfig}
                      onResultRecommendationsChange={sharedConversationId ? undefined : setResultRecommendations}
                    />
                  )}
                </>
              )}
              <OpenedAssetPreview openedAsset={openedAsset} setOpenedAsset={setOpenedAsset} />
            </div>

            {!sharedConversationId && (workspaceView === 'chat' || openedAsset) && (
              showCenteredComposer ? (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: isMobile ? 'flex-end' : 'center',
                    justifyContent: 'center',
                    width: '100%',
                    height: '100%',
                    padding: isMobile ? '0 18px 20px' : '0 32px',
                    pointerEvents: 'none',
                    zIndex: 8,
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      maxWidth: isMobile ? '100%' : 776,
                      pointerEvents: 'auto',
                    }}
                  >
                    <InputArea
                      onSend={handleSendWithAssets}
                      onStopGeneration={cancelStream}
                      currentAgent={currentAgent}
                      onAgentChange={handleAgentChange}
                      disabled={false}
                      statusHint={workspaceView === 'chat' && projectContextLoadStatus === 'failed'
                        ? {
                          type: 'error',
                          text: '项目范围加载失败，请刷新或重新选择项目。',
                        }
                        : undefined}
                      isSending={isTyping || isCurrentConversationRunning}
                      onOpenAgentPanel={handleOpenAgentPanel}
                      onToggleAutoSpeak={handleToggleAutoSpeak}
                      autoSpeakEnabled={autoSpeakEnabled || speaking}
                      onFileUpload={(files, sourceType = 'click') => handleUploadFiles(files, sourceType)}
                      longTextThreshold={2000}
                      placeholder={
                        attachments.length > 0
                          ? '输入提示语，我会结合文件继续处理'
                          : openedAsset
                            ? '询问关于此文件的问题'
                            : isMobile
                              ? '发消息或按住说话'
                              : '输入问题、需求或操作任务'
                      }
                      hideAgentOptions
                      referencedAssets={referencedAssets.map((asset) => ({
                        id: asset.id,
                        title: asset.title,
                        type: asset.format,
                      }))}
                      onRemoveReferencedAsset={(assetId) => {
                        setReferencedAssets((prev) => prev.filter((asset) => asset.id !== assetId));
                      }}
                      draftValue={composerDraft}
                      onDraftConsumed={() => setComposerDraft('')}
                      resultRecommendations={resultRecommendations}
                      showRecommendations={workspaceView === 'chat'}
                      recommendationConversationId={activeConversationId || undefined}
                      recommendationActiveAgent={currentAgent}
                      recommendationProjectContext={projectContextText}
                      attachments={attachments}
                      onRemoveAttachment={handleRemoveAttachment}
                      onRetryAttachment={handleRetryAttachment}
                      onPreviewAttachment={(attachment) => message.info(attachment.summary || attachment.name)}
                    />
                    <div style={{ marginTop: 14 }}>
                      <QuickChipsRow
                        starterItems={activeStarterItems}
                        onOpenAgentPanel={handleOpenAgentPanel}
                        onFollowUpClick={handleFollowUpClick}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    position: 'relative',
                    zIndex: 8,
                    padding: isMobile ? '10px 18px calc(env(safe-area-inset-bottom, 0px) + 12px)' : '12px 18px 18px',
                    flexShrink: 0,
                  }}
                >
                  <div style={{ width: '100%', maxWidth: isMobile ? '100%' : 776, margin: '0 auto' }}>
                    <InputArea
                      onSend={handleSendWithAssets}
                      onStopGeneration={cancelStream}
                      currentAgent={currentAgent}
                      onAgentChange={handleAgentChange}
                      disabled={false}
                      statusHint={workspaceView === 'chat' && projectContextLoadStatus === 'failed'
                        ? {
                          type: 'error',
                          text: '项目范围加载失败，请刷新或重新选择项目。',
                        }
                        : undefined}
                      isSending={isTyping || isCurrentConversationRunning}
                      onOpenAgentPanel={handleOpenAgentPanel}
                      onToggleAutoSpeak={handleToggleAutoSpeak}
                      autoSpeakEnabled={autoSpeakEnabled || speaking}
                      onFileUpload={(files, sourceType = 'click') => handleUploadFiles(files, sourceType)}
                      longTextThreshold={2000}
                      placeholder={
                        attachments.length > 0
                          ? '输入提示语，我会结合文件继续处理'
                          : openedAsset
                            ? '询问关于此文件的问题'
                            : isMobile
                              ? '发消息或按住说话'
                              : '输入问题、需求或操作任务'
                      }
                      hideAgentOptions
                      referencedAssets={referencedAssets.map((asset) => ({
                        id: asset.id,
                        title: asset.title,
                        type: asset.format,
                      }))}
                      onRemoveReferencedAsset={(assetId) => {
                        setReferencedAssets((prev) => prev.filter((asset) => asset.id !== assetId));
                      }}
                      draftValue={composerDraft}
                      onDraftConsumed={() => setComposerDraft('')}
                      resultRecommendations={resultRecommendations}
                      showRecommendations={workspaceView === 'chat'}
                      recommendationConversationId={activeConversationId || undefined}
                      recommendationActiveAgent={currentAgent}
                      recommendationProjectContext={projectContextText}
                      attachments={attachments}
                      onRemoveAttachment={handleRemoveAttachment}
                      onRetryAttachment={handleRetryAttachment}
                      onPreviewAttachment={(attachment) => message.info(attachment.summary || attachment.name)}
                    />
                    {showCenteredComposer && (
                      <div style={{ marginTop: 14 }}>
                        <QuickChipsRow
                          starterItems={activeStarterItems}
                          onOpenAgentPanel={handleOpenAgentPanel}
                          onFollowUpClick={handleFollowUpClick}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )
            )}
          </div>

          {renderRightPanel()}
        </div>
      </div>

      {/* 底部提示语 - 固定在页面底部 */}
      {!isMobile && (
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: isCompactLayout ? 0 : 248,
          right: 0,
          padding: '10px 0',
          textAlign: 'center',
          fontSize: 11,
          color: '#A7ACBD',
          background: 'transparent',
          zIndex: 10,
          pointerEvents: 'none',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: '2px 10px', pointerEvents: 'auto' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#A7ACBD', whiteSpace: 'nowrap' }}>
            <span
              aria-hidden="true"
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: modelRuntimeStatus.connected ? '#22c55e' : '#94a3b8',
                boxShadow: modelRuntimeStatus.connected
                  ? '0 0 0 0 rgba(34, 197, 94, 0.45)'
                  : 'none',
                animation: modelRuntimeStatus.loading ? 'pulse 1.6s ease-in-out infinite' : 'none',
              }}
            />
            <span>
              {modelRuntimeStatus.loading
                ? '大模型检测中'
                : modelRuntimeStatus.connected
                  ? modelRuntimeStatus.modelName
                  : '大模型未接通'}
            </span>
          </span>
          <span style={{ color: '#C0C4D1', whiteSpace: 'nowrap' }}>保护用户隐私和公司数据是员工责任，禁止向无权限者提供敏感信息。</span>
        </div>
      </div>
      )}

      <ContextEditDrawer
        open={showContextDrawer}
        taskContext={activeTaskContext}
        missingFields={missingFields}
        onClose={() => setShowContextDrawer(false)}
        onSave={handleContextSave}
      />
      <AutomationModals
        isMobile={isMobile}
        themeColors={{
          textPrimary: c.textPrimary,
          textSecondary: c.textSecondary,
          textMuted: c.textMuted,
        }}
        openedAutomationRun={openedAutomationRun}
        setOpenedAutomationRun={setOpenedAutomationRun}
        handleCopyAutomationRun={handleCopyAutomationRun}
        handleRetryAutomationRun={handleRetryAutomationRun}
        editingAutomationTask={editingAutomationTask}
        creatingAutomationTask={creatingAutomationTask}
        setEditingAutomationTask={setEditingAutomationTask}
        setCreatingAutomationTask={setCreatingAutomationTask}
        automationTaskDraft={automationTaskDraft}
        setAutomationTaskDraft={setAutomationTaskDraft}
        automationTemplates={automationTemplates}
        handleCreateAutomationTask={handleSaveAutomationTask}
        handleUpdateAutomationTask={handleSaveAutomationTask}
      />

      <Modal
        open={personalKnowledgeOpen}
        onCancel={() => setPersonalKnowledgeOpen(false)}
        title="个人知识库"
        footer={null}
        centered
        width={520}
        destroyOnHidden
      >
        <div style={{ paddingTop: 6 }}>
          <p style={{ margin: 0, color: c.textSecondary, fontSize: 13, lineHeight: 1.8 }}>
            已内置个人知识库，访问地址：dataki.dobest.com
          </p>

          <div style={{ marginTop: 16, borderRadius: 14, background: '#f8fafc', border: `1px solid ${c.borderFaint}`, padding: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: c.textPrimary }}>已内置个人知识库</div>
            <div style={{ marginTop: 6, fontSize: 12, color: c.textMuted, lineHeight: 1.7 }}>
              访问地址：dataki.dobest.com
            </div>
            <button
              type="button"
              onClick={() => window.open(personalKnowledgeAccessUrl, '_blank', 'noopener,noreferrer')}
              style={{ marginTop: 14, height: 34, border: 'none', borderRadius: 10, background: '#111827', color: '#fff', padding: '0 13px', fontSize: 13, cursor: 'pointer' }}
            >
              打开个人知识库
            </button>
          </div>

          {personalKnowledgeMessage && (
            <div
              style={{
                marginTop: 14,
                borderRadius: 12,
                background: personalKnowledgeStatus === 'failed' ? '#fff1f0' : '#f0fdf4',
                border: `1px solid ${personalKnowledgeStatus === 'failed' ? '#ffd8d3' : '#bbf7d0'}`,
                color: personalKnowledgeStatus === 'failed' ? '#b42318' : '#047857',
                padding: '9px 12px',
                fontSize: 12,
                lineHeight: 1.6,
              }}
            >
              {personalKnowledgeMessage}
            </div>
          )}
        </div>
      </Modal>

      <Modal
        open={searchOpen}
        onCancel={() => setSearchOpen(false)}
        footer={null}
        width={640}
        title="搜索历史记录"
        centered
        destroyOnHidden
      >
        <div style={{ paddingTop: 8 }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              height: 42,
              borderRadius: 12,
              border: `1px solid ${c.borderFaint}`,
              background: '#fff',
              padding: '0 12px',
              color: c.textMuted,
            }}
          >
            <Search size={16} />
            <input
              id="conversation-search-input"
              name="conversation_search"
              autoFocus
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="搜索对话内容"
              style={{
                width: '100%',
                minWidth: 0,
                border: 'none',
                outline: 'none',
                background: 'transparent',
                color: c.textPrimary,
                fontSize: 14,
              }}
            />
          </label>

          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 360, overflow: 'auto' }}>
            {searchLoading ? (
              <div style={{ borderRadius: 12, background: c.bgSection, padding: 18, color: c.textMuted, fontSize: 13 }}>
                正在查找相关记录…
              </div>
            ) : searchQuery.trim() && searchResults.length === 0 ? (
              <div style={{ borderRadius: 12, background: c.bgSection, padding: 18, color: c.textMuted, fontSize: 13 }}>
                没有找到相关记录，可以换一个关键词试试。
              </div>
            ) : !searchQuery.trim() ? (
              <div style={{ borderRadius: 12, background: c.bgSection, padding: 18, color: c.textMuted, fontSize: 13 }}>
                搜索过往对话、资料名称和处理结果，找到后可直接继续查看。
              </div>
            ) : searchResults.map((item) => (
              <button
                key={item.conversation_id}
                type="button"
                onClick={() => {
                  selectConversation(item.conversation_id);
                  switchWorkspaceView('chat');
                  setSearchOpen(false);
                }}
                style={{
                  width: '100%',
                  borderRadius: 12,
                  border: `1px solid ${c.borderFaint}`,
                  background: '#fff',
                  padding: '12px 14px',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 14, fontWeight: 600, color: c.textPrimary }}>
                    {item.title}
                  </div>
                  <div style={{ flexShrink: 0, fontSize: 12, color: c.textMuted }}>{item.matchCount} 处匹配</div>
                </div>
                <div style={{ marginTop: 6, fontSize: 12, lineHeight: 1.6, color: c.textMuted }}>
                  {item.snippets[0] || '打开查看完整记录'}
                </div>
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function Home() {
  return (
    <AuthProvider>
      <AgentProvider>
        <WorkspaceContent />
      </AgentProvider>
    </AuthProvider>
  );
}

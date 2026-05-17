'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dropdown, Input, Modal, message, type MenuProps } from 'antd';
import {
  CheckCircle2,
  Download,
  Ellipsis,
  FileSpreadsheet,
  FileText,
  Link2,
  MapPin,
  PanelRightClose,
  PanelRightOpen,
  PlayCircle,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { AgentProvider, useAgent } from '@/hooks/useAgent';
import { useConversation } from '@/hooks/useConversation';
import { useSpeech } from '@/hooks/useSpeech';
import ChatContainer, { type SourcePanelPayload } from '@/components/cognitive/ChatContainer';
import InputArea from '@/components/cognitive/InputArea';
import { TaskSidebar } from '@/components/workspace/TaskSidebar';
import { AutoDebugWorkbench } from '@/components/agents/AutoDebugWorkbench';
import { ContextEditDrawer } from '@/components/cognitive/ContextEditDrawer';
import { IconAsset } from '@/components/ui/IconAsset';
import FancyCodeBlock from '@/components/ui/FancyCodeBlock';
import YkProjectSelect from '@/components/yokaui/YkProjectSelect';
import { useChatSettings } from '@/hooks/useChatSettings';
import { useThemeColors } from '@/hooks/useTheme';
import { useIsMobile } from '@/hooks/use-mobile';
import type { AgentType, AttachmentRecord, Message, WorkflowResult } from '@/types';

type WorkspaceView = 'chat' | 'assets';
type AssetCategory = 'image' | 'link' | 'video' | 'file';
type AssetSourceFilter = 'all' | 'uploaded' | 'generated';
type AssetFormatFilter = 'all' | 'image' | 'document' | 'spreadsheet' | 'slides' | 'pdf';

interface AssetRecord {
  id: string;
  title: string;
  category: AssetCategory;
  format: string;
  summary: string;
  source: string;
  updatedAt: string;
  conversationId: string;
  anchorText: string;
  previewTone: string;
  previewSupported?: boolean;
  thumbnailStatus?: 'generated' | 'generating' | 'unsupported';
  thumbnailUrl?: string;
  thumbnailPrompt?: string;
}

interface ConversationSearchHit {
  conversation_id: string;
  title: string;
  updated_at: string;
  matchCount: number;
  snippets: string[];
}

interface ProjectOption {
  app_id: string | number;
  app_name: string;
  app_alias?: string;
  app_en_name?: string;
  app_status?: string | number;
  icon?: string;
  source?: string;
}

const ALL_PROJECT_VALUE = '__all__';
const NO_PROJECT_VALUE = '__none__';

function SharePlaneIcon({ size = 17 }: { size?: number }) {
  return <IconAsset name="share-plane" size={size} />;
}

const ASSET_SOURCE_FILTERS: Array<{ key: AssetSourceFilter; label: string }> = [
  { key: 'all', label: '全部来源' },
  { key: 'uploaded', label: '已上传' },
  { key: 'generated', label: '已生成' },
];

const ASSET_FORMAT_FILTERS: Array<{ key: AssetFormatFilter; label: string }> = [
  { key: 'all', label: '全部类型' },
  { key: 'image', label: '图片' },
  { key: 'document', label: '文档' },
  { key: 'spreadsheet', label: '电子表格' },
  { key: 'slides', label: '演示文稿' },
  { key: 'pdf', label: 'PDF' },
];

const ASSET_LIBRARY: AssetRecord[] = [
  {
    id: 'asset-001',
    title: '安卓回传联调说明',
    category: 'file',
    format: 'Word',
    summary: '包含回传链路、字段映射、验收口径和常见异常处理说明。',
    source: '会话沉淀',
    updatedAt: '今天',
    conversationId: 'conv_004',
    anchorText: '联调准备清单',
    previewTone: '#4f7cff',
  },
  {
    id: 'asset-002',
    title: '投放日报模板',
    category: 'file',
    format: 'Excel',
    summary: '用于汇总分媒体消耗、转化、归因和异常监控结果。',
    source: 'AI 生成',
    updatedAt: '今天',
    conversationId: 'conv_001',
    anchorText: '巨量激活报表',
    previewTone: '#16a34a',
  },
  {
    id: 'asset-003',
    title: 'SKAN 归因口径说明',
    category: 'file',
    format: 'PDF',
    summary: '沉淀版本差异、回传窗口、媒体限制和投放注意事项。',
    source: '知识沉淀',
    updatedAt: '昨天',
    conversationId: 'conv_003',
    anchorText: 'SKAN 归因口径',
    previewTone: '#ef4444',
  },
  {
    id: 'asset-004',
    title: '高价值事件素材图',
    category: 'image',
    format: 'PNG',
    summary: '用于复核埋点和投放素材是否与事件命名一致。',
    source: '上传图片',
    updatedAt: '昨天',
    conversationId: 'conv_002',
    anchorText: '高价值事件素材图',
    previewTone: '#0ea5e9',
  },
  {
    id: 'asset-005',
    title: '媒体平台排查录屏',
    category: 'video',
    format: 'MP4',
    summary: '展示异常重现过程、操作路径和控制台日志定位过程。',
    source: '会话产物',
    updatedAt: '2 天前',
    conversationId: 'conv_001',
    anchorText: '异常重现过程',
    previewTone: '#7c3aed',
  },
  {
    id: 'asset-006',
    title: '企业账户白名单入口',
    category: 'link',
    format: '链接',
    summary: '可直接进入白名单配置页，方便在会话里发起排查和复核。',
    source: '外部链接',
    updatedAt: '3 天前',
    conversationId: 'conv_005',
    anchorText: '白名单配置页',
    previewTone: '#f59e0b',
  },
  {
    id: 'asset-007',
    title: '自动联调结果归档',
    category: 'file',
    format: 'PDF',
    summary: '会话中生成的联调结论、修复建议和来源引用归档文件。',
    source: 'AI 生成',
    updatedAt: '3 天前',
    conversationId: 'conv_004',
    anchorText: '联调结论归档',
    previewTone: '#ef4444',
  },
  {
    id: 'asset-008',
    title: '渠道投放素材库',
    category: 'image',
    format: 'JPG',
    summary: '近期投放使用的素材预览和落地页截图，便于交叉核对。',
    source: '上传图片',
    updatedAt: '5 天前',
    conversationId: 'conv_002',
    anchorText: '投放素材预览',
    previewTone: '#0ea5e9',
  },
  {
    id: 'asset-009',
    title: '项目排查 SOP',
    category: 'file',
    format: 'Word',
    summary: '沉淀问题排查流程、证据要求、升级条件和结果回写规范。',
    source: '知识沉淀',
    updatedAt: '1 周前',
    conversationId: 'conv_001',
    anchorText: '排查流程',
    previewTone: '#4f7cff',
  },
  {
    id: 'asset-010',
    title: '投放监控看板',
    category: 'link',
    format: '链接',
    summary: '跳转到实时监控看板，适合在会话中引用数据和截图。',
    source: '外部链接',
    updatedAt: '1 周前',
    conversationId: 'conv_005',
    anchorText: '实时监控看板',
    previewTone: '#f59e0b',
  },
  {
    id: 'asset-011',
    title: '归因异常样例视频',
    category: 'video',
    format: 'MP4',
    summary: '典型归因偏差案例与修复前后效果对比视频。',
    source: '会话产物',
    updatedAt: '1 周前',
    conversationId: 'conv_001',
    anchorText: '归因偏差案例',
    previewTone: '#7c3aed',
  },
  {
    id: 'asset-012',
    title: '文件写入权限清单',
    category: 'file',
    format: 'Excel',
    summary: '列出当前支持写入和生成的 Word、Excel、PDF 资产范围。',
    source: '权限清单',
    updatedAt: '1 周前',
    conversationId: 'conv_002',
    anchorText: '文件写入权限',
    previewTone: '#16a34a',
  },
];

function getAssetFileName(asset: AssetRecord) {
  if (asset.format === '链接') return asset.title;
  return asset.title.includes('.') ? asset.title : `${asset.title}.${asset.format.toLowerCase()}`;
}

function getAssetTypeLabel(asset: AssetRecord) {
  if (asset.category === 'image') return '图片';
  if (asset.category === 'video') return '视频';
  if (asset.category === 'link') return '链接';
  return asset.format;
}

function isPreviewSupported(asset: AssetRecord) {
  return asset.previewSupported ?? (asset.category === 'image' || asset.category === 'video');
}

function getAssetPreview(asset: AssetRecord) {
  if ((asset.category === 'image' || asset.category === 'video') && asset.thumbnailUrl) {
    return (
      <img src={asset.thumbnailUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
    );
  }

  if (asset.category === 'image' || asset.category === 'video') {
    const status = asset.thumbnailStatus || 'generated';
    return (
      <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg, ${asset.previewTone}, ${asset.category === 'video' ? '#111827' : '#dbeafe'})`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        {asset.category === 'video' ? <PlayCircle size={18} /> : <span style={{ width: 18, height: 18, borderRadius: 6, border: '1px solid rgba(255,255,255,0.72)' }} />}
        {status === 'generating' && <span style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.36)' }} />}
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', background: '#f3f4f6', color: asset.previewTone, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {asset.category === 'link' ? <Link2 size={17} /> : asset.format === 'Excel' ? <FileSpreadsheet size={17} /> : <FileText size={17} />}
    </div>
  );
}

function getKnowledgeSourceDetails(message: Message | null): Array<{ title: string; source?: string; url?: string; prompt?: string }> {
  const meta = message?.metadata || {};
  const rawRefs = [meta.source_refs, meta.sourceRefs, meta.sources, meta.citations]
    .find((item) => Array.isArray(item)) as unknown[] | undefined;
  const refs = (rawRefs || []).map((item) => {
    if (typeof item === 'string') return { title: item };
    if (item && typeof item === 'object') {
      const obj = item as Record<string, unknown>;
      return {
        title: String(obj.title || obj.name || obj.source || obj.id || '知识库来源'),
        source: obj.source ? String(obj.source) : undefined,
        url: obj.url ? String(obj.url) : undefined,
        prompt: obj.prompt ? String(obj.prompt) : undefined,
      };
    }
    return null;
  }).filter((item): item is { title: string; source?: string; url?: string; prompt?: string } => Boolean(item));

  const knowledge = meta.knowledge_base;
  if (knowledge && typeof knowledge === 'object') {
    const obj = knowledge as Record<string, unknown>;
    refs.unshift({
      title: String(obj.provider || '知识库'),
      source: obj.dataset ? `知识库 ID：${String(obj.dataset)}` : undefined,
      url: obj.address ? String(obj.address) : undefined,
    });
  }

  return refs;
}

function WorkspaceContent() {
  const c = useThemeColors();
  const isMobile = useIsMobile();
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

  const {
    conversations,
    activeConversationId,
    messages,
    isTyping,
    sendMessage,
    createConversation,
    selectConversation,
    renameConversation,
    deleteConversation,
    currentResult,
  } = useConversation();

  const chatSettings = useChatSettings();
  const { speak, stopSpeaking, speaking, synthesisSupported } = useSpeech();

  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const [showContextDrawer, setShowContextDrawer] = useState(false);
  const [autoSpeakEnabled, setAutoSpeakEnabled] = useState(false);
  const [sourcePanelPayload, setSourcePanelPayload] = useState<SourcePanelPayload | null>(null);
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
  const [composerDraft, setComposerDraft] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<ConversationSearchHit[]>([]);
  const [activeSidePanel, setActiveSidePanel] = useState<AgentType | null>(null);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [projectOptions, setProjectOptions] = useState<ProjectOption[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | number>(NO_PROJECT_VALUE);
  const [followedProjectIds, setFollowedProjectIds] = useState<Array<string | number>>([]);
  const [projectSearch, setProjectSearch] = useState('');
  const lastSpokenMessageIdRef = useRef<string | null>(null);

  const activeResult = currentResult || agentResult;
  const showDebugPanel = false;
  const activeConversation = useMemo(
    () => conversations.find((item) => item.conversation_id === activeConversationId) || null,
    [activeConversationId, conversations],
  );
  const latestAssistantMessage = useMemo(
    () => [...messages].reverse().find((item) => item.role === 'assistant' && item.content.trim()),
    [messages],
  );
  const isCompactLayout = isMobile || viewportWidth < 1200;
  const showSourcePanel = workspaceView === 'chat' && !!sourcePanelPayload;
  const pageSidePadding = isCompactLayout ? 20 : 30;
  const isCurrentConversationEmpty = workspaceView === 'chat'
    && messages.length === 0
    && (activeConversation?.message_count || 0) === 0
    && attachments.length === 0
    && referencedAssets.length === 0
    && !currentResult;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => setViewportWidth(window.innerWidth);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const keyword = projectSearch.trim();
        const params = new URLSearchParams({
          page: '1',
          page_size: '200',
        });
        if (keyword) params.set('keyword', keyword);
        const response = await fetch(`/api/xiaoqiao/projects?${params.toString()}`, {
          signal: controller.signal,
        });
        const payload = await response.json() as { projects?: ProjectOption[]; source?: string };
        const projects = Array.isArray(payload.projects) ? payload.projects : [];
        setProjectOptions(projects.map((project) => ({ ...project, source: payload.source })));
      } catch {
        if (!controller.signal.aborted) {
          setProjectOptions([]);
        }
      }
    }, 220);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [projectSearch]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem('zhitou-chat-followed-projects');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setFollowedProjectIds(parsed.filter((item): item is string | number => (
          typeof item === 'string' || typeof item === 'number'
        )));
      }
    } catch {
      // ignore malformed local state
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('zhitou-chat-followed-projects', JSON.stringify(followedProjectIds));
  }, [followedProjectIds]);

  const selectedProject = useMemo(
    () => projectOptions.find((project) => String(project.app_id) === String(selectedProjectId)) || null,
    [projectOptions, selectedProjectId],
  );

  const visibleProjectOptions = useMemo(() => {
    const keyword = projectSearch.trim().toLowerCase();
    if (!keyword) return projectOptions;
    return projectOptions.filter((project) => {
      const fields = [
        project.app_id,
        project.app_name,
        project.app_alias,
        project.app_en_name,
      ]
        .filter((value) => value !== undefined && value !== null && String(value).trim())
        .map((value) => String(value).toLowerCase())
        .join(' ');
      return fields.includes(keyword);
    });
  }, [projectOptions, projectSearch]);

  const projectContextText = useMemo(() => {
    if (selectedProjectId === NO_PROJECT_VALUE) return '项目范围：未选择项目';
    if (selectedProjectId === ALL_PROJECT_VALUE) return '项目范围：全部项目';
    if (selectedProject) return `项目范围：${selectedProject.app_name}(APPID:${selectedProject.app_id})`;
    return '项目范围：未选择项目';
  }, [selectedProject, selectedProjectId]);

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
        const response = await fetch(`/api/xiaoqiao/conversations/search?q=${encodeURIComponent(keyword)}`);
        const data = await response.json();
        setSearchResults(Array.isArray(data) ? data : []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 220);

    return () => window.clearTimeout(timer);
  }, [searchOpen, searchQuery]);

  useEffect(() => {
    if (!activeConversationId) {
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

  const handleFollowUpClick = useCallback((question: string) => {
    setWorkspaceView('chat');
    setComposerDraft(question);
  }, []);

  const handleAgentChange = useCallback((agent: typeof currentAgent) => {
    setCurrentAgent(agent);
  }, [setCurrentAgent]);

  const handleOpenAgentPanel = useCallback((agent: AgentType) => {
    if (!['demand', 'diagnosis', 'debugging'].includes(agent)) return;
    setWorkspaceView('chat');
    setSourcePanelPayload(null);
    setCurrentAgent(agent);
    setActiveSidePanel(agent);
    setRightPanelCollapsed(false);
  }, [setCurrentAgent]);

  const handleCreateConversationRequest = useCallback(async () => {
    setWorkspaceView('chat');
    setSourcePanelPayload(null);
    setActiveSidePanel(null);
    setRightPanelCollapsed(false);
    if (isCurrentConversationEmpty) return;
    await createConversation();
  }, [createConversation, isCurrentConversationEmpty]);

  const handleUpload = useCallback(async (file: File, sourceType: 'click' | 'drag' | 'paste') => {
    const kind = file.type.startsWith('image/')
      ? 'image' as const
      : file.type.startsWith('video/')
        ? 'video' as const
      : file.name.endsWith('.pdf') || file.name.endsWith('.doc') || file.name.endsWith('.docx')
        ? 'document' as const
        : file.name.endsWith('.xls') || file.name.endsWith('.xlsx') || file.name.endsWith('.csv')
          ? 'table' as const
          : 'log' as const;

    const previewUrl = kind === 'image' || kind === 'video' ? URL.createObjectURL(file) : undefined;
    const conversationId = activeConversationId || (await createConversation()).conversation_id;
    const attachmentId = `att-local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const attachment: AttachmentRecord = {
      id: attachmentId,
      conversation_id: conversationId,
      name: file.name,
      filename: file.name,
      kind,
      type: kind,
      mime_type: file.type,
      size: file.size,
      status: 'uploading',
      source_type: sourceType,
      created_at: new Date().toISOString(),
      preview_url: previewUrl,
      url: previewUrl,
    };

    addAttachment(attachment);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('source_type', sourceType);
      const response = await fetch(`/api/xiaoqiao/conversations/${conversationId}/attachments`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      addAttachment({ ...attachment, status: 'parsing' });
      const parsed = await response.json() as AttachmentRecord;
      removeAttachment(attachmentId);
      addAttachment({
        ...parsed,
        preview_url: previewUrl || parsed.preview_url,
        url: previewUrl || parsed.url,
      });
      message.success(`${file.name} 已上传并解析`);
    } catch {
      addAttachment({
        ...attachment,
        status: 'upload_failed',
        summary: '上传失败，请重试。',
      });
      message.error(`${file.name} 上传失败`);
    }
  }, [activeConversationId, addAttachment, createConversation, removeAttachment]);

  const handleRetryAttachment = useCallback(async (attachmentId: string) => {
    const current = attachments.find((item) => item.id === attachmentId);
    if (current) addAttachment({ ...current, status: 'parsing' });

    try {
      const response = await fetch(`/api/xiaoqiao/attachments/${attachmentId}/retry`, { method: 'POST' });
      if (!response.ok) throw new Error(await response.text());
      const next = await response.json() as AttachmentRecord;
      addAttachment(next);
      message.success(`${next.name || '附件'} 已重新解析`);
    } catch {
      if (current) addAttachment({ ...current, status: 'parse_failed', summary: '重新解析失败，请稍后再试。' });
      message.error('重新解析失败');
    }
  }, [addAttachment, attachments]);

  const handleRemoveAttachment = useCallback(async (attachmentId: string) => {
    removeAttachment(attachmentId);
    await fetch(`/api/xiaoqiao/attachments/${attachmentId}`, { method: 'DELETE' }).catch(() => undefined);
  }, [removeAttachment]);

  const handleContextSave = useCallback(() => {
    // 保持既有配置链路不变。
  }, []);

  const buildSpeechText = useCallback((raw: string) => raw
    .replace(/```[\s\S]*?```/g, '代码片段已省略。')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/#+\s/g, '')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/\n{2,}/g, '。')
    .replace(/\n/g, '，')
    .trim(), []);

  const handleToggleAutoSpeak = useCallback(() => {
    setAutoSpeakEnabled((prev) => {
      const next = !prev;
      if (!next) stopSpeaking();
      return next;
    });
  }, [stopSpeaking]);

  const handleShareConversation = useCallback(async () => {
    const shareTitle = activeConversation?.title || '当前会话';
    const shareText = `${shareTitle} - 智投chat`;
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

    try {
      if (typeof navigator !== 'undefined' && navigator.share && isMobile) {
        await navigator.share({ title: shareTitle, text: shareText, url: shareUrl });
        return;
      }

      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(`${shareTitle}\n${shareUrl}`);
        message.success('会话链接已复制');
        return;
      }

      message.info('当前环境暂不支持分享');
    } catch {
      message.error('分享失败，请稍后重试');
    }
  }, [activeConversation?.title, isMobile]);

  const shareMenuItems = useMemo<MenuProps['items']>(() => ([
    {
      key: 'copy-link',
      label: '复制会话链接',
      icon: <SharePlaneIcon size={14} />,
      onClick: () => void handleShareConversation(),
    },
    {
      key: 'share-xiaoshan',
      label: '分享到小闪',
      icon: <SharePlaneIcon size={14} />,
      onClick: () => message.success(`已分享到小闪：${activeConversation?.title || '当前会话'}`),
    },
    {
      key: 'save-kb',
      label: '保存到个人知识库',
      icon: <SharePlaneIcon size={14} />,
      onClick: () => message.success(`已保存到个人知识库：${activeConversation?.title || '当前会话'}`),
    },
  ]), [activeConversation?.title, handleShareConversation]);

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

  const filteredAssets = useMemo(() => {
    const keyword = assetSearch.trim().toLowerCase();
    return ASSET_LIBRARY.filter((asset) => {
      if (deletedAssetIds.includes(asset.id)) return false;
      const matchesSource =
        assetSourceFilter === 'all' ||
        (assetSourceFilter === 'uploaded' && asset.source.includes('上传')) ||
        (assetSourceFilter === 'generated' && asset.source.includes('AI'));
      const matchesFormat =
        assetFormatFilter === 'all' ||
        (assetFormatFilter === 'image' && asset.category === 'image') ||
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
  }, [assetFormatFilter, assetSearch, assetSourceFilter, deletedAssetIds]);

  const selectedAssets = useMemo(
    () => ASSET_LIBRARY.filter((asset) => selectedAssetIds.includes(asset.id) && !deletedAssetIds.includes(asset.id)),
    [deletedAssetIds, selectedAssetIds],
  );

  const applySelectedAssets = useCallback(async () => {
    const picked = selectedAssets.slice(0, 10);
    if (selectedAssets.length > 10) {
      message.warning('一次最多引用 10 个资产，已保留前 10 个继续进入会话。');
    }
    await createConversation('基于资产的新对话');
    setReferencedAssets(picked);
    setWorkspaceView('chat');
  }, [createConversation, selectedAssets]);

  const handleDownloadAssets = useCallback((assetsToDownload: AssetRecord[]) => {
    const names = assetsToDownload.map((asset) => asset.title).join('、');
    message.success(`已开始下载：${names}`);
  }, []);

  const handleDeleteAssets = useCallback((assetIds: string[]) => {
    setDeletedAssetIds((prev) => Array.from(new Set([...prev, ...assetIds])));
    setSelectedAssetIds((prev) => prev.filter((id) => !assetIds.includes(id)));
    setOpenedAsset((prev) => (prev && assetIds.includes(prev.id) ? null : prev));
    message.success('已删除选中的资产');
  }, []);

  const handleLocateAsset = useCallback((asset: AssetRecord) => {
    setWorkspaceView('chat');
    setOpenedAsset(null);
    selectConversation(asset.conversationId);
    window.setTimeout(() => {
      const element = document.querySelector(`[data-asset-anchor="${asset.id}"]`) || document.querySelector('[data-message-surface]');
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 420);
    message.success(`已打开「${asset.anchorText}」所在会话`);
  }, [selectConversation]);

  const projectSelectOptions = useMemo(() => [
    {
      label: '请选择一个项目',
      value: NO_PROJECT_VALUE,
      icon: '',
      recent_visit: selectedProjectId === NO_PROJECT_VALUE,
      closed: false,
    },
    {
      label: '全部项目',
      value: ALL_PROJECT_VALUE,
      icon: '',
      recent_visit: selectedProjectId === ALL_PROJECT_VALUE,
      closed: false,
    },
    ...visibleProjectOptions.map((project, index) => ({
      label: project.app_name || `APPID ${project.app_id}`,
      value: project.app_id,
      icon: project.icon || '',
      followed: followedProjectIds.some((id) => String(id) === String(project.app_id)),
      recent_visit: index < 3,
      closed: false,
    })),
  ], [followedProjectIds, selectedProjectId, visibleProjectOptions]);

  const renderProjectSelector = () => {
    const selectedLabel = selectedProjectId === NO_PROJECT_VALUE
      ? '请选择一个项目'
      : selectedProjectId === ALL_PROJECT_VALUE
      ? '全部项目'
      : selectedProject?.app_name || '请选择一个项目';
    const selectedProjectIcon = selectedProjectId === ALL_PROJECT_VALUE || selectedProjectId === NO_PROJECT_VALUE ? '' : selectedProject?.icon || '';
    const mobileProjectWidth = messages.length > 0
      ? 'clamp(150px, calc(100vw - 164px), 210px)'
      : 'clamp(168px, calc(100vw - 122px), 230px)';
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <Input
          allowClear
          value={projectSearch}
          onChange={(event) => setProjectSearch(event.target.value)}
          placeholder="搜索项目 ID / 名称"
          prefix={<Search size={14} />}
          style={{
            width: isMobile ? 146 : 188,
            height: 36,
            borderRadius: 18,
          }}
        />
        <YkProjectSelect
          value={selectedProjectId}
          options={projectSelectOptions}
          maxVisibleItems={isMobile ? 5 : undefined}
          onChange={(value) => {
            setSelectedProjectId(value === ALL_PROJECT_VALUE || value === NO_PROJECT_VALUE ? value : (Number.isNaN(Number(value)) ? value : Number(value)));
          }}
          followedCallback={(item, followed) => {
            if (item.value === ALL_PROJECT_VALUE || item.value === NO_PROJECT_VALUE) return;
            setFollowedProjectIds((prev) => {
              const withoutCurrent = prev.filter((id) => String(id) !== String(item.value));
              return followed ? [...withoutCurrent, item.value] : withoutCurrent;
            });
          }}
          customShow={(
            <button
              type="button"
              className="project-select-trigger"
              style={{
                maxWidth: isMobile ? 'calc(100vw - 280px)' : 360,
                minWidth: 0,
                width: isMobile ? mobileProjectWidth : 'fit-content',
                flexShrink: 1,
                height: 36,
                borderRadius: 18,
                border: '1px solid rgba(15, 23, 42, 0.05)',
                background: '#fff',
                boxShadow: 'none',
                color: c.textPrimary,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                gap: 8,
                padding: '0 10px 0 7px',
                fontSize: 13,
                fontWeight: 400,
              }}
              title={projectContextText}
            >
              <span
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 8,
                  overflow: 'hidden',
                  flexShrink: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#e5e7eb',
                  color: '#4c7dff',
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                {selectedProjectIcon ? (
                  <img src={selectedProjectIcon} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : selectedProjectId === ALL_PROJECT_VALUE ? (
                  '全'
                ) : selectedProjectId === NO_PROJECT_VALUE ? (
                  '选'
                ) : (
                  '项'
                )}
              </span>
              <span className="project-select-label" style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedLabel}
              </span>
            </button>
          )}
        />
      </div>
    );
  };

  const handleSendWithAssets = useCallback(async (rawMessage: string) => {
    if (openedAsset) {
      const conversation = await createConversation(`关于${openedAsset.title}`);
      setWorkspaceView('chat');
      setReferencedAssets([]);
      setOpenedAsset(null);
      sendMessage(`[引用资产] ${getAssetFileName(openedAsset)}（${openedAsset.format}）\n\n${rawMessage}`, conversation.conversation_id, { projectContext: projectContextText });
      return;
    }

    setWorkspaceView('chat');
    const assetPrefix = referencedAssets.length > 0
      ? `${referencedAssets.map((asset) => `[引用资产] ${asset.title}（${asset.format}）`).join('\n')}\n\n`
      : '';
    const attachmentPrefix = attachments.length > 0
      ? `${attachments
        .filter((attachment) => attachment.status === 'parsed')
        .map((attachment) => `[引用附件] ${attachment.name}：${attachment.summary || '已解析'} `)
        .join('\n')}\n\n`
      : '';
    sendMessage(`${assetPrefix}${attachmentPrefix}${rawMessage}`, undefined, { projectContext: projectContextText });
    setReferencedAssets([]);
  }, [attachments, createConversation, openedAsset, projectContextText, referencedAssets, sendMessage]);

  const renderRightPanel = () => {
    if (workspaceView !== 'chat') return null;

    const collapsedRail = (title: string) => (
      <aside
        className="flex w-[52px] flex-shrink-0 flex-col items-center"
        style={{ borderLeft: `1px solid ${c.borderFaint}`, background: c.bgCard, padding: '12px 8px' }}
      >
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
          <PanelRightOpen size={17} />
        </button>
        <div
          style={{
            marginTop: 12,
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            fontSize: 12,
            color: c.textMuted,
            letterSpacing: 2,
          }}
        >
          {title}
        </div>
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
        <PanelRightClose size={18} />
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

    const rightPanelClassName = 'right-side-panel flex w-[360px] flex-shrink-0 flex-col';
    const rightPanelBodyStyle = {
      flex: 1,
      minWidth: 0,
      overflow: 'auto',
      overflowX: 'auto',
      padding: 16,
      wordBreak: 'break-word',
      overflowWrap: 'anywhere',
    } as const;

    if (showSourcePanel) {
      const sourceDetails = sourcePanelPayload?.source
        ? [{
          title: sourcePanelPayload.source.title,
          source: sourcePanelPayload.source.source,
          url: sourcePanelPayload.source.url,
          prompt: sourcePanelPayload.source.prompt,
          sourceType: sourcePanelPayload.source.sourceType,
          detail: sourcePanelPayload.source.detail,
        }]
        : getKnowledgeSourceDetails(sourcePanelPayload?.message || null);
      const capabilityDetails = sourcePanelPayload?.capability;
      const capabilityUrl = capabilityDetails?.providerUrl;
      const isWebCapability = capabilityDetails?.kind === 'web_search' && capabilityUrl;
      const isDebugLogPanel = capabilityDetails?.kind === 'debug_log';
      const panelTitle = isDebugLogPanel ? '联调日志' : '来源';
      if (rightPanelCollapsed) {
        if (isMobile) {
          return (
            <div
              style={{
                position: 'fixed',
                right: 12,
                top: 74,
                zIndex: 42,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                borderRadius: 14,
                background: '#fff',
                padding: 6,
                boxShadow: '0 16px 42px rgba(15, 23, 42, 0.14)',
              }}
            >
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
                title="展开来源"
                aria-label="展开来源"
              >
                <PanelRightOpen size={17} />
              </button>
              <button
                type="button"
                onClick={() => setSourcePanelPayload(null)}
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
                title="关闭来源"
                aria-label="关闭来源"
              >
                <X size={18} />
              </button>
            </div>
          );
        }
        return collapsedRail(panelTitle);
      }
      return (
        <>
          {isMobile && (
            <div
              onClick={() => setSourcePanelPayload(null)}
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 39,
                background: 'rgba(15, 23, 42, 0.16)',
              }}
            />
          )}
          <aside
            className={`${rightPanelClassName} ${isDebugLogPanel ? 'debug-log-panel' : ''} ${isMobile ? 'fixed bottom-0 right-0 top-0 z-40 shadow-[0_24px_60px_rgba(15,23,42,0.18)]' : ''}`}
            style={{
              borderLeft: `1px solid ${c.borderFaint}`,
              background: c.bgCard,
              width: isMobile ? (isDebugLogPanel ? 'min(92vw, 420px)' : 'min(88vw, 360px)') : undefined,
              maxWidth: isMobile ? (isDebugLogPanel ? '92vw' : '88vw') : undefined,
            }}
          >
          <div
            style={{
              padding: '14px 16px 10px',
              borderBottom: `1px solid ${c.borderFaint}`,
              background: c.bgCard,
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: c.textPrimary }}>{panelTitle}</div>
              {!isDebugLogPanel && (
                <div style={{ marginTop: 4, fontSize: 12, color: c.textMuted, lineHeight: 1.6 }}>
                  查看本条回复关联的会话内容、附件和结果摘要。
                </div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
              {collapseButton()}
              {closeButton(() => setSourcePanelPayload(null))}
            </div>
          </div>

          <div style={rightPanelBodyStyle}>
            <div style={{ display: 'grid', gap: 12, marginBottom: 16, minWidth: 320 }}>
              {isDebugLogPanel ? (
                <FancyCodeBlock language="text" codeStyle="minimal" showLineNumbers={false}>
                  {(capabilityDetails?.result || '').replace(/\d{4}-\d{2}-\d{2}[ T](\d{2}:\d{2}:\d{2})(?:\.\d+)?/g, '$1')}
                </FancyCodeBlock>
              ) : capabilityDetails ? (
                <>
                  <div style={{ border: `1px solid ${c.borderFaint}`, borderRadius: 14, padding: 12, background: '#fff' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: c.textPrimary }}>{capabilityDetails.name}</div>
                    <div style={{ marginTop: 4, fontSize: 12, color: c.textMuted }}>{capabilityDetails.kind}</div>
                    {capabilityDetails.providerUrl && <a href={capabilityDetails.providerUrl} target="_blank" rel="noreferrer" style={{ marginTop: 6, display: 'block', color: c.accent, fontSize: 12, wordBreak: 'break-all' }}>{capabilityDetails.providerUrl}</a>}
                  </div>
                  {capabilityDetails.prompt && <pre style={{ margin: 0, border: `1px solid ${c.borderFaint}`, borderRadius: 14, padding: 12, background: '#fff', whiteSpace: 'pre-wrap', color: c.textSecondary, fontSize: 12, lineHeight: 1.7 }}>{capabilityDetails.prompt}</pre>}
                  {capabilityDetails.arguments && <pre style={{ margin: 0, border: `1px solid ${c.borderFaint}`, borderRadius: 14, padding: 12, background: '#fff', whiteSpace: 'pre-wrap', color: c.textSecondary, fontSize: 12, lineHeight: 1.7 }}>{capabilityDetails.arguments}</pre>}
                  {capabilityDetails.result && <pre style={{ margin: 0, border: `1px solid ${c.borderFaint}`, borderRadius: 14, padding: 12, background: '#fff', whiteSpace: 'pre-wrap', color: c.textSecondary, fontSize: 12, lineHeight: 1.7 }}>{capabilityDetails.result}</pre>}
                  {isWebCapability && (
                    <iframe
                      title={capabilityDetails.name}
                      src={capabilityUrl}
                      style={{ width: '100%', minWidth: 520, height: 460, border: `1px solid ${c.borderFaint}`, borderRadius: 14, background: '#fff' }}
                    />
                  )}
                </>
              ) : (
                sourceDetails.length > 0 ? sourceDetails.map((item, index) => (
                  <div key={`${item.title}-${index}`} style={{ border: `1px solid ${c.borderFaint}`, borderRadius: 14, padding: 12, background: '#fff' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: c.textPrimary }}>{item.title}</div>
                    {item.source && <div style={{ marginTop: 4, fontSize: 12, color: c.textMuted }}>{item.source}</div>}
                    {item.url && <a href={item.url} target="_blank" rel="noreferrer" style={{ marginTop: 6, display: 'block', color: c.accent, fontSize: 12, wordBreak: 'break-all' }}>{item.url}</a>}
                    {'prompt' in item && item.prompt && <pre style={{ margin: '10px 0 0', whiteSpace: 'pre-wrap', color: c.textSecondary, fontSize: 12, lineHeight: 1.7 }}>{String(item.prompt)}</pre>}
                    {'detail' in item && item.detail && <div style={{ marginTop: 10, whiteSpace: 'pre-wrap', color: c.textSecondary, fontSize: 12, lineHeight: 1.7 }}>{String(item.detail)}</div>}
                    {'sourceType' in item && item.sourceType === 'web_search' && item.url && (
                      <iframe
                        title={item.title}
                        src={item.url}
                        style={{ marginTop: 12, width: '100%', height: 460, border: `1px solid ${c.borderFaint}`, borderRadius: 14, background: '#fff' }}
                      />
                    )}
                  </div>
                )) : <div style={{ fontSize: 12, color: c.textMuted, lineHeight: 1.7 }}>当前没有可披露的来源信息。</div>
              )}
            </div>
            <div style={{ display: 'none' }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: c.textMuted, marginBottom: 6 }}>关联会话</div>
              <div
                style={{
                  border: `1px solid ${c.borderFaint}`,
                  borderRadius: 14,
                  padding: '12px',
                  background: c.bgSection,
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 600, color: c.textPrimary }}>
                  {activeConversation?.title || '当前会话'}
                </div>
                <div style={{ marginTop: 4, fontSize: 12, color: c.textMuted }}>当前回复引用自本会话上下文。</div>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: c.textMuted, marginBottom: 6 }}>消息内容</div>
              <div
                style={{
                  border: `1px solid ${c.borderFaint}`,
                  borderRadius: 14,
                  padding: '12px',
                  background: '#fff',
                  fontSize: 13,
                  color: c.textSecondary,
                  lineHeight: 1.75,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {capabilityDetails ? '当前查看的是一次能力调用。' : sourcePanelPayload?.message.content || '暂无内容'}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: c.textMuted, marginBottom: 8 }}>知识库来源</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {sourceDetails.length > 0 ? sourceDetails.map((item, index) => (
                  <div
                    key={`${item.title}-${index}`}
                    style={{
                      border: `1px solid ${c.borderFaint}`,
                      borderRadius: 14,
                      padding: '10px 12px',
                      background: c.bgSection,
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 650, color: c.textPrimary }}>{item.title}</div>
                    {item.source && <div style={{ marginTop: 4, fontSize: 12, color: c.textMuted }}>{item.source}</div>}
                    {item.url && <div style={{ marginTop: 4, fontSize: 12, color: c.accent, wordBreak: 'break-all' }}>{item.url}</div>}
                  </div>
                )) : (
                  <div style={{ fontSize: 12, color: c.textMuted, lineHeight: 1.7 }}>
                    当前消息没有返回可披露的知识库地址。若本轮使用了知识库检索，请检查模型服务配置中的知识库地址与返回元数据。
                  </div>
                )}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: c.textMuted, marginBottom: 8 }}>关联附件</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {attachments.length > 0 ? attachments.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      border: `1px solid ${c.borderFaint}`,
                      borderRadius: 14,
                      padding: '10px 12px',
                      background: c.bgSection,
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, color: c.textPrimary }}>{item.name}</div>
                    <div style={{ marginTop: 4, fontSize: 12, color: c.textMuted }}>
                      {item.summary || item.kind}
                    </div>
                  </div>
                )) : (
                  <div style={{ fontSize: 12, color: c.textMuted }}>暂无可展示的附件来源</div>
                )}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 12, color: c.textMuted, marginBottom: 8 }}>结果摘要</div>
              <div
                style={{
                  border: `1px solid ${c.borderFaint}`,
                  borderRadius: 14,
                  padding: '12px',
                  background: c.bgSection,
                  fontSize: 13,
                  color: c.textSecondary,
                  lineHeight: 1.75,
                }}
              >
                {typeof activeResult?.summary === 'string' ? activeResult.summary : '当前没有可展示的结果摘要。'}
              </div>
            </div>
            </div>
          </div>
          </aside>
        </>
      );
    }

    if (currentAgent === 'demand' && activeResult?.result_type === 'demand_form') {
      const nextActions = Array.isArray(activeResult.next_actions) ? activeResult.next_actions : [];
      const pendingChecks = Array.isArray(activeResult.pending_checks) ? activeResult.pending_checks : [];
      if (rightPanelCollapsed) return collapsedRail('需求待办');
      return (
        <aside
          className={rightPanelClassName}
          style={{ borderLeft: `1px solid ${c.borderFaint}`, background: c.bgCard, position: 'relative' }}
        >
          <div style={{ position: 'absolute', top: 10, right: 12, zIndex: 1 }}>
            {collapseButton()}
          </div>
          <div style={{ padding: '14px 16px 10px', borderBottom: `1px solid ${c.borderFaint}` }}>
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
                  <div style={{ fontSize: 13, fontWeight: 650, color: c.textPrimary }}>{String(item)}</div>
                  <div style={{ marginTop: 4, fontSize: 12, color: c.textMuted }}>点击后写入输入区继续补充。</div>
                </button>
              ))}
            </div>
          </div>
        </aside>
      );
    }

    if (activeSidePanel && activeSidePanel !== 'debugging' && !isMobile) {
      const panelMap: Record<string, { title: string; desc: string; actions: string[] }> = {
        demand: {
          title: '需求跟踪',
          desc: '集中查看已记录的需求、待补充信息和下一步处理动作。',
          actions: ['补充需求信息', '查看需求进展', '继续当前会话'],
        },
        diagnosis: {
          title: '排查记录',
          desc: '集中查看问题排查过程、证据线索和需要继续确认的事项。',
          actions: ['补充异常现象', '查看排查线索', '继续当前会话'],
        },
      };
      const panel = panelMap[activeSidePanel] || panelMap.demand;
      if (rightPanelCollapsed) return collapsedRail(panel.title);
      return (
        <aside
          className={rightPanelClassName}
          style={{ borderLeft: `1px solid ${c.borderFaint}`, background: c.bgCard }}
        >
          <div style={{ padding: '14px 16px 10px', borderBottom: `1px solid ${c.borderFaint}`, display: 'flex', gap: 12, justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: c.textPrimary }}>{panel.title}</div>
              <div style={{ marginTop: 4, fontSize: 12, color: c.textMuted, lineHeight: 1.6 }}>{panel.desc}</div>
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
                  <div style={{ fontSize: 13, fontWeight: 650, color: c.textPrimary }}>{item}</div>
                  <div style={{ marginTop: 4, fontSize: 12, color: c.textMuted }}>点击后写入输入区，可继续发起处理。</div>
                </button>
              ))}
            </div>
          </div>
        </aside>
      );
    }

    if (showDebugPanel) {
      if (rightPanelCollapsed) return collapsedRail('联调记录');
      return (
        <div className="right-side-panel" style={{ position: 'relative', flexShrink: 0, overflowX: 'auto' }}>
          <div style={{ position: 'absolute', top: 10, right: 58, zIndex: 2 }}>
            {collapseButton()}
          </div>
          <AutoDebugWorkbench
            conversationId={activeConversationId}
            onOpenContext={() => setShowContextDrawer(true)}
          />
        </div>
      );
    }

    if (!showDebugPanel) return null;

    return (
      <aside
        className="flex w-[360px] flex-shrink-0 flex-col"
        style={{ borderLeft: `1px solid ${c.borderFaint}`, background: c.bgCard }}
      >
        <div
          style={{
            padding: '14px 16px 10px',
            borderBottom: `1px solid ${c.borderFaint}`,
            background: c.bgCard,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, color: c.textPrimary }}>自动联通动态面板</div>
          <div style={{ marginTop: 4, fontSize: 12, color: c.textMuted, lineHeight: 1.6 }}>
            仅在自动联调会话中展开，集中展示当前结果、待确认项和后续动作。
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
          <div
            style={{
              borderRadius: 16,
              border: `1px solid ${c.borderFaint}`,
              background: c.bgSection,
              padding: '14px',
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600, color: c.textPrimary, marginBottom: 6 }}>当前状态</div>
            <div style={{ fontSize: 12, color: c.textMuted, lineHeight: 1.7 }}>
              {typeof activeResult?.summary === 'string' ? activeResult.summary : '等待本轮自动联调返回结果。'}
            </div>
          </div>
        </div>

        <div style={{ padding: '8px 12px', borderTop: `1px solid ${c.borderFaint}` }}>
          <button
            type="button"
            onClick={() => setShowContextDrawer(true)}
            style={{
              width: '100%',
              padding: '8px 12px',
              background: c.accentBg,
              border: `1px solid ${c.accentBorder}`,
              borderRadius: 12,
              color: c.accent,
              fontSize: 12,
              cursor: 'pointer',
              textAlign: 'center',
            }}
          >
            补充本次联调背景
          </button>
        </div>
      </aside>
    );
  };

  const renderAssetCenter = () => (
    <div style={{ width: '100%', maxWidth: 1120, margin: '0 auto', padding: `0 ${pageSidePadding}px ${isMobile ? 12 : 18}px`, minHeight: 0 }}>
      <section style={{ display: 'flex', minHeight: 0, height: '100%', flexDirection: 'column' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingBottom: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, height: 38, width: isMobile ? '100%' : 320, borderRadius: 12, background: '#fff', padding: '0 12px', color: c.textMuted }}>
            <Search size={15} />
            <input
              value={assetSearch}
              onChange={(event) => setAssetSearch(event.target.value)}
              placeholder="搜索资料库"
              style={{ width: '100%', minWidth: 0, border: 'none', outline: 'none', background: 'transparent', color: c.textPrimary, fontSize: 13 }}
            />
          </label>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {selectedAssets.length > 0 && (
              <>
                <span style={{ fontSize: 13, color: selectedAssets.length > 10 ? '#b45309' : c.textMuted }}>已选 {selectedAssets.length}/10</span>
                <button type="button" onClick={applySelectedAssets} style={{ height: 34, borderRadius: 12, border: 'none', background: '#111827', color: '#fff', padding: '0 13px', fontSize: 13, cursor: 'pointer' }}>引用并开启对话</button>
                <button type="button" onClick={() => handleDownloadAssets(selectedAssets)} style={{ height: 34, borderRadius: 12, border: 'none', background: '#f3f4f6', color: c.textSecondary, padding: '0 12px', fontSize: 13, cursor: 'pointer' }}>下载</button>
                <button type="button" onClick={() => handleDeleteAssets(selectedAssets.map((asset) => asset.id))} style={{ height: 34, borderRadius: 12, border: 'none', background: '#f3f4f6', color: c.textSecondary, padding: '0 12px', fontSize: 13, cursor: 'pointer' }}>删除</button>
              </>
            )}
            <select value={assetSourceFilter} onChange={(event) => setAssetSourceFilter(event.target.value as AssetSourceFilter)} style={{ height: 34, borderRadius: 12, border: 'none', background: '#fff', color: c.textSecondary, padding: '0 10px', fontSize: 13, outline: 'none' }}>
              {ASSET_SOURCE_FILTERS.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
            </select>
            <select value={assetFormatFilter} onChange={(event) => setAssetFormatFilter(event.target.value as AssetFormatFilter)} style={{ height: 34, borderRadius: 12, border: 'none', background: '#fff', color: c.textSecondary, padding: '0 10px', fontSize: 13, outline: 'none' }}>
              {ASSET_FORMAT_FILTERS.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
            </select>
            <button type="button" onClick={() => message.info('上传入口会接入当前会话附件能力')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, borderRadius: 12, border: 'none', background: '#f3f4f6', color: c.textSecondary, padding: '0 12px', fontSize: 13, cursor: 'pointer' }}>
              <Upload size={14} />
              上传
            </button>
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: 2 }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '30px 46px minmax(0,1fr) 72px 70px 34px' : '34px 48px minmax(220px,1fr) 92px 116px 112px 44px', alignItems: 'center', height: 34, padding: '0 8px', fontSize: 12, color: c.textMuted }}>
            <span />
            <span />
            <span>名称</span>
            <span>类型</span>
            {!isMobile && <span>来源</span>}
            <span>日期</span>
            <span />
          </div>

          {filteredAssets.map((asset) => {
            const checked = selectedAssetIds.includes(asset.id);
            const hovering = hoveredAssetId === asset.id;
            const menuItems: MenuProps['items'] = [
              { key: 'download', label: '下载', icon: <Download size={14} />, onClick: () => handleDownloadAssets([asset]) },
              { key: 'locate', label: '定位到会话', icon: <MapPin size={14} />, onClick: () => handleLocateAsset(asset) },
              { key: 'delete', label: '删除', icon: <Trash2 size={14} />, onClick: () => handleDeleteAssets([asset.id]) },
            ];

            return (
              <div
                key={asset.id}
                onMouseEnter={() => setHoveredAssetId(asset.id)}
                onMouseLeave={() => setHoveredAssetId(null)}
                data-asset-anchor={asset.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '30px 46px minmax(0,1fr) 72px 70px 34px' : '34px 48px minmax(220px,1fr) 92px 116px 112px 44px',
                  alignItems: 'center',
                  minHeight: 52,
                  padding: '4px 8px',
                  borderRadius: 12,
                  background: checked ? '#eef4ff' : hovering ? '#f3f4f6' : 'transparent',
                  transition: 'background 160ms ease',
                }}
              >
                <button
                  type="button"
                  aria-label="选择资产"
                  onClick={() => {
                    setSelectedAssetIds((prev) => {
                      if (prev.includes(asset.id)) return prev.filter((id) => id !== asset.id);
                      if (prev.length >= 10) {
                        message.warning('最多选择 10 个文件');
                        return prev;
                      }
                      return [...prev, asset.id];
                    });
                  }}
                  style={{ width: 24, height: 24, borderRadius: 8, border: checked ? `1px solid ${c.accent}` : `1px solid ${hovering ? '#d1d5db' : 'transparent'}`, background: checked ? c.accent : '#fff', color: '#fff', opacity: checked || hovering ? 1 : 0, cursor: 'pointer' }}
                >
                  {checked && <CheckCircle2 size={14} />}
                </button>

                <button type="button" onClick={() => setOpenedAsset(asset)} style={{ width: 38, height: 38, overflow: 'hidden', borderRadius: 10, border: 'none', padding: 0, cursor: 'pointer' }}>
                  {getAssetPreview(asset)}
                </button>

                <button type="button" onClick={() => setOpenedAsset(asset)} style={{ minWidth: 0, border: 'none', background: 'transparent', padding: '0 8px', textAlign: 'left', cursor: 'pointer' }}>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13, fontWeight: 560, color: c.textPrimary }}>{getAssetFileName(asset)}</div>
                </button>

                <div style={{ fontSize: 12, color: c.textSecondary }}>{getAssetTypeLabel(asset)}</div>
                {!isMobile && <div style={{ fontSize: 12, color: c.textMuted }}>{asset.source}</div>}
                <div style={{ fontSize: 12, color: c.textMuted }}>{asset.updatedAt}</div>
                <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
                  <button type="button" onClick={(event) => event.stopPropagation()} style={{ width: 30, height: 30, borderRadius: 10, border: 'none', background: hovering ? '#fff' : 'transparent', color: c.textMuted, opacity: hovering ? 1 : 0, cursor: 'pointer' }} title="更多">
                    <Ellipsis size={16} />
                  </button>
                </Dropdown>
              </div>
            );
          })}

          {filteredAssets.length === 0 && (
            <div style={{ padding: '34px 0', textAlign: 'center', color: c.textMuted, fontSize: 13 }}>
              没有找到匹配的资产。
            </div>
          )}
        </div>
      </section>
    </div>
  );

  const renderOpenedAsset = () => {
    if (!openedAsset) return null;

    const menuItems: MenuProps['items'] = [
      { key: 'download', label: '下载', icon: <Download size={14} />, onClick: () => handleDownloadAssets([openedAsset]) },
      { key: 'delete', label: '删除', icon: <Trash2 size={14} />, onClick: () => handleDeleteAssets([openedAsset.id]) },
    ];

    return (
      <div style={{ position: 'absolute', inset: 0, zIndex: 18, display: 'flex', flexDirection: 'column', background: '#fff' }}>
        <div style={{ height: 52, padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${c.borderFaint}` }}>
          <button type="button" onClick={() => setOpenedAsset(null)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 34, borderRadius: 12, border: 'none', background: 'transparent', color: c.textSecondary, cursor: 'pointer' }}>
            <X size={17} />
            <span style={{ fontSize: 13 }}>关闭</span>
          </button>
          <div style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 14, fontWeight: 600, color: c.textPrimary }}>
            {getAssetFileName(openedAsset)}
          </div>
          <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
            <button type="button" style={{ width: 34, height: 34, borderRadius: 12, border: 'none', background: 'transparent', color: c.textMuted, cursor: 'pointer' }} title="更多">
              <Ellipsis size={18} />
            </button>
          </Dropdown>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: isMobile ? '18px' : '28px 48px 132px' }}>
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <div style={{ borderRadius: 14, overflow: 'hidden', background: '#f8fafc', minHeight: isPreviewSupported(openedAsset) ? 360 : 240 }}>
              {!isPreviewSupported(openedAsset) ? (
                <div style={{ minHeight: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center', color: c.textMuted, fontSize: 14 }}>
                  文件不支持预览，请尝试下载查看。
                </div>
              ) : openedAsset.category === 'image' || openedAsset.category === 'video' ? (
                <div style={{ height: isMobile ? 280 : 460 }}>
                  {getAssetPreview(openedAsset)}
                </div>
              ) : (
                <div style={{ padding: isMobile ? 22 : 38 }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 54, height: 54, borderRadius: 14, background: `${openedAsset.previewTone}18`, color: openedAsset.previewTone }}>
                    {openedAsset.category === 'link' ? <Link2 size={24} /> : openedAsset.format === 'Excel' ? <FileSpreadsheet size={24} /> : <FileText size={24} />}
                  </div>
                  <h2 style={{ margin: '22px 0 10px', fontSize: isMobile ? 22 : 28, lineHeight: 1.25, fontWeight: 650, color: c.textPrimary }}>{getAssetFileName(openedAsset)}</h2>
                  <p style={{ margin: 0, fontSize: 14, lineHeight: 1.8, color: c.textSecondary }}>{openedAsset.summary}</p>
                  <div style={{ marginTop: 28, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                    {[
                      ['文件类型', getAssetTypeLabel(openedAsset)],
                      ['来源', openedAsset.source],
                      ['更新时间', openedAsset.updatedAt],
                      ['所在会话', openedAsset.anchorText],
                    ].map(([label, value]) => (
                      <div key={label} style={{ borderRadius: 12, background: '#fff', padding: '12px 14px' }}>
                        <div style={{ fontSize: 12, color: c.textMuted }}>{label}</div>
                        <div style={{ marginTop: 5, fontSize: 13, color: c.textPrimary }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: `linear-gradient(180deg, ${c.bgMain} 0%, ${c.bgSection} 100%)` }}
    >
      {!isCompactLayout && (
        <TaskSidebar
          defaultCollapsed={false}
          conversations={conversations}
          activeConversationId={activeConversationId}
          onCreateConversation={handleCreateConversationRequest}
          onSelectConversation={(conversationId) => {
            setWorkspaceView('chat');
            selectConversation(conversationId);
          }}
          onRenameConversation={renameConversation}
          onDeleteConversation={(conversationId) => void deleteConversation(conversationId)}
          onOpenAssetCenter={() => {
            setSelectedAssetIds(referencedAssets.map((asset) => asset.id));
            setWorkspaceView('assets');
          }}
          onOpenSearch={() => setSearchOpen(true)}
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
              zIndex: 70,
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
              zIndex: 71,
              width: 248,
              maxWidth: '88vw',
              borderRight: 'none',
              boxShadow: '1px 0 3px rgba(15, 23, 42, 0.05)',
              transform: sidebarDrawerVisible ? 'translateX(0)' : 'translateX(-100%)',
              transition: 'transform 420ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            <TaskSidebar
              floating
              defaultCollapsed={false}
              conversations={conversations}
              activeConversationId={activeConversationId}
              onCreateConversation={async () => {
                closeSidebarDrawer();
                await handleCreateConversationRequest();
              }}
              onSelectConversation={(conversationId) => {
                setWorkspaceView('chat');
                closeSidebarDrawer();
                selectConversation(conversationId);
              }}
              onRenameConversation={renameConversation}
              onDeleteConversation={(conversationId) => void deleteConversation(conversationId)}
              onOpenAssetCenter={() => {
                setSelectedAssetIds(referencedAssets.map((asset) => asset.id));
                setWorkspaceView('assets');
                closeSidebarDrawer();
              }}
              onOpenSearch={() => setSearchOpen(true)}
              onCloseFloating={closeSidebarDrawer}
            />
          </div>
        </>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 overflow-hidden">
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
                      }}
                      title="打开侧边栏"
                    >
                      <IconAsset name="collapse" size={18} />
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
                      letterSpacing: '-0.01em',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {workspaceView === 'assets' ? '我的资产' : (activeConversation?.title || '新对话')}
                  </div>
                </div>

                <div style={{ minWidth: 0, display: isMobile ? 'block' : 'none' }} />

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
                  {workspaceView === 'chat' ? renderProjectSelector() : null}

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
                        color: c.textSecondary,
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
                          color: c.textSecondary,
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
              </div>

              {workspaceView === 'assets' ? renderAssetCenter() : (
                <ChatContainer
                  messages={messages}
                  isTyping={isTyping}
                  isStreaming={isTyping}
                  devMode={false}
                  onFollowUpClick={handleFollowUpClick}
                  onViewCallChain={() => undefined}
                  onOpenSourcePanel={(payload) => {
                    setSourcePanelPayload(payload);
                    setRightPanelCollapsed(false);
                  }}
                  onEditUserMessage={(content) => { void handleSendWithAssets(content); }}
                  onSubmitFollowUp={(content) => { void handleSendWithAssets(content); }}
                  contextThinkingSteps={contextThinkingSteps}
                  currentResult={activeResult as WorkflowResult | Record<string, unknown> | null}
                  chatSettings={chatSettings}
                  onToggleSystemPrompt={() => setShowSystemPrompt((prev) => !prev)}
                  showSystemPrompt={showSystemPrompt}
                  systemPrompt=""
                  onOpenAgentPanel={handleOpenAgentPanel}
                />
              )}
              {renderOpenedAsset()}
            </div>

            {(workspaceView === 'chat' || openedAsset) && (
              <div>
                <InputArea
                  onSend={handleSendWithAssets}
                  currentAgent={currentAgent}
                  onAgentChange={handleAgentChange}
                  onOpenAgentPanel={handleOpenAgentPanel}
                  onToggleAutoSpeak={handleToggleAutoSpeak}
                  autoSpeakEnabled={autoSpeakEnabled || speaking}
                  onFileUpload={(files) => {
                    for (let i = 0; i < files.length; i += 1) {
                      void handleUpload(files[i], 'click');
                    }
                  }}
                  longTextThreshold={2000}
                  placeholder={attachments.length > 0 ? '输入提示语，我会结合文件继续处理' : openedAsset ? '询问关于此文件的问题' : '发消息或按住说话'}
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
                  attachments={attachments}
                  onRemoveAttachment={handleRemoveAttachment}
                  onRetryAttachment={handleRetryAttachment}
                  onPreviewAttachment={(attachment) => message.info(attachment.summary || attachment.name)}
                />
              </div>
            )}
          </div>

          {renderRightPanel()}
        </div>
      </div>

      <ContextEditDrawer
        open={showContextDrawer}
        taskContext={activeTaskContext}
        missingFields={missingFields}
        onClose={() => setShowContextDrawer(false)}
        onSave={handleContextSave}
      />

      <Modal
        open={searchOpen}
        onCancel={() => setSearchOpen(false)}
        footer={null}
        width={640}
        title="搜索历史记录"
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
                  setWorkspaceView('chat');
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
    <AgentProvider>
      <WorkspaceContent />
    </AgentProvider>
  );
}

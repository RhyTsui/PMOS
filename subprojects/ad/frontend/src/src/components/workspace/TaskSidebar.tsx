'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { App, Dropdown, type MenuProps } from 'antd';
import type { Conversation } from '@/types';
import {
  Bot,
  Ellipsis,
  History,
  LoaderCircle,
  LogOut,
  PencilLine,
  Pin,
  Search,
  Star,
  Trash2,
  Wrench,
  X,
} from 'lucide-react';
import { IconAsset } from '@/components/ui/IconAsset';
import { useAuth } from '@/hooks/useAuth';

interface TaskSidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  runningConversationIds?: string[];
  defaultCollapsed?: boolean;
  floating?: boolean;
  onCreateConversation: () => Promise<void> | void;
  onSelectConversation: (conversationId: string, options?: { anchor?: string }) => void;
  onRenameConversation: (conversationId: string, title: string) => Promise<void> | void;
  onDeleteConversation: (conversationId: string) => Promise<void> | void;
  onOpenAssetCenter?: () => void;
  onOpenAutomationCenter?: () => void;
  onOpenPersonalKnowledgeConfig?: () => void;
  onOpenSearch?: () => void;
  onShareConversation?: (conversation: Conversation) => void;
  onCloseFloating?: () => void;
  automationUnreadCount?: number;
}

const PIN_STORAGE_KEY = 'xiaoqiao-pinned-conversations';
const PROFILE_AVATAR =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='72' height='72' viewBox='0 0 72 72'>" +
      "<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>" +
      "<stop offset='0%' stop-color='#5B8CFF'/>" +
      "<stop offset='100%' stop-color='#8EC5FF'/>" +
      '</linearGradient></defs>' +
      "<rect width='72' height='72' rx='36' fill='url(#g)'/>" +
      "<circle cx='36' cy='28' r='13' fill='rgba(255,255,255,0.94)'/>" +
      "<path d='M16 60c4-11 14-17 20-17s16 6 20 17' fill='rgba(255,255,255,0.94)'/>" +
    '</svg>',
  );

function SidebarToggleGlyph({ className = '' }: { className?: string }) {
  return <IconAsset name="sidebar" size={className.includes('h-5') ? 20 : 18} className={className} />;
}

function DesktopSidebarGlyph({ className = '' }: { className?: string }) {
  return <IconAsset name="sidebar" size={className.includes('h-5') ? 20 : 18} className={className} />;
}

function SharePlaneIcon({ className = '' }: { className?: string }) {
  return <IconAsset name="share-plane" size={14} className={className} />;
}

function PlusCircleIcon({ className = '', size = 18 }: { className?: string; size?: number }) {
  return <IconAsset name="plus-circle" size={size} className={className} />;
}

// ─── Chat-first Task Center: 会话任务角标 ───

function TaskBadgeIndicator({ taskBadge }: { taskBadge: NonNullable<Conversation['task_badge']> }) {
  const statusLabels: Record<string, { label: string; color: string; bg: string }> = {
    active: { label: '⚙ 自动化', color: '#1d4ed8', bg: '#eff6ff' },
    paused: { label: '⏸ 已暂停', color: '#92400e', bg: '#fef3c7' },
    failed: { label: '✕ 失败', color: '#991b1b', bg: '#fee2e2' },
    needs_action: { label: '⚠ 需处理', color: '#92400e', bg: '#fef3c7' },
  };
  const config = statusLabels[taskBadge.status] || statusLabels.active;
  return (
    <span
      className="shrink-0 inline-flex items-center text-[10px] leading-none px-1 py-0.5 rounded font-medium whitespace-nowrap"
      style={{ backgroundColor: config.bg, color: config.color }}
      title={taskBadge.label}
    >
      {config.label}
    </span>
  );
}

function UnreadAutomationBadge({ unread }: { unread: NonNullable<Conversation['unread_automation']> }) {
  const severityConfig: Record<string, { color: string; bg: string }> = {
    success: { color: '#15803d', bg: '#dcfce7' },
    info: { color: '#1d4ed8', bg: '#dbeafe' },
    warning: { color: '#92400e', bg: '#fef3c7' },
    error: { color: '#991b1b', bg: '#fee2e2' },
  };
  const config = severityConfig[unread.severity] || severityConfig.info;
  const dotColor = unread.severity === 'error' ? '#dc2626'
    : unread.severity === 'warning' ? '#b45309'
    : unread.severity === 'success' ? '#16a34a'
    : '#2563eb';

  if (unread.count === 1) {
    return (
      <span
        className="shrink-0 inline-flex items-center gap-1 text-[10px] leading-none px-1 py-0.5 rounded font-medium whitespace-nowrap"
        style={{ backgroundColor: config.bg, color: config.color }}
        title={unread.label}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dotColor }} />
        {unread.severity === 'error' ? '待处理' : unread.severity === 'warning' ? '需确认' : '新结果'}
      </span>
    );
  }
  return (
    <span
      className="shrink-0 inline-flex items-center gap-1 text-[10px] leading-none px-1 py-0.5 rounded font-medium whitespace-nowrap"
      style={{ backgroundColor: config.bg, color: config.color }}
      title={unread.label}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dotColor }} />
      {unread.count}
      {unread.severity === 'error' ? ' 条待处理' : ' 条新结果'}
    </span>
  );
}

function CollapsedBrandToggle() {
  return (
    <>
      <picture>
        <source srcSet="/brand-icon-dark.png" media="(prefers-color-scheme: dark)" />
        <img
          src="/brand-icon-light.png"
          alt=""
          width={30}
          height={30}
          className="h-[30px] w-[30px] object-contain opacity-100 transition-opacity duration-150 group-hover:opacity-0"
        />
      </picture>
      <DesktopSidebarGlyph className="absolute h-5 w-5 opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
    </>
  );
}

function SidebarBrandLogo() {
  return (
    <picture className="block h-full w-full min-w-0">
      <source srcSet="/zt-chat-logo-dark.png" media="(prefers-color-scheme: dark)" />
      <img
        src="/zt-chat-logo-light.png"
        alt="小乔智投"
        className="block h-full w-full min-w-0 object-contain object-left transition-transform duration-200"
      />
    </picture>
  );
}

const SIDEBAR_HOVER_CLASS = 'hover:bg-[#ececec] hover:text-[#111827]';

interface ConversationTitleTextProps {
  title: string;
  active: boolean;
}

function ConversationTitleText({ title, active }: ConversationTitleTextProps) {
  const textRef = useRef<HTMLSpanElement>(null);
  const [overflowed, setOverflowed] = useState(false);

  useEffect(() => {
    const node = textRef.current;
    if (!node) return undefined;

    const updateOverflow = () => {
      setOverflowed(node.scrollWidth > node.clientWidth + 1);
    };

    updateOverflow();

    const resizeObserver =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateOverflow);
    resizeObserver?.observe(node);
    window.addEventListener('resize', updateOverflow);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updateOverflow);
    };
  }, [title]);

  return (
    <span
      ref={textRef}
      title={overflowed ? title : undefined}
      className={`block w-full max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-[14px] font-normal leading-[20px] transition-colors ${active ? 'text-[#2e75FE]' : 'text-[#4d4d4d] group-hover:text-[#1f1f1f]'}`}
    >
      {title}
    </span>
  );
}

function getTimelineLabel(value: string): string {
  const date = new Date(value);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.floor((startOfToday - startOfTarget) / 86400000);

  if (diffDays <= 0) return '今天';
  if (diffDays <= 7) return '7 天内';
  if (diffDays <= 30) return '30 天内';
  return '更早';
}

export function TaskSidebar({
  conversations,
  activeConversationId,
  runningConversationIds = [],
  defaultCollapsed = false,
  floating = false,
  onCreateConversation,
  onSelectConversation,
  onRenameConversation,
  onDeleteConversation,
  onOpenAssetCenter,
  onOpenAutomationCenter,
  onOpenPersonalKnowledgeConfig,
  onOpenSearch,
  onShareConversation,
  onCloseFloating,
  automationUnreadCount = 0,
}: TaskSidebarProps) {
  const { modal, message } = App.useApp();
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [openConversationMenuId, setOpenConversationMenuId] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [sidebarScrollThumb, setSidebarScrollThumb] = useState({ visible: false, top: 0, height: 100 });
  const [isHoveringSidebar, setIsHoveringSidebar] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const profileMenuCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sidebarScrollRef = useRef<HTMLDivElement>(null);
  const sidebarHideThumbTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHoveringSidebarRef = useRef(false);
  const { user, logout } = useAuth();
  const profileName = user?.real_name || user?.user_name || user?.account || '当前用户';
  const canAccessAdminCenter = Boolean(
    user?.admin_access?.can_view_admin ||
    user?.admin_access?.can_operate_admin ||
    user?.admin_access?.can_manage_users ||
    user?.admin_access?.is_super_admin,
  );

  useEffect(() => {
    setCollapsed(defaultCollapsed);
  }, [defaultCollapsed]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(PIN_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setPinnedIds(parsed.filter((item): item is string => typeof item === 'string'));
      }
    } catch {
      // ignore malformed local state
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(pinnedIds));
  }, [pinnedIds]);

  useEffect(() => {
    if (!profileMenuOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!profileRef.current?.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [profileMenuOpen]);

  useEffect(() => {
    return () => {
      if (profileMenuCloseTimerRef.current) {
        clearTimeout(profileMenuCloseTimerRef.current);
      }
      if (sidebarHideThumbTimerRef.current) {
        clearTimeout(sidebarHideThumbTimerRef.current);
      }
    };
  }, []);

  const sortedConversations = useMemo(() => {
    const pinnedSet = new Set(pinnedIds);
    const pinnedRank = new Map(pinnedIds.map((id, index) => [id, index]));
    return [...conversations].sort((a, b) => {
      const aPinned = pinnedSet.has(a.conversation_id);
      const bPinned = pinnedSet.has(b.conversation_id);
      if (aPinned && bPinned) {
        return (pinnedRank.get(a.conversation_id) ?? 0) - (pinnedRank.get(b.conversation_id) ?? 0);
      }
      if (aPinned) return -1;
      if (bPinned) return 1;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  }, [conversations, pinnedIds]);

  const recentConversations = useMemo(() => sortedConversations.slice(0, 10), [sortedConversations]);
  const pinnedConversations = useMemo(
    () => sortedConversations.filter((item) => pinnedIds.includes(item.conversation_id)),
    [pinnedIds, sortedConversations],
  );
  const hasRunningConversation = useMemo(
    () => runningConversationIds.length > 0,
    [runningConversationIds],
  );

  const groupedConversations = useMemo(() => (
    sortedConversations
      .filter((item) => !pinnedIds.includes(item.conversation_id))
      .reduce<Record<string, Conversation[]>>((acc, item) => {
        const label = getTimelineLabel(item.updated_at);
        if (!acc[label]) acc[label] = [];
        acc[label].push(item);
        return acc;
      }, {})
  ), [pinnedIds, sortedConversations]);

  const sections = ['今天', '7 天内', '30 天内', '更早'].filter((key) => groupedConversations[key]?.length);

  useEffect(() => {
    const element = sidebarScrollRef.current;
    if (!element || collapsed) {
      setSidebarScrollThumb({ visible: false, top: 0, height: 100 });
      return undefined;
    }

    const THUMB_HEIGHT = 100;

    const updateThumb = () => {
      const { scrollTop, scrollHeight, clientHeight } = element;
      const scrollRange = scrollHeight - clientHeight;
      if (scrollRange <= 1 || clientHeight <= 0) {
        setSidebarScrollThumb({ visible: false, top: 0, height: THUMB_HEIGHT });
        return;
      }

      const trackTravel = Math.max(clientHeight - THUMB_HEIGHT, 0);
      const progress = scrollRange > 0 ? scrollTop / scrollRange : 0;
      // Show thumb only when mouse is hovering the sidebar (controlled by mouse enter/leave)
      setSidebarScrollThumb({
        visible: isHoveringSidebarRef.current,
        top: Math.round(trackTravel * progress),
        height: THUMB_HEIGHT,
      });
    };

    updateThumb();
    element.addEventListener('scroll', updateThumb, { passive: true });
    const observer = new ResizeObserver(updateThumb);
    observer.observe(element);

    return () => {
      element.removeEventListener('scroll', updateThumb);
      observer.disconnect();
    };
  }, [collapsed, conversations.length, pinnedIds.length, sections.length]);

  const handleSidebarMouseEnter = () => {
    isHoveringSidebarRef.current = true;
    setIsHoveringSidebar(true);
    if (sidebarHideThumbTimerRef.current) {
      clearTimeout(sidebarHideThumbTimerRef.current);
      sidebarHideThumbTimerRef.current = null;
    }
    // Force show the thumb immediately
    const element = sidebarScrollRef.current;
    if (element) {
      const { scrollTop, scrollHeight, clientHeight } = element;
      const scrollRange = scrollHeight - clientHeight;
      const THUMB_HEIGHT = 100;
      if (scrollRange > 1 && clientHeight > 0) {
        const trackTravel = Math.max(clientHeight - THUMB_HEIGHT, 0);
        const progress = scrollRange > 0 ? scrollTop / scrollRange : 0;
        setSidebarScrollThumb({
          visible: true,
          top: Math.round(trackTravel * progress),
          height: THUMB_HEIGHT,
        });
      }
    }
  };

  const handleSidebarMouseLeave = () => {
    if (sidebarHideThumbTimerRef.current) {
      clearTimeout(sidebarHideThumbTimerRef.current);
    }
    sidebarHideThumbTimerRef.current = setTimeout(() => {
      isHoveringSidebarRef.current = false;
      setIsHoveringSidebar(false);
      setSidebarScrollThumb((prev) => ({ ...prev, visible: false }));
      sidebarHideThumbTimerRef.current = null;
    }, 3000);
  };

  const openProfileMenu = () => {
    if (profileMenuCloseTimerRef.current) {
      clearTimeout(profileMenuCloseTimerRef.current);
      profileMenuCloseTimerRef.current = null;
    }
    setProfileMenuOpen(true);
  };

  const closeProfileMenuWithDelay = () => {
    if (profileMenuCloseTimerRef.current) {
      clearTimeout(profileMenuCloseTimerRef.current);
    }
    profileMenuCloseTimerRef.current = setTimeout(() => {
      setProfileMenuOpen(false);
      profileMenuCloseTimerRef.current = null;
    }, 180);
  };

  const setCollapsedWithDelay = (next: boolean) => {
    setTransitioning(true);
    window.setTimeout(() => {
      setCollapsed(next);
      window.setTimeout(() => setTransitioning(false), 260);
    }, 160);
  };

  const handleCreateConversation = async () => {
    await onCreateConversation();
    setProfileMenuOpen(false);
    if (floating) {
      onCloseFloating?.();
    }
  };

  const togglePinned = (conversationId: string) => {
    setPinnedIds((prev) => (
      prev.includes(conversationId)
        ? prev.filter((id) => id !== conversationId)
        : [conversationId, ...prev]
    ));
  };

  const handleShare = (conversation: Conversation) => {
    onShareConversation?.(conversation);
  };

  const handleSaveToKnowledge = (_conversationTitle: string) => {
    message.success('已收到 Dataki 个人知识库');
  };

  const handleDeleteConversation = (conversation: Conversation) => {
    setOpenConversationMenuId(null);
    modal.confirm({
      title: '删除会话',
      content: (
        <div>
          <div style={{ color: '#111827', fontSize: 14, lineHeight: '22px' }}>
            这会删除“{conversation.title}”。
          </div>
          <div style={{ marginTop: 8, color: '#7a7f87', fontSize: 13, lineHeight: '20px' }}>
            访问 Dataki个人知识库 以删除此聊天期间保存的记忆。
          </div>
        </div>
      ),
      okText: '确认删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      centered: true,
      onOk: () => onDeleteConversation(conversation.conversation_id),
    });
  };

  const cancelRename = () => {
    setEditingId(null);
    setDraftTitle('');
  };

  const commitRename = async (conversation: Conversation) => {
    const nextTitle = draftTitle.trim();
    if (!nextTitle || nextTitle === conversation.title.trim()) {
      cancelRename();
      return;
    }
    await onRenameConversation(conversation.conversation_id, nextTitle);
    cancelRename();
  };

  const renderConversationRow = (conversation: Conversation, pinned: boolean) => {
    const active = conversation.conversation_id === activeConversationId;
    const isEditing = editingId === conversation.conversation_id;
    const running = runningConversationIds.includes(conversation.conversation_id);
    const menuOpen = openConversationMenuId === conversation.conversation_id;

    const menuItems: MenuProps['items'] = [
      {
        key: 'pin',
        label: pinned ? '取消置顶' : '置顶',
        icon: <Pin size={14} />,
        onClick: () => togglePinned(conversation.conversation_id),
      },
      {
        key: 'rename',
        label: '重命名',
        icon: <PencilLine size={14} />,
        onClick: () => {
          setOpenConversationMenuId(null);
          setEditingId(conversation.conversation_id);
          setDraftTitle(conversation.title);
        },
      },
      {
        key: 'share-xiaoshan',
        label: '复制链接',
        icon: <IconAsset name="share-plane" size={14} />,
        onClick: () => handleShare(conversation),
      },
      {
        key: 'save-knowledge',
        label: '保存到个人知识库',
        icon: <Star size={14} />,
        onClick: () => handleSaveToKnowledge(conversation.title),
      },
      {
        key: 'delete',
        label: '删除',
        icon: <Trash2 size={14} />,
        className: 'conversation-delete-menu-item',
        onClick: () => handleDeleteConversation(conversation),
      },
    ];

    return (
      <div
        key={conversation.conversation_id}
        data-conversation-row={conversation.conversation_id}
        className={`group relative rounded-[11px] px-1 py-[2px] ${active ? 'bg-[#edf4ff]' : 'hover:bg-[#eef1f5]'}`}
      >
        <button
          type="button"
          onClick={() => {
            const anchor = conversation.unread_automation && conversation.unread_automation.count > 0
              ? 'latest_unread_automation'
              : undefined;
            onSelectConversation(conversation.conversation_id, anchor ? { anchor } : undefined);
          }}
          className={`block min-h-8 w-full min-w-0 rounded-[10px] px-2 text-left ${isEditing ? 'py-[5px]' : 'py-[7px]'}`}
        >
          {isEditing ? (
            <input
              data-conversation-rename-input={conversation.conversation_id}
              autoFocus
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.target.value)}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => event.stopPropagation()}
              onBlur={() => void commitRename(conversation)}
              onKeyDown={(event) => {
                event.stopPropagation();
                if (event.key === 'Enter') {
                  event.preventDefault();
                  event.currentTarget.blur();
                  return;
                }
                if (event.key === 'Escape') {
                  event.preventDefault();
                  cancelRename();
                }
              }}
              className="h-[22px] w-full rounded-[8px] border border-[#c8d7f2] bg-white px-1.5 text-[14px] font-normal leading-[20px] text-[#111827] outline-none shadow-none"
            />
          ) : (
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="min-w-0 flex-1">
                <ConversationTitleText title={conversation.title} active={active} />
              </span>
              {conversation.task_badge && (
                <TaskBadgeIndicator taskBadge={conversation.task_badge} />
              )}
              {conversation.unread_automation && conversation.unread_automation.count > 0 && (
                <UnreadAutomationBadge unread={conversation.unread_automation} />
              )}
            </div>
          )}
        </button>

        {running && !isEditing && (
          <div
            className={`pointer-events-none absolute right-1 top-1/2 z-10 flex h-7 w-10 -translate-y-1/2 items-center justify-end rounded-[10px] bg-gradient-to-l ${
              active ? 'from-[#edf4ff] via-[#edf4ff]' : 'from-[#f8faff] via-[#f8faff]'
            } to-transparent pr-2 text-[#2e75FE] transition-opacity duration-150 ${
              menuOpen ? 'opacity-0' : 'opacity-100 group-hover:opacity-0'
            }`}
            aria-label="处理中"
            title="处理中"
          >
            <LoaderCircle className="h-3.5 w-3.5 animate-spin" strokeWidth={2.2} />
          </div>
        )}

        <div
          className={`absolute right-1 top-1/2 z-20 flex -translate-y-1/2 items-center rounded-[10px] bg-gradient-to-l ${
            active ? 'from-[#edf4ff] via-[#edf4ff]' : 'from-[#eef1f5] via-[#eef1f5]'
          } to-transparent pl-5 transition-opacity duration-150 ${
            !isEditing && menuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          {!isEditing && (
            <Dropdown
              menu={{ items: menuItems }}
              trigger={['click']}
              placement="bottomRight"
              open={menuOpen}
              onOpenChange={(open) => setOpenConversationMenuId(open ? conversation.conversation_id : null)}
            >
              <button
                type="button"
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[#6b7280] hover:bg-[#dfe3ea] ${
                  menuOpen ? 'bg-[#e6e9ee]' : 'bg-transparent'
                }`}
                onClick={(event) => event.stopPropagation()}
                title="更多"
                data-conversation-more={conversation.conversation_id}
              >
                <Ellipsis className="h-4 w-4" />
              </button>
            </Dropdown>
          )}
        </div>
      </div>
    );
  };

  const recentItems: MenuProps['items'] = recentConversations.map((conversation) => ({
    key: conversation.conversation_id,
    label: <div className="min-w-[180px] truncate text-sm text-[#111827]">{conversation.title}</div>,
    onClick: () => {
      onSelectConversation(conversation.conversation_id);
      setCollapsed(false);
    },
  }));

  const actionButtonClass =
    `flex h-9 w-9 items-center justify-center rounded-[12px] text-[#6B7C93] transition-colors duration-200 ${SIDEBAR_HOVER_CLASS}`;

  if (collapsed) {
    return (
      <aside
        className={`relative flex h-full ${floating ? 'w-[72px]' : 'w-[68px]'} flex-col items-center px-3 py-4`}
      >
        <button
          type="button"
          onClick={() => setCollapsedWithDelay(false)}
          className={`group relative flex h-10 w-10 items-center justify-center rounded-[12px] text-[#6B7C93] transition-colors duration-200 ${SIDEBAR_HOVER_CLASS} ${transitioning ? 'opacity-80' : ''}`}
          title="展开侧边栏"
        >
          {floating ? <SidebarToggleGlyph className="h-5 w-5" /> : <CollapsedBrandToggle />}
          {hasRunningConversation && (
            <span
              className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border border-white bg-[#2e75FE] shadow-[0_0_0_2px_rgba(46,117,254,0.14)]"
              aria-hidden="true"
            />
          )}
        </button>

        <div className="mt-7 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => void handleCreateConversation()}
            className={`flex h-10 w-10 items-center justify-center rounded-[12px] text-[#5f6368] transition-colors duration-200 hover:bg-[#ececec] hover:text-[#111827] active:translate-y-[1px] ${transitioning ? 'opacity-70' : ''}`}
            title="开启新对话"
          >
            <PlusCircleIcon size={19} />
          </button>

            <button
              type="button"
              className={actionButtonClass}
              title="搜索对话内容"
            >
              <Search className="h-[19px] w-[19px]" />
            </button>

          <Dropdown
            menu={{ items: recentItems }}
            trigger={['hover', 'click']}
            placement="bottomRight"
            styles={{ root: { minWidth: 220 } }}
          >
            <button
              type="button"
              className={actionButtonClass}
              title="最近会话"
            >
              <History className="h-[19px] w-[19px]" />
            </button>
          </Dropdown>
        </div>

        <div
          ref={profileRef}
          className="relative mt-auto"
          onMouseEnter={openProfileMenu}
          onMouseLeave={closeProfileMenuWithDelay}
        >
          {profileMenuOpen && (
            <div
              className="absolute bottom-0 left-[calc(100%+10px)] z-50 w-[184px] rounded-[16px] border border-[#e7edf7] bg-white p-2 shadow-[0_20px_50px_rgba(15,23,42,0.12)] before:absolute before:bottom-0 before:right-full before:h-full before:w-3 before:content-['']"
              onMouseEnter={openProfileMenu}
              onMouseLeave={closeProfileMenuWithDelay}
            >
              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen(false);
                  onOpenAssetCenter?.();
                }}
                className="group flex w-full items-center gap-2 rounded-[12px] px-3 py-2 text-left text-[14px] leading-5 text-[#111827] transition-all duration-200 hover:bg-[#f7f9fc] hover:text-[#3f6fff]"
              >
                <Star className="h-4 w-4 text-[#7a7f87] transition-colors duration-200 group-hover:text-[#1f1f1f]" />
                <span>我的资产</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen(false);
                  onOpenAutomationCenter?.();
                }}
                className="group flex w-full items-center gap-2 rounded-[12px] px-3 py-2 text-left text-[14px] leading-5 text-[#111827] transition-all duration-200 hover:bg-[#f7f9fc] hover:text-[#3f6fff]"
              >
                <Bot className="h-4 w-4 text-[#7a7f87] transition-colors duration-200 group-hover:text-[#1f1f1f]" />
                <span>自动化</span>
                {automationUnreadCount > 0 ? (
                  <span className="ml-auto rounded-full bg-[#ef4444] px-1.5 py-0.5 text-[10px] leading-none text-white">
                    {automationUnreadCount > 9 ? '9+' : automationUnreadCount}
                  </span>
                ) : null}
              </button>

              {canAccessAdminCenter ? (
                <Link
                  href="/admin"
                  className="group flex w-full items-center gap-2 rounded-[12px] px-3 py-2 text-[14px] leading-5 text-[#111827] transition-all duration-200 hover:bg-[#f7f9fc] hover:text-[#3f6fff]"
                >
                  <Wrench className="h-4 w-4 text-[#7a7f87] transition-colors duration-200 group-hover:text-[#1f1f1f]" />
                  <span>管理中心</span>
                </Link>
              ) : null}

              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen(false);
                  void logout();
                }}
                className="group flex w-full items-center gap-2 rounded-[12px] px-3 py-2 text-left text-[14px] leading-5 text-[#111827] transition-all duration-200 hover:bg-[#f7f9fc] hover:text-[#3f6fff]"
              >
                <LogOut className="h-4 w-4 text-[#7a7f87] transition-colors duration-200 group-hover:text-[#1f1f1f]" />
                <span>退出登录</span>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setProfileMenuOpen((prev) => !prev)}
            className="flex h-10 w-10 items-center justify-center rounded-full transition-colors duration-200 hover:bg-[#ececec]"
            title={profileName}
            aria-label="个人中心"
          >
            <img
              src={PROFILE_AVATAR}
              alt="用户头像"
              width={30}
              height={30}
              className="h-[30px] w-[30px] rounded-full object-cover"
            />
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className={`group/sidebar sidebar-enter-animation flex h-full w-[248px] flex-col ${floating ? 'backdrop-blur-xl bg-white/70' : ''}`}
      onMouseEnter={handleSidebarMouseEnter}
      onMouseLeave={handleSidebarMouseLeave}
    >
      <div className="px-4 pb-4 pt-5">
        <div className="flex items-center justify-between gap-3">
          <div
            className="flex min-w-0 flex-1 items-center overflow-hidden"
            style={{
              height: floating ? 44 : 40,
              maxWidth: floating ? 184 : 176,
            }}
          >
            <SidebarBrandLogo />
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onOpenSearch}
              className={actionButtonClass}
              title="搜索对话内容"
            >
              <Search className="h-[18px] w-[18px]" />
            </button>

            {floating ? (
              <button
                type="button"
                onClick={onCloseFloating}
                className={actionButtonClass}
                title="关闭侧边栏"
              >
                <X className="h-[18px] w-[18px]" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setCollapsedWithDelay(true)}
                className={`${actionButtonClass} ${transitioning ? 'opacity-80' : ''}`}
                title="收起侧边栏"
              >
                <DesktopSidebarGlyph className="h-[18px] w-[18px]" />
              </button>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleCreateConversation()}
          className={`mx-auto mt-5 flex h-[40px] w-[200px] items-center justify-center gap-2 rounded-[12px] bg-white text-[14px] font-medium text-[#1f2937] shadow-[0_2px_8px_rgba(15,23,42,0.06)] transition-all duration-200 hover:-translate-y-[1px] hover:bg-white hover:shadow-[0_10px_24px_rgba(15,23,42,0.13)] active:translate-y-[1px] active:shadow-[0_5px_14px_rgba(15,23,42,0.1)] ${transitioning ? 'opacity-70' : ''}`}
        >
          <PlusCircleIcon size={18} className="text-[#3f6fff]" />
          开启新对话
        </button>
      </div>

      <div className="relative min-h-0 flex-1">
        <div
          ref={sidebarScrollRef}
          className="sidebar-scroll-area sidebar-custom-scroll-area h-full overflow-y-auto px-2.5 pb-3 pt-1"
        >
          {pinnedConversations.length > 0 && (
            <section className="mb-2.5">
              <div className="ui-label px-2 py-1">置顶</div>
              <div className="space-y-px">
                {pinnedConversations.map((conversation) => renderConversationRow(conversation, true))}
              </div>
            </section>
          )}

          {sections.map((section) => (
            <section key={section} className="mb-2.5">
              <div className="ui-label px-2 py-1">
                {section}
              </div>
              <div className="space-y-px">
                {groupedConversations[section].map((conversation) => renderConversationRow(conversation, false))}
              </div>
            </section>
          ))}
        </div>
        {sidebarScrollThumb.visible ? (
          <div className="pointer-events-none absolute inset-y-1 right-[3px] w-[8px]">
            <div
              className="sidebar-custom-thumb absolute right-0 w-[4px] rounded-full bg-[#c4c7cc]"
              style={{
                height: sidebarScrollThumb.height,
                transform: `translateY(${sidebarScrollThumb.top}px)`,
              }}
            />
          </div>
        ) : null}
      </div>

      <div ref={profileRef} className="relative px-3 py-3">
        {profileMenuOpen && (
          <div className="absolute bottom-[calc(100%+8px)] left-3 right-3 rounded-[16px] border border-[#e7edf7] bg-white p-2 shadow-[0_20px_50px_rgba(15,23,42,0.1)]">
            <button
              type="button"
              onClick={() => {
                setProfileMenuOpen(false);
                onOpenAssetCenter?.();
              }}
              className="group flex w-full items-center gap-2 rounded-[12px] px-3 py-2 text-left text-[14px] leading-5 text-[#111827] transition-all duration-200 hover:bg-[#f7f9fc] hover:text-[#3f6fff]"
            >
              <Star className="h-4 w-4 text-[#7a7f87] transition-colors duration-200 group-hover:text-[#1f1f1f]" />
              <span>我的资产</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setProfileMenuOpen(false);
                onOpenAutomationCenter?.();
              }}
              className="group flex w-full items-center gap-2 rounded-[12px] px-3 py-2 text-left text-[14px] leading-5 text-[#111827] transition-all duration-200 hover:bg-[#f7f9fc] hover:text-[#3f6fff]"
            >
              <Bot className="h-4 w-4 text-[#7a7f87] transition-colors duration-200 group-hover:text-[#1f1f1f]" />
              <span>自动化</span>
              {automationUnreadCount > 0 ? (
                <span className="ml-auto rounded-full bg-[#ef4444] px-1.5 py-0.5 text-[10px] leading-none text-white">
                  {automationUnreadCount > 9 ? '9+' : automationUnreadCount}
                </span>
              ) : null}
            </button>

            {canAccessAdminCenter ? (
              <Link
                href="/admin"
                className="group flex w-full items-center gap-2 rounded-[12px] px-3 py-2 text-[14px] leading-5 text-[#111827] transition-all duration-200 hover:bg-[#f7f9fc] hover:text-[#3f6fff]"
              >
                <Wrench className="h-4 w-4 text-[#7a7f87] transition-colors duration-200 group-hover:text-[#1f1f1f]" />
                <span>管理中心</span>
              </Link>
            ) : null}

            <button
              type="button"
              onClick={() => {
                setProfileMenuOpen(false);
                void logout();
              }}
              className="group flex w-full items-center gap-2 rounded-[12px] px-3 py-2 text-left text-[14px] leading-5 text-[#111827] transition-all duration-200 hover:bg-[#f7f9fc] hover:text-[#3f6fff]"
            >
              <LogOut className="h-4 w-4 text-[#7a7f87] transition-colors duration-200 group-hover:text-[#1f1f1f]" />
              <span>退出登录</span>
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => setProfileMenuOpen((prev) => !prev)}
          className="flex w-full items-center gap-3 rounded-[12px] px-2 py-2 text-left transition-colors hover:bg-[#ececec]"
        >
          <img
            src={PROFILE_AVATAR}
            alt="用户头像"
            width={30}
            height={30}
            className="h-[30px] w-[30px] rounded-full object-cover"
          />
          <div className="min-w-0 flex-1 truncate text-sm font-medium text-[#111827]">{profileName}</div>
          <div className="flex h-7 w-7 items-center justify-center text-[#7a7f87] transition-colors hover:text-[#1f1f1f]">
            <Ellipsis className="h-4 w-4" />
          </div>
        </button>
      </div>
    </aside>
  );
}

'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Dropdown, message, type MenuProps } from 'antd';
import type { Conversation } from '@/types';
import {
  Check,
  Ellipsis,
  History,
  LogOut,
  PencilLine,
  Pin,
  Plus,
  Search,
  Star,
  Trash2,
  Wrench,
  X,
} from 'lucide-react';

interface TaskSidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  defaultCollapsed?: boolean;
  floating?: boolean;
  onCreateConversation: () => Promise<void> | void;
  onSelectConversation: (conversationId: string) => void;
  onRenameConversation: (conversationId: string, title: string) => Promise<void> | void;
  onDeleteConversation: (conversationId: string) => Promise<void> | void;
  onOpenAssetCenter?: () => void;
  onOpenSearch?: () => void;
  onCloseFloating?: () => void;
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
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path d="M5 7H15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M5 13H15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function DesktopSidebarGlyph({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <rect x="3.5" y="4" width="13" height="12" rx="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8.2 4.8V15.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12.8 8L10.8 10L12.8 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SharePlaneIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path d="M4.1 10.2L15.8 4.4L10 16L8.7 11.4L4.1 10.2Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M9 11L15.6 4.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

const SIDEBAR_HOVER_CLASS = 'hover:bg-[#ececec] hover:text-[#111827]';

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
  defaultCollapsed = false,
  floating = false,
  onCreateConversation,
  onSelectConversation,
  onRenameConversation,
  onDeleteConversation,
  onOpenAssetCenter,
  onOpenSearch,
  onCloseFloating,
}: TaskSidebarProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

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

  const handleShare = (conversationTitle: string) => {
    message.success(`已分享到小闪：${conversationTitle}`);
  };

  const handleSaveToKnowledge = (conversationTitle: string) => {
    message.success(`已保存到个人知识库：${conversationTitle}`);
  };

  const renderConversationRow = (conversation: Conversation, pinned: boolean) => {
    const active = conversation.conversation_id === activeConversationId;
    const isEditing = editingId === conversation.conversation_id;

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
          setEditingId(conversation.conversation_id);
          setDraftTitle(conversation.title);
        },
      },
      {
        key: 'share-xiaoshan',
        label: '分享到小闪',
        icon: <SharePlaneIcon className="h-3.5 w-3.5" />,
        onClick: () => handleShare(conversation.title),
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
        danger: true,
        onClick: () => void onDeleteConversation(conversation.conversation_id),
      },
    ];

    return (
      <div
        key={conversation.conversation_id}
        className={`group rounded-[14px] px-2 py-1 ${active ? 'bg-[#edf4ff]' : 'hover:bg-white/92'}`}
      >
        <div className="flex items-start gap-2">
          <button
            type="button"
            onClick={() => onSelectConversation(conversation.conversation_id)}
            className="min-w-0 flex-1 rounded-[12px] px-2 py-2.5 text-left"
          >
            {isEditing ? (
              <input
                autoFocus
                value={draftTitle}
                onChange={(event) => setDraftTitle(event.target.value)}
                onClick={(event) => event.stopPropagation()}
                onKeyDown={async (event) => {
                  if (event.key !== 'Enter') return;
                  const nextTitle = draftTitle.trim();
                  if (!nextTitle) return;
                  await onRenameConversation(conversation.conversation_id, nextTitle);
                  setEditingId(null);
                  setDraftTitle('');
                }}
                className="w-full rounded-[12px] border border-[#d8e3f8] bg-white px-3 py-2 text-sm text-[#111827] outline-none"
              />
            ) : (
              <div className="truncate text-[14px] font-medium text-[#666666] transition-colors group-hover:text-[#3f6fff]">
                {conversation.title}
              </div>
            )}
          </button>

          <div className="flex items-center gap-1 pt-2 opacity-0 transition-opacity group-hover:opacity-100">
            {isEditing ? (
              <button
                type="button"
                onClick={async () => {
                  const nextTitle = draftTitle.trim();
                  if (!nextTitle) return;
                  await onRenameConversation(conversation.conversation_id, nextTitle);
                  setEditingId(null);
                  setDraftTitle('');
                }}
                className="rounded-[10px] p-1.5 text-[#3f6fff] hover:bg-white"
              >
                <Check className="h-4 w-4" />
              </button>
            ) : (
              <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
                <button
                  type="button"
                  className="rounded-[10px] p-1.5 text-[#94a3b8] hover:bg-white hover:text-[#3f6fff]"
                  onClick={(event) => event.stopPropagation()}
                  title="更多"
                >
                  <Ellipsis className="h-4 w-4" />
                </button>
              </Dropdown>
            )}
          </div>
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
    `flex h-9 w-9 items-center justify-center rounded-[12px] text-[#6b7280] transition-colors duration-200 ${SIDEBAR_HOVER_CLASS}`;

  if (collapsed) {
    return (
      <aside
        className={`flex h-full ${floating ? 'w-[72px]' : 'w-[68px] border-r border-[#edf2f7]'} flex-col items-center bg-[#f7f9fc] px-3 py-4`}
      >
        <button
          type="button"
          onClick={() => setCollapsedWithDelay(false)}
          className={`group relative flex h-10 w-10 items-center justify-center rounded-[12px] text-[#6b7280] transition-colors duration-200 ${SIDEBAR_HOVER_CLASS} ${transitioning ? 'opacity-80' : ''}`}
          title="展开侧边栏"
        >
          {floating ? <SidebarToggleGlyph className="h-5 w-5" /> : <DesktopSidebarGlyph className="h-5 w-5" />}
        </button>

        <div className="mt-7 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => void handleCreateConversation()}
            className={`flex h-10 w-10 items-center justify-center rounded-[12px] bg-white text-[#6b7280] shadow-[0_2px_8px_rgba(15,23,42,0.06)] transition-all duration-200 hover:shadow-[0_10px_24px_rgba(15,23,42,0.13)] active:translate-y-[1px] ${transitioning ? 'opacity-70' : ''}`}
            title="开启新对话"
          >
            <Plus className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={onOpenSearch}
            className={actionButtonClass}
            title="搜索对话内容"
          >
            <Search className="h-[18px] w-[18px]" />
          </button>

          <Dropdown
            menu={{ items: recentItems }}
            trigger={['hover', 'click']}
            placement="bottomRight"
            overlayStyle={{ minWidth: 220 }}
          >
            <button
              type="button"
              className={actionButtonClass}
              title="最近会话"
            >
              <History className="h-4 w-4" />
            </button>
          </Dropdown>
        </div>
      </aside>
    );
  }

  return (
    <aside className={`group/sidebar flex h-full w-[248px] flex-col bg-[#f7f9fc] ${floating ? '' : 'border-r border-[#edf2f7]'}`}>
      <div className="px-4 pb-3 pt-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center">
            <Image
              src="/zt-chat-logo-clean.png"
              alt="智投chat"
              width={136}
              height={34}
              priority
              className="h-8 w-auto object-contain"
            />
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
          className={`mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-[12px] bg-white text-[14px] font-medium text-[#1f2937] shadow-[0_2px_8px_rgba(15,23,42,0.06)] transition-all duration-200 hover:bg-white hover:shadow-[0_10px_24px_rgba(15,23,42,0.13)] active:translate-y-[1px] active:shadow-[0_5px_14px_rgba(15,23,42,0.1)] ${transitioning ? 'opacity-70' : ''}`}
        >
          <Plus className="h-4 w-4 text-[#3f6fff]" />
          开启新对话
        </button>
      </div>

      <div className="sidebar-scroll-area min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        {pinnedConversations.length > 0 && (
          <section className="mb-5">
            <div className="px-2 py-2 text-[11px] font-medium uppercase tracking-[0.04em] text-[#9aa3b2]">置顶</div>
            <div className="space-y-1">
              {pinnedConversations.map((conversation) => renderConversationRow(conversation, true))}
            </div>
          </section>
        )}

        {sections.map((section) => (
          <section key={section} className="mb-5">
            <div className="px-2 py-2 text-[11px] font-medium uppercase tracking-[0.04em] text-[#9aa3b2]">
              {section}
            </div>
            <div className="space-y-1">
              {groupedConversations[section].map((conversation) => renderConversationRow(conversation, false))}
            </div>
          </section>
        ))}
      </div>

      <div ref={profileRef} className="relative border-t border-[#f3f5f8] px-3 py-3">
        {profileMenuOpen && (
          <div className="absolute bottom-[calc(100%+8px)] left-3 right-3 rounded-[16px] border border-[#e7edf7] bg-white p-2 shadow-[0_20px_50px_rgba(15,23,42,0.1)]">
            <button
              type="button"
              onClick={() => {
                setProfileMenuOpen(false);
                onOpenAssetCenter?.();
              }}
              className="group flex w-full items-center gap-2 rounded-[12px] px-3 py-2 text-left text-sm text-[#111827] transition-all duration-200 hover:bg-[#f7f9fc] hover:text-[#3f6fff]"
            >
              <Star className="h-4 w-4 text-[#94a3b8] transition-colors duration-200 group-hover:text-[#3f6fff]" />
              <span>我的资产</span>
            </button>

            <Link
              href="/admin"
              className="group flex w-full items-center gap-2 rounded-[12px] px-3 py-2 text-sm text-[#111827] transition-all duration-200 hover:bg-[#f7f9fc] hover:text-[#3f6fff]"
            >
              <Wrench className="h-4 w-4 text-[#94a3b8] transition-colors duration-200 group-hover:text-[#3f6fff]" />
              <span>管理中心</span>
            </Link>

            <button
              type="button"
              className="group flex w-full items-center gap-2 rounded-[12px] px-3 py-2 text-left text-sm text-[#111827] transition-all duration-200 hover:bg-[#f7f9fc] hover:text-[#3f6fff]"
            >
              <LogOut className="h-4 w-4 text-[#94a3b8] transition-colors duration-200 group-hover:text-[#3f6fff]" />
              <span>退出登录</span>
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => setProfileMenuOpen((prev) => !prev)}
          className="flex w-full items-center gap-3 rounded-[12px] px-2 py-2 text-left transition-colors hover:bg-[#ececec]"
        >
          <Image
            src={PROFILE_AVATAR}
            alt="用户头像"
            width={36}
            height={36}
            className="h-9 w-9 rounded-full object-cover"
          />
          <div className="min-w-0 flex-1 truncate text-sm font-medium text-[#111827]">吴燕兰</div>
          <div className="flex h-7 w-7 items-center justify-center text-[#94a3b8] transition-colors hover:text-[#3f6fff]">
            <Ellipsis className="h-4 w-4" />
          </div>
        </button>
      </div>
    </aside>
  );
}

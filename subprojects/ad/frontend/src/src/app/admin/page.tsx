'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { AiadUserInfo } from '@/lib/auth-service';
import type { AdminAccessSnapshot } from '@/lib/admin-access-types';
import {
  type AdminTab,
  type AdminCenterKey,
  readStoredAdminTab,
  writeClientStorage,
  ADMIN_TAB_STORAGE_KEY,
} from '@/components/admin/admin-tab-helpers';
import {
  ADMIN_CENTERS,
  ADMIN_MENU_BY_TAB,
  ADMIN_CENTER_BY_KEY,
  getCenterMenuItems,
  RuntimeImpactBadge,
} from '@/components/admin/admin-menu';

type TabComponentProps = {
  onJump?: (tab: AdminTab) => void;
  visibleTabs?: AdminTab[];
};

const AdminTabLoading = () => (
  <main className="flex-1 overflow-auto bg-white">
    <div className="mx-auto w-full max-w-[1480px] space-y-4 px-4 py-5 md:px-6">
      <div className="h-8 w-52 animate-pulse rounded bg-[#edf3fb]" />
      <div className="grid gap-3 md:grid-cols-3">
        <div className="h-28 animate-pulse rounded-lg border border-[#e6edf7] bg-[#f8fbff]" />
        <div className="h-28 animate-pulse rounded-lg border border-[#e6edf7] bg-[#f8fbff]" />
        <div className="h-28 animate-pulse rounded-lg border border-[#e6edf7] bg-[#f8fbff]" />
      </div>
      <div className="h-[420px] animate-pulse rounded-lg border border-[#e6edf7] bg-[#fbfdff]" />
    </div>
  </main>
);

const loadTab = <T extends TabComponentProps>(
  loader: () => Promise<Record<string, ComponentType<T>>>,
  exportName: string,
) => dynamic<T>(
  () => loader().then((module) => module[exportName]),
  { loading: AdminTabLoading },
);

const AdminOverviewTab = loadTab(
  () => import('@/components/admin/AdminOverviewTab'),
  'AdminOverviewTab',
);
const ChatDisplaySettingsTab = loadTab(
  () => import('@/components/admin/ChatDisplaySettingsTab'),
  'ChatDisplaySettingsTab',
);
const AutomationTemplateManagementTab = loadTab(
  () => import('@/components/admin/AutomationTemplateManagementTab'),
  'AutomationTemplateManagementTab',
);
const PromptManagementTab = loadTab(
  () => import('@/components/admin/PromptManagementTab'),
  'PromptManagementTab',
);
const FeatureSwitchesTab = loadTab(
  () => import('@/components/admin/FeatureSwitchesTab'),
  'FeatureSwitchesTab',
);
const AutoDebugConfigTab = loadTab(
  () => import('@/components/admin/AutoDebugConfigTab'),
  'AutoDebugConfigTab',
);
const DemandPoolTab = loadTab(
  () => import('@/components/admin/DemandPoolTab'),
  'DemandPoolTab',
);
const McpConfigTab = loadTab(
  () => import('@/components/admin/McpConfigTab'),
  'McpConfigTab',
);
const SkillManagementTab = loadTab(
  () => import('@/components/admin/SkillManagementTab'),
  'SkillManagementTab',
);
const TraceConfigTab = loadTab(
  () => import('@/components/admin/TraceConfigTab'),
  'TraceConfigTab',
);
const UserManagementTab = loadTab(
  () => import('@/components/admin/UserManagementTab'),
  'UserManagementTab',
);
const RoleProfileManagementTab = loadTab(
  () => import('@/components/admin/RoleProfileManagementTab'),
  'RoleProfileManagementTab',
);
const WorkflowManagementTab = loadTab(
  () => import('@/components/admin/WorkflowManagementTab'),
  'WorkflowManagementTab',
);
const OperationLogsTab = loadTab(
  () => import('@/components/admin/OperationLogsTab'),
  'OperationLogsTab',
);
const IntentRouteRulesTab = loadTab(
  () => import('@/components/admin/IntentRouteRulesTab'),
  'IntentRouteRulesTab',
);
const OrchestrationGovernanceTab = loadTab(
  () => import('@/components/admin/OrchestrationGovernanceTab'),
  'OrchestrationGovernanceTab',
);
const RuntimeObservabilityTab = loadTab(
  () => import('@/components/admin/RuntimeObservabilityTab'),
  'RuntimeObservabilityTab',
);
const EntityResolutionConfigTab = loadTab(
  () => import('@/components/admin/EntityResolutionConfigTab'),
  'EntityResolutionConfigTab',
);
const PublicWebConfigTab = loadTab(
  () => import('@/components/admin/PublicWebConfigTab'),
  'PublicWebConfigTab',
);

const ALL_ADMIN_TABS: AdminTab[] = [
  'overview', 'service-config', 'chat-display', 'public-web-config',
  'automation-templates', 'prompts', 'orchestration', 'entity-resolution',
  'intent-rules', 'role-profiles', 'workflow', 'skills', 'feature-switches',
  'auto-debug-config', 'demand-pool', 'mcp-config', 'users', 'operation-logs',
  'runtime-observability',
];

function persistAdminTab(tab: AdminTab) {
  writeClientStorage(ADMIN_TAB_STORAGE_KEY, tab);
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.set('tab', tab);
  window.history.replaceState(null, '', url.toString());
}

export default function AdminPage() {
  useEffect(() => {
    document.title = '小乔智投-配置管理';
  }, []);

  const [adminTab, setAdminTabRaw] = useState<AdminTab>('overview');
  const [selectedCenterKey, setSelectedCenterKey] = useState<AdminCenterKey | null>(null);
  const [currentUser, setCurrentUser] = useState<AiadUserInfo | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const loadAuth = async () => {
      try {
        const response = await fetch('/api/xiaoqiao/auth/me', { cache: 'no-store' });
        const payload = await response.json().catch(() => ({})) as { user?: AiadUserInfo };
        if (!response.ok || !payload.user) {
          throw new Error('未能获取当前用户信息');
        }
        if (!cancelled) {
          setCurrentUser(payload.user);
        }
      } catch {
        if (!cancelled) {
          setCurrentUser(null);
        }
      } finally {
        if (!cancelled) {
          setAuthLoading(false);
        }
      }
    };
    void loadAuth();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const stored = readStoredAdminTab();
    if (stored !== 'overview') {
      setAdminTabRaw(stored);
    }
  }, []);

  const adminAccess: AdminAccessSnapshot = currentUser?.admin_access || {
    is_super_admin: false,
    can_view_admin: false,
    can_operate_admin: false,
    can_manage_users: false,
  };
  const isSuperAdmin = adminAccess.is_super_admin || adminAccess.can_manage_users;
  const canOperateAdmin = adminAccess.can_operate_admin || adminAccess.is_super_admin;
  const canViewAdmin = adminAccess.can_view_admin || canOperateAdmin;
  const visibleTabs = useMemo(
    () => {
      return ALL_ADMIN_TABS.filter((tab) => {
        if (tab === 'overview') return true;
        return (tab === 'users' || tab === 'operation-logs') ? isSuperAdmin : canViewAdmin;
      });
    },
    [canViewAdmin, isSuperAdmin],
  );

  const setAdminTab = (tab: AdminTab) => {
    if (!visibleTabs.includes(tab)) return;
    setSelectedCenterKey(ADMIN_MENU_BY_TAB[tab]?.center || 'home');
    setAdminTabRaw(tab);
    persistAdminTab(tab);
  };

  const setAdminCenter = (center: typeof ADMIN_CENTERS[number]) => {
    const fallbackTab = getCenterMenuItems(center.key, visibleTabs)[0]?.tab || center.defaultTab;
    if (!visibleTabs.includes(fallbackTab)) return;
    setSelectedCenterKey(center.key);
    setAdminTabRaw(fallbackTab);
    persistAdminTab(fallbackTab);
  };

  useEffect(() => {
    if (authLoading) return;
    if (!visibleTabs.includes(adminTab)) {
      setAdminTab(visibleTabs[0] || 'overview');
    }
  }, [adminTab, authLoading, setAdminTab, visibleTabs]);

  const activeCenterKey = selectedCenterKey || ADMIN_MENU_BY_TAB[adminTab]?.center || 'home';
  const visibleCenters = ADMIN_CENTERS.filter((center) => (
    visibleTabs.includes(center.defaultTab) || getCenterMenuItems(center.key, visibleTabs).length > 0
  ));
  const activeCenter = ADMIN_CENTER_BY_KEY[activeCenterKey] || ADMIN_CENTER_BY_KEY.home;
  const activeCenterItems = getCenterMenuItems(activeCenter.key, visibleTabs);
  const activeMenuItem = ADMIN_MENU_BY_TAB[adminTab];
  const activeImpacts = Array.from(new Set((activeMenuItem?.impacts || activeCenterItems.flatMap((item) => item.impacts))));

  return (
    <div className="admin-page min-h-screen bg-white text-[#1f2937]">
      <div className="flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-[292px] shrink-0 flex-col border-r border-[#dbe4f0] bg-[#f8fbff] lg:flex">
          <div className="border-b border-[#e6edf7] px-4 py-4">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="rounded-lg p-2 text-[#5b6b82] transition-colors hover:bg-[#e8eef7]"
                aria-label="返回首页"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div className="min-w-0">
                <h1 className="text-base font-semibold text-[#10233f]">智能体配置中枢</h1>
                <p className="mt-0.5 truncate text-[11px] text-[#6b7c93]">统一管理能力、提示词和展示配置</p>
              </div>
            </div>
            {authLoading ? (
              <div className="mt-3 h-6 animate-pulse rounded bg-[#edf3fb]" />
            ) : (
              <div className={`mt-3 rounded-lg border px-3 py-2 text-[11px] ${
                canOperateAdmin
                  ? 'border-[#b7ebc6] bg-[#f0fff5] text-[#087a2f]'
                  : canViewAdmin
                    ? 'border-[#dbe4f0] bg-white text-[#5b6b82]'
                    : 'border-[#ffc9c9] bg-[#fff2f2] text-[#b42318]'
              }`}
              >
                {canOperateAdmin
                  ? '当前账号可查看并编辑配置'
                  : canViewAdmin
                    ? '当前账号可查看配置'
                    : '当前账号暂无管理权限'}
              </div>
            )}
          </div>

          <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-3" aria-label="管理中心导航">
            <div className="space-y-1">
              {visibleCenters.map((center) => {
                const centerItems = getCenterMenuItems(center.key, visibleTabs);
                const CenterIcon = center.icon;
                const isCenterActive = activeCenter.key === center.key;
                return (
                  <section key={center.key} className="rounded-lg">
                    <button
                      type="button"
                      onClick={() => setAdminCenter(center)}
                      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors ${
                        isCenterActive
                          ? 'bg-white text-[#0f6fff] ring-1 ring-[#c8dcff]'
                          : 'text-[#486078] hover:bg-white hover:text-[#1d4f91]'
                      }`}
                    >
                      <CenterIcon className="h-4 w-4 shrink-0" />
                      <span className="min-w-0 flex-1 truncate text-[12px] font-semibold">{center.label}</span>
                      <ChevronRight className={`h-3.5 w-3.5 shrink-0 transition-transform ${isCenterActive ? 'rotate-90' : ''}`} />
                    </button>
                    {isCenterActive && centerItems.length > 0 ? (
                      <div className="mt-1 space-y-1 pl-4">
                        {centerItems.map((item) => {
                          const ItemIcon = item.icon;
                          const isActive = adminTab === item.tab;
                          return (
                            <button
                              key={`${center.key}-${item.tab}`}
                              type="button"
                              onClick={() => setAdminTab(item.tab)}
                              className={`group flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left transition-colors ${
                                isActive
                                  ? 'bg-[#eef5ff] text-[#0f6fff]'
                                  : 'text-[#5b6b82] hover:bg-white hover:text-[#1d4f91]'
                              }`}
                            >
                              <ItemIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                              <span className="min-w-0">
                                <span className="block text-[12px] font-medium leading-5">{item.label}</span>
                                <span className={`mt-0.5 block text-[11px] leading-4 ${isActive ? 'text-[#3e7cd8]' : 'text-[#8ea0b8]'}`}>
                                  {item.description}
                                </span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </section>
                );
              })}
            </div>
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-[#dbe4f0] bg-[rgba(248,251,255,0.95)] backdrop-blur">
            <div className="flex items-center justify-between gap-4 px-4 py-3 md:px-6 lg:hidden">
              <div className="flex items-center gap-4">
                <Link
                  href="/"
                  className="rounded-lg p-2 text-[#5b6b82] transition-colors hover:bg-[#e8eef7]"
                  aria-label="返回首页"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                  <h1 className="text-base font-semibold text-[#10233f]">智能体配置中枢</h1>
                  <p className="text-[11px] text-[#6b7c93]">统一管理能力、提示词和展示配置</p>
                </div>
              </div>
            </div>
            <div className="hidden items-center justify-between gap-4 px-6 py-4 lg:flex">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[12px] text-[#8ea0b8]">
                  <span>{activeCenter.label}</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                  <span className="text-[#5b6b82]">{activeMenuItem?.label || '总览'}</span>
                </div>
                <h2 className="mt-1 text-xl font-semibold text-[#10233f]">{activeMenuItem?.label || activeCenter.label}</h2>
                <p className="mt-1 text-sm text-[#6b7c93]">{activeMenuItem?.description || activeCenter.description}</p>
              </div>
              <div className="hidden shrink-0 flex-wrap justify-end gap-1.5 xl:flex">
                {activeImpacts.map((impact) => (
                  <RuntimeImpactBadge key={impact} impact={impact} />
                ))}
              </div>
            </div>

            <div className="lg:hidden">
              <div className="flex gap-1 overflow-x-auto px-3 scrollbar-hide">
                {visibleCenters.map((center) => (
                  <button
                    key={center.key}
                    type="button"
                    onClick={() => setAdminCenter(center)}
                    className={`flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-3 text-xs transition-colors ${
                      activeCenter.key === center.key
                        ? 'border-[#0f6fff] text-[#0f6fff]'
                        : 'border-transparent text-[#6b7c93] hover:text-[#1d4f91]'
                    }`}
                  >
                    <center.icon className="h-3.5 w-3.5" />
                    {center.label}
                  </button>
                ))}
              </div>
              {activeCenterItems.length > 0 ? (
                <div className="border-t border-[#e6edf7] bg-white px-3 py-2">
                  <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                    {activeCenterItems.map((item) => (
                      <button
                        key={`${activeCenter.key}-${item.tab}`}
                        type="button"
                        onClick={() => setAdminTab(item.tab)}
                        className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] transition-colors ${
                          adminTab === item.tab
                            ? 'border-[#0f6fff] bg-[#eef5ff] text-[#0f6fff]'
                            : 'border-[#dbe4f0] bg-[#f8fbff] text-[#5b6b82] hover:border-[#b8cae6] hover:bg-white'
                        }`}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <item.icon className="h-3.5 w-3.5" />
                          {item.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </header>

          {/* Tab Content */}
          {adminTab === 'overview' && <AdminOverviewTab onJump={setAdminTab} visibleTabs={visibleTabs} />}
          {adminTab === 'service-config' && <TraceConfigTab />}
          {adminTab === 'chat-display' && <ChatDisplaySettingsTab />}
          {adminTab === 'automation-templates' && <AutomationTemplateManagementTab />}
          {adminTab === 'prompts' && <PromptManagementTab />}
          {adminTab === 'orchestration' && <OrchestrationGovernanceTab />}
          {adminTab === 'entity-resolution' && <EntityResolutionConfigTab />}
          {adminTab === 'public-web-config' && <PublicWebConfigTab />}
          {adminTab === 'intent-rules' && <IntentRouteRulesTab />}
          {adminTab === 'role-profiles' && <RoleProfileManagementTab />}
          {adminTab === 'workflow' && <WorkflowManagementTab />}
          {adminTab === 'skills' && <SkillManagementTab onJump={setAdminTab} />}
          {adminTab === 'feature-switches' && <FeatureSwitchesTab />}
          {adminTab === 'auto-debug-config' && <AutoDebugConfigTab />}
          {adminTab === 'demand-pool' && <DemandPoolTab />}
          {adminTab === 'mcp-config' && <McpConfigTab />}
          {adminTab === 'users' && <UserManagementTab />}
          {adminTab === 'operation-logs' && <OperationLogsTab />}
          {adminTab === 'runtime-observability' && <RuntimeObservabilityTab />}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import YkProjectSelect, { type YkProjectOption } from '@/components/yokaui/YkProjectSelect';
import { useThemeColors } from '@/hooks/useTheme';
import { getStoredAuthToken, resetAiadProject } from '@/lib/auth-service';
import { useAuth } from '@/hooks/useAuth';
import defaultProjectIcon from '../../../node_modules/@yoka-ui/ui/dist/es/business/YkPorjectSelect/icon-product.png';

interface ProjectOption {
  app_id: string | number;
  app_name: string;
  app_alias?: string;
  app_en_name?: string;
  app_status?: string | number;
  icon?: string;
  is_current?: boolean;
  is_favorite?: boolean;
}

export interface CurrentProjectMetadata {
  appId?: string | number;
  appName?: string;
  appAlias?: string;
  source: 'project_selector';
  selectedAt: string;
}

interface ProjectSelectorComboProps {
  selectedProjectId?: string | number | null;
  onContextChange?: (text: string) => void;
  onProjectLoadStateChange?: (state: { status: ProjectLoadStatus; contextText: string; currentProject: CurrentProjectMetadata | null }) => void;
}

const NO_PROJECT_VALUE = '__none__';
const RECENT_PROJECT_STORAGE_KEY = 'zhitou-chat-recent-projects';
const SELECTED_PROJECT_STORAGE_KEY = 'zhitou-chat-selected-project';
const CACHED_PROJECT_STORAGE_KEY = 'zhitou-chat-current-project';
type ProjectLoadStatus = 'loading' | 'ready' | 'failed';

function normalizeProjectId(value: string | number): string {
  return String(value);
}

function trimRecentProjectIds(ids: Array<string | number>, maxSize = 3): Array<string | number> {
  const result: Array<string | number> = [];
  const seen = new Set<string>();

  ids.forEach((item) => {
    const normalized = normalizeProjectId(item);
    if (seen.has(normalized)) return;
    seen.add(normalized);
    result.push(item);
  });

  return result.slice(0, maxSize);
}

function getDefaultProjectIcon(): string {
  if (typeof defaultProjectIcon === 'string') return defaultProjectIcon;
  if (defaultProjectIcon && typeof defaultProjectIcon === 'object' && 'src' in defaultProjectIcon) {
    return String((defaultProjectIcon as { src?: unknown }).src || '');
  }
  return String(defaultProjectIcon || '');
}

function normalizeProjectIcon(icon: string | undefined, fallbackIcon: string): string {
  const value = icon?.trim();
  if (!value) return fallbackIcon;
  if (/^(data:|blob:|\/|\.\/|\.\.\/)/i.test(value)) return value;
  try {
    const url = new URL(value);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return `/api/xiaoqiao/project-icon?src=${encodeURIComponent(url.toString())}`;
    }
    if (typeof window !== 'undefined' && url.origin === window.location.origin) return value;
  } catch {
    // Treat malformed values as unsafe for first screen rendering.
  }
  return fallbackIcon;
}

function readStoredSelectedProjectId(): string | number {
  if (typeof window === 'undefined') return NO_PROJECT_VALUE;
  try {
    const raw = window.localStorage.getItem(SELECTED_PROJECT_STORAGE_KEY);
    if (!raw) return NO_PROJECT_VALUE;
    const parsed = JSON.parse(raw) as string | number;
    if (typeof parsed === 'string' || typeof parsed === 'number') return parsed;
  } catch {
    // ignore malformed local state
  }
  return NO_PROJECT_VALUE;
}

function readCachedProjectOption(): ProjectOption | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CACHED_PROJECT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ProjectOption>;
    if (
      (typeof parsed.app_id === 'string' || typeof parsed.app_id === 'number') &&
      typeof parsed.app_name === 'string' &&
      parsed.app_name.trim()
    ) {
      return {
        app_id: parsed.app_id,
        app_name: parsed.app_name,
        app_alias: typeof parsed.app_alias === 'string' ? parsed.app_alias : undefined,
        app_en_name: typeof parsed.app_en_name === 'string' ? parsed.app_en_name : undefined,
        icon: typeof parsed.icon === 'string' ? parsed.icon : undefined,
        is_current: true,
      };
    }
  } catch {
    // ignore malformed local state
  }
  return null;
}

function persistCachedProjectOption(project: ProjectOption | null) {
  if (typeof window === 'undefined') return;
  try {
    if (!project) {
      window.localStorage.removeItem(CACHED_PROJECT_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(CACHED_PROJECT_STORAGE_KEY, JSON.stringify({
      app_id: project.app_id,
      app_name: project.app_name,
      app_alias: project.app_alias,
      app_en_name: project.app_en_name,
      icon: project.icon,
    }));
  } catch {
    // localStorage may be unavailable.
  }
}

function clearStoredProjectSelection() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(SELECTED_PROJECT_STORAGE_KEY);
    persistCachedProjectOption(null);
  } catch {
    // localStorage may be unavailable.
  }
}

function buildProjectContextText(project: ProjectOption | null, selectedProjectId: string | number): string {
  if (selectedProjectId === NO_PROJECT_VALUE || !project) return '项目范围：未选择项目';
  return `项目范围：${project.app_name}(APPID:${project.app_id})`;
}

function buildCurrentProject(project: ProjectOption | null, selectedProjectId: string | number): CurrentProjectMetadata | null {
  if (selectedProjectId === NO_PROJECT_VALUE || !project) return null;
  return {
    appId: project.app_id,
    appName: project.app_name,
    appAlias: project.app_alias,
    source: 'project_selector',
    selectedAt: new Date().toISOString(),
  };
}

export async function resolveProjectFromTarget(target: string): Promise<CurrentProjectMetadata | null> {
  const keyword = target.trim();
  if (!keyword) return null;
  const params = new URLSearchParams({
    page: '1',
    page_size: 'all',
    all: 'true',
    keyword,
    _ts: String(Date.now()),
  });
  const response = await fetch(`/api/xiaoqiao/projects?${params.toString()}`, {
    cache: 'no-store',
  });
  if (!response.ok) return null;
  const payload = await response.json() as {
    projects?: Array<{
      app_id?: string | number;
      app_name?: string;
      app_alias?: string;
      app_en_name?: string;
    }>;
  };
  const projects = Array.isArray(payload.projects) ? payload.projects : [];
  if (projects.length === 0) return null;
  const normalizedKeyword = keyword.toLowerCase();
  const exact = projects.find((project) => (
    String(project.app_id ?? '').trim() === keyword
    || String(project.app_name ?? '').trim().toLowerCase() === normalizedKeyword
    || String(project.app_alias ?? '').trim().toLowerCase() === normalizedKeyword
    || String(project.app_en_name ?? '').trim().toLowerCase() === normalizedKeyword
  ));
  if (exact) {
    return {
      appId: exact.app_id,
      appName: exact.app_name,
      appAlias: exact.app_alias,
      selectedAt: new Date().toISOString(),
      source: 'project_selector',
    };
  }
  if (projects.length === 1) {
    return {
      appId: projects[0].app_id,
      appName: projects[0].app_name,
      appAlias: projects[0].app_alias,
      selectedAt: new Date().toISOString(),
      source: 'project_selector',
    };
  }
  const matched = projects.filter((project) => (
    String(project.app_name ?? '').toLowerCase().includes(normalizedKeyword)
    || String(project.app_alias ?? '').toLowerCase().includes(normalizedKeyword)
    || String(project.app_en_name ?? '').toLowerCase().includes(normalizedKeyword)
  ));
  if (matched.length !== 1) return null;
  const candidate = matched[0];
  if (!candidate?.app_id) return null;
  return {
    appId: candidate.app_id,
    appName: candidate.app_name,
    appAlias: candidate.app_alias,
    selectedAt: new Date().toISOString(),
    source: 'project_selector',
  };
}

export default function ProjectSelectorCombo({
  selectedProjectId: selectedProjectIdOverride,
  onContextChange,
  onProjectLoadStateChange,
}: ProjectSelectorComboProps) {
  const c = useThemeColors();
  const { refresh } = useAuth();
  const [projectOptions, setProjectOptions] = useState<ProjectOption[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | number>(NO_PROJECT_VALUE);
  const [projectLoadStatus, setProjectLoadStatus] = useState<ProjectLoadStatus>('loading');
  const [recentProjectIds, setRecentProjectIds] = useState<Array<string | number>>([]);
  const [followedProjectIds, setFollowedProjectIds] = useState<Array<string | number>>([]);

  useEffect(() => {
    if (selectedProjectIdOverride === undefined || selectedProjectIdOverride === null) return;
    setSelectedProjectId((current) => (
      String(current) === String(selectedProjectIdOverride) ? current : selectedProjectIdOverride
    ));
  }, [selectedProjectIdOverride]);

  useEffect(() => {
    setSelectedProjectId(readStoredSelectedProjectId());
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let initialLoadTimer: number | null = null;
    let retryTimer: number | null = null;

    const loadProjects = async (retryCount = 0): Promise<void> => {
      try {
        const params = new URLSearchParams({
          page: '1',
          page_size: 'all',
          all: 'true',
          _ts: String(Date.now()),
        });
        const response = await fetch(`/api/xiaoqiao/projects?${params.toString()}`, {
          signal: controller.signal,
          cache: 'no-store',
        });
        if (!response.ok) {
          if (response.status >= 500 && retryCount < 2) {
            retryTimer = window.setTimeout(() => {
              void loadProjects(retryCount + 1);
            }, 1500);
            return;
          }
          setProjectOptions([]);
          setSelectedProjectId(NO_PROJECT_VALUE);
          clearStoredProjectSelection();
          setProjectLoadStatus('failed');
          return;
        }
        const payload = await response.json() as { projects?: ProjectOption[] };
        const projects = Array.isArray(payload.projects) ? payload.projects : [];
        if (projects.length === 0) {
          setProjectOptions([]);
          setSelectedProjectId(NO_PROJECT_VALUE);
          clearStoredProjectSelection();
          setProjectLoadStatus('failed');
          return;
        }
        setProjectOptions(projects);
        setSelectedProjectId((current) => {
          if (current !== NO_PROJECT_VALUE && projects.some((project) => String(project.app_id) === String(current))) {
            persistCachedProjectOption(projects.find((project) => String(project.app_id) === String(current)) || null);
            return current;
          }
          const currentProject = projects.find((project) => project.is_current) || projects[0];
          persistCachedProjectOption(currentProject || null);
          return currentProject?.app_id || NO_PROJECT_VALUE;
        });
        setProjectLoadStatus('ready');
      } catch {
        if (!controller.signal.aborted) {
          setProjectOptions([]);
          setSelectedProjectId(NO_PROJECT_VALUE);
          clearStoredProjectSelection();
          setProjectLoadStatus('failed');
        }
      }
    };

    initialLoadTimer = window.setTimeout(() => {
      void loadProjects();
    }, 300);

    return () => {
      controller.abort();
      if (initialLoadTimer) {
        window.clearTimeout(initialLoadTimer);
      }
      if (retryTimer) {
        window.clearTimeout(retryTimer);
      }
    };
  }, []);

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
    try {
      const recentRaw = window.localStorage.getItem(RECENT_PROJECT_STORAGE_KEY);
      if (recentRaw) {
        const parsedRecent = JSON.parse(recentRaw);
        if (Array.isArray(parsedRecent)) {
          setRecentProjectIds(
            trimRecentProjectIds(
              parsedRecent.filter((item): item is string | number => (
                typeof item === 'string' || typeof item === 'number'
              )),
            ),
          );
        }
      }
      const raw = window.localStorage.getItem(SELECTED_PROJECT_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as string | number;
      if (typeof parsed === 'string' || typeof parsed === 'number') {
        setSelectedProjectId(parsed);
        setRecentProjectIds((prev) => {
          if (prev.some((item) => normalizeProjectId(item) === normalizeProjectId(parsed))) {
            return prev;
          }
          return trimRecentProjectIds([parsed, ...prev]);
        });
      }
    } catch {
      // ignore malformed local state
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('zhitou-chat-followed-projects', JSON.stringify(followedProjectIds));
  }, [followedProjectIds]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (recentProjectIds.length > 0) {
      window.localStorage.setItem(RECENT_PROJECT_STORAGE_KEY, JSON.stringify(recentProjectIds));
    } else {
      window.localStorage.removeItem(RECENT_PROJECT_STORAGE_KEY);
    }
  }, [recentProjectIds]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (selectedProjectId === NO_PROJECT_VALUE) {
      window.localStorage.removeItem(SELECTED_PROJECT_STORAGE_KEY);
      persistCachedProjectOption(null);
      return;
    }
    window.localStorage.setItem(SELECTED_PROJECT_STORAGE_KEY, JSON.stringify(selectedProjectId));
  }, [selectedProjectId]);

  const selectedProject = useMemo(
    () => projectOptions.find((project) => String(project.app_id) === String(selectedProjectId)) || null,
    [projectOptions, selectedProjectId],
  );

  const projectContextText = useMemo(
    () => buildProjectContextText(selectedProject, selectedProjectId),
    [selectedProject, selectedProjectId],
  );

  const currentProject = useMemo(
    () => buildCurrentProject(selectedProject, selectedProjectId),
    [selectedProject, selectedProjectId],
  );

  useEffect(() => {
    if (projectLoadStatus === 'loading') return;
    onContextChange?.(projectContextText);
    onProjectLoadStateChange?.({ status: projectLoadStatus, contextText: projectContextText, currentProject });
  }, [currentProject, onContextChange, onProjectLoadStateChange, projectContextText, projectLoadStatus]);

  const selectedLabel = selectedProjectId === NO_PROJECT_VALUE
    ? '请选择项目'
    : selectedProject?.app_name || '请选择项目';
  const fallbackProjectIcon = getDefaultProjectIcon();
  const selectedProjectIcon = selectedProjectId === NO_PROJECT_VALUE ? '' : normalizeProjectIcon(selectedProject?.icon, fallbackProjectIcon);
  const selectedProjectColor = selectedProjectId === NO_PROJECT_VALUE ? '#9ca3af' : c.textPrimary;

  const handleSelect = useCallback(async (value: string | number) => {
    if (value === NO_PROJECT_VALUE) {
      setSelectedProjectId(value);
      persistCachedProjectOption(null);
      return;
    }
    const normalizedValue = Number.isNaN(Number(value)) ? value : Number(value);
    setSelectedProjectId(normalizedValue);
    persistCachedProjectOption(projectOptions.find((project) => String(project.app_id) === String(normalizedValue)) || null);
    setRecentProjectIds((prev) => trimRecentProjectIds([normalizedValue, ...prev]));
    const token = getStoredAuthToken();
    if (token) {
      await resetAiadProject(token, normalizedValue).catch(() => undefined);
      await refresh().catch(() => undefined);
    }
  }, [projectOptions, refresh]);

  const options = useMemo<YkProjectOption[]>(() => {
    const followedSet = new Set(followedProjectIds.map((id) => String(id)));
    const followedIndexMap = new Map(followedProjectIds.map((id, index) => [String(id), index + 1] as const));
    const recentSet = new Set(recentProjectIds.map((id) => normalizeProjectId(id)));
    const recentOrderMap = new Map(recentProjectIds.map((id, index) => [normalizeProjectId(id), index] as const));
    const orderedProjectOptions = [...projectOptions].sort((left, right) => {
      const leftRecent = recentOrderMap.has(normalizeProjectId(left.app_id));
      const rightRecent = recentOrderMap.has(normalizeProjectId(right.app_id));
      if (leftRecent && rightRecent) {
        return (recentOrderMap.get(normalizeProjectId(left.app_id)) || 0) - (recentOrderMap.get(normalizeProjectId(right.app_id)) || 0);
      }
      if (leftRecent) return -1;
      if (rightRecent) return 1;
      return 0;
    });
    return orderedProjectOptions.map((project) => ({
      label: project.app_name || `APPID ${project.app_id}`,
      value: project.app_id,
      icon: normalizeProjectIcon(project.icon, fallbackProjectIcon),
      followed: followedSet.has(String(project.app_id)),
      follow_index: followedIndexMap.get(String(project.app_id)),
      recent_visit: recentSet.has(normalizeProjectId(project.app_id)),
      closed: false,
    }));
  }, [fallbackProjectIcon, followedProjectIds, projectOptions, recentProjectIds]);

  const customShow = (
    <button
      type="button"
      className="project-select-trigger"
      style={{
        maxWidth: 360,
        minWidth: 0,
        width: 'fit-content',
        flexShrink: 1,
        height: 38,
        borderRadius: 10,
        border: `1px solid #d1d5db`,
        background: 'transparent',
        boxShadow: 'none',
        color: selectedProjectColor,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: 8,
        padding: '0 11px 0 7px',
        fontSize: 13,
        fontWeight: 500,
      }}
      title={projectContextText}
    >
      <span
        style={{
          width: 24,
          height: 24,
          borderRadius: 7,
          overflow: 'hidden',
          flexShrink: 0,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: selectedProjectId === NO_PROJECT_VALUE ? 'rgba(148, 163, 184, 0.10)' : c.accentBgFaint,
          color: '#4c7dff',
          fontSize: 11,
          fontWeight: 600,
          boxShadow: 'inset 0 0 0 1px rgba(46,117,254,0.12)',
        }}
      >
        {selectedProjectIcon ? (
          <img src={selectedProjectIcon} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : null}
      </span>
      <span className="project-select-label" style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {selectedLabel}
      </span>
      <span style={{ marginLeft: 'auto', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M1 1L5 5L9 1" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </span>
    </button>
  );

  return (
    <YkProjectSelect
      value={selectedProjectId}
      options={options}
      onChange={handleSelect}
      followedCallback={(item, followed) => {
        setFollowedProjectIds((prev) => {
          const normalized = String(item.value);
          return followed
            ? Array.from(new Set([...prev, normalized]))
            : prev.filter((id) => String(id) !== normalized);
        });
      }}
      customShow={customShow}
      maxVisibleItems={9}
    />
  );
}

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import YkProjectSelect, { type YkProjectOption } from '@/components/yokaui/YkProjectSelect';
import { useThemeColors } from '@/hooks/useTheme';
import defaultProjectIcon from '../../../node_modules/@yoka-ui/ui/dist/es/business/YkPorjectSelect/icon-product.png';

interface ProjectOption {
  app_id: string | number;
  app_name: string;
  app_alias?: string;
  app_en_name?: string;
  app_status?: string | number;
  icon?: string;
}

interface ProjectSelectorComboProps {
  onContextChange?: (text: string) => void;
}

const NO_PROJECT_VALUE = '__none__';
const RECENT_PROJECT_STORAGE_KEY = 'zhitou-chat-recent-projects';
const SELECTED_PROJECT_STORAGE_KEY = 'zhitou-chat-selected-project';

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

export default function ProjectSelectorCombo({ onContextChange }: ProjectSelectorComboProps) {
  const c = useThemeColors();
  const [projectOptions, setProjectOptions] = useState<ProjectOption[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | number>(NO_PROJECT_VALUE);
  const [recentProjectIds, setRecentProjectIds] = useState<Array<string | number>>([]);
  const [followedProjectIds, setFollowedProjectIds] = useState<Array<string | number>>([]);

  useEffect(() => {
    const controller = new AbortController();
    let retryTimer: number | null = null;

    const loadProjects = async (retryCount = 0): Promise<void> => {
      try {
        const params = new URLSearchParams({
          page: '1',
          page_size: '50',
          _ts: String(Date.now()),
        });
        const response = await fetch(`/api/xiaoqiao/projects?${params.toString()}`, {
          signal: controller.signal,
          cache: 'no-store',
        });
        const payload = await response.json() as { projects?: ProjectOption[] };
        const projects = Array.isArray(payload.projects) ? payload.projects : [];
        setProjectOptions(projects);
        if (projects.length === 0 && retryCount < 3) {
          retryTimer = window.setTimeout(() => {
            void loadProjects(retryCount + 1);
          }, 1500);
        }
      } catch {
        if (!controller.signal.aborted) {
          setProjectOptions([]);
        }
      }
    };

    void loadProjects();

    return () => {
      controller.abort();
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
      return;
    }
    window.localStorage.setItem(SELECTED_PROJECT_STORAGE_KEY, JSON.stringify(selectedProjectId));
  }, [selectedProjectId]);

  const selectedProject = useMemo(
    () => projectOptions.find((project) => String(project.app_id) === String(selectedProjectId)) || null,
    [projectOptions, selectedProjectId],
  );

  const projectContextText = useMemo(() => {
    if (selectedProjectId === NO_PROJECT_VALUE) return '项目范围：未选择项目';
    if (selectedProject) return `项目范围：${selectedProject.app_name}(APPID:${selectedProject.app_id})`;
    return '项目范围：未选择项目';
  }, [selectedProject, selectedProjectId]);

  useEffect(() => {
    onContextChange?.(projectContextText);
  }, [onContextChange, projectContextText]);

  const selectedLabel = selectedProjectId === NO_PROJECT_VALUE
    ? '请选择一个项目'
    : selectedProject?.app_name || '请选择一个项目';
  const fallbackProjectIcon = getDefaultProjectIcon();
  const selectedProjectIcon = selectedProjectId === NO_PROJECT_VALUE ? '' : selectedProject?.icon || fallbackProjectIcon;
  const selectedProjectColor = selectedProjectId === NO_PROJECT_VALUE ? '#9ca3af' : c.textPrimary;

  const handleSelect = useCallback((value: string | number) => {
    if (value === NO_PROJECT_VALUE) {
      setSelectedProjectId(value);
      return;
    }
    const normalizedValue = Number.isNaN(Number(value)) ? value : Number(value);
    setSelectedProjectId(normalizedValue);
    setRecentProjectIds((prev) => trimRecentProjectIds([normalizedValue, ...prev]));
  }, []);

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
      icon: project.icon || fallbackProjectIcon,
      followed: followedSet.has(String(project.app_id)),
      follow_index: followedIndexMap.get(String(project.app_id)),
      recent_visit: recentSet.has(normalizeProjectId(project.app_id)),
      closed: false,
    }));
  }, [fallbackProjectIcon, followedProjectIds, projectOptions, recentProjectIds]);

  const customShow = (
    <button
      type="button"
      style={{
        maxWidth: 360,
        minWidth: 0,
        width: 'fit-content',
        flexShrink: 1,
        height: 36,
        borderRadius: 18,
        border: '1px solid rgba(15, 23, 42, 0.05)',
        background: '#fff',
        boxShadow: 'none',
        color: selectedProjectColor,
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
        ) : null}
      </span>
      <span className="project-select-label" style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {selectedLabel}
      </span>
      <ChevronDown size={14} style={{ marginLeft: 'auto', flexShrink: 0, color: c.textSecondary }} />
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

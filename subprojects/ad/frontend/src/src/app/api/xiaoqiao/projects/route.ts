import { NextResponse } from 'next/server';
import {
  AUTH_TOKEN_COOKIE,
  type AuthProjectItem,
  getAiadProjectList,
  getAiadMemberInfo,
  getCurrentUser,
  getProjectListEndpoint,
  getUserIdFromToken,
  normalizeAuthProject,
} from '@/lib/auth-service';

interface ProjectApiItem {
  app_id?: string | number;
  appId?: string | number;
  app_name?: string;
  appName?: string;
  app_alias?: string;
  appAlias?: string;
  app_en_name?: string;
  appEnName?: string;
  app_status?: string | number;
  appStatus?: string | number;
  status?: string | number;
  icon?: string;
  app_type?: string | number | Array<{ code?: string; name?: string } | string>;
  app_types?: string | number | Array<{ code?: string; name?: string } | string>;
  appType?: Array<{ code?: string; name?: string } | string>;
  project_type?: string | number;
  category?: string;
  industry?: string;
  biz_type?: string;
  game_type?: string;
  is_game?: boolean | string | number;
  is_current?: boolean | string | number;
}

function normalize(item: ProjectApiItem): ProjectApiItem {
  const appId = item.app_id ?? item.appId;
  const appName = item.app_name ?? item.appName ?? item.app_alias ?? item.appAlias ?? item.app_en_name ?? item.appEnName;
  const appAlias = item.app_alias ?? item.appAlias;
  const appEnName = item.app_en_name ?? item.appEnName;
  const appStatus = item.app_status ?? item.appStatus ?? item.status;
  const appType = item.app_type ?? item.appType ?? item.app_types;
  return {
    app_id: appId,
    app_name: appName || appAlias || appEnName || `项目 ${appId || ''}`.trim(),
    app_alias: appAlias,
    app_en_name: appEnName,
    app_status: appStatus,
    icon: item.icon,
    app_type: appType,
    project_type: item.project_type,
    category: item.category,
    industry: item.industry,
    biz_type: item.biz_type,
    game_type: item.game_type,
    is_game: item.is_game,
    is_current: item.is_current,
  };
}

function matchesProjectKeyword(item: ProjectApiItem, keyword: string) {
  if (!keyword) return true;
  const normalizedKeyword = keyword.trim().toLowerCase();
  if (!normalizedKeyword) return true;
  const joined = [
    item.app_id,
    item.appId,
    item.app_name,
    item.appName,
    item.app_alias,
    item.appAlias,
    item.app_en_name,
    item.appEnName,
    item.app_type,
    item.appType,
    item.app_types,
    item.project_type,
    item.category,
    item.industry,
    item.biz_type,
    item.game_type,
  ]
    .filter((value) => value !== undefined && value !== null && String(value).trim())
    .map((value) => String(value).toLowerCase())
    .join(' ');
  return joined.includes(normalizedKeyword);
}

function memberAppsToProjects(apps?: Array<Record<string, unknown>> | null): ProjectApiItem[] {
  if (!Array.isArray(apps)) return [];
  return apps.map((app) => ({
    app_id: (app.code ?? app.id ?? app.app_id ?? app.appId) as string | number | undefined,
    app_name: (app.name ?? app.app_name ?? app.appName ?? app.app_alias ?? app.appAlias ?? app.app_en_name ?? app.appEnName) as string | undefined,
    app_alias: app.app_alias as string | undefined,
    app_en_name: app.app_en_name as string | undefined,
    app_status: (app.status ?? app.app_status) as string | number | undefined,
    icon: app.icon as string | undefined,
    is_current: app.is_current as boolean | string | number | undefined,
  }));
}

function extractProjectListPayload(payload: unknown): ProjectApiItem[] {
  if (Array.isArray(payload)) return payload as ProjectApiItem[];
  if (!payload || typeof payload !== 'object') return [];
  const record = payload as Record<string, unknown>;
  const data = record.data;
  if (Array.isArray(data)) return data as ProjectApiItem[];
  if (data && typeof data === 'object') {
    const dataRecord = data as Record<string, unknown>;
    for (const key of ['list', 'records', 'items', 'apps', 'projects', 'rows']) {
      if (Array.isArray(dataRecord[key])) return dataRecord[key] as ProjectApiItem[];
    }
  }
  for (const key of ['list', 'records', 'items', 'apps', 'projects', 'rows']) {
    if (Array.isArray(record[key])) return record[key] as ProjectApiItem[];
  }
  return [];
}

function mergeProjects(projectGroups: ProjectApiItem[][]): ProjectApiItem[] {
  const map = new Map<string, ProjectApiItem>();
  projectGroups.flat().forEach((item) => {
    const normalized = normalize(item);
    const id = String(normalized.app_id ?? '').trim();
    if (!id) return;
    const existing = map.get(id);
    map.set(id, {
      ...normalized,
      ...existing,
      is_current: existing?.is_current || normalized.is_current,
    });
  });
  return [...map.values()];
}

function toAuthProject(item: ProjectApiItem): AuthProjectItem | null {
  const normalized = normalize(item);
  if (normalized.app_id === undefined || normalized.app_id === null) return null;
  return {
    app_id: normalized.app_id,
    app_name: String(normalized.app_name || normalized.app_alias || normalized.app_en_name || `APPID ${normalized.app_id}`),
    app_alias: normalized.app_alias,
    app_en_name: normalized.app_en_name,
    app_status: normalized.app_status,
    status: normalized.status === undefined ? undefined : String(normalized.status),
    icon: normalized.icon,
    app_type: Array.isArray(normalized.app_type)
      ? normalized.app_type.map((type) => (typeof type === 'string' ? type : type.name || type.code || '')).filter(Boolean)
      : normalized.app_type,
    is_current: Boolean(normalized.is_current),
  };
}

function readToken(request: Request): string {
  const rawToken = request.headers.get('cookie')
    ?.split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${AUTH_TOKEN_COOKIE}=`))
    ?.slice(AUTH_TOKEN_COOKIE.length + 1);

  return rawToken ? decodeURIComponent(rawToken).replace(/^Bearer\s+/i, '').trim() : '';
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = readToken(request);
  const pageSize = searchParams.get('page_size') || '50';
  const shouldReturnAll = searchParams.get('all') === 'true' || pageSize === 'all';
  const appName = searchParams.get('app_name');
  const appId = searchParams.get('app_id');
  const keyword = searchParams.get('keyword') || searchParams.get('q') || '';

  if (!token) {
    return NextResponse.json({ source: 'auth-required', projects: [] }, { status: 401 });
  }

  try {
    const userId = getUserIdFromToken(token);
    const [currentUser, projectListPayload, memberInfo] = await Promise.all([
      getCurrentUser(token).catch(() => null),
      getAiadProjectList(token).catch(() => null),
      userId ? getAiadMemberInfo(token, userId).catch(() => null) : Promise.resolve(null),
    ]);

    const currentProject = currentUser?.user.current || currentUser?.user.previous || null;
    const projectList = extractProjectListPayload(projectListPayload);
    const userProjects: ProjectApiItem[] = (currentUser?.user.projects || []).map((item) => ({
      app_id: item.app_id,
      app_name: item.app_name,
      app_alias: item.app_alias,
      app_en_name: item.app_en_name,
      app_status: item.app_status || item.status,
      icon: item.icon,
      app_type: item.app_type || item.app_types,
      is_current: item.is_current,
    }));
    const memberProjects = memberAppsToProjects(memberInfo?.apps as Array<Record<string, unknown>> | null);
    const projectsSource = mergeProjects([
      projectList,
      currentProject ? [currentProject] : [],
      userProjects,
      memberProjects,
    ]);

    const projectItems = projectsSource
      .filter((item) => item.app_id || item.appId)
      .filter((item) => matchesProjectKeyword(item, keyword))
      .filter((item) => (appName ? matchesProjectKeyword(item, appName) : true))
      .filter((item) => (appId ? String(item.app_id ?? item.appId) === String(appId) : true));

    const resolvedCurrent = currentProject
      || projectItems.find((item) => item.is_current)
      || projectItems[0]
      || null;

    const projects = projectItems.map((item) => {
      const normalized = normalize(item);
      return {
        ...normalized,
        is_current: normalized.is_current || String(normalized.app_id) === String(resolvedCurrent?.app_id),
      };
    });

    const limit = Number(pageSize);
    const pageProjects = !shouldReturnAll && Number.isFinite(limit) && limit > 0
      ? projects.slice(0, limit)
      : projects;

    const current = resolvedCurrent ? toAuthProject(resolvedCurrent) : null;
    const normalizedProjects = pageProjects
      .map((item) => toAuthProject(item))
      .filter((item): item is AuthProjectItem => Boolean(item));

    return NextResponse.json({
      source: 'aiad-production-project-list',
      project_list_endpoint: getProjectListEndpoint(),
      current: current ? normalizeAuthProject(current) : null,
      total: projects.length,
      returned: pageProjects.length,
      projects: normalizedProjects.map((item) => normalizeAuthProject(item)),
    });
  } catch (error) {
    console.warn('Authenticated project list unavailable', error);
    return NextResponse.json({ source: 'auth-error', projects: [] }, { status: 401 });
  }
}

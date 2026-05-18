import { NextResponse } from 'next/server';
import { getProjectServiceConfig, hasConfiguredProjectService } from '@/lib/runtime-config';

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
  icon?: string;
  app_type?: string | number | Array<{ code?: string; name?: string } | string>;
  appType?: Array<{ code?: string; name?: string } | string>;
  project_type?: string | number;
  category?: string;
  industry?: string;
  biz_type?: string;
  game_type?: string;
  is_game?: boolean | string | number;
}

function pickList(payload: unknown): ProjectApiItem[] {
  if (Array.isArray(payload)) return payload as ProjectApiItem[];
  if (!payload || typeof payload !== 'object') return [];
  const data = (payload as Record<string, unknown>).data;
  if (Array.isArray(data)) return data as ProjectApiItem[];
  if (data && typeof data === 'object') {
    const list = (data as Record<string, unknown>).list || (data as Record<string, unknown>).items || (data as Record<string, unknown>).data;
    if (Array.isArray(list)) return list as ProjectApiItem[];
  }
  const list = (payload as Record<string, unknown>).list || (payload as Record<string, unknown>).items;
  return Array.isArray(list) ? list as ProjectApiItem[] : [];
}

function normalize(item: ProjectApiItem) {
  const appId = item.app_id ?? item.appId;
  const appName = item.app_name ?? item.appName ?? item.app_alias ?? item.appAlias ?? item.app_en_name ?? item.appEnName;
  const appAlias = item.app_alias ?? item.appAlias;
  const appEnName = item.app_en_name ?? item.appEnName;
  const appStatus = item.app_status ?? item.appStatus;
  const appType = item.app_type ?? item.appType;
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
  };
}

function isGameProject(item: ProjectApiItem): boolean {
  if (item.is_game !== undefined && item.is_game !== null) {
    const raw = String(item.is_game).toLowerCase();
    if (raw === 'true' || raw === '1' || raw === 'yes') return true;
    if (raw === 'false' || raw === '0' || raw === 'no') return false;
  }

  const appTypeList = Array.isArray(item.appType) ? item.appType : Array.isArray(item.app_type) ? item.app_type : [];
  if (appTypeList.length > 0) {
    const normalizedTypes = appTypeList
      .map((type) => (typeof type === 'string' ? type : `${type.code || ''} ${type.name || ''}`.trim()))
      .filter(Boolean)
      .join(' ');
    if (/其他|OTHER/i.test(normalizedTypes)) return false;
    if (/游戏|手游|H5|APP/i.test(normalizedTypes)) return true;
  }

  const typeText = [
    item.app_type,
    item.project_type,
    item.category,
    item.industry,
    item.biz_type,
    item.game_type,
  ]
    .filter((value) => value !== undefined && value !== null && String(value).trim())
    .map((value) => String(value))
    .join(' ');

  if (!typeText) return true;
  return /游戏|game/i.test(typeText);
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const config = await getProjectServiceConfig();
  const page = searchParams.get('page') || '1';
  const pageSize = searchParams.get('page_size') || '50';
  const appName = searchParams.get('app_name');
  const appId = searchParams.get('app_id');
  const keyword = searchParams.get('keyword') || searchParams.get('q') || '';
  const params = new URLSearchParams({
    page,
    page_size: pageSize,
  });
  if (appName) params.set('app_name', appName);
  if (appId) params.set('app_id', appId);
  const cookieHeader = config.apiToken.includes('=')
    ? config.apiToken
    : `aiad_jwt=${config.apiToken}`;

  try {
    if (!hasConfiguredProjectService(config)) {
      throw new Error('Project API config is disabled or missing token');
    }

    const baseUrl = config.apiBaseUrl.replace(/\/$/, '');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const firstResponse = await fetch(`${baseUrl}?${params.toString()}`, {
      headers: {
        Accept: 'application/json',
        Cookie: cookieHeader,
      },
      cache: 'no-store',
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));
    if (!firstResponse.ok) throw new Error(`Project API ${firstResponse.status}`);
    const firstPayload = await firstResponse.json();
    const firstProjects = pickList(firstPayload);

    const totalPage = (() => {
      const page = (firstPayload as Record<string, unknown>).page;
      if (page && typeof page === 'object' && 'totalPage' in page) {
        const value = Number((page as Record<string, unknown>).totalPage);
        if (Number.isFinite(value) && value > 1) return value;
      }
      const data = (firstPayload as Record<string, unknown>).data;
      if (data && typeof data === 'object') {
        const pageInfo = (data as Record<string, unknown>).page;
        if (pageInfo && typeof pageInfo === 'object' && 'totalPage' in pageInfo) {
          const value = Number((pageInfo as Record<string, unknown>).totalPage);
          if (Number.isFinite(value) && value > 1) return value;
        }
      }
      return 1;
    })();

    const allProjects = [...firstProjects];
    for (let currentPage = 2; currentPage <= totalPage; currentPage += 1) {
      const nextParams = new URLSearchParams({
        page: String(currentPage),
        page_size: pageSize,
      });
      if (appName) nextParams.set('app_name', appName);
      if (appId) nextParams.set('app_id', appId);

      const nextResponse = await fetch(`${baseUrl}?${nextParams.toString()}`, {
        headers: {
          Accept: 'application/json',
          Cookie: cookieHeader,
        },
        cache: 'no-store',
        signal: controller.signal,
      });
      if (!nextResponse.ok) break;
      const nextPayload = await nextResponse.json();
      const nextProjects = pickList(nextPayload);
      if (nextProjects.length === 0) break;
      allProjects.push(...nextProjects);
    }

    const projects = allProjects
      .filter((item) => item.app_id || item.appId)
      .map(normalize);

    return NextResponse.json({ source: baseUrl, projects });
  } catch (error) {
    console.warn('Project API unavailable', error);
  }

  return NextResponse.json({
    source: hasConfiguredProjectService(config) ? 'empty' : 'unavailable',
    projects: [],
  });
}

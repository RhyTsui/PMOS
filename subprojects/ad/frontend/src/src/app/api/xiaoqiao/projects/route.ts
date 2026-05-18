import { NextResponse } from 'next/server';
import { getProjectServiceConfig, hasConfiguredProjectService } from '@/lib/runtime-config';

interface ProjectApiItem {
  app_id?: string | number;
  app_name?: string;
  app_alias?: string;
  app_en_name?: string;
  app_status?: string | number;
  app_type?: string | number;
  studio_id?: string | number;
  studio_name?: string;
  department_id?: string | number;
  department_name?: string;
  develop_department_id?: string | number;
  develop_department_name?: string;
  segment?: string;
  is_deleted?: string | number;
  icon?: string;
}

interface ProjectPageInfo {
  page?: number;
  page_size?: number;
  total_number?: number;
  total_page?: number;
}

interface ProjectListResponse {
  source: string;
  projects: ReturnType<typeof normalize>[];
  page_info: ProjectPageInfo & {
    returned_number: number;
    fetched_all: boolean;
  };
}

let projectListCache: {
  key: string;
  expiresAt: number;
  response: ProjectListResponse;
} | null = null;

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

function pickPageInfo(payload: unknown): ProjectPageInfo {
  if (!payload || typeof payload !== 'object') return {};
  const root = payload as Record<string, unknown>;
  const data = root.data;
  const pageInfo = data && typeof data === 'object'
    ? (data as Record<string, unknown>).page_info
    : root.page_info;
  if (!pageInfo || typeof pageInfo !== 'object') return {};
  const source = pageInfo as Record<string, unknown>;
  return {
    page: Number(source.page) || undefined,
    page_size: Number(source.page_size) || undefined,
    total_number: Number(source.total_number) || undefined,
    total_page: Number(source.total_page) || undefined,
  };
}

function normalize(item: ProjectApiItem) {
  return {
    app_id: item.app_id,
    app_name: item.app_name || item.app_alias || item.app_en_name || `项目 ${item.app_id || ''}`.trim(),
    app_alias: item.app_alias,
    app_en_name: item.app_en_name,
    app_status: item.app_status,
    app_type: item.app_type,
    studio_id: item.studio_id,
    studio_name: item.studio_name,
    department_id: item.department_id,
    department_name: item.department_name,
    develop_department_id: item.develop_department_id,
    develop_department_name: item.develop_department_name,
    segment: item.segment,
    is_deleted: item.is_deleted,
    icon: item.icon,
  };
}

function isGameProject(item: ReturnType<typeof normalize>) {
  const appType = String(item.app_type ?? '').trim();
  return !appType || appType === '1' || appType === '游戏';
}

function isExcludedStudioProject(item: ReturnType<typeof normalize>) {
  const studioText = [
    item.studio_name,
    item.department_name,
    item.develop_department_name,
  ].filter(Boolean).join(' ');
  return /烽火|烽火工作室/i.test(studioText);
}

async function fetchProjectPage(baseUrl: string, configToken: string, requestParams: URLSearchParams, page: number, pageSize: number) {
  const params = new URLSearchParams(requestParams);
  params.set('access_token', configToken);
  params.set('page', String(page));
  params.set('page_size', String(pageSize));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  const response = await fetch(`${baseUrl}?${params.toString()}`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
    signal: controller.signal,
  }).finally(() => clearTimeout(timer));
  if (!response.ok) throw new Error(`Project API ${response.status}`);
  return response.json();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const config = await getProjectServiceConfig();
  const appName = searchParams.get('app_name');
  const appId = searchParams.get('app_id');
  const page = Number(searchParams.get('page') || '1') || 1;
  const pageSize = Math.min(Number(searchParams.get('page_size') || '100') || 100, 100);
  const shouldFetchAll = searchParams.get('all') !== 'false';
  const params = new URLSearchParams();
  if (appName) params.set('app_name', appName);
  if (appId) params.set('app_id', appId);
  params.set('status', searchParams.get('status') || 'all');
  for (const key of ['include_origin_mapping', 'app_status', 'origin_id', 'segment']) {
    const value = searchParams.get(key);
    if (value) params.set(key, value);
  }
  const requestedAppType = searchParams.get('app_type');
  if (requestedAppType && requestedAppType !== 'all') {
    params.set('app_type', requestedAppType);
  }

  try {
    if (!hasConfiguredProjectService(config)) {
      throw new Error('Project API config is disabled or missing token');
    }

    const baseUrl = config.apiBaseUrl.replace(/\/$/, '');
    const cacheKey = `${baseUrl}?${params.toString()}&page=${page}&page_size=${pageSize}&all=${shouldFetchAll}`;
    if (projectListCache && projectListCache.key === cacheKey && projectListCache.expiresAt > Date.now()) {
      return NextResponse.json(projectListCache.response);
    }

    const firstPayload = await fetchProjectPage(baseUrl, config.apiToken, params, page, pageSize);
    const firstPageInfo = pickPageInfo(firstPayload);
    const totalPage = shouldFetchAll ? Math.min(firstPageInfo.total_page || 1, 100) : 1;
    const payloads = [firstPayload];

    if (shouldFetchAll && totalPage > page) {
      const remainingPages = Array.from({ length: totalPage - page }, (_, index) => page + index + 1);
      const remainingPayloads = await Promise.all(
        remainingPages.map((nextPage) => fetchProjectPage(baseUrl, config.apiToken, params, nextPage, pageSize)),
      );
      payloads.push(...remainingPayloads);
    }

    const seen = new Set<string>();
    const projects = payloads
      .flatMap(pickList)
      .map(normalize)
      .filter((item) => {
        if (!item.app_id) return false;
        if (!isGameProject(item)) return false;
        if (isExcludedStudioProject(item)) return false;
        const key = String(item.app_id);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    if (projects.length > 0) {
      const responsePayload: ProjectListResponse = {
        source: baseUrl,
        projects,
        page_info: {
          ...firstPageInfo,
          returned_number: projects.length,
          fetched_all: shouldFetchAll,
        },
      };
      projectListCache = {
        key: cacheKey,
        expiresAt: Date.now() + 5 * 60 * 1000,
        response: responsePayload,
      };
      return NextResponse.json(responsePayload);
    }
  } catch (error) {
    console.warn('Project API unavailable', error);
  }

  return NextResponse.json({
    source: 'fallback',
    projects: [
      {
        app_id: 12701,
        app_name: '项目 12701',
        app_alias: '默认项目',
        app_status: 'unknown',
      },
    ],
  });
}

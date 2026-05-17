import { NextResponse } from 'next/server';
import { getProjectServiceConfig, hasConfiguredProjectService } from '@/lib/runtime-config';

interface ProjectApiItem {
  app_id?: string | number;
  app_name?: string;
  app_alias?: string;
  app_en_name?: string;
  app_status?: string | number;
  icon?: string;
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
  return {
    app_id: item.app_id,
    app_name: item.app_name || item.app_alias || item.app_en_name || `项目 ${item.app_id || ''}`.trim(),
    app_alias: item.app_alias,
    app_en_name: item.app_en_name,
    app_status: item.app_status,
    icon: item.icon,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const config = await getProjectServiceConfig();
  const page = searchParams.get('page') || '1';
  const pageSize = searchParams.get('page_size') || '50';
  const appName = searchParams.get('app_name');
  const appId = searchParams.get('app_id');
  const params = new URLSearchParams({
    access_token: config.apiToken,
    page,
    page_size: pageSize,
  });
  if (appName) params.set('app_name', appName);
  if (appId) params.set('app_id', appId);

  try {
    if (!hasConfiguredProjectService(config)) {
      throw new Error('Project API config is disabled or missing token');
    }

    const baseUrl = config.apiBaseUrl.replace(/\/$/, '');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`${baseUrl}?${params.toString()}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));
    if (!response.ok) throw new Error(`Project API ${response.status}`);
    const payload = await response.json();
    const projects = pickList(payload).map(normalize).filter((item) => item.app_id);
    if (projects.length > 0) {
      return NextResponse.json({ source: baseUrl, projects });
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

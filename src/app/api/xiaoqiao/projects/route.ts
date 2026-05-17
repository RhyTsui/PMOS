import { NextResponse } from 'next/server';
import { getProjectServiceConfig, hasConfiguredProjectService } from '@/lib/runtime-config';

interface ProjectApiItem {
  app_id?: string | number;
  app_name?: string;
  app_alias?: string;
  app_en_name?: string;
  app_status?: string | number;
  icon?: string;
  app_type?: string | number;
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
  return {
    app_id: item.app_id,
    app_name: item.app_name || item.app_alias || item.app_en_name || `项目 ${item.app_id || ''}`.trim(),
    app_alias: item.app_alias,
    app_en_name: item.app_en_name,
    app_status: item.app_status,
    icon: item.icon,
    app_type: item.app_type,
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
    item.app_name,
    item.app_alias,
    item.app_en_name,
    item.app_type,
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
    access_token: config.apiToken,
    page,
    page_size: pageSize,
  });
  if (appName) params.set('app_name', appName);
  if (appId) params.set('app_id', appId);
  if (keyword) params.set('keyword', keyword);

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
    const projects = pickList(payload)
      .filter((item) => item.app_id)
      .filter((item) => isGameProject(item))
      .filter((item) => !/烽火工作室/i.test(`${item.app_name || ''} ${item.app_alias || ''} ${item.app_en_name || ''}`))
      .filter((item) => matchesProjectKeyword(item, keyword))
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

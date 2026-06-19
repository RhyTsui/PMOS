import { NextResponse } from 'next/server';

const DEFAULT_ALLOWED_HOSTS = ['pm-oss.tos-cn-beijing.volces.com'];

function getAllowedHosts(): string[] {
  return (process.env.XIAOQIAO_PROJECT_ICON_ALLOWED_HOSTS || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .concat(DEFAULT_ALLOWED_HOSTS);
}

function fallbackIcon() {
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">',
    '<rect width="64" height="64" rx="14" fill="#eaf1ff"/>',
    '<path d="M18 24h28v20H18z" fill="#2e75fe" opacity=".18"/>',
    '<path d="M22 20h20l4 6H18z" fill="#2e75fe"/>',
    '<circle cx="26" cy="35" r="4" fill="#2e75fe"/>',
    '<path d="M34 32h10v4H34zm0 8h8v4h-8z" fill="#2e75fe"/>',
    '</svg>',
  ].join('');
  return new NextResponse(svg, {
    status: 200,
    headers: {
      'content-type': 'image/svg+xml; charset=utf-8',
      'cache-control': 'public, max-age=300',
    },
  });
}

function isAllowedIconUrl(value: string): URL | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  const host = url.hostname.toLowerCase();
  const allowed = getAllowedHosts().some((item) => host === item || host.endsWith(`.${item}`));
  return allowed ? url : null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const src = searchParams.get('src') || '';
  const url = isAllowedIconUrl(src);
  if (!url) return fallbackIcon();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: 'force-cache',
      headers: { accept: 'image/avif,image/webp,image/png,image/jpeg,image/svg+xml,image/*;q=0.8' },
    });
    if (!response.ok) return fallbackIcon();
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.toLowerCase().startsWith('image/')) return fallbackIcon();
    const body = await response.arrayBuffer();
    return new NextResponse(body, {
      status: 200,
      headers: {
        'content-type': contentType,
        'cache-control': 'public, max-age=86400',
      },
    });
  } catch {
    return fallbackIcon();
  } finally {
    clearTimeout(timer);
  }
}

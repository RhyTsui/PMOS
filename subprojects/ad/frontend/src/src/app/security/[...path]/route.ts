import { NextRequest, NextResponse } from 'next/server';
import { getLoginSecurityBaseUrl } from '@/lib/auth-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'content-encoding',
  'content-length',
  'host',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

async function proxyToLoginSecurity(request: NextRequest, pathSegments: string[]) {
  const targetUrl = new URL(
    pathSegments.join('/'),
    `${getLoginSecurityBaseUrl().replace(/\/$/, '')}/`,
  );
  targetUrl.search = request.nextUrl.search;

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  const method = request.method.toUpperCase();
  const body = method === 'GET' || method === 'HEAD' ? undefined : await request.arrayBuffer();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(targetUrl, {
      method,
      headers,
      body,
      signal: controller.signal,
      redirect: 'manual',
      cache: 'no-store',
    });

    const responseHeaders = new Headers();
    response.headers.forEach((value, key) => {
      if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
        responseHeaders.set(key, value);
      }
    });

    if (response.status === 204) {
      return new NextResponse(null, { status: 204, headers: responseHeaders });
    }

    const text = await response.text();
    return new NextResponse(text, { status: response.status, headers: responseHeaders });
  } catch (error) {
    const message =
      error instanceof Error && error.name === 'AbortError'
        ? '登录服务响应超时'
        : error instanceof Error
          ? error.message
          : '登录服务不可用';
    return NextResponse.json({ message }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await context.params;
  return proxyToLoginSecurity(request, path);
}

export async function POST(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await context.params;
  return proxyToLoginSecurity(request, path);
}

export async function PUT(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await context.params;
  return proxyToLoginSecurity(request, path);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await context.params;
  return proxyToLoginSecurity(request, path);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await context.params;
  return proxyToLoginSecurity(request, path);
}

export async function OPTIONS(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await context.params;
  return proxyToLoginSecurity(request, path);
}

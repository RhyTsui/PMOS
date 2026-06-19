import { NextResponse } from 'next/server';

const startedAt = new Date().toISOString();
const buildId = [
  process.env.XIAOQIAO_FRONTEND_BUILD_ID,
  process.env.VERCEL_GIT_COMMIT_SHA,
].find((value) => typeof value === 'string' && value.trim().length > 0);
const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || process.env.npm_package_version || 'local';
const runtimeVersion = buildId || `${appVersion}:${startedAt}`;

export async function GET() {
  return NextResponse.json(
    {
      version: runtimeVersion,
      started_at: startedAt,
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    },
  );
}

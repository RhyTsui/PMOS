import { NextResponse } from 'next/server';
import { getLoginAppId } from '@/lib/auth-service';

export async function GET() {
  return NextResponse.json({
    appId: getLoginAppId(),
    appName: '小乔智投',
    securityBaseUrl:
      process.env.NEXT_PUBLIC_XIAOQIAO_LOGIN_SECURITY_BASE_URL ||
      'https://xs-login.dobest.com/ads-aitd/security',
  });
}

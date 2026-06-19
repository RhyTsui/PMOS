import { NextResponse } from 'next/server';
import { AUTH_SESSION_COOKIE, AUTH_TOKEN_COOKIE } from '@/lib/auth-service';

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(AUTH_TOKEN_COOKIE);
  response.cookies.delete(AUTH_SESSION_COOKIE);
  return response;
}

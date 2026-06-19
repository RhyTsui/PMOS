import { NextRequest, NextResponse } from 'next/server';
import { AUTH_TOKEN_COOKIE, getCurrentUser } from '@/lib/auth-service';
import { getAdminAccessForAuthUser } from '@/lib/admin-access-store';

const PUBLIC_PATH_PREFIXES = [
  '/login',
  '/prototypes',
  '/security',
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(AUTH_TOKEN_COOKIE)?.value;

  if (pathname.startsWith('/admin')) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    try {
      const payload = await getCurrentUser(token);
      const access = await getAdminAccessForAuthUser(payload.user);
      if (!access.can_view_admin) {
        return NextResponse.redirect(new URL('/', request.url));
      }
    } catch {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/xiaoqiao/admin')) {
    if (pathname.startsWith('/api/xiaoqiao/admin/automation-templates')) {
      if (!token) {
        return NextResponse.json({ message: '请先登录' }, { status: 401 });
      }
      return NextResponse.next();
    }
    if (!token) {
      return NextResponse.json({ message: '请先登录' }, { status: 401 });
    }
    try {
      const payload = await getCurrentUser(token);
      const access = await getAdminAccessForAuthUser(payload.user);
      const isUserManagementRoute = pathname.startsWith('/api/xiaoqiao/admin/users');
      const isReadMethod = request.method === 'GET' || request.method === 'HEAD';
      if (isUserManagementRoute) {
        if (!access.can_manage_users) {
          return NextResponse.json({ message: '无权访问用户管理' }, { status: 403 });
        }
      } else if (isReadMethod) {
        if (!access.can_view_admin) {
          return NextResponse.json({ message: '无权查看管理中心' }, { status: 403 });
        }
      } else if (!access.can_operate_admin) {
        return NextResponse.json({ message: '无权操作管理中心' }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ message: '请先登录' }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (!token && !isPublicPath(pathname)) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/xiaoqiao/admin/:path*', '/((?!api|_next|.*\\..*).*)'],
};

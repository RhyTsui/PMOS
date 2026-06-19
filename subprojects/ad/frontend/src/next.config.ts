import type { NextConfig } from 'next';

const loginSecurityBaseUrl = (
  process.env.XIAOQIAO_LOGIN_SECURITY_BASE_URL ||
  'https://xs-login.dobest.com/ads-aitd/security'
).replace(/\/$/, '');

const nextConfig: NextConfig = {
  allowedDevOrigins: ['*.dev.coze.site', '127.0.0.1', 'localhost', '10.236.14.27'],
  async headers() {
    return [
      {
        source: '/((?!_next/static|_next/image|favicon.ico|icons|images).*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
        ],
      },
    ];
  },
  turbopack: {
    root: __dirname,
    rules: {
      '*.module.less': {
        loaders: [
          './scripts/yoka-less-module-loader.cjs',
          'less-loader',
        ],
        as: '*.js',
      },
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;

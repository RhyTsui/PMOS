import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['*.dev.coze.site', '127.0.0.1', 'localhost'],
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

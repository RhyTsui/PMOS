import type { Metadata, Viewport } from 'next';
import { Inspector } from 'react-dev-inspector';
import { ThemeProvider } from '@/hooks/useTheme';
import AntdProvider from '@/components/AntdProvider';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: {
    default: '小乔智投',
    template: '小乔智投-%s',
  },
  description: '广告业务需求端到端直接交付。',
  keywords: [
    '小乔智投',
    '广告智能',
    '广告优化',
    '数据排查',
    '智能诊断',
    '广告联调',
    '需求沟通',
  ],
  authors: [{ name: 'XiaoQiao Team' }],
  generator: 'XiaoQiao',
  icons: {
    icon: [
      { url: '/favicon-light-scheme.png', type: 'image/png', media: '(prefers-color-scheme: light)' },
      { url: '/favicon-dark-scheme.png', type: 'image/png', media: '(prefers-color-scheme: dark)' },
    ],
    apple: '/brand-icon-light.png',
  },
  openGraph: {
    title: '小乔智投',
    description: '广告业务需求端到端直接交付。',
    locale: 'zh_CN',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isDev = process.env.COZE_PROJECT_ENV === 'DEV';

  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider>
          <AntdProvider>
            {isDev && <Inspector />}
            {children}
          </AntdProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

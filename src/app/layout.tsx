import type { Metadata } from 'next';
import { Inspector } from 'react-dev-inspector';
import Script from 'next/script';
import { ThemeProvider } from '@/hooks/useTheme';
import AntdProvider from '@/components/AntdProvider';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: '智投chat',
    template: '智投chat-%s',
  },
  description: '广告业务需求端到端直接交付。',
  keywords: [
    '智投chat',
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
      { url: '/favicon.ico', type: 'image/x-icon' },
      { url: '/brand-icon.png', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: '/brand-icon.png',
  },
  openGraph: {
    title: '智投chat',
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
        <Script
          src="https://mcp.figma.com/mcp/html-to-design/capture.js"
          strategy="afterInteractive"
        />
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

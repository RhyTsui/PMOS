import type { Metadata } from 'next';
import { Inspector } from 'react-dev-inspector';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: '小乔智投 - 广告支持与投放协同工作台',
    template: '%s | 小乔智投',
  },
  description:
    '小乔智投是AI驱动的广告支持与投放协同自动化工作台，以对话入口驱动使用帮助、需求沟通、问题排查与广告联调。',
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
    icon: '/favicon.ico',
  },
  openGraph: {
    title: '小乔智投 - 广告支持与投放协同工作台',
    description: 'AI驱动的广告支持与投放协同自动化工作台',
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
    <html lang="zh-CN">
      <body className="antialiased dark">
        {isDev && <Inspector />}
        {children}
      </body>
    </html>
  );
}

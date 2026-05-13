'use client';

import { useMemo } from 'react';
import { ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { useTheme } from '@/hooks/useTheme';

function AntdProvider({ children }: { children: React.ReactNode }) {
  const { isDark, accent } = useTheme();
  const fontFamily =
    'Inter, PingFang SC, Hiragino Sans GB, Microsoft YaHei, Noto Sans SC, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif';

  const tokens = useMemo(() => {
    if (isDark) {
      return {
        colorPrimary: accent,
        colorBgContainer: '#141E33',
        colorBgElevated: '#1E2A3D',
        colorBgLayout: '#0A0E1A',
        colorBorder: `rgba(0, 217, 255, 0.12)`,
        colorBorderSecondary: 'rgba(255, 255, 255, 0.06)',
        colorText: '#E2E8F0',
        colorTextSecondary: '#8899B0',
        colorTextTertiary: '#6B7A90',
        borderRadius: 12,
        fontFamily,
      };
    }
    return {
      colorPrimary: accent,
      colorBgContainer: '#FFFFFF',
      colorBgElevated: '#FFFFFF',
      colorBgLayout: '#F8FAFC',
      colorBorder: 'rgba(0, 0, 0, 0.1)',
      colorBorderSecondary: 'rgba(0, 0, 0, 0.06)',
      colorText: '#1E293B',
      colorTextSecondary: '#64748B',
      colorTextTertiary: '#94A3B8',
      borderRadius: 12,
      fontFamily,
    };
  }, [isDark, accent, fontFamily]);

  const components = useMemo(() => {
    if (isDark) {
      return {
        Button: { colorPrimary: accent, algorithm: true },
        Input: {
          colorBgContainer: '#182338',
          colorBorder: 'rgba(255, 255, 255, 0.12)',
          activeBorderColor: accent,
          hoverBorderColor: accent,
          colorText: '#E2E8F0',
          colorTextPlaceholder: '#6B7A90',
        },
        Select: {
          colorBgContainer: '#182338',
          colorBgElevated: '#1E2A3D',
          colorBorder: 'rgba(255, 255, 255, 0.12)',
          colorText: '#E2E8F0',
          optionSelectedBg: `${accent}25`,
        },
        Tag: { colorBgContainer: `${accent}1A` },
        Drawer: { colorBgElevated: '#1E2A3D' },
        Modal: { colorBgElevated: '#1E2A3D' },
        Collapse: {
          colorBgContainer: '#182338',
          colorBorder: 'rgba(255, 255, 255, 0.08)',
          headerBg: '#182338',
        },
        Card: {
          colorBgContainer: '#182338',
          colorBorderSecondary: 'rgba(255, 255, 255, 0.08)',
        },
      };
    }
    return {
      Button: { colorPrimary: accent, algorithm: true },
      Input: {
        colorBgContainer: '#FFFFFF',
        colorBorder: 'rgba(0, 0, 0, 0.12)',
        activeBorderColor: accent,
        hoverBorderColor: accent,
        colorText: '#1E293B',
        colorTextPlaceholder: '#94A3B8',
      },
      Select: {
        colorBgContainer: '#FFFFFF',
        colorBgElevated: '#FFFFFF',
        colorBorder: 'rgba(0, 0, 0, 0.12)',
        colorText: '#1E293B',
        optionSelectedBg: `${accent}15`,
      },
      Tag: { colorBgContainer: `${accent}0F` },
      Drawer: { colorBgElevated: '#FFFFFF' },
      Modal: { colorBgElevated: '#FFFFFF' },
      Collapse: {
        colorBgContainer: '#FFFFFF',
        colorBorder: 'rgba(0, 0, 0, 0.06)',
        headerBg: '#FFFFFF',
      },
      Card: {
        colorBgContainer: '#FFFFFF',
        colorBorderSecondary: 'rgba(0, 0, 0, 0.06)',
      },
    };
  }, [isDark, accent]);

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: tokens,
        components,
      }}
    >
      {children}
    </ConfigProvider>
  );
}

export default AntdProvider;

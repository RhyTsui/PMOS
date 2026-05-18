import React from 'react';
import ReactDOM from 'react-dom/client';
import { App as AntdApp, ConfigProvider, theme } from 'antd';
import { generate } from '@ant-design/colors';
import App from './App';
import 'antd/dist/reset.css';
import './styles.css';

const brandPalette = generate('#1677ff');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        cssVar: { key: 'pmos' },
        token: {
          colorPrimary: brandPalette[5] ?? '#1677ff',
          colorInfo: brandPalette[5] ?? '#1677ff',
          borderRadius: 14,
          fontFamily: '"PingFang SC", "Microsoft YaHei", "Segoe UI", sans-serif',
        },
      }}
    >
      <AntdApp>
        <App />
      </AntdApp>
    </ConfigProvider>
  </React.StrictMode>,
);

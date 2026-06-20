import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout, Menu } from 'antd';
import {
  FileTextOutlined,
  SettingOutlined,
  ThunderboltOutlined,
  DatabaseOutlined,
  MessageOutlined,
  SearchOutlined,
  AlertOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import EventListPage from './pages/EventListPage';
import EventDetailPage from './pages/EventDetailPage';
import AdminPage from './pages/AdminPage';
import SourcesPage from './pages/SourcesPage';
import DashboardPage from './pages/DashboardPage';
import FeedbackPage from './pages/FeedbackPage';
import SourceDiscoveryPage from './pages/SourceDiscoveryPage';
import GapDetectionPage from './pages/GapDetectionPage';

const { Header, Content, Sider } = Layout;

function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { key: '/', icon: <ThunderboltOutlined />, label: '情报流' },
    { key: '/events', icon: <FileTextOutlined />, label: '事件分析' },
    { key: '/sources', icon: <DatabaseOutlined />, label: '信源/种子' },
    {
      key: 'management',
      icon: <SettingOutlined />,
      label: '管理',
      children: [
        { key: '/feedback', icon: <MessageOutlined />, label: '反馈管理' },
        { key: '/discovery', icon: <SearchOutlined />, label: '源发现' },
        { key: '/gaps', icon: <AlertOutlined />, label: '漏采告警' },
        { key: '/admin', icon: <SettingOutlined />, label: '系统管理' },
      ],
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider theme="dark" collapsible>
        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <h1 style={{ color: '#fff', margin: 0, fontSize: 18 }}>游戏内参</h1>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px' }}>
          <h2 style={{ margin: 0, fontSize: 16 }}>Game Insider - 游戏行业情报信号源平台</h2>
        </Header>
        <Content style={{ margin: 24 }}>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/events" element={<EventListPage />} />
            <Route path="/events/:id" element={<EventDetailPage />} />
            <Route path="/sources" element={<SourcesPage />} />
            <Route path="/feedback" element={<FeedbackPage />} />
            <Route path="/discovery" element={<SourceDiscoveryPage />} />
            <Route path="/gaps" element={<GapDetectionPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}

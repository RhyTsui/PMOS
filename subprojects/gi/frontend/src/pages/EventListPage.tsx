import { useEffect, useState } from 'react';
import { Card, List, Tag, Space, Empty, Spin, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { ClockCircleOutlined, GlobalOutlined } from '@ant-design/icons';
import api from '../services/api';

const { Paragraph, Text } = Typography;

const PRIORITY_COLORS: Record<string, string> = {
  P0: 'red', P1: 'orange', P2: 'blue', P3: 'default',
};

interface Evidence {
  id: string;
  title: string;
  content: string;
  url: string;
  sourceId: string;
  sourceName?: string;
  status: string;
  collectedAt: string;
}

interface Source {
  id: string;
  name: string;
  shortName: string;
}

export default function EventListPage() {
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [evRes, srcRes] = await Promise.all([
        api.get('/evidence?limit=50') as any,
        api.get('/sources') as any,
      ]);
      const evList = Array.isArray(evRes) ? evRes : [];
      const srcList = Array.isArray(srcRes) ? srcRes : [];
      setSources(srcList);

      // 给 evidence 附加 sourceName
      const srcMap = new Map(srcList.map((s: Source) => [s.id, s]));
      const enriched = evList.map((e: Evidence) => ({
        ...e,
        sourceName: srcMap.get(e.sourceId)?.name || '未知来源',
      }));
      setEvidence(enriched);
    } catch (error) {
      console.error('Failed to load:', error);
    } finally {
      setLoading(false);
    }
  };

  // 按时间倒序
  const sorted = [...evidence].sort(
    (a, b) => new Date(b.collectedAt).getTime() - new Date(a.collectedAt).getTime()
  );

  // 内容预览（去 HTML，取前 150 字）
  const preview = (content: string) => {
    const text = content
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return text.length > 150 ? text.substring(0, 150) + '...' : text;
  };

  const formatTime = (t: string) => {
    const d = new Date(t);
    const now = new Date();
    const diff = (now.getTime() - d.getTime()) / 1000;
    if (diff < 60) return '刚刚';
    if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
    return `${Math.floor(diff / 86400)} 天前`;
  };

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>情报流</h1>
        <Text type="secondary">{sorted.length} 条情报</Text>
      </div>

      <Spin spinning={loading}>
        {sorted.length === 0 ? (
          <Empty description="暂无情报" />
        ) : (
          <List
            dataSource={sorted}
            renderItem={(item) => (
              <List.Item style={{ padding: '16px 0' }}>
                <Card
                  hoverable
                  onClick={() => navigate(`/events/${item.id}`)}
                  style={{ width: '100%' }}
                  bodyStyle={{ padding: '16px 24px' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <h3 style={{ margin: 0, fontSize: 16, lineHeight: 1.5, flex: 1 }}>
                      {item.title || '无标题'}
                    </h3>
                    <Tag color={PRIORITY_COLORS[item.status === 'extracted' ? 'P0' : 'P3']} style={{ marginLeft: 12 }}>
                      {item.status === 'extracted' ? '已分析' : '待处理'}
                    </Tag>
                  </div>

                  <Paragraph type="secondary" style={{ margin: '8px 0', fontSize: 14, lineHeight: 1.6 }}>
                    {preview(item.content)}
                  </Paragraph>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                    <Space size={16}>
                      <Tag color="blue">{item.sourceName}</Tag>
                      {item.url && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          <GlobalOutlined /> {new URL(item.url).hostname}
                        </Text>
                      )}
                    </Space>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      <ClockCircleOutlined /> {formatTime(item.collectedAt)}
                    </Text>
                  </div>
                </Card>
              </List.Item>
            )}
          />
        )}
      </Spin>
    </div>
  );
}

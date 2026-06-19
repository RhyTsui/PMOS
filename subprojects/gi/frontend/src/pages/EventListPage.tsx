import { useEffect, useState } from 'react';
import { Card, List, Tag, Select, Space, Empty, Spin } from 'antd';
import { useNavigate } from 'react-router-dom';
import { eventsApi, type EvidenceEvent } from '../services/api';

const PRIORITY_COLORS: Record<string, string> = {
  P0: 'red',
  P1: 'orange',
  P2: 'blue',
  P3: 'default',
};

const EVENT_TYPES = [
  '上线', '测试', '预约', '版号', '榜单变化',
  '买量', '舆情', '融资', '组织动作', '版本更新',
  '出海', '合作', '政策', 'AI应用'
];

export default function EventListPage() {
  const [events, setEvents] = useState<EvidenceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventType, setEventType] = useState<string | undefined>();
  const [priority, setPriority] = useState<string | undefined>();
  const navigate = useNavigate();

  useEffect(() => {
    loadEvents();
  }, [eventType, priority]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const response = await eventsApi.list({ eventType, priority }) as any;
      setEvents(response.data || []);
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      setLoading(false);
    }
  };

  const priorityOrder: Record<string, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
  const sortedEvents = [...events].sort((a, b) => {
    const pDiff = (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3);
    if (pDiff !== 0) return pDiff;
    return b.impactScore - a.impactScore;
  });

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>事件列表</h1>

      <Space style={{ marginBottom: 16 }}>
        <Select
          placeholder="事件类型"
          allowClear
          style={{ width: 150 }}
          value={eventType}
          onChange={setEventType}
          options={EVENT_TYPES.map(t => ({ label: t, value: t }))}
        />
        <Select
          placeholder="优先级"
          allowClear
          style={{ width: 120 }}
          value={priority}
          onChange={setPriority}
          options={['P0', 'P1', 'P2', 'P3'].map(p => ({ label: p, value: p }))}
        />
      </Space>

      <Spin spinning={loading}>
        {sortedEvents.length === 0 ? (
          <Empty description="暂无事件" />
        ) : (
          <List
            grid={{ gutter: 16, xs: 1, sm: 1, md: 2, lg: 2, xl: 3, xxl: 3 }}
            dataSource={sortedEvents}
            renderItem={(event) => (
              <List.Item>
                <Card
                  hoverable
                  onClick={() => navigate(`/events/${event.id}`)}
                  title={
                    <Space>
                      <Tag color={PRIORITY_COLORS[event.priority]}>{event.priority}</Tag>
                      <span style={{ fontSize: 14 }}>{event.eventType}</span>
                    </Space>
                  }
                  extra={<span style={{ color: '#1890ff' }}>{event.impactScore}分</span>}
                >
                  <h3 style={{ marginBottom: 12, fontSize: 16, lineHeight: 1.5 }}>
                    {event.eventTitle}
                  </h3>
                  <div style={{ marginBottom: 12 }}>
                    {event.audienceTags.slice(0, 4).map(tag => (
                      <Tag key={tag} style={{ marginBottom: 4 }}>{tag}</Tag>
                    ))}
                  </div>
                  <div style={{ color: '#666', fontSize: 12 }}>
                    <span>{event.sourceCount} 个来源</span>
                    <span style={{ marginLeft: 16 }}>
                      {new Date(event.lastSeenAt).toLocaleDateString()}
                    </span>
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

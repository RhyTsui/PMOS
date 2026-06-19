import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Tag, List, Button, Space, Spin, Empty } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { eventsApi, type EvidenceEvent } from '../services/api';

const PRIORITY_COLORS: Record<string, string> = {
  P0: 'red', P1: 'orange', P2: 'blue', P3: 'default',
};

const URGENCY_COLORS: Record<string, string> = {
  immediate: 'red', watch: 'orange', info: 'blue',
};

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<EvidenceEvent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadEvent(id);
  }, [id]);

  const loadEvent = async (eventId: string) => {
    setLoading(true);
    try {
      const response = await eventsApi.get(eventId) as any;
      setEvent(response);
    } catch (error) {
      console.error('Failed to load event:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (!event) return <Empty description="事件不存在" />;

  return (
    <div>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/events')}
        style={{ marginBottom: 16 }}
      >
        返回列表
      </Button>

      <Card>
        <Descriptions title={event.eventTitle} bordered column={2}>
          <Descriptions.Item label="事件类型">
            <Tag>{event.eventType}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="优先级">
            <Tag color={PRIORITY_COLORS[event.priority]}>{event.priority}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="影响评分">{event.impactScore}</Descriptions.Item>
          <Descriptions.Item label="来源数量">{event.sourceCount}</Descriptions.Item>
          <Descriptions.Item label="首次发现">
            {new Date(event.firstSeenAt).toLocaleString()}
          </Descriptions.Item>
          <Descriptions.Item label="最近更新">
            {new Date(event.lastSeenAt).toLocaleString()}
          </Descriptions.Item>
          <Descriptions.Item label="适用角色" span={2}>
            {event.audienceTags.map(tag => (
              <Tag key={tag} color="blue">{tag}</Tag>
            ))}
          </Descriptions.Item>
          <Descriptions.Item label="涉及实体" span={2}>
            {event.entities.map((e, i) => (
              <Tag key={i}>{e.name} ({e.type})</Tag>
            ))}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="关键事实" style={{ marginTop: 16 }}>
        <List
          dataSource={event.keyFacts}
          renderItem={(fact) => (
            <List.Item>
              <Space>
                <Tag color={fact.importance === 'high' ? 'red' : fact.importance === 'medium' ? 'orange' : 'default'}>
                  {fact.importance}
                </Tag>
                <span>{fact.fact}</span>
              </Space>
            </List.Item>
          )}
        />
      </Card>

      <Card title="行动建议" style={{ marginTop: 16 }}>
        <List
          dataSource={event.actionAdvice}
          renderItem={(advice) => (
            <List.Item>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Space>
                  <Tag color="green">{advice.role}</Tag>
                  <Tag color={URGENCY_COLORS[advice.urgency]}>{advice.urgency}</Tag>
                </Space>
                <p>{advice.advice}</p>
              </Space>
            </List.Item>
          )}
        />
      </Card>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Tag, Button, Space, Spin, Empty, Typography, Divider } from 'antd';
import { ArrowLeftOutlined, GlobalOutlined, ClockCircleOutlined } from '@ant-design/icons';
import api from '../services/api';

const { Title, Text } = Typography;

interface Evidence {
  id: string;
  title: string;
  content: string;
  url: string;
  sourceId: string;
  sourceName?: string;
  status: string;
  collectedAt: string;
  publishedAt?: string;
}

interface StructuredEvent {
  id: string;
  evidenceId: string;
  eventTitle: string;
  eventType: string;
  priority: string;
  impactScore: number;
  keyFacts: Array<{ fact: string; importance: string; entities: string[] }>;
  actionAdvice: Array<{ role: string; advice: string; urgency: string }>;
  sentiment?: { polarity: string; intensity: number; target?: string };
  audienceTags: string[];
  entities: Array<{ name: string; type: string; role: string }>;
  extractedAt: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  P0: 'red', P1: 'orange', P2: 'blue', P3: 'default',
};

const URGENCY_COLORS: Record<string, string> = {
  immediate: 'red', watch: 'orange', info: 'blue',
};

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const [event, setEvent] = useState<StructuredEvent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadData(id);
  }, [id]);

  const loadData = async (evidenceId: string) => {
    setLoading(true);
    try {
      const evRes = await api.get(`/evidence/${evidenceId}`) as any;
      setEvidence(evRes);

      // 尝试获取结构化事件
      try {
        const eventsRes = await api.get(`/events`) as any;
        const events = Array.isArray(eventsRes) ? eventsRes : [];
        const matched = events.find((e: StructuredEvent) => e.evidenceId === evidenceId);
        if (matched) setEvent(matched);
      } catch {
        // 没有结构化事件也没关系
      }
    } catch (error) {
      console.error('Failed to load:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (!evidence) return <Empty description="文章不存在" />;

  // 清理 HTML 内容，转为可读文本
  const cleanContent = (html: string) => {
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  };

  const formatTime = (t: string) => new Date(t).toLocaleString('zh-CN');

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Button
        type="link"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/events')}
        style={{ marginBottom: 16, paddingLeft: 0 }}
      >
        返回列表
      </Button>

      <Card>
        <Title level={3} style={{ marginTop: 0 }}>{evidence.title}</Title>

        <Space style={{ marginBottom: 16 }}>
          <Tag color="blue">{evidence.sourceName || '未知来源'}</Tag>
          <Text type="secondary"><ClockCircleOutlined /> {formatTime(evidence.collectedAt)}</Text>
          {evidence.url && (
            <a href={evidence.url} target="_blank" rel="noopener noreferrer">
              <Button size="small" icon={<GlobalOutlined />}>原文</Button>
            </a>
          )}
        </Space>

        {/* AI 分析结果 */}
        {event && (
          <>
            <Divider />
            <Card size="small" title="🤖 AI 情报分析" style={{ marginBottom: 24, background: '#f6ffed' }}>
              <Space wrap style={{ marginBottom: 12 }}>
                <Tag color={PRIORITY_COLORS[event.priority]}>{event.priority}</Tag>
                <Tag>{event.eventType}</Tag>
                <Tag color="cyan">影响评分: {event.impactScore}</Tag>
                {event.audienceTags.map(tag => (
                  <Tag key={tag} color="purple">{tag}</Tag>
                ))}
              </Space>

              {event.keyFacts.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <Text strong>关键事实：</Text>
                  <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
                    {event.keyFacts.map((f, i) => (
                      <li key={i} style={{ marginBottom: 4 }}>
                        <Tag color={f.importance === 'high' ? 'red' : f.importance === 'medium' ? 'orange' : 'default'} style={{ fontSize: 11 }}>
                          {f.importance}
                        </Tag>
                        {f.fact}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {event.actionAdvice.length > 0 && (
                <div>
                  <Text strong>行动建议：</Text>
                  <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
                    {event.actionAdvice.map((a, i) => (
                      <li key={i} style={{ marginBottom: 4 }}>
                        <Tag color={URGENCY_COLORS[a.urgency]}>{a.role}</Tag>
                        {a.advice}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          </>
        )}

        <Divider />

        {/* 正文 */}
        <div style={{ lineHeight: 1.8, fontSize: 15, whiteSpace: 'pre-wrap', color: '#333' }}>
          {cleanContent(evidence.content)}
        </div>
      </Card>
    </div>
  );
}

import { useEffect, useState, useMemo } from 'react';
import { Card, Tag, Space, Empty, Spin, Typography, Input, Select, Row, Col, Badge, Tooltip } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  ClockCircleOutlined,
  SearchOutlined,
  FilterOutlined,
  FireOutlined,
  ThunderboltOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { eventsApi } from '../services/api';

const { Text, Paragraph } = Typography;
const { Search } = Input;

const PRIORITY_COLORS: Record<string, string> = {
  P0: 'red', P1: 'orange', P2: 'blue', P3: 'default',
};

const EVENT_TYPES = [
  '上线', '测试', '预约', '版号', '榜单变化',
  '买量', '舆情', '融资', '组织动作', '版本更新',
  '出海', '合作', '政策', 'AI应用',
];

const AUDIENCE_ROLES = ['老板', '战略', '发行', '运营', '广告投放', '数据部', '产品'];

interface StructuredEvent {
  id: string;
  evidenceId: string;
  sourceId: string;
  eventTitle: string;
  eventType: string;
  impactScore: number;
  priority: string;
  audienceTags: string[];
  entities: Array<{ name: string; type: string }>;
  keyFacts: Array<{ fact: string; importance: string }>;
  actionAdvice: Array<{ role: string; advice: string; urgency: string }>;
  sentiment: { polarity: string; intensity: number };
  extractedAt: string;
  model: string;
}

export default function EventListPage() {
  const [events, setEvents] = useState<StructuredEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState<string | undefined>();
  const [priorityFilter, setPriorityFilter] = useState<string | undefined>();
  const [audienceFilter, setAudienceFilter] = useState<string | undefined>();
  const navigate = useNavigate();

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { limit: '200' };
      if (eventTypeFilter) params.eventType = eventTypeFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (audienceFilter) params.audienceTag = audienceFilter;
      if (searchText) params.search = searchText;

      const res = await eventsApi.list(params) as any;
      setEvents(Array.isArray(res) ? res : []);
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      setLoading(false);
    }
  };

  // 当过滤条件变化时重新加载
  useEffect(() => {
    loadEvents();
  }, [eventTypeFilter, priorityFilter, audienceFilter]);

  // 搜索文本变化时重新加载（防抖）
  useEffect(() => {
    const timer = setTimeout(() => {
      loadEvents();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  // 按评分排序
  const sorted = useMemo(
    () => [...events].sort((a, b) => b.impactScore - a.impactScore),
    [events]
  );

  const formatTime = (t: string) => {
    const d = new Date(t);
    const now = new Date();
    const diff = (now.getTime() - d.getTime()) / 1000;
    if (diff < 60) return '刚刚';
    if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
    return `${Math.floor(diff / 86400)} 天前`;
  };

  const getSentimentIcon = (polarity: string) => {
    switch (polarity) {
      case 'positive': return '🟢';
      case 'negative': return '🔴';
      case 'neutral': return '⚪';
      case 'mixed': return '🟡';
      default: return '⚪';
    }
  };

  return (
    <div>
      {/* 页面标题 */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>
          <ThunderboltOutlined style={{ marginRight: 8, color: '#1890ff' }} />
          情报流
        </h1>
        <Badge count={sorted.length} overflowCount={999} style={{ backgroundColor: '#1890ff' }}>
          <Text type="secondary">条已分析情报</Text>
        </Badge>
      </div>

      {/* 搜索和过滤栏 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={12} md={8}>
            <Search
              placeholder="搜索事件标题、实体、关键事实..."
              prefix={<SearchOutlined />}
              allowClear
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
            />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              placeholder="事件类型"
              allowClear
              style={{ width: '100%' }}
              value={eventTypeFilter}
              onChange={setEventTypeFilter}
              options={EVENT_TYPES.map(t => ({ label: t, value: t }))}
              suffixIcon={<FilterOutlined />}
            />
          </Col>
          <Col xs={12} sm={6} md={3}>
            <Select
              placeholder="优先级"
              allowClear
              style={{ width: '100%' }}
              value={priorityFilter}
              onChange={setPriorityFilter}
              options={['P0', 'P1', 'P2', 'P3'].map(p => ({ label: p, value: p }))}
            />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              placeholder="角色视角"
              allowClear
              style={{ width: '100%' }}
              value={audienceFilter}
              onChange={setAudienceFilter}
              options={AUDIENCE_ROLES.map(r => ({ label: r, value: r }))}
            />
          </Col>
          <Col xs={12} sm={6} md={3}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              <EyeOutlined /> {sorted.length} 条结果
            </Text>
          </Col>
        </Row>
      </Card>

      {/* 情报卡片瀑布流 */}
      <Spin spinning={loading}>
        {sorted.length === 0 ? (
          <Empty description="暂无匹配的情报" style={{ marginTop: 60 }} />
        ) : (
          <div
            style={{
              columnCount: 2,
              columnGap: 16,
              // 响应式
              ...(window.innerWidth < 768 ? { columnCount: 1 } : {}),
            }}
          >
            {sorted.map(event => (
              <Card
                key={event.id}
                hoverable
                onClick={() => navigate(`/events/${event.id}`)}
                style={{
                  marginBottom: 16,
                  breakInside: 'avoid',
                  borderLeft: event.priority === 'P0' ? '3px solid #ff4d4f' :
                              event.priority === 'P1' ? '3px solid #fa8c16' : undefined,
                }}
                bodyStyle={{ padding: '16px' }}
              >
                {/* 标题 + 优先级 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <Text strong style={{ fontSize: 15, lineHeight: 1.5, flex: 1 }}>
                    {event.eventTitle}
                  </Text>
                  <Tag color={PRIORITY_COLORS[event.priority]} style={{ marginLeft: 8, flexShrink: 0 }}>
                    {event.priority}
                  </Tag>
                </div>

                {/* 评分条 */}
                <div style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                      影响评分
                    </Text>
                    <div style={{ flex: 1, background: '#f0f0f0', borderRadius: 4, height: 6 }}>
                      <div
                        style={{
                          width: `${event.impactScore}%`,
                          height: '100%',
                          borderRadius: 4,
                          background: event.impactScore >= 80 ? '#ff4d4f' :
                                      event.impactScore >= 60 ? '#fa8c16' : '#1890ff',
                        }}
                      />
                    </div>
                    <Text strong style={{ fontSize: 13 }}>{event.impactScore}</Text>
                  </div>
                </div>

                {/* 事件类型 + 情绪 */}
                <Space size={4} wrap style={{ marginBottom: 8 }}>
                  <Tag color="geekblue">{event.eventType}</Tag>
                  <Tooltip title={`情绪: ${event.sentiment?.polarity || 'neutral'}`}>
                    <span style={{ fontSize: 14 }}>
                      {getSentimentIcon(event.sentiment?.polarity || 'neutral')}
                    </span>
                  </Tooltip>
                </Space>

                {/* 关键事实（最多显示 2 条） */}
                {event.keyFacts?.length > 0 && (
                  <div style={{ marginBottom: 8, background: '#fafafa', borderRadius: 6, padding: '8px 12px' }}>
                    {event.keyFacts.slice(0, 2).map((fact, i) => (
                      <Paragraph
                        key={i}
                        style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}
                        ellipsis={{ rows: 2 }}
                      >
                        <Tag
                          color={fact.importance === 'high' ? 'red' : fact.importance === 'medium' ? 'gold' : 'default'}
                          style={{ fontSize: 10, marginRight: 4 }}
                        >
                          {fact.importance === 'high' ? '重' : fact.importance === 'medium' ? '中' : '轻'}
                        </Tag>
                        {fact.fact}
                      </Paragraph>
                    ))}
                  </div>
                )}

                {/* 实体标签 */}
                {event.entities?.length > 0 && (
                  <Space size={4} wrap style={{ marginBottom: 8 }}>
                    {event.entities.slice(0, 4).map((ent, i) => (
                      <Tag key={i} style={{ fontSize: 11, margin: 0 }}>
                        {ent.name}
                      </Tag>
                    ))}
                    {event.entities.length > 4 && (
                      <Text type="secondary" style={{ fontSize: 11 }}>+{event.entities.length - 4}</Text>
                    )}
                  </Space>
                )}

                {/* 角色标签 + 时间 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Space size={4} wrap>
                    {event.audienceTags?.slice(0, 3).map((tag, i) => (
                      <Tag key={i} color="cyan" style={{ fontSize: 11, margin: 0 }}>
                        {tag}
                      </Tag>
                    ))}
                  </Space>
                  <Text type="secondary" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
                    <ClockCircleOutlined /> {formatTime(event.extractedAt)}
                  </Text>
                </div>

                {/* 高分标记 */}
                {event.impactScore >= 80 && (
                  <div style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                  }}>
                    <FireOutlined style={{ color: '#ff4d4f', fontSize: 16 }} />
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </Spin>
    </div>
  );
}

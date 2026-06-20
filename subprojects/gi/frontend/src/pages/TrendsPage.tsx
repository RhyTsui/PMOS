/**
 * 趋势检测页面
 *
 * 展示行业趋势分析结果
 */
import { useEffect, useState } from 'react';
import { Card, Table, Tag, Space, Statistic, Row, Col, Button, message, Tabs, Empty } from 'antd';
import { TrendingUpOutlined, TrendingDownOutlined, FireOutlined, ReloadOutlined } from '@ant-design/icons';
import api from '../services/api';

interface TrendCluster {
  id: string;
  eventType: string;
  topicTag: string;
  signalCount: number;
  sourceCount: number;
  entityCount: number;
  growthRate: number;
  trendDirection: 'rising' | 'stable' | 'declining' | 'emerging';
  signalIds: string[];
  windowStart: string;
  windowEnd: string;
  createdAt: string;
}

interface TrendStats {
  total: number;
  rising: number;
  stable: number;
  declining: number;
}

export default function TrendsPage() {
  const [trends, setTrends] = useState<TrendCluster[]>([]);
  const [stats, setStats] = useState<TrendStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    loadTrends();
    loadStats();
  }, []);

  const loadTrends = async () => {
    setLoading(true);
    try {
      const res = await api.get('/trends') as any;
      setTrends(Array.isArray(res) ? res : []);
    } catch (error) {
      console.error('Failed to load trends:', error);
      message.error('加载趋势数据失败');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const res = await api.get('/trends/stats') as any;
      setStats(res);
    } catch (error) {
      console.error('Failed to load trend stats:', error);
    }
  };

  const handleDetect = async () => {
    setLoading(true);
    try {
      await api.post('/trends/detect');
      message.success('趋势检测完成');
      loadTrends();
      loadStats();
    } catch (error) {
      message.error('趋势检测失败');
    } finally {
      setLoading(false);
    }
  };

  const getDirectionTag = (direction: string) => {
    const config: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
      rising: { color: 'green', icon: <TrendingUpOutlined />, label: '上升' },
      stable: { color: 'blue', icon: null, label: '稳定' },
      declining: { color: 'red', icon: <TrendingDownOutlined />, label: '下降' },
      emerging: { color: 'orange', icon: <FireOutlined />, label: '新兴' },
    };
    const cfg = config[direction] || config.stable;
    return (
      <Tag color={cfg.color} icon={cfg.icon}>
        {cfg.label}
      </Tag>
    );
  };

  const getGrowthRateColor = (rate: number) => {
    if (rate > 0.5) return '#52c41a';
    if (rate > 0.2) return '#73d13d';
    if (rate > -0.2) return '#1890ff';
    if (rate > -0.5) return '#ff7a45';
    return '#f5222d';
  };

  const columns = [
    {
      title: '事件类型',
      dataIndex: 'eventType',
      key: 'eventType',
      width: 120,
      render: (type: string) => <Tag color="blue">{type}</Tag>,
    },
    {
      title: '话题标签',
      dataIndex: 'topicTag',
      key: 'topicTag',
      width: 150,
    },
    {
      title: '趋势方向',
      dataIndex: 'trendDirection',
      key: 'trendDirection',
      width: 120,
      render: (direction: string) => getDirectionTag(direction),
    },
    {
      title: '增长率',
      dataIndex: 'growthRate',
      key: 'growthRate',
      width: 120,
      render: (rate: number) => (
        <span style={{ color: getGrowthRateColor(rate), fontWeight: 'bold' }}>
          {rate > 0 ? '+' : ''}{(rate * 100).toFixed(1)}%
        </span>
      ),
      sorter: (a: TrendCluster, b: TrendCluster) => a.growthRate - b.growthRate,
    },
    {
      title: '信号数',
      dataIndex: 'signalCount',
      key: 'signalCount',
      width: 100,
      sorter: (a: TrendCluster, b: TrendCluster) => a.signalCount - b.signalCount,
    },
    {
      title: '来源数',
      dataIndex: 'sourceCount',
      key: 'sourceCount',
      width: 100,
    },
    {
      title: '实体数',
      dataIndex: 'entityCount',
      key: 'entityCount',
      width: 100,
    },
    {
      title: '检测时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
    },
  ];

  const filteredTrends = activeTab === 'all'
    ? trends
    : trends.filter(t => t.trendDirection === activeTab);

  const risingTrends = trends.filter(t => t.trendDirection === 'rising' || t.trendDirection === 'emerging');
  const topTrends = [...trends].sort((a, b) => b.growthRate - a.growthRate).slice(0, 5);

  return (
    <div style={{ padding: 24 }}>
      <Card
        title={
          <Space>
            <span>趋势分析</span>
            {stats && (
              <Tag color="blue">{stats.total} 个趋势</Tag>
            )}
          </Space>
        }
        extra={
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => { loadTrends(); loadStats(); }}
              loading={loading}
            >
              刷新
            </Button>
            <Button
              type="primary"
              icon={<FireOutlined />}
              onClick={handleDetect}
              loading={loading}
            >
              立即检测
            </Button>
          </Space>
        }
      >
        {stats && (
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="上升趋势"
                  value={stats.rising}
                  suffix="个"
                  valueStyle={{ color: '#52c41a' }}
                  prefix={<TrendingUpOutlined />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="稳定趋势"
                  value={stats.stable}
                  suffix="个"
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="下降趋势"
                  value={stats.declining}
                  suffix="个"
                  valueStyle={{ color: '#f5222d' }}
                  prefix={<TrendingDownOutlined />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="总趋势数"
                  value={stats.total}
                  suffix="个"
                />
              </Card>
            </Col>
          </Row>
        )}

        {risingTrends.length > 0 && (
          <Card
            size="small"
            title={<span><FireOutlined style={{ color: '#fa8c16' }} /> 热门趋势 TOP 5</span>}
            style={{ marginBottom: 24 }}
          >
            <Row gutter={16}>
              {topTrends.map((trend, index) => (
                <Col span={8} key={trend.id} style={{ marginBottom: 16 }}>
                  <Card size="small" style={{ borderLeft: `3px solid ${getGrowthRateColor(trend.growthRate)}` }}>
                    <div style={{ marginBottom: 8 }}>
                      <Tag color="blue">{trend.eventType}</Tag>
                      {getDirectionTag(trend.trendDirection)}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 8 }}>
                      {trend.topicTag}
                    </div>
                    <div style={{ fontSize: 12, color: '#999' }}>
                      增长率: <span style={{ color: getGrowthRateColor(trend.growthRate), fontWeight: 'bold' }}>
                        {trend.growthRate > 0 ? '+' : ''}{(trend.growthRate * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: '#999' }}>
                      信号: {trend.signalCount} | 来源: {trend.sourceCount}
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>
        )}

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            { key: 'all', label: `全部 (${trends.length})` },
            { key: 'rising', label: `上升 (${trends.filter(t => t.trendDirection === 'rising').length})` },
            { key: 'emerging', label: `新兴 (${trends.filter(t => t.trendDirection === 'emerging').length})` },
            { key: 'stable', label: `稳定 (${trends.filter(t => t.trendDirection === 'stable').length})` },
            { key: 'declining', label: `下降 (${trends.filter(t => t.trendDirection === 'declining').length})` },
          ]}
        />

        {filteredTrends.length > 0 ? (
          <Table
            columns={columns}
            dataSource={filteredTrends}
            rowKey="id"
            loading={loading}
            pagination={{
              pageSize: 20,
              showTotal: total => `共 ${total} 个趋势`,
            }}
          />
        ) : (
          <Empty description="暂无趋势数据" style={{ padding: 48 }} />
        )}
      </Card>
    </div>
  );
}

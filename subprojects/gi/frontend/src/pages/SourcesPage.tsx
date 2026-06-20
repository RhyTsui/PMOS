/**
 * 信源/种子展示页面
 */
import { useState, useEffect } from 'react';
import { Table, Tag, Card, Tabs, Button, Input, Space, message, Select } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import api from '../services/api';
import FeedbackDialog from '../components/FeedbackDialog';

const { Search } = Input;
const { TabPane } = Tabs;

interface Source {
  id: string;
  name: string;
  shortName: string;
  sourceType: string;
  accessMethod: string;
  baseUrl: string;
  feedUrl?: string;
  enabled: boolean;
  priority: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface Seed {
  id: string;
  seedType: string;
  text: string;
  entityType?: string;
  aliases: string[];
  category?: string;
  market?: string;
  score: number;
  status: string;
  tags: string[];
  discoveryCount: number;
  failCount: number;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export default function SourcesPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [seeds, setSeeds] = useState<Seed[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('sources');
  const [feedbackDialogVisible, setFeedbackDialogVisible] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'source' | 'seed'>('source');
  const [sourceSearch, setSourceSearch] = useState('');
  const [seedSearch, setSeedSearch] = useState('');
  const [seedTypeFilter, setSeedTypeFilter] = useState<string>('');

  useEffect(() => {
    loadSources();
    loadSeeds();
  }, []);

  const loadSources = async () => {
    setLoading(true);
    try {
      const response = await api.get('/sources?limit=1000');
      setSources(response.data);
    } catch (error) {
      console.error('Failed to load sources:', error);
      message.error('加载信源失败');
    } finally {
      setLoading(false);
    }
  };

  const loadSeeds = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '1000' });
      if (seedTypeFilter) {
        params.append('seedType', seedTypeFilter);
      }
      const response = await api.get(`/seeds?${params}`);
      setSeeds(response.data);
    } catch (error) {
      console.error('Failed to load seeds:', error);
      message.error('加载种子失败');
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = (type: 'source' | 'seed') => {
    setFeedbackType(type);
    setFeedbackDialogVisible(true);
  };

  const filteredSources = sources.filter(s =>
    s.name.toLowerCase().includes(sourceSearch.toLowerCase()) ||
    s.shortName.toLowerCase().includes(sourceSearch.toLowerCase()) ||
    s.tags.some(tag => tag.toLowerCase().includes(sourceSearch.toLowerCase()))
  );

  const filteredSeeds = seeds.filter(s =>
    s.text.toLowerCase().includes(seedSearch.toLowerCase()) ||
    s.aliases.some(alias => alias.toLowerCase().includes(seedSearch.toLowerCase())) ||
    (s.category && s.category.toLowerCase().includes(seedSearch.toLowerCase())) ||
    s.tags.some(tag => tag.toLowerCase().includes(seedSearch.toLowerCase()))
  );

  const sourceColumns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (text: string, record: Source) => (
        <div>
          <div style={{ fontWeight: 500 }}>{text}</div>
          <div style={{ fontSize: 12, color: '#999' }}>{record.shortName}</div>
        </div>
      ),
    },
    {
      title: '类型',
      dataIndex: 'sourceType',
      key: 'sourceType',
      width: 100,
      render: (type: string) => {
        const colorMap: Record<string, string> = {
          media: 'blue',
          community: 'green',
          official: 'purple',
          social: 'cyan',
          wechat_mp: 'orange',
          forum: 'magenta',
          api: 'geekblue',
        };
        return <Tag color={colorMap[type] || 'default'}>{type}</Tag>;
      },
    },
    {
      title: '采集方式',
      dataIndex: 'accessMethod',
      key: 'accessMethod',
      width: 100,
      render: (method: string) => {
        const colorMap: Record<string, string> = {
          rss: 'blue',
          api: 'green',
          static_crawl: 'orange',
          dynamic: 'purple',
          search: 'cyan',
        };
        return <Tag color={colorMap[method] || 'default'}>{method}</Tag>;
      },
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      render: (priority: string) => {
        const colorMap: Record<string, string> = {
          P0: 'red',
          P1: 'orange',
          P2: 'blue',
          P3: 'default',
        };
        return <Tag color={colorMap[priority] || 'default'}>{priority}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 80,
      render: (enabled: boolean) => (
        <Tag color={enabled ? 'green' : 'default'}>{enabled ? '启用' : '禁用'}</Tag>
      ),
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      render: (tags: string[]) => (
        <Space size={[0, 4]} wrap>
          {tags.slice(0, 3).map(tag => (
            <Tag key={tag} color="processing">{tag}</Tag>
          ))}
          {tags.length > 3 && <Tag>+{tags.length - 3}</Tag>}
        </Space>
      ),
    },
    {
      title: 'URL',
      dataIndex: 'baseUrl',
      key: 'baseUrl',
      ellipsis: true,
      render: (url: string) => (
        <a href={url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12 }}>
          {url}
        </a>
      ),
    },
  ];

  const seedColumns = [
    {
      title: '文本',
      dataIndex: 'text',
      key: 'text',
      width: 200,
      render: (text: string) => <span style={{ fontWeight: 500 }}>{text}</span>,
    },
    {
      title: '类型',
      dataIndex: 'seedType',
      key: 'seedType',
      width: 100,
      render: (type: string) => {
        const colorMap: Record<string, string> = {
          entity: 'blue',
          event: 'green',
          topic: 'purple',
          source: 'orange',
        };
        return <Tag color={colorMap[type] || 'default'}>{type}</Tag>;
      },
    },
    {
      title: '实体类型',
      dataIndex: 'entityType',
      key: 'entityType',
      width: 100,
      render: (type?: string) => type ? <Tag>{type}</Tag> : '-',
    },
    {
      title: '别名',
      dataIndex: 'aliases',
      key: 'aliases',
      render: (aliases: string[]) => (
        <Space size={[0, 4]} wrap>
          {aliases.slice(0, 3).map(alias => (
            <Tag key={alias} color="processing">{alias}</Tag>
          ))}
          {aliases.length > 3 && <Tag>+{aliases.length - 3}</Tag>}
        </Space>
      ),
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (category?: string) => category || '-',
    },
    {
      title: '市场',
      dataIndex: 'market',
      key: 'market',
      width: 80,
      render: (market?: string) => market || '-',
    },
    {
      title: '评分',
      dataIndex: 'score',
      key: 'score',
      width: 80,
      sorter: (a: Seed, b: Seed) => a.score - b.score,
      render: (score: number) => (
        <span style={{ color: score >= 80 ? '#52c41a' : score >= 60 ? '#faad14' : '#999' }}>
          {score}
        </span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          active: 'green',
          dormant: 'orange',
          degraded: 'red',
          retired: 'default',
        };
        return <Tag color={colorMap[status] || 'default'}>{status}</Tag>;
      },
    },
    {
      title: '发现/失败',
      key: 'counts',
      width: 100,
      render: (_: any, record: Seed) => (
        <span>
          <span style={{ color: '#52c41a' }}>{record.discoveryCount}</span>
          {' / '}
          <span style={{ color: record.failCount > 0 ? '#ff4d4f' : '#999' }}>
            {record.failCount}
          </span>
        </span>
      ),
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      render: (tags: string[]) => (
        <Space size={[0, 4]} wrap>
          {tags.slice(0, 3).map(tag => (
            <Tag key={tag} color="processing">{tag}</Tag>
          ))}
          {tags.length > 3 && <Tag>+{tags.length - 3}</Tag>}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card
        title="信源与种子管理"
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => { loadSources(); loadSeeds(); }}>
              刷新
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => handleFeedback(activeTab === 'sources' ? 'source' : 'seed')}
            >
              提交反馈
            </Button>
          </Space>
        }
      >
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab={`情报源 (${filteredSources.length})`} key="sources">
            <div style={{ marginBottom: 16 }}>
              <Search
                placeholder="搜索信源名称、简称、标签..."
                value={sourceSearch}
                onChange={e => setSourceSearch(e.target.value)}
                style={{ width: 400 }}
                allowClear
              />
            </div>
            <Table
              columns={sourceColumns}
              dataSource={filteredSources}
              rowKey="id"
              loading={loading}
              pagination={{
                pageSize: 20,
                showSizeChanger: true,
                showTotal: total => `共 ${total} 条`,
              }}
              scroll={{ x: 1200 }}
            />
          </TabPane>

          <TabPane tab={`种子 (${filteredSeeds.length})`} key="seeds">
            <div style={{ marginBottom: 16, display: 'flex', gap: 16 }}>
              <Search
                placeholder="搜索种子文本、别名、分类、标签..."
                value={seedSearch}
                onChange={e => setSeedSearch(e.target.value)}
                style={{ width: 400 }}
                allowClear
              />
              <Select
                placeholder="按类型筛选"
                value={seedTypeFilter}
                onChange={value => {
                  setSeedTypeFilter(value);
                  setTimeout(loadSeeds, 0);
                }}
                style={{ width: 200 }}
                allowClear
              >
                <Select.Option value="entity">实体</Select.Option>
                <Select.Option value="event">事件</Select.Option>
                <Select.Option value="topic">话题</Select.Option>
                <Select.Option value="source">信源</Select.Option>
              </Select>
            </div>
            <Table
              columns={seedColumns}
              dataSource={filteredSeeds}
              rowKey="id"
              loading={loading}
              pagination={{
                pageSize: 20,
                showSizeChanger: true,
                showTotal: total => `共 ${total} 条`,
              }}
              scroll={{ x: 1400 }}
            />
          </TabPane>
        </Tabs>
      </Card>

      <FeedbackDialog
        visible={feedbackDialogVisible}
        feedbackType={feedbackType}
        onClose={() => setFeedbackDialogVisible(false)}
        onSuccess={() => {
          message.success('反馈提交成功');
          setFeedbackDialogVisible(false);
        }}
      />
    </div>
  );
}

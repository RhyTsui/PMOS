/**
 * 源发现结果页面
 *
 * 展示自动发现的新源，支持审核和添加
 */
import { useEffect, useState } from 'react';
import { Table, Tag, Button, Space, Card, message, Modal, Descriptions, Statistic, Row, Col } from 'antd';
import { PlusOutlined, CheckOutlined, EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import api from '../services/api';

interface DiscoveredSource {
  route: {
    path: string;
    name: string;
    sourceType: string;
    tags: string[];
    priority: string;
    description?: string;
  };
  feedUrl: string;
  title: string;
  description: string;
  itemCount: number;
  registered: boolean;
}

interface DiscoveryReport {
  discoveredAt: string;
  routesChecked: number;
  discoveredCount: number;
  newSources: DiscoveredSource[];
  existingSources: string[];
  failedSources: Array<{
    route: { name: string; path: string };
    error: string;
  }>;
  stats: {
    llm_recommendation: number;
    cooccurrence: number;
    search: number;
    cross_reference: number;
  };
}

export default function SourceDiscoveryPage() {
  const [report, setReport] = useState<DiscoveryReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [selectedSource, setSelectedSource] = useState<DiscoveredSource | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    loadLastDiscovery();
  }, []);

  const loadLastDiscovery = async () => {
    setLoading(true);
    try {
      // 这里暂时使用模拟数据，实际应该从后端获取最近一次发现结果
      // const res = await api.get('/source-discovery/last-report') as any;
      // setReport(res);
    } catch (error) {
      console.error('Failed to load discovery report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDiscover = async () => {
    setDiscovering(true);
    try {
      const res = await api.post('/source-discovery/discover') as any;
      setReport(res);
      message.success(`发现完成，共发现 ${res.discoveredCount} 个新源`);
    } catch (error) {
      message.error('源发现失败');
    } finally {
      setDiscovering(false);
    }
  };

  const handleView = (source: DiscoveredSource) => {
    setSelectedSource(source);
    setModalVisible(true);
  };

  const handleAdd = async (source: DiscoveredSource) => {
    try {
      await api.post('/source-discovery/add', { discovery: source });
      message.success(`已添加源：${source.title}`);
      setModalVisible(false);
      // 刷新列表
      if (report) {
        setReport({
          ...report,
          newSources: report.newSources.map(s =>
            s.feedUrl === source.feedUrl ? { ...s, registered: true } : s
          ),
        });
      }
    } catch (error) {
      message.error('添加源失败');
    }
  };

  const getSourceTypeTag = (type: string) => {
    const colors: Record<string, string> = {
      media: 'blue',
      community: 'green',
      official: 'purple',
      social: 'cyan',
      wechat_mp: 'orange',
      forum: 'magenta',
    };
    return <Tag color={colors[type] || 'default'}>{type}</Tag>;
  };

  const getPriorityTag = (priority: string) => {
    const colors: Record<string, string> = {
      P0: 'red',
      P1: 'orange',
      P2: 'blue',
      P3: 'default',
    };
    return <Tag color={colors[priority]}>{priority}</Tag>;
  };

  const columns = [
    {
      title: '源名称',
      dataIndex: 'title',
      key: 'title',
      width: 200,
    },
    {
      title: '类型',
      key: 'type',
      width: 120,
      render: (_: any, record: DiscoveredSource) => getSourceTypeTag(record.route.sourceType),
    },
    {
      title: '优先级',
      key: 'priority',
      width: 100,
      render: (_: any, record: DiscoveredSource) => getPriorityTag(record.route.priority),
    },
    {
      title: '文章数',
      dataIndex: 'itemCount',
      key: 'itemCount',
      width: 100,
    },
    {
      title: '发现策略',
      key: 'discoveryMethod',
      width: 150,
      render: (_: any, record: DiscoveredSource) => {
        const methods = [];
        if (record.route.tags.includes('llm')) methods.push('LLM');
        if (record.route.tags.includes('cooccurrence')) methods.push('共现');
        return methods.length > 0 ? methods.join(', ') : '-';
      },
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (_: any, record: DiscoveredSource) =>
        record.registered ? (
          <Tag color="green">已添加</Tag>
        ) : (
          <Tag color="orange">待审核</Tag>
        ),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: any, record: DiscoveredSource) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleView(record)}
          >
            详情
          </Button>
          {!record.registered && (
            <Button
              type="link"
              icon={<PlusOutlined />}
              onClick={() => handleAdd(record)}
            >
              添加
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card
        title="源发现"
        extra={
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadLastDiscovery}
              loading={loading}
            >
              刷新
            </Button>
            <Button
              type="primary"
              icon={<CheckOutlined />}
              onClick={handleDiscover}
              loading={discovering}
            >
              立即发现
            </Button>
          </Space>
        }
      >
        {report ? (
          <>
            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col span={6}>
                <Statistic
                  title="检查路由数"
                  value={report.routesChecked}
                  suffix="个"
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="新发现源"
                  value={report.discoveredCount}
                  suffix="个"
                  valueStyle={{ color: '#3f8600' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="已存在源"
                  value={report.existingSources.length}
                  suffix="个"
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="失败数"
                  value={report.failedSources.length}
                  suffix="个"
                  valueStyle={{ color: report.failedSources.length > 0 ? '#cf1322' : undefined }}
                />
              </Col>
            </Row>

            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col span={6}>
                <Card size="small">
                  <Statistic title="LLM 推荐" value={report.stats.llm_recommendation} suffix="个" />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic title="共现提取" value={report.stats.cooccurrence} suffix="个" />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic title="搜索引擎" value={report.stats.search} suffix="个" />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic title="交叉引用" value={report.stats.cross_reference} suffix="个" />
                </Card>
              </Col>
            </Row>

            <Table
              columns={columns}
              dataSource={report.newSources}
              rowKey="feedUrl"
              pagination={{
                pageSize: 20,
                showTotal: total => `共 ${total} 个新源`,
              }}
            />
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: 48, color: '#999' }}>
            暂无发现结果，点击"立即发现"开始源发现
          </div>
        )}
      </Card>

      <Modal
        title="源详情"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        width={700}
        footer={
          selectedSource && !selectedSource.registered ? (
            <Space>
              <Button onClick={() => setModalVisible(false)}>取消</Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => selectedSource && handleAdd(selectedSource)}
              >
                添加到情报源
              </Button>
            </Space>
          ) : (
            <Button onClick={() => setModalVisible(false)}>关闭</Button>
          )
        }
      >
        {selectedSource && (
          <Descriptions bordered column={1}>
            <Descriptions.Item label="源名称">{selectedSource.title}</Descriptions.Item>
            <Descriptions.Item label="类型">{getSourceTypeTag(selectedSource.route.sourceType)}</Descriptions.Item>
            <Descriptions.Item label="优先级">{getPriorityTag(selectedSource.route.priority)}</Descriptions.Item>
            <Descriptions.Item label="RSS URL">
              <a href={selectedSource.feedUrl} target="_blank" rel="noopener noreferrer">
                {selectedSource.feedUrl}
              </a>
            </Descriptions.Item>
            <Descriptions.Item label="路由路径">{selectedSource.route.path}</Descriptions.Item>
            <Descriptions.Item label="描述">{selectedSource.description || selectedSource.route.description || '-'}</Descriptions.Item>
            <Descriptions.Item label="文章数量">{selectedSource.itemCount} 篇</Descriptions.Item>
            <Descriptions.Item label="标签">
              <Space>
                {selectedSource.route.tags.map(tag => (
                  <Tag key={tag}>{tag}</Tag>
                ))}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              {selectedSource.registered ? (
                <Tag color="green">已添加</Tag>
              ) : (
                <Tag color="orange">待审核</Tag>
              )}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}

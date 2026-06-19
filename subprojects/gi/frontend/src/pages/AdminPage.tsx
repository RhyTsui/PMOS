import { useEffect, useState } from 'react';
import { Tabs, Table, Button, Space, Tag, message, Card, Switch } from 'antd';
import { PlayCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import { sourcesApi, seedsApi, systemApi, collectionApi } from '../services/api';
import type { IntelSource, Seed, SystemStatus } from '../services/api';

export default function AdminPage() {
  const [sources, setSources] = useState<IntelSource[]>([]);
  const [seeds, setSeeds] = useState<Seed[]>([]);
  const [status, setStatus] = useState<SystemStatus | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [sourcesRes, seedsRes, statusRes] = await Promise.all([
        sourcesApi.list() as any,
        seedsApi.list() as any,
        systemApi.status(),
      ]);
      setSources(sourcesRes.data || []);
      setSeeds(seedsRes.data || []);
      setStatus(statusRes);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const handleToggleScheduler = async (checked: boolean) => {
    try {
      if (checked) {
        await systemApi.startScheduler();
        message.success('调度器已启动');
      } else {
        await systemApi.stopScheduler();
        message.success('调度器已停止');
      }
      const statusRes = await systemApi.status();
      setStatus(statusRes);
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleCollectAll = async () => {
    try {
      message.loading({ content: '正在采集...', key: 'collect' });
      await collectionApi.collectAll();
      message.success({ content: '采集完成', key: 'collect' });
    } catch (error) {
      message.error({ content: '采集失败', key: 'collect' });
    }
  };

  const handleEvolveSeeds = async () => {
    try {
      message.loading({ content: '正在进化种子...', key: 'evolve' });
      await seedsApi.evolve();
      message.success({ content: '种子进化完成', key: 'evolve' });
      const seedsRes = await seedsApi.list() as any;
      setSeeds(seedsRes.data || []);
    } catch (error) {
      message.error({ content: '进化失败', key: 'evolve' });
    }
  };

  const sourceColumns = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '类型', dataIndex: 'sourceType', key: 'sourceType' },
    { title: '采集方式', dataIndex: 'accessMethod', key: 'accessMethod' },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      render: (p: string) => <Tag color={p === 'P0' ? 'red' : p === 'P1' ? 'orange' : 'blue'}>{p}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      render: (e: boolean) => <Tag color={e ? 'green' : 'default'}>{e ? '启用' : '禁用'}</Tag>,
    },
  ];

  const seedColumns = [
    { title: '文本', dataIndex: 'text', key: 'text' },
    { title: '类型', dataIndex: 'seedType', key: 'seedType' },
    {
      title: '评分',
      dataIndex: 'score',
      key: 'score',
      render: (s: number) => <span style={{ color: s >= 80 ? '#52c41a' : s >= 50 ? '#faad14' : '#f5222d' }}>{s}</span>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => <Tag color={s === 'active' ? 'green' : s === 'degraded' ? 'orange' : 'default'}>{s}</Tag>,
    },
  ];

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>系统管理</h1>

      <Card title="调度器控制" style={{ marginBottom: 16 }}>
        <Space size="large">
          <span>调度器状态：</span>
          <Switch
            checked={status?.scheduler.isRunning}
            onChange={handleToggleScheduler}
            checkedChildren="运行"
            unCheckedChildren="停止"
          />
          <Button icon={<ReloadOutlined />} onClick={handleCollectAll}>
            立即采集全部
          </Button>
          <Button icon={<PlayCircleOutlined />} onClick={handleEvolveSeeds}>
            种子进化
          </Button>
        </Space>
      </Card>

      <Tabs
        items={[
          {
            key: 'sources',
            label: `情报源 (${sources.length})`,
            children: (
              <Table
                dataSource={sources}
                columns={sourceColumns}
                rowKey="id"
                pagination={{ pageSize: 10 }}
              />
            ),
          },
          {
            key: 'seeds',
            label: `种子 (${seeds.length})`,
            children: (
              <Table
                dataSource={seeds}
                columns={seedColumns}
                rowKey="id"
                pagination={{ pageSize: 10 }}
              />
            ),
          },
        ]}
      />
    </div>
  );
}

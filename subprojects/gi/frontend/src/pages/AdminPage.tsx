import { useEffect, useState } from 'react';
import { Tabs, Table, Button, Space, Tag, message, Card, Switch, Form, Input, Popconfirm } from 'antd';
import { DeleteOutlined, PlayCircleOutlined, ReloadOutlined, SaveOutlined } from '@ant-design/icons';
import { sourcesApi, seedsApi, systemApi, collectionApi } from '../services/api';
import type { IntelSource, Seed, SystemStatus, SchedulerConfig } from '../services/api';

export default function AdminPage() {
  const [sources, setSources] = useState<IntelSource[]>([]);
  const [seeds, setSeeds] = useState<Seed[]>([]);
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [savingScheduler, setSavingScheduler] = useState(false);
  const [form] = Form.useForm<SchedulerConfig>();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [sourcesRes, seedsRes, statusRes, schedulerRes] = await Promise.all([
        sourcesApi.list() as any,
        seedsApi.list() as any,
        systemApi.status(),
        systemApi.getSchedulerSettings(),
      ]);
      setSources(Array.isArray(sourcesRes) ? sourcesRes : []);
      setSeeds(Array.isArray(seedsRes) ? seedsRes : []);
      setStatus(statusRes);
      form.setFieldsValue(schedulerRes.config);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const refreshSchedulerStatus = async () => {
    const [statusRes, schedulerRes] = await Promise.all([
      systemApi.status(),
      systemApi.getSchedulerSettings(),
    ]);
    setStatus(statusRes);
    form.setFieldsValue(schedulerRes.config);
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
      await refreshSchedulerStatus();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleSaveSchedulerConfig = async () => {
    try {
      setSavingScheduler(true);
      const values = await form.validateFields();
      const result = await systemApi.updateSchedulerSettings(values);
      form.setFieldsValue(result.config);
      const statusRes = await systemApi.status();
      setStatus(statusRes);
      message.success('后台配置已保存');
    } catch (error) {
      message.error('后台配置保存失败');
    } finally {
      setSavingScheduler(false);
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
      setSeeds(Array.isArray(seedsRes) ? seedsRes : []);
    } catch (error) {
      message.error({ content: '进化失败', key: 'evolve' });
    }
  };

  const handleDeleteSource = async (id: string) => {
    try {
      await sourcesApi.delete(id);
      message.success('情报源已删除');
      const sourcesRes = await sourcesApi.list() as any;
      setSources(Array.isArray(sourcesRes) ? sourcesRes : []);
    } catch (error) {
      message.error('删除情报源失败');
    }
  };

  const handleDeleteSeed = async (id: string) => {
    try {
      await seedsApi.delete(id);
      message.success('种子已删除');
      const seedsRes = await seedsApi.list() as any;
      setSeeds(Array.isArray(seedsRes) ? seedsRes : []);
    } catch (error) {
      message.error('删除种子失败');
    }
  };

  const cronRules = [{ required: true, message: '请输入 cron 表达式' }];

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
    {
      title: '操作',
      key: 'actions',
      render: (_: unknown, record: IntelSource) => (
        <Popconfirm
          title="确认删除情报源？"
          description="删除后调度器不会再采集该源，已有证据不会自动删除。"
          okText="删除"
          cancelText="取消"
          okButtonProps={{ danger: true }}
          onConfirm={() => handleDeleteSource(record.id)}
        >
          <Button danger size="small" icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
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
    {
      title: '操作',
      key: 'actions',
      render: (_: unknown, record: Seed) => (
        <Popconfirm
          title="确认删除种子？"
          description="删除后该种子不再参与采集过滤和发现。"
          okText="删除"
          cancelText="取消"
          okButtonProps={{ danger: true }}
          onConfirm={() => handleDeleteSeed(record.id)}
        >
          <Button danger size="small" icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>系统管理</h1>

      <Card title="调度器控制" style={{ marginBottom: 16 }}>
        <Space size="large" wrap>
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

      <Card title="后台配置" style={{ marginBottom: 16 }}>
        <Form form={form} layout="vertical">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            <Form.Item name="enabled" label="启动时自动运行" valuePropName="checked">
              <Switch checkedChildren="开启" unCheckedChildren="关闭" />
            </Form.Item>
            <Form.Item name="enableAutoCollection" label="自动采集" valuePropName="checked">
              <Switch checkedChildren="开启" unCheckedChildren="关闭" />
            </Form.Item>
            <Form.Item name="defaultCron" label="默认采集 cron" rules={cronRules}>
              <Input placeholder="*/30 * * * *" />
            </Form.Item>
            <Form.Item name="healthCheckCron" label="健康检查 cron" rules={cronRules}>
              <Input placeholder="0 * * * *" />
            </Form.Item>
            <Form.Item name="evolutionCron" label="种子进化 cron" rules={cronRules}>
              <Input placeholder="0 3 * * 1" />
            </Form.Item>
            <Form.Item name="cleanupCron" label="清理任务 cron" rules={cronRules}>
              <Input placeholder="0 2 * * *" />
            </Form.Item>
            <Form.Item name="gapDetectionCron" label="漏采检测 cron" rules={cronRules}>
              <Input placeholder="0 9 * * *" />
            </Form.Item>
            <Form.Item name="sourceDiscoveryCron" label="源发现 cron" rules={cronRules}>
              <Input placeholder="0 4 * * 0" />
            </Form.Item>
            <Form.Item name="dailyReportCron" label="每日报告 cron" rules={cronRules}>
              <Input placeholder="0 22 * * *" />
            </Form.Item>
          </div>
          <Button type="primary" icon={<SaveOutlined />} loading={savingScheduler} onClick={handleSaveSchedulerConfig}>
            保存后台配置
          </Button>
        </Form>
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

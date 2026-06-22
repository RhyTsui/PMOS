/**
 * LLM 供应商管理页面
 *
 * 后台配置大模型供应商，支持公司中转代理模式。
 */
import { useEffect, useState } from 'react';
import {
  Table, Button, Space, Tag, message, Card, Modal, Form,
  Input, InputNumber, Select, Switch, Typography, Popconfirm,
} from 'antd';
import {
  PlusOutlined, ReloadOutlined, DeleteOutlined,
  EditOutlined, ApiOutlined,
} from '@ant-design/icons';
import { llmProvidersApi, type LLMProvider } from '../services/api';

const { Text } = Typography;

export default function LLMProvidersPage() {
  const [providers, setProviders] = useState<LLMProvider[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProvider, setEditingProvider] = useState<LLMProvider | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await llmProvidersApi.list() as any;
      setProviders(Array.isArray(data) ? data : []);
    } catch (error) {
      message.error('加载供应商列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingProvider(null);
    form.resetFields();
    form.setFieldsValue({
      providerType: 'qwen',
      enabled: true,
      rateLimitRpm: 30,
      rateLimitDaily: 1000,
      priority: 100,
      status: 'active',
      models: [],
    });
    setModalVisible(true);
  };

  const handleEdit = (provider: LLMProvider) => {
    setEditingProvider(provider);
    form.setFieldsValue({
      ...provider,
      apiKey: '', // 不回显，需要用户重新输入完整 key
      models: provider.models.join(', '),
    });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const models = typeof values.models === 'string'
        ? values.models.split(',').map((m: string) => m.trim()).filter(Boolean)
        : values.models || [];

      const payload = {
        ...values,
        models,
      };

      if (editingProvider) {
        await llmProvidersApi.update(editingProvider.id, payload);
        message.success('更新成功');
      } else {
        await llmProvidersApi.create(payload);
        message.success('创建成功');
      }
      setModalVisible(false);
      loadData();
    } catch (error: any) {
      if (error.errorFields) return; // form validation error
      message.error(error.message || '操作失败');
    }
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    try {
      await llmProvidersApi.toggle(id, enabled);
      message.success(enabled ? '已启用' : '已禁用');
      loadData();
    } catch (error: any) {
      message.error(error.message || '操作失败');
    }
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    try {
      const result = await llmProvidersApi.test(id) as any;
      message.success(`测试成功：${result.response?.slice(0, 50)}...`);
      loadData();
    } catch (error: any) {
      message.error(`测试失败: ${error.response?.data?.error?.message || error.message}`);
    } finally {
      setTestingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await llmProvidersApi.delete(id);
      message.success('删除成功');
      loadData();
    } catch (error: any) {
      message.error(error.message || '删除失败');
    }
  };

  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 180,
      render: (name: string, record: LLMProvider) => (
        <Space direction="vertical" size={0}>
          <Text strong>{name}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.providerType} · 优先级 {record.priority}
          </Text>
        </Space>
      ),
    },
    {
      title: 'API 端点',
      dataIndex: 'baseUrl',
      key: 'baseUrl',
      width: 280,
      ellipsis: true,
      render: (url: string, record: LLMProvider) => (
        <Space direction="vertical" size={0}>
          <Text copyable style={{ fontSize: 12 }}>{url}</Text>
          {record.modelBaseUrl && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              实际模型: {record.modelBaseUrl}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'API Key',
      dataIndex: 'apiKey',
      key: 'apiKey',
      width: 140,
      render: (key: string) => (
        <Text code style={{ fontSize: 12 }}>{key}</Text>
      ),
    },
    {
      title: '模型',
      dataIndex: 'models',
      key: 'models',
      width: 250,
      render: (models: string[], record: LLMProvider) => (
        <Space wrap size={[4, 4]}>
          {models.map((m) => (
            <Tag key={m} color={m === record.defaultModel ? 'blue' : 'default'}>
              {m}
              {m === record.defaultModel && ' ★'}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '限流',
      key: 'rateLimit',
      width: 100,
      render: (_: any, record: LLMProvider) => (
        <Text style={{ fontSize: 12 }}>
          {record.rateLimitRpm} RPM<br />
          {record.rateLimitDaily} / 日
        </Text>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status: string, record: LLMProvider) => (
        <Space direction="vertical" size={0}>
          <Space>
            <Tag color={
              status === 'active' ? 'green' :
              status === 'error' ? 'red' :
              'default'
            }>
              {status === 'active' ? '正常' : status === 'error' ? '错误' : '停用'}
            </Tag>
            <Switch
              size="small"
              checked={record.enabled}
              onChange={(checked) => handleToggle(record.id, checked)}
            />
          </Space>
          {record.lastError && (
            <Text type="danger" style={{ fontSize: 11 }} ellipsis>
              {record.lastError}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      render: (_: any, record: LLMProvider) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={testingId === record.id ? undefined : <ApiOutlined />}
            loading={testingId === record.id}
            onClick={() => handleTest(record.id)}
          >
            测试
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除此供应商？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
        title={
          <Space>
            <ApiOutlined />
            <span>LLM 供应商管理</span>
          </Space>
        }
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadData}>
              刷新
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              添加供应商
            </Button>
          </Space>
        }
      >
        <Table
          dataSource={providers}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          size="small"
        />
      </Card>

      <Modal
        title={editingProvider ? '编辑供应商' : '添加供应商'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSubmit}
        width={700}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="供应商名称"
            rules={[{ required: true, message: '请输入名称' }]}
          >
            <Input placeholder="如：Qwen-公司代理" />
          </Form.Item>

          <Form.Item
            name="providerType"
            label="供应商类型"
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { value: 'qwen', label: '通义千问' },
                { value: 'minimax', label: 'MiniMax' },
                { value: 'deepseek', label: 'DeepSeek' },
                { value: 'openai_compatible', label: 'OpenAI 兼容' },
                { value: 'anthropic', label: 'Anthropic' },
                { value: 'custom', label: '自定义' },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="apiKey"
            label={editingProvider ? 'API Key（留空保持不变）' : 'API Key'}
            rules={editingProvider ? [] : [{ required: true, message: '请输入 API Key' }]}
            extra={editingProvider ? '输入完整的 Key 才会更新' : ''}
          >
            <Input.Password placeholder="sk-..." />
          </Form.Item>

          <Form.Item
            name="baseUrl"
            label="API 端点（公司中转代理地址）"
            rules={[{ required: true, message: '请输入 API 端点' }]}
            extra="公司中转代理 URL，如 https://llm-proxy.company.com/v1"
          >
            <Input placeholder="https://..." />
          </Form.Item>

          <Form.Item
            name="modelBaseUrl"
            label="实际模型 URL（可选）"
            extra="记录用，实际模型提供商地址"
          >
            <Input placeholder="https://..." />
          </Form.Item>

          <Form.Item
            name="models"
            label="支持的模型"
            rules={[{ required: true, message: '请输入模型列表' }]}
            extra="逗号分隔，如：qwen-max,qwen-plus,Qwen3.5-397B"
          >
            <Input placeholder="model1, model2, model3" />
          </Form.Item>

          <Form.Item
            name="defaultModel"
            label="默认模型"
          >
            <Input placeholder="可选，不指定时使用第一个模型" />
          </Form.Item>

          <Space size="large">
            <Form.Item
              name="rateLimitRpm"
              label="每分钟请求限制"
              rules={[{ required: true }]}
            >
              <InputNumber min={1} max={1000} />
            </Form.Item>

            <Form.Item
              name="rateLimitDaily"
              label="每日请求限制"
              rules={[{ required: true }]}
            >
              <InputNumber min={1} max={100000} />
            </Form.Item>

            <Form.Item
              name="priority"
              label="优先级"
              rules={[{ required: true }]}
              extra="数字越小优先级越高"
            >
              <InputNumber min={1} max={1000} />
            </Form.Item>
          </Space>

          <Space size="large">
            <Form.Item
              name="costPer1mInput"
              label="输入成本 ($/1M tokens)"
            >
              <InputNumber min={0} step={0.1} precision={2} />
            </Form.Item>

            <Form.Item
              name="costPer1mOutput"
              label="输出成本 ($/1M tokens)"
            >
              <InputNumber min={0} step={0.1} precision={2} />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { App, Button, Input, Select, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { RefreshCw, Search } from 'lucide-react';
import type { OperationLogRecord } from '@/lib/admin-operation-log-store';
import {
  AdminCrudEmptyState,
  AdminCrudErrorState,
  AdminCrudHeader,
  AdminCrudListSkeleton,
  AdminCrudShell,
  AdminCrudToolbar,
} from './AdminCrudScaffold';

interface OperationLogsResponse {
  logs?: OperationLogRecord[];
}

type OperationLogFilters = {
  module: string;
  action: string;
  targetType: string;
  actor: string;
  keyword: string;
};

const MODULE_OPTIONS = [
  { value: '', label: '全部模块' },
  { value: 'prompt', label: '提示词' },
  { value: 'feature_switch', label: '功能开关' },
  { value: 'admin_user', label: '用户' },
  { value: 'automation_template', label: '自动任务' },
  { value: 'report_template', label: '报告模板' },
  { value: 'trace_config', label: '链路追踪' },
  { value: 'project_service', label: '项目服务' },
  { value: 'model_service', label: '模型服务' },
  { value: 'chat_display', label: '会话展示' },
];

const ACTION_OPTIONS = [
  { value: '', label: '全部动作' },
  { value: 'create', label: '新建' },
  { value: 'update', label: '修改' },
  { value: 'delete', label: '删除' },
  { value: 'binding', label: '绑定' },
];

function formatTime(value?: string): string {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toLocaleDateString('zh-CN')} ${date.toLocaleTimeString('zh-CN', { hour12: false })}`;
}

export function OperationLogsTab() {
  const { message } = App.useApp();
  const [logs, setLogs] = useState<OperationLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [module, setModule] = useState('');
  const [action, setAction] = useState('');
  const [targetType, setTargetType] = useState('');
  const [actor, setActor] = useState('');
  const [keyword, setKeyword] = useState('');

  const loadLogs = async (override?: Partial<OperationLogFilters>) => {
    setLoading(true);
    setLoadError(null);
    try {
      const filters = {
        module,
        action,
        targetType,
        actor,
        keyword,
        ...override,
      };
      const params = new URLSearchParams();
      if (filters.module) params.set('module', filters.module);
      if (filters.action) params.set('action', filters.action);
      if (filters.targetType) params.set('target_type', filters.targetType);
      if (filters.actor.trim()) params.set('actor', filters.actor.trim());
      if (filters.keyword.trim()) params.set('keyword', filters.keyword.trim());
      params.set('limit', '200');
      const response = await fetch(`/api/xiaoqiao/admin/operation-logs?${params.toString()}`, { cache: 'no-store' });
      const payload = await response.json() as OperationLogsResponse & { message?: string };
      if (!response.ok) throw new Error(payload.message || '读取操作记录失败');
      setLogs(Array.isArray(payload.logs) ? payload.logs : []);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '读取操作记录失败';
      message.error(errorMessage);
      setLoadError(errorMessage);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadLogs();
  }, []);

  const columns: ColumnsType<OperationLogRecord> = [
    {
      title: '时间',
      dataIndex: 'created_at',
      width: 180,
      render: (value) => formatTime(value),
    },
    {
      title: '模块',
      dataIndex: 'module',
      width: 140,
      render: (value: string) => (
        <Tag>{MODULE_OPTIONS.find((item) => item.value === value)?.label || value}</Tag>
      ),
    },
    {
      title: '动作',
      dataIndex: 'action',
      width: 110,
      render: (value: string) => ACTION_OPTIONS.find((item) => item.value === value)?.label || value,
    },
    {
      title: '对象',
      dataIndex: 'target_name',
      width: 200,
      render: (_, record) => (
        <div>
          <div className="font-medium text-[#10233f]">{record.target_name || record.target_id || '--'}</div>
          <div className="text-xs text-[#6b7c93]">{record.target_type}</div>
        </div>
      ),
    },
    {
      title: '操作者',
      dataIndex: 'actor',
      width: 180,
      render: (_, record) => (
        <div>
          <div className="font-medium text-[#10233f]">{record.actor.real_name || record.actor.user_name}</div>
          <div className="text-xs text-[#6b7c93]">{record.actor.account}</div>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (value: OperationLogRecord['status']) => (
        value === 'success' ? <Tag color="green">成功</Tag> : <Tag color="red">失败</Tag>
      ),
    },
    {
      title: '摘要',
      dataIndex: 'summary',
      render: (value: string) => <span className="text-[#355070]">{value}</span>,
    },
  ];

  return (
    <AdminCrudShell>
      <AdminCrudHeader
        title="操作记录"
        description="查看管理中心关键变更，展开记录可核对变更内容、详情和附加信息。"
        actions={(
          <Button icon={<RefreshCw size={14} />} onClick={() => void loadLogs()} disabled={loading}>
            刷新
          </Button>
        )}
      />
      {loadError ? (
        <AdminCrudErrorState
          description={loadError}
          action={<Button size="small" onClick={() => void loadLogs()}>重新读取</Button>}
        />
      ) : null}
      <AdminCrudToolbar>
        <div className="grid flex-1 gap-3 md:grid-cols-5">
          <Input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            allowClear
            prefix={<Search size={14} className="text-[#94a3b8]" />}
            placeholder="搜索操作者、对象或摘要"
          />
          <Select value={module} onChange={setModule} options={MODULE_OPTIONS} />
          <Select value={action} onChange={setAction} options={ACTION_OPTIONS} />
          <Input
            value={targetType}
            onChange={(event) => setTargetType(event.target.value)}
            allowClear
            placeholder="对象类型"
          />
          <Input
            value={actor}
            onChange={(event) => setActor(event.target.value)}
            allowClear
            placeholder="操作者"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button type="primary" onClick={() => void loadLogs()}>应用</Button>
          <Button onClick={() => {
            const emptyFilters: OperationLogFilters = {
              module: '',
              action: '',
              targetType: '',
              actor: '',
              keyword: '',
            };
            setModule(emptyFilters.module);
            setAction(emptyFilters.action);
            setTargetType(emptyFilters.targetType);
            setActor(emptyFilters.actor);
            setKeyword(emptyFilters.keyword);
            void loadLogs(emptyFilters);
          }}>
            清空
          </Button>
        </div>
      </AdminCrudToolbar>

      <div className="min-h-0 flex-1 overflow-auto px-5 py-4">
          {loading ? (
            <AdminCrudListSkeleton rows={6} />
          ) : logs.length > 0 ? (
            <Table
              rowKey="id"
              size="middle"
              loading={loading}
              columns={columns}
              dataSource={logs}
              pagination={{ pageSize: 20 }}
              expandable={{
                expandedRowRender: (record) => (
                  <div className="space-y-2 rounded-[14px] bg-[#f8fbff] p-4 text-xs text-[#355070]">
                    <div><span className="text-[#6b7c93]">变更：</span> {(record.changes || []).join(' ; ') || '--'}</div>
                    <div><span className="text-[#6b7c93]">详情：</span> {record.detail || '--'}</div>
                    <div><span className="text-[#6b7c93]">附加信息：</span> {JSON.stringify(record.metadata || {})}</div>
                  </div>
                ),
              }}
            />
          ) : (
            <AdminCrudEmptyState
              title="暂无操作记录"
              description="当前筛选条件下没有记录。可以清空筛选条件，或稍后刷新查看新的管理操作。"
              action={<Button onClick={() => {
                const emptyFilters: OperationLogFilters = { module: '', action: '', targetType: '', actor: '', keyword: '' };
                setModule('');
                setAction('');
                setTargetType('');
                setActor('');
                setKeyword('');
                void loadLogs(emptyFilters);
              }}>清空筛选</Button>}
            />
          )}
      </div>
    </AdminCrudShell>
  );
}

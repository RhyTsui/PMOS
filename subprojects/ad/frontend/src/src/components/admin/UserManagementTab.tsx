'use client';

import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { App, Button, Drawer, Input, Select, Space, Switch, Table, Tag, Divider } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Plus, RefreshCw, Search, Sparkles } from 'lucide-react';
import type { AdminUserRecord } from '@/lib/admin-access-types';
import type { RoleProfile, UserPreferenceProfile } from '@/types';
import { readClientStorage, writeClientStorage } from './admin-tab-helpers';
import {
  AdminCrudEmptyState,
  AdminCrudErrorState,
  AdminCrudHeader,
  AdminCrudListSkeleton,
  AdminCrudShell,
  AdminCrudToolbar,
} from './AdminCrudScaffold';

interface UserManagementResponse {
  users?: AdminUserRecord[];
}

interface RoleProfilesResponse {
  roles?: RoleProfile[];
}

type UserDraft = {
  id?: string;
  account: string;
  user_name: string;
  real_name: string;
  phone: string;
  status: 'active' | 'disabled';
  can_view_admin: boolean;
  can_operate_admin: boolean;
};

type PreferenceDraft = {
  defaultRole: string;
  currentRole: string;
  activePreferences: string;
  outputStyle: string[];
  analysisFocus: string[];
  riskBias: string[];
  explanationDepth: string;
  decisionStyle: string;
};

const EMPTY_DRAFT: UserDraft = {
  account: '',
  user_name: '',
  real_name: '',
  phone: '',
  status: 'active',
  can_view_admin: false,
  can_operate_admin: false,
};

const ROLE_FALLBACK_OPTIONS: Array<{ label: string; value: string }> = [
  { label: '设计师', value: 'designer' },
  { label: '优化师', value: 'optimizer' },
  { label: '观察员', value: 'observer' },
];

const OUTPUT_STYLE_OPTIONS = [
  '先结论后证据',
  '证据优先',
  '简洁回答',
  '详细说明',
  '结果导向',
];

const ANALYSIS_FOCUS_OPTIONS = [
  '项目进展',
  'ROI与成本',
  '异常与阻塞',
  '素材表现',
  '交付状态',
];

const RISK_BIAS_OPTIONS = ['保守', '均衡', '直接'];

const EXPLANATION_DEPTH_OPTIONS = [
  { label: '简洁', value: 'brief' },
  { label: '均衡', value: 'balanced' },
  { label: '详细', value: 'detailed' },
];

const DECISION_STYLE_OPTIONS = [
  { label: '先确认', value: 'confirm-first' },
  { label: '均衡', value: 'balanced' },
  { label: '直接推进', value: 'direct' },
];

const ADMIN_USER_QUERY_STORAGE_KEY = 'xiaoqiao-admin-user-query';

function formatTime(value?: string): string {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toLocaleDateString('zh-CN')} ${date.toLocaleTimeString('zh-CN', { hour12: false })}`;
}

function splitTextList(value: string): string[] {
  return value
    .split(/[\n,，、]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinTextList(value: string[] | undefined | null): string {
  return Array.isArray(value) ? value.join('\n') : '';
}

function permissionTags(user: AdminUserRecord) {
  if (user.is_super_admin) {
    return <Tag color="red">超级管理员</Tag>;
  }
  const tags: ReactElement[] = [];
  if (user.can_operate_admin) tags.push(<Tag key="operate" color="blue">管理操作</Tag>);
  if (user.can_view_admin) tags.push(<Tag key="view" color="geekblue">管理查看</Tag>);
  if (tags.length === 0) return <Tag>无管理权限</Tag>;
  return <Space size={4} wrap>{tags}</Space>;
}

function preferenceSummaryTag(user: AdminUserRecord) {
  const summary = user.preference_summary;
  if (!summary) {
    return <Tag color="default">未生成</Tag>;
  }
  return (
    <Space size={4} wrap>
      <Tag color="cyan">{summary.currentRole || summary.defaultRole}</Tag>
      {summary.outputStyle.slice(0, 2).map((item) => (
        <Tag key={item} color="green">{item}</Tag>
      ))}
    </Space>
  );
}

export function UserManagementTab() {
  const { message } = App.useApp();
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [query, setQueryRaw] = useState(() => readClientStorage(ADMIN_USER_QUERY_STORAGE_KEY) || '');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [draft, setDraft] = useState<UserDraft>(EMPTY_DRAFT);
  const [preferenceDraft, setPreferenceDraft] = useState<PreferenceDraft>({
    defaultRole: 'designer',
    currentRole: 'designer',
    activePreferences: '',
    outputStyle: ['先结论后证据'],
    analysisFocus: ['项目进展'],
    riskBias: ['均衡'],
    explanationDepth: 'balanced',
    decisionStyle: 'balanced',
  });
  const [roleOptions, setRoleOptions] = useState<Array<{ label: string; value: string }>>(ROLE_FALLBACK_OPTIONS);

  const setQuery = (value: string) => {
    setQueryRaw(value);
    writeClientStorage(ADMIN_USER_QUERY_STORAGE_KEY, value.trim() ? value : null);
  };

  const loadUsers = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await fetch('/api/xiaoqiao/admin/users', { cache: 'no-store' });
      const payload = await response.json() as UserManagementResponse & { message?: string };
      if (!response.ok) throw new Error(payload.message || '读取用户列表失败');
      setUsers(Array.isArray(payload.users) ? payload.users : []);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '读取用户列表失败';
      message.error(errorMessage);
      setLoadError(errorMessage);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const loadRoleOptions = async () => {
    try {
      const response = await fetch('/api/xiaoqiao/admin/role-profiles', { cache: 'no-store' });
      const payload = await response.json() as RoleProfilesResponse & { error?: string };
      if (!response.ok) throw new Error(payload.error || '读取角色列表失败');
      const options = (payload.roles || []).map((item) => ({ label: item.name, value: item.id }));
      setRoleOptions(options.length > 0 ? options : ROLE_FALLBACK_OPTIONS);
    } catch {
      setRoleOptions(ROLE_FALLBACK_OPTIONS);
    }
  };

  useEffect(() => {
    void loadUsers();
    void loadRoleOptions();
  }, []);

  const filteredUsers = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return users;
    return users.filter((user) => (
      [user.user_name, user.account, user.real_name, user.phone, user.current_role, user.preference_summary?.defaultRole]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))
    ));
  }, [query, users]);

  const roleLabelByValue = useMemo(
    () => new Map(roleOptions.map((item) => [item.value, item.label])),
    [roleOptions],
  );

  const resetDraft = () => {
    setDraft(EMPTY_DRAFT);
    setPreferenceDraft({
      defaultRole: roleOptions[0]?.value || 'designer',
      currentRole: roleOptions[0]?.value || 'designer',
      activePreferences: '',
      outputStyle: ['先结论后证据'],
      analysisFocus: ['项目进展'],
      riskBias: ['均衡'],
      explanationDepth: 'balanced',
      decisionStyle: 'balanced',
    });
  };

  const openCreateDrawer = () => {
    resetDraft();
    setDrawerOpen(true);
  };

  const openEditDrawer = (user: AdminUserRecord) => {
    const profile = user.preference_profile || null;
    const summaryProfile = user.preference_summary || null;
    setDraft({
      id: user.id,
      account: user.account,
      user_name: user.user_name,
      real_name: user.real_name || '',
      phone: user.phone || '',
      status: user.status,
      can_view_admin: user.can_view_admin,
      can_operate_admin: user.can_operate_admin,
    });
    setPreferenceDraft({
      defaultRole: profile?.defaultRole || summaryProfile?.defaultRole || user.current_role || roleOptions[0]?.value || 'designer',
      currentRole: profile?.currentRole || summaryProfile?.currentRole || user.current_role || roleOptions[0]?.value || 'designer',
      activePreferences: joinTextList(profile?.activePreferences || summaryProfile?.activePreferences || []),
      outputStyle: profile?.inferredPreferences.outputStyle || summaryProfile?.outputStyle || ['先结论后证据'],
      analysisFocus: profile?.inferredPreferences.analysisFocus || summaryProfile?.analysisFocus || ['项目进展'],
      riskBias: profile?.inferredPreferences.riskBias || summaryProfile?.riskBias || ['均衡'],
      explanationDepth: profile?.inferredPreferences.explanationDepth || summaryProfile?.explanationDepth || 'balanced',
      decisionStyle: profile?.inferredPreferences.decisionStyle || summaryProfile?.decisionStyle || 'balanced',
    });
    setDrawerOpen(true);
  };

  const savePreference = async (userId: string) => {
    const response = await fetch(`/api/xiaoqiao/admin/users/${userId}/preference`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        defaultRole: preferenceDraft.defaultRole,
        currentRole: preferenceDraft.currentRole,
        activePreferences: splitTextList(preferenceDraft.activePreferences),
        inferredPreferences: {
          outputStyle: preferenceDraft.outputStyle,
          analysisFocus: preferenceDraft.analysisFocus,
          riskBias: preferenceDraft.riskBias,
          explanationDepth: preferenceDraft.explanationDepth,
          decisionStyle: preferenceDraft.decisionStyle,
        },
      }),
    });
    const payload = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) {
      throw new Error(payload.error || '保存偏好失败');
    }
  };

  const saveUser = async () => {
    if (!draft.account.trim() || !draft.user_name.trim()) {
      message.error('请填写账号和用户名');
      return;
    }
    setSaving(true);
    setSaveState('saving');
    try {
      const response = await fetch(
        draft.id ? `/api/xiaoqiao/admin/users/${draft.id}` : '/api/xiaoqiao/admin/users',
        {
          method: draft.id ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(draft),
        },
      );
      const payload = await response.json().catch(() => ({})) as { message?: string; user?: AdminUserRecord };
      if (!response.ok) throw new Error(payload.message || '保存失败');

      const userId = payload.user?.id || draft.id;
      if (userId) {
        await savePreference(userId);
      }

      message.success('已保存');
      setSaveState('saved');
      setDrawerOpen(false);
      await loadUsers();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存失败');
      setSaveState('error');
    } finally {
      setSaving(false);
      window.setTimeout(() => setSaveState('idle'), 1800);
    }
  };

  const refreshDatakiKey = async (user: AdminUserRecord) => {
    try {
      const response = await fetch(`/api/xiaoqiao/admin/users/${user.id}/dataki-key`, {
        method: 'POST',
      });
      const payload = await response.json().catch(() => ({})) as { message?: string };
      if (!response.ok) throw new Error(payload.message || '刷新个人知识库授权失败');
      message.success('已刷新个人知识库授权');
      await loadUsers();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '刷新个人知识库授权失败');
    }
  };

  const columns: ColumnsType<AdminUserRecord> = [
    {
      title: '用户',
      dataIndex: 'user_name',
      render: (_, record) => (
        <div>
          <div className="font-medium text-[#10233f]">{record.real_name || record.user_name}</div>
          <div className="text-xs text-[#6b7c93]">{record.account}</div>
        </div>
      ),
    },
    {
      title: '权限',
      dataIndex: 'can_view_admin',
      render: (_, record) => permissionTags(record),
    },
    {
      title: '智投角色',
      dataIndex: 'zhitou_role_name',
      render: (_, record) => (
        <Space size={4} wrap>
          <Tag color="blue">{record.zhitou_role_name || record.zhitou_role_id || '未返回'}</Tag>
          {record.mapped_role_id ? <Tag color="cyan">{roleLabelByValue.get(record.mapped_role_id) || record.mapped_role_id}</Tag> : null}
        </Space>
      ),
    },
    {
      title: '偏好画像',
      dataIndex: 'preference_summary',
      render: (_, record) => preferenceSummaryTag(record),
    },
    {
      title: '个人知识库',
      dataIndex: 'dataki_key_status',
      render: (_, record) => (
        <Space size={4} wrap>
          <Tag color={record.dataki_key_status === 'resolved' ? 'green' : record.dataki_key_status === 'failed' ? 'red' : 'default'}>
            {record.dataki_key_status === 'resolved' ? '已内置' : record.dataki_key_status === 'failed' ? '待处理' : '待准备'}
          </Tag>
          {record.dataki_tenant_name ? <Tag color="blue">{record.dataki_tenant_name}</Tag> : null}
        </Space>
      ),
    },
    {
      title: '最近登录',
      dataIndex: 'last_login_at',
      render: (value) => formatTime(value),
    },
    {
      title: '状态',
      dataIndex: 'status',
      render: (value: AdminUserRecord['status']) => (
        <Tag color={value === 'active' ? 'green' : 'default'}>
          {value === 'active' ? '启用' : '停用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'dataki-actions',
      render: (_, record) => (
        <Button type="link" onClick={() => void refreshDatakiKey(record)}>
          刷新授权
        </Button>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Button type="link" onClick={() => openEditDrawer(record)}>
          管理偏好
        </Button>
      ),
    },
  ];

  return (
    <AdminCrudShell>
      <AdminCrudHeader
        title="用户管理"
        description="维护可进入管理中心的账号、权限和偏好画像；保存后会重新读取用户列表，确保页面与服务端结果一致。"
        saveState={saveState}
        actions={(
          <>
            <Button icon={<RefreshCw size={14} />} onClick={() => void loadUsers()} disabled={loading}>
              刷新
            </Button>
            <Button type="primary" icon={<Plus size={14} />} onClick={openCreateDrawer}>
              新增用户
            </Button>
          </>
        )}
      />
      {loadError ? (
        <AdminCrudErrorState
          description={loadError}
          action={<Button size="small" onClick={() => void loadUsers()}>重新读取</Button>}
        />
      ) : null}
      <AdminCrudToolbar>
        <div className="min-w-0 flex-1">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            allowClear
            prefix={<Search size={14} className="text-[#94a3b8]" />}
            placeholder="搜索姓名、账号、角色、偏好关键词"
            className="max-w-xl"
          />
        </div>
        <div className="text-xs text-[#8ea0b8]">共 {users.length} 个用户</div>
      </AdminCrudToolbar>

      <div className="min-h-0 flex-1 overflow-auto px-5 py-4">
          {loading ? (
            <AdminCrudListSkeleton rows={6} />
          ) : filteredUsers.length > 0 ? (
            <Table
              rowKey="id"
              size="middle"
              columns={columns}
              dataSource={filteredUsers}
              pagination={false}
            />
          ) : (
            <AdminCrudEmptyState
              title={query.trim() ? '没有匹配的用户' : '暂无用户'}
              description={query.trim() ? '换一个关键词，或清空搜索条件后再查看。' : '新增用户后，可在这里维护账号权限和偏好画像。'}
              action={query.trim() ? <Button onClick={() => setQuery('')}>清空搜索</Button> : <Button type="primary" onClick={openCreateDrawer}>新增用户</Button>}
            />
          )}
      </div>

      <Drawer
        title={draft.id ? '管理用户偏好' : '新增用户'}
        open={drawerOpen}
        styles={{ wrapper: { width: 760 } }}
        onClose={() => setDrawerOpen(false)}
        destroyOnClose
        footer={
          <Space className="flex justify-end">
            <Button onClick={() => setDrawerOpen(false)}>取消</Button>
            <Button type="primary" loading={saving} onClick={() => void saveUser()}>
              保存
            </Button>
          </Space>
        }
      >
        <div className="space-y-4">
          <section className="rounded-[16px] border border-[#e8eef7] bg-white px-4 py-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-[#10233f]">
              <Sparkles size={15} className="text-[#0f6fff]" />
              基本信息
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <div className="mb-1 text-xs text-[#6b7c93]">登录账号</div>
                <Input
                  value={draft.account}
                  onChange={(event) => setDraft((prev) => ({ ...prev, account: event.target.value }))}
                  placeholder="例如 xuyun"
                  disabled={Boolean(draft.id)}
                />
              </label>
              <label className="block">
                <div className="mb-1 text-xs text-[#6b7c93]">用户名</div>
                <Input
                  value={draft.user_name}
                  onChange={(event) => setDraft((prev) => ({ ...prev, user_name: event.target.value }))}
                  placeholder="例如 徐昱"
                />
              </label>
              <label className="block">
                <div className="mb-1 text-xs text-[#6b7c93]">真实姓名</div>
                <Input
                  value={draft.real_name}
                  onChange={(event) => setDraft((prev) => ({ ...prev, real_name: event.target.value }))}
                  placeholder="可选"
                />
              </label>
              <label className="block">
                <div className="mb-1 text-xs text-[#6b7c93]">手机号</div>
                <Input
                  value={draft.phone}
                  onChange={(event) => setDraft((prev) => ({ ...prev, phone: event.target.value }))}
                  placeholder="可选"
                />
              </label>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="flex items-center justify-between rounded-[14px] border border-[#e8eef7] px-3 py-3">
                <div>
                  <div className="text-sm font-medium text-[#10233f]">管理查看权限</div>
                  <div className="text-xs text-[#6b7c93]">可进入管理中心查看页面</div>
                </div>
                <Switch
                  checked={draft.can_view_admin}
                  disabled={draft.id ? Boolean(users.find((item) => item.id === draft.id)?.is_super_admin) : false}
                  onChange={(checked) => setDraft((prev) => ({
                    ...prev,
                    can_view_admin: checked || prev.can_operate_admin,
                  }))}
                />
              </label>

              <label className="flex items-center justify-between rounded-[14px] border border-[#e8eef7] px-3 py-3">
                <div>
                  <div className="text-sm font-medium text-[#10233f]">管理操作权限</div>
                  <div className="text-xs text-[#6b7c93]">可编辑管理中心配置</div>
                </div>
                <Switch
                  checked={draft.can_operate_admin}
                  disabled={draft.id ? Boolean(users.find((item) => item.id === draft.id)?.is_super_admin) : false}
                  onChange={(checked) => setDraft((prev) => ({
                    ...prev,
                    can_operate_admin: checked,
                    can_view_admin: checked ? true : prev.can_view_admin,
                  }))}
                />
              </label>
            </div>
            {draft.id ? (
              <label className="mt-4 block">
                <div className="mb-1 text-xs text-[#6b7c93]">状态</div>
                <Select
                  value={draft.status}
                  onChange={(value) => setDraft((prev) => ({ ...prev, status: value }))}
                  options={[
                    { value: 'active', label: '启用' },
                    { value: 'disabled', label: '停用' },
                  ]}
                  className="w-full"
                />
              </label>
            ) : null}
          </section>

          <Divider className="!my-0" />

          <section className="rounded-[16px] border border-[#e8eef7] bg-[#f8fbff] px-4 py-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-[#10233f]">
              <Sparkles size={15} className="text-[#7c3aed]" />
              生成的偏好画像
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <div className="mb-1 text-xs text-[#6b7c93]">默认角色</div>
                <Select
                  value={preferenceDraft.defaultRole}
                  onChange={(value) => setPreferenceDraft((prev) => ({ ...prev, defaultRole: value, currentRole: prev.currentRole || value }))}
                  options={roleOptions}
                  className="w-full"
                />
              </label>
              <label className="block">
                <div className="mb-1 text-xs text-[#6b7c93]">当前角色</div>
                <Select
                  value={preferenceDraft.currentRole}
                  onChange={(value) => setPreferenceDraft((prev) => ({ ...prev, currentRole: value }))}
                  options={roleOptions}
                  className="w-full"
                />
              </label>
              <label className="block md:col-span-2">
                <div className="mb-1 text-xs text-[#6b7c93]">主动偏好</div>
                <Input.TextArea
                  value={preferenceDraft.activePreferences}
                  onChange={(event) => setPreferenceDraft((prev) => ({ ...prev, activePreferences: event.target.value }))}
                  rows={3}
                  placeholder="每行一条，例如：先给结论、少讲概念、优先看异常"
                />
              </label>
              <label className="block">
                <div className="mb-1 text-xs text-[#6b7c93]">输出风格</div>
                <Select
                  mode="multiple"
                  value={preferenceDraft.outputStyle}
                  onChange={(value) => setPreferenceDraft((prev) => ({ ...prev, outputStyle: value }))}
                  options={OUTPUT_STYLE_OPTIONS.map((item) => ({ label: item, value: item }))}
                  className="w-full"
                />
              </label>
              <label className="block">
                <div className="mb-1 text-xs text-[#6b7c93]">分析重点</div>
                <Select
                  mode="multiple"
                  value={preferenceDraft.analysisFocus}
                  onChange={(value) => setPreferenceDraft((prev) => ({ ...prev, analysisFocus: value }))}
                  options={ANALYSIS_FOCUS_OPTIONS.map((item) => ({ label: item, value: item }))}
                  className="w-full"
                />
              </label>
              <label className="block">
                <div className="mb-1 text-xs text-[#6b7c93]">风险偏好</div>
                <Select
                  mode="multiple"
                  value={preferenceDraft.riskBias}
                  onChange={(value) => setPreferenceDraft((prev) => ({ ...prev, riskBias: value }))}
                  options={RISK_BIAS_OPTIONS.map((item) => ({ label: item, value: item }))}
                  className="w-full"
                />
              </label>
              <label className="block">
                <div className="mb-1 text-xs text-[#6b7c93]">解释深度</div>
                <Select
                  value={preferenceDraft.explanationDepth}
                  onChange={(value) => setPreferenceDraft((prev) => ({ ...prev, explanationDepth: value }))}
                  options={EXPLANATION_DEPTH_OPTIONS}
                  className="w-full"
                />
              </label>
              <label className="block">
                <div className="mb-1 text-xs text-[#6b7c93]">决策方式</div>
                <Select
                  value={preferenceDraft.decisionStyle}
                  onChange={(value) => setPreferenceDraft((prev) => ({ ...prev, decisionStyle: value }))}
                  options={DECISION_STYLE_OPTIONS}
                  className="w-full"
                />
              </label>
            </div>
          </section>
        </div>
      </Drawer>
    </AdminCrudShell>
  );
}

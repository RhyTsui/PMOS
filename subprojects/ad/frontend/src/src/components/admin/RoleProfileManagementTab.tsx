'use client';

import { useEffect, useMemo, useState } from 'react';
import { App, Button, Drawer, Input, Select, Space, Table, Tag, Divider } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Plus, RefreshCw, Search, Sparkles } from 'lucide-react';
import type { RoleProfile } from '@/types';
import {
  AdminCrudEmptyState,
  AdminCrudErrorState,
  AdminCrudHeader,
  AdminCrudListSkeleton,
  AdminCrudShell,
  AdminCrudToolbar,
} from './AdminCrudScaffold';

interface RoleProfilesResponse {
  roles?: RoleProfile[];
}

type RoleDraft = RoleProfile;

const EMPTY_ROLE: RoleDraft = {
  id: '',
  name: '',
  description: '',
  enabled: true,
  sortOrder: 999,
  defaultPerspective: 'summary',
  allowedPerspectives: ['summary', 'analysis'],
  defaultAgent: 'hub',
  allowedIntentTypes: ['general'],
  scopeTags: [],
  routePolicy: {
    ambiguous: 'confirm',
    outOfScope: 'explain',
    clarificationRounds: 1,
  },
  rolePrompt: '',
  resultTemplate: {
    defaultBlocks: ['结论', '证据', '下一步'],
    blockOrder: ['结论', '证据', '风险', '下一步'],
  },
  responseStyle: {
    outputStyle: ['先结论后证据'],
    analysisFocus: ['项目进展'],
    riskBias: ['均衡'],
    explanationDepth: 'balanced',
    decisionStyle: 'balanced',
  },
  shortcutEntries: [],
  updatedAt: '',
};

const AGENT_OPTIONS = [
  { label: '自动判断', value: 'hub' },
  { label: '帮助', value: 'help' },
  { label: '需求', value: 'demand' },
  { label: '排查', value: 'diagnosis' },
  { label: '联调', value: 'debugging' },
  { label: '交付', value: 'delivery' },
  { label: '监控', value: 'monitoring' },
  { label: '素材', value: 'material' },
  { label: '预测', value: 'prediction' },
];

const PERSPECTIVE_OPTIONS = [
  { label: '总览', value: 'summary' },
  { label: '分析', value: 'analysis' },
  { label: '执行', value: 'operation' },
];

const ROUTE_ACTION_OPTIONS = [
  { label: '先确认', value: 'confirm' },
  { label: '兜底回退', value: 'fallback' },
  { label: '直接引导', value: 'redirect' },
  { label: '解释范围', value: 'explain' },
];

const INTENT_OPTIONS = [
  { label: '帮助', value: 'help' },
  { label: '需求', value: 'demand' },
  { label: '排查', value: 'diagnosis' },
  { label: '联调', value: 'debugging' },
  { label: '交付包', value: 'get_delivery_packages' },
  { label: '监控', value: 'monitor' },
  { label: '预测', value: 'forecast' },
  { label: '通用', value: 'general' },
];

const STYLE_OPTIONS = [
  '先结论后证据',
  '证据优先',
  '简洁回答',
  '详细说明',
  '结果导向',
];

const FOCUS_OPTIONS = [
  '项目进展',
  'ROI与成本',
  '异常与阻塞',
  '素材表现',
  '交付状态',
];

const RISK_OPTIONS = ['保守', '均衡', '直接'];
const DEPTH_OPTIONS = [
  { label: '简洁', value: 'brief' },
  { label: '均衡', value: 'balanced' },
  { label: '详细', value: 'detailed' },
];
const DECISION_OPTIONS = [
  { label: '先确认', value: 'confirm-first' },
  { label: '均衡', value: 'balanced' },
  { label: '直接推进', value: 'direct' },
];

function splitList(value: string): string[] {
  return value.split(/[\n,，、]/).map((item) => item.trim()).filter(Boolean);
}

function joinList(value: string[]): string {
  return value.join('\n');
}

function formatTime(value?: string): string {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toLocaleDateString('zh-CN')} ${date.toLocaleTimeString('zh-CN', { hour12: false })}`;
}

export function RoleProfileManagementTab() {
  const { message } = App.useApp();
  const [roles, setRoles] = useState<RoleProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [query, setQuery] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<RoleDraft>(EMPTY_ROLE);

  const loadRoles = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await fetch('/api/xiaoqiao/admin/role-profiles', { cache: 'no-store' });
      const payload = await response.json() as RoleProfilesResponse & { error?: string };
      if (!response.ok) throw new Error(payload.error || '读取角色列表失败');
      setRoles(Array.isArray(payload.roles) ? payload.roles : []);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '读取角色列表失败';
      message.error(errorMessage);
      setLoadError(errorMessage);
      setRoles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRoles();
  }, []);

  const filteredRoles = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return roles;
    return roles.filter((role) => (
      [role.name, role.id, role.description, role.rolePrompt, role.scopeTags.join(' ')]
        .some((value) => String(value).toLowerCase().includes(keyword))
    ));
  }, [query, roles]);

  const openCreateDrawer = () => {
    setDraft({
      ...EMPTY_ROLE,
      id: '',
      updatedAt: new Date().toISOString(),
    });
    setIsEditing(false);
    setDrawerOpen(true);
  };

  const openEditDrawer = (role: RoleProfile) => {
    setDraft({
      ...role,
      shortcutEntries: role.shortcutEntries.map((item) => ({ ...item })),
    });
    setIsEditing(true);
    setDrawerOpen(true);
  };

  const saveRole = async () => {
    if (!draft.name.trim()) {
      message.error('请填写角色名称');
      return;
    }
    setSaving(true);
    setSaveState('saving');
    try {
      const response = await fetch(
        isEditing ? `/api/xiaoqiao/admin/role-profiles/${draft.id}` : '/api/xiaoqiao/admin/role-profiles',
        {
          method: isEditing ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...draft,
            scopeTags: Array.isArray(draft.scopeTags) ? draft.scopeTags : splitList(String(draft.scopeTags || '')),
          }),
        },
      );
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error || '保存失败');
      message.success('已保存');
      setSaveState('saved');
      setDrawerOpen(false);
      await loadRoles();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存失败');
      setSaveState('error');
    } finally {
      setSaving(false);
      window.setTimeout(() => setSaveState('idle'), 1800);
    }
  };

  const columns: ColumnsType<RoleProfile> = [
    {
      title: '角色',
      dataIndex: 'name',
      render: (_, record) => (
        <div>
          <div className="font-medium text-[#10233f]">{record.name}</div>
          <div className="text-xs text-[#6b7c93]">{record.id}</div>
        </div>
      ),
    },
    {
      title: '默认视角',
      dataIndex: 'defaultPerspective',
      render: (value) => <Tag color="cyan">{value}</Tag>,
    },
    {
      title: '默认服务',
      dataIndex: 'defaultAgent',
      render: (value) => <Tag color="blue">{String(value)}</Tag>,
    },
    {
      title: '路由策略',
      dataIndex: 'routePolicy',
      render: (_, record) => (
        <Space size={4} wrap>
          <Tag>{record.routePolicy.ambiguous}</Tag>
          <Tag>{record.routePolicy.outOfScope}</Tag>
          <Tag>{record.routePolicy.clarificationRounds}轮追问</Tag>
        </Space>
      ),
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      render: (value) => formatTime(value),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Button type="link" onClick={() => openEditDrawer(record)}>
          编辑
        </Button>
      ),
    },
  ];

  return (
    <AdminCrudShell>
      <AdminCrudHeader
        title="角色提示词管理"
        description="定义角色如何影响回答方式、结果模板、快捷入口和路由策略。新增或修改后会以服务端保存结果为准刷新列表。"
        saveState={saveState}
        actions={(
          <>
            <Button icon={<RefreshCw size={14} />} onClick={() => void loadRoles()} disabled={loading}>
              刷新
            </Button>
            <Button type="primary" icon={<Plus size={14} />} onClick={openCreateDrawer}>
              新增角色
            </Button>
          </>
        )}
      />
      {loadError ? (
        <AdminCrudErrorState
          description={loadError}
          action={<Button size="small" onClick={() => void loadRoles()}>重新读取</Button>}
        />
      ) : null}
      <AdminCrudToolbar>
        <div className="min-w-0 flex-1">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            allowClear
            prefix={<Search size={14} className="text-[#94a3b8]" />}
            placeholder="搜索角色、范围、提示词"
            className="max-w-xl"
          />
        </div>
        <div className="text-xs text-[#8ea0b8]">共 {roles.length} 个角色</div>
      </AdminCrudToolbar>

      <div className="min-h-0 flex-1 overflow-auto px-5 py-4">
          {loading ? (
            <AdminCrudListSkeleton rows={6} />
          ) : filteredRoles.length > 0 ? (
            <Table
              rowKey="id"
              size="middle"
              loading={loading}
              columns={columns}
              dataSource={filteredRoles}
              pagination={false}
            />
          ) : (
            <AdminCrudEmptyState
              title={query.trim() ? '没有匹配的角色' : '暂无角色'}
              description={query.trim() ? '换一个关键词，或清空搜索条件后再查看。' : '新增角色后，可在这里维护对应的回答方式、结果模板和路由策略。'}
              action={query.trim() ? <Button onClick={() => setQuery('')}>清空搜索</Button> : <Button type="primary" onClick={openCreateDrawer}>新增角色</Button>}
            />
          )}
      </div>

      <Drawer
        title={draft.id ? '编辑角色' : '新增角色'}
        open={drawerOpen}
        styles={{ wrapper: { width: 820 } }}
        onClose={() => setDrawerOpen(false)}
        destroyOnClose
        footer={
          <Space className="flex justify-end">
            <Button onClick={() => setDrawerOpen(false)}>取消</Button>
            <Button type="primary" loading={saving} onClick={() => void saveRole()}>
              保存
            </Button>
          </Space>
        }
      >
        <div className="space-y-4">
          <section className="rounded-[16px] border border-[#e8eef7] bg-white px-4 py-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-[#10233f]">
              <Sparkles size={15} className="text-[#0f6fff]" />
              基础定义
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <div className="mb-1 text-xs text-[#6b7c93]">角色名称</div>
                <Input value={draft.name} onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))} />
              </label>
              <label className="block">
                <div className="mb-1 text-xs text-[#6b7c93]">角色 ID</div>
                <Input value={draft.id} onChange={(event) => setDraft((prev) => ({ ...prev, id: event.target.value }))} />
              </label>
              <label className="block md:col-span-2">
                <div className="mb-1 text-xs text-[#6b7c93]">角色说明</div>
                <Input.TextArea
                  value={draft.description}
                  onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))}
                  rows={2}
                />
              </label>
              <label className="block">
                <div className="mb-1 text-xs text-[#6b7c93]">默认视角</div>
                <Select
                  value={draft.defaultPerspective}
                  onChange={(value) => setDraft((prev) => ({ ...prev, defaultPerspective: value }))}
                  options={PERSPECTIVE_OPTIONS}
                  className="w-full"
                />
              </label>
              <label className="block">
                <div className="mb-1 text-xs text-[#6b7c93]">默认服务</div>
                <Select
                  value={draft.defaultAgent}
                  onChange={(value) => setDraft((prev) => ({ ...prev, defaultAgent: value }))}
                  options={AGENT_OPTIONS}
                  className="w-full"
                />
              </label>
              <label className="block md:col-span-2">
                <div className="mb-1 text-xs text-[#6b7c93]">可处理意图</div>
                <Select
                  mode="multiple"
                  value={draft.allowedIntentTypes}
                  onChange={(value) => setDraft((prev) => ({ ...prev, allowedIntentTypes: value }))}
                  options={INTENT_OPTIONS}
                  className="w-full"
                />
              </label>
              <label className="block md:col-span-2">
                <div className="mb-1 text-xs text-[#6b7c93]">适用范围</div>
                <Input.TextArea
                  value={joinList(draft.scopeTags)}
                  onChange={(event) => setDraft((prev) => ({ ...prev, scopeTags: splitList(event.target.value) }))}
                  rows={2}
                  placeholder="每行一个关键词，例如：项目、ROI、异常"
                />
              </label>
            </div>
          </section>

          <Divider className="!my-0" />

          <section className="rounded-[16px] border border-[#e8eef7] bg-[#f8fbff] px-4 py-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-[#10233f]">
              <Sparkles size={15} className="text-[#7c3aed]" />
              角色提示词与结果模板
            </div>
            <label className="block">
              <div className="mb-1 text-xs text-[#6b7c93]">角色提示词</div>
              <Input.TextArea
                value={draft.rolePrompt}
                onChange={(event) => setDraft((prev) => ({ ...prev, rolePrompt: event.target.value }))}
                rows={6}
                placeholder="说明这个角色应该如何回答、优先关注什么、遇到模糊问题怎么处理。"
              />
            </label>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="block">
                <div className="mb-1 text-xs text-[#6b7c93]">默认展示块</div>
                <Select
                  mode="multiple"
                  value={draft.resultTemplate.defaultBlocks}
                  onChange={(value) => setDraft((prev) => ({
                    ...prev,
                    resultTemplate: { ...prev.resultTemplate, defaultBlocks: value },
                  }))}
                  options={['结论', '证据', '风险', '下一步', '口径', '结果状态'].map((item) => ({ label: item, value: item }))}
                  className="w-full"
                />
              </label>
              <label className="block">
                <div className="mb-1 text-xs text-[#6b7c93]">展示顺序</div>
                <Select
                  mode="multiple"
                  value={draft.resultTemplate.blockOrder}
                  onChange={(value) => setDraft((prev) => ({
                    ...prev,
                    resultTemplate: { ...prev.resultTemplate, blockOrder: value },
                  }))}
                  options={['结论', '证据', '风险', '下一步', '口径', '结果状态'].map((item) => ({ label: item, value: item }))}
                  className="w-full"
                />
              </label>
              <label className="block">
                <div className="mb-1 text-xs text-[#6b7c93]">路由歧义处理</div>
                <Select
                  value={draft.routePolicy.ambiguous}
                  onChange={(value) => setDraft((prev) => ({
                    ...prev,
                    routePolicy: { ...prev.routePolicy, ambiguous: value },
                  }))}
                  options={ROUTE_ACTION_OPTIONS}
                  className="w-full"
                />
              </label>
              <label className="block">
                <div className="mb-1 text-xs text-[#6b7c93]">越界处理</div>
                <Select
                  value={draft.routePolicy.outOfScope}
                  onChange={(value) => setDraft((prev) => ({
                    ...prev,
                    routePolicy: { ...prev.routePolicy, outOfScope: value },
                  }))}
                  options={ROUTE_ACTION_OPTIONS}
                  className="w-full"
                />
              </label>
              <label className="block">
                <div className="mb-1 text-xs text-[#6b7c93]">追问轮数</div>
                <Select
                  value={draft.routePolicy.clarificationRounds}
                  onChange={(value) => setDraft((prev) => ({
                    ...prev,
                    routePolicy: { ...prev.routePolicy, clarificationRounds: Number(value) },
                  }))}
                  options={[
                    { label: '1 轮', value: 1 },
                    { label: '2 轮', value: 2 },
                    { label: '3 轮', value: 3 },
                  ]}
                  className="w-full"
                />
              </label>
            </div>
          </section>

          <Divider className="!my-0" />

          <section className="rounded-[16px] border border-[#e8eef7] bg-white px-4 py-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-[#10233f]">
              <Sparkles size={15} className="text-[#0f6fff]" />
              回答风格
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <div className="mb-1 text-xs text-[#6b7c93]">输出风格</div>
                <Select
                  mode="multiple"
                  value={draft.responseStyle.outputStyle}
                  onChange={(value) => setDraft((prev) => ({
                    ...prev,
                    responseStyle: { ...prev.responseStyle, outputStyle: value },
                  }))}
                  options={STYLE_OPTIONS.map((item) => ({ label: item, value: item }))}
                  className="w-full"
                />
              </label>
              <label className="block">
                <div className="mb-1 text-xs text-[#6b7c93]">分析重点</div>
                <Select
                  mode="multiple"
                  value={draft.responseStyle.analysisFocus}
                  onChange={(value) => setDraft((prev) => ({
                    ...prev,
                    responseStyle: { ...prev.responseStyle, analysisFocus: value },
                  }))}
                  options={FOCUS_OPTIONS.map((item) => ({ label: item, value: item }))}
                  className="w-full"
                />
              </label>
              <label className="block">
                <div className="mb-1 text-xs text-[#6b7c93]">风险偏好</div>
                <Select
                  mode="multiple"
                  value={draft.responseStyle.riskBias}
                  onChange={(value) => setDraft((prev) => ({
                    ...prev,
                    responseStyle: { ...prev.responseStyle, riskBias: value },
                  }))}
                  options={RISK_OPTIONS.map((item) => ({ label: item, value: item }))}
                  className="w-full"
                />
              </label>
              <label className="block">
                <div className="mb-1 text-xs text-[#6b7c93]">解释深度</div>
                <Select
                  value={draft.responseStyle.explanationDepth}
                  onChange={(value) => setDraft((prev) => ({
                    ...prev,
                    responseStyle: { ...prev.responseStyle, explanationDepth: value },
                  }))}
                  options={DEPTH_OPTIONS}
                  className="w-full"
                />
              </label>
              <label className="block md:col-span-2">
                <div className="mb-1 text-xs text-[#6b7c93]">决策风格</div>
                <Select
                  value={draft.responseStyle.decisionStyle}
                  onChange={(value) => setDraft((prev) => ({
                    ...prev,
                    responseStyle: { ...prev.responseStyle, decisionStyle: value },
                  }))}
                  options={DECISION_OPTIONS}
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

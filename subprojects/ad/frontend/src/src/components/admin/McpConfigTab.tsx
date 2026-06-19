'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Activity, Loader2, RotateCcw, Layers3, Wifi, Trash2, Search } from 'lucide-react';
import type { McpServerConfig, McpSkillCategory } from '@/types';
import { xiaoqiaoApi, type ReportCapabilityManifestResponse } from '@/lib/api';
import { broadcastAdminCatalogChange } from '@/lib/admin-catalog-events';
import { parseJson, statusLabels, statusStyles, readClientStorage, writeClientStorage, ADMIN_MCP_STORAGE_KEY, type AdminTab } from './admin-tab-helpers';
import { ClientTime } from './admin-menu';
import {
  AdminCrudEmptyState,
  AdminCrudErrorState,
  AdminCrudHeader,
  AdminCrudListSkeleton,
  AdminCrudShell,
} from './AdminCrudScaffold';

function serviceDisplayText(value: string): string {
  return value
    .replace(/\bMCP\b/g, '外部服务')
    .replace(/\bProvider\b/g, '服务来源')
    .replace(/\bAPI\b/g, '服务')
    .replace(/接口/g, '服务')
    .replace(/\bREST\b/g, '标准')
    .replace(/\bAgent\b/g, '助手');
}

function McpConfigTab() {
  const [mcpServers, setMcpServers] = useState<McpServerConfig[]>([]);
  const [mcpLoading, setMcpLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [selectedMcpRaw, setSelectedMcpRaw] = useState<string | null>(() => readClientStorage(ADMIN_MCP_STORAGE_KEY));
  const [editMode, setEditMode] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [toolKeyword, setToolKeyword] = useState('');
  const [testStatus, setTestStatus] = useState<Record<string, 'idle' | 'testing' | 'success' | 'fail'>>({});
  const [testMessage, setTestMessage] = useState<Record<string, string>>({});
  const [deletingMcpId, setDeletingMcpId] = useState<string | null>(null);
  const [reportManifest, setReportManifest] = useState<ReportCapabilityManifestResponse | null>(null);
  const [reportManifestLoading, setReportManifestLoading] = useState(false);
  const [reportManifestMsg, setReportManifestMsg] = useState('');
  const [addForm, setAddForm] = useState({
    name: '',
    category: 'data' as string,
    endpoint_url: '',
    transport: 'streamable-http' as McpServerConfig['transport'],
    auth_type: 'none' as string,
    auth_token: '',
    auth_api_key: '',
    auth_access_token: '',
    auth_tool_range: '',
    auth_oauth_client_id: '',
    auth_oauth_client_secret: '',
    description: '',
  });
  const [editForm, setEditForm] = useState({
    endpoint_url: '',
    transport: 'streamable-http' as McpServerConfig['transport'],
    auth_type: 'none' as string,
    auth_token: '',
    auth_api_key: '',
    auth_access_token: '',
    auth_tool_range: '',
    auth_oauth_client_id: '',
    auth_oauth_client_secret: '',
  });
  const [saveMsg, setSaveMsg] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const tokenPrefixMap: Record<string, { prefix: string; placeholder: string }> = {
    bearer_token: { prefix: 'Bearer ', placeholder: '输入访问令牌（系统自动加 Bearer 前缀）' },
    api_key: { prefix: '', placeholder: '输入访问密钥' },
    oauth2: { prefix: '', placeholder: '输入客户端编号' },
    access_token: { prefix: '', placeholder: '输入访问令牌' },
  };

  const refreshReportManifest = async () => {
    setReportManifestLoading(true);
    setReportManifestMsg('');
    try {
      const manifest = await xiaoqiaoApi.getReportCapabilityManifest();
      setReportManifest(manifest);
    } catch (err: unknown) {
      setReportManifestMsg(err instanceof Error ? err.message : '读取问数能力清单失败');
    } finally {
      setReportManifestLoading(false);
    }
  };

  const refreshMcpServers = async () => {
    setMcpLoading(true);
    try {
      setLoadError(null);
      const data = await xiaoqiaoApi.getMcpServers();
      setMcpServers(data);
    } catch {
      setLoadError('外部服务配置读取失败，请稍后重试。');
      setMcpServers([]);
    } finally {
      setMcpLoading(false);
    }
  };

  const refreshCapabilityCatalog = async () => {
    await Promise.all([
      refreshMcpServers(),
      refreshReportManifest(),
    ]);
  };

  useEffect(() => {
    void refreshCapabilityCatalog();

    const handleVisible = () => {
      if (document.visibilityState === 'visible') {
        void refreshCapabilityCatalog();
      }
    };

    const handleFocus = () => {
      void refreshCapabilityCatalog();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisible);
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisible);
    };
  }, []);

  const stripPrefix = (authType: string, value: string): string => {
    if (authType === 'bearer_token') {
      return value
        .replace(/^Authorization\s*[:=]\s*Bearer\s+/i, '')
        .replace(/^Bearer\s+/i, '')
        .trim();
    }
    return value;
  };

  const buildFullToken = (authType: string, rawKey: string): string => {
    const cfg = tokenPrefixMap[authType];
    if (!cfg || !rawKey) return rawKey;
    const normalized = stripPrefix(authType, rawKey);
    if (cfg.prefix && normalized && !normalized.startsWith(cfg.prefix)) {
      return cfg.prefix + normalized;
    }
    return normalized;
  };

  const filtered = filterCategory === 'all' ? mcpServers : mcpServers.filter(server => server.category === filterCategory);
  const selectedMcp = selectedMcpRaw && mcpServers.some(server => server.id === selectedMcpRaw)
    ? selectedMcpRaw
    : null;
  const selected = filtered.find(server => server.id === selectedMcp) || mcpServers.find(server => server.id === selectedMcp) || null;
  const visibleTools = selected
    ? selected.tools.filter(tool => {
      const keyword = toolKeyword.trim().toLowerCase();
      if (!keyword) return true;
      return `${tool.name} ${tool.description}`.toLowerCase().includes(keyword);
    })
    : [];
  const allToolEntries = useMemo(() => mcpServers.flatMap(server => (server.tools || []).map(tool => ({
    serverId: server.id,
    serverName: server.name,
    serverStatus: server.status,
    serverCategory: server.category,
    toolId: tool.tool_id,
    toolName: tool.name,
    toolDescription: tool.description || '',
    toolEnabled: tool.enabled,
  }))), [mcpServers]);
  const enabledServerCount = mcpServers.filter(server => server.enabled).length;
  const connectedServerCount = mcpServers.filter(server => server.status === 'connected').length;
  const activeToolCount = allToolEntries.filter(item => item.toolEnabled).length;

  const categoryLabels: Record<string, string> = {
    all: '全部',
    data: '数据服务',
    function: '功能服务',
  };

  const statusColors: Record<string, string> = {
    connected: 'text-[#157f54]',
    disconnected: 'text-[#c2415c]',
    error: 'text-[#b7791f]',
    pending: 'text-[#64748b]',
  };
  const statusLabels: Record<string, string> = {
    connected: '已连接',
    disconnected: '未连接',
    error: '异常',
    pending: '待配置',
  };
  const authTypeLabels: Record<string, string> = {
    none: '无鉴权',
    bearer_token: 'Bearer 访问令牌',
    api_key: '访问密钥',
    access_token: '访问令牌',
    oauth2: 'OAuth 2.0（需先授权）',
  };
  const transportLabels: Record<McpServerConfig['transport'], string> = {
    'streamable-http': 'Streamable HTTP',
    sse: 'SSE',
    stdio: 'stdio',
  };
  const reportDomainLabels: Record<string, string> = {
    daily: '日报',
    weekly: '周报',
    monthly: '月报',
    hourly: '小时报',
    roi: 'ROI',
    retention: '留存',
    material: '素材',
    dictionary: '字典',
    project: '项目',
  };

  const buildAuthConfig = (authType: string, form: typeof editForm | typeof addForm): Record<string, string> => {
    const config: Record<string, string> = {};
    if (authType === 'bearer_token' && 'auth_token' in form && form.auth_token) {
      config.token = buildFullToken(authType, form.auth_token);
    }
    if (authType === 'api_key' && 'auth_api_key' in form && form.auth_api_key) {
      config.api_key = form.auth_api_key;
    }
    if (authType === 'access_token' && 'auth_access_token' in form && form.auth_access_token) {
      config.access_token = form.auth_access_token;
    }
    if ('auth_tool_range' in form && form.auth_tool_range) {
      config.tool_range = form.auth_tool_range;
    }
    if (authType === 'oauth2') {
      if ('auth_oauth_client_id' in form && form.auth_oauth_client_id) {
        config.client_id = form.auth_oauth_client_id;
      }
      if ('auth_oauth_client_secret' in form && form.auth_oauth_client_secret) {
        config.client_secret = form.auth_oauth_client_secret;
      }
    }
    return config;
  };

  const maskValue = (value?: string) => {
    if (!value) return '未配置';
    if (value.length <= 8) return '已配置';
    return `${value.slice(0, 4)}****${value.slice(-4)}`;
  };

  const handleSelectMcp = (id: string) => {
    setSelectedMcpRaw(id);
    writeClientStorage(ADMIN_MCP_STORAGE_KEY, id);
    setEditMode(false);
    setShowAddForm(false);
    setSaveMsg('');
    setToolKeyword('');
    const mcp = mcpServers.find(server => server.id === id);
    if (!mcp) return;
    setEditForm({
      endpoint_url: mcp.endpoint_url,
      transport: mcp.transport || 'streamable-http',
      auth_type: mcp.auth_type,
      auth_token: stripPrefix(mcp.auth_type, mcp.auth_config?.token || mcp.auth_config?.bearer_token || ''),
      auth_api_key: mcp.auth_config?.api_key || '',
      auth_access_token: mcp.auth_config?.access_token || '',
      auth_tool_range: mcp.auth_config?.tool_range || '',
      auth_oauth_client_id: mcp.auth_config?.client_id || '',
      auth_oauth_client_secret: mcp.auth_config?.client_secret || '',
    });
  };

  useEffect(() => {
    if (showAddForm || editMode) {
      return;
    }
    if (filtered.length === 0) {
      if (selectedMcp) {
        setSelectedMcpRaw(null);
        writeClientStorage(ADMIN_MCP_STORAGE_KEY, null);
      }
      return;
    }
    if (!selectedMcp || !filtered.some(server => server.id === selectedMcp)) {
      handleSelectMcp(filtered[0].id);
    }
  }, [filtered, selectedMcp, showAddForm, editMode]);

  const testConnection = async (serverId: string) => {
    setTestStatus(prev => ({ ...prev, [serverId]: 'testing' }));
    setTestMessage(prev => ({ ...prev, [serverId]: '' }));
    try {
      const res = await fetch(`/api/xiaoqiao/admin/mcp-servers/${serverId}/test`, { method: 'POST' });
      const data = await res.json().catch(() => null);
      const success = Boolean(res.ok && data?.ok);
      setTestStatus(prev => ({ ...prev, [serverId]: success ? 'success' : 'fail' }));
      setTestMessage(prev => ({
        ...prev,
        [serverId]: data?.msg
          ? `${data.msg}${typeof data?.tool_count === 'number' ? ` · 已发现 ${data.tool_count} 个工具` : ''}`
          : data?.message || (success ? '连接成功' : `HTTP ${res.status} ${res.statusText}`),
      }));
      setMcpServers(prev => prev.map(item => item.id === serverId ? {
        ...item,
        status: success ? 'connected' : 'error',
        latency_ms: typeof data?.latency_ms === 'number' ? data.latency_ms : item.latency_ms,
        last_ping_at: Date.now(),
        last_health_check_at: Date.now(),
        error_message: success ? undefined : (data?.msg || item.error_message),
        tools: Array.isArray(data?.tools) ? data.tools : item.tools,
      } : item));
      if (success) {
        void refreshReportManifest();
        broadcastAdminCatalogChange('mcp-test-success');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setTestStatus(prev => ({ ...prev, [serverId]: 'fail' }));
      setTestMessage(prev => ({ ...prev, [serverId]: msg.includes('abort') ? '连接超时 (8s)' : `连接失败: ${msg}` }));
      setMcpServers(prev => prev.map(item => item.id === serverId ? {
        ...item,
        status: 'error',
        last_ping_at: Date.now(),
      } : item));
    }
  };

  const handleRegister = () => {
    if (!addForm.name || !addForm.endpoint_url) {
      setSaveState('error');
      setSaveMsg('请填写服务名称和服务地址');
      setTimeout(() => setSaveState('idle'), 1800);
      return;
    }
    if (addForm.auth_type === 'bearer_token' && !addForm.auth_token) {
      setSaveState('error');
      setSaveMsg('请填写访问令牌');
      setTimeout(() => setSaveState('idle'), 1800);
      return;
    }
    if (addForm.auth_type === 'api_key' && !addForm.auth_api_key) {
      setSaveState('error');
      setSaveMsg('请填写访问密钥');
      setTimeout(() => setSaveState('idle'), 1800);
      return;
    }
    if (addForm.auth_type === 'access_token' && !addForm.auth_access_token) {
      setSaveState('error');
      setSaveMsg('请填写访问令牌');
      setTimeout(() => setSaveState('idle'), 1800);
      return;
    }
    if (addForm.auth_type === 'oauth2' && (!addForm.auth_oauth_client_id || !addForm.auth_oauth_client_secret)) {
      setSaveState('error');
      setSaveMsg('请填写 OAuth 客户端编号和密钥');
      setTimeout(() => setSaveState('idle'), 1800);
      return;
    }

    const newMcp: McpServerConfig = {
      id: `mcp_${Date.now()}`,
      name: addForm.name,
      description: addForm.description || addForm.name,
      category: addForm.category as McpServerConfig['category'],
      endpoint_url: addForm.endpoint_url,
      transport: addForm.transport,
      auth_type: addForm.auth_type as McpServerConfig['auth_type'],
      auth_config: buildAuthConfig(addForm.auth_type, addForm),
      status: 'disconnected',
      tools: [],
      enabled: true,
      business_domains: [],
      bound_agents: [],
      tags: [],
      created_at: Date.now(),
      updated_at: Date.now(),
    };

    void (async () => {
      try {
        setSaveState('saving');
        const created = await xiaoqiaoApi.createMcpServer(newMcp);
        setMcpServers(prev => [...prev, created]);
        void refreshReportManifest();
        setSelectedMcpRaw(created.id);
        writeClientStorage(ADMIN_MCP_STORAGE_KEY, created.id);
        setSaveState('saved');
        setSaveMsg('注册成功');
        broadcastAdminCatalogChange('mcp-register');
        setTimeout(() => {
          setShowAddForm(false);
          setSaveMsg('');
          setAddForm({
            name: '',
            category: 'data',
            endpoint_url: '',
            transport: 'streamable-http',
            auth_type: 'none',
            auth_token: '',
            auth_api_key: '',
            auth_access_token: '',
            auth_tool_range: '',
            auth_oauth_client_id: '',
            auth_oauth_client_secret: '',
            description: '',
          });
        }, 800);
      } catch {
        setSaveState('error');
        setSaveMsg('注册失败');
      } finally {
        setTimeout(() => setSaveState('idle'), 1800);
      }
    })();
  };

  const handleSave = () => {
    if (!editForm.endpoint_url) {
      setSaveState('error');
      setSaveMsg('服务地址不能为空');
      setTimeout(() => setSaveState('idle'), 1800);
      return;
    }
    if (editForm.auth_type === 'bearer_token' && !editForm.auth_token) {
      setSaveState('error');
      setSaveMsg('请填写访问令牌');
      setTimeout(() => setSaveState('idle'), 1800);
      return;
    }
    if (editForm.auth_type === 'api_key' && !editForm.auth_api_key) {
      setSaveState('error');
      setSaveMsg('请填写访问密钥');
      setTimeout(() => setSaveState('idle'), 1800);
      return;
    }
    if (editForm.auth_type === 'access_token' && !editForm.auth_access_token) {
      setSaveState('error');
      setSaveMsg('请填写访问令牌');
      setTimeout(() => setSaveState('idle'), 1800);
      return;
    }
    if (editForm.auth_type === 'oauth2' && (!editForm.auth_oauth_client_id || !editForm.auth_oauth_client_secret)) {
      setSaveState('error');
      setSaveMsg('请填写 OAuth 客户端编号和密钥');
      setTimeout(() => setSaveState('idle'), 1800);
      return;
    }
    if (!selectedMcp) return;

    void (async () => {
      try {
        setSaveState('saving');
        const updated = await xiaoqiaoApi.updateMcpServer(selectedMcp, {
          endpoint_url: editForm.endpoint_url,
          transport: editForm.transport,
          auth_type: editForm.auth_type as McpServerConfig['auth_type'],
          auth_config: buildAuthConfig(editForm.auth_type, editForm),
          updated_at: Date.now(),
        });
        setMcpServers(prev => prev.map(server => server.id === selectedMcp ? updated : server));
        void refreshReportManifest();
        setSaveState('saved');
        setSaveMsg('保存成功');
        broadcastAdminCatalogChange('mcp-update');
        setEditMode(false);
        setTimeout(() => setSaveMsg(''), 1500);
      } catch {
        setSaveState('error');
        setSaveMsg('保存失败');
      } finally {
        setTimeout(() => setSaveState('idle'), 1800);
      }
    })();
  };

  const handleDeleteMcp = (server: McpServerConfig) => {
    const isBuiltin = !server.id.startsWith('mcp_');
    const message = isBuiltin
      ? `确定停用“${serviceDisplayText(server.name)}”吗？停用后会清空连接地址并断开该服务。`
      : `确定删除“${serviceDisplayText(server.name)}”吗？删除后该服务配置不会再出现在服务列表中。`;

    if (!window.confirm(message)) {
      return;
    }

    setDeletingMcpId(server.id);
    setSaveMsg('');
    setSaveState('saving');
    void (async () => {
      try {
        await xiaoqiaoApi.deleteMcpServer(server.id);
        const nextList = await xiaoqiaoApi.getMcpServers();
        setMcpServers(nextList);
        void refreshReportManifest();
        const nextSelected = nextList.find(item => item.id !== server.id && item.enabled)?.id
          || nextList.find(item => item.id !== server.id)?.id
          || null;
        setSelectedMcpRaw(nextSelected);
        writeClientStorage(ADMIN_MCP_STORAGE_KEY, nextSelected);
        setEditMode(false);
        setToolKeyword('');
        setSaveState('saved');
        setSaveMsg(isBuiltin ? '已停用' : '已删除');
        broadcastAdminCatalogChange(isBuiltin ? 'mcp-disable' : 'mcp-delete');
        setTimeout(() => setSaveMsg(''), 1500);
      } catch {
        setSaveState('error');
        setSaveMsg(isBuiltin ? '停用失败' : '删除失败');
      } finally {
        setDeletingMcpId(null);
        setTimeout(() => setSaveState('idle'), 1800);
      }
    })();
  };

  const renderAuthFields = (
    authType: string,
    formData: typeof addForm | typeof editForm,
    setFormData: React.Dispatch<React.SetStateAction<typeof addForm>> | React.Dispatch<React.SetStateAction<typeof editForm>>,
  ) => {
    const updateField = (key: string, value: string) => {
      const nextValue = key === 'auth_token' ? stripPrefix(authType, value) : value;
      (setFormData as React.Dispatch<React.SetStateAction<Record<string, string>>>)(prev => ({ ...prev, [key]: nextValue }));
    };

    return (
      <div className="mt-2 space-y-3">
        {authType === 'none' && (
          <div className="py-2 text-[11px] text-[#6b7c93]">无需鉴权凭证</div>
        )}
        {authType === 'bearer_token' && (
          <div>
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-[#6b7c93]">访问令牌</label>
              <span className="rounded-full bg-[#eef5ff] px-2 py-0.5 text-[10px] font-mono text-[#0f6fff]">系统自动加 Bearer 前缀</span>
            </div>
            <div className="relative mt-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-mono text-[#8ea0b8]">Bearer</span>
              <input
                type="password"
                className="w-full rounded-xl border border-[#dbe4f0] bg-white py-2 pl-16 pr-3 text-sm font-mono text-[#10233f] outline-none transition-colors focus:border-[#0f6fff] focus:ring-4 focus:ring-[rgba(15,111,255,0.12)]"
                placeholder={tokenPrefixMap.bearer_token.placeholder}
                value={'auth_token' in formData ? formData.auth_token : ''}
                onChange={e => updateField('auth_token', e.target.value)}
              />
            </div>
          </div>
        )}
        {authType === 'api_key' && (
          <div>
            <label className="text-[11px] text-[#6b7c93]">访问密钥</label>
            <input
              type="password"
              className="mt-1 w-full rounded-xl border border-[#dbe4f0] bg-white px-3 py-2 text-sm font-mono text-[#10233f] outline-none transition-colors focus:border-[#0f6fff] focus:ring-4 focus:ring-[rgba(15,111,255,0.12)]"
              placeholder={tokenPrefixMap.api_key.placeholder}
              value={'auth_api_key' in formData ? formData.auth_api_key : ''}
              onChange={e => updateField('auth_api_key', e.target.value)}
            />
          </div>
        )}
        {authType === 'access_token' && (
          <div>
            <label className="text-[11px] text-[#6b7c93]">访问令牌</label>
            <input
              type="password"
              className="mt-1 w-full rounded-xl border border-[#dbe4f0] bg-white px-3 py-2 text-sm font-mono text-[#10233f] outline-none transition-colors focus:border-[#0f6fff] focus:ring-4 focus:ring-[rgba(15,111,255,0.12)]"
              placeholder={tokenPrefixMap.access_token.placeholder}
              value={'auth_access_token' in formData ? formData.auth_access_token : ''}
              onChange={e => updateField('auth_access_token', e.target.value)}
            />
          </div>
        )}
        {(authType === 'none' || authType === 'access_token') && (
          <div>
            <label className="text-[11px] text-[#6b7c93]">工具范围</label>
            <input
              className="mt-1 w-full rounded-xl border border-[#dbe4f0] bg-white px-3 py-2 text-sm font-mono text-[#10233f] outline-none transition-colors focus:border-[#0f6fff] focus:ring-4 focus:ring-[rgba(15,111,255,0.12)]"
              placeholder='["tools_app_management_android_app_list_v2","advertiser_public_info_v2"]'
              value={'auth_tool_range' in formData ? formData.auth_tool_range : ''}
              onChange={e => updateField('auth_tool_range', e.target.value)}
            />
            <div className="mt-1 text-[11px] leading-5 text-[#8ea0b8]">服务可用该请求头限制工具范围；不填则使用默认工具列表。</div>
          </div>
        )}
        {authType === 'oauth2' && (
          <>
            <div className="rounded-2xl border border-[#f8d7a8] bg-[#fffaf0] px-3 py-2 text-[11px] leading-5 text-[#9a5b12]">
              OAuth 凭证不能直接代表服务已可用。请先在对应服务完成账号授权，再填写服务可用地址或访问令牌。
            </div>
            <div>
              <label className="text-[11px] text-[#6b7c93]">客户端编号</label>
              <input
                className="mt-1 w-full rounded-xl border border-[#dbe4f0] bg-white px-3 py-2 text-sm font-mono text-[#10233f] outline-none transition-colors focus:border-[#0f6fff] focus:ring-4 focus:ring-[rgba(15,111,255,0.12)]"
                placeholder={tokenPrefixMap.oauth2.placeholder}
                value={'auth_oauth_client_id' in formData ? formData.auth_oauth_client_id : ''}
                onChange={e => updateField('auth_oauth_client_id', e.target.value)}
              />
            </div>
            <div>
              <label className="text-[11px] text-[#6b7c93]">开发者密钥</label>
              <input
                type="password"
                className="mt-1 w-full rounded-xl border border-[#dbe4f0] bg-white px-3 py-2 text-sm font-mono text-[#10233f] outline-none transition-colors focus:border-[#0f6fff] focus:ring-4 focus:ring-[rgba(15,111,255,0.12)]"
                placeholder="输入开发者密钥"
                value={'auth_oauth_client_secret' in formData ? formData.auth_oauth_client_secret : ''}
                onChange={e => updateField('auth_oauth_client_secret', e.target.value)}
              />
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <AdminCrudShell>
      <AdminCrudHeader
        title="外部服务配置"
        description={`统一管理报表、归因、监控等外部能力服务。当前 ${mcpServers.length} 个服务，${connectedServerCount} 个已连通，${activeToolCount} 个工具启用中。`}
        saveState={saveState}
        actions={(
          <>
            <button
              onClick={() => { setShowAddForm(true); setEditMode(false); setSaveMsg(''); }}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0f6fff] px-4 py-2 text-sm font-medium text-white shadow-[0_10px_30px_rgba(15,111,255,0.18)] transition-colors hover:bg-[#0b5ad1]"
            >
              <Plus size={14} /> 添加服务
            </button>
          </>
        )}
      />

      {loadError ? (
        <AdminCrudErrorState
          description={loadError}
          action={(
            <button
              type="button"
              onClick={() => void refreshCapabilityCatalog()}
              className="rounded-lg bg-[#0f6fff] px-3 py-1.5 text-xs font-medium text-white"
            >
              重新加载
            </button>
          )}
        />
      ) : null}

      <main className="min-h-0 flex-1 overflow-y-auto bg-[#f3f6fb] px-4 py-5 md:px-6">
        <div className="mx-auto max-w-7xl space-y-6">
          {saveMsg && (
            <div className={`mt-4 rounded-2xl px-4 py-3 text-sm ${
              saveMsg.includes('成功')
                ? 'border border-[#b8ebd0] bg-[#f2fff7] text-[#157f54]'
                : 'border border-[#fecdd3] bg-[#fff1f2] text-[#c2415c]'
            }`}>
              {saveMsg}
            </div>
          )}

        <div className="rounded-[24px] border border-[#dbe4f0] bg-white p-4 shadow-[0_12px_36px_rgba(15,35,63,0.06)]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-[#10233f]">
                <Activity size={15} className="text-[#0f6fff]" />
                问数能力发现
              </div>
              <div className="mt-1 text-[12px] leading-5 text-[#6b7c93]">
                由当前已注册工具实时派生，用于核对问数可用能力、字典依赖和工具覆盖风险。
              </div>
            </div>
            <button
              type="button"
              onClick={() => void refreshCapabilityCatalog()}
              disabled={reportManifestLoading || mcpLoading}
              className="inline-flex items-center gap-2 rounded-xl border border-[#dbe4f0] bg-white px-3 py-2 text-xs font-medium text-[#355070] transition-colors hover:border-[#0f6fff] hover:text-[#0f6fff] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {reportManifestLoading ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
              刷新全部
            </button>
          </div>
          {reportManifest ? (
            <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-[#e5edf7] bg-[#f8fbff] px-4 py-3">
                  <div className="text-[11px] text-[#8ea0b8]">报表工具</div>
                  <div className="mt-1 text-lg font-semibold text-[#10233f]">{reportManifest.summary.report_tool_count}</div>
                </div>
                <div className="rounded-2xl border border-[#e5edf7] bg-[#f8fbff] px-4 py-3">
                  <div className="text-[11px] text-[#8ea0b8]">字典工具</div>
                  <div className="mt-1 text-lg font-semibold text-[#10233f]">{reportManifest.summary.dictionary_tool_count}</div>
                </div>
                <div className={`rounded-2xl border px-4 py-3 ${
                  reportManifest.summary.warning_count > 0
                    ? 'border-[#f8d7a8] bg-[#fffaf0]'
                    : 'border-[#e5edf7] bg-[#f8fbff]'
                }`}>
                  <div className="text-[11px] text-[#8ea0b8]">发现告警</div>
                  <div className={`mt-1 text-lg font-semibold ${
                    reportManifest.summary.warning_count > 0 ? 'text-[#b7791f]' : 'text-[#10233f]'
                  }`}>
                    {reportManifest.summary.warning_count}
                  </div>
                </div>
                <div className="sm:col-span-3 rounded-2xl border border-[#e5edf7] bg-white px-4 py-3">
                  <div className="text-[11px] text-[#8ea0b8]">覆盖域</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {Object.entries(reportManifest.summary.domains).length > 0 ? Object.entries(reportManifest.summary.domains).map(([domain, count]) => (
                      <span key={domain} className="rounded-full bg-[#eef5ff] px-2 py-1 text-[11px] text-[#0f6fff]">
                        {reportDomainLabels[domain] || domain} · {count}
                      </span>
                    )) : <span className="text-[12px] text-[#8ea0b8]">未发现可用于问数路由的报表工具</span>}
                  </div>
                </div>
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                <div className="rounded-2xl border border-[#e5edf7] bg-[#fbfdff] px-4 py-3">
                  <div className="text-[11px] font-medium text-[#6b7c93]">候选报表工具</div>
                  <div className="mt-2 max-h-36 space-y-2 overflow-y-auto pr-1">
                    {reportManifest.tools.slice(0, 6).map(tool => (
                      <div key={tool.capability_id} className="min-w-0">
                        <div className="truncate font-mono text-[12px] text-[#10233f]">{serviceDisplayText(tool.tool_name)}</div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {tool.report_domains.map(domain => (
                            <span key={domain} className="rounded-full bg-white px-2 py-0.5 text-[10px] text-[#6b7c93]">
                              {reportDomainLabels[domain] || domain}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                {reportManifest.tools.length === 0 && <div className="text-[12px] text-[#8ea0b8]">暂无候选工具，请先测试服务连通并发现工具。</div>}
                  </div>
                </div>
                <div className="rounded-2xl border border-[#e5edf7] bg-[#fbfdff] px-4 py-3">
                  <div className="text-[11px] font-medium text-[#6b7c93]">路由风险</div>
                  <div className="mt-2 max-h-36 space-y-2 overflow-y-auto pr-1">
                    {reportManifest.warnings.slice(0, 6).map(warning => (
                      <div key={`${warning.code}:${warning.server_id || ''}:${warning.tool_name || ''}`} className="rounded-xl bg-white px-3 py-2 text-[12px] leading-5 text-[#9a5b12]">
                        {serviceDisplayText(warning.message)}
                      </div>
                    ))}
                    {reportManifest.warnings.length === 0 && <div className="text-[12px] text-[#157f54]">当前未发现能力清单风险。</div>}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-[#dbe4f0] bg-[#fbfdff] px-4 py-5 text-sm text-[#8ea0b8]">
              {reportManifestLoading ? '正在生成问数能力清单...' : reportManifestMsg || '暂无问数能力清单。'}
            </div>
          )}
          {reportManifestMsg && (
            <div className="mt-3 rounded-2xl border border-[#fecdd3] bg-[#fff1f2] px-4 py-3 text-[12px] text-[#c2415c]">
              {reportManifestMsg}
            </div>
          )}
        </div>

        <div className="rounded-[24px] border border-[#dbe4f0] bg-white p-4 shadow-[0_12px_36px_rgba(15,35,63,0.06)]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-[#10233f]">
                <Layers3 size={15} className="text-[#0f6fff]" />
                全量工具清单
              </div>
              <div className="mt-1 text-[12px] leading-5 text-[#6b7c93]">
                展示当前已注册外部服务的全部工具，便于确认真实绑定数量、服务状态和工具覆盖范围。
              </div>
            </div>
            <button
              type="button"
              onClick={() => void refreshMcpServers()}
              disabled={mcpLoading}
              className="inline-flex items-center gap-2 rounded-xl border border-[#dbe4f0] bg-white px-3 py-2 text-xs font-medium text-[#355070] transition-colors hover:border-[#0f6fff] hover:text-[#0f6fff] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {mcpLoading ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
              刷新工具
            </button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-[#e5edf7] bg-[#f8fbff] px-4 py-3">
              <div className="text-[11px] text-[#8ea0b8]">外部服务</div>
              <div className="mt-1 text-lg font-semibold text-[#10233f]">{mcpServers.length}</div>
              <div className="mt-1 text-[11px] text-[#6b7c93]">已注册服务总数</div>
            </div>
            <div className="rounded-2xl border border-[#e5edf7] bg-[#f8fbff] px-4 py-3">
              <div className="text-[11px] text-[#8ea0b8]">已启用服务</div>
              <div className="mt-1 text-lg font-semibold text-[#10233f]">{enabledServerCount}</div>
              <div className="mt-1 text-[11px] text-[#6b7c93]">开启后可参与发现</div>
            </div>
            <div className="rounded-2xl border border-[#e5edf7] bg-[#f8fbff] px-4 py-3">
              <div className="text-[11px] text-[#8ea0b8]">连通服务</div>
              <div className="mt-1 text-lg font-semibold text-[#10233f]">{connectedServerCount}</div>
              <div className="mt-1 text-[11px] text-[#6b7c93]">当前已完成连通测试</div>
            </div>
            <div className="rounded-2xl border border-[#e5edf7] bg-[#f8fbff] px-4 py-3">
              <div className="text-[11px] text-[#8ea0b8]">全部工具</div>
              <div className="mt-1 text-lg font-semibold text-[#10233f]">{allToolEntries.length}</div>
              <div className="mt-1 text-[11px] text-[#6b7c93]">当前已绑定工具数</div>
              <div className="mt-1 text-[11px] text-[#8ea0b8]">其中启用中 {activeToolCount} 个</div>
            </div>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <div className="rounded-2xl border border-[#e5edf7] bg-[#fbfdff] px-4 py-3">
              <div className="text-[11px] font-medium text-[#6b7c93]">工具示例</div>
              <div className="mt-2 max-h-40 space-y-2 overflow-y-auto pr-1">
                {allToolEntries.slice(0, 8).map(item => (
                  <div key={`${item.serverId}:${item.toolId}`} className="rounded-xl border border-white bg-white px-3 py-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-mono text-[12px] text-[#10233f]">{serviceDisplayText(item.toolName)}</div>
                        <div className="mt-1 truncate text-[11px] text-[#6b7c93]">{serviceDisplayText(item.serverName)}</div>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] ${
                        item.serverStatus === 'connected'
                          ? 'bg-[#e9fff4] text-[#157f54]'
                          : item.serverStatus === 'error'
                            ? 'bg-[#fff7e8] text-[#b7791f]'
                            : 'bg-[#fff1f2] text-[#c2415c]'
                      }`}>
                        {statusLabels[item.serverStatus] || item.serverStatus}
                      </span>
                    </div>
                    {item.toolDescription && <div className="mt-1 line-clamp-2 text-[11px] leading-5 text-[#6b7c93]">{serviceDisplayText(item.toolDescription)}</div>}
                  </div>
                ))}
                {allToolEntries.length === 0 && <div className="text-[12px] text-[#8ea0b8]">当前没有已发现的工具。</div>}
              </div>
            </div>
            <div className="rounded-2xl border border-[#e5edf7] bg-[#fbfdff] px-4 py-3">
              <div className="text-[11px] font-medium text-[#6b7c93]">覆盖范围</div>
              <div className="mt-2 max-h-40 space-y-2 overflow-y-auto pr-1">
                {mcpServers.slice(0, 8).map(server => (
                  <div key={server.id} className="rounded-xl border border-white bg-white px-3 py-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-[12px] text-[#10233f]">{serviceDisplayText(server.name)}</div>
                        <div className="mt-1 text-[11px] text-[#6b7c93]">{server.tools.length} 个工具 · {categoryLabels[server.category] || server.category}</div>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] ${
                        server.status === 'connected'
                          ? 'bg-[#e9fff4] text-[#157f54]'
                          : server.status === 'error'
                            ? 'bg-[#fff7e8] text-[#b7791f]'
                            : 'bg-[#fff1f2] text-[#c2415c]'
                      }`}>
                        {statusLabels[server.status] || server.status}
                      </span>
                    </div>
                  </div>
                ))}
                {mcpServers.length === 0 && <div className="text-[12px] text-[#8ea0b8]">当前没有已注册的外部服务。</div>}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[220px_320px_minmax(0,1fr)]">
          <div className="rounded-[24px] border border-[#dbe4f0] bg-white p-4 shadow-[0_12px_36px_rgba(15,35,63,0.06)]">
            <div className="mb-3 px-1 text-[11px] font-medium text-[#8ea0b8]">服务分类</div>
            <div className="space-y-2">
              {Object.entries(categoryLabels).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => {
                    setFilterCategory(key);
                    setShowAddForm(false);
                    setEditMode(false);
                  }}
                  className={`w-full rounded-2xl px-3 py-3 text-left text-sm transition-colors ${
                    filterCategory === key
                      ? 'border border-[#cfe0ff] bg-[#eef5ff] text-[#0f6fff]'
                      : 'border border-transparent text-[#4f647d] hover:border-[#dbe4f0] hover:bg-[#f8fbff]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span>{label}</span>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[11px] text-[#8ea0b8]">
                      {(key === 'all' ? mcpServers : mcpServers.filter(server => server.category === key)).length}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-[#dbe4f0] bg-white p-4 shadow-[0_12px_36px_rgba(15,35,63,0.06)]">
            <div className="text-sm font-medium text-[#355070]">已注册服务</div>
            <div className="mt-1 text-[11px] text-[#8ea0b8]">{filtered.length} 条配置</div>
            <div className="mt-4 space-y-3">
              {mcpLoading ? (
                <AdminCrudListSkeleton rows={5} />
              ) : filtered.map(mcp => (
                <button
                  key={mcp.id}
                  type="button"
                  onClick={() => handleSelectMcp(mcp.id)}
                  className={`w-full rounded-[20px] border px-4 py-3 text-left transition-colors ${
                    selectedMcp === mcp.id
                      ? 'border-[#0f6fff] bg-[#eef5ff]'
                      : 'border-[#dbe4f0] bg-[#fbfdff] hover:border-[#b8cae6]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-medium text-[#10233f]">{serviceDisplayText(mcp.name)}</span>
                    <span className={`h-2.5 w-2.5 rounded-full ${
                      mcp.status === 'connected' ? 'bg-[#22c55e]' :
                      mcp.status === 'error' ? 'bg-[#f59e0b]' :
                      mcp.status === 'disconnected' ? 'bg-[#ef4444]' : 'bg-[#94a3b8]'
                    }`} />
                  </div>
                  <div className="mt-1 truncate text-[11px] text-[#8ea0b8]">{mcp.endpoint_url || '未配置地址'}</div>
                  <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
                    <span className={`rounded-full px-2 py-0.5 ${
                      mcp.status === 'connected'
                        ? 'bg-[#e9fff4] text-[#157f54]'
                        : mcp.status === 'error'
                          ? 'bg-[#fff7e8] text-[#b7791f]'
                          : 'bg-[#fff1f2] text-[#c2415c]'
                    }`}>
                      {statusLabels[mcp.status]}
                    </span>
                    <span className="rounded-full bg-[#f3f7fd] px-2 py-0.5 text-[#6b7c93]">{mcp.tools.length} 工具</span>
                    <span className="rounded-full bg-[#f3f7fd] px-2 py-0.5 text-[#6b7c93]">{categoryLabels[mcp.category]}</span>
                    <span className="rounded-full bg-[#f3f7fd] px-2 py-0.5 text-[#6b7c93]">{transportLabels[mcp.transport] || mcp.transport}</span>
                  </div>
                </button>
              ))}
              {!mcpLoading && filtered.length === 0 && (
                <AdminCrudEmptyState title="还没有服务配置" description="切换分类或添加外部服务后继续配置工具。" />
              )}
            </div>
          </div>

          <div className="rounded-[24px] border border-[#dbe4f0] bg-white p-5 shadow-[0_12px_36px_rgba(15,35,63,0.06)]">
            {showAddForm ? (
              <div>
                <h3 className="mb-4 text-base font-semibold text-[#10233f]">注册新外部服务</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-[11px] text-[#6b7c93]">服务名称 *</label>
                    <input
                      className="mt-1 w-full rounded-xl border border-[#dbe4f0] bg-[#f8fbff] px-3 py-2 text-sm text-[#10233f] outline-none transition-colors focus:border-[#0f6fff] focus:ring-4 focus:ring-[rgba(15,111,255,0.12)]"
                      placeholder="例如：报表服务"
                      value={addForm.name}
                      onChange={e => setAddForm(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#6b7c93]">分类</label>
                    <select
                      className="mt-1 w-full rounded-xl border border-[#dbe4f0] bg-[#f8fbff] px-3 py-2 text-sm text-[#10233f] outline-none transition-colors focus:border-[#0f6fff] focus:ring-4 focus:ring-[rgba(15,111,255,0.12)]"
                      value={addForm.category}
                      onChange={e => setAddForm(prev => ({ ...prev, category: e.target.value }))}
                    >
                      <option value="data">数据服务</option>
                      <option value="function">功能服务</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-[#6b7c93]">服务地址 *</label>
                    <input
                      className="mt-1 w-full rounded-xl border border-[#dbe4f0] bg-[#f8fbff] px-3 py-2 text-sm font-mono text-[#10233f] outline-none transition-colors focus:border-[#0f6fff] focus:ring-4 focus:ring-[rgba(15,111,255,0.12)]"
                      placeholder="例如：https://example.com/mcp"
                      value={addForm.endpoint_url}
                      onChange={e => setAddForm(prev => ({ ...prev, endpoint_url: e.target.value }))}
                    />
                    <div className="mt-1 text-[11px] leading-5 text-[#8ea0b8]">
                      如果服务需要授权，请先在服务方完成账号授权，再把可访问的服务地址写入这里。
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] text-[#6b7c93]">连接协议</label>
                    <select
                      className="mt-1 w-full rounded-xl border border-[#dbe4f0] bg-[#f8fbff] px-3 py-2 text-sm text-[#10233f] outline-none transition-colors focus:border-[#0f6fff] focus:ring-4 focus:ring-[rgba(15,111,255,0.12)]"
                      value={addForm.transport}
                      onChange={e => setAddForm(prev => ({ ...prev, transport: e.target.value as McpServerConfig['transport'] }))}
                    >
                      <option value="streamable-http">Streamable HTTP</option>
                      <option value="sse">SSE</option>
                    </select>
                    <div className="mt-1 text-[11px] leading-5 text-[#8ea0b8]">
                      优先使用 Streamable HTTP；如服务方提供 SSE，请填写完整 SSE URL。
                    </div>
                  </div>
                  <div className="rounded-2xl border border-[#dbe4f0] bg-[#f8fbff] p-4">
                    <label className="text-[11px] text-[#6b7c93]">鉴权方式</label>
                    <select
                      className="mt-1 w-full rounded-xl border border-[#dbe4f0] bg-white px-3 py-2 text-sm text-[#10233f] outline-none transition-colors focus:border-[#0f6fff] focus:ring-4 focus:ring-[rgba(15,111,255,0.12)]"
                      value={addForm.auth_type}
                      onChange={e => setAddForm(prev => ({ ...prev, auth_type: e.target.value }))}
                    >
                      <option value="none">无鉴权</option>
                      <option value="api_key">访问密钥</option>
                      <option value="access_token">访问令牌</option>
                      <option value="bearer_token">Bearer 访问令牌</option>
                      <option value="oauth2">OAuth 2.0（需先授权）</option>
                    </select>
                    {renderAuthFields(addForm.auth_type, addForm, setAddForm)}
                  </div>
                  <div>
                    <label className="text-[11px] text-[#6b7c93]">描述</label>
                    <textarea
                      className="mt-1 h-24 w-full resize-none rounded-xl border border-[#dbe4f0] bg-[#f8fbff] px-3 py-2 text-sm text-[#10233f] outline-none transition-colors focus:border-[#0f6fff] focus:ring-4 focus:ring-[rgba(15,111,255,0.12)]"
                      placeholder="描述此服务提供的能力和适用场景"
                      value={addForm.description}
                      onChange={e => setAddForm(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button onClick={handleRegister} className="rounded-xl bg-[#0f6fff] px-4 py-2 text-sm font-medium text-white hover:bg-[#0b5ad1]">注册服务</button>
                    <button onClick={() => { setShowAddForm(false); setSaveMsg(''); }} className="rounded-xl border border-[#dbe4f0] bg-white px-4 py-2 text-sm text-[#4f647d] hover:border-[#b8cae6]">取消</button>
                  </div>
                </div>
              </div>
            ) : selected ? (
              <div className="space-y-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-[#10233f]">{serviceDisplayText(selected.name)}</h3>
                    <div className="mt-1 text-sm text-[#6b7c93]">{serviceDisplayText(selected.description)}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => testConnection(selected.id)}
                      disabled={testStatus[selected.id] === 'testing'}
                      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                        testStatus[selected.id] === 'success'
                          ? 'border border-[#b8ebd0] bg-[#f2fff7] text-[#157f54]'
                          : testStatus[selected.id] === 'fail'
                            ? 'border border-[#fecdd3] bg-[#fff1f2] text-[#c2415c]'
                            : 'border border-[#dbe4f0] bg-white text-[#355070] hover:border-[#0f6fff] hover:text-[#0f6fff]'
                      }`}
                    >
                      {testStatus[selected.id] === 'testing' ? <Loader2 size={14} className="animate-spin" /> : <Wifi size={14} />}
                      {testStatus[selected.id] === 'testing' ? '测试中...' :
                        testStatus[selected.id] === 'success' ? '已连接' :
                          testStatus[selected.id] === 'fail' ? '失败' : '测试连通'}
                    </button>
                    <button
                      onClick={() => { setEditMode(!editMode); setSaveMsg(''); }}
                      className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                        editMode
                          ? 'border border-[#b8ebd0] bg-[#f2fff7] text-[#157f54]'
                          : 'border border-[#dbe4f0] bg-white text-[#355070] hover:border-[#0f6fff] hover:text-[#0f6fff]'
                      }`}
                    >
                      {editMode ? '完成编辑' : '编辑'}
                    </button>
                    <button
                      onClick={() => handleDeleteMcp(selected)}
                      disabled={deletingMcpId === selected.id}
                      className="inline-flex items-center gap-2 rounded-xl border border-[#dbe4f0] bg-white px-4 py-2 text-sm font-medium text-[#355070] transition-colors hover:border-[#fecdd3] hover:text-[#c2415c] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {deletingMcpId === selected.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      {selected.id.startsWith('mcp_') ? '删除' : '停用'}
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="space-y-4">
                    <div className="rounded-[20px] border border-[#dbe4f0] bg-[#f8fbff] p-4">
                      <div className="mb-3 text-sm font-medium text-[#355070]">连接状态</div>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className={`h-2.5 w-2.5 rounded-full ${
                          selected.status === 'connected' ? 'bg-[#22c55e]' :
                            selected.status === 'error' ? 'bg-[#f59e0b]' :
                              selected.status === 'disconnected' ? 'bg-[#ef4444]' : 'bg-[#94a3b8]'
                        }`} />
                        <span className={`text-sm font-medium ${statusColors[selected.status]}`}>{statusLabels[selected.status]}</span>
                        {selected.last_ping_at && (
                          <span className="text-[11px] text-[#8ea0b8]">最近测试：<ClientTime value={selected.last_ping_at} /></span>
                        )}
                        {selected.latency_ms !== undefined && (
                          <span className="rounded-full bg-white px-2 py-1 text-[11px] text-[#6b7c93]">延迟 {selected.latency_ms}ms</span>
                        )}
                      </div>
                      {testMessage[selected.id] && (
                        <div className={`mt-3 rounded-2xl px-3 py-2 text-[12px] ${
                          testStatus[selected.id] === 'success'
                            ? 'bg-[#f2fff7] text-[#157f54]'
                            : testStatus[selected.id] === 'fail'
                              ? 'bg-[#fff1f2] text-[#c2415c]'
                              : 'bg-white text-[#355070]'
                        }`}>
                          {testMessage[selected.id]}
                        </div>
                      )}
                    </div>

                    <div className="rounded-[20px] border border-[#dbe4f0] bg-white p-4">
                      <div className="mb-3 text-sm font-medium text-[#355070]">连接配置</div>
                      {editMode ? (
                        <div className="space-y-3">
                          <div>
                            <label className="text-[11px] text-[#6b7c93]">服务地址</label>
                            <input
                              className="mt-1 w-full rounded-xl border border-[#dbe4f0] bg-[#f8fbff] px-3 py-2 text-sm font-mono text-[#10233f] outline-none transition-colors focus:border-[#0f6fff] focus:ring-4 focus:ring-[rgba(15,111,255,0.12)]"
                              placeholder="例如：https://example.com/mcp"
                              value={editForm.endpoint_url}
                              onChange={e => setEditForm(prev => ({ ...prev, endpoint_url: e.target.value }))}
                            />
                            <div className="mt-1 text-[11px] leading-5 text-[#8ea0b8]">
                              如果服务需要授权，请先在服务方完成账号授权，再把可访问的服务地址写入这里。
                            </div>
                          </div>
                          <div>
                            <label className="text-[11px] text-[#6b7c93]">连接协议</label>
                            <select
                              className="mt-1 w-full rounded-xl border border-[#dbe4f0] bg-[#f8fbff] px-3 py-2 text-sm text-[#10233f] outline-none transition-colors focus:border-[#0f6fff] focus:ring-4 focus:ring-[rgba(15,111,255,0.12)]"
                              value={editForm.transport}
                              onChange={e => setEditForm(prev => ({ ...prev, transport: e.target.value as McpServerConfig['transport'] }))}
                            >
                              <option value="streamable-http">Streamable HTTP</option>
                              <option value="sse">SSE</option>
                            </select>
                            <div className="mt-1 text-[11px] leading-5 text-[#8ea0b8]">
                              优先使用 Streamable HTTP；如服务方提供 SSE，请填写完整 SSE URL。
                            </div>
                          </div>
                          <div>
                            <label className="text-[11px] text-[#6b7c93]">鉴权方式</label>
                            <select
                              className="mt-1 w-full rounded-xl border border-[#dbe4f0] bg-[#f8fbff] px-3 py-2 text-sm text-[#10233f] outline-none transition-colors focus:border-[#0f6fff] focus:ring-4 focus:ring-[rgba(15,111,255,0.12)]"
                              value={editForm.auth_type}
                              onChange={e => setEditForm(prev => ({ ...prev, auth_type: e.target.value }))}
                            >
                              <option value="none">无鉴权</option>
                              <option value="api_key">访问密钥</option>
                              <option value="access_token">访问令牌</option>
                              <option value="bearer_token">Bearer 访问令牌</option>
                              <option value="oauth2">OAuth 2.0（需先授权）</option>
                            </select>
                            {renderAuthFields(editForm.auth_type, editForm, setEditForm)}
                          </div>
                          <div className="flex gap-2 pt-1">
                            <button onClick={handleSave} className="rounded-xl bg-[#0f6fff] px-4 py-2 text-sm font-medium text-white hover:bg-[#0b5ad1]">保存</button>
                            <button onClick={() => { setEditMode(false); setSaveMsg(''); }} className="rounded-xl border border-[#dbe4f0] bg-white px-4 py-2 text-sm text-[#4f647d] hover:border-[#b8cae6]">取消</button>
                          </div>
                        </div>
                      ) : (
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="rounded-2xl border border-[#e5edf7] bg-[#f8fbff] px-4 py-3">
                            <div className="text-[11px] text-[#8ea0b8]">服务地址</div>
                            <div className="mt-2 break-all font-mono text-[12px] text-[#10233f]">{selected.endpoint_url || '未配置'}</div>
                          </div>
                          <div className="rounded-2xl border border-[#e5edf7] bg-[#f8fbff] px-4 py-3">
                            <div className="text-[11px] text-[#8ea0b8]">连接协议</div>
                            <div className="mt-2 text-sm text-[#10233f]">{transportLabels[selected.transport] || selected.transport}</div>
                            <div className="mt-1 text-[11px] text-[#6b7c93]">
                              {selected.transport === 'sse' ? '按完整 SSE 地址连接' : '按标准 HTTP 服务连接'}
                            </div>
                          </div>
                          <div className="rounded-2xl border border-[#e5edf7] bg-[#f8fbff] px-4 py-3">
                            <div className="text-[11px] text-[#8ea0b8]">鉴权方式</div>
                            <div className="mt-2 text-sm text-[#10233f]">{authTypeLabels[selected.auth_type] || selected.auth_type}</div>
                            <div className="mt-1 text-[11px] text-[#6b7c93]">
                              {selected.auth_type === 'bearer_token'
                                ? maskValue(selected.auth_config?.token)
                                : selected.auth_type === 'api_key'
                                  ? maskValue(selected.auth_config?.api_key)
                                  : selected.auth_type === 'access_token'
                                    ? maskValue(selected.auth_config?.access_token)
                                    : selected.auth_type === 'oauth2'
                                      ? '已配置 OAuth 凭证'
                                      : selected.auth_config?.tool_range
                                        ? `工具范围 ${selected.auth_config.tool_range}`
                                        : '无需凭证'}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="rounded-[20px] border border-[#dbe4f0] bg-white p-4">
                      <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="text-sm font-medium text-[#355070]">提供工具</div>
                          <div className="mt-1 text-[11px] text-[#8ea0b8]">{selected.tools.length} 个工具，支持按名称或说明检索</div>
                        </div>
                        <div className="relative w-full md:w-64">
                          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8ea0b8]" />
                          <input
                            value={toolKeyword}
                            onChange={e => setToolKeyword(e.target.value)}
                            placeholder="搜索工具"
                            className="w-full rounded-xl border border-[#dbe4f0] bg-[#f8fbff] py-2 pl-10 pr-3 text-sm text-[#10233f] outline-none transition-colors focus:border-[#0f6fff] focus:ring-4 focus:ring-[rgba(15,111,255,0.12)]"
                          />
                        </div>
                      </div>
                      <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                        {visibleTools.map(tool => (
                          <div key={tool.name} className="rounded-2xl border border-[#e5edf7] bg-[#fbfdff] px-4 py-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="truncate font-mono text-sm text-[#10233f]">{tool.name}</div>
                                <div className="mt-1 text-[12px] leading-5 text-[#6b7c93]">{serviceDisplayText(tool.description || '未提供说明')}</div>
                              </div>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] ${
                                tool.enabled ? 'bg-[#e9fff4] text-[#157f54]' : 'bg-[#f1f5f9] text-[#64748b]'
                              }`}>
                                {tool.enabled ? '启用' : '禁用'}
                              </span>
                            </div>
                          </div>
                        ))}
                        {visibleTools.length === 0 && (
                          <div className="rounded-2xl border border-dashed border-[#dbe4f0] bg-[#fbfdff] px-4 py-10 text-center text-sm text-[#8ea0b8]">
                            {selected.tools.length === 0 ? '当前服务还没有发现工具，请先执行测试连通。' : '没有匹配到对应工具，请调整搜索词。'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-[20px] border border-[#dbe4f0] bg-[#f8fbff] p-4">
                      <div className="mb-3 text-sm font-medium text-[#355070]">服务概览</div>
                      <div className="space-y-3 text-sm">
                        <div className="rounded-2xl border border-[#e5edf7] bg-white px-4 py-3">
                          <div className="text-[11px] text-[#8ea0b8]">服务分类</div>
                          <div className="mt-1 text-[#10233f]">{categoryLabels[selected.category]}</div>
                        </div>
                        <div className="rounded-2xl border border-[#e5edf7] bg-white px-4 py-3">
                          <div className="text-[11px] text-[#8ea0b8]">工具数量</div>
                          <div className="mt-1 text-[#10233f]">{selected.tools.length} 个</div>
                        </div>
                        <div className="rounded-2xl border border-[#e5edf7] bg-white px-4 py-3">
                          <div className="text-[11px] text-[#8ea0b8]">绑定助手</div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {selected.bound_agents.length > 0 ? selected.bound_agents.map(agent => (
                              <span key={agent} className="rounded-full bg-[#eef5ff] px-2 py-1 text-[11px] text-[#0f6fff]">{agent}</span>
                            )) : <span className="text-[12px] text-[#6b7c93]">未绑定任何助手</span>}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[20px] border border-[#dbe4f0] bg-white p-4">
                      <div className="mb-3 text-sm font-medium text-[#355070]">时间记录</div>
                      <div className="space-y-3 text-[12px] text-[#4f647d]">
                        <div className="rounded-2xl border border-[#e5edf7] bg-[#f8fbff] px-4 py-3">
                          <div className="text-[11px] text-[#8ea0b8]">最近心跳</div>
                          <div className="mt-1">{selected.last_ping_at ? <ClientTime value={selected.last_ping_at} /> : '暂无记录'}</div>
                        </div>
                        <div className="rounded-2xl border border-[#e5edf7] bg-[#f8fbff] px-4 py-3">
                          <div className="text-[11px] text-[#8ea0b8]">最近健康检查</div>
                          <div className="mt-1">{selected.last_health_check_at ? <ClientTime value={selected.last_health_check_at} /> : '暂无记录'}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[420px] items-center justify-center">
                <div className="text-center">
                  <div className="text-sm text-[#6b7c93]">选择左侧服务查看详情，或先添加新的外部服务。</div>
                  <div className="mt-1 text-[11px] text-[#8ea0b8]">右侧会显示连通状态、连接配置和工具清单。</div>
                </div>
              </div>
            )}
          </div>
        </div>
        </div>
      </main>
    </AdminCrudShell>
  );
}

const skillCategoryLabels: Record<McpSkillCategory | 'all', string> = {
  all: '全部',
  data: '数据服务',
  operation: '执行流程',
  monitor: '监控任务',
  analysis: '分析洞察',
  integration: '对接集成',
  other: '其他',
};

type SkillManagementTabProps = {
  onJump: (tab: AdminTab) => void;
};

function parseJsonText(value: string): { ok: true; value: unknown } | { ok: false; error: string } {
  const trimmed = value.trim();
  if (!trimmed) {
    return { ok: false, error: '请先粘贴导入内容' };
  }
  try {
    return { ok: true, value: JSON.parse(trimmed) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'JSON 解析失败',
    };
  }
}


export { McpConfigTab };

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, RefreshCw, Save, Sparkles } from 'lucide-react';
import { xiaoqiaoApi, type EntityResolutionConfigResponse } from '@/lib/api';
import { ADMIN_CATALOG_CHANGE_EVENT, ADMIN_CATALOG_CHANGE_STORAGE_KEY, broadcastAdminCatalogChange } from '@/lib/admin-catalog-events';
import {
  AdminCrudErrorState,
  AdminCrudHeader,
  AdminCrudListSkeleton,
  AdminCrudShell,
} from './AdminCrudScaffold';

type SaveStatus = {
  status: 'idle' | 'saving' | 'saved' | 'error';
  message?: string;
};

const ENTITY_LABELS: Record<string, string> = {
  media: '媒体',
  app: '应用',
  campaign: '计划',
  material: '素材',
  account: '账户',
  team: '团队',
  package: '包体',
  terminal: '终端',
};

export function EntityResolutionConfigTab() {
  const [config, setConfig] = useState<EntityResolutionConfigResponse | null>(null);
  const [configText, setConfigText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveStatus>({ status: 'idle' });
  const [lastLoadedAt, setLastLoadedAt] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await xiaoqiaoApi.getEntityResolutionConfig();
      setConfig(payload);
      setConfigText(JSON.stringify(payload, null, 2));
      setSaveState({ status: 'idle' });
      setLastLoadedAt(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const handleCatalogChange = () => void load();
    const handleStorage = (event: StorageEvent) => {
      if (event.key === ADMIN_CATALOG_CHANGE_STORAGE_KEY) void load();
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void load();
    };
    window.addEventListener(ADMIN_CATALOG_CHANGE_EVENT, handleCatalogChange);
    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', handleCatalogChange);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener(ADMIN_CATALOG_CHANGE_EVENT, handleCatalogChange);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleCatalogChange);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [load]);

  const counts = useMemo(() => {
    const entries = config?.entries || [];
    return {
      total: entries.length,
      enabled: entries.filter(item => item.enabled).length,
      media: entries.filter(item => item.entity_type === 'media').length,
      terminal: entries.filter(item => item.entity_type === 'terminal').length,
    };
  }, [config]);

  const previewEntries = useMemo(() => (config?.entries || []).slice(0, 10), [config]);

  const lastLoadedLabel = useMemo(() => {
    if (!lastLoadedAt) return '尚未刷新';
    return new Intl.DateTimeFormat('zh-CN', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(lastLoadedAt));
  }, [lastLoadedAt]);

  const save = async () => {
    setSaveState({ status: 'saving' });
    try {
      const parsed = JSON.parse(configText) as Partial<EntityResolutionConfigResponse>;
      const updated = await xiaoqiaoApi.updateEntityResolutionConfig(parsed);
      setConfig(updated);
      setConfigText(JSON.stringify(updated, null, 2));
      setSaveState({ status: 'saved', message: '已保存实体解析配置' });
      broadcastAdminCatalogChange('entity-resolution-config');
    } catch (err) {
      setSaveState({ status: 'error', message: err instanceof Error ? err.message : '保存失败' });
    }
  };

  return (
    <AdminCrudShell>
      <AdminCrudHeader
        title="实体解析配置"
        description={`统一维护实体标准名、别名、优先级和生效状态。最近刷新：${lastLoadedLabel}`}
        saveState={saveState.status}
        saveText={saveState.message}
        actions={(
          <>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-[#dbe4f0] bg-white px-3 py-2 text-sm font-medium text-[#355070] hover:border-[#0f6fff] hover:text-[#0f6fff] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          {loading ? '刷新中' : '刷新'}
        </button>
          </>
        )}
      />

      {error && (
        <AdminCrudErrorState description={error} action={(
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg bg-[#0f6fff] px-3 py-1.5 text-xs font-medium text-white"
          >
            重新加载
          </button>
        )} />
      )}

      <main className="min-h-0 flex-1 overflow-y-auto bg-[#f6f9fd] p-4 md:p-5">
      {loading ? (
        <div className="rounded-2xl border border-[#dbe4f0] bg-white">
          <AdminCrudListSkeleton rows={4} />
        </div>
      ) : (
      <div className="grid gap-4">

      <div className="grid gap-4 lg:grid-cols-4">
        <StatCard title="实体条目" value={counts.total} note="全部已配置实体条目" />
        <StatCard title="已启用" value={counts.enabled} note="当前参与运行解析的条目" />
        <StatCard title="媒体条目" value={counts.media} note="媒体别名与标准名" />
        <StatCard title="终端条目" value={counts.terminal} note="终端别名与标准名" />
      </div>

      <section className="rounded-2xl border border-[#dbe4f0] bg-white p-4">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-[#0f6fff]" />
          <h3 className="text-sm font-semibold text-[#10233f]">配置原则</h3>
        </div>
        <div className="mt-3 grid gap-3 text-sm text-[#355070] lg:grid-cols-2">
          <div className="rounded-xl bg-[#f8fbff] p-3">
            <div className="font-medium text-[#10233f]">统一口径</div>
            <div className="mt-1 leading-6">用户提到媒体、应用、账户等对象时，会先按这里的别名和标准名对齐。</div>
          </div>
          <div className="rounded-xl bg-[#f8fbff] p-3">
            <div className="font-medium text-[#10233f]">辅助层</div>
            <div className="mt-1 leading-6">知识库和用户记忆只提供候选和说明，最终名称以这里的配置为准。</div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-2xl border border-[#dbe4f0] bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-[#0f6fff]" />
              <h3 className="text-sm font-semibold text-[#10233f]">配置内容</h3>
            </div>
            <div className="flex items-center gap-2">
              {saveState.status === 'saved' && (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                  <Check size={12} />
                  {saveState.message}
                </span>
              )}
              {saveState.status === 'error' && <span className="text-xs text-rose-600">{saveState.message}</span>}
              <button
                type="button"
                onClick={() => void save()}
                disabled={saveState.status === 'saving'}
                className="inline-flex items-center gap-2 rounded-xl bg-[#0f6fff] px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save size={14} />
                {saveState.status === 'saving' ? '保存中' : '保存配置'}
              </button>
            </div>
          </div>
          <textarea
            value={configText}
            onChange={(event) => setConfigText(event.target.value)}
            className="mt-3 min-h-[560px] w-full rounded-2xl border border-[#dbe4f0] bg-[#fbfdff] px-4 py-3 font-mono text-xs leading-6 text-[#10233f] outline-none focus:border-[#0f6fff]"
            spellCheck={false}
          />
          <div className="mt-2 text-xs text-[#8ea0b8]">修改后保存即可立即生效，页面会自动刷新。</div>
        </section>

        <section className="rounded-2xl border border-[#dbe4f0] bg-white p-4">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[#0f6fff]" />
            <h3 className="text-sm font-semibold text-[#10233f]">条目预览</h3>
          </div>
          <div className="mt-3 grid gap-3">
            {previewEntries.map((entry) => (
              <div key={entry.id} className="rounded-xl border border-[#e7eef7] bg-[#f8fbff] p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium text-[#10233f]">{entry.canonical}</div>
                  <span className="text-xs text-[#6b7c93]">{ENTITY_LABELS[entry.entity_type] || entry.entity_type}</span>
                </div>
                <div className="mt-2 text-xs leading-5 text-[#6b7c93]">
                  <div>别名：{entry.aliases.join(' / ') || '无'}</div>
                  <div>优先级：{entry.priority}</div>
                  <div>来源：{entry.source}</div>
                  <div>状态：{entry.enabled ? '启用' : '停用'}</div>
                </div>
              </div>
            ))}
            {!previewEntries.length && <div className="rounded-xl border border-dashed border-[#dbe4f0] px-4 py-8 text-center text-sm text-[#8ea0b8]">暂无条目</div>}
          </div>
        </section>
      </div>
      </div>
      )}
      </main>
    </AdminCrudShell>
  );
}

function StatCard({ title, value, note }: { title: string; value: number; note: string }) {
  return (
    <div className="rounded-2xl border border-[#dbe4f0] bg-white p-4 shadow-[0_12px_30px_rgba(16,35,63,0.04)]">
      <div className="text-sm text-[#6b7c93]">{title}</div>
      <div className="mt-2 text-2xl font-semibold text-[#10233f]">{value}</div>
      <div className="mt-1 text-xs text-[#8ea0b8]">{note}</div>
    </div>
  );
}

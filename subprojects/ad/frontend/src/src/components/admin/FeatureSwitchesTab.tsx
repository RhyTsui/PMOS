'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, ToggleLeft, ToggleRight } from 'lucide-react';
import type { AdminFeatureSwitch } from '@/lib/feature-switch-store';
import {
  AdminCrudEmptyState,
  AdminCrudErrorState,
  AdminCrudHeader,
  AdminCrudListSkeleton,
  AdminCrudShell,
  AdminCrudToolbar,
} from './AdminCrudScaffold';
import { readClientStorage, writeClientStorage } from './admin-tab-helpers';

type AdminSwitchItem = AdminFeatureSwitch;
type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const FEATURE_SWITCH_SELECTION_KEY = 'xiaoqiao-admin-feature-switch-key';

export function FeatureSwitchesTab() {
  const [switches, setSwitches] = useState<AdminSwitchItem[]>([]);
  const [switchStates, setSwitchStates] = useState<Record<string, boolean>>({});
  const [selectedSwitchKey, setSelectedSwitchKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');

  const selectSwitch = (key: string | null) => {
    setSelectedSwitchKey(key);
    writeClientStorage(FEATURE_SWITCH_SELECTION_KEY, key);
  };

  const loadSwitches = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await fetch('/api/xiaoqiao/admin/feature-switches', { cache: 'no-store' });
      if (!response.ok) throw new Error(await response.text());
      const data = await response.json() as AdminSwitchItem[];
      const storedKey = readClientStorage(FEATURE_SWITCH_SELECTION_KEY);
      setSwitches(data);
      setSwitchStates(Object.fromEntries(data.map(item => [item.key, item.enabled])));
      setSelectedSwitchKey(current => {
        const preferred = current || storedKey;
        return preferred && data.some(item => item.key === preferred) ? preferred : data[0]?.key || null;
      });
    } catch (error) {
      setSwitches([]);
      setSwitchStates({});
      setSelectedSwitchKey(null);
      setLoadError(error instanceof Error && error.message ? error.message : '读取功能开关失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSwitches();
  }, []);

  const toggleSwitch = async (key: string) => {
    if (savingKey) return;
    const current = switchStates[key] ?? false;
    const nextEnabled = !current;
    setSavingKey(key);
    setSaveState('saving');
    setSwitchStates(prev => ({ ...prev, [key]: nextEnabled }));
    setSwitches(prev => prev.map(item => item.key === key ? { ...item, enabled: nextEnabled } : item));
    try {
      const response = await fetch(`/api/xiaoqiao/admin/feature-switches/${key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: nextEnabled }),
      });
      if (!response.ok) throw new Error(await response.text());
      const saved = await response.json() as AdminSwitchItem;
      setSwitches(prev => prev.map(item => item.key === key ? saved : item));
      setSwitchStates(prev => ({ ...prev, [key]: saved.enabled }));
      setSaveState('saved');
    } catch {
      setSwitchStates(prev => ({ ...prev, [key]: current }));
      setSwitches(prev => prev.map(item => item.key === key ? { ...item, enabled: current } : item));
      setSaveState('error');
    } finally {
      setSavingKey(null);
      window.setTimeout(() => setSaveState('idle'), 1800);
    }
  };

  const selectedSwitch = switches.find(item => item.key === selectedSwitchKey) || switches[0] || null;
  return (
    <AdminCrudShell className="overflow-hidden">
      <AdminCrudHeader
        title="功能开关"
        description="统一查看和调整关键能力状态；高风险开关会立即影响后续使用，请确认范围后再操作。"
        saveState={saveState}
        actions={(
          <button
            type="button"
            onClick={() => void loadSwitches()}
            disabled={loading}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#dbe4f0] bg-white px-3 text-xs text-[#355070] transition-colors hover:border-[#b8cae6] hover:bg-[#f8fbff] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </button>
        )}
      />
      {loadError ? (
        <AdminCrudErrorState
          description={loadError}
          action={(
            <button
              type="button"
              onClick={() => void loadSwitches()}
              className="rounded-lg border border-[#ffc9c9] bg-white px-3 py-1.5 text-xs text-[#8a1f1f] hover:bg-[#fff2f2]"
            >
              重新读取
            </button>
          )}
        />
      ) : null}
      <div className="flex min-h-0 flex-1 overflow-hidden bg-white">
      <div className="w-[420px] border-r border-[#dbe4f0] bg-white">
        <AdminCrudToolbar>
          <div className="text-xs text-[#6b7c93]">选择左侧条目查看说明和当前状态</div>
        </AdminCrudToolbar>
        <div className="custom-scrollbar h-full overflow-y-auto pb-16">
          {loading ? <AdminCrudListSkeleton rows={6} /> : null}
          {!loading && switches.length === 0 && !loadError ? (
            <AdminCrudEmptyState title="暂无功能开关" description="当前还没有可管理的功能开关。新增开关后会在这里显示状态和影响范围。" />
          ) : null}
          {switches.map((sw) => (
            <div
              role="button"
              tabIndex={0}
              key={sw.key}
              onClick={() => selectSwitch(sw.key)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') selectSwitch(sw.key);
              }}
              className={`w-full border-b border-[#edf2f8] px-5 py-4 text-left transition-colors ${
                selectedSwitch?.key === sw.key ? 'border-l-2 border-l-[#0f6fff] bg-[#f7fbff]' : 'hover:bg-[#fafcff]'
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-3">
                    <span className="text-sm font-medium text-[#10233f]">{sw.name}</span>
                    <span className="text-[10px] text-[#8ea0b8]">{sw.type === 'boolean' ? '布尔' : '数值'}</span>
                  </div>
                  <div className="text-[11px] text-[#6b7c93]">{sw.description}</div>
                </div>
                <button
                  type="button"
                  disabled={savingKey !== null}
                  onClick={(event) => { event.stopPropagation(); void toggleSwitch(sw.key); }}
                  className="flex items-center disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label={`${switchStates[sw.key] ? '关闭' : '开启'}${sw.name}`}
                >
                  {switchStates[sw.key] ? (
                    <ToggleRight className="h-7 w-7 text-[#0f9f6e]" />
                  ) : (
                    <ToggleLeft className="h-7 w-7 text-[#8ea0b8]" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <aside className="flex-1 overflow-y-auto bg-white px-6 py-5">
        {selectedSwitch ? (
          <div className="max-w-3xl">
            <div className="mb-5 flex items-start justify-between gap-4 border-b border-[#edf2f8] pb-4">
              <div>
                <h3 className="text-base font-semibold text-[#10233f]">{selectedSwitch.name}</h3>
                <p className="mt-2 text-sm leading-6 text-[#6b7c93]">{selectedSwitch.description}</p>
              </div>
              <button
                type="button"
                disabled={savingKey !== null}
                onClick={() => void toggleSwitch(selectedSwitch.key)}
                className="flex items-center gap-2 text-sm text-[#355070] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {switchStates[selectedSwitch.key] ? <ToggleRight className="h-8 w-8 text-[#0f9f6e]" /> : <ToggleLeft className="h-8 w-8 text-[#8ea0b8]" />}
                {switchStates[selectedSwitch.key] ? '已开启' : '已关闭'}
              </button>
            </div>
            <div className="grid gap-4 text-sm text-[#355070]">
              <div className="grid grid-cols-[120px_minmax(0,1fr)] border-b border-[#edf2f8] py-3">
                <span className="text-[#8ea0b8]">开关标识</span>
                <code>{selectedSwitch.key}</code>
              </div>
              <div className="grid grid-cols-[120px_minmax(0,1fr)] border-b border-[#edf2f8] py-3">
                <span className="text-[#8ea0b8]">类型</span>
                <span>{selectedSwitch.type === 'boolean' ? '开关型' : '数值型'}</span>
              </div>
              <div className="grid grid-cols-[120px_minmax(0,1fr)] border-b border-[#edf2f8] py-3">
                <span className="text-[#8ea0b8]">当前状态</span>
                <span>{switchStates[selectedSwitch.key] ? '开启' : '关闭'}</span>
              </div>
              {selectedSwitch.type === 'number' && selectedSwitch.config.value !== undefined && (
                <div className="grid grid-cols-[120px_minmax(0,1fr)] border-b border-[#edf2f8] py-3">
                  <span className="text-[#8ea0b8]">当前值</span>
                  <span>{String(selectedSwitch.config.value)}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <AdminCrudEmptyState title="选择一个开关" description="点击左侧开关后，可查看说明、标识、类型和当前状态。" />
        )}
      </aside>
      </div>
    </AdminCrudShell>
  );
}

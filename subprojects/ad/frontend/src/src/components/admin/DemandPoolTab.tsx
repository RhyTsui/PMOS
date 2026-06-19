'use client';

import { useEffect, useState } from 'react';
import { Plus, Edit3, AlertTriangle, Users, Target, CheckSquare, Link2, ClipboardList } from 'lucide-react';
import type { DemandPoolItem } from '@/types';
import { xiaoqiaoApi } from '@/lib/api';
import { readClientStorage, writeClientStorage, ADMIN_DEMAND_STORAGE_KEY } from './admin-tab-helpers';
import { ClientTime } from './admin-menu';
import {
  AdminCrudEmptyState,
  AdminCrudErrorState,
  AdminCrudHeader,
  AdminCrudListSkeleton,
  AdminCrudShell,
} from './AdminCrudScaffold';

function userFacingDemandText(value: string): string {
  return value
    .replace(/\bMCP\b/g, '外部服务')
    .replace(/\bAPI\b/g, '服务')
    .replace(/\bmock\b/gi, '示例')
    .replace(/\bschema\b/gi, '结构')
    .replace(/\bcontract\b/gi, '约定')
    .replace(/\bappId\b/g, '应用编号')
    .replace(/应用ID/g, '应用编号')
    .replace(/\blist_all_apps\b/g, '应用列表工具')
    .replace(/\bconv-[a-zA-Z0-9-]+/g, '会话记录')
    .replace(/\btask-[a-zA-Z0-9-]+/g, '任务记录')
    .replace(/\beval-[a-zA-Z0-9-]+/g, '评估记录');
}

function DemandPoolTab() {
  const [selectedIdRaw, setSelectedIdRaw] = useState<string | null>(() => readClientStorage(ADMIN_DEMAND_STORAGE_KEY));
  const [filterFlow, setFilterFlow] = useState<string>('all');
  const [filterPhase, setFilterPhase] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [pool, setPool] = useState<DemandPoolItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    setLoading(true);
    setLoadError('');
    xiaoqiaoApi.getDemandPool()
      .then(setPool)
      .catch(() => {
        setPool([]);
        setLoadError('需求读取失败，请稍后重试');
      })
      .finally(() => setLoading(false));
  }, []);

  const setSelectedId = (id: string | null) => {
    setSelectedIdRaw(id);
    writeClientStorage(ADMIN_DEMAND_STORAGE_KEY, id);
  };

  const selectedId = selectedIdRaw && pool.some(d => d.id === selectedIdRaw) ? selectedIdRaw : null;
  const selected = pool.find(d => d.id === selectedId);

  const filtered = pool.filter(d => {
    if (filterFlow !== 'all' && d.business_flow !== filterFlow) return false;
    if (filterPhase !== 'all' && d.phase !== filterPhase) return false;
    if (filterPriority !== 'all' && d.priority !== filterPriority) return false;
    return true;
  });

  const phaseLabel = (p: string) => p === 'phase1' ? '第一阶段' : p === 'phase2' ? '第二阶段' : '第三阶段';
  const phaseColor = (p: string) => p === 'phase1' ? '#00FF88' : p === 'phase2' ? '#FFB800' : '#7B61FF';
  const priorityColor = (p: string) => p === 'P0' ? '#FF3366' : p === 'P1' ? '#FFB800' : p === 'P2' ? '#00D9FF' : '#5a6a8a';
  const statusColor = (s: string) => {
    if (s === 'in-progress') return '#0f6fff';
    if (s === 'approved') return '#1a9b68';
    if (s === 'completed') return '#7c3aed';
    if (s === 'draft') return '#64748b';
    return '#ef4444';
  };
  const autoLabel = (a: string) => a === 'auto' ? '可自动' : a === 'human-machine' ? '人机协作' : '必须人工';
  const autoColor = (a: string) => a === 'auto' ? '#00FF88' : a === 'human-machine' ? '#FFB800' : '#FF3366';
  const flowLabel = (f: string) => f === 'help' ? '使用帮助' : f === 'demand' ? '需求沟通' : f === 'diagnosis' ? '问题排查' : '广告联调';

  return (
    <AdminCrudShell>
      <AdminCrudHeader
        title="需求池"
        description="集中查看待处理需求、验收标准、依赖项和交付结果，便于继续跟进。"
        actions={(
          <button className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#0f6fff] px-3 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#0d5ed9]">
            <Plus className="h-3.5 w-3.5" />
            新建需求
          </button>
        )}
      />
      {loadError ? (
        <AdminCrudErrorState description={loadError} />
      ) : null}
      {loading ? (
        <AdminCrudListSkeleton rows={5} />
      ) : (
    <div className="admin-demand-pool flex min-h-[640px] overflow-hidden rounded-2xl border border-[#dbe4f0] bg-white shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
      <div className="w-56 shrink-0 overflow-y-auto border-r border-[#e8eef7] bg-white p-4">
        <div className="mb-3 text-xs font-medium text-[#5f6f86]">业务流</div>
        <div className="mb-5 space-y-1">
          {[['all', '全部'], ['help', '使用帮助'], ['demand', '需求沟通'], ['diagnosis', '问题排查'], ['debugging', '广告联调']].map(([v, l]) => (
            <button key={v} onClick={() => setFilterFlow(v)}
              className={`w-full rounded-xl px-3 py-2 text-left text-xs transition-colors ${
                filterFlow === v ? 'bg-[#eef5ff] text-[#0f6fff]' : 'text-[#5f6f86] hover:bg-[#f3f8ff] hover:text-[#355070]'
              }`}>
              {l}
            </button>
          ))}
        </div>
        <div className="mb-3 text-xs font-medium text-[#5f6f86]">阶段</div>
        <div className="mb-5 space-y-1">
          {[['all', '全部'], ['phase1', '第一阶段'], ['phase2', '第二阶段'], ['phase3', '第三阶段']].map(([v, l]) => (
            <button key={v} onClick={() => setFilterPhase(v)}
              className={`w-full rounded-xl px-3 py-2 text-left text-xs transition-colors ${
                filterPhase === v ? 'bg-[#eef5ff] text-[#0f6fff]' : 'text-[#5f6f86] hover:bg-[#f3f8ff] hover:text-[#355070]'
              }`}>
              {l}
            </button>
          ))}
        </div>
        <div className="mb-3 text-xs font-medium text-[#5f6f86]">优先级</div>
        <div className="space-y-1">
          {[['all', '全部'], ['P0', 'P0'], ['P1', 'P1'], ['P2', 'P2'], ['P3', 'P3']].map(([v, l]) => (
            <button key={v} onClick={() => setFilterPriority(v)}
              className={`w-full rounded-xl px-3 py-2 text-left text-xs transition-colors ${
                filterPriority === v ? 'bg-[#eef5ff] text-[#0f6fff]' : 'text-[#5f6f86] hover:bg-[#f3f8ff] hover:text-[#355070]'
              }`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="w-80 shrink-0 overflow-y-auto border-r border-[#e8eef7] bg-white">
        <div className="flex items-center justify-between border-b border-[#edf3fb] px-4 py-4">
          <div>
            <div className="text-sm font-semibold text-[#10233f]">需求池列表</div>
            <span className="mt-0.5 block text-[11px] text-[#6b7c93]">{filtered.length} 条需求</span>
          </div>
          <button className="flex items-center gap-1 text-xs text-[#0f6fff] hover:text-[#0b5ad1]">
            <Plus className="w-3 h-3" />新建需求
          </button>
        </div>
        {filtered.map(d => (
          <div key={d.id}
            onClick={() => setSelectedId(d.id)}
            className={`cursor-pointer border-l-2 border-b border-[#f0f4fa] p-4 transition-colors ${
              selectedId === d.id ? 'border-l-[#0f6fff] bg-[#f5f9ff]' : 'border-l-transparent hover:bg-[#fafcff]'
            }`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono font-bold" style={{ color: priorityColor(d.priority) }}>{d.priority}</span>
              <span className="truncate text-sm font-medium text-[#10233f]">{d.title}</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: `${phaseColor(d.phase)}15`, color: phaseColor(d.phase) }}>
                {phaseLabel(d.phase)}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: `${statusColor(d.status)}15`, color: statusColor(d.status) }}>
                {d.status === 'in-progress' ? '进行中' : d.status === 'approved' ? '已批准' : d.status === 'draft' ? '草稿' : d.status === 'completed' ? '已完成' : d.status}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: `${autoColor(d.automation_boundary)}15`, color: autoColor(d.automation_boundary) }}>
                {autoLabel(d.automation_boundary)}
              </span>
            </div>
            <div className="mt-2 line-clamp-2 text-[11px] leading-5 text-[#6b7c93]">{userFacingDemandText(d.problem_statement)}</div>
          </div>
        ))}
        {filtered.length === 0 ? (
          <div className="p-4">
            <AdminCrudEmptyState title="没有匹配的需求" description="调整左侧筛选条件后继续查看待处理需求。" />
          </div>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto bg-white px-6 py-5">
        {selected ? (
          <div className="space-y-4">
            <div className="flex items-start justify-between border-b border-[#dbe4f0] pb-5">
              <div>
                <div className="mb-2 text-xs font-medium text-[#6b7c93]">需求详情</div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono font-bold" style={{ color: priorityColor(selected.priority) }}>{selected.priority}</span>
                  <h3 className="text-base font-semibold text-[#10233f]">{selected.title}</h3>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: `${phaseColor(selected.phase)}15`, color: phaseColor(selected.phase) }}>
                    {phaseLabel(selected.phase)}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: `${statusColor(selected.status)}15`, color: statusColor(selected.status) }}>
                    {selected.status === 'in-progress' ? '进行中' : selected.status === 'approved' ? '已批准' : selected.status === 'draft' ? '草稿' : selected.status}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: `${autoColor(selected.automation_boundary)}15`, color: autoColor(selected.automation_boundary) }}>
                    {autoLabel(selected.automation_boundary)}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(0,217,255,0.08)] text-[#00D9FF]">
                    {flowLabel(selected.business_flow)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-1 rounded-xl border border-[#d5e0ee] px-3 py-1.5 text-xs text-[#5f6f86] transition-colors hover:border-[#0f6fff] hover:text-[#0f6fff]">
                  <Edit3 className="w-3 h-3" />编辑
                </button>
              </div>
            </div>

            <div className="rounded-[24px] border border-[#dbe4f0] bg-white p-5 shadow-[0_14px_30px_rgba(15,35,63,0.05)]">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-[#FFB800]" />
                <span className="text-sm font-medium text-[#355070]">问题描述</span>
              </div>
              <p className="text-sm leading-7 text-[#5f6f86]">{userFacingDemandText(selected.problem_statement)}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[24px] border border-[#dbe4f0] bg-white p-5 shadow-[0_14px_30px_rgba(15,35,63,0.05)]">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-[#00D9FF]" />
                  <span className="text-sm font-medium text-[#355070]">目标用户</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {selected.target_users.map((u, i) => (
                    <span key={i} className="text-xs px-2 py-1 rounded-lg bg-[rgba(0,217,255,0.08)] text-[#00D9FF]">{userFacingDemandText(u)}</span>
                  ))}
                </div>
              </div>
              <div className="rounded-[24px] border border-[#dbe4f0] bg-white p-5 shadow-[0_14px_30px_rgba(15,35,63,0.05)]">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-[#00FF88]" />
                  <span className="text-sm font-medium text-[#355070]">核心场景</span>
                </div>
                <div className="space-y-1">
                  {selected.core_scenarios.map((s, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-[#5f6f86]">
                      <span className="w-1 h-1 rounded-full bg-[#00FF88] shrink-0" />
                      {userFacingDemandText(s)}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-[#dbe4f0] bg-white p-5 shadow-[0_14px_30px_rgba(15,35,63,0.05)]">
              <div className="flex items-center gap-2 mb-2">
                <CheckSquare className="w-4 h-4 text-[#00FF88]" />
                <span className="text-sm font-medium text-[#355070]">验收标准</span>
              </div>
              <div className="space-y-1.5">
                {selected.acceptance_criteria.map((c, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-[#5f6f86]">
                    <span className="text-[#00FF88] shrink-0 mt-0.5">✓</span>
                    <span>{userFacingDemandText(c)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[24px] border border-[#dbe4f0] bg-white p-5 shadow-[0_14px_30px_rgba(15,35,63,0.05)]">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[#00FF88] text-xs">✓ 做</span>
                  <span className="text-sm font-medium text-[#355070]">范围内</span>
                </div>
                <div className="space-y-1">
                  {selected.scope_in.map((s, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-[#5f6f86]">
                      <span className="w-1 h-1 rounded-full bg-[#00FF88] shrink-0" />{userFacingDemandText(s)}
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-[24px] border border-[#dbe4f0] bg-white p-5 shadow-[0_14px_30px_rgba(15,35,63,0.05)]">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[#FF3366] text-xs">✕ 不做</span>
                  <span className="text-sm font-medium text-[#355070]">范围外</span>
                </div>
                <div className="space-y-1">
                  {selected.scope_out.map((s, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-[#7a8aa0]">
                      <span className="w-1 h-1 rounded-full bg-[#FF3366] shrink-0" />{userFacingDemandText(s)}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {selected.dependencies.length > 0 && (
              <div className="rounded-[24px] border border-[#dbe4f0] bg-white p-5 shadow-[0_14px_30px_rgba(15,35,63,0.05)]">
                <div className="flex items-center gap-2 mb-2">
                  <Link2 className="w-4 h-4 text-[#FFB800]" />
                  <span className="text-sm font-medium text-[#355070]">依赖项</span>
                </div>
                <div className="space-y-2">
                  {selected.dependencies.map((dep, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-2xl border border-[#e7edf6] bg-[#fbfdff] p-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-[#355070]">{userFacingDemandText(dep.dep_system)} <span className="text-[#8ea0b8]">· {userFacingDemandText(dep.dep_role)}</span></div>
                        <div className="text-[11px] text-[#7a8aa0] truncate">{userFacingDemandText(dep.dep_action)}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] text-[#8ea0b8]">{dep.owner}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${dep.status === 'ready' ? 'bg-[#00FF88]/10 text-[#00FF88]' : 'bg-[#FFB800]/10 text-[#FFB800]'}`}>
                          {dep.status === 'ready' ? '就绪' : '待确认'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-[24px] border border-[#dbe4f0] bg-white p-5 shadow-[0_14px_30px_rgba(15,35,63,0.05)]">
              <div className="flex items-center gap-2 mb-2">
                <ClipboardList className="w-4 h-4 text-[#7B61FF]" />
                <span className="text-sm font-medium text-[#355070]">结果物</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {selected.deliverables.map((d, i) => (
                  <span key={i} className="text-xs px-2.5 py-1 rounded-lg bg-[rgba(123,97,255,0.08)] text-[#7B61FF]">{userFacingDemandText(d)}</span>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-[24px] border border-[#dbe4f0] bg-white px-5 py-4 text-[11px] text-[#7a8aa0] shadow-[0_14px_30px_rgba(15,35,63,0.05)]">
              <span>提出人: {selected.proposer}</span>
              <span>负责人: {selected.owner}</span>
              <span>创建: <ClientTime value={selected.created_at} mode="date" /></span>
              <span>更新: <ClientTime value={selected.updated_at} mode="date" /></span>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center h-full">
            <div className="text-center">
              <ClipboardList className="mx-auto mb-3 h-10 w-10 text-[#b0bfd4]" />
              <div className="text-sm text-[#5f6f86]">选择左侧需求查看详情</div>
              <div className="mt-1 text-[11px] text-[#8ea0b8]">问题描述 / 验收标准 / 依赖项 / 结果物</div>
            </div>
          </div>
        )}
      </div>
    </div>
      )}
    </AdminCrudShell>
  );
}


export { DemandPoolTab };

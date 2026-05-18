'use client';

import { useState, useEffect, useCallback } from 'react';
import { useThemeColors } from '@/hooks/useTheme';
import { apiFetch } from '@/lib/api';
import type { McpSkill, McpSkillCategory } from '@/types';

const CATEGORY_LABELS: Record<McpSkillCategory, string> = {
  data: '数据', operation: '操作', monitor: '监控', analysis: '分析', integration: '集成', other: '其他',
};

export default function SkillManager() {
  const c = useThemeColors();
  const [skills, setSkills] = useState<McpSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'builtin' | 'custom'>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', description: '', endpoint_url: '', category: 'other' as McpSkillCategory, transport: 'streamable-http' as const, auth_type: 'none' as const });

  const loadSkills = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<McpSkill[]>('/api/xiaoqiao/skills');
      setSkills(data);
    } catch { /* demo mode fallback */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadSkills(); }, [loadSkills]);

  const handleInstall = async (id: string) => {
    try {
      await apiFetch<McpSkill>(`/api/xiaoqiao/skills/${id}/install`, { method: 'POST' });
      loadSkills();
    } catch { /* ignore */ }
  };

  const handleUninstall = async (id: string) => {
    try {
      await apiFetch<McpSkill>(`/api/xiaoqiao/skills/${id}/uninstall`, { method: 'POST' });
      loadSkills();
    } catch { /* ignore */ }
  };

  const handleAdd = async () => {
    if (!addForm.name || !addForm.endpoint_url) return;
    try {
      await apiFetch<McpSkill>('/api/xiaoqiao/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      });
      setAddForm({ name: '', description: '', endpoint_url: '', category: 'other', transport: 'streamable-http', auth_type: 'none' });
      setShowAddForm(false);
      loadSkills();
    } catch { /* ignore */ }
  };

  const filtered = skills.filter(s => filter === 'all' || s.source === filter);

  return (
    <div style={{ padding: 16, height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: c.textPrimary, margin: 0 }}>MCP 技能</h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          style={{ padding: '4px 12px', borderRadius: 6, border: `1px solid ${c.accentBorder}`, background: 'transparent', color: c.accent, fontSize: 13, cursor: 'pointer' }}
        >
          + 添加
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        {(['all', 'builtin', 'custom'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '3px 10px', borderRadius: 4, fontSize: 12, cursor: 'pointer', border: 'none',
              background: filter === f ? c.accentBg : 'transparent',
              color: filter === f ? c.accent : c.textMuted,
            }}
          >
            {f === 'all' ? '全部' : f === 'builtin' ? '内置' : '自定义'}
          </button>
        ))}
      </div>

      {/* Add form */}
      {showAddForm && (
        <div style={{ padding: 12, borderRadius: 8, border: `1px solid ${c.accentBorder}`, marginBottom: 12, background: c.bgContainer }}>
          <input
            placeholder="技能名称"
            value={addForm.name}
            onChange={e => setAddForm({ ...addForm, name: e.target.value })}
            style={{ width: '100%', padding: '6px 10px', borderRadius: 4, border: `1px solid ${c.borderFaint}`, background: c.inputBg, color: c.textPrimary, fontSize: 13, marginBottom: 8, outline: 'none' }}
          />
          <input
            placeholder="描述"
            value={addForm.description}
            onChange={e => setAddForm({ ...addForm, description: e.target.value })}
            style={{ width: '100%', padding: '6px 10px', borderRadius: 4, border: `1px solid ${c.borderFaint}`, background: c.inputBg, color: c.textPrimary, fontSize: 13, marginBottom: 8, outline: 'none' }}
          />
          <input
            placeholder="MCP 端点 URL"
            value={addForm.endpoint_url}
            onChange={e => setAddForm({ ...addForm, endpoint_url: e.target.value })}
            style={{ width: '100%', padding: '6px 10px', borderRadius: 4, border: `1px solid ${c.borderFaint}`, background: c.inputBg, color: c.textPrimary, fontSize: 13, marginBottom: 8, outline: 'none' }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleAdd} style={{ padding: '4px 16px', borderRadius: 4, border: 'none', background: c.accent, color: '#fff', fontSize: 12, cursor: 'pointer' }}>确认</button>
            <button onClick={() => setShowAddForm(false)} style={{ padding: '4px 16px', borderRadius: 4, border: `1px solid ${c.borderFaint}`, background: 'transparent', color: c.textMuted, fontSize: 12, cursor: 'pointer' }}>取消</button>
          </div>
        </div>
      )}

      {/* Skill list */}
      {loading ? (
        <div style={{ color: c.textMuted, fontSize: 13, textAlign: 'center', padding: 24 }}>加载中...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(skill => (
            <div
              key={skill.id}
              style={{
                padding: 12, borderRadius: 8, border: `1px solid ${skill.installed ? c.accentBorder : c.borderFaint}`,
                background: skill.installed ? c.accentBg : c.bgContainer,
                transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 18 }}>{skill.icon}</span>
                <span style={{ fontSize: 14, fontWeight: 500, color: c.textPrimary, flex: 1 }}>{skill.name}</span>
                <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: skill.source === 'builtin' ? c.accentBg : c.bgElevated, color: skill.source === 'builtin' ? c.accent : c.warning }}>
                  {skill.source === 'builtin' ? '内置' : '自定义'}
                </span>
                <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: c.bgElevated, color: c.textMuted }}>
                  {CATEGORY_LABELS[skill.category]}
                </span>
              </div>
              <p style={{ fontSize: 12, color: c.textMuted, margin: '4px 0', lineHeight: 1.5 }}>{skill.description}</p>
              {skill.use_cases.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                  {skill.use_cases.map((uc, i) => (
                    <span key={i} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: c.bgElevated, color: c.textSubtle }}>{uc}</span>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                {skill.installed ? (
                  <button
                    onClick={() => handleUninstall(skill.id)}
                    style={{ padding: '3px 10px', borderRadius: 4, border: `1px solid ${c.danger}`, background: 'transparent', color: c.danger, fontSize: 11, cursor: 'pointer' }}
                  >
                    卸载
                  </button>
                ) : (
                  <button
                    onClick={() => handleInstall(skill.id)}
                    style={{ padding: '3px 10px', borderRadius: 4, border: `1px solid ${c.accentBorder}`, background: c.accent, color: '#fff', fontSize: 11, cursor: 'pointer' }}
                  >
                    安装
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

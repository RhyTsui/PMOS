'use client';

import { useState, useEffect, useCallback } from 'react';
import { useThemeColors } from '@/hooks/useTheme';
import { apiFetch } from '@/lib/api';
import type { MemoryEntry, MemoryType, MemorySource } from '@/types';

const TYPE_LABELS: Record<MemoryType, { label: string; color: string }> = {
  preference: { label: '偏好', color: '#8B5CF6' },
  fact: { label: '事实', color: '#3B82F6' },
  context: { label: '上下文', color: '#10B981' },
  instruction: { label: '指令', color: '#F59E0B' },
  experience: { label: '经验', color: '#EF4444' },
};

const SOURCE_LABELS: Record<MemorySource, string> = {
  auto_extract: '自动提取',
  user_input: '手动输入',
  agent_summary: 'Agent总结',
  system_default: '系统默认',
};

export default function MemoryPanel() {
  const c = useThemeColors();
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ content: '', memory_type: 'fact' as MemoryType, keywords: '', importance: 3 });

  const loadMemories = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<MemoryEntry[]>('/api/xiaoqiao/memory');
      setMemories(data);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadMemories(); }, [loadMemories]);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) { loadMemories(); return; }
    setLoading(true);
    try {
      const data = await apiFetch<MemoryEntry[]>(`/api/xiaoqiao/memory/search?q=${encodeURIComponent(searchQuery)}`);
      setMemories(data);
    } catch { /* ignore */ }
    setLoading(false);
  }, [searchQuery, loadMemories]);

  const handleAdd = async () => {
    if (!addForm.content) return;
    try {
      await apiFetch<MemoryEntry>('/api/xiaoqiao/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: addForm.content,
          memory_type: addForm.memory_type,
          keywords: addForm.keywords.split(',').map(k => k.trim()).filter(Boolean),
          importance: addForm.importance,
          source: 'user_input',
        }),
      });
      setAddForm({ content: '', memory_type: 'fact', keywords: '', importance: 3 });
      setShowAddForm(false);
      loadMemories();
    } catch { /* ignore */ }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiFetch(`/api/xiaoqiao/memory/${id}`, { method: 'DELETE' });
      loadMemories();
    } catch { /* ignore */ }
  };

  const handleArchive = async (id: string) => {
    try {
      await apiFetch(`/api/xiaoqiao/memory/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'archive' }),
      });
      loadMemories();
    } catch { /* ignore */ }
  };

  const importanceDots = (n: number) => '●'.repeat(n) + '○'.repeat(5 - n);

  return (
    <div style={{ padding: 16, height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: c.textPrimary, margin: 0 }}>全局记忆</h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          style={{ padding: '4px 12px', borderRadius: 6, border: `1px solid ${c.accentBorder}`, background: 'transparent', color: c.accent, fontSize: 13, cursor: 'pointer' }}
        >
          + 记忆
        </button>
      </div>

      {/* Search */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <input
          placeholder="搜索记忆..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          style={{ flex: 1, padding: '6px 10px', borderRadius: 4, border: `1px solid ${c.borderFaint}`, background: c.inputBg, color: c.textPrimary, fontSize: 13, outline: 'none' }}
        />
        <button onClick={handleSearch} style={{ padding: '6px 12px', borderRadius: 4, border: 'none', background: c.accent, color: '#fff', fontSize: 12, cursor: 'pointer' }}>搜索</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {(Object.entries(TYPE_LABELS) as [MemoryType, { label: string; color: string }][]).map(([type, { label, color }]) => {
          const count = memories.filter(m => m.memory_type === type).length;
          return (
            <span key={type} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: `${color}20`, color, border: `1px solid ${color}30` }}>
              {label} {count}
            </span>
          );
        })}
      </div>

      {/* Add form */}
      {showAddForm && (
        <div style={{ padding: 12, borderRadius: 8, border: `1px solid ${c.accentBorder}`, marginBottom: 12, background: c.bgContainer }}>
          <textarea
            placeholder="记忆内容..."
            value={addForm.content}
            onChange={e => setAddForm({ ...addForm, content: e.target.value })}
            rows={3}
            style={{ width: '100%', padding: '6px 10px', borderRadius: 4, border: `1px solid ${c.borderFaint}`, background: c.inputBg, color: c.textPrimary, fontSize: 13, marginBottom: 8, outline: 'none', resize: 'vertical' }}
          />
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <select
              value={addForm.memory_type}
              onChange={e => setAddForm({ ...addForm, memory_type: e.target.value as MemoryType })}
              style={{ padding: '4px 8px', borderRadius: 4, border: `1px solid ${c.borderFaint}`, background: c.inputBg, color: c.textPrimary, fontSize: 12 }}
            >
              {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <input
              placeholder="关键词(逗号分隔)"
              value={addForm.keywords}
              onChange={e => setAddForm({ ...addForm, keywords: e.target.value })}
              style={{ flex: 1, padding: '4px 8px', borderRadius: 4, border: `1px solid ${c.borderFaint}`, background: c.inputBg, color: c.textPrimary, fontSize: 12, outline: 'none' }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 11, color: c.textMuted }}>重要性:</span>
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => setAddForm({ ...addForm, importance: n })} style={{ padding: '2px 6px', borderRadius: 3, border: 'none', background: addForm.importance >= n ? c.accent : c.bgElevated, color: addForm.importance >= n ? '#fff' : c.textMuted, fontSize: 10, cursor: 'pointer' }}>{n}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={handleAdd} style={{ padding: '4px 14px', borderRadius: 4, border: 'none', background: c.accent, color: '#fff', fontSize: 12, cursor: 'pointer' }}>保存</button>
              <button onClick={() => setShowAddForm(false)} style={{ padding: '4px 14px', borderRadius: 4, border: `1px solid ${c.borderFaint}`, background: 'transparent', color: c.textMuted, fontSize: 12, cursor: 'pointer' }}>取消</button>
            </div>
          </div>
        </div>
      )}

      {/* Memory list */}
      {loading ? (
        <div style={{ color: c.textMuted, fontSize: 13, textAlign: 'center', padding: 24 }}>加载中...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {memories.map(mem => {
            const typeInfo = TYPE_LABELS[mem.memory_type];
            return (
              <div key={mem.id} style={{ padding: 10, borderRadius: 6, border: `1px solid ${c.borderFaint}`, background: c.bgContainer, transition: 'all 0.2s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: `${typeInfo.color}20`, color: typeInfo.color }}>{typeInfo.label}</span>
                  <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 3, background: c.bgElevated, color: c.textMuted }}>{SOURCE_LABELS[mem.source]}</span>
                  <span style={{ fontSize: 9, color: c.textMuted, marginLeft: 'auto' }} title="重要性">{importanceDots(mem.importance)}</span>
                </div>
                <p style={{ fontSize: 13, color: c.textPrimary, margin: '4px 0', lineHeight: 1.5 }}>{mem.content}</p>
                {mem.keywords.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                    {mem.keywords.map((kw, i) => (
                      <span key={i} style={{ fontSize: 10, padding: '1px 5px', borderRadius: 3, background: c.bgElevated, color: c.textSubtle }}>#{kw}</span>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                  <span style={{ fontSize: 10, color: c.textMuted }}>引用 {mem.access_count} 次</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => handleArchive(mem.id)} style={{ padding: '1px 6px', borderRadius: 3, border: 'none', background: 'transparent', color: c.textMuted, fontSize: 10, cursor: 'pointer' }}>归档</button>
                    <button onClick={() => handleDelete(mem.id)} style={{ padding: '1px 6px', borderRadius: 3, border: 'none', background: 'transparent', color: c.danger, fontSize: 10, cursor: 'pointer' }}>删除</button>
                  </div>
                </div>
              </div>
            );
          })}
          {memories.length === 0 && <div style={{ color: c.textMuted, fontSize: 13, textAlign: 'center', padding: 24 }}>暂无记忆</div>}
        </div>
      )}
    </div>
  );
}

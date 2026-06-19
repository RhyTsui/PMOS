'use client';

import { useEffect, useState } from 'react';
import { Plus, X, Trash2, ToggleRight, ToggleLeft, MessageSquare, Save } from 'lucide-react';
import { CODE_STYLES, type CodeStyle } from '@/components/ui/FancyCodeBlock';
import {
  DEFAULT_CHAT_DISPLAY_CONFIG,
  type ChatDisplayConfig,
  type ChatStarterItemConfig,
  type ChatStarterQuestionConfig,
} from '@/types/chat-display';
import { THINKING_LENGTH_OPTIONS, useChatSettings } from '@/hooks/useChatSettings';
import {
  AdminCrudHeader,
  AdminCrudListSkeleton,
  AdminCrudShell,
} from './AdminCrudScaffold';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

function ChatDisplaySettingsTab() {
  const { settings, updateSetting, loaded } = useChatSettings();
  const [displayConfig, setDisplayConfig] = useState<ChatDisplayConfig | null>(null);
  const [displayLoaded, setDisplayLoaded] = useState(false);
  const [displaySaving, setDisplaySaving] = useState(false);
  const [displayMessage, setDisplayMessage] = useState('');
  const intentOptions: Array<{ value: ChatStarterItemConfig['agent']; label: string }> = [
    { value: 'delivery', label: '投放交付' },
    { value: 'diagnosis', label: '异常排查' },
    { value: 'prediction', label: '数据分析 / 报告生成' },
    { value: 'help', label: '指标解释 / 使用帮助' },
    { value: 'material', label: '素材 / 创意' },
    { value: 'demand', label: '业务协同 / 需求跟进' },
    { value: 'debugging', label: '联调排查' },
    { value: 'hub', label: '自动判断' },
  ];

  useEffect(() => {
    let cancelled = false;
    fetch('/api/xiaoqiao/admin/chat-display-config', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((config: ChatDisplayConfig | null) => {
        if (!cancelled) {
          setDisplayConfig(config || DEFAULT_CHAT_DISPLAY_CONFIG);
          setDisplayLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDisplayConfig(DEFAULT_CHAT_DISPLAY_CONFIG);
          setDisplayLoaded(true);
          setDisplayMessage('读取失败，请稍后重试');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const updateDisplayConfig = (patch: Partial<ChatDisplayConfig>) => {
    setDisplayConfig((prev) => (prev ? { ...prev, ...patch } : prev));
    setDisplayMessage('');
  };

  const updateWelcomeText = (index: number, value: string) => {
    setDisplayConfig((prev) => {
      if (!prev) return prev;
      const pool = [...(prev.welcomeTexts?.length ? prev.welcomeTexts : [prev.welcomeText])];
      pool[index] = value;
      return { ...prev, welcomeTexts: pool, welcomeText: pool[0] || '' };
    });
    setDisplayMessage('');
  };

  const addWelcomeText = () => {
    setDisplayConfig((prev) => {
      if (!prev) return prev;
      const pool = [...(prev.welcomeTexts?.length ? prev.welcomeTexts : [prev.welcomeText])];
      if (pool.length >= 50) return prev;
      pool.push('');
      return { ...prev, welcomeTexts: pool };
    });
    setDisplayMessage('');
  };

  const removeWelcomeText = (index: number) => {
    setDisplayConfig((prev) => {
      if (!prev) return prev;
      const pool = [...(prev.welcomeTexts?.length ? prev.welcomeTexts : [prev.welcomeText])];
      if (pool.length <= 1) return prev;
      pool.splice(index, 1);
      return { ...prev, welcomeTexts: pool, welcomeText: pool[0] || '' };
    });
    setDisplayMessage('');
  };

  const currentWelcomeTexts = displayConfig?.welcomeTexts?.length
    ? displayConfig.welcomeTexts
    : displayConfig?.welcomeText
      ? [displayConfig.welcomeText]
      : [];

  const updateStarter = (id: string, patch: Partial<ChatStarterItemConfig>) => {
    setDisplayConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        starters: prev.starters.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      };
    });
    setDisplayMessage('');
  };

  const updateStarterQuestion = (
    starterId: string,
    questionId: string,
    patch: Partial<ChatStarterQuestionConfig>,
  ) => {
    setDisplayConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        starters: prev.starters.map((item) => (
          item.id === starterId
            ? {
              ...item,
              children: (item.children || []).map((child) => (
                child.id === questionId ? { ...child, ...patch } : child
              )),
            }
            : item
        )),
      };
    });
    setDisplayMessage('');
  };

  const addStarter = () => {
    setDisplayConfig((prev) => {
      if (!prev) return prev;
      const sortOrder = (prev.starters.length + 1) * 10;
      return {
        ...prev,
        starters: [
          ...prev.starters,
          {
            id: `starter-${Date.now()}`,
            label: '新入口',
            description: '补充这个入口能帮用户做什么',
            prompt: '请在这里填写完整提问模板',
            agent: 'help',
            openPanel: false,
            enabled: true,
            sortOrder,
            children: [
              {
                id: `starter-question-${Date.now()}`,
                label: '新的快捷问题',
                prompt: '请在这里填写完整提问模板',
                agent: 'help',
                openPanel: false,
                enabled: true,
                sortOrder: 10,
              },
            ],
          },
        ],
      };
    });
    setDisplayMessage('');
  };

  const addStarterQuestion = (starterId: string) => {
    setDisplayConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        starters: prev.starters.map((item) => {
          if (item.id !== starterId) return item;
          const children = item.children || [];
          const sortOrder = (children.length + 1) * 10;
          return {
            ...item,
            children: [
              ...children,
              {
                id: `starter-question-${Date.now()}`,
                label: '新的快捷问题',
                prompt: '请在这里填写完整提问模板',
                agent: item.agent,
                openPanel: item.openPanel,
                enabled: true,
                sortOrder,
              },
            ],
          };
        }),
      };
    });
    setDisplayMessage('');
  };

  const deleteStarterQuestion = (starterId: string, questionId: string) => {
    setDisplayConfig((prev) => (prev ? {
      ...prev,
      starters: prev.starters.map((item) => (
        item.id === starterId
          ? { ...item, children: (item.children || []).filter((child) => child.id !== questionId) }
          : item
      )),
    } : prev));
    setDisplayMessage('');
  };

  const deleteStarter = (id: string) => {
    setDisplayConfig((prev) => (prev ? { ...prev, starters: prev.starters.filter((item) => item.id !== id) } : prev));
    setDisplayMessage('');
  };

  const saveDisplayConfig = async () => {
    if (!displayConfig) return;
    setDisplaySaving(true);
    setDisplayMessage('');
    try {
      const response = await fetch('/api/xiaoqiao/admin/chat-display-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(displayConfig),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.config) {
        throw new Error('保存失败');
      }
      setDisplayConfig(payload.config);
      setDisplayMessage('已保存');
    } catch {
      setDisplayMessage('保存失败，请稍后重试');
    } finally {
      setDisplaySaving(false);
    }
  };

  const toggleItems = [
    {
      key: 'autoCollapseThinking' as const,
      title: '思维链默认收起',
      desc: '会话中保留思维链入口，默认折叠，用户需要时再展开查看。',
      value: settings.autoCollapseThinking,
    },
    {
      key: 'showSystemPrompt' as const,
      title: '展示系统提示',
      desc: '仅用于内部排查，默认不在普通会话中展示系统提示内容。',
      value: settings.showSystemPrompt,
    },
    {
      key: 'codeLineNumbers' as const,
      title: '代码行号',
      desc: '回答中出现代码块时展示行号，方便定位和复核。',
      value: settings.codeLineNumbers,
    },
  ];

  const saveState: SaveState = displaySaving
    ? 'saving'
    : displayMessage.includes('失败')
      ? 'error'
      : displayMessage.includes('已保存')
        ? 'saved'
        : 'idle';

  if (!loaded || !displayLoaded || !displayConfig) {
    return (
      <AdminCrudShell>
        <AdminCrudHeader
          title="会话展示设置"
          description="统一配置工作台中的欢迎语、快捷入口、思考过程和代码展示方式。"
        />
        <AdminCrudListSkeleton rows={4} />
      </AdminCrudShell>
    );
  }

  return (
    <AdminCrudShell>
      <AdminCrudHeader
        title="会话展示设置"
        description="统一配置工作台中的欢迎语、快捷入口、思考过程和代码展示方式。"
        saveState={saveState}
        saveText={displayMessage || undefined}
        actions={(
          <button
            type="button"
            onClick={saveDisplayConfig}
            disabled={displaySaving}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#0f6fff] px-3 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#0d5ed9] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save className="h-3.5 w-3.5" />
            保存配置
          </button>
        )}
      />
      <div className="mx-auto grid max-w-5xl gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-2xl border border-[#dbe4f0] bg-white shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
          <div className="grid gap-3 p-5">
            <div className="grid gap-3 border-b border-[#edf2f8] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-[#10233f]">首屏欢迎语和快捷入口</div>
                  <div className="mt-1 text-xs leading-6 text-[#6b7c93]">用于配置用户进入工作台后第一眼看到的文案和任务模板。</div>
                </div>
              </div>

              <div className="grid gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#355070]">
                    欢迎语池 ({currentWelcomeTexts.length}/50)
                  </span>
                  <button
                    type="button"
                    onClick={addWelcomeText}
                    disabled={currentWelcomeTexts.length >= 50}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#dbe4f0] px-3 text-xs font-semibold text-[#0f6fff] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    新增欢迎语
                  </button>
                </div>
                {currentWelcomeTexts.map((text, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="w-6 shrink-0 text-xs font-medium text-[#6b7c93]">{index + 1}.</span>
                    <input
                      value={text}
                      onChange={(event) => updateWelcomeText(index, event.target.value)}
                      placeholder="输入欢迎语，用户每次进入会随机展示一条"
                      className="h-10 flex-1 rounded-lg border border-[#dbe4f0] bg-white px-3 text-sm text-[#10233f] outline-none focus:border-[#0f6fff]"
                    />
                    <button
                      type="button"
                      onClick={() => removeWelcomeText(index)}
                      disabled={currentWelcomeTexts.length <= 1}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#6b7c93] transition-colors hover:bg-[#fee2e2] hover:text-[#dc2626] disabled:cursor-not-allowed disabled:opacity-30"
                      title="删除此条"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <p className="text-xs text-[#6b7c93]">用户每次进入工作台时，会从欢迎语池中随机展示一条。建议配置 3–10 条不同风格的欢迎语。</p>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="grid gap-1.5">
                    <span className="text-xs font-semibold text-[#355070]">快捷示例标题</span>
                    <input
                      value={displayConfig.quickTitle}
                      onChange={(event) => updateDisplayConfig({ quickTitle: event.target.value })}
                      className="h-10 rounded-lg border border-[#dbe4f0] bg-white px-3 text-sm text-[#10233f] outline-none focus:border-[#0f6fff]"
                    />
                  </label>
                  <label className="grid gap-1.5">
                    <span className="text-xs font-semibold text-[#355070]">任务标题</span>
                    <input
                      value={displayConfig.taskPanelTitle}
                      onChange={(event) => updateDisplayConfig({ taskPanelTitle: event.target.value })}
                      className="h-10 rounded-lg border border-[#dbe4f0] bg-white px-3 text-sm text-[#10233f] outline-none focus:border-[#0f6fff]"
                    />
                  </label>
                </div>
              </div>

              <div className="grid gap-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-[#355070]">快捷入口和问题</div>
                  <button
                    type="button"
                    onClick={addStarter}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#dbe4f0] px-3 text-xs font-semibold text-[#0f6fff]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    新增入口
                  </button>
                </div>

                {displayConfig.starters.map((item) => (
                  <div key={item.id} className="grid gap-3 rounded-xl border border-[#e2eaf5] bg-[#fafcff] p-3">
                    <div className="grid gap-2 md:grid-cols-[128px_minmax(0,1fr)_80px]">
                      <input
                        value={item.label}
                        onChange={(event) => updateStarter(item.id, { label: event.target.value })}
                        className="h-9 rounded-lg border border-[#dbe4f0] bg-white px-3 text-xs text-[#10233f] outline-none focus:border-[#0f6fff]"
                        placeholder="一级入口"
                      />
                      <select
                        value={item.agent}
                        onChange={(event) => updateStarter(item.id, { agent: event.target.value as ChatStarterItemConfig['agent'] })}
                        className="h-9 rounded-lg border border-[#dbe4f0] bg-white px-2 text-xs text-[#10233f] outline-none focus:border-[#0f6fff]"
                      >
                        {intentOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={item.sortOrder}
                        onChange={(event) => updateStarter(item.id, { sortOrder: Number(event.target.value) || 0 })}
                        className="h-9 rounded-lg border border-[#dbe4f0] bg-white px-2 text-xs text-[#10233f] outline-none focus:border-[#0f6fff]"
                        placeholder="排序"
                      />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateStarter(item.id, { enabled: !item.enabled })}
                          className={`inline-flex h-7 items-center gap-1.5 rounded-lg px-2 text-[11px] font-semibold ${
                            item.enabled ? 'bg-[#eaf3ff] text-[#0f6fff]' : 'bg-[#eef2f7] text-[#6b7c93]'
                          }`}
                        >
                          {item.enabled ? '已展示' : '已隐藏'}
                        </button>
                        <button
                          type="button"
                          onClick={() => updateStarter(item.id, { openPanel: !item.openPanel })}
                          className={`inline-flex h-7 items-center gap-1.5 rounded-lg px-2 text-[11px] font-semibold ${
                            item.openPanel ? 'bg-[#eaf3ff] text-[#0f6fff]' : 'bg-[#eef2f7] text-[#6b7c93]'
                          }`}
                        >
                          {item.openPanel ? '支持右侧任务' : '不打开右侧任务'}
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteStarter(item.id)}
                        className="inline-flex h-7 items-center gap-1.5 rounded-lg px-2 text-[11px] font-semibold text-[#8a98aa] hover:bg-[#eef2f7]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        删除
                      </button>
                    </div>
                    <div className="grid gap-2 rounded-lg border border-[#edf2f8] bg-white p-2">
                      <div className="flex items-center justify-between">
                        <div className="text-[11px] font-semibold text-[#6b7c93]">二级快捷问题</div>
                        <button
                          type="button"
                          onClick={() => addStarterQuestion(item.id)}
                          className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-[#dbe4f0] px-2 text-[11px] font-semibold text-[#0f6fff]"
                        >
                          <Plus className="h-3 w-3" />
                          新增问题
                        </button>
                      </div>
                      {(item.children || []).map((child) => (
                        <div key={child.id} className="grid gap-2 rounded-lg bg-[#f8fbff] p-2">
                          <div className="grid gap-2 md:grid-cols-[140px_minmax(0,1fr)_140px_76px]">
                            <input
                              value={child.label}
                              onChange={(event) => updateStarterQuestion(item.id, child.id, { label: event.target.value })}
                              className="h-8 rounded-lg border border-[#dbe4f0] bg-white px-2 text-xs text-[#10233f] outline-none focus:border-[#0f6fff]"
                              placeholder="问题名称"
                            />
                            <input
                              value={child.prompt}
                              onChange={(event) => updateStarterQuestion(item.id, child.id, { prompt: event.target.value })}
                              className="h-8 rounded-lg border border-[#dbe4f0] bg-white px-2 text-xs text-[#10233f] outline-none focus:border-[#0f6fff]"
                              placeholder="完整提问模板"
                            />
                            <select
                              value={child.agent}
                              onChange={(event) => updateStarterQuestion(item.id, child.id, { agent: event.target.value as ChatStarterQuestionConfig['agent'] })}
                              className="h-8 rounded-lg border border-[#dbe4f0] bg-white px-2 text-xs text-[#10233f] outline-none focus:border-[#0f6fff]"
                            >
                              {intentOptions.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                              ))}
                            </select>
                            <input
                              type="number"
                              value={child.sortOrder}
                              onChange={(event) => updateStarterQuestion(item.id, child.id, { sortOrder: Number(event.target.value) || 0 })}
                              className="h-8 rounded-lg border border-[#dbe4f0] bg-white px-2 text-xs text-[#10233f] outline-none focus:border-[#0f6fff]"
                              placeholder="排序"
                            />
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => updateStarterQuestion(item.id, child.id, { enabled: !child.enabled })}
                                className={`inline-flex h-7 items-center rounded-lg px-2 text-[11px] font-semibold ${
                                  child.enabled ? 'bg-[#eaf3ff] text-[#0f6fff]' : 'bg-[#eef2f7] text-[#6b7c93]'
                                }`}
                              >
                                {child.enabled ? '已展示' : '已隐藏'}
                              </button>
                              <button
                                type="button"
                                onClick={() => updateStarterQuestion(item.id, child.id, { openPanel: !child.openPanel })}
                                className={`inline-flex h-7 items-center rounded-lg px-2 text-[11px] font-semibold ${
                                  child.openPanel ? 'bg-[#eaf3ff] text-[#0f6fff]' : 'bg-[#eef2f7] text-[#6b7c93]'
                                }`}
                              >
                                {child.openPanel ? '支持右侧任务' : '不打开右侧任务'}
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => deleteStarterQuestion(item.id, child.id)}
                              className="inline-flex h-7 items-center gap-1.5 rounded-lg px-2 text-[11px] font-semibold text-[#8a98aa] hover:bg-[#eef2f7]"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              删除问题
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {displayMessage && (
                <div className="text-xs text-[#6b7c93]">{displayMessage}</div>
              )}
            </div>

            {toggleItems.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => updateSetting(item.key, !item.value)}
                className="grid gap-3 border-b border-[#edf2f8] p-4 text-left transition-colors hover:bg-[#fafcff] md:grid-cols-[minmax(0,1fr)_96px]"
              >
                <span>
                  <span className="block text-sm font-semibold text-[#10233f]">{item.title}</span>
                  <span className="mt-1 block text-xs leading-6 text-[#6b7c93]">{item.desc}</span>
                </span>
                <span className={`inline-flex h-8 items-center justify-center gap-1.5 text-xs font-semibold ${item.value ? 'text-[#0f6fff]' : 'text-[#6b7c93]'}`}>
                  {item.value ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                  {item.value ? '已开启' : '已关闭'}
                </span>
              </button>
            ))}

            <div className="border-b border-[#edf2f8] p-4">
              <div className="text-sm font-semibold text-[#10233f]">思维链展示长度</div>
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                {(Object.entries(THINKING_LENGTH_OPTIONS) as Array<[keyof typeof THINKING_LENGTH_OPTIONS, { label: string; desc: string }]>).map(([key, option]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => updateSetting('thinkingLength', key)}
                    className={`border-b p-3 text-left transition-colors ${
                      settings.thinkingLength === key
                        ? 'border-[#8ec5ff] text-[#0f6fff]'
                        : 'border-[#e2eaf5] text-[#355070] hover:bg-[#fafcff]'
                    }`}
                  >
                    <span className="block text-xs font-semibold">{option.label}</span>
                    <span className="mt-1 block text-[11px] leading-5 text-[#6b7c93]">{option.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <label className="grid gap-2 border-b border-[#edf2f8] p-4">
              <span className="text-sm font-semibold text-[#10233f]">长文本转文件阈值</span>
              <span className="text-xs leading-6 text-[#6b7c93]">输入内容超过该长度时，优先按资料处理，减少对话区被长文本占满。</span>
              <input
                type="number"
                min={500}
                step={100}
                value={settings.longTextThreshold}
                onChange={(event) => updateSetting('longTextThreshold', Number(event.target.value) || 2000)}
                className="h-10 rounded-lg border border-[#dbe4f0] bg-white px-3 text-sm text-[#10233f] outline-none focus:border-[#0f6fff]"
              />
            </label>

            <label className="grid gap-2 border-b border-[#edf2f8] p-4">
              <span className="text-sm font-semibold text-[#10233f]">代码块样式</span>
              <span className="text-xs leading-6 text-[#6b7c93]">影响回答中代码、配置片段和排查脚本的展示样式。</span>
              <select
                value={settings.codeStyle}
                onChange={(event) => updateSetting('codeStyle', event.target.value as CodeStyle)}
                className="h-10 rounded-lg border border-[#dbe4f0] bg-white px-3 text-sm text-[#10233f] outline-none focus:border-[#0f6fff]"
              >
                {(Object.keys(CODE_STYLES) as CodeStyle[]).map((style) => (
                  <option key={style} value={style}>{style}</option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <aside className="rounded-2xl border border-[#dbe4f0] bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef7ff] text-[#0f6fff]">
            <MessageSquare className="h-5 w-5" />
          </div>
          <h3 className="mt-4 text-sm font-semibold text-[#10233f]">当前生效范围</h3>
          <p className="mt-2 text-xs leading-6 text-[#6b7c93]">
            设置保存在当前浏览器，立即影响工作台消息展示。服务端配置仍在对应配置页中管理。
          </p>
        </aside>
      </div>
    </AdminCrudShell>
  );
}


export { ChatDisplaySettingsTab };

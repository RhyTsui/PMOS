'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import Link from 'next/link';
import { Sender } from '@ant-design/x';
import {
  Alert,
  Avatar,
  Button,
  Empty,
  Space,
  Tag,
  Typography,
  Upload,
  message as antdMessage,
} from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import { RobotOutlined, UserOutlined } from '@ant-design/icons';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileSpreadsheet,
  ImageUp,
  Link2,
  Mic,
  MicOff,
  PanelRightOpen,
  Send,
  Share2,
  Sparkles,
  Upload as UploadIcon,
} from 'lucide-react';
import { xiaoqiaoApi } from '@/lib/api';
import { useSpeech } from '@/hooks/useSpeech';
import type { ReportDraft, ReportTemplate } from '@/types';

const { Title, Paragraph, Text } = Typography;

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

interface ReportRequirementAnalysis {
  summary: string;
  suggestedTemplateId?: string;
  suggestedTemplateName?: string;
  suggestedDateText: string;
  recognizedMetrics: string[];
  unclearMetrics: string[];
  unimplementedMetrics: string[];
  nextActions: string[];
  intakeMode: 'chat' | 'image' | 'file' | 'manual';
  shouldGenerateDraft: boolean;
  shouldExportToXiaoshan: boolean;
  shouldCreateShareLink: boolean;
  shouldCreateScreenshot: boolean;
}

interface ReportSessionResult {
  assistantMessage: string;
  analysis: ReportRequirementAnalysis;
  draft?: ReportDraft;
  metricCatalog: string[];
  missingClarifications: string[];
  actionHints: string[];
  shareLink?: string;
  screenshotHint?: string;
}

const QUICK_PROMPTS = [
  {
    key: 'overview',
    label: '经营总览',
    description: '按昨天的经营总览模板，汇总消耗、现金消耗、转化和 ROI，并给出异常解读。',
  },
  {
    key: 'channel',
    label: '渠道对比',
    description: '按媒体对比近 7 天消耗、转化成本和 ROI，并给出预算调整建议。',
  },
  {
    key: 'budget',
    label: '预算预警',
    description: '按项目检查预算进度和现金消耗，标记需要人工复核的高风险项。',
  },
  {
    key: 'image',
    label: '截图解析',
    description: '先识别截图里的维度、指标和时间范围，再整理成可确认的报表需求。',
  },
];

const STARTER_LANES = [
  '需求整理',
  '指标确认',
  '模板推荐',
  '草稿生成',
  '人工复核',
  '导出前检查',
];

const shellStyle: CSSProperties = {
  border: '1px solid rgba(16,35,63,0.08)',
  borderRadius: 24,
  background: 'rgba(255,255,255,0.9)',
  boxShadow: '0 20px 50px rgba(15,35,63,0.08)',
  backdropFilter: 'blur(16px)',
  overflow: 'hidden',
};

function Section({
  title,
  extra,
  children,
}: {
  title: string;
  extra?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section style={{ padding: 16, borderBottom: '1px solid rgba(16,35,63,0.08)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <Text strong style={{ color: '#10233f', fontSize: 13 }}>{title}</Text>
        {extra}
      </div>
      {children}
    </section>
  );
}

function InlinePanel({
  title,
  children,
  tone = 'default',
}: {
  title: string;
  children: ReactNode;
  tone?: 'default' | 'accent' | 'warn';
}) {
  const style: CSSProperties = {
    borderRadius: 18,
    padding: '12px 14px',
    border: '1px solid rgba(16,35,63,0.08)',
    background: 'rgba(248,250,252,0.94)',
  };

  if (tone === 'accent') {
    style.border = '1px solid rgba(64,104,255,0.18)';
    style.background = 'rgba(64,104,255,0.06)';
  }

  if (tone === 'warn') {
    style.border = '1px solid rgba(214,132,56,0.22)';
    style.background = 'rgba(214,132,56,0.06)';
  }

  return (
    <div style={style}>
      <div style={{ marginBottom: 8, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#5f6f86', fontWeight: 600 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function buildProgress(analysis: ReportRequirementAnalysis | null, draft: ReportDraft | null) {
  return [
    {
      title: '需求整理',
      done: Boolean(analysis),
      detail: analysis
        ? `已按${analysis.intakeMode === 'image' ? '截图' : analysis.intakeMode === 'file' ? '文件' : analysis.intakeMode === 'manual' ? '手动配置' : '对话'}整理需求`
        : '等待输入',
    },
    {
      title: '指标确认',
      done: Boolean(analysis && !analysis.unclearMetrics.length),
      detail: analysis ? (analysis.unclearMetrics.length || analysis.unimplementedMetrics.length ? '仍有待确认项' : '可直接继续生成') : '等待识别',
    },
    {
      title: '草稿生成',
      done: Boolean(draft),
      detail: draft ? draft.templateName : '尚未生成',
    },
    {
      title: '人工复核',
      done: Boolean(draft && (draft.status === 'reviewed' || draft.status === 'exported')),
      detail: draft?.status === 'exported' ? '已导出' : draft?.status === 'reviewed' ? '已复核' : '待复核',
    },
  ];
}

function getDraftStatusText(status?: string) {
  if (status === 'reviewed') return '已复核';
  if (status === 'exported') return '已导出';
  return '待复核';
}

function getIntakeModeText(mode?: ReportRequirementAnalysis['intakeMode']) {
  if (mode === 'image') return '截图解析';
  if (mode === 'file') return '文件导入';
  if (mode === 'manual') return '手动指定';
  return '对话描述';
}

export default function ReportsPage() {
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [drafts, setDrafts] = useState<ReportDraft[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: '这里是自动报表服务。你可以直接描述报表需求，也可以上传截图或文件。我会在当前会话里完成需求整理、指标确认、模板推荐、草稿生成、人工复核提醒，以及导出前检查。',
    },
  ]);
  const [analysis, setAnalysis] = useState<ReportRequirementAnalysis | null>(null);
  const [metricCatalog, setMetricCatalog] = useState<string[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedDraftId, setSelectedDraftId] = useState('');
  const [reportDate, setReportDate] = useState(new Date().toISOString().slice(0, 10));
  const [inputValue, setInputValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pageMessage, setPageMessage] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [screenshotHint, setScreenshotHint] = useState('');
  const [uploads, setUploads] = useState<UploadFile[]>([]);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const { listening, recognitionSupported, startListening, stopListening } = useSpeech();

  useEffect(() => {
    void (async () => {
      try {
        const [templateList, draftList] = await Promise.all([
          xiaoqiaoApi.getReportTemplates(),
          xiaoqiaoApi.getReportDrafts(),
        ]);
        setTemplates(templateList);
        setDrafts(draftList);
        if (templateList[0]) setSelectedTemplateId(templateList[0].id);
        if (draftList[0]) setSelectedDraftId(draftList[0].id);
      } catch {
        setPageMessage('自动报表配置加载失败，请稍后重试。');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const selectedDraft = useMemo(
    () => drafts.find((item) => item.id === selectedDraftId)
      || drafts.find((item) => item.templateId === selectedTemplateId)
      || null,
    [drafts, selectedDraftId, selectedTemplateId],
  );

  const progressItems = buildProgress(analysis, selectedDraft);
  const latestAssistantMessageId = useMemo(
    () => [...messages].reverse().find((item) => item.role === 'assistant')?.id ?? null,
    [messages],
  );
  const hasConversationActivity = messages.length > 1;

  const submitRequirement = async (payload?: string) => {
    const content = (payload ?? inputValue).trim();
    if (!content || submitting) return;

    const attachmentSummaries = uploads.map((item) => item.name).filter(Boolean);
    setSubmitting(true);
    setPageMessage('');
    setMessages((prev) => [...prev, { id: `user-${Date.now()}`, role: 'user', content }]);

    try {
      const result = await xiaoqiaoApi.runReportSession({
        message: content,
        attachmentSummaries,
        reportDate,
      }) as unknown as ReportSessionResult;

      setMessages((prev) => [...prev, { id: `assistant-${Date.now()}`, role: 'assistant', content: result.assistantMessage }]);
      setAnalysis(result.analysis);
      setMetricCatalog(result.metricCatalog);
      setShareLink(result.shareLink || '');
      setScreenshotHint(result.screenshotHint || '');
      if (result.analysis.suggestedTemplateId) setSelectedTemplateId(result.analysis.suggestedTemplateId);
      if (result.draft) {
        setDrafts((prev) => [result.draft!, ...prev.filter((item) => item.id !== result.draft!.id)]);
        setSelectedDraftId(result.draft.id);
      }
      setUploads([]);
      setInputValue('');
    } catch {
      setMessages((prev) => [...prev, {
        id: `assistant-error-${Date.now()}`,
        role: 'assistant',
        content: '这次自动报表链路执行失败了。我已经保留你的需求，请稍后重试，或者先把模板、时间范围和指标描述得更明确。',
      }]);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateDraft = async () => {
    if (!analysis?.suggestedTemplateId) {
      setPageMessage('当前还没有可生成的报表需求，请先在对话里确认模板和指标。');
      return;
    }
    await submitRequirement(`请基于当前需求生成 ${analysis.suggestedTemplateName || '报表'} 草稿，并补充人工复核说明。`);
  };

  const handleReview = async () => {
    if (!selectedDraft) return;
    try {
      const next = await xiaoqiaoApi.updateReportDraft(selectedDraft.id, {
        status: 'reviewed',
        reviewedAt: new Date().toISOString(),
      });
      setDrafts((prev) => prev.map((item) => (item.id === next.id ? next : item)));
      setSelectedDraftId(next.id);
      setPageMessage('报表草稿已标记为已复核，可以继续导出。');
    } catch {
      setPageMessage('更新复核状态失败。');
    }
  };

  const handleExport = async () => {
    if (!selectedDraft) return;
    try {
      const next = await xiaoqiaoApi.updateReportDraft(selectedDraft.id, {
        status: 'exported',
        exportedAt: new Date().toISOString(),
      });
      setDrafts((prev) => prev.map((item) => (item.id === next.id ? next : item)));
      setSelectedDraftId(next.id);
      setPageMessage('已标记为导出到小闪。');
    } catch {
      setPageMessage('更新导出状态失败。');
    }
  };

  const handleVoiceToggle = () => {
    if (!recognitionSupported) {
      antdMessage.warning('当前浏览器暂不支持语音转文字');
      return;
    }
    if (listening) {
      stopListening();
      return;
    }
    startListening({
      continuous: true,
      interimResults: true,
      onInterim: (text) => setInputValue(text),
      onFinal: (text) => setInputValue(text),
      onError: (text) => antdMessage.warning(text),
    });
  };

  return (
    <div style={{ minHeight: '100vh', padding: 12, background: 'radial-gradient(circle at top, #f3f7ff 0%, #edf2f8 38%, #eef1f5 100%)' }}>
      <div style={{ maxWidth: 1540, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={shellStyle}>
          <div style={{ padding: 16, borderBottom: '1px solid rgba(16,35,63,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: 12, minWidth: 0, flex: '1 1 420px' }}>
                <Link
                  href="/"
                  style={{
                    display: 'inline-flex',
                    width: 36,
                    height: 36,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 999,
                    border: '1px solid rgba(16,35,63,0.08)',
                    background: '#fff',
                    color: '#5f6f86',
                    flexShrink: 0,
                  }}
                >
                  <ArrowLeft size={16} />
                </Link>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <div style={{
                      width: 34,
                      height: 34,
                      display: 'grid',
                      placeItems: 'center',
                      borderRadius: 12,
                      background: 'linear-gradient(135deg,#2f6bff 0%,#78a3ff 100%)',
                      color: '#fff',
                      boxShadow: '0 10px 25px rgba(47,107,255,0.24)',
                    }}>
                      <FileSpreadsheet size={17} />
                    </div>
                    <Title level={4} style={{ margin: 0, color: '#10233f' }}>自动报表</Title>
                    <Tag color="blue" bordered={false}>对话工作区</Tag>
                    <Tag bordered={false} color={hasConversationActivity ? 'processing' : 'default'}>
                      {hasConversationActivity ? '会话进行中' : '等待输入'}
                    </Tag>
                  </div>
                  <Paragraph style={{ margin: '6px 0 0', color: '#5f6f86', maxWidth: 780 }}>
                    围绕一条会话主线完成需求整理、指标确认、模板推荐、草稿生成和导出前检查，不回退成后台卡片墙。
                  </Paragraph>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8, minWidth: 320, flex: '1 1 520px' }}>
                {progressItems.map((item) => (
                  <div key={item.title} style={{ border: '1px solid rgba(16,35,63,0.08)', background: 'rgba(247,249,252,0.9)', borderRadius: 18, padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: '#10233f' }}>
                      <CheckCircle2 size={14} color={item.done ? '#1a9b68' : '#90a0b5'} />
                      {item.title}
                    </div>
                    <div style={{ marginTop: 4, fontSize: 12, color: '#6b7c93' }}>{item.detail}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {pageMessage && (
            <div style={{ padding: 14, borderBottom: '1px solid rgba(16,35,63,0.08)' }}>
              <Alert type="info" showIcon message={pageMessage} style={{ borderRadius: 16 }} />
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '260px minmax(0,1fr) 340px', minHeight: 780 }}>
            <aside style={{ background: 'rgba(252,253,255,0.78)', borderRight: '1px solid rgba(16,35,63,0.08)' }}>
              <Section title="快捷起步" extra={<Tag bordered={false}>{QUICK_PROMPTS.length} 个</Tag>}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {QUICK_PROMPTS.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => void submitRequirement(item.description)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        borderRadius: 18,
                        padding: '12px 13px',
                        border: '1px solid rgba(16,35,63,0.08)',
                        background: '#fff',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#10233f' }}>{item.label}</div>
                      <div style={{ marginTop: 5, fontSize: 12, lineHeight: 1.7, color: '#6b7c93' }}>{item.description}</div>
                    </button>
                  ))}
                </div>
              </Section>

              <Section title="上传材料">
                <Upload multiple fileList={uploads} beforeUpload={() => false} onChange={({ fileList }) => setUploads(fileList)}>
                  <Button block icon={<UploadIcon size={15} />}>上传截图或文件</Button>
                </Upload>
                <div style={{ marginTop: 12, fontSize: 12, lineHeight: 1.7, color: '#6b7c93' }}>
                  支持截图需求、日报文件、投放清单和原始数据导入。
                </div>
                {uploads.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                    {uploads.slice(0, 4).map((item) => (
                      <Tag key={item.uid} color="blue">{item.name}</Tag>
                    ))}
                  </div>
                )}
              </Section>

              <Section title="模板上下文" extra={<Tag bordered={false}>{templates.length} 个</Tag>}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => setSelectedTemplateId(template.id)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        borderRadius: 18,
                        padding: '10px 12px',
                        border: selectedTemplateId === template.id ? '1px solid rgba(64,104,255,0.24)' : '1px solid rgba(16,35,63,0.08)',
                        background: selectedTemplateId === template.id ? 'rgba(64,104,255,0.06)' : 'transparent',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: '#10233f' }}>{template.name}</span>
                        <span style={{ fontSize: 11, color: '#7a8aa0' }}>{template.frequency}</span>
                      </div>
                      <div style={{ marginTop: 4, fontSize: 12, lineHeight: 1.6, color: '#6b7c93' }}>{template.description}</div>
                    </button>
                  ))}
                </div>
              </Section>
            </aside>

            <main style={{ background: 'rgba(250,251,253,0.82)', minWidth: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap', padding: 14, borderBottom: '1px solid rgba(16,35,63,0.08)' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#10233f' }}>会话主线</div>
                    <div style={{ marginTop: 4, fontSize: 12, color: '#6b7c93' }}>
                      需求整理、指标确认、草稿生成和复核动作都围绕当前对话推进。
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <Tag bordered={false} color="processing">{analysis?.suggestedTemplateName || '等待模板判断'}</Tag>
                    <Tag bordered={false} color={selectedDraft ? 'success' : 'default'}>
                      {selectedDraft ? `草稿 ${getDraftStatusText(selectedDraft.status)}` : '还没有草稿'}
                    </Tag>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 999, border: '1px solid rgba(16,35,63,0.08)', background: '#fff', color: '#355070', fontSize: 12 }}>
                      <CalendarDays size={14} />
                      <span>报表日期</span>
                      <input
                        type="date"
                        value={reportDate}
                        onChange={(event) => setReportDate(event.target.value)}
                        style={{ border: 'none', background: 'transparent', color: '#355070', outline: 'none' }}
                      />
                    </label>
                  </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
                  {!hasConversationActivity && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.3fr) minmax(280px, 0.7fr)', gap: 12, marginBottom: 16 }}>
                      <InlinePanel title="先说你的报表目标" tone="accent">
                        <div style={{ fontSize: 14, lineHeight: 1.8, color: '#355070' }}>
                          直接描述对象、时间范围、指标和用途即可，例如“按昨天经营总览模板，生成一版给早会复盘的报表草稿，重点看现金消耗、转化和 ROI”。
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                          {STARTER_LANES.map((item) => (
                            <Tag key={item} color="blue">{item}</Tag>
                          ))}
                        </div>
                      </InlinePanel>

                      <InlinePanel title="推荐起手式">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {QUICK_PROMPTS.slice(0, 3).map((item) => (
                            <button
                              key={item.key}
                              type="button"
                              onClick={() => void submitRequirement(item.description)}
                              style={{
                                width: '100%',
                                textAlign: 'left',
                                borderRadius: 16,
                                padding: '10px 12px',
                                border: '1px solid rgba(16,35,63,0.08)',
                                background: '#fff',
                                cursor: 'pointer',
                              }}
                            >
                              <div style={{ fontSize: 13, fontWeight: 600, color: '#10233f' }}>{item.label}</div>
                              <div style={{ marginTop: 4, fontSize: 12, lineHeight: 1.6, color: '#6b7c93' }}>{item.description}</div>
                            </button>
                          ))}
                        </div>
                      </InlinePanel>
                    </div>
                  )}

                  <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    {messages.map((item) => {
                      const showInspectorSnippet = item.role === 'assistant' && item.id === latestAssistantMessageId && analysis;

                      return (
                        <div key={item.id} style={{ display: 'flex', justifyContent: item.role === 'assistant' ? 'flex-start' : 'flex-end' }}>
                          <div style={{ display: 'flex', flexDirection: item.role === 'assistant' ? 'row' : 'row-reverse', gap: 12, maxWidth: '92%', minWidth: 0 }}>
                            <Avatar
                              size={34}
                              icon={item.role === 'assistant' ? <RobotOutlined /> : <UserOutlined />}
                              style={{ background: item.role === 'assistant' ? '#2f6bff' : '#1c2737', flexShrink: 0 }}
                            />
                            <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                              <div style={{
                                borderRadius: 22,
                                padding: '13px 15px',
                                fontSize: 14,
                                lineHeight: 1.9,
                                color: item.role === 'assistant' ? '#24384f' : '#fff',
                                background: item.role === 'assistant' ? '#fff' : 'linear-gradient(135deg,#2f6bff 0%,#5f8fff 100%)',
                                border: item.role === 'assistant' ? '1px solid rgba(16,35,63,0.08)' : 'none',
                                boxShadow: item.role === 'assistant' ? '0 12px 28px rgba(15,35,63,0.05)' : '0 12px 24px rgba(47,107,255,0.18)',
                              }}>
                                {item.content.split('\n').map((line, index) => (
                                  <div key={index}>{line || <span>&nbsp;</span>}</div>
                                ))}
                              </div>

                              {showInspectorSnippet && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                                  <InlinePanel title="系统判断" tone="accent">
                                    <div style={{ fontSize: 13, lineHeight: 1.7, color: '#355070' }}>{analysis.summary}</div>
                                  </InlinePanel>
                                  <InlinePanel title="已识别指标">
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                      {analysis.recognizedMetrics.length ? analysis.recognizedMetrics.map((metric) => (
                                        <Tag key={metric} color="green">{metric}</Tag>
                                      )) : <Text type="secondary">等待识别</Text>}
                                    </div>
                                  </InlinePanel>
                                  <InlinePanel title="下一步">
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, color: '#355070' }}>
                                      {(analysis.nextActions.length ? analysis.nextActions : ['确认指标范围', '生成草稿', '人工复核后导出']).slice(0, 3).map((nextAction) => (
                                        <div key={nextAction}>- {nextAction}</div>
                                      ))}
                                    </div>
                                  </InlinePanel>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={chatEndRef} />
                  </Space>
                </div>

                <div style={{ padding: 16, borderTop: '1px solid rgba(16,35,63,0.08)', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)' }}>
                  <Sender
                    value={inputValue}
                    onChange={setInputValue}
                    onSubmit={() => void submitRequirement()}
                    submitType="enter"
                    loading={submitting}
                    placeholder="输入报表需求，例如：按昨天经营总览模板，生成一版早会复盘草稿，重点看现金消耗、转化和 ROI。"
                    styles={{
                      content: {
                        backgroundColor: 'rgba(255,255,255,0.98)',
                        border: '1px solid rgba(16,35,63,0.10)',
                        borderRadius: 24,
                        padding: '10px 12px 0',
                        boxShadow: '0 16px 40px rgba(15,35,63,0.06)',
                      },
                      input: {
                        minHeight: 74,
                        maxHeight: 74,
                        lineHeight: '24px',
                        color: '#10233f',
                      },
                    }}
                    footer={() => (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', borderTop: '1px solid rgba(16,35,63,0.06)', padding: '12px 8px' }}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <Tag bordered={false} color="blue">对话生成</Tag>
                          <Tag bordered={false} color="green">人工复核</Tag>
                          <Tag bordered={false} color="gold">导出到小闪</Tag>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button
                            type="button"
                            onClick={handleVoiceToggle}
                            aria-label={listening ? '结束语音转文字' : '开始语音转文字'}
                            style={{ width: 40, height: 40, display: 'grid', placeItems: 'center', borderRadius: 999, border: '1px solid rgba(16,35,63,0.10)', background: '#fff', color: '#2f6bff' }}
                          >
                            {listening ? <MicOff size={15} /> : <Mic size={15} />}
                          </button>
                          <Button type="primary" shape="round" icon={<Send size={14} />} loading={submitting} onClick={() => void submitRequirement()}>
                            发送
                          </Button>
                        </div>
                      </div>
                    )}
                  />
                </div>
              </div>
            </main>

            <aside style={{ background: 'rgba(255,255,255,0.78)', borderLeft: '1px solid rgba(16,35,63,0.08)' }}>
              <Section title="检查器" extra={<PanelRightOpen size={14} color="#7a8aa0" />}>
                {analysis ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <InlinePanel title="当前判断" tone="accent">
                      <div style={{ fontSize: 13, lineHeight: 1.7, color: '#355070' }}>{analysis.summary}</div>
                    </InlinePanel>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                      <InlinePanel title="识别方式">
                        <div style={{ fontSize: 13, color: '#355070' }}>{getIntakeModeText(analysis.intakeMode)}</div>
                      </InlinePanel>
                      <InlinePanel title="建议时间">
                        <div style={{ fontSize: 13, color: '#355070' }}>{analysis.suggestedDateText}</div>
                      </InlinePanel>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      <Tag color="blue">模板：{analysis.suggestedTemplateName || '待确认'}</Tag>
                      <Tag color={analysis.shouldGenerateDraft ? 'success' : 'default'}>
                        {analysis.shouldGenerateDraft ? '可直接生成草稿' : '建议先补充口径'}
                      </Tag>
                    </div>

                    <div>
                      <div style={{ marginBottom: 8, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#5f6f86', fontWeight: 600 }}>
                        已识别指标
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {analysis.recognizedMetrics.length ? analysis.recognizedMetrics.map((item) => <Tag key={item} color="green">{item}</Tag>) : <Text type="secondary">还没有识别到明确指标</Text>}
                      </div>
                    </div>

                    {analysis.unclearMetrics.length > 0 && (
                      <InlinePanel title="待确认指标" tone="warn">
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {analysis.unclearMetrics.map((item) => <Tag key={item} color="gold">{item}</Tag>)}
                        </div>
                      </InlinePanel>
                    )}

                    {analysis.unimplementedMetrics.length > 0 && (
                      <InlinePanel title="暂不可直接查询" tone="warn">
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {analysis.unimplementedMetrics.map((item) => <Tag key={item} color="red">{item}</Tag>)}
                        </div>
                        <div style={{ marginTop: 8, fontSize: 12, lineHeight: 1.7, color: '#c25a1b' }}>
                          这类指标会转成后续需求，不会直接编造成报表结果。
                        </div>
                      </InlinePanel>
                    )}

                    <InlinePanel title="下一步">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, color: '#355070' }}>
                        {analysis.nextActions.map((item) => (
                          <div key={item}>- {item}</div>
                        ))}
                      </div>
                    </InlinePanel>
                  </div>
                ) : (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="先在会话里说明你的报表需求" />
                )}
              </Section>

              <Section title="当前草稿">
                {selectedDraft ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <InlinePanel title={selectedDraft.templateName}>
                      <div style={{ fontSize: 13, lineHeight: 1.7, color: '#355070' }}>{selectedDraft.summary}</div>
                    </InlinePanel>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      <Tag color="blue">{selectedDraft.reportDate}</Tag>
                      <Tag color={selectedDraft.status === 'exported' ? 'green' : selectedDraft.status === 'reviewed' ? 'gold' : 'processing'}>
                        {getDraftStatusText(selectedDraft.status)}
                      </Tag>
                    </div>
                    {selectedDraft.narrative.slice(0, 2).map((item, index) => (
                      <div key={index} style={{ fontSize: 13, lineHeight: 1.7, color: '#355070' }}>- {item}</div>
                    ))}
                  </div>
                ) : (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={loading ? '加载中...' : '还没有可展示的草稿'} />
                )}
              </Section>

              <Section title="动作区">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <Button block type="primary" icon={<Sparkles size={16} />} onClick={handleGenerateDraft}>
                    生成报表草稿
                  </Button>
                  <Button block icon={<CheckCircle2 size={16} />} onClick={handleReview} disabled={!selectedDraft}>
                    标记人工复核完成
                  </Button>
                  <Button block icon={<Share2 size={16} />} onClick={() => void submitRequirement('请基于当前草稿生成共享链接，方便其他同事查看。')} disabled={!selectedDraft}>
                    生成共享链接
                  </Button>
                  <Button block icon={<ImageUp size={16} />} onClick={() => void submitRequirement('请为当前草稿生成分享截图，并附上适合汇报的说明。')} disabled={!selectedDraft}>
                    生成截图说明
                  </Button>
                  <Button block icon={<Link2 size={16} />} onClick={handleExport} disabled={!selectedDraft}>
                    导出到小闪
                  </Button>
                </div>
              </Section>

              <Section title="交付状态">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <div style={{ marginBottom: 8, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#5f6f86', fontWeight: 600 }}>
                      可用指标
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {metricCatalog.length ? metricCatalog.map((item) => <Tag key={item}>{item}</Tag>) : <Text type="secondary">识别后会在这里展示当前可查询指标</Text>}
                    </div>
                  </div>

                  {shareLink && (
                    <Alert type="success" showIcon message="共享链接已生成" description={shareLink} style={{ borderRadius: 14 }} />
                  )}
                  {screenshotHint && (
                    <Alert type="info" showIcon message="截图说明" description={screenshotHint} style={{ borderRadius: 14 }} />
                  )}

                  {drafts.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#5f6f86', fontWeight: 600 }}>
                        最近草稿
                      </div>
                      {drafts.slice(0, 4).map((draft) => (
                        <button
                          key={draft.id}
                          type="button"
                          onClick={() => {
                            setSelectedDraftId(draft.id);
                            setSelectedTemplateId(draft.templateId);
                          }}
                          style={{
                            width: '100%',
                            textAlign: 'left',
                            borderRadius: 18,
                            padding: '10px 12px',
                            border: selectedDraftId === draft.id ? '1px solid rgba(64,104,255,0.24)' : '1px solid rgba(16,35,63,0.08)',
                            background: selectedDraftId === draft.id ? 'rgba(64,104,255,0.06)' : 'transparent',
                            cursor: 'pointer',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                            <span style={{ fontSize: 14, fontWeight: 600, color: '#10233f' }}>{draft.templateName}</span>
                            <span style={{ fontSize: 11, color: '#7a8aa0' }}>{draft.reportDate}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 12, color: '#6b7c93' }}>
                            <Clock3 size={12} />
                            {getDraftStatusText(draft.status)}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </Section>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

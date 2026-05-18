import type { Message } from '@/types';

export type ExportFormat =
  | 'markdown'
  | 'markdown-thinking'
  | 'notion'
  | 'obsidian'
  | 'word'
  | 'xiaoshan'
  | 'csv';

export interface ExportFormatOption {
  key: ExportFormat;
  label: string;
  description: string;
  icon: string;
  ext: string;
}

export const EXPORT_FORMATS: ExportFormatOption[] = [
  { key: 'markdown', label: 'Markdown', description: '导出纯消息内容的标准 Markdown', icon: '📝', ext: 'md' },
  { key: 'markdown-thinking', label: 'Markdown（含过程）', description: '导出消息并保留推理与工具调用', icon: '🧠', ext: 'md' },
  { key: 'notion', label: 'Notion', description: '导出适合粘贴到 Notion 的消息内容', icon: '📚', ext: 'md' },
  { key: 'obsidian', label: 'Obsidian', description: '导出适合知识库沉淀的消息记录', icon: '🔮', ext: 'md' },
  { key: 'word', label: 'Word', description: '导出消息内容为 Word 文档', icon: '📄', ext: 'docx' },
  { key: 'xiaoshan', label: '小闪', description: '导出适合笔记整理的消息格式', icon: '⚡', ext: 'md' },
  { key: 'csv', label: 'Excel / CSV', description: '导出结构化消息表格', icon: '📊', ext: 'csv' },
];

function formatTime(ts: number | string): string {
  const d = typeof ts === 'string' ? new Date(ts) : new Date(ts);
  return d.toLocaleString('zh-CN', { hour12: false });
}

function sanitizeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '_').substring(0, 100);
}

function extractToolCallSummary(tc: NonNullable<Message['tool_calls']>[number]): string {
  let args = '';
  try {
    if (tc.arguments) {
      const parsed = JSON.parse(tc.arguments);
      args = Object.entries(parsed)
        .map(([k, v]) => `${k}: ${String(v).substring(0, 80)}`)
        .join(', ');
    }
  } catch {
    args = (tc.arguments || '').substring(0, 100);
  }
  return args;
}

function messageToMarkdown(msg: Message, includeThinking: boolean): string {
  const lines: string[] = [];
  const time = formatTime(msg.timestamp || msg.created_at);
  const roleLabel = msg.role === 'user' ? '用户' : '智投chat';

  lines.push(`### ${roleLabel}  _${time}_\n`);

  if (includeThinking && msg.role === 'assistant') {
    if (msg.thinking) {
      lines.push('<details>\n<summary>推理过程</summary>\n');
      lines.push(msg.thinking);
      lines.push('\n</details>\n');
    }
    if (msg.thinking_steps && msg.thinking_steps.length > 0) {
      lines.push('<details>\n<summary>推理步骤</summary>\n');
      msg.thinking_steps.forEach((step) => {
        const icon = step.status === 'completed' ? '✓' : step.status === 'error' ? '✕' : '•';
        lines.push(`${icon} **${step.label}**: ${step.content}`);
      });
      lines.push('\n</details>\n');
    }
    if (msg.tool_calls && msg.tool_calls.length > 0) {
      lines.push('<details>\n<summary>工具调用</summary>\n');
      msg.tool_calls.forEach((tc) => {
        const statusIcon = tc.status === 'completed' ? '✓' : tc.status === 'error' ? '✕' : '•';
        lines.push(`**${tc.name}** ${statusIcon}`);
        const args = extractToolCallSummary(tc);
        if (args) lines.push(`- 参数: ${args}`);
        if (tc.result) lines.push(`- 结果: ${tc.result.substring(0, 200)}`);
      });
      lines.push('\n</details>\n');
    }
  }

  lines.push(msg.content || '');
  lines.push('\n---\n');
  return lines.join('\n');
}

export function exportMarkdown(messages: Message[], title: string, includeThinking: boolean): string {
  const lines: string[] = [
    `# ${title}\n`,
    `> 导出时间: ${formatTime(Date.now())} | 格式: ${includeThinking ? 'Markdown（含过程）' : 'Markdown'}\n`,
    '---\n',
  ];

  messages.forEach((msg) => {
    lines.push(messageToMarkdown(msg, includeThinking));
  });

  return lines.join('\n');
}

export function exportNotion(messages: Message[], title: string): string {
  const lines: string[] = [
    `# ${title}\n`,
    `> 导出时间: ${formatTime(Date.now())} | 格式: Notion\n`,
    '---\n',
  ];

  messages.forEach((msg) => {
    const time = formatTime(msg.timestamp || msg.created_at);
    const roleLabel = msg.role === 'user' ? '用户' : '智投chat';

    lines.push(`## ${roleLabel}\n`);
    lines.push(`_时间：${time}_\n`);

    if (msg.thinking) {
      lines.push('> **推理过程**\n>');
      msg.thinking.split('\n').forEach((line) => lines.push(`> ${line}`));
      lines.push('');
    }

    if (msg.tool_calls && msg.tool_calls.length > 0) {
      lines.push('<details>\n<summary>工具调用详情</summary>\n');
      msg.tool_calls.forEach((tc) => {
        lines.push(`- **${tc.name}** ${tc.status === 'completed' ? '✓' : '•'}`);
        if (tc.result) lines.push(`  \`${tc.result.substring(0, 150)}\``);
      });
      lines.push('\n</details>\n');
    }

    lines.push(msg.content || '');
    lines.push('\n---\n');
  });

  return lines.join('\n');
}

export function exportObsidian(messages: Message[], title: string): string {
  const tags = ['#智投chat', '#对话导出'];
  const dateStr = new Date().toISOString().split('T')[0];
  const agentTypes = new Set<string>();

  messages.forEach((msg) => {
    if (msg.agent) agentTypes.add(`#agent/${msg.agent}`);
    if (msg.intent_type) agentTypes.add(`#意图/${msg.intent_type}`);
  });

  const frontmatter = [
    '---',
    `title: "${title}"`,
    `date: ${dateStr}`,
    `tags: [${[...tags, ...agentTypes].join(', ')}]`,
    'type: conversation',
    'source: 智投chat',
    '---',
  ].join('\n');

  const lines: string[] = [frontmatter, '', `# ${title}\n`];

  messages.forEach((msg) => {
    const time = formatTime(msg.timestamp || msg.created_at);
    const roleLabel = msg.role === 'user' ? '用户' : '智投chat';

    lines.push(`## ${roleLabel}`);
    lines.push(`*${time}*\n`);

    if (msg.thinking) {
      lines.push('> [!thinking] 推理过程');
      msg.thinking.split('\n').forEach((line) => lines.push(`> ${line}`));
      lines.push('');
    }

    if (msg.tool_calls && msg.tool_calls.length > 0) {
      lines.push('> [!tool] 工具调用');
      msg.tool_calls.forEach((tc) => {
        const status = tc.status === 'completed' ? '✓' : '•';
        lines.push(`> **${tc.name}** ${status}`);
        if (tc.result) lines.push(`> \`${tc.result.substring(0, 150)}\``);
      });
      lines.push('');
    }

    lines.push(msg.content || '');
    lines.push('\n---\n');
  });

  return lines.join('\n');
}

export function exportXiaoshan(messages: Message[], title: string): string {
  const lines: string[] = [
    `# ${title}`,
    '',
    '@source 智投chat',
    `@date ${formatTime(Date.now())}`,
    '@type 对话记录',
    '',
    '---',
    '',
  ];

  messages.forEach((msg) => {
    const time = formatTime(msg.timestamp || msg.created_at);
    lines.push(`## ${msg.role === 'user' ? '用户' : '智投chat'} · ${time}\n`);

    if (msg.thinking) {
      lines.push('%%thinking');
      lines.push(msg.thinking);
      lines.push('%%\n');
    }

    if (msg.tool_calls && msg.tool_calls.length > 0) {
      msg.tool_calls.forEach((tc) => {
        lines.push(`%%tool ${tc.name} ${tc.status === 'completed' ? '✓' : '•'}`);
        if (tc.result) lines.push(tc.result.substring(0, 200));
        lines.push('%%\n');
      });
    }

    lines.push(msg.content || '');
    lines.push('');
    lines.push('---');
    lines.push('');
  });

  return lines.join('\n');
}

export function exportCSV(messages: Message[]): string {
  const headers = ['序号', '角色', '时间', '内容摘要', '是否含推理', '工具调用', '意图', 'Agent'];
  const rows: string[][] = [];

  messages.forEach((msg, i) => {
    const content = (msg.content || '').replace(/[\n\r]/g, ' ').substring(0, 500);
    const thinking = msg.thinking ? '是' : '否';
    const toolCalls = msg.tool_calls && msg.tool_calls.length > 0
      ? msg.tool_calls.map((tc) => tc.name).join('; ')
      : '无';
    const intent = msg.intent_type || msg.routing_decision?.intent_type || '';
    const agent = msg.agent || '';

    rows.push([
      String(i + 1),
      msg.role === 'user' ? '用户' : '助手',
      formatTime(msg.timestamp || msg.created_at),
      `"${content.replace(/"/g, '""')}"`,
      thinking,
      `"${toolCalls.replace(/"/g, '""')}"`,
      intent,
      String(agent),
    ]);
  });

  return '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export async function exportWord(messages: Message[], title: string): Promise<Blob> {
  const docxModule = await import('docx');
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } = docxModule;
  const children: InstanceType<typeof Paragraph>[] = [];

  children.push(
    new Paragraph({
      text: title,
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `导出时间: ${formatTime(Date.now())} | 来源: 智投chat`,
          size: 18,
          color: '888888',
          italics: true,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
  );

  messages.forEach((msg) => {
    const time = formatTime(msg.timestamp || msg.created_at);
    const isUser = msg.role === 'user';

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: isUser ? '用户' : '智投chat',
            bold: true,
            size: 24,
            color: isUser ? '0066CC' : '009966',
          }),
          new TextRun({
            text: `  ${time}`,
            size: 18,
            color: '999999',
          }),
        ],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 100 },
      }),
    );

    if (msg.thinking) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: '推理过程', bold: true, size: 20, color: '666666' })],
          spacing: { before: 100 },
        }),
      );
      children.push(
        new Paragraph({
          children: [new TextRun({ text: msg.thinking.substring(0, 1000), size: 18, color: '888888', italics: true })],
          indent: { left: 400 },
          spacing: { after: 100 },
        }),
      );
    }

    if (msg.tool_calls && msg.tool_calls.length > 0) {
      msg.tool_calls.forEach((tc) => {
        const status = tc.status === 'completed' ? '✓' : '•';
        children.push(
          new Paragraph({
            children: [new TextRun({ text: `工具调用 ${tc.name} ${status}`, bold: true, size: 20 })],
            spacing: { before: 80 },
          }),
        );
        if (tc.result) {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: tc.result.substring(0, 300), size: 18, color: '666666' })],
              indent: { left: 400 },
              spacing: { after: 80 },
            }),
          );
        }
      });
    }

    (msg.content || '').split('\n').filter(Boolean).forEach((p) => {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: p, size: 22 })],
          spacing: { after: 80 },
        }),
      );
    });

    children.push(
      new Paragraph({
        children: [],
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 1, color: 'DDDDDD' },
        },
        spacing: { before: 200, after: 200 },
      }),
    );
  });

  const doc = new Document({
    sections: [{ properties: {}, children }],
  });

  return Packer.toBlob(doc);
}

export async function doExport(
  format: ExportFormat,
  messages: Message[],
  title: string,
): Promise<void> {
  const { saveAs } = await import('file-saver');
  const safeTitle = sanitizeFilename(title);

  switch (format) {
    case 'markdown': {
      saveAs(new Blob([exportMarkdown(messages, title, false)], { type: 'text/markdown;charset=utf-8' }), `${safeTitle}.md`);
      break;
    }
    case 'markdown-thinking': {
      saveAs(new Blob([exportMarkdown(messages, title, true)], { type: 'text/markdown;charset=utf-8' }), `${safeTitle}_thinking.md`);
      break;
    }
    case 'notion': {
      saveAs(new Blob([exportNotion(messages, title)], { type: 'text/markdown;charset=utf-8' }), `${safeTitle}_notion.md`);
      break;
    }
    case 'obsidian': {
      saveAs(new Blob([exportObsidian(messages, title)], { type: 'text/markdown;charset=utf-8' }), `${safeTitle}.md`);
      break;
    }
    case 'word': {
      saveAs(await exportWord(messages, title), `${safeTitle}.docx`);
      break;
    }
    case 'xiaoshan': {
      saveAs(new Blob([exportXiaoshan(messages, title)], { type: 'text/markdown;charset=utf-8' }), `${safeTitle}_xiaoshan.md`);
      break;
    }
    case 'csv': {
      saveAs(new Blob([exportCSV(messages)], { type: 'text/csv;charset=utf-8' }), `${safeTitle}.csv`);
      break;
    }
    default:
      throw new Error(`Unknown export format: ${format}`);
  }
}

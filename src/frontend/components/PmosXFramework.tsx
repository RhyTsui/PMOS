import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircleFilled,
  CodeOutlined,
  CopyOutlined,
  FileTextOutlined,
  LinkOutlined,
  LoadingOutlined,
  MessageOutlined,
  ReloadOutlined,
  RobotOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import type { ReactNode } from 'react';
import { Avatar, Button, ConfigProvider, Divider, Select, Space, Tag, theme } from 'antd';
import {
  Actions,
  Attachments,
  Bubble,
  CodeHighlighter,
  Conversations,
  FileCard,
  Folder,
  Mermaid,
  Prompts,
  Sender,
  Sources,
  Suggestion,
  Think,
  ThoughtChain,
  Welcome,
  XProvider,
  notification,
} from '@ant-design/x';
import { XMarkdown } from '@ant-design/x-markdown';
import type {
  ChatMessage,
  ChatSession,
  ExecutionRun,
  ProductChiefMultiAgentReview,
  ProductChiefOutput,
  Requirement,
} from '../../shared/schemas';

type PmchatRenderCase =
  | 'playground'
  | 'bubble'
  | 'conversations'
  | 'notification'
  | 'welcome'
  | 'prompts'
  | 'sender'
  | 'attachments'
  | 'suggestion'
  | 'think'
  | 'thought-chain'
  | 'actions'
  | 'file-card'
  | 'sources'
  | 'code'
  | 'mermaid'
  | 'folder'
  | 'markdown'
  | 'xprovider';

type PmchatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  renderCase?: PmchatRenderCase;
  sources?: Array<{ key: string; title: string; url?: string }>;
};

type InspectorView = 'context' | 'evidence' | 'approval' | 'trace';

type PmosXFrameworkProps = {
  selectedSubprojectId: string | null;
  activeSessionId: string | null;
  sessions: ChatSession[];
  messages: ChatMessage[];
  requirements: Requirement[];
  productChiefOutputs: ProductChiefOutput[];
  runs: ExecutionRun[];
  reviews: ProductChiefMultiAgentReview[];
};

type CaseDefinition = {
  key: string;
  label: string;
  renderCase: PmchatRenderCase;
  content: string;
};

type MatrixTagSpec = {
  label: string;
  color?: string;
};

type MatrixSectionSpec = {
  eyebrow?: string;
  title: string;
  description: string;
  statusLabel: string;
  statusColor?: string;
  density?: 'comfortable' | 'compact';
  tags?: MatrixTagSpec[];
  note?: ReactNode;
  children: ReactNode;
};

const PMCHAT_CODE_SAMPLE = `import { Sender, Suggestion, Think } from '@ant-design/x';
import { useXChat } from '@ant-design/x-sdk';

export function PMChatEntry() {
  const { onRequest } = useXChat();

  return (
    <>
      <Suggestion items={[{ label: '看架构图', value: 'case:mermaid' }]} />
      <Sender placeholder="直接提问，或从组件示例里触发效果" onSubmit={onRequest} />
      <Think title="本轮思考与证据" defaultExpanded={false} />
    </>
  );
}`;

const PMCHAT_STREAM_CODE_SAMPLE = `const request = XRequest({
  baseURL: '/api/pmchat',
  headers: { Accept: 'text/event-stream' },
});

return {
  ...provider.transformMessage({ originMessage, chunk, chunks }),
  streaming: true,
};`;

const PMCHAT_TOKEN_COMPARE_TS = `const session = {
  id: 'pmchat',
  mode: 'streaming',
  provider: 'Qwen',
};`;

const PMCHAT_TOKEN_COMPARE_JSON = `{
  "id": "pmchat",
  "mode": "streaming",
  "provider": "Qwen"
}`;

const PMCHAT_MERMAID_SAMPLE = `flowchart LR
  User[用户提问] --> Chat[主对话]
  Chat --> Intent[意图收束]
  Intent --> Agent[Agent 判断]
  Agent --> Reply[回复气泡]
  Reply --> Think[Think 折叠思考]
  Reply --> Sources[Sources 来源引用]
  Reply --> Action[Actions 下一步动作]`;

const PMCHAT_MARKDOWN_SAMPLE = `# PMChat Rich Output

这是一个 **XMarkdown** 会话内示例。
- 支持流式尾后缀
- 支持链接新标签页打开
- 支持原始 HTML 转义

\`\`\`ts
const state = { mode: 'streaming', tail: '▋' };
\`\`\`

访问 [Ant Design X](https://x.ant.design/) 查看更多组件。
<script>alert('raw html should be escaped')</script>`;

const PMCHAT_CASES: CaseDefinition[] = [
  { key: 'case:playground', label: '操场 Playground', renderCase: 'playground', content: '当前回复展示 Playground 示例。' },
  { key: 'case:bubble', label: '气泡 Bubble', renderCase: 'bubble', content: '当前回复展示气泡组件示例。' },
  { key: 'case:conversations', label: '会话列表 Conversations', renderCase: 'conversations', content: '当前回复展示会话列表组件示例。' },
  { key: 'case:notification', label: '通知 Notification', renderCase: 'notification', content: '当前回复展示通知组件示例。' },
  { key: 'case:welcome', label: '欢迎 Welcome', renderCase: 'welcome', content: '当前回复展示欢迎组件示例。' },
  { key: 'case:prompts', label: '提示词 Prompts', renderCase: 'prompts', content: '当前回复展示提示词组件示例。' },
  { key: 'case:sender', label: '输入框 Sender', renderCase: 'sender', content: '当前回复展示输入框组件示例。' },
  { key: 'case:attachments', label: '附件 Attachments', renderCase: 'attachments', content: '当前回复展示附件组件示例。' },
  { key: 'case:suggestion', label: '建议 Suggestion', renderCase: 'suggestion', content: '当前回复展示建议组件示例。' },
  { key: 'case:think', label: '思考 Think', renderCase: 'think', content: '当前回复展示思考组件示例。' },
  { key: 'case:thought-chain', label: '思维链 ThoughtChain', renderCase: 'thought-chain', content: '当前回复展示思维链组件示例。' },
  { key: 'case:actions', label: '动作 Actions', renderCase: 'actions', content: '当前回复展示动作组件示例。' },
  { key: 'case:file-card', label: '文件卡 FileCard', renderCase: 'file-card', content: '当前回复展示文件卡组件示例。' },
  { key: 'case:sources', label: '来源 Sources', renderCase: 'sources', content: '当前回复展示来源组件示例。' },
  { key: 'case:code', label: '看代码块效果', renderCase: 'code', content: '当前回复展示代码高亮示例。' },
  { key: 'case:mermaid', label: '看架构图', renderCase: 'mermaid', content: '当前回复展示 Mermaid 示例。' },
  { key: 'case:folder', label: '文件树 Folder', renderCase: 'folder', content: '当前回复展示文件树组件示例。' },
  { key: 'case:markdown', label: 'Markdown XMarkdown', renderCase: 'markdown', content: '当前回复展示 XMarkdown 示例。' },
  { key: 'case:xprovider', label: '全局配置 XProvider', renderCase: 'xprovider', content: '当前回复展示 XProvider 与样式切换示例。' },
];

const DEFAULT_SOURCES = [
  { key: 's1', title: 'x.ant.design / think', url: 'https://x.ant.design/components/think' },
  { key: 's2', title: 'x.ant.design / sources', url: 'https://x.ant.design/components/sources' },
  { key: 's3', title: 'x.ant.design / x-markdowns', url: 'https://x.ant.design/x-markdowns/introduce' },
];

const RICH_SOURCES = [
  {
    key: 'r1',
    title: 'Think',
    url: 'https://x.ant.design/components/think',
    icon: <LinkOutlined />,
    description: 'Basic / Status / Expand',
  },
  {
    key: 'r2',
    title: 'Sources',
    url: 'https://x.ant.design/components/sources',
    icon: <FileTextOutlined />,
    description: 'Basic / Icon / Expand / Inline',
  },
  {
    key: 'r3',
    title: 'X Markdown',
    url: 'https://x.ant.design/x-markdowns/introduce',
    icon: <CodeOutlined />,
    description: 'Streaming / Plugins / Security',
  },
];

const NOTIFICATION_CASES = [
  {
    key: 'success',
    title: 'Success',
    description: '状态已经完成收口。',
    danger: false,
  },
  {
    key: 'warning',
    title: 'Warning',
    description: '还有组件状态待继续补齐。',
    danger: false,
  },
  {
    key: 'error',
    title: 'Error',
    description: '这是一条异常状态通知。',
    danger: true,
  },
] as const;

const MESSAGE_ACTIONS = [
  { key: 'copy', label: '复制', icon: <CopyOutlined /> },
  { key: 'retry', label: '重试', icon: <ReloadOutlined /> },
  { key: 'feedback', label: '反馈', icon: <MessageOutlined /> },
] as const;

function buildAssistantMessage(input: string): PmchatMessage {
  const lower = input.toLowerCase();
  const found = PMCHAT_CASES.find((item) => item.key === input) ??
    PMCHAT_CASES.find((item) => lower.includes(item.label.replace('看', '').replace('效果', '').replace('示例', '').toLowerCase()));

  return {
    id: `assistant_${Date.now()}`,
    role: 'assistant',
    content: found?.content ?? `已收到：${input}`,
    renderCase: found?.renderCase,
    sources: DEFAULT_SOURCES,
  };
}

function createConversationLabel(index: number) {
  return index === 0 ? 'PMChat' : `PMChat ${index + 1}`;
}

function renderOfficialMatrixSection({
  eyebrow = 'Official Page',
  title,
  description,
  statusLabel,
  statusColor = 'blue',
  density = 'comfortable',
  tags = [],
  note,
  children,
}: MatrixSectionSpec) {
  return (
    <section className={`pmos-x-example-section pmos-x-example-section--matrix pmos-x-example-section--${density}`}>
      <div className="pmos-x-matrix-card">
        <div className="pmos-x-matrix-card__header">
          <div className="pmos-x-matrix-card__titleblock">
            <span className="pmos-x-matrix-card__eyebrow">{eyebrow}</span>
            <strong>{title}</strong>
            <p>{description}</p>
          </div>
          <div className="pmos-x-matrix-card__status">
            <Tag color={statusColor}>{statusLabel}</Tag>
            <Tag color="default">{density === 'compact' ? 'compact' : 'comfortable'}</Tag>
          </div>
        </div>
        {tags.length > 0 ? (
          <div className="pmos-x-matrix-card__meta">
            {tags.map((tag) => (
              <Tag key={`${title}-${tag.label}`} color={tag.color ?? 'default'}>
                {tag.label}
              </Tag>
            ))}
          </div>
        ) : null}
        <div className="pmos-x-matrix-card__body">{children}</div>
        {note ? <div className="pmos-x-matrix-card__note">{note}</div> : null}
      </div>
    </section>
  );
}

function renderMarkdownShowcase() {
  return (
    <div className="pmos-x-example-stack">
      <section className="pmos-x-example-section">
        <strong>Minimum Setup</strong>
        <div className="pmos-x-markdown-shell">
          <div className="pmos-x-markdown-shell__bar">
            <span className="pmos-x-markdown-shell__title">markdown-render.tsx</span>
            <Tag color="blue">minimum</Tag>
          </div>
          <XMarkdown
            content={PMCHAT_MARKDOWN_SAMPLE}
            components={{
              blockquote: (props) => <blockquote className="pmos-x-markdown-quote" {...props} />,
            }}
            openLinksInNewTab
            escapeRawHtml
            streaming={{
              enableAnimation: true,
              hasNextChunk: false,
              tail: { content: '▋' },
            }}
          />
        </div>
      </section>
      <section className="pmos-x-example-section">
        <strong>Streaming</strong>
        <div className="pmos-x-markdown-shell pmos-x-markdown-shell--streaming">
          <div className="pmos-x-markdown-shell__bar">
            <span className="pmos-x-markdown-shell__title">streaming-chunks</span>
            <Tag color="processing">chunked</Tag>
          </div>
          <div className="pmos-x-markdown-stream-meta">
            <Tag color="geekblue">chunk 1</Tag>
            <Tag color="cyan">chunk 2</Tag>
            <Tag color="default">tail ▋</Tag>
          </div>
          <div className="pmos-x-markdown-stream-track">
            <span className="pmos-x-markdown-stream-track__step pmos-x-markdown-stream-track__step--done">intent locked</span>
            <span className="pmos-x-markdown-stream-track__step pmos-x-markdown-stream-track__step--active">chunk appending</span>
            <span className="pmos-x-markdown-stream-track__step">finalize</span>
          </div>
          <div className="pmos-x-markdown-stream-chunks">
            <div className="pmos-x-markdown-stream-chunks__item">
              <span className="pmos-x-markdown-stream-chunks__label">chunk 01</span>
              <span className="pmos-x-markdown-stream-chunks__content">当前回复支持逐段收口与尾后缀。</span>
            </div>
            <div className="pmos-x-markdown-stream-chunks__item pmos-x-markdown-stream-chunks__item--active">
              <span className="pmos-x-markdown-stream-chunks__label">chunk 02</span>
              <span className="pmos-x-markdown-stream-chunks__content">第二段仍在追加，容器与段落不会抖动。</span>
            </div>
            <div className="pmos-x-markdown-stream-chunks__item pmos-x-markdown-stream-chunks__item--queued">
              <span className="pmos-x-markdown-stream-chunks__label">chunk 03</span>
              <span className="pmos-x-markdown-stream-chunks__content">最后一段将在尾后缀稳定后再完成收口。</span>
            </div>
          </div>
          <XMarkdown
            content={'## Streaming Reply\n\n当前回复支持逐段收口与尾后缀。\n\n- 第一段已经稳定\n- 第二段仍在追加▋'}
            components={{
              p: (props) => <p className="pmos-x-markdown-paragraph" {...props} />,
            }}
            streaming={{
              enableAnimation: true,
              hasNextChunk: true,
              tail: { content: '▋' },
              incompleteMarkdownComponentMap: {
                link: 'incomplete-link',
                image: 'incomplete-image',
              },
            }}
          />
          <div className="pmos-x-markdown-chunk-lines">
            <div className="pmos-x-markdown-chunk-lines__row pmos-x-markdown-chunk-lines__row--solid" />
            <div className="pmos-x-markdown-chunk-lines__row pmos-x-markdown-chunk-lines__row--active" />
            <div className="pmos-x-markdown-chunk-lines__row pmos-x-markdown-chunk-lines__row--short" />
          </div>
          <div className="pmos-x-markdown-debug-strip">
            <span>buffer</span>
            <span>append</span>
            <span>settle</span>
          </div>
        </div>
        <div className="pmos-x-markdown-note">
          <strong>Streaming State</strong>
          <span>`hasNextChunk / tail / incomplete markdown` 都应在当前消息里稳定承接，不拆成额外面板。</span>
        </div>
      </section>
      <section className="pmos-x-example-section">
        <strong>Plugins / Safety</strong>
        <div className="pmos-x-markdown-shell">
          <div className="pmos-x-markdown-shell__bar">
            <span className="pmos-x-markdown-shell__title">plugins-and-safety</span>
            <Tag color="purple">safe</Tag>
          </div>
          <XMarkdown
            content={'公式示意：$E = mc^2$\n\n<link rel=\"preload\" href=\"/hack\" />\n\n访问 [Ant Design X](https://x.ant.design/)'}
            openLinksInNewTab
            escapeRawHtml
          />
        </div>
        <div className="pmos-x-markdown-latex">
          <span>Latex / Plugin</span>
          <code>$E = mc^2$ · CustomPlugins · Mermaid / Code 映射都应走同一条 Markdown 承接链。</code>
        </div>
        <div className="pmos-x-markdown-note">
          <strong>Link Policy</strong>
          <span>链接统一新标签页打开，原始 HTML 仅显示文本，不直接执行。</span>
        </div>
      </section>
      <section className="pmos-x-example-section">
        <strong>Component Mapping</strong>
        <div className="pmos-x-markdown-shell">
          <div className="pmos-x-markdown-shell__bar">
            <span className="pmos-x-markdown-shell__title">component-mapping</span>
            <Tag color="gold">mapping</Tag>
          </div>
          <XMarkdown
            content={'```ts\nconst mode = "streaming";\n```\n\n> 这段引用会走自定义样式。'}
            components={{
              blockquote: (props) => <blockquote className="pmos-x-markdown-quote" {...props} />,
            }}
          />
        </div>
        <div className="pmos-x-markdown-note">
          <strong>Semantic DOM</strong>
          <span>引用、段落、代码块仍留在同一消息语义内，由映射组件接管表现。</span>
        </div>
      </section>
      <section className="pmos-x-example-section">
        <strong>Debug / Container</strong>
        <div className="pmos-x-markdown-shell pmos-x-markdown-shell--debug">
          <div className="pmos-x-markdown-shell__bar">
            <span className="pmos-x-markdown-shell__title">debug-container</span>
            <Tag color="default">overlay</Tag>
          </div>
          <XMarkdown
            content={'调试容器示意：\n\n- className / rootClassName / style / prefixCls\n- paragraphTag\n- debug overlay'}
            components={{
              p: (props) => <p className="pmos-x-markdown-paragraph" {...props} />,
            }}
          />
        </div>
      </section>
    </div>
  );
}

function renderPlaygroundShowcase() {
  return (
    <div className="pmos-x-example-stack">
      <section className="pmos-x-example-section">
        <strong>Component Overview</strong>
        <div className="pmos-x-conversations-note">
          <Tag color="blue">overview</Tag>
          <Tag color="cyan">discovery</Tag>
          <Tag color="geekblue">chat entry</Tag>
          在主 chat 内浏览组件家族，并跳转到具体组件示例。
        </div>
        <Prompts
          wrap
          items={[
            { key: 'bubble', label: '气泡 Bubble', description: '查看消息气泡、变体和动作区。' },
            { key: 'sender', label: '输入框 Sender', description: '查看输入态、引用态和头尾区。' },
            { key: 'sources', label: '来源 Sources', description: '查看 inline / expand / referenced。' },
            { key: 'think', label: '思考 Think', description: '查看 basic / status / expand。' },
          ]}
        />
      </section>
      <section className="pmos-x-example-section">
        <strong>Streaming Chat</strong>
        <div className="pmos-x-markdown-stream-meta">
          <Tag color="processing">useXChat</Tag>
          <Tag color="cyan">XRequest</Tag>
          <Tag color="geekblue">XStream</Tag>
          <Tag color="blue">Stream</Tag>
        </div>
        <div className="pmos-x-markdown-shell pmos-x-markdown-shell--streaming">
          <div className="pmos-x-markdown-shell__bar">
            <span className="pmos-x-markdown-shell__title">streaming-chat-playground</span>
            <Tag color="processing">chunked</Tag>
          </div>
          <div className="pmos-x-markdown-stream-track">
            <span className="pmos-x-markdown-stream-track__step pmos-x-markdown-stream-track__step--done">request</span>
            <span className="pmos-x-markdown-stream-track__step pmos-x-markdown-stream-track__step--done">chunk 01</span>
            <span className="pmos-x-markdown-stream-track__step pmos-x-markdown-stream-track__step--active">chunk 02 ▋</span>
            <span className="pmos-x-markdown-stream-track__step">settle</span>
          </div>
          <div className="pmos-x-markdown-stream-chunks">
            <div className="pmos-x-markdown-stream-chunks__item">
              <span className="pmos-x-markdown-stream-chunks__label">chunk 01</span>
              <div className="pmos-x-markdown-stream-chunks__content">用户先在主对话里触发一个组件或场景。</div>
            </div>
            <div className="pmos-x-markdown-stream-chunks__item pmos-x-markdown-stream-chunks__item--active">
              <span className="pmos-x-markdown-stream-chunks__label">chunk 02</span>
              <div className="pmos-x-markdown-stream-chunks__content">随后以流式方式返回组件示例、状态标签和结果承接面。</div>
            </div>
          </div>
        </div>
      </section>
      <section className="pmos-x-example-section">
        <strong>Markdown + Rich Output</strong>
        <div className="pmos-x-conversations-note">
          <Tag color="gold">markdown</Tag>
          <Tag color="purple">code</Tag>
          <Tag color="green">mermaid</Tag>
          <Tag color="blue">sources</Tag>
          用一条消息同时验证 `XMarkdown / CodeHighlighter / Mermaid / Sources`。
        </div>
        <XMarkdown content={PMCHAT_MARKDOWN_SAMPLE} openLinksInNewTab escapeRawHtml />
      </section>
      <section className="pmos-x-example-section">
        <strong>A2UI / Dynamic Surface</strong>
        <div className="pmos-x-conversations-note">
          <Tag color="magenta">A2UI v0.9</Tag>
          <Tag color="cyan">Dynamic Surface</Tag>
          <Tag color="blue">structured payload</Tag>
          结构化 UI 负载应在主 chat 内展开，而不是跳到独立工作台。
        </div>
        <Bubble
          variant="shadow"
          content={
            'Agent 返回一组结构化 UI 卡面：审批块、来源块、代码块、Mermaid 图和文件块，由消息内动态表面按需展开。'
          }
        />
      </section>
    </div>
  );
}

function renderInlineCase(
  message: PmchatMessage,
  options?: {
    codeLanguage: 'ts' | 'json' | 'bash';
    onCodeLanguageChange: (value: 'ts' | 'json' | 'bash') => void;
  },
) {
  const codeLanguage = options?.codeLanguage ?? 'ts';
  const selectedCodeSample =
    codeLanguage === 'json'
      ? PMCHAT_TOKEN_COMPARE_JSON
      : codeLanguage === 'bash'
        ? 'npm run build:frontend\nnpm run ui:schema:check\nnpm run lint'
        : PMCHAT_TOKEN_COMPARE_TS;
  const selectedCodeLabel =
    codeLanguage === 'json' ? 'session.json' : codeLanguage === 'bash' ? 'commands.sh' : 'session.ts';
  const selectedCodeThemeTag =
    codeLanguage === 'json' ? <Tag color="gold">JSON</Tag> : codeLanguage === 'bash' ? <Tag color="green">Bash</Tag> : <Tag color="blue">TypeScript</Tag>;

  switch (message.renderCase) {
    case 'playground':
      return renderPlaygroundShowcase();
    case 'conversations':
      return (
        <div className="pmos-x-example-stack">
          {renderOfficialMatrixSection({
            title: 'Basic Usage',
            description: '官方页先展示最小会话列表组合，重点是 activeKey、items 与当前激活态的对齐。',
            statusLabel: 'official basic',
            statusColor: 'blue',
            tags: [{ label: 'activeKey', color: 'blue' }, { label: 'items', color: 'cyan' }, { label: 'history', color: 'geekblue' }],
            note: '会话列表保持轻量线分区，创建入口和当前激活态自然内嵌，不额外包成侧边工作台。',
            children: (
              <div className="pmos-x-conversations-shell">
                <div className="pmos-x-conversations-rail">
                  <span className="pmos-x-conversations-rail__label">recent</span>
                  <span className="pmos-x-conversations-rail__meta">4 chats</span>
                </div>
                <Conversations
                  groupable={false}
                  activeKey="conversation-2"
                  items={[
                    { key: 'conversation-1', label: <div className="pmos-x-conversation-row"><span className="pmos-x-conversation-row__title">PMChat</span><span className="pmos-x-conversation-row__meta">默认首页</span></div> },
                    { key: 'conversation-2', label: <div className="pmos-x-conversation-row pmos-x-conversation-row--active"><span className="pmos-x-conversation-row__title">Streaming Chat</span><span className="pmos-x-conversation-row__meta">当前会话</span></div> },
                    { key: 'conversation-3', label: <div className="pmos-x-conversation-row"><span className="pmos-x-conversation-row__title">Rich Output Overview</span><span className="pmos-x-conversation-row__meta">组件矩阵</span></div> },
                    { key: 'conversation-4', label: <div className="pmos-x-conversation-row"><span className="pmos-x-conversation-row__title">A2UI / Dynamic Surface</span><span className="pmos-x-conversation-row__meta">动态卡面</span></div> },
                  ]}
                />
              </div>
            ),
          })}
          {renderOfficialMatrixSection({
            title: 'Long Title / Creation',
            description: '第二组回查长标题、创建入口和空态文案，确保都仍然服从同一列表密度。',
            statusLabel: 'creation',
            statusColor: 'cyan',
            tags: [{ label: 'long title', color: 'cyan' }, { label: 'new chat', color: 'blue' }, { label: 'empty', color: 'default' }],
            children: (
              <div className="pmos-x-conversations-shell pmos-x-conversations-shell--creation">
                <div className="pmos-x-conversations-create-row">
                  <Button size="small" type="text" className="pmos-x-conversations-create">+ 新对话</Button>
                </div>
                <Conversations
                  groupable={false}
                  activeKey="conversation-long"
                  items={[
                    { key: 'conversation-long', label: <div className="pmos-x-conversation-row"><span className="pmos-x-conversation-row__title">这是一个更长的会话标题，用来检查列表换行和密度控制</span><span className="pmos-x-conversation-row__meta">Long title</span></div> },
                    { key: 'conversation-empty', label: <div className="pmos-x-conversation-row"><span className="pmos-x-conversation-row__title">空态收束</span><span className="pmos-x-conversation-row__meta">Empty tone</span></div> },
                    { key: 'conversation-followup', label: <div className="pmos-x-conversation-row"><span className="pmos-x-conversation-row__title">继续追问：把组件状态再压完整</span><span className="pmos-x-conversation-row__meta">Follow-up</span></div> },
                  ]}
                />
                <div className="pmos-x-conversations-empty">暂无更多历史会话</div>
              </div>
            ),
          })}
          {renderOfficialMatrixSection({
            title: 'Active / Density',
            description: '第三组专门校正激活态和紧凑密度，整页后续都会沿用这一套标题条与间距基准。',
            statusLabel: 'compact',
            statusColor: 'geekblue',
            density: 'compact',
            tags: [{ label: 'active row', color: 'geekblue' }, { label: 'compact density', color: 'gold' }],
            children: (
              <div className="pmos-x-conversations-shell pmos-x-conversations-shell--compact">
                <div className="pmos-x-conversations-rail">
                  <span className="pmos-x-conversations-rail__label">active</span>
                  <span className="pmos-x-conversations-rail__meta">compact density</span>
                </div>
                <Conversations
                  groupable={false}
                  activeKey="conversation-active"
                  items={[
                    { key: 'conversation-active', label: <div className="pmos-x-conversation-row pmos-x-conversation-row--active"><span className="pmos-x-conversation-row__title">当前会话高亮</span><span className="pmos-x-conversation-row__meta">active row</span></div> },
                    { key: 'conversation-review', label: <div className="pmos-x-conversation-row"><span className="pmos-x-conversation-row__title">Review Lane</span><span className="pmos-x-conversation-row__meta">governance</span></div> },
                    { key: 'conversation-runtime', label: <div className="pmos-x-conversation-row"><span className="pmos-x-conversation-row__title">Runtime Trace</span><span className="pmos-x-conversation-row__meta">trace</span></div> },
                    { key: 'conversation-checklist', label: <div className="pmos-x-conversation-row"><span className="pmos-x-conversation-row__title">Checklist Review</span><span className="pmos-x-conversation-row__meta">requirements</span></div> },
                  ]}
                />
              </div>
            ),
          })}
          {renderOfficialMatrixSection({
            title: 'Grouped / Empty',
            description: '分组和空态继续保留在同一列表语义里，不额外发明第二套容器语言。',
            statusLabel: 'grouped',
            statusColor: 'default',
            tags: [{ label: 'today', color: 'blue' }, { label: 'earlier', color: 'default' }, { label: 'empty tone', color: 'cyan' }],
            children: (
              <div className="pmos-x-conversations-shell">
                <div className="pmos-x-conversations-group">
                  <div className="pmos-x-conversations-group__title">Today</div>
                  <Conversations
                    groupable={false}
                    activeKey="conversation-grouped"
                    items={[
                      { key: 'conversation-grouped', label: <div className="pmos-x-conversation-row pmos-x-conversation-row--active"><span className="pmos-x-conversation-row__title">Grouped Active Chat</span><span className="pmos-x-conversation-row__meta">today</span></div> },
                      { key: 'conversation-grouped-2', label: <div className="pmos-x-conversation-row"><span className="pmos-x-conversation-row__title">Mermaid Preview</span><span className="pmos-x-conversation-row__meta">visual</span></div> },
                    ]}
                  />
                </div>
                <div className="pmos-x-conversations-group">
                  <div className="pmos-x-conversations-group__title">Earlier</div>
                  <div className="pmos-x-conversations-empty pmos-x-conversations-empty--panel">暂无更多分组会话</div>
                </div>
              </div>
            ),
          })}
        </div>
      );
    case 'bubble':
      return (
        <div className="pmos-x-example-stack">
          {renderOfficialMatrixSection({
            title: 'Bubble.List',
            description: '官方页先用一组 role 配置展示多角色消息流，重点是 placement、variant 与 loading 的组合。',
            statusLabel: 'list',
            statusColor: 'blue',
            tags: [{ label: 'assistant', color: 'blue' }, { label: 'user', color: 'cyan' }, { label: 'system', color: 'default' }],
            note: '按照官方建议，列表本身保持聊天消息流语义，不把动作或解释提升成第二层面板。',
            children: (
              <div className="pmos-x-bubble-showcase">
                <Bubble.List
                  role={{
                    ai: {
                      placement: 'start',
                      variant: 'shadow',
                      avatar: <Avatar size="small" icon={<RobotOutlined />} />,
                      typing: true,
                    },
                    user: { placement: 'end', shape: 'round' },
                    system: { variant: 'borderless' },
                  }}
                  items={[
                    { key: 'bubble-1', role: 'ai', content: '这是一个基础 assistant 气泡，富内容仍然回到消息内部。', status: 'success' },
                    { key: 'bubble-2', role: 'user', content: '这是一个 user 气泡，用来保持主对话的单线推进。', status: 'success' },
                    { key: 'bubble-3', role: 'system', content: '这是一个 system 气泡，承接更轻的说明。', status: 'success' },
                    { key: 'bubble-4', role: 'ai', content: '这是一个 loading / typing 气泡。', status: 'loading' },
                  ]}
                />
              </div>
            ),
          })}
          {renderOfficialMatrixSection({
            title: 'Variants and Shapes',
            description: '第二组对应官方的 variants / shape 组合，保持一眼能比对 filled、outlined、shadow、borderless。',
            statusLabel: 'variants',
            statusColor: 'cyan',
            tags: [{ label: 'filled', color: 'blue' }, { label: 'outlined', color: 'cyan' }, { label: 'shadow', color: 'geekblue' }, { label: 'borderless', color: 'default' }],
            children: (
              <div className="pmos-x-bubble-variants">
                <Bubble variant="filled" shape="default" content="filled - default" className="pmos-x-bubble-card" />
                <Bubble variant="filled" shape="round" content="filled - round" className="pmos-x-bubble-card" />
                <Bubble variant="outlined" shape="round" content="outlined - round" className="pmos-x-bubble-card" />
                <Bubble variant="shadow" shape="corner" content="shadow - corner" className="pmos-x-bubble-card" />
                <Bubble variant="borderless" content={<span className="pmos-x-borderless-bubble">borderless bubble</span>} className="pmos-x-bubble-card" />
              </div>
            ),
          })}
          {renderOfficialMatrixSection({
            title: 'Inline Actions',
            description: '第三组回到聊天语义，动作区只作为气泡附属反馈，而不是独立的操作面板。',
            statusLabel: 'feedback',
            statusColor: 'gold',
            tags: [{ label: 'footer area', color: 'gold' }, { label: 'lightweight actions', color: 'geekblue' }],
            children: (
              <div className="pmos-x-bubble-action-row">
                <Bubble
                  variant="shadow"
                  content="消息下方动作区应该轻量贴合气泡，而不是外置成面板。"
                />
                <Actions
                  items={[
                    { key: 'copy', label: '复制' },
                    { key: 'retry', label: '重试' },
                    { key: 'feedback', label: '反馈' },
                  ]}
                  onClick={({ item }) => notification.open({ title: `Bubble 动作：${item.label}` })}
                />
              </div>
            ),
          })}
        </div>
      );
    case 'code':
      return (
        <div className="pmos-x-example-stack">
          <section className="pmos-x-example-section">
            <strong>Basic</strong>
            <div className="pmos-x-code-shell">
              <div className="pmos-x-code-shell__meta">
                <div className="pmos-x-code-shell__label">CodeHighlighter</div>
                <Tag color="blue">basic</Tag>
              </div>
              <div className="pmos-x-code-shell__surface pmos-x-code-shell__surface--dark">
                <div className="pmos-x-code-shell__topbar">
                  <div className="pmos-x-code-shell__traffic">
                    <span />
                    <span />
                    <span />
                  </div>
                  <span className="pmos-x-code-shell__filename">PMChatEntry.tsx</span>
                </div>
                <div className="pmos-x-code-shell__glow" />
                <CodeHighlighter lang="tsx">{PMCHAT_CODE_SAMPLE}</CodeHighlighter>
              </div>
            </div>
          </section>
          <section className="pmos-x-example-section">
            <strong>Custom Header</strong>
            <div className="pmos-x-code-shell">
              <div className="pmos-x-code-shell__meta">
                <div className="pmos-x-code-shell__label">Custom Header</div>
                <Tag color="cyan">toolbar</Tag>
              </div>
              <div className="pmos-x-code-shell__surface pmos-x-code-shell__surface--dark">
                <div className="pmos-x-code-shell__topbar">
                  <div className="pmos-x-code-shell__traffic">
                    <span />
                    <span />
                    <span />
                  </div>
                  <span className="pmos-x-code-shell__filename">transport.ts</span>
                </div>
                <div className="pmos-x-code-shell__glow pmos-x-code-shell__glow--streaming" />
                <CodeHighlighter lang="ts">{'const transport = createTransport({ provider: "Qwen", stream: true });\n\ntransport.send({ type: "chat", value: "看代码块效果" });'}</CodeHighlighter>
              </div>
              <div className="pmos-x-code-shell__caption">通过自定义顶部条承接文件名、状态和操作，不再把代码块裸露在回复正文里。</div>
            </div>
          </section>
          <section className="pmos-x-example-section">
            <strong>With XMarkdown</strong>
            <div className="pmos-x-code-shell">
              <div className="pmos-x-code-shell__meta">
                <div className="pmos-x-code-shell__label">Markdown Mapping</div>
                <Tag color="geekblue">x-markdown</Tag>
              </div>
              <div className="pmos-x-markdown-shell">
                <div className="pmos-x-markdown-shell__bar">
                  <span className="pmos-x-markdown-shell__title">markdown-with-code-block</span>
                  <Tag color="blue">mapping</Tag>
                </div>
                <XMarkdown
                  content={'```tsx\n' + PMCHAT_CODE_SAMPLE + '\n```'}
                  openLinksInNewTab
                  escapeRawHtml
                />
              </div>
              <div className="pmos-x-code-shell__caption">官方能力重点之一是与 XMarkdown 协同，把 Markdown 里的 fenced code block 自动映射到高亮代码块。</div>
            </div>
          </section>
          <section className="pmos-x-example-section">
            <strong>Re-Render</strong>
            <div className="pmos-x-code-shell">
              <div className="pmos-x-code-shell__meta">
                <div className="pmos-x-code-shell__label">Language Switch</div>
                <div className="pmos-x-code-switcher">
                  <Select
                    size="small"
                    value={codeLanguage}
                    style={{ width: 150 }}
                    options={[
                      { label: 'TypeScript', value: 'ts' },
                      { label: 'JSON', value: 'json' },
                      { label: 'Bash', value: 'bash' },
                    ]}
                    onChange={(value) => options?.onCodeLanguageChange(value as 'ts' | 'json' | 'bash')}
                  />
                  {selectedCodeThemeTag}
                </div>
              </div>
              <div className="pmos-x-code-shell__surface pmos-x-code-shell__surface--dark">
                <div className="pmos-x-code-shell__topbar">
                  <div className="pmos-x-code-shell__traffic">
                    <span />
                    <span />
                    <span />
                  </div>
                  <span className="pmos-x-code-shell__filename">{selectedCodeLabel}</span>
                </div>
                <div className="pmos-x-code-shell__glow" />
                <CodeHighlighter lang={codeLanguage === 'bash' ? 'bash' : codeLanguage === 'json' ? 'json' : 'ts'}>{selectedCodeSample}</CodeHighlighter>
              </div>
              <div className="pmos-x-code-shell__caption">通过语言切换触发重新渲染，用同一个结构观察不同语言 token 的变化。</div>
            </div>
          </section>
          <section className="pmos-x-example-section">
            <strong>Prism Light Mode</strong>
            <div className="pmos-x-code-grid">
              <div className="pmos-x-code-shell">
                <div className="pmos-x-code-shell__label">Light Theme</div>
                <div className="pmos-x-code-shell__surface pmos-x-code-shell__surface--light">
                  <div className="pmos-x-code-shell__topbar pmos-x-code-shell__topbar--light">
                    <div className="pmos-x-code-shell__traffic">
                      <span />
                      <span />
                      <span />
                    </div>
                    <span className="pmos-x-code-shell__filename">session.json</span>
                  </div>
                  <div className="pmos-x-code-shell__glow pmos-x-code-shell__glow--light" />
                  <CodeHighlighter lang="json">{'{\n  "mode": "streaming",\n  "component": "CodeHighlighter"\n}'}</CodeHighlighter>
                </div>
              </div>
              <div className="pmos-x-code-shell">
                <div className="pmos-x-code-shell__label">Dark Theme</div>
                <div className="pmos-x-code-shell__surface pmos-x-code-shell__surface--dark">
                  <div className="pmos-x-code-shell__topbar">
                    <div className="pmos-x-code-shell__traffic">
                      <span />
                      <span />
                      <span />
                    </div>
                    <span className="pmos-x-code-shell__filename">commands.sh</span>
                  </div>
                  <CodeHighlighter lang="bash">{'npm run build:frontend\nnpm run ui:schema:check'}</CodeHighlighter>
                </div>
              </div>
            </div>
          </section>
          <section className="pmos-x-example-section">
            <strong>Semantic DOM</strong>
            <div className="pmos-x-code-shell__caption">
              代码块由文件名、状态条、代码面和说明层组成；语义上应保持为同一个消息内的内容单元，而不是独立工作台卡片。
            </div>
          </section>
          <section className="pmos-x-example-section">
            <strong>Theme Variables</strong>
            <div className="pmos-x-code-grid pmos-x-code-grid--contrast">
              <div className="pmos-x-code-shell__surface pmos-x-code-shell__surface--dark">
                <div className="pmos-x-code-shell__topbar">
                  <div className="pmos-x-code-shell__traffic">
                    <span />
                    <span />
                    <span />
                  </div>
                  <span className="pmos-x-code-shell__filename">token-legend</span>
                </div>
                <div className="pmos-x-code-shell__glow" />
                <div className="pmos-x-code-token-legend">
                  <div className="pmos-x-code-token-legend__item"><span className="pmos-x-code-token-legend__swatch pmos-x-code-token-legend__swatch--keyword" />keyword / const</div>
                  <div className="pmos-x-code-token-legend__item"><span className="pmos-x-code-token-legend__swatch pmos-x-code-token-legend__swatch--string" />string / value</div>
                  <div className="pmos-x-code-token-legend__item"><span className="pmos-x-code-token-legend__swatch pmos-x-code-token-legend__swatch--property" />property / key</div>
                  <div className="pmos-x-code-token-legend__item"><span className="pmos-x-code-token-legend__swatch pmos-x-code-token-legend__swatch--number" />number / count</div>
                </div>
              </div>
              <div className="pmos-x-code-shell__caption">
                用主题变量控制深浅模式、关键字权重、字符串颜色和属性名对比，而不是写死一种壳样式。
              </div>
            </div>
          </section>
        </div>
      );
    case 'mermaid':
      return (
        <div className="pmos-x-example-stack">
          <section className="pmos-x-example-section">
            <strong>Flowchart</strong>
            <Mermaid>{PMCHAT_MERMAID_SAMPLE}</Mermaid>
          </section>
          <section className="pmos-x-example-section">
            <strong>Sequence</strong>
            <Mermaid>{`sequenceDiagram\nUser->>PMChat: 触发组件示例\nPMChat-->>User: 返回当前组件示例`}</Mermaid>
          </section>
          <section className="pmos-x-example-section">
            <strong>State Diagram</strong>
            <Mermaid>{`stateDiagram-v2\n[*] --> 开始\n开始 --> 追问\n追问 --> 确认\n确认 --> 结束`}</Mermaid>
          </section>
        </div>
      );
    case 'sources':
      return (
        <div className="pmos-x-example-stack">
          {renderOfficialMatrixSection({
            title: 'Basic',
            description: '官方基础例子先展示折叠来源列表，核心是 title、items 与默认展开状态。',
            statusLabel: 'basic',
            statusColor: 'blue',
            tags: [{ label: 'title', color: 'blue' }, { label: 'items', color: 'cyan' }, { label: 'collapsed', color: 'default' }],
            children: (
              <div className="pmos-x-showcase-line pmos-x-sources-shell pmos-x-sources-shell--basic">
                <Sources title="Used 3 sources" items={RICH_SOURCES} defaultExpanded={false} />
              </div>
            ),
          })}
          {renderOfficialMatrixSection({
            title: 'Inline',
            description: 'Inline 模式保持在正文引用附近悬浮展开，避免脱离当前回复语义。',
            statusLabel: 'inline',
            statusColor: 'cyan',
            tags: [{ label: 'inline', color: 'cyan' }, { label: 'activeKey', color: 'geekblue' }],
            children: (
              <div className="pmos-x-showcase-line pmos-x-sources-shell pmos-x-sources-shell--inline">
                <Sources inline title="Inline" items={RICH_SOURCES.slice(0, 2)} activeKey="r1" />
              </div>
            ),
          })}
          {renderOfficialMatrixSection({
            title: 'Expand',
            description: '展开态回查 icon 位置和顺序编号，说明层统一放回矩阵头部。',
            statusLabel: 'expanded',
            statusColor: 'geekblue',
            tags: [{ label: 'expandIcon=end', color: 'geekblue' }, { label: 'ordered items', color: 'blue' }],
            children: (
              <div className="pmos-x-showcase-line pmos-x-sources-shell pmos-x-sources-shell--expand">
                <Sources
                  title="Change expand"
                  items={RICH_SOURCES.map((item, index) => ({
                    ...item,
                    title: `${index + 1}. ${item.title}`,
                  }))}
                  defaultExpanded
                  expandIconPosition="end"
                />
              </div>
            ),
          })}
          {renderOfficialMatrixSection({
            title: 'Referenced',
            description: '引用态只保留编号与悬浮来源，不额外叠加解释盒子，语义更接近官方写法。',
            statusLabel: 'referenced',
            statusColor: 'gold',
            tags: [{ label: '[1]', color: 'blue' }, { label: '[2]', color: 'cyan' }, { label: 'inline reference', color: 'gold' }],
            note: '来源应该紧贴当前回复，只保留标题、描述和引用关系，不夹带额外解释块。',
            children: (
              <div className="pmos-x-source-referenced pmos-x-sources-shell pmos-x-sources-shell--referenced">
                <Tag color="blue">[1]</Tag>
                <Tag color="cyan">[2]</Tag>
                <Sources inline title="Referenced" items={RICH_SOURCES.slice(1, 3)} activeKey="r2" />
              </div>
            ),
          })}
        </div>
      );
    case 'think':
    case 'thought-chain':
      return (
        <div className="pmos-x-example-stack">
          {renderOfficialMatrixSection({
            title: 'Basic Usage',
            description: 'Think 官方页先给最小折叠示例，ThoughtChain 只承接当前思考过程，不单独造外层状态面板。',
            statusLabel: 'basic',
            statusColor: 'blue',
            tags: [{ label: 'Think', color: 'blue' }, { label: 'ThoughtChain', color: 'cyan' }, { label: 'collapsed', color: 'default' }],
            children: (
              <Think title="Basic" defaultExpanded={false} className="pmos-x-think-panel">
                <ThoughtChain
                  items={[
                    { key: 'base-1', title: '识别意图', description: '确认当前消息属于思维链示例。', status: 'success' },
                    { key: 'base-2', title: '高光推进', description: '进行中节点保持从左到右的视觉推进感。', status: 'loading', blink: true },
                  ]}
                  defaultExpandedKeys={['base-1', 'base-2']}
                />
              </Think>
            ),
          })}
          {renderOfficialMatrixSection({
            title: 'Status',
            description: '第二组按官方状态示例校正 success / loading / error，不再用额外说明块打断链路。',
            statusLabel: 'status',
            statusColor: 'cyan',
            tags: [{ label: 'success', color: 'success' }, { label: 'loading', color: 'processing' }, { label: 'error', color: 'error' }],
            note: (
              <div className="pmos-x-think-status-row">
                <Tag color="success">success</Tag>
                <Tag color="processing">loading</Tag>
                <Tag color="error">error</Tag>
                <Tag color="default">collapsed</Tag>
              </div>
            ),
            children: (
              <Think title="Status" icon={<CheckCircleFilled />} defaultExpanded={false} className="pmos-x-think-panel">
                <ThoughtChain
                  items={[
                    { key: 'status-1', title: '开始', description: '收到问题并进入识别。', status: 'success' },
                    { key: 'status-2', title: '追问', description: '检查是否需要进一步澄清。', status: 'success' },
                    { key: 'status-3', title: '确认', description: '状态已经完成收口。', status: 'success' },
                    { key: 'status-4', title: '异常', description: '异常态也应留在同一思考块里承接。', status: 'error' },
                  ]}
                  defaultExpandedKeys={['status-1', 'status-2', 'status-3', 'status-4']}
                />
              </Think>
            ),
          })}
          {renderOfficialMatrixSection({
            title: 'Change Expand',
            description: '第三组回查受控展开语义，重点是展开状态仍然属于当前消息，而不是全页工作台流程。',
            statusLabel: 'expanded',
            statusColor: 'geekblue',
            tags: [{ label: 'defaultExpanded', color: 'geekblue' }, { label: 'loading icon', color: 'gold' }, { label: 'blink item', color: 'processing' }],
            note: (
              <div className="pmos-x-think-progress">
                <span className="pmos-x-think-progress__step pmos-x-think-progress__step--done">intent</span>
                <span className="pmos-x-think-progress__step pmos-x-think-progress__step--done">reasoning</span>
                <span className="pmos-x-think-progress__step pmos-x-think-progress__step--active">settling</span>
              </div>
            ),
            children: (
              <Think
                title="Expand"
                loading={<WarningOutlined />}
                defaultExpanded
                className="pmos-x-think-panel pmos-x-think-active"
              >
                <ThoughtChain
                  items={[
                    { key: 'expand-1', title: '先在 chat 内完成', description: '开始、追问、确认、错误、结束都先在 chat 内发生。', status: 'success' },
                    { key: 'expand-2', title: '再展开次级表面', description: '来源、代码、动作都挂在当前消息下面。', status: 'success' },
                    { key: 'expand-3', title: '处理中', description: 'loading 节点保持 blink 与高光推进。', status: 'loading', blink: true },
                  ]}
                  defaultExpandedKeys={['expand-1', 'expand-2', 'expand-3']}
                />
              </Think>
            ),
          })}
          {renderOfficialMatrixSection({
            title: 'Semantic DOM',
            description: '标题、状态、内容区都保持在同一个消息语义块里，符合 Think / ThoughtChain 的官方结构。',
            statusLabel: 'semantic dom',
            statusColor: 'default',
            tags: [{ label: 'status', color: 'default' }, { label: 'content', color: 'default' }],
            children: <div className="pmos-x-think-dom-note">标题、状态和步骤链都保持在同一个消息语义块内，不拆成独立工作面。</div>,
          })}
        </div>
      );
    case 'actions':
      return (
        <div className="pmos-x-example-stack">
          <section className="pmos-x-example-section">
            <strong>Basic</strong>
            <Actions
              items={[
                { key: 'copy', label: '复制' },
                { key: 'retry', label: '重新生成' },
                { key: 'feedback', label: '反馈' },
              ]}
              onClick={({ item }) => notification.open({ title: `动作示例：${item.label}` })}
            />
          </section>
          <section className="pmos-x-example-section">
            <strong>SubItems / Danger</strong>
            <Actions
              items={[
                { key: 'approve', label: '确认' },
                { key: 'rollback', label: '回滚', danger: true },
                { key: 'more', label: '更多', subItems: [{ key: 'export', label: '导出' }, { key: 'share', label: '分享' }] },
              ]}
              onClick={({ item }) => notification.open({ title: `动作示例：${item.label}` })}
            />
          </section>
        </div>
      );
    case 'prompts':
      return (
        <div className="pmos-x-example-stack">
          <section className="pmos-x-example-section">
            <strong>Wrap</strong>
            <Prompts
              wrap
              items={[
                { key: 'req', label: '梳理需求', description: '把输入收束为 requirement' },
                { key: 'prd', label: '生成 PRD', description: '生成结构化产品输出' },
                { key: 'task', label: '拆解任务', description: '把需求继续拆到 task layer' },
              ]}
            />
          </section>
          <section className="pmos-x-example-section">
            <strong>Vertical</strong>
            <Prompts
              title="Vertical"
              vertical
              items={[
                { key: 'review', label: '查看 review', description: '进入 review 治理链' },
                { key: 'acceptance', label: '自动验收', description: '转入 testing acceptance' },
              ]}
            />
          </section>
        </div>
      );
    case 'attachments':
      return (
        <div className="pmos-x-example-stack">
          <section className="pmos-x-example-section">
            <strong>Basic</strong>
            <Attachments
              items={[
                { uid: 'brief', name: 'requirements-brief.md', status: 'done', description: '需求摘要附件' },
                { uid: 'design', name: 'ui-schema-v1.json', status: 'done', description: '界面契约附件' },
              ]}
            />
          </section>
          <section className="pmos-x-example-section">
            <strong>Mixed / Uploading</strong>
            <Attachments
              overflow="scrollX"
              items={[
                { uid: 'audio', name: 'voice-note.m4a', status: 'done', description: '语音输入附件' },
                { uid: 'image', name: 'reference.png', status: 'done', description: '图片输入附件' },
                { uid: 'doc', name: 'brief-v2.docx', status: 'uploading', description: '上传中附件' },
              ]}
            />
          </section>
        </div>
      );
    case 'file-card':
      return (
        <div className="pmos-x-example-stack">
          <section className="pmos-x-example-section">
            <strong>List</strong>
            <FileCard.List
              items={[
                { name: 'src/core/productChiefService.ts', description: '最近修改：implementation handoff / review lane / acceptance lane', icon: 'javascript' },
                { name: 'reference.png', description: '图片类消息附件', icon: 'image' },
              ]}
            />
          </section>
          <section className="pmos-x-example-section pmos-x-filecard-row">
            <strong>Audio / Video / Loading</strong>
            <div className="pmos-x-filecard-grid">
              <FileCard name="voice-note.m4a" description="音频类附件展示" icon="audio" style={{ maxWidth: 360 }} />
              <FileCard name="demo.mp4" description="视频类附件展示" icon="video" style={{ maxWidth: 360 }} />
              <FileCard name="streaming-output.md" description="loading 状态示意" loading style={{ maxWidth: 360 }} />
            </div>
          </section>
        </div>
      );
    case 'folder':
      return (
        <div className="pmos-x-example-stack">
          <section className="pmos-x-example-section">
            <strong>Default Expand All</strong>
            <div className="pmos-x-folder-shell">
              <Folder
                defaultExpandAll
                treeData={[{ title: 'docs', path: 'docs', children: [{ title: 'operations', path: 'docs/operations', children: [{ title: 'ui-pmos-copilot-contract.md', path: 'docs/operations/ui-pmos-copilot-contract.md', content: '# PMChat Contract\none main chat + invoked secondary surfaces' }] }] }]}
              />
            </div>
          </section>
          <section className="pmos-x-example-section">
            <strong>Preview</strong>
            <div className="pmos-x-folder-shell">
              <Folder
                treeData={[{ title: 'src', path: 'src', children: [{ title: 'frontend', path: 'src/frontend', children: [{ title: 'components', path: 'src/frontend/components', children: [{ title: 'PmosXFramework.tsx', path: 'src/frontend/components/PmosXFramework.tsx', content: 'export function PmosXFramework() { /* chat-first */ }' }] }] }]}]}
              />
            </div>
          </section>
        </div>
      );
    case 'markdown':
      return renderMarkdownShowcase();
    case 'notification':
      return (
        <div className="pmos-x-example-stack">
          <section className="pmos-x-example-section">
            <strong>States</strong>
            <div className="pmos-x-notification-grid">
              {NOTIFICATION_CASES.map((item) => (
                <Button
                  key={item.key}
                  className="pmos-x-notification-button"
                  size="small"
                  danger={item.danger}
                  onClick={() => notification.open({ title: `PMChat 通知示例：${item.description}` })}
                >
                  {item.title}
                </Button>
              ))}
            </div>
          </section>
          <section className="pmos-x-example-section">
            <strong>Inline Action</strong>
            <Actions
              items={[
                { key: 'ack', label: '确认' },
                { key: 'dismiss', label: '忽略' },
              ]}
              onClick={({ item }) => notification.open({ title: `通知动作：${item.label}` })}
            />
          </section>
        </div>
      );
    case 'welcome':
      return (
        <div className="pmos-x-example-stack">
          <section className="pmos-x-example-section">
            <strong>Basic</strong>
            <div className="pmos-x-welcome-shell">
              <Welcome
                icon={<RobotOutlined />}
                title="PMChat"
                description="一个 chat-first benchmark，所有次级能力都在消息内展开。"
                extra={<Button size="small" type="text">开始提问</Button>}
              />
            </div>
          </section>
          <section className="pmos-x-example-section">
            <strong>Compact</strong>
            <div className="pmos-x-welcome-shell">
              <Welcome
                icon={<RobotOutlined />}
                title="PMChat"
                description="先在 chat 内完成，再展开次级表面。"
              />
            </div>
          </section>
        </div>
      );
    case 'sender':
      return (
        <div className="pmos-x-example-stack">
          {renderOfficialMatrixSection({
            title: 'Basic / Loading / Disabled',
            description: '官方 sender 先回查输入、加载和禁用三种基础状态，三者使用同一密度和标题语法。',
            statusLabel: 'input states',
            statusColor: 'blue',
            tags: [{ label: 'input', color: 'blue' }, { label: 'loading', color: 'processing' }, { label: 'disabled', color: 'default' }],
            children: (
              <div className="pmos-x-sender-showcase">
                <Sender defaultValue="Hello? this is X!" readOnly />
                <Sender defaultValue="这是一条 loading sender 示例" loading />
                <Sender defaultValue="Set to disabled" disabled />
              </div>
            ),
          })}
          {renderOfficialMatrixSection({
            title: 'Prefix / Suffix',
            description: '前后缀保持作为输入框内部附属区，而不是再包一层说明条。',
            statusLabel: 'toolbar slots',
            statusColor: 'cyan',
            tags: [{ label: 'prefix', color: 'cyan' }, { label: 'suffix', color: 'geekblue' }],
            children: (
              <div className="pmos-x-sender-showcase">
                <Sender
                  defaultValue="带 prefix / suffix 的 sender"
                  prefix={<span style={{ color: '#4c6480', fontSize: 12 }}>Prefix</span>}
                  suffix={<Button size="small" type="text">Suffix</Button>}
                  readOnly
                />
              </div>
            ),
          })}
          {renderOfficialMatrixSection({
            title: 'Reference / Header / Footer',
            description: '最后一组回查 header、reference、footer 三块，继续保持统一标题条和说明层，不再额外散落说明盒子。',
            statusLabel: 'header footer',
            statusColor: 'geekblue',
            tags: [{ label: 'reference', color: 'blue' }, { label: 'header', color: 'cyan' }, { label: 'footer', color: 'gold' }],
            children: (
              <div className="pmos-x-sender-showcase">
                <Sender
                  defaultValue='"Tell more about PMChat"'
                  header={<div className="pmos-x-sender-reference">With Reference</div>}
                  readOnly
                />
                <Sender
                  defaultValue='Tell more about "PMChat"'
                  header={<div className="pmos-x-sender-header">Agent · Files · References</div>}
                  footer={<div className="pmos-x-sender-footer">Shift + Enter to submit</div>}
                  readOnly
                />
              </div>
            ),
          })}
        </div>
      );
    case 'suggestion':
      return (
        <div className="pmos-x-example-stack">
          <section className="pmos-x-example-section">
            <strong>Basic</strong>
            <div className="pmos-x-suggestion-shell">
              <Suggestion
                block
                items={PMCHAT_CASES.slice(0, 6).map((item) => ({ label: item.label, value: item.key }))}
                onSelect={(value) => notification.open({ title: `Suggestion: ${String(value)}` })}
              />
            </div>
          </section>
          <section className="pmos-x-example-section">
            <strong>Chat Trigger</strong>
            <div className="pmos-x-suggestion-shell">
              <Suggestion
                items={PMCHAT_CASES.slice(6, 12).map((item) => ({ label: item.label, value: item.key }))}
                onSelect={(value) => notification.open({ title: `已触发：${String(value)}` })}
              />
            </div>
          </section>
          <section className="pmos-x-example-section">
            <strong>Compact</strong>
            <Space wrap size={[6, 6]}>
              {['Bubble', 'Think', 'Sources', 'CodeHighlighter', 'XMarkdown'].map((item) => (
                <Button key={item} size="small" onClick={() => notification.open({ title: item })}>
                  {item}
                </Button>
              ))}
            </Space>
          </section>
          <section className="pmos-x-example-section">
            <strong>Intent Hints</strong>
            <div className="pmos-x-conversations-note">
              Suggestion 更像意图提示与快捷命令，而不是普通按钮堆叠。
            </div>
          </section>
        </div>
      );
    case 'xprovider':
      return (
        <div className="pmos-x-example-stack">
          <section className="pmos-x-example-section">
            <strong>Current Theme Preset</strong>
            <Space wrap size={[8, 8]}>
              <Tag color="blue">default</Tag>
              <Tag color="cyan">soft</Tag>
              <Tag color="geekblue">sharp</Tag>
            </Space>
            <div className="pmos-x-think-dom-note">当前页面通过左上角设置切换 `default / soft / sharp`，由 XProvider 外层壳统一承接。</div>
          </section>
        </div>
      );
    default:
      return null;
  }
}

export function PmosXFramework({
  selectedSubprojectId,
  sessions,
  messages,
  requirements,
  productChiefOutputs,
  runs,
  reviews,
}: PmosXFrameworkProps) {
  const [draft, setDraft] = useState('');
  const [themePreset, setThemePreset] = useState<'default' | 'soft' | 'sharp'>('default');
  const [codeLanguage, setCodeLanguage] = useState<'ts' | 'json' | 'bash'>('ts');
  const [inspectorView, setInspectorView] = useState<InspectorView>('context');
  const [items, setItems] = useState<PmchatMessage[]>(() => {
    if (messages.length > 0) {
      return messages.slice(-6).map((item, index) => ({
        id: `live_${index}`,
        role: item.role === 'assistant' ? 'assistant' : 'user',
        content: item.content,
      }));
    }
    return [{ id: 'welcome_0', role: 'assistant', content: '直接提问，或从组件示例里触发一种能力效果。' }];
  });
  const [activeConversationKey, setActiveConversationKey] = useState<string>(sessions[0]?.id ?? 'pmchat-home');
  const [isStreaming, setIsStreaming] = useState(false);
  const streamTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const latestRun = runs[0] ?? null;
  const latestRequirement = requirements[0] ?? null;
  const latestOutput = productChiefOutputs[0] ?? null;
  const latestReview = reviews[0] ?? null;
  const pendingApproval = runs.some((run) => run.status === 'blocked');
  const activeConversation = sessions.find((session) => session.id === activeConversationKey) ?? sessions[0] ?? null;

  const conversationItems = useMemo(
    () =>
      sessions.length > 0
        ? sessions.slice(0, 8).map((session, index) => ({
            key: session.id,
            label: session.title?.trim() || createConversationLabel(index),
          }))
        : [{ key: 'pmchat-home', label: 'PMChat' }],
    [sessions],
  );

  const inspectorTabs: Array<{ key: InspectorView; label: string }> = [
    { key: 'context', label: 'Context' },
    { key: 'evidence', label: 'Evidence' },
    { key: 'approval', label: 'Approval' },
    { key: 'trace', label: 'Trace' },
  ];

  const contextItems = [
    { label: 'Scope', value: selectedSubprojectId ?? 'platform' },
    { label: 'Session', value: activeConversation?.title?.trim() || 'PMChat' },
    { label: 'Runs', value: String(runs.length) },
    { label: 'Messages', value: String(messages.length) },
  ];

  const evidenceItems = [
    latestRequirement ? `Requirement: ${latestRequirement.title}` : 'Requirement: pending',
    latestOutput ? `Output summary: ${latestOutput.summary}` : 'Output summary: pending',
    latestReview ? `Review status: ${latestReview.status}` : 'Review status: pending',
  ];

  const traceItems = [
    latestRun ? `Run ${latestRun.id.slice(0, 8)} · ${latestRun.status}` : 'No execution run yet',
    activeConversation ? `Session updated: ${new Date(activeConversation.updatedAt).toLocaleString('zh-CN')}` : 'No active session',
    messages.length > 0 ? `Latest message count: ${messages.length}` : 'No messages yet',
  ];

  const resetToNewConversation = () => {
    if (streamTimer.current) {
      clearInterval(streamTimer.current);
      streamTimer.current = null;
    }
    setIsStreaming(false);
    setActiveConversationKey('pmchat-home');
    setDraft('');
    setItems([{ id: `welcome_${Date.now()}`, role: 'assistant', content: '新对话已开始，直接提问或从组件示例触发。' }]);
  };

  useEffect(() => {
    return () => {
      if (streamTimer.current) clearInterval(streamTimer.current);
    };
  }, []);

  const submit = (value: string) => {
    const normalized = value.trim();
    if (!normalized || isStreaming) return;

    const userMessage: PmchatMessage = { id: `user_${Date.now()}`, role: 'user', content: normalized };
    const assistantTarget = buildAssistantMessage(normalized);
    const fullText = assistantTarget.content;
    let cursor = 0;

    setItems((current) => [...current, userMessage, { ...assistantTarget, content: '' }]);
    setDraft('');
    setIsStreaming(true);

    if (streamTimer.current) clearInterval(streamTimer.current);
    streamTimer.current = setInterval(() => {
      cursor += Math.max(6, Math.ceil(fullText.length / 8));
      const next = fullText.slice(0, cursor);
      setItems((current) => {
        const cloned = [...current];
        const lastIndex = cloned.length - 1;
        cloned[lastIndex] = { ...assistantTarget, content: next };
        return cloned;
      });
      if (cursor >= fullText.length) {
        if (streamTimer.current) clearInterval(streamTimer.current);
        streamTimer.current = null;
        setIsStreaming(false);
      }
    }, 120);
  };

  const handleMessageAction = async (message: PmchatMessage, actionKey: (typeof MESSAGE_ACTIONS)[number]['key']) => {
    if (actionKey === 'copy') {
      try {
        await navigator.clipboard.writeText(message.content);
        notification.open({ title: '已复制当前回复' });
      } catch {
        notification.open({ title: '复制失败，请手动复制' });
      }
      return;
    }

    if (actionKey === 'retry') {
      const retryInput =
        PMCHAT_CASES.find((item) => item.renderCase === message.renderCase)?.key ?? message.content;
      submit(retryInput);
      return;
    }

    notification.open({ title: '已记录反馈入口' });
  };

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1677ff',
          colorInfo: '#1677ff',
          colorBgBase: '#f4f7fb',
          colorBgContainer: '#ffffff',
          colorBgElevated: '#ffffff',
          colorBorder: 'rgba(31, 41, 51, 0.08)',
          colorText: '#1f2933',
          colorTextSecondary: '#60758b',
          colorFillSecondary: 'rgba(22, 119, 255, 0.06)',
          borderRadius: 16,
        },
      }}
    >
      <XProvider>
        <div className={`pmos-x-framework pmos-x-framework--${themePreset}`}>
          <div className="pmos-x-framework__shell">
          <div className="pmos-x-framework__sessions">
            <div className="pmos-x-framework__sessions-topbar">
              <span className="pmos-x-framework__brand">PMChat</span>
              <Space size={4}>
                <Select
                  size="small"
                  value={themePreset}
                  popupMatchSelectWidth={false}
                  onChange={(value) => setThemePreset(value)}
                  options={[
                    { value: 'default', label: '默认' },
                    { value: 'soft', label: '柔和' },
                    { value: 'sharp', label: '锐利' },
                  ]}
                />
                <Button size="small" type="text" onClick={resetToNewConversation}>
                  新对话
                </Button>
              </Space>
            </div>
            <div className="pmos-x-context-card">
              <span className="pmos-x-context-card__eyebrow">Context Rail</span>
              <strong>{selectedSubprojectId ?? 'platform'}</strong>
              <p>统一 chat 入口，按需展开 evidence / approval / trace / structured surfaces。</p>
              <div className="pmos-x-context-card__grid">
                {contextItems.map((item) => (
                  <div key={item.label} className="pmos-x-context-card__metric">
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            </div>
            <Conversations
              items={conversationItems}
              activeKey={activeConversationKey}
              onActiveChange={(key) => {
                setActiveConversationKey(key);
                notification.close();
              }}
              groupable={false}
            />
          </div>
          <div className="pmos-x-framework__chat">
            <div className="pmos-x-framework__suggestion-bar">
              <div className="pmos-x-status-strip">
                <Tag color="blue">chat-first</Tag>
                <Tag color={isStreaming ? 'processing' : 'default'}>{isStreaming ? 'thinking' : 'idle'}</Tag>
                <Tag color={pendingApproval ? 'warning' : 'success'}>{pendingApproval ? 'waiting approval' : 'no approval gate'}</Tag>
                <Tag color={latestRun?.status === 'failed' ? 'error' : latestRun?.status === 'running' ? 'processing' : 'success'}>
                  {latestRun ? `run:${latestRun.status}` : 'run:pending'}
                </Tag>
              </div>
              <Select
                size="middle"
                popupMatchSelectWidth={360}
                className="pmos-x-framework__component-select"
                placeholder="组件示例"
                options={PMCHAT_CASES.map((item) => ({ label: item.label, value: item.key }))}
                onChange={(value) => submit(String(value))}
              />
            </div>
            <div className="pmos-x-main-decision">
              <div className="pmos-x-main-decision__header">
                <span className="pmos-x-main-decision__eyebrow">Current Recommendation</span>
                <Tag color="gold">review</Tag>
              </div>
              <strong>首页保持一个主对话，其他能力作为上下文表面按需出现。</strong>
              <p>Structured output、trace、approval、evidence 都应先服务当前消息，而不是把首页做成多面板后台。</p>
            </div>
            <div className="pmos-x-framework__bubble-stage">
              {items.map((message) => (
                <div key={message.id} className="pmos-x-bubble">
                  <Bubble
                    placement={message.role === 'assistant' ? 'start' : 'end'}
                    avatar={message.role === 'assistant' ? <Avatar size="small" icon={<RobotOutlined />} /> : undefined}
                    content={message.content || (message.role === 'assistant' && isStreaming ? '正在生成…' : '')}
                  />
                  {message.role === 'assistant' && message.content && (
                    <div className="pmos-x-grid">
                      <Think title="本轮思考与证据" defaultExpanded={false} className={message.renderCase === 'thought-chain' ? 'pmos-x-think-panel pmos-x-think-active' : 'pmos-x-think-panel'}>
                        <ThoughtChain
                          items={[
                            { key: 'role', title: '角色识别', description: '先判断当前问题属于哪种组件示例。', status: 'success' },
                            { key: 'answer', title: '主对话承接', description: '先在 chat 内回答，再决定是否展开次级结构。', status: isStreaming ? 'loading' : 'success', blink: isStreaming },
                          ]}
                          defaultExpandedKeys={['role', 'answer']}
                        />
                      </Think>
                      {message.sources && message.sources.length > 0 ? <Sources title="来源" items={message.sources} defaultExpanded={false} /> : null}
                      {message.renderCase ? renderInlineCase(message, { codeLanguage, onCodeLanguageChange: setCodeLanguage }) : null}
                      <div className="pmos-x-inline-actions">
                        <Actions
                          items={MESSAGE_ACTIONS.map((item) => ({ key: item.key, label: item.label, icon: item.icon }))}
                          onClick={({ item }) => handleMessageAction(message, item.key as (typeof MESSAGE_ACTIONS)[number]['key'])}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="pmos-x-framework__composer">
              <Suggestion
                items={PMCHAT_CASES.map((item) => ({ label: item.label, value: item.key }))}
                onSelect={(value) => submit(String(value))}
              />
              <Sender
                value={draft}
                onChange={setDraft}
                onSubmit={submit}
                loading={isStreaming}
                placeholder="输入问题，或直接从组件示例里触发效果。"
              />
            </div>
          </div>
            <aside className="pmos-x-inspector">
              <div className="pmos-x-inspector__topbar">
                <span className="pmos-x-framework__brand">Inspector</span>
                <Tag color="cyan">invoked</Tag>
              </div>
              <div className="pmos-x-inspector__tabs">
                {inspectorTabs.map((item) => (
                  <Button
                    key={item.key}
                    size="small"
                    type={inspectorView === item.key ? 'primary' : 'text'}
                    onClick={() => setInspectorView(item.key)}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
              <div className="pmos-x-inspector__body">
                {inspectorView === 'context' ? (
                  <div className="pmos-x-panel-stack">
                    <section className="pmos-x-panel">
                      <strong>Workspace Context</strong>
                      <p>主聊天始终可见；context rail 与 inspector 只承担辅助理解，不争夺首页主导权。</p>
                    </section>
                    <section className="pmos-x-panel">
                      <strong>Active Sources</strong>
                      <ul>
                        <li>{latestRequirement ? latestRequirement.title : 'No active requirement yet'}</li>
                        <li>{latestOutput ? latestOutput.summary : 'No product output yet'}</li>
                        <li>{latestReview ? `Review ${latestReview.status}` : 'No review result yet'}</li>
                      </ul>
                    </section>
                  </div>
                ) : null}
                {inspectorView === 'evidence' ? (
                  <div className="pmos-x-panel-stack">
                    <section className="pmos-x-panel">
                      <strong>Evidence Refs</strong>
                      <ul>
                        {evidenceItems.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </section>
                    <section className="pmos-x-panel">
                      <strong>Freshness</strong>
                      <p>{latestRun ? `Latest runtime update: ${new Date(latestRun.updatedAt).toLocaleString('zh-CN')}` : 'Runtime freshness pending'}</p>
                    </section>
                  </div>
                ) : null}
                {inspectorView === 'approval' ? (
                  <div className="pmos-x-panel-stack">
                    <section className="pmos-x-panel">
                      <strong>Approval Gate</strong>
                      <p>{pendingApproval ? '存在待人工确认的阻塞运行。' : '当前没有高风险审批阻塞。'}</p>
                      <div className="pmos-x-approval-actions">
                        <Button size="small" type="primary">
                          Approve
                        </Button>
                        <Button size="small">
                          Reject
                        </Button>
                      </div>
                    </section>
                    <section className="pmos-x-panel">
                      <strong>Policy</strong>
                      <p>高风险动作必须带 approval semantics 与 audit trace，不允许静默执行。</p>
                    </section>
                  </div>
                ) : null}
                {inspectorView === 'trace' ? (
                  <div className="pmos-x-panel-stack">
                    <section className="pmos-x-panel">
                      <strong>Execution Trace</strong>
                      <ul>
                        {traceItems.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </section>
                    <section className="pmos-x-panel">
                      <strong>Agent State</strong>
                      <div className="pmos-x-trace-steps">
                        <span className="pmos-x-trace-steps__item pmos-x-trace-steps__item--done">thinking</span>
                        <span className={`pmos-x-trace-steps__item ${isStreaming ? 'pmos-x-trace-steps__item--active' : ''}`}>running</span>
                        <span className="pmos-x-trace-steps__item">reviewing</span>
                        <span className="pmos-x-trace-steps__item">completed</span>
                      </div>
                    </section>
                  </div>
                ) : null}
              </div>
            </aside>
          </div>
        </div>
      </XProvider>
    </ConfigProvider>
  );
}

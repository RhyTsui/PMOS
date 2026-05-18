import { useMemo, useState } from "react";

import { CopyOutlined, DeleteOutlined, PaperClipOutlined, SendOutlined } from "@ant-design/icons";
import { Button, Input, Upload, message } from "antd";
import { YkCard, YkTooltip } from "@yoka-ui/ui";

import {
  aiAssistantBuiltinEntries,
  aiAssistantInitialMessages,
  createAiAssistantReply,
} from "../data/aiAssistantData";

function copyAccessKey(accessKey) {
  navigator.clipboard.writeText(accessKey);
  message.success("key 已复制");
}

function formatNow() {
  return new Date().toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default function AIAssistantPage() {
  const [messages, setMessages] = useState(aiAssistantInitialMessages);
  const [prompt, setPrompt] = useState("");
  const [fileList, setFileList] = useState([]);
  const capabilityEntries = [
    { key: "requirement-check", label: "需求补全", prompt: "帮我检查当前埋点需求是否缺事件、步骤、L1层参数、验收标准和上报示例。" },
    { key: "rule-draft", label: "规则生成", prompt: "基于当前事件和参数，生成一批动态校验规则。" },
    { key: "report-summary", label: "报告整理", prompt: "根据当前验收结果，生成一版简报和详细报告结构。" },
  ];

  const builtinNodes = useMemo(
    () =>
      aiAssistantBuiltinEntries.map((item) => (
        <YkTooltip
          key={item.key}
          title={
            <div className="ta-ai-key-tooltip">
              <strong>{item.title}</strong>
              <span>{item.description}</span>
              <div className="ta-ai-key-row">
                <code>{item.accessKey}</code>
                <Button type="text" size="small" icon={<CopyOutlined />} onClick={() => copyAccessKey(item.accessKey)}>
                  复制key
                </Button>
              </div>
            </div>
          }
        >
          <button type="button" className="ta-ai-builtin-chip">
            <span>{item.title}</span>
          </button>
        </YkTooltip>
      )),
    []
  );
  const capabilityStatusItems = useMemo(
    () => [
      { key: "chat", label: "自写 Chat", value: "已启用" },
      { key: "multi-turn", label: "多轮会话", value: `${messages.length} 条消息` },
      { key: "files", label: "文件上传", value: fileList.length ? `${fileList.length} 个待发送` : "可上传" },
      { key: "builtin-count", label: "内置能力", value: `${aiAssistantBuiltinEntries.length} 项` },
    ],
    [fileList.length, messages.length]
  );

  function appendAssistantMessage(content, attachments = []) {
    setMessages((current) => [
      ...current,
      {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content,
        attachments,
        createdAt: formatNow(),
      },
    ]);
  }

  function handleSend(customPrompt) {
    const nextPrompt = (customPrompt ?? prompt).trim();
    if (!nextPrompt && fileList.length === 0) {
      message.warning("请输入问题或上传文件");
      return;
    }

    const attachments = fileList.map((item) => ({
      uid: item.uid,
      name: item.name,
      size: item.size,
    }));

    setMessages((current) => [
      ...current,
      {
        id: `user-${Date.now()}`,
        role: "user",
        content: nextPrompt || "上传附件",
        attachments,
        createdAt: formatNow(),
      },
    ]);

    appendAssistantMessage(createAiAssistantReply(nextPrompt, attachments), attachments);
    setPrompt("");
    setFileList([]);
  }

  return (
    <div className="ta-ai-page">
      <div className="ta-ai-layout">
        <YkCard bordered={false} className="ta-card ta-ai-chat-card">
          <div className="ta-ai-header">
            <div className="ta-ai-header-title">
              <strong>AI助手</strong>
              <span>会话优先，支持多轮追问、文件上传、内置 MCP 与知识库能力。</span>
            </div>
          </div>

          <div className="ta-ai-example-list">
            {capabilityEntries.map((item) => (
              <button
                key={item.key}
                type="button"
                className="ta-ai-example-chip"
                onClick={() => handleSend(item.prompt)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="ta-ai-composer-builtins">{builtinNodes}</div>

          <div className="ta-ai-chat-thread">
            {messages.map((item) => (
              <div
                key={item.id}
                className={`ta-ai-bubble ${item.role === "assistant" ? "is-assistant" : "is-user"}`}
              >
                <span className="ta-ai-bubble-role">
                  {item.role === "assistant" ? "AI助手" : "当前用户"} · {item.createdAt}
                </span>
                <p>{item.content}</p>
                {item.attachments?.length > 0 ? (
                  <div className="ta-ai-attachment-list">
                    {item.attachments.map((attachment) => (
                      <span key={attachment.uid} className="ta-ai-attachment-chip">
                        <PaperClipOutlined />
                        {attachment.name}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          <div className="ta-ai-chat-composer">
            <div className="ta-ai-composer-toolbar">
              <Upload
                multiple
                beforeUpload={() => false}
                fileList={fileList}
                onChange={({ fileList: nextList }) => setFileList(nextList)}
                itemRender={(_, file) => (
                  <div className="ta-ai-upload-item" key={file.uid}>
                    <span className="ta-ai-upload-name">
                      <PaperClipOutlined />
                      {file.name}
                    </span>
                    <button
                      type="button"
                      className="ta-table-link is-danger"
                      onClick={() => setFileList((current) => current.filter((item) => item.uid !== file.uid))}
                    >
                      删除
                    </button>
                  </div>
                )}
              >
                <Button icon={<PaperClipOutlined />}>上传文件</Button>
              </Upload>
            </div>

            <Input.TextArea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="请输入你的问题，或上传文件后继续追问"
              autoSize={{ minRows: 4, maxRows: 8 }}
            />

            <div className="ta-ai-composer-actions">
              <Button
                icon={<DeleteOutlined />}
                onClick={() => {
                  setPrompt("");
                  setFileList([]);
                }}
              >
                清空
              </Button>
              <Button type="primary" icon={<SendOutlined />} onClick={() => handleSend()}>
                发送
              </Button>
            </div>
          </div>
        </YkCard>

        <div className="ta-ai-side">
          <YkCard bordered={false} className="ta-card ta-ai-side-block">
            <div className="ta-card-head">
              <span className="ta-section-title">能力入口</span>
            </div>
            <div className="ta-ai-example-list">
              {capabilityEntries.map((item) => (
                <button key={item.key} type="button" className="ta-ai-example-chip" onClick={() => setPrompt(item.prompt)}>
                  {item.label}
                </button>
              ))}
            </div>
          </YkCard>

          <YkCard bordered={false} className="ta-card ta-ai-side-block">
            <div className="ta-card-head">
              <span className="ta-section-title">能力状态</span>
            </div>
            <div className="ta-summary-strip ta-summary-strip-single">
              {capabilityStatusItems.map((item) => (
                <div key={item.key} className="ta-summary-strip-item">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </YkCard>

          <YkCard bordered={false} className="ta-card ta-ai-side-block">
            <div className="ta-card-head">
              <span className="ta-section-title">知识与上下文</span>
            </div>
            <div className="ta-ai-context-list">
              <div className="ta-ai-context-item">
                <strong>内置MCP</strong>
                <span>可直接读取需求、规则、查询结果、验收报告上下文。</span>
              </div>
              <div className="ta-ai-context-item">
                <strong>内置知识库</strong>
                <span>可继续追问详细需求真源、设计规范、规则模板和历史案例。</span>
              </div>
            </div>
          </YkCard>

          <YkCard bordered={false} className="ta-card ta-ai-side-block">
            <div className="ta-card-head">
              <span className="ta-section-title">当前会话</span>
            </div>
            <div className="ta-summary-strip ta-summary-strip-single">
              <div className="ta-summary-strip-item">
                <span>消息数</span>
                <strong>{messages.length}</strong>
              </div>
              <div className="ta-summary-strip-item">
                <span>待发送附件</span>
                <strong>{fileList.length}</strong>
              </div>
            </div>
          </YkCard>
        </div>
      </div>
    </div>
  );
}

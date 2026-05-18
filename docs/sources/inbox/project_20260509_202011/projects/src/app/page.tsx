'use client';

import { AgentProvider, useAgent } from '@/hooks/useAgent';
import { useConversation } from '@/hooks/useConversation';
import { Header } from '@/components/cognitive/Header';
import { ChatContainer } from '@/components/cognitive/ChatContainer';
import { InputArea } from '@/components/cognitive/InputArea';
import { AgentDock } from '@/components/cognitive/AgentDock';
import { ResultPanel } from '@/components/workspace/ResultPanel';
import { TaskSidebar } from '@/components/workspace/TaskSidebar';

function WorkspaceContent() {
  const {
    activeTaskContext,
    activeResult, uiState, attachments, conversationMode,
    missingFields, toggleTaskSidebar, toggleResultPanel,
  } = useAgent();

  const {
    messages, isTyping, currentRouting, sendMessage, currentAgent, agentMeta,
  } = useConversation();

  const handleMissingFieldClick = (field: import('@/types').MissingField) => {
    sendMessage(field.suggested_question);
  };

  const handleFollowUpClick = (question: string) => {
    sendMessage(question);
  };

  const handleUpgradeWorkflow = (target: string) => {
    void target;
  };

  const showResult = uiState.showResultPanel;
  const showTask = uiState.showTaskSidebar;

  return (
    <div className="h-screen flex flex-col bg-[#0A0E1A]">
      {/* Top Status Bar */}
      <Header />

      {/* Main Content - Three Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column - Chat Area (expands to fill when panels collapsed) */}
        <div className={`flex flex-col min-w-0 ${showResult ? 'w-[42%] border-r border-[rgba(255,255,255,0.06)]' : 'flex-1'}`}>
          {/* Chat Container */}
          <div className="flex-1 overflow-hidden">
            <ChatContainer
              messages={messages}
              isTyping={isTyping}
              onSendMessage={sendMessage}
              currentAgent={currentAgent}
              agentMeta={agentMeta}
            />
          </div>

          {/* Input Area */}
          <InputArea
            onSendMessage={sendMessage}
            isTyping={isTyping}
            currentRouting={currentRouting}
            conversationMode={conversationMode}
            taskContext={activeTaskContext}
          />

          {/* Agent Dock */}
          <AgentDock />
        </div>

        {/* Middle Column - Result Panel */}
        {showResult && (
          <div className="flex flex-col border-r border-[rgba(255,255,255,0.06)] w-[33%]">
            <ResultPanel
              result={activeResult}
              missingFields={missingFields}
              attachments={attachments}
              onMissingFieldClick={handleMissingFieldClick}
              onFollowUpClick={handleFollowUpClick}
              onUpgradeWorkflow={handleUpgradeWorkflow}
              isCollapsed={false}
            />
          </div>
        )}

        {/* Right Column - Task Sidebar */}
        {showTask && (
          <div className="w-[25%] min-w-0">
            <TaskSidebar />
          </div>
        )}

        {/* Floating expand buttons - only when both panels collapsed */}
        {!showResult && !showTask && (
          <div className="flex flex-col items-center justify-center gap-3 w-9 border-l border-[rgba(255,255,255,0.06)]">
            <button
              onClick={toggleResultPanel}
              className="p-1.5 rounded hover:bg-[rgba(255,255,255,0.08)] transition-colors"
              title="展开结构化结果区"
            >
              <svg className="w-4 h-4 text-[var(--aifs-text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button
              onClick={toggleTaskSidebar}
              className="p-1.5 rounded hover:bg-[rgba(255,255,255,0.08)] transition-colors"
              title="展开历史任务"
            >
              <svg className="w-4 h-4 text-[var(--aifs-text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}

        {/* Expand result panel only (task sidebar is open) */}
        {!showResult && showTask && (
          <button
            onClick={toggleResultPanel}
            className="flex items-center justify-center w-8 border-r border-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
            title="展开结构化结果区"
          >
            <svg className="w-3.5 h-3.5 text-[var(--aifs-text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {/* Expand task sidebar only (result panel is open) */}
        {showResult && !showTask && (
          <button
            onClick={toggleTaskSidebar}
            className="flex items-center justify-center w-8 border-l border-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
            title="展开历史任务"
          >
            <svg className="w-3.5 h-3.5 text-[var(--aifs-text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <AgentProvider>
      <WorkspaceContent />
    </AgentProvider>
  );
}

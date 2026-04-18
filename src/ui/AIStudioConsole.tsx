/**
 * AI Studio 控制台 - React 组件
 *
 * 功能:
 * - Workflow Tree / Stage Navigation
 * - LangGraph Execution Flow 可视化
 * - Agent 状态流
 * - PRD/Flow Chart/UI Schema/Architecture 展示
 * - Run / Retry / Compare / Fork 操作
 */

import React, { useState, useEffect } from 'react';

// ========================
// 类型定义
// ========================
interface AgentView {
  role: string;
  output: string;
  timestamp: string;
  confidence: number;
  analysis: {
    dimension: string;
    factors: string[];
  };
}

interface ReviewResult {
  score: number;
  decision: 'approve' | 'reject' | 'revise';
  feedback: string;
  scores: {
    ROI: number;
    user_value: number;
    executable: number;
    ai_potential: number;
  };
}

interface PRD {
  idea: string;
  business_analysis: string;
  user_analysis: string;
  data_metrics: string;
  ai_automation: string;
  technical_feasibility: string;
  multiple_solutions: Array<{
    type: string;
    description: string;
    pros: string[];
    cons: string[];
  }>;
}

interface WorkflowState {
  idea: string;
  views: AgentView[];
  prd: PRD | null;
  review: ReviewResult | null;
  decision: string;
  artifacts: Record<string, unknown>;
  iteration: number;
}

// ========================
// 主组件
// ========================
export function AIStudioConsole() {
  const [idea, setIdea] = useState('AI 广告系统');
  const [workflowState, setWorkflowState] = useState<WorkflowState | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<'flow' | 'prd' | 'agents' | 'review'>('flow');
  const [viewMode, setViewMode] = useState<'dashboard' | 'flow' | 'table'>('dashboard');

  // 运行工作流
  const runWorkflow = async () => {
    setIsRunning(true);
    try {
      const response = await fetch('/api/workflow/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea }),
      });
      const result = await response.json();
      setWorkflowState(result);
    } catch (error) {
      console.error('工作流执行失败:', error);
    } finally {
      setIsRunning(false);
    }
  };

  // 重试
  const retryWorkflow = () => {
    setWorkflowState(null);
    runWorkflow();
  };

  // 比较方案
  const compareSolutions = () => {
    if (workflowState?.prd?.multiple_solutions) {
      console.log('方案对比:', workflowState.prd.multiple_solutions);
    }
  };

  // Fork 新项目
  const forkProject = () => {
    const newIdea = prompt('输入新的产品创意:', idea);
    if (newIdea) {
      setIdea(newIdea);
      setWorkflowState(null);
    }
  };

  return (
    <div className="ai-studio-console">
      {/* 顶部工具栏 */}
      <header className="console-header">
        <h1>🚀 PMAIOS AI Studio</h1>
        <div className="toolbar">
          <button onClick={runWorkflow} disabled={isRunning}>
            {isRunning ? '运行中...' : '▶ Run'}
          </button>
          <button onClick={retryWorkflow} disabled={!workflowState}>
            🔄 Retry
          </button>
          <button onClick={compareSolutions} disabled={!workflowState?.prd?.multiple_solutions}>
            ⚖ Compare
          </button>
          <button onClick={forkProject}>
            🍴 Fork
          </button>
        </div>
      </header>

      {/* 主体内容 */}
      <div className="console-body">
        {/* 左侧 - 导航 */}
        <aside className="sidebar">
          <div className="workflow-tree">
            <h3>Workflow</h3>
            <ul>
              <li className={activeTab === 'flow' ? 'active' : ''} onClick={() => setActiveTab('flow')}>
                📊 Execution Flow
              </li>
              <li className={activeTab === 'agents' ? 'active' : ''} onClick={() => setActiveTab('agents')}>
                🤖 Multi-Agent
              </li>
              <li className={activeTab === 'prd' ? 'active' : ''} onClick={() => setActiveTab('prd')}>
                📄 PRD
              </li>
              <li className={activeTab === 'review' ? 'active' : ''} onClick={() => setActiveTab('review')}>
                ✅ Review Gate
              </li>
            </ul>
          </div>

          <div className="view-mode">
            <h3>View Mode</h3>
            <button className={viewMode === 'dashboard' ? 'active' : ''} onClick={() => setViewMode('dashboard')}>
              Dashboard
            </button>
            <button className={viewMode === 'flow' ? 'active' : ''} onClick={() => setViewMode('flow')}>
              Flow View
            </button>
            <button className={viewMode === 'table' ? 'active' : ''} onClick={() => setViewMode('table')}>
              Table View
            </button>
          </div>
        </aside>

        {/* 中间 - 主内容区 */}
        <main className="main-content">
          {activeTab === 'flow' && <ExecutionFlowView state={workflowState} viewMode={viewMode} />}
          {activeTab === 'agents' && <MultiAgentView state={workflowState} />}
          {activeTab === 'prd' && <PRDView prd={workflowState?.prd || null} />}
          {activeTab === 'review' && <ReviewGateView review={workflowState?.review || null} />}
        </main>

        {/* 右侧 - 详情面板 */}
        <aside className="details-panel">
          <h3>Quick Stats</h3>
          {workflowState ? (
            <div className="stats">
              <div className="stat">
                <span className="label">Decision</span>
                <span className={`value ${workflowState.decision}`}>{workflowState.decision}</span>
              </div>
              <div className="stat">
                <span className="label">Score</span>
                <span className="value">{workflowState.review?.score || 'N/A'}/100</span>
              </div>
              <div className="stat">
                <span className="label">Agents</span>
                <span className="value">{workflowState.views?.length || 0}</span>
              </div>
              <div className="stat">
                <span className="label">Iteration</span>
                <span className="value">v{workflowState.iteration}.0</span>
              </div>
            </div>
          ) : (
            <p className="empty-state">点击 Run 开始生成产品</p>
          )}

          <div className="architecture-diagram">
            <h3>Architecture</h3>
            <pre>
{`┌─────────────────┐
│   Agent Core    │
│ Business/User   │
│ Data/AI/Tech    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Synthesizer   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Review Gate   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Presentation   │
└─────────────────┘`}
            </pre>
          </div>
        </aside>
      </div>

      {/* 底部 - 操作栏 */}
      <footer className="console-footer">
        <div className="input-area">
          <input
            type="text"
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="输入产品创意..."
            onKeyDown={(e) => e.key === 'Enter' && runWorkflow()}
          />
        </div>
      </footer>
    </div>
  );
}

// ========================
// 子组件
// ========================

function ExecutionFlowView({ state, viewMode }: { state: WorkflowState | null; viewMode: string }) {
  if (!state) {
    return (
      <div className="empty-view">
        <p>工作流尚未运行</p>
        <p className="hint">在底部输入产品创意并点击 Run</p>
      </div>
    );
  }

  const stages = [
    { id: 'idea', label: 'IDEA', status: 'completed' },
    { id: 'business', label: 'Business', status: state.views.some(v => v.role === 'business_analyst') ? 'completed' : 'pending' },
    { id: 'user', label: 'User', status: state.views.some(v => v.role === 'user_researcher') ? 'completed' : 'pending' },
    { id: 'data', label: 'Data', status: state.views.some(v => v.role === 'data_scientist') ? 'completed' : 'pending' },
    { id: 'ai', label: 'AI', status: state.views.some(v => v.role === 'ai_architect') ? 'completed' : 'pending' },
    { id: 'tech', label: 'Tech', status: state.views.some(v => v.role === 'tech_lead') ? 'completed' : 'pending' },
    { id: 'synth', label: 'Synthesize', status: state.prd ? 'completed' : 'pending' },
    { id: 'review', label: 'Review', status: state.review ? 'completed' : 'pending' },
    { id: 'output', label: 'Output', status: state.decision ? 'completed' : 'pending' },
  ];

  if (viewMode === 'table') {
    return (
      <table className="flow-table">
        <thead>
          <tr>
            <th>Stage</th>
            <th>Status</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          {stages.map(stage => (
            <tr key={stage.id}>
              <td>{stage.label}</td>
              <td><span className={`status ${stage.status}`}>{stage.status}</span></td>
              <td>{stage.status === 'completed' ? '✓' : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  return (
    <div className="flow-chart">
      <div className="flow-nodes">
        {stages.map((stage, index) => (
          <div key={stage.id} className={`flow-node ${stage.status}`}>
            <div className="node-label">{stage.label}</div>
            {index < stages.length - 1 && <div className="flow-arrow">↓</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function MultiAgentView({ state }: { state: WorkflowState | null }) {
  if (!state?.views?.length) {
    return <div className="empty-view"><p>暂无 Agent 输出</p></div>;
  }

  return (
    <div className="agent-grid">
      {state.views.map((view, index) => (
        <div key={index} className="agent-card">
          <div className="agent-header">
            <h4>{view.role.replace('_', ' ')}</h4>
            <span className="confidence">{(view.confidence * 100).toFixed(0)}%</span>
          </div>
          <div className="agent-dimension">{view.analysis.dimension}</div>
          <div className="agent-factors">
            {view.analysis.factors.map((f, i) => (
              <span key={i} className="factor-tag">{f}</span>
            ))}
          </div>
          <div className="agent-output">{view.output.slice(0, 200)}...</div>
        </div>
      ))}
    </div>
  );
}

function PRDView({ prd }: { prd: PRD | null }) {
  if (!prd) {
    return <div className="empty-view"><p>暂无 PRD</p></div>;
  }

  return (
    <div className="prd-view">
      <h2>{prd.idea}</h2>

      <section>
        <h3>商业分析</h3>
        <p>{prd.business_analysis}</p>
      </section>

      <section>
        <h3>用户分析</h3>
        <p>{prd.user_analysis}</p>
      </section>

      <section>
        <h3>数据指标</h3>
        <p>{prd.data_metrics}</p>
      </section>

      <section>
        <h3>AI 自动化</h3>
        <p>{prd.ai_automation}</p>
      </section>

      <section>
        <h3>技术可行性</h3>
        <p>{prd.technical_feasibility}</p>
      </section>

      {prd.multiple_solutions && (
        <section>
          <h3>多方案对比</h3>
          <div className="solutions-grid">
            {prd.multiple_solutions.map((sol, i) => (
              <div key={i} className="solution-card">
                <h4>{sol.type}</h4>
                <p>{sol.description}</p>
                <div className="pros-cons">
                  <div className="pros">
                    <strong>Pros:</strong>
                    <ul>{sol.pros.map((p, j) => <li key={j}>{p}</li>)}</ul>
                  </div>
                  <div className="cons">
                    <strong>Cons:</strong>
                    <ul>{sol.cons.map((c, j) => <li key={j}>{c}</li>)}</ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ReviewGateView({ review }: { review: ReviewResult | null }) {
  if (!review) {
    return <div className="empty-view"><p>暂无评审结果</p></div>;
  }

  const scoreColor = review.score >= 80 ? 'green' : review.score >= 60 ? 'yellow' : 'red';

  return (
    <div className="review-view">
      <div className="score-display">
        <div className="score-circle" style={{ borderColor: scoreColor }}>
          <span className="score-value" style={{ color: scoreColor }}>{review.score}</span>
        </div>
        <div className="decision">{review.decision.toUpperCase()}</div>
      </div>

      <p className="feedback">{review.feedback}</p>

      <div className="score-breakdown">
        <h4>维度评分</h4>
        <div className="score-bars">
          <ScoreBar label="ROI" value={review.scores.ROI} />
          <ScoreBar label="User Value" value={review.scores.user_value} />
          <ScoreBar label="Executable" value={review.scores.executable} />
          <ScoreBar label="AI Potential" value={review.scores.ai_potential} />
        </div>
      </div>
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const percentage = (value / 100) * 100;
  return (
    <div className="score-bar">
      <span className="bar-label">{label}</span>
      <div className="bar-track">
        <div className="bar-fill" style={{ width: `${percentage}%` }} />
      </div>
      <span className="bar-value">{value}</span>
    </div>
  );
}

// ========================
// 样式
// ========================
const styles = `
.ai-studio-console {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #1a1a2e;
  color: #eee;
  font-family: 'Segoe UI', sans-serif;
}

.console-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background: #16213e;
  border-bottom: 1px solid #0f3460;
}

.toolbar button {
  margin-left: 0.5rem;
  padding: 0.5rem 1rem;
  background: #e94560;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.toolbar button:hover:not(:disabled) {
  background: #ff6b6b;
}

.toolbar button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.console-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.sidebar {
  width: 200px;
  background: #16213e;
  padding: 1rem;
  border-right: 1px solid #0f3460;
}

.sidebar h3 {
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  color: #888;
}

.sidebar ul {
  list-style: none;
  padding: 0;
}

.sidebar li {
  padding: 0.5rem;
  cursor: pointer;
  border-radius: 4px;
  margin-bottom: 0.25rem;
}

.sidebar li:hover, .sidebar li.active {
  background: #0f3460;
}

.view-mode button {
  display: block;
  width: 100%;
  margin-bottom: 0.25rem;
  padding: 0.5rem;
  background: transparent;
  border: 1px solid #0f3460;
  color: #eee;
  border-radius: 4px;
  cursor: pointer;
}

.view-mode button.active {
  background: #0f3460;
}

.main-content {
  flex: 1;
  padding: 2rem;
  overflow-y: auto;
}

.details-panel {
  width: 250px;
  background: #16213e;
  padding: 1rem;
  border-left: 1px solid #0f3460;
}

.stats {
  margin-bottom: 2rem;
}

.stat {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid #0f3460;
}

.stat .value.approve { color: #4ade80; }
.stat .value.reject { color: #f87171; }
.stat .value.revise { color: #fbbf24; }

.empty-view, .empty-state {
  text-align: center;
  color: #666;
  padding: 3rem;
}

.flow-chart {
  display: flex;
  justify-content: center;
}

.flow-node {
  padding: 1rem 2rem;
  background: #0f3460;
  border-radius: 8px;
  margin: 0.5rem;
  text-align: center;
}

.flow-node.completed {
  background: #16a34a;
}

.flow-node.pending {
  opacity: 0.5;
}

.agent-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
}

.agent-card {
  background: #16213e;
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid #0f3460;
}

.agent-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.confidence {
  background: #0f3460;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
}

.factor-tag {
  display: inline-block;
  background: #0f3460;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  margin: 0.25rem 0.25rem 0 0;
  font-size: 0.8rem;
}

.agent-output {
  margin-top: 1rem;
  color: #aaa;
  font-size: 0.9rem;
  white-space: pre-wrap;
}

.solutions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.solution-card {
  background: #16213e;
  padding: 1rem;
  border-radius: 8px;
}

.pros-cons {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}

.pros, .cons {
  flex: 1;
}

.pros ul { color: #4ade80; }
.cons ul { color: #f87171; }

.score-display {
  text-align: center;
  margin-bottom: 2rem;
}

.score-circle {
  width: 120px;
  height: 120px;
  border: 8px solid;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1rem;
}

.score-value {
  font-size: 2.5rem;
  font-weight: bold;
}

.decision {
  font-size: 1.5rem;
  text-transform: uppercase;
}

.score-bar {
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;
}

.bar-label {
  width: 100px;
  font-size: 0.9rem;
}

.bar-track {
  flex: 1;
  height: 20px;
  background: #0f3460;
  border-radius: 4px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #e94560, #ff6b6b);
  transition: width 0.3s;
}

.bar-value {
  width: 40px;
  text-align: right;
  font-weight: bold;
}

.console-footer {
  padding: 1rem 2rem;
  background: #16213e;
  border-top: 1px solid #0f3460;
}

.input-area input {
  width: 100%;
  padding: 1rem;
  background: #1a1a2e;
  border: 1px solid #0f3460;
  color: #eee;
  border-radius: 4px;
  font-size: 1rem;
}

.input-area input:focus {
  outline: none;
  border-color: #e94560;
}

.flow-table {
  width: 100%;
  border-collapse: collapse;
}

.flow-table th, .flow-table td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid #0f3460;
}

.status.completed { color: #4ade80; }
.status.pending { color: #666; }

pre {
  background: #1a1a2e;
  padding: 1rem;
  border-radius: 8px;
  overflow-x: auto;
  font-size: 0.8rem;
}
`;

// 注入样式
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

export default AIStudioConsole;

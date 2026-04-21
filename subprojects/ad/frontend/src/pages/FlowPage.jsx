import { useEffect, useMemo, useState } from "react";

import { getIntegrationPoc } from "../api/client";

const STATUS_LABELS = {
  pending: "待执行",
  running: "执行中",
  success: "已通过",
  info: "后续增强",
};

function buildReplayState(steps, events, activeCount) {
  const statusMap = Object.fromEntries(steps.map((step) => [step.id, step.status]));
  const visibleEvents = events.slice(0, activeCount);

  visibleEvents.forEach((event) => {
    statusMap[event.step_id] = event.step_status;
  });

  return {
    statusMap,
    visibleEvents,
  };
}

export default function FlowPage() {
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedStepId, setSelectedStepId] = useState("");
  const [replayCount, setReplayCount] = useState(0);
  const [replayRunning, setReplayRunning] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadWorkspace() {
      setLoading(true);
      setError("");

      try {
        const response = await getIntegrationPoc();
        if (!mounted) {
          return;
        }
        setWorkspace(response);
        setSelectedStepId(response.steps[0]?.id ?? "");
      } catch (loadError) {
        if (!mounted) {
          return;
        }
        setError("Failed to load the integration PoC workspace. Make sure the backend is running.");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadWorkspace();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!workspace || !replayRunning) {
      return undefined;
    }

    if (replayCount >= workspace.replay_events.length) {
      setReplayRunning(false);
      return undefined;
    }

    const nextEvent = workspace.replay_events[replayCount];
    const previousOffset = replayCount === 0 ? 0 : workspace.replay_events[replayCount - 1].offset_ms;
    const delay = nextEvent.offset_ms - previousOffset;

    const timer = window.setTimeout(() => {
      setReplayCount((count) => count + 1);
      setSelectedStepId(nextEvent.step_id);
    }, delay);

    return () => window.clearTimeout(timer);
  }, [workspace, replayCount, replayRunning]);

  const replayState = useMemo(() => {
    if (!workspace) {
      return { statusMap: {}, visibleEvents: [] };
    }

    return buildReplayState(workspace.steps, workspace.replay_events, replayCount);
  }, [workspace, replayCount]);

  const selectedStep = useMemo(() => {
    if (!workspace) {
      return null;
    }

    return workspace.steps.find((step) => step.id === selectedStepId) ?? workspace.steps[0] ?? null;
  }, [workspace, selectedStepId]);

  const completedCount = useMemo(() => {
    return Object.values(replayState.statusMap).filter((status) => status === "success").length;
  }, [replayState.statusMap]);

  const mandatoryCompleted = useMemo(() => {
    if (!workspace) {
      return 0;
    }

    return workspace.steps
      .filter((step) => step.index <= 8)
      .filter((step) => replayState.statusMap[step.id] === "success").length;
  }, [workspace, replayState.statusMap]);

  const handleReplay = () => {
    setReplayCount(0);
    setReplayRunning(true);
    if (workspace?.steps[0]) {
      setSelectedStepId(workspace.steps[0].id);
    }
  };

  return (
    <main className="page page-workbench">
      <header className="hero hero-workbench">
        <div className="hero-copy">
          <p className="eyebrow">integration poc</p>
          <h1>{workspace?.title ?? "安卓联调工作台"}</h1>
          <p className="subtitle">{workspace?.subtitle ?? "聚焦首轮跑通主链路。"}</p>
          {workspace ? (
            <div className="scope-pills">
              <span>{workspace.scope.media}</span>
              <span>{workspace.scope.game}</span>
              <span>{workspace.scope.device_path}</span>
              {workspace.scope.acceptance.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          ) : null}
        </div>
        <div className="hero-side panel">
          <p className="panel-label">首轮状态</p>
          <strong className="hero-stat">{mandatoryCompleted}/8</strong>
          <p className="hero-detail">主链路必经步骤已通过</p>
          <button className="primary-button" type="button" onClick={handleReplay} disabled={!workspace || replayRunning}>
            {replayRunning ? "回放进行中..." : "回放首轮跑通"}
          </button>
        </div>
      </header>

      {loading ? <p className="empty">Loading integration PoC workspace...</p> : null}
      {error ? <p className="error-message">{error}</p> : null}

      {!loading && !error && workspace ? (
        <>
          <section className="summary-grid">
            {workspace.summary_cards.map((card) => (
              <article key={card.title} className={`panel summary-card tone-${card.tone}`}>
                <p className="panel-label">{card.title}</p>
                <strong>{card.value}</strong>
                <p>{card.detail}</p>
              </article>
            ))}
          </section>

          <section className="workbench-grid">
            <div className="workbench-main">
              <section className="panel">
                <div className="section-head">
                  <div>
                    <p className="panel-label">准备清单</p>
                    <h2>首轮固定条件</h2>
                  </div>
                  <span className="meta-chip">{workspace.checklist.filter((item) => item.status === "ready").length}/{workspace.checklist.length} ready</span>
                </div>
                <div className="checklist">
                  {workspace.checklist.map((item) => (
                    <article key={item.id} className="checklist-item">
                      <div className="checklist-status">{item.status === "ready" ? "Ready" : "Pending"}</div>
                      <div>
                        <strong>{item.title}</strong>
                        <p>{item.detail}</p>
                        <span>{item.owner}</span>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="panel">
                <div className="section-head">
                  <div>
                    <p className="panel-label">端到端步骤</p>
                    <h2>Step 1-10</h2>
                  </div>
                  <span className="meta-chip">{completedCount} steps done</span>
                </div>
                <div className="step-list">
                  {workspace.steps.map((step) => {
                    const currentStatus = replayState.statusMap[step.id] ?? step.status;
                    const isSelected = selectedStep?.id === step.id;

                    return (
                      <button
                        key={step.id}
                        type="button"
                        className={`step-card step-status-${currentStatus} ${isSelected ? "step-selected" : ""}`}
                        onClick={() => setSelectedStepId(step.id)}
                      >
                        <div className="step-index">{step.index}</div>
                        <div className="step-body">
                          <div className="step-topline">
                            <span className="step-stage">{step.stage}</span>
                            <span className="step-status-label">{STATUS_LABELS[currentStatus] ?? currentStatus}</span>
                          </div>
                          <strong>{step.title}</strong>
                          <p>{step.goal}</p>
                          <small>{step.next_action}</small>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>

            <aside className="workbench-side">
              <section className="panel detail-panel">
                <p className="panel-label">步骤详情</p>
                {selectedStep ? (
                  <>
                    <h2>
                      {selectedStep.index}. {selectedStep.title}
                    </h2>
                    <p className="detail-goal">{selectedStep.goal}</p>
                    <div className="detail-block">
                      <h3>关键输入</h3>
                      <ul>
                        {selectedStep.inputs.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="detail-block">
                      <h3>关键输出</h3>
                      <ul>
                        {selectedStep.outputs.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="detail-block">
                      <h3>成功判定</h3>
                      <ul>
                        {selectedStep.success_criteria.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="detail-block">
                      <h3>主要失败点</h3>
                      <ul>
                        {selectedStep.failure_modes.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </>
                ) : (
                  <p className="empty">Select a step to inspect it.</p>
                )}
              </section>

              <section className="panel">
                <div className="section-head">
                  <div>
                    <p className="panel-label">回放事件</p>
                    <h2>首轮执行轨迹</h2>
                  </div>
                  <span className="meta-chip">{replayState.visibleEvents.length} events</span>
                </div>
                <div className="event-list">
                  {replayState.visibleEvents.length ? (
                    replayState.visibleEvents.map((event, index) => (
                      <article key={`${event.step_id}-${index}`} className={`event-card event-${event.level}`}>
                        <div className="event-head">
                          <strong>{event.step_id.replace("step-", "Step ")}</strong>
                          <span>{STATUS_LABELS[event.step_status] ?? event.step_status}</span>
                        </div>
                        <p>{event.message}</p>
                      </article>
                    ))
                  ) : (
                    <p className="empty">Start the replay to see the first-run execution trail.</p>
                  )}
                </div>
              </section>

              <section className="panel">
                <p className="panel-label">当前硬风险</p>
                <div className="risk-list">
                  {workspace.risks.map((risk) => (
                    <article key={risk.title} className={`risk-card risk-${risk.severity}`}>
                      <div className="event-head">
                        <strong>{risk.title}</strong>
                        <span>{risk.severity}</span>
                      </div>
                      <p>{risk.detail}</p>
                    </article>
                  ))}
                </div>
              </section>
            </aside>
          </section>
        </>
      ) : null}
    </main>
  );
}

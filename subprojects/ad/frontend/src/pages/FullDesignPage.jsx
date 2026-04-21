import { useEffect, useMemo, useState } from "react";

import {
  createFullFunctionCaseArchive,
  followUpFullFunctionAnalysis,
  followUpFullFunctionDiagnosis,
  getFullFunctionActivityFeed,
  getFullFunctionDesign,
  getFullFunctionMockCards,
  getFullFunctionModule,
  getFullFunctionModules,
  getFullFunctionStandardDockingPlayback,
  getFullFunctionWalkthrough,
  runFullFunctionAnalysis,
  runFullFunctionDiagnosis,
  runFullFunctionStandardDocking,
  submitFullFunctionIntake,
} from "../api/client";

const PRIORITY_LABELS = { p0: "P0", p1: "P1", p2: "P2" };
const PRIORITY_TEXT = {
  p0: "月底主演示",
  p1: "先补齐结构与交接",
  p2: "先完成设计储备",
};

function buildDraftCase(form, selectedModule, selectedWalkthrough) {
  return {
    submitter: form.submitter || "未填写",
    scene: selectedModule?.name || "未选择模块",
    summary: `${form.media || "未填媒体"} / ${form.app || "未填应用"} / ${form.requestType || "未填类型"}`,
    follow_up: selectedWalkthrough?.expected_output || "待补充后续动作",
  };
}

function renderValue(value) {
  if (Array.isArray(value)) return value.join(" / ");
  return String(value);
}

export default function FullDesignPage() {
  const [workspace, setWorkspace] = useState(null);
  const [modules, setModules] = useState([]);
  const [walkthrough, setWalkthrough] = useState([]);
  const [mockCards, setMockCards] = useState(null);
  const [activities, setActivities] = useState([]);
  const [selectedModuleId, setSelectedModuleId] = useState("");
  const [selectedModule, setSelectedModule] = useState(null);
  const [selectedWalkthroughStep, setSelectedWalkthroughStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");

  const [intakeForm, setIntakeForm] = useState({
    submitter: "投放-小林",
    media: "巨量",
    app: "指间山海",
    requestType: "监测回传对接",
    targetDate: "2026-04-26",
    documentUrl: "巨量开户链路说明",
  });
  const [dockingForm, setDockingForm] = useState({
    media: "巨量",
    app: "指间山海",
    entryMode: "二维码",
    deviceId: "ANDROID-01",
    acceptance: "打开游戏,启动,登录",
  });
  const [diagnosisForm, setDiagnosisForm] = useState({
    question: "为什么昨天巨量激活比 BI 少 30%？",
    timeRange: "2026-04-20",
    planId: "PLAN-7788",
  });
  const [analysisForm, setAnalysisForm] = useState({
    question: "对比素材 A 和素材 B 近 7 天消耗和 ROI",
    compareTargets: "素材A,素材B",
    metrics: "消耗,ROI,CTR",
    timeRange: "近7天",
  });

  const [requestResult, setRequestResult] = useState(null);
  const [caseRecord, setCaseRecord] = useState(null);
  const [dockingResult, setDockingResult] = useState(null);
  const [dockingPlayback, setDockingPlayback] = useState(null);
  const [playbackCursor, setPlaybackCursor] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);

  const [diagnosisResult, setDiagnosisResult] = useState(null);
  const [diagnosisFollowupInput, setDiagnosisFollowupInput] = useState("这个缺口集中在哪个时间段？");
  const [diagnosisHistory, setDiagnosisHistory] = useState([]);

  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisFollowupInput, setAnalysisFollowupInput] = useState("素材A 优势主要来自点击率还是转化率？");
  const [analysisHistory, setAnalysisHistory] = useState([]);

  const [submittingIntake, setSubmittingIntake] = useState(false);
  const [runningDocking, setRunningDocking] = useState(false);
  const [runningDiagnosis, setRunningDiagnosis] = useState(false);
  const [runningAnalysis, setRunningAnalysis] = useState(false);
  const [loadingPlayback, setLoadingPlayback] = useState(false);
  const [runningDiagnosisFollowup, setRunningDiagnosisFollowup] = useState(false);
  const [runningAnalysisFollowup, setRunningAnalysisFollowup] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadWorkspace() {
      setLoading(true);
      setError("");

      try {
        const [designResponse, modulesResponse, walkthroughResponse, mockCardsResponse, activityResponse] = await Promise.all([
          getFullFunctionDesign(),
          getFullFunctionModules(),
          getFullFunctionWalkthrough(),
          getFullFunctionMockCards(),
          getFullFunctionActivityFeed(),
        ]);

        if (!mounted) return;

        setWorkspace(designResponse);
        setModules(modulesResponse);
        setWalkthrough(walkthroughResponse);
        setMockCards(mockCardsResponse);
        setActivities(activityResponse.items);

        const firstModule = modulesResponse[0] ?? null;
        setSelectedModuleId(firstModule?.id ?? "");
        setSelectedModule(firstModule);
        setSelectedWalkthroughStep(walkthroughResponse[0]?.step ?? 1);
      } catch {
        if (mounted) setError("加载全功能设计工作台失败，请确认后端已启动。");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadWorkspace();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadModuleDetail() {
      if (!selectedModuleId) return;
      setDetailLoading(true);
      try {
        const response = await getFullFunctionModule(selectedModuleId);
        if (mounted) setSelectedModule(response);
      } catch {
        if (mounted) setError("加载模块详情失败。");
      } finally {
        if (mounted) setDetailLoading(false);
      }
    }

    loadModuleDetail();
    return () => {
      mounted = false;
    };
  }, [selectedModuleId]);

  useEffect(() => {
    if (!autoPlay || !dockingPlayback || playbackCursor >= dockingPlayback.steps.length) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setPlaybackCursor((current) => Math.min(current + 1, dockingPlayback.steps.length));
    }, 900);

    return () => window.clearTimeout(timer);
  }, [autoPlay, dockingPlayback, playbackCursor]);

  useEffect(() => {
    if (dockingPlayback && playbackCursor >= dockingPlayback.steps.length) {
      setAutoPlay(false);
    }
  }, [dockingPlayback, playbackCursor]);

  const selectedWalkthrough = useMemo(
    () => walkthrough.find((item) => item.step === selectedWalkthroughStep) ?? walkthrough[0] ?? null,
    [walkthrough, selectedWalkthroughStep],
  );

  const selectedMockPreview = useMemo(() => {
    if (!selectedModule) return [];
    return Object.entries(selectedModule.mock_entry.data);
  }, [selectedModule]);

  const visiblePlaybackSteps = useMemo(() => {
    if (!dockingPlayback) return [];
    return dockingPlayback.steps.slice(0, playbackCursor);
  }, [dockingPlayback, playbackCursor]);

  const updateForm = (setter, field, value) => {
    setter((current) => ({ ...current, [field]: value }));
  };

  const refreshActivityFeed = async () => {
    const response = await getFullFunctionActivityFeed();
    setActivities(response.items);
  };

  const handleGenerateRequest = async () => {
    setSubmittingIntake(true);
    setError("");
    try {
      const request = await submitFullFunctionIntake({
        submitter: intakeForm.submitter,
        media: intakeForm.media,
        app: intakeForm.app,
        request_type: intakeForm.requestType,
        target_date: intakeForm.targetDate,
        document_url: intakeForm.documentUrl,
      });
      const draftCase = buildDraftCase(intakeForm, selectedModule, selectedWalkthrough);
      const archivedCase = await createFullFunctionCaseArchive({
        request_id: request.request_id,
        submitter: draftCase.submitter,
        scene: draftCase.scene,
        summary: draftCase.summary,
        follow_up: draftCase.follow_up,
      });
      setRequestResult(request);
      setCaseRecord(archivedCase);
      await refreshActivityFeed();
    } catch {
      setError("需求接入提交流程失败，请确认后端接口可用。");
    } finally {
      setSubmittingIntake(false);
    }
  };

  const handleRunDocking = async () => {
    setRunningDocking(true);
    setError("");
    setDockingPlayback(null);
    setPlaybackCursor(0);
    setAutoPlay(false);
    try {
      const response = await runFullFunctionStandardDocking({
        media: dockingForm.media,
        app: dockingForm.app,
        entry_mode: dockingForm.entryMode,
        device_id: dockingForm.deviceId,
        acceptance: dockingForm.acceptance.split(",").map((item) => item.trim()).filter(Boolean),
      });
      setDockingResult(response);
      await refreshActivityFeed();
    } catch {
      setError("标准联调执行失败，请确认后端接口可用。");
    } finally {
      setRunningDocking(false);
    }
  };

  const handleLoadPlayback = async () => {
    if (!dockingResult?.task_id) return;
    setLoadingPlayback(true);
    setError("");
    try {
      const response = await getFullFunctionStandardDockingPlayback(dockingResult.task_id);
      setDockingPlayback(response);
      setPlaybackCursor(1);
      setAutoPlay(true);
      await refreshActivityFeed();
    } catch {
      setError("联调回放加载失败。");
    } finally {
      setLoadingPlayback(false);
    }
  };

  const handleNextPlaybackStep = () => {
    if (!dockingPlayback) return;
    setAutoPlay(false);
    setPlaybackCursor((current) => Math.min(current + 1, dockingPlayback.steps.length));
  };

  const handleToggleAutoplay = () => {
    if (!dockingPlayback) return;
    if (playbackCursor >= dockingPlayback.steps.length) {
      setPlaybackCursor(1);
    }
    setAutoPlay((current) => !current);
  };

  const handleRunDiagnosis = async () => {
    setRunningDiagnosis(true);
    setError("");
    setDiagnosisHistory([]);
    try {
      const response = await runFullFunctionDiagnosis({
        question: diagnosisForm.question,
        time_range: diagnosisForm.timeRange,
        plan_id: diagnosisForm.planId,
      });
      setDiagnosisResult(response);
      await refreshActivityFeed();
    } catch {
      setError("异常诊断执行失败，请确认后端接口可用。");
    } finally {
      setRunningDiagnosis(false);
    }
  };

  const handleRunDiagnosisFollowup = async () => {
    if (!diagnosisResult || !diagnosisFollowupInput.trim()) return;
    setRunningDiagnosisFollowup(true);
    setError("");
    try {
      const response = await followUpFullFunctionDiagnosis({
        question: diagnosisForm.question,
        time_range: diagnosisForm.timeRange,
        plan_id: diagnosisForm.planId,
        follow_up: diagnosisFollowupInput,
      });
      setDiagnosisHistory((current) => [...current, response]);
      setDiagnosisFollowupInput("");
      await refreshActivityFeed();
    } catch {
      setError("异常诊断追问失败。");
    } finally {
      setRunningDiagnosisFollowup(false);
    }
  };

  const handleRunAnalysis = async () => {
    setRunningAnalysis(true);
    setError("");
    setAnalysisHistory([]);
    try {
      const response = await runFullFunctionAnalysis({
        question: analysisForm.question,
        compare_targets: analysisForm.compareTargets.split(",").map((item) => item.trim()).filter(Boolean),
        metrics: analysisForm.metrics.split(",").map((item) => item.trim()).filter(Boolean),
        time_range: analysisForm.timeRange,
      });
      setAnalysisResult(response);
      await refreshActivityFeed();
    } catch {
      setError("对话式分析执行失败，请确认后端接口可用。");
    } finally {
      setRunningAnalysis(false);
    }
  };

  const handleRunAnalysisFollowup = async () => {
    if (!analysisResult || !analysisFollowupInput.trim()) return;
    setRunningAnalysisFollowup(true);
    setError("");
    try {
      const response = await followUpFullFunctionAnalysis({
        question: analysisForm.question,
        compare_targets: analysisForm.compareTargets.split(",").map((item) => item.trim()).filter(Boolean),
        metrics: analysisForm.metrics.split(",").map((item) => item.trim()).filter(Boolean),
        time_range: analysisForm.timeRange,
        follow_up: analysisFollowupInput,
      });
      setAnalysisHistory((current) => [...current, response]);
      setAnalysisFollowupInput("");
      await refreshActivityFeed();
    } catch {
      setError("对话式分析追问失败。");
    } finally {
      setRunningAnalysisFollowup(false);
    }
  };

  return (
    <main className="page page-workbench">
      <header className="hero hero-workbench">
        <div className="hero-copy">
          <p className="eyebrow">full function design</p>
          <h2>{workspace?.project.name ?? "广告支持与投放协同自动化工作台"}</h2>
          <p className="subtitle">
            {workspace?.project.scope ?? "从支持侧自动化出发，串起需求接入、联调、诊断、分析、知识复用和归档。"}
          </p>
          {workspace ? (
            <div className="scope-pills">
              <span>项目：{workspace.project.id}</span>
              <span>日期：{workspace.project.date}</span>
              <span>模块数：{modules.length}</span>
              <span>走查步骤：{walkthrough.length}</span>
            </div>
          ) : null}
        </div>
        <div className="hero-side panel">
          <p className="panel-label">当前口径</p>
          <strong className="hero-stat">{modules.length || "-"}</strong>
          <p className="hero-detail">这套工作台已经支持联调自动回放，以及诊断与分析的多轮追问历史。</p>
        </div>
      </header>

      {loading ? <p className="empty">正在加载全功能设计工作台...</p> : null}
      {error ? <p className="error-message">{error}</p> : null}

      {!loading && workspace ? (
        <>
          <section className="summary-grid design-summary-grid">
            <article className="panel summary-card tone-brand">
              <p className="panel-label">主目标</p>
              <strong>统一工作台</strong>
              <p>让需求接入、联调、诊断、分析、知识和归档都在一套界面内发生。</p>
            </article>
            <article className="panel summary-card tone-success">
              <p className="panel-label">月底主演示</p>
              <strong>联调 + 诊断 + 分析</strong>
              <p>主链路已经能演示提交、执行、自动回放、多轮追问和归档。</p>
            </article>
            <article className="panel summary-card tone-neutral">
              <p className="panel-label">数据策略</p>
              <strong>Mock First</strong>
              <p>当前仍是 mock 流程，但接口边界和页面状态已经接近真实工作台。</p>
            </article>
            <article className="panel summary-card tone-warning">
              <p className="panel-label">当前限制</p>
              <strong>尚未接真实系统</strong>
              <p>下一阶段重点是把状态源替换为真实任务、日志和数据结果，而不是继续补静态设计。</p>
            </article>
          </section>

          <section className="workbench-grid design-grid">
            <div className="workbench-main">
              <section className="panel">
                <div className="section-head">
                  <div>
                    <p className="panel-label">功能模块</p>
                    <h2>点击模块查看设计细节</h2>
                  </div>
                  <span className="meta-chip">{modules.length} modules</span>
                </div>
                <div className="design-module-grid">
                  {modules.map((module) => (
                    <button
                      key={module.id}
                      type="button"
                      className={`design-module-card priority-${module.demo_priority} ${selectedModuleId === module.id ? "design-module-active" : ""}`}
                      onClick={() => setSelectedModuleId(module.id)}
                    >
                      <div className="step-topline">
                        <span className="step-stage">{module.id}</span>
                        <span className="priority-pill">{PRIORITY_LABELS[module.demo_priority] ?? module.demo_priority}</span>
                      </div>
                      <strong>{module.name}</strong>
                      <p>{module.goal}</p>
                      <div className="design-inline-list">
                        {module.actors.map((actor) => (
                          <span key={actor}>{actor}</span>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              <section className="panel">
                <div className="section-head">
                  <div>
                    <p className="panel-label">全链路走查</p>
                    <h2>点击步骤查看产出要求</h2>
                  </div>
                  <span className="meta-chip">{walkthrough.length} steps</span>
                </div>
                <div className="walkthrough-list">
                  {walkthrough.map((item) => (
                    <button
                      key={`${item.step}-${item.module}`}
                      type="button"
                      className={`walkthrough-card walkthrough-button ${selectedWalkthroughStep === item.step ? "walkthrough-active" : ""}`}
                      onClick={() => setSelectedWalkthroughStep(item.step)}
                    >
                      <div className="step-index">{item.step}</div>
                      <div className="step-body">
                        <div className="step-topline">
                          <span className="step-stage">{item.module}</span>
                          <span className="step-status-label">设计走查</span>
                        </div>
                        <strong>{item.title}</strong>
                        <p>{item.expected_output}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            </div>

            <aside className="workbench-side">
              <section className="panel detail-panel">
                <p className="panel-label">模块详情</p>
                {selectedModule ? (
                  <>
                    <h2>{selectedModule.name}</h2>
                    <p className="detail-goal">{selectedModule.goal}</p>
                    <div className="detail-block">
                      <h3>优先级</h3>
                      <p>{PRIORITY_TEXT[selectedModule.demo_priority] ?? selectedModule.demo_priority}</p>
                    </div>
                    <div className="detail-block">
                      <h3>角色</h3>
                      <div className="design-inline-list">
                        {selectedModule.actors.map((actor) => (
                          <span key={actor}>{actor}</span>
                        ))}
                      </div>
                    </div>
                    <div className="detail-block">
                      <h3>核心字段</h3>
                      <ul>
                        {selectedModule.core_fields.map((field) => (
                          <li key={field}>{field}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="detail-block">
                      <h3>样例对象</h3>
                      {detailLoading ? <p>正在加载模块详情...</p> : null}
                      <div className="mock-entry-kv">
                        {selectedMockPreview.map(([key, value]) => (
                          <div key={key} className="mock-entry-kv-row">
                            <strong>{key}</strong>
                            <span>{renderValue(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="empty">请选择一个模块查看详情。</p>
                )}
              </section>

              <section className="panel">
                <p className="panel-label">走查详情</p>
                {selectedWalkthrough ? (
                  <>
                    <h2>{selectedWalkthrough.title}</h2>
                    <p className="detail-goal">所属模块：{selectedWalkthrough.module}</p>
                    <div className="detail-block">
                      <h3>该步必须输出</h3>
                      <p>{selectedWalkthrough.expected_output}</p>
                    </div>
                  </>
                ) : (
                  <p className="empty">请选择一个走查步骤。</p>
                )}
              </section>

              <section className="panel">
                <p className="panel-label">需求接入演示</p>
                <div className="demo-form">
                  <label className="demo-field"><span>提交人</span><input value={intakeForm.submitter} onChange={(e) => updateForm(setIntakeForm, "submitter", e.target.value)} /></label>
                  <label className="demo-field"><span>媒体</span><input value={intakeForm.media} onChange={(e) => updateForm(setIntakeForm, "media", e.target.value)} /></label>
                  <label className="demo-field"><span>应用</span><input value={intakeForm.app} onChange={(e) => updateForm(setIntakeForm, "app", e.target.value)} /></label>
                  <label className="demo-field"><span>需求类型</span><input value={intakeForm.requestType} onChange={(e) => updateForm(setIntakeForm, "requestType", e.target.value)} /></label>
                  <label className="demo-field"><span>预期时间</span><input value={intakeForm.targetDate} onChange={(e) => updateForm(setIntakeForm, "targetDate", e.target.value)} /></label>
                  <label className="demo-field"><span>文档地址</span><input value={intakeForm.documentUrl} onChange={(e) => updateForm(setIntakeForm, "documentUrl", e.target.value)} /></label>
                  <button type="button" className="primary-button" onClick={handleGenerateRequest} disabled={submittingIntake}>
                    {submittingIntake ? "提交中..." : "生成结构化需求并归档"}
                  </button>
                </div>
                {requestResult ? (
                  <div className="result-stack">
                    <div className="mock-entry-kv">
                      {Object.entries(requestResult).map(([key, value]) => (
                        <div key={key} className="mock-entry-kv-row"><strong>{key}</strong><span>{renderValue(value)}</span></div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </section>

              <section className="panel">
                <p className="panel-label">标准联调演示</p>
                <div className="demo-form">
                  <label className="demo-field"><span>媒体</span><input value={dockingForm.media} onChange={(e) => updateForm(setDockingForm, "media", e.target.value)} /></label>
                  <label className="demo-field"><span>应用</span><input value={dockingForm.app} onChange={(e) => updateForm(setDockingForm, "app", e.target.value)} /></label>
                  <label className="demo-field"><span>入口方式</span><input value={dockingForm.entryMode} onChange={(e) => updateForm(setDockingForm, "entryMode", e.target.value)} /></label>
                  <label className="demo-field"><span>设备</span><input value={dockingForm.deviceId} onChange={(e) => updateForm(setDockingForm, "deviceId", e.target.value)} /></label>
                  <label className="demo-field"><span>验收口径</span><input value={dockingForm.acceptance} onChange={(e) => updateForm(setDockingForm, "acceptance", e.target.value)} /></label>
                  <button type="button" className="primary-button" onClick={handleRunDocking} disabled={runningDocking}>
                    {runningDocking ? "执行中..." : "执行标准联调"}
                  </button>
                </div>
                {dockingResult ? (
                  <div className="result-stack">
                    <div className="mock-entry-kv">
                      {Object.entries(dockingResult).map(([key, value]) => (
                        <div key={key} className="mock-entry-kv-row"><strong>{key}</strong><span>{renderValue(value)}</span></div>
                      ))}
                    </div>
                    <div className="inline-actions">
                      <button type="button" className="secondary-button" onClick={handleLoadPlayback} disabled={loadingPlayback}>
                        {loadingPlayback ? "加载中..." : "加载联调回放"}
                      </button>
                      <button type="button" className="secondary-button" onClick={handleToggleAutoplay} disabled={!dockingPlayback}>
                        {autoPlay ? "暂停自动播放" : "自动播放"}
                      </button>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={handleNextPlaybackStep}
                        disabled={!dockingPlayback || playbackCursor >= dockingPlayback.steps.length}
                      >
                        下一步
                      </button>
                    </div>
                    {visiblePlaybackSteps.length ? (
                      <div className="playback-list">
                        {visiblePlaybackSteps.map((step) => (
                          <div key={step.step} className="playback-card">
                            <div className="step-topline">
                              <span className="step-stage">步骤 {step.step}</span>
                              <span className="step-status-label">{step.status}</span>
                            </div>
                            <strong>{step.title}</strong>
                            <p>{step.detail}</p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </section>

              <section className="panel">
                <p className="panel-label">异常诊断演示</p>
                <div className="demo-form">
                  <label className="demo-field"><span>问题</span><input value={diagnosisForm.question} onChange={(e) => updateForm(setDiagnosisForm, "question", e.target.value)} /></label>
                  <label className="demo-field"><span>时间范围</span><input value={diagnosisForm.timeRange} onChange={(e) => updateForm(setDiagnosisForm, "timeRange", e.target.value)} /></label>
                  <label className="demo-field"><span>计划 ID</span><input value={diagnosisForm.planId} onChange={(e) => updateForm(setDiagnosisForm, "planId", e.target.value)} /></label>
                  <button type="button" className="primary-button" onClick={handleRunDiagnosis} disabled={runningDiagnosis}>
                    {runningDiagnosis ? "诊断中..." : "执行异常诊断"}
                  </button>
                </div>
                {diagnosisResult ? (
                  <div className="result-stack">
                    <div className="detail-block">
                      <h3>{diagnosisResult.title}</h3>
                      <p>{diagnosisResult.summary}</p>
                    </div>
                    <div className="detail-block">
                      <h3>证据链</h3>
                      <ul>{diagnosisResult.evidence.map((item) => <li key={item}>{item}</li>)}</ul>
                    </div>
                    <div className="mock-entry-kv">
                      <div className="mock-entry-kv-row"><strong>confidence</strong><span>{diagnosisResult.confidence}</span></div>
                      <div className="mock-entry-kv-row"><strong>action</strong><span>{diagnosisResult.action}</span></div>
                    </div>
                    <div className="demo-form">
                      <label className="demo-field">
                        <span>继续追问</span>
                        <input value={diagnosisFollowupInput} onChange={(e) => setDiagnosisFollowupInput(e.target.value)} />
                      </label>
                      <button type="button" className="secondary-button" onClick={handleRunDiagnosisFollowup} disabled={runningDiagnosisFollowup}>
                        {runningDiagnosisFollowup ? "追问中..." : "加入追问"}
                      </button>
                    </div>
                    {diagnosisHistory.length ? (
                      <div className="history-list">
                        {diagnosisHistory.map((item, index) => (
                          <div key={`${item.follow_up}-${index}`} className="followup-card">
                            <strong>Q{index + 1}. {item.follow_up}</strong>
                            <p>{item.answer}</p>
                            <ul>{item.evidence.map((evidence) => <li key={evidence}>{evidence}</li>)}</ul>
                            <p className="followup-next">下一步：{item.next_suggestion}</p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </section>

              <section className="panel">
                <p className="panel-label">对话式分析演示</p>
                <div className="demo-form">
                  <label className="demo-field"><span>问题</span><input value={analysisForm.question} onChange={(e) => updateForm(setAnalysisForm, "question", e.target.value)} /></label>
                  <label className="demo-field"><span>对比对象</span><input value={analysisForm.compareTargets} onChange={(e) => updateForm(setAnalysisForm, "compareTargets", e.target.value)} /></label>
                  <label className="demo-field"><span>指标</span><input value={analysisForm.metrics} onChange={(e) => updateForm(setAnalysisForm, "metrics", e.target.value)} /></label>
                  <label className="demo-field"><span>时间范围</span><input value={analysisForm.timeRange} onChange={(e) => updateForm(setAnalysisForm, "timeRange", e.target.value)} /></label>
                  <button type="button" className="primary-button" onClick={handleRunAnalysis} disabled={runningAnalysis}>
                    {runningAnalysis ? "分析中..." : "执行对话式分析"}
                  </button>
                </div>
                {analysisResult ? (
                  <div className="result-stack">
                    <div className="detail-block">
                      <h3>分析摘要</h3>
                      <p>{analysisResult.summary}</p>
                    </div>
                    <div className="detail-block">
                      <h3>关键发现</h3>
                      <ul>{analysisResult.key_findings.map((item) => <li key={item}>{item}</li>)}</ul>
                    </div>
                    <div className="analysis-table">
                      <div className="analysis-table-head"><span>对象</span><span>消耗</span><span>ROI</span><span>CTR</span></div>
                      {analysisResult.analysis_table.map((row) => (
                        <div key={row.target} className="analysis-table-row"><span>{row.target}</span><span>{row.spend}</span><span>{row.roi}</span><span>{row.ctr}</span></div>
                      ))}
                    </div>
                    <div className="demo-form">
                      <label className="demo-field">
                        <span>继续追问</span>
                        <input value={analysisFollowupInput} onChange={(e) => setAnalysisFollowupInput(e.target.value)} />
                      </label>
                      <button type="button" className="secondary-button" onClick={handleRunAnalysisFollowup} disabled={runningAnalysisFollowup}>
                        {runningAnalysisFollowup ? "追问中..." : "加入追问"}
                      </button>
                    </div>
                    {analysisHistory.length ? (
                      <div className="history-list">
                        {analysisHistory.map((item, index) => (
                          <div key={`${item.follow_up}-${index}`} className="followup-card">
                            <strong>Q{index + 1}. {item.follow_up}</strong>
                            <p>{item.answer}</p>
                            <ul>{item.key_points.map((point) => <li key={point}>{point}</li>)}</ul>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </section>

              <section className="panel detail-panel">
                <p className="panel-label">默认诊断卡片</p>
                {mockCards ? (
                  <>
                    <h2>{mockCards.diagnosis_result.title}</h2>
                    <p className="detail-goal">{mockCards.diagnosis_result.summary}</p>
                    <div className="detail-block">
                      <h3>证据链</h3>
                      <ul>{mockCards.diagnosis_result.evidence.map((item) => <li key={item}>{item}</li>)}</ul>
                    </div>
                    <div className="detail-block">
                      <h3>建议动作</h3>
                      <p>{mockCards.diagnosis_result.action}</p>
                    </div>
                  </>
                ) : (
                  <p className="empty">暂无卡片数据。</p>
                )}
              </section>

              <section className="panel">
                <p className="panel-label">最近活动</p>
                {activities.length ? (
                  <div className="activity-list">
                    {activities.map((item) => (
                      <div key={item.id} className="activity-card">
                        <div className="step-topline">
                          <span className="step-stage">{item.kind}</span>
                          <span className="step-status-label">{item.created_at}</span>
                        </div>
                        <strong>{item.title}</strong>
                        <p>{item.detail}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="empty">当前还没有活动记录。</p>
                )}
              </section>

              <section className="panel">
                <p className="panel-label">默认分析表示例</p>
                <div className="analysis-table">
                  <div className="analysis-table-head"><span>对象</span><span>消耗</span><span>ROI</span><span>CTR</span></div>
                  {mockCards?.analysis_table.map((row) => (
                    <div key={row.target} className="analysis-table-row"><span>{row.target}</span><span>{row.spend}</span><span>{row.roi}</span><span>{row.ctr}</span></div>
                  ))}
                </div>
              </section>

              <section className="panel">
                <p className="panel-label">Case 归档演示</p>
                {caseRecord ? (
                  <div className="mock-entry-kv">
                    {Object.entries(caseRecord).map(([key, value]) => (
                      <div key={key} className="mock-entry-kv-row"><strong>{key}</strong><span>{renderValue(value)}</span></div>
                    ))}
                  </div>
                ) : (
                  <p className="empty">先提交结构化需求，这里会同步返回一条归档记录。</p>
                )}
              </section>
            </aside>
          </section>
        </>
      ) : null}
    </main>
  );
}

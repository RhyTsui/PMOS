import { useEffect, useMemo, useState } from "react";

import { Badge, Button, Drawer, Input, Select } from "antd";

import {
  caseRows,
  executionRows,
  gateRows,
  navItems,
  productMeta,
  projectOptions,
  projectRows,
  reportRows,
  requirementRows,
  reviewRows,
  topSignals,
  traceRows,
} from "../data/mockData";
import CasesPage, { CaseDetail } from "./workbench/CasesPage";
import ExecutionPage, { ExecutionDetail } from "./workbench/ExecutionPage";
import GatePage, { GateDetail } from "./workbench/GatePage";
import OverviewPage from "./workbench/OverviewPage";
import ProjectsPage, { ProjectDetail } from "./workbench/ProjectsPage";
import ReportsPage, { ReportDetail } from "./workbench/ReportsPage";
import RequirementsPage, { RequirementDetail } from "./workbench/RequirementsPage";
import ReviewPage, { ReviewDetail } from "./workbench/ReviewPage";
import TracePage, { TraceDetail } from "./workbench/TracePage";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 900);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return isMobile;
}

export default function WorkbenchApp({ activePageFromRoute = "overview", onNavigatePage, onLogout }) {
  const isMobile = useIsMobile();
  const [activePage, setActivePage] = useState(activePageFromRoute);
  const [currentProjectKey, setCurrentProjectKey] = useState(projectOptions[0].key);
  const [currentEnv, setCurrentEnv] = useState(topSignals.environments[1]);
  const [currentVersion, setCurrentVersion] = useState(topSignals.versions[1]);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [detailCollapsed, setDetailCollapsed] = useState(false);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");

  const [selectedProject, setSelectedProject] = useState(projectRows[0]);
  const [selectedRequirement, setSelectedRequirement] = useState(requirementRows[0]);
  const [selectedCase, setSelectedCase] = useState(caseRows[0]);
  const [selectedExecution, setSelectedExecution] = useState(executionRows[0]);
  const [selectedTrace, setSelectedTrace] = useState(traceRows[0]);
  const [selectedReport, setSelectedReport] = useState(reportRows[0]);
  const [selectedReview, setSelectedReview] = useState(reviewRows[0]);
  const [selectedGate, setSelectedGate] = useState(gateRows[0]);

  const currentProject = useMemo(
    () => projectOptions.find((item) => item.key === currentProjectKey) ?? projectOptions[0],
    [currentProjectKey],
  );

  useEffect(() => {
    setActivePage(activePageFromRoute);
  }, [activePageFromRoute]);

  useEffect(() => {
    const matchedProject = projectRows.find((item) => item.key === currentProjectKey);
    if (matchedProject) {
      setSelectedProject(matchedProject);
    }
  }, [currentProjectKey]);

  const openDetail = (setter, record) => {
    setter(record);
    if (isMobile) setMobileDetailOpen(true);
  };

  const changePage = (page) => {
    setActivePage(page);
    onNavigatePage?.(page);
    setMobileNavOpen(false);
    setMobileDetailOpen(false);
  };

  const focusProject = (projectKey) => {
    const project = projectRows.find((item) => item.key === projectKey);
    if (project) {
      setCurrentProjectKey(projectKey);
      setSelectedProject(project);
    }
  };

  const workflowActions = {
    fromProjectToRequirements(projectKey = currentProjectKey) {
      focusProject(projectKey);
      const requirement = requirementRows.find((item) => item.project.includes(projectRows.find((row) => row.key === projectKey)?.name.split(" ")[0] ?? "")) ?? requirementRows[0];
      setSelectedRequirement(requirement);
      changePage("requirements");
    },
    fromRequirementToCases(requirementKey = selectedRequirement.key) {
      const requirement = requirementRows.find((item) => item.key === requirementKey) ?? selectedRequirement;
      setSelectedRequirement(requirement);
      const nextCase =
        caseRows.find((item) => item.caseType === requirement.type || item.project === requirement.project) ?? caseRows[0];
      setSelectedCase(nextCase);
      changePage("cases");
    },
    fromCaseToExecution(caseKey = selectedCase.key) {
      const caseRecord = caseRows.find((item) => item.key === caseKey) ?? selectedCase;
      setSelectedCase(caseRecord);
      const execution =
        executionRows.find((item) => item.project === caseRecord.project || item.executor.includes(caseRecord.caseType.toUpperCase())) ?? executionRows[0];
      setSelectedExecution(execution);
      changePage("execution");
    },
    fromExecutionToTrace(executionKey = selectedExecution.key) {
      const execution = executionRows.find((item) => item.key === executionKey) ?? selectedExecution;
      setSelectedExecution(execution);
      const trace = traceRows.find((item) => item.run === execution.name) ?? traceRows[0];
      setSelectedTrace(trace);
      changePage("trace");
    },
    fromTraceToReport(traceKey = selectedTrace.key) {
      const trace = traceRows.find((item) => item.key === traceKey) ?? selectedTrace;
      setSelectedTrace(trace);
      const report =
        reportRows.find((item) => item.name.includes(trace.run.split(" ")[0]) || item.scope.toLowerCase().includes(trace.type)) ?? reportRows[0];
      setSelectedReport(report);
      changePage("reports");
    },
    fromReportToReview(reportKey = selectedReport.key) {
      const report = reportRows.find((item) => item.key === reportKey) ?? selectedReport;
      setSelectedReport(report);
      const review = reviewRows.find((item) => item.report === report.name) ?? reviewRows[0];
      setSelectedReview(review);
      changePage("review");
    },
    fromReviewToGate(reviewKey = selectedReview.key) {
      const review = reviewRows.find((item) => item.key === reviewKey) ?? selectedReview;
      setSelectedReview(review);
      const gate =
        gateRows.find((item) => item.scope.includes(review.name.split(" ")[0]) || item.scope.includes(review.report.split(" ")[0])) ?? gateRows[0];
      setSelectedGate(gate);
      changePage("gate");
    },
  };

  const commonProps = {
    currentProject,
    currentEnv,
    currentVersion,
    isMobile,
    detailCollapsed,
    onToggleDetail: () => setDetailCollapsed((value) => !value),
    workflowActions,
  };

  const pageMap = {
    projects: {
      detailTitle: "项目详情",
      content: (
        <ProjectsPage
          {...commonProps}
          selectedRecord={selectedProject}
          onSelectRecord={(record) => openDetail(setSelectedProject, record)}
          onSwitchProject={(projectKey) => focusProject(projectKey)}
        />
      ),
      mobileDetail: <ProjectDetail record={selectedProject} workflowActions={workflowActions} />,
    },
    requirements: {
      detailTitle: "需求详情",
      content: (
        <RequirementsPage
          {...commonProps}
          selectedRecord={selectedRequirement}
          onSelectRecord={(record) => openDetail(setSelectedRequirement, record)}
        />
      ),
      mobileDetail: <RequirementDetail record={selectedRequirement} workflowActions={workflowActions} />,
    },
    cases: {
      detailTitle: "用例详情",
      content: (
        <CasesPage
          {...commonProps}
          selectedRecord={selectedCase}
          onSelectRecord={(record) => openDetail(setSelectedCase, record)}
        />
      ),
      mobileDetail: <CaseDetail record={selectedCase} workflowActions={workflowActions} />,
    },
    execution: {
      detailTitle: "执行详情",
      content: (
        <ExecutionPage
          {...commonProps}
          selectedRecord={selectedExecution}
          onSelectRecord={(record) => openDetail(setSelectedExecution, record)}
        />
      ),
      mobileDetail: <ExecutionDetail record={selectedExecution} workflowActions={workflowActions} />,
    },
    trace: {
      detailTitle: "Trace 详情",
      content: (
        <TracePage
          {...commonProps}
          selectedRecord={selectedTrace}
          onSelectRecord={(record) => openDetail(setSelectedTrace, record)}
        />
      ),
      mobileDetail: <TraceDetail record={selectedTrace} workflowActions={workflowActions} />,
    },
    reports: {
      detailTitle: "报告详情",
      content: (
        <ReportsPage
          {...commonProps}
          selectedRecord={selectedReport}
          onSelectRecord={(record) => openDetail(setSelectedReport, record)}
        />
      ),
      mobileDetail: <ReportDetail record={selectedReport} workflowActions={workflowActions} />,
    },
    review: {
      detailTitle: "复核详情",
      content: (
        <ReviewPage
          {...commonProps}
          selectedRecord={selectedReview}
          onSelectRecord={(record) => openDetail(setSelectedReview, record)}
        />
      ),
      mobileDetail: <ReviewDetail record={selectedReview} workflowActions={workflowActions} />,
    },
    gate: {
      detailTitle: "门禁详情",
      content: (
        <GatePage
          {...commonProps}
          selectedRecord={selectedGate}
          onSelectRecord={(record) => openDetail(setSelectedGate, record)}
        />
      ),
      mobileDetail: <GateDetail record={selectedGate} workflowActions={workflowActions} />,
    },
  };

  const currentPage = pageMap[activePage];
  const activeNav = navItems.find((item) => item.key === activePage) ?? navItems[0];

  return (
    <div className="app-shell">
      <div className="app-backdrop" />
      <div className="app-layout">
        <aside className="sidebar">
          <div className="brand-block">
            <div className="brand-mark">
              <span className="brand-dot blue" />
              <span className="brand-dot green" />
              <span className="brand-dot purple" />
            </div>
            <div>
              <span className="eyebrow">{productMeta.englishName}</span>
              <h1>{productMeta.shortName}</h1>
              <p>{productMeta.slogan}</p>
            </div>
          </div>
          <nav className="nav-list">
            {navItems.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`nav-item ${activePage === item.key ? "active" : ""}`}
                onClick={() => changePage(item.key)}
              >
                <span>{item.label}</span>
                <em>{item.hint}</em>
              </button>
            ))}
          </nav>
          <div className="sidebar-foot context-mini-card">
            <span className="eyebrow">当前上下文</span>
            <strong>{currentProject.name}</strong>
            <p>
              {currentEnv} / {currentVersion}
            </p>
            <Badge status="processing" text={productMeta.domain} />
          </div>
        </aside>

        <main className="main-shell">
          <header className="topbar brand-card">
            <div className="topbar-left">
              {isMobile ? <Button onClick={() => setMobileNavOpen(true)}>菜单</Button> : null}
              <div className="topbar-heading">
                <span className="eyebrow">{productMeta.name}</span>
                <h2>{activeNav.label}</h2>
                <p>{activePage === "overview" ? "轻入口页，先恢复上下文与待办。" : "统一工作壳层下的当前主工作区。"}</p>
              </div>
            </div>
            <div className="topbar-right">
              <Input
                className="top-search"
                placeholder="搜索项目、需求、Trace 或报告"
                value={globalSearch}
                onChange={(event) => setGlobalSearch(event.target.value)}
              />
              <Select
                className="top-select"
                value={currentProjectKey}
                onChange={setCurrentProjectKey}
                options={projectOptions.map((item) => ({ label: item.name, value: item.key }))}
              />
              <Select
                className="top-select small"
                value={currentEnv}
                onChange={setCurrentEnv}
                options={topSignals.environments.map((item) => ({ label: item, value: item }))}
              />
              <Select
                className="top-select small"
                value={currentVersion}
                onChange={setCurrentVersion}
                options={topSignals.versions.map((item) => ({ label: item, value: item }))}
              />
              <div className="signal-pill">
                <span>待复核</span>
                <strong>{topSignals.todoReview}</strong>
              </div>
              <div className="signal-pill danger">
                <span>阻断版本</span>
                <strong>{topSignals.blockedVersions}</strong>
              </div>
              <div className="user-pill">
                <span>当前用户</span>
                <strong>QA 值班</strong>
              </div>
              <Button onClick={onLogout}>退出</Button>
            </div>
          </header>

          <section className="shell-context-bar brand-card">
            <div className="context-bar-main">
              <div className="context-block">
                <span>当前项目</span>
                <strong>{currentProject.name}</strong>
              </div>
              <div className="context-block">
                <span>环境</span>
                <strong>{currentEnv}</strong>
              </div>
              <div className="context-block">
                <span>版本范围</span>
                <strong>{currentVersion}</strong>
              </div>
              <div className="context-block">
                <span>工作区定位</span>
                <strong>{activeNav.label}</strong>
              </div>
            </div>
            <div className="context-bar-side">
              <span className="context-note">骨架先做对，展示不做满</span>
            </div>
          </section>

          {activePage !== "overview" && isMobile ? (
            <div className="mobile-detail-action">
              <Button onClick={() => setMobileDetailOpen(true)}>查看上下文</Button>
            </div>
          ) : null}

          {activePage === "overview" ? (
            <OverviewPage currentProject={currentProject} onQuickOpen={changePage} />
          ) : (
            currentPage.content
          )}
        </main>
      </div>

      <Drawer title="导航" placement="left" open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} className="mobile-drawer">
        <div className="drawer-nav">
          {navItems.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`nav-item ${activePage === item.key ? "active" : ""}`}
              onClick={() => changePage(item.key)}
            >
              <span>{item.label}</span>
              <em>{item.hint}</em>
            </button>
          ))}
        </div>
      </Drawer>

      <Drawer
        title={activePage === "overview" ? "详情" : currentPage?.detailTitle}
        placement="right"
        width="100%"
        open={mobileDetailOpen}
        onClose={() => setMobileDetailOpen(false)}
        className="mobile-drawer"
      >
        {activePage !== "overview" ? currentPage.mobileDetail : null}
      </Drawer>
    </div>
  );
}

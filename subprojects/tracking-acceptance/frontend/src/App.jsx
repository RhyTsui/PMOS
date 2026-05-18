import { useMemo, useState } from "react";

import {
  BookOutlined,
  FileSearchOutlined,
  HomeOutlined,
  RobotOutlined,
  SearchOutlined,
  SettingOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Line } from "@ant-design/plots";
import { Avatar, Dropdown, Table, Tag } from "antd";
import {
  Empty,
  FlexGrid,
  LabelSelect,
  TableTheme,
  YkButton,
  YkCard,
  YkContainer,
  YkPorjectSelect,
  YkTooltip,
} from "@yoka-ui/ui";

import {
  currentUserName,
  navigationItems,
  personalMenuItems,
  projectOptions,
  viewOptions,
} from "./data/overviewData";
import {
  requirementVersionMetaMap,
  requirementVersionOptions,
} from "./data/productRequirementVersions";
import DataDictionaryPage from "./pages/DataDictionaryPage";
import RealtimeQueryPage from "./pages/RealtimeQueryPage";
import RequirementsPage from "./pages/RequirementsPage";
import AcceptanceReportsPage from "./pages/AcceptanceReportsPage";
import AIAssistantPage from "./pages/AIAssistantPage";
import ValidationRulesPage from "./pages/ValidationRulesPage";

const navIconMap = {
  home: <HomeOutlined />,
  file: <FileSearchOutlined />,
  book: <BookOutlined />,
  setting: <SettingOutlined />,
  search: <SearchOutlined />,
  robot: <RobotOutlined />,
};

function getNavigationLabel(item, requirementVersionId) {
  if (requirementVersionId !== "v1.1") {
    return item.label;
  }

  const labelMap = {
    requirements: "需求装配",
    logs: "查询验证",
    reports: "验收报告",
  };

  return labelMap[item.key] ?? item.label;
}

function createOverviewStageItems(requirementVersionId) {
  if (requirementVersionId !== "v1.1") {
    return [];
  }

  return [
    { key: "version", label: "版本管理", value: "版本范围已收口，等待继续细化状态机" },
    { key: "assembly", label: "需求装配", value: "已切到模板 + 勾选 + 差异 + 导入骨架" },
    { key: "query", label: "查询验证", value: "已切到查询会话 + 证据回挂骨架" },
    { key: "report", label: "报告分发", value: "已切到小闪简报 + 详细报告双层骨架" },
  ];
}

function createOverviewBlockerItems(requirementVersionId) {
  if (requirementVersionId !== "v1.1") {
    return [];
  }

  return [
    { key: "sheet", label: "结构化表格", value: "等待数分下周提供正式字段结构" },
    { key: "xiaoshan", label: "小闪推送", value: "已收口产品要求，待进一步确认接口形态" },
    { key: "detail", label: "页面深做", value: "当前已完成骨架化，下一步进入真实交互承接" },
  ];
}

function createOverviewDistributionItems(requirementVersionId) {
  if (requirementVersionId !== "v1.1") {
    return [];
  }

  return [
    { key: "brief", label: "小闪简报", value: "支持作为同步结果分发" },
    { key: "detail", label: "站内详细报告", value: "支持作为追责与查阅结果页" },
    { key: "trace", label: "状态回写", value: "推送状态需回挂版本与批次" },
  ];
}

function createProjectSelectOptions() {
  return projectOptions.map((item) => ({ ...item }));
}

function createVersionOptions(activeProject) {
  return [
    ...activeProject.versions.map((item) => ({
      label: `v${item.versionNo}`,
      value: item.value,
    })),
    {
      label: "添加验收版本",
      value: "__create_acceptance_version__",
    },
  ];
}

function createViewSelectOptions() {
  return viewOptions.map((item) => ({
    ...item,
    label: item.label,
  }));
}

function createMetricItems(activeVersion, viewData) {
  const channelCount = activeVersion.channelCount ?? 5;

  return [
    { key: "eventCount", label: "埋点数量", value: viewData.metrics.eventCount, tone: "blue" },
    { key: "acceptedCount", label: "已验收", value: viewData.metrics.acceptedCount, tone: "green" },
    { key: "failedCount", label: "不通过", value: viewData.failedTop5.length, tone: "yellow" },
    { key: "pendingCount", label: "未上报", value: viewData.metrics.pendingCount, tone: "purple" },
    { key: "channelCount", label: "验收渠道数", value: channelCount, tone: "blue" },
  ];
}

function createRiskItems(activeVersion, viewData) {
  const latestUpdate = activeVersion.updates[0];
  const failedCount = viewData.failedTop5.length;
  const pendingCount = viewData.pendingTop5.length;

  return [
    {
      key: "latest-update",
      label: "最近变更风险",
      value: latestUpdate ? latestUpdate.title : "暂无最近变更",
    },
    {
      key: "failed-risk",
      label: "阻塞风险",
      value: failedCount ? `${failedCount} 个高优先级问题待处理` : "当前无阻塞问题",
    },
    {
      key: "pending-risk",
      label: "未上报风险",
      value: pendingCount ? `${pendingCount} 个事件仍未上报` : "当前无未上报事件",
    },
  ];
}

function createOverviewSummaryItems(activeVersion, viewData) {
  const latestPassRate = viewData.trend.at(-1)?.passRate ?? "-";
  return [
    { key: "scope", label: "当前验收范围", value: activeVersion.scope },
    { key: "goal", label: "当前版本目标", value: activeVersion.goal },
    { key: "latest-pass-rate", label: "最新通过率", value: `${latestPassRate}%` },
    { key: "update-count", label: "最近更新数", value: `${activeVersion.updates.length} 条` },
  ];
}

function normalizeUpdateType(value) {
  const fallbackMap = {
    版本信息变更: "验收周期",
    埋点需求变更: "埋点需求",
    数据字典更新: "数据字典",
    校验规则变更: "校验规则",
    验收批次报告更新: "验收报告",
  };

  if (fallbackMap[value]) {
    return fallbackMap[value];
  }

  return String(value).replace(/鍙樻洿|鏇存柊/g, "").trim();
}

function getUpdateTagClassName(type) {
  const normalizedType = normalizeUpdateType(type);
  const classNameMap = {
    验收周期: "ta-tag ta-update-tag is-cycle",
    埋点需求: "ta-tag ta-update-tag is-demand",
    校验规则: "ta-tag ta-update-tag is-rule",
    数据字典: "ta-tag ta-update-tag is-dictionary",
    验收报告: "ta-tag ta-update-tag is-report",
    版本信息: "ta-tag ta-update-tag is-demand",
  };

  return classNameMap[normalizedType] ?? "ta-tag ta-update-tag";
}

function TrendChart({ values }) {
  if (!values.length) {
    return (
      <div className="ta-empty-chart">
        <Empty description="暂无趋势数据" />
      </div>
    );
  }

  const config = {
    data: values,
    xField: "date",
    yField: "passRate",
    height: 220,
    padding: [18, 16, 36, 42],
    smooth: true,
    color: "#3B86F9",
    point: {
      size: 3,
      shape: "circle",
      style: {
        fill: "#3B86F9",
        stroke: "#3B86F9",
        lineWidth: 1,
      },
    },
    axis: {
      x: {
        labelFill: "#98A2B3",
        labelFontSize: 12,
        line: true,
        lineStroke: "#D9E1EC",
        tick: true,
        tickStroke: "#D9E1EC",
      },
      y: {
        labelFill: "#98A2B3",
        labelFontSize: 12,
        gridStroke: "#EEF1F5",
        line: true,
        lineStroke: "#D9E1EC",
        tick: true,
        tickStroke: "#D9E1EC",
        labelFormatter: (value) => `${Math.round(Number(value))}%`,
      },
    },
    scale: {
      y: {
        min: 0,
        max: 100,
        tickCount: 5,
      },
    },
    tooltip: {
      items: [
        (datum) => ({
          name: "通过率",
          value: `${Math.round(Number(datum.passRate))}%`,
        }),
      ],
    },
    style: {
      lineWidth: 2,
    },
    interaction: {
      tooltip: {
        marker: false,
      },
    },
    legend: false,
  };

  return (
    <div className="ta-trend">
      <Line {...config} />
    </div>
  );
}

function getPriorityLabel(index) {
  return index < 4 ? "P0" : "P1";
}

function getPriorityClassName(priorityLabel) {
  const classNameMap = {
    P0: "ta-tag ta-tag-priority is-p0",
    P1: "ta-tag ta-tag-priority is-p1",
    P2: "ta-tag ta-tag-priority is-p2",
    P3: "ta-tag ta-tag-priority is-p3",
  };

  return classNameMap[priorityLabel] ?? "ta-tag ta-tag-priority is-p2";
}

function getStatusMeta(type) {
  if (type === "failed") {
    return { label: "不通过", className: "ta-tag is-danger" };
  }

  return { label: "未上报", className: "ta-tag is-info" };
}

function createFailureColumns() {
  return [
    { title: "事件ID", dataIndex: "eventId", key: "eventId", width: 120 },
    {
      title: "事件中文名",
      dataIndex: "eventName",
      key: "eventName",
      width: 180,
      render: (value) => <span className="ta-table-primary">{value}</span>,
    },
    {
      title: "优先级",
      dataIndex: "priority",
      key: "priority",
      width: 84,
      render: (_, __, index) => {
        const priorityLabel = getPriorityLabel(index);
        return <Tag className={getPriorityClassName(priorityLabel)}>{priorityLabel}</Tag>;
      },
    },
    { title: "数据来源", dataIndex: "source", key: "source", width: 120 },
    {
      title: "问题参数",
      dataIndex: "badParam",
      key: "badParam",
      width: 120,
      render: (value) => (
        <YkTooltip title={value}>
          <span className="ta-table-muted">{value}</span>
        </YkTooltip>
      ),
    },
    {
      title: "触发规则",
      dataIndex: "rule",
      key: "rule",
      width: 140,
      render: (value) => <span className="ta-table-muted">{value}</span>,
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 96,
      render: () => {
        const statusMeta = getStatusMeta("failed");
        return <Tag className={statusMeta.className}>{statusMeta.label}</Tag>;
      },
    },
  ];
}

function createPendingColumns() {
  return [
    { title: "事件ID", dataIndex: "eventId", key: "eventId", width: 120 },
    {
      title: "事件中文名",
      dataIndex: "eventName",
      key: "eventName",
      width: 180,
      render: (value) => <span className="ta-table-primary">{value}</span>,
    },
    {
      title: "优先级",
      dataIndex: "priority",
      key: "priority",
      width: 84,
      render: (_, __, index) => {
        const priorityLabel = getPriorityLabel(index);
        return <Tag className={getPriorityClassName(priorityLabel)}>{priorityLabel}</Tag>;
      },
    },
    { title: "数据来源", dataIndex: "source", key: "source", width: 120 },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 96,
      render: () => {
        const statusMeta = getStatusMeta("pending");
        return <Tag className={statusMeta.className}>{statusMeta.label}</Tag>;
      },
    },
  ];
}

function ModulePlaceholder({ moduleLabel, targetLabel }) {
  return (
    <YkCard bordered={false} className="ta-card ta-module-placeholder" title={moduleLabel}>
      <div className="ta-module-placeholder-body">
        <span>当前已跳转至</span>
        <strong>{moduleLabel}</strong>
        <em>{targetLabel}</em>
      </div>
    </YkCard>
  );
}

function App() {
  const safeProjectOptions = useMemo(() => createProjectSelectOptions(), []);
  const safeViewOptions = useMemo(() => createViewSelectOptions(), []);
  const [projectId, setProjectId] = useState(safeProjectOptions[0].value);
  const [versionId, setVersionId] = useState(safeProjectOptions[0].versions[0].value);
  const [viewId, setViewId] = useState(safeViewOptions[0].value);
  const [activeNav, setActiveNav] = useState("overview");
  const [activeTarget, setActiveTarget] = useState("");
  const [requirementsBanner, setRequirementsBanner] = useState("versions");
  const [requirementVersionId, setRequirementVersionId] = useState("v1.1");
  const [workflowContext, setWorkflowContext] = useState(null);

  const activeProject = useMemo(
    () => safeProjectOptions.find((item) => item.value === projectId) ?? safeProjectOptions[0],
    [projectId, safeProjectOptions]
  );

  const versionOptions = useMemo(() => createVersionOptions(activeProject), [activeProject]);
  const activeVersion =
    activeProject.versions.find((item) => item.value === versionId) ?? activeProject.versions[0];
  const viewData = activeVersion.views[viewId] ?? activeVersion.views.all;
  const metricItems = createMetricItems(activeVersion, viewData);
  const riskItems = createRiskItems(activeVersion, viewData);
  const overviewSummaryItems = createOverviewSummaryItems(activeVersion, viewData);
  const failureColumns = useMemo(() => createFailureColumns(), []);
  const pendingColumns = useMemo(() => createPendingColumns(), []);
  const activeNavItem = navigationItems.find((item) => item.key === activeNav) ?? navigationItems[0];
  const requirementVersionMeta =
    requirementVersionMetaMap[requirementVersionId] ?? requirementVersionMetaMap["v1.1"];
  const overviewStageItems = createOverviewStageItems(requirementVersionId);
  const overviewBlockerItems = createOverviewBlockerItems(requirementVersionId);
  const overviewDistributionItems = createOverviewDistributionItems(requirementVersionId);
  const v11RoadmapItems =
    requirementVersionId === "v1.1"
      ? [
          { key: "version", label: "版本管理", value: "统一管理范围、周期、推送状态" },
          { key: "assembly", label: "需求装配", value: "通用模板内置 + 勾选式补充" },
          { key: "query", label: "查询验证", value: "按版本快速回看证据与问题" },
          { key: "report", label: "报告分发", value: "站内详细报告 + 小闪简报推送" },
        ]
      : [];

  function handleProjectChange(nextProjectId) {
    const nextProject =
      safeProjectOptions.find((item) => item.value === nextProjectId) ?? safeProjectOptions[0];
    setProjectId(nextProject.value);
    setVersionId(nextProject.versions[0].value);
  }

  function handleNavChange(nextNav) {
    setActiveNav(nextNav);
    setActiveTarget("");
    setWorkflowContext(null);
    if (nextNav !== "requirements") {
      setRequirementsBanner("versions");
    }
  }

  function handleJump(nextNav, targetLabel, nextWorkflowContext = null) {
    setActiveNav(nextNav);
    setActiveTarget(targetLabel);
    setWorkflowContext(nextWorkflowContext);
    if (nextNav === "requirements" && targetLabel === "版本管理") {
      setRequirementsBanner("versions");
      return;
    }

    if (nextNav !== "requirements") {
      setRequirementsBanner("versions");
    }
  }

  function handleVersionChange(nextVersionId) {
    if (nextVersionId === "__create_acceptance_version__") {
      setActiveNav("requirements");
      setActiveTarget("版本管理");
      setRequirementsBanner("versions");
      return;
    }

    setVersionId(nextVersionId);
  }

  const headerLeft = (
    <div className="ta-header-actions">
      <div className="ta-switch-group">
        <div className="ta-project-select">
          <YkPorjectSelect
            value={activeProject.value}
            options={safeProjectOptions}
            onChange={handleProjectChange}
          />
        </div>
        <div className="ta-context-group">
          <LabelSelect
            label={<span className="ta-context-label">验收版本</span>}
            labelWidth={72}
            value={activeVersion.value}
            options={versionOptions}
            selectWidth={120}
            onChange={handleVersionChange}
            className="ta-label-select"
          />
          <LabelSelect
            label={<span className="ta-context-label">用户视角</span>}
            labelWidth={72}
            value={viewId}
            options={safeViewOptions}
            selectWidth={120}
            onChange={setViewId}
            className="ta-label-select"
          />
        </div>
      </div>
    </div>
  );

  const headerRight = (
    <div className="ta-header-actions ta-header-actions-right">
      <div className="ta-context-group ta-context-group-right">
        <LabelSelect
          label={<span className="ta-context-label">需求版本</span>}
          labelWidth={72}
          value={requirementVersionId}
          options={requirementVersionOptions}
          selectWidth={126}
          onChange={setRequirementVersionId}
          className="ta-label-select"
        />
      </div>
      <Dropdown menu={{ items: personalMenuItems }} trigger={["click"]}>
        <YkButton className="ta-user-button" type="default">
          <Avatar size={22} icon={<UserOutlined />} />
          <span>{currentUserName}</span>
        </YkButton>
      </Dropdown>
    </div>
  );

  return (
    <div className="ta-shell">
      <aside className="ta-sider">
        <div className="ta-brand">
          <img className="ta-brand-logo" src="/tracking-logo.png" alt="埋点验收平台" />
          <span>埋点验收平台</span>
        </div>
        <div className="ta-nav">
          {navigationItems.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`ta-nav-item${item.key === activeNav ? " is-active" : ""}`}
              onClick={() => handleNavChange(item.key)}
            >
              {navIconMap[item.icon]}
              <span>{getNavigationLabel(item, requirementVersionId)}</span>
            </button>
          ))}
        </div>
      </aside>

      <main className="ta-main">
        <YkContainer
          showHeader
          headerLeft={headerLeft}
          headerRight={headerRight}
          className="ta-container"
        >
          <YkCard bordered={false} className="ta-card ta-requirement-version-card">
            <div className="ta-requirement-version-head">
              <div className="ta-requirement-version-copy">
                <strong>{requirementVersionMeta.title}</strong>
                <span>{requirementVersionMeta.summary}</span>
              </div>
              <Tag className="ta-tag ta-update-tag is-report">{requirementVersionMeta.tag}</Tag>
            </div>
            <p>{requirementVersionMeta.focus}</p>
          </YkCard>
          {activeNav === "requirements" ? (
            <RequirementsPage
              initialBanner={requirementsBanner}
              requirementVersionId={requirementVersionId}
              requirementVersionMeta={requirementVersionMeta}
              workflowContext={workflowContext}
              onNavigate={handleJump}
            />
          ) : activeNav === "dictionary" ? (
            <DataDictionaryPage />
          ) : activeNav === "rules" ? (
            <ValidationRulesPage />
          ) : activeNav === "logs" ? (
            <RealtimeQueryPage
              requirementVersionId={requirementVersionId}
              requirementVersionMeta={requirementVersionMeta}
              workflowContext={workflowContext}
              onNavigate={handleJump}
            />
          ) : activeNav === "reports" ? (
            <AcceptanceReportsPage
              requirementVersionId={requirementVersionId}
              requirementVersionMeta={requirementVersionMeta}
              workflowContext={workflowContext}
              onNavigate={handleJump}
            />
          ) : activeNav === "ai" ? (
            <AIAssistantPage />
          ) : activeNav !== "overview" ? (
            <ModulePlaceholder
              moduleLabel={getNavigationLabel(activeNavItem, requirementVersionId)}
              targetLabel={activeTarget || "默认分页"}
            />
          ) : (
            <>
              {requirementVersionId === "v1.1" ? (
                <YkCard bordered={false} className="ta-card ta-roadmap-card" title="v1.1 页面重做主链">
                  <div className="ta-summary-strip ta-summary-strip-compact">
                    {v11RoadmapItems.map((item) => (
                      <div key={item.key} className="ta-summary-strip-item">
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                      </div>
                    ))}
                  </div>
                </YkCard>
              ) : null}

              {requirementVersionId === "v1.1" ? (
                <FlexGrid colSpan={{ xs: 24, md: 12, lg: 12, xl: 12, xxl: 12 }} gutter={[12, 12]}>
                  <YkCard bordered={false} className="ta-card" title="主链推进状态">
                    <div className="ta-summary-strip ta-summary-strip-single">
                      {overviewStageItems.map((item) => (
                        <div key={item.key} className="ta-summary-strip-item">
                          <span>{item.label}</span>
                          <strong>{item.value}</strong>
                        </div>
                      ))}
                    </div>
                  </YkCard>

                  <YkCard bordered={false} className="ta-card" title="当前阻塞与外部依赖">
                    <div className="ta-summary-strip ta-summary-strip-single">
                      {overviewBlockerItems.map((item) => (
                        <div key={item.key} className="ta-summary-strip-item">
                          <span>{item.label}</span>
                          <strong>{item.value}</strong>
                        </div>
                      ))}
                    </div>
                  </YkCard>
                </FlexGrid>
              ) : null}

              <div className="ta-top-overview">
                <YkCard bordered={false} className="ta-target-card" title="版本目标">
                  <div className="ta-target-split">
                    <div className="ta-target-stack">
                      <div className="ta-target-row">
                        <span>需求版本</span>
                        <em>{requirementVersionId}</em>
                      </div>
                      <div className="ta-target-row">
                        <span>验收版本</span>
                        <em>{activeVersion.versionNo}</em>
                      </div>
                      <div className="ta-target-row">
                        <span>验收周期</span>
                        <em>{activeVersion.startDate} - {activeVersion.endDate}</em>
                      </div>
                      <div className="ta-target-row">
                        <span>版本目标</span>
                        <em>{activeVersion.goal}</em>
                      </div>
                      <div className="ta-target-row">
                        <span>验收范围</span>
                        <em>{activeVersion.scope}</em>
                      </div>
                    </div>
                    <div className="ta-inline-metrics">
                      {metricItems.map((item) => (
                        <div
                          key={item.key}
                          className={`ta-inline-metric-card ta-inline-metric-card-${item.tone}`}
                        >
                          <span>{item.label}</span>
                          <em>{item.value}</em>
                        </div>
                      ))}
                    </div>
                  </div>
                </YkCard>
              </div>

              <FlexGrid colSpan={{ xs: 24, md: 12, lg: 12, xl: 12, xxl: 12 }} gutter={[12, 12]}>
                <YkCard
                  bordered={false}
                  className="ta-card ta-sync-card ta-update-card"
                  title="最近更新"
                  extra={
                    <button
                      type="button"
                      className="ta-more-link"
                      onClick={() => handleJump("requirements", "版本管理")}
                    >
                      更多
                    </button>
                  }
                >
                  <div className="ta-update-list">
                    {activeVersion.updates.slice(0, 5).map((item) => (
                      <div key={item.id} className="ta-update-item">
                        <Tag className={getUpdateTagClassName(item.type)}>
                          {normalizeUpdateType(item.type)}
                        </Tag>
                        <div className="ta-update-main">
                          <YkTooltip title={item.title}>
                            <span className="ta-update-title">{item.title}</span>
                          </YkTooltip>
                          <span className="ta-table-muted">{item.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </YkCard>

                <YkCard bordered={false} className="ta-card ta-sync-card ta-trend-card" title="验收趋势">
                  <TrendChart values={viewData.trend} />
                </YkCard>
              </FlexGrid>

              <YkCard bordered={false} className="ta-card ta-risk-card" title="风险摘要">
                <div className="ta-summary-strip ta-summary-strip-compact">
                  {riskItems.map((item) => (
                    <div key={item.key} className="ta-summary-strip-item">
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                </div>
              </YkCard>

              <YkCard bordered={false} className="ta-card" title="同步结论">
                <div className="ta-summary-strip">
                  {overviewSummaryItems.map((item) => (
                    <div key={item.key} className="ta-summary-strip-item">
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                </div>
              </YkCard>

              {requirementVersionId === "v1.1" ? (
                <YkCard bordered={false} className="ta-card" title="对外分发状态">
                  <div className="ta-summary-strip ta-summary-strip-compact">
                    {overviewDistributionItems.map((item) => (
                      <div key={item.key} className="ta-summary-strip-item">
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                      </div>
                    ))}
                  </div>
                </YkCard>
              ) : null}

              <FlexGrid colSpan={{ xs: 24, md: 12, lg: 12, xl: 12, xxl: 12 }} gutter={[12, 12]}>
                <YkCard
                  bordered={false}
                  className="ta-card"
                  title="不通过埋点"
                  extra={
                    <button
                      type="button"
                      className="ta-more-link"
                      onClick={() => handleJump("logs", "不通过埋点")}
                    >
                      更多
                    </button>
                  }
                >
                  <TableTheme>
                    <Table
                      rowKey="eventId"
                      size="small"
                      pagination={false}
                      columns={failureColumns}
                      dataSource={viewData.failedTop5}
                      className="ta-table"
                    />
                  </TableTheme>
                </YkCard>

                <YkCard
                  bordered={false}
                  className="ta-card"
                  title="未上报埋点"
                  extra={
                    <button
                      type="button"
                      className="ta-more-link"
                      onClick={() => handleJump("logs", "未上报埋点")}
                    >
                      更多
                    </button>
                  }
                >
                  <TableTheme>
                    <Table
                      rowKey="eventId"
                      size="small"
                      pagination={false}
                      columns={pendingColumns}
                      dataSource={viewData.pendingTop5}
                      className="ta-table"
                    />
                  </TableTheme>
                </YkCard>
              </FlexGrid>
            </>
          )}
        </YkContainer>
      </main>
    </div>
  );
}

export default App;


import { useMemo, useState } from "react";

import { Column } from "@ant-design/plots";
import { DownloadOutlined } from "@ant-design/icons";
import { Segmented, Select, Table, message } from "antd";
import {
  Empty,
  ModCommonFilter,
  TableTheme,
  YkButton,
  YkCard,
  YkRangeDateWithVS,
  YkTooltip,
} from "@yoka-ui/ui";

import {
  realtimeEventChartData,
  realtimeEventOptions,
  realtimeFieldOptions,
  realtimeLogRows,
  realtimeTimeChartData,
} from "../data/realtimeQueryData";

const PAGE_SIZE_OPTIONS = [20, 100, 500];

const querySessionCards = [
  {
    key: "session-version",
    title: "版本查询会话",
    desc: "查询条件默认服务当前验收版本，避免脱离版本上下文单独找日志。",
    meta: "版本 v1.1 / 花花世界 / 充值与广告链路",
  },
  {
    key: "session-evidence",
    title: "证据回挂",
    desc: "单条查询结果后续需要能回挂事件、参数、报告和不通过原因。",
    meta: "事件 -> 参数 -> 规则 -> 报告",
  },
  {
    key: "session-fast",
    title: "快速定位",
    desc: "优先缩短从筛选到取证再到问题归因的路径，而不是做全量监控总览。",
    meta: "筛选更快 / 证据更快 / 定位更快",
  },
];

function createSingleEventColumns(rows) {
  const dynamicKeys = Array.from(new Set(rows.flatMap((item) => Object.keys(item.flatRow ?? {}))));

  return [
    { title: "日志ID", dataIndex: "logId", key: "logId", width: 200, fixed: "left" },
    { title: "事件中文名", dataIndex: "eventName", key: "eventName", width: 140, fixed: "left" },
    { title: "接收时间", dataIndex: "receivedAt", key: "receivedAt", width: 170 },
    ...dynamicKeys.map((key) => ({
      title: key,
      dataIndex: ["flatRow", key],
      key,
      width: 132,
      render: (value) => value ?? "-",
    })),
  ];
}

function createMultiEventColumns() {
  return [
    { title: "事件ID", dataIndex: "eventId", key: "eventId", width: 150, fixed: "left" },
    { title: "事件中文名", dataIndex: "eventName", key: "eventName", width: 140, fixed: "left" },
    { title: "日志ID", dataIndex: "logId", key: "logId", width: 210 },
    { title: "接收时间", dataIndex: "receivedAt", key: "receivedAt", width: 170 },
    {
      title: "L1层参数",
      dataIndex: "l1Params",
      key: "l1Params",
      width: 300,
      render: (value) => (
        <div className="ta-realtime-param-block">
          {value.map(([key, item]) => (
            <div key={key} className="ta-realtime-param-row">
              <span>{key}</span>
              <em>{item}</em>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: "触发规则",
      dataIndex: "triggeredRules",
      key: "triggeredRules",
      width: 220,
      render: (value) => (
        <div className="ta-realtime-rule-list">
          {value.map((item) => (
            <div key={item} className="ta-realtime-rule-item">
              {item}
            </div>
          ))}
        </div>
      ),
    },
    {
      title: "错误提示",
      dataIndex: "errorMessage",
      key: "errorMessage",
      width: 260,
      render: (value) => (
        <YkTooltip title={value}>
          <span className="ta-ellipsis-text">{value}</span>
        </YkTooltip>
      ),
    },
  ];
}

function downloadCsv(filename, rows) {
  const content = rows
    .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([`\uFEFF${content}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function RealtimeQueryPage({
  requirementVersionId = "v1.1",
  requirementVersionMeta,
  workflowContext,
  onNavigate,
}) {
  const [activeEvent, setActiveEvent] = useState(["login"]);
  const [selectedField, setSelectedField] = useState("");
  const [logType, setLogType] = useState("received");
  const [detailMode, setDetailMode] = useState("single_event");
  const [distributionView, setDistributionView] = useState("time");
  const [receivedRange, setReceivedRange] = useState({
    start: "2026-05-01",
    end: "2026-05-10",
    cmpStart: null,
    cmpEnd: null,
    timeType: "按日",
  });

  const singleEventColumns = useMemo(() => createSingleEventColumns(realtimeLogRows), []);
  const multiEventColumns = useMemo(() => createMultiEventColumns(), []);
  const distributionData = distributionView === "time" ? realtimeTimeChartData : realtimeEventChartData;
  const eventFilterList = realtimeEventOptions.map((item) => ({ code: item.value, name: item.label }));

  const distributionConfig = {
    data: distributionData,
    xField: "type",
    yField: "value",
    color: "#3B86F9",
    height: 236,
    padding: [16, 12, 42, 44],
    scale: {
      x: {
        paddingInner: 0.78,
        paddingOuter: 0.08,
      },
    },
    axis: {
      x: {
        labelFill: "#4C5566",
        labelFontSize: 12,
        title: false,
      },
      y: {
        labelFill: "#98A2B3",
        labelFontSize: 12,
        gridStroke: "#EEF1F5",
        title: false,
      },
    },
    style: {
      radiusTopLeft: 2,
      radiusTopRight: 2,
      maxWidth: 18,
    },
    tooltip: false,
    legend: false,
  };

  function handleQuery() {
    if (!activeEvent.length) {
      message.warning("请选择事件后再查询。");
      return;
    }

    if (!receivedRange.start || !receivedRange.end) {
      message.warning("请选择接收时间后再查询。");
      return;
    }

    message.success("已按当前条件执行实时查询。");
  }

  function handleReset() {
    setActiveEvent(["login"]);
    setSelectedField("");
    setLogType("received");
    setDetailMode("single_event");
    setDistributionView("time");
    setReceivedRange({
      start: "2026-05-01",
      end: "2026-05-10",
      cmpStart: null,
      cmpEnd: null,
      timeType: "按日",
    });
  }

  function handleExport() {
    if (detailMode === "single_event") {
      const keys = Array.from(new Set(realtimeLogRows.flatMap((item) => Object.keys(item.flatRow ?? {}))));
      downloadCsv("实时查询-单事件查询.csv", [
        ["日志ID", "事件中文名", "接收时间", ...keys],
        ...realtimeLogRows.map((item) => [
          item.logId,
          item.eventName,
          item.receivedAt,
          ...keys.map((key) => item.flatRow?.[key] ?? "-"),
        ]),
      ]);
      return;
    }

    downloadCsv("实时查询-多事件查询.csv", [
      ["事件ID", "事件中文名", "日志ID", "接收时间", "L1层参数", "触发规则", "错误提示"],
      ...realtimeLogRows.map((item) => [
        item.eventId,
        item.eventName,
        item.logId,
        item.receivedAt,
        item.l1Params.map(([key, value]) => `${key}: ${value}`).join("；"),
        item.triggeredRules.join("；"),
        item.errorMessage,
      ]),
    ]);
  }

  const currentColumns = detailMode === "single_event" ? singleEventColumns : multiEventColumns;
  const evidenceSummary = [
    { key: "eventCount", label: "当前事件", value: `${activeEvent.length} 个` },
    { key: "field", label: "字段筛选", value: selectedField || "全部字段" },
    { key: "logType", label: "日志接收", value: logType === "received" ? "已接收" : "未接收" },
    { key: "mode", label: "查询模式", value: detailMode === "single_event" ? "单事件查询" : "多事件查询" },
  ];
  const distributionSummary = useMemo(() => {
    const total = distributionData.reduce((sum, item) => sum + item.value, 0);
    const peak = distributionData.reduce((best, item) => (item.value > best.value ? item : best), distributionData[0]);
    return [
      { key: "total", label: "样本总量", value: total.toLocaleString("zh-CN") },
      { key: "peak", label: "峰值位置", value: peak?.type ?? "-" },
      { key: "peakValue", label: "峰值数量", value: peak ? peak.value.toLocaleString("zh-CN") : "-" },
      { key: "distribution", label: "当前分布", value: distributionView === "time" ? "时间分布" : "事件分布" },
    ];
  }, [distributionData, distributionView]);

  return (
    <div className="ta-realtime-page">
      <YkCard bordered={false} className="ta-card ta-page-version-card">
        <div className="ta-page-version-head">
          <strong>当前按 {requirementVersionId} 口径查看查询验证</strong>
          <span>{requirementVersionMeta?.focus ?? "查询页已接入需求版本上下文。"}</span>
        </div>
      </YkCard>

      {requirementVersionId === "v1.1" ? (
        <>
          <div className="ta-summary-strip">
            <div className="ta-summary-strip-item">
              <span>查询定位</span>
              <strong>服务版本验收，不做独立监控大盘</strong>
            </div>
            <div className="ta-summary-strip-item">
              <span>默认上下文</span>
              <strong>结果需能回挂到版本、事件、参数、报告</strong>
            </div>
            <div className="ta-summary-strip-item">
              <span>目标体验</span>
              <strong>更快筛选、更快取证、更快定位不通过原因</strong>
            </div>
          </div>

          <YkCard bordered={false} className="ta-card ta-assembly-card">
            <div className="ta-card-head">
              <span className="ta-section-title">v1.1 查询验证骨架</span>
            </div>
            <div className="ta-assembly-grid ta-assembly-grid-third">
              {querySessionCards.map((item) => (
                <div key={item.key} className="ta-assembly-item">
                  <div className="ta-assembly-item-head">
                    <strong>{item.title}</strong>
                  </div>
                  <span>{item.desc}</span>
                  <em>{item.meta}</em>
                </div>
              ))}
            </div>
            <div className="ta-inline-actions">
              <button
                type="button"
                className="ta-inline-link"
                onClick={() =>
                  onNavigate?.("reports", "查询验证后查看验收报告", {
                    source: "logs",
                    summary: "当前查询会话需回挂到验收报告与不通过结论",
                  })
                }
              >
                带当前查询会话去验收报告
              </button>
            </div>
          </YkCard>
        </>
      ) : null}

      {workflowContext?.source === "requirements" ? (
        <YkCard bordered={false} className="ta-card ta-page-version-card">
          <div className="ta-page-version-head">
            <strong>当前来源：需求装配</strong>
            <span>{workflowContext.summary}</span>
          </div>
        </YkCard>
      ) : null}

      <YkCard bordered={false} className="ta-card ta-realtime-filter-block" title="筛选条件">
        <div className="ta-realtime-filter-row">
          <div className="ta-realtime-filter-item ta-realtime-filter-item-event">
            <span className="ta-realtime-filter-label">事件</span>
            <ModCommonFilter
              title="事件"
              prefixTitle=""
              value={activeEvent}
              onChange={setActiveEvent}
              list={eventFilterList}
              placeholder="请输入事件名称"
              contentWidth={420}
              columnCount={2}
            />
          </div>

          <div className="ta-realtime-filter-item ta-realtime-filter-item-field">
            <span className="ta-realtime-filter-label">字段</span>
            <Select
              showSearch
              value={selectedField}
              options={[{ label: "全部字段", value: "" }, ...realtimeFieldOptions]}
              onChange={setSelectedField}
              optionFilterProp="label"
              className="ta-realtime-select ta-realtime-select-field"
              placeholder="请选择字段"
            />
          </div>

          <div className="ta-realtime-filter-item ta-realtime-filter-item-date">
            <span className="ta-realtime-filter-label">接收时间</span>
            <YkRangeDateWithVS
              value={receivedRange}
              onChange={(patch) => setReceivedRange((prev) => ({ ...prev, ...patch }))}
              dateCompare={true}
              timeCompare={false}
              timeOptions={["按日", "按周", "按月"]}
              rangeDisplayLabel="接收时间"
            />
          </div>

          <div className="ta-realtime-filter-item ta-realtime-filter-item-logtype">
            <span className="ta-realtime-filter-label">日志接收</span>
            <Segmented
              value={logType}
              onChange={setLogType}
              className="ta-realtime-log-segmented"
              options={[
                { label: "未接收", value: "missing" },
                { label: "已接收", value: "received" },
              ]}
            />
          </div>
        </div>

        <div className="ta-realtime-filter-actions ta-realtime-filter-actions-left">
          <YkButton type="primary" onClick={handleQuery}>
            开始查询
          </YkButton>
          <YkButton type="default" onClick={handleReset}>
            重置
          </YkButton>
          <YkButton type="default" icon={<DownloadOutlined />} onClick={handleExport}>
            导出
          </YkButton>
        </div>
      </YkCard>

      <div className="ta-summary-strip">
        {evidenceSummary.map((item) => (
          <div key={item.key} className="ta-summary-strip-item">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>

      <YkCard bordered={false} className="ta-card ta-realtime-chart-block">
        <div className="ta-card-head">
          <Segmented
            value={distributionView}
            onChange={setDistributionView}
            options={[
              { label: "时间分布", value: "time" },
              { label: "事件分布", value: "event" },
            ]}
          />
        </div>
        <div className="ta-summary-strip">
          {distributionSummary.map((item) => (
            <div key={item.key} className="ta-summary-strip-item">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
        <Column {...distributionConfig} />
      </YkCard>

      <YkCard bordered={false} className="ta-card ta-realtime-detail-block" title="日志明细">
        <div className="ta-realtime-log-header ta-realtime-log-head">
          <div className="ta-realtime-log-copy">
            <strong>校验结果明细</strong>
          </div>
          <Segmented
            value={detailMode}
            onChange={setDetailMode}
            options={[
              { label: "单事件查询", value: "single_event" },
              { label: "多事件查询", value: "multi_event" },
            ]}
          />
        </div>

        <TableTheme>
          <Table
            rowKey="key"
            size="small"
            pagination={{
              pageSize: 20,
              defaultPageSize: 20,
              pageSizeOptions: PAGE_SIZE_OPTIONS,
              showSizeChanger: true,
            }}
            columns={currentColumns}
            dataSource={realtimeLogRows}
            scroll={{ x: detailMode === "single_event" ? 1400 : 1550 }}
            locale={{ emptyText: <Empty description="当前条件下暂无日志结果" /> }}
            className="ta-table ta-requirement-table"
          />
        </TableTheme>
      </YkCard>
    </div>
  );
}

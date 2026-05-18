import { useMemo, useState } from "react";

import { LeftOutlined, PlusOutlined, RobotOutlined, SearchOutlined } from "@ant-design/icons";
import { Input, Modal, Select, Table, Tag, message } from "antd";
import { Empty, LabelSelect, TableTheme, YkButton, YkCard, YkTooltip } from "@yoka-ui/ui";

import {
  acceptanceBriefPromptDefault,
  acceptanceChannelCategoryOptions,
  acceptanceChannelOptions,
  acceptanceDetailPromptDefault,
  acceptanceEventCategoryOptions,
  acceptanceEventOptions,
  acceptanceLaunchModeOptions,
  acceptancePlatformOptions,
  acceptanceReportDetailMap,
  acceptanceReportInsightMap,
  acceptanceReportKpiMap,
  acceptanceReportRows,
  acceptanceReportVersionOptions,
} from "../data/acceptanceReportsData";

function buildLaunchScope({ launchMode, selectedPlatform, selectedChannels, selectedEvents }) {
  if (launchMode === "platform_scope") {
    const target = acceptancePlatformOptions.find((item) => item.value === selectedPlatform)?.label ?? "全部";
    return `分端验收 / ${target}`;
  }

  if (launchMode === "channel_scope") {
    const labels = acceptanceChannelOptions
      .filter((item) => selectedChannels.includes(item.value))
      .map((item) => item.label);
    return `分渠道验收 / ${labels.join("、") || "未选择渠道"}`;
  }

  const labels = acceptanceEventOptions
    .filter((item) => selectedEvents.includes(item.value))
    .map((item) => item.label);

  if (launchMode === "single_event") {
    return `单事件验收 / ${labels[0] ?? "未选择事件"}`;
  }

  return `多选事件验收 / ${labels.join("、") || "未选择事件"}`;
}

function createDetailColumns() {
  return [
    { title: "事件ID", dataIndex: "eventId", key: "eventId", width: 140, fixed: "left" },
    { title: "事件中文名", dataIndex: "eventCnName", key: "eventCnName", width: 160, fixed: "left" },
    { title: "不通过参数", dataIndex: "failedParam", key: "failedParam", width: 128 },
    { title: "不通过规则", dataIndex: "failedRule", key: "failedRule", width: 160 },
    { title: "规则分类", dataIndex: "ruleCategory", key: "ruleCategory", width: 128 },
    {
      title: "验收标准",
      dataIndex: "acceptanceStandard",
      key: "acceptanceStandard",
      width: 280,
      render: (value) => (
        <YkTooltip title={value}>
          <span className="ta-ellipsis-text">{value}</span>
        </YkTooltip>
      ),
    },
    {
      title: "上报示例",
      dataIndex: "payloadExample",
      key: "payloadExample",
      width: 280,
      render: (value) => (
        <YkTooltip title={value}>
          <span className="ta-ellipsis-text">{value}</span>
        </YkTooltip>
      ),
    },
  ];
}

function SectionList({ title, items }) {
  return (
    <YkCard bordered={false} className="ta-card">
      <div className="ta-card-head">
        <span className="ta-section-title">{title}</span>
      </div>
      <div className="ta-change-list">
        {items.length ? (
          items.map((item, index) => (
            <div key={`${title}-${index}`} className="ta-change-item">
              <span>{item}</span>
            </div>
          ))
        ) : (
          <Empty description={`暂无${title}`} />
        )}
      </div>
    </YkCard>
  );
}

const distributionCards = [
  {
    key: "push-brief",
    title: "小闪同步简报",
    desc: "用于把验收结果快速同步到站外协作对象，强调结论、风险和推进判断。",
    meta: "简报 / 可推送 / 可追踪",
  },
  {
    key: "detail-report",
    title: "站内详细报告",
    desc: "用于查看完整不通过明细、未上报明细、规则命中明细和证据样本。",
    meta: "详情 / 可回挂 / 可追责",
  },
  {
    key: "push-status",
    title: "分发状态回写",
    desc: "推送状态与推送时间需要回挂到版本与批次，形成完整结果链路。",
    meta: "批次 -> 报告 -> 推送状态",
  },
];

export default function AcceptanceReportsPage({
  requirementVersionId = "v1.1",
  requirementVersionMeta,
  workflowContext,
  onNavigate,
}) {
  const [launchOpen, setLaunchOpen] = useState(false);
  const [aiConfigOpen, setAiConfigOpen] = useState(false);
  const [launchMode, setLaunchMode] = useState("single_event");
  const [selectedPlatform, setSelectedPlatform] = useState("client");
  const [channelCategory, setChannelCategory] = useState("all");
  const [eventCategory, setEventCategory] = useState("all");
  const [selectedChannels, setSelectedChannels] = useState(["tap"]);
  const [selectedEvents, setSelectedEvents] = useState(["HW_LOGIN_FINISH"]);
  const [briefPrompt, setBriefPrompt] = useState(acceptanceBriefPromptDefault);
  const [detailPrompt, setDetailPrompt] = useState(acceptanceDetailPromptDefault);
  const [reportRows, setReportRows] = useState(acceptanceReportRows);
  const [selectedReportKey, setSelectedReportKey] = useState(null);
  const [reportVersionFilter, setReportVersionFilter] = useState("all");
  const [reportStatusFilter, setReportStatusFilter] = useState("all");
  const [reportKeyword, setReportKeyword] = useState("");

  const selectedReport = useMemo(
    () => reportRows.find((item) => item.key === selectedReportKey) ?? null,
    [reportRows, selectedReportKey]
  );

  const detailRows = useMemo(
    () => (selectedReport ? acceptanceReportDetailMap[selectedReport.key] ?? [] : []),
    [selectedReport]
  );

  const reportInsight = useMemo(
    () => (selectedReport ? acceptanceReportInsightMap[selectedReport.key] ?? null : null),
    [selectedReport]
  );

  const reportKpis = useMemo(
    () => (selectedReport ? acceptanceReportKpiMap[selectedReport.key] ?? [] : []),
    [selectedReport]
  );

  const detailColumns = useMemo(() => createDetailColumns(), []);
  const filteredReportRows = useMemo(() => {
    const keyword = reportKeyword.trim().toLowerCase();
    return reportRows.filter((item) => {
      if (reportVersionFilter !== "all" && item.version !== reportVersionFilter) return false;
      if (reportStatusFilter !== "all" && item.status !== reportStatusFilter) return false;
      if (!keyword) return true;
      return [item.batchNo, item.scope, item.launchMode, item.initiator, item.brief]
        .join(" ")
        .toLowerCase()
        .includes(keyword);
    });
  }, [reportKeyword, reportRows, reportStatusFilter, reportVersionFilter]);
  const reportSummary = useMemo(
    () => [
      { key: "reportCount", label: "批次数", value: filteredReportRows.length },
      {
        key: "completedCount",
        label: "已完成",
        value: filteredReportRows.filter((item) => item.status === "已完成").length,
      },
      {
        key: "runningCount",
        label: "进行中",
        value: filteredReportRows.filter((item) => item.status !== "已完成").length,
      },
    ],
    [filteredReportRows]
  );

  const filteredChannelOptions = useMemo(
    () =>
      acceptanceChannelOptions.filter((item) => {
        if (channelCategory !== "all" && item.category !== channelCategory) return false;
        if (selectedPlatform !== "all" && item.platform !== selectedPlatform) return false;
        return true;
      }),
    [channelCategory, selectedPlatform]
  );

  const filteredEventOptions = useMemo(
    () =>
      acceptanceEventOptions.filter((item) => {
        if (eventCategory !== "all" && item.category !== eventCategory) return false;
        if (selectedPlatform !== "all" && item.platform !== selectedPlatform) return false;
        return true;
      }),
    [eventCategory, selectedPlatform]
  );

  function handleLaunchSubmit() {
    const nextRow = {
      key: `report-${Date.now()}`,
      batchNo: `批次 ${String(reportRows.length + 1).padStart(2, "0")}`,
      version: acceptanceReportVersionOptions[0].value,
      scope: buildLaunchScope({ launchMode, selectedPlatform, selectedChannels, selectedEvents }),
      initiator: "云山",
      launchMode: acceptanceLaunchModeOptions.find((item) => item.value === launchMode)?.label ?? "单事件验收",
      status: "进行中",
      eventCount:
        launchMode === "single_event"
          ? 1
          : launchMode === "channel_scope"
            ? Math.max(selectedChannels.length * 2, 1)
            : selectedEvents.length || filteredEventOptions.length,
      failedCount: 0,
      passRate: "待生成",
      createdAt: "今天 20:10",
      summary: "已发起新的验收批次，当前等待日志回流和规则校验结果。",
      brief: "AI 简报待生成。你可以在批次完成后进入详情页查看完整结果。",
      pushStatus: "待推送",
      pushedAt: "-",
    };

    setReportRows((current) => [nextRow, ...current]);
    setSelectedReportKey(nextRow.key);
    setLaunchOpen(false);
    message.success("已发起验收批次。");
  }

  function handlePushReport(report) {
    setReportRows((current) =>
      current.map((item) =>
        item.key === report.key
          ? {
              ...item,
              pushStatus: "已推送",
              pushedAt: "2026-05-09 19:30",
            }
          : item
      )
    );
    message.success(`已推送 ${report.batchNo} 简报到小闪。`);
  }

  async function handleShareReport(report) {
    const shareLink = `https://tracking-acceptance.local/report/${report.key}`;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareLink);
        message.success(`已复制 ${report.batchNo} 分享链接。`);
        return;
      }
    } catch {}
    message.success(`分享链接：${shareLink}`);
  }

  return (
    <div className="ta-report-page">
      <YkCard bordered={false} className="ta-card ta-page-version-card">
        <div className="ta-page-version-head">
          <strong>当前按 {requirementVersionId} 口径查看验收报告</strong>
          <span>{requirementVersionMeta?.focus ?? "报告页将随需求版本切换承接不同口径。"}</span>
        </div>
      </YkCard>

      {requirementVersionId === "v1.1" ? (
        <>
          <div className="ta-summary-strip">
            <div className="ta-summary-strip-item">
              <span>报告定位</span>
              <strong>站内详细报告 + 小闪同步简报</strong>
            </div>
            <div className="ta-summary-strip-item">
              <span>分发要求</span>
              <strong>验收结果需要可推送、可追踪、可回挂版本</strong>
            </div>
            <div className="ta-summary-strip-item">
              <span>主链角色</span>
              <strong>作为版本验收结果产品，而不是普通列表页</strong>
            </div>
          </div>

          <YkCard bordered={false} className="ta-card ta-assembly-card">
            <div className="ta-card-head">
              <span className="ta-section-title">v1.1 报告分发骨架</span>
            </div>
            <div className="ta-assembly-grid ta-assembly-grid-third">
              {distributionCards.map((item) => (
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
                  onNavigate?.("requirements", "从报告回看装配来源", {
                    source: "reports",
                    summary: "当前报告需要回看到版本装配模板、勾选项与差异项来源",
                  })
                }
              >
                回看装配来源
              </button>
            </div>
          </YkCard>
        </>
      ) : null}

      {workflowContext ? (
        <YkCard bordered={false} className="ta-card ta-page-version-card">
          <div className="ta-page-version-head">
            <strong>当前进入来源：{workflowContext.source === "logs" ? "查询验证" : workflowContext.source === "requirements" ? "需求装配" : "主链联动"}</strong>
            <span>{workflowContext.summary}</span>
          </div>
        </YkCard>
      ) : null}

      <YkCard
        bordered={false}
        className="ta-card ta-requirement-filter-card"
        title={selectedReport ? "报告详情" : "验收报告"}
        extra={
          <div className="ta-requirement-actions">
            {selectedReport ? (
              <button type="button" className="ta-table-link" onClick={() => setSelectedReportKey(null)}>
                <LeftOutlined />
                返回列表
              </button>
            ) : null}
            <YkButton type="primary" icon={<PlusOutlined />} onClick={() => setLaunchOpen(true)}>
              发起验收
            </YkButton>
            <YkButton type="default" icon={<RobotOutlined />} onClick={() => setAiConfigOpen(true)}>
              AI报告配置
            </YkButton>
          </div>
        }
      >
        {!selectedReport ? (
          <div className="ta-report-list-shell">
            <div className="ta-summary-strip">
              {reportSummary.map((item) => (
                <div key={item.key} className="ta-summary-strip-item">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
            <div className="ta-unified-toolbar">
              <div className="ta-unified-toolbar-filters">
                <Select
                  value={reportVersionFilter}
                  options={[{ label: "全部版本", value: "all" }, ...acceptanceReportVersionOptions]}
                  onChange={setReportVersionFilter}
                  className="ta-realtime-select ta-realtime-select-field"
                />
                <Select
                  value={reportStatusFilter}
                  options={[
                    { label: "全部状态", value: "all" },
                    { label: "已完成", value: "已完成" },
                    { label: "进行中", value: "进行中" },
                  ]}
                  onChange={setReportStatusFilter}
                  className="ta-realtime-select ta-realtime-select-field"
                />
                <Input
                  allowClear
                  value={reportKeyword}
                  onChange={(event) => setReportKeyword(event.target.value)}
                  placeholder="搜索批次、范围、方式或发起人"
                  className="ta-requirement-search"
                  suffix={<SearchOutlined style={{ color: "#90a0b7" }} />}
                />
              </div>
            </div>
            <div className="ta-report-card-list">
              {filteredReportRows.length ? (
                filteredReportRows.map((item) => (
                  <YkCard key={item.key} bordered={false} className="ta-card ta-report-batch-card">
                    <div
                      className="ta-report-batch-body"
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedReportKey(item.key)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedReportKey(item.key);
                        }
                      }}
                    >
                      <div className="ta-report-batch-head">
                        <div className="ta-report-batch-title">
                          <strong>{item.batchNo}</strong>
                          <span>{item.createdAt}</span>
                        </div>
                        <Tag className={`ta-tag ${item.status === "已完成" ? "is-success" : "is-warning"}`}>{item.status}</Tag>
                      </div>
                      <div className="ta-report-batch-meta">
                        <span>验收版本：{item.version}</span>
                        <span>验收方式：{item.launchMode}</span>
                        <span>发起人：{item.initiator}</span>
                      </div>
                      <div className="ta-report-batch-meta">
                        <span>小闪推送：{item.pushStatus ?? "待推送"}</span>
                        <span>推送时间：{item.pushedAt ?? "-"}</span>
                      </div>
                      <div className="ta-report-batch-scope">{item.scope}</div>
                      <div className="ta-report-batch-kpis">
                        <div>
                          <em>验收数量</em>
                          <strong>{item.eventCount}</strong>
                        </div>
                        <div>
                          <em>未通过数量</em>
                          <strong>{item.failedCount}</strong>
                        </div>
                        <div>
                          <em>验收通过率</em>
                          <strong>{item.passRate}</strong>
                        </div>
                      </div>
                      <p>{item.brief}</p>
                    </div>
                    <div className="ta-report-batch-actions">
                      <YkButton type="default" size="s" onClick={() => handlePushReport(item)}>
                        推送简报到小闪
                      </YkButton>
                      <YkButton type="default" size="s" onClick={() => handleShareReport(item)}>
                        分享链接
                      </YkButton>
                    </div>
                  </YkCard>
                ))
              ) : (
                <YkCard bordered={false} className="ta-card">
                  <Empty description="当前筛选条件下暂无验收报告" />
                </YkCard>
              )}
            </div>
          </div>
        ) : (
          <div className="ta-report-detail-page">
            <div className="ta-summary-strip">
              <div className="ta-summary-strip-item">
                <span>当前批次</span>
                <strong>{selectedReport.batchNo}</strong>
              </div>
              <div className="ta-summary-strip-item">
                <span>验收版本</span>
                <strong>{selectedReport.version}</strong>
              </div>
              <div className="ta-summary-strip-item">
                <span>验收状态</span>
                <strong>{selectedReport.status}</strong>
              </div>
              <div className="ta-summary-strip-item">
                <span>推进判断</span>
                <strong>{reportInsight?.versionProgress ?? "待补充"}</strong>
              </div>
              <div className="ta-summary-strip-item">
                <span>小闪推送</span>
                <strong>{selectedReport.pushStatus ?? "待推送"}</strong>
              </div>
            </div>

            <YkCard bordered={false} className="ta-card">
              <div className="ta-card-head">
                <span className="ta-section-title">摘要</span>
              </div>
              <div className="ta-change-list">
                <div className="ta-change-item">
                  <strong>{selectedReport.batchNo}</strong>
                  <span>{reportInsight?.summary ?? selectedReport.brief}</span>
                </div>
              </div>
            </YkCard>

            <YkCard bordered={false} className="ta-card">
              <div className="ta-card-head">
                <span className="ta-section-title">验收概况</span>
              </div>
              <div className="ta-report-summary-grid">
                <div className="ta-target-row"><span>验收版本</span><em>{selectedReport.version}</em></div>
                <div className="ta-target-row"><span>验收方式</span><em>{selectedReport.launchMode}</em></div>
                <div className="ta-target-row"><span>验收范围</span><em>{selectedReport.scope}</em></div>
                <div className="ta-target-row"><span>发起人</span><em>{selectedReport.initiator}</em></div>
                <div className="ta-target-row"><span>验收数量</span><em>{reportInsight?.acceptanceCount ?? `${selectedReport.eventCount} 个事件`}</em></div>
                <div className="ta-target-row"><span>版本覆盖率</span><em>{reportInsight?.coverageRate ?? "-"}</em></div>
                <div className="ta-target-row"><span>未上报数量</span><em>{reportInsight?.unreportedCount ?? "-"}</em></div>
                <div className="ta-target-row"><span>已上报数量</span><em>{reportInsight?.reportedCount ?? "-"}</em></div>
                <div className="ta-target-row"><span>未通过数量</span><em>{reportInsight?.failedCount ?? `${selectedReport.failedCount}`}</em></div>
                <div className="ta-target-row"><span>验收通过率</span><em>{reportInsight?.passRate ?? selectedReport.passRate}</em></div>
                <div className="ta-target-row"><span>发起时间</span><em>{selectedReport.createdAt}</em></div>
                <div className="ta-target-row"><span>版本进度</span><em>{reportInsight?.versionProgress ?? "-"}</em></div>
                <div className="ta-target-row"><span>推送时间</span><em>{selectedReport.pushedAt ?? "-"}</em></div>
              </div>
            </YkCard>

            <YkCard bordered={false} className="ta-card ta-report-kpi-card">
              <div className="ta-card-head">
                <span className="ta-section-title">AI报告统计</span>
              </div>
              <div className="ta-report-stats-grid">
                {reportKpis.map((item) => (
                  <div key={item.key} className={`ta-report-stat-card is-${item.tone}`}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            </YkCard>

            {reportInsight ? (
              <div className="ta-report-section-grid">
                <SectionList title="未上报明细" items={reportInsight.unreportedDetails} />
                <SectionList title="未通过明细" items={reportInsight.failedDetails} />
                <SectionList title="已通过明细" items={reportInsight.passedDetails} />
                <SectionList title="未通过规则" items={reportInsight.failedRules} />
              </div>
            ) : null}

            <YkCard bordered={false} className="ta-card">
              <div className="ta-card-head">
                <span className="ta-section-title">校验结果明细</span>
              </div>
              <TableTheme>
                <Table
                  rowKey="key"
                  size="small"
                  pagination={false}
                  columns={detailColumns}
                  dataSource={detailRows}
                  scroll={{ x: 1450 }}
                  locale={{ emptyText: <Empty description="当前批次暂无校验明细" /> }}
                  className="ta-table ta-requirement-table"
                />
              </TableTheme>
            </YkCard>
          </div>
        )}
      </YkCard>

      <Modal
        title="发起验收"
        open={launchOpen}
        onOk={handleLaunchSubmit}
        onCancel={() => setLaunchOpen(false)}
        okText="确认发起"
        cancelText="取消"
      >
        <div className="ta-version-form">
          <div className="ta-version-form-row">
            <label>验收方式</label>
            <Select
              value={launchMode}
              options={acceptanceLaunchModeOptions}
              onChange={setLaunchMode}
              popupMatchSelectWidth={false}
            />
          </div>
          <div className="ta-version-form-row">
            <label>端筛选</label>
            <LabelSelect
              label=""
              value={selectedPlatform}
              options={acceptancePlatformOptions}
              selectWidth={260}
              onChange={setSelectedPlatform}
              className="ta-requirement-select"
            />
          </div>
          {(launchMode === "channel_scope" || launchMode === "platform_scope") && (
            <>
              <div className="ta-version-form-row">
                <label>渠道分类</label>
                <LabelSelect
                  label=""
                  value={channelCategory}
                  options={acceptanceChannelCategoryOptions}
                  selectWidth={260}
                  onChange={setChannelCategory}
                  className="ta-requirement-select"
                />
              </div>
              <div className="ta-version-form-row">
                <label>渠道选择</label>
                <Select
                  mode="multiple"
                  value={selectedChannels}
                  options={filteredChannelOptions}
                  onChange={setSelectedChannels}
                  placeholder="请选择渠道"
                />
              </div>
            </>
          )}
          <div className="ta-version-form-row">
            <label>事件分类</label>
            <LabelSelect
              label=""
              value={eventCategory}
              options={acceptanceEventCategoryOptions}
              selectWidth={260}
              onChange={setEventCategory}
              className="ta-requirement-select"
            />
          </div>
          <div className="ta-version-form-row">
            <label>{launchMode === "single_event" ? "单个事件" : "事件选择"}</label>
            <Select
              mode={launchMode === "single_event" ? undefined : "multiple"}
              value={launchMode === "single_event" ? selectedEvents[0] : selectedEvents}
              options={filteredEventOptions}
              onChange={(value) => setSelectedEvents(Array.isArray(value) ? value : value ? [value] : [])}
              placeholder={launchMode === "single_event" ? "请选择单个事件" : "请选择一批事件"}
            />
          </div>
        </div>
      </Modal>

      <Modal
        title="AI报告配置"
        open={aiConfigOpen}
        onOk={() => {
          setAiConfigOpen(false);
          message.success("已更新 AI 报告配置。");
        }}
        onCancel={() => setAiConfigOpen(false)}
        okText="保存配置"
        cancelText="取消"
        width={760}
      >
        <div className="ta-version-form">
          <div className="ta-version-form-row ta-version-form-row-full">
            <label>简报提示词</label>
            <Input.TextArea
              rows={8}
              value={briefPrompt}
              onChange={(event) => setBriefPrompt(event.target.value)}
              placeholder="请输入简报提示词"
            />
          </div>
          <div className="ta-version-form-row ta-version-form-row-full">
            <label>详细报告提示词</label>
            <Input.TextArea
              rows={14}
              value={detailPrompt}
              onChange={(event) => setDetailPrompt(event.target.value)}
              placeholder="请输入详细报告提示词"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

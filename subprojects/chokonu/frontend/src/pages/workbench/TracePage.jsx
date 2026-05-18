import { Button, Space, Tabs, Tag } from "antd";

import { traceRows } from "../../data/mockData";
import { DetailPanel, statusColor, WorkbenchPage } from "./shared";

export function TraceDetail({ record, workflowActions }) {
  return (
    <div className="detail-panel-body">
      <div className="detail-title">
        <div>
          <span className="eyebrow">Trace 详情</span>
          <h3>{record.traceId}</h3>
        </div>
        <Tag color={statusColor(record.level)}>{record.level}</Tag>
      </div>
      <div className="detail-grid compact">
        <div>
          <span>类型</span>
          <strong>{record.type}</strong>
        </div>
        <div>
          <span>状态</span>
          <strong>{record.status}</strong>
        </div>
        <div>
          <span>运行任务</span>
          <strong>{record.run}</strong>
        </div>
        <div>
          <span>时间</span>
          <strong>{record.time}</strong>
        </div>
      </div>
      <Tabs
        size="small"
        items={[
          {
            key: "steps",
            label: "步骤轨迹",
            children: (
              <ol className="ordered-list">
                {record.details.steps.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            ),
          },
          {
            key: "logs",
            label: "日志明细",
            children: (
              <ul className="plain-list">
                {record.details.logs.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ),
          },
          {
            key: "screenshots",
            label: "截图证据",
            children: (
              <ul className="plain-list">
                {record.details.screenshots.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ),
          },
          {
            key: "tools",
            label: "工具调用",
            children: (
              <ul className="plain-list">
                {record.details.tools.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ),
          },
          { key: "ai", label: "AI 分析", children: <p>{record.details.ai}</p> },
          {
            key: "notes",
            label: "人工备注",
            children: (
              <ul className="plain-list">
                {record.details.notes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ),
          },
        ]}
      />
      <div className="detail-actions">
        <Button type="primary" onClick={() => workflowActions?.fromTraceToReport(record.key)}>
          汇总到报告
        </Button>
      </div>
    </div>
  );
}

export default function TracePage({
  currentProject,
  isMobile,
  detailCollapsed,
  onToggleDetail,
  selectedRecord,
  onSelectRecord,
  workflowActions,
}) {
  return (
    <WorkbenchPage
      title="Trace 台"
      desc="统一证据中心。桌面端保留右侧详情，移动端改为抽屉展开，避免日志和截图直接挤压视口。"
      summary={[
        { label: "Trace 总数", value: "118" },
        { label: "异常 Trace", value: "9" },
        { label: "截图证据", value: "37" },
        { label: "工具调用", value: "64" },
      ]}
      filters={[
        { label: "项目", value: currentProject.name },
        { label: "类型", value: "UI / MCP / AI Eval" },
        { label: "证据", value: "截图 / 日志 / 工具调用" },
        { label: "风险等级", value: "观察 / 高风险 / 阻断" },
      ]}
      rows={traceRows}
      selectedRecord={selectedRecord}
      onSelect={onSelectRecord}
      columns={[
        { title: "Trace ID", dataIndex: "traceId" },
        { title: "Run", dataIndex: "run" },
        { title: "类型", dataIndex: "type" },
        {
          title: "等级",
          dataIndex: "level",
          render: (value) => <Tag color={statusColor(value)}>{value}</Tag>,
        },
        { title: "异常摘要", dataIndex: "summary" },
        { title: "时间", dataIndex: "time" },
      ]}
      detailContent={
        isMobile ? null : (
          <DetailPanel title={selectedRecord.traceId} collapsed={detailCollapsed} onToggle={onToggleDetail}>
            <TraceDetail record={selectedRecord} workflowActions={workflowActions} />
          </DetailPanel>
        )
      }
      actions={
        <Space>
          <Button type="primary">查看异常聚类</Button>
          <Button onClick={() => workflowActions?.fromTraceToReport(selectedRecord.key)}>汇总到报告</Button>
        </Space>
      }
    />
  );
}

import { Button, Space, Tabs, Tag } from "antd";

import { executionRows } from "../../data/mockData";
import { DetailPanel, statusColor, WorkbenchPage } from "./shared";

export function ExecutionDetail({ record, workflowActions }) {
  return (
    <div className="detail-panel-body">
      <div className="detail-title">
        <div>
          <span className="eyebrow">执行详情</span>
          <h3>{record.name}</h3>
        </div>
        <Tag color={statusColor(record.status)}>{record.status}</Tag>
      </div>
      <div className="detail-grid compact">
        <div>
          <span>环境</span>
          <strong>{record.env}</strong>
        </div>
        <div>
          <span>任务集</span>
          <strong>{record.suite}</strong>
        </div>
        <div>
          <span>触发来源</span>
          <strong>{record.trigger}</strong>
        </div>
        <div>
          <span>执行器</span>
          <strong>{record.executor}</strong>
        </div>
      </div>
      <Tabs
        size="small"
        items={[
          { key: "summary", label: "任务概览", children: <p>{record.details.overview}</p> },
          {
            key: "steps",
            label: "执行步骤",
            children: (
              <ol className="ordered-list">
                {record.details.steps.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            ),
          },
          {
            key: "nodes",
            label: "节点状态",
            children: (
              <ul className="plain-list">
                {record.details.nodes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ),
          },
          {
            key: "logs",
            label: "日志 / 截图",
            children: (
              <ul className="plain-list">
                {record.details.logs.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ),
          },
          { key: "failure", label: "失败定位", children: <p>{record.details.failure}</p> },
          { key: "report", label: "关联报告", children: <p>{record.details.report}</p> },
          {
            key: "audit",
            label: "审计",
            children: (
              <ul className="plain-list">
                {record.details.audit.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ),
          },
        ]}
      />
      <div className="detail-actions">
        <Button type="primary" onClick={() => workflowActions?.fromExecutionToTrace(record.key)}>
          查看 Trace
        </Button>
      </div>
    </div>
  );
}

export default function ExecutionPage({
  currentProject,
  currentEnv,
  isMobile,
  detailCollapsed,
  onToggleDetail,
  selectedRecord,
  onSelectRecord,
  workflowActions,
}) {
  return (
    <WorkbenchPage
      title="执行台"
      desc="统一执行入口，并明确区分平台手动、AI Coding、仓库分支、MCP 与 CI/CD 等触发来源。"
      summary={[
        { label: "运行中", value: "27" },
        { label: "今日完成", value: "45" },
        { label: "失败", value: "6" },
        { label: "重试任务", value: "4" },
      ]}
      filters={[
        { label: "项目", value: currentProject.name },
        { label: "环境", value: currentEnv },
        { label: "触发来源", value: "平台 / AI Coding / 分支 / MCP / CI" },
        { label: "状态", value: "运行中 / 失败 / 待复核" },
      ]}
      rows={executionRows}
      selectedRecord={selectedRecord}
      onSelect={onSelectRecord}
      columns={[
        { title: "任务", dataIndex: "name" },
        { title: "项目", dataIndex: "project" },
        { title: "环境", dataIndex: "env" },
        { title: "执行器", dataIndex: "executor" },
        { title: "触发来源", dataIndex: "trigger" },
        {
          title: "状态",
          dataIndex: "status",
          render: (value) => <Tag color={statusColor(value)}>{value}</Tag>,
        },
        { title: "耗时", dataIndex: "duration" },
      ]}
      detailContent={
        isMobile ? null : (
          <DetailPanel title={selectedRecord.name} collapsed={detailCollapsed} onToggle={onToggleDetail}>
            <ExecutionDetail record={selectedRecord} workflowActions={workflowActions} />
          </DetailPanel>
        )
      }
      actions={
        <Space>
          <Button type="primary">发起执行</Button>
          <Button onClick={() => workflowActions?.fromExecutionToTrace(selectedRecord.key)}>查看 Trace</Button>
        </Space>
      }
    />
  );
}

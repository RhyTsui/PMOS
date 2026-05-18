import { Button, Space, Tabs, Tag } from "antd";

import { caseRows } from "../../data/mockData";
import { DetailPanel, statusColor, WorkbenchPage } from "./shared";

export function CaseDetail({ record, workflowActions }) {
  return (
    <div className="detail-panel-body">
      <div className="detail-title">
        <div>
          <span className="eyebrow">用例详情</span>
          <h3>{record.name}</h3>
        </div>
        <Tag color={statusColor(record.status)}>{record.status}</Tag>
      </div>
      <div className="detail-grid compact">
        <div>
          <span>case_type</span>
          <strong>{record.caseType}</strong>
        </div>
        <div>
          <span>执行器</span>
          <strong>{record.executor}</strong>
        </div>
        <div>
          <span>断言方式</span>
          <strong>{record.assertion}</strong>
        </div>
        <div>
          <span>项目</span>
          <strong>{record.project}</strong>
        </div>
      </div>
      <Tabs
        size="small"
        items={[
          { key: "content", label: "用例内容", children: <p>{record.details.content}</p> },
          { key: "config", label: "执行配置", children: <p>{record.details.config}</p> },
          {
            key: "judge",
            label: "断言 / Judge",
            children: (
              <ul className="plain-list">
                {record.details.judge.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ),
          },
          {
            key: "result",
            label: "最近结果",
            children: (
              <ul className="plain-list">
                {record.details.results.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ),
          },
          {
            key: "trace",
            label: "Trace 入口",
            children: (
              <ul className="plain-list">
                {record.details.trace.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ),
          },
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
        <Button type="primary" onClick={() => workflowActions?.fromCaseToExecution(record.key)}>
          发起执行
        </Button>
      </div>
    </div>
  );
}

export default function CasesPage({
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
      title="用例台"
      desc="统一承接测试资产，并把项目上下文、diff 命中和 AI 回归建议放进同一页面。"
      summary={[
        { label: "用例总数", value: "284" },
        { label: "测试集", value: "39" },
        { label: "首版类型", value: "ui / agent / mcp" },
        { label: "AI 补案建议", value: "12 条" },
      ]}
      filters={[
        { label: "项目", value: currentProject.name },
        { label: "case_type", value: "ui / agent / mcp" },
        { label: "执行器", value: "UI / MCP / Agent / AI Eval" },
        { label: "断言", value: "规则 / 截图 / Judge" },
      ]}
      rows={caseRows}
      selectedRecord={selectedRecord}
      onSelect={onSelectRecord}
      columns={[
        { title: "用例名称", dataIndex: "name" },
        {
          title: "case_type",
          dataIndex: "caseType",
          render: (value) => <Tag color="geekblue">{value}</Tag>,
        },
        { title: "项目", dataIndex: "project" },
        { title: "执行器", dataIndex: "executor" },
        { title: "断言", dataIndex: "assertion" },
        {
          title: "最近结果",
          dataIndex: "status",
          render: (value) => <Tag color={statusColor(value)}>{value}</Tag>,
        },
      ]}
      detailContent={
        isMobile ? null : (
          <DetailPanel title={selectedRecord.name} collapsed={detailCollapsed} onToggle={onToggleDetail}>
            <CaseDetail record={selectedRecord} workflowActions={workflowActions} />
          </DetailPanel>
        )
      }
      actions={
        <Space>
          <Button type="primary">新建用例</Button>
          <Button onClick={() => workflowActions?.fromCaseToExecution(selectedRecord.key)}>发起执行</Button>
        </Space>
      }
    />
  );
}

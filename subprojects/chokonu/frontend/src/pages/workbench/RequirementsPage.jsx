import { Button, Space, Tabs, Tag } from "antd";

import { requirementRows } from "../../data/mockData";
import { DetailPanel, statusColor, WorkbenchPage } from "./shared";

export function RequirementDetail({ record, workflowActions }) {
  return (
    <div className="detail-panel-body">
      <div className="detail-title">
        <div>
          <span className="eyebrow">需求详情</span>
          <h3>{record.title}</h3>
        </div>
        <Tag color={statusColor(record.status)}>{record.status}</Tag>
      </div>
      <div className="detail-grid compact">
        <div>
          <span>项目</span>
          <strong>{record.project}</strong>
        </div>
        <div>
          <span>来源</span>
          <strong>{record.source}</strong>
        </div>
        <div>
          <span>优先级</span>
          <strong>{record.priority}</strong>
        </div>
        <div>
          <span>类型</span>
          <strong>{record.type}</strong>
        </div>
      </div>
      <Tabs
        size="small"
        items={[
          { key: "base", label: "业务背景", children: <p>{record.details.background}</p> },
          { key: "ai", label: "AI 理解", children: <p>{record.details.aiSummary}</p> },
          {
            key: "cases",
            label: "关联用例",
            children: (
              <ul className="plain-list">
                {record.details.relatedCases.map((item) => (
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
        <Button type="primary" onClick={() => workflowActions?.fromRequirementToCases(record.key)}>
          生成并查看用例
        </Button>
      </div>
    </div>
  );
}

export default function RequirementsPage({
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
      title="需求台"
      desc="需求既可以来自 PRD，也可以来自仓库 diff、AI Coding 工作流和人工补录。"
      summary={[
        { label: "需求总数", value: "96" },
        { label: "待生成用例", value: "18" },
        { label: "高优先级", value: "11" },
        { label: "AI 解析来源", value: "43%" },
      ]}
      filters={[
        { label: "项目", value: currentProject.name },
        { label: "来源", value: "PRD / Diff / AI Coding / 人工" },
        { label: "状态", value: "待生成 / 执行中 / 已归档" },
        { label: "优先级", value: "P0 / P1 / P2" },
      ]}
      rows={requirementRows}
      selectedRecord={selectedRecord}
      onSelect={onSelectRecord}
      columns={[
        { title: "需求标题", dataIndex: "title" },
        { title: "项目", dataIndex: "project" },
        { title: "来源", dataIndex: "source" },
        {
          title: "优先级",
          dataIndex: "priority",
          render: (value) => <Tag color={value === "P0" ? "red" : value === "P1" ? "orange" : "blue"}>{value}</Tag>,
        },
        { title: "类型", dataIndex: "type" },
        {
          title: "状态",
          dataIndex: "status",
          render: (value) => <Tag color={statusColor(value)}>{value}</Tag>,
        },
      ]}
      detailContent={
        isMobile ? null : (
          <DetailPanel title={selectedRecord.title} collapsed={detailCollapsed} onToggle={onToggleDetail}>
            <RequirementDetail record={selectedRecord} workflowActions={workflowActions} />
          </DetailPanel>
        )
      }
      actions={
        <Space>
          <Button type="primary">AI 解析需求</Button>
          <Button onClick={() => workflowActions?.fromRequirementToCases(selectedRecord.key)}>生成用例草案</Button>
        </Space>
      }
    />
  );
}

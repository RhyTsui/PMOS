import { Button, Space, Tabs, Tag } from "antd";

import { reportRows } from "../../data/mockData";
import { DetailPanel, statusColor, WorkbenchPage } from "./shared";

export function ReportDetail({ record, workflowActions }) {
  return (
    <div className="detail-panel-body">
      <div className="detail-title">
        <div>
          <span className="eyebrow">报告详情</span>
          <h3>{record.name}</h3>
        </div>
        <Tag color={statusColor(record.risk)}>{record.risk}</Tag>
      </div>
      <div className="detail-grid compact">
        <div>
          <span>版本</span>
          <strong>{record.version}</strong>
        </div>
        <div>
          <span>范围</span>
          <strong>{record.scope}</strong>
        </div>
        <div>
          <span>通过率</span>
          <strong>{record.passRate}</strong>
        </div>
        <div>
          <span>更新时间</span>
          <strong>{record.updatedAt}</strong>
        </div>
      </div>
      <Tabs
        size="small"
        items={[
          { key: "overview", label: "概览", children: <p>{record.details.overview}</p> },
          {
            key: "scope",
            label: "范围",
            children: (
              <ul className="plain-list">
                {record.details.scope.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ),
          },
          {
            key: "distribution",
            label: "结果分布",
            children: (
              <ul className="plain-list">
                {record.details.distribution.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ),
          },
          {
            key: "issues",
            label: "关键问题",
            children: (
              <ul className="plain-list">
                {record.details.issues.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ),
          },
          {
            key: "evidence",
            label: "证据引用",
            children: (
              <ul className="plain-list">
                {record.details.evidence.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ),
          },
          { key: "ai", label: "AI 分析", children: <p>{record.details.ai}</p> },
          {
            key: "suggestions",
            label: "修复建议",
            children: (
              <ul className="plain-list">
                {record.details.suggestions.map((item) => (
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
        <Button type="primary" onClick={() => workflowActions?.fromReportToReview(record.key)}>
          提交复核
        </Button>
      </div>
    </div>
  );
}

export default function ReportsPage({
  currentProject,
  currentVersion,
  isMobile,
  detailCollapsed,
  onToggleDetail,
  selectedRecord,
  onSelectRecord,
  workflowActions,
}) {
  return (
    <WorkbenchPage
      title="报告台"
      desc="输出的是质量结论，不只是测试结果；同时承接 AI 分析和回传研发流的动作。"
      summary={[
        { label: "报告总数", value: "19" },
        { label: "今日新增", value: "5" },
        { label: "高风险报告", value: "4" },
        { label: "待确认", value: "3" },
      ]}
      filters={[
        { label: "项目", value: currentProject.name },
        { label: "版本", value: currentVersion },
        { label: "风险等级", value: "观察 / 高风险 / 阻断" },
        { label: "结论", value: "待修复 / 生成中 / 待确认" },
      ]}
      rows={reportRows}
      selectedRecord={selectedRecord}
      onSelect={onSelectRecord}
      columns={[
        { title: "报告名称", dataIndex: "name" },
        { title: "版本", dataIndex: "version" },
        { title: "范围", dataIndex: "scope" },
        { title: "通过率", dataIndex: "passRate" },
        {
          title: "风险等级",
          dataIndex: "risk",
          render: (value) => <Tag color={statusColor(value)}>{value}</Tag>,
        },
        {
          title: "状态",
          dataIndex: "status",
          render: (value) => <Tag color={statusColor(value)}>{value}</Tag>,
        },
      ]}
      detailContent={
        isMobile ? null : (
          <DetailPanel title={selectedRecord.name} collapsed={detailCollapsed} onToggle={onToggleDetail}>
            <ReportDetail record={selectedRecord} workflowActions={workflowActions} />
          </DetailPanel>
        )
      }
      actions={
        <Space>
          <Button type="primary">生成报告</Button>
          <Button onClick={() => workflowActions?.fromReportToReview(selectedRecord.key)}>提交复核</Button>
        </Space>
      }
    />
  );
}

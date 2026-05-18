import { Button, Space, Tabs, Tag } from "antd";

import { reviewRows } from "../../data/mockData";
import { DetailPanel, statusColor, WorkbenchPage } from "./shared";

export function ReviewDetail({ record, workflowActions }) {
  return (
    <div className="detail-panel-body">
      <div className="detail-title">
        <div>
          <span className="eyebrow">复核详情</span>
          <h3>{record.name}</h3>
        </div>
        <Tag color={statusColor(record.status)}>{record.status}</Tag>
      </div>
      <Tabs
        size="small"
        items={[
          { key: "ai", label: "AI 结论", children: <p>{record.details.ai}</p> },
          {
            key: "rules",
            label: "规则判定",
            children: (
              <ul className="plain-list">
                {record.details.rules.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ),
          },
          {
            key: "human",
            label: "人工复核",
            children: (
              <ul className="plain-list">
                {record.details.human.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ),
          },
          {
            key: "dispute",
            label: "争议记录",
            children: (
              <ul className="plain-list">
                {record.details.dispute.map((item) => (
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
        <Button type="primary" onClick={() => workflowActions?.fromReviewToGate(record.key)}>
          生成门禁结论
        </Button>
      </div>
    </div>
  );
}

export default function ReviewPage({
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
      title="复核台"
      desc="AI Judge 不是最终拍板，人工复核需要承接争议记录和回传动作。"
      summary={[
        { label: "待复核", value: "14" },
        { label: "已通过", value: "9" },
        { label: "已驳回", value: "2" },
        { label: "争议项", value: "3" },
      ]}
      filters={[
        { label: "项目", value: currentProject.name },
        { label: "AI 结论", value: "通过 / 阻断 / 有歧义" },
        { label: "状态", value: "待人工复核 / 已确认" },
        { label: "审核人", value: "按责任人筛选" },
      ]}
      rows={reviewRows}
      selectedRecord={selectedRecord}
      onSelect={onSelectRecord}
      columns={[
        { title: "复核项", dataIndex: "name" },
        { title: "来源报告", dataIndex: "report" },
        { title: "AI 结论", dataIndex: "aiDecision" },
        {
          title: "状态",
          dataIndex: "status",
          render: (value) => <Tag color={statusColor(value)}>{value}</Tag>,
        },
        { title: "审核人", dataIndex: "reviewer" },
        { title: "更新时间", dataIndex: "updatedAt" },
      ]}
      detailContent={
        isMobile ? null : (
          <DetailPanel title={selectedRecord.name} collapsed={detailCollapsed} onToggle={onToggleDetail}>
            <ReviewDetail record={selectedRecord} workflowActions={workflowActions} />
          </DetailPanel>
        )
      }
      actions={
        <Space>
          <Button type="primary">提交复核结论</Button>
          <Button onClick={() => workflowActions?.fromReviewToGate(selectedRecord.key)}>生成门禁结论</Button>
        </Space>
      }
    />
  );
}

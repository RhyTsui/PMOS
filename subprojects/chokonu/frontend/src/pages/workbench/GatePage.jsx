import { Button, Space, Tabs, Tag } from "antd";

import { gateRows } from "../../data/mockData";
import { DetailPanel, statusColor, WorkbenchPage } from "./shared";

export function GateDetail({ record }) {
  return (
    <div className="detail-panel-body">
      <div className="detail-title">
        <div>
          <span className="eyebrow">门禁详情</span>
          <h3>{record.version}</h3>
        </div>
        <Tag color={statusColor(record.decision)}>{record.decision}</Tag>
      </div>
      <Tabs
        size="small"
        items={[
          { key: "overview", label: "门禁概览", children: <p>{record.details.overview}</p> },
          {
            key: "blocks",
            label: "阻断项",
            children: (
              <ul className="plain-list">
                {record.details.blocks.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ),
          },
          {
            key: "review",
            label: "复核结论",
            children: (
              <ul className="plain-list">
                {record.details.review.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ),
          },
          { key: "risk", label: "风险说明", children: <p>{record.details.risk}</p> },
          { key: "suggestion", label: "放行建议", children: <p>{record.details.suggestion}</p> },
          {
            key: "decisions",
            label: "决策记录",
            children: (
              <ul className="plain-list">
                {record.details.decisions.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ),
          },
          { key: "audit", label: "审计", children: <p>{record.details.audit}</p> },
        ]}
      />
    </div>
  );
}

export default function GatePage({
  currentProject,
  currentVersion,
  isMobile,
  detailCollapsed,
  onToggleDetail,
  selectedRecord,
  onSelectRecord,
}) {
  return (
    <WorkbenchPage
      title="门禁台"
      desc="最终支撑版本放行判断，并且明确例外放行是风险决策，不是普通按钮。"
      summary={[
        { label: "待决策版本", value: "3" },
        { label: "已放行", value: "7" },
        { label: "已阻断", value: "2" },
        { label: "例外放行", value: "1" },
      ]}
      filters={[
        { label: "项目", value: currentProject.name },
        { label: "版本", value: currentVersion },
        { label: "状态", value: "可放行 / 待决策 / 不可放行" },
        { label: "风险等级", value: "高风险 / 阻断" },
      ]}
      rows={gateRows}
      selectedRecord={selectedRecord}
      onSelect={onSelectRecord}
      columns={[
        { title: "版本", dataIndex: "version" },
        { title: "范围", dataIndex: "scope" },
        {
          title: "风险等级",
          dataIndex: "risk",
          render: (value) => <Tag color={statusColor(value)}>{value}</Tag>,
        },
        {
          title: "门禁结论",
          dataIndex: "decision",
          render: (value) => <Tag color={statusColor(value)}>{value}</Tag>,
        },
        { title: "负责人", dataIndex: "owner" },
        { title: "更新时间", dataIndex: "updatedAt" },
      ]}
      detailContent={
        isMobile ? null : (
          <DetailPanel title={selectedRecord.version} collapsed={detailCollapsed} onToggle={onToggleDetail}>
            <GateDetail record={selectedRecord} />
          </DetailPanel>
        )
      }
      actions={
        <Space>
          <Button type="primary">生成门禁结论</Button>
          <Button danger>记录例外放行</Button>
        </Space>
      }
    />
  );
}

import { Button, Card, Table } from "antd";

export function statusColor(status) {
  switch (status) {
    case "阻断":
    case "失败":
    case "不可放行":
    case "待修复":
      return "red";
    case "高风险":
    case "待决策":
    case "待复核":
    case "待人工复核":
    case "接入中":
    case "能力映射中":
    case "待确认":
    case "观察":
    case "观察中":
      return "orange";
    case "运行中":
    case "生成中":
    case "待执行":
    case "用例草案已生成":
      return "blue";
    case "健康":
    case "已接入":
    case "已联通":
    case "已回传":
    case "已确认阻断":
    case "已归档":
      return "green";
    default:
      return "default";
  }
}

export function metricTone(status) {
  if (status === "blocked") return "danger";
  if (status === "risk") return "warn";
  if (status === "running") return "info";
  return "good";
}

export function DataTable({ columns, rows, onSelect, selectedKey }) {
  return (
    <Table
      size="middle"
      pagination={false}
      rowKey="key"
      columns={columns}
      dataSource={rows}
      onRow={(record) => ({
        onClick: () => onSelect(record),
      })}
      rowClassName={(record) => (record.key === selectedKey ? "selected-row" : "")}
      scroll={{ x: 960 }}
    />
  );
}

export function SectionHeader({ title, desc, extra }) {
  return (
    <div className="section-header">
      <div>
        <div className="section-kicker">{title}</div>
        <h2>{title}</h2>
        <p>{desc}</p>
      </div>
      {extra ? <div className="section-extra">{extra}</div> : null}
    </div>
  );
}

export function DetailPanel({ title, collapsed, onToggle, children }) {
  return (
    <aside className={`desktop-detail ${collapsed ? "collapsed" : ""}`}>
      <div className="desktop-detail-header">
        <div>
          <span className="eyebrow">右侧上下文</span>
          {!collapsed ? <h3>{title}</h3> : null}
        </div>
        <Button size="small" onClick={onToggle}>
          {collapsed ? "展开" : "收起"}
        </Button>
      </div>
      {!collapsed ? children : <div className="collapsed-placeholder">上下文已收起</div>}
    </aside>
  );
}

export function WorkbenchPage({
  title,
  desc,
  summary,
  filters,
  rows,
  columns,
  selectedRecord,
  onSelect,
  detailContent,
  actions,
}) {
  return (
    <div className="page-stack">
      <SectionHeader title={title} desc={desc} extra={actions} />
      <div className="summary-strip">
        {summary.map((item) => (
          <div key={item.label} className="summary-chip compact">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
      <div className="toolbar-card brand-card">
        <div className="toolbar-filters">
          {filters.map((item) => (
            <div key={item.label} className="toolbar-filter">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      </div>
      <div className="workspace-grid">
        <Card className="brand-card table-card" bordered={false}>
          <DataTable columns={columns} rows={rows} onSelect={onSelect} selectedKey={selectedRecord.key} />
        </Card>
        {detailContent}
      </div>
    </div>
  );
}

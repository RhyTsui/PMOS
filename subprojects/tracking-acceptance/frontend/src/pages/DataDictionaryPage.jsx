import { useMemo, useRef, useState } from "react";

import { DownOutlined, SearchOutlined, UploadOutlined, UpOutlined } from "@ant-design/icons";
import { Drawer, Input, Modal, Table, Tag, message } from "antd";
import { Empty, TableTheme, YkButton, YkCard } from "@yoka-ui/ui";

import { dictionaryRows } from "../data/dataDictionaryData";

const PAGE_SIZE_OPTIONS = [20, 100, 500];

const mainColumns = [
  { title: "参数", dataIndex: "fieldName", key: "fieldName", width: 144, ellipsis: true },
  { title: "参数中文名", dataIndex: "fieldCnName", key: "fieldCnName", width: 156, ellipsis: true },
  { title: "字段类型", dataIndex: "fieldType", key: "fieldType", width: 96, ellipsis: true },
  {
    title: "是否必填",
    dataIndex: "required",
    key: "required",
    width: 88,
    render: (value) => <Tag color={value ? "blue" : "default"}>{value ? "必填" : "非必填"}</Tag>,
  },
  { title: "适用事件数", dataIndex: "eventCount", key: "eventCount", width: 96, align: "center" },
  {
    title: "枚举/取值范围",
    dataIndex: "enumRange",
    key: "enumRange",
    width: 320,
    render: (value) => <span className="ta-ellipsis-text">{value}</span>,
  },
  { title: "数据来源", dataIndex: "source", key: "source", width: 120, ellipsis: true },
  {
    title: "字段说明",
    dataIndex: "description",
    key: "description",
    width: 240,
    render: (value) => <span className="ta-ellipsis-text">{value}</span>,
  },
  {
    title: "最近变更",
    dataIndex: "recentChangeType",
    key: "recentChangeType",
    width: 112,
    render: (value) => (value ? <Tag color="gold">{value}</Tag> : <span className="ta-table-muted">无</span>),
  },
  { title: "最后更新人", dataIndex: "updatedBy", key: "updatedBy", width: 104, ellipsis: true },
  { title: "最后更新时间", dataIndex: "updatedAt", key: "updatedAt", width: 156, ellipsis: true },
];

const enumColumns = [
  { title: "枚举值", dataIndex: "enumValue", key: "enumValue", width: 120, ellipsis: true },
  { title: "枚举中文名", dataIndex: "enumCnName", key: "enumCnName", width: 132, ellipsis: true },
  {
    title: "描述",
    dataIndex: "description",
    key: "description",
    width: 220,
    render: (value) => <span className="ta-ellipsis-text">{value}</span>,
  },
  { title: "排序", dataIndex: "sort", key: "sort", width: 80, align: "center" },
  { title: "状态", dataIndex: "status", key: "status", width: 88, ellipsis: true },
  {
    title: "适用条件",
    dataIndex: "condition",
    key: "condition",
    width: 200,
    render: (value) => <span className="ta-ellipsis-text">{value}</span>,
  },
];

export default function DataDictionaryPage() {
  const uploadInputRef = useRef(null);
  const [uploadGuideOpen, setUploadGuideOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [expandedRowKeys, setExpandedRowKeys] = useState([]);
  const [activeField, setActiveField] = useState(null);

  const filteredRows = useMemo(() => {
    if (!keyword.trim()) return dictionaryRows;
    const search = keyword.trim().toLowerCase();
    return dictionaryRows.filter((item) =>
      [
        item.fieldName,
        item.fieldCnName,
        item.fieldType,
        item.enumRange,
        item.source,
        item.description,
        item.updatedBy,
        item.updatedAt,
        item.recentChangeType,
        item.sampleValue,
        item.acceptanceStandard,
        ...item.relatedEvents,
        ...item.relatedRules,
        ...item.changeHistory,
        ...item.enumValues.flatMap((enumItem) => [
          enumItem.enumValue,
          enumItem.enumCnName,
          enumItem.description,
          enumItem.condition,
        ]),
      ]
        .join(" ")
        .toLowerCase()
        .includes(search),
    );
  }, [keyword]);
  const dictionarySummary = useMemo(() => {
    const enumCount = filteredRows.reduce((total, item) => total + item.enumValues.length, 0);
    const changedCount = filteredRows.filter((item) => item.recentChangeType).length;
    return [
      { key: "fieldCount", label: "参数总数", value: filteredRows.length },
      { key: "enumCount", label: "枚举值", value: enumCount },
      { key: "changedCount", label: "最近变更", value: changedCount },
    ];
  }, [filteredRows]);
  const recentChanges = useMemo(
    () => filteredRows.filter((item) => item.recentChangeType).slice(0, 3),
    [filteredRows]
  );

  function openUploadGuide() {
    setUploadGuideOpen(true);
  }

  function triggerUploadSelect() {
    setUploadGuideOpen(false);
    uploadInputRef.current?.click();
  }

  function handleTemplateUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const isExcel = /\.xlsx?$/.test(file.name);
    const isTemplateName = file.name.includes("模板");

    if (!isExcel || !isTemplateName) {
      message.error("上传失败，因部分数据不完整或导致无法更新数据字典。");
      event.target.value = "";
      return;
    }

    message.success("上传成功，已完成数据字典更新。");
    event.target.value = "";
  }

  function renderExpandedRow(record) {
    if (!record.enumValues.length) {
      return (
        <div className="ta-dictionary-expanded-empty">
          <Empty description="该参数暂无枚举值明细" />
        </div>
      );
    }

    return (
      <div className="ta-dictionary-expanded">
        <Table
          rowKey="key"
          size="small"
          tableLayout="fixed"
          pagination={false}
          scroll={{ x: 840 }}
          columns={enumColumns}
          dataSource={record.enumValues}
          className="ta-table ta-dictionary-subtable"
        />
      </div>
    );
  }

  return (
    <div className="ta-dictionary-page">
      <YkCard
        bordered={false}
        className="ta-card ta-requirement-filter-card"
        title="数据字典管理"
        extra={
          <div className="ta-requirement-actions">
            <input
              ref={uploadInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="ta-hidden-upload-input"
              onChange={handleTemplateUpload}
            />
            <Input
              className="ta-requirement-search"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索参数、枚举值或字段说明"
              suffix={<SearchOutlined style={{ color: "#90a0b7" }} />}
            />
            <YkButton type="default" onClick={() => window.open("/data-dictionary-template.xlsx", "_blank")}>
              下载模板
            </YkButton>
            <YkButton type="primary" icon={<UploadOutlined />} onClick={openUploadGuide}>
              上传或覆盖更新
            </YkButton>
          </div>
        }
      >
        <div className="ta-summary-strip">
          {dictionarySummary.map((item) => (
            <div key={item.key} className="ta-summary-strip-item">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>

        {recentChanges.length ? (
          <div className="ta-highlight-list">
            {recentChanges.map((item) => (
              <div key={item.key} className="ta-highlight-item">
                <strong>{item.fieldCnName}</strong>
                <span>{item.recentChangeType} · {item.updatedAt}</span>
              </div>
            ))}
          </div>
        ) : null}

        <TableTheme>
          <Table
            rowKey="key"
            size="small"
            tableLayout="fixed"
            scroll={{ x: 1740 }}
            onRow={(record) => ({
              onClick: () => setActiveField(record),
              className: `ta-requirement-row${record.recentChangeType ? " ta-recent-change-row" : ""}`,
            })}
            pagination={{
              pageSize: 20,
              defaultPageSize: 20,
              pageSizeOptions: PAGE_SIZE_OPTIONS,
              showSizeChanger: true,
            }}
            columns={mainColumns}
            dataSource={filteredRows}
            locale={{ emptyText: <Empty description="暂无数据字典" /> }}
            expandable={{
              columnWidth: 128,
              expandedRowKeys,
              onExpandedRowsChange: setExpandedRowKeys,
              expandedRowRender: renderExpandedRow,
              rowExpandable: (record) => record.enumValues.length > 0,
              expandIcon: ({ expanded, onExpand, record }) =>
                record.enumValues.length > 0 ? (
                  <button
                    type="button"
                    className="ta-expand-toggle"
                    onClick={(event) => {
                      event.stopPropagation();
                      onExpand(record, event);
                    }}
                  >
                    {expanded ? <UpOutlined /> : <DownOutlined />}
                    {expanded ? "收起枚举值" : "查看枚举值"}
                  </button>
                ) : (
                  <span className="ta-table-muted">无枚举</span>
                ),
            }}
            className="ta-table ta-requirement-table ta-dictionary-table"
          />
        </TableTheme>
      </YkCard>

      <Modal
        title="上传数据字典模板"
        open={uploadGuideOpen}
        onOk={triggerUploadSelect}
        onCancel={() => setUploadGuideOpen(false)}
        okText="选择文件"
        cancelText="取消"
      >
        <p>请按模板填写后上传，系统将新增或覆盖更新当前数据字典。</p>
        <p>如果未按格式填写，则提示上传失败，因部分数据不完整或导致无法更新数据字典。</p>
      </Modal>

      <Drawer
        title="参数详情"
        open={Boolean(activeField)}
        width={560}
        onClose={() => setActiveField(null)}
        className="ta-requirement-drawer"
      >
        {activeField ? (
          <div className="ta-requirement-drawer-body">
            <YkCard bordered={false} className="ta-card ta-drawer-block">
              <div className="ta-drawer-headline ta-drawer-headline-hero">
                <div className="ta-drawer-title-group">
                  <strong>{activeField.fieldCnName}</strong>
                  <span className="ta-drawer-id">{activeField.fieldName}</span>
                </div>
                <div className="ta-drawer-status-group">
                  {activeField.recentChangeType ? <Tag color="gold">{activeField.recentChangeType}</Tag> : null}
                  <Tag color={activeField.required ? "blue" : "default"}>
                    {activeField.required ? "必填" : "非必填"}
                  </Tag>
                  <span className="ta-drawer-update-time">{activeField.updatedAt}</span>
                </div>
              </div>
              <div className="ta-detail-grid">
                <div className="ta-detail-row">
                  <span>字段类型</span>
                  <em>{activeField.fieldType}</em>
                </div>
                <div className="ta-detail-row">
                  <span>数据来源</span>
                  <em>{activeField.source}</em>
                </div>
                <div className="ta-detail-row">
                  <span>适用事件数</span>
                  <em>{activeField.eventCount}</em>
                </div>
                <div className="ta-detail-row">
                  <span>示例值</span>
                  <em>{activeField.sampleValue}</em>
                </div>
                <div className="ta-detail-row">
                  <span>字段说明</span>
                  <em>{activeField.description}</em>
                </div>
                <div className="ta-detail-row">
                  <span>验收标准</span>
                  <em>{activeField.acceptanceStandard}</em>
                </div>
              </div>
            </YkCard>

            <YkCard bordered={false} className="ta-card ta-drawer-block" title="枚举值字典">
              {activeField.enumValues.length ? (
                <Table
                  rowKey="key"
                  size="small"
                  tableLayout="fixed"
                  scroll={{ x: 840 }}
                  pagination={false}
                  columns={enumColumns}
                  dataSource={activeField.enumValues}
                  className="ta-table ta-dictionary-subtable"
                />
              ) : (
                <Empty description="该参数暂无枚举值明细" />
              )}
            </YkCard>

            <YkCard bordered={false} className="ta-card ta-drawer-block" title="关联事件">
              <div className="ta-related-list">
                {activeField.relatedEvents.length ? (
                  activeField.relatedEvents.map((item) => (
                    <span key={item} className="ta-related-chip">
                      {item}
                    </span>
                  ))
                ) : (
                  <Empty description="暂无关联事件" />
                )}
              </div>
            </YkCard>

            <YkCard bordered={false} className="ta-card ta-drawer-block" title="关联规则">
              <div className="ta-standard-list">
                {activeField.relatedRules.length ? (
                  activeField.relatedRules.map((item) => (
                    <div key={item} className="ta-standard-item">
                      <div className="ta-standard-header">
                        <span>{item}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <Empty description="暂无关联规则" />
                )}
              </div>
            </YkCard>

            <YkCard bordered={false} className="ta-card ta-drawer-block" title="变更记录">
              <div className="ta-change-list">
                {activeField.changeHistory.length ? (
                  activeField.changeHistory.map((item) => (
                    <div key={item} className="ta-change-item">
                      <span>{item}</span>
                    </div>
                  ))
                ) : (
                  <Empty description="暂无变更记录" />
                )}
              </div>
            </YkCard>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}

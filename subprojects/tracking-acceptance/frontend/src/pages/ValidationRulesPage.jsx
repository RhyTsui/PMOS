import { useMemo, useRef, useState } from "react";

import { SearchOutlined, UploadOutlined } from "@ant-design/icons";
import { Input, Modal, Select, Switch, Table, message } from "antd";
import { Empty, TableTheme, YkButton, YkCard, YkDrawer, YkTooltip } from "@yoka-ui/ui";

import {
  aiGeneratedRuleTemplates,
  priorityOptions,
  ruleCategoryOptions,
  validationRules,
} from "../data/validationRulesData";

const PAGE_SIZE_OPTIONS = [20, 100, 500];

function createRuleColumns(onEdit, onDelete, onToggleEnabled) {
  return [
    { title: "规则ID", dataIndex: "ruleId", key: "ruleId", width: 108, fixed: "left" },
    { title: "规则名称", dataIndex: "name", key: "name", width: 188, fixed: "left" },
    { title: "L1层参数", dataIndex: "fieldName", key: "fieldName", width: 160 },
    { title: "事件中文名", dataIndex: "eventName", key: "eventName", width: 132 },
    { title: "规则分类", dataIndex: "category", key: "category", width: 120 },
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
      dataIndex: "example",
      key: "example",
      width: 240,
      render: (value) => (
        <YkTooltip title={value}>
          <span className="ta-ellipsis-text">{value}</span>
        </YkTooltip>
      ),
    },
    {
      title: "错误提示语",
      dataIndex: "errorMessage",
      key: "errorMessage",
      width: 220,
      render: (value) => (
        <YkTooltip title={value}>
          <span className="ta-ellipsis-text">{value}</span>
        </YkTooltip>
      ),
    },
    { title: "优先级", dataIndex: "priority", key: "priority", width: 80, align: "center" },
    {
      title: "生效状态",
      dataIndex: "enabled",
      key: "enabled",
      width: 96,
      align: "center",
      fixed: "right",
      render: (_, record) => <Switch checked={record.enabled} onChange={(checked) => onToggleEnabled(record.key, checked)} />,
    },
    {
      title: "操作",
      key: "actions",
      width: 100,
      fixed: "right",
      render: (_, record) => (
        <div className="ta-table-actions">
          <button type="button" className="ta-table-link" onClick={() => onEdit(record)}>
            编辑
          </button>
          <button type="button" className="ta-table-link is-danger" onClick={() => onDelete(record.key)}>
            删除
          </button>
        </div>
      ),
    },
  ];
}

function createEmptyRuleForm() {
  return {
    key: "",
    ruleId: "",
    name: "",
    fieldName: "",
    eventName: "",
    packageName: "",
    stepName: "",
    category: "空值行数",
    acceptanceStandard: "",
    example: "",
    errorMessage: "",
    priority: "P1",
    enabled: true,
  };
}

export default function ValidationRulesPage() {
  const uploadInputRef = useRef(null);
  const [rules, setRules] = useState(validationRules);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [packageFilter, setPackageFilter] = useState("all");
  const [eventFilter, setEventFilter] = useState("all");
  const [stepFilter, setStepFilter] = useState("all");
  const [paramFilter, setParamFilter] = useState("all");
  const [ruleDrawerOpen, setRuleDrawerOpen] = useState(false);
  const [ruleFormMode, setRuleFormMode] = useState("create");
  const [ruleForm, setRuleForm] = useState(createEmptyRuleForm());
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [importGuideOpen, setImportGuideOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState(
    "请基于事件信息、验收标准、L1层参数定义和上报示例，自动生成一批校验规则。重点识别条件型动态规则，例如：当终端等于 iOS 时，asa_token 必填；否则不是必填；当渠道包等于官包时，广告位必须命中官包白名单。",
  );
  const [aiGeneratedRules, setAiGeneratedRules] = useState(aiGeneratedRuleTemplates);

  const packageOptions = useMemo(
    () => [{ label: "全部渠道包", value: "all" }, ...Array.from(new Set(rules.map((item) => item.packageName))).map((value) => ({ label: value, value }))],
    [rules],
  );
  const eventOptions = useMemo(
    () => [{ label: "全部事件", value: "all" }, ...Array.from(new Set(rules.map((item) => item.eventName))).map((value) => ({ label: value, value }))],
    [rules],
  );
  const stepOptions = useMemo(
    () => [{ label: "全部步骤", value: "all" }, ...Array.from(new Set(rules.map((item) => item.stepName))).map((value) => ({ label: value, value }))],
    [rules],
  );
  const paramOptions = useMemo(
    () => [{ label: "全部参数", value: "all" }, ...Array.from(new Set(rules.map((item) => item.fieldName))).map((value) => ({ label: value, value }))],
    [rules],
  );

  const columns = useMemo(
    () =>
      createRuleColumns(
        (record) => {
          setRuleFormMode("edit");
          setRuleForm({ ...record });
          setRuleDrawerOpen(true);
        },
        (ruleKey) => setRules((current) => current.filter((item) => item.key !== ruleKey)),
        (ruleKey, enabled) => setRules((current) => current.map((item) => (item.key === ruleKey ? { ...item, enabled } : item))),
      ),
    [],
  );

  const filteredRules = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();
    return rules.filter((item) => {
      if (activeCategory !== "all" && item.category !== activeCategory) return false;
      if (packageFilter !== "all" && item.packageName !== packageFilter) return false;
      if (eventFilter !== "all" && item.eventName !== eventFilter) return false;
      if (stepFilter !== "all" && item.stepName !== stepFilter) return false;
      if (paramFilter !== "all" && item.fieldName !== paramFilter) return false;
      if (!keyword) return true;
      return [item.ruleId, item.name, item.fieldName, item.eventName, item.category, item.acceptanceStandard]
        .join(" ")
        .toLowerCase()
        .includes(keyword);
    });
  }, [activeCategory, eventFilter, packageFilter, paramFilter, rules, searchKeyword, stepFilter]);
  const ruleSummary = useMemo(
    () => [
      { key: "ruleCount", label: "规则总数", value: filteredRules.length },
      { key: "enabledCount", label: "生效中", value: filteredRules.filter((item) => item.enabled).length },
      { key: "aiCount", label: "AI建议规则", value: aiGeneratedRules.length },
    ],
    [aiGeneratedRules.length, filteredRules]
  );

  function openCreateRule() {
    setRuleFormMode("create");
    setRuleForm(createEmptyRuleForm());
    setRuleDrawerOpen(true);
  }

  function patchRuleForm(key, value) {
    setRuleForm((current) => ({ ...current, [key]: value }));
  }

  function submitRuleForm() {
    if (!ruleForm.ruleId || !ruleForm.name || !ruleForm.fieldName || !ruleForm.eventName) return;

    if (ruleFormMode === "edit") {
      setRules((current) => current.map((item) => (item.key === ruleForm.key ? { ...ruleForm } : item)));
    } else {
      setRules((current) => [{ ...ruleForm, key: `rule-${Date.now()}` }, ...current]);
    }

    setRuleDrawerOpen(false);
    setRuleForm(createEmptyRuleForm());
  }

  function regenerateAiRules() {
    setAiGeneratedRules((current) =>
      current.map((item, index) => ({
        ...item,
        ruleId: `AI_RULE_${201 + index}`,
      })),
    );
    message.success("已根据当前提示词重新生成动态规则。");
  }

  function importAiRules() {
    setRules((current) => [
      ...aiGeneratedRules.map((item) => ({ ...item, key: `${item.ruleId}-${Date.now()}` })),
      ...current,
    ]);
    setAiModalOpen(false);
    message.success("AI 生成规则已导入规则列表。");
  }

  function openImportGuide() {
    setImportGuideOpen(true);
  }

  function triggerImportSelect() {
    setImportGuideOpen(false);
    uploadInputRef.current?.click();
  }

  function handleRuleImport(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const isExcel = /\.xlsx?$/.test(file.name);
    if (!isExcel) {
      message.error("导入失败，请上传 Excel 规则模板。");
      event.target.value = "";
      return;
    }

    message.success("规则模板已导入，当前以前端模拟方式覆盖预览。");
    event.target.value = "";
  }

  return (
    <div className="ta-rules-page">
      <YkCard bordered={false} className="ta-card ta-requirement-filter-card" title="校验规则管理" extra={
        <div className="ta-requirement-actions">
          <input ref={uploadInputRef} type="file" accept=".xlsx,.xls" className="ta-hidden-upload-input" onChange={handleRuleImport} />
          <YkButton type="default" onClick={openImportGuide}>批量导入规则</YkButton>
          <YkButton type="default" onClick={openCreateRule}>手动添加规则</YkButton>
          <YkButton type="primary" onClick={() => setAiModalOpen(true)}>AI生成校验规则</YkButton>
        </div>
      }>
        <div className="ta-summary-strip">
          {ruleSummary.map((item) => (
            <div key={item.key} className="ta-summary-strip-item">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>

        <div className="ta-requirement-filterbar">
          <Select value={packageFilter} options={packageOptions} onChange={setPackageFilter} className="ta-requirement-select" />
          <Select value={eventFilter} options={eventOptions} onChange={setEventFilter} className="ta-requirement-select" />
          <Select value={stepFilter} options={stepOptions} onChange={setStepFilter} className="ta-requirement-select" />
          <Select value={paramFilter} options={paramOptions} onChange={setParamFilter} className="ta-requirement-select" />
          <Select
            value={activeCategory}
            options={[{ label: "全部规则分类", value: "all" }, ...ruleCategoryOptions]}
            onChange={setActiveCategory}
            className="ta-requirement-select"
          />
          <Input
            allowClear
            placeholder="搜索规则ID、规则名称、L1层参数或事件中文名"
            value={searchKeyword}
            onChange={(event) => setSearchKeyword(event.target.value)}
            className="ta-requirement-search"
            suffix={<SearchOutlined style={{ color: "#90a0b7" }} />}
          />
        </div>

        <div className="ta-filter-result-bar">
          <span>当前命中 {filteredRules.length} 条规则</span>
          <span>生效中 {filteredRules.filter((item) => item.enabled).length} 条</span>
        </div>

        <TableTheme>
          <Table
            rowKey="key"
            size="small"
            pagination={{
              pageSize: 20,
              defaultPageSize: 20,
              pageSizeOptions: PAGE_SIZE_OPTIONS,
              showSizeChanger: true,
            }}
            columns={columns}
            dataSource={filteredRules}
            scroll={{ x: 1820 }}
            locale={{ emptyText: <Empty description="当前条件下暂无校验规则" /> }}
            className="ta-table ta-requirement-table"
          />
        </TableTheme>
      </YkCard>

      <YkDrawer
        open={ruleDrawerOpen}
        onClose={() => setRuleDrawerOpen(false)}
        title={ruleFormMode === "edit" ? "编辑校验规则" : "新建校验规则"}
        drawerSize="large"
        className="ta-requirement-drawer"
      >
        <div className="ta-version-form">
          <div className="ta-version-form-row">
            <label>规则ID</label>
            <input value={ruleForm.ruleId} onChange={(event) => patchRuleForm("ruleId", event.target.value)} />
          </div>
          <div className="ta-version-form-row">
            <label>规则名称</label>
            <input value={ruleForm.name} onChange={(event) => patchRuleForm("name", event.target.value)} />
          </div>
          <div className="ta-version-form-row">
            <label>L1层参数</label>
            <input value={ruleForm.fieldName} onChange={(event) => patchRuleForm("fieldName", event.target.value)} />
          </div>
          <div className="ta-version-form-row">
            <label>事件中文名</label>
            <input value={ruleForm.eventName} onChange={(event) => patchRuleForm("eventName", event.target.value)} />
          </div>
          <div className="ta-version-form-row">
            <label>渠道包</label>
            <input value={ruleForm.packageName} onChange={(event) => patchRuleForm("packageName", event.target.value)} />
          </div>
          <div className="ta-version-form-row">
            <label>步骤</label>
            <input value={ruleForm.stepName} onChange={(event) => patchRuleForm("stepName", event.target.value)} />
          </div>
          <div className="ta-version-form-row">
            <label>规则分类</label>
            <Select value={ruleForm.category} options={ruleCategoryOptions} onChange={(value) => patchRuleForm("category", value)} />
          </div>
          <div className="ta-version-form-row is-textarea">
            <label>验收标准</label>
            <textarea value={ruleForm.acceptanceStandard} onChange={(event) => patchRuleForm("acceptanceStandard", event.target.value)} />
          </div>
          <div className="ta-version-form-row is-textarea">
            <label>上报示例</label>
            <textarea value={ruleForm.example} onChange={(event) => patchRuleForm("example", event.target.value)} />
          </div>
          <div className="ta-version-form-row is-textarea">
            <label>错误提示语</label>
            <textarea value={ruleForm.errorMessage} onChange={(event) => patchRuleForm("errorMessage", event.target.value)} />
          </div>
          <div className="ta-version-form-row">
            <label>规则优先级</label>
            <Select value={ruleForm.priority} options={priorityOptions} onChange={(value) => patchRuleForm("priority", value)} />
          </div>
          <div className="ta-version-form-row">
            <label>生效状态</label>
            <Switch checked={ruleForm.enabled} onChange={(checked) => patchRuleForm("enabled", checked)} />
          </div>
        </div>
        <div className="ta-drawer-actions">
          <YkButton type="secondary" onClick={() => setRuleDrawerOpen(false)}>取消</YkButton>
          <YkButton type="primary" onClick={submitRuleForm}>保存规则</YkButton>
        </div>
      </YkDrawer>

      <Modal
        open={aiModalOpen}
        onCancel={() => setAiModalOpen(false)}
        title="AI生成校验规则"
        width={920}
        footer={[
          <YkButton key="cancel" type="secondary" onClick={() => setAiModalOpen(false)}>取消</YkButton>,
          <YkButton key="regenerate" type="default" onClick={regenerateAiRules}>重新生成</YkButton>,
          <YkButton key="confirm" type="primary" onClick={importAiRules}>导入规则列表</YkButton>,
        ]}
      >
        <div className="ta-ai-modal">
          <div className="ta-version-form-row is-textarea">
            <label>提示词</label>
            <textarea value={aiPrompt} onChange={(event) => setAiPrompt(event.target.value)} />
          </div>
          <div className="ta-ai-generated-list">
            {aiGeneratedRules.map((item) => (
              <div key={item.ruleId} className="ta-ai-generated-card">
                <div className="ta-ai-generated-header">
                  <strong>{item.ruleId}</strong>
                  <span>{item.priority}</span>
                </div>
                <h4>{item.name}</h4>
                <p>{item.acceptanceStandard}</p>
                <div className="ta-ai-generated-meta">
                  <span>渠道包：{item.packageName}</span>
                  <span>事件：{item.eventName}</span>
                  <span>步骤：{item.stepName}</span>
                  <span>L1层参数：{item.fieldName}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      <Modal
        open={importGuideOpen}
        onCancel={() => setImportGuideOpen(false)}
        onOk={triggerImportSelect}
        title="批量导入规则"
        okText="选择文件"
        cancelText="取消"
      >
        <p>请上传规则模板 Excel 文件，系统将按模板字段覆盖预览当前规则。</p>
      </Modal>
    </div>
  );
}

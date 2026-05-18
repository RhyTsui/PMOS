import { useMemo, useRef, useState } from "react";

import { SearchOutlined } from "@ant-design/icons";
import { Input, Modal, Table, Tag, message } from "antd";
import { Empty, TableTheme, YkButton, YkCard, YkDrawer } from "@yoka-ui/ui";

const PAGE_SIZE_OPTIONS = [20, 100, 500];

const SECTION_OPTIONS = [
  { key: "versions", label: "验收版本" },
  { key: "channels", label: "渠道包" },
  { key: "events", label: "事件" },
  { key: "steps", label: "步骤" },
  { key: "params", label: "参数" },
];

const SOURCE_OPTIONS = [
  { label: "全部来源", value: "all" },
  { label: "游戏客户端", value: "client" },
  { label: "游戏服务端", value: "server" },
];

const STATUS_CLASS = {
  通过: "ta-tag is-success",
  不通过: "ta-tag is-danger",
  未上报: "ta-tag is-info",
};

const PRIORITY_CLASS = {
  P0: "ta-tag ta-tag-priority is-p0",
  P1: "ta-tag ta-tag-priority is-p1",
  P2: "ta-tag ta-tag-priority is-p2",
  P3: "ta-tag ta-tag-priority is-p3",
};

const initialVersions = [
  {
    key: "version-1",
    version: "v1.0",
    cycle: "2026-05-01 至 2026-05-10",
    goal: "登录、充值、广告、生产环境回归",
    scope: "充值、变现、生产环境回归",
    channelCount: 5,
    eventCount: 128,
    stepCount: 36,
    packages: ["官包", "Tap 渠道包", "巨量包", "百度包", "B站渠道包"],
  },
  {
    key: "version-2",
    version: "v1.1",
    cycle: "2026-05-11 至 2026-05-20",
    goal: "登录、充值、广告、跨端透传回归",
    scope: "充值、变现、跨端透传",
    channelCount: 4,
    eventCount: 96,
    stepCount: 28,
    packages: ["官包", "Tap 渠道包", "巨量包", "B站渠道包"],
  },
];

const channelRows = [
  { key: "pkg-1", packageName: "官包", standard: "登录、充值、广告链路必须全量通过", status: "通过", eventDiffCount: 0, paramDiffCount: 0, changeSummary: "无差异" },
  { key: "pkg-2", packageName: "Tap 渠道包", standard: "充值与广告事件必须补齐 trace_id 与渠道参数", status: "不通过", eventDiffCount: 3, paramDiffCount: 8, changeSummary: "支付事件缺 trace_id" },
  { key: "pkg-3", packageName: "巨量包", standard: "广告曝光、点击、回流事件必须完整接入", status: "未上报", eventDiffCount: 6, paramDiffCount: 12, changeSummary: "广告链路未接入" },
  { key: "pkg-4", packageName: "百度包", standard: "投放渠道参数需与广告平台回传保持一致", status: "通过", eventDiffCount: 1, paramDiffCount: 2, changeSummary: "投放参数补齐" },
  { key: "pkg-5", packageName: "B站渠道包", standard: "渠道回传字段、支付事件与落地页链路需全量验收", status: "不通过", eventDiffCount: 4, paramDiffCount: 5, changeSummary: "渠道回传字段需补齐" },
];

const eventRows = [
  { key: "evt-101", priority: "P0", eventId: "101", eventName: "角色登录", source: "游戏客户端", category: "登录", type: "通用", standard: "登录成功后 3 秒内必须上报", paramsCount: 9, status: "通过", changeSummary: "无变更" },
  { key: "evt-102", priority: "P0", eventId: "102", eventName: "进入游戏", source: "游戏客户端", category: "登录", type: "通用", standard: "首次进入主城必上报", paramsCount: 8, status: "通过", changeSummary: "无变更" },
  { key: "evt-103", priority: "P1", eventId: "103", eventName: "任务领取", source: "游戏客户端", category: "主线", type: "业务", standard: "主线任务领取后必须上报 task_id", paramsCount: 6, status: "不通过", changeSummary: "新增状态参数" },
  { key: "evt-104", priority: "P0", eventId: "104", eventName: "充值提交", source: "游戏客户端", category: "充值", type: "业务", standard: "提交订单后必须上报金额和渠道", paramsCount: 12, status: "不通过", changeSummary: "新增币种参数" },
  { key: "evt-105", priority: "P1", eventId: "105", eventName: "广告曝光", source: "游戏客户端", category: "广告", type: "业务", standard: "广告曝光必须上报广告位和素材 ID", paramsCount: 11, status: "未上报", changeSummary: "新增广告位枚举" },
  { key: "evt-106", priority: "P1", eventId: "106", eventName: "广告点击", source: "游戏客户端", category: "广告", type: "业务", standard: "点击后必须串联 trace_id", paramsCount: 10, status: "通过", changeSummary: "无变更" },
  { key: "evt-107", priority: "P2", eventId: "107", eventName: "资源产出", source: "游戏服务端", category: "资源", type: "服务端", standard: "资源变化必须透出资源类型和数量", paramsCount: 7, status: "通过", changeSummary: "无变更" },
  { key: "evt-108", priority: "P2", eventId: "108", eventName: "礼包发放", source: "游戏服务端", category: "运营", type: "服务端", standard: "礼包发放需上报礼包 ID 和发放渠道", paramsCount: 9, status: "未上报", changeSummary: "新增渠道参数" },
];

const stepRows = [
  { key: "step-1", eventId: "104", eventCnName: "充值提交", stepId: "104_STEP_01", stepOrder: 1, stepName: "选择支付方式", standard: "进入充值面板后必须先上报支付方式展示", triggerTiming: "进入充值面板后触发", status: "通过", changeSummary: "无变更" },
  { key: "step-2", eventId: "104", eventCnName: "充值提交", stepId: "104_STEP_02", stepOrder: 2, stepName: "提交订单", standard: "提交订单时必须带上订单类型、金额、渠道", triggerTiming: "点击确认支付时触发", status: "不通过", changeSummary: "缺少 order_type" },
  { key: "step-3", eventId: "105", eventCnName: "广告曝光", stepId: "105_STEP_01", stepOrder: 1, stepName: "请求广告", standard: "请求广告素材前必须上报广告位和资源类型", triggerTiming: "请求广告素材时触发", status: "通过", changeSummary: "无变更" },
  { key: "step-4", eventId: "105", eventCnName: "广告曝光", stepId: "105_STEP_02", stepOrder: 2, stepName: "曝光回调", standard: "曝光成功回调后必须补齐 trace_id 和曝光时间", triggerTiming: "广告曝光成功回调时触发", status: "未上报", changeSummary: "缺少曝光链路" },
];

const paramRows = [
  {
    key: "param-1",
    paramName: "role_id",
    fieldType: "string",
    relatedEventsCount: 4,
    packageName: "官包",
    eventFilter: "角色登录、进入游戏、任务领取、广告点击",
    standard: "必须为非空字符串",
    ruleSummary: "非空校验、唯一值校验",
    status: "通过",
    changeSummary: "无变更",
    details: {
      standard: "登录、主线、广告相关事件都必须上报 role_id，且不能为空。",
      rules: ["空值行数 = 0", "唯一值数 / 总行数 > 10%"],
      sampleEvents: ["101", "102", "103", "106"],
    },
  },
  {
    key: "param-2",
    paramName: "channel_id",
    fieldType: "string",
    relatedEventsCount: 3,
    packageName: "B站渠道包",
    eventFilter: "充值提交、广告曝光、礼包发放",
    standard: "渠道包必须与投放配置一致",
    ruleSummary: "枚举校验、条件匹配率",
    status: "不通过",
    changeSummary: "新增 B站渠道包",
    details: {
      standard: "channel_id 仅允许官包、Tap、巨量、百度、B站。",
      rules: ["离散值包含 B站渠道包", "条件匹配率 >= 95%"],
      sampleEvents: ["104", "105", "108"],
    },
  },
  {
    key: "param-3",
    paramName: "asa_token",
    fieldType: "string",
    relatedEventsCount: 2,
    packageName: "巨量包",
    eventFilter: "广告曝光、广告点击",
    standard: "终端等于 iOS 时必填，否则选填",
    ruleSummary: "动态条件规则",
    status: "未上报",
    changeSummary: "iOS 动态规则待接入",
    details: {
      standard: "当终端等于 iOS 时，asa_token 必填；其他终端允许为空。",
      rules: ["platform = iOS => asa_token 非空", "platform != iOS => asa_token 可空"],
      sampleEvents: ["105", "106"],
    },
  },
];

const builtinTemplateCards = [
  {
    key: "template-common-client",
    title: "客户端通用模板",
    desc: "覆盖登录、进入游戏、资源消耗、关键行为链路等高频通用埋点。",
    stats: "28 个事件 / 86 个参数",
    status: "默认启用",
  },
  {
    key: "template-common-server",
    title: "服务端通用模板",
    desc: "覆盖充值回调、奖励发放、资源产出、活动发奖等服务端标准埋点。",
    stats: "18 个事件 / 54 个参数",
    status: "默认启用",
  },
  {
    key: "template-ad",
    title: "广告链路模板",
    desc: "覆盖广告曝光、点击、回流、奖励发放与渠道差异校验。",
    stats: "12 个事件 / 32 个参数",
    status: "按需启用",
  },
];

const optionalDemandCards = [
  {
    key: "optional-cross-trace",
    title: "跨端透传回归",
    desc: "补充 trace_id、链路透传字段和跨端一致性校验。",
    owner: "数分 + 客户端",
    state: "已勾选",
  },
  {
    key: "optional-channel-diff",
    title: "渠道差异校验",
    desc: "补充各渠道包特有字段和渠道专属验收标准。",
    owner: "数分 + QA",
    state: "已勾选",
  },
  {
    key: "optional-growth",
    title: "成长线补充需求",
    desc: "补充任务领取、成长奖励、阶段节点等业务差异埋点。",
    owner: "数分",
    state: "待确认",
  },
];

const customDeltaRows = [
  {
    key: "delta-1",
    item: "支付提交新增币种参数",
    source: "自定义差异",
    reason: "本版本新增海外支付链路",
    owner: "客户端",
    status: "待接入",
  },
  {
    key: "delta-2",
    item: "B站渠道包补充回传字段",
    source: "渠道差异",
    reason: "新增渠道包验收范围",
    owner: "服务端",
    status: "进行中",
  },
  {
    key: "delta-3",
    item: "广告曝光补充 asa_token 条件规则",
    source: "平台规则",
    reason: "iOS 条件校验新增",
    owner: "数分",
    status: "待确认",
  },
];

const importPipelineItems = [
  {
    key: "import-1",
    title: "结构化表格入口",
    desc: "等待数分下周提供正式结构化需求表格，后续按版本导入。",
  },
  {
    key: "import-2",
    title: "模板预校验",
    desc: "上传后先校验 sheet、字段、版本范围和渠道包映射，再进入装配。",
  },
  {
    key: "import-3",
    title: "差异回挂版本",
    desc: "导入差异项需自动回挂到当前版本，供查询和报告直接联动。",
  },
];

function getDeltaStatusClassName(status) {
  const classNameMap = {
    待接入: "ta-tag is-warning",
    进行中: "ta-tag is-info",
    待确认: "ta-tag is-danger",
    已完成: "ta-tag is-success",
  };

  return classNameMap[status] ?? "ta-tag is-info";
}

function LabelField({ label, children }) {
  return (
    <label className="ta-label-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function NativeInput({ value, onChange, placeholder }) {
  return (
    <Input
      className="ta-requirement-search"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      suffix={<SearchOutlined style={{ color: "#90a0b7" }} />}
    />
  );
}

export default function RequirementsPage({
  initialBanner = "versions",
  requirementVersionId = "v1.1",
  requirementVersionMeta,
  workflowContext,
  onNavigate,
}) {
  const uploadRef = useRef(null);
  const [activeSection, setActiveSection] = useState(initialBanner);
  const [currentVersionKey, setCurrentVersionKey] = useState(initialVersions[0].key);
  const [pageSize, setPageSize] = useState(20);
  const [pageIndex, setPageIndex] = useState(1);
  const [sourceFilter, setSourceFilter] = useState("all");
  const [stepEventFilter, setStepEventFilter] = useState("all");
  const [paramEventFilter, setParamEventFilter] = useState("all");
  const [paramPackageFilter, setParamPackageFilter] = useState("all");
  const [keyword, setKeyword] = useState("");
  const [versionRows, setVersionRows] = useState(initialVersions);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingVersionKey, setEditingVersionKey] = useState(null);
  const [paramDetail, setParamDetail] = useState(null);
  const [versionForm, setVersionForm] = useState({
    version: "",
    startDate: "",
    endDate: "",
    goal: "",
    scope: "",
    packages: [],
  });

  const currentVersion = useMemo(
    () => versionRows.find((item) => item.key === currentVersionKey) ?? versionRows[0],
    [currentVersionKey, versionRows]
  );

  const currentVersionStats = useMemo(
    () => [
      { key: "channelCount", label: "渠道包", value: currentVersion?.channelCount ?? 0 },
      { key: "eventCount", label: "事件", value: currentVersion?.eventCount ?? 0 },
      { key: "stepCount", label: "步骤", value: currentVersion?.stepCount ?? 0 },
      { key: "paramCount", label: "参数", value: paramRows.length },
    ],
    [currentVersion]
  );

  const currentRows = useMemo(() => {
    if (activeSection === "versions") return versionRows;
    if (activeSection === "channels") return channelRows;
    if (activeSection === "steps") {
      return stepRows.filter((item) => stepEventFilter === "all" || item.eventCnName === stepEventFilter);
    }
    if (activeSection === "params") {
      return paramRows.filter((item) => {
        if (paramEventFilter !== "all" && item.eventFilter !== paramEventFilter) return false;
        if (paramPackageFilter !== "all" && item.packageName !== paramPackageFilter) return false;
        return true;
      });
    }
    return eventRows.filter((item) => {
      const sourceMatched =
        sourceFilter === "all" || item.source === (sourceFilter === "client" ? "游戏客户端" : "游戏服务端");
      const keywordMatched =
        !keyword.trim() ||
        `${item.eventId} ${item.eventName} ${item.category} ${item.standard}`
          .toLowerCase()
          .includes(keyword.trim().toLowerCase());
      return sourceMatched && keywordMatched;
    });
  }, [activeSection, keyword, paramEventFilter, paramPackageFilter, sourceFilter, stepEventFilter, versionRows]);

  const filteredRows = useMemo(() => {
    if (activeSection === "events" || activeSection === "versions") return currentRows;
    if (!keyword.trim()) return currentRows;
    return currentRows.filter((item) =>
      Object.values(item).join(" ").toLowerCase().includes(keyword.trim().toLowerCase())
    );
  }, [activeSection, currentRows, keyword]);

  const sectionSummary = useMemo(() => {
    const statusRows = filteredRows.filter((item) => typeof item?.status === "string");
    return [
      { key: "section", label: "当前分区", value: SECTION_OPTIONS.find((item) => item.key === activeSection)?.label ?? "-" },
      { key: "count", label: "当前条数", value: filteredRows.length },
      { key: "passed", label: "通过", value: statusRows.filter((item) => item.status === "通过").length },
      { key: "issues", label: "待处理", value: statusRows.filter((item) => item.status !== "通过").length },
    ];
  }, [activeSection, filteredRows]);

  const customDeltaColumns = useMemo(
    () => [
      { title: "差异项", dataIndex: "item", width: 220 },
      { title: "来源", dataIndex: "source", width: 120 },
      { title: "补充原因", dataIndex: "reason", width: 220 },
      { title: "责任方", dataIndex: "owner", width: 120 },
      {
        title: "状态",
        dataIndex: "status",
        width: 110,
        render: (value) => <span className={getDeltaStatusClassName(value)}>{value}</span>,
      },
    ],
    []
  );

  const pagedRows = useMemo(() => {
    const start = (pageIndex - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, pageIndex, pageSize]);

  function resetSectionState(nextSection) {
    setActiveSection(nextSection);
    setPageIndex(1);
    setKeyword("");
    setSourceFilter("all");
    setStepEventFilter("all");
    setParamEventFilter("all");
    setParamPackageFilter("all");
  }

  function openUploadGuide() {
    Modal.confirm({
      title: "上传 Excel",
      content: (
        <div className="ta-modal-copy">
          <p>请按模板填写后上传，模板中已包含渠道包 sheet，系统会先校验结构。</p>
          <p>如果格式不符合要求，会直接提示上传失败。</p>
        </div>
      ),
      okText: "继续上传",
      cancelText: "取消",
      onOk: () => uploadRef.current?.click(),
    });
  }

  function onFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const lowerName = file.name.toLowerCase();
    const validExcel = lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls");
    if (!validExcel) {
      message.error("上传失败，请选择 Excel 文件。");
      event.target.value = "";
      return;
    }
    message.success("上传成功，已通过模板格式校验。");
    event.target.value = "";
  }

  function openCreateVersion() {
    setEditingVersionKey(null);
    setVersionForm({ version: "", startDate: "", endDate: "", goal: "", scope: "", packages: [] });
    setDrawerOpen(true);
  }

  function openEditVersion(record) {
    setEditingVersionKey(record.key);
    const [startDate, endDate] = record.cycle.split(" 至 ");
    setVersionForm({
      version: record.version,
      startDate,
      endDate,
      goal: record.goal,
      scope: record.scope,
      packages: record.packages,
    });
    setDrawerOpen(true);
  }

  function saveVersion() {
    const nextRow = {
      key: editingVersionKey || `version-${Date.now()}`,
      version: versionForm.version || `v1.${versionRows.length}`,
      cycle: `${versionForm.startDate || "2026-05-21"} 至 ${versionForm.endDate || "2026-05-31"}`,
      goal: versionForm.goal || "待补充版本目标",
      scope: versionForm.scope || "待补充验收范围",
      channelCount: versionForm.packages.length || 0,
      eventCount: editingVersionKey ? 96 : 42,
      stepCount: editingVersionKey ? 28 : 16,
      packages: versionForm.packages,
    };

    setVersionRows((prev) => {
      if (!editingVersionKey) return [nextRow, ...prev];
      return prev.map((item) => (item.key === editingVersionKey ? nextRow : item));
    });
    message.success(editingVersionKey ? "验收版本已更新" : "验收版本已新建");
    setDrawerOpen(false);
  }

  function deleteVersion(record) {
    Modal.confirm({
      title: "删除验收版本",
      content: `确认删除 ${record.version} 吗？`,
      okText: "删除",
      cancelText: "取消",
      onOk: () => {
        setVersionRows((prev) => prev.filter((item) => item.key !== record.key));
        if (record.key === currentVersionKey && versionRows.length > 1) {
          const nextVersion = versionRows.find((item) => item.key !== record.key);
          if (nextVersion) setCurrentVersionKey(nextVersion.key);
        }
        message.success("验收版本已删除");
      },
    });
  }

  const columnsMap = {
    versions: [
      {
        title: "版本号",
        dataIndex: "version",
        width: 128,
        render: (value, record) => (
          <div className="ta-version-cell">
            <strong>{value}</strong>
            {record.key === currentVersionKey ? <span className="ta-tag is-success">当前版本</span> : null}
          </div>
        ),
      },
      { title: "验收周期", dataIndex: "cycle", width: 220 },
      { title: "版本目标", dataIndex: "goal", ellipsis: true },
      { title: "验收范围", dataIndex: "scope", width: 240, ellipsis: true },
      { title: "渠道包数量", dataIndex: "channelCount", width: 108 },
      { title: "事件数量", dataIndex: "eventCount", width: 96 },
      { title: "步骤数量", dataIndex: "stepCount", width: 120 },
      {
        title: "操作",
        key: "action",
        width: 220,
        render: (_, record) => (
          <div className="ta-table-actions">
            <button type="button" className="ta-inline-link" onClick={() => setCurrentVersionKey(record.key)}>
              设为当前
            </button>
            <button type="button" className="ta-inline-link" onClick={() => openEditVersion(record)}>
              编辑
            </button>
            <button type="button" className="ta-inline-link" onClick={() => deleteVersion(record)}>
              删除
            </button>
          </div>
        ),
      },
    ],
    channels: [
      { title: "渠道包", dataIndex: "packageName", width: 220 },
      { title: "验收标准", dataIndex: "standard", ellipsis: true },
      { title: "状态", dataIndex: "status", width: 110, render: (value) => <span className={STATUS_CLASS[value]}>{value}</span> },
      { title: "差异事件数量", dataIndex: "eventDiffCount", width: 120 },
      { title: "差异参数数量", dataIndex: "paramDiffCount", width: 120 },
      { title: "变更", dataIndex: "changeSummary", ellipsis: true },
    ],
    events: [
      { title: "优先级", dataIndex: "priority", width: 80, render: (value) => <span className={PRIORITY_CLASS[value]}>{value}</span> },
      { title: "事件ID", dataIndex: "eventId", width: 90 },
      { title: "事件中文名", dataIndex: "eventName", width: 160 },
      { title: "来源", dataIndex: "source", width: 120 },
      { title: "分类", dataIndex: "category", width: 100 },
      { title: "事件类型", dataIndex: "type", width: 100 },
      { title: "验收标准", dataIndex: "standard", ellipsis: true },
      { title: "L1层参数数量", dataIndex: "paramsCount", width: 110 },
      { title: "状态", dataIndex: "status", width: 100, render: (value) => <span className={STATUS_CLASS[value]}>{value}</span> },
      { title: "变更", dataIndex: "changeSummary", width: 140 },
    ],
    steps: [
      { title: "事件ID", dataIndex: "eventId", width: 90 },
      { title: "事件中文名", dataIndex: "eventCnName", width: 150 },
      { title: "Step ID", dataIndex: "stepId", width: 140 },
      { title: "步骤顺序", dataIndex: "stepOrder", width: 100 },
      { title: "步骤名称", dataIndex: "stepName", width: 160 },
      { title: "验收标准", dataIndex: "standard", ellipsis: true },
      { title: "触发时机", dataIndex: "triggerTiming", ellipsis: true },
      { title: "状态", dataIndex: "status", width: 100, render: (value) => <span className={STATUS_CLASS[value]}>{value}</span> },
      { title: "变更", dataIndex: "changeSummary", width: 160 },
    ],
    params: [
      { title: "参数", dataIndex: "paramName", width: 140 },
      { title: "字段类型", dataIndex: "fieldType", width: 110 },
      { title: "关联事件数", dataIndex: "relatedEventsCount", width: 110 },
      { title: "验收标准", dataIndex: "standard", ellipsis: true },
      { title: "校验规则", dataIndex: "ruleSummary", width: 180, ellipsis: true },
      { title: "状态", dataIndex: "status", width: 100, render: (value) => <span className={STATUS_CLASS[value]}>{value}</span> },
      { title: "变更", dataIndex: "changeSummary", width: 140 },
    ],
  };

  return (
    <div className="ta-page ta-requirements-page">
      <YkCard bordered={false} className="ta-card ta-page-version-card">
        <div className="ta-page-version-head">
          <strong>当前按 {requirementVersionId} 口径查看需求装配</strong>
          <span>{requirementVersionMeta?.summary ?? "需求版本切换已生效。"}</span>
        </div>
      </YkCard>

      {requirementVersionId === "v1.1" ? (
        <YkCard bordered={false} className="ta-card">
          <div className="ta-card-head">
            <span className="ta-section-title">v1.1 装配原则</span>
          </div>
          <div className="ta-highlight-list">
            <div className="ta-highlight-item">
              <strong>先用内置通用模板</strong>
              <span>默认优先复用平台内置通用埋点需求，不再从零录入。</span>
            </div>
            <div className="ta-highlight-item">
              <strong>非固定项改为勾选补充</strong>
              <span>仅对本次版本需要的差异项做启用或关闭，避免重复填表。</span>
            </div>
            <div className="ta-highlight-item">
              <strong>结构化表格承接外部输入</strong>
              <span>等待数分下周提供结构化表格，后续作为正式导入入口并回挂版本。</span>
            </div>
          </div>
        </YkCard>
      ) : null}

      {requirementVersionId === "v1.1" ? (
        <YkCard bordered={false} className="ta-card ta-assembly-card">
          <div className="ta-card-head">
            <span className="ta-section-title">v1.1 需求装配主链</span>
          </div>
          <div className="ta-assembly-grid">
            <div className="ta-assembly-block">
              <div className="ta-assembly-block-head">
                <strong>1. 内置通用模板</strong>
                <span>先复用，不从零录入</span>
              </div>
              <div className="ta-assembly-list">
                {builtinTemplateCards.map((item) => (
                  <div key={item.key} className="ta-assembly-item">
                    <div className="ta-assembly-item-head">
                      <strong>{item.title}</strong>
                      <span className="ta-tag is-success">{item.status}</span>
                    </div>
                    <span>{item.desc}</span>
                    <em>{item.stats}</em>
                  </div>
                ))}
              </div>
              <div className="ta-inline-actions">
                <button
                  type="button"
                  className="ta-inline-link"
                  onClick={() =>
                    onNavigate?.("logs", "模板装配后去查询验证", {
                      source: "requirements",
                      summary: "从内置通用模板进入查询验证",
                    })
                  }
                >
                  去查询验证
                </button>
              </div>
            </div>

            <div className="ta-assembly-block">
              <div className="ta-assembly-block-head">
                <strong>2. 勾选式补充</strong>
                <span>非固定项按次启用</span>
              </div>
              <div className="ta-assembly-list">
                {optionalDemandCards.map((item) => (
                  <div key={item.key} className="ta-assembly-item">
                    <div className="ta-assembly-item-head">
                      <strong>{item.title}</strong>
                      <span className={getDeltaStatusClassName(item.state)}>{item.state}</span>
                    </div>
                    <span>{item.desc}</span>
                    <em>责任归属：{item.owner}</em>
                  </div>
                ))}
              </div>
              <div className="ta-inline-actions">
                <button
                  type="button"
                  className="ta-inline-link"
                  onClick={() =>
                    onNavigate?.("reports", "勾选补充后查看验收报告", {
                      source: "requirements",
                      summary: "从勾选式补充进入验收报告",
                    })
                  }
                >
                  去验收报告
                </button>
              </div>
            </div>

            <div className="ta-assembly-block">
              <div className="ta-assembly-block-head">
                <strong>3. 自定义差异区</strong>
                <span>只补本次版本特有项</span>
              </div>
              <TableTheme>
                <Table
                  rowKey="key"
                  size="small"
                  pagination={false}
                  columns={customDeltaColumns}
                  dataSource={customDeltaRows}
                  className="ta-table"
                />
              </TableTheme>
            </div>

            <div className="ta-assembly-block">
              <div className="ta-assembly-block-head">
                <strong>4. 导入承接区</strong>
                <span>接住外部结构化输入</span>
              </div>
              <div className="ta-assembly-list">
                {importPipelineItems.map((item) => (
                  <div key={item.key} className="ta-assembly-item">
                    <div className="ta-assembly-item-head">
                      <strong>{item.title}</strong>
                    </div>
                    <span>{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </YkCard>
      ) : null}

      {workflowContext?.source === "reports" ? (
        <YkCard bordered={false} className="ta-card ta-page-version-card">
          <div className="ta-page-version-head">
            <strong>当前回看来源：验收报告</strong>
            <span>{workflowContext.summary}</span>
          </div>
        </YkCard>
      ) : null}

      <YkCard bordered={false} className="ta-card ta-version-govern-card">
        <div className="ta-version-govern-head">
          <div className="ta-version-govern-title">
            <strong>{currentVersion?.version ?? "-"}</strong>
          </div>
          <div className="ta-version-govern-chain">
            <span>验收版本</span>
            <em>渠道包</em>
            <em>事件</em>
            <em>步骤</em>
            <em>参数</em>
          </div>
        </div>
        <div className="ta-version-govern-grid">
          <div className="ta-version-govern-block">
            <label>验收周期</label>
            <strong>{currentVersion?.cycle ?? "-"}</strong>
          </div>
          <div className="ta-version-govern-block">
            <label>版本目标</label>
            <strong>{currentVersion?.goal ?? "-"}</strong>
          </div>
          <div className="ta-version-govern-block">
            <label>验收范围</label>
            <strong>{currentVersion?.scope ?? "-"}</strong>
          </div>
          <div className="ta-version-govern-metrics">
            {currentVersionStats.map((item) => (
              <div key={item.key} className="ta-version-govern-metric">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </div>
      </YkCard>

      <YkCard>
        <div className="ta-card-head">
          <div className="ta-requirement-subtabs" role="tablist" aria-label="埋点需求分区切换">
            {SECTION_OPTIONS.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`ta-requirement-subtab${activeSection === item.key ? " is-active" : ""}`}
                onClick={() => resetSectionState(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="ta-unified-toolbar">
          <div className="ta-unified-toolbar-filters">
            {activeSection === "versions" ? (
              <NativeInput
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="搜索版本号、版本目标或验收范围"
              />
            ) : null}
            {activeSection === "events" ? (
              <LabelField label="">
                <select className="ta-native-select" value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}>
                  {SOURCE_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </LabelField>
            ) : null}
            {activeSection === "steps" ? (
              <LabelField label="">
                <select className="ta-native-select" value={stepEventFilter} onChange={(event) => setStepEventFilter(event.target.value)}>
                  <option value="all">全部事件</option>
                  <option value="充值提交">充值提交</option>
                  <option value="广告曝光">广告曝光</option>
                </select>
              </LabelField>
            ) : null}
            {activeSection === "params" ? (
              <>
                <LabelField label="">
                  <select className="ta-native-select" value={paramEventFilter} onChange={(event) => setParamEventFilter(event.target.value)}>
                    <option value="all">全部事件</option>
                    <option value="角色登录、进入游戏、任务领取、广告点击">角色登录</option>
                    <option value="充值提交、广告曝光、礼包发放">充值提交</option>
                    <option value="广告曝光、广告点击">广告曝光</option>
                  </select>
                </LabelField>
                <LabelField label="">
                  <select className="ta-native-select" value={paramPackageFilter} onChange={(event) => setParamPackageFilter(event.target.value)}>
                    <option value="all">全部渠道包</option>
                    <option value="官包">官包</option>
                    <option value="Tap 渠道包">Tap 渠道包</option>
                    <option value="巨量包">巨量包</option>
                    <option value="百度包">百度包</option>
                    <option value="B站渠道包">B站渠道包</option>
                  </select>
                </LabelField>
              </>
            ) : null}
            {activeSection !== "versions" ? (
              <NativeInput
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder={`搜索${SECTION_OPTIONS.find((item) => item.key === activeSection)?.label || ""}`}
              />
            ) : null}
          </div>

          <div className="ta-unified-toolbar-actions">
            {activeSection === "versions" ? (
              <YkButton type="primary" onClick={openCreateVersion}>
                新建验收版本
              </YkButton>
            ) : (
              <>
                <YkButton type="default" onClick={() => window.open("/tracking-requirements-template.xlsx", "_blank")}>
                  下载模板
                </YkButton>
                <YkButton type="primary" onClick={openUploadGuide}>
                  上传 Excel
                </YkButton>
              </>
            )}
            <input ref={uploadRef} type="file" accept=".xlsx,.xls" className="ta-hidden-upload-input" onChange={onFileChange} />
          </div>
        </div>

        <div className="ta-summary-strip">
          {sectionSummary.map((item) => (
            <div key={item.key} className="ta-summary-strip-item">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>

        <TableTheme>
          <Table
            rowKey="key"
            size="small"
            pagination={false}
            columns={columnsMap[activeSection]}
            dataSource={pagedRows}
            className="ta-table"
            scroll={{
              x:
                activeSection === "versions"
                  ? 1160
                  : activeSection === "channels"
                    ? 1120
                    : activeSection === "events"
                      ? 1280
                      : activeSection === "steps"
                        ? 1240
                        : 1040,
            }}
            locale={{ emptyText: <Empty description="暂无数据" /> }}
            onRow={
              activeSection === "params"
                ? (record) => ({
                    onClick: () => setParamDetail(record),
                  })
                : undefined
            }
          />
        </TableTheme>

        <div className="ta-pagination-bar">
          <span>每页</span>
          <select
            className="ta-native-select"
            value={pageSize}
            onChange={(event) => {
              setPageSize(Number(event.target.value));
              setPageIndex(1);
            }}
          >
            {PAGE_SIZE_OPTIONS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <span>共 {filteredRows.length} 条</span>
          <button type="button" className="ta-page-link" disabled={pageIndex === 1} onClick={() => setPageIndex((prev) => Math.max(1, prev - 1))}>
            上一页
          </button>
          <span>{pageIndex}</span>
          <button
            type="button"
            className="ta-page-link"
            disabled={pageIndex * pageSize >= filteredRows.length}
            onClick={() => setPageIndex((prev) => prev + 1)}
          >
            下一页
          </button>
        </div>
      </YkCard>

      <YkDrawer open={drawerOpen} title={editingVersionKey ? "编辑验收版本" : "新建验收版本"} onClose={() => setDrawerOpen(false)} width="560px">
        <div className="ta-form-grid">
          <LabelField label="版本号">
            <Input value={versionForm.version} onChange={(event) => setVersionForm((prev) => ({ ...prev, version: event.target.value }))} />
          </LabelField>
          <LabelField label="验收开始时间">
            <Input value={versionForm.startDate} onChange={(event) => setVersionForm((prev) => ({ ...prev, startDate: event.target.value }))} />
          </LabelField>
          <LabelField label="验收结束时间">
            <Input value={versionForm.endDate} onChange={(event) => setVersionForm((prev) => ({ ...prev, endDate: event.target.value }))} />
          </LabelField>
          <LabelField label="版本目标">
            <Input.TextArea rows={3} value={versionForm.goal} onChange={(event) => setVersionForm((prev) => ({ ...prev, goal: event.target.value }))} />
          </LabelField>
          <LabelField label="验收范围">
            <Input.TextArea rows={3} value={versionForm.scope} onChange={(event) => setVersionForm((prev) => ({ ...prev, scope: event.target.value }))} />
          </LabelField>
          <LabelField label="渠道包">
            <div className="ta-package-picker">
              {["官包", "Tap 渠道包", "巨量包", "百度包", "B站渠道包"].map((item) => {
                const checked = versionForm.packages.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    className={`ta-chip${checked ? " is-active" : ""}`}
                    onClick={() =>
                      setVersionForm((prev) => ({
                        ...prev,
                        packages: checked ? prev.packages.filter((value) => value !== item) : [...prev.packages, item],
                      }))
                    }
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </LabelField>
        </div>
        <div className="ta-drawer-actions">
          <YkButton type="secondary" onClick={() => setDrawerOpen(false)}>
            取消
          </YkButton>
          <YkButton onClick={saveVersion}>保存</YkButton>
        </div>
      </YkDrawer>

      <YkDrawer open={Boolean(paramDetail)} title={paramDetail ? `${paramDetail.paramName} 参数详情` : "参数详情"} onClose={() => setParamDetail(null)} width="520px">
        {paramDetail ? (
          <div className="ta-detail-stack">
            <div className="ta-detail-block">
              <h4>验收标准</h4>
              <p>{paramDetail.details.standard}</p>
            </div>
            <div className="ta-detail-block">
              <h4>校验规则</h4>
              <ul>
                {paramDetail.details.rules.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="ta-detail-block">
              <h4>关联事件</h4>
              <div className="ta-chip-row">
                {paramDetail.details.sampleEvents.map((item) => (
                  <Tag key={item}>{item}</Tag>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </YkDrawer>
    </div>
  );
}

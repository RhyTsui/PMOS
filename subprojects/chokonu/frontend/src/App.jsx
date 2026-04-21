import { useState } from "react";

import {
  FlexGrid,
  YkButton,
  YkCard,
  YkContainer,
  YkDescriptions,
  YkStatistic,
  YkTabs,
} from "@yoka-ui/ui";
import { Alert, Progress, Table, Tag } from "antd";

import {
  assetRows,
  blockers,
  capabilityCards,
  evidenceRows,
  gateSignals,
  navItems,
  runRows,
  standardsRows,
  summaryStats,
  workbenchCards,
} from "./data/mockData";

function SectionTitle({ title, desc, action }) {
  return (
    <div className="section-title">
      <div>
        <h2>{title}</h2>
        {desc ? <p>{desc}</p> : null}
      </div>
      {action || null}
    </div>
  );
}

function SummaryGrid() {
  return (
    <FlexGrid colSpan={{ xs: 24, md: 12, xl: 6 }}>
      {summaryStats.map((item) => (
        <YkCard key={item.key} className="soft-card stat-card" bordered={false}>
          <YkStatistic title={item.title} value={item.value} suffix={item.suffix} />
        </YkCard>
      ))}
    </FlexGrid>
  );
}

function OverviewPage() {
  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div className="hero-copy">
          <span className="eyebrow">首页 / 能力与测试结论</span>
          <h1>先把平台能做什么，以及这轮测试是否放行，直接摆在首页。</h1>
          <p>
            首页不再讲抽象规划，而是直接回答三个问题：平台覆盖哪些对象、当前版本结论是什么、阻塞继续推进的证据是什么。
          </p>
          <div className="hero-actions">
            <YkButton type="primary" href="../docs/svg/16-page-architecture.svg" target="_blank">
              页面架构图
            </YkButton>
            <YkButton href="../docs/svg/13-gate-decision-board.svg" target="_blank">
              门禁判断图
            </YkButton>
            <YkButton href="../docs/svg/15-workbench-mapping.svg" target="_blank">
              工作台映射图
            </YkButton>
          </div>
        </div>
        <YkCard className="decision-hero" bordered={false}>
          <div className="decision-pill danger">当前不放行</div>
          <h3>继续收口，不允许直接晋级</h3>
          <p>本轮回归出现 1 条红线命中和 2 个关键阻塞项，说明方向是对的，但稳定性不足以继续推进。</p>
          <div className="decision-metrics">
            <div>
              <span>红线命中</span>
              <strong>1 条</strong>
            </div>
            <div>
              <span>关键路径成功率</span>
              <strong>81%</strong>
            </div>
          </div>
        </YkCard>
      </section>

      <SummaryGrid />

      <FlexGrid colSpan={{ xs: 24, xl: 12 }}>
        <YkCard className="soft-card" bordered={false}>
          <SectionTitle title="平台能力" desc="先讲清楚平台具备什么能力，而不是先堆页面。" />
          <div className="capability-list">
            {capabilityCards.map((item) => (
              <div key={item.title} className="capability-item">
                <h3>{item.title}</h3>
                <p>{item.detail}</p>
              </div>
            ))}
          </div>
        </YkCard>

        <YkCard className="soft-card" bordered={false}>
          <SectionTitle title="关键阻塞项" desc="阻塞项要能连到证据，而不是停留在一句话总结。" />
          <div className="blocker-list">
            {blockers.map((item) => (
              <div key={item.title} className="blocker-item">
                <div className="blocker-head">
                  <h3>{item.title}</h3>
                  <Tag color={item.severity === "红线" ? "red" : item.severity === "高风险" ? "orange" : "gold"}>
                    {item.severity}
                  </Tag>
                </div>
                <p>{item.detail}</p>
                <YkButton>{item.linkLabel}</YkButton>
              </div>
            ))}
          </div>
        </YkCard>
      </FlexGrid>

      <FlexGrid colSpan={{ xs: 24, xl: 12 }}>
        <YkCard className="soft-card" bordered={false}>
          <SectionTitle title="版本门禁信号" desc="首页数字必须服务于版本判断，而不是只做展示。" />
          <div className="signal-list">
            {gateSignals.map((item) => (
              <div key={item.metric} className="signal-item">
                <div className="signal-top">
                  <h3>{item.metric}</h3>
                  <Tag color={item.status === "blocked" ? "red" : item.status === "good" ? "green" : "orange"}>
                    {item.delta}
                  </Tag>
                </div>
                <div className="signal-values">
                  <span>当前 {item.current}</span>
                  <span>基线 {item.baseline}</span>
                </div>
                <Progress
                  percent={item.metric === "关键路径成功率" ? 81 : item.metric === "知识问答可支撑率" ? 89 : item.metric === "会话解决率" ? 71 : 100}
                  showInfo={false}
                  strokeColor={item.status === "blocked" ? "#ff4d4f" : item.status === "good" ? "#52c41a" : "#faad14"}
                />
              </div>
            ))}
          </div>
        </YkCard>

        <YkCard className="soft-card" bordered={false}>
          <SectionTitle title="结论证据链" desc="从对象、样本、失败阶段到结论，首页就能往下钻。" />
          <Table
            pagination={false}
            size="small"
            rowKey="sample"
            columns={[
              { title: "对象", dataIndex: "object", key: "object" },
              { title: "样本", dataIndex: "sample", key: "sample" },
              {
                title: "结果",
                dataIndex: "result",
                key: "result",
                render: (value) => (
                  <Tag color={value === "fail" ? "red" : value === "review" ? "gold" : "green"}>{value}</Tag>
                ),
              },
              { title: "阶段", dataIndex: "stage", key: "stage" },
              { title: "判断", dataIndex: "decision", key: "decision" },
            ]}
            dataSource={evidenceRows}
          />
        </YkCard>
      </FlexGrid>

      <YkCard className="soft-card" bordered={false}>
        <SectionTitle title="工作台骨架" desc="这些测试结论来自清晰的对象主链，不是散的页面功能点。" />
        <FlexGrid colSpan={{ xs: 24, md: 12, xl: 6 }}>
          {workbenchCards.map((item) => (
            <div key={item.object} className="workbench-item">
              <div className="workbench-object">{item.object}</div>
              <h3>{item.title}</h3>
              <p>{item.detail}</p>
            </div>
          ))}
        </FlexGrid>
      </YkCard>
    </div>
  );
}

function StandardsPage() {
  return (
    <YkCard className="soft-card" bordered={false}>
      <SectionTitle title="规则与契约" desc="把决定放行与否的规则先收成稳定资产。" />
      <Table
        pagination={false}
        rowKey="name"
        columns={[
          { title: "规则", dataIndex: "name", key: "name" },
          { title: "类型", dataIndex: "type", key: "type" },
          { title: "对象", dataIndex: "target", key: "target" },
          { title: "阈值", dataIndex: "threshold", key: "threshold" },
        ]}
        dataSource={standardsRows}
      />
    </YkCard>
  );
}

function AssetsPage() {
  return (
    <YkCard className="soft-card" bordered={false}>
      <SectionTitle title="样本与评测集" desc="把研究内容压成可回归的测试资产。" />
      <Table
        pagination={false}
        rowKey="title"
        columns={[
          { title: "样本", dataIndex: "title", key: "title" },
          { title: "对象", dataIndex: "category", key: "category" },
          { title: "评测集", dataIndex: "suite", key: "suite" },
          { title: "来源", dataIndex: "source", key: "source" },
        ]}
        dataSource={assetRows}
      />
    </YkCard>
  );
}

function RunsPage() {
  return (
    <div className="page-stack">
      <Alert
        type="warning"
        showIcon
        message="当前版本仍在收口阶段"
        description="重点关注关键路径成功率和高风险工具误触发两类问题。"
      />
      <FlexGrid colSpan={{ xs: 24, md: 12, xl: 6 }}>
        {runRows.map((item) => (
          <YkCard key={item.label} className="soft-card run-card" bordered={false}>
            <h3>{item.label}</h3>
            <p>{item.value}</p>
          </YkCard>
        ))}
      </FlexGrid>
    </div>
  );
}

function ResultsPage() {
  return (
    <YkCard className="soft-card" bordered={false}>
      <SectionTitle title="Trace 与报告" desc="把失败链路和版本结论并排呈现，方便评审直接决策。" />
      <YkDescriptions
        bordered
        column={1}
        items={[
          {
            key: "gate",
            label: "当前 gate",
            children: <Tag color="red">不放行</Tag>,
          },
          {
            key: "trace",
            label: "核心 Trace 结论",
            children: "MCP 高风险工具在未二次确认时仍可触发，直接命中红线。",
          },
          {
            key: "report",
            label: "报告建议动作",
            children: "补二次确认保护、回填高风险回归集、恢复 Workflow 成功率到 95% 以上。",
          },
        ]}
      />
    </YkCard>
  );
}

export default function App() {
  const [activeKey, setActiveKey] = useState("overview");

  const tabItems = navItems.map((item) => ({
    key: item.key,
    label: item.label,
    children:
      item.key === "overview" ? (
        <OverviewPage />
      ) : item.key === "standards" ? (
        <StandardsPage />
      ) : item.key === "assets" ? (
        <AssetsPage />
      ) : item.key === "runs" ? (
        <RunsPage />
      ) : (
        <ResultsPage />
      ),
  }));

  return (
    <div className="app-shell">
      <YkContainer
        className="app-container"
        headerLeft={
          <div className="app-header-left">
            <div>
              <span className="eyebrow">ChoKoNu / YKUI 首页方案</span>
              <h1>连弩-AI 测试平台</h1>
            </div>
          </div>
        }
        headerRight={
          <div className="app-header-right">
            <YkButton href="../homepage-static.html" target="_blank">
              静态稿
            </YkButton>
            <YkButton href="../docs/svg/14-object-model.svg" target="_blank">
              对象模型图
            </YkButton>
            <YkButton type="primary" href="../docs/svg/16-page-architecture.svg" target="_blank">
              页面架构图
            </YkButton>
          </div>
        }
      >
        <section className="header-band">
          <div className="header-band-copy">
            <span className="eyebrow">首版目标</span>
            <h2>统一规范、测试结论前置、版本判断可追溯。</h2>
            <p>当前实现开始切到 YKUI 组件体系，后续继续扩页时会优先沿这套规范往下收，不再重复造一套视觉语言。</p>
          </div>
          <div className="header-band-side">
            <div className="header-band-chip">组件体系：YKUI + antd</div>
            <div className="header-band-chip">当前结论：继续收口</div>
            <div className="header-band-chip">首批对象：MCP / Chat / 检索 / Workflow</div>
          </div>
        </section>

        <YkTabs activeKey={activeKey} onChange={setActiveKey} items={tabItems} />
      </YkContainer>
    </div>
  );
}

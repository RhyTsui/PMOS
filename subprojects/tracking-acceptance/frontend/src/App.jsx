import { useMemo, useState } from "react";

import {
  acceptanceIssues,
  acceptanceStats,
  baselineCards,
  baselineRows,
  collaborationCards,
  heroMetrics,
  navigation,
  priorities,
  problemGroups,
  reportRows,
  ruleRows,
  ruleSummary,
  runTimeline,
  workflowSteps,
} from "./data/mockData";

function SectionTitle({ eyebrow, title, description, action }) {
  return (
    <div className="section-title">
      <div>
        {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {action ? <button className="ghost-button">{action}</button> : null}
    </div>
  );
}

function MetricStrip() {
  return (
    <div className="metric-strip">
      {heroMetrics.map((item) => (
        <article key={item.label} className={`metric-card tone-${item.tone}`}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </article>
      ))}
    </div>
  );
}

function Table({ columns, rows }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={`${rowIndex}-${row[columns[0].key]}`}>
              {columns.map((column) => (
                <td key={column.key}>{row[column.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OverviewPage() {
  return (
    <div className="content-grid">
      <section className="panel panel-span-2 hero-panel">
        <div className="hero-copy">
          <span className="eyebrow">Phase 1 Blueprint</span>
          <h1>先把买点验收最卡效率的一条链路跑通。</h1>
          <p>
            一期不做大而全平台，先把责任、流程、文档、规则、校验和协作效率收住，
            用 AI 去承担输入提炼、文档标准化、规则生成和结果总结。
          </p>
        </div>
        <div className="hero-side">
          <div className="focus-card">
            <span>一句话定义</span>
            <strong>AI 主提效 + 人工做确认 + 系统承接闭环</strong>
          </div>
          <div className="focus-card">
            <span>最小闭环</span>
              <strong>输入 → 文档 → 规则 → 校验 → 确认 → 沉淀</strong>
          </div>
        </div>
      </section>
      <section className="panel panel-span-2">
        <SectionTitle
          eyebrow="Current Problems"
          title="收敛后的问题主轴"
          description="这不是单点工具问题，而是业务协作、文档规则和验收路径共同失效。"
        />
        <div className="problem-grid">
          {problemGroups.map((group) => (
            <article key={group.title} className="problem-card">
              <h3>{group.title}</h3>
              <ul className="plain-list">
                {group.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
      <section className="panel accent-panel">
        <SectionTitle eyebrow="Phase 1 Guardrails" title="当前优先级" />
        <ul className="plain-list">
          {priorities.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
      <section className="panel panel-span-3">
        <SectionTitle
          eyebrow="Workflow"
          title="一期 AI 主链路"
          description="原始输入先进入 inbox，AI 负责提炼和标准化，人工保留最终确认。"
        />
        <div className="workflow-grid">
          {workflowSteps.map((step, index) => (
            <article key={step.title} className="workflow-step">
              <span className="step-index">{String(index + 1).padStart(2, "0")}</span>
              <h3>{step.title}</h3>
              <p>{step.desc}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function BaselinePage() {
  return (
    <div className="content-grid">
      <section className="panel panel-span-3">
        <SectionTitle
          eyebrow="Tracking Spec"
          title="文档基线"
          description="把散乱输入转成稳定基线，统一标准事件、自定义事件、字段和版本差异。"
          action="生成 AI 草稿"
        />
        <div className="card-grid">
          {baselineCards.map((card) => (
            <article key={card.title} className="info-card">
              <div className="info-head">
                <div>
                  <h3>{card.title}</h3>
                  <p>{card.subtitle}</p>
                </div>
                <span className="status-pill neutral">{card.status}</span>
              </div>
              <ul className="plain-list">
                {card.bullets.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
      <section className="panel panel-span-3">
        <SectionTitle
          eyebrow="Spec Rows"
          title="当前事件与字段视图"
          description="先把最常用验收对象变成结构化表，再决定后续完整录入和编辑方式。"
        />
        <Table
          columns={[
            { key: "event", label: "事件" },
            { key: "kind", label: "类型" },
            { key: "fields", label: "字段" },
            { key: "required", label: "必填" },
            { key: "note", label: "备注" },
          ]}
          rows={baselineRows}
        />
      </section>
    </div>
  );
}

function RulesPage() {
  return (
    <div className="content-grid">
      <section className="panel">
        <SectionTitle eyebrow="Rule Summary" title="规则概览" />
        <div className="summary-stack">
          {ruleSummary.map((item) => (
            <article key={item.label} className="summary-card">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </article>
          ))}
        </div>
      </section>
      <section className="panel panel-span-2">
        <SectionTitle
          eyebrow="Rule Center"
          title="规则中心"
          description="AI 先生成规则草稿，再由数据BP和相关角色确认冲突、例外和正式生效范围。"
          action="批量确认"
        />
        <Table
          columns={[
            { key: "rule", label: "规则" },
            { key: "source", label: "来源事件" },
            { key: "type", label: "类型" },
            { key: "status", label: "状态" },
            { key: "owner", label: "责任方" },
            { key: "note", label: "说明" },
          ]}
          rows={ruleRows}
        />
      </section>
    </div>
  );
}

function AcceptancePage() {
  return (
    <div className="content-grid">
      <section className="panel panel-span-2">
        <SectionTitle
          eyebrow="Run Center"
          title="验收执行"
          description="一期先围绕 ID / DID + 时间窗口的高效主路径，不先做复杂根因引擎。"
          action="发起验收"
        />
        <div className="metric-strip compact">
          {acceptanceStats.map((item) => (
            <article key={item.label} className="metric-card tone-neutral">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </article>
          ))}
        </div>
        <Table
          columns={[
            { key: "event", label: "事件" },
            { key: "issue", label: "异常" },
            { key: "layer", label: "层级" },
            { key: "severity", label: "严重度" },
            { key: "owner", label: "责任方" },
            { key: "action", label: "建议动作" },
          ]}
          rows={acceptanceIssues}
        />
      </section>
      <section className="panel">
        <SectionTitle eyebrow="Timeline" title="本次流程" />
        <ol className="timeline-list">
          {runTimeline.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function CollaborationPage() {
  return (
    <div className="content-grid">
      <section className="panel panel-span-2">
        <SectionTitle
          eyebrow="Collaboration"
          title="协作与沉淀"
          description="同一份结果按角色翻译，减少数据BP重复解释，也把常见问题接回验收现场。"
        />
        <div className="card-grid">
          {collaborationCards.map((card) => (
            <article key={card.title} className="info-card">
              <h3>{card.title}</h3>
              <p>{card.content}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="panel">
        <SectionTitle eyebrow="Outputs" title="角色化输出" />
        <Table
          columns={[
            { key: "audience", label: "对象" },
            { key: "output", label: "输出内容" },
            { key: "value", label: "当前状态" },
          ]}
          rows={reportRows}
        />
      </section>
    </div>
  );
}

export default function App() {
  const [activePage, setActivePage] = useState("overview");

  const activeView = useMemo(() => {
    switch (activePage) {
      case "baseline":
        return <BaselinePage />;
      case "rules":
        return <RulesPage />;
      case "acceptance":
        return <AcceptancePage />;
      case "collaboration":
        return <CollaborationPage />;
      default:
        return <OverviewPage />;
    }
  }, [activePage]);

  const activeMeta = navigation.find((item) => item.id === activePage);

  return (
    <div className="app-shell">
      <aside className="rail">
        <div className="brand-block">
          <span className="brand-pill">Phase 1</span>
          <h1>AI 埋点验收</h1>
          <p>围绕买点 / 埋点验收场景的一期 AI 工作流项目。</p>
        </div>
        <nav className="nav-list">
          {navigation.map((item) => (
            <button
              key={item.id}
              className={item.id === activePage ? "nav-item active" : "nav-item"}
              onClick={() => setActivePage(item.id)}
            >
              <strong>{item.label}</strong>
              <span>{item.hint}</span>
            </button>
          ))}
        </nav>
        <div className="rail-card">
          <span className="eyebrow">Current Scope</span>
          <p>先解决责任、流程、文档、规则、查询和协作效率，不先吞复杂研发正确性问题。</p>
        </div>
      </aside>
      <main className="main-shell">
        <header className="topbar">
          <div>
            <span className="eyebrow">Workspace</span>
            <h2>{activeMeta?.label}</h2>
            <p>{activeMeta?.hint}</p>
          </div>
          <div className="topbar-actions">
            <button className="ghost-button">查看文档基线</button>
            <button className="primary-button">进入最小闭环</button>
          </div>
        </header>
        <section className="headline-panel">
          <div>
            <span className="eyebrow">North Star</span>
            <h3>先把“输入 → 文档 → 规则 → 校验 → 确认 → 沉淀”做成稳定主链路。</h3>
            <p>这个原型先展示一期工作台的信息架构，不直接承诺复杂自动化和深层根因分析。</p>
          </div>
          <MetricStrip />
        </section>
        {activeView}
      </main>
    </div>
  );
}

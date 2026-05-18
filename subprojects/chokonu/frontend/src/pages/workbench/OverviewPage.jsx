import { Button, Card, Tag } from "antd";

import { pendingItems, productMeta, recentRuns, riskItems, topSignals } from "../../data/mockData";
import { SectionHeader, statusColor } from "./shared";

export default function OverviewPage({ currentProject, onQuickOpen }) {
  return (
    <div className="page-stack">
      <section className="overview-entry brand-card">
        <div className="overview-entry-main">
          <span className="eyebrow">{productMeta.englishName} / 轻入口总览</span>
          <h1>先恢复上下文，再进入主链动作，不先把首页做成统计大盘。</h1>
          <p>
            当前工作台以项目为工作单元承接需求、用例、执行、Trace、报告、复核和门禁。
            首版总览只负责把最近工作、待办和风险暴露出来。
          </p>
          <div className="hero-chips">
            <span>当前项目：{currentProject.name}</span>
            <span>环境：{currentProject.env}</span>
            <span>能力覆盖：{currentProject.coverage}</span>
          </div>
          <div className="hero-actions">
            <Button type="primary" size="large" onClick={() => onQuickOpen("projects")}>
              查看项目接入
            </Button>
            <Button size="large" onClick={() => onQuickOpen("requirements")}>
              处理待办需求
            </Button>
            <Button size="large" onClick={() => onQuickOpen("execution")}>
              进入执行台
            </Button>
          </div>
        </div>
        <div className="overview-entry-side">
          <div className="entry-signal">
            <span>待复核</span>
            <strong>{topSignals.todoReview}</strong>
          </div>
          <div className="entry-signal danger">
            <span>阻断版本</span>
            <strong>{topSignals.blockedVersions}</strong>
          </div>
        </div>
      </section>

      <div className="two-column-grid">
        <Card className="brand-card" bordered={false}>
          <SectionHeader title="当前待办" desc="总览首版先把必须处理的动作暴露出来，不扩成全局信息墙。" />
          <ul className="plain-list">
            {pendingItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Card>

        <Card className="brand-card" bordered={false}>
          <SectionHeader title="主链快进入口" desc="首版总览以进入工作台动作为主，而不是展示完整业务面。" />
          <div className="quick-link-list">
            {[
              { label: "项目接入", page: "projects", desc: "确认仓库、环境、能力映射" },
              { label: "需求推进", page: "requirements", desc: "查看待生成用例和高优需求" },
              { label: "执行跟进", page: "execution", desc: "处理运行中和失败任务" },
              { label: "风险结论", page: "reports", desc: "查看报告、复核和门禁" },
            ].map((item) => (
              <button key={item.page} type="button" className="quick-link-card" onClick={() => onQuickOpen(item.page)}>
                <strong>{item.label}</strong>
                <span>{item.desc}</span>
              </button>
            ))}
          </div>
        </Card>
      </div>

      <div className="two-column-grid">
        <Card className="brand-card" bordered={false}>
          <SectionHeader title="重点风险" desc="只暴露最需要立即行动的风险项，不把总览做成完整报告页。" />
          <div className="risk-list">
            {riskItems.map((item) => (
              <div key={item.id} className="risk-item">
                <div className="risk-head">
                  <h3>{item.title}</h3>
                  <Tag color={statusColor(item.level)}>{item.level}</Tag>
                </div>
                <p>
                  {item.project} / {item.source}
                </p>
                <Button size="small">{item.action}</Button>
              </div>
            ))}
          </div>
        </Card>

        <Card className="brand-card" bordered={false}>
          <SectionHeader title="最近执行" desc="只保留最近执行，帮助用户恢复工作上下文。" />
          <div className="run-feed">
            {recentRuns.map((item) => (
              <div key={item.id} className="run-item">
                <div className="run-head">
                  <strong>{item.name}</strong>
                  <Tag color={statusColor(item.status)}>{item.status}</Tag>
                </div>
                <p>
                  {item.project} / {item.executor} / {item.trigger}
                </p>
                <span>{item.startedAt}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
